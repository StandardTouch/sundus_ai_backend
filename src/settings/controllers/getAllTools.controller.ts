/**
 * GET /api/settings/tools
 * Get all tools with their enable/disable status
 * 
 * Headers:
 * Authorization: Bearer <token> (admin or customer_support)
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "tools": [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "tool_name": "search_products",
 *         "category": "products",
 *         "display_name": "Search Products",
 *         "description": "Search for products by SKU, brand name, or keywords...",
 *         "is_enabled": true,
 *         "updated_by": "admin_user_id",
 *         "created_at": "2024-01-15T10:30:00.000Z",
 *         "updated_at": "2024-01-15T10:30:00.000Z"
 *       },
 *       {
 *         "_id": "507f1f77bcf86cd799439012",
 *         "tool_name": "track_order",
 *         "category": "orders",
 *         "display_name": "Track Order",
 *         "description": "Get the LATEST/MOST RECENT order for a user...",
 *         "is_enabled": true,
 *         "updated_by": null,
 *         "created_at": "2024-01-15T10:30:00.000Z",
 *         "updated_at": "2024-01-15T10:30:00.000Z"
 *       }
 *     ]
 *   }
 * }
 * 
 * Error Response (401):
 * {
 *   "success": false,
 *   "error": "Unauthorized"
 * }
 * 
 * Error Response (403):
 * {
 *   "success": false,
 *   "error": "Access denied"
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

export async function getAllToolsController(req: Request, res: Response): Promise<void> {
  try {
    const tools = await toolSettingsService.getAllTools();

    res.status(200).json({
      success: true,
      data: {
        tools
      }
    });
  } catch (error: any) {
    logger.error("Get all tools error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

