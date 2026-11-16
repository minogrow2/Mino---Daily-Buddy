/* Willow kit: scenes, device-local photos (IndexedDB), rich-text cleaning, Manila clock, reminders, runtime capabilities. */

/* ---------- Scenes: one still behind a page. Chosen in Settings, or per goal. ---------- */
const SCENES = [
  { key: 'pond', label: 'Fishing by the pond', file: 'img/scene-fishing.jpg', thumb: 'img/thumb-fishing.jpg' },
  { key: 'desk', label: 'Reading at the desk', file: 'img/scene-desk.jpg', thumb: 'img/thumb-desk.jpg' },
  { key: 'bath', label: 'Bathhouse', file: 'img/scene-bath.jpg', thumb: 'img/thumb-bath.jpg' },
  { key: 'hill', label: 'Grassy hill', file: 'img/scene-grass.jpg', thumb: 'img/thumb-grass.jpg' },
  { key: 'hollow', label: 'Forest hollow', file: 'img/scene-hollow.jpg', thumb: 'img/thumb-hollow.jpg' },
  { key: 'sunset', label: 'Running at sunset', file: 'img/bg-000.jpg', thumb: 'img/thumb-000.jpg' },
  { key: 'umbrella', label: 'Under a big umbrella', file: 'img/bg-003.jpg', thumb: 'img/thumb-003.jpg' },
  { key: 'nightforest', label: 'Glowing forest at night', file: 'img/bg-004.jpg', thumb: 'img/thumb-004.jpg' },
  { key: 'straw', label: 'Straw hat in the grass', file: 'img/bg-005.jpg', thumb: 'img/thumb-005.jpg' },
  { key: 'redhouse', label: 'Red bathhouse and dragon', file: 'img/bg-006.jpg', thumb: 'img/thumb-006.jpg' },
  { key: 'neon', label: 'Neon city at night', file: 'img/goal-cs.jpg', thumb: 'img/thumb-007.jpg' },
  { key: 'mosaic', label: 'Mosaic forest', file: 'img/bg-010.jpg', thumb: 'img/thumb-010.jpg' },
  { key: 'bookshop', label: 'Book shop with a cat', file: 'img/goal-reading.jpg', thumb: 'img/thumb-011.jpg' },
  { key: 'shrine', label: 'Quiet shrine in the forest', file: 'img/bg-012.jpg', thumb: 'img/thumb-012.jpg' },
  { key: 'pinkcrowd', label: 'Pink crowd by the water', file: 'img/bg-013.jpg', thumb: 'img/thumb-013.jpg' },
  { key: 'flying', label: 'Girl flying over clouds', file: 'img/bg-014.jpg', thumb: 'img/thumb-014.jpg' },
];
const GOAL_TINT = { trading: '#E2BE5E', ai: '#8FB8D8', glow: '#F0A1AE', tech: '#9CC7A9', money: '#E8A97E', reading: '#B9A3D6', cs: '#A9C48F' };

function sceneKey(name, param) { return name === 'goal' ? `goal-${param}` : name; }
/* settings.scenes[key] = a scene key, 'none' (plain), or '' / missing (inherit from default). */
function sceneFor(key) {
  const map = (S && S.settings && S.settings.scenes) || {};
  let v = map[key];
  if (v === undefined || v === '') v = map.default;
  return SCENES.find((s) => s.key === v) || null;
}
function applyScene(key) {
  const s = sceneFor(key);
  const el = $('#scene');
  if (el) el.style.setProperty('--scene-img', s ? `url("${s.file}")` : 'none');
  document.documentElement.dataset.scene = s ? s.key : 'none';
}
/* Options for a scene <select>. */
function sceneOptions(current, inheritLabel) {
  const rows = [];
  if (inheritLabel) rows.push(`<option value="" ${!current ? 'selected' : ''}>${esc(inheritLabel)}</option>`);
  rows.push(`<option value="none" ${current === 'none' ? 'selected' : ''}>Plain cream, no picture</option>`);
  for (const s of SCENES) rows.push(`<option value="${s.key}" ${current === s.key ? 'selected' : ''}>${esc(s.label)}</option>`);
  return rows.join('');
}
ACT.setScene = (el) => change(() => {
  S.settings.scenes = S.settings.scenes || {};
  const v = el.value;
  if (v === '') delete S.settings.scenes[el.dataset.key];
  else S.settings.scenes[el.dataset.key] = v;
});

