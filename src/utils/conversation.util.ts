/**
 * Conversation Utility
 * Utilities for conversation tracking and management
 */

/**
 * Generate a unique conversation ID
 * Format: conv_{timestamp}_{random}
 */
export function generateConversationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `conv_${timestamp}_${random}`;
}

/**
 * Check if a new conversation should be started
 * A new conversation starts if:
 * - No recent messages in last 30 minutes (configurable)
 * - Or explicitly a new conversation
 */
export function shouldStartNewConversation(
  lastMessageTime: Date | null,
  conversationTimeoutMinutes: number = 30
): boolean {
  if (!lastMessageTime) {
    return true; // No previous messages, start new conversation
  }

  const now = new Date();
  const diffMs = now.getTime() - lastMessageTime.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes > conversationTimeoutMinutes;
}

