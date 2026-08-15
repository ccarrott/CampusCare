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

// ============================================================================
// LOCATION PICKER (Pin Drop Map)
// ============================================================================

import { query } from '../../config/database.js';
import { getZoneForPoint } from '../../utils/geo.js';

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
