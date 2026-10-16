# Phase 17: UX Refinement, Bug Fixes & Final Polish

---

## Group A: Critical Compliance & Core Fixes

### 17.1 — Remove ALL Dosage/Medical Advice from Medication Data
- **CRITICAL**: We must NEVER recommend dosage. This is legally not allowed.
- Strip ALL dosage instructions from `seedData.json` Medication `Description` fields
- Keep only: medication brand name + what symptoms it treats
- Remove "Take 2 tablets every 6 hours", "15ml every 6 hours", "2 puffs as needed" etc.
- Update `views/student/recommendations.ejs`: remove the Description display entirely or replace with just the medication name
- Add a footer disclaimer: "Always consult a healthcare professional before taking any medication."
- Audit `symptomModel.js` query — ensure no dosage data is returned to frontend

### 17.13 — Login: Preserve ID on Failed Attempt
- When login fails, the page re-renders with both fields empty — user has to retype their ID
- Fix: pass `idNumber` back in `res.render('auth/login', { error, idNumber })` from `handleLogin`
- Update `views/auth/login.ejs`: set `value="<%= typeof idNumber !== 'undefined' ? idNumber : '' %>"` on the ID input
- Password field stays empty (security — never pre-fill passwords)

---

## Group B: Dark Mode Fixes

### 17.2 — Dark Mode on Sign-In Page
- Auth pages use `auth-header.ejs` / `auth-footer.ejs` which don't include `darkmode.js`
- Add `<button class="theme-toggle" id="themeToggle"></button>` to `auth-footer.ejs`
- Add `<script src="/js/darkmode.js"></script>` to `auth-footer.ejs`
- The `[data-theme="dark"] .auth-page` rule already exists in CSS — verify it covers all auth elements

### 17.3 — Dashboard Heading Dark Mode Fix
- `.page-header h1` uses `color: var(--primary-navy)` which stays dark navy in dark mode
- Fix: change to `color: var(--text-dark)` which swaps to light in dark mode
- Same for `.page-header .subtitle` — currently `var(--text-muted)` which does swap, but double-check
- Also check `.content-card h2` border colour in dark mode

### 17.8 — Dark Mode: Full Text Readability Audit
- Walk through every page in dark mode and identify any remaining hard-to-read text
- Key targets:
  - `.text-muted` — should be `#94a3b8` in dark (already set, but verify all usages)
  - Table body text — ensure it inherits `var(--text-dark)`
  - Form labels — verify `color: var(--text-dark)` applies
  - `.profile-details .detail-label` and `.detail-value`
  - Legend text (map legend, availability legend)
  - Card descriptions / subtitles
  - `.sidebar-sublink` text
  - `select` dropdown text inside forms
- Any hardcoded `#0F172A` or `#1e293b` on text elements needs a dark mode override
- Ensure chart legend text is readable (Chart.js may need `color` option in dark mode)

---

## Group C: Sidebar & Layout

### 17.4 — Sidebar Collapsed: Logo Cuts Off
- The 70px gold circle gets clipped by `overflow: hidden` on `.sidebar` when collapsed to 68px
- Fix approach: in `.sidebar.collapsed .sidebar-logo`, scale down to 40px width/height
- Add transition for smooth shrink: `transition: width 0.3s, height 0.3s`
- Keep `overflow: hidden` on sidebar (prevents label text from bleeding)

### 17.5 — Sidebar: Wider + Bigger Icons
- Change `--sidebar-width` from `240px` to `260px`
- Change `--sidebar-collapsed` from `68px` to `72px` (accommodate slightly larger icons)
- Increase `.sidebar-icon` from `font-size: 1.2rem` to `1.4rem`
- Increase `.sidebar-icon` `width` from `24px` to `28px`
- Increase `.sidebar-link` padding from `10px 12px` to `12px 14px`
- Increase `.sidebar-label` font-size from `0.88rem` to `0.92rem`

### 17.9 — Sidebar Bug: Duplicate "Health Trends" at Bottom
- Nurse sidebar shows "Health Trends" link twice
- Cause: likely a copy-paste leftover in `navbar.ejs` nurse section
- Fix: find and remove the duplicate `<a href="/trends"` in the nurse block
- Verify: only ONE Health Trends link appears for nurses after fix

