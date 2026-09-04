// src/config/timezone.js
// Pins the process timezone before anything constructs a Date.
//
// WHY THIS EXISTS
// Campus Care is a Gqeberha application: every appointment slot, availability grid
// and trend window is reasoned about in South African local time. On a developer's
// laptop that is what `new Date()` gives you for free. On a hosting provider it is
// not — Render, Railway, Fly and friends all run their containers in UTC, so the
// exact same code would:
//
//   • offer a different set of bookable weekdays either side of midnight,
//   • render appointment times two hours off,
//   • and expire appointments at the wrong moment.
//
// Rather than depend on the host being configured correctly, the app states its own
// timezone. Node honours an assignment to process.env.TZ as long as it happens
// before the first Date is created, which is why this module is imported first by
// config/database.js — the one module every entry point (the server and each CLI
// seed script) pulls in.
//
// South Africa observes no daylight saving, so SAST is a fixed UTC+02:00 all year.
// That is what makes the matching fixed offset used for the MySQL session safe.

import 'dotenv/config';

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Johannesburg';

// Fixed offset for the MySQL session (see config/database.js). SAST never shifts,
// so this stays correct; if you move the app to a DST-observing region, set
// DB_TIMEZONE explicitly and revisit the assumption.
export const DB_TIMEZONE = process.env.DB_TIMEZONE || '+02:00';

process.env.TZ = APP_TIMEZONE;
