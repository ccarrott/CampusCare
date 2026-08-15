# Phase 20: Module-Based Architecture Conversion & Security Hardening

## Goal

Convert the flat MVC structure into a **module-based architecture** where each feature domain is self-contained, then layer on security hardening. The app must boot and function identically after conversion — same routes, same views, same behaviour. Just better organised.

---

## Target Structure

```
src/
├── app.js                              # Express bootstrap (lean — just mounts middleware + routes)
├── constants.js                        # Frozen enums: ROLES, STATUSES, TYPES, SEVERITIES
│
├── config/
│   ├── database.js                     # Pool, query(), getConnection(), transaction()
│   ├── session.js                      # Session store config (express-mysql-session)
│   ├── security.js                     # CSRF setup, security headers, cookie policy
│   ├── environment.js                  # Validates required env vars (fail-fast on boot)
│   ├── migrate.js                      # Schema migration runner
│   ├── seed.js                         # Base data seeder
│   ├── seed-availability.js            # Nurse availability seeder
│   ├── seed-outbreak.js                # Outbreak sim seeder
│   ├── seed-showcase.js                # Demo data seeder
│   ├── seed-zones.js                   # Campus zones seeder
│   ├── seedData.json                   # Base seed data
│   └── test_database.js                # Schema inspector
│
├── middleware/
│   ├── authenticate.js                 # requireAuth — is the user logged in?
│   ├── authorize.js                    # requireRole(...roles) — role gating
│   ├── ownership.js                    # IDOR guards (requireAppointmentOwner, etc.)
│   ├── csrf.js                         # CSRF token generation + validation
│   ├── validate.js                     # Shared validation helpers (sanitize, isValidEmail, etc.)
│   └── errorHandler.js                 # Global error catcher + renderer
│
├── utils/
│   ├── catchAsync.js                   # Async error forwarding wrapper
│   ├── AppError.js                     # Operational error class with statusCode
│   ├── sanitize.js                     # Input sanitisation (single source)
│   └── dates.js                        # Weekday calculation, timezone-safe formatting
│
├── modules/
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   └── auth.model.js
│   │
│   ├── profile/
│   │   ├── profile.routes.js
│   │   ├── profile.controller.js
│   │   └── profile.model.js
│   │
│   ├── symptoms/
│   │   ├── symptoms.routes.js
│   │   ├── symptoms.controller.js
│   │   └── symptoms.model.js
│   │
│   ├── appointments/
│   │   ├── appointments.routes.js
│   │   ├── appointments.controller.js
│   │   └── appointments.model.js
│   │
│   ├── availability/
│   │   ├── availability.routes.js
│   │   ├── availability.controller.js
│   │   └── availability.model.js
│   │
│   ├── reviews/
│   │   ├── reviews.routes.js
│   │   ├── reviews.controller.js
│   │   └── reviews.model.js
│   │
│   ├── trends/
│   │   ├── trends.routes.js
│   │   ├── trends.controller.js
│   │   └── trends.model.js
│   │
│   ├── nurse/
│   │   ├── nurse.routes.js
│   │   ├── nurse.controller.js
│   │   └── nurse.model.js
│   │
│   ├── admin/
│   │   ├── admin.routes.js
│   │   ├── admin.controller.js
│   │   └── admin.model.js
│   │
│   ├── notifications/
│   │   └── notifications.controller.js
│   │
│   └── export/
│       └── export.controller.js
│
└── (old controllers/, models/, routes/, middlewares/ — DELETED after migration)
```

---

## Migration Map: Old → New

### Controllers

| Old File | New Location |
|----------|-------------|
| `src/controllers/authController.js` | `src/modules/auth/auth.controller.js` |
| `src/controllers/profileController.js` | `src/modules/profile/profile.controller.js` |
| `src/controllers/symptomController.js` | `src/modules/symptoms/symptoms.controller.js` |
| `src/controllers/appointmentController.js` | `src/modules/appointments/appointments.controller.js` |
| `src/controllers/availabilityController.js` | `src/modules/availability/availability.controller.js` |
| `src/controllers/ratingController.js` | `src/modules/reviews/reviews.controller.js` (merge) |
| `src/controllers/nurseReviewController.js` | `src/modules/reviews/reviews.controller.js` (merge) |
| `src/controllers/trendController.js` | `src/modules/trends/trends.controller.js` |
| `src/controllers/nurseController.js` | `src/modules/nurse/nurse.controller.js` |
| `src/controllers/adminController.js` | `src/modules/admin/admin.controller.js` (merge) |
| `src/controllers/adminCrudController.js` | `src/modules/admin/admin.controller.js` (merge) |
| `src/controllers/notificationController.js` | `src/modules/notifications/notifications.controller.js` |
| `src/controllers/exportController.js` | `src/modules/export/export.controller.js` |

