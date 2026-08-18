import type { Request, Response } from "express";
import { skuManagementService } from "../services/sku-management.service.js";
import { logger } from "../../utils/logger.js";

export async function lookupSkuController(req: Request, res: Response): Promise<void> {
  try {
    const sku = String(req.body?.sku || "").trim();
    const brandName = String(req.body?.brand_name || req.body?.brand || "").trim();
    const image = String(req.body?.image || req.body?.image_url || "").trim();

    if (!sku && !image) {
      res.status(400).json({
        success: false,
        error: "SKU number string or Watch Image is required in request body",
      });
      return;
    }

    const data = await skuManagementService.lookupSku(sku, image, brandName);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error("Error in lookupSkuController", { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to lookup SKU fields",
    });
  }
}
