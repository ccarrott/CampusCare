import { query } from './database.js';
import crypto from 'crypto';

/**
 * Outbreak Simulation Seeder
 * 
 * Generates concentrated SymptomLog entries in a specific zone over the past 7 days.
 * Simulates a flu/illness cluster for map visualisation.
 * 
 * Usage:
 *   node src/config/seed-outbreak.js                    (default: Central, Fever & Chills)
 *   node src/config/seed-outbreak.js --clear            (removes all SymptomLog entries from last 7 days)
 */

const args = process.argv.slice(2);
const shouldClear = args.includes('--clear');

// Configuration
const TARGET_ZONE = 'ZONE06';        // Central (Gqeberha CBD) by default
const PRIMARY_SYMPTOM = 'Fever & Chills';
const SECONDARY_SYMPTOMS = ['Acute Headache', 'Body Aches & Muscle Pain', 'Fatigue & Weakness'];
const ENTRIES_COUNT = 25;

async function clearOutbreak() {
  console.log('[Outbreak] Clearing simulated outbreak entries (OB- prefix only)...');
  const result = await query("DELETE FROM SymptomLog WHERE LogID LIKE 'OB-%'");
  console.log('[Outbreak] Removed all outbreak simulation entries. Real student logs are untouched.');
  process.exit(0);
}

async function simulateOutbreak() {
  console.log(`[Outbreak] Simulating outbreak in zone ${TARGET_ZONE}...`);
  console.log(`[Outbreak] Primary symptom: ${PRIMARY_SYMPTOM}`);

  // Get students in the target zone
  const students = await query(
    'SELECT sz.StudentNumber FROM StudentZone sz WHERE sz.ZoneID = ?',
    [TARGET_ZONE]
  );

  if (students.length === 0) {
    console.error('[Outbreak] No students found in target zone. Run seed-zones.js first.');
    process.exit(1);
  }

  console.log(`[Outbreak] Found ${students.length} students in zone. Generating ${ENTRIES_COUNT} log entries...`);

  const severities = ['Moderate', 'High', 'High', 'Moderate', 'Low'];
  const allSymptoms = [PRIMARY_SYMPTOM, PRIMARY_SYMPTOM, PRIMARY_SYMPTOM, ...SECONDARY_SYMPTOMS];

  const placeholders = [];
  const values = [];

  for (let i = 0; i < ENTRIES_COUNT; i++) {
    const student = students[Math.floor(Math.random() * students.length)];
    const symptom = allSymptoms[Math.floor(Math.random() * allSymptoms.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    // Random date within the last 7 days
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 10) + 8; // between 8am and 6pm
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - daysAgo);
    logDate.setHours(hoursAgo, Math.floor(Math.random() * 60), 0, 0);
    const dateStr = logDate.toISOString().slice(0, 19).replace('T', ' ');

    const logId = 'OB-' + crypto.randomBytes(6).toString('hex');
    placeholders.push('(?, ?, ?, ?, ?)');
    values.push(logId, student.StudentNumber, symptom, severity, dateStr);
  }

  const sql = `INSERT INTO SymptomLog (LogID, StudentNumber, SymptomName, Severity, LogDate) VALUES ${placeholders.join(', ')}`;
  await query(sql, values);

  // Also generate some entries in OTHER zones for contrast (smaller numbers)
  const otherZones = ['ZONE01', 'ZONE03', 'ZONE05'];
  for (const zone of otherZones) {
    const zoneStudents = await query('SELECT StudentNumber FROM StudentZone WHERE ZoneID = ?', [zone]);
    if (zoneStudents.length === 0) continue;

    const extraCount = Math.floor(Math.random() * 4) + 1; // 1-4 entries per zone
    const extraPlaceholders = [];
    const extraValues = [];

    for (let i = 0; i < extraCount; i++) {
      const student = zoneStudents[Math.floor(Math.random() * zoneStudents.length)];
      const symptom = SECONDARY_SYMPTOMS[Math.floor(Math.random() * SECONDARY_SYMPTOMS.length)];
      const daysAgo = Math.floor(Math.random() * 7);
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - daysAgo);
      logDate.setHours(10 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0);
      const dateStr = logDate.toISOString().slice(0, 19).replace('T', ' ');

      const logId = 'OB-' + crypto.randomBytes(6).toString('hex');
      extraPlaceholders.push('(?, ?, ?, ?, ?)');
      extraValues.push(logId, student.StudentNumber, symptom, 'Low', dateStr);
    }

    if (extraPlaceholders.length > 0) {
      await query(`INSERT INTO SymptomLog (LogID, StudentNumber, SymptomName, Severity, LogDate) VALUES ${extraPlaceholders.join(', ')}`, extraValues);
    }
  }

  console.log(`[Outbreak] Generated ${ENTRIES_COUNT} outbreak entries in Central + scattered entries in other zones.`);
  console.log('[Outbreak] Run the app and check /trends to see the map hotspot.');
  process.exit(0);
}

if (shouldClear) {
  clearOutbreak().catch(e => { console.error(e.message); process.exit(1); });
} else {
  simulateOutbreak().catch(e => { console.error(e.message); process.exit(1); });
}
