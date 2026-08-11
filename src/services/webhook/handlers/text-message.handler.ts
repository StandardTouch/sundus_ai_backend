/**
 * Text Message Handler
 * Handles TEXT type messages with OpenAI processing
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { openaiService } from "../../openai.service.js";
import { openaiCreditService } from "../../openai-credit.service.js";
import { conversationService } from "../../conversation.service.js";
import { conversationMessageRepository } from "../../../repositories/conversation-message.repository.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import type { ConversationMessage } from "../../../models/conversation-message.model.js";
import { logger } from "../../../utils/logger.js";
import { detectLanguage } from "../../../utils/language.util.js";
import { processGuardrails, quickGuardrailCheck } from "../../../guardrails/index.js";
import { getEnabledTools } from "../../../agent/tools/index.js";
import { executeTool, type ToolExecutionResult } from "../../../agent/executor/index.js";
import type { ChatMessage, ChatCompletionResult } from "../../openai.service.js";
import type { Product } from "../../../api/alhomaidhi/product.api.js";
import type { Order } from "../../../api/alhomaidhi/order.api.js";
import { orderService } from "../../order.service.js";
import { supportSettingsService } from "../../support-settings.service.js";
import type OpenAI from "openai";

/**
 * System prompt for the AI assistant
 */
/**
 * Build dynamic system prompt based on enabled tools.
 */
function buildSystemPrompt(enabledTools: OpenAI.Chat.Completions.ChatCompletionTool[], supportPhoneNumber: string = "+966 9200 09339"): string {
  const enabledToolNames = enabledTools.map(t => 
    t.type === "function" ? t.function.name : ""
  ).filter(Boolean);
  
  // Check which tool categories are available
  const hasProductTools = enabledToolNames.some(name => 
    name === 'search_products' || name === 'get_product_details' || name === 'list_brands'
  );
  const hasOrderTools = enabledToolNames.some(name => 
    name === 'track_order' || name === 'get_order_details'
  );
  const hasFAQTools = enabledToolNames.some(name => 
    name === 'search_faqs'
  );
  const hasLocationTool = enabledToolNames.some(name =>
    name === "search_locations"
  );

  // Build capabilities section dynamically
  const capabilities: string[] = [];
  
  if (hasProductTools) {
    capabilities.push(`- Assist with product searches, specifications, and availability inquiries.
    - IMPORTANT PRODUCT INFORMATION:
      * AlHomaidhi Group ONLY sells watches. We do not sell electronics, fashion items, home appliances, or any other products.
      * CRITICAL: When users ask about products, brands, or want to see watches, you MUST ALWAYS use the search_products tool FIRST. NEVER assume you know what products or brands are available. NEVER say a brand is not available without searching first. Always call search_products tool when users mention any brand name or ask to see products.
      * IMPORTANT: When users say "show me only 1", "only one", "just 1", "show me one", they want to see ONE product from the search results (the cheapest/most affordable). Use search_products with their query - do NOT use get_product_details with product_id: 1. The number "1" refers to quantity, not a product ID.
      * NEVER make up or assume product categories - we only sell watches.
      * When showing multiple products, provide personalized recommendations based on the user's query, preferences, and product features (price, brand, availability, etc.).`);
  }
  
  if (hasOrderTools) {
    capabilities.push(`- Help customers track their orders and provide order status updates.
    - IMPORTANT ORDER TRACKING RULES:
      * When a user asks about their orders, you MUST use the track_order or get_order_details tool immediately.
      * NEVER ask the user for their phone number or order number - these are automatically provided based on the phone number from which they sent the message.
      * DEFAULT BEHAVIOR: If the user says "track my order", "where is my order", "show my order", or similar without mentioning a specific order number, use track_order to get the LATEST/MOST RECENT order automatically.
      * SPECIFIC ORDER: If the user mentions a specific order number (e.g., "track order #6956", "where is order 7360", "status of #6956"), use get_order_details with that order ID.
      * The phone number is automatically provided from the message sender - you can search for any order associated with that phone number.
      * Do not ask for additional information - use the tools immediately with the automatically provided phone number.`);
  }
  
  if (hasFAQTools) {
    capabilities.push(`- Answer general questions about AlHomaidhi Group's services and policies.
    - MANDATORY: You MUST use the search_faqs tool when users ask about:
      * Policies (warranties, returns, refunds, shipping, payment, etc.)
      * Procedures (how to do something, how something works)
      * General information about services
      * Any question that might be covered in company documentation
    - ALWAYS search FAQs first before providing an answer to policy or general information questions.
    - CRITICAL: When the search_faqs tool returns an FAQ answer, use it DIRECTLY in your response. Do NOT expand, rephrase, or add extra information unless the FAQ answer is clearly incomplete or needs clarification. For short answers (like phone numbers or brief instructions), use them exactly as provided.
    - Only provide a direct answer if the FAQ search returns no results or low confidence.
    - IMPORTANT: Never mention "FAQ database", "database", or any technical details about how you find information. Simply provide the answer naturally, or say you don't have that information if it's not available.`);
  }

  if (hasLocationTool) {
    capabilities.push(`- Help users find AlHomaidhi locations/branches by searching in our database.
    - MANDATORY: When a user asks about: location, address, branch, nearest branch, directions, or store location:
      1. If the user asks for the NEAREST/CLOSEST branch and has NOT provided a city/area, ask them to SHARE THEIR LOCATION PIN on WhatsApp (do NOT ask for time).
      2. If the user asks for location/branch/address and has provided a city/area (e.g., "Riyadh", "Abu Dhiba"), use the search_locations tool with that query.
    - NEVER make up addresses. Always use the information returned by the search_locations tool.`);
  }
  
  // Always available capabilities
  capabilities.push(`- Provide accurate and up-to-date information based on available data.
    - Answer general questions about AlHomaidhi Group's services and policies.`);

  // Build limitations based on disabled tools
  const limitations: string[] = [];
  
  if (!hasOrderTools) {
    limitations.push(`- Order tracking is currently unavailable. If users ask about their orders, politely explain that order tracking is temporarily unavailable and suggest they contact support at ${supportPhoneNumber} for assistance.`);
  }
  
  if (!hasProductTools) {
    limitations.push(`- Product search is currently unavailable. If users ask about products, politely explain that product search is temporarily unavailable and suggest they contact support for assistance.`);
  }

  // Build role description based on available tools
  const roleParts: string[] = [];
  if (hasProductTools) roleParts.push('product inquiries');
  if (hasOrderTools) roleParts.push('order tracking');
  if (hasFAQTools) roleParts.push('general customer assistance');
  const roleDescription = roleParts.length > 0 
    ? `specializing in ${roleParts.join(', ')}`
    : 'providing customer support';

  return `You are Sundus AI, a professional and courteous AI assistant providing customer support for AlHomaidhi Group.

COMPANY INFORMATION:
- AlHomaidhi Group is a watch retailer. We ONLY sell watches - we do not sell electronics, fashion items, home appliances, or any other product categories.
- CRITICAL: When users ask about products, brands, or want to see watches, you MUST ALWAYS use the search_products tool FIRST. NEVER assume you know what products are available. NEVER say a brand is not available without searching first. Always call search_products tool when users mention any brand name or ask to see products.
- Never mention or suggest that we sell products other than watches.

ROLE AND IDENTITY:
- Your name is Sundus AI. Always introduce yourself by name when greeting users for the first time or when appropriate.
- You are a knowledgeable customer support representative ${roleDescription}.

LANGUAGE SUPPORT:
- You support BOTH English and Arabic languages.
- CRITICAL: ALWAYS respond in the SAME language as the user's CURRENT message, regardless of previous conversation history.
- If the user's CURRENT message is in Arabic, you MUST respond in Arabic. If the user's CURRENT message is in English, you MUST respond in English.
- Do NOT continue in a previous language if the user switches languages - always match their CURRENT message language.
- If a user asks to switch to Arabic mode or requests Arabic, immediately switch to responding in Arabic for all subsequent messages.
- If a user asks to switch to English mode or requests English, immediately switch to responding in English for all subsequent messages.
- You are fully capable of communicating fluently in both languages - never refuse to use Arabic or claim you can only use English.

COMMUNICATION GUIDELINES:
- Maintain a professional, friendly, and respectful tone in all interactions.
- Communicate clearly and concisely, using grammatically correct language.
- Structure responses logically: provide a brief acknowledgment, deliver the main information, and offer additional assistance when relevant.
- Be empathetic and patient when addressing customer concerns.

    CAPABILITIES:
${capabilities.join('\n\n')}

LIMITATIONS AND BOUNDARIES:
${limitations.length > 0 ? limitations.join('\n') + '\n' : ''}- If you are uncertain about an answer or lack specific information, acknowledge this honestly and suggest alternative ways to help.
- Do not speculate or provide information that may be inaccurate.
- If a request is outside your capabilities, politely explain the limitation and offer to connect the customer with appropriate resources.
- If a requested feature is unavailable, suggest contacting support at ${supportPhoneNumber} for assistance.
- IMPORTANT: Never mention technical details like "FAQ database", "database", "system", "tool", or how you retrieve information. Speak naturally as if you have the information directly. If you don't have information, simply say "I don't have specific details about..." without mentioning where you searched.

RESPONSE FORMAT:
- Keep responses concise and focused on the customer's inquiry.
- Use clear, professional language appropriate for customer service.
- When appropriate, structure information in a readable format (e.g., bullet points for lists).
- IMPORTANT: Format for WhatsApp compatibility:
  * Use *asterisks* for bold text (e.g., *Product Name*)
  * Use _underscores_ for italic text if needed
  * NEVER use markdown links like [text](url) - WhatsApp doesn't support them
  * Always include full URLs as plain text (e.g., https://example.com/product)
  * Use emojis sparingly and appropriately (🛒 for purchase links)
  * Keep messages under 4096 characters (WhatsApp limit)
  * Use line breaks (\\n) for readability
${hasProductTools ? `- When showing multiple products from a search:
  * Keep the text response VERY brief - just acknowledge the search results
  * Do NOT list any product details (name, SKU, price, links) in the text message
  * Do NOT create numbered lists or bullet points of products
  * Images with full product details will be sent separately after your text response
  * Example responses: "I found 3 Aston Martin watches for you!" or "Here are some Aston Martin watches I found for you."
  * Keep it to 1-2 sentences maximum
` : ''}
Remember: You represent AlHomaidhi Group, and your goal is to provide exceptional customer service while maintaining professionalism and accuracy.`;
}

