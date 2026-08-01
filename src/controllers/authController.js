import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as UserModel from '../models/userModel.js';
import { sanitize, isValidStudentNumber, isValidEmail, isValidPassword } from '../middlewares/validation.js';

const SALT_ROUNDS = 10;

export function getLoginPage(req, res) {
  res.render('auth/login', { error: null });
}

export function getRegisterPage(req, res) {
  res.render('auth/register', { error: null });
}

/**
 * POST /auth/login
 * Auto-detects user role by searching Student → Nurse → Admin tables.
 * No role dropdown needed.
 */
export async function handleLogin(req, res) {
  const idNumber = sanitize(req.body.idNumber);
  const password = req.body.password || '';

  try {
    if (!idNumber || !password) {
      return res.render('auth/login', { error: 'Please enter your ID and password.', idNumber });
    }

    let user = null;
    let role = null;

    // Auto-detect: check Student first
    user = await UserModel.findStudentById(idNumber);
    if (user) {
      role = 'student';
    }

    // If not student, check Nurse
    if (!user) {
      user = await UserModel.findNurseById(idNumber);
      if (user) role = 'nurse';
    }

    // If not nurse, check Admin
    if (!user) {
      user = await UserModel.findAdminById(idNumber);
      if (user) role = 'admin';
    }

    // No account found anywhere
    if (!user) {
      return res.render('auth/login', { error: 'Invalid ID Number or password.', idNumber });
    }

    // Verify password
    const storedPassword = user.Password;
    if (!storedPassword) {
      return res.render('auth/login', { error: 'Invalid ID Number or password.', idNumber });
    }

    const isMatch = await bcrypt.compare(password, storedPassword);
    if (!isMatch) {
      return res.render('auth/login', { error: 'Invalid ID Number or password.', idNumber });
    }

    // Build session
    let fullName;
    let userId;

    if (role === 'admin') {
      fullName = user.Name || `Admin ${idNumber}`;
      userId = user.StaffNumber;
    } else {
      fullName = `${user.FirstName || ''} ${user.LastName || ''}`.trim() || `User ${idNumber}`;
      userId = role === 'student' ? user.StudentNumber : user.StaffNumber;
    }

    req.session.user = {
      id: userId,
      name: fullName,
      firstName: role === 'admin' ? '' : (user.FirstName || ''),
      lastName: role === 'admin' ? '' : (user.LastName || ''),
      role
    };

    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { error: 'An error occurred during login. Please try again.', idNumber });
  }
}

/**
 * POST /auth/register
 * Student self-registration with bcrypt password hashing.
 */
export async function handleRegister(req, res) {
  const studentNumber = sanitize(req.body.studentNumber);
  const firstName = sanitize(req.body.firstName);
  const lastName = sanitize(req.body.lastName);
  const address = sanitize(req.body.address);
  const medicalHistory = sanitize(req.body.medicalHistory);
  const password = req.body.password || '';

  try {
    if (!studentNumber || !firstName || !lastName || !password) {
      return res.render('auth/register', { error: 'All required fields must be filled.' });
    }

    if (!isValidStudentNumber(studentNumber)) {
      return res.render('auth/register', { error: 'Student Number must start with "s" followed by 9 digits (e.g. s226205096).' });
    }

    if (!isValidPassword(password)) {
      return res.render('auth/register', { error: 'Password must be at least 6 characters.' });
    }

    const existingStudent = await UserModel.findStudentById(studentNumber);
    if (existingStudent) {
      return res.render('auth/register', { error: 'An account with this Student Number already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await UserModel.createStudent({
      studentNumber,
      firstName,
      lastName,
      address,
      medicalHistory,
      password: hashedPassword
    });

    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/register', { error: 'Registration failed. Please try again.' });
  }
}

export function handleLogout(req, res) {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
}

// ============================================================================
// FORGOT PASSWORD
// ============================================================================

export function showForgotPasswordForm(req, res) {
  res.render('auth/forgot-password', { error: null, success: null });
}

/**
 * POST /auth/forgot-password
 * Looks up user by ID, generates a reset token, displays the reset link.
 */
export async function handleForgotPassword(req, res) {
  const idNumber = sanitize(req.body.idNumber);

  try {
    if (!idNumber) {
      return res.render('auth/forgot-password', { error: 'Please enter your ID Number.', success: null });
    }

    // Auto-detect user
    let userType = null;
    let user = await UserModel.findStudentById(idNumber);
    if (user) userType = 'student';

    if (!user) {
      user = await UserModel.findNurseById(idNumber);
      if (user) userType = 'nurse';
    }

    if (!user) {
      user = await UserModel.findAdminById(idNumber);
      if (user) userType = 'admin';
    }

    if (!user) {
      return res.render('auth/forgot-password', { error: 'No account found with that ID Number.', success: null });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await UserModel.createPasswordResetToken({
      userId: idNumber,
      userType,
      token,
      expiresAt
    });

    // In production this would be emailed. For now, display the link.
    const resetLink = `/auth/reset-password/${token}`;

    res.render('auth/forgot-password', {
      error: null,
      success: `Password reset link generated. <a href="${resetLink}">Click here to reset your password</a>`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.render('auth/forgot-password', { error: 'An error occurred. Please try again.', success: null });
  }
}

export async function showResetPasswordForm(req, res) {
  const { token } = req.params;

  try {
    const resetRecord = await UserModel.findValidResetToken(token);
    if (!resetRecord) {
      return res.render('auth/reset-password', { error: 'Invalid or expired reset link.', token: null });
    }

    res.render('auth/reset-password', { error: null, token });
  } catch (error) {
    console.error('Reset form error:', error);
    res.render('auth/reset-password', { error: 'An error occurred.', token: null });
  }
}

export async function handleResetPassword(req, res) {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  try {
    if (!password || password.length < 6) {
      return res.render('auth/reset-password', { error: 'Password must be at least 6 characters.', token });
    }

    if (password !== confirmPassword) {
      return res.render('auth/reset-password', { error: 'Passwords do not match.', token });
    }

    const resetRecord = await UserModel.findValidResetToken(token);
    if (!resetRecord) {
      return res.render('auth/reset-password', { error: 'Invalid or expired reset link.', token: null });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Update password in the correct table
    await UserModel.updatePassword(resetRecord.UserID, resetRecord.UserType, hashedPassword);

    // Mark token as used
    await UserModel.markTokenUsed(token);

    res.render('auth/login', { error: null, success: 'Password reset successful. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.render('auth/reset-password', { error: 'An error occurred. Please try again.', token });
  }
}
