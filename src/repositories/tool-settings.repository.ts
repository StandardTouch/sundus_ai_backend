/**
 * Tool Settings Repository
 * Database operations for tool settings
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { ToolSettings, CreateToolSettingsDto, UpdateToolSettingsDto } from "../models/tool-settings.model.js";
import { logger } from "../utils/logger.js";

export class ToolSettingsRepository {
  private getCollection() {
    return getDatabase().collection<ToolSettings>("tool_settings");
  }

  /**
   * Find tool setting by name
   */
  async findByToolName(toolName: string): Promise<ToolSettings | null> {
    try {
      const setting = await this.getCollection().findOne({ tool_name: toolName });
      if (!setting) return null;
      
      return {
        ...setting,
        _id: fromObjectId(setting._id as any)
      } as ToolSettings;
    } catch (error) {
      logger.error("Tool settings repository findByToolName error", { error, toolName });
      return null;
    }
  }

  /**
   * Find tool setting by ID
   */
  async findById(id: string): Promise<ToolSettings | null> {
    try {
      const setting = await this.getCollection().findOne({ _id: toObjectId(id) as any });
      if (!setting) return null;
      
      return {
        ...setting,
        _id: fromObjectId(setting._id as any)
      } as ToolSettings;
    } catch (error) {
      logger.error("Tool settings repository findById error", { error, id });
      return null;
    }
  }

  /**
   * Find all tool settings
   */
  async findAll(): Promise<ToolSettings[]> {
    try {
      const settings = await this.getCollection()
        .find({})
        .sort({ category: 1, tool_name: 1 })
        .toArray();

      return settings.map(setting => ({
        ...setting,
        _id: fromObjectId(setting._id as any)
      })) as ToolSettings[];
    } catch (error) {
      logger.error("Tool settings repository findAll error", { error });
      throw error;
    }
  }

  /**
   * Find enabled tool names (for filtering)
   */
  async findEnabledToolNames(): Promise<string[]> {
    try {
      const settings = await this.getCollection()
        .find({ is_enabled: true })
        .project({ tool_name: 1, _id: 0 })
        .toArray();

      return settings.map(s => s.tool_name);
    } catch (error) {
      logger.error("Tool settings repository findEnabledToolNames error", { error });
      return []; // Return empty array on error (safer - no tools enabled)
    }
  }

  /**
   * Create tool setting
   */
  async create(createData: CreateToolSettingsDto & { updated_by?: string }): Promise<ToolSettings> {
    try {
      const now = new Date();
      const setting: Omit<ToolSettings, "_id"> & { _id?: any } = {
        ...createData,
        is_enabled: createData.is_enabled ?? true, // Default to enabled
        created_at: now,
        updated_at: now
      };

      const result = await this.getCollection().insertOne(setting as any);
      
      return {
        ...setting,
        _id: fromObjectId(result.insertedId)
      } as ToolSettings;
    } catch (error) {
      logger.error("Tool settings repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Update tool setting
   */
  async update(toolName: string, updateData: UpdateToolSettingsDto & { updated_by?: string }): Promise<ToolSettings> {
    try {
      const updatePayload = {
        ...updateData,
        updated_at: new Date()
      };

      await this.getCollection().updateOne(
        { tool_name: toolName },
        { $set: updatePayload }
      );

      const updatedSetting = await this.findByToolName(toolName);
      if (!updatedSetting) {
        throw new Error("Tool setting not found after update");
      }

      return updatedSetting;
    } catch (error) {
      logger.error("Tool settings repository update error", { error, toolName, updateData });
      throw error;
    }
  }

  /**
   * Upsert tool setting (create if not exists, update if exists)
   */
  async upsert(createData: CreateToolSettingsDto & { updated_by?: string }): Promise<ToolSettings> {
    try {
      const existing = await this.findByToolName(createData.tool_name);
      
      if (existing) {
        const updatePayload: UpdateToolSettingsDto & { updated_by?: string } = {
          ...(createData.is_enabled !== undefined && { is_enabled: createData.is_enabled }),
          ...(createData.display_name && { display_name: createData.display_name }),
          ...(createData.description && { description: createData.description }),
          ...(createData.updated_by && { updated_by: createData.updated_by })
        };
        return await this.update(createData.tool_name, updatePayload);
      } else {
        return await this.create(createData);
      }
    } catch (error) {
      logger.error("Tool settings repository upsert error", { error, createData });
      throw error;
    }
  }

  /**
   * Toggle tool enabled status
   */
  async toggle(toolName: string, updatedBy?: string): Promise<ToolSettings> {
    try {
      const existing = await this.findByToolName(toolName);
      if (!existing) {
        throw new Error("Tool setting not found");
      }

      return await this.update(toolName, {
        is_enabled: !existing.is_enabled,
        updated_by: updatedBy
      });
    } catch (error) {
      logger.error("Tool settings repository toggle error", { error, toolName });
      throw error;
    }
  }
}

export const toolSettingsRepository = new ToolSettingsRepository();

