// src/modules/profile/profile.routes.js
// Profile route definitions.

import { Router } from 'express';
import { requireAuth } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { ROLES } from '../../constants.js';
import * as ProfileController from './profile.controller.js';

const router = Router();

// View profile (any authenticated user)
router.get('/', requireAuth, ProfileController.showProfile);

// Edit form (students only)
router.get('/edit', requireRole(ROLES.STUDENT), ProfileController.showEditProfile);

// Update profile fields (students only)
router.post('/update', requireRole(ROLES.STUDENT), ProfileController.updateProfile);

// Delete account (students only)
router.post('/delete', requireRole(ROLES.STUDENT), ProfileController.deleteAccount);

// Change password (all roles)
router.post('/change-password', requireAuth, ProfileController.changePassword);

export default router;
