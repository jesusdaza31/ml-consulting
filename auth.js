/* =============================================
   ML CONSULTING — auth.js
   Helpers de autenticación: hash scrypt con sal,
   tokens de sesión firmados con HMAC, rate limiting.
============================================= */

const crypto = require('crypto');

const SESSION_COOKIE = 'ml_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

/* ---------- Passwords (scrypt nativo, sal por usuario) ---------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const test = crypto.scryptSync(password, parts[0], 64).toString('hex');
  const a = Buffer.from(parts[1], 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- Sesión: token firmado con HMAC-SHA256 ---------- */

function createSessionToken(secret, userId) {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = exp + '.' + userId;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return exp + '.' + userId + '.' + sig;
}

function verifySessionToken(secret, token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [exp, sub, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(exp + '.' + sub).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return sub;
}

/* ---------- Rate limiting (contador en memoria por IP) ---------- */

function rateLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  return function limit(req, res, next) {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.resetAt < now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Demasiados intentos. Inténtalo más tarde.' });
    }
    next();
  };
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  rateLimiter
};
