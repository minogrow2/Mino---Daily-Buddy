/* Goals: the index, and one page per goal with its own tint, background and panels. */
const goalProgress = (ms, acts) => {
  const done = ms.filter((m) => m.done).length;
  return ms.length
    ? `<div class="bar"><span style="width:${pct(done, ms.length)}%"></span></div><p class="small muted" style="margin-top:6px">${done} of ${ms.length} milestones · ${acts} logged</p>`
    : `<p class="small muted">${acts} activities logged. Add milestones to track progress.</p>`;
};

/* One picture per goal. Five stills cover seven goals, so two goals repeat a still at a different zoom and crop. */
const GOAL_MONTH_TARGET = 12;
const GOAL_PIC = {
  trading: ['img/scene-desk.jpg', 1, '50% 50%'],
  ai: ['img/scene-hollow.jpg', 1, '50% 50%'],
  glow: ['img/scene-bath.jpg', 1, '50% 50%'],
  tech: ['img/scene-fishing.jpg', 1, '50% 50%'],
  money: ['img/scene-grass.jpg', 1, '50% 50%'],
  reading: ['img/goal-reading.jpg', 1, '50% 50%'],
  cs: ['img/goal-cs.jpg', 1, '50% 50%'],
};
/* Progress ring: the count sits in the middle; the arc is the 30-day count against the monthly goal. */
function goalRing(count, label) {
  const r = 30, c = 2 * Math.PI * r;
  const p = Math.min(1, count / GOAL_MONTH_TARGET);
  return `<div class="ring-wrap" role="img" aria-label="${esc(label)}">
    <svg viewBox="0 0 72 72" aria-hidden="true"><circle class="ring-track" cx="36" cy="36" r="${r}"/><circle class="ring-arc" cx="36" cy="36" r="${r}" transform="rotate(-90 36 36)" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}"/></svg>
    <span class="ring-num">${count}</span></div>`;
}

window.VIEWS.goals = () => {
  const t = todayYMD();
  const cards = GOALS.map((g) => {
    const ms = milestonesOf(g.id);
    const done = ms.filter((m) => m.done).length;
    const month = S.activities.filter((a) => a.goalId === g.id && a.date >= addDays(t, -30)).length;
    const status = g.id === 'money' && S.settings.moneyActive ? 'Active · you chose to start' : g.status;
    const [img, zoom, origin] = GOAL_PIC[g.id];
    return `<a class="card reveal goal-card goal-tile" href="#goal-${g.id}" style="--tint:${GOAL_TINT[g.id]}">
      <div class="goal-pic"><img src="${img}" alt="" loading="lazy" style="transform:scale(${zoom});transform-origin:${origin}"><span class="goal-no">${g.no}</span></div>
      <div class="goal-body">
        <div class="eyebrow">${esc(status)}</div>
        <h2 class="goal-name">${esc(g.name)}</h2>
        <p class="muted small goal-blurb">${esc(g.blurb)}</p>
        <div class="goal-foot">
          ${goalRing(month, `${month} activities logged in the last 30 days, goal ${GOAL_MONTH_TARGET}`)}
          <div class="goal-stats"><span class="goal-stat-label">Activities logged</span><span class="small muted">last 30 days · goal ${GOAL_MONTH_TARGET}</span>${ms.length ? `<span class="small muted">${done} of ${ms.length} milestones</span>` : ''}</div>
        </div>
      </div></a>`;
  }).join('');
  return `<section class="card goals-head"><div class="eyebrow">Seven life goals</div><h1>My goals</h1></section>
    <div class="grid two">${cards}</div>`;
};

