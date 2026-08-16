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

// ============================================================================
// LOGIN
// ============================================================================

export function getLoginPage(req, res) {
  res.render('auth/login', { error: null });
}

export const handleLogin = catchAsync(async (req, res) => {
  const idNumber = sanitize(req.body.idNumber);
  const password = req.body.password || '';

  if (!idNumber || !password) {
    return res.render('auth/login', { error: 'Please enter your ID and password.', idNumber });
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
    return res.render('auth/login', { error: 'Invalid ID Number or password.', idNumber });
  }

  const isMatch = await bcrypt.compare(password, user.Password);
  if (!isMatch) {
    return res.render('auth/login', { error: 'Invalid ID Number or password.', idNumber });
  }

  // Build session
  const fullName = role === ROLES.ADMIN
    ? (user.Name || `Admin ${idNumber}`)
    : `${user.FirstName || ''} ${user.LastName || ''}`.trim() || `User ${idNumber}`;

  const userId = role === ROLES.STUDENT ? user.StudentNumber : user.StaffNumber;

  req.session.user = {
    id: userId,
    name: fullName,
    firstName: role === ROLES.ADMIN ? '' : (user.FirstName || ''),
    lastName: role === ROLES.ADMIN ? '' : (user.LastName || ''),
    role
  };

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
  req.session.user = {
    id: studentNumber,
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    role: ROLES.STUDENT
  };

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
  const idNumber = sanitize(req.body.idNumber);

  if (!idNumber) {
    return res.render('auth/forgot-password', { error: 'Please enter your ID Number.', success: null });
  }

  // Auto-detect user
  let userType = null;
  let user = await AuthModel.findStudentById(idNumber);
  if (user) userType = 'student';

  if (!user) { user = await AuthModel.findNurseById(idNumber); if (user) userType = 'nurse'; }
  if (!user) { user = await AuthModel.findAdminById(idNumber); if (user) userType = 'admin'; }

  if (!user) {
    return res.render('auth/forgot-password', { error: 'No account found with that ID Number.', success: null });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000);

  await AuthModel.createPasswordResetToken({ userId: idNumber, userType, token, expiresAt });

  // KNOWN LIMITATION: In production, this token would be sent via email to the user's
  // registered address (e.g. studentNumber@mandela.ac.za). For this demo/capstone,
  // the link is displayed on-screen as we have no mail server configured.
  // This is an intentional shortcut — not a production pattern.
  const resetLink = `/auth/reset-password/${token}`;
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
