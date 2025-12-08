/**
 * GET /api/auth/me
 * Get current authenticated user
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "username": "admin",
 *     "email": "admin@example.com",
 *     "full_name": "Admin User",
 *     "role": "admin",
 *     "is_active": true,
 *     "last_login_at": "2024-01-15T10:30:00.000Z",
 *     "created_at": "2024-01-01T00:00:00.000Z",
 *     "updated_at": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 * 
 * Error Response (401):
 * {
 *   "success": false,
 *   "error": "Unauthorized"
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../utils/logger.js";

export async function meController(req: Request, res: Response): Promise<void> {
  try {
    // User is attached to request by auth middleware
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error("Get current user error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

