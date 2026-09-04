// src/modules/auth/auth.routes.js
// Authentication route definitions.

import { Router } from 'express';
import * as AuthController from './auth.controller.js';
import { authRateLimit } from '../../middleware/rateLimit.js';

const router = Router();

// Credential endpoints are the only unauthenticated POSTs in the app, so they are
// the ones worth throttling: without this an internet-facing login accepts
// unlimited password guesses. Limits are generous enough that a real user
// fumbling their password never notices.
const loginLimit = authRateLimit('auth/login', { windowMs: 15 * 60 * 1000, max: 10 });
const registerLimit = authRateLimit('auth/register', { windowMs: 60 * 60 * 1000, max: 10 });
const forgotLimit = authRateLimit('auth/forgot-password', { windowMs: 60 * 60 * 1000, max: 8 });
const resetLimit = authRateLimit('auth/reset-password', { windowMs: 60 * 60 * 1000, max: 10 });

// Login
router.get('/login', AuthController.getLoginPage);
router.post('/login', loginLimit, AuthController.handleLogin);

// Register
router.get('/register', AuthController.getRegisterPage);
router.post('/register', registerLimit, AuthController.handleRegister);

// Logout
router.get('/logout', AuthController.handleLogout);

// Session refresh (keeps session alive for timeout warning)
router.get('/refresh-session', (req, res) => res.sendStatus(200));

// Forgot Password
router.get('/forgot-password', AuthController.showForgotPasswordForm);
router.post('/forgot-password', forgotLimit, AuthController.handleForgotPassword);

// Reset Password
router.get('/reset-password/:token', AuthController.showResetPasswordForm);
router.post('/reset-password/:token', resetLimit, AuthController.handleResetPassword);

export default router;
