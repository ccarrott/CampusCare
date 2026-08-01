import { query } from './database.js';

/**
 * CampusCare - Showcase Database Seed Script
 *
 * Populates the database with realistic historical data to make all
 * dashboards, charts, and filters look impressive during a demo.
 *
 * SAFE: Only clears Appointment, Rating, SymptomLog tables.
 * Does NOT touch Student, Nurse, Admin, Symptoms, Medication, etc.
 *
 * Run: node src/config/seed-showcase.js
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const STUDENTS = [
  's227921577', 's226205096', 's227582012', 's228124603',
  's229001001', 's229001002', 's229001003', 's229001004',
  's229001005', 's229001006', 's229001007', 's229001008',
  's229001009', 's229001010', 's229001011', 's229001012',
  's229001013', 's229001014', 's229001015'
];

const NURSES = ['NUR001', 'NUR002', 'NUR003'];

const SYMPTOMS = [
  'Fever & Chills', 'Fatigue & Weakness', 'Body Aches & Muscle Pain',
  'Nausea & Loss of Appetite', 'Acute Headache', 'Sore Throat',
  'Blocked Nose & Sinus Congestion', 'Skin Rash & Irritation',
  'Stomach Cramps & Bloating', 'Insomnia & Sleep Difficulty',
  'Mild Allergic Reaction', 'Severe Persistent Cough',
  'Migraine with Aura', 'Dizziness & Lightheadedness',
  'Diarrhoea (>2 days)', 'Repeated Vomiting',
  'Anxiety & Panic Episodes', 'Persistent Low Mood (>2 weeks)',
  'Shortness of Breath', 'Chest Pain & Palpitations'
];

const SEVERITIES = ['Low', 'Moderate', 'High'];

// Student-to-zone mapping (mirrors seed-zones.js logic)
const STUDENT_ZONES = {
  's227921577': 'ZONE01', // Lena Allen Res
  's226205096': 'ZONE01', // Xanadu Res
  's227582012': 'ZONE03', // Hoff Street Summerstrand
  's228124603': 'ZONE05', // Newton Park
  's229001001': 'ZONE01', // Founders Res
  's229001002': 'ZONE03', // 3rd Avenue Summerstrand
  's229001003': 'ZONE03', // 6th Avenue Summerstrand
  's229001004': 'ZONE03', // Beach Road Summerstrand
  's229001005': 'ZONE01', // Lena Allen Res
  's229001006': 'ZONE04', // Marine Drive
  's229001007': 'ZONE06', // Mount Road Central
  's229001008': 'ZONE06', // Albany Road Central
  's229001009': 'ZONE05', // Buffelsfontein Newton Park
  's229001010': 'ZONE05', // Ring Road Newton Park
  's229001011': 'ZONE07', // Heugh Road Walmer
  's229001012': 'ZONE08', // Circular Drive Lorraine
  's229001013': 'ZONE01', // Xanadu Res
  's229001014': 'ZONE07', // Main Road Walmer
  's229001015': 'ZONE06'  // Mount Road Central
};

// Time slot cadence: 20-minute slots from 08:00 to 16:40
const TIME_SLOTS = [];
for (let h = 8; h <= 16; h++) {
  for (const m of [0, 20, 40]) {
    if (h === 16 && m > 40) continue;
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  }
}

// Rating descriptions (realistic feedback)
const RATING_DESCS = [
  'Excellent consultation. Nurse was thorough and empathetic.',
  'Very helpful appointment, received clear guidance on my condition.',
  'Good experience overall. Short wait time, professional care.',
  'Nurse was knowledgeable and took time to explain everything.',
  'Satisfactory visit. Got the help I needed.',
  'Quick and efficient consultation. Would book again.',
  'Appreciated the follow-up advice given during the session.',
  'Nurse was friendly and made me feel comfortable discussing my symptoms.',
  'Great experience. The online consultation worked smoothly.',
  'Professional and caring. Addressed all my concerns.',
  'Good consultation but felt a bit rushed.',
  'Very attentive nurse. Took detailed notes on my symptoms.',
  'Helpful advice on managing my condition between visits.',
  'Smooth process from booking to completion.',
  'Nurse provided comprehensive treatment recommendations.'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a weekday date within a range of days ago from today.
 * Returns a Date object guaranteed to be Mon-Fri.
 */
