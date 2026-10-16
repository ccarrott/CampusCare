// src/modules/reviews/reviews.controller.js
// Handles rating submissions, nurse reviews, and review pages (merged from ratingController + nurseReviewController).

import crypto from 'crypto';
import * as ReviewsModel from './reviews.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sanitize } from '../../utils/sanitize.js';
import { isValidScore } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import { APPOINTMENT_STATUS } from '../../constants.js';

// ============================================================================
// RATING SUBMISSION (from appointment history)
// ============================================================================

export const handleRatingSubmission = catchAsync(async (req, res) => {
  const { appointmentId, score, ratingDescription } = req.body;

  if (!appointmentId) {
    return res.redirect('/consultations/my-appointments');
  }
  // A star rating is mandatory — tell the student instead of silently bouncing.
  if (!score || !isValidScore(score)) {
    return res.redirect('/consultations/my-appointments?toast=' +
      encodeURIComponent('Please select a star rating.') + '&toastType=error');
  }

  // Verify appointment exists, belongs to student, and is Completed
  const apt = await ReviewsModel.getAppointmentForReview(appointmentId, req.session.user.id);
  if (!apt || apt.Status !== APPOINTMENT_STATUS.COMPLETED) {
    return res.redirect('/consultations/my-appointments');
  }

  // Prevent duplicate ratings
  const existing = await ReviewsModel.getRatingByAppointment(appointmentId);
  if (existing) {
    return res.redirect('/consultations/my-appointments');
  }

  const ratingId = 'RAT-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  await ReviewsModel.createRating({
    ratingId,
    score: parseInt(score, 10),
    ratingDescription: sanitize(ratingDescription),
    appointmentId,
    studentNumber: req.session.user.id
  });

  res.redirect('/consultations/my-appointments?toast=Rating+submitted');
});

// ============================================================================
// NURSE REVIEW PAGE (post-booking flow)
// ============================================================================

export const showReviewPage = catchAsync(async (req, res) => {
  const appointmentId = req.params.id;
  const studentNumber = req.session.user.id;

  const appointment = await ReviewsModel.getAppointmentForReview(appointmentId, studentNumber);
  if (!appointment) {
    return res.redirect('/consultations/my-appointments');
  }

  // Only attended/completed consultations can be reviewed. A past consultation still
  // sitting in Pending (or Cancelled) must not reach the review form.
  if (appointment.Status !== APPOINTMENT_STATUS.COMPLETED) {
    return res.redirect('/consultations/my-appointments?toast=' +
      encodeURIComponent('You can only review a completed consultation.') + '&toastType=error');
  }

  res.render('consultations/review', { user: req.session.user, appointment, error: null });
});

export const handleReviewSubmission = catchAsync(async (req, res) => {
  const { appointmentId, staffNumber, rating, reviewText } = req.body;
  const studentNumber = req.session.user.id;

  if (!staffNumber) {
    return res.redirect('/consultations/nurse-reviews');
  }

  // A star rating is mandatory — comment stays optional. Surface a clear error.
  if (!rating || !isValidScore(rating)) {
    return res.redirect('/consultations/nurse-reviews?toast=' +
      encodeURIComponent('Please select a star rating.') + '&toastType=error');
  }

  // The consultation being reviewed must actually be completed. The form carries the
  // appointmentId it was opened for; verify ownership + Completed status before accepting.
  if (appointmentId) {
    const reviewed = await ReviewsModel.getAppointmentForReview(appointmentId, studentNumber);
    if (!reviewed || reviewed.Status !== APPOINTMENT_STATUS.COMPLETED) {
      return res.redirect('/consultations/my-appointments?toast=' +
        encodeURIComponent('You can only review a completed consultation.') + '&toastType=error');
    }
  }

  // One review per nurse per student
  const alreadyReviewed = await ReviewsModel.hasReviewedNurse(studentNumber, staffNumber);
  if (alreadyReviewed) {
    return res.redirect('/consultations/nurse-reviews');
  }

  // Get the most recent completed appointment to link the review to
  const apt = await ReviewsModel.getMostRecentCompletedAppointment(studentNumber, staffNumber);
  if (!apt) {
    return res.redirect('/consultations/nurse-reviews');
  }

  const reviewId = 'REV-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  await ReviewsModel.createNurseReview({
    reviewId,
    appointmentId: apt.AppointmentID,
    studentNumber,
    staffNumber,
    rating: parseInt(rating, 10),
    reviewText: sanitize(reviewText || '')
  });

  res.redirect('/consultations/nurse-reviews?toast=Review+submitted+for+approval');
});

// ============================================================================
// VIEW MY REVIEWS
// ============================================================================

export const showStudentReviews = catchAsync(async (req, res) => {
  const studentNumber = req.session.user.id;
  const reviews = await ReviewsModel.getReviewsByStudent(studentNumber);
  const reviewableNurses = await ReviewsModel.getReviewableNursesForStudent(studentNumber);
  res.render('consultations/nurse-reviews', { user: req.session.user, reviews, reviewableNurses, error: null });
});
