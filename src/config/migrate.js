import { query } from './database.js';

/**
 * CampusCare - Database Schema Migration Script (Formal Relational Constraints)
 *
 * Run with: node src/config/migrate.js            (Aiven MySQL)
 *           node src/config/migrate.js --local     (local SQLite)
 *
 * ---------------------------------------------------------------------------
 * DESTRUCTIVE REBUILD (Decision 3 / plan §5.3)
 * ---------------------------------------------------------------------------
 * This script is now a DROP-THEN-CREATE rebuild. SQLite cannot `ALTER TABLE
 * ADD CONSTRAINT`, so the only way to introduce real PRIMARY/FOREIGN KEY
 * constraints on BOTH engines from one DDL set is to recreate every table with
 * the constraints baked into the `CREATE TABLE`. As a result:
 *
 *   **Running migrate ALONE WIPES THE DATABASE** — it drops every table and
 *   recreates them EMPTY. It MUST always be chained with the seeds. The npm
 *   scripts (`setup` / `setup:local`) and the app auto-bootstrap in app.js all
 *   do this: migrate -> seed-symptoms -> seed-zones -> showcase.
 *
 * The historical base-schema + ALTER chain + rename pre-migrations are collapsed
 * into the single authoritative, FK-constrained `CREATE TABLE` set below. The
 * renames `Appointment -> Consultation`, `ConsultationSession ->
 * OnlineConsultationSession`, and the column `DurationSeconds -> Duration` are
 * absorbed here (the final names are what the rebuilt schema uses).
 *
 * ---------------------------------------------------------------------------
 * CROSS-ENGINE DDL NOTES (what the adapter normalizes — do NOT hand-branch)
 * ---------------------------------------------------------------------------
 * The single DDL set parses on both MySQL and SQLite because
 * `database.js#translateSql` converts the MySQL-isms we use:
 *   - `ENUM(...)`                         -> `varchar(20)`
 *   - `ALTER TABLE t ADD INDEX name (..)` -> `CREATE INDEX IF NOT EXISTS name ON t (..)`
 *   - backtick identifiers                -> double-quoted
 *   - `SET FOREIGN_KEY_CHECKS = 0/1`      -> `PRAGMA foreign_keys = OFF/ON`
 *
 * Things kept cross-engine-safe by hand:
 *   (a) NO `AUTO_INCREMENT` — every PK is an app-supplied varchar.
 *   (b) `datetime`/`DECIMAL(10,7)`/`text`/`int`/`varchar`/`JSON`/`tinyint(1)`
 *       all accept on SQLite (dynamic typing) and MySQL.
 *   (c) Named `CONSTRAINT fk_... FOREIGN KEY (..) REFERENCES .. ON DELETE ..
 *       ON UPDATE ..` is kept INLINE in the `CREATE TABLE` (SQLite cannot add a
 *       FK via ALTER); both engines accept inline FK clauses.
 *   (d) `DEFAULT CURRENT_TIMESTAMP` accepted by both.
 *
 * NOTE on `SET FOREIGN_KEY_CHECKS`/`PRAGMA foreign_keys` + transactions: SQLite
 * ignores a `PRAGMA foreign_keys` change issued inside an open transaction. Every
 * statement here runs via `query()` OUTSIDE any explicit transaction, so the
 * toggle takes effect — verified on local at implementation time (no "cannot
 * change foreign keys within a transaction" error).
 */

