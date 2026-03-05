/**
 * Feature #20: Rate Limiting & Abuse Protection
 * Configurable rate limiting middleware for all API routes
 */

// Simple in-memory rate limiter (no extra dependencies)
const rateLimitStore = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > entry.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 min)
 * @param {number} options.max - Max requests per window (default: 100)
 * @param {string} options.message - Error message
 * @param {Function} options.keyGenerator - Function to generate a unique key per client
 */
function rateLimit({
  windowMs = 60 * 1000,
  max = 100,
  message = "Too many requests, please try again later.",
  keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"] || "unknown",
} = {}) {
  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { windowStart: now, count: 1, windowMs };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);

    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(remaining));
    res.set("X-RateLimit-Reset", String(resetTime));

    if (entry.count > max) {
      res.set("Retry-After", String(resetTime));
      return res.status(429).json({
        error: message,
        retryAfter: resetTime,
      });
    }

    next();
  };
}

// Pre-configured limiters for different route types
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: "Too many auth attempts" });
const meAuthLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: "Too many requests" });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: "AI review rate limit reached" });
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

module.exports = { rateLimit, apiLimiter, authLimiter, meAuthLimiter, aiLimiter, webhookLimiter, publicLimiter };
