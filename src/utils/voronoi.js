// src/utils/voronoi.js
// Dependency-free Voronoi tessellation for gap-free suburb zoning (Phase 30G).
//
// We build each suburb's region by clipping the metro bounding box with the
// perpendicular bisector between that suburb's centre and every other suburb
// centre (half-plane clipping / Sutherland–Hodgman). The union of all cells
// tiles the bounds with NO gaps and NO overlaps — every point belongs to exactly
// one suburb (the nearest centre). Works in lon/lat degrees (fine at city scale).
//
// No npm, no build step — just math (fits tech.md §9).

/**
 * Clip a convex polygon by the half-plane on the side of `inside` relative to
 * the bisector line between points a and b. Keeps the part of the polygon closer
 * to `a`. Points are [x, y] = [lon, lat].
 */
function clipToBisector(poly, a, b) {
  // Bisector: set of points equidistant from a and b. Keep side closer to a.
  // Line normal n = (b - a); a point p is "closer to a" when
  //   dot(p - mid, n) <= 0, where mid = (a + b)/2.
  const nx = b[0] - a[0];
  const ny = b[1] - a[1];
  const midx = (a[0] + b[0]) / 2;
  const midy = (a[1] + b[1]) / 2;
  const side = (p) => (p[0] - midx) * nx + (p[1] - midy) * ny; // <=0 keep

  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const dCur = side(cur);
    const dPrev = side(prev);
    const curIn = dCur <= 0;
    const prevIn = dPrev <= 0;

    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur, dPrev, dCur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur, dPrev, dCur));
    }
  }
  return out;
}

function intersect(p1, p2, d1, d2) {
  const t = d1 / (d1 - d2);
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}

/**
 * Compute Voronoi cells for `sites` clipped to `bounds`.
 * @param {Array<{name,id,lat,lon}>} sites - suburb centres
 * @param {{west,east,south,north}} bounds
 * @returns {Array<{ id, name, lat, lon, ring:[[lat,lon],...] }>}
 */
export function voronoiCells(sites, bounds) {
  const box = [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north]
  ];

  return sites.map(site => {
    const a = [site.lon, site.lat];
    let poly = box.slice();
    for (const other of sites) {
      if (other === site) continue;
      const b = [other.lon, other.lat];
      poly = clipToBisector(poly, a, b);
      if (poly.length < 3) break;
    }
    // Convert [lon,lat] ring → stored [lat,lon] ring, rounded to keep JSON small.
    const ring = poly.map(p => [Number(p[1].toFixed(5)), Number(p[0].toFixed(5))]);
    return { id: site.id, name: site.name, lat: site.lat, lon: site.lon, ring };
  });
}
