/**
 * Support Settings Service
 * Business logic for support settings
 */

import { supportSettingsRepository } from "../repositories/support-settings.repository.js";
import { logger } from "../utils/logger.js";

const SUPPORT_PHONE_NUMBER_KEY = "support_phone_number";

export class SupportSettingsService {
  /**
   * Get support phone number
   */
  async getSupportPhoneNumber(): Promise<string> {
    try {
      const setting = await supportSettingsRepository.findByKey(SUPPORT_PHONE_NUMBER_KEY);
      
      if (!setting) {
        // Return default if not set
        return "+966 9200 09339";
      }
      
      return setting.value;
    } catch (error: any) {
      logger.error("Error getting support phone number", {
        error: error.message
      });
      // Return default on error
      return "+966 9200 09339";
    }
  }

  /**
   * Update support phone number
   */
  async updateSupportPhoneNumber(phoneNumber: string, updatedBy?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate phone number format (basic validation)
      if (!phoneNumber || phoneNumber.trim().length === 0) {
        return {
          success: false,
          error: "Phone number is required"
        };
      }

      await supportSettingsRepository.upsert({
        key: SUPPORT_PHONE_NUMBER_KEY,
        value: phoneNumber.trim(),
        description: "Support team phone number for customer assistance",
        updated_by: updatedBy
      });

      logger.info("Support phone number updated", {
        phoneNumber,
        updatedBy
      });

      return { success: true };
    } catch (error: any) {
      logger.error("Error updating support phone number", {
        error: error.message,
        phoneNumber
      });
      return {
        success: false,
        error: error.message || "Failed to update support phone number"
      };
    }
  }
}

export const supportSettingsService = new SupportSettingsService();

