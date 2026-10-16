# Investigation & Plan — Location Capture, Storage & Zoning

Scope: three questions after the Leaflet → MapLibre pin-picker swap.
1. Did the zone logic survive the map swap — are we still getting correct locations?
2. Why does the picker say "Zone: Location set" instead of a real zone?
3. Can we upgrade how we collect / store / zone locations, and does MapLibre unlock anything better?

---

## 1. Did the zoning logic survive? — YES (verified)

**The map was never where zoning happened.** It is, and always was, a pure coordinate
picker. The pipeline is server-side end to end:

### Capture → store → zone (current, confirmed by reading the code)

| Step | Where | What happens |
|---|---|---|
| Pick a point | `public/js/pin-picker.js` (new) / was Leaflet | Click/drag → writes `lat`/`lon` into hidden form inputs. **No zone math here.** |
| Save location | `profile.controller.saveLocation` | `UPDATE Student SET Latitude, Longitude`; then `getZoneForPoint(lat, lon, zones)` (point-in-polygon vs `CampusZone.Boundary`); then rewrites `StudentZone`. |
| Log a symptom | `symptoms.controller.processSymptomCheck` → `symptoms.model.getStudentLocationSnapshot` | Reads the student's stored `Latitude/Longitude`, recomputes zone with the **same** `getZoneForPoint`, jitters the point for privacy, snapshots `Latitude/Longitude/ZoneID` onto `SymptomLog`. |
| Render the map | `trends.model` + `public/js/map.js` | Heatmap from `SymptomLog` points; zone polygons from `CampusZone.Boundary`. |

**Single source of truth:** `src/utils/geo.js` → `getZoneForPoint()` (ray-cast point-in-polygon
against the Voronoi `Boundary`, with nearest-centroid fallback). Both the profile save and the
symptom-log snapshot call it. The MapLibre picker writes the exact same `latitude`/`longitude`
hidden inputs the Leaflet one did — **so the server receives identical data and zoning is
unchanged.**

### Proof points from this session
- `POST /profile/location` with a pinned lat/lon → `302 /?toast=Location+saved` (save + zone recompute ran).
- `/trends/api/heatmap` → 60 GeoJSON features; `/trends/api/zones` → 35 features (zone polygons intact).
- No `L.map`/`leaflet` references remain in any view; MapLibre serves on both profile pages.

**Conclusion:** locations are still correct. Nothing downstream of the picker changed.

---

## 2. The "Zone: Location set" label — a pre-existing cosmetic bug (not a regression)

### Root cause
The old Leaflet script called an **undefined** `detectZone(lat, lon)` only inside the
"student already has a pin" branch; the click/drag path always fell through to a hardcoded
string:
```js
zoneLabel.textContent = 'Location set';   // never the real zone name
```
`detectZone` was never defined anywhere — if that branch had executed it would have thrown.
In practice the label has **always** read "Location set". The new picker faithfully reproduced
that behavior. So: not caused by the MapLibre swap, but now worth fixing properly.

### Why the client can't name the zone today
Zone resolution (`getZoneForPoint`) runs **server-side only**. There is **no client-callable
endpoint** that turns a lat/lon into a zone name. The picker literally has no way to know the
zone without either (a) shipping the Voronoi polygons to the browser, or (b) asking the server.

### Fix options (pick one in §4)
- **A (minimal, recommended):** add a tiny `GET /profile/zone-at?lat=&lon=` JSON endpoint that
  calls `getZoneForPoint` and returns `{ zoneId, name }`. Picker fetches it on pin set and shows
  the real suburb. ~15 lines, reuses existing logic, no duplicated math.
- **B (no network):** the location page already passes `zones` (with `Boundary`) to the view —
  ship a browser copy of the point-in-polygon test (`geo.js` logic) and resolve client-side.
  Zero round-trip, but **duplicates** the zoning algorithm in JS (drift risk) and inflates the
  page with 35 polygons.
- **C (do nothing):** relabel to a neutral "Pin placed ✓" so we stop implying a zone we aren't
  showing. Honest, zero cost, but misses the chance to show useful feedback.

Recommendation: **A** — one small endpoint, single source of truth preserved, best UX.

---

## 3. Upgrading capture / storage / zoning — options & MapLibre leverage

### 3.0 What's weak about the current model (honest assessment)
- **Voronoi suburbs are synthetic.** `CampusZone` is 35 suburb *centre points* tessellated into
  gap-free cells (`seed-zones-v2.js` + `voronoi.js`). A cell is "nearest centre," **not** a real
  suburb boundary. Good enough for a density map; imprecise near edges. The map deliberately hides
  the cell outlines because they're not authoritative.
- **One pin per student, overwritten.** `Student.Latitude/Longitude` is a single current location;
  `StudentZone` is rebuilt on each save. History lives only in `SymptomLog` snapshots (which is
  actually the right place).
- **Zone math is centroid/polygon in plain lat-lon degrees** — fine at city scale, but hand-rolled.
- **No client zone feedback** (the §2 issue).

### 3.1 Does MapLibre unlock better zoning? — Partly, and worth it
MapLibre GL is a renderer, not a geocoder, so it doesn't *compute* zones. But it brings
capabilities the old Leaflet setup didn't use:

| MapLibre capability | Zoning/UX benefit | Effort |
|---|---|---|
| **Vector tiles + `queryRenderedFeatures`** | Could hit-test a pin against real admin boundaries if we loaded a boundary tileset. | High (needs a real boundary source) |
| **MapTiler Geocoding API** (same key we already have) | Reverse-geocode a pin → real suburb/neighbourhood name + address. Replaces synthetic Voronoi names with real place names. | Medium |
| **GeoJSON source + `fill`/`line` layers** | Render *real* suburb polygons (if we source them) as the hit layer instead of Voronoi cells. | Medium–High (sourcing data) |
| **`Marker` + geolocate control** | "Use my current location" button (HTML5 geolocation) to pre-drop the pin. | Low |

