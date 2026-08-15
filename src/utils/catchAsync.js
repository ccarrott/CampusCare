// src/utils/catchAsync.js
// Wraps async route handlers — forwards rejected promises to Express error handler.

export function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
