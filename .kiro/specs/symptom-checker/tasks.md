# Tasks: Symptom Checker & OTC Recommendations

## Completed
- [x] Task 1: Create `src/models/symptomModel.js` with catalog query and relational JOIN query.
- [x] Task 2: Build `src/controllers/symptomController.js` for rendering forms and evaluating recommendations.
- [x] Task 3: Define `src/routes/symptomRoutes.js` and mount under `/symptoms` in `src/app.js`.
- [x] Task 4: Create EJS view `views/student/symptom-form.ejs` with dropdown options and severity selectors.
- [x] Task 5: Create EJS view `views/student/recommendations.ejs` displaying medication details and clinical warnings.
- [x] Task 6: Create `SymptomLog` table via database migration.
- [x] Task 7: Log each symptom evaluation to `SymptomLog` (studentNumber, symptomName, severity, timestamp).
- [x] Task 8: Add `FacilityID` to Medication table, update model to JOIN facility for pickup location display.
- [x] Task 9: Build student symptom history page (`views/student/symptom-history.ejs`).

## Remaining
- [ ] Task 10: Add multi-symptom selection support (checkboxes instead of single dropdown).
- [ ] Task 11: Client-side search/filter for symptom dropdown.
- [ ] Task 12: End-to-end testing of symptom → recommendation → escalation flow.
