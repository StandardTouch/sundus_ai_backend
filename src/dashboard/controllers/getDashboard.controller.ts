/**
 * Get Dashboard Controller
 * Returns dashboard metrics and analytics
 * 
 * Request: GET /api/dashboard
 * 
 * Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "totalConversations": 12340,
 *     "totalConversationsChange": 18,
 *     "activeUsers": 2345,
 *     "activeUsersChange": 5,
 *     "responseAccuracy": 94.2,
 *     "responseAccuracyChange": 2.1,
 *     "satisfactionScore": 0.96,
 *     "satisfactionScoreChange": 0,
 *     "messageVolume": [
 *       { "date": "2025-01-11", "count": 150 },
 *       { "date": "2025-01-12", "count": 180 }
 *     ],
 *     "responseTimeTrend": [
 *       { "date": "2025-01-11", "avgResponseTime": 1250.5 },
 *       { "date": "2025-01-12", "avgResponseTime": 1180.2 }
 *     ],
 *     "recentConversations": [
 *       {
 *         "conversation_id": "conv_123",
 *         "user_name": "Olivia Martin",
 *         "phone_number": "917676079163",
 *         "last_message": "How can I reset my password?",
 *         "time_ago": "2m ago",
 *         "rating": 5
 *       }
 *     ]
 *   }
 * }
 */

import type { Request, Response } from "express";
import { dashboardService } from "../../services/dashboard.service.js";
import { logger } from "../../utils/logger.js";

/**
 * Get dashboard metrics
 */
export async function getDashboardController(req: Request, res: Response): Promise<void> {
  try {
    const metrics = await dashboardService.getDashboardMetrics();

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error("Get dashboard controller error", { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard metrics",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

