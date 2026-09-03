# Phase 29C — Consultation UX, Permissions & Locator Hardening

The "how you get seen + platform polish" layer. Covers the student-facing nurse profile page (item 4), the dark-mode booking legend fix (item 6), the consultation progress bar (item 13), the hospital-locator audit (item 15), and real-site permission flows (item 16).

---

## Item 4 — Separate student-facing nurse profile page (+ booking link)

### Essence
In the booking flow, after selecting a nurse a card pops up with a few reviews and a "see more / view full details" link. Currently that jumps to the whole "Meet Our Staff" page. Instead, link to a **dedicated per-nurse student-facing profile page** showing that nurse's details (no private info — no phone/email) and **all their reviews with filtering**.

### Current state
- Booking card is fed by `getNurseProfileAPI` (`GET /consultations/api/nurse-profile/:staffNumber`) → returns bio, years, average, and only 3 anonymised reviews; the "view full profile" link points at `/staff`.
- `/staff` (`showStaffPage`) renders ALL nurses on one page (`staff/index`) — there is **no per-nurse student route**. The only per-nurse detail is admin's `showNurseDetail` (admin-only, shows private data).
- Public-safe nurse fields: FirstName, LastName, Bio, YearsExperience, ClinicID, ratings. Private (exclude): Email, PhoneNumber, Address, Password.
- Reviews source: `getVerifiedRatingsForNurse(staffNumber, limit)` (approved only), anonymised as "Patient N".

### Changes
1. **New route** (staff module): `GET /staff/:staffNumber` → `showNurseProfile` (student-facing, `requireAuth`). Distinct from admin's nurse-detail.
2. **New model fn / reuse**: fetch the nurse's public fields + `getVerifiedRatingsForNurse(staffNumber, <high limit>)` (ALL approved reviews) + average/count. Explicitly select only public columns (no phone/email/address).
3. **New view** `views/staff/nurse-profile.ejs`:
   - Header: name, years experience, clinic (name only), star average + count, bio.
   - **All approved reviews** listed (anonymised "Patient N", score, comment, date).
   - **Filtering** controls: by star rating (5→1), by sort (newest / highest / lowest), optionally a "with comments only" toggle. Implement client-side over the rendered review list (simple, no extra requests) since the set is modest; if a nurse ever has many reviews, paginate.
4. **Booking link** (`views/consultations/book.ejs` + the card JS): change the "see more / view full profile" link from `/staff` to `/staff/<staffNumber>`. Keep the quick 3-review preview in the booking card as-is (fast inline context); "see more" now deep-links to the full profile.
5. **Redesign `/staff` (Meet Our Staff) as a proper directory:**
   - Clean responsive card grid. Each card: avatar circle (initial), name, **campus badge**, experience, star average + count, short bio, a **preview of the top 2 reviews only** (not all), and a "View full profile →" button linking to `/staff/:staffNumber`.
   - **Campus filter** as pill buttons at the top (All / South Campus / North Campus / …), client-side filtering of the cards.
   - **View rules**: directory previews max 2 reviews per card; the per-nurse profile shows all approved reviews with filter/sort. Model now also returns `campus` per nurse.

### View rules summary
- **Directory card**: ≤2 review snippets, campus badge, links to full profile.
- **Full profile**: all approved reviews, filterable by rating + sortable (newest/highest/lowest).
- Reviews everywhere: approved-only, anonymised "Patient N".

### Notes / decisions
- **No private info** on the student-facing page — enforce by selecting only public columns in the query, not by hiding in the view (defence in depth).
- Reviews remain **approved-only** and anonymised for students (unchanged privacy model). Filtering is a view-layer convenience over that approved set.

---

## Item 6 — Booking table legend: dark-mode correctness

### Essence
The booking availability legend is correctly coloured in light mode but wrong in dark mode — specifically the green swatch: the table cell darkens correctly in dark mode but the **legend swatch doesn't follow**.

