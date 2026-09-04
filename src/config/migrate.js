import { query } from './database.js';

/**
 * CampusCare - Database Schema Migration Script
 * 
 * Run with: node src/config/migrate.js
 * 
 * This script applies all pending ALTER TABLE statements to bring the
 * database schema up to the required state for full application functionality.
 * 
 * Safe to run multiple times — uses IF NOT EXISTS and MODIFY where possible.
 */

// ---------------------------------------------------------------------------
// BASE SCHEMA
// ---------------------------------------------------------------------------
// The ALTER chain below assumes the core tables already exist. On the original
// development database they did (created by hand), but a FRESH deployment target —
// a brand-new managed MySQL instance — has nothing, and every ALTER would fail with
// "table doesn't exist", leaving `npm run setup` unable to initialise anything.
//
// These statements create the core tables in their ORIGINAL shape, so the migration
// chain that follows replays exactly as it did historically and ends at the same
// final schema. On an existing database every one is a no-op (IF NOT EXISTS).
const baseSchema = [
  {
    name: 'Create Clinic table',
    sql: `CREATE TABLE IF NOT EXISTS Clinic (
      RegNum varchar(50) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Address varchar(255) NULL,
      TelephoneNumber varchar(30) NULL,
      Email varchar(100) NULL
    )`
  },
  {
    name: 'Create Student table',
    sql: `CREATE TABLE IF NOT EXISTS Student (
      StudentNumber varchar(20) PRIMARY KEY,
      FirstName varchar(50) NOT NULL,
      LastName varchar(50) NOT NULL,
      Email varchar(100) NULL,
      Address varchar(255) NULL,
      MedicalHistory text NULL,
      Password varchar(100) NOT NULL DEFAULT ''
    )`
  },
  {
    name: 'Create Nurse table',
    sql: `CREATE TABLE IF NOT EXISTS Nurse (
      StaffNumber varchar(20) PRIMARY KEY,
      FirstName varchar(50) NOT NULL,
      LastName varchar(50) NOT NULL,
      PhoneNumber varchar(30) NULL,
      Address varchar(255) NULL
    )`
  },
  {
    name: 'Create Admin table',
    sql: `CREATE TABLE IF NOT EXISTS Admin (
      StaffNumber varchar(20) PRIMARY KEY,
      Name varchar(100) NOT NULL
    )`
  },
  {
    name: 'Create Appointment table',
    sql: `CREATE TABLE IF NOT EXISTS Appointment (
      AppointmentID varchar(50) PRIMARY KEY,
      AppointmentType varchar(20) NOT NULL,
      Time datetime NOT NULL,
      TeamsID varchar(255) NULL,
      StudentNumber varchar(20) NOT NULL,
      StaffNumber varchar(20) NOT NULL
    )`
  },
  {
    name: 'Create Rating table',
    sql: `CREATE TABLE IF NOT EXISTS Rating (
      RatingID varchar(50) PRIMARY KEY,
      AppointmentID varchar(50) NOT NULL,
      Score int NOT NULL,
      RatingDescription text NULL
    )`
  },
  {
    name: 'Create Medication table',
    sql: `CREATE TABLE IF NOT EXISTS Medication (
      MedicationCode varchar(10) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Description text NULL,
      SymptomsTreated text NULL
    )`
  },
  {
    name: 'Create CampusZone table',
    sql: `CREATE TABLE IF NOT EXISTS CampusZone (
      ZoneID varchar(20) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Latitude DECIMAL(10,7) NULL,
      Longitude DECIMAL(10,7) NULL,
      Radius int NULL
    )`
  },
  {
    name: 'Create StudentZone table',
    sql: `CREATE TABLE IF NOT EXISTS StudentZone (
      StudentNumber varchar(20) NOT NULL,
      ZoneID varchar(20) NOT NULL,
      PRIMARY KEY (StudentNumber, ZoneID)
    )`
  },
  {
    name: 'Create NurseAvailability table',
    sql: `CREATE TABLE IF NOT EXISTS NurseAvailability (
      AvailabilityID varchar(50) PRIMARY KEY,
      StaffNumber varchar(20) NOT NULL,
      DayOfWeek varchar(20) NOT NULL,
      TimeSlot varchar(20) NOT NULL,
      Status varchar(20) NOT NULL DEFAULT 'Available'
    )`
  },
  {
    name: 'Create PasswordResetToken table',
    sql: `CREATE TABLE IF NOT EXISTS PasswordResetToken (
      TokenID varchar(50) PRIMARY KEY,
      UserID varchar(20) NOT NULL,
      UserType varchar(20) NOT NULL,
      Token varchar(255) NOT NULL,
      ExpiresAt datetime NOT NULL,
      Used tinyint(1) NOT NULL DEFAULT 0
    )`
  }
];

