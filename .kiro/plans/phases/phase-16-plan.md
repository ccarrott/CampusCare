# Phase 16: Final Polish — Split Into Sub-Phases

## Recommendation: Split into 3 sub-phases

Phase 16 has ~14 items spanning visual fixes, features, and security. Splitting makes it:
- Easier to test incrementally
- Reduces risk of one broken change blocking others
- Lets you review/deploy after each batch

---

## Phase 16A: Quick Visual Fixes (30 min)
*Low-risk, high-impact cosmetic changes. No logic changes.*

| # | Task | Time |
|---|------|------|
| 1 | Remove red/amber `::after` border on `.slot-booked` cells | 1 min |
| 2 | Make all 4 dashboard card buttons `btn-primary` (same colour) | 2 min |
| 3 | Sidebar logo bigger (70px circle, larger text, subtle glow) | 5 min |
| 4 | Remove burger icon — sidebar toggles on click of empty space | 10 min |
| 5 | Fix date format in appointment dropdowns (use readable `en-ZA` format) | 5 min |
| 6 | Sidebar links match dashboard cards per role | 5 min |

---

## Phase 16B: Features & Functionality (60 min)
*New behaviour and views. Requires testing.*

| # | Task | Time |
|---|------|------|
| 7 | Profile section for ALL roles (admin/nurse currently broken) | 15 min |
| 8 | Password change form on profile page | 10 min |
| 9 | Prevent duplicate ratings (hide already-rated appointments) | 10 min |
| 10 | Server-side duplicate timeslot prevention | 5 min |
| 11 | Teams link opens `msteams:` protocol if available | 3 min |
| 12 | Admin sidebar dropdown arrows for Reports / Trends | 15 min |

---

## Phase 16C: Charts & Dark Mode (60 min)
*Visual enhancements requiring new libraries and CSS work.*

| # | Task | Time |
|---|------|------|
| 13 | Dark mode toggle (sun/moon, localStorage, CSS variables) | 30 min |
| 14 | Chart.js pie chart for Symptoms by Category (smart labels) | 15 min |
| 15 | Chart.js bar chart for Admin appointments per day/week | 15 min |

---

## Phase 16D: Input Validation & Security (30 min)
*Hardening. Requires testing all forms.*

| # | Task | Time |
|---|------|------|
| 16 | Student number format validation (starts with 's' + digits) | 5 min |
| 17 | Email format validation on registration | 3 min |
| 18 | Password min length enforcement (already exists, verify all paths) | 3 min |
| 19 | Booking: server-side validate date is future + weekday | 3 min |
| 20 | Trim whitespace on all text inputs before processing | 5 min |
| 21 | Admin CRUD: validate required fields + formats | 5 min |
| 22 | Sanitize all remaining text inputs (XSS strip) | 5 min |

---

## Totals

| Sub-Phase | Effort | Risk | Dependencies |
|-----------|--------|------|--------------|
| 16A (Quick fixes) | ~30 min | Low | None |
| 16B (Features) | ~60 min | Medium | 16A done first (sidebar changes) |
| 16C (Charts + Dark) | ~60 min | Low | Independent |
| 16D (Validation) | ~30 min | Low | Independent |

**My recommendation:** Execute in order A → B → C → D. But C and D are independent so you could skip one or do them in parallel.

Total remaining work: ~3 hours of implementation.
