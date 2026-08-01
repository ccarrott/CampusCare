import { query } from '../config/database.js';
import crypto from 'crypto';

// ============================================================================
// NURSE AVAILABILITY MODEL
// ============================================================================

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// 27 slots: 15-min sessions with 5-min breaks (20-min cadence), 08:00 to 16:55
const TIME_SLOTS = [];
for (let hour = 8; hour <= 16; hour++) {
  for (let startMin of [0, 20, 40]) {
    const endMin = startMin + 15;
    const start = `${String(hour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const end = `${String(hour + (endMin >= 60 ? 1 : 0)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    TIME_SLOTS.push({ start, end, label: `${start}-${end}` });
  }
}
// Remove any slots that start at or after 17:00
const FILTERED_SLOTS = TIME_SLOTS.filter(s => {
  const h = parseInt(s.start.split(':')[0]);
  const m = parseInt(s.start.split(':')[1]);
  return (h < 17) && !(h === 16 && m >= 60);
});

export { DAYS, FILTERED_SLOTS as TIME_SLOTS };

/**
 * Fetches the full availability grid for a nurse.
 * Returns an object: { "Monday": { "08:00-08:15": "Available", ... }, ... }
 */
export async function getAvailabilityForNurse(staffNumber) {
  const sql = 'SELECT DayOfWeek, TimeSlot, Status FROM NurseAvailability WHERE StaffNumber = ?';
  const rows = await query(sql, [staffNumber]);

  // Build grid with defaults (Available if no record exists)
  const grid = {};
  for (const day of DAYS) {
    grid[day] = {};
    for (const slot of FILTERED_SLOTS) {
      grid[day][slot.label] = 'Available'; // default
    }
  }

  // Override with stored values
  for (const row of rows) {
    if (grid[row.DayOfWeek]) {
      grid[row.DayOfWeek][row.TimeSlot] = row.Status;
    }
  }

  return grid;
}

/**
 * Saves the full availability grid for a nurse (bulk insert).
 * slots = [{ day, time, status }, ...] where time is the slot label like "08:00-08:15"
 */
export async function saveFullAvailability(staffNumber, slots) {
  // Delete existing records for this nurse
  await query('DELETE FROM NurseAvailability WHERE StaffNumber = ?', [staffNumber]);

  // Batch insert all slots
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
 * Gets available time slots for a specific nurse on a specific day.
 * Used by booking form to show only open slots.
 */
export async function getAvailableSlots(staffNumber, dayOfWeek) {
  const sql = `
    SELECT TimeSlot FROM NurseAvailability
    WHERE StaffNumber = ? AND DayOfWeek = ? AND Status = 'Available'
    ORDER BY TimeSlot ASC
  `;
  const rows = await query(sql, [staffNumber, dayOfWeek]);

  // If no records exist for this nurse+day, return all slots as available
  if (rows.length === 0) {
    return FILTERED_SLOTS.map(s => s.start);
  }

  // Return just the start times for booking form compatibility
  return rows.map(r => {
    const label = r.TimeSlot;
    return label.split('-')[0]; // "08:00-08:15" → "08:00"
  });
}

/**
 * Gets available slots for a nurse, excluding already-booked appointments.
 */
export async function getOpenSlots(staffNumber, dayOfWeek, date) {
  // Get available slots
  const sql = `
    SELECT TimeSlot FROM NurseAvailability
    WHERE StaffNumber = ? AND DayOfWeek = ? AND Status = 'Available'
    ORDER BY TimeSlot ASC
  `;
  const available = await query(sql, [staffNumber, dayOfWeek]);

  // If no records, all slots are available by default
  const availableStarts = available.length > 0
    ? available.map(r => r.TimeSlot.split('-')[0])
    : FILTERED_SLOTS.map(s => s.start);

  // Get already booked times for that nurse on that date
  const bookedSql = `
    SELECT TIME_FORMAT(Time, '%H:%i') AS BookedSlot
    FROM Appointment
    WHERE StaffNumber = ? AND DATE(Time) = ?
  `;
  const booked = await query(bookedSql, [staffNumber, date]);
  const bookedSlots = booked.map(r => r.BookedSlot);

  // Return only unbooked available slots
  return availableStarts.filter(slot => !bookedSlots.includes(slot));
}
