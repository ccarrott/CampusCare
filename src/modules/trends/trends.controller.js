// src/modules/trends/trends.controller.js
// Handles health trend dashboard rendering and map data API.

import * as TrendsModel from './trends.model.js';
import { catchAsync } from '../../utils/catchAsync.js';

const PERIOD_MAP = { '7d': 7, '1m': 30, '2m': 60, '6m': 180, '1y': 365 };

// ============================================================================
// TRENDS DASHBOARD
// ============================================================================

export const renderTrendsDashboard = catchAsync(async (req, res) => {
  const period = req.query.period || '1m';
  const days = PERIOD_MAP[period] || 30;

  const symptomAggregation = await TrendsModel.getSymptomAggregation();
  const facilityDistribution = await TrendsModel.getFacilityDistribution();
  const symptomsByType = await TrendsModel.getSymptomsByTypeForPeriod(days);

  res.render('trends/dashboard', {
    user: req.session.user,
    symptomAggregation,
    facilityDistribution,
    symptomsByType,
    period,
    error: null
  });
});

// ============================================================================
// MAP DATA API (JSON for Leaflet)
// ============================================================================

export const getMapDataAPI = catchAsync(async (req, res) => {
  const period = req.query.period || '7d';
  const days = PERIOD_MAP[period] || 7;

  const zones = await TrendsModel.getAllZones();
  const zoneCounts = await TrendsModel.getZoneSymptomCounts(days);
  const zoneTotals = await TrendsModel.getZoneTotals(days);

  // Build lookup maps
  const totalMap = {};
  zoneTotals.forEach(r => { totalMap[r.ZoneID] = r.TotalReports; });

  const symptomMap = {};
  zoneCounts.forEach(r => {
    if (!symptomMap[r.ZoneID]) symptomMap[r.ZoneID] = [];
    symptomMap[r.ZoneID].push({ name: r.SymptomName, count: r.SymptomCount });
  });

  // Return GeoJSON FeatureCollection for choropleth rendering
  const features = zones.map(zone => {
    const boundary = typeof zone.Boundary === 'string' ? JSON.parse(zone.Boundary) : zone.Boundary;
    // GeoJSON uses [lon, lat] order (opposite of Leaflet)
    const coordinates = boundary ? [boundary.map(p => [p[1], p[0]]).concat([[ boundary[0][1], boundary[0][0] ]])] : null;

    return {
      type: 'Feature',
      properties: {
        zoneId: zone.ZoneID,
        name: zone.Name,
        totalReports: totalMap[zone.ZoneID] || 0,
        topSymptoms: (symptomMap[zone.ZoneID] || []).slice(0, 3)
      },
      geometry: coordinates ? { type: 'Polygon', coordinates } : null
    };
  }).filter(f => f.geometry !== null);

  res.json({ type: 'FeatureCollection', features });
});
