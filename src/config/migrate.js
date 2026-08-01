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
    name: 'Add Name to MedicalFacility',
    sql: `ALTER TABLE MedicalFacility ADD COLUMN Name varchar(100) NULL`
  },
  {
    name: 'Add ClinicID to MedicalFacility',
    sql: `ALTER TABLE MedicalFacility ADD COLUMN ClinicID varchar(50) NULL`
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
  }
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
