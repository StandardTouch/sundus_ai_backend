/**
 * Alhomaidhi API Configuration
 * Configuration for Alhomaidhi Group API client
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * Alhomaidhi API configuration
 */
export const alhomaidhiConfig = {
  /**
   * Base URL for Alhomaidhi API
   */
  baseUrl: process.env.ALHOMAIDHI_API_BASE_URL || "https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2",

  /**
   * API Key for product and brand endpoints
   */
  apiKey: process.env.ALHOMAIDHI_API_KEY || "",

  /**
   * API Key for order endpoints
   */
  orderApiKey: process.env.ALHOMAIDHI_ORDER_API_KEY || "",

  /**
   * Default user ID for API requests
   */
  defaultUserId: process.env.ALHOMAIDHI_DEFAULT_USER_ID || "66",

  /**
   * Default timeout for API requests (ms)
   * Reduced to 15 seconds to fail fast
   */
  timeout: parseInt(process.env.ALHOMAIDHI_TIMEOUT || "15000", 10),

  /**
   * Default language for API requests
   */
  defaultLanguage: process.env.ALHOMAIDHI_DEFAULT_LANGUAGE || "en",
};

/**
 * Validate Alhomaidhi configuration
 */
export function validateAlhomaidhiConfig(): void {
  if (!alhomaidhiConfig.apiKey) {
    throw new Error("ALHOMAIDHI_API_KEY is required");
  }
  if (!alhomaidhiConfig.orderApiKey) {
    throw new Error("ALHOMAIDHI_ORDER_API_KEY is required");
  }
}

