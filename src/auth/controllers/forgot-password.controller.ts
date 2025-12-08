/**
 * POST /api/auth/forgot-password
 * Request password reset OTP
 * 
 * Request Body:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "OTP has been sent to your email"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Email is required"
 * }
 * 
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "User not found"
 * }
 * 
 * Error Response (429):
 * {
 *   "success": false,
 *   "error": "Too many requests. Please try again later"
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { userRepository } from "../../repositories/user.repository.js";
import { otpService } from "../services/otp.service.js";
import { sendHtmlEmail, sendTextEmail } from "../../utils/email.util.js";
import { generateOTPEmailTemplate, generateOTPEmailText } from "../../templates/email/otp-email.template.js";

export async function forgotPasswordController(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      res.status(400).json({
        success: false,
        error: "Email is required"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: "Invalid email format"
      });
      return;
    }

    // Find user by email
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists (security best practice)
      logger.warn("Password reset requested for non-existent email", { email });
      res.status(200).json({
        success: true,
        message: "If the email exists, an OTP has been sent"
      });
      return;
    }

    // Check if account is active
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        error: "Account is inactive"
      });
      return;
    }

    // Get client IP
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    // Create OTP
    const otpResult = await otpService.createPasswordResetOTP(
      email,
      user._id!,
      clientIp
    );

    if (!otpResult.success || !otpResult.otp) {
      res.status(500).json({
        success: false,
        error: otpResult.error || "Failed to generate OTP"
      });
      return;
    }

    // Send OTP via email
    const emailResult = await sendHtmlEmail(
      email,
      "Password Reset OTP - Sundus AI",
      generateOTPEmailTemplate(otpResult.otp, user.full_name, 10),
      generateOTPEmailText(otpResult.otp, user.full_name, 10)
    );

    if (!emailResult.success) {
      logger.error("Failed to send OTP email", {
        email,
        error: emailResult.error
      });
      res.status(500).json({
        success: false,
        error: "Failed to send OTP email. Please try again later"
      });
      return;
    }

    logger.info("Password reset OTP sent", {
      email,
      userId: user._id,
      ip: clientIp
    });

    res.status(200).json({
      success: true,
      message: "OTP has been sent to your email"
    });
  } catch (error) {
    logger.error("Forgot password error", { error, body: req.body });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

