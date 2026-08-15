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
export function getZoneForPoint(lat, lon, zones) {
  for (const zone of zones) {
    const boundary = typeof zone.Boundary === 'string' ? JSON.parse(zone.Boundary) : zone.Boundary;
    if (!boundary || boundary.length < 3) continue;
    if (pointInPolygon([lat, lon], boundary)) {
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
