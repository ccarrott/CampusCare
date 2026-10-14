# Phase 19: Review System, Appointment Table Normalisation & UX Polish

## Overview

This phase combines the nurse review/moderation system with a full normalisation pass on appointment tables, action buttons, and lifecycle logic across both student and nurse views. It also addresses dark mode issues, dashboard text cleanup, and stale data handling.

**Two pillars:**
1. Clean up the current appointment experience so it's consistent, bug-free, and professional
2. Build the moderated review system, "Meet Our Staff" page, and nurse profile integration

---

## Part A: Appointment Table Normalisation (Student + Nurse)

### A1 — Unified Action Button Rules (Student Side)

Every appointment row shows exactly the buttons it should — no more, no less:

| Status | Appointment Type | Buttons Shown |
|--------|-----------------|---------------|
| Pending | Physical | Cancel |
| Pending | Online | Cancel, ~~Join~~ (disabled/greyed "Awaiting Link") |
| Confirmed | Physical | Cancel |
| Confirmed | Online + no link | Cancel, "Awaiting Link" (greyed, non-interactive) |
| Confirmed | Online + has link | Cancel, Join (active, opens Teams) |
| Completed | Any (unrated) | Rate |
| Completed | Any (already rated) | *(no buttons — show "Rated ✓" badge)* |
| Cancelled | Any | *(no buttons — row greyed out)* |

**Key fixes:**
- "Join" button only appears when `TeamsID` exists AND status is Confirmed — never Pending
- "Rate" button ONLY on Completed rows where `ratedIds` doesn't include the appointment
- Remove the old "Pending" grey button for online appointments without links — replace with a clear "Awaiting Link" text badge (not clickable)
- Cancelled rows get `opacity: 0.6` styling on the entire `<tr>`
- Rated completed rows show a small "✓ Rated" badge instead of a button

### A2 — Unified Action Button Rules (Nurse Side)

| Status | Buttons Shown |
|--------|---------------|
| Pending | Confirm, Cancel |
| Confirmed | Complete, Cancel, (Teams Link btn if Online + no link) |
| Completed | *(no action buttons)* |
| Cancelled | *(no action buttons, row greyed)* |

**Key fixes:**
- Remove "Join" button from nurse side for Online appointments — nurses create the link, they don't join via button
- "Link" button only shows for Confirmed Online appointments that don't yet have a TeamsID
- No action buttons on Completed or Cancelled rows
- Cancelled rows greyed (`opacity: 0.6`)

### A3 — Button Styling Standardisation

All action buttons across both tables use the same CSS classes, sizes, and colours:

