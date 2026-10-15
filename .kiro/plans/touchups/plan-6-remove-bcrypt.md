# Touch-up Plan 6 — Remove password encryption (bcrypt) as a feature

Status: **DRAFT for review** · Owner: Seth · Scope: fully retire bcrypt from CampusCare —
not just bypass it. No bcrypt dependency, no hashing/comparison logic, **raw plaintext
passwords** stored and compared directly, and **both databases reseeded** so no hashes remain.

> Context: Plan 5 / item 3 already *bypassed* bcrypt (hash→passthrough, compare→`===`) and removed
> the `import bcrypt` lines + `SALT_ROUNDS` from the five source files and two seed scripts. The
> runtime logic is **already plaintext**. This plan finishes the job: drop the npm dependency,
> correct the now-false documentation/steering, and reseed the live data so stored hashes are gone.

> This is a deliberate choice for an academic / local / demo project. It is **not** production
> security guidance.

---

## Decisions locked (from conversation)

- **Databases:** reseed **BOTH** `local.db` (SQLite) **and** the Aiven MySQL.
- **Steering:** **rewrite** `.kiro/steering/tech.md` so it reflects plaintext storage (drop the
  bcrypt mandate), framed as the deliberate project choice it is.
- **In-code comments:** do **not** touch tone of the existing warning comments; only **fix
  factually-incorrect** comments (e.g. "only ever fed through bcrypt").

> ⚠️ **Destructive-step gate:** reseeding **Aiven** wipes and repopulates a **shared live DB**
> (`state:naked`/`state:showcase` DELETE + re-INSERT). Execution MUST pause for Seth's explicit
> go-ahead immediately before the Aiven reseed. The `local.db` reseed is safe and needs no gate.

---

## Current state (verified)

- **Live code is already plaintext.** `grep bcrypt|SALT_ROUNDS` over `src/**/*.js` finds **no live
  calls** — only comments. Call/seed sites:
  - `src/modules/auth/auth.controller.js` — login compare `password === user.Password`; register
    store `const storedPassword = password`; reset store `const storedPassword = password`.
  - `src/modules/profile/profile.controller.js` — change-pw compare `currentPassword ===
    user.Password`; store `const storedPassword = newPassword`.
  - `src/modules/admin/admin.model.js` — `createNurse` store `const storedPassword = password`
    (bound into the still-parameterised INSERT).
  - `src/config/states/state-naked.js` — admin+nurse seeds from `DEMO_PASSWORDS.*` (plaintext).
  - `src/config/states/state-showcase.js` — student seed from `DEMO_PASSWORDS.student` (plaintext).
