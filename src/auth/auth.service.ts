/**
 * Authentication Service
 * Handles user authentication logic
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userRepository } from "../repositories/user.repository.js";
import type { LoginResponse, UserResponse } from "../models/user.model.js";
import { logger } from "../utils/logger.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

export class AuthService {
  /**
   * Login user
   */
  async login(
    username: string,
    password: string,
    clientIp: string
  ): Promise<{ success: boolean; data?: LoginResponse; error?: string; statusCode?: number }> {
    try {
      // Find user by username
      const user = await userRepository.findByUsername(username);

      if (!user) {
        return {
          success: false,
          error: "Invalid username or password",
          statusCode: 401
        };
      }

      // Check if account is active
      if (!user.is_active) {
        return {
          success: false,
          error: "Account is inactive",
          statusCode: 403
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid username or password",
          statusCode: 401
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + (8 * 60 * 60 * 1000)); // 8 hours

      // Update last login
      await userRepository.updateLastLogin(user._id!, clientIp);

      // Prepare user response (without password)
      const userResponse: UserResponse = {
        _id: user._id!,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        last_login_at: new Date(),
        created_by: user.created_by,
        created_at: user.created_at,
        updated_at: new Date()
      };

      return {
        success: true,
        data: {
          user: userResponse,
          token,
          expires_at: expiresAt
        }
      };
    } catch (error) {
      logger.error("Auth service login error", { error, username });
      return {
        success: false,
        error: "Internal server error",
        statusCode: 500
      };
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Get user from database
      const user = await userRepository.findById(decoded.userId);

      if (!user || !user.is_active) {
        return {
          success: false,
          error: "Invalid or inactive user"
        };
      }

      // Return user info (without password)
      const userResponse: UserResponse = {
        _id: user._id!,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        created_by: user.created_by,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      return {
        success: true,
        user: userResponse
      };
    } catch (error) {
      return {
        success: false,
        error: "Invalid token"
      };
    }
  }
}

export const authService = new AuthService();

