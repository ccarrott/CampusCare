import { query } from '../config/database.js';

// ============================================================================
// APPOINTMENT MODEL OPERATIONS
// ============================================================================

/**
 * Fetches all nurses available for booking.
 */
export async function getAvailableNurses() {
  const sql = 'SELECT StaffNumber, FirstName, LastName FROM Nurse';
  return await query(sql);
}

/**
 * Creates a new appointment record.
 */
export async function createAppointment({ appointmentId, appointmentType, time, teamsId, studentNumber, staffNumber }) {
  const sql = `
    INSERT INTO Appointment (AppointmentID, AppointmentType, Time, TeamsID, StudentNumber, StaffNumber)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [appointmentId, appointmentType, time, teamsId || null, studentNumber, staffNumber]);
}

/**
 * Fetches a single appointment by ID.
 */
export async function getAppointmentById(appointmentId) {
  const sql = 'SELECT * FROM Appointment WHERE AppointmentID = ?';
  const results = await query(sql, [appointmentId]);
  return results[0];
}


/**
 * Exposes the raw query function for controller use (custom queries).
 */
export async function rawQuery(sql, params) {
  return await query(sql, params);
}

// ============================================================================
// APPOINTMENT LIFECYCLE (Status, Cancel, Reschedule, Notes)
// ============================================================================

/**
 * Updates appointment status (Pending → Confirmed → Completed / Cancelled).
 */
export async function updateAppointmentStatus(appointmentId, status) {
  const sql = 'UPDATE Appointment SET Status = ? WHERE AppointmentID = ?';
  return await query(sql, [status, appointmentId]);
}

/**
 * Cancels an appointment by setting Status = 'Cancelled'.
 */
export async function cancelAppointment(appointmentId) {
  return await updateAppointmentStatus(appointmentId, 'Cancelled');
}

/**
 * Reschedules an appointment to a new time.
 */
export async function rescheduleAppointment(appointmentId, newTime) {
  const sql = 'UPDATE Appointment SET Time = ? WHERE AppointmentID = ?';
  return await query(sql, [newTime, appointmentId]);
}

/**
 * Saves nurse consultation notes for an appointment.
 */
export async function updateAppointmentNotes(appointmentId, notes) {
  const sql = 'UPDATE Appointment SET Notes = ? WHERE AppointmentID = ?';
  return await query(sql, [notes, appointmentId]);
}

/**
 * Fetches student appointments with status included.
 */
export async function getAppointmentsByStudentWithStatus(studentNumber) {
  const sql = `
    SELECT
      a.AppointmentID,
      a.AppointmentType,
      a.Time,
      a.TeamsID,
      a.Status,
      a.Notes,
      a.StaffNumber,
      n.FirstName AS NurseFirstName,
      n.LastName AS NurseLastName
    FROM Appointment a
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    WHERE a.StudentNumber = ?
    ORDER BY a.Time DESC
  `;
  return await query(sql, [studentNumber]);
}

/**
 * Fetches nurse appointments with status and student details.
 */
export async function getAppointmentsForNurseWithStatus(staffNumber) {
  const sql = `
    SELECT
      a.AppointmentID,
      a.AppointmentType,
      a.Time,
      a.TeamsID,
      a.Status,
      a.Notes,
      a.StudentNumber,
      s.FirstName AS StudentFirstName,
      s.LastName AS StudentLastName,
      s.MedicalHistory
    FROM Appointment a
    INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
    WHERE a.StaffNumber = ?
    ORDER BY a.Time DESC
  `;
  return await query(sql, [staffNumber]);
}
