/**
 * Settings Routes
 * All routes require admin authentication
 */

import { Router } from "express";
import { getWebhookStatusController } from "../controllers/getWebhookStatus.controller.js";
import { toggleWebhookStatusController } from "../controllers/toggleWebhookStatus.controller.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// GET /api/settings/webhook/status - Get webhook activation status
router.get("/webhook/status", getWebhookStatusController);

// POST /api/settings/webhook/toggle - Toggle webhook activation status
router.post("/webhook/toggle", toggleWebhookStatusController);

export default router;