- **But bcrypt is still a dependency:** `package.json` (`"bcrypt": "^6.0.0"`) and `package-lock.json`.
- **Docs/steering still assert bcrypt as current behaviour** (see §3 and §4 below).
- **Both DBs still hold old bcrypt hashes.** Confirmed in `local.db`:
  `s999000001.Password = $2b$10$...` — a hash, not plaintext. The current plaintext `===` compare
  therefore **fails** against these stale rows until reseeded. (And none of the three current demo
  passwords matched that hash on a `bcrypt.compare` check — the row predates the current creds, so
  it can't simply be read; the fix is a reseed, not recovery.)

---

## Item A — Remove the bcrypt dependency

- Run `npm uninstall bcrypt` so it drops out of **both** `package.json` and `package-lock.json`
  and leaves `node_modules`. (`node_modules` is gitignored, so only the two manifest files change
  in git.)
- Confirm nothing imports `bcrypt` anywhere (`grep` already clean in `src`; re-verify after
  uninstall so `node src/app.js` still boots and `node --check` passes on the auth/profile/admin
  files).

**Files:** `package.json`, `package-lock.json`.

---

## Item B — Fix factually-incorrect comments (no tone changes elsewhere)

Only correct statements that are now **false**. Do NOT rewrite the existing "SECURITY DOWNGRADE
… DO NOT SHIP" warning comments (Seth: leave those as-is).

- `src/config/states/demo-credentials.js:10` — the line "The values here are only ever fed through
  bcrypt; nothing stores them in plain text." is now **false**. Replace with an accurate line, e.g.
  that these demo passwords are stored and compared as plaintext (bcrypt removed from the project).
- Scan the five source files + two seed scripts for any other comment that asserts hashing happens
  (as opposed to warning that plaintext is insecure). Fix only the inaccurate factual claims; keep
  the warnings. The `… bcrypt disabled` warning comments are acceptable to keep as-is OR trim the
  dangling "bcrypt" reference if it reads oddly — reviewer's judgement, but **no tone change**.

**Files:** `src/config/states/demo-credentials.js` (+ any other src comment found to be factually
wrong on inspection).

---

## Item C — Rewrite the steering file `tech.md`

`.kiro/steering/tech.md` is the project source-of-truth and currently **mandates bcrypt**. Rewrite
the two spots so steering matches reality (plaintext, deliberate academic/demo choice):

1. **Core Stack table** (~line 12): row reads
   `| Security | Session-based double-submit CSRF, cookie-parser, bcrypt (10 rounds) |`.
   → Remove the bcrypt clause; state passwords are stored as plaintext (no hashing) — a deliberate
   simplification for this academic/demo project. Keep CSRF + cookie-parser.
2. **Non-Negotiable Rules** (~line 63): rule 6 reads
   `6. **bcrypt for all passwords.** 10 salt rounds minimum.`
   → Replace with a rule that states the current reality: passwords are stored and compared as
   plaintext (bcrypt intentionally removed) for this project; note explicitly this is **not**
   production guidance. Renumber/keep the list coherent.

Keep the rest of `tech.md` intact. The rewrite should be factual and brief — don't editorialise
beyond the one "not production guidance" caveat.

**Files:** `.kiro/steering/tech.md`.

---

## Item D — Correct docs that state bcrypt as *current* behaviour

Update only statements of **current** behaviour; **leave historical changelog/roadmap/spec entries
alone** (they are an accurate record of what happened at the time).

- `README.md` — the stack/security line that lists bcrypt as a current auth mechanism (e.g. the
  "Auth bcrypt (10 rounds)…" row). Reword to reflect plaintext storage. Fix only current-state
  claims; leave any historical notes.
- **Leave as history (no change):** `CHANGES.md` ("Implemented bcrypt password hashing…"),
  `.kiro/plans/roadmap.md`, `.kiro/specs/auth-profiles/*` — these describe past phases. Changing
  them would falsify the project history. (Reviewer may add a one-line "superseded — see plan 6"
  note to the auth-profiles design if desired, but it's optional and must not rewrite history.)
- `.agents/tasks/touchup-5/review.*` — artifacts; do not edit.

**Files:** `README.md` (current-state line only).

---

## Item E — Reseed BOTH databases (so no hashes remain)

Goal: every stored password is **raw plaintext** matching `DEMO_PASSWORDS` (student `123student!`,
nurse `123nurse!`, admin `123admin!`, unless overridden by `DEMO_*_PASSWORD` env — none set in the
user's `.env`).

Seed scripts available (from `package.json`): `state:naked`, `state:showcase`, `setup`
(migrate + seeds + showcase). The engine is chosen by `USE_LOCAL_DB` / the `--local|--aiven` flags.

**E1 — local.db (SAFE, do first, no gate):**
- Reseed against SQLite: run the state tooling in local mode (e.g. `USE_LOCAL_DB=true npm run
  state:naked`, or `npm run start:local -- --bootstrap-only` style per the existing scripts —
  reviewer picks the correct existing script; `setup:local` exists for bootstrap).
- Verify: `node -e` read of `local.db` shows `s999000001.Password === '123student!'` (plaintext,
  no `$2b$` prefix); a seeded nurse/admin likewise plaintext.

**E2 — Aiven MySQL (DESTRUCTIVE on a SHARED DB — GATED):**
- **PAUSE for Seth's explicit confirmation before running.** This wipes and repopulates the shared
  Aiven database.
- With `USE_LOCAL_DB=false` (the `.env` default) / `--aiven`, run the equivalent reseed
  (`npm run state:naked` or `state:showcase`) against Aiven.
- Verify: query Aiven for `s999000001` (and one nurse, one admin) and confirm plaintext passwords,
  no `$2b$` hashes.

> Note: items A–D (code/deps/docs) do **not** require either DB and can land first. The reseed is
> the only part that touches live data; keep it last and keep the Aiven gate.

**Files:** none (data only); uses existing seed scripts.

---

## Verification (whole plan)

- `npm uninstall bcrypt` leaves `package.json`/`package-lock.json` with **no** bcrypt entry; app
  still boots (`node src/app.js`), `node --check` clean on changed JS.
- `grep -ri "bcrypt"` over **src + steering + README** returns only intentional/historical mentions
  (changelog/roadmap/specs), **no** live code refs and **no** false current-state claims.
- Login works end-to-end against the reseeded DB(s): seeded account logs in with its plaintext
  password; a newly registered student stores + logs in with plaintext; change-password stores
  plaintext; reset-password stores plaintext.
- A direct DB read shows **raw passwords, zero `$2b$` hashes** in both `local.db` and Aiven.
- No console/server errors; CSRF, ownership, parameterised queries all still intact (we only
  removed hashing, nothing else).

## Suggested execution order

1. Item A (uninstall bcrypt) + Item B (fix false comments) — code/deps, no DB.
2. Item C (rewrite steering) + Item D (README current-state) — docs.
3. Item E1 (reseed local.db) — safe.
4. **Gate → Seth confirms →** Item E2 (reseed Aiven) — destructive, shared.
5. Final verification sweep.

## Out of scope / explicitly NOT changed

- Historical records: `CHANGES.md`, `roadmap.md`, `.kiro/specs/*` phase notes (accurate history).
- The existing "DO NOT SHIP / plaintext" warning comments' tone (left as-is per Seth).
- Any non-password security control (CSRF, cookies, ownership, rate limiting, parameterised SQL).
- `demo-credentials.js` password *values* and the `DEMO_*` env override mechanism (unchanged).
