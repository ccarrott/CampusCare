# Phase 30F — Immersive: Video Call (`.layout-immersive`)

**Goal:** the Daily.co consultation stops being a card in a page and becomes an immersive, edge-to-edge call screen with **floating glass controls** — like a real video app. Backend/Daily logic untouched.

## Scope
- **`views/consultations/call.ejs`** → `.layout-immersive`: the Daily iframe fills the viewport (minus the collapsed nav rail), rounded, no bordered `.content-card`.
- **Floating glass overlays:**
  - Top-left: consultation context (with whom, time) as a small glass pill.
  - Top-right / bottom: "Leave & Return" as a glass control (Daily's own controls remain inside its iframe).
  - The cam/mic readiness note (29C) becomes a tasteful pre-join glass toast, not an inline banner.
- Hide the global footer + minimise nav chrome on this page for focus.
- Keep the CDN/local Daily SDK fallback and the `left-meeting` → redirect logic exactly as-is.

## `.layout-immersive` (CSS)
Full-bleed container, no `page-wrapper`/`.content-card`; children position `fixed`/`absolute` glass overlays. Nav rail auto-collapses (or floats minimal) here.

## Guardrails
- Do NOT touch room creation, tokens, join-window guard, or the Daily join call — this is purely the frame around it.
- Camera/mic permission flow (Permissions-Policy delegation) stays.
- Mobile: iframe fills screen; overlays reflow to reachable corners.

## Verify
Join a demo consultation → immersive full-screen call, glass controls float, leave returns correctly; nurse + student both work; both themes; mobile.
