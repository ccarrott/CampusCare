# Technical Stack & Architecture — CampusCare

## 1. Core Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ (native ES Modules, `"type": "module"`) |
| Framework | Express.js 5.x |
| Views | EJS with layout partials (header, navbar, footer, alerts) + reusable component partials |
| Database | MySQL 8.0 via `mysql2/promise` with connection pooling |
| Sessions | `express-session` (persistent store) |
| Security | Session-based double-submit CSRF, `cookie-parser`, bcrypt (10 rounds) |
| Maps | **MapLibre GL JS + MapTiler theme-matched vector tiles.** *Leaflet retired in the UI haul (Phase 30G).* |
| Charts | Chart.js 4.4 |
| Video | Daily.co (`@daily-co/daily-js`, vendored in `public/vendor/daily/`) |
| Animation | **Motion One** (`motion`, vanilla ~5KB) — entrances, hovers, spring transitions |

> **UI-library policy (critical for the UI haul):** React/Tailwind component kits (KokonutUI, bklit, liqui.design, Refero/Nodenza references) are **visual reference ONLY** — we re-implement their look in our own hand-written CSS + vanilla JS. We never import React, Tailwind, or a build step. The only new *client* libraries permitted are vanilla ones loaded the way Chart.js/Daily already are: **Motion One** and **MapLibre GL JS**. Cached reference notes live in `.kiro/design-refs.md`.

## 2. Architecture Philosophy

**Keep it simple. Keep it safe. Keep it readable.**

Express MVC — not enterprise DDD. No abstractions until they solve a real problem. Boundaries we DO enforce:

- **Controllers** are thin HTTP handlers — validate input, call models, render. No raw SQL.
- **Models** are the only files that touch the DB. Parameterised queries only. Named functions, no generic `rawQuery`.
- **Middleware** handles cross-cutting concerns: auth, CSRF, ownership, validation.
- **Utils** hold reusable non-HTTP helpers: `catchAsync`, `AppError`, `sanitize`, `daily`, `geo`, `dates`.
- **Constants** are the single source of truth for enum-like values.

## 3. Directory Contract

Domain-based module layout under `src/modules/` — each feature owns routes + controller + model. (The old flat `controllers/`/`models/`/`routes/` layout is retired.)

```
src/
├── app.js                  # Express setup, middleware, route mounting
├── constants.js            # ROLES, APPOINTMENT_STATUS, APPOINTMENT_TYPE, SEVERITY, CAMPUSES, DAILY, ESCALATION
├── config/
│   ├── database.js         # pool, query(), getConnection(), transaction()
│   ├── environment.js      # fail-fast env validation
│   ├── session.js          # session middleware + secure cookie config
│   ├── security.js         # security headers (incl. Permissions-Policy)
│   ├── migrate.js          # idempotent schema migrations
│   ├── seed-symptoms.js    # symptom/medication seed
│   └── states/             # DB state tooling: naked / showcase / outbreak / clear
├── middleware/             # authenticate, authorize, ownership, errorHandler, validate
├── modules/
│   ├── auth/  profile/  symptoms/  appointments/  availability/
│   ├── reviews/  trends/  nurse/  admin/  staff/  notifications/  shared/
└── utils/                  # catchAsync, AppError, sanitize, dates, daily, geo
```

## 4. Security Standards

### Non-Negotiable Rules
1. **Parameterised queries everywhere.** No string concatenation in SQL. Ever.
2. **CSRF on every POST.** Hidden `_csrf` input or `x-csrf-token` header, validated server-side. Page-wide `<meta name="csrf-token">` exposes it to console/admin tools.
3. **Ownership checks on all resource access.** Students see only their own records; nurses only their assigned patients.
4. **`<%= %>` for all user content.** Never `<%- %>` except `include()` and server-generated JSON.
5. **Sanitise all text inputs** before storage: strip `<>`, trim.
6. **bcrypt for all passwords.** 10 salt rounds minimum.

### Cookie & Session
```js
cookie: { httpOnly: true, sameSite: 'lax', secure: NODE_ENV === 'production', maxAge: 3600000 }
```

### HTTP Security Headers (`config/security.js`)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self "https://<daily-domain>.daily.co"),
                    microphone=(self "https://<daily-domain>.daily.co"),
                    geolocation=(self)
