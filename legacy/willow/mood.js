/* Mood: the mood picker, a rich-text explanation with photos, a day picker, and the Mood page. */
const MOOD_UI = { date: null };
const MOOD_NOTES = { sad: 'It’s okay to feel low. Be kind to yourself today.', stressed: 'Take it slowly. Breathing out longer than you breathe in can help.', tired: 'Rest counts. Maybe a short nap or an early night.' };

/* Keep the toolbar’s text selection when a formatting button is pressed. */
document.addEventListener('mousedown', (e) => { if (e.target.closest && e.target.closest('.rt-bar')) e.preventDefault(); });

/* A tick box in rich text. Ticking it writes the state into the markup, so the saved entry keeps it. */
function insertCheckbox(ed) {
  const sel = window.getSelection();
  let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  if (!range || !ed.contains(range.startContainer)) { range = document.createRange(); range.selectNodeContents(ed); range.collapse(false); }
  const box = document.createElement('input');
  box.type = 'checkbox';
  const space = document.createTextNode(' ');
  range.deleteContents();
  range.insertNode(space);
  range.insertNode(box);
  range.setStartAfter(space);
  range.collapse(true);
  if (sel) { sel.removeAllRanges(); sel.addRange(range); }
}
document.addEventListener('change', (e) => {
  const box = e.target;
  if (!box || box.tagName !== 'INPUT' || box.type !== 'checkbox') return;
  const rt = box.closest && box.closest('.rt');
  if (!rt) return;
  box.toggleAttribute('checked', box.checked);
  rt.dispatchEvent(new Event('input', { bubbles: true }));
});

function richEditor(ymd, entry) {
  const start = entry.html || (entry.note ? `<p>${esc(entry.note)}</p>` : '');
  return richEditorShell({ label: 'What is behind this mood?', placeholder: 'What is behind it? Write as much or as little as you like.', html: start, attrs: `data-rt="${ymd}" data-input="rich"` });
}

