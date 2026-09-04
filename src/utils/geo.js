// src/utils/geo.js
// Geospatial utilities — point-in-polygon and zone assignment.

/**
 * Ray-casting algorithm to determine if a point is inside a polygon.
 * @param {number[]} point - [lat, lon]
 * @param {number[][]} polygon - Array of [lat, lon] pairs defining the polygon
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  const [y, x] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Finds which zone a point belongs to.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Array} zones - Array of zone objects with { ZoneID, Boundary (JSON string or array) }
 * @returns {string|null} ZoneID or null if outside all zones
 */
/**
 * Tests whether a point is inside a boundary that may be:
 *   - a single ring:            [[lat,lon], ...]
 *   - a polygon with holes:     [ [ring], [hole], ... ]  (first ring = outer)
 *   - a multipolygon:           [ [ [ring] ], [ [ring] ] ]
 * Detected by inspecting nesting depth. Rings are [lat,lon] pairs.
 */
export function pointInBoundary(point, boundary) {
  if (!Array.isArray(boundary) || boundary.length === 0) return false;
  // Depth check: a coordinate pair looks like [number, number].
  const isPair = (v) => Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number';

  if (isPair(boundary[0])) {
    // Single ring.
    return pointInPolygon(point, boundary);
  }
  if (Array.isArray(boundary[0]) && isPair(boundary[0][0])) {
    // Polygon with rings: inside outer AND not inside any hole.
    if (!pointInPolygon(point, boundary[0])) return false;
    for (let i = 1; i < boundary.length; i++) {
      if (pointInPolygon(point, boundary[i])) return false;
    }
    return true;
  }
  // MultiPolygon: inside any part.
  for (const poly of boundary) {
    if (pointInBoundary(point, poly)) return true;
  }
  return false;
}

export function getZoneForPoint(lat, lon, zones) {
  for (const zone of zones) {
    const boundary = typeof zone.Boundary === 'string' ? JSON.parse(zone.Boundary) : zone.Boundary;
    if (!boundary || boundary.length < 3) continue;
    if (pointInBoundary([lat, lon], boundary)) {
      return zone.ZoneID;
    }
  }

  // Fallback: find nearest zone by centroid distance
  let nearest = null;
  let minDist = Infinity;
  for (const zone of zones) {
    const dist = Math.sqrt(Math.pow(lat - zone.Latitude, 2) + Math.pow(lon - zone.Longitude, 2));
    if (dist < minDist) {
      minDist = dist;
      nearest = zone.ZoneID;
    }
  }
  return nearest;
}
