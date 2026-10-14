// src/modules/nurse/nurse.model.js
// Database queries for nurse dashboard operations.

import { query } from '../../config/database.js';

/**
 * Fetches a patient's profile by student number.
 */
export async function getPatientProfile(studentNumber) {
  const sql = 'SELECT * FROM Student WHERE StudentNumber = ?';
  const results = await query(sql, [studentNumber]);
  return results[0];
}

/**
 * Updates a nurse's editable public-profile fields: bio and last name.
 * Years of experience is admin-managed and intentionally NOT updated here
 * (Plan 4 Item 23 — nurses cannot change it).
 */
export async function updateNurseProfile(staffNumber, { bio, lastName }) {
  const sql = 'UPDATE Nurse SET Bio = ?, LastName = ? WHERE StaffNumber = ?';
  return await query(sql, [bio || null, lastName || null, staffNumber]);
}

// Patient symptom history for the nurse view is served by SymptomsModel.getSymptomHistory
// (a join that returns readable symptom names), not from here — see nurse.controller.js.
