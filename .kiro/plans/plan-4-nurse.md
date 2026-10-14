# Plan 4 — Nurse Portal

## Problem Statement
Three nurse-portal fixes: lock the "Years of Experience" field, restrict the editable nurse
profile fields to Bio / Last Name / Password, and surface a student's logged symptoms to the
nurse (with readable symptom names, not raw IDs).

## Global Constraints
- **UI-only terminology rename:** only EJS visible text/labels — never the `Appointment` table,
  columns, `appointments.*.js`, routes, or JS identifiers.
- No new client libraries, no build step. Use tokens from `ui-design.md`.
- Parameterised queries only; ownership checks preserved.
- Verify in light + dark mode, no console errors. Restart `node src/app.js` (kill stale node on
  port 3000) to test.

## Architecture Notes (grounded in current code)
- **Nurse profile editing is NOT in `views/profile/edit.ejs`** — that file is student-only
  (Medical History + location picker, guarded by `requireRole(ROLES.STUDENT)`). The nurse's
  editable fields live in **`views/profile/view.ejs`** (role-branched), as:
  - a "Public Profile" form → `POST /profile/update-bio` (nurse-only): `bio` + `yearsExperience`.
  - the shared "Change Password" form → `POST /profile/change-password` (all roles).
- `updateNurseBio` (`src/modules/profile/profile.controller.js`, ~lines 158–166) clamps
  `yearsExperience` to 0–50, defaulting a missing value to **0** — so merely hiding the input
  would silently zero it. It must be removed from the controller **and** the SQL.
- The nurse profile UPDATE query lives in `src/modules/nurse/nurse.model.js`
  (`updateNurseProfile`, ~lines 17–20): `UPDATE Nurse SET Bio = ?, YearsExperience = ? WHERE
  StaffNumber = ?`.
- Password changes go through `src/modules/shared/user.model.js updatePassword` (role→table
  whitelist) — no change needed for Item 24.
- There is **no FK** linking `SymptomLog` to `Appointment`; consultations relate to symptom logs
  only by `StudentNumber` (loosely by time via `LogDate`).
- The nurse's only path to student symptoms is the ownership-gated
  `GET /management/nurse/patient/:studentNumber/history`
  (`requireRole(ROLES.NURSE)` + `requirePatientRelationship`) → `showPatientHistory` →
  `views/nurse/patient-history.ejs`. The "file" icon link in
  `views/partials/nurse-appt-row.ejs` is the entry point.
- **Latent bug:** the nurse flow uses `nurse.model.js getPatientSymptomHistory`
  (`SELECT * FROM SymptomLog`), whose `SymptomName` column stores a **comma-joined list of
  symptom IDs** (e.g. "3,7,12"), not readable names. The richer
  `src/modules/symptoms/symptoms.model.js getSymptomHistory` JOINs
  `SymptomLogEntry → Symptom` and returns readable `SymptomNames`.

---

## Item 23 — Lock "Years of Experience" (E300)

**Target files**
- `views/profile/view.ejs` (nurse "Public Profile" form — remove the `yearsExperience`
  `<input>`; show the value as read-only text instead).
- `src/modules/profile/profile.controller.js` (`updateNurseBio`, ~lines 158–166 — stop reading/
  writing `yearsExperience`).
- `src/modules/nurse/nurse.model.js` (`updateNurseProfile`, ~lines 17–20 — drop
  `YearsExperience = ?`).

**Implementation Steps**
1. In `view.ejs`, remove the editable `yearsExperience` number input from the nurse form and
   instead display Years of Experience as a read-only detail row so the nurse can still see it.
2. In `updateNurseBio`, remove the `yearsExperience` parse/clamp and stop passing it to the
   model. **(Critical:** leaving it in the controller would default a missing field to 0 and
   wipe the value.)
3. In `updateNurseProfile`, drop the `YearsExperience = ?` column (see Item 24 for the final
   query shape).

**Verification**
- The nurse cannot change Years of Experience from the profile form.
- Tampering with a `yearsExperience` field in the request has no effect — the seeded value is
  preserved.
- The value still displays read-only.

---

## Item 24 — Restrict Nurse Profile Editable Fields to Bio, Last Name, Password (E300)

**Target files**
- `views/profile/view.ejs` (nurse "Public Profile" form — add a Last Name field; keep Bio; keep
  the shared Change Password form).
