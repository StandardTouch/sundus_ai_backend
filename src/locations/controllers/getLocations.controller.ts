/**
 * GET /api/locations
 * Get all locations with pagination and filters
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { locationService } from "../services/location.service.js";

export async function getLocationsController(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    
    // Improved isActive parsing (handles true, false, 1, 0, "true", "false")
    const isActiveRaw = req.query.isActive;
    let isActive: boolean | undefined = undefined;
    
    if (isActiveRaw !== undefined) {
      if (isActiveRaw === "true" || isActiveRaw === "1") {
        isActive = true;
      } else if (isActiveRaw === "false" || isActiveRaw === "0") {
        isActive = false;
      }
    }

    const filters: { isActive?: boolean; search?: string } = {};
    if (search) filters.search = search;
    if (isActive !== undefined) filters.isActive = isActive;

    const result = await locationService.getLocations(page, limit, filters);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Get locations error", { error: error.message, query: req.query });
    res.status(500).json({
       success: false,
       error: "Internal server error"
    });
  }
}
