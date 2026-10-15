# Plan — Formal Relational Constraints (PK / FK / Cascade) Across Aiven + local.db

## 0. Goal & scope

Right now every table has the *columns* that imply relationships (e.g. `Consultation.StudentNumber`, `Rating.AppointmentID`) but the DDL never declares real **FOREIGN KEY** constraints — only PRIMARY KEYs exist. Referential integrity is enforced *by hand* in application code (e.g. `admin.model.deleteStudent` manually deletes child rows in dependency order).

This plan **tears down and rebuilds both schemas** (Aiven MySQL + local SQLite) with proper `PRIMARY KEY`, `FOREIGN KEY ... REFERENCES`, and `ON DELETE` cascade rules baked into the `CREATE TABLE` DDL, then updates migrate/seed/state scripts so dummy data loads with **zero FK violations**, audits models/controllers for breakage, reseeds both DBs, and runs full end-to-end verification.

### Confirmed scope decisions (from discussion)
1. **Full drop-and-rebuild**, not in-place `ALTER ADD CONSTRAINT`. SQLite cannot add a FK to an existing table via `ALTER`, so a single cross-engine schema definition requires recreating tables. Existing data is **reseeded**, not preserved (both DBs are demo/dev; showcase reseeds in ~1s).
2. **Collapse the historical ALTER chain** into one authoritative set of constrained `CREATE TABLE` statements. The rename pre-migrations (`Appointment→Consultation`, `ConsultationSession→OnlineConsultationSession`, `DurationSeconds→Duration`) are **absorbed into the final table definitions** — both live DBs are already renamed, so no legacy-rename compatibility is needed going forward.
3. **`PasswordResetToken.UserID` stays unconstrained** — it's polymorphic (points at Student OR Nurse OR Admin via `UserType`), which a single FK cannot express. Documented, not enforced.
4. **No column renames.** The FK column remains literally `AppointmentID` on `Consultation`/`Rating`/`NurseReviews`/`OnlineConsultationSession`. FKs reference it as-is.
5. **OK to wipe + reseed Aiven** — no production data to protect.

> **Pending your go-ahead before any execution.** This document is the plan only.

---

## 1. Current state (audited from code)

### Tables & PKs (post-rename, as they exist now)
| Table | PK | Implied FKs (columns present, NOT constrained today) |
|---|---|---|
| `Clinic` | `RegNum` | — |
| `Student` | `StudentNumber` | — |
| `Nurse` | `StaffNumber` | `ClinicID` → Clinic |
| `Admin` | `StaffNumber` | — |
| `Consultation` | `AppointmentID` | `StudentNumber` → Student, `StaffNumber` → Nurse |
| `Rating` | `RatingID` | `AppointmentID` → Consultation, `StudentNumber` → Student |
| `NurseReviews` | `ReviewID` | `AppointmentID` → Consultation, `StudentNumber` → Student, `StaffNumber` → Nurse |
| `OnlineConsultationSession` | `SessionID` | `AppointmentID` → Consultation |
| `Medication` | `MedicationCode` | — |
| `Symptom` | `SymptomID` | — |
| `SymptomMedicationMap` | (`SymptomID`,`MedicationCode`) | `SymptomID` → Symptom, `MedicationCode` → Medication |
| `SymptomLog` | `LogID` | `StudentNumber` → Student, `ZoneID` → CampusZone |
| `SymptomLogEntry` | (`LogID`,`SymptomID`) | `LogID` → SymptomLog, `SymptomID` → Symptom |
| `CampusZone` | `ZoneID` | — |
| `StudentZone` | (`StudentNumber`,`ZoneID`) | `StudentNumber` → Student, `ZoneID` → CampusZone |
| `NurseAvailability` | `AvailabilityID` | `StaffNumber` → Nurse |
| `PasswordResetToken` | `TokenID` | `UserID` → polymorphic (NO FK) |

