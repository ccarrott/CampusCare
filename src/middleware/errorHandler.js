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
  if (statusCode >= 500) console.error(err.stack);

  // API/XHR requests must get JSON, never the HTML error page — otherwise the
  // client's resp.json() throws and the real cause is lost. Detect by the /api/
  // path or an XHR/fetch Accept header. In development, include the real error
  // message so the failure is diagnosable without server-terminal access.
  const wantsJson = req.path.includes('/api/')
    || req.xhr
    || (req.accepts('json') && !req.accepts('html'));
  if (wantsJson) {
    const payload = { error: message };
    if (process.env.NODE_ENV !== 'production') payload.detail = err.message;
    return res.status(statusCode).json(payload);
  }

  res.status(statusCode).render('error', {
    user: req.session?.user || null,
    statusCode,
    message
  });
}
