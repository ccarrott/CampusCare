# Phase 30 — Fixup 1 (Glass Realism, Layout Balance & Booking Logic)

**Nature:** hotfix + polish pass over the shipped 30A–30F UI haul. Mostly CSS/token + view work; **one real backend change** (booking campus→nurse link). Governed by `steering/ui-design.md` + references in `design-refs.md`. No new libraries.

**Branch:** continue on `gui`.

---

## Guiding principle (from `design-refs.md`)
Liquid glass = *translucent surface + `backdrop-filter: blur()` + a faint specular top-edge highlight + hairline border + soft drop shadow*, layered over a moving backdrop so the blur has something to refract. Current build reads too solid — **light mode especially barely looks glassy**. This fixup pushes realism up (more transparency, better highlights/reflections) **without** tipping into "cheap over-blur." Target ranges: blur 14–22px, bg alpha ~0.45–0.6 (lower than now, esp. light), 1px border at 0.18–0.25 white alpha, layered highlight + inner sheen.

---

## Item 1 — Glass realism overhaul (tokens + recipe) `[CSS]`
**Problem:** not see-through enough; light mode isn't glassy; highlights/reflections look flat/fake.

**Plan — retune the glass token layer + `.glass`/`.content-card` recipe:**
- **Light mode:** drop `--glass-bg` alpha (≈0.62 → ~0.50) and `--glass-bg-strong` (≈0.78 → ~0.62) so the aurora actually shows through. Raise `--glass-border` alpha slightly for a crisper edge.
- **Realistic lighting — layer three effects on glass surfaces (via `::before`/`::after` + box-shadow):**
  1. **Top specular highlight** (existing `--glass-highlight`) — strengthen + tighten to the top ~40%.
  2. **Inner sheen / rim light:** add `box-shadow: inset 0 1px 0 rgba(255,255,255,.5)` (light) / lower alpha (dark) for a lit top rim, plus a faint `inset 0 -1px 0 rgba(0,0,0,.04)` bottom.
  3. **Diagonal reflection sweep:** a very subtle fixed linear-gradient (135deg, white 0.06 → transparent) on `::after` to fake an environment reflection. Static (no perf cost); optional slow drift under motion-OK.
- **Saturation:** add `backdrop-filter: blur() saturate(1.2)` so refracted colour feels richer (the "liquid" look) — keep saturate modest.
- Keep dark mode glass darker + slightly less blur (per ui-design.md §8). Re-tune dark alphas to match the new light feel.
- **Deliverable:** every existing `.glass`/`.content-card`/rail/chip/stat-tile/staff-card inherits the richer recipe automatically (they already use the tokens). Spot-fix any surface that hardcoded a solid bg.

**Guardrail:** AA contrast floor — where lowering alpha risks text legibility (dense cards, tables), keep a higher local alpha or the `--solid` opt-out. Verify light + dark.

## Item 2 — More life in the breathing background `[CSS]`
**Problem:** want more movement / more complexity at the same calm.

**Plan:** evolve `#app-aurora` from 2 blobs → **3–4 drifting radial blobs** with staggered durations (24s / 30s / 38s) and slightly different easings, so the composition never repeats predictably (more complex) while staying slow/calm. Optionally add a 4th ultra-slow hue-rotate/opacity pulse. Keep GPU-only (`transform`/`opacity`), theme-matched stops, and the full `prefers-reduced-motion` static fallback. No readability impact (stays behind glass).

## Item 3 — Consultation progress checkmark bug `[view — quick fix]`
**Problem:** literal `&#10003;` text shows in the progress-bar nodes.

**Root cause:** `views/partials/consult-progress.ejs` outputs the checkmark via `<%= ... '&#10003;' ... %>` (escaped), so the entity is printed literally.

**Plan:** switch the node render to unescaped (`<%- %>`) for the glyph branch, OR use a real `✓` unicode char in the string. Keep the number-vs-check logic identical. Trivial, isolated.

## Item 4 — Login: move theme toggle back to bottom-right `[view/CSS]`
**Problem:** on auth pages the light/dark button should sit bottom-right (it currently rides in the 30B floating cluster styling context).

**Plan:** auth pages use `auth-footer.ejs` (separate from the app footer) and already render their own `#themeToggle`. Because 30B restyled `.theme-toggle` to a static in-cluster control, the auth one lost its fixed corner. **Fix:** give the auth theme toggle a fixed bottom-right position again — scope via `.auth-page .theme-toggle { position: fixed; bottom/right: var(--space-4); }` (or a dedicated class) so only auth pages pin it, leaving the app's top-right cluster untouched. Keep glass styling + `#themeToggle` id (darkmode.js binds to it).

