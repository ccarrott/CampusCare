# Plan 2 — Student Portal, Triage & Reviews

## Problem Statement
Eight student-facing fixes: the Tier-2 escalation heading, booking CTA wording, the progress-bar
"Starting soon" label, the consultation-history action label, a kebab-menu clipping bug, review
eligibility, star-rating validation, and surfacing review rejection to the student.

## Global Constraints
- **UI-only terminology rename:** only EJS visible text/labels — never the `Appointment` table,
  its columns, `appointments.*.js`, routes, or JS identifiers.
- No new client libraries, no build step. Use tokens from `ui-design.md`.
- Verify in light + dark mode, reduced-motion where relevant, no console errors. Restart
  `node src/app.js` (kill stale node on port 3000) to test.

## Architecture Notes (grounded in current code)
- Student booking/review views live under `views/consultations/`, not `views/student/`.
  `views/student/` holds the symptom-checker views (`recommendations.ejs`, `symptom-form.ejs`,
  `symptom-history.ejs`).
- **No persistent notifications table exists.** "Notifications" today are ephemeral browser Web
  Notifications (`public/js/notifications.js` polling `GET /consultations/api/upcoming`) plus
  `?toast=` query-string toasts surfaced by `views/partials/alerts.ejs` + `public/js/toast.js`.
- `APPOINTMENT_STATUS` (`src/constants.js`): `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`.
- The progress bar is computed **at render time** in `views/partials/consult-progress.ejs`;
  there is no server scheduler.
- Two review paths exist: the in-page rating modal (POST `/consultations/rate`,
  already gated to Completed) and the post-booking review page (POST `/consultations/review`,
  **not** gated on the reviewed appointment's status — the bug in Item 12).

---

## Item 7 — Tier 2 Heading (D400)

**Target files**
- `views/student/recommendations.ejs` (the `maxTier >= 2` escalation branch, ~lines 134–146).

**Context**
There is currently **no** "Tier 2" heading to rename — the escalation banner's only bold line is
"You need to book a nurse consultation." A heading must be **added**.

**Implementation Steps**
1. In the Tier-2 escalation branch, add a heading element reading exactly **`Advanced to Tier 2`**
   at the top of the banner, above the existing explanatory line.
2. Use existing banner/heading classes; no hardcoded colours/sizes.

**Verification**
- Trigger a Tier-2 symptom set → the banner shows the exact "Advanced to Tier 2" heading.
- Tier-1 (OTC) and Tier-3 (supportive-care) paths are unchanged.

---

## Item 8 — Booking CTA Button (B100 / B200)

**Target files**
- `views/consultations/book.ejs` (submit button, ~line 144).

**Implementation Steps**
1. Change the submit button text `Book Appointment` → `Book consultation`.
2. Keep `id="submitBtn"`, `class`, and `disabled` wiring intact. Entry-point CTAs
   ("Book Consultation Now") are handled under Plan 1 Item 6.

**Verification**
- The booking page submit button reads "Book consultation"; submission still works for both
  Physical and Online.

---

## Item 9 — Progress Bar "Starting Soon" Trigger (C400 / D300)

**Target files**
- `views/partials/consult-progress.ejs` (stages array + state math, ~lines 11–22).
- Optional: `public/js/notifications.js` (`processAppointment` — add a 30-min threshold);
  `src/modules/notifications/notifications.controller.js` already returns `minutesUntil`.

**Implementation Steps**
1. Rename the stage label at index 2 of the `stages` array: `'Today'` → `'Starting soon'`.
2. Adjust the state computation so the "Starting soon" stage activates within 30 minutes
   before the slot. For a `Confirmed` appointment, set `current = 2` when
   `pNow >= pTime - 30*60*1000 && pNow < openMs` (keep the existing in-progress window
   `[openMs, closeMs]` → `current = 3`; keep "Confirmed, future" → `current = 1`).
3. Optional: add a 30-minute reminder branch in `notifications.js processAppointment`
   (e.g. `mins >= 29 && mins <= 31`) so the browser reminder aligns with the "Starting soon"
   label.
4. Because progress is computed at render time, note in a code comment that the label updates on
   page load/refresh (no server scheduler exists).

**Verification**
- A confirmed consultation ~25 min out shows "Starting soon" as the active stage.
- > 30 min out shows "Confirmed"; inside the join window shows "In Progress"; completed shows
  "Complete".
- Optional 30-min browser notification fires near the mark; reduced-motion unaffected.

---

## Item 10 — Consultation History Action Label (B400)

**Target files**
- `views/consultations/index.ejs` (kebab "Rate" button, ~lines 64–69).

**Implementation Steps**
1. Change the visible label `Rate` → `Review nurse`.
2. Keep the `onclick="openRatingModal(this)"` wiring and all `data-*` attributes intact.
   The modal title can be aligned under Plan 1 Item 6.

**Verification**
- On a completed consultation the kebab shows "Review nurse"; clicking still opens the rating
  modal and submits successfully.

---

## Item 11 — History Scrollbar / Menu Clipping Fix

**Target files**
- `public/css/style.css` (`.kebab` ~line 2625, `.kebab-menu` ~line 2627, the mobile
  `.data-table { overflow-x: auto }` rule ~line 3505, `.content-card`).
- `views/consultations/index.ejs` (kebab markup + `toggleApptMenu` JS).

**Context**
`.kebab-menu` is `position:absolute; top:100%` (opens downward). On the last table row the menu
extends past the bottom of its clip/scroll context; the mobile `.data-table { overflow-x:auto }`
rule turns the table into a scroll container that clips the dropdown. Result: on the last row,
"View nurse" and "Review nurse" are cut off.

**Implementation Steps**
1. Preferred: add a `.kebab-menu--up` modifier (opens upward: `bottom:100%; top:auto`) and have
   `toggleApptMenu` detect when the row is near the container/viewport bottom and apply it to
   the last-row menu.
2. Alternative/complement: give the table's containing card bottom padding (space for the
   dropdown) and keep `overflow-x:auto` only where horizontal scroll is actually needed (mobile),
   using `overflow:visible` on the vertical axis on desktop so the dropdown isn't clipped.
