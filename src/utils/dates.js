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
      const dateStr = current.toISOString().slice(0, 10);
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
