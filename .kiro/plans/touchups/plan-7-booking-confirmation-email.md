# Touch-up Plan 7 — Consultation emails: booking confirmation + 1-hour reminder (nodemailer)

Status: **DRAFT for review** · Owner: Seth · Scope: send two student emails via **nodemailer** over
the Maileroo SMTP account now in `.env` — (1) a **booking confirmation** the moment a consultation
is booked, and (2) a **meeting reminder ~1 hour before** the consultation time (background poller).
Both share one HTML template (wording swapped by type), logo embedded via a nodemailer `cid`
attachment, single button to the site.

> Tech rules: `.kiro/steering/tech.md` — ES modules, thin controllers, models own DB, utils hold
> reusable non-HTTP helpers (`daily`, `geo`, `dates`…). The mail sender fits the **utils** layer
> as a new `src/utils/mailer.js`, mirroring how `utils/daily.js` wraps the Daily REST API.

---

## 0. Two emails, one template, shared mailer

This plan delivers **two** emails off a single parameterised template + a single `utils/mailer.js`:

| Email | When | Trigger |
|-------|------|---------|
| **Booking Confirmation** | immediately on successful booking | synchronous hook in `handleBooking` |
| **Meeting Reminder** | ~1 hour before the consultation time | a background poller (`setInterval`) that finds due appointments and sends once each |

Both use the **same** HTML template (`views/emails/consultation-email.ejs`) with a `type` flag that
swaps the heading / intro wording (see §5). Both embed the logo via `cid` and have a single button
that opens the site. The mailer, recipient derivation (§1), and logo attachment (§6) are shared.

### 0a. Booking-confirmation trigger (synchronous)

In `src/modules/appointments/appointments.controller.js` → `handleBooking`, immediately **after**
`atomicBookSlot` returns `{ success: true }` and **before** `res.redirect('/consultations/confirmed/'
+ appointmentId)`. **Non-blocking and best-effort**: a mail failure must NOT break or delay the
booking (it is already committed). Wrap in try/catch, log on failure, never throw into the response.
(Same spirit as the Phase 28 room-teardown calls that catch and log.)

### 0b. Meeting-reminder trigger (scheduled, 1 hour before)

There is **no existing cron/scheduler** in the app. Precedent: `middleware/rateLimit.js` runs a
periodic `setInterval` sweep on the long-running process — mirror that.

- Add a reminder poller (new `src/modules/notifications/reminder.scheduler.js` or a function in the
  mailer/appointments module) started once from `app.js` **after the server is listening**, guarded
  so it only runs in the main server process, not the CLI seed scripts.
- **Interval:** every ~5 minutes (`setInterval`, `.unref()` so it never holds the process open at
  shutdown — same pattern as the shutdown `setTimeout` in `app.js`).
- **Due query (model):** select Confirmed/Pending online+physical appointments whose `Time` is
  within the next 60 minutes (`Time BETWEEN NOW() AND NOW() + INTERVAL 60 MINUTE`), `Status NOT IN
  ('Cancelled','Completed')`, **and `ReminderSentAt IS NULL`** (the idempotency guard, §4a). A 5-min
  interval against a 60-min window means every due appt is caught well before its slot.
- For each due appt: send the reminder (best-effort try/catch per row so one failure doesn't stop
  the batch), then **stamp `ReminderSentAt = NOW()`** so it is never resent — survives restarts and
  repeated ticks.
- Startup catch-up: because the guard is a DB column (not in-memory), a server restart naturally
  resumes — any still-due, unsent appt is picked up on the next tick.

> Timezone: the app pins SAST via `config/timezone.js`, and the DB session uses the matching fixed
> offset, so `NOW()` in SQL and `Date.now()` in Node agree. The 1-hour window math is therefore
> consistent across app and DB.

---

## 1. Recipient address derivation

Spec: `s + {student number without s} + @mandela.ac.za`.

Student numbers are stored **already prefixed with `s`** (e.g. `s999000001`). So "student number
without s" = `999000001`, re-prefixed = `s999000001`. Net result: the address is simply
**`<StudentNumber>@mandela.ac.za`** (the login flow already treats `StudentNumber@mandela.ac.za`
as the student email — see `handleLogin` stripping `@`).

