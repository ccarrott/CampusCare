// src/middleware/ownership.js
// IDOR prevention — validates resource ownership before allowing access.

import { query } from '../config/database.js';
import { AppError } from '../utils/AppError.js';

/**
 * Verifies the requesting student owns the appointment (from req.body.appointmentId or req.params.id).
 */
export function requireAppointmentOwner(req, res, next) {
  const appointmentId = req.body.appointmentId || req.params.id;
  const userId = req.session.user.id;

  if (!appointmentId) return next(new AppError('Appointment ID required', 400));

  query('SELECT StudentNumber FROM Appointment WHERE AppointmentID = ?', [appointmentId])
    .then(rows => {
      if (!rows[0]) return next(new AppError('Appointment not found', 404));
      if (rows[0].StudentNumber !== userId) return next(new AppError('Access denied', 403));
      next();
    })
    .catch(next);
}

/**
 * Verifies the requesting nurse is assigned to the appointment.
 */
export function requireAssignedNurse(req, res, next) {
  const appointmentId = req.body.appointmentId || req.params.id;
  const staffNumber = req.session.user.id;

  if (!appointmentId) return next(new AppError('Appointment ID required', 400));

  query('SELECT StaffNumber FROM Appointment WHERE AppointmentID = ?', [appointmentId])
    .then(rows => {
      if (!rows[0]) return next(new AppError('Appointment not found', 404));
      if (rows[0].StaffNumber !== staffNumber) return next(new AppError('Access denied', 403));
      next();
    })
    .catch(next);
}

/**
 * Verifies the nurse has at least one appointment with the patient (clinical relationship).
 */
export function requirePatientRelationship(req, res, next) {
  const patientId = req.params.id || req.params.studentNumber;
  const staffNumber = req.session.user.id;

  if (!patientId) return next(new AppError('Patient ID required', 400));

  query(
    'SELECT AppointmentID FROM Appointment WHERE StaffNumber = ? AND StudentNumber = ? LIMIT 1',
    [staffNumber, patientId]
  )
    .then(rows => {
      if (!rows[0]) return next(new AppError('No clinical relationship with this patient', 403));
      next();
    })
    .catch(next);
}
