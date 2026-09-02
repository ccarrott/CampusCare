// src/modules/appointments/appointments.controller.js
// Handles booking, appointment history, cancellation, and rescheduling.

import crypto from 'crypto';
import * as AppointmentsModel from './appointments.model.js';
import * as AvailabilityModel from '../availability/availability.model.js';
import * as ReviewsModel from '../reviews/reviews.model.js';
import * as RoomService from './room.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { AppError } from '../../utils/AppError.js';
import { getUpcomingWeekDays } from '../../utils/dates.js';
import { APPOINTMENT_TYPE, APPOINTMENT_STATUS, ROLES } from '../../constants.js';

// ============================================================================
// BOOKING FORM
// ============================================================================

export const showBookingForm = catchAsync(async (req, res) => {
  const nurses = await AppointmentsModel.getAvailableNurses();
  res.render('consultations/book', { user: req.session.user, nurses, error: null });
});

// ============================================================================
// NURSE GRID API (JSON — feeds the booking slot picker)
// ============================================================================

export const getNurseGridAPI = catchAsync(async (req, res) => {
  const { staffNumber } = req.params;
  const grid = await AvailabilityModel.getAvailabilityForNurse(staffNumber);
  const weekDays = getUpcomingWeekDays();
  const timeSlots = AvailabilityModel.TIME_SLOTS;

  // Get already-booked times per day
  const bookedSlots = {};
  for (const wd of weekDays) {
    const rows = await AppointmentsModel.getBookedTimesForNurse(staffNumber, wd.date);
    bookedSlots[wd.key] = rows.map(r => r.BookedTime);
  }

  res.json({ grid, weekDays, timeSlots, bookedSlots });
});

// ============================================================================
// BOOKING SUBMISSION (Atomic transaction)
// ============================================================================

export const handleBooking = catchAsync(async (req, res) => {
  const { appointmentType, staffNumber, time, campus, preferredLanguage } = req.body;
  const studentNumber = req.session.user.id;

  // Validation
  if (!appointmentType || !staffNumber || !time) {
    const nurses = await AppointmentsModel.getAvailableNurses();
    return res.status(400).render('consultations/book', {
      user: req.session.user, nurses, error: 'All fields are required to book an appointment.'
    });
  }

  if (appointmentType === APPOINTMENT_TYPE.PHYSICAL && !campus) {
    const nurses = await AppointmentsModel.getAvailableNurses();
    return res.status(400).render('consultations/book', {
      user: req.session.user, nurses, error: 'Please select a campus for in-person consultations.'
    });
  }

  if (appointmentType === APPOINTMENT_TYPE.ONLINE && !preferredLanguage) {
    const nurses = await AppointmentsModel.getAvailableNurses();
    return res.status(400).render('consultations/book', {
      user: req.session.user, nurses, error: 'Please select your preferred language for the video consultation.'
    });
  }

  // Weekend check
  const bookingDate = new Date(time);
  if (bookingDate.getDay() === 0 || bookingDate.getDay() === 6) {
    const nurses = await AppointmentsModel.getAvailableNurses();
    return res.status(400).render('consultations/book', {
      user: req.session.user, nurses, error: 'Appointments cannot be booked on weekends.'
    });
  }

  // Atomic booking (race-condition safe)
  const appointmentId = 'APT-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const result = await AppointmentsModel.atomicBookSlot({
    appointmentId,
    appointmentType,
    time,
    teamsId: null,
    studentNumber,
    staffNumber,
    campus: appointmentType === APPOINTMENT_TYPE.PHYSICAL ? campus : null,
    preferredLanguage: appointmentType === APPOINTMENT_TYPE.ONLINE ? preferredLanguage : null
  });

  if (!result.success) {
    const nurses = await AppointmentsModel.getAvailableNurses();
    return res.status(409).render('consultations/book', {
      user: req.session.user, nurses, error: 'This time slot has already been booked. Please select a different slot.'
    });
  }

  res.redirect('/consultations/confirmed/' + appointmentId);
});

// ============================================================================
// STUDENT APPOINTMENT HISTORY
// ============================================================================

export const showStudentAppointments = catchAsync(async (req, res) => {
  const studentNumber = req.session.user.id;

  // Auto-expire stale appointments before displaying
  await AppointmentsModel.expirePastAppointments();

  const appointments = await AppointmentsModel.getAppointmentsByStudentWithStatus(studentNumber);
  const ratedIds = await AppointmentsModel.getRatedAppointmentIds(studentNumber);

  res.render('consultations/index', {
    user: req.session.user, appointments, ratedIds, error: null
  });
});

// ============================================================================
// CANCEL
// ============================================================================

export const handleCancelAppointment = catchAsync(async (req, res) => {
  const { appointmentId } = req.body;
  const studentNumber = req.session.user.id;

  const apt = await AppointmentsModel.getAppointmentById(appointmentId);
  if (!apt || apt.StudentNumber !== studentNumber) {
    throw new AppError('Access denied', 403);
  }

  if (apt.Status === APPOINTMENT_STATUS.COMPLETED || apt.Status === APPOINTMENT_STATUS.CANCELLED) {
    return res.redirect('/consultations/my-appointments');
  }

  await AppointmentsModel.cancelAppointment(appointmentId);

  // Phase 28: tear down the video room so no orphaned/joinable room lingers.
  if (apt.AppointmentType === APPOINTMENT_TYPE.ONLINE && apt.RoomName) {
    try {
      await RoomService.teardownRoom(apt);
    } catch (roomErr) {
      console.error('[Phase28] Room teardown error on cancel:', roomErr.message);
    }
  }

  res.redirect('/consultations/my-appointments?toast=Appointment+cancelled');
});

