// src/modules/profile/profile.model.js
// Database queries for profile viewing, editing, and account management.

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

export async function updateStudentProfile(studentNumber, { medicalHistory }) {
  const sql = 'UPDATE Student SET MedicalHistory = ? WHERE StudentNumber = ?';
  return await query(sql, [medicalHistory, studentNumber]);
}

export async function deleteStudentAccount(studentNumber) {
  const sql = 'DELETE FROM Student WHERE StudentNumber = ?';
  return await query(sql, [studentNumber]);
}

export async function updatePassword(userId, userType, hashedPassword) {
  const tableMap = { student: 'Student', nurse: 'Nurse', admin: 'Admin' };
  const pkMap = { student: 'StudentNumber', nurse: 'StaffNumber', admin: 'StaffNumber' };
  const sql = `UPDATE ${tableMap[userType]} SET Password = ? WHERE ${pkMap[userType]} = ?`;
  return await query(sql, [hashedPassword, userId]);
}

export async function getAllZones() {
  return await query('SELECT ZoneID, Name, Latitude, Longitude, Boundary FROM CampusZone');
}
