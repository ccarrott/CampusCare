# Touch-up Plan 5 — Auth, Booking, Symptom-checker & Map-key fixes

Status: **DRAFT for review** · Owner: Seth · Scope: a batch of small, mostly-independent
fixes raised after live testing. Each item below is self-contained — they can be done in any
order and shipped individually.

> Design authority: `.kiro/steering/ui-design.md` (Calm Clinical Glass). Tech rules:
> `.kiro/steering/tech.md`. No new libraries, no build step, vanilla JS + EJS + hand-written CSS.

---

## 0. Summary of items

| # | Item | Type | Verdict after investigation |
|---|------|------|------------------------------|
| 1 | Registration password **eye icon** | **Already implemented** — verify only | Markup, JS (`auth-footer.ejs`), CSS (`.pw-toggle.is-revealed`), and `eye`/`eye-off` icons all exist. Likely a stale-asset/cache issue, not missing code. |
| 2 | **No auto-login after register** | Behaviour change | `handleRegister` currently auto-logs-in and redirects to `/profile/location`. Change to redirect to login. |
| 3 | **Turn off encryption** (leave logic, reseed) | Security downgrade (deliberate) | bcrypt used in 6 spots. Swap to plaintext store/compare, keep code shape, reseed. |
| 4 | Sign-in brand title → **"Nelson Mandela University Health Services Portal"** | Copy change | Lives in `views/partials/auth-header.ejs`. |
| 5 | Booking **still asks for preferred language** | Suspected already-fixed | Code already passes `preferredLanguage: null`; column nullable; UI step gone. Verify at runtime; treat as stale DB. |
| 6 | **Add year** to booking schedule header ("12 Feb 2026") | UI change | Grid header built in `book.ejs` JS from `wd.date`; reformat. |
| 7 | Forgot-password **"Student or Staff Number" → "username"** | Copy change | Leftover intro line in `views/auth/forgot-password.ejs`. |
| 8 | Symptom **"Your Symptoms" dropdown overlaps "Select Symptoms"** | CSS stacking bug | `.content-card` has `isolation: isolate`; suggestions can't escape its card. |
| 9 | **"No API key required"** investigation | Investigation (no bug) | By design: map falls back to free CARTO/OSM when `MAPTILER_KEY` absent (and `.env` is gitignored). |

---

## Decisions locked (from conversation)

- **Item 3 (encryption):** _[CONFIRM]_ — option **(a) plaintext everywhere**: store and compare
  passwords as plaintext across all 6 bcrypt spots, reseed DB with plaintext passwords.
- **Item 2 (no auto-login):** _[CONFIRM]_ — option **(a)**: redirect to `/auth/login` with a
  "Registration successful, please sign in" message; **drop the pin-drop step** from the register
  flow (students set location later via profile).
- **Item 5 (preferred language):** _[CONFIRM]_ — option **(a) verify at runtime**: reseed + book an
  online appointment; only touch code if the error actually reproduces.

> These three were asked as questions; fill the `[CONFIRM]` markers before implementation so the
> coder isn't guessing. The rest of the plan assumes the (a) answers above.

---

## Item 1 — Registration (and all auth) password eye-icon toggle

**Finding — already implemented.** This is **not** a missing-code bug. Everything is present:
- **Markup:** `register.ejs`, `login.ejs`, and `reset-password.ejs` all wrap the password input in
  `.pw-field` with a `.pw-toggle` button and two icon spans (`.pw-icon--show` / `.pw-icon--hide`)
  via the `eye` / `eye-off` icon partials.
- **JS:** `views/partials/auth-footer.ejs` contains an inline IIFE that binds every `.pw-toggle`:
  on click it flips the sibling input's `type` (password↔text), updates `aria-pressed` and
  `aria-label`, and toggles `is-revealed` on the button.
- **CSS:** `style.css` (~lines 1160–1190) styles `.pw-field`/`.pw-toggle`, gives a brand-yellow
  `:focus-visible` ring, and swaps icons: `.pw-toggle .pw-icon--hide { display:none }` by default,
  and `.pw-toggle.is-revealed` shows hide / hides show.
