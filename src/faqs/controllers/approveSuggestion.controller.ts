/**
 * POST /api/faqs/suggestions/:id/approve
 * Approve and activate an FAQ suggestion
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - id: string (Suggestion ID)
 * 
 * Request Body (all fields optional - can edit before approving):
 * {
 *   "answer": "You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return.",
 *   "answer_ar": "يمكنك إرجاع العناصر خلال 30 يومًا من الشراء. يجب أن تكون العناصر غير مستخدمة وفي التغليف الأصلي. يرجى الاتصال بخدمة العملاء لبدء الإرجاع.",
 *   "category": "policies"  // MUST BE IN ENGLISH - e.g., "policies", "shipping", "payment"
 * }
 * 
 * Example Request:
 * POST /api/faqs/suggestions/507f1f77bcf86cd799439011/approve
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "question": "What is your return policy?",
 *     "question_ar": "ما هي سياسة الإرجاع الخاصة بك؟",
 *     "answer": "You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return.",
 *     "answer_ar": "يمكنك إرجاع العناصر خلال 30 يومًا من الشراء. يجب أن تكون العناصر غير مستخدمة وفي التغليف الأصلي. يرجى الاتصال بخدمة العملاء لبدء الإرجاع.",
 *     "category": "policies",
 *     "vector_id": "507f1f77bcf86cd799439011",
 *     "source": "ai_suggested",
 *     "status": "active",
 *     "ai_suggestion": {
 *       "source_conversation_id": "conv_12345",
 *       "source_message_id": "msg_67890",
 *       "confidence_score": 0.0,
 *       "suggested_at": "2024-01-15T10:30:00.000Z",
 *       "reviewed_by": "admin",
 *       "reviewed_at": "2024-01-15T12:00:00.000Z",
 *       "review_notes": null
 *     },
 *     "usage_count": 0,
 *     "is_active": true,
 *     "created_at": "2024-01-15T10:30:00.000Z",
 *     "updated_at": "2024-01-15T12:00:00.000Z"
 *   },
 *   "message": "Suggestion approved and activated"
 * }
 * 
 * Note: 
 * - Approved suggestion becomes an active FAQ and is automatically synced to Pinecone
 * - If answer fields are empty, admin should fill them before approving (or can be filled later via update)
 * - Category MUST be in English (e.g., "policies", "shipping", "payment")
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Suggestion ID is required"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Suggestion is already active"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Suggestion is already rejected"
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
import { faqRepository } from "../../repositories/faq.repository.js";
import { faqService } from "../../services/faq.service.js";

export async function approveSuggestionController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body; // Optional: answer, answer_ar, category
    const currentUser = (req as any).user;

    // Validate ID
    if (!id) {
      res.status(400).json({
        success: false,
        error: "Suggestion ID is required"
      });
      return;
    }

    // Get suggestion
    const suggestion = await faqSuggestionService.getSuggestionById(id);
    if (!suggestion) {
      res.status(404).json({
        success: false,
        error: "Suggestion not found"
      });
      return;
    }

    // Check if already reviewed
    if (suggestion.status !== 'pending_review') {
      res.status(400).json({
        success: false,
        error: `Suggestion is already ${suggestion.status}`
      });
      return;
    }

    // Update with any provided data (answer, answer_ar, category)
    const updatePayload: any = {
      status: 'active',
      is_active: true,
      ai_suggestion: {
        ...suggestion.ai_suggestion,
        reviewed_by: currentUser.username,
        reviewed_at: new Date()
      }
    };

    // Add optional fields if provided
    if (updateData.answer) updatePayload.answer = updateData.answer;
    if (updateData.answer_ar) updatePayload.answer_ar = updateData.answer_ar;
    if (updateData.category) updatePayload.category = updateData.category;

    // Update FAQ
    const approvedFAQ = await faqRepository.update(id, updatePayload);

    // Sync to Pinecone in background (non-blocking)
    // This allows the API to respond immediately while Pinecone sync happens asynchronously
    faqService.syncFAQToPinecone(approvedFAQ).catch((pineconeError: any) => {
      logger.error("Failed to sync approved FAQ to Pinecone (background)", {
        error: pineconeError.message,
        faqId: id,
        stack: pineconeError.stack
      });
      // FAQ is still approved in MongoDB - sync can be retried later if needed
    });

    logger.info("FAQ suggestion approved", {
      suggestionId: id,
      approved_by: currentUser.username
    });

    res.status(200).json({
      success: true,
      data: approvedFAQ,
      message: "Suggestion approved and activated"
    });
  } catch (error: any) {
    logger.error("Approve suggestion error", { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}

