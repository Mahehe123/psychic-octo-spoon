'use strict';

const KEY = 'pickleball-tracker-v1';
const main = document.getElementById('main');
const nav = document.getElementById('nav');

// ---------- helpers ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round((+n || 0) * 100) / 100;
const num = v => { const n = parseFloat(v); return isFinite(n) ? r2(n) : 0; };
const rm = n => (r2(n) < 0 ? '-' : '') + 'RM' + Math.abs(r2(n)).toFixed(2);
const fmtDate = (d, opts) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', opts || { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = d => fmtDate(d, { day: 'numeric', month: 'short' });
const today = () => { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); };
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const joinNames = n => n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2000);
}

// Google Material icons (Apache 2.0), inlined so they work offline.
const ICONS = {
  event: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
  wallet: 'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  cloud: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  doneAll: 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  table: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z',
  chevron: 'M10 6L8.59 7.41 13.17 12l-4.58 4.58L10 18l6-6z',
  circle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  schedule: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  personAdd: 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  history: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  receipt: 'M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z',
};
const icon = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

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
const dueUnpaidSessions = () => sorted().filter(s => calc(s).unpaid > 0);
const totalUnpaid = () => r2(db.sessions.reduce((t, s) => t + calc(s).outstanding, 0));

function playCounts() {
  const m = {};
  db.sessions.forEach(s => s.attendees.forEach(a => { m[a.playerId] = (m[a.playerId] || 0) + 1; }));
  return m;
}
function owedByPlayer() {
  const m = {};
  db.sessions.filter(isDue).forEach(s => s.attendees.forEach(a => { if (!a.paid) m[a.playerId] = r2((m[a.playerId] || 0) + s.fee); }));
  return m;
}

function findOrCreatePlayer(name) {
  const existing = db.players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const p = { id: uid(), name };
  db.players.push(p);
  return p;
}

// ---------- selection (for reminders) ----------
let selected = new Set();
const selKey = (sid, pid) => sid + '|' + pid;
const selectable = (s, a) => !a.paid && isDue(s);

function pruneSelection() {
  for (const k of selected) {
    const [sid, pid] = k.split('|');
    const s = session(sid);
    const a = s?.attendees.find(x => x.playerId === pid);
    if (!s || !a || !selectable(s, a)) selected.delete(k);
  }
}
// [{ s, names: [..] }] oldest session first
function selectedGroups() {
  return sorted().reverse()
    .map(s => ({ s, names: s.attendees.filter(a => selected.has(selKey(s.id, a.playerId))).map(a => pname(a.playerId)) }))
    .filter(g => g.names.length);
}

// ---------- reminder (Yoda edition, random pick each copy) ----------
function yodaReminder(groups) {
  const who = joinNames([...new Set(groups.flatMap(g => g.names))]);
  const details = groups.length === 1
    ? `📅 ${fmtDate(groups[0].s.date)}\n💰 ${rm(groups[0].s.fee)} each, it is.`
    : groups.map(g => `📅 ${fmtDate(g.s.date)} — ${rm(g.s.fee)}\n     ${joinNames(g.names)}`).join('\n');
  return pick([
    `Hmm. Played pickleball, you did. Paid, you have not. 🏓\n\n${details}\n\n${who} — pay, you must. Strong with the paddle you are; stronger with the payment you will become. 🙏`,
    `A disturbance in the court fund, I sense. 🌌\n\n${details}\n\n${who}, transfer you should. Forget, you will not. Hmm? 😌`,
    `Patience, the court owner has not. 🏓\n\n${details}\n\nClear your balance, ${who} must. Then at peace, the fund will be.\nMay the dink be with you. ✨`,
    `Small, the amount is. Big, the gratitude will be. 🙏\n\n${details}\n\n${who} — do or do not pay. There is no "later". 🏓`,
  ]);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied, the reminder is ✨'); }
  catch { prompt('Copy this:', text); }
}

