// src/app.js
// CampusCare — Express application entry point.

import express from 'express';
import 'dotenv/config';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// Config
import { validateEnv } from './config/environment.js';
import { query } from './config/database.js';
import { createSessionMiddleware } from './config/session.js';
import { securityHeaders } from './config/security.js';
import cookieParser from 'cookie-parser';

// Middleware
import { requireAuth } from './middleware/authenticate.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// Module routes
import authRoutes from './modules/auth/auth.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import symptomsRoutes from './modules/symptoms/symptoms.routes.js';
import appointmentsRoutes from './modules/appointments/appointments.routes.js';
import reviewsRoutes from './modules/reviews/reviews.routes.js';
import trendsRoutes from './modules/trends/trends.routes.js';
import nurseRoutes from './modules/nurse/nurse.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';

// Cross-module controllers (mounted on other module prefixes)
import { getUpcomingAppointmentsAPI } from './modules/notifications/notifications.controller.js';
import { showJoinConsultation } from './modules/appointments/appointments.controller.js';
import { handleDailyWebhook } from './modules/appointments/webhook.controller.js';
import * as AppointmentsModel from './modules/appointments/appointments.model.js';
import { exportAppointmentsCSV, exportTrendsCSV } from './modules/export/export.controller.js';
import statesApi from './config/states/states-api.js';

// ============================================================================
// BOOTSTRAP
// ============================================================================

validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ============================================================================
// CORE MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(securityHeaders);
app.use(createSessionMiddleware());

// CSRF protection (session-based token)
app.use((req, res, next) => {
  if (req.session) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
  } else {
    res.locals.csrfToken = '';
  }
  next();
});

// Validate CSRF on state-changing requests
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();

  // Machine-to-machine webhook (Daily.co): no session/CSRF; verified by its own shared secret.
  if (req.path === '/consultations/webhook/daily') return next();

  // API endpoints: check header token (for browser console / fetch calls)
  if (req.path.includes('/api/')) {
    const headerToken = req.headers['x-csrf-token'];
    if (headerToken && headerToken === req.session?.csrfToken) return next();
    return res.status(403).json({ error: 'Invalid CSRF token. Pass x-csrf-token header.' });
  }

  // Form submissions: check body._csrf
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session?.csrfToken) {
    return res.status(403).render('error', {
      user: req.session?.user || null,
      statusCode: 403,
      message: 'Invalid or missing security token. Please refresh the page and try again.'
    });
  }
  next();
});

// ============================================================================
// STATIC ASSETS & VIEW ENGINE
// ============================================================================

app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ============================================================================
// ROUTES
// ============================================================================

// Root dashboard
app.get('/', requireAuth, async (req, res) => {
  let appointments = [];
  if (req.session.user.role === 'student') {
    try {
      await AppointmentsModel.expirePastAppointments();
      appointments = await AppointmentsModel.getAppointmentsByStudentWithStatus(req.session.user.id);
    } catch (e) { /* non-blocking — dashboard still renders */ }
  }
  res.render('index', { user: req.session.user, appointments });
});

// Auth (login, register, logout, password reset)
app.use('/auth', authRoutes);

// Profile (view, edit, delete, change password)
app.use('/profile', profileRoutes);

// Symptoms (checker, recommendations, history)
app.use('/symptoms', symptomsRoutes);

// Consultations (booking, history, cancel, reschedule)
app.use('/consultations', appointmentsRoutes);

// Reviews (ratings, nurse reviews)
app.use('/consultations', reviewsRoutes);

// Notifications API (upcoming appointments for browser notifications)
app.get('/consultations/api/upcoming', requireAuth, getUpcomingAppointmentsAPI);

// Phase 28: Join video consultation (student owner OR assigned nurse — ownership checked in controller)
app.get('/consultations/:id/join', requireAuth, showJoinConsultation);

// Phase 28: Daily.co webhook auditor (public; verified by shared secret, not session/CSRF)
app.post('/consultations/webhook/daily', handleDailyWebhook);

// Health Trends (dashboard, map data API)
app.use('/trends', trendsRoutes);

// Meet Our Staff (nurse profiles + verified reviews)
app.use('/staff', staffRoutes);

// Trends CSV export
app.get('/trends/export-csv', requireAuth, exportTrendsCSV);

// Nurse management (dashboard, appointment status, notes, patient history)
app.use('/management/nurse', nurseRoutes);

// Nurse availability (grid view + save)
app.use('/management/nurse', availabilityRoutes);

// Admin management (reports, student CRUD, nurse CRUD)
app.use('/management/admin', adminRoutes);

// Admin CSV export
app.get('/management/admin/reports/export-csv', requireAuth, exportAppointmentsCSV);

// Database state management API (admin-only, browser console)
app.use('/api/admin/state', statesApi);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    user: req.session?.user || null,
    statusCode: 404,
    message: 'Page not found.'
  });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

// ============================================================================
// SERVER BOOT
// ============================================================================

const PORT = process.env.APP_PORT;

async function startServer() {
  try {
    await query('SELECT 1');
    console.log('[Database] Connection pool verified.');

    app.listen(PORT, () => {
      console.log(`[Server] CampusCare running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[FATAL] Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
