/* Dashboard actions, Tech Lab, Library and Wishlist, Settings (backup, demo data), boot. */
const nextOrder = (list) => list.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1;

/* ---------- Dashboard actions ---------- */
ACT.toggleHabit = (el) => {
  const t = el.dataset.date || todayYMD(), id = el.dataset.id;
  change(() => { const day = S.habitChecks[t] || (S.habitChecks[t] = {}); if (day[id]) delete day[id]; else day[id] = true; });
  const left = coreHabits().filter((h) => !(S.habitChecks[t] || {})[h.id]).length;
  if (!left && coreHabits().length) toast('Every core habit done today. Lovely.');
};
ACT.addHabit = () => openForm({ title: 'New daily habit', fields: [{ name: 'title', label: 'Habit', required: true, maxLen: 100 }], onSave: (v) => { change(() => S.habits.push({ id: uid(), title: v.title, group: 'custom', custom: true, order: nextOrder(S.habits) })); return ''; } });
ACT.editHabit = (el) => {
  const h = S.habits.find((x) => x.id === el.dataset.id);
  if (!h) return;
  openForm({ title: 'Edit habit', fields: [{ name: 'title', label: 'Habit', required: true, maxLen: 100, value: h.title }], onSave: (v) => { change(() => { h.title = v.title; }); return ''; } });
};
ACT.delHabit = (el) => confirmDelete('Delete this custom habit? Past check marks stay in your history.', () => change(() => { S.habits = S.habits.filter((h) => h.id !== el.dataset.id); }));
/* Glow Up self-care habits. Any of them can be removed; past check marks stay in the history. */
ACT.addGlowHabit = () => openForm({ title: 'New self-care habit', fields: [{ name: 'title', label: 'Habit', required: true, maxLen: 100 }], onSave: (v) => { change(() => S.habits.push({ id: uid(), title: v.title, group: 'glow', custom: true, order: nextOrder(S.habits) })); return ''; } });
ACT.delGlowHabit = (el) => {
  const id = el.dataset.id;
  confirmDelete('Delete this habit from Glow Up? Past check marks stay in your history.', () => change(() => { S.habits = S.habits.filter((h) => h.id !== id); }));
};
ACT.moveHabit = (el) => {
  const list = coreHabits();
  const i = list.findIndex((h) => h.id === el.dataset.id), j = i + Number(el.dataset.dir);
  if (i < 0 || j < 0 || j >= list.length) return;
  change(() => { const a = list[i], b = list[j]; const tmp = a.order; a.order = b.order; b.order = tmp; });
};
ACT.addTask = (f) => {
  const title = f.elements.title.value.trim();
  if (!title) { toast('Name the task first.'); return; }
  const t = todayYMD();
  change(() => S.tasks.push({ id: uid(), date: t, title: title.slice(0, 140), done: false, priority: false, order: nextOrder(tasksOn(t)) }));
  f.elements.title.value = '';
};
ACT.toggleTask = (el) => change(() => { const x = S.tasks.find((t) => t.id === el.dataset.id); if (x) x.done = !x.done; });
ACT.starTask = (el) => {
  const x = S.tasks.find((t) => t.id === el.dataset.id);
  if (!x) return;
  if (!x.priority && tasksOn(x.date).filter((y) => y.priority).length >= 3) { toast('Three priorities is the limit. Un-star one first.'); return; }
  change(() => { x.priority = !x.priority; });
};
ACT.moveTask = (el) => {
  const list = tasksOn(todayYMD());
  const i = list.findIndex((t) => t.id === el.dataset.id), j = i + Number(el.dataset.dir);
  if (i < 0 || j < 0 || j >= list.length) return;
  change(() => { const a = list[i], b = list[j]; const tmp = a.order; a.order = b.order; b.order = tmp; });
};
ACT.editTask = (el) => {
  const x = S.tasks.find((t) => t.id === el.dataset.id);
  if (!x) return;
  openForm({ title: 'Edit task', fields: [{ name: 'title', label: 'Task', required: true, maxLen: 140, value: x.title }], onSave: (v) => { change(() => { x.title = v.title; }); return ''; } });
};
ACT.delTask = (el) => confirmDelete('Delete this task?', () => change(() => { S.tasks = S.tasks.filter((x) => x.id !== el.dataset.id); }));
ACT.setFocus = (f) => { const t = todayYMD(); const v = f.elements.focus.value.trim(); change(() => { S.focus = S.focus || {}; S.focus[t] = v; }); toast('Focus saved.'); };

