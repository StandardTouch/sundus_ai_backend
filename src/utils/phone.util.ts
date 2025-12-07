/**
 * Phone Number Utilities
 * Utilities for formatting and validating phone numbers
 */

/**
 * Normalize phone number (remove country code prefix for API calls)
 * 
 * @param phoneNumber - Phone number with or without country code
 * @returns Normalized phone number without country code prefix
 * 
 * @example
 * normalizePhoneNumber("+966560916906") => "560916906"
 * normalizePhoneNumber("966560916906") => "560916906"
 * normalizePhoneNumber("560916906") => "560916906"
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, "");

  // Remove common country code prefixes
  if (cleaned.startsWith("966")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("91")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("1")) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Validate phone number format
 * 
 * @param phoneNumber - Phone number to validate
 * @returns True if valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const cleaned = normalizePhoneNumber(phoneNumber);
  // Phone numbers should be 9-15 digits after normalization
  return /^[0-9]{9,15}$/.test(cleaned);
}

/**
 * Format phone number with country code
 * 
 * @param phoneNumber - Phone number without country code
 * @param countryCode - Country code (default: "966" for Saudi Arabia)
 * @returns Formatted phone number with country code
 */
export function formatPhoneNumberWithCountryCode(
  phoneNumber: string,
  countryCode: string = "966"
): string {
  const cleaned = normalizePhoneNumber(phoneNumber);
  return `+${countryCode}${cleaned}`;
}

