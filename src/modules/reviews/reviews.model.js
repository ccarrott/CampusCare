// src/modules/reviews/reviews.model.js
// Database queries for appointment ratings and nurse reviews (merged from ratingModel + nurseReviewModel).

import { query } from '../../config/database.js';

// ============================================================================
// RATINGS (per-appointment feedback)
// ============================================================================

export async function createRating({ ratingId, score, ratingDescription, appointmentId, studentNumber }) {
  const sql = `
    INSERT INTO Rating (RatingID, AppointmentID, Score, RatingDescription, StudentNumber)
    VALUES (?, ?, ?, ?, ?)
  `;
  return await query(sql, [ratingId, appointmentId, score, ratingDescription, studentNumber || null]);
}

export async function getRatingByAppointment(appointmentId) {
  const sql = 'SELECT * FROM Rating WHERE AppointmentID = ?';
  const results = await query(sql, [appointmentId]);
  return results[0];
}

// ============================================================================
// NURSE REVIEWS (per-nurse feedback with text)
// ============================================================================

export async function createNurseReview({ reviewId, appointmentId, studentNumber, staffNumber, rating, reviewText }) {
  const sql = `
    INSERT INTO NurseReviews (ReviewID, AppointmentID, StudentNumber, StaffNumber, Rating, ReviewText)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  return await query(sql, [reviewId, appointmentId, studentNumber, staffNumber, rating, reviewText]);
}

export async function hasReviewedAppointment(appointmentId, studentNumber) {
  const sql = 'SELECT ReviewID FROM NurseReviews WHERE AppointmentID = ? AND StudentNumber = ?';
  const results = await query(sql, [appointmentId, studentNumber]);
  return results.length > 0;
}

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

// ============================================================================
// AGGREGATE QUERIES (for admin/nurse dashboards)
// ============================================================================

export async function getAllRatings() {
  const sql = `
    SELECT r.RatingID, r.Score, r.RatingDescription, r.AppointmentID, r.CreatedAt,
           a.StaffNumber, n.FirstName AS NurseFirstName, n.LastName AS NurseLastName,
           s.FirstName AS StudentFirstName, s.LastName AS StudentLastName
    FROM Rating r
    INNER JOIN Appointment a ON r.AppointmentID = a.AppointmentID
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
    ORDER BY r.CreatedAt DESC
  `;
  return await query(sql);
}

/**
 * Gets average rating for a nurse (ALL ratings — for nurse self-view).
 */
export async function getAverageRatingForNurse(staffNumber) {
  const sql = `
    SELECT AVG(r.Score) AS average, COUNT(*) AS count
    FROM Rating r
    INNER JOIN Appointment a ON r.AppointmentID = a.AppointmentID
    WHERE a.StaffNumber = ?
  `;
  const results = await query(sql, [staffNumber]);
  return results[0] || { average: null, count: 0 };
}

/**
 * Gets average rating for a nurse (only from Rating table — student-facing).
 */
export async function getVerifiedAverageForNurse(staffNumber) {
  const sql = `
    SELECT AVG(r.Score) AS average, COUNT(*) AS count
    FROM Rating r
    INNER JOIN Appointment a ON r.AppointmentID = a.AppointmentID
    WHERE a.StaffNumber = ?
  `;
  const results = await query(sql, [staffNumber]);
  return results[0] || { average: null, count: 0 };
}

/**
 * Gets individual ratings for a nurse (for Meet Our Staff + booking card).
 */
export async function getVerifiedRatingsForNurse(staffNumber, limit = 50) {
  const sql = `
    SELECT r.Score, r.RatingDescription, r.CreatedAt
    FROM Rating r
    INNER JOIN Appointment a ON r.AppointmentID = a.AppointmentID
    WHERE a.StaffNumber = ?
    ORDER BY r.CreatedAt DESC
    LIMIT ?
  `;
  return await query(sql, [staffNumber, String(limit)]);
}

/**
 * Gets all nurses with their average ratings (admin overview).
 */
export async function getAllNurseAverages() {
  const sql = `
    SELECT n.StaffNumber, n.FirstName, n.LastName,
           AVG(r.Score) AS Average,
           COUNT(r.RatingID) AS TotalCount
    FROM Nurse n
    LEFT JOIN Appointment a ON n.StaffNumber = a.StaffNumber
    LEFT JOIN Rating r ON a.AppointmentID = r.AppointmentID
    GROUP BY n.StaffNumber, n.FirstName, n.LastName
    ORDER BY Average DESC
  `;
  return await query(sql);
}

/**
 * Gets the appointment + nurse details for the review page (post-booking).
 */
export async function getAppointmentForReview(appointmentId, studentNumber) {
  const sql = `
    SELECT a.*, n.FirstName AS NurseFirstName, n.LastName AS NurseLastName
    FROM Appointment a
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    WHERE a.AppointmentID = ? AND a.StudentNumber = ?
  `;
  const results = await query(sql, [appointmentId, studentNumber]);
  return results[0];
}

/**
 * Gets nurses that a student has completed consultations with but hasn't reviewed yet.
 * A student can only review a nurse ONCE (regardless of how many appointments they had).
 */
export async function getReviewableNursesForStudent(studentNumber) {
  const sql = `
    SELECT DISTINCT n.StaffNumber, n.FirstName, n.LastName
    FROM Appointment a
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    WHERE a.StudentNumber = ? AND a.Status = 'Completed'
      AND n.StaffNumber NOT IN (
        SELECT nr.StaffNumber FROM NurseReviews nr WHERE nr.StudentNumber = ?
      )
    ORDER BY n.LastName ASC
  `;
  return await query(sql, [studentNumber, studentNumber]);
}

/**
 * Checks if a student has already reviewed a specific nurse (one review per nurse per student).
 */
export async function hasReviewedNurse(studentNumber, staffNumber) {
  const sql = 'SELECT ReviewID FROM NurseReviews WHERE StudentNumber = ? AND StaffNumber = ?';
  const results = await query(sql, [studentNumber, staffNumber]);
  return results.length > 0;
}

/**
 * Gets the most recent completed appointment between a student and a nurse (for linking the review).
 */
export async function getMostRecentCompletedAppointment(studentNumber, staffNumber) {
  const sql = `
    SELECT AppointmentID FROM Appointment
    WHERE StudentNumber = ? AND StaffNumber = ? AND Status = 'Completed'
    ORDER BY Time DESC LIMIT 1
  `;
  const results = await query(sql, [studentNumber, staffNumber]);
  return results[0];
}

// ============================================================================
// NURSE REVIEW MODERATION (admin)
// ============================================================================

/**
 * Gets all pending nurse reviews for the admin moderation queue.
 */
export async function getPendingNurseReviews() {
  const sql = `
    SELECT nr.ReviewID, nr.Rating, nr.ReviewText, nr.CreatedAt, nr.StaffNumber,
           n.FirstName AS NurseFirstName, n.LastName AS NurseLastName,
           s.FirstName AS StudentFirstName, s.LastName AS StudentLastName
    FROM NurseReviews nr
    INNER JOIN Nurse n ON nr.StaffNumber = n.StaffNumber
    INNER JOIN Student s ON nr.StudentNumber = s.StudentNumber
    WHERE nr.Verified = 'Pending'
    ORDER BY nr.CreatedAt ASC
  `;
  return await query(sql);
}

/**
 * Updates the verification status of a nurse review (admin approve/reject).
 */
export async function updateNurseReviewVerification(reviewId, status) {
  const sql = 'UPDATE NurseReviews SET Verified = ?, VerifiedAt = NOW() WHERE ReviewID = ?';
  return await query(sql, [status, reviewId]);
}
