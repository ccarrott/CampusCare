# Phase 21: HCI Polish, Micro-interactions & Visual Consistency

## Goal

Elevate the application from "functional prototype" to "polished product" through systematic HCI improvements. Every interaction should feel intentional, every page should communicate where the user is, and every action should give immediate, visible feedback.

---

## Part A: Success Toast Notification System

### Problem
Actions like booking, rating, saving availability, or editing profiles silently redirect. The user gets no confirmation that their action worked.

### Solution
Reusable floating toast notifications (bottom-right, auto-dismiss after 4 seconds).

### Implementation

**New file: `public/js/toast.js`**

```js
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger slide-in
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  
  // Auto-dismiss after 4s
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
```

**CSS:**
```css
.toast {
  position: fixed;
  bottom: 80px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #fff;
  z-index: 10001;
  transform: translateX(120%);
  transition: transform 0.3s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.toast-visible { transform: translateX(0); }
.toast-success { background: #10b981; }
.toast-error { background: #ef4444; }
.toast-info { background: #0ea5e9; }
```

**Trigger mechanism:** Server sets a session flash variable on success actions. The view checks for it on load and calls `showToast()`. Alternatively, use a URL query param `?toast=Appointment+booked` and read it on page load (simpler, no session dependency).

**Where to show toasts:**
- Booking confirmed
- Rating submitted
- Review submitted
- Profile updated
- Availability saved
- Nurse bio saved
- Admin: student/nurse added, updated, deleted
- Admin: review approved/rejected
- Password changed
- Password reset successful

---

## Part B: Booking Step Progress Indicator

### Problem
The booking form has multiple steps (Type → Nurse → Schedule → Confirm) but no visual indicator of progress.

### Solution
Horizontal stepper bar above the form content.

### Design

```
  (1)────────(2)────────(3)────────(4)
 Type       Nurse     Schedule    Submit
  ●──────────○──────────○──────────○
```

- Active step: gold filled circle + bold label
- Completed steps: green circle with checkmark
- Future steps: grey outlined circle + muted label
- Connector lines between steps (solid for completed, dashed for upcoming)

### Implementation

**HTML structure** (at top of booking form, before steps):
```html
<div class="step-indicator">
  <div class="step active" data-step="1"><span class="step-circle">1</span><span class="step-label">Type</span></div>
  <div class="step-connector"></div>
  <div class="step" data-step="2"><span class="step-circle">2</span><span class="step-label">Nurse</span></div>
  <div class="step-connector"></div>
  <div class="step" data-step="3"><span class="step-circle">3</span><span class="step-label">Schedule</span></div>
  <div class="step-connector"></div>
  <div class="step" data-step="4"><span class="step-circle">4</span><span class="step-label">Submit</span></div>
</div>
```

**JS:** Update step classes as user progresses (when type selected → step 2 active, when nurse selected → step 3 active, when slot clicked → step 4 active).

**CSS:**
```css
.step-indicator { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 32px; }
.step { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.step-circle { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; color: var(--text-muted); transition: all 0.2s; }
.step-label { font-size: 0.75rem; color: var(--text-muted); }
.step.active .step-circle { background: var(--accent-cyan); border-color: var(--accent-cyan); color: var(--primary-navy); }
.step.active .step-label { color: var(--text-dark); font-weight: 600; }
.step.completed .step-circle { background: var(--status-success); border-color: var(--status-success); color: #fff; }
.step-connector { flex: 1; height: 2px; background: var(--border-color); margin: 0 8px; margin-bottom: 18px; }
.step.completed + .step-connector { background: var(--status-success); }
```

---

## Part C: Sidebar Active State

### Problem
The sidebar doesn't indicate which page you're currently on. Users lose navigation context.

### Solution
Gold left border + slightly brighter text on the sidebar link matching the current URL.

### Implementation

