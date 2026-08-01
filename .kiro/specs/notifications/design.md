# Component Design: Notification System

## Overview
In-app notification system that alerts users about important events. Displayed via a bell icon in the topbar with an unread count badge and a dropdown panel.

## Database Table

```sql
CREATE TABLE Notification (
  NotificationID varchar(50) PRIMARY KEY,
  UserID varchar(20) NOT NULL,
  UserType varchar(10) NOT NULL,  -- student, nurse, admin
  Title varchar(200) NOT NULL,
  Message text,
  IsRead tinyint(1) DEFAULT 0,
  CreatedAt datetime DEFAULT CURRENT_TIMESTAMP
);
```

## Model Functions (`src/models/notificationModel.js`)

- `getUnreadCount(userId, userType)`: Returns count of unread notifications
- `getRecentNotifications(userId, userType, limit)`: Fetches last N notifications
- `markAsRead(notificationId)`: Sets IsRead = 1
- `markAllAsRead(userId, userType)`: Marks all notifications read for user
- `createNotification({ userId, userType, title, message })`: Inserts new notification

## Notification Triggers

| Event | Recipients | Title |
|-------|-----------|-------|
| Appointment booked | Nurse | "New appointment booked by [Student]" |
| Appointment confirmed | Student | "Your appointment has been confirmed" |
| Appointment cancelled | Both | "Appointment [ID] has been cancelled" |
| Appointment rescheduled | Nurse | "[Student] rescheduled appointment" |
| Appointment completed | Student | "Rate your consultation with [Nurse]" |
| Tier escalation detected | Student | "Health alert: Please book a consultation" |
| Outbreak detected | Admin, Nurses | "Outbreak alert: [Symptom] in [Zone]" |
| New student registered | Admin | "New student registered: [Name]" |
| Low medication stock | Admin | "Low stock alert: [Medication] at [Facility]" |

## Controller (`src/controllers/notificationController.js`)

- `getNotifications(req, res)`: Returns JSON of user's notifications (for AJAX dropdown)
- `markRead(req, res)`: Marks single notification as read
- `markAllRead(req, res)`: Marks all as read

## Routes (`src/routes/notificationRoutes.js`)

- `GET /notifications` → `getNotifications` (requireAuth) — returns JSON
- `POST /notifications/:id/read` → `markRead` (requireAuth)
- `POST /notifications/read-all` → `markAllRead` (requireAuth)

## Frontend Integration

- Topbar includes notification bell with badge
- On page load: fetch unread count via AJAX → update badge
- Click bell: fetch recent notifications → render in dropdown panel
- Click notification: mark as read + navigate to relevant page

## Notification Service (utility)

Create `src/services/notificationService.js`:
```javascript
import * as NotificationModel from '../models/notificationModel.js';
import crypto from 'crypto';

export async function notify(userId, userType, title, message) {
  const id = 'NTF-' + crypto.randomBytes(6).toString('hex');
  await NotificationModel.createNotification({
    notificationId: id, userId, userType, title, message
  });
}
```

Controllers call `notify()` at appropriate trigger points.

## Tasks

- [ ] Task 1: Create Notification table via migration
- [ ] Task 2: Build notificationModel.js
- [ ] Task 3: Build notificationController.js + routes
- [ ] Task 4: Create notificationService.js helper
- [ ] Task 5: Add bell icon + badge to topbar partial
- [ ] Task 6: Frontend JS for fetching/displaying notifications
- [ ] Task 7: Wire triggers into appointment controller (book, cancel, complete)
- [ ] Task 8: Wire triggers into symptom escalation detection
- [ ] Task 9: Wire admin notification triggers (new registration, outbreak)
