/**
 * Direct Message Sender Script
 * Sends a message directly via AiSensy from your local environment, benchmarks latency,
 * and sends the latency breakdown as a WhatsApp message to the user.
 *
 * Usage:
 *   npx tsx scripts/send-direct-message.ts <phone_number> "<message_text>"
 *
 * Example:
 *   npx tsx scripts/send-direct-message.ts 917204708561 "Hello from local server test!"
 */

import dotenv from "dotenv";
dotenv.config();

import { AISensyService } from "../src/services/aisensy.service.js";

async function main() {
  const args = process.argv.slice(2);
  const phoneNumber = args[0] || process.env.TEST_PHONE_NUMBER || "966500000000";
  const message = args[1] || "🚀 Direct local test message from Sundus AI backend!";

  console.log("=========================================");
  console.log("📱 Direct AiSensy WhatsApp Message Sender");
  console.log("=========================================");
  console.log(`Phone Number : ${phoneNumber}`);
  console.log(`Message      : "${message}"`);
  console.log("-----------------------------------------");
  console.log("Sending main message via AiSensy API...");

  const aisensyService = new AISensyService();

  const startTime = process.hrtime.bigint();
  const result = await aisensyService.sendTextMessage(phoneNumber, message);
  const endTime = process.hrtime.bigint();

  const elapsedMs = Number(endTime - startTime) / 1000000;
  const elapsedSeconds = (elapsedMs / 1000).toFixed(2);
  const latencyMessage = `⏱️ Latency: ${elapsedSeconds}s (${elapsedMs.toFixed(2)} ms)`;

  console.log("-----------------------------------------");
  if (result.success) {
    console.log(`✅ Main Message Sent Successfully!`);
    console.log(`Message ID: ${result.message_id || result.data?.messageId || "N/A"}`);

    console.log(`Sending latency message to WhatsApp: "${latencyMessage}"...`);
    const latencyResult = await aisensyService.sendTextMessage(phoneNumber, latencyMessage);

    if (latencyResult.success) {
      console.log(`✅ Latency Message Sent to WhatsApp!`);
    } else {
      console.log(`❌ Failed to send latency message to WhatsApp:`, latencyResult.error);
    }
  } else {
    console.log(`❌ Failed to send main message.`);
    console.log(`Error:`, result.error);
  }

  console.log(`⏱️ Latency: ${elapsedSeconds}s (${elapsedMs.toFixed(2)} ms)`);
  console.log("=========================================");
}

main().catch(err => {
  console.error("Execution error:", err);
  process.exit(1);
});
