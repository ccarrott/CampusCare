// src/modules/admin/admin.routes.js
// Admin route definitions: reports, student CRUD, nurse CRUD.

import { Router } from 'express';
import { requireRole } from '../../middleware/authorize.js';
import { ROLES } from '../../constants.js';
import * as AdminController from './admin.controller.js';

const router = Router();

// Reports
router.get('/reports', requireRole(ROLES.ADMIN), AdminController.showAdminReport);

// Student CRUD
router.get('/students', requireRole(ROLES.ADMIN), AdminController.listStudents);
router.get('/students/add', requireRole(ROLES.ADMIN), AdminController.showAddStudentForm);
router.post('/students/add', requireRole(ROLES.ADMIN), AdminController.handleAddStudent);
router.get('/students/:id/edit', requireRole(ROLES.ADMIN), AdminController.showEditStudentForm);
router.post('/students/:id/update', requireRole(ROLES.ADMIN), AdminController.handleUpdateStudent);
router.post('/students/:id/delete', requireRole(ROLES.ADMIN), AdminController.handleDeleteStudent);

// Nurse CRUD
router.get('/nurses', requireRole(ROLES.ADMIN), AdminController.listNurses);
router.get('/nurses/add', requireRole(ROLES.ADMIN), AdminController.showAddNurseForm);
router.post('/nurses/add', requireRole(ROLES.ADMIN), AdminController.handleAddNurse);
router.get('/nurses/:id/edit', requireRole(ROLES.ADMIN), AdminController.showEditNurseForm);
router.post('/nurses/:id/update', requireRole(ROLES.ADMIN), AdminController.handleUpdateNurse);
router.post('/nurses/:id/delete', requireRole(ROLES.ADMIN), AdminController.handleDeleteNurse);

// Nurse Review Moderation
router.post('/review/approve', requireRole(ROLES.ADMIN), AdminController.approveNurseReview);
router.post('/review/reject', requireRole(ROLES.ADMIN), AdminController.rejectNurseReview);

export default router;
