# Phase 18: Code Audit + Showcase Database Population

## Part A: Full Code Audit

### Models (`src/models/`)
- [ ] `userModel.js`: Check all exports are used somewhere. Verify `createNurse` is still referenced (admin CRUD uses `adminCrudModel` instead — may be dead code).
- [ ] `symptomModel.js`: Verify all 3 functions are called.
- [ ] `appointmentModel.js`: Check for duplicate functions (e.g., `getAppointmentsByStudent` vs `getAppointmentsByStudentWithStatus` — the old one may be unused now).
- [ ] `ratingModel.js`: Verify both functions used.
- [ ] `trendModel.js`: Check if `getSymptomsByType` is still called (we moved to inline query in trendController).
- [ ] `adminReportModel.js`: All exports used.
- [ ] `adminCrudModel.js`: All exports used.
- [ ] `nurseManagementModel.js`: Check if `getAppointmentsForNurse` is still called (we switched to `appointmentModel.getAppointmentsForNurseWithStatus`).
- [ ] `availabilityModel.js`: Verify `getAvailableSlots` and `getOpenSlots` are both still referenced.

### Controllers (`src/controllers/`)
- [ ] `authController.js`: Verify no dead exports. Check `SALT_ROUNDS` is used.
- [ ] `appointmentController.js`: Check `getUpcomingWeekDays` helper is used.
- [ ] `profileController.js`: Verify `showEditProfile` is still routed.
- [ ] `symptomController.js`: Verify no dead imports.
- [ ] `trendController.js`: Check if `TrendModel` import is still needed (some functions may have moved inline).
- [ ] `nurseController.js`: Verify `NurseManagementModel` import is still used (we may have replaced with `AppointmentModel`).
- [ ] `adminController.js`: Clean.
- [ ] `adminCrudController.js`: Clean.
- [ ] `availabilityController.js`: Clean.
- [ ] `notificationController.js`: Verify route is active.
- [ ] `ratingController.js`: Clean.
- [ ] `exportController.js`: Verify both exports routed.

### Routes (`src/routes/`)
- [ ] All route files: verify every handler import is valid and not a dead reference.
- [ ] Check for any duplicate route paths that might shadow each other.

### Views (`views/`)
- [ ] Check all views reference only variables that are actually passed by their controller.
- [ ] Look for any `include` paths that might be broken.
- [ ] Verify no leftover `<% if (typeof X !== 'undefined') %>` guards for variables that are now always passed.

### CSS (`public/css/style.css`)
- [ ] Look for duplicate rule blocks (e.g., multiple `.content-card h2` definitions).
- [ ] Check for rules referencing deleted classes (e.g., `.slot-toggle`, `.slot-label` — removed in Phase 16).
- [ ] Consolidate dark mode overrides that duplicate base rules.
- [ ] Remove any `!important` that can be avoided.

### JS (`public/js/`)
- [ ] `sidebar.js`: Verify no dead functions.
- [ ] `darkmode.js`: Clean.
- [ ] `notifications.js`: Clean.
- [ ] `session-timeout.js`: Verify refresh route exists.

### Middleware
- [ ] `validation.js`: Verify all exports are imported somewhere. `isFutureWeekday` may be unused.
- [ ] `authMiddleware.js`: All 4 middleware functions used.

---

## Part B: Showcase Database Seed Script (`src/config/seed-showcase.js`)

### Goal
Populate the database with enough realistic historical data to make all dashboards, charts, and filters look impressive during a demo.

### Data to Generate

#### Appointments (40 total, spread over 6 months)
- 12 × Completed (Physical) — dates from Jan–Jul 2026
- 8 × Completed (Online) — with TeamsID = null (nurse adds later)
- 6 × Confirmed (Physical) — upcoming next 2 weeks
- 6 × Confirmed (Online) — upcoming, TeamsID = null
- 4 × Pending (Physical) — upcoming
- 2 × Pending (Online) — upcoming
- 2 × Cancelled — past dates

Distribution across nurses: NUR001 (15), NUR002 (15), NUR003 (10)
Distribution across students: spread across all 19 students

#### Ratings (15 total, for completed appointments)
- Scores: mix of 3, 4, 4, 5, 5, 5, 4, 3, 5, 4, 5, 4, 5, 3, 4
- With realistic descriptions

#### SymptomLog (80 entries, spread over 6 months)
- Concentrate 30% in past 7 days (for "Past 7 days" filter)
- 30% in past month
- 40% spread over 2-6 months ago
- Mix all symptom types and severities
- Cluster ~20 entries in Central zone (outbreak demo)
- Scatter the rest across Summerstrand, Newton Park, Walmer
- Ensures pie chart has data for all filter periods
- Ensures map shows activity across multiple zones

#### NurseAvailability
- Keep current seed-availability.js output (405 records)
- No changes needed

### Script Behaviour
```
node src/config/seed-showcase.js
```
- Clears: Appointments, Ratings, SymptomLog (NOT students, nurses, zones, symptoms, medications)
- Re-populates with showcase data
- Outputs record counts when done
- Safe to run multiple times

### Important Notes
- Do NOT clear Student, Nurse, Admin, Symptoms, Medication, SymptomMedication, Clinic, MedicalFacility, CampusZone, StudentZone, NurseAvailability, PasswordResetToken
- Generate AppointmentIDs with `APT-SHOW-` prefix for easy identification
- Generate RatingIDs with `RAT-SHOW-` prefix
- Generate SymptomLog LogIDs with `SH-` prefix (showcase)
- Appointment times should use realistic weekday times (8:00-16:40, 20-min cadence slots)

---

## Execution Order
1. Run code audit (read all files, identify dead code, remove)
2. Create `seed-showcase.js`
3. Run it: `node src/config/seed-showcase.js`
4. Start server and verify: reports chart has 6 months of data, pie chart populated across periods, map shows multiple zones active, admin reports show meaningful metrics
