/**
 * GET /api/faqs/categories
 * Get all unique FAQ categories
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Example Request:
 * GET /api/faqs/categories
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "categories": [
 *       "policies",
 *       "shipping",
 *       "payment",
 *       "orders",
 *       "products",
 *       "returns",
 *       "account",
 *       "warranty",
 *       "general"
 *     ],
 *     "count": 9
 *   }
 * }
 * 
 * Note: Returns all unique categories from FAQs, including null/undefined categories
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
import { getDatabase } from "../../config/database.js";

export async function getAllCategoriesController(req: Request, res: Response): Promise<void> {
  try {
    const db = getDatabase();
    const faqsCollection = db.collection("faqs");

    // Get distinct categories from FAQs collection
    const categories = await faqsCollection.distinct("category");

    // Filter out null/undefined and sort alphabetically
    const filteredCategories = categories
      .filter((cat): cat is string => cat !== null && cat !== undefined)
      .sort();

    logger.info("Retrieved FAQ categories", {
      count: filteredCategories.length
    });

    res.status(200).json({
      success: true,
      data: {
        categories: filteredCategories,
        count: filteredCategories.length
      }
    });
  } catch (error: any) {
    logger.error("Get all categories error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

