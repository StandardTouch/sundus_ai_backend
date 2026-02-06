/**
 * PUT /api/locations/:id
 * Update location details
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { locationService } from "../services/location.service.js";
import type { UpdateLocationDto } from "../../models/location.model.ts";

export async function updateLocationController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: "Location ID is required" });
      return;
    }
    const updateData: UpdateLocationDto = req.body;

    const result = await locationService.updateLocation(id, updateData);

    logger.info("Location updated", { id, location_id: result.location_id });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error("Update location error", { error: error.message, id: req.params.id, body: req.body });
    res.status(400).json({
      success: false,
      error: error.message || "Failed to update location"
    });
  }
}