- **Icons:** `eye` and `eye-off` both exist in `views/partials/icon.ejs`.

So in the current source the registration eye toggle **should work**.

**Action — verify, don't rebuild.** The most likely reasons it appeared broken:
- **Stale cached CSS/JS** — assets are versioned with `?v=<assetV>`; a hard refresh or an
  `assetV` bump may be needed if the browser cached an older `style.css`/footer.
- **A stale running `node`** serving an older build (kill `node` on :3000, restart).

Only if it still fails after a clean reload: confirm `is-revealed` lands on the **button**
(the JS targets `btn.classList`, and the CSS keys off `.pw-toggle.is-revealed` — these match), and
that `btn.parentElement.querySelector('input')` resolves (it does: the button is a direct child of
`.pw-field` alongside the input). No code change expected.

**Files:** none expected; runtime/cache verification only.

**Verify:** On register, login, reset-password: clicking the eye reveals/hides the password;
keyboard focus + Enter/Space works; `aria-pressed`/`aria-label` flip; works light + dark; no
console errors.

---

## Item 2 — No automatic login after registration

**Finding.** `auth.controller.js` → `handleRegister` ends with:
```js
await startAuthenticatedSession(req, { ... role: ROLES.STUDENT });
res.redirect('/profile/location');
```

**Fix (option a).**
- Remove the `startAuthenticatedSession(...)` call from `handleRegister`.
- Redirect to the login page with a success message. Login already renders a `success` alert
  (`views/auth/login.ejs` has the `success` block), so render `auth/login` with
  `{ error: null, success: 'Registration successful. Please sign in.' }` (or redirect with a
  flash-style query the login GET can surface — prefer the direct render to match the existing
  reset-password success pattern).
- Pin-drop: students no longer land on `/profile/location` at signup. Confirm the location picker
  is still reachable from the profile edit page for later use (it is — `profile.controller.js`
  renders `profile/location` and `profile/edit` with `maptilerKey`). No route removal needed.

**Files:** `src/modules/auth/auth.controller.js`.

**Verify:** Registering a new student lands on the sign-in page with the success message and an
**unauthenticated** session (no redirect into the app); logging in with the new credentials works.

---

## Item 3 — Turn off password encryption (keep logic, reseed)

**Finding.** bcrypt is used in exactly these places:
- `src/modules/auth/auth.controller.js` — `bcrypt.hash` on register, `bcrypt.compare` on login,
  `bcrypt.hash` on reset.
- `src/modules/profile/profile.controller.js` — `bcrypt.compare` (verify current),
  `bcrypt.hash` (set new) in change-password.
- `src/modules/admin/admin.model.js` — `bcrypt.hash` in `createNurse`.
- `src/config/states/state-naked.js` — `bcrypt.hash` for admin + nurses seed.
- `src/config/states/state-showcase.js` — `bcrypt.hash` for students seed.
- (`demo-credentials.js` only holds plaintext constants — no bcrypt call.)

**Fix (option a — plaintext everywhere).** Keep the *shape* of the logic (still a "hash" step and
a "compare" step) but make them no-ops / direct comparisons so the control flow and error messages
are unchanged:
- Replace `await bcrypt.hash(pw, N)` with `pw` (store as-is) at every write site.
- Replace `await bcrypt.compare(input, stored)` with `input === stored` at every verify site.
- Remove the now-unused `bcrypt` imports and `SALT_ROUNDS` consts where they become dead (lint
  will flag them). Leave the surrounding validation and messages intact ("leave logic").
- **Reseed** so stored passwords become plaintext: `npm run state:naked` (and/or `state:showcase`)
  after the seed scripts are updated. Existing bcrypt-hashed rows will no longer match a plaintext
  compare, so a reseed is **required**, not optional.

> Note for reviewers: this is an intentional security regression for local/demo/marking
> convenience. It must **not** ship to any public deployment. Consider a loud comment at each site
> and a line in `DEPLOY.md` / `README` security section.

**Files:** the 6 files above; run the state scripts.

**Verify:** After reseed, demo accounts log in; a freshly registered student logs in; change-password
works; a DB row shows the password in plaintext.