/* Thumbnail picker: value '' means inherit, 'none' means plain cream, otherwise a scene key. */
function scenePicker(key, current, inherit) {
  const tile = (value, label, thumb) => `<button type="button" class="scene-tile${current === value ? ' on' : ''}" data-act="pickScene" data-key="${key}" data-value="${value}" aria-pressed="${current === value}">
    ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : '<span class="scene-plain" aria-hidden="true"></span>'}
    <span class="scene-label">${esc(label)}</span></button>`;
  const rows = [];
  if (inherit) rows.push(tile('', inherit, null));
  rows.push(tile('none', 'Plain cream', null));
  for (const sc of SCENES) rows.push(tile(sc.key, sc.label, sc.thumb));
  return `<div class="scene-grid">${rows.join('')}</div>`;
}
ACT.pickScene = (el) => change(() => {
  S.settings.scenes = S.settings.scenes || {};
  const v = el.dataset.value;
  if (v === '') delete S.settings.scenes[el.dataset.key];
  else S.settings.scenes[el.dataset.key] = v;
});

/* ---------- Manila clock ---------- */
const CLOCK_FMT = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
const clockText = () => CLOCK_FMT.format(new Date());
function tickClock() { const el = $('#home-clock'); if (el) el.textContent = clockText(); }
function startClock() { tickClock(); setInterval(tickClock, 1000); }

/* ---------- Reminders: an in-app banner, checked every 30 seconds. Once a day after 10:00 Manila, dismissible. ---------- */
const REMIND_KEY = 'mino.reminded';
function remindedToday() { try { return localStorage.getItem(REMIND_KEY) === todayYMD(); } catch (e) { return false; } }
function checkReminder() {
  const box = $('#reminder');
  if (!box || !S) return;
  const on = S.settings.reminders !== false;
  const due = on && hourManila() >= 10 && !remindedToday();
  if (due && box.hidden) {
    $('#reminder-text').textContent = REMINDERS[parseInt(todayYMD().slice(-2), 10) % REMINDERS.length];
    box.hidden = false;
  } else if (!due && !box.hidden && !on) {
    box.hidden = true;
  }
}
ACT.dismissReminder = () => {
  try { localStorage.setItem(REMIND_KEY, todayYMD()); } catch (e) { /* storage blocked: it returns tomorrow at worst */ }
  const box = $('#reminder');
  if (box) box.hidden = true;
};
function startReminders() { checkReminder(); setInterval(checkReminder, 30000); }

/* ---------- Runtime capabilities. Each is null when this view cannot use it. ---------- */
const Caps = { sample: undefined };
async function loadCaps() {
  const s = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('sample').catch(() => null) : null;
  Caps.sample = s || null;
  updateChatNotice();
}
async function sampleCap() {
  if (Caps.sample !== undefined) return Caps.sample;
  await loadCaps();
  return Caps.sample;
}
function updateChatNotice() {
  const el = $('#chat-notice');
  if (!el) return;
  el.textContent = Caps.sample === null ? 'Willow can’t reply on this page yet. Claude permission is needed. Your checklist, goals and journal work without it.' : '';
  el.hidden = Caps.sample !== null;
}