**CSS:**
```css
.sidebar-link.active {
  background-color: #334155;
  color: #ffffff;
  border-left: 3px solid var(--accent-cyan);
  padding-left: 11px; /* compensate for border */
}
```

**JS (in sidebar.js):**
```js
// Highlight active sidebar link
(function() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
})();
```

---

## Part D: Data Table Row Contextual Styling

### Problem
All appointment rows look identical. Important information (upcoming soon, overdue, cancelled) doesn't stand out visually.

### Solution
Subtle row-level visual cues using CSS classes.

### Rules

| Condition | Visual Treatment |
|-----------|-----------------|
| Appointment in next 24 hours | Left border: 3px solid gold |
| Appointment today | Light gold background tint |
| Completed | Slightly muted text (opacity 0.8) |
| Cancelled | Strikethrough on date, opacity 0.5 |
| Awaiting action (Pending, nurse side) | Subtle pulse on the Confirm button |

### Implementation

Controllers pass additional data (or views compute from existing `Time` field):
```js
// In the EJS view:
<% const isToday = new Date(apt.Time).toDateString() === new Date().toDateString(); %>
<% const isUpcoming = new Date(apt.Time) - Date.now() < 86400000 && new Date(apt.Time) > Date.now(); %>
<tr class="<%= status === 'Cancelled' ? 'row-cancelled' : '' %> <%= isToday ? 'row-today' : '' %> <%= isUpcoming ? 'row-upcoming' : '' %>">
```

**CSS:**
```css
.row-today { background-color: rgba(212, 168, 67, 0.05); }
.row-upcoming { border-left: 3px solid var(--accent-cyan); }
.row-cancelled { opacity: 0.5; }
.row-cancelled td:nth-child(3) { text-decoration: line-through; }
```

---

## Part E: First-Use Welcome Card

### Problem
New students see an empty dashboard with no guidance.

### Solution
Detect first-use state and show a dismissible welcome card.

### Detection
If `appointments.length === 0` and no symptom logs exist for the user, show the welcome card. Or simpler: use a `localStorage` flag (`campuscare_welcomed`).

### Design
Full-width card above the dashboard grid:
```
┌──────────────────────────────────────────────────────────┐
│  👋 Welcome to CampusCare, Seth!                    [✕]  │
│                                                          │
│  Here are 3 things you can do right now:                 │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Check    │  │ Book a   │  │ Explore  │               │
│  │ Symptoms │  │ Consult  │  │ Trends   │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────┘
```

Dismiss button sets `localStorage.setItem('campuscare_welcomed', '1')` and hides the card. Never shown again.

---

## Part F: Admin Table Actions — Kebab Menu

### Problem
Admin student/nurse tables have inconsistent inline Edit/Delete buttons with custom inline styles. They look different from action buttons elsewhere.

### Solution
Replace with a **three-dot kebab menu** (⋮) that opens a small dropdown with actions.

### Design
```
│ ...  │  ← kebab button (vertical dots)
├──────┤
│ Edit │  ← dropdown item (link)
│ Delete│  ← dropdown item (danger, with confirm)
└──────┘
```

### Implementation

**HTML per row:**
```html
<td class="table-actions">
  <button class="kebab-btn" onclick="toggleKebab(this)">⋮</button>
  <div class="kebab-menu">
    <a href="/management/admin/students/<%= s.StudentNumber %>/edit" class="kebab-item">Edit</a>
    <form action="/management/admin/students/<%= s.StudentNumber %>/delete" method="POST" onsubmit="return confirm('...')">
      <input type="hidden" name="_csrf" value="<%= csrfToken %>">
      <button type="submit" class="kebab-item kebab-danger">Delete</button>
    </form>
  </div>
</td>
```

