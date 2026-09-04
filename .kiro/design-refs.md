# Design References — cached summary (Phase 30 UI Haul)

Cached so implementation phases don't re-fetch. These are **visual references** — we re-implement their look in our own hand-written CSS + vanilla JS (no React/Tailwind imports; see steering/tech.md UI-library policy).

---

## 1. Liquid Glass Design — https://liquidglassdesign.com/resources
Curated glassmorphism / Apple "liquid glass" references + AI style prompts. Also links `liqui.design` (React glass components — reference only).
**Take-aways for us:**
- Liquid glass = translucent surface + `backdrop-filter: blur()` + subtle inner highlight + hairline border + soft drop shadow. The "liquid" feel comes from a faint specular highlight along the top edge and gentle scale/blur transitions on hover.
- Restraint matters: blur ~12–20px, background alpha ~0.5–0.65, 1px border at ~0.15–0.2 white alpha. Over-blurring or heavy saturation looks cheap.
- Layer over a *moving/colourful* backdrop so the blur has something to refract — hence our breathing gradient.

## 2. Refero — https://refero.design/
Large real-product UI screenshot library (design inspiration/patterns). Use as a "how do real apps lay this out" lookbook.
**Take-aways:** generous whitespace, clear hierarchy, one accent colour used sparingly, soft shadows over hard borders, content-first layouts (not everything boxed). Reinforces our layout-archetype approach (immersive / focused / dashboard / feed-split).

## 3. Nodenza — https://nodenza.com/
Modern SaaS/landing aesthetic reference (clean, animated, gradient-forward).
**Take-aways:** smooth entrance animations on scroll, gradient mesh backgrounds, floating glass nav, big readable type, tasteful motion. Confirms "calm breathing gradient + floating glass shell" direction.

## 4. Motion One — https://motion.dev/docs
**THE animation library we will actually use** (vanilla JS, ~5KB, no framework). API: `animate(el, keyframes, options)`, `inView(el, cb)` for scroll entrances, `stagger()`, spring/easing options.
**Usage pattern (vanilla, via CDN/vendored):**
```js
import { animate, inView, stagger } from 'motion';
inView('.reveal', (el) => { animate(el, { opacity: [0,1], transform: ['translateY(16px)','none'] }, { duration: 0.5, easing: 'ease-out' }); });
animate('.card', { scale: 1.02 }, { duration: 0.2 }); // hover lift
```
- Gate everything behind `prefers-reduced-motion`.
- Prefer `transform`/`opacity` (GPU) — never animate layout props.

## 5. Bklit — https://bklit.com/
Chart/data-viz component aesthetic (React/Tailwind — reference only). Clean, minimal charts.
**Take-aways for our Chart.js:** thin gridlines, muted axis labels, one accent series colour, rounded bars, generous padding, tooltip as a small glass card. Apply to our doughnut/line charts on trends + admin reports.

## 6. KokonutUI — https://kokonutui.com/
React + Tailwind + Motion component kit (reference only). Notable looks to emulate natively: **liquid-glass-card**, **shimmer-text**, **particle-button**, animated background paths.
**Take-aways:** shimmer text = animated gradient background-clip on headings (sparingly, e.g. hero greeting); glass cards with hover glow; buttons with a subtle sheen on press.

---

## MapTiler (map basemap) — https://docs.maptiler.com/
- Vanilla usage via **MapLibre GL JS**: `new maplibregl.Map({ container, style: 'https://api.maptiler.com/maps/<STYLE>/style.json?key=<KEY>' })`.
- Theme-matched styles: **`streets-v2` / `basic-v2`** (light) and **`streets-v2-dark` / `basic-v2-dark`** (dark) — swap `style` when the app theme toggles.
- Key is public (browser) → protect via **HTTP-origin restriction** in the MapTiler dashboard (localhost during dev, real domain in prod). Not via secrecy.
- Data layers: add our `CampusZone` polygons as a GeoJSON source, render a `fill` layer (choropleth, opacity/colour by severity) + optional `heatmap` layer for outbreak density.

## 7. Uiverse — https://uiverse.io/elements?search=glassmorphism
Community gallery of open (MIT) HTML/CSS UI elements — **directly usable technique reference** (plain CSS, no framework). Great for glass buttons/cards/toggles.
**Liked reference — glass button:** `https://uiverse.io/MuhammadHasann/tough-tiger-78` (MIT). The look we want for buttons:
- **Light-reactive sheen** — a highlight that *moves*/responds (hover or pointer), not a static baked gradient.
- Bright crisp top-edge rim + soft **inner glow**, layered colored translucent tint (not flat white fill), blur carrying the see-through.
- We re-implement in vanilla CSS; the pointer-follow sheen can use the Motion One we already load. (Uiverse renders CSS client-side, so copy the snippet from the site's code panel when implementing.)

## 8. Hype4 Glassmorphism Generator — https://hype4.academy/tools/glassmorphism-generator
Tool that outputs the canonical glass recipe (background alpha, blur, 1px border, shadow). Use to sanity-check token values. Confirms: translucent bg + `backdrop-filter: blur()` + subtle border + soft shadow.

## Zentak Glass UI — https://github.com/akilakeshara/zentak-glass-ui  (REFERENCE ONLY — cannot adopt as a library)
Nice-looking glassmorphism kit, BUT it's **React + Tailwind CSS**, shipped as an npm package with `react`/`react-dom` peer deps and a Tailwind build requirement. **This violates our no-framework / no-Tailwind / no-build-step contract (tech.md §9).** We do NOT install or import it. It's a *visual* reference like KokonutUI. Everything desirable from it (see-through, light-reactive, layered glass) is achievable in our own hand-written CSS.

## Glass DIRECTION correction (user feedback, Fixup 2)
Current glass reads **too flat + repetitive**. Target instead:
- **See-through + light-reactive** (Uiverse/hype4 feel), not a flat frosted slab.
- **NO identical diagonal reflection sweep on every block** — it looks fake/cookie-cutter. Keep only a subtle top-edge highlight on static panels; make the moving **sheen/reflection an *interaction* effect** (hover / pointer-move) on interactive surfaces (buttons, hoverable cards).
- Add a faint **colored translucent tint + inner glow + crisp bright rim**; let higher transparency + blur do the "real glass" work.
- Buttons: adopt the Uiverse "tough-tiger" light-reactive glass button style (vanilla CSS + optional Motion One pointer sheen).

## Our constraints (always apply)
- Vanilla JS + EJS SSR + hand-written CSS only. Motion One + MapLibre GL are the only new client libs (both vanilla, loaded like Chart.js).
- Everything must work in light AND dark mode, respect `prefers-reduced-motion`, and keep AA contrast on glass.
