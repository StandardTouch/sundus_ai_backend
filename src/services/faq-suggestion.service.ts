/**
 * FAQ Suggestion Service
 * Handles smart FAQ suggestions when no FAQs are found
 */

import { faqRepository } from "../repositories/faq.repository.js";
import { reframeQuestionBothWays } from "../utils/question-framing.util.js";
import { detectLanguage } from "../utils/language.util.js";
import { logger } from "../utils/logger.js";
import type { AISuggestedFAQDto } from "../models/faq.model.js";
import type { FAQ } from "../models/faq.model.js";

/**
 * Create a smart FAQ suggestion when no FAQs are found
 */
export interface CreateSuggestionParams {
  question: string;  // Original user question
  conversationId?: string;
  messageId?: string;
  phoneNumber?: string;
}

/**
 * FAQ Suggestion Service
 */
export class FAQSuggestionService {
  /**
   * Check if a similar suggestion already exists (duplicate detection)
   * Checks both pending and rejected suggestions to prevent re-suggesting rejected questions
   */
  async checkDuplicateSuggestion(question: string, days: number = 30): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get all pending suggestions
      const pendingSuggestions = await faqRepository.findByStatus('pending_review');
      
      // Get all rejected suggestions (to prevent re-suggesting rejected questions)
      const rejectedSuggestions = await faqRepository.findByStatus('rejected');

      // Check for similar questions (exact match or very similar)
      const normalizedQuestion = question.toLowerCase().trim();
      
      // Check pending suggestions
      for (const suggestion of pendingSuggestions) {
        const suggestionQuestion = suggestion.question?.toLowerCase().trim() || '';
        const suggestionQuestionAr = suggestion.question_ar?.toLowerCase().trim() || '';
        
        // Check exact match
        if (
          suggestionQuestion === normalizedQuestion ||
          suggestionQuestionAr === normalizedQuestion ||
          suggestion.question === question ||
          suggestion.question_ar === question
        ) {
          logger.info("Duplicate suggestion found (pending)", {
            existingId: suggestion._id,
            question
          });
          return true;
        }
      }

      // Check rejected suggestions (only within the time window)
      for (const suggestion of rejectedSuggestions) {
        // Only check if rejection was recent (within the time window)
        const rejectedAt = suggestion.ai_suggestion?.reviewed_at || suggestion.updated_at;
        if (rejectedAt && new Date(rejectedAt) < cutoffDate) {
          continue; // Skip old rejections
        }

        const suggestionQuestion = suggestion.question?.toLowerCase().trim() || '';
        const suggestionQuestionAr = suggestion.question_ar?.toLowerCase().trim() || '';
        
        // Check exact match
        if (
          suggestionQuestion === normalizedQuestion ||
          suggestionQuestionAr === normalizedQuestion ||
          suggestion.question === question ||
          suggestion.question_ar === question
        ) {
          logger.info("Duplicate suggestion found (rejected recently)", {
            existingId: suggestion._id,
            question,
            rejectedAt: rejectedAt?.toISOString()
          });
          return true; // Prevent re-suggesting recently rejected questions
        }
      }

      return false;
    } catch (error: any) {
      logger.error("Error checking duplicate suggestion", {
        error: error.message,
        question
      });
      return false; // If check fails, allow creation (better to have duplicates than miss suggestions)
    }
  }

  /**
   * Create a smart FAQ suggestion
   */
  async createSuggestion(params: CreateSuggestionParams): Promise<FAQ | null> {
    try {
      const { question, conversationId, messageId, phoneNumber } = params;

      // Validate question
      if (!question || question.trim().length === 0) {
        logger.warn("Cannot create suggestion: empty question");
        return null;
      }

      // Check for duplicates
      const isDuplicate = await this.checkDuplicateSuggestion(question);
      if (isDuplicate) {
        logger.info("Skipping duplicate suggestion", { question });
        return null;
      }

      // Reframe question into proper FAQ format and translate to both languages
      logger.info("Creating FAQ suggestion", {
        question,
        conversationId,
        messageId,
        phoneNumber
      });

      // Reframe the question into proper FAQ format in both languages
      const reframed = await reframeQuestionBothWays(question);
      
      // Fallback to original if reframing fails
      const sourceLanguage = detectLanguage(question);
      const finalQuestion = reframed.question || (sourceLanguage === 'en' ? question : null);
      const finalQuestionAr = reframed.question_ar || (sourceLanguage === 'ar' ? question : null);

      if (!finalQuestion && !finalQuestionAr) {
        logger.warn("Failed to reframe question in any language", { question });
        return null;
      }

      // Create suggestion DTO
      const suggestionDto: AISuggestedFAQDto = {
        question: finalQuestion || question, // Fallback to original if reframing failed
        ...(finalQuestionAr && { question_ar: finalQuestionAr }), // Only include if not null/undefined
        answer: "", // Empty - admin will fill
        answer_ar: "", // Empty - admin will fill
        ...(conversationId && { source_conversation_id: conversationId }),
        ...(messageId && { source_message_id: messageId }),
        confidence_score: 0.0 // Low confidence since no FAQ was found
      };

      // Create in database
      const suggestion = await faqRepository.createAISuggested(suggestionDto);

      logger.info("FAQ suggestion created successfully", {
        suggestionId: suggestion._id,
        question: suggestion.question,
        question_ar: suggestion.question_ar,
        sourceLanguage
      });

      return suggestion;
    } catch (error: any) {
      logger.error("Error creating FAQ suggestion", {
        error: error.message,
        params
      });
      return null; // Don't throw - suggestion creation failure shouldn't break the flow
    }
  }

  /**
   * Get all pending suggestions
   */
  async getPendingSuggestions(limit?: number): Promise<FAQ[]> {
    try {
      return await faqRepository.findPendingReviewFAQs(limit);
    } catch (error: any) {
      logger.error("Error getting pending suggestions", {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get suggestion by ID
   */
  async getSuggestionById(id: string): Promise<FAQ | null> {
    try {
      const faq = await faqRepository.findById(id);
      
      // Only return if it's an AI-suggested FAQ
      if (faq && faq.source === 'ai_suggested') {
        return faq;
      }
      
      return null;
    } catch (error: any) {
      logger.error("Error getting suggestion by ID", {
        error: error.message,
        id
      });
      throw error;
    }
  }
}

export const faqSuggestionService = new FAQSuggestionService();

