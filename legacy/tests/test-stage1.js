const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const IMG = path.join(__dirname, '..', 'mino2', 'img', 'scene-desk.jpg');
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// Old-format state (no scenes, chatJournal, reminders, moneyActive; no mood html/photos)
const seed = {
  v: 2, updated: 1700000000000,
  habits: [{ id: 'vitc', title: 'Take Vitamin C and glutathione', group: 'core', order: 0, custom: false }, { id: 'water', title: 'Drink 1.5L water', group: 'core', order: 1, custom: false }, { id: 'skincare', title: 'Skincare routine', group: 'glow', order: 2, custom: false }],
  habitChecks: {}, tasks: [], milestones: [{ id: 'm1', goalId: 'ai', title: 'Old milestone', horizon: 'Short-term', due: '', done: true }],
  goalNotes: {}, resources: [], activities: [{ id: 'a1', date: '2026-11-10', category: 'ai', goalId: 'ai', title: 'Old study', minutes: 45, offline: false, note: '' }],
  journal: [{ id: 'j1', date: '2026-11-13', type: 'daily', title: 'Old entry', body: 'Hello from before the redesign.', tags: [], favorite: false, created: 1 }],
  moods: { '2026-11-13': { mood: 'happy', note: 'Old note kept' } }, savings: [], screen: {}, bucket: [], projects: [], library: [], wishlist: [], orders: [], workouts: [], courses: [], trades: [], sessions: [], chat: [],
  settings: { theme: 'system', savingsTarget: 1000, demo: false, name: 'QA' },
};

