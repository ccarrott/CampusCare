# CampusCare — Development Changelog (Phases 3–18)

Full-stack university health platform built across 16 development phases.

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

## Phase 19: Booking Flow Revamp & Nurse Reviews

### Booking Form Redesign (`views/consultations/book.ejs`)
- Stepped booking flow with progressive disclosure
- Step 1: Choose consultation type (Physical / Online)
- Physical path: Step 2 = Select NMU campus (South, North, Second Avenue, Missionvale, Bird Street, George), Step 3 = Select nurse, Step 4 = Select time slot
- Online path: Step 2 = Select nurse, Step 3 = Select time slot, Step 4 = Choose preferred language for Teams meeting (all 11 SA official languages)
- Submit button only enables when all required steps are completed
- Campus dropdown hidden for Online; language dropdown hidden for Physical

### Controller & Model Updates
- `appointmentController.js`: `handleBooking` now extracts `campus` and `preferredLanguage`, validates conditionally (campus required for Physical, language required for Online), redirects to review page after booking
- `appointmentModel.js`: `createAppointment` now inserts `Campus` and `PreferredLanguage` columns (8 fields total)

### Nurse Review System (new feature)
- **New table**: `NurseReviews` (ReviewID PK, AppointmentID, StudentNumber, StaffNumber, Rating, ReviewText, CreatedAt)
- **New model**: `src/models/nurseReviewModel.js` — createNurseReview, getReviewsByNurse, getReviewsByStudent, hasReviewedAppointment
- **New controller**: `src/controllers/nurseReviewController.js` — showReviewPage, handleReviewSubmission, showStudentReviews
- **New views**:
  - `views/consultations/review.ejs` — post-booking review prompt with star rating (1–5) and text area; shows appointment summary with campus/language info
  - `views/consultations/nurse-reviews.ejs` — list of all reviews submitted by the student
- **Routes added** to `consultationRoutes.js`:
  - `GET /consultations/review/:id` — review page after booking
  - `POST /consultations/review` — submit nurse review
  - `GET /consultations/nurse-reviews` — view all student's past reviews

### Navigation
- Added "Review Nurse" link in student sidebar (after My Appointments)

### Database Migrations (`src/config/migrate.js`)
- `ALTER TABLE Appointment ADD COLUMN Campus varchar(50) NULL`
- `ALTER TABLE Appointment ADD COLUMN PreferredLanguage varchar(50) NULL`
- `CREATE TABLE IF NOT EXISTS NurseReviews (ReviewID, AppointmentID, StudentNumber, StaffNumber, Rating, ReviewText, CreatedAt)`

### Post-deploy Steps
- Run `node src/config/migrate.js` to apply schema changes
