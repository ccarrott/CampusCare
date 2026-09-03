---
inclusion: always
---

# CampusCare Design Language — "Calm Clinical Glass"

The authoritative visual spec for all UI work. If a page or component contradicts this doc, this doc wins. Reference cache for inspiration sources: `.kiro/design-refs.md`.

## 0. Essence

A **health app should feel calm, trustworthy, and alive.** We layer **restrained liquid-glass surfaces** over a **slow breathing gradient** in the brand palette. Motion is soft and purposeful. The brand yellow is an **accent**, never a flood. Nothing flashy — reassuring.

Three pillars:
1. **Glass, restrained** — translucent surfaces with subtle blur + hairline borders, only on *elevated* things.
2. **Alive, calm** — a fixed breathing gradient behind everything; gentle entrance/hover motion.
3. **Layout follows content** — four archetypes, not a universal card grid.

---

## 1. Token Layer (extend `public/css/style.css` `:root` and `[data-theme="dark"]`)

Keep all existing brand tokens. ADD these. **Never hardcode a value a token covers.**

### Brand (unchanged, canonical)
`--brand-blue #141c2b` · `--secondary-blue #132e51` · `--brand-yellow #ffcc00` · `--secondary-yellow #f9b22a` · `--accent-text-yellow #8a5a00`

### Glass (NEW)
```css
:root {
  --glass-bg:        rgba(255, 255, 255, 0.62);
  --glass-bg-strong: rgba(255, 255, 255, 0.78);   /* nav, modals */
  --glass-border:    rgba(255, 255, 255, 0.55);
  --glass-hairline:  rgba(15, 23, 42, 0.06);       /* bottom edge on light */
  --glass-blur:      16px;
  --glass-blur-strong: 22px;
  --glass-shadow:    0 8px 30px rgba(15, 23, 42, 0.10);
  --glass-highlight: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0) 40%);
}
[data-theme="dark"] {
  --glass-bg:        rgba(30, 41, 59, 0.55);
  --glass-bg-strong: rgba(20, 28, 43, 0.72);
  --glass-border:    rgba(255, 255, 255, 0.12);
  --glass-hairline:  rgba(255, 255, 255, 0.08);
  --glass-shadow:    0 8px 30px rgba(0, 0, 0, 0.45);
  --glass-highlight: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0) 40%);
}
```

### Breathing background stops (NEW)
```css
:root {
  --aurora-1: rgba(255, 204, 0, 0.10);   /* warm yellow glow */
  --aurora-2: rgba(19, 46, 81, 0.14);    /* secondary blue */
  --aurora-3: rgba(20, 28, 43, 0.05);
  --bg-base:  #f4f7fb;                     /* canvas under the aurora (light) */
}
[data-theme="dark"] {
  --aurora-1: rgba(255, 204, 0, 0.08);
  --aurora-2: rgba(19, 46, 81, 0.40);
  --aurora-3: rgba(10, 15, 26, 0.6);
  --bg-base:  #0b1120;
}
```

### Motion + spacing + elevation (NEW)
```css
:root {
  --motion-fast: 0.18s; --motion-base: 0.32s; --motion-slow: 0.6s;
  --ease-soft: cubic-bezier(0.22, 1, 0.36, 1);      /* ease-out-expo-ish */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* gentle overshoot */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:24px; --space-6:32px; --space-7:48px; --space-8:64px;
  --elev-flat: none;
  --elev-raised: var(--shadow-md);
  --elev-glass: var(--glass-shadow);
  --radius-glass: 18px;   /* glass surfaces are a touch rounder than --radius-lg */
}
```

---

## 2. The Breathing Background

A single fixed layer behind everything (`body::before` or a `#app-aurora` div). 2–3 large radial-gradient blobs that **drift + scale slowly** (~24–30s loop), theme-matched. GPU-only (`transform`, `opacity`). Disabled under reduced-motion (falls back to a static gradient).

```css
#app-aurora {
  position: fixed; inset: 0; z-index: -1; overflow: hidden;
  background: var(--bg-base);
}
#app-aurora::before, #app-aurora::after {
  content: ""; position: absolute; width: 60vmax; height: 60vmax; border-radius: 50%;
  filter: blur(60px); will-change: transform;
}
#app-aurora::before { background: radial-gradient(circle, var(--aurora-1), transparent 60%); top: -10%; left: -10%; animation: breathe1 28s var(--ease-soft) infinite alternate; }
#app-aurora::after  { background: radial-gradient(circle, var(--aurora-2), transparent 60%); bottom: -15%; right: -10%; animation: breathe2 32s var(--ease-soft) infinite alternate; }
@keyframes breathe1 { from { transform: translate(0,0) scale(1); } to { transform: translate(8vw, 6vh) scale(1.15); } }
@keyframes breathe2 { from { transform: translate(0,0) scale(1.1); } to { transform: translate(-6vw, -8vh) scale(1); } }
@media (prefers-reduced-motion: reduce) {
  #app-aurora::before, #app-aurora::after { animation: none; }
}
```
Rule: the aurora is **calm** — low opacity, slow, blurred. It must never reduce text legibility. All content sits on glass/solid surfaces above it.

---

## 3. Elevation Model — when things float vs sit flat

