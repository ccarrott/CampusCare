# Phase 30C — Dashboards (`.layout-dashboard`)

**Goal:** turn the role dashboards + admin reports + nurse dashboard into the `dashboard` archetype — a **hero zone** + responsive **glass card grid** with entrance/hover motion. No backend changes.

## Scope
1. **`.layout-dashboard` archetype** (CSS): hero zone (greeting / key metric, optional shimmer heading) + `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))` (replaces the forced 2-col `.dashboard-grid`). Cards get hover-lift + `.reveal` entrance (staggered).
2. **Student/Nurse/Admin home** (`views/index.ejs`): hero greeting (time-aware, already have the data) becomes a proper hero; cards restyled; consultation progress bar (already there) sits in the hero band for students.
3. **Admin reports** (`views/admin/reports.ejs`): metric cards → glass stat tiles; charts get the 30H bklit-style pass previewed here (thin gridlines, accent series). Video-consultation stats tiles included.
4. **Nurse dashboard** (`views/nurse/dashboard.ejs`): rating summary → hero stat; Upcoming/Previous sections stay (from 29C) but as glass; keep the demo buttons.

## Files
- `public/css/style.css` (`.layout-dashboard`, hero, stat tiles, shimmer heading)
- `views/index.ejs`, `views/admin/reports.ejs`, `views/nurse/dashboard.ejs`
- `public/js/motion.js` (stagger helper for card grids — usage only)

## Guardrails
- Grid must be responsive `auto-fit` (retire the rigid 2-col rule from the old gui spec).
- Dashboards are card-dense → prefer `--elev-raised` glass (shadow, no live blur) on the many cards; reserve real blur for the hero.
- Keep all existing links/actions/data bindings.

## Verify
Each role's dashboard shows hero + responsive glass grid with soft entrance; hover-lift; charts readable in dark; reduced-motion static; mobile stacks.
