/**
 * Test Guided Flow: Language Step
 * Simulates incoming messages and tests interactive language selection buttons.
 *
 * Usage:
 *   npx tsx scripts/test-language-flow.ts [phone_number]
 */

import dotenv from "dotenv";
dotenv.config();

import { flowRouter } from "../src/flows/flow.router.js";
import { flowSessionService } from "../src/flows/flow-session.service.js";
import { connectRedis, closeRedis } from "../src/config/redis.config.js";

async function main() {
  const args = process.argv.slice(2);
  const phoneNumber = args[0] || "917676079163";

  console.log("==================================================");
  console.log("🧪 Testing Guided Flow: Language Selection");
  console.log("==================================================");
  console.log(`Target Phone: ${phoneNumber}`);

  await connectRedis();

  // Step 1: Clear any existing session to start fresh
  console.log("\n1. Resetting test user session...");
  await flowSessionService.clearSession(phoneNumber);

  // Step 2: Simulate initial user message ("Hi")
  console.log("2. Simulating incoming user message ('Hi')...");
  const fakeIncomingMessage = {
    phone_number: phoneNumber,
    message_type: "TEXT",
    message_content: {
      text: "Hi",
    },
  };

  const initialResult = await flowRouter.handleIncoming(phoneNumber, fakeIncomingMessage);
  console.log("Result of initial message:", initialResult);

  // Step 3: Check current session state
  const sessionAfterGreeting = await flowSessionService.getSession(phoneNumber);
  console.log("\n3. User Session State after greeting:", sessionAfterGreeting);

  // Step 4: Simulate clicking the "English 🇬🇧" button
  console.log("\n4. Simulating user clicking 'English 🇬🇧' button (lang_en)...");
  const fakeButtonClick = {
    phone_number: phoneNumber,
    message_type: "QUICK_REPLY",
    message_content: {
      callbackPayload: "lang_en",
      text: "English 🇬🇧",
    },
  };

  const buttonResult = await flowRouter.handleIncoming(phoneNumber, fakeButtonClick);
  console.log("Result of button click:", buttonResult);

  // Step 5: Check session state after selecting language
  const sessionAfterSelection = await flowSessionService.getSession(phoneNumber);
  console.log("\n5. User Session State after selection:", sessionAfterSelection);

  console.log("\n==================================================");
  console.log("✅ Language Flow Verification Completed!");
  console.log("==================================================");

  await closeRedis();
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

