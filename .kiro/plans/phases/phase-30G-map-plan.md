# Phase 30G — Immersive Health Map + Location Rework

> ## Project context (read first — where we are)
> **CampusCare** — a university clinic web app (Nelson Mandela University). Relieves clinic congestion via a **3-tier model**: Tier 1 self-care (symptom checker, OTC meds, health-trend map), Tier 2 nurse consultations (booking, Daily.co video, reviews), Tier 3 admin (accounts, reports, escalation). Roles: **student / nurse / admin**.
>
> **Stack (hard rules — see `.kiro/steering/tech.md`):** Node 18+ / Express 5, **EJS SSR + vanilla JS + hand-written CSS only**. NO React, NO Tailwind, NO TypeScript, NO build step. MySQL 8 via `mysql2/promise`. Session auth + double-submit CSRF, bcrypt. Only vanilla runtime libs allowed, loaded like Chart.js: **Chart.js, Daily.co, Motion One, MapLibre GL**. Domain modules under `src/modules/<feature>/` (routes+controller+model); models are the only DB layer (parameterised queries only); `utils/` for `catchAsync`, `AppError`, `sanitize`, `dates`, `daily`, `geo`.
>
> **Run/verify:** `node src/app.js` (port 3000). Migrations: `node src/config/migrate.js` (idempotent). DB states: `npm run state:showcase|outbreak|clear|naked` (or console `CampusCare.showcase()` etc.). Logins — student `s227921577`/`password123`, nurse `NUR001`/`nurse123`, admin `ADM001`/`admin123`. Stale node on 3000: `Stop-Process -Name node -Force`. Branch: `gui`.
>
> **Design law:** `.kiro/steering/ui-design.md` ("Calm Clinical Glass") + `.kiro/design-refs.md`. Single stylesheet `public/css/style.css` (`:root` tokens + `[data-theme="dark"]`). Never hardcode a colour/space/radius a token covers. Four layout archetypes: immersive / focused / dashboard / feed-split.
>
> ### GUI state as of now (Phase 30A–F + Fixups 1–4 all shipped on `gui`)
> - **Fonts:** system = **Cantarell**, dashboard greeting = **WindSong** — both via Google Fonts `<link>` in `views/partials/header.ejs` + `auth-header.ejs`. Greeting is JS-fitted (`public/js/sidebar.js`) to ~a fraction of container width; light=navy, dark=white.
> - **Shell:** floating **glass sidebar rail** (role-aware, `views/partials/navbar.ejs`), profile+logout live in it. **Top-right identity chip REMOVED.** Theme toggle = bottom-right glass button using `icon.ejs` `lightmode`/`darkmode` SVGs. No footer on immersive pages.
> - **Lighting = "spotlight":** `public/js/glass-light.js` injects one `.spotlight` overlay div per glass surface (`.content-card, .dash-hero, .stat-tile, .glass-note, .staff-card, .auth-card, .sidebar`); a document-level pointermove sets per-element `--spot-x/--spot-y` + a proximity `--glow` (fades in before the cursor arrives). **All static `::before` blooms were removed** — do not reintroduce them.
> - **Breathing bg:** `#app-aurora` with 6 drifting blobs (Fixup: larger travel/scale, ~16–30s).
> - **Icons:** inline Lucide-style map in `views/partials/icon.ejs` (theme-driven `currentColor`). Mapping: `book`=student bookings, `appointment`=nurse availability + student My Appointments, `clinical`=nurse dashboard, plus `symptoms/trend/meet/profile/report/manage.*/logout/darkmode/lightmode/alert/location/video/trash/file/check/search/camera/calendar/close`. **No emoji anywhere.**
> - **Cards:** glass `.content-card`; dashboard cards have a faded, top-centred, whitish-gray SVG **watermark**. Booking availability grid is glassified. Scrollbars hidden site-wide.
> - **Back button:** shared `views/partials/back-button.ejs` = `< back`, `history.back()` + `/` fallback, `margin: 1em 0`, placed under the page heading / above the first block. Used across drill-in pages.
> - **Cache-busting:** local CSS/JS load with `?v=<%= assetV %>` (`assetV` = server-start token set in `src/app.js`). Add the same to any new includes (e.g. `map.js`, MapLibre).
> - **Map is still on the OLD Leaflet-in-a-box** — that is exactly what THIS phase replaces (see below).
>
> **Schema (post 29B):** `Student, Nurse, Admin, Appointment, ConsultationSession, Rating, NurseReviews, Symptom, Medication, SymptomMedicationMap, SymptomLog, SymptomLogEntry, NurseAvailability, CampusZone, StudentZone, Clinic, PasswordResetToken`. `Student.Latitude/Longitude` hold the pin; `CampusZone.Boundary` = JSON polygon. This phase ADDS `SymptomReportPoint`.

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

## Conflict notes (updated post GUI fixups)
- **Glass overlays** must use the current single-source **spotlight** system (`public/js/glass-light.js` injects a `.spotlight` div per glass surface; `--spot-x/--spot-y` + proximity `--glow`). Do NOT reintroduce per-element static `::before` blooms — those were removed site-wide. If the map's floating panels want the cursor light, give them a class in the spotlight `SELECTOR`.
- **Back button:** the immersive map page should use the shared `views/partials/back-button.ejs` (auto `history.back()` + `/` fallback, `margin: 1em 0`), placed under any heading / above the first overlay — consistent with the rest of the site.
- **Motion easing:** Motion One may be removed; use CSS `--ease-soft`/`--ease-spring` or MapLibre's built-in `easeTo` rather than depending on the Motion global.
- **Icons:** use the inline `icon.ejs` map (e.g. `location`, `trend`, `alert`) for map controls — no emoji.
- **Assets are cache-busted** via `?v=<%= assetV %>`; add the same to any new `map.js`/maplibre includes.
