/**
 * FAQ Tool Executor
 * Executes FAQ-related tools when called by AI
 */

import { faqService } from "../../services/faq.service.js";
import { faqSuggestionService } from "../../services/faq-suggestion.service.js";
import { logger } from "../../utils/logger.js";
import type { FAQ } from "../../models/faq.model.js";

/**
 * FAQ tool result
 */
export interface FAQToolResult {
  success: boolean;
  result: string | null;  // Formatted FAQ answer or null if no match
  error?: string;
  faqs?: FAQ[];  // Found FAQs (for metadata)
}

/**
 * Context for FAQ tool execution
 */
export interface FAQToolContext {
  conversationId?: string;
  messageId?: string;
  phoneNumber?: string;
}

/**
 * Execute FAQ tool
 */
export async function executeFAQTool(
  toolName: string,
  args: any,
  context?: FAQToolContext
): Promise<FAQToolResult> {
  try {
    logger.info("Executing FAQ tool", { toolName, args });

    switch (toolName) {
      case "search_faqs": {
        const { query } = args;
        
        if (!query || typeof query !== "string") {
          return {
            success: false,
            result: null,
            error: "Query parameter is required and must be a string"
          };
        }

        // Search FAQs using semantic search
        // Note: Language detection can be added later based on user session
        const searchResults = await faqService.searchFAQs(query, 5, 'en');

        // If no FAQs found, create a smart suggestion
        if (searchResults.faqs.length === 0 || searchResults.topScore < 0.5) {
          // Create FAQ suggestion in background (don't wait for it)
          if (context) {
            faqSuggestionService.createSuggestion({
              question: query,
              conversationId: context.conversationId,
              messageId: context.messageId,
              phoneNumber: context.phoneNumber
            }).catch((error) => {
              logger.error("Failed to create FAQ suggestion", {
                error: error.message,
                query,
                context
              });
            });
          } else {
            // If no context, still try to create suggestion (without metadata)
            faqSuggestionService.createSuggestion({
              question: query
            }).catch((error) => {
              logger.error("Failed to create FAQ suggestion", {
                error: error.message,
                query
              });
            });
          }

          return {
            success: true,
            result: null,  // null means no FAQ found - AI will generate response
            faqs: []
          };
        }

        // If single FAQ found with high score
        if (searchResults.faqs.length === 1 && searchResults.topScore >= 0.85) {
          const formatted = faqService.formatFAQForAI(searchResults.faqs[0], 'en');
          return {
            success: true,
            result: formatted,
            faqs: searchResults.faqs
          };
        }

        // If multiple FAQs found or lower score
        // Return formatted result with all FAQs
        const formatted = faqService.formatMultipleFAQsForAI(searchResults.faqs, 'en');
        return {
          success: true,
          result: formatted,
          faqs: searchResults.faqs
        };
      }

      default:
        return {
          success: false,
          result: null,
          error: `Unknown FAQ tool: ${toolName}`
        };
    }
  } catch (error: any) {
    logger.error("FAQ executor error", { error, toolName, args });
    return {
      success: false,
      result: null,
      error: error.message || "Failed to execute FAQ tool"
    };
  }
}

