# Component Design: Symptom Checker & OTC Recommendations (v2)

## Current State
Single symptom selection + severity → OTC recommendations + escalation warning. No symptom logging, no multi-select, limited medication database.

## Next Phase Features

### 1. Expanded Symptom Catalog (15-20+ realistic symptoms)

**Categories & Symptoms:**

| Category | Symptom Name | Tier | Common Cause |
|----------|-------------|------|--------------|
| Systemic | Fever & Chills | 1 | Viral infection, flu |
| Systemic | Fatigue & Weakness | 1 | Sleep deprivation, stress |
| Systemic | Body Aches | 1 | Overexertion, flu |
| Systemic | Nausea | 1 | Food poisoning, anxiety |
| Respiratory | Severe Persistent Cough | 2 | Bronchial inflammation |
| Respiratory | Shortness of Breath | 3 | Asthma, pneumonia |
| Respiratory | Sore Throat | 1 | Viral pharyngitis |
| Respiratory | Nasal Congestion | 1 | Common cold, allergies |
| Neurological | Acute Headache | 1 | Dehydration, tension |
| Neurological | Migraine with Aura | 2 | Stress, hormonal |
| Neurological | Dizziness | 2 | Low blood pressure, dehydration |
| Neurological | Blurred Vision | 3 | Concussion, eye strain |
| Dermatological | Skin Rash | 1 | Allergic reaction |
| Dermatological | Persistent Itching | 1 | Dermatitis, dry skin |
| Gastrointestinal | Stomach Cramps | 1 | Indigestion, stress |
| Gastrointestinal | Diarrhea | 2 | Gastroenteritis |
| Gastrointestinal | Vomiting | 2 | Food poisoning, virus |
| Mental Health | Anxiety / Panic | 2 | Academic stress |
| Mental Health | Insomnia | 1 | Screen time, caffeine |
| Mental Health | Persistent Low Mood | 2 | Depression indicators |

---

### 2. Expanded Medication Database (20+ OTC meds)

| Code | Name | Treats | Facility |
|------|------|--------|----------|
| MED001 | Paracetamol 500mg | Fever, Headache, Body Aches | FAC001 |
| MED002 | Ibuprofen 400mg | Headache, Body Aches, Cramps | FAC002 |
| MED003 | Expectorant Cough Syrup | Cough | FAC001 |
| MED004 | Salbutamol Inhaler | Shortness of Breath | FAC002 |
| MED005 | Throat Lozenges | Sore Throat | FAC001 |
| MED006 | Antihistamine (Cetirizine) | Allergies, Rash, Itching, Congestion | FAC002 |
| MED007 | Oral Rehydration Salts | Diarrhea, Vomiting, Dehydration | FAC001 |
| MED008 | Antacid Tablets | Stomach Cramps, Nausea | FAC001 |
| MED009 | Nasal Decongestant Spray | Congestion | FAC002 |
| MED010 | Calamine Lotion | Rash, Itching | FAC001 |
| MED011 | Melatonin 3mg | Insomnia | FAC002 |
| MED012 | Eye Drops (Lubricant) | Blurred Vision (eye strain) | FAC001 |
| MED013 | Anti-Nausea Tablets | Nausea, Vomiting | FAC002 |
| MED014 | Muscle Relaxant Gel | Body Aches | FAC001 |
| MED015 | Migraine Relief (Sumatriptan OTC) | Migraine | FAC002 |

---

### 3. Symptom Logging (SymptomLog table)

Every time a student runs a symptom check:
- Record: StudentNumber, SymptomName, Severity, Timestamp, Notes
- Used for: personal history, trend analytics, tier escalation detection
- Student can view their log: `GET /symptoms/history`

---

### 4. Automatic Tier Escalation Detection

**Logic:**
- After each symptom log: check student's recent history
- If 3+ "High" severity logs in 7 days → auto-recommend Tier 2
- If any Tier 3 symptom reported → immediate escalation warning
- Create notification: "Based on your recent symptoms, we recommend booking a nurse consultation"
- Display persistent warning on student dashboard

**Model function:**
- `checkEscalationNeeded(studentNumber)`: Returns boolean + reason

---

### 5. Multi-Symptom Selection (Future)
- Allow students to select 1-3 symptoms simultaneously
- Cross-reference all selected symptoms for combined medication recommendations
- More accurate tier assessment based on combination severity

---

## Updated Tasks

### Completed
- [x] Task 1-5: Model, controller, routes, views (single symptom flow)

### Next Phase
- [ ] Task 6: Expand seedData.json with 20 symptoms + 15 medications + full mappings
- [ ] Task 7: Implement symptom logging (save to SymptomLog on every evaluation)
- [ ] Task 8: Build symptom history page (`GET /symptoms/history`)
- [ ] Task 9: Implement auto-escalation detection after each log
- [ ] Task 10: Create escalation notification (links to booking page)
- [ ] Task 11: Update recommendations view to show facility pickup locations (with FacilityID)
- [ ] Task 12: Add client-side search/filter to symptom dropdown
- [ ] Task 13: Multi-symptom selection support (checkboxes)
