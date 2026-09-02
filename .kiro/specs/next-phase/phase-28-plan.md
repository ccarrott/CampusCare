# Phase 28: Daily.co Video Consultations (Replacing Microsoft Teams)

## Goal

Replace the manual "nurse pastes a Microsoft Teams link" flow with **automated, secure, ephemeral Daily.co video rooms** for online consultations. The system creates a private room per online appointment, mints role-based meeting tokens (nurse = owner/host, student = guest), embeds the call directly in the CampusCare portal, and manages the room's lifecycle across confirm / reschedule / cancel / expiry — with a knock-to-enter waiting room so consecutive patients never overlap.

This is a **big-picture** change. It touches booking, the nurse dashboard, the student consultation view, notifications, admin analytics, config/secrets, the DB schema, and adds an in-portal call screen plus a webhook auditor.

---

## Design Essence (what we're really solving)

The current design has three real problems Teams never solved:

1. **Manual + fragile** — a nurse has to remember to create a Teams meeting and paste a link. If they forget, the student sees "Awaiting Link" forever. There's no nurse-side Join button at all.
2. **No privacy boundary** — a pasted Teams link is a static URL. Anyone with the link can join, and it doesn't expire when the appointment ends. Back-to-back patients could collide.
3. **No auditing** — we can't prove a consultation happened, who joined, or how long it ran. That matters for a clinic.

Daily.co ephemeral private rooms + role tokens + webhooks fix all three: rooms are created automatically, expire on their own, require a per-user JWT to enter, gate the student behind a knock/lobby, and emit events we log for attendance + duration.

**Guiding principle from the healthcare best-practices note:** no PHI in room names. Rooms are named with opaque IDs (`consult-<uuid>`), never patient names or conditions.

---

## Architecture

```
[ Student / Nurse browser ]
      │  1. Open appointment → "Join Consultation"
      ▼
[ CampusCare backend (Express) ]
      │  2. Ensure room exists (create if missing, private, exp = appt time + buffer)
      │  3. Mint meeting token for THIS user (nurse: is_owner=true, student: is_owner=false)
      ▼
[ Daily.co REST API ]  ← secret DAILY_API_KEY, server-side only
      │  4. Returns room URL + short-lived JWT
      ▼
[ In-portal call screen ]  (Daily Prebuilt iframe, @daily-co/daily-js)
      │  5. join({ url, token }) → knock/lobby → consultation
      ▼
[ Daily webhooks ] → POST /consultations/webhook/daily
      6. meeting.started / participant.joined / participant.left / meeting.ended
         → log attendance + compute duration
```

**Key rule:** the `DAILY_API_KEY` never reaches the browser. The browser only ever receives a room URL + a scoped, expiring token minted by our server.

---

## Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Room creation timing | **Lazy — on first Join, or on nurse Confirm (whichever first)** | Avoids burning rooms for appointments that get cancelled; rooms have short lifespans so creating at booking (days early) risks expiry before the appointment |
| Room privacy | `private` + `enable_knocking: true` | Student waits in lobby until nurse (owner) admits — prevents consecutive-patient overlap |
| Token roles | Nurse `is_owner: true`, Student `is_owner: false` | Nurse admits knockers, can end call; student cannot control the room |
| Recording | **Off for the base plan** (`enable_recording` omitted) | Recording clinical calls is a consent/POPIA concern; leave a clearly-marked toggle but ship OFF. Documented as opt-in only. |
| Room name | `consult-<crypto uuid>` | No PHI. Decoupled from `AppointmentID` so the room id isn't guessable from an appointment id |
| DB storage | **New columns** `RoomName`, `RoomUrl`, `RoomExp`; **retire** `TeamsID` (keep column, stop writing) | Cleaner than overloading `TeamsID`; keeps historical Teams links readable; avoids a destructive drop |
| Embedding | **Daily Prebuilt** iframe | ~10 lines, gives device pickers/chat/screenshare/grid for free; custom call object is overkill for a student clinic |
| Reschedule | Recreate/extend room exp to match new time | Ephemeral rooms expire; a rescheduled appointment needs its room window moved |
| Cancel/expire | Delete the Daily room | Don't leave orphaned rooms; also a privacy hygiene win |
| Webhook auth | Verify shared secret / HMAC header | Endpoint is public (Daily calls it); must reject spoofed events |
| SDK | `@daily-co/daily-js` (client), plain `fetch` (server) | Node 18 has global `fetch`; no server SDK needed; tech-steering bans extra frameworks |

---

