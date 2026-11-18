# George + Leon's Famous Roast Beef — website

North Shore roast beef in Westbrook, ME (9 Cumberland St). Home of George's North Shore.
Built by Real Easy Sites.

## What's in here

- **Public site** (`public/index.html`) — hero with live open/closed badge (Maine time), the Three Way explainer, tabbed menu, happy hour, press quotes, story, big-order/catering/event form, Instagram, hours + map. Mobile sticky bar for Call / Order / Directions.
- **Menu** lives in `data/menu.json` (served at `/api/menu`). Edit that one file to change items or prices.
- **Leads** — the Big Orders form saves to SQLite and (optionally) emails the owner.
- **Admin dashboard** at `/admin` — password-only login, status tracking (New → Contacted → Booked → Done / Lost), private notes, search, and a Delete button on every lead.

```
server.js        thin entry point
routes/          public.js (menu + inquiries), admin.js (login + lead API)
lib/             config, auth (signed cookie), mailer
db/              SQLite schema + queries
data/menu.json   the menu
public/          site, images, admin UI
```

## Run locally

Node 20.x (`.node-version`).

```bash
npm install
ADMIN_PASSWORD=pick-something npm start
# http://localhost:3000  and  http://localhost:3000/admin
```

## Environment variables

| Var | Required | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | yes | Dashboard password. Login is disabled until it's set. |
| `SESSION_SECRET` | recommended | Signs the admin session cookie. |
| `NOTIFY_EMAIL` | optional | Where new-lead emails go. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | optional | Outgoing mail (e.g. Gmail app password: smtp.gmail.com, 587). Without these, leads still save to the dashboard. |
| `DB_PATH` | optional | SQLite file location. On Render, point it at a persistent disk (see `render.yaml`). |

## Deploy (Render)

`render.yaml` sets up a Node web service with a 1 GB persistent disk for the database. Set `ADMIN_PASSWORD`, `NOTIFY_EMAIL` and SMTP values in the Render dashboard, then point the client's domain at the service.
