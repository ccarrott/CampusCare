// Imported FIRST so the process timezone is pinned before any Date exists.
// Every entry point — the server and each CLI seed script — reaches this module.
import { DB_TIMEZONE } from './timezone.js';
import mysql from 'mysql2/promise';
import fs from 'fs';

/**
 * Resolve the CA certificate for the managed MySQL TLS connection.
 * Priority (so it works both locally AND on a host with no file system access):
 *   1. DB_CA_CERT env var — the full PEM string (use this in production/hosting).
 *   2. A ca.pem file at the project root (convenient for local dev).
 *   3. null — falls back to a permissive TLS handshake if the provider allows it.
 */
function resolveCa() {
  if (process.env.DB_CA_CERT) return process.env.DB_CA_CERT.replace(/\\n/g, '\n');
  try { return fs.readFileSync('ca.pem', 'utf8'); } catch { return null; }
}

const ca = resolveCa();
const ssl = ca
  ? { ca, rejectUnauthorized: true }
  // No CA available: still use TLS but don't verify the chain (managed MySQL
  // like Aiven requires SSL). Set DB_CA_CERT in production for full verification.
  : { rejectUnauthorized: false };

if (!ca && process.env.NODE_ENV === 'production') {
  // Encrypted but unauthenticated: the connection is TLS, yet nothing proves the
  // server on the other end is really the database. Anyone able to intercept the
  // route can present their own certificate and read every query. Set DB_CA_CERT.
  console.warn(
    '[Database] WARNING: no DB_CA_CERT set in production — connecting over TLS ' +
    'WITHOUT certificate verification. Paste the provider CA into DB_CA_CERT.'
  );
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl,
  // How mysql2 converts DATETIME columns to and from JS Dates. Managed MySQL runs
  // in UTC, but every time this app stores is a South African wall-clock time, so
  // both directions are pinned to the app's offset instead of the server's.
  timezone: DB_TIMEZONE
});

// SQL's own clock has to agree with the app's. NOW(), CURDATE() and every
// DATE_SUB(NOW(), INTERVAL ? DAY) window run on the *database* server's timezone,
// which on a managed instance is UTC — so without this, appointments stored as
// 09:00 SAST would be compared against a clock two hours out, expiring bookings at
// the wrong time and shifting trend windows. Set it once per pooled connection.
pool.on('connection', (conn) => {
  conn.query(`SET time_zone = '${DB_TIMEZONE}'`, (err) => {
    if (err) {
      console.warn(
        `[Database] Could not set session time_zone to ${DB_TIMEZONE}: ${err.message}. ` +
        'Date comparisons may be offset from app time.'
      );
    }
  });
});

// Run a parameterised SQL query
export async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// Get a raw connection for transactions
export async function getConnection() {
  return await pool.getConnection();
}

/**
 * Executes a callback within a MySQL transaction.
 * Auto-commits on success, auto-rollbacks on error, always releases connection.
 */
export async function transaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
