// src/modules/notifications/reminder.scheduler.js
// Background poller that sends a "Meeting Reminder" email ~1 hour before each
// consultation. There is no cron in the app; this mirrors the periodic setInterval
// sweep used by middleware/rateLimit.js.
//
// Idempotency is a DB column (Consultation.ReminderSentAt), not in-memory state, so
// a restart naturally resumes and no appointment is ever reminded twice.
//
// NOTE: assumes a single app instance. If the app is ever scaled horizontally, add a
// per-row lock so only one instance sends (see plan 7 §10).

import * as AppointmentsModel from '../appointments/appointments.model.js';
import { sendConsultationEmail, studentEmailFor, isMailEnabled } from '../../utils/mailer.js';
import { APP_TIMEZONE } from '../../config/timezone.js';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

function formatDate(time) {
  return new Date(time).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: APP_TIMEZONE
  });
}
function formatTime(time) {
  return new Date(time).toLocaleTimeString('en-ZA', {
    hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE
  });
}

/** Run one sweep: send reminders for all currently-due appointments. */
export async function runReminderSweep() {
  const actionUrl = `${process.env.APP_BASE_URL || ''}/consultations/my-appointments`;
  let due = [];
  try {
    due = await AppointmentsModel.getDueReminders();
  } catch (err) {
    console.error('[Reminder] due-query failed:', err.message);
    return;
  }

  for (const appt of due) {
    try {
      await sendConsultationEmail({
        type: 'reminder',
        to: studentEmailFor(appt.StudentNumber),
        studentName: `${appt.StudentFirstName} ${appt.StudentLastName}`.trim(),
        nurseName: `Nurse ${appt.NurseFirstName} ${appt.NurseLastName}`.trim(),
        appointmentDate: formatDate(appt.Time),
        appointmentTime: formatTime(appt.Time),
        actionUrl
      });
      // Only stamp on a successful send — a failure retries on the next tick.
      await AppointmentsModel.markReminderSent(appt.AppointmentID);
    } catch (err) {
      console.error(`[Reminder] send failed for ${appt.AppointmentID}:`, err.message);
    }
  }
}

/**
 * Start the periodic reminder poller. No-op (with a note) when SMTP isn't configured,
 * so dev without mail doesn't spin a pointless timer. .unref() so it never holds the
 * process open at shutdown.
 */
export function startReminderScheduler() {
  if (!isMailEnabled()) {
    console.log('[Reminder] SMTP not configured — reminder scheduler disabled.');
    return;
  }
  console.log('[Reminder] Scheduler started (polling every 5 min).');
  const timer = setInterval(() => {
    runReminderSweep().catch((e) => console.error('[Reminder] sweep error:', e.message));
  }, POLL_INTERVAL_MS);
  timer.unref();
}
