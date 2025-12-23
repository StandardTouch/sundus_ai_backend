#!/usr/bin/env tsx

/**
 * Set Support Phone Number Script
 * 
 * Usage:
 *   Direct: ./scripts/set-support-phone-number.ts
 *   Or:     npx tsx scripts/set-support-phone-number.ts
 * 
 * Sets the support phone number in the database.
 * This number is sent to users when they select "Talk to Human" in the feedback template.
 * Default value: +966 9200 09339
 */

import dotenv from "dotenv";
import { connectDatabase, closeDatabase } from "../src/config/database.js";
import { supportSettingsRepository } from "../src/repositories/support-settings.repository.js";
import { logger } from "../src/utils/logger.js";

dotenv.config();

const SETTING_KEY = "support_phone_number";
const SUPPORT_PHONE_NUMBER = "+966 9200 09339";
const DESCRIPTION = "Support team phone number for customer assistance. Sent to users when they select 'Talk to Human' in feedback template.";

async function setSupportPhoneNumber() {
  try {
    logger.info("Starting support phone number setup script");

    // Connect to database
    await connectDatabase();
    logger.info("Connected to database");

    // Check if setting already exists
    const existingSetting = await supportSettingsRepository.findByKey(SETTING_KEY);
    if (existingSetting) {
      logger.warn("Support phone number already exists", {
        key: SETTING_KEY,
        value: existingSetting.value,
        updated_at: existingSetting.updated_at
      });
      console.log("\n⚠️  Support phone number already exists!");
      console.log(`   Current Value: ${existingSetting.value}`);
      console.log(`   Last Updated: ${existingSetting.updated_at}`);
      console.log(`\n💡 Use the API endpoint to update:`);
      console.log(`   PUT /api/settings/support-phone-number\n`);
      await closeDatabase();
      process.exit(0);
    }

    // Create setting
    logger.info("Creating support phone number setting...");
    const setting = await supportSettingsRepository.create({
      key: SETTING_KEY,
      value: SUPPORT_PHONE_NUMBER,
      description: DESCRIPTION
    });

    logger.info("Support phone number set successfully", {
      id: setting._id,
      key: setting.key,
      value: setting.value
    });

    console.log("\n✅ Support phone number set successfully!");
    console.log("\n📋 Setting Details:");
    console.log(`   Key: ${setting.key}`);
    console.log(`   Phone Number: ${setting.value}`);
    console.log(`   Description: ${setting.description}`);
    console.log(`   Created At: ${setting.created_at}`);
    console.log(`\n💡 Use the API endpoints to manage this setting:`);
    console.log(`   GET /api/settings/support-phone-number - Get current phone number`);
    console.log(`   PUT /api/settings/support-phone-number - Update phone number\n`);

    // Close database connection
    await closeDatabase();
    process.exit(0);
  } catch (error: any) {
    logger.error("Error setting support phone number", {
      error: error.message
    });
    console.error("\n❌ Error setting support phone number:");
    console.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run the script
setSupportPhoneNumber();

