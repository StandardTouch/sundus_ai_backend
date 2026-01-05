#!/usr/bin/env tsx

/**
 * Test OpenAI API Key Script
 * 
 * Usage:
 *   Direct: ./scripts/test-openai-key.ts
 *   Or:     npx tsx scripts/test-openai-key.ts
 * 
 * This script tests your OpenAI API key by:
 * 1. Loading the API key from environment variables
 * 2. Making a simple API call to verify the key works
 * 3. Displaying API key status and account information
 */

import dotenv from "dotenv";
import OpenAI from "openai";
import { logger } from "../src/utils/logger.js";

dotenv.config();

async function testOpenAIKey() {
  try {
    console.log("🔑 Testing OpenAI API Key...\n");

    // Check if API key exists
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log("❌ OPENAI_API_KEY not found in environment variables");
      console.log("   Please set OPENAI_API_KEY in your .env file\n");
      process.exit(1);
    }

    // Mask API key for display (show first 7 and last 4 characters)
    const maskedKey = apiKey.length > 11 
      ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`
      : "***";
    
    console.log(`📋 API Key: ${maskedKey}`);
    console.log("   Testing connection...\n");

    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
      organization: process.env.OPENAI_ORGANIZATION,
      project: process.env.OPENAI_PROJECT,
    });

    // Test 1: List models (lightweight API call)
    console.log("🧪 Test 1: Listing available models...");
    try {
      const models = await openai.models.list();
      const modelNames = models.data.slice(0, 5).map(m => m.id);
      console.log(`   ✅ Success! Found ${models.data.length} models`);
      console.log(`   📦 Sample models: ${modelNames.join(", ")}`);
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      throw error;
    }

    // Test 2: Simple chat completion (actual usage test)
    console.log("\n🧪 Test 2: Testing chat completion...");
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_DEFAULT_MODEL || "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: "Say 'Hello, API key is working!' in one sentence."
          }
        ],
        max_tokens: 20,
      });

      const response = completion.choices[0]?.message?.content || "No response";
      console.log(`   ✅ Success! Model responded:`);
      console.log(`   💬 "${response}"`);
      
      // Show usage info if available
      if (completion.usage) {
        console.log(`   📊 Tokens used: ${completion.usage.total_tokens} (prompt: ${completion.usage.prompt_tokens}, completion: ${completion.usage.completion_tokens})`);
      }
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      
      // Check for specific error types
      if (error.status === 401) {
        console.log("\n   ⚠️  This usually means:");
        console.log("      - API key is invalid or expired");
        console.log("      - API key doesn't have proper permissions");
      } else if (error.status === 429) {
        console.log("\n   ⚠️  Rate limit exceeded. Your key works but you've hit the limit.");
      } else if (error.status === 402) {
        console.log("\n   ⚠️  Payment required. Your account may need billing setup.");
      }
      
      throw error;
    }

    // Test 3: Check account/organization info (if available)
    if (process.env.OPENAI_ORGANIZATION) {
      console.log(`\n📋 Organization ID: ${process.env.OPENAI_ORGANIZATION}`);
    }
    if (process.env.OPENAI_PROJECT) {
      console.log(`📋 Project ID: ${process.env.OPENAI_PROJECT}`);
    }

    // Success summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ OpenAI API Key Test: PASSED");
    console.log("=".repeat(60));
    console.log("   Your OpenAI API key is valid and working!");
    console.log("   You can use OpenAI services in your application.\n");

    process.exit(0);
  } catch (error: any) {
    logger.error("OpenAI API key test failed", {
      error: error.message,
      status: error.status,
      code: error.code
    });

    console.log("\n" + "=".repeat(60));
    console.log("❌ OpenAI API Key Test: FAILED");
    console.log("=".repeat(60));
    console.log(`   Error: ${error.message}`);
    
    if (error.status) {
      console.log(`   Status Code: ${error.status}`);
    }
    
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Verify OPENAI_API_KEY is set correctly in .env");
    console.log("   2. Check if the API key is valid at: https://platform.openai.com/api-keys");
    console.log("   3. Ensure your OpenAI account has credits/billing set up");
    console.log("   4. Check your internet connection\n");

    process.exit(1);
  }
}

// Run the script
testOpenAIKey();

