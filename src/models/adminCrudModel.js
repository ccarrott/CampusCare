import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// ============================================================================
// ADMIN CRUD MODEL - Student & Nurse Management
// ============================================================================

// --- STUDENTS ---

export async function getAllStudents() {
  return await query('SELECT StudentNumber, FirstName, LastName, Email, Address, MedicalHistory FROM Student ORDER BY LastName ASC');
}

export async function getStudentById(studentNumber) {
  const results = await query('SELECT * FROM Student WHERE StudentNumber = ?', [studentNumber]);
  return results[0];
}

export async function createStudent({ studentNumber, firstName, lastName, email, address, medicalHistory, password }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const sql = `
    INSERT INTO Student (StudentNumber, FirstName, LastName, Email, Address, MedicalHistory, Password)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [studentNumber, firstName, lastName, email || '', address || '', medicalHistory || '', hashedPassword]);
}

export async function updateStudent(studentNumber, { firstName, lastName, email, address, medicalHistory }) {
  const sql = `
    UPDATE Student SET FirstName = ?, LastName = ?, Email = ?, Address = ?, MedicalHistory = ?
    WHERE StudentNumber = ?
  `;
  return await query(sql, [firstName, lastName, email || '', address || '', medicalHistory || '', studentNumber]);
}

export async function deleteStudent(studentNumber) {
  // Delete related records first (cascade manually)
  await query('DELETE FROM SymptomLog WHERE StudentNumber = ?', [studentNumber]);
  await query('DELETE FROM StudentZone WHERE StudentNumber = ?', [studentNumber]);
  await query('DELETE FROM Rating WHERE StudentNumber = ?', [studentNumber]);
  await query('DELETE FROM Appointment WHERE StudentNumber = ?', [studentNumber]);
  await query('DELETE FROM Student WHERE StudentNumber = ?', [studentNumber]);
}

export async function searchStudents(searchQuery) {
  const sql = `
    SELECT StudentNumber, FirstName, LastName, Email, Address
    FROM Student
    WHERE StudentNumber LIKE ? OR FirstName LIKE ? OR LastName LIKE ?
    ORDER BY LastName ASC
  `;
  const param = `%${searchQuery}%`;
  return await query(sql, [param, param, param]);
}

// --- NURSES ---

export async function getAllNurses() {
  return await query('SELECT StaffNumber, FirstName, LastName, Email, PhoneNumber, Address, ClinicID FROM Nurse ORDER BY LastName ASC');
}

export async function getNurseById(staffNumber) {
  const results = await query('SELECT * FROM Nurse WHERE StaffNumber = ?', [staffNumber]);
  return results[0];
}

export async function createNurse({ staffNumber, firstName, lastName, email, phoneNumber, address, clinicId, password }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const sql = `
    INSERT INTO Nurse (StaffNumber, FirstName, LastName, Email, PhoneNumber, Address, ClinicID, Password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [staffNumber, firstName, lastName, email || '', phoneNumber || '', address || '', clinicId || null, hashedPassword]);
}

export async function updateNurse(staffNumber, { firstName, lastName, email, phoneNumber, address, clinicId }) {
  const sql = `
    UPDATE Nurse SET FirstName = ?, LastName = ?, Email = ?, PhoneNumber = ?, Address = ?, ClinicID = ?
    WHERE StaffNumber = ?
  `;
  return await query(sql, [firstName, lastName, email || '', phoneNumber || '', address || '', clinicId || null, staffNumber]);
}

export async function deleteNurse(staffNumber) {
  // Check for active appointments
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
