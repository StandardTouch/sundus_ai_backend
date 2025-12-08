/**
 * User Model
 * MongoDB schema for admin and customer support users
 */

export type UserRole = 'admin' | 'customer_support';

export interface User {
  _id?: string;
  
  // User Identification
  username: string;              // Unique username
  email: string;                 // Unique email
  password_hash: string;          // Hashed password (bcrypt)
  
  // User Info
  full_name: string;             // Full name
  role: UserRole;                 // User role: admin or customer_support
  
  // Status
  is_active: boolean;             // Account active status
  last_login_at?: Date;           // Last login timestamp
  last_login_ip?: string;         // Last login IP address
  
  // Metadata
  created_by?: string;            // User ID who created this user (for admin-created users)
  created_at: Date;
  updated_at: Date;
}

/**
 * Create User DTO
 */
export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
}

/**
 * Update User DTO
 */
export interface UpdateUserDto {
  email?: string;
  password?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

/**
 * User Response (without password)
 */
export interface UserResponse {
  _id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: Date;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Login Request DTO
 */
export interface LoginDto {
  username: string;
  password: string;
}

/**
 * Login Response
 */
export interface LoginResponse {
  user: UserResponse;
  token: string;
  expires_at: Date;
}

