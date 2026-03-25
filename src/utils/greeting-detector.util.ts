/**
 * Greeting Detector Utility
 * Identifies if a message is a simple greeting to avoid redundant processing acknowledgments.
 */

const GREETINGS = [
  // English
  "hi", "hello", "hey", "hola", "hi there", "hello there", "good morning", "good evening", "howdy", "morning", "evening",
  // Arabic
  "سلام", "هلا", "مرحبا", "حياك", "أهلا", "أهلين", "صباح الخير", "مساء الخير", "السلام عليكم", "يا هلا"
];

/**
 * Check if the message is a simple greeting
 */
export function isGreeting(text: string): boolean {
  if (!text) return false;
  
  // Remove punctuation and normalize
  const normalized = text.toLowerCase().trim().replace(/[?!.,]/g, "");
  
  // 1. Exact match for common greetings
  if (GREETINGS.includes(normalized)) {
    return true;
  }
  
  // 2. Check for "starts with" greeting if message is very short
  const words = normalized.split(/\s+/);
  if (words.length <= 2) {
    const firstWord = words[0];
    if (firstWord && GREETINGS.includes(firstWord) && words.length === 1) {
      return true;
    }
  }
  
  return false;
}
