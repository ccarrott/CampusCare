import { query } from '../database.js';
import crypto from 'crypto';

/**
 * STATE: OUTBREAK — Adds concentrated respiratory symptom spike in North End/Korsten (ZONE05).
 * Layers on top of existing data. Does NOT delete anything.
 * Run: npm run state:outbreak
 */

export async function loadOutbreakState() {
  console.log('[State: Outbreak] Simulating a concentrated respiratory outbreak...');

  // Outbreak epicentre — pick a central, populated grid zone by name (Newton Park
  // if present, else the zone nearest the NMU South Campus area). Concentrate
  // reports tightly around its centroid so the heatmap shows a clear hot blob.
  let [zone] = await query("SELECT ZoneID, Latitude, Longitude FROM CampusZone WHERE Name LIKE 'Newton Park%' ORDER BY ZoneID LIMIT 1");
  if (!zone) {
    [zone] = await query(
      "SELECT ZoneID, Latitude, Longitude, (POW(Latitude-(-33.9456),2)+POW(Longitude-25.5650,2)) d FROM CampusZone ORDER BY d ASC LIMIT 1"
    );
  }
  const OUTBREAK_ZONE = zone ? zone.ZoneID : 'ZONE01';
  const epicentre = zone ? { lat: Number(zone.Latitude), lon: Number(zone.Longitude) } : { lat: -33.9456, lon: 25.5650 };

  // Get students in the epicentre zone for realistic attribution
  const centralStudents = await query("SELECT s.StudentNumber FROM Student s INNER JOIN StudentZone sz ON s.StudentNumber = sz.StudentNumber WHERE sz.ZoneID = ?", [OUTBREAK_ZONE]);

  if (centralStudents.length === 0) {
    // Fallback: use any 5 students
    const anyStudents = await query("SELECT StudentNumber FROM Student LIMIT 5");
    centralStudents.push(...anyStudents);
  }

  // Respiratory + flu symptom IDs (for outbreak simulation)
  const respiratorySymptoms = ['SYM05', 'SYM06', 'SYM07', 'SYM08', 'SYM09', 'SYM12', 'SYM33', 'SYM34', 'SYM29'];

  let logCount = 0;
  let entryCount = 0;
  const jit = () => (Math.random() * 2 - 1) * 0.004; // tight cluster (~350m)

  // Generate 30 symptom logs over past 5 days (comfortably past the outbreak threshold)
  for (let i = 0; i < 30; i++) {
    const student = centralStudents[i % centralStudents.length];
    const daysAgo = Math.floor(Math.random() * 5);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
    const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');

    const logId = 'SH-OUT-' + crypto.randomBytes(4).toString('hex');

    // Pick 2-4 respiratory symptoms
    const numSymptoms = 2 + Math.floor(Math.random() * 3);
    const shuffled = respiratorySymptoms.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, numSymptoms);

    const lat = epicentre.lat + jit();
    const lon = epicentre.lon + jit();

    await query("INSERT INTO SymptomLog (LogID, StudentNumber, SymptomName, Severity, Latitude, Longitude, ZoneID, LogDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [logId, student.StudentNumber, picked.join(','), 'High', lat, lon, OUTBREAK_ZONE, dateStr]);
    logCount++;

    for (const symId of picked) {
      await query("INSERT INTO SymptomLogEntry (LogID, SymptomID) VALUES (?, ?)", [logId, symId]);
      entryCount++;
    }
  }

  // Generate 5 outbreak appointments
  const nurses = ['NUR001', 'NUR002', 'NUR003'];
  for (let i = 0; i < 5; i++) {
    const student = centralStudents[i % centralStudents.length];
    const daysAgo = Math.floor(Math.random() * 4);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(8 + i * 2, 0, 0, 0);
    const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');
    const aptId = 'APT-OUT-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    await query("INSERT INTO Appointment (AppointmentID, AppointmentType, Time, StudentNumber, StaffNumber, Status) VALUES (?, 'Physical', ?, ?, ?, 'Completed')",
      [aptId, dateStr, student.StudentNumber, nurses[i % 3]]);
  }

  const msg = `Outbreak simulated: ${logCount} symptom logs (${entryCount} entries), 5 appointments clustered in zone ${OUTBREAK_ZONE}.`;
  console.log('[State: Outbreak] ' + msg);
  return { success: true, message: msg };
}

if (process.argv[1]?.includes('state-outbreak')) {
  loadOutbreakState().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
