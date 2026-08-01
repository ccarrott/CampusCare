# Requirements: Authentication & Profile Management (C100, E100-E400)

## 1. User Stories
* **US1.1 (Registration - C100)**: As a prospective student, I want to register an account with my details so I can access campus healthcare services.
* **US1.2 (Multi-Role Login - E100/E400)**: As a registered student, nurse, or admin, I want to log in securely with my credentials and role selection to access my personalized dashboard.
* **US1.3 (Profile Viewing - E400)**: As an authenticated user, I want to view my profile details stored in the session.
* **US1.4 (Profile Update - E300)**: As a student, I want to update my address and medical history so my records remain accurate.
* **US1.5 (Account Deletion - E200)**: As a student, I want to permanently delete my account from the system.

## 2. Acceptance Criteria & Validation Rules
* Registration is strictly for students (`Student` table). Nurses and admins are pre-seeded or added via administrative tasks.
* Duplicate `StudentNumber` registration attempts must be rejected with a clear error message.
* Passwords must be validated on login. Failed attempts must return an "Invalid Credentials" error.
* Profile update/deletion requires an active session matching the `StudentNumber`.