'use strict';

const KEY = 'pickleball-tracker-v1';
const main = document.getElementById('main');

// ---------- helpers ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round((+n || 0) * 100) / 100;
const num = v => { const n = parseFloat(v); return isFinite(n) ? r2(n) : 0; };
const rm = n => (r2(n) < 0 ? '-' : '') + 'RM' + Math.abs(r2(n)).toFixed(2);
const fmtDate = (d, opts) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', opts || { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = d => fmtDate(d, { day: 'numeric', month: 'short' });
const today = () => { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); };

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- storage ----------
function seed() {
  const names = ['Chris', 'Liz', 'Dean', 'Makoto', 'Hitomi', 'Toshi', 'Chia Yi', 'Jk', 'Adel', 'Hafiz', 'Ser Lyn', 'Soo', 'JH', 'Mira', 'Megat', 'JJ'];
  const players = names.map(name => ({ id: uid(), name }));
  const everyone = paid => players.map(p => ({ playerId: p.id, paid }));
  const s = (date, courtCost, expenses, attendees) => ({ id: uid(), date, fee: 20, courtCost, courts: null, expenses, attendees });
  return {
    players,
    sessions: [
      s('2026-09-05', 202.5, [{ id: uid(), name: 'Expenditure', amount: 110 }], everyone(true)),
      s('2026-09-12', 202.5, [{ id: uid(), name: 'Expenditure', amount: 23 }], everyone(true)),
      s('2026-09-16', 75, [], []),
      s('2026-09-19', 75, [], []),
    ],
    lastBackup: null,
  };
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.sessions) && Array.isArray(d.players)) return d;
  } catch {}
  const d = seed();
  localStorage.setItem(KEY, JSON.stringify(d));
  return d;
}

let db = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('Could not save: ' + e.message); }
}
function commit() { save(); render(); }

// ---------- data queries ----------
const player = id => db.players.find(p => p.id === id);
const pname = id => player(id)?.name ?? '(deleted)';
const session = id => db.sessions.find(s => s.id === id);
const sorted = () => [...db.sessions].sort((a, b) => b.date.localeCompare(a.date));
// Payment is only "due" on the play date itself or after.
const isDue = s => s.date <= today();

function calc(s) {
  const paid = s.attendees.filter(a => a.paid).length;
  const unpaid = isDue(s) ? s.attendees.length - paid : 0;
  const revenue = r2(paid * s.fee);
  const expenses = r2(s.expenses.reduce((t, e) => t + e.amount, 0));
  return {
    paid, unpaid, revenue, expenses,
    pl: r2(revenue - s.courtCost - expenses),
    outstanding: r2(unpaid * s.fee),
    perCourt: s.courts ? r2(s.courtCost / s.courts) : null,
  };
}
const bank = () => r2(db.sessions.reduce((t, s) => t + calc(s).pl, 0));

function playCounts() {
  const m = {};
  db.sessions.forEach(s => s.attendees.forEach(a => { m[a.playerId] = (m[a.playerId] || 0) + 1; }));
  return m;
}

// Unpaid grouped by player: [{ id, total, items: [session] }]
function owed() {
  const m = new Map();
  sorted().reverse().filter(isDue).forEach(s => s.attendees.forEach(a => {
    if (a.paid) return;
    if (!m.has(a.playerId)) m.set(a.playerId, { id: a.playerId, total: 0, items: [] });
    const o = m.get(a.playerId);
    o.total = r2(o.total + s.fee);
    o.items.push(s);
  }));
  return [...m.values()].sort((a, b) => b.total - a.total || pname(a.id).localeCompare(pname(b.id)));
}

function findOrCreatePlayer(name) {
  const existing = db.players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const p = { id: uid(), name };
  db.players.push(p);
  return p;
}

