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
    const isActive = req.query.isActive === undefined ? undefined : req.query.isActive === "true";

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
