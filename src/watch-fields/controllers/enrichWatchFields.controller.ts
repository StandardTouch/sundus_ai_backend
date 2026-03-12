/**
 * POST /api/watch-fields/enrich
 *
 * JSON body:
 * - sku: string (required)
 * - brand_name: string (required)
 * - image_url: string (required)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     sku: string,
 *     brand_name: string,
 *     fields_en: { ... },
 *     fields_ar: { ... },
 *     reasoning_en?: string,
 *     reasoning_ar?: string
 *   }
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { watchFieldsService } from "../services/watch-fields.service.js";

export async function enrichWatchFieldsController(req: Request, res: Response): Promise<void> {
  try {
    const sku = String((req.body as any)?.sku || "").trim();
    const brand_name = String((req.body as any)?.brand_name || "").trim();
    const image_url = String((req.body as any)?.image_url || "").trim();

    if (!sku) {
      res.status(400).json({ success: false, error: "Missing required field: sku" });
      return;
    }
    if (!brand_name) {
      res.status(400).json({ success: false, error: "Missing required field: brand_name" });
      return;
    }
    if (!image_url) {
      res.status(400).json({ success: false, error: "Missing required field: image_url" });
      return;
    }

    const result = await watchFieldsService.enrichWatchFields({
      sku,
      brand_name,
      image_url,
    });

    res.status(200).json({
      success: true,
      data: {
        sku,
        brand_name,
        image_url,
        fields_en: result.fields_en,
        fields_ar: result.fields_ar,
        ...(result.reasoning_en ? { reasoning_en: result.reasoning_en } : {}),
        ...(result.reasoning_ar ? { reasoning_ar: result.reasoning_ar } : {}),
      },
    });
  } catch (error: any) {
    logger.error("Enrich watch fields controller error", { error: error?.message || String(error) });
    res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
}