3. Do not break the mobile horizontal-scroll behaviour for wide tables.

**Verification**
- With several completed consultations, open the **last** row's kebab — all options are visible
  and clickable on desktop and mobile.
- Horizontal table scroll still works on narrow screens; no console errors.

---

## Item 12 — Restrict Reviews to Attended/Completed Consultations Only (B400)

**Target files**
- `src/modules/reviews/reviews.controller.js` (`showReviewPage` ~lines 56–66,
  `handleReviewSubmission` ~lines 68–101).
- `src/modules/reviews/reviews.model.js` (`getAppointmentForReview`).
- `views/consultations/review.ejs` (the hardcoded "Status: Pending (awaiting nurse
  confirmation)" line).

**Context**
`getAppointmentForReview` returns the appointment regardless of status, and `showReviewPage`
checks only existence/ownership — so a past appointment still in `Pending` can reach the review
page and submit. (The in-page rating-modal path already guards on `Status === 'Completed'`.)

**Implementation Steps**
1. In `showReviewPage`, after loading the appointment, redirect away (e.g. to
   `/consultations/my-appointments`) if `appointment.Status !== APPOINTMENT_STATUS.COMPLETED`.
   Import `APPOINTMENT_STATUS` from `constants.js` rather than using a raw string.
2. In `handleReviewSubmission`, re-check the reviewed appointment's status is `COMPLETED` before
   creating the review (defence in depth — don't rely solely on
   `getMostRecentCompletedAppointment`).
3. In `review.ejs`, replace the hardcoded "Status: Pending …" line so it reflects the real
   `appointment.Status`.

**Verification**
- Attempting to review a Pending/Cancelled past consultation redirects without creating a review.
- A Completed consultation still allows review submission.
- The in-page rating-modal path is unaffected; parameterised queries throughout.

---

## Item 13 — Mandatory Star Rating Validation (B400)

**Target files**
- `views/consultations/review.ejs` (star widget + hidden `rating` input + submit button).
- `views/consultations/index.ejs` (the rating modal — hidden `score` input + submit button).
- `src/modules/reviews/reviews.controller.js` (`handleRatingSubmission`,
  `handleReviewSubmission` — already call `isValidScore`).

**Context**
Server-side `isValidScore` (1–5) is already enforced, but the failure path is a **silent
redirect** — the student gets no feedback. The client disables submit until a star is chosen
(review.ejs has `required` + a disabled button; verify the modal does too).

**Implementation Steps**
1. Change the server-side invalid-rating failure path from a silent redirect to a redirect
   **with a clear error**, e.g.
   `?toast=Please%20select%20a%20star%20rating&toastType=error`
   (surfaced by `alerts.ejs` / `toast.js`), on both `handleRatingSubmission` and
   `handleReviewSubmission`.
2. Confirm the client keeps the submit button disabled until a star is selected in **both**
   surfaces (review.ejs and the index.ejs modal). If the modal doesn't already, add the guard.
3. Ensure a force-submit (no star) produces a visible message, not a silent bounce.

**Verification**
- Submitting a review/rating with no star shows a clear error message (not a silent redirect).
- Selecting a star then submitting succeeds; a valid rating persists.

---

## Item 14 — Review Rejection Notification — **Option A (chosen)**

**Decision:** Option A — no new table. Surface the rejection outcome on the student's own reviews
page via a clear status badge. (Option B, a persistent `Notification` table, was declined.)

**Target files**
- `views/consultations/nurse-reviews.ejs` (the student's reviews list).
- `src/modules/reviews/reviews.model.js` (`getReviewsByStudent` — already returns the `Verified`
  column; confirm it is selected).
- `src/modules/reviews/reviews.controller.js` (`showStudentReviews` — already passes `reviews`).

**Context**
Admin rejection sets `NurseReviews.Verified = 'Rejected'` (via `updateNurseReviewVerification`),
but nothing surfaces this to the student. `getReviewsByStudent` already exposes each review's
`Verified` status, so the student page can show it with no schema change.

**Implementation Steps**
1. In `nurse-reviews.ejs`, render a clear status badge per review based on `Verified`:
   - `Pending` → "Pending review" (muted/neutral badge)
   - `Approved` → "Approved" / "Published" (success badge)
   - `Rejected` → "Rejected by moderator" (danger badge)
   Use the existing status-badge classes/tokens (already token-driven) — no hardcoded colours.
2. Confirm `getReviewsByStudent` selects the `Verified` column; if not, add it to the SELECT
   (parameterised, no concatenation).
3. No controller/route changes needed beyond ensuring `Verified` reaches the view.

**Verification**
- After an admin rejects a review, the student sees a "Rejected by moderator" badge on their
  reviews page.
- Approved/pending reviews show their respective badges; approvals are unaffected.
- Parameterised queries; no console errors; works light/dark.

---

## Suggested Execution Order
1. Items 7, 8, 10 (pure text/label edits — fast, isolated).
2. Item 11 (CSS clipping fix).
3. Item 9 (progress-bar logic + label).
4. Items 12 + 13 (reviews controller — related, do together).
5. Item 14 (reviews page badge).