// ---------- shared UI pieces ----------
function playerRow(s, a, removable) {
  const name = pname(a.playerId);
  const canPick = selectable(s, a);
  const sel = canPick && selected.has(selKey(s.id, a.playerId));
  const [cls, ic, label] = a.paid ? ['paid', 'check', 'Paid'] : isDue(s) ? ['unpaid', 'circle', 'Unpaid'] : ['upcoming', 'schedule', 'Upcoming'];
  return `
    <li class="prow ${sel ? 'selected' : ''}">
      <button class="pick" data-act="pick" data-sid="${s.id}" data-id="${a.playerId}" ${canPick ? '' : 'disabled'} aria-pressed="${sel}">
        <span class="avatar">${sel ? icon('check') : esc(name.charAt(0).toUpperCase())}</span>
        <span class="pname">${esc(name)}</span>
      </button>
      <button class="status ${cls}" data-act="toggle-paid" data-sid="${s.id}" data-id="${a.playerId}" aria-label="${a.paid ? 'Mark unpaid' : 'Mark paid'}: ${esc(name)}">${icon(ic)}${label}</button>
      ${removable ? `<button class="iconbtn" data-act="remove-attendee" data-sid="${s.id}" data-id="${a.playerId}" aria-label="Remove ${esc(name)}">${icon('close')}</button>` : ''}
    </li>`;
}

function selectAllButton(s) {
  const keys = s.attendees.filter(a => selectable(s, a)).map(a => selKey(s.id, a.playerId));
  if (!keys.length) return '';
  const all = keys.every(k => selected.has(k));
  return `<button class="btn text" data-act="select-session" data-sid="${s.id}">${icon('doneAll')}${all ? 'Clear' : 'Select unpaid'}</button>`;
}

function actionBar() {
  const n = selected.size;
  if (!n) return '';
  return `
    <div class="actionbar" role="region" aria-label="Selected players">
      <button class="iconbtn" data-act="clear-sel" aria-label="Clear selection">${icon('close')}</button>
      <span class="count">${n} selected</span>
      <button class="btn ghost" data-act="sel-paid">${icon('check')}Paid</button>
      <button class="btn primary" data-act="copy-sel">${icon('copy')}Remind</button>
    </div>`;
}

// ---------- views ----------
function viewSessions() {
  const list = sorted();
  const b = bank();
  const out = totalUnpaid();
  return `
    <header class="appbar"><h1>Pickleball<span class="sub">Payment tracker</span></h1></header>
    <section class="hero">
      <div class="k">Bank balance</div>
      <div class="big">${rm(b)}</div>
      <div class="minis">
        <a class="mini" href="#/owed"><span>Unpaid</span><b>${rm(out)}</b></a>
        <div class="mini"><span>Sessions</span><b>${db.sessions.length}</b></div>
      </div>
    </section>
    ${list.length ? list.map(s => {
      const c = calc(s);
      const d = new Date(s.date + 'T00:00:00');
      return `
        <a class="card scard" href="#/session/${s.id}">
          <div class="datebox"><b>${d.getDate()}</b><small>${d.toLocaleDateString('en-GB', { month: 'short' })}</small></div>
          <div class="mid">
            <div class="title">${d.toLocaleDateString('en-GB', { weekday: 'long' })}${!isDue(s) ? '<span class="chip-s">Upcoming</span>' : c.unpaid ? `<span class="chip-s warn">${c.unpaid} unpaid</span>` : ''}</div>
            <div class="muted small">${c.paid}/${s.attendees.length} paid · ${rm(s.fee)}/pax${s.courts ? ` · ${s.courts} court${s.courts > 1 ? 's' : ''}` : ''}</div>
          </div>
          <div class="amt ${c.pl < 0 ? 'neg' : 'pos'}">${rm(c.pl)}</div>
          <span class="chev">${icon('chevron')}</span>
        </a>`;
    }).join('') : `<div class="empty">${icon('event')}No sessions yet.</div>`}
    <button class="fab" data-act="new-session">${icon('add')}New session</button>`;
}

