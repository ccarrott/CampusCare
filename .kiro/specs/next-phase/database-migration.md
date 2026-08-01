# Database Schema Migration Plan

## Current State Audit (As-Is)

Below is the current schema with identified gaps marked with **[MISSING]**.

---

### Table: `Admin`
| Column | Type | Notes |
|--------|------|-------|
| StaffNumber (PK) | varchar(20) | OK |
| Name | varchar(100) | Should be split into FirstName/LastName for consistency |
| **[MISSING]** Password | — | Admins cannot authenticate securely without credentials |
| **[MISSING]** Email | — | No admin contact info |

### Table: `Nurse`
| Column | Type | Notes |
|--------|------|-------|
| StaffNumber (PK) | varchar(20) | OK |
| Address | varchar(250) | OK |
| PhoneNumber | varchar(13) | OK |
| FirstName | varchar(100) | OK |
| LastName | varchar(100) | OK |
| **[MISSING]** Password | — | Nurses cannot authenticate securely |
| **[MISSING]** ClinicID (FK) | — | No assignment to a specific clinic |
| **[MISSING]** Email | — | No nurse email for communication |

### Table: `Student`
| Column | Type | Notes |
|--------|------|-------|
| StudentNumber (PK) | varchar(20) | OK |
| Address | varchar(250) | OK |
| MedicalHistory | text | OK |
| Email | varchar(100) | OK |
| FirstName | varchar(100) | OK |
| LastName | varchar(100) | OK |
| Password | varchar(100) | OK — needs hashing in future |

### Table: `Appointment`
| Column | Type | Notes |
|--------|------|-------|
| AppointmentID (PK) | varchar(50) | OK |
| AppointmentType | text | OK |
| Time | datetime | OK |
| TeamsID | varchar(250) | OK |
| StudentNumber (FK) | varchar(20) | OK |
| StaffNumber (FK) | varchar(20) | OK |
| **[MISSING]** Status | — | Cannot track Pending/Confirmed/Completed/Cancelled |
| **[MISSING]** Notes | — | No consultation notes field for nurse |
| **[MISSING]** CreatedAt | — | No audit trail |

### Table: `Rating`
| Column | Type | Notes |
|--------|------|-------|
| RatingID (PK) | varchar(50) | OK |
| AppointmentID (FK) | varchar(50) | OK |
| Score | int | OK |
| RatingDescription | text | OK |
| **[MISSING]** StudentNumber (FK) | — | Cannot trace which student submitted the rating |
| **[MISSING]** CreatedAt | — | No timestamp |

### Table: `Medication`
| Column | Type | Notes |
|--------|------|-------|
| MedicationCode (PK) | varchar(50) | OK |
| Name | varchar(100) | OK |
| Description | text | OK |
| SymptomsTreated | varchar(300) | OK |
| **[MISSING]** FacilityID (FK) | — | Cannot map meds to distribution points |
| **[MISSING]** ExpiryDate | — | Cannot track medication expiry |
| **[MISSING]** StockQuantity | — | Cannot manage inventory |

### Table: `MedicalFacility`
| Column | Type | Notes |
|--------|------|-------|
| FacilityID (PK) | varchar(50) | OK |
| Type | varchar(15) | OK |
| Address | varchar(250) | OK |
| PhoneNumber | varchar(13) | OK |
| **[MISSING]** Name | — | No facility name for display |
| **[MISSING]** ClinicID (FK) | — | No assignment to parent clinic |

### Table: `Symptoms`
| Column | Type | Notes |
|--------|------|-------|
| Name (PK) | varchar(100) | Functional but unusual — Name as PK makes renaming impossible |
| Description | text | OK |
| Type | text | OK |
| Tier | int | OK |
| Cause | text | OK |
| StudentNumber (FK) | varchar(20) | This links a symptom to a specific student — problematic for shared symptom catalog |

### Table: `Clinic`
| Column | Type | Notes |
|--------|------|-------|
| RegNum (PK) | varchar(50) | OK |
| Name | varchar(50) | OK |
| Address | varchar(250) | OK |
| TelephoneNumber | varchar(13) | OK |
| Email | varchar(100) | OK |

