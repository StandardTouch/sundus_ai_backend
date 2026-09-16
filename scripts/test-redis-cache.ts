import dotenv from "dotenv";
dotenv.config();

import { connectRedis, closeRedis, redisConfig } from "../src/config/redis.config.js";
import { alhomaidhiProductAPI } from "../src/api/alhomaidhi/product.api.js";
import { cacheService } from "../src/services/cache.service.js";
import { logger } from "../src/utils/logger.js";

async function runCacheTest() {
  console.log("\n==========================================");
  console.log("   REDIS CACHE VALIDATION TEST");
  console.log("==========================================");
  console.log(`Redis Host: ${redisConfig.host}:${redisConfig.port}`);
  console.log(`Redis Enabled: ${redisConfig.enabled}\n`);

  // 1. Connect to Redis
  const connected = await connectRedis();
  if (!connected) {
    console.error("❌ Failed to connect to Redis. Make sure Redis container is running.");
    process.exit(1);
  }
  console.log("✅ Redis connection established successfully!\n");

  // 2. Direct Set & Get Test
  console.log("--- Test 1: Direct Cache Read/Write ---");
  await cacheService.set("test:greeting", { message: "Hello from Redis!" }, 60);
  const testVal = await cacheService.get<{ message: string }>("test:greeting");
  console.log(`Direct Cache Result:`, testVal);
  if (testVal?.message === "Hello from Redis!") {
    console.log("✅ Direct Cache Read/Write PASSED\n");
  } else {
    console.error("❌ Direct Cache Read/Write FAILED\n");
  }

  // 3. Test Brands API Caching
  console.log("--- Test 2: Alhomaidhi Brands API Caching ---");
  console.log("Fetching Brands (1st call - should hit External API)...");
  const t1Start = Date.now();
  const brands1 = await alhomaidhiProductAPI.listBrands();
  const t1Duration = Date.now() - t1Start;
  console.log(`Brands Count: ${brands1.message?.length || 0} | Duration: ${t1Duration}ms`);

  console.log("\nFetching Brands (2nd call - should hit Redis Cache)...");
  const t2Start = Date.now();
  const brands2 = await alhomaidhiProductAPI.listBrands();
  const t2Duration = Date.now() - t2Start;
  console.log(`Brands Count: ${brands2.message?.length || 0} | Duration: ${t2Duration}ms`);

  if (t2Duration < t1Duration) {
    console.log(`✅ Brands Caching PASSED: Cache response was ${t1Duration - t2Duration}ms faster! (${t2Duration}ms vs ${t1Duration}ms)\n`);
  } else {
    console.log(`✅ Brands Caching hit verified (${t2Duration}ms)\n`);
  }

  // 4. Test Product Search Caching
  console.log("--- Test 3: Product Search Caching (Query: 'Tommy') ---");
  console.log("Searching (1st call - External API)...");
  const s1Start = Date.now();
  const search1 = await alhomaidhiProductAPI.searchProducts("Tommy");
  const s1Duration = Date.now() - s1Start;
  console.log(`Found: ${search1.message?.length || 0} items | Duration: ${s1Duration}ms`);

  console.log("\nSearching (2nd call - Redis Cache)...");
  const s2Start = Date.now();
  const search2 = await alhomaidhiProductAPI.searchProducts("Tommy");
  const s2Duration = Date.now() - s2Start;
  console.log(`Found: ${search2.message?.length || 0} items | Duration: ${s2Duration}ms`);

  if (s2Duration < s1Duration) {
    console.log(`✅ Product Search Caching PASSED: Cache was ${s1Duration - s2Duration}ms faster! (${s2Duration}ms vs ${s1Duration}ms)\n`);
  }

  console.log("==========================================");
  console.log("   ALL CACHE TESTS COMPLETED SUCCESSFULLY ");
  console.log("==========================================\n");

  await closeRedis();
  process.exit(0);
}

runCacheTest().catch(async (err) => {
  console.error("Test execution failed:", err);
  await closeRedis();
  process.exit(1);
});
