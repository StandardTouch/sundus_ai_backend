/**
 * POST /api/auth/logout
 * Logout current user (client-side token removal)
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 * 
 * Error Response (401):
 * {
 *   "success": false,
 *   "error": "Unauthorized"
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";

export async function logoutController(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;

    if (user) {
      logger.info("User logged out", {
        username: user.username,
        role: user.role
      });
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    logger.error("Logout error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

