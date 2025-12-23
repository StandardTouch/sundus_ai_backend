/**
 * Analytics Routes
 */

import { Router } from "express";
import { getAnalyticsController } from "../controllers/getAnalytics.controller.js";
import { authenticate, requireAdminOrSupport } from "../../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /api/analytics
 * Get comprehensive analytics data
 * Requires: Admin or Customer Support authentication
 * 
 * Query Parameters (optional):
 * - startDate: ISO date string (e.g., "2025-01-01")
 * - endDate: ISO date string (e.g., "2025-01-31")
 */
router.get("/", authenticate, requireAdminOrSupport, getAnalyticsController);

export default router;

