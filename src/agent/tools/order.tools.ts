/**
 * Order Tools
 * OpenAI function definitions for order tracking
 */

export const trackOrderTool = {
  type: "function" as const,
  function: {
    name: "track_order",
    description: "Get the LATEST/MOST RECENT order for a user. Use this when user asks 'track my order', 'where is my order', 'show my order', 'I need to track my order', or wants to see their order status WITHOUT mentioning a specific order number. The phone number is automatically provided from the message sender - NEVER ask the user for their phone number. This tool automatically returns the most recent order. If the user mentions a specific order number (e.g., 'order #6956'), use get_order_details instead.",
    parameters: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: "User's phone number (automatically provided by the system from the message sender - you MUST NOT ask the user for this)"
        }
      },
      required: []
    }
  }
};

export const getOrderDetailsTool = {
  type: "function" as const,
  function: {
    name: "get_order_details",
    description: "Get detailed information about a SPECIFIC order by order number. Use this ONLY when the user explicitly mentions a specific order number in their message (e.g., 'track order #6956', 'where is order #7360', 'status of order 6956', 'show me order #6956'). The phone number is automatically provided from the message sender - NEVER ask the user for their phone number. You can search for any order associated with that phone number. If the user does NOT mention a specific order number, use track_order instead to get their latest order.",
    parameters: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "Order ID in format '#6956' or '6956' - extract this from the user's message. Only use this tool if the user explicitly mentions an order number."
        },
        phone_number: {
          type: "string",
          description: "User's phone number (automatically provided by the system from the message sender - you MUST NOT ask the user for this). This allows searching for any order associated with that phone number."
        }
      },
      required: ["order_id"]
    }
  }
};

