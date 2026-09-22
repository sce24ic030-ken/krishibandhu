// ==========================================
// RATE LIMITERS
// Basic DDoS / abuse protection on sensitive
// surfaces (auth, AI, general API).
// ==========================================

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many AI requests. Please slow down and try again.',
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

module.exports = { authLimiter, aiLimiter, apiLimiter };