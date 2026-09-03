// src/modules/appointments/appointments.model.js
// Database queries for appointment booking, history, lifecycle, and slot checking.

import { query, pool } from '../../config/database.js';
import { APPOINTMENT_STATUS } from '../../constants.js';

// ============================================================================
// NURSE LOOKUP
// ============================================================================

export async function getAvailableNurses() {
  const sql = 'SELECT StaffNumber, FirstName, LastName FROM Nurse';
  return await query(sql);
}

/**
 * Gets extended nurse profile (Bio, YearsExperience) for the booking card.
 */
export async function getNurseProfile(staffNumber) {
  const sql = 'SELECT Bio, YearsExperience FROM Nurse WHERE StaffNumber = ?';
  const results = await query(sql, [staffNumber]);
  return results[0];
}

// ============================================================================
// ATOMIC BOOKING (Transaction-based, race-condition safe)
// ============================================================================

/**
 * Atomically checks slot availability and creates an appointment.
 * Uses SELECT ... FOR UPDATE to lock the row during the transaction.
 * Returns { success: true } or { success: false, reason: 'slot_taken' }.
 */
export async function atomicBookSlot({ appointmentId, appointmentType, time, teamsId, studentNumber, staffNumber, campus, preferredLanguage }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock: check if any non-cancelled appointment exists for this nurse+time
    const [existing] = await conn.execute(
      `SELECT AppointmentID FROM Appointment
       WHERE StaffNumber = ? AND Time = ? AND Status != 'Cancelled'
       FOR UPDATE`,
      [staffNumber, time]
    );

    if (existing.length > 0) {
      await conn.rollback();
      return { success: false, reason: 'slot_taken' };
    }

    // Insert the appointment
    await conn.execute(
      `INSERT INTO Appointment (AppointmentID, AppointmentType, Time, TeamsID, StudentNumber, StaffNumber, Campus, PreferredLanguage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [appointmentId, appointmentType, time, teamsId || null, studentNumber, staffNumber, campus || null, preferredLanguage || null]
    );

    await conn.commit();
    return { success: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// ============================================================================
// APPOINTMENT QUERIES
// ============================================================================

export async function getAppointmentById(appointmentId) {
  const sql = 'SELECT * FROM Appointment WHERE AppointmentID = ?';
  const results = await query(sql, [appointmentId]);
  return results[0];
}

export async function getAppointmentWithNurse(appointmentId, studentNumber) {
  const sql = `
    SELECT a.*, n.FirstName AS NurseFirstName, n.LastName AS NurseLastName
    FROM Appointment a
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    WHERE a.AppointmentID = ? AND a.StudentNumber = ?
  `;
  const results = await query(sql, [appointmentId, studentNumber]);
  return results[0];
}

export async function getAppointmentsByStudentWithStatus(studentNumber) {
  const sql = `
    SELECT
      a.AppointmentID, a.AppointmentType, a.Time, a.TeamsID,
      a.Status, a.Notes, a.StaffNumber,
      n.FirstName AS NurseFirstName, n.LastName AS NurseLastName
    FROM Appointment a
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    WHERE a.StudentNumber = ?
    ORDER BY a.Time DESC
  `;
  return await query(sql, [studentNumber]);
}

export async function getAppointmentsForNurseWithStatus(staffNumber) {
  const sql = `
    SELECT
      a.AppointmentID, a.AppointmentType, a.Time, a.TeamsID, a.RoomName, a.RoomExp,
      a.Status, a.Notes, a.StudentNumber,
      s.FirstName AS StudentFirstName, s.LastName AS StudentLastName, s.MedicalHistory
    FROM Appointment a
    INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
    WHERE a.StaffNumber = ?
    ORDER BY a.Time DESC
  `;
  return await query(sql, [staffNumber]);
}

/**
 * Phase 29B: has the student created a booking within the last `days` days?
 * Used to nudge repeat bookers toward continued care.
 */
export async function hasRecentBooking(studentNumber, days = 7) {
  const rows = await query(
    `SELECT AppointmentID FROM Appointment
     WHERE StudentNumber = ? AND Status != 'Cancelled'
       AND CreatedAt >= DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 1`,
    [studentNumber, days]
  );
  return rows.length > 0;
}

/**
 * Gets booked time slots for a nurse on a specific date.
 * Used by the booking grid to grey out taken slots.
 */
export async function getBookedTimesForNurse(staffNumber, date) {
  const sql = `SELECT TIME_FORMAT(Time, '%H:%i') AS BookedTime FROM Appointment WHERE StaffNumber = ? AND DATE(Time) = ? AND Status != 'Cancelled'`;
  return await query(sql, [staffNumber, date]);
}

/**
 * Gets rated appointment IDs for a student (to hide Rate button).
 */
export async function getRatedAppointmentIds(studentNumber) {
  const sql = `
    SELECT r.AppointmentID FROM Rating r
    INNER JOIN Appointment a ON r.AppointmentID = a.AppointmentID
    WHERE a.StudentNumber = ?
  `;
  const rows = await query(sql, [studentNumber]);
  return rows.map(r => r.AppointmentID);
}

// ============================================================================
// LIFECYCLE (Status, Cancel, Reschedule, Notes, Auto-Expire)
// ============================================================================

/**
 * Auto-cancels appointments that are past their scheduled time but still Pending/Confirmed.
 * Called on dashboard load to keep data fresh.
 */
export async function expirePastAppointments() {
  const sql = `
    UPDATE Appointment SET Status = 'Cancelled'
    WHERE Time < NOW() AND Status IN ('Pending', 'Confirmed')
  `;
  return await query(sql);
}

export async function updateAppointmentStatus(appointmentId, status) {
  const sql = 'UPDATE Appointment SET Status = ? WHERE AppointmentID = ?';
  return await query(sql, [status, appointmentId]);
}

export async function cancelAppointment(appointmentId) {
  return await updateAppointmentStatus(appointmentId, APPOINTMENT_STATUS.CANCELLED);
}

export async function rescheduleAppointment(appointmentId, newTime) {
  const sql = 'UPDATE Appointment SET Time = ? WHERE AppointmentID = ?';
  return await query(sql, [newTime, appointmentId]);
}

/**
 * Checks if a slot is available (no non-cancelled appointment at that nurse+time).
 */
export async function checkSlotAvailable(staffNumber, time) {
  const sql = "SELECT AppointmentID FROM Appointment WHERE StaffNumber = ? AND Time = ? AND Status != 'Cancelled'";
  const rows = await query(sql, [staffNumber, time]);
  return rows.length === 0;
}

export async function updateAppointmentNotes(appointmentId, notes) {
  const sql = 'UPDATE Appointment SET Notes = ? WHERE AppointmentID = ?';
  return await query(sql, [notes, appointmentId]);
}


// ============================================================================
// PHASE 28: DAILY.CO VIDEO ROOM PERSISTENCE
// ============================================================================

/**
 * Persists the Daily room details onto an appointment.
 * roomExp is stored as a JS Date / SQL datetime.
 */
export async function setAppointmentRoom(appointmentId, { roomName, roomUrl, roomExp }) {
  const sql = 'UPDATE Appointment SET RoomName = ?, RoomUrl = ?, RoomExp = ? WHERE AppointmentID = ?';
  return await query(sql, [roomName, roomUrl, roomExp, appointmentId]);
}

/** Clears room details (on cancel/complete/expire teardown). */
export async function clearAppointmentRoom(appointmentId) {
  const sql = 'UPDATE Appointment SET RoomName = NULL, RoomUrl = NULL, RoomExp = NULL WHERE AppointmentID = ?';
  return await query(sql, [appointmentId]);
}

/** Demo appointments (APT-DEMO-*) for a nurse — used by the demo cleanup button. */
export async function getDemoAppointmentsForNurse(staffNumber) {
  const sql = `SELECT AppointmentID, RoomName FROM Appointment
               WHERE StaffNumber = ? AND AppointmentID LIKE 'APT-DEMO-%'`;
  return await query(sql, [staffNumber]);
}

/** Deletes all demo appointments (APT-DEMO-*) for a nurse. Returns affected row count. */
export async function deleteDemoAppointmentsForNurse(staffNumber) {
  const sql = `DELETE FROM Appointment
               WHERE StaffNumber = ? AND AppointmentID LIKE 'APT-DEMO-%'`;
  const result = await query(sql, [staffNumber]);
  return result.affectedRows || 0;
}

/** Finds an appointment by its Daily room name (used by the webhook auditor). */
export async function getAppointmentByRoomName(roomName) {
  const sql = 'SELECT * FROM Appointment WHERE RoomName = ?';
  const rows = await query(sql, [roomName]);
  return rows[0];
}

/** Online appointments that are past their room expiry but still hold a room (cleanup sweep). */
export async function getExpiredRoomAppointments() {
  const sql = `SELECT AppointmentID, RoomName FROM Appointment
               WHERE RoomName IS NOT NULL AND RoomExp IS NOT NULL AND RoomExp < NOW()`;
  return await query(sql);
}

// ============================================================================
// PHASE 28: CONSULTATION SESSION (webhook-driven attendance/audit)
// ============================================================================

/** Upserts a session row for a room, creating it on first event. */
export async function upsertConsultationSession(sessionId, appointmentId, roomName) {
  const sql = `INSERT INTO ConsultationSession (SessionID, AppointmentID, RoomName)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE AppointmentID = VALUES(AppointmentID)`;
  return await query(sql, [sessionId, appointmentId, roomName]);
}

export async function markSessionStarted(sessionId, startedAt) {
  const sql = 'UPDATE ConsultationSession SET StartedAt = ? WHERE SessionID = ?';
  return await query(sql, [startedAt, sessionId]);
}

export async function markParticipantJoined(sessionId, column, joinedAt) {
  // column is one of 'NurseJoinedAt' | 'StudentJoinedAt' — validated by caller against a whitelist.
  const sql = `UPDATE ConsultationSession SET ${column} = COALESCE(${column}, ?) WHERE SessionID = ?`;
  return await query(sql, [joinedAt, sessionId]);
}

export async function markSessionEnded(sessionId, endedAt, durationSeconds) {
  const sql = 'UPDATE ConsultationSession SET EndedAt = ?, DurationSeconds = ? WHERE SessionID = ?';
  return await query(sql, [endedAt, durationSeconds, sessionId]);
}
