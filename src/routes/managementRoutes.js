import { Router } from 'express';
import { requireNurse, requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import { showNurseDashboard, updateTeamsLink, changeAppointmentStatus, saveAppointmentNotes } from '../controllers/nurseController.js';
import { showAdminReport } from '../controllers/adminController.js';
import { showAvailabilityGrid, saveAvailability, getAvailableSlotsAPI } from '../controllers/availabilityController.js';
import {
  listStudents, showAddStudentForm, showEditStudentForm,
  handleAddStudent, handleUpdateStudent, handleDeleteStudent,
  listNurses, showAddNurseForm, showEditNurseForm,
  handleAddNurse, handleUpdateNurse, handleDeleteNurse
} from '../controllers/adminCrudController.js';
import { exportAppointmentsCSV } from '../controllers/exportController.js';

const router = Router();

// Nurse routes
router.get('/nurse/dashboard', requireNurse, showNurseDashboard);
router.post('/nurse/update-teams-link', requireNurse, updateTeamsLink);
router.post('/nurse/appointment/status', requireNurse, changeAppointmentStatus);
router.post('/nurse/appointment/notes', requireNurse, saveAppointmentNotes);
router.get('/nurse/availability', requireNurse, showAvailabilityGrid);
router.post('/nurse/availability', requireNurse, saveAvailability);

// Nurse: view patient symptom history
router.get('/nurse/patient/:studentNumber/history', requireNurse, async (req, res) => {
  try {
    const { query: dbQuery } = await import('../config/database.js');
    const patients = await dbQuery('SELECT * FROM Student WHERE StudentNumber = ?', [req.params.studentNumber]);
    if (!patients[0]) return res.redirect('/management/nurse/dashboard');
    const logs = await dbQuery('SELECT * FROM SymptomLog WHERE StudentNumber = ? ORDER BY LogDate DESC LIMIT 30', [req.params.studentNumber]);
    res.render('nurse/patient-history', { user: req.session.user, patient: patients[0], logs, error: null });
  } catch (e) { console.error(e); res.redirect('/management/nurse/dashboard'); }
});

// Availability API (for booking form)
router.get('/api/availability/:staffNumber/:day', requireAuth, getAvailableSlotsAPI);

// Admin reports
router.get('/admin/reports', requireAdmin, showAdminReport);
router.get('/admin/reports/export-csv', requireAdmin, exportAppointmentsCSV);

// Admin - Student CRUD
router.get('/admin/students', requireAdmin, listStudents);
router.get('/admin/students/add', requireAdmin, showAddStudentForm);
router.post('/admin/students/add', requireAdmin, handleAddStudent);
router.get('/admin/students/:id/edit', requireAdmin, showEditStudentForm);
router.post('/admin/students/:id/update', requireAdmin, handleUpdateStudent);
router.post('/admin/students/:id/delete', requireAdmin, handleDeleteStudent);

// Admin - Nurse CRUD
router.get('/admin/nurses', requireAdmin, listNurses);
router.get('/admin/nurses/add', requireAdmin, showAddNurseForm);
router.post('/admin/nurses/add', requireAdmin, handleAddNurse);
router.get('/admin/nurses/:id/edit', requireAdmin, showEditNurseForm);
router.post('/admin/nurses/:id/update', requireAdmin, handleUpdateNurse);
router.post('/admin/nurses/:id/delete', requireAdmin, handleDeleteNurse);

export default router;
