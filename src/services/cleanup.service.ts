/**
 * Cleanup Service
 * Handles automatic cleanup of expired OTPs and tokens
 */

import { passwordResetOTPRepository } from "../repositories/password-reset-otp.repository.js";
import { passwordResetTokenRepository } from "../repositories/password-reset-token.repository.js";
import { logger } from "../utils/logger.js";

export class CleanupService {
  /**
   * Cleanup expired OTPs and tokens
   * This is a safety net in addition to MongoDB TTL indexes
   */
  async cleanupExpired(): Promise<{
    otpsDeleted: number;
    tokensDeleted: number;
  }> {
    try {
      // Cleanup expired OTPs
      const otpsDeleted = await passwordResetOTPRepository.cleanupExpired();

      // Cleanup expired tokens
      const tokensDeleted = await passwordResetTokenRepository.cleanupExpired();

      if (otpsDeleted > 0 || tokensDeleted > 0) {
        logger.info("Cleanup service: Expired records deleted", {
          otpsDeleted,
          tokensDeleted,
        });
      }

      return {
        otpsDeleted,
        tokensDeleted,
      };
    } catch (error) {
      logger.error("Cleanup service error", { error });
      return {
        otpsDeleted: 0,
        tokensDeleted: 0,
      };
    }
  }

  /**
   * Start periodic cleanup (runs every hour)
   */
  startPeriodicCleanup(): NodeJS.Timeout {
    logger.info("Starting periodic cleanup service (runs every hour)");

    // Run cleanup immediately on start
    this.cleanupExpired().catch((error) => {
      logger.error("Initial cleanup error", { error });
    });

    // Then run every hour (3600000 ms)
    const interval = setInterval(() => {
      this.cleanupExpired().catch((error) => {
        logger.error("Periodic cleanup error", { error });
      });
    }, 3600000); // 1 hour

    return interval;
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    logger.info("Periodic cleanup service stopped");
  }
}

export const cleanupService = new CleanupService();