## Data Model Changes

Add to `src/config/migrate.js` following the existing ALTER pattern:

```js
{ name: 'Add RoomName to Appointment',
  sql: `ALTER TABLE Appointment ADD COLUMN RoomName varchar(80) NULL` },
{ name: 'Add RoomUrl to Appointment',
  sql: `ALTER TABLE Appointment ADD COLUMN RoomUrl varchar(255) NULL` },
{ name: 'Add RoomExp to Appointment',
  sql: `ALTER TABLE Appointment ADD COLUMN RoomExp datetime NULL` },
```

New attendance/audit table (populated by webhooks):

```js
{ name: 'Create ConsultationSession table',
  sql: `CREATE TABLE IF NOT EXISTS ConsultationSession (
    SessionID varchar(50) PRIMARY KEY,
    AppointmentID varchar(50) NOT NULL,
    RoomName varchar(80) NOT NULL,
    StartedAt datetime NULL,
    EndedAt datetime NULL,
    DurationSeconds int NULL,
    NurseJoinedAt datetime NULL,
    StudentJoinedAt datetime NULL,
    CreatedAt datetime DEFAULT CURRENT_TIMESTAMP
  )` },
```

**`TeamsID` is NOT dropped** (non-destructive; preserves historical data). It simply stops being written. `AppointmentType = 'Online'` still drives the branch; we just swap what "online" means.

---

## Config / Secrets

Add to `.env` (gitignored) and to `REQUIRED_VARS` in `src/config/environment.js`:

```
DAILY_API_KEY=...            # secret REST key, server-only
DAILY_DOMAIN=campuscare      # your-subdomain.daily.co
DAILY_WEBHOOK_SECRET=...      # shared secret to verify incoming webhooks
APP_BASE_URL=https://...      # for building absolute return/redirect URLs
```

`validateEnv()` fails fast if `DAILY_API_KEY` / `DAILY_DOMAIN` are missing — same pattern as the DB vars.

New helper `src/utils/daily.js` (thin `fetch` wrapper, follows `AppError` convention):

- `createRoom({ roomName, exp })` → `POST /v1/rooms` (`privacy:'private'`, `properties:{ exp, eject_at_room_exp:true, enable_chat:true, enable_screenshare:true, enable_knocking:true }`)
- `createMeetingToken({ roomName, userName, isOwner, exp })` → `POST /v1/meeting-tokens`
- `deleteRoom(roomName)` → `DELETE /v1/rooms/:name` (ignore 404)
- `getRoom(roomName)` → `GET /v1/rooms/:name` (existence check)

All calls: `Authorization: Bearer ${DAILY_API_KEY}`, JSON, wrapped so a Daily outage surfaces a clean `AppError(502)` instead of crashing booking.

---

## Backend Flow

### Room lifecycle service — `src/modules/appointments/room.service.js` (new)

Centralises room logic so controllers stay thin:

- `ensureRoomForAppointment(appointment)` — if `RoomName` is null (or `RoomExp` is stale), create a Daily room named `consult-<uuid>`, `exp = appointmentTime + 60min buffer`, persist `RoomName/RoomUrl/RoomExp` on the appointment. Idempotent.
- `mintTokenForUser(appointment, user)` — determines `isOwner = user.role === 'Nurse'`, `userName = display name`, `exp = appointmentTime + 60min`; returns `{ url, token }`.
- `refreshRoomExpiry(appointment, newTime)` — on reschedule, delete + recreate (or extend) so the room window tracks the new time.
- `teardownRoom(appointment)` — on cancel/complete/expire, `deleteRoom` and null the columns.

### Booking — `handleBooking` (`appointments.controller.js`)

- **No room created at booking** (rooms are short-lived; booking may be days out). Store the appointment with `RoomName = null`.
- Update the Online-branch copy: "preferred language for the **video consultation**" (was "Teams meeting").
- `book.ejs` option label `Online (Microsoft Teams)` → `Online (Video Consultation)`.

### Nurse confirm — `changeAppointmentStatus` (`nurse.controller.js`)

- When transition is `Pending → Confirmed` **and** `AppointmentType === 'Online'`, call `roomService.ensureRoomForAppointment(apt)`. This means by the time a student sees "Confirmed," the room already exists. Removes the manual "Add Link" step entirely.

### The new Join endpoint — `GET /consultations/:id/join` (works for both roles)

Single guarded route (student must own it / nurse must be assigned):

