// src/modules/notifications/notifications.controller.js
// Handles the upcoming appointments API for browser notification system.

import { query } from '../../config/database.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ROLES } from '../../constants.js';

/**
 * GET /consultations/api/upcoming
 * Returns upcoming appointments (within next 25 hours) for the logged-in user.
 * Used by client-side notification script to trigger browser notifications.
 */
export const getUpcomingAppointmentsAPI = catchAsync(async (req, res) => {
  const { id, role } = req.session.user;
  let sql, params;

  if (role === ROLES.STUDENT) {
    sql = `
      SELECT a.AppointmentID, a.AppointmentType, a.Time, a.Status, a.RoomName,
             n.FirstName AS NurseFirstName, n.LastName AS NurseLastName
      FROM Appointment a
      INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
      WHERE a.StudentNumber = ?
        AND a.Time >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        AND a.Time <= DATE_ADD(NOW(), INTERVAL 25 HOUR)
      ORDER BY a.Time ASC
    `;
    params = [id];
  } else if (role === ROLES.NURSE) {
    sql = `
      SELECT a.AppointmentID, a.AppointmentType, a.Time, a.Status, a.RoomName,
             s.FirstName AS StudentFirstName, s.LastName AS StudentLastName
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
  const now = Date.now();

  const enriched = appointments.map(apt => {
    const isOnline = apt.AppointmentType === 'Online';
    const roomReady = isOnline && apt.Status === 'Confirmed' && !!apt.RoomName;
    // Join URL is offered for confirmed online appointments; the join route itself
    // still enforces the time window and ownership server-side.
    const joinUrl = (isOnline && apt.Status === 'Confirmed')
      ? `/consultations/${apt.AppointmentID}/join`
      : null;
    return {
      id: apt.AppointmentID,
      type: apt.AppointmentType,
      time: apt.Time,
      roomReady,
      joinUrl,
      with: role === ROLES.STUDENT
        ? `${apt.NurseFirstName} ${apt.NurseLastName}`
        : `${apt.StudentFirstName} ${apt.StudentLastName}`,
      minutesUntil: Math.round((new Date(apt.Time).getTime() - now) / 60000)
    };
  });

  res.json({ appointments: enriched });
});
