/**
 * GET /api/conversations/:id
 * Get a single conversation by ID with its messages
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - id: string (conversation ID)
 * 
 * Query Parameters:
 * - page: number (default: 1) - Page number for message pagination
 * - limit: number (default: 50) - Number of messages per page (max: 100)
 * 
 * Example Request:
 * GET /api/conversations/conv_abc123?page=1&limit=50
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "conversation": {
 *       "conversation_id": "conv_abc123",
 *       "phone_number": "917089379345",
 *       "user_name": "John Doe",
 *       "first_timestamp": "2024-01-10T08:00:00.000Z",
 *       "last_timestamp": "2024-01-15T10:30:00.000Z",
 *       "total_messages": 25,
 *       "rating": 5.0
 *     },
 *     "messages": [
 *       {
 *         "message_id": "msg_001",
 *         "role": "user",
 *         "content": "Hello, I need help with my order",
 *         "timestamp": "2024-01-10T08:00:00.000Z",
 *         "replied_to_message_id": null,
 *         "metadata": null
 *       },
 *       {
 *         "message_id": "msg_002",
 *         "role": "assistant",
 *         "content": "I'd be happy to help you with your order. Can you please provide your order number?",
 *         "timestamp": "2024-01-10T08:00:15.000Z",
 *         "replied_to_message_id": null,
 *         "metadata": {
 *           "model": "gpt-4",
 *           "response_time_ms": 1200,
 *           "accuracy_score": 1.0
 *         }
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 50,
 *       "total": 25,
 *       "totalPages": 1
 *     }
 *   }
 * }
 * 
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "Conversation not found"
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

export async function getConversationByIdController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: "Conversation ID is required"
      });
      return;
    }

    // Parse query parameters
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    // Validate limit
    if (limit > 100) {
      res.status(400).json({
        success: false,
        error: "Invalid limit. Maximum is 100"
      });
      return;
    }

    // Get conversation
    const result = await conversationListService.getConversationById(id, {
      page,
      limit
    });

    if (!result) {
      res.status(404).json({
        success: false,
        error: "Conversation not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error("Get conversation by ID controller error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      conversationId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

