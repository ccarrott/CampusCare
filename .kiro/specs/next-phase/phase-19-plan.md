# Phase 19: Rating & Review System Overhaul

## Overview

Transform the current flat rating system into a polished, moderated nurse review platform with interactive star ratings, contextual nurse profiles, modal dialogs, admin verification workflow, and role-scoped visibility.

**Core Principles:**
1. Reviews are **moderated** — admin must verify before they appear publicly to students
2. Reviews are **anonymous** — displayed as "Patient 1", "Patient 2", etc. (never student names)
3. Nurses see their **aggregate only** — never individual feedback text
4. Students can read **verified reviews** during booking + on the "Meet Our Staff" page to make informed choices

---

## Part A: Database Schema Changes

### New Columns on `Nurse` Table

```sql
ALTER TABLE Nurse ADD COLUMN Bio TEXT DEFAULT NULL;
ALTER TABLE Nurse ADD COLUMN YearsExperience INT DEFAULT 0;
```

- `Bio`: Nurse-editable short biography (max ~300 chars in UI, TEXT in DB for flexibility)
- `YearsExperience`: Integer, set by admin or nurse themselves

### New Column on `Rating` Table

```sql
ALTER TABLE Rating ADD COLUMN Verified ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending';
ALTER TABLE Rating ADD COLUMN VerifiedAt DATETIME DEFAULT NULL;
```

- `Verified`: Admin moderation status. Only `'Approved'` ratings are visible to students.
- `VerifiedAt`: Timestamp when admin approved/rejected (audit trail)

### Moderation Flow
1. Student submits rating → stored with `Verified = 'Pending'`
2. Admin sees all pending ratings in a review queue
3. Admin approves or rejects each rating
4. Only `Approved` ratings appear in:
   - Booking flow nurse profile card
   - "Meet Our Staff" page
   - Nurse average calculations visible to students
5. Nurse dashboard average includes ALL ratings (pending + approved) since they're about self-improvement
6. Rejected ratings are hidden from everyone except admin (for record-keeping)

---

## Part B: Rating Model Expansion

### New Query Functions (`src/models/ratingModel.js`)

| Function | Purpose |
|----------|---------|
| `getAverageRatingForNurse(staffNumber)` | Returns `{ average, count }` — uses ALL ratings (for nurse self-view) |
| `getVerifiedAverageForNurse(staffNumber)` | Returns `{ average, count }` — only `Approved` ratings (for student-facing contexts) |
| `getVerifiedRatingsForNurse(staffNumber)` | Returns individual approved ratings (for student "Meet Our Staff" + booking card) |
| `getAllNurseAverages()` | Returns array of all nurses with averages + counts (admin view) |
| `getRatingsByNurse(staffNumber)` | Returns ALL individual ratings for a nurse regardless of status (admin drill-down) |
| `getPendingRatings()` | Returns all `Pending` ratings for the admin moderation queue |
| `updateRatingVerification(ratingId, status)` | Sets `Verified` + `VerifiedAt` (admin action) |
| `getRatedAppointmentIds(studentNumber)` | Replaces the inline raw query currently in appointmentController |

---

## Part C: Star Rating UI Component

### Interactive 5-Star Widget (CSS-only, no library)

**Approach:** CSS `:hover` + `:checked` sibling selectors on hidden radio inputs. Stars rendered as Unicode `&#9733;` (filled) / `&#9734;` (empty) with gold colour on active.

**Behaviour:**
- Hover fills stars up to cursor position (left-to-right fill)
- Click locks the selection
- Selected value stored in hidden `<input name="score">`
- Stars scale up slightly on hover for tactile feedback
- Works identically in dark mode (gold on dark surface)

**Read-only variant:** For display contexts (nurse profile card, admin reports), render static filled/empty stars from a numeric value. Half-star rounding: 3.7 → 4 stars, 3.4 → 3.5 (or nearest integer for simplicity).

### CSS Classes

```
.star-rating         — wrapper (inline-flex, direction: rtl for sibling trick)
.star-rating input   — hidden radio buttons (value 1-5)
.star-rating label   — star glyphs, cursor: pointer
.star-rating-static  — read-only display variant
```

---

## Part D: Rating Modal Dialog (Replaces #ratingForm Anchor)

### Trigger
- "Rate" button in appointment history table row → opens a centred modal overlay

### Modal Structure
- Backdrop (semi-transparent dark overlay, click-to-close)
- Modal card (max-width 440px, rounded, matches `.content-card` styling)
- Content:
  - Header: "Rate Your Consultation"
  - Subtext: Nurse name + appointment date (pre-filled from the row data)
  - Interactive 5-star widget
  - Comments textarea (optional, 3 rows)
  - Submit button (POST to `/consultations/rate`)
  - Hidden inputs: `appointmentId`, `score`
