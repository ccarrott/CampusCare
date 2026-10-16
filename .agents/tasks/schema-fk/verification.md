# Verification Evidence — Formal Relational Constraints (schema-fk)

Branch: `schema-fk-constraints` · Worktree: `s:\!Everything\CampusCare\.worktrees\schema-fk`
Engine verified: **local SQLite** (`node:sqlite`, Node v26.7.0). Aiven reseed + full HTTP E2E are the orchestrator's post-merge step (need live `.env`/credentials + a running server).

> `SESSION_SEED` / `NODE_ENV` were supplied inline for the run only (the worktree has no `.env`); no secret was written to any file. `USE_LOCAL_DB=true` was used for the standalone probe scripts (so the DB adapter selected SQLite without a CLI flag).

---

## 1. Full clean rebuild + seed chain — 0 FK violations, 0 failed steps

Command (worktree cwd):
```
Remove-Item -Force local.db,local.db-wal,local.db-shm
node src/app.js --local --bootstrap-only
```
(`setup:local` = `node src/app.js --local --bootstrap-only` → migrate → seed-symptoms → seed-zones → showcase → exit.)

Result (exit code 0):
- `[Migration] Complete. 58 applied, 0 already in place, 0 failed.`
  (22 drop steps + 17 create steps + 19 index steps — all `[OK]`.)
- seed-symptoms: 47 symptoms, 27 meds, 66 mappings.
- seed-zones: 35 Voronoi zones (ZONE01..ZONE35).
- showcase: 19 students, 50 consultations, 20 ratings, 6 reviews, 100 symptom logs (288 entries), 405 availability slots.
- `[LocalDB] Bootstrap complete.` → `--bootstrap-only: database ready, exiting without serving.`

### Seed-data bug found & fixed under enforced FKs
First rebuild attempt FATAL'd at showcase step [6/7] with `FOREIGN KEY constraint failed`.
Root cause: `state-showcase.js` generated symptom IDs as a hardcoded `SYM01..SYM48` range, but
the seeded catalog is **not contiguous — `SYM38` does not exist** (confirmed: `Symptom` count 47,
missing `SYM38`). With FKs enforced, any `SymptomLogEntry.SymptomID = 'SYM38'` violates the
`SymptomLogEntry → Symptom` FK. Fix: showcase now sources symptom IDs from
`SELECT SymptomID FROM Symptom` at runtime (symptoms are seeded before showcase), so it can only
reference symptoms that actually exist. Re-run after the fix: clean, exit 0 (output above).

---

## 2. FK-enforcement probes (local.db, standalone `node __probe.mjs`)

All probes **PASSED** (temp probe script removed after the run). Captured evidence:

### PRAGMA foreign_keys (runtime, per-connection)
```
PRAGMA foreign_keys = {"foreign_keys":1}   → ON
```

### CASCADE — delete a seeded student
```
student s999000001 BEFORE: {consult:3, rating:2, reviews:0, slog:6, sentry:17, sz:1}
student s999000001 AFTER : {consult:0, rating:0, reviews:0, slog:0, sentry:0, sz:0}
```
All child rows (Consultation / Rating / NurseReviews / SymptomLog / SymptomLogEntry / StudentZone)
cascaded to 0.

### CASCADE + guard removal — delete a seeded nurse WITH consultations (Decision 1)
```
nurse NUR001 BEFORE: consult=16 avail=135
nurse NUR001 AFTER : consult=0  avail=0
```
Bare `DELETE FROM Nurse WHERE StaffNumber = ?` did **not** throw (the "refuse if the nurse has
appointments" guard is removed); Consultation + NurseAvailability (and onward Rating/NurseReviews/
OnlineConsultationSession) cascaded away.

### ORPHAN INSERT rejection
```
Consultation insert with non-existent StudentNumber            → REJECTED
OnlineConsultationSession insert with bogus AppointmentID       → REJECTED
OnlineConsultationSession insert with a REAL AppointmentID      → ACCEPTED (positive control)
```

