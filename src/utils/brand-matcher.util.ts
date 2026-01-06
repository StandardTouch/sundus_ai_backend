/**
 * Brand Matcher Utility
 * Fuzzy matching for brand names to handle spelling mistakes
 */

import { logger } from "./logger.js";

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

/**
 * Find best matching brand using fuzzy matching
 * Handles spelling mistakes like "hilifiger" -> "Hilfiger"
 * 
 * @param query - User's search query
 * @param brands - Array of available brands
 * @returns Best matching brand or null if no good match found
 */
export function findBestBrandMatch(
  query: string,
  brands: Array<{ id: number; name: string; img?: string }>
): { brand: { id: number; name: string; img?: string }; matchedName: string; score: number } | null {
  if (!query || !brands || brands.length === 0) {
    return null;
  }

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 3); // Only words 3+ chars

  let bestMatch: { brand: { id: number; name: string; img?: string }; matchedName: string; score: number } | null = null;
  let bestScore = 0;

  for (const brand of brands) {
    const brandLower = brand.name.toLowerCase();
    const brandWords = brandLower.split(/\s+/);

    // First, try exact match or contains match (highest priority)
    if (queryLower.includes(brandLower) || brandLower.includes(queryLower)) {
      const score = queryLower === brandLower ? 1.0 : 0.9;
      if (score > bestScore) {
        bestMatch = { brand, matchedName: brand.name, score };
        bestScore = score;
      }
      continue;
    }

    // Try matching individual words (for "Tommy Hilfiger" matching "tommy hilifiger")
    for (const queryWord of queryWords) {
      for (const brandWord of brandWords) {
        // Exact word match
        if (queryWord === brandWord) {
          const score = 0.85;
          if (score > bestScore) {
            bestMatch = { brand, matchedName: brand.name, score };
            bestScore = score;
          }
          continue;
        }

        // Fuzzy match for spelling mistakes
        const similarity = similarityScore(queryWord, brandWord);
        
        // If similarity is high enough (>= 0.7), consider it a match
        // This handles "hilifiger" -> "hilfiger" (similarity ~0.85)
        if (similarity >= 0.7) {
          if (similarity > bestScore) {
            bestMatch = { brand, matchedName: brand.name, score: similarity };
            bestScore = similarity;
          }
        }
      }
    }

    // Also try fuzzy matching the full brand name
    const fullSimilarity = similarityScore(queryLower, brandLower);
    if (fullSimilarity >= 0.7 && fullSimilarity > bestScore) {
      bestMatch = { brand, matchedName: brand.name, score: fullSimilarity };
      bestScore = fullSimilarity;
    }
  }

  // Only return if we have a good match (score >= 0.7)
  if (bestMatch && bestScore >= 0.7) {
    logger.info("Brand fuzzy match found", {
      query,
      matchedBrand: bestMatch.matchedName,
      score: bestScore,
      originalBrand: bestMatch.brand.name
    });
    return bestMatch;
  }

  logger.info("No good brand match found", {
    query,
    bestScore,
    threshold: 0.7
  });

  return null;
}

