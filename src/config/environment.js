// src/config/environment.js
// Validates required environment variables on boot. Fails fast with a clear message.

import { USE_LOCAL_DB, LOCAL_DB_PATH } from './database.js';

// In LOCAL SQLite mode none of the DB_* MySQL vars are needed — the whole point is
// zero network dependency on Aiven. SESSION_SEED is always required (session signing).
// APP_PORT is optional in production (hosts inject PORT). DAILY_API_KEY is only
// needed for video consultations — warn but don't hard-fail if missing.
// SMTP_* / EMAIL_FROM are OPTIONAL too: without them booking still works and the
// confirmation/reminder emails simply no-op (see utils/mailer.js). Not required here.
const MYSQL_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];

export function validateEnv() {
  const required = USE_LOCAL_DB ? ['SESSION_SEED'] : [...MYSQL_VARS, 'SESSION_SEED'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (USE_LOCAL_DB && !process.env.LOCAL_DB_PATH) {
    console.warn(`[Env] USE_LOCAL_DB active but LOCAL_DB_PATH unset — defaulting to ${LOCAL_DB_PATH}.`);
  }
  if (!process.env.NODE_ENV) {
    console.warn('[Env] NODE_ENV not set. Defaulting to development (session cookies will not use Secure flag).');
  }
}