| Elevation | Use for | Treatment |
|-----------|---------|-----------|
| **Flat** | dense content, table rows, inline text, form fields | no blur; solid/near-solid surface; `--elev-flat` |
| **Raised** | standard cards, list items | soft shadow `--elev-raised`; may be lightly translucent, no blur if perf-sensitive |
| **Glass (floating)** | nav rail, floating controls, modals, hero cards, map/video overlays, toasts | `--glass-bg` + `backdrop-filter: blur(var(--glass-blur))` + `--glass-border` + `--glass-shadow` + top highlight |

**Performance rule:** `backdrop-filter` is limited to *floating* elements. Do NOT blur every card on a dense page. A dashboard of 8 cards can use raised (shadow) glass without live blur; the nav rail and modals get real blur.

---

## 4. Layout Archetypes

Every page declares ONE. Implement as body/main classes + partials.

### `.layout-immersive` — video call, health map
Full-bleed, edge-to-edge, **no card**. The content (video / map) fills the viewport minus the nav rail. Controls, legends, and panels are **floating glass overlays** positioned over it (corners / edges). No `page-wrapper`, no `.content-card`.

### `.layout-focused` — symptom checker, booking, auth, profile edit, review
Centered single column (max-width ~640–760px), generous vertical rhythm, progressive disclosure. One glass "sheet" or a few stacked glass sections. Feels like a guided flow, not a dashboard.

### `.layout-dashboard` — home, admin reports, nurse dashboard
**Hero zone** (greeting / key metric, optional shimmer heading) then a responsive **glass card grid** (`repeat(auto-fit, minmax(260px, 1fr))`, not forced 2-col). Cards have hover-lift.

### `.layout-feed` / `.layout-split` — My Appointments, Meet Our Staff → profile, admin tables
`feed` = a vertical list of glass rows/cards (not identical boxes). `split` = master list + detail pane (staff directory → nurse profile; map list → zone detail).

---

## 5. Component Recipes

### Glass card (`.glass` utility + existing `.content-card` upgraded)
```css
.glass {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-glass);
  box-shadow: var(--glass-shadow);
  position: relative;
}
.glass::before { /* top specular highlight */
  content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background: var(--glass-highlight);
}
```
`.content-card` is upgraded to use glass tokens so the whole app shifts at once, but heavy/dense pages may opt to `--elev-raised` instead of live blur.

### Buttons — keep `.btn`/`.btn-primary`/etc. Add: subtle press (`transform: scale(0.98)`), hover sheen. Primary stays brand-yellow on navy text.
### Inputs — glass on the *container* (token bar, cards), but fields themselves stay near-solid for contrast + focus ring `--brand-yellow`.
### Modal / dropdown / toast / identity chip — glass-strong (`--glass-bg-strong`, `--glass-blur-strong`).
### Pills/tags, progress bar, status badges — keep current, retune to sit on glass (already token-driven).

---

## 6. The Shell (Phase 30B)

- **Sidebar → floating glass rail.** Same role-aware links, collapse behaviour, NMU logo. Detached from the edge (margin), glass, floats over the aurora.
- **Topbar removed.** The identity chip (Initial. Surname → Profile/Logout) and the theme toggle become **floating glass controls** (top-right corner). Reclaims vertical space, less chrome.
- Footer → minimal glass strip (or removed on immersive pages).

---

## 7. Motion Rules (Motion One)

Load Motion One (vanilla) like Chart.js. A single `public/js/motion.js` bootstraps:
- **Entrance:** `inView('.reveal', …)` → fade + translateY(16px→0), `--motion-base`, `--ease-soft`. Stagger grids.
- **Hover lift:** interactive cards scale ~1.02 + shadow bump, `--motion-fast`.
- **Spring:** progress-bar advance, map fly-to, modal open use `--ease-spring`.
- **Page feel:** subtle content fade on load.
- **Global kill-switch:** if `matchMedia('(prefers-reduced-motion: reduce)')`, skip all Motion calls (CSS also guards). Never animate layout props — transform/opacity only.

---

## 8. Dark Mode

Every token above has a dark value. Rules: glass gets *darker + slightly less* blur; aurora blues intensify, yellow softens; keep AA contrast. The map + charts swap to dark styles. Test every screen in both.

---

## 9. Accessibility (non-negotiable)

- **Contrast floor under glass:** text must hit AA — if a glass surface risks it, raise `--glass-bg` alpha locally.
- **`:focus-visible`** rings on all interactive elements (brand-yellow).
- **Keyboard**: nav rail, dropdowns, token input, modals all keyboard-operable + Escape to close.
- **Reduced motion**: breathing bg + all entrances/springs disabled.
- Icons that convey meaning need text/aria labels.

---

## 9b. Icons (Lucide)

- Icon set: **Lucide** (MIT line icons), vendored in `public/vendor/lucide/`, inlined as SVG so they inherit `currentColor` + theme.
- **Restraint:** icons only where they add clarity — primary nav, key actions, section headers, map/call controls, empty states. One **unique, intuitive** icon per concept (see mapping in `phase-30-assets.md`), consistent across the app.
- **Don't churn what works:** leave the profile-dropdown glyphs, star ratings, tier dots, and other meaningful existing glyphs as-is. No icon-for-icon's-sake, no decorative clutter.
- Sizing ~20–22px for nav, inherit text colour, `aria-hidden="true"` when paired with a visible text label; give a `title`/aria-label to icon-only buttons.

## 10. Do / Don't

**Do:** use tokens; pick an archetype; blur only floating surfaces; keep yellow as accent; test light+dark+reduced-motion.
**Don't:** wrap everything in a card; blur every element (perf); hardcode hex/px; flood brand yellow; animate width/height/top/left; let the aurora hurt readability.
