// src/utils/dates.js
// Shared date utilities — weekday calculation and formatting.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Returns the next N weekdays starting from today.
 */
export function getUpcomingWeekDays(count = 5) {
  const days = [];
  const current = new Date();

  while (days.length < count) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      // Local Y-M-D (NOT toISOString, which is UTC and can roll to the previous
      // calendar day in SAST — making the posted date land on a weekend and the
      // server-side weekend check reject a valid weekday booking).
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const formatted = current.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
      days.push({
        dayName: DAY_NAMES[current.getDay()],
        date: dateStr,
        key: DAY_NAMES[current.getDay()],
        label: `${DAY_NAMES[current.getDay()]} (${formatted})`
      });
    }
  }
  return days;
}

/**
 * Checks if a date falls on a weekday (Mon-Fri).
 */
export function isWeekday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day !== 0 && day !== 6;
}
