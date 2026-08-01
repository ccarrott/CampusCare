import { query } from '../config/database.js';

// ============================================================================
// SYMPTOM MODEL OPERATIONS
// ============================================================================

/**
 * Retrieves all symptoms ordered alphabetically by name.
 */
export async function getAllSymptoms() {
  const sql = 'SELECT * FROM Symptoms ORDER BY Name ASC';
  return await query(sql);
}

/**
 * Retrieves a single symptom by its Name (primary identifier in this schema).
 */
export async function getSymptomByName(symptomName) {
  const sql = 'SELECT * FROM Symptoms WHERE Name = ?';
  const results = await query(sql, [symptomName]);
  return results[0];
}

/**
 * Retrieves medications linked to a symptom via the SymptomMedication join table.
 * SymptomMedication.Name references the symptom name.
 */
export async function getMedicationsForSymptom(symptomName) {
  const sql = `
    SELECT
      m.MedicationCode,
      m.Name,
      m.Description,
      m.SymptomsTreated
    FROM Medication m
    INNER JOIN SymptomMedication sm ON m.MedicationCode = sm.MedicationCode
    WHERE sm.Name = ?
  `;
  return await query(sql, [symptomName]);
}