// ---------- reminders (cheeky edition, random pick each copy) ----------
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function sessionReminder(s) {
  const list = s.attendees.filter(a => !a.paid).map((a, i) => `${i + 1}. ${pname(a.playerId)}`).join('\n');
  const date = fmtDate(s.date), fee = rm(s.fee);
  return pick([
    `🚨 *PAYMENT PATROL* 🚨\n\n${date} — the court didn't book itself, and it definitely didn't pay for itself 👀\n\n*${fee}* per head. These legends are still "forgetting":\n${list}\n\nWe know where you dink. Pay up lah 😏🏓`,
    `Knock knock 🚪\nWho's there?\n*${fee}*\n${fee} who?\n${fee} that you owe for ${date} 😌🏓\n\nStarring:\n${list}\n\nTransfer now and I'll pretend this never happened 🤝`,
    `🏓 Friendly reminder (the first one is always friendly 😇)\n\nSession: ${date}\nDamage: *${fee}* per person\n\nStill chilling in the kitchen, not paying:\n${list}\n\nFaults are allowed on court. Not in my bank account 💸`,
  ]);
}
function allReminder(list) {
  const lines = list.map(o => `• ${pname(o.id)} – *${rm(o.total)}* (${o.items.map(s => shortDate(s.date)).join(', ')})`).join('\n');
  return pick([
    `🧱 *THE WALL OF "I'LL PAY LATER"* 🧱\n\n${lines}\n\nClear your name before the next serve. Your paddle is watching 👀🏓`,
    `📢 Attention pickleballers!\nThe tracker has spoken, and it is NOT happy 😤\n\n${lines}\n\nPay up so I can stop being the villain of this group chat 🙏😂`,
    `🚨 Outstanding balances, sorted by guilt:\n\n${lines}\n\nYou dink, you pay. That's the rule lah 🏓💸`,
  ]);
}
function playerReminder(o) {
  const name = pname(o.id), total = rm(o.total);
  const lines = o.items.map(s => `• ${fmtDate(s.date)} – ${rm(s.fee)}`).join('\n');
  return pick([
    `Hi ${name} 👋\n\nJust a tiny, gentle, absolutely-not-passive-aggressive reminder 😇🏓\n\n${lines}\n\nTotal: *${total}*\n\nThe court remembers. So do I 😏`,
    `${name}! 🏓\n\nYour smash? Great. Your payment? Still loading... ⏳\n\n${lines}\n\nTotal: *${total}*\nTransfer whenever you're ready (ready = now) 😁`,
    `Dear ${name},\n\nThe pickleball fund has a small hole in its heart 💔 shaped exactly like *${total}*\n\n${lines}\n\nPlease fix it. With love (and receipts) 🧾🏓`,
  ]);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied — go get \'em 😏'); }
  catch { prompt('Copy this:', text); }
}

// ---------- views ----------
function viewSessions() {
  const list = sorted();
  const b = bank();
  const out = r2(owed().reduce((t, o) => t + o.total, 0));
  return `
    <header class="top"><h1><span class="seal" style="--c:var(--wood)">木</span>Sessions</h1></header>
    <div class="stats">
      <div class="stat" style="--c:var(--water)"><span>Bank</span><b class="${b < 0 ? 'neg' : 'pos'}">${rm(b)}</b></div>
      <a class="stat" href="#/owed" style="--c:var(--fire)"><span>Unpaid</span><b class="${out > 0 ? 'neg' : ''}">${rm(out)}</b></a>
    </div>
    <button class="btn primary block" data-act="new-session">+ New session</button>
    ${list.length ? list.map(s => {
      const c = calc(s);
      return `<a class="card session ${!isDue(s) ? 'upcoming' : c.pl < 0 ? 'loss' : ''}" href="#/session/${s.id}">
        <div>
          <div class="title">${fmtDate(s.date)} ${!isDue(s) ? '<span class="pill">UPCOMING</span>' : ''}</div>
          <div class="muted small">${c.paid}/${s.attendees.length} paid · ${rm(s.fee)}/pax${s.courts ? ` · ${s.courts} court${s.courts > 1 ? 's' : ''}` : ''}</div>
        </div>
        <div class="amt ${c.pl < 0 ? 'neg' : 'pos'}">${rm(c.pl)}</div>
      </a>`;
    }).join('') : '<p class="empty">No sessions yet.</p>'}`;
}

