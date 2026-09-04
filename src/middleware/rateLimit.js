// src/middleware/rateLimit.js
// Dependency-free, in-memory rate limiter for the credential endpoints.
//
// Scope: brute-force slowdown on a single app instance (which is what the free
// Render/Railway tier runs). It is deliberately small — no external store, no new
// npm dependency. If the app is ever scaled to multiple instances, swap this for a
// shared-store limiter (e.g. express-rate-limit + Redis); until then this closes the
// "unlimited password guesses" hole that an internet-facing login otherwise has.

/**
 * @param {object} opts
 *   windowMs  – size of the sliding window
 *   max       – attempts allowed per key per window
 *   keyFn     – derives the bucket key from the request (defaults to client IP)
 *   onLimit   – (req, res) => void — how to respond when the limit is hit
 */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, keyFn, onLimit } = {}) {
  const hits = new Map(); // key → { count, resetAt }

  // Periodic sweep so the map can't grow unbounded on a long-running process.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  const defaultKey = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

  return (req, res, next) => {
    const key = (keyFn || defaultKey)(req);
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      if (onLimit) return onLimit(req, res, retryAfter);
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }
    next();
  };
}

/**
 * Login/reset throttle: renders the given auth view with a friendly message instead
 * of a bare 429 JSON body, so the user sees the app rather than an API error.
 */
export function authRateLimit(view, { windowMs = 15 * 60 * 1000, max = 10 } = {}) {
  return rateLimit({
    windowMs,
    max,
    onLimit: (req, res, retryAfter) => {
      const minutes = Math.max(1, Math.ceil(retryAfter / 60));
      res.status(429).render(view, {
        error: `Too many attempts. Please wait about ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`,
        success: null,
        token: req.params?.token || null
      });
    }
  });
}
