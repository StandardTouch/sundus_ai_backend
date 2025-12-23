/**
 * GET /api/faqs/suggestions
 * Get all pending FAQ suggestions (paginated)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Query Parameters:
 * - page: number (default: 1) - Page number for pagination
 * - limit: number (default: 10, max: 100) - Number of items per page
 * 
 * Example Request:
 * GET /api/faqs/suggestions?page=1&limit=20
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "suggestions": [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "question": "What is your return policy?",
 *         "question_ar": "ما هي سياسة الإرجاع الخاصة بك؟",
 *         "answer": "",
 *         "answer_ar": "",
 *         "category": "policies",
 *         "vector_id": "",
 *         "source": "ai_suggested",
 *         "status": "pending_review",
 *         "ai_suggestion": {
 *           "source_conversation_id": "conv_12345",
 *           "source_message_id": "msg_67890",
 *           "confidence_score": 0.0,
 *           "suggested_at": "2024-01-15T10:30:00.000Z",
 *           "reviewed_by": null,
 *           "reviewed_at": null,
 *           "review_notes": null
 *         },
 *         "usage_count": 0,
 *         "is_active": false,
 *         "created_at": "2024-01-15T10:30:00.000Z",
 *         "updated_at": "2024-01-15T10:30:00.000Z"
 *       },
 *       {
 *         "_id": "507f1f77bcf86cd799439012",
 *         "question": "How do I cancel my order?",
 *         "question_ar": "كيف يمكنني إلغاء طلبي؟",
 *         "answer": "",
 *         "answer_ar": "",
 *         "source": "ai_suggested",
 *         "status": "pending_review",
 *         "ai_suggestion": {
 *           "source_conversation_id": "conv_12346",
 *           "source_message_id": "msg_67891",
 *           "confidence_score": 0.0,
 *           "suggested_at": "2024-01-15T11:00:00.000Z"
 *         },
 *         "is_active": false,
 *         "created_at": "2024-01-15T11:00:00.000Z",
 *         "updated_at": "2024-01-15T11:00:00.000Z"
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 5,
 *       "totalPages": 1
 *     }
 *   }
 * }
 * 
 * Note: Only returns suggestions with status "pending_review"
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
 * Error Response (403):
 * {
 *   "success": false,
 *   "error": "Access denied"
 * }
 * 
 * Error Response (500):
 * {
 *   "success": false,
 *   "error": "Internal server error"
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { faqSuggestionService } from "../../services/faq-suggestion.service.js";

export async function getAllSuggestionsController(req: Request, res: Response): Promise<void> {
  try {
    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    // Get all pending suggestions
    const suggestions = await faqSuggestionService.getPendingSuggestions(limit * page);
    
    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedSuggestions = suggestions.slice(skip, skip + limit);
    const total = suggestions.length;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        suggestions: paginatedSuggestions,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    });
  } catch (error: any) {
    logger.error("Get all suggestions error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

