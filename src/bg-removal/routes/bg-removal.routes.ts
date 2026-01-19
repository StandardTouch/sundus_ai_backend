/**
 * Background Removal Routes
 */

import { Router } from "express";
import multer from "multer";
import { removeBackgroundController } from "../controllers/removeBackground.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * POST /api/bg-removal/remove-background
 * Remove background from an image
 */
router.post(
  "/remove-background",
  // authenticate,
  upload.single("image"),
  removeBackgroundController
);

export default router;
