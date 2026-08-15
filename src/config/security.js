// src/config/security.js
// Security headers and CSRF configuration.

import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';

/**
 * Sets standard security headers on every response.
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

/**
 * Configures CSRF double-submit cookie protection.
 */
export function csrfSetup() {
  const { doubleCsrfProtection, generateToken } = doubleCsrf({
    getSecret: () => process.env.SESSION_SEED,
    cookieName: '__csrf',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    },
    getTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token']
  });
  return { doubleCsrfProtection, generateToken };
}

export { cookieParser };
