// src/modules/auth/auth.model.js
// Database queries for authentication, registration, and password reset.

import { query } from '../../config/database.js';

// Re-export shared user lookups
export { findStudentById, findNurseById, findAdminById, updatePassword } from '../shared/user.model.js';

// ============================================================================
// REGISTRATION
// ============================================================================

export async function createStudent({ studentNumber, firstName, lastName, medicalHistory, password }) {
  const sql = `
    INSERT INTO Student (StudentNumber, FirstName, LastName, MedicalHistory, Password)
    VALUES (?, ?, ?, ?, ?)
  `;
  return await query(sql, [studentNumber, firstName, lastName, medicalHistory || '', password]);
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

export async function createPasswordResetToken({ userId, userType, token, expiresAt }) {
  const id = 'RST-' + Date.now();
  const sql = `
    INSERT INTO PasswordResetToken (TokenID, UserID, UserType, Token, ExpiresAt, Used)
    VALUES (?, ?, ?, ?, ?, 0)
  `;
  return await query(sql, [id, userId, userType, token, expiresAt]);
}

export async function findValidResetToken(token) {
  const sql = `
    SELECT * FROM PasswordResetToken
    WHERE Token = ? AND Used = 0 AND ExpiresAt > NOW()
  `;
  const results = await query(sql, [token]);
  return results[0];
}

export async function markTokenUsed(token) {
  const sql = 'UPDATE PasswordResetToken SET Used = 1 WHERE Token = ?';
  return await query(sql, [token]);
}