/* ---------- Photos: compressed on this device and stored in IndexedDB, never in the synced state ---------- */
const Media = { db: null, urls: new Map() };
function mediaDB() {
  if (Media.db) return Promise.resolve(Media.db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('mino-media', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('blobs');
    req.onsuccess = () => { Media.db = req.result; resolve(Media.db); };
    req.onerror = () => reject(req.error);
  });
}
async function mediaTx(mode, fn) {
  const db = await mediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', mode);
    const req = fn(tx.objectStore('blobs'));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
const mediaPut = (id, blob) => mediaTx('readwrite', (os) => os.put(blob, id));
const mediaGet = (id) => mediaTx('readonly', (os) => os.get(id));
const mediaDel = (id) => mediaTx('readwrite', (os) => os.delete(id));
function forgetPhoto(id) {
  const url = Media.urls.get(id);
  if (url) URL.revokeObjectURL(url);
  Media.urls.delete(id);
}
const pendingPhotos = new Set();
async function hydratePhotos() {
  for (const img of document.querySelectorAll('img[data-photo]')) {
    const id = img.dataset.photo;
    let url = Media.urls.get(id);
    if (!url && !pendingPhotos.has(id)) {
      pendingPhotos.add(id);
      try {
        const blob = await mediaGet(id);
        if (blob) { url = URL.createObjectURL(blob); Media.urls.set(id, url); }
      } catch (e) { /* IndexedDB blocked: show the placeholder */ }
      pendingPhotos.delete(id);
    }
    if (url) img.src = url;
    else img.alt = 'Photo not available on this device';
  }
}
/* Resize to at most 1400px on the long side and encode as JPEG at 0.8. */
async function compressPhoto(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.8));
}

