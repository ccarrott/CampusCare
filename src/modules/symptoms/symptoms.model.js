// src/modules/symptoms/symptoms.model.js
// Database queries for symptom catalog, medication lookup, and symptom logging.

import { query } from '../../config/database.js';

/**
 * Retrieves all symptoms ordered alphabetically.
 */
export async function getAllSymptoms() {
  const sql = 'SELECT * FROM Symptoms ORDER BY Name ASC';
  return await query(sql);
}

/**
 * Retrieves a single symptom by name (primary key).
 */
export async function getSymptomByName(symptomName) {
  const sql = 'SELECT * FROM Symptoms WHERE Name = ?';
  const results = await query(sql, [symptomName]);
  return results[0];
}

/**
 * Retrieves medications linked to a symptom via SymptomMedication join.
 */
export async function getMedicationsForSymptom(symptomName) {
  const sql = `
    SELECT m.MedicationCode, m.Name, m.Description, m.SymptomsTreated
    FROM Medication m
    INNER JOIN SymptomMedication sm ON m.MedicationCode = sm.MedicationCode
    WHERE sm.Name = ?
  `;
  return await query(sql, [symptomName]);
}

/**
 * Logs a symptom check to SymptomLog.
 */
export async function createSymptomLog(logId, studentNumber, symptomName, severity) {
  const sql = 'INSERT INTO SymptomLog (LogID, StudentNumber, SymptomName, Severity, LogDate) VALUES (?, ?, ?, ?, NOW())';
  return await query(sql, [logId, studentNumber, symptomName, severity]);
}

/**
 * Retrieves a student's symptom check history (most recent first).
 */
export async function getSymptomHistory(studentNumber, limit = 50) {
  const sql = 'SELECT LogID, SymptomName, Severity, LogDate, Notes FROM SymptomLog WHERE StudentNumber = ? ORDER BY LogDate DESC LIMIT ?';
  return await query(sql, [studentNumber, String(limit)]);
}
