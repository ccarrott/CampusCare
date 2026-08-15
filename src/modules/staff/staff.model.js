// src/modules/staff/staff.model.js
// Database queries for the public-facing "Meet Our Staff" page.

import { query } from '../../config/database.js';

/**
 * Gets all nurses with their basic profile info.
 */
export async function getAllNursesWithProfiles() {
  const sql = `
    SELECT StaffNumber, FirstName, LastName, Bio, YearsExperience
    FROM Nurse
    ORDER BY LastName ASC
  `;
  return await query(sql);
}

/**
 * Gets verified average rating for each nurse (student-facing — from approved NurseReviews).
 */
export async function getVerifiedAveragesForAllNurses() {
  const sql = `
    SELECT nr.StaffNumber, AVG(nr.Rating) AS Average, COUNT(nr.ReviewID) AS Count
    FROM NurseReviews nr
    WHERE nr.Verified = 'Approved'
    GROUP BY nr.StaffNumber
  `;
  return await query(sql);
}

/**
 * Gets all verified (approved) nurse reviews for the staff page.
 */
export async function getAllVerifiedRatings() {
  const sql = `
    SELECT nr.Rating AS Score, nr.ReviewText AS RatingDescription, nr.CreatedAt, nr.StaffNumber
    FROM NurseReviews nr
    WHERE nr.Verified = 'Approved'
    ORDER BY nr.CreatedAt DESC
  `;
  return await query(sql);
}
