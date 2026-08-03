import { Router } from 'express';
import { requireStudent, requireAuth } from '../middlewares/authMiddleware.js';
import { showBookingForm, handleBooking, showStudentAppointments, getNurseGridAPI, handleCancelAppointment, handleRescheduleAppointment } from '../controllers/appointmentController.js';
import { handleRatingSubmission } from '../controllers/ratingController.js';
import { getUpcomingAppointmentsAPI } from '../controllers/notificationController.js';
import { showReviewPage, handleReviewSubmission, showStudentReviews } from '../controllers/nurseReviewController.js';

const router = Router();

// GET /consultations/book - Show booking form
router.get('/book', requireStudent, showBookingForm);

// POST /consultations/book - Process booking
router.post('/book', requireStudent, handleBooking);

// API: Get nurse availability grid for booking (any auth student)
router.get('/api/nurse-grid/:staffNumber', requireStudent, getNurseGridAPI);

// GET /consultations/my-appointments - View student appointments
router.get('/my-appointments', requireStudent, showStudentAppointments);

// GET /consultations/confirmed/:id - Booking confirmation
router.get('/confirmed/:id', requireStudent, async (req, res) => {
  try {
    const { query: dbQuery } = await import('../config/database.js');
    const rows = await dbQuery(`
      SELECT a.*, n.FirstName AS NurseFirstName, n.LastName AS NurseLastName
      FROM Appointment a INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
      WHERE a.AppointmentID = ? AND a.StudentNumber = ?
    `, [req.params.id, req.session.user.id]);
    if (!rows[0]) return res.redirect('/consultations/my-appointments');
    res.render('consultations/confirmed', { user: req.session.user, appointment: rows[0] });
  } catch (e) { res.redirect('/consultations/my-appointments'); }
});

// POST /consultations/rate - Submit appointment rating
router.post('/rate', requireStudent, handleRatingSubmission);

// GET /consultations/review/:id - Show review page after booking
router.get('/review/:id', requireStudent, showReviewPage);

// POST /consultations/review - Submit nurse review
router.post('/review', requireStudent, handleReviewSubmission);

// GET /consultations/nurse-reviews - View all student's nurse reviews
router.get('/nurse-reviews', requireStudent, showStudentReviews);

// POST /consultations/cancel - Cancel an appointment
router.post('/cancel', requireStudent, handleCancelAppointment);

// POST /consultations/reschedule - Reschedule an appointment
router.post('/reschedule', requireStudent, handleRescheduleAppointment);

// API: Get upcoming appointments for notification system (any auth user)
router.get('/api/upcoming', requireAuth, getUpcomingAppointmentsAPI);

export default router;
