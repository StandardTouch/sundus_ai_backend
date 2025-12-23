/**
 * Translation Utility
 * Translates text between English and Arabic using OpenAI
 */

import { openaiService } from "../services/openai.service.js";
import { logger } from "./logger.js";
import { detectLanguage } from "./language.util.js";

/**
 * Translate text between English and Arabic
 * @param text - Text to translate
 * @param targetLanguage - Target language ('en' or 'ar')
 * @returns Translated text or original text if translation fails
 */
export async function translateText(
  text: string,
  targetLanguage: 'en' | 'ar'
): Promise<string> {
  try {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Detect source language
    const sourceLanguage = detectLanguage(text);
    
    // If already in target language, return as is
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    logger.info("Translating text", {
      sourceLanguage,
      targetLanguage,
      textLength: text.length
    });

    // Create translation prompt
    const translationPrompt = targetLanguage === 'ar'
      ? `Translate the following English text to Arabic. Return only the translation, no explanations or additional text:\n\n${text}`
      : `Translate the following Arabic text to English. Return only the translation, no explanations or additional text:\n\n${text}`;

    const messages = [
      {
        role: "user" as const,
        content: translationPrompt
      }
    ];

    const result = await openaiService.chatCompletion(messages, {
      model: "gpt-4o-mini", // Use cheaper model for translations
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 500
    });

    if (!result.success || !result.message) {
      logger.error("Translation failed", {
        error: result.error,
        text,
        targetLanguage
      });
      return text; // Return original text if translation fails
    }

    const translatedText = result.message.trim();
    
    logger.info("Translation successful", {
      sourceLanguage,
      targetLanguage,
      originalLength: text.length,
      translatedLength: translatedText.length
    });

    return translatedText;
  } catch (error: any) {
    logger.error("Translation error", {
      error: error.message,
      text,
      targetLanguage
    });
    return text; // Return original text on error
  }
}

/**
 * Translate question to both languages
 * @param question - Original question
 * @returns Object with both English and Arabic versions
 */
export async function translateQuestionBothWays(
  question: string
): Promise<{ question: string; question_ar?: string }> {
  try {
    const sourceLanguage = detectLanguage(question);
    
    if (sourceLanguage === 'ar') {
      // Question is in Arabic, translate to English
      const questionEn = await translateText(question, 'en');
      return {
        question: questionEn,
        question_ar: question
      };
    } else {
      // Question is in English, translate to Arabic
      const questionAr = await translateText(question, 'ar');
      return {
        question: question,
        question_ar: questionAr
      };
    }
  } catch (error: any) {
    logger.error("Error translating question both ways", {
      error: error.message,
      question
    });
    // Fallback: return original question in detected language
    const sourceLanguage = detectLanguage(question);
    if (sourceLanguage === 'ar') {
      return {
        question: question, // Keep original as English (will need manual translation)
        question_ar: question
      };
    } else {
      return {
        question: question,
        question_ar: undefined // Will need manual translation
      };
    }
  }
}