Implementation: build defensively — strip a leading `s`/`S` if present, then prepend `s`, so it is
correct whether or not the stored value keeps the prefix: `` `s${studentNumber.replace(/^s/i, '')}@mandela.ac.za` ``.
`studentNumber` comes from `req.session.user.id`.

---

## 2. New dependency

- Install **nodemailer**: `npm install nodemailer` (pin exact version per tech rules — e.g. the
  current stable). Adds to `package.json` + lockfile. No other deps.

---

## 3. New env vars (already in `.env`)

```
SMTP_HOST=smtp.maileroo.com
SMTP_PORT=587
SMTP_USER=campuscare@a7d25305c49b805b.maileroo.org
SMTP_PASS=***
EMAIL_FROM="CampusCare <campuscare@a7d25305c49b805b.maileroo.org>"
```

- Port 587 ⇒ STARTTLS: nodemailer transport `secure: false` with `requireTLS: true` (587 is the
  submission/STARTTLS port; `secure:true` is only for 465). 
- **`environment.js`:** these are **optional** — a missing SMTP config must NOT fail-fast the boot
  (same policy as `DAILY_API_KEY`). The mailer detects missing config and no-ops with a warning so
  local/dev without SMTP still books fine. Do NOT add them to the required list.
- **`.env.example`:** add a documented `# ---- Email (SMTP via nodemailer) ----` block with
  placeholder values and a one-line note (optional; booking still works without it). Mirror the
  existing optional-service blocks (Daily/MapTiler).

---

## 4. New util — `src/utils/mailer.js`

A thin nodemailer wrapper, lazy-initialised (like `utils/daily.js`):

