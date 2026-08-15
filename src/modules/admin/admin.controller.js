// src/modules/admin/admin.controller.js
// Handles admin reports, student CRUD, and nurse CRUD (merged from adminController + adminCrudController).

import * as AdminModel from './admin.model.js';
import * as ReviewsModel from '../reviews/reviews.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sanitize } from '../../utils/sanitize.js';
import { isValidStudentNumber, isValidEmail, isValidPassword } from '../../middleware/validate.js';

// ============================================================================
// REPORTS
// ============================================================================

export const showAdminReport = catchAsync(async (req, res) => {
  const periodMap = { '7d': 7, '1m': 30, '2m': 60, '6m': 180, '1y': 365 };
  const period = req.query.period || '1m';
  const days = periodMap[period] || 30;

  const metrics = await AdminModel.getOperationalReportData();
  const appointmentsByType = await AdminModel.getAppointmentsByType();
  const ratings = await ReviewsModel.getAllRatings();
  const dailyAppointments = await AdminModel.getDailyAppointmentCounts(days);
  const pendingNurseReviews = await ReviewsModel.getPendingNurseReviews();
  const nurseAverages = await ReviewsModel.getAllNurseAverages();

  res.render('admin/reports', {
    user: req.session.user,
    metrics,
    appointmentsByType,
    ratings,
    dailyAppointments: JSON.stringify(dailyAppointments),
    pendingNurseReviews,
    nurseAverages,
    period,
    error: null
  });
});

// ============================================================================
// STUDENT CRUD
// ============================================================================

export const listStudents = catchAsync(async (req, res) => {
  const search = req.query.search || '';
  const students = search
    ? await AdminModel.searchStudents(search)
    : await AdminModel.getAllStudents();

  res.render('admin/students', {
    user: req.session.user, students, search, error: null, success: req.query.success || null
  });
});

export const showAddStudentForm = catchAsync(async (req, res) => {
  res.render('admin/student-form', { user: req.session.user, student: null, isEdit: false, error: null });
});

export const showEditStudentForm = catchAsync(async (req, res) => {
  const student = await AdminModel.getStudentById(req.params.id);
  if (!student) return res.redirect('/management/admin/students');
  res.render('admin/student-form', { user: req.session.user, student, isEdit: true, error: null });
});

export const handleAddStudent = catchAsync(async (req, res) => {
  const studentNumber = sanitize(req.body.studentNumber);
  const firstName = sanitize(req.body.firstName);
  const lastName = sanitize(req.body.lastName);
  const email = sanitize(req.body.email);
  const address = sanitize(req.body.address);
  const medicalHistory = sanitize(req.body.medicalHistory);
  const password = req.body.password || '';

  if (!studentNumber || !firstName || !lastName || !password) {
    return res.render('admin/student-form', { user: req.session.user, student: req.body, isEdit: false, error: 'Student Number, Name, and Password are required.' });
  }
  if (!isValidStudentNumber(studentNumber)) {
    return res.render('admin/student-form', { user: req.session.user, student: req.body, isEdit: false, error: 'Student Number must start with "s" followed by 9 digits.' });
  }
  if (email && !isValidEmail(email)) {
    return res.render('admin/student-form', { user: req.session.user, student: req.body, isEdit: false, error: 'Invalid email format.' });
  }
  if (!isValidPassword(password)) {
    return res.render('admin/student-form', { user: req.session.user, student: req.body, isEdit: false, error: 'Password must be at least 6 characters.' });
  }

  const existing = await AdminModel.getStudentById(studentNumber);
  if (existing) {
    return res.render('admin/student-form', { user: req.session.user, student: req.body, isEdit: false, error: 'A student with this number already exists.' });
  }

  await AdminModel.createStudent({ studentNumber, firstName, lastName, email, address, medicalHistory, password });
  res.redirect('/management/admin/students?success=Student added successfully.');
});

export const handleUpdateStudent = catchAsync(async (req, res) => {
  const { firstName, lastName, email, address, medicalHistory } = req.body;
  await AdminModel.updateStudent(req.params.id, { firstName, lastName, email, address, medicalHistory });
  res.redirect('/management/admin/students?success=Student updated.');
});