/* ---------- Rich text: only bold, italic, underline, lists, quotes and paragraphs survive. Attributes are dropped. ---------- */
const RICH_KEEP = new Set(['B', 'I', 'U', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'P', 'BR']);
const RICH_RENAME = { STRONG: 'B', EM: 'I', DIV: 'P' };
const RICH_DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'SVG', 'TEMPLATE', 'INPUT', 'BUTTON']);
function sanitizeRich(html) {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${String(html || '')}`, 'text/html');
  const walk = (node) => {
    for (const el of [...node.childNodes]) {
      if (el.nodeType === 3) continue;
      /* A tick box keeps only its type and whether it is ticked. */
      if (el.nodeType === 1 && el.tagName === 'INPUT' && (el.getAttribute('type') || '').toLowerCase() === 'checkbox') {
        const box = doc.createElement('input');
        box.setAttribute('type', 'checkbox');
        if (el.hasAttribute('checked')) box.setAttribute('checked', '');
        el.replaceWith(box);
        continue;
      }
      if (el.nodeType !== 1 || RICH_DROP.has(el.tagName)) { el.remove(); continue; }
      walk(el);
      while (el.attributes.length) el.removeAttribute(el.attributes[0].name);
      const want = RICH_RENAME[el.tagName] || el.tagName;
      if (want !== el.tagName) {
        const n = doc.createElement(want);
        n.append(...el.childNodes);
        el.replaceWith(n);
      } else if (!RICH_KEEP.has(el.tagName)) {
        el.replaceWith(...el.childNodes);
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
const richPlain = (html) => sanitizeRich(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* One toolbar and one editable area. The mood explanation and the quick journal both use it; extra attributes (such as data-rt) are passed in. */
function richEditorShell({ label, placeholder, html = '', attrs = '', checklist = false }) {
  return `<div class="rt-wrap">
    <div class="rt-bar" role="toolbar" aria-label="Text formatting">
      <button class="rt-btn" type="button" data-act="fmt" data-cmd="bold" aria-label="Bold"><b>B</b></button>
      <button class="rt-btn" type="button" data-act="fmt" data-cmd="italic" aria-label="Italic"><i>I</i></button>
      <button class="rt-btn" type="button" data-act="fmt" data-cmd="underline" aria-label="Underline"><u>U</u></button>
      <button class="rt-btn" type="button" data-act="fmt" data-cmd="insertUnorderedList">• List</button>
      <button class="rt-btn" type="button" data-act="fmt" data-cmd="insertOrderedList">1. List</button>
      <button class="rt-btn" type="button" data-act="fmt" data-cmd="formatBlock" data-arg="blockquote">“ Quote</button>
      ${checklist ? '<button class="rt-btn" type="button" data-act="fmt" data-cmd="checkbox" aria-label="Insert a tick box">☐ Checkbox</button>' : ''}
    </div>
    <div class="rt" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${esc(label)}" data-placeholder="${esc(placeholder)}" ${attrs}>${sanitizeRich(html)}</div>
  </div>`;
}

/* Mood-chat reply errors, in the viewer’s words. */
function copyForSample(code) {
  switch (code) {
    case 'cancelled': return '';
    case 'not_granted': return 'Willow needs your permission to reply. Allow it from this page’s Permissions menu, then send again.';
    case 'rate_limited': return 'Too many messages in a short time. Wait a little, then try again.';
    case 'session_expired': return 'Please sign in again to chat with Willow. Your message is saved.';
    case 'refused': return 'Willow couldn’t answer that one. Try asking in a different way.';
    case 'prompt_too_large': return 'This conversation has become too long. Clear it and start again.';
    case 'empty_completion': return 'Willow had nothing to add. Try asking in a different way.';
    default: return 'Willow couldn’t reply this time. Your message is saved; try again in a moment.';
  }
}

/* ---------- Your colours: big boxes, small boxes and the main colour, set in Settings. Nothing chosen means the built-in look. ---------- */
const COLOUR_GROUPS = {
  big: { label: 'Big boxes', hint: 'The large cards behind each page.', fallback: '#f6f7ee', presets: [['#f6f7ee', 'Cream glass'], ['#fffdf9', 'Paper'], ['#e6f0fa', 'Sky'], ['#f2eaf8', 'Lilac'], ['#2c2320', 'Cocoa']] },
  small: { label: 'Small boxes', hint: 'Mood buttons, tick boxes, inputs, calendar and heatmap squares.', fallback: '#a6c29f', presets: [['#a6c29f', 'Sage'], ['#a9c6e0', 'Blue'], ['#f2c6a8', 'Peach'], ['#c9b8e6', 'Lavender'], ['#e9d98c', 'Butter']] },
  main: { label: 'Main colour', hint: 'Solid buttons, selected states and the highlights.', fallback: '#a9535f', presets: [['#a9535f', 'Rose'], ['#7d4a8c', 'Plum'], ['#3f7f7a', 'Teal'], ['#d9735b', 'Coral'], ['#3e5c8a', 'Navy']] },
};
const isHexColour = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ''));
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixColour(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
/* Dark text on light colours, light text on dark ones. */
function inkFor(h) { const [r, g, b] = hexRgb(h); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#3d2e2a' : '#ffffff'; }
function isDarkNow() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
/* Writes the colour tokens onto the page root. Inline values win over the built-in palette in both themes. */
function applyColours(colours = (S && S.settings && S.settings.colors) || {}) {
  const st = document.documentElement.style;
  const put = (name, value) => (value ? st.setProperty(name, value) : st.removeProperty(name));
  const pick = (k) => (isHexColour(colours[k]) ? colours[k].toLowerCase() : '');
  const big = pick('big'), small = pick('small'), main = pick('main');
  const dark = isDarkNow();
  const base = dark ? '#2c2320' : '#ffffff';
  /* The card is see-through, so its real colour is the big colour mixed with the page behind it. Text is picked against that. */
  const backdrop = dark ? '#2c2320' : '#f6f7ee';
  const cardColour = big ? mixColour(big, backdrop, 0.4) : '';
  put('--card-fill', big ? `color-mix(in srgb, ${big} 60%, transparent)` : '');
  put('--card-ink', big ? inkFor(cardColour) : '');
  put('--muted', big ? mixColour(inkFor(cardColour), cardColour, 0.35) : '');
  put('--sage', small);
  put('--sage-line', small ? mixColour(small, '#000000', 0.3) : '');
  put('--fill-soft', small);
  put('--fill-deep', small ? mixColour(small, '#000000', 0.12) : '');
  put('--rose', main);
  put('--rose-ink', main ? inkFor(main) : '');
  put('--pink', main ? mixColour(main, base, dark ? 0.7 : 0.72) : '');
  put('--pink-soft', main ? mixColour(main, base, dark ? 0.84 : 0.88) : '');
}
