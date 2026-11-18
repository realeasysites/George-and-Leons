// Emails the owner when a new inquiry comes in. If SMTP isn't configured,
// the inquiry is still saved to the dashboard and we just log it.
const nodemailer = require('nodemailer');
const { smtp, notifyEmail } = require('./config');

let transporter = null;
if (smtp.host && smtp.user && smtp.pass) {
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

async function notifyNewInquiry(inq) {
  if (!transporter || !notifyEmail) {
    console.log(`[inquiry #${inq.id}] ${inq.type} from ${inq.name} (email notifications not configured)`);
    return;
  }
  const lines = [
    `Type: ${inq.type}`,
    `Name: ${inq.name}`,
    `Phone: ${inq.phone || '-'}`,
    `Email: ${inq.email || '-'}`,
    `Date needed: ${inq.event_date || '-'}`,
    `Sandwiches / headcount: ${inq.headcount || '-'}`,
    '',
    inq.message || '(no message)',
    '',
    'Manage it in the dashboard: /admin',
  ];
  try {
    await transporter.sendMail({
      from: smtp.from,
      to: notifyEmail,
      replyTo: inq.email || undefined,
      subject: `New ${inq.type} inquiry — ${inq.name}`,
      text: lines.join('\n'),
    });
  } catch (err) {
    console.error('Email notification failed:', err.message);
  }
}

module.exports = { notifyNewInquiry };
