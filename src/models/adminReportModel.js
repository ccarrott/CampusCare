import { query } from '../config/database.js';

// ============================================================================
// ADMIN REPORT MODEL - Operational Analytics
// ============================================================================

/**
 * Fetches aggregate operational metrics for the admin dashboard.
 */
export async function getOperationalReportData() {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM Student) AS TotalStudents,
      (SELECT COUNT(*) FROM Appointment) AS TotalAppointments,
      (SELECT COUNT(*) FROM Nurse) AS TotalNurses,
      (SELECT AVG(Score) FROM Rating) AS AverageNurseRating
  `;
  const results = await query(sql);
  return results[0];
}

/**
 * Gets appointment counts broken down by type.
 */
export async function getAppointmentsByType() {
  const sql = `
    SELECT AppointmentType, COUNT(*) AS Count
    FROM Appointment
    GROUP BY AppointmentType
  `;
  return await query(sql);
}

/**
 * Gets all ratings with nurse details for review.
 */
export async function getAllRatings() {
  const sql = `
    SELECT
      r.RatingID,
      r.Score,
      r.RatingDescription,
      r.AppointmentID,
      a.StaffNumber,
      n.FirstName AS NurseFirstName,
      n.LastName AS NurseLastName
    FROM Rating r
    INNER JOIN Appointment a ON r.AppointmentID = a.AppointmentID
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    ORDER BY r.Score DESC
  `;
  return await query(sql);
}


/**
 * Gets appointment counts per day for a given period.
 */
export async function getDailyAppointmentCounts(days = 14) {
  const sql = `
    SELECT DATE(Time) AS day, COUNT(*) AS count
    FROM Appointment
    WHERE Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(Time)
    ORDER BY day ASC
  `;
  return await query(sql, [days]);
}
