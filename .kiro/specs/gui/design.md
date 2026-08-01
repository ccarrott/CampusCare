# GUI Architecture & Component Blueprint (v2)

## 1. Layout Modes

The application uses TWO distinct layout modes:

### Auth Layout (unauthenticated pages)
- **No sidebar, no topbar**
- Content card centered both vertically and horizontally on viewport
- Used for: login, register, forgot-password, reset-password
- Background: `var(--bg-canvas)` with optional subtle pattern

### App Layout (authenticated pages)
- Fixed sidebar (collapsible) on left
- Topbar with user info
- Main content area shifts right of sidebar
- Footer pinned to bottom

---

## 2. Sidebar Navigation (Implemented)
- Dark navy (`--primary-navy`) background
- Circular gold logo at top
- Icon + text links vertically
- Toggle button to collapse (icons only mode)
- Role-aware link sets
- localStorage persistence for collapsed state

---

## 3. Dashboard Card Grid (Updated)
- **Always 2 columns** on desktop: `grid-template-columns: repeat(2, 1fr)`
- Cards are LARGE — minimum height 180px, generous padding
- Each card: icon area + title + description + action button
- On mobile (<640px): collapses to single column (1x4 stack)
- Cards fill available width equally

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.dashboard-grid .content-card {
  min-height: 180px;
  padding: 28px;
}

@media (max-width: 640px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 4. Login Page (Centered, No Sidebar)
- Full viewport centering (flexbox on body)
- Max-width 420px card
- No role dropdown — just ID + Password
- "Forgot Password?" link below form
- Link to register below that

---

## 5. Nurse Calendar View (Manage Availability)
Inspired by the availability grid mockup:
- Weekly grid: rows = hourly time slots (8:00 AM – 5:00 PM), columns = Mon–Fri
- Each cell is a clickable button toggling between Available / Unavailable / Selected
- Color coding:
  - Available: white/light with border
  - Unavailable: dark gray (`--text-muted`)
  - Selected (booked): gold/accent (`--accent-gold`)
- "Save Availability" button at bottom
- Responsive: on mobile, show one day at a time with day tabs

---

## 6. Notification Bell (Topbar)
- Bell icon in topbar-right area
- Red badge with unread count
- Click opens dropdown panel with recent notifications
- Each notification: title, message preview, timestamp, read/unread indicator
- "Mark all as read" action

---

## 7. Health Trend Map
- Embedded Leaflet.js map with OpenStreetMap tiles
- Campus-centered with defined zones
- Heatmap overlay showing symptom density per zone
- Legend showing severity/count scale
- No individual student markers (privacy)

---

## 8. Admin CRUD Tables
- Searchable, paginated data tables for students and nurses
- Row actions: Edit, Delete (with confirmation modal)
- "Add New" button opens inline form or separate page
- Responsive: horizontal scroll on mobile for wide tables

---

## Directory Blueprint

```text
public/
├── css/
│   └── style.css
├── js/
│   └── sidebar.js
views/
├── partials/
│   ├── header.ejs
│   ├── navbar.ejs (sidebar + topbar + main-content wrapper)
│   ├── footer.ejs
│   ├── alerts.ejs
│   ├── auth-header.ejs (auth-only: no sidebar, centered layout)
│   └── auth-footer.ejs (auth-only: closes centered layout)
├── auth/
│   ├── login.ejs
│   ├── register.ejs
│   ├── forgot-password.ejs
│   └── reset-password.ejs
├── student/
│   ├── symptom-form.ejs
│   ├── recommendations.ejs
│   └── symptom-history.ejs
├── nurse/
│   ├── dashboard.ejs (calendar view)
│   └── availability.ejs (weekly grid)
├── admin/
│   ├── reports.ejs
│   ├── students.ejs (list + CRUD)
│   └── nurses.ejs (list + CRUD)
├── consultations/
│   ├── book.ejs
│   └── index.ejs
├── trends/
│   └── dashboard.ejs (with map)
├── profile/
│   ├── view.ejs
│   └── edit.ejs
└── notifications/
    └── panel.ejs (partial or page)
```
