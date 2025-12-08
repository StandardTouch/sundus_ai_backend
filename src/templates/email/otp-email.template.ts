/**
 * OTP Email Template
 * HTML email template for password reset OTP
 */

/**
 * Generate OTP email HTML template
 * 
 * @param otp - 6-digit OTP code
 * @param userName - User's name (optional)
 * @param expiryMinutes - OTP expiry time in minutes
 * @returns HTML email content
 */
export function generateOTPEmailTemplate(
  otp: string,
  userName?: string,
  expiryMinutes: number = 10
): string {
  const greeting = userName ? `Hello ${userName},` : "Hello,";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🔐 Password Reset
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 20px; background-color: #ffffff;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                You requested to reset your password for your Sundus AI account. Use the OTP code below to complete the process:
              </p>
              
              <!-- OTP Box -->
              <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      <p style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${otp}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px 0; font-size: 14px; line-height: 1.6; color: #666666; text-align: center;">
                This code will expire in <strong>${expiryMinutes} minutes</strong>
              </p>
              
              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                If you didn't request this password reset, please ignore this email or contact support if you have concerns.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 20px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #6c757d;">
                This is an automated email from Sundus AI
              </p>
              <p style="margin: 0; font-size: 12px; color: #6c757d;">
                © ${new Date().getFullYear()} Sundus AI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate OTP email plain text version
 * 
 * @param otp - 6-digit OTP code
 * @param userName - User's name (optional)
 * @param expiryMinutes - OTP expiry time in minutes
 * @returns Plain text email content
 */
export function generateOTPEmailText(
  otp: string,
  userName?: string,
  expiryMinutes: number = 10
): string {
  const greeting = userName ? `Hello ${userName},` : "Hello,";
  
  return `
${greeting}

You requested to reset your password for your Sundus AI account. Use the OTP code below to complete the process:

OTP Code: ${otp}

This code will expire in ${expiryMinutes} minutes.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} Sundus AI. All rights reserved.
  `.trim();
}

