/**
 * PUT /api/users/:id
 * Update user (admin only)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin only)
 * 
 * URL Parameters:
 * - id: string (user ID)
 * 
 * Request Body (all fields optional):
 * {
 *   "email": "newemail@example.com",
 *   "password": "newPassword123",
 *   "full_name": "Updated Name",
 *   "role": "customer_support",
 *   "is_active": false
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439012",
 *     "username": "support1",
 *     "email": "newemail@example.com",
 *     "full_name": "Updated Name",
 *     "role": "customer_support",
 *     "is_active": false,
 *     "updated_at": "2024-01-15T11:00:00.000Z"
 *   }
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid role. Must be 'admin' or 'customer_support'"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Email already exists"
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
import type { UpdateUserDto } from "../../models/user.model.js";

export async function updateUserController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updateData: UpdateUserDto = req.body;

    // Validate user ID
    if (!id) {
      res.status(400).json({
        success: false,
        error: "User ID is required"
      });
      return;
    }

    // Validate role if provided
    if (updateData.role && !["admin", "customer_support"].includes(updateData.role)) {
      res.status(400).json({
        success: false,
        error: "Invalid role. Must be 'admin' or 'customer_support'"
      });
      return;
    }

    const result = await userService.updateUser(id, updateData);

    if (!result.success) {
      res.status(result.statusCode || 404).json({
        success: false,
        error: result.error
      });
      return;
    }

    logger.info("User updated", {
      userId: id,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error("Update user error", { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

