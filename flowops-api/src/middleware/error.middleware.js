/**
 * Global error-handling middleware for Express.
 * Must be registered AFTER all routes: app.use(errorHandler)
 */
const logger = require("../utils/logger");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;

  // Log the error
  if (isServerError) {
    logger.error({ err, req: { method: req.method, url: req.originalUrl } }, "Unhandled server error");
  } else {
    logger.warn({ err: { message: err.message }, req: { method: req.method, url: req.originalUrl } }, "Client error");
  }

  // In production, hide internal error details from the client
  const message =
    isServerError && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

/**
 * Catch async errors in route handlers automatically.
 * Wraps an async function so thrown errors are forwarded to Express error handler.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };
