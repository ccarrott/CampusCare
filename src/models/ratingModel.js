import { query } from '../config/database.js';

// ============================================================================
// RATING MODEL OPERATIONS
// ============================================================================

/**
 * Creates a new rating for an appointment.
 */
export async function createRating({ ratingId, score, ratingDescription, appointmentId, studentNumber }) {
  const sql = `
    INSERT INTO Rating (RatingID, AppointmentID, Score, RatingDescription, StudentNumber)
    VALUES (?, ?, ?, ?, ?)
  `;
  return await query(sql, [ratingId, appointmentId, score, ratingDescription, studentNumber || null]);
}

/**
 * Fetches all ratings for a given appointment.
 */
export async function getRatingByAppointment(appointmentId) {
  const sql = 'SELECT * FROM Rating WHERE AppointmentID = ?';
  const results = await query(sql, [appointmentId]);
  return results[0];
}