### Current state
- Availability legend swatches (`.swatch-available` etc.) use hardcoded hex (e.g. `#d1fae5` green) in `style.css`. The table cells have `[data-theme="dark"]` overrides, but the legend swatches likely have **no dark-mode override**, so they keep the light-mode colour while the cells darken — a mismatch.

### Changes
1. **CSS** (`style.css`): add `[data-theme="dark"]` overrides for the legend swatches so each swatch matches its corresponding cell colour in dark mode (available green, unavailable grey, booked yellow). Simplest robust fix: drive both the cell and the swatch from the **same CSS variables** so they can never diverge again.
2. **Refactor to variables**: define `--slot-available`, `--slot-unavailable`, `--slot-booked` (+ dark-mode values) in `:root`/`[data-theme="dark"]`, and point both the `.slot-cell.*` rules and the `.swatch-*` rules at them. This removes the class of bug entirely rather than patching one swatch.
3. **Verify** all three states (and any hover states) match cell↔legend in both themes.

### Notes
- Prefer the variable-driven refactor over a one-off dark override — it's the same amount of work and prevents the next teammate from re-introducing the drift.

---

## Item 13 — Consultation progress bar

### Essence
A clean, subtly-animated progress bar for a student's booked consultation, with stages: **booked → confirmed → meeting today → in progress → complete**. Nice simple animations; when it first reaches complete (first view since completion) it can have a small celebratory beat, but nothing flashy.

### Current state
- Persisted statuses: only `Pending`, `Confirmed`, `Completed`, `Cancelled`. **No "In Progress" or "today" state exists.**
- Appointment has `Time`; the join window logic already reasons about `Time` vs now (`isWithinJoinWindow`).

### Changes
1. **Derive stages client-side** (no schema change) from `Status` + `Time` vs now:
   - **Booked** = `Pending`.
   - **Confirmed** = `Confirmed` and slot is in the future (not today).
   - **Meeting today** = `Confirmed` and the slot is today but not yet within the join window.
   - **In progress** = `Confirmed` and now is within `[Time-15m, Time+60m]` (reuse the Phase-28 window constants).
   - **Complete** = `Completed`.
   - **Cancelled** = render a distinct terminated state (greyed bar), not part of the linear progression.
2. **Component**: a horizontal stepper (5 nodes + connecting bar) rendered on the student appointments view (`views/consultations/index.ejs`) for active (non-cancelled) appointments, and optionally on the confirmation page. Reusable partial `views/partials/consult-progress.ejs` taking the appointment.
3. **Animations** (simple/clean): the fill bar animates its width via CSS transition when the stage advances; the active node gets a soft pulse; a subtle checkmark draw on completed nodes. Respect `prefers-reduced-motion`.
4. **"First view since complete" beat**: when a `Completed` appointment's progress is viewed for the first time, play a one-time gentle completion animation. Track "seen" in `localStorage` keyed by appointment ID so it only celebrates once. Keep it understated (a single fill+check, no confetti).
5. **Keep it derived + defensive**: since "today/in-progress" are computed from `Time`, compute them in a small helper (server-passed booleans or client JS) — do NOT add a DB status unless a future feature truly needs a persisted "in progress".

### Notes / decisions
- Deliberately **no new DB status** — "today" and "in progress" are ephemeral, time-derived states; persisting them would require a scheduler to flip them. Deriving on render is correct and simpler.
- Cancelled is shown as a separate terminal style, outside the 5-step flow.

---

## Item 15 — Nearest-hospital locator: make it just work

### Essence (revised — user gave full latitude)
When Tier 3 triggers: correctly use the student's location → find the genuinely nearest ER → give a Google Maps link that opens to the **right place**. Do whatever's needed to make this reliable. Not just an audit — fix it properly.