window.VIEWS.goal = (id) => {
  const g = goalById(id);
  if (!g) return `<div class="empty">That goal doesn’t exist. <a href="#goals">Back to goals</a></div>`;
  const ms = milestonesOf(id).sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  const done = ms.filter((m) => m.done).length;
  const acts = activitiesOf(id);
  const mins = acts.reduce((s, a) => s + a.minutes, 0);
  const res = S.resources.filter((r) => r.goalId === id);
  const panels = { trading: panelTrading, ai: panelAI, glow: panelGlow, cs: panelCS, tech: panelTech, reading: panelReading }[id];
  const milestoneRows = ms.map((m) => `<li class="item ${m.done ? 'done' : ''}"><button class="check" type="button" role="checkbox" aria-checked="${!!m.done}" data-act="toggleMilestone" data-id="${m.id}" aria-label="${esc(m.title)}">${m.done ? '✓' : ''}</button><span class="grow">${esc(m.title)}<br><span class="small muted">${esc(m.horizon)}${m.due ? ' · due ' + fmtDay(m.due) : ''}</span></span><button class="btn danger small" type="button" data-act="delMilestone" data-id="${m.id}">Delete</button></li>`).join('');
  const money = id === 'money';
  const moneyCard = money ? card('Your decision', `<p class="small muted">Internet Money stays in preparation until you decide to start. Activating it changes this label only. The expense tracker isn’t built yet.</p>
    <div class="row-inline" style="margin-top:12px"><span class="tag ${S.settings.moneyActive ? '' : 'muted'}">${S.settings.moneyActive ? 'Active' : 'Preparation phase'}</span>
    <button class="btn small soft" type="button" data-act="toggleMoney">${S.settings.moneyActive ? 'Move back to preparation' : 'Mark as active'}</button></div>`, { eyebrow: 'Status' }) : '';
  const sceneValue = (S.settings.scenes || {})[`goal-${id}`] || '';
  return `<div class="row-inline" style="justify-content:space-between"><a class="small muted" href="#goals">← All goals</a>
      <label class="small muted row-inline" style="gap:8px">Background <select class="input" style="width:auto" data-change="setScene" data-key="goal-${id}" aria-label="Background for this goal">${sceneOptions(sceneValue, 'Same as all pages')}</select></label></div>
    <div class="grid" style="margin-top:8px">
      <section class="card reveal goal-hero" style="--tint:${GOAL_TINT[id]}"><div class="eyebrow">${g.no} · ${esc(S.settings.moneyActive && money ? 'Active · you chose to start' : g.status)}</div><h1 style="margin:6px 0 8px">${esc(g.name)}</h1><p class="muted">${esc(g.blurb)}</p>
        <div class="stats" style="margin-top:14px"><div class="stat"><div class="small muted">Milestones</div><div class="v">${done}/${ms.length}</div></div><div class="stat"><div class="small muted">Activities</div><div class="v">${acts.length}</div></div><div class="stat"><div class="small muted">Time logged</div><div class="v">${hm(mins)}</div></div><div class="stat"><div class="small muted">Last 30 days</div><div class="v">${S.activities.filter((a) => a.goalId === id && a.date >= addDays(todayYMD(), -30)).length}</div></div></div></section>
      <div class="grid two">
        ${card('Milestones', `<ul class="list">${milestoneRows || '<li class="empty">Add short-term, weekly, monthly or long-term milestones with due dates.</li>'}</ul>`, { eyebrow: 'Roadmap', right: '<button class="btn small soft" type="button" data-act="addMilestone" data-goal="' + id + '">+ Milestone</button>' })}
        ${card('Activity history', acts.length ? `<ul class="list">${acts.slice(0, 15).map((a) => `<li class="item"><span class="grow">${esc(a.title)}<br><span class="small muted">${fmtDay(a.date)} · ${CATS[a.category] ? esc(CATS[a.category].label) : ''}${a.minutes ? ' · ' + hm(a.minutes) : ''}</span></span><button class="btn danger small" type="button" data-act="delActivity" data-id="${a.id}">Delete</button></li>`).join('')}</ul>` : '<div class="empty">Log what you worked on for this goal.</div>', { eyebrow: 'Log', right: `<button class="btn small soft" type="button" data-act="logActivity" data-goal="${id}">+ Log activity</button>` })}
      </div>
      ${moneyCard ? `<div class="grid two">${moneyCard}</div>` : ''}
      ${panels ? `<div class="grid two">${panels()}</div>` : ''}
      ${goalNotesSection(id)}
      ${card('Resources', `<ul class="list">${res.map((r) => `<li class="item"><a class="grow" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a><button class="btn danger small" type="button" data-act="delResource" data-id="${r.id}">Delete</button></li>`).join('') || '<li class="empty">Save links, videos, or books for this goal.</li>'}</ul>`, { eyebrow: 'Links', right: `<button class="btn small soft" type="button" data-act="addResource" data-goal="${id}">+ Resource</button>` })}
    </div>`;
};