// ---------------------------------------------------------------------------
// DROP-ALL PHASE — reverse dependency order, FK checks OFF.
// ---------------------------------------------------------------------------
// Drops children before parents (belt-and-braces alongside FK-checks-off), then
// also drops the RETIRED pre-rename names so rebuilding on an OLD database that
// still has `Appointment`/`ConsultationSession`/`MedicalFacility` is clean.
const dropPhase = [
  { name: 'Disable FK checks (drop phase)', sql: `SET FOREIGN_KEY_CHECKS = 0` },
  { name: 'Drop PasswordResetToken', sql: `DROP TABLE IF EXISTS PasswordResetToken` },
  { name: 'Drop OnlineConsultationSession', sql: `DROP TABLE IF EXISTS OnlineConsultationSession` },
  { name: 'Drop NurseReviews', sql: `DROP TABLE IF EXISTS NurseReviews` },
  { name: 'Drop Rating', sql: `DROP TABLE IF EXISTS Rating` },
  { name: 'Drop SymptomLogEntry', sql: `DROP TABLE IF EXISTS SymptomLogEntry` },
  { name: 'Drop SymptomLog', sql: `DROP TABLE IF EXISTS SymptomLog` },
  { name: 'Drop SymptomMedicationMap', sql: `DROP TABLE IF EXISTS SymptomMedicationMap` },
  { name: 'Drop StudentZone', sql: `DROP TABLE IF EXISTS StudentZone` },
  { name: 'Drop NurseAvailability', sql: `DROP TABLE IF EXISTS NurseAvailability` },
  { name: 'Drop Consultation', sql: `DROP TABLE IF EXISTS Consultation` },
  { name: 'Drop Admin', sql: `DROP TABLE IF EXISTS Admin` },
  { name: 'Drop Nurse', sql: `DROP TABLE IF EXISTS Nurse` },
  { name: 'Drop Symptom', sql: `DROP TABLE IF EXISTS Symptom` },
  { name: 'Drop Medication', sql: `DROP TABLE IF EXISTS Medication` },
  { name: 'Drop CampusZone', sql: `DROP TABLE IF EXISTS CampusZone` },
  { name: 'Drop Student', sql: `DROP TABLE IF EXISTS Student` },
  { name: 'Drop Clinic', sql: `DROP TABLE IF EXISTS Clinic` },
  // Retired pre-rename / pre-cleanup names — drop so an OLD db rebuilds clean.
  { name: 'Drop retired ConsultationSession', sql: `DROP TABLE IF EXISTS ConsultationSession` },
  { name: 'Drop retired Appointment', sql: `DROP TABLE IF EXISTS Appointment` },
  { name: 'Drop retired MedicalFacility', sql: `DROP TABLE IF EXISTS MedicalFacility` },
  { name: 'Re-enable FK checks (drop phase)', sql: `SET FOREIGN_KEY_CHECKS = 1` }
];

