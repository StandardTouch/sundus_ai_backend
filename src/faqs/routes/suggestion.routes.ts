/**
 * FAQ Suggestion Management Routes
 * All routes require authentication (admin or customer_support)
 */

import { Router } from "express";
import { getAllSuggestionsController } from "../controllers/getAllSuggestions.controller.js";
import { getSuggestionByIdController } from "../controllers/getSuggestionById.controller.js";
import { approveSuggestionController } from "../controllers/approveSuggestion.controller.js";
import { rejectSuggestionController } from "../controllers/rejectSuggestion.controller.js";
import { authenticate, requireAdminOrSupport } from "../../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication and admin or customer_support role
router.use(authenticate);
router.use(requireAdminOrSupport);

// GET /api/faqs/suggestions - Get all pending suggestions (paginated)
router.get("/", getAllSuggestionsController);

// GET /api/faqs/suggestions/:id - Get suggestion by ID
router.get("/:id", getSuggestionByIdController);

// POST /api/faqs/suggestions/:id/approve - Approve and activate suggestion
router.post("/:id/approve", approveSuggestionController);

// POST /api/faqs/suggestions/:id/reject - Reject suggestion
router.post("/:id/reject", rejectSuggestionController);

export default router;