**CSS:**
```css
.table-actions { position: relative; }
.kebab-btn {
  background: none; border: none; font-size: 1.4rem; cursor: pointer;
  color: var(--text-muted); padding: 4px 8px; border-radius: 4px;
  transition: background 0.2s;
}
.kebab-btn:hover { background: var(--bg-canvas); color: var(--text-dark); }
.kebab-menu {
  display: none; position: absolute; right: 0; top: 100%;
  background: var(--surface-white); border: 1px solid var(--border-color);
  border-radius: 8px; box-shadow: var(--shadow-md); min-width: 120px;
  z-index: 100; overflow: hidden;
}
.kebab-menu.open { display: block; }
.kebab-item {
  display: block; padding: 10px 16px; font-size: 0.85rem; color: var(--text-dark);
  text-decoration: none; border: none; background: none; width: 100%;
  text-align: left; cursor: pointer; transition: background 0.15s;
}
.kebab-item:hover { background: var(--bg-canvas); }
.kebab-danger { color: var(--status-danger); }
.kebab-danger:hover { background: #fef2f2; }
```

**JS:**
```js
function toggleKebab(btn) {
  // Close all others first
  document.querySelectorAll('.kebab-menu.open').forEach(m => m.classList.remove('open'));
  const menu = btn.nextElementSibling;
  menu.classList.toggle('open');
}
// Close on click outside
document.addEventListener('click', e => {
  if (!e.target.closest('.table-actions')) {
    document.querySelectorAll('.kebab-menu.open').forEach(m => m.classList.remove('open'));
  }
});
```

**Dark mode:**
```css
[data-theme="dark"] .kebab-menu { background: #2d3748; border-color: #475569; }
[data-theme="dark"] .kebab-item { color: #f1f5f9; }
[data-theme="dark"] .kebab-item:hover { background: #374151; }
[data-theme="dark"] .kebab-danger:hover { background: #3b1a1a; }
```

---

## Part G: Micro-interactions

### G1 — Button Press Feedback
```css
.btn:active, .action-btn:active { transform: scale(0.96); }
```

### G2 — Dashboard Card Hover Lift
```css
.dashboard-grid .content-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.dashboard-grid .content-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}
```

### G3 — Star Rating Pulse on Selection
```css
@keyframes starPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
.star-rating .star.just-selected {
  animation: starPulse 0.25s ease;
}
```
Apply `just-selected` class via JS on click, remove after animation ends.

### G4 — Form Input Focus Glow
Already exists (border-color change). Verify it's consistent across ALL form-control elements including selects and textareas.

### G5 — Table Row Hover Highlight
Already exists (`.data-table tr:hover`). Verify it's consistent in dark mode.

---

## Part H: Accessibility Quick Wins

### H1 — aria-label on Icon Buttons
```html
<button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
<button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Open navigation menu">
<button class="kebab-btn" aria-label="Actions menu">⋮</button>
```

### H2 — Focus-Visible Outlines
```css
:focus-visible {
  outline: 2px solid var(--accent-cyan);
  outline-offset: 2px;
}
/* Remove default outline for mouse users */
:focus:not(:focus-visible) { outline: none; }
```

### H3 — Skip-to-Content Link
```html
<!-- First element in body (in header partial) -->
<a href="#main-content" class="skip-link">Skip to content</a>
```
```css
.skip-link {
  position: absolute; top: -40px; left: 0;
  background: var(--accent-cyan); color: var(--primary-navy);
  padding: 8px 16px; z-index: 99999; font-weight: 600;
  transition: top 0.2s;
}
.skip-link:focus { top: 0; }
```
Add `id="main-content"` to the `<main>` element.

### H4 — Form Error aria-describedby
For validation errors shown below form fields:
```html
<input id="email" aria-describedby="email-error" ...>
<span id="email-error" class="form-error" role="alert">Invalid email format</span>
```

