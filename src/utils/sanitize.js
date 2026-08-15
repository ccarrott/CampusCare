// src/utils/sanitize.js
// Single-source input sanitisation utility.

export function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>]/g, '').trim();
}
