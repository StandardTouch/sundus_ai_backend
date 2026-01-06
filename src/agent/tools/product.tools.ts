/**
 * Product Tools
 * Tool definitions for product search and browsing
 */

import type OpenAI from "openai";

/**
 * Product Tools
 * Tools for searching products, getting product details, and listing brands
 */
export const productTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "CRITICAL: Search for products (watches) by SKU, brand name, or keywords. You MUST ALWAYS use this tool when: (1) user asks about ANY brand (e.g., 'tommy hilfiger', 'nike', 'lacoste'), (2) user asks to see products/watches, (3) user wants to browse/search for items, (4) user asks 'what products do you have', 'show me products', or similar. NEVER assume you know what products are available - ALWAYS use this tool to search. Even if you think a brand might not exist, you MUST search first before saying it's not available.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query - can be brand name (e.g., 'Nike'), SKU code, or product keywords (e.g., 'watches', 'smartwatch')"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get detailed information about a SPECIFIC product by product ID. Use this ONLY when the user explicitly mentions a product ID number (e.g., 'product 40087', 'show me product ID 62220'). IMPORTANT: Do NOT use this when user says 'show me only 1', 'only one', 'just 1' - those refer to quantity, not product ID. For quantity requests, use search_products instead.",
      parameters: {
        type: "object",
        properties: {
          product_id: {
            type: "number",
            description: "Product ID (numeric identifier for the product)"
          }
        },
        required: ["product_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_brands",
      description: "Get list of all available brands in the catalog. Use this when user asks 'what brands do you have?', wants to see all brands, or asks about brand options.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

