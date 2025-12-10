/**
 * Feedback Repository
 * MongoDB operations for feedback collection
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { Feedback, CreateFeedbackDto } from "../models/feedback.model.js";
import { logger } from "../utils/logger.js";

/**
 * Feedback Repository
 */
export class FeedbackRepository {
  private getCollection() {
    return getDatabase().collection<Feedback>("feedback");
  }

  /**
   * Create feedback
   */
  async create(data: CreateFeedbackDto): Promise<Feedback> {
    try {
      const feedbackData: Omit<Feedback, "_id"> = {
        ...data,
        created_at: new Date()
      };

      const result = await this.getCollection().insertOne(feedbackData as any);
      
      return {
        ...feedbackData,
        _id: fromObjectId(result.insertedId)
      } as Feedback;
    } catch (error) {
      logger.error("Feedback repository create error", { error, data });
      throw error;
    }
  }

  /**
   * Find feedback by message ID
   */
  async findByMessageId(messageId: string): Promise<Feedback | null> {
    try {
      const feedback = await this.getCollection().findOne({ message_id: messageId });
      if (!feedback) return null;
      
      return {
        ...feedback,
        _id: fromObjectId(feedback._id as any)
      } as Feedback;
    } catch (error) {
      logger.error("Feedback repository findByMessageId error", { error, messageId });
      return null;
    }
  }

  /**
   * Get feedback for a phone number
   */
  async findByPhoneNumber(phoneNumber: string, limit: number = 50): Promise<Feedback[]> {
    try {
      const feedbacks = await this.getCollection()
        .find({ phone_number: phoneNumber })
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();

      return feedbacks.map(feedback => ({
        ...feedback,
        _id: fromObjectId(feedback._id as any)
      })) as Feedback[];
    } catch (error) {
      logger.error("Feedback repository findByPhoneNumber error", { error, phoneNumber });
      return [];
    }
  }
}

export const feedbackRepository = new FeedbackRepository();

