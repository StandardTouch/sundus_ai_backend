/**
 * Webhook Worker
 * BullMQ worker process that consumes queued WhatsApp webhooks
 */

import { Worker, Job } from "bullmq";
import { WEBHOOK_QUEUE_NAME } from "./webhook.queue.js";
import { redisConnectionOptions, redisConfig } from "../config/redis.config.js";
import { webhookHandlerService } from "../services/webhook.handler.service.js";
import { cacheService } from "../services/cache.service.js";
import { logger } from "../utils/logger.js";

let webhookWorker: Worker | null = null;

/**
 * Initialize BullMQ Worker
 */
export function initWebhookWorker(): Worker | null {
  if (!redisConfig.enabled) {
    logger.info("BullMQ Worker skipped (Redis disabled)");
    return null;
  }

  webhookWorker = new Worker(
    WEBHOOK_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`[Worker] Processing webhook job ${job.id}`);
      const payload = job.data;

      // Deduplication check using message ID if present
      const messageId = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;
      if (messageId) {
        const acquired = await cacheService.acquireLock(messageId, 60);
        if (!acquired) {
          logger.warn(`[Worker] Duplicate message ID detected: ${messageId}. Skipping processing.`);
          return { status: "duplicate_skipped", messageId };
        }
      }

      // Process webhook
      await webhookHandlerService.processWebhook(payload);
      return { status: "success", messageId };
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5, // Process up to 5 webhooks concurrently
    }
  );

  webhookWorker.on("completed", (job: Job, returnvalue: any) => {
    logger.info(`[Worker] Job ${job.id} completed successfully`, { returnvalue });
  });

  webhookWorker.on("failed", (job: Job | undefined, err: Error) => {
    logger.error(`[Worker] Job ${job?.id} failed`, { error: err.message });
  });

  logger.info("BullMQ Webhook Worker initialized and listening for jobs");
  return webhookWorker;
}

/**
 * Close BullMQ Worker gracefully
 */
export async function closeWebhookWorker(): Promise<void> {
  if (webhookWorker) {
    logger.info("Closing BullMQ Webhook Worker...");
    await webhookWorker.close();
    logger.info("BullMQ Webhook Worker closed");
  }
}