### Models

| Old File | New Location |
|----------|-------------|
| `src/models/userModel.js` | `src/modules/auth/auth.model.js` + `src/modules/profile/profile.model.js` (split) |
| `src/models/symptomModel.js` | `src/modules/symptoms/symptoms.model.js` |
| `src/models/appointmentModel.js` | `src/modules/appointments/appointments.model.js` |
| `src/models/availabilityModel.js` | `src/modules/availability/availability.model.js` |
| `src/models/ratingModel.js` | `src/modules/reviews/reviews.model.js` (merge) |
| `src/models/nurseReviewModel.js` | `src/modules/reviews/reviews.model.js` (merge) |
| `src/models/trendModel.js` | `src/modules/trends/trends.model.js` |
| `src/models/nurseManagementModel.js` | `src/modules/nurse/nurse.model.js` |
| `src/models/adminReportModel.js` | `src/modules/admin/admin.model.js` (merge) |
| `src/models/adminCrudModel.js` | `src/modules/admin/admin.model.js` (merge) |

### Routes

| Old File | New Location |
|----------|-------------|
| `src/routes/authRoutes.js` | `src/modules/auth/auth.routes.js` |
| `src/routes/profileRoutes.js` | `src/modules/profile/profile.routes.js` |
| `src/routes/symptomRoutes.js` | `src/modules/symptoms/symptoms.routes.js` |
| `src/routes/consultationRoutes.js` | Split: `appointments.routes.js` + `reviews.routes.js` |
| `src/routes/managementRoutes.js` | Split: `nurse.routes.js` + `admin.routes.js` + `availability.routes.js` |
| `src/routes/trendRoutes.js` | `src/modules/trends/trends.routes.js` |

### Middleware

| Old File | New Location | Changes |
|----------|-------------|---------|
| `src/middlewares/authMiddleware.js` | Split: `src/middleware/authenticate.js` + `src/middleware/authorize.js` | Refactor to composable `requireRole(...roles)` |
| `src/middlewares/validation.js` | `src/middleware/validate.js` + `src/utils/sanitize.js` | Split sanitize out as its own util |

---

## Merges (Consolidation)

### Reviews Module
Merge `ratingController.js` + `nurseReviewController.js` → one `reviews.controller.js`
Merge `ratingModel.js` + `nurseReviewModel.js` → one `reviews.model.js`

Both handle student feedback on nurses. One model, one controller, one route file. Exposed functions:
- `submitRating()` (existing rating system)
- `submitReview()` (Bridget's nurse review system)
- `showReviewPage()`
- `showStudentReviews()`
- `getReviewsByNurse()`
- `hasReviewedAppointment()`

### Admin Module
Merge `adminController.js` + `adminCrudController.js` → one `admin.controller.js`
Merge `adminReportModel.js` + `adminCrudModel.js` → one `admin.model.js`

Both are admin-only operations. One module owns them all.

### Auth/Profile Split
Split `userModel.js` into:
- `auth.model.js` — findStudentByNumber, findNurseByStaff, findAdminByStaff, createStudent, password reset functions
- `profile.model.js` — getStudentProfile, updateStudentProfile, deleteStudentAccount

---

## New Files to Create

### `src/constants.js`
```js
export const ROLES = Object.freeze({
  STUDENT: 'student',
  NURSE: 'nurse',
  ADMIN: 'admin'
});

export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
});

export const APPOINTMENT_TYPE = Object.freeze({
  PHYSICAL: 'Physical',
  ONLINE: 'Online'
});

export const SEVERITY = Object.freeze({
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High'
});
```

### `src/config/environment.js`
```js
const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT', 'APP_PORT', 'SESSION_SEED'];

export function validateEnv() {
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
```

### `src/config/session.js`
```js
import session from 'express-session';
import mysqlSessionFactory from 'express-mysql-session';
import { pool } from './database.js';

const MySQLStore = mysqlSessionFactory(session);

export function createSessionMiddleware() {
  return session({
    store: new MySQLStore({}, pool),
    secret: process.env.SESSION_SEED,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 3600000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  });
}
```

### `src/config/security.js`
```js
import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function csrfSetup() {
  const { doubleCsrfProtection, generateToken } = doubleCsrf({
    getSecret: () => process.env.SESSION_SEED,
    cookieName: '_csrf',
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
    getTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token']
  });
  return { doubleCsrfProtection, generateToken };
}

export { cookieParser };
```

### `src/config/database.js` (enhanced)
```js
// Existing pool + query() stays
// Add:
export async function getConnection() {
  return await pool.getConnection();
}

export async function transaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
```

### `src/utils/catchAsync.js`
```js
export function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

### `src/utils/AppError.js`
```js
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### `src/utils/sanitize.js`
```js
export function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>]/g, '').trim();
}
```

### `src/utils/dates.js`
```js
export function getUpcomingWeekDays(count = 5) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days = [];
  let current = new Date();

  while (days.length < count) {
    current.setDate(current.getDate() + (days.length === 0 ? 0 : 1));
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days.push({
        dayName: dayNames[current.getDay()],
        date: current.toISOString().slice(0, 10),
        key: dayNames[current.getDay()],
        label: `${dayNames[current.getDay()]} (${current.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })})`
      });
    }
    if (days.length === 0) current.setDate(current.getDate() + 1);
  }
  return days;
}

export function formatDatetimeForMySQL(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:00`;
}

