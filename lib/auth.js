// Password-only admin auth with a signed, HttpOnly session cookie.
const crypto = require('crypto');
const config = require('./config');

const COOKIE = 'gl_admin';

function sign(value) {
  return crypto.createHmac('sha256', config.sessionSecret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function checkPassword(input) {
  if (!config.adminPassword) return false; // login disabled until ADMIN_PASSWORD is set
  return safeEqual(input || '', config.adminPassword);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function issueSession(req, res) {
  const expires = Date.now() + config.sessionHours * 3600 * 1000;
  const payload = `admin.${expires}`;
  const token = `${payload}.${sign(payload)}`;
  res.setHeader('Set-Cookie', [
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${config.sessionHours * 3600}${req.secure ? '; Secure' : ''}`,
  ]);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

function isAuthed(req) {
  if (!config.adminPassword) return false;
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(parts[2], sign(payload))) return false;
  return Number(parts[1]) > Date.now();
}

function requireApiAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'Not signed in' });
}

module.exports = { checkPassword, issueSession, clearSession, isAuthed, requireApiAuth };