// ---------------------------------------------------------------------------
// CREATE PHASE — dependency order (parents first), FK clauses INLINE.
// ---------------------------------------------------------------------------
const createPhase = [
  // ---- Level 0: no FK dependencies ----
  {
    name: 'Create Clinic table',
    sql: `CREATE TABLE Clinic (
      RegNum varchar(50) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Address varchar(255) NULL,
      TelephoneNumber varchar(30) NULL,
      Email varchar(100) NULL
    )`
  },
  {
    name: 'Create Student table',
    sql: `CREATE TABLE Student (
      StudentNumber varchar(20) PRIMARY KEY,
      FirstName varchar(50) NOT NULL,
      LastName varchar(50) NOT NULL,
      MedicalHistory text NULL,
      Password varchar(100) NOT NULL DEFAULT '',
      Latitude DECIMAL(10,7) NULL,
      Longitude DECIMAL(10,7) NULL
    )`
  },
  {
    name: 'Create CampusZone table',
    sql: `CREATE TABLE CampusZone (
      ZoneID varchar(20) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Latitude DECIMAL(10,7) NULL,
      Longitude DECIMAL(10,7) NULL,
      Radius int NULL,
      Boundary JSON NULL
    )`
  },
  {
    name: 'Create Medication table',
    sql: `CREATE TABLE Medication (
      MedicationCode varchar(10) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Description text NULL
    )`
  },
  {
    name: 'Create Symptom table',
    sql: `CREATE TABLE Symptom (
      SymptomID varchar(10) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Category varchar(30) NOT NULL,
      Tier int DEFAULT 1,
      Description text NULL
    )`
  },
  // ---- Level 1: children of level-0 ----
  {
    name: 'Create Nurse table',
    sql: `CREATE TABLE Nurse (
      StaffNumber varchar(20) PRIMARY KEY,
      FirstName varchar(50) NOT NULL,
      LastName varchar(50) NOT NULL,
      PhoneNumber varchar(30) NULL,
      Password varchar(100) NOT NULL DEFAULT 'changeme',
      Email varchar(100) NULL,
      ClinicID varchar(50) NULL,
      Campus varchar(50) NULL,
      Bio text NULL,
      YearsExperience int DEFAULT 0,
      CONSTRAINT fk_nurse_clinic FOREIGN KEY (ClinicID) REFERENCES Clinic(RegNum)
        ON DELETE SET NULL ON UPDATE CASCADE
    )`
  },
  {
    name: 'Create Admin table',
    sql: `CREATE TABLE Admin (
      StaffNumber varchar(20) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Password varchar(100) NOT NULL DEFAULT 'changeme',
      Email varchar(100) NULL
    )`
  },
  // ---- Level 2: Consultation (renamed from Appointment; AppointmentID is the PK) ----
  {
    name: 'Create Consultation table',
    sql: `CREATE TABLE Consultation (
      AppointmentID varchar(50) PRIMARY KEY,
      AppointmentType varchar(20) NOT NULL,
      Time datetime NOT NULL,
      TeamsID varchar(255) NULL,
      Status varchar(20) DEFAULT 'Pending',
      Notes text NULL,
      CreatedAt datetime DEFAULT CURRENT_TIMESTAMP,
      Campus varchar(50) NULL,
      PreferredLanguage varchar(50) NULL,
      RoomName varchar(80) NULL,
      RoomUrl varchar(255) NULL,
      RoomExp datetime NULL,
      StudentNumber varchar(20) NOT NULL,
      StaffNumber varchar(20) NOT NULL,
      CONSTRAINT fk_consult_student FOREIGN KEY (StudentNumber) REFERENCES Student(StudentNumber)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_consult_nurse FOREIGN KEY (StaffNumber) REFERENCES Nurse(StaffNumber)
        ON DELETE CASCADE ON UPDATE CASCADE
    )`
  },
  // ---- Level 2: other children of level-0/1 ----
  {
    name: 'Create NurseAvailability table',
    sql: `CREATE TABLE NurseAvailability (
      AvailabilityID varchar(50) PRIMARY KEY,
      StaffNumber varchar(20) NOT NULL,
      DayOfWeek varchar(20) NOT NULL,
      TimeSlot varchar(20) NOT NULL,
      Status varchar(20) NOT NULL DEFAULT 'Available',
      CONSTRAINT fk_avail_nurse FOREIGN KEY (StaffNumber) REFERENCES Nurse(StaffNumber)
        ON DELETE CASCADE ON UPDATE CASCADE
    )`
  },
  {
    name: 'Create StudentZone table',
    sql: `CREATE TABLE StudentZone (
      StudentNumber varchar(20) NOT NULL,
      ZoneID varchar(20) NOT NULL,
      PRIMARY KEY (StudentNumber, ZoneID),
      CONSTRAINT fk_sz_student FOREIGN KEY (StudentNumber) REFERENCES Student(StudentNumber)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_sz_zone FOREIGN KEY (ZoneID) REFERENCES CampusZone(ZoneID)
        ON DELETE CASCADE ON UPDATE CASCADE
    )`
  },
  {
    name: 'Create SymptomMedicationMap table',
    sql: `CREATE TABLE SymptomMedicationMap (
      SymptomID varchar(10) NOT NULL,
      MedicationCode varchar(10) NOT NULL,
      PRIMARY KEY (SymptomID, MedicationCode),
      CONSTRAINT fk_smm_symptom FOREIGN KEY (SymptomID) REFERENCES Symptom(SymptomID)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_smm_med FOREIGN KEY (MedicationCode) REFERENCES Medication(MedicationCode)
        ON DELETE CASCADE ON UPDATE CASCADE
    )`
  },
  {
    // Notes column retained NULLable for backward-compat; nothing writes it now,
    // and seeding never sets it, so it stays harmless. (plan item 1b)
    name: 'Create SymptomLog table',
    sql: `CREATE TABLE SymptomLog (
      LogID varchar(50) PRIMARY KEY,
      StudentNumber varchar(20) NOT NULL,
      SymptomName varchar(100) NOT NULL,
      Severity varchar(20) NOT NULL,
      LogDate datetime DEFAULT CURRENT_TIMESTAMP,
      Notes text NULL,
      Duration varchar(20) NULL,
      Trajectory varchar(20) NULL,
      OtherText varchar(255) NULL,
      Latitude DECIMAL(10,7) NULL,
      Longitude DECIMAL(10,7) NULL,
      ZoneID varchar(20) NULL,
      CONSTRAINT fk_slog_student FOREIGN KEY (StudentNumber) REFERENCES Student(StudentNumber)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_slog_zone FOREIGN KEY (ZoneID) REFERENCES CampusZone(ZoneID)
        ON DELETE SET NULL ON UPDATE CASCADE
    )`
  },
  // ---- Level 3: children of Consultation / SymptomLog ----
  {
    name: 'Create SymptomLogEntry table',
    sql: `CREATE TABLE SymptomLogEntry (
      LogID varchar(50) NOT NULL,
      SymptomID varchar(10) NOT NULL,
      PRIMARY KEY (LogID, SymptomID),
      CONSTRAINT fk_sle_log FOREIGN KEY (LogID) REFERENCES SymptomLog(LogID)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_sle_symptom FOREIGN KEY (SymptomID) REFERENCES Symptom(SymptomID)
        ON DELETE CASCADE ON UPDATE CASCADE
    )`
  },
  {
    name: 'Create Rating table',
    sql: `CREATE TABLE Rating (
      RatingID varchar(50) PRIMARY KEY,
      AppointmentID varchar(50) NOT NULL,
      Score int NOT NULL,
      RatingDescription text NULL,
      StudentNumber varchar(20) NULL,
      CreatedAt datetime DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_rating_consult FOREIGN KEY (AppointmentID) REFERENCES Consultation(AppointmentID)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_rating_student FOREIGN KEY (StudentNumber) REFERENCES Student(StudentNumber)
        ON DELETE CASCADE ON UPDATE CASCADE
    )`
  },
  {
    name: 'Create NurseReviews table',
    sql: `CREATE TABLE NurseReviews (
      ReviewID varchar(50) PRIMARY KEY,
      AppointmentID varchar(50) NOT NULL,
      StudentNumber varchar(20) NOT NULL,
      StaffNumber varchar(20) NOT NULL,
      Rating int NOT NULL,
      ReviewText text NOT NULL,
      Verified varchar(20) DEFAULT 'Pending',
      VerifiedAt datetime NULL,
      CreatedAt datetime DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_review_consult FOREIGN KEY (AppointmentID) REFERENCES Consultation(AppointmentID)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_review_student FOREIGN KEY (StudentNumber) REFERENCES Student(StudentNumber)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_review_nurse FOREIGN KEY (StaffNumber) REFERENCES Nurse(StaffNumber)
        ON DELETE CASCADE ON UPDATE CASCADE
    )`
  },
  {
    // Renamed from ConsultationSession; DurationSeconds column renamed to Duration.
    name: 'Create OnlineConsultationSession table',
    sql: `CREATE TABLE OnlineConsultationSession (
      SessionID varchar(50) PRIMARY KEY,
      AppointmentID varchar(50) NOT NULL,
      RoomName varchar(80) NOT NULL,
      StartedAt datetime NULL,
      EndedAt datetime NULL,
      Duration int NULL,
      NurseJoinedAt datetime NULL,
      StudentJoinedAt datetime NULL,
      CreatedAt datetime DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_ocs_consult FOREIGN KEY (AppointmentID) REFERENCES Consultation(AppointmentID)
        ON DELETE CASCADE ON UPDATE CASCADE
    )`
  },
  // ---- Level 4: polymorphic, intentionally UNCONSTRAINED (Decision 5 / spec §5) ----
  {
    // UserID is polymorphic — it points at Student OR Nurse OR Admin via UserType,
    // which a single FK cannot express. It is DELIBERATELY left without a FK.
    name: 'Create PasswordResetToken table',
    sql: `CREATE TABLE PasswordResetToken (
      TokenID varchar(50) PRIMARY KEY,
      UserID varchar(20) NOT NULL,
      UserType varchar(20) NOT NULL,
      Token varchar(255) NOT NULL,
      ExpiresAt datetime NOT NULL,
      Used tinyint(1) NOT NULL DEFAULT 0
    )`
  }
];