### 17.12 — Admin Sidebar Dropdown: Arrow-Only Click
- Currently the entire `.sidebar-expandable` link text triggers the dropdown — this blocks navigation
- Restructure: the main `<a>` tag navigates to the page normally
- The arrow `<span class="sidebar-arrow">` becomes its own clickable element (e.g., a `<button>`)
- Clicking the arrow toggles the submenu, clicking the text goes to the page
- Make the arrow larger: `font-size: 1rem`, `padding: 4px 8px`, `cursor: pointer`
- Fix sub-link anchor targets: add `scroll-margin-top: 80px` to anchored sections so they don't jump behind the topbar

---

## Group D: UX Polish & Visual Refinement

### 17.6 — Topbar: Time-Aware Greeting
- Replace static "Welcome, [Name]" with contextual greeting based on current hour
- Logic (client-side JS or server-side in controller):
  - 00:00–04:59: "[FirstName]? It's late — take care!"
  - 05:00–11:59: "Good morning, Mr/Ms [Surname]"
  - 12:00–17:59: "Good afternoon, [FirstName]"
  - 18:00–23:59: "Good evening, [FirstName]"
- For admin: show just "System Administrator" — no time greeting
- Implementation: server-side in `app.js` middleware that sets `res.locals.greeting` before every render
- Requires: store `firstName` and `lastName` separately in `req.session.user` (currently only `name`)
- Update session creation in `authController.handleLogin` to include `firstName` and `lastName`

### 17.7 — Map Controls Overlap Topbar
- Leaflet's default zoom controls render at top-left of the map container
- When the map is near the top of the page, the +/- buttons overlap or sit behind the fixed topbar
- Fix: initialize map with `zoomControl: false` then add manually:
  ```js
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  ```
- This moves them to the bottom-right corner of the map tile area — clear of the topbar

### 17.10 — Student: Rate Button in Appointment Rows
- Currently the rating form is a separate section below the table — easy to miss
- Add a "Rate" button directly in the Actions column for completed, un-rated appointments
- Button is an anchor link that scrolls to the rating form: `<a href="#ratingForm">Rate</a>`
- Style as `btn btn-success` (small, inline)
- Add `id="ratingForm"` to the rating form section
- Auto-select that appointment in the dropdown when the anchor is clicked (bonus: JS pre-select)

### 17.11 — Booking Grid: Consistent Legend with Nurse Grid
- Student booking page says "Green = available. Gray = unavailable or already booked." (plain text)
- Nurse availability page uses proper coloured swatches in a `.availability-legend`
- Unify: use the same swatch-based legend component on both pages
- Legend items: Available (green swatch), Unavailable (gray swatch), Booked (gold swatch — if applicable)
- For student booking grid, show: Available (green), Unavailable/Booked (gray), Your Selection (cyan)

### 17.15 — Admin Appointments Chart: Smooth Line Graph
- Replace `type: 'bar'` with `type: 'line'` in admin reports Chart.js config
- Add: `tension: 0.4` for smooth curves between points
- Add: `pointRadius: 4`, `pointBackgroundColor: '#0ea5e9'` for small visible nodes
- Add: `fill: true`, `backgroundColor: 'rgba(14, 165, 233, 0.1)'` for subtle area fill
- Add: `borderColor: '#0ea5e9'`, `borderWidth: 2`
- Keep the same data source (last 14 days)

### 17.16 — Pie Chart Legend: Full Block Width
- Remove `max-width: 400px; margin: 0 auto` from the chart container
- Use a flexbox layout: chart canvas on the left (50-60%), legend on the right (40-50%)
- Chart.js config: `plugins.legend.position: 'right'`
- Increase legend font size slightly for readability
- On screens < 640px: stack vertically (legend below chart)
- Ensure legend labels are fully visible (no truncation)

---

## Group E: New Features

