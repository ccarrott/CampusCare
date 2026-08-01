# Component Design: Admin & Nurse Management (v2)

## Current State
Nurse dashboard shows appointment schedule + Teams link updates. Admin reports show aggregate metrics. No user CRUD, no profile management by admin.

## Next Phase Features

### 1. Admin Student Management (Full CRUD)

**Routes:**
| Method | Path | Handler | Middleware |
|--------|------|---------|-----------|
| GET | `/management/admin/students` | `listStudents` | requireAdmin |
| GET | `/management/admin/students/add` | `showAddStudentForm` | requireAdmin |
| POST | `/management/admin/students/add` | `handleAddStudent` | requireAdmin |
| GET | `/management/admin/students/:id/edit` | `showEditStudentForm` | requireAdmin |
| POST | `/management/admin/students/:id/update` | `handleUpdateStudent` | requireAdmin |
| POST | `/management/admin/students/:id/delete` | `handleDeleteStudent` | requireAdmin |

**Model** (`src/models/adminCrudModel.js`):
- `getAllStudents()`: List all students (exclude passwords)
- `updateStudent(studentNumber, data)`: Update any student fields
- `deleteStudent(studentNumber)`: Delete + cascade (appointments, ratings, symptom logs)
- `searchStudents(query)`: Filter by name or student number

**View** (`views/admin/students.ejs`):
- Searchable data table listing all students
- Columns: StudentNumber, Name, Email, Address, Actions
- Row actions: Edit (link), Delete (confirm button)
- "Add Student" button at top

---

### 2. Admin Nurse Management (Full CRUD)

**Routes:**
| Method | Path | Handler | Middleware |
|--------|------|---------|-----------|
| GET | `/management/admin/nurses` | `listNurses` | requireAdmin |
| GET | `/management/admin/nurses/add` | `showAddNurseForm` | requireAdmin |
| POST | `/management/admin/nurses/add` | `handleAddNurse` | requireAdmin |
| GET | `/management/admin/nurses/:id/edit` | `showEditNurseForm` | requireAdmin |
| POST | `/management/admin/nurses/:id/update` | `handleUpdateNurse` | requireAdmin |
| POST | `/management/admin/nurses/:id/delete` | `handleDeleteNurse` | requireAdmin |

**Model additions:**
- `getAllNurses()`: List all nurses with clinic assignments
- `updateNurse(staffNumber, data)`: Update nurse details
- `deleteNurse(staffNumber)`: Deactivate/remove (check for active appointments first)

**View** (`views/admin/nurses.ejs`):
- Data table: StaffNumber, Name, Phone, Email, Clinic, Actions
- Add form includes: password field (auto-hashed), clinic assignment dropdown

---

### 3. Enhanced Admin Reports

**Additional metrics:**
- Appointments per nurse (performance breakdown)
- Average rating per nurse
- Student registration trend (new registrations this week/month)
- Cancelled vs completed appointment ratio
- Most reported symptoms this period

**Date range filtering:**
- Dropdown: Last 7 days, Last 30 days, This Semester, All Time
- Updates all metrics dynamically

**Export:**
- CSV download button for appointment data
- CSV download for student list

---

### 4. Appointment Oversight (Admin)

- Admin can view ALL appointments (not just one nurse's)
- Can filter by: nurse, status, date range, type
- Can cancel any appointment
- Can reassign appointment to different nurse
- Can approve/update Teams links

---

## Updated Tasks

### Completed
- [x] Task 1-5: Models, controllers, routes, dashboards

### Next Phase
- [ ] Task 6: Create `adminCrudModel.js` with student/nurse CRUD functions
- [ ] Task 7: Build admin student list view with search + pagination
- [ ] Task 8: Build add/edit student forms and handlers
- [ ] Task 9: Build admin nurse list view with clinic assignments
- [ ] Task 10: Build add/edit nurse forms (with password hashing)
- [ ] Task 11: Implement delete with cascade safety checks
- [ ] Task 12: Build appointment oversight view (all appointments, filters)
- [ ] Task 13: Add date range filtering to reports
- [ ] Task 14: Implement CSV export for report data
- [ ] Task 15: Add per-nurse performance breakdown to reports