(async () => {
  const browser = await chromium.launch();
  const report = { checks: [], pageErrors: [], consoleErrors: [], imageStatuses: {}, routes: [] };
  const check = (name, ok, extra = '') => report.checks.push({ name, ok: !!ok, extra: String(extra).slice(0, 200) });
  const wire = (page) => {
    page.on('pageerror', (e) => report.pageErrors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/googleapis|ERR_|Failed to load resource/.test(m.text())) report.consoleErrors.push(m.text()); });
    page.on('response', (r) => { if (/\/img\//.test(r.url())) report.imageStatuses[path.basename(r.url())] = r.status(); });
  };

  // ---------- Desktop: migration, clock, Home actions ----------
  const desk = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await desk.newPage(); wire(page);
  await page.goto(BASE);
  await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await page.reload();
  await page.waitForSelector('#home-clock');
  const migrated = await page.evaluate(() => ({ scenes: S.settings.scenes, chatJournal: S.settings.chatJournal, reminders: S.settings.reminders, moodNote: S.moods['2026-11-13'].note, name: S.settings.name }));
  check('old data migrates (new settings defaults, old fields kept)', migrated.scenes && migrated.scenes.home === 'pond' && migrated.chatJournal === false && migrated.reminders === true && migrated.moodNote === 'Old note kept' && migrated.name === 'QA', JSON.stringify(migrated));
  const c1 = await page.textContent('#home-clock'); await page.waitForTimeout(1200); const c2 = await page.textContent('#home-clock');
  check('Manila clock ticks each second', c1 !== c2 && /[AP]M/.test(c2), `${c1} → ${c2}`);
  check('Home has its sections (hero, mood, suggestions, checklist, priorities, heatmap, goals, month, quick journal, chat)', await page.$$eval('#welcome, #mood-card, #suggestions, #checklist, #priorities, #heatmap, #goal-week, #month-preview, #quick-journal, #chat', (n) => n.length) === 10);
  check('old Something-to-do section is gone', (await page.textContent('#view')).indexOf('Something to do instead of scrolling') === -1);
  check('scene layer applied on Home', await page.evaluate(() => document.documentElement.dataset.scene === 'pond'));

  await page.click('[data-act="toggleHabit"][data-id="water"]');
  check('checklist toggle saves', await page.evaluate(() => Object.values(S.habitChecks).some((d) => d.water)));
  await page.fill('form[data-submit="addTask"] input[name="title"]', 'QA task');
  await page.click('form[data-submit="addTask"] button[type="submit"]');
  check('task added', await page.evaluate(() => S.tasks.some((t) => t.title === 'QA task')));

  // Mood: pick a mood, then write rich text and bold a word
  await page.click('#mood-card [data-act="setMood"][data-mood="happy"]');
  check('mood saved from Home', await page.evaluate((d) => S.moods[d].mood === 'happy', today));
  await page.click('#mood-card .rt');
  await page.keyboard.type('Felt calm after the walk.');
  await page.keyboard.press('Control+A');
  await page.click('#mood-card [data-cmd="bold"]');
  await page.waitForTimeout(150);
  const html = await page.evaluate((d) => S.moods[d].html, today);
  check('rich text saves and keeps bold', /<b>/.test(html) && /calm/.test(html), html);
  const sample = await page.evaluate(() => sanitizeRich('<img src=x onerror=alert(1)><script>x</script><b onclick=1>ok</b><span style="color:red">s</span><h1>t</h1>'));
  check('sanitizer drops scripts, images, attributes and unknown tags', sample === '<b>ok</b>st', sample);

  // Photo: compressed, stored in IndexedDB, shown from a blob URL
  await page.setInputFiles('#mood-card input[type="file"]', IMG);
  let src = '';
  for (let i = 0; i < 40 && !src.startsWith('blob:'); i++) { await page.waitForTimeout(150); src = (await page.getAttribute('#mood-card img[data-photo]', 'src')) || ''; }
  check('photo stored on device and shown', src.startsWith('blob:'), src.slice(0, 30));
  const photoIds = await page.evaluate((d) => S.moods[d].photos || [], today);
  check('photo id kept in state, bytes not', photoIds.length === 1 && !JSON.stringify(await page.evaluate(() => S)).includes('data:image'), photoIds.length);
  await page.screenshot({ path: path.join(OUT, 'desk-home.png'), fullPage: true });

  // Heatmap year navigation
  const year = await page.textContent('#heatmap strong');
  await page.click('#heatmap [data-act="heatYear"][data-dir="-1"]');
  check('heatmap goes back a year', (await page.textContent('#heatmap strong')) === String(Number(year) - 1));
  check('heatmap next-year button is enabled after going back', await page.evaluate(() => document.querySelector('#heatmap [data-dir="1"]').disabled === false));

  // Reminder banner: show it, then dismiss it
  await page.evaluate(() => { document.getElementById('reminder').hidden = false; });
  await page.click('#reminder [data-act="dismissReminder"]');
  check('reminder dismisses for today', await page.evaluate((d) => document.getElementById('reminder').hidden && localStorage.getItem('mino.reminded') === d, todayYMDsafe()), '');

  // Chat without Claude permission: honest note, no canned reply
  await page.fill('form[data-submit="askMino"] input[name="msg"]', 'Hi Mino');
  await page.click('form[data-submit="askMino"] button[type="submit"]');
  await page.waitForTimeout(400);
  const chatText = await page.textContent('#chat');
  check('chat shows an honest note, no canned reply', /can’t reply/.test(chatText) && !/Tell me more|Try this:|I hear you/.test(chatText), chatText.slice(0, 160));
  check('fallback reply code is gone', await page.evaluate(() => typeof fallbackReply === 'undefined'));

  // Journal-context option is off by default
  check('journal context off by default', await page.evaluate(() => S.settings.chatJournal === false && document.querySelector('[data-change="toggleChatJournal"]').checked === false));

  // Heatmap year nav back to current year, then goals
  await page.goto(BASE + '#goals');
  await page.waitForSelector('.goal-card');
  check('seven goal cards', (await page.$$('.goal-card')).length === 7);
  await page.goto(BASE + '#goal-money');
  await page.click('[data-act="toggleMoney"]');
  check('Internet Money activation switch', await page.evaluate(() => S.settings.moneyActive === true) && (await page.textContent('#view')).includes('Active'));
  await page.screenshot({ path: path.join(OUT, 'desk-goal-money.png'), fullPage: true });

  // Settings: background choice applies to the page
  await page.goto(BASE + '#preferences');
  await page.waitForSelector('[data-act="pickScene"][data-key="default"]');
  await page.click('[data-act="pickScene"][data-key="default"][data-value="none"]');
  await page.waitForTimeout(100);
  check('Plain cream turns the picture off', await page.evaluate(() => document.documentElement.dataset.scene) === 'none');
  await page.click('[data-act="pickScene"][data-key="default"][data-value="desk"]');
  await page.waitForTimeout(100);
  check('choosing a scene shows it behind the page', (await page.evaluate(() => getComputedStyle(document.getElementById('scene')).backgroundImage)).includes('scene-desk.jpg'));
  await page.screenshot({ path: path.join(OUT, 'desk-settings.png'), fullPage: true });

  // ---------- Every route at phone width: no page errors, no horizontal scroll ----------
  const routes = ['home', 'goals', 'goal-trading', 'goal-ai', 'goal-glow', 'goal-tech', 'goal-money', 'goal-reading', 'goal-cs', 'calendar', 'analytics', 'journal', 'mood', 'metime', 'savings', 'screen', 'techlab', 'library', 'preferences', 'buddy'];
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pp = await phone.newPage(); wire(pp);
  await pp.goto(BASE);
  await pp.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await pp.reload(); await pp.waitForSelector('#home-clock');
  for (const r of routes) {
    const before = report.pageErrors.length;
    await pp.goto(`${BASE}#${r}`); await pp.waitForTimeout(120);
    const info = await pp.evaluate(() => ({ len: document.getElementById('view').innerHTML.length, overflow: document.documentElement.scrollWidth - window.innerWidth }));
    report.routes.push({ route: r, chars: info.len, overflowPx: info.overflow, newErrors: report.pageErrors.length - before });
  }
  const bad = report.routes.filter((x) => x.chars < 50 || x.overflowPx > 1 || x.newErrors);
  check('every route renders, no overflow, no errors at 390px', bad.length === 0, JSON.stringify(bad));
  await pp.goto(BASE + '#home'); await pp.waitForTimeout(300);
  await pp.screenshot({ path: path.join(OUT, 'phone-home.png'), fullPage: true });
  await pp.goto(BASE + '#mood'); await pp.waitForTimeout(200);
  await pp.screenshot({ path: path.join(OUT, 'phone-mood.png'), fullPage: true });

  // Android tablet portrait
  const tab = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1 });
  const tp = await tab.newPage(); wire(tp);
  await tp.goto(BASE); await tp.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed); await tp.reload(); await tp.waitForSelector('#home-clock');
  const tov = await tp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('tablet portrait has no horizontal scroll', tov <= 1, tov);
  await tp.screenshot({ path: path.join(OUT, 'tablet-home.png'), fullPage: true });

  // Dark mode on a phone
  const dark = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const dp = await dark.newPage(); wire(dp);
  await dp.goto(BASE); await dp.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed); await dp.reload(); await dp.waitForSelector('#home-clock');
  await dp.screenshot({ path: path.join(OUT, 'phone-dark-home.png'), fullPage: true });

  const imgs = report.imageStatuses;
  check('all scene and thumbnail images load (200)', Object.keys(imgs).length >= 5 && Object.values(imgs).every((s) => s === 200), JSON.stringify(imgs));
  check('no page errors on desktop flow', report.pageErrors.length === 0, report.pageErrors.join(' | '));
  const passed = report.checks.filter((c) => c.ok).length;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`checks passed: ${passed}/${report.checks.length}`);
  for (const c of report.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  ← ' + c.extra}`);
  console.log('pageErrors:', report.pageErrors.length, report.pageErrors.slice(0, 5));
  console.log('consoleErrors:', report.consoleErrors.length, report.consoleErrors.slice(0, 5));
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });

function todayYMDsafe() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
