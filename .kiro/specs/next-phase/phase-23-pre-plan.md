# Pre-Phase 23: Map & Location System Overhaul

## Goal

Replace the current keyword-matching address system with a **real geospatial pin-drop location system** that works at scale with any number of students — not just seeded data. Students pick their location on a map. Zones are real Gqeberha suburbs with polygon boundaries. Zone assignment is computed from coordinates, not guessed from address strings.

---

## What's Wrong Now

1. **Address is a text field** — students type freeform text, zone is guessed by keyword matching ("Hoff Street" → Summerstrand)
2. **Only works with seeded data** — new students who register get NO zone assignment because the keyword matcher only runs in the zone seeder script
3. **Zones are circles** — arbitrary radius circles don't reflect real suburb boundaries
4. **StudentZone requires a separate seeder to populate** — it's not computed on registration

---

## New System Design

### Student Location: Pin Drop on Leaflet Map

**Where it appears:**
- After registration → redirect to "Set Your Location" page
- Also accessible from Profile (student can update their pin anytime)

**How it works:**
1. Page shows Leaflet map centred on NMU South Campus
2. Student clicks anywhere on the map to drop a pin
3. Pin position (lat/lon) stored on the Student record
4. Server computes which zone polygon contains that point
5. `StudentZone` record auto-created/updated