// ---------------------------------------------------------------------------
// INDEX PHASE — preserve ALL existing performance indexes AND add an explicit
// index on every FK column (Decision 4 / spec §5.4). SQLite does NOT auto-index
// FK columns, so these are required there; on MySQL `ADD INDEX` is native and a
// duplicate is caught by `isAlreadyApplied` (ER_DUP_KEYNAME). The adapter rewrites
// `ALTER TABLE .. ADD INDEX` to `CREATE INDEX IF NOT EXISTS` for SQLite.
//
// FK-column indexes that would be a redundant left-prefix of a preserved perf
// index are skipped (noted inline).
const indexPhase = [
  // -- Preserved performance indexes (renamed object -> Consultation) --
  { name: 'Index Consultation (StaffNumber, Time)', sql: `ALTER TABLE Consultation ADD INDEX idx_consult_staff_time (StaffNumber, Time)` },
  { name: 'Index Consultation StudentNumber', sql: `ALTER TABLE Consultation ADD INDEX idx_consult_student (StudentNumber)` },
  { name: 'Index Consultation RoomName', sql: `ALTER TABLE Consultation ADD INDEX idx_consult_roomname (RoomName)` },
  { name: 'Index SymptomLog LogDate', sql: `ALTER TABLE SymptomLog ADD INDEX idx_symptomlog_logdate (LogDate)` },
  { name: 'Index SymptomLog StudentNumber', sql: `ALTER TABLE SymptomLog ADD INDEX idx_symptomlog_student (StudentNumber)` },
  { name: 'Index SymptomLogEntry SymptomID', sql: `ALTER TABLE SymptomLogEntry ADD INDEX idx_symptomlogentry_symptom (SymptomID)` },
  { name: 'Index NurseReviews StaffNumber', sql: `ALTER TABLE NurseReviews ADD INDEX idx_nursereviews_staff (StaffNumber)` },
  { name: 'Index PasswordResetToken Token', sql: `ALTER TABLE PasswordResetToken ADD INDEX idx_resettoken_token (Token)` },
  // -- Explicit FK-column indexes (skip those a perf index already left-prefixes:
  //    Consultation.StaffNumber -> idx_consult_staff_time, Consultation.StudentNumber
  //    -> idx_consult_student, SymptomLog.StudentNumber -> idx_symptomlog_student,
  //    SymptomLogEntry.SymptomID -> idx_symptomlogentry_symptom, NurseReviews.StaffNumber
  //    -> idx_nursereviews_staff) --
  { name: 'Index Nurse ClinicID (FK)', sql: `ALTER TABLE Nurse ADD INDEX idx_nurse_clinic (ClinicID)` },
  { name: 'Index NurseAvailability StaffNumber (FK)', sql: `ALTER TABLE NurseAvailability ADD INDEX idx_avail_staff (StaffNumber)` },
  { name: 'Index StudentZone ZoneID (FK)', sql: `ALTER TABLE StudentZone ADD INDEX idx_sz_zone (ZoneID)` },
  { name: 'Index SymptomMedicationMap MedicationCode (FK)', sql: `ALTER TABLE SymptomMedicationMap ADD INDEX idx_smm_med (MedicationCode)` },
  { name: 'Index SymptomLog ZoneID (FK)', sql: `ALTER TABLE SymptomLog ADD INDEX idx_slog_zone (ZoneID)` },
  { name: 'Index SymptomLogEntry LogID (FK)', sql: `ALTER TABLE SymptomLogEntry ADD INDEX idx_sle_log (LogID)` },
  { name: 'Index Rating AppointmentID (FK)', sql: `ALTER TABLE Rating ADD INDEX idx_rating_consult (AppointmentID)` },
  { name: 'Index Rating StudentNumber (FK)', sql: `ALTER TABLE Rating ADD INDEX idx_rating_student (StudentNumber)` },
  { name: 'Index NurseReviews AppointmentID (FK)', sql: `ALTER TABLE NurseReviews ADD INDEX idx_review_consult (AppointmentID)` },
  { name: 'Index NurseReviews StudentNumber (FK)', sql: `ALTER TABLE NurseReviews ADD INDEX idx_review_student (StudentNumber)` },
  { name: 'Index OnlineConsultationSession AppointmentID (FK)', sql: `ALTER TABLE OnlineConsultationSession ADD INDEX idx_ocs_consult (AppointmentID)` }
];

