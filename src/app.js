// src/app.js
// CampusCare — Express application entry point.

import express from 'express';
import 'dotenv/config';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// Config
import { validateEnv } from './config/environment.js';
import { query, pool } from './config/database.js';
import { createSessionMiddleware } from './config/session.js';
import { securityHeaders } from './config/security.js';
import cookieParser from 'cookie-parser';
import compression from 'compression';

// Middleware
import { requireAuth } from './middleware/authenticate.js';
import { requireRole } from './middleware/authorize.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { ROLES } from './constants.js';

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

// Behind a hosting HTTPS proxy (Render/Railway/etc.), trust it so secure
// session cookies are set correctly in production.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ============================================================================
// CORE MIDDLEWARE
// ============================================================================

app.use(securityHeaders);

// gzip responses. Matters most for the vendored client libraries (MapLibre, Chart.js,
// Leaflet, Daily) and style.css — together well over a megabyte uncompressed, which is
// a slow first paint on a phone or a free-tier cold start.
app.use(compression());

// View engine + static assets. Static is mounted BEFORE the session/CSRF layer so
// CSS/JS/image requests never touch the session store (they can't be authenticated
// anyway) — that keeps asset serving cheap and avoids pointless session churn.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public'), { maxAge: '1h' }));

// Cheap liveness probe for the host's health check — no DB, no session, no render.
app.get('/healthz', (req, res) => res.status(200).type('text').send('ok'));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(createSessionMiddleware());

// Asset cache-bust token — changes each server start so browsers always fetch
// fresh CSS/JS after a deploy/restart (no stale-cache surprises).
const ASSET_VERSION = Date.now().toString(36);

// CSRF protection (session-based token)
app.use((req, res, next) => {
  res.locals.assetV = ASSET_VERSION;
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

  // Form submissions: check body._csrf. In Express 5 req.body is undefined when no
  // parser matched the Content-Type, so read it optionally — a request with an
  // unparsed body must fail CSRF, not throw a 500 on the way there.
  const token = req.body?._csrf || req.headers['x-csrf-token'];
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
app.get('/management/admin/reports/export-csv', requireRole(ROLES.ADMIN), exportAppointmentsCSV);

// Database state management API (admin-only, browser console)
app.use('/api/admin/state', statesApi);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl} (session user: ${req.session?.user?.role || 'none'})`);
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

// Hosts (Render/Railway/etc.) inject PORT; fall back to APP_PORT for local dev.
const PORT = process.env.PORT || process.env.APP_PORT || 3000;

async function startServer() {
  try {
    await query('SELECT 1');
    console.log('[Database] Connection pool verified.');

    const server = app.listen(PORT, () => {
      console.log(`[Server] CampusCare running on port ${PORT}`);
    });

    // Hosts (Render/Railway) send SIGTERM on deploy/scale-down. Stop accepting new
    // connections, then close the MySQL pool so in-flight queries finish cleanly.
    const shutdown = (signal) => {
      console.log(`[Server] ${signal} received — shutting down.`);
      server.close(async () => {
        try { await pool.end(); } catch { /* pool already closed */ }
        process.exit(0);
      });
      // Don't hang forever on a stuck connection.
      setTimeout(() => process.exit(0), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[FATAL] Database connection failed:', error.message);
    process.exit(1);
  }
}

// An unhandled rejection would otherwise take the process down silently in Node 18+.
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason instanceof Error ? reason.stack : reason);
});

startServer();
