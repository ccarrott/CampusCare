// src/modules/trends/trends.controller.js
// Health-trend dashboard rendering + MapLibre heatmap/zone data APIs (Phase 30G).

import * as TrendsModel from './trends.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { TREND, outbreakThresholdFor } from '../../constants.js';

const PERIOD_MAP = TREND.PERIODS;
const resolveDays = (p) => PERIOD_MAP[p] || PERIOD_MAP['1m'];

// Deterministic-ish jitter around a zone centroid for reports that lack a real
// coordinate snapshot, so legacy/pinless data still forms a density blob.
function jitterFrom(seed, base, spread) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return base + (frac * 2 - 1) * spread;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export const renderTrendsDashboard = catchAsync(async (req, res) => {
  const period = PERIOD_MAP[req.query.period] ? req.query.period : '1m';
  const days = resolveDays(period);
  const category = req.query.category || '';
  const severity = req.query.severity || '';

  const [stats, symptomsByType, severityBreakdown, timeline, categories, topConditions] = await Promise.all([
    TrendsModel.getHeadlineStats(days),
    TrendsModel.getSymptomsByTypeForPeriod(days),
    TrendsModel.getSeverityBreakdown(days),
    TrendsModel.getDailyTimeline(days),
    TrendsModel.getCategories(),
    TrendsModel.getTopConditions(days, {
      category: category || null,
      severity: severity || null
    })
  ]);

  res.render('trends/dashboard', {
    user: req.session.user,
    stats,
    symptomsByType,
    severityBreakdown,
    timeline: timeline.map(t => ({
      day: t.Day instanceof Date ? t.Day.toISOString().slice(0, 10) : String(t.Day).slice(0, 10),
      reports: t.Reports,
      high: t.HighReports || 0
    })),
    categories,
    topConditions,
    period,
    category,
    severity,
    buckets: TREND.BUCKETS,
    outbreakThreshold: outbreakThresholdFor(days),
    mapCenter: TREND.MAP_CENTER,
    mapZoom: TREND.MAP_ZOOM,
    maptilerKey: process.env.MAPTILER_KEY || '',
    error: null
  });
});

// ============================================================================
// HEATMAP DATA API — GeoJSON points (weighted by severity)
// ============================================================================

export const getHeatmapAPI = catchAsync(async (req, res) => {
  const days = resolveDays(req.query.period);

  const [points, zones] = await Promise.all([
    TrendsModel.getReportPoints(days),
    TrendsModel.getAllZones()
  ]);

  const zoneCentroid = {};
  zones.forEach(z => { zoneCentroid[z.ZoneID] = { lat: Number(z.Latitude), lon: Number(z.Longitude) }; });

  const weightFor = (sev) => (sev === 'High' ? 1 : sev === 'Moderate' ? 0.66 : 0.4);

  let seed = 1;
  const features = [];
  for (const p of points) {
    let lat = p.Latitude != null ? Number(p.Latitude) : null;
    let lon = p.Longitude != null ? Number(p.Longitude) : null;

    // Fallback: synthesise a jittered point around the zone centroid.
    if ((lat == null || lon == null) && p.ZoneID && zoneCentroid[p.ZoneID]) {
      const c = zoneCentroid[p.ZoneID];
      lat = jitterFrom(seed++, c.lat, 0.008);
      lon = jitterFrom(seed++, c.lon, 0.008);
    }
    if (lat == null || lon == null) continue;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { weight: weightFor(p.Severity) }
    });
  }

  res.json({ type: 'FeatureCollection', features });
});

// ============================================================================
// ZONE DATA API — GeoJSON polygons + rollup (outbreak outlines, click detail)
// ============================================================================

export const getZonesAPI = catchAsync(async (req, res) => {
  const days = resolveDays(req.query.period);

  const [zones, rollup] = await Promise.all([
    TrendsModel.getAllZones(),
    TrendsModel.getZoneRollup(days)
  ]);

  // Convert a stored [lat,lon] ring into a closed GeoJSON [lon,lat] ring.
  const toGeoRing = (ring) => {
    const r = ring.map(pt => [pt[1], pt[0]]);
    const first = r[0], last = r[r.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) r.push([first[0], first[1]]);
    return r;
  };

  const features = zones.map(zone => {
    const boundary = typeof zone.Boundary === 'string' ? JSON.parse(zone.Boundary) : zone.Boundary;
    let geometry = null;
    if (boundary && boundary.length) {
      const isPair = (v) => Array.isArray(v) && typeof v[0] === 'number';
      if (isPair(boundary[0])) {
        // Single ring → Polygon.
        geometry = { type: 'Polygon', coordinates: [toGeoRing(boundary)] };
      } else if (Array.isArray(boundary[0]) && isPair(boundary[0][0])) {
        // Polygon with holes → Polygon (multiple rings).
        geometry = { type: 'Polygon', coordinates: boundary.map(toGeoRing) };
      } else {
        // MultiPolygon.
        geometry = { type: 'MultiPolygon', coordinates: boundary.map(poly => poly.map(toGeoRing)) };
      }
    }
    const r = rollup[zone.ZoneID] || { totalReports: 0, highReports: 0, topSymptoms: [], outbreak: false };

    return {
      type: 'Feature',
      properties: {
        zoneId: zone.ZoneID,
        name: zone.Name,
        totalReports: r.totalReports,
        highReports: r.highReports,
        outbreak: r.outbreak,
        topSymptoms: r.topSymptoms
      },
      geometry,
      centroid: [Number(zone.Longitude), Number(zone.Latitude)]
    };
  }).filter(f => f.geometry !== null);

  res.json({ type: 'FeatureCollection', features });
});
