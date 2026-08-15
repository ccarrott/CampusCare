// src/modules/availability/availability.controller.js
// Handles nurse weekly availability grid display and save.

import * as AvailabilityModel from './availability.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { getUpcomingWeekDays } from '../../utils/dates.js';

// ============================================================================
// SHOW AVAILABILITY GRID
// ============================================================================

export const showAvailabilityGrid = catchAsync(async (req, res) => {
  const staffNumber = req.session.user.id;
  const grid = await AvailabilityModel.getAvailabilityForNurse(staffNumber);
  const weekDays = getUpcomingWeekDays();

  // Fetch booked slots for the upcoming 5 days
  const bookedSlots = {};
  for (const wd of weekDays) {
    const rows = await AvailabilityModel.getBookedAppointmentsForDate(staffNumber, wd.date);
    bookedSlots[wd.key] = rows.map(r => ({
      time: r.BookedTime,
      student: `${r.FirstName} ${r.LastName}`,
      id: r.AppointmentID
    }));
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
});

// ============================================================================
// SAVE AVAILABILITY
// ============================================================================

export const saveAvailability = catchAsync(async (req, res) => {
  const staffNumber = req.session.user.id;
  const weekDays = getUpcomingWeekDays();
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

      if (status === 'Unavailable' && oldGrid[wd.key] && oldGrid[wd.key][time.label] === 'Available') {
        newlyUnavailable.push({ day: wd.key, time: time.start, date: wd.date });
      }
    }
  }

  await AvailabilityModel.saveFullAvailability(staffNumber, slots);

  // Check for conflicting appointments on newly-unavailable slots
  let conflicts = [];
  for (const slot of newlyUnavailable) {
    if (!slot.date) continue;
    const rows = await AvailabilityModel.getBookedAppointmentsForDate(staffNumber, slot.date);
    const matching = rows.filter(r => r.BookedTime === slot.time);
    conflicts.push(...matching.map(r => ({
      appointmentId: r.AppointmentID,
      student: `${r.FirstName} ${r.LastName}`,
      day: slot.day,
      slot: slot.time
    })));
  }

  // Re-fetch updated state
  const grid = await AvailabilityModel.getAvailabilityForNurse(staffNumber);
  const bookedSlots = {};
  for (const wd of weekDays) {
    const rows = await AvailabilityModel.getBookedAppointmentsForDate(staffNumber, wd.date);
    bookedSlots[wd.key] = rows.map(r => ({ time: r.BookedTime, student: `${r.FirstName} ${r.LastName}`, id: r.AppointmentID }));
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
    bookedSlots: JSON.stringify(bookedSlots),
    conflicts,
    error: null,
    success: successMsg
  });
});

// ============================================================================
// API: Open slots (for booking form)
// ============================================================================

export const getAvailableSlotsAPI = catchAsync(async (req, res) => {
  const { staffNumber, day, date } = req.params;
  const slots = date
    ? await AvailabilityModel.getOpenSlots(staffNumber, day, date)
    : await AvailabilityModel.getAvailableSlots(staffNumber, day);
  res.json({ slots });
});
