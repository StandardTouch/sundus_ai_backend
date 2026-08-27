/**
 * Webhook Queue
 * BullMQ queue for buffering incoming WhatsApp webhooks
 */

import { Queue } from "bullmq";
import { redisConnectionOptions, redisConfig } from "../config/redis.config.js";
import { logger } from "../utils/logger.js";

export const WEBHOOK_QUEUE_NAME = "webhook-processing-queue";

/**
 * BullMQ Queue Instance
 */
export const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 2000, // Wait 2s, 4s, 8s on failure
    },
    removeOnComplete: { age: 3600, count: 1000 }, // Clean up completed jobs
    removeOnFail: { age: 86400, count: 5000 }, // Keep failed jobs 24h for audit
  },
});

/**
 * Add incoming webhook payload to queue
 */
export async function addWebhookJob(payload: any): Promise<boolean> {
  if (!redisConfig.enabled) {
    return false;
  }
  try {
    // Generate job ID based on message ID if present, otherwise timestamp
    const messageId = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id || `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await webhookQueue.add("process-webhook", payload, {
      jobId: messageId,
    });
    
    logger.info("Queued webhook job into BullMQ", { jobId: messageId });
    return true;
  } catch (error: any) {
    logger.error("Failed to add job to BullMQ queue", { error: error.message });
    return false;
  }
}