function viewSession(id) {
  const s = session(id);
  if (!s) return `<p class="empty">Session not found. <a href="#/sessions">Back</a></p>`;
  const c = calc(s);
  const counts = playCounts();
  const inIds = new Set(s.attendees.map(a => a.playerId));
  const suggestions = db.players
    .filter(p => !inIds.has(p.id))
    .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.name.localeCompare(b.name));
  const others = sorted().filter(x => x.id !== s.id && x.attendees.some(a => !inIds.has(a.playerId)));
  const prev = others.find(x => x.date <= s.date) || others[0];

  return `
    <header class="top">
      <a href="#/sessions" class="back">‹ Sessions</a>
      <button class="btn ghost danger small" data-act="delete-session">Delete</button>
    </header>

    <section class="card">
      <label class="field"><span>Date</span><input type="date" data-field="date" value="${s.date}"></label>
      <div class="grid3">
        <label class="field"><span>Per pax (RM)</span><input type="number" inputmode="decimal" step="0.01" min="0" data-field="fee" value="${s.fee}"></label>
        <label class="field"><span>Court cost (RM)</span><input type="number" inputmode="decimal" step="0.01" min="0" data-field="courtCost" value="${s.courtCost}"></label>
        <label class="field"><span>Courts</span><input type="number" inputmode="numeric" step="1" min="0" data-field="courts" value="${s.courts ?? ''}" placeholder="–"></label>
      </div>
      ${c.perCourt != null ? `<p class="muted small" style="margin:8px 0 0">${rm(c.perCourt)} per court</p>` : ''}
    </section>

    <section class="card">
      <div class="sum"><span>Paid</span><span>${c.paid} / ${s.attendees.length} players</span></div>
      <div class="sum"><span>Revenue</span><span>${rm(c.revenue)}</span></div>
      <div class="sum"><span>Court cost</span><span>-${rm(s.courtCost)}</span></div>
      <div class="sum"><span>Expenditure</span><span>-${rm(c.expenses)}</span></div>
      <div class="sum total"><span>Profit / Loss</span><span class="${c.pl < 0 ? 'neg' : 'pos'}">${rm(c.pl)}</span></div>
      ${c.outstanding ? `<div class="sum muted small"><span>Still to collect</span><span>${rm(c.outstanding)}</span></div>` : ''}
    </section>

    <section class="card">
      <div class="sec-head">
        <h2>Players (${s.attendees.length})</h2>
        ${s.attendees.length > 1 && c.paid < s.attendees.length ? `<button class="btn small" data-act="all-paid">Mark all paid</button>` : ''}
      </div>
      <ul class="list">
        ${s.attendees.map(a => `
          <li class="row">
            <button class="pay ${a.paid ? 'on' : ''}" data-act="toggle-paid" data-id="${a.playerId}" aria-pressed="${a.paid}">
              <span class="box">${a.paid ? '✓' : ''}</span>
              <span class="name">${esc(pname(a.playerId))}</span>
              ${a.paid ? '<span class="tag">Paid</span>' : isDue(s) ? '<span class="tag">Unpaid</span>' : '<span class="tag pending">Upcoming</span>'}
            </button>
            <button class="icon" data-act="remove-attendee" data-id="${a.playerId}" aria-label="Remove">×</button>
          </li>`).join('') || '<li class="muted small" style="padding:8px 0">No players yet — add below.</li>'}
      </ul>
      ${c.unpaid ? `
        <div class="btn-row">
          <button class="btn earth" data-act="copy-session">📋 Copy reminder (${c.unpaid} unpaid)</button>
        </div>` : ''}

      <h3>Add players</h3>
      ${prev ? `<button class="btn small" data-act="add-prev" data-id="${prev.id}">+ Everyone from ${shortDate(prev.date)}</button>` : ''}
      <div class="chips">
        ${suggestions.map(p => `<button class="chip" data-act="add-attendee" data-id="${p.id}">+ ${esc(p.name)}</button>`).join('')}
      </div>
      <form class="inline" data-form="new-player">
        <input name="name" placeholder="New player name" autocomplete="off" required>
        <button class="btn">Add</button>
      </form>
    </section>

    <section class="card">
      <h2>Expenditure</h2>
      <ul class="list">
        ${s.expenses.map(e => `
          <li class="row exp">
            <span class="name">${esc(e.name)}</span>
            <span class="amt">${rm(e.amount)}</span>
            <button class="icon" data-act="remove-expense" data-id="${e.id}" aria-label="Remove">×</button>
          </li>`).join('') || '<li class="muted small" style="padding:8px 0">None</li>'}
      </ul>
      <form class="inline" data-form="expense">
        <input name="name" placeholder="What? (e.g. Balls)" autocomplete="off" required>
        <input name="amount" class="amt-in" type="number" inputmode="decimal" step="0.01" min="0" placeholder="RM" required>
        <button class="btn">Add</button>
      </form>
    </section>`;
}

