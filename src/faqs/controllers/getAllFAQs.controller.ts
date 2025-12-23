/**
 * GET /api/faqs
 * Get all FAQs (paginated with search and filters)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Query Parameters:
 * - page: number (default: 1) - Page number for pagination
 * - limit: number (default: 10, max: 100) - Number of items per page
 * - search: string (optional) - Search in question or answer (case-insensitive)
 * - category: string (optional) - Filter by category (MUST BE IN ENGLISH - e.g., "policies", "shipping", "payment")
 * - status: 'active' | 'pending_review' | 'rejected' (optional) - Filter by status
 * - source: 'manual' | 'ai_suggested' (optional) - Filter by source
 * - is_active: boolean (optional) - Filter by active status (true/false)
 * - has_arabic: boolean (optional) - Filter by Arabic content availability
 *   - true: Only FAQs with Arabic translations (question_ar or answer_ar exists)
 *   - false: Only FAQs without Arabic translations (no question_ar or answer_ar)
 * 
 * Example Request:
 * GET /api/faqs?page=1&limit=20&category=policies&status=active&is_active=true&search=return&has_arabic=true
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "faqs": [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "question": "What is your return policy?",
 *         "answer": "You can return items within 30 days of purchase...",
 *         "answer_ar": "يمكنك إرجاع العناصر خلال 30 يومًا من الشراء...",
 *         "category": "policies",
 *         "vector_id": "507f1f77bcf86cd799439011",
 *         "source": "manual",
 *         "status": "active",
 *         "usage_count": 45,
 *         "last_used_at": "2024-01-15T10:30:00.000Z",
 *         "is_active": true,
 *         "created_at": "2024-01-01T08:00:00.000Z",
 *         "updated_at": "2024-01-15T10:30:00.000Z"
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 25,
 *       "totalPages": 2
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

export async function getAllFAQsController(req: Request, res: Response): Promise<void> {
  try {
    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    // Filter parameters
    const category = req.query.category as string | undefined;
    const status = req.query.status as 'active' | 'pending_review' | 'rejected' | undefined;
    const source = req.query.source as 'manual' | 'ai_suggested' | undefined;
    const isActive = req.query.is_active as string | undefined;
    const search = req.query.search as string | undefined;
    const hasArabic = req.query.has_arabic as string | undefined;

    const filters: any = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (source) filters.source = source;
    if (isActive !== undefined) filters.is_active = isActive === "true";
    if (search) filters.search = search;
    if (hasArabic !== undefined) filters.has_arabic = hasArabic === "true";

    const result = await faqRepository.findAll(skip, limit, filters);

    const totalPages = Math.ceil(result.total / limit);

    res.status(200).json({
      success: true,
      data: {
        faqs: result.faqs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages
        }
      }
    });
  } catch (error: any) {
    logger.error("Get all FAQs error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

