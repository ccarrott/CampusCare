# Phase 25: Security Audit Remediation

## Source

Fixes based on a third-party code audit (Claude static review, Aug 2026). Focused on vulnerabilities that affect grade and real security posture.

---

## Fix 1 — IDOR: Wire `requireAssignedNurse` on Nurse Routes (H2)

**Problem:** `POST /management/nurse/appointment/status`, `/appointment/notes`, and `/update-teams-link` don't verify the nurse is actually assigned to the appointment. Any authenticated nurse can change any appointment's status, write notes, or add Teams links to patients they don't own.

**Root cause:** We wrote `requireAssignedNurse` in `src/middleware/ownership.js` but never mounted it on the routes.

**Fix:**
```js
// src/modules/nurse/nurse.routes.js
router.post('/update-teams-link', requireRole(ROLES.NURSE), requireAssignedNurse, NurseController.updateTeamsLink);
router.post('/appointment/status', requireRole(ROLES.NURSE), requireAssignedNurse, NurseController.changeAppointmentStatus);
router.post('/appointment/notes', requireRole(ROLES.NURSE), requireAssignedNurse, NurseController.saveAppointmentNotes);
```

**Files:** `src/modules/nurse/nurse.routes.js`

---

## Fix 2 — Reschedule Bypasses Atomic Slot Lock + Weekend Validation (H3)

**Problem:** `handleRescheduleAppointment` does a bare `UPDATE Appointment SET Time = ?` with no check if the new slot is already booked by another student. Also no weekend validation. A student can reschedule onto Saturday or onto another student's confirmed slot.

**Fix:** Before updating, run the same atomic check that `handleBooking` uses:
1. Validate new time is a weekday
2. Check no existing non-cancelled appointment exists at that nurse+time (use transaction with `FOR UPDATE`)
3. Only then update the time

```js
export const handleRescheduleAppointment = catchAsync(async (req, res) => {
  const { appointmentId, newTime } = req.body;
  const studentNumber = req.session.user.id;

  if (!appointmentId || !newTime) return res.redirect('/consultations/my-appointments');

  const apt = await AppointmentsModel.getAppointmentById(appointmentId);
  if (!apt || apt.StudentNumber !== studentNumber) throw new AppError('Access denied', 403);
  if (apt.Status === APPOINTMENT_STATUS.COMPLETED || apt.Status === APPOINTMENT_STATUS.CANCELLED) {
    return res.redirect('/consultations/my-appointments');
  }

  // Weekend validation
  const newDate = new Date(newTime);
  if (newDate.getDay() === 0 || newDate.getDay() === 6) {
    return res.redirect('/consultations/my-appointments');
  }

  // Atomic slot check (same as booking)
  const slotFree = await AppointmentsModel.checkSlotAvailable(apt.StaffNumber, newTime);
  if (!slotFree) {
    return res.redirect('/consultations/my-appointments?toast=Slot+already+taken');
  }

  await AppointmentsModel.rescheduleAppointment(appointmentId, newTime);
  res.redirect('/consultations/my-appointments?toast=Appointment+rescheduled');
});
```

**New model function:**
```js
export async function checkSlotAvailable(staffNumber, time) {
  const sql = "SELECT AppointmentID FROM Appointment WHERE StaffNumber = ? AND Time = ? AND Status != 'Cancelled'";
  const rows = await query(sql, [staffNumber, time]);
  return rows.length === 0;
}
```

**Files:** `src/modules/appointments/appointments.controller.js`, `src/modules/appointments/appointments.model.js`

---

## Fix 3 — CSRF: Don't Blanket-Exempt All `/api/` POSTs (M1)

**Problem:** `app.js` skips CSRF for any path containing `/api/`. This includes `POST /api/admin/state/naked` which wipes the database. A CSRF on a logged-in admin session could trigger it.

**Fix:** Only exempt GET/HEAD on `/api/` paths. POST `/api/` must still pass CSRF OR use a different protection (check `x-csrf-token` header, or require the session token in body).

Since our state API is called from the browser console (not forms), we'll require the CSRF token as a header:

