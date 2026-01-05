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
export function shouldSendFeedbackFromAIResponse(aiResponse: string): boolean {
  if (!aiResponse || aiResponse.trim().length === 0) {
    return false;
  }

  const response = aiResponse.toLowerCase();

  // Completion indicators (task successfully completed)
  const completionPhrases = [
    // Product-related
    "found.*product",
    "here are.*product",
    "product.*details",
    "product.*image",
    "product.*card",
    
    // Order-related
    "order.*status",
    "order.*details",
    "order.*tracking",
    "your order",
    "order number",
    
    // FAQ-related
    "according to",
    "here.*answer",
    "policy.*is",
    "warranty.*is",
    "return.*policy",
    
    // General completion
    "here.*information",
    "details.*below",
    "as requested",
    "i found",
    "i've found",
  ];

  // "Cannot help" indicators (task failed but conversation complete)
  const cannotHelpPhrases = [
    "i couldn't find",
    "i can't find",
    "i don't have",
    "unable to help",
    "cannot help",
    "not available",
    "no.*found",
    "couldn't find",
    "don't have.*information",
    "i don't have that",
    "we don't have",
    "not in.*catalog",
    "not available.*moment",
  ];

  // Continuation indicators (conversation still active - don't send feedback)
  const continuationPhrases = [
    "what.*else",
    "anything else",
    "how can i help",
    "can i help",
    "do you need",
    "would you like",
    "tell me more",
    "provide.*more",
    "give me more",
    "more information",
    "more details",
    "clarify",
    "specify",
    "which.*do you",
    "what.*prefer",
  ];

  // Check for continuation phrases first (highest priority)
  for (const phrase of continuationPhrases) {
    const regex = new RegExp(phrase, "i");
    if (regex.test(response)) {
      logger.info("AI response indicates continuation - skipping feedback", {
        phrase,
        responsePreview: aiResponse.substring(0, 100)
      });
      return false;
    }
  }

  // Check for completion phrases
  for (const phrase of completionPhrases) {
    const regex = new RegExp(phrase, "i");
    if (regex.test(response)) {
      logger.info("AI response indicates completion - should send feedback", {
        phrase,
        responsePreview: aiResponse.substring(0, 100)
      });
      return true;
    }
  }

  // Check for "cannot help" phrases
  for (const phrase of cannotHelpPhrases) {
    const regex = new RegExp(phrase, "i");
    if (regex.test(response)) {
      logger.info("AI response indicates cannot help - should send feedback", {
        phrase,
        responsePreview: aiResponse.substring(0, 100)
      });
      return true;
    }
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

