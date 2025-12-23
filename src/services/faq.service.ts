/**
 * FAQ Service
 * Business logic layer for FAQ operations
 * Bridges between executor and Pinecone/MongoDB
 */

import { faqRepository } from "../repositories/faq.repository.js";
import { pineconeService, type FAQRecord, type FAQSearchResult } from "./pinecone.service.js";
import type { FAQ } from "../models/faq.model.js";
import { logger } from "../utils/logger.js";

/**
 * FAQ search result with full FAQ details
 */
export interface FAQServiceSearchResult {
  faqs: FAQ[];
  topScore: number;
  totalResults: number;
}

/**
 * FAQ Service
 */
export class FAQService {
  /**
   * Search FAQs using semantic search
   * 1. Search Pinecone for similar FAQs
   * 2. Fetch full FAQ details from MongoDB
   * 3. Filter by active status
   * 4. Return formatted results
   */
  async searchFAQs(
    query: string,
    topK: number = 5,
    language: 'en' | 'ar' = 'en'
  ): Promise<FAQServiceSearchResult> {
    try {
      logger.info("Searching FAQs", { query, topK, language });

      // Step 1: Search Pinecone (semantic search)
      const pineconeResults = await pineconeService.searchFAQs(query, topK);

      if (pineconeResults.length === 0) {
        logger.info("No FAQs found in Pinecone", { query });
        return {
          faqs: [],
          topScore: 0,
          totalResults: 0
        };
      }

      // Step 2: Extract IDs from Pinecone results
      const faqIds = pineconeResults.map(result => result._id);
      logger.debug("Pinecone search returned IDs", { faqIds, count: faqIds.length });

      // Step 3: Fetch full FAQ details from MongoDB
      const faqs = await faqRepository.findByIds(faqIds);

      // Step 4: Filter by active status and map with scores
      const activeFAQs: (FAQ & { _score: number })[] = [];
      
      for (const faq of faqs) {
        // Only include active FAQs
        if (faq.is_active && faq.status === 'active') {
          const pineconeResult = pineconeResults.find(r => r._id === faq._id);
          if (pineconeResult) {
            activeFAQs.push({
              ...faq,
              _score: pineconeResult._score
            });
          }
        }
      }

      // Sort by score (highest first)
      activeFAQs.sort((a, b) => b._score - a._score);

      // Step 5: Track usage for top result
      if (activeFAQs.length > 0) {
        await faqRepository.incrementUsage(activeFAQs[0]._id!);
      }

      logger.info("FAQ search completed", {
        query,
        totalResults: activeFAQs.length,
        topScore: activeFAQs[0]?._score || 0
      });

      return {
        faqs: activeFAQs.map(({ _score, ...faq }) => faq), // Remove _score from result
        topScore: activeFAQs[0]?._score || 0,
        totalResults: activeFAQs.length
      };
    } catch (error: any) {
      logger.error("FAQ service search error", { error: error.message, query });
      // Return empty result on error (let AI generate response)
      return {
        faqs: [],
        topScore: 0,
        totalResults: 0
      };
    }
  }

  /**
   * Format FAQ for AI response
   * Returns formatted answer based on language preference
   */
  formatFAQForAI(faq: FAQ, language: 'en' | 'ar' = 'en'): string {
    const question = language === 'ar' && faq.question_ar 
      ? faq.question_ar 
      : faq.question;
    
    const answer = language === 'ar' && faq.answer_ar 
      ? faq.answer_ar 
      : faq.answer;

    // Format: "According to our [category] policy: [answer]"
    if (faq.category) {
      return `According to our ${faq.category} policy: ${answer}`;
    }

    // Format: "Here's the answer: [answer]"
    return `Here's the answer: ${answer}`;
  }

  /**
   * Format multiple FAQs for AI response
   */
  formatMultipleFAQsForAI(faqs: FAQ[], language: 'en' | 'ar' = 'en'): string {
    if (faqs.length === 0) {
      return "";
    }

    if (faqs.length === 1) {
      return this.formatFAQForAI(faqs[0], language);
    }

    // Multiple FAQs
    const formatted = faqs.map((faq, index) => {
      const question = language === 'ar' && faq.question_ar 
        ? faq.question_ar 
        : faq.question;
      
      const answer = language === 'ar' && faq.answer_ar 
        ? faq.answer_ar 
        : faq.answer;
      
      return `${index + 1}. ${question}\n   ${answer}`;
    }).join("\n\n");

    return `I found ${faqs.length} relevant FAQs:\n\n${formatted}`;
  }

  /**
   * Prepare FAQ for Pinecone
   * Combines question + answer into content field (includes both EN and AR for better semantic search)
   */
  prepareFAQForPinecone(faq: FAQ): FAQRecord {
    // Combine question + answer for better semantic search
    // Include both English and Arabic to improve search across languages
    const parts: string[] = [];
    
    // Add English question and answer
    parts.push(faq.question, faq.answer);
    
    // Add Arabic question and answer if available (improves multilingual search)
    if (faq.question_ar) {
      parts.push(faq.question_ar);
    }
    if (faq.answer_ar) {
      parts.push(faq.answer_ar);
    }
    
    const content = parts.join(" ").trim();

    return {
      _id: faq._id || "",
      content,
      category: faq.category
    };
  }

  /**
   * Sync FAQ to Pinecone
   * Upserts FAQ to Pinecone after creating/updating in MongoDB
   */
  async syncFAQToPinecone(faq: FAQ): Promise<void> {
    try {
      if (!faq._id) {
        throw new Error("FAQ must have _id to sync to Pinecone");
      }

      // Only sync active FAQs
      if (!faq.is_active || faq.status !== 'active') {
        logger.info("Skipping Pinecone sync for inactive FAQ", { faqId: faq._id });
        return;
      }

      const faqRecord = this.prepareFAQForPinecone(faq);
      
      logger.info("Syncing FAQ to Pinecone", { faqId: faq._id });
      await pineconeService.upsertFAQs([faqRecord]);

      // Update vector_id in MongoDB
      await faqRepository.update(faq._id, { vector_id: faq._id });

      logger.info("FAQ synced to Pinecone successfully", { faqId: faq._id });
    } catch (error: any) {
      logger.error("Error syncing FAQ to Pinecone", {
        error: error.message,
        faqId: faq._id
      });
      throw error;
    }
  }

  /**
   * Remove FAQ from Pinecone
   * Deletes FAQ from Pinecone when FAQ is deleted or deactivated
   */
  async removeFAQFromPinecone(faqId: string): Promise<void> {
    try {
      logger.info("Removing FAQ from Pinecone", { faqId });
      await pineconeService.deleteFAQs([faqId]);
      logger.info("FAQ removed from Pinecone successfully", { faqId });
    } catch (error: any) {
      logger.error("Error removing FAQ from Pinecone", {
        error: error.message,
        faqId
      });
      // Don't throw - deletion is not critical
    }
  }

  /**
   * Get best matching FAQ for a query
   * Returns single FAQ if similarity score is high enough, otherwise null
   */
  async getBestMatchingFAQ(
    query: string,
    minScore: number = 0.75,
    language: 'en' | 'ar' = 'en'
  ): Promise<{ faq: FAQ; score: number } | null> {
    try {
      const results = await this.searchFAQs(query, 1, language);

      if (results.faqs.length === 0 || results.topScore < minScore) {
        return null;
      }

      return {
        faq: results.faqs[0],
        score: results.topScore
      };
    } catch (error: any) {
      logger.error("Error getting best matching FAQ", {
        error: error.message,
        query
      });
      return null;
    }
  }
}

export const faqService = new FAQService();

