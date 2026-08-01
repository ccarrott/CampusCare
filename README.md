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
- Cancel and reschedule consultations
- Rate completed consultations (1–5 stars with comments)
- Browser notifications (24h, 1h, and start-time reminders)
- Session timeout warnings with one-click refresh

### For Nurses
- Clinical dashboard with full appointment lifecycle management
- Drag-to-paint weekly availability grid (27 slots per day)
- Patient symptom history viewer
- Consultation notes documentation
- MS Teams link management for online appointments
- Appointment status flow: Pending → Confirmed → Completed

### For Administrators
- Operational reports with Chart.js visualisations
- Full CRUD management for student and nurse accounts
- CSV export for appointments and health trend data
- Print-friendly report layouts
- Campus-wide health trend analytics

### Platform-Wide
- Auto-detect login (no role dropdown — searches Student → Nurse → Admin)
- Forgot/reset password with token-based links
- Dark mode (system preference detection + manual toggle)
- Responsive mobile layout with drawer sidebar
- Role-based access control on every endpoint
- XSS sanitisation and parameterised SQL queries throughout
- bcrypt password hashing (10 salt rounds)

---

## Campus Health Map

CampusCare maps real-time health trends across **8 NMU campus zones** using anonymised, aggregated SymptomLog data:

- **NMU South Campus (Residences)** — Lena Allen, Xanadu, Founders
- **NMU North Campus** — Academic buildings
- **Summerstrand Flats** — Hoff Street, 3rd/6th Avenue, Beach Road
- **Marine Drive Area** — Coastal housing
- **Newton Park** — Ring Road, Buffelsfontein
- **Central (Gqeberha CBD)** — Mount Road, Albany Road
- **Walmer** — Heugh Road, Main Road
- **Lorraine** — Circular Drive area

Circle markers scale by report density. Colour indicates severity: green (normal), amber (elevated), red (outbreak). No individual student data is ever exposed.

---

## Tech Stack

```
Runtime        Node.js 18+ (ES Modules)
Framework      Express.js 4.x
View Engine    EJS with layout partials
Database       MySQL 8.0 (mysql2/promise, connection pooling)
Auth           bcrypt + express-session (httpOnly, 1hr expiry)
Maps           Leaflet.js 1.9 + OpenStreetMap tiles
Charts         Chart.js 4.4 (doughnut + line)
Architecture   MVC (Models → Controllers → Routes → Views)
```

---

## Project Structure

```
CampusCare/
├── public/
│   ├── css/style.css          # Design system (CSS variables, dark mode, responsive)
│   └── js/                    # Client-side: sidebar, darkmode, notifications, session
├── src/
│   ├── app.js                 # Express entry point
│   ├── config/                # Database pool, migrations, seeders
│   ├── controllers/           # 12 controllers (auth, appointments, symptoms, trends...)
│   ├── middlewares/           # Auth guards + input validation
│   ├── models/                # 9 data access models (parameterised queries)
│   └── routes/                # 6 route modules
├── views/
│   ├── admin/                 # Reports, student/nurse CRUD forms
│   ├── auth/                  # Login, register, forgot/reset password
│   ├── consultations/         # Booking grid, confirmation, appointment list
│   ├── nurse/                 # Dashboard, availability grid, patient history
│   ├── partials/              # Header, footer, navbar, alerts
│   ├── profile/               # View + edit profile
│   ├── student/               # Symptom checker, recommendations, history
│   └── trends/                # Health map + analytics dashboard
├── .env                       # Environment variables (not committed)
├── CHANGES.md                 # Full development changelog
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0 (local or cloud — e.g. Aiven, PlanetScale, Railway)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/CampusCare.git
cd CampusCare

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials
```

### Environment Variables

```env
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASS=your-mysql-password
DB_NAME=campuscare
DB_PORT=3306
APP_PORT=3000
SESSION_SEED=your-secret-session-key
```

### Database Setup

```bash
# Run schema migrations (creates all tables + columns)
node src/config/migrate.js

# Seed base data (students, nurses, symptoms, medications, zones)
node src/config/seed.js

# Seed campus zones and student mappings
node src/config/seed-zones.js

# Seed nurse availability grid (405 records)
node src/config/seed-availability.js

# (Optional) Populate showcase data for demo dashboards
node src/config/seed-showcase.js
```

### Run

```bash
node src/app.js
# → [Server] CampusCare running live at http://localhost:3000
```

### Demo Accounts

| Role | ID | Password |
|------|----|----------|
| Student | s227921577 | password123 |
| Nurse | NUR001 | nurse123 |
| Admin | ADM001 | admin123 |

---

## Database Schema

The platform uses **12 tables** with full relational integrity:

| Table | Purpose |
|-------|---------|
| `Student` | Student profiles (StudentNumber PK, bcrypt password) |
| `Nurse` | Nurse staff (StaffNumber PK, clinic assignment) |
| `Admin` | System administrators |
| `Appointment` | Consultation bookings with status lifecycle |
| `Rating` | Student feedback (1–5 score + description) |
| `Symptoms` | Master symptom catalog (20 conditions, 3 tiers) |
| `Medication` | OTC medication registry (15 medications) |
| `SymptomMedication` | Many-to-many symptom ↔ medication mappings |
| `SymptomLog` | Per-student symptom check history (timestamped) |
| `NurseAvailability` | Weekly slot grid (27 slots × 5 days per nurse) |
| `CampusZone` | GPS-located campus zones (8 zones) |
| `StudentZone` | Student ↔ zone address mapping |

---

## Security

- All passwords hashed with **bcrypt** (10 salt rounds)
- Sessions use `httpOnly` cookies (1-hour expiry, configurable secret)
- Every database query uses **parameterised placeholders** (SQL injection proof)
- All user text inputs **sanitised** against XSS (`<>` stripped)
- Role-based middleware on every protected route
- Password reset tokens are single-use with 1-hour expiry
- No student-identifiable data exposed in health trend APIs

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

This project was developed as part of the WRRI314 / WRRI614 module at **Nelson Mandela University**.

---

<p align="center">
  <em>Built with care for campus health.</em><br>
  <strong>CampusCare</strong> — because a month is too long to wait.
</p>
