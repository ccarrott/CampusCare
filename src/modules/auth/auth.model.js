// src/modules/auth/auth.model.js
// Database queries for authentication, registration, and password reset.

import { query } from '../../config/database.js';

// ============================================================================
// USER LOOKUP (Auto-detect login)
// ============================================================================

export async function findStudentById(studentNumber) {
  const sql = 'SELECT * FROM Student WHERE StudentNumber = ?';
  const results = await query(sql, [studentNumber]);
  return results[0];
}

export async function findNurseById(staffNumber) {
  const sql = 'SELECT * FROM Nurse WHERE StaffNumber = ?';
  const results = await query(sql, [staffNumber]);
  return results[0];
}

export async function findAdminById(staffNumber) {
  const sql = 'SELECT * FROM Admin WHERE StaffNumber = ?';
  const results = await query(sql, [staffNumber]);
  return results[0];
}

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

export async function updatePassword(userId, userType, hashedPassword) {
  const tableMap = { student: 'Student', nurse: 'Nurse', admin: 'Admin' };
  const pkMap = { student: 'StudentNumber', nurse: 'StaffNumber', admin: 'StaffNumber' };
  const table = tableMap[userType];
  const pk = pkMap[userType];
  const sql = `UPDATE ${table} SET Password = ? WHERE ${pk} = ?`;
  return await query(sql, [hashedPassword, userId]);
}
