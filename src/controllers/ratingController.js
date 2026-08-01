import * as RatingModel from '../models/ratingModel.js';
import crypto from 'crypto';

// ============================================================================
// RATING CONTROLLER - Appointment Feedback
// ============================================================================

/**
 * POST /consultations/rate
 * Submits a rating for a completed appointment.
 */
export async function handleRatingSubmission(req, res) {
  try {
    const { appointmentId, score, ratingDescription } = req.body;

    if (!appointmentId || !score) {
      return res.redirect('/consultations/my-appointments');
    }

    // Check if already rated
    const existingRating = await RatingModel.getRatingByAppointment(appointmentId);
    if (existingRating) {
      return res.redirect('/consultations/my-appointments');
    }

    // Generate unique rating ID
    const ratingId = 'RAT-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Basic XSS sanitization
    const sanitize = (str) => String(str || '').replace(/[<>]/g, '');

    await RatingModel.createRating({
      ratingId,
      score: parseInt(score, 10),
      ratingDescription: sanitize(ratingDescription),
      appointmentId,
      studentNumber: req.session.user.id
    });

    res.redirect('/consultations/my-appointments');
  } catch (error) {
    console.error('Rating submission error:', error);
    res.redirect('/consultations/my-appointments');
  }
}
