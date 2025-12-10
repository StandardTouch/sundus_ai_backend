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
      // Calculate analytics-friendly fields
      const isPositive = data.feedback === 'yes';
      const responseType = isPositive ? 'positive' : 'escalation';
      
      const feedbackData: Omit<Feedback, "_id"> = {
        ...data,
        response_type: responseType,
        is_positive: isPositive,
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

  /**
   * Get feedback statistics for analytics
   * Returns counts of positive vs escalation feedback
   */
  async getFeedbackStats(options?: {
    startDate?: Date;
    endDate?: Date;
    language?: 'en' | 'ar';
  }): Promise<{
    total: number;
    positive: number;
    escalation: number;
    positivePercentage: number;
    escalationPercentage: number;
    byLanguage: {
      en: { total: number; positive: number; escalation: number };
      ar: { total: number; positive: number; escalation: number };
    };
  }> {
    try {
      const query: any = {};
      
      if (options?.startDate || options?.endDate) {
        query.created_at = {};
        if (options.startDate) query.created_at.$gte = options.startDate;
        if (options.endDate) query.created_at.$lte = options.endDate;
      }
      
      if (options?.language) {
        query.language = options.language;
      }

      const total = await this.getCollection().countDocuments(query);
      const positive = await this.getCollection().countDocuments({ ...query, is_positive: true });
      const escalation = await this.getCollection().countDocuments({ ...query, is_positive: false });
      
      // Get stats by language
      const enTotal = await this.getCollection().countDocuments({ ...query, language: 'en' });
      const enPositive = await this.getCollection().countDocuments({ ...query, language: 'en', is_positive: true });
      const enEscalation = await this.getCollection().countDocuments({ ...query, language: 'en', is_positive: false });
      
      const arTotal = await this.getCollection().countDocuments({ ...query, language: 'ar' });
      const arPositive = await this.getCollection().countDocuments({ ...query, language: 'ar', is_positive: true });
      const arEscalation = await this.getCollection().countDocuments({ ...query, language: 'ar', is_positive: false });

      return {
        total,
        positive,
        escalation,
        positivePercentage: total > 0 ? Math.round((positive / total) * 100 * 100) / 100 : 0,
        escalationPercentage: total > 0 ? Math.round((escalation / total) * 100 * 100) / 100 : 0,
        byLanguage: {
          en: { total: enTotal, positive: enPositive, escalation: enEscalation },
          ar: { total: arTotal, positive: arPositive, escalation: arEscalation }
        }
      };
    } catch (error) {
      logger.error("Feedback repository getFeedbackStats error", { error, options });
      throw error;
    }
  }
}

export const feedbackRepository = new FeedbackRepository();