/* ---------- Tech Lab: frosted stage columns, solid project cards, and a popup per project with rich logs and screenshots ---------- */
const TECH = { open: null };
const TECH_TONES = ['pink', 'butter', 'sage'];
const TECH_ICON = mi('<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>');
const LOGED = { pid: null, lid: null, photos: [], fresh: [], original: [] };
const projOf = (id) => S.projects.find((x) => x.id === id);
const coverShot = (p) => { const l = (p.log || []).find((x) => (x.photos || []).length); return l ? l.photos[0] : null; };
function moveStage(id, dir) {
  const p = projOf(id);
  if (!p) return;
  const i = TECH_STAGES.indexOf(p.status) + dir;
  if (i < 0 || i >= TECH_STAGES.length) return;
  change(() => { const q = projOf(id); if (q) q.status = TECH_STAGES[i]; });
  refreshProj();
}
ACT.stageMove = (el) => moveStage(el.dataset.id, Number(el.dataset.dir));
const projectFields = (p) => [
  { name: 'title', label: 'Project', required: true, maxLen: 120, value: p ? p.title : '' },
  { name: 'area', label: 'Area', type: 'select', options: TECH_AREAS.map((a) => [a, a]), value: p ? p.area : TECH_AREAS[0] },
  { name: 'status', label: 'Status', type: 'select', options: TECH_STAGES.map((s) => [s, s]), value: p ? p.status : 'Idea' },
  { name: 'repo', label: 'Code repository link', type: 'url', placeholder: 'https://', hint: 'optional', maxLen: 300, value: p ? p.repo || '' : '' },
  { name: 'notes', label: 'Description and notes', type: 'textarea', rows: 3, maxLen: 2000, value: p ? p.notes || '' : '' },
  { name: 'problems', label: 'Technical problems', type: 'textarea', rows: 2, maxLen: 1000, value: p ? p.problems || '' : '' },
];
ACT.addProject = () => openForm({ title: 'New project', fields: projectFields(null), onSave: (v) => { change(() => S.projects.push({ id: uid(), title: v.title, area: v.area, status: v.status, repo: v.repo, notes: v.notes, problems: v.problems, log: [] })); return ''; } });
ACT.editProject = (el) => {
  const id = el.dataset.id;
  const p = projOf(id);
  if (!p) return;
  openForm({ title: 'Edit project', fields: projectFields(p), onSave: (v) => { change(() => { const q = projOf(id); if (q) Object.assign(q, { title: v.title, area: v.area, status: v.status, repo: v.repo, notes: v.notes, problems: v.problems }); }); refreshProj(); return ''; } });
};
ACT.delProject = (el) => {
  const id = el.dataset.id;
  confirmDelete('Delete this project, its log and its screenshots?', () => {
    const p = projOf(id);
    for (const l of (p && p.log) || []) for (const sid of l.photos || []) { mediaDel(sid).catch(() => {}); forgetPhoto(sid); }
    change(() => { S.projects = S.projects.filter((x) => x.id !== id); });
    if (TECH.open === id) closeProj();
  });
};

/* The project popup. It is rebuilt whenever the project changes, so it always shows what is saved. */
function closeProj() { const d = $('#proj-dlg'); if (d && d.open) d.close(); TECH.open = null; }
function refreshProj() { const d = $('#proj-dlg'); if (TECH.open && d && d.open) fillProjDialog(TECH.open); }
ACT.closeProj = () => closeProj();
ACT.openProject = (el) => { TECH.open = el.dataset.id; fillProjDialog(TECH.open); };
function logHTML(p, l, i) {
  const when = fmtDay(l.date || todayYMD(), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const shots = (l.photos || []).map((id) => `<figure class="photo"><img data-photo="${esc(id)}" alt="Screenshot from ${esc(when)}" loading="lazy"></figure>`).join('');
  const text = l.html ? `<div class="rt-view log-text">${sanitizeRich(l.html)}</div>` : (l.text ? `<p class="log-text" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(l.text)}</p>` : '');
  return `<article class="log-entry tilt-${i % 4}">
    <div class="log-head"><span class="log-date">${esc(when)}</span>
      <span class="log-actions"><button class="btn ghost small" type="button" data-act="editLog" data-pid="${p.id}" data-id="${l.id}">Edit</button><button class="btn danger small" type="button" data-act="delLog" data-pid="${p.id}" data-id="${l.id}">Delete</button></span></div>
    ${text}
    ${shots ? `<div class="log-photos">${shots}</div>` : ''}
  </article>`;
}
function projDialogHTML(p) {
  const si = TECH_STAGES.indexOf(p.status);
  const last = TECH_STAGES.length - 1;
  const logs = p.log || [];
  const steps = TECH_STAGES.map((s, k) => `<span class="tech-step${k <= si ? ' on' : ''}${k === si ? ' now' : ''}">${esc(s)}</span>`).join('');
  const sec = (title, html) => `<section class="hist-sec"><h3 class="day-note-title">${title}</h3>${html}</section>`;
  return `<div class="dlg tech-dlg-body">
    <div class="scrap-head">
      <div><div class="eyebrow">${esc(p.area)}</div><h2>${esc(p.title)}</h2></div>
      <span class="tech-count">${logs.length} ${logs.length === 1 ? 'log' : 'logs'}</span>
    </div>
    <div class="tech-steps" role="group" aria-label="Stage">${steps}</div>
    <div class="row-inline">
      ${si > 0 ? `<button class="btn ghost small" type="button" data-act="stageMove" data-id="${p.id}" data-dir="-1">← ${esc(TECH_STAGES[si - 1])}</button>` : ''}
      ${si < last ? `<button class="btn soft small" type="button" data-act="stageMove" data-id="${p.id}" data-dir="1">${esc(TECH_STAGES[si + 1])} →</button>` : ''}
    </div>
    ${p.notes ? sec('About', `<p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(p.notes)}</p>`) : ''}
    ${p.problems ? sec('Technical problems', `<p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(p.problems)}</p>`) : ''}
    ${p.repo ? `<p class="small"><a href="${esc(p.repo)}" target="_blank" rel="noopener noreferrer">Open the repository</a></p>` : ''}
    <section class="hist-sec">
      <div class="row-inline" style="justify-content:space-between"><h3 class="day-note-title">Progress log</h3><button class="btn primary small" type="button" data-act="newLog" data-id="${p.id}">+ New log entry</button></div>
      ${logs.length ? `<div class="log-list">${logs.map((l, i) => logHTML(p, l, i)).join('')}</div>` : '<p class="small muted">No entries yet. Write what you tried, what broke and what finally worked, and add a screenshot.</p>'}
    </section>
    <div class="actions scrap-actions">
      <button class="btn ghost small" type="button" data-act="editProject" data-id="${p.id}">Edit project</button>
      <button class="btn danger small" type="button" data-act="delProject" data-id="${p.id}">Delete project</button>
      <button class="btn primary small" type="button" data-act="closeProj">Close</button>
    </div>
  </div>`;
}
function fillProjDialog(id) {
  const p = projOf(id);
  if (!p) { closeProj(); return; }
  let d = $('#proj-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'proj-dlg';
    d.className = 'form-dialog tech-dlg';
    document.body.appendChild(d);
  }
  d.dataset.pid = id;
  d.innerHTML = projDialogHTML(p);
  if (!d.open) d.showModal();
  hydratePhotos();
}

