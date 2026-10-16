// Imported FIRST so the process timezone is pinned before any Date exists.
// Every entry point — the server and each CLI seed script — reaches this module.
import { DB_TIMEZONE } from './timezone.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// ENGINE SELECTION — either/or toggle (Local SQLite  OR  Aiven MySQL)
// ============================================================================
//
// Resolution precedence (highest first):
//   --aiven CLI flag  >  --local CLI flag  >  env USE_LOCAL_DB  >  default (MySQL)
//
// The CLI flags make `npm run start:local` / `start:aiven` work in ANY shell
// (PowerShell can't do the Bash `USE_LOCAL_DB=true node ...` idiom). When neither
// flag is present, the .env value decides; omitted ⇒ false ⇒ Aiven MySQL.
const argv = process.argv.slice(2);
const forceLocal = argv.includes('--local');
const forceAiven = argv.includes('--aiven');

export const USE_LOCAL_DB =
  forceAiven ? false
  : forceLocal ? true
  : String(process.env.USE_LOCAL_DB).toLowerCase() === 'true';

export const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || './local.db';

// Populated by whichever branch runs below. Same shape either way.
let pool;
let query;
let getConnection;
let transaction;

if (USE_LOCAL_DB) {
  // ==========================================================================
  // LOCAL SQLITE ADAPTER (node:sqlite — built into Node 22.5+, no native build)
  // ==========================================================================
  //
  // Presents the exact surface the rest of the app consumes from the mysql2
  // pool: pool.query/execute, pool.getConnection() with
  // beginTransaction/commit/rollback/release, pool.end(), and the module-level
  // query()/getConnection()/transaction() helpers. Nothing under src/modules/
  // can tell which engine is live.
  const { DatabaseSync } = await import('node:sqlite');

  const dbPath = path.isAbsolute(LOCAL_DB_PATH)
    ? LOCAL_DB_PATH
    : path.join(__dirname, '../../', LOCAL_DB_PATH);

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');   // concurrent-read friendly, durable
  db.exec('PRAGMA foreign_keys = ON');    // enforce FKs like a real schema

  console.log(`[Database] LOCAL SQLite mode — ${dbPath}`);

  // --- Parameter serializer -------------------------------------------------
  // node:sqlite binds string/number/bigint/null/Buffer only. Everything the
  // models actually pass is converted here: Date → 'YYYY-MM-DD HH:MM:SS'
  // (local wall-clock, matching how MySQL stored SAST times), boolean → 0/1,
  // undefined → null. Arrays/objects never reach a single `?` in this codebase
  // (audited) — throw loudly rather than corrupt data if that ever changes.
  const pad = (n) => String(n).padStart(2, '0');
  const toSqlDateTime = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  function serializeParam(p) {
    if (p === undefined || p === null) return null;
    if (p instanceof Date) return toSqlDateTime(p);
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (typeof p === 'number' || typeof p === 'bigint' || typeof p === 'string') return p;
    if (Buffer.isBuffer(p)) return p;
    throw new Error(`[Database] SQLite bind: unsupported parameter type ${typeof p} (${String(p)})`);
  }

  // --- Targeted SQL translator ---------------------------------------------
  // Converts ONLY the MySQL constructs the codebase actually uses into SQLite.
  // (Audit: NOW/CURDATE, DATE_SUB/ADD INTERVAL, TIME_FORMAT, GROUP_CONCAT with
  //  ORDER BY..SEPARATOR, ON DUPLICATE KEY UPDATE, FOR UPDATE, ENUM, ADD INDEX,
  //  backtick identifiers, and the brief-mandated SET FOREIGN_KEY_CHECKS.)
  function translateSql(sql) {
    let s = sql;

    // DATE_SUB/ADD(base, INTERVAL ?|N unit) → datetime(base, '±… units').
    // MUST run BEFORE NOW()/CURDATE() translation: the base here is still a
    // comma-free NOW()/CURDATE()/column, so the [^,] base capture is safe. (If
    // NOW() were expanded first it would inject a comma — datetime('now','localtime')
    // — and the base capture would stop inside it.) The '?'-driven amount keeps
    // its bound position via string concatenation: '-'||?||' days'.
    s = s.replace(
      /\bDATE_(SUB|ADD)\(\s*([^,]+?)\s*,\s*INTERVAL\s+(\?|\d+)\s+(DAY|HOUR|MINUTE|SECOND)\s*\)/gi,
      (_, op, base, amount, unit) => {
        const sign = op.toUpperCase() === 'SUB' ? '-' : '+';
        const u = unit.toLowerCase() + 's';
        const baseExpr = base.trim();
        if (amount === '?') return `datetime(${baseExpr}, '${sign}'||?||' ${u}')`;
        return `datetime(${baseExpr}, '${sign}${amount} ${u}')`;
      }
    );

    // Date/time scalar functions (after DATE_SUB/ADD, see note above).
    s = s.replace(/\bNOW\(\)/gi, "datetime('now','localtime')");
    s = s.replace(/\bCURDATE\(\)/gi, "date('now','localtime')");

    // TIME_FORMAT(col, '%H:%i') → strftime('%H:%M', col)
    s = s.replace(/\bTIME_FORMAT\(\s*([^,]+?)\s*,\s*'%H:%i'\s*\)/gi, "strftime('%H:%M', $1)");

    // GROUP_CONCAT(expr ORDER BY col SEPARATOR 'x') → GROUP_CONCAT(expr, 'x')
    s = s.replace(
      /\bGROUP_CONCAT\(\s*([^)]*?)\s+ORDER\s+BY\s+[^)]*?\s+SEPARATOR\s+('[^']*')\s*\)/gi,
      'GROUP_CONCAT($1, $2)'
    );

    // Upsert: ON DUPLICATE KEY UPDATE col = VALUES(col) → ON CONFLICT DO UPDATE SET col = excluded.col
    s = s.replace(
      /\bON\s+DUPLICATE\s+KEY\s+UPDATE\s+([A-Za-z_]+)\s*=\s*VALUES\(\s*([A-Za-z_]+)\s*\)/gi,
      (_, col) => `ON CONFLICT DO UPDATE SET ${col} = excluded.${col}`
    );

    // Row locking — SQLite locks the whole DB during a write txn, so this is a no-op.
    s = s.replace(/\bFOR\s+UPDATE\b/gi, '');

    // Brief-mandated: SET FOREIGN_KEY_CHECKS = 0/1 → PRAGMA foreign_keys = OFF/ON
    s = s.replace(/\bSET\s+FOREIGN_KEY_CHECKS\s*=\s*0/gi, 'PRAGMA foreign_keys = OFF');
    s = s.replace(/\bSET\s+FOREIGN_KEY_CHECKS\s*=\s*1/gi, 'PRAGMA foreign_keys = ON');

    // --- DDL (migrate.js) ---
    // ENUM('a','b',...) → varchar(20); values are plain strings everywhere.
    s = s.replace(/\bENUM\s*\([^)]*\)/gi, 'varchar(20)');
    // ALTER TABLE t ADD INDEX name (cols) → CREATE INDEX IF NOT EXISTS name ON t (cols)
    s = s.replace(
      /\bALTER\s+TABLE\s+([`"]?\w+[`"]?)\s+ADD\s+INDEX\s+(\w+)\s*\(([^)]+)\)/gi,
      (_, table, idx, cols) => `CREATE INDEX IF NOT EXISTS ${idx} ON ${table} (${cols})`
    );
    // Backtick identifiers → double-quoted (SQLite standard).
    s = s.replace(/`/g, '"');

    return s;
  }

  // --- Core executor: returns a mysql2-style [resultOrRows, fields] tuple ----
  function run(sql, params = []) {
    const translated = translateSql(sql);
    const bound = (params || []).map(serializeParam);
    const isRead =
      /^\s*(SELECT|PRAGMA|WITH)\b/i.test(translated) || /\bRETURNING\b/i.test(translated);
    const stmt = db.prepare(translated);
    if (isRead) {
      return [stmt.all(...bound), []];
    }
    const info = stmt.run(...bound);
    const changes = Number(info.changes) || 0;
    return [
      { insertId: Number(info.lastInsertRowid) || 0, affectedRows: changes, changedRows: changes },
      []
    ];
  }

  // --- Transaction connection ------------------------------------------------
  // execute()/query() return the FULL tuple because transaction callers
  // destructure `const [rows] = await conn.execute(...)`. node:sqlite has no
  // nested BEGIN, so track depth and no-op inner begin/commit (SAVEPOINT-free:
  // the codebase never truly nests, this is a defensive guard).
  let txnDepth = 0;
  function makeConnection() {
    return {
      execute: async (sql, params) => run(sql, params),
      query: async (sql, params) => run(sql, params),
      beginTransaction: async () => { if (txnDepth++ === 0) db.exec('BEGIN'); },
      commit: async () => { if (--txnDepth <= 0) { txnDepth = 0; db.exec('COMMIT'); } },
      rollback: async () => {
        txnDepth = 0;
        try { db.exec('ROLLBACK'); } catch { /* nothing open */ }
      },
      release: () => {}
    };
  }

  pool = {
    _db: db,
    query: async (sql, params) => run(sql, params),
    execute: async (sql, params) => run(sql, params),
    getConnection: async () => makeConnection(),
    end: async () => { try { db.close(); } catch { /* already closed */ } },
    on: () => {}
  };

  query = async (sql, params) => {
    const [rows] = run(sql, params);
    return rows;
  };

  getConnection = async () => makeConnection();

  transaction = async (callback) => {
    const conn = makeConnection();
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
  };

} else {
  // ==========================================================================
  // AIVEN MANAGED MYSQL (unchanged — this path is byte-for-byte the original)
  // ==========================================================================
  const mysql = (await import('mysql2/promise')).default;
  const { X509Certificate } = await import('crypto');

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

  pool = mysql.createPool({
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
  query = async function query(sql, params) {
    const [results] = await pool.execute(sql, params);
    return results;
  };

  // Get a raw connection for transactions
  getConnection = async function getConnection() {
    return await pool.getConnection();
  };

  /**
   * Executes a callback within a MySQL transaction.
   * Auto-commits on success, auto-rollbacks on error, always releases connection.
   */
  transaction = async function transaction(callback) {
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
  };
}

export { pool, query, getConnection, transaction };
