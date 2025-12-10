/**
 * Conversation Message Repository
 * Database operations for conversation messages
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { ConversationMessage, CreateConversationMessageDto } from "../models/conversation-message.model.js";
import { logger } from "../utils/logger.js";

export class ConversationMessageRepository {
  private getCollection() {
    return getDatabase().collection<ConversationMessage>("conversation_messages");
  }

  /**
   * Find message by message ID
   */
  async findByMessageId(messageId: string): Promise<ConversationMessage | null> {
    try {
      const message = await this.getCollection().findOne({ message_id: messageId });
      if (!message) return null;
      
      return {
        ...message,
        _id: fromObjectId(message._id as any)
      } as ConversationMessage;
    } catch (error) {
      logger.error("Conversation message repository findByMessageId error", { error, messageId });
      return null;
    }
  }

  /**
   * Get recent messages for a phone number (last N messages)
   */
  async getRecentMessages(
    phoneNumber: string,
    limit: number = 20
  ): Promise<ConversationMessage[]> {
    try {
      const messages = await this.getCollection()
        .find({ phone_number: phoneNumber })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return messages.map(msg => ({
        ...msg,
        _id: fromObjectId(msg._id as any)
      })) as ConversationMessage[];
    } catch (error) {
      logger.error("Conversation message repository getRecentMessages error", { error, phoneNumber, limit });
      return [];
    }
  }

  /**
   * Get messages around a specific message ID (for reply context)
   */
  async getMessagesAroundMessageId(
    phoneNumber: string,
    messageId: string,
    contextWindow: number = 5
  ): Promise<ConversationMessage[]> {
    try {
      // Find the target message
      const targetMessage = await this.findByMessageId(messageId);
      if (!targetMessage) {
        // Fallback to recent messages
        return this.getRecentMessages(phoneNumber, 8);
      }

      // Get messages before and after the target message
      const allMessages = await this.getCollection()
        .find({ phone_number: phoneNumber })
        .sort({ timestamp: 1 })
        .toArray();

      const targetIndex = allMessages.findIndex(msg => msg.message_id === messageId);
      if (targetIndex === -1) {
        return this.getRecentMessages(phoneNumber, 8);
      }

      // Get context window around target message
      const startIndex = Math.max(0, targetIndex - contextWindow);
      const endIndex = Math.min(allMessages.length, targetIndex + contextWindow + 1);
      
      const contextMessages = allMessages.slice(startIndex, endIndex);

      return contextMessages.map(msg => ({
        ...msg,
        _id: fromObjectId(msg._id as any)
      })) as ConversationMessage[];
    } catch (error) {
      logger.error("Conversation message repository getMessagesAroundMessageId error", { error, phoneNumber, messageId });
      return this.getRecentMessages(phoneNumber, 8);
    }
  }

  /**
   * Create a new conversation message
   */
  async create(createData: CreateConversationMessageDto): Promise<ConversationMessage> {
    try {
      const message: Omit<ConversationMessage, "_id"> & { _id?: any } = {
        ...createData,
        timestamp: new Date()
      };

      const result = await this.getCollection().insertOne(message as any);
      
      // Auto-cleanup: Keep only last 20 messages per user
      await this.cleanupOldMessages(createData.phone_number, 20);
      
      return {
        ...message,
        _id: fromObjectId(result.insertedId)
      } as ConversationMessage;
    } catch (error) {
      logger.error("Conversation message repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Cleanup old messages (keep only last N messages per user)
   */
  private async cleanupOldMessages(phoneNumber: string, keepCount: number): Promise<void> {
    try {
      const messages = await this.getCollection()
        .find({ phone_number: phoneNumber })
        .sort({ timestamp: -1 })
        .limit(keepCount + 1)
        .toArray();

      if (messages.length > keepCount) {
        const oldest = messages[messages.length - 1];
        await this.getCollection().deleteMany({
          phone_number: phoneNumber,
          timestamp: { $lt: oldest.timestamp }
        });
      }
    } catch (error) {
      logger.error("Conversation message repository cleanupOldMessages error", { error, phoneNumber, keepCount });
    }
  }

  /**
   * Delete all messages for a phone number
   */
  async deleteAllForPhoneNumber(phoneNumber: string): Promise<void> {
    try {
      await this.getCollection().deleteMany({ phone_number: phoneNumber });
    } catch (error) {
      logger.error("Conversation message repository deleteAllForPhoneNumber error", { error, phoneNumber });
      throw error;
    }
  }
}

export const conversationMessageRepository = new ConversationMessageRepository();