### H5 — Colour Contrast Check
Verify gold accent (#d4a843) against white backgrounds meets WCAG AA (4.5:1 for text). The current gold may fail on white — consider darkening to #b8922e for text usage while keeping #d4a843 for decorative elements (buttons, badges where the text is dark navy).

---

## Part I: Empty State Enhancements

### Current empty states are basic "No X yet" text. Enhance with:

| Page | Enhanced Empty State |
|------|---------------------|
| Nurse dashboard (no appointments) | "No patients scheduled. Your next available slot is [first available from grid]." |
| Student appointments (none) | Already good (has CTA button) |
| Symptom history (empty) | "No symptom checks recorded. Try the Symptom Checker to get personalised recommendations." |
| Admin reports (no data period) | Show greyed-out placeholder chart shape with "No data for this period" overlaid |
| Meet Our Staff (no nurses) | Already handled |
| Review Nurse (all reviewed) | "You've reviewed all available nurses. Thank you for your feedback!" |

---

## Part J: Consistent Spacing & Rhythm Audit

### Rules to enforce globally:
- Content card padding: `24px` (all)
- Content card margin-bottom: `24px` (between cards)
- Section heading (h2 inside card): `margin-bottom: 16px`, `padding-bottom: 8px`, `border-bottom: 1px solid`
- Form group margin-bottom: `16px`
- Data table cell padding: `10px 12px`
- Button height: `.btn` = 40px, `.action-btn` = 32px (always)
- Action button min-width: `80px` (always)

### Process
One CSS audit pass to remove all inline `style="padding: 4px 10px; font-size: 0.75rem;"` from view files and replace with proper classes.

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | CSS: micro-interactions (G1-G5), focus-visible, skip-link | Low |
| 2 | CSS: toast notifications + JS | Low |
| 3 | CSS: step indicator + booking form JS integration | Medium |
| 4 | JS: sidebar active state detection | Low |
| 5 | CSS + views: row contextual styling (today, upcoming, cancelled) | Low |
| 6 | Views + JS: kebab menu for admin tables (students + nurses) | Medium |
| 7 | JS + view: first-use welcome card (localStorage dismissible) | Low |
| 8 | Views: toast triggers on success actions (query param reading) | Medium |
| 9 | CSS: spacing/rhythm audit + inline style removal | Medium |
| 10 | Views: accessibility attributes (aria-label, skip-link, describedby) | Low |
| 11 | Views: enhanced empty states | Low |
| 12 | CSS: colour contrast adjustment for gold text | Low |

---

## Files Touched

| Category | Files |
|----------|-------|
| CSS | `public/css/style.css` |
| New JS | `public/js/toast.js` |
| Modified JS | `public/js/sidebar.js` |
| Views (booking) | `views/consultations/book.ejs` |
| Views (admin) | `views/admin/students.ejs`, `views/admin/nurses.ejs` |
| Views (tables) | `views/consultations/index.ejs`, `views/nurse/dashboard.ejs` |
| Views (dashboard) | `views/index.ejs` |
| Views (partials) | `views/partials/header.ejs`, `views/partials/footer.ejs` |
| Controllers | Any that redirect on success (add `?toast=message` param) |

---

## HCI Principles Applied

| Principle | Implementation |
|-----------|---------------|
| **Visibility of system status** (Nielsen #1) | Toast notifications, step indicator, active sidebar |
| **Match between system and real world** (Nielsen #2) | Star ratings use familiar 5-star metaphor |
| **User control and freedom** (Nielsen #3) | Dismissible welcome card, close modals anytime |
| **Consistency and standards** (Nielsen #4) | Kebab menu pattern, unified button sizes, spacing rhythm |
| **Error prevention** (Nielsen #5) | Confirm dialogs on destructive actions, disabled submit until valid |
| **Recognition rather than recall** (Nielsen #6) | Sidebar active state shows current location |
| **Aesthetic and minimalist design** (Nielsen #8) | Kebab menu hides rarely-used actions, cleaner rows |
| **Fitts's Law** | Action buttons meet minimum touch target (32px height, 80px width) |
| **Pre-attentive processing** | Row colours signal urgency without reading |
| **Progressive disclosure** | Welcome card for new users, step indicator reveals next action |
