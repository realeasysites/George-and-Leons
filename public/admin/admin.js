(() => {
  'use strict';
  const LABELS = { new: 'New', contacted: 'Contacted', booked: 'Booked', done: 'Done', lost: 'Lost' };
  const state = { items: [], statuses: Object.keys(LABELS), filter: 'all', q: '' };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(url, opts = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (res.status === 401) { location.href = '/admin'; throw new Error('signed out'); }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || 'Request failed');
    return j;
  }

  async function load() {
    const j = await api('/api/admin/inquiries');
    state.items = j.inquiries; state.statuses = j.statuses;
    render();
  }

  function fmtDate(s) {
    const d = new Date(s.replace(' ', 'T') + 'Z');
    return isNaN(d) ? s : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function render() {
    const counts = { all: state.items.length };
    state.statuses.forEach((s) => { counts[s] = state.items.filter((i) => i.status === s).length; });

    $('#stats').innerHTML = [
      ['Total leads', counts.all], ['New', counts.new || 0], ['Booked', counts.booked || 0],
      ['This week', state.items.filter((i) => Date.now() - new Date(i.created_at.replace(' ', 'T') + 'Z') < 7 * 864e5).length],
    ].map(([l, n]) => `<div class="stat"><span>${n}</span><small>${l}</small></div>`).join('');

    $('#filters').innerHTML = ['all', ...state.statuses].map((s) =>
      `<button type="button" data-f="${s}" class="${state.filter === s ? 'on' : ''}">${s === 'all' ? 'All' : LABELS[s]} <b>${counts[s] || 0}</b></button>`).join('');

    const q = state.q.toLowerCase();
    const rows = state.items.filter((i) => (state.filter === 'all' || i.status === state.filter) &&
      (!q || [i.name, i.phone, i.email, i.message, i.type, i.notes].join(' ').toLowerCase().includes(q)));

    if (!rows.length) {
      $('#list').innerHTML = `<p class="empty">${state.items.length ? 'Nothing matches that filter.' : 'No leads yet. When someone sends a big-order or event request from the website, it lands here.'}</p>`;
      return;
    }

    $('#list').innerHTML = rows.map((i) => `
      <article class="card s-${esc(i.status)}" data-id="${i.id}">
        <div class="card-head">
          <div>
            <span class="type">${esc(i.type)}</span>
            <h2>${esc(i.name)}</h2>
            <time>${esc(fmtDate(i.created_at))}</time>
          </div>
          <select class="status" aria-label="Status for ${esc(i.name)}">
            ${state.statuses.map((s) => `<option value="${s}" ${s === i.status ? 'selected' : ''}>${LABELS[s] || s}</option>`).join('')}
          </select>
        </div>
        <dl>
          ${i.phone ? `<div><dt>Phone</dt><dd><a href="tel:${esc(i.phone.replace(/[^\d+]/g, ''))}">${esc(i.phone)}</a> · <a href="sms:${esc(i.phone.replace(/[^\d+]/g, ''))}">Text</a></dd></div>` : ''}
          ${i.email ? `<div><dt>Email</dt><dd><a href="mailto:${esc(i.email)}">${esc(i.email)}</a></dd></div>` : ''}
          ${i.event_date ? `<div><dt>Date needed</dt><dd>${esc(i.event_date)}</dd></div>` : ''}
          ${i.headcount ? `<div><dt>Sandwiches / people</dt><dd>${esc(i.headcount)}</dd></div>` : ''}
        </dl>
        ${i.message ? `<p class="message">${esc(i.message)}</p>` : ''}
        <label class="notes"><span>Notes</span><textarea rows="2" placeholder="Private notes…">${esc(i.notes)}</textarea></label>
        <div class="card-foot">
          <span class="saved" aria-live="polite"></span>
          <button type="button" class="del">Delete</button>
        </div>
      </article>`).join('');
  }

  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    state.filter = b.dataset.f; render();
  });
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; render(); });

  $('#list').addEventListener('change', async (e) => {
    const card = e.target.closest('.card'); if (!card) return;
    const id = card.dataset.id;
    const body = e.target.classList.contains('status') ? { status: e.target.value }
      : e.target.tagName === 'TEXTAREA' ? { notes: e.target.value } : null;
    if (!body) return;
    try {
      const j = await api(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      const idx = state.items.findIndex((x) => String(x.id) === id);
      state.items[idx] = j.inquiry;
      if (body.status) render();
      else { const s = card.querySelector('.saved'); s.textContent = 'Saved'; setTimeout(() => { s.textContent = ''; }, 1500); }
    } catch (err) { alert(err.message); }
  });

  $('#list').addEventListener('click', async (e) => {
    if (!e.target.classList.contains('del')) return;
    const card = e.target.closest('.card');
    const name = card.querySelector('h2').textContent;
    if (!confirm(`Delete the lead from ${name}? This can't be undone.`)) return;
    try {
      await api(`/api/admin/inquiries/${card.dataset.id}`, { method: 'DELETE' });
      state.items = state.items.filter((x) => String(x.id) !== card.dataset.id);
      render();
    } catch (err) { alert(err.message); }
  });

  $('#logout').addEventListener('click', async () => {
    await fetch('/admin/logout', { method: 'POST' });
    location.href = '/admin';
  });

  load().catch((err) => { if (err.message !== 'signed out') $('#list').innerHTML = `<p class="empty">Couldn't load leads: ${esc(err.message)}</p>`; });
})();
