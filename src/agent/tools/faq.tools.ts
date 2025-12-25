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
      description: "MANDATORY: Search for answers to questions about policies, warranties, procedures, shipping, returns, payment, orders, products, and general information. You MUST use this tool when users ask about company policies, warranties, how to do something, general questions, or any information that might be documented. Always search FAQs first before answering policy or general information questions. IMPORTANT: When the tool returns an FAQ answer, use it DIRECTLY in your response. Do not expand, rephrase, or add extra information unless the FAQ answer is incomplete. For short answers (like phone numbers), use them exactly as provided.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The user's complete question or search query. Use the FULL question as the user asked it, not just keywords. For example, if user asks 'how does warranty work', use 'how does warranty work' not just 'warranty'. Preserve the full context and meaning of the question."
          }
        },
        required: ["query"]
      }
    }
  }
];

