// src/modules/nurse/nurse.controller.js
// Handles nurse dashboard, Teams link management, appointment status updates, notes, and patient history.

import * as NurseModel from './nurse.model.js';
import * as AppointmentsModel from '../appointments/appointments.model.js';
import * as ReviewsModel from '../reviews/reviews.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sanitize } from '../../utils/sanitize.js';
import { isValidStatus } from '../../middleware/validate.js';
import { APPOINTMENT_STATUS } from '../../constants.js';

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
// TEAMS LINK MANAGEMENT
// ============================================================================

export const updateTeamsLink = catchAsync(async (req, res) => {
  const { appointmentId, teamsId } = req.body;
  if (!appointmentId || !teamsId) return res.redirect('/management/nurse/dashboard');

  const cleanLink = sanitize(teamsId);
  await NurseModel.updateTeamsLink(appointmentId, cleanLink);
  res.redirect('/management/nurse/dashboard');
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
  res.redirect('/management/nurse/dashboard');
});

// ============================================================================
// CONSULTATION NOTES
// ============================================================================

export const saveAppointmentNotes = catchAsync(async (req, res) => {
  const { appointmentId, notes } = req.body;
  if (!appointmentId) return res.redirect('/management/nurse/dashboard');

  const cleanNotes = sanitize(notes);
  await AppointmentsModel.updateAppointmentNotes(appointmentId, cleanNotes);
  res.redirect('/management/nurse/dashboard');
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