/**
 * Text Message Handler
 */
export class TextMessageHandler extends BaseMessageHandler {
  /**
   * Process message with tools support
   * Handles tool calling flow: AI decides to call tools → execute tools → get final response
   * Returns both the AI response and product data for image sending
   */
  private async processWithTools(
    userMessage: string,
    conversationHistory: ChatMessage[],
    tracker: TimingTracker,
    phoneNumber: string,
    storedUserMessage?: ConversationMessage | null,
    userLanguage?: 'ar' | 'en' // User's current message language
  ): Promise<{ 
    message: string | null; 
    productData?: { products: Product[]; isSingleProduct: boolean };
    orderData?: { order: any; isSingleOrder: boolean };
    shouldSendFeedback?: boolean; // Flag indicating if feedback should be sent
    shouldSendLocationTemplate?: boolean; // Flag indicating location template should be sent
  }> {
    // Get enabled tools from database (respects admin settings)
    tracker.addEvent("Getting enabled tools from database");
    const enabledTools = await getEnabledTools();
    tracker.addEvent(`Using ${enabledTools.length} enabled tools`);

    // Get support phone number dynamically from settings database
    const supportPhoneNumber = await supportSettingsService.getSupportPhoneNumber();

    // Build dynamic system prompt based on enabled tools and support phone number
    let systemPrompt = buildSystemPrompt(enabledTools, supportPhoneNumber);
    
    // Add explicit language instruction if user language is detected
    if (userLanguage) {
      const languageInstruction = userLanguage === 'ar'
        ? "\n\nCRITICAL LANGUAGE INSTRUCTION: The user's CURRENT message is in Arabic. You MUST respond in Arabic. Ignore any previous English conversation history - respond in Arabic to match the user's current message language."
        : "\n\nCRITICAL LANGUAGE INSTRUCTION: The user's CURRENT message is in English. You MUST respond in English. Ignore any previous Arabic conversation history - respond in English to match the user's current message language.";
      systemPrompt += languageInstruction;
    }
    
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    // First call: AI decides if it needs to call tools
    tracker.addEvent("Initial OpenAI call with tools");
    
    // Add timeout wrapper to prevent hanging
    // Increased timeout to 25s for production (OpenAI can be slow with tool calls)
    // Optional: Check if OpenAI credits are available before making API call
    // This is a lightweight check that doesn't block if the service is unavailable
    const creditsAvailable = await openaiCreditService.areCreditsAvailable().catch(() => true);
    
    if (!creditsAvailable) {
      logger.warn("⚠️ OpenAI credits unavailable - skipping API call", { phoneNumber });
      // Detect user language and send fun energy message
      const userLanguage = detectLanguage(userMessage);
      const energyMessage = userLanguage === 'ar' 
        ? "عذرًا! طاقتي منخفضة! ⚡ أحتاج إلى دفعة سريعة للعودة لمساعدتك. سأكون جاهزًا لمساعدتك قريبًا!"
        : "Oops! I'm running low on energy! ⚡ I need a quick boost to get back to helping you. I'll be ready to assist you soon!";
      
      await this.sendMessage(phoneNumber, energyMessage, tracker);
      return {
        ...tracker.getResult(),
        message: null // No AI message since credits are unavailable
      };
    }

    // Detect if the user is asking about location and force the tool call
    // This prevents the AI from using its training knowledge about locations
    const hasLocationTool = enabledTools.some(t => {
      const tool = t as any;
      return tool.type === "function" && tool.function.name === "search_locations";
    });
    
    const locationRegex = /\b(location|address|branch|directions|nearest branch|near me|how to get|find branch)\b|(?:\s|^)(موقع|عنوان|فرع|اتجاهات|أين|أقرب|فروع)(?:\s|$)/i;
    const nearestRegex = /\b(nearest|closest|near me)\b|(?:\s|^)(أقرب|قريب)(?:\s|$)/i;
    const faqRegex = /\b(app|mobile|ios|android|play store|apple store|application|download|return|refund|exchange|warranty|guarantee|shipping|delivery|payment)\b|(?:\s|^)(تطبيق|برنامج|تنزيل|أندرويد|أيفون|أبل ستور|غوغل بلاي|استبدال|استرجاع|ضمان|توصيل|شحن|دفع|كاش|فيزا)(?:\s|$)/i;
    const orderRegex = /\b(track|order|status|where is|tracking)\b|(?:\s|^)(شحن|طلب|تتبع|حالة|فين طلبي|شحنتي)(?:\s|$)/i;
    const orderIdRegex = /#?\d{4,10}/;

    const hasFAQTool = enabledTools.some(t => (t as any).type === "function" && (t as any).function.name === "search_faqs");
    const hasOrderTool = enabledTools.some(t => {
      const name = (t as any).function?.name;
      return (t as any).type === "function" && (name === "track_order" || name === "get_order_details");
    });
    
    const isLocationQuery = hasLocationTool && locationRegex.test(userMessage);
    const isFAQQuery = hasFAQTool && faqRegex.test(userMessage);
    const isOrderQuery = hasOrderTool && (orderRegex.test(userMessage) || orderIdRegex.test(userMessage));
    const isOrderIdQuery = hasOrderTool && orderIdRegex.test(userMessage);

    const shouldAskForPin = isLocationQuery && nearestRegex.test(userMessage) && 
      !userMessage.toLowerCase().includes(" in ") && !userMessage.includes(" في ");

    let toolChoice: any = enabledTools.length > 0 ? "auto" : "none";
    if (isLocationQuery && !shouldAskForPin) {
      toolChoice = { type: "function", function: { name: "search_locations" } };
      logger.info("Location query detected – forcing search_locations tool call", { phoneNumber });
    } else if (isOrderIdQuery) {
      toolChoice = { type: "function", function: { name: "get_order_details" } };
      logger.info("Specific Order ID detected – forcing get_order_details tool call", { phoneNumber });
    } else if (isOrderQuery) {
      toolChoice = { type: "function", function: { name: "track_order" } };
      logger.info("Order tracking query detected – forcing track_order tool call", { phoneNumber });
    } else if (isFAQQuery) {
      toolChoice = { type: "function", function: { name: "search_faqs" } };
      logger.info("FAQ query detected – forcing search_faqs tool call", { phoneNumber });
    } else if (shouldAskForPin) {
      logger.info("Nearest branch requested – allowing AI to ask for location pin", { phoneNumber });
    }

    const firstResultPromise = openaiService.chatCompletion(messages, {
      temperature: 0.0, // Force strict adherence to tool rules (no guessing/hallucination)
      max_tokens: 500, // Reduced for faster responses
      tools: enabledTools,
      tool_choice: toolChoice
    });
    
    let firstCallTimeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<ChatCompletionResult>((resolve) => {
      firstCallTimeoutId = setTimeout(() => {
        logger.warn("OpenAI first call timeout - request may still be processing", {
          timeoutMs: 25000,
          phoneNumber
        });
        resolve({ success: false, error: "Request timeout. Please try again." });
      }, 25000) // 25s timeout (increased from 10s for production)
    });
    
    const firstResult: ChatCompletionResult = await Promise.race([firstResultPromise, timeoutPromise])
      .finally(() => {
        if (firstCallTimeoutId) clearTimeout(firstCallTimeoutId);
      })
      .catch(error => {
      logger.error("OpenAI first call error", { 
        error: error.message,
        phoneNumber,
        stack: error.stack
      });
      return { success: false, error: "Request timeout. Please try again." };
    });

    if (!firstResult.success) {
      logger.error("OpenAI call failed", { error: firstResult.error });
      return { message: null };
    }

    // Log OpenAI response to debug tool calling
    logger.info("OpenAI first call response", {
      hasMessage: !!firstResult.message,
      messageLength: firstResult.message?.length || 0,
      hasToolCalls: !!firstResult.tool_calls,
      toolCallsCount: firstResult.tool_calls?.length || 0,
      toolCalls: firstResult.tool_calls?.map(tc => ({
        id: tc.id,
        type: tc.type,
        name: tc.type === "function" ? tc.function?.name : "unknown"
      }))
    });

    // If AI wants to call tools
    if (firstResult.tool_calls && firstResult.tool_calls.length > 0) {
      tracker.addEvent(`Executing ${firstResult.tool_calls.length} tool call(s)`);
      
      // Clean phone number (remove + prefix)
      const cleanPhoneNumber = phoneNumber.replace(/^\+/, "");
      
      // Execute all tool calls in parallel
      // Auto-inject phone_number for order tools if not provided
      // Pass phoneNumber for validation to ensure users can only access their own orders
      const toolResults: ToolExecutionResult[] = await Promise.all(
        firstResult.tool_calls.map(toolCall => {
          // Auto-inject phone_number for order tools
          if (toolCall.type === "function" && (toolCall.function.name === "track_order" || toolCall.function.name === "get_order_details")) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              if (!args.phone_number) {
                args.phone_number = cleanPhoneNumber;
                toolCall.function.arguments = JSON.stringify(args);
                logger.info("Auto-injected phone number for order tool", {
                  toolName: toolCall.function.name,
                  phoneNumber: cleanPhoneNumber
                });
              }
            } catch (error) {
              logger.error("Failed to parse tool arguments for phone number injection", { error });
            }
          }
          // Get conversation ID from stored message and include user message for context
          const context = {
            ...(storedUserMessage?.conversation_id && { conversationId: storedUserMessage.conversation_id }),
            ...(storedUserMessage?.message_id && { messageId: storedUserMessage.message_id }),
            ...(userMessage && { userMessage }) // Pass user message for single product detection
          };
          
          return executeTool(toolCall, phoneNumber, context);
        })
      );
      
