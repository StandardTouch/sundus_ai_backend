/**
 * Cache Service
 * Wrapper around Redis for getting, setting, deleting keys and managing locks
 */

import { redisClient } from "../config/redis.config.js";
import { logger } from "../utils/logger.js";

export class CacheService {
  /**
   * Check if Redis is ready to be used
   */
  private isReady(): boolean {
    return redisClient.status === "ready";
  }

  /**
   * Get a cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) return null;
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error: any) {
      logger.warn(`Redis GET error for key ${key}`, { error: error.message });
      return null;
    }
  }

  /**
   * Set a cached value with optional TTL (in seconds)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await redisClient.set(key, serialized, "EX", ttlSeconds);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (error: any) {
      logger.warn(`Redis SET error for key ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error: any) {
      logger.warn(`Redis DEL error for key ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * Delete keys matching a pattern (e.g. "faqs:*")
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isReady()) return 0;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        return await redisClient.del(...keys);
      }
      return 0;
    } catch (error: any) {
      logger.warn(`Redis delPattern error for pattern ${pattern}`, { error: error.message });
      return 0;
    }
  }

  /**
   * Acquire a lock (Deduplication)
   * Returns true if lock was acquired (first time), false if key already exists.
   */
  async acquireLock(key: string, ttlSeconds: number = 60): Promise<boolean> {
    if (!this.isReady()) return true; // If Redis unavailable, allow execution
    try {
      const result = await redisClient.set(`lock:${key}`, "1", "EX", ttlSeconds, "NX");
      return result === "OK";
    } catch (error: any) {
      logger.warn(`Redis acquireLock error for key ${key}`, { error: error.message });
      return true;
    }
  }
}

export const cacheService = new CacheService();