### 17.14 — CSV Export for Health Trends / Reports (Nurse + Admin)
- **Admin Reports CSV** (`GET /management/admin/reports/export-csv`):
  - Exports all appointments as CSV: AppointmentID, Type, Date, Time, Student, Nurse, Status
  - Set headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="report.csv"`
  - Build CSV string server-side from DB query, stream as response
  - Add "Export CSV" button on admin reports page (next to the chart)
- **Health Trends CSV** (`GET /trends/export-csv`):
  - Exports zone symptom data: Zone, Symptom, Count, Period
  - Only accessible to nurse and admin roles (requireAuth + role check)
  - Add "Export CSV" button on trends dashboard
- Button styling: secondary/outline style, small, positioned in card header area

### 17.17 — Loading States (Spinners)
- When AJAX loads the booking grid (after nurse selection): show a spinner/loading indicator
- When the map data fetches: show "Loading map data..." placeholder
- When notification API polls: no spinner needed (background task)
- Implementation: a simple CSS spinner class `.loading-spinner` (border animation)
- Show spinner in the target container, hide when data arrives
- Apply to: booking grid container, map container, and availability grid on save

### 17.18 — Empty State Illustrations
- Pages that can be empty need a friendlier state than just "No data":
  - My Appointments (no appointments yet): icon + "Book your first consultation" CTA
  - Symptom History (no logs yet): icon + "Use the symptom checker to get started"
  - Admin students/nurses (empty after delete): icon + "No records found"
  - Nurse dashboard (no appointments): icon + "No patients scheduled"
- Use large emoji icons or simple SVG line drawings (no external library needed)
- Each empty state includes a clear call-to-action button

### 17.19 — Session Timeout Warning
- Express sessions expire after 1 hour (`maxAge: 3600000`)
- Add client-side JS that tracks time since page load
- At 55 minutes: show a toast/banner "Your session expires in 5 minutes"
- Include a "Stay logged in" button that makes a lightweight AJAX request to refresh the session
- Route: `GET /auth/refresh-session` — just responds 200 (touching the session extends it)
- If user ignores: session expires naturally, next request redirects to login
- Toast auto-dismisses after 30 seconds if user doesn't interact

### 17.20 — Appointment Confirmation Summary
- After a successful booking POST (`handleBooking` → redirect), show a confirmation page
- Instead of redirecting straight to `/consultations/my-appointments`, redirect to `/consultations/confirmed/:id`
- New route + view: `views/consultations/confirmed.ejs`
- Shows: appointment type, nurse name, date + time slot, Teams link (if online)
- Green success banner: "Appointment booked successfully!"
- Action buttons: "View All Appointments", "Book Another", "Back to Dashboard"

### 17.21 — Nurse: View Patient Symptom History
- When a nurse views their dashboard appointments, add a "View History" link per patient
- Route: `GET /management/nurse/patient/:studentNumber/history`
- Controller fetches that student's SymptomLog entries + medical history
- View: `views/nurse/patient-history.ejs` — shows student name, medical history, and symptom timeline
- Only accessible by nurses (requireNurse)
- Linked from the nurse dashboard table (per appointment row)

### 17.22 — Print-Friendly Report (Admin)
- Add a "Print Report" button on admin reports page
- Triggers `window.print()` with a dedicated print stylesheet
- `@media print` CSS rules: hide sidebar, topbar, buttons, footer
- Only show: metrics cards, charts, tables
- Clean white background, compact layout for paper

### 17.23 — Responsive Mobile Sidebar (Drawer)
- On screens < 768px:
  - Sidebar becomes a hidden drawer (off-screen left)
  - A small hamburger/menu icon appears in the topbar (mobile only)
  - Clicking it slides the sidebar in as an overlay
  - Semi-transparent backdrop behind sidebar
  - Clicking backdrop or a link closes the drawer
- Preserve desktop behaviour on wider screens (fixed sidebar with collapse)
- Use CSS `transform: translateX(-100%)` for hidden state, `translateX(0)` for visible
- Backdrop: `position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999`

---

## Execution Groups

### Group A: Critical
- 17.1 Remove dosage advice
- 17.13 Preserve ID on failed login

### Group B: Dark Mode Fixes
- 17.2 Dark mode on auth pages
- 17.3 Dashboard heading fix
- 17.8 Full dark mode text audit

### Group C: Sidebar & Layout
- 17.4 Logo clips when collapsed
- 17.5 Wider sidebar + bigger icons
- 17.9 Duplicate Health Trends link removal
- 17.12 Admin arrow-only dropdown

### Group D: UX Polish
- 17.6 Time-aware greeting
- 17.7 Map zoom controls position
- 17.10 Rate button in appointment rows
- 17.11 Consistent grid legends
- 17.15 Line graph (replace bar chart)
- 17.16 Pie chart legend uses full block width

### Group E: New Features
- 17.14 CSV export for trends/reports
- 17.17 Loading states (spinners)
- 17.18 Empty state illustrations
- 17.19 Session timeout warning
- 17.20 Appointment confirmation summary
- 17.21 Nurse: view patient symptom history
- 17.22 Print-friendly admin report
- 17.23 Responsive mobile sidebar drawer
