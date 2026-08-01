# CampusCare — Development Changelog (Phases 7–18)

Full-stack university health platform built across 12 development phases using Kiro.

---

## Phase 7: Database Migration & Auth Foundation
- Added Password, Email, ClinicID columns to Nurse/Admin tables
- Created SymptomLog table for per-student health tracking
- Added Status, Notes, CreatedAt to Appointment; StudentNumber to Rating
- Added FacilityID, ExpiryDate, StockQuantity to Medication
- Implemented bcrypt password hashing across all roles
- Built collapsible sidebar navigation (role-aware)

## Phase 8: Smart Authentication
- Auto-detect login (Student → Nurse → Admin, no role dropdown)
- Forgot/reset password flow with token-based links
- Centered auth page layout (no sidebar on login/register)

## Phase 9: Dashboard & Layout
- 2x2 dashboard grid with role-specific cards and CTAs
- Auth layout separation (auth-header/auth-footer partials)

## Phase 10: Nurse Availability System
- 27-slot weekly grid (15-min sessions, 20-min cadence, 08:00–16:40)
- Drag-to-paint Available/Unavailable with mouse
- Booked slot locking (gold cells, untouchable)
- Column header toggle, bulk actions, conflict warnings
- Real date headers showing next 5 weekdays

## Phase 11: Browser Notifications
- Web Notification API integration (24h, 1h, start reminders)
- Permission request on first load, localStorage dedup
- Polls /consultations/api/upcoming every 5 minutes

## Phase 12: Symptom Data Overhaul
- 20 SA-relevant symptoms across 6 types and 3 tiers
- 15 OTC medications with SymptomMedication join mappings
- SymptomLog integration (every check logged with severity + timestamp)
- Student symptom history page with severity badges

## Phase 13: Health Trend Mapping
- 8 real NMU/Gqeberha campus zones with GPS coordinates
- CampusZone + StudentZone tables with address-based mapping
- Leaflet.js map centered on NMU South Campus
- Circle markers (size = report count, colour = severity tier)
- Zone popups with aggregated symptom breakdown
- Period-aware filtering (7d, 1m, 2m, 6m, 1y)
- Outbreak simulation seeder (seed-outbreak.js)
- Privacy-compliant: only aggregated data, no student identifiers

## Phase 14: Admin CRUD
- Full student management (list, search, add, edit, delete)
- Full nurse management (list, add, edit, delete with clinic assignment)
- Cascade delete handling (related records cleaned)
- Enhanced admin reports with Chart.js line graph

## Phase 15: Consultation Lifecycle
- Appointment status flow: Pending → Confirmed → Completed → Cancelled
- Student cancel + reschedule with slot protection
- Nurse consultation notes per appointment
- Server-side double-booking prevention
- Slot locking cascade (cancel frees slot, reschedule swaps)

## Phase 16: Visual Polish
- Sidebar: 70px gold logo with glow, click-to-collapse, no burger
- Dark mode toggle (sun/moon, localStorage, system preference)
- Chart.js doughnut for symptoms by category (period-aware)
- Chart.js line graph for admin appointments over time
- Input validation middleware (student number, email, password, phone)
- XSS sanitization on all text inputs
- Status badges, severity badges, action buttons
- Admin sidebar expandable submenus with arrow toggles

## Phase 17: UX Refinement & Features
- Removed all dosage/medical advice (legal compliance)
- Dark mode on auth pages + full text readability audit
- Time-aware greeting (morning/afternoon/evening, admin override)
- Map zoom controls repositioned (bottomright)
- Rate button inline in appointment rows
- Consistent availability legends across booking + nurse grids
- CSV export for admin reports + health trends
- Loading spinners (booking grid, map data)
- Empty state illustrations with CTAs
- Session timeout warning (55-min toast + refresh button)
- Appointment confirmation summary page
- Nurse patient history view (symptom log per student)
- Print-friendly admin reports (@media print stylesheet)
- Responsive mobile sidebar drawer (< 768px)
- Login preserves ID on failed attempt

## Phase 18: Code Audit & Showcase Data
- Full codebase audit: models, controllers, routes, views, CSS, JS
- Removed dead code: unused model exports, validation functions, duplicate CSS rules, orphaned class references
- Created seed-showcase.js: 40 appointments (6 months spread), 15 ratings, 80 symptom logs with zone clustering for outbreak demo
- Renamed "CampusCare Hub" → "CampusCare"
- Fixed sidebar logo animation (smooth both directions)