The highest-leverage, lowest-risk win is **MapTiler reverse geocoding** for *naming* (and
optionally *zoning*), because the key, CSP allowance for `api.maptiler.com`, and raster basemap
are already in place.

### 3.2 Three upgrade tiers (choose scope in §4)

**Tier 1 — Polish the current model (low risk, high value).** Keep Voronoi zoning; just make it
honest and friendlier.
- Add `GET /profile/zone-at` (the §2-A endpoint) → picker shows the real Voronoi suburb name.
- Add a "Use my location" button (HTML5 geolocation → `map.flyTo` + `setPin`).
- No schema or seeding change. The map data pipeline is untouched.

**Tier 2 — Real place names via MapTiler reverse geocoding (medium).** Make the *label* and
optionally the *stored zone name* reflect real geography.
- On pin set, call MapTiler Geocoding (`api.maptiler.com/geocoding/{lon},{lat}.json?key=…`) to get
  the suburb/neighbourhood. Show it in the picker.
- Decision point: do we *store* the geocoded name, or keep Voronoi `ZoneID` for aggregation and
  only *display* the real name? Recommend: **keep `ZoneID` as the aggregation key** (stable, finite,
  seedable, demo-friendly) and use geocoding only for human-facing labels. Avoids coupling our
  outbreak math to a paid API and keeps the showcase seeder deterministic.
- Needs: confirm MapTiler plan allows geocoding; graceful fallback to the Voronoi name when the
  API is unavailable (same spirit as the raster-tile fallback).

**Tier 3 — Real suburb boundaries (higher effort, best fidelity).** Replace synthetic Voronoi
cells with authoritative polygons.
- Source Gqeberha ward/suburb polygons (e.g. OSM extract, municipal open data) as GeoJSON.
- Re-seed `CampusZone.Boundary` from real polygons (the schema already stores JSON boundaries —
  **no DB change needed**, just a new seeder). `getZoneForPoint` works unchanged (still
  point-in-polygon).
- The trends map could then *show* the real boundaries (they'd be meaningful, unlike Voronoi cells).
- Risk: data sourcing/licensing, polygon complexity (JSON size, point-in-polygon cost), and the
  showcase/outbreak seeders assume specific `ZONE01…` ids and a "nearest centre" model — they'd
  need re-tuning so demo data still lands in populated zones.

### 3.3 Storage: is the schema holding us back? — No
`CampusZone.Boundary` is already generic JSON polygons; `SymptomLog` already snapshots
`Latitude/Longitude/ZoneID` per report (the correct design — a student moving zones doesn't rewrite
history). None of Tiers 1–3 requires a schema migration. Tier 3 only swaps the *contents* of
`CampusZone` via a new seeder. This is a genuinely good existing design — the only real limitation
is the *quality of the zone polygons*, not the storage model.

---

## 4. Recommended path & decisions needed

### Recommended: **Tier 1 now** (fixes the visible bug + adds obvious UX), consider Tier 2 later.

Concretely, Tier 1 =
1. **`GET /profile/zone-at?lat=&lon=`** — thin controller using `getZoneForPoint`; returns
   `{ zoneId, name }` (or `{ zoneId: null, name: null }`). Reuses the single source of truth.
   - Files: `profile.controller.js` (+handler), `profile.routes.js` (+route, `requireAuth`).
   - CSRF: it's a GET read, no token needed; still behind `requireAuth`.
2. **Picker shows the real zone** — `pin-picker.js` fetches `/profile/zone-at` on pin set and sets
   `zoneLabel` to the suburb name (fallback "Pin placed" if null/offline). One small change,
   both pages inherit it (shared script).
3. **"Use my location" button** (optional within Tier 1) — HTML5 geolocation → `setPin` + `flyTo`.
   Permissions-Policy already allows `geolocation=(self)` per tech.md §4.

### Open decisions for you
- **Scope:** Tier 1 only, or Tier 1 + Tier 2 (real place-name labels via MapTiler)?
- **If Tier 2:** store the geocoded name, or display-only (keep `ZoneID` for aggregation)?
  (Recommendation: display-only.)
- **Tier 3** (real boundaries) — out of scope unless you want map fidelity to be a headline
  feature; it's the only item with data-sourcing risk and seeder rework.

### What I will NOT change without sign-off
- The outbreak/aggregation model keys on `ZoneID` — I'd keep that stable regardless of tier.
- No schema migration is proposed. Tier 3 (if ever) is a re-seed, not a migration.

---

## Appendix — exact touch points
- `src/utils/geo.js` — `getZoneForPoint` (zoning source of truth; unchanged).
- `src/modules/profile/profile.controller.js` — `saveLocation` (zone recompute), `showLocationPicker`/`showEditProfile` (pass `maptilerKey`); **+ new `zoneAt` handler (Tier 1)**.
- `src/modules/profile/profile.routes.js` — **+ `GET /zone-at` route (Tier 1)**.
- `public/js/pin-picker.js` — **+ fetch zone name on pin set (Tier 1)**; **+ geolocate button (optional)**.
- `src/config/seed-zones-v2.js` + `src/utils/voronoi.js` — only touched for **Tier 3** (real polygons).
- `src/modules/trends/*` — unchanged in Tiers 1–2.
