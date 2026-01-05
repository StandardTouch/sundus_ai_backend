/**
 * Order Tool Executor
 * Executes order-related tool calls
 */

import { orderService } from "../../services/order.service.js";
import type { Order } from "../../api/alhomaidhi/order.api.js";
import { logger } from "../../utils/logger.js";
import type { ToolExecutionResult } from "./index.js";

/**
 * Execute order tool
 */
export async function executeOrderTool(
  toolName: string,
  args: any
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case "track_order":
        return await executeTrackOrder(args);
      
      case "get_order_details":
        return await executeGetOrderDetails(args);
      
      default:
        logger.error("Unknown order tool", { toolName });
        return {
          tool_call_id: args.tool_call_id || "",
          name: toolName,
          content: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error: any) {
    logger.error("Order tool execution error", { error, toolName, args });
    return {
      tool_call_id: args.tool_call_id || "",
      name: toolName,
      content: `Error executing ${toolName}: ${error.message}`,
    };
  }
}

/**
 * Execute track_order tool
 */
async function executeTrackOrder(args: {
  phone_number: string;
  tool_call_id?: string;
}): Promise<ToolExecutionResult> {
  const { phone_number } = args;

  try {
    const orders = await orderService.listOrders(phone_number);

    if (orders.length === 0) {
      return {
        tool_call_id: args.tool_call_id || "",
        name: "track_order",
        content: "You don't have any orders yet. If you've placed an order recently, it may take a few moments to appear in the system.",
        metadata: {
          orders: [],
          orderCount: 0,
          should_send_feedback: true // Cannot help - task complete (no orders found)
        },
      };
    }

    // If multiple orders, show the latest one (most recent) by default
    // Orders are already sorted by date (most recent first) from the API
    const latestOrder = orders[0];
    
    // Format the latest order for AI
    const formattedOrder = orderService.formatOrderForAI(latestOrder);
    
    // If there are multiple orders, mention it but focus on the latest
    let content = formattedOrder;
    if (orders.length > 1) {
      content = `You have ${orders.length} order(s). Here are the details of your latest order:\n\n${formattedOrder}\n\nIf you'd like to see details of another order, please provide the order number.`;
    }

    return {
      tool_call_id: args.tool_call_id || "",
      name: "track_order",
      content: content,
      metadata: {
        orders: orders,
        orderCount: orders.length,
        // Include latest order for template sending
        order: latestOrder,
        isSingleOrder: true, // Treat as single order for template
        should_send_feedback: true // Order found - task completed
      },
    };
  } catch (error: any) {
    logger.error("Track order error", { error, phone_number });
    
    // Check if it's a service unavailable error (404, 500, timeout, etc.)
    // Check both the error object and nested originalError
    const errorStatus = error.status || error.originalError?.status || error.response?.status;
    const errorCode = error.code || error.originalError?.code;
    const errorMessage = error.message || error.originalError?.message || String(error);
    
    const isServiceUnavailable = 
      error.isServiceUnavailable ||
      errorStatus === 404 ||
      errorStatus === 500 ||
      errorCode === "ECONNREFUSED" ||
      errorCode === "ENOTFOUND" ||
      errorCode === "ETIMEDOUT" ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("404") ||
      errorMessage.includes("500") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND");
    
    logger.info("Error detection for track_order", {
      isServiceUnavailable,
      errorStatus,
      errorCode,
      errorMessage: errorMessage.substring(0, 100)
    });
    
    if (isServiceUnavailable) {
      return {
        tool_call_id: args.tool_call_id || "",
        name: "track_order",
        content: "I apologize, but the order tracking service is currently unavailable. Please try again in a few moments, or contact our support team for assistance.",
      };
    }
    
    return {
      tool_call_id: args.tool_call_id || "",
      name: "track_order",
      content: "I'm having trouble retrieving your orders right now. Please try again in a moment.",
    };
  }
}

/**
 * Execute get_order_details tool
 */
async function executeGetOrderDetails(args: {
  order_id: string;
  phone_number: string;
  tool_call_id?: string;
}): Promise<ToolExecutionResult> {
  const { order_id, phone_number } = args;

  try {
    const order = await orderService.getOrderById(order_id, phone_number);

    if (!order) {
      return {
        tool_call_id: args.tool_call_id || "",
        name: "get_order_details",
        content: `I couldn't find order ${order_id} in your account. Please check the order number and try again, or ask to see all your orders.`,
        metadata: {
          order: null,
          isSingleOrder: false,
          should_send_feedback: true // Cannot help - task complete (order not found)
        },
      };
    }

    // Format order for AI
    const formattedOrder = orderService.formatOrderForAI(order);

    return {
      tool_call_id: args.tool_call_id || "",
      name: "get_order_details",
      content: formattedOrder,
      metadata: {
        order: order,
        isSingleOrder: true,
        should_send_feedback: true // Order found - task completed
      },
    };
  } catch (error: any) {
    logger.error("Get order details error", { error, order_id, phone_number });
    
    // Check if it's a service unavailable error (404, 500, timeout, etc.)
    // Check both the error object and nested originalError
    const errorStatus = error.status || error.originalError?.status || error.response?.status;
    const errorCode = error.code || error.originalError?.code;
    const errorMessage = error.message || error.originalError?.message || String(error);
    
    const isServiceUnavailable = 
      error.isServiceUnavailable ||
      errorStatus === 404 ||
      errorStatus === 500 ||
      errorCode === "ECONNREFUSED" ||
      errorCode === "ENOTFOUND" ||
      errorCode === "ETIMEDOUT" ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("404") ||
      errorMessage.includes("500") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND");
    
    logger.info("Error detection for get_order_details", {
      isServiceUnavailable,
      errorStatus,
      errorCode,
      errorMessage: errorMessage.substring(0, 100)
    });
    
    if (isServiceUnavailable) {
      return {
        tool_call_id: args.tool_call_id || "",
        name: "get_order_details",
        content: "I apologize, but the order tracking service is currently unavailable. Please try again in a few moments, or contact our support team for assistance.",
      };
    }
    
    return {
      tool_call_id: args.tool_call_id || "",
      name: "get_order_details",
      content: `I'm having trouble retrieving order ${order_id} right now. Please try again in a moment.`,
    };
  }
}

