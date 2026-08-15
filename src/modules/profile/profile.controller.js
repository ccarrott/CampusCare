// src/modules/profile/profile.controller.js
// Handles profile viewing, editing, password changes, and account deletion.

import bcrypt from 'bcrypt';
import * as ProfileModel from './profile.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sanitize } from '../../utils/sanitize.js';
import { ROLES } from '../../constants.js';

// ============================================================================
// VIEW PROFILE
// ============================================================================

export const showProfile = catchAsync(async (req, res) => {
  const { id, role } = req.session.user;
  let profile = null;

  if (role === ROLES.STUDENT) profile = await ProfileModel.findStudentById(id);
  else if (role === ROLES.NURSE) profile = await ProfileModel.findNurseById(id);
  else if (role === ROLES.ADMIN) profile = await ProfileModel.findAdminById(id);

  if (!profile) {
    return res.status(404).render('profile/view', { user: req.session.user, profile: null, error: 'Profile not found.' });
  }

  res.render('profile/view', { user: req.session.user, profile, error: null });
});

// ============================================================================
// EDIT PROFILE
// ============================================================================

export const showEditProfile = catchAsync(async (req, res) => {
  const profile = await ProfileModel.findStudentById(req.session.user.id);

  if (!profile) {
    return res.status(404).render('profile/edit', { user: req.session.user, profile: {}, error: 'Profile not found.' });
  }

  res.render('profile/edit', { user: req.session.user, profile, error: null });
});

export const updateProfile = catchAsync(async (req, res) => {
  const { id } = req.session.user;
  const cleanAddress = sanitize(req.body.address);
  const cleanHistory = sanitize(req.body.medicalHistory);

  await ProfileModel.updateStudentProfile(id, { address: cleanAddress, medicalHistory: cleanHistory });
  res.redirect('/profile');
});

// ============================================================================
// DELETE ACCOUNT
// ============================================================================

export const deleteAccount = catchAsync(async (req, res) => {
  await ProfileModel.deleteStudentAccount(req.session.user.id);
  req.session.destroy(() => res.redirect('/auth/register'));
});

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

export const changePassword = catchAsync(async (req, res) => {
  const { id, role } = req.session.user;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) return res.redirect('/profile');
  if (newPassword.length < 6) return res.redirect('/profile');
  if (newPassword !== confirmPassword) return res.redirect('/profile');

  let user;
  if (role === ROLES.STUDENT) user = await ProfileModel.findStudentById(id);
  else if (role === ROLES.NURSE) user = await ProfileModel.findNurseById(id);
  else if (role === ROLES.ADMIN) user = await ProfileModel.findAdminById(id);

  if (!user || !user.Password) return res.redirect('/profile');

  const isMatch = await bcrypt.compare(currentPassword, user.Password);
  if (!isMatch) return res.redirect('/profile');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await ProfileModel.updatePassword(id, role, hashedPassword);

  res.redirect('/profile');
});
