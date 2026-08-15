// src/modules/trends/trends.model.js
// Database queries for health trend analytics, map data, and zone aggregation.
// Updated for Phase 22: uses Symptom table + SymptomLogEntry join.

import { query } from '../../config/database.js';

/**
 * Aggregates symptom catalog with medication mapping counts.
 */
export async function getSymptomAggregation() {
  const sql = `
    SELECT s.Name AS SymptomName, s.Category AS Type, s.Tier, COUNT(sm.MedicationCode) AS MedicationCount
    FROM Symptom s
    LEFT JOIN SymptomMedicationMap sm ON s.SymptomID = sm.SymptomID
    GROUP BY s.SymptomID, s.Name, s.Category, s.Tier
    ORDER BY MedicationCount DESC
  `;
  return await query(sql);
}

/**
 * Queries facility distribution data.
 */
export async function getFacilityDistribution() {
  const sql = `
    SELECT f.FacilityID, f.Type AS FacilityType, f.Address AS FacilityAddress, f.PhoneNumber
    FROM MedicalFacility f ORDER BY f.Type ASC
  `;
  return await query(sql);
}

/**
 * Gets symptom log counts grouped by category for a given period (days).
 */
export async function getSymptomsByTypeForPeriod(days) {
  const sql = `
    SELECT s.Category AS Type, COUNT(*) AS Count
    FROM SymptomLogEntry sle
    INNER JOIN SymptomLog sl ON sle.LogID = sl.LogID
    INNER JOIN Symptom s ON sle.SymptomID = s.SymptomID
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY s.Category
    ORDER BY Count DESC
  `;
  return await query(sql, [days]);
}

/**
 * Gets all campus zones.
 */
export async function getAllZones() {
  return await query('SELECT ZoneID, Name, Latitude, Longitude, Radius, Boundary FROM CampusZone');
}

/**
 * Gets symptom counts per zone for the Leaflet map (privacy compliant).
 */
export async function getZoneSymptomCounts(days) {
  const sql = `
    SELECT sz.ZoneID, s.Name AS SymptomName, COUNT(*) AS SymptomCount
    FROM SymptomLogEntry sle
    INNER JOIN SymptomLog sl ON sle.LogID = sl.LogID
    INNER JOIN Symptom s ON sle.SymptomID = s.SymptomID
    INNER JOIN StudentZone sz ON sl.StudentNumber = sz.StudentNumber
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY sz.ZoneID, s.Name
    ORDER BY sz.ZoneID, SymptomCount DESC
  `;
  return await query(sql, [days]);
}

/**
 * Gets total report count per zone for the map.
 */
export async function getZoneTotals(days) {
  const sql = `
    SELECT sz.ZoneID, COUNT(DISTINCT sl.LogID) AS TotalReports
    FROM SymptomLog sl
    INNER JOIN StudentZone sz ON sl.StudentNumber = sz.StudentNumber
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY sz.ZoneID
  `;
  return await query(sql, [days]);
}
