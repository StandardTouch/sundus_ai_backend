/**
 * GET /api/users/:id
 * Get user by ID
 * 
 * Headers:
 * Authorization: Bearer <token> (admin only)
 * 
 * URL Parameters:
 * - id: string (user ID)
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
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "User not found"
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
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { userService } from "../services/user.service.js";

export async function getUserByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await userService.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error("Get user by ID error", { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

