/**
 * Conversations Routes
 * API routes for conversation management
 */

import { Router } from "express";
import { getConversationsController } from "../controllers/getConversations.controller.js";
import { getConversationByIdController } from "../controllers/getConversationById.controller.js";
import { authenticate, requireAdminOrSupport } from "../../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /api/conversations
 * Get all conversations (paginated with search and filters)
 * Requires: admin or customer_support role
 */
router.get(
  "/",
  authenticate,
  requireAdminOrSupport,
  getConversationsController
);

/**
 * GET /api/conversations/:id
 * Get a single conversation by ID with its messages
 * Requires: admin or customer_support role
 */
router.get(
  "/:id",
  authenticate,
  requireAdminOrSupport,
  getConversationByIdController
);

export default router;

