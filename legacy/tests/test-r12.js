const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const IMG = path.join(__dirname, 'test-photo.png');
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
  const load = async (s, hash) => {
    await page.goto(BASE + hash);
    await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), s);
    await page.reload(); await page.waitForTimeout(400);
  };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(S)));
  const DAY = '2026-11-10';

  await load(seed(), '#calendar');
  await page.evaluate((d) => { CAL.selected = d; CAL.month = d.slice(0, 7); CAL.year = Number(d.slice(0, 4)); render(); }, DAY);
  await page.waitForTimeout(300);

  // 1. The past day has a photo control, like the mood card
  const input = await page.locator(`.day-page input[type="file"][data-date="${DAY}"]`).count();
  check('the calendar day page has an add-photo control for that day', input === 1, input);
  check('a day with no photo says so', (await page.locator('.day-page', { hasText: 'No photo for this day yet' }).count()) === 1);

  // 2. Add a photo from the day page
  await page.setInputFiles(`.day-page input[type="file"][data-date="${DAY}"]`, IMG);
  await page.waitForTimeout(1500);
  const s1 = await st();
  check('adding a photo saves it to that day', Array.isArray(s1.moods[DAY] && s1.moods[DAY].photos) && s1.moods[DAY].photos.length === 1, JSON.stringify(s1.moods[DAY]));
  check('the photo shows on the day page', (await page.locator('.day-photos img[data-photo]').count()) === 1);
  const src = await page.$eval('.day-photos img[data-photo]', (n) => n.src);
  check('the photo loads from this device', src.startsWith('blob:'), src.slice(0, 40));

  // 3. The same photo appears on the History page for that day
  await page.goto(BASE + '#history'); await page.waitForTimeout(400);
  const hist = await page.$$eval('.scrap.hist .scrap-open[data-date="2026-11-10"] .scrap-photo img', (n) => n.length);
  check('History shows the day’s photo', hist === 1, hist);

  // 4. Remove it from the day page
  await page.goto(BASE + '#calendar'); await page.waitForTimeout(300);
  await page.evaluate((d) => { CAL.selected = d; CAL.month = d.slice(0, 7); CAL.year = Number(d.slice(0, 4)); render(); }, DAY);
  await page.waitForTimeout(300);
  await page.click('.day-photos [data-act="delPhoto"]');
  await page.waitForTimeout(250);
  await page.click('dialog button[type="submit"]');
  await page.waitForTimeout(400);
  const s2 = await st();
  check('removing the photo takes it off that day', (s2.moods[DAY].photos || []).length === 0, JSON.stringify(s2.moods[DAY]));
  check('the day page shows no photos after removing', (await page.locator('.day-photos img').count()) === 0);

  // 5. Phone width with a photo on the day page
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await mp.goto(BASE + '#calendar');
  await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed({ moods: { [DAY]: { mood: null, photos: ['ph-a', 'ph-b', 'ph-c'] } } }));
  await mp.reload(); await mp.waitForTimeout(400);
  await mp.evaluate((d) => { CAL.selected = d; CAL.month = d.slice(0, 7); CAL.year = Number(d.slice(0, 4)); render(); }, DAY);
  await mp.waitForTimeout(300);
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('the day page has no horizontal scroll at 390px with photos', ov <= 1, `overflow ${ov}px`);
  await mp.screenshot({ path: OUT + '/r12-day-photos-mobile.png', fullPage: true, scale: 'device' }).catch(() => {});
  await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed({ moods: { [DAY]: { mood: 'happy', photos: ['ph-a'] } } }));
  await page.reload(); await page.waitForTimeout(400);
  await page.evaluate((d) => { CAL.selected = d; CAL.month = d.slice(0, 7); CAL.year = Number(d.slice(0, 4)); render(); }, DAY);
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/r12-day-photos.png', fullPage: true, scale: 'device' }).catch(() => {});

  check('no page errors', errors.length === 0, errors.join(' | '));
  let fails = 0;
  for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`); }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
