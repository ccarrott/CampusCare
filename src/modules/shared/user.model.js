// src/modules/shared/user.model.js
// Shared user lookup functions used by auth, profile, and other modules.

import { query } from '../../config/database.js';

export async function findStudentById(studentNumber) {
  const sql = 'SELECT * FROM Student WHERE StudentNumber = ?';
  const results = await query(sql, [studentNumber]);
  return results[0];
}

export async function findNurseById(staffNumber) {
  const sql = `
    SELECT n.*, c.Name AS ClinicName
    FROM Nurse n
    LEFT JOIN Clinic c ON n.ClinicID = c.RegNum
    WHERE n.StaffNumber = ?
  `;
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

  // The table/column names are interpolated, so an unrecognised userType must never
  // reach the query — reject it here rather than emitting `UPDATE undefined ...`.
  const table = tableMap[userType];
  const pk = pkMap[userType];
  if (!table || !pk) throw new Error(`updatePassword: unknown user type "${userType}"`);

  const sql = `UPDATE ${table} SET Password = ? WHERE ${pk} = ?`;
  return await query(sql, [hashedPassword, userId]);
}
