/**
 * OpenAI Configuration
 * Configuration for OpenAI API client
 */

import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

/**
 * OpenAI API configuration
 */
export const openaiConfig = {
  /**
   * OpenAI API Key
   * Get from: https://platform.openai.com/api-keys
   */
  apiKey: process.env.OPENAI_API_KEY || "",

  /**
   * OpenAI Organization ID (optional)
   * Used for organization-level API usage tracking
   */
  organization: process.env.OPENAI_ORGANIZATION || undefined,

  /**
   * OpenAI Project ID (optional)
   * Used for project-level API usage tracking
   */
  project: process.env.OPENAI_PROJECT || undefined,

  /**
   * Default model to use
   * Examples: "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"
   */
  defaultModel: process.env.OPENAI_DEFAULT_MODEL || "gpt-4-turbo",

  /**
   * Default timeout for API requests (ms)
   */
  timeout: parseInt(process.env.OPENAI_TIMEOUT || "30000", 10),

  /**
   * Maximum number of retries for failed requests
   */
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || "3", 10),
};

/**
 * Validate OpenAI configuration
 */
export function validateOpenAIConfig(): void {
  if (!openaiConfig.apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
}

/**
 * Create OpenAI client instance
 * Call this after validating the config
 */
export function createOpenAIClient(): OpenAI {
  validateOpenAIConfig();

  return new OpenAI({
    apiKey: openaiConfig.apiKey,
    organization: openaiConfig.organization,
    project: openaiConfig.project,
    timeout: openaiConfig.timeout,
    maxRetries: openaiConfig.maxRetries,
  });
}

/**
 * Singleton OpenAI client instance
 * Use this for consistent client usage across the application
 */
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = createOpenAIClient();
  }
  return openaiClient;
}

