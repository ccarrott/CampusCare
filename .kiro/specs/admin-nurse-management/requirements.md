# Requirements: Nurse & Admin Management (C200-C400, D100-D400)

## 1. User Stories
* **US5.1 (Nurse Schedule Management - D100)**: As a nurse, I want to view assigned patient consultations and manage my schedule.
* **US5.2 (Update Appointment Progress - C400)**: As a nurse, I want to update an appointment's status (`Pending`, `Confirmed`, `Completed`, `Cancelled`).
* **US5.3 (Advance Student to Tier 2/3 - D400)**: As a nurse, I want to escalate a student's care tier based on consultation findings.
* **US5.4 (Operational Reports - D200)**: As an administrator, I want to generate analytics reports summarizing total consultations, symptom distribution, and nurse ratings.
* **US5.5 (Approve Online Links - C300)**: As an admin or nurse, I want to verify and update MS Teams meeting links for online consultations.

## 2. Acceptance Criteria & Validation Rules
* Nurse actions require `role === 'nurse'`. Admin reporting requires `role === 'admin'`.
* Status updates must directly mutate the `Appointment` table record.