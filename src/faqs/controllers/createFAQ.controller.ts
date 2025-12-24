/**
 * POST /api/faqs
 * Create new FAQ (admin or customer_support only)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Request Body:
 * {
 *   "question": "What is your return policy?",
 *   "question_ar": "ما هي سياسة الإرجاع الخاصة بك؟",  // Optional: Arabic question
 *   "answer": "You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return.",
 *   "answer_ar": "يمكنك إرجاع العناصر خلال 30 يومًا من الشراء. يجب أن تكون العناصر غير مستخدمة وفي التغليف الأصلي. يرجى الاتصال بخدمة العملاء لبدء الإرجاع.",
 *   "category": "policies"  // Optional: MUST BE IN ENGLISH - e.g., "policies", "shipping", "payment", "orders"
 * }
 * 
 * Required Fields:
 * - question: string (English question)
 * - answer: string (English answer)
 * 
 * Optional Fields:
 * - question_ar: string (Arabic question)
 * - answer_ar: string (Arabic answer)
 * - category: string (FAQ category - MUST ALWAYS BE IN ENGLISH)
 * 
 * IMPORTANT: The category field MUST ALWAYS be in English, regardless of the FAQ's language.
 * Examples: "policies", "shipping", "payment", "orders", "products", "returns", "account", "warranty", "general"
 * 
 * Success Response (201):
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
 *     "source": "manual",
 *     "status": "active",
 *     "usage_count": 0,
 *     "is_active": true,
 *     "created_at": "2024-01-15T10:30:00.000Z",
 *     "updated_at": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 * 
 * Note: FAQ is automatically synced to Pinecone for semantic search after creation.
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Missing required fields: question, answer"
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
import type { CreateFAQDto } from "../../models/faq.model.js";

export async function createFAQController(req: Request, res: Response): Promise<void> {
  try {
    const createData: CreateFAQDto = req.body;
    const currentUser = (req as any).user;

    // Validate required fields
    if (!createData.question || !createData.answer) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: question, answer"
      });
      return;
    }

    // Create FAQ in MongoDB
    const faq = await faqRepository.create(createData);

    // Sync to Pinecone in background (non-blocking)
    // This allows the API to respond immediately while Pinecone sync happens asynchronously
    faqService.syncFAQToPinecone(faq).catch((pineconeError: any) => {
      logger.error("Failed to sync FAQ to Pinecone (background)", {
        error: pineconeError.message,
        faqId: faq._id,
        stack: pineconeError.stack
      });
      // FAQ is still created in MongoDB - sync can be retried later if needed
    });

    logger.info("FAQ created", {
      faqId: faq._id,
      question: faq.question,
      category: faq.category,
      created_by: currentUser.username
    });

    res.status(201).json({
      success: true,
      data: faq
    });
  } catch (error: any) {
    logger.error("Create FAQ error", { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}