// MySQL error codes that mean "this step is already applied". Re-running the
// script must be a no-op, not a failure — the setup scripts chain migrate && seed,
// so a non-zero exit here would stop the seeds from ever running. (The drop phase
// uses IF EXISTS and the create phase on a fresh DB never duplicates; these codes
// cover a re-run that races a partially-created schema and the index phase.)
const ALREADY_APPLIED = new Set([
  'ER_DUP_FIELDNAME',          // ADD COLUMN — column already there
  'ER_DUP_KEYNAME',            // ADD INDEX  — index already there
  'ER_CANT_DROP_FIELD_OR_KEY', // DROP COLUMN — already dropped
  'ER_TABLE_EXISTS_ERROR',     // CREATE TABLE — table already there
  'ER_BAD_FIELD_ERROR'         // referenced column already gone
]);

// MySQL signals "already applied" via error codes; SQLite (node:sqlite) via
// message text. Treat both as idempotent no-ops so a re-run is safe on either
// engine.
function isAlreadyApplied(error) {
  if (ALREADY_APPLIED.has(error.code)) return true;
  const m = (error.message || '').toLowerCase();
  return m.includes('duplicate column name')   // ADD COLUMN already there
      || m.includes('already exists')          // CREATE TABLE / CREATE INDEX
      || m.includes('no such column')          // DROP COLUMN already gone
      || m.includes('no such table');          // DROP on absent table
}

