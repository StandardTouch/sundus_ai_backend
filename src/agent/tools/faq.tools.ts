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
      description: "MANDATORY: Search for answers to questions about policies, warranties, procedures, shipping, returns, payment, orders, products, and general information. You MUST use this tool when users ask about company policies, warranties, how to do something, general questions, or any information that might be documented. Always search FAQs first before answering policy or general information questions.",
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

