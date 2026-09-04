# Phase 30 — Fixup 4 (Header Wow, Sizing, Scrollbars, Photos, Polish)

> **Handoff note (new session):** This plan is self-contained. Context you need:
> - **Stack:** Node/Express 5 + EJS SSR + **vanilla JS + hand-written CSS only**. NO frameworks, NO Tailwind, NO build step, NO TypeScript. Only vanilla runtime libs allowed (Motion One + MapLibre loaded like Chart.js). See `.kiro/steering/tech.md`.
> - **Design law:** `.kiro/steering/ui-design.md` (Calm Clinical Glass) + reference cache `.kiro/design-refs.md`. Glass = translucent + `backdrop-filter: blur() saturate()` + luminous rim + soft bloom (NOT a repeated diagonal stripe). Everything must work **light + dark**, respect `prefers-reduced-motion`, keep AA contrast.
> - **Single stylesheet:** `public/css/style.css` (a `:root` token layer + `[data-theme="dark"]` overrides drive everything). **Never hardcode a colour/space/radius a token covers.**
> - **Branch:** we've been working on `gui`. Prior UI work: Phase 30A–F + Fixup 1/2/3 (all on `gui`, some uncommitted). Verify with `git status` before starting.
> - **Run/verify:** `node src/app.js` (port 3000). Logins — student `s227921577`/`password123`, nurse `NUR001`/`nurse123`, admin `ADM001`/`admin123`. If a change doesn't reflect, kill stale node: `Stop-Process -Name node -Force`. Use temp `.ps1`/`.mjs` smoke scripts and delete them after.
> - **EJS gotcha (learned in Fixup 3):** never put `%>` inside an EJS `<% %>` block comment — use `//`, not `/* ... %> ... */`, or it closes the tag early.
> - **Assets:** new SVGs added in `public/icons/`: `logout.svg`, `darkmode.svg`, `lightmode.svg` (join the existing `home, symptoms, book, appointment, trend, meet, profile, report, manage.nurse, manage.student`). Inline via the existing `views/partials/icon.ejs` map (add the 3 new keys — strip their fixed `style="color:…"`/`width`/`height` so theme drives them).

**Nature:** CSS + view polish, plus **one real backend feature** (admin nurse-photo upload — needs file-upload middleware + a photo storage/lookup change). Continue on `gui`.

---

## Item 1 — "Wow" dashboard greeting header (drop the block) `[view + CSS + font]`
The greeting (`#dashboardGreeting` in `views/index.ejs`, inside `.dash-hero`) currently sits in a glass block. Make it a **big, fancy, unique standalone header** — no bounding block behind the greeting itself.
- **Drop the `.dash-hero` glass box** around the greeting (or make the greeting break out of it). The greeting should feel like a large editorial title floating over the aurora, not a card.
- **Pick a distinctive display font** for the greeting only (headings elsewhere stay on the system stack). Load a **self-hostable / open font** — recommend a Google Fonts display face served via `<link>` in `header.ejs` (allowed — it's a static asset, like a CDN script). Candidates: *Clash Display, Fraunces, Space Grotesk, Sora, Instrument Serif* — choose one that reads premium + friendly for a health app (recommend **Fraunces** (characterful serif) or **Space Grotesk** (modern geometric); designer picks — make it "wow").
- Big size (clamp, responsive), tasteful weight, maybe a subtle brand-tinted gradient text-fill (NOT the removed shimmer marquee — static or a very soft one-time reveal). Keep the time-aware greeting logic + the consultation progress band below it.
- Ensure it works light + dark and doesn't reintroduce a "block."

## Item 1b — Dynamic single-source glass lighting (pointer-reactive) `[CSS + tiny vanilla JS]`
Make the glass on **main-content blocks** all catch light from **one shared point** that follows the cursor — so every panel reflects the same "lamp" from its own position on screen (like real glass under one light). This replaces the current baked-in top-left bloom that's identical on every card (the "cookie-cutter/fake" look).

**Scope:** main focus elements only — `.content-card`, `.dash-hero`, `.stat-tile`, `.glass-note`, `.staff-card`, booking grid, modals. **EXCLUDE the sidebar/rail** and the floating controls (they keep their own static treatment).

**Approach — Option B (pointer-reactive) with a static fallback:**
- A tiny vanilla JS module (`public/js/glass-light.js`, loaded like `motion.js`; ~15–25 lines) listens to `mousemove` on the document, **throttled via `requestAnimationFrame`**, and writes the pointer's viewport coords to two CSS custom properties on `:root`: `--light-x`, `--light-y` (in px).
- Glass surfaces render their highlight as a **radial-gradient anchored at the shared light point, translated into each element's own coordinate space**. Cleanest technique: a lighting overlay pseudo-element (reuse/replace the existing `::before` bloom) whose gradient centre is `calc(var(--light-x) - <element left>) calc(var(--light-y) - <element top>)`. Since we can't read an element's offset in pure CSS, use a **`position: fixed` radial-gradient overlay** trick: give the glass a `::before` with `background: radial-gradient(600px circle at var(--light-x) var(--light-y), rgba(255,255,255,.5), transparent 40%)` and `background-attachment: fixed` — a *fixed* background is positioned relative to the **viewport**, so all cards share one coherent light centred at (`--light-x`,`--light-y`) automatically, each showing only the slice over its own area. Pointer JS just updates the two vars → the whole scene relights together. (This merges Option A's fixed-bg technique with B's live pointer point — coherent AND reactive, minimal cost.)
- **Intensity:** subtle — a soft white bloom (~0.35–0.5 alpha light mode, lower dark), plus optionally a faint brand tint. It should read as "lit," not a spotlight.
- **Fallbacks / guards:**
  - No pointer / touch devices: leave `--light-x/--light-y` at a sensible default (e.g. top-center: `50vw`, `-10vh`) so it looks like a fixed overhead light. Don't attach mousemove if `matchMedia('(pointer: coarse)')`.
  - `prefers-reduced-motion: reduce`: **don't track the pointer** — pin to the static default point (still coherent, just not moving).
  - Perf: only update on `rAF`; set the vars once per frame; `will-change` not needed on the fixed bg. Excludes the many-elements-per-frame problem because all cards read the same two `:root` vars (no per-card JS).
- **Interaction with the current recipe:** this **supersedes the static top-left `--glass-bloom` `::before`** on in-scope elements. Keep the luminous rim (`::after` masked gradient) as-is (or also make it faintly light-aware if easy). Verify the masked-rim `::after` and the new lighting `::before` don't conflict (they're separate pseudos — fine).

