const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { dbPath } = require('../lib/config');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    event_date  TEXT,
    headcount   TEXT,
    message     TEXT,
    status      TEXT NOT NULL DEFAULT 'new',
    notes       TEXT DEFAULT '',
    ip          TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
`);

const STATUSES = ['new', 'contacted', 'booked', 'done', 'lost'];
const TYPES = ['Big order (6+ sandwiches)', 'Catering', 'Private event / party', 'General question'];

const stmts = {
  insert: db.prepare(`INSERT INTO inquiries (type, name, phone, email, event_date, headcount, message, ip)
                      VALUES (@type, @name, @phone, @email, @event_date, @headcount, @message, @ip)`),
  list: db.prepare('SELECT * FROM inquiries ORDER BY datetime(created_at) DESC, id DESC'),
  get: db.prepare('SELECT * FROM inquiries WHERE id = ?'),
  update: db.prepare('UPDATE inquiries SET status = COALESCE(@status, status), notes = COALESCE(@notes, notes) WHERE id = @id'),
  remove: db.prepare('DELETE FROM inquiries WHERE id = ?'),
};

module.exports = {
  STATUSES,
  TYPES,
  createInquiry: (data) => stmts.insert.run(data).lastInsertRowid,
  listInquiries: () => stmts.list.all(),
  getInquiry: (id) => stmts.get.get(id),
  updateInquiry: (id, { status, notes }) => stmts.update.run({ id, status: status ?? null, notes: notes ?? null }).changes,
  deleteInquiry: (id) => stmts.remove.run(id).changes,
};
