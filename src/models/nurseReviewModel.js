import { query } from '../config/database.js';

// ============================================================================
// NURSE REVIEW MODEL OPERATIONS
// ============================================================================

/**
 * Creates a new nurse review record in the NurseReviews table.
 */
export async function createNurseReview({ reviewId, appointmentId, studentNumber, staffNumber, rating, reviewText }) {
  const sql = `
    INSERT INTO NurseReviews (ReviewID, AppointmentID, StudentNumber, StaffNumber, Rating, ReviewText)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [reviewId, appointmentId, studentNumber, staffNumber, rating, reviewText]);
}

/**
 * Fetches all reviews for a specific nurse.
 */
export async function getReviewsByNurse(staffNumber) {
  const sql = `
    SELECT nr.*, s.FirstName AS StudentFirstName, s.LastName AS StudentLastName
    FROM NurseReviews nr
    INNER JOIN Student s ON nr.StudentNumber = s.StudentNumber
    WHERE nr.StaffNumber = ?
    ORDER BY nr.CreatedAt DESC
  `;
  return await query(sql, [staffNumber]);
}

/**
 * Fetches all reviews left by a specific student.
 */
export async function getReviewsByStudent(studentNumber) {
  const sql = `
    SELECT nr.*, n.FirstName AS NurseFirstName, n.LastName AS NurseLastName
    FROM NurseReviews nr
    INNER JOIN Nurse n ON nr.StaffNumber = n.StaffNumber
    WHERE nr.StudentNumber = ?
    ORDER BY nr.CreatedAt DESC
  `;
  return await query(sql, [studentNumber]);
}

/**
 * Checks if a student has already reviewed a specific appointment.
 */
export async function hasReviewedAppointment(appointmentId, studentNumber) {
  const sql = 'SELECT ReviewID FROM NurseReviews WHERE AppointmentID = ? AND StudentNumber = ?';
  const results = await query(sql, [appointmentId, studentNumber]);
  return results.length > 0;
}