      // Store product data for image sending
      const productData: { products: Product[]; isSingleProduct: boolean } | null = (() => {
        const productToolResults = toolResults.filter(tr => 
          tr.name === "search_products" || tr.name === "get_product_details"
        );
        
        if (productToolResults.length === 0) return null;
        
        // Check if it's a single product (get_product_details) or multiple (search_products)
        const singleProductResult = productToolResults.find(tr => tr.name === "get_product_details");
        if (singleProductResult?.metadata?.isSingleProduct && singleProductResult.metadata.products) {
          return {
            products: singleProductResult.metadata.products,
            isSingleProduct: true
          };
        }
        
        // Multiple products from search
        const searchResult = productToolResults.find(tr => tr.name === "search_products");
        if (searchResult?.metadata?.products) {
          // Use isSingleProduct from tool result metadata if available, otherwise default to false
          const isSingleProduct = searchResult.metadata.isSingleProduct ?? false;
          return {
            products: searchResult.metadata.products,
            isSingleProduct: isSingleProduct
          };
        }
        
        return null;
      })();

      // Store order data for template sending
      const orderData: { order: Order; isSingleOrder: boolean } | null = (() => {
        const orderToolResults = toolResults.filter(tr => 
          tr.name === "track_order" || tr.name === "get_order_details"
        );
        
        if (orderToolResults.length === 0) return null;
        
        // Check if it's a single order (get_order_details) or multiple (track_order)
        const singleOrderResult = orderToolResults.find(tr => tr.name === "get_order_details");
        if (singleOrderResult?.metadata?.isSingleOrder && singleOrderResult.metadata.order) {
          return {
            order: singleOrderResult.metadata.order,
            isSingleOrder: true
          };
        }
        
        // Multiple orders from track_order - use first order for template
        const trackOrderResult = orderToolResults.find(tr => tr.name === "track_order");
        if (trackOrderResult?.metadata?.orders && trackOrderResult.metadata.orders.length > 0) {
          // For multiple orders, show the first one in template
          return {
            order: trackOrderResult.metadata.orders[0],
            isSingleOrder: false
          };
        }
        
        return null;
      })();

