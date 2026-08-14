import * as AppointmentModel from '../models/appointmentModel.js';
import * as AvailabilityModel from '../models/availabilityModel.js';
import crypto from 'crypto';

// ============================================================================
// APPOINTMENT CONTROLLER - Booking & History
// ============================================================================

/**
 * Computes the next 5 working days (same logic as availability controller).
 */
function getUpcomingWeekDays() {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const orderedDays = [];
  let current = new Date(today);
  let count = 0;

  while (count < 5) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      const dayName = dayNames[dow];
      const formatted = current.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
      orderedDays.push({
        dayName,
        label: `${dayName} (${formatted})`,
        date: current.toISOString().slice(0, 10),
        key: dayName
      });
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return orderedDays;
}

/**
 * GET /consultations/book
 * Shows the booking form with available nurses.
 */
export async function showBookingForm(req, res) {
  try {
    const nurses = await AppointmentModel.getAvailableNurses();

    res.render('consultations/book', {
      user: req.session.user,
      nurses,
      error: null
    });
  } catch (error) {
    console.error('Booking form error:', error);
    res.status(500).render('consultations/book', {
      user: req.session.user,
      nurses: [],
      error: 'Unable to load booking form. Please try again.'
    });
  }
}

/**
 * GET /consultations/api/nurse-grid/:staffNumber
 * Returns the nurse's availability grid for the next 5 weekdays as JSON.
 * Used by the booking page to render the clickable slot grid.
 */
export async function getNurseGridAPI(req, res) {
  try {
    const { staffNumber } = req.params;
    const grid = await AvailabilityModel.getAvailabilityForNurse(staffNumber);
    const weekDays = getUpcomingWeekDays();
    const timeSlots = AvailabilityModel.TIME_SLOTS;

    // Also check existing bookings for this nurse in the next 5 days
    const bookedSlots = {};
    for (const wd of weekDays) {
      const sql = `SELECT TIME_FORMAT(Time, '%H:%i') AS BookedTime FROM Appointment WHERE StaffNumber = ? AND DATE(Time) = ?`;
      const rows = await AppointmentModel.rawQuery(sql, [staffNumber, wd.date]);
      bookedSlots[wd.key] = rows.map(r => r.BookedTime);
    }

    res.json({ grid, weekDays, timeSlots, bookedSlots });
  } catch (error) {
    console.error('Nurse grid API error:', error);
    res.status(500).json({ error: 'Failed to fetch nurse availability.' });
  }
}

/**
 * POST /consultations/book
 * Processes the booking form submission.
 */
export async function handleBooking(req, res) {
  try {
    const { appointmentType, staffNumber, time, campus, preferredLanguage } = req.body;
    const studentNumber = req.session.user.id;

    if (!appointmentType || !staffNumber || !time) {
      const nurses = await AppointmentModel.getAvailableNurses();
      return res.status(400).render('consultations/book', {
        user: req.session.user,
        nurses,
        error: 'All fields are required to book an appointment.'
      });
    }

    // If Physical, campus is required
    if (appointmentType === 'Physical' && !campus) {
      const nurses = await AppointmentModel.getAvailableNurses();
      return res.status(400).render('consultations/book', {
        user: req.session.user,
        nurses,
        error: 'Please select a campus for in-person consultations.'
      });
    }

    // If Online, preferred language is required
    if (appointmentType === 'Online' && !preferredLanguage) {
      const nurses = await AppointmentModel.getAvailableNurses();
      return res.status(400).render('consultations/book', {
        user: req.session.user,
        nurses,
        error: 'Please select your preferred language for the Teams meeting.'
      });
    }

    // Validate not a weekend
    const bookingDate = new Date(time);
    const dow = bookingDate.getDay();
    if (dow === 0 || dow === 6) {
      const nurses = await AppointmentModel.getAvailableNurses();
      return res.status(400).render('consultations/book', {
        user: req.session.user,
        nurses,
        error: 'Appointments cannot be booked on weekends.'
      });
    }

    // Check for duplicate timeslot (same nurse + same time)
    const existing = await AppointmentModel.rawQuery(
      "SELECT AppointmentID FROM Appointment WHERE StaffNumber = ? AND Time = ? AND Status != 'Cancelled'",
      [staffNumber, time]
    );
    if (existing.length > 0) {
      const nurses = await AppointmentModel.getAvailableNurses();
      return res.status(400).render('consultations/book', {
        user: req.session.user,
        nurses,
        error: 'This time slot is already booked. Please select a different slot.'
      });
    }

    // Generate unique appointment ID
    const appointmentId = 'APT-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Online appointments: nurse will add Teams link later
    let teamsId = null;

    await AppointmentModel.createAppointment({
      appointmentId,
      appointmentType,
      time,
      teamsId,
      studentNumber,
      staffNumber,
      campus: appointmentType === 'Physical' ? campus : null,
      preferredLanguage: appointmentType === 'Online' ? preferredLanguage : null
    });

    // Redirect to the review page so student can leave a nurse review
    res.redirect('/consultations/review/' + appointmentId);
  } catch (error) {
    console.error('Booking error:', error);
    const nurses = await AppointmentModel.getAvailableNurses();
    res.status(500).render('consultations/book', {
      user: req.session.user,
      nurses,
      error: 'Failed to book appointment. Please try again.'
    });
  }
}

