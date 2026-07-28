// Middleware to ensure a user is logged in
export function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next(); // User is logged in, proceed to the requested page
  }
  // User is not logged in, redirect to login screen
  res.redirect('/auth/login');
}

// Middleware to restrict access strictly to students
export function requireStudent(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'student') {
    return next();
  }
  res.status(403).send('Access Denied: Student account required.');
}

// Middleware to restrict access strictly to nurses
export function requireNurse(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'nurse') {
    return next();
  }
  res.status(403).send('Access Denied: Nurse account required.');
}