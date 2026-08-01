# Component Design: Consultations & Reviews (v2)

## Current State
Core booking, appointment listing, and rating submission functional. No availability system, no calendar view, no reschedule/cancel.

## Next Phase Features

### 1. Nurse Availability Management

**New DB table:**
```sql
CREATE TABLE NurseAvailability (
  AvailabilityID varchar(50) PRIMARY KEY,
  StaffNumber varchar(20) NOT NULL,
  DayOfWeek varchar(10) NOT NULL,  -- Monday, Tuesday, etc.
  TimeSlot varchar(10) NOT NULL,   -- 08:00, 09:00, ..., 17:00
  Status varchar(15) DEFAULT 'Available',  -- Available, Unavailable
  FOREIGN KEY (StaffNumber) REFERENCES Nurse(StaffNumber)
);
```

**Model** (`src/models/availabilityModel.js`):
- `getAvailabilityForNurse(staffNumber)`: Returns full weekly grid
- `setSlotStatus(staffNumber, dayOfWeek, timeSlot, status)`: Toggle slot
- `saveFullAvailability(staffNumber, slots[])`: Bulk upsert entire week
- `getAvailableSlots(staffNumber, dayOfWeek)`: For booking form filtering

**Controller** (`src/controllers/availabilityController.js`):
- `showAvailabilityGrid`: Fetches nurse's grid, renders `views/nurse/availability.ejs`
- `saveAvailability`: Processes form submission (all cell states), bulk saves

**Routes:**
- `GET /management/nurse/availability` → `showAvailabilityGrid` (requireNurse)
- `POST /management/nurse/availability` → `saveAvailability` (requireNurse)

**View** (`views/nurse/availability.ejs`):
- Grid with rows (8:00 AM – 5:00 PM) × columns (Mon – Fri)
- Each cell is a button/checkbox toggling Available ↔ Unavailable
- Color-coded: Available = white, Unavailable = gray, Booked = gold
- "Save Availability" button at bottom

---

### 2. Calendar-Style Nurse Dashboard

Replace current table view with a weekly calendar:
- Horizontal: Mon–Fri columns
- Vertical: Time slots 8:00–17:00
- Appointments rendered as colored blocks within their time slot
- Block shows: Patient name, appointment type (Physical/Online)
- Click to expand: patient medical history, Teams link, notes field
- Color: Physical = blue, Online = green, Cancelled = red

---

### 3. Smart Booking (Respects Availability)

When students book:
1. Select nurse → fetch that nurse's availability
2. Only show available time slots (filter out Unavailable + already-booked)
3. Client-side: dynamically update time options based on selected nurse + date
4. Server-side: validate slot is still available before confirming

---

### 4. Reschedule Consultation

**Route:** `POST /consultations/reschedule`

**Flow:**
- Student selects appointment + new time
- System checks new slot is available
- Updates `Appointment.Time`
- Sends notification to nurse

---

### 5. Cancel Consultation

**Route:** `POST /consultations/cancel`

**Flow:**
- Student or Nurse can cancel
- Updates `Appointment.Status = 'Cancelled'`
- Sends notification to other party
- Frees up the time slot for re-booking

---

### 6. Meeting Progress (Nurse)

- Nurse can set appointment progress: Not Started → In Progress → Completed
- Notes field for post-consultation documentation
- On completion: trigger notification to student asking for rating

---

## Updated Tasks

### Completed
- [x] Task 1-5: Models, controllers, routes, booking form, appointment list

### Next Phase
- [ ] Task 6: Create `NurseAvailability` table + model
- [ ] Task 7: Build availability grid controller + view (weekly toggle grid)
- [ ] Task 8: Build calendar-style nurse dashboard view
- [ ] Task 9: Update booking form to respect nurse availability
- [ ] Task 10: Implement reschedule flow (route, controller, view update)
- [ ] Task 11: Implement cancel flow with notification
- [ ] Task 12: Add consultation notes field + progress tracking for nurses
- [ ] Task 13: Smart slot filtering (client-side AJAX for available times)