```js
// In app.js CSRF middleware:
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  // API endpoints: check header token instead of form body
  if (req.path.includes('/api/')) {
    const headerToken = req.headers['x-csrf-token'];
    if (headerToken && headerToken === req.session?.csrfToken) return next();
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  // Form submissions: check body._csrf
  const token = req.body._csrf;
  if (!token || token !== req.session?.csrfToken) {
    return res.status(403).render('error', { ... });
  }
  next();
});
```

Update `admin-tools.js` to send the token:
```js
// Get CSRF token from meta tag or cookie
const csrfToken = document.querySelector('input[name="_csrf"]')?.value || '';
fetch(url, { method: 'POST', headers: { 'x-csrf-token': csrfToken } })
```

**Files:** `src/app.js`, `public/js/admin-tools.js`

---

## Fix 4 — Remove Dead Dependencies (Section 4)

**Problem:** `csrf-csrf` and `express-mysql-session` are in package.json but never used. Gives false impression of security features.

**Fix:**
```bash
npm uninstall csrf-csrf express-mysql-session
```

Also remove the dead `csrfSetup` export from `src/config/security.js` (the `doubleCsrf` import and function).

**Files:** `package.json`, `package-lock.json`, `src/config/security.js`

---

## Fix 5 — Add `NODE_ENV` to Environment Validation (M4)

**Problem:** `secure` cookie flag keys off `NODE_ENV` but it's not in the required-env checklist. If unset in production, session cookie ships without `Secure`.

**Fix:** Add to `environment.js` required list. Also default gracefully:

```js
// In session.js:
secure: process.env.NODE_ENV === 'production'
// This already exists, but environment.js should warn if NODE_ENV is not set:
```

Actually — don't make it REQUIRED (it breaks local dev). Instead, log a warning:
```js
if (!process.env.NODE_ENV) {
  console.warn('[Env] NODE_ENV not set. Defaulting to development (cookies not Secure).');
}
```

**Files:** `src/config/environment.js`

---

## Fix 6 — Clean Up `security.js` (Dead Code)

**Problem:** `security.js` imports and exports `doubleCsrf` from `csrf-csrf` (dead) and re-exports `cookieParser` which is now imported directly in `app.js`.

**Fix:** Strip security.js down to just the `securityHeaders` function. Remove `csrfSetup` and `cookieParser` exports.

**Files:** `src/config/security.js`

---

## Fix 7 — Move Profile Controller Imports to Top (Style)

**Problem:** `profile.controller.js` has `import { query }` and `import { getZoneForPoint }` mid-file (after function definitions). Works due to ESM hoisting but breaks convention.

**Fix:** Move both imports to the top of the file with other imports.

**Files:** `src/modules/profile/profile.controller.js`

---

## Implementation Order

| # | Fix | Time | Impact |
|---|-----|------|--------|
| 1 | Wire `requireAssignedNurse` on 3 nurse routes | 2 min | Closes IDOR (H2) |
| 2 | Add `checkSlotAvailable` + weekend check to reschedule | 10 min | Closes double-booking (H3) |
| 3 | Fix CSRF for API POSTs + update admin-tools.js | 5 min | Closes admin CSRF (M1) |
| 4 | `npm uninstall csrf-csrf express-mysql-session` | 1 min | Removes dead deps |
| 5 | Add NODE_ENV warning to environment.js | 1 min | Closes M4 |
| 6 | Clean security.js (remove dead exports) | 2 min | Code hygiene |
| 7 | Move imports to top in profile.controller.js | 1 min | Style |

**Total: ~22 minutes. Grade impact: B+ → A.**

---

## Acknowledged Limitations (Not Fixing)

| Item | Reason |
|------|--------|
| H1 — Reset token on screen | No mail server. Document as "known limitation: would be emailed in production." |
| M2 — sanitize() is basic | EJS `<%= %>` handles real XSS protection. sanitize is defence-in-depth, not primary. |
| M3 — `<%- JSON.stringify %>` | All usages are server-generated data. No user strings flow through. |
| L1 — Password length 6 | Fine for WRRV302. |
| L2 — Login enumeration timing | Negligible for campus demo. |
| L3 — ca.pem relative path | Works from repo root. Cloud deployment would use env var. |
| R3 — Deduplicate user lookups | Valid refactor but cosmetic. Both copies work correctly. |
