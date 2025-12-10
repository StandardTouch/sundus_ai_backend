/**
 * Conversation Service
 * Manages conversation history and context building
 */

import { conversationMessageRepository } from "../repositories/conversation-message.repository.js";
import type { ConversationMessage, CreateConversationMessageDto } from "../models/conversation-message.model.js";
import type { ChatMessage } from "./openai.service.js";
import { logger } from "../utils/logger.js";
import { generateConversationId, shouldStartNewConversation } from "../utils/conversation.util.js";

/**
 * Conversation context options
 */
export interface ConversationContextOptions {
  includeRepliedToMessage?: boolean;
  contextWindow?: number;
  maxMessages?: number;
}

/**
 * Conversation Service
 * Handles conversation history management and context building
 */
export class ConversationService {
  /**
   * Get conversation history for OpenAI
   * Builds optimized context based on whether message is a reply or new message
   */
  async getConversationHistory(
    phoneNumber: string,
    currentMessage: string,
    repliedToMessageId?: string,
    options?: ConversationContextOptions
  ): Promise<ChatMessage[]> {
    try {
      let messages: ConversationMessage[] = [];

      // If this is a reply, get context around the replied-to message
      if (repliedToMessageId) {
        const contextWindow = options?.contextWindow || 5;
        messages = await conversationMessageRepository.getMessagesAroundMessageId(
          phoneNumber,
          repliedToMessageId,
          contextWindow
        );
        logger.info("Built reply-based context", {
          phoneNumber,
          repliedToMessageId,
          messageCount: messages.length
        });
      } else {
        // For new messages, get recent messages
        const maxMessages = options?.maxMessages || 8;
        messages = await conversationMessageRepository.getRecentMessages(
          phoneNumber,
          maxMessages
        );
        logger.info("Built recent message context", {
          phoneNumber,
          messageCount: messages.length
        });
      }

      // Convert to OpenAI chat format
      const chatMessages: ChatMessage[] = messages
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) // Sort chronologically
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      return chatMessages;
    } catch (error) {
      logger.error("Error building conversation history", { error, phoneNumber });
      return [];
    }
  }

  /**
   * Get or create conversation ID for a phone number
   */
  async getOrCreateConversationId(phoneNumber: string): Promise<string> {
    try {
      // Get the most recent message for this phone number
      const recentMessages = await conversationMessageRepository.getRecentMessages(phoneNumber, 1);
      const lastMessage = recentMessages[0];

      // Check if we should start a new conversation
      if (!lastMessage || shouldStartNewConversation(lastMessage.timestamp)) {
        return generateConversationId();
      }

      // Use existing conversation ID if available
      if (lastMessage.conversation_id) {
        return lastMessage.conversation_id;
      }

      // Generate new conversation ID if none exists
      return generateConversationId();
    } catch (error) {
      logger.error("Error getting conversation ID", { error, phoneNumber });
      return generateConversationId();
    }
  }

  /**
   * Store a user message
   */
  async storeUserMessage(
    phoneNumber: string,
    messageId: string,
    content: string,
    repliedToMessageId?: string,
    conversationId?: string
  ): Promise<ConversationMessage> {
    try {
      // Get or create conversation ID if not provided
      const convId = conversationId || await this.getOrCreateConversationId(phoneNumber);

      const messageData: CreateConversationMessageDto = {
        phone_number: phoneNumber,
        message_id: messageId,
        role: 'user',
        content,
        conversation_id: convId,
        replied_to_message_id: repliedToMessageId
      };

      const message = await conversationMessageRepository.create(messageData);
      logger.info("Stored user message", { phoneNumber, messageId, conversationId: convId });
      
      return message;
    } catch (error) {
      logger.error("Error storing user message", { error, phoneNumber, messageId });
      throw error;
    }
  }

  /**
   * Store an assistant message
   */
  async storeAssistantMessage(
    phoneNumber: string,
    messageId: string,
    content: string,
    metadata?: ConversationMessage['metadata'],
    conversationId?: string
  ): Promise<ConversationMessage> {
    try {
      // Get conversation ID from most recent message if not provided
      let convId = conversationId;
      if (!convId) {
        const recentMessages = await conversationMessageRepository.getRecentMessages(phoneNumber, 1);
        convId = recentMessages[0]?.conversation_id;
      }

      const messageData: CreateConversationMessageDto = {
        phone_number: phoneNumber,
        message_id: messageId,
        role: 'assistant',
        content,
        conversation_id: convId,
        metadata
      };

      const message = await conversationMessageRepository.create(messageData);
      logger.info("Stored assistant message", { phoneNumber, messageId, conversationId: convId });
      
      return message;
    } catch (error) {
      logger.error("Error storing assistant message", { error, phoneNumber, messageId });
      throw error;
    }
  }

  /**
   * Get recent messages for a phone number
   */
  async getRecentMessages(
    phoneNumber: string,
    limit: number = 20
  ): Promise<ConversationMessage[]> {
    return conversationMessageRepository.getRecentMessages(phoneNumber, limit);
  }
}

export const conversationService = new ConversationService();

