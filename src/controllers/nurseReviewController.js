import * as NurseReviewModel from '../models/nurseReviewModel.js';
import * as AppointmentModel from '../models/appointmentModel.js';
import crypto from 'crypto';

// ============================================================================
// NURSE REVIEW CONTROLLER
// ============================================================================

/**
 * GET /consultations/review/:id
 * Shows the review page after a booking is made.
 */
export async function showReviewPage(req, res) {
  try {
    const appointmentId = req.params.id;
    const studentNumber = req.session.user.id;

    // Fetch the appointment with nurse details
    const rows = await AppointmentModel.rawQuery(`
      SELECT a.*, n.FirstName AS NurseFirstName, n.LastName AS NurseLastName
      FROM Appointment a
      INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
      WHERE a.AppointmentID = ? AND a.StudentNumber = ?
    `, [appointmentId, studentNumber]);

    if (!rows[0]) {
      return res.redirect('/consultations/my-appointments');
    }

    res.render('consultations/review', {
      user: req.session.user,
      appointment: rows[0],
      error: null
    });
  } catch (error) {
    console.error('Review page error:', error);
    res.redirect('/consultations/my-appointments');
  }
}

/**
 * POST /consultations/review
 * Handles nurse review submission and inserts into NurseReviews table.
 */
export async function handleReviewSubmission(req, res) {
  try {
    const { appointmentId, staffNumber, rating, reviewText } = req.body;
    const studentNumber = req.session.user.id;

    if (!appointmentId || !staffNumber || !rating || !reviewText) {
      return res.redirect('/consultations/my-appointments');
    }

    // Check if already reviewed
    const alreadyReviewed = await NurseReviewModel.hasReviewedAppointment(appointmentId, studentNumber);
    if (alreadyReviewed) {
      return res.redirect('/consultations/my-appointments');
    }

    // Generate unique review ID
    const reviewId = 'REV-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Basic XSS sanitization
    const sanitize = (str) => String(str || '').replace(/[<>]/g, '');

    await NurseReviewModel.createNurseReview({
      reviewId,
      appointmentId,
      studentNumber,
      staffNumber,
      rating: parseInt(rating, 10),
      reviewText: sanitize(reviewText)
    });

    res.redirect('/consultations/my-appointments');
  } catch (error) {
    console.error('Review submission error:', error);
    res.redirect('/consultations/my-appointments');
  }
}

/**
 * GET /consultations/nurse-reviews
 * Shows all nurse reviews left by the current student.
 */
export async function showStudentReviews(req, res) {
  try {
    const studentNumber = req.session.user.id;
    const reviews = await NurseReviewModel.getReviewsByStudent(studentNumber);

    res.render('consultations/nurse-reviews', {
      user: req.session.user,
      reviews,
      error: null
    });
  } catch (error) {
    console.error('Nurse reviews page error:', error);
    res.render('consultations/nurse-reviews', {
      user: req.session.user,
      reviews: [],
      error: 'Unable to load reviews. Please try again.'
    });
  }
}
