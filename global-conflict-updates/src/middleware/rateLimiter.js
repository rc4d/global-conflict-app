const rateLimit = require('express-rate-limit');

/**
 * Simple IP-based window limiter for public read endpoints (MVP-friendly).
 */
const updatesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_PER_MINUTE) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

module.exports = { updatesLimiter };
