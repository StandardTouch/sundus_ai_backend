/**
 * User Management Routes
 * All routes require admin authentication
 */

import { Router } from "express";
import { getAllUsersController } from "./getAllUsers.controller.js";
import { getUserByIdController } from "./getUserById.controller.js";
import { createUserController } from "./createUser.controller.js";
import { updateUserController } from "./updateUser.controller.js";
import { deleteUserController } from "./deleteUser.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// GET /api/users - Get all users (paginated)
router.get("/", getAllUsersController);

// GET /api/users/:id - Get user by ID
router.get("/:id", getUserByIdController);

// POST /api/users - Create new user
router.post("/", createUserController);

// PUT /api/users/:id - Update user
router.put("/:id", updateUserController);

// DELETE /api/users/:id - Delete user
router.delete("/:id", deleteUserController);

export default router;

