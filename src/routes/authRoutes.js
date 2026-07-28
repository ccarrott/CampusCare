import { Router } from 'express';
import {
  getLoginPage,
  getRegisterPage,
  handleLogin,
  handleRegister,
  handleLogout
} from '../controllers/authController.js';

const router = Router();

// GET routes (Display forms)
router.get('/login', getLoginPage);
router.get('/register', getRegisterPage);

// POST routes (Process submitted form data)
router.post('/login', handleLogin);
router.post('/register', handleRegister);

// Logout route
router.get('/logout', handleLogout);

export default router;