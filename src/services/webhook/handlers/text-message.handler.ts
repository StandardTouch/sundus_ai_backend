/**
 * Text Message Handler
 * Handles TEXT type messages with OpenAI processing
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { openaiService } from "../../openai.service.js";
import { conversationService } from "../../conversation.service.js";
import { conversationMessageRepository } from "../../../repositories/conversation-message.repository.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import type { ConversationMessage } from "../../../models/conversation-message.model.js";
import { logger } from "../../../utils/logger.js";
import { processGuardrails, quickGuardrailCheck } from "../../../guardrails/index.js";
import { allTools } from "../../../agent/tools/index.js";
import { executeTool, type ToolExecutionResult } from "../../../agent/executor/index.js";
import type { ChatMessage } from "../../openai.service.js";
import type { Product } from "../../../api/alhomaidhi/product.api.js";

/**
 * System prompt for the AI assistant
 */
const SYSTEM_PROMPT = `You are Sundus AI, a professional and courteous AI assistant providing customer support for Alhomaidhi Group.

ROLE AND IDENTITY:
- Your name is Sundus AI. Always introduce yourself by name when greeting users for the first time or when appropriate.
- You are a knowledgeable customer support representative specializing in product inquiries, order tracking, and general customer assistance.

COMMUNICATION GUIDELINES:
- Maintain a professional, friendly, and respectful tone in all interactions.
- Communicate clearly and concisely, using grammatically correct language.
- Structure responses logically: provide a brief acknowledgment, deliver the main information, and offer additional assistance when relevant.
- Be empathetic and patient when addressing customer concerns.

CAPABILITIES:
- Assist with product searches, specifications, and availability inquiries.
- Help customers track their orders and provide order status updates.
- Answer general questions about Alhomaidhi Group's services and policies.
- Provide accurate and up-to-date information based on available data.
- When showing multiple products, provide personalized recommendations based on the user's query, preferences, and product features (price, brand, availability, etc.).

LIMITATIONS AND BOUNDARIES:
- If you are uncertain about an answer or lack specific information, acknowledge this honestly and suggest alternative ways to help.
- Do not speculate or provide information that may be inaccurate.
- If a request is outside your capabilities, politely explain the limitation and offer to connect the customer with appropriate resources.

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
  * Use line breaks (\n) for readability
- When showing multiple products from a search:
  * Keep the text response VERY brief - just acknowledge the search results
  * Do NOT list any product details (name, SKU, price, links) in the text message
  * Do NOT create numbered lists or bullet points of products
  * Images with full product details will be sent separately after your text response
  * Example responses: "I found 3 Aston Martin watches for you!" or "Here are some Aston Martin watches I found for you."
  * Keep it to 1-2 sentences maximum

Remember: You represent Alhomaidhi Group, and your goal is to provide exceptional customer service while maintaining professionalism and accuracy.`;

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
    tracker: TimingTracker
  ): Promise<{ message: string | null; productData?: { products: Product[]; isSingleProduct: boolean } }> {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    // First call: AI decides if it needs to call tools
    tracker.addEvent("Initial OpenAI call with tools");
    const firstResult = await openaiService.chatCompletion(messages, {
      temperature: 0.7,
      max_tokens: 1000, // Increased to prevent truncation
      tools: allTools,
      tool_choice: "auto"
    });

    if (!firstResult.success) {
      logger.error("OpenAI call failed", { error: firstResult.error });
      return { message: null };
    }

    // If AI wants to call tools
    if (firstResult.tool_calls && firstResult.tool_calls.length > 0) {
      tracker.addEvent(`Executing ${firstResult.tool_calls.length} tool call(s)`);
      
      // Execute all tool calls in parallel
      const toolResults: ToolExecutionResult[] = await Promise.all(
        firstResult.tool_calls.map(toolCall => executeTool(toolCall))
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
          return {
            products: searchResult.metadata.products,
            isSingleProduct: false
          };
        }
        
        return null;
      })();

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

      // Second call: AI formats final response with tool results
      tracker.addEvent("Getting final response from OpenAI with tool results");
      const finalMessages: ChatMessage[] = [
        ...messages,
        assistantMessageWithTools,
        ...toolMessages
      ];

      const finalResult = await openaiService.chatCompletion(finalMessages, {
        temperature: 0.7,
        max_tokens: 1000 // Increased to prevent truncation
      });

      if (!finalResult.success || !finalResult.message) {
        logger.error("OpenAI final response failed", { error: finalResult.error });
        return { message: null };
      }

      const result: { message: string; productData?: { products: Product[]; isSingleProduct: boolean } } = {
        message: finalResult.message
      };
      
      if (productData) {
        result.productData = productData;
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

    // Process with OpenAI (use sanitized input) - with tools support
    tracker.addEvent("Processing with OpenAI");
    const aiResult = await this.processWithTools(
      sanitizedText,
      conversationHistory,
      tracker
    );
    tracker.addEvent(`OpenAI processing completed`);

    if (!aiResult.message) {
      logger.error("OpenAI processing failed", { phoneNumber });
      
      // Fallback response
      const fallbackResponse = "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.";
      await this.sendMessage(phoneNumber, fallbackResponse, tracker);
      
      return tracker.getResult();
    }
    tracker.addEvent("AI response generated");
    
    const aiResponse = aiResult.message;
    const productData = aiResult.productData;

    // Calculate response time
    const totalResponseTime = tracker.getTotalTime();
    const openaiEvents = tracker.getEvents().filter(e => e.event.includes("OpenAI"));
    const openaiTime = openaiEvents.reduce((sum, e) => sum + e.elapsed, 0);
    const processingTime = totalResponseTime - openaiTime;

    // Store assistant message with response time and accuracy data
    tracker.addEvent("Storing assistant message");
    const assistantMessageId = `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: ConversationMessage['metadata'] = {
      response_time_ms: Math.round(totalResponseTime),
      openai_time_ms: Math.round(openaiTime),
      processing_time_ms: Math.round(processingTime)
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
    // If products are available, send images accordingly
    if (productData?.products && productData.products.length > 0) {
      const products = productData.products;
      
      // Log product data for debugging
      logger.info("Product data for image sending", {
        phoneNumber,
        productCount: products.length,
        isSingleProduct: productData.isSingleProduct
      });
      
      if (productData.isSingleProduct) {
        // Single product: send all images with first image having caption
        const product = products[0];
        if (product && product.images && product.images.length > 0) {
          tracker.addEvent("Sending single product images");
          
          const firstImage = product.images[0];
          if (firstImage && firstImage.src) {
            logger.info("Sending single product images", {
              phoneNumber,
              productId: product.product_details?.product_id,
              imageCount: product.images.length
            });
            
            // Send first image with caption
            const imageResult = await this.aisensyService.sendImageMessage(
              phoneNumber,
              firstImage.src,
              aiResponse
            );
            
            if (imageResult.success) {
              // Send remaining images
              if (product.images.length > 1) {
                for (let i = 1; i < product.images.length; i++) {
                  const image = product.images[i];
                  if (image && image.src) {
                    await this.aisensyService.sendImageMessage(
                      phoneNumber,
                      image.src
                    );
                  }
                }
              }
              logger.info("All single product images sent", {
                phoneNumber,
                imageCount: product.images.length
              });
            } else {
              logger.error("Failed to send product image", {
                phoneNumber,
                error: imageResult.error
              });
              // Fallback to text message
              await this.sendMessage(phoneNumber, aiResponse, tracker);
            }
          } else {
            // No image URL, send text only
            await this.sendMessage(phoneNumber, aiResponse, tracker);
          }
        } else {
          // No images, send text only
          await this.sendMessage(phoneNumber, aiResponse, tracker);
        }
      } else {
        // Multiple products: send text first, then images for each product (max 5 products)
        tracker.addEvent("Sending multiple products with images");
        
        // First send the text response with recommendations
        const textResult = await this.sendMessage(phoneNumber, aiResponse, tracker);
        
        if (textResult.success) {
          logger.info("Multiple products text sent, now sending images", {
            phoneNumber,
            productCount: products.length
          });
          
          // Send images for each product (limit to top 5 to avoid spamming)
          // Send images in parallel batches to improve performance
          const productsToShow = products.slice(0, 5);
          const imagePromises = productsToShow
            .filter(product => product && product.images && product.images.length > 0)
            .map((product, index) => {
              const firstImage = product.images[0];
              if (!firstImage || !firstImage.src) return null;
              
              // Create a detailed caption with all product information and purchase link
              const productName = product.product_details?.name || "Product";
              const productSku = product.product_details?.sku || "";
              const productPrice = product.product_details?.price || "N/A";
              const productSlug = product.product_details?.slug || "";
              const productUrl = productSlug 
                ? `https://alhomaidhigroup.com/product/${productSlug}`
                : "";
              
              // Build comprehensive caption
              let caption = `*${productName}*\n\n`;
              if (productSku) {
                caption += `SKU: ${productSku}\n`;
              }
              caption += `Price: ${productPrice} SAR\n`;
              if (productUrl) {
                caption += `\n🛒 Purchase: ${productUrl}`;
              }
              
              logger.info("Preparing product image", {
                phoneNumber,
                productIndex: index + 1,
                productId: product.product_details?.product_id,
                imageUrl: firstImage.src
              });
              
              // Add small delay based on index to avoid rate limiting (staggered, but shorter)
              return new Promise(resolve => setTimeout(resolve, index * 200))
                .then(() => this.aisensyService.sendImageMessage(
                  phoneNumber,
                  firstImage.src,
                  caption
                ));
            })
            .filter(Boolean);
          
          // Send all images in parallel (with staggered delays)
          await Promise.all(imagePromises);
          
          logger.info("All product images sent for multiple products", {
            phoneNumber,
            imagesSent: productsToShow.filter(p => p.images && p.images.length > 0).length
          });
        } else {
          logger.error("Failed to send multiple products text", {
            phoneNumber,
            error: textResult.error
          });
        }
      }
    } else {
      // Multiple products or no product data - send text only (AI should recommend)
      const result = await this.sendMessage(phoneNumber, aiResponse, tracker);
      
      if (result.success) {
        logger.info("AI response sent successfully", {
          phoneNumber,
          messageId: result.message_id,
          productCount: productData?.products?.length || 0
        });
      } else {
        logger.error("Failed to send AI response", {
          phoneNumber,
          error: result.error,
          messageId: result.message_id
        });
      }
    }

    return tracker.getResult();
  }
}

