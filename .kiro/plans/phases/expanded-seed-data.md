# Expanded Seed Data Plan

## Goal
Flesh out the database with realistic, relationship-consistent data for a university campus health system.

---

## Symptoms (20 entries)

| Name | Type | Tier | Cause |
|------|------|------|-------|
| Fever & Chills | Systemic | 1 | Viral infection or seasonal flu |
| Fatigue & Weakness | Systemic | 1 | Sleep deprivation, academic overload |
| Body Aches & Muscle Pain | Systemic | 1 | Overexertion, flu symptoms |
| Nausea | Gastrointestinal | 1 | Food poisoning, motion sickness |
| Acute Headache | Neurological | 1 | Dehydration, tension, screen fatigue |
| Sore Throat | Respiratory | 1 | Viral pharyngitis, dry air |
| Nasal Congestion & Runny Nose | Respiratory | 1 | Common cold, seasonal allergies |
| Skin Rash | Dermatological | 1 | Allergic reaction, contact dermatitis |
| Persistent Itching | Dermatological | 1 | Eczema, insect bites, dry skin |
| Insomnia | Mental Health | 1 | Caffeine, screen time, exam stress |
| Stomach Cramps | Gastrointestinal | 1 | Indigestion, menstrual cramps |
| Severe Persistent Cough | Respiratory | 2 | Bronchial inflammation, infection |
| Migraine with Aura | Neurological | 2 | Hormonal, stress triggers |
| Dizziness & Lightheadedness | Neurological | 2 | Low BP, dehydration, anaemia |
| Diarrhea (>2 days) | Gastrointestinal | 2 | Gastroenteritis, bacterial |
| Vomiting (Repeated) | Gastrointestinal | 2 | Food poisoning, viral |
| Anxiety & Panic Attacks | Mental Health | 2 | Academic pressure, social stress |
| Persistent Low Mood (>2 weeks) | Mental Health | 2 | Possible depression |
| Shortness of Breath | Respiratory | 3 | Asthma exacerbation, pneumonia |
| Blurred Vision & Eye Pain | Neurological | 3 | Concussion, severe migraine |

---

## Medications (15 entries)

| Code | Name | Description | Treats |
|------|------|-------------|--------|
| MED001 | Paracetamol 500mg | Take 2 tablets every 6 hours. Do not exceed 8 tablets/day. | Fever, Headache, Body Aches |
| MED002 | Ibuprofen 400mg | Take 1 tablet with food every 8 hours. Anti-inflammatory. | Headache, Body Aches, Cramps |
| MED003 | Expectorant Cough Syrup (15ml) | Take 15ml every 6 hours. Loosens chest mucus. | Cough |
| MED004 | Salbutamol Inhaler (100mcg) | 2 puffs as needed for acute breathing difficulty. | Shortness of Breath |
| MED005 | Throat Lozenges (Menthol) | Dissolve 1 lozenge every 3 hours. Max 8/day. | Sore Throat |
| MED006 | Cetirizine 10mg (Antihistamine) | 1 tablet daily. For allergy relief. | Rash, Itching, Congestion, Allergies |
| MED007 | Oral Rehydration Salts (ORS) | Dissolve 1 sachet in 200ml water. Drink after each loose stool. | Diarrhea, Vomiting, Dehydration |
| MED008 | Antacid Chewable Tablets | Chew 1-2 tablets after meals for acid relief. | Stomach Cramps, Nausea |
| MED009 | Oxymetazoline Nasal Spray | 2 sprays per nostril. Max 3 days use. | Congestion |
| MED010 | Calamine Lotion | Apply to affected area 2-3 times daily. | Rash, Itching |
| MED011 | Melatonin 3mg | Take 1 tablet 30 minutes before bed. | Insomnia |
| MED012 | Lubricant Eye Drops | 1-2 drops per eye as needed. | Eye strain, dryness |
| MED013 | Domperidone 10mg (Anti-Nausea) | 1 tablet 30 min before meals. Max 3/day. | Nausea, Vomiting |
| MED014 | Diclofenac Gel (Topical) | Apply thin layer to sore muscles 3x daily. | Body Aches, Muscle Pain |
| MED015 | Sumatriptan 50mg (Migraine) | 1 tablet at onset. May repeat after 2 hours. Max 2/day. | Migraine |

---

## SymptomMedication Mappings (Many-to-Many)

| Symptom | Medications |
|---------|------------|
| Fever & Chills | MED001 |
| Fatigue & Weakness | MED001, MED002 |
| Body Aches & Muscle Pain | MED002, MED014 |
| Nausea | MED008, MED013 |
| Acute Headache | MED001, MED002 |
| Sore Throat | MED005 |
| Nasal Congestion & Runny Nose | MED006, MED009 |
| Skin Rash | MED006, MED010 |
| Persistent Itching | MED006, MED010 |
| Insomnia | MED011 |
| Stomach Cramps | MED002, MED008 |
| Severe Persistent Cough | MED003 |
| Migraine with Aura | MED015 |
| Dizziness & Lightheadedness | MED007 (rehydrate) |
| Diarrhea (>2 days) | MED007 |
| Vomiting (Repeated) | MED007, MED013 |
| Anxiety & Panic Attacks | — (Tier 2: refer to nurse) |
| Persistent Low Mood (>2 weeks) | — (Tier 2: refer to counselor) |
| Shortness of Breath | MED004 |
| Blurred Vision & Eye Pain | MED012 (if eye strain only) |

---

## Campus Zones (for map feature)

| ZoneID | Name | Lat | Lon | Description |
|--------|------|-----|-----|-------------|
| ZONE01 | Res Block A | -33.9580 | 25.6730 | Main residence block |
| ZONE02 | Res Block B | -33.9575 | 25.6745 | Second residence block |
| ZONE03 | Res Block C | -33.9590 | 25.6720 | Third residence block |
| ZONE04 | North Campus | -33.9555 | 25.6740 | Academic buildings north |
| ZONE05 | South Campus | -33.9610 | 25.6715 | Sports complex area |
| ZONE06 | Student Center | -33.9585 | 25.6735 | Dining, shops, social |
| ZONE07 | Off-Campus East | -33.9570 | 25.6780 | Nearby off-campus housing |
| ZONE08 | Off-Campus West | -33.9595 | 25.6680 | Further residential area |

---

## NurseAvailability (sample for NUR001)

| Day | 8:00 | 9:00 | 10:00 | 11:00 | 12:00 | 13:00 | 14:00 | 15:00 | 16:00 | 17:00 |
|-----|------|------|-------|-------|-------|-------|-------|-------|-------|-------|
| Monday | A | A | A | A | U | A | A | A | U | U |
| Tuesday | A | U | A | A | A | A | A | A | U | A |
| Wednesday | U | A | A | U | A | A | A | A | A | A |
| Thursday | A | A | A | A | A | U | A | A | U | A |
| Friday | A | U | A | A | A | A | A | A | A | U |

(A = Available, U = Unavailable)

---

## Notifications (sample initial data)

| Recipient | Type | Title | Message |
|-----------|------|-------|---------|
| s227921577 | student | Welcome to CampusCare | Your account is ready. Start by checking your symptoms or booking a consultation. |
| NUR001 | nurse | New appointment | Student Seth Whitfield has booked a physical consultation for Aug 5, 10:00 AM. |
| ADM001 | admin | System Report | Weekly report: 4 students registered, 4 appointments booked, avg rating 4.5/5. |
