// src/modules/symptoms/symptoms.model.js
// Database queries for the tag-based symptom checker system (Phase 22).

import { query } from '../../config/database.js';

/**
 * Gets all symptoms grouped by category (for the tag picker UI).
 */
export async function getAllSymptomsByCategory() {
  const sql = 'SELECT SymptomID, Name, Category, Tier, Description FROM Symptom ORDER BY Category, Name';
  const rows = await query(sql);

  // Group into { category: [symptoms] }
  const grouped = {};
  rows.forEach(row => {
    if (!grouped[row.Category]) grouped[row.Category] = [];
    grouped[row.Category].push(row);
  });
  return grouped;
}

/**
 * Gets symptoms by a list of IDs (for evaluation).
 */
export async function getSymptomsByIds(symptomIds) {
  if (!symptomIds || symptomIds.length === 0) return [];
  const placeholders = symptomIds.map(() => '?').join(',');
  const sql = `SELECT SymptomID, Name, Category, Tier, Description FROM Symptom WHERE SymptomID IN (${placeholders})`;
  return await query(sql, symptomIds);
}

/**
 * Gets medications that treat ANY of the given symptom IDs.
 * Only returns meds for Tier 1 symptoms (Tier 2+ get no OTC recommendations).
 * Ranked by relevance (how many selected Tier 1 symptoms they cover).
 */
export async function getMedicationsForSymptoms(symptomIds) {
  if (!symptomIds || symptomIds.length === 0) return [];
  const placeholders = symptomIds.map(() => '?').join(',');
  const sql = `
    SELECT m.MedicationCode, m.Name, m.Description, COUNT(sm.SymptomID) AS RelevanceScore
    FROM Medication m
    INNER JOIN SymptomMedicationMap sm ON m.MedicationCode = sm.MedicationCode
    INNER JOIN Symptom s ON sm.SymptomID = s.SymptomID
    WHERE sm.SymptomID IN (${placeholders}) AND s.Tier = 1
    GROUP BY m.MedicationCode, m.Name, m.Description
    ORDER BY RelevanceScore DESC, m.Name ASC
  `;
  return await query(sql, symptomIds);
}

/**
 * Gets which specific symptoms each medication covers (for display).
 */
export async function getMedicationSymptomCoverage(medicationCode, symptomIds) {
  if (!symptomIds || symptomIds.length === 0) return [];
  const placeholders = symptomIds.map(() => '?').join(',');
  const sql = `
    SELECT s.Name FROM Symptom s
    INNER JOIN SymptomMedicationMap sm ON s.SymptomID = sm.SymptomID
    WHERE sm.MedicationCode = ? AND sm.SymptomID IN (${placeholders})
  `;
  return await query(sql, [medicationCode, ...symptomIds]);
}

/**
 * Creates a symptom log entry (multi-select). Phase 29B adds duration/trajectory/otherText.
 */
export async function createSymptomLog(logId, studentNumber, severity, symptomIds, extra = {}) {
  const { duration = null, trajectory = null, otherText = null } = extra;
  await query(
    `INSERT INTO SymptomLog (LogID, StudentNumber, SymptomName, Severity, Duration, Trajectory, OtherText, LogDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [logId, studentNumber, symptomIds.join(','), severity, duration, trajectory, otherText]
  );
  for (const symId of symptomIds) {
    await query('INSERT INTO SymptomLogEntry (LogID, SymptomID) VALUES (?, ?)', [logId, symId]);
  }
}

/**
 * Gets the student's most recent symptom check (within `days`) with its symptom IDs + severity.
 * Used for recurrence escalation and the "same as last time" prefill.
 */
export async function getLastSymptomCheck(studentNumber, days = 7) {
  const logs = await query(
    `SELECT LogID, Severity, LogDate FROM SymptomLog
     WHERE StudentNumber = ? AND LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY LogDate DESC LIMIT 1`,
    [studentNumber, days]
  );
  if (logs.length === 0) return null;
  const entries = await query('SELECT SymptomID FROM SymptomLogEntry WHERE LogID = ?', [logs[0].LogID]);
  return {
    logId: logs[0].LogID,
    severity: logs[0].Severity,
    logDate: logs[0].LogDate,
    symptomIds: entries.map(e => e.SymptomID)
  };
}

/**
 * Gets a student's symptom check history with symptom names.
 */
export async function getSymptomHistory(studentNumber, limit = 30) {
  const sql = `
    SELECT sl.LogID, sl.Severity, sl.LogDate,
           GROUP_CONCAT(s.Name ORDER BY s.Name SEPARATOR ', ') AS SymptomNames
    FROM SymptomLog sl
    INNER JOIN SymptomLogEntry sle ON sl.LogID = sle.LogID
    INNER JOIN Symptom s ON sle.SymptomID = s.SymptomID
    WHERE sl.StudentNumber = ?
    GROUP BY sl.LogID, sl.Severity, sl.LogDate
    ORDER BY sl.LogDate DESC
    LIMIT ?
  `;
  return await query(sql, [studentNumber, String(limit)]);
}
