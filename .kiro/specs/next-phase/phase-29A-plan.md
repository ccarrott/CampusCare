# Phase 29A — Identity, Profiles & Access

The "who you are and your data" layer. Covers login identity (item 2), admin edit→view + nurse pin-drop (item 5), the top-right profile identity chip + brand palette (item 9), and real clinic address data (item 10).

---

## Item 2 — "Student/Staff No." → "Username" (+ email login)

### Essence
The identifier isn't really a student number — because of the `s` prefix it's effectively a username. Reword the UI, and let students log in with either `s227921577` **or** `s227921577@mandela.ac.za` (a nice trick: slice off everything from `@` onward).

### Current state
- Login form field is `name="idNumber"`, label **"Student / Staff Number"** (`views/auth/login.ejs`).
- `auth.controller.handleLogin` does `sanitize(req.body.idNumber)` then tries Student→Nurse→Admin lookups by primary key. **No format validation on login.**
- `isValidStudentNumber` (`/^s\d{9}$/`) is used only in registration + admin-create, not login.

### Changes
1. **Login controller** (`auth.controller.js`): after sanitising, strip the email domain:
   ```js
   const idNumber = sanitize(req.body.idNumber).split('@')[0];
   ```
   That single line makes both `s227921577` and `s227921577@mandela.ac.za` resolve to the student number. No model changes. (Staff numbers like `NUR001` have no `@`, so they're unaffected.)
2. **Wording** (`views/auth/login.ejs`): label "Student / Staff Number" → **"Username"**; update placeholder to `e.g. s227921577 or s227921577@mandela.ac.za or NUR001`. Keep `autocomplete="username"`.
3. **Consistency sweep**: check the register page + any "student number" microcopy that the user now thinks of as a username. Keep the register field validation strict (`isValidStudentNumber`) — registration should still demand the canonical `sNumber`; only *login* accepts the email form.
4. **Optional polish**: on the login error message, change "Invalid ID Number or password" → "Invalid username or password".

### Notes / decisions
- We deliberately do NOT validate the login identifier's format (login already doesn't) — a wrong username simply fails the lookup. This keeps the email-trick trivial and avoids rejecting valid staff numbers.
- No new DB column for email — student email is derived (`sNumber@mandela.ac.za`) and this feature only needs the reverse (strip the domain).

---

## Item 5 — Admin: Nurse location → Campus dropdown · Edit Student → View Student

### Essence (revised — narrowed by user)
Two admin changes: (5) the nurse's free-text Address becomes a **Campus dropdown** — we don't actually need a precise address, just which campus the nurse is on; (5.1) the admin "Edit Student" screen becomes a read-only "View Student" (nothing editable).

**Decision (confirmed by user):** a pin-drop / lat-lng is overkill here. Nurses belong to a **campus**, so a simple select (NMU has a fixed set of campuses) is the right model — no new coordinate columns, no map.

### Current state
- Nurse has a free-text `Address` (varchar) column — currently edited via a plain text input in `views/admin/nurse-form.ejs`.
- Admin nurse edit: `showEditNurseForm`/`handleUpdateNurse` + `updateNurse(… address …)`.
- Admin student edit: `showEditStudentForm`/`handleUpdateStudent` + `views/admin/student-form.ejs` (FirstName/LastName/Email/MedicalHistory editable; studentNumber readonly).

