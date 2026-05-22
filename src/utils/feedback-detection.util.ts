/**
 * Feedback Detection Utility
 * Determines when to send feedback templates based on tool results and AI responses
 */

import { logger } from "./logger.js";

/**
 * Tool result metadata with feedback flag
 */
export interface ToolResultWithFeedback {
  should_send_feedback?: boolean;
  [key: string]: any;
}

/**
 * Check if AI response indicates task completion or cannot help
 * Returns true if feedback should be sent
 */
// Completion indicators (task successfully completed)
const COMPLETION_REGEX = /found.*product|here are.*product|product.*details|product.*image|product.*card|order.*status|order.*details|order.*tracking|your order|order number|according to|here.*answer|policy.*is|warranty.*is|return.*policy|here.*information|details.*below|as requested|i found|i've found/i;

// "Cannot help" indicators (task failed but conversation complete)
const CANNOT_HELP_REGEX = /i couldn't find|i can't find|i don't have|unable to help|cannot help|not available|no.*found|couldn't find|don't have.*information|i don't have that|we don't have|not in.*catalog|not available.*moment/i;

// Continuation indicators (conversation still active - don't send feedback)
const CONTINUATION_REGEX = /what.*else|anything else|how can i help|can i help|do you need|would you like|tell me more|provide.*more|give me more|more information|more details|clarify|specify|which.*do you|what.*prefer/i;

/**
 * Check if AI response indicates task completion or cannot help
 * Returns true if feedback should be sent
 */
export function shouldSendFeedbackFromAIResponse(aiResponse: string): boolean {
  if (!aiResponse || aiResponse.trim().length === 0) {
    return false;
  }

  const response = aiResponse.toLowerCase();

  // Check for continuation phrases first (highest priority)
  if (CONTINUATION_REGEX.test(response)) {
    logger.info("AI response indicates continuation - skipping feedback", {
      responsePreview: aiResponse.substring(0, 100)
    });
    return false;
  }

  // Check for completion phrases
  if (COMPLETION_REGEX.test(response)) {
    logger.info("AI response indicates completion - should send feedback", {
      responsePreview: aiResponse.substring(0, 100)
    });
    return true;
  }

  // Check for "cannot help" phrases
  if (CANNOT_HELP_REGEX.test(response)) {
    logger.info("AI response indicates cannot help - should send feedback", {
      responsePreview: aiResponse.substring(0, 100)
    });
    return true;
  }

  // Default: don't send feedback if no clear indicators
  logger.info("AI response has no clear completion indicators - skipping feedback", {
    responsePreview: aiResponse.substring(0, 100)
  });
  return false;
}

/**
 * Check if feedback was sent recently (within last N minutes)
 * Prevents spam by not sending feedback too frequently
 */
export function wasFeedbackSentRecently(
  lastFeedbackTimestamp: Date | null | undefined,
  minutesThreshold: number = 3
): boolean {
  if (!lastFeedbackTimestamp) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - lastFeedbackTimestamp.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes < minutesThreshold;
}

