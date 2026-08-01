import * as UserModel from '../models/userModel.js';

// ============================================================================
// PROFILE CONTROLLER - View, Update, Delete Student Profile
// ============================================================================

/**
 * GET /profile
 * Fetches and displays the logged-in user's profile.
 * Supports student and nurse roles.
 */
export async function showProfile(req, res) {
  try {
    const { id, role } = req.session.user;
    let profile = null;

    if (role === 'student') {
      profile = await UserModel.findStudentById(id);
    } else if (role === 'nurse') {
      profile = await UserModel.findNurseById(id);
    } else if (role === 'admin') {
      profile = await UserModel.findAdminById(id);
    }

    if (!profile) {
      return res.status(404).render('profile/view', {
        user: req.session.user,
        profile: null,
        error: 'Profile not found.'
      });
    }

    res.render('profile/view', {
      user: req.session.user,
      profile,
      error: null
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).render('profile/view', {
      user: req.session.user,
      profile: null,
      error: 'Unable to load profile. Please try again later.'
    });
  }
}

/**
 * GET /profile/edit
 * Renders the edit form pre-filled with the student's current data.
 */
export async function showEditProfile(req, res) {
  try {
    const { id } = req.session.user;
    const profile = await UserModel.findStudentById(id);

    if (!profile) {
      return res.status(404).render('profile/edit', {
        user: req.session.user,
        profile: {},
        error: 'Profile not found.'
      });
    }

    res.render('profile/edit', {
      user: req.session.user,
      profile,
      error: null
    });
  } catch (error) {
    console.error('Edit profile fetch error:', error);
    res.status(500).render('profile/edit', {
      user: req.session.user,
      profile: {},
      error: 'Unable to load profile for editing.'
    });
  }
}

/**
 * POST /profile/update
 * Updates the student's Address and MedicalHistory fields.
 */
export async function updateProfile(req, res) {
  try {
    const { id } = req.session.user;
    const { address, medicalHistory } = req.body;

    // Basic XSS sanitization for text inputs
    const sanitize = (str) => String(str || '').replace(/[<>]/g, '');
    const cleanAddress = sanitize(address);
    const cleanHistory = sanitize(medicalHistory);

    await UserModel.updateStudentProfile(id, {
      address: cleanAddress,
      medicalHistory: cleanHistory
    });

    // Refresh session name in case display needs differ (name unchanged here)
    res.redirect('/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).render('profile/view', {
      user: req.session.user,
      profile: null,
      error: 'Failed to update profile. Please try again.'
    });
  }
}

/**
 * POST /profile/delete
 * Permanently deletes the student's account and destroys the session.
 */
export async function deleteAccount(req, res) {
  try {
    const { id } = req.session.user;

    await UserModel.deleteStudentAccount(id);

    req.session.destroy(() => {
      res.redirect('/auth/register');
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).render('profile/view', {
      user: req.session.user,
      profile: null,
      error: 'Failed to delete account. Please try again.'
    });
  }
}


/**
 * POST /profile/change-password
 * Changes the password for any authenticated user.
 */
export async function changePassword(req, res) {
  try {
    const { id, role } = req.session.user;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const bcrypt = (await import('bcrypt')).default;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.redirect('/profile');
    }

    if (newPassword.length < 6) {
      return res.redirect('/profile');
    }

    if (newPassword !== confirmPassword) {
      return res.redirect('/profile');
    }

    // Fetch current user record
    let user;
    if (role === 'student') user = await UserModel.findStudentById(id);
    else if (role === 'nurse') user = await UserModel.findNurseById(id);
    else if (role === 'admin') user = await UserModel.findAdminById(id);

    if (!user || !user.Password) {
      return res.redirect('/profile');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.Password);
    if (!isMatch) {
      return res.redirect('/profile');
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(id, role, hashedPassword);

    res.redirect('/profile');
  } catch (error) {
    console.error('Password change error:', error);
    res.redirect('/profile');
  }
}
