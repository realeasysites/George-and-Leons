// George + Leon's Famous Roast Beef — thin entry point.
const path = require('path');
const express = require('express');
const config = require('./lib/config');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Admin first, so /admin always asks for the password before any static file is served.
app.use(adminRoutes);
app.use(publicRoutes);

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  maxAge: '7d',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.set('Cache-Control', 'no-cache');
  },
}));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(config.port, () => {
  console.log(`George + Leon's running on http://localhost:${config.port}`);
  if (!config.adminPassword) console.warn('ADMIN_PASSWORD is not set — admin login is disabled until it is.');
});
