/**
 * FAQ Tools
 * Tool definitions for FAQ search
 */

import type OpenAI from "openai";

/**
 * FAQ Tools
 * Tools for searching FAQs using semantic search
 */
export const faqTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_faqs",
      description: "Search the FAQ database for answers to common questions about policies, procedures, shipping, returns, payment, orders, products, and general information. Use this when user asks about company policies, how to do something, general questions, wants information about procedures, or asks questions that might be covered in our FAQ database.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The user's question or search query. Extract the key question from the user's message."
          }
        },
        required: ["query"]
      }
    }
  }
];

