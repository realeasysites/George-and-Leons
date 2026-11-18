const express = require('express');
const path = require('path');
const db = require('../db');
const { notifyNewInquiry } = require('../lib/mailer');

const router = express.Router();
const menu = require(path.join(__dirname, '..', 'data', 'menu.json'));

router.get('/api/menu', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(menu);
});

// Simple in-memory rate limit: 5 submissions per IP per 10 minutes.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v, max) => String(v ?? '').trim().slice(0, max);

router.post('/api/inquiries', async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot — bots fill this, people don't

  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: 'Easy, tiger. Too many submissions — give us a call at (207) 591-0280.' });
  }

  const data = {
    type: db.TYPES.includes(b.type) ? b.type : 'General question',
    name: clean(b.name, 100),
    phone: clean(b.phone, 40),
    email: clean(b.email, 120),
    event_date: clean(b.event_date, 40),
    headcount: clean(b.headcount, 40),
    message: clean(b.message, 2000),
    ip: req.ip,
  };

  const errors = [];
  if (!data.name) errors.push('Tell us your name.');
  if (!data.phone && !data.email) errors.push('Leave a phone number or email so we can get back to you.');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('That email looks off.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const id = db.createInquiry(data);
  notifyNewInquiry({ id, ...data });
  res.status(201).json({ ok: true, id });
});

module.exports = router;