- Close via: X button top-right, backdrop click, or Escape key
- Focus trapped inside modal while open (accessibility)

### Implementation
- Pure vanilla JS (no library) — `<dialog>` element or custom div+aria
- Modal HTML rendered once in the page, populated dynamically via JS `dataset` attributes from the Rate button
- Form submission remains a standard POST (no AJAX needed — keeps it simple)

### Accessibility
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Focus moves to first interactive element on open
- Escape key closes

---

## Part E: "Rate a Nurse" Section (Replaces "Rate a Consultation")

### Change
The bottom-of-page section currently says "Rate a Consultation" with a dropdown of appointments. Replace with:

**"Rate a Nurse"**
- Dropdown populated with **unique nurses** the student has completed (unrated) consultations with
- When nurse selected: shows their name + the date range of completed appointments with that nurse
- 5-star widget + comments box
- Hidden `appointmentId` auto-assigned to the most recent unrated completed appointment with that nurse (so the DB schema stays unchanged — ratings still link to specific appointments)

This is a UX simplification: students think "I'm rating Nurse Jenkins" not "I'm rating appointment APT-SHOW-007". Backend still maps to a specific appointment.

---

## Part F: Nurse Profile Card in Booking Flow

### Placement
After the student selects a nurse in the booking form (Step 1), a "Nurse Info" card fades in below the nurse dropdown, before the schedule grid (between Step 1 and Step 2).

### Card Content
- Nurse full name (large, bold)
- `YearsExperience` years as a registered nurse
- Bio text (or "No bio available" fallback)
- Star rating display (read-only static stars + "4.2 avg from 8 reviews")
- **Verified patient reviews** (up to 3 most recent approved ratings):
  - Displayed as anonymous cards: "Patient 1", "Patient 2", "Patient 3"
  - Each shows: star score + comment text + relative date ("2 weeks ago")
  - "View all reviews" link → navigates to the nurse's full profile on "Meet Our Staff" page
- Subtle border, slightly elevated shadow

### Data Source
- New API endpoint: `GET /consultations/api/nurse-profile/:staffNumber`
- Returns: `{ firstName, lastName, bio, yearsExperience, averageRating, ratingCount, recentReviews[] }`
- `recentReviews` contains only `Approved` ratings, limited to 3, ordered by most recent
- Called via `fetch()` on nurse dropdown change (same event that loads the grid)

### Privacy
- Reviews anonymised as "Patient 1", "Patient 2" (sequential per display, not persistent IDs)
- Only `Approved` ratings shown — admin has already vetted the content
- No student names or identifying information exposed

---

## Part F2: "Meet Our Staff" Page (New)

### Sidebar Link
New sidebar entry for **Students** (and public/logged-in users):
- Icon: &#128105;&#8205;&#9877;&#65039; (or a people icon)
- Label: "Meet Our Staff"
- Route: `/staff`

### Page Layout (`views/staff/index.ejs`)

**Page header:** "Meet Our Staff" — "Get to know the nurses who keep our campus healthy."

**Nurse cards grid** (2-column on desktop, 1-column mobile):

