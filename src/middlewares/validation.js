/**
 * CampusCare Input Validation & Sanitization Utilities
 */

/**
 * Strips HTML tags and trims whitespace from a string.
 */
export function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>]/g, '').trim();
}

/**
 * Validates a student number format: starts with 's' followed by 9 digits.
 */
export function isValidStudentNumber(id) {
  return /^s\d{9}$/.test(id);
}

/**
 * Validates a basic email format.
 */
export function isValidEmail(email) {
  if (!email) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates phone number (SA format: 10 digits starting with 0).
 */
export function isValidPhone(phone) {
  if (!phone) return true; // optional
  return /^0\d{9}$/.test(phone.replace(/\s/g, ''));
}

/**
 * Validates password meets minimum length.
 */
export function isValidPassword(password, minLength = 6) {
  return password && password.length >= minLength;
}
