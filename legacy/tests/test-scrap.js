const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const addD = (ymd, n) => new Date(Date.parse(ymd + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const kinds = ['happy', 'sad', 'excited', 'loved', 'tired', 'neutral', 'peaceful', 'stressed', 'thinking'];
const moods = {};
for (let i = 1; i <= 24; i++) moods[addD(today, -i)] = { mood: kinds[i % kinds.length], note: i % 3 === 0 ? 'Quiet day ' + i : '' };
const D1 = addD(today, -1), D2 = addD(today, -2), D5 = addD(today, -5), D6 = addD(today, -6);
moods[D1] = { mood: 'happy', html: '<p>Walked by the river &amp; read a bit</p>', note: '', photos: ['ph1'] };
moods[D2] = { mood: 'sad', note: 'Long day' };
moods[D5] = { mood: 'excited', html: '<p>Finished the <i>first</i> course</p>', pinned: true, photos: ['ph2'] };
moods[D6] = { mood: 'loved', note: '', pinned: true };
const seed = { v: 2, updated: 1700000000000, activities: [], moods, settings: { theme: 'system', savingsTarget: 1000, demo: false, name: 'QA' } };
const pinnedCount = Object.values(moods).filter((m) => m.pinned).length;
const unpinnedCount = Object.values(moods).filter((m) => !m.pinned).length;
const expectedShown = pinnedCount + Math.min(unpinnedCount, 18);

(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 200) });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#mood');
  // Two small photos in the device's own store, as the app would keep them.
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 200;
    const g = c.getContext('2d'); g.fillStyle = '#E88DA0'; g.fillRect(0, 0, 300, 200); g.fillStyle = '#FFFDF9'; g.fillRect(40, 40, 220, 120);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
    await mediaPut('ph1', blob); await mediaPut('ph2', blob);
  });
  await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await page.reload(); await page.waitForSelector('.scrapbook'); await page.waitForTimeout(400);

  const count = () => page.locator('.scrap').count();
  check('scrapbook shows pinned plus the latest 18 unpinned days', (await count()) === expectedShown, `${await count()} vs ${expectedShown}`);
  check('every card has an Open label', (await page.locator('.scrap-link').count()) === (await count()));
  check('pinned pages come first', (await page.locator('.scrap').first().getAttribute('class')).includes('is-pinned'));
  check('pinned heading shown', (await page.locator('.scrap-sub', { hasText: 'Pinned' }).count()) === 1);
  check('show-older button offers the rest', (await page.locator('[data-act="scrapMore"]').count()) === 1);
  // Photos come from the device store (blob URLs), in the scrapbook card.
  let src = '';
  for (let i = 0; i < 30 && !src.startsWith('blob:'); i++) { await page.waitForTimeout(150); src = (await page.getAttribute('.scrap-photo img[data-photo="ph2"]', 'src')) || ''; }
  check('photo shows in the scrapbook', src.startsWith('blob:'), src.slice(0, 20));

  // Open a day with a note, pin it from the dialog.
  await page.click(`.scrap-open[data-date="${D2}"]`);
  await page.waitForSelector('#scrap-dlg[open]');
  check('Open shows the day in a dialog', (await page.textContent('#scrap-dlg')).includes('Long day'));
  await page.click('#scrap-dlg [data-act="pinMood"]');
  await page.waitForTimeout(150);
  const pinnedNow = await page.evaluate((d) => !!S.pins[d], D2);
  check('pin from the dialog saves to the day', pinnedNow);
  check('dialog stays open after pinning and reads Unpin', (await page.locator('#scrap-dlg').evaluate((d) => d.open)) && (await page.textContent('#scrap-dlg')).includes('Unpin from scrapbook'));
  check('pinned day moves to the top', (await page.locator('.scrap').first().locator('.scrap-open').getAttribute('data-date')) === D2);
  await page.click('#scrap-dlg [data-act="closeScrap"]');
  check('Close shuts the dialog', !(await page.locator('#scrap-dlg').evaluate((d) => d.open)));

  // Open a photo day: the photo appears full size in the dialog.
  await page.click(`.scrap-open[data-date="${D1}"]`);
  await page.waitForSelector('#scrap-dlg[open]');
  let dsrc = '';
  for (let i = 0; i < 30 && !dsrc.startsWith('blob:'); i++) { await page.waitForTimeout(150); dsrc = (await page.getAttribute('#scrap-dlg img[data-photo="ph1"]', 'src')) || ''; }
  check('dialog shows the day photo', dsrc.startsWith('blob:'), dsrc.slice(0, 20));
  check('dialog shows the rich text, with formatting kept', (await page.textContent('#scrap-dlg')).includes('Walked by the river & read a bit'));
  await page.locator('#scrap-dlg').screenshot({ path: path.join(OUT, 'scrap-dialog.png') });
  await page.click('#scrap-dlg [data-act="editScrapDay"]');
  await page.waitForTimeout(200);
  check('Edit this day closes the dialog and selects the day in the mood editor', !(await page.locator('#scrap-dlg').evaluate((d) => d.open)) && (await page.inputValue('input[type="date"]')) === D1);

  // Pin a card directly, then show older days.
  const before = await count();
  await page.click(`.scrap-pin[data-date="${addD(today, -3)}"]`);
  await page.waitForTimeout(150);
  check('pin button on a card pins that day', (await page.evaluate((d) => !!S.pins[d], addD(today, -3))));
  await page.click('[data-act="scrapMore"]');
  await page.waitForTimeout(150);
  const after = await count();
  check('Show older days reveals every logged day', after === pinnedCount + 1 + unpinnedCount - 1 - 0 + 0 || after === Object.keys(moods).length, `${before} -> ${after}`);
  check('Show fewer is offered once everything is shown', (await page.textContent('[data-act="scrapMore"]')).includes('Show fewer'));

  await page.locator('.scrapbook').first().screenshot({ path: path.join(OUT, 'scrap-desktop.png') });
  // Phone: two columns, no sideways scroll.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pp = await phone.newPage();
  pp.on('pageerror', (e) => errors.push('phone: ' + e.message));
  await pp.goto(BASE + '#mood');
  await pp.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await pp.reload(); await pp.waitForSelector('.scrapbook'); await pp.waitForTimeout(300);
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('phone: no sideways scroll on the mood page', overflow <= 1, overflow);
  const cols = await pp.evaluate(() => getComputedStyle(document.querySelector('.scrapbook')).gridTemplateColumns.split(' ').length);
  check('phone: scrapbook keeps two columns', cols >= 2, cols);
  await pp.locator('.scrapbook').first().screenshot({ path: path.join(OUT, 'scrap-phone.png') });

  check('no page errors', errors.length === 0, errors.join(' | '));
  const passed = results.filter((c) => c.ok).length;
  for (const c of results) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  <- ' + c.extra}`);
  console.log(`checks passed: ${passed}/${results.length}`);
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
