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
 * With timeout to prevent blocking
 */
export async function moderateContent(input: string): Promise<ContentModerationResult> {
  try {
    const openai = getOpenAIClient();
    
    // Add timeout to prevent blocking (5 seconds max)
    const moderationPromise = openai.moderations.create({
      input: input
    });
    
    const timeoutPromise = new Promise<ContentModerationResult>((resolve) => {
      setTimeout(() => {
        logger.warn("Content moderation timeout - allowing content");
        resolve({
          isSafe: true,
          flagged: false
        });
      }, 5000); // 5 second timeout
    });
    
    const moderation = await Promise.race([moderationPromise, timeoutPromise]);
    
    // If timeout won, return early
    if (!('results' in moderation)) {
      return moderation;
    }

    const result = (moderation as any).results[0];
    
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

