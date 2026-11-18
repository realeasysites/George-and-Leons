(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Year
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // Mobile nav
  var toggle = $('.menu-toggle'), nav = $('#nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Open / closed badge (Westbrook time). Hours: Tue–Sat 11:00–20:00.
  function maineNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[o.weekday], mins: (Number(o.hour) % 24) * 60 + Number(o.minute) };
    } catch (e) { var d = new Date(); return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() }; }
  }
  var OPEN = 11 * 60, CLOSE = 20 * 60;
  var isOpenDay = function (d) { return d >= 2 && d <= 6; };
  function nextOpenLabel(day, mins) {
    var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (isOpenDay(day) && mins < OPEN) return 'Opens today at 11am';
    for (var i = 1; i <= 7; i++) {
      var d = (day + i) % 7;
      if (isOpenDay(d)) return 'Opens ' + (i === 1 ? 'tomorrow' : names[d]) + ' at 11am';
    }
    return 'Tue–Sat · 11am–8pm';
  }
  var badge = $('#openBadge');
  var now = maineNow();
  if (badge) {
    var open = isOpenDay(now.day) && now.mins >= OPEN && now.mins < CLOSE;
    badge.classList.add(open ? 'is-open' : 'is-closed');
    var hh = now.mins >= 15 * 60 && now.mins < 17 * 60;
    $('.txt', badge).textContent = open ? (hh ? 'Open now · Happy hour til 5' : 'Open now · til 8pm') : 'Closed now · ' + nextOpenLabel(now.day, now.mins);
  }
  var todayRow = document.querySelector('#hoursTable tr[data-day="' + now.day + '"]');
  if (todayRow) todayRow.classList.add('today');

  // Menu (from /api/menu)
  var tabs = $('#menuTabs'), panels = $('#menuPanels');
  function price(p) { return p ? '<span class="dots"></span><span class="price">' + esc(p) + '</span>' : ''; }
  function itemHTML(it) {
    var chips = (it.tag ? '<span class="chip">' + esc(it.tag) + '</span>' : '') + (it.veg ? '<span class="chip veg">Veg</span>' : '');
    return '<div class="menu-item"><div class="menu-item-top"><h4>' + esc(it.name) + chips + '</h4>' + price(it.price) + '</div>' +
      (it.desc ? '<p>' + esc(it.desc) + '</p>' : '') + '</div>';
  }
  function renderMenu(menu) {
    if (menu.note) $('#menuNote').textContent = menu.note;
    tabs.innerHTML = ''; panels.innerHTML = '';
    menu.sections.forEach(function (sec, i) {
      var b = document.createElement('button');
      b.className = 'menu-tab'; b.type = 'button'; b.id = 'tab-' + sec.id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'panel-' + sec.id);
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false'); b.tabIndex = i === 0 ? 0 : -1;
      b.textContent = sec.title;
      tabs.appendChild(b);

      var p = document.createElement('div');
      p.className = 'menu-panel' + (i === 0 ? ' active' : ''); p.id = 'panel-' + sec.id;
      p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', b.id);
      var body = '<p class="tagline">' + esc(sec.tagline || '') + '</p>';
      if (sec.groups) {
        body += '<div class="menu-groups">' + sec.groups.map(function (g) {
          return '<div><h4 class="group-title">' + esc(g.title) + '</h4>' + g.items.map(itemHTML).join('') + '</div>';
        }).join('') + '</div>';
      } else {
        body += '<div class="menu-list">' + sec.items.map(itemHTML).join('') + '</div>';
      }
      p.innerHTML = body;
      panels.appendChild(p);
    });
  }
  function select(btn) {
    tabs.querySelectorAll('.menu-tab').forEach(function (t) {
      var on = t === btn;
      t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).classList.toggle('active', on);
    });
  }
  if (tabs && panels) {
    tabs.addEventListener('click', function (e) { var b = e.target.closest('.menu-tab'); if (b) select(b); });
    tabs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var all = Array.prototype.slice.call(tabs.querySelectorAll('.menu-tab'));
      var i = all.indexOf(document.activeElement); if (i < 0) return;
      var n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      n.focus(); select(n);
    });
    fetch('/api/menu').then(function (r) { return r.json(); }).then(renderMenu).catch(function () {
      panels.innerHTML = '<p class="center">See today\'s full menu on <a href="https://george-leons-westbrook.cloveronline.com/" target="_blank" rel="noopener">our online ordering page</a>.</p>';
    });
  }

  // Lead form
  var form = $('#leadForm'), msg = $('#formMsg');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'form-msg'; msg.textContent = '';
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (!data.name.trim()) { msg.className = 'form-msg err'; msg.textContent = 'Tell us your name.'; return; }
      if (!data.phone.trim() && !data.email.trim()) { msg.className = 'form-msg err'; msg.textContent = 'Leave a phone number or email so we can get back to you.'; return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j.error || 'Something went wrong.');
          form.reset();
          msg.className = 'form-msg ok';
          msg.textContent = 'Got it! We\'ll be in touch soon. Hungry now? Call (207) 591-0280.';
        })
        .catch(function (err) {
          msg.className = 'form-msg err';
          msg.textContent = err.message + ' You can always call (207) 591-0280.';
        })
        .finally(function () { btn.disabled = false; btn.textContent = 'Send It'; });
    });
  }

  // Reveal on scroll
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }
})();
