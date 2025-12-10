/**
 * GET /api/conversations
 * Get all conversations (paginated with search and filters)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Query Parameters:
 * - page: number (default: 1) - Page number for pagination
 * - limit: number (default: 20) - Number of items per page (max: 100)
 * - search: string (optional) - Search in phone_number, conversation_id, or message content (case-insensitive)
 * - phone_number: string (optional) - Filter by phone number (exact match)
 * - start_date: string (optional) - Filter conversations from this date (ISO 8601 format, e.g., "2024-01-01T00:00:00.000Z")
 * - end_date: string (optional) - Filter conversations until this date (ISO 8601 format)
 * - sort_by: string (optional) - Field to sort by (default: 'last_timestamp')
 *   Available fields: last_timestamp, phone_number, message_count
 * - sort_order: 'asc' | 'desc' (optional) - Sort order (default: 'desc')
 * 
 * Example Request:
 * GET /api/conversations?page=1&limit=20&search=917089379345&sort_by=last_timestamp&sort_order=desc
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "conversations": [
 *       {
 *         "conversation_id": "conv_abc123",
 *         "phone_number": "917089379345",
 *         "user_name": "John Doe",
 *         "last_message": "Thank you for your help!",
 *         "last_timestamp": "2024-01-15T10:30:00.000Z",
 *         "message_count": 15,
 *         "rating": 5.0
 *       },
 *       {
 *         "conversation_id": "conv_xyz789",
 *         "phone_number": "917089379346",
 *         "user_name": null,
 *         "last_message": "What are your business hours?",
 *         "last_timestamp": "2024-01-14T09:00:00.000Z",
 *         "message_count": 8,
 *         "rating": 0
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 45,
 *       "totalPages": 3
 *     }
 *   }
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid limit. Maximum is 100"
 * }
 * 
 * Error Response (401):
 * {
 *   "success": false,
 *   "error": "Unauthorized"
 * }
 * 
 * Error Response (500):
 * {
 *   "success": false,
 *   "error": "Internal server error"
 * }
 */

import type { Request, Response } from "express";
import { conversationListService } from "../services/conversation-list.service.js";
import { logger } from "../../utils/logger.js";

export async function getConversationsController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Parse query parameters
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string | undefined;
    const phone_number = req.query.phone_number as string | undefined;
    const start_date = req.query.start_date
      ? new Date(req.query.start_date as string)
      : undefined;
    const end_date = req.query.end_date
      ? new Date(req.query.end_date as string)
      : undefined;
    const sort_by = req.query.sort_by as
      | "last_timestamp"
      | "phone_number"
      | "message_count"
      | undefined;
    const sort_order = req.query.sort_order as "asc" | "desc" | undefined;

    // Validate limit
    if (limit > 100) {
      res.status(400).json({
        success: false,
        error: "Invalid limit. Maximum is 100"
      });
      return;
    }

    // Validate dates
    if (start_date && isNaN(start_date.getTime())) {
      res.status(400).json({
        success: false,
        error: "Invalid start_date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00.000Z)"
      });
      return;
    }

    if (end_date && isNaN(end_date.getTime())) {
      res.status(400).json({
        success: false,
        error: "Invalid end_date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00.000Z)"
      });
      return;
    }

    // Get conversations
    const options: any = {
      page,
      limit
    };
    
    if (search) options.search = search;
    if (phone_number) options.phone_number = phone_number;
    if (start_date) options.start_date = start_date;
    if (end_date) options.end_date = end_date;
    if (sort_by) options.sort_by = sort_by;
    if (sort_order) options.sort_order = sort_order;

    const result = await conversationListService.getConversations(options);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error("Get conversations controller error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