function viewOwed() {
  const list = owed();
  const total = r2(list.reduce((t, o) => t + o.total, 0));
  return `
    <header class="top"><h1><span class="seal" style="--c:var(--fire)">火</span>Unpaid</h1></header>
    <div class="stats">
      <div class="stat" style="--c:var(--fire)"><span>Total unpaid</span><b class="${total ? 'neg' : 'pos'}">${rm(total)}</b></div>
      <div class="stat" style="--c:var(--earth)"><span>Players</span><b>${list.length}</b></div>
    </div>
    ${!list.length ? '<p class="empty">Everyone has paid 🎉</p>' : `
      <div class="btn-row" style="margin:0 0 8px">
        <button class="btn earth" data-act="copy-all">📋 Copy group reminder</button>
      </div>
      <p class="note">Only sessions on or before today are counted. Tap a date to mark that session paid.</p>
      ${list.map(o => `
        <div class="card">
          <div class="sec-head"><h2>${esc(pname(o.id))}</h2><span class="amt neg">${rm(o.total)}</span></div>
          <div class="chips">
            ${o.items.map(s => `<button class="chip" data-act="owed-paid" data-id="${s.id}" data-player="${o.id}">✓ ${shortDate(s.date)} · ${rm(s.fee)}</button>`).join('')}
          </div>
          <div class="btn-row" style="margin-top:4px">
            <button class="btn small" data-act="copy-player" data-id="${o.id}">📋 Copy reminder</button>
          </div>
        </div>`).join('')}`}`;
}

function viewPlayers() {
  const counts = playCounts();
  const owes = Object.fromEntries(owed().map(o => [o.id, o.total]));
  const list = [...db.players].sort((a, b) => a.name.localeCompare(b.name));
  return `
    <header class="top"><h1><span class="seal" style="--c:var(--earth)">土</span>Players</h1></header>
    <section class="card">
      <form class="inline" data-form="new-player" style="margin:0">
        <input name="name" placeholder="New player name" autocomplete="off" required>
        <button class="btn">Add</button>
      </form>
    </section>
    <section class="card">
      <ul class="list">
        ${list.map(p => `
          <li class="row">
            <div class="name player-info">
              <div class="title">${esc(p.name)}</div>
              <div class="muted small">${counts[p.id] || 0} session${counts[p.id] === 1 ? '' : 's'}${owes[p.id] ? ` · <span class="neg">owes ${rm(owes[p.id])}</span>` : ''}</div>
            </div>
            <button class="btn ghost small" data-act="rename-player" data-id="${p.id}">Rename</button>
            <button class="icon" data-act="delete-player" data-id="${p.id}" aria-label="Delete">×</button>
          </li>`).join('') || '<li class="muted small">No players yet.</li>'}
      </ul>
    </section>`;
}

