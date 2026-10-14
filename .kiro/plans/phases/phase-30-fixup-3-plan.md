# Phase 30 — Fixup 3 (Polish, Icons, Shell & Flow Refinements)

**Nature:** mostly CSS + view work, one small backend touch (nurse-profile "review eligibility" flag + a couple of query reuses), plus a reusable back-button partial and Lucide-style icon integration from `public/icons/`. No schema changes. Continue on `gui`. Governed by `steering/ui-design.md` + `design-refs.md`.

**Assets found:**
- `public/icons/` — 10 clean `currentColor` SVGs (inline-able, theme-aware): `home, symptoms, book, appointment, trend, meet, profile, report, manage.nurse, manage.student`.
- `NMU George Campus Facebook.png` — at **workspace root**; must be **copied into `public/images/`** to be served (static dir is `public/`). New login/top-left logo.

---

## Group 1 — Remove / strip

### 1.1 Remove the shimmer "marquee" on the dashboard greeting `[view/CSS]`
The `Good evening…` heading uses `.shimmer-text` (animated yellow gradient sweep). Remove `shimmer-text` from the `#dashboardGreeting` in `views/index.ejs` so it's plain (keep the greeting logic). Leave `.shimmer-text` in CSS unused, or drop it — remove the class usage regardless.

