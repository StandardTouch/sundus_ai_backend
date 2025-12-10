#!/usr/bin/env tsx

/**
 * Initialize Webhook Setting Script
 * 
 * Usage:
 *   Direct: ./scripts/init-webhook-setting.ts
 *   Or:     npx tsx scripts/init-webhook-setting.ts
 * 
 * Creates the webhook_active setting in the settings collection.
 * Default value: false (webhook processing disabled)
 */

import dotenv from "dotenv";
import { connectDatabase, closeDatabase } from "../src/config/database.js";
import { settingsRepository } from "../src/repositories/settings.repository.js";
import { logger } from "../src/utils/logger.js";

dotenv.config();

const SETTING_KEY = "webhook_active";
const DEFAULT_VALUE = false;
const DESCRIPTION = "Enable or disable webhook processing. When disabled, webhooks are received but not processed.";

async function initWebhookSetting() {
  try {
    logger.info("Starting webhook setting initialization...");

    // Connect to database
    await connectDatabase();
    logger.info("Connected to database");

    // Check if setting already exists
    const existingSetting = await settingsRepository.findByKey(SETTING_KEY);
    if (existingSetting) {
      logger.warn("Webhook setting already exists", {
        key: SETTING_KEY,
        value: existingSetting.value,
        updated_at: existingSetting.updated_at
      });
      console.log("\n⚠️  Webhook setting already exists!");
      console.log(`   Key: ${existingSetting.key}`);
      console.log(`   Value: ${existingSetting.value}`);
      console.log(`   Description: ${existingSetting.description || "N/A"}`);
      console.log(`   Last Updated: ${existingSetting.updated_at}`);
      await closeDatabase();
      process.exit(0);
    }

    // Create setting
    logger.info("Creating webhook setting...");
    const setting = await settingsRepository.create({
      key: SETTING_KEY,
      value: DEFAULT_VALUE,
      description: DESCRIPTION
    });

    logger.info("Webhook setting created successfully", {
      id: setting._id,
      key: setting.key,
      value: setting.value
    });

    console.log("\n✅ Webhook setting created successfully!");
    console.log("\n📋 Setting Details:");
    console.log(`   Key: ${setting.key}`);
    console.log(`   Value: ${setting.value} (${setting.value ? "enabled" : "disabled"})`);
    console.log(`   Description: ${setting.description}`);
    console.log(`   Created At: ${setting.created_at}`);
    console.log(`\n💡 Use the API endpoints to toggle this setting:`);
    console.log(`   GET  /api/settings/webhook/status - Get current status`);
    console.log(`   POST /api/settings/webhook/toggle - Toggle status\n`);

    // Close database connection
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error("Error initializing webhook setting", { error });
    console.error("\n❌ Error initializing webhook setting:");
    console.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run the script
initWebhookSetting();

