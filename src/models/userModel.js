import { query } from '../config/database.js';

// ============================================================================
// STUDENT MODEL OPERATIONS (PascalCase DB Mapping)
// ============================================================================

export async function findStudentById(studentNumber) {
  const sql = 'SELECT * FROM Student WHERE StudentNumber = ?';
  const results = await query(sql, [studentNumber]);
  return results[0];
}

export async function createStudent({ studentNumber, firstName, lastName, address, medicalHistory, password }) {
  const sql = `
    INSERT INTO Student (StudentNumber, FirstName, LastName, Address, MedicalHistory, Password)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [
    studentNumber,
    firstName,
    lastName,
    address || '',
    medicalHistory || '',
    password
  ]);
}

// ============================================================================
// NURSE MODEL OPERATIONS (Admin Managed)
// ============================================================================

export async function findNurseById(staffNumber) {
  const sql = 'SELECT * FROM Nurse WHERE StaffNumber = ?';
  const results = await query(sql, [staffNumber]);
  return results[0];
}

export async function createNurse({ staffNumber, firstName, lastName, address, phoneNumber, password }) {
  const sql = `
    INSERT INTO Nurse (StaffNumber, FirstName, LastName, Address, PhoneNumber, Password)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [
    staffNumber,
    firstName,
    lastName,
    address || '',
    phoneNumber || '',
    password
  ]);
}