function randomWeekday(daysAgoMin, daysAgoMax) {
  const now = new Date();
  let date;
  let attempts = 0;
  do {
    const daysAgo = randomInt(daysAgoMin, daysAgoMax);
    date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    attempts++;
  } while ((date.getDay() === 0 || date.getDay() === 6) && attempts < 50);

  // If still weekend after 50 attempts, shift to Monday
  if (date.getDay() === 0) date.setDate(date.getDate() + 1);
  if (date.getDay() === 6) date.setDate(date.getDate() + 2);
  return date;
}

/**
 * Generate a future weekday within a range of days from today.
 */
function futureWeekday(daysFromMin, daysFromMax) {
  const now = new Date();
  let date;
  let attempts = 0;
  do {
    const daysFrom = randomInt(daysFromMin, daysFromMax);
    date = new Date(now);
    date.setDate(date.getDate() + daysFrom);
    attempts++;
  } while ((date.getDay() === 0 || date.getDay() === 6) && attempts < 50);

  if (date.getDay() === 0) date.setDate(date.getDate() + 1);
  if (date.getDay() === 6) date.setDate(date.getDate() + 2);
  return date;
}

/**
 * Format a date + time string for MySQL DATETIME.
 */
function formatDatetime(date, timeSlot) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d} ${timeSlot}`;
}

/**
 * Format a date for MySQL DATE.
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function generateAppointments() {
  const appointments = [];
  let counter = 1;
  const usedSlots = new Set(); // Prevent double-booking: "NUR001_2026-03-15_08:00:00"

  function nextId() {
    return `APT-SHOW-${String(counter++).padStart(3, '0')}`;
  }

  function pickUniqueSlot(staffNumber, date) {
    const dateStr = formatDate(date);
    for (let i = 0; i < 30; i++) {
      const slot = randomItem(TIME_SLOTS);
      const key = `${staffNumber}_${dateStr}_${slot}`;
      if (!usedSlots.has(key)) {
        usedSlots.add(key);
        return slot;
      }
    }
    // Fallback: use first available
    for (const slot of TIME_SLOTS) {
      const key = `${staffNumber}_${dateStr}_${slot}`;
      if (!usedSlots.has(key)) {
        usedSlots.add(key);
        return slot;
      }
    }
    return TIME_SLOTS[0];
  }

  // Distribute nurses: NUR001 = 15, NUR002 = 15, NUR003 = 10
  const nurseAssignments = [
    ...Array(15).fill('NUR001'),
    ...Array(15).fill('NUR002'),
    ...Array(10).fill('NUR003')
  ];

  let aptIndex = 0;

  // 12 × Completed (Physical) — dates from Jan–Jul 2026
  for (let i = 0; i < 12; i++) {
    const date = randomWeekday(30, 200); // 1-7 months ago
    const nurse = nurseAssignments[aptIndex];
    const slot = pickUniqueSlot(nurse, date);
    appointments.push({
      id: nextId(),
      type: 'Physical',
      time: formatDatetime(date, slot),
      teamsId: null,
      student: STUDENTS[aptIndex % STUDENTS.length],
      nurse,
      status: 'Completed'
    });
    aptIndex++;
  }

  // 8 × Completed (Online) — dates from Jan–Jul 2026
  for (let i = 0; i < 8; i++) {
    const date = randomWeekday(30, 200);
    const nurse = nurseAssignments[aptIndex];
    const slot = pickUniqueSlot(nurse, date);
    appointments.push({
      id: nextId(),
      type: 'Online',
      time: formatDatetime(date, slot),
      teamsId: null,
      student: STUDENTS[aptIndex % STUDENTS.length],
      nurse,
      status: 'Completed'
    });
    aptIndex++;
  }

  // 6 × Confirmed (Physical) — upcoming next 2 weeks
  for (let i = 0; i < 6; i++) {
    const date = futureWeekday(1, 14);
    const nurse = nurseAssignments[aptIndex];
    const slot = pickUniqueSlot(nurse, date);
    appointments.push({
      id: nextId(),
      type: 'Physical',
      time: formatDatetime(date, slot),
      teamsId: null,
      student: STUDENTS[aptIndex % STUDENTS.length],
      nurse,
      status: 'Confirmed'
    });
    aptIndex++;
  }

  // 6 × Confirmed (Online) — upcoming, TeamsID = null
  for (let i = 0; i < 6; i++) {
    const date = futureWeekday(1, 14);
    const nurse = nurseAssignments[aptIndex];
    const slot = pickUniqueSlot(nurse, date);
    appointments.push({
      id: nextId(),
      type: 'Online',
      time: formatDatetime(date, slot),
      teamsId: null,
      student: STUDENTS[aptIndex % STUDENTS.length],
      nurse,
      status: 'Confirmed'
    });
    aptIndex++;
  }

  // 4 × Pending (Physical) — upcoming
  for (let i = 0; i < 4; i++) {
    const date = futureWeekday(2, 10);
    const nurse = nurseAssignments[aptIndex];
    const slot = pickUniqueSlot(nurse, date);
    appointments.push({
      id: nextId(),
      type: 'Physical',
      time: formatDatetime(date, slot),
      teamsId: null,
      student: STUDENTS[aptIndex % STUDENTS.length],
      nurse,
      status: 'Pending'
    });
    aptIndex++;
  }

  // 2 × Pending (Online) — upcoming
  for (let i = 0; i < 2; i++) {
    const date = futureWeekday(2, 10);
    const nurse = nurseAssignments[aptIndex];
    const slot = pickUniqueSlot(nurse, date);
    appointments.push({
      id: nextId(),
      type: 'Online',
      time: formatDatetime(date, slot),
      teamsId: null,
      student: STUDENTS[aptIndex % STUDENTS.length],
      nurse,
      status: 'Pending'
    });
    aptIndex++;
  }

  // 2 × Cancelled — past dates
  for (let i = 0; i < 2; i++) {
    const date = randomWeekday(14, 60);
    const nurse = nurseAssignments[aptIndex];
    const slot = pickUniqueSlot(nurse, date);
    appointments.push({
      id: nextId(),
      type: i === 0 ? 'Physical' : 'Online',
      time: formatDatetime(date, slot),
      teamsId: null,
      student: STUDENTS[aptIndex % STUDENTS.length],
      nurse,
      status: 'Cancelled'
    });
    aptIndex++;
  }

  return appointments;
}

function generateRatings(completedAppointments) {
  const scores = [3, 4, 4, 5, 5, 5, 4, 3, 5, 4, 5, 4, 5, 3, 4];
  const ratings = [];

  // Pick 15 completed appointments
  const rateableApts = completedAppointments.slice(0, 15);

  for (let i = 0; i < rateableApts.length; i++) {
    ratings.push({
      id: `RAT-SHOW-${String(i + 1).padStart(3, '0')}`,
      appointmentId: rateableApts[i].id,
      score: scores[i],
      description: RATING_DESCS[i],
      studentNumber: rateableApts[i].student
    });
  }

  return ratings;
}

function generateSymptomLogs() {
  const logs = [];

  // 80 entries total:
  // 30% in past 7 days = 24 entries
  // 30% in past month (8-30 days) = 24 entries
  // 40% spread over 2-6 months ago (31-180 days) = 32 entries

  // Zone clustering: ~20 entries in Central zone (ZONE06)
  const centralStudents = Object.entries(STUDENT_ZONES)
    .filter(([, zone]) => zone === 'ZONE06')
    .map(([student]) => student); // s229001007, s229001008, s229001015

  let counter = 1;

  function nextLogId() {
    return `SH-${String(counter++).padStart(4, '0')}`;
  }

  // Past 7 days: 24 entries (cluster some in Central for outbreak demo)
  for (let i = 0; i < 24; i++) {
    const daysAgo = randomInt(0, 6);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(randomInt(7, 18), randomInt(0, 59), 0, 0);

    // First 8 entries from Central zone students (outbreak clustering)
    let student;
    if (i < 8) {
      student = centralStudents[i % centralStudents.length];
    } else {
      student = randomItem(STUDENTS);
    }

    logs.push({
      id: nextLogId(),
      student,
      symptom: randomItem(SYMPTOMS),
      severity: randomItem(SEVERITIES),
      date: formatDatetime(date, `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`)
    });
  }

  // Past month (8-30 days): 24 entries
  for (let i = 0; i < 24; i++) {
    const daysAgo = randomInt(8, 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(randomInt(7, 18), randomInt(0, 59), 0, 0);

    // Another 6 from Central zone
    let student;
    if (i < 6) {
      student = centralStudents[i % centralStudents.length];
    } else {
      student = randomItem(STUDENTS);
    }

    logs.push({
      id: nextLogId(),
      student,
      symptom: randomItem(SYMPTOMS),
      severity: randomItem(SEVERITIES),
      date: formatDatetime(date, `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`)
    });
  }

  // 2-6 months ago (31-180 days): 32 entries
  for (let i = 0; i < 32; i++) {
    const daysAgo = randomInt(31, 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(randomInt(7, 18), randomInt(0, 59), 0, 0);

    // Another 6 from Central zone
    let student;
    if (i < 6) {
      student = centralStudents[i % centralStudents.length];
    } else {
      student = randomItem(STUDENTS);
    }

    logs.push({
      id: nextLogId(),
      student,
      symptom: randomItem(SYMPTOMS),
      severity: randomItem(SEVERITIES),
      date: formatDatetime(date, `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`)
    });
  }

  return logs;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function seedShowcase() {
  console.log('='.repeat(60));
  console.log('  CampusCare — Showcase Data Seeder');
  console.log('='.repeat(60));
  console.log('');

  // 1. Clear existing showcase-safe tables
  console.log('[1/4] Clearing Appointment, Rating, SymptomLog...');
  await query('DELETE FROM Rating');
  await query('DELETE FROM Appointment');
  await query('DELETE FROM SymptomLog');
  console.log('      Done.');

  // 2. Generate and insert appointments
  console.log('[2/4] Generating 40 appointments...');
  const appointments = generateAppointments();

  for (const apt of appointments) {
    await query(
      `INSERT INTO Appointment (AppointmentID, AppointmentType, Time, TeamsID, StudentNumber, StaffNumber, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [apt.id, apt.type, apt.time, apt.teamsId, apt.student, apt.nurse, apt.status]
    );
  }
  console.log(`      Inserted ${appointments.length} appointments.`);

  // 3. Generate and insert ratings (for completed appointments)
  console.log('[3/4] Generating 15 ratings...');
  const completed = appointments.filter(a => a.status === 'Completed');
  const ratings = generateRatings(completed);

  for (const r of ratings) {
    await query(
      `INSERT INTO Rating (RatingID, AppointmentID, Score, RatingDescription, StudentNumber)
       VALUES (?, ?, ?, ?, ?)`,
      [r.id, r.appointmentId, r.score, r.description, r.studentNumber]
    );
  }
  console.log(`      Inserted ${ratings.length} ratings.`);

  // 4. Generate and insert symptom logs
  console.log('[4/4] Generating 80 symptom log entries...');
  const logs = generateSymptomLogs();

  for (const log of logs) {
    await query(
      `INSERT INTO SymptomLog (LogID, StudentNumber, SymptomName, Severity, LogDate)
       VALUES (?, ?, ?, ?, ?)`,
      [log.id, log.student, log.symptom, log.severity, log.date]
    );
  }
  console.log(`      Inserted ${logs.length} symptom log entries.`);

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('  SHOWCASE SEED COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  Appointments: ${appointments.length}`);
  console.log(`    - Completed (Physical): ${appointments.filter(a => a.status === 'Completed' && a.type === 'Physical').length}`);
  console.log(`    - Completed (Online):   ${appointments.filter(a => a.status === 'Completed' && a.type === 'Online').length}`);
  console.log(`    - Confirmed:            ${appointments.filter(a => a.status === 'Confirmed').length}`);
  console.log(`    - Pending:              ${appointments.filter(a => a.status === 'Pending').length}`);
  console.log(`    - Cancelled:            ${appointments.filter(a => a.status === 'Cancelled').length}`);
  console.log(`  Ratings:      ${ratings.length}`);
  console.log(`  Symptom Logs: ${logs.length}`);
  console.log(`    - Past 7 days:   24`);
  console.log(`    - Past month:    24`);
  console.log(`    - 2-6 months:    32`);
  console.log(`    - Central zone:  ~20 (outbreak demo)`);
  console.log('');
  console.log('  Safe to run multiple times.');
  console.log('');

  process.exit(0);
}

seedShowcase().catch(err => {
  console.error('[FATAL] Showcase seed failed:', err.message);
  process.exit(1);
});
