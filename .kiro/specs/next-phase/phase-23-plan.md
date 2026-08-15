# Phase 23: Database States, Showcase Tooling & Immersive Demo Data

## Goal

Create a **database state management system** with three switchable states (naked, showcase, outbreak) that produce relationally-sound, immersive data for demos. Triggerable from browser console or CLI.

---

## Part A: Bug Fixes (Already Done)

- [x] A3: Symptom tag click fixed (label→span)
- A1/A2: Pie chart + map empty → fixed by showcase state seeding SymptomLogEntry data

---

## Part B: State Scripts

### Location
```
src/config/states/
├── state-naked.js
├── state-showcase.js
├── state-outbreak.js
└── state-clear-outbreak.js
```

### API Routes (mounted in app.js)
```
POST /api/admin/state/naked
POST /api/admin/state/showcase
POST /api/admin/state/outbreak
POST /api/admin/state/clear-outbreak
```

Protected by admin role check. Returns JSON.

---

## Part C: Showcase State

Seeds a complete, immersive dataset relative to TODAY:

| Table | Count | Notes |
|-------|-------|-------|
| Admin | 2 | ADM001 + ADM002 |
| Nurse | 3 | NUR001-003 with bios, experience, bcrypt passwords |
| Student | 19 | With Latitude/Longitude (pin-dropped), bcrypt passwords |
| StudentZone | 19 | Computed from student coordinates via point-in-polygon |
| Appointment | 50 | 6 months spread, mix of all statuses |
| Rating | 20 | For completed appointments, scores 3-5 |
| NurseReviews | 6 | 2 per nurse, mix approved/pending |
| SymptomLog | 100 | Multi-symptom per entry |
| SymptomLogEntry | ~250 | 2-4 symptoms per log entry (references new SymptomID) |
| NurseAvailability | 405 | Full grid all nurses |
| CampusZone | 8 | With polygon boundaries |

All dates computed from `new Date()` — always fresh.

---

## Part D: Outbreak Overlay

Layers on top of current data (doesn't delete anything):
- 25 SymptomLog + ~75 SymptomLogEntry in past 5 days
- All in ZONE04 (Central CBD) — students with coordinates inside that polygon
- Heavy respiratory symptoms (SYM05-SYM12)
- 5 outbreak appointments (APT-OUT-*)
- Prefixed IDs: `SH-OUT-*`, `APT-OUT-*`

---

## Part E: Naked State

Wipes everything dynamic, seeds minimal:
- Keeps: Symptom, Medication, SymptomMedicationMap, CampusZone, Clinic, MedicalFacility
- Seeds: 1 admin + 3 nurses (fresh passwords)
- Clears: Students, Appointments, Ratings, NurseReviews, SymptomLog, SymptomLogEntry, NurseAvailability, StudentZone, PasswordResetToken, sessions

---

## Part F: Clear Outbreak

Removes only outbreak-prefixed data:
- DELETE FROM SymptomLogEntry WHERE LogID LIKE 'SH-OUT-%'
- DELETE FROM SymptomLog WHERE LogID LIKE 'SH-OUT-%'
- DELETE FROM Appointment WHERE AppointmentID LIKE 'APT-OUT-%'

---

## Implementation Order

| Step | What |
|------|------|
| 1 | Create `src/config/states/` directory |
| 2 | Write `state-naked.js` |
| 3 | Write `state-showcase.js` (the big one — all data, computed zones) |
| 4 | Write `state-outbreak.js` |
| 5 | Write `state-clear-outbreak.js` |
| 6 | Create API routes module + mount in app.js |
| 7 | Test all 4 states |