```
> The Permissions-Policy MUST delegate camera/mic to the Daily iframe origin and allow geolocation on `self` (Tier-3 locator + map). An empty `()` allowlist breaks video + location. **Phase 30G note:** MapTiler tiles load from `api.maptiler.com` — ensure no CSP blocks it (we set no restrictive CSP currently).

## 5. Code Patterns

### Controller (catchAsync)
```js
import { catchAsync } from '../../utils/catchAsync.js';
export const showDashboard = catchAsync(async (req, res) => {
  const data = await SomeModel.getData(req.session.user.id);
  res.render('page', { user: req.session.user, data, error: null });
});
```
### Operational errors
```js
import { AppError } from '../../utils/AppError.js';
if (!appointment) throw new AppError('Appointment not found', 404);
```
### Atomic transaction (booking)
```js
const conn = await pool.getConnection();
try { await conn.beginTransaction(); /* SELECT ... FOR UPDATE; INSERT */ await conn.commit(); }
catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
```
### Constants (no magic strings)
```js
import { APPOINTMENT_STATUS, ROLES, CAMPUSES } from '../../constants.js';
```

## 6. Database Schema (Current — Post Phase 29B)

| Table | Key Columns |
|-------|-------------|
| `Student` | `StudentNumber` (PK, login username incl. `s`), `FirstName`, `LastName`, `MedicalHistory`, `Password`, `Latitude`, `Longitude` |
| `Nurse` | `StaffNumber` (PK), `FirstName`, `LastName`, `PhoneNumber`, `Email`, `Password`, `ClinicID` (FK), `Campus`, `Bio`, `YearsExperience` |
| `Admin` | `StaffNumber` (PK), `Name`, `Email`, `Password` |
| `Appointment` | `AppointmentID` (PK), `AppointmentType`, `Time`, `Status`, `Notes`, `CreatedAt`, `Campus`, `PreferredLanguage`, `RoomName`, `RoomUrl`, `RoomExp`, `TeamsID` (legacy/unused), `StudentNumber` (FK), `StaffNumber` (FK) |
| `ConsultationSession` | `SessionID` (PK), `AppointmentID`, `RoomName`, `StartedAt`, `EndedAt`, `DurationSeconds`, `NurseJoinedAt`, `StudentJoinedAt` |
| `Rating` | `RatingID` (PK), `Score`, `RatingDescription`, `AppointmentID` (FK), `StudentNumber` (FK), `CreatedAt` |
| `NurseReviews` | `ReviewID` (PK), `AppointmentID`, `StudentNumber`, `StaffNumber`, `Rating`, `ReviewText`, `Verified`, `VerifiedAt`, `CreatedAt` |
| `Symptom` | `SymptomID` (PK), `Name`, `Category`, `Tier`, `Description` |
| `Medication` | `MedicationCode` (PK), `Name`, `Description` |
| `SymptomMedicationMap` | (`SymptomID`, `MedicationCode`) composite PK |
| `SymptomLog` | `LogID` (PK), `StudentNumber`, `SymptomName`, `Severity`, `LogDate`, `Duration`, `Trajectory`, `OtherText` |
| `SymptomLogEntry` | (`LogID`, `SymptomID`) composite PK |
| `NurseAvailability` | weekly slot grid per nurse |
| `CampusZone` | `ZoneID` (PK), `Name`, `Latitude`, `Longitude`, `Boundary` (JSON polygon) |
| `StudentZone` | (`StudentNumber`, `ZoneID`) composite PK |
| `Clinic` | `RegNum` (PK), `Name`, `Address`, `TelephoneNumber`, `Email` |
| `PasswordResetToken` | single-use tokens with expiry |

> Retired since original schema: `MedicalFacility`; `Student.Address`/`Student.Email`; `Nurse.Address` (→ `Campus`); `Medication.FacilityID`/`ExpiryDate`/`StockQuantity`. `Appointment.TeamsID` kept but unwritten (Daily replaced Teams, Phase 28). **Phase 30G may add symptom-report point storage — see the map plan.**

## 7. Front-End Layers (Design System)

| File | Role |
|------|------|
| `public/css/style.css` | Single design-system stylesheet. Everything flows from the `:root` token layer + shared component classes + **layout archetypes** (Phase 30). |
| `public/js/*.js` | Vanilla modules: sidebar, darkmode, notifications, session-timeout, sortable-table, permissions, admin-tools; (Phase 30) `motion` bootstrap + `map`. |
| `views/partials/` | Shared layout + reusable component partials. |

**Design-language authority:** `.kiro/steering/ui-design.md` governs ALL visual work. Reference cache: `.kiro/design-refs.md`. Never hardcode a colour/shadow/radius/spacing a token already covers.

## 8. Development Tools

| Command | Purpose |
|---------|---------|
| `node src/app.js` | Start the app |
| `node src/config/migrate.js` | Apply migrations (idempotent) |
| `npm run state:naked` / `state:showcase` / `state:outbreak` / `state:clear` | DB state tooling |
| Browser console (admin) | `CampusCare.showcase()` / `.outbreak()` / `.clear()` / `.naked()` |

> If a change doesn't reflect in-browser, kill any stale `node` holding port 3000 (`Stop-Process -Name node -Force`) then restart.

## 9. What We Don't Do

- No TypeScript — ES Module JavaScript only
- No Zod / schema-validation libs — `middleware/validate.js`
- No service-layer abstractions
- No logging frameworks — timestamped `console.error`
- No ORM — parameterised SQL
- **No frontend frameworks / no build step / no Tailwind** — vanilla JS + EJS SSR + hand-written CSS. (Motion One + MapLibre GL are vanilla runtime libs — allowed.)
- No over-abstraction — if a pattern exists once, don't abstract it
