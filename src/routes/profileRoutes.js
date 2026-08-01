import { Router } from 'express';
import { requireAuth, requireStudent } from '../middlewares/authMiddleware.js';
import { showProfile, showEditProfile, updateProfile, deleteAccount, changePassword } from '../controllers/profileController.js';

const router = Router();

// GET /profile - View profile (any authenticated user)
router.get('/', requireAuth, showProfile);

// GET /profile/edit - Show edit form (students only)
router.get('/edit', requireStudent, showEditProfile);

// POST /profile/update - Update student profile fields
router.post('/update', requireStudent, updateProfile);

// POST /profile/delete - Permanently delete student account
router.post('/delete', requireStudent, deleteAccount);

// POST /profile/change-password - Change password (all roles)
router.post('/change-password', requireAuth, changePassword);

export default router;