### Current state (from audit)
- Client-side in `recommendations.ejs`, only when `maxTier >= 3`. 5 hardcoded ER hospitals with lat/lon. `haversine()` is the standard, correct formula. Sorts ascending, shows nearest + rest.
- **Two real defects:**
  1. **Directions link searches by NAME string** (`?query=NAME, Gqeberha`) — relies on Google's text search resolving the name, which can land on the wrong place. This is the current workaround Phase 27 fell back to *because* the earlier coord-only `dir/?destination=<lat>,<lon>` link "landed on wrong spots."
  2. Geolocation has **no `maximumAge`**, and denial/timeout **silently** falls back to campus coords.

### Root cause of the "wrong spot" problem + the definitive fix
Per Google's Maps URLs docs: a raw `destination=<lat>,<lon>` opens a *coordinate* (can drop you on a road midpoint, not the hospital entrance), and a name `query=` relies on fuzzy text geocoding (can mis-resolve). The **reliable** approach is to pin the exact place with a **`destination_place_id`** — a Google Place ID is uniquely explicit and resolves to the exact hospital. *(Google docs, rephrased for licensing compliance.)*

**Decision — use all three, layered for robustness:**
```
https://www.google.com/maps/dir/?api=1
  &destination=<lat>,<lon>            ← geographic anchor (always present)
  &destination_place_id=<placeId>     ← pins the EXACT hospital (primary resolver)
```
Google prioritises the place_id when present, so this opens directly to the correct hospital with turn-by-turn from the user's location; the coords are a graceful fallback if a place_id is ever missing.

### Changes
1. **Fact-check + enrich the hospital list** during implementation: for each of the 5 ERs, verify the coordinates against Google Maps AND capture its **Place ID** (via a Maps search / Place ID finder). Store `{ name, lat, lon, address, phone, placeId }` per hospital in the view's `HOSPITALS` array. Fix any transposed/wrong lat-lon found.
2. **Directions link** → build the layered `dir/?api=1&destination=<lat>,<lon>&destination_place_id=<placeId>` URL. Same format for the nearest-hospital button and the "other hospitals" list links. Drop the name-`query` approach entirely.
3. **Location detection** → request via item 16's `ensureLocation()` so permission is usually already granted by the time Tier 3 renders; then `getCurrentPosition` with `{ enableHighAccuracy:true, timeout:10000, maximumAge:60000 }`. If we already captured the student's pin-drop lat/lng (they set one at registration), we can even use that as an instant, no-prompt starting point and refine with live GPS if available.
4. **Visible states**: "📍 Using your current location" on success; on denial/timeout a clear "Couldn't get your location — showing hospitals nearest campus. Call 10177 (ambulance) if unsure." plus a **"Retry location"** button.
5. **Verify nearest-selection** with a few manual test points (campus, Central/Korsten, Walmer) — confirm the sort returns the truly closest ER.
6. Keep the hardcoded list (right call for an emergency — no external API dependency at the moment of crisis). Add a comment noting coords/place_ids were verified on {date}.

### Notes
- The layered `place_id` link is the crux — it's why this will open to the correct hospital where Phase 27's coord-only and name-only attempts both failed.
- Student pin-drop lat/lng as a fallback origin is a nice touch: even if live GPS is denied, we can still compute "nearest to where you live" rather than "nearest to campus."

---

## Item 16 — Permission prompts (scoped)

### Essence (revised — narrowed by user)
Just make the browser **ask** for the permissions we need, at the right moment, so users don't have to dig through site settings to enable them manually. Two concrete flows only:

1. **Camera & microphone** — ask on the student's **first online consultation** (when they open the call), if not already granted.
2. **Location** — ask **on login/first load**; if we don't already have it, ask again each time they log on (until granted or the browser hard-blocks it).

**Explicitly OUT of scope** (dropped from the earlier over-broad version): no cookie-consent banner, no site-wide permission-state UI/indicators, no elaborate pre-prompt system. Keep it minimal.

