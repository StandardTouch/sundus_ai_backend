/**
 * POST /api/auth/verify-otp
 * Verify OTP and receive a password reset token
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "otp_code": "123456"
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "OTP verified successfully",
 *   "reset_token": "a1b2c3d4e5f6...",
 *   "expires_in_minutes": 30
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Email and OTP code are required"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid or expired OTP"
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
import { otpService } from "../services/otp.service.js";

export async function verifyOTPController(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp_code } = req.body;

    // Validate input
    if (!email || !otp_code) {
      res.status(400).json({
        success: false,
        error: "Email and OTP code are required"
      });
      return;
    }

    // Verify OTP and get reset token
    const verifyResult = await otpService.verifyPasswordResetOTP(
      email,
      otp_code,
      req.ip || req.socket.remoteAddress
    );

    if (!verifyResult.success || !verifyResult.token) {
      res.status(400).json({
        success: false,
        error: verifyResult.error || "Invalid or expired OTP"
      });
      return;
    }

    logger.info("OTP verified successfully", {
      email,
      userId: verifyResult.userId,
      ip: req.ip || req.socket.remoteAddress
    });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      reset_token: verifyResult.token,
      expires_in_minutes: 30 // Reset token expires in 30 minutes
    });
  } catch (error) {
    logger.error("Verify OTP error", { error, body: req.body });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

