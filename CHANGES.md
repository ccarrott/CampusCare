# CampusCare — Development Changelog (Phases 3–28)

Full-stack university health platform built across the development phases below.

---

## Phase 3: Authentication & Session Management
- Created `src/config/database.js` with MySQL connection pooling
- Built `userModel.js` with parameterised query functions (findStudentById, createStudent)
- Implemented authentication controller with login/register/logout
- Created session security middleware (requireAuth, requireStudent, requireNurse, requireAdmin)
- Built auth views: `login.ejs`, `register.ejs`
- Mounted auth routes under `/auth`

## Phase 4: Student Profiles
- Implemented `updateStudentProfile` and `deleteStudentAccount` in userModel
- Built profile controller with view, edit, update, delete actions
- Created profile routes under `/profile`
- Built profile UI views: `views/profile/view.ejs`, `views/profile/edit.ejs`

## Phase 5: Symptom Checker & OTC Recommendations
- Created `symptomModel.js` with catalog query and relational JOIN for medications
- Built `symptomController.js` for rendering forms and evaluating recommendations
- Defined `symptomRoutes.js` mounted under `/symptoms`
- Created symptom selection form (`symptom-form.ejs`) with dropdown + severity selector
- Created recommendations view (`recommendations.ejs`) with medication details + clinical warnings

## Phase 6: Consultations, Ratings & Nurse/Admin Dashboards
- Created `appointmentModel.js` and `ratingModel.js`
- Built `appointmentController.js` handling physical and MS Teams online bookings
- Built `ratingController.js` with duplicate-check guard
- Registered consultation routes under `/consultations`
- Built booking form (`book.ejs`) and appointment list (`index.ejs`)
- Built `nurseManagementModel.js` and `adminReportModel.js`
- Implemented `nurseController.js` for schedule and Teams link management
- Implemented `adminController.js` for aggregate metric report rendering
- Defined `managementRoutes.js` with role-based middleware
- Built nurse dashboard (`nurse/dashboard.ejs`) and admin reports (`admin/reports.ejs`)
- Created `trendModel.js` for health data aggregation
- Built `trendController.js` and `trendRoutes.js` under `/trends`
- Created trends dashboard (`trends/dashboard.ejs`) with summary cards

## Phase 7: Database Migration & Auth Foundation
- Added Password, Email, ClinicID columns to Nurse/Admin tables
- Created SymptomLog table for per-student health tracking
- Added Status, Notes, CreatedAt to Appointment; StudentNumber to Rating
- Added FacilityID, ExpiryDate, StockQuantity to Medication
- Added Name, ClinicID to MedicalFacility
- Implemented bcrypt password hashing across all roles
- Built collapsible sidebar navigation (role-aware)

## Phase 8: Smart Authentication
- Auto-detect login (Student → Nurse → Admin, no role dropdown)
- Forgot/reset password flow with token-based links
- PasswordResetToken table with expiry and single-use enforcement
- Centered auth page layout (no sidebar on login/register)

## Phase 9: Dashboard & Layout
- 2x2 dashboard grid with role-specific cards and CTAs
- Auth layout separation (auth-header/auth-footer partials)
- Page header styling with subtitle support

## Phase 10: Nurse Availability System
- 27-slot weekly grid (15-min sessions, 20-min cadence, 08:00–16:40)
- Drag-to-paint Available/Unavailable with mouse
- Booked slot locking (gold cells, untouchable)
- Column header toggle, bulk actions, conflict warnings
- Real date headers showing next 5 weekdays
- NurseAvailability table with bulk insert/replace
- Availability API for booking form integration

## Phase 11: Browser Notifications
- Web Notification API integration (24h, 1h, start reminders)
- Permission request on first load, localStorage dedup
- Polls `/consultations/api/upcoming` every 5 minutes
- Notification controller with role-aware queries

## Phase 12: Symptom Data Overhaul
- 20 SA-relevant symptoms across 6 types (Systemic, Respiratory, Neurological, Gastrointestinal, Dermatological, Mental Health) and 3 tiers
- 15 OTC medications with SymptomMedication join mappings
- SymptomLog integration (every symptom check logged with severity + timestamp)
- Student symptom history page with severity badges
- Updated seedData.json with full realistic dataset