---

## Item 4 — Sign-in brand title copy

**Finding.** `views/partials/auth-header.ejs`:
```html
<h1 class="auth-brand">Campus Care</h1>
<p class="auth-tagline">University Health Services Portal</p>
```

**Fix.** Change the `<h1>` text to **"Nelson Mandela University Health Services Portal"**.
Decision for reviewer: the tagline then duplicates part of the title — recommend **removing or
re-wording the tagline** (e.g. drop it, or change to "Student & Staff Health Services"). Also note
the `<title>` tag and `<meta name="description">` still say "Campus Care"; decide whether those
change too (recommend leaving the `<title>` as the short app name, or aligning it — flag for Seth).

**Files:** `views/partials/auth-header.ejs`.

**Verify:** Sign-in, register, forgot-password, reset-password headers all show the new title
(they share this partial); layout doesn't break with the longer string on mobile.

---

## Item 5 — Booking "preferred language still required"

**Finding.** The current code path already looks correct:
- `handleBooking` destructures only `{ appointmentType, staffNumber, time, campus }` and passes
  `preferredLanguage: null` to the model.
- `atomicBookSlot` writes `PreferredLanguage` as `null`; the column is `varchar(50) NULL` in
  `migrate.js` (no NOT NULL constraint).
- `book.ejs` has **no** language step and no `stepLanguage` wiring (grep clean).

So there is no server-side requirement for preferred language in the code as read. Most likely the
report comes from a **stale running server or un-reseeded/old DB**.

**Fix (option a).** Verify at runtime: restart the server (kill stale `node` on :3000 first —
`Stop-Process -Name node -Force`), reseed, and complete an **online** booking end-to-end. Confirm
the inserted row has `PreferredLanguage = NULL`. Only if the error actually reproduces, trace the
real source (e.g. a validation middleware or an older cached view) and fix it then.

**Files:** none expected; runtime verification only.

**Verify:** Online booking completes with no language prompt; row inserts with `PreferredLanguage
= NULL`; physical flow unaffected; no console/server errors.

---

## Item 6 — Add year to the booking schedule header

**Finding.** In `views/consultations/book.ejs`, `renderGrid()` builds each day header from the
server-provided `weekDays` array:
```js
'<div class="day-date">(' + wd.date.slice(5).replace('-', '/') + ')</div>'
```
`wd.date` is an ISO `YYYY-MM-DD` string from `getUpcomingWeekDays()` in `src/utils/dates.js`,
which also already provides a `label` and a localized `formatted` (`day: 'numeric', month:
'short'`) but **not** the year.

**Fix.** Show the date as **"12 Feb 2026"**. Two clean options (pick one in review):
- **(a) Client-side:** in `renderGrid`, format `new Date(wd.date)` with
  `toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })` instead of
  the `slice/replace`. Keeps the server util untouched.
- **(b) Server-side:** extend `getUpcomingWeekDays()` to include a `display` field with the
  year-bearing format and render that. Cleaner if other views want the same string.

Recommendation: **(a)** — smallest blast radius, the grid is the only consumer of this exact
header. Keep the day name on its own line, date (with year) beneath, as now.

**Files:** `views/consultations/book.ejs` (option a) or `src/utils/dates.js` + `book.ejs` (option b).

**Verify:** Grid headers read like "Mon / 12 Feb 2026"; dates still align with the correct slots;
works light + dark; no console errors.

---

## Item 7 — Forgot-password label copy

