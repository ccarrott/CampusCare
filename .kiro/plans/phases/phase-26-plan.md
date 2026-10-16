# Phase 26: UX Consolidation & Admin Nurse Drill-Down

## Changes Requested

### 1. Merge Nurse Bio Editor INTO Profile View

**Current:** Separate page `/management/nurse/edit-bio` with its own sidebar link.
**Target:** Bio + YearsExperience fields embedded directly in the nurse's `/profile` page (editable inline). Remove the separate page and sidebar link.

**Implementation:**
- Add Bio textarea + YearsExperience input to `views/profile/view.ejs` (nurse section)
- Form POSTs to `/profile/update-bio` (new route in profile module)
- Remove `/management/nurse/edit-bio` route from nurse.routes.js
- Remove `views/nurse/edit-bio.ejs`
- Remove "Edit Bio" sidebar link from navbar

---

### 2. Admin Nurse Feedback Drill-Down

**Current:** Admin reports show "Nurse Feedback Overview" table with averages, but clicking does nothing.
**Target:** Clicking a nurse in the feedback overview shows their full detail: all reviews (approved + rejected + pending), individual ratings, bio, experience.

**Implementation:**
- Add a link/button per nurse row in the Nurse Feedback Overview table → `/management/admin/nurse/:staffNumber`
- New route + controller function: `showNurseDetail`
- New view: `views/admin/nurse-detail.ejs`
- Shows: nurse name, bio, experience, average rating, ALL reviews with status badges (Approved/Pending/Rejected), individual consultation ratings

---

### 3. Save All Reviews (Approved + Rejected)

**Current:** Already done — `NurseReviews` table stores all reviews with `Verified` column (Pending/Approved/Rejected). Rejected ones aren't deleted, just hidden from public views.
**No change needed** — this is already how it works.

---

### 4. Admin Dashboard: Fix "Manage Users" Card + Add "Manage Nurses"

**Current:** One card "Manage Profiles" → links to `/management/admin/students` only. The 500 error may be session-related (works when tested programmatically).
**Target:** Split into two cards:
- "Manage Students" → `/management/admin/students`
- "Manage Nurses" → `/management/admin/nurses`

---

### 5. Sidebar Ordering (All Roles)

Reorder sidebar links to follow logical user flow:

**Student:**
1. Home
2. Symptom Checker
3. Book Consultation
4. My Appointments
5. Health Trends
6. Meet Our Staff
7. Review Nurse
8. Profile

**Nurse:**
1. Home
2. Clinical Dashboard
3. Manage Availability
4. Health Trends
5. Profile (with bio editor embedded)

**Admin:**
1. Home
2. Reports (with sub-menu)
3. Manage Students
4. Manage Nurses
5. Health Trends (with sub-menu)
6. Profile

---

## Implementation Order

| Step | What |
|------|------|
| 1 | Merge bio editor into nurse profile view + remove separate page/route/sidebar link |
| 2 | Reorder all sidebar links |
| 3 | Split admin dashboard card into Students + Nurses |
| 4 | Create admin nurse detail page (drill-down from feedback overview) |
| 5 | Boot test |


---

### 6. Bug Fix: Admin Students 500 Error

**Cause:** `admin.model.js` still referenced `Student.Address` column which was dropped in Pre-Phase 23. The git rebase left stale code.

**Fixed:** Removed all `Address` references from `getAllStudents`, `createStudent`, `updateStudent`, `searchStudents` in admin.model.js + matching controller params.
