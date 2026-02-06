/**
 * Location Model
 * MongoDB schema for Service Centers / Locations
 */

export interface Location {
  _id?: string;
  
  // Content
  location_id: string;               // Unique ID for the location (e.g., "79", "28")
  location_title: string;           // Location title (English)
  location_title_ara: string;       // Location title (Arabic)
  location_address: string;         // Location address (English)
  location_address_ara: string;     // Location address (Arabic)
  location_latitude: string;
  location_longitude: string;
  location_animation: string;       // e.g., "DROP"
  
  // Metadata
  isActive: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Location DTO
 */
export interface CreateLocationDto {
  location_id?: string;
  location_title: string;
  location_title_ara: string;
  location_address: string;
  location_address_ara: string;
  location_latitude: string;
  location_longitude: string;
  location_animation?: string;
  isActive?: boolean;
}

/**
 * Update Location DTO
 */
export interface UpdateLocationDto {
  location_id?: string;
  location_title?: string;
  location_title_ara?: string;
  location_address?: string;
  location_address_ara?: string;
  location_latitude?: string;
  location_longitude?: string;
  location_animation?: string;
  isActive?: boolean;
}
