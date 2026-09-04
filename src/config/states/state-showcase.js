import { query, pool } from '../database.js';
import bcrypt from 'bcrypt';
import { DEMO_PASSWORDS } from './demo-credentials.js';
import crypto from 'crypto';
import { getZoneForPoint } from '../../utils/geo.js';

/**
 * STATE: SHOWCASE — Full immersive demo dataset with batch inserts for speed.
 * Run: npm run state:showcase
 */

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function formatDT(d) { return d.toISOString().slice(0, 19).replace('T', ' '); }
function weekday(minD, maxD, future = false) {
  let d;
  for (let i = 0; i < 50; i++) {
    d = future ? daysFromNow(randomInt(minD, maxD)) : daysAgo(randomInt(minD, maxD));
    if (d.getDay() !== 0 && d.getDay() !== 6) break;
  }
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  d.setHours(8 + randomInt(0, 8), randomInt(0, 2) * 20, 0, 0);
  return d;
}

/**
 * Batch INSERT helper — inserts rows in one query.
 */
async function batchInsert(table, columns, rows) {
  if (rows.length === 0) return;
  const placeholders = rows.map(() => '(' + columns.map(() => '?').join(',') + ')').join(',');
  const values = rows.flat();
  await query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`, values);
}

// ============================================================================
// ALL DEMO DATA IS FICTIONAL.
// Every student below is invented. Student numbers use the s999… block on purpose:
// real NMU numbers start with the enrolment year (s22…, s23…), so nothing here can
// collide with an actual person. Medical histories are illustrative sample values —
// they must never be attached to a real name or a real student number.
const STUDENTS = [
  { id: 's999000001', first: 'Sipho',     last: 'Mahlangu',       lat: -33.9870, lon: 25.6650, med: 'Asthma, Penicillin Allergy' },  // Summerstrand
  { id: 's999000002', first: 'Jordan',    last: 'Adams',          lat: -33.9880, lon: 25.6600, med: '' },  // Summerstrand
  { id: 's999000003', first: 'Refilwe',   last: 'Motaung',        lat: -33.9830, lon: 25.6500, med: 'Mild Migraines' },  // Summerstrand
  { id: 's999000004', first: 'Nadia',     last: 'Petersen',       lat: -33.9470, lon: 25.5900, med: '' },  // Newton Park
  { id: 's999000005', first: 'Liam',      last: 'van der Merwe',  lat: -33.9860, lon: 25.6550, med: '' },  // Summerstrand
  { id: 's999000006', first: 'Naledi',    last: 'Mokoena',        lat: -33.9720, lon: 25.6350, med: 'Seasonal allergies' },  // Humewood
  { id: 's999000007', first: 'Jason',     last: 'Pieterse',       lat: -33.9730, lon: 25.6450, med: '' },  // Kings Beach
  { id: 's999000008', first: 'Amahle',    last: 'Dlamini',        lat: -33.9750, lon: 25.6100, med: 'Lactose intolerance' },  // Walmer
  { id: 's999000009', first: 'Ruan',      last: 'Botha',          lat: -33.9370, lon: 25.5850, med: '' },  // Fairview
  { id: 's999000010', first: 'Zintle',    last: 'Mthembu',        lat: -33.9560, lon: 25.6050, med: 'Mild asthma' },  // Central/Richmond Hill
  { id: 's999000011', first: 'Kyle',      last: 'Adams',          lat: -33.9560, lon: 25.5980, med: '' },  // Central CBD
  { id: 's999000012', first: 'Thandeka',  last: 'Zulu',           lat: -33.9430, lon: 25.6150, med: '' },  // North End/Korsten
  { id: 's999000013', first: 'Marco',     last: 'Ferreira',       lat: -33.9560, lon: 25.6150, med: 'Eczema' },  // Mill Park
  { id: 's999000014', first: 'Lesedi',    last: 'Molefe',         lat: -33.9280, lon: 25.5700, med: '' },  // Lorraine
  { id: 's999000015', first: 'Amy',       last: 'Smith',          lat: -33.9720, lon: 25.6000, med: '' },  // Walmer
  { id: 's999000016', first: 'Sibusiso',  last: 'Ndlovu',         lat: -33.9360, lon: 25.5550, med: '' },  // Sherwood
  { id: 's999000017', first: 'Chloe',     last: 'van Niekerk',    lat: -33.9900, lon: 25.6700, med: 'Iron deficiency' },  // Summerstrand
  { id: 's999000018', first: 'Thabo',     last: 'Nkosi',          lat: -33.9650, lon: 25.6200, med: '' },  // South End
  { id: 's999000019', first: 'Danielle',  last: 'Jordaan',        lat: -33.9500, lon: 25.5500, med: 'Anxiety history' },  // Kamma Park
];

const NURSES = ['NUR001', 'NUR002', 'NUR003'];
const SYMPTOM_IDS = Array.from({length: 48}, (_, i) => 'SYM' + String(i + 1).padStart(2, '0'));
const COMMENTS = [
  'Excellent care, very thorough.', 'Quick and professional.', 'Felt heard and supported.',
  'Helpful advice, short wait.', 'Very knowledgeable nurse.', 'Great experience overall.',
  'Efficient consultation.', 'Would recommend.', 'Addressed all my concerns.',
  'Friendly and professional.', 'Clear explanation.', 'Smooth process.',
  'Appreciated the follow-up advice.', 'Made me feel comfortable.', 'Very attentive.',
  'Good but felt rushed.', 'Solid guidance.', 'Thank you for the help.',
  'Professional and caring.', 'Comprehensive plan.'
];

// ============================================================================

export async function loadShowcaseState() {
  const t0 = Date.now();
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     CAMPUSCARE — Loading Showcase State         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // 1. NAKED WIPE
  console.log('  [1/7] Wiping existing data...');
  const { loadNakedState } = await import('./state-naked.js');
  await loadNakedState();

  const zones = await query('SELECT ZoneID, Name, Latitude, Longitude, Boundary FROM CampusZone');
  const pw = await bcrypt.hash(DEMO_PASSWORDS.student, 10);

  // 2. STUDENTS (batch)
  console.log('  [2/7] Seeding 19 students + zone assignments...');
  const studentRows = STUDENTS.map(s => [s.id, s.first, s.last, s.med, pw, s.lat, s.lon]);
  await batchInsert('Student', ['StudentNumber', 'FirstName', 'LastName', 'MedicalHistory', 'Password', 'Latitude', 'Longitude'], studentRows);

  const zoneRows = STUDENTS.map(s => {
    const zoneId = getZoneForPoint(s.lat, s.lon, zones);
    return [s.id, zoneId || 'ZONE01'];
  });
  await batchInsert('StudentZone', ['StudentNumber', 'ZoneID'], zoneRows);

  // 3. APPOINTMENTS (batch)
  console.log('  [3/7] Seeding 50 appointments...');
  const aptRows = [];
  const statuses = [...Array(25).fill('Completed'), ...Array(8).fill('Confirmed'), ...Array(8).fill('Pending'), ...Array(5).fill('Cancelled'), ...Array(4).fill('Confirmed')];
  for (let i = 0; i < 50; i++) {
    const status = statuses[i];
    const isPast = ['Completed', 'Cancelled'].includes(status);
    const date = isPast ? weekday(7, 180) : weekday(1, 14, true);
    const type = i % 3 === 0 ? 'Online' : 'Physical';
    aptRows.push(['APT-SH-' + String(i+1).padStart(3,'0'), type, formatDT(date), STUDENTS[i%19].id, NURSES[i%3], status]);
  }
  await batchInsert('Appointment', ['AppointmentID', 'AppointmentType', 'Time', 'StudentNumber', 'StaffNumber', 'Status'], aptRows);

  // 4. RATINGS (batch)
  console.log('  [4/7] Seeding 20 ratings...');
  const completedApts = aptRows.filter(r => r[5] === 'Completed').slice(0, 20);
  const ratingRows = completedApts.map((apt, i) => [
    'RAT-SH-' + String(i+1).padStart(3,'0'), apt[0], [3,4,4,5,5,5,4,3,5,4,5,4,5,3,4,5,4,5,4,5][i], COMMENTS[i], apt[3]
  ]);
  await batchInsert('Rating', ['RatingID', 'AppointmentID', 'Score', 'RatingDescription', 'StudentNumber'], ratingRows);

  // 5. NURSE REVIEWS (batch)
  console.log('  [5/7] Seeding 6 nurse reviews...');
  const reviewTexts = ['Very professional.', 'Takes time to listen.', 'Great bedside manner.', 'Efficient care.', 'Helped me through a tough time.', 'Knowledgeable and supportive.'];
  const reviewRows = [];
  for (let i = 0; i < 6; i++) {
    reviewRows.push(['REV-SH-'+String(i+1).padStart(3,'0'), completedApts[i][0], STUDENTS[i+5].id, NURSES[Math.floor(i/2)], [5,4,5,3,5,4][i], reviewTexts[i], i < 4 ? 'Approved' : 'Pending']);
  }
  await batchInsert('NurseReviews', ['ReviewID', 'AppointmentID', 'StudentNumber', 'StaffNumber', 'Rating', 'ReviewText', 'Verified'], reviewRows);

  // 6. SYMPTOM LOGS + ENTRIES (batch) — Phase 30G: snapshot location per report
  //    (jittered around the student's home coords) so the density heatmap populates.
  console.log('  [6/7] Seeding 100 symptom logs (~300 entries)...');
  const logRows = [];
  const entryRows = [];
  const jit = () => (Math.random() * 2 - 1) * 0.0015;
  for (let i = 0; i < 100; i++) {
    const student = STUDENTS[i % 19];
    let daysBack = i < 30 ? randomInt(0, 6) : i < 60 ? randomInt(7, 30) : randomInt(31, 180);
    const date = daysAgo(daysBack);
    date.setHours(randomInt(7, 20), randomInt(0, 59), 0, 0);
    const logId = 'SH-' + String(i+1).padStart(4,'0');
    const severity = randomItem(['Low', 'Moderate', 'High']);
    const picked = [];
    while (picked.length < randomInt(2, 4)) {
      const s = randomItem(SYMPTOM_IDS);
      if (!picked.includes(s)) picked.push(s);
    }
    const lat = student.lat + jit();
    const lon = student.lon + jit();
    const zoneId = getZoneForPoint(lat, lon, zones) || 'ZONE01';
    logRows.push([logId, student.id, picked.join(','), severity, lat, lon, zoneId, formatDT(date)]);
    for (const symId of picked) entryRows.push([logId, symId]);
  }
  await batchInsert('SymptomLog', ['LogID', 'StudentNumber', 'SymptomName', 'Severity', 'Latitude', 'Longitude', 'ZoneID', 'LogDate'], logRows);

  // SymptomLogEntry in chunks of 50 (MySQL max packet)
  for (let i = 0; i < entryRows.length; i += 50) {
    await batchInsert('SymptomLogEntry', ['LogID', 'SymptomID'], entryRows.slice(i, i + 50));
  }

  // 7. AVAILABILITY (batch)
  console.log('  [7/7] Seeding nurse availability (405 slots)...');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slots = [];
  for (let h = 8; h <= 16; h++) for (const m of [0, 20, 40]) {
    const s = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const eM = m + 15;
    slots.push(`${s}-${String(h+(eM>=60?1:0)).padStart(2,'0')}:${String(eM%60).padStart(2,'0')}`);
  }
  const availRows = [];
  for (const nurse of NURSES) for (const day of days) for (const slot of slots) {
    availRows.push(['AVL-' + crypto.randomBytes(3).toString('hex'), nurse, day, slot, Math.random() > 0.15 ? 'Available' : 'Unavailable']);
  }
  // Batch in chunks of 100
  for (let i = 0; i < availRows.length; i += 100) {
    await batchInsert('NurseAvailability', ['AvailabilityID', 'StaffNumber', 'DayOfWeek', 'TimeSlot', 'Status'], availRows.slice(i, i + 100));
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  console.log('  ✓ Showcase loaded in ' + elapsed + 's');
  console.log('    Students: 19 | Appointments: 50 | Ratings: 20');
  console.log('    Reviews: 6 | Symptom Logs: 100 (' + entryRows.length + ' entries)');
  console.log('    Availability: 405 slots');
  console.log('');

  return { success: true, message: `Showcase loaded in ${elapsed}s. 19 students, 50 appointments, 100 symptom logs, 20 ratings.` };
}

if (process.argv[1]?.includes('state-showcase')) {
  loadShowcaseState().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
