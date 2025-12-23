/**
 * PUT /api/settings/support-phone-number
 * Update support phone number
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Request Body:
 * {
 *   "phone_number": "+966 9200 09339"
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "phone_number": "+966 9200 09339"
 *   },
 *   "message": "Support phone number updated successfully"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Phone number is required"
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
import { supportSettingsService } from "../../services/support-settings.service.js";

export async function updateSupportPhoneNumberController(req: Request, res: Response): Promise<void> {
  try {
    const { phone_number } = req.body;
    const currentUser = (req as any).user;

    if (!phone_number || typeof phone_number !== "string") {
      res.status(400).json({
        success: false,
        error: "Phone number is required and must be a string"
      });
      return;
    }

    const result = await supportSettingsService.updateSupportPhoneNumber(
      phone_number,
      currentUser._id
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error || "Failed to update support phone number"
      });
      return;
    }

    logger.info("Support phone number updated", {
      phone_number,
      updated_by: currentUser.username
    });

    res.status(200).json({
      success: true,
      data: {
        phone_number
      },
      message: "Support phone number updated successfully"
    });
  } catch (error: any) {
    logger.error("Update support phone number error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

