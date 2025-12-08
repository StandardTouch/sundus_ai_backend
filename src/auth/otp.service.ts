/**
 * OTP Service
 * Handles OTP generation, hashing, and verification for password reset
 */

import crypto from "crypto";
import bcrypt from "bcrypt";
import { passwordResetOTPRepository } from "../repositories/password-reset-otp.repository.js";
import { passwordResetTokenService } from "./password-reset-token.service.js";
import { logger } from "../utils/logger.js";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
const BCRYPT_ROUNDS = 10;

export class OTPService {
  /**
   * Generate 6-digit OTP
   */
  generateOTP(): string {
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
  }

  /**
   * Hash OTP for storage
   */
  async hashOTP(otp: string): Promise<string> {
    return bcrypt.hash(otp, BCRYPT_ROUNDS);
  }

  /**
   * Verify OTP
   */
  async verifyOTP(otp: string, otpHash: string): Promise<boolean> {
    return bcrypt.compare(otp, otpHash);
  }

  /**
   * Create and store password reset OTP
   */
  async createPasswordResetOTP(
    email: string,
    userId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      // Invalidate any existing active OTPs for this email
      await passwordResetOTPRepository.invalidateAllForEmail(email);

      // Generate OTP
      const otp = this.generateOTP();
      const otpHash = await this.hashOTP(otp);

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

      // Store OTP
      await passwordResetOTPRepository.create({
        email,
        user_id: userId,
        otp_code: otp,
        otp_hash: otpHash,
        expires_at: expiresAt,
        ip_address: ipAddress,
      });

      logger.info("Password reset OTP created", {
        email,
        userId,
        expiresAt,
      });

      return {
        success: true,
        otp, // Return plain OTP for sending via email
      };
    } catch (error: any) {
      logger.error("OTP service create error", { error, email, userId });
      return {
        success: false,
        error: "Failed to create OTP",
      };
    }
  }

  /**
   * Verify password reset OTP and generate reset token
   */
  async verifyPasswordResetOTP(
    email: string,
    otpCode: string,
    ipAddress?: string
  ): Promise<{ success: boolean; token?: string; userId?: string; error?: string }> {
    try {
      // Find active OTP
      const otpRecord = await passwordResetOTPRepository.findActiveByEmail(email);

      if (!otpRecord) {
        return {
          success: false,
          error: "Invalid or expired OTP",
        };
      }

      // Verify OTP code
      const isValid = await this.verifyOTP(otpCode, otpRecord.otp_hash);

      if (!isValid) {
        return {
          success: false,
          error: "Invalid OTP code",
        };
      }

      // Mark OTP as used
      await passwordResetOTPRepository.markAsUsed(otpRecord._id!);

      // Generate password reset token
      const tokenResult = await passwordResetTokenService.createPasswordResetToken(
        email,
        otpRecord.user_id,
        ipAddress
      );

      if (!tokenResult.success || !tokenResult.token) {
        logger.error("Failed to create reset token after OTP verification", { email });
        return {
          success: false,
          error: "Failed to create reset token",
        };
      }

      logger.info("Password reset OTP verified and token created", {
        email,
        userId: otpRecord.user_id,
      });

      return {
        success: true,
        token: tokenResult.token,
        userId: otpRecord.user_id,
      };
    } catch (error: any) {
      logger.error("OTP service verify error", { error, email });
      return {
        success: false,
        error: "Failed to verify OTP",
      };
    }
  }
}

export const otpService = new OTPService();

