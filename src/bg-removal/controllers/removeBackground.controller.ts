/**
 * Remove Background Controller
 * Handles the background removal request from the client
 */

import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { bgRemovalService } from "../services/bg-removal.service.js";
import type { BGRemovalMode } from "../services/bg-removal.service.js";
import { logger } from "../../utils/logger.js";

/**
 * Controller to handle background removal
 * expects 'image' file in multipart/form-data
 */
export const removeBackgroundController = async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "No image file provided in 'image' field",
      });
      return;
    }

    const imageBuffer = req.file.buffer;
    const mode = (req.body.mode as BGRemovalMode) || "transparent";

    // Call service to remove background
    const result = await bgRemovalService.removeBackground(imageBuffer, mode);

    if (!result.success || !result.data) {
      res.status(result.status || 500).json({
        success: false,
        error: result.error || "Failed to remove background",
      });
      return;
    }

    // --- START: TESTING ONLY (Local Storage) ---
    // This block saves the processed image locally for testing purposes.
    // Uncomment/Comment this as needed before deploying to cloud.
    try {
      const responseFolder = path.join(process.cwd(), "bg_removal_responses");
      if (!fs.existsSync(responseFolder)) {
        fs.mkdirSync(responseFolder, { recursive: true });
      }
      const timestamp = new Date().getTime();
      const fileName = `bg_removed_${timestamp}.png`;
      const filePath = path.join(responseFolder, fileName);
      
      fs.writeFileSync(filePath, result.data);
      logger.info(`[TESTING] Saved processed image locally to: ${filePath}`);
    } catch (saveError) {
      logger.error("Failed to save response locally for testing", { saveError });
    }
    // --- END: TESTING ONLY ---

    // Set response headers for PNG image
    res.setHeader("Content-Type", "image/png");
    res.end(result.data);
    
  } catch (error: any) {
    logger.error("Error in removeBackgroundController", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error during background removal",
    });
  }
};
