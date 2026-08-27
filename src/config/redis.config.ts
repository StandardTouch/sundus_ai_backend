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
 * Lazy ioredis client — only instantiated when REDIS_ENABLED=true
 * This prevents ETIMEDOUT errors on local dev when no Redis is available
 */
let _redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redisConfig.enabled) return null;
  if (!_redisClient) {
    _redisClient = new Redis({
      ...redisConnectionOptions,
      lazyConnect: true,
    });
    _redisClient.on("connect", () => {
      logger.info("Connected to Redis successfully");
    });
    _redisClient.on("error", (err) => {
      logger.error("Redis Client Error", { error: err.message });
    });
  }
  return _redisClient;
}

// Convenience alias used throughout the codebase
export const redisClient = {
  get status() { return getRedisClient()?.status ?? "close"; },
  get: (key: string) => getRedisClient()?.get(key) ?? Promise.resolve(null),
  set: (...args: Parameters<Redis["set"]>) => (getRedisClient() as any)?.set(...args) ?? Promise.resolve(null),
  del: (...args: Parameters<Redis["del"]>) => (getRedisClient() as any)?.del(...args) ?? Promise.resolve(0),
  keys: (pattern: string) => getRedisClient()?.keys(pattern) ?? Promise.resolve([]),
  quit: () => getRedisClient()?.quit() ?? Promise.resolve("OK"),
  connect: () => getRedisClient()?.connect() ?? Promise.resolve(),
};

/**
 * Connect to Redis gracefully
 */
export async function connectRedis(): Promise<boolean> {
  if (!redisConfig.enabled) {
    logger.info("Redis is disabled via REDIS_ENABLED=false");
    return false;
  }
  try {
    await getRedisClient()!.connect();
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
    const client = getRedisClient();
    if (client && (client.status === "ready" || client.status === "connecting")) {
      await client.quit();
      logger.info("Redis connection closed");
    }
  } catch (error: any) {
    logger.error("Error closing Redis connection", { error: error.message });
  }
}
