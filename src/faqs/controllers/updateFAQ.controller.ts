/**
 * PUT /api/faqs/:id
 * Update FAQ (admin or customer_support only)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - id: string (FAQ ID)
 * 
 * Request Body (all fields optional):
 * {
 *   "question": "Updated question?",
 *   "question_ar": "سؤال محدث؟",  // Optional: Arabic question
 *   "answer": "Updated answer...",
 *   "answer_ar": "إجابة محدثة...",
 *   "category": "policies",  // MUST BE IN ENGLISH - e.g., "policies", "shipping", "payment"
 *   "is_active": true,
 *   "status": "active"  // Options: "active", "pending_review", "rejected"
 * }
 * 
 * IMPORTANT: The category field MUST ALWAYS be in English, regardless of the FAQ's language.
 * 
 * Example Request:
 * PUT /api/faqs/507f1f77bcf86cd799439011
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "question": "Updated question?",
 *     "question_ar": "سؤال محدث؟",
 *     "answer": "Updated answer...",
 *     "answer_ar": "إجابة محدثة...",
 *     "category": "policies",
 *     "vector_id": "507f1f77bcf86cd799439011",
 *     "source": "manual",
 *     "status": "active",
 *     "usage_count": 45,
 *     "is_active": true,
 *     "created_at": "2024-01-01T08:00:00.000Z",
 *     "updated_at": "2024-01-15T11:00:00.000Z"
 *   }
 * }
 * 
 * Note: 
 * - If FAQ is active (is_active: true) and status is 'active', it will be synced to Pinecone
 * - If FAQ is deactivated or status is not 'active', it will be removed from Pinecone
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "FAQ ID is required"
 * }
 * 
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "FAQ not found"
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
import { faqRepository } from "../../repositories/faq.repository.js";
import { faqService } from "../../services/faq.service.js";

export async function updateFAQController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const currentUser = (req as any).user;

    // Validate FAQ ID
    if (!id) {
      res.status(400).json({
        success: false,
        error: "FAQ ID is required"
      });
      return;
    }

    // Check if FAQ exists
    const existingFAQ = await faqRepository.findById(id);
    if (!existingFAQ) {
      res.status(404).json({
        success: false,
        error: "FAQ not found"
      });
      return;
    }

    // Update FAQ in MongoDB
    const updatedFAQ = await faqRepository.update(id, updateData);

    // Sync to Pinecone based on final state
    // Only sync if FAQ is active and status is 'active'
    if (updatedFAQ.is_active && updatedFAQ.status === 'active') {
      try {
        await faqService.syncFAQToPinecone(updatedFAQ);
      } catch (pineconeError: any) {
        logger.error("Failed to sync FAQ to Pinecone", {
          error: pineconeError.message,
          faqId: id
        });
        // Continue even if Pinecone sync fails
      }
    } else {
      // If FAQ is not active or status is not 'active', remove from Pinecone
      try {
        await faqService.removeFAQFromPinecone(id);
      } catch (pineconeError: any) {
        logger.error("Failed to remove FAQ from Pinecone", {
          error: pineconeError.message,
          faqId: id
        });
      }
    }

    logger.info("FAQ updated", {
      faqId: id,
      updated_by: currentUser.username,
      changes: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      data: updatedFAQ
    });
  } catch (error: any) {
    logger.error("Update FAQ error", { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}

