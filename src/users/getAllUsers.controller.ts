/**
 * GET /api/users
 * Get all users (paginated)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin only)
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - role: 'admin' | 'customer_support' (optional filter)
 * - is_active: boolean (optional filter)
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "users": [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "username": "admin",
 *         "email": "admin@example.com",
 *         "full_name": "Admin User",
 *         "role": "admin",
 *         "is_active": true,
 *         "last_login_at": "2024-01-15T10:30:00.000Z",
 *         "created_at": "2024-01-01T00:00:00.000Z",
 *         "updated_at": "2024-01-15T10:30:00.000Z"
 *       },
 *       {
 *         "_id": "507f1f77bcf86cd799439012",
 *         "username": "support1",
 *         "email": "support1@example.com",
 *         "full_name": "Support User",
 *         "role": "customer_support",
 *         "is_active": true,
 *         "last_login_at": "2024-01-14T09:00:00.000Z",
 *         "created_at": "2024-01-10T00:00:00.000Z",
 *         "updated_at": "2024-01-14T09:00:00.000Z"
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 25,
 *       "totalPages": 3
 *     }
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
 *   "error": "Admin access required"
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { userService } from "./user.service.js";

export async function getAllUsersController(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string | undefined;
    const isActive = req.query.is_active as string | undefined;

    const filters: any = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.is_active = isActive === "true";

    const result = await userService.getAllUsers(page, limit, filters);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error("Get all users error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

