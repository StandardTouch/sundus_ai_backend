/**
 * Location Model
 * MongoDB schema for Service Centers / Locations
 */

export interface TimingShift {
  open: string;   // e.g., "09:00"
  close: string;  // e.g., "18:00"
}

export interface LocationTiming {
  day: string;    // e.g., "Monday"
  shifts: TimingShift[];
  isClosed: boolean;
}

export interface Location {
  _id?: string;
  
  // Content
  location_id: string;              // Unique ID for the location (e.g., "79", "28")
  store_manager_name: string;       // Name of the store manager
  store_manager_phone: string;      // Phone number of the store manager
  store_contact_phone: string;      // Phone number of the store contact
  location_title: string;           // Location title (English)
  location_title_ara: string;       // Location title (Arabic)
  location_address: string;         // Location address (English)
  location_address_ara: string;     // Location address (Arabic)
  location_latitude: string;
  location_longitude: string;
  // location_animation: string;       // e.g., "DROP"

  // Regional Info
  country?: string;                  // Country code e.g., "SA"
  state?: string;                    // State/Region code e.g., "05"
  city?: string;                     // City name e.g., "Al Fuwayliq"

  // Operating Hours
  timings?: LocationTiming[];        // Weekly schedule with multiple shifts

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
  store_manager_name: string;
  store_contact_phone: string;
  store_manager_phone: string;
  location_title: string;
  location_title_ara: string;
  location_address: string;
  location_address_ara: string;
  location_latitude: string;
  location_longitude: string;
  // location_animation?: string;

  // Regional Info
  country?: string;
  state?: string;
  city?: string;

  // Operating Hours
  timings?: LocationTiming[];

  isActive?: boolean;
}

/**
 * Update Location DTO
 */
export interface UpdateLocationDto {
  location_id?: string;
  store_manager_name?: string;
  store_manager_phone?: string;
  store_contact_phone?: string;
  location_title?: string;
  location_title_ara?: string;
  location_address?: string;
  location_address_ara?: string;
  location_latitude?: string;
  location_longitude?: string;
  // location_animation?: string;

  // Regional Info
  country?: string;
  state?: string;
  city?: string;

  // Operating Hours
  timings?: LocationTiming[];

  isActive?: boolean;
}
