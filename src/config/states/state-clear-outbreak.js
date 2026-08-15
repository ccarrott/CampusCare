import { query } from '../database.js';

/**
 * STATE: CLEAR OUTBREAK — Removes only outbreak-prefixed data.
 * Run: node src/config/states/state-clear-outbreak.js
 */

export async function clearOutbreak() {
  console.log('[State: Clear Outbreak] Removing outbreak data...');

  const logResult = await query("DELETE FROM SymptomLogEntry WHERE LogID LIKE 'SH-OUT-%'");
  const symResult = await query("DELETE FROM SymptomLog WHERE LogID LIKE 'SH-OUT-%'");
  const aptResult = await query("DELETE FROM Appointment WHERE AppointmentID LIKE 'APT-OUT-%'");

  const msg = `Cleared: ${symResult.affectedRows} symptom logs, ${logResult.affectedRows} log entries, ${aptResult.affectedRows} appointments.`;
  console.log('[State: Clear Outbreak] ' + msg);
  return { success: true, message: msg };
}

if (process.argv[1]?.includes('state-clear-outbreak')) {
  clearOutbreak().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
