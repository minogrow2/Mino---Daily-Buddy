/* Home: one dashboard, top to bottom: a tall hero that shows the scene, mood, Willow’s suggestions, the daily checklist and priorities, the year map, weekly goal checklists with life balance, the month preview with quick journal, then chat and an evening reflection. */
const HOME_UI = { heatYear: Number(todayYMD().slice(0, 4)), month: null };
const PLAN = { date: null, dlg: null };
const MINO_RULES = 'You are Willow, a warm, non-judgmental daily companion inside a personal life journal. Never make the person feel their worth depends on productivity. Keep replies short (2–4 sentences). Encourage time offline and real-world experiences. Do not give medical, dieting, or financial advice; for trading, stay educational and never encourage real-money trading. Use only the context you are given; do not invent facts about the person.';

function minoContext() {
  const t = todayYMD();
  const checks = S.habitChecks[t] || {};
  const goals = GOALS.map((g) => `${g.name}: ${milestonesOf(g.id).filter((m) => m.done).length}/${milestonesOf(g.id).length} milestones`).join('; ');
  const open = tasksOn(t).filter((x) => !x.done).map((x) => x.title);
  const mood = S.moods[t] && S.moods[t].mood ? S.moods[t].mood : 'not logged';
  const w = avgScreen(rangeDays(t, 7));
  let text = `Today is ${t} (Asia/Manila). Habits done today: ${coreHabits().filter((h) => checks[h.id]).length}/${coreHabits().length}. Open tasks: ${open.join(', ') || 'none'}. Mood: ${mood}. Goals: ${goals}. Average screen time, last 7 days: ${w == null ? 'not logged' : hm(w)}.`;
  if (S.settings.chatJournal) {
    const recent = S.journal.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5)
      .map((j) => `${j.date} (${j.title || j.type}): ${String(j.body || '').slice(0, 400)}`).join('\n');
    text += recent ? `\nRecent journal entries, which the person chose to share:\n${recent}` : '';
  }
  return text;
}

/* ---------- A. Hero: the time and a greeting, on a clear part of the scene. Everything else scrolls below it. ---------- */
function sectionWelcome(t) {
  const hour = hourManila();
  const greet = hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const motto = ['Small steps still count.', 'Progress, not perfection.', 'Be curious today.', 'Rest is part of the plan.', 'Go outside for a little while.', 'You are allowed to enjoy this.', 'One good hour is a good hour.'][parseInt(t.slice(-2), 10) % 7];
  return `<section class="home-hero" id="welcome" aria-labelledby="welcome-title">
    <div class="hero-chip">
      <div class="eyebrow">${esc(fmtDay(t, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div>
      <div class="hero-time" aria-label="Current time in Manila"><span id="home-clock">${clockText()}</span></div>
      <p class="small muted" style="margin-top:2px">Manila time</p>
      <h1 id="welcome-title" class="welcome-title">${greet}, ${esc(S.settings.name || 'friend')}.</h1>
      <p class="kicker" style="margin-top:6px">Willow is here. ${esc(motto)}</p>
    </div>
  </section>`;
}

/* ---------- B. Mood: the editor lives in mood.js (moodCard) ---------- */
function sectionMood(t) { return moodCard(t, { compact: true }); }

/* ---------- C. Willow’s suggestions: a small card, suggestions only ---------- */
function sectionSuggestions() {
  const tips = minoTips().map((tip) => `<li style="padding:8px 0;border-bottom:1px solid var(--line)">${esc(tip)}</li>`).join('')
    || '<li class="muted small" style="padding:8px 0">Nothing to suggest right now.</li>';
  return card('Willow’s suggestions', `<ul class="list" style="list-style:none;padding:0;margin:0">${tips}</ul>
    <p class="small muted" style="margin-top:8px">Based on your checklist, tasks, mood and recent activity. Suggestions only; nothing is judged.</p>`, { eyebrow: 'For today', id: 'suggestions' });
}

