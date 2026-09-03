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
  { name: 'Add OtherText to SymptomLog', sql: `ALTER TABLE SymptomLog ADD COLUMN OtherText varchar(255) NULL` }
];

async function runMigrations() {
  console.log('[Migration] Starting database schema migration...');
  console.log(`[Migration] ${migrations.length} migrations to process.\n`);

  let success = 0;
  let failed = 0;

  for (const migration of migrations) {
    try {
      await query(migration.sql);
      console.log(`  [OK] ${migration.name}`);
      success++;
    } catch (error) {
      // Duplicate column errors are acceptable (migration already applied)
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log(`  [SKIP] ${migration.name} (already exists)`);
        success++;
      } else {
        console.error(`  [FAIL] ${migration.name}: ${error.message}`);
        failed++;
      }
    }
  }

  console.log(`\n[Migration] Complete. ${success} succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runMigrations();
