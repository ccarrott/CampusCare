import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { query } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SALT_ROUNDS = 10;

// Tables that have a Password field that needs hashing
const TABLES_WITH_PASSWORDS = ['Student', 'Nurse', 'Admin'];

async function runDynamicSeeder() {
  console.log('[Seeder] Starting systematic database population...');

  try {
    // 1. Read JSON file
    const dataPath = path.join(__dirname, 'seedData.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const seedData = JSON.parse(rawData);

    // 2. Safe deletion order (children first)
    const tableTruncateOrder = [
      'SymptomLog',
      'Rating',
      'Appointment',
      'SymptomMedication',
      'Symptoms',
      'Medication',
      'Student',
      'Nurse',
      'Admin',
      'MedicalFacility',
      'Clinic'
    ];

    console.log('[Seeder] Truncating old records...');
    for (const table of tableTruncateOrder) {
      await query(`DELETE FROM \`${table}\`;`);
    }

    // 3. Insertion order (parents first)
    const tableInsertOrder = [
      'Clinic',
      'MedicalFacility',
      'Admin',
      'Nurse',
      'Student',
      'Symptoms',
      'Medication',
      'SymptomMedication',
      'Appointment',
      'Rating'
    ];

    // 4. Dynamically insert records table by table
    for (const tableName of tableInsertOrder) {
      const records = seedData[tableName];
      if (!records || records.length === 0) continue;

      console.log(`[Seeder] Populating table: ${tableName} (${records.length} records)...`);

      for (const row of records) {
        // Hash password if this table has one
        if (TABLES_WITH_PASSWORDS.includes(tableName) && row.Password) {
          row.Password = await bcrypt.hash(row.Password, SALT_ROUNDS);
        }

        const columns = Object.keys(row).map(c => `\`${c}\``).join(', ');
        const placeholders = Object.keys(row).map(() => '?').join(', ');
        const values = Object.values(row);

        const sql = `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders});`;
        await query(sql, values);
      }
    }

    console.log('[Seeder] Successfully seeded all tables with hashed passwords!');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error] Failed to seed database:');
    console.error(error.message);
    process.exit(1);
  }
}

runDynamicSeeder();
