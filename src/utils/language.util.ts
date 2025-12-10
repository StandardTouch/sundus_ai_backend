/**
 * Language Detection Utility
 * Detects if text is in Arabic or English
 */

/**
 * Detect if text contains Arabic characters
 * Arabic Unicode range: \u0600-\u06FF
 */
export function isArabic(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Arabic Unicode ranges
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  // Count Arabic characters
  const arabicCharCount = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const totalCharCount = text.replace(/\s/g, '').length;
  
  // If more than 30% of characters are Arabic, consider it Arabic
  if (totalCharCount === 0) return false;
  
  const arabicRatio = arabicCharCount / totalCharCount;
  
  return arabicPattern.test(text) && arabicRatio > 0.3;
}

/**
 * Detect language of text (returns 'ar' or 'en')
 */
export function detectLanguage(text: string): 'ar' | 'en' {
  return isArabic(text) ? 'ar' : 'en';
}

