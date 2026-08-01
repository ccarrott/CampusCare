import { query } from './database.js';
import crypto from 'crypto';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Generate 27 time slots: 15-min sessions with 5-min breaks
const TIME_SLOTS = [];
for (let hour = 8; hour <= 16; hour++) {
  for (const startMin of [0, 20, 40]) {
    const endMin = startMin + 15;
    const start = `${String(hour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const end = `${String(hour + (endMin >= 60 ? 1 : 0)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    if (hour < 17) {
      TIME_SLOTS.push(`${start}-${end}`);
    }
  }
}

// Random unavailability: each nurse has ~20% slots unavailable
function isUnavailable() {
  return Math.random() < 0.2;
}

async function seedAvailability() {
  console.log('[Seeder] Populating NurseAvailability (27 slots × 5 days × 3 nurses)...');

  await query('DELETE FROM NurseAvailability');

  const nurses = ['NUR001', 'NUR002', 'NUR003'];
  const placeholders = [];
  const values = [];

  for (const staffNumber of nurses) {
    for (const day of DAYS) {
      for (const slot of TIME_SLOTS) {
        const status = isUnavailable() ? 'Unavailable' : 'Available';
        const id = 'AVL-' + crypto.randomBytes(4).toString('hex');
        placeholders.push('(?, ?, ?, ?, ?)');
        values.push(id, staffNumber, day, slot, status);
      }
    }
  }

  const sql = `INSERT INTO NurseAvailability (AvailabilityID, StaffNumber, DayOfWeek, TimeSlot, Status) VALUES ${placeholders.join(', ')}`;
  await query(sql, values);

  console.log(`[Seeder] Inserted ${placeholders.length} availability records (27 slots/day).`);
  process.exit(0);
}

seedAvailability();
