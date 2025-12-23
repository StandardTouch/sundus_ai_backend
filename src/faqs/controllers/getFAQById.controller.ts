/**
 * GET /api/faqs/:id
 * Get FAQ by ID
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - id: string (FAQ ID)
 * 
 * Example Request:
 * GET /api/faqs/507f1f77bcf86cd799439011
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "question": "What is your return policy?",
 *     "answer": "You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return.",
 *     "answer_ar": "يمكنك إرجاع العناصر خلال 30 يومًا من الشراء. يجب أن تكون العناصر غير مستخدمة وفي التغليف الأصلي. يرجى الاتصال بخدمة العملاء لبدء الإرجاع.",
 *     "category": "policies",
 *     "vector_id": "507f1f77bcf86cd799439011",
 *     "source": "manual",
 *     "status": "active",
 *     "usage_count": 45,
 *     "last_used_at": "2024-01-15T10:30:00.000Z",
 *     "is_active": true,
 *     "created_at": "2024-01-01T08:00:00.000Z",
 *     "updated_at": "2024-01-15T10:30:00.000Z"
 *   }
 * }
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

export async function getFAQByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate FAQ ID
    if (!id) {
      res.status(400).json({
        success: false,
        error: "FAQ ID is required"
      });
      return;
    }

    const faq = await faqRepository.findById(id);

    if (!faq) {
      res.status(404).json({
        success: false,
        error: "FAQ not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: faq
    });
  } catch (error: any) {
    logger.error("Get FAQ by ID error", { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

