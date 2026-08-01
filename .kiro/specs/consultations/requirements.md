# Requirements: Consultations & Reviews (B100-B400)

## 1. User Stories
* **US4.1 (Book Physical Consultation - B100)**: As a student, I want to book a 15-minute in-person appointment with an available clinic nurse.
* **US4.2 (Book Online MS Teams Consultation - B200)**: As a student, I want to book an online consultation and receive a unique Microsoft Teams link (`TeamsID`).
* **US4.3 (View Consultation History - B300)**: As a student, I want to view my past and upcoming appointments.
* **US4.4 (Submit Nurse Rating - B400)**: As a student, I want to rate and review a completed consultation (`Score` 1-5 and `RatingDescription`).

## 2. Acceptance Criteria & Validation Rules
* Students cannot double-book overlapping timeslots.
* Online appointments must automatically generate or assign a valid `TeamsID` string.
* Ratings can ONLY be submitted for appointments with `Status = 'Completed'`.