- `isMailEnabled()` → true only when `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are all set.
- A module-level transporter created once from the env (`nodemailer.createTransport({ host, port,
  secure:false, requireTLS:true, auth:{ user, pass } })`).
- One shared send function parameterised by email `type`:
  `sendConsultationEmail({ type, to, studentName, nurseName, appointmentDate, appointmentTime, actionUrl })`
  where `type ∈ { 'confirmation', 'reminder' }`.
  - If `!isMailEnabled()` → `console.warn('[Mail] SMTP not configured; skipping ' + type)` and
    return (no throw).
  - Pick the subject + wording set from `type` (§5), render the template, send via
    `transporter.sendMail({ from: EMAIL_FROM, to, subject, html, attachments:[logo cid] })`.
  - Return the send result; callers try/catch (they own non-blocking behaviour). Internally guard
    so a transport error is a rejected promise, not a throw-before-await.
- Thin convenience wrappers are optional (`sendBookingConfirmation` / `sendMeetingReminder`
  delegating to the above) — reviewer's choice; keep it DRY.
- Keep SMTP creds **server-side only** (never rendered to a view) — same rule as daily.js.

---

## 5. Email template (one file, two wordings)

Use the provided HTML **structure verbatim**, rendered with EJS. Store it as
`views/emails/consultation-email.ejs` and render via `ejs.renderFile` (EJS is already the view
engine). The template keeps the exact layout (navy header + logo, big heading, greeting, intro,
date/time rows, single button). A `type` variable drives the wording:

| Variable | Confirmation (`type='confirmation'`) | Reminder (`type='reminder'`) |
|----------|--------------------------------------|------------------------------|
| `<title>` | Booking Confirmed | Meeting Reminder |
| Heading `<h1>` | **Booking Confirmed** | **Meeting Reminder** |
| Intro line | "Your consultation with `<%= nurseName %>` has been booked." | "This is a reminder for your upcoming consultation with `<%= nurseName %>`." |
| Subject (mailer, not template) | "Your CampusCare consultation is booked" | "Reminder: your CampusCare consultation is in 1 hour" |

The heading/intro are chosen with a small `<% if (type === 'reminder') { %> … <% } else { %> … <% } %>`
in the template (or pass pre-computed `heading`/`introLine` strings from the mailer — reviewer's
choice; passing strings keeps the template logic-free, which is cleaner).

Shared variables:

| Template var | Source |
|--------------|--------|
| `logoUrl` | the `cid:` reference — `logoUrl = 'cid:campuscare_logo'` so `<img src="<%= logoUrl %>">` resolves to the attached logo |
| `studentName` | `req.session.user.name` (confirmation) / student first+last from the due-query join (reminder) |
| `nurseName` | from the appointment+nurse join → `NurseFirstName NurseLastName` (prefix "Nurse ") |
| `appointmentDate` | from `Consultation.Time` — `toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})` → "12 Feb 2026" (matches booking-grid format from plan 5) |
| `appointmentTime` | `toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})` |
| `actionUrl` | **single button → the site**: `${APP_BASE_URL}/consultations/my-appointments`. `APP_BASE_URL` is already in `.env`. Button label stays "Take me there". |

> One button only (as requested). Same destination for both email types.
> `<%= %>` autoescaping: all values are safe text (names sanitised at registration). Do not use
> `<%- %>`.

---

## 6. Logo for the `cid` attachment

**Decided: use `public/images/nmu-logo.jpg`.** Attach it with the `cid` the template expects:
```js
attachments: [{
  filename: 'nmu-logo.jpg',
  path: path.join(process.cwd(), 'public', 'images', 'nmu-logo.jpg'),
  cid: 'campuscare_logo'
}]
```
Resolve the path robustly from the project root (`process.cwd()` or `import.meta.url`), not a bare
`./public/...` that depends on CWD. The template's `<img src="<%= logoUrl %>">` with
`logoUrl='cid:campuscare_logo'` renders it inline in Gmail/Outlook. (The circular `border-radius`
in the template will crop the square NMU logo to a circle, matching the auth-screen treatment.)

---

## 4a. Idempotency column — `Consultation.ReminderSentAt`

The reminder must send **once** per appointment. Add a nullable `ReminderSentAt datetime NULL`
column to the `Consultation` table. `migrate.js` is a DROP-THEN-CREATE rebuild, so the clean way is
to add the column directly to the **`Create Consultation table`** DDL (mirrors how `PreferredLanguage`
/ `RoomName` columns live there) — no ALTER needed, idempotent across both MySQL and SQLite.

- The reminder due-query filters `ReminderSentAt IS NULL`; after a successful send, `UPDATE
  Consultation SET ReminderSentAt = NOW() WHERE AppointmentID = ?`.
- Confirmation emails do **not** use this column (they fire inline, once, at booking).
- No reseed strictly required, but after adding the column a `migrate` run is needed on each DB so
  the column exists (both local.db and Aiven — the migrate is non-destructive for data on MySQL;
  on SQLite the rebuild re-seeds — reviewer should run `migrate` and note which engine).

## 7. Wiring the two triggers

### 7a. Confirmation (controller — only change to booking logic)
In `handleBooking`, after a successful `atomicBookSlot`:
1. Nurse name: reuse `AppointmentsModel.getAppointmentWithNurse(appointmentId, studentNumber)`
   (already joins `NurseFirstName`/`NurseLastName`) — no new SQL.
2. Build `to` (§1), `studentName` (session), `nurseName`, `appointmentDate`, `appointmentTime`,
   `actionUrl`.
3. `try { await Mailer.sendConsultationEmail({ type:'confirmation', ... }); } catch (e) {
   console.error('[Mail] confirmation failed:', e.message); }` — never rethrow.
4. Existing redirect unchanged.

### 7b. Reminder (scheduler)
- New model fn `AppointmentsModel.getDueReminders()` — the due-query from §0b (parameterised).
- New model fn `AppointmentsModel.markReminderSent(appointmentId)` — the `ReminderSentAt = NOW()`
  update.
- New `src/modules/notifications/reminder.scheduler.js` exporting `startReminderScheduler()` that
  sets the `setInterval` (every ~5 min, `.unref()`), and on each tick: fetch due rows, loop,
  `sendConsultationEmail({ type:'reminder', ... })` per row (per-row try/catch), stamp sent.
- Call `startReminderScheduler()` once in `app.js` **after** `app.listen`, guarded to the server
  process (not seed CLIs). Only start it when `isMailEnabled()` so dev without SMTP doesn't spin a
  pointless timer (log a one-line note either way).

Keep controllers/scheduler thin: all nodemailer/template logic lives in `utils/mailer.js`.

**Files touched:**
- `src/modules/appointments/appointments.controller.js` — confirmation hook.
- `src/modules/appointments/appointments.model.js` — `getDueReminders`, `markReminderSent`.
- `src/config/migrate.js` — add `ReminderSentAt` to the Consultation DDL.
- `src/utils/mailer.js` — **new** (nodemailer wrapper + both sends).
- `views/emails/consultation-email.ejs` — **new** (shared template).
- `src/modules/notifications/reminder.scheduler.js` — **new** (poller).
- `src/app.js` — start the scheduler after listen.
- `src/config/environment.js` — optional-vars note (no fail-fast).
- `.env.example` — SMTP doc block.
- `package.json` / `package-lock.json` — nodemailer.

---

## 8. Security / safety notes

- SMTP creds stay in `.env` (gitignored) and are read server-side only; never pass to a view or the
  client. Do not log `SMTP_PASS`.
- The recipient is derived from the authenticated session's own student number — a student can only
  ever trigger a mail to their **own** `@mandela.ac.za` address, so this isn't an open relay / spam
  vector. No user-supplied address is emailed.
- Best-effort send: booking success is never contingent on mail delivery.
- `EMAIL_FROM` is a fixed env value, not user input — no header-injection surface. Still, don't
  interpolate any unsanitised user text into headers (subject is static; names go only in the HTML
  body, EJS-escaped).

---

## 8b. Decisions locked (from conversation)

- **Logo:** `public/images/nmu-logo.jpg`.
- **Two emails:** booking confirmation (immediate) + meeting reminder (1 hour before). Shared
  template, wording swapped by `type`.
- **Button:** single button → the site (`/consultations/my-appointments`), label "Take me there".

## 9. Verification

- `npm install nodemailer` succeeds; app still boots; `migrate` run adds `ReminderSentAt` on the
  target DB.
- **Confirmation:** with SMTP configured, book as a seeded student → booking completes + redirects
  as before, and an email arrives at `<StudentNumber>@mandela.ac.za` with heading "Booking
  Confirmed", logo inline (cid), correct student/nurse names, date ("12 Feb 2026" style) + time, and
  a working "Take me there" button to `APP_BASE_URL/consultations/my-appointments`.
- **Reminder:** create a Confirmed appointment ~1 hour out (the nurse-dashboard "demo video
  consultation" helper books ~5 min out — for a quick test, insert/adjust a row so `Time` is inside
  the next 60 min and `ReminderSentAt IS NULL`), let the scheduler tick (or lower the interval
  temporarily), and confirm exactly **one** reminder email arrives with heading "Meeting Reminder",
  and `ReminderSentAt` gets stamped so a second tick sends **nothing**. Restart the server mid-window
  and confirm it still sends once (DB guard, no double-send).
- For a safe test without a real mandela.ac.za inbox, temporarily send `to` a mailbox you control
  (or read Maileroo's logs) — **do not commit** any such test override.
- With SMTP **unset** (dev): booking still completes; `[Mail] SMTP not configured` warning logged;
  scheduler doesn't start; no user-facing error.
- Transport failure (wrong password): booking still completes; per-row reminder errors logged;
  users unaffected; a failed reminder is **not** stamped sent (so it retries next tick — confirm
  the stamp only happens on success).
- No `SMTP_PASS` value appears in logs or any rendered page.

## 10. Out of scope

- No emails for cancel/reschedule/nurse-confirm (could reuse `mailer.js` later; not in this plan).
- No change to booking logic beyond the best-effort confirmation hook.
- No external job queue — the in-process `setInterval` poller is sufficient for a single-instance
  deploy. (If the app is ever scaled to multiple instances, the poller would need a lock so only one
  instance sends; note this but don't build it now.)
- Nurse/admin notifications unchanged.
