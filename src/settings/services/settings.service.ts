/**
 * Settings Service
 * Handles settings business logic
 */

import { settingsRepository } from "../../repositories/settings.repository.js";
import type { SettingsResponse } from "../../models/settings.model.js";
import { logger } from "../../utils/logger.js";

export class SettingsService {
  /**
   * Get setting by key
   */
  async getSettingByKey(key: string): Promise<{ success: boolean; data?: SettingsResponse; error?: string; statusCode?: number }> {
    try {
      const setting = await settingsRepository.findByKey(key);
      
      if (!setting) {
        return {
          success: false,
          error: "Setting not found",
          statusCode: 404
        };
      }

      return {
        success: true,
        data: this.mapToResponse(setting)
      };
    } catch (error) {
      logger.error("Settings service getSettingByKey error", { error, key });
      return {
        success: false,
        error: "Failed to get setting",
        statusCode: 500
      };
    }
  }

  /**
   * Toggle setting value
   */
  async toggleSetting(key: string, updatedBy?: string): Promise<{ success: boolean; data?: SettingsResponse; error?: string; statusCode?: number }> {
    try {
      const existing = await settingsRepository.findByKey(key);
      
      if (!existing) {
        return {
          success: false,
          error: "Setting not found",
          statusCode: 404
        };
      }

      const newValue = !existing.value;
      const updated = await settingsRepository.update(key, {
        value: newValue,
        updated_by: updatedBy
      });

      return {
        success: true,
        data: this.mapToResponse(updated)
      };
    } catch (error) {
      logger.error("Settings service toggleSetting error", { error, key });
      return {
        success: false,
        error: "Failed to toggle setting",
        statusCode: 500
      };
    }
  }

  /**
   * Get webhook activation status
   */
  async getWebhookActiveStatus(): Promise<boolean> {
    try {
      const setting = await settingsRepository.findByKey("webhook_active");
      return setting?.value ?? false;
    } catch (error) {
      logger.error("Settings service getWebhookActiveStatus error", { error });
      return false;
    }
  }

  /**
   * Map setting to response
   */
  private mapToResponse(setting: any): SettingsResponse {
    return {
      _id: setting._id,
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updated_by: setting.updated_by,
      created_at: setting.created_at,
      updated_at: setting.updated_at
    };
  }
}

export const settingsService = new SettingsService();

