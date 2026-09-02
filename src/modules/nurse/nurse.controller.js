// src/modules/nurse/nurse.controller.js
// Handles nurse dashboard, appointment status updates (auto-provisions Daily rooms), notes, and patient history.

import crypto from 'crypto';
import * as NurseModel from './nurse.model.js';
import * as AppointmentsModel from '../appointments/appointments.model.js';
import * as ReviewsModel from '../reviews/reviews.model.js';
import * as RoomService from '../appointments/room.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sanitize } from '../../utils/sanitize.js';
import { isValidStatus } from '../../middleware/validate.js';
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE } from '../../constants.js';

// Demo/showcase student used by the "Create Demo Consultation" button.
const DEMO_STUDENT_NUMBER = 's227921577';

// ============================================================================
// NURSE DASHBOARD
// ============================================================================

export const showNurseDashboard = catchAsync(async (req, res) => {
  const staffNumber = req.session.user.id;

  // Auto-expire stale appointments before displaying
  await AppointmentsModel.expirePastAppointments();

  const appointments = await AppointmentsModel.getAppointmentsForNurseWithStatus(staffNumber);

  // Get nurse's personal rating summary (ALL ratings — for self-improvement)
  const ratingSummary = await ReviewsModel.getAverageRatingForNurse(staffNumber);

  res.render('nurse/dashboard', {
    user: req.session.user,
    appointments,
    nurseAverage: ratingSummary.average ? parseFloat(Number(ratingSummary.average).toFixed(1)) : null,
    nurseRatingCount: ratingSummary.count || 0,
    error: null,
    success: null
  });
});

// ============================================================================
// DEMO: CREATE ONLINE CONSULTATION (showcase the Daily.co video feature)
// ============================================================================

/**
 * Creates a Confirmed online appointment for the demo student with THIS nurse,
 * scheduled ~5 minutes from now so the join window is immediately open, then
 * provisions the Daily video room. Purely for showcasing/testing.
 */
