// src/modules/export/export.controller.js
// Handles CSV data exports for admin reports and health trends.

import { query } from '../../config/database.js';
import { catchAsync } from '../../utils/catchAsync.js';

/**
 * Sanitises a value for safe CSV output.
 * Prevents formula injection (CWE-1236) by prefixing dangerous leading characters.
 */
function csvSafe(value) {
  const str = String(value || '');
  if (/^[=+\-@\t\r]/.test(str)) return "'" + str;
  // Escape quotes and wrap in quotes if contains comma
  if (str.includes(',') || str.includes('"')) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

/**
 * GET /management/admin/reports/export-csv
 * Exports all appointments as CSV download.
 */
export const exportAppointmentsCSV = catchAsync(async (req, res) => {
  const rows = await query(`
    SELECT a.AppointmentID, a.AppointmentType, a.Time, a.Status,
           s.StudentNumber, s.FirstName AS StudentFirst, s.LastName AS StudentLast,
           n.StaffNumber, n.FirstName AS NurseFirst, n.LastName AS NurseLast,
           cs.DurationSeconds, cs.NurseJoinedAt, cs.StudentJoinedAt
    FROM Appointment a
    INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
    INNER JOIN Nurse n ON a.StaffNumber = n.StaffNumber
    LEFT JOIN ConsultationSession cs ON cs.AppointmentID = a.AppointmentID
    ORDER BY a.Time DESC
  `);

  // Attendance classification for online consultations, from webhook-logged join times.
  function attendanceLabel(r) {
    if (r.AppointmentType !== 'Online') return 'N/A (In-Person)';
    const nurseIn = !!r.NurseJoinedAt;
    const studentIn = !!r.StudentJoinedAt;
    if (nurseIn && studentIn) return 'Both';
    if (nurseIn && !studentIn) return 'Nurse-only';
    if (!nurseIn && studentIn) return 'Student-only';
    return 'No-show';
  }

  function durationLabel(r) {
    if (r.DurationSeconds == null) return '';
    const mins = Math.round(r.DurationSeconds / 60);
    return `${mins} min`;
  }

  let csv = 'AppointmentID,Type,Date,Time,Status,Student,Nurse,Duration,Attendance\n';
  rows.forEach(r => {
    const date = new Date(r.Time);
    csv += [
      csvSafe(r.AppointmentID),
      csvSafe(r.AppointmentType),
      csvSafe(date.toLocaleDateString('en-ZA')),
      csvSafe(date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })),
      csvSafe(r.Status || 'Pending'),
      csvSafe(`${r.StudentFirst} ${r.StudentLast}`),
      csvSafe(`${r.NurseFirst} ${r.NurseLast}`),
      csvSafe(durationLabel(r)),
      csvSafe(attendanceLabel(r))
    ].join(',') + '\n';
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
    csv += [
      csvSafe(r.Zone),
      csvSafe(r.SymptomName),
      csvSafe(r.Reports),
      csvSafe(r.Period)
    ].join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="health-trends.csv"');
  res.send(csv);
});
