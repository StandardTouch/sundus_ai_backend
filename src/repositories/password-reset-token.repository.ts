/**
 * Password Reset Token Repository
 * Database operations for password reset tokens
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { PasswordResetToken, CreatePasswordResetTokenDto } from "../models/password-reset-token.model.js";
import { logger } from "../utils/logger.js";

export class PasswordResetTokenRepository {
  private getCollection() {
    return getDatabase().collection<PasswordResetToken>("password_reset_tokens");
  }

  /**
   * Create password reset token
   */
  async create(createData: CreatePasswordResetTokenDto): Promise<PasswordResetToken> {
    try {
      const now = new Date();
      const token: Omit<PasswordResetToken, "_id"> & { _id?: any } = {
        ...createData,
        is_used: false,
        is_expired: false,
        created_at: now,
        updated_at: now,
      };

      const result = await this.getCollection().insertOne(token as any);
      
      return {
        ...token,
        _id: fromObjectId(result.insertedId)
      } as PasswordResetToken;
    } catch (error) {
      logger.error("Password reset token repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Find active token by email
   */
  async findActiveByEmail(email: string): Promise<PasswordResetToken | null> {
    try {
      const token = await this.getCollection().findOne({
        email,
        is_used: false,
        is_expired: false,
        expires_at: { $gt: new Date() }
      }, {
        sort: { created_at: -1 } // Get most recent
      });

      if (!token) return null;
      
      return {
        ...token,
        _id: fromObjectId(token._id as any)
      } as PasswordResetToken;
    } catch (error) {
      logger.error("Password reset token repository findActiveByEmail error", { error, email });
      return null;
    }
  }

  /**
   * Find token by lookup key (SHA256 hash for fast lookup)
   */
  async findByTokenLookup(tokenLookup: string): Promise<PasswordResetToken | null> {
    try {
      const token = await this.getCollection().findOne({
        token_lookup: tokenLookup,
        is_used: false,
        is_expired: false,
        expires_at: { $gt: new Date() }
      });

      if (!token) return null;
      
      return {
        ...token,
        _id: fromObjectId(token._id as any)
      } as PasswordResetToken;
    } catch (error) {
      logger.error("Password reset token repository findByTokenLookup error", { error });
      return null;
    }
  }

  /**
   * Mark token as used
   */
  async markAsUsed(id: string): Promise<void> {
    try {
      await this.getCollection().updateOne(
        { _id: toObjectId(id) as any },
        {
          $set: {
            is_used: true,
            used_at: new Date(),
            updated_at: new Date()
          }
        }
      );
    } catch (error) {
      logger.error("Password reset token repository markAsUsed error", { error, id });
      throw error;
    }
  }

  /**
   * Mark token as expired
   */
  async markAsExpired(id: string): Promise<void> {
    try {
      await this.getCollection().updateOne(
        { _id: toObjectId(id) as any },
        {
          $set: {
            is_expired: true,
            updated_at: new Date()
          }
        }
      );
    } catch (error) {
      logger.error("Password reset token repository markAsExpired error", { error, id });
      throw error;
    }
  }

  /**
   * Invalidate all active tokens for an email
   */
  async invalidateAllForEmail(email: string): Promise<void> {
    try {
      await this.getCollection().updateMany(
        {
          email,
          is_used: false,
          is_expired: false
        },
        {
          $set: {
            is_expired: true,
            updated_at: new Date()
          }
        }
      );
    } catch (error) {
      logger.error("Password reset token repository invalidateAllForEmail error", { error, email });
      throw error;
    }
  }

  /**
   * Cleanup expired tokens (optional, can be run as a scheduled job)
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await this.getCollection().deleteMany({
        expires_at: { $lt: new Date() }
      });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error("Password reset token repository cleanupExpired error", { error });
      return 0;
    }
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();

