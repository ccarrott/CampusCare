<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/EJS-Templates-B4CA65?style=for-the-badge&logo=ejs&logoColor=black" />
  <img src="https://img.shields.io/badge/Leaflet.js-Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white" />
  <img src="https://img.shields.io/badge/Chart.js-4.x-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" />
</p>

<h1 align="center">CampusCare</h1>

<p align="center">
  <strong>University Health Services Platform</strong><br>
  <em>Reducing clinic wait times from one month to one click.</em>
</p>

<p align="center">
  A three-tier healthcare web platform designed to relieve university clinic congestion<br>
  by categorising student needs according to symptom severity — built for<br>
  <strong>Nelson Mandela University, Gqeberha</strong>.
</p>

---

## The Problem

NMU's campus clinic currently requires appointments to be booked almost **a month in advance**. Students with immediate health needs are left without care unless they can afford private medical professionals. The result: overcrowded waiting rooms, delayed treatment, and a growing sense that the clinic system simply doesn't work.

## The Solution

CampusCare implements a **Three-Tier Healthcare Strategy** that triages student health needs before they reach the clinic:

| Tier | Purpose | How It Works |
|:----:|---------|--------------|
| **1** | Self-Care & Automated Support | Students log symptoms, receive OTC medication recommendations, and view campus health trend maps showing what's going around |
| **2** | Nurse Consultations | 15-minute physical or online (Microsoft Teams) appointments with campus nurses, complete with availability grids and student feedback ratings |
| **3** | Clinical Escalation | Nurse shift management, patient progress tracking, tier advancement, and operational analytics for administrators |

---

## Features

### For Students
- Symptom checker with 20 SA-relevant conditions across 6 medical categories
- OTC medication recommendations (15 medications with symptom mappings)
- Personal symptom history timeline
- Interactive campus health map (Leaflet.js + OpenStreetMap)
- Appointment booking with real-time nurse availability grid
- Nurse profile card shown during booking (bio, experience, verified reviews)
- Cancel and reschedule consultations
- Rate completed consultations via star rating modal
- Review nurses (one per nurse, admin-moderated before public display)
- "Meet Our Staff" page with nurse profiles and approved anonymous reviews
- Browser notifications (24h, 1h, and start-time reminders)
- Session timeout warnings with one-click refresh
- Auto-expire past appointments (stale bookings cleaned automatically)

### For Nurses
- Clinical dashboard with full appointment lifecycle management
- Personal rating summary (average score from consultations)
- Drag-to-paint weekly availability grid (27 slots per day)
- Patient symptom history viewer (IDOR-protected)
- Consultation notes documentation
- MS Teams link management for online appointments
- Appointment status flow: Pending → Confirmed → Completed
- Bio editor (public profile with character limit + years of experience)

### For Administrators
- Operational reports with Chart.js visualisations
- Nurse review moderation queue (approve/reject before public display)
- Per-nurse feedback overview (averages + counts)
- Full CRUD management for student and nurse accounts
- CSV export for appointments and health trend data
- Print-friendly report layouts
- Campus-wide health trend analytics

### Platform-Wide
- Auto-detect login (no role dropdown — searches Student → Nurse → Admin)
- Forgot/reset password with token-based links
- Dark mode (system preference detection + manual toggle)
- Responsive mobile layout with drawer sidebar
- CSRF protection on all form submissions (session-based tokens)
- Role-based access control on every endpoint
- IDOR ownership validation on sensitive resources
- XSS sanitisation and parameterised SQL queries throughout
- bcrypt password hashing (10 salt rounds)
- Security headers (nosniff, X-Frame-Options, Referrer-Policy)
- Atomic transaction-based booking (prevents race condition double-bookings)

---

## Campus Health Map

CampusCare maps real-time health trends across **16 Gqeberha suburb zones** using anonymised, aggregated symptom data displayed as a **choropleth heat map**:

- **Summerstrand** — NMU campus + student accommodation
- **Humewood** — Beachfront area
- **South End & Central** — CBD and inner city
- **North End & Korsten** — Dense residential
- **Newton Park** — Major western suburb
- **Mill Park** — Inner residential
- **Walmer** — Southern suburb
- **Lorraine** — Northern suburb
- **Sherwood & Kabega** — Western suburbs
- **Westering & Bridgemead** — Northwest
- **Sunridge Park** — Midlands
- **Richmond Hill** — Inner east
- **Sydenham & Malabar** — North of CBD
- **Mangold Park & Charlo** — South-west
- **Kamma Park & Theescombe** — Far west
- **Lovemore Heights & Sardinia Bay** — Southern coast

Zones rendered as soft coloured splotches — opacity and colour intensify with report density (green → amber → orange → red). Students set their location via a map pin-drop; zone assignment is computed server-side from polygon boundaries. No individual student data is exposed.

---

## Tech Stack

