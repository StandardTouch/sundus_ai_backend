/**
 * PUT /api/settings/tools/:toolName/toggle
 * Toggle tool enable/disable status
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * URL Parameters:
 * - toolName: string (Tool name, e.g., "search_products", "track_order")
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "tool_name": "search_products",
 *     "category": "products",
 *     "display_name": "Search Products",
 *     "description": "Search for products by SKU, brand name, or keywords...",
 *     "is_enabled": false,
 *     "updated_by": "admin_user_id",
 *     "created_at": "2024-01-15T10:30:00.000Z",
 *     "updated_at": "2024-01-15T12:00:00.000Z"
 *   },
 *   "message": "Tool toggled successfully"
 * }
 * 
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "Tool not found"
 * }
 * 
 * Error Response (401):
 * {
 *   "success": false,
 *   "error": "Unauthorized"
 * }
 * 
 * Error Response (500):
 * {
 *   "success": false,
 *   "error": "Internal server error"
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { toolSettingsService } from "../../services/tool-settings.service.js";

export async function toggleToolController(req: Request, res: Response): Promise<void> {
  try {
    const { toolName } = req.params;
    const currentUser = (req as any).user;

    if (!toolName) {
      res.status(400).json({
        success: false,
        error: "Tool name is required"
      });
      return;
    }

    const updated = await toolSettingsService.toggleTool(toolName, currentUser._id);

    logger.info("Tool toggled", {
      toolName,
      is_enabled: updated.is_enabled,
      updated_by: currentUser.username
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: "Tool toggled successfully"
    });
  } catch (error: any) {
    logger.error("Toggle tool error", { error: error.message, toolName: req.params.toolName });
    
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

