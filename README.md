<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/EJS-Templates-B4CA65?style=for-the-badge&logo=ejs&logoColor=black" />
  <img src="https://img.shields.io/badge/MapLibre_GL-Heatmap-396CB2?style=for-the-badge&logo=maplibre&logoColor=white" />
  <img src="https://img.shields.io/badge/Chart.js-4.x-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" />
</p>

<h1 align="center">Campus Care</h1>

<p align="center">
  <strong>University Health Services Platform</strong><br>
  <em>Reducing clinic wait times from one month to one click.</em>
</p>

<p align="center">
  A three-tier healthcare web platform that relieves university clinic congestion by
  triaging student health needs by severity — built for
  <strong>Nelson Mandela University, Gqeberha</strong>.
</p>

---

## The Problem

NMU's campus clinic often requires appointments booked **a month in advance**. Students with immediate needs are left waiting, and the clinic stays overcrowded.

## The Solution — a Three-Tier Strategy

Campus Care triages student health needs *before* they reach the clinic:

| Tier | Purpose | How it works |
|:----:|---------|--------------|
| **1** | Self-care & automated support | Log symptoms, get OTC medication guidance, and see a live campus health heat map of what's going around |
| **2** | Nurse consultations | Book 15-minute physical or online **video** appointments with campus nurses; rate and review them |
| **3** | Clinical escalation | Urgent-symptom escalation with a nearest-ER locator, plus nurse scheduling and admin analytics |

---

## What each role can do

**Students** — check symptoms (multi-select, severity + duration aware), get OTC recommendations, view a personal history, explore the campus health heat map, book/cancel/reschedule consultations, join video calls, rate consultations, review nurses, and get browser reminders.

**Nurses** — manage the appointment lifecycle from a clinical dashboard, set a drag-to-paint weekly availability grid, run video consultations, write consultation notes, view patient history, and edit a public bio.

**Admins** — view operational reports with charts, moderate nurse reviews, run full CRUD on student/nurse accounts, export CSVs, and watch campus-wide health trends.

---

## The showpiece: the Campus Health Heat Map

A live, theme-matched **MapLibre GL** density heat map of symptom activity across Gqeberha:

- A soft, feathered **heat cloud** shows where reports concentrate (brand-palette gradient, quiet → outbreak).
- The whole city is divided into **gap-free Voronoi suburb zones** generated from suburb centre points — every location resolves to exactly one suburb, no gaps, no overlaps.
- **Hover anywhere** to see the suburb + report count; **click** for a symptom breakdown. No blocky boundaries — just the clean cloud.
- **Outbreak thresholds scale with the time window**, so a week and a year are judged realistically.
- **Privacy first**: only aggregated data is shown; each report's coordinates are jittered and no student is ever identifiable.

Alongside the map, the **Trends** page shows headline KPIs, a daily-volume timeline, severity and category charts, and a filterable top-conditions table.

---

## Tech Stack

```
Runtime        Node.js 18+ (native ES Modules)
Framework      Express.js 5.x
Views          EJS with layout + component partials
Database       MySQL 8.0 (mysql2/promise — pooling + transactions, TLS)
Auth           bcrypt + express-session (httpOnly, sameSite, secure in prod)
Security       Session-based CSRF, ownership middleware, security headers, parameterised SQL
Maps           MapLibre GL JS (vendored) + raster tiles (MapTiler, CARTO/OSM fallback)
Video          Daily.co (vendored client SDK, ephemeral rooms)
Charts         Chart.js 4.4
Animation      Motion One (vanilla, vendored)
Design         "Calm Clinical Glass" — liquid-glass surfaces over a breathing gradient
Architecture   Domain-based modules (routes + controller + model per feature)
```

> No frontend framework, no build step — vanilla JS + server-rendered EJS + hand-written CSS. The only client libraries are vanilla runtime ones (MapLibre GL, Chart.js, Motion One, Daily), all vendored.

---

## Project Structure

```
Campus Care/
├── public/
│   ├── css/style.css          # Design system (tokens, glass, dark mode, responsive)
│   ├── js/                    # sidebar, darkmode, notifications, map, trends-charts, motion…
│   ├── icons/                 # inline SVG icon set
│   └── vendor/                # maplibre, daily, motion (vendored client libs)
├── src/
│   ├── app.js                 # Express entry point + middleware chain
│   ├── constants.js           # Frozen enums + TREND map tuning
│   ├── config/                # db pool, session, security, migrations, seeders, DB "states"
│   ├── middleware/            # authenticate, authorize, ownership, validate, errorHandler
│   ├── utils/                 # catchAsync, AppError, sanitize, dates, daily, geo, voronoi
│   └── modules/               # auth, profile, symptoms, appointments, availability,
│                              #   reviews, trends, nurse, admin, staff, notifications, export
├── views/                     # EJS pages + partials, grouped by area
├── render.yaml                # Render deployment blueprint
├── DEPLOY.md                  # Deployment guide
├── .env.example               # Documented environment template
└── CHANGES.md                 # Full development changelog
```

---

## Running locally

1. **Install**: `npm install`
2. **Configure**: copy `.env.example` → `.env` and fill in the values (see the file for each variable). A managed MySQL (e.g. Aiven free tier) works out of the box.
3. **Set up the database** (idempotent): `npm run setup` — runs migrations + seeds symptoms + seeds zones.
4. **Optional demo data**: `npm run state:showcase` (rich data) or `npm run state:outbreak` (simulated spike).
5. **Start**: `npm start` → http://localhost:3000

---

## Deployment

Campus Care is ready for a free Render deploy — see **[DEPLOY.md](./DEPLOY.md)** for the full step-by-step.

- `render.yaml` describes the web service; set secrets in Render's dashboard (never in the repo).
- The DB SSL certificate is passed via the `DB_CA_CERT` env var (no file needed on the host).
- The app uses the host-injected `PORT` and enables `trust proxy` for secure cookies in production.
- `.env` and `*.pem` are gitignored and are not committed — keep it that way.

---

## Security

- **bcrypt** password hashing (10 rounds); sessions use `httpOnly` + `sameSite` cookies, `secure` in production.
- **CSRF tokens** on every form; **parameterised SQL** everywhere; user input **sanitised** against XSS.
- **Ownership middleware** blocks IDOR; **role-based** access control on every protected route.
- **Atomic booking transaction** prevents double-booking race conditions.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Health-map data is aggregated and jittered — no individual student data is exposed.

---

## Team

| Member | Module |
|--------|--------|
| **Tarisai Rusike** | Authentication, Profiles & System Access |
| **Vhuthuhawe Nekhavhambe** | Symptom Checking, OTC Recommendations & Health Trends |
| **Bridgette Magampa** | Consultations, Nurse Ratings & Booking System |
| **Seth Whitfield** | Nurse Availability, Progress Tracking, Admin Reports, Architecture, Security & UI System |

---

## License

Developed for the WRRV302 module at **Nelson Mandela University**.

---

<p align="center">
  <em>Built with care for campus health.</em><br>
  <strong>Campus Care</strong> — because a month is too long to wait.
</p>
