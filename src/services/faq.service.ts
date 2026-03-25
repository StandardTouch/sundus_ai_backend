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

      // Step 1: Try expanded query first for short queries (better semantic matching)
      let searchQuery = query;
      const { isShortQuery, expandQuery } = await import("../utils/faq-keyword-matcher.util.js");
      if (isShortQuery(query)) {
        const expanded = expandQuery(query);
        if (expanded !== query) {
          logger.info("Using expanded query for better semantic matching", {
            original: query,
            expanded
          });
          searchQuery = expanded;
        }
      }

      // Step 2: Search Pinecone (semantic search)
      let pineconeResults: FAQSearchResult[] = [];
      try {
        pineconeResults = await pineconeService.searchFAQs(searchQuery, topK * 2);
      } catch (pineconeError: any) {
        logger.error("Pinecone search failed, proceeding to keyword fallback", {
          error: pineconeError.message,
          query
        });
        // We'll proceed to the keyword fallback below since pineconeResults.length will be 0
      }

      // If Pinecone returned no results (all filtered by threshold) or failed, try keyword fallback immediately
      if (pineconeResults.length === 0) {
        logger.info("No FAQs found in Pinecone or search failed, trying keyword fallback", { query });
        
        const { isShortQuery, findFAQsByKeywords, extractKeywords } = await import("../utils/faq-keyword-matcher.util.js");
        const keywords = extractKeywords(query);
        const hasRelevantKeywords = keywords.length > 0;
        const isShort = isShortQuery(query);
        
        if (isShort || hasRelevantKeywords) {
          logger.info("Trying keyword fallback for query with no Pinecone results", {
            query,
            isShort,
            hasRelevantKeywords,
            keywords
          });
          
          const allActiveFAQs = await faqRepository.findActive();
          const keywordResults = findFAQsByKeywords(allActiveFAQs, query);
          
          logger.info("Keyword fallback results", {
            query,
            keywordScore: keywordResults.matchScore,
            foundCount: keywordResults.faqs.length,
            threshold: 0.2
          });
          
          if (keywordResults.faqs.length > 0 && keywordResults.matchScore >= 0.2) {
            const adjustedScore = Math.min(0.4 + (keywordResults.matchScore * 0.1), 0.5);
            const topKeywordFAQ = keywordResults.faqs[0];
            if (topKeywordFAQ && topKeywordFAQ._id) {
              await faqRepository.incrementUsage(topKeywordFAQ._id);
            }
            
            logger.info("Keyword fallback successful, returning FAQs", {
              query,
              foundCount: keywordResults.faqs.length,
              adjustedScore
            });
            
            return {
              faqs: keywordResults.faqs.slice(0, topK),
              topScore: adjustedScore,
              totalResults: keywordResults.faqs.length
            };
          } else {
            logger.info("Keyword fallback did not find relevant FAQs", {
              query,
              keywordScore: keywordResults.matchScore,
              foundCount: keywordResults.faqs.length
            });
          }
        }
        
        return {
          faqs: [],
          topScore: 0,
          totalResults: 0
        };
      }

      // Step 3: Extract IDs from Pinecone results
      const faqIds = pineconeResults.map(result => result._id);
      logger.debug("Pinecone search returned IDs", { faqIds, count: faqIds.length });

      // Step 4: Fetch full FAQ details from MongoDB
      const faqs = await faqRepository.findByIds(faqIds);

      // Step 5: Filter by active status and map with scores
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

      // Step 6: If semantic scores are low, try keyword fallback
      // This works for both short queries and queries containing keywords
      const semanticThreshold = 0.3;
      // Get the raw top score from Pinecone results (before filtering)
      const rawTopScore = pineconeResults[0]?._score || 0;
      const topSemanticScore = activeFAQs[0]?._score || rawTopScore;
      
      logger.debug("Checking keyword fallback eligibility", {
        query,
        topSemanticScore,
        rawTopScore,
        activeFAQsCount: activeFAQs.length,
        threshold: semanticThreshold
      });
      
      if (topSemanticScore < semanticThreshold) {
        const { isShortQuery, findFAQsByKeywords, extractKeywords } = await import("../utils/faq-keyword-matcher.util.js");
        
        // Check if query contains keywords that might match FAQs
        const keywords = extractKeywords(query);
        const hasRelevantKeywords = keywords.length > 0;
        const isShort = isShortQuery(query);
        
        logger.debug("Keyword extraction results", {
          query,
          keywords,
          hasRelevantKeywords,
          isShort
        });
        
        // Try keyword fallback if:
        // 1. Query is short (1-2 words), OR
        // 2. Query contains relevant keywords (even if longer)
        if (isShort || hasRelevantKeywords) {
          logger.info("Semantic score low, trying keyword fallback", {
            query,
            semanticScore: topSemanticScore,
            rawTopScore,
            threshold: semanticThreshold,
            isShortQuery: isShort,
            hasKeywords: hasRelevantKeywords,
            keywords
          });
          
          // Get all active FAQs for keyword matching (not just from Pinecone results)
          const allActiveFAQs = await faqRepository.findActive();
          
          const keywordResults = findFAQsByKeywords(allActiveFAQs, query);
          
          logger.info("Keyword fallback results", {
            query,
            keywordScore: keywordResults.matchScore,
            foundCount: keywordResults.faqs.length,
            threshold: 0.2
          });
          
          // If keyword matching found results, use them (with adjusted score)
          // Lower threshold for keyword matches (0.2) since they're less precise than semantic
          if (keywordResults.faqs.length > 0 && keywordResults.matchScore >= 0.2) {
            logger.info("Keyword fallback found relevant FAQs", {
              query,
              keywordScore: keywordResults.matchScore,
              foundCount: keywordResults.faqs.length
            });
            
            // Return keyword-matched FAQs with adjusted score (0.4-0.5 range to indicate keyword match)
            const adjustedScore = Math.min(0.4 + (keywordResults.matchScore * 0.1), 0.5);
            
            // Track usage for top result
            const topKeywordFAQ = keywordResults.faqs[0];
            if (topKeywordFAQ && topKeywordFAQ._id) {
              await faqRepository.incrementUsage(topKeywordFAQ._id);
            }
            
            return {
              faqs: keywordResults.faqs.slice(0, topK), // Limit to topK
              topScore: adjustedScore,
              totalResults: keywordResults.faqs.length
            };
          } else {
            logger.info("Keyword fallback did not find relevant FAQs", {
              query,
              keywordScore: keywordResults.matchScore,
              foundCount: keywordResults.faqs.length,
              threshold: 0.2
            });
          }
        } else {
          logger.debug("Keyword fallback skipped - query is not short and has no relevant keywords", {
            query,
            isShort,
            hasRelevantKeywords,
            keywords
          });
        }
      } else {
        logger.debug("Keyword fallback skipped - semantic score is above threshold", {
          query,
          topSemanticScore,
          threshold: semanticThreshold
        });
      }

      // Step 7: Track usage for top result
      const topFAQ = activeFAQs[0];
      if (topFAQ && topFAQ._id) {
        await faqRepository.incrementUsage(topFAQ._id);
      }

      logger.info("FAQ search completed", {
        query,
        totalResults: activeFAQs.length,
        topScore: topFAQ?._score || 0
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
   * IMPORTANT: The AI should use this answer directly, especially for short answers
   */
  formatFAQForAI(faq: FAQ, language: 'en' | 'ar' = 'en'): string {
    const question = language === 'ar' && faq.question_ar 
      ? faq.question_ar 
      : faq.question;
    
    const answer = language === 'ar' && faq.answer_ar 
      ? faq.answer_ar 
      : faq.answer;

    // For very short answers (like phone numbers), use them directly
    // For longer answers, provide context
    const isShortAnswer = answer.length < 100;
    
    if (isShortAnswer) {
      // Direct answer format - AI should use this as-is
      if (faq.category) {
        return `FAQ Answer (${faq.category}): ${answer}`;
      }
      return `FAQ Answer: ${answer}`;
    }

    // Longer answers - provide context
    if (faq.category) {
      return `According to our ${faq.category} policy: ${answer}`;
    }

    return `Here's the answer: ${answer}`;
  }

  /**
   * Format multiple FAQs for AI response
   */
  formatMultipleFAQsForAI(faqs: FAQ[], language: 'en' | 'ar' = 'en'): string {
    if (faqs.length === 0) {
      return "";
    }

    if (faqs.length === 1 && faqs[0]) {
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
   * Combines question + answer into text field (includes both EN and AR for better semantic search)
   * Note: Pinecone index with llama-text-embed-v2 expects 'text' field in field mapping
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
    
    const text = parts.join(" ").trim();

    // Log what's being sent to Pinecone for verification
    logger.info("Preparing FAQ for Pinecone", {
      faqId: faq._id,
      hasEnglish: !!(faq.question && faq.answer),
      hasArabicQuestion: !!faq.question_ar,
      hasArabicAnswer: !!faq.answer_ar,
      textLength: text.length,
      textPreview: text.substring(0, 150) + (text.length > 150 ? "..." : "")
    });

    const record: FAQRecord = {
      _id: faq._id || "",
      text, // Pinecone index expects 'text' field (not 'content')
    };
    
    if (faq.category) {
      record.category = faq.category;
    }
    
    return record;
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

      if (results.faqs.length === 0 || results.topScore < minScore || !results.faqs[0]) {
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

