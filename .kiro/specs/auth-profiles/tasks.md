# Tasks: Authentication & Profiles

## Completed
- [x] Task 1: Initialize database configuration pool (`src/config/database.js`).
- [x] Task 2: Create `userModel.js` with parameterized query functions.
- [x] Task 3: Build authentication controller and route definitions.
- [x] Task 4: Implement session security middleware (`requireAuth`, `requireStudent`, `requireNurse`, `requireAdmin`).
- [x] Task 5: Implement `updateStudentProfile` and `deleteStudentAccount` in `userModel.js`.
- [x] Task 6: Build profile view controller (`profileController.js`) and routes (`profileRoutes.js`).
- [x] Task 7: Create profile management UI views (`views/profile/view.ejs` and `views/profile/edit.ejs`).
- [x] Task 8: Add `Password` column to `Nurse` and `Admin` tables via migration.
- [x] Task 9: Install bcrypt and hash all passwords (registration + login comparison).
- [x] Task 10: Add validation middleware (isValidStudentNumber, isValidEmail, isValidPassword) — Phase 20.
- [x] Task 12: Add password change functionality for all roles (current pw + new pw + confirm) — Phase 17.

## Remaining
- [ ] Task 11: Implement nurse and admin profile view/edit pages (admin currently shows basic info only).
- [ ] Task 13: End-to-end authentication testing across all three roles.
