/**
 * OpenAI Credit Status Service
 * Manages OpenAI credit availability status in the database
 */

import { supportSettingsRepository } from "../repositories/support-settings.repository.js";
import { logger } from "../utils/logger.js";
import { cacheService } from "./cache.service.js";

const OPENAI_CREDITS_AVAILABLE_KEY = "openai_credits_available";
const CACHE_KEY = "openai:credits_available";
const CACHE_TTL = 30; // Cache for 30 seconds

export class OpenAICreditService {
  /**
   * Check if OpenAI credits are available
   * Returns true by default if status is not set (assumes credits are available)
   */
  async areCreditsAvailable(): Promise<boolean> {
    try {
      // Check Redis cache first (< 1ms response time)
      const cached = await cacheService.get<boolean>(CACHE_KEY);
      if (cached !== null) {
        return cached;
      }

      const setting = await supportSettingsRepository.findByKey(OPENAI_CREDITS_AVAILABLE_KEY);
      
      if (!setting) {
        // Default to true if not set (assume credits are available)
        await cacheService.set(CACHE_KEY, true, CACHE_TTL);
        return true;
      }
      
      const available = setting.value.toLowerCase() === "true";
      await cacheService.set(CACHE_KEY, available, CACHE_TTL);
      return available;
    } catch (error: any) {
      logger.error("Error checking OpenAI credits status", {
        error: error.message
      });
      return true;
    }
  }

  /**
   * Set OpenAI credits availability status
   */
  async setCreditsAvailable(available: boolean, updatedBy?: string): Promise<void> {
    try {
      await supportSettingsRepository.upsert({
        key: OPENAI_CREDITS_AVAILABLE_KEY,
        value: available.toString(),
        description: "OpenAI API credits availability status. Set to 'false' when credits are exhausted.",
        updated_by: updatedBy
      });

      // Update Redis cache immediately so next message check is instant
      await cacheService.set(CACHE_KEY, available, CACHE_TTL);

      logger.info("OpenAI credits status updated", {
        available,
        updatedBy
      });
    } catch (error: any) {
      logger.error("Error updating OpenAI credits status", {
        error: error.message,
        available
      });
      throw error;
    }
  }

  /**
   * Mark credits as unavailable (when credit error is detected)
   */
  async markCreditsUnavailable(errorDetails?: any): Promise<void> {
    try {
      await this.setCreditsAvailable(false);
      
      logger.warn("⚠️ OpenAI credits marked as unavailable", {
        errorDetails: errorDetails ? {
          code: errorDetails.code,
          type: errorDetails.type,
          message: errorDetails.message?.substring(0, 200)
        } : undefined
      });
    } catch (error: any) {
      logger.error("Error marking credits as unavailable", {
        error: error.message
      });
    }
  }

  /**
   * Mark credits as available (when API calls succeed after being unavailable)
   */
  async markCreditsAvailable(): Promise<void> {
    try {
      const currentStatus = await this.areCreditsAvailable();
      
      // Only update if status changed from false to true
      if (!currentStatus) {
        await this.setCreditsAvailable(true);
        logger.info("✅ OpenAI credits marked as available");
      }
    } catch (error: any) {
      logger.error("Error marking credits as available", {
        error: error.message
      });
    }
  }

  /**
   * Get credit status with metadata
   */
  async getCreditStatus(): Promise<{
    credits_available: boolean;
    recharge_required: boolean;
    last_updated?: Date;
  }> {
    try {
      const setting = await supportSettingsRepository.findByKey(OPENAI_CREDITS_AVAILABLE_KEY);
      
      const creditsAvailable = setting 
        ? setting.value.toLowerCase() === "true"
        : true; // Default to true if not set
      
      return {
        credits_available: creditsAvailable,
        recharge_required: !creditsAvailable,
        last_updated: setting?.updated_at
      };
    } catch (error: any) {
      logger.error("Error getting OpenAI credit status", {
        error: error.message
      });
      // Default to available on error
      return {
        credits_available: true,
        recharge_required: false
      };
    }
  }
}

export const openaiCreditService = new OpenAICreditService();

