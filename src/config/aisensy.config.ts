/**
 * AI Sensy Configuration
 * Configuration for AI Sensy WhatsApp API
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * AI Sensy API configuration
 */
export const aisensyConfig = {
  /**
   * AI Sensy API base URL
   */
  apiBaseUrl: process.env.AISENSY_API_BASE_URL || "https://apis.aisensy.com",

  /**
   * AI Sensy Partner API Key
   * Used in X-AiSensy-Partner-API-Key header
   */
  apiKey: process.env.AISENSY_API_KEY || "",

  /**
   * Project ID
   * Used in API endpoint: /project-apis/v1/project/{projectId}/messages
   */
  projectId: process.env.AISENSY_PROJECT_ID || "655b383d2c1f7c51b62a7338",

  /**
   * Webhook secret (for verifying incoming webhooks)
   */
  webhookSecret: process.env.AISENSY_WEBHOOK_SECRET || "",

  /**
   * Default timeout for API requests (ms)
   */
  timeout: parseInt(process.env.AISENSY_TIMEOUT || "10000", 10),
};

/**
 * Validate AI Sensy configuration
 */
export function validateAISensyConfig(): void {
  if (!aisensyConfig.apiKey) {
    throw new Error("AISENSY_API_KEY is required");
  }
  if (!aisensyConfig.projectId) {
    throw new Error("AISENSY_PROJECT_ID is required");
  }
}

