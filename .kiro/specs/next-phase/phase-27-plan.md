# Phase 27: Tier 3 Emergency — Nearest Hospital Locator

## Goal

When a student's symptom evaluation results in **Tier 3** (urgent/emergency), the recommendations page should:
1. Request the student's live GPS location via browser Geolocation API
2. Compute the nearest hospital/ER from a hardcoded list
3. Display the hospital name, address, distance, and a "Get Directions" link (Google Maps/Waze)

---

## How It Works

### Flow
1. Student submits symptoms → server determines `maxTier >= 3`
2. Recommendations page renders with the urgent red banner
3. JavaScript on that page calls `navigator.geolocation.getCurrentPosition()`
4. Browser asks: "CampusCare wants to know your location" → student clicks Allow
5. Client-side JS computes distance to each hospital using Haversine formula
6. Displays the nearest one with name, address, phone, distance, and directions link
7. If geolocation is denied/unavailable, show ALL hospitals sorted by proximity to NMU campus (fallback)

### Why Hardcoded (Not API)
- Hospitals don't move. The list changes maybe once a decade.
- No external API dependency during an emergency (Overpass could be slow/down)
- Faster — instant computation, no network round-trip
- Works offline once the page is loaded

---

## Hospital Data (Nelson Mandela Bay)

| Name | Type | Lat | Lon | Address | Phone |
|------|------|-----|-----|---------|-------|
| Livingstone Hospital | Public ER | -33.9580 | 25.6100 | Standford Rd, Korsten | 041 405 9111 |
| Dora Nginza Hospital | Public ER | -33.8720 | 25.5640 | Spondo St, Zwide | 041 406 4111 |
| Provincial Hospital (PE) | Public ER | -33.9470 | 25.6050 | Buckingham Rd, Central | 041 392 3911 |
| Life Mercantile Hospital | Private ER | -33.9620 | 25.5890 | Alfred Rd, Mill Park | 041 395 2222 |
| Netcare Greenacres Hospital | Private ER | -33.9530 | 25.5780 | Cape Rd, Newton Park | 041 390 7000 |
| NMU South Campus Clinic | Campus | -33.9860 | 25.6600 | University Way, Summerstrand | 041 504 1111 |

---

## Client-Side Implementation

### Haversine Distance (JS)
```js
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

### Geolocation Request
```js
navigator.geolocation.getCurrentPosition(
  (pos) => findNearestHospital(pos.coords.latitude, pos.coords.longitude),
  (err) => showAllHospitals(), // fallback: show full list
  { enableHighAccuracy: true, timeout: 10000 }
);
```

### Directions Link
```
https://www.google.com/maps/dir/?api=1&destination={lat},{lon}&travelmode=driving
```
Or Waze: `https://waze.com/ul?ll={lat},{lon}&navigate=yes`

---

## UI Design (on recommendations.ejs when maxTier >= 3)

```
┌──────────────────────────────────────────────────────────────┐
│  🚨 URGENT: Seek Immediate Medical Attention                 │
│                                                              │
│  📍 Detecting your location...                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🏥 Nearest Emergency Room:                            │  │
│  │                                                        │  │
│  │  LIVINGSTONE HOSPITAL                                  │  │
│  │  Standford Rd, Korsten                                 │  │
│  │  📞 041 405 9111                                       │  │
│  │  📏 2.3 km away                                        │  │
│  │                                                        │  │
│  │  [Get Directions (Google Maps)]  [Open in Waze]        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Can't detect location? Call campus clinic: 041 504 1111     │
└──────────────────────────────────────────────────────────────┘
```

- Red/urgent styling (matches existing Tier 3 banner)
- Shows "Detecting your location..." while waiting for GPS
- On success: shows nearest hospital with distance + directions
- On failure: shows campus clinic number + full hospital list
- "Get Directions" opens Google Maps in new tab with driving route
- Also shows "Other nearby hospitals" expandable section

---

## Implementation

| Step | What | Where |
|------|------|-------|
| 1 | Add hospital data as a JS constant in recommendations.ejs (only rendered when maxTier >= 3) | `views/student/recommendations.ejs` |
| 2 | Add Haversine function + geolocation request JS | Same file (inline `<script>`) |
| 3 | Add the "Nearest ER" card HTML (hidden until location found) | Same file |
| 4 | Fallback: if geolocation denied, show all hospitals with campus clinic highlighted | Same file |
| 5 | Add CSS for the emergency hospital card | `public/css/style.css` |

**No server-side changes needed.** This is entirely client-side — the hospital list is static, the geolocation is browser-native, and the distance calculation runs in JS.

---

## Privacy

- Geolocation is ONLY requested on Tier 3 pages (not everywhere)
- Coordinates are used client-side only (never sent to our server)
- Student can deny the permission — fallback shows all hospitals
- No tracking, no storage, no logging of their live location

---

## Edge Cases

| Case | Handling |
|------|----------|
| Student denies location permission | Show all hospitals sorted by distance from NMU campus |
| Student is far from Gqeberha | Still works — shows nearest from the list (might be 50km away) |
| Browser doesn't support geolocation | Same as denied — show full list |
| Timeout (no GPS fix in 10s) | Show "Unable to detect" + full list |
