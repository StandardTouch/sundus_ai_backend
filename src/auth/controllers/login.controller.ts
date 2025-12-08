/**
 * POST /api/auth/login
 * 
 * Request Body:
 * {
 *   "username": "admin",
 *   "password": "password123"
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "user": {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "username": "admin",
 *       "email": "admin@example.com",
 *       "full_name": "Admin User",
 *       "role": "admin",
 *       "is_active": true,
 *       "last_login_at": "2024-01-15T10:30:00.000Z",
 *       "created_at": "2024-01-01T00:00:00.000Z",
 *       "updated_at": "2024-01-15T10:30:00.000Z"
 *     },
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "expires_at": "2024-01-15T18:30:00.000Z"
 *   }
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Username and password are required"
 * }
 * 
 * Error Response (401):
 * {
 *   "success": false,
 *   "error": "Invalid username or password"
 * }
 * 
 * Error Response (403):
 * {
 *   "success": false,
 *   "error": "Account is inactive"
 * }
 */

import type { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import { authService } from "../services/auth.service.js";
import type { LoginDto } from "../../models/user.model.js";

export async function loginController(req: Request, res: Response): Promise<void> {
  try {
    const loginData: LoginDto = req.body;
    
    // Validate input
    if (!loginData.username || !loginData.password) {
      res.status(400).json({
        success: false,
        error: "Username and password are required"
      });
      return;
    }

    // Get client IP
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    // Attempt login
    const result = await authService.login(
      loginData.username,
      loginData.password,
      clientIp
    );

    if (!result.success) {
      res.status(result.statusCode || 401).json({
        success: false,
        error: result.error
      });
      return;
    }

    logger.info("User logged in", {
      username: loginData.username,
      role: result.data?.user.role,
      ip: clientIp
    });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error("Login error", { error, body: req.body });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

