/**
 * Tool Settings Model
 * MongoDB schema for tool enable/disable settings
 */

export interface ToolSettings {
  _id?: string;
  
  // Tool identification
  tool_name: string;              // Unique tool name (e.g., "search_products", "track_order")
  
  // Tool metadata
  category: string;               // Tool category (e.g., "products", "orders", "faqs")
  display_name: string;           // Human-readable name (e.g., "Search Products")
  description: string;            // Tool description for admin panel
  
  // Status
  is_enabled: boolean;            // Whether tool is enabled
  
  // Metadata
  updated_by?: string;           // User ID who last updated this setting
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Tool Settings DTO
 */
export interface CreateToolSettingsDto {
  tool_name: string;
  category: string;
  display_name: string;
  description: string;
  is_enabled?: boolean;           // Default: true
}

/**
 * Update Tool Settings DTO
 */
export interface UpdateToolSettingsDto {
  is_enabled?: boolean;
  display_name?: string;
  description?: string;
}

/**
 * Tool Settings Response (for API)
 */
export interface ToolSettingsResponse {
  _id: string;
  tool_name: string;
  category: string;
  display_name: string;
  description: string;
  is_enabled: boolean;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

