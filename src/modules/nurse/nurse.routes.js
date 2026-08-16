// src/modules/nurse/nurse.routes.js
// Nurse dashboard and clinical management route definitions.

import { Router } from 'express';
import { requireRole } from '../../middleware/authorize.js';
import { requirePatientRelationship, requireAssignedNurse } from '../../middleware/ownership.js';
import { ROLES } from '../../constants.js';
import * as NurseController from './nurse.controller.js';

const router = Router();

// Dashboard
router.get('/dashboard', requireRole(ROLES.NURSE), NurseController.showNurseDashboard);

// Teams link
router.post('/update-teams-link', requireRole(ROLES.NURSE), requireAssignedNurse, NurseController.updateTeamsLink);

// Appointment status + notes
router.post('/appointment/status', requireRole(ROLES.NURSE), requireAssignedNurse, NurseController.changeAppointmentStatus);
router.post('/appointment/notes', requireRole(ROLES.NURSE), requireAssignedNurse, NurseController.saveAppointmentNotes);

// Patient history (IDOR-protected: nurse must have clinical relationship)
router.get('/patient/:studentNumber/history', requireRole(ROLES.NURSE), requirePatientRelationship, NurseController.showPatientHistory);

export default router;
