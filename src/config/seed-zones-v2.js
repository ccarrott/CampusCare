import { query } from './database.js';
import { voronoiCells } from '../utils/voronoi.js';

/**
 * CampusCare — Zone Seed v5 (Phase 30G): VORONOI suburb tessellation.
 *
 * Gqeberha suburbs aren't boundary polygons in OSM, and hand-tracing leaves gaps.
 * Instead we tessellate the metro into Voronoi cells from each suburb's centre
 * point: every location is assigned to its NEAREST suburb centre. The result tiles
 * the whole metro with NO gaps and NO overlaps — irregular, organic cells that
 * cover every suburb. Cells are clipped to the metro bounding box.
 *
 * The map renders these as an INVISIBLE hit-layer under the heat cloud (Idea 3):
 * hover anywhere → "Suburb — N reports"; click → full breakdown.
 *
 * Run: node src/config/seed-zones-v2.js
 */

// Gqeberha metro bounds — tightened to the LAND area so Voronoi cells don't sprawl
// out into Algoa Bay. The eastern/southern edges hug the coastline; the built-up
// suburbs all sit inside this box. (Cell shapes are hidden on the map anyway, but
// this keeps clicks/labels sensible near the shore.)
const BOUNDS = { west: 25.46, east: 25.685, south: -34.02, north: -33.85 };

// Suburb centres across the whole metro. Denser where the city is denser so cells
// stay realistically sized. (lat, lon)
const SUBURBS = [
  ['Summerstrand',        -33.9930, 25.6620],
  ['Humewood',            -33.9780, 25.6420],
  ['Kings Beach',         -33.9700, 25.6360],
  ['Central',             -33.9600, 25.6230],
  ['South End',           -33.9660, 25.6260],
  ['Richmond Hill',       -33.9540, 25.6080],
  ['Central Hill',        -33.9500, 25.6180],
  ['North End',           -33.9330, 25.6040],
  ['Sydenham',            -33.9350, 25.5970],
  ['Malabar',             -33.9280, 25.6120],
  ['Korsten',             -33.9310, 25.5760],
  ['Gelvandale',          -33.9200, 25.5720],
  ['Sunridge Park',       -33.9410, 25.5760],
  ['Mill Park',           -33.9640, 25.5900],
  ['Newton Park',         -33.9470, 25.5620],
  ['Greenacres',          -33.9540, 25.5850],
  ['Walmer',              -33.9800, 25.5870],
  ['Walmer Heights',      -33.9900, 25.5980],
  ['Charlo',              -33.9720, 25.5520],
  ['Mangold Park',        -33.9680, 25.5620],
  ['Sherwood',            -33.9440, 25.5340],
  ['Kabega',              -33.9520, 25.5250],
  ['Kabega Park',         -33.9420, 25.5180],
  ['Lorraine',            -33.9700, 25.5120],
  ['Lorraine Manor',      -33.9600, 25.5040],
  ['Kamma Park',          -33.9560, 25.5200],
  ['Theescombe',          -33.9850, 25.5250],
  ['Westering',           -33.9280, 25.5100],
  ['Bridgemead',          -33.9180, 25.5250],
  ['Fairview',            -33.9360, 25.5540],
  ['Framesby',            -33.9250, 25.5420],
  ['Linton Grange',       -33.9200, 25.5540],
  ['Lovemore Heights',    -33.9950, 25.5700],
  ['Sardinia Bay',        -34.0150, 25.5600],
  ['Bluewater Bay',       -33.8500, 25.6300]  // northern edge anchor
];

const ZONES = SUBURBS.map(([name, lat, lon], i) => ({
  id: 'ZONE' + String(i + 1).padStart(2, '0'),
  name, lat, lon
}));

async function seedZones() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  CampusCare — Zone Seed v5 (Voronoi suburbs)    ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const cells = voronoiCells(ZONES, BOUNDS);

  console.log('  [1/2] Clearing old zones...');
  await query('DELETE FROM StudentZone');
  await query('DELETE FROM CampusZone');

  console.log('  [2/2] Seeding ' + cells.length + ' Voronoi suburb cells (gap-free)...');
  const rows = cells
    .filter(c => c.ring.length >= 3)
    .map(c => [c.id, c.name, Number(c.lat.toFixed(5)), Number(c.lon.toFixed(5)), 300, JSON.stringify(c.ring)]);
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
  await query('INSERT INTO CampusZone (ZoneID, Name, Latitude, Longitude, Radius, Boundary) VALUES ' + placeholders, rows.flat());

  console.log('  ✓ Done. ' + rows.length + ' Voronoi zones — every point maps to its nearest suburb.');
  process.exit(0);
}

if (process.argv[1]?.includes('seed-zones')) {
  seedZones().catch(e => { console.error(e); process.exit(1); });
}

export { ZONES, BOUNDS };
