# Technical Stack & Architecture — CampusCare

## 1. Core Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ (native ES Modules, `"type": "module"`) |
| Framework | Express.js 4.x |
| Views | EJS with layout partials (header, footer, navbar, alerts) |
| Database | MySQL 8.0 via `mysql2/promise` with connection pooling |
| Sessions | `express-session` + `express-mysql-session` (persistent store) |
| Security | `csrf-csrf` (double-submit CSRF), `cookie-parser`, bcrypt (10 rounds) |
| Maps | Leaflet.js 1.9 + OpenStreetMap tiles |
| Charts | Chart.js 4.4 |

## 2. Architecture Philosophy

**Keep it simple. Keep it safe. Keep it readable.**

This is Express MVC — not enterprise DDD. We don't introduce abstractions until they solve a real problem. But we do enforce boundaries:

- **Controllers** are thin HTTP handlers. They validate input, call models, and render responses. No raw SQL in controllers.
- **Models** are the only files that touch the database. Every query is parameterised. Named functions only — no generic `rawQuery` exports.
- **Middlewares** handle cross-cutting concerns: auth, CSRF, ownership, validation.
- **Utils** hold reusable non-HTTP helpers: `catchAsync`, `AppError`, `sanitize`.
- **Constants** are the single source of truth for enum-like values (roles, statuses, types).

## 3. Directory Contract

```
src/
├── app.js                  # Express setup, middleware registration, route mounting
├── constants.js            # Frozen enums: ROLES, APPOINTMENT_STATUS, SEVERITY, etc.
├── config/
│   ├── database.js         # Pool, query(), getConnection(), transaction()
│   ├── migrate.js          # Schema migrations (safe to re-run)
│   ├── seed.js             # Base data seeder
│   └── seed-showcase.js    # Demo data for presentations
├── controllers/            # HTTP handlers (use catchAsync, never raw SQL)
├── middlewares/
│   ├── authMiddleware.js   # requireAuth, requireStudent, requireNurse, requireAdmin
│   ├── csrf.js             # CSRF token generation + validation
│   ├── ownership.js        # IDOR guards (requireAppointmentOwner, requireAssignedNurse)
│   ├── errorHandler.js     # Global error handler (last middleware)
│   └── validation.js       # sanitize(), isValidEmail(), isValidScore(), etc.
├── models/                 # Named async DB functions, parameterised queries only
├── routes/                 # Route definitions with middleware chains
└── utils/
    ├── catchAsync.js       # Wraps async handlers, forwards errors to global handler
    └── AppError.js         # Operational error class with statusCode
```

## 4. Security Standards

### Non-Negotiable Rules
1. **Parameterised queries everywhere.** No string concatenation in SQL. Ever.
2. **CSRF tokens on every POST form.** Hidden input `_csrf` validated server-side.
3. **Ownership checks on all resource access.** Students see only their own records. Nurses see only their assigned patients.
4. **`<%= %>` for all user content in templates.** Never `<%- %>` except for `include()` calls.
5. **Sanitise all text inputs** before storage: strip `<>`, trim whitespace.
6. **bcrypt for all passwords.** 10 salt rounds minimum.

### Cookie & Session Configuration
```js
cookie: {
  httpOnly: true,          // No JS access
  sameSite: 'lax',         // Cross-site POST blocked
  secure: NODE_ENV === 'production',  // HTTPS only in prod
  maxAge: 3600000          // 1 hour
}
```

### HTTP Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 5. Code Patterns

### Controller Pattern (with catchAsync)
```js
import { catchAsync } from '../utils/catchAsync.js';
import { APPOINTMENT_STATUS } from '../constants.js';

export const showDashboard = catchAsync(async (req, res) => {
  const data = await SomeModel.getData(req.session.user.id);
  res.render('page', { user: req.session.user, data, error: null });
});
```

### Error Throwing (operational errors)
```js
import { AppError } from '../utils/AppError.js';

if (!appointment) throw new AppError('Appointment not found', 404);
if (appointment.StudentNumber !== userId) throw new AppError('Access denied', 403);
```

