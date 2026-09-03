# Phase 30 — The UI Haul ("Calm Clinical Glass")

A full visual + layout overhaul that **preserves all backend logic and functionality** and keeps the existing information architecture, while transforming the look: restrained liquid glass, a calm breathing gradient background, layout archetypes (no more "everything's a card"), soft Motion One animation, a floating glass shell (no topbar), and a rebuilt immersive health map.

**Authority:** `.kiro/steering/ui-design.md` (design law) · `.kiro/design-refs.md` (reference cache) · `.kiro/steering/tech.md` (stack + constraints).

## Guiding constraints
- **Backend untouched** wherever possible. This is views + CSS + a little vanilla JS. The only backend touches: the map/location rework (30G) and wiring `appointments`/data the dashboard already needs.
- **Vanilla only.** New client libs: Motion One + MapLibre GL (loaded like Chart.js). No React/Tailwind/build step.
- **Never break the site between phases.** The token layer + upgraded `.content-card` shift the whole app in 30A; every later phase migrates one cluster to its archetype. Un-migrated pages keep working (they just look "in-between").
- **Every phase**: light + dark + reduced-motion + mobile, AA contrast, no console errors.

## Sub-phase sequence (each independently shippable)

| Phase | Title | Risk | Essence |
|-------|-------|------|---------|
| **30A** | Foundation & Breathing Background | Low | Add glass/motion/space tokens, the fixed breathing-gradient layer, load Motion One + reduced-motion switch, upgrade `.content-card` to glass. Instant global "feel" shift, zero layout change. |
| **30B** | The Shell | Med | Sidebar → floating glass rail; **remove topbar** → floating identity chip + theme toggle; glass footer. One clean nav restructure. |
| **30C** | Dashboards | Low | Home + admin reports + nurse dashboard → `.layout-dashboard` (hero + responsive glass grid + entrance/hover motion). |
| **30D** | Focused Flows | Med | Symptom checker, booking, auth pages, profile, review → `.layout-focused` single-column glass. |
| **30E** | Feeds & Split Views | Med | My Appointments, Meet Our Staff → profile, admin CRUD tables → `.layout-feed`/`.layout-split`, glass tables. |
| **30F** | Immersive: Video Call | Low | Strip the box; Daily fills the view; glass controls float over it. |
| **30G** | Immersive: The Health Map + Location Rework | High | Retire Leaflet → MapLibre GL + MapTiler theme-matched tiles; beautiful heat/choropleth of Gqeberha symptom reports; standalone immersive page; **rework how we store/collect location** (see `phase-30G-map-plan.md`). |
| **30H** | Polish | Low | Charts restyle (bklit-inspired), empty states, loading shimmers, cross-page consistency + a11y + perf sweep, dark-mode tuning. |

## Execution order & rationale
Tokens (30A) must land first — everything else reads them. Shell (30B) next so navigation is settled before page work. Then page clusters by archetype (30C→30E). Immersive pages (30F, 30G) last among features because they're the biggest departures. Polish (30H) closes it. **30G is the highest-risk / highest-reward** (new lib + DB change) — it has its own detailed plan.

## Files in this plan
- `phase-30-plan.md` (this)
- `phase-30A-plan.md` … `phase-30H-plan.md` (per sub-phase)
- `phase-30G-map-plan.md` (detailed map + location rework — referenced by 30G)
- `phase-30-assets.md` (what the user provides + per-phase actions)

## What the user provides (summary — full list in phase-30-assets.md)
- **MapTiler key** ✅ (in `.env`), origin-restricted to localhost for dev.
- **Stock nurse photos** (3 + placeholder) — for 30E.
- **Confirm icon direction** (recommend vendoring Lucide SVGs) — for 30B/30C.
- Optional transparent logo PNG/SVG — for 30B.
