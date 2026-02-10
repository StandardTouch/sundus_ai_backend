/**
 * Location Management Routes
 * All routes require authentication
 */

import { Router } from "express";
import { getLocationsController } from "../controllers/getLocations.controller.js";
import { getLocationByIdController } from "../controllers/getLocationById.controller.js";
import { createLocationController } from "../controllers/createLocation.controller.js";
import { updateLocationController } from "../controllers/updateLocation.controller.js";
import { deleteLocationController } from "../controllers/deleteLocation.controller.js";
import { authenticate, requireAdmin, requireAdminOrSupport } from "../../middleware/auth.middleware.js";

const router = Router();

// Public routes (if any)
router.get("/", getLocationsController);
router.get("/:id", getLocationByIdController);

// Protected routes (CRUD)
router.use(authenticate);
router.use(requireAdminOrSupport);

router.post("/", createLocationController);
router.put("/:id", updateLocationController);
router.delete("/:id", deleteLocationController);

export default router;
