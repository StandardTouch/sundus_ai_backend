/**
 * Input Validation Guardrail
 * Validates and sanitizes user input
 */

import { logger } from "../utils/logger.js";

/**
 * Input validation result
 */
export interface InputValidationResult {
  isValid: boolean;
  sanitizedInput?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Input validation configuration
 */
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || "2000", 10);
const MIN_MESSAGE_LENGTH = 1;

/**
 * Validate and sanitize user input
 */
export function validateInput(input: string): InputValidationResult {
  const warnings: string[] = [];

  // Check if input is empty or only whitespace
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      error: "Message cannot be empty"
    };
  }

  // Check minimum length
  if (input.trim().length < MIN_MESSAGE_LENGTH) {
    return {
      isValid: false,
      error: "Message is too short"
    };
  }

  // Check maximum length
  if (input.length > MAX_MESSAGE_LENGTH) {
    return {
      isValid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`
    };
  }

  // Sanitize input
  let sanitized = input.trim();

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, " ");

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  // Warn if input was truncated
  if (sanitized.length < input.length) {
    warnings.push("Input was sanitized (removed control characters)");
  }

  const result: InputValidationResult = {
    isValid: true,
    sanitizedInput: sanitized
  };

  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}

