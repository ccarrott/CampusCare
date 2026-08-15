// src/modules/availability/availability.routes.js
// Nurse availability grid route definitions.

import { Router } from 'express';
import { requireRole } from '../../middleware/authorize.js';
import { ROLES } from '../../constants.js';
import * as AvailabilityController from './availability.controller.js';

const router = Router();

// Show availability grid (nurse only)
router.get('/availability', requireRole(ROLES.NURSE), AvailabilityController.showAvailabilityGrid);

// Save availability grid (nurse only)
router.post('/availability', requireRole(ROLES.NURSE), AvailabilityController.saveAvailability);

export default router;
