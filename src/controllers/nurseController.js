import * as NurseManagementModel from '../models/nurseManagementModel.js';
import * as AppointmentModel from '../models/appointmentModel.js';

// ============================================================================
// NURSE CONTROLLER - Clinical Dashboard & Appointment Management
// ============================================================================

/**
 * GET /management/nurse/dashboard
 * Displays the nurse's assigned appointments with status and notes.
 */
export async function showNurseDashboard(req, res) {
  try {
    const staffNumber = req.session.user.id;
    const appointments = await AppointmentModel.getAppointmentsForNurseWithStatus(staffNumber);

    res.render('nurse/dashboard', {
      user: req.session.user,
      appointments,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Nurse dashboard error:', error);
    res.status(500).render('nurse/dashboard', {
      user: req.session.user,
      appointments: [],
      error: 'Unable to load schedule. Please try again.',
      success: null
    });
  }
}

/**
 * POST /management/nurse/update-teams-link
 */
export async function updateTeamsLink(req, res) {
  try {
    const { appointmentId, teamsId } = req.body;
    if (!appointmentId || !teamsId) return res.redirect('/management/nurse/dashboard');

    const cleanLink = String(teamsId).replace(/[<>]/g, '');
    await NurseManagementModel.updateTeamsLink(appointmentId, cleanLink);
    res.redirect('/management/nurse/dashboard');
  } catch (error) {
    console.error('Teams link update error:', error);
    res.redirect('/management/nurse/dashboard');
  }
}

/**
 * POST /management/nurse/appointment/status
 * Updates appointment status (Confirm / Complete / Cancel).
 */
export async function changeAppointmentStatus(req, res) {
  try {
    const { appointmentId, status } = req.body;
    const validStatuses = ['Confirmed', 'Completed', 'Cancelled'];

    if (!appointmentId || !validStatuses.includes(status)) {
      return res.redirect('/management/nurse/dashboard');
    }

    await AppointmentModel.updateAppointmentStatus(appointmentId, status);
    res.redirect('/management/nurse/dashboard');
  } catch (error) {
    console.error('Status update error:', error);
    res.redirect('/management/nurse/dashboard');
  }
}

/**
 * POST /management/nurse/appointment/notes
 * Saves nurse consultation notes for an appointment.
 */
export async function saveAppointmentNotes(req, res) {
  try {
    const { appointmentId, notes } = req.body;
    if (!appointmentId) return res.redirect('/management/nurse/dashboard');

    const cleanNotes = String(notes || '').replace(/[<>]/g, '');
    await AppointmentModel.updateAppointmentNotes(appointmentId, cleanNotes);
    res.redirect('/management/nurse/dashboard');
  } catch (error) {
    console.error('Notes save error:', error);
    res.redirect('/management/nurse/dashboard');
  }
}