### 1.2 Remove the footer entirely `[views]`
Delete the `<footer class="site-footer">…© CampusCare…</footer>` block from `views/partials/footer.ejs` (keep the partial's other duties: closing `.main-content`, script includes, demo button). Also remove the `.site-footer` CSS (and the immersive `body.immersive-page .site-footer` rule becomes moot — leave or clean). Auth footer (`auth-footer.ejs`) copyright line: remove too for consistency (confirm — the brief says "completely").

### 1.3 Remove "Review Nurse" from the sidebar `[view]`
Delete the `/consultations/nurse-reviews` link from the student sidebar in `views/partials/navbar.ejs`. (The route + page stay reachable via the new profile-review flow, item 4.2.)

### 1.4 Remove icons from the dashboard cards `[view]`
The dashboard action cards (`views/index.ejs`) have emoji `card-icon`s. Remove the `.card-icon` divs from those cards (icons now live in the sidebar per item 5). Keep card titles/text/buttons.

---

## Group 2 — Glassiness pass (extend Fixup 2 recipe)

### 2.1 Glassify inline text-callout blocks `[view/CSS]`
Info/prompt blocks currently render as plain `.alert`s or bare text — e.g. **"Experiencing the same symptoms as your last check on 03 Sept 2026?"** (`symptom-form.ejs` prefill prompt), the booking recent-booking nudge, tier banners, disclaimers, "no reviews yet" notes, empty-states. Give these a **glass callout** treatment: a `.glass-note` class (translucent tint + blur + rim, using Fixup-2 tokens) so they sit on the glass UI consistently instead of flat coloured boxes. **Audit site-wide** and apply to comparable text blocks (alerts can keep semantic colour but gain the glass surface).

### 2.2 Glassify loading bars + buttons — but keep them **sharp** `[CSS]`
- **Progress/loading bars** (`.glass-progress`-style, the `.loading-spinner`, consult-progress track, any `<progress>`/bar): give the track a translucent glass fill + subtle inner rim, but keep the **fill/indicator crisp and high-contrast** (sharp edges, solid brand fill) so it reads clearly. "Glassy frame, sharp fill."
- **Buttons:** already got the sheen sweep in Fixup 2 — ensure secondary/tertiary use the glass surface, but keep **crisp text + defined edge** (don't over-blur the label). Primary stays solid + sharp.

### 2.3 Glassify table headers `[CSS]`
`.data-table th` currently uses a solid `--bg-canvas` fill. Make the header row a translucent glass strip (blur + subtle tint + hairline bottom) so tables sit on the glass UI. Keep header text sharp/legible.

### 2.4 Tables: seamless edges on glass (fade off sides) `[CSS]`
The tables' background/lighting "cuts off" hard at the left/right edges against the glass card. Stylise so tables blend seamlessly: e.g. a horizontal **mask/fade** on the table container so row backgrounds/hover highlights **fade out toward the side edges** rather than hard-clipping, and remove any hard inner border against the card. Goal: table feels part of the glass panel, edges dissolve.

---

## Group 3 — Shell / sidebar

### 3.1 New logo — NMU George Campus PNG, bigger `[asset + views/CSS]`
- Copy `NMU George Campus Facebook.png` → `public/images/nmu-george.png` (served).
- Use it as the **top-left sidebar logo** and the **login/auth logo** (replace `nmu-logo.jpg` references in `navbar.ejs` sidebar-logo + `auth-header.ejs`).
- **Make it bigger** — bump `.sidebar-logo` and `.auth-logo .sidebar-logo` dimensions (e.g. 70→90px sidebar, auth 64→96px), keep circular crop + object-fit cover.

### 3.2 Sidebar: Profile above Logout `[view]`
In `navbar.ejs`, for all roles, move the **Profile** link so it sits directly **above** the **Logout** link at the bottom (currently Profile is mid-list). Order: role links … (spacer) … Profile, Logout.

### 3.3 Reintroduce the sidebar "edging" grow animation + stronger glow `[CSS]`
Bring back a hover animation on the floating rail, but **subtle + slow** — the rail gently grows a touch (scale ~1.01–1.02 or width nudge) over a slow ease, like it's "edging to be clicked," and the **glow behind it intensifies** (bigger, brighter shadow/aura). Respect `prefers-reduced-motion` (no grow). This replaces the old `sidebarBounce` (removed in 30B) with something calmer.

### 3.4 Make the sidebar wider `[CSS]`
Increase `--sidebar-width` (currently 300px) a bit (e.g. 300→320–340px) so links + icons breathe. Verify `.main-content` margin (derived from it) + collapse behaviour still line up, and the immersive left offset.

### 3.5 Dashboard: theme toggle → bottom-right; identity chip stays top-right `[CSS/view]`
Note: the brief pairs this with 3.2. The top-right floating cluster currently holds identity chip + theme toggle. Per brief: **move the theme toggle to bottom-right** (fixed, like auth pages already do) on the **app shell** too, leaving the identity chip alone in the top-right. So: app `.theme-toggle` → fixed bottom-right (scope the existing `.auth-page .theme-toggle` rule to apply app-wide, or move the toggle out of `.floating-controls` into its own fixed corner). Identity chip remains top-right.

### 3.6 Sidebar icons — implement supplied SVGs, remove emoji `[view/CSS]`
Replace the emoji `sidebar-icon` glyphs with the supplied `public/icons/*.svg`, **inlined** so they inherit `currentColor` + theme (per ui-design.md §9b). Mapping per role:
- **Student:** Home→`home`, Symptom Checker→`symptoms`, Book Consultation→`book`, My Appointments→`appointment`, Health Trends→`trend`, Meet Our Staff→`meet`, Profile→`profile`. (Review Nurse removed, item 1.3.)
- **Nurse:** Home→`home`, Clinical Dashboard→`appointment` (or `report`), Availability→`book`, Health Trends→`trend`, Profile→`profile`.
- **Admin:** Home→`home`, Reports→`report`, Manage Students→`manage.student`, Manage Nurses→`manage.nurse`, Health Trends→`trend`, Profile→`profile`.
- **Logout:** keep the existing door glyph (or a small inline logout icon if we add one — brief says implement "where necessary"; keep logout as-is since no icon supplied).
- Size ~20–22px, `aria-hidden` (text label present). Inline via EJS include or a small `<%- include %>` helper reading the SVG. **Decide impl:** simplest robust path = an EJS partial `views/partials/icon.ejs` that maps a name → inline `<svg>` (hard-coded set), avoiding fs reads at render.

---

## Group 4 — Flows & components

### 4.1 My Appointments: 3-dot (kebab) actions for students `[view/CSS]`
Replace the inline row of action buttons in `views/consultations/index.ejs` with a **kebab (⋮) menu** per row (the app already has a `.kebab-btn` + dropdown pattern from admin tables — reuse it). Menu items depend on status: **Join Consultation** (online, in-window, confirmed), **Cancel** (pending/confirmed), **View Nurse** (→ `/staff/:staffNumber` — needs the nurse's StaffNumber in the appointment data — verify it's available; the query joins Nurse so add `StaffNumber`), **Rate** (completed, unreviewed). Keep the rating modal. Glassy dropdown.

### 4.2 Review flow from nurse profile `[backend + view]`
When a student views a nurse's full profile (`/staff/:staffNumber`) **and** has a **completed, not-yet-reviewed** consultation with that nurse, show a **"Review this nurse"** CTA on the profile that enters the existing review flow.
- **Backend:** in `showNurseProfile`, when `user.role === 'student'`, compute `canReview` using existing helpers: `hasReviewedNurse(studentNumber, staffNumber)` === false AND `getMostRecentCompletedAppointment(studentNumber, staffNumber)` exists. Pass `canReview` + that `appointmentId` to the view.
- **View:** if `canReview`, render a CTA button → `/consultations/review/:appointmentId` (the existing `showReviewPage` route already validates + redirects appropriately).
- Post-consultation prompt already exists (My Appointments "Rate" + nurse-reviews page) — leave intact.

### 4.3 Site-wide Back button `[new partial + views]`
Create a reusable **`views/partials/back-button.ejs`** rendering a simple `< back` (chevron glyph `‹` or `<`, **no long line-arrow**, lowercase "back", subtle glass/text style). Behaviour: **returns to the previous page** — use `history.back()` (JS) with a sensible fallback href (e.g. `document.referrer` or a passed default) so it works even on direct load. Place it where the current `← Back to Meet Our Staff` sits on the nurse profile (`staff/nurse-profile.ejs`) — **replace** that bespoke link — and add it to other deep/detail pages (nurse profile, admin detail views, review page, symptom recommendations, etc.). Add **spacing between the button and the content block** below it. Keep it out of top-level dashboard/home pages (nothing to go "back" to).
- **Decide:** pure `history.back()` (simplest, matches "returns to page they came from") vs. server-passed `backTo`. Plan recommends `history.back()` with `referrer` fallback, so it's one partial dropped anywhere.

---

## Files (anticipated)
- `public/css/style.css` — glass notes, loading bars, table headers + seamless edges, sidebar width/animation/glow, theme-toggle bottom-right, kebab dropdown, back button, logo sizing, icon sizing.
- `views/partials/navbar.ejs` — profile-above-logout, remove Review Nurse, inline icons, new logo, (theme toggle relocation if moved here).
- `views/partials/footer.ejs` + `auth-footer.ejs` — remove footer/copyright.
- `views/partials/icon.ejs` (NEW) — inline SVG icon map.
- `views/partials/back-button.ejs` (NEW) — reusable back control.
- `views/index.ejs` — remove shimmer class + dashboard card icons.
- `views/consultations/index.ejs` — kebab actions.
- `views/staff/nurse-profile.ejs` — back button + review CTA.
- `views/auth/*` / `auth-header.ejs` — new bigger logo.
- Various views — glass-note callouts + back button placement.
- `src/modules/staff/staff.controller.js` — `canReview` + `reviewAppointmentId` for nurse profile.
- `src/modules/appointments/appointments.model.js` (or wherever the my-appointments query lives) — ensure `StaffNumber` is selected for the "View Nurse" kebab link.
- Asset copy: `NMU George Campus Facebook.png` → `public/images/nmu-george.png`.

## Sequencing
1. **Strips** (footer, shimmer, sidebar Review-Nurse link, dashboard icons) — quick, low-risk.
2. **Assets + shell:** copy George logo (bigger), sidebar width, profile-above-logout, sidebar icons via `icon.ejs`, sidebar grow+glow animation, theme-toggle bottom-right.
3. **Glass pass:** `.glass-note` callouts (site-wide audit), loading bars, table headers, seamless table edges.
4. **Flows:** back-button partial + placements; My Appointments kebab; nurse-profile review CTA (+ controller flag).
5. Verify all: 3 roles, both themes, reduced-motion, mobile; kebab menu + review CTA + back button work; icons render; no footer; tables seamless.

## Verify
- No shimmer on greeting; no site/auth footer; no "Review Nurse" in sidebar; no emoji icons on dashboard cards.
- Text callouts (symptom prefill prompt, nudges, disclaimers) are glassy; loading bars glassy-but-sharp; table headers glassy; table side edges fade seamlessly into the glass.
- New George logo shows top-left + login, larger; sidebar wider; Profile sits above Logout; sidebar slow-grow + stronger glow on hover (reduced-motion safe); theme toggle bottom-right on app + auth; identity chip top-right.
- Sidebar shows correct inline SVG icons per role.
- My Appointments uses a kebab with correct status-aware actions (Join/Cancel/View Nurse/Rate).
- Nurse profile shows a "Review this nurse" CTA only when the student had a completed, unreviewed consult with them → enters review flow.
- Site-wide `< back` button returns to previous page, spaced from content, on detail pages; both themes.

## Open decisions for you
- **Back button:** `history.back()` + referrer fallback (recommended, drop-anywhere) — OK?
- **Auth footer copyright:** remove it too (brief says "completely") — confirm.
- **Nurse sidebar icons:** Clinical Dashboard → `appointment` vs `report` icon — preference? (proposing `appointment`).
- **Theme toggle:** on the dashboard/app, move to bottom-right (matches auth) — confirm you want it app-wide bottom-right, not just dashboard.
