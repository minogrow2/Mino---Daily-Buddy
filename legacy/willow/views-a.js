/* Shared helpers, goal panels and goal actions. Pages live in home.js, goals.js and mood.js. */
const card = (title, body, o = {}) => `<section class="card ${o.cls || ''} reveal" ${o.id ? `id="${o.id}"` : ''}>${title ? `<div class="card-head"><div>${o.eyebrow ? `<div class="eyebrow">${esc(o.eyebrow)}</div>` : ''}<h2>${esc(title)}</h2></div>${o.right || ''}</div>` : ''}${body}</section>`;
const tasksOn = (ymd) => S.tasks.filter((t) => t.date === ymd).sort((a, b) => a.order - b.order);
const coreHabits = () => S.habits.filter((h) => h.group !== 'glow').sort((a, b) => a.order - b.order);
const glowHabits = () => S.habits.filter((h) => h.group === 'glow').sort((a, b) => a.order - b.order);
const milestonesOf = (gid) => S.milestones.filter((m) => m.goalId === gid);
const activitiesOf = (gid) => S.activities.filter((a) => a.goalId === gid).sort((a, b) => (a.date < b.date ? 1 : -1));
const GOAL_CAT = { trading: 'trading', ai: 'ai', glow: 'workout', tech: 'programming', money: 'personal', reading: 'reading', cs: 'cs' };
const lastNDays = (n) => rangeDays(todayYMD(), n);

function weekAggregate(ymd) {
  const start = weekStart(ymd);
  const acts = S.activities.filter((a) => a.date >= start && a.date <= ymd);
  const learn = acts.filter((a) => (CATS[a.category] || {}).learn || a.category === 'reading');
  const health = acts.filter((a) => a.category === 'workout');
  const habitCount = Object.entries(S.habitChecks).filter(([d]) => d >= start && d <= ymd).reduce((t, [, v]) => t + Object.values(v).filter(Boolean).length, 0);
  const offline = acts.filter((a) => (CATS[a.category] || {}).offline);
  return {
    learning: { count: learn.length, minutes: learn.reduce((t, a) => t + a.minutes, 0) },
    health: { count: health.length + habitCount, minutes: health.reduce((t, a) => t + a.minutes, 0) },
    personal: { count: offline.length, minutes: offline.reduce((t, a) => t + a.minutes, 0) },
  };
}

function minoTips() {
  const t = todayYMD();
  const tips = [];
  if (!S.moods[t]) tips.push('How are you feeling today? A quick mood check-in helps me help you.');
  const checks = S.habitChecks[t] || {};
  const left = coreHabits().filter((h) => !checks[h.id]);
  if (left.length) tips.push(`Pick one small thing from your checklist, like “${left[0].title}”. One is enough.`);
  const openTasks = tasksOn(t).filter((x) => !x.done);
  if (openTasks.length && !tasksOn(t).some((x) => x.priority)) tips.push('Star up to three tasks as today’s priorities. Everything else can wait.');
  const lastOffline = S.activities.filter((a) => (CATS[a.category] || {}).offline).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!lastOffline || t > addDays(lastOffline.date, 2)) tips.push('It has been a little while since something offline. A walk, a coffee, or a call with a friend would count.');
  const mood = S.moods[t];
  if (mood && ['stressed', 'tired', 'sad'].includes(mood.mood)) tips.push('Be gentle with yourself today. Choose one thing and let the rest go.');
  const thisWeek = avgScreen(rangeDays(t, 7)), lastWeek = avgScreen(rangeDays(addDays(t, -7), 7));
  if (thisWeek != null && lastWeek != null && thisWeek > lastWeek) tips.push('Screen time went up this week. No judgment, just notice it and pick one moment to put the phone down.');
  if (!tips.length) tips.push('Nice rhythm today. Enjoy the rest of it outside the screen.');
  return tips.slice(0, 3);
}

