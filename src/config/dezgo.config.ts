/**
 * Dezgo API Configuration
 */

import dotenv from "dotenv";

dotenv.config();

export const dezgoConfig = {
  /**
   * Dezgo API Key
   */
  apiKey: process.env.DEZGO_API_KEY || "",

  /**
   * Dezgo API Base URL
   */
  apiBaseUrl: process.env.DEZGO_API_BASE_URL || "https://api.dezgo.com",

  /**
   * Request timeout in milliseconds
   */
  timeout: parseInt(process.env.DEZGO_TIMEOUT || "60000", 10),
};

/**
 * Validate Dezgo configuration
 */
export function validateDezgoConfig(): void {
  if (!dezgoConfig.apiKey) {
    throw new Error("DEZGO_API_KEY is required");
  }
}