/* The log editor: rich text, screenshots kept on this device. Cancel throws away screenshots added in this session. */
function shotsHTML() {
  return LOGED.photos.map((id) => `<figure class="photo"><img data-photo="${esc(id)}" alt="Screenshot" loading="lazy"><figcaption><button class="btn ghost small" type="button" data-act="logPhotoDel" data-id="${esc(id)}">Remove</button></figcaption></figure>`).join('') || '<p class="small muted">No screenshot yet.</p>';
}
function openLogEditor(pid, lid) {
  const p = projOf(pid);
  if (!p) return;
  const log = lid ? (p.log || []).find((x) => x.id === lid) : null;
  LOGED.pid = pid;
  LOGED.lid = log ? lid : null;
  LOGED.photos = log ? [...(log.photos || [])] : [];
  LOGED.original = [...LOGED.photos];
  LOGED.fresh = [];
  let d = $('#log-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'log-dlg';
    d.className = 'form-dialog tech-dlg log-dialog';
    document.body.appendChild(d);
  }
  const start = log ? (log.html || (log.text ? `<p>${esc(log.text)}</p>` : '')) : '';
  d.innerHTML = `<div class="dlg log-editor">
    <div class="scrap-head"><div><div class="eyebrow">${esc(p.title)}</div><h2>${log ? 'Edit log entry' : 'New log entry'}</h2></div></div>
    <label class="log-date-label">Date <input class="input" type="date" name="logdate" value="${esc(log ? log.date : todayYMD())}"></label>
    ${richEditorShell({ label: 'Log entry', placeholder: 'What did you try? What broke? What finally worked? Bold, lists and quotes are all fine.', html: start })}
    <div class="row-inline" style="margin-top:12px;justify-content:space-between">
      <label class="btn soft small photo-add">+ Add screenshot<input class="sr-only" type="file" accept="image/*" multiple data-change="logPhotos"></label>
      <span class="small muted">Screenshots stay on this device.</span>
    </div>
    <div class="log-photos" id="log-shots">${shotsHTML()}</div>
    <div class="actions">
      <button class="btn ghost small" type="button" data-act="logCancel">Cancel</button>
      <button class="btn primary small" type="button" data-act="logSave">Save log</button>
    </div>
  </div>`;
  if (!d.open) d.showModal();
  hydratePhotos();
}
function discardFresh() {
  for (const id of LOGED.fresh) { mediaDel(id).catch(() => {}); forgetPhoto(id); }
  LOGED.fresh = [];
}
ACT.newLog = (el) => openLogEditor(el.dataset.id, null);
ACT.editLog = (el) => openLogEditor(el.dataset.pid, el.dataset.id);
ACT.logPhotos = async (el) => {
  const files = [...el.files].slice(0, 6);
  el.value = '';
  if (!files.length) return;
  let added = 0;
  for (const file of files) {
    try {
      const blob = await compressPhoto(file);
      const id = uid();
      await mediaPut(id, blob);
      LOGED.photos.push(id);
      LOGED.fresh.push(id);
      added++;
    } catch (e) {
      toast('One screenshot couldn’t be read here. Try a JPEG or PNG.');
    }
  }
  const box = $('#log-shots');
  if (added && box) { box.innerHTML = shotsHTML(); hydratePhotos(); }
  if (added) toast(added === 1 ? 'Screenshot added.' : `${added} screenshots added.`);
};
ACT.logPhotoDel = (el) => {
  const id = el.dataset.id;
  LOGED.photos = LOGED.photos.filter((x) => x !== id);
  if (LOGED.fresh.includes(id)) { LOGED.fresh = LOGED.fresh.filter((x) => x !== id); mediaDel(id).catch(() => {}); forgetPhoto(id); }
  const box = $('#log-shots');
  if (box) { box.innerHTML = shotsHTML(); hydratePhotos(); }
};
ACT.logCancel = () => {
  discardFresh();
  const d = $('#log-dlg');
  if (d && d.open) d.close();
};
ACT.logSave = () => {
  const d = $('#log-dlg');
  if (!d) return;
  const ed = d.querySelector('.rt');
  const html = sanitizeRich(ed ? ed.innerHTML : '');
  const text = richPlain(html);
  const date = (d.querySelector('input[name="logdate"]') || {}).value || todayYMD();
  if (!text && !LOGED.photos.length) { toast('Write something or add a screenshot first.'); return; }
  const pid = LOGED.pid, lid = LOGED.lid;
  const photos = [...LOGED.photos];
  const removed = LOGED.original.filter((id) => !photos.includes(id));
  change(() => {
    const p = projOf(pid);
    if (!p) return;
    p.log = p.log || [];
    if (lid) { const l = p.log.find((x) => x.id === lid); if (l) Object.assign(l, { date, text, html, photos }); }
    else p.log.unshift({ id: uid(), date, text, html, photos });
  });
  for (const id of removed) { mediaDel(id).catch(() => {}); forgetPhoto(id); }
  LOGED.fresh = [];
  LOGED.original = [];
  d.close();
  refreshProj();
  toast('Log saved.');
};
ACT.delLog = (el) => {
  const pid = el.dataset.pid, lid = el.dataset.id;
  confirmDelete('Delete this log entry and its screenshots?', () => {
    const p = projOf(pid);
    const l = p && (p.log || []).find((x) => x.id === lid);
    if (!l) return;
    change(() => { const q = projOf(pid); if (q) q.log = (q.log || []).filter((x) => x.id !== lid); });
    for (const sid of l.photos || []) { mediaDel(sid).catch(() => {}); forgetPhoto(sid); }
    refreshProj();
  });
};

