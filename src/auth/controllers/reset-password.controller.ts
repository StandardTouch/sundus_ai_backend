/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 * 
 * Request Body:
 * {
 *   "token": "a1b2c3d4e5f6...",
 *   "new_password": "newSecurePassword123"
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "Password has been reset successfully"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Token and new password are required"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Password must be at least 8 characters long"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid or expired reset token"
 * }
 * 
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "User not found"
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
import { userRepository } from "../../repositories/user.repository.js";
import { passwordResetTokenService } from "../services/password-reset-token.service.js";
import { userService } from "../../users/user.service.js";

export async function resetPasswordController(req: Request, res: Response): Promise<void> {
  try {
    const { token, new_password } = req.body;

    // Validate input
    if (!token || !new_password) {
      res.status(400).json({
        success: false,
        error: "Token and new password are required"
      });
      return;
    }

    // Validate password strength
    if (new_password.length < 8) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long"
      });
      return;
    }

    // Verify reset token
    const verifyResult = await passwordResetTokenService.verifyPasswordResetToken(token);

    if (!verifyResult.success || !verifyResult.userId || !verifyResult.email) {
      res.status(400).json({
        success: false,
        error: verifyResult.error || "Invalid or expired reset token"
      });
      return;
    }

    // Verify user exists
    const user = await userRepository.findById(verifyResult.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    // Update password
    const updateResult = await userService.updateUser(verifyResult.userId, {
      password: new_password
    });

    if (!updateResult.success) {
      res.status(500).json({
        success: false,
        error: updateResult.error || "Failed to reset password"
      });
      return;
    }

    // Mark token as used
    await passwordResetTokenService.markTokenAsUsed(token);

    logger.info("Password reset successful", {
      email: verifyResult.email,
      userId: verifyResult.userId,
      ip: req.ip || req.socket.remoteAddress
    });

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully"
    });
  } catch (error) {
    logger.error("Reset password error", { error, body: req.body });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

