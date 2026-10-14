# Plan 1 — General & Shared UI

## Problem Statement
A final polish pass across CampusCare. This plan covers the six shared/general UI changes
that touch auth pages, the home page, clinic naming, the role indicator, language removal,
and the global "appointment/booking → consultation" terminology rename. All changes leverage
the existing Express/EJS/MySQL + vanilla-JS architecture.

## Global Constraints
- **UI-only terminology rename:** only EJS visible text and UI labels. Never rename the
  `Appointment` table, its columns, `appointments.*.js`, routes, or JS variable/function names.
- No new client libraries, no build step, no server-side PDF lib.
- Use tokens from `ui-design.md`; no hardcoded colours/shadows/radii/spacing.
- Verify each change in light + dark mode, reduced-motion where relevant, and with no console
  errors. Restart `node src/app.js` (kill stale node on port 3000 with
  `Stop-Process -Name node -Force`) to test.

## Architecture Notes (grounded in current code)
- The app uses a domain-module layout under `src/modules/`, not flat
  `controllers/models/routes`.
- Auth pages use `views/partials/auth-header.ejs` + `auth-footer.ejs` (no sidebar/navbar).
- Authenticated pages use `views/partials/header.ejs` + `navbar.ejs` + `footer.ejs`.
- `user` (with `user.role`, `user.firstName`, `user.lastName`, `user.name`) is passed to
  every authenticated view.
- Icons are inlined SVG via `views/partials/icon.ejs` (a `name -> SVG` map), inheriting
  `currentColor`.
- Clinics are seeded in `src/config/states/state-naked.js`; `state-showcase.js` and
  `state-outbreak.js` both call `loadNakedState()`, so clinic seed data is centralized there.
- There is **no** existing floating identity chip / "logged in as" indicator; the only
  floating control today is the bottom-right theme toggle (`navbar.ejs`), plus the mobile
  menu button.

---

## Item 1 — Password Visibility Toggle (E100 / C100)

**Target files**
- `views/auth/login.ejs` (password input, ~line 23)
- `views/auth/register.ejs` (password input, ~line 35)
- `views/auth/reset-password.ejs` (optional — both new-password fields, for consistency)
- `public/css/style.css` (new `.pw-field` / `.pw-toggle` styles)
- `views/partials/icon.ejs` (add `eye` and `eye-off` Lucide SVG keys)
- `views/partials/auth-footer.ejs` (optional: shared toggle `<script>` so login + register
  reuse one implementation)

**Implementation Steps**
1. In `icon.ejs`, add two keys to the `_icons` map: `eye` and `eye-off` (Lucide MIT line
   icons, `viewBox="0 0 24 24"`, `fill="none" stroke="currentColor"`, matching the existing
   icon style so they inherit theme colour).
2. Wrap each password `<input>` in a positioned container:
   `<div class="pw-field"> <input ... /> <button type="button" class="pw-toggle"
   aria-label="Show password" aria-pressed="false">…eye icon…</button> </div>`.
   Keep the existing `id`, `name`, `required`, `minlength`, and `autocomplete` attributes on
   the input unchanged.
3. Add a small shared script (prefer `auth-footer.ejs` so login + register + reset reuse it):
   on toggle click, flip the input `type` between `password` and `text`, swap the icon
   (`eye` ↔ `eye-off`), and update `aria-label` ("Show password" ↔ "Hide password") and
   `aria-pressed`. Query by `.pw-toggle` and operate on the sibling input so it works for
   multiple fields on one page (reset-password has two).
4. CSS: `.pw-field { position: relative; }`, input gets right padding to clear the button;
   `.pw-toggle` is absolutely positioned inside the field (vertically centered), transparent
   background, `color: var(--text-muted)`, `:hover` → `var(--text-dark)`, and a brand-yellow
   `:focus-visible` ring using existing tokens. No hardcoded hex.

**Verification**
- On login and register, clicking the eye reveals/hides the password and swaps the icon.
- Keyboard operable: Tab to the button, Enter/Space toggles; `aria-pressed` and `aria-label`
  update.
- Works in light and dark mode; no console errors; form still submits normally.

---

## Item 2 — Home as "About Us" Page

**Target files**
- `views/index.ejs`
- Confirm the render route in `src/app.js` (renders `index` with `user` and, for students,
  `appointments`).

