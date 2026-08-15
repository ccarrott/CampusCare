// src/middleware/validate.js
// Shared validation helpers for request data.

import { APPOINTMENT_STATUS, APPOINTMENT_TYPE } from '../constants.js';

export function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidStudentNumber(id) {
  if (!id) return false;
  return /^s\d{9}$/.test(id);
}

export function isValidPassword(password, minLength = 6) {
  return password && password.length >= minLength;
}

export function isValidPhone(phone) {
  if (!phone) return true; // optional field
  return /^0\d{9}$/.test(phone.replace(/\s/g, ''));
}

export function isValidScore(score) {
  const n = parseInt(score, 10);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

export function isValidAppointmentType(type) {
  return Object.values(APPOINTMENT_TYPE).includes(type);
}

export function isValidStatus(status) {
  return Object.values(APPOINTMENT_STATUS).includes(status);
}

export function isValidDatetime(str) {
  const d = new Date(str);
  return !isNaN(d.getTime());
}
