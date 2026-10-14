# CampusCare Hub - Development Roadmap (v3 — Current)

## Completed Phases

| Phase | What was delivered |
|-------|-------------------|
| 1-6 | Core MVC: auth, profiles, symptom checker, trends, consultations, nurse/admin |
| 7 | DB migration (16 new columns + SymptomLog), bcrypt, sidebar nav |
| 8 | Auto-detect login (no dropdown), forgot password flow, centered auth pages |
| 9 | Dashboard 2x2 large cards, auth layout separation |
| 10 | Nurse availability: 27 × 15-min slots, drag-draw, booked slot locking, date headers |
| 11 | Browser notifications (24h, 1h, start reminders) |
| 12 | 20 SA symptoms, 15 SA medications, SymptomLog integration, history page |

---

## Phase 13: Health Trend Mapping & Outbreak Detection (NEXT)

### 13.1 — Realistic NMU/Gqeberha Address Overhaul
- Update all student addresses to real Summerstrand/Newton Park/Central locations
- Add 15 lightweight extra student profiles for map density
- Update nurse/clinic addresses to NMU campus area

### 13.2 — Campus Zone System
- Create `CampusZone` table with GPS coordinates for 8 zones around NMU
- Create `StudentZone` table mapping students to their closest zone
- Seed zone data with real coordinates

### 13.3 — Leaflet.js Map Integration
- Add Leaflet.js (CDN) + OpenStreetMap tiles to trends dashboard
- Map centered on NMU South Campus
- Circle markers per zone (size = report count, colour = severity)
- Popup on click showing zone name + symptom breakdown
- Privacy: only aggregated data, min 3 reports to show

### 13.4 — Outbreak Simulation Seeder
- `node src/config/seed-outbreak.js` — generates concentrated SymptomLog entries in one zone
- Default: flu cluster in Central over past 7 days
- `--clear` flag removes simulated data

### 13.5 — Trend API for Map Data
- New endpoint returning zone-aggregated SymptomLog counts as JSON
- Feeds the Leaflet map with real-time data from the database

---

## Phase 14: Admin Profile Management (Full CRUD)

### 14.1 — Student Management
- List all students (searchable table)
- Add / Edit / Delete student accounts
- Routes under `/management/admin/students`

### 14.2 — Nurse Management
- List all nurses with clinic assignments
- Add new nurses (with hashed password)
- Edit / deactivate nurses
- Routes under `/management/admin/nurses`

### 14.3 — Enhanced Admin Reports
- Date range filtering
- Per-nurse performance (appointments count, avg rating)
- CSV export for data

---

## Phase 15: Consultation Enhancements

### 15.1 — Reschedule Feature
- Students can reschedule pending appointments (pick new slot from grid)
- Route: `POST /consultations/reschedule`
- Old slot freed, new slot claimed

### 15.2 — Cancel Consultation
- Students or nurses can cancel
- Route: `POST /consultations/cancel`
- Slot returns to base availability state

### 15.3 — Meeting Progress & Notes
- Nurses update appointment state: Pending → Confirmed → Completed
- Notes field for post-consultation documentation
- Completion triggers rating-request notification

### 15.4 — Slot Protection Rules (Already Implemented)
- Booked cells locked (gold) on nurse grid — drag/toggle skips them
- Conflict warnings when nurse marks booked slot unavailable
- Server-side double-booking prevention

### 15.5 — Availability Slot Locking Cascade
- Cancel → slot freed to original NurseAvailability state
- Reschedule → old freed + new claimed
- Booking creates implicit lock (no NurseAvailability change needed — just Appointment record)
