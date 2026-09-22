// ==========================================
// CRYPTO SERVICE
// SHA-256 hashing, canonical serialization,
// HMAC-signed QR tokens for traceability.
// ==========================================

const crypto = require('crypto');

const QR_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// -------------------------------------------------
// Hashing
// -------------------------------------------------

const sha256 = (value) =>
  crypto
    .createHash('sha256')
    .update(String(value))
    .digest('hex');

// Deep-sorted canonical JSON serialization so
// two objects with the same content hash identically.
const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map(canonicalize));
  }

  const sorted = {};

  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = canonicalize(obj[key]);
    });

  return JSON.stringify(sorted);
};

const hmac = (value) =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'krishibandhu-dev-secret')
    .update(String(value))
    .digest('hex');

// -------------------------------------------------
// QR tokens  —  format: kbq.v1.<payloadB64>.<sig>
// -------------------------------------------------

const issueQrToken = ({ type, id }) => {
  const payload = {
    t: type,
    i: String(id),
    n: crypto.randomBytes(8).toString('hex'),
    a: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = hmac(payloadB64);

  return `kbq.v1.${payloadB64}.${sig}`;
};

const verifyQrToken = (token) => {
  if (typeof token !== 'string') {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const parts = token.split('.');

  if (parts.length !== 4 || parts[0] !== 'kbq' || parts[1] !== 'v1') {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const [, , payloadB64, sig] = parts;

  const expected = hmac(payloadB64);

  if (sig !== expected) {
    return { valid: false, reason: 'BAD_SIGNATURE' };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    );

    if (!payload.t || !payload.i) {
      return { valid: false, reason: 'BAD_PAYLOAD' };
    }

    if (Date.now() - payload.a > QR_TTL_MS) {
      return { valid: false, reason: 'EXPIRED' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'BAD_PAYLOAD' };
  }
};

module.exports = {
  sha256,
  canonicalize,
  hmac,
  issueQrToken,
  verifyQrToken,
  QR_TTL_MS,
};