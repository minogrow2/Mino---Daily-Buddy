const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const yest = new Date(Date.parse(today + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
const acts = (d, n) => Array.from({ length: n }, (_, i) => ({ id: d + i, date: d, category: 'reading', goalId: null, title: 'Read', minutes: 10, offline: false, note: '' }));
const seed = { v: 2, updated: 1700000000000, activities: [...acts(today, 8), ...acts(yest, 3)], settings: { theme: 'system', savingsTarget: 1000, demo: false, name: 'QA' } };
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
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 200) });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#home');
  await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await page.reload(); await page.waitForSelector('#heatmap'); await page.waitForTimeout(300);
  const bg = (sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).backgroundColor : null; }, sel).then((c) => (c ? parse(c) : null));
  const l4 = await bg('#heatmap .cell.l4'), l2 = await bg('#heatmap .cell.l2'), l0 = await bg('#heatmap .cell.l0');
  const pinkish = (c) => c && c.r > c.g && c.r >= c.b;
  check('top activity level (l4) is a deep pink', pinkish(l4) && l4.a > 0.8, JSON.stringify(l4));
  check('mid activity level (l2) is a pink', pinkish(l2), JSON.stringify(l2));
  check('empty day stays very light and see-through', pinkish(l0) && l0.a <= 0.5, JSON.stringify(l0));
  const contrast = l4 && l0 ? Math.abs((0.299 * l4.r + 0.587 * l4.g + 0.114 * l4.b) - (0.299 * l0.r + 0.587 * l0.g + 0.114 * l0.b)) : 0;
  check('the gradient has clear contrast between the lightest and darkest levels', contrast > 60, Math.round(contrast));
  const legend = await page.$$eval('#heatmap .legend i', (els) => els.length);
  check('legend shows all five levels', legend === 5, legend);
  await page.locator('#heatmap').screenshot({ path: path.join(OUT, 'heat-pink.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));
  const passed = results.filter((c) => c.ok).length;
  for (const c of results) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  <- ' + c.extra}`);
  console.log(`checks passed: ${passed}/${results.length}`);
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
