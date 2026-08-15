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

export const SEVERITY = Object.freeze({
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High'
});
