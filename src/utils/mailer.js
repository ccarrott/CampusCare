// src/utils/mailer.js
// Thin nodemailer wrapper for CampusCare consultation emails.
//
// Mirrors the shape of utils/daily.js: lazy module-level transport, server-side
// credentials only (never rendered to a view), and a single parameterised send.
//
// Two email types share one template (views/emails/consultation-email.ejs):
//   - 'confirmation' — sent synchronously when a student books.
//   - 'reminder'     — sent ~1 hour before the slot by the reminder scheduler.
//
// SMTP is OPTIONAL: if it is not configured the sends no-op with a warning, so
// local/dev without SMTP still books and runs normally (same policy as DAILY_API_KEY).

import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import ejs from 'ejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, '../../views/emails/consultation-email.ejs');
// Logo embedded via a cid attachment. Path resolved relative to THIS module (not
// process.cwd()) so it is found no matter where the process was started from.
const LOGO_PATH = path.join(__dirname, '../../public/images/nmu-logo.jpg');
const LOGO_CID = 'campuscare_logo';

// Per-type copy. The template is logic-free; it just prints these strings.
const COPY = {
  confirmation: {
    subject: 'Your CampusCare consultation is booked',
    title: 'Booking Confirmed',
    heading: 'Booking Confirmed',
    introLine: 'Your consultation has been booked with'
  },
  reminder: {
    subject: 'Reminder: your CampusCare consultation is in 1 hour',
    title: 'Meeting Reminder',
    heading: 'Meeting Reminder',
    introLine: 'This is a reminder for your upcoming consultation with'
  }
};

let _transporter = null;

/** True only when the full SMTP credential set is present. */
export function isMailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Lazily create (once) the nodemailer transport from env. */
function getTransporter() {
  if (_transporter) return _transporter;
  const port = Number(process.env.SMTP_PORT) || 587;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 587 = STARTTLS submission (secure:false + requireTLS). 465 would be secure:true.
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return _transporter;
}

/**
 * Send a consultation email (confirmation or reminder).
 *
 * @param {object} opts
 * @param {'confirmation'|'reminder'} opts.type
 * @param {string} opts.to                recipient email
 * @param {string} opts.studentName
 * @param {string} opts.nurseName
 * @param {string} opts.appointmentDate   pre-formatted, e.g. "12 Feb 2026"
 * @param {string} opts.appointmentTime   pre-formatted, e.g. "14:30"
 * @param {string} opts.actionUrl         link for the single button
 * @returns {Promise<object|undefined>}   nodemailer info, or undefined when disabled
 */
export async function sendConsultationEmail({
  type, to, studentName, nurseName, appointmentDate, appointmentTime, actionUrl
}) {
  if (!isMailEnabled()) {
    console.warn(`[Mail] SMTP not configured; skipping ${type} email to ${to}`);
    return undefined;
  }

  const copy = COPY[type] || COPY.confirmation;

  const html = await ejs.renderFile(TEMPLATE_PATH, {
    logoUrl: `cid:${LOGO_CID}`,
    title: copy.title,
    heading: copy.heading,
    introLine: copy.introLine,
    studentName,
    nurseName,
    appointmentDate,
    appointmentTime,
    actionUrl
  });

  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: copy.subject,
    html,
    attachments: [{
      filename: 'nmu-logo.jpg',
      path: LOGO_PATH,
      cid: LOGO_CID,
      contentType: 'image/jpeg',
      contentDisposition: 'inline'
    }]
  });
}

/**
 * Build the student email address from a student number.
 * Student numbers are stored already prefixed with 's' (e.g. s999000001); strip any
 * leading s/S then re-prefix so the result is correct either way.
 */
export function studentEmailFor(studentNumber) {
  const digits = String(studentNumber || '').replace(/^s/i, '');
  return `s${digits}@mandela.ac.za`;
}
