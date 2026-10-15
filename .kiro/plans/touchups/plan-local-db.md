# Implementation Plan — Either/Or Local SQLite Database Toggle

**Goal:** Add a `.env`-driven switch (`USE_LOCAL_DB=true|false`) that runs CampusCare on **either** the existing Aiven managed MySQL **or** a local, self-seeding SQLite file (`local.db`) — with **zero changes to any file under `src/modules/`**. All isolation lives in `src/config/database.js`, with small touch-ups to `environment.js`, `session.js`, `app.js`, `migrate.js`, `.env`, `.env.example`, and `.gitignore`.

**Design keystone:** every model already calls the same two exports from `src/config/database.js` — `query(sql, params)` and `pool`/`getConnection()`/`transaction()`. If a SQLite-backed `pool` mimics the `mysql2/promise` shape **exactly**, and `query` applies a tiny SQL translator + parameter serializer + row normalizer, nothing downstream needs to know which engine is live.

---

## 1. Audit Findings

### 1.1 How the data layer is consumed (the contract we must preserve)

- `src/config/database.js` exports: `pool` (used directly in `app.js` for `pool.end()`, in `session.js` as the store handle, and in `appointments.model.js` for `pool.getConnection()`), `query(sql, params)` (returns **rows only** — it destructures `const [results] = await pool.execute(...)` and returns `results`), `getConnection()`, and `transaction(cb)`.
- `query()` returns `[results]` from `pool.execute` → so **models receive the rows array directly** for SELECT, and for mutations they read `.affectedRows` off the returned object (see below). The adapter's `query()` must therefore return the **first element** of the mysql2 `[rows, fields]` tuple.
- Mutation result fields actually read by code:
  - `result.affectedRows` — `appointments.model.js:230` (`deleteDemoAppointmentsForNurse`), `state-clear-outbreak.js:15` (three reads).
  - No code reads `insertId` (all PKs are app-generated strings) or `changedRows`, but the adapter will still synthesize them for parity.
- Transaction usage:
  - `transaction(cb)` — `symptoms.model.js:105` (`conn.execute(...)` ×2 inside).
  - `pool.getConnection()` + manual `beginTransaction`/`commit`/`rollback`/`release` + `conn.execute(...)` returning `const [existing] = ...` — `appointments.model.js:38-66` (`atomicBookSlot`). This destructures the tuple, so a transaction connection's `execute()` must return the **full `[rows, fields]` tuple** (unlike the top-level `query()` helper).

### 1.2 MySQL-specific SQL constructs actually present (exhaustive)

