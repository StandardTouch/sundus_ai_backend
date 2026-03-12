/**
 * Tool Executor Router
 * Routes tool calls to appropriate executors
 */

import { executeProductTool, type ProductToolResult } from "./product.executor.js";
import { executeOrderTool } from "./order.executor.js";
import { executeFAQTool } from "./faq.executor.js";
import { executeLocationTool } from "./location.executor.js";
import { logger } from "../../utils/logger.js";
import type OpenAI from "openai";

/**
 * Tool execution result with metadata
 */
export interface ToolExecutionResult {
  tool_call_id: string;
  role: "tool";
  name: string;
  content: string;
  metadata?: {
    products?: any[] | undefined;
    isSingleProduct?: boolean | undefined;
    orders?: any[] | undefined;
    orderCount?: number | undefined;
    order?: any | undefined;
    isSingleOrder?: boolean | undefined;
    locations?: any[] | undefined;
    should_send_feedback?: boolean | undefined; // Flag indicating if feedback should be sent after this tool execution
    should_send_location_template?: boolean | undefined; // Flag indicating location template should be sent after this tool execution
  };
}

/**
 * Execute tool call
 * @param toolCall - The tool call from OpenAI
 * @param phoneNumber - The phone number of the user making the request (for validation)
 * @param context - Additional context (conversationId, messageId) for smart features
 */
