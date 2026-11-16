/* Willow core: constants, dates (Asia/Manila), state, storage, router, forms. */
window.VIEWS = window.VIEWS || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/* ---------- Dates: everything is keyed to Asia/Manila calendar days ---------- */
const TZ = 'Asia/Manila';
const ymdFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const todayYMD = () => ymdFormat.format(new Date());
const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dowOf = (ymd) => new Date(ymd + 'T12:00:00Z').getUTCDay();
const weekStart = (ymd) => { const d = dowOf(ymd); return addDays(ymd, d === 0 ? -6 : 1 - d); };
const monthStart = (ymd) => ymd.slice(0, 7) + '-01';
const daysInMonth = (ymd) => { const [y, m] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
const fmtDay = (ymd, o = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...o });
const fmtMonth = (ymd) => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const hourManila = () => parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date()), 10) % 24;
const php = (n) => { const v = Math.round(Number(n) || 0); return (v < 0 ? '−' : '') + '₱' + Math.abs(v).toLocaleString('en-PH'); };
const hm = (min) => { min = Math.round(min || 0); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`; };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const rangeDays = (end, n) => Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));

/* ---------- Reference data (from the user's Willow spec) ---------- */
const HABITS = [
  { id: 'vitc', title: 'Take Vitamin C and glutathione', group: 'core' },
  { id: 'workout', title: 'Light workout', group: 'core' },
  { id: 'water', title: 'Drink 1.5L water', group: 'core' },
  { id: 'learn-ai', title: 'Learn AI', group: 'core' },
  { id: 'learn-trading', title: 'Learn Finance Trading', group: 'core' },
  { id: 'sugar', title: 'Be mindful of sugar', group: 'glow' },
  { id: 'eating', title: 'Balanced eating', group: 'glow' },
  { id: 'selfcare', title: 'Lymphatic drainage / self-care routine', group: 'glow' },
  { id: 'skincare', title: 'Skincare routine', group: 'glow' },
];
const GOALS = [
  { id: 'trading', no: '01', name: 'Finance Trading', status: 'Active · November–December', blurb: 'Markets, charting, strategy, backtesting. Real-money trading stays locked until you decide.' },
  { id: 'ai', no: '02', name: 'Learn AI', status: 'Active · November', blurb: 'Hermes, agents, automation, intelligent systems, AI in cybersecurity.' },
  { id: 'glow', no: '03', name: 'Glow Up', status: 'Daily habits', blurb: 'A healthy, toned, confident self. Consistency, never extremes.' },
  { id: 'tech', no: '04', name: 'Tech Development and Reverse Engineering', status: 'Active exploration', blurb: 'Websites, Linux, home labs, agents, authorized reverse engineering.' },
  { id: 'money', no: '05', name: 'Internet Money', status: 'Preparation phase', blurb: 'AI-assisted clipping and content. Stays in preparation until you activate it.' },
  { id: 'reading', no: '06', name: 'Watch and Read', status: 'Flexible', blurb: 'Meaningful videos, documentaries, books and articles over mindless scrolling.' },
  { id: 'cs', no: '07', name: 'CS Student Advantage', status: 'Monthly learning', blurb: 'Online courses, programming practice, a portfolio you can be proud of.' },
];
const goalById = (id) => GOALS.find((g) => g.id === id);
const CATS = {
  ai: { label: 'Learning AI', learn: true },
  trading: { label: 'Trading education', learn: true },
  programming: { label: 'Programming', learn: true },
  cs: { label: 'Course study', learn: true },
  reading: { label: 'Reading or watching' },
  workout: { label: 'Workout' },
  journal: { label: 'Journaling' },
  social: { label: 'Socializing', offline: true },
  outdoors: { label: 'Outdoors and exploring', offline: true },
  personal: { label: 'Personal time', offline: true },
  rest: { label: 'Rest', offline: true },
};
/* Me Time checklist. Each tick is an offline activity, so it shows on the Me Time page and in that day’s record. */
const ME_TIME = [
  { key: 'sudoku', label: 'Sudoku', category: 'personal', icon: mi('<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>') },
  { key: 'gaming', label: 'Gaming', category: 'personal', icon: mi('<path d="M7 9h10a4 4 0 0 1 3.8 5.2l-.8 2.5a2 2 0 0 1-3.4.6L14.9 15H9.1l-1.7 2.3a2 2 0 0 1-3.4-.6l-.8-2.5A4 4 0 0 1 7 9z"/><path d="M8 11.5v2M7 12.5h2M15.5 11.8h.01M17.5 13.8h.01"/>') },
  { key: 'reading', label: 'Reading', category: 'personal', icon: mi('<path d="M4 5.5h5.5a2.5 2.5 0 0 1 2.5 2.5V19a2 2 0 0 0-2-2H4z"/><path d="M20 5.5h-5.5A2.5 2.5 0 0 0 12 8V19a2 2 0 0 1 2-2h6z"/>') },
  { key: 'movie', label: 'Movie', category: 'rest', icon: mi('<rect x="3.5" y="6" width="17" height="13" rx="2"/><path d="M3.5 10h17M8 6l2 4M13 6l2 4"/>') },
  { key: 'outing', label: 'Go out', category: 'outdoors', icon: mi('<path d="M4 20h16M6 20V9l6-4.5L18 9v11M10 20v-5h4v5"/>') },
  { key: 'walk', label: 'Walk', category: 'outdoors', icon: mi('<ellipse cx="9" cy="8.5" rx="2" ry="3"/><ellipse cx="15" cy="15.5" rx="2" ry="3"/>') },
];
/* Mood icons: thin line drawings that take the text colour. */
function mi(body) { return `<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`; }
const MOODS = [
  ['happy', mi('<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'), 'Happy'],
  ['peaceful', mi('<circle cx="12" cy="12" r="9"/><path d="M8 10.5q1.2 1.2 2.4 0M13.6 10.5q1.2 1.2 2.4 0"/><path d="M9.5 14.5a3.5 3.5 0 0 0 5 0"/>'), 'Peaceful'],
  ['thinking', mi('<path d="M7 18h10.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6-1.3A3.9 3.9 0 0 0 7 18z"/>'), 'Thinking a lot'],
  ['excited', mi('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'), 'Excited'],
  ['neutral', mi('<circle cx="12" cy="12" r="9"/><path d="M8.5 15h7"/><path d="M9 9.5h.01M15 9.5h.01"/>'), 'Neutral'],
  ['sad', mi('<circle cx="12" cy="12" r="9"/><path d="M8.5 16a4 4 0 0 1 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'), 'Sad'],
  ['stressed', mi('<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5l1.2-1 1.3 1 1.3-1 1.3 1 1.2-1"/><path d="M8.5 9.5h1.5M14 9.5h1.5"/>'), 'Stressed'],
  ['unproductive', mi('<rect x="3" y="7.5" width="16" height="9" rx="2.5"/><path d="M19.5 10.5v3M6.5 10.5v3"/>'), 'Unproductive'],
  ['tired', mi('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'), 'Tired'],
];
const moodOf = (k) => MOODS.find((m) => m[0] === k) || null;
const JOURNAL_TYPES = [
  ['daily', 'Daily diary'], ['random', 'Random thoughts'], ['opinion', 'Personal opinions'], ['realization', 'Life realizations'],
  ['gratitude', 'Gratitude'], ['experience', 'Things I experienced'], ['remember', 'Things I want to remember'], ['future', 'Future plans'],
];
const TECH_STAGES = ['Idea', 'Planning', 'In Progress', 'Testing', 'Completed'];
const TECH_AREAS = ['Website', 'Productivity app', 'Digital journal', 'Home lab', 'Linux', 'AI agent', 'Reverse engineering', 'Cybersecurity', 'Programming challenge'];
const LIB_CATS = ['YouTube', 'Documentary', 'Technology', 'Finance', 'AI', 'Cybersecurity', 'Book', 'Article', 'Entertainment'];
const BUCKET_CATS = ['Places', 'Experiences', 'Food', 'Outdoors', 'Social', 'Hobbies'];
const ORDER_STATUS = ['Ordered', 'Shipped', 'Arrived', 'Kept', 'Returned'];
const REMINDERS = [
  'Have you done something fun today that doesn’t involve your phone?',
  'Is there a walk you could take before dinner?',
  'Who could you message to plan something this week?',
  'What is one thing outside that you noticed today?',
  'Could you spend fifteen minutes doing nothing in particular?',
];
const IDEAS = ['Take a 20-minute walk without headphones', 'Cook a new recipe with one ingredient you have never used', 'Photograph three interesting textures near you', 'Read ten pages of a physical book', 'Message a friend you have not talked to lately', 'Visit a park or a café you have never tried', 'Learn one random fact and tell someone about it'];

/* ---------- State ---------- */
let S = null;
const STORE_KEY = 'mino.state.v2';

function defaultState() {
  return {
    v: 2,
    updated: 0,
    habits: HABITS.map((h, i) => ({ ...h, order: i, custom: false })),
    habitChecks: {},
    tasks: [],
    events: [],
    milestones: [],
    goalNotes: {},
    goalDrafts: {},
    resources: [],
    activities: [],
    journal: [],
    moods: {},
    pins: {},
    savings: [],
    screen: {},
    bucket: [],
    projects: [],
    library: [],
    wishlist: [],
    orders: [],
    workouts: [],
    courses: [],
    trades: [],
    sessions: [],
    chat: [],
    settings: { theme: 'system', savingsTarget: 1000, demo: false, scenes: { default: 'hollow', home: 'pond' }, chatJournal: false, reminders: true, moneyActive: false },
  };
}
function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base, ...raw };
  out.settings = { ...base.settings, ...(raw.settings || {}) };
  for (const k of Object.keys(base)) if (Array.isArray(base[k]) && !Array.isArray(out[k])) out[k] = [];
  if (!out.habits.length) out.habits = base.habits;
  /* Mood 'confident' became 'thinking'. Keep every saved day readable. */
  if (!out.moods || typeof out.moods !== 'object') out.moods = {};
  for (const day of Object.values(out.moods)) if (day && day.mood === 'confident') day.mood = 'thinking';
  /* 'Loved' was replaced by 'Unproductive'. Days saved with it keep their note and read as happy. */
  for (const day of Object.values(out.moods)) if (day && day.mood === 'loved') day.mood = 'happy';
  /* Pins live in one place, S.pins, so the mood scrapbook and History always agree. */
  if (!out.pins || typeof out.pins !== 'object') out.pins = {};
  for (const [d, day] of Object.entries(out.moods)) if (day && day.pinned) { out.pins[d] = true; delete day.pinned; }
  /* Goal notes were one plain text box per goal. Each one becomes its first saved note, so nothing is lost. */
  if (!out.goalNotes || typeof out.goalNotes !== 'object') out.goalNotes = {};
  for (const [g, v] of Object.entries(out.goalNotes)) {
    if (Array.isArray(v)) continue;
    const lines = String(v || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
    const at = out.updated || Date.now();
    out.goalNotes[g] = lines.length ? [{ id: `old-${g}`, html: lines.map((x) => `<p>${esc(x)}</p>`).join(''), photos: [], created: at, updated: at, pinned: false }] : [];
  }
  if (!out.goalDrafts || typeof out.goalDrafts !== 'object') out.goalDrafts = {};
  return out;
}

/* Mutate state, stamp it, save it, redraw. Every user action goes through here. */
function change(mutate) {
  if (mutate) mutate();
  S.updated = Date.now();
  persist();
  render();
}

/* ---------- Storage: this device always; the user's private database when the artifact runtime offers it ---------- */
const Store = { status: 'Saved on this device', ref: null, timer: null, writing: false, dirty: false, live: false };

function setStatus(text) {
  Store.status = text;
  const el = $('#status');
  if (el) el.textContent = text;
}
function saveLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: keep going in memory */ }
}
function loadLocal() {
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function persist() {
  saveLocal();
  if (!Store.ref) return;
  clearTimeout(Store.timer);
  Store.timer = setTimeout(flushDb, 350);
}
async function flushDb() {
  if (!Store.ref) return;
  if (Store.writing) { Store.dirty = true; return; }
  Store.writing = true;
  do {
    Store.dirty = false;
    try {
      await Store.ref.set(JSON.parse(JSON.stringify(S)));
      setStatus('Synced across your devices');
    } catch (e) {
      setStatus('Saved on this device · sync paused');
      break;
    }
  } while (Store.dirty);
  Store.writing = false;
}
function adoptRemote(data) {
  S = normalize(JSON.parse(JSON.stringify(data)));
  saveLocal();
  render();
}
async function initStorage() {
  const local = loadLocal();
  S = normalize(local);
  render();
  const useCap = (name) => (window.claude && typeof window.claude.use === 'function' ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
  const [user, db] = await Promise.all([useCap('user'), useCap('db')]);
  if (!user || !db) return;
  const id = await user.id().catch(() => null);
  if (!id) return;
  try {
    Store.ref = db.doc(`data/users/${id}/state`);
  } catch (e) { return; }
  setStatus('Connecting to your database…');
  const timer = setTimeout(() => { if (!Store.live) setStatus('Can’t reach sync yet · using this device’s copy'); }, 10000);
  Store.ref.onSnapshot((snap) => {
    const first = !Store.live && !snap.metadata.fromCache;
    if (first) { Store.live = true; clearTimeout(timer); }
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists) {
      // First visit on this account: move this device's data into the database.
      if (first && S.updated) flushDb();
      if (first) setStatus('Synced across your devices');
      return;
    }
    const data = snap.data();
    if (data && data.updated > S.updated) adoptRemote(data);
    setStatus('Synced across your devices');
  }, () => {
    clearTimeout(timer);
    setStatus('Saved on this device · sync paused');
  });
}

/* ---------- Actions: one delegated listener for clicks, changes and submits ---------- */
const ACT = {};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !ACT[el.dataset.act]) return;
  ACT[el.dataset.act](el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el && ACT[el.dataset.change]) ACT[el.dataset.change](el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest && e.target.closest('[data-input]');
  if (el && ACT[el.dataset.input]) ACT[el.dataset.input](el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.dataset && f.dataset.submit && ACT[f.dataset.submit]) { e.preventDefault(); ACT[f.dataset.submit](f, e); }
});

/* ---------- Forms in a dialog (validated; used for every add/edit) ---------- */
function fieldHTML(f) {
  const id = 'f_' + f.name;
  let input;
  if (f.type === 'select') {
    input = `<select class="input" name="${f.name}" id="${id}">${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(f.value ?? '') === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea class="input" name="${f.name}" id="${id}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${esc(f.value ?? '')}</textarea>`;
  } else {
    input = `<input class="input" name="${f.name}" id="${id}" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}"${f.min != null ? ` min="${f.min}"` : ''}${f.step ? ` step="${f.step}"` : ''}${f.type === 'number' ? ' inputmode="decimal"' : ''} autocomplete="off">`;
  }
  return `<label for="${id}">${esc(f.label)}${f.hint ? ` <span class="muted">· ${esc(f.hint)}</span>` : ''}${input}</label>`;
}
function openForm({ title, message = '', fields = [], submit = 'Save', danger = false, onSave }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'form-dialog';
  dlg.innerHTML = `<form class="dlg" novalidate>
    <h2>${esc(title)}</h2>
    ${message ? `<p class="muted">${esc(message)}</p>` : ''}
    ${fields.map(fieldHTML).join('')}
    <p class="err" role="alert"></p>
    <div class="actions">
      <button type="button" class="btn ghost" data-close>Cancel</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" type="submit">${esc(submit)}</button>
    </div></form>`;
  document.body.appendChild(dlg);
  const form = dlg.querySelector('form');
  dlg.addEventListener('close', () => dlg.remove());
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const vals = {};
    let err = '';
    for (const f of fields) {
      let v = String(form.elements[f.name].value ?? '').trim();
      if (f.required && !v) { err = `${f.label} is required.`; break; }
      if (f.type === 'number' && v !== '') {
        v = Number(v);
        if (!Number.isFinite(v) || (f.min != null && v < f.min)) { err = `${f.label} needs a number${f.min != null ? ` of at least ${f.min}` : ''}.`; break; }
      }
      if (f.type === 'url' && v && !/^https?:\/\//i.test(v)) { err = 'Links need to start with https://'; break; }
      if (f.maxLen && String(v).length > f.maxLen) { err = `${f.label} is longer than ${f.maxLen} characters.`; break; }
      vals[f.name] = v;
    }
    if (!err && onSave) err = onSave(vals) || '';
    if (err) { dlg.querySelector('.err').textContent = err; return; }
    dlg.close();
  });
  dlg.showModal();
  setTimeout(() => { const first = form.querySelector('input, textarea, select'); if (first) first.focus(); }, 40);
}
function confirmDelete(message, onYes, label = 'Delete') {
  openForm({ title: label === 'Delete' ? 'Delete this?' : 'Are you sure?', message, submit: label, danger: true, onSave: () => { onYes(); return ''; } });
}