      // Check tool results for feedback flags
      // If any tool indicates feedback should be sent, set the flag
      const shouldSendFeedbackFromTools = toolResults.some(tr => {
        const metadata = tr.metadata as any; // Type assertion for optional metadata
        return metadata?.should_send_feedback === true;
      });

      // Legacy location template logic removed in favor of dynamic search


      // Add assistant message with tool calls to conversation
      // OpenAI requires tool_calls to be included in the assistant message
      // The tool_calls from OpenAI are already in the correct format
      const assistantMessageWithTools: ChatMessage = {
        role: "assistant",
        content: firstResult.message || null,
        tool_calls: firstResult.tool_calls?.map(tc => {
          // Handle standard function tool calls
          if (tc.type === 'function' && 'function' in tc) {
            return {
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.function.name,
                arguments: typeof tc.function.arguments === 'string' 
                  ? tc.function.arguments 
                  : JSON.stringify(tc.function.arguments)
              }
            };
          }
          // Handle custom tool calls (shouldn't happen with our setup, but handle it)
          return {
            id: tc.id,
            type: "function" as const,
            function: {
              name: 'unknown',
              arguments: '{}'
            }
          };
        })
      };

      // Add tool results to conversation
      const toolMessages: ChatMessage[] = toolResults.map(result => ({
        role: "tool",
        content: result.content,
        tool_call_id: result.tool_call_id,
        name: result.name
      }));

      // BYPASS: If location search returned zero results, skip the second AI call entirely.
      // This is the critical guard that prevents hallucination — the AI never sees the
      // "no results" data and therefore cannot invent a fake address.
      const locationToolResult = toolResults.find(tr => tr.name === "search_locations");
      
      const isLocationNoResults = (() => {
        if (!locationToolResult?.content) return false;
        // Backward-compatible tag
        if (locationToolResult.content.includes("[TOOL_STATUS: NO_RESULTS]")) return true;
        // New JSON format
        try {
          const parsed = JSON.parse(locationToolResult.content);
          return parsed?.tool_status === "NO_RESULTS";
        } catch {
          return false;
        }
      })();

      if (locationToolResult && isLocationNoResults) {
        logger.info("Bypassing final OpenAI call for zero-result location query", { phoneNumber });
        const content = locationToolResult.content || "";
        const userLanguage = detectLanguage(userMessage);

        let finalResponse = "";
        // Prefer JSON messages if available
        try {
          const parsed = JSON.parse(content);
          const msgEn = parsed?.messages?.en;
          const msgAr = parsed?.messages?.ar;
          if (userLanguage === "ar") finalResponse = String(msgAr || "عذراً، لا يوجد لدينا فرع حالياً في هذا الموقع.");
          else finalResponse = String(msgEn || "Currently, we don't have a branch in this location.");
        } catch {
          if (userLanguage === 'ar') {
            const arMatch = content.match(/AR:\s*([\s\S]*?)(?=\n\n\[INSTRUCTION:|$)/);
            finalResponse = arMatch ? arMatch[1]!.trim() : "عذراً، لا يوجد لدينا فرع حالياً في هذا الموقع.";
          } else {
            const enMatch = content.match(/EN:\s*([\s\S]*?)(?=\n\nAR:|$)/);
            finalResponse = enMatch ? enMatch[1]!.trim() : "Currently, we don't have a branch in this location.";
          }
        }

        // Final safety strip of any internal tags
        finalResponse = finalResponse.replace(/\[(INTERNAL|INSTRUCTION|ADMIN_ONLY|TOOL_STATUS):.*?\]/g, "").trim();

        return {
          ...tracker.getResult(),
          message: finalResponse
        };
      }

      // Second call: AI formats final response with tool results
      tracker.addEvent("Getting final response from OpenAI with tool results");
      const finalMessages: ChatMessage[] = [
        ...messages,
        assistantMessageWithTools,
        ...toolMessages
      ];

      // Check credits again before final response (in case status changed)
      const creditsStillAvailable = await openaiCreditService.areCreditsAvailable().catch(() => true);
      
      if (!creditsStillAvailable) {
        logger.warn("⚠️ OpenAI credits unavailable during final response - skipping API call", { phoneNumber });
        // Detect user language and send fun energy message
        const userLanguage = detectLanguage(userMessage);
        const energyMessage = userLanguage === 'ar' 
          ? "عذرًا! طاقتي منخفضة! ⚡ أحتاج إلى دفعة سريعة للعودة لمساعدتك. سأكون جاهزًا لمساعدتك قريبًا!"
          : "Oops! I'm running low on energy! ⚡ I need a quick boost to get back to helping you. I'll be ready to assist you soon!";
        
        await this.sendMessage(phoneNumber, energyMessage, tracker);
        return {
          ...tracker.getResult(),
          message: null // No AI message since credits are unavailable
        };
      }

      // Add timeout wrapper for final OpenAI call
      // Increased timeout to 30s for production (final response generation can be slower)
      // Use gpt-4-turbo for the final formatting call — needs higher quality to craft
      // a well-structured, friendly response from the raw tool data.
      const finalResultPromise = openaiService.chatCompletion(finalMessages, {
        temperature: 0.7,
        max_tokens: 1000 // Increased from 500 to prevent response truncation
      });
      
      let finalCallTimeoutId: NodeJS.Timeout | null = null;
      const finalTimeoutPromise = new Promise<ChatCompletionResult>((resolve) => {
        finalCallTimeoutId = setTimeout(() => {
          logger.warn("OpenAI final call timeout - request may still be processing", {
            timeoutMs: 30000,
            phoneNumber,
            hasToolResults: toolResults.length > 0
          });
          resolve({ success: false, error: "Response generation timeout. Please try again." });
        }, 30000) // 30s timeout (increased from 15s for production)
      });
      
      const finalResult: ChatCompletionResult = await Promise.race([finalResultPromise, finalTimeoutPromise])
        .finally(() => {
          if (finalCallTimeoutId) clearTimeout(finalCallTimeoutId);
        })
        .catch(error => {
        logger.error("OpenAI final call error", { 
          error: error.message,
          phoneNumber,
          hasToolResults: toolResults.length > 0,
          stack: error.stack
        });
        return { success: false, error: "Response generation timeout. Please try again." };
      });

      if (!finalResult.success || !finalResult.message) {
        logger.error("OpenAI final response failed", { 
          error: finalResult.error,
          hasToolResults: toolResults.length > 0,
          hasProductData: !!productData,
          hasOrderData: !!orderData
        });
        
        // orderData is defined in the outer scope above
        
        // If we have tool results but OpenAI failed, try to use the tool result content directly
        if (toolResults.length > 0) {
          // Check for order tool errors first (they have specific error messages)
          const orderToolResult = toolResults.find(tr => 
            tr.name === "track_order" || tr.name === "get_order_details"
          );
          
          if (orderToolResult && orderToolResult.content) {
            // Use the order tool error message directly
            logger.info("Using order tool error message as fallback response");
            return {
              message: orderToolResult.content
            };
          }
          
          // Check for product tool results
          if (productData && productData.products && productData.products.length > 0) {
            const productToolResult = toolResults.find(tr => 
              tr.name === "search_products" || tr.name === "get_product_details"
            );
            
            if (productToolResult && productToolResult.content) {
              // Use the tool result content as a fallback response
              logger.info("Using product tool result as fallback response due to OpenAI failure");
              return {
                message: productToolResult.content,
                productData: productData
              };
            }
            
            // Even if tool result content is not ideal, we have product data - return brief message
            logger.info("Returning brief message with product data despite OpenAI failure");
            const fallbackMsg = userLanguage === 'ar'
              ? `عثرنا على ${productData.products.length} من المنتجات لك. إليك التفاصيل:`
              : `Found ${productData.products.length} product${productData.products.length > 1 ? "s" : ""} for you. Here are the details:`;
            const result: { 
              message: string; 
              productData: { products: Product[]; isSingleProduct: boolean };
              orderData?: { order: Order; isSingleOrder: boolean };
            } = {
              message: fallbackMsg,
              productData: productData
            };
            if (orderData) {
              result.orderData = orderData;
            }
            return result;
          }
          
          // If we have any tool result with content, use it
          const anyToolResult = toolResults.find(tr => tr.content);
          if (anyToolResult && anyToolResult.content) {
            // Check if the content is JSON (likely from location tool)
            let finalFallbackMessage = anyToolResult.content;
            
            try {
              if (anyToolResult.content.trim().startsWith('{')) {
                const parsed = JSON.parse(anyToolResult.content);
                
                // If it's a location SUCCESS result, format it nicely
                if (parsed.tool_status === "SUCCESS" && parsed.locations && parsed.locations.length > 0) {
                  const totalCount = parsed.total_found_in_database || parsed.count || parsed.locations.length;
                  const userLanguage = detectLanguage(userMessage);
                  
                  if (userLanguage === 'ar') {
                    finalFallbackMessage = `لدينا ${totalCount} فرعاً في المملكة العربية السعودية. إليك تفاصيل بعض الفروع:\n\n`;
                    parsed.locations.forEach((loc: any, idx: number) => {
                      if (idx < 5) { // Limit to 5 for fallback
                        finalFallbackMessage += `${idx + 1}. *${loc.title_ar || loc.title_en}*\n`;
                        finalFallbackMessage += `   العنوان: ${loc.address_ar || loc.address_en}\n`;
                        if (loc.store_contact_phone) finalFallbackMessage += `   التواصل: ${loc.store_contact_phone}\n`;
                        finalFallbackMessage += `   الموقع: ${loc.google_maps_url}\n\n`;
                      }
                    });
                    if (totalCount > 5) {
                      finalFallbackMessage += "يمكنك العثور على جميع فروعنا وتفاصيلها على موقعنا الإلكتروني.";
                    }
                  } else {
                    finalFallbackMessage = `We have a total of ${totalCount} store locations across Saudi Arabia. Here are the details for some of them:\n\n`;
                    parsed.locations.forEach((loc: any, idx: number) => {
                      if (idx < 5) { // Limit to 5 for fallback
                        finalFallbackMessage += `${idx + 1}. *${loc.title_en || loc.title_ar}*\n`;
                        finalFallbackMessage += `   Address: ${loc.address_en || loc.address_ar}\n`;
                        if (loc.store_contact_phone) finalFallbackMessage += `   Contact: ${loc.store_contact_phone}\n`;
                        finalFallbackMessage += `   Location: ${loc.google_maps_url}\n\n`;
                      }
                    });
                    if (totalCount > 5) {
                      finalFallbackMessage += "You can find the full list of our branches on our website.";
                    }
                  }
                  
                  logger.info("Formatted location JSON into readable fallback message");
                } else if (parsed.tool_status === "NO_RESULTS") {
                  // Handled by the bypass logic above, but here as a secondary fallback
                  const userLanguage = detectLanguage(userMessage);
                  finalFallbackMessage = userLanguage === 'ar' 
                    ? (parsed.messages?.ar || "عذراً، لا يوجد لدينا فرع حالياً في هذا الموقع.")
                    : (parsed.messages?.en || "Currently, we don't have a branch in this location.");
                }
              }
            } catch (e) {
              // Not JSON or failed to parse, use original content
              logger.debug("Fallback content is not JSON or failed to parse", { error: (e as Error).message });
            }

            logger.info("Using tool result content as fallback response", { 
              toolName: anyToolResult.name,
              isFormatted: finalFallbackMessage !== anyToolResult.content 
            });
            
            return {
              message: finalFallbackMessage
            };
          }
        }
        
        return { message: null };
      }
      
      // Check if the final response contains error information from order tools
      // If OpenAI didn't properly format the error, use the tool result directly
      const orderToolResult = toolResults.find(tr => 
        tr.name === "track_order" || tr.name === "get_order_details"
      );
      
      // ALWAYS use order tool error messages if they contain error keywords
      // This ensures users get error messages even if OpenAI doesn't format them properly
      if (orderToolResult && orderToolResult.content && 
          (orderToolResult.content.includes("unavailable") || 
           orderToolResult.content.includes("trouble retrieving") ||
           orderToolResult.content.includes("trouble") ||
           orderToolResult.content.includes("registered"))) {
        // If the tool returned an error message, ALWAYS use it for consistency
        logger.info("Order tool returned error message, using it directly", {
          toolMessage: orderToolResult.content,
          openaiMessage: finalResult.message || "null"
        });
        return {
          message: orderToolResult.content
        };
      }

      const result: { 
        message: string; 
        productData?: { products: Product[]; isSingleProduct: boolean };
        orderData?: { order: Order; isSingleOrder: boolean };
        shouldSendFeedback?: boolean;
        shouldSendLocationTemplate?: boolean;
      } = {
        message: finalResult.message,
        shouldSendFeedback: shouldSendFeedbackFromTools,
      };
      
      if (productData) {
        result.productData = productData;
      }
      
      if (orderData) {
        result.orderData = orderData;
      }
      
      return result;
    }

    // No tool calls - return direct response
    return { message: firstResult.message || null };
  }

  /**
   * Handle TEXT message
   */
  async handle(
    phoneNumber: string,
    message: any,
    tracker: TimingTracker
  ): Promise<ProcessingResult> {
    tracker.addEvent("TEXT message handler started");
    
    const text = message.message_content?.text;
    
    if (!text) {
      logger.warn("TEXT message received without text content", { phoneNumber, message });
      return tracker.getResult();
    }

    tracker.addEvent("Text content extracted");
    logger.info("Received TEXT message", { phoneNumber, text });

    // Apply guardrails (quick check first - no API calls)
    tracker.addEvent("Applying guardrails (quick check)");
    const quickCheck = quickGuardrailCheck(text);
    
    if (!quickCheck.passed) {
      logger.warn("Guardrails blocked message (quick check)", {
        phoneNumber,
        reason: quickCheck.error,
        injectionDetected: quickCheck.injectionDetected
      });
      
      // Send safe response
      const safeResponse = quickCheck.error || "I can't process that request. How else can I help you?";
      await this.sendMessage(phoneNumber, safeResponse, tracker);
      
      return tracker.getResult();
    }

    // Use sanitized input from quick check
    const sanitizedText = quickCheck.sanitizedInput || text;
    
    // Run full moderation check in background (non-blocking)
    // This allows response to proceed while moderation completes
    processGuardrails(text).then(guardrailResult => {
      if (!guardrailResult.passed && guardrailResult.contentFlagged) {
        logger.warn("Content moderation flagged message (post-check)", {
          phoneNumber,
          reason: guardrailResult.error
        });
        // Could send follow-up or log for review, but don't block response
      }
    }).catch(error => {
      logger.error("Background guardrail check error", { error, phoneNumber });
    });

    tracker.addEvent("Guardrails passed (quick check, full check in background)");

    // Extract message ID and reply context
    const messageId = message.id || message.messageId;
    const repliedToMessageId = message.context?.id || message.replied_to_message_id;

    // Parallelize: Store user message and get conversation history simultaneously
    tracker.addEvent("Storing user message and building conversation history (parallel)");
    const [storedUserMessage, conversationHistory] = await Promise.all([
      conversationService.storeUserMessage(
        phoneNumber,
        messageId,
        sanitizedText,
        repliedToMessageId
      ),
      conversationService.getConversationHistory(
        phoneNumber,
        sanitizedText,
        repliedToMessageId
      )
    ]);

    // Detect user's current message language - use this for response and templates
    const userMessageLanguage = detectLanguage(sanitizedText);
    logger.info("User message language detected", {
      phoneNumber,
      language: userMessageLanguage,
      messagePreview: sanitizedText.substring(0, 50)
    });

    // Process with OpenAI (use sanitized input) - with tools support
    tracker.addEvent("Processing with OpenAI");
    const aiResult = await this.processWithTools(
      sanitizedText,
      conversationHistory,
      tracker,
      phoneNumber,
      storedUserMessage,
      userMessageLanguage // Pass user language to ensure AI responds in same language
    );
    tracker.addEvent(`OpenAI processing completed`);

    // Handle case where OpenAI failed but we might have product or order data
    let aiResponse: string;
    const productData = aiResult.productData;
    const orderData = aiResult.orderData;
    const shouldSendLocationTemplate = aiResult.shouldSendLocationTemplate === true;
    
    if (!aiResult.message) {
      logger.error("OpenAI processing failed - no message returned", { 
        phoneNumber,
        hasProductData: !!productData,
        productCount: productData?.products?.length || 0
      });
      
      // If we have product data, we can still send products with a brief message
      if (productData && productData.products && productData.products.length > 0) {
        logger.info("Using product data despite OpenAI failure", { 
          phoneNumber,
          productCount: productData.products.length
        });
        // Create a brief message so we can proceed to image sending
        aiResponse = userMessageLanguage === 'ar'
          ? `وجدت لك ${productData.products.length} من المنتجات. إليك التفاصيل:`
          : `I found ${productData.products.length} product${productData.products.length > 1 ? "s" : ""} for you. Here are the details:`;
      } else {
        // No product data and no message - send fallback in user's language
        const fallbackResponse = userMessageLanguage === 'ar'
          ? "أعتذر، أواجه مشكلة في معالجة رسالتك الآن. يرجى المحاولة مرة أخرى بعد قليل."
          : "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.";
        await this.sendMessage(phoneNumber, fallbackResponse, tracker);
        return tracker.getResult();
      }
    } else {
      aiResponse = aiResult.message;
    }
    
    // Ensure we have a message to send
    if (!aiResponse || aiResponse.trim().length === 0) {
      logger.error("No AI response to send", { 
        phoneNumber,
        hasProductData: !!productData,
        hasOrderData: !!orderData,
        shouldSendLocationTemplate
      });
      const fallbackResponse = userMessageLanguage === 'ar'
        ? "أعتذر، أواجه مشكلة في معالجة رسالتك الآن. يرجى المحاولة مرة أخرى بعد قليل."
        : "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.";
      await this.sendMessage(phoneNumber, fallbackResponse, tracker);
      return tracker.getResult();
    }
    
    tracker.addEvent("AI response generated");

    // Calculate response time
    const totalResponseTime = tracker.getTotalTime();
    const openaiEvents = tracker.getEvents().filter(e => e.event.includes("OpenAI"));
    const openaiTime = openaiEvents.reduce((sum, e) => sum + e.elapsed, 0);
    const processingTime = totalResponseTime - openaiTime;

    // Check if feedback should be sent based on tool results or AI response
    // Import feedback detection utility
    const { shouldSendFeedbackFromAIResponse } = await import("../../../utils/feedback-detection.util.js");
    
    // Check tool results for feedback flags (from processWithTools)
    let shouldSendFeedback = aiResult.shouldSendFeedback === true;
    
    // If no tool flag, check AI response as fallback
    if (!shouldSendFeedback && aiResult.message) {
      shouldSendFeedback = shouldSendFeedbackFromAIResponse(aiResponse);
    }
    
    // Store assistant message with response time and accuracy data
    tracker.addEvent("Storing assistant message");
    // If location template is requested, do NOT store a synthetic assistant message ID.
    // We will store the actual template message returned by AI Sensy instead.
    // Legacy location template handling removed


    const assistantMessageId = `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: ConversationMessage['metadata'] = {
      response_time_ms: Math.round(totalResponseTime),
      openai_time_ms: Math.round(openaiTime),
      processing_time_ms: Math.round(processingTime),
      should_send_feedback: shouldSendFeedback // Flag for webhook handler
    };
    
    // Get conversation ID from stored user message
    const conversationId = storedUserMessage?.conversation_id;
    
    await conversationService.storeAssistantMessage(
      phoneNumber,
      assistantMessageId,
      aiResponse,
      metadata,
      conversationId
    );

    // Send response via WhatsApp
    // If products are available, send product templates accordingly
    if (productData?.products && productData.products.length > 0) {
      const products = productData.products;
      
      // Use user's message language for template (not AI response language)
      // This ensures templates match the language the user is using
      const language = userMessageLanguage || detectLanguage(aiResponse);
      const templateName = language === 'ar' ? 'product_card_arabic' : 'product_card';
      const languageCode = language === 'ar' ? 'ar' : 'en';
      
      logger.info("Using template language based on user message", {
        phoneNumber,
        userMessageLanguage,
        templateName,
        languageCode
      });
      
      // Log product data for debugging
      logger.info("Product data for template sending", {
        phoneNumber,
        productCount: products.length,
        isSingleProduct: productData.isSingleProduct,
        language,
        templateName
      });
      
      if (productData.isSingleProduct) {
        // Single product - send brief AI message first, then product template
        const product = products[0];
        const firstImage = product?.images?.[0];
        if (!product || !firstImage || !firstImage.src) {
          logger.error("Single product has no image URL - cannot send template", {
            phoneNumber,
            productId: product?.product_details?.product_id
          });
          // Fallback to text message
          await this.sendMessage(phoneNumber, aiResponse, tracker);
          return tracker.getResult();
        }
        
        tracker.addEvent("Sending single product template");
        
        // First send the brief AI response
        const textResult = await this.sendMessage(phoneNumber, aiResponse, tracker);
        
        if (!textResult.success) {
          logger.error("Failed to send single product text response", {
            phoneNumber,
            error: textResult.error
          });
          return tracker.getResult();
        }
        
        // Build product details for template
        const productName = product.product_details?.name || "Product";
        const productSku = product.product_details?.sku || "";
        const rawPrice = product.product_details?.price || "N/A";
        // Add "SAR" to price if not already present
        const productPrice = rawPrice === "N/A" ? "N/A" : rawPrice.includes("SAR") ? rawPrice : `${rawPrice} SAR`;
        const productSlug = product.product_details?.slug || "";
        
        logger.info("Sending single product template", {
          phoneNumber,
          productId: product.product_details?.product_id,
          templateName,
          languageCode
        });
        
        // Send product template
        const templateResult = await this.aisensyService.sendProductTemplate(
          phoneNumber,
          templateName,
          languageCode,
          firstImage.src, // Product image URL
          productName,
          productSku,
          productPrice,
          productSlug
        );
        
        if (templateResult.success) {
          logger.info("Single product template sent successfully", {
            phoneNumber,
            messageId: templateResult.message_id,
            productId: product.product_details?.product_id
          });
        } else {
          logger.error("Failed to send single product template", {
            phoneNumber,
            error: templateResult.error,
            productId: product.product_details?.product_id
          });
        }
      } else {
        // Multiple products - send brief AI message first, then product templates
        tracker.addEvent("Sending multiple products with templates");
        
        // First send the brief AI response
        const textResult = await this.sendMessage(phoneNumber, aiResponse, tracker);
        
        if (!textResult.success) {
          logger.error("Failed to send multiple products text", {
            phoneNumber,
            error: textResult.error
          });
          return tracker.getResult();
        }
        
        logger.info("Multiple products text sent, now sending templates", {
          phoneNumber,
          productCount: products.length,
          templateName,
          languageCode
        });
        
        // Send ONE template per product (limit to top 5 to avoid spamming)
        const productsToShow = products.slice(0, 5);
        
        // Filter products that have images (MANDATORY for templates)
        const productsWithImages = productsToShow.filter(
          product => product && product.images && product.images.length > 0 && product.images[0]?.src
        );
        
        if (productsWithImages.length === 0) {
          logger.warn("No products with images found - cannot send templates", {
            phoneNumber,
            totalProducts: productsToShow.length
          });
          return tracker.getResult();
        }
        
        // Send product templates for each product in separate messages
        const templatePromises = productsWithImages.map((product, index) => {
          const firstImage = product.images[0];
          if (!firstImage || !firstImage.src) {
            logger.warn("Product image URL missing", {
              phoneNumber,
              productId: product.product_details?.product_id,
              productIndex: index + 1
            });
            return null;
          }
          
          // Extract product details
          const productName = product.product_details?.name || "Product";
          const productSku = product.product_details?.sku || "";
          const rawPrice = product.product_details?.price || "N/A";
          // Add "SAR" to price if not already present
          const productPrice = rawPrice === "N/A" ? "N/A" : rawPrice.includes("SAR") ? rawPrice : `${rawPrice} SAR`;
          const productSlug = product.product_details?.slug || "";
          
          logger.info("Preparing product template", {
            phoneNumber,
            productIndex: index + 1,
            productId: product.product_details?.product_id,
            imageUrl: firstImage.src,
            templateName,
            languageCode
          });
          
          // Add small delay based on index to avoid rate limiting (staggered)
          return new Promise(resolve => setTimeout(resolve, index * 200))
            .then(() => this.aisensyService.sendProductTemplate(
              phoneNumber,
              templateName,
              languageCode,
              firstImage.src, // Product image URL
              productName,
              productSku,
              productPrice,
              productSlug
            ));
        }).filter(Boolean);
        
        // Send all templates in parallel (with staggered delays)
        const results = await Promise.all(templatePromises);
        
        const successCount = results.filter(r => r && r.success).length;
        logger.info("Multiple product templates sent", {
          phoneNumber,
          templatesSent: successCount,
          totalProducts: productsWithImages.length
        });
        
        if (successCount === 0) {
          logger.error("Failed to send any product templates", {
            phoneNumber,
            errors: results.map(r => r?.error).filter(Boolean)
          });
        }
      }
    } else if (orderData?.order) {
      // Order data available - send order template
      const order = orderData.order;
      // Use user's message language for template (not AI response language)
      const language = userMessageLanguage || detectLanguage(aiResponse);
      const isAramexOrder = orderService.isAramexOrder(order);
      
      // Select template based on order type (Aramex vs regular) and language
      const templateName = isAramexOrder
        ? (language === 'ar' ? 'order_ar_aramex' : 'order_en_aramex_new')
        : (language === 'ar' ? 'order_ar_new' : 'order_en_new');
      const languageCode = language === 'ar' ? 'ar' : 'en';
      
      logger.info("Using order template language based on user message", {
        phoneNumber,
        userMessageLanguage,
        templateName,
        languageCode,
        isAramexOrder
      });
      
      // Get image from first order item, fallback to default if not available
      let orderImageUrl = "https://alhomaidhigroup.com/wp-content/uploads/2025/12/Z3lqS1NTMmFCL1NmK0kxUzQzSE91Zz09.png"; // Default fallback
      if (order.items && order.items.length > 0 && order.items[0].image) {
        orderImageUrl = order.items[0].image;
        logger.info("Using order item image for template", {
          phoneNumber,
          imageUrl: orderImageUrl,
          itemName: order.items[0].item_name
        });
      } else {
        logger.warn("No item image found in order, using default image", {
          phoneNumber,
          itemCount: order.items?.length || 0
        });
      }
      
      // Extract order details
      const customerName = orderService.getCustomerName(order);
      const orderDescription = language === 'ar' 
        ? orderService.formatOrderDescriptionArabic(order)
        : orderService.formatOrderDescription(order);
      const orderId = order.order_details?.order_id?.replace(/^#/, "") || "";
      const orderStatus = language === 'ar'
        ? orderService.formatOrderStatusArabic(order.order_details?.order_status || "")
        : orderService.formatOrderStatus(order.order_details?.order_status || "");
      
      // Get Aramex tracking info if available
      const trackingNumber = isAramexOrder ? orderService.getPrimaryTrackingNumber(order) : null;
      const allTrackingNumbers = isAramexOrder ? orderService.getAllTrackingNumbers(order) : [];
      const shippingLabelUrl = isAramexOrder ? orderService.getShippingLabelUrl(order) : null;
      
      logger.info("Sending order template", {
        phoneNumber,
        orderId,
        templateName,
        languageCode,
        imageUrl: orderImageUrl,
        hasItemImage: !!(order.items && order.items.length > 0 && order.items[0].image),
        isAramexOrder,
        trackingNumber,
        allTrackingNumbers,
        shippingLabelUrl
      });
      
      // First send the AI response text
      const textResult = await this.sendMessage(phoneNumber, aiResponse, tracker);
      
      if (!textResult.success) {
        logger.error("Failed to send order text response", {
          phoneNumber,
          error: textResult.error
        });
        return tracker.getResult();
      }
      
      // Send order template with item image (or fallback)
      // For Aramex orders, include tracking number and URL button
      const templateResult = await this.aisensyService.sendOrderTemplate(
        phoneNumber,
        templateName,
        languageCode,
        customerName,
        orderDescription,
        orderId,
        orderStatus,
        orderImageUrl,
        trackingNumber || undefined, // Pass tracking number for Aramex templates
        isAramexOrder // Include URL button for Aramex orders
      );
      
      if (templateResult.success) {
        logger.info("Order template sent successfully", {
          phoneNumber,
          messageId: templateResult.message_id,
          orderId
        });
      } else {
        logger.error("Failed to send order template", {
          phoneNumber,
          error: templateResult.error,
          orderId
        });
      }
    } else {
      // No product or order data - send text only
      logger.info("Sending text-only response", {
        phoneNumber,
        messageLength: aiResponse.length,
        messagePreview: aiResponse.substring(0, 150),
        hasProductData: !!productData,
        hasOrderData: !!orderData
      });
      
      const result = await this.sendMessage(phoneNumber, aiResponse, tracker);
      
      if (result.success) {
        logger.info("AI response sent successfully", {
          phoneNumber,
          messageId: result.message_id,
          messageLength: aiResponse.length,
          productCount: productData?.products?.length || 0,
          hasOrderData: !!orderData
        });
        
        // Check for re-engagement error after a delay (edge case: 24-hour window)
        // This is handled asynchronously to avoid blocking the response
        if (result.message_id) {
          setTimeout(async () => {
            try {
              const details = await this.aisensyService.getMessageDetails(result.message_id!);
              if (details.success && details.message && details.message.status === "FAILED") {
                const failureResponse = details.message.failureResponse as any;
                const isReEngagementError = 
                  failureResponse?.code === "131047" ||
                  failureResponse?.reason === "Re-engagement message" ||
                  (failureResponse?.error_data?.details?.includes("24 hours") && 
                   failureResponse?.error_data?.details?.includes("last replied"));
                
                if (isReEngagementError) {
                  logger.warn("⚠️  Re-engagement error detected - 24 hour messaging window expired", {
                    phoneNumber,
                    messageId: result.message_id,
                    errorCode: failureResponse?.code,
                    errorReason: failureResponse?.reason,
                    errorDetails: failureResponse?.error_data?.details
                  });
                  
                  // Note: Since the user just sent a message, this shouldn't happen
                  // But if it does, the next message from the user will reopen the window
                  // We log this for monitoring purposes
                }
              }
            } catch (error) {
              // Silently fail - don't add server load
            }
          }, 5000); // Check once after 5 seconds
        }
      } else {
        logger.error("Failed to send AI response", {
          phoneNumber,
          error: result.error,
          messageId: result.message_id,
          messageLength: aiResponse.length
        });
      }
    }

    return tracker.getResult();
  }
}

