// src/modules/auth/auth.routes.js
// Authentication route definitions.

import { Router } from 'express';
import * as AuthController from './auth.controller.js';

const router = Router();

// Login
router.get('/login', AuthController.getLoginPage);
router.post('/login', AuthController.handleLogin);

// Register
router.get('/register', AuthController.getRegisterPage);
router.post('/register', AuthController.handleRegister);

// Logout
router.get('/logout', AuthController.handleLogout);

// Session refresh (keeps session alive for timeout warning)
router.get('/refresh-session', (req, res) => res.sendStatus(200));

// Forgot Password
router.get('/forgot-password', AuthController.showForgotPasswordForm);
router.post('/forgot-password', AuthController.handleForgotPassword);

// Reset Password
router.get('/reset-password/:token', AuthController.showResetPasswordForm);
router.post('/reset-password/:token', AuthController.handleResetPassword);

export default router;
