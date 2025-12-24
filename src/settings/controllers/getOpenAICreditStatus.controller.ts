/**
 * GET /api/settings/openai-credit-status
 * Get OpenAI credit availability status
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Example Request:
 * GET /api/settings/openai-credit-status
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "credits_available": false,
 *     "recharge_required": true,
 *     "last_updated": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 * 
 * Response Fields:
 * - credits_available: boolean - Whether OpenAI credits are currently available
 * - recharge_required: boolean - Whether OpenAI account recharge is required (inverse of credits_available)
 * - last_updated: Date (optional) - When the status was last updated
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
import { openaiCreditService } from "../../services/openai-credit.service.js";
import { logger } from "../../utils/logger.js";

export async function getOpenAICreditStatusController(req: Request, res: Response): Promise<void> {
  try {
    const status = await openaiCreditService.getCreditStatus();

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error: any) {
    logger.error("Get OpenAI credit status controller error", {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: "Failed to get OpenAI credit status",
      details: error.message
    });
  }
}

