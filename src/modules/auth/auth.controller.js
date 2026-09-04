// src/modules/auth/auth.controller.js
// Handles login, registration, logout, and password reset flows.

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as AuthModel from './auth.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sanitize } from '../../utils/sanitize.js';
import { isValidStudentNumber, isValidPassword } from '../../middleware/validate.js';
import { ROLES } from '../../constants.js';

const SALT_ROUNDS = 10;

/**
 * Regenerates the session ID before attaching the user, then persists it.
 * Without this, a session ID an attacker planted before login stays valid
 * afterwards (session fixation) — the fixed ID would carry their privileges.
 */
function startAuthenticatedSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenErr) => {
      if (regenErr) return reject(regenErr);
      req.session.user = user;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

/**
 * Whether the on-screen password-reset link may be shown.
 *
 * The app has no mail server, so the reset link is rendered in the page. That is a
 * demo shortcut, and on a public deployment it is an account-takeover path: anyone
 * who knows a student number can mint a reset link for it. It is therefore OFF by
 * default in production and must be switched on deliberately.
 */
function resetLinkIsVisible() {
  if (process.env.ALLOW_INSECURE_PASSWORD_RESET === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

// ============================================================================
// LOGIN
// ============================================================================

export function getLoginPage(req, res) {
  res.render('auth/login', { error: null });
}

export const handleLogin = catchAsync(async (req, res) => {
  // A username may be entered as a bare number (s227921577 / NUR001) OR as an
  // email (s227921577@mandela.ac.za). Slice off anything from '@' onward so both resolve.
  const idNumber = sanitize(req.body.idNumber).split('@')[0];
  const password = req.body.password || '';

  if (!idNumber || !password) {
    return res.render('auth/login', { error: 'Please enter your username and password.', idNumber });
  }

  // Auto-detect: Student → Nurse → Admin
  let user = null;
  let role = null;

  user = await AuthModel.findStudentById(idNumber);
  if (user) role = ROLES.STUDENT;

  if (!user) {
    user = await AuthModel.findNurseById(idNumber);
    if (user) role = ROLES.NURSE;
  }

  if (!user) {
    user = await AuthModel.findAdminById(idNumber);
    if (user) role = ROLES.ADMIN;
  }

  if (!user || !user.Password) {
    return res.render('auth/login', { error: 'Invalid username or password.', idNumber });
  }

  const isMatch = await bcrypt.compare(password, user.Password);
  if (!isMatch) {
    return res.render('auth/login', { error: 'Invalid username or password.', idNumber });
  }

  // Build session
  const fullName = role === ROLES.ADMIN
    ? (user.Name || `Admin ${idNumber}`)
    : `${user.FirstName || ''} ${user.LastName || ''}`.trim() || `User ${idNumber}`;

  const userId = role === ROLES.STUDENT ? user.StudentNumber : user.StaffNumber;

  await startAuthenticatedSession(req, {
    id: userId,
    name: fullName,
    firstName: role === ROLES.ADMIN ? '' : (user.FirstName || ''),
    lastName: role === ROLES.ADMIN ? '' : (user.LastName || ''),
    role
  });

  res.redirect('/');
});

// ============================================================================
// REGISTRATION
// ============================================================================

export function getRegisterPage(req, res) {
  res.render('auth/register', { error: null });
}

export const handleRegister = catchAsync(async (req, res) => {
  const studentNumber = sanitize(req.body.studentNumber);
  const firstName = sanitize(req.body.firstName);
  const lastName = sanitize(req.body.lastName);
  const medicalHistory = sanitize(req.body.medicalHistory);
  const password = req.body.password || '';

  if (!studentNumber || !firstName || !lastName || !password) {
    return res.render('auth/register', { error: 'All required fields must be filled.' });
  }

  if (!isValidStudentNumber(studentNumber)) {
    return res.render('auth/register', { error: 'Student Number must start with "s" followed by 9 digits (e.g. s226205096).' });
  }

  if (!isValidPassword(password)) {
    return res.render('auth/register', { error: 'Password must be at least 6 characters.' });
  }

  const existing = await AuthModel.findStudentById(studentNumber);
  if (existing) {
    return res.render('auth/register', { error: 'An account with this Student Number already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await AuthModel.createStudent({
    studentNumber, firstName, lastName, medicalHistory, password: hashedPassword
  });

  // Auto-login the new student and redirect to pin-drop location page
  await startAuthenticatedSession(req, {
    id: studentNumber,
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    role: ROLES.STUDENT
  });

  res.redirect('/profile/location');
});

// ============================================================================
// LOGOUT
// ============================================================================

export function handleLogout(req, res) {
  req.session.destroy(() => res.redirect('/auth/login'));
}

// ============================================================================
// FORGOT / RESET PASSWORD
// ============================================================================

export function showForgotPasswordForm(req, res) {
  res.render('auth/forgot-password', { error: null, success: null });
}

export const handleForgotPassword = catchAsync(async (req, res) => {
  // Accept username or email (strip @domain), same as login.
  const idNumber = sanitize(req.body.idNumber).split('@')[0];

  if (!idNumber) {
    return res.render('auth/forgot-password', { error: 'Please enter your username.', success: null });
  }

  // Auto-detect user
  let userType = null;
  let user = await AuthModel.findStudentById(idNumber);
  if (user) userType = 'student';

  if (!user) { user = await AuthModel.findNurseById(idNumber); if (user) userType = 'nurse'; }
  if (!user) { user = await AuthModel.findAdminById(idNumber); if (user) userType = 'admin'; }

  // Neutral acknowledgement either way — a different message for "no such account"
  // turns this form into a username oracle for enumerating real student numbers.
  const neutral = 'If an account exists for that username, a password reset link has been issued.';

  if (!user) {
    return res.render('auth/forgot-password', { error: null, success: neutral });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000);

  await AuthModel.createPasswordResetToken({ userId: idNumber, userType, token, expiresAt });

  const resetLink = `/auth/reset-password/${token}`;

  // KNOWN LIMITATION: there is no mail server, so the token cannot be emailed to the
  // account holder (e.g. studentNumber@mandela.ac.za). Showing the link in the page
  // instead is a demo convenience and an account-takeover path on a public deployment,
  // so it is gated: development shows it, production only when ALLOW_INSECURE_PASSWORD_RESET
  // is explicitly set. Otherwise the link goes to the server log, where only an
  // operator can read it.
  if (!resetLinkIsVisible()) {
    console.warn(`[PasswordReset] Reset link issued for ${userType} ${idNumber}: ${resetLink}`);
    return res.render('auth/forgot-password', { error: null, success: neutral });
  }

  res.render('auth/forgot-password', {
    error: null,
    success: `Password reset link generated. <a href="${resetLink}">Click here to reset your password</a>`
  });
});

export const showResetPasswordForm = catchAsync(async (req, res) => {
  const { token } = req.params;
  const resetRecord = await AuthModel.findValidResetToken(token);

  if (!resetRecord) {
    return res.render('auth/reset-password', { error: 'Invalid or expired reset link.', token: null });
  }
  res.render('auth/reset-password', { error: null, token });
});

export const handleResetPassword = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || password.length < 6) {
    return res.render('auth/reset-password', { error: 'Password must be at least 6 characters.', token });
  }

  if (password !== confirmPassword) {
    return res.render('auth/reset-password', { error: 'Passwords do not match.', token });
  }

  const resetRecord = await AuthModel.findValidResetToken(token);
  if (!resetRecord) {
    return res.render('auth/reset-password', { error: 'Invalid or expired reset link.', token: null });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  await AuthModel.updatePassword(resetRecord.UserID, resetRecord.UserType, hashedPassword);
  await AuthModel.markTokenUsed(token);

  res.render('auth/login', { error: null, success: 'Password reset successful. You can now sign in.' });
});
