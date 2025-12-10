/**
 * Content Moderation Guardrail
 * Uses OpenAI Moderation API to check for harmful content
 */

import { getOpenAIClient } from "../config/openai.config.js";
import { logger } from "../utils/logger.js";

/**
 * Content moderation result
 */
export interface ContentModerationResult {
  isSafe: boolean;
  flagged: boolean;
  categories?: {
    hate: boolean;
    "hate/threatening": boolean;
    harassment: boolean;
    "harassment/threatening": boolean;
    self_harm: boolean;
    "self_harm/intent": boolean;
    "self_harm/instructions": boolean;
    sexual: boolean;
    "sexual/minors": boolean;
    violence: boolean;
    "violence/graphic": boolean;
  };
  categoryScores?: Record<string, number>;
}

/**
 * Check content using OpenAI Moderation API
 */
export async function moderateContent(input: string): Promise<ContentModerationResult> {
  try {
    const openai = getOpenAIClient();
    
    const moderation = await openai.moderations.create({
      input: input
    });

    const result = moderation.results[0];
    
    if (result.flagged) {
      logger.warn("Content moderation flagged message", {
        categories: result.categories,
        categoryScores: result.category_scores
      });
    }

    return {
      isSafe: !result.flagged,
      flagged: result.flagged,
      categories: result.categories as any,
      categoryScores: result.category_scores as any
    };
  } catch (error) {
    logger.error("Content moderation error", { error });
    // Fail open - allow content if moderation fails
    // You might want to change this to fail closed in production
    return {
      isSafe: true,
      flagged: false
    };
  }
}

