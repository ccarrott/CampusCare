import * as AvailabilityModel from '../models/availabilityModel.js';
import { query } from '../config/database.js';

// ============================================================================
// AVAILABILITY CONTROLLER - Nurse Weekly Grid Management
// ============================================================================

/**
 * Computes the next 5 working days starting from today.
 * Skips weekends. If today is Wednesday, shows: Wed, Thu, Fri, next Mon, next Tue.
 * Returns array of { dayName, label, date } in order.
 */
function getUpcomingWeekDates() {
  const today = new Date();
  const weekDates = {};
  const orderedDays = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let current = new Date(today);
  let count = 0;

  while (count < 5) {
    const dow = current.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dow !== 0 && dow !== 6) {
      const dayName = dayNames[dow];
      const formatted = current.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
      weekDates[dayName + '_' + count] = {
        dayName,
        label: `${dayName} (${formatted})`,
        date: current.toISOString().slice(0, 10)
      };
      orderedDays.push({
        dayName,
        label: `${dayName} (${formatted})`,
        date: current.toISOString().slice(0, 10),
        key: dayName // used for availability grid lookup
      });
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return orderedDays;
}

/**
 * GET /management/nurse/availability
 */
export async function showAvailabilityGrid(req, res) {
  try {
    const staffNumber = req.session.user.id;
    const grid = await AvailabilityModel.getAvailabilityForNurse(staffNumber);
    const weekDays = getUpcomingWeekDates();

    // Fetch booked slots for the upcoming 5 days
    const bookedSlots = {};
    for (const wd of weekDays) {
      const sql = `
        SELECT TIME_FORMAT(Time, '%H:%i') AS BookedTime, a.AppointmentID, s.FirstName, s.LastName
        FROM Appointment a
        INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
        WHERE a.StaffNumber = ? AND DATE(a.Time) = ?
      `;
      const rows = await query(sql, [staffNumber, wd.date]);
      bookedSlots[wd.key] = rows.map(r => ({ time: r.BookedTime, student: `${r.FirstName} ${r.LastName}`, id: r.AppointmentID }));
    }

    res.render('nurse/availability', {
      user: req.session.user,
      grid,
      weekDays,
      timeSlots: AvailabilityModel.TIME_SLOTS,
      bookedSlots: JSON.stringify(bookedSlots),
      conflicts: null,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Availability grid error:', error);
    res.status(500).render('nurse/availability', {
      user: req.session.user,
      grid: {},
      weekDays: getUpcomingWeekDates(),
      timeSlots: AvailabilityModel.TIME_SLOTS,
      bookedSlots: '{}',
      conflicts: null,
      error: 'Unable to load availability. Please try again.',
      success: null
    });
  }
}

/**
 * POST /management/nurse/availability
 * Saves the grid. If newly-unavailable slots have booked appointments, flags conflicts.
 */
export async function saveAvailability(req, res) {
  try {
    const staffNumber = req.session.user.id;
    const weekDays = getUpcomingWeekDates();
    const slots = [];
    const newlyUnavailable = [];

    // Get current grid BEFORE saving to detect changes
    const oldGrid = await AvailabilityModel.getAvailabilityForNurse(staffNumber);

    // Parse form data: keys like "slot_Monday_08:00-08:15"
    for (const wd of weekDays) {
      for (const time of AvailabilityModel.TIME_SLOTS) {
        const key = `slot_${wd.key}_${time.label}`;
        const status = req.body[key] === 'Unavailable' ? 'Unavailable' : 'Available';
        slots.push({ day: wd.key, time: time.label, status });

        // Detect if this slot changed from Available → Unavailable
        if (status === 'Unavailable' && oldGrid[wd.key] && oldGrid[wd.key][time.label] === 'Available') {
          newlyUnavailable.push({ day: wd.key, time: time.start, date: wd.date });
        }
      }
    }

    // Save the new availability
    await AvailabilityModel.saveFullAvailability(staffNumber, slots);

    // Check for conflicting appointments on newly-unavailable slots
    let conflicts = [];
    if (newlyUnavailable.length > 0) {
      for (const slot of newlyUnavailable) {
        if (!slot.date) continue;
        const conflictSql = `
          SELECT a.AppointmentID, a.Time, s.FirstName, s.LastName
          FROM Appointment a
          INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
          WHERE a.StaffNumber = ?
            AND DATE(a.Time) = ?
            AND TIME_FORMAT(a.Time, '%H:%i') = ?
        `;
        const rows = await query(conflictSql, [staffNumber, slot.date, slot.time]);
        if (rows.length > 0) {
          conflicts.push(...rows.map(r => ({
            appointmentId: r.AppointmentID,
            time: r.Time,
            student: `${r.FirstName} ${r.LastName}`,
            day: slot.day,
            slot: slot.time
          })));
        }
      }
    }

    const grid = await AvailabilityModel.getAvailabilityForNurse(staffNumber);

    // Re-fetch booked slots for the re-render
    const bookedSlotsData = {};
    for (const wd of weekDays) {
      const bSql = `
        SELECT TIME_FORMAT(Time, '%H:%i') AS BookedTime, a.AppointmentID, s.FirstName, s.LastName
        FROM Appointment a
        INNER JOIN Student s ON a.StudentNumber = s.StudentNumber
        WHERE a.StaffNumber = ? AND DATE(a.Time) = ?
      `;
      const bRows = await query(bSql, [staffNumber, wd.date]);
      bookedSlotsData[wd.key] = bRows.map(r => ({ time: r.BookedTime, student: `${r.FirstName} ${r.LastName}`, id: r.AppointmentID }));
    }

    let successMsg = 'Availability saved successfully.';
    if (conflicts.length > 0) {
      successMsg += ` Warning: ${conflicts.length} existing appointment(s) conflict with your new unavailability.`;
    }

    res.render('nurse/availability', {
      user: req.session.user,
      grid,
      weekDays,
      timeSlots: AvailabilityModel.TIME_SLOTS,
      bookedSlots: JSON.stringify(bookedSlotsData),
      conflicts,
      error: null,
      success: successMsg
    });
  } catch (error) {
    console.error('Save availability error:', error);
    res.status(500).render('nurse/availability', {
      user: req.session.user,
      grid: {},
      weekDays: getUpcomingWeekDates(),
      timeSlots: AvailabilityModel.TIME_SLOTS,
      bookedSlots: '{}',
      conflicts: null,
      error: 'Failed to save availability. Please try again.',
      success: null
    });
  }
}

/**
 * GET /api/availability/:staffNumber/:day
 * API endpoint for booking form to fetch open slots (JSON response).
 */
export async function getAvailableSlotsAPI(req, res) {
  try {
    const { staffNumber, day, date } = req.params;
    let slots;

    if (date) {
      slots = await AvailabilityModel.getOpenSlots(staffNumber, day, date);
    } else {
      slots = await AvailabilityModel.getAvailableSlots(staffNumber, day);
    }

    res.json({ slots });
  } catch (error) {
    console.error('Availability API error:', error);
    res.status(500).json({ slots: [], error: 'Failed to fetch availability.' });
  }
}