1. Load appointment; verify caller is the appointment's student **or** its assigned nurse (reuse ownership middleware pattern).
2. Guard: only joinable when `AppointmentType==='Online'`, `Status==='Confirmed'`, and now is within `[apptTime - 15min, apptTime + 60min]` (no joining a week early or long after).
3. `ensureRoomForAppointment` (covers the case where a nurse Join happens before an explicit confirm, or room expired).
4. `mintTokenForUser` for the caller.
5. Render `views/consultations/call.ejs` with `{ roomUrl, token, appointment, returnUrl }`.

### Retire the manual link route

- `POST /management/nurse/update-teams-link` and `nurse.controller.updateTeamsLink` → **removed** (or kept as a hidden legacy no-op during transition). The `promptTeamsLink()` JS in `nurse/dashboard.ejs` is deleted.

### Reschedule — `handleRescheduleAppointment`

- After `rescheduleAppointment(id, newTime)`, if Online + a room already exists, call `roomService.refreshRoomExpiry(apt, newTime)`.

### Cancel / auto-expire

- `handleCancelAppointment` → after `cancelAppointment`, `roomService.teardownRoom(apt)`.
- `expirePastAppointments()` currently bulk-updates; add a companion sweep that tears down rooms for just-expired online appointments (or a lightweight cron-less cleanup on dashboard load).

---

## Webhook Auditing — `POST /consultations/webhook/daily`

New unguarded (CSRF-exempt, but secret-verified) route, mounted in `app.js`:

- Verify the shared secret / HMAC signature header; reject otherwise (401).
- Handle event types:
  - `meeting.started` → create/complete `ConsultationSession` row, set `StartedAt`.
  - `participant.joined` → set `NurseJoinedAt` / `StudentJoinedAt` by matching `user_name`.
  - `participant.left` / `meeting.ended` → set `EndedAt`, compute `DurationSeconds`.
- Map `room_name` → appointment via the `RoomName` column.
- This gives admins real attendance + duration data instead of just "an online appointment existed."

**CSRF note:** the existing app blanket-exempts `/api/`. Mount the webhook under a verified path and exempt it explicitly (it has its own secret check), the same way other machine-to-machine endpoints are handled.

---

## Frontend

### In-portal call screen — `views/consultations/call.ejs` (new)

- Full-height `#video-container`.
- Loads `@daily-co/daily-js` (npm dep, served from `public/` or CDN per project convention).
- `DailyIframe.createFrame(container, { showLeaveButton:true, iframeStyle:{...borderRadius:12px} })`.
- `callFrame.join({ url: roomUrl, token })`.
- On `left-meeting` → destroy frame, redirect: student → `/consultations/my-appointments`, nurse → `/management/nurse/dashboard` (and, for nurse, optionally straight to the notes form for that appointment).
- Themed to the Phase-28 brand palette (navy `#141c2b`, yellow `#ffcc00`).

### Student view — `views/consultations/index.ejs`

- Replace the raw Teams anchor:
  ```
  Online && TeamsID && Confirmed → <a href="TeamsID">Join</a>
  ```
  with a portal link:
  ```
  Online && Confirmed && withinJoinWindow → <a href="/consultations/{id}/join">Join Consultation</a>
  Online && Confirmed && !withinWindow    → <span>Join opens 15 min before</span>
  Online && !Confirmed                     → <span>Awaiting nurse confirmation</span>
  ```

### Nurse dashboard — `views/nurse/dashboard.ejs`

- **Delete** the "Add Link" button + `promptTeamsLink()` script.
- **Add** a nurse **Join Consultation** button for Online + Confirmed rows (the gap identified in analysis — nurses currently have no join path), linking to `/consultations/:id/join` (nurse mints an owner token).
- Show a small "Room ready ✓ / Room pending" indicator driven by `RoomName != null`.

### Confirmation page — `views/consultations/confirmed.ejs`

- Online copy changes from "Your nurse will share the Teams link" to "This is a secure video consultation. A Join button appears here and in My Appointments 15 minutes before your slot."

### Notifications — `public/js/notifications.js` + `notifications.controller.js`

- The upcoming API already returns `teamsId`; swap it to return `roomReady` + a `joinUrl` (`/consultations/:id/join`) for Online/Confirmed appointments.
- In `processAppointment`, for the 15/5/1-min triggers on an Online appointment, make the browser notification **actionable**: clicking it opens the join URL (`notification.onclick = () => window.open(joinUrl)`). Right now the notification is text-only — this closes that gap.
- `typeLabel` `'Online (Teams)'` → `'Online (Video)'`.

