// src/modules/profile/profile.model.js
// Database queries for profile viewing, editing, and account management.

import { query } from '../../config/database.js';

// Re-export shared user lookups
export { findStudentById, findNurseById, findAdminById, updatePassword } from '../shared/user.model.js';

// ============================================================================
// PROFILE-SPECIFIC OPERATIONS
// ============================================================================

export async function updateStudentProfile(studentNumber, { medicalHistory }) {
  const sql = 'UPDATE Student SET MedicalHistory = ? WHERE StudentNumber = ?';
  return await query(sql, [medicalHistory, studentNumber]);
}

export async function deleteStudentAccount(studentNumber) {
  const sql = 'DELETE FROM Student WHERE StudentNumber = ?';
  return await query(sql, [studentNumber]);
}

export async function getAllZones() {
  return await query('SELECT ZoneID, Name, Latitude, Longitude, Boundary FROM CampusZone');
}