function viewBackup() {
  return `
    <header class="top"><h1><span class="seal" style="--c:var(--water)">水</span>Backup</h1></header>
    <section class="card">
      <p class="note">Your data is saved only on this phone. Clearing Chrome's site data or uninstalling the app will erase it — export a backup regularly (e.g. to Google Drive).</p>
      <p class="small">Last backup: <b>${db.lastBackup ? fmtDate(db.lastBackup) : 'never'}</b></p>
      <div class="btn-row">
        <button class="btn primary" data-act="export-json">Export backup</button>
        <button class="btn" data-act="import-json">Import backup</button>
      </div>
      <div class="btn-row">
        <button class="btn" data-act="export-csv">Export CSV (for Google Sheets)</button>
      </div>
    </section>
    <section class="card">
      <p class="small muted" style="margin-top:0">${db.sessions.length} sessions · ${db.players.length} players</p>
      <button class="btn danger" data-act="reset">Erase all data</button>
    </section>`;
}

// ---------- routing & render ----------
function parseHash() {
  const [, view = 'sessions', id] = location.hash.slice(1).split('/');
  return { view: view || 'sessions', id };
}
function currentSession() {
  const { view, id } = parseHash();
  return view === 'session' ? session(id) : null;
}

function render() {
  const { view, id } = parseHash();
  const views = { sessions: viewSessions, session: () => viewSession(id), owed: viewOwed, players: viewPlayers, backup: viewBackup };
  main.innerHTML = (views[view] || viewSessions)();
  const tab = view === 'session' ? 'sessions' : view;
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('active', a.dataset.view === tab));
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// ---------- files ----------
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function toCsv() {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const ss = sorted().reverse();
  const rows = [['Player', ...ss.map(s => s.date)]];
  [...db.players].sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
    rows.push([p.name, ...ss.map(s => { const a = s.attendees.find(x => x.playerId === p.id); return a ? (a.paid ? 'Paid' : 'Unpaid') : ''; })]);
  });
  rows.push([]);
  const line = (label, fn) => rows.push([label, ...ss.map(fn)]);
  line('Court cost', s => s.courtCost.toFixed(2));
  line('Courts', s => s.courts ?? '');
  line('Per pax', s => s.fee.toFixed(2));
  line('Revenue', s => calc(s).revenue.toFixed(2));
  line('Expenditure', s => calc(s).expenses.toFixed(2));
  line('Expenditure items', s => s.expenses.map(e => `${e.name} ${e.amount.toFixed(2)}`).join('; '));
  line('Profit / Loss', s => calc(s).pl.toFixed(2));
  rows.push([]);
  rows.push(['Bank', bank().toFixed(2)]);
  return rows.map(r => r.map(cell).join(',')).join('\r\n');
}

document.getElementById('import-file').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.players) || !Array.isArray(data.sessions)) throw new Error('Not a tracker backup');
    if (!confirm(`Replace current data with backup (${data.sessions.length} sessions, ${data.players.length} players)?`)) return;
    db = data;
    commit();
    toast('Backup imported');
  } catch (err) {
    alert('Import failed: ' + err.message);
  }
});