| Action | CSS Class | Colour |
|--------|-----------|--------|
| Confirm | `.action-btn-confirm` | Gold (accent) |
| Complete | `.action-btn-complete` | Green (success) |
| Cancel | `.action-btn-cancel` | Red (danger) |
| Join (Teams) | `.action-btn-teams` | Purple (#5b5fc7) |
| Rate | `.action-btn-rate` | Green (success) |
| Link (add Teams) | `.action-btn-teams` | Purple |
| Awaiting Link | `.action-btn-disabled` | Grey, no cursor, non-interactive |
| Rated ✓ | `.status-badge status-completed` | Green badge (same as Completed badge style) |

All buttons: same `height: 32px`, `min-width: 80px`, `font-size: 0.78rem`, `border-radius: 6px`.

### A4 — Auto-Expire Past Appointments

**Problem:** Appointments with dates in the past still show as "Pending" or "Confirmed" — they should auto-transition.

**Fix:** Add a query that runs on page load (in the controller, before rendering):

```js
// In appointments.controller.js (showStudentAppointments) and nurse.controller.js (showNurseDashboard):
await AppointmentsModel.expirePastAppointments();
```

```sql
-- New model function: expirePastAppointments()
UPDATE Appointment 
SET Status = 'Cancelled' 
WHERE Time < NOW() 
  AND Status IN ('Pending', 'Confirmed')
```

This silently cleans up stale appointments every time either dashboard loads. Past-date slots that were "Confirmed" but never "Completed" get auto-cancelled (nurse didn't mark them done).

**Note:** This also frees up availability slots that were held by stale bookings — fixing the "nurses still showed booked when they aren't" issue.

### A5 — Availability Data Freshness

**Problem:** Booked slots from old test data with wrong dates persist in the availability grid.

**Fix:** The `getBookedTimesForNurse` and `getBookedAppointmentsForDate` queries already filter by date. The real issue is appointments with past dates still having `Status != 'Cancelled'`. Once A4's auto-expire runs, these slots are freed because the query excludes cancelled appointments:

```sql
WHERE StaffNumber = ? AND DATE(Time) = ? AND Status != 'Cancelled'
```

No additional fix needed beyond A4.

### A6 — Remove Bridget's Post-Booking Review Redirect

**Problem:** After booking, the app redirects to `/consultations/review/:id` which asks to review a nurse you haven't even SEEN yet (appointment is Pending). This makes no sense.

**Fix:** 
- Change booking redirect from `/consultations/review/:id` to `/consultations/confirmed/:id` (the confirmation page)
- Remove the "Review Your Nurse" page from the post-booking flow entirely
- Reviews happen ONLY after a consultation is Completed, via the Rate button in the appointment table
- Keep the `views/consultations/review.ejs` for potential future use in Phase 19's modal system, but don't route to it from booking

---

## Part B: Dashboard & Dark Mode Fixes

### B1 — Remove Tier Text from Dashboard Cards

Change the two student dashboard cards:
- "Tier 1: Symptom Checker" → "Symptom Checker"
- "Tier 2: Book Consultation" → "Book Consultation"

Keep descriptions as-is.

### B2 — Pie Chart Legend Dark Mode Fix

**Problem:** Chart.js legend text colour is unreadable in dark mode.

**Fix:** In `views/trends/dashboard.ejs`, when initialising Chart.js doughnut, set:

```js
plugins: {
  legend: {
    labels: {
      color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#0f172a'
    }
  }
}
```

Also listen for theme toggle changes and update the chart:
```js
// In the darkmode toggle handler, after setting data-theme:
if (window.pieChart) {
  window.pieChart.options.plugins.legend.labels.color = isDark ? '#f1f5f9' : '#0f172a';
  window.pieChart.update();
}
```

### B3 — Admin Reports Line Chart Legend (Same Fix)

Apply the same dark mode legend colour fix to the admin reports line chart.

---

## Part C: Rating & Review System (Moderated)

### C1 — Database Schema Changes

```sql
ALTER TABLE Nurse ADD COLUMN Bio TEXT DEFAULT NULL;
ALTER TABLE Nurse ADD COLUMN YearsExperience INT DEFAULT 0;
ALTER TABLE Rating ADD COLUMN Verified ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending';
ALTER TABLE Rating ADD COLUMN VerifiedAt DATETIME DEFAULT NULL;
```

Add to `src/config/migrate.js`.

### C2 — Reviews Model Expansion (`src/modules/reviews/reviews.model.js`)

Add these functions:

| Function | Purpose |
|----------|---------|
| `getAverageRatingForNurse(staffNumber)` | `{ average, count }` from ALL ratings (nurse self-view) |
| `getVerifiedAverageForNurse(staffNumber)` | `{ average, count }` from Approved only (student-facing) |
| `getVerifiedRatingsForNurse(staffNumber)` | Individual approved ratings (for Meet Our Staff + booking) |
| `getAllNurseAverages()` | All nurses with their averages (admin panel) |
| `getPendingRatings()` | All Pending ratings (admin moderation queue) |
| `updateRatingVerification(ratingId, status)` | Sets Verified + VerifiedAt |

### C3 — Star Rating CSS Component

**Interactive widget** (for submission forms):
- 5 Unicode stars, hover fills left-to-right in gold
- Click locks selection, stores value in hidden input
- Works in both light and dark mode

**Static read-only variant** (for display):
- Renders N filled + (5-N) empty stars from a numeric score
- CSS class: `.star-rating-static`

Add to `public/css/style.css`.

### C4 — Rating Modal (Replaces Current Rate Section)

**Student appointment table → Rate button → opens modal overlay:**

- Modal pops up centred with backdrop
- Pre-filled: nurse name + appointment date (from row data attributes)
- Interactive star rating widget
- Comments textarea (optional)
- Submit button (POST /consultations/rate with appointmentId + score + description)
- Close: X button, backdrop click, Escape key

**Remove:** The entire "Rate a Consultation" section at the bottom of `consultations/index.ejs`. All rating happens via the modal.

Implementation: `public/js/rating-modal.js` + modal HTML at bottom of `consultations/index.ejs`.

### C5 — Nurse Profile Card in Booking Flow

After nurse selection in booking form, a card fades in showing:
- Nurse name (bold)
- Years of experience
- Bio (or "No bio yet")
- Star rating (verified average + count)
- Top 3 verified reviews (anonymous: "Patient 1", "Patient 2", "Patient 3")
- "View full profile" link → `/staff`

**Data:** New API: `GET /consultations/api/nurse-profile/:staffNumber`
Returns: `{ firstName, lastName, bio, yearsExperience, averageRating, ratingCount, recentReviews[] }`

Only `Approved` ratings included. No student names exposed.

### C6 — "Meet Our Staff" Page (New Module)

**New module:** `src/modules/staff/`
- `staff.routes.js` — `GET /staff` (requireAuth)
- `staff.controller.js` — fetches all nurses with their verified ratings
- `staff.model.js` — queries nurses + approved ratings

**New view:** `views/staff/index.ejs`

**Sidebar link** for students: icon + "Meet Our Staff"

**Page layout:** 2-column card grid, each nurse card:
- Name, years experience, bio
- Star rating (static) + count
- Verified reviews (anonymous "Patient 1, 2, 3..." with stars + comment + relative date)
- Scrollable review area if > 5 reviews
- Empty state: "No reviews yet"

### C7 — Nurse Dashboard Rating Summary

New card at top of nurse dashboard:
- "Your Rating Summary"
- Large static star display + average number (e.g. "4.3 / 5")
- Total count ("from 12 consultations")
- Uses ALL ratings (not just approved) — this is for self-improvement
- No individual comments shown (student anonymity)

### C8 — Admin Moderation Queue

**New section in admin reports (or separate admin sub-page):**

**"Pending Reviews" queue:**
- Table: Nurse name | Score (stars) | Comment | Student name (admin visibility) | Date
- Action buttons: Approve (green) | Reject (red)
- Routes: `POST /management/admin/rating/approve`, `POST /management/admin/rating/reject`

**"Nurse Feedback Overview" table:**
- All nurses with: Name, Average rating (stars + number), Approved/Total count
- Expandable rows showing individual ratings with status badges

### C9 — Nurse Bio Editor

Add to nurse dashboard (or profile page):
- Bio textarea (300 char limit, live counter)
- Years of experience number input
- Save button → `POST /management/nurse/profile`

New model function in `nurse.model.js`:
```js
export async function updateNurseProfile(staffNumber, { bio, yearsExperience }) { ... }
```

---

## Part D: Appointment Lifecycle Hardening

### D1 — Prevent Interaction with Invalid States

Server-side validation for ALL appointment status transitions:

```js
// Valid transitions:
// Pending → Confirmed (nurse only)
// Pending → Cancelled (student or nurse)
// Confirmed → Completed (nurse only)
// Confirmed → Cancelled (student or nurse)
// Nothing → Pending (only on creation)
// Completed → (terminal state, no transitions)
// Cancelled → (terminal state, no transitions)
```

Reject any transition that doesn't follow these rules with a 400 error.

### D2 — Reschedule Restrictions

- Can only reschedule Pending or Confirmed
- New time must be in the future AND a weekday
- Must pass the same atomic booking check (slot not taken)
- Old slot freed, new slot claimed (already works via time update + cancelled status check in queries)

### D3 — Cancel Cascades Correctly

When a student or nurse cancels:
- Status set to Cancelled ✓ (already done)
- Any associated NurseReview for this appointment should be prevented (can't review an appointment you cancelled)
- Rating submission should check appointment status is Completed before accepting

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | A4: Auto-expire past appointments (model function + controller calls) | Low |
| 2 | A6: Fix booking redirect (→ confirmed page, not review page) | Low |
| 3 | A1-A3: Normalise student appointment table (view rewrite) | Medium |
| 4 | A2-A3: Normalise nurse appointment table (view rewrite) | Medium |
| 5 | B1: Remove tier text from dashboard | Low |
| 6 | B2-B3: Dark mode chart legend fixes | Low |
| 7 | C1: DB migration (Bio, YearsExperience, Verified, VerifiedAt) | Low |
| 8 | C2: Reviews model expansion (6 new functions) | Medium |
| 9 | C3: Star rating CSS component | Medium |
| 10 | C4: Rating modal (replaces bottom section) | Medium |
| 11 | C5: Nurse profile card in booking flow | Medium |
| 12 | C6: "Meet Our Staff" page (new module) | Medium |
| 13 | C7: Nurse dashboard rating summary | Low |
| 14 | C8: Admin moderation queue | Medium |
| 15 | C9: Nurse bio editor | Low |
| 16 | D1-D3: Lifecycle validation hardening | Medium |

---

## File Mapping (Post-Phase 20 Architecture)

| Old Reference | New Location |
|---------------|--------------|
| `ratingModel.js` | `src/modules/reviews/reviews.model.js` |
| `appointmentController.js` | `src/modules/appointments/appointments.controller.js` |
| `consultationRoutes.js` | `src/modules/appointments/appointments.routes.js` + `src/modules/reviews/reviews.routes.js` |
| `nurseController.js` | `src/modules/nurse/nurse.controller.js` |
| `adminController.js` | `src/modules/admin/admin.controller.js` |
| `nurse/dashboard.ejs` | `views/nurse/dashboard.ejs` (unchanged) |
| `consultations/index.ejs` | `views/consultations/index.ejs` (unchanged) |
| New "Meet Our Staff" | `src/modules/staff/` (new module) |
| New rating modal JS | `public/js/rating-modal.js` |
| Migration | `src/config/migrate.js` |

---

## Privacy Matrix

| Actor | Can See |
|-------|---------|
| **Student** | Own ratings. Verified nurse averages + anonymous approved reviews ("Patient 1, 2...") on booking + Meet Our Staff. |
| **Nurse** | Own average + count (ALL ratings). No individual comments. Bio editor. |
| **Admin** | All ratings (all statuses). Per-nurse breakdown. Student names. Approve/reject queue. |
| **Public** | Nothing. All data requires authentication. |

---

## Verification Checklist

After implementation:

- [ ] Student table: Rate button only shows on Completed + unrated rows
- [ ] Student table: Join button only shows when TeamsID exists + status is Confirmed
- [ ] Student table: "Awaiting Link" badge (non-clickable) for Online without TeamsID
- [ ] Student table: Cancelled rows greyed out, no buttons
- [ ] Student table: Rated rows show "✓ Rated" badge
- [ ] Nurse table: No actions on Completed/Cancelled rows
- [ ] Nurse table: Link button only for Confirmed Online without TeamsID
- [ ] Nurse table: Cancelled rows greyed
- [ ] Past appointments auto-cancelled on dashboard load
- [ ] Booking redirects to confirmation page (not review page)
- [ ] Dashboard cards: no "Tier 1" / "Tier 2" text
- [ ] Pie chart legend readable in dark mode
- [ ] Star rating modal opens from Rate button, submits correctly
- [ ] Nurse profile card appears in booking flow after nurse selection
- [ ] "Meet Our Staff" page shows all nurses with verified reviews
- [ ] Nurse dashboard shows personal rating summary
- [ ] Admin can approve/reject pending ratings
- [ ] Only approved ratings appear on student-facing pages
- [ ] Nurse can edit bio + years of experience
- [ ] Invalid status transitions rejected (400 error)
- [ ] Can't rate a cancelled appointment
- [ ] Can't review a nurse for a Pending appointment