export function isWeekday(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day !== 0 && day !== 6;
}
```

### `src/middleware/authenticate.js`
```js
export function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/auth/login');
}
```

### `src/middleware/authorize.js`
```js
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/auth/login');
    if (!roles.includes(req.session.user.role)) return res.status(403).render('error', {
      user: req.session.user,
      statusCode: 403,
      message: 'You do not have permission to access this resource.'
    });
    next();
  };
}
```

### `src/middleware/ownership.js`
```js
import { query } from '../config/database.js';
import { AppError } from '../utils/AppError.js';

export function requireAppointmentOwner(req, res, next) {
  // Validates student owns the appointment in req.body.appointmentId or req.params.id
  // Implementation checks DB and compares to req.session.user.id
}

export function requireAssignedNurse(req, res, next) {
  // Validates nurse is the StaffNumber on the appointment
}

export function requirePatientRelationship(req, res, next) {
  // Validates nurse has had at least one appointment with the patient
}
```

### `src/middleware/errorHandler.js`
```js
export function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong. Please try again.';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${statusCode}: ${err.message}`);

  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(statusCode).json({ error: message });
  }

  res.status(statusCode).render('error', {
    user: req.session?.user || null,
    statusCode,
    message
  });
}
```

### `views/error.ejs` (new)
Generic error display page matching the app's design system.

---

## `app.js` After Conversion

```js
import express from 'express';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateEnv } from './config/environment.js';
import { query } from './config/database.js';
import { createSessionMiddleware } from './config/session.js';
import { securityHeaders, csrfSetup, cookieParser } from './config/security.js';
import { requireAuth } from './middleware/authenticate.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// Module routes
import authRoutes from './modules/auth/auth.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import symptomsRoutes from './modules/symptoms/symptoms.routes.js';
import appointmentsRoutes from './modules/appointments/appointments.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import reviewsRoutes from './modules/reviews/reviews.routes.js';
import trendsRoutes from './modules/trends/trends.routes.js';
import nurseRoutes from './modules/nurse/nurse.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

// Setup
validateEnv();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(securityHeaders);
app.use(createSessionMiddleware());

// CSRF (after session, before routes)
const { doubleCsrfProtection, generateToken } = csrfSetup();
app.use((req, res, next) => {
  res.locals.csrfToken = generateToken(req, res);
  next();
});
app.use(doubleCsrfProtection);

// Static & Views
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.get('/', requireAuth, (req, res) => res.render('index', { user: req.session.user }));
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/symptoms', symptomsRoutes);
app.use('/consultations', appointmentsRoutes);
app.use('/consultations', reviewsRoutes);
app.use('/trends', trendsRoutes);
app.use('/management/nurse', nurseRoutes);
app.use('/management/nurse', availabilityRoutes);
app.use('/management/admin', adminRoutes);

// Global error handler (MUST be last)
app.use(globalErrorHandler);

