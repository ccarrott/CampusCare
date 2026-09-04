// Imported FIRST so the process timezone is pinned before any Date exists.
// Every entry point — the server and each CLI seed script — reaches this module.
import { DB_TIMEZONE } from './timezone.js';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { X509Certificate } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The CA certificate for the managed MySQL TLS connection.
 *
 * Read from ca.pem next to this repo, and from nowhere else. There used to be a
 * DB_CA_CERT env-var override ahead of this, which is how a PEM ends up mangled:
 * dashboards strip the newlines out of a multi-line value, Node then parses no
 * certificate from it, silently falls back to the system trust store, and the
 * handshake dies with "self-signed certificate in certificate chain" — while the
 * correct cert sits unread in the repo. The CA is public, so committing it costs
 * nothing and removes the whole failure mode.
 *
 * Path is resolved from this file, not the working directory, so seed scripts and
 * `npm start` behave the same no matter where they are run from.
 */
const CA_PATH = path.join(__dirname, '../../ca.pem');

let ca = null;
try {
  ca = fs.readFileSync(CA_PATH, 'utf8');
} catch {
  console.warn(
    `[Database] WARNING: no CA at ${CA_PATH} — connecting over TLS WITHOUT ` +
    'certificate verification. The connection is encrypted, but nothing proves ' +
    'the server on the other end is really your database.'
  );
}

const ssl = ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };

// Which CA and which host, on every boot. A "self-signed certificate in chain"
// error with these two lines in the log is a CA/host mismatch — the cert is for a
// different database service than DB_HOST points at — not a malformed file.
if (ca) {
  let subject = 'unparseable — this file is not a valid certificate';
  try { subject = new X509Certificate(ca).subject.replace(/\n/g, ' '); } catch { /* keep the warning */ }
  console.log(`[Database] CA: ${subject} | host: ${process.env.DB_HOST}`);
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
