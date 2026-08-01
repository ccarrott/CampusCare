import { query } from '../config/database.js';

// ============================================================================
// STUDENT MODEL OPERATIONS (PascalCase DB Mapping)
// ============================================================================

export async function findStudentById(studentNumber) {
  const sql = 'SELECT * FROM Student WHERE StudentNumber = ?';
  const results = await query(sql, [studentNumber]);
  return results[0];
}

export async function createStudent({ studentNumber, firstName, lastName, address, medicalHistory, password }) {
  const sql = `
    INSERT INTO Student (StudentNumber, FirstName, LastName, Address, MedicalHistory, Password)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [
    studentNumber,
    firstName,
    lastName,
    address || '',
    medicalHistory || '',
    password
  ]);
}

// ============================================================================
// NURSE MODEL OPERATIONS (Admin Managed)
// ============================================================================

export async function findNurseById(staffNumber) {
  const sql = 'SELECT * FROM Nurse WHERE StaffNumber = ?';
  const results = await query(sql, [staffNumber]);
  return results[0];
}

// ============================================================================
// STUDENT PROFILE OPERATIONS
// ============================================================================

export async function findAdminById(staffNumber) {
  const sql = 'SELECT * FROM Admin WHERE StaffNumber = ?';
  const results = await query(sql, [staffNumber]);
  return results[0];
}

export async function updateStudentProfile(studentNumber, { address, medicalHistory }) {
  const sql = 'UPDATE Student SET Address = ?, MedicalHistory = ? WHERE StudentNumber = ?';
  return await query(sql, [address, medicalHistory, studentNumber]);
}

export async function deleteStudentAccount(studentNumber) {
  const sql = 'DELETE FROM Student WHERE StudentNumber = ?';
  return await query(sql, [studentNumber]);
}


// ============================================================================
// PASSWORD RESET OPERATIONS
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
  let sql;
  if (userType === 'student') {
    sql = 'UPDATE Student SET Password = ? WHERE StudentNumber = ?';
  } else if (userType === 'nurse') {
    sql = 'UPDATE Nurse SET Password = ? WHERE StaffNumber = ?';
  } else if (userType === 'admin') {
    sql = 'UPDATE Admin SET Password = ? WHERE StaffNumber = ?';
  }
  return await query(sql, [hashedPassword, userId]);
}
