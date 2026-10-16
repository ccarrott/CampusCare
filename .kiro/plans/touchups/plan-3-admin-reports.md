# Plan 3 — Admin Portal & Reporting

## Problem Statement
Admin-portal and reporting fixes: removing manual student creation, fixing a duplicate
delete-notification bug, restricting nurse editing, relocating review moderation off the report
page, repositioning the report action bar, adding an Export PDF action, and producing clean
print output.

> **Item 15 (Reports nav label "View reports" → "Generate report") is dropped** per decision —
> it is intentionally omitted from this plan.

## Global Constraints
- **UI-only terminology rename:** only EJS visible text/labels — never the `Appointment` table,
  columns, `appointments.*.js`, routes, or JS identifiers.
- No new client libraries, no build step, **no server-side PDF library** (tech policy forbids new
  deps / build steps).
- Use tokens from `ui-design.md`; no hardcoded colours/shadows/radii/spacing.
- Verify in light + dark mode and no console errors. Restart `node src/app.js` (kill stale node
  on port 3000) to test.

## Architecture Notes (grounded in current code)
- Admin module: `src/modules/admin/{admin.controller.js, admin.model.js, admin.routes.js}`,
  mounted under `/management/admin`.
- The CSV export route is wired directly in `src/app.js`
  (`GET /management/admin/reports/export-csv` → `exportAppointmentsCSV` in
  `src/modules/export/export.controller.js`); there is **no** PDF export today.
- The report action bar (Export CSV link + Print button) sits in the top `dash-hero` header of
  `views/admin/reports.ejs` and uses `.action-btn` classes (not `.btn`).
- The `@media print` block (`public/css/style.css` ~lines 2172–2182) hides `.btn`, nav, footer,
  aurora, etc. — but **not** `.action-btn`, so the report's own buttons currently print.
- There is **no** student edit route/handler wired; `student-form.ejs` and `createStudent` are
  only reached via the Add Student flow. `admin.model.js updateStudent` is defined but unused.
- The duplicate success alert is a **view double-render**: `students.ejs` includes the shared
  `alerts` partial *and* has a near-identical inline `<% if (success) %>` block.

---

## Item 16 — Remove "Add Student" Option (A100)

**Target files**
- `views/admin/students.ejs` ("+ Add Student" button ~line 22; subtitle ~line 13).
- `src/modules/admin/admin.routes.js` (`GET /students/add` and `POST /students/add`,
  ~lines 16–17).
- `src/modules/admin/admin.controller.js` (`showAddStudentForm`, `handleAddStudent`).
- `views/admin/student-form.ejs` (orphaned after removal — no student edit route exists).
- `src/modules/admin/admin.model.js` (`createStudent` — becomes unused).

**Implementation Steps**
1. Remove the "+ Add Student" button from `students.ejs`; update the subtitle to
   "View or remove student accounts." (drop "add").
2. Delete the `GET`/`POST /students/add` routes and the `showAddStudentForm` /
   `handleAddStudent` controller handlers.
3. Delete the now-orphaned `views/admin/student-form.ejs` and the unused `createStudent` model
   function (dead-code cleanup — confirm no other references first).
4. Keep the list / view / delete routes intact.

**Verification**
- Manage Students shows no add button; `/management/admin/students/add` returns 404.
- List, view, and delete still work.
- Grep confirms no remaining references to `showAddStudentForm`, `handleAddStudent`,
  `student-form`, or `createStudent`.

---

## Item 17 — Fix Duplicate Delete Notification Bug (A100 / E200)

**Target files**
- `views/admin/students.ejs` (inline success block ~lines 8–10, duplicating the `alerts`
  partial at ~line 6).
- `views/admin/nurses.ejs` (check for the same inline-vs-partial duplication).

**Context**
Deleting a student redirects with `?success=Student deleted.`; `listStudents` passes `success`
into the view, and **both** the shared `alerts` partial and an inline block render it → two green
banners. It is a view double-render, not a toast/JS double-bind (`toast.js` only fires on
`?toast=`, which delete does not set).

**Implementation Steps**
1. In `students.ejs`, remove the inline `<% if (success) %>` success block (keep the shared
   `<%- include('../partials/alerts') %>`).
2. Inspect `nurses.ejs`; if it has the same inline duplicate, remove it there too so nurse
   delete/add also shows exactly one banner.

**Verification**
- Deleting a student shows exactly **one** success banner.
- Nurse delete/add likewise show one banner; other success messages still appear once.

---

## Item 18 — Restrict Admin Nurse Editing (A100)

**Target files**
- `views/admin/nurse-form.ejs` (lock all fields except Campus + Assigned Clinic in the
  `isEdit` branch).
- `src/modules/admin/admin.controller.js` (`handleUpdateNurse`, ~lines 173–177 — read only
  `campus` + `clinicId`).
- `src/modules/admin/admin.model.js` (`updateNurse` — narrow the UPDATE to
  `Campus` + `ClinicID`).

**Context**
Today the edit form writes FirstName, LastName, Email, PhoneNumber, Campus, ClinicID
(StaffNumber is already `readonly`, Password hidden on edit). The requirement: admin may edit
**only Campus and Assigned Clinic**.

