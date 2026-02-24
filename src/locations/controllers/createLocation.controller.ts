/**
 * POST /api/locations
 * Create new location
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { locationService } from "../services/location.service.js";
import type { CreateLocationDto } from "../../models/location.model.ts";

export async function createLocationController(req: Request, res: Response): Promise<void> {
  try {
    const createData: CreateLocationDto = req.body;

    // Validate required fields
    if (
      !createData.location_title || 
      !createData.location_title_ara || 
      !createData.location_address || 
      !createData.location_address_ara || 
      !createData.location_latitude || 
      !createData.location_longitude ||
      !createData.store_manager_name ||
      !createData.store_manager_phone
    ) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: location_title, location_title_ara, location_address, location_address_ara, location_latitude, location_longitude, store_manager_name, store_manager_phone"
      });
      return;
    }

    const result = await locationService.createLocation(createData);

    logger.info("Location created", {
      location_id: createData.location_id,
      location_title: createData.location_title
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error("Create location error", { error: error.message, body: req.body });
    res.status(400).json({
      success: false,
      error: error.message || "Failed to create location"
    });
  }
}
