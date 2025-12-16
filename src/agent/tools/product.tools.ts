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
      description: "Search for products by SKU, brand name, or keywords. Use this when user wants to find products, search for items, browse catalog, ask about specific brands, or wants product recommendations.",
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
      description: "Get detailed information about a specific product including images, price, description, and specifications. Use this when user asks about a specific product, wants full product information, or clicks on a product from search results.",
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