function viewSession(id) {
  const s = session(id);
  if (!s) return `<div class="empty">Session not found. <a href="#/sessions">Back</a></div>`;
  const c = calc(s);
  const counts = playCounts();
  const inIds = new Set(s.attendees.map(a => a.playerId));
  const suggestions = db.players
    .filter(p => !inIds.has(p.id))
    .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.name.localeCompare(b.name));
  const others = sorted().filter(x => x.id !== s.id && x.attendees.some(a => !inIds.has(a.playerId)));
  const prev = others.find(x => x.date <= s.date) || others[0];

  return `
    <header class="appbar">
      <a class="iconbtn" href="#/sessions" aria-label="Back">${icon('back')}</a>
      <h1>${fmtDate(s.date, { weekday: 'long', day: 'numeric', month: 'short' })}<span class="sub">${isDue(s) ? fmtDate(s.date, { year: 'numeric' }) : 'Upcoming session'}</span></h1>
      <button class="iconbtn danger" data-act="delete-session" data-sid="${s.id}" aria-label="Delete session">${icon('delete')}</button>
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
      ${c.outstanding ? `<div class="sum small neg"><span>Still to collect</span><span>${rm(c.outstanding)}</span></div>` : ''}
    </section>

    <section class="card">
      <div class="sec-head">
        <h2 class="card-title">Players (${s.attendees.length})</h2>
        ${selectAllButton(s)}
      </div>
      ${c.unpaid ? '<p class="hint">Tap names to select, then copy a reminder.</p>' : ''}
      <ul class="plist">
        ${s.attendees.map(a => playerRow(s, a, true)).join('') || '<li class="muted small" style="padding:8px 0">No players yet — add below.</li>'}
      </ul>
      ${s.attendees.length > 1 && c.paid < s.attendees.length ? `<div class="btn-row"><button class="btn" data-act="all-paid" data-sid="${s.id}">${icon('doneAll')}Mark everyone paid</button></div>` : ''}

      <div class="label">Add players</div>
      ${prev ? `<button class="btn tonal" data-act="add-prev" data-sid="${s.id}" data-id="${prev.id}">${icon('history')}Everyone from ${shortDate(prev.date)}</button>` : ''}
      <div class="chips">
        ${suggestions.map(p => `<button class="chip" data-act="add-attendee" data-sid="${s.id}" data-id="${p.id}">${icon('add')}${esc(p.name)}</button>`).join('')}
      </div>
      <form class="inline" data-form="new-player">
        <input name="name" placeholder="New player name" autocomplete="off" required aria-label="New player name">
        <button class="btn primary" aria-label="Add player">${icon('personAdd')}</button>
      </form>
    </section>

    <section class="card">
      <h2 class="card-title">Expenditure</h2>
      <ul class="plist">
        ${s.expenses.map(e => `
          <li class="erow">
            <span class="name">${esc(e.name)}</span>
            <span class="amt">${rm(e.amount)}</span>
            <button class="iconbtn" data-act="remove-expense" data-sid="${s.id}" data-id="${e.id}" aria-label="Remove ${esc(e.name)}">${icon('close')}</button>
          </li>`).join('') || '<li class="muted small" style="padding:8px 0">None</li>'}
      </ul>
      <form class="inline" data-form="expense">
        <input name="name" placeholder="What? (e.g. Balls)" autocomplete="off" required aria-label="Expense item">
        <input name="amount" class="amt-in" type="number" inputmode="decimal" step="0.01" min="0" placeholder="RM" required aria-label="Amount">
        <button class="btn primary" aria-label="Add expense">${icon('add')}</button>
      </form>
    </section>
    ${actionBar()}`;
}