window.VIEWS.techlab = () => {
  const cols = TECH_STAGES.map((stage, si) => {
    const items = S.projects.filter((p) => p.status === stage);
    const cards = items.map((p, i) => {
      const shot = coverShot(p);
      const logs = p.log || [];
      const n = logs.length;
      const cover = shot
        ? `<div class="tech-cover"><img data-photo="${esc(shot)}" alt="Screenshot of ${esc(p.title)}" loading="lazy"></div>`
        : `<div class="tech-cover tech-cover-empty" aria-hidden="true">${TECH_ICON}</div>`;
      const dots = TECH_STAGES.map((_, k) => `<i${k <= si ? ' class="on"' : ''}></i>`).join('');
      return `<article class="tech-card tone-${TECH_TONES[i % 3]} tilt-${i % 4}">
        ${cover}
        <h3 class="tech-title">${esc(p.title)}</h3>
        <div class="tech-meta"><span class="tech-area">${esc(p.area)}</span><span class="tech-dots" aria-label="Stage ${si + 1} of ${TECH_STAGES.length}">${dots}</span></div>
        <div class="tech-foot"><span>${n} ${n === 1 ? 'log' : 'logs'}</span><span>${logs[0] ? esc(fmtDay(logs[0].date, { month: 'short', day: 'numeric' })) : 'No logs yet'}</span></div>
        <div class="tech-actions">
          ${si > 0 ? `<button class="btn ghost small" type="button" data-act="stageMove" data-id="${p.id}" data-dir="-1" aria-label="Move back">←</button>` : ''}
          ${si < TECH_STAGES.length - 1 ? `<button class="btn ghost small" type="button" data-act="stageMove" data-id="${p.id}" data-dir="1" aria-label="Move to ${esc(TECH_STAGES[si + 1])}">→</button>` : ''}
          <button class="btn primary small tech-open" type="button" data-act="openProject" data-id="${p.id}">Open</button>
        </div>
      </article>`;
    }).join('');
    return `<section class="tech-col" aria-label="${esc(stage)}">
      <div class="tech-col-head"><strong>${esc(stage)}</strong><span class="tech-count">${items.length}</span></div>
      ${cards || '<p class="small muted tech-empty">Nothing here yet.</p>'}
    </section>`;
  }).join('');
  return `<div class="grid">
    <div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">Goal 04 · Idea → Planning → In Progress → Testing → Completed</div><h1>Tech Lab</h1></div><button class="btn primary small" type="button" data-act="addProject">+ New project</button></div>
    <div class="table-scroll"><div class="tech-board">${cols}</div></div>
    <p class="small muted">Open a project to read its log. Screenshots stay on this device; repositories can be linked inside each project.</p>
  </div>`;
};

