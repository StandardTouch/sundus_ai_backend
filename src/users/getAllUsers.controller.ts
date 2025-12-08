/**
 * GET /api/users
 * Get all users (paginated with search and filters)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin only)
 * 
 * Query Parameters:
 * - page: number (default: 1) - Page number for pagination
 * - limit: number (default: 10) - Number of items per page (max: 100)
 * - search: string (optional) - Search in username, email, or full_name (case-insensitive)
 * - role: 'admin' | 'customer_support' (optional) - Filter by role
 * - is_active: boolean (optional) - Filter by active status (true/false)
 * - sort_by: string (optional) - Field to sort by (default: 'created_at')
 *   Available fields: username, email, full_name, role, created_at, updated_at, last_login_at
 * - sort_order: 'asc' | 'desc' (optional) - Sort order (default: 'desc')
 * 
 * Example Request:
 * GET /api/users?page=1&limit=20&search=admin&role=admin&is_active=true&sort_by=created_at&sort_order=desc
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
 *       "limit": 20,
 *       "total": 25,
 *       "totalPages": 2
 *     }
 *   }
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid limit. Maximum is 100"
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
import { logger } from "../utils/logger.js";
import { userService } from "./user.service.js";

export async function getAllUsersController(req: Request, res: Response): Promise<void> {
  try {
    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    // Filter parameters
    const role = req.query.role as string | undefined;
    const isActive = req.query.is_active as string | undefined;
    const search = req.query.search as string | undefined;
    
    // Sort parameters
    const sortBy = req.query.sort_by as string | undefined;
    const sortOrder = (req.query.sort_order as "asc" | "desc") || "desc";

    // Validate sort_by field
    const allowedSortFields = ["username", "email", "full_name", "role", "created_at", "updated_at", "last_login_at"];
    if (sortBy && !allowedSortFields.includes(sortBy)) {
      res.status(400).json({
        success: false,
        error: `Invalid sort_by field. Allowed fields: ${allowedSortFields.join(", ")}`
      });
      return;
    }

    // Validate sort_order
    if (sortOrder && !["asc", "desc"].includes(sortOrder)) {
      res.status(400).json({
        success: false,
        error: "Invalid sort_order. Must be 'asc' or 'desc'"
      });
      return;
    }

    const filters: any = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.is_active = isActive === "true";
    if (search) filters.search = search;
    if (sortBy) filters.sort_by = sortBy;
    if (sortOrder) filters.sort_order = sortOrder;

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

