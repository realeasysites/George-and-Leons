const express = require('express');
const path = require('path');
const db = require('../db');
const auth = require('../lib/auth');
const config = require('../lib/config');

const router = express.Router();
const ADMIN_DIR = path.join(__dirname, '..', 'public', 'admin');

// Login attempt throttle: 10 tries per IP per 15 minutes.
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  attempts.set(ip, list);
  return list.length >= 10;
}

router.get(['/admin', '/admin/', '/admin/index.html'], (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!auth.isAuthed(req)) return res.sendFile(path.join(ADMIN_DIR, 'login.html'));
  res.sendFile(path.join(ADMIN_DIR, 'dashboard.html'));
});

// The admin folder's HTML is only ever served through the route above.
router.get(/^\/admin\/.*\.html$/, (req, res) => res.redirect('/admin'));

router.post('/admin/login', (req, res) => {
  if (!config.adminPassword) {
    return res.status(503).json({ error: 'Login is disabled until ADMIN_PASSWORD is set on the server.' });
  }
  if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  if (!auth.checkPassword((req.body || {}).password)) {
    attempts.get(req.ip).push(Date.now());
    return res.status(401).json({ error: 'Wrong password.' });
  }
  attempts.delete(req.ip);
  auth.issueSession(req, res);
  res.json({ ok: true });
});

router.post('/admin/logout', (req, res) => {
  auth.clearSession(res);
  res.json({ ok: true });
});

router.get('/api/admin/inquiries', auth.requireApiAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ inquiries: db.listInquiries(), statuses: db.STATUSES });
});

router.patch('/api/admin/inquiries/:id', auth.requireApiAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status, notes } = req.body || {};
  if (status !== undefined && !db.STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });
  const changed = db.updateInquiry(id, {
    status,
    notes: notes === undefined ? undefined : String(notes).slice(0, 2000),
  });
  if (!changed) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true, inquiry: db.getInquiry(id) });
});

router.delete('/api/admin/inquiries/:id', auth.requireApiAuth, (req, res) => {
  const changed = db.deleteInquiry(Number(req.params.id));
  if (!changed) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