Each card contains:
- Nurse name (h3, bold)
- Years of experience badge
- Bio paragraph
- Star rating (static read-only stars + numeric average + review count)
- **Verified reviews section** (all approved reviews for this nurse):
  - Listed as expandable/scrollable area (max-height with scroll if > 5)
  - Each review: "Patient 1" — stars — comment — relative time
  - Anonymous numbering resets per nurse (each nurse's reviews start at Patient 1)
- If no approved reviews: "No reviews yet — be the first after your consultation!"

### Data Source
- New controller: `staffController.js` (or add to existing)
- Route: `GET /staff` (mounted in app.js, protected by `requireAuth`)
- Queries: All nurses + their verified averages + all verified reviews per nurse
- Efficient: single JOIN query returning nurses with their approved ratings, grouped in controller

### API Design
- Could do server-side rendering (simpler) — fetch all data in controller, pass to EJS
- Nurse cards rendered in a `.dashboard-grid`-like layout

---

## Part G: Nurse Dashboard — Personal Rating Summary

### Addition to `views/nurse/dashboard.ejs`
New section at the top (after page header, before appointment table):

**"Your Rating Summary"** card:
- Large star display (static, read-only)
- Average score (e.g. "4.3 / 5")
- Total review count (e.g. "from 12 consultations")
- No individual comments shown (privacy — student anonymity preserved)

### Data Source
- `getAverageRatingForNurse(staffNumber)` called in `nurseController.showDashboard`
- Passed to view as `{ nurseAverage, nurseRatingCount }`

---

## Part H: Admin Feedback Panel (Full Visibility + Moderation)

### Enhancement to `views/admin/reports.ejs`

#### 1. Moderation Queue (New — Top Priority)

**"Pending Reviews"** section (shown at top if any pending exist):
- Badge count in sidebar: e.g. "Reviews (3)" indicating pending items
- Table of unverified ratings:
  - Nurse name | Score (stars) | Comment text | Student name (admin CAN see) | Date submitted
  - Action buttons per row: **Approve** (green) | **Reject** (red)
- POST routes:
  - `POST /management/admin/rating/approve` → sets `Verified = 'Approved'`, `VerifiedAt = NOW()`
  - `POST /management/admin/rating/reject` → sets `Verified = 'Rejected'`, `VerifiedAt = NOW()`
- Once approved, the rating becomes visible on "Meet Our Staff" + booking flow
- Once rejected, it's hidden everywhere except this admin panel (greyed out, labelled "Rejected")

#### 2. Nurse Feedback Overview

**Summary table** — all nurses with:
- Name
- Average rating (star display + number) — calculated from ALL ratings (not just approved)
- Approved count / Total count
- Sortable by average (descending default)

**Expandable per-nurse detail** (click row → reveals):
- Individual rating cards showing: Score (stars), Comment text, Date, Status badge (Approved/Pending/Rejected)
- Student name shown to admin (they need this for accountability)
- Filters: All | Approved | Pending | Rejected

### Data Source
- `getAllNurseAverages()` for the table
- `getRatingsByNurse(staffNumber)` for drill-down (could be AJAX or page-level)

---

## Part I: Nurse Bio Editor

### Where
Nurse profile edit page (or a new section in nurse dashboard if no edit page exists for nurses).

### Fields
- `Bio` — textarea, max 300 characters, with live char counter
- `YearsExperience` — number input (min 0, max 50)

### Route
- `POST /management/nurse/profile` (or similar, depends on existing profile routes)

---

## Implementation Order

| Step | What | Files Touched |
|------|------|---------------|
| 1 | DB migration: add `Bio`, `YearsExperience` to Nurse + `Verified`, `VerifiedAt` to Rating | `migrate.js` |
| 2 | Rating model expansion (8 new functions) | `ratingModel.js` |
| 3 | Star rating CSS component (interactive + static) | `style.css` |
| 4 | Rating modal dialog (HTML + JS) | `consultations/index.ejs`, new `public/js/rating-modal.js` |
| 5 | Replace "Rate a Consultation" with "Rate a Nurse" | `consultations/index.ejs`, `appointmentController.js` |
| 6 | Nurse profile API endpoint | `appointmentController.js` or new controller, `consultationRoutes.js` |
| 7 | Nurse info card + verified reviews in booking flow | `consultations/book.ejs` |
| 8 | "Meet Our Staff" page (new route, controller, view) | `staffController.js`, `staffRoutes.js`, `views/staff/index.ejs`, `app.js`, `navbar.ejs` |
| 9 | Nurse dashboard rating summary | `nurseController.js`, `nurse/dashboard.ejs` |
| 10 | Admin moderation queue + feedback panel | `adminController.js`, `admin/reports.ejs`, `managementRoutes.js` |
| 11 | Nurse bio editor | `nurseController.js`, `nurse/dashboard.ejs` (or new view) |

---

## Privacy Matrix

| Actor | Can See |
|-------|---------|
| **Student** | Their own submitted ratings. Nurse aggregate stars + **verified anonymous reviews** (as "Patient 1, 2, 3...") during booking and on "Meet Our Staff" page. |
| **Nurse** | Their own average score + count (includes all ratings). No individual comment text. |
| **Admin** | All ratings (all statuses), per-nurse breakdown, individual comments, student names. Moderation queue with approve/reject actions. |
| **Public** | Nothing. No unauthenticated rating data exposed. |

---

## UX Principles Applied

1. **Recognition over recall** — modal pre-fills nurse name and date, student doesn't have to pick from a dropdown
2. **Progressive disclosure** — nurse info card only appears after selection (not cluttering initial state)
3. **Emotional safety** — anonymous reviews ("Patient 1") encourage honest feedback while still letting future patients benefit
4. **Trust through moderation** — admin-verified badge ensures reviews are legitimate, preventing abuse
5. **Immediate feedback** — star hover animation confirms interaction
6. **Minimum friction** — one click to open modal, click stars, optional comment, submit. Three interactions total.
7. **Social proof** — verified reviews in booking flow help students choose confidently
8. **Discoverability** — "Meet Our Staff" sidebar link gives students a dedicated space to explore nurse profiles at their own pace
