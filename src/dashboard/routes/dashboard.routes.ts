/**
 * Dashboard Routes
 */

import { Router } from "express";
import { getDashboardController } from "../controllers/getDashboard.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /api/dashboard
 * Get dashboard metrics and analytics
 * Requires: Admin authentication
 */
router.get("/", authenticate, getDashboardController);

export default router;