## Phase 13: Health Trend Mapping
- 8 real NMU/Gqeberha campus zones with GPS coordinates
- CampusZone + StudentZone tables with address-based auto-mapping
- 19 students with real Summerstrand/Newton Park/Central addresses
- Leaflet.js map centered on NMU South Campus (-33.9855, 25.6600)
- Circle markers (size = report count, colour = severity tier)
- Zone popups with aggregated symptom breakdown (top 3)
- Period-aware filtering (7d, 1m, 2m, 6m, 1y)
- Map data API (`/trends/api/map-data`) with JSON response
- Outbreak simulation seeder (`seed-outbreak.js`)
- Privacy-compliant: only aggregated data, no student identifiers exposed

## Phase 14: Admin CRUD
- Full student management (list, search, add, edit, delete)
- Full nurse management (list, add, edit, delete with clinic assignment)
- Cascade delete handling (related SymptomLog, StudentZone, Rating, Appointment records)
- Admin student/nurse form views with validation
- Enhanced admin reports with daily appointment counts

## Phase 15: Consultation Lifecycle
- Appointment status flow: Pending → Confirmed → Completed → Cancelled
- Student cancel + reschedule with ownership verification
- Nurse consultation notes per appointment
- Server-side double-booking prevention (nurse + time + not cancelled)
- Slot locking cascade (cancel frees slot, reschedule swaps)
- Booking grid with real-time nurse availability via AJAX API
- Appointment confirmation summary page (`confirmed.ejs`)

## Phase 16: Visual Polish
- Sidebar: 70px gold logo with glow, click-to-collapse (no burger icon)
- Dark mode toggle (sun/moon, localStorage, system preference detection)
- Chart.js doughnut for symptoms by category (period-aware from SymptomLog)
- Chart.js line graph for admin appointments over time (smooth curves, area fill)
- Input validation middleware: student number, email, password, phone formats
- XSS sanitisation on all text inputs (strip `<>`)
- Status badges (Pending/Confirmed/Completed/Cancelled)
- Severity badges (Low/Moderate/High)
- Consistent action buttons across tables (Join, Cancel, Rate, Confirm, Complete)
- Admin sidebar expandable submenus with arrow-only toggle
- Availability legend component (Available/Unavailable/Booked swatches)

