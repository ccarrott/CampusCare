// src/modules/profile/profile.controller.js
// Handles profile viewing, editing, password changes, and account deletion.

import bcrypt from 'bcrypt';
import * as ProfileModel from './profile.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sanitize } from '../../utils/sanitize.js';
import { ROLES } from '../../constants.js';
import { query } from '../../config/database.js';
import { getZoneForPoint } from '../../utils/geo.js';
import * as NurseModel from '../nurse/nurse.model.js';

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
  const zones = await ProfileModel.getAllZones();

  if (!profile) {
    return res.status(404).render('profile/edit', { user: req.session.user, profile: {}, zones: [], error: 'Profile not found.' });
  }

  res.render('profile/edit', { user: req.session.user, profile, zones, error: null });
});

export const updateProfile = catchAsync(async (req, res) => {
  const { id } = req.session.user;
  const cleanHistory = sanitize(req.body.medicalHistory);

  await ProfileModel.updateStudentProfile(id, { medicalHistory: cleanHistory });
  res.redirect('/profile?toast=Profile+updated');
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

  // Every failure used to redirect silently, so a wrong current password looked
  // identical to a successful change. Say what went wrong via the profile toast.
  const fail = (msg) => res.redirect('/profile?toast=' + encodeURIComponent(msg) + '&toastType=error');

  if (!currentPassword || !newPassword || !confirmPassword) {
    return fail('Please fill in all three password fields.');
  }
  if (newPassword.length < 6) return fail('New password must be at least 6 characters.');
  if (newPassword !== confirmPassword) return fail('New passwords do not match.');

  let user;
  if (role === ROLES.STUDENT) user = await ProfileModel.findStudentById(id);
  else if (role === ROLES.NURSE) user = await ProfileModel.findNurseById(id);
  else if (role === ROLES.ADMIN) user = await ProfileModel.findAdminById(id);

  if (!user || !user.Password) return fail('Could not verify your account. Please sign in again.');

  const isMatch = await bcrypt.compare(currentPassword, user.Password);
  if (!isMatch) return fail('Your current password is incorrect.');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await ProfileModel.updatePassword(id, role, hashedPassword);

  res.redirect('/profile?toast=' + encodeURIComponent('Password changed successfully.'));
});

// ============================================================================
// LOCATION PICKER (Pin Drop Map)
// ============================================================================

export const showLocationPicker = catchAsync(async (req, res) => {
  const student = await ProfileModel.findStudentById(req.session.user.id);
  const zones = await query('SELECT ZoneID, Name, Latitude, Longitude, Boundary FROM CampusZone');

  res.render('profile/location', {
    user: req.session.user,
    zones,
    currentLat: student?.Latitude || null,
    currentLon: student?.Longitude || null,
    success: null
  });
});

export const saveLocation = catchAsync(async (req, res) => {
  const { latitude, longitude } = req.body;
  const studentNumber = req.session.user.id;

  if (!latitude || !longitude) {
    const zones = await query('SELECT ZoneID, Name, Latitude, Longitude, Boundary FROM CampusZone');
    return res.render('profile/location', {
      user: req.session.user, zones, currentLat: null, currentLon: null,
      success: null, error: 'Please drop a pin on the map.'
    });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  // Save coordinates to Student
  await query('UPDATE Student SET Latitude = ?, Longitude = ? WHERE StudentNumber = ?', [lat, lon, studentNumber]);

  // Compute zone from pin position
  const zones = await query('SELECT ZoneID, Name, Latitude, Longitude, Boundary FROM CampusZone');
  const zoneId = getZoneForPoint(lat, lon, zones);

  // Update StudentZone
  await query('DELETE FROM StudentZone WHERE StudentNumber = ?', [studentNumber]);
  if (zoneId) {
    await query('INSERT INTO StudentZone (StudentNumber, ZoneID) VALUES (?, ?)', [studentNumber, zoneId]);
  }

  res.redirect('/?toast=Location+saved');
});

// ============================================================================
// NURSE BIO UPDATE (from profile page)
// ============================================================================

export const updateNurseBio = catchAsync(async (req, res) => {
  const staffNumber = req.session.user.id;
  const bio = sanitize(req.body.bio).substring(0, 300);
  const yearsExperience = Math.max(0, Math.min(50, parseInt(req.body.yearsExperience) || 0));

  await NurseModel.updateNurseProfile(staffNumber, { bio, yearsExperience });
  res.redirect('/profile?toast=Public+profile+updated');
});
