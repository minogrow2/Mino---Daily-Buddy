/* Views: Calendar, Analytics, Journal, Mood, Me Time, Savings, Screen Time. */
const CAL = { mode: 'year', year: Number(todayYMD().slice(0, 4)), month: todayYMD().slice(0, 7), selected: todayYMD() };
const ANA = { range: 30 };
const JRN = { type: 'all', tag: '', q: '', favOnly: false, scrap: true };
const SCR = { week: null };

/* Small SVG charts drawn to one scale, with theme-token colors. */
function svgBars(series, labels, { h = 180, max: forcedMax } = {}) {
  const W = 640, H = h, L = 34, B = 24, T = 8;
  const all = series.flatMap((s) => s.values);
  const max = forcedMax || Math.max(1, ...all);
  const n = labels.length || 1;
  const gw = (W - L) / n;
  const bw = (gw * 0.72) / series.length;
  let body = '';
  [0, 0.5, 1].forEach((f) => {
    const y = T + (H - B - T) * (1 - f);
    body += `<line class="grid-line" x1="${L}" x2="${W}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${Math.round(max * f)}</text>`;
  });
  series.forEach((s, si) => s.values.forEach((v, i) => {
    const bh = ((v || 0) / max) * (H - B - T);
    const x = L + i * gw + gw * 0.14 + si * bw;
    body += `<rect x="${x.toFixed(1)}" y="${(H - B - bh).toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${s.color}"><title>${esc(labels[i])}: ${v || 0}</title></rect>`;
  }));
  const step = Math.ceil(n / 8);
  labels.forEach((lab, i) => { if (i % step === 0) body += `<text x="${(L + i * gw + gw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(lab)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${body}</svg>`;
}
function svgLine(values, labels, { h = 180 } = {}) {
  const W = 640, H = h, L = 34, B = 24, T = 8;
  const n = values.length;
  const x = (i) => L + (n <= 1 ? (W - L) / 2 : (i / (n - 1)) * (W - L - 8));
  const y = (v) => T + (H - B - T) * (1 - clamp(v || 0, 0, 100) / 100);
  let body = '';
  [0, 50, 100].forEach((v) => { body += `<line class="grid-line" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`; });
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  body += `<polyline points="${pts}" fill="none" stroke="var(--rose)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  values.forEach((v, i) => { body += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="var(--rose)"><title>${esc(labels[i])}: ${v}%</title></circle>`; });
  const step = Math.ceil(n / 8);
  labels.forEach((lab, i) => { if (i % step === 0) body += `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(lab)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart">${body}</svg>`;
}
const legendHTML = (items) => `<div class="row-inline" style="gap:12px">${items.map(([c, l]) => `<span class="legend"><i style="background:${c}"></i>${esc(l)}</span>`).join('')}</div>`;

/* ---------- Calendar ---------- */
function calendarDayPanel(ymd) {
  const t = todayYMD();
  const acts = activitiesOn(ymd);
  const checks = S.habitChecks[ymd] || {};
  const habits = coreHabits();
  const habitsDone = habits.filter((h) => checks[h.id]).length;
  const tasks = tasksOn(ymd);
  const mood = S.moods[ymd];
  const moodInfo = mood && moodOf(mood.mood);
  const journal = S.journal.filter((j) => j.date === ymd);
  const goalsWorked = [...new Set(acts.map((a) => a.goalId).filter(Boolean))].map(goalById).filter(Boolean);
  const learnMin = acts.filter((a) => (CATS[a.category] || {}).learn).reduce((s, a) => s + a.minutes, 0);
  const screen = S.screen[ymd];
  const manual = acts.filter((a) => !a.meKey);
  const score = dayScore(ymd);
  const none = (msg) => `<p class="small muted">${msg}</p>`;
  const note = (title, body, cls = '') => `<section class="day-note ${cls}"><h3 class="day-note-title">${title}</h3>${body}</section>`;
  const stats = [
    `${score} ${score === 1 ? 'thing' : 'things'} logged`,
    `${habitsDone} of ${habits.length} habits`,
    learnMin ? `${hm(learnMin)} learning` : 'No learning time',
    goalsWorked.length ? goalsWorked.map((g) => esc(g.name)).join(', ') : 'No goal work',
  ].map((s) => `<span class="day-chip">${s}</span>`).join('');
  const habitRows = habits.map((h) => `<li class="day-row${checks[h.id] ? ' done' : ''}"><button class="check" type="button" role="checkbox" aria-checked="${!!checks[h.id]}" data-act="toggleHabit" data-id="${h.id}" data-date="${ymd}" aria-label="${esc(h.title)}">${checks[h.id] ? '✓' : ''}</button><span class="grow">${esc(h.title)}</span></li>`).join('');
  const taskRows = tasks.map((x) => `<li class="day-row${x.done ? ' done' : ''}"><button class="check" type="button" role="checkbox" aria-checked="${!!x.done}" data-act="toggleTask" data-id="${x.id}" aria-label="${esc(x.title)}">${x.done ? '✓' : ''}</button><span class="grow">${esc(x.title)}</span></li>`).join('');
  const actRows = manual.map((a) => `<li class="day-row"><span class="grow">${esc(a.title)}<span class="small muted"> · ${esc((CATS[a.category] || {}).label || a.category)}${a.minutes ? ' · ' + hm(a.minutes) : ''}</span></span><button class="btn ghost small" type="button" data-act="editActivity" data-id="${a.id}">Edit</button><button class="btn danger small" type="button" data-act="delActivity" data-id="${a.id}">Delete</button></li>`).join('');
  const journalRows = journal.map((j) => `<li class="day-row"><span class="grow">${esc(j.title || 'Entry')}</span><button class="btn ghost small" type="button" data-act="editJournal" data-id="${j.id}">Edit</button></li>`).join('');
  const moodBody = `<div class="moods" role="group" aria-label="Mood for this day">${moodButtonsHTML(ymd)}</div>${moodInfo && MOOD_NOTES[mood.mood] ? `<p class="small muted" style="margin-top:8px">${esc(MOOD_NOTES[mood.mood])}</p>` : ''}`;
  const photos = (mood && mood.photos) || [];
  const photosBody = `${photos.length ? `<div class="photo-grid day-photos">${photos.map((id) => `<figure class="photo"><img data-photo="${esc(id)}" alt="Photo from ${esc(fmtDay(ymd, { month: 'short', day: 'numeric' }))}" loading="lazy"><figcaption><button class="btn ghost small" type="button" data-act="delPhoto" data-id="${esc(id)}" data-date="${ymd}">Remove</button></figcaption></figure>`).join('')}</div>` : none('No photo for this day yet.')}<div class="row-inline" style="margin-top:10px"><label class="btn small soft photo-add">+ Add photo<input class="sr-only" type="file" accept="image/*" multiple data-change="addPhotos" data-date="${ymd}"></label></div>`;
  const tasksBody = taskRows ? `<ul class="day-list">${taskRows}</ul>` : none('No tasks on this day.');
  const actBody = `${manual.length ? `<ul class="day-list">${actRows}</ul>` : none('Nothing logged yet.')}<div class="row-inline" style="margin-top:6px"><button class="btn small soft" type="button" data-act="logForDay" data-date="${ymd}">+ Log activity</button></div>`;
  const journalBody = `${journal.length ? `<ul class="day-list">${journalRows}</ul>` : none('No entry yet.')}<div class="row-inline" style="margin-top:6px"><button class="btn small soft" type="button" data-act="journalForDay" data-date="${ymd}">+ Journal</button></div>`;
  const screenBody = `${screen ? `<p class="small">${hm(screen.total)}${screen.social ? ` · social ${hm(screen.social)}` : ''}</p>` : none('Not logged yet.')}<div class="row-inline" style="margin-top:6px"><button class="btn small soft" type="button" data-act="screenForm" data-date="${ymd}">${screen ? 'Edit screen time' : 'Log screen time'}</button></div>`;
  return card(fmtDay(ymd, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), `
    <div class="day-page">
      <div class="day-stats">${stats}</div>
      <div class="day-grid">
        ${note('Mood', moodBody, 'wide')}
        ${note('Photos', photosBody)}
        ${note('Daily checklist', habitRows ? `<ul class="day-list">${habitRows}</ul>` : none('No habits yet.'))}
        ${note('Me time', meTimeChipsHTML(ymd))}
        ${note('Tasks', tasksBody)}
        ${note('Activities', actBody)}
        ${note('Journal', journalBody)}
        ${note('Screen time', screenBody)}
      </div>
    </div>`, { eyebrow: ymd === t ? 'Today’s page' : 'A past day. Tap anything to change it.' });
}
window.VIEWS = Object.assign(window.VIEWS || {}, {
  calendar() {
    const t = todayYMD();
    const seg = `<div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">Activity intensity</div><h1>Calendar</h1></div>
      <div class="row-inline"><button class="btn small ${CAL.mode === 'year' ? 'primary' : 'soft'}" type="button" data-act="calMode" data-mode="year">Year</button><button class="btn small ${CAL.mode === 'month' ? 'primary' : 'soft'}" type="button" data-act="calMode" data-mode="month">Month</button></div></div>`;
    const legend = `<div class="legend" style="margin-top:12px"><span>Less</span>${[0, 1, 2, 3, 4].map((l) => `<i style="background:var(--heat-${l})"></i>`).join('')}<span>More</span><span class="muted" style="margin-left:8px">Learning, workouts, socializing, rest, journaling all count.</span></div>`;
    let grid;
    if (CAL.mode === 'year') {
      const jan1 = `${CAL.year}-01-01`, dec31 = `${CAL.year}-12-31`;
      let d = addDays(jan1, -dowOf(jan1));
      const cols = [];
      while (d <= dec31 || cols.length < 53) {
        const week = [];
        for (let i = 0; i < 7; i++) {
          const inYear = d.startsWith(String(CAL.year));
          if (!inYear) week.push('<span></span>');
          else {
            const lv = level(dayScore(d));
            week.push(`<button class="cell l${lv}${d === t ? ' today' : ''}${d > t ? ' future' : ''}" type="button" data-act="calPick" data-date="${d}" aria-label="${fmtDay(d, { weekday: 'long', month: 'long', day: 'numeric' })}, level ${lv}"></button>`);
          }
          d = addDays(d, 1);
        }
        cols.push(week.join(''));
        if (cols.length >= 54) break;
      }
      grid = `<div class="heat-wrap"><div class="heat">${cols.join('')}</div></div>`;
      seg2 = `<div class="row-inline" style="justify-content:space-between;margin-top:14px"><button class="btn small ghost" type="button" data-act="calYear" data-dir="-1">← ${CAL.year - 1}</button><strong class="display">${CAL.year}</strong><button class="btn small ghost" type="button" data-act="calYear" data-dir="1" ${CAL.year >= Number(t.slice(0, 4)) ? 'disabled' : ''}>${CAL.year + 1} →</button></div>`;
    } else {
      const first = `${CAL.month}-01`;
      const lead = (dowOf(first) + 6) % 7;
      const cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<div class="dow">${x}</div>`);
      for (let i = 0; i < lead; i++) cells.push('<div class="day blank"></div>');
      for (let k = 1; k <= daysInMonth(first); k++) {
        const ymd = `${CAL.month}-${String(k).padStart(2, '0')}`;
        const lv = level(dayScore(ymd));
        cells.push(`<button class="day l${lv}${ymd === t ? ' today' : ''}" type="button" data-act="calPick" data-date="${ymd}" aria-label="${fmtDay(ymd, { month: 'long', day: 'numeric' })}, level ${lv}">${k}</button>`);
      }
      grid = `<div class="month-grid">${cells.join('')}</div>`;
      seg2 = `<div class="row-inline" style="justify-content:space-between;margin-top:14px"><button class="btn small ghost" type="button" data-act="calMonth" data-dir="-1">← Previous</button><strong class="display">${esc(fmtMonth(first))}</strong><button class="btn small ghost" type="button" data-act="calMonth" data-dir="1" ${CAL.month >= t.slice(0, 7) ? 'disabled' : ''}>Next →</button></div>`;
    }
    const sel = CAL.selected || t;
    return `<div class="grid">${seg}${card('', grid + legend + seg2, { cls: 'reveal' })}${calendarDayPanel(sel)}</div>`;
  },
});
let seg2 = '';
ACT.calMode = (el) => { CAL.mode = el.dataset.mode; render(); };
ACT.calYear = (el) => { CAL.year += Number(el.dataset.dir); render(); };
ACT.calMonth = (el) => { const d = addDays(`${CAL.month}-01`, Number(el.dataset.dir) * 32); CAL.month = d.slice(0, 7); render(); };
ACT.calPick = (el) => { CAL.selected = el.dataset.date; render(); const p = $('.card.butter'); if (p && window.innerWidth < 900) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
ACT.logForDay = (el) => openForm({ title: 'Log activity', fields: [
  { name: 'title', label: 'What did you do?', required: true, maxLen: 120 },
  { name: 'date', label: 'Date', type: 'date', value: el.dataset.date, required: true },
  { name: 'category', label: 'Kind', type: 'select', options: Object.entries(CATS).map(([k, c]) => [k, c.label]), value: 'social' },
  { name: 'minutes', label: 'Minutes', type: 'number', min: 0, hint: 'optional' },
], onSave: (v) => { change(() => addActivity({ title: v.title, date: v.date, category: v.category, minutes: v.minutes || 0 })); return ''; } });
ACT.journalForDay = (el) => journalForm(null, el.dataset.date);

/* ---------- Me Time checklist: each tick is an offline activity, so it shows on the Me Time page and in the day’s record ---------- */
function meTimeChipsHTML(ymd) {
  const acts = activitiesOn(ymd);
  const on = (key) => acts.some((a) => a.meKey === key);
  return `<div class="me-grid" role="group" aria-label="Me time for this day">${ME_TIME.map((m) => `<button class="me-chip${on(m.key) ? ' on' : ''}" type="button" data-act="toggleMeTime" data-date="${ymd}" data-key="${m.key}" aria-pressed="${on(m.key)}"><span class="me-ico" aria-hidden="true">${m.icon}</span><span>${esc(m.label)}</span><span class="me-tick" aria-hidden="true">✓</span></button>`).join('')}</div>`;
}
function meTimeHTML(ymd) {
  const done = ME_TIME.filter((m) => activitiesOn(ymd).some((a) => a.meKey === m.key)).length;
  return `<div class="me-time"><div class="row-inline" style="justify-content:space-between"><span class="eyebrow">Me time</span><span class="small muted">${done} of ${ME_TIME.length}</span></div>${meTimeChipsHTML(ymd)}</div>`;
}
ACT.toggleMeTime = (el) => {
  const ymd = el.dataset.date || todayYMD(), key = el.dataset.key;
  const item = ME_TIME.find((m) => m.key === key);
  if (!item) return;
  change(() => {
    const hit = S.activities.find((a) => a.date === ymd && a.meKey === key);
    if (hit) S.activities = S.activities.filter((a) => a !== hit);
    else addActivity({ date: ymd, title: item.label, category: item.category, minutes: 0, meKey: key });
  });
};
/* A day on the Home heatmap opens that day on the calendar page. */
ACT.heatPick = (el) => {
  const d = el.dataset.date;
  CAL.selected = d; CAL.mode = 'year'; CAL.year = Number(d.slice(0, 4)); CAL.month = d.slice(0, 7);
  location.hash = 'calendar';
};
ACT.editActivity = (el) => {
  const a = S.activities.find((x) => x.id === el.dataset.id);
  if (!a) return;
  openForm({ title: 'Edit activity', fields: [
    { name: 'title', label: 'What did you do?', required: true, maxLen: 120, value: a.title },
    { name: 'date', label: 'Date', type: 'date', value: a.date, required: true },
    { name: 'category', label: 'Kind', type: 'select', options: Object.entries(CATS).map(([k, c]) => [k, c.label]), value: a.category },
    { name: 'minutes', label: 'Minutes', type: 'number', min: 0, value: a.minutes || '', hint: 'optional' },
  ], onSave: (v) => { change(() => { Object.assign(a, { title: v.title, date: v.date, category: v.category, minutes: Number(v.minutes) || 0, offline: !!(CATS[v.category] || {}).offline }); }); return ''; } });
};


/* ---------- Analytics ---------- */
window.VIEWS = Object.assign(window.VIEWS || {}, {
  analytics() {
    const t = todayYMD();
    const days = rangeDays(t, ANA.range);
    const planned = days.map((d) => tasksOn(d).length);
    const done = days.map((d) => tasksOn(d).filter((x) => x.done).length);
    const habitPct = days.map((d) => pct(habitsDoneOn(d), coreHabits().length));
    const learnMin = days.map((d) => Math.round(activitiesOn(d).filter((a) => (CATS[a.category] || {}).learn).reduce((s, a) => s + a.minutes, 0)));
    const screen = days.map((d) => Math.round(screenTotal(d) || 0));
    const labels = days.map((d) => fmtDay(d, { month: 'numeric', day: 'numeric' }));
    const cons = (pred) => `${days.filter(pred).length} of ${ANA.range} days`;
    const dayHas = (cat) => (d) => S.activities.some((a) => a.date === d && a.category === cat);
    const offlineDays = (d) => S.activities.some((a) => a.date === d && (CATS[a.category] || {}).offline);
    const weeks = [0, 1, 2, 3].map((k) => { const end = addDays(weekStart(t), -7 * k + 6); const ws = addDays(end, -6); const ds = rangeDays(end, 7); const p = ds.reduce((s, d) => s + tasksOn(d).length, 0); const dn = ds.reduce((s, d) => s + tasksOn(d).filter((x) => x.done).length, 0); return { label: fmtDay(ws, { month: 'short', day: 'numeric' }) + ' – ' + fmtDay(end, { month: 'short', day: 'numeric' }), p, dn }; }).reverse();
    const balance = savingsBalance();
    const goalRows = GOALS.map((g) => { const ms = milestonesOf(g.id); const dn = ms.filter((m) => m.done).length; return `<tr><td>${esc(g.name)}</td><td class="num">${dn}/${ms.length}</td><td class="num">${pct(dn, ms.length)}%</td></tr>`; }).join('');
    const courses = S.courses.length ? `${S.courses.filter((c) => courseStatus(c) === 'Completed').length} of ${S.courses.length} completed` : 'No courses yet';
    const projectsDone = S.projects.filter((p) => p.status === 'Completed').length;
    const hasData = S.activities.length || S.tasks.length || Object.keys(S.habitChecks).length;
    const growth = [
      `Habits: ${cons((d) => habitsDoneOn(d) > 0)} with at least one habit checked.`,
      `Learning: ${cons((d) => activitiesOn(d).some((a) => (CATS[a.category] || {}).learn))} with learning time.`,
      `Offline: ${cons(offlineDays)} with something done outside the screen.`,
      `Savings: ${php(balance)} saved in total, across ${S.savings.length} records.`,
    ];
    return `<div class="grid">
      <div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">Progress you can read</div><h1>Analytics</h1></div>
        <form data-submit="anaRange" class="row-inline"><select class="input" name="range" style="width:auto" aria-label="Date range">${[7, 30, 90].map((n) => `<option value="${n}" ${n === ANA.range ? 'selected' : ''}>Last ${n} days</option>`).join('')}</select><button class="btn small soft" type="submit">Apply</button></form></div>
      ${!hasData ? '<div class="empty">Nothing to chart yet. Check off habits, add tasks, and log activities. Your charts fill in as you go.</div>' : ''}
      <div class="grid two">
        ${card('Tasks completed versus planned', svgBars([{ name: 'Planned', values: planned, color: 'var(--pink)' }, { name: 'Completed', values: done, color: 'var(--rose)' }], labels) + legendHTML([['var(--pink)', 'Planned'], ['var(--rose)', 'Completed']]), { eyebrow: 'Daily' })}
        ${card('Habits maintained', svgLine(habitPct, labels) + '<p class="small muted" style="margin-top:6px">Share of your daily core habits checked each day.</p>', { eyebrow: 'Daily' })}
        ${card('Learning minutes', svgBars([{ name: 'Learning', values: learnMin, color: 'var(--butter-deep)' }], labels), { eyebrow: 'Daily' })}
        ${card('Screen time (minutes)', svgBars([{ name: 'Screen', values: screen, color: 'var(--rose)' }], labels), { eyebrow: 'Daily', id: 'screen-chart' })}
      </div>
      <div class="grid two">
        ${card('Weekly task completion', `<div class="table-scroll"><table class="simple"><thead><tr><th>Week</th><th>Done</th><th>Share</th></tr></thead><tbody>${weeks.map((w) => `<tr><td>${esc(w.label)}</td><td class="num">${w.dn}/${w.p}</td><td class="num">${pct(w.dn, w.p)}%</td></tr>`).join('')}</tbody></table></div>`, { eyebrow: 'Weekly' })}
        ${card('Consistency', `<div class="table-scroll"><table class="simple"><tbody>
          <tr><td>AI learning</td><td class="num">${cons(dayHas('ai'))}</td></tr>
          <tr><td>Trading education</td><td class="num">${cons(dayHas('trading'))}</td></tr>
          <tr><td>Workouts</td><td class="num">${cons(dayHas('workout'))}</td></tr>
          <tr><td>Reading or watching</td><td class="num">${cons(dayHas('reading'))}</td></tr>
          <tr><td>Offline activities</td><td class="num">${cons(offlineDays)}</td></tr></tbody></table></div>`, { eyebrow: 'Weekly and monthly' })}
      </div>
      <div class="grid two">
        ${card('Goal progression', `<div class="table-scroll"><table class="simple"><thead><tr><th>Goal</th><th>Milestones</th><th>Share</th></tr></thead><tbody>${goalRows}</tbody></table></div>`, { eyebrow: 'Monthly' })}
        ${card('Growth summary', `<ul class="list" style="list-style:none;padding:0;margin:0">${growth.map((g) => `<li style="padding:8px 0;border-bottom:1px solid var(--line)">${esc(g)}</li>`).join('')}</ul>
          <p class="small muted" style="margin-top:10px">Courses: ${esc(courses)}. Tech projects completed: ${projectsDone}. Total savings: ${php(balance)}.</p>`, { eyebrow: 'Personal growth' })}
      </div></div>`;
  },
});
ACT.anaRange = (f) => { ANA.range = Number(f.elements.range.value) || 30; render(); };

/* ---------- Journal ---------- */
function journalForm(entry, date) {
  const typeOpts = JOURNAL_TYPES.map(([k, l]) => [k, l]);
  openForm({ title: entry ? 'Edit entry' : 'New journal entry', fields: [
    { name: 'date', label: 'Date', type: 'date', value: (entry && entry.date) || date || todayYMD(), required: true },
    { name: 'type', label: 'Type', type: 'select', options: typeOpts, value: (entry && entry.type) || 'daily' },
    { name: 'title', label: 'Title', maxLen: 120, value: (entry && entry.title) || '' },
    { name: 'body', label: 'Write freely', type: 'textarea', rows: 8, required: true, maxLen: 8000, value: (entry && entry.body) || '' },
    { name: 'tags', label: 'Tags', hint: 'comma separated', maxLen: 200, value: entry ? entry.tags.join(', ') : '', placeholder: 'family, ideas' },
  ], submit: 'Save entry', onSave: (v) => {
    const tags = v.tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 12);
    change(() => {
      if (entry) { const j = S.journal.find((x) => x.id === entry.id); Object.assign(j, { date: v.date, type: v.type, title: v.title, body: v.body, tags }); delete j.html; }
      else S.journal.push({ id: uid(), date: v.date, type: v.type, title: v.title, body: v.body, tags, favorite: false, created: Date.now() });
    });
    return '';
  } });
}
window.VIEWS.journal = () => {
  let list = S.journal.slice().sort((a, b) => (a.date === b.date ? b.created - a.created : a.date < b.date ? 1 : -1));
  if (JRN.type !== 'all') list = list.filter((j) => j.type === JRN.type);
  if (JRN.tag) list = list.filter((j) => j.tags.includes(JRN.tag));
  if (JRN.favOnly) list = list.filter((j) => j.favorite);
  if (JRN.q) { const q = JRN.q.toLowerCase(); list = list.filter((j) => `${j.title} ${j.body}`.toLowerCase().includes(q)); }
  const allTags = [...new Set(S.journal.flatMap((j) => j.tags))].sort();
  const listTile = (j, i) => `<article class="card reveal" style="background:${['var(--pink-soft)', 'var(--butter)', 'var(--surface-2)'][i % 3]};box-shadow:none">
      <div class="row-inline" style="justify-content:space-between"><span class="tag">${esc((JOURNAL_TYPES.find((x) => x[0] === j.type) || [0, 'Entry'])[1])}</span><button class="btn ghost small" type="button" data-act="favJournal" data-id="${j.id}" aria-pressed="${!!j.favorite}" aria-label="Favorite">${j.favorite ? '★' : '☆'}</button></div>
      <h3 style="margin:10px 0 4px">${esc(j.title || fmtDay(j.date))}</h3><p class="small muted">${fmtDay(j.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
      ${j.html ? `<div class="rt-view" style="margin-top:8px;overflow-wrap:anywhere">${sanitizeRich(j.html)}</div>` : `<p style="margin-top:8px;white-space:pre-wrap;overflow-wrap:anywhere">${esc(j.body)}</p>`}
      <div class="row-inline" style="margin-top:10px;justify-content:space-between">${j.tags.map((x) => `<button class="tag muted" type="button" data-act="tagFilter" data-tag="${esc(x)}">#${esc(x)}</button>`).join(' ')}<span><button class="btn ghost small" type="button" data-act="editJournal" data-id="${j.id}">Edit</button><button class="btn danger small" type="button" data-act="delJournal" data-id="${j.id}">Delete</button></span></div></article>`;
  /* Scrapbook page for one entry. The pin marks a favourite. */
  const scrapTile = (j, i) => {
    const snip = (j.html ? plainOf(j.html) : (j.body || '')).slice(0, 220);
    return `<article class="scrap tone-${SCRAP_TONES[i % 3]} tilt-${i % 4}${j.favorite ? ' is-pinned' : ''}">
      <div class="scrap-open scrap-entry">
        <span class="scrap-date">${esc(fmtDay(j.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))}</span>
        <span class="scrap-mood"><span>${esc((JOURNAL_TYPES.find((x) => x[0] === j.type) || [0, 'Entry'])[1])}</span></span>
        <h3 class="scrap-title">${esc(j.title || fmtDay(j.date))}</h3>
        ${snip ? `<span class="scrap-note">${esc(snip)}</span>` : ''}
        ${j.tags.length ? `<span class="scrap-tags">${j.tags.map((x) => `<button class="tag muted" type="button" data-act="tagFilter" data-tag="${esc(x)}">#${esc(x)}</button>`).join(' ')}</span>` : ''}
        <span class="scrap-foot"><button class="btn ghost small" type="button" data-act="editJournal" data-id="${j.id}">Edit</button><button class="btn danger small" type="button" data-act="delJournal" data-id="${j.id}">Delete</button></span>
      </div>
      <button class="scrap-pin" type="button" data-act="favJournal" data-id="${j.id}" aria-pressed="${!!j.favorite}" aria-label="${j.favorite ? 'Unfavorite' : 'Favorite'}" title="${j.favorite ? 'Unfavorite' : 'Favorite'}">${PIN_ICON}</button>
    </article>`;
  };
  return `<div class="grid">
    <div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">Your diary</div><h1>Journal</h1></div><button class="btn primary small" type="button" data-act="newJournal">+ New entry</button></div>
    <form data-submit="journalFilter" class="card" style="padding:14px"><div class="row-inline">
      <input class="input" name="q" value="${esc(JRN.q)}" placeholder="Search your entries" aria-label="Search entries">
      <select class="input" name="type" style="flex:0 1 180px" aria-label="Entry type"><option value="all">All types</option>${JOURNAL_TYPES.map(([k, l]) => `<option value="${k}" ${JRN.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label class="row-inline" style="gap:6px;font-size:14px"><input type="checkbox" name="fav" ${JRN.favOnly ? 'checked' : ''}> Favorites</label>
      <button class="btn small soft" type="submit">Filter</button><button class="btn ghost small" type="button" data-act="clearJournal">Reset</button></div></form>
    <div class="row-inline" style="justify-content:space-between">
      <div class="row-inline">${allTags.map((x) => `<button class="tag ${JRN.tag === x ? '' : 'muted'}" type="button" data-act="tagFilter" data-tag="${esc(x)}">#${esc(x)}</button>`).join(' ')}</div>
      <button class="btn small soft" type="button" data-act="toggleScrap">${JRN.scrap ? 'List view' : 'Scrapbook view'}</button></div>
    ${list.length ? `${JRN.scrap ? `<div class="scrapbook journal-book">${list.map(scrapTile).join('')}</div>` : `<div class="grid">${list.map(listTile).join('')}</div>`}` : '<div class="empty">No entries match. Start with a small thought. It doesn’t need to be long.</div>'}
  </div>`;
};
ACT.newJournal = () => journalForm(null, null);
ACT.editJournal = (el) => journalForm(S.journal.find((j) => j.id === el.dataset.id), null);
ACT.delJournal = (el) => confirmDelete('Delete this journal entry for good?', () => change(() => { S.journal = S.journal.filter((j) => j.id !== el.dataset.id); }));
ACT.favJournal = (el) => change(() => { const j = S.journal.find((x) => x.id === el.dataset.id); if (j) j.favorite = !j.favorite; });
ACT.tagFilter = (el) => { JRN.tag = JRN.tag === el.dataset.tag ? '' : el.dataset.tag; render(); };
ACT.toggleScrap = () => { JRN.scrap = !JRN.scrap; render(); };
ACT.clearJournal = () => { Object.assign(JRN, { type: 'all', tag: '', q: '', favOnly: false }); render(); };
ACT.journalFilter = (f) => { JRN.q = f.elements.q.value.trim(); JRN.type = f.elements.type.value; JRN.favOnly = f.elements.fav.checked; render(); };
ACT.quickJournal = (f) => {
  const ed = f.querySelector('.rt');
  const html = sanitizeRich(ed ? ed.innerHTML : '');
  const body = richPlain(html);
  if (!body) { toast('Write a line first.'); return; }
  change(() => S.journal.push({ id: uid(), date: todayYMD(), type: 'daily', title: 'Today', body, html, tags: [], favorite: false, created: Date.now() }));
  toast('Saved to your journal.');
};

/* ---------- Me Time ---------- */
const TIMER = { start: 0, handle: null };
function tickTimer() {
  const el = $('#timer-display');
  if (!el || !TIMER.start) return;
  const s = Math.floor((Date.now() - TIMER.start) / 1000);
  el.textContent = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
ACT.timerStart = () => { TIMER.start = Date.now(); clearInterval(TIMER.handle); TIMER.handle = setInterval(tickTimer, 1000); render(); };
ACT.timerStop = () => {
  const mins = Math.max(1, Math.round((Date.now() - TIMER.start) / 60000));
  clearInterval(TIMER.handle); TIMER.start = 0;
  openForm({ title: 'Save this offline time', message: `That was about ${hm(mins)}. Name it and it goes in your offline journal.`, fields: [
    { name: 'title', label: 'What were you doing?', required: true, maxLen: 120 },
    { name: 'category', label: 'Kind', type: 'select', options: [['outdoors', 'Outdoors and exploring'], ['social', 'Socializing'], ['personal', 'Personal time'], ['rest', 'Rest'], ['reading', 'Reading or watching'], ['workout', 'Workout']], value: 'outdoors' },
    { name: 'minutes', label: 'Minutes', type: 'number', min: 0, value: mins },
  ], submit: 'Save', onSave: (v) => { change(() => addActivity({ title: v.title, category: v.category, minutes: v.minutes || 0, offline: true })); return ''; } });
  render();
};
ACT.quickOffline = (f) => { const title = f.elements.title.value.trim(); if (!title) return; change(() => addActivity({ title, category: f.elements.category.value, minutes: Number(f.elements.minutes.value) || 0, offline: true })); toast('Offline time saved.'); };
ACT.toggleBucket = (el) => change(() => { const b = S.bucket.find((x) => x.id === el.dataset.id); if (b) { b.done = !b.done; b.doneDate = b.done ? todayYMD() : ''; } });
ACT.delBucket = (el) => confirmDelete('Remove this from your bucket list?', () => change(() => { S.bucket = S.bucket.filter((x) => x.id !== el.dataset.id); }));
ACT.addBucket = () => openForm({ title: 'Add to my 100 things', fields: [
  { name: 'title', label: 'Experience or place', required: true, maxLen: 140 },
  { name: 'category', label: 'Category', type: 'select', options: BUCKET_CATS.map((c) => [c, c]), value: 'Experiences' },
  { name: 'note', label: 'Why it matters', type: 'textarea', rows: 2, maxLen: 300 },
], onSave: (v) => { change(() => S.bucket.push({ id: uid(), title: v.title, category: v.category, note: v.note, done: false, doneDate: '' })); return ''; } });

window.VIEWS.metime = () => {
  const t = todayYMD();
  const offline = S.activities.filter((a) => (CATS[a.category] || {}).offline).sort((a, b) => (a.date < b.date ? 1 : -1));
  const social = offline.filter((a) => a.category === 'social');
  const weekMins = offline.filter((a) => a.date >= weekStart(t)).reduce((s, a) => s + a.minutes, 0);
  const reminder = REMINDERS[(parseInt(t.slice(-2), 10) + 1) % REMINDERS.length];
  const running = TIMER.start > 0;
  const bucketDone = S.bucket.filter((b) => b.done).length;
  return `<div class="grid">
    <div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">Life outside the phone</div><h1>Me Time</h1></div></div>
    <section class="card reveal" style="background:var(--butter);box-shadow:none"><p class="kicker">${esc(reminder)}</p><p class="small" style="margin-top:6px">Willow will ask gently, and only when you open this page.</p></section>
    <div class="grid two">
      ${card('Offline timer', `<p class="small muted">Optional. Start it when you head out, stop it when you are back. Don’t track every moment.</p>
        <p id="timer-display" class="display num" style="font-size:40px;margin:14px 0">${running ? '' : '00:00:00'}</p>
        <div class="row-inline">${running ? '<button class="btn primary" type="button" data-act="timerStop">Stop and save</button>' : '<button class="btn primary" type="button" data-act="timerStart">Start timer</button>'}</div>
        <form data-submit="quickOffline" class="row-inline" style="margin-top:14px"><input class="input" name="title" maxlength="120" placeholder="Quick log: e.g. Walk by the river" aria-label="Quick offline log"><select class="input" name="category" style="flex:0 1 160px" aria-label="Kind"><option value="outdoors">Outdoors</option><option value="social">Socializing</option><option value="personal">Personal</option><option value="rest">Rest</option></select><input class="input" name="minutes" type="number" min="0" placeholder="Min" style="flex:0 1 90px" aria-label="Minutes"><button class="btn small soft" type="submit">Save</button></form>`, { eyebrow: 'Offline activity journal' })}
      ${card('This week', `<div class="stats"><div class="stat"><div class="small muted">Offline time</div><div class="v">${hm(weekMins)}</div></div><div class="stat"><div class="small muted">Offline entries</div><div class="v">${offline.filter((a) => a.date >= weekStart(t)).length}</div></div><div class="stat"><div class="small muted">Time with people</div><div class="v">${social.length}</div></div><div class="stat"><div class="small muted">Bucket list done</div><div class="v">${bucketDone}/${S.bucket.length}</div></div></div>
        <ul class="list" style="margin-top:12px">${offline.slice(0, 6).map((a) => `<li class="item"><span class="grow">${esc(a.title)} <span class="small muted">${fmtDay(a.date)}${a.minutes ? ' · ' + hm(a.minutes) : ''}</span></span><button class="btn danger small" type="button" data-act="delActivity" data-id="${a.id}">Delete</button></li>`).join('') || '<li class="empty">Nothing offline logged yet. A walk counts.</li>'}</ul>`, { eyebrow: 'Recent' })}
    </div>
    ${card('100 things to experience', `<ul class="list">${S.bucket.map((b) => `<li class="item ${b.done ? 'done' : ''}"><button class="check" type="button" role="checkbox" aria-checked="${!!b.done}" data-act="toggleBucket" data-id="${b.id}" aria-label="${esc(b.title)}">${b.done ? '✓' : ''}</button><span class="grow">${esc(b.title)}<br><span class="small muted">${esc(b.category)}${b.doneDate ? ' · done ' + fmtDay(b.doneDate) : ''}${b.note ? ' · ' + esc(b.note) : ''}</span></span><button class="btn danger small" type="button" data-act="delBucket" data-id="${b.id}">Delete</button></li>`).join('') || '<li class="empty">Add places you want to visit and experiences you want to try.</li>'}</ul>`, { eyebrow: 'Bucket list', right: '<button class="btn small soft" type="button" data-act="addBucket">+ Add</button>' })}
  </div>`;
};

/* ---------- Savings (PHP) ---------- */
function recordSavings(kind) {
  openForm({ title: kind === 'deposit' ? 'Record a deposit' : 'Record a withdrawal', message: 'Only what you actually moved. Nothing is carried over automatically.', fields: [
    { name: 'date', label: 'Date', type: 'date', value: todayYMD(), required: true },
    { name: 'amount', label: 'Amount (PHP)', type: 'number', min: 1, required: true, step: '1' },
    { name: 'note', label: 'Note', maxLen: 140, hint: 'optional' },
  ], onSave: (v) => { change(() => S.savings.push({ id: uid(), date: v.date, kind, amount: Math.round(Number(v.amount)), note: v.note })); return ''; } });
}
ACT.depositForm = () => recordSavings('deposit');
ACT.withdrawForm = () => recordSavings('withdrawal');
ACT.delSavings = (el) => confirmDelete('Delete this record? Your totals will update.', () => change(() => { S.savings = S.savings.filter((x) => x.id !== el.dataset.id); }));
ACT.setTarget = (f) => { const n = Math.round(Number(f.elements.target.value)); if (!Number.isFinite(n) || n < 0) { toast('Enter a target of 0 or more.'); return; } change(() => { S.settings.savingsTarget = n; }); toast('Weekly target updated.'); };

window.VIEWS.savings = () => {
  const t = todayYMD();
  const target = S.settings.savingsTarget;
  const saved = weekSaved(t);
  const remaining = Math.max(0, target - saved);
  const p = target ? clamp(pct(Math.max(0, saved), target), 0, 100) : 0;
  const weeks = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const ws = addDays(weekStart(t), -7 * k); return { ws, saved: weekSaved(ws) }; });
  const months = [0, 1, 2, 3, 4, 5].map((k) => { const [yy, mm] = t.slice(0, 7).split('-').map(Number); const m = new Date(Date.UTC(yy, mm - 1 - k, 1)).toISOString().slice(0, 10); const prefix = m.slice(0, 7); const rows = S.savings.filter((s) => s.date.startsWith(prefix)); return { m, dep: rows.filter((r) => r.kind === 'deposit').reduce((s, r) => s + r.amount, 0), wd: rows.filter((r) => r.kind === 'withdrawal').reduce((s, r) => s + r.amount, 0) }; });
  const monthsUniq = [...new Map(months.map((x) => [x.m, x])).values()].slice(0, 6);
  const list = S.savings.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  return `<div class="grid">
    <div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">Weekly savings · PHP</div><h1>Savings</h1></div>
      <div class="row-inline"><button class="btn small soft" type="button" data-act="depositForm">+ Deposit</button><button class="btn small ghost" type="button" data-act="withdrawForm">− Withdrawal</button></div></div>
    <section class="card reveal" style="background:var(--pink-soft);box-shadow:none">
      <div class="stats">
        <div class="stat"><div class="small muted">Saved this week</div><div class="v">${php(saved)}</div></div>
        <div class="stat"><div class="small muted">Weekly target</div><div class="v">${php(target)}</div></div>
        <div class="stat"><div class="small muted">Remaining</div><div class="v">${php(remaining)}</div></div>
        <div class="stat"><div class="small muted">Total accumulated</div><div class="v">${php(savingsBalance())}</div></div>
      </div>
      <div style="margin-top:16px"><div class="row-inline" style="justify-content:space-between"><span class="small">This week’s progress</span><strong class="num">${p}%</strong></div><div class="bar butter" style="margin-top:6px" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p}%"></span></div>
      <p class="small muted" style="margin-top:8px">Weeks run Monday to Sunday. Each week starts at zero. Nothing carries over unless you record it.</p></div>
    </section>
    <div class="grid two">
      ${card('Weekly history', `<div class="table-scroll"><table class="simple"><thead><tr><th>Week of</th><th>Saved</th><th>Progress</th></tr></thead><tbody>${weeks.map((w) => `<tr><td>${fmtDay(w.ws, { month: 'short', day: 'numeric' })}</td><td class="num">${php(w.saved)}</td><td class="num">${clamp(pct(Math.max(0, w.saved), target), 0, 100)}%</td></tr>`).join('')}</tbody></table></div>`, { eyebrow: 'Last 8 weeks' })}
      ${card('Monthly summary', `<div class="table-scroll"><table class="simple"><thead><tr><th>Month</th><th>Deposits</th><th>Withdrawals</th><th>Net</th></tr></thead><tbody>${monthsUniq.map((x) => `<tr><td>${esc(fmtMonth(x.m))}</td><td class="num">${php(x.dep)}</td><td class="num">${php(x.wd)}</td><td class="num">${php(x.dep - x.wd)}</td></tr>`).join('')}</tbody></table></div>`, { eyebrow: 'Recent months' })}
    </div>
    ${card('Savings history', list.length ? `<ul class="list">${list.slice(0, 40).map((s) => `<li class="item"><span class="grow">${fmtDay(s.date, { month: 'short', day: 'numeric', year: 'numeric' })}${s.note ? ` <span class="small muted">· ${esc(s.note)}</span>` : ''}</span><span class="num ${s.kind === 'deposit' ? '' : 'muted'}">${s.kind === 'deposit' ? '+' : '−'}${php(s.amount)}</span><button class="btn danger small" type="button" data-act="delSavings" data-id="${s.id}">Delete</button></li>`).join('')}</ul>` : '<div class="empty">No deposits yet. Record what you actually saved, and the weekly bar fills in.</div>', { eyebrow: 'Records' })}
    <form data-submit="setTarget" class="card row-inline" style="padding:14px"><label class="small muted" for="target" style="flex:1 1 200px">Weekly savings target (PHP)</label><input class="input" id="target" name="target" type="number" min="0" step="1" value="${target}" style="flex:0 1 160px"><button class="btn small soft" type="submit">Update target</button></form>
  </div>`;
};

/* ---------- Screen time ---------- */
function screenForm(ymd) {
  const cur = S.screen[ymd];
  openForm({ title: 'Log screen time', fields: [
    { name: 'date', label: 'Date', type: 'date', value: ymd || todayYMD(), required: true },
    { name: 'hours', label: 'Total hours', type: 'number', min: 0, value: cur ? Math.floor(cur.total / 60) : '' },
    { name: 'minutes', label: 'Total minutes', type: 'number', min: 0, value: cur ? cur.total % 60 : '', hint: 'plus hours' },
    { name: 'social', label: 'Social media minutes', type: 'number', min: 0, value: cur ? cur.social : '', hint: 'optional' },
    { name: 'apps', label: 'Most used apps', type: 'textarea', rows: 3, maxLen: 600, placeholder: 'One per line: App name, minutes', value: cur ? cur.apps.map((a) => `${a.name}, ${a.min}`).join('\n') : '' },
  ], onSave: (v) => {
    const total = (Number(v.hours) || 0) * 60 + (Number(v.minutes) || 0);
    if (total <= 0) return 'Enter the total screen time for the day.';
    if (total > 24 * 60) return 'A day has 24 hours. Check the numbers.';
    const apps = v.apps.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 8).map((l) => { const [name, min] = l.split(','); return { name: (name || '').trim().slice(0, 60) || 'App', min: Math.max(0, Math.round(Number(min) || 0)) }; });
    change(() => { S.screen[v.date] = { total, social: Math.round(Number(v.social) || 0), apps }; });
    return '';
  } });
}
ACT.screenForm = (el) => screenForm(el.dataset.date || todayYMD());
ACT.delScreen = (el) => confirmDelete('Delete this day’s screen time?', () => change(() => { delete S.screen[el.dataset.date]; }));

window.VIEWS.screen = () => {
  const t = todayYMD();
  const cur = rangeDays(t, 7);
  const prev = rangeDays(addDays(t, -7), 7);
  const avgCur = avgScreen(cur), avgPrev = avgScreen(prev);
  const change_ = avgCur != null && avgPrev != null && avgPrev > 0 ? Math.round(((avgPrev - avgCur) / avgPrev) * 100) : null;
  const labels = cur.map((d) => fmtDay(d, { weekday: 'short' }));
  const appTotals = {};
  cur.forEach((d) => { (S.screen[d] || { apps: [] }).apps.forEach((a) => { appTotals[a.name] = (appTotals[a.name] || 0) + a.min; }); });
  const topApps = Object.entries(appTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const recent = Object.entries(S.screen).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);
  return `<div class="grid">
    <div class="row-inline" style="justify-content:space-between"><div><div class="eyebrow">Breaking up with doom scrolling</div><h1>Screen time</h1></div><button class="btn primary small" type="button" data-act="screenForm" data-date="${t}">Log today</button></div>
    <div class="stats">
      <div class="stat"><div class="small muted">This week’s average</div><div class="v">${avgCur == null ? '—' : hm(avgCur)}</div></div>
      <div class="stat"><div class="small muted">Previous week’s average</div><div class="v">${avgPrev == null ? '—' : hm(avgPrev)}</div></div>
      <div class="stat"><div class="small muted">Change</div><div class="v">${change_ == null ? '—' : change_ >= 0 ? `↓ ${change_}% less` : `↑ ${Math.abs(change_)}% more`}</div></div>
      <div class="stat"><div class="small muted">Days logged, last 7</div><div class="v">${cur.filter((d) => S.screen[d]).length}/7</div></div>
    </div>
    <p class="small muted">Reduction = (previous week average − this week average) ÷ previous week average × 100. The aim is less unnecessary use, not zero technology.</p>
    <div class="grid two">
      ${card('This week against last week', svgBars([{ name: 'This week', values: cur.map((d) => Math.round(screenTotal(d) || 0)), color: 'var(--rose)' }, { name: 'Last week', values: prev.map((d) => Math.round(screenTotal(d) || 0)), color: 'var(--pink)' }], labels) + legendHTML([['var(--rose)', 'This week'], ['var(--pink)', 'Last week']]), { eyebrow: 'Minutes per day' })}
      ${card('Most used this week', topApps.length ? `<ul class="list">${topApps.map(([n, m]) => `<li class="item"><span class="grow">${esc(n)}</span><span class="num">${hm(m)}</span></li>`).join('')}</ul>` : '<div class="empty">Add the top apps when you log a day.</div>', { eyebrow: 'Apps' })}
    </div>
    ${card('Records', recent.length ? `<ul class="list">${recent.map(([d, s]) => `<li class="item"><span class="grow">${fmtDay(d, { weekday: 'short', month: 'short', day: 'numeric' })} <span class="small muted">· social ${hm(s.social)}${s.apps.length ? ' · ' + s.apps.map((a) => esc(a.name)).join(', ') : ''}</span></span><span class="num">${hm(s.total)}</span><button class="btn ghost small" type="button" data-act="screenForm" data-date="${d}">Edit</button><button class="btn danger small" type="button" data-act="delScreen" data-date="${d}">Delete</button></li>`).join('')}</ul>` : '<div class="empty">Log today’s screen time to start your comparison.</div>', { eyebrow: 'History' })}
  </div>`;
};
