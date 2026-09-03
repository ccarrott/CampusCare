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
      (SELECT COUNT(*) FROM Appointment) AS TotalAppointments,
      (SELECT COUNT(*) FROM Nurse) AS TotalNurses,
      (SELECT AVG(Score) FROM Rating) AS AverageNurseRating
  `;
  const results = await query(sql);
  return results[0];
}

export async function getAppointmentsByType() {
  const sql = 'SELECT AppointmentType, COUNT(*) AS Count FROM Appointment GROUP BY AppointmentType';
  return await query(sql);
}

/**
 * Phase 28: video consultation analytics from webhook-logged ConsultationSession rows.
 * Returns completed count, average duration (minutes), and a no-show count.
 */
export async function getVideoConsultationStats() {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM ConsultationSession WHERE EndedAt IS NOT NULL) AS CompletedSessions,
      (SELECT ROUND(AVG(DurationSeconds) / 60, 1) FROM ConsultationSession WHERE DurationSeconds IS NOT NULL) AS AvgDurationMin,
      (SELECT COUNT(*) FROM Appointment a
         WHERE a.AppointmentType = 'Online' AND a.Status = 'Confirmed'
           AND a.Time < NOW()
           AND NOT EXISTS (
             SELECT 1 FROM ConsultationSession cs
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
    INNER JOIN Appointment a ON r.AppointmentID = a.AppointmentID
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    ORDER BY r.Score DESC
  `;
  return await query(sql);
}

export async function getDailyAppointmentCounts(days = 14) {
  const sql = `
    SELECT DATE(Time) AS day, COUNT(*) AS count
    FROM Appointment
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

export async function createStudent({ studentNumber, firstName, lastName, medicalHistory, password }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const sql = `
    INSERT INTO Student (StudentNumber, FirstName, LastName, MedicalHistory, Password)
    VALUES (?, ?, ?, ?, ?)
  `;
  return await query(sql, [studentNumber, firstName, lastName, medicalHistory || '', hashedPassword]);
}

export async function updateStudent(studentNumber, { firstName, lastName, medicalHistory }) {
  const sql = `
    UPDATE Student SET FirstName = ?, LastName = ?, MedicalHistory = ?
    WHERE StudentNumber = ?
  `;
  return await query(sql, [firstName, lastName, medicalHistory || '', studentNumber]);
}

export async function deleteStudent(studentNumber) {
  await query('DELETE FROM SymptomLog WHERE StudentNumber = ?', [studentNumber]);
  await query('DELETE FROM StudentZone WHERE StudentNumber = ?', [studentNumber]);
  await query('DELETE FROM Rating WHERE StudentNumber = ?', [studentNumber]);
  await query('DELETE FROM Appointment WHERE StudentNumber = ?', [studentNumber]);
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

export async function updateNurse(staffNumber, { firstName, lastName, email, phoneNumber, campus, clinicId }) {
  const sql = `
    UPDATE Nurse SET FirstName = ?, LastName = ?, Email = ?, PhoneNumber = ?, Campus = ?, ClinicID = ?
    WHERE StaffNumber = ?
  `;
  return await query(sql, [firstName, lastName, email || '', phoneNumber || '', campus || null, clinicId || null, staffNumber]);
}

export async function deleteNurse(staffNumber) {
  const appointments = await query('SELECT COUNT(*) AS c FROM Appointment WHERE StaffNumber = ?', [staffNumber]);
  if (appointments[0].c > 0) {
    throw new Error('Cannot delete nurse with existing appointments. Reassign or cancel them first.');
  }
  await query('DELETE FROM NurseAvailability WHERE StaffNumber = ?', [staffNumber]);
  await query('DELETE FROM Nurse WHERE StaffNumber = ?', [staffNumber]);
}

export async function getAllClinics() {
  return await query('SELECT RegNum, Name FROM Clinic ORDER BY Name ASC');
}
