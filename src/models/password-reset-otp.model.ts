/**
 * Password Reset OTP Model
 * MongoDB schema for password reset OTPs
 */

export interface PasswordResetOTP {
  _id?: string;
  
  // User identification
  email: string;              // User's email address
  user_id: string;            // User ID
  
  // OTP details
  otp_code: string;           // 6-digit OTP code
  otp_hash: string;           // Hashed OTP (for security)
  
  // Status
  is_used: boolean;           // Whether OTP has been used
  is_expired: boolean;         // Whether OTP has expired
  
  // Expiration
  expires_at: Date;           // OTP expiration timestamp
  used_at?: Date;             // When OTP was used
  
  // Metadata
  ip_address?: string;        // IP address of request
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Password Reset OTP DTO
 */
export interface CreatePasswordResetOTPDto {
  email: string;
  user_id: string;
  ip_address?: string;
}

/**
 * Verify OTP DTO
 */
export interface VerifyOTPDto {
  email: string;
  otp_code: string;
}