export const handleDeleteStudent = catchAsync(async (req, res) => {
  await AdminModel.deleteStudent(req.params.id);
  res.redirect('/management/admin/students?success=Student deleted.');
});

// ============================================================================
// NURSE CRUD
// ============================================================================

export const listNurses = catchAsync(async (req, res) => {
  const nurses = await AdminModel.getAllNurses();
  const clinics = await AdminModel.getAllClinics();
  res.render('admin/nurses', { user: req.session.user, nurses, clinics, error: null, success: req.query.success || null });
});

export const showAddNurseForm = catchAsync(async (req, res) => {
  const clinics = await AdminModel.getAllClinics();
  res.render('admin/nurse-form', { user: req.session.user, nurse: null, clinics, isEdit: false, error: null });
});

export const showEditNurseForm = catchAsync(async (req, res) => {
  const nurse = await AdminModel.getNurseById(req.params.id);
  const clinics = await AdminModel.getAllClinics();
  if (!nurse) return res.redirect('/management/admin/nurses');
  res.render('admin/nurse-form', { user: req.session.user, nurse, clinics, isEdit: true, error: null });
});

export const handleAddNurse = catchAsync(async (req, res) => {
  const staffNumber = sanitize(req.body.staffNumber);
  const firstName = sanitize(req.body.firstName);
  const lastName = sanitize(req.body.lastName);
  const email = sanitize(req.body.email);
  const phoneNumber = sanitize(req.body.phoneNumber);
  const address = sanitize(req.body.address);
  const clinicId = sanitize(req.body.clinicId);
  const password = req.body.password || '';

  if (!staffNumber || !firstName || !lastName || !password) {
    const clinics = await AdminModel.getAllClinics();
    return res.render('admin/nurse-form', { user: req.session.user, nurse: req.body, clinics, isEdit: false, error: 'Staff Number, Name, and Password are required.' });
  }
  if (email && !isValidEmail(email)) {
    const clinics = await AdminModel.getAllClinics();
    return res.render('admin/nurse-form', { user: req.session.user, nurse: req.body, clinics, isEdit: false, error: 'Invalid email format.' });
  }
  if (!isValidPassword(password)) {
    const clinics = await AdminModel.getAllClinics();
    return res.render('admin/nurse-form', { user: req.session.user, nurse: req.body, clinics, isEdit: false, error: 'Password must be at least 6 characters.' });
  }

  const existing = await AdminModel.getNurseById(staffNumber);
  if (existing) {
    const clinics = await AdminModel.getAllClinics();
    return res.render('admin/nurse-form', { user: req.session.user, nurse: req.body, clinics, isEdit: false, error: 'A nurse with this Staff Number already exists.' });
  }

  await AdminModel.createNurse({ staffNumber, firstName, lastName, email, phoneNumber, address, clinicId, password });
  res.redirect('/management/admin/nurses?success=Nurse added successfully.');
});

export const handleUpdateNurse = catchAsync(async (req, res) => {
  const { firstName, lastName, email, phoneNumber, address, clinicId } = req.body;
  await AdminModel.updateNurse(req.params.id, { firstName, lastName, email, phoneNumber, address, clinicId });
  res.redirect('/management/admin/nurses?success=Nurse updated.');
});

export const handleDeleteNurse = catchAsync(async (req, res) => {
  await AdminModel.deleteNurse(req.params.id);
  res.redirect('/management/admin/nurses?success=Nurse removed.');
});

// ============================================================================
// NURSE REVIEW MODERATION
// ============================================================================

export const approveNurseReview = catchAsync(async (req, res) => {
  const { reviewId } = req.body;
  if (!reviewId) return res.redirect('/management/admin/reports');
  await ReviewsModel.updateNurseReviewVerification(reviewId, 'Approved');
  res.redirect('/management/admin/reports');
});

export const rejectNurseReview = catchAsync(async (req, res) => {
  const { reviewId } = req.body;
  if (!reviewId) return res.redirect('/management/admin/reports');
  await ReviewsModel.updateNurseReviewVerification(reviewId, 'Rejected');
  res.redirect('/management/admin/reports');
});
