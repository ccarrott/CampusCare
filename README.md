<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/EJS-Templates-B4CA65?style=for-the-badge&logo=ejs&logoColor=black" />
  <img src="https://img.shields.io/badge/MapLibre_GL-Heatmap-396CB2?style=for-the-badge&logo=maplibre&logoColor=white" />
  <img src="https://img.shields.io/badge/No_build_step-000000?style=for-the-badge" />
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

## Contents

[Quick start](#quick-start) · [Demo accounts](#demo-accounts) · [The problem](#the-problem) ·
[What each role can do](#what-each-role-can-do) · [The heat map](#the-showpiece-the-campus-health-heat-map) ·
[Tech stack](#tech-stack) · [Project structure](#project-structure) ·
[Environment variables](#environment-variables) · [Database & demo data](#database--demo-data) ·
[Deployment](#deployment) · [Security](#security) · [Privacy & demo data](#privacy--demo-data) ·
[Troubleshooting](#troubleshooting) · [Team](#team)

---

## Quick start

You need **Node 18+** and a **MySQL 8** database. A free managed instance (Aiven, PlanetScale,
Railway) works out of the box — so does a local MySQL.

```bash
git clone https://github.com/ccarrott/CampusCare.git
cd CampusCare
npm install

cp .env.example .env          # then fill in your DB_* values
npm run setup                 # creates the schema and seeds symptoms + map zones
npm run state:showcase        # optional: rich demo data (students, bookings, reviews, trends)

npm start                     # → http://localhost:3000
```

`npm run setup` works against a **completely empty database** and is safe to re-run —
already-applied steps report `[SKIP]` rather than failing.

## Demo accounts

Created by `npm run state:naked` and `npm run state:showcase`.

| Role        | Username      | Password       |
|-------------|---------------|----------------|
| **Admin**   | `ADM001`      | `123admin!`    |
| **Nurse**   | `NUR001`      | `123nurse!`    |
| **Student** | `s999000001`  | `123student!`  |

`NUR002` / `NUR003` share the nurse password; showcase students run `s999000001` through
`s999000019`. You can sign in with the bare username or with the full
`s999000001@mandela.ac.za` form — anything after the `@` is ignored.

> These passwords are in a public repository, so treat them as public. Override them with
> `DEMO_ADMIN_PASSWORD` / `DEMO_NURSE_PASSWORD` / `DEMO_STUDENT_PASSWORD` and re-run
> `npm run state:naked` before pointing anyone at a deployed instance.

---

## The problem

NMU's campus clinic often requires appointments booked **a month in advance**. Students with
immediate needs are left waiting, and the clinic stays overcrowded.

## The solution — a three-tier strategy

Campus Care triages student health needs *before* they reach the clinic:

| Tier | Purpose | How it works |
|:----:|---------|--------------|
| **1** | Self-care & automated support | Log symptoms, get OTC medication guidance, and see a live campus health heat map of what's going around |
| **2** | Nurse consultations | Book 15-minute physical or online **video** appointments with campus nurses; rate and review them |
| **3** | Clinical escalation | Urgent-symptom escalation with a nearest-ER locator, plus nurse scheduling and admin analytics |

---

## What each role can do

**Students** — check symptoms (multi-select, severity + duration aware), get OTC
recommendations, view a personal history, explore the campus health heat map, book / cancel
consultations, join video calls, rate consultations, review nurses, and get browser reminders.

**Nurses** — manage the appointment lifecycle from a clinical dashboard, set a drag-to-paint
weekly availability grid, run video consultations, write consultation notes, view patient
history, and edit a public bio.

**Admins** — view operational reports with charts, moderate nurse reviews, run full CRUD on
student and nurse accounts, export CSVs, and watch campus-wide health trends.

Access is enforced per route by role middleware, and per record by ownership middleware — a
nurse can only open a patient's history if they actually have an appointment with them.

---

## The showpiece: the Campus Health Heat Map

A live, theme-matched **MapLibre GL** density heat map of symptom activity across Gqeberha:

- A soft, feathered **heat cloud** shows where reports concentrate (brand palette, quiet → outbreak).
- The city is divided into **gap-free Voronoi suburb zones** generated from suburb centre
  points, so every location resolves to exactly one suburb — no gaps, no overlaps. The
  tessellation is computed in `utils/voronoi.js` with no geometry library.
- **Hover anywhere** for the suburb and report count; **click** for a symptom breakdown.
- **Outbreak thresholds scale sub-linearly with the time window**, so a week and a year are
  judged realistically rather than every long window turning red.
- **Privacy first**: only aggregates are shown. Each report's coordinates are jittered by
  ~30–60 m at write time and no student is ever identifiable.

Alongside the map, **Trends** shows headline KPIs, a daily-volume timeline, severity and
category charts, and a filterable top-conditions table.

---

## Tech stack

```
Runtime        Node.js 18+ (native ES Modules)
Framework      Express.js 5.x
Views          EJS with layout + component partials
Database       MySQL 8.0 (mysql2/promise — pooling, transactions, TLS)
Sessions       express-session + express-mysql-session (survive restarts)
Auth           bcrypt (10 rounds); httpOnly + sameSite cookies, secure in production
Security       CSP, session CSRF, ownership middleware, rate limiting, parameterised SQL
Maps           MapLibre GL (heat map) + Leaflet (pin-drop) + MapTiler / CARTO-OSM tiles
Video          Daily.co — ephemeral rooms, per-user scoped tokens
Charts         Chart.js 4.4
Animation      Motion One
Design         "Calm Clinical Glass" — liquid-glass surfaces over a breathing gradient
Architecture   Domain modules (routes + controller + model per feature)
```

**No frontend framework and no build step** — vanilla JS, server-rendered EJS, hand-written
CSS. `npm install && npm start` is the whole toolchain.

**Everything the browser loads is served from this origin.** MapLibre, Leaflet, Chart.js, the
Daily SDK, Motion One and the webfonts are all committed under `public/vendor/`
(see [its README](public/vendor/README.md) for versions and how to refresh them). No CDN can
break, slow, or observe a page load, the app works on a locked-down network, and the
Content-Security-Policy can therefore refuse *every* external script origin outright. The only
remote requests left are map tiles and the Daily video iframe.

---

## Project structure

```
CampusCare/
├── public/
│   ├── css/style.css          # Design system (tokens, glass, dark mode, responsive)
│   ├── js/                    # sidebar, darkmode, notifications, map, trends-charts, motion…
│   ├── icons/                 # inline SVG icon set
│   ├── images/                # NMU marks + nurse portraits
│   └── vendor/                # maplibre, leaflet, chartjs, daily, motion, fonts
├── src/
│   ├── app.js                 # Express entry point + middleware chain
│   ├── constants.js           # Frozen enums + heat-map tuning
│   ├── config/                # timezone, db pool, session, security headers,
│   │   │                      #   migrations, seeders
│   │   └── states/            # one-command database "states" (naked / showcase / outbreak)
│   ├── middleware/            # authenticate, authorize, ownership, validate,
│   │                          #   rateLimit, errorHandler
│   ├── utils/                 # catchAsync, AppError, sanitize, dates, daily, geo, voronoi
│   └── modules/               # auth, profile, symptoms, appointments, availability,
│                              #   reviews, trends, nurse, admin, staff, notifications, export
├── views/                     # EJS pages + partials, grouped by area
├── render.yaml                # Render deployment blueprint
├── DEPLOY.md                  # Step-by-step free deployment guide
├── .env.example               # Documented environment template
└── CHANGES.md                 # Full development changelog
```

Each module owns three files — `*.routes.js` (URLs and middleware), `*.controller.js`
(request handling), `*.model.js` (SQL). Controllers never write SQL; models never touch
`req`/`res`.

---

## Environment variables

Full annotated list in [`.env.example`](.env.example). The essentials:

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | ✅ | MySQL connection |
| `SESSION_SEED` | ✅ | Session signing secret — a long random hex string |
| `DB_CA_CERT` | Production | Managed-MySQL CA certificate (PEM). Without it the connection is encrypted but **unverified**, and the app warns on boot |
| `NODE_ENV` | Production | `production` enables secure cookies and `trust proxy` |
| `APP_PORT` | Local only | Local dev port. Hosts inject `PORT`, which wins |
| `APP_TIMEZONE` `DB_TIMEZONE` | — | Default to `Africa/Johannesburg` / `+02:00`. See [Deployment](#deployment) |
| `DAILY_API_KEY` `DAILY_DOMAIN` `DAILY_WEBHOOK_SECRET` | Video only | Daily.co video consultations. `DAILY_DOMAIN` also drives the camera/mic `Permissions-Policy` and the CSP frame origin |
| `MAPTILER_KEY` | — | Nicer map tiles. Without it the map falls back to free CARTO/OSM tiles |
| `DEMO_*_PASSWORD` | — | Override the seeded demo passwords |
| `ALLOW_INSECURE_PASSWORD_RESET` | — | Leave unset. See [Security](#security) |

---

## Database & demo data

```bash
npm run setup           # schema + migrations + symptom seed + zone seed (idempotent)
npm run migrate         # schema only
npm run seed:symptoms   # 48 symptoms, 27 medications, 66 mappings
npm run seed:zones      # 35 Voronoi suburb zones across Gqeberha
npm run db              # print the live schema (handy when debugging a query)
```

### Database "states"

One command puts the database into a known shape — useful for demos and for resetting after
you have clicked around.

| Command | Result |
|---------|--------|
| `npm run state:naked` | Fresh install: 1 admin, 3 nurses, 2 clinics. Everything else empty. **Deletes all data.** |
| `npm run state:showcase` | Rich dataset: 19 students, 50 appointments, ratings, reviews, 100 symptom logs, availability |
| `npm run state:outbreak` | Layers a simulated outbreak cluster onto the map |
| `npm run state:clear` | Removes only the outbreak rows, leaving the showcase intact |

The same four are available to a signed-in admin from the browser console:
`CampusCare.showcase()`, `.outbreak()`, `.clear()`, `.naked()`.

---

## Deployment

Campus Care runs on a free Render web service — **[DEPLOY.md](./DEPLOY.md)** has the full
walkthrough. Highlights:

- `render.yaml` describes the service; secrets go in the dashboard, never in the repo.
- The database CA is passed as `DB_CA_CERT`, so no file is needed on the host.
- Health check is `/healthz` — a plain 200 with no database or session work.
- `SIGTERM` is handled: the server stops accepting connections and drains the pool.
- **Timezone is pinned by the app, not the host.** Hosting containers run in UTC; Campus Care
  reasons in South African local time everywhere. `src/config/timezone.js` sets the Node
  process timezone and the MySQL session offset from `APP_TIMEZONE` / `DB_TIMEZONE`, so
  appointment times, bookable days, expiry and trend windows behave on the deployed app
  exactly as they do on a machine in Gqeberha. (SAST has no daylight saving, which is why a
  fixed `+02:00` offset is safe.)
- Sessions live in MySQL, so a free-tier cold start does not sign everyone out.

---

## Security

- **bcrypt** password hashing (10 rounds). Sessions use `httpOnly` + `sameSite` cookies,
  `secure` in production, with a rolling one-hour expiry.
- **Session ID regenerated on login and registration** — closes session fixation.
- **Rate limiting** on login, registration and both password-reset endpoints.
- **CSRF tokens** on every form and on the admin JSON endpoints.
- **Parameterised SQL** everywhere, including the dynamic `IN (?)` builders. The one place a
  table name is interpolated validates against a fixed map first.
- **Ownership middleware** blocks IDOR; **role middleware** guards every protected route,
  CSV exports included.
- **Server-side booking validation** — weekday, future, published slot and nurse availability
  are all re-checked on the server, not merely greyed out in the grid.
- **Atomic booking transaction** (`SELECT … FOR UPDATE`) prevents double-booking races.
- **Content-Security-Policy** that admits no external script, style or font origin, plus
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and a `Permissions-Policy`
  that delegates camera/mic only to your Daily domain.
- Heat-map data is aggregated and coordinate-jittered — no individual is exposed.

### Known limitation: password reset

There is no mail server, so a reset link cannot be emailed — it can only be rendered on the
page, which would let anyone who knows a username take over that account. So:

- In development the link is shown, for convenience.
- In production it is **hidden** and written to the server log instead, and the form returns
  the same neutral message whether or not the account exists (no username enumeration).
- Set `ALLOW_INSECURE_PASSWORD_RESET=true` only for a supervised live demo, and unset it after.

Wiring up a real mail provider is the proper fix and would remove the flag entirely.

---

## Privacy & demo data

**Everything in the seed data is fictional.** Students, their names, their medical histories
and their pinned locations are all invented. Student numbers use the `s999…` block on purpose:
real NMU numbers begin with the enrolment year (`s22…`, `s23…`), so nothing in this repository
can collide with an actual person's number.

If you extend the demo data, keep it that way. A real name beside a real student number and a
medical condition is health data about an identifiable person, whether or not the condition is
made up — and this repository is public.

Two things worth knowing:

- **Nurse portraits** (`public/images/nurses/`) are photographs of real people used to
  represent fictional nurses, complete with invented experience and patient reviews. Many
  stock licences specifically prohibit portraying a model in a medical or otherwise sensitive
  context. Confirm the licence covers this use, or delete the files — the staff pages already
  fall back to clean initials avatars, so nothing breaks.
- **Clinic contact details** in the seed data are NMU Student Health's genuine published phone
  numbers and address. That is deliberate and appropriate for a campus health app, but it does
  mean a demo user could actually call the clinic.

---

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| `[FATAL] Missing required environment variables` | Copy `.env.example` to `.env` and fill in the `DB_*` values and `SESSION_SEED`. |
| `[FATAL] Database connection failed` | Wrong `DB_*` values, or the host's IP allow-list is blocking you. Check the message under it for the driver's own error. |
| `Server does not support secure connection` | Your MySQL has TLS disabled. Managed providers all support it; a bare local install may not — enable TLS on the server, or use a managed instance. |
| Every migration fails with "table doesn't exist" | You are on a build from before the base schema was added. Pull the latest and re-run `npm run setup`. |
| Times are two hours out on the deployed app | `APP_TIMEZONE` / `DB_TIMEZONE` are being overridden. Unset them to take the SAST defaults. |
| Map is blank | Check the browser console. Without `MAPTILER_KEY` the map falls back to CARTO/OSM tiles, which is expected; a blank canvas usually means the tile host is blocked. |
| Video call never gets camera or mic | `DAILY_DOMAIN` does not match the subdomain your rooms are created on, so `Permissions-Policy` is delegating to the wrong origin. |
| Signed out on every page load in production | The session cookie is `secure`, so the browser drops it over plain HTTP. Deploy behind HTTPS (Render does this for you). |

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
