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
  const info = (p) => p ? `bg ${p.bg ? `${Math.round(p.bg.r)},${Math.round(p.bg.g)},${Math.round(p.bg.b)} a${p.bg.a.toFixed(2)}` : 'n/a'} / border ${p.bd ? `${Math.round(p.bd.r)},${Math.round(p.bd.g)},${Math.round(p.bd.b)} a${p.bd.a.toFixed(2)}` : 'n/a'}` : 'missing';
  const read = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const cs = getComputedStyle(el); return { bg: cs.backgroundColor, bd: cs.borderTopColor }; }, sel).then((r) => r && { bg: parse(r.bg), bd: parse(r.bd) });
  const sage = (c) => c && c.g > c.r && c.g >= c.b;
  const see = (c) => c && c.a < 0.85;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#home');
  await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await page.reload(); await page.waitForSelector('#home-clock'); await page.waitForTimeout(300);
  await page.click('[data-act="toggleHabit"][data-id="vitc"]'); await page.waitForTimeout(150);

  const mood = await read(page, '#mood-card .mood-btn[aria-pressed="true"]');
  check('selected mood button: sage outline kept', mood && sage(mood.bd), info(mood));
  const tick = await read(page, '#checklist .check[aria-checked="true"]');
  check('checked tick: sage outline kept', tick && sage(tick.bd), info(tick));
  const rt = await read(page, '#mood-card .rt-wrap');
  check('text box: see-through, sage border', rt && see(rt.bg) && sage(rt.bd), info(rt));
  const input = await read(page, 'form[data-submit="addTask"] .input');
  check('input: see-through, sage border', input && see(input.bg) && sage(input.bd), info(input));
  await page.screenshot({ path: path.join(OUT, 'round5-home.png') });

  // Dark theme keeps the sage
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(150);
  const dmood = await read(page, '#mood-card .mood-btn[aria-pressed="true"]');
  check('dark theme: selected mood outline stays sage', dmood && sage(dmood.bd), info(dmood));
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

  // Scene tile on Settings
  await page.goto(BASE + '#preferences'); await page.waitForSelector('.scene-tile.on'); await page.waitForTimeout(200);
  const tile = await read(page, '.scene-tile.on');
  check('selected scene tile: see-through sage', tile && sage(tile.bg) && see(tile.bg) && sage(tile.bd), info(tile));
  await page.locator('.scene-grid').first().screenshot({ path: path.join(OUT, 'round5-scene-tiles.png') }).catch(() => {});

  check('no page errors', errors.length === 0, errors.join(' | '));
  const passed = results.filter((c) => c.ok).length;
  for (const c of results) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  <- ' + c.extra}`);
  console.log(`checks passed: ${passed}/${results.length}`);
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
