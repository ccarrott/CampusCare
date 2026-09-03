> ⚠️ **SUPERSEDED (Phase 30 UI Haul).** This blueprint describes the *old* UI: solid navy sidebar, topbar with user info, two-column card grid, Leaflet-in-a-box map. The UI Haul replaces this with a floating glass shell (no topbar), layout archetypes, a breathing-gradient background, and a MapLibre immersive map.
>
> **Authoritative design doc now:** `.kiro/steering/ui-design.md`. Map: `.kiro/specs/next-phase/phase-30G-map-plan.md`. Kept below for historical reference only.

---

# (Historical) GUI Architecture & Component Blueprint (v2)

## 1. Layout Modes
- **Auth Layout** (unauthenticated): no sidebar/topbar, centered card. → *Haul: becomes centered glass card over the breathing background.*
- **App Layout** (authenticated): fixed sidebar + topbar + main content. → *Haul: floating glass rail, NO topbar (controls float), archetype-based main area.*

## 2. Sidebar Navigation — dark navy slab, circular gold logo, icon+text links, collapse toggle, role-aware. → *Haul: floating glass rail, same links/roles.*

## 3. Dashboard Card Grid — always 2 columns, large cards. → *Haul: `.layout-dashboard` = hero greeting + responsive glass card grid.*

## 4. Login Page — centered, no role dropdown, forgot/register links. → *Haul: unchanged behaviour, glass restyle.*

## 5. Nurse Calendar/Availability grid — weekly Available/Unavailable/Booked cells. → *Haul: glass restyle, tokens drive slot colours (already refactored).*

## 6. Notification Bell (topbar) — never implemented as a bell; browser notifications + toasts instead.

## 7. Health Trend Map — Leaflet + OSM, zones, heatmap, legend. → *Haul: REPLACED by MapLibre GL + MapTiler immersive map (Phase 30G).*

## 8. Admin CRUD Tables — searchable, row actions, add-new. → *Haul: glass tables + sortable headers (already added), `.layout-feed`.*

*(Original directory blueprint omitted — see steering/tech.md §3 for the current module layout.)*
