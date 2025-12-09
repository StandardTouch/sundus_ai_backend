/**
 * User Service
 * Handles user management business logic
 */

import bcrypt from "bcrypt";
import { userRepository } from "../../repositories/user.repository.js";
import type { CreateUserDto, UpdateUserDto, UserResponse } from "../../models/user.model.js";
import { logger } from "../../utils/logger.js";

const BCRYPT_ROUNDS = 10;

export class UserService {
  /**
   * Get all users (paginated with search and filters)
   */
  async getAllUsers(
    page: number,
    limit: number,
    filters: {
      role?: string;
      is_active?: boolean;
      search?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    }
  ): Promise<{
    users: UserResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const { users, total } = await userRepository.findAll(skip, limit, filters);

    return {
      users: users.map(this.mapToResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponse | null> {
    const user = await userRepository.findById(id);
    return user ? this.mapToResponse(user) : null;
  }

  /**
   * Create new user
   */
  async createUser(
    createData: CreateUserDto,
    createdBy?: string
  ): Promise<{ success: boolean; data?: UserResponse; error?: string; statusCode?: number }> {
    try {
      // Check if username exists
      const existingUsername = await userRepository.findByUsername(createData.username);
      if (existingUsername) {
        return {
          success: false,
          error: "Username already exists",
          statusCode: 400
        };
      }

      // Check if email exists
      const existingEmail = await userRepository.findByEmail(createData.email);
      if (existingEmail) {
        return {
          success: false,
          error: "Email already exists",
          statusCode: 400
        };
      }

      // Hash password
      const password_hash = await bcrypt.hash(createData.password, BCRYPT_ROUNDS);

      // Create user
      const user = await userRepository.create({
        ...createData,
        password_hash,
        is_active: createData.is_active !== undefined ? createData.is_active : true,
        created_by: createdBy
      });

      return {
        success: true,
        data: this.mapToResponse(user)
      };
    } catch (error) {
      logger.error("User service create error", { error, createData });
      return {
        success: false,
        error: "Failed to create user",
        statusCode: 500
      };
    }
  }

  /**
   * Update user
   */
  async updateUser(
    id: string,
    updateData: UpdateUserDto
  ): Promise<{ success: boolean; data?: UserResponse; error?: string; statusCode?: number }> {
    try {
      // Check if user exists
      const existingUser = await userRepository.findById(id);
      if (!existingUser) {
        return {
          success: false,
          error: "User not found",
          statusCode: 404
        };
      }

      // Check if email is being updated and already exists
      if (updateData.email && updateData.email !== existingUser.email) {
        const existingEmail = await userRepository.findByEmail(updateData.email);
        if (existingEmail && existingEmail._id !== id) {
          return {
            success: false,
            error: "Email already exists",
            statusCode: 400
          };
        }
      }

      // Hash password if provided
      const updatePayload: any = { ...updateData };
      if (updateData.password) {
        updatePayload.password_hash = await bcrypt.hash(updateData.password, BCRYPT_ROUNDS);
        delete updatePayload.password;
      }

      // Update user
      const updatedUser = await userRepository.update(id, updatePayload);

      return {
        success: true,
        data: this.mapToResponse(updatedUser)
      };
    } catch (error) {
      logger.error("User service update error", { error, id, updateData });
      return {
        success: false,
        error: "Failed to update user",
        statusCode: 500
      };
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    try {
      const user = await userRepository.findById(id);
      if (!user) {
        return {
          success: false,
          error: "User not found",
          statusCode: 404
        };
      }

      await userRepository.delete(id);

      return {
        success: true
      };
    } catch (error) {
      logger.error("User service delete error", { error, id });
      return {
        success: false,
        error: "Failed to delete user",
        statusCode: 500
      };
    }
  }

  /**
   * Map user to response (remove password)
   */
  private mapToResponse(user: any): UserResponse {
    return {
      _id: user._id,
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
  }
}

export const userService = new UserService();