| Construct | Files / lines (exact) | SQLite equivalent |
|---|---|---|
| `NOW()` | `appointments.model.js:127,165,244`; `admin.model.js:41`; `auth.model.js:37`; `notifications.controller.js:24,25,36,37`; `export.controller.js:87`; `trends.model.js:36,57,80,87,107,121,146,161,171`; `symptoms.model.js:108` (`VALUES (..., NOW())`) | `datetime('now','localtime')` |
| `CURDATE()` | `admin.model.js:68` | `date('now','localtime')` |
| `DATE_SUB(x, INTERVAL ? DAY)` | `appointments.model.js:127`; `admin.model.js:68`; `trends.model.js` (×8 lines above); `export.controller.js:87` | `datetime(x, '-'\|\|?\|\|' days')` (translate — see §3.3) |
| `DATE_SUB(NOW(), INTERVAL 15 MINUTE)` / `DATE_ADD(NOW(), INTERVAL 25 HOUR)` (literal intervals) | `notifications.controller.js:24,25,36,37` | `datetime('now','localtime','-15 minutes')` / `datetime(..., '+25 hours')` |
| `DATE(col)` | `admin.model.js:67,70`; `appointments.model.js:137`; `availability.model.js:86`; `trends.model.js:118,122` | `date(col)` — identical name, SQLite has `date()` |
| `TIME_FORMAT(col, '%H:%i')` | `appointments.model.js:137`; `availability.model.js:83` | `strftime('%H:%M', col)` |
| `SUM(expr = 'literal')` (boolean-as-int MySQL idiom) | `trends.model.js:30,77,119,158` (`SUM(Severity = 'High')`) | `SUM(CASE WHEN expr THEN 1 ELSE 0 END)` — **but** SQLite evaluates `Severity = 'High'` to 1/0 natively, so `SUM(Severity = 'High')` works unchanged. **No translation needed** (verified: SQLite boolean expressions yield 1/0). |
| `AVG()`, `ROUND(x, n)`, `COUNT()`, `COUNT(DISTINCT ...)`, `COALESCE()`, `POW()` | `admin.model.js:19,38,41-48`; `trends.model.js`; `state-outbreak.js:19` | All exist in SQLite verbatim. `POW()` → SQLite has `POW()`/`POWER()` (3.35+; Node 22's bundled SQLite ≥ 3.45). No change. |
| `ON DUPLICATE KEY UPDATE col = VALUES(col)` | `appointments.model.js:255` (`upsertConsultationSession`) | `ON CONFLICT(SessionID) DO UPDATE SET AppointmentID = excluded.AppointmentID` (translate — see §3.3) |
| `SELECT ... FOR UPDATE` | `appointments.model.js:44` | Strip `FOR UPDATE` (SQLite transactions lock the DB file; the SELECT inside the write txn is sufficient) |
| `LIKE ?` / `LIKE 'PREFIX-%'` | `admin.model.js:118,145`; `appointments.model.js:229,230`; `state-clear-outbreak.js:12-14` | Identical in SQLite. No change. |
| `INNER/LEFT JOIN`, subqueries, `IN (SELECT ...)` | widespread (`admin.model.js:100`, etc.) | Identical. No change. |
| `!=` operator | widespread (`Status != 'Cancelled'`) | Identical. No change. |

### 1.3 MySQL-specific DDL constructs (schema — `migrate.js`)

| Construct | Where | SQLite handling |
|---|---|---|
| `varchar(n)`, `int`, `text`, `datetime`, `date`, `tinyint(1)`, `DECIMAL(10,7)` | all `CREATE TABLE` in `migrate.js` | SQLite is dynamically typed; these column-type tokens are accepted verbatim (affinity rules). **No change.** |
| `JSON` column type | `migrate.js` ("Add Boundary JSON to CampusZone") | SQLite accepts `JSON` as a type token (TEXT affinity). Stored/returned as a string — matches current `typeof Boundary === 'string' ? JSON.parse(...)` consumers in `geo.js:72` and `trends.controller.js:127`. **No change.** |
| `ENUM('Pending','Approved','Rejected')` | `migrate.js` ("Add Verified to NurseReviews") | SQLite has no ENUM; the token must be rewritten to `varchar(20)` by the DDL translator (see §3.3). Values are plain strings everywhere, so behaviour is identical. |
| `DEFAULT CURRENT_TIMESTAMP` | `migrate.js` (CreatedAt/LogDate columns) | Valid in SQLite verbatim. **No change.** |
| `ALTER TABLE ... ADD COLUMN` | migration chain | Supported by SQLite. |
| `ALTER TABLE ... ADD INDEX idx (...)` | `migrate.js` (8 index migrations) | SQLite **cannot** add an index via `ALTER TABLE`. Translate to a standalone `CREATE INDEX IF NOT EXISTS idx ON Table(cols)` (see §3.3 + §3.4). |
| `ALTER TABLE ... MODIFY` | *none present* | n/a |
| `ALTER TABLE ... DROP COLUMN` | `migrate.js` (Student.Email/Address, Medication.*, Nurse.Address) | SQLite 3.35+ supports `DROP COLUMN`. Node 22 bundles SQLite ≥ 3.45; `better-sqlite3@^11` bundles ≥ 3.45. **No change.** |
| `DROP TABLE IF EXISTS` | `migrate.js` (MedicalFacility) | Identical. No change. |
| `SHOW TABLES` / `DESCRIBE \`t\`` | `test_database.js:6,15` | Dev-only utility (`npm run db`). Not required for parity. **Document as not-translated**; optionally special-case to `SELECT name FROM sqlite_master WHERE type='table'` and `PRAGMA table_info()` if we want `npm run db` to keep working under local mode (nice-to-have, see §3.6). |
| `SET FOREIGN_KEY_CHECKS = 0/1` | *not currently used anywhere* (naked/seed scripts rely on manual delete ordering) | Translated to `PRAGMA foreign_keys = OFF/ON`. **Kept** because the brief (§2) explicitly names this mapping; the one line stays even though no current call uses it. |
| `GROUP_CONCAT(expr ORDER BY col SEPARATOR ', ')` | **USED** — `symptoms.model.js:143` (`getSymptomHistory`): `GROUP_CONCAT(s.Name ORDER BY s.Name SEPARATOR ', ')` | **Requires translation.** SQLite's `GROUP_CONCAT(expr, sep)` takes the separator as a 2nd arg and (pre-3.44) rejects inline `ORDER BY`/`SEPARATOR`. Translate to `GROUP_CONCAT(expr, ', ')` and drop the `ORDER BY s.Name` (ordering within the group is cosmetic for a comma list; the row order is already set by the outer `ORDER BY sl.LogDate DESC`). See §3.3. |
| `TRUNCATE TABLE` | *not used anywhere* (all resets use `DELETE FROM`) | **Not translated** — removed from the plan. Nothing to handle. |
| `INSERT IGNORE` | *not used anywhere* | **Not translated** — removed from the plan. |
| `AUTO_INCREMENT` | *not used* (all PKs app-generated strings) | n/a |

### 1.4 Base-schema replay nuance (`migrate.js` must still be idempotent)

`migrate.js` relies on MySQL **error codes** to treat "already applied" as a no-op (`ALREADY_APPLIED` set: `ER_DUP_FIELDNAME`, `ER_DUP_KEYNAME`, `ER_CANT_DROP_FIELD_OR_KEY`, `ER_TABLE_EXISTS_ERROR`, `ER_BAD_FIELD_ERROR`). SQLite throws different messages (e.g. `SqliteError: duplicate column name`, `table X already exists`, `no such column`). The idempotency guard must additionally recognise SQLite errors (see §3.5). This is the **one** edit to `migrate.js`; the SQL strings themselves are translated transparently by the adapter.

### 1.5 Parameter & row date-handling assumptions

- **mysql2 config:** `pool` sets `timezone: DB_TIMEZONE` (`+02:00`) and `SET time_zone='+02:00'` per connection. `dateStrings` is **not** enabled → mysql2 returns `DATETIME`/`DATE` columns as **JS `Date` objects**.
- **How consumers handle dates — already engine-tolerant:**
  - `trends.controller.js:47` — `t.Day instanceof Date ? t.Day.toISOString()... : String(t.Day).slice(0,10)` (handles both Date and string).
  - EJS views and other controllers format `a.Time` etc. via `new Date(...)` or `toLocale*` — a string ISO datetime is accepted by `new Date()`.
  - `room.service.js:30` — `new Date(appointment.RoomExp).getTime()` (string-safe).
  - **Decision:** the SQLite adapter will return date/datetime columns as **ISO-ish strings** (`YYYY-MM-DD HH:MM:SS`), which `new Date()` and the existing guards consume correctly. (Converting to `Date` objects is riskier — it would require schema-type knowledge the adapter doesn't have.) This is the documented parity contract.
- **Parameters passed into `query`/`execute`:**
  - **Strings/numbers/null** — the overwhelming majority. SQLite binds directly.
  - **`Date` objects** — `setAppointmentRoom(roomExp)` can receive a `Date` (`appointments.model.js:208`); `room.service.js` builds `RoomExp`. Also `markSessionStarted/Ended`, `markParticipantJoined` receive datetimes derived from webhook payloads (strings). The serializer must convert any `Date` param → `'YYYY-MM-DD HH:MM:SS'` string.
  - **Booleans** — `auth.model.js` writes `Used` as literal `0`/`1` in SQL (not JS booleans); `Verified` is a string. No JS boolean params found, but the serializer will coerce `true→1`/`false→0` defensively.
  - **`undefined`** — several `x || null` guards exist, but to be safe the serializer coerces `undefined→null` (better-sqlite3 rejects `undefined`).
  - **Arrays for `IN (?)`** — **none present** (no model expands an array into a single `?`). No array-expansion logic required; the serializer will throw a clear error if an array/object is ever bound, rather than silently corrupting data.

### 1.6 Session store (`session.js`) — MySQL-coupled

`session.js` builds an `express-mysql-session` store from the shared `pool` and auto-creates a `sessions` table. Under local mode there is no MySQL pool to hand it, and `express-mysql-session` cannot talk to SQLite. **Decision:** when `USE_LOCAL_DB=true`, fall back to the default `express-session` `MemoryStore` (no network, zero Aiven dependency). Trade-off: sessions reset on restart — acceptable for a local/demo DB. (`state-naked.js:36` already tolerates a missing `sessions` table via the `ER_NO_SUCH_TABLE` guard, so a wipe won't crash.)

### 1.7 App startup (`app.js`)

- `startServer()` calls `await query('SELECT 1')` — works on both engines unchanged.
- `pool.end()` on shutdown — the SQLite adapter's `pool.end()` will `db.close()`.
- Needs a new **auto-bootstrap** hook before `app.listen` when local mode is active and `local.db` is empty (see §3.4).

---

## 2. Files to Modify / Create

### Create
- **`local.db`** — generated at runtime (git-ignored). Not committed; auto-seeded on first boot.
- *(No new source modules — the adapter lives inside `database.js` to keep the switch centralized.)*

### Modify
| File | Change |
|---|---|
| `package.json` | Add dependency `better-sqlite3` (`^11`, prebuilt binaries for Node 22). **Add `start:local` script** (and `setup:local`) that boot on the SQLite file without touching `.env` — see §3.12. |
| `src/config/database.js` | The entire switch: engine selection, SQLite pool adapter, parameter serializer, SQL translator, row normalizer, `transaction()`/`getConnection()` parity. |
| `src/config/environment.js` | Make MySQL vars **conditionally** required (only when `!USE_LOCAL_DB`); validate `LOCAL_DB_PATH` presence when local. |
| `src/config/session.js` | Use `MemoryStore` when `USE_LOCAL_DB`; MySQL store otherwise. |
| `src/config/migrate.js` | Extend the idempotency guard to recognise SQLite "already applied" errors; export `runMigrations` for programmatic bootstrap. |
| `src/app.js` | On boot, if local mode and `local.db` is uninitialized, run migrate → seed-symptoms → seed-zones → showcase before `listen`. |
| `.env` | Add `USE_LOCAL_DB=true` and `LOCAL_DB_PATH=./local.db` (project actively boots on local.db per the brief). |
| `.env.example` | Document both keys + the either/or behaviour. |
| `.gitignore` | Ignore `local.db`, `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`. |

### Dependency choice
- **`better-sqlite3`** (synchronous, embedded, prebuilt binaries, stable API). Chosen over experimental `node:sqlite` because `node:sqlite` still emits an `ExperimentalWarning` and its API is unstable across 22.x patch releases. `better-sqlite3` is synchronous, which we wrap in `async` functions to match the `mysql2/promise` interface. Keeps the "vanilla runtime lib, no build step" spirit (prebuilt binary, no compiler needed on Node 22 LTS).

---

## 3. Step-by-Step Implementation Plan

### 3.0 Engine selection flag (top of `database.js`)
```js
import { DB_TIMEZONE } from './timezone.js';
const USE_LOCAL_DB = String(process.env.USE_LOCAL_DB).toLowerCase() === 'true'; // default false when omitted
const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || './local.db';
```
Then branch: if `USE_LOCAL_DB`, build the SQLite adapter and export `{ pool, query, getConnection, transaction }` from it; otherwise keep the existing mysql2 block **verbatim**. The MySQL path is untouched → `USE_LOCAL_DB=false` is a guaranteed no-regression restore.

### 3.1 The SQLite `pool` adapter (mysql2-shaped)
```js
import Database from 'better-sqlite3';

function createSqlitePool(path) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');   // §2 brief requirement
  db.pragma('foreign_keys = ON');    // §2 brief requirement

  // Shared executor used by pool, connection, and the query() helper.
  // Returns a mysql2-style [rows, fields] tuple.
  function run(sql, params = []) {
    const translated = translateSql(sql);          // §3.3
    const bound = (params || []).map(serializeParam); // §3.2
    const isSelect = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(translated)
      || /\bRETURNING\b/i.test(translated);
    const stmt = db.prepare(translated);
    if (isSelect) {
      const rows = stmt.all(...bound).map(normalizeRow); // §3.4 row normalizer
      return [rows, []];
    }
    const info = stmt.run(...bound);
    return [{
      insertId: Number(info.lastInsertRowid) || 0,
      affectedRows: info.changes,
      changedRows: info.changes
    }, []];
  }

  // A "connection" for transaction code paths. execute() returns the FULL tuple
  // because atomicBookSlot destructures `const [existing] = await conn.execute(...)`.
  function makeConnection() {
    return {
      execute: async (sql, params) => run(sql, params),
      query:   async (sql, params) => run(sql, params),
      beginTransaction: async () => { db.exec('BEGIN'); },
      commit:   async () => { db.exec('COMMIT'); },
      rollback: async () => { try { db.exec('ROLLBACK'); } catch {} },
      release:  () => {}            // no-op: single shared handle
    };
  }

  return {
    _db: db,
    query:   async (sql, params) => run(sql, params),   // returns [rows|result, fields]
    execute: async (sql, params) => run(sql, params),
    getConnection: async () => makeConnection(),
    end: async () => db.close(),
    on: () => {}                     // pool.on('connection', ...) no-op for parity
  };
}
```

### 3.2 Parameter serializer (`serializeParam`)
```js
function pad(n) { return String(n).padStart(2, '0'); }
function toSqlDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function serializeParam(p) {
  if (p === undefined) return null;                 // better-sqlite3 rejects undefined
  if (p === null) return null;
  if (p instanceof Date) return toSqlDateTime(p);   // Date → 'YYYY-MM-DD HH:MM:SS'
  if (typeof p === 'boolean') return p ? 1 : 0;     // boolean → int
  if (typeof p === 'number' || typeof p === 'bigint' || typeof p === 'string') return p;
  if (Buffer.isBuffer(p)) return p;
  // Arrays/objects are never bound to a single ? in this codebase (audit §1.5).
  throw new Error(`SQLite bind: unsupported parameter type ${typeof p}`);
}
```
Dates are formatted with **local** fields (process TZ is pinned to `Africa/Johannesburg` by `timezone.js`), matching how MySQL stored SAST wall-clock values.

### 3.3 Targeted SQL translator (`translateSql`) — only constructs present in §1.2 / §1.3
```js
function translateSql(sql) {
  let s = sql;

  // --- Date/time functions (DML) ---
  s = s.replace(/\bNOW\(\)/gi, "datetime('now','localtime')");
  s = s.replace(/\bCURDATE\(\)/gi, "date('now','localtime')");

  // DATE_SUB(x, INTERVAL ? DAY) / literal intervals → datetime(x, '±N units')
  // Handles: ? DAY, N MINUTE, N HOUR, N DAY (the exact forms in the codebase).
  s = s.replace(
    /\bDATE_(SUB|ADD)\(\s*([^,]+?)\s*,\s*INTERVAL\s+(\?|\d+)\s+(DAY|HOUR|MINUTE|SECOND)\s*\)/gi,
    (_, op, base, amount, unit) => {
      const sign = op.toUpperCase() === 'SUB' ? '-' : '+';
      const u = unit.toLowerCase() + 's';           // DAY→days, HOUR→hours...
      const baseExpr = /NOW\(\)|datetime|date\(/i.test(base) ? base.trim() : base.trim();
      // '?'-driven amount must become a bound modifier: build '-'||?||' days'
      if (amount === '?') return `datetime(${baseExpr}, '${sign}'||?||' ${u}')`;
      return `datetime(${baseExpr}, '${sign}${amount} ${u}')`;
    }
  );

  // TIME_FORMAT(col, '%H:%i') → strftime('%H:%M', col)
  s = s.replace(/\bTIME_FORMAT\(\s*([^,]+?)\s*,\s*'%H:%i'\s*\)/gi, "strftime('%H:%M', $1)");

  // DATE(col) is valid SQLite as-is; no change needed.

  // --- Upsert ---
  // INSERT INTO ConsultationSession (...) VALUES (...) ON DUPLICATE KEY UPDATE col = VALUES(col)
  s = s.replace(
    /\bON\s+DUPLICATE\s+KEY\s+UPDATE\s+([A-Za-z_]+)\s*=\s*VALUES\(\s*([A-Za-z_]+)\s*\)/gi,
    (_, col) => `ON CONFLICT DO UPDATE SET ${col} = excluded.${col}`
  );

  // --- GROUP_CONCAT (USED: symptoms.model.js getSymptomHistory) ---
  // MySQL: GROUP_CONCAT(expr ORDER BY col SEPARATOR ', ')
  // SQLite: GROUP_CONCAT(expr, ', ')  — separator is the 2nd arg; strip ORDER BY.
  s = s.replace(
    /\bGROUP_CONCAT\(\s*([^)]*?)\s+ORDER\s+BY\s+[^)]*?\s+SEPARATOR\s+('[^']*')\s*\)/gi,
    'GROUP_CONCAT($1, $2)'
  );

  // --- Locking (no-op in SQLite) ---
  s = s.replace(/\bFOR\s+UPDATE\b/gi, '');

  // --- SET FOREIGN_KEY_CHECKS → PRAGMA (explicitly required by the brief §2) ---
  s = s.replace(/\bSET\s+FOREIGN_KEY_CHECKS\s*=\s*0/gi, 'PRAGMA foreign_keys = OFF');
  s = s.replace(/\bSET\s+FOREIGN_KEY_CHECKS\s*=\s*1/gi, 'PRAGMA foreign_keys = ON');

  // --- DDL (migrate.js) ---
  // ENUM('a','b',...) → varchar(20)
  s = s.replace(/\bENUM\s*\([^)]*\)/gi, 'varchar(20)');
  // ALTER TABLE t ADD INDEX name (cols)  →  CREATE INDEX IF NOT EXISTS name ON t (cols)
  s = s.replace(
    /\bALTER\s+TABLE\s+([`"]?\w+[`"]?)\s+ADD\s+INDEX\s+(\w+)\s*\(([^)]+)\)/gi,
    (_, table, idx, cols) => `CREATE INDEX IF NOT EXISTS ${idx} ON ${table} (${cols})`
  );
  // Backticked identifiers → double quotes (test_database DESCRIBE etc.)
  s = s.replace(/`/g, '"');

  return s;
}
```
> **`SUM(Severity = 'High')`** — intentionally **not** translated; SQLite evaluates the comparison to 1/0 and `SUM` behaves identically to MySQL. Verified against the four occurrences in `trends.model.js`.
>
> **Note on the `?`-interval rewrite:** the bound-parameter position is preserved. `DATE_SUB(NOW(), INTERVAL ? DAY)` with param `[30]` becomes `datetime(datetime('now','localtime'), '-'||?||' days')` with the same `[30]` binding — SQLite concatenates `'-' || 30 || ' days'` → `'-30 days'`. Parameter order across the whole statement is unchanged.
>
> **`GROUP_CONCAT` behaviour note:** dropping the inline `ORDER BY s.Name` means the comma-joined symptom names within one history row are no longer alphabetically sorted. This is cosmetic (the UI shows them as a single "Headache, Fever" string) and the row-level ordering (`ORDER BY sl.LogDate DESC`) is unaffected. If exact alphabetical order inside the list is later deemed important, SQLite ≥ 3.44 (bundled in Node 22 / better-sqlite3 ^11) does accept `GROUP_CONCAT(expr ORDER BY col, sep)` — but that syntax differs from MySQL's, so it would still need the translator, not a passthrough.
>
> **Removed as unused:** the first draft listed defensive translations for `INSERT IGNORE` and `TRUNCATE TABLE`. A full-tree grep confirms **neither appears anywhere** in `src/`, so both are dropped from the translator (minimalism). Only `SET FOREIGN_KEY_CHECKS` is retained among the "not-currently-called" rules, because the brief (§2) explicitly requires that mapping.

### 3.4 Row normalizer (`normalizeRow`)
better-sqlite3 returns `DECIMAL`/`int` as JS numbers and `TEXT` (incl. our datetime/JSON columns) as strings — which already matches the engine-tolerant consumers (§1.5). The normalizer is a light pass to guarantee datetime columns are strings in the canonical `YYYY-MM-DD HH:MM:SS` shape (SQLite's `datetime()`/`CURRENT_TIMESTAMP` already emit this) and leave everything else untouched:
```js
function normalizeRow(row) {
  // better-sqlite3 already returns plain objects with string datetimes and
  // numeric DECIMALs. No per-column coercion needed given the audit (§1.5):
  // consumers use `new Date(str)` and `typeof Boundary === 'string' ? JSON.parse`.
  return row;
}
```
> This is deliberately a pass-through — the audit proved consumers accept strings. Keeping it as a named hook means if a specific column ever needs coercion we have one place to do it, without touching models.

### 3.5 `migrate.js` idempotency guard (the only migrate edit)
Extend `ALREADY_APPLIED` handling to also match SQLite error messages (better-sqlite3 throws `SqliteError` with `.code` like `SQLITE_ERROR` and descriptive `.message`):
```js
function isAlreadyApplied(error) {
  if (ALREADY_APPLIED.has(error.code)) return true;           // MySQL path (unchanged)
  const m = (error.message || '').toLowerCase();              // SQLite path
  return m.includes('duplicate column name')
      || m.includes('already exists')
      || m.includes('no such column')
      || m.includes('no such table');                         // DROP on absent table
}
```
Use `isAlreadyApplied(error)` in `runStep`'s catch. Also **export** `runMigrations` (remove the bare bottom-of-file `runMigrations()` auto-call behind an `if (process.argv[1]?.includes('migrate'))` guard) so `app.js` can invoke it programmatically for auto-bootstrap, while `npm run migrate` still works as a CLI.

### 3.6 (Optional) `test_database.js` under SQLite
`npm run db` uses `SHOW TABLES` / `DESCRIBE`. The translator rewrites backticks but not `SHOW/DESCRIBE`. Low priority (dev utility). If desired, add two tiny translations: `SHOW TABLES` → `SELECT name FROM sqlite_master WHERE type='table'`, and `DESCRIBE "t"` → `PRAGMA table_info("t")`. **Flagged as nice-to-have, not required for app parity.**

### 3.7 Auto-bootstrap on startup (`app.js`)
Insert before `app.listen`, inside `startServer()`:
```js
if (process.env.USE_LOCAL_DB?.toLowerCase() === 'true') {
  const rows = await query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Student'"
  );
  const seeded = rows.length && (await query('SELECT COUNT(*) AS c FROM Nurse'))[0].c > 0;
  if (!seeded) {
    console.log('[LocalDB] Fresh local.db — bootstrapping schema + showcase data...');
    const { runMigrations } = await import('./config/migrate.js');
    await runMigrations({ exitOnDone: false });        // migrate (idempotent)
    await import('./config/seed-symptoms.js');          // symptom/med seed
    const { seedZones } = await import('./config/seed-zones-v2.js'); // export + call
    await seedZones({ exitOnDone: false });
    const { loadShowcaseState } = await import('./config/states/state-showcase.js');
    await loadShowcaseState();
    console.log('[LocalDB] Bootstrap complete.');
  }
}
await query('SELECT 1');
```
> **Seed-script note:** `seed-symptoms.js`, `seed-zones-v2.js`, and the state scripts currently call `process.exit(0)` at the end and run on import. For programmatic use, guard their auto-run with `if (process.argv[1]?.includes('seed-...'))` (state scripts already do this) and export the function. `seed-symptoms.js` needs this small guard added so importing it doesn't kill the server process. **This is a `src/config/**` change, not a `src/modules/**` change — allowed by the constraints.**

### 3.8 `environment.js` — conditional MySQL requirement
```js
export function validateEnv() {
  const local = String(process.env.USE_LOCAL_DB).toLowerCase() === 'true';
  const required = local
    ? ['SESSION_SEED']                        // local mode: no DB_* needed
    : ['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME','DB_PORT','SESSION_SEED'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) { console.error(`[FATAL] Missing env: ${missing.join(', ')}`); process.exit(1); }
  if (local && !process.env.LOCAL_DB_PATH) {
    console.warn('[Env] USE_LOCAL_DB=true but LOCAL_DB_PATH unset — defaulting to ./local.db');
  }
}
```

### 3.9 `session.js` — store selection
```js
export function createSessionMiddleware() {
  const local = String(process.env.USE_LOCAL_DB).toLowerCase() === 'true';
  let store; // undefined → express-session MemoryStore
  if (!local) {
    const MySQLStore = MySQLStoreFactory(session);
    store = new MySQLStore({ /* ...existing config... */ }, pool);
    store.on('error', (err) => console.error('[Session] MySQL session store error:', err.message));
  } else {
    console.log('[Session] USE_LOCAL_DB — using in-memory session store (no Aiven).');
  }
  return session({ secret: process.env.SESSION_SEED, store, /* ...rest unchanged... */ });
}
```

### 3.10 `.env` (active local config per brief)
```ini
# ---- Database engine toggle ----
# true  → boot on local SQLite file (LOCAL_DB_PATH), zero Aiven network
# false → boot on Aiven managed MySQL (DB_* below). Omitted ⇒ false.
USE_LOCAL_DB=true
LOCAL_DB_PATH=./local.db

# ---- Aiven managed MySQL (used only when USE_LOCAL_DB=false) ----
DB_HOST=...   # (existing values retained)
```

### 3.11 `.env.example` + `.gitignore`
- `.env.example`: document `USE_LOCAL_DB` / `LOCAL_DB_PATH` and the either/or rule (default false).
- `.gitignore`: append
  ```
  # Local SQLite database (auto-seeded on boot; never committed)
  local.db
  *.db
  *.db-journal
  *.db-wal
  *.db-shm
  ```
  **Decision:** `local.db` is **git-ignored** and regenerated via auto-bootstrap (§3.7) — the repo stays clean and every clone gets a freshly seeded DB. (Rationale: committing a binary DB invites merge pain and staleness; the showcase seed runs in seconds.)

### 3.12 `npm start` local-DB flag (run on SQLite without editing `.env`)

**Requirement:** a one-command way to boot on the local DB. The `.env` toggle (§3.0) already selects the engine, but the user wants `npm start`-style convenience to force local mode regardless of what `.env` says — and it must work in **PowerShell** (this project's shell), where the Bash idiom `USE_LOCAL_DB=true node src/app.js` does **not** work (PowerShell treats `USE_LOCAL_DB=true` as a literal and errors).

**Chosen mechanism — a CLI flag read in code, not a shell env assignment.** This is the only truly shell-agnostic option with zero new dependencies (no `cross-env`).

**package.json scripts (add):**
```jsonc
{
  "scripts": {
    "start": "node src/app.js",                 // unchanged — honours USE_LOCAL_DB from .env
    "start:local": "node src/app.js --local",   // force SQLite, ignore .env toggle
    "start:aiven": "node src/app.js --aiven",    // force MySQL, ignore .env toggle
    "setup:local": "node src/app.js --local --bootstrap-only"  // build+seed local.db then exit
  }
}
```

**How the flag is resolved — update `src/config/database.js` §3.0 selection:**
```js
const argv = process.argv.slice(2);
const forceLocal = argv.includes('--local');
const forceAiven = argv.includes('--aiven');
const USE_LOCAL_DB =
  forceAiven ? false
  : forceLocal ? true
  : String(process.env.USE_LOCAL_DB).toLowerCase() === 'true';  // .env default, else false
```
Precedence: **`--aiven` > `--local` > `.env` `USE_LOCAL_DB` > default(false)**. `environment.js` (§3.8) imports the same resolved flag (export it from `database.js`, or recompute identically) so its conditional required-vars match.

**Optional `--bootstrap-only`** (used by `setup:local`): in `app.js`, after the §3.7 bootstrap block, if `process.argv.includes('--bootstrap-only')` then `process.exit(0)` instead of `app.listen` — gives a clean "prepare the local DB and quit" command for CI or first-run setup.

**Usage (any shell, incl. PowerShell):**
```
npm run start:local      # boot on local.db (auto-seeds if empty), no .env edit needed
npm run setup:local      # just build + seed local.db, then exit
npm start                # whatever .env says (USE_LOCAL_DB=true per §3.10 → local)
npm run start:aiven      # force the managed MySQL path
```
This keeps `start` honouring `.env` (so §3.10's `USE_LOCAL_DB=true` still makes the default boot local) while giving explicit, OS-independent overrides. **Footprint: ~5 lines in `database.js`, 3 new one-line npm scripts, ~2 lines in `app.js` for `--bootstrap-only`.**

---

## 4. Testing & Verification Checklist

### 4.1 Setup & migrations (local)
```bash
npm install                      # pulls better-sqlite3 (prebuilt, no compiler)
# Ensure .env has USE_LOCAL_DB=true, LOCAL_DB_PATH=./local.db
# start clean — remove db + both WAL side-cars (PowerShell): Remove-Item local.db* -ErrorAction Ignore
# (bash equivalent: rm -f local.db local.db-wal local.db-shm)
npm run migrate                  # expect: all base tables + migrations OK/SKIP, 0 failed
npm run seed:symptoms            # expect: 47 symptoms, 27 meds, mappings
npm run seed:zones               # expect: ~35 Voronoi zones
npm run state:showcase           # expect: 19 students, 50 appts, 100 logs, 405 slots, 0 errors
```
- [ ] `migrate` reports `0 failed`; re-running reports everything `SKIP` (idempotency guard works for SQLite).
- [ ] `local.db` file exists; `*.db-wal` present (WAL mode on).

### 4.2 Zero-Aiven boot
- [ ] Disconnect network / set an invalid `DB_HOST`, keep `USE_LOCAL_DB=true` → `npm start` boots, `SELECT 1` passes, no MySQL connection attempt, no `express-mysql-session` error.
- [ ] Delete `local.db`, then `npm start` → auto-bootstrap runs migrate+seed+showcase, server listens with a rich DB (§3.7).
- [ ] **`npm run start:local`** (in PowerShell) boots on SQLite even if `.env` has `USE_LOCAL_DB=false` — confirms the CLI flag overrides `.env` and that no `USE_LOCAL_DB=true node …` Bash idiom is required (§3.12).
- [ ] **`npm run setup:local`** builds + seeds `local.db` then exits 0 without starting the server (`--bootstrap-only`).
- [ ] **`npm run start:aiven`** forces the MySQL path even if `.env` has `USE_LOCAL_DB=true`.

### 4.3 Role-flow parity audit (manual, against local.db)
- [ ] **Student auth:** register new `s...` number, log out, log back in (bcrypt verify).
- [ ] **Symptoms:** submit a multi-symptom check (writes `SymptomLog` with `NOW()` → `datetime('now','localtime')`, plus `SymptomLogEntry` rows in a transaction); OTC recommendations render.
- [ ] **Booking:** book a consultation → `atomicBookSlot` transaction commits; double-book the same slot → `slot_taken`; booked slot greys out (`TIME_FORMAT`/`DATE()` translated).
- [ ] **Dashboard expiry:** past Pending/Confirmed appt flips to Cancelled on load (`Time < NOW()`).
- [ ] **Nurse:** availability grid saves (bulk delete+insert); dashboard Upcoming/Previous split correct; notes update.
- [ ] **Admin reports:** operational report (`AVG`, `COUNT`), appointments-by-type, daily counts (`DATE_SUB(CURDATE(), INTERVAL ? DAY)`), video stats (`ROUND(AVG(...))`, correlated `NOT EXISTS`), ratings list.
- [ ] **Trends/map:** `/trends` loads; headline stats, severity split, timeline (`DATE(LogDate)` grouping, `t.Day` string handled), zone rollup, report points; map GeoJSON built from `Boundary` string (`JSON.parse` path).
- [ ] **CSV exports:** `/trends/export-csv` and admin `reports/export-csv` (`DATE_SUB(NOW(), INTERVAL 30 DAY)`, joins) produce rows.
- [ ] **Demo state switching (admin console):** `CampusCare.showcase()`, `.outbreak()`, `.clear()`, `.naked()` via `states-api.js` all return `{success:true}`; outbreak adds `SH-OUT-*` logs/appointments, clear removes exactly those (`LIKE 'SH-OUT-%'` / `'APT-OUT-%'`, `affectedRows` reported correctly).
- [ ] **Password reset:** create token (`Used=0`), validate (`Used = 0 AND ExpiresAt > NOW()`), mark used (`Used = 1`).

### 4.4 Date/parameter parity spot-checks
- [ ] `RoomExp` stored via a `Date` param reads back as a string that `new Date(RoomExp)` parses correctly (join-window logic in `room.service.js`).
- [ ] Appointment `Time` displayed in SAST wall-clock matches what was booked (no 2-hour drift — serializer uses local fields).
- [ ] A `?`-interval query (e.g. `getDailyTimeline(14)`) returns the same date window as MySQL for the same `days`.

### 4.5 MySQL no-regression restore
```bash
# Flip the switch back
USE_LOCAL_DB=false   # in .env
npm start
```
- [ ] App connects to Aiven over TLS (CA log line prints), `express-mysql-session` store active, all §4.3 flows behave exactly as before. The MySQL branch of `database.js` is byte-for-byte unchanged, so this is a pure configuration flip.
- [ ] `git status` shows no `local.db` tracked.

### 4.6 Constraint compliance
- [ ] `git diff --stat` shows **no files under `src/modules/`** changed.
- [ ] Only `src/config/*`, `src/app.js`, `.env*`, `.gitignore`, `package.json` modified.

---

## Appendix — Translator coverage matrix (every MySQL-ism → handled)

| MySQL construct | Occurrences | Handling |
|---|---|---|
| `NOW()` | 15+ | → `datetime('now','localtime')` |
| `CURDATE()` | 1 | → `date('now','localtime')` |
| `DATE_SUB/ADD(..., INTERVAL ?/N unit)` | ~18 | → `datetime(base, '±…')` (param-preserving) |
| `DATE(col)` | 6 | native (no change) |
| `TIME_FORMAT(col,'%H:%i')` | 2 | → `strftime('%H:%M', col)` |
| `SUM(expr='lit')` | 4 | native 1/0 (no change) |
| `AVG/ROUND/COUNT/COALESCE/POW` | many | native (no change) |
| `ON DUPLICATE KEY UPDATE …=VALUES(…)` | 1 | → `ON CONFLICT DO UPDATE SET …=excluded.…` |
| `FOR UPDATE` | 1 | stripped |
| `LIKE`, joins, subqueries, `!=`, `IN (SELECT)` | many | native (no change) |
| `ENUM(...)` (DDL) | 1 | → `varchar(20)` |
| `ALTER TABLE ADD INDEX` (DDL) | 8 | → `CREATE INDEX IF NOT EXISTS` |
| `DROP COLUMN` / `DROP TABLE IF EXISTS` (DDL) | several | native (SQLite ≥ 3.35) |
| `varchar/int/text/datetime/date/tinyint/DECIMAL/JSON` types | all DDL | native affinity (no change) |
| `GROUP_CONCAT(expr ORDER BY c SEPARATOR ', ')` | 1 (`symptoms.model.js`) | → `GROUP_CONCAT(expr, ', ')` (strip ORDER BY) |
| `SET FOREIGN_KEY_CHECKS` | 0 (brief-required mapping) | → `PRAGMA foreign_keys = OFF/ON` |
| `TRUNCATE` / `INSERT IGNORE` | 0 (confirmed absent) | **not translated — removed from plan** |
| `SHOW TABLES` / `DESCRIBE` | 2 (dev util) | optional (§3.6) |

---

# Plan Review — Plausibility & Minimalism

A second-pass critical review of the plan above, checking (a) whether it actually works against the real code, and (b) whether the footprint is as small as it can be.

## A. Is it plausible? (Mostly yes — with 4 gaps the first draft under-specified)

### Verdict: plausible and sound in architecture. The centralized-adapter approach is the right call and the SQL audit is complete. Four edge cases need tightening before implementation, or the "parity" claim is overstated.

### ✅ What holds up
- **The interception point is correct.** Every model goes through `query`/`pool`/`getConnection`/`transaction`. A faithful mysql2-shaped SQLite pool genuinely needs no module edits. Confirmed across all 11 model files.
- **The SQL dialect surface is small and fully catalogued.** The translator in §3.3 covers every construct the grep audit found. Nothing in `src/modules/**` uses a MySQL-ism outside that list.
- **Date-string parity is safe.** Consumers already guard with `instanceof Date ? … : String(…)` and `typeof Boundary === 'string' ? JSON.parse`. Returning strings will not break them. This was verified, not assumed.
- **The upsert translation is valid.** `ConsultationSession.SessionID` is the PK, so bare `ON CONFLICT DO UPDATE SET …` resolves the conflict target correctly.

### ⚠️ Gaps the first draft glossed over (must fix for true parity)

**1. Nested transactions will throw in SQLite.**
The auto-bootstrap (§3.7) calls `loadShowcaseState()`, which calls `loadNakedState()`, both issuing many `query()` writes. Separately, `symptoms.model.js` and `atomicBookSlot` open explicit transactions. better-sqlite3 does **not** support nested `BEGIN` — a `BEGIN` inside an open transaction throws `cannot start a transaction within a transaction`. MySQL silently tolerates this (implicit commit). None of the current paths actually nest `BEGIN` inside `BEGIN` today (the state scripts use bare `query()`, not `transaction()`), so this is **latent, not active** — but the adapter should guard it defensively: track an `inTransaction` flag and make `beginTransaction()` a no-op (or use SQLite SAVEPOINTs) when already open. **One extra flag in the adapter; still minimal.**

**2. WAL mode writes two side-car files, not one.** The `.gitignore` in §3.11 correctly lists `-wal` and `-shm`. ✅ But the §4.1 cleanup command must remove all three (`local.db`, `local.db-wal`, `local.db-shm`) or a "clean" test starts dirty. Minor, already partially handled — just make the cleanup glob `local.db*`.

**3. `migrate.js` bottom-of-file auto-run must be guarded, not just exported.** The plan says to export `runMigrations` and wrap the call in `if (process.argv[1]?.includes('migrate'))`. Correct — but note the current file calls `process.exit()` inside `runMigrations` itself. The programmatic path (`runMigrations({ exitOnDone:false })`) must skip the `process.exit`, or auto-bootstrap kills the server mid-boot. The plan mentions this for the seed scripts but is vague for migrate. **Make it explicit: `runMigrations` takes `{exitOnDone=true}` and only exits when true.**

**4. `express-session` with `store: undefined`.** Passing `store: undefined` to `session()` is valid (it defaults to MemoryStore) and logs a known production warning. That's acceptable for local/demo mode, but the plan should state it will appear so nobody treats it as a regression. Cosmetic.

### ❓ One assumption to validate at implementation time, not plan time
- **`better-sqlite3` prebuilt binary availability for the exact Node 22 minor in use.** The plan asserts "no compiler needed." True for Node 22 LTS on common platforms, but if the local Node is an odd minor without a prebuild, install falls back to `node-gyp` (needs build tools on Windows). Fallback if that bites: `USE_LOCAL_DB` can target the built-in `node:sqlite` instead (Node ≥ 22.5) — the adapter interface is identical, only the `import`/prepare calls differ. Worth a one-line note in the plan as Plan B. **Verify with `npm install better-sqlite3` on the dev machine as the very first implementation step.**

## B. Are the code changes minimal? (Yes — this is close to the floor)

### Footprint: 8 files, 0 under `src/modules/`.

| File | Lines of change (est.) | Could it be smaller? |
|---|---|---|
| `src/config/database.js` | +120 (adapter + translator + serializer) | This is the irreducible core — the whole point is to concentrate complexity here. No. |
| `src/config/environment.js` | ~8 (conditional required-vars) | No — minimal already. |
| `src/config/session.js` | ~10 (store branch) | No. |
| `src/config/migrate.js` | ~10 (error guard + export/exit flag) | No. |
| `src/app.js` | ~17 (bootstrap block + `--bootstrap-only` exit) | Could be extracted to a helper, but inline is fewer files. Keep inline. |
| `package.json` (scripts) | +3 one-line scripts (`start:local`, `start:aiven`, `setup:local`) | Irreducible — the convenience command the user asked for. |
| `src/config/seed-symptoms.js` | ~3 (CLI guard + export) | Required so import doesn't `process.exit`. Irreducible. |
| `.env` / `.env.example` / `.gitignore` | config only | n/a |

### Minimalism assessment
- **No model/controller/view/route changes** — meets the hard constraint exactly.
- **The MySQL path is untouched** — `USE_LOCAL_DB=false` is a byte-for-byte no-op restore. This is the strongest possible minimalism guarantee: the existing production behaviour cannot regress because its code doesn't change.
- **The one unavoidable spread beyond `database.js`** is the seed/state scripts' `process.exit()`-on-import problem. That is inherent to reusing them for auto-bootstrap, not accidental scope creep. Alternative (shelling out `node src/config/migrate.js` as child processes from `app.js`) would avoid editing them but adds process-spawn complexity and is *less* clean — the small guard edits are the minimal choice.
- **Row normalizer is a pass-through** (§3.4) — correctly resisting the temptation to add per-column coercion the audit proved unnecessary. Good restraint.

### Over-build removed (resolved)
- The first draft carried defensive translations for `INSERT IGNORE`, `TRUNCATE`, and `GROUP_CONCAT` as "not used." A full `src/` grep corrected this:
  - `INSERT IGNORE` and `TRUNCATE` — **genuinely absent → removed** from the translator.
  - `GROUP_CONCAT` — **actually used** (`symptoms.model.js:143`) with MySQL `ORDER BY … SEPARATOR` syntax that SQLite rejects → promoted from "defensive, no change" to a **required** translation.
  - `SET FOREIGN_KEY_CHECKS`→`PRAGMA` — kept (the brief names it). Net effect: the translator now contains **only** rules for constructs that are present, plus the one brief-mandated mapping.

## C. Summary

| Dimension | Rating | Note |
|---|---|---|
| Architecture plausibility | **Strong** | Centralized adapter is correct; interception point verified across all models. |
| SQL-parity completeness | **Strong** | Full audit; translator covers 100% of present constructs. |
| Edge-case coverage | **Needs 4 fixes** | Nested-txn guard (#1) is the only one that could cause a runtime crash; the rest are cosmetic/cleanup. |
| Minimalism | **Near-optimal** | 8 files, 0 modules; MySQL path untouched. Optionally trim 3 defensive regexes. |
| Risk of regression to existing MySQL mode | **Negligible** | That code path is not modified. |

**Bottom line:** the plan is implementable as written and the footprint is about as small as the constraints allow. Before coding, fold in the nested-transaction guard (#1), make `runMigrations({exitOnDone})` explicit (#3), and run `npm install better-sqlite3` first to confirm the prebuilt-binary assumption (Plan B: `node:sqlite`). The other items are one-liners or documentation.
