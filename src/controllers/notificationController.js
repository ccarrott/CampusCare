import { query } from '../config/database.js';

// ============================================================================
// NOTIFICATION CONTROLLER - Appointment Reminder API
// ============================================================================

/**
 * GET /consultations/api/upcoming
 * Returns upcoming appointments (within next 25 hours) for the logged-in user.
 * Used by the client-side notification script to trigger browser notifications.
 */
export async function getUpcomingAppointmentsAPI(req, res) {
  try {
    const { id, role } = req.session.user;
    let sql;
    let params;

    if (role === 'student') {
      sql = `
        SELECT
          a.AppointmentID,
          a.AppointmentType,
          a.Time,
          a.TeamsID,
          n.FirstName AS NurseFirstName,
          n.LastName AS NurseLastName
        FROM Appointment a
        INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
        WHERE a.StudentNumber = ?
          AND a.Time >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
          AND a.Time <= DATE_ADD(NOW(), INTERVAL 25 HOUR)
        ORDER BY a.Time ASC
      `;
      params = [id];
    } else if (role === 'nurse') {
      sql = `
        SELECT
          a.AppointmentID,
          a.AppointmentType,
          a.Time,
          a.TeamsID,
          s.FirstName AS StudentFirstName,
          s.LastName AS StudentLastName
        FROM Appointment a
        INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
        WHERE a.StaffNumber = ?
          AND a.Time >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
          AND a.Time <= DATE_ADD(NOW(), INTERVAL 25 HOUR)
        ORDER BY a.Time ASC
      `;
      params = [id];
    } else {
      return res.json({ appointments: [] });
    }

    const appointments = await query(sql, params);

    // Add time-until info for each appointment
    const now = Date.now();
    const enriched = appointments.map(apt => {
      const aptTime = new Date(apt.Time).getTime();
      const minutesUntil = Math.round((aptTime - now) / 60000);
      return {
        id: apt.AppointmentID,
        type: apt.AppointmentType,
        time: apt.Time,
        teamsId: apt.TeamsID,
        with: role === 'student'
          ? `${apt.NurseFirstName} ${apt.NurseLastName}`
          : `${apt.StudentFirstName} ${apt.StudentLastName}`,
        minutesUntil
      };
    });

    res.json({ appointments: enriched });
  } catch (error) {
    console.error('Notification API error:', error);
    res.status(500).json({ appointments: [], error: 'Failed to fetch appointments.' });
  }
}
