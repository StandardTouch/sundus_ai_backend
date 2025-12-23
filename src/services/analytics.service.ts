/**
 * Analytics Service
 * Optimized analytics queries with proper indexing
 */

import { getDatabase } from "../config/database.js";
import { logger } from "../utils/logger.js";

/**
 * Analytics Service
 */
export class AnalyticsService {
  /**
   * Get comprehensive analytics data
   * All queries run in parallel for maximum performance
   */
  async getAnalytics(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    // Overview metrics
    totalConversations: number;
    totalConversationsChange: number;
    activeUsers: number;
    activeUsersChange: number;
    totalMessages: number;
    messagesToday: number;
    faqsUsed: number;
    faqsUsedChange: number;
    satisfactionRate: number;
    satisfactionRateChange: number;
    avgResponseTime: number;
    
    // Time-based analytics
    weeklyTrend: Array<{
      date: string;
      day: string;
      conversations: number;
      faqs: number;
      messages: number;
    }>;
    hourlyActivity: Array<{
      hour: number;
      conversations: number;
      messages: number;
    }>;
    
    // FAQ analytics
    topFAQs: Array<{
      _id: string;
      question: string;
      category?: string;
      usage_count: number;
    }>;
    categoryDistribution: Array<{
      category: string;
      count: number;
      totalUsage: number;
      percentage: number;
    }>;
    
    // Response time breakdown
    responseTimeBreakdown: {
      fast: number; // < 1s
      medium: number; // 1-2s
      slow: number; // > 2s
    };
    
    // User engagement
    userEngagement: {
      avgMessagesPerConversation: number;
      avgSessionDuration: number; // in seconds
    };
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Run all queries in parallel for maximum performance
      const [
        totalConversations,
        totalConversationsLastMonth,
        activeUsers,
        activeUsersLastWeek,
        totalMessages,
        messagesToday,
        faqsUsed,
        faqsUsedLastMonth,
        satisfactionData,
        satisfactionDataLastMonth,
        weeklyTrend,
        hourlyActivity,
        topFAQs,
        categoryDistribution,
        responseTimeBreakdown,
        userEngagement,
        avgResponseTime
      ] = await Promise.all([
        this.getTotalConversations().catch(() => ({ count: 0 })),
        this.getTotalConversations(last60Days, last30Days).catch(() => ({ count: 0 })),
        this.getActiveUsers(last7Days).catch(() => ({ count: 0 })),
        this.getActiveUsers(last14Days, last7Days).catch(() => ({ count: 0 })),
        this.getTotalMessages().catch(() => ({ count: 0 })),
        this.getMessagesToday(todayStart).catch(() => ({ count: 0 })),
        this.getFAQsUsed().catch(() => ({ total: 0 })),
        this.getFAQsUsed(last60Days, last30Days).catch(() => ({ total: 0 })),
        this.getSatisfactionRate(last30Days).catch(() => ({ rate: 0 })),
        this.getSatisfactionRate(last60Days, last30Days).catch(() => ({ rate: 0 })),
        this.getWeeklyTrend(last7Days).catch(() => []),
        this.getHourlyActivity(todayStart).catch(() => []),
        this.getTopFAQs(5).catch(() => []),
        this.getCategoryDistribution().catch(() => []),
        this.getResponseTimeBreakdown().catch(() => ({ fast: 0, medium: 0, slow: 0 })),
        this.getUserEngagement().catch(() => ({ avgMessages: 0, avgDuration: 0 })),
        this.getAvgResponseTime().catch(() => 0)
      ]);

      // Calculate percentage changes
      const totalConversationsChange = this.calculatePercentageChange(
        totalConversationsLastMonth.count,
        totalConversations.count
      );
      const activeUsersChange = this.calculatePercentageChange(
        activeUsersLastWeek.count,
        activeUsers.count
      );
      const faqsUsedChange = this.calculatePercentageChange(
        faqsUsedLastMonth.total,
        faqsUsed.total
      );
      const satisfactionRateChange = this.calculatePercentageChange(
        satisfactionDataLastMonth.rate,
        satisfactionData.rate
      );

      return {
        totalConversations: totalConversations.count,
        totalConversationsChange,
        activeUsers: activeUsers.count,
        activeUsersChange,
        totalMessages: totalMessages.count,
        messagesToday: messagesToday.count,
        faqsUsed: faqsUsed.total,
        faqsUsedChange,
        satisfactionRate: satisfactionData.rate,
        satisfactionRateChange,
        avgResponseTime,
        weeklyTrend,
        hourlyActivity,
        topFAQs,
        categoryDistribution,
        responseTimeBreakdown,
        userEngagement: {
          avgMessagesPerConversation: userEngagement.avgMessages,
          avgSessionDuration: userEngagement.avgDuration
        }
      };
    } catch (error) {
      logger.error("Analytics service error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Get total conversations (optimized with index)
   */
  private async getTotalConversations(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ count: number }> {
    const db = getDatabase();
    const query: any = {
      conversation_id: { $exists: true, $ne: null }
    };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const count = await db.collection("conversation_messages")
      .distinct("conversation_id", query)
      .then(ids => ids.filter(id => id !== null && id !== undefined).length);

    return { count };
  }

  /**
   * Get active users (optimized with index)
   */
  private async getActiveUsers(
    startDate: Date,
    endDate?: Date
  ): Promise<{ count: number }> {
    const db = getDatabase();
    const query: any = {
      timestamp: { $gte: startDate }
    };
    if (endDate) {
      query.timestamp.$lte = endDate;
    }

    const users = await db.collection("conversation_messages")
      .distinct("phone_number", query);

    return { count: users.length };
  }

  /**
   * Get total messages
   */
  private async getTotalMessages(): Promise<{ count: number }> {
    const db = getDatabase();
    const count = await db.collection("conversation_messages").countDocuments();
    return { count };
  }

  /**
   * Get messages today (optimized with index)
   */
  private async getMessagesToday(todayStart: Date): Promise<{ count: number }> {
    const db = getDatabase();
    const count = await db.collection("conversation_messages")
      .countDocuments({ timestamp: { $gte: todayStart } });
    return { count };
  }

  /**
   * Get FAQs used (sum of usage_count)
   */
  private async getFAQsUsed(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ total: number }> {
    const db = getDatabase();
    const query: any = {
      status: "active",
      is_active: true
    };

    if (startDate || endDate) {
      query.last_used_at = {};
      if (startDate) query.last_used_at.$gte = startDate;
      if (endDate) query.last_used_at.$lte = endDate;
    }

    const result = await db.collection("faqs")
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: "$usage_count" }
          }
        }
      ])
      .toArray();

    return { total: result[0]?.total || 0 };
  }

  /**
   * Get satisfaction rate
   */
  private async getSatisfactionRate(
    startDate: Date,
    endDate?: Date
  ): Promise<{ rate: number }> {
    const db = getDatabase();
    const query: any = {
      created_at: { $gte: startDate }
    };
    if (endDate) {
      query.created_at.$lte = endDate;
    }

    const result = await db.collection("feedback")
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            positive: {
              $sum: { $cond: [{ $eq: ["$is_positive", true] }, 1, 0] }
            }
          }
        }
      ])
      .toArray();

    const data = result[0] || { total: 0, positive: 0 };
    const rate = data.total > 0 ? (data.positive / data.total) * 100 : 0;

    return { rate: Math.round(rate * 100) / 100 };
  }

  /**
   * Get weekly trend (last 7 days)
   */
  private async getWeeklyTrend(startDate: Date): Promise<Array<{
    date: string;
    day: string;
    conversations: number;
    faqs: number;
    messages: number;
  }>> {
    const db = getDatabase();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get conversations and messages by day
    const [messagesData, faqsData] = await Promise.all([
      db.collection("conversation_messages")
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
              conversations: { $addToSet: "$conversation_id" },
              messages: { $sum: 1 }
            }
          },
          {
            $project: {
              date: "$_id",
              conversationCount: { $size: "$conversations" },
              messageCount: "$messages"
            }
          },
          { $sort: { date: 1 } }
        ])
        .toArray(),
      db.collection("faqs")
        .aggregate([
          {
            $match: {
              status: "active",
              is_active: true,
              last_used_at: { $gte: startDate, $exists: true }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$last_used_at" }
              },
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              date: "$_id",
              count: 1
            }
          },
          { $sort: { date: 1 } }
        ])
        .toArray()
    ]);

    // Create a map for quick lookup
    const messagesMap = new Map(
      messagesData.map((item: any) => [item.date, item])
    );
    const faqsMap = new Map(
      faqsData.map((item: any) => [item.date, item.count || 0])
    );

    // Generate last 7 days
    const result: Array<{
      date: string;
      day: string;
      conversations: number;
      faqs: number;
      messages: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = dayNames[date.getDay()];

      const messageData = messagesMap.get(dateStr);
      result.push({
        date: dateStr,
        day: dayName,
        conversations: messageData?.conversationCount || 0,
        faqs: faqsMap.get(dateStr) || 0,
        messages: messageData?.messageCount || 0
      });
    }

    return result;
  }

  /**
   * Get hourly activity for today
   */
  private async getHourlyActivity(todayStart: Date): Promise<Array<{
    hour: number;
    conversations: number;
    messages: number;
  }>> {
    const db = getDatabase();

    const result = await db.collection("conversation_messages")
      .aggregate([
        {
          $match: {
            timestamp: { $gte: todayStart }
          }
        },
        {
          $group: {
            _id: { $hour: "$timestamp" },
            conversations: { $addToSet: "$conversation_id" },
            messages: { $sum: 1 }
          }
        },
        {
          $project: {
            hour: "$_id",
            conversationCount: { $size: "$conversations" },
            messageCount: "$messages"
          }
        },
        { $sort: { hour: 1 } }
      ])
      .toArray();

    // Fill in missing hours with 0
    const hourlyMap = new Map(
      result.map((item: any) => [item.hour, {
        hour: item.hour,
        conversations: item.conversationCount || 0,
        messages: item.messageCount || 0
      }])
    );

    const filled: Array<{ hour: number; conversations: number; messages: number }> = [];
    for (let hour = 0; hour < 24; hour++) {
      filled.push(
        hourlyMap.get(hour) || { hour, conversations: 0, messages: 0 }
      );
    }

    return filled;
  }

  /**
   * Get top FAQs by usage (optimized with index)
   */
  private async getTopFAQs(limit: number = 5): Promise<Array<{
    _id: string;
    question: string;
    category?: string;
    usage_count: number;
  }>> {
    const db = getDatabase();

    const faqs = await db.collection("faqs")
      .find({
        status: "active",
        is_active: true,
        usage_count: { $gt: 0 }
      })
      .sort({ usage_count: -1 })
      .limit(limit)
      .project({
        _id: 1,
        question: 1,
        category: 1,
        usage_count: 1
      })
      .toArray();

    return faqs.map((faq: any) => ({
      _id: faq._id.toString(),
      question: faq.question,
      category: faq.category,
      usage_count: faq.usage_count || 0
    }));
  }

  /**
   * Get category distribution
   */
  private async getCategoryDistribution(): Promise<Array<{
    category: string;
    count: number;
    totalUsage: number;
    percentage: number;
  }>> {
    const db = getDatabase();

    const [distribution, total] = await Promise.all([
      db.collection("faqs")
        .aggregate([
          {
            $match: {
              status: "active",
              is_active: true,
              category: { $exists: true, $ne: null }
            }
          },
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
              totalUsage: { $sum: "$usage_count" }
            }
          },
          {
            $project: {
              category: "$_id",
              count: 1,
              totalUsage: 1
            }
          },
          { $sort: { count: -1 } }
        ])
        .toArray(),
      db.collection("faqs")
        .countDocuments({
          status: "active",
          is_active: true,
          category: { $exists: true, $ne: null }
        })
    ]);

    return (distribution as any[]).map((item: any) => ({
      category: item.category,
      count: item.count,
      totalUsage: item.totalUsage,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
    }));
  }

  /**
   * Get response time breakdown
   */
  private async getResponseTimeBreakdown(): Promise<{
    fast: number;
    medium: number;
    slow: number;
  }> {
    const db = getDatabase();

    const result = await db.collection("conversation_messages")
      .aggregate([
        {
          $match: {
            role: "assistant",
            "metadata.response_time_ms": { $exists: true }
          }
        },
        {
          $bucket: {
            groupBy: "$metadata.response_time_ms",
            boundaries: [0, 1000, 2000, Infinity],
            default: "other",
            output: {
              count: { $sum: 1 }
            }
          }
        }
      ])
      .toArray();

    const breakdown = {
      fast: 0,
      medium: 0,
      slow: 0
    };

    result.forEach((item: any) => {
      if (item._id === 0) {
        breakdown.fast = item.count;
      } else if (item._id === 1000) {
        breakdown.medium = item.count;
      } else if (item._id === 2000) {
        breakdown.slow = item.count;
      }
    });

    return breakdown;
  }

  /**
   * Get user engagement metrics
   */
  private async getUserEngagement(): Promise<{
    avgMessages: number;
    avgDuration: number;
  }> {
    const db = getDatabase();

    const result = await db.collection("conversation_messages")
      .aggregate([
        {
          $match: {
            conversation_id: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: "$conversation_id",
            messageCount: { $sum: 1 },
            firstMessage: { $min: "$timestamp" },
            lastMessage: { $max: "$timestamp" }
          }
        },
        {
          $project: {
            messageCount: 1,
            duration: {
              $divide: [
                { $subtract: ["$lastMessage", "$firstMessage"] },
                1000 // Convert to seconds
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgMessages: { $avg: "$messageCount" },
            avgDuration: { $avg: "$duration" }
          }
        }
      ])
      .toArray();

    const data = result[0] || { avgMessages: 0, avgDuration: 0 };
    return {
      avgMessages: Math.round((data.avgMessages || 0) * 10) / 10,
      avgDuration: Math.round((data.avgDuration || 0) * 10) / 10
    };
  }

  /**
   * Get average response time
   */
  private async getAvgResponseTime(): Promise<number> {
    const db = getDatabase();

    const result = await db.collection("conversation_messages")
      .aggregate([
        {
          $match: {
            role: "assistant",
            "metadata.response_time_ms": { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: "$metadata.response_time_ms" }
          }
        }
      ])
      .toArray();

    const avgTime = result[0]?.avgTime || 0;
    return Math.round(avgTime * 10) / 10;
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
}

export const analyticsService = new AnalyticsService();

