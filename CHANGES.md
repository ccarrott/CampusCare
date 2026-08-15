# CampusCare — Development Changelog (Phases 3–20)

Full-stack university health platform built across 18 development phases.

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