// Boot
const PORT = process.env.APP_PORT;
async function startServer() {
  try {
    await query('SELECT 1');
    console.log('[Database] Connection pool verified.');
    app.listen(PORT, () => console.log(`[Server] CampusCare running at http://localhost:${PORT}`));
  } catch (error) {
    console.error('[FATAL] Database connection failed:', error.message);
    process.exit(1);
  }
}
startServer();
```

---

## Cross-Module Import Rules

When one module needs another module's model:

```js
// src/modules/appointments/appointments.controller.js
import * as AvailabilityModel from '../availability/availability.model.js';
```

This is fine. Modules can import other modules' models (read access). What they should NOT do:
- Import another module's controller (use a shared route instead)
- Write SQL that touches another module's primary table (call that module's model function instead)

---

## Execution Order

| Step | What | Risk |
|------|------|------|
| 1 | Create folder skeleton (`src/modules/*`, `src/middleware/`, `src/utils/`, `src/config/`) | Zero |
| 2 | Create new util files: `catchAsync.js`, `AppError.js`, `sanitize.js`, `dates.js` | Zero (additive) |
| 3 | Create new config files: `environment.js`, `session.js`, `security.js` | Zero (additive) |
| 4 | Create new middleware: `authenticate.js`, `authorize.js`, `ownership.js`, `errorHandler.js`, `csrf.js`, `validate.js` | Zero (additive) |
| 5 | Create `constants.js` | Zero (additive) |
| 6 | Create `views/error.ejs` | Zero (additive) |
| 7 | Move + refactor `auth` module (routes + controller + model) | Medium |
| 8 | Move + refactor `profile` module | Low |
| 9 | Move + refactor `symptoms` module | Low |
| 10 | Move + refactor `appointments` module (includes atomic booking transaction) | Medium |
| 11 | Move + refactor `availability` module | Low |
| 12 | Move + merge `reviews` module (rating + nurseReview → one module) | Medium |
| 13 | Move + refactor `trends` module | Low |
| 14 | Move + refactor `nurse` module | Low |
| 15 | Move + merge `admin` module (reports + CRUD → one module) | Medium |
| 16 | Move `notifications` + `export` modules | Low |
| 17 | Rewrite `app.js` to mount new module routes + new middleware chain | High (integration point) |
| 18 | Install new dependencies (`express-mysql-session`, `csrf-csrf`, `cookie-parser`) | Low |
| 19 | Add CSRF hidden input to ALL EJS forms (`<input type="hidden" name="_csrf" value="<%= csrfToken %>">`) | Medium (many files) |
| 20 | Apply `catchAsync` to all controller functions | Medium (touches all modules) |
| 21 | Replace all magic strings with constants imports | Medium (touches all modules) |
| 22 | Apply ownership middleware to vulnerable routes | Low |
| 23 | XSS audit: grep `<%-` in views, confirm all are `include()` only | Low |
| 24 | Delete old `src/controllers/`, `src/models/`, `src/routes/`, `src/middlewares/` folders | Low (cleanup) |
| 25 | Boot test + full route verification | Critical |

---

## New Dependencies

```
npm install express-mysql-session csrf-csrf cookie-parser
```

That's it. Three packages. All well-maintained, widely used.

---

## Views: What Changes

Views themselves **don't move** — they stay in `views/` with the same folder structure. The only changes to view files:

1. Add `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` inside every `<form method="POST">`
2. Verify no `<%- userContent %>` patterns exist (only `<%- include(...) %>`)
3. Create `views/error.ejs` for the global error handler

---

## Verification Checklist

After completion:

- [ ] `node src/app.js` boots without errors
- [ ] Login/register works (auth module)
- [ ] Student can book an appointment (appointments module)
- [ ] Nurse dashboard loads with appointments (nurse module)
- [ ] Availability grid saves correctly (availability module)
- [ ] Symptom check + history works (symptoms module)
- [ ] Trends map loads with zone data (trends module)
- [ ] Admin CRUD (add/edit/delete students + nurses) works (admin module)
- [ ] Admin reports render with charts (admin module)
- [ ] Ratings + reviews submit correctly (reviews module)
- [ ] Profile view/edit works (profile module)
- [ ] CSV export downloads (export module)
- [ ] Notifications API responds (notifications module)
- [ ] CSRF: form submission without token → 403
- [ ] CSRF: form submission with token → success
- [ ] Two simultaneous booking attempts → one succeeds, one gets "slot taken"
- [ ] Student A cannot cancel Student B's appointment
- [ ] Nurse cannot view unrelated patient's history
- [ ] Sessions persist across server restart
- [ ] Error page renders for invalid routes (404) and server errors (500)
- [ ] Security headers present in response (check browser devtools)
- [ ] No files remain in old `src/controllers/`, `src/models/`, `src/routes/`, `src/middlewares/`

---

## What Stays the Same

- Express.js 4.x (no framework change)
- EJS views (no frontend framework)
- MySQL 8.0 via mysql2/promise (no ORM)
- bcrypt for passwords
- Leaflet.js + Chart.js on frontend
- `public/` folder structure (CSS, JS untouched)
- `views/` folder structure (untouched)
- All business logic (same code, new address)
- Session-based auth (no JWT)
- All existing routes/URLs (users see no difference)
