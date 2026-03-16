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
    const sort = String(req.query.sort || "").toLowerCase();
    const latRaw = req.query.lat as string | undefined;
    const lngRaw = req.query.lng as string | undefined;
    
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

    // Nearest sorting (returns ALL sorted; ignore page/limit as requested for nearest flow)
    if (sort === "nearest" && latRaw && lngRaw) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        res.status(400).json({ success: false, error: "Invalid lat/lng" });
        return;
      }

      const result = await locationService.getLocationsNearest(lat, lng, filters);
      res.status(200).json(result);
      return;
    }

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
