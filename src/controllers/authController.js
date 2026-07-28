import * as UserModel from '../models/userModel.js';

export function getLoginPage(req, res) {
  res.render('auth/login', { error: null });
}

export function getRegisterPage(req, res) {
  res.render('auth/register', { error: null });
}

// Process Login Form (Supports Student, Nurse, Admin)
export async function handleLogin(req, res) {
  const { userType, idNumber, password } = req.body;

  try {
    let user = null;

    if (userType === 'student') {
      user = await UserModel.findStudentById(idNumber);
    } else if (userType === 'nurse') {
      user = await UserModel.findNurseById(idNumber);
    }

    if (!user || user.Password !== password) {
      return res.render('auth/login', { error: 'Invalid Student/Staff Number or password.' });
    }

    req.session.user = {
      id: userType === 'student' ? user.StudentNumber : user.StaffNumber,
      name: user.Name || (userType === 'student' ? `Student ${user.StudentNumber}` : `Nurse ${user.StaffNumber}`),
      role: userType
    };

    res.redirect('/');
  } catch (error) {
    res.render('auth/login', { error: error.message });
  }
}

// Process Public Student Registration Form
export async function handleRegister(req, res) {
  const { studentNumber, firstName, lastName, address, medicalHistory, password } = req.body;

  try {
    // Check if student number already exists
    const existingStudent = await UserModel.findStudentById(studentNumber);
    if (existingStudent) {
      return res.render('auth/register', { error: 'An account with this Student Number already exists.' });
    }

    // Register Student
    await UserModel.createStudent({
      studentNumber,
      firstName,
      lastName,
      address,
      medicalHistory,
      password
    });

    res.redirect('/auth/login');
  } catch (error) {
    res.render('auth/register', { error: 'Registration failed: ' + error.message });
  }
}

export function handleLogout(req, res) {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
}