/**
 * Settings Routes
 * All routes require admin authentication
 */

import { Router } from "express";
import { getWebhookStatusController } from "../controllers/getWebhookStatus.controller.js";
import { toggleWebhookStatusController } from "../controllers/toggleWebhookStatus.controller.js";
import { getSupportPhoneNumberController } from "../controllers/getSupportPhoneNumber.controller.js";
import { updateSupportPhoneNumberController } from "../controllers/updateSupportPhoneNumber.controller.js";
import { authenticate, requireAdminOrSupport } from "../../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication and admin or customer_support role
router.use(authenticate);
router.use(requireAdminOrSupport);

// GET /api/settings/webhook/status - Get webhook activation status
router.get("/webhook/status", getWebhookStatusController);

// POST /api/settings/webhook/toggle - Toggle webhook activation status
router.post("/webhook/toggle", toggleWebhookStatusController);

// GET /api/settings/support-phone-number - Get support phone number
router.get("/support-phone-number", getSupportPhoneNumberController);

// PUT /api/settings/support-phone-number - Update support phone number
router.put("/support-phone-number", updateSupportPhoneNumberController);

export default router;