async function runStep(step) {
  try {
    await query(step.sql);
    console.log(`  [OK] ${step.name}`);
    return 'ok';
  } catch (error) {
    if (isAlreadyApplied(error)) {
      console.log(`  [SKIP] ${step.name} (already applied)`);
      return 'skip';
    }
    console.error(`  [FAIL] ${step.name}: ${error.message}`);
    return 'fail';
  }
}

// `exitOnDone` lets the CLI (`npm run migrate`) exit the process as before, while
// the programmatic auto-bootstrap path in app.js can run migrations and keep going.
export async function runMigrations({ exitOnDone = true } = {}) {
  console.log('[Migration] Starting DESTRUCTIVE schema rebuild (drop -> create -> index)...');
  console.log('[Migration] NOTE: this DROPS every table and recreates it EMPTY. Always chain with the seeds.');
  console.log(`[Migration] ${dropPhase.length} drop steps + ${createPhase.length} create steps + ${indexPhase.length} index steps.\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  const tally = (result) => {
    if (result === 'ok') success++;
    else if (result === 'skip') skipped++;
    else failed++;
  };

  console.log('  -- drop phase (reverse dependency order, FK checks off) --');
  for (const step of dropPhase) tally(await runStep(step));

  console.log('\n  -- create phase (dependency order, FK clauses inline) --');
  for (const step of createPhase) tally(await runStep(step));

  console.log('\n  -- index phase (perf indexes + FK-column indexes) --');
  for (const step of indexPhase) tally(await runStep(step));

  console.log(`\n[Migration] Complete. ${success} applied, ${skipped} already in place, ${failed} failed.`);
  if (exitOnDone) process.exit(failed > 0 ? 1 : 0);
  return { success, skipped, failed };
}

// CLI entry point only — importing this module (auto-bootstrap) must NOT run or exit.
if (process.argv[1]?.includes('migrate')) {
  runMigrations();
}
