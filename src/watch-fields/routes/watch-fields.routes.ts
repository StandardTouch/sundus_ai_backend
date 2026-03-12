/**
 * Watch Fields Enrichment Routes
 * Adds additional watch specification fields from SKU + brand + image
 */

import { Router } from "express";
import { enrichWatchFieldsController } from "../controllers/enrichWatchFields.controller.js";
import { createRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { requireStaticApiKey } from "../../middleware/api-key.middleware.js";

const router = Router();

// Rate limit this expensive endpoint (override via env)
const watchFieldsLimiter = createRateLimiter({
  windowMs: parseInt(process.env.WATCH_FIELDS_RATE_LIMIT_WINDOW_MS || "60000", 10), // default: 60s
  max: parseInt(process.env.WATCH_FIELDS_RATE_LIMIT_MAX || "10", 10), // default: 10 requests/min/IP
  message: "Too many requests to watch-fields enrichment. Please try again shortly.",
});

// Server-to-server auth
const watchFieldsAuth = requireStaticApiKey("WATCH_FIELDS_API_KEY");

/**
 * POST /api/watch-fields/enrich
 * JSON: { sku, brand_name, image_url }
 */
router.post("/enrich", watchFieldsAuth, watchFieldsLimiter, enrichWatchFieldsController);

export default router;

