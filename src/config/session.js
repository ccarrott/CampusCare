// src/config/session.js
// Session configuration with secure cookie settings and a MySQL-backed store.

import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { pool } from './database.js';

const MySQLStore = MySQLStoreFactory(session);

// One hour of inactivity, matching the client-side timeout warning in
// public/js/session-timeout.js. Keep the two in step if you change it.
const SESSION_TTL_MS = 60 * 60 * 1000;

/**
 * Sessions live in MySQL, not in the Node process.
 *
 * The default MemoryStore signs every user out on each restart — and on a free
 * hosting tier that sleeps when idle, "restart" means roughly every time nobody
 * has visited for fifteen minutes. It also can't be shared across instances and
 * grows without bound. Reusing the app's existing connection pool costs one extra
 * table and makes logins survive deploys, cold starts and crashes.
 */
export function createSessionMiddleware() {
  const store = new MySQLStore(
    {
      createDatabaseTable: true,          // creates `sessions` on first boot
      clearExpired: true,
      checkExpirationInterval: 15 * 60 * 1000,
      expiration: SESSION_TTL_MS,
      schema: {
        tableName: 'sessions',
        columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' }
      }
    },
    // Hand it the pool the rest of the app already uses (TLS + credentials included)
    // rather than opening a second, separately-configured connection.
    pool
  );

  // A store error must not take the process down — express-session falls back to
  // serving the request without a persisted session, which is degraded but alive.
  store.on('error', (err) => {
    console.error('[Session] MySQL session store error:', err.message);
  });

  return session({
    secret: process.env.SESSION_SEED,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,                        // sliding window: activity extends the session
    name: 'campuscare.sid',               // don't advertise the framework via connect.sid
    cookie: {
      maxAge: SESSION_TTL_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  });
}
