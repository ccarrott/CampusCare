# Component Design: Authentication & Profiles (v2)

## Current State: Implemented
Core auth (login/register/logout), profile CRUD (view/edit/delete), bcrypt hashing all functional.

## Next Phase Features

### 1. Auto-Detect Login (Remove Role Dropdown)
**Problem**: Users must select their role before logging in — confusing and error-prone.

**Solution**: Single ID + password form. Backend searches all three tables:
```
1. Check Student table (WHERE StudentNumber = ?)
2. If not found → Check Nurse table (WHERE StaffNumber = ?)
3. If not found → Check Admin table (WHERE StaffNumber = ?)
4. If found → bcrypt.compare → set session with detected role
```

**Controller change** (`handleLogin`):
- Remove `userType` from `req.body`
- Sequential lookup: Student → Nurse → Admin
- Detected role stored in session as before

**View change** (`views/auth/login.ejs`):
- Remove the `<select>` for userType
- Just ID + Password fields

---

### 2. Forgot Password Flow

**New routes:**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/auth/forgot-password` | `showForgotPasswordForm` |
| POST | `/auth/forgot-password` | `handleForgotPassword` |
| GET | `/auth/reset-password/:token` | `showResetForm` |
| POST | `/auth/reset-password/:token` | `handlePasswordReset` |

**New DB table:**
```sql
CREATE TABLE PasswordResetToken (
  TokenID varchar(50) PRIMARY KEY,
  UserID varchar(20) NOT NULL,
  UserType varchar(10) NOT NULL,
  Token varchar(100) NOT NULL UNIQUE,
  ExpiresAt datetime NOT NULL,
  Used tinyint(1) DEFAULT 0
);
```

**Flow:**
1. User enters their ID on forgot-password form
2. System looks up user (same auto-detect as login)
3. Generates a crypto random token, stores with 1-hour expiry
4. Displays the reset link (in production: would email it)
5. User clicks link → enters new password → bcrypt hash → update DB

**New views:**
- `views/auth/forgot-password.ejs`
- `views/auth/reset-password.ejs`

---

### 3. Auth Page Layout (No Sidebar)
- Login, Register, Forgot Password, Reset Password → render WITHOUT sidebar
- Use a separate auth layout partial or conditional in header/navbar
- Content is centered vertically and horizontally (full viewport)

---

## Updated Tasks

### Completed
- [x] Task 1-7: Core auth, profile CRUD, middleware, views
- [x] Task 8: Add Password to Nurse/Admin tables
- [x] Task 9: bcrypt hashing for all roles

### Next Phase
- [ ] Task 10: Remove role dropdown → implement auto-detect login
- [ ] Task 11: Create auth page layout (no sidebar, centered card)
- [ ] Task 12: Build forgot-password flow (routes, controller, views, DB table)
- [ ] Task 13: Build password reset flow (token validation, password update)
- [ ] Task 14: Add password change feature on profile page (current + new password)
