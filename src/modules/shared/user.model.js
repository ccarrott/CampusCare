// src/modules/shared/user.model.js
// Shared user lookup functions used by auth, profile, and other modules.

import { query } from '../../config/database.js';

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

export async function updatePassword(userId, userType, hashedPassword) {
  const tableMap = { student: 'Student', nurse: 'Nurse', admin: 'Admin' };
  const pkMap = { student: 'StudentNumber', nurse: 'StaffNumber', admin: 'StaffNumber' };
  const sql = `UPDATE ${tableMap[userType]} SET Password = ? WHERE ${pkMap[userType]} = ?`;
  return await query(sql, [hashedPassword, userId]);
}
