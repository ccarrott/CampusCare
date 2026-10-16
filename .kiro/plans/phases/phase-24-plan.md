# Phase 24: Zone System Overhaul & Choropleth Heat Map

## Goal

Replace the current 8-zone circle-based map system with a **city-wide choropleth (polygon-shaded) health map** covering all visible Gqeberha suburbs. Zones are invisible to students (purely database-level), the pin dropper shows NO zone boundaries, and the trends map renders filled polygon regions coloured by symptom intensity — like a real public health dashboard.

---

## Part A: Expanded Zone Coverage (20+ Suburbs)

### From the satellite image, these suburbs are visible and need coverage:

| Zone ID | Suburb Name | Approx Centre |
|---------|-------------|---------------|
| ZONE01 | Summerstrand | -33.9880, 25.6650 |
| ZONE02 | Humewood | -33.9730, 25.6400 |
| ZONE03 | South End | -33.9680, 25.6250 |
| ZONE04 | Central (CBD) | -33.9600, 25.6000 |
| ZONE05 | North End / Korsten | -33.9420, 25.6100 |
| ZONE06 | Mill Park | -33.9600, 25.6200 |
| ZONE07 | Newton Park | -33.9500, 25.6050 |
| ZONE08 | Sunridge Park | -33.9430, 25.5900 |
| ZONE09 | Walmer | -33.9750, 25.6150 |
| ZONE10 | Walmer Heights | -33.9820, 25.6050 |
| ZONE11 | Fairview | -33.9380, 25.5850 |
| ZONE12 | Lorraine | -33.9300, 25.5750 |
| ZONE13 | Sherwood | -33.9350, 25.5600 |
| ZONE14 | Kabega Park | -33.9400, 25.5500 |
| ZONE15 | Westering | -33.9350, 25.5400 |
| ZONE16 | Kamma Park | -33.9500, 25.5500 |
| ZONE17 | Theescombe | -33.9550, 25.5400 |
| ZONE18 | Broadwood / Lovemore Heights | -33.9650, 25.5500 |
| ZONE19 | Cotswold / Malabar | -33.9350, 25.6200 |
| ZONE20 | Sydenham | -33.9380, 25.6300 |
| ZONE21 | Richmond Hill / St Georges Park | -33.9580, 25.6150 |
| ZONE22 | Kings Beach / Boardwalk area | -33.9750, 25.6500 |

### Zone Polygon Strategy

Each zone is a **non-overlapping bounding polygon** that tiles the city like a mosaic. No gaps between zones (every pin must fall inside exactly one zone). Polygons share edges — when one ends, the next begins.

**Approach:** Use a Voronoi-style tessellation from zone centroids, then manually adjust boundaries along major roads/natural features visible in the satellite image:
- M4 highway as a natural boundary between coastal and inland zones
- N2 freeway separating Lorraine/Sherwood from inner suburbs
- Railway line separating North End/Korsten from Newton Park
- Swartkops River as western edge

### Data Format

Zone polygons stored as JSON arrays of `[lat, lon]` pairs in `CampusZone.Boundary`:

```json
[[-33.975, 25.650], [-33.975, 25.680], [-33.996, 25.680], [-33.996, 25.650]]
```

Each polygon has 6-10 vertices (simple enough for point-in-polygon, detailed enough to follow suburb boundaries).

---

## Part B: Pin Dropper — Clean, No Zone Overlay

### Rule: Students NEVER see zone boundaries.

The pin-drop page shows:
- Clean Leaflet/OSM base map (same tile layer we use)
- Click to place/drag marker
- That's it. No polygons, no colours, no zone names visible

Zone assignment happens silently server-side after pin is saved. The student only sees: "Location saved ✓"

### Where pin dropper appears:
- `/profile/location` (existing)
- `/profile/edit` (already added in last session)
- After registration prompt

### Remove zone polygon overlays from:
- `views/profile/location.ejs` — remove the zone polygon drawing code
- `views/profile/edit.ejs` — remove the zone polygon drawing code

---

## Part C: Choropleth Trend Map (Polygon Shading)

### Current: Circles at zone centroids, sized by report count
### New: Filled polygon regions, coloured by symptom intensity

