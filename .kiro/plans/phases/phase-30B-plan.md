# Phase 30B — The Shell (Glass Rail + No Topbar)

**Goal:** restructure navigation once — the solid navy sidebar becomes a **floating glass rail**, the **topbar is removed**, and its two useful controls (identity chip, theme toggle) become **floating glass controls**. Same links, roles, collapse behaviour — just reframed.

## Scope
1. **Floating glass rail** (`views/partials/navbar.ejs` + CSS):
   - Detach from the viewport edge (margin around it), `--glass-bg-strong` + `--glass-blur-strong`, rounded, floats over the aurora.
   - Keep: role-aware link set, collapse toggle + localStorage, NMU logo, active-link state, mobile drawer.
   - Main content margin adjusts to the rail's floating footprint.
2. **Remove the topbar.** Delete the `.topbar` block. Relocate:
   - **Identity chip** (Initial. Surname → Profile / Logout dropdown) → floating glass control, top-right, fixed.
   - **Theme toggle** → floating glass control near it (or bottom corner — keep discoverable).
   - Ensure the CSRF meta tag + any topbar-only logic is preserved elsewhere.
3. **Footer** → minimal glass strip; hidden on immersive pages (30F/30G).
4. **Mobile:** rail collapses to a bottom bar or drawer; floating controls reflow.

## Files
- `views/partials/navbar.ejs` (rail + remove topbar + floating controls)
- `views/partials/footer.ejs` (glass strip)
- `public/css/style.css` (rail, floating controls, content margin, mobile)
- `public/js/sidebar.js` (adjust for floating rail if needed)

## Guardrails
- This is the one structural nav change — do it cleanly and test every role's link set.
- Don't lose: collapse persistence, active-link highlight, mobile drawer, identity dropdown a11y (aria-expanded, Escape, click-out), theme toggle.
- Reclaimed vertical space: pages that assumed `--topbar-height` offset must be checked.

## Verify
All three roles see correct links; rail collapses + persists; identity chip opens Profile/Logout; theme toggle works; mobile nav works; no topbar remnants; both themes.
