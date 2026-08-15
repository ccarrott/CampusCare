// src/modules/appointments/appointments.routes.js
// Appointment booking and management route definitions.

import { Router } from 'express';
import { requireRole } from '../../middleware/authorize.js';
import { ROLES } from '../../constants.js';
import * as AppointmentsController from './appointments.controller.js';

const router = Router();

// Booking form
router.get('/book', requireRole(ROLES.STUDENT), AppointmentsController.showBookingForm);
router.post('/book', requireRole(ROLES.STUDENT), AppointmentsController.handleBooking);

// Nurse grid API (JSON)
router.get('/api/nurse-grid/:staffNumber', requireRole(ROLES.STUDENT), AppointmentsController.getNurseGridAPI);

// Nurse profile API (JSON — for booking flow card)
router.get('/api/nurse-profile/:staffNumber', requireRole(ROLES.STUDENT), AppointmentsController.getNurseProfileAPI);

// Student appointment history
router.get('/my-appointments', requireRole(ROLES.STUDENT), AppointmentsController.showStudentAppointments);

// Booking confirmation page
router.get('/confirmed/:id', requireRole(ROLES.STUDENT), AppointmentsController.showConfirmation);

// Cancel / Reschedule
router.post('/cancel', requireRole(ROLES.STUDENT), AppointmentsController.handleCancelAppointment);
router.post('/reschedule', requireRole(ROLES.STUDENT), AppointmentsController.handleRescheduleAppointment);

export default router;
