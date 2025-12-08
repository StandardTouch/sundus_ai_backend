/**
 * Email Utility
 * Global utility for sending emails via SMTP
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { smtpConfig, validateSMTPConfig } from "../config/smtp.config.js";
import { logger } from "./logger.js";

let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter(): Transporter {
  if (!transporter) {
    validateSMTPConfig();
    
    transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password.replace(/\s/g, ""), // Remove spaces from app password
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  
  return transporter;
}

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Send email
 * 
 * @param options - Email options
 * @returns Promise with message info
 */
export async function sendEmail(options: EmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const transporter = getTransporter();
    
    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.email}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(", ") : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc) : undefined,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info("Email sent successfully", {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    logger.error("Email send error", {
      error: error.message,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

/**
 * Send plain text email
 * 
 * @param to - Recipient email address(es)
 * @param subject - Email subject
 * @param text - Plain text content
 * @returns Promise with send result
 */
export async function sendTextEmail(
  to: string | string[],
  subject: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendEmail({
    to,
    subject,
    text,
  });
}

/**
 * Send HTML email
 * 
 * @param to - Recipient email address(es)
 * @param subject - Email subject
 * @param html - HTML content
 * @param text - Plain text fallback (optional)
 * @returns Promise with send result
 */
export async function sendHtmlEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Verify SMTP connection
 * 
 * @returns Promise with verification result
 */
export async function verifySMTPConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    
    logger.info("SMTP connection verified");
    
    return {
      success: true,
    };
  } catch (error: any) {
    logger.error("SMTP verification failed", { error: error.message });
    
    return {
      success: false,
      error: error.message || "SMTP verification failed",
    };
  }
}

