/**
 * Support Settings Model
 * MongoDB schema for support-related settings (string values)
 */

export interface SupportSettings {
  _id?: string;
  
  // Setting key (unique identifier)
  key: string;                    // e.g., "support_phone_number"
  
  // Setting value (string)
  value: string;                  // String value for the setting
  
  // Metadata
  description?: string;            // Human-readable description
  updated_by?: string;            // User ID who last updated this setting
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Support Settings DTO
 */
export interface CreateSupportSettingsDto {
  key: string;
  value: string;
  description?: string;
}

/**
 * Update Support Settings DTO
 */
export interface UpdateSupportSettingsDto {
  value?: string;
  description?: string;
}

