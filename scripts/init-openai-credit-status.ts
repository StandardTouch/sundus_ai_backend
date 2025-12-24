#!/usr/bin/env tsx
/**
 * Initialize OpenAI Credit Status
 * Sets the initial OpenAI credit availability status in the database
 * 
 * Usage: npx tsx scripts/init-openai-credit-status.ts
 */

import dotenv from "dotenv";
import { connectDatabase, closeDatabase } from "../src/config/database.js";
import { openaiCreditService } from "../src/services/openai-credit.service.js";
import { logger } from "../src/utils/logger.js";

dotenv.config();

async function initOpenAICreditStatus() {
  try {
    logger.info("Connecting to database...");
    await connectDatabase();
    logger.info("✅ Database connected");

    // Initialize credit status as available (default)
    logger.info("Setting OpenAI credit status to 'available' (default)...");
    await openaiCreditService.setCreditsAvailable(true, "system");

    logger.info("✅ OpenAI credit status initialized successfully");
    logger.info("   Status: Available (default)");
    logger.info("   Note: Status will be automatically updated when credit errors are detected");

  } catch (error: any) {
    logger.error("❌ Failed to initialize OpenAI credit status", {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await closeDatabase();
    logger.info("Database connection closed");
  }
}

// Run the script
initOpenAICreditStatus();

