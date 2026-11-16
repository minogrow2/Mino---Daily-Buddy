const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const seed = (theme, extra = {}) => Object.assign({
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme, savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
}, extra);
function parse(c) {
  let m = c && c.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  m = c && c.match(/color\(srgb ([^)]+)\)/);
  if (m) { const parts = m[1].split('/'); const p = parts[0].trim().split(/\s+/).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: parts[1] ? Number(parts[1].trim()) : 1 }; }
  return null;
}
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 260) });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const load = async (s, hash) => {
    await page.goto(BASE + hash);
    await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), s);
    await page.reload(); await page.waitForTimeout(400);
  };
  // Every dropdown option on screen must be a solid fill with readable text.
  const optionReport = () => page.$$eval('select', (ss) => ss.flatMap((s) => [...s.options].map((o) => ({
    bg: getComputedStyle(o).backgroundColor, fg: getComputedStyle(o).color, text: o.textContent.trim(),
  }))));
  const judge = async (label) => {
    const opts = await optionReport();
    const bad = [];
    for (const o of opts) {
      const bg = parse(o.bg), fg = parse(o.fg);
      if (!bg || !fg || bg.a < 1) { bad.push(`${o.text}: fill ${o.bg}`); continue; }
      const c = contrast(fg, bg);
      if (c < 4.5) bad.push(`${o.text}: contrast ${c.toFixed(1)}`);
    }
    check(`${label}: every dropdown choice is a solid, readable fill (${opts.length} choices)`, opts.length > 0 && bad.length === 0, bad.slice(0, 3).join('; ') || 'no choices found');
  };

  for (const theme of ['dark', 'light']) {
    await load(seed(theme), '#journal');
    const dt = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check(`${theme}: theme applied`, dt === theme || (theme === 'light' && dt !== 'dark'), dt);
    await judge(`${theme} journal filter`);
    await page.goto(BASE + '#techlab'); await page.waitForTimeout(300);
    await page.click('[data-act="addProject"]'); await page.waitForTimeout(300);
    await judge(`${theme} new project form`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  }
  check('no page errors', errors.length === 0, errors.join(' | '));
  let fails = 0;
  for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`); }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
