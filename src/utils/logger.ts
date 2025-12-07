/**
 * Logger Utility
 * Winston-based logging system for the application
 */

import winston from "winston";
import dotenv from "dotenv";

dotenv.config();

/**
 * Log levels
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

/**
 * Get log level from environment
 */
const getLogLevel = (): string => {
  const level = process.env.LOG_LEVEL?.toLowerCase() || "info";
  const validLevels = ["error", "warn", "info", "debug"];
  return validLevels.includes(level) ? level : "info";
};

/**
 * Check if request logging is enabled
 */
export const isRequestLoggingEnabled = (): boolean => {
  return process.env.LOG_REQUESTS === "true";
};

/**
 * Check if response logging is enabled
 */
export const isResponseLoggingEnabled = (): boolean => {
  return process.env.LOG_RESPONSES === "true";
};

/**
 * Create Winston logger instance
 */
const createLogger = (): winston.Logger => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const logLevel = getLogLevel();

  // Console format for development
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata, null, 2)}`;
      }
      return msg;
    })
  );

  // JSON format for production
  const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Create transports
  const transports: winston.transport[] = [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: isDevelopment ? consoleFormat : jsonFormat,
      level: logLevel,
    }),
  ];

  // File transports (optional - can add later)
  // if (process.env.LOG_FILE_PATH) {
  //   transports.push(
  //     new winston.transports.File({
  //       filename: process.env.LOG_FILE_PATH,
  //       format: jsonFormat,
  //       level: logLevel,
  //     })
  //   );
  // }

  return winston.createLogger({
    levels: LOG_LEVELS,
    level: logLevel,
    transports,
    exitOnError: false,
  });
};

/**
 * Logger instance
 */
export const logger = createLogger();

/**
 * Log request details
 */
export const logRequest = (req: {
  method: string;
  url: string;
  headers?: Record<string, any>;
  body?: any;
  ip?: string;
}): void => {
  if (!isRequestLoggingEnabled()) return;

  const { method, url, headers, body, ip } = req;
  
  logger.info("Incoming Request", {
    method,
    url,
    ip: ip || "unknown",
    userAgent: headers?.["user-agent"] || "unknown",
    ...(body && Object.keys(body).length > 0 && { body }),
  });
};

/**
 * Log response details
 */
export const logResponse = (res: {
  method: string;
  url: string;
  statusCode: number;
  responseTime?: number;
  body?: any;
}): void => {
  if (!isResponseLoggingEnabled()) return;

  const { method, url, statusCode, responseTime, body } = res;
  
  const logLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
  
  logger[logLevel]("Outgoing Response", {
    method,
    url,
    statusCode,
    ...(responseTime && { responseTime: `${responseTime}ms` }),
    ...(body && Object.keys(body).length > 0 && { body }),
  });
};

/**
 * Log error with stack trace
 */
export const logError = (error: Error | string, context?: Record<string, any>): void => {
  if (error instanceof Error) {
    logger.error("Error occurred", {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  } else {
    logger.error("Error occurred", {
      message: error,
      ...context,
    });
  }
};

/**
 * Log warning
 */
export const logWarning = (message: string, context?: Record<string, any>): void => {
  logger.warn(message, context);
};

/**
 * Log info
 */
export const logInfo = (message: string, context?: Record<string, any>): void => {
  logger.info(message, context);
};

/**
 * Log debug
 */
export const logDebug = (message: string, context?: Record<string, any>): void => {
  logger.debug(message, context);
};

/**
 * Default export
 */
export default logger;