**No text address field.** The pin IS their location. If we want to display a readable location name, we can reverse-geocode via Nominatim (OpenStreetMap's free geocoding API) — but that's optional/cosmetic.

### Database Changes

```sql
-- Add coordinate columns to Student
ALTER TABLE Student ADD COLUMN Latitude DECIMAL(10, 7) NULL;
ALTER TABLE Student ADD COLUMN Longitude DECIMAL(10, 7) NULL;

-- Drop the old Address column (replaced by pin)
ALTER TABLE Student DROP COLUMN Address;

-- Update CampusZone: add polygon boundary column
ALTER TABLE CampusZone ADD COLUMN Boundary JSON NULL;
-- Boundary stores an array of [lat, lon] pairs defining the polygon
```

### Zone Definitions (Real Gqeberha Suburbs)

Zones defined as GeoJSON-style polygon coordinates. Each zone covers a real suburb with enough population density that individual students can't be identified.

| ZoneID | Name | Approx Boundary |
|--------|------|-----------------|
| ZONE01 | Summerstrand | NMU campus area + surrounding student accommodation |
| ZONE02 | Humewood & South End | Beachfront, south of Summerstrand |
| ZONE03 | Newton Park | Major residential suburb west of campus |
| ZONE04 | Central (CBD) | City centre, Mount Road corridor |
| ZONE05 | Walmer | Southern suburb, Walmer Park area |
| ZONE06 | Lorraine & Fairview | Northern residential suburbs |
| ZONE07 | Mill Park & Richmond Hill | Inner eastern suburbs |
| ZONE08 | Uitenhage Road Corridor | Malabar, Helenvale, KwaNobuhle direction |

Each zone polygon is defined by 5-8 coordinate pairs (simple polygon, no multipolygon needed). Stored as JSON array in the `CampusZone.Boundary` column.

### Point-in-Polygon Computation

When a student saves their pin:

```js
function getZoneForPoint(lat, lon, zones) {
  for (const zone of zones) {
    if (pointInPolygon([lat, lon], zone.boundary)) {
      return zone.ZoneID;
    }
  }
  return null; // Outside all zones — assign to nearest or "Other"
}
```

**Ray-casting algorithm** — standard point-in-polygon test. No external library needed (< 20 lines of code). Runs server-side on save.

If the student drops a pin outside all defined zones (e.g. they live in Uitenhage, 30km away), assign to the nearest zone by centroid distance as a fallback.

---

## UI: "Set Your Location" Page

### Route
- `GET /profile/location` — shows the map picker
- `POST /profile/location` — saves lat/lon, computes zone

### View (`views/profile/location.ejs`)

```
┌─────────────────────────────────────────┐
│  Set Your Location                      │
│  Drop a pin where you live.             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │     [Leaflet Map]               │    │
│  │     - Click to place pin        │    │
│  │     - Drag to adjust            │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📍 Your pin: Summerstrand area         │
│                                         │
│  [Save Location]                        │
└─────────────────────────────────────────┘
```

- Map height: 400px
- Default centre: NMU South Campus (-33.9855, 25.6600), zoom 13
- Click places/moves a draggable marker
- Zone polygons drawn as semi-transparent coloured overlays
- When pin is placed, show which zone it falls in (instant client-side check)
- Hidden inputs: `latitude`, `longitude`
- Submit saves to DB + computes StudentZone

### Post-Registration Flow
After successful registration → redirect to `/profile/location` with a message: "One more step — drop a pin on the map to set your location."

If a student skips this (closes the page), they simply won't appear in zone-based trend data until they set it. Their symptom checks still log fine — they just won't contribute to map visualisation.

---

## Zone Polygon Data

Approximate polygon coordinates for each zone (simplified, 5-8 vertices each):

```js
const ZONE_POLYGONS = {
  ZONE01: { name: 'Summerstrand', boundary: [
    [-33.9750, 25.6500], [-33.9750, 25.6800], [-33.9950, 25.6800], [-33.9950, 25.6500]
  ]},
  ZONE02: { name: 'Humewood & South End', boundary: [
    [-33.9650, 25.6200], [-33.9650, 25.6500], [-33.9800, 25.6500], [-33.9800, 25.6200]
  ]},
  ZONE03: { name: 'Newton Park', boundary: [
    [-33.9400, 25.5900], [-33.9400, 25.6300], [-33.9650, 25.6300], [-33.9650, 25.5900]
  ]},
  ZONE04: { name: 'Central (CBD)', boundary: [
    [-33.9500, 25.5800], [-33.9500, 25.6100], [-33.9700, 25.6100], [-33.9700, 25.5800]
  ]},
  ZONE05: { name: 'Walmer', boundary: [
    [-33.9650, 25.6000], [-33.9650, 25.6400], [-33.9850, 25.6400], [-33.9850, 25.6000]
  ]},
  ZONE06: { name: 'Lorraine & Fairview', boundary: [
    [-33.9200, 25.5700], [-33.9200, 25.6100], [-33.9450, 25.6100], [-33.9450, 25.5700]
  ]},
  ZONE07: { name: 'Mill Park & Richmond Hill', boundary: [
    [-33.9550, 25.6100], [-33.9550, 25.6350], [-33.9700, 25.6350], [-33.9700, 25.6100]
  ]},
  ZONE08: { name: 'Uitenhage Road Corridor', boundary: [
    [-33.9100, 25.5500], [-33.9100, 25.5900], [-33.9400, 25.5900], [-33.9400, 25.5500]
  ]},
};
```

These get seeded into `CampusZone.Boundary` as JSON.

---

## Trend Map Update

The health trend map already renders circles per zone. After this change:
- Zone circles could be upgraded to **polygon overlays** (colour-filled zone shapes) — looks much more professional
- Or keep circles but position them at the zone centroid (computed from polygon average)
- Either way, the data pipeline doesn't change: `SymptomLogEntry → SymptomLog → StudentZone → CampusZone`

---

## What Gets Removed

- `Student.Address` column (replaced by Lat/Lon pin)
- `seed-zones.js` keyword-matching logic (replaced by point-in-polygon)
- Admin student forms: remove address text field, add "View on map" link
- Registration form: remove address field

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | DB migration: add Latitude/Longitude to Student, add Boundary to CampusZone, drop Student.Address | Low |
| 2 | Seed zone polygon boundaries into CampusZone | Low |
| 3 | Create point-in-polygon utility (`src/utils/geo.js`) | Low |
| 4 | Create location picker page (view + route + controller) | Medium |
| 5 | Update profile module: save pin → compute zone → update StudentZone | Medium |
| 6 | Update registration flow: redirect to location picker after register | Low |
| 7 | Update admin student CRUD: remove address field, show zone name | Low |
| 8 | Update trend map: draw zone polygons as overlays (optional, can keep circles) | Medium |
| 9 | Backfill existing students with coordinates (from old address data or random within zone) | Low |
| 10 | Remove old `seed-zones.js` keyword logic, update seed scripts | Low |
| 11 | Boot test + verify map picker works end-to-end | Medium |

---

## Privacy Guarantee

- Exact student coordinates (Latitude/Longitude) are NEVER exposed via any API
- Only zone-level aggregated data is shown on the trends map
- Zone polygons are large enough (suburb-level) that no individual can be identified
- The `/trends/api/map-data` endpoint returns zone totals only — no lat/lon of individual students