/**
 * GET /consultations/my-appointments
 * Displays the student's appointment history with status.
 */
export async function showStudentAppointments(req, res) {
  try {
    const studentNumber = req.session.user.id;
    const appointments = await AppointmentModel.getAppointmentsByStudentWithStatus(studentNumber);

    // Get already-rated appointment IDs (check by AppointmentID existence in Rating table)
    const ratedRows = await AppointmentModel.rawQuery(
      `SELECT r.AppointmentID FROM Rating r
       INNER JOIN Appointment a ON r.AppointmentID = a.AppointmentID
       WHERE a.StudentNumber = ?`, [studentNumber]
    );
    const ratedIds = ratedRows.map(r => r.AppointmentID);

    res.render('consultations/index', {
      user: req.session.user,
      appointments,
      ratedIds,
      error: null
    });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).render('consultations/index', {
      user: req.session.user,
      appointments: [],
      ratedIds: [],
      error: 'Unable to load appointments. Please try again.'
    });
  }
}

/**
 * POST /consultations/cancel
 * Student cancels an upcoming appointment.
 */
export async function handleCancelAppointment(req, res) {
  try {
    const { appointmentId } = req.body;
    const studentNumber = req.session.user.id;

    // Verify ownership
    const apt = await AppointmentModel.getAppointmentById(appointmentId);
    if (!apt || apt.StudentNumber !== studentNumber) {
      return res.redirect('/consultations/my-appointments');
    }

    // Only allow cancelling Pending or Confirmed
    if (apt.Status === 'Completed' || apt.Status === 'Cancelled') {
      return res.redirect('/consultations/my-appointments');
    }

    await AppointmentModel.cancelAppointment(appointmentId);
    res.redirect('/consultations/my-appointments');
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.redirect('/consultations/my-appointments');
  }
}

/**
 * POST /consultations/reschedule
 * Student reschedules an appointment to a new time.
 */
export async function handleRescheduleAppointment(req, res) {
  try {
    const { appointmentId, newTime } = req.body;
    const studentNumber = req.session.user.id;

    if (!appointmentId || !newTime) {
      return res.redirect('/consultations/my-appointments');
    }

    // Verify ownership
    const apt = await AppointmentModel.getAppointmentById(appointmentId);
    if (!apt || apt.StudentNumber !== studentNumber) {
      return res.redirect('/consultations/my-appointments');
    }

    // Only reschedule Pending or Confirmed
    if (apt.Status === 'Completed' || apt.Status === 'Cancelled') {
      return res.redirect('/consultations/my-appointments');
    }

    await AppointmentModel.rescheduleAppointment(appointmentId, newTime);
    res.redirect('/consultations/my-appointments');
  } catch (error) {
    console.error('Reschedule error:', error);
    res.redirect('/consultations/my-appointments');
  }
}
