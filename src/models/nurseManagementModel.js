import { query } from '../config/database.js';

// ============================================================================
// NURSE MANAGEMENT MODEL - Schedule & Appointment Management
// ============================================================================

/**
 * Updates the MS Teams link for an online appointment.
 */
export async function updateTeamsLink(appointmentId, teamsId) {
  const sql = 'UPDATE Appointment SET TeamsID = ? WHERE AppointmentID = ?';
  return await query(sql, [teamsId, appointmentId]);
}

