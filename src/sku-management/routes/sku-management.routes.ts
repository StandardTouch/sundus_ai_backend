import { Router } from "express";
import { lookupSkuController } from "../controllers/sku-management.controller.js";

const router = Router();

/**
 * POST /api/sku-management/lookup
 * Body: { sku: "WA-1002" }
 */
router.post("/lookup", lookupSkuController);

export default router;