```
Runtime        Node.js 18+ (ES Modules)
Framework      Express.js 4.x
View Engine    EJS with layout partials
Database       MySQL 8.0 (mysql2/promise, connection pooling, transactions)
Auth           bcrypt + express-session (httpOnly, sameSite, 1hr expiry)
Security       CSRF tokens, ownership middleware, security headers, CSV sanitisation
Maps           Leaflet.js 1.9 + OpenStreetMap tiles (choropleth + pin-drop)
Charts         Chart.js 4.4 (doughnut + line)
Architecture   Domain-based modules (routes + controller + model per feature)
```

---

## Project Structure

```
CampusCare/
├── public/
│   ├── css/style.css          # Design system (CSS variables, dark mode, responsive)
│   └── js/                    # Client-side: sidebar, darkmode, notifications, session
├── src/
│   ├── app.js                 # Express entry point + middleware chain
│   ├── constants.js           # Frozen enums (roles, statuses, types)
│   ├── config/                # Database pool, session, security, migrations, seeders
│   ├── middleware/            # authenticate, authorize, ownership, CSRF, validation, errorHandler
│   ├── utils/                 # catchAsync, AppError, sanitize, dates
│   └── modules/
│       ├── auth/              # Login, register, logout, password reset
│       ├── profile/           # View, edit, delete account
│       ├── symptoms/          # Symptom checker, OTC recommendations, history
│       ├── appointments/      # Booking, cancellation, reschedule, nurse grid API
│       ├── availability/      # Nurse weekly schedule management
│       ├── reviews/           # Per-consultation ratings + per-nurse reviews
│       ├── trends/            # Health map, zone analytics, period filtering
│       ├── nurse/             # Nurse dashboard, Teams links, notes, bio editor
│       ├── admin/             # Reports, student/nurse CRUD, review moderation
│       ├── staff/             # "Meet Our Staff" public nurse profiles
│       ├── notifications/     # Upcoming appointment API for browser alerts
│       └── export/            # CSV downloads (appointments, trends)
├── views/
│   ├── admin/                 # Reports, student/nurse CRUD forms
│   ├── auth/                  # Login, register, forgot/reset password
│   ├── consultations/         # Booking grid, confirmation, appointments, reviews
│   ├── nurse/                 # Dashboard, availability grid, patient history, bio editor
│   ├── partials/              # Header, footer, navbar, alerts
│   ├── profile/               # View + edit profile
│   ├── staff/                 # Meet Our Staff page
│   ├── student/               # Symptom checker, recommendations, history
│   └── trends/                # Health map + analytics dashboard
├── CHANGES.md                 # Full development changelog
└── package.json
```

---

## Database Schema

The platform uses **16 tables** with full relational integrity:

| Table | Purpose |
|-------|---------|
| `Student` | Student profiles (StudentNumber PK, bcrypt password) |
| `Nurse` | Nurse staff (StaffNumber PK, bio, years experience, clinic assignment) |
| `Admin` | System administrators |
| `Appointment` | Consultation bookings with status lifecycle |
| `Rating` | Per-consultation feedback (1–5 score + description) |
| `NurseReviews` | Per-nurse written reviews (admin-moderated, anonymous public display) |
| `Symptoms` | Master symptom catalog (20 conditions, 3 tiers) |
| `Medication` | OTC medication registry (15 medications) |
| `SymptomMedication` | Many-to-many symptom ↔ medication mappings |
| `SymptomLog` | Per-student symptom check history (timestamped) |
| `NurseAvailability` | Weekly slot grid (27 slots × 5 days per nurse) |
| `CampusZone` | GPS-located campus zones (8 zones) |
| `StudentZone` | Student ↔ zone address mapping |
| `Clinic` | Campus health facilities (nurse assignment + display) |
| `PasswordResetToken` | Single-use password reset tokens with expiry |
| `sessions` | Persistent session store |

---

## Security

- All passwords hashed with **bcrypt** (10 salt rounds)
- Sessions use `httpOnly` + `sameSite: lax` cookies (1-hour expiry)
- **CSRF tokens** on every POST form (session-based, validated server-side)
- Every database query uses **parameterised placeholders** (SQL injection proof)
- All user text inputs **sanitised** against XSS (`<>` stripped)
- **Ownership middleware** prevents IDOR (students can't access other students' records)
- Role-based middleware on every protected route
- **Atomic transactions** on booking (prevents double-booking race conditions)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- Password reset tokens are single-use with 1-hour expiry
- Nurse review moderation prevents abuse (admin approval required for public display)
- No student-identifiable data exposed in health trend APIs or public reviews

---

## Team

| Member | Module |
|--------|--------|
| **Tarisai Rusike** | Authentication, Profiles & System Access |
| **Vhuthuhawe Nekhavhambe** | Symptom Checking, OTC Recommendations & Health Trends |
| **Bridgette Magampa** | Consultations, Nurse Ratings & Booking System |
| **Seth Whitfield** | Nurse Availability, Progress Tracking, Admin Reports & Tier Escalation |

---

## License

This project was developed as part of the WRRV302 module at **Nelson Mandela University**.

---

<p align="center">
  <em>Built with care for campus health.</em><br>
  <strong>CampusCare</strong> — because a month is too long to wait.
</p>
