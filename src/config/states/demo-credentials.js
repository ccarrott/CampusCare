// src/config/states/demo-credentials.js
// Single source of truth for the demo account passwords used by the seed states.
//
// These are DEMO credentials. They are in a public repository, so treat them as
// public knowledge: anyone reading the source knows them. Before pointing real
// people at a deployed instance, override them with the environment variables
// below (set them in your host's dashboard, never in the repo) and re-run
// `npm run state:naked` — or, better, change each password from inside the app.
//
// The values here are only ever fed through bcrypt; nothing stores them in plain text.

export const DEMO_PASSWORDS = Object.freeze({
  admin: process.env.DEMO_ADMIN_PASSWORD || '123admin!',
  nurse: process.env.DEMO_NURSE_PASSWORD || '123nurse!',
  student: process.env.DEMO_STUDENT_PASSWORD || '123student!'
});

/**
 * The showcase student the nurse dashboard's "Create Demo Video Consultation"
 * button books against.
 *
 * Note the s999… prefix: real NMU student numbers begin with the enrolment year
 * (s22…, s23…), so this block cannot collide with an actual person's number. All
 * seeded students are invented — see the note at the top of state-showcase.js.
 */
export const DEMO_STUDENT_NUMBER = 's999000001';
