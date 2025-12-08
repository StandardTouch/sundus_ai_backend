/**
 * Password Reset Token Model
 * MongoDB schema for password reset tokens (generated after OTP verification)
 */

export interface PasswordResetToken {
  _id?: string;
  
  // User identification
  email: string;              // User's email address
  user_id: string;            // User ID
  
  // Token details
  token_lookup: string;       // SHA256 hash for fast database lookup
  token_hash: string;         // Bcrypt hashed token (for security)
  
  // Status
  is_used: boolean;           // Whether token has been used
  is_expired: boolean;         // Whether token has expired
  
  // Expiration
  expires_at: Date;           // Token expiration timestamp (typically 15-30 minutes)
  used_at?: Date;             // When token was used
  
  // Metadata
  ip_address?: string;        // IP address of request
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Password Reset Token DTO
 */
export interface CreatePasswordResetTokenDto {
  email: string;
  user_id: string;
  token_lookup: string;       // SHA256 hash for fast lookup
  token_hash: string;         // Bcrypt hash for verification
  expires_at: Date;
  ip_address?: string;
}

/**
 * Reset Password DTO
 */
export interface ResetPasswordDto {
  token: string;
  new_password: string;
}

