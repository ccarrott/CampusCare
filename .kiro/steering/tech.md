# Technical Stack & Architectural Guidelines - CampusCare Hub

## 1. Core Stack Specifications
* **Runtime Environment**: Node.js (v18+) using native ES Modules (`"type": "module"` in `package.json`).
* **Web Framework**: Express.js (v4.x).
* **View Engine**: EJS (Embedded JavaScript Templates) with layout partials.
* **Database Driver**: `mysql2/promise` utilizing continuous connection pooling (`src/config/database.js`).
* **Session Security**: `express-session` with `httpOnly: true`, `resave: false`, `saveUninitialized: false`, and configurable secret tokens.

## 2. Model-View-Controller (MVC) Directory Contract
* **Routes (`src/routes/`)**: Map HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`) and paths to controller methods. Apply role-checking middleware explicitly per endpoint.
* **Controllers (`src/controllers/`)**: Handle HTTP payload extraction, request validation, business logic, session reading (`req.session.user`), model invocation, and response rendering/redirecting.
* **Models (`src/models/`)**: Contain isolated, asynchronous database access functions.
  * **CRITICAL**: Every database query MUST use parameterized placeholders (`?`) to guarantee protection against SQL Injection attacks.
* **Middlewares (`src/middlewares/`)**: Intercept and enforce authentication (`requireAuth`), session state parsing, and role-based access control (`requireStudent`, `requireNurse`, `requireAdmin`).

## 3. Database Schema Alignment (ACTUAL - as of current deployment)
All models must reference exact table names and case-sensitive column attributes:

* **`Student`**: `StudentNumber` (PK), `FirstName`, `LastName`, `Address`, `MedicalHistory`, `Email`, `Password`
* **`Nurse`**: `StaffNumber` (PK), `FirstName`, `LastName`, `Address`, `PhoneNumber`
  * **MISSING**: `Password`, `ClinicID`, `Email` — to be added in Phase 7 migration
* **`Admin`**: `StaffNumber` (PK), `Name`
  * **MISSING**: `Password`, `Email` — to be added in Phase 7 migration
* **`Symptoms`**: `Name` (PK), `Description`, `Type`, `Tier`, `Cause`, `StudentNumber` (FK)
* **`Medication`**: `MedicationCode` (PK), `Name`, `Description`, `SymptomsTreated`
  * **MISSING**: `FacilityID` (FK), `ExpiryDate`, `StockQuantity`
* **`SymptomMedication`**: (`MedicationCode`, `Name`) — composite PK linking symptoms to medications
* **`Appointment`**: `AppointmentID` (PK), `AppointmentType`, `Time`, `TeamsID`, `StudentNumber` (FK), `StaffNumber` (FK)
  * **MISSING**: `Status`, `Notes`, `CreatedAt`
* **`Rating`**: `RatingID` (PK), `Score`, `RatingDescription`, `AppointmentID` (FK)
  * **MISSING**: `StudentNumber` (FK), `CreatedAt`
* **`Clinic`**: `RegNum` (PK), `Name`, `Address`, `TelephoneNumber`, `Email`
* **`MedicalFacility`**: `FacilityID` (PK), `Type`, `Address`, `PhoneNumber`
  * **MISSING**: `Name`, `ClinicID` (FK)

## 4. Code Standards & Error Handling
* Use `try/catch` blocks inside all controller functions.
* If a database or logic error occurs, render a clean error message to the view or send an appropriate HTTP status code (`400`, `401`, `403`, `404`, `500`).
* Sanitize form text inputs to prevent XSS (Cross-Site Scripting).
* All passwords MUST be hashed using bcrypt before storage (Phase 7 requirement).

## 5. Seeder & Development Tools
* **Seed Data**: `src/config/seedData.json` — editable JSON arrays for all tables.
* **Seeder Script**: `src/config/seed.js` — clears and re-populates all tables. Run with `node src/config/seed.js`.
* **Schema Inspector**: `src/config/test_database.js` — dumps current table structure. Run with `node src/config/test_database.js`.
