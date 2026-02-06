/**
 * GET /api/locations/:id
 * Get location details by database ID
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { locationService } from "../services/location.service.js";

export async function getLocationByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: "Location ID is required" });
      return;
    }

    const location = await locationService.getLocationById(id);

    if (!location) {
      res.status(404).json({
        success: false,
        error: "Location not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error: any) {
    logger.error("Get location by ID error", { error: error.message, id: req.params.id });
    res.status(400).json({
      success: false,
      error: "Invalid location ID format"
    });
  }
}