**Feasibility:** yes — pure CSS custom props + `background-attachment: fixed` + a rAF-throttled `mousemove`. No framework, fits the stack, ~1 small JS file.

**Verify:** moving the mouse relights all main-content glass coherently from one point; sidebar unaffected; touch/reduced-motion shows a stable overhead light; 60fps, no jank; both themes; contrast still AA.

## Item 2 — Global size-down (developed at 80% zoom) `[CSS]`
Everything was tuned at 80% browser zoom, so at 100% it's oversized. **Scale everything down a touch** for more breathing room — *small* reduction, not drastic.
- Cleanest single lever: reduce the root font size (`html { font-size: 15px; }` from the implicit 16px — ~94%, or `93.75%` to mimic the 80%→ feel partially) so all `rem`-based sizing shrinks proportionally. Then spot-check fixed-`px` spots.
- Alternatively/additionally trim generous paddings (cards `24px`, page-wrapper clamps) by ~1 step. Aim: **~8–12% smaller overall**, more whitespace, nothing cramped.
- Re-verify: sidebar width, glass paddings, hero, tables, buttons all still balanced at 100% zoom. Test at 100%.

## Item 3 — No visible scrollbars anywhere `[CSS]`
Hide scrollbars site-wide while keeping scroll functional.
- Global: `* { scrollbar-width: none; }` (Firefox) + `*::-webkit-scrollbar { display: none; }` (Chrome/Safari/Edge) + `-ms-overflow-style: none;`. Apply to `html, body` and any scroll containers (`.availability-grid-wrapper`, `.main-content`, sidebar, modals, kebab menus, tables).
- Keep overflow scrolling working (content still scrolls, just no visible bar).
- Verify nothing becomes unscrollable/trapped; check the sidebar, immersive pages, long tables.

## Item 4 — Top-right identity chip: remove menu functionality + first-name only `[view]`
In `views/partials/navbar.ejs` the `.floating-controls` → `#identityChip` currently is a button opening a Profile/Logout dropdown menu (`.identity-menu`).
- **Remove the dropdown functionality** — no menu, no Profile/Logout items (those live in the sidebar now). Make the chip a **static, non-interactive display** (or a plain link to `/profile` at most — but brief says "remove that functionality", so make it non-clickable display).
- **Show first name only** (not "F. Lastname"). Compute `user.firstName` (fallback to `user.name`/role for admin). Keep the avatar initial + first name.
- Remove the now-unused `toggleIdentityMenu` JS + `.identity-menu` markup + its click-out/escape handlers. Clean the emoji glyphs in that menu (item 9 anyway).