/* ---------- Goal notes: a rich-text composer with photos, then a scrapbook of the notes saved for this goal. ----------
   S.goalNotes[goalId] is a list of saved notes. S.goalDrafts[goalId] is the note being written (autosaved as you type). */
const emptyDraft = () => ({ html: '', photos: [], editId: null });
function draftOf(g) {
  const d = S.goalDrafts[g];
  return d ? { ...emptyDraft(), ...d, photos: [...(d.photos || [])] } : emptyDraft();
}
function goalNotesOf(g) { return Array.isArray(S.goalNotes[g]) ? S.goalNotes[g] : []; }
function noteById(g, id) { return goalNotesOf(g).find((n) => n.id === id) || null; }
const noteYMD = (ts) => ymdFormat.format(new Date(ts || Date.now()));
/* Photos the note being edited already had. Any other photo in a draft was added this session. */
function originalPhotosOf(g, d) { const n = d.editId ? noteById(g, d.editId) : null; return n ? n.photos : []; }
/* Deletes the photos a draft added this session, so they are not left behind on the device. */
function dropFreshPhotos(g, d) {
  const keep = originalPhotosOf(g, d);
  for (const pid of d.photos) if (!keep.includes(pid)) { mediaDel(pid).catch(() => {}); forgetPhoto(pid); }
}
function goalComposerHTML(g, d) {
  const goal = goalById(g);
  const editing = !!d.editId;
  const shots = d.photos.map((pid) => `<figure class="photo"><img data-photo="${esc(pid)}" alt="Photo for this note" loading="lazy"><figcaption><button class="btn ghost small" type="button" data-act="goalPhotoDel" data-goal="${g}" data-id="${esc(pid)}">Remove photo</button></figcaption></figure>`).join('');
  return `<div class="goal-composer">
    ${richEditorShell({ label: `Notes for ${goal.name}`, placeholder: 'Write what you are thinking. Bold, lists and quotes are all fine.', html: d.html, attrs: `data-input="goalNote" data-goal="${g}"` })}
    <div class="row-inline" style="margin-top:12px;justify-content:space-between">
      <label class="btn soft small photo-add">+ Add photo<input class="sr-only" type="file" accept="image/*" multiple data-change="goalPhotos" data-goal="${g}"></label>
      <span class="small muted">Photos stay on this device.</span>
    </div>
    ${shots ? `<div class="photo-grid">${shots}</div>` : ''}
    <div class="actions" style="margin-top:12px">
      <button class="btn ghost small" type="button" data-act="discardGoalNote" data-goal="${g}">${editing ? 'Cancel edit' : 'Clear'}</button>
      <button class="btn primary small" type="button" data-act="saveGoalNote" data-goal="${g}">${editing ? 'Update note' : 'Save note'}</button>
    </div>
  </div>`;
}
function goalNotesSection(g) {
  const d = draftOf(g);
  return `${card('Notes', goalComposerHTML(g, d), { eyebrow: d.editId ? 'Editing a saved note' : 'Thinking', id: `goal-notes-${g}` })}
    ${goalNotesBook(g)}`;
}
function goalNotesBook(g) {
  const list = goalNotesOf(g).slice().sort((a, b) => (b.created || 0) - (a.created || 0));
  if (!list.length) return '<div class="empty">No saved notes yet. Write a thought above and save it. It lands here as a page.</div>';
  const pinned = list.filter((n) => n.pinned);
  const rest = list.filter((n) => !n.pinned);
  const block = (rows, offset) => `<div class="scrapbook">${rows.map((n, i) => goalNoteCard(g, n, i + offset)).join('')}</div>`;
  return `${pinned.length ? `<div class="scrap-sub">Pinned</div>${block(pinned, 0)}` : ''}
    ${rest.length ? `${pinned.length ? '<div class="scrap-sub">Recent</div>' : ''}${block(rest, pinned.length)}` : ''}`;
}
function goalNoteCard(g, n, i) {
  const date = fmtDay(noteYMD(n.created), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const snip = plainOf(n.html).slice(0, 140);
  const pid = n.photos[0];
  const more = n.photos.length - 1;
  return `<article class="scrap tone-${SCRAP_TONES[i % 3]} tilt-${i % 4}${n.pinned ? ' is-pinned' : ''}">
    <button class="scrap-open" type="button" data-act="openGoalNote" data-goal="${g}" data-id="${n.id}" aria-label="Open note from ${esc(date)}">
      ${pid ? `<span class="scrap-photo"><img data-photo="${esc(pid)}" alt="Photo from this note" loading="lazy">${more > 0 ? `<span class="scrap-count">+${more}</span>` : ''}</span>` : ''}
      <span class="scrap-date">${esc(date)}</span>
      <span class="scrap-note">${esc(snip || 'Photo note')}</span>
      <span class="scrap-link">Open</span>
    </button>
    <button class="scrap-pin" type="button" data-act="pinGoalNote" data-goal="${g}" data-id="${n.id}" aria-pressed="${!!n.pinned}" aria-label="${n.pinned ? 'Unpin' : 'Pin'} note from ${esc(date)}" title="${n.pinned ? 'Unpin' : 'Pin to the top'}">${PIN_ICON}</button>
  </article>`;
}
function closeGNote() { const d = $('#gnote-dlg'); if (d && d.open) d.close(); }
function fillGNoteDialog(g, id) {
  const n = noteById(g, id);
  if (!n) return;
  let d = $('#gnote-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'gnote-dlg';
    d.className = 'form-dialog scrap-dialog';
    document.body.appendChild(d);
  }
  d.dataset.goal = g;
  d.dataset.id = id;
  const when = fmtDay(noteYMD(n.created), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const shots = n.photos.map((pid) => `<figure class="photo"><img data-photo="${esc(pid)}" alt="Photo from this note" loading="lazy"></figure>`).join('');
  d.innerHTML = `<div class="dlg scrap-day">
    <div class="scrap-head"><div><div class="eyebrow">${esc(when)}</div><h2>${n.pinned ? 'Pinned note' : 'A saved note'}</h2></div></div>
    ${richPlain(n.html) ? `<div class="rt-view scrap-text">${sanitizeRich(n.html)}</div>` : '<p class="small muted">Only photos in this note.</p>'}
    ${shots ? `<div class="scrap-gallery">${shots}</div>` : ''}
    <div class="actions scrap-actions">
      <button class="btn soft small" type="button" data-act="pinGoalNote" data-goal="${g}" data-id="${id}" aria-pressed="${!!n.pinned}">${n.pinned ? 'Unpin' : 'Pin to the top'}</button>
      <button class="btn ghost small" type="button" data-act="editGoalNote" data-goal="${g}" data-id="${id}">Edit this note</button>
      <button class="btn danger small" type="button" data-act="delGoalNote" data-goal="${g}" data-id="${id}">Delete</button>
      <button class="btn primary small" type="button" data-act="closeGNote">Close</button>
    </div>
  </div>`;
  if (!d.open) d.showModal();
  hydratePhotos();
}
ACT.goalNote = (el) => {
  const g = el.dataset.goal;
  const d = draftOf(g);
  d.html = sanitizeRich(el.innerHTML);
  if (!d.html && !d.photos.length && !d.editId) delete S.goalDrafts[g];
  else S.goalDrafts[g] = d;
  S.updated = Date.now();
  persist();
};
ACT.goalPhotos = async (el) => {
  const g = el.dataset.goal;
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
  const d = draftOf(g);
  d.photos = [...d.photos, ...ids];
  S.goalDrafts[g] = d;
  change(null);
  toast(ids.length === 1 ? 'Photo added to this note.' : `${ids.length} photos added to this note.`);
};
ACT.goalPhotoDel = (el) => {
  const g = el.dataset.goal, pid = el.dataset.id;
  confirmDelete('Remove this photo from the note?', () => {
    const d = draftOf(g);
    const keep = originalPhotosOf(g, d);
    d.photos = d.photos.filter((x) => x !== pid);
    if (!keep.includes(pid)) { mediaDel(pid).catch(() => {}); forgetPhoto(pid); }
    S.goalDrafts[g] = d;
    change(null);
  });
};
ACT.saveGoalNote = (el) => {
  const g = el.dataset.goal;
  const wrap = el.closest('.goal-composer');
  const ed = wrap && wrap.querySelector('.rt');
  const html = sanitizeRich(ed ? ed.innerHTML : '');
  const d = draftOf(g);
  if (!richPlain(html) && !d.photos.length) { toast('Write something or add a photo first.'); return; }
  const now = Date.now();
  const list = goalNotesOf(g).slice();
  const existing = d.editId ? list.find((n) => n.id === d.editId) : null;
  let dropped = [];
  if (existing) {
    dropped = existing.photos.filter((pid) => !d.photos.includes(pid));
    Object.assign(existing, { html, photos: [...d.photos], updated: now });
  } else {
    list.push({ id: uid(), html, photos: [...d.photos], created: now, updated: now, pinned: false });
  }
  change(() => { S.goalNotes[g] = list; delete S.goalDrafts[g]; });
  for (const pid of dropped) { mediaDel(pid).catch(() => {}); forgetPhoto(pid); }
  toast(existing ? 'Note updated.' : 'Saved to the scrapbook.');
};
ACT.discardGoalNote = (el) => {
  const g = el.dataset.goal;
  const d = draftOf(g);
  const finish = () => { dropFreshPhotos(g, d); change(() => { delete S.goalDrafts[g]; }); };
  if (richPlain(d.html) || d.photos.length) confirmDelete(d.editId ? 'Throw away your changes to this saved note?' : 'Throw away this note?', finish, 'Throw away');
  else finish();
};
ACT.editGoalNote = (el) => {
  const g = el.dataset.goal, id = el.dataset.id;
  const n = noteById(g, id);
  if (!n) return;
  const cur = draftOf(g);
  const scroll = () => { const c = document.getElementById(`goal-notes-${g}`); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  if (cur.editId === id) { closeGNote(); scroll(); return; }
  const load = () => {
    dropFreshPhotos(g, cur);
    S.goalDrafts[g] = { html: n.html, photos: [...n.photos], editId: n.id };
    closeGNote();
    change(null);
    scroll();
  };
  if (richPlain(cur.html) || cur.photos.length) confirmDelete('Replace the note you are writing? Photos added to it are deleted from this device.', load, 'Replace');
  else load();
};
ACT.openGoalNote = (el) => fillGNoteDialog(el.dataset.goal, el.dataset.id);
ACT.closeGNote = () => closeGNote();
ACT.pinGoalNote = (el) => {
  const g = el.dataset.goal, id = el.dataset.id;
  change(() => { const n = noteById(g, id); if (n) n.pinned = !n.pinned; });
  const dlg = $('#gnote-dlg');
  if (dlg && dlg.open && dlg.dataset.id === id) fillGNoteDialog(g, id);
};
ACT.delGoalNote = (el) => {
  const g = el.dataset.goal, id = el.dataset.id;
  confirmDelete('Delete this saved note for good? Its photos are deleted from this device.', () => {
    const n = noteById(g, id);
    if (!n) return;
    const d = draftOf(g);
    if (d.editId === id) dropFreshPhotos(g, d);
    change(() => {
      S.goalNotes[g] = goalNotesOf(g).filter((x) => x.id !== id);
      if (d.editId === id) delete S.goalDrafts[g];
    });
    for (const pid of n.photos) { mediaDel(pid).catch(() => {}); forgetPhoto(pid); }
    closeGNote();
  });
};
ACT.toggleMoney = () => change(() => { S.settings.moneyActive = !S.settings.moneyActive; });
