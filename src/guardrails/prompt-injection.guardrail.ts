/**
 * Prompt Injection Guardrail
 * Detects and prevents prompt injection attacks
 */

import { logger } from "../utils/logger.js";

/**
 * Prompt injection detection result
 */
export interface PromptInjectionResult {
  isInjection: boolean;
  confidence: "low" | "medium" | "high";
  sanitizedInput?: string;
  detectedPatterns?: string[];
}

/**
 * Common prompt injection patterns
 */
const INJECTION_PATTERNS = [
  // Direct instruction overrides
  /ignore\s+(all\s+)?(previous|prior|earlier|above|before)\s+(instructions?|prompts?|commands?|directives?)/gi,
  /forget\s+(all\s+)?(previous|prior|earlier|above|before)\s+(instructions?|prompts?|commands?)/gi,
  /disregard\s+(all\s+)?(previous|prior|earlier|above|before)\s+(instructions?|prompts?|commands?)/gi,
  /override\s+(all\s+)?(previous|prior|earlier|above|before)\s+(instructions?|prompts?|commands?)/gi,
  
  // System prompt extraction attempts
  /(what|tell|show|reveal|display|list|repeat|copy|print)\s+(are|is|was|were)\s+(your|the)\s+(system\s+)?(prompt|instructions?|directives?|commands?|rules?|guidelines?)/gi,
  /(what|tell|show|reveal|display|list|repeat|copy|print)\s+(your|the)\s+(original|initial|starting|first)\s+(system\s+)?(prompt|instructions?|directives?|commands?)/gi,
  /repeat\s+(everything|all|the)\s+(you\s+)?(were\s+)?(told|instructed|said|given)/gi,
  
  // Role manipulation
  /you\s+(are|will\s+be|must\s+be|should\s+be)\s+(no\s+longer|not)\s+/gi,
  /you\s+(are|will\s+be|must\s+be|should\s+be)\s+(now|currently)\s+/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an)\s+/gi,
  /pretend\s+(you\s+are\s+)?(to\s+be\s+)?(a|an)\s+/gi,
  
  // Instruction following
  /follow\s+(these|the|my|this)\s+(new\s+)?(instructions?|rules?|commands?)/gi,
  /execute\s+(these|the|my|this)\s+(instructions?|commands?|directives?)/gi,
  
  // Special markers
  /<\|.*?\|>/g,
  /\[INST\].*?\[\/INST\]/gi,
  /<\|im_start\|>.*?<\|im_end\|>/gi,
];

/**
 * High-confidence injection patterns (definitely malicious)
 */
const HIGH_CONFIDENCE_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /forget\s+(all\s+)?previous\s+instructions/gi,
  /what\s+are\s+your\s+system\s+prompts?/gi,
  /reveal\s+(your|the)\s+system\s+prompt/gi,
  /you\s+are\s+no\s+longer/gi,
];

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(input: string): PromptInjectionResult {
  const detectedPatterns: string[] = [];
  let confidence: "low" | "medium" | "high" = "low";
  let matchCount = 0;

  // Check high-confidence patterns first
  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
      matchCount++;
      confidence = "high";
    }
  }

  // Check all patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      if (!detectedPatterns.includes(pattern.source)) {
        detectedPatterns.push(pattern.source);
        matchCount++;
      }
    }
  }

  // Determine confidence level
  if (matchCount === 0) {
    return {
      isInjection: false,
      confidence: "low"
    };
  }

  if (confidence !== "high") {
    if (matchCount >= 2) {
      confidence = "high";
    } else if (matchCount === 1) {
      confidence = "medium";
    }
  }

  // Sanitize input by removing injection patterns
  let sanitized = input;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  sanitized = sanitized.trim().replace(/\s+/g, " ");

  logger.warn("Prompt injection detected", {
    confidence,
    matchCount,
    detectedPatterns: detectedPatterns.slice(0, 3) // Log first 3 patterns
  });

  return {
    isInjection: true,
    confidence,
    sanitizedInput: sanitized,
    detectedPatterns
  };
}

