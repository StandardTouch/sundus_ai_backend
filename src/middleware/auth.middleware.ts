/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

import type { Request, Response, NextFunction } from "express";
import { authService } from "../auth/services/auth.service.js";
import { logger } from "../utils/logger.js";

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "No token provided"
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const result = await authService.verifyToken(token);

    if (!result.success || !result.user) {
      res.status(401).json({
        success: false,
        error: result.error || "Invalid token"
      });
      return;
    }

    // Attach user to request
    (req as any).user = result.user;

    next();
  } catch (error) {
    logger.error("Auth middleware error", { error });
    res.status(401).json({
      success: false,
      error: "Authentication failed"
    });
  }
};

/**
 * Require admin role
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
    return;
  }

  if (user.role !== "admin") {
    res.status(403).json({
      success: false,
      error: "Admin access required"
    });
    return;
  }

  next();
};

/**
 * Require admin or customer support role
 */
export const requireAdminOrSupport = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
    return;
  }

  if (!["admin", "customer_support"].includes(user.role)) {
    res.status(403).json({
      success: false,
      error: "Access denied"
    });
    return;
  }

  next();
};