const migrations = [
  {
    name: 'Add Password to Nurse',
    sql: `ALTER TABLE Nurse ADD COLUMN Password varchar(100) NOT NULL DEFAULT 'changeme'`
  },
  {
    name: 'Add Email to Nurse',
    sql: `ALTER TABLE Nurse ADD COLUMN Email varchar(100) NULL`
  },
  {
    name: 'Add ClinicID to Nurse',
    sql: `ALTER TABLE Nurse ADD COLUMN ClinicID varchar(50) NULL`
  },
  {
    name: 'Add Password to Admin',
    sql: `ALTER TABLE Admin ADD COLUMN Password varchar(100) NOT NULL DEFAULT 'changeme'`
  },
  {
    name: 'Add Email to Admin',
    sql: `ALTER TABLE Admin ADD COLUMN Email varchar(100) NULL`
  },
  {
    name: 'Add Status to Appointment',
    sql: `ALTER TABLE Appointment ADD COLUMN Status varchar(20) DEFAULT 'Pending'`
  },
  {
    name: 'Add Notes to Appointment',
    sql: `ALTER TABLE Appointment ADD COLUMN Notes text NULL`
  },
  {
    name: 'Add CreatedAt to Appointment',
    sql: `ALTER TABLE Appointment ADD COLUMN CreatedAt datetime DEFAULT CURRENT_TIMESTAMP`
  },
  {
    name: 'Add StudentNumber to Rating',
    sql: `ALTER TABLE Rating ADD COLUMN StudentNumber varchar(20) NULL`
  },
  {
    name: 'Add CreatedAt to Rating',
    sql: `ALTER TABLE Rating ADD COLUMN CreatedAt datetime DEFAULT CURRENT_TIMESTAMP`
  },
  {
    name: 'Add FacilityID to Medication',
    sql: `ALTER TABLE Medication ADD COLUMN FacilityID varchar(50) NULL`
  },
  {
    name: 'Add ExpiryDate to Medication',
    sql: `ALTER TABLE Medication ADD COLUMN ExpiryDate date NULL`
  },
  {
    name: 'Add StockQuantity to Medication',
    sql: `ALTER TABLE Medication ADD COLUMN StockQuantity int DEFAULT 0`
  },
  {
    name: 'Create SymptomLog table',
    sql: `CREATE TABLE IF NOT EXISTS SymptomLog (
      LogID varchar(50) PRIMARY KEY,
      StudentNumber varchar(20) NOT NULL,
      SymptomName varchar(100) NOT NULL,
      Severity varchar(20) NOT NULL,
      LogDate datetime DEFAULT CURRENT_TIMESTAMP,
      Notes text NULL
    )`
  },
  {
    name: 'Add Campus to Appointment',
    sql: `ALTER TABLE Appointment ADD COLUMN Campus varchar(50) NULL`
  },
  {
    name: 'Add PreferredLanguage to Appointment',
    sql: `ALTER TABLE Appointment ADD COLUMN PreferredLanguage varchar(50) NULL`
  },
  {
    name: 'Create NurseReviews table',
    sql: `CREATE TABLE IF NOT EXISTS NurseReviews (
      ReviewID varchar(50) PRIMARY KEY,
      AppointmentID varchar(50) NOT NULL,
      StudentNumber varchar(20) NOT NULL,
      StaffNumber varchar(20) NOT NULL,
      Rating int NOT NULL,
      ReviewText text NOT NULL,
      CreatedAt datetime DEFAULT CURRENT_TIMESTAMP
    )`
  },
  // Phase 19: Review moderation + nurse profile fields
  {
    name: 'Add Bio to Nurse',
    sql: `ALTER TABLE Nurse ADD COLUMN Bio text NULL`
  },
  {
    name: 'Add YearsExperience to Nurse',
    sql: `ALTER TABLE Nurse ADD COLUMN YearsExperience int DEFAULT 0`
  },
  {
    name: 'Add Verified to NurseReviews',
    sql: `ALTER TABLE NurseReviews ADD COLUMN Verified ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'`
  },
  {
    name: 'Add VerifiedAt to NurseReviews',
    sql: `ALTER TABLE NurseReviews ADD COLUMN VerifiedAt datetime NULL`
  },
  // Phase 22: Symptom system overhaul + 3NF cleanup
  {
    name: 'Create Symptom table (atomic, tag-based)',
    sql: `CREATE TABLE IF NOT EXISTS Symptom (
      SymptomID varchar(10) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Category varchar(30) NOT NULL,
      Tier int DEFAULT 1,
      Description text NULL
    )`
  },
  {
    name: 'Create new SymptomMedicationMap (SymptomID ↔ MedicationCode)',
    sql: `CREATE TABLE IF NOT EXISTS SymptomMedicationMap (
      SymptomID varchar(10) NOT NULL,
      MedicationCode varchar(10) NOT NULL,
      PRIMARY KEY (SymptomID, MedicationCode)
    )`
  },
  {
    name: 'Create SymptomLogEntry join table (multi-select per log)',
    sql: `CREATE TABLE IF NOT EXISTS SymptomLogEntry (
      LogID varchar(50) NOT NULL,
      SymptomID varchar(10) NOT NULL,
      PRIMARY KEY (LogID, SymptomID)
    )`
  },
  {
    name: 'Drop Student.Email column',
    sql: `ALTER TABLE Student DROP COLUMN Email`
  },
  {
    name: 'Drop Medication.SymptomsTreated column',
    sql: `ALTER TABLE Medication DROP COLUMN SymptomsTreated`
  },
  // Pre-Phase 23: Map & Location System Overhaul
  {
    name: 'Add Latitude to Student',
    sql: `ALTER TABLE Student ADD COLUMN Latitude DECIMAL(10, 7) NULL`
  },
  {
    name: 'Add Longitude to Student',
    sql: `ALTER TABLE Student ADD COLUMN Longitude DECIMAL(10, 7) NULL`
  },
  {
    name: 'Add Boundary JSON to CampusZone',
    sql: `ALTER TABLE CampusZone ADD COLUMN Boundary JSON NULL`
  },
  {
    name: 'Drop Student.Address column',
    sql: `ALTER TABLE Student DROP COLUMN Address`
  },
  // Phase 28: Daily.co video consultations (replaces manual Teams links)
  {
    name: 'Add RoomName to Appointment',
    sql: `ALTER TABLE Appointment ADD COLUMN RoomName varchar(80) NULL`
  },
  {
    name: 'Add RoomUrl to Appointment',
    sql: `ALTER TABLE Appointment ADD COLUMN RoomUrl varchar(255) NULL`
  },
  {
    name: 'Add RoomExp to Appointment',
    sql: `ALTER TABLE Appointment ADD COLUMN RoomExp datetime NULL`
  },
  {
    name: 'Create ConsultationSession table',
    sql: `CREATE TABLE IF NOT EXISTS ConsultationSession (
      SessionID varchar(50) PRIMARY KEY,
      AppointmentID varchar(50) NOT NULL,
      RoomName varchar(80) NOT NULL,
      StartedAt datetime NULL,
      EndedAt datetime NULL,
      DurationSeconds int NULL,
      NurseJoinedAt datetime NULL,
      StudentJoinedAt datetime NULL,
      CreatedAt datetime DEFAULT CURRENT_TIMESTAMP
    )`
  },
  // Phase 29A: nurse location becomes a campus (dropdown), replacing free-text Address
  {
    name: 'Add Campus to Nurse',
    sql: `ALTER TABLE Nurse ADD COLUMN Campus varchar(50) NULL`
  },
  {
    name: 'Drop Nurse.Address column',
    sql: `ALTER TABLE Nurse DROP COLUMN Address`
  },
  {
    name: 'Drop unused MedicalFacility table',
    sql: `DROP TABLE IF EXISTS MedicalFacility`
  },
  { name: 'Drop unused Medication.FacilityID', sql: `ALTER TABLE Medication DROP COLUMN FacilityID` },
  { name: 'Drop unused Medication.ExpiryDate', sql: `ALTER TABLE Medication DROP COLUMN ExpiryDate` },
  { name: 'Drop unused Medication.StockQuantity', sql: `ALTER TABLE Medication DROP COLUMN StockQuantity` },
  // Phase 29B: symptom-checker intelligence fields
  { name: 'Add Duration to SymptomLog', sql: `ALTER TABLE SymptomLog ADD COLUMN Duration varchar(20) NULL` },
  { name: 'Add Trajectory to SymptomLog', sql: `ALTER TABLE SymptomLog ADD COLUMN Trajectory varchar(20) NULL` },
  { name: 'Add OtherText to SymptomLog', sql: `ALTER TABLE SymptomLog ADD COLUMN OtherText varchar(255) NULL` },
  // Phase 30G: per-report location snapshot — powers the MapLibre density heatmap.
  // We snapshot the reporting student's coordinates + resolved zone AT report time,
  // so the map reflects where symptoms were actually reported (students move zones).
  { name: 'Add Latitude to SymptomLog', sql: `ALTER TABLE SymptomLog ADD COLUMN Latitude DECIMAL(10,7) NULL` },
  { name: 'Add Longitude to SymptomLog', sql: `ALTER TABLE SymptomLog ADD COLUMN Longitude DECIMAL(10,7) NULL` },
  { name: 'Add ZoneID to SymptomLog', sql: `ALTER TABLE SymptomLog ADD COLUMN ZoneID varchar(20) NULL` },
  { name: 'Index SymptomLog LogDate', sql: `ALTER TABLE SymptomLog ADD INDEX idx_symptomlog_logdate (LogDate)` },
  // Indexes for the hot lookups: slot contention on booking, per-user history,
  // trend rollups and reset-token validation all scan these columns today.
  { name: 'Index Appointment (StaffNumber, Time)', sql: `ALTER TABLE Appointment ADD INDEX idx_appointment_staff_time (StaffNumber, Time)` },
  { name: 'Index Appointment StudentNumber', sql: `ALTER TABLE Appointment ADD INDEX idx_appointment_student (StudentNumber)` },
  { name: 'Index Appointment RoomName', sql: `ALTER TABLE Appointment ADD INDEX idx_appointment_roomname (RoomName)` },
  { name: 'Index SymptomLog StudentNumber', sql: `ALTER TABLE SymptomLog ADD INDEX idx_symptomlog_student (StudentNumber)` },
  { name: 'Index SymptomLogEntry SymptomID', sql: `ALTER TABLE SymptomLogEntry ADD INDEX idx_symptomlogentry_symptom (SymptomID)` },
  { name: 'Index NurseReviews StaffNumber', sql: `ALTER TABLE NurseReviews ADD INDEX idx_nursereviews_staff (StaffNumber)` },
  { name: 'Index PasswordResetToken Token', sql: `ALTER TABLE PasswordResetToken ADD INDEX idx_resettoken_token (Token)` }
];

