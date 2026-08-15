// src/middleware/authenticate.js
// Ensures the user is logged in before proceeding.

export function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/auth/login');
}