### ZONE SET NULL (Decision 2) — delete a CampusZone referenced by SymptomLogs
```
zone ZONE01 BEFORE: symptomlogs-with-zone=17 studentzone=3 totalLogs=94
zone ZONE01 AFTER : symptomlogs-with-zone=0  nulled=17 studentzone=0 totalLogs=94
```
SymptomLog rows **survived** the zone delete (ZoneID set to NULL, not cascade); StudentZone rows for
the deleted zone cascaded away. (totalLogs was 94 here because the preceding student-delete probe had
already cascaded that student's 6 logs; the point is total is unchanged across the zone delete.)

---

## 3. State-switching scripts under enforced FKs — 0 FK errors

```
node src/config/states/state-outbreak.js --local
  → Outbreak simulated: 30 symptom logs (90 entries), 5 appointments clustered in zone ZONE15.
node src/config/states/state-clear-outbreak.js --local
  → Cleared: 30 symptom logs, 90 log entries, 5 appointments.
node src/config/seed-zones-v2.js --local        (standalone zone reseed)
  → Done. 35 Voronoi zones.
```
After the standalone zone reseed, SymptomLogs are preserved:
```
totalLogs=100 logsWithZone=100 zones=35 studentZone=0
```
(seed-zones wipes under FK-checks-off and recreates ZONE01..ZONE35, so existing health logs keep
valid ZoneIDs; StudentZone is cleared as before.) This confirms Decision 2's intent — health history
survives zone reseeds.

---

## Notes / scope
- No column renames: the FK/PK column stays literally `AppointmentID`. One column rename only:
  `OnlineConsultationSession.DurationSeconds → Duration` (type unchanged). The export CSV query aliases
  `cs.Duration AS DurationSeconds` so the JS result-field name is unchanged (minimal blast radius).
- Rename grep is clean of SQL object references: no `(FROM|JOIN|INTO|UPDATE|DELETE FROM|REFERENCES)
  Appointment` in `src/**` (only comments / the intentional drop-retired `DROP TABLE IF EXISTS
  Appointment`), no `ConsultationSession` SQL (only `OnlineConsultationSession` + comments + the
  drop-retired statement), no `DurationSeconds` SQL column (only the JS alias/param names).
- `migrate` is now **destructive** (drop → create → index); it is always chained with the seeds via
  `setup`/`setup:local`/app auto-bootstrap. Documented in `migrate.js` header (Decision 3).
- `PasswordResetToken.UserID` is intentionally left WITHOUT a FK (polymorphic). `deleteStudent` still
  deletes its tokens by hand; the rest now cascades.

> **Superseded by the fix iteration below:** §3 above describes the ORIGINAL
> behavior where seed-zones wiped under FK-checks-off (leaving `logsWithZone=100`).
> Review finding #4 flagged that as a bug — it suppressed the intended
> `ON DELETE SET NULL`. The toggle has since been removed; see §FIX for the
> corrected evidence (`logsWithZone` now goes 100 → 0, logs survive nulled).

---

## FIX ITERATION — review findings addressed (`review.json` CHANGES_REQUESTED)

Engine verified: **local SQLite** (`node:sqlite`, Node per `node -v` in this env). `SESSION_SEED`/`NODE_ENV`
supplied inline for the run only; no secret written to any file. Temporary probe scripts
(`.agents/tasks/schema-fk/*-probe.mjs`) were removed after the run.

### Finding #1 (HIGH) — Aiven `setup` omitted core reseeding → FIXED
`package.json` `setup` now chains showcase:
`migrate && seed-symptoms && seed-zones-v2 && state-showcase`.
Evidence — ran the four scripts as separate processes (mirrors the `&&` chain), then counted rows:
```
Clinic 2 · Admin 1 · Nurse 3 · Student 19 · Consultation 50 · Rating 20 · NurseReviews 6
SymptomLog 100 · SymptomLogEntry 279 · NurseAvailability 405 · CampusZone 35 · Symptom 47
Medication 27 · SymptomMedicationMap 66 · StudentZone 19
→ PASS: all core tables populated (0 empty)
```

### Finding #2 (HIGH) — `SET FOREIGN_KEY_CHECKS` toggles not connection-scoped / failure-safe → FIXED
Removed the `SET FOREIGN_KEY_CHECKS = 0/1` toggles from `migrate.js` (drop phase),
`state-naked.js`, and `seed-symptoms.js`. Rationale (per reviewers' preferred option): the deletes/drops
are already in strict child-first / reverse-dependency order, so enforced FKs are satisfied WITHOUT
suppression — removing the toggle eliminates the MySQL pooled-connection leak (disable on one connection,
re-enable on another) and the "checks left off if a wipe throws" failure mode (no try/finally needed).
Header/inline comments updated to explain why. Verified: full rebuild + seed chain completes with
`56 applied, 0 failed` and 0 FK violations (migrate no longer emits the 2 toggle steps → 56 vs the prior 58).

### Finding #4 (MEDIUM) — zone reseed bypassed `ON DELETE SET NULL` → FIXED
Removed the toggle from `seed-zones-v2.js`; `DELETE FROM StudentZone` then `DELETE FROM CampusZone` now
run with enforcement ON, so `fk_slog_zone ON DELETE SET NULL` fires. Standalone-reseed probe:
```
logs total     before=100 after=100  (survive: true)
logs WITH zone before=100 after=0    nulled now=100
→ PASS: zone reseed SET-NULLed all logs, none deleted
```
This is the direct inversion of the pre-fix `logsWithZone=100` evidence the reviewers cited.

### Finding #3 (MEDIUM) — existing local DB skipped the rebuild → FIXED
`src/app.js` `bootstrapLocalDbIfNeeded({ force })`: `--bootstrap-only` (`setup:local`) now passes
`force: true` and ALWAYS runs migrate → symptoms → zones → showcase, even over an already-seeded
`local.db` (no manual `local.db*` deletion needed). Ordinary `start:local` keeps the conditional
"only if unseeded" guard. Verified: ran `node src/app.js --local --bootstrap-only` TWICE in a row
(DB already seeded on the 2nd run) — the 2nd run still performed the full destructive rebuild +
reseed and exited 0.

### Finding #6 (LOW) — reset-token orphan on student self-delete → FIXED
`profile.deleteStudentAccount` now deletes the student's polymorphic `PasswordResetToken` rows before
`DELETE FROM Student` (symmetry with `admin.deleteStudent`). Behavior-preserving: account deletion still
succeeds; it only additionally clears that student's own single-use/expiring reset tokens.

### FK-enforcement re-probe (post-fix rebuild) — all PASS
```
PRAGMA foreign_keys = ON  ({"foreign_keys":1})
Orphan Consultation insert (non-existent student)              → REJECTED
Student s999000001 delete BEFORE {consult:3,rating:2,review:0,slog:6,sle:15,sz:1}
                           AFTER  {consult:0,rating:0,review:0,slog:0,sle:0,sz:0}  → CASCADE ✓
Zone ZONE01 delete: logsInZone 17→0, totalLogs 94→94, nulled=17                   → SET NULL ✓
→ ALL PROBES PASSED
```

### Findings #5 & #7 (LOW) — no code change (by design)
- #5 (Aiven MySQL rebuild + HTTP E2E role flows / booking smoke test): deferred to the orchestrator's
  post-merge step per plan §6.5 — needs live `.env`/credentials + a running server. MySQL DDL remains
  valid by inspection (unique constraint/index names, matching FK column types, JSON/DECIMAL/tinyint on 8.0).
- #7 (possible redundant explicit indexes on MySQL FK columns): harmless and plan-sanctioned (§5.4);
  the explicit indexes are required for SQLite parity (SQLite does not auto-index FK columns). No change.