// MySQL error codes that mean "this migration is already applied". Re-running the
// script must be a no-op, not a failure — `npm run setup` chains migrate && seed,
// so a non-zero exit here would stop the seeds from ever running.
const ALREADY_APPLIED = new Set([
  'ER_DUP_FIELDNAME',          // ADD COLUMN — column already there
  'ER_DUP_KEYNAME',            // ADD INDEX  — index already there
  'ER_CANT_DROP_FIELD_OR_KEY', // DROP COLUMN — already dropped
  'ER_TABLE_EXISTS_ERROR',     // CREATE TABLE — table already there
  'ER_BAD_FIELD_ERROR'         // referenced column already gone
]);

async function runStep(step) {
  try {
    await query(step.sql);
    console.log(`  [OK] ${step.name}`);
    return 'ok';
  } catch (error) {
    if (ALREADY_APPLIED.has(error.code)) {
      console.log(`  [SKIP] ${step.name} (already applied)`);
      return 'skip';
    }
    console.error(`  [FAIL] ${step.name}: ${error.message}`);
    return 'fail';
  }
}

async function runMigrations() {
  console.log('[Migration] Starting database schema migration...');
  console.log(`[Migration] ${baseSchema.length} base tables + ${migrations.length} migrations to process.\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  console.log('  -- base schema --');
  for (const step of [...baseSchema, ...migrations]) {
    if (step === migrations[0]) console.log('\n  -- migrations --');
    const result = await runStep(step);
    if (result === 'ok') success++;
    else if (result === 'skip') skipped++;
    else failed++;
  }

  console.log(`\n[Migration] Complete. ${success} applied, ${skipped} already in place, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runMigrations();
