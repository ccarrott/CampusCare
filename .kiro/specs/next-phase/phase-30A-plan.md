# Phase 30A — Foundation & Breathing Background

**Goal:** land the entire token layer + breathing background + motion engine with **zero layout change**, so the whole app instantly gains the glass "feel" and stays fully working. Lowest-risk phase; everything after reads these tokens.

## Scope
1. **Tokens** — add all NEW tokens from `ui-design.md` §1 to `public/css/style.css` `:root` + `[data-theme="dark"]` (glass, aurora, motion, spacing, elevation, `--radius-glass`). Keep every existing token.
2. **Breathing background** — add `#app-aurora` markup once (in `header.ejs` + `auth-header.ejs`, right after `<body>`) and the CSS from `ui-design.md` §2. Set `body` background to transparent so the aurora shows. Reduced-motion → static gradient.
3. **Glass utility + `.content-card` upgrade** — add the `.glass` utility; upgrade `.content-card` to use glass tokens (`--glass-bg`, blur, `--glass-border`, `--radius-glass`, top highlight). Dense pages can later opt out to `--elev-raised`.
4. **Motion One** — vendor it (like Daily) into `public/vendor/motion/` OR load from CDN; create `public/js/motion.js` bootstrap with the reduced-motion kill-switch and `.reveal` inView helper (no elements use `.reveal` yet — wired in later phases). Load in `footer.ejs`.
5. **Button/input polish** — press-scale + focus-ring tokens (small, global).

## Files
- `public/css/style.css` (tokens, aurora, `.glass`, `.content-card` upgrade)
- `views/partials/header.ejs`, `views/partials/auth-header.ejs` (aurora div)
- `public/js/motion.js` (new) + `public/vendor/motion/` (vendored lib)
- `views/partials/footer.ejs` (script include)

## Guardrails
- No page's structure changes. Only surface styling + background + motion scaffolding.
- Verify light + dark + reduced-motion. Check `backdrop-filter` fallback (Firefox older) degrades to a solid-ish `--glass-bg`.
- Watch perf: aurora is 2 blurred blobs (cheap); `.content-card` blur is the main cost — if a data-heavy page janks, that card opts to raised (no live blur).

## Verify
App boots; every existing page renders with glass cards over the breathing bg in both themes; reduced-motion stops the aurora; no console errors; Motion One loads.
