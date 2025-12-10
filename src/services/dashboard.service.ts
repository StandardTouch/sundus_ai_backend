/**
 * Dashboard Service
 * Provides analytics data for dashboard display
 */

import { conversationMessageRepository } from "../repositories/conversation-message.repository.js";
import { feedbackRepository } from "../repositories/feedback.repository.js";
import { getDatabase } from "../config/database.js";
import { logger } from "../utils/logger.js";

/**
 * Dashboard Service
 */
export class DashboardService {
  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<{
    totalConversations: number;
    totalConversationsChange: number; // Percentage change from last month
    activeUsers: number;
    activeUsersChange: number; // Percentage change from last week
    responseAccuracy: number; // Percentage (0-100)
    responseAccuracyChange: number; // Percentage change
    satisfactionScore: number; // 0-1 scale (can be converted to 1-5 stars)
    satisfactionScoreChange: number; // Percentage change
    messageVolume: Array<{
      date: string;
      count: number;
    }>;
    responseTimeTrend: Array<{
      date: string;
      avgResponseTime: number; // milliseconds
    }>;
    recentConversations: Array<{
      conversation_id: string;
      user_name?: string;
      phone_number: string;
      last_message: string;
      time_ago: string;
      rating: number; // 1-5 stars (calculated from feedback)
    }>;
  }> {
    try {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago for comparison
      const lastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago for comparison

      // Run all independent queries in parallel for maximum speed
      const [
        totalConversations,
        totalConversationsLastMonth,
        activeUsers,
        activeUsersLastWeek,
        accuracyData,
        satisfactionData,
        messageVolume,
        responseTimeTrend,
        recentConversations
      ] = await Promise.all([
        this.getTotalConversations().catch(() => 0),
        this.getTotalConversations(lastMonth, last30Days).catch(() => 0),
        this.getActiveUsers(last7Days).catch(() => 0),
        this.getActiveUsers(lastWeek, last7Days).catch(() => 0),
        this.getResponseAccuracy(last30Days, lastMonth).catch(() => ({ accuracy: 0, previousAccuracy: 0 })),
        this.getSatisfactionScore(last30Days, lastMonth).catch(() => ({ satisfactionScore: 0, previousSatisfactionScore: 0 })),
        this.getMessageVolume(last7Days).catch(() => []),
        this.getResponseTimeTrend(last7Days).catch(() => []),
        this.getRecentConversations(10).catch(() => [])
      ]);

      // Calculate changes
      const totalConversationsChange = this.calculatePercentageChange(
        totalConversationsLastMonth,
        totalConversations
      );
      const activeUsersChange = this.calculatePercentageChange(
        activeUsersLastWeek,
        activeUsers
      );
      const responseAccuracyChange = this.calculatePercentageChange(
        accuracyData.previousAccuracy,
        accuracyData.accuracy
      );
      const satisfactionScoreChange = this.calculatePercentageChange(
        satisfactionData.previousSatisfactionScore,
        satisfactionData.satisfactionScore
      );

      return {
        totalConversations,
        totalConversationsChange,
        activeUsers,
        activeUsersChange,
        responseAccuracy: accuracyData.accuracy,
        responseAccuracyChange,
        satisfactionScore: satisfactionData.satisfactionScore,
        satisfactionScoreChange,
        messageVolume,
        responseTimeTrend,
        recentConversations
      };
    } catch (error) {
      logger.error("Dashboard service getDashboardMetrics error", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Get total conversations count
   */
  private async getTotalConversations(
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      const query: any = {};
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }

      const conversations = await conversationMessageRepository.getCollection()
        .distinct("conversation_id", query);
      
      return conversations.filter(id => id !== null && id !== undefined).length;
    } catch (error) {
      logger.error("Dashboard service getTotalConversations error", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return 0;
    }
  }

  /**
   * Get active users count
   */
  private async getActiveUsers(
    startDate: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      const query: any = {
        timestamp: { $gte: startDate }
      };
      if (endDate) {
        query.timestamp.$lte = endDate;
      }

      const users = await conversationMessageRepository.getCollection()
        .distinct("phone_number", query);
      
      return users.length;
    } catch (error) {
      logger.error("Dashboard service getActiveUsers error", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return 0;
    }
  }

  /**
   * Get response accuracy
   * Uses feedback timestamps instead of message timestamps to include all feedback received in the period
   */
  private async getResponseAccuracy(
    currentPeriodStart: Date,
    previousPeriodStart: Date
  ): Promise<{ accuracy: number; previousAccuracy: number }> {
    try {
      // Get feedback received in current period and previous period
      const [currentFeedbacks, previousFeedbacks] = await Promise.all([
        feedbackRepository.getCollection()
          .find({
            created_at: { $gte: currentPeriodStart },
            original_message_id: { $exists: true, $ne: null }
          })
          .toArray(),
        feedbackRepository.getCollection()
          .find({
            created_at: { $gte: previousPeriodStart, $lt: currentPeriodStart },
            original_message_id: { $exists: true, $ne: null }
          })
          .toArray()
      ]);

      // Calculate accuracy from feedback
      // is_positive: true = 1.0, false = 0.0
      const currentAccuracy = currentFeedbacks.length > 0
        ? currentFeedbacks.reduce((sum, f) => sum + (f.is_positive ? 1.0 : 0.0), 0) / currentFeedbacks.length
        : 0;

      const previousAccuracy = previousFeedbacks.length > 0
        ? previousFeedbacks.reduce((sum, f) => sum + (f.is_positive ? 1.0 : 0.0), 0) / previousFeedbacks.length
        : 0;

      // Convert to percentage (0-1 to 0-100)
      return {
        accuracy: currentAccuracy * 100,
        previousAccuracy: previousAccuracy * 100
      };
    } catch (error) {
      logger.error("Dashboard service getResponseAccuracy error", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return { accuracy: 0, previousAccuracy: 0 };
    }
  }

  /**
   * Get satisfaction score
   */
  private async getSatisfactionScore(
    currentPeriodStart: Date,
    previousPeriodStart: Date
  ): Promise<{ satisfactionScore: number; previousSatisfactionScore: number }> {
    try {
      // Run both queries in parallel
      const [feedbackStats, previousFeedbackStats] = await Promise.all([
        feedbackRepository.getFeedbackStats({
          startDate: currentPeriodStart
        }),
        feedbackRepository.getFeedbackStats({
          startDate: previousPeriodStart,
          endDate: currentPeriodStart
        })
      ]);

      return {
        satisfactionScore: feedbackStats.total > 0
          ? feedbackStats.positive / feedbackStats.total
          : 0,
        previousSatisfactionScore: previousFeedbackStats.total > 0
          ? previousFeedbackStats.positive / previousFeedbackStats.total
          : 0
      };
    } catch (error) {
      logger.error("Dashboard service getSatisfactionScore error", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return { satisfactionScore: 0, previousSatisfactionScore: 0 };
    }
  }

  /**
   * Get message volume (last 7 days)
   */
  private async getMessageVolume(startDate: Date): Promise<Array<{ date: string; count: number }>> {
    try {
      const messages = await conversationMessageRepository.getCollection()
        .aggregate([
          {
            $match: {
              timestamp: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              count: 1
            }
          }
        ])
        .toArray();

      return messages as Array<{ date: string; count: number }>;
    } catch (error) {
      logger.error("Dashboard service getMessageVolume error", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  /**
   * Get response time trend (last 7 days)
   */
  private async getResponseTimeTrend(startDate: Date): Promise<Array<{ date: string; avgResponseTime: number }>> {
    try {
      const responseTimes = await conversationMessageRepository.getCollection()
        .aggregate([
          {
            $match: {
              role: 'assistant',
              timestamp: { $gte: startDate },
              'metadata.response_time_ms': { $exists: true }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
              },
              avgResponseTime: { $avg: "$metadata.response_time_ms" }
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              avgResponseTime: { $round: ["$avgResponseTime", 2] }
            }
          }
        ])
        .toArray();

      return responseTimes as Array<{ date: string; avgResponseTime: number }>;
    } catch (error) {
      logger.error("Dashboard service getResponseTimeTrend error", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  /**
   * Get recent conversations (last 10)
   * Excludes feedback template messages from the last_message
   */
  private async getRecentConversations(limit: number = 10): Promise<Array<{
    conversation_id: string;
    user_name?: string;
    phone_number: string;
    last_message: string;
    time_ago: string;
    rating: number;
  }>> {
    try {
      // Get most recent messages grouped by conversation
      // Exclude feedback template messages (metadata.is_feedback_template !== true)
      const conversations = await conversationMessageRepository.getCollection()
        .aggregate([
          {
            $match: {
              conversation_id: { $exists: true, $ne: null },
              // Exclude feedback template messages
              $expr: {
                $ne: [{ $ifNull: ["$metadata.is_feedback_template", false] }, true]
              }
            }
          },
          {
            $sort: { timestamp: -1 }
          },
          {
            $group: {
              _id: "$conversation_id",
              phone_number: { $first: "$phone_number" },
              last_message: { $first: "$content" },
              last_timestamp: { $first: "$timestamp" },
              message_id: { $first: "$message_id" }
            }
          },
          {
            $sort: { last_timestamp: -1 }
          },
          {
            $limit: limit
          }
        ])
        .toArray();

      // Get user names from user_sessions
      const phoneNumbers = conversations.length > 0 
        ? conversations.map(c => c.phone_number).filter(Boolean)
        : [];
      
      const userSessions = phoneNumbers.length > 0
        ? await getDatabase()
            .collection("user_sessions")
            .find({ phone_number: { $in: phoneNumbers } })
            .toArray()
        : [];

      const userMap = new Map(
        userSessions.map(session => [session.phone_number, session.user_name || session.contact_name])
      );

      // Get feedback/ratings for these conversations
      const conversationIds = conversations.length > 0
        ? conversations.map(c => c._id).filter(Boolean)
        : [];
      
      const feedbacks = conversationIds.length > 0
        ? await feedbackRepository.getCollection()
            .find({ conversation_id: { $in: conversationIds } })
            .toArray()
        : [];

      const feedbackMap = new Map<string, number>();
      feedbacks.forEach(feedback => {
        const convId = feedback.conversation_id;
        if (convId) {
          // Convert is_positive to rating (true = 5 stars, false = 1 star)
          const rating = feedback.is_positive ? 5 : 1;
          // If multiple feedbacks, average them
          const existing = feedbackMap.get(convId);
          if (existing) {
            feedbackMap.set(convId, (existing + rating) / 2);
          } else {
            feedbackMap.set(convId, rating);
          }
        }
      });

      const now = new Date();
      return conversations.map(conv => {
        const timeAgo = conv.last_timestamp 
          ? this.formatTimeAgo(new Date(conv.last_timestamp), now)
          : "Unknown";
        const rating = feedbackMap.get(conv._id) || 0; // 0 = no rating yet

        return {
          conversation_id: conv._id || "unknown",
          user_name: userMap.get(conv.phone_number),
          phone_number: conv.phone_number || "unknown",
          last_message: (conv.last_message || "").substring(0, 100), // Truncate to 100 chars
          time_ago: timeAgo,
          rating: Math.round(rating * 10) / 10 // Round to 1 decimal
        };
      });
    } catch (error) {
      logger.error("Dashboard service getRecentConversations error", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  /**
   * Format time ago string
   */
  private formatTimeAgo(date: Date, now: Date): string {
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}

export const dashboardService = new DashboardService();