**Implementation Steps**
1. In `nurse-form.ejs`, **on the edit branch only** (`isEdit === true`): render FirstName,
   LastName, Email, PhoneNumber as read-only context (either `readonly`/`disabled` inputs or
   plain detail text), and keep **Campus** and **Assigned Clinic** as the only editable fields.
   The add-nurse branch keeps all fields.
2. In `handleUpdateNurse`, read only `campus` (validated against `CAMPUSES`) and `clinicId`
   from `req.body`; ignore the rest.
3. Change `updateNurse` to `UPDATE Nurse SET Campus = ?, ClinicID = ? WHERE StaffNumber = ?`
   (parameterised). This prevents blanking non-submitted columns.

**Verification**
- Editing a nurse persists only Campus/Clinic; name/email/phone are unchanged in the DB even if
  the form is tampered with (server ignores them).
- Add-nurse is unaffected (still accepts all fields).

---

## Item 19 — Relocate Pending Nurse Reviews (D200)

**Target files**
- `views/admin/reports.ejs` (remove the "Pending Nurse Reviews" section, ~lines 99–144).
- `views/admin/nurses.ejs` (new home for the moderation queue) — or a dedicated moderation
  partial included there.
- `src/modules/admin/admin.controller.js`:
  - `showAdminReport` — drop `pendingNurseReviews` from the data/render.
  - `listNurses` — add `pendingNurseReviews` via `ReviewsModel.getPendingNurseReviews()`.
  - `approveNurseReview` / `rejectNurseReview` — change redirect targets from
    `/management/admin/reports` to `/management/admin/nurses`.

**Implementation Steps**
1. Move the pending-reviews moderation table (the Approve/Reject inline forms) off the analytics
   report onto the Manage Nurses view — the natural home for nurse-review moderation.
2. Wire the data: remove the fetch/pass from `showAdminReport`; add it to `listNurses`.
3. Update both moderation handlers' redirects to return to Manage Nurses.
4. Keep the approve/reject routes and `updateNurseReviewVerification` model logic unchanged.

**Verification**
- The report page no longer shows pending reviews.
- Manage Nurses shows the moderation queue; Approve/Reject work and redirect back to Manage
  Nurses; `Verified` updates correctly.

---

## Item 20 — Report Action Bar Repositioning (D200)

**Target files**
- `views/admin/reports.ejs` (the action `<div class="mt-2">` currently inside
  `<header class="dash-hero">`, ~lines 11–14).

**Implementation Steps**
1. Move the action bar (Export CSV + Print + the new Export PDF from Item 21) out of the hero
   header to the **bottom** of `<main>`, after the last report section.
2. Wrap it in a labeled action-bar container (give it a stable class, e.g.
   `report-actions`, so Item 22's print rule can target it).

**Verification**
- The action buttons render at the bottom of the report.
- CSV export and print still work from the new location.

---

## Item 21 — Add "Export PDF" Option (D200)

**Target files**
- `views/admin/reports.ejs` (action bar).

**Context**
No PDF export exists, and the tech policy forbids new dependencies / build steps / server-side
PDF libs. Implement PDF client-side as print-to-PDF.

**Implementation Steps**
1. Add a third action button, **"Export PDF"**, alongside Export CSV and Print at the bottom
   action bar.
2. Implement it as a `window.print()` trigger (browsers offer "Save as PDF" in the print
   dialog), relying on the clean print stylesheet from Item 22. Label it "Export PDF" to make
   the intent explicit.
3. If a true server-generated PDF is ever required, that needs a dependency decision and is
   out of scope here.

**Verification**
- "Export PDF" appears alongside Print and Export CSV at the bottom.
- Clicking opens the print dialog where the user can save a clean PDF (verified via Item 22).

---

## Item 22 — Clean Report Printing (`@media print`) (D200)

**Target files**
- `public/css/style.css` (`@media print` block, ~lines 2172–2182).

**Context**
The print rule hides `.btn`, nav, footer, `.sidebar`, `.floating-controls`, `.theme-toggle`,
`#app-aurora`, etc., but **not** `.action-btn` — so the report's Export/Print buttons currently
print on the page.

**Implementation Steps**
1. Add `.action-btn`, `.action-btns`, and the Item 20 wrapper class (e.g. `.report-actions`)
   to the `@media print` `display: none !important` list, so the Print / Export CSV / Export PDF
   controls do not print.
2. Confirm the nav rail, floating controls, theme toggle, aurora, and footer are already hidden
   (they are) and that stat tiles / tables remain.
3. Verify Chart.js `<canvas>` elements render acceptably in print; if a canvas doesn't paint in
   a given browser, add a small print note or ensure the data tables below convey the same info.

**Verification**
- Printing (or Export PDF) the report produces a clean document — no sidebar, no action buttons,
  no aurora — black-on-white content.
- Both light and dark themes print legibly.

---

## Suggested Execution Order
1. Item 17 (duplicate-alert fix — isolated, quick).
2. Item 16 (remove Add Student — routes/controller/view/model cleanup).
3. Item 18 (restrict nurse edit — controller/model/view).
4. Item 19 (relocate moderation — controller + two views + redirects).
5. Items 20 → 21 → 22 (action bar move, add PDF, then print CSS — do together, since 21 and 22
   depend on 20's wrapper and each other).
