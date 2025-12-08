/**
 * User Repository
 * Database operations for users
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { User, CreateUserDto, UpdateUserDto } from "../models/user.model.js";
import { logger } from "../utils/logger.js";

export class UserRepository {
  private getCollection() {
    return getDatabase().collection<User>("users");
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.getCollection().findOne({ _id: toObjectId(id) as any });
      if (!user) return null;
      
      return {
        ...user,
        _id: fromObjectId(user._id as any)
      } as User;
    } catch (error) {
      logger.error("User repository findById error", { error, id });
      return null;
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.getCollection().findOne({ username });
      if (!user) return null;
      
      return {
        ...user,
        _id: fromObjectId(user._id as any)
      } as User;
    } catch (error) {
      logger.error("User repository findByUsername error", { error, username });
      return null;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.getCollection().findOne({ email });
      if (!user) return null;
      
      return {
        ...user,
        _id: fromObjectId(user._id as any)
      } as User;
    } catch (error) {
      logger.error("User repository findByEmail error", { error, email });
      return null;
    }
  }

  /**
   * Find all users (paginated with search and filters)
   */
  async findAll(
    skip: number,
    limit: number,
    filters: {
      role?: string;
      is_active?: boolean;
      search?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    }
  ): Promise<{ users: User[]; total: number }> {
    try {
      const query: any = {};
      
      // Role filter
      if (filters.role) {
        query.role = filters.role;
      }
      
      // Active status filter
      if (filters.is_active !== undefined) {
        query.is_active = filters.is_active;
      }
      
      // Search filter (searches in username, email, and full_name)
      if (filters.search && filters.search.trim()) {
        const searchRegex = { $regex: filters.search.trim(), $options: "i" };
        query.$or = [
          { username: searchRegex },
          { email: searchRegex },
          { full_name: searchRegex }
        ];
      }

      // Sort configuration
      const sortField = filters.sort_by || "created_at";
      const sortOrder = filters.sort_order === "asc" ? 1 : -1;
      const sort: any = { [sortField]: sortOrder };

      const [users, total] = await Promise.all([
        this.getCollection()
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort(sort)
          .toArray(),
        this.getCollection().countDocuments(query)
      ]);

      return {
        users: users.map(user => ({
          ...user,
          _id: fromObjectId(user._id as any)
        })) as User[],
        total
      };
    } catch (error) {
      logger.error("User repository findAll error", { error, skip, limit, filters });
      throw error;
    }
  }

  /**
   * Create user
   */
  async create(createData: CreateUserDto & { password_hash: string; created_by?: string }): Promise<User> {
    try {
      const now = new Date();
      const user: Omit<User, "_id"> & { _id?: any } = {
        ...createData,
        is_active: createData.is_active !== undefined ? createData.is_active : true,
        created_at: now,
        updated_at: now
      };

      const result = await this.getCollection().insertOne(user as any);
      
      return {
        ...user,
        _id: fromObjectId(result.insertedId)
      } as User;
    } catch (error) {
      logger.error("User repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: string, updateData: Partial<UpdateUserDto & { password_hash?: string }>): Promise<User> {
    try {
      const updatePayload = {
        ...updateData,
        updated_at: new Date()
      };

      await this.getCollection().updateOne(
        { _id: toObjectId(id) as any },
        { $set: updatePayload }
      );

      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        throw new Error("User not found after update");
      }

      return updatedUser;
    } catch (error) {
      logger.error("User repository update error", { error, id, updateData });
      throw error;
    }
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: string, ip: string): Promise<void> {
    try {
      await this.getCollection().updateOne(
        { _id: toObjectId(id) as any },
        {
          $set: {
            last_login_at: new Date(),
            last_login_ip: ip,
            updated_at: new Date()
          }
        }
      );
    } catch (error) {
      logger.error("User repository updateLastLogin error", { error, id, ip });
      throw error;
    }
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().deleteOne({ _id: toObjectId(id) as any });
    } catch (error) {
      logger.error("User repository delete error", { error, id });
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