## Item 5 — Student dashboard: responsive 1×4 / 2×2 / 4×1 grid `[CSS]`
**Problem:** the 4 student cards (Symptom, Book, Appointments, Trends) should snap to sensible column counts by viewport, not arbitrary reflow.

**Plan:** the student home currently uses the generic `.dashboard-grid` (`auto-fit minmax(260px,1fr)`) which can leave odd 3-across rows. Add a **scoped variant** (e.g. `.dashboard-grid--quad` on the student grid) with explicit breakpoints:
- wide desktop (≥1200px): `repeat(4, 1fr)` → 4×1
- tablet/mid (≥640px & <1200px): `repeat(2, 1fr)` → 2×2
- mobile (<640px): `1fr` → 1×4
Only applies to the student 4-card grid; nurse/admin grids keep `auto-fit`. Keeps hover-lift + reveal.

## Item 6 — Glassify tags, buttons & other components `[CSS]`
**Problem:** tags, buttons, and misc controls still look solid; want glass everywhere; and the **selected-symptom pills in the token bar must match the display symptom tags exactly** (same shape + size).

**Plan:**
- **Buttons:** add a glassy treatment to secondary/tertiary buttons (`.btn-secondary`, pills, filter buttons) — translucent bg + blur + hairline + press sheen (KokonutUI "particle/sheen" cue, done tastefully). **`.btn-primary` stays solid brand-yellow** (it's the accent/CTA — glass would weaken it). Add a subtle top-sheen on press to all buttons.
- **Symptom tags:** unify the two tag renderings. The category selection tags (`.symptom-tag`?) and the token-bar selected pills (`.symptom-summary-tag` / token pill) must share **one** shape/size/padding/radius spec. Make the token-bar pill reuse the display-tag's exact dimensions (audit both classes; converge to a single `.symptom-tag` base + a `--selected` modifier for the ×-remove affordance).
- **Other:** status badges, pills/tags, legend swatches, dropdowns → glassify where they sit on glass, keeping token-driven colours + AA contrast.

**Guardrail:** don't glass form input *fields* (they stay near-solid for contrast per ui-design.md); glass goes on containers/buttons/tags.

## Item 7 — Widen content / optimise horizontal balance `[CSS]`
**Problem:** too much empty space left/right of blocks; wants dynamic, wider use of space.

**Plan — retune the archetype max-widths + page gutters:**
- `.container`/`.page-wrapper`: increase max-width and reduce oversized side padding so content breathes wider on large screens (fluid, clamp-based: e.g. `width: min(100% - 2*gutter, ~1200–1320px)`).
- `.layout-focused` (760px) and `.layout-feed` (920px): nudge up modestly (focused ~820px, feed ~1040px) — still readable, less wasted margin.
- Use `clamp()` gutters so the balance scales with viewport rather than fixed 24–30px.
- Verify the floating rail offset (30B) + new widths don't cause horizontal overflow at any breakpoint.

**Guardrail:** don't over-widen reading columns (forms/text) past comfortable line length; this is about trimming *dead* side space, not stretching prose.

## Item 8 — Booking: campus selection must filter nurses `[BACKEND + view]` ⚠️ real logic
**Problem:** picking a campus (Physical flow) doesn't change the nurse dropdown — it lists all nurses.

**Current state (verified):**
- `getAvailableNurses()` → `SELECT StaffNumber, FirstName, LastName FROM Nurse` (no Campus, no filter).
- `book.ejs` renders **all** nurses server-side into `#staffNumber`; the campus `change` handler only reveals the nurse step, never filters it.
- Booking campus values are `South / North / Second Avenue / Missionvale / Bird Street / George`; nurse `Campus` values are `South Campus / North Campus / …` — **mismatch to reconcile.**

**Plan:**
- **Model:** add `Campus` to `getAvailableNurses()` select (`SELECT StaffNumber, FirstName, LastName, Campus FROM Nurse`). (Cheap, also useful for the profile card.)
- **View (client-side filter, no new endpoint):** embed each nurse's campus as a `data-campus` attribute on the `<option>` (or build the options in JS from a small embedded array). On campus `change`, rebuild/enable only the `<option>`s whose campus matches; reset selection + downstream steps.
- **Value normalisation:** map booking campus → nurse campus (e.g. `South` → `South Campus`). Implement a small lookup so the comparison is correct. **Decision needed:** align the booking dropdown values to the canonical `CAMPUSES` labels (preferred — single source of truth) OR keep a translation map. Plan recommends **aligning booking `<option>` values to the full campus names** used on the Nurse record, so no mapping is needed and it matches `constants.js CAMPUSES`.
- **Online flow unaffected:** online consultations skip campus (nurse list stays full).
- **Empty state:** if no nurse serves the chosen campus, show "No nurses at this campus yet — try another campus or book Online."

**Guardrail:** `handleBooking` still validates server-side; this is a UX filter, not a security control. Ownership/CSRF untouched.

## Item 9 — Remove left-edge accent bars site-wide `[CSS + views]`
**Problem:** the `border-left: 3–4px solid <colour>` accent strip on things (nurse profile card in booking, sidebar active link, upcoming rows, alert callouts, disclaimer) — remove this concept everywhere.

**Plan — audit & remove/replace every left-accent:**
- **CSS:** `.sidebar-link.active` (30B added `inset 3px 0 0 brand-yellow`) → replace the left inset bar with a **fill + soft glow** active treatment (no edge bar). `.row-upcoming` `border-left` → remove; convey "upcoming" via a subtle glass tint/badge instead. (`.sidebar-link:hover ... border-left` legacy rule too.)
- **Inline in views:** remove `style="border-left: …"` from — `book.ejs` (nurse profile card, recent-booking alert), `recommendations.ejs` (hospital result card, tier-2 alert, disclaimer), `admin/reports.ejs` (pending-reviews section). Replace emphasis with glass tint / heading colour / badge as appropriate so meaning isn't lost.
- Sweep for any other `border-left` accents introduced across phases.

**Guardrail:** don't lose the *signal* those bars carried (danger/warning/active) — re-express via badge, tint, or icon, keeping status colours token-driven.

## Item 10 — General "high-end glass everywhere" pass `[CSS]`
Umbrella polish tying items 1/6/9 together: modals, dropdowns, toasts, the identity menu, map overlays (30G-ready), progress bar nodes, kebab menus → consistent liquid-glass recipe (blur + highlight + hairline + soft shadow), consistent radii (`--radius-glass`), consistent hover (lift + glow) and press (sheen) micro-interactions via Motion One where JS-driven. Cross-check against `refero`/`nodenza` for "does this look like a real high-end app" (whitespace, one accent, soft shadows over hard borders).

---

## Files (anticipated)
- `public/css/style.css` — items 1, 2, 5, 6, 7, 9, 10 (bulk of the work: token retune, aurora, grid variant, glass buttons/tags, widths, remove accent bars, component polish).
- `views/partials/consult-progress.ejs` — item 3 (checkmark).
- `views/partials/auth-footer.ejs` and/or CSS — item 4 (theme toggle position).
- `views/index.ejs` — item 5 (student grid class).
- `views/student/symptom-form.ejs` — item 6 (unify tag/pill shape).
- `views/consultations/book.ejs` + `appointments.model.js` — item 8 (campus→nurse filter).
- `views/consultations/book.ejs`, `views/student/recommendations.ejs`, `views/admin/reports.ejs` — item 9 (remove inline border-left).

## Sequencing (safe, incremental)
1. **Glass token/recipe realism** (1) + **aurora** (2) — global feel, low risk.
2. **Quick view fixes:** checkmark (3), auth toggle (4).
3. **Layout:** student quad grid (5), widths/gutters (7).
4. **Components:** glass tags/buttons + unify pills (6), remove accent bars (9), general polish (10).
5. **Booking campus→nurse** (8) — the one logic change; test the Physical flow end-to-end.
6. Verify each in light + dark + reduced-motion + mobile; boot + smoke-test booking filter.

## Verify (all)
Glass visibly more see-through/realistic in **both** themes (esp. light); aurora richer but calm; no literal `&#10003;`; auth toggle bottom-right; student cards 1×4/2×2/4×1 at breakpoints; tags/buttons glassy + token-bar pills identical to display tags; wider balanced layouts, no overflow; **campus selection filters the nurse dropdown correctly** (Physical) with empty-state; no left-edge accent bars anywhere; AA contrast held.

## Open decisions for you
- **Item 8:** align booking campus `<option>` values to the canonical full campus names (recommended, no mapping) — OK? Or keep short values + a translation map?
- **Item 6:** confirm `.btn-primary` stays solid brand-yellow (glass only on secondary/tertiary) — agree?
- **Item 7:** target max content width ~1200–1320px on large screens — comfortable, or want it wider/edge-tighter?