## Item 5 — Glassify the booking timetable picker `[CSS]`
The booking availability grid (`.availability-grid` in `book.ejs`, styled in `style.css`) uses solid navy headers (`.availability-grid th { background: var(--primary-navy) }`) and solid slot cells.
- Give the grid a **glass treatment**: translucent glass header row (like the data-table header from Fixup 3), translucent grid container, slot cells as translucent tints (available/unavailable/booked keep their semantic slot colours but as glass-friendly translucent fills so the aurora shows through the picker). Selected slot stays crisp/obvious.
- Keep it readable + the click-to-select behaviour intact; both themes (dark overrides exist at `[data-theme="dark"] .availability-grid th`).

## Item 6 — Remove "--" placeholders in dropdowns `[views]`
Many `<select>`s have a disabled first option like `-- Select type --`, `-- Select campus --`, `-- Select a nurse --`, `-- No assignment --`, `-- Select --`. Replace the `--  … --` text with clean placeholder text (no dashes), e.g. `Select type`, `Select campus`, `Select a nurse`, `No assignment`, `Select`. Keep them as the disabled/selected default option. **Audit all views** — known spots: `book.ejs` (type, campus, nurse, language), `admin/nurse-form.ejs` (campus, clinic), `admin/student-form.ejs`, `nurse/dashboard.ejs` (appointment select), availability views, symptom form (duration/trajectory if present).

## Item 7 — Nurse profile photos WAY bigger `[CSS + views]`
- **Meet Our Staff directory** (`staff/index.ejs`, `.staff-photo` ~52px) and **nurse profile** (`staff/nurse-profile.ejs`, `.staff-photo-lg` ~88px): make them **much larger** — directory card photo e.g. 96–120px, profile hero e.g. 160–200px. Keep circular crop + the initial-avatar fallback (`onerror`) intact. Re-balance the card/hero layout for the larger image (both themes).
- Pure CSS/view change — no backend. (Admin photo-upload was considered and **dropped** from this fixup.)

## Item 8 — Remove the yellow bar on the "same symptoms…" prompt `[CSS/view]`
The prefill prompt (`#prefillPrompt` in `symptom-form.ejs`) currently uses `.glass-note glass-note--accent` — the `--accent` variant adds an `inset 3px 0 0 yellow` left bar. **Remove the yellow bar:** either drop the `--accent` modifier (use plain `.glass-note`) or remove the inset-bar rule from `.glass-note--accent`. Keep the glass note itself.

## Item 9 — Remove ALL emoji everywhere `[views]`
Purge decorative emoji/pictographic entities site-wide. Replace with the inline Lucide-style SVGs (`icon.ejs`) where an icon adds meaning, or nothing where decorative. **Known locations (from audit):**
- `views/partials/navbar.ejs` — identity menu `&#128100;`/`&#128682;` (removed with item 4 anyway).
- `views/partials/footer.ejs` — demo button `&#128276;`.
- `views/partials/nurse-appt-row.ejs` — patient-history link `&#128196;` → use an icon or text.
- `views/student/recommendations.ejs` — `&#128680;` (ER siren), `&#128205;` (location pin) → SVG or text.
- `views/student/symptom-history.ejs` — empty-state `&#129657;`.
- `views/staff/index.ejs` — empty-state `&#128105;&#8205;&#9877;&#65039;`.
- `views/consultations/index.ejs` — `&#10003; Rated`, empty-state `&#128197;`.
- `views/consultations/call.ejs` — `&#128247;` (camera), `&#10005;` (leave ✕ — a plain ✕ is arguably fine but replace with icon/text for consistency).
- `views/nurse/dashboard.ejs` — `&#127909;` (video), `&#128465;` (trash), empty-state `&#128197;`.
- `views/error.ejs` — `&#128683;`/`&#128270;`/`&#9888;` status glyphs.
- `consult-progress.ejs` — `&#10003;` checkmark (this one is a functional check inside a node; a check SVG or keep as a tick — decide; brief says remove emoji, so use a small check SVG or CSS checkmark).
- **Approach:** add any needed new icons to `icon.ejs` (e.g. `alert`, `location`, `video`, `trash`, `file`, `check`, `search`) — OR reuse existing ones. Keep meaning; don't leave blanks where an affordance is needed.