### Transaction Pattern (atomic multi-step operations)
```js
import { transaction } from '../config/database.js';

const result = await transaction(async (conn) => {
  const [rows] = await conn.execute('SELECT ... FOR UPDATE', [id]);
  if (rows.length > 0) throw new AppError('Slot taken', 409);
  await conn.execute('INSERT INTO ...', [values]);
  return { success: true };
});
```

### Constants (no magic strings)
```js
import { APPOINTMENT_STATUS, ROLES } from '../constants.js';

// Use:
if (apt.Status === APPOINTMENT_STATUS.COMPLETED) { ... }
// Never:
if (apt.Status === 'Completed') { ... }
```

## 6. Database Schema (Current — Post Phase 18)

| Table | Key Columns |
|-------|-------------|
| `Student` | `StudentNumber` (PK), `FirstName`, `LastName`, `Address`, `MedicalHistory`, `Email`, `Password` |
| `Nurse` | `StaffNumber` (PK), `FirstName`, `LastName`, `Address`, `PhoneNumber`, `Password`, `Email`, `ClinicID` |
| `Admin` | `StaffNumber` (PK), `Name`, `Password` |
| `Appointment` | `AppointmentID` (PK), `AppointmentType`, `Time`, `TeamsID`, `StudentNumber` (FK), `StaffNumber` (FK), `Status`, `Notes`, `CreatedAt` |
| `Rating` | `RatingID` (PK), `Score`, `RatingDescription`, `AppointmentID` (FK), `StudentNumber` (FK) |
| `NurseReviews` | `ReviewID` (PK), `AppointmentID` (FK), `StudentNumber` (FK), `StaffNumber` (FK), `Rating`, `ReviewText`, `CreatedAt` |
| `Symptoms` | `Name` (PK), `Description`, `Type`, `Tier`, `Cause`, `StudentNumber` (FK) |
| `Medication` | `MedicationCode` (PK), `Name`, `Description`, `SymptomsTreated`, `FacilityID`, `ExpiryDate`, `StockQuantity` |
| `SymptomMedication` | (`MedicationCode`, `Name`) — composite PK |
| `SymptomLog` | `LogID` (PK), `StudentNumber` (FK), `SymptomName`, `Severity`, `LogDate` |
| `NurseAvailability` | (`StaffNumber`, `DayOfWeek`, `TimeSlot`) — composite PK |
| `CampusZone` | `ZoneID` (PK), `Name`, `Latitude`, `Longitude`, `Radius` |
| `StudentZone` | (`StudentNumber`, `ZoneID`) — composite PK |
| `Clinic` | `RegNum` (PK), `Name`, `Address`, `TelephoneNumber`, `Email` |
| `MedicalFacility` | `FacilityID` (PK), `Type`, `Name`, `Address`, `PhoneNumber`, `ClinicID` |
| `PasswordResetToken` | `Token` (PK), `StudentNumber`, `ExpiresAt`, `Used` |

## 7. Development Tools

| Command | Purpose |
|---------|---------|
| `node src/app.js` | Start the application |
| `node src/config/migrate.js` | Apply schema migrations |
| `node src/config/seed.js` | Seed base data (students, nurses, symptoms, etc.) |
| `node src/config/seed-zones.js` | Seed campus zones + student mappings |
| `node src/config/seed-availability.js` | Seed nurse availability grid |
| `node src/config/seed-showcase.js` | Populate demo data for presentations |
| `node src/config/test_database.js` | Dump current table structure |

## 8. What We Don't Do

- No TypeScript — this is a Node.js ES Module project, keep it JavaScript
- No Zod or schema validation libraries — our `validation.js` middleware handles it
- No service layer abstractions — controllers call models directly
- No logging frameworks (winston, pino) — `console.error` with timestamps suffices
- No ORM — we write clean SQL with parameterised queries
- No frontend frameworks — vanilla JS + EJS server rendering
- No over-abstraction — if a pattern only exists in one place, don't abstract it