/* ---------- D. Daily checklist ---------- */
function sectionChecklist(t) {
  const checks = S.habitChecks[t] || {};
  const habits = coreHabits();
  const done = habits.filter((h) => checks[h.id]).length;
  const rows = habits.map((h, i) => `
    <li class="item ${checks[h.id] ? 'done' : ''}">
      <button class="check" type="button" role="checkbox" aria-checked="${!!checks[h.id]}" data-act="toggleHabit" data-id="${h.id}" aria-label="${esc(h.title)}">${checks[h.id] ? '✓' : ''}</button>
      <span class="grow">${esc(h.title)}</span>
      <span class="row-inline" style="gap:2px">
        <button class="btn ghost small" type="button" data-act="moveHabit" data-id="${h.id}" data-dir="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn ghost small" type="button" data-act="moveHabit" data-id="${h.id}" data-dir="1" aria-label="Move down" ${i === habits.length - 1 ? 'disabled' : ''}>↓</button>
        ${h.custom ? `<button class="btn ghost small" type="button" data-act="editHabit" data-id="${h.id}">Edit</button><button class="btn danger small" type="button" data-act="delHabit" data-id="${h.id}">Delete</button>` : ''}
      </span></li>`).join('');
  return card('Daily checklist', `
    <ul class="list">${rows}</ul>
    <div class="row-inline" style="margin-top:12px;justify-content:space-between">
      <span class="small muted">Resets each day. Past days stay in your calendar.</span>
      <button class="btn small soft" type="button" data-act="addHabit">+ Add habit</button>
    </div>`, { eyebrow: `${done} of ${habits.length} done`, id: 'checklist' });
}

/* ---------- E. Today’s priorities ---------- */
function sectionPriorities(t) {
  const tasks = tasksOn(t);
  const priorities = tasks.filter((x) => x.priority);
  const rows = tasks.map((x, i) => `
    <li class="item ${x.done ? 'done' : ''}">
      <button class="check" type="button" role="checkbox" aria-checked="${!!x.done}" data-act="toggleTask" data-id="${x.id}" aria-label="${esc(x.title)}">${x.done ? '✓' : ''}</button>
      <span class="grow">${esc(x.title)}</span>
      <button class="btn ghost small" type="button" data-act="starTask" data-id="${x.id}" aria-pressed="${!!x.priority}" aria-label="Priority">${x.priority ? '★' : '☆'}</button>
      <button class="btn ghost small" type="button" data-act="moveTask" data-id="${x.id}" data-dir="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn ghost small" type="button" data-act="editTask" data-id="${x.id}">Edit</button>
      <button class="btn danger small" type="button" data-act="delTask" data-id="${x.id}">Delete</button></li>`).join('');
  return card('Today’s priorities', `
    ${priorities.length ? `<ol class="list" style="padding-left:18px">${priorities.map((x) => `<li class="${x.done ? 'done' : ''}" style="padding:4px 0">${esc(x.title)}</li>`).join('')}</ol>`
      : '<p class="muted small">Star up to three tasks below to make them today’s priorities.</p>'}
    <div style="height:14px"></div>
    <ul class="list">${rows || '<li class="empty">No tasks yet today. Add one below.</li>'}</ul>
    <form data-submit="addTask" class="row-inline" style="margin-top:12px">
      <input class="input" name="title" maxlength="120" placeholder="Add a task for today" aria-label="New task" required>
      <button class="btn small primary" type="submit">Add</button>
    </form>`, { eyebrow: `${priorities.length} of 3 priorities`, id: 'priorities' });
}

