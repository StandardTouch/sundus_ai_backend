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
  context?: FAQToolContext,
  userLanguage: "ar" | "en" = "en"
): Promise<FAQToolResult> {
  try {
    logger.info("Executing FAQ tool", { toolName, args, userLanguage });

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
        const searchResults = await faqService.searchFAQs(query, 5, userLanguage);

        logger.info("FAQ search results received in executor", {
          query,
          faqsCount: searchResults.faqs.length,
          topScore: searchResults.topScore,
          totalResults: searchResults.totalResults,
          userLanguage
        });

        // Quality check: Only use FAQs if they meet minimum relevance threshold
        const MIN_RELEVANCE_SCORE = 0.3;
        
        if (searchResults.faqs.length === 0 || searchResults.topScore < MIN_RELEVANCE_SCORE) {
          logger.info("FAQ search results below relevance threshold, creating suggestion", {
            query,
            topScore: searchResults.topScore,
            resultsCount: searchResults.faqs.length,
            threshold: MIN_RELEVANCE_SCORE
          });
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
            faqs: [],
            should_send_feedback: false // No FAQ found - AI will generate response, check AI response later
          };
        }

        if (searchResults.faqs.length === 1) {
          // Single FAQ - use it (whether from keyword fallback or semantic search)
          logger.info("Single FAQ found, formatting for AI", {
            query,
            faqId: searchResults.faqs[0]._id,
            topScore: searchResults.topScore,
            isKeywordMatch: searchResults.topScore >= 0.4 && searchResults.topScore <= 0.5
          });
          const formatted = faqService.formatFAQForAI(searchResults.faqs[0], userLanguage);
          return {
            success: true,
            result: formatted,
            faqs: searchResults.faqs,
            should_send_feedback: true // FAQ found - task completed
          };
        }

        // Multiple FAQs found
        logger.info("Multiple FAQs found, formatting for AI", {
          query,
          faqsCount: searchResults.faqs.length,
          topScore: searchResults.topScore
        });
        const formatted = faqService.formatMultipleFAQsForAI(searchResults.faqs, userLanguage);
        return {
          success: true,
          result: formatted,
          faqs: searchResults.faqs,
          should_send_feedback: true // FAQs found - task completed
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

