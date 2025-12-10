/**
 * POST /api/settings/webhook/toggle
 * Toggle webhook activation status
 * 
 * Headers:
 * Authorization: Bearer <token> (admin only)
 * 
 * Example Request:
 * POST /api/settings/webhook/toggle
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "status": "enabled" | "disabled",
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "key": "webhook_active",
 *     "value": false,
 *     "description": "Enable or disable webhook processing",
 *     "updated_by": "507f1f77bcf86cd799439012",
 *     "created_at": "2024-01-01T00:00:00.000Z",
 *     "updated_at": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 * 
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "Setting not found"
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
 *   "error": "Admin access required"
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
import { settingsService } from "../services/settings.service.js";

export async function toggleWebhookStatusController(req: Request, res: Response): Promise<void> {
  try {
    // Get user ID from request (set by auth middleware)
    const userId = (req as any).user?._id;

    const result = await settingsService.toggleSetting("webhook_active", userId);

    if (!result.success) {
      res.status(result.statusCode || 500).json({
        success: false,
        error: result.error
      });
      return;
    }

    const status = result.data?.value ? "WhatsappAI AI enabled" : "Whatsapp AI disabled";
    
    res.status(200).json({
      success: true,
      status: status,
      data: result.data
    });
  } catch (error) {
    logger.error("Toggle webhook status error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

