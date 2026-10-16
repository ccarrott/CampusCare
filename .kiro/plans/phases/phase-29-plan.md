# Phase 29 — Overview & Sectioning

A large batch of improvements grouped into three implementable sub-phases by **domain + risk profile**, so each can be built, verified, and demoed independently. The mental model of the split is:

> **29A — who you are** · **29B — what's wrong with you** · **29C — how you get seen**

## What's in / out of Phase 29

Items the user explicitly said **NOT** to plan (already done or handled elsewhere): **1** (Daily.co already implemented), **3** (icons — user supplies assets), **11** (Resend API — separate effort), **14** (nurse stock images — user supplies assets).

Everything else is planned across the three files below.

| Sub-phase | Theme | Items covered |
|-----------|-------|---------------|
| **29A** | Identity, Profiles & Access | 2 (username/email login), 5 (admin edit→view + nurse pin-drop), 9 (profile identity chip + palette), 10 (clinic address data) |
| **29B** | Symptom Intelligence & Escalation | 7 (review wording), 8 (not-listed + dropdowns + dots), 12 (week-window escalation + prefill), 17 (symptom search + autocomplete) |
| **29C** | Consultation UX, Permissions & Locator Hardening | 4 (student nurse-profile page), 6 (dark-mode legend), 13 (consultation progress bar), 15 (hospital locator audit), 16 (real-site permission flows) |

## Cross-cutting realities discovered during investigation (read before starting)

These findings from the codebase change the shape of several items — they are not "fixes to existing things" but "build the thing that was assumed to exist":

1. **Login uses field `idNumber` with NO format validation on login** (`auth.controller.handleLogin`). The email-login trick (item 2) is a one-line `.split('@')[0]` after `sanitize`. No model changes needed. (29A)
2. **Nurse location = campus dropdown, not pin-drop** (revised with user). We only need which campus a nurse is on, so item 5 is a simple `<select>` over the real NMU campus list — optionally one small `Campus` column (or reuse `Address`), no coordinates, no map. (29A)
3. **`Clinic` and `MedicalFacility` are NEVER seeded** — `CLN001`/`CLN002` FKs on nurses are dangling; the admin clinic dropdown is empty on a fresh DB. So item 10 is **"create correct clinic data,"** not "fix wrong strings." (29A)
4. **No `In Progress` appointment status exists** — only Pending/Confirmed/Completed/Cancelled. The progress bar (item 13) must **derive** "today" and "in-progress" client-side from `Time` vs now, not from a DB column. (29C)
5. **Permissions (item 16) is narrowly scoped** (revised with user): only two prompts — **location on login/first-load** (re-ask next login if not yet granted) and **camera/mic on the first online consultation**. No cookie banner, no permission dashboard. The eager on-load `Notification.requestPermission()` gets removed as a side cleanup. (29C)
6. **Hospital directions (item 15) fixed properly** (user gave full latitude): the current name-string link mis-resolves and the old coord-only link "landed on wrong spots." Fix = layered Google Maps URL with `destination=<lat>,<lon>` **+ `destination_place_id`** (Place IDs captured per hospital) so it opens to the exact ER. Location via item 16's `ensureLocation()`, with the student's pin-drop as a fallback origin. (29C)
7. **Symptom form opens only the first 3 categories** (`catIdx < 3 ? 'open' : ''`); the "orange dot" is `&#9679;` in `--status-warning`; tier is `Math.max(...Tier)`. (29B)

## Suggested execution order

29A → 29B → 29C. Rationale: 29A includes schema migrations (nurse lat/lng, clinic seed) and the identity palette that 29C's UI polish builds on; 29B is self-contained triage logic; 29C depends on nothing from B and can slot last. Each sub-phase file ends with its own verification checklist.

See:
- `phase-29A-plan.md`
- `phase-29B-plan.md`
- `phase-29C-plan.md`
