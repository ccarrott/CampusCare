// src/config/environment.js
// Validates required environment variables on boot. Fails fast with a clear message.

const REQUIRED_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT', 'APP_PORT', 'SESSION_SEED'];

export function validateEnv() {
  const missing = REQUIRED_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