function viewOwed() {
  const list = dueUnpaidSessions();
  const players = new Set(list.flatMap(s => s.attendees.filter(a => !a.paid).map(a => a.playerId)));
  return `
    <header class="appbar"><h1>Unpaid<span class="sub">Sessions on or before today</span></h1></header>
    <section class="hero">
      <div class="k">Total to collect</div>
      <div class="big">${rm(totalUnpaid())}</div>
      <div class="minis">
        <div class="mini"><span>Sessions</span><b>${list.length}</b></div>
        <div class="mini"><span>Players</span><b>${players.size}</b></div>
      </div>
    </section>
    ${!list.length ? `<div class="empty">${icon('doneAll')}Everyone has paid. Pleased, Master Yoda is.</div>` : `
      <p class="hint">Tap names (across any sessions) to select, then copy one reminder.</p>
      ${list.map(s => {
        const c = calc(s);
        return `
          <section class="card">
            <div class="sec-head">
              <a href="#/session/${s.id}" style="color:inherit;text-decoration:none">
                <h2 class="card-title">${fmtDate(s.date)}</h2>
                <div class="muted small">${c.unpaid} unpaid · ${rm(s.fee)} each</div>
              </a>
              <span class="amt neg">${rm(c.outstanding)}</span>
            </div>
            <ul class="plist">${s.attendees.filter(a => !a.paid).map(a => playerRow(s, a, false)).join('')}</ul>
            <div class="btn-row">${selectAllButton(s)}</div>
          </section>`;
      }).join('')}`}
    ${actionBar()}`;
}

function viewPlayers() {
  const counts = playCounts();
  const owes = owedByPlayer();
  const list = [...db.players].sort((a, b) => a.name.localeCompare(b.name));
  return `
    <header class="appbar"><h1>Players<span class="sub">${db.players.length} people</span></h1></header>
    <section class="card">
      <form class="inline" data-form="new-player" style="margin:0">
        <input name="name" placeholder="New player name" autocomplete="off" required aria-label="New player name">
        <button class="btn primary" aria-label="Add player">${icon('personAdd')}</button>
      </form>
    </section>
    <section class="card">
      <ul class="plist">
        ${list.map(p => `
          <li class="prow">
            <span class="avatar">${esc(p.name.charAt(0).toUpperCase())}</span>
            <div class="player-info" style="margin-left:8px">
              <div class="pname" style="font-weight:600">${esc(p.name)}</div>
              <div class="muted small">${counts[p.id] || 0} session${counts[p.id] === 1 ? '' : 's'}${owes[p.id] ? ` · <span class="neg">owes ${rm(owes[p.id])}</span>` : ''}</div>
            </div>
            <button class="iconbtn" data-act="rename-player" data-id="${p.id}" aria-label="Rename ${esc(p.name)}">${icon('edit')}</button>
            <button class="iconbtn" data-act="delete-player" data-id="${p.id}" aria-label="Delete ${esc(p.name)}">${icon('delete')}</button>
          </li>`).join('') || '<li class="muted small">No players yet.</li>'}
      </ul>
    </section>`;
}

function viewBackup() {
  return `
    <header class="appbar"><h1>Backup<span class="sub">Last backup: ${db.lastBackup ? fmtDate(db.lastBackup) : 'never'}</span></h1></header>
    <section class="card">
      <p class="muted" style="margin-top:0">Your data is saved only on this phone. Clearing Chrome's site data or uninstalling the app erases it — export a backup regularly (e.g. to Google Drive).</p>
      <div class="btn-row">
        <button class="btn primary block" data-act="export-json">${icon('download')}Export backup</button>
      </div>
      <div class="btn-row">
        <button class="btn" data-act="import-json">${icon('upload')}Import</button>
        <button class="btn" data-act="export-csv">${icon('table')}Export CSV</button>
      </div>
    </section>
    <section class="card">
      <p class="small muted" style="margin-top:0">${db.sessions.length} sessions · ${db.players.length} players</p>
      <button class="btn" data-act="reset">${icon('delete')}Erase all data</button>
    </section>`;
}

// ---------- routing & render ----------
const TABS = [['sessions', 'event', 'Sessions'], ['owed', 'wallet', 'Unpaid'], ['players', 'group', 'Players'], ['backup', 'cloud', 'Backup']];

function parseHash() {
  const [, view = 'sessions', id] = location.hash.slice(1).split('/');
  return { view: view || 'sessions', id };
}
function currentSession() {
  const { view, id } = parseHash();
  return view === 'session' ? session(id) : null;
}

