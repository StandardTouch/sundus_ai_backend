/**
 * FAQ Management Routes
 * All routes require authentication (admin or customer_support)
 */

import { Router } from "express";
import { getAllFAQsController } from "../controllers/getAllFAQs.controller.js";
import { getFAQByIdController } from "../controllers/getFAQById.controller.js";
import { getAllCategoriesController } from "../controllers/getAllCategories.controller.js";
import { createFAQController } from "../controllers/createFAQ.controller.js";
import { updateFAQController } from "../controllers/updateFAQ.controller.js";
import { deleteFAQController } from "../controllers/deleteFAQ.controller.js";
import suggestionRoutes from "./suggestion.routes.js";
import { authenticate, requireAdminOrSupport } from "../../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication and admin or customer_support role
router.use(authenticate);
router.use(requireAdminOrSupport);

// GET /api/faqs - Get all FAQs (paginated)
router.get("/", getAllFAQsController);

// GET /api/faqs/categories - Get all unique categories
router.get("/categories", getAllCategoriesController);

// FAQ Suggestions routes
router.use("/suggestions", suggestionRoutes);

// GET /api/faqs/:id - Get FAQ by ID (must be after /categories and /suggestions routes)
router.get("/:id", getFAQByIdController);

// POST /api/faqs - Create new FAQ
router.post("/", createFAQController);

// PUT /api/faqs/:id - Update FAQ
router.put("/:id", updateFAQController);

// DELETE /api/faqs/:id - Delete FAQ
router.delete("/:id", deleteFAQController);

export default router;

