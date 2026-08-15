// src/modules/nurse/nurse.model.js
// Database queries for nurse dashboard operations.

import { query } from '../../config/database.js';

/**
 * Updates the MS Teams link for an online appointment.
 */
export async function updateTeamsLink(appointmentId, teamsId) {
  const sql = 'UPDATE Appointment SET TeamsID = ? WHERE AppointmentID = ?';
  return await query(sql, [teamsId, appointmentId]);
}

/**
 * Fetches a patient's profile by student number.
 */
export async function getPatientProfile(studentNumber) {
  const sql = 'SELECT * FROM Student WHERE StudentNumber = ?';
  const results = await query(sql, [studentNumber]);
  return results[0];
}

/**
 * Updates a nurse's bio and years of experience.
 */
export async function updateNurseProfile(staffNumber, { bio, yearsExperience }) {
  const sql = 'UPDATE Nurse SET Bio = ?, YearsExperience = ? WHERE StaffNumber = ?';
  return await query(sql, [bio || null, yearsExperience || 0, staffNumber]);
}

/**
 * Gets a nurse's current bio and experience for the edit form.
 */
export async function getNurseBioData(staffNumber) {
  const sql = 'SELECT Bio, YearsExperience FROM Nurse WHERE StaffNumber = ?';
  const results = await query(sql, [staffNumber]);
  return results[0];
}

/**
 * Fetches a patient's symptom log history.
 */
export async function getPatientSymptomHistory(studentNumber, limit = 30) {
  const sql = 'SELECT * FROM SymptomLog WHERE StudentNumber = ? ORDER BY LogDate DESC LIMIT ?';
  return await query(sql, [studentNumber, String(limit)]);
}
