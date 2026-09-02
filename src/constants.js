// src/constants.js
// Single source of truth for enum-like values used across the application.

export const ROLES = Object.freeze({
  STUDENT: 'student',
  NURSE: 'nurse',
  ADMIN: 'admin'
});

export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
});

export const APPOINTMENT_TYPE = Object.freeze({
  PHYSICAL: 'Physical',
  ONLINE: 'Online'
});

// Daily.co room lifecycle timing (minutes relative to appointment Time)
export const DAILY = Object.freeze({
  JOIN_WINDOW_BEFORE_MIN: 15,   // earliest a user can join before the slot
  ROOM_BUFFER_AFTER_MIN: 60,    // room/token stays valid this long past the slot
  API_BASE: 'https://api.daily.co/v1'
});

export const SEVERITY = Object.freeze({
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High'
});
