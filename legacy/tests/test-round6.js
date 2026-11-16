const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const seed = { v: 2, updated: 1700000000000, moods: { [today]: { mood: 'thinking', note: '', html: '<p>Calm</p>' } }, settings: { theme: 'system', savingsTarget: 1000, demo: false, name: 'QA' } };
function parse(c) {
  let m = c.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  m = c.match(/color\(srgb ([^)]+)\)/);
  if (m) { const parts = m[1].split('/'); const p = parts[0].trim().split(/\s+/).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: parts[1] ? Number(parts[1].trim()) : 1 }; }
  return null;
}
(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 220) });
  const bgOf = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).backgroundColor : null; }, sel).then((c) => (c ? parse(c) : null));
  const bdOf = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).borderTopColor : null; }, sel).then((c) => (c ? parse(c) : null));
  const pinkSeeThrough = (c, maxA) => c && c.g > c.r && c.g >= c.b && c.a < maxA;
  const sageOutline = (c) => c && c.g > c.r && c.g >= c.b;
  const fmt = (c) => (c ? `${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)} a${c.a.toFixed(2)}` : 'missing');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#home');
  await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await page.reload(); await page.waitForSelector('#home-clock'); await page.waitForTimeout(300);
  await page.click('[data-act="toggleHabit"][data-id="vitc"]'); await page.waitForTimeout(150);

  const sel = await bgOf(page, '#mood-card .mood-btn[aria-pressed="true"]');
  check('selected mood box: see-through sage green', pinkSeeThrough(sel, 0.8), fmt(sel));
  const unsel = await bgOf(page, '#mood-card .mood-btn:not([aria-pressed="true"])');
  check('other mood boxes: see-through sage green', pinkSeeThrough(unsel, 0.6), fmt(unsel));
  const tick = await bgOf(page, '#checklist .check[aria-checked="true"]');
  check('checked tick box: see-through sage green', pinkSeeThrough(tick, 0.9), fmt(tick));
  const untick = await bgOf(page, '#checklist .check[aria-checked="false"]');
  check('empty tick box: see-through sage green', pinkSeeThrough(untick, 0.6), fmt(untick));
  const input = await bgOf(page, 'form[data-submit="addTask"] .input');
  check('input boxes: see-through sage green', pinkSeeThrough(input, 0.6), fmt(input));
  const rt = await bgOf(page, '#mood-card .rt-wrap');
  check('text box: see-through sage green', pinkSeeThrough(rt, 0.6), fmt(rt));
  const rtBorder = await bdOf(page, '#mood-card .rt-wrap');
  check('text box outline is still sage', sageOutline(rtBorder), fmt(rtBorder));
  const mcell = await bgOf(page, '#month-preview .mcell:not(.blank):not(.today)');
  check('month preview calendar boxes: see-through sage green', pinkSeeThrough(mcell, 0.6), fmt(mcell));
  const heat = await bgOf(page, '#heatmap .cell.l0');
  check('heatmap empty day: see-through pink', heat && heat.r > heat.g && heat.a < 0.5, fmt(heat));
  await page.locator('#month-preview').screenshot({ path: path.join(OUT, 'round6-month.png') });
  await page.locator('#heatmap').screenshot({ path: path.join(OUT, 'round6-heatmap.png') });
  await page.locator('#mood-card').screenshot({ path: path.join(OUT, 'round6-mood.png') });

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(150);
  const dark = await bgOf(page, '#mood-card .mood-btn:not([aria-pressed="true"])');
  check('dark theme: mood boxes stay see-through sage green', dark && dark.g > dark.r && dark.a < 0.6, fmt(dark));
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

  await page.goto(BASE + '#mood'); await page.waitForSelector('.month-grid .day'); await page.waitForTimeout(200);
  const mcal = await bgOf(page, '.month-grid .day:not(.blank)');
  check('mood calendar boxes: see-through sage green', pinkSeeThrough(mcal, 0.6), fmt(mcal));
  check('no page errors', errors.length === 0, errors.join(' | '));
  const passed = results.filter((c) => c.ok).length;
  for (const c of results) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  <- ' + c.extra}`);
  console.log(`checks passed: ${passed}/${results.length}`);
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
