/**
 * PUT /api/settings/tools/:toolName
 * Update tool settings (enable/disable or update metadata)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - toolName: string (Tool name, e.g., "search_products", "track_order")
 * 
 * Request Body (all fields optional):
 * {
 *   "is_enabled": false,
 *   "display_name": "Search Products",
 *   "description": "Updated description..."
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": { ...updated tool object... },
 *   "message": "Tool updated successfully"
 * }
 * 
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "Tool not found"
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid request body"
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { toolSettingsService } from "../../services/tool-settings.service.js";

export async function updateToolController(req: Request, res: Response): Promise<void> {
  try {
    const { toolName } = req.params;
    const updateData = req.body;
    const currentUser = (req as any).user;

    if (!toolName) {
      res.status(400).json({
        success: false,
        error: "Tool name is required"
      });
      return;
    }

    // Validate update data
    if (updateData.is_enabled !== undefined && typeof updateData.is_enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: "is_enabled must be a boolean"
      });
      return;
    }

    const updated = await toolSettingsService.updateTool(
      toolName,
      {
        is_enabled: updateData.is_enabled,
        display_name: updateData.display_name,
        description: updateData.description
      },
      currentUser._id
    );

    logger.info("Tool updated", {
      toolName,
      updates: updateData,
      updated_by: currentUser.username
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: "Tool updated successfully"
    });
  } catch (error: any) {
    logger.error("Update tool error", { error: error.message, toolName: req.params.toolName });
    
    if (error.message?.includes("not found")) {
      res.status(404).json({
        success: false,
        error: "Tool not found"
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}

