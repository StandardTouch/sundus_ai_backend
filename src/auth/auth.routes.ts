/**
 * Authentication Routes
 */

import { Router } from "express";
import { loginController } from "./login.controller.js";
import { meController } from "./me.controller.js";
import { logoutController } from "./logout.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// POST /api/auth/login
router.post("/login", loginController);

// GET /api/auth/me (get current user)
router.get("/me", authenticate, meController);

// POST /api/auth/logout
router.post("/logout", authenticate, logoutController);

export default router;