export const createDemoConsultation = catchAsync(async (req, res) => {
  const staffNumber = req.session.user.id;

  // Schedule 5 minutes from now → inside the [-15min, +60min] join window right away.
  const when = new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const sqlTime = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ` +
    `${pad(when.getHours())}:${pad(when.getMinutes())}:00`;

  const appointmentId = 'APT-DEMO-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  const result = await AppointmentsModel.atomicBookSlot({
    appointmentId,
    appointmentType: APPOINTMENT_TYPE.ONLINE,
    time: sqlTime,
    teamsId: null,
    studentNumber: DEMO_STUDENT_NUMBER,
    staffNumber,
    campus: null,
    preferredLanguage: 'English'
  });

  if (!result.success) {
    return res.redirect('/management/nurse/dashboard?toast=Demo+slot+busy,+try+again');
  }

  // Confirm it and provision the Daily room so "Join Consultation" appears instantly.
  await AppointmentsModel.updateAppointmentStatus(appointmentId, APPOINTMENT_STATUS.CONFIRMED);
  const apt = await AppointmentsModel.getAppointmentById(appointmentId);
  try {
    await RoomService.ensureRoomForAppointment(apt);
  } catch (roomErr) {
    console.error('[Phase28] Demo room provisioning failed:', roomErr.message);
    return res.redirect('/management/nurse/dashboard?toast=Demo+created+but+room+failed');
  }

  res.redirect('/management/nurse/dashboard?toast=Demo+online+consultation+ready');
});

/**
 * Deletes all demo consultations (APT-DEMO-*) for this nurse, tearing down their
 * Daily rooms first so nothing is left dangling.
 */
export const clearDemoConsultations = catchAsync(async (req, res) => {
  const staffNumber = req.session.user.id;

  const demos = await AppointmentsModel.getDemoAppointmentsForNurse(staffNumber);

  // Best-effort delete each Daily room (ignore rooms already expired/gone).
  for (const d of demos) {
    if (d.RoomName) {
      try {
        await RoomService.teardownRoom({ AppointmentID: d.AppointmentID, RoomName: d.RoomName });
      } catch (roomErr) {
        console.error('[Phase28] Demo room teardown failed:', roomErr.message);
      }
    }
  }

  const removed = await AppointmentsModel.deleteDemoAppointmentsForNurse(staffNumber);
  res.redirect('/management/nurse/dashboard?toast=Cleared+' + removed + '+demo+consultation' + (removed === 1 ? '' : 's'));
});

// ============================================================================
// APPOINTMENT STATUS UPDATE
// ============================================================================

export const changeAppointmentStatus = catchAsync(async (req, res) => {
  const { appointmentId, status } = req.body;

  if (!appointmentId || !isValidStatus(status)) {
    return res.redirect('/management/nurse/dashboard');
  }

  // Fetch current appointment to validate transition
  const apt = await AppointmentsModel.getAppointmentById(appointmentId);
  if (!apt) return res.redirect('/management/nurse/dashboard');

  const current = apt.Status || 'Pending';

  // Valid transitions:
  // Pending → Confirmed, Cancelled
  // Confirmed → Completed, Cancelled
  // Completed → (terminal)
  // Cancelled → (terminal)
  const validTransitions = {
    Pending: ['Confirmed', 'Cancelled'],
    Confirmed: ['Completed', 'Cancelled'],
    Completed: [],
    Cancelled: []
  };

  if (!(validTransitions[current] || []).includes(status)) {
    return res.redirect('/management/nurse/dashboard');
  }

  await AppointmentsModel.updateAppointmentStatus(appointmentId, status);

  // Phase 28: auto-create the Daily video room when an online appointment is confirmed,
  // and tear it down when the appointment is cancelled/completed.
  if (apt.AppointmentType === APPOINTMENT_TYPE.ONLINE) {
    try {
      if (status === APPOINTMENT_STATUS.CONFIRMED) {
        await RoomService.ensureRoomForAppointment(apt);
      } else if (status === APPOINTMENT_STATUS.CANCELLED || status === APPOINTMENT_STATUS.COMPLETED) {
        await RoomService.teardownRoom(apt);
      }
    } catch (roomErr) {
      // Room provisioning must not block the status change; log and continue.
      console.error('[Phase28] Room lifecycle error on status change:', roomErr.message);
    }
  }

  res.redirect('/management/nurse/dashboard?toast=Appointment+' + status.toLowerCase());
});

// ============================================================================
// CONSULTATION NOTES
// ============================================================================

export const saveAppointmentNotes = catchAsync(async (req, res) => {
  const { appointmentId, notes } = req.body;
  if (!appointmentId) return res.redirect('/management/nurse/dashboard');

  const cleanNotes = sanitize(notes);
  await AppointmentsModel.updateAppointmentNotes(appointmentId, cleanNotes);
  res.redirect('/management/nurse/dashboard?toast=Notes+saved');
});

// ============================================================================
// PATIENT HISTORY (with relationship check via ownership middleware)
// ============================================================================

export const showPatientHistory = catchAsync(async (req, res) => {
  const { studentNumber } = req.params;

  const patient = await NurseModel.getPatientProfile(studentNumber);
  if (!patient) return res.redirect('/management/nurse/dashboard');

  const logs = await NurseModel.getPatientSymptomHistory(studentNumber);

  res.render('nurse/patient-history', {
    user: req.session.user,
    patient,
    logs,
    error: null
  });
});

// ============================================================================
// BIO EDITOR
// ============================================================================

export const showBioEditor = catchAsync(async (req, res) => {
  const staffNumber = req.session.user.id;
  const bioData = await NurseModel.getNurseBioData(staffNumber);

  res.render('nurse/edit-bio', {
    user: req.session.user,
    bio: bioData?.Bio || '',
    yearsExperience: bioData?.YearsExperience || 0,
    error: null,
    success: null
  });
});

export const updateBio = catchAsync(async (req, res) => {
  const staffNumber = req.session.user.id;
  const bio = sanitize(req.body.bio).substring(0, 300);
  const yearsExperience = Math.max(0, Math.min(50, parseInt(req.body.yearsExperience) || 0));

  await NurseModel.updateNurseProfile(staffNumber, { bio, yearsExperience });

  res.render('nurse/edit-bio', {
    user: req.session.user,
    bio,
    yearsExperience,
    error: null,
    success: 'Profile updated successfully.'
  });
});