/* ---------- Library and wishlist ---------- */
const LIB = { tab: 'content', q: '' };
ACT.libTab = (el) => { LIB.tab = el.dataset.tab; render(); };
ACT.libSearch = (f) => { LIB.q = f.elements.q.value.trim(); render(); };
ACT.libStatus = (el) => change(() => { const x = S.library.find((i) => i.id === el.dataset.id); if (x) x.status = el.value; });
ACT.toggleLibDone = (el) => change(() => { const x = S.library.find((i) => i.id === el.dataset.id); if (x) x.status = x.status === 'Completed' ? 'In progress' : 'Completed'; });
ACT.delLib = (el) => confirmDelete('Remove this from your library?', () => change(() => { S.library = S.library.filter((x) => x.id !== el.dataset.id); }));
ACT.toggleWish = (el) => change(() => { const x = S.wishlist.find((i) => i.id === el.dataset.id); if (x) x.bought = !x.bought; });
ACT.delWish = (el) => confirmDelete('Remove this wishlist item?', () => change(() => { S.wishlist = S.wishlist.filter((x) => x.id !== el.dataset.id); }));
ACT.addLib = () => {
  if (LIB.tab === 'content') {
    openForm({ title: 'Save something to watch or read', fields: [
      { name: 'title', label: 'Title', required: true, maxLen: 160 },
      { name: 'category', label: 'Category', type: 'select', options: LIB_CATS.map((c) => [c, c]), value: 'Article' },
      { name: 'status', label: 'Status', type: 'select', options: [['Planned', 'Planned'], ['In progress', 'In progress'], ['Completed', 'Completed']], value: 'Planned' },
      { name: 'url', label: 'Link', type: 'url', placeholder: 'https://', hint: 'optional', maxLen: 500 },
      { name: 'note', label: 'Notes', type: 'textarea', rows: 2, maxLen: 1000 },
    ], onSave: (v) => { change(() => S.library.push({ id: uid(), kind: 'content', title: v.title, category: v.category, status: v.status, url: v.url, note: v.note })); return ''; } });
  } else if (LIB.tab === 'knowledge') {
    openForm({ title: 'Add to my knowledge library', fields: [
      { name: 'type', label: 'Kind', type: 'select', options: [['Note', 'Note'], ['Link', 'Link'], ['Snippet', 'Code snippet'], ['Idea', 'Idea'], ['AI tool', 'Useful AI tool'], ['Research', 'Research']], value: 'Note' },
      { name: 'title', label: 'Title', required: true, maxLen: 160 },
      { name: 'body', label: 'Content', type: 'textarea', rows: 4, maxLen: 4000 },
      { name: 'url', label: 'Link', type: 'url', placeholder: 'https://', hint: 'optional', maxLen: 500 },
      { name: 'tags', label: 'Tags', hint: 'comma separated', maxLen: 200 },
    ], onSave: (v) => { change(() => S.library.push({ id: uid(), kind: 'knowledge', type: v.type, title: v.title, body: v.body, url: v.url, tags: v.tags.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12) })); return ''; } });
  } else {
    openForm({ title: 'Add to wishlist', fields: [
      { name: 'title', label: 'Item', required: true, maxLen: 140 },
      { name: 'kind', label: 'Kind', type: 'select', options: ['Clothes', 'Technology', 'Books', 'Places', 'Skills', 'Experiences'].map((c) => [c, c]), value: 'Clothes' },
      { name: 'price', label: 'Price (PHP)', type: 'number', min: 0, hint: 'optional' },
      { name: 'note', label: 'Note', maxLen: 300 },
    ], onSave: (v) => { change(() => S.wishlist.push({ id: uid(), title: v.title, kind: v.kind, price: v.price === '' ? null : Math.round(v.price), note: v.note, bought: false })); return ''; } });
  }
};

