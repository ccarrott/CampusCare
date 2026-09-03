# Product Specification & Team Operations — CampusCare

## 1. Product Vision

CampusCare is a web platform built to relieve university clinic congestion through a structured **Three-Tier Healthcare Strategy**:

* **Tier 1 (Self-Care & Automated Support)**: Symptom checking, OTC medication recommendations, campus health trend mapping with outbreak detection.
* **Tier 2 (Nurse Consultations)**: 15-minute physical or online (Daily.co video) appointments with real-time availability grids, moderated nurse reviews, and student feedback.
* **Tier 3 (Clinical Escalation & Administration)**: Nurse schedule management, patient progress tracking, admin moderation, operational analytics, CSV reporting, and nearest-ER guidance.

## 2. User Roles & Access Rights

| Role | Access Scope |
| :--- | :--- |
| **Student** | Self-registers, logs symptoms, views OTC medications, views trend maps, books consultations, joins video consultations, submits ratings/reviews, views nurse profiles ("Meet Our Staff"). |
| **Nurse** | Views clinical dashboard (Upcoming/Previous), sets weekly availability, conducts consultations, updates appointment status + notes, joins video rooms, views own rating average. |
| **Admin** | Full CRUD on student/nurse accounts, moderates reviews, generates reports with CSV export, views ratings + video attendance analytics per nurse. |

## 3. Design Principles

1. **Build features, not frameworks.** Ship functionality users interact with.
2. **Security by default.** CSRF on every form, ownership on every resource, parameterised queries everywhere.
3. **Privacy respects everyone.** Reviews are anonymous ("Patient 1, 2, 3"). Nurses see their average, not individual comments. Health-map data is aggregated per zone — never individual points exposed publicly.
4. **Progressive disclosure.** Show information when it's relevant. Prefer inline/step-by-step over separate pages.
5. **Demo-ready at all times.** The showcase seeder populates a full DB in seconds.

### Design Principles — Visual (added for the UI Haul, Phase 30)
6. **Layout follows content — not everything is a card.** Each page uses the layout *archetype* that fits its job (see `ui-design.md`): **immersive** (video call, map), **focused** (forms, checker, booking), **dashboard** (home, reports), **feed/split** (appointments, staff → profile). We deliberately move away from "every page is a grid of `.content-card`s."
7. **Immersive surfaces have no box.** The video call and the health map are edge-to-edge experiences; chrome (controls, legend, panels) *floats over* them as glass, rather than sitting in a bordered panel.
8. **Calm, alive, trustworthy.** A slow "breathing" gradient background + restrained liquid glass. Motion is soft and purposeful, never flashy. This is a health app — it should feel reassuring.

## 4. Team Member Workstream Matrix

* **Tarisai Rusike**: Module 01 — Authentication, Profiles, System Access
* **Vhuthuhawe Nekhavhambe**: Module 02 & 03 — Symptom Checking, OTC Recommendations, Health Trend Mapping
* **Bridgette Magampa**: Module 04 — Consultations, Nurse Reviews, Booking Experience
* **Seth Whitfield**: Module 05 — Nurse Availability, Progress Tracking, Admin Reports, Architecture, Security & UI System

## 5. Quality Bar

Before any feature is considered "done":
- Renders correctly in **both light and dark mode**
- Works on **mobile** (responsive nav, stacked layouts)
- Form submissions validate input and show clear errors
- Protected routes enforce role + ownership
- No console errors in the browser
- Database operations use parameterised queries
- Reachable via primary navigation

### Quality Bar — Visual (added for the UI Haul)
- Uses **design tokens** from `ui-design.md` — no hardcoded colours/shadows/radii/spacing
- Declares a **layout archetype** — doesn't default to a card grid
- Glass surfaces keep **AA text contrast** (solid tint floor under blur)
- All motion respects **`prefers-reduced-motion`**; animations use transform/opacity only (60fps, no layout shift)
- `:focus-visible` states present; keyboard navigable
- The breathing background never interferes with readability
