import { query } from '../config/database.js';

// ============================================================================
// TREND MODEL - Aggregated Health Trend Data (Privacy Compliant)
// ============================================================================

/**
 * Aggregates symptom occurrences by type, counting how many medication
 * mappings exist per symptom (proxy for how often it's been treated).
 */
export async function getSymptomAggregation() {
  const sql = `
    SELECT
      s.Name AS SymptomName,
      s.Type,
      s.Tier,
      COUNT(sm.MedicationCode) AS MedicationCount
    FROM Symptoms s
    LEFT JOIN SymptomMedication sm ON s.Name = sm.Name
    GROUP BY s.Name, s.Type, s.Tier
    ORDER BY MedicationCount DESC
  `;
  return await query(sql);
}

/**
 * Queries facility distribution data showing facility types,
 * locations, and how many medications are stocked at each.
 */
export async function getFacilityDistribution() {
  const sql = `
    SELECT
      f.FacilityID,
      f.Type AS FacilityType,
      f.Address AS FacilityAddress,
      f.PhoneNumber
    FROM MedicalFacility f
    ORDER BY f.Type ASC
  `;
  return await query(sql);
}

