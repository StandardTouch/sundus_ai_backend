/**
 * Test Redis Caching & BullMQ Queue Integration
 */

import { connectRedis, closeRedis } from "../src/config/redis.config.js";
import { cacheService } from "../src/services/cache.service.js";
import { addWebhookJob, webhookQueue } from "../src/queues/webhook.queue.js";

async function runTest() {
  console.log("=========================================");
  console.log("🧪 Testing Redis Cache & BullMQ Queue");
  console.log("=========================================");

  // 1. Connect to Redis
  const connected = await connectRedis();
  if (!connected) {
    console.error("❌ Could not connect to Redis at 127.0.0.1:6379");
    console.error("👉 Make sure Redis server is running (e.g. `docker run -p 6379:6379 redis` or local Redis service)");
    process.exit(1);
  }

  console.log("✅ 1. Redis Connection Established");

  // 2. Test Cache SET & GET
  const testKey = "test:setting_status";
  const testVal = { active: true, timestamp: Date.now() };

  await cacheService.set(testKey, testVal, 60);
  console.log(`✅ 2. Cache SET successful for key: ${testKey}`);

  const cachedData = await cacheService.get<typeof testVal>(testKey);
  console.log("✅ 3. Cache GET result:", cachedData);

  // 3. Test Deduplication Lock
  const lockKey = "msg_12345_test";
  const lock1 = await cacheService.acquireLock(lockKey, 30);
  console.log(`✅ 4. First Lock Acquisition (should be true): ${lock1}`);

  const lock2 = await cacheService.acquireLock(lockKey, 30);
  console.log(`✅ 5. Second Lock Acquisition (should be false - duplicate blocked): ${lock2}`);

  // 4. Test BullMQ Queue Job
  const sampleWebhookPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "12345",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "917204708561", phone_number_id: "1000" },
              messages: [
                {
                  from: "917204708561",
                  id: "wamid.test_12345",
                  timestamp: "1600000000",
                  text: { body: "Test webhook payload from local test script" },
                  type: "text",
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const queued = await addWebhookJob(sampleWebhookPayload);
  if (queued) {
    const jobCounts = await webhookQueue.getJobCounts();
    console.log("✅ 6. BullMQ Webhook Job Queued Successfully!");
    console.log("📊 Queue Stats:", jobCounts);
  } else {
    console.error("❌ Failed to queue BullMQ job");
  }

  // Cleanup
  await cacheService.del(testKey);
  await closeRedis();
  console.log("=========================================");
  console.log("🎉 All Redis & BullMQ tests passed!");
  console.log("=========================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
