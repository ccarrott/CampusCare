# Phase 30E — Feeds & Split Views (`.layout-feed` / `.layout-split`)

**Goal:** lists and directories stop being identical boxes — they become clean glass feeds or master-detail splits. Introduces stock nurse photos. No backend changes (except reading photo paths).

## Scope
- **My Appointments** (`views/consultations/index.ejs`) — `.layout-feed`: consultation-progress band (29C rules kept) + a glass list/table of appointments with status, actions, join. Not a wall of cards.
- **Meet Our Staff** (`views/staff/index.ejs`) — `.layout-split` or a refined glass card grid: nurse cards now show **stock photos** (avatar → real portrait), campus badge, rating, 2-review preview, "View profile". Campus filter pills glassed.
- **Nurse profile** (`views/staff/nurse-profile.ejs`) — split/detail: photo + bio + rating hero, all approved reviews with filter/sort (29C kept).
- **Admin CRUD tables** (`views/admin/students.ejs`, `nurses.ejs`, `nurse-detail.ejs`, `student-view.ejs`) — glass tables, sortable headers (29A-era) kept, search kept, kebab actions glassed.

## Stock nurse photos
- Add `public/images/nurses/` with the 3 seeded nurses' photos + `placeholder.jpg`.
- Map nurse → photo by `StaffNumber` (e.g. `NUR001.jpg`) with graceful fallback to initial-avatar if missing. Keep the initial-avatar as the fallback component.

## `.layout-feed` / `.layout-split` (CSS)
`feed` = vertical stack of glass rows (varying content, not uniform boxes). `split` = sticky master list + detail pane on desktop, stacked on mobile.

## Guardrails
- Reviews stay anonymised ("Patient N"), approved-only for students (privacy principle).
- Sortable/search/pagination behaviours preserved.
- Photo fallback must never break the layout if an image is missing.

## Verify
Appointments feed + join states work; staff photos render (+ fallback); profile filters/sort work; admin tables sort/search; both themes; mobile stacks.