export async function executeTool(
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  phoneNumber?: string,
  context?: { conversationId?: string; messageId?: string; userMessage?: string }
): Promise<ToolExecutionResult> {
  // Type guard: ensure it's a function tool call
  if (toolCall.type !== "function") {
    logger.error("Invalid tool call type", { toolCall });
    return {
      tool_call_id: toolCall.id,
      role: "tool",
      name: "unknown",
      content: JSON.stringify({ error: "Invalid tool call type" })
    };
  }
  
  const { id, function: func } = toolCall;
  const { name, arguments: argsStr } = func;

  let args: any;
  try {
    args = JSON.parse(argsStr);
  } catch (error) {
    logger.error("Failed to parse tool arguments", { error, argsStr });
    return {
      tool_call_id: id,
      role: "tool",
      name,
      content: JSON.stringify({ error: "Invalid tool arguments" })
    };
  }

  logger.info("Executing tool", { toolName: name, args });

  // Route to appropriate executor based on tool name
  if (name.startsWith("search_products") || name.startsWith("get_product_details") || name.startsWith("list_brands")) {
    // Pass user message to product executor for single product detection
    const productResult = await executeProductTool(name, args, context?.userMessage);
    
    // Format result for OpenAI
    const content = productResult.success
      ? productResult.result
      : JSON.stringify({ error: productResult.error || "Tool execution failed" });

    // Include product metadata for image sending
    const metadata = (name.startsWith("search_products") || name.startsWith("get_product_details")) && productResult.products
      ? {
          products: productResult.products,
          isSingleProduct: productResult.isSingleProduct ?? false
        }
      : undefined;

    return {
      tool_call_id: id,
      role: "tool",
      name,
      content: typeof content === "string" ? content : JSON.stringify(content),
      ...(metadata && { metadata })
    };
  } else if (name === "track_order" || name === "get_order_details") {
    // TESTING ONLY: Override phone number for testing purposes
    // TODO: Remove this before production deployment
    const TEST_PHONE_NUMBER = "576791795"; // This number has orders for testing
    const USE_TEST_NUMBER = false; // Set to false to use actual sender's number
    
    // STRICT SECURITY: Always use the phone number from the message sender
    // Never trust phone numbers from tool arguments - always override with the actual sender's number
    if (phoneNumber) {
      let cleanPhoneNumber: string;
      
      if (USE_TEST_NUMBER) {
        // TESTING ONLY: Use test phone number
        logger.warn("TESTING MODE: Using test phone number for order tracking", {
          originalPhoneNumber: phoneNumber,
          testPhoneNumber: TEST_PHONE_NUMBER,
          toolName: name
        });
        cleanPhoneNumber = TEST_PHONE_NUMBER;
      } else {
        // PRODUCTION: Use actual sender's phone number
        // Remove + prefix and country code (API expects numbers without country code)
        cleanPhoneNumber = phoneNumber.replace(/^\+/, "");
        
        // Remove country code prefixes (API expects phone number without country code)
        if (cleanPhoneNumber.startsWith("966") && cleanPhoneNumber.length > 10) {
          cleanPhoneNumber = cleanPhoneNumber.substring(3); // Remove 966
        } else if (cleanPhoneNumber.startsWith("91") && cleanPhoneNumber.length > 10) {
          cleanPhoneNumber = cleanPhoneNumber.substring(2); // Remove 91
        } else if (cleanPhoneNumber.startsWith("1") && cleanPhoneNumber.length > 10) {
          cleanPhoneNumber = cleanPhoneNumber.substring(1); // Remove 1
        }
        
        // Log if a different phone number was provided (security audit)
        const providedPhoneNumber = args.phone_number?.replace(/^\+/, "");
        if (providedPhoneNumber && providedPhoneNumber !== phoneNumber.replace(/^\+/, "") && providedPhoneNumber !== cleanPhoneNumber) {
          logger.warn("Security alert: Tool attempted to use different phone number - overriding with sender's number", {
            attemptedPhoneNumber: providedPhoneNumber,
            senderPhoneNumber: phoneNumber,
            cleanedPhoneForAPI: cleanPhoneNumber,
            toolName: name
          });
        }
      }
      
      // STRICT RULE: Always override with the sender's phone number (cleaned for API)
      // This ensures users can ONLY access their own orders
      args.phone_number = cleanPhoneNumber;
    } else {
      logger.error("No phone number provided for order tool - this should never happen", { toolName: name });
      return {
        tool_call_id: id,
        role: "tool",
        name,
        content: "I'm unable to retrieve order information. Please try again."
      };
    }
    
    // Execute order tool
    const orderResult = await executeOrderTool(name, { ...args, tool_call_id: id });
    
    return {
      tool_call_id: id,
      role: "tool",
      name: orderResult.name,
      content: orderResult.content,
      ...(orderResult.metadata && { metadata: orderResult.metadata })
    };
  } else if (name === "search_faqs") {
    // With exactOptionalPropertyTypes, do not pass explicit `undefined` values.
    const faqContext = {
      ...(context?.conversationId ? { conversationId: context.conversationId } : {}),
      ...(context?.messageId ? { messageId: context.messageId } : {}),
      ...(phoneNumber ? { phoneNumber } : {})
    };
    const faqResult = await executeFAQTool(name, args, faqContext);
    
    // Format result for OpenAI
    // If result is null, return message indicating no FAQ found (AI will generate response)
    const content = faqResult.success
      ? (faqResult.result || JSON.stringify({ message: "No relevant FAQ found" }))
      : JSON.stringify({ error: faqResult.error || "FAQ search failed" });

    return {
      tool_call_id: id,
      role: "tool",
      name,
      content: typeof content === "string" ? content : JSON.stringify(content)
    };
  } else if (name === "search_locations") {
    const locationResult = await executeLocationTool(toolCall);

    const content = locationResult.success
      ? (locationResult.result || "Location search completed.")
      : JSON.stringify({ error: locationResult.error || "Location tool failed" });

    return {
      tool_call_id: id,
      role: "tool",
      name,
      content: typeof content === "string" ? content : JSON.stringify(content),
      metadata: {
        locations: locationResult.locations,
      },
    };
  } else {
    // Unknown tool
    logger.error("Unknown tool", { toolName: name });
    return {
      tool_call_id: id,
      role: "tool",
      name,
      content: JSON.stringify({ error: `Tool executor not implemented for: ${name}` })
    };
  }
}

