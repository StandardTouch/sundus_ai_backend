/**
 * User Session Model
 * MongoDB schema for user sessions/state
 */

export interface UserSession {
  _id?: string;
  
  // User Identification
  phone_number: string;           // Primary identifier (unique)
  contact_id?: string;            // From AI Sensy webhook
  
  // User Preferences
  language: 'en' | 'ar' | 'auto'; // User's language preference
  
  // Status
  status: 'active' | 'escalated' | 'closed';
  
  // Feedback Tracking
  negative_feedback_count: number;  // Track "No" clicks (for escalation)
  positive_feedback_count: number;  // Track "Yes" clicks (for analytics)
  
  // Authentication (after OTP verification)
  token?: string;                 // Authentication token from OTP verification
  user_id?: string;                // User ID from OTP verification
  token_expires_at?: Date;        // Token expiration timestamp
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Create User Session DTO
 */
export interface CreateUserSessionDto {
  phone_number: string;
  contact_id?: string;
  language?: 'en' | 'ar' | 'auto';
}

/**
 * Update User Session DTO
 */
export interface UpdateUserSessionDto {
  language?: 'en' | 'ar' | 'auto';
  status?: 'active' | 'escalated' | 'closed';
  negative_feedback_count?: number;
  positive_feedback_count?: number;
  token?: string;
  user_id?: string;
  token_expires_at?: Date;
}

