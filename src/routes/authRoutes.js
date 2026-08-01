import { Router } from 'express';
import {
  getLoginPage,
  getRegisterPage,
  handleLogin,
  handleRegister,
  handleLogout,
  showForgotPasswordForm,
  handleForgotPassword,
  showResetPasswordForm,
  handleResetPassword
} from '../controllers/authController.js';

const router = Router();

// Login
router.get('/login', getLoginPage);
router.post('/login', handleLogin);

// Register
router.get('/register', getRegisterPage);
router.post('/register', handleRegister);

// Logout
router.get('/logout', handleLogout);

// Session refresh (keeps session alive)
router.get('/refresh-session', (req, res) => { res.sendStatus(200); });

// Forgot Password
router.get('/forgot-password', showForgotPasswordForm);
router.post('/forgot-password', handleForgotPassword);

// Reset Password
router.get('/reset-password/:token', showResetPasswordForm);
router.post('/reset-password/:token', handleResetPassword);

export default router;
