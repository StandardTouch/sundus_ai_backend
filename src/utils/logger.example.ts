/**
 * Logger Usage Examples
 * 
 * This file demonstrates how to use the logger utility throughout the application
 */

import { logger, logError, logWarning, logInfo, logDebug } from "./logger.js";

// Example 1: Basic logging
export function exampleBasicLogging() {
  logger.info("Application started");
  logger.warn("This is a warning");
  logger.error("This is an error");
  logger.debug("This is a debug message");
}

// Example 2: Logging with context
export function exampleLoggingWithContext() {
  logger.info("User logged in", {
    userId: "123",
    email: "user@example.com",
    ip: "192.168.1.1",
  });

  logger.error("Failed to process payment", {
    orderId: "ORD-123",
    amount: 100.50,
    paymentMethod: "credit_card",
  });
}

// Example 3: Using helper functions
export function exampleHelperFunctions() {
  logInfo("Processing order", { orderId: "ORD-123" });
  logWarning("Low inventory", { productId: "PROD-456", stock: 5 });
  logDebug("Cache hit", { key: "user:123", ttl: 3600 });
  
  // Error logging with stack trace
  try {
    throw new Error("Something went wrong");
  } catch (error) {
    logError(error as Error, { context: "order processing" });
  }
}

// Example 4: Logging in async functions
export async function exampleAsyncLogging() {
  try {
    logger.info("Starting async operation");
    
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info("Async operation completed");
  } catch (error) {
    logError(error as Error, { operation: "async task" });
  }
}

// Example 5: Conditional logging based on log level
export function exampleConditionalLogging() {
  // These will only log if LOG_LEVEL is set to "debug"
  logger.debug("Detailed debug information", {
    requestId: "req-123",
    processingTime: 45,
    cacheStatus: "miss",
  });
}

