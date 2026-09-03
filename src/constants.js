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

// Tier-2 escalation rules engine tuning (Phase 29B).
export const ESCALATION = Object.freeze({
  RECURRENCE_WINDOW_DAYS: 7,   // "recent" check/booking window
  RECURRENCE_OVERLAP: 0.5,     // >= half of the PREVIOUS check's symptoms reappear
  DURATION_ESCALATE: ['1-2 weeks', '>2 weeks'] // symptom durations that warrant a nurse
});

// NMU campuses (Gqeberha) — nurses are assigned to a campus rather than a street address.
// Source: mandela.ac.za campus maps (six Gqeberha campuses + George in the Southern Cape).
export const CAMPUSES = Object.freeze([
  'South Campus',
  'North Campus',
  '2nd Avenue Campus',
  'Missionvale Campus',
  'Bird Street Campus',
  'Ocean Sciences Campus',
  'George Campus'
]);