window.VIEWS.library = () => {
  const q = LIB.q.toLowerCase();
  const hit = (s) => !q || String(s || '').toLowerCase().includes(q);
  const tabs = [['content', 'Watch and read'], ['knowledge', 'Knowledge'], ['wishlist', 'Wishlist']].map(([k, l]) => `<button class="btn small ${LIB.tab === k ? 'primary' : 'soft'}" type="button" data-act="libTab" data-tab="${k}" aria-pressed="${LIB.tab === k}">${l}</button>`).join('');
  let body = '';
  if (LIB.tab === 'content') {
    const items = S.library.filter((x) => x.kind === 'content' && (hit(x.title) || hit(x.category) || hit(x.note)));
    const done = S.library.filter((x) => x.kind === 'content' && x.status === 'Completed').length;
    body = card('Watch and read', items.length ? `<ul class="list">${items.map((x) => `<li class="item ${x.status === 'Completed' ? 'done' : ''}"><button class="check" type="button" role="checkbox" aria-checked="${x.status === 'Completed'}" data-act="toggleLibDone" data-id="${x.id}" aria-label="Mark ${esc(x.title)} complete">${x.status === 'Completed' ? '✓' : ''}</button><span class="grow">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a>` : esc(x.title)}<br><span class="tag muted">${esc(x.category)}</span>${x.note ? ` <span class="small muted">${esc(x.note)}</span>` : ''}</span><select class="input" style="width:auto" data-change="libStatus" data-id="${x.id}" aria-label="Status">${['Planned', 'In progress', 'Completed'].map((s) => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select><button class="btn danger small" type="button" data-act="delLib" data-id="${x.id}">Delete</button></li>`).join('')}</ul>` : '<div class="empty">Save a video, documentary, book or article. Track what you finish, not hours.</div>', { eyebrow: `${done} completed`, right: '<button class="btn small soft" type="button" data-act="addLib">+ Save item</button>' });
  } else if (LIB.tab === 'knowledge') {
    const items = S.library.filter((x) => x.kind === 'knowledge' && (hit(x.title) || hit(x.body) || (x.tags || []).some(hit)));
    body = card('Personal knowledge', items.length ? `<div class="grid two">${items.map((x) => `<article class="card" style="padding:14px;box-shadow:none;background:var(--surface-2)"><div class="row-inline" style="justify-content:space-between"><span class="tag">${esc(x.type)}</span><button class="btn danger small" type="button" data-act="delLib" data-id="${x.id}">Delete</button></div><h3 style="margin:8px 0 4px">${esc(x.title)}</h3><p class="small" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc((x.body || '').slice(0, 400))}</p>${x.url ? `<p class="small" style="margin-top:6px"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Open link</a></p>` : ''}${(x.tags || []).length ? `<p class="small muted" style="margin-top:6px">${x.tags.map((t) => '#' + esc(t)).join(' ')}</p>` : ''}</article>`).join('')}</div>` : '<div class="empty">Notes, links, snippets, ideas and AI tools you want to find again.</div>', { eyebrow: 'Searchable', right: '<button class="btn small soft" type="button" data-act="addLib">+ Add</button>' });
  } else {
    const items = S.wishlist.filter((x) => hit(x.title) || hit(x.kind));
    body = card('Wishlist and future plans', items.length ? `<ul class="list">${items.map((x) => `<li class="item ${x.bought ? 'done' : ''}"><button class="check" type="button" role="checkbox" aria-checked="${!!x.bought}" data-act="toggleWish" data-id="${x.id}" aria-label="${esc(x.title)}">${x.bought ? '✓' : ''}</button><span class="grow">${esc(x.title)}<br><span class="tag muted">${esc(x.kind)}</span>${x.price ? ` <span class="small muted">${php(x.price)}</span>` : ''}${x.note ? ` <span class="small muted">${esc(x.note)}</span>` : ''}</span><button class="btn danger small" type="button" data-act="delWish" data-id="${x.id}">Delete</button></li>`).join('')}</ul>` : '<div class="empty">Clothes, technology, books, places, skills and experiences you are looking forward to.</div>', { eyebrow: 'Future plans', right: '<button class="btn small soft" type="button" data-act="addLib">+ Add</button>' });
  }
  return `<div class="grid">
    <div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">Goal 06 and the personal library</div><h1>Library</h1></div></div>
    <form data-submit="libSearch" class="row-inline"><input class="input" name="q" value="${esc(LIB.q)}" placeholder="Search everything" aria-label="Search library"><button class="btn small soft" type="submit">Search</button></form>
    <div class="row-inline">${tabs}</div>${body}</div>`;
};

/* ---------- Settings ---------- */
ACT.prefsName = (f) => { const v = f.elements.name.value.trim().slice(0, 40); change(() => { S.settings.name = v; }); toast('Name saved.'); };
ACT.setTheme = (el) => { change(() => { S.settings.theme = el.value; }); };
ACT.pickColour = (el) => change(() => { S.settings.colors = { ...(S.settings.colors || {}), [el.dataset.group]: el.dataset.value }; });
ACT.setColour = (el) => change(() => { S.settings.colors = { ...(S.settings.colors || {}), [el.dataset.group]: el.value }; });
ACT.previewColour = (el) => applyColours({ ...(S.settings.colors || {}), [el.dataset.group]: el.value });
ACT.resetColour = (el) => change(() => { const c = { ...(S.settings.colors || {}) }; delete c[el.dataset.group]; S.settings.colors = c; });
ACT.resetColours = () => change(() => { S.settings.colors = {}; });
function colourPickerHTML() {
  const c = S.settings.colors || {};
  const rows = Object.entries(COLOUR_GROUPS).map(([g, def]) => {
    const current = isHexColour(c[g]) ? c[g].toLowerCase() : def.fallback;
    const swatches = def.presets.map(([v, l]) => `<button class="colour-swatch" type="button" data-act="pickColour" data-group="${g}" data-value="${v}" aria-pressed="${current === v}" aria-label="${esc(def.label)}: ${esc(l)}" title="${esc(l)}" style="background:${v}"></button>`).join('');
    return `<div class="colour-row">
      <div class="colour-name"><strong>${esc(def.label)}</strong><span class="small muted">${esc(def.hint)}</span></div>
      <div class="colour-controls">${swatches}
        <label class="colour-custom"><input type="color" value="${current}" data-input="previewColour" data-change="setColour" data-group="${g}" aria-label="${esc(def.label)}, any colour"> Any colour</label>
        ${isHexColour(c[g]) ? `<button class="btn ghost small" type="button" data-act="resetColour" data-group="${g}">Reset</button>` : ''}
      </div></div>`;
  }).join('');
  const anySet = Object.keys(COLOUR_GROUPS).some((g) => isHexColour(c[g]));
  return `${rows}<div class="row-inline" style="justify-content:space-between;margin-top:10px"><p class="small muted">Changes show straight away and are saved with your data.</p>${anySet ? '<button class="btn ghost small" type="button" data-act="resetColours">Reset all colours</button>' : ''}</div>`;
}
function downloadBackup() { return JSON.stringify({ app: 'Willow', exported: new Date().toISOString(), data: S }, null, 2); }
ACT.restore = (f) => {
  const raw = f.elements.backup.value.trim();
  if (!raw) { toast('Paste a backup first.'); return; }
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { toast('That backup is not valid JSON.'); return; }
  const data = parsed && parsed.data ? parsed.data : parsed;
  if (!data || typeof data !== 'object' || !Array.isArray(data.habits)) { toast('That does not look like a Willow backup.'); return; }
  confirmDelete('Replace everything on this device with this backup?', () => { S = normalize(data); S.updated = Date.now(); persist(); toast('Backup restored.'); render(); }, 'Restore');
};
ACT.eraseAll = () => confirmDelete('Erase all Willow data on this device and in your database? This cannot be undone. Export a backup first.', () => { S = defaultState(); S.updated = Date.now(); persist(); toast('Everything erased.'); render(); }, 'Erase everything');
ACT.loadDemo = () => {
  const t = todayYMD();
  change(() => {
    S.settings.demo = true;
    for (let i = 0; i < 7; i++) {
      const d = addDays(t, -i);
      if (i % 2 === 0) S.moods[d] = { mood: ['happy', 'peaceful', 'tired', 'excited'][i % 4], note: 'Example entry', demo: true };
      S.screen[d] = { total: 230 - i * 12, social: 70 - i * 4, apps: [{ name: 'Messages', min: 40 }, { name: 'Maps', min: 20 }], demo: true };
      addActivity({ title: ['Study session', 'Walk', 'Coding practice', 'Movie night', 'Trading chart review', 'Lunch with a friend', 'Read a chapter'][i], date: d, category: ['ai', 'outdoors', 'programming', 'reading', 'trading', 'social', 'reading'][i], goalId: [ 'ai', null, 'tech', 'reading', 'trading', null, 'reading'][i], minutes: 30 + i * 5, demo: true });
    }
    S.journal.push({ id: uid(), date: addDays(t, -1), type: 'gratitude', title: 'Example: small things', body: 'Example entry. The smell of rain, a good coffee, a message from a friend.', tags: ['gratitude'], favorite: true, created: Date.now(), demo: true });
    S.savings.push({ id: uid(), date: addDays(t, -2), kind: 'deposit', amount: 1000, note: 'Example weekly savings', demo: true });
    S.tasks.push({ id: uid(), date: t, title: 'Example: review this week’s plan', done: false, priority: true, order: 1, demo: true });
    S.milestones.push({ id: uid(), goalId: 'ai', title: 'Example: install and configure an agent tool', horizon: 'Short-term', due: '', done: true, demo: true });
  });
  toast('Demo entries added. They are marked “demo”.');
};
ACT.clearDemo = () => change(() => {
  S.settings.demo = false;
  S.activities = S.activities.filter((a) => !a.demo);
  S.journal = S.journal.filter((j) => !j.demo);
  S.savings = S.savings.filter((s) => !s.demo);
  S.tasks = S.tasks.filter((x) => !x.demo);
  S.milestones = S.milestones.filter((m) => !m.demo);
  Object.keys(S.moods).forEach((k) => { if (S.moods[k].demo) delete S.moods[k]; });
  Object.keys(S.screen).forEach((k) => { if (S.screen[k].demo) delete S.screen[k]; });
});

window.VIEWS.preferences = () => {
  const backup = downloadBackup();
  const stored = S.updated ? new Date(S.updated).toLocaleString('en-PH', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }) : 'Nothing saved yet';
  return `<div class="grid">
    <div><div class="eyebrow">Your account on Willow</div><h1>Settings</h1></div>
    <div class="grid two">
      ${card('Profile and look', `<form data-submit="prefsName" class="dlg" style="padding:0"><label>What should Willow call you?<input class="input" name="name" maxlength="40" value="${esc(S.settings.name || '')}" placeholder="Your first name"></label><div style="text-align:right"><button class="btn small primary" type="submit">Save name</button></div></form>
        <label style="display:grid;gap:5px;margin-top:14px;font-size:13px;color:var(--muted)">Theme<select class="input" data-change="setTheme" aria-label="Theme">${[['system', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${S.settings.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`, { eyebrow: 'Profile' })}
      ${card('Saving and sync', `<p class="small"><strong>${esc(Store.status)}</strong></p><p class="small muted" style="margin-top:8px">Last saved on this device: ${esc(stored)}. Your data is stored in your private database when this page can reach it, and always kept on this device too. Mood photos stay on this device. Journal text goes to Willow’s chat only if you turn that on under Willow chat.</p>`, { eyebrow: 'Storage' })}
    </div>
    <div class="grid two">
      ${card('Demo data', `<p class="small muted">Sample entries help you see the charts. They are marked as demo and can be removed in one step. Your own data is never touched by the remove step.</p><div class="row-inline" style="margin-top:12px"><button class="btn soft small" type="button" data-act="loadDemo">Add demo entries</button><button class="btn ghost small" type="button" data-act="clearDemo">Remove demo entries</button></div>${S.settings.demo ? '<p class="small" style="margin-top:8px">Demo entries are on.</p>' : ''}`, { eyebrow: 'Examples' })}
      ${card('Backup and restore', `<p class="small muted">Copy this backup and keep it somewhere safe. Paste a backup below to restore it.</p><textarea class="input" readonly rows="5" style="margin-top:10px;font-size:12px" aria-label="Backup JSON">${esc(backup)}</textarea><div class="row-inline" style="margin-top:8px"><button class="btn small soft" type="button" data-act="copyBackup">Copy backup</button></div>
        <form data-submit="restore" class="dlg" style="padding:0;margin-top:14px"><label>Restore from a backup<textarea class="input" name="backup" rows="3" placeholder="Paste backup JSON here"></textarea></label><div style="text-align:right"><button class="btn small ghost" type="submit">Restore</button></div></form>`, { eyebrow: 'Your data' })}
    </div>
    ${card('Look', `<p class="small muted">Pick the picture behind every page. “Plain cream” shows none. A goal can choose its own in its header.</p>
      <p class="eyebrow" style="margin-top:14px">All pages</p>
      ${scenePicker('default', (S.settings.scenes || {}).default || 'none')}
      <p class="eyebrow" style="margin-top:14px">Home</p>
      ${scenePicker('home', (S.settings.scenes || {}).home || '', 'Same as all pages')}`, { eyebrow: 'Backgrounds' })}
    ${card('Your colours', colourPickerHTML(), { eyebrow: 'Look' })}
    ${card('Willow chat and reminders', `<label class="check-row small"><input type="checkbox" data-change="toggleChatJournal" ${S.settings.chatJournal ? 'checked' : ''}> Let Willow read my last five journal entries. Off by default.</label>
      <label class="check-row small" style="margin-top:10px"><input type="checkbox" data-change="toggleReminders" ${S.settings.reminders !== false ? 'checked' : ''}> Show one gentle reminder a day after 10:00 Manila time.</label>`, { eyebrow: 'Willow' })}
    ${card('Not built yet', `<ul class="list" style="list-style:disc;padding-left:20px;display:grid;gap:8px">
      <li>Photos for journal entries, Tech Lab screenshots, and the scrapbook. Mood photos work now and stay on this device.</li>
      <li>Installing Willow as a home-screen app with offline use. The artifact can’t run a service worker.</li>
      <li>Tech Buddy, the Internet Money expense tracker, and the business idea notebook. Internet Money can be marked active, but it has no tracker yet.</li>
      <li>Letters to your future self, the vision board, the yearbook, weekly and monthly review generation, achievements, and the 100-things list beyond a simple bucket list.</li>
      <li>Backup as a file download. Downloads are blocked in artifacts, so backup is copy and paste.</li>
      <li>The Next.js and Supabase stack from your spec. That is Stage 2, once your accounts are set up. Until then this is a single-page app with the same data model.</li>
    </ul>`, { eyebrow: 'Roadmap' })}
    ${card('Danger zone', `<p class="small muted">Erase everything in Willow on this device and in your database. Export a backup first.</p><div style="margin-top:10px"><button class="btn danger small" type="button" data-act="eraseAll">Erase all data</button></div>`, { eyebrow: 'Careful' })}
  </div>`;
};
ACT.copyBackup = (el) => {
  const ta = el.closest('.card').querySelector('textarea');
  ta.select();
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => toast('Backup copied.'), () => toast('Text selected. Copy it with your device’s copy command.'));
  else toast('Text selected. Copy it with your device’s copy command.');
};

/* ---------- Boot ---------- */
buildNav();
initStorage();
startClock();
startReminders();
loadCaps();
