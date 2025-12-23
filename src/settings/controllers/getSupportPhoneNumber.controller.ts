/**
 * GET /api/settings/support-phone-number
 * Get support phone number
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "phone_number": "+966 9200 09339"
 *   }
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

export async function getSupportPhoneNumberController(req: Request, res: Response): Promise<void> {
  try {
    const phoneNumber = await supportSettingsService.getSupportPhoneNumber();

    res.status(200).json({
      success: true,
      data: {
        phone_number: phoneNumber
      }
    });
  } catch (error: any) {
    logger.error("Get support phone number error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