function moodButtonsHTML(ymd) {
  const cur = (S.moods[ymd] || {}).mood || null;
  return MOODS.map(([k, e, label]) => `<button class="mood-btn" type="button" data-act="setMood" data-date="${ymd}" data-mood="${k}" aria-pressed="${cur === k}"><span class="e" aria-hidden="true">${e}</span>${label}</button>`).join('');
}
function moodCard(ymd, { compact = false } = {}) {
  const t = todayYMD();
  const entry = S.moods[ymd] || {};
  const cur = entry.mood || null;
  const btns = moodButtonsHTML(ymd);
  const photos = (entry.photos || []).map((id) => `<figure class="photo"><img data-photo="${esc(id)}" alt="Photo from this day" loading="lazy"><figcaption><button class="btn ghost small" type="button" data-act="delPhoto" data-id="${esc(id)}" data-date="${ymd}">Remove photo</button></figcaption></figure>`).join('');
  const body = `<div class="moods" role="group" aria-label="Choose a mood">${btns}</div>
    ${cur && MOOD_NOTES[cur] ? `<p class="small" style="margin-top:10px">${esc(MOOD_NOTES[cur])}</p>` : ''}
    <div style="margin-top:14px">${richEditor(ymd, entry)}</div>
    <div class="row-inline" style="margin-top:12px;justify-content:space-between">
      <label class="btn soft small photo-add">+ Add photo<input class="sr-only" type="file" accept="image/*" multiple data-change="addPhotos" data-date="${ymd}"></label>
      <span class="small muted">Photos stay on this device.</span>
    </div>
    ${photos ? `<div class="photo-grid">${photos}</div>` : ''}
    ${compact ? `<div>${meTimeHTML(ymd)}</div>` : ''}
    <p class="small muted" style="margin-top:10px">Never assumed. Nothing here decides what your mood means. You interpret your own patterns.</p>`;
  const eyebrow = ymd === t ? 'Today' : fmtDay(ymd, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return card(compact ? 'How are you feeling?' : 'Mood and why', body, { eyebrow, id: 'mood-card' });
}

/* Autosave the explanation as they type. Never re-renders, so the caret stays where it is. */
ACT.rich = (el) => {
  const ymd = el.dataset.rt;
  const prev = S.moods[ymd] || { mood: null };
  const html = sanitizeRich(el.innerHTML);
  const next = { ...prev, html, note: '' };
  if (!next.mood && !html && !(next.photos || []).length) delete S.moods[ymd];
  else S.moods[ymd] = next;
  S.updated = Date.now();
  persist();
};
ACT.fmt = (el) => {
  const wrap = el.closest('.rt-wrap');
  const ed = wrap && wrap.querySelector('.rt');
  if (!ed) return;
  ed.focus();
  if (el.dataset.cmd === 'checkbox') insertCheckbox(ed);
  else document.execCommand(el.dataset.cmd, false, el.dataset.arg || null);
  if (ed.dataset.rt) ACT.rich(ed);
  else if (ed.dataset.input === 'goalNote') ACT.goalNote(ed);
};
ACT.setMood = (el) => {
  const ymd = el.dataset.date || todayYMD();
  change(() => {
    const prev = S.moods[ymd] || {};
    S.moods[ymd] = { ...prev, mood: el.dataset.mood, note: prev.note || '' };
  });
};
ACT.addPhotos = async (el) => {
  const ymd = el.dataset.date;
  const files = [...el.files].slice(0, 6);
  el.value = '';
  if (!files.length) return;
  const ids = [];
  for (const file of files) {
    try {
      const blob = await compressPhoto(file);
      const id = uid();
      await mediaPut(id, blob);
      ids.push(id);
    } catch (e) {
      toast('One photo couldn’t be read here. Try a JPEG or PNG.');
    }
  }
  if (!ids.length) return;
  change(() => {
    const prev = S.moods[ymd] || { mood: null };
    S.moods[ymd] = { ...prev, photos: [...(prev.photos || []), ...ids] };
  });
  toast(ids.length === 1 ? 'Photo added to this day.' : `${ids.length} photos added to this day.`);
};
ACT.delPhoto = (el) => confirmDelete('Remove this photo? It is deleted from this device.', () => {
  const ymd = el.dataset.date, id = el.dataset.id;
  mediaDel(id).catch(() => {});
  forgetPhoto(id);
  change(() => {
    const e = S.moods[ymd];
    if (e) e.photos = (e.photos || []).filter((x) => x !== id);
  });
});
ACT.moodDate = (el) => { MOOD_UI.date = el.value && el.value <= todayYMD() ? el.value : null; render(); };
ACT.moodToday = () => { MOOD_UI.date = null; render(); };

window.VIEWS.mood = () => {
  const t = todayYMD();
  const day = MOOD_UI.date || t;
  const days30 = rangeDays(t, 30);
  const dist = MOODS.map(([k, e, label]) => ({ k, e, label, n: days30.filter((d) => S.moods[d] && S.moods[d].mood === k).length }));
  const maxN = Math.max(1, ...dist.map((x) => x.n));
  const routines = MOODS.map(([k, e, label]) => {
    const ds = days30.filter((d) => S.moods[d] && S.moods[d].mood === k);
    if (!ds.length) return null;
    const avgHab = Math.round(ds.reduce((s, d) => s + habitsDoneOn(d), 0) / ds.length * 10) / 10;
    const scr = ds.map(screenTotal).filter((v) => v != null);
    return `<tr><td>${e} ${label}</td><td class="num">${ds.length}</td><td class="num">${avgHab}</td><td class="num">${scr.length ? hm(scr.reduce((a, b) => a + b, 0) / scr.length) : '—'}</td></tr>`;
  }).filter(Boolean).join('');
  const logged = Object.entries(S.moods)
    .filter(([, m]) => m.mood || m.html || m.note || (m.photos || []).length)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const mGrid = (() => {
    const first = monthStart(day);
    const lead = (dowOf(first) + 6) % 7;
    let c = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<div class="dow">${x}</div>`).join('');
    for (let i = 0; i < lead; i++) c += '<div class="day blank"></div>';
    for (let k = 1; k <= daysInMonth(first); k++) {
      const ymd = `${first.slice(0, 7)}-${String(k).padStart(2, '0')}`;
      const m = S.moods[ymd] && S.moods[ymd].mood ? moodOf(S.moods[ymd].mood) : null;
      c += `<div class="day ${ymd === t ? 'today' : ''}" style="background:${m ? 'var(--surface-2)' : 'transparent'};font-size:15px">${m ? m[1] : k}</div>`;
    }
    return `<div class="month-grid">${c}</div>`;
  })();
  const distHTML = `<div class="grid" style="gap:8px">${dist.map((x) => `<div class="row-inline" style="gap:10px"><span style="width:110px">${x.e} ${x.label}</span><div class="bar grow"><span style="width:${pct(x.n, maxN)}%"></span></div><span class="num small" style="width:24px;text-align:right">${x.n}</span></div>`).join('')}</div>`;
  return `<div class="grid">
    <div><div class="eyebrow">Mood</div><h1>How are you, really?</h1></div>
    <div class="row-inline">
      <label class="small muted row-inline" style="gap:8px">Day <input class="input" type="date" value="${day}" max="${t}" data-change="moodDate" style="width:auto"></label>
      ${day !== t ? '<button class="btn ghost small" type="button" data-act="moodToday">Back to today</button>' : ''}
    </div>
    <div class="grid two">
      ${moodCard(day)}
      ${card('Last 30 days', distHTML, { eyebrow: 'Distribution' })}
    </div>
    <div class="grid two">
      ${card('Mood calendar', mGrid, { eyebrow: fmtMonth(day) })}
      ${card('Patterns next to routines', routines ? `<div class="table-scroll"><table class="simple"><thead><tr><th>Mood</th><th>Days</th><th>Habits (avg)</th><th>Screen (avg)</th></tr></thead><tbody>${routines}</tbody></table></div><p class="small muted" style="margin-top:8px">Side by side, not cause and effect.</p>` : '<div class="empty">Log a few moods and this will show them next to your routines.</div>', { eyebrow: 'Last 30 days' })}
    </div>
    ${card('Scrapbook', scrapbookHTML(logged), { eyebrow: 'History' })}
  </div>`;
};
/* ---------- Scrapbook: logged days as pages. Tap a page to open it; pin the ones to keep at the top. ---------- */
const SCRAP = { more: false };
const SCRAP_TONES = ['pink', 'butter', 'sage'];
const PIN_ICON = mi('<path d="M9 3.5h6l-1 5.5 3 3.2H7l3-3.2-1-5.5z"/><path d="M12 12.2V21"/>');
/* Plain words of a day’s note, decoded, so it is escaped only once when shown. */
function plainOf(html) {
  /* Tick boxes read as a mark, so a ticked item still shows in the snippet. */
  const spaced = sanitizeRich(html).replace(/<input type="checkbox"[^>]*>/g, (m) => (/checked/.test(m) ? '☑ ' : '☐ ')).replace(/<br>|<\/(p|li|blockquote)>/g, ' ');
  const doc = new DOMParser().parseFromString(`<body>${spaced}`, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
const scrapText = (m) => (m.html ? plainOf(m.html) : String(m.note || '').trim());
function scrapCard(d, m, i) {
  const pinned = isPinned(d);
  const mm = m.mood ? moodOf(m.mood) : null;
  const photos = m.photos || [];
  const snip = scrapText(m).slice(0, 140);
  const date = fmtDay(d, { weekday: 'short', month: 'short', day: 'numeric' });
  const media = photos.length
    ? `<span class="scrap-photo"><img data-photo="${esc(photos[0])}" alt="Photo from ${esc(date)}" loading="lazy">${photos.length > 1 ? `<span class="scrap-count">+${photos.length - 1}</span>` : ''}</span>`
    : (mm ? `<span class="scrap-sticker" aria-hidden="true">${mm[1]}</span>` : '');
  return `<article class="scrap tone-${SCRAP_TONES[i % 3]} tilt-${i % 4}${pinned ? ' is-pinned' : ''}">
    <button class="scrap-open" type="button" data-act="openDay" data-date="${d}" aria-label="Open ${esc(date)}">
      ${media}
      <span class="scrap-date">${esc(date)}</span>
      ${mm ? `<span class="scrap-mood">${mm[1]}<span>${esc(mm[2])}</span></span>` : ''}
      ${snip ? `<span class="scrap-note">${esc(snip)}</span>` : ''}
      <span class="scrap-link">Open</span>
    </button>
    <button class="scrap-pin" type="button" data-act="pinMood" data-date="${d}" aria-pressed="${!!pinned}" aria-label="${pinned ? 'Unpin' : 'Pin'} ${esc(date)}" title="${pinned ? 'Unpin' : 'Pin to the top'}">${PIN_ICON}</button>
  </article>`;
}
function scrapbookHTML(logged) {
  if (!logged.length) return '<div class="empty">No moods logged yet. Your scrapbook starts with the first day you log.</div>';
  const pinned = logged.filter(([d]) => isPinned(d));
  const unpinned = logged.filter(([d]) => !isPinned(d));
  const shown = SCRAP.more ? unpinned : unpinned.slice(0, 18);
  const older = unpinned.length - shown.length;
  const block = (rows, offset) => `<div class="scrapbook">${rows.map(([d, m], i) => scrapCard(d, m, i + offset)).join('')}</div>`;
  return `<p class="small muted">Tap a page to open it. Pin the days you want to keep at the top.</p>
    ${pinned.length ? `<div class="scrap-sub">Pinned</div>${block(pinned, 0)}` : ''}
    ${shown.length ? `${pinned.length ? '<div class="scrap-sub">Recent</div>' : ''}${block(shown, pinned.length)}` : ''}
    ${older > 0 || SCRAP.more ? `<div class="row-inline" style="justify-content:center;margin-top:16px"><button class="btn soft small" type="button" data-act="scrapMore">${SCRAP.more ? 'Show fewer' : `Show ${older} older day${older === 1 ? '' : 's'}`}</button></div>` : ''}`;
}
function scrapDayHTML(ymd) {
  const m = S.moods[ymd] || {};
  const mm = m.mood ? moodOf(m.mood) : null;
  const photos = m.photos || [];
  const text = m.html ? `<div class="rt-view scrap-text">${sanitizeRich(m.html)}</div>` : (m.note ? `<p class="scrap-text" style="white-space:pre-wrap">${esc(m.note)}</p>` : '');
  return `<div class="dlg scrap-day">
    <div class="scrap-head">
      <div><div class="eyebrow">${esc(fmtDay(ymd, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div><h2>${mm ? esc(mm[2]) : 'A day to keep'}</h2></div>
      ${mm ? `<span class="scrap-sticker big" aria-hidden="true">${mm[1]}</span>` : ''}
    </div>
    ${mm && MOOD_NOTES[m.mood] ? `<p class="small muted">${esc(MOOD_NOTES[m.mood])}</p>` : ''}
    ${text || '<p class="small muted">Nothing written for this day.</p>'}
    ${photos.length ? `<div class="scrap-gallery">${photos.map((id) => `<figure class="photo"><img data-photo="${esc(id)}" alt="Photo from ${esc(fmtDay(ymd, { month: 'short', day: 'numeric' }))}" loading="lazy"></figure>`).join('')}</div>` : ''}
    <div class="actions scrap-actions">
      <button class="btn soft small" type="button" data-act="pinMood" data-date="${ymd}" aria-pressed="${!!isPinned(ymd)}">${isPinned(ymd) ? 'Unpin from scrapbook' : 'Pin to scrapbook'}</button>
      <button class="btn ghost small" type="button" data-act="editScrapDay" data-date="${ymd}">Edit this day</button>
      <button class="btn primary small" type="button" data-act="closeScrap">Close</button>
    </div>
  </div>`;
}
function fillScrapDialog(ymd) {
  let d = $('#scrap-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'scrap-dlg';
    d.className = 'form-dialog scrap-dialog';
    document.body.appendChild(d);
  }
  d.dataset.day = ymd;
  d.innerHTML = scrapDayHTML(ymd);
  if (!d.open) d.showModal();
  hydratePhotos();
}
ACT.openDay = (el) => fillScrapDialog(el.dataset.date);
ACT.closeScrap = () => { const d = $('#scrap-dlg'); if (d && d.open) d.close(); };
ACT.pinMood = (el) => togglePin(el.dataset.date);
ACT.editScrapDay = (el) => {
  const ymd = el.dataset.date;
  ACT.closeScrap();
  MOOD_UI.date = ymd === todayYMD() ? null : ymd;
  render();
  const card = $('#mood-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
ACT.scrapMore = () => { SCRAP.more = !SCRAP.more; render(); };


/* ---------- History: every logged day as a short frosted page. Pins are shared with the mood scrapbook. Open shows what got done. ---------- */
const HIST = { more: false, q: '' };
function isPinned(ymd) { return !!(S.pins && S.pins[ymd]); }
function togglePin(ymd) {
  change(() => { if (S.pins[ymd]) delete S.pins[ymd]; else S.pins[ymd] = true; });
  const sd = $('#scrap-dlg');
  if (sd && sd.open && sd.dataset.day === ymd) fillScrapDialog(ymd);
  const hd = $('#hist-dlg');
  if (hd && hd.open && hd.dataset.day === ymd) fillHistDialog(ymd);
}
ACT.pinDay = (el) => togglePin(el.dataset.date);
/* Any day with something in it: a mood, a note, a photo, a journal entry, an activity, a habit tick, a finished task or screen time. */
function loggedDays() {
  const set = new Set();
  for (const [d, m] of Object.entries(S.moods)) if (m && (m.mood || scrapText(m) || (m.photos || []).length)) set.add(d);
  for (const j of S.journal) set.add(j.date);
  for (const a of S.activities) set.add(a.date);
  for (const [d, c] of Object.entries(S.habitChecks)) if (c && Object.values(c).some(Boolean)) set.add(d);
  for (const t of S.tasks) if (t.done) set.add(t.date);
  for (const d of Object.keys(S.screen)) set.add(d);
  return [...set].filter(Boolean).sort((a, b) => (a < b ? 1 : -1));
}
/* What was written that day, in a few words: the first journal entry, else the mood note. */
function histSnippet(ymd) {
  const j = S.journal.find((x) => x.date === ymd && (x.html || x.body));
  const text = j ? (j.html ? plainOf(j.html) : String(j.body || '').trim()) : '';
  return (text || scrapText(S.moods[ymd] || {})).slice(0, 140);
}
/* Everything a day holds that the search can match: the date, mood, note, journal entries, activities and finished tasks. */
function histSearchText(ymd) {
  const m = S.moods[ymd] || {};
  const mm = m.mood ? moodOf(m.mood) : null;
  return [
    fmtDay(ymd, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    mm ? mm[2] : '',
    scrapText(m),
    ...S.journal.filter((j) => j.date === ymd).map((j) => `${j.title || ''} ${j.html ? plainOf(j.html) : (j.body || '')} ${(j.tags || []).join(' ')}`),
    ...activitiesOn(ymd).map((a) => `${a.title || ''} ${a.note || ''}`),
    ...tasksOn(ymd).filter((t) => t.done).map((t) => t.title || ''),
  ].join(' ').toLowerCase();
}
function histCard(d, i) {
  const m = S.moods[d] || {};
  const mm = m.mood ? moodOf(m.mood) : null;
  const photos = m.photos || [];
  const lv = level(dayScore(d));
  const pinned = isPinned(d);
  const date = fmtDay(d, { weekday: 'short', month: 'short', day: 'numeric' });
  const snip = histSnippet(d);
  const media = photos.length
    ? `<span class="scrap-photo"><img data-photo="${esc(photos[0])}" alt="Photo from ${esc(date)}" loading="lazy">${photos.length > 1 ? `<span class="scrap-count">+${photos.length - 1}</span>` : ''}</span>`
    : (mm ? `<span class="scrap-sticker" aria-hidden="true">${mm[1]}</span>` : '');
  return `<article class="scrap hist tone-${SCRAP_TONES[i % 3]} tilt-${i % 4}${pinned ? ' is-pinned' : ''}">
    <button class="scrap-open" type="button" data-act="histOpen" data-date="${d}" aria-label="Open ${esc(date)}">
      ${media}
      <span class="scrap-date">${esc(date)}</span>
      <span class="hist-row"><span class="hist-swatch l${lv}" aria-hidden="true"></span>${mm ? `<span class="scrap-mood">${mm[1]}<span>${esc(mm[2])}</span></span>` : `<span class="small muted">${dayScore(d)} logged</span>`}</span>
      ${snip ? `<span class="scrap-note">${esc(snip)}</span>` : ''}
      <span class="scrap-link">Open</span>
    </button>
    <button class="scrap-pin" type="button" data-act="pinDay" data-date="${d}" aria-pressed="${pinned}" aria-label="${pinned ? 'Unpin' : 'Pin'} ${esc(date)}" title="${pinned ? 'Unpin' : 'Pin to the top'}">${PIN_ICON}</button>
  </article>`;
}
/* Same layout as the journal: a header and a search card, then the pages sit outside any box. */
window.VIEWS.history = () => {
  const all = loggedDays();
  const q = HIST.q.toLowerCase();
  const days = q ? all.filter((d) => histSearchText(d).includes(q)) : all;
  const pinned = days.filter((d) => isPinned(d));
  const rest = days.filter((d) => !isPinned(d));
  const shown = HIST.more ? rest : rest.slice(0, 18);
  const older = rest.length - shown.length;
  const block = (rows, offset) => `<div class="scrapbook">${rows.map((d, i) => histCard(d, i + offset)).join('')}</div>`;
  const count = q ? `${days.length} of ${all.length} days` : `${all.length} logged ${all.length === 1 ? 'day' : 'days'}`;
  const body = days.length
    ? `${pinned.length ? `<div class="scrap-sub">Pinned</div>${block(pinned, 0)}` : ''}
      ${shown.length ? `${pinned.length ? '<div class="scrap-sub">Recent</div>' : ''}${block(shown, pinned.length)}` : ''}
      ${older > 0 || HIST.more ? `<div class="row-inline" style="justify-content:center;margin-top:16px"><button class="btn soft small" type="button" data-act="histMore">${HIST.more ? 'Show fewer' : `Show ${older} older day${older === 1 ? '' : 's'}`}</button></div>` : ''}`
    : `<div class="empty">${all.length ? 'No logged day matches that search. Try a word from a note, a journal entry or an activity.' : 'Nothing logged yet. Each day you log shows up here as a page.'}</div>`;
  return `<div class="grid">
    <div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">${count}</div><h1>History</h1></div></div>
    <form data-submit="histFilter" class="card" style="padding:14px"><div class="row-inline">
      <input class="input" name="q" value="${esc(HIST.q)}" placeholder="Search your logged days" aria-label="Search logged days">
      <button class="btn small soft" type="submit">Search</button><button class="btn ghost small" type="button" data-act="histClear">Reset</button></div></form>
    ${body}
  </div>`;
};
ACT.histMore = () => { HIST.more = !HIST.more; render(); };
ACT.histFilter = (f) => { HIST.q = f.elements.q.value.trim(); render(); };
ACT.histClear = () => { HIST.q = ''; render(); };
/* The concise review of one day: what got done, not the full page. */
function histDayHTML(ymd) {
  const m = S.moods[ymd] || {};
  const mm = m.mood ? moodOf(m.mood) : null;
  const photos = m.photos || [];
  const acts = activitiesOn(ymd);
  const checks = S.habitChecks[ymd] || {};
  const habits = coreHabits();
  const doneHabits = habits.filter((h) => checks[h.id]);
  const meDone = ME_TIME.filter((x) => acts.some((a) => a.meKey === x.key));
  const manual = acts.filter((a) => !a.meKey);
  const tasksDone = tasksOn(ymd).filter((x) => x.done);
  const journal = S.journal.filter((j) => j.date === ymd);
  const goals = [...new Set(acts.map((a) => a.goalId).filter(Boolean))].map(goalById).filter(Boolean);
  const learn = acts.filter((a) => (CATS[a.category] || {}).learn).reduce((s, a) => s + a.minutes, 0);
  const screen = S.screen[ymd];
  const lv = level(dayScore(ymd));
  const stats = [learn ? `${hm(learn)} learning` : '', screen ? `${hm(screen.total)} screen` : ''].filter(Boolean);
  const sec = (title, items) => (items.length ? `<section class="hist-sec"><h3 class="day-note-title">${title}</h3><ul class="hist-list">${items.map((x) => `<li>${x}</li>`).join('')}</ul></section>` : '');
  const written = [
    ...journal.map((j) => { const t = j.html ? plainOf(j.html) : String(j.body || '').trim(); return t ? `<strong>${esc(j.title || 'Entry')}</strong> ${esc(t.slice(0, 220))}` : ''; }),
    m.html || m.note ? esc(scrapText(m).slice(0, 220)) : '',
  ].filter(Boolean);
  const pinned = isPinned(ymd);
  const nothing = !acts.length && !doneHabits.length && !tasksDone.length && !written.length;
  return `<div class="dlg scrap-day hist-day">
    <div class="scrap-head">
      <div><div class="eyebrow">${esc(fmtDay(ymd, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div><h2>${mm ? esc(mm[2]) : 'What got done'}</h2></div>
      ${mm ? `<span class="scrap-sticker big" aria-hidden="true">${mm[1]}</span>` : ''}
    </div>
    <p class="hist-row"><span class="hist-swatch l${lv}" aria-hidden="true"></span><span>${dayScore(ymd)} ${dayScore(ymd) === 1 ? 'thing' : 'things'} logged${stats.length ? ` · ${stats.join(' · ')}` : ''}</span></p>
    ${photos.length ? `<div class="scrap-gallery">${photos.map((id) => `<figure class="photo"><img data-photo="${esc(id)}" alt="Photo from ${esc(fmtDay(ymd, { month: 'short', day: 'numeric' }))}" loading="lazy"></figure>`).join('')}</div>` : ''}
    ${sec(`Habits · ${doneHabits.length} of ${habits.length}`, doneHabits.map((h) => esc(h.title)))}
    ${sec('Me time', meDone.map((x) => esc(x.label)))}
    ${sec('Activities', manual.map((a) => `${esc(a.title)}${a.minutes ? ` <span class="muted">· ${hm(a.minutes)}</span>` : ''}`))}
    ${sec('Tasks done', tasksDone.map((x) => esc(x.title)))}
    ${sec('Goals worked on', goals.map((g) => esc(g.name)))}
    ${sec('What I wrote', written)}
    ${nothing && !meDone.length ? '<p class="small muted" style="margin-top:12px">Nothing else logged for this day.</p>' : ''}
    <div class="actions scrap-actions">
      <button class="btn soft small" type="button" data-act="pinDay" data-date="${ymd}" aria-pressed="${pinned}">${pinned ? 'Unpin' : 'Pin to the top'}</button>
      <button class="btn ghost small" type="button" data-act="histCal" data-date="${ymd}">Open in calendar</button>
      <button class="btn primary small" type="button" data-act="closeHist">Close</button>
    </div>
  </div>`;
}
function fillHistDialog(ymd) {
  let d = $('#hist-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'hist-dlg';
    d.className = 'form-dialog scrap-dialog hist-dialog';
    document.body.appendChild(d);
  }
  d.dataset.day = ymd;
  d.innerHTML = histDayHTML(ymd);
  if (!d.open) d.showModal();
  hydratePhotos();
}
ACT.histOpen = (el) => fillHistDialog(el.dataset.date);
ACT.closeHist = () => { const d = $('#hist-dlg'); if (d && d.open) d.close(); };
ACT.histCal = (el) => { ACT.closeHist(); ACT.heatPick(el); };
