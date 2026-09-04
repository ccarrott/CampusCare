// src/config/security.js
// Security headers middleware.

/**
 * The Daily.co subdomain the video consultations run on. Camera/microphone are
 * delegated to this exact origin by Permissions-Policy, so it must match the
 * DAILY_DOMAIN the server mints rooms on — a mismatch silently blocks media
 * capture inside the call iframe. Falls back to the project's own subdomain.
 */
function dailyOrigin() {
  const raw = (process.env.DAILY_DOMAIN || 'campuscare').trim();
  // Accept either "campuscare" or a full "campuscare.daily.co" / URL form.
  const host = raw
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  return host.includes('.') ? `https://${host}` : `https://${host}.daily.co`;
}

const DAILY_ORIGIN = dailyOrigin();

// Content-Security-Policy.
//
// 'unsafe-inline' is required for scripts and styles: the EJS views carry inline
// <script> blocks and inline style attributes throughout, so a nonce-based policy
// would mean rewriting every view. The policy still meaningfully narrows the attack
// surface — it pins which external origins may serve code, tiles, fonts and frames,
// and blocks object/base-uri/framing outright.
const CSP = [
  "default-src 'self'",
  // Chart.js (jsdelivr) and Leaflet / the Daily SDK fallback (unpkg) are loaded from
  // CDNs by a few views. See README "Third-party client libraries".
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Map tiles (MapTiler + the CARTO/OSM fallback) and MapLibre's blob-backed canvases.
  "img-src 'self' data: blob: https://api.maptiler.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com",
  `connect-src 'self' https://api.maptiler.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://*.daily.co wss://*.daily.co`,
  // MapLibre GL spawns its workers from a blob URL.
  "worker-src 'self' blob:",
  "media-src 'self' blob: https://*.daily.co",
  // The video consultation renders inside a Daily.co iframe.
  `frame-src 'self' ${DAILY_ORIGIN} https://*.daily.co`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

/**
 * Sets standard security headers on every response.
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', CSP);
  // Permissions-Policy: allow this origin (self) and delegate camera/microphone to the
  // Daily.co iframe origin so video consultations can capture media. geolocation=(self)
  // is required by the Tier 3 hospital locator. An empty allowlist "()" would block these
  // for the page AND all iframes, which prevents the video call from ever getting devices.
  res.setHeader(
    'Permissions-Policy',
    `camera=(self "${DAILY_ORIGIN}"), microphone=(self "${DAILY_ORIGIN}"), geolocation=(self)`
  );
  next();
}
