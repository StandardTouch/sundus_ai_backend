/**
 * Brand Extractor Utility
 * Uses AI to understand and extract brand names from user queries
 * Handles spelling mistakes, variations, and context understanding
 */

import { openaiService } from "../services/openai.service.js";
import { logger } from "./logger.js";

/**
 * Extract brand name from user query using AI
 * This handles spelling mistakes, variations, and understands context
 * 
 * @param query - User's search query
 * @param availableBrands - List of available brands in the catalog
 * @returns Extracted brand with ID and name, or null if no brand detected
 */
export async function extractBrandFromQuery(
  query: string,
  availableBrands: Array<{ id: number; name: string; img?: string }>
): Promise<{ brandId: number; brandName: string; originalQuery: string } | null> {
  try {
    if (!query || query.trim().length === 0) {
      return null;
    }

    // Create a list of available brands for the AI
    const brandList = availableBrands.map(b => b.name).join(", ");

    const prompt = `You are a helpful assistant that extracts brand names from user queries about watches.

Available brands in the catalog: ${brandList}

User query: "${query}"

Your task:
1. Identify if the user is asking about a specific watch brand
2. If yes, extract the brand name and correct any spelling mistakes
3. Match it to one of the available brands listed above (handle variations and misspellings)
4. Return ONLY the corrected brand name that matches one from the list, or "NONE" if no brand is mentioned or doesn't match any available brand

Examples:
- "tommy hilifiger watches" → "Tommy Hilfiger"
- "show me nike watches" → "Nike"
- "lacoste watch" → "Lacoste"
- "show me watches" → "NONE"
- "what brands do you have" → "NONE"

Return ONLY the brand name (exactly as it appears in the available brands list) or "NONE". Do not include any explanation or additional text.`;

    const messages = [
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const result = await openaiService.chatCompletion(messages, {
      model: "gpt-4o-mini", // Use cheaper model for brand extraction
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 50 // Very short response - just brand name
    });

    if (!result.success || !result.message) {
      logger.error("Brand extraction failed", {
        error: result.error,
        query
      });
      return null;
    }

    const extractedBrand = result.message.trim();

    // Check if AI returned "NONE" or empty
    if (!extractedBrand || extractedBrand.toLowerCase() === "none" || extractedBrand.toLowerCase() === "n/a") {
      logger.info("No brand detected in query", { query });
      return null;
    }

    // Verify the extracted brand exists in available brands (case-insensitive)
    const matchedBrand = availableBrands.find(b => 
      b.name.toLowerCase() === extractedBrand.toLowerCase()
    );

    if (!matchedBrand) {
      logger.warn("AI extracted brand not found in available brands", {
        query,
        extractedBrand,
        availableBrands: availableBrands.map(b => b.name)
      });
      return null;
    }

    logger.info("Brand extracted successfully using AI", {
      query,
      extractedBrand: matchedBrand.name,
      brandId: matchedBrand.id,
      originalQuery: query
    });

    return {
      brandId: matchedBrand.id,
      brandName: matchedBrand.name,
      originalQuery: query
    };
  } catch (error: any) {
    logger.error("Error extracting brand from query", {
      error: error.message,
      query,
      stack: error.stack
    });
    return null;
  }
}

