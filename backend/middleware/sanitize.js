// ==========================================
// SANITIZE MIDDLEWARE
// Strips prototype-pollution keys and trims
// string payloads before they reach
// controllers / database drivers.
// ==========================================

const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

const deepSanitize = (value) => {
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }

  if (value && typeof value === 'object') {
    const clean = {};

    Object.keys(value).forEach((key) => {
      if (FORBIDDEN_KEYS.includes(key)) {
        return;
      }
      clean[key] = deepSanitize(value[key]);
    });

    return clean;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

const sanitizePayload = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = deepSanitize(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = deepSanitize(req.params);
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Malformed request payload.',
    });
  }

  return next();
};

module.exports = { sanitizePayload, deepSanitize, FORBIDDEN_KEYS };