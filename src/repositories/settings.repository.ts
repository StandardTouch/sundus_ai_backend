/**
 * Settings Repository
 * Database operations for settings
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { Settings, CreateSettingsDto, UpdateSettingsDto } from "../models/settings.model.js";
import { logger } from "../utils/logger.js";

export class SettingsRepository {
  private getCollection() {
    return getDatabase().collection<Settings>("settings");
  }

  /**
   * Find setting by key
   */
  async findByKey(key: string): Promise<Settings | null> {
    try {
      const setting = await this.getCollection().findOne({ key });
      if (!setting) return null;
      
      return {
        ...setting,
        _id: fromObjectId(setting._id as any)
      } as Settings;
    } catch (error) {
      logger.error("Settings repository findByKey error", { error, key });
      return null;
    }
  }

  /**
   * Find setting by ID
   */
  async findById(id: string): Promise<Settings | null> {
    try {
      const setting = await this.getCollection().findOne({ _id: toObjectId(id) as any });
      if (!setting) return null;
      
      return {
        ...setting,
        _id: fromObjectId(setting._id as any)
      } as Settings;
    } catch (error) {
      logger.error("Settings repository findById error", { error, id });
      return null;
    }
  }

  /**
   * Create setting
   */
  async create(createData: CreateSettingsDto & { updated_by?: string }): Promise<Settings> {
    try {
      const now = new Date();
      const setting: Omit<Settings, "_id"> & { _id?: any } = {
        ...createData,
        created_at: now,
        updated_at: now
      };

      const result = await this.getCollection().insertOne(setting as any);
      
      return {
        ...setting,
        _id: fromObjectId(result.insertedId)
      } as Settings;
    } catch (error) {
      logger.error("Settings repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Update setting
   */
  async update(key: string, updateData: UpdateSettingsDto & { updated_by?: string }): Promise<Settings> {
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
      logger.error("Settings repository update error", { error, key, updateData });
      throw error;
    }
  }

  /**
   * Upsert setting (create if not exists, update if exists)
   */
  async upsert(createData: CreateSettingsDto & { updated_by?: string }): Promise<Settings> {
    try {
      const existing = await this.findByKey(createData.key);
      
      if (existing) {
        return await this.update(createData.key, {
          value: createData.value,
          description: createData.description,
          updated_by: createData.updated_by
        });
      } else {
        return await this.create(createData);
      }
    } catch (error) {
      logger.error("Settings repository upsert error", { error, createData });
      throw error;
    }
  }
}

export const settingsRepository = new SettingsRepository();

