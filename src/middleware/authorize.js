// src/middleware/authorize.js
// Role-based access control — accepts one or more allowed roles.

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('error', {
        user: req.session.user,
        statusCode: 403,
        message: 'You do not have permission to access this resource.'
      });
    }
    next();
  };
}