function render() {
  pruneSelection();
  const { view, id } = parseHash();
  const views = { sessions: viewSessions, session: () => viewSession(id), owed: viewOwed, players: viewPlayers, backup: viewBackup };
  main.innerHTML = (views[view] || viewSessions)();
  document.body.classList.toggle('has-bar', selected.size > 0);

  const tab = view === 'session' ? 'sessions' : view;
  const unpaidCount = dueUnpaidSessions().reduce((t, s) => t + calc(s).unpaid, 0);
  nav.innerHTML = TABS.map(([v, ic, label]) => `
    <a href="#/${v}" class="${v === tab ? 'active' : ''}" ${v === tab ? 'aria-current="page"' : ''}>
      <span class="ind">${icon(ic)}${v === 'owed' && unpaidCount ? `<span class="badge">${unpaidCount}</span>` : ''}</span>${label}
    </a>`).join('');
}

window.addEventListener('hashchange', () => { selected.clear(); render(); window.scrollTo(0, 0); });

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
// Each action receives (el, s) where s is the session from data-sid (or the current page).
const actions = {
  'new-session'() {
    const last = sorted()[0];
    const s = { id: uid(), date: today(), fee: last?.fee ?? 20, courtCost: last?.courtCost ?? 0, courts: last?.courts ?? null, expenses: [], attendees: [] };
    db.sessions.push(s);
    save();
    location.hash = '#/session/' + s.id;
  },
  'delete-session'(el, s) {
    if (!confirm(`Delete session on ${fmtDate(s.date)}?`)) return;
    db.sessions = db.sessions.filter(x => x.id !== s.id);
    save();
    location.hash = '#/sessions';
  },
  'pick'(el, s) {
    const k = selKey(s.id, el.dataset.id);
    selected.has(k) ? selected.delete(k) : selected.add(k);
    render();
  },
  'select-session'(el, s) {
    const keys = s.attendees.filter(a => selectable(s, a)).map(a => selKey(s.id, a.playerId));
    const all = keys.every(k => selected.has(k));
    keys.forEach(k => all ? selected.delete(k) : selected.add(k));
    render();
  },
  'clear-sel'() { selected.clear(); render(); },
  'copy-sel'() { copy(yodaReminder(selectedGroups())); },
  'sel-paid'() {
    const n = selected.size;
    for (const k of selected) {
      const [sid, pid] = k.split('|');
      const a = session(sid)?.attendees.find(x => x.playerId === pid);
      if (a) a.paid = true;
    }
    selected.clear();
    commit();
    toast(`${n} marked paid`);
  },
  'toggle-paid'(el, s) { const a = s.attendees.find(x => x.playerId === el.dataset.id); a.paid = !a.paid; commit(); },
  'all-paid'(el, s) { s.attendees.forEach(a => { a.paid = true; }); commit(); },
  'remove-attendee'(el, s) { s.attendees = s.attendees.filter(a => a.playerId !== el.dataset.id); commit(); },
  'add-attendee'(el, s) { s.attendees.push({ playerId: el.dataset.id, paid: false }); commit(); },
  'add-prev'(el, s) {
    session(el.dataset.id).attendees.forEach(a => {
      if (!s.attendees.some(x => x.playerId === a.playerId)) s.attendees.push({ playerId: a.playerId, paid: false });
    });
    commit();
  },
  'remove-expense'(el, s) { s.expenses = s.expenses.filter(e => e.id !== el.dataset.id); commit(); },
  'rename-player'(el) {
    const p = player(el.dataset.id);
    const name = prompt('Rename player', p.name)?.trim();
    if (!name || name === p.name) return;
    if (db.players.some(x => x.id !== p.id && x.name.toLowerCase() === name.toLowerCase())) return alert('A player with that name already exists.');
    p.name = name;
    commit();
  },
  'delete-player'(el) {
    const id = el.dataset.id;
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
    selected.clear();
    commit();
  },
};

main.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  actions[el.dataset.act]?.(el, session(el.dataset.sid) || currentSession());
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
