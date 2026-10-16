// src/config/test-email.js
// CLI tool to send test consultation emails to a student's address.
//
// Usage:
//   node src/config/test-email.js <studentNumber> [confirmation|reminder|both]
//   npm run test:email -- <studentNumber> [type]
//
// Examples:
//   npm run test:email -- s227921577            # sends BOTH (confirmation + reminder)
//   npm run test:email -- s227921577 reminder   # sends only the reminder
//
// The address is derived as <studentNumber>@mandela.ac.za (same rule the app uses).
// Requires the SMTP_* vars in .env; without them it reports that mail is disabled.

import 'dotenv/config';
import { sendConsultationEmail, studentEmailFor, isMailEnabled } from '../utils/mailer.js';

const studentNumber = process.argv[2];
const which = (process.argv[3] || 'both').toLowerCase();

if (!studentNumber) {
  console.error('Usage: npm run test:email -- <studentNumber> [confirmation|reminder|both]');
  console.error('Example: npm run test:email -- s227921577');
  process.exit(1);
}

if (!isMailEnabled()) {
  console.error('[test:email] SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing in .env).');
  process.exit(1);
}

const to = studentEmailFor(studentNumber);

// Sample data for the preview — not a real appointment.
const sample = {
  to,
  studentName: 'Test Student',
  nurseName: 'Nurse Sarah Jenkins',
  appointmentDate: '12 Feb 2026',
  appointmentTime: '14:30',
  actionUrl: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/consultations/my-appointments`
};

const types = which === 'both' ? ['confirmation', 'reminder'] : [which];

if (!types.every(t => t === 'confirmation' || t === 'reminder')) {
  console.error(`[test:email] Unknown type "${which}". Use: confirmation | reminder | both`);
  process.exit(1);
}

console.log(`[test:email] Sending ${types.join(' + ')} to ${to} ...`);

try {
  for (const type of types) {
    const info = await sendConsultationEmail({ type, ...sample });
    console.log(`  ✓ ${type}: accepted ${JSON.stringify(info?.accepted)} (id ${info?.messageId})`);
  }
  console.log('[test:email] Done.');
  process.exit(0);
} catch (err) {
  console.error('[test:email] Send failed:', err.message);
  process.exit(1);
}
