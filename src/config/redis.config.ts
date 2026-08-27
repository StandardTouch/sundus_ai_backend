/**
 * Redis Configuration
 * Provides connection settings and clients for Redis & BullMQ
 */

import { Redis } from "ioredis";
import type { RedisOptions } from "ioredis";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

dotenv.config();

export const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  url: process.env.REDIS_URL || undefined,
  enabled: process.env.REDIS_ENABLED !== "false",
};

/**
 * Standard Redis Connection Options for BullMQ & ioredis
 */
export const redisConnectionOptions: RedisOptions = redisConfig.url
  ? {
      // If URL is provided, ioredis parses host/port/password from it
      host: new URL(redisConfig.url).hostname || redisConfig.host,
      port: parseInt(new URL(redisConfig.url).port || "6379", 10),
      password: new URL(redisConfig.url).password || redisConfig.password,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    }
  : {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    };

/**
 * Shared ioredis client instance for application caching and locks
 */
export const redisClient = new Redis({
  ...redisConnectionOptions,
  lazyConnect: true,
});

redisClient.on("connect", () => {
  logger.info("Connected to Redis successfully");
});

redisClient.on("error", (err) => {
  logger.error("Redis Client Error", { error: err.message });
});

/**
 * Connect to Redis gracefully
 */
export async function connectRedis(): Promise<boolean> {
  if (!redisConfig.enabled) {
    logger.info("Redis is disabled via REDIS_ENABLED=false");
    return false;
  }
  try {
    await redisClient.connect();
    return true;
  } catch (error: any) {
    logger.warn("Failed to connect to Redis. Caching & BullMQ will fall back to direct mode.", {
      error: error.message,
    });
    return false;
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  try {
    if (redisClient.status === "ready" || redisClient.status === "connecting") {
      await redisClient.quit();
      logger.info("Redis connection closed");
    }
  } catch (error: any) {
    logger.error("Error closing Redis connection", { error: error.message });
  }
}
