/**
 * Support Settings Repository
 * Database operations for support settings (string values)
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { SupportSettings, CreateSupportSettingsDto, UpdateSupportSettingsDto } from "../models/support-settings.model.js";
import { logger } from "../utils/logger.js";

export class SupportSettingsRepository {
  private getCollection() {
    return getDatabase().collection<SupportSettings>("support_settings");
  }

  /**
   * Find setting by key
   */
  async findByKey(key: string): Promise<SupportSettings | null> {
    try {
      const setting = await this.getCollection().findOne({ key });
      if (!setting) return null;
      
      return {
        ...setting,
        _id: fromObjectId(setting._id as any)
      } as SupportSettings;
    } catch (error) {
      logger.error("Support settings repository findByKey error", { error, key });
      return null;
    }
  }

  /**
   * Create setting
   */
  async create(createData: CreateSupportSettingsDto & { updated_by?: string }): Promise<SupportSettings> {
    try {
      const now = new Date();
      const setting: Omit<SupportSettings, "_id"> & { _id?: any } = {
        ...createData,
        created_at: now,
        updated_at: now
      };

      const result = await this.getCollection().insertOne(setting as any);
      
      return {
        ...setting,
        _id: fromObjectId(result.insertedId)
      } as SupportSettings;
    } catch (error) {
      logger.error("Support settings repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Update setting
   */
  async update(key: string, updateData: UpdateSupportSettingsDto & { updated_by?: string }): Promise<SupportSettings> {
    try {
      const updatePayload = {
        ...updateData,
        updated_at: new Date()
      };

      await this.getCollection().updateOne(
        { key },
        { $set: updatePayload }
      );

      const updatedSetting = await this.findByKey(key);
      if (!updatedSetting) {
        throw new Error("Setting not found after update");
      }

      return updatedSetting;
    } catch (error) {
      logger.error("Support settings repository update error", { error, key, updateData });
      throw error;
    }
  }

  /**
   * Upsert setting (create if not exists, update if exists)
   */
  async upsert(createData: CreateSupportSettingsDto & { updated_by?: string }): Promise<SupportSettings> {
    try {
      const existing = await this.findByKey(createData.key);
      
      if (existing) {
        const updatePayload: UpdateSupportSettingsDto & { updated_by?: string } = {
          value: createData.value,
          ...(createData.description && { description: createData.description }),
          ...(createData.updated_by && { updated_by: createData.updated_by })
        };
        return await this.update(createData.key, updatePayload);
      } else {
        return await this.create(createData);
      }
    } catch (error) {
      logger.error("Support settings repository upsert error", { error, createData });
      throw error;
    }
  }
}

export const supportSettingsRepository = new SupportSettingsRepository();

