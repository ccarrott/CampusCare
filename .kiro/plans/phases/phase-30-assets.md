# Phase 30 — Asset & Setup Shopping List

Everything the UI Haul needs from **you** (the human), and what to do before/after each sub-phase. Decisions marked ⭐ block a phase until made.

## Accounts / keys
- ✅ **MapTiler key** — in `.env` as `MAPTILER_KEY`. In the MapTiler dashboard: **Allowed user-agent = empty**; **Allowed HTTP Origins =** `http://localhost:3000` + `http://localhost:*` for now; add your production domain before deploy. (Needed for 30G.)

## Images
### Nurse stock photos (⭐ needed for 30E)
- **3 portraits** for the seeded nurses + **1 neutral placeholder**:
  - `public/images/nurses/NUR001.jpg` — Sarah Jenkins
  - `public/images/nurses/NUR002.jpg` — David Khumalo
  - `public/images/nurses/NUR003.jpg` — Thandiwe Nkosi
  - `public/images/nurses/placeholder.jpg`
- **Specs:** square-ish, ≥400×400px, consistent style (same crop/lighting so the directory looks cohesive), professional/friendly clinical vibe. Free sources: Unsplash / Pexels ("nurse portrait", "healthcare professional portrait"). Match names to plausible representation where possible.
- If you'd rather not use real faces: say so and I'll design polished illustrated avatars instead (no assets needed from you).

### Logo (optional, nice-to-have for 30B)
- A **transparent PNG or SVG** NMU/CampusCare logo sits far better on the glass rail than the current `nmu-logo.jpg` (opaque square). Not blocking — I'll use the jpg with a mask if absent.

### Texture (optional)
- A subtle noise/grain PNG for glass realism — optional; I can generate grain in pure CSS instead.

## Icons — DECIDED: adopt Lucide ✅
- Vendor **Lucide** (free, MIT line SVGs) into `public/vendor/lucide/` (I source these). Inline as SVG so they inherit `currentColor` + theme.
- **Use them with restraint (user directive):** icons only where they add clarity — primary nav links, key actions, section headers, map/call controls, empty states. Pick **unique, intuitive** icons per concept (see mapping below).
- **Do NOT churn what already works:** leave the **profile dropdown** icons (👤 / 🚪) as-is; leave star ratings, tier dots, and other meaningful glyphs alone. No icon-for-icon's-sake.

### Proposed Lucide mapping (nav + key actions — refine at build)
| Concept | Lucide icon |
|---------|-------------|
| Dashboard / Home | `layout-dashboard` |
| Symptom Checker | `stethoscope` |
| OTC Recommendations | `pill` |
| Book Consultation | `calendar-plus` |
| My Appointments | `calendar-check` |
| Health Trends / Map | `map` (or `activity` for trends charts) |
| Meet Our Staff | `users` |
| Nurse clinical dashboard | `clipboard-list` |
| Manage Availability | `calendar-clock` |
| Admin reports | `chart-column` |
| Manage Students | `graduation-cap` |
| Manage Nurses | `heart-pulse` |
| Profile | `user` (keep existing dropdown emoji though) |
| Join video call | `video` |
| Nearest hospital (Tier 3) | `hospital` / `map-pin` |
| Search | `search` · Filter | `sliders-horizontal` · Sort | `arrow-up-down` |
| Success/empty states | contextual (`check-circle`, `inbox`, `calendar-x`) |
- One icon per concept, consistent across the app. Nav icons ~20–22px, inherit text colour, `aria-hidden` when paired with a text label.

## Fonts (optional)
- Currently system font stack (fine + fast). If you want a distinct feel, a single Google font (e.g. **Inter** or **Plus Jakarta Sans**) self-hosted in `public/fonts/`. Not blocking; say the word.

## Per-phase: what you do before / after
| Phase | Before | After (you review) |
|-------|--------|--------------------|
| 30A Foundation | nothing | Check the breathing bg + glass feel in both themes |
| 30B Shell | (optional) provide transparent logo; decide icons ⭐ | Confirm nav rail + floating controls feel right |
| 30C Dashboards | — | Eyeball hero + card motion |
| 30D Focused | — | Walk a booking + symptom check |
| 30E Feeds | **provide nurse photos** ⭐ | Check staff directory + profiles |
| 30F Video | — | Do a demo call, judge immersive feel |
| 30G Map | MapTiler origins set ✅; run `state:showcase`/`state:outbreak` to populate heat | Judge the heat map — the showpiece |
| 30H Polish | — | Final cross-app review, both themes, mobile |

## Notes
- Nothing here requires code from you — only assets + 2 small decisions (nurse imagery real-vs-illustrated, Lucide-vs-emoji).
- Reference inspiration (for your own browsing): liquidglassdesign.com, refero.design, nodenza.com, motion.dev, bklit.com, kokonutui.com — summarised in `.kiro/design-refs.md`.