---

## Admin Side (analytics upgrade)

Admin never managed Teams links and won't manage rooms either — but Daily gives us data admin *should* see:

- **Reports page:** add "Online consultations completed," "Avg consultation duration" (from `ConsultationSession.DurationSeconds`), and a "no-show" count (Confirmed online appt whose room had a nurse join but no student join, or neither).
- **CSV export** (`exportAppointmentsCSV`): add columns `Duration` and `Attendance` (Both / Nurse-only / Student-only / No-show) sourced from `ConsultationSession`.
- No admin approval step for rooms (rooms are auto-created and self-expiring; nothing to approve).

---

## Security Checklist

- `DAILY_API_KEY` server-side only; never rendered into any EJS/JS.
- Tokens are short-lived (`exp` = appt end + buffer) and per-user; a leaked token dies quickly and can't control the room unless owner.
- Join route enforces ownership (student owns / nurse assigned) **and** a time window — no joining arbitrary appointments or far-future rooms.
- Room names are opaque UUIDs — no PHI, not derivable from `AppointmentID`.
- Webhook endpoint verifies a shared secret before trusting any event.
- Reschedule now correctly refreshes room expiry (fixes the analysis finding that reschedule left stale links).
- Private rooms + knocking = enforced lobby; consecutive patients can't collide.

---

## Task Breakdown

1. **Config**: add Daily vars to `.env` + `environment.js` `REQUIRED_VARS`; write `src/utils/daily.js` (`createRoom`, `createMeetingToken`, `deleteRoom`, `getRoom`).
2. **Schema**: add `RoomName`/`RoomUrl`/`RoomExp` ALTERs + `ConsultationSession` table to `migrate.js`; run migrate.
3. **Service**: `src/modules/appointments/room.service.js` (`ensureRoom`, `mintToken`, `refreshRoomExpiry`, `teardownRoom`) + model queries for the new columns/table.
4. **Booking**: update `handleBooking` copy + `book.ejs` label (no room at booking).
5. **Confirm**: `changeAppointmentStatus` auto-creates room on `Pending→Confirmed` for Online.
6. **Join route**: `GET /consultations/:id/join` + ownership/time-window guard + `views/consultations/call.ejs`.
7. **Nurse dashboard**: remove Add-Link/`promptTeamsLink`; add nurse Join button + room-ready indicator.
8. **Student view**: swap Teams anchor for portal Join link with window states.
9. **Reschedule/cancel/expire**: wire `refreshRoomExpiry` / `teardownRoom`.
10. **Webhook**: `POST /consultations/webhook/daily` + secret verification + `ConsultationSession` writes.
11. **Notifications**: return `joinUrl`/`roomReady`; make reminders clickable to join.
12. **Admin**: duration/attendance/no-show in reports + CSV.
13. **Retire Teams**: remove `update-teams-link` route/controller; stop writing `TeamsID`; update `views/index.ejs` and `confirmed.ejs` copy.
14. **Client dep**: add `@daily-co/daily-js`.

---

## Verification

- **Booking**: book an Online appointment → no room yet, `RoomName` null, confirmation copy correct.
- **Confirm**: nurse confirms → room auto-created, `RoomName/RoomUrl/RoomExp` populated, student sees "Join opens 15 min before."
- **Join window**: Join link inert until 15 min before; within window both roles reach `call.ejs`.
- **Roles**: nurse joins as owner (can admit knock), student knocks and waits until admitted.
- **Reschedule**: move the time → `RoomExp` tracks the new time.
- **Cancel/expire**: room deleted (Daily `getRoom` → 404), columns nulled.
- **Webhook**: simulate `meeting.started`/`participant.joined`/`meeting.ended` → `ConsultationSession` row has start/end/duration and per-role join times.
- **Notifications**: 15/5/1-min reminder for an Online appt is clickable → opens the join screen.
- **Admin**: reports/CSV show duration + attendance.
- **Security**: confirm `DAILY_API_KEY` never appears in page source or client JS; forged webhook (bad secret) is rejected; Join on someone else's appointment → 403.
- **Regression**: Physical appointments unchanged; historical `TeamsID` values still render for old records if surfaced anywhere.

---

## Out of Scope (documented, not built)

- Cloud recording (consent/POPIA — left as an OFF, opt-in toggle only).
- Custom call-object UI (Prebuilt is sufficient for a student clinic).
- Group/multi-party consultations (1 nurse + 1 student model retained).
- Backfilling rooms for pre-Phase-28 historical appointments.
