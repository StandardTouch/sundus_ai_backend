/**
 * Test All Guided Flow Steps
 * Simulates selecting:
 * 1. Track My Orders
 * 2. Browse Watches (Brand list from API)
 * 3. Selecting a Brand (Watches from API)
 * 4. Store Locations (5 locations + link)
 * 5. Customer Support
 * 6. Return to Main Menu
 */

import dotenv from "dotenv";
dotenv.config();

import { flowRouter } from "../src/flows/flow.router.js";
import { flowSessionService } from "../src/flows/flow-session.service.js";
import { connectRedis, closeRedis } from "../src/config/redis.config.js";
import { connectDatabase, closeDatabase } from "../src/config/database.js";

async function main() {
  const phoneNumber = "917204708561";

  console.log("==================================================");
  console.log("🧪 Testing All Guided Flows");
  console.log("==================================================");

  await connectRedis();
  await connectDatabase();

  // Set user language to English
  await flowSessionService.updateLanguage(phoneNumber, "en", "MAIN_MENU");

  // 1. Test Track My Orders
  console.log("\n--- 1. Testing 'Track My Orders' ---");
  const trackRes = await flowRouter.handleIncoming(phoneNumber, {
    phone_number: phoneNumber,
    message_type: "LIST_REPLY",
    message_content: { callbackPayload: "menu_track_order", text: "📦 Track My Orders" },
  });
  console.log("Track Orders Result:", trackRes);

  // 2. Test Browse Watches (Fetch brands from API)
  console.log("\n--- 2. Testing 'Browse Watches' (Brands List from API) ---");
  const browseRes = await flowRouter.handleIncoming(phoneNumber, {
    phone_number: phoneNumber,
    message_type: "LIST_REPLY",
    message_content: { callbackPayload: "menu_browse_catalog", text: "⌚ Browse Watches" },
  });
  console.log("Browse Watches Result:", browseRes);

  // 3. Test Selecting a Brand (e.g. Tommy Hilfiger)
  console.log("\n--- 3. Testing Brand Selection ('Tommy Hilfiger') ---");
  const brandRes = await flowRouter.handleIncoming(phoneNumber, {
    phone_number: phoneNumber,
    message_type: "LIST_REPLY",
    message_content: { callbackPayload: "brand_38_Tommy_Hilfiger", text: "Tommy Hilfiger" },
  });
  console.log("Brand Watches Result:", brandRes);

  // 4. Test Store Locations (5 locations)
  console.log("\n--- 4. Testing 'Store Locations' ---");
  const locRes = await flowRouter.handleIncoming(phoneNumber, {
    phone_number: phoneNumber,
    message_type: "LIST_REPLY",
    message_content: { callbackPayload: "menu_store_locations", text: "📍 Store Locations" },
  });
  console.log("Store Locations Result:", locRes);

  // 5. Test Customer Support
  console.log("\n--- 5. Testing 'Customer Support' ---");
  const supRes = await flowRouter.handleIncoming(phoneNumber, {
    phone_number: phoneNumber,
    message_type: "LIST_REPLY",
    message_content: { callbackPayload: "menu_support", text: "👨‍💼 Customer Support" },
  });
  console.log("Support Result:", supRes);

  // 6. Test Back to Main Menu
  console.log("\n--- 6. Testing 'Return to Main Menu' ---");
  const menuRes = await flowRouter.handleIncoming(phoneNumber, {
    phone_number: phoneNumber,
    message_type: "QUICK_REPLY",
    message_content: { callbackPayload: "menu_main", text: "🏠 Main Menu" },
  });
  console.log("Main Menu Result:", menuRes);

  console.log("\n==================================================");
  console.log("🎉 All Flows Tested Successfully!");
  console.log("==================================================");

  await closeRedis();
  await closeDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

