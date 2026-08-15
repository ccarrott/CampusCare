// src/modules/export/export.controller.js
// Handles CSV data exports for admin reports and health trends.

import { query } from '../../config/database.js';
import { catchAsync } from '../../utils/catchAsync.js';

/**
 * GET /management/admin/reports/export-csv
 * Exports all appointments as CSV download.
 */
export const exportAppointmentsCSV = catchAsync(async (req, res) => {
  const rows = await query(`
    SELECT a.AppointmentID, a.AppointmentType, a.Time, a.Status,
           s.StudentNumber, s.FirstName AS StudentFirst, s.LastName AS StudentLast,
           n.StaffNumber, n.FirstName AS NurseFirst, n.LastName AS NurseLast
    FROM Appointment a
    INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    ORDER BY a.Time DESC
  `);

  let csv = 'AppointmentID,Type,Date,Time,Status,Student,Nurse\n';
  rows.forEach(r => {
    const date = new Date(r.Time);
    csv += `${r.AppointmentID},${r.AppointmentType},${date.toLocaleDateString('en-ZA')},${date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })},${r.Status || 'Pending'},${r.StudentFirst} ${r.StudentLast},${r.NurseFirst} ${r.NurseLast}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="appointments-report.csv"');
  res.send(csv);
});

/**
 * GET /trends/export-csv
 * Exports zone symptom data as CSV download.
 */
export const exportTrendsCSV = catchAsync(async (req, res) => {
  const rows = await query(`
    SELECT cz.Name AS Zone, sl.SymptomName, COUNT(*) AS Reports, 'Last 7 days' AS Period
    FROM SymptomLog sl
    INNER JOIN StudentZone sz ON sl.StudentNumber = sz.StudentNumber
    INNER JOIN CampusZone cz ON sz.ZoneID = cz.ZoneID
    WHERE sl.LogDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY cz.Name, sl.SymptomName
    ORDER BY Reports DESC
  `);

  let csv = 'Zone,Symptom,Reports,Period\n';
  rows.forEach(r => {
    csv += `${r.Zone},${r.SymptomName},${r.Reports},${r.Period}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="health-trends.csv"');
  res.send(csv);
});
