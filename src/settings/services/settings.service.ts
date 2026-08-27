/**
 * Settings Service
 * Handles settings business logic
 */

import { settingsRepository } from "../../repositories/settings.repository.js";
import type { SettingsResponse } from "../../models/settings.model.js";
import { logger } from "../../utils/logger.js";
import { cacheService } from "../../services/cache.service.js";

export class SettingsService {
  /**
   * Get setting by key
   */
  async getSettingByKey(key: string): Promise<{ success: boolean; data?: SettingsResponse; error?: string; statusCode?: number }> {
    try {
      const cacheKey = `setting:${key}`;
      const cached = await cacheService.get<SettingsResponse>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const setting = await settingsRepository.findByKey(key);
      
      if (!setting) {
        return {
          success: false,
          error: "Setting not found",
          statusCode: 404
        };
      }

      const response = this.mapToResponse(setting);
      await cacheService.set(cacheKey, response, 300); // Cache for 5 mins
      return {
        success: true,
        data: response
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
        ...(updatedBy && { updated_by: updatedBy })
      });

      const response = this.mapToResponse(updated);
      // Invalidate cache
      await cacheService.del(`setting:${key}`);
      return {
        success: true,
        data: response
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
      const cacheKey = "setting:webhook_active";
      const cachedStatus = await cacheService.get<boolean>(cacheKey);
      if (cachedStatus !== null) {
        return cachedStatus;
      }

      const setting = await settingsRepository.findByKey("webhook_active");
      const activeStatus = setting?.value ?? false;
      await cacheService.set(cacheKey, activeStatus, 300); // Cache for 5 mins
      return activeStatus;
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

