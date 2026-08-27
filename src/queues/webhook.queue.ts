/**
 * Webhook Queue
 * BullMQ queue for buffering incoming WhatsApp webhooks
 */

import { Queue } from "bullmq";
import { redisConnectionOptions, redisConfig } from "../config/redis.config.js";
import { logger } from "../utils/logger.js";

export const WEBHOOK_QUEUE_NAME = "webhook-processing-queue";

/**
 * Lazy BullMQ Queue instance — only created when Redis is enabled
 */
let _webhookQueue: Queue | null = null;

export function getWebhookQueue(): Queue | null {
  if (!redisConfig.enabled) return null;
  if (!_webhookQueue) {
    _webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400, count: 5000 },
      },
    });
  }
  return _webhookQueue;
}

// Keep named export for backward compat (used in test script)
export const webhookQueue = {
  getJobCounts: async () => getWebhookQueue()?.getJobCounts() ?? {},
};

/**
 * Add incoming webhook payload to queue
 */
export async function addWebhookJob(payload: any): Promise<boolean> {
  if (!redisConfig.enabled) {
    return false;
  }
  try {
    const queue = getWebhookQueue();
    if (!queue) return false;

    // Extract message ID supporting both AI Sensy format and standard Meta format
    const messageId =
      payload?.data?.message?.id ||
      payload?.id ||
      payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ||
      `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await queue.add("process-webhook", payload, {
      jobId: messageId,
    });
    
    logger.info("Queued webhook job into BullMQ", { jobId: messageId });
    return true;
  } catch (error: any) {
    logger.error("Failed to add job to BullMQ queue", { error: error.message });
    return false;
  }
}
