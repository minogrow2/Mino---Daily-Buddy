const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const seed = {
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme: 'light', savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
  courses: [
    { id: 'c1', name: 'Intro to Python for Data Analysis and Visualisation', platform: 'Coursera', lessonsTotal: 10, lessonsDone: 3, certificate: false, status: 'In progress', startedOn: '2026-11-03' },
    { id: 'c2', name: 'Old course', platform: '', lessonsTotal: 4, lessonsDone: 4, certificate: true },
  ],
};
(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 220) });
  const load = async (p) => {
    await p.goto(BASE + '#goal-cs');
    await p.evaluate(([x, t]) => { localStorage.setItem('mino.state.v2', JSON.stringify(x)); localStorage.setItem('mino.reminded', t); }, [seed, today]);
    await p.reload(); await p.waitForTimeout(400);
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await load(page);

  const box = await page.evaluate(() => {
    const row = document.querySelector('li.item select[data-change="courseStatus"]').closest('li.item');
    const card = row.closest('section.card') || row.closest('.card');
    const grid = card.parentElement;
    const name = row.querySelector('.grow').getBoundingClientRect();
    const rowR = row.getBoundingClientRect();
    const actions = row.querySelector('select').parentElement.getBoundingClientRect();
    return { cardW: card.getBoundingClientRect().width, gridW: grid.getBoundingClientRect().width, nameW: name.width, nameH: name.height, rowH: rowR.height, actionsW: actions.width, actionsTop: actions.top, nameTop: name.top };
  });
  check('the Courses card spans the full row', box.cardW >= box.gridW - 2, `card ${Math.round(box.cardW)} / grid ${Math.round(box.gridW)}`);
  check('the course name has room beside the controls', box.nameW >= 380, `name ${Math.round(box.nameW)}px`);
  check('the controls sit to the right of the text, not below it', box.actionsTop <= box.nameTop + 40, `actions top ${Math.round(box.actionsTop)}, name top ${Math.round(box.nameTop)}`);
  check('a course row is compact at desktop width', box.rowH <= 150, `row ${Math.round(box.rowH)}px`);
  check('status, +1 lesson, Edit and Delete still all work', (await page.locator('select[data-change="courseStatus"]').count()) === 2 && (await page.locator('[data-act="courseLesson"]').count()) === 2 && (await page.locator('[data-act="editCourse"]').count()) === 2 && (await page.locator('[data-act="delCourse"]').count()) === 2);
  await page.selectOption('select[data-change="courseStatus"][data-id="c1"]', 'Completed'); await page.waitForTimeout(300);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('mino.state.v2')).courses.find((c) => c.id === 'c1').status);
  check('the status dropdown still saves after the layout change', st === 'Completed', st);

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await load(mp);
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('no horizontal scroll at 390px', ov <= 1, `overflow ${ov}px`);
  const mob = await mp.evaluate(() => {
    const row = document.querySelector('li.item select[data-change="courseStatus"]').closest('li.item');
    const r = row.getBoundingClientRect();
    const sel = row.querySelector('select').getBoundingClientRect();
    return { rowRight: r.right, selRight: sel.right, vw: window.innerWidth };
  });
  check('at 390px the controls stay inside the course row', mob.selRight <= mob.rowRight + 1 && mob.rowRight <= mob.vw, JSON.stringify(mob));

  check('no page errors', errors.length === 0, errors.join(' | '));
  let fails = 0;
  for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`); }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await page.screenshot({ path: 'r20-courses-desktop.png', fullPage: false });
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