### How integrity is faked today (what FKs will replace)
- `admin.model.deleteStudent` manually deletes `SymptomLogEntry → SymptomLog → StudentZone → NurseReviews → Rating → Consultation → PasswordResetToken → Student` in order. **ON DELETE CASCADE automates this.**
- `admin.model.deleteNurse` blocks deletion if the nurse has consultations, else deletes `NurseAvailability` then `Nurse`.
- `state-naked.loadNakedState` deletes dynamic tables in a hand-ordered sequence ("order matters for FKs" — a comment that's currently aspirational since there are no FKs). This ordering becomes **mandatory** once FKs exist, OR we toggle FK checks off during the wipe.

---

## 2. Target FK / cascade matrix

| Child table | FK column → Parent.key | ON DELETE | ON UPDATE | Rationale |
|---|---|---|---|---|
| `Nurse` | `ClinicID` → `Clinic.RegNum` | **SET NULL** | CASCADE | A clinic can be retired without deleting its nurses; `ClinicID` is already nullable. |
| `Consultation` | `StudentNumber` → `Student.StudentNumber` | **CASCADE** | CASCADE | Deleting a student removes their consultations (matches `deleteStudent`). |
| `Consultation` | `StaffNumber` → `Nurse.StaffNumber` | **CASCADE** | CASCADE | Consultations are meaningless without the nurse. (Note: `deleteNurse` currently *blocks* on existing consultations — see §5 decision.) |
| `Rating` | `AppointmentID` → `Consultation.AppointmentID` | **CASCADE** | CASCADE | Rating belongs to a consultation. |
| `Rating` | `StudentNumber` → `Student.StudentNumber` | **CASCADE** | CASCADE | — |
| `NurseReviews` | `AppointmentID` → `Consultation.AppointmentID` | **CASCADE** | CASCADE | — |
| `NurseReviews` | `StudentNumber` → `Student.StudentNumber` | **CASCADE** | CASCADE | — |
| `NurseReviews` | `StaffNumber` → `Nurse.StaffNumber` | **CASCADE** | CASCADE | — |
| `OnlineConsultationSession` | `AppointmentID` → `Consultation.AppointmentID` | **CASCADE** | CASCADE | Session audit tied to its consultation. |
| `SymptomMedicationMap` | `SymptomID` → `Symptom.SymptomID` | **CASCADE** | CASCADE | Join table. |
| `SymptomMedicationMap` | `MedicationCode` → `Medication.MedicationCode` | **CASCADE** | CASCADE | Join table. |
| `SymptomLog` | `StudentNumber` → `Student.StudentNumber` | **CASCADE** | CASCADE | Student's own logs. |
| `SymptomLog` | `ZoneID` → `CampusZone.ZoneID` | **SET NULL** | CASCADE | Zone reseed shouldn't delete health history; `ZoneID` is nullable + app already falls back to `StudentZone`. |
| `SymptomLogEntry` | `LogID` → `SymptomLog.LogID` | **CASCADE** | CASCADE | — |
| `SymptomLogEntry` | `SymptomID` → `Symptom.SymptomID` | **CASCADE** | CASCADE | — |
| `StudentZone` | `StudentNumber` → `Student.StudentNumber` | **CASCADE** | CASCADE | — |
| `StudentZone` | `ZoneID` → `CampusZone.ZoneID` | **CASCADE** | CASCADE | Pure assignment table; safe to clear on zone delete. |
| `NurseAvailability` | `StaffNumber` → `Nurse.StaffNumber` | **CASCADE** | CASCADE | — |
| `PasswordResetToken` | `UserID` → (none) | — | — | Polymorphic; no FK. |

> **ON UPDATE CASCADE caveat (SQLite):** harmless but only meaningful if a PK value changes; we never update PKs, so it's belt-and-braces. MySQL and SQLite both accept it.

---

## 3. Creation / seeding order (must respect FK dependencies)

**Parents first, then children.** Create (and seed) in this topological order:

```
Clinic, Student, CampusZone, Medication, Symptom      (no FK deps)
  → Nurse (needs Clinic)
  → Admin (no deps)
  → Consultation (needs Student, Nurse)
  → NurseAvailability (needs Nurse)
  → StudentZone (needs Student, CampusZone)
  → SymptomMedicationMap (needs Symptom, Medication)
  → SymptomLog (needs Student, CampusZone)
    → SymptomLogEntry (needs SymptomLog, Symptom)
  → Rating (needs Consultation, Student)
  → NurseReviews (needs Consultation, Student, Nurse)
  → OnlineConsultationSession (needs Consultation)
  → PasswordResetToken (no FK)
```

**Deletion/wipe order = reverse** (children before parents), OR disable FK checks for the wipe:
- MySQL: `SET FOREIGN_KEY_CHECKS = 0` … wipe … `SET FOREIGN_KEY_CHECKS = 1`.
- SQLite: `PRAGMA foreign_keys = OFF` … wipe … `PRAGMA foreign_keys = ON`.
- The DB adapter already translates `SET FOREIGN_KEY_CHECKS` → `PRAGMA foreign_keys` (added in the local-DB work), so a single statement works on both engines.

---

## 4. Files to change

| File | Change |
|---|---|
| `src/config/migrate.js` | **Rewrite.** Replace the base-schema + ALTER chain with one authoritative, FK-constrained `CREATE TABLE` set in dependency order. Add a **drop-all** phase (reverse order, FK-checks off) so "rebuild" is clean and idempotent. Keep `runMigrations({exitOnDone})` signature and the `isAlreadyApplied` guard (still useful for re-runs). Retire the rename pre-migrations (absorbed into final DDL). |
| `src/config/states/state-naked.js` | Wrap the wipe in FK-checks-off/on (or confirm reverse-order deletes satisfy FKs). Seed order already fine (Clinic→Admin→Nurse). |
| `src/config/states/state-showcase.js` | Verify batch-insert order matches §3 (it mostly does: Student→StudentZone→Consultation→Rating→NurseReviews→SymptomLog→Entry→Availability). **Fix any ordering that violates FKs** (e.g. ensure `CampusZone` exists before `StudentZone`/`SymptomLog` — zones are seeded by `seed-zones-v2`, which must run before showcase; confirm the auto-bootstrap order in `app.js`). |
| `src/config/states/state-outbreak.js` | Inserts into `SymptomLog`/`SymptomLogEntry`/`Consultation` — all parents exist by then; verify. |
| `src/config/seed-symptoms.js` | Seeds `Symptom`, `Medication`, `SymptomMedicationMap`. Order within is already parent-first; the pre-delete must respect FK (delete map before Symptom/Medication, or FK-checks off). |
| `src/config/seed-zones-v2.js` | Seeds `CampusZone` (+ clears `StudentZone` first). With FKs, clearing `CampusZone` while `StudentZone`/`SymptomLog` reference it needs cascade or FK-off. **Must run before any student/zone data.** |
| `src/app.js` | Auto-bootstrap order: migrate → seed-symptoms → seed-zones → showcase. Confirm this satisfies §3 (zones before showcase students). Likely already correct; verify. |
| `src/modules/**/*.model.js`, `**/*.controller.js` | **Audit only** — the rename work already fixed table names. Confirm no query depends on the *absence* of FKs (e.g. inserting a child with a non-existent parent, or deleting a parent while children exist without handling the now-enforced error). Key suspects: `admin.model.deleteStudent/deleteNurse`, `atomicBookSlot`, webhook session upsert. |

### Column-type parity note
MySQL FKs require **referenced + referencing columns to have matching types**. All our keys are `varchar(…)` and already consistent (`StudentNumber varchar(20)` everywhere, `AppointmentID varchar(50)`, etc.). One to double-check: `Nurse.ClinicID varchar(50)` vs `Clinic.RegNum varchar(50)` ✓.

---

## 5. Open design decisions surfaced during planning

These need a ruling (defaults proposed; override if you disagree):

1. **`deleteNurse` vs `Consultation.StaffNumber CASCADE`. → DECIDED: full cascade.** Deleting a nurse WIPES everything associated with them — their consultations, and (onward via cascade) the ratings, nurse-reviews, online-session records, and availability tied to those. **Action:** `Consultation.StaffNumber` FK is `ON DELETE CASCADE`; **remove** the application-level "refuse if the nurse has appointments" guard in `admin.model.deleteNurse` so the delete proceeds and the DB cascades. `deleteNurse` becomes a simple `DELETE FROM Nurse WHERE StaffNumber = ?` (the cascade handles the rest; `NurseAvailability` also cascades so the manual pre-delete there can go too).

2. **`SymptomLog.ZoneID` SET NULL vs CASCADE.** Reseeding zones (`seed-zones-v2`) clears `CampusZone`. SET NULL preserves health logs (app falls back to `StudentZone`). **Default: SET NULL.** CASCADE would delete logs on every zone reseed — bad. — *Confirm SET NULL.*

3. **Fresh-DB rebuild idempotency.** The rewritten `migrate.js` will DROP then CREATE. On a DB that's already correct, re-running drops + recreates empty tables (then seeds repopulate). That's fine for `setup:local` but means **`migrate` alone now empties the DB**. **Default:** make the drop phase explicit and have `npm run setup`/auto-bootstrap always chain migrate→seed. Document that bare `migrate` is destructive now. — *Confirm, or I can gate the drop behind a `--rebuild` flag so plain `migrate` stays non-destructive and only creates-if-absent (no constraints added to existing tables, though — the SQLite limitation forces rebuild for constraints to take effect).*

4. **Index preservation.** The current ALTER chain adds several performance indexes (`idx_appointment_staff_time`, etc.). These must be **re-declared inline** in the new `CREATE TABLE`s (or as `CREATE INDEX` after). FK columns get implicit indexes in MySQL but NOT in SQLite — I'll add explicit indexes on all FK columns for both engines. — *Default: preserve all existing indexes + add FK-column indexes.*

---

## 6. Execution plan (reviewed workflow)

Given breadth (schema rewrite + seed/state ordering + model/controller audit + reseed both live DBs + E2E), run as a **worktree-based reviewed workflow**, not inline edits:

1. **Worktree setup** — branch `schema-fk-constraints` off the current `Final` checkout.
2. **Planner** — finalize the exact constrained `CREATE TABLE` DDL for all 17 tables (both engines validated), confirm seed/wipe ordering, resolve the §5 decisions into concrete DDL.
3. **Implementer** — rewrite `migrate.js`; adjust `state-naked`/`state-showcase`/`state-outbreak`/`seed-symptoms`/`seed-zones-v2` for FK-safe ordering + FK-checks toggling; audit & patch models/controllers.
4. **Reviewer** (two-model semantic review) — verify DDL correctness, cascade safety, no orphaned references, no app query broken.
5. **Reseed + verify (I run this, post-merge):**
   - `npm run setup:local` → clean rebuild + showcase into local.db, **0 FK violations**.
   - Run migrate+seed against **Aiven** (`--aiven`), **0 FK violations**.
   - Confirm FKs are actually enforced: attempt an orphan insert (expect rejection) and a parent delete (expect cascade) on both engines.
6. **E2E role-flow tests** (both engines): student register/login, symptom log + OTC, booking (atomic slot), nurse dashboard/availability, admin reports + CSV + student/nurse CRUD (exercises the cascade deletes), demo state switching (`showcase`/`outbreak`/`clear`/`naked`).
7. **Cleanup** — rebase branch onto `Final`, fast-forward, remove worktree.

---

## 7. Verification checklist (acceptance criteria)

- [ ] `migrate.js` produces identical final schema on MySQL and SQLite, with every FK in §2 present and enforced.
- [ ] `PRAGMA foreign_keys` is ON for SQLite sessions (already set in the adapter) — FKs are actually enforced, not just declared.
- [ ] `setup:local` and Aiven setup both complete with **0 FK violations**.
- [ ] Orphan insert (child with missing parent) is **rejected** on both engines.
- [ ] Parent delete **cascades** (e.g. delete a seeded student → their Consultations/Ratings/Reviews/SymptomLogs vanish; verify counts).
- [ ] `SET NULL` works where specified (delete a zone → `SymptomLog.ZoneID` becomes NULL, logs survive).
- [ ] All role flows pass on local.db AND Aiven (see §6.6), no console/SQL errors.
- [ ] `admin.deleteStudent` still works (now partly DB-cascaded) and `deleteNurse` guard behaves per §5.1 decision.
- [ ] Re-running migrate/setup is predictable and documented (destructive-rebuild semantics per §5.3).
- [ ] No `src/modules/**` query references a dropped/renamed object; grep clean.

---

## 8. Risks & mitigations
- **Data wipe on both DBs** — accepted (demo/dev only, §0.5). Showcase reseeds in ~1s.
- **SQLite FK enforcement is per-connection** (`PRAGMA foreign_keys = ON`) — already set by the adapter at connect; verify it survives the WAL/connection model.
- **MySQL type-mismatch FK errors** — pre-audited in §4; all keys are matching `varchar`.
- **Cascade surprises** (force-deleting a nurse nukes history) — mitigated by keeping app-level guard (§5.1).
- **Seed ordering regressions** — the workflow's reseed step is the gate; 0-violation is a hard acceptance criterion.