### Changes — 5 (nurse campus dropdown)
1. **No new columns needed.** Reuse the existing `Nurse.Address` column to store the campus name (simplest, no migration), OR add a dedicated `Campus varchar(50)` column for clarity. Decision: **add a `Campus` column** so it's semantically clean and doesn't overload `Address`; keep `Address` around unused/deprecated (non-destructive). If we'd rather avoid any migration, storing the campus string in `Address` is an acceptable fallback.
2. **Campus list** — define the fixed NMU Gqeberha campus options as a small constant (e.g. in `constants.js`): **South Campus, North Campus, 2nd Avenue Campus, Missionvale Campus, Bird Street Campus, Ocean Sciences Campus** (fact-check the exact current campus list during implementation — align with the real NMU campuses used in item 10's clinic data).
3. **View** (`views/admin/nurse-form.ejs`): replace the Address text input with a `<select name="campus">` populated from the campus constant, pre-selecting the nurse's current campus in edit mode.
4. **Model** (`admin.model.js`): update `createNurse`/`updateNurse` to accept + persist `campus` (into the `Campus` column, or `Address` if we skip the migration).
5. **Controller** (`admin.controller.js`): read `campus` from the body, validate it's one of the allowed values, pass through.
6. **Display**: wherever a nurse's location is shown (admin nurse list, nurse profile), show the campus name. Ties in naturally with item 10 (clinics live on campuses).

### Changes — 5.1 (view-only student)
**Decision (confirmed by user):** keep everything exactly as-is — same layout, same fields shown, and the **delete functionality + its UI placement stay untouched**. The ONLY change is that nothing is editable anymore. So this is "the current edit screen, but read-only", not a new bespoke view.

1. **New read-only view** `views/admin/student-view.ejs` mirroring the current `student-form.ejs` layout (StudentNumber, name, derived email, medical history, and existing pin/zone if shown) — but rendered as static text instead of inputs, with the submit/"Save Changes" button removed. Keep the same page structure/spacing so it looks identical minus the edit affordances.
2. **Controller** (`admin.controller.js`): repurpose `showEditStudentForm` → `showViewStudent` rendering the new view. Remove `handleUpdateStudent` + its update route (the model `updateStudent` fn can stay unused/dead or be removed).
3. **Route/links** (`admin.routes.js` + `views/admin/students.ejs`): the per-student "Edit" action becomes **"View"**, pointing at the view route. **Delete stays exactly where and how it is** — do not move, restyle, or gate it. Admins still delete accounts the same way.

### Notes / decisions
- Nurse location is now a **campus dropdown**, not a pin-drop — no coordinates needed (we only care which campus). Optionally one small `Campus` column migration; can even avoid a migration by reusing `Address`.
- Campus options should match the real NMU campus set used for clinics in item 10 — define them once and reuse.
- Student "view only" strips ALL edit affordances per the request, but **delete stays exactly as-is** (confirmed). If a data correction is ever needed, the admin can delete + recreate, or we add editing back later.

---

## Item 9 — Top-right identity chip → profile viewer (+ brand palette)

### Essence
Replace the little "Student/Nurse/Admin" role badge in the top-right with the user's **initial + surname** (e.g. "S. Whitfield"). Clicking it opens a small menu → View/Edit Profile · Logout. Also lock in the brand palette.

### Current state
- The role badge is `<span class="topbar-role">` in `views/partials/navbar.ejs`, styled `.topbar-role` in `style.css` (brand-yellow bg, navy text).
- Session already has `firstName`, `lastName`, `role`, `name`, `id` — so "S. Whitfield" is computable as `firstName[0] + '. ' + lastName`.
- Brand palette already standardised in `:root` (Post-Phase-28): `--brand-blue #141c2b`, `--secondary-blue #132e51`, `--brand-yellow #ffcc00`, `--secondary-yellow #f9b22a`. Item 9.1 is essentially already done; this item just confirms/reuses it.

### Changes
1. **Markup** (`views/partials/navbar.ejs`): replace the role-text badge with a clickable identity chip:
   - Label: `<%= (user.firstName ? user.firstName[0] + '. ' : '') + user.lastName %>` with an admin fallback (admins have no first/last → show "Admin" or their `Name`).
   - Wrap in a button/details element that toggles a small dropdown menu.
2. **Dropdown menu**: two items — "View / Edit Profile" (`/profile`) and "Logout" (`/auth/logout`, which is a POST — reuse the existing logout form/CSRF pattern). Keep it a lightweight CSS/JS dropdown (click to open, click-outside to close, Escape to close) — no framework.
3. **Styling** (`style.css`): restyle `.topbar-role` (or a new `.topbar-identity`) as the chip; menu uses `--surface-white`/`--border-color`, dark-mode aware. Show a tiny avatar circle with the initial in `--brand-yellow` on `--primary-navy` for a polished look.
4. **Accessibility**: `aria-haspopup`, `aria-expanded`, keyboard focusable.
5. **Palette (9.1)**: confirm all four brand vars are the canonical source; no action needed beyond verifying nothing hardcodes the old gold. (Already swept in Post-Phase-28.)

### Notes / decisions
- Admins have empty firstName/lastName in the session — handle that branch so the chip doesn't render ". " with no name. Use `user.name` for admins.
- Logout must stay a CSRF-protected POST; the menu's Logout is a small inline form, not a bare link.

---

## Item 10 — Real clinic address data

### Essence
Clinic addresses in the DB are wrong (e.g. "2nd Ave for north campus"). Fact-check real NMU campus clinic addresses using web search and seed correct data.

### Current state (critical)
- **`Clinic` and `MedicalFacility` tables are NEVER seeded.** `state-naked.js` inserts nurses referencing `CLN001`/`CLN002`, but no matching Clinic rows exist — the FKs dangle and the admin clinic dropdown is empty on a fresh DB.
- The only "addresses" in code are the 5 hospital ERs in `recommendations.ejs` (not campus clinics).
- The wrong "2nd Avenue" address the user refers to lives in a **plan doc** (`phase-13-plan.md`), not in runnable seed code.

### Changes
1. **Research** (during implementation): web-search the actual NMU Gqeberha campus health facility addresses (South Campus / North Campus / Missionvale / 2nd Ave / Bird Street clinics as applicable) and their contact numbers. Record sources in the plan/commit.
2. **Seed** the `Clinic` table with correct rows for the clinics nurses reference (`CLN001`, `CLN002`, …): `RegNum`, `Name`, `Address`, `TelephoneNumber`, `Email`. Add this to the appropriate seeder (`state-naked.js` and/or a dedicated `seed-clinics.js`) so `CLN001`/`CLN002` FKs resolve and the admin dropdown populates.
3. **Optionally** seed `MedicalFacility` rows (Type/Address/Phone/Name/ClinicID) if any feature reads them; otherwise leave for a later phase.
4. **Verify** the admin nurse-form clinic dropdown now lists real clinics, and nurse→clinic assignment displays a real address.

### Notes / decisions
- This is effectively **creating** correct clinic data, since none exists. Treat the "wrong address" as "no address" and build it right.
- Keep addresses factual; cite the search source. Do not invent phone numbers — if a real one can't be verified, use the university switchboard or leave null with a note.

---

## Phase 29A verification checklist

- **Login**: `s227921577`, `s227921577@mandela.ac.za`, and `NUR001` all log in; wrong username fails cleanly; label reads "Username".
- **Nurse campus dropdown**: admin edits a nurse via a Campus `<select>` (real NMU campus list); selection persists and re-opens pre-selected; clinic dropdown shows real clinics. (No pin-drop / no lat-lng.)
- **View Student**: admin "View" opens a read-only page with no inputs/submit; no update route reachable; **delete still works from the same place, unchanged**.
- **Identity chip**: top-right shows "S. Whitfield" (and "Admin" for admins); click opens View Profile / Logout; logout is CSRF-safe POST; dark-mode styled; keyboard accessible.
- **Clinics**: `Clinic` table seeded with fact-checked addresses; FKs resolve; no dangling `CLN001`.
- App boots clean; regression-check that existing login/admin flows still work.
