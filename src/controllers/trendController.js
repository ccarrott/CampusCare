import * as TrendModel from '../models/trendModel.js';
import { query } from '../config/database.js';

// ============================================================================
// TREND CONTROLLER - Campus Health Analytics Dashboard
// ============================================================================

/**
 * GET /trends
 * Renders the trends dashboard with map data.
 */
export async function renderTrendsDashboard(req, res) {
  try {
    const periodMap = { '7d': 7, '1m': 30, '2m': 60, '6m': 180, '1y': 365 };
    const period = req.query.period || '1m';
    const days = periodMap[period] || 30;

    const symptomAggregation = await TrendModel.getSymptomAggregation();
    const facilityDistribution = await TrendModel.getFacilityDistribution();

    // Period-aware: symptoms by type from actual SymptomLog
    const symptomsByType = await query(`
      SELECT s.Type, COUNT(*) AS Count
      FROM SymptomLog sl
      INNER JOIN Symptoms s ON sl.SymptomName = s.Name
      WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY s.Type
      ORDER BY Count DESC
    `, [days]);

    res.render('trends/dashboard', {
      user: req.session.user,
      symptomAggregation,
      facilityDistribution,
      symptomsByType,
      period,
      error: null
    });
  } catch (error) {
    console.error('Trends dashboard error:', error);
    res.status(500).render('trends/dashboard', {
      user: req.session.user,
      symptomAggregation: [],
      facilityDistribution: [],
      symptomsByType: [],
      period: req.query.period || '1m',
      error: 'Unable to load health trend data. Please try again later.'
    });
  }
}

/**
 * GET /trends/api/map-data
 * Returns zone-aggregated SymptomLog data for the Leaflet map (JSON).
 * Only shows zones with 1+ reports in the last 7 days.
 * Privacy: no student identifiers exposed.
 */
export async function getMapDataAPI(req, res) {
  try {
    const periodMap = { '7d': 7, '1m': 30, '2m': 60, '6m': 180, '1y': 365 };
    const period = req.query.period || '7d';
    const days = periodMap[period] || 7;

    // Get all zones
    const zones = await query('SELECT * FROM CampusZone');

    // Get symptom counts per zone for the selected period
    const zoneCounts = await query(`
      SELECT
        sz.ZoneID,
        COUNT(*) AS ReportCount,
        sl.SymptomName,
        COUNT(*) AS SymptomCount
      FROM SymptomLog sl
      INNER JOIN StudentZone sz ON sl.StudentNumber = sz.StudentNumber
      WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY sz.ZoneID, sl.SymptomName
      ORDER BY sz.ZoneID, SymptomCount DESC
    `, [days]);

    // Get total per zone
    const zoneTotals = await query(`
      SELECT
        sz.ZoneID,
        COUNT(*) AS TotalReports
      FROM SymptomLog sl
      INNER JOIN StudentZone sz ON sl.StudentNumber = sz.StudentNumber
      WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY sz.ZoneID
    `, [days]);

    // Build response: zones with their report data
    const totalMap = {};
    zoneTotals.forEach(r => { totalMap[r.ZoneID] = r.TotalReports; });

    // Group symptoms by zone
    const symptomMap = {};
    zoneCounts.forEach(r => {
      if (!symptomMap[r.ZoneID]) symptomMap[r.ZoneID] = [];
      symptomMap[r.ZoneID].push({ name: r.SymptomName, count: r.SymptomCount });
    });

    const mapData = zones.map(zone => ({
      zoneId: zone.ZoneID,
      name: zone.Name,
      lat: parseFloat(zone.Latitude),
      lon: parseFloat(zone.Longitude),
      radius: zone.Radius,
      totalReports: totalMap[zone.ZoneID] || 0,
      topSymptoms: (symptomMap[zone.ZoneID] || []).slice(0, 3)
    }));

    res.json({ mapData });
  } catch (error) {
    console.error('Map data API error:', error);
    res.status(500).json({ mapData: [], error: 'Failed to load map data.' });
  }
}
