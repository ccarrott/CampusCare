# Tasks: Consultations & Reviews

## Completed
- [x] Task 1: Create `appointmentModel.js` and `ratingModel.js`.
- [x] Task 2: Build `appointmentController.js` handling both physical and MS Teams online bookings.
- [x] Task 3: Build `ratingController.js` with duplicate-check guard.
- [x] Task 4: Register consultation routes in `src/routes/consultationRoutes.js`.
- [x] Task 5: Build EJS UI forms (`views/consultations/book.ejs`, `views/consultations/index.ejs`).
- [x] Task 6: Add `Status` column to Appointment table via migration.
- [x] Task 7: Update `createAppointment` to set Status = 'Pending' on insert.
- [x] Task 8: Add status change model function (`updateAppointmentStatus`).
- [x] Task 9: Update nurse dashboard to show status-change buttons (Confirm/Complete/Cancel).
- [x] Task 10: Enforce ratings only on Status = 'Completed' appointments — Phase 19.
- [x] Task 11: Add appointment cancellation route for students.
- [x] Task 12: Add `Notes` column and nurse consultation notes form.
- [x] Task 13: Server-side duplicate timeslot prevention (atomic transaction with SELECT...FOR UPDATE) — Phase 20.
- [x] Task 14: Show status badges in student appointment list view.
- [x] Task 15: Prevent rating an appointment more than once (ratedIds check + hide button) — Phase 19.

## Remaining
- [ ] Task 16: End-to-end booking → confirm → complete → rate workflow testing.
