# Phase 30 — Fixup 2 (Real Glass + Living Background)

**Nature:** pure CSS retune of `public/css/style.css` (+ aurora markup already in `header.ejs`/`auth-header.ejs`). No backend, no new libraries. Governed by `steering/ui-design.md` + `design-refs.md`. Continue on `gui`.

**Why:** Fixup 1 lowered glass alpha but the result still reads **flat, uniform, and — in light mode — basically like plain light mode** (no glassiness visible). Root cause is two linked problems:
1. The **background isn't rich/colourful enough** for the blur to refract → glass has nothing to "glassify," so it looks like a grey panel. This is worst in **light mode**, where the aurora is nearly invisible.
2. The **glass recipe itself is flat** — a uniform frosted fill + the *same* diagonal reflection stripe stamped on every block (cookie-cutter, fake).

Fix both together: **make the breathing background POP** (esp. light mode) so there's something to see through, **and** rebuild the glass to look like a *lit pane* (see-through, luminous directional rim, soft corner bloom) instead of frosted paper.

---

## Reference analysis (from user's 8 images — glass DNA, colour ignored)
What all the liked references share:
1. **Genuinely see-through** — you can read the scene/colour behind every panel. Blur softens but doesn't hide.
2. **Luminous, *directional* rim** — the edge glows, brighter on one side (top-left) and fading around; not a flat 1px border. **This is the #1 "real glass" cue.**
3. **Off-centre directional lighting** — a soft bright bloom in one corner that falls off across the surface (lit "from somewhere"), NOT a centred/uniform sheen.
4. **No repeated diagonal stripe** — none of the refs have the cookie-cutter sweep we currently stamp on every card. Reflection = luminous rim + corner bloom, which naturally varies per panel.
5. **Deep, soft, single drop shadow** → panels clearly float.
6. **Big soft radius (~20–28px) + roomy padding.**
7. **Nested elements are *more* transparent, not solid** — inner bars/chips/tracks are layered translucent fills, not opaque sub-boxes.
8. **Low internal contrast, light text on the tint** with a faint text-shadow for legibility.

CSS mapping:
| Look | Technique |
|---|---|
| See-through + refraction | low bg alpha + `backdrop-filter: blur(16–28px) saturate(~1.3)` |
| **Luminous directional rim** | masked/gradient border (bright top-left → dim bottom-right) via a pseudo-element ring; + `box-shadow: inset 0 1px 0 rgba(255,255,255,.6)` lit top edge |
| Directional corner bloom | a single **radial-gradient anchored top-left**, low opacity (replaces the linear diagonal sweep) |
| Float | `box-shadow: 0 20px 50px -12px rgba(0,0,0,.35–.5)` |
| Nested transparency | inner els get their own lighter/darker translucent fill |

> **Rim implementation note:** `border-image` gradients don't clip to `border-radius`. Use a pseudo-element ring with `padding:1px; background:<gradient>; -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;` (a.k.a. the "gradient border" mask trick) so the luminous rim follows rounded corners. Verify render before rolling out.

---

## Item A — LIVING breathing background (the big one for light mode) `[CSS + tokens]`
**Goal:** the aurora must feel *alive* and, in **light mode, POP with deep brand colours** — right now light mode looks like plain white. Give the glass something rich to refract.

**Palette (use the whole thing + one complement):**
- `--brand-blue #141c2b`, `--secondary-blue #132e51`, `--brand-yellow #ffcc00`, `--secondary-yellow #f9b22a`
- **Complementary accent: teal/cyan (~`#12b9b9`)** — sits opposite yellow on the wheel, harmonises with the navies, adds the "alive" lift without clashing. (One complement only, per brief.)

**Plan:**
- Rework `#app-aurora` to **5–6 blobs** (`.aurora-blob b1..b6`) drawn from all five colours above, staggered slow drifts (24/30/36/42/48s) + mixed easings so it never visibly loops.
- **LIGHT MODE — make it POP (key ask):** this is the headline. Currently light aurora alphas are ~0.06–0.12 (invisible). Raise them dramatically:
  - Change `--bg-base` from near-white (`#eef3fa`) to a **soft tinted canvas** (e.g. a very light blue-grey) so blobs read against it.
  - Push blob alphas up to ~**0.25–0.45** (yellow/teal/blue) so real colour blooms show through the glass. The blobs should be clearly visible washes of navy-blue, yellow, and teal — a "colourful frosted" backdrop, not a white page.
  - Consider a subtle base **gradient mesh** (not flat `--bg-base`) — e.g. a faint diagonal from cool-blue-tint → warm-cream-tint — so even between blobs the canvas has life.
