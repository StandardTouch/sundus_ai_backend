/**
 * Authentication Routes
 */

import { Router } from "express";
import { loginController } from "./login.controller.js";
import { meController } from "./me.controller.js";
import { logoutController } from "./logout.controller.js";
import { forgotPasswordController } from "./forgot-password.controller.js";
import { verifyOTPController } from "./verify-otp.controller.js";
import { resetPasswordController } from "./reset-password.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// POST /api/auth/login
router.post("/login", loginController);

// GET /api/auth/me (get current user)
router.get("/me", authenticate, meController);

// POST /api/auth/logout
router.post("/logout", authenticate, logoutController);

// POST /api/auth/forgot-password (request OTP)
router.post("/forgot-password", forgotPasswordController);

// POST /api/auth/verify-otp (verify OTP and get reset token)
router.post("/verify-otp", verifyOTPController);

// POST /api/auth/reset-password (reset password using token)
router.post("/reset-password", resetPasswordController);

export default router;

