// src/middleware/errorHandler.js
// Global error handler — catches unhandled errors from catchAsync and renders a clean response.

export function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : 'Something went wrong. Please try again.';

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${statusCode}: ${err.message}`
  );

  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(statusCode).json({ error: message });
  }

  res.status(statusCode).render('error', {
    user: req.session?.user || null,
    statusCode,
    message
  });
}
