/**
 * Password Reset OTP Repository
 * Database operations for password reset OTPs
 */

import { getDatabase, toObjectId, fromObjectId } from "../config/database.js";
import type { PasswordResetOTP, CreatePasswordResetOTPDto } from "../models/password-reset-otp.model.js";
import { logger } from "../utils/logger.js";

export class PasswordResetOTPRepository {
  private getCollection() {
    return getDatabase().collection<PasswordResetOTP>("password_reset_otps");
  }

  /**
   * Create password reset OTP
   */
  async create(createData: CreatePasswordResetOTPDto & { otp_code: string; otp_hash: string; expires_at: Date }): Promise<PasswordResetOTP> {
    try {
      const now = new Date();
      const otp: Omit<PasswordResetOTP, "_id"> & { _id?: any } = {
        ...createData,
        is_used: false,
        is_expired: false,
        created_at: now,
        updated_at: now,
      };

      const result = await this.getCollection().insertOne(otp as any);
      
      return {
        ...otp,
        _id: fromObjectId(result.insertedId)
      } as PasswordResetOTP;
    } catch (error) {
      logger.error("Password reset OTP repository create error", { error, createData });
      throw error;
    }
  }

  /**
   * Find active OTP by email
   */
  async findActiveByEmail(email: string): Promise<PasswordResetOTP | null> {
    try {
      const otp = await this.getCollection().findOne({
        email,
        is_used: false,
        is_expired: false,
        expires_at: { $gt: new Date() }
      }, {
        sort: { created_at: -1 } // Get most recent
      });

      if (!otp) return null;
      
      return {
        ...otp,
        _id: fromObjectId(otp._id as any)
      } as PasswordResetOTP;
    } catch (error) {
      logger.error("Password reset OTP repository findActiveByEmail error", { error, email });
      return null;
    }
  }

  /**
   * Find OTP by email and code (for verification)
   */
  async findByEmailAndCode(email: string, otp_hash: string): Promise<PasswordResetOTP | null> {
    try {
      const otp = await this.getCollection().findOne({
        email,
        otp_hash,
        is_used: false,
        expires_at: { $gt: new Date() }
      });

      if (!otp) return null;
      
      return {
        ...otp,
        _id: fromObjectId(otp._id as any)
      } as PasswordResetOTP;
    } catch (error) {
      logger.error("Password reset OTP repository findByEmailAndCode error", { error, email });
      return null;
    }
  }

  /**
   * Mark OTP as used
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
      logger.error("Password reset OTP repository markAsUsed error", { error, id });
      throw error;
    }
  }

  /**
   * Mark OTP as expired
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
      logger.error("Password reset OTP repository markAsExpired error", { error, id });
      throw error;
    }
  }

  /**
   * Invalidate all active OTPs for an email
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
      logger.error("Password reset OTP repository invalidateAllForEmail error", { error, email });
      throw error;
    }
  }

  /**
   * Cleanup expired OTPs (optional, can be run as a scheduled job)
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await this.getCollection().deleteMany({
        expires_at: { $lt: new Date() }
      });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error("Password reset OTP repository cleanupExpired error", { error });
      return 0;
    }
  }
}

export const passwordResetOTPRepository = new PasswordResetOTPRepository();