/* ---------- Toast ---------- */
function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Router ---------- */
const NAV = [
  ['home', 'Home', '◐'], ['goals', 'My Goals', '◎'], ['calendar', 'Calendar', '▦'],
  ['history', 'History', '✿'], ['analytics', 'Analytics', '↗'], ['journal', 'Journal', '✎'], ['mood', 'Mood', '☺'], ['metime', 'Me Time', '☀'],
  ['savings', 'Savings', '₱'], ['screen', 'Screen Time', '◷'], ['techlab', 'Tech Lab', '⌘'], ['library', 'Library', '❏'],
  ['preferences', 'Settings', '⚙'],
];
const BOTTOM = ['home', 'goals', 'journal', 'mood'];
const BOTTOM_LABEL = { home: 'Home', goals: 'Goals', journal: 'Journal', mood: 'Mood' };
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')) || 'home';
  if (h.startsWith('goal-')) return { name: 'goal', param: h.slice(5) };
  return { name: h, param: null };
}
function buildNav() {
  const side = $('#sidebar');
  side.innerHTML = `<div class="brand" style="padding:4px 12px 18px">Willow</div>` + NAV.map(([id, label, ico]) =>
    `<a class="side-link" href="#${id}" data-nav="${id}"><span aria-hidden="true">${ico}</span>${label}</a>`).join('');
  const bottom = $('#bottom');
  bottom.innerHTML = BOTTOM.map((id) => {
    const ico = NAV.find((n) => n[0] === id)[2];
    return `<a class="nav-btn" href="#${id}" data-nav="${id}"><span class="ico" aria-hidden="true">${ico}</span>${BOTTOM_LABEL[id]}</a>`;
  }).join('') + `<button class="nav-btn" type="button" data-act="more"><span class="ico" aria-hidden="true">≡</span>More</button>`;
}
ACT.more = () => {
  const sheet = document.createElement('div');
  sheet.innerHTML = `<div class="sheet-backdrop" data-act="closeMore"></div>
    <div class="sheet" role="dialog" aria-label="All sections"><div class="card-head"><h2>Everywhere in Willow</h2><button class="btn ghost small" type="button" data-act="closeMore">Close</button></div>
    <div class="more-grid">${NAV.map(([id, label, ico]) => `<a class="btn" style="flex-direction:column;padding:14px 8px;background:var(--surface-2);border-radius:16px;font-size:13px" href="#${id}" data-act="closeMore"><span aria-hidden="true" style="font-size:18px">${ico}</span>${label}</a>`).join('')}</div></div>`;
  sheet.id = 'more-sheet';
  document.body.appendChild(sheet);
};
ACT.closeMore = () => { const s = $('#more-sheet'); if (s) s.remove(); };

