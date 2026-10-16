<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-local_mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/EJS-Templates-B4CA65?style=for-the-badge&logo=ejs&logoColor=black" />
  <img src="https://img.shields.io/badge/MapLibre_GL-Heatmap-396CB2?style=for-the-badge&logo=maplibre&logoColor=white" />
  <img src="https://img.shields.io/badge/No_build_step-000000?style=for-the-badge" />
</p>

<h1 align="center">Campus Care</h1>

<p align="center">
  <strong>Nelson Mandela University — Health Services Platform</strong><br>
  <em>Reducing clinic wait times from one month to one click.</em>
</p>

<p align="center">
  A three-tier healthcare web platform that relieves university clinic congestion by
  triaging student health needs by severity — built for
  <strong>Nelson Mandela University, Gqeberha</strong>.
</p>

---

> ### For markers & lecturers
> This README is a **guided walkthrough** of the finished application: what it does, how it is
> built, and the engineering decisions worth noting. Jump to [Marker's quick tour](#markers-quick-tour)
> for the five-minute version, or [Engineering decisions worth noting](#engineering-decisions-worth-noting)
> for the "why" behind the design. Demo logins are in [Demo accounts](#demo-accounts).

## Contents

 [Marker's quick tour](#markers-quick-tour) 
 · [Quick start](#quick-start) 
 · [Demo accounts](#demo-accounts) 
 · [The problem & the three-tier solution](#the-problem--the-three-tier-solution) 
 · [What each role can do](#what-each-role-can-do) · [Feature walkthrough](#feature-walkthrough) 
 · [The showpiece: the health heat map](#the-showpiece-the-campus-health-heat-map) 
 · [Tech stack](#tech-stack) · [Architecture](#architecture) 
 · [Engineering decisions worth noting](#engineering-decisions-worth-noting) 
 · [Security](#security) · [Project structure](#project-structure) 
 · [Environment variables](#environment-variables) · [Database & demo data](#database--demo-data) 
 · [Troubleshooting](#troubleshooting) · [Team](#team)

---

## Marker's quick tour

A five-minute path through the headline features:

1. **Sign in** as a student (`s999000001` / `123student!`) — note the floating glass sidebar, the
   slow "breathing" gradient background, and light/dark mode (toggle, top-right).
2. **Symptom Checker** — multi-select symptoms by category, add severity + duration + trajectory.
   A mild result returns OTC guidance; a **Tier-2** result tells you to book a nurse; a **Tier-3**
   (urgent) result escalates to an **emergency nearest-hospital locator** using your browser location.
3. **Health Trends** — the showpiece. A live **MapLibre** density heat map of symptom activity across
   Gqeberha, with hover/click suburb breakdowns and scale-aware outbreak detection, beside KPI
   charts.
4. **Book a Consultation** — a stepped flow: type → nurse (with live profile card + reviews) →
   a weekly 15-minute **availability grid** → confirm. Booking sends a **confirmation email**; a
   **reminder email** goes out ~1 hour before the slot.
5. **Join a video call** — sign in as `NUR001` / `123nurse!`, use the dashboard's *Create Demo
   Video Consultation* button, then join from both sides to see the embedded **Daily.co** room.
6. **Admin** (`ADM001` / `123admin!`) — operational reports with charts + CSV export, review
   moderation, and full student/nurse CRUD.

> Tip: as a signed-in admin, the browser console exposes `CampusCare.showcase()`, `.outbreak()`,
> `.clear()`, `.naked()` to reshape the whole database in seconds for a demo.

---

## Quick start

You need **Node 22.x** (the local-database mode uses the built-in `node:sqlite`, which requires
Node ≥ 22.5).

**The `.env` file is supplied with this submission.** It is pre-configured to connect to our hosted
Aiven MySQL database, which is already seeded with the full demo dataset — so there is nothing to
fill in and no database to provision.

```bash
cd CampusCare
npm install
# place the supplied .env in the project root (next to package.json)
npm start                     # → http://localhost:3000
```

Then sign in with any of the [demo accounts](#demo-accounts) below.

> **Markers:** that is the whole setup — `npm install`, drop in the `.env`, `npm start`. The hosted
> database is already populated, so you do **not** need to run any seed or setup command.

<details>
<summary>Running against your own database instead (optional)</summary>

If you would rather not use the hosted DB, the app also runs on a **zero-setup local SQLite file**
or your **own MySQL**. Edit `.env` accordingly:

```bash
# Local SQLite — set USE_LOCAL_DB=true in .env, then:
npm run setup:local           # creates + seeds local.db (schema, symptoms, zones, showcase)
npm run start:local           # → http://localhost:3000

# Your own MySQL — set USE_LOCAL_DB=false and your DB_* values in .env, then:
npm run setup                 # schema + symptom seed + zone seed (idempotent)
npm run state:showcase        # rich demo data (students, bookings, reviews, trends)
npm start                     # → http://localhost:3000
```

`npm run setup` is safe to re-run against an empty database — already-applied steps are skipped
rather than failing.

</details>

## Demo accounts

The hosted database is already seeded with these accounts.

| Role        | Username      | Password       |
|-------------|---------------|----------------|
| **Admin**   | `ADM001`      | `123admin!`    |
| **Nurse**   | `NUR001`      | `123nurse!`    |
| **Student** | `s999000001`  | `123student!`  |

`NUR002` / `NUR003` share the nurse password; students run `s999000001` through `s999000019`, all on
the student password. You can sign in with the bare username or the full
`s999000001@mandela.ac.za` form — anything after the `@` is ignored.

> **Passwords are stored as plaintext in this build** — a deliberate simplification for marking/demo
> (see [Security](#security)).

---

## The problem & the three-tier solution

NMU's campus clinic often requires appointments booked **a month in advance**. Students with
immediate needs are left waiting, and the clinic stays overcrowded. Campus Care triages student
health needs *before* they reach the clinic:

| Tier | Purpose | How it works |
|:----:|---------|--------------|
| **1** | Self-care & automated support | Log symptoms, get OTC medication guidance, and see a live campus health heat map of what's going around |
| **2** | Nurse consultations | Book 15-minute physical or online **video** appointments with campus nurses; rate and review them |
| **3** | Clinical escalation | Urgent-symptom escalation with a nearest-ER locator, plus nurse scheduling and admin analytics |

The tiering is not just copy — the symptom engine routes a check to the right tier (OTC advice,
"book a nurse", or emergency escalation) based on symptom severity, duration and recurrence.

---

## What each role can do

**Students** — check symptoms (multi-select, severity + duration + trajectory aware), get OTC
recommendations or escalation guidance, view a personal symptom history, explore the campus health
heat map, book / cancel / reschedule consultations, join video calls, rate consultations, review
nurses, and receive email + browser reminders.

**Nurses** — manage the appointment lifecycle from a clinical dashboard, set a drag-to-paint weekly
availability grid, run video consultations, write consultation notes, view a patient's symptom
history (only for their own patients), and edit a public bio.

**Admins** — view operational reports with charts and video-attendance analytics, moderate nurse
reviews, run full CRUD on student and nurse accounts, export CSVs, and watch campus-wide trends.

Access is enforced **per route by role middleware** and **per record by ownership middleware** — a
nurse can only open a patient's history if they actually have an appointment with that patient.

---

## Feature walkthrough

**Authentication & profiles.** Single login box auto-detects the role (student → nurse → admin), so
there is no role dropdown. Registration, a token-based password-reset flow, session-timeout warning,
and a map pin-drop for the student's home location (used by the heat map).

**Symptom checker & escalation engine.** A category-grouped multi-select picker captures symptoms
plus severity, duration, trajectory and free-text "other". A rules engine (`symptoms/escalation.js`)
detects recurrence (same symptoms within 7 days) and duration-based worsening, and advances the tier
accordingly. Tier-1 → OTC guidance; Tier-2 → "book a nurse" (no medication); Tier-3 → emergency.

**Tier-3 emergency locator.** On an urgent result, the page escalates to a nearest-hospital finder:
browser Geolocation + a client-side Haversine computation against five real Nelson Mandela Bay
hospitals, with "Get Directions" into Google Maps and a campus-proximity fallback if location is
denied.

**Consultation booking.** A four-step guided flow (type → nurse → schedule → confirm). The nurse step
fetches a live profile card (bio, years' experience, star average, recent approved reviews). The
schedule step renders the nurse's weekly **15-minute slot grid** with booked/unavailable cells
locked. Booking is an **atomic transaction** (`SELECT … FOR UPDATE`) that cannot double-book.

**Email notifications (nodemailer).** On a successful booking the student gets a **confirmation
email**; a background scheduler sends a **reminder ~1 hour before** the slot. Both share one HTML
template (wording swapped by type), the logo is embedded via a `cid` attachment, and a
`ReminderSentAt` column guarantees each reminder is sent exactly once (survives restarts).

**Video consultations (Daily.co).** Online appointments get **ephemeral, private** video rooms,
created lazily when a nurse confirms. Per-user scoped tokens (nurse = owner, student = guest),
knock-to-enter lobby, a strict join window (−15 / +60 min), and a webhook that audits attendance and
duration into a `ConsultationSession` table.

**Ratings & reviews.** Per-consultation star ratings go straight in; written **nurse reviews** are
**admin-moderated** and shown anonymously ("Patient 1, 2, 3…"). Nurses see only their average, never
individual comments.

**Nurse availability.** A drag-to-paint weekly grid (15-minute sessions, 08:00–16:40) with booked
cells locked, column toggles and conflict warnings — all re-validated server-side on booking.

**Admin reports.** Chart.js dashboards (appointments over time, symptoms by category), per-nurse
performance, video-attendance metrics, review moderation queue, and CSV export (with a formula-
injection guard).

---

## The showpiece: the Campus Health Heat Map

A live, theme-matched **MapLibre GL** density heat map of symptom activity across Gqeberha:

- A soft, feathered **heat cloud** shows where reports concentrate (brand palette, quiet → outbreak).
- The city is divided into **gap-free Voronoi suburb zones** generated from suburb centre points, so
  every location resolves to exactly one suburb — no gaps, no overlaps. The tessellation is computed
  in `utils/voronoi.js` **with no geometry library** (verified: 800/800 random points → exactly one
  zone each).
- **No visible boundaries** — just the heat cloud. An invisible hit-layer catches hover/click; a
  cursor-following glass chip shows "Suburb — N reports", and a click opens a breakdown card with a
  gentle fly-to.
- **Outbreak thresholds scale sub-linearly with the time window**, so a week (~11 reports) and a year
  (~66) are judged realistically rather than every long window turning red.
- **Privacy first**: only aggregates are shown. Each report's coordinates are jittered by ~30–60 m at
  write time, and no student is ever identifiable.

Alongside the map, **Trends** shows headline KPIs, a daily-volume timeline, severity and category
doughnuts, and a filterable top-conditions table.

---

## Tech stack

```
Runtime        Node.js 22.x (native ES Modules, "type": "module")
Framework      Express.js 5.x
Views          EJS with layout + component partials (server-side rendered)
Database       MySQL 8.0 (mysql2/promise — pooling, transactions, TLS)
               — OR — local SQLite via Node's built-in node:sqlite (zero setup)
Sessions       express-session + express-mysql-session (survive restarts)
Auth           plaintext passwords (academic/demo build); httpOnly + sameSite cookies
Security       session CSRF, ownership middleware, rate limiting, parameterised SQL, security headers
Maps           MapLibre GL (heat map) + MapTiler tiles  (Leaflet retired, Phase 30G)
Video          Daily.co — ephemeral rooms, per-user scoped tokens, webhook attendance audit
Email          Nodemailer over SMTP — booking confirmation + 1-hour reminder
Charts         Chart.js 4.4
Animation      Motion One (vanilla)
Design         "Calm Clinical Glass" — liquid-glass surfaces over a breathing gradient
Architecture   Domain modules (routes + controller + model per feature)
```

**No frontend framework and no build step** — vanilla JS, server-rendered EJS, hand-written CSS.
`npm install && npm start` is the whole toolchain. The runtime dependency list is deliberately small
(Express, EJS, mysql2, the session stack, dotenv, compression, cookie-parser, nodemailer).

**Everything the browser loads is served from this origin.** MapLibre, Chart.js, the Daily SDK,
Motion One and the webfonts are all committed under `public/vendor/`. No CDN can break, slow, or
observe a page load; the app works on a locked-down network; and the Content-Security-Policy can
refuse *every* external script origin outright. The only remote requests left are map tiles and the
Daily video iframe.

---

## Architecture

Express **MVC in domain modules**, not enterprise DDD — simple, safe, readable. Each feature under
`src/modules/<feature>/` owns three files:

- `*.routes.js` — URLs + the middleware chain
- `*.controller.js` — thin HTTP handlers (validate input, call models, render). **No SQL.**
- `*.model.js` — the only files that touch the database. **Parameterised queries only**, named
  functions, no generic `rawQuery`.

Cross-cutting concerns live in `middleware/` (authenticate, authorize, ownership, validate, rate
limit, error handler), reusable non-HTTP helpers in `utils/` (`catchAsync`, `AppError`, `sanitize`,
`dates`, `daily`, `geo`, `voronoi`, `mailer`), and enum-like values in a single frozen `constants.js`.

The database layer (`config/database.js`) presents one `query()` interface over **both** MySQL and
SQLite — a small SQL adapter translates the MySQL-isms (enums, `ADD INDEX`, backtick identifiers,
`FOREIGN_KEY_CHECKS`) so the same schema and the same model code run on either engine.

---

## Engineering decisions worth noting

These are the choices a marker might find interesting, with the reasoning:

- **Dual database engine, one codebase.** `USE_LOCAL_DB` switches between managed MySQL and a local
  SQLite file (Node's built-in `node:sqlite`, no native build). Local mode auto-creates, migrates and
  seeds `local.db` on first boot — the project runs end-to-end with **zero external services**, which
  matters for offline marking.
- **Atomic booking.** `atomicBookSlot()` wraps a `SELECT … FOR UPDATE` and insert in a transaction, so
  two students racing for the same slot cannot both win. The booking grid's greying-out is only a
  hint — weekday, future-time, published-slot and nurse-availability are **all re-checked server-side**.
- **Ownership, not just roles.** Role middleware guards routes; ownership middleware guards records.
  A nurse must be *the assigned nurse* to touch an appointment or view a patient's history (closes IDOR).
- **Ephemeral video rooms.** Rooms are created only when a nurse confirms, named with opaque PHI-free
  UUIDs, scoped per user, and torn down on cancel/complete/expiry — no orphaned joinable rooms.
- **Timezone pinned by the app, not the host.** Hosts run in UTC; the app sets its own SAST timezone
  and a matching MySQL session offset (`config/timezone.js`) so appointment times, bookable days,
  expiry and trend windows behave identically on a server and on a laptop in Gqeberha.
- **Idempotent, self-healing migrations.** `migrate.js` is a drop-then-create rebuild whose steps
  report "already applied" instead of failing, so `npm run setup` is safe to re-run.
- **Everything vendored.** No CDN dependency at runtime (see [Tech stack](#tech-stack)) — a stronger
  CSP and reproducible offline behaviour.
- **Scale-aware outbreak maths & library-free Voronoi** on the heat map (see
  [the showpiece](#the-showpiece-the-campus-health-heat-map)).
- **Reminder idempotency via a DB column**, not in-memory state, so the 1-hour email survives restarts
  and never double-sends.
- **One-command database "states"** for repeatable demos (`naked` / `showcase` / `outbreak` / `clear`),
  callable from the CLI or the admin browser console.

---

## Security

> **Note for markers:** password hashing was **intentionally removed** in this build — passwords are
> stored and compared as plaintext to simplify demo/marking. This is called out honestly rather than
> hidden; a production deployment would reinstate hashing. Everything else below is real.

- **Session hardening** — `httpOnly` + `sameSite` cookies, `secure` in production, rolling one-hour
  expiry, and the **session ID is regenerated on login and registration** (closes session fixation).
- **Session CSRF** — a per-session token on every form and on admin JSON endpoints, validated
  server-side on all state-changing requests.
- **Parameterised SQL everywhere**, including dynamic `IN (?)` builders. The one place a table name is
  interpolated validates against a fixed map first.
- **Ownership middleware** blocks IDOR; **role middleware** guards every protected route, CSV exports
  included.
- **Rate limiting** on login, registration and both password-reset endpoints.
- **Server-side booking validation** + **atomic booking transaction** (double-booking proof).
- **Security headers** — a Content-Security-Policy that admits no external script/style/font origin,
  plus `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a `Permissions-Policy` that
  delegates camera/mic only to the Daily domain.
- **Heat-map privacy** — aggregated and coordinate-jittered; no individual is exposed.

### Known limitation: password reset

There is no mail server for *reset links* (the SMTP account is used for booking emails), so a reset
link is only rendered on the page in development; in production it is hidden and logged, and the form
returns a neutral message either way (no username enumeration). `ALLOW_INSECURE_PASSWORD_RESET=true`
re-enables the on-page link for a supervised demo. Wiring the existing nodemailer setup into the reset
flow is the clean fix.

---

## Project structure

```
CampusCare/
├── public/
│   ├── css/style.css          # Design system (tokens, glass, dark mode, responsive)
│   ├── js/                    # sidebar, darkmode, notifications, map, trends-charts, motion…
│   ├── icons/ images/         # inline SVG icons + NMU marks + nurse portraits
│   └── vendor/                # maplibre, chartjs, daily, motion, fonts (all committed)
├── src/
│   ├── app.js                 # Express entry point + middleware chain + reminder scheduler
│   ├── constants.js           # Frozen enums + heat-map/outbreak tuning
│   ├── config/                # timezone, db pool (MySQL+SQLite), session, security headers,
│   │   │                      #   migrations, seeders
│   │   └── states/            # one-command database "states" (naked / showcase / outbreak)
│   ├── middleware/            # authenticate, authorize, ownership, validate, rateLimit, errorHandler
│   ├── utils/                 # catchAsync, AppError, sanitize, dates, daily, geo, voronoi, mailer
│   └── modules/               # auth, profile, symptoms, appointments, availability,
│                              #   reviews, trends, nurse, admin, staff, notifications, export
├── views/                     # EJS pages + partials, grouped by area (incl. views/emails/)
├── render.yaml                # Render deployment blueprint
├── DEPLOY.md                  # Step-by-step free deployment guide
├── .env.example               # Documented environment template
└── CHANGES.md                 # Full phase-by-phase development changelog (Phases 3–30+)
```

---

## Environment variables

**These are already set in the supplied `.env`** — this table is just a reference for what each key
does. Full annotated template in [`.env.example`](.env.example).

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `USE_LOCAL_DB` | — | `true` → local SQLite (`LOCAL_DB_PATH`); `false`/omitted → MySQL below |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL mode | MySQL connection |
| `SESSION_SEED` | ✅ | Session signing secret — a long random hex string |
| `DB_CA_CERT` | Production MySQL | Managed-MySQL CA certificate (PEM). Without it the connection is encrypted but unverified; the app warns on boot |
| `NODE_ENV` | Production | `production` enables secure cookies and `trust proxy` |
| `APP_PORT` | Local only | Local dev port. Hosts inject `PORT`, which wins |
| `APP_TIMEZONE` `DB_TIMEZONE` | — | Default to `Africa/Johannesburg` / `+02:00` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` | Email only | Booking confirmation + reminder emails. Optional — booking still works without them |
| `DAILY_API_KEY` `DAILY_DOMAIN` `DAILY_WEBHOOK_SECRET` | Video only | Daily.co video consultations; `DAILY_DOMAIN` also drives the camera/mic `Permissions-Policy` |
| `MAPTILER_KEY` | Map | Map basemap tiles (MapTiler) |
| `DEMO_*_PASSWORD` | — | Override the seeded demo passwords |
| `ALLOW_INSECURE_PASSWORD_RESET` | — | Leave unset. See [Security](#security) |

---

## Database & demo data

```bash
npm run setup           # schema + migrations + symptom seed + zone seed (idempotent, MySQL)
npm run setup:local     # same, bootstrapping a local SQLite local.db
npm run migrate         # schema only
npm run seed:symptoms   # 47 symptoms, 27 medications, 66 mappings
npm run seed:zones      # 35 Voronoi suburb zones across Gqeberha
npm run db              # print the live schema (handy when debugging a query)
```

### Database "states"

One command puts the database into a known shape — ideal for demos and resets.

| Command | Result |
|---------|--------|
| `npm run state:naked` | Fresh install: 1 admin, 3 nurses, 2 clinics. Everything else empty. **Deletes all data.** |
| `npm run state:showcase` | Rich dataset: 19 students, 50 appointments, ratings, reviews, 100 symptom logs, availability |
| `npm run state:outbreak` | Layers a simulated outbreak cluster onto the map |
| `npm run state:clear` | Removes only the outbreak rows, leaving the showcase intact |

The same four are available to a signed-in admin from the browser console:
`CampusCare.showcase()`, `.outbreak()`, `.clear()`, `.naked()`.

---

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| App won't start / `Missing required environment variables` | The supplied `.env` isn't in the project root (it must sit next to `package.json`). |
| `Database connection failed` | The network is blocking the outbound connection to the hosted Aiven MySQL. Try another network, or switch to local SQLite (`USE_LOCAL_DB=true` in `.env`, then `npm run setup:local` + `npm run start:local`). |
| `node:sqlite` not found / errors | You are on Node < 22.5. This project needs Node **22.x**. |
| Map is blank | Confirm `api.maptiler.com` is reachable (not blocked by the network). |
| Confirmation/reminder email not received | The mail client is likely hiding the inline logo — click "show images". Booking always succeeds regardless of email delivery. |
| Video call never gets camera or mic | A browser permission prompt was dismissed — allow camera/mic for the site and rejoin. |

---

## Team

| Member | Module |
|--------|--------|
| **Tarisai Rusike** | Authentication, Profiles & System Access |
| **Vhuthuhawe Nekhavhambe** | Symptom Checking, OTC Recommendations & Health Trends |
| **Bridgette Magampa** | Consultations, Nurse Ratings & Booking System |
| **Seth Whitfield** | Nurse Availability, Progress Tracking, Admin Reports, Architecture, Security & UI System |

## License

Developed for the WRRV302 module at **Nelson Mandela University**.

---

<p align="center">
  <em>Built with care for campus health.</em><br>
  <strong>Campus Care</strong> — because a month is too long to wait.
</p>