## Item 10 — Dashboard cards: faded background SVG (matching sidebar icons) `[view + CSS]`
The dashboard action cards (`views/index.ejs`) had their emoji icons removed in Fixup 3. Now add the **same sidebar SVG** for each card as a **large, faded, offset background watermark** — barely visible but present.
- Each card gets its concept's icon (Symptom Checker→`symptoms`, Book→`book`, My Appointments→`appointment`, Trends→`trend`, Clinical Dashboard→`appointment`, Availability→`book`, Profile→`profile`, Reports→`report`, Manage Students→`manage.student`, Manage Nurses→`manage.nurse`) as a big SVG positioned bottom-right, offset (partially clipped), very low opacity (~0.05–0.08), `currentColor`/brand-tinted, `pointer-events:none`, behind the text (z-index).
- Implement: inline the icon via `icon.ejs` into a `.card-watermark` element inside each `.content-card`, sized ~120–160px, absolutely positioned. Ensure the card keeps `position:relative; overflow:hidden` and text stays above. Light + dark tuned (barely visible in both).

---

## Files (anticipated)
- `public/css/style.css` — items 1 (hero header + font), 2 (root size-down), 3 (scrollbar hide), 5 (glass booking grid), 8 (remove accent bar), 10 (card watermark), 7a (bigger photo sizes).
- `views/partials/header.ejs` — item 1 (font `<link>`).
- `public/js/glass-light.js` (NEW) — item 1b (pointer-reactive light; load in `footer.ejs` like `motion.js`). `views/partials/footer.ejs` — add the script tag.
- `views/index.ejs` — item 1 (hero header markup), item 10 (card watermarks).
- `views/partials/navbar.ejs` — item 4 (chip: remove menu, first-name), item 9 (emoji).
- `views/partials/icon.ejs` — add `logout`/`darkmode`/`lightmode` + any new (alert/location/video/trash/file/check) keys.
- `views/partials/footer.ejs`, `nurse-appt-row.ejs`, `error.ejs`, `consult-progress.ejs` — item 9 emoji purge.
- `views/student/recommendations.ejs`, `symptom-history.ejs`, `symptom-form.ejs` (item 8) — emoji + accent bar.
- `views/staff/index.ejs`, `staff/nurse-profile.ejs` — item 7 bigger photos + emoji.
- `views/consultations/index.ejs`, `call.ejs`, `nurse/dashboard.ejs` — emoji.
- `views/admin/nurse-form.ejs` — `-- --` placeholders (item 6).
- `views/consultations/book.ejs`, `admin/student-form.ejs`, others — item 6 placeholders.

> Note: no backend/DB changes in this fixup (admin photo-upload dropped) — it's all CSS + views + one font `<link>`.

## Sequencing (safe, incremental)
1. **Global feel:** root size-down (2), hide scrollbars (3) — instant, low-risk, verify at 100% zoom.
2. **Header:** load font + build the wow greeting (1).
2b. **Dynamic glass lighting (1b):** fixed-bg radial + `--light-x/y` rAF pointer JS, scoped to main-content glass — do after the glass recipe is stable; test perf.
3. **Quick view polish:** identity chip (4), `--` placeholders (6), remove accent bar (8), glass booking grid (5).
4. **Emoji purge (9)** + add new icon keys to `icon.ejs`.
5. **Dashboard card watermarks (10)** (needs the icons wired).
6. **Bigger nurse photos (7)** — pure CSS/view.
7. Verify: 3 roles, light + dark, reduced-motion, mobile, 100% zoom; no scrollbars; no emoji; all pages 200.

## Verify
- Greeting is a big, fancy, block-less header in a distinctive font; works both themes; no shimmer marquee.
- Moving the mouse relights all main-content glass coherently from one shared point; sidebar unaffected; touch/reduced-motion falls back to a stable overhead light; 60fps.
- At 100% browser zoom the whole app feels right-sized with more whitespace (nothing cramped or huge).
- No visible scrollbars anywhere; scrolling still works everywhere (sidebar, tables, modals, immersive).
- Top-right chip shows first name only, non-interactive (no dropdown); no leftover menu JS/markup.
- Booking timetable picker is glassy (header + cells translucent) yet readable; selection crisp; both themes.
- No `-- … --` dashes in any dropdown; clean placeholders remain the default.
- Nurse photos are much bigger (directory + profile); circular crop + initial-avatar fallback still work.
- No yellow left bar on the "same symptoms" prompt.
- Zero emoji anywhere; meaningful ones replaced with SVG/text.
- Dashboard cards show a large, faded, offset background icon matching the sidebar icon — barely visible, present, both themes.

## Open decisions (for the executing session)
- **Greeting font:** designer's pick — recommend Fraunces or Space Grotesk. Confirm or override.
- **Size-down magnitude:** `html { font-size: 15px }` (~94%) as the starting point — adjust to taste after seeing it.
- **consult-progress checkmark (item 9):** replace the `&#10003;` with a small check SVG vs. keep a CSS tick — recommend a check SVG in `icon.ejs`.