**Implementation Steps**
1. Keep the role-aware greeting hero (`.dash-hero--bare`, `#dashboardGreeting`) and, for
   students, the `consult-progress-section` include and the first-use welcome card
   (localStorage-dismissed).
2. Replace the per-role quad of navigation cards (which merely duplicate the sidebar links)
   with an **"About CampusCare"** informational section describing the Three-Tier Healthcare
   Strategy:
   - **Tier 1 — Self-Care & Automated Support:** symptom checking, OTC recommendations,
     campus health-trend mapping.
   - **Tier 2 — Nurse Consultations:** 15-minute in-person or online consultations,
     availability grids, reviews.
   - **Tier 3 — Clinical Escalation & Administration:** nurse scheduling, progress tracking,
     admin moderation, reporting.
3. Use `layout-dashboard` with the hero + a responsive glass `.content-card` per tier
   (`repeat(auto-fit, minmax(260px, 1fr))` grid — do not force a 2-col grid). Use `.reveal`
   for entrance motion.
4. Keep terminology "consultation" (coordinate with Item 6). Do **not** add new navigation —
   the sidebar already provides it. The content is informational, not a link hub.

**Verification**
- Home renders the About content for student, nurse, and admin with no broken links.
- Student progress bar + welcome card still work.
- Responsive and themed (light/dark); reduced-motion respected; no console errors.

---

## Item 3 — Clinic Naming Convention

**Target files**
- `src/config/states/state-naked.js` (the two `INSERT INTO Clinic` rows, ~lines 41–48)
- Audit `state-showcase.js` / `state-outbreak.js` (they call `loadNakedState()` — no separate
  clinic inserts expected, but confirm).
- Display sites already read `Clinic.Name` (`views/profile/view.ejs`,
  `views/admin/nurse-form.ejs`, `views/admin/nurses.ejs`) — they inherit the fix.

**Implementation Steps**
1. In `state-naked.js`, rename the seeded clinic `Name` values to include "Clinic":
   `'South Campus'` → `'South Campus Clinic'`, `'North Campus'` → `'North Campus Clinic'`.
   Leave `RegNum`, `Address`, `TelephoneNumber`, `Email` unchanged.
2. **Do not** change `CAMPUSES` in `src/constants.js` — those are *campus* names used for nurse
   campus assignment (e.g. the nurse-form Campus dropdown), not clinic names.
3. Clinic names come from seed data, not migrations, so apply by reloading a DB state:
   `npm run state:naked` (or `state:showcase`).

**Verification**
- After reloading a state, the nurse profile "Clinic" detail row and the admin nurse
  "Assigned Clinic" dropdown show "… Clinic".
- Campus labels (nurse Campus dropdown, profile Campus row) are unchanged.

---

## Item 4 — Logged-in Role Indicator

**Target files**
- `views/partials/navbar.ejs` (authenticated branch — add a floating identity/role control)
- `public/css/style.css` (identity/role chip styles)
- Uses `user.role` (and optionally `user.firstName`/`user.lastName`) already in scope.

**Implementation Steps**
1. Add a small **glass identity chip** rendered only when the user is authenticated. Content:
   "Logged in as `<Role>`" with the role capitalized (`Admin` / `Nurse` / `Student`).
   Optionally include initial + surname per the FSSB header pattern
   (e.g. "T. Rusike — Student"), derived from `user.firstName`/`user.lastName`.
2. Position it as a **floating glass control top-right** (consistent with the Phase 30B shell
   direction). Use `--glass-bg-strong`, `--glass-blur-strong`, `--glass-border`,
   `--glass-shadow`, `--radius-glass`. Give it an `aria-label`.
3. Ensure it does **not** collide with the existing bottom-right theme toggle or the top-left
   mobile menu button. On mobile, either hide the chip or dock it so it never overlaps the
   menu/theme controls.
4. Keep it out of the auth pages (auth uses `auth-header.ejs`, which has no navbar — so adding
   it in `navbar.ejs` naturally excludes auth).

**Verification**
- Each role sees the correct label on authenticated pages; it is absent on login/register.
- Themed (light/dark); mobile layout doesn't overlap the menu/theme controls; no console
  errors.

---

## Item 5 — Remove Language Selection (B200)

