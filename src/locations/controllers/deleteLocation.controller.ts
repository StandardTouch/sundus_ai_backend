/**
 * DELETE /api/locations/:id
 * Delete location
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { locationService } from "../services/location.service.js";

export async function deleteLocationController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: "Location ID is required" });
      return;
    }

    await locationService.deleteLocation(id);

    logger.info("Location deleted", { id });

    res.status(200).json({
      success: true,
      message: "Location deleted successfully"
    });
  } catch (error: any) {
    logger.error("Delete location error", { error: error.message, id: req.params.id });
    res.status(400).json({
      success: false,
      error: error.message || "Failed to delete location"
    });
  }
}