/* ---------- F. Heatmap with year navigation ---------- */
function sectionHeatmap() {
  const today = todayYMD();
  const y = HOME_UI.heatYear;
  const jan1 = `${y}-01-01`, dec31 = `${y}-12-31`;
  const start = weekStart(jan1);
  const endSunday = addDays(weekStart(dec31), 6);
  const count = Math.round((Date.parse(`${endSunday}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 864e5) + 1;
  let cells = '', active = 0;
  for (let i = 0; i < count; i++) {
    const d = addDays(start, i);
    if (d < jan1 || d > dec31) { cells += '<span class="cell blank" aria-hidden="true"></span>'; continue; }
    const score = dayScore(d);
    if (score) active++;
    const label = `${fmtDay(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}: ${score} ${score === 1 ? 'entry' : 'entries'}`;
    cells += `<button class="cell l${level(score)}${d === today ? ' today' : ''}${d > today ? ' future' : ''}" type="button" data-act="heatPick" data-date="${d}" title="${esc(label)}" aria-label="${esc(label)}"></button>`;
  }
  const thisYear = Number(today.slice(0, 4));
  return card('Days I showed up', `
    <div class="row-inline" style="justify-content:space-between;margin-bottom:10px">
      <button class="btn ghost small" type="button" data-act="heatYear" data-dir="-1" aria-label="Previous year">‹ ${y - 1}</button>
      <strong class="num" style="font-size:16px">${y}</strong>
      <button class="btn ghost small" type="button" data-act="heatYear" data-dir="1" aria-label="Next year" ${y >= thisYear ? 'disabled' : ''}>${y + 1} ›</button>
    </div>
    <div class="heat-wrap"><div class="heat" role="img" aria-label="Activity map for ${y}">${cells}</div></div>
    <div class="row-inline" style="justify-content:space-between;margin-top:10px">
      <span class="small muted">${active} ${active === 1 ? 'day' : 'days'} with a checkmark, activity or journal entry in ${y}</span>
      <span class="legend">Less <i style="background:var(--heat-0)"></i><i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i> More</span>
    </div>`, { eyebrow: 'Your year at a glance', id: 'heatmap' });
}
ACT.heatYear = (el) => {
  const next = HOME_UI.heatYear + Number(el.dataset.dir);
  if (next > Number(todayYMD().slice(0, 4))) return;
  HOME_UI.heatYear = next;
  render();
};

/* ---------- G. This week’s goals: one row per goal, seven circles for Monday to Sunday. A circle is on when something is logged for that goal that day. ---------- */
function sectionGoals(t) {
  const start = weekStart(t);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const range = `${fmtDay(start, { month: 'short', day: 'numeric' })} – ${fmtDay(days[6], { month: 'short', day: 'numeric' })}`;
  const rows = GOALS.map((g) => {
    const loggedOn = (d) => S.activities.some((a) => a.goalId === g.id && a.date === d);
    const n = days.filter(loggedOn).length;
    const cells = days.map((d, i) => {
      const on = loggedOn(d);
      const label = fmtDay(d, { weekday: 'long', month: 'short', day: 'numeric' });
      return `<button class="wk-day${on ? ' on' : ''}${d === t ? ' today' : ''}" type="button" data-act="toggleGoalDay" data-goal="${g.id}" data-date="${d}" aria-pressed="${on}" aria-label="${esc(label)}: ${on ? 'logged' : 'not logged'}"${d > t ? ' disabled' : ''}><span class="wk-dow" aria-hidden="true">${dow[i]}</span><span class="wk-circle" aria-hidden="true">${on ? '♥' : ''}</span></button>`;
    }).join('');
    return `<div class="wk-goal" style="--tint:${GOAL_TINT[g.id]}">
      <div class="wk-head"><a class="wk-name" href="#goal-${g.id}"><span class="wk-tint" aria-hidden="true"></span>${esc(g.name)}</a><span class="small muted">${n}/7 this week</span></div>
      <div class="wk-days" role="group" aria-label="${esc(g.name)}, this week">${cells}</div>
    </div>`;
  }).join('');
  const wk = weekAggregate(t);
  const balance = `<div class="stats" style="grid-template-columns:repeat(3,1fr)">
    ${[['Learning', wk.learning], ['Health', wk.health], ['Life', wk.personal]].map(([label, v]) => `
      <div class="stat"><div class="small muted">${label}</div><div class="v">${v.count}</div><div class="small muted">${hm(v.minutes)}</div></div>`).join('')}
  </div><p class="small muted" style="margin-top:10px">Last 7 days, Monday to today. All three matter equally.</p>`;
  return `<div class="grid two">
    <div style="grid-column:1/-1">${card('Goal progress', `<p class="small muted" style="margin-top:-4px">Tap a day to log that goal. A filled circle means something was logged for it that day.</p><div class="wk-list">${rows}</div>`,
      { eyebrow: `This week · ${range}`, id: 'goal-week', right: '<a class="small" href="#goals">All goals</a>' })}</div>
    ${card('Life balance', balance, { eyebrow: 'This week' })}
  </div>`;
}
ACT.toggleGoalDay = (el) => {
  const goal = goalById(el.dataset.goal), d = el.dataset.date;
  if (!goal || !d || d > todayYMD()) return;
  const mine = S.activities.filter((a) => a.goalId === goal.id && a.date === d);
  if (mine.some((a) => a.checklist)) {
    change(() => { S.activities = S.activities.filter((a) => !(a.goalId === goal.id && a.date === d && a.checklist)); });
    return;
  }
  if (mine.length) { toast('Logged on the goal page. Delete it there to uncheck this day.'); return; }
  change(() => addActivity({ date: d, goalId: goal.id, category: GOAL_CAT[goal.id] || 'personal', title: goal.name, minutes: 0, checklist: true }));
  toast(`Logged for ${goal.name}.`);
};

/* ---------- H. Month preview: real dates, dots for what is planned or logged. Tap a day to plan it. ---------- */
function dotsOn(d) {
  const out = [];
  if (tasksOn(d).length) out.push('t');
  if (S.events.some((e) => e.date === d)) out.push('e');
  if (S.milestones.some((m) => m.due === d)) out.push('m');
  if (activitiesOn(d).length) out.push('a');
  return out;
}
function sectionMonth(t) {
  const first = (HOME_UI.month || monthStart(t)).slice(0, 7) + '-01';
  const lead = (dowOf(first) + 6) % 7;
  const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<div class="mcal-dow">${x}</div>`).join('');
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="mcell blank" aria-hidden="true"></span>';
  for (let k = 1; k <= daysInMonth(first); k++) {
    const d = `${first.slice(0, 7)}-${String(k).padStart(2, '0')}`;
    const planned = tasksOn(d).length + S.events.filter((e) => e.date === d).length;
    const label = fmtDay(d, { weekday: 'long', month: 'long', day: 'numeric' });
    cells += `<button class="mcell${d === t ? ' today' : ''}" type="button" data-act="planDay" data-date="${d}" aria-label="${esc(label)}${planned ? `, ${planned} planned` : ''}">
      <span class="mnum">${k}</span><span class="mdots" aria-hidden="true">${dotsOn(d).map((c) => `<i class="mdot ${c}"></i>`).join('')}</span></button>`;
  }
  const isNow = first.slice(0, 7) === t.slice(0, 7);
  const nav = `<div class="row-inline" style="gap:4px">
    <button class="btn ghost small" type="button" data-act="homeMonth" data-dir="-1" aria-label="Previous month">‹</button>
    ${isNow ? '' : '<button class="btn ghost small" type="button" data-act="homeToday">Today</button>'}
    <button class="btn ghost small" type="button" data-act="homeMonth" data-dir="1" aria-label="Next month">›</button></div>`;
  const body = `<div class="mcal">${dows}${cells}</div>
    <div class="mlegend small muted"><span><i class="mdot t"></i>Task</span><span><i class="mdot e"></i>Event</span><span><i class="mdot m"></i>Due</span><span><i class="mdot a"></i>Logged</span></div>
    <div class="row-inline" style="justify-content:space-between;margin-top:10px"><span class="small muted">Tap a day to add a task or event.</span><a class="btn ghost small" href="#calendar">Open calendar</a></div>`;
  return card(fmtMonth(first), body, { eyebrow: 'Month', id: 'month-preview', right: nav });
}
ACT.homeMonth = (el) => {
  const [y, m] = (HOME_UI.month || monthStart(todayYMD())).slice(0, 7).split('-').map(Number);
  let ny = y, nm = m + Number(el.dataset.dir);
  if (nm < 1) { nm = 12; ny -= 1; }
  if (nm > 12) { nm = 1; ny += 1; }
  HOME_UI.month = `${ny}-${String(nm).padStart(2, '0')}-01`;
  render();
};
ACT.homeToday = () => { HOME_UI.month = null; render(); };

/* The day planner: a dialog listing what is on that day, with a form to add a task or an event. */
function paintPlanner() {
  const dlg = PLAN.dlg;
  if (!dlg || !PLAN.date) return;
  const d = PLAN.date;
  const events = S.events.filter((e) => e.date === d).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .map((e) => ({ kind: 'event', id: e.id, title: e.title, sub: e.time ? `Event · ${e.time}` : 'Event', done: false }));
  const tasks = tasksOn(d).map((x) => ({ kind: 'task', id: x.id, title: x.title, sub: x.done ? 'Task · done' : 'Task', done: x.done }));
  const items = [...events, ...tasks];
  const list = items.length
    ? `<ul class="list">${items.map((x) => `<li class="item ${x.done ? 'done' : ''}"><span class="grow">${x.kind === 'event' ? '◷' : x.done ? '✓' : '○'} ${esc(x.title)}<br><span class="small muted">${esc(x.sub)}</span></span><button class="btn danger small" type="button" data-act="delPlanItem" data-kind="${x.kind}" data-id="${x.id}">Delete</button></li>`).join('')}</ul>`
    : '<p class="muted small">Nothing planned for this day yet.</p>';
  dlg.innerHTML = `<form class="dlg" data-submit="addPlanItem" novalidate>
    <div class="card-head" style="margin-bottom:4px"><div><div class="eyebrow">Plan the day</div><h2 style="margin:4px 0 0">${esc(fmtDay(d, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</h2></div>
      <button class="btn ghost small" type="button" data-act="closePlanner">Close</button></div>
    ${list}
    <label>Type<select class="input" name="kind"><option value="task">Task</option><option value="event">Event</option></select></label>
    <label>Title<input class="input" name="title" maxlength="140" placeholder="What is it?" autocomplete="off"></label>
    <label>Time <span class="muted">· optional, for events</span><input class="input" name="time" type="time"></label>
    <p class="err" role="alert"></p>
    <div class="actions"><button class="btn primary" type="submit">Add to this day</button></div>
  </form>`;
  if (!dlg.open) dlg.showModal();
  setTimeout(() => { const first = dlg.querySelector('[name="title"]'); if (first) first.focus(); }, 40);
}
ACT.planDay = (el) => {
  PLAN.date = el.dataset.date;
  if (!PLAN.dlg) {
    const dlg = document.createElement('dialog');
    dlg.className = 'form-dialog plan-dialog';
    dlg.addEventListener('close', () => { dlg.remove(); PLAN.dlg = null; });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
    PLAN.dlg = dlg;
  }
  paintPlanner();
};
ACT.closePlanner = () => { if (PLAN.dlg) PLAN.dlg.close(); };
ACT.addPlanItem = (f) => {
  const d = PLAN.date;
  if (!d) return;
  const kind = f.elements.kind.value;
  const title = f.elements.title.value.trim();
  const time = f.elements.time.value;
  if (!title) { f.querySelector('.err').textContent = 'Give it a short title first.'; return; }
  change(() => {
    if (kind === 'event') S.events.push({ id: uid(), date: d, title: title.slice(0, 140), time, created: Date.now() });
    else S.tasks.push({ id: uid(), date: d, title: title.slice(0, 140), done: false, priority: false, order: nextOrder(tasksOn(d)) });
  });
  paintPlanner();
  toast(kind === 'event' ? 'Event added.' : 'Task added.');
};
ACT.delPlanItem = (el) => {
  const kind = el.dataset.kind, id = el.dataset.id;
  confirmDelete(kind === 'event' ? 'Delete this event?' : 'Delete this task?', () => {
    change(() => {
      if (kind === 'event') S.events = S.events.filter((e) => e.id !== id);
      else S.tasks = S.tasks.filter((x) => x.id !== id);
    });
    paintPlanner();
  });
};

/* ---------- I. Quick journal: the same rich-text editor as the mood page. ---------- */
function sectionQuickJournal() {
  return card('Quick journal', `
    <form data-submit="quickJournal">
      ${richEditorShell({ label: 'Quick journal entry', placeholder: 'Something about your day…', checklist: true })}
      <div class="row-inline" style="justify-content:flex-end;margin-top:10px"><a class="btn ghost small" href="#journal">Open journal</a><button class="btn small primary" type="submit">Save entry</button></div>
    </form>`, { eyebrow: 'Today', id: 'quick-journal' });
}

/* ---------- J. Willow chat, and an optional evening reflection ---------- */
function sectionChat() {
  const bubbles = S.chat.length ? S.chat.map((c) => {
    if (c.role === 'note') return `<p class="chat-note">${esc(c.text)}</p>`;
    if (c.pending) return `<div class="bubble mino" id="mino-live">Thinking…</div>`;
    return `<div class="bubble ${c.role === 'me' ? 'me' : 'mino'}">${esc(c.text)}</div>`;
  }).join('') : '<p class="muted small">Say hello. Willow can help you plan, reflect, or find something to do outside.</p>';
  return card('Chat with Willow', `
    <p class="chat-note" id="chat-notice" ${Caps.sample === null ? '' : 'hidden'}>${Caps.sample === null ? 'Willow can’t reply on this page yet. Claude permission is needed. Your checklist, goals and journal work without it.' : ''}</p>
    <div class="chat" aria-live="polite" style="max-height:340px;overflow:auto;padding-right:4px;margin-top:10px">${bubbles}</div>
    <form data-submit="askMino" class="row-inline" style="margin-top:12px"><input class="input" name="msg" maxlength="800" placeholder="Talk to Willow…" aria-label="Message Willow" required><button class="btn primary small" type="submit">Send</button></form>
    <label class="check-row small" style="margin-top:10px"><input type="checkbox" data-change="toggleChatJournal" ${S.settings.chatJournal ? 'checked' : ''}> Let Willow read my last five journal entries. Off by default.</label>
    <div class="row-inline" style="justify-content:space-between;margin-top:8px"><span class="small muted">Willow sees goals, today’s checklist, mood and screen time. Journal text only if you turn it on above.</span>${S.chat.length ? '<button class="btn danger small" type="button" data-act="clearChat">Delete conversation</button>' : ''}</div>`,
  { eyebrow: 'Conversation', id: 'chat' });
}
function sectionReflection() {
  return `<details class="card reflection reveal" style="align-self:start"><summary><span class="eyebrow" style="display:inline">Evening reflection</span> <span class="small muted">optional</span></summary>
    <form data-submit="reflect" class="dlg" style="padding:12px 0 0;gap:10px">
      <p class="small muted">What did you learn, accomplish and enjoy today?</p>
      <label>What did you learn?<input class="input" name="learned" maxlength="300"></label>
      <label>What did you accomplish?<input class="input" name="done" maxlength="300"></label>
      <label>What did you enjoy?<input class="input" name="enjoyed" maxlength="300"></label>
      <div style="text-align:right"><button class="btn primary small" type="submit">Save reflection</button></div>
    </form></details>`;
}

window.VIEWS = window.VIEWS || {};
window.VIEWS.home = () => {
  const t = todayYMD();
  return `<div class="grid home">
    ${sectionWelcome(t)}
    ${sectionMood(t)}
    <div class="grid two">${sectionChecklist(t)}${sectionPriorities(t)}</div>
    ${sectionHeatmap()}
    ${sectionGoals(t)}
    <div class="grid two">${sectionMonth(t)}${sectionQuickJournal()}</div>
    <div class="grid two">${sectionChat()}<div class="grid">${sectionReflection()}</div></div>
    ${sectionSuggestions()}
  </div>`;
};

/* ---------- Actions: chat, reflection, Settings toggles ---------- */
ACT.askMino = async (f) => {
  const input = f.elements.msg;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  S.chat.push({ role: 'me', text: msg, t: Date.now() });
  const cap = await sampleCap();
  if (!cap) {
    S.chat.push({ role: 'note', text: 'Willow can’t reply right now because this page doesn’t have Claude permission. Your message is saved.', t: Date.now() });
    change(() => {});
    return;
  }
  const turns = S.chat.filter((c) => c.role !== 'note').slice(-8).map((c) => ({ role: c.role === 'me' ? 'user' : 'assistant', content: c.text }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  S.chat.push({ role: 'mino', text: '', t: Date.now(), pending: true });
  change(() => {});
  let reply = '', problem = '';
  try {
    const { text } = await cap([{ role: 'user', content: `${MINO_RULES}\n\nContext about the person: ${minoContext()}` }, ...turns], {
      cache: false,
      onText: ({ text: whole }) => { const el = $('#mino-live'); if (el) el.textContent = whole; },
    });
    reply = text;
  } catch (e) {
    reply = (e && e.text) || '';
    problem = copyForSample(e && e.code);
  }
  S.chat = S.chat.filter((c) => !c.pending);
  if (reply) S.chat.push({ role: 'mino', text: reply, t: Date.now() });
  if (problem) S.chat.push({ role: 'note', text: problem, t: Date.now() });
  change(() => {});
};
ACT.clearChat = () => confirmDelete('This removes the whole conversation with Willow from this account.', () => change(() => { S.chat = []; }));
ACT.toggleChatJournal = (el) => change(() => { S.settings.chatJournal = el.checked; });
ACT.toggleReminders = (el) => { change(() => { S.settings.reminders = el.checked; }); checkReminder(); };
ACT.reflect = (f) => {
  const learned = f.elements.learned.value.trim(), done = f.elements.done.value.trim(), enjoyed = f.elements.enjoyed.value.trim();
  if (!learned && !done && !enjoyed) { toast('Write one line for any of these.'); return; }
  change(() => {
    S.journal.push({ id: uid(), date: todayYMD(), type: 'daily', title: 'Evening reflection', body: `Learned: ${learned}\nAccomplished: ${done}\nEnjoyed: ${enjoyed}`.trim(), tags: ['reflection'], favorite: false, created: Date.now() });
  });
  toast('Saved to your journal.');
};
