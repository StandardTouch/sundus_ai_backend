/**
 * FAQ Keyword Matcher Utility
 * Provides keyword-based fallback matching for FAQs when semantic search scores are low
 * but the query is clearly related to an FAQ topic
 */

import { logger } from "./logger.js";
import type { FAQ } from "../models/faq.model.js";

/**
 * Common keyword expansions for better matching
 * Maps single words to related terms that should match FAQs
 */
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  warranty: ["warranty", "warranty policy", "warranty information", "warranty claim", "warranty coverage"],
  refund: ["refund", "refund policy", "refund request", "return refund", "money back"],
  return: ["return", "return policy", "return item", "return product", "send back"],
  shipping: ["shipping", "shipping policy", "delivery", "shipping time", "shipping cost"],
  payment: ["payment", "payment method", "payment option", "how to pay", "pay"],
  order: ["order", "order status", "track order", "my order", "order tracking"],
  product: ["product", "products", "item", "items", "catalog"],
  policy: ["policy", "policies", "terms", "rules"],
};

/**
 * Extract keywords from a query
 * Exported for use in FAQ service
 */
export function extractKeywords(query: string): string[] {
  // Normalize: lowercase, remove punctuation, split by spaces
  const normalized = query.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = normalized.split(/\s+/).filter(w => w.length > 2); // Filter out very short words
  
  // Expand keywords using expansion map
  const expanded: string[] = [];
  for (const word of words) {
    expanded.push(word);
    if (KEYWORD_EXPANSIONS[word]) {
      expanded.push(...KEYWORD_EXPANSIONS[word]);
    }
  }
  
  return [...new Set(expanded)]; // Remove duplicates
}

/**
 * Check if FAQ matches keywords
 * Returns a match score (0-1) based on keyword presence
 */
function calculateKeywordMatchScore(faq: FAQ, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  
  const faqText = [
    faq.question?.toLowerCase() || "",
    faq.question_ar || "",
    faq.answer?.toLowerCase() || "",
    faq.answer_ar || "",
    faq.category?.toLowerCase() || "",
  ].join(" ").toLowerCase();
  
  let matchCount = 0;
  let totalWeight = 0;
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    const weight = keyword.length > 5 ? 1.5 : 1.0; // Longer keywords are more specific
    
    // Check if keyword appears in FAQ text
    if (faqText.includes(keywordLower)) {
      matchCount += weight;
      
      // Bonus if keyword appears in question (more relevant)
      if (faq.question?.toLowerCase().includes(keywordLower)) {
        matchCount += 0.5;
      }
      
      // Bonus if keyword matches category
      if (faq.category?.toLowerCase() === keywordLower) {
        matchCount += 1.0;
      }
    }
    
    totalWeight += weight;
  }
  
  // Normalize score to 0-1 range
  // If all keywords match, score should be high (0.7-0.9)
  // If some match, score should be moderate (0.3-0.6)
  const rawScore = matchCount / totalWeight;
  return Math.min(rawScore * 1.2, 0.9); // Cap at 0.9 for keyword matches
}

/**
 * Find FAQs by keyword matching (fallback when semantic search fails)
 */
export function findFAQsByKeywords(
  faqs: FAQ[],
  query: string
): { faqs: FAQ[]; matchScore: number } {
  const keywords = extractKeywords(query);
  
  if (keywords.length === 0) {
    return { faqs: [], matchScore: 0 };
  }
  
  logger.debug("Keyword matching", { query, keywords, faqsCount: faqs.length });
  
  // Calculate keyword match scores for all FAQs
  const faqsWithScores = faqs
    .filter((faq): faq is FAQ & { _id: string } => !!faq._id) // Only process FAQs with valid IDs
    .map(faq => ({
      faq,
      score: calculateKeywordMatchScore(faq, keywords)
    }));
  
  // Filter FAQs with meaningful keyword matches (score > 0.2)
  // This is lower than semantic threshold because keyword matching is less precise
  const KEYWORD_MATCH_THRESHOLD = 0.2;
  const matchedFAQs = faqsWithScores
    .filter(({ score }) => score >= KEYWORD_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .map(({ faq }) => faq);
  
  const topScore = faqsWithScores.length > 0 
    ? Math.max(...faqsWithScores.map(({ score }) => score))
    : 0;
  
  logger.info("Keyword matching results", {
    query,
    keywords,
    matchedCount: matchedFAQs.length,
    topScore,
    threshold: KEYWORD_MATCH_THRESHOLD
  });
  
  return {
    faqs: matchedFAQs,
    matchScore: topScore
  };
}

/**
 * Check if query is a single word or very short
 */
export function isShortQuery(query: string): boolean {
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length <= 2; // Single word or two words
}

/**
 * Expand short queries with related terms for better semantic matching
 */
export function expandQuery(query: string): string {
  const words = query.toLowerCase().trim().split(/\s+/);
  
  // If single word, try to expand it
  if (words.length === 1) {
    const word = words[0];
    if (word && KEYWORD_EXPANSIONS[word]) {
      // Use the first expansion (most relevant)
      const expanded = KEYWORD_EXPANSIONS[word][0];
      if (expanded) {
        logger.debug("Expanding query", { original: query, expanded });
        return expanded;
      }
    }
  }
  
  return query; // Return original if no expansion available
}

