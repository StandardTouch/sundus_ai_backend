/**
 * GET /api/faqs/suggestions/:id
 * Get FAQ suggestion by ID
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - id: string (Suggestion ID)
 * 
 * Example Request:
 * GET /api/faqs/suggestions/507f1f77bcf86cd799439011
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "question": "What is your return policy?",
 *     "question_ar": "ما هي سياسة الإرجاع الخاصة بك؟",
 *     "answer": "",
 *     "answer_ar": "",
 *     "category": "policies",
 *     "vector_id": "",
 *     "source": "ai_suggested",
 *     "status": "pending_review",
 *     "ai_suggestion": {
 *       "source_conversation_id": "conv_12345",
 *       "source_message_id": "msg_67890",
 *       "confidence_score": 0.0,
 *       "suggested_at": "2024-01-15T10:30:00.000Z",
 *       "reviewed_by": null,
 *       "reviewed_at": null,
 *       "review_notes": null
 *     },
 *     "usage_count": 0,
 *     "is_active": false,
 *     "created_at": "2024-01-15T10:30:00.000Z",
 *     "updated_at": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Suggestion ID is required"
 * }
 * 
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "Suggestion not found"
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

export async function getSuggestionByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      res.status(400).json({
        success: false,
        error: "Suggestion ID is required"
      });
      return;
    }

    const suggestion = await faqSuggestionService.getSuggestionById(id);

    if (!suggestion) {
      res.status(404).json({
        success: false,
        error: "Suggestion not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: suggestion
    });
  } catch (error: any) {
    logger.error("Get suggestion by ID error", { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

