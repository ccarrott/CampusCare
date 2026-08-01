# Requirements: Symptom Checker & OTC Recommendations (A100-A300)

## 1. User Stories
- **US2.1 (Symptom Catalog - A100)**: As a student, I want to browse or search common symptoms so I can select what I am experiencing.
- **US2.2 (Symptom Submission - A200)**: As a student, I want to submit my selected symptoms and severity level so the system can evaluate my condition (Tier 1).
- **US2.3 (OTC Recommendations - A300)**: As a student, I want to receive over-the-counter (OTC) medication suggestions and campus distribution point details matching my symptoms.

## 2. Acceptance Criteria & Validation Rules
- Must verify that `req.session.user` has `role === 'student'`.
- Symptom selection supports multiple selections or primary symptom lookup.
- Recommendations must cross-reference `SymptomMedication` join tables to ensure accurate medication matches.
- If symptoms fall into high-severity tiers (Tier 2/3), the system must explicitly display a warning prompting the student to book an urgent consultation.