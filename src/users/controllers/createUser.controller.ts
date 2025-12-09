/**
 * POST /api/users
 * Create new user (admin only)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin only)
 * 
 * Request Body:
 * {
 *   "username": "support1",
 *   "email": "support1@example.com",
 *   "password": "securePassword123",
 *   "full_name": "Support User",
 *   "role": "customer_support",  // Options: "admin" | "customer_support"
 *   "is_active": true
 * }
 * 
 * Success Response (201):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439012",
 *     "username": "support1",
 *     "email": "support1@example.com",
 *     "full_name": "Support User",
 *     "role": "customer_support",
 *     "is_active": true,
 *     "created_by": "507f1f77bcf86cd799439011",
 *     "created_at": "2024-01-15T10:30:00.000Z",
 *     "updated_at": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Missing required fields: username, email, password, full_name, role"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid role. Must be 'admin' or 'customer_support'"
 * }
 * 
 * Role Options:
 * - "admin": Full access to all features
 * - "customer_support": Access to FAQ management and smart FAQ suggestions
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Username or email already exists"
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
import type { CreateUserDto } from "../../models/user.model.js";

export async function createUserController(req: Request, res: Response): Promise<void> {
  try {
    const createData: CreateUserDto = req.body;
    const currentUser = (req as any).user;

    // Validate required fields
    if (!createData.username || !createData.email || !createData.password || !createData.full_name || !createData.role) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: username, email, password, full_name, role"
      });
      return;
    }

    // Validate role
    if (!["admin", "customer_support"].includes(createData.role)) {
      res.status(400).json({
        success: false,
        error: "Invalid role. Must be 'admin' or 'customer_support'"
      });
      return;
    }

    const result = await userService.createUser(createData, currentUser._id);

    if (!result.success) {
      res.status(result.statusCode || 400).json({
        success: false,
        error: result.error
      });
      return;
    }

    logger.info("User created", {
      username: createData.username,
      role: createData.role,
      created_by: currentUser.username
    });

    res.status(201).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error("Create user error", { error, body: req.body });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