- **DARK MODE:** already has more presence; enrich to match (blues intensify, yellow/teal glow softly, keep calm). Alphas ~0.10–0.20.
- Keep GPU-only (`transform`/`opacity`), `prefers-reduced-motion` → static (but still colourful) fallback.
- **Readability guard:** blobs stay *behind* glass; text always sits on a glass surface (Item B ensures enough tint for AA). The canvas itself carries no body text.

**Success check:** with glass panels on screen in **light mode**, you can clearly see coloured background blooms shifting *through/behind* the frosted panels — it should be obvious it's glass, not a white card.

## Item B — Real see-through glass recipe `[CSS]`
Rebuild `.glass` + `.content-card` (tokens cascade to all glass surfaces):
- **Transparency:** keep alpha low enough to see the aurora (light ~0.40–0.50 tint floor for contrast; strong ~0.55–0.62 for nav/modals). Tune so colour shows through but text stays AA.
- **`backdrop-filter: blur() saturate(~1.3)`** — saturate makes refracted colour richer ("liquid").
- **Luminous directional rim** (pseudo-element mask ring, bright top-left → faint bottom-right) + inset lit top edge. This replaces the flat uniform border.
- **Corner bloom:** ONE soft radial-gradient anchored top-left (low opacity) **instead of** the full-width diagonal `::after` sweep. **Remove the repetitive diagonal sweep entirely.**
- **Deeper soft float shadow.**
- Keep `.content-card--solid` opt-out (dense tables/perf) — no rim/bloom on it.

## Item C — Apply recipe to every glass surface `[CSS]`
Because they read the tokens, updating `.glass`/`.content-card` cascades — but audit + fix any surface that hardcodes or needs the rim/bloom treatment: floating rail, identity chip, theme toggle, stat tiles, staff cards, symptom tokenbar + tags, auth-card, dash-hero, modals, dropdowns, toasts, immersive overlays, progress bar. Ensure none still carry the old diagonal sweep or a flat uniform border.

## Item D — Nested transparency `[CSS]`
Inner sub-elements shouldn't be solid boxes on glass. Make translucent, layered fills for: consultation-progress track/nodes, stat-tile inner values, symptom tokenbar (already glass — verify), booking nurse-card inner bits, any `background: var(--bg-canvas)`/solid chip sitting inside a glass parent. Darker-translucent for wells, lighter-translucent for raised chips.

## Item E — Light-reactive glass buttons (Uiverse "tough-tiger" style) `[CSS + tiny JS optional]`
- Secondary/tertiary buttons: translucent glass + luminous rim + a **hover sheen that sweeps across** (a moving highlight) rather than a static gradient. Pure CSS (`::before` sheen translated on `:hover`) — optional pointer-follow via the already-loaded Motion One.
- `.btn-primary` keeps solid brand-yellow (CTA punch) **+** a subtle sheen sweep on hover/press.
- Press feedback: gentle scale + brightened rim.

## Item F — (carry-overs / keep intact)
Everything from Fixup 1 stays: quad student grid, widened layouts, campus→nurse filter, removed left-accent bars, unified symptom pills, checkmark fix, auth toggle bottom-right. This fixup does **not** regress those.

---

## Files
- `public/css/style.css` — Items A–E (tokens: glass + aurora rework; recipe; buttons; nested fills). Bulk of work.
- `views/partials/header.ejs` / `auth-header.ejs` — add blob spans if going from 4 → 6 (markup only).
- (No backend, no view logic.)

## Sequencing
1. **Aurora + `--bg-base` (Item A)** first — get the living, POPPING light-mode background in. Verify it's visibly colourful behind glass.
2. **Glass recipe (Item B)** — rim + bloom + transparency; verify see-through over the new aurora, both themes.
3. **Cascade audit (Item C)** + **nested transparency (Item D)**.
4. **Buttons (Item E).**
5. Verify all in **light + dark + reduced-motion + mobile**, AA contrast on glass.

## Verify (all)
- **Light mode background clearly POPS** with deep brand colours (navy/yellow/teal blooms) visible behind glass — no longer "just plain light mode".
- Glass is visibly **see-through** with a **luminous directional rim** + soft corner bloom; **no repeated diagonal stripe** anywhere.
- Panels float (soft deep shadow); nested elements are translucent, not solid.
- Buttons are glassy + **light-reactive on hover**; primary keeps punch.
- Both themes; reduced-motion static-but-colourful; text AA on every glass surface; no perf jank (blur limited to floating surfaces).

## Open decisions
- **Teal complement exact hue** — proposing ~`#12b9b9`. OK, or prefer a cooler cyan / warmer aqua?
- **Light-mode intensity** — how bold? Proposing "clearly colourful frosted" (blob alpha ~0.3). Want it even bolder (Vision-Pro vivid) or a touch calmer?
- **Base canvas** — flat tinted colour vs subtle gradient mesh. Proposing subtle mesh for extra life.
