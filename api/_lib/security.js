import { createHmac, createHash, timingSafeEqual, scryptSync, randomUUID } from 'node:crypto';

const SESSION_DURATION = 8 * 60 * 60;
const MAX_BODY_SIZE = 2048;
const attempts = new Map(); // Protección local adicional; usar WAF global en producción.
const enc = (data) => Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)).toString('base64url');
const COOKIE = 'rall_session';

export function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(payload));
}

export function requirePostOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === String(host).toLowerCase(); }
  catch { return false; }
}

export function parseBody(req) {
  const input = req.body;
  if (input === undefined || input === null) return {};
  if (typeof input === 'string') {
    if (input.length > MAX_BODY_SIZE) throw new Error('BODY_TOO_LARGE');
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_BODY');
    return parsed;
  }
  if (typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input).length > MAX_BODY_SIZE) throw new Error('INVALID_BODY');
  return input;
}

export function secureCompare(a, b) {
  const h1 = createHash('sha256').update(String(a)).digest();
  const h2 = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(h1, h2);
}

export function verifyPassword(password) {
  const raw = process.env.ADMIN_PASSWORD_HASH || '';
  const match = raw.match(/^scrypt\$32768\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/);
  if (!match || typeof password !== 'string' || password.length > 256) return false;
  const salt = Buffer.from(match[1], 'base64url');
  const target = Buffer.from(match[2], 'base64url');
  if (salt.length < 16 || target.length !== 64) return false;
  const candidate = scryptSync(password, salt, target.length, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(candidate, target);
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
}

function sessionSignature(payload) {
  return createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
}

function cookieValue(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  const pair = cookies.find(c => c.trim().startsWith(COOKIE + '='));
  return pair ? pair.trim().slice(COOKIE.length + 1) : '';
}

export function isAdmin(req) {
  if (!adminConfigured()) return false;
  const [payload, signature, extra] = cookieValue(req).split('.');
  if (!payload || !signature || extra || !secureCompare(signature, sessionSignature(payload))) return false;
  try {
    const item = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return item.role === 'admin' && item.version === 1 && item.exp > Math.floor(Date.now() / 1000) && item.exp < Math.floor(Date.now() / 1000) + SESSION_DURATION + 60;
  } catch { return false; }
}

export function setSession(req, res) {
  const payload = enc({ role: 'admin', version: 1, exp: Math.floor(Date.now() / 1000) + SESSION_DURATION, nonce: randomUUID() });
  const secure = String(req.headers['x-forwarded-proto'] || '').includes('https') || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${sessionSignature(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION}${secure ? '; Secure' : ''}`);
}

export function clearSession(req, res) {
  const secure = String(req.headers['x-forwarded-proto'] || '').includes('https') || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`);
}

export function registerFailedAttempt(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].slice(0, 100);
  const now = Date.now();
  const entry = attempts.get(ip) || { start: now, count: 0 };
  if (now - entry.start > 10 * 60 * 1000) { entry.start = now; entry.count = 0; }
  entry.count++;
  attempts.set(ip, entry);
  if (attempts.size > 5000) attempts.clear();
  return entry.count >= 7;
}

export function isRateLimited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].slice(0, 100);
  const entry = attempts.get(ip);
  return Boolean(entry && entry.count >= 7 && Date.now() - entry.start < 10 * 60 * 1000);
}

export function resetAttempts(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].slice(0, 100);
  attempts.delete(ip);
}

export function createLivekitToken(subject, name, grants, ttlSeconds = 3600) {
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!key || !secret) throw new Error('LIVEKIT_NOT_CONFIGURED');
  const now = Math.floor(Date.now() / 1000);
  const header = enc({ alg: 'HS256', typ: 'JWT' });
  const body = enc({ iss: key, sub: subject, name, iat: now, nbf: now - 10, exp: now + ttlSeconds, jti: randomUUID(), video: grants });
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}
