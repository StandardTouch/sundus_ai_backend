/**
 * SMTP Configuration
 * Configuration for email sending via SMTP
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * SMTP configuration
 */
export const smtpConfig = {
  /**
   * SMTP host
   * For Gmail/Google Workspace: smtp.gmail.com
   */
  host: process.env.SMTP_HOST || "smtp.gmail.com",

  /**
   * SMTP port
   * 587 for TLS, 465 for SSL
   */
  port: parseInt(process.env.SMTP_PORT || "587", 10),

  /**
   * Use SSL/TLS
   * true for port 465, false for port 587
   */
  secure: process.env.SMTP_SECURE === "true" || false,

  /**
   * Email address for sending emails
   */
  email: process.env.SMTP_EMAIL || "",

  /**
   * SMTP password (app password for Gmail/Google Workspace)
   */
  password: process.env.SMTP_PASSWORD || "",

  /**
   * From name (display name)
   */
  fromName: process.env.SMTP_FROM_NAME || "Sundus AI",

  /**
   * Default timeout for SMTP operations (ms)
   */
  timeout: parseInt(process.env.SMTP_TIMEOUT || "10000", 10),
};

/**
 * Validate SMTP configuration
 */
export function validateSMTPConfig(): void {
  if (!smtpConfig.email) {
    throw new Error("SMTP_EMAIL is required");
  }
  if (!smtpConfig.password) {
    throw new Error("SMTP_PASSWORD is required");
  }
}

