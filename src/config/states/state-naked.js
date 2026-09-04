import { query } from '../database.js';
import bcrypt from 'bcrypt';

/**
 * STATE: NAKED — Fresh deployment. Only admin + nurses. Everything else empty.
 * Run: node src/config/states/state-naked.js
 */

export async function loadNakedState() {
  console.log('[State: Naked] Wiping all dynamic data...');

  // Clear dynamic tables (order matters for FKs)
  await query('DELETE FROM SymptomLogEntry');
  await query('DELETE FROM SymptomLog');
  await query('DELETE FROM NurseReviews');
  await query('DELETE FROM Rating');
  await query('DELETE FROM Appointment');
  await query('DELETE FROM NurseAvailability');
  await query('DELETE FROM StudentZone');
  await query('DELETE FROM Student');
  await query('DELETE FROM PasswordResetToken');
  await query('DELETE FROM Admin');
  await query('DELETE FROM Nurse');
  await query('DELETE FROM Clinic');
  // NOTE: there is no `sessions` table — express-session keeps sessions in memory,
  // so they are cleared by restarting the process, not by SQL. The DELETE that used
  // to be here threw "table doesn't exist" and aborted the whole reset.

  // Seed clinics — real NMU Student Health Services facilities (Gqeberha).
  // Source: studenthealth.mandela.ac.za (South 041 504 2174, North 041 504 1149).
  // NOTE: both main student clinics are in Summerstrand — North Campus is adjacent to
  // South Campus, NOT on 2nd Avenue (correcting the earlier incorrect address).
  await query(
    "INSERT INTO Clinic (RegNum, Name, Address, TelephoneNumber, Email) VALUES (?, ?, ?, ?, ?)",
    ['CLN001', 'South Campus', 'South Campus, University Way, Summerstrand, Gqeberha, 6019', '041 504 2174', 'StudentHealth@mandela.ac.za']
  );
  await query(
    "INSERT INTO Clinic (RegNum, Name, Address, TelephoneNumber, Email) VALUES (?, ?, ?, ?, ?)",
    ['CLN002', 'North Campus', 'North Campus, Summerstrand, Gqeberha, 6019', '041 504 1149', 'StudentHealth@mandela.ac.za']
  );

  // Seed admin
  const adminPw = await bcrypt.hash('admin123', 10);
  await query("INSERT INTO Admin (StaffNumber, Name, Password) VALUES ('ADM001', 'System Administrator', ?)", [adminPw]);

  // Seed 3 nurses (with Campus — Phase 29A)
  const nursePw = await bcrypt.hash('nurse123', 10);
  await query("INSERT INTO Nurse (StaffNumber, FirstName, LastName, PhoneNumber, Password, Email, ClinicID, Campus, Bio, YearsExperience) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['NUR001', 'Sarah', 'Jenkins', '0821234567', nursePw, 'sarah.jenkins@mandela.ac.za', 'CLN001', 'South Campus', 'Experienced campus nurse specialising in student wellness and primary care.', 8]);
  await query("INSERT INTO Nurse (StaffNumber, FirstName, LastName, PhoneNumber, Password, Email, ClinicID, Campus, Bio, YearsExperience) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['NUR002', 'David', 'Khumalo', '0839876543', nursePw, 'david.khumalo@mandela.ac.za', 'CLN001', 'South Campus', 'Focused on mental health support and holistic student care.', 5]);
  await query("INSERT INTO Nurse (StaffNumber, FirstName, LastName, PhoneNumber, Password, Email, ClinicID, Campus, Bio, YearsExperience) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['NUR003', 'Thandiwe', 'Nkosi', '0841112233', nursePw, 'thandiwe.nkosi@mandela.ac.za', 'CLN002', 'North Campus', 'Sports medicine background. Great with physical assessments.', 12]);

  console.log('[State: Naked] Complete. 1 admin + 3 nurses + 2 clinics seeded. System ready for fresh use.');
  return { success: true, message: 'Naked state loaded. 1 admin, 3 nurses, 2 clinics, all tables clear.' };
}

// CLI support
if (process.argv[1]?.includes('state-naked')) {
  loadNakedState().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
