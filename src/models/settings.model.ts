/**
 * Settings Model
 * MongoDB schema for application settings
 */

export interface Settings {
  _id?: string;
  
  // Setting key (unique identifier)
  key: string;                    // e.g., "webhook_active"
  
  // Setting value
  value: boolean;                 // Boolean value for the setting
  
  // Metadata
  description?: string;            // Human-readable description
  updated_by?: string;             // User ID who last updated this setting
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Settings DTO
 */
export interface CreateSettingsDto {
  key: string;
  value: boolean;
  description?: string;
}

/**
 * Update Settings DTO
 */
export interface UpdateSettingsDto {
  value?: boolean;
  description?: string;
}

/**
 * Settings Response
 */
export interface SettingsResponse {
  _id: string;
  key: string;
  value: boolean;
  description?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

