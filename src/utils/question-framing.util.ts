/**
 * Question Framing Utility
 * Reframes user queries into proper FAQ question format using OpenAI
 */

import { openaiService } from "../services/openai.service.js";
import { logger } from "./logger.js";
import { detectLanguage } from "./language.util.js";

/**
 * Reframe a user query into a proper FAQ question format
 * Examples:
 * - "guarantees on watches" -> "Do you provide guarantees on watches?"
 * - "return policy" -> "What is your return policy?"
 * - "shipping time" -> "How long does shipping take?"
 */
export async function reframeAsFAQQuestion(query: string): Promise<string | null> {
  try {
    if (!query || query.trim().length === 0) {
      return null;
    }

    const language = detectLanguage(query);
    const isArabic = language === 'ar';

    // System prompt for reframing
    const systemPrompt = isArabic
      ? `أنت مساعد ذكي. مهمتك هي تحويل استفسارات المستخدم إلى أسئلة FAQ مناسبة وصحيحة.

القواعد:
1. حوّل الاستفسار إلى سؤال كامل ومفهوم
2. استخدم صيغة السؤال المناسبة (مثل: "هل...؟"، "ما هو...؟"، "كيف...؟")
3. احتفظ بالمعنى الأصلي
4. اجعل السؤال واضحًا ومهنيًا
5. أعد فقط السؤال المُعاد صياغته، بدون أي نص إضافي

أمثلة:
- "ضمانات على الساعات" -> "هل تقدمون ضمانات على الساعات؟"
- "سياسة الإرجاع" -> "ما هي سياسة الإرجاع الخاصة بكم؟"
- "وقت الشحن" -> "كم يستغرق الشحن؟"`
      : `You are a smart assistant. Your task is to convert user queries into proper, well-formed FAQ questions.

Rules:
1. Convert the query into a complete, understandable question
2. Use appropriate question format (e.g., "Do you...?", "What is...?", "How...?")
3. Preserve the original meaning
4. Make the question clear and professional
5. Return ONLY the reframed question, no additional text

Examples:
- "guarantees on watches" -> "Do you provide guarantees on watches?"
- "return policy" -> "What is your return policy?"
- "shipping time" -> "How long does shipping take?"
- "track order" -> "How can I track my order?"`;

    const userPrompt = isArabic
      ? `حوّل الاستفسار التالي إلى سؤال FAQ مناسب:\n\n"${query}"`
      : `Reframe the following query into a proper FAQ question:\n\n"${query}"`;

    logger.info("Reframing question as FAQ", {
      originalQuery: query,
      language
    });

    const result = await openaiService.generateResponse(
      userPrompt,
      systemPrompt,
      [],
      {
        model: "gpt-4o-mini", // Use cheaper model for this task
        temperature: 0.3, // Lower temperature for more consistent formatting
        max_tokens: 100
      }
    );

    if (!result.success || !result.message) {
      logger.warn("Failed to reframe question", {
        query,
        error: result.error
      });
      return null;
    }

    // Clean up the response (remove quotes, extra whitespace, etc.)
    let reframedQuestion = result.message.trim();
    
    // Remove surrounding quotes if present
    if (
      (reframedQuestion.startsWith('"') && reframedQuestion.endsWith('"')) ||
      (reframedQuestion.startsWith("'") && reframedQuestion.endsWith("'"))
    ) {
      reframedQuestion = reframedQuestion.slice(1, -1).trim();
    }

    // Ensure it ends with a question mark (for English) or Arabic question mark
    if (isArabic) {
      if (!reframedQuestion.endsWith('؟') && !reframedQuestion.endsWith('?')) {
        reframedQuestion += '؟';
      }
    } else {
      if (!reframedQuestion.endsWith('?')) {
        reframedQuestion += '?';
      }
    }

    logger.info("Question reframed successfully", {
      originalQuery: query,
      reframedQuestion,
      language
    });

    return reframedQuestion;
  } catch (error: any) {
    logger.error("Error reframing question", {
      error: error.message,
      query,
      stack: error.stack
    });
    return null; // Return null on error - will fall back to original query
  }
}

/**
 * Reframe question in both languages (English and Arabic)
 * First reframes in source language, then translates the reframed version
 */
export async function reframeQuestionBothWays(query: string): Promise<{
  question: string | null;
  question_ar: string | null;
}> {
  try {
    const sourceLanguage = detectLanguage(query);
    
    // Step 1: Reframe in source language first
    const reframedSource = await reframeAsFAQQuestion(query);
    
    if (!reframedSource) {
      // If reframing fails, return original in detected language
      logger.warn("Failed to reframe question, using original", { query });
      return {
        question: sourceLanguage === 'en' ? query : null,
        question_ar: sourceLanguage === 'ar' ? query : null
      };
    }

    // Step 2: Translate the reframed question to the other language
    const { translateText } = await import('./translation.util.js');
    
    if (sourceLanguage === 'en') {
      // Source is English: reframedSource is English, translate to Arabic
      const translatedAr = await translateText(reframedSource, 'ar');
      
      return {
        question: reframedSource, // English reframed question
        question_ar: translatedAr || null // Arabic translation
      };
    } else {
      // Source is Arabic: reframedSource is Arabic, translate to English
      const translatedEn = await translateText(reframedSource, 'en');
      
      return {
        question: translatedEn || null, // English translation
        question_ar: reframedSource // Arabic reframed question
      };
    }
  } catch (error: any) {
    logger.error("Error reframing question both ways", {
      error: error.message,
      query,
      stack: error.stack
    });
    // Fallback: return original query in detected language
    const sourceLanguage = detectLanguage(query);
    return {
      question: sourceLanguage === 'en' ? query : null,
      question_ar: sourceLanguage === 'ar' ? query : null
    };
  }
}

