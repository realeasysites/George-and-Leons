const crypto = require('crypto');

const adminPassword = process.env.ADMIN_PASSWORD || '';

module.exports = {
  port: Number(process.env.PORT) || 3000,
  adminPassword,
  // Sessions are signed with SESSION_SECRET; if unset, derive one from the password
  // so changing ADMIN_PASSWORD also signs everyone out.
  sessionSecret: process.env.SESSION_SECRET
    || crypto.createHash('sha256').update('gl-session:' + adminPassword).digest('hex'),
  sessionHours: 12,
  notifyEmail: process.env.NOTIFY_EMAIL || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
  dbPath: process.env.DB_PATH || require('path').join(__dirname, '..', 'db', 'george-and-leons.db'),
};
