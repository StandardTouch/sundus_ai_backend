/**
 * POST /api/faqs/suggestions/:id/reject
 * Reject an FAQ suggestion
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - id: string (Suggestion ID)
 * 
 * Request Body (optional):
 * {
 *   "review_notes": "This question is already covered by existing FAQ"  // Optional: Rejection reason/notes
 * }
 * 
 * Example Request:
 * POST /api/faqs/suggestions/507f1f77bcf86cd799439011/reject
 * 
 * Request Body Example:
 * {
 *   "review_notes": "This question is already covered by FAQ #123. User should be directed to existing FAQ."
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "Suggestion rejected"
 * }
 * 
 * Note: 
 * - Rejected suggestions are marked as inactive and will not be synced to Pinecone
 * - Review notes are stored for future reference and analytics
 * - Rejected suggestions can be viewed in the FAQ list with status "rejected"
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

export async function rejectSuggestionController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { review_notes } = req.body;
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

    // Update status to rejected
    const updatePayload: any = {
      status: 'rejected',
      is_active: false,
      ai_suggestion: {
        ...suggestion.ai_suggestion,
        reviewed_by: currentUser.username,
        reviewed_at: new Date(),
        review_notes: review_notes || undefined
      }
    };

    await faqRepository.update(id, updatePayload);

    logger.info("FAQ suggestion rejected", {
      suggestionId: id,
      rejected_by: currentUser.username,
      review_notes
    });

    res.status(200).json({
      success: true,
      message: "Suggestion rejected"
    });
  } catch (error: any) {
    logger.error("Reject suggestion error", { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}

