const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const seed = (extra = {}) => Object.assign({
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme: 'light', savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
}, extra);
(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 220) });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#history');
  await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed({
    moods: {
      '2026-11-12': { mood: 'happy', photos: [] },
      '2026-11-13': { mood: 'sad', photos: [] },
      '2026-11-14': { mood: 'excited', photos: [] },
      '2026-11-15': { mood: 'peaceful', photos: ['ph-x'] },
    },
    journal: [{ id: 'j1', date: '2026-11-10', type: 'daily', title: 'Words only', body: 'Just a note, no mood', tags: [], favorite: false, created: 1700000000000 }],
  }));
  await page.reload(); await page.waitForTimeout(400);

  const cards = await page.$$eval('.scrap.hist', (as) => as.map((a) => ({
    date: a.querySelector('.scrap-open').dataset.date,
    sticker: a.querySelectorAll('.scrap-sticker').length,
    photo: a.querySelectorAll('.scrap-photo').length,
    bg: getComputedStyle(a.querySelector('.scrap-open')).backgroundColor,
    blur: getComputedStyle(a.querySelector('.scrap-open')).backdropFilter,
  })));
  check('there are five logged days', cards.length === 5, cards.map((c) => c.date).join('|'));
  check('no empty box is drawn anywhere', (await page.locator('.hist-blank').count()) === 0);
  const day = (d) => cards.find((c) => c.date === d) || {};
  check('a mood with no photo shows the mood icon and no box', day('2026-11-12').sticker === 1 && day('2026-11-12').photo === 0, JSON.stringify(day('2026-11-12')));
  check('a photo shows as the picture', day('2026-11-15').photo === 1, JSON.stringify(day('2026-11-15')));
  check('a day with only a note shows neither a picture nor an icon', day('2026-11-10').sticker === 0 && day('2026-11-10').photo === 0, JSON.stringify(day('2026-11-10')));
  const tints = cards.slice(0, 3).map((c) => c.bg);
  check('the first three cards carry three different tints', new Set(tints).size === 3, tints.join(' | '));
  check('the tinted cards stay frosted', cards.every((c) => c.blur && c.blur !== 'none'), cards[0] && cards[0].blur);
  await page.screenshot({ path: __dirname + '/r15-history.png', fullPage: true, scale: 'device' }).catch(() => {});

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await mp.goto(BASE + '#history');
  await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed({ moods: { '2026-11-12': { mood: 'happy', photos: [] } } }));
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