- `src/modules/profile/profile.controller.js` (`updateNurseBio` — accept + sanitize `lastName`).
- `src/modules/nurse/nurse.model.js` (`updateNurseProfile` — write Bio + LastName).

**Context**
Today a nurse can edit Bio, YearsExperience, and Password. The requirement is Bio, **Last Name**,
and Password only. LastName is **not** currently editable by a nurse anywhere — so this is an
*addition* (LastName) combined with Item 23's *removal* (YearsExperience). FirstName, Email,
Phone, Campus, ClinicID stay read-only (admin owns Campus/Clinic per Plan 3 Item 18).

**Implementation Steps**
1. In `view.ejs`, add a **Last Name** input to the nurse "Public Profile" form (prefilled with
   `profile.LastName`), keep the Bio textarea (sanitized, max 300), and ensure no other nurse
   field is rendered as editable. Leave the all-roles Change Password form unchanged.
2. In `updateNurseBio`, read and `sanitize` `lastName` (strip `<>`, trim); add light validation
   (non-empty). Pass `{ bio, lastName }` to the model (no `yearsExperience`).
3. In `updateNurseProfile`, set the query to
   `UPDATE Nurse SET Bio = ?, LastName = ? WHERE StaffNumber = ?` (parameterised).
4. Password editing already works via `/profile/change-password` → `updatePassword`; no change.

**Verification**
- A nurse can edit **only** Bio, Last Name, and Password from the profile page.
- The updated last name persists and appears on "Meet Our Staff" / the profile view.
- No other nurse field (FirstName/Email/Phone/Campus/Clinic/YearsExperience) is writable from
  the profile page; parameterised queries; no console errors.

---

## Item 25 — Display Student Symptoms to Nurse (C300 / C400)

**Target files**
- `src/modules/nurse/nurse.controller.js` (`showPatientHistory`, ~lines 195–208).
- `src/modules/nurse/nurse.model.js` (`getPatientSymptomHistory` — `SELECT *` returning
  comma-joined IDs).
- `src/modules/symptoms/symptoms.model.js` (`getSymptomHistory` — the join returning readable
  `SymptomNames`).
- `views/nurse/patient-history.ejs` (currently reads `log.SymptomName`).
- Optional: `views/nurse/dashboard.ejs` / `views/partials/nurse-appt-row.ejs` (quick symptom
  peek + confirm the entry link).

**Context**
The nurse can already reach a patient's symptom history (ownership-gated), but it renders raw
symptom-ID strings because it uses the weaker `getPatientSymptomHistory`. The fix is to route
through the readable-name join.

**Implementation Steps**
1. Surface readable symptom names: either
   - repoint `showPatientHistory` to `SymptomsModel.getSymptomHistory(studentNumber)`
     (returns `LogID`, `Severity`, `LogDate`, `SymptomNames`), **or**
   - rewrite `getPatientSymptomHistory` to JOIN `SymptomLogEntry → Symptom` with
     `GROUP_CONCAT(s.Name ...)` and alias it `SymptomNames`.
   Prefer reusing the existing `getSymptomHistory` to avoid duplicate query logic.
2. Update `patient-history.ejs` to read `log.SymptomNames` (plus `Severity`, `LogDate`, and
   optionally `Duration`/`Trajectory` if present).
3. Keep the `requirePatientRelationship` ownership gate on the route. Because there is no
   `SymptomLog ↔ Appointment` FK, link by `StudentNumber` (optionally emphasise the most recent
   logs near the consultation time).
4. Ensure the "file" link in `nurse-appt-row.ejs` makes the symptom history reachable from the
   consultation row (it currently points to
   `/management/nurse/patient/<StudentNumber>/history`).

**Verification**
- From a nurse's consultation, opening the patient's symptom history shows **human-readable**
  symptom names + severity + date (not "3,7,12").
- Ownership still enforced: a nurse with no appointment relationship to the student is blocked.
- Parameterised queries; no console errors; works light/dark.

---

## Suggested Execution Order
1. Items 23 + 24 together (same form in `view.ejs`, same controller `updateNurseBio`, same model
   `updateNurseProfile` query — one coordinated change: drop YearsExperience, add LastName).
2. Item 25 (symptom-name join + view update + entry-link check).
