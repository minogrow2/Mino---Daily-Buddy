const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const seed = (extra = {}) => Object.assign({
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme: 'light', savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
}, extra);
const alphaOf = (c) => { const m = String(c).match(/[,\/]\s*([\d.]+)\s*\)$/); return m ? parseFloat(m[1]) : NaN; };
(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 220) });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const data = seed({
    moods: {
      '2026-11-12': { mood: 'happy', photos: [] },
      '2026-11-13': { mood: 'sad', photos: [] },
      '2026-11-14': { mood: 'excited', photos: [] },
    },
    journal: [{ id: 'j1', date: '2026-11-10', type: 'daily', title: 'Garden walk', body: 'Went to the park', tags: [], favorite: false, created: 1700000000000 }],
  });
  await page.goto(BASE + '#history');
  await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), data);
  await page.reload(); await page.waitForTimeout(400);

  check('History has a search field', (await page.locator('input[name="q"]').count()) === 1);
  check('the History title sits outside any box', await page.$eval('h1', (h) => !h.closest('.card')));
  check('the logged days are not inside a big box', await page.$eval('.scrapbook', (s) => !s.closest('.card')));
  check('four logged days are shown at first', (await page.locator('.scrap.hist').count()) === 4);

  await page.fill('input[name="q"]', 'garden');
  await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  const g = await page.$$eval('.scrap.hist .scrap-open', (as) => as.map((a) => a.dataset.date));
  check('searching a journal title finds its day', g.length === 1 && g[0] === '2026-11-10', g.join('|'));

  await page.fill('input[name="q"]', 'SAD');
  await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  const s = await page.$$eval('.scrap.hist .scrap-open', (as) => as.map((a) => a.dataset.date));
  check('search ignores case and matches the mood name', s.length === 1 && s[0] === '2026-11-13', s.join('|'));

  await page.fill('input[name="q"]', 'zzzz-nothing');
  await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  check('a search with no match shows a message and no cards', (await page.locator('.scrap.hist').count()) === 0 && (await page.locator('.empty').count()) === 1);

  await page.click('[data-act="histClear"]'); await page.waitForTimeout(250);
  check('Reset brings back every logged day', (await page.locator('.scrap.hist').count()) === 4);

  const histPink = await page.$eval('.scrap.hist.tone-pink .scrap-open', (a) => getComputedStyle(a).backgroundColor);
  check('history pink is the journal pink (42% see-through)', Math.abs(alphaOf(histPink) - 0.42) < 0.03, histPink);
  check('history cards stay frosted', await page.$eval('.scrap.hist .scrap-open', (a) => getComputedStyle(a).backdropFilter !== 'none'));

  await page.screenshot({ path: __dirname + '/r16-history.png', fullPage: true });

  await page.goto(BASE + '#journal');
  await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), data);
  await page.reload(); await page.waitForTimeout(400);
  const jPink = await page.$eval('.scrap.tone-pink .scrap-open', (a) => getComputedStyle(a).backgroundColor);
  check('history pink matches the journal pink', histPink === jPink, `history ${histPink} | journal ${jPink}`);

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await mp.goto(BASE + '#history');
  await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), data);
  await mp.reload(); await mp.waitForTimeout(400);
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('History has no horizontal scroll at 390px', ov <= 1, `overflow ${ov}px`);

  check('no page errors', errors.length === 0, errors.join(' | '));
  let fails = 0;
  for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`); }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