### Table: `SymptomMedication`
| Column | Type | Notes |
|--------|------|-------|
| MedicationCode (PK, FK) | varchar(50) | OK |
| Name (PK, FK → Symptoms.Name) | varchar(100) | OK |

---

## Required ALTER TABLE Statements

```sql
-- 1. Add Password to Nurse (critical for auth)
ALTER TABLE Nurse ADD COLUMN Password varchar(100) NOT NULL DEFAULT 'changeme';

-- 2. Add Password + Email to Admin
ALTER TABLE Admin ADD COLUMN Password varchar(100) NOT NULL DEFAULT 'changeme';
ALTER TABLE Admin ADD COLUMN Email varchar(100) NULL;

-- 3. Add ClinicID FK to Nurse (links nurse to clinic)
ALTER TABLE Nurse ADD COLUMN ClinicID varchar(50) NULL;
ALTER TABLE Nurse ADD COLUMN Email varchar(100) NULL;

-- 4. Add Status + Notes + CreatedAt to Appointment
ALTER TABLE Appointment ADD COLUMN Status varchar(20) DEFAULT 'Pending';
ALTER TABLE Appointment ADD COLUMN Notes text NULL;
ALTER TABLE Appointment ADD COLUMN CreatedAt datetime DEFAULT CURRENT_TIMESTAMP;

-- 5. Add StudentNumber + CreatedAt to Rating
ALTER TABLE Rating ADD COLUMN StudentNumber varchar(20) NULL;
ALTER TABLE Rating ADD COLUMN CreatedAt datetime DEFAULT CURRENT_TIMESTAMP;

-- 6. Add FacilityID, ExpiryDate, StockQuantity to Medication
ALTER TABLE Medication ADD COLUMN FacilityID varchar(50) NULL;
ALTER TABLE Medication ADD COLUMN ExpiryDate date NULL;
ALTER TABLE Medication ADD COLUMN StockQuantity int DEFAULT 0;

-- 7. Add Name to MedicalFacility
ALTER TABLE MedicalFacility ADD COLUMN Name varchar(100) NULL;
ALTER TABLE MedicalFacility ADD COLUMN ClinicID varchar(50) NULL;
```

---

## New Table: `SymptomLog` (Per-Student Symptom History)

The current `Symptoms` table mixes the symptom catalog with per-student references. A separate log table is needed:

```sql
CREATE TABLE SymptomLog (
  LogID varchar(50) PRIMARY KEY,
  StudentNumber varchar(20) NOT NULL,
  SymptomName varchar(100) NOT NULL,
  Severity varchar(20) NOT NULL,
  LogDate datetime DEFAULT CURRENT_TIMESTAMP,
  Notes text NULL,
  FOREIGN KEY (StudentNumber) REFERENCES Student(StudentNumber),
  FOREIGN KEY (SymptomName) REFERENCES Symptoms(Name)
);
```

This separates the **symptom catalog** (what symptoms exist) from the **symptom log** (when a student reported a symptom). This enables proper health trend analytics.

---

## Migration Priority

| Priority | Change | Reason |
|----------|--------|--------|
| P0 (Critical) | Add `Password` to `Nurse` | Nurses cannot securely log in |
| P0 (Critical) | Add `Password` to `Admin` | Admins cannot securely log in |
| P0 (Critical) | Add `Status` to `Appointment` | Cannot track appointment lifecycle |
| P1 (High) | Create `SymptomLog` table | Enables proper health trends |
| P1 (High) | Add `FacilityID` to `Medication` | Links meds to pickup locations |
| P1 (High) | Add `Name` to `MedicalFacility` | Facility display name missing |
| P2 (Medium) | Add `ClinicID` to `Nurse` | Clinic assignment |
| P2 (Medium) | Add `StudentNumber` to `Rating` | Traceability |
| P2 (Medium) | Add `Notes` to `Appointment` | Nurse consultation notes |
| P3 (Low) | Add `ExpiryDate`/`StockQuantity` to `Medication` | Inventory management |
| P3 (Low) | Add `CreatedAt` timestamps | Audit trail |