// ---------- actions ----------
const actions = {
  'new-session'() {
    const last = sorted()[0];
    const s = { id: uid(), date: today(), fee: last?.fee ?? 20, courtCost: last?.courtCost ?? 0, courts: last?.courts ?? null, expenses: [], attendees: [] };
    db.sessions.push(s);
    save();
    location.hash = '#/session/' + s.id;
  },
  'delete-session'(_, s) {
    if (!confirm(`Delete session on ${fmtDate(s.date)}?`)) return;
    db.sessions = db.sessions.filter(x => x.id !== s.id);
    save();
    location.hash = '#/sessions';
  },
  'toggle-paid'(id, s) { const a = s.attendees.find(x => x.playerId === id); a.paid = !a.paid; commit(); },
  'all-paid'(_, s) { s.attendees.forEach(a => { a.paid = true; }); commit(); },
  'remove-attendee'(id, s) { s.attendees = s.attendees.filter(a => a.playerId !== id); commit(); },
  'add-attendee'(id, s) { s.attendees.push({ playerId: id, paid: false }); commit(); },
  'add-prev'(id, s) {
    session(id).attendees.forEach(a => {
      if (!s.attendees.some(x => x.playerId === a.playerId)) s.attendees.push({ playerId: a.playerId, paid: false });
    });
    commit();
  },
  'remove-expense'(id, s) { s.expenses = s.expenses.filter(e => e.id !== id); commit(); },
  'copy-session'(_, s) { copy(sessionReminder(s)); },
  'copy-all'() { copy(allReminder(owed())); },
  'copy-player'(id) { copy(playerReminder(owed().find(o => o.id === id))); },
  'owed-paid'(id, _, el) {
    const a = session(id).attendees.find(x => x.playerId === el.dataset.player);
    a.paid = true;
    commit();
    toast(`${pname(a.playerId)} marked paid`);
  },
  'rename-player'(id) {
    const p = player(id);
    const name = prompt('Rename player', p.name)?.trim();
    if (!name || name === p.name) return;
    if (db.players.some(x => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) return alert('A player with that name already exists.');
    p.name = name;
    commit();
  },
  'delete-player'(id) {
    const n = playCounts()[id] || 0;
    const msg = n
      ? `${pname(id)} is in ${n} session(s). Deleting removes them from those sessions and changes their revenue. Continue?`
      : `Delete ${pname(id)}?`;
    if (!confirm(msg)) return;
    db.players = db.players.filter(p => p.id !== id);
    db.sessions.forEach(s => { s.attendees = s.attendees.filter(a => a.playerId !== id); });
    commit();
  },
  'export-json'() {
    db.lastBackup = today();
    save();
    download(`pickleball-backup-${today()}.json`, JSON.stringify(db, null, 2), 'application/json');
    render();
  },
  'import-json'() { document.getElementById('import-file').click(); },
  'export-csv'() { download(`pickleball-${today()}.csv`, toCsv(), 'text/csv'); },
  'reset'() {
    if (!confirm('Erase ALL sessions and players? Export a backup first if unsure.')) return;
    if (prompt('Type ERASE to confirm') !== 'ERASE') return;
    db = { players: [], sessions: [], lastBackup: null };
    commit();
  },
};

main.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  actions[el.dataset.act]?.(el.dataset.id, currentSession(), el);
});

main.addEventListener('change', e => {
  const field = e.target.dataset.field;
  const s = currentSession();
  if (!field || !s) return;
  const v = e.target.value;
  if (field === 'date') { if (v) s.date = v; }
  else if (field === 'courts') { const n = parseInt(v, 10); s.courts = n > 0 ? n : null; }
  else s[field] = Math.max(0, num(v));
  commit();
});

main.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const s = currentSession();
  const name = String(fd.get('name') || '').trim();
  if (!name) return;

  if (form.dataset.form === 'new-player') {
    const p = findOrCreatePlayer(name);
    if (s && !s.attendees.some(a => a.playerId === p.id)) s.attendees.push({ playerId: p.id, paid: false });
    commit();
    main.querySelector('[data-form="new-player"] input')?.focus();
  } else if (form.dataset.form === 'expense' && s) {
    s.expenses.push({ id: uid(), name, amount: Math.max(0, num(fd.get('amount'))) });
    commit();
  }
});

// ---------- boot ----------
render();
navigator.storage?.persist?.();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
