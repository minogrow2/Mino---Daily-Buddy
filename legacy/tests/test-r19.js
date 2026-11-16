const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const seed = (extra = {}) => Object.assign({
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme: 'light', savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
  courses: [
    { id: 'c1', name: 'Intro to Python', platform: 'Coursera', lessonsTotal: 10, lessonsDone: 0, certificate: false, status: 'Not started', startedOn: '' },
    { id: 'c2', name: 'Old course', platform: '', lessonsTotal: 4, lessonsDone: 4, certificate: false },
  ],
}, extra);
(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 220) });
  const readState = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mino.state.v2') || 'null'));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const confirmYes = async (p) => { await p.locator('dialog[open] form.dlg button[type="submit"]').last().click(); await p.waitForTimeout(350); };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#goal-cs');
  await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed());
  await page.evaluate((t) => localStorage.setItem('mino.reminded', t), today);
  await page.reload(); await page.waitForTimeout(450);

  const sel = (id) => `select[data-change="courseStatus"][data-id="${id}"]`;
  check('each course row has a status dropdown', (await page.locator(sel('c1')).count()) === 1 && (await page.locator(sel('c2')).count()) === 1);
  check('the dropdown shows the saved status', (await page.$eval(sel('c1'), (s) => s.value)) === 'Not started');
  check('an older course reads its status from its lessons', (await page.$eval(sel('c2'), (s) => s.value)) === 'Completed');

  await page.selectOption(sel('c1'), 'In progress'); await page.waitForTimeout(300);
  let st = await readState(page);
  check('changing the dropdown saves the new status', (st.courses.find((c) => c.id === 'c1') || {}).status === 'In progress', JSON.stringify(st.courses[0]));
  check('the dropdown keeps the new status after saving', (await page.$eval(sel('c1'), (s) => s.value)) === 'In progress');

  await page.locator('li.item', { hasText: 'Intro to Python' }).locator('[data-act="editCourse"]').click(); await page.waitForTimeout(250);
  check('Edit opens the course with its details filled in', (await page.inputValue('dialog[open] input[name="name"]')) === 'Intro to Python' && (await page.inputValue('dialog[open] input[name="platform"]')) === 'Coursera' && (await page.inputValue('dialog[open] select[name="status"]')) === 'In progress');
  await page.fill('dialog[open] input[name="name"]', 'Python for Data');
  await page.selectOption('dialog[open] select[name="status"]', 'Completed');
  await page.fill('dialog[open] input[name="startedOn"]', '2026-11-03');
  await confirmYes(page);
  st = await readState(page);
  const c1 = st.courses.find((c) => c.id === 'c1') || {};
  check('Edit saves the name, status and start day to the same course', c1.name === 'Python for Data' && c1.status === 'Completed' && c1.startedOn === '2026-11-03' && st.courses.length === 2, JSON.stringify(c1));
  check('the edited course shows its new name', (await page.textContent('body')).includes('Python for Data'));

  await page.goto(BASE + '#analytics'); await page.waitForTimeout(400);
  const body = await page.textContent('body');
  check('the Home summary counts courses by their status', body.includes('2 of 2 completed'), body.match(/\d+ of \d+ completed/) ? body.match(/\d+ of \d+ completed/)[0] : 'not found');

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await mp.goto(BASE + '#goal-cs');
  await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed());
  await mp.reload(); await mp.waitForTimeout(350);
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('the course page has no horizontal scroll at 390px', ov <= 1, `overflow ${ov}px`);

  check('no page errors', errors.length === 0, errors.join(' | '));
  let fails = 0;
  for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`); }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