## Phase 17: UX Refinement & Features
- Removed all dosage/medical advice from medication data (legal compliance)
- Added disclaimer: "Always consult a healthcare professional"
- Dark mode on auth pages (toggle + darkmode.js in auth-footer)
- Full dark mode text readability audit (20+ rule overrides)
- Time-aware greeting (morning/afternoon/evening based on hour, admin override)
- firstName/lastName stored separately in session for greeting logic
- Map zoom controls repositioned to bottomright (clear of topbar)
- Rate button inline in appointment table rows (links to #ratingForm)
- Consistent availability legends across booking + nurse grids
- CSV export: admin appointments (`/management/admin/reports/export-csv`)
- CSV export: health trends (`/trends/export-csv`)
- Loading spinners (CSS animation, shown during AJAX grid/map loads)
- Empty state illustrations with CTAs (appointments, history, dashboard)
- Session timeout warning at 55 minutes (toast + "Stay logged in" button)
- Session refresh route (`GET /auth/refresh-session`)
- Appointment confirmation summary page with full details
- Nurse patient history view (`/management/nurse/patient/:id/history`)
- Print-friendly admin reports (`@media print` hides chrome)
- Responsive mobile sidebar drawer (< 768px, transform slide, backdrop)
- Mobile menu button (hamburger, topbar-positioned)
- Login preserves ID number on failed attempt
- Duplicate Health Trends link removed from nurse sidebar

## Phase 18: Code Audit & Showcase Data
- Full codebase audit: models, controllers, routes, views, CSS, JS, middleware
- Removed dead code:
  - `createNurse` from userModel (superseded by adminCrudModel)
  - `getAppointmentsByStudent` from appointmentModel (superseded by WithStatus variant)
  - `getSymptomsByType` from trendModel (replaced by inline period-aware query)
  - `getAppointmentsForNurse` + `updateAppointmentType` from nurseManagementModel
  - `isFutureWeekday` from validation.js (never imported)
  - Unused `isValidPhone` import from adminCrudController
  - Duplicate `[data-theme="dark"] .content-card h2` CSS rule
  - Dead `.sidebar-toggle` CSS rule
- Created `seed-showcase.js`:
  - 40 appointments spread over 6 months (12 completed physical, 8 completed online, 12 confirmed, 6 pending, 2 cancelled)
  - 15 ratings with realistic descriptions (scores 3–5)
  - 80 symptom log entries (24 past 7 days, 24 past month, 32 past 2–6 months)
  - ~20 entries clustered in Central zone for outbreak demo
  - Uses `APT-SHOW-`, `RAT-SHOW-`, `SH-` prefixes for easy identification
- Renamed "CampusCare Hub" → "CampusCare" across all source files
- Fixed sidebar logo animation (smooth transition both directions)

## Phase 19: Review System, Appointment Table Normalisation & UX Polish
- Auto-expire past appointments (Pending/Confirmed past their time → auto-Cancelled on page load)
- Fixed booking redirect (confirmation page, not premature review page)
- Normalised student appointment table:
  - Rate button ONLY on Completed + unrated rows (opens star rating modal)
  - Join button ONLY when TeamsID exists + status is Confirmed
  - "Awaiting Link" disabled badge for Online without TeamsID
  - Cancel button only on Pending/Confirmed
  - Cancelled rows greyed (opacity 0.6)
  - Rated rows show "✓ Rated" badge
- Normalised nurse appointment table:
  - Pending: Confirm + Cancel
  - Confirmed: Complete + Cancel + Add Link (Online only)
  - Completed/Cancelled: no action buttons, cancelled rows greyed
  - Removed separate Teams Link Management section (inline button instead)
- Removed "Tier 1" / "Tier 2" text from student dashboard cards
- Fixed pie chart legend colour for dark mode
- Database migration: Added Bio + YearsExperience to Nurse, Verified + VerifiedAt to NurseReviews
- Star rating CSS component (interactive 5-star widget + static read-only variant)
- Rating modal overlay (replaces old bottom form section):
  - Opens from Rate button with nurse name + date pre-filled
  - Stars + optional comment + submit (POST /consultations/rate)
  - Close via X, backdrop click, or Escape key
- Nurse profile card in booking flow:
  - Fades in after nurse selection, before schedule grid
  - Shows name, years experience, bio, star average, recent approved reviews
  - "View full profile" link to /staff
- "Meet Our Staff" page (new module):
  - Sidebar link for students
  - 2-column card grid with all nurses
  - Shows bio, experience, approved anonymous reviews ("Patient 1, 2, 3...")
  - Only admin-approved nurse reviews visible
- Nurse dashboard rating summary card (average + count from all ratings)
- Admin moderation queue:
  - Pending nurse reviews table with Approve/Reject buttons
  - Only approved nurse reviews appear on public-facing pages
  - Per-consultation ratings are NOT moderated (go straight in)
- Nurse bio editor:
  - Edit Bio (300 char limit, live counter) + Years of Experience
  - Route: GET/POST /management/nurse/edit-bio
  - Sidebar link for nurses
- "Review a Nurse" page:
  - Dropdown of nurses with completed consultations (one review per nurse per student)
  - Star rating + written review required
  - Auto-links to most recent completed appointment with that nurse
  - Submitted reviews go to Pending → admin approves/rejects
- Lifecycle validation hardening:
  - Strict state transition rules (Pending→Confirmed/Cancelled, Confirmed→Completed/Cancelled, terminals reject all)
  - Rating submission verifies appointment is Completed + owned by student
  - Nurse patient history IDOR-protected (requirePatientRelationship middleware)

## Phase 20: Module-Based Architecture Conversion & Security Hardening
- Converted flat MVC to domain-based module architecture:
  - 11 modules: auth, profile, symptoms, appointments, availability, reviews, trends, nurse, admin, notifications, export, staff
  - Each module: `module.routes.js` + `module.controller.js` + `module.model.js`
- Created shared middleware layer:
  - `authenticate.js` — requireAuth
  - `authorize.js` — requireRole(...roles) composable
  - `ownership.js` — IDOR guards (requireAppointmentOwner, requireAssignedNurse, requirePatientRelationship)
  - `errorHandler.js` — global async error catcher + renderer
  - `validate.js` — isValidEmail, isValidScore, isValidStatus, etc.
- Created utils:
  - `catchAsync.js` — wraps async handlers, forwards errors
  - `AppError.js` — operational error class with statusCode
  - `sanitize.js` — single-source input sanitisation
  - `dates.js` — getUpcomingWeekDays, isWeekday
- Created config layer:
  - `environment.js` — validates required env vars (fail-fast on boot)
  - `session.js` — session middleware with secure cookie config (httpOnly, sameSite: lax)
  - `security.js` — security headers (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- Added `constants.js` (frozen enums: ROLES, APPOINTMENT_STATUS, APPOINTMENT_TYPE, SEVERITY)
- CSRF protection (session-based token):
  - Token generated per session, attached to res.locals for all views
  - Validated on all POST requests (except /api/ JSON endpoints)
  - Hidden input `_csrf` added to all 19+ POST forms
- Atomic booking transaction:
  - `atomicBookSlot()` uses SELECT...FOR UPDATE + transaction
  - Prevents race condition double-bookings
- Eliminated `rawQuery` export — all DB access via named model functions
- Merged redundant files:
  - `ratingController` + `nurseReviewController` → `reviews.controller.js`
  - `ratingModel` + `nurseReviewModel` → `reviews.model.js`
  - `adminController` + `adminCrudController` → `admin.controller.js`
  - `adminReportModel` + `adminCrudModel` → `admin.model.js`
- Split `userModel.js` → `auth.model.js` + `profile.model.js`
- Created `views/error.ejs` generic error page (403, 404, 500)
- Added 404 handler for unmatched routes
- Deleted old `src/controllers/`, `src/models/`, `src/routes/`, `src/middlewares/`
- XSS audit: all `<%-` usages verified as server-generated data only
- 3 new dependencies: `express-mysql-session`, `csrf-csrf`, `cookie-parser`


## Phase 23: Database States & Showcase Tooling
- Created database state management system with 4 states: naked, showcase, outbreak, clear-outbreak
- Browser console API: `CampusCare.showcase()`, `CampusCare.outbreak()`, `CampusCare.clear()`, `CampusCare.naked()`
- CLI commands: `npm run state:showcase`, `npm run state:outbreak`, `npm run state:clear`, `npm run state:naked`
- Showcase: 19 students, 50 appointments, 20 ratings, 6 reviews, 100 symptom logs, 405 availability slots
- All data temporally relative (always fresh regardless of when run)
- Batch-optimised inserts (20s instead of 120s+)
- Admin tools JS loaded on every page for console access

## Pre-Phase 23: Map & Location System Overhaul
- Replaced text address field with Leaflet pin-drop map for student location
- Point-in-polygon zone computation (server-side, invisible to students)
- Pin-drop pages show clean map only (no zone boundaries visible)
- Auto-login after registration → redirect to pin-drop page
- Student.Address column dropped, replaced by Latitude/Longitude
- Profile view shows "Pin set ✓" with update link

## Phase 24: Zone System Overhaul & Choropleth Heat Map
- Expanded from 8 to 16 OSM-verified suburb zones (Nominatim bounding box data)
- Zones: Summerstrand, Humewood, South End & Central, North End & Korsten, Newton Park, Mill Park, Walmer, Lorraine, Sherwood & Kabega, Westering & Bridgemead, Sunridge Park, Richmond Hill, Sydenham & Malabar, Mangold Park & Charlo, Kamma Park & Theescombe, Lovemore Heights & Sardinia Bay
- Choropleth heat map (replaces old circles): soft cloud/splotch polygon fills, opacity scales with severity
- GeoJSON FeatureCollection API for Leaflet L.geoJson() rendering
- Hover shows info panel, click zooms with popup showing top symptoms
- Legend: Low → Moderate → High → Outbreak colour scale
- NMU logo (nmu.jpg) implemented in sidebar and auth pages
- Pie chart: fixed size (500×500), centred, legend below, white text for dark mode
- Map and pie chart now use same period (page-level reload on dropdown change)
- Fixed data inconsistency: StudentZone records rebuilt via showcase state
- Symptom data updated with med-student verified mappings (48 symptoms, 27 meds, 66 mappings)
- Tier 2 symptoms get NO OTC recommendations (instructive language: "You need to book a nurse")
- CSV formula injection fix (CWE-1236)
- Removed all remaining address text inputs (replaced by pin-drop)

## Phase 25: Security Hardening & Vulnerability Fixes
- Mounted `requireAssignedNurse` on nurse mutation routes to close IDOR gaps:
  - `/appointment/status`, `/appointment/notes`, and the (then-current) `/update-teams-link` — previously only checked "is a nurse", not "is THIS nurse"
- Reschedule flow hardened to match the atomic booking path:
  - Weekend rejection + slot-availability check applied on reschedule (previously a bare `UPDATE Time`)
- Password-reset flow reviewed (token disclosure + user-enumeration oracle noted for follow-up)
- CSRF `/api/` handling reviewed; state-mutating admin endpoints confirmed session-gated
- `NODE_ENV` boot warning surfaced (secure session cookie only in production)
- Confirmed parameterised SQL everywhere, including dynamic `IN (?)` builders and hardcoded-map table-name password updates
- Verified `atomicBookSlot`'s `SELECT ... FOR UPDATE` transaction and the appointment status state-machine guards

## Phase 26: Redundancy Reduction & UX Consolidation
- Removed duplicated user-query functions (findStudentById / findNurseById / findAdminById / updatePassword) — consolidated to a single source, eliminating the auth.model ↔ profile.model overlap
- Merged the nurse "Edit Bio" flow INTO the nurse profile info view (removed the separate sidebar Edit Bio button)
- Nurse reviews now persisted regardless of moderation outcome (approved AND rejected retained for admin audit)
- Admin nurse-feedback overview: clicking a nurse surfaces their reviews + relevant data, packed into one view
- Fixed admin "Manage User" 500 error caused by a dropped `Address` column still referenced in a query
- Added a "Manage Nurses" button to the admin manage-profile block
- Reorganised the sidebar ordering site-wide into a more logical grouping across all roles

## Phase 27: Tier 3 Emergency — Nearest Hospital Locator
- When a symptom evaluation resolves to Tier 3 (urgent), the recommendations page now escalates to emergency guidance
- Browser Geolocation API prompt ("detect my location") on the Tier 3 recommendations page
- Client-side Haversine distance computation to find the nearest hospital/ER
- 5 real Nelson Mandela Bay hospitals (Livingstone, Dora Nginza, Provincial, Life Mercantile, Netcare Greenacres) with coordinates, addresses, phone numbers
- "Get Directions" opens Google Maps searching by hospital name + Gqeberha (name-based search chosen over coordinate `dir/` links, which landed on wrong spots)
- Removed the NMU Campus Clinic from the list (a clinic is not an ER) and removed the "Open in Waze" option
- Geolocation-denied fallback: shows all hospitals sorted by proximity to campus
- Dark-mode-correct styling for the emergency locator UI

## Phase 28: Daily.co Video Consultations (Replacing Microsoft Teams)
Replaced the manual "nurse pastes a Microsoft Teams link" flow with automated, secure, ephemeral Daily.co video rooms.

### Config & API helper
- Added `DAILY_API_KEY`, `DAILY_DOMAIN`, `DAILY_WEBHOOK_SECRET`, `APP_BASE_URL` to `.env` (gitignored); `DAILY_API_KEY` added to `environment.js` REQUIRED_VARS (fail-fast on boot)
- `src/utils/daily.js`: thin server-side REST wrapper (`createRoom`, `createMeetingToken`, `getRoom`, `deleteRoom`) — API key used server-side only, never sent to the browser; Daily outages surface as clean `AppError(502)`, 404 treated as `{notFound:true}`
- Added `constants.DAILY` (JOIN_WINDOW_BEFORE_MIN=15, ROOM_BUFFER_AFTER_MIN=60, API_BASE)

### Database
- Added `RoomName`, `RoomUrl`, `RoomExp` columns to `Appointment` (migrate.js)
- New `ConsultationSession` table (webhook-driven attendance + duration audit)
- `TeamsID` column retained but no longer written (non-destructive — preserves historical data)

### Room lifecycle (`room.service.js`)
- Rooms created lazily when a nurse CONFIRMS an online appointment (not at booking — rooms are short-lived)
- Opaque, PHI-free room names (`consult-<uuid>`), not derivable from AppointmentID
- Per-user meeting tokens: nurse = owner (admits knockers, ends call), student = guest; token `user_name` role-prefixed for reliable webhook attribution
- Private rooms + knock-to-enter lobby (prevents consecutive-patient overlap)
- Reschedule recreates the room so its expiry window tracks the new time
- Cancel / complete / expiry tears the room down (no orphaned rooms)
- `isWithinJoinWindow` helper: joinable only within [-15min, +60min] of the slot

### Join flow
- `GET /consultations/:id/join` — works for both roles, enforces ownership (student owner OR assigned nurse) + confirmed status + time window
- `views/consultations/call.ejs` — embeds Daily Prebuilt; only a short-lived scoped token reaches the browser
- Student view: raw Teams anchor replaced with stateful portal Join link ("Join Consultation" / "Join opens 15 min before" / "Awaiting confirmation")
- Nurse dashboard: removed manual "Add Link" prompt; added a nurse Join button + room-ready indicator (nurses previously had no join path)

### Webhook auditing
- `POST /consultations/webhook/daily` — public endpoint, CSRF-exempt but secret-gated (shared secret via header/query, plus optional HMAC), verified with constant-time comparison
- Records `meeting.started` / `participant.joined` / `meeting.ended` into `ConsultationSession` (start/end, duration, per-role join times)

### Notifications
- Upcoming-appointments API now returns `roomReady` + `joinUrl` (was `teamsId`)
- 15/5/1-min browser reminders for online consultations are clickable → open the join screen
- Type label updated "Online (Teams)" → "Online (Video)"

### Admin analytics
- Reports page gained a "Video Consultations" metrics row: completed calls, average duration, no-show count (from `ConsultationSession`)
- Appointments CSV export gained `Duration` and `Attendance` (Both / Nurse-only / Student-only / No-show) columns

### Teams retirement
- Removed `POST /management/nurse/update-teams-link` route + `updateTeamsLink` controller + model function
- Recoloured the former Teams-purple action button to brand yellow
- Updated all copy (booking option, confirmation page, dashboard card) from "Teams" to "video consultation"
- Installed `@daily-co/daily-js` client SDK

## Post-Phase 28: Demo Tooling & Fixes

### Colour scheme standardisation
- Introduced canonical brand palette in `:root`: `--brand-blue #141c2b`, `--secondary-blue #132e51`, `--brand-yellow #ffcc00`, `--secondary-yellow #f9b22a`, plus contrast-safe `--accent-text-yellow #8a5a00`
- Remapped semantic aliases (`--primary-navy`, `--accent-cyan`, `--accent-gold`, `--accent-text`) to the brand palette
- Replaced all hardcoded gold hex (`#b8922e`, `rgba(212,168,67,…)`) and star-rating `#d4a843` in CSS + three EJS files with brand variables
- Dark-mode sidebar/navy now derives from `--brand-blue`

### Nurse-side demo tooling for the video feature
- "Create Demo Video Consultation" button on the nurse Clinical Dashboard: instantly books + confirms an online consultation for student s227921577 with the logged-in nurse, scheduled ~5 min out so the join window is open immediately, and provisions the Daily room
- "Clear Demo Consultations" button: deletes all `APT-DEMO-*` rows for the nurse, tearing down their Daily rooms first (scoped per-nurse)

### Camera/microphone permission fix
- Root cause: `Permissions-Policy: camera=(), microphone=(), geolocation=()` used an empty allowlist, hard-blocking media for the page AND all iframes — so the Daily iframe could never use a granted camera/mic
- Fixed to `camera=(self "https://campuscare.daily.co"), microphone=(self "https://campuscare.daily.co"), geolocation=(self)` — delegates camera/mic to the Daily iframe and re-enables geolocation (which also unblocked the Phase 27 locator)

### Video library load failure fix (teammate pull)
- Root cause: the Daily SDK was served from `node_modules` (gitignored), so a teammate who pulled without `npm install` got a 404 → `window.DailyIframe` undefined → "Could not load the video library"
- Vendored the pinned SDK into `public/vendor/daily/daily-iframe.js` (committed, ~275 KB) and removed the node_modules-based static mount
- Added a CDN fallback in `call.ejs` (`onerror` loads `@daily-co/daily-js@0.92.2` from unpkg) as a safety net
- Decision recorded: keep `node_modules/` gitignored (platform-specific native builds e.g. bcrypt, redundant with package-lock); vendor only the single required runtime asset instead