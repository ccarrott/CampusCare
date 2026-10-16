# Auth / booking / symptom-checker touch-up batch (plan 5)
# Auth / booking / symptom-checker touch-up batch (plan 5)

Ten small, mostly-independent fixes raised after live testing, implemented across two commits on `touchup-5-auth-booking-symptoms` (base `Final` / a427ff6). The batch covers an intentional security downgrade (bcrypt → plaintext for local/demo marking), a no-auto-login behaviour change on registration, two copy changes (NMU brand title, forgot-password label), a client-side date-format tweak, a CSS stacking fix for the symptom autocomplete, and three verify-only items (eye-icon toggle, preferred-language, keyless map). The diff is tight (10 files, +49/−41) and every change maps to a plan item with no stray edits.

Watch for: the bcrypt→plaintext downgrade is **intentional per plan item 3** and must not be rejected for being insecure — it was reviewed for *correctness* only (all six call sites plus two seed sites, strict `===`, dead imports gone, DO-NOT-SHIP comments present, `demo-credentials.js` untouched) and is clean (confirmed). The stale comment on `demo-credentials.js:10` ("only ever fed through bcrypt") is now inaccurate but that file is explicitly out of scope and correctly left untouched (confirmed).

**Verdict**: APPROVED

## High-level view

The security downgrade (item 3) is the only risky change and it was executed correctly. Every bcrypt write became a direct passthrough (`storedPassword = pw`) and every bcrypt compare became a strict `input === stored`; the `bcrypt` imports and `SALT_ROUNDS` consts are removed, each site carries a loud `SECURITY DOWNGRADE (LOCAL/DEMO ONLY — DO NOT SHIP)` comment, and surrounding validation / error messages / control flow are byte-for-byte unchanged. The two seed scripts were updated so a reseed stores plaintext. `demo-credentials.js` was not touched.

The no-auto-login change (item 2) drops the `startAuthenticatedSession` + `/profile/location` redirect from `handleRegister` and instead renders `auth/login` with a success message — mirroring the existing `handleResetPassword` pattern. No session is created, and the `/profile/location` route (GET + POST) is left intact so students can still drop their pin from the profile section later.

The copy and UI items are low-risk: the brand title / description / `<title>` now read as NMU Health Services, the forgot-password intro says "username", the booking grid header renders a full `12 Feb 2026` date purely client-side, and the symptom autocomplete overlap is fixed by raising the whole token card (`.content-card.tokenbar-open { z-index: 60 }`) and toggling that class in all four show/hide spots. No hardcoded colours/shadows/radii were introduced.

The three verify-only items (eye-icon, preferred-language, keyless map) are supported by the coder's recorded evidence and the README already documents the keyless CARTO/OSM fallback, so no code change was warranted.

<details>
<summary>Issues (1)</summary>

1. **Stale bcrypt comment in demo-credentials.js (non-blocking, out of scope)** — `demo-credentials.js:10` still reads "only ever fed through bcrypt," which is no longer true after the downgrade. The review brief explicitly requires this file be left untouched, so leaving it is correct; worth a one-word fix in a future pass but not a blocker here.

</details>

<details>
<summary>Details</summary>

## Item 3 — bcrypt removal (security-sensitive, intentional)

Six call sites plus two seed sites, all verified against the diff and the surrounding file context:

- `auth.controller.js` handleLogin — `const isMatch = password === user.Password;` (strict equality, confirmed). The preceding `if (!user || !user.Password)` guard and both "Invalid username or password." renders are unchanged.
- `auth.controller.js` handleRegister — `const storedPassword = password;` passed to `createStudent`.
- `auth.controller.js` handleResetPassword — `const storedPassword = password;` passed to `updatePassword`.
- `profile.controller.js` changePassword — compare is `currentPassword === user.Password` (strict); store is `const storedPassword = newPassword;`. The three-field validation, length check, confirm-match check, and the `fail()` toast messages are all intact.
- `admin.model.js` createNurse — `const storedPassword = password;` bound into the parameterised INSERT (still parameterised, confirmed).
- `state-naked.js` / `state-showcase.js` — seed passwords assigned directly from `DEMO_PASSWORDS` instead of `bcrypt.hash`.

The `import bcrypt` lines are gone from all five source files and the two seed scripts, and the `SALT_ROUNDS = 10` const is removed from both `auth.controller.js` and `admin.model.js`. A grep for `bcrypt|SALT_ROUNDS` across `src/**/*.js` returns only (a) the DO-NOT-SHIP comments at each changed site and (b) the pre-existing comment in `demo-credentials.js` — zero live `bcrypt.` calls or `SALT_ROUNDS` consts remain (confirmed). `demo-credentials.js` has no commit against it (confirmed). Each site carries the required loud comment. No loose `==` anywhere.

This is a deliberate downgrade for local/demo/marking per the plan; it is correct as implemented.

## Item 2 — no auto-login after register

`handleRegister` no longer calls `startAuthenticatedSession` and no longer redirects to `/profile/location`. It renders `res.render('auth/login', { error: null, success: 'Registration successful. Please sign in.' })`. The login template surfaces `success` in an `alert-success` block, guards `idNumber` with `typeof`, and reads `csrfToken` from `res.locals` (set globally in `app.js`), so the render is self-consistent and no session is created (confirmed). `/profile/location` remains routed (GET `showLocationPicker` + POST `saveLocation`), so the pin-drop stays reachable from the profile section (confirmed).

## Items 1 & 5 — verify-only

Item 1 (eye-icon): login/register/reset share the `.pw-field` + `.pw-toggle` markup with `eye`/`eye-off` icon partials and the `auth-footer` IIFE binding; `login.ejs` confirms the markup is present. Accepted as already-working per the coder's evidence.

Item 5 (preferred-language): no code change; the coder's E2E evidence (online booking inserts `PreferredLanguage = NULL`) and the plan's read of `handleBooking`/`atomicBookSlot` support "already fixed, stale DB". No leftover UI/check introduced in this diff.

## Items 4, 6, 7, 8 — copy & UI

Item 4: `auth-header.ejs` `<h1>` now reads "Nelson Mandela University Health Services Portal", the tagline `<p>` is removed, and the `<meta description>` / `<title>` / logo `alt` are aligned to NMU. `.auth-brand` gets `line-height: 1.25` for the longer string — a layout value, not a tokenized colour/shadow/radius.

Item 6: booking grid header formats `new Date(wd.date).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' })` → "12 Feb 2026". Client-side only; the server `dates.js` util is untouched (confirmed).

Item 7: forgot-password intro changed to "Enter your username to receive a reset link." No other "Student or Staff Number" string in the file.

Item 8: root cause was per-card `isolation: isolate` trapping the dropdown's z-index. Fix raises the whole token card via `.content-card.tokenbar-open { z-index: 60 }` and toggles the class in all four show/hide spots: added in `renderSuggestions` when `suggBox` shows; removed in the `!q` early-return, in `commit()`, and in the outside-click handler (confirmed all four). `tokenCard = tokenbar.closest('.content-card')` is null-guarded at every toggle. `z-index` is not a tokenized value, so no token rule is violated.

## Item 9 — keyless map (documentation-only)

No code change. The README already documents the keyless fallback in the env table ("Without it the map falls back to free CARTO/OSM tiles", line 207) and troubleshooting (line 325), so the plan's "at most one-to-two lines in README" ceiling is already satisfied. (Pre-existing stale line 140 "Leaflet (pin-drop)" is out of scope for this diff.)

## Verification evidence

The coder recorded in the commit message: `node --check` on all five changed JS files; migrate + seed:symptoms + state:naked ran clean against a throwaway local SQLite DB (shared Aiven untouched); admin/nurse/student rows stored plaintext; E2E over HTTP confirming register does not auto-login (200 login render + success message), login works, change-password works, and login with a changed password works. Throwaway artifacts were removed. Per the review brief this evidence is accepted and not re-run. A narrow spot-check grep for `bcrypt`/`SALT_ROUNDS` was performed and confirmed no live references remain.

</details>

<details>
<summary>Files changed (10)</summary>

- `public/css/style.css` — `.content-card.tokenbar-open { z-index: 60 }` card-raise rule; `.auth-brand` line-height for title wrap.
- `src/config/states/state-naked.js` — plaintext admin/nurse seed; bcrypt import removed.
- `src/config/states/state-showcase.js` — plaintext student seed; bcrypt import removed.
- `src/modules/admin/admin.model.js` — plaintext nurse create; bcrypt import + SALT_ROUNDS removed.
- `src/modules/auth/auth.controller.js` — plaintext login compare / register store / reset store; no auto-login; bcrypt + SALT_ROUNDS removed.
- `src/modules/profile/profile.controller.js` — plaintext change-password compare + store; bcrypt import removed.
- `views/auth/forgot-password.ejs` — "username" copy.
- `views/consultations/book.ejs` — client-side full-date header with year.
- `views/partials/auth-header.ejs` — NMU brand title / description / title / alt.
- `views/student/symptom-form.ejs` — toggle `tokenbar-open` on the card in all four show/hide spots.

Full diff: `git -C "s:\!Everything\CampusCare\.worktrees\touchup-5" diff a427ff6...HEAD`

</details>
