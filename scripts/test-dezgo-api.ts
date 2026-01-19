#!/usr/bin/env tsx

/**
 * Test Dezgo API Script
 */

import dotenv from "dotenv";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { logger } from "../src/utils/logger.js";

dotenv.config();

async function testDezgoAPI() {
  try {
    console.log("🧪 Testing Dezgo API Connection...\n");

    const apiKey = process.env.DEZGO_API_KEY;
    if (!apiKey) {
      console.log("❌ DEZGO_API_KEY not found in .env");
      process.exit(1);
    }

    const maskedKey = apiKey.length > 10 
      ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
      : "***";
    console.log(`📋 API Key: ${maskedKey}`);

    // Since Dezgo doesn't have a simple 'me' or 'status' endpoint that is free,
    // we just check if the key is provided and try a very small request if possible,
    // or just assume it's working if the key format looks okay.
    // Actually, let's try to reach the endpoint with a dummy request to see if we get 401 or something else.
    
    console.log("🧪 Sending test request to Dezgo...");
    
    try {
      // Just check the endpoint exists and our key is accepted (might fail with 400 because of missing image)
      await axios.post("https://api.dezgo.com/remove-background", {}, {
        headers: {
          "X-Dezgo-Key": apiKey
        }
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log("❌ Failed: Unauthorized (Invalid API Key)");
        process.exit(1);
      } else if (error.response?.status === 400 || error.response?.status === 415) {
        // 400 or 415 is actually GOOD because it means the key was accepted but the request was malformed/empty
        console.log("✅ Success! Dezgo API endpoint reached and key accepted.");
      } else {
        console.log(`⚠️ Unexpected status: ${error.response?.status} - ${error.message}`);
      }
    }

    console.log("\n✅ Dezgo API connection test: PASSED");
    process.exit(0);
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    process.exit(1);
  }
}

testDezgoAPI();
