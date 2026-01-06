/**
 * Price Extractor Utility
 * Uses AI to extract price range from user queries
 * Handles phrases like "under 500", "below 1000", "between 300 and 800", etc.
 */

import { openaiService } from "../services/openai.service.js";
import { logger } from "./logger.js";

/**
 * Extract price range from user query using AI
 * Handles various price-related phrases and extracts min/max prices
 * 
 * @param query - User's search query
 * @returns Price range with min and max, or null if no price range detected
 */
export async function extractPriceRangeFromQuery(
  query: string
): Promise<{ minPrice?: number; maxPrice?: number } | null> {
  try {
    if (!query || query.trim().length === 0) {
      return null;
    }

    const prompt = `You are a helpful assistant that extracts price ranges from user queries about watches.

User query: "${query}"

Your task:
1. Identify if the user mentions a price range or price limit
2. Extract minimum and/or maximum price values
3. Return the prices as numbers (without currency symbols or text)
4. Return in JSON format: {"minPrice": number or null, "maxPrice": number or null}

Examples:
- "watches under 500 SAR" → {"minPrice": null, "maxPrice": 500}
- "watches below 1000" → {"minPrice": null, "maxPrice": 1000}
- "watches above 300" → {"minPrice": 300, "maxPrice": null}
- "watches between 300 and 800" → {"minPrice": 300, "maxPrice": 800}
- "watches from 500 to 1000" → {"minPrice": 500, "maxPrice": 1000}
- "cheap watches under 400" → {"minPrice": null, "maxPrice": 400}
- "show me watches" → {"minPrice": null, "maxPrice": null}
- "tommy hilfiger watches" → {"minPrice": null, "maxPrice": null}

Return ONLY valid JSON with minPrice and maxPrice (use null if not specified). Do not include any explanation or additional text.`;

    const messages = [
      {
        role: "user" as const,
        content: prompt
      }
    ];

    const result = await openaiService.chatCompletion(messages, {
      model: "gpt-4o-mini", // Use cheaper model for price extraction
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 50 // Very short response - just JSON
    });

    if (!result.success || !result.message) {
      logger.error("Price extraction failed", {
        error: result.error,
        query
      });
      return null;
    }

    const extractedText = result.message.trim();
    
    // Try to parse JSON response
    try {
      const priceRange = JSON.parse(extractedText);
      
      // Validate the response has the expected structure
      if (typeof priceRange !== 'object' || priceRange === null) {
        return null;
      }

      const minPrice = priceRange.minPrice !== null && priceRange.minPrice !== undefined 
        ? Number(priceRange.minPrice) 
        : undefined;
      const maxPrice = priceRange.maxPrice !== null && priceRange.maxPrice !== undefined 
        ? Number(priceRange.maxPrice) 
        : undefined;

      // Only return if at least one price was extracted
      if (minPrice === undefined && maxPrice === undefined) {
        logger.info("No price range detected in query", { query });
        return null;
      }

      // Validate prices are valid numbers
      if ((minPrice !== undefined && (isNaN(minPrice) || minPrice < 0)) ||
          (maxPrice !== undefined && (isNaN(maxPrice) || maxPrice < 0))) {
        logger.warn("Invalid price values extracted", {
          query,
          minPrice,
          maxPrice
        });
        return null;
      }

      // Validate minPrice <= maxPrice if both are present
      if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        logger.warn("minPrice > maxPrice, swapping values", {
          query,
          minPrice,
          maxPrice
        });
        return {
          minPrice: maxPrice,
          maxPrice: minPrice
        };
      }

      logger.info("Price range extracted successfully using AI", {
        query,
        minPrice,
        maxPrice
      });

      return {
        ...(minPrice !== undefined && { minPrice }),
        ...(maxPrice !== undefined && { maxPrice })
      };
    } catch (parseError) {
      logger.error("Failed to parse price extraction JSON", {
        error: parseError,
        query,
        extractedText
      });
      return null;
    }
  } catch (error: any) {
    logger.error("Error extracting price range from query", {
      error: error.message,
      query,
      stack: error.stack
    });
    return null;
  }
}

