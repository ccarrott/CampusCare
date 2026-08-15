// src/modules/staff/staff.routes.js
// "Meet Our Staff" route definitions.

import { Router } from 'express';
import { requireAuth } from '../../middleware/authenticate.js';
import * as StaffController from './staff.controller.js';

const router = Router();

router.get('/', requireAuth, StaffController.showStaffPage);

export default router;
