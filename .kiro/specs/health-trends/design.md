# Component Design: Health Trend Mapping (v2)

## Current State
Basic aggregate dashboard showing symptom counts by type and facility distribution. No map, no real-time logging data, no outbreak detection.

## Next Phase Features

### 1. Integrated Map with Leaflet.js

**Technology**: Leaflet.js (open source) + OpenStreetMap tiles (free, no API key needed)

**Implementation:**
- Add `<link>` and `<script>` for Leaflet CDN in trends view
- Initialize map centered on campus coordinates
- Use circle markers or heatmap plugin for density visualization
- Aggregate data ONLY (never plot individual students)

**Privacy model:**
- Data grouped by `CampusZone` (predefined areas like "Res Block A", "North Campus", etc.)
- Minimum threshold: only show zone if ≥3 reports (prevents individual identification)
- No student names/IDs ever sent to frontend map code

---

### 2. Campus Zone System

**New DB tables:**
```sql
CREATE TABLE CampusZone (
  ZoneID varchar(50) PRIMARY KEY,
  Name varchar(100) NOT NULL,
  Latitude decimal(10, 7) NOT NULL,
  Longitude decimal(10, 7) NOT NULL,
  Radius int DEFAULT 200  -- meters
);

CREATE TABLE StudentZone (
  StudentNumber varchar(20) NOT NULL,
  ZoneID varchar(50) NOT NULL,
  PRIMARY KEY (StudentNumber, ZoneID),
  FOREIGN KEY (StudentNumber) REFERENCES Student(StudentNumber),
  FOREIGN KEY (ZoneID) REFERENCES CampusZone(ZoneID)
);
```

**Model** (`src/models/trendModel.js` additions):
- `getZoneSymptomCounts()`: Aggregates SymptomLog by zone
- `getAllZones()`: Returns zone coordinates for map rendering
- `getOutbreakAlerts()`: Zones exceeding threshold in past 7 days

**Seed data**: Define 5-8 campus zones with coordinates matching the university campus

---

### 3. Outbreak Detection

**Logic:**
- Query: "For each zone, count distinct students with SymptomLog entries of the same SymptomName in the past 7 days"
- If count ≥ 5 for any symptom in any zone → flag as outbreak
- Create admin/nurse notification with zone + symptom details
- Display red alert marker on map for outbreak zones

**Controller update:**
- `renderTrendsDashboard` also fetches outbreak data
- Passes `outbreakAlerts[]` to view for rendering

**View update:**
- Map with zones as circles
- Normal zones: blue/green circles (size = report count)
- Outbreak zones: red pulsing circles with tooltip "Outbreak: [Symptom] in [Zone]"

---

### 4. Time-Series Analytics

- Add date range filter to trends dashboard (last 7 days / 30 days / semester)
- Bar chart showing daily symptom report counts (Chart.js)
- Top 5 symptoms this period
- Comparison with previous period (trending up/down arrows)

---

## Updated Tasks

### Completed
- [x] Task 1-5: Basic trend model, controller, routes, dashboard view

### Next Phase
- [ ] Task 6: Create CampusZone + StudentZone tables, seed with campus data
- [ ] Task 7: Add Leaflet.js map to trends dashboard
- [ ] Task 8: Build zone-based symptom aggregation model queries
- [ ] Task 9: Implement heatmap/circle rendering on map
- [ ] Task 10: Build outbreak detection logic + admin notification
- [ ] Task 11: Add Chart.js time-series bar chart
- [ ] Task 12: Add date range filter controls
- [ ] Task 13: Ensure all map data is privacy-compliant (no individual markers)
