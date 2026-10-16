# Phase 30D — Focused Flows (`.layout-focused`)

**Goal:** the guided, single-purpose pages become centered single-column glass "sheets" with progressive disclosure — not card grids. No backend changes.

## Scope — pages
- **Symptom checker** (`views/student/symptom-form.ejs`) — the token-input bar, category tags, search, "not listed", severity/duration/trajectory become a calm vertical flow in one focused column. Keep all 29B logic (escalation, prefill, autocomplete, tier dots).
- **Recommendations** (`views/student/recommendations.ejs`) — focused result sheet; Tier-2/3 banners as prominent glass callouts; OTC cards as a clean list; hospital locator (Tier 3) styled (map link stays until 30G).
- **Booking** (`views/consultations/book.ejs`) — the multi-step flow (type → nurse → slot → language) as a focused stepper; nurse preview card glassed; recent-booking nudge kept.
- **Auth pages** (`views/auth/*`) — centered glass auth card over the aurora (login, register, forgot, reset). Keep username/email login + all copy.
- **Profile** (`views/profile/view.ejs`, `edit.ejs`, `location.ejs`) — focused sheets; the pin-drop map on `location.ejs`/`edit.ejs` stays Leaflet until 30G, then swaps to MapLibre.
- **Review** (`views/consultations/review.ejs`, `nurse-reviews.ejs`) — focused; optional-comment (29B) kept.

## `.layout-focused` (CSS)
Centered column max-width ~640–760px, generous `--space-*` rhythm, one or few stacked glass sections, `.reveal` on load. Form fields near-solid (contrast) inside glass containers, brand-yellow focus ring.

## Guardrails
- Progressive disclosure: keep step-by-step reveals (booking steps, submit section appearing after selection).
- All form `_csrf`, validation, and controller bindings unchanged.
- Focus management + keyboard nav on the token input, steppers, modals.

## Verify
Each flow works end-to-end (submit, validation errors, prefill); centered focused layout in both themes; keyboard + reduced-motion OK; mobile single-column.