// ============================================================================
// RESCHEDULE
// ============================================================================

export const handleRescheduleAppointment = catchAsync(async (req, res) => {
  const { appointmentId, newTime } = req.body;
  const studentNumber = req.session.user.id;

  if (!appointmentId || !newTime) return res.redirect('/consultations/my-appointments');

  const apt = await AppointmentsModel.getAppointmentById(appointmentId);
  if (!apt || apt.StudentNumber !== studentNumber) {
    throw new AppError('Access denied', 403);
  }

  if (apt.Status === APPOINTMENT_STATUS.COMPLETED || apt.Status === APPOINTMENT_STATUS.CANCELLED) {
    return res.redirect('/consultations/my-appointments');
  }

  // Weekend validation
  const newDate = new Date(newTime);
  if (newDate.getDay() === 0 || newDate.getDay() === 6) {
    return res.redirect('/consultations/my-appointments?toast=Cannot+book+on+weekends');
  }

  // Atomic slot availability check (same protection as initial booking)
  const slotFree = await AppointmentsModel.checkSlotAvailable(apt.StaffNumber, newTime);
  if (!slotFree) {
    return res.redirect('/consultations/my-appointments?toast=Slot+already+taken');
  }

  await AppointmentsModel.rescheduleAppointment(appointmentId, newTime);

  // Phase 28: if an online room already exists, move its expiry window to the new time.
  if (apt.AppointmentType === APPOINTMENT_TYPE.ONLINE && apt.RoomName) {
    try {
      await RoomService.refreshRoomExpiry(apt, newTime);
    } catch (roomErr) {
      console.error('[Phase28] Room refresh error on reschedule:', roomErr.message);
    }
  }

  res.redirect('/consultations/my-appointments?toast=Appointment+rescheduled');
});

// ============================================================================
// BOOKING CONFIRMATION
// ============================================================================

export const showConfirmation = catchAsync(async (req, res) => {
  const appointment = await AppointmentsModel.getAppointmentWithNurse(req.params.id, req.session.user.id);
  if (!appointment) return res.redirect('/consultations/my-appointments');
  res.render('consultations/confirmed', { user: req.session.user, appointment });
});

// ============================================================================
// NURSE PROFILE API (JSON — for booking flow nurse card)
// ============================================================================

export const getNurseProfileAPI = catchAsync(async (req, res) => {
  const { staffNumber } = req.params;

  // Get nurse basic info
  const nurses = await AppointmentsModel.getAvailableNurses();
  const nurse = nurses.find(n => n.StaffNumber === staffNumber);
  if (!nurse) return res.status(404).json({ error: 'Nurse not found' });

  // Get nurse extended profile (Bio, YearsExperience)
  const profile = await AppointmentsModel.getNurseProfile(staffNumber);

  // Get verified rating average + recent reviews (student-facing = approved only)
  const { average, count } = await ReviewsModel.getVerifiedAverageForNurse(staffNumber);
  const recentReviews = await ReviewsModel.getVerifiedRatingsForNurse(staffNumber, 3);

  res.json({
    firstName: nurse.FirstName,
    lastName: nurse.LastName,
    bio: profile?.Bio || null,
    yearsExperience: profile?.YearsExperience || 0,
    averageRating: average ? parseFloat(Number(average).toFixed(1)) : null,
    ratingCount: count || 0,
    recentReviews: recentReviews.map((r, i) => ({
      patient: `Patient ${i + 1}`,
      score: r.Score,
      comment: r.RatingDescription,
      date: r.CreatedAt
    }))
  });
});

// ============================================================================
// PHASE 28: JOIN VIDEO CONSULTATION (student or assigned nurse)
// ============================================================================

export const showJoinConsultation = catchAsync(async (req, res) => {
  const appointmentId = req.params.id;
  const user = req.session.user;

  const apt = await AppointmentsModel.getAppointmentById(appointmentId);
  if (!apt) throw new AppError('Appointment not found', 404);

  // Ownership: the student who booked it, or the nurse assigned to it.
  const isStudentOwner = user.role === ROLES.STUDENT && apt.StudentNumber === user.id;
  const isAssignedNurse = user.role === ROLES.NURSE && apt.StaffNumber === user.id;
  if (!isStudentOwner && !isAssignedNurse) {
    throw new AppError('Access denied', 403);
  }

  // Must be an online, confirmed consultation.
  if (apt.AppointmentType !== APPOINTMENT_TYPE.ONLINE) {
    throw new AppError('This is not an online consultation.', 400);
  }
  if (apt.Status !== APPOINTMENT_STATUS.CONFIRMED) {
    throw new AppError('This consultation is not confirmed yet.', 403);
  }

  // Time window guard — no joining a week early or long after the slot.
  if (!RoomService.isWithinJoinWindow(apt.Time)) {
    return res.status(403).render('error', {
      user,
      statusCode: 403,
      message: 'The consultation room opens 15 minutes before your scheduled time.'
    });
  }

  // Ensure a live room exists (covers nurse joining before an explicit confirm-side create,
  // or a room that expired and needs recreating), then mint a per-user token.
  await RoomService.ensureRoomForAppointment(apt);
  const { url, token } = await RoomService.mintTokenForUser(apt, user);

  const returnUrl = user.role === ROLES.NURSE
    ? '/management/nurse/dashboard'
    : '/consultations/my-appointments';

  res.render('consultations/call', {
    user,
    appointment: apt,
    roomUrl: url,
    meetingToken: token,
    returnUrl
  });
});
