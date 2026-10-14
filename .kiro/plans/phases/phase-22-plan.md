# Phase 22: Symptom System Overhaul — Tag-Based Builder & Accurate OTC Mapping

## Goal

Replace the current single-dropdown symptom selection with a **tag-based symptom builder** where students select individual symptoms (tags) from categorised groups. The system then evaluates the combination to recommend appropriate OTC medications and determine escalation tier. All symptom and medication data will be clinically accurate for the South African OTC market and relevant to university students.

---

## Problems with the Current System

1. **Compound symptoms** — entries like "Fever & Chills" and "Nausea & Loss of Appetite" are actually 2 symptoms bundled together. Students may have one without the other.
2. **Duplicate coverage** — "Acute Headache" and "Migraine with Aura" overlap. "Body Aches & Muscle Pain" is too broad.
3. **Single selection** — students pick ONE symptom from a dropdown. Real health complaints involve multiple symptoms ("I have a headache AND a sore throat AND a runny nose").
4. **Vague medication mapping** — SymptomMedication join is 1:1 name match. No consideration of combinations, contraindications, or severity-based recommendations.
5. **`Symptoms.StudentNumber` FK** — this column makes no sense (a symptom catalog doesn't belong to a student). Legacy remnant.

---

## Part A: New Symptom Taxonomy (Tag-Based)

### Design Principle
Symptoms are **atomic, individual sensations** that a student can select multiple of. They're grouped into body system categories for easy browsing.

### New `Symptom` Table (replaces current `Symptoms`)

```sql
CREATE TABLE Symptom (
  SymptomID VARCHAR(10) PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Category VARCHAR(30) NOT NULL,
  Tier INT DEFAULT 1,
  Description TEXT
);
```

- **Category** groups: `Head & Neuro`, `Respiratory`, `Throat & Mouth`, `Gut & Digestion`, `Skin`, `Musculoskeletal`, `Systemic`, `Mental Health`, `Eyes & Ears`, `Reproductive`
- **Tier** determines escalation:
  - 1 = Self-care, OTC meds appropriate
  - 2 = Nurse consultation recommended
  - 3 = Urgent, immediate care needed

### Proposed Symptom Catalog (40+ atomic symptoms)

**Head & Neuro:**
| ID | Symptom | Tier |
|---|---|---|
| SYM01 | Headache (tension) | 1 |
| SYM02 | Migraine (throbbing, one-sided) | 2 |
| SYM03 | Dizziness / lightheaded | 1 |
| SYM04 | Brain fog / difficulty concentrating | 1 |

**Respiratory:**
| ID | Symptom | Tier |
|---|---|---|
| SYM05 | Runny nose | 1 |
| SYM06 | Blocked / stuffy nose | 1 |
| SYM07 | Sneezing | 1 |
| SYM08 | Dry cough | 1 |
| SYM09 | Wet / productive cough | 1 |
| SYM10 | Shortness of breath | 3 |
| SYM11 | Wheezing | 2 |

**Throat & Mouth:**
| ID | Symptom | Tier |
|---|---|---|
| SYM12 | Sore throat | 1 |
| SYM13 | Difficulty swallowing | 2 |
| SYM14 | Mouth ulcers | 1 |

**Gut & Digestion:**
| ID | Symptom | Tier |
|---|---|---|
| SYM15 | Nausea | 1 |
| SYM16 | Vomiting | 2 |
| SYM17 | Diarrhoea | 1 |
| SYM18 | Constipation | 1 |
| SYM19 | Stomach cramps | 1 |
| SYM20 | Bloating / gas | 1 |
| SYM21 | Heartburn / acid reflux | 1 |
| SYM22 | Loss of appetite | 1 |

**Skin:**
| ID | Symptom | Tier |
|---|---|---|
| SYM23 | Itchy skin | 1 |
| SYM24 | Rash (red, raised bumps) | 1 |
| SYM25 | Dry / flaking skin | 1 |
| SYM26 | Acne breakout | 1 |
| SYM27 | Hives / swelling | 2 |

**Musculoskeletal:**
| ID | Symptom | Tier |
|---|---|---|
| SYM28 | Body aches (general) | 1 |
| SYM29 | Back pain | 1 |
| SYM30 | Neck stiffness | 1 |
| SYM31 | Joint pain / swelling | 2 |

**Systemic:**
| ID | Symptom | Tier |
|---|---|---|
| SYM32 | Fever (>38°C) | 1 |
| SYM33 | Chills / shivering | 1 |
| SYM34 | Fatigue / tiredness | 1 |
| SYM35 | Night sweats | 2 |
| SYM36 | Swollen lymph nodes | 2 |

**Mental Health:**
| ID | Symptom | Tier |
|---|---|---|
| SYM37 | Anxiety / racing thoughts | 1 |
| SYM38 | Panic attacks | 2 |
| SYM39 | Insomnia (can't sleep) | 1 |
| SYM40 | Low mood (>2 weeks) | 2 |
| SYM41 | Emotional overwhelm / burnout | 1 |

**Eyes & Ears:**
| ID | Symptom | Tier |
|---|---|---|
| SYM42 | Itchy / watery eyes | 1 |
| SYM43 | Ear pain | 2 |
| SYM44 | Blocked ears / muffled hearing | 1 |

**Reproductive:**
| ID | Symptom | Tier |
|---|---|---|
| SYM45 | Menstrual cramps | 1 |
| SYM46 | Irregular bleeding | 2 |

---

## Part B: Updated OTC Medication Catalog (SA Market)

All medications are **genuinely available OTC at South African pharmacies** (Clicks, Dis-Chem, campus pharmacy). No prescription-only meds in Tier 1 recommendations.

| Code | Name | Type | Treats (symptom tags) |
|------|------|------|----------------------|
| MED01 | Panado 500mg (Paracetamol) | Analgesic / Antipyretic | Headache, Fever, Body aches, Sore throat, Menstrual cramps |
| MED02 | Nurofen 400mg (Ibuprofen) | Anti-inflammatory | Headache, Body aches, Joint pain, Back pain, Menstrual cramps, Migraine |
| MED03 | Allergex (Chlorpheniramine 4mg) | Antihistamine | Runny nose, Sneezing, Itchy eyes, Itchy skin, Hives, Rash |
| MED04 | Zyrtec (Cetirizine 10mg) | Non-drowsy antihistamine | Runny nose, Sneezing, Itchy eyes, Itchy skin, Hives |
| MED05 | Strepsils Honey & Lemon | Throat lozenge | Sore throat |
| MED06 | Betadine Gargle | Antiseptic throat gargle | Sore throat, Mouth ulcers |
| MED07 | Iliadin Nasal Spray | Decongestant spray | Blocked nose |
| MED08 | Sinuend / Sinupret | Herbal sinus relief | Blocked nose, Sinus pressure |
| MED09 | Benylin Dry Cough Syrup | Cough suppressant | Dry cough |
| MED10 | Benylin Wet Cough Syrup | Expectorant | Wet cough |
| MED11 | Rehidrat ORS Sachets | Oral rehydration | Diarrhoea, Vomiting, Dizziness, Fever |
| MED12 | Imodium (Loperamide 2mg) | Anti-diarrhoeal | Diarrhoea |
| MED13 | Gaviscon Liquid | Antacid / reflux | Heartburn, Stomach cramps, Nausea |
| MED14 | Buscopan (Hyoscine) | Antispasmodic | Stomach cramps, Bloating, Menstrual cramps |
| MED15 | Valoid (Cyclizine 50mg) | Anti-nausea | Nausea, Vomiting, Dizziness |
| MED16 | Voltaren Emulgel (Diclofenac) | Topical anti-inflammatory | Body aches, Back pain, Neck stiffness, Joint pain |
| MED17 | Calamine Lotion | Skin soother | Itchy skin, Rash, Dry skin |
| MED18 | Hydrocortisone 1% Cream | Mild steroid cream | Rash, Itchy skin, Eczema |
| MED19 | Rescue Remedy (Bach Flower) | Natural stress relief | Anxiety, Insomnia, Emotional overwhelm |
| MED20 | Natures Garden Melatonin 3mg | Sleep aid | Insomnia |
| MED21 | Dulcolax (Bisacodyl 5mg) | Laxative | Constipation |
| MED22 | Clearasil / Benzac (Benzoyl Peroxide) | Acne treatment | Acne breakout |
| MED23 | Cerumol Ear Drops | Ear wax softener | Blocked ears |
| MED24 | Imigran 50mg (Sumatriptan) | Migraine specific (Schedule 2) | Migraine |

---

## Part C: New SymptomMedication Mapping (Many-to-Many)

The `SymptomMedication` join table stays the same structure but references the new `SymptomID`:

```sql
CREATE TABLE SymptomMedication (
  SymptomID VARCHAR(10),
  MedicationCode VARCHAR(10),
  PRIMARY KEY (SymptomID, MedicationCode)
);
```

Each row means: "This medication can help with this individual symptom."

---

## Part D: Tag-Based UI (Multi-Select Symptom Builder)

### How It Works

1. Student sees symptom categories as **collapsible sections** (accordion)
2. Each section shows individual symptoms as **clickable tag pills**
3. Student clicks tags to select/deselect (multi-select)
4. Selected tags appear in a "Your Symptoms" summary bar at the top
5. As tags are selected, the severity selector appears (Low / Moderate / High — still user-reported)
6. Submit button evaluates all selected symptoms together

### UI Design

```
┌─────────────────────────────────────────────┐
│ Your Symptoms: [Headache ✕] [Runny nose ✕]  │
│               [Sore throat ✕]               │
└─────────────────────────────────────────────┘

▼ Head & Neuro
  [Headache] [Migraine] [Dizziness] [Brain fog]

▼ Respiratory
  [Runny nose] [Blocked nose] [Sneezing] [Dry cough]
  [Wet cough] [Shortness of breath] [Wheezing]

▼ Throat & Mouth
  [Sore throat] [Difficulty swallowing] [Mouth ulcers]

▶ Gut & Digestion (collapsed)
▶ Skin (collapsed)
...
```

### Evaluation Logic

```js
// 1. Collect all selected symptom IDs
// 2. Find the MAX tier among selected symptoms → determines escalation
// 3. Query SymptomMedication for all meds that treat ANY of the selected symptoms
// 4. Rank medications by how many of the selected symptoms they cover (relevance score)
// 5. Show top results, ordered by relevance
// 6. If max tier >= 2: show escalation warning
// 7. If max tier >= 3: show urgent care message + clinic contact
```

### Relevance Scoring

A medication that treats 3 of the student's 4 selected symptoms ranks higher than one that treats only 1. This makes the recommendation feel intelligent and personalised.

---

## Part E: SymptomLog Update

Currently `SymptomLog` stores a single `SymptomName`. With multi-select, we need to store multiple symptoms per log entry.

### Option A: Comma-separated (simple but messy)
```
SymptomName = "Headache,Runny nose,Sore throat"
```

### Option B: New join table (clean, queryable)
```sql
CREATE TABLE SymptomLogEntry (
  LogID VARCHAR(50),
  SymptomID VARCHAR(10),
  PRIMARY KEY (LogID, SymptomID)
);
```

**Recommendation: Option B** — it's cleaner for trend queries (e.g. "how many students reported headaches this week" works with a simple GROUP BY).

The existing `SymptomLog` table keeps its structure (LogID, StudentNumber, Severity, LogDate, Notes) but drops the `SymptomName` column — replaced by the `SymptomLogEntry` join.

---

## Part F: Migration Strategy

Since we're changing the symptom schema significantly:

1. Create new tables: `Symptom`, `SymptomLogEntry` (don't touch old tables yet)
2. Seed new data
3. Update the symptom module (model, controller, view) to use new tables
4. Drop old `Symptoms` table and old `SymptomMedication` structure
5. Migrate old `SymptomLog.SymptomName` entries to `SymptomLogEntry` references (best effort — some old names won't map cleanly, those get dropped)

---

## Part G: Tier Logic Refinement

| Max Tier in Selection | System Response |
|---|---|
| 1 (all symptoms are Tier 1) | Show OTC recommendations. Green status. "Self-care recommended." |
| 2 (any symptom is Tier 2) | Show OTC recommendations BUT with amber warning: "Consider booking a nurse consultation." + direct booking link |
| 3 (any symptom is Tier 3) | Show urgent red banner: "Please seek immediate medical attention." + clinic phone number + hospital directions. Minimal OTC shown (only supportive care like Rehidrat). |

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | Create new `Symptom` table + seed 46 symptoms | Low |
| 2 | Create new `SymptomMedication` (SymptomID ↔ MedicationCode) + seed mappings | Medium |
| 3 | Update `Medication` table data (new codes, accurate SA OTC catalog) | Medium |
| 4 | Create `SymptomLogEntry` join table | Low |
| 5 | Rewrite `symptoms.model.js` (new queries for tag-based system) | Medium |
| 6 | Rewrite `symptoms.controller.js` (multi-select evaluation + relevance scoring) | Medium |
| 7 | Rewrite `views/student/symptom-form.ejs` (category accordion + tag pills) | High |
| 8 | Rewrite `views/student/recommendations.ejs` (ranked meds + tier banner) | Medium |
| 9 | Update `views/student/symptom-history.ejs` (show multiple symptom tags per entry) | Low |
| 10 | Update trend model queries to work with new SymptomLogEntry structure | Medium |
| 11 | Drop old `Symptoms` table + remove `SymptomLog.SymptomName` column | Low |
| 12 | Run seed-showcase update for new demo data | Low |

---

## Files Touched

| Category | Files |
|----------|-------|
| Migration | `src/config/migrate.js` |
| Seed data | `src/config/seedData.json` (Symptom + Medication + SymptomMedication sections) |
| Module | `src/modules/symptoms/symptoms.model.js`, `symptoms.controller.js` |
| Views | `views/student/symptom-form.ejs`, `views/student/recommendations.ejs`, `views/student/symptom-history.ejs` |
| CSS | `public/css/style.css` (tag pill styles, category accordion) |
| Trends | `src/modules/trends/trends.model.js` (update zone/type queries) |

---

## CSS Components Needed

```css
/* Symptom tag pill */
.symptom-tag { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 0.82rem; cursor: pointer; border: 1px solid var(--border-color); transition: all 0.15s; margin: 3px; }
.symptom-tag:hover { border-color: var(--accent-cyan); }
.symptom-tag.selected { background: var(--accent-cyan); color: var(--primary-navy); border-color: var(--accent-cyan); font-weight: 600; }

/* Selected symptoms summary */
.symptom-summary { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; background: var(--bg-canvas); border-radius: var(--radius-md); margin-bottom: 20px; min-height: 44px; }
.symptom-summary-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; background: var(--accent-cyan); color: var(--primary-navy); font-size: 0.8rem; font-weight: 600; }
.symptom-summary-tag .remove { cursor: pointer; opacity: 0.7; }
.symptom-summary-tag .remove:hover { opacity: 1; }

/* Category accordion */
.symptom-category { margin-bottom: 12px; }
.symptom-category-header { cursor: pointer; font-weight: 600; padding: 10px 0; display: flex; align-items: center; gap: 8px; }
.symptom-category-header::before { content: '▸'; transition: transform 0.2s; }
.symptom-category.open .symptom-category-header::before { transform: rotate(90deg); }
.symptom-category-body { display: none; padding: 8px 0 8px 16px; }
.symptom-category.open .symptom-category-body { display: block; }
```

---

## Part H: Profile & Data Cleanup (Bundled)

### H1 — Merge Nurse Bio Editor into Profile Page

Currently the nurse bio editor is a separate page (`/management/nurse/edit-bio`). It should be part of the nurse's profile view/edit page instead.

**Changes:**
- Remove the separate "Edit Bio" sidebar link and route
- Add Bio + YearsExperience fields to the nurse profile view (`/profile` when role === nurse)
- Nurse profile page shows: name, staff number, clinic, phone, email, AND editable bio + years experience
- Single "Save" button updates all editable nurse fields
- Remove `views/nurse/edit-bio.ejs` (absorbed into `views/profile/view.ejs` or a nurse-specific profile section)

### H2 — Remove Student Email Column (Derive from StudentNumber)

Student emails are always `{studentNumber}@mandela.ac.za`. No need to store them.

**Changes:**
- Drop `Email` column from `Student` table (migration)
- Remove email field from registration form (`views/auth/register.ejs`)
- Remove email field from admin student add/edit forms
- In profile views, compute email: `<%= profile.StudentNumber %>@mandela.ac.za`
- Update `admin.model.js` queries to remove Email from SELECT/INSERT/UPDATE for students
- Update seed data — remove Email from student entries
- Keep `Email` on `Nurse` table (nurses may have non-standard email addresses)

### Implementation Order (added to main list)

| Step | What | Effort |
|------|------|--------|
| 13 | Merge nurse bio editor into profile page | Low |
| 14 | Drop Student.Email, derive from StudentNumber everywhere | Low |


### H3 — Drop Medication.SymptomsTreated Column (1NF Violation)

The `Medication.SymptomsTreated` column stores a comma-separated list of symptom names — a classic 1NF violation. The actual relationship is already captured by the `SymptomMedication` join table, making this column redundant.

**Changes:**
- Drop `SymptomsTreated` column from `Medication` table
- Remove any references to `m.SymptomsTreated` in model queries
- In the recommendations view, show which symptoms a med treats by querying the join table (already done — `getMedicationsForSymptom` uses the join)
- Update seed data to remove `SymptomsTreated` from Medication entries

| Step | What | Effort |
|------|------|--------|
| 15 | Drop Medication.SymptomsTreated column + remove all references | Low |