**Finding.** `views/auth/forgot-password.ejs` intro paragraph:
```html
<p class="text-muted mb-2">Enter your Student or Staff Number to receive a reset link.</p>
```
(The field's own `<label>` already says "Your Username".)

**Fix.** Change "Student or Staff Number" → **"username"**, e.g. "Enter your username to receive a
reset link." Keep the placeholder example (`s999000001 or NUR001`) as a helpful hint.

**Files:** `views/auth/forgot-password.ejs`.

**Verify:** Page reads "username"; no other "Student or Staff Number" strings remain (grep).

---

## Item 8 — Symptom suggestions dropdown overlaps "Select Symptoms" card

**Finding (root cause).** In `symptom-form.ejs` the autocomplete dropdown `#symptomSuggestions`
is `position: absolute` inside `.symptom-tokenbar`, which sits in the first `.content-card`
("Your Symptoms"). In `style.css`, **`.glass, .content-card { isolation: isolate; }`** — every
card is its own stacking context. The dropdown's `z-index: 50` therefore only competes **within**
the first card; the sibling "Select Symptoms" card is a later DOM sibling with its own stacking
context (and a `backdrop-filter`), so it paints on top of the overflowing dropdown. Result: the
dropdown appears visually behind / clipped by the next card (as in the screenshot).

**Fix (preferred).** Lift the whole first card above its sibling while the dropdown is open:
- When suggestions are shown, add a class (e.g. `tokenbar-open`) to the enclosing `.content-card`
  (or set a higher `z-index` on that card via a class), and give **`.content-card`** a
  `position: relative` baseline so a `z-index` takes effect; remove the class when suggestions
  hide. Because each card is its own stacking context, raising the *card's* z-index (not just the
  dropdown's) is what makes it win against the next card.
- Alternative (heavier): render the suggestions in a portal-like fixed/absolute layer positioned
  under the input via JS (overkill here; avoid).
- Keep the dropdown's own `z-index: 50` for internal layering.

Toggle points are already in the JS (`renderSuggestions` shows it, the outside-click and `commit`
handlers hide it) — add/remove the card class in those same spots.

**Files:** `public/css/style.css` (card raise rule + `position: relative` baseline if needed),
`views/student/symptom-form.ejs` (add/remove the open class alongside `suggBox.style.display`).

**Verify:** Type "cou" → the "Dry Cough" suggestion overlays **on top of** the "Select Symptoms"
card, not behind it; selecting/escaping restores normal stacking; works light + dark; no layout
shift; reduced-motion unaffected.

---

## Item 9 — "No API key required" (investigation, not a bug)

**Finding.** This is **by design**. `public/js/map.js` builds a raster basemap and treats an empty
key — or the `.env.example` placeholder `your_maptiler_key` — as "no key", going straight to the
**free CARTO/OSM tiles**. It also swaps to the free tiles if a MapTiler request errors (bad/stale
key, quota, offline). `MAPTILER_KEY` is read server-side in `trends.controller.js` and
`profile.controller.js` as `process.env.MAPTILER_KEY || ''` and passed to the view.

Because **`.env` is gitignored**, a fresh clone / new PC has **no `MAPTILER_KEY`**, so the map
silently uses the free fallback and still works — which is exactly why it "needs no API key" on a
fresh start. The MapTiler key is a *public, origin-restricted browser key* that only upgrades tile
quality/branding; it is intentionally optional.

**Conclusion / action.** No code fix required. Recommended documentation touch-ups only:
- Note in `README` / `DEPLOY.md` (already partly there) that the map runs without a key via
  CARTO/OSM, and that `MAPTILER_KEY` is optional and only improves tiles.
- Optional: surface a one-line dev console note when running on the fallback so it's obvious the
  key is absent (nice-to-have, not required).

**Files:** docs only (optional). No functional change.

---

## Suggested execution order

1. Copy changes (items 4, 7) — trivial, no risk.
2. Booking year format (item 6) — isolated front-end.
3. Symptom dropdown stacking (item 8) — isolated CSS/JS.
4. No-auto-login (item 2) — small controller change.
5. Encryption off + reseed (item 3) — do last among code changes; requires reseed.
6. Runtime verification: eye toggle (item 1) + preferred-language (item 5) — after a clean
   restart/reseed; code change only if either actually reproduces.
7. Investigation (item 9) — documentation only; already answered here.

## Global verification (quality bar)

- Every touched screen renders in **light and dark**, mobile-responsive, no console errors.
- Design tokens only — no hardcoded colour/shadow/radius/spacing.
- `:focus-visible` on the new eye-toggle button; keyboard operable.
- Motion (if any) respects `prefers-reduced-motion` and uses transform/opacity only.
- After item 3, confirm login/change-password/reset all still work against plaintext storage.
