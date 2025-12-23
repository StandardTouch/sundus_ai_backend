/**
 * Tool Settings Service
 * Business logic for tool enable/disable management
 */

import { toolSettingsRepository } from "../repositories/tool-settings.repository.js";
import { allTools } from "../agent/tools/index.js";
import { logger } from "../utils/logger.js";
import type { ToolSettingsResponse } from "../models/tool-settings.model.js";
import type OpenAI from "openai";

/**
 * Tool Settings Service
 */
export class ToolSettingsService {
  private enabledToolsCache: string[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get all tools with their settings
   */
  async getAllTools(): Promise<ToolSettingsResponse[]> {
    try {
      const dbSettings = await toolSettingsRepository.findAll();
      const dbSettingsMap = new Map(dbSettings.map(s => [s.tool_name, s]));

      // Merge with actual tools to ensure all tools are represented
      const allToolsList: ToolSettingsResponse[] = [];

      for (const tool of allTools) {
        const toolName = tool.function.name;
        const dbSetting = dbSettingsMap.get(toolName);

        if (dbSetting) {
          // Tool exists in DB
          allToolsList.push({
            _id: dbSetting._id!,
            tool_name: dbSetting.tool_name,
            category: dbSetting.category,
            display_name: dbSetting.display_name,
            description: dbSetting.description,
            is_enabled: dbSetting.is_enabled,
            updated_by: dbSetting.updated_by,
            created_at: dbSetting.created_at,
            updated_at: dbSetting.updated_at
          });
        } else {
          // Tool not in DB yet - create default entry
          const category = this.inferCategory(toolName);
          const newSetting = await toolSettingsRepository.create({
            tool_name: toolName,
            category,
            display_name: this.formatDisplayName(toolName),
            description: tool.function.description || `Tool: ${toolName}`,
            is_enabled: true // Default to enabled
          });

          allToolsList.push({
            _id: newSetting._id!,
            tool_name: newSetting.tool_name,
            category: newSetting.category,
            display_name: newSetting.display_name,
            description: newSetting.description,
            is_enabled: newSetting.is_enabled,
            updated_by: newSetting.updated_by,
            created_at: newSetting.created_at,
            updated_at: newSetting.updated_at
          });
        }
      }

      return allToolsList.sort((a, b) => {
        // Sort by category, then by tool name
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.tool_name.localeCompare(b.tool_name);
      });
    } catch (error: any) {
      logger.error("Error getting all tools", {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get enabled tools (for OpenAI)
   * Uses caching to avoid DB calls on every message
   */
  async getEnabledTools(): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]> {
    try {
      // Check cache
      const now = Date.now();
      if (this.enabledToolsCache && now < this.cacheExpiry) {
        return this.filterToolsByNames(this.enabledToolsCache);
      }

      // Fetch from DB
      const enabledNames = await toolSettingsRepository.findEnabledToolNames();
      
      // Update cache
      this.enabledToolsCache = enabledNames;
      this.cacheExpiry = now + this.CACHE_TTL;

      return this.filterToolsByNames(enabledNames);
    } catch (error: any) {
      logger.error("Error getting enabled tools", {
        error: error.message
      });
      // On error, return all tools (safer than disabling everything)
      logger.warn("Falling back to all tools due to error");
      return allTools;
    }
  }

  /**
   * Filter tools by enabled names
   */
  private filterToolsByNames(enabledNames: string[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return allTools.filter(tool => enabledNames.includes(tool.function.name));
  }

  /**
   * Toggle tool enabled status
   */
  async toggleTool(toolName: string, updatedBy?: string): Promise<ToolSettingsResponse> {
    try {
      // Invalidate cache
      this.enabledToolsCache = null;
      this.cacheExpiry = 0;

      const updated = await toolSettingsRepository.toggle(toolName, updatedBy);

      return {
        _id: updated._id!,
        tool_name: updated.tool_name,
        category: updated.category,
        display_name: updated.display_name,
        description: updated.description,
        is_enabled: updated.is_enabled,
        updated_by: updated.updated_by,
        created_at: updated.created_at,
        updated_at: updated.updated_at
      };
    } catch (error: any) {
      logger.error("Error toggling tool", {
        error: error.message,
        toolName
      });
      throw error;
    }
  }

  /**
   * Update tool setting
   */
  async updateTool(
    toolName: string,
    updateData: { is_enabled?: boolean; display_name?: string; description?: string },
    updatedBy?: string
  ): Promise<ToolSettingsResponse> {
    try {
      // Invalidate cache
      this.enabledToolsCache = null;
      this.cacheExpiry = 0;

      const updated = await toolSettingsRepository.update(toolName, {
        ...updateData,
        updated_by: updatedBy
      });

      return {
        _id: updated._id!,
        tool_name: updated.tool_name,
        category: updated.category,
        display_name: updated.display_name,
        description: updated.description,
        is_enabled: updated.is_enabled,
        updated_by: updated.updated_by,
        created_at: updated.created_at,
        updated_at: updated.updated_at
      };
    } catch (error: any) {
      logger.error("Error updating tool", {
        error: error.message,
        toolName
      });
      throw error;
    }
  }

  /**
   * Get tool by name
   */
  async getToolByName(toolName: string): Promise<ToolSettingsResponse | null> {
    try {
      const setting = await toolSettingsRepository.findByToolName(toolName);
      if (!setting) return null;

      return {
        _id: setting._id!,
        tool_name: setting.tool_name,
        category: setting.category,
        display_name: setting.display_name,
        description: setting.description,
        is_enabled: setting.is_enabled,
        updated_by: setting.updated_by,
        created_at: setting.created_at,
        updated_at: setting.updated_at
      };
    } catch (error: any) {
      logger.error("Error getting tool by name", {
        error: error.message,
        toolName
      });
      throw error;
    }
  }

  /**
   * Invalidate cache (call after updates)
   */
  invalidateCache(): void {
    this.enabledToolsCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Infer category from tool name
   */
  private inferCategory(toolName: string): string {
    if (toolName.includes('product')) return 'products';
    if (toolName.includes('order')) return 'orders';
    if (toolName.includes('faq')) return 'faqs';
    return 'general';
  }

  /**
   * Format display name from tool name
   */
  private formatDisplayName(toolName: string): string {
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const toolSettingsService = new ToolSettingsService();