**Target files**
- `views/consultations/book.ejs`:
  - Remove the `#stepLanguage` block (~lines 120–141) and its heading "4. Preferred Language
    for Video Consultation".
  - Remove `languageSelect` references, the `languageSelect` `change` handler (~line 287),
    the step-4 title logic (~line 195), and the `required` toggling on `languageSelect`
    (~lines 226, 232).
  - **Rewire the Online path** so submit enables after slot selection, exactly like Physical:
    in the `if (!isPhysical)` branch (~line 398) drop the "show language step / wait for
    language" logic and enable submit once a slot is chosen; update `hideFromStep`
    (~lines 199–216) to stop hiding/clearing `stepLanguage`.
- `src/modules/appointments/appointments.controller.js` (`handleBooking`, ~lines 88–136):
  - Drop `preferredLanguage` from the destructure (~line 88).
  - Remove the mandatory-language 400 branch (~lines 106–112).
  - Remove `preferredLanguage` from the booking payload (~line 133).
- `src/modules/appointments/appointments.model.js` (`atomicBookSlot`, ~lines 34–58):
  - Keep writing the `PreferredLanguage` column as `NULL` (either drop the param and hardcode
    `null`, or keep the param and always pass `null`). **Do not** alter the column list in a
    way that changes the DB schema.
- `src/modules/nurse/nurse.controller.js` (~line 70): remove `preferredLanguage: 'English'`
  from its booking call.
- Leave the `PreferredLanguage` DB column in place (unwritten) to avoid a migration.

**Implementation Steps**
1. Remove the UI step and all client wiring in `book.ejs`; make Online enable submit once a
   slot is selected (mirror the Physical branch).
2. Stop reading/writing `preferredLanguage` in both controllers; the model writes `NULL`.
3. Grep the whole repo for `language`, `preferredLanguage`, `PreferredLanguage`, `stepLanguage`
   and remove any remaining **UI** references (keep the DB column name intact where it only
   appears as a column identifier).

**Verification**
- Online booking completes with no language step; submit enables after slot pick.
- A booked appointment inserts with `PreferredLanguage = NULL`.
- Physical flow unaffected; no console or server errors.

---

## Item 6 — Global UI Terminology → "Consultation"

**Target files (user-facing text only)**
- `views/index.ejs` — card titles/links ("My Appointments", "Book Appointment",
  "View Appointments", "Book a Consultation" — currently mixed). (If Item 2 replaces the card
  grid, apply only to any remaining visible copy.)
- `views/consultations/index.ejs` — `<h1>My Appointments</h1>`, kebab items, empty-state
  "Book Your First Appointment", "Rate Your Consultation" modal title, the
  "Cancel this appointment?" confirm text.
- `views/consultations/book.ejs` — submit "Book Appointment" (see Item 8), heading
  "Book a Consultation" (already fine).
- `views/consultations/confirmed.ejs` — "Book Another", "View All Appointments".
- `views/consultations/review.ejs`
- `views/nurse/dashboard.ejs`
- `views/partials/nurse-appt-row.ejs`
- `views/partials/consult-progress.ejs` / `consult-progress-section.ejs`
- `views/admin/reports.ejs` — "Appointments by Type", "Total Appointments",
  "All Consultation Ratings" (keep analytics labels clear, e.g. "Consultations by Type").

**Implementation Steps**
1. Replace visible "appointment"/"booking"/"book" wording with "consultation" /
   "book a consultation" phrasing.
2. **Do NOT touch:** route paths (`/consultations/my-appointments`, `/consultations/book`),
   hidden input names (`appointmentId`, `_csrf`), JS identifiers (`appointmentId`,
   `openRatingModal`, `toggleApptMenu`), icon keys (`name: 'appointment'`), EJS variable names
   (`appointments`, `apt.AppointmentID`), or any SQL/DB field.
3. Work file-by-file: grep each EJS for `appointment`/`booking`/`book` and change only text
   nodes/visible labels, leaving code identifiers alone.

**Verification**
- Walk every page as each role; visible copy consistently says "consultation".
- All links, forms, and JS still function (kebab menus, rating modal, booking submit).
- `grep` confirms no DB/route/JS identifiers were altered.

---

## Suggested Execution Order
1. Item 3 (seed data — isolated).
2. Item 1 (auth pages — isolated).
3. Item 5 (booking language removal — self-contained flow).
4. Item 2 (home About page).
5. Item 4 (role indicator).
6. Item 6 (terminology sweep — do last so it also covers text added by Items 2/5/8).
