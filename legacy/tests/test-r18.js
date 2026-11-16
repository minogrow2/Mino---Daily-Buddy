const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const seed = (extra = {}) => Object.assign({
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme: 'light', savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
}, extra);
(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 220) });
  const readState = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mino.state.v2') || 'null'));
  const confirmYes = async (p) => { await p.locator('dialog[open] form.dlg button[type="submit"]').last().click(); await p.waitForTimeout(350); };
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#goal-glow');
  await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed());
  await page.evaluate((t) => localStorage.setItem('mino.reminded', t), today);
  await page.reload(); await page.waitForTimeout(450);

  // Glow Up: habits
  check('the self-care card has an Add habit button', (await page.locator('[data-act="addGlowHabit"]').count()) === 1);
  check('each self-care habit has a Delete button', (await page.locator('[data-act="delGlowHabit"]').count()) >= 4);
  await page.click('[data-act="addGlowHabit"]'); await page.waitForTimeout(250);
  await page.fill('dialog[open] input[name="title"]', 'Stretch for ten minutes');
  await confirmYes(page);
  let st = await readState(page);
  check('adding a habit saves it to Glow Up', (st.habits || []).some((h) => h.title === 'Stretch for ten minutes' && h.group === 'glow'));
  check('the new habit shows in the list', (await page.textContent('body')).includes('Stretch for ten minutes'));
  await page.locator('li.item', { hasText: 'Stretch for ten minutes' }).locator('[data-act="delGlowHabit"]').click(); await page.waitForTimeout(250);
  await confirmYes(page);
  st = await readState(page);
  check('deleting a habit removes it', !(st.habits || []).some((h) => h.title === 'Stretch for ten minutes'));
  await page.locator('li.item', { hasText: 'Be mindful of sugar' }).locator('[data-act="delGlowHabit"]').click(); await page.waitForTimeout(250);
  await confirmYes(page);
  st = await readState(page);
  check('a default habit can also be removed', !(st.habits || []).some((h) => h.id === 'sugar'));

  // CS: course status and start day
  await page.goto(BASE + '#goal-cs'); await page.waitForTimeout(300);
  await page.click('[data-act="addCourse"]'); await page.waitForTimeout(250);
  const opts = await page.$$eval('dialog[open] select[name="status"] option', (os) => os.map((o) => o.value));
  check('the course form offers Not started, In progress and Completed', JSON.stringify(opts) === JSON.stringify(['Not started', 'In progress', 'Completed']), opts.join('|'));
  check('the course form asks for the day you started', (await page.locator('dialog[open] input[name="startedOn"]').count()) === 1);
  await page.fill('dialog[open] input[name="name"]', 'Intro to Python');
  await page.fill('dialog[open] input[name="platform"]', 'Coursera');
  await page.fill('dialog[open] input[name="lessonsTotal"]', '10');
  await page.selectOption('dialog[open] select[name="status"]', 'In progress');
  await page.fill('dialog[open] input[name="startedOn"]', '2026-11-10');
  await confirmYes(page);
  st = await readState(page);
  const course = (st.courses || [])[0] || {};
  check('the course saves its status and start day', course.status === 'In progress' && course.startedOn === '2026-11-10', JSON.stringify(course));
  const row = await page.textContent('body');
  check('the course row shows its status and start day', row.includes('In progress') && row.includes('started'), '');

  // Home: quick journal checkbox
  await page.goto(BASE + '#home'); await page.waitForTimeout(400);
  check('the quick journal toolbar has a Checkbox button', (await page.locator('#quick-journal .rt-bar [data-cmd="checkbox"]').count()) === 1);
  await page.click('#quick-journal .rt'); await page.keyboard.type('Shopping list ');
  await page.click('#quick-journal [data-cmd="checkbox"]'); await page.waitForTimeout(150);
  check('a tick box is inserted into the entry', (await page.locator('#quick-journal .rt input[type="checkbox"]').count()) === 1);
  await page.click('#quick-journal .rt input[type="checkbox"]'); await page.waitForTimeout(150);
  check('the tick box can be ticked', await page.$eval('#quick-journal .rt input[type="checkbox"]', (b) => b.checked));
  await page.click('#quick-journal button[type="submit"]'); await page.waitForTimeout(350);
  st = await readState(page);
  const entry = (st.journal || [])[0] || {};
  check('saving keeps the tick box and its ticked state', (entry.html || '').includes('type="checkbox"') && (entry.html || '').includes('checked'), entry.html);

  await page.goto(BASE + '#journal'); await page.waitForTimeout(400);
  check('the journal page shows the ticked box as a mark', (await page.textContent('body')).includes('☑'));

  // Phone width
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  for (const h of ['#goal-glow', '#goal-cs', '#home']) {
    await mp.goto(BASE + h);
    await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed());
    await mp.reload(); await mp.waitForTimeout(350);
    const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${h} has no horizontal scroll at 390px`, ov <= 1, `overflow ${ov}px`);
  }

  check('no page errors', errors.length === 0, errors.join(' | '));
  let fails = 0;
  for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`); }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
