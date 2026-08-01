# Phase 13: Health Trend Mapping — Implementation Plan

## Context
- University: Nelson Mandela University (NMU), Summerstrand, Gqeberha, Eastern Cape, South Africa
- Target: Leaflet.js map with realistic campus/suburb zones, heatmap of symptom reports, outbreak detection

---

## Part A: Realistic Address Overhaul

### Student Address Distribution (realistic for NMU)
- **~60% Summerstrand** (on-campus + nearby student flats)
  - NMU Res: "Lena Allen Res, NMU South Campus"
  - NMU Res: "Xanadu Res, NMU South Campus"
  - NMU Res: "Founders Res, NMU South Campus"
  - Flats: "14 Hoff Street, Summerstrand"
  - Flats: "3rd Avenue, Summerstrand"
  - Flats: "Marine Drive, Summerstrand"
  - Flats: "6th Avenue, Summerstrand"
  - Flats: "Beach Road, Summerstrand"
  
- **~25% Central / Newton Park** (budget student digs)
  - "42 Ring Road, Newton Park"
  - "15 Mount Road, Central"
  - "8 Albany Road, Central"
  - "23 Buffelsfontein Road, Newton Park"

- **~15% Further suburbs**
  - "12 Heugh Road, Walmer"
  - "5 Circular Drive, Lorraine"
  - "34 Main Road, Walmer Park"

### Nurse/Staff Addresses
- NUR001: "12 Marine Drive, Summerstrand" (close to campus)
- NUR002: "7 Admiralty Way, Summerstrand"
- NUR003: "45 Buffelsfontein Road, Newton Park"

### Clinic Addresses
- CLN001: "Main Campus Clinic, University Way, Summerstrand"
- CLN002: "North Campus Health Centre, 2nd Avenue, Summerstrand"

---

## Part B: Campus Zone Definitions (for Leaflet.js map)

| ZoneID | Name | Lat | Lon | Radius (m) | Notes |
|--------|------|-----|-----|-------------|-------|
| ZONE01 | NMU South Campus (Res) | -33.9875 | 25.6612 | 400 | Main campus residences |
| ZONE02 | NMU North Campus | -33.9810 | 25.6585 | 300 | 2nd Ave campus buildings |
| ZONE03 | Summerstrand Flats | -33.9830 | 25.6670 | 500 | Off-campus student flats (Hoff, 3rd Ave, 6th Ave) |
| ZONE04 | Marine Drive Area | -33.9870 | 25.6720 | 300 | Beachfront student accommodation |
| ZONE05 | Newton Park | -33.9510 | 25.6150 | 600 | Budget student digs, Ring Road area |
| ZONE06 | Central (Gqeberha CBD) | -33.9600 | 25.6020 | 500 | City centre, Mount Road, Albany Road |
| ZONE07 | Walmer | -33.9730 | 25.6280 | 400 | Suburban residential |
| ZONE08 | Lorraine | -33.9400 | 25.5950 | 400 | Further residential suburb |

---

## Part C: Extra Student Profiles (Lightweight, for map density)

Add ~15 additional students to the DB. These are display-only records (not accounts you log into) — they just need:
- StudentNumber (unique, realistic format: s22XXXXXXX)
- Address (spread across zones per distribution above)
- FirstName, LastName
- Password (hashed, but irrelevant — these are demo padding)

Purpose: gives the map enough data points per zone to show meaningful density.

---

## Part D: Outbreak Simulation Seeder

### Script: `src/config/seed-outbreak.js`

**What it does:**
1. Picks a target zone (e.g., Central / Newton Park)
2. Finds all students with addresses in that zone
3. Generates 15-25 SymptomLog entries for those students over the past 7 days
4. Concentrates on one symptom (e.g., "Fever & Chills") to simulate a flu cluster
5. Mixes in some secondary symptoms (headache, body aches) for realism

**Usage:**
```powershell
# Simulate a flu outbreak in Central
node src/config/seed-outbreak.js --zone=Central --symptom="Fever & Chills"

# Or with defaults (Central, Fever)
node src/config/seed-outbreak.js

# Clear outbreak data (remove SymptomLog entries from last 7 days)
node src/config/seed-outbreak.js --clear
```

**Why this approach:**
- Uses the real production data path (SymptomLog)
- The trends dashboard and map read from SymptomLog naturally
- No UI hacks or hardcoded visuals
- Demo-friendly: run before presentation, clear after
- Production-realistic: if 20 real students reported flu, the data would look exactly like this

---

## Part E: Leaflet.js Map Integration

### Technology
- **Leaflet.js** (CDN, no install needed): `https://unpkg.com/leaflet@1.9.4/`
- **OpenStreetMap** tiles (free, no API key)
- **Leaflet.heat** plugin for heatmap overlay

### Map Features
1. Centered on NMU South Campus (-33.9875, 25.6612), zoom level 13
2. Circle markers for each zone (radius proportional to symptom count)
3. Heatmap layer showing symptom density
4. Colour coding:
   - Green: 0-2 reports (normal)
   - Yellow: 3-4 reports (elevated)
   - Red: 5+ reports (outbreak threshold)
5. Click zone circle → popup with zone name, report count, top symptom
6. Legend showing colour scale

### Data Flow
```
SymptomLog (StudentNumber + SymptomName + LogDate)
    ↓
Student (StudentNumber → Address)
    ↓
StudentZone (StudentNumber → ZoneID)
    ↓
CampusZone (ZoneID → Lat/Lon)
    ↓
Trend API endpoint → JSON with zone counts
    ↓
Leaflet.js renders circles/heatmap on map
```

### Privacy
- Map shows aggregated zone counts only (never individual student markers)
- Minimum 3 reports per zone before it appears on map
- No student names or IDs exposed to the frontend

---

## Execution Order

1. Update seedData.json with realistic Gqeberha addresses for all students/nurses
2. Add 15 extra lightweight student profiles spread across zones
3. Create CampusZone + StudentZone tables, seed with NMU zone data
4. Map students to zones based on their addresses
5. Build the outbreak seeder script (`seed-outbreak.js`)
6. Add Leaflet.js to the trends dashboard view
7. Build trend API endpoint returning zone-aggregated SymptomLog data
8. Render map with circles + heatmap + popup details
9. Run outbreak seeder and verify the map shows the hotspot
