/**
 * DELETE /api/faqs/:id
 * Delete FAQ (admin or customer_support only)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - id: string (FAQ ID)
 * 
 * Example Request:
 * DELETE /api/faqs/507f1f77bcf86cd799439011
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "FAQ deleted successfully"
 * }
 * 
 * Note: FAQ will be removed from both MongoDB and Pinecone
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

export async function deleteFAQController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
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

    // Remove from Pinecone first
    try {
      await faqService.removeFAQFromPinecone(id);
    } catch (pineconeError: any) {
      logger.error("Failed to remove FAQ from Pinecone", {
        error: pineconeError.message,
        faqId: id
      });
      // Continue with MongoDB deletion even if Pinecone removal fails
    }

    // Delete from MongoDB
    await faqRepository.delete(id);

    logger.info("FAQ deleted", {
      faqId: id,
      deleted_by: currentUser.username
    });

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully"
    });
  } catch (error: any) {
    logger.error("Delete FAQ error", { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}

