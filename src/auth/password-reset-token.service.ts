/**
 * Password Reset Token Service
 * Handles password reset token generation and verification
 */

import crypto from "crypto";
import bcrypt from "bcrypt";
import { passwordResetTokenRepository } from "../repositories/password-reset-token.repository.js";
import { logger } from "../utils/logger.js";

const RESET_TOKEN_EXPIRY_MINUTES = 30; // Reset token expires in 30 minutes
const BCRYPT_ROUNDS = 10;

export class PasswordResetTokenService {
  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    // Generate a 32-byte random token and convert to hex (64 characters)
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Create SHA256 hash for fast database lookup
   */
  private createTokenLookup(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Hash token with bcrypt for secure storage
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, BCRYPT_ROUNDS);
  }

  /**
   * Verify token
   */
  async verifyToken(token: string, tokenHash: string): Promise<boolean> {
    return bcrypt.compare(token, tokenHash);
  }

  /**
   * Create password reset token after OTP verification
   */
  async createPasswordResetToken(
    email: string,
    userId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      // Invalidate any existing active tokens for this email
      await passwordResetTokenRepository.invalidateAllForEmail(email);

      // Generate token
      const token = this.generateToken();
      const tokenLookup = this.createTokenLookup(token); // SHA256 for fast lookup
      const tokenHash = await this.hashToken(token); // Bcrypt for security

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);

      // Store token
      await passwordResetTokenRepository.create({
        email,
        user_id: userId,
        token_lookup: tokenLookup,
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: ipAddress,
      });

      logger.info("Password reset token created", {
        email,
        userId,
        expiresAt,
      });

      return {
        success: true,
        token, // Return plain token for client to use
      };
    } catch (error: any) {
      logger.error("Password reset token service create error", { error, email, userId });
      return {
        success: false,
        error: "Failed to create reset token",
      };
    }
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(
    token: string
  ): Promise<{ success: boolean; email?: string; userId?: string; error?: string }> {
    try {
      // Create lookup key for fast database search
      const tokenLookup = this.createTokenLookup(token);

      // Find active token by lookup key
      const tokenRecord = await passwordResetTokenRepository.findByTokenLookup(tokenLookup);

      if (!tokenRecord) {
        return {
          success: false,
          error: "Invalid or expired reset token",
        };
      }

      // Verify token matches using bcrypt
      const isValid = await this.verifyToken(token, tokenRecord.token_hash);

      if (!isValid) {
        return {
          success: false,
          error: "Invalid reset token",
        };
      }

      logger.info("Password reset token verified", {
        email: tokenRecord.email,
        userId: tokenRecord.user_id,
      });

      return {
        success: true,
        email: tokenRecord.email,
        userId: tokenRecord.user_id,
      };
    } catch (error: any) {
      logger.error("Password reset token service verify error", { error });
      return {
        success: false,
        error: "Failed to verify reset token",
      };
    }
  }

  /**
   * Mark token as used after password reset
   */
  async markTokenAsUsed(token: string): Promise<void> {
    try {
      const tokenLookup = this.createTokenLookup(token);
      const tokenRecord = await passwordResetTokenRepository.findByTokenLookup(tokenLookup);

      if (tokenRecord) {
        await passwordResetTokenRepository.markAsUsed(tokenRecord._id!);
        logger.info("Password reset token marked as used", {
          email: tokenRecord.email,
          userId: tokenRecord.user_id,
        });
      }
    } catch (error: any) {
      logger.error("Password reset token service markAsUsed error", { error });
      // Don't throw - token might already be used or expired
    }
  }
}

export const passwordResetTokenService = new PasswordResetTokenService();

