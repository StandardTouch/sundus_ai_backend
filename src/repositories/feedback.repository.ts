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
  private collection() {
    return getDatabase().collection<Feedback>("feedback");
  }

  /**
   * Get collection (public access for aggregations)
   */
  getCollection() {
    return this.collection();
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

      const result = await this.collection().insertOne(feedbackData as any);
      
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
      const feedback = await this.collection().findOne({ message_id: messageId });
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
      const feedbacks = await this.collection()
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

  /**
   * Get optimized feedback data for analytics dashboard
   * Returns data in format optimized for dashboard display
   */
  async getFeedbackAnalytics(options?: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    summary: {
      total: number;
      positive: number;
      escalation: number;
      satisfactionScore: number; // Calculated from positive/total (0-1 scale, can be converted to 1-5)
    };
    trends: Array<{
      date: string;
      total: number;
      positive: number;
      escalation: number;
    }>;
    byConversation: Array<{
      conversation_id: string;
      feedback_count: number;
      positive_count: number;
      escalation_count: number;
    }>;
  }> {
    try {
      const query: any = {};
      
      if (options?.startDate || options?.endDate) {
        query.created_at = {};
        if (options.startDate) query.created_at.$gte = options.startDate;
        if (options.endDate) query.created_at.$lte = options.endDate;
      }

      const allFeedback = await this.getCollection()
        .find(query)
        .sort({ created_at: -1 })
        .toArray();

      const total = allFeedback.length;
      const positive = allFeedback.filter(f => f.is_positive === true).length;
      const escalation = allFeedback.filter(f => f.is_positive === false).length;
      const satisfactionScore = total > 0 ? positive / total : 0; // 0-1 scale

      // Group by date for trends
      const groupBy = options?.groupBy || 'day';
      const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m';
      
      const trendsMap = new Map<string, { total: number; positive: number; escalation: number }>();
      
      allFeedback.forEach(feedback => {
        const date = new Date(feedback.created_at);
        let dateKey: string;
        
        if (groupBy === 'day') {
          dateKey = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const week = this.getWeekNumber(date);
          dateKey = `${date.getFullYear()}-W${week}`;
        } else {
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        const existing = trendsMap.get(dateKey) || { total: 0, positive: 0, escalation: 0 };
        existing.total++;
        if (feedback.is_positive) {
          existing.positive++;
        } else {
          existing.escalation++;
        }
        trendsMap.set(dateKey, existing);
      });

      const trends = Array.from(trendsMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Group by conversation
      const conversationMap = new Map<string, { total: number; positive: number; escalation: number }>();
      
      allFeedback.forEach(feedback => {
        const convId = feedback.conversation_id || 'unknown';
        const existing = conversationMap.get(convId) || { total: 0, positive: 0, escalation: 0 };
        existing.total++;
        if (feedback.is_positive) {
          existing.positive++;
        } else {
          existing.escalation++;
        }
        conversationMap.set(convId, existing);
      });

      const byConversation = Array.from(conversationMap.entries())
        .map(([conversation_id, data]) => ({
          conversation_id,
          feedback_count: data.total,
          positive_count: data.positive,
          escalation_count: data.escalation
        }))
        .sort((a, b) => b.feedback_count - a.feedback_count)
        .slice(0, 100); // Top 100 conversations

      return {
        summary: {
          total,
          positive,
          escalation,
          satisfactionScore
        },
        trends,
        byConversation
      };
    } catch (error) {
      logger.error("Feedback repository getFeedbackAnalytics error", { error, options });
      throw error;
    }
  }

  /**
   * Helper to get week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

export const feedbackRepository = new FeedbackRepository();