**Technique:** Leaflet Choropleth (same as the [official Leaflet tutorial](https://leafletjs.com/examples/choropleth/))

**How it works:**
1. API returns zone data: `{ zoneId, name, boundary, totalReports }`
2. Frontend renders each zone as an `L.geoJson` polygon layer
3. Fill colour determined by report density (using a colour scale):
   - 0 reports: transparent (don't draw)
   - 1-2 reports: light green `#d4edda`
   - 3-5 reports: amber `#fff3cd`
   - 6-10 reports: orange `#f5a623`
   - 11+ reports: red `#dc3545`
4. On hover: highlight border, show zone name + count in an info panel
5. On click: show popup with top 3 symptoms in that zone

### Styling:
```js
function getZoneColor(reports) {
  return reports > 10 ? '#dc3545' :
         reports > 5  ? '#f5a623' :
         reports > 2  ? '#fff3cd' :
         reports > 0  ? '#d4edda' :
                        'transparent';
}

function zoneStyle(feature) {
  return {
    fillColor: getZoneColor(feature.properties.totalReports),
    weight: 1,
    opacity: 0.8,
    color: '#666',
    fillOpacity: 0.6
  };
}
```

### Info Control (top-right panel):
Shows zone name + report count on hover. Like the Leaflet choropleth tutorial.

### Legend (bottom-right):
Colour-coded squares: Normal | Elevated | High | Outbreak

---

## Part D: Map Data API Update

Update `GET /trends/api/map-data` to return GeoJSON-compatible data:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "zoneId": "ZONE01", "name": "Summerstrand", "totalReports": 8, "topSymptoms": [...] },
      "geometry": { "type": "Polygon", "coordinates": [[[25.650, -33.975], ...]] }
    }
  ]
}
```

Note: GeoJSON uses `[longitude, latitude]` order (opposite of Leaflet's `[lat, lon]`). The API returns proper GeoJSON so Leaflet's `L.geoJson()` can consume it directly.

---

## Part E: Nominatim Reverse Geocoding (Optional Enhancement)

When a student drops a pin, optionally fetch the suburb name from [Nominatim](https://nominatim.openstreetmap.org/reverse) for display purposes:

```
GET https://nominatim.openstreetmap.org/reverse?lat=-33.9855&lon=25.6600&format=json
```

Returns suburb/neighbourhood name. Can be shown as "📍 Summerstrand" after pin drop (cosmetic only — zone assignment still uses our polygons).

**Rate limit:** Max 1 request per second. Only call on pin save, not on every drag.

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | Define 22 zone polygons (non-overlapping, tessellating) | High |
| 2 | Update CampusZone seeder with new polygon data | Medium |
| 3 | Remove zone overlays from pin-drop pages (clean map only) | Low |
| 4 | Rewrite trends map API to return GeoJSON FeatureCollection | Medium |
| 5 | Rewrite trends dashboard map: choropleth rendering with `L.geoJson` | High |
| 6 | Add hover highlight + info panel + legend | Medium |
| 7 | Update existing student coordinates (backfill to match new zones) | Low |
| 8 | Update showcase state script with new zone IDs | Medium |
| 9 | Test: verify all students mapped, choropleth renders, pin-drop clean | Medium |

---

## Visual Result

The trends map goes from "a few coloured circles floating on a blank map" to **a proper public health choropleth** where the entire city is tiled in coloured suburb regions. Areas with more symptom reports glow warmer. It looks like a real epidemiological dashboard.

Students dropping pins see a clean, normal map. They have no idea zones exist. The system silently assigns them. Privacy maintained.


---

## Part F: Butterfly Effect Cleanup (End of Phase)

After the zone expansion and choropleth implementation, these cascade changes need attention:

### F1 — State Scripts Update

Both `state-showcase.js` and `state-outbreak.js` reference old zone IDs (ZONE01-ZONE08). Must update to new 22-zone system:
- Student coordinates in showcase must map to valid new zones
- Outbreak script must target a specific new zone (e.g. ZONE04 Central or ZONE05 Korsten)
- `getZoneForPoint()` must work against new polygon boundaries
- StudentZone seeding in showcase must recompute from new polygons

### F2 — Symptom Seed Script

`seed-symptoms.js` is fine (no zone references), but the showcase script's SymptomLog entries assign students to zones via their coordinates. After zone expansion, the same coordinates may fall in different zones. Must re-verify all 19 student coordinates land inside valid new zone polygons.

### F3 — Backfill Student Coordinates

Existing students in the DB may have coordinates that were inside old ZONE01-08 but now fall in different new zones. After seeding new zones, must:
1. Re-run `getZoneForPoint()` for all students
2. Update `StudentZone` table to reflect new assignments
3. This happens automatically in `state-showcase.js` (it reseeds everything), but if running in production without reset, need a one-off migration script

### F4 — Remove Old Zone References

- Delete old `seed-zones-poly.js` if still exists (already removed)
- Ensure no code references ZONE01-ZONE08 by name with hard expectations
- Outbreak script should target zone by NAME not ID (in case IDs shift)

### F5 — Admin CRUD

- Student form already has no address field ✓
- Student list table already shows no address ✓
- Verify admin reports zone-based queries work with 22 zones

### F6 — Final State Verification

After all changes, run the full integrity check:
```bash
npm run state:showcase
# Then verify:
# - All 19 students have valid StudentZone entries
# - All SymptomLogEntry → SymptomLog → StudentZone → CampusZone chain intact
# - Choropleth map renders all zones with correct colours
# - Pin-drop pages show NO zone polygons
# - Outbreak overlays correctly to one specific zone
```

---

## Implementation Order (Complete)

| Step | What | Effort |
|------|------|--------|
| 1 | Define 22 zone polygons (non-overlapping, tessellating) | High |
| 2 | Update CampusZone seeder with new polygon data | Medium |
| 3 | Remove zone overlays from pin-drop pages (clean map only) | Low |
| 4 | Rewrite trends map API to return GeoJSON FeatureCollection | Medium |
| 5 | Rewrite trends dashboard map: choropleth rendering with `L.geoJson` | High |
| 6 | Add hover highlight + info panel + legend | Medium |
| 7 | Update showcase state script (new zone IDs, student coords, outbreak target) | Medium |
| 8 | Update outbreak state script (target new zone by name) | Low |
| 9 | Re-run state:showcase → verify full data integrity | Medium |
| 10 | Boot test + visual verification | Low |
