// src/modules/symptoms/symptoms.routes.js
// Symptom checker route definitions (students only).

import { Router } from 'express';
import { requireRole } from '../../middleware/authorize.js';
import { ROLES } from '../../constants.js';
import * as SymptomsController from './symptoms.controller.js';

const router = Router();

// Symptom selection form
router.get('/', requireRole(ROLES.STUDENT), SymptomsController.renderSymptomForm);

// Process symptom and return OTC recommendations
router.post('/evaluate', requireRole(ROLES.STUDENT), SymptomsController.processSymptomCheck);

// View personal symptom history
router.get('/history', requireRole(ROLES.STUDENT), SymptomsController.showSymptomHistory);

export default router;
