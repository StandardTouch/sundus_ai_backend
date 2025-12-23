/**
 * Get Analytics Controller
 * Returns comprehensive analytics data
 * 
 * Request: GET /api/analytics
 * 
 * Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "totalConversations": 1247,
 *     "totalConversationsChange": 12.5,
 *     "activeUsers": 342,
 *     "activeUsersChange": 8.3,
 *     "totalMessages": 5234,
 *     "messagesToday": 87,
 *     "faqsUsed": 892,
 *     "faqsUsedChange": -5.2,
 *     "satisfactionRate": 94.5,
 *     "satisfactionRateChange": 2.1,
 *     "avgResponseTime": 1200.5,
 *     "weeklyTrend": [
 *       {
 *         "date": "2025-01-15",
 *         "day": "Mon",
 *         "conversations": 142,
 *         "faqs": 98,
 *         "messages": 456
 *       }
 *     ],
 *     "hourlyActivity": [
 *       {
 *         "hour": 0,
 *         "conversations": 12,
 *         "messages": 34
 *       }
 *     ],
 *     "topFAQs": [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "question": "What is your return policy?",
 *         "category": "policies",
 *         "usage_count": 234
 *       }
 *     ],
 *     "categoryDistribution": [
 *       {
 *         "category": "policies",
 *         "count": 456,
 *         "totalUsage": 1234,
 *         "percentage": 32
 *       }
 *     ],
 *     "responseTimeBreakdown": {
 *       "fast": 68,
 *       "medium": 24,
 *       "slow": 8
 *     },
 *     "userEngagement": {
 *       "avgMessagesPerConversation": 4.2,
 *       "avgSessionDuration": 204
 *     }
 *   }
 * }
 */

import type { Request, Response } from "express";
import { analyticsService } from "../../services/analytics.service.js";
import { logger } from "../../utils/logger.js";

/**
 * Get comprehensive analytics
 */
export async function getAnalyticsController(req: Request, res: Response): Promise<void> {
  try {
    // Optional date range from query params
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    // Build options object only with defined dates
    const options: { startDate?: Date; endDate?: Date } = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const analytics = await analyticsService.getAnalytics(options);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error("Get analytics controller error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

