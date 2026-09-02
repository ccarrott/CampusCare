// src/config/security.js
// Security headers middleware.

/**
 * Sets standard security headers on every response.
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions-Policy: allow this origin (self) and delegate camera/microphone to the
  // Daily.co iframe origin so video consultations can capture media. geolocation=(self)
  // is required by the Tier 3 hospital locator. An empty allowlist "()" would block these
  // for the page AND all iframes, which prevents the video call from ever getting devices.
  res.setHeader(
    'Permissions-Policy',
    'camera=(self "https://campuscare.daily.co"), microphone=(self "https://campuscare.daily.co"), geolocation=(self)'
  );
  next();
}
