# Product Specification & Team Operations — CampusCare

## 1. Product Vision

CampusCare is a web platform built to relieve university clinic congestion through a structured **Three-Tier Healthcare Strategy**:

* **Tier 1 (Self-Care & Automated Support)**: Symptom checking, OTC medication recommendations, campus health trend mapping with outbreak detection.
* **Tier 2 (Nurse Consultations)**: 15-minute physical or online (Microsoft Teams) appointments with real-time availability grids, moderated nurse reviews, and student feedback.
* **Tier 3 (Clinical Escalation & Administration)**: Nurse schedule management, patient progress tracking, admin moderation, operational analytics, and CSV reporting.

## 2. User Roles & Access Rights

| Role | Access Scope |
| :--- | :--- |
| **Student** | Self-registers, logs symptoms, views OTC medications, views trend maps, books consultations, submits ratings/reviews, views nurse profiles ("Meet Our Staff"). |
| **Nurse** | Views clinical dashboard, sets weekly availability, conducts consultations, updates appointment status + notes, manages Teams links, views own rating average. |
| **Admin** | Full CRUD on student/nurse accounts, moderates reviews (approve/reject), generates reports with CSV export, views all ratings per nurse. |

## 3. Design Principles

1. **Build features, not frameworks.** Ship functionality that users interact with. Don't spend time on abstractions nobody sees.
2. **Security by default.** CSRF on every form, ownership checks on every resource, parameterised queries on every database call. Bake it in from the start.
3. **Privacy respects everyone.** Student reviews are anonymous ("Patient 1, 2, 3"). Nurses see their average, not individual comments. Admins moderate but students' identities stay private in public contexts.
4. **Progressive disclosure.** Show information when it's relevant — nurse profiles appear after selection, not before. Rating forms appear inline, not on separate pages.
5. **Demo-ready at all times.** The showcase seeder means any team member can spin up a populated database in seconds. Every dashboard has data to show.

## 4. Team Member Workstream Matrix

* **Tarisai Rusike**: Module 01 — Authentication, Profiles, and System Access
* **Vhuthuhawe Nekhavhambe**: Module 02 & 03 — Symptom Checking, OTC Recommendations, and Health Trend Mapping
* **Bridgette Magampa**: Module 04 — Consultations, Nurse Reviews, and Booking Experience
* **Seth Whitfield**: Module 05 — Nurse Availability, Progress Tracking, Admin Reports, Architecture & Security

## 5. Quality Bar

Before any feature is considered "done":
- It renders correctly in both light and dark mode
- It works on mobile (responsive sidebar, stacked forms)
- Form submissions validate input and show clear error messages
- Protected routes enforce role + ownership
- No console errors in the browser
- Database operations use parameterised queries
- The feature is accessible via the sidebar navigation
