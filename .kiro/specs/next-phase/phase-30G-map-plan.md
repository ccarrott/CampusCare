# Phase 30G — Immersive Health Map + Location Rework

**Goal:** replace the clunky Leaflet-in-a-box with a **standalone, beautiful, theme-matched heat map of Gqeberha symptom activity** built on **MapLibre GL + MapTiler**. Rework how we store/collect/aggregate location so the heat render is smooth and accurate — while keeping the privacy model (no individual identities exposed).

> The map's job is **display**, not heavy interactivity: a gorgeous heat/choropleth of where symptoms are being reported across the city. Calm, glass overlays, theme-matched.

## Current state (what we're replacing)
- **Render:** Leaflet + OSM raster tiles inside a `.content-card`, choropleth polygons from `CampusZone.Boundary` GeoJSON + per-zone counts. Looks like a scratch project.
- **Location model:** student drops a pin → `Student.Latitude/Longitude`; a point-in-polygon computes their `StudentZone`; the map aggregates `SymptomLog` counts **per zone** (coarse suburb shading). Zones carry both `Radius` (legacy circle) and `Boundary` (polygon) — inconsistent.
- **APIs:** `getMapDataAPI` returns a zone GeoJSON FeatureCollection; `trends/dashboard` shows the map + charts.

## Target render (the showpiece)
- **MapLibre GL JS** (vanilla, loaded like Chart.js), retire Leaflet entirely.
- **MapTiler vector basemap, theme-matched:** light style for light mode, dark style for dark mode; swaps on theme toggle. Key from `.env` (`MAPTILER_KEY`), origin-restricted.
- **Standalone immersive page** (`.layout-immersive`): the map IS the page, edge-to-edge, centred on Gqeberha. Floating **glass overlays**: title + period filter (top-left), legend (bottom-left), zone/area detail card (slides in on click/hover). Footer hidden, nav rail minimal.
- **Heat layer** (primary, the "beautiful" bit): MapLibre `heatmap` layer over symptom-report points — smooth density gradient (transparent → brand-yellow → warm-orange → danger-red) weighted by report count/severity. This is what makes it look pro rather than blocky suburb polygons.
- **Choropleth zones** (secondary, toggle): keep the suburb polygons as an optional overlay for "by area" totals + click-to-detail, styled with soft glass-like fills.
- Animated **fly-to** on load + on zone click (Motion-style easing via MapLibre `easeTo`).

## Location rework (backend — the "edit how we store/collect" ask)

**Problem:** aggregating only per-zone gives coarse blocks; a heat map wants *points* (jittered for privacy) to render smooth density.

**New model — `SymptomReportPoint` (privacy-preserving heat source):**
- When a symptom check is logged, ALSO record an **anonymised, jittered coordinate** derived from the student's pin — NOT their exact location, NOT linked to identity in the heat query.
- New table:
  ```sql
  CREATE TABLE SymptomReportPoint (
    PointID      varchar(50) PRIMARY KEY,
    Latitude     DECIMAL(10,7) NOT NULL,   -- jittered ±~150m from the student's pin
    Longitude    DECIMAL(10,7) NOT NULL,
    Severity     varchar(20) NOT NULL,
    ZoneID       varchar(20) NULL,          -- denormalised for the choropleth toggle
    CreatedAt    datetime DEFAULT CURRENT_TIMESTAMP
    -- deliberately NO StudentNumber / SymptomID FK → cannot re-identify a person from this table
  );
  ```
- **Collection:** in `symptoms.controller.processSymptomCheck` (non-blocking, after the existing log write), if the student has a saved pin, insert a `SymptomReportPoint` with a small random jitter applied (util `geo.jitter(lat, lon, ~150m)`) + severity + computed zone. This gives the heat layer real points without exposing anyone.
- **Privacy stance:** the heat query reads ONLY `SymptomReportPoint` (no identity join). Jitter + aggregation + a minimum-count threshold per view keep it non-identifying. The exact `Student.Latitude/Longitude` pin is never sent to the client. Document this clearly (matches product principle 3).
- **Keep** the existing pin-drop collection + `StudentZone` (still used for the choropleth toggle + recurrence features). We ADD points, we don't remove zones.
- **Backfill:** the showcase/outbreak seeders generate `SymptomReportPoint` rows (jittered around zone centroids) so the demo map looks alive. Outbreak state clusters points in one suburb → visible hot spot.

**New/changed APIs (`trends`):**
- `GET /trends/api/heat?period=` → GeoJSON point FeatureCollection from `SymptomReportPoint` (jittered), for the MapLibre heat layer.
- Keep `GET /trends/api/map-data` (zone choropleth) for the toggle.
- Pin-drop pages (`profile/location.ejs`, `edit.ejs`) swap Leaflet → MapLibre too (single small pin-picker map), so we ship ONE map library.

## Files
- `.env` — `MAPTILER_KEY` (done)
- `src/config/migrate.js` — `SymptomReportPoint` table
- `src/utils/geo.js` — add `jitter(lat, lon, meters)`
- `src/modules/symptoms/symptoms.controller.js` — write a report point on log (non-blocking)
- `src/modules/trends/trends.model.js` + `trends.controller.js` — heat API + point aggregation
- `src/modules/trends/trends.routes.js` — `/api/heat`
- `views/trends/dashboard.ejs` → immersive map page (or a new `views/trends/map.ejs`) + charts move to a companion section/page
- `public/js/map.js` (new) — MapLibre init, theme-matched style swap, heat + choropleth layers, glass overlay wiring
- `public/vendor/maplibre/` — vendored MapLibre GL (js + css) OR CDN
- `src/config/states/*` — seed `SymptomReportPoint`
- Remove Leaflet includes app-wide once pin-drop is migrated

## Guardrails
- **Privacy first:** heat table has no identity link; jitter always applied; never send raw student pins to the client. A minimum aggregation threshold before a spot renders.
- Theme swap must reload the correct MapTiler style without losing map state.
- MapTiler key is origin-restricted (localhost dev). Handle key/tile load failure gracefully (fallback message, don't white-screen).
- Charts (Chart.js) stay — they move to a companion "Trends" section; the MAP becomes its own immersive page.

## Verify
Immersive map renders theme-matched tiles centred on Gqeberha; heat layer shows smooth density; outbreak state produces a visible hot cluster; period filter updates; zone click shows a glass detail card; pin-drop picker works on MapLibre; no identity data in `/api/heat`; light+dark; graceful failure if tiles/key fail.
