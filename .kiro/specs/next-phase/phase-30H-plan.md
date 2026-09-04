# Phase 30H — Polish

**Goal:** the final consistency + delight pass once every page is on the new system. No new features — refinement.

## Scope
1. **Charts restyle (bklit-inspired):** Chart.js doughnut/line on trends + admin reports → thin gridlines, muted axis labels, one accent series colour, rounded bars, glass tooltip. Dark-mode variants.
2. **Empty states:** every list/feed gets a calm, on-brand empty state (icon + line + CTA) instead of bare "No X".
3. **Loading shimmers:** skeleton/shimmer placeholders for async areas (map load, nurse grid, appointment fetch) instead of blank flashes.
4. **Micro-interactions:** button sheen on press, card hover-lift consistency, toast entrance, progress-bar spring. All via tokens (Motion One optional/being phased out — prefer CSS transitions with `--ease-soft`/`--ease-spring`), reduced-motion safe. NOTE: the top-right identity chip was **removed**; ignore any "identity-chip open" interaction.
5. **Cross-page consistency audit:** spacing rhythm (`--space-*`), heading scale, glass usage (blur only where allowed), yellow-as-accent discipline, radius consistency.
6. **Accessibility sweep:** `:focus-visible` everywhere, keyboard paths (nav, dropdowns, token input, modals, map controls), aria labels on icon-only buttons, contrast check on all glass surfaces in both themes.
7. **Performance sweep:** count live `backdrop-filter` surfaces per page (cap them), ensure animations are transform/opacity only, no layout shift, 60fps on the map + dashboards; lazy-init the map only on its page.
8. **Dark-mode tuning:** final per-screen pass — glass alpha/blur, aurora intensity, chart/map styles.

## Files
- `public/css/style.css` (consistency), `public/js/*` (chart configs, shimmers), all views (empty states as needed)

## Verify
Every page consistent in both themes + reduced-motion + mobile; charts match the design language; no blank loading flashes; a11y passes (keyboard + contrast); perf is smooth (no jank on map/dashboards); no console errors.

## Conflict notes (updated post GUI fixups)
- **Spotlight lighting** is the established interaction: one `.spotlight` overlay per glass surface (cards, sidebar, auth-card) driven by `glass-light.js` with a proximity `--glow` ramp. Keep this; don't reinstate static `::before` blooms (removed).
- **Removed/changed since this plan:** top-right identity chip (gone → sidebar holds profile/logout); dashboard greeting is a JS-fitted WindSong header; card watermarks are top-centred, faded whitish-gray; booking grid is glassified; scrollbars hidden site-wide; back-button partial standardised (`margin: 1em 0`, under heading/above first block).
- **Fonts:** system font is **Cantarell**, greeting is **WindSong** — both via Google Fonts `<link>` in header/auth-header.
- **Cache-busting:** all local CSS/JS load with `?v=<%= assetV %>`.
- **Icons:** Lucide-style inline set in `icon.ejs` (book=student bookings, appointment=availability + my-appointments, clinical=nurse dashboard). No emoji anywhere.