function render() {
  if (!S) return;
  const { name, param } = route();
  const views = window.VIEWS || {};
  const fn = views[name] || views.home;
  if (!fn) return;
  const main = $('#view');
  const y = window.scrollY;
  main.innerHTML = fn(param);
  const current = name === 'goal' ? 'goals' : name;
  $$('[data-nav]').forEach((a) => {
    if (a.dataset.nav === current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  applyTheme();
  applyColours();
  applyScene(sceneKey(name, param));
  if (window.hydratePhotos) hydratePhotos();
  setStatus(Store.status);
  if (y && y !== window.scrollY) window.scrollTo(0, y);
}
window.addEventListener('hashchange', () => { ACT.closeMore(); window.scrollTo(0, 0); render(); });

function applyTheme() {
  const t = S.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}

/* ---------- Shared data helpers ---------- */
function activitiesOn(ymd) { return S.activities.filter((a) => a.date === ymd); }
function habitsDoneOn(ymd) {
  const checks = S.habitChecks[ymd] || {};
  return S.habits.filter((h) => checks[h.id]).length;
}
function dayScore(ymd) {
  return activitiesOn(ymd).length + habitsDoneOn(ymd) + S.journal.filter((j) => j.date === ymd).length;
}
function level(score) { return score === 0 ? 0 : score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4; }
function addActivity(a) {
  S.activities.push({ id: uid(), date: a.date || todayYMD(), category: a.category, goalId: a.goalId || null, title: a.title || CATS[a.category]?.label || 'Activity', minutes: Number(a.minutes) || 0, offline: !!(a.offline ?? CATS[a.category]?.offline), note: a.note || '', demo: !!a.demo, checklist: !!a.checklist, meKey: a.meKey || '' });
}
function savingsBalance() { return S.savings.reduce((t, s) => t + (s.kind === 'deposit' ? s.amount : -s.amount), 0); }
function weekSaved(ymd) {
  const start = weekStart(ymd), end = addDays(start, 6);
  return S.savings.filter((s) => s.date >= start && s.date <= end).reduce((t, s) => t + (s.kind === 'deposit' ? s.amount : -s.amount), 0);
}
function screenTotal(ymd) { const s = S.screen[ymd]; return s ? s.total : null; }
function avgScreen(days) {
  const vals = days.map(screenTotal).filter((v) => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
