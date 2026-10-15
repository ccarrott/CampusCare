// src/modules/admin/admin.model.js
// Database queries for admin operations: reports, student CRUD, nurse CRUD (merged from adminReportModel + adminCrudModel).

import { query } from '../../config/database.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// ============================================================================
// OPERATIONAL REPORTS
// ============================================================================

export async function getOperationalReportData() {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM Student) AS TotalStudents,
      (SELECT COUNT(*) FROM Consultation) AS TotalAppointments,
      (SELECT COUNT(*) FROM Nurse) AS TotalNurses,
      (SELECT AVG(Score) FROM Rating) AS AverageNurseRating
  `;
  const results = await query(sql);
  return results[0];
}

export async function getAppointmentsByType() {
  const sql = 'SELECT AppointmentType, COUNT(*) AS Count FROM Consultation GROUP BY AppointmentType';
  return await query(sql);
}

/**
 * Phase 28: video consultation analytics from webhook-logged OnlineConsultationSession rows.
 * Returns completed count, average duration (minutes), and a no-show count.
 */
export async function getVideoConsultationStats() {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM OnlineConsultationSession WHERE EndedAt IS NOT NULL) AS CompletedSessions,
      (SELECT ROUND(AVG(Duration) / 60, 1) FROM OnlineConsultationSession WHERE Duration IS NOT NULL) AS AvgDurationMin,
      (SELECT COUNT(*) FROM Consultation a
         WHERE a.AppointmentType = 'Online' AND a.Status = 'Confirmed'
           AND a.Time < NOW()
           AND NOT EXISTS (
             SELECT 1 FROM OnlineConsultationSession cs
             WHERE cs.AppointmentID = a.AppointmentID AND cs.StudentJoinedAt IS NOT NULL
           )
      ) AS NoShowCount
  `;
  const results = await query(sql);
  return results[0];
}

export async function getAllRatings() {
  const sql = `
    SELECT r.RatingID, r.Score, r.RatingDescription, r.AppointmentID,
           a.StaffNumber, n.FirstName AS NurseFirstName, n.LastName AS NurseLastName
    FROM Rating r
    INNER JOIN Consultation a ON r.AppointmentID = a.AppointmentID
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    ORDER BY r.Score DESC
  `;
  return await query(sql);
}

export async function getDailyAppointmentCounts(days = 14) {
  const sql = `
    SELECT DATE(Time) AS day, COUNT(*) AS count
    FROM Consultation
    WHERE Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(Time)
    ORDER BY day ASC
  `;
  return await query(sql, [days]);
}

// ============================================================================
// STUDENT CRUD
// ============================================================================

export async function getAllStudents() {
  return await query('SELECT StudentNumber, FirstName, LastName, MedicalHistory FROM Student ORDER BY LastName ASC');
}

export async function getStudentById(studentNumber) {
  const results = await query('SELECT * FROM Student WHERE StudentNumber = ?', [studentNumber]);
  return results[0];
}

export async function updateStudent(studentNumber, { firstName, lastName, medicalHistory }) {
  const sql = `
    UPDATE Student SET FirstName = ?, LastName = ?, MedicalHistory = ?
    WHERE StudentNumber = ?
  `;
  return await query(sql, [firstName, lastName, medicalHistory || '', studentNumber]);
}

export async function deleteStudent(studentNumber) {
  // Child rows (Consultation, Rating, NurseReviews, SymptomLog -> SymptomLogEntry,
  // StudentZone) now cascade automatically via ON DELETE CASCADE from Student.
  // PasswordResetToken is polymorphic (UserID has NO FK), so its rows must still
  // be cleared by hand before the student goes.
  await query("DELETE FROM PasswordResetToken WHERE UserID = ? AND UserType = 'student'", [studentNumber]);
  await query('DELETE FROM Student WHERE StudentNumber = ?', [studentNumber]);
}

export async function searchStudents(searchQuery) {
  const sql = `
    SELECT StudentNumber, FirstName, LastName
    FROM Student
    WHERE StudentNumber LIKE ? OR FirstName LIKE ? OR LastName LIKE ?
    ORDER BY LastName ASC
  `;
  const param = `%${searchQuery}%`;
  return await query(sql, [param, param, param]);
}

// ============================================================================
// NURSE CRUD
// ============================================================================

export async function getAllNurses() {
  return await query(`
    SELECT n.StaffNumber, n.FirstName, n.LastName, n.Email, n.PhoneNumber, n.Campus, n.ClinicID,
           c.Name AS ClinicName
    FROM Nurse n
    LEFT JOIN Clinic c ON n.ClinicID = c.RegNum
    ORDER BY n.LastName ASC
  `);
}

export async function searchNurses(searchQuery) {
  const sql = `
    SELECT n.StaffNumber, n.FirstName, n.LastName, n.Email, n.PhoneNumber, n.Campus, n.ClinicID,
           c.Name AS ClinicName
    FROM Nurse n
    LEFT JOIN Clinic c ON n.ClinicID = c.RegNum
    WHERE n.StaffNumber LIKE ? OR n.FirstName LIKE ? OR n.LastName LIKE ? OR n.Email LIKE ? OR n.Campus LIKE ?
    ORDER BY n.LastName ASC
  `;
  const param = `%${searchQuery}%`;
  return await query(sql, [param, param, param, param, param]);
}

export async function getNurseById(staffNumber) {
  const results = await query(`
    SELECT n.*, c.Name AS ClinicName
    FROM Nurse n
    LEFT JOIN Clinic c ON n.ClinicID = c.RegNum
    WHERE n.StaffNumber = ?
  `, [staffNumber]);
  return results[0];
}

export async function createNurse({ staffNumber, firstName, lastName, email, phoneNumber, campus, clinicId, password }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const sql = `
    INSERT INTO Nurse (StaffNumber, FirstName, LastName, Email, PhoneNumber, Campus, ClinicID, Password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [staffNumber, firstName, lastName, email || '', phoneNumber || '', campus || null, clinicId || null, hashedPassword]);
}

// Admin nurse edit is restricted to Campus + Assigned Clinic only (Plan 3 Item 18).
// Name/email/phone are set at creation and not editable by an admin thereafter.
export async function updateNurse(staffNumber, { campus, clinicId }) {
  const sql = `
    UPDATE Nurse SET Campus = ?, ClinicID = ?
    WHERE StaffNumber = ?
  `;
  return await query(sql, [campus || null, clinicId || null, staffNumber]);
}

export async function deleteNurse(staffNumber) {
  // Decision 1 (FULL CASCADE): removing a nurse wipes their Consultations and,
  // onward via ON DELETE CASCADE, the Ratings / NurseReviews / OnlineConsultationSession
  // tied to those consultations, plus the nurse's NurseAvailability. No application-level
  // guard — the DB cascade handles everything.
  await query('DELETE FROM Nurse WHERE StaffNumber = ?', [staffNumber]);
}

export async function getAllClinics() {
  return await query('SELECT RegNum, Name FROM Clinic ORDER BY Name ASC');
}