/* Goal-specific panels */
function panelTrading() {
  const t = todayYMD();
  const trades = S.trades.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const wins = trades.filter((x) => x.outcome === 'win').length;
  const totalR = trades.reduce((s, x) => s + (Number(x.r) || 0), 0);
  const stage = t < '2026-11-22' ? 0 : t < '2026-12-01' ? 1 : 2;
  const stages = [['Concepts and chart exploration', 'Nov 1–21'], ['Structured backtesting begins', 'Nov 22–30'], ['Backtesting, refinement and accuracy analysis', 'December']];
  return card('Trading roadmap', `<ol class="list" style="list-style:none;padding:0">${stages.map(([s, d], i) => `<li class="item"><span class="tag ${i === stage ? '' : 'muted'}">${i === stage ? 'Now' : i < stage ? 'Done' : 'Next'}</span><span class="grow">${esc(s)} <span class="muted small">${d}</span></span></li>`).join('')}</ol>
    <div class="stats" style="margin-top:12px"><div class="stat"><div class="small muted">Logged</div><div class="v">${trades.length}</div></div><div class="stat"><div class="small muted">Win rate</div><div class="v">${trades.length ? pct(wins, trades.length) + '%' : '—'}</div></div><div class="stat"><div class="small muted">Total R</div><div class="v">${trades.length ? totalR.toFixed(1) : '—'}</div></div><div class="stat"><div class="small muted">Avg R</div><div class="v">${trades.length ? (totalR / trades.length).toFixed(2) : '—'}</div></div></div>
    <p class="small muted" style="margin-top:12px">Paper trades and backtests only. Prop firm challenges and real-money trading are locked future milestones. They stay locked until you decide you are ready.</p>`,
    { eyebrow: 'Paper trading and backtests', right: '<button class="btn small soft" type="button" data-act="addTrade">+ Log trade</button>' }) +
    card('Trade and backtest journal', trades.length ? `<ul class="list">${trades.map((x) => `<li class="item"><span class="grow"><strong>${esc(x.setup)}</strong> <span class="muted small">${fmtDay(x.date)}</span><br><span class="tag ${x.outcome === 'win' ? '' : 'muted'}">${esc(x.outcome)}</span> <span class="small">${x.r != null && x.r !== '' ? Number(x.r) + 'R' : ''}</span></span><button class="btn danger small" type="button" data-act="delTrade" data-id="${x.id}">Delete</button></li>`).join('')}</ul>` : '<div class="empty">No trades logged yet. Log a backtest or paper trade with its setup and result.</div>', { eyebrow: 'Strategy accuracy' });
}
function panelAI() {
  const list = S.sessions.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  return card('AI sessions', list.length ? list.map((s) => `<article class="item" style="display:block;padding:12px 0"><div class="row-inline" style="justify-content:space-between"><strong>${fmtDay(s.date)}</strong><button class="btn danger small" type="button" data-act="delSession" data-id="${s.id}">Delete</button></div>
    ${[['Explored', s.explored], ['Learned', s.learned], ['Configured', s.configured], ['Built', s.built], ['Problems', s.problems], ['Next', s.next]].filter(([, v]) => v).map(([k, v]) => `<p class="small" style="margin-top:6px"><span class="muted">${k}:</span> ${esc(v)}</p>`).join('')}</article>`).join('') : '<div class="empty">No sessions yet. Log what you explored, learned, configured, built, what went wrong, and what is next.</div>',
    { eyebrow: 'Session log', right: '<button class="btn small soft" type="button" data-act="addSession">+ Log session</button>' });
}
function panelGlow() {
  const t = todayYMD();
  const checks = S.habitChecks[t] || {};
  const rituals = glowHabits().map((h) => `<li class="item ${checks[h.id] ? 'done' : ''}"><button class="check" type="button" role="checkbox" aria-checked="${!!checks[h.id]}" data-act="toggleHabit" data-id="${h.id}" aria-label="${esc(h.title)}">${checks[h.id] ? '✓' : ''}</button><span class="grow">${esc(h.title)}</span><button class="btn danger small" type="button" data-act="delGlowHabit" data-id="${h.id}">Delete</button></li>`).join('');
  const workouts = S.workouts.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
  const orders = S.orders.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  return card('Daily self-care', `<ul class="list">${rituals || '<li class="empty">No habits yet. Add the small things that help you feel good.</li>'}</ul><p class="small muted" style="margin-top:10px">Consistency over extremes. Nothing here is about appearance-based guilt.</p>`, { eyebrow: 'Habits', right: '<button class="btn small soft" type="button" data-act="addGlowHabit">+ Add habit</button>' }) +
    card('Workout journal', workouts.length ? `<ul class="list">${workouts.map((w) => `<li class="item"><span class="grow"><strong>${esc(w.exercise)}</strong> <span class="small muted">${fmtDay(w.date)}</span><br><span class="small muted">${w.sets ? w.sets + ' sets' : ''}${w.reps ? ' × ' + w.reps + ' reps' : ''}${w.minutes ? ' · ' + w.minutes + ' min' : ''}</span></span><button class="btn danger small" type="button" data-act="delWorkout" data-id="${w.id}">Delete</button></li>`).join('')}</ul>` : '<div class="empty">Log a light home workout with sets, reps or minutes.</div>',
      { eyebrow: 'Movement', right: '<button class="btn small soft" type="button" data-act="addWorkout">+ Log workout</button>' }) +
    card('Clothing orders and arrivals', orders.length ? `<ul class="list">${orders.map((o) => `<li class="item"><span class="grow"><strong>${esc(o.item)}</strong><br><span class="small muted">${esc(o.store || '')} · ordered ${fmtDay(o.date)}</span></span><select class="input" style="width:auto" data-change="orderStatus" data-id="${o.id}" aria-label="Status for ${esc(o.item)}">${ORDER_STATUS.map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select><button class="btn danger small" type="button" data-act="delOrder" data-id="${o.id}">Delete</button></li>`).join('')}</ul>` : '<div class="empty">Track each order here, for example your Pinduoduo clothing orders, until it arrives.</div>',
      { eyebrow: 'Wardrobe', right: '<button class="btn small soft" type="button" data-act="addOrder">+ Add order</button>' });
}
const COURSE_STATUS = ['Not started', 'In progress', 'Completed'];
/* Courses saved before the status field existed read their status from the lesson count. */
function courseStatus(c) {
  if (COURSE_STATUS.includes(c.status)) return c.status;
  if (c.lessonsTotal && c.lessonsDone >= c.lessonsTotal) return 'Completed';
  return c.lessonsDone > 0 ? 'In progress' : 'Not started';
}
function panelCS() {
  const courses = S.courses;
  /* The courses list takes the full row, so its text has room beside the controls. */
  return `<div style="grid-column:1/-1">${card('Monthly courses', courses.length ? `<ul class="list">${courses.map((c) => `<li class="item" style="align-items:flex-start"><span class="grow"><strong>${esc(c.name)}</strong><br><span class="small muted">${esc(c.platform || 'Platform not set')} · ${c.lessonsDone}/${c.lessonsTotal} lessons${c.certificate ? ' · certificate earned' : ''}${c.startedOn ? ' · started ' + fmtDay(c.startedOn) : ''}</span>
      <div class="bar" style="margin-top:8px"><span style="width:${pct(c.lessonsDone, c.lessonsTotal)}%"></span></div></span>
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;align-items:center;max-width:100%"><select class="input" style="width:auto" data-change="courseStatus" data-id="${c.id}" aria-label="Status for ${esc(c.name)}">${COURSE_STATUS.map((s) => `<option ${s === courseStatus(c) ? 'selected' : ''}>${s}</option>`).join('')}</select><button class="btn soft small" type="button" data-act="courseLesson" data-id="${c.id}" ${c.lessonsDone >= c.lessonsTotal ? 'disabled' : ''}>+1 lesson</button><button class="btn ghost small" type="button" data-act="editCourse" data-id="${c.id}">Edit</button><button class="btn danger small" type="button" data-act="delCourse" data-id="${c.id}">Delete</button></div></li>`).join('')}</ul>` : '<div class="empty">Add a course with its platform and lesson count. You can add more at any time.</div>',
    { eyebrow: 'Courses', right: '<button class="btn small soft" type="button" data-act="addCourse">+ Add course</button>' })}</div>`;
}
function panelTech() {
  const list = S.projects.slice(0, 6);
  return card('Tech projects', list.length ? `<ul class="list">${list.map((p) => `<li class="item"><span class="grow">${esc(p.title)}</span><span class="tag">${esc(p.status)}</span></li>`).join('')}</ul>` : '<div class="empty">Your projects live in the Tech Lab.</div>', { eyebrow: 'Linked', right: '<a class="btn small soft" href="#techlab">Open Tech Lab</a>' });
}
function panelReading() {
  const items = S.library.filter((x) => x.kind === 'content');
  return card('Watch and read', `<p class="small muted">${items.length} items saved. ${items.filter((x) => x.status === 'Completed').length} completed. Track meaningful content, not hours.</p>`, { eyebrow: 'Library', right: '<a class="btn small soft" href="#library">Open library</a>' });
}

/* Goal actions */
ACT.addMilestone = (el) => openForm({ title: 'New milestone', fields: [
  { name: 'title', label: 'Milestone', required: true, maxLen: 140 },
  { name: 'horizon', label: 'Type', type: 'select', options: [['Weekly', 'Weekly'], ['Short-term', 'Short-term'], ['Monthly', 'Monthly'], ['Long-term', 'Long-term']], value: 'Short-term' },
  { name: 'due', label: 'Due date', type: 'date' },
], onSave: (v) => { change(() => S.milestones.push({ id: uid(), goalId: el.dataset.goal, title: v.title, horizon: v.horizon, due: v.due || '', done: false })); return ''; } });
ACT.toggleMilestone = (el) => change(() => { const m = S.milestones.find((x) => x.id === el.dataset.id); if (m) m.done = !m.done; });
ACT.delMilestone = (el) => confirmDelete('Remove this milestone?', () => change(() => { S.milestones = S.milestones.filter((x) => x.id !== el.dataset.id); }));
ACT.addResource = (el) => openForm({ title: 'Add a resource', fields: [
  { name: 'title', label: 'Title', required: true, maxLen: 120 },
  { name: 'url', label: 'Link', type: 'url', required: true, placeholder: 'https://', maxLen: 500 },
], onSave: (v) => { change(() => S.resources.push({ id: uid(), goalId: el.dataset.goal, title: v.title, url: v.url })); return ''; } });
ACT.delResource = (el) => change(() => { S.resources = S.resources.filter((x) => x.id !== el.dataset.id); });
ACT.logActivity = (el) => {
  const g = el.dataset.goal;
  openForm({ title: 'Log activity', fields: [
    { name: 'title', label: 'What did you do?', required: true, maxLen: 120 },
    { name: 'date', label: 'Date', type: 'date', value: todayYMD(), required: true },
    { name: 'category', label: 'Kind', type: 'select', options: Object.entries(CATS).map(([k, c]) => [k, c.label]), value: GOAL_CAT[g] || 'personal' },
    { name: 'minutes', label: 'Minutes', type: 'number', min: 0, hint: 'optional' },
    { name: 'note', label: 'Note', type: 'textarea', rows: 2, maxLen: 500 },
  ], onSave: (v) => { change(() => addActivity({ title: v.title, date: v.date, category: v.category, goalId: g, minutes: v.minutes || 0, note: v.note })); return ''; } });
};
ACT.delActivity = (el) => confirmDelete('Delete this activity record?', () => change(() => { S.activities = S.activities.filter((x) => x.id !== el.dataset.id); }));
ACT.addTrade = () => openForm({ title: 'Log a trade or backtest', fields: [
  { name: 'date', label: 'Date', type: 'date', value: todayYMD(), required: true },
  { name: 'setup', label: 'Setup or strategy', required: true, maxLen: 140, placeholder: 'e.g. Break and retest, EURUSD 1H' },
  { name: 'outcome', label: 'Outcome', type: 'select', options: [['win', 'Win'], ['loss', 'Loss'], ['breakeven', 'Breakeven']], value: 'win' },
  { name: 'r', label: 'Result in R', type: 'number', hint: 'e.g. 1.5 or -1' },
], onSave: (v) => { change(() => S.trades.push({ id: uid(), date: v.date, setup: v.setup, outcome: v.outcome, r: v.r === '' ? null : v.r })); return ''; } });
ACT.delTrade = (el) => confirmDelete('Delete this trade record?', () => change(() => { S.trades = S.trades.filter((x) => x.id !== el.dataset.id); }));
ACT.addSession = () => openForm({ title: 'Log an AI session', fields: [
  { name: 'date', label: 'Date', type: 'date', value: todayYMD(), required: true },
  { name: 'explored', label: 'What I explored', type: 'textarea', rows: 2, maxLen: 500 },
  { name: 'learned', label: 'What I learned', type: 'textarea', rows: 2, maxLen: 500 },
  { name: 'configured', label: 'What I configured', type: 'textarea', rows: 2, maxLen: 500 },
  { name: 'built', label: 'What I built', type: 'textarea', rows: 2, maxLen: 500 },
  { name: 'problems', label: 'Problems encountered', type: 'textarea', rows: 2, maxLen: 500 },
  { name: 'next', label: 'What I want to explore next', type: 'textarea', rows: 2, maxLen: 500 },
  { name: 'minutes', label: 'Minutes', type: 'number', min: 0, hint: 'optional' },
], onSave: (v) => { change(() => { S.sessions.push({ id: uid(), date: v.date, explored: v.explored, learned: v.learned, configured: v.configured, built: v.built, problems: v.problems, next: v.next }); addActivity({ title: 'AI session', date: v.date, category: 'ai', goalId: 'ai', minutes: v.minutes || 0 }); }); return ''; } });
ACT.delSession = (el) => confirmDelete('Delete this session log?', () => change(() => { S.sessions = S.sessions.filter((x) => x.id !== el.dataset.id); }));
ACT.addWorkout = () => openForm({ title: 'Log a workout', fields: [
  { name: 'exercise', label: 'Exercise', required: true, maxLen: 100, placeholder: 'e.g. Squats' },
  { name: 'date', label: 'Date', type: 'date', value: todayYMD(), required: true },
  { name: 'sets', label: 'Sets', type: 'number', min: 0, hint: 'optional' },
  { name: 'reps', label: 'Reps', type: 'number', min: 0, hint: 'optional' },
  { name: 'minutes', label: 'Minutes', type: 'number', min: 0, hint: 'optional' },
], onSave: (v) => { change(() => { S.workouts.push({ id: uid(), exercise: v.exercise, date: v.date, sets: v.sets === '' ? null : v.sets, reps: v.reps === '' ? null : v.reps, minutes: v.minutes || 0 }); addActivity({ title: v.exercise, date: v.date, category: 'workout', goalId: 'glow', minutes: v.minutes || 0 }); }); return ''; } });
ACT.delWorkout = (el) => confirmDelete('Delete this workout entry?', () => change(() => { S.workouts = S.workouts.filter((x) => x.id !== el.dataset.id); }));
ACT.addOrder = () => openForm({ title: 'Add a clothing order', fields: [
  { name: 'item', label: 'Item', required: true, maxLen: 140 },
  { name: 'store', label: 'Store', value: 'Pinduoduo', maxLen: 80 },
  { name: 'date', label: 'Order date', type: 'date', value: todayYMD(), required: true },
  { name: 'status', label: 'Status', type: 'select', options: ORDER_STATUS.map((s) => [s, s]), value: 'Ordered' },
], onSave: (v) => { change(() => S.orders.push({ id: uid(), item: v.item, store: v.store, date: v.date, status: v.status })); return ''; } });
ACT.orderStatus = (el) => change(() => { const o = S.orders.find((x) => x.id === el.dataset.id); if (o) o.status = el.value; });
ACT.delOrder = (el) => confirmDelete('Remove this order from the tracker?', () => change(() => { S.orders = S.orders.filter((x) => x.id !== el.dataset.id); }));
/* Fields for adding or editing a course: blank for a new one, filled in from the course being edited. */
function courseFields(c) {
  return [
    { name: 'name', label: 'Course name', required: true, maxLen: 140, value: c ? c.name : '' },
    { name: 'platform', label: 'Platform', maxLen: 80, placeholder: 'e.g. Coursera', value: c ? c.platform || '' : '' },
    { name: 'lessonsTotal', label: 'Total lessons', type: 'number', min: 1, required: true, value: c ? c.lessonsTotal : '' },
    { name: 'lessonsDone', label: 'Lessons done', type: 'number', min: 0, hint: 'optional', value: c ? c.lessonsDone : '' },
    { name: 'status', label: 'Status', type: 'select', options: COURSE_STATUS.map((s) => [s, s]), value: c ? courseStatus(c) : 'Not started' },
    { name: 'startedOn', label: 'Day you started', type: 'date', hint: 'if you have started', value: c ? c.startedOn || '' : '' },
    { name: 'certificate', label: 'Certificate earned?', type: 'select', options: [['no', 'Not yet'], ['yes', 'Yes']], value: c && c.certificate ? 'yes' : 'no' },
  ];
}
/* The saved values of a course from the form. Lessons done never goes past the total. */
function courseValues(v) {
  const total = Number(v.lessonsTotal) || 0;
  return { name: v.name, platform: v.platform, lessonsTotal: total, lessonsDone: Math.min(total, Number(v.lessonsDone) || 0), status: v.status, startedOn: v.startedOn || '', certificate: v.certificate === 'yes' };
}
ACT.addCourse = () => openForm({ title: 'Add a course', fields: courseFields(null), onSave: (v) => {
  change(() => S.courses.push({ id: uid(), ...courseValues(v) }));
  return '';
} });
ACT.editCourse = (el) => {
  const c = S.courses.find((x) => x.id === el.dataset.id);
  if (!c) return;
  openForm({ title: 'Edit course', fields: courseFields(c), onSave: (v) => { change(() => Object.assign(c, courseValues(v))); return ''; } });
};
/* The status can be changed straight from the course row. */
ACT.courseStatus = (el) => change(() => { const c = S.courses.find((x) => x.id === el.dataset.id); if (c) c.status = el.value; });
ACT.courseLesson = (el) => change(() => {
  const c = S.courses.find((x) => x.id === el.dataset.id);
  if (c && c.lessonsDone < c.lessonsTotal) { c.lessonsDone += 1; addActivity({ title: 'Lesson: ' + c.name, category: 'cs', goalId: 'cs', minutes: 0 }); }
});
ACT.delCourse = (el) => confirmDelete('Delete this course from your tracker?', () => change(() => { S.courses = S.courses.filter((x) => x.id !== el.dataset.id); }));
