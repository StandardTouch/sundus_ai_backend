#!/usr/bin/env tsx

/**
 * Test SMTP Connection Script
 * 
 * Usage:
 *   tsx scripts/test-smtp.ts
 * 
 * Tests SMTP connection and sends a test email
 */

import nodemailer from "nodemailer";

const SMTP_EMAIL = "info@alhomaidhi.com";
const SMTP_APP_PASSWORD = "sywh bxwp ochr pexh"; // App password for "email alhomaidhi"
const TEST_RECIPIENT = "yaseen@standardtouch.com"; // Send test email to this address

// Gmail/Google Workspace SMTP configuration
// For custom domains (Google Workspace), use the same settings as Gmail
const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_APP_PASSWORD.replace(/\s/g, ""), // Remove spaces from app password
  },
  tls: {
    // Do not fail on invalid certificates
    rejectUnauthorized: false
  }
};

async function testSMTP() {
  try {
    console.log("\n🔌 Testing SMTP connection...");
    console.log(`   Email: ${SMTP_EMAIL}`);
    console.log(`   Host: ${SMTP_CONFIG.host}`);
    console.log(`   Port: ${SMTP_CONFIG.port}\n`);

    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    // Verify connection
    console.log("📡 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully!\n");

    // Send test email
    console.log(`📧 Sending test email to ${TEST_RECIPIENT}...`);
    
    const mailOptions = {
      from: `"Sundus AI" <${SMTP_EMAIL}>`,
      to: TEST_RECIPIENT,
      subject: "SMTP Test - Sundus AI Backend",
      text: `This is a test email from Sundus AI Backend.

If you received this email, your SMTP configuration is working correctly!

Timestamp: ${new Date().toISOString()}
Email: ${SMTP_EMAIL}
Host: ${SMTP_CONFIG.host}
Port: ${SMTP_CONFIG.port}

This is an automated test message.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ SMTP Test Successful!</h2>
          <p>This is a test email from <strong>Sundus AI Backend</strong>.</p>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration Details:</h3>
            <ul>
              <li><strong>Email:</strong> ${SMTP_EMAIL}</li>
              <li><strong>Host:</strong> ${SMTP_CONFIG.host}</li>
              <li><strong>Port:</strong> ${SMTP_CONFIG.port}</li>
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 12px;">
            This is an automated test message.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Test email sent successfully!");
    console.log("\n📋 Email Details:");
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   From: ${mailOptions.from}`);
    console.log(`   To: ${mailOptions.to}`);
    console.log(`   Subject: ${mailOptions.subject}`);
    console.log(`   Response: ${info.response}`);
    console.log("\n✨ SMTP test completed successfully!\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ SMTP test failed!");
    console.error("\nError details:");
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.response) {
      console.error(`   Response: ${error.response}`);
    }
    if (error.responseCode) {
      console.error(`   Response Code: ${error.responseCode}`);
    }
    if (error.command) {
      console.error(`   Command: ${error.command}`);
    }
    
    console.error(`   Message: ${error.message}`);
    
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    console.error("\n💡 Troubleshooting tips:");
    console.error("   1. Verify the app password is correct (no spaces)");
    console.error("   2. For Google Workspace accounts:");
    console.error("      - Make sure 2-factor authentication is enabled");
    console.error("      - Generate a new app password from: https://myaccount.google.com/apppasswords");
    console.error("      - Use the full email address (info@alhomaidhi.com)");
    console.error("   3. For Gmail accounts:");
    console.error("      - Enable 2-factor authentication");
    console.error("      - Generate app password from Google Account settings");
    console.error("   4. Verify the email domain is using Google Workspace");
    console.error("   5. Try port 465 with secure: true if port 587 doesn't work");
    console.error("   6. Check if your organization has SMTP restrictions\n");

    process.exit(1);
  }
}

// Run the test
testSMTP();

