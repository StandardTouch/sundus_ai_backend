/**
 * Watch Fields Enrichment Routes
 * Adds additional watch specification fields from SKU + brand + image
 */

import { Router } from "express";
import { enrichWatchFieldsController } from "../controllers/enrichWatchFields.controller.js";

const router = Router();

/**
 * POST /api/watch-fields/enrich
 * JSON: { sku, brand_name, image_url }
 */
router.post("/enrich", enrichWatchFieldsController);

export default router;

