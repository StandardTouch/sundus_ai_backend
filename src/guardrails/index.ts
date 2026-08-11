/**
 * Guardrails Module
 * Main orchestrator for all guardrails
 */

import { validateInput, type InputValidationResult } from "./input-validation.guardrail.js";
import { detectPromptInjection, type PromptInjectionResult } from "./prompt-injection.guardrail.js";
import { moderateContent, type ContentModerationResult } from "./content-moderation.guardrail.js";
import { logger } from "../utils/logger.js";

/**
 * Guardrail processing result
 */
export interface GuardrailResult {
  passed: boolean;
  sanitizedInput?: string;
  error?: string;
  warnings?: string[];
  injectionDetected?: boolean;
  contentFlagged?: boolean;
}

import { detectLanguage } from "../utils/language.util.js";

/**
 * Process input through all guardrails
 */
export async function processGuardrails(input: string, userLanguage?: "ar" | "en"): Promise<GuardrailResult> {
  const lang = userLanguage || (input ? detectLanguage(input) : "en");
  const blockMsg = lang === "ar"
    ? "لا يمكنني معالجة هذا الطلب. كيف يمكنني مساعدتك بطريقة أخرى؟"
    : "I can't process that request. How else can I help you?";

  // Step 1: Input Validation
  const validation = validateInput(input, lang);
  if (!validation.isValid) {
    return {
      passed: false,
      error: validation.error
    };
  }

  const sanitizedInput = validation.sanitizedInput || input;
  const warnings: string[] = validation.warnings || [];

  // Step 2: Prompt Injection Detection
  const injectionCheck = detectPromptInjection(sanitizedInput);
  if (injectionCheck.isInjection) {
    logger.warn("Prompt injection blocked", {
      confidence: injectionCheck.confidence,
      originalLength: input.length,
      sanitizedLength: injectionCheck.sanitizedInput?.length
    });

    // For high-confidence injections, block completely
    if (injectionCheck.confidence === "high") {
      return {
        passed: false,
        error: blockMsg,
        injectionDetected: true
      };
    }

    // For medium/low confidence, use sanitized input
    if (injectionCheck.sanitizedInput && injectionCheck.sanitizedInput.length > 0) {
      warnings.push("Potentially suspicious input was sanitized");
    } else {
      // If sanitization removed everything, block
      return {
        passed: false,
        error: blockMsg,
        injectionDetected: true
      };
    }
  }

  // Step 3: Content Moderation
  const moderation = await moderateContent(injectionCheck.sanitizedInput || sanitizedInput);
  if (!moderation.isSafe) {
    logger.warn("Content moderation blocked message", {
      categories: moderation.categories
    });
    return {
      passed: false,
      error: blockMsg,
      contentFlagged: true
    };
  }

  return {
    passed: true,
    sanitizedInput: injectionCheck.sanitizedInput || sanitizedInput,
    warnings: warnings.length > 0 ? warnings : undefined,
    injectionDetected: injectionCheck.isInjection,
    contentFlagged: false
  };
}

/**
 * Quick check - just validation and injection detection (no moderation API call)
 * Use this for faster checks when moderation isn't critical
 */
export function quickGuardrailCheck(input: string, userLanguage?: "ar" | "en"): GuardrailResult {
  const lang = userLanguage || (input ? detectLanguage(input) : "en");
  const blockMsg = lang === "ar"
    ? "لا يمكنني معالجة هذا الطلب. كيف يمكنني مساعدتك بطريقة أخرى؟"
    : "I can't process that request. How else can I help you?";

  const validation = validateInput(input, lang);
  if (!validation.isValid) {
    return {
      passed: false,
      error: validation.error
    };
  }

  const sanitizedInput = validation.sanitizedInput || input;
  const injectionCheck = detectPromptInjection(sanitizedInput);

  if (injectionCheck.isInjection && injectionCheck.confidence === "high") {
    return {
      passed: false,
      error: blockMsg,
      injectionDetected: true
    };
  }

  return {
    passed: true,
    sanitizedInput: injectionCheck.sanitizedInput || sanitizedInput,
    injectionDetected: injectionCheck.isInjection
  };
}

