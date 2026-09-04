// src/modules/trends/trends.model.js
// Database queries for the health-trend analytics + MapLibre density heatmap (Phase 30G).
//
// The map is now a TRUE density surface. Each symptom report carries a location
// snapshot (SymptomLog.Latitude/Longitude/ZoneID). Reports made before Phase 30G
// (or by students with no pin) have no coordinates — we synthesise a jittered
// point around their zone centroid so historical data still contributes to the
// heat surface without ever exposing an individual.

import { query } from '../../config/database.js';
import { outbreakThresholdFor } from '../../constants.js';

// ---------------------------------------------------------------------------
// CATALOG / CONDITION QUERIES
// ---------------------------------------------------------------------------

/**
 * Top reported conditions in-window, with optional category + severity filters.
 * Drives the filterable "Top Reported Conditions" table.
 */
export async function getTopConditions(days, { category = null, severity = null } = {}) {
  const params = [days];
  let filter = '';
  if (category) { filter += ' AND s.Category = ?'; params.push(category); }
  if (severity) { filter += ' AND sl.Severity = ?'; params.push(severity); }

  const sql = `
    SELECT s.Name AS SymptomName, s.Category AS Type, s.Tier,
           COUNT(*) AS Reports,
           SUM(sl.Severity = 'High') AS HighCount,
           COUNT(DISTINCT sm.MedicationCode) AS MedicationCount
    FROM SymptomLogEntry sle
    INNER JOIN SymptomLog sl ON sle.LogID = sl.LogID
    INNER JOIN Symptom s ON sle.SymptomID = s.SymptomID
    LEFT JOIN SymptomMedicationMap sm ON s.SymptomID = sm.SymptomID
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY) ${filter}
    GROUP BY s.SymptomID, s.Name, s.Category, s.Tier
    ORDER BY Reports DESC, HighCount DESC
    LIMIT 15
  `;
  return await query(sql, params);
}

/** Distinct symptom categories (for the filter dropdown). */
export async function getCategories() {
  const rows = await query('SELECT DISTINCT Category FROM Symptom ORDER BY Category');
  return rows.map(r => r.Category);
}

/** Symptom counts grouped by category in-window (doughnut chart). */
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

// ---------------------------------------------------------------------------
// HEADLINE STATS
// ---------------------------------------------------------------------------

/**
 * Top-line KPIs for the trend hero: total reports, unique reporters (privacy —
 * count only, never identities), high-severity share, active zones, and the
 * single busiest zone in-window.
 */
export async function getHeadlineStats(days) {
  const [totals] = await query(`
    SELECT COUNT(*) AS TotalReports,
           COUNT(DISTINCT StudentNumber) AS Reporters,
           SUM(Severity = 'High') AS HighReports,
           COUNT(DISTINCT ZoneID) AS ActiveZones
    FROM SymptomLog
    WHERE LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [days]);

  const [hotspot] = await query(`
    SELECT cz.Name AS ZoneName, COUNT(*) AS Reports
    FROM SymptomLog sl
    INNER JOIN CampusZone cz ON sl.ZoneID = cz.ZoneID
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY sl.ZoneID, cz.Name
    ORDER BY Reports DESC
    LIMIT 1
  `, [days]);

  return {
    totalReports: totals?.TotalReports || 0,
    reporters: totals?.Reporters || 0,
    highReports: totals?.HighReports || 0,
    activeZones: totals?.ActiveZones || 0,
    hotspot: hotspot ? { name: hotspot.ZoneName, reports: hotspot.Reports } : null
  };
}

/** Severity split in-window (Low/Moderate/High) for a stacked/segment chart. */
export async function getSeverityBreakdown(days) {
  const rows = await query(`
    SELECT Severity, COUNT(*) AS Count
    FROM SymptomLog
    WHERE LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY Severity
  `, [days]);
  const map = { Low: 0, Moderate: 0, High: 0 };
  rows.forEach(r => { if (r.Severity in map) map[r.Severity] = r.Count; });
  return map;
}

/** Daily report volume in-window (timeline line chart). Fills gaps client-side. */
export async function getDailyTimeline(days) {
  return await query(`
    SELECT DATE(LogDate) AS Day, COUNT(*) AS Reports,
           SUM(Severity = 'High') AS HighReports
    FROM SymptomLog
    WHERE LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(LogDate)
    ORDER BY Day ASC
  `, [days]);
}

// ---------------------------------------------------------------------------
// MAP DATA
// ---------------------------------------------------------------------------

export async function getAllZones() {
  return await query('SELECT ZoneID, Name, Latitude, Longitude, Boundary FROM CampusZone');
}

/**
 * Raw report points in-window for the density heatmap. Reports missing a
 * coordinate snapshot fall back to their zone (via ZoneID or the student's
 * assigned StudentZone) so nothing is lost. Severity becomes the heat weight.
 */
export async function getReportPoints(days) {
  return await query(`
    SELECT sl.LogID, sl.Latitude, sl.Longitude, sl.Severity,
           COALESCE(sl.ZoneID, sz.ZoneID) AS ZoneID
    FROM SymptomLog sl
    LEFT JOIN StudentZone sz ON sl.StudentNumber = sz.StudentNumber
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [days]);
}

/**
 * Per-zone rollup for the map's zone-detail panel + outbreak flags: total
 * reports, high-severity count, and the top 3 symptoms in that zone.
 */
export async function getZoneRollup(days) {
  const totals = await query(`
    SELECT COALESCE(sl.ZoneID, sz.ZoneID) AS ZoneID,
           COUNT(*) AS TotalReports,
           SUM(sl.Severity = 'High') AS HighReports
    FROM SymptomLog sl
    LEFT JOIN StudentZone sz ON sl.StudentNumber = sz.StudentNumber
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY COALESCE(sl.ZoneID, sz.ZoneID)
  `, [days]);

  const topSymptoms = await query(`
    SELECT COALESCE(sl.ZoneID, sz.ZoneID) AS ZoneID, s.Name AS SymptomName, COUNT(*) AS Cnt
    FROM SymptomLogEntry sle
    INNER JOIN SymptomLog sl ON sle.LogID = sl.LogID
    INNER JOIN Symptom s ON sle.SymptomID = s.SymptomID
    LEFT JOIN StudentZone sz ON sl.StudentNumber = sz.StudentNumber
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY COALESCE(sl.ZoneID, sz.ZoneID), s.Name
    ORDER BY Cnt DESC
  `, [days]);

  const threshold = outbreakThresholdFor(days);
  const byZone = {};
  totals.forEach(t => {
    if (!t.ZoneID) return;
    byZone[t.ZoneID] = {
      totalReports: t.TotalReports,
      highReports: t.HighReports || 0,
      topSymptoms: [],
      outbreak: t.TotalReports >= threshold
    };
  });
  topSymptoms.forEach(r => {
    if (!r.ZoneID || !byZone[r.ZoneID]) return;
    if (byZone[r.ZoneID].topSymptoms.length < 3) {
      byZone[r.ZoneID].topSymptoms.push({ name: r.SymptomName, count: r.Cnt });
    }
  });
  return byZone;
}
