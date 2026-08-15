// src/config/session.js
// Session configuration with secure cookie settings.

import session from 'express-session';

export function createSessionMiddleware() {
  return session({
    secret: process.env.SESSION_SEED,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 3600000, // 1 hour
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  });
}