### Current state (root of the "buggy" feel)
- **Notifications**: `Notification.requestPermission()` fires on script load — eager and contextless. (Not part of this scope, but we'll stop it firing on unrelated pages as a side cleanup.)
- **Geolocation**: fires immediately inside the Tier-3 IIFE only; nothing asks on general login.
- **Camera/mic**: requested by the Daily iframe on call join (Permissions-Policy already delegates to the Daily origin — fixed in Post-Phase-28). So the browser *will* ask on join; the issue is just that it's unexpected.

### Changes
1. **Small shared helper** `public/js/permissions.js` (lightweight — no big framework):
   - `ensureLocation()` — checks current geolocation permission via `navigator.permissions.query({name:'geolocation'})` where available; if state is `granted`, do nothing; if `prompt`, trigger `navigator.geolocation.getCurrentPosition(...)` so the browser shows its native ask; if `denied`, do nothing (browser won't re-prompt — don't nag with broken calls). Feature-detect and degrade gracefully where the Permissions API is absent (just attempt `getCurrentPosition`).
   - Keep it resolve/reject clean so callers can react.
2. **Location on login/first load**:
   - Run `ensureLocation()` once per session after login (e.g. on the dashboard `/` load, guarded by a `sessionStorage` flag so it asks once per login session, and re-asks on the next login since sessionStorage clears). This satisfies "ask on first load; if we don't have it, ask again next time they log on."
   - We are only **prompting** here so the permission is granted ahead of time — we don't have to *store* the coordinates unless a feature needs them. (The Tier 3 locator will then already have permission when it needs it.)
   - If already `granted`, silent. If `denied`, silent (respect the user's choice; the browser blocks re-prompts anyway).
3. **Camera/mic on first online consultation**:
   - On `views/consultations/call.ejs`, before/at Daily join, if `navigator.permissions.query({name:'camera'})` (and `microphone`) reports `prompt`, let the Daily join trigger the native ask (it already does). Add a one-line readiness note ("Your browser will now ask for camera & microphone access — please Allow") so it's expected, not a surprise. No custom getUserMedia needed — Daily handles the actual capture; we just ensure the ask happens and isn't blocked.
4. **Side cleanup**: stop `notifications.js` from calling `Notification.requestPermission()` eagerly on every page load (it's the noisiest offender). Leave notification permission as-is otherwise — it's not in this item's scope, but removing the contextless prompt is a free win.
5. **Secure-context note**: geolocation + camera/mic require HTTPS in production (localhost is exempt) — one comment in the helper.

### Notes / decisions
- **Minimal by design.** Two prompts (location on login, cam/mic on first call). No cookie banner, no permission dashboards.
- Use the Permissions API only to **avoid re-prompting when already granted/denied** — that's the fix for the "buggy" feeling. Where it's unsupported, fall back to just attempting the request.
- Don't fight the browser: once a user hard-denies, we don't loop prompts — we just proceed with the existing graceful fallback (campus coords for the locator; Daily shows its own device-blocked message for calls).

---

## Phase 29C verification checklist

- **Nurse profile page**: `/staff/:staffNumber` shows public info only (no phone/email/address), all approved reviews, working filters/sort; booking "see more" deep-links to it; `/staff` cards link to it.
- **Legend dark mode**: available/unavailable/booked swatches match their cells in both light and dark themes; driven by shared variables.
- **Progress bar**: correct stage derived for Pending/Confirmed(future)/today/in-window/Completed; cancelled shown distinctly; animations smooth + reduced-motion respected; completion beat fires once per appointment.
- **Hospital locator**: coords + Place IDs verified per hospital; directions link uses `destination` + `destination_place_id` and opens to the CORRECT hospital (not a road/mis-geocode); nearest-selection correct on test points; geolocation via `ensureLocation()` with maximumAge + visible denial state + retry (+ optional pin-drop fallback origin); renders only for Tier 3.
- **Permissions (scoped)**: location is requested on login/first-load once per session (re-asks next login if not granted); camera/mic prompt happens on the first online consultation with a readiness note; Permissions API used only to skip re-prompting when already granted/denied; eager on-load notification prompt removed; NO cookie banner / NO permission dashboard (out of scope).
- App boots clean; Phase 28 video join still works; Tier 3 flow still functions end to end.
