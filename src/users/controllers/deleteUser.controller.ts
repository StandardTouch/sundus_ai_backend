/**
 * DELETE /api/users/:id
 * Delete user (admin only, cannot delete self)
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
 *   "message": "User deleted successfully"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Cannot delete your own account"
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

export async function deleteUserController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Validate user ID
    if (!id) {
      res.status(400).json({
        success: false,
        error: "User ID is required"
      });
      return;
    }

    // Prevent self-deletion
    if (id === currentUser._id) {
      res.status(400).json({
        success: false,
        error: "Cannot delete your own account"
      });
      return;
    }

    const result = await userService.deleteUser(id);

    if (!result.success) {
      res.status(result.statusCode || 404).json({
        success: false,
        error: result.error
      });
      return;
    }

    logger.info("User deleted", {
      userId: id,
      deleted_by: currentUser.username
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    logger.error("Delete user error", { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

