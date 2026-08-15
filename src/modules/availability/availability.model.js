// src/modules/availability/availability.model.js
// Database queries for nurse weekly availability grid management.

import { query } from '../../config/database.js';
import crypto from 'crypto';

// ============================================================================
// TIME SLOT CONSTANTS
// ============================================================================

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// 27 slots: 15-min sessions with 5-min breaks (20-min cadence), 08:00 to 16:40
const TIME_SLOTS = [];
for (let hour = 8; hour <= 16; hour++) {
  for (const startMin of [0, 20, 40]) {
    const endMin = startMin + 15;
    const start = `${String(hour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const end = `${String(hour + (endMin >= 60 ? 1 : 0)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    TIME_SLOTS.push({ start, end, label: `${start}-${end}` });
  }
}
// Filter any slots starting at or after 17:00
const FILTERED_SLOTS = TIME_SLOTS.filter(s => parseInt(s.start.split(':')[0]) < 17);

export { DAYS, FILTERED_SLOTS as TIME_SLOTS };

// ============================================================================
// AVAILABILITY QUERIES
// ============================================================================

/**
 * Fetches the full availability grid for a nurse.
 * Returns: { "Monday": { "08:00-08:15": "Available", ... }, ... }
 */
export async function getAvailabilityForNurse(staffNumber) {
  const sql = 'SELECT DayOfWeek, TimeSlot, Status FROM NurseAvailability WHERE StaffNumber = ?';
  const rows = await query(sql, [staffNumber]);

  const grid = {};
  for (const day of DAYS) {
    grid[day] = {};
    for (const slot of FILTERED_SLOTS) {
      grid[day][slot.label] = 'Available';
    }
  }

  for (const row of rows) {
    if (grid[row.DayOfWeek]) {
      grid[row.DayOfWeek][row.TimeSlot] = row.Status;
    }
  }

  return grid;
}

/**
 * Saves the full availability grid (bulk delete + insert).
 */
export async function saveFullAvailability(staffNumber, slots) {
  await query('DELETE FROM NurseAvailability WHERE StaffNumber = ?', [staffNumber]);

  if (slots.length === 0) return;

  const placeholders = [];
  const values = [];

  for (const slot of slots) {
    const id = 'AVL-' + crypto.randomBytes(4).toString('hex');
    placeholders.push('(?, ?, ?, ?, ?)');
    values.push(id, staffNumber, slot.day, slot.time, slot.status);
  }

  const sql = `INSERT INTO NurseAvailability (AvailabilityID, StaffNumber, DayOfWeek, TimeSlot, Status) VALUES ${placeholders.join(', ')}`;
  await query(sql, values);
}

/**
 * Gets available time slots for a nurse on a specific day.
 */
export async function getAvailableSlots(staffNumber, dayOfWeek) {
  const sql = `
    SELECT TimeSlot FROM NurseAvailability
    WHERE StaffNumber = ? AND DayOfWeek = ? AND Status = 'Available'
    ORDER BY TimeSlot ASC
  `;
  const rows = await query(sql, [staffNumber, dayOfWeek]);

  if (rows.length === 0) return FILTERED_SLOTS.map(s => s.start);
  return rows.map(r => r.TimeSlot.split('-')[0]);
}

/**
 * Gets available slots minus already-booked appointments for a specific date.
 */
export async function getOpenSlots(staffNumber, dayOfWeek, date) {
  const available = await getAvailableSlots(staffNumber, dayOfWeek);

  const bookedSql = `
    SELECT TIME_FORMAT(Time, '%H:%i') AS BookedSlot
    FROM Appointment WHERE StaffNumber = ? AND DATE(Time) = ? AND Status != 'Cancelled'
  `;
  const booked = await query(bookedSql, [staffNumber, date]);
  const bookedSlots = booked.map(r => r.BookedSlot);

  return available.filter(slot => !bookedSlots.includes(slot));
}

/**
 * Gets booked appointment details for a nurse on specific dates (for the grid display).
 */
export async function getBookedAppointmentsForDate(staffNumber, date) {
  const sql = `
    SELECT TIME_FORMAT(a.Time, '%H:%i') AS BookedTime, a.AppointmentID, s.FirstName, s.LastName
    FROM Appointment a
    INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
    WHERE a.StaffNumber = ? AND DATE(a.Time) = ? AND a.Status != 'Cancelled'
  `;
  return await query(sql, [staffNumber, date]);
}
