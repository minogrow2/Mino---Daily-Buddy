const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const seedWith = (colors, theme = 'light') => ({ v: 2, updated: 1700000000000, activities: [], moods: {}, settings: { theme, savingsTarget: 1000, demo: false, name: 'QA', colors } });
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const load = async (seed, hash = '#preferences') => {
    await page.goto(BASE + hash);
    await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
    await page.reload(); await page.waitForTimeout(350);
  };
  const style = (sel, prop) => page.evaluate(([s, p]) => { const el = document.querySelector(s); return el ? getComputedStyle(el)[p] : null; }, [sel, prop]).then((c) => (c ? parse(c) : null));
  const inline = (name) => page.evaluate((n) => document.documentElement.style.getPropertyValue(n).trim(), name);

  // Defaults: nothing set, so the built-in look is unchanged.
  await load(seedWith({}));
  check('default: no colour set on the page', (await inline('--rose')) === '' && (await inline('--card-fill')) === '');
  const defPrimary = await style('.btn.primary', 'backgroundColor');
  check('default: primary button keeps the rose', defPrimary && defPrimary.r === 169 && defPrimary.g === 83 && defPrimary.b === 95, JSON.stringify(defPrimary));
  const defCard = await style('.card', 'backgroundColor');
  check('default: cards keep the frosted glass', defCard && defCard.a <= 0.5, JSON.stringify(defCard));
  check('settings page shows three colour groups', (await page.locator('.colour-row').count()) === 3);

  // Chosen colours reach the boxes.
  await load(seedWith({ big: '#2c2320', small: '#e9d98c', main: '#3f7f7a' }));
  check('main colour sets the rose token', (await inline('--rose')) === '#3f7f7a');
  const prim = await style('.btn.primary', 'backgroundColor');
  check('primary button takes the main colour', prim && prim.r === 63 && prim.g === 127 && prim.b === 122, JSON.stringify(prim));
  const primInk = await style('.btn.primary', 'color');
  check('button text is light on a dark main colour', primInk && primInk.r > 230 && primInk.g > 230, JSON.stringify(primInk));
  const card = await style('.card', 'backgroundColor');
  check('big boxes take the big colour, kept see-through', card && card.r < 80 && card.g < 80 && card.a > 0.5 && card.a < 0.7, JSON.stringify(card));
  const cardInk = await style('.card', 'color');
  check('card text turns light on a dark big colour', cardInk && cardInk.r > 230, JSON.stringify(cardInk));
  await page.locator('.colour-row').first().scrollIntoViewIfNeeded();
  await page.locator('#view').screenshot({ path: path.join(OUT, 'colours-settings.png') });

  // Live preview while dragging does not save; letting go saves.
  await page.$eval('input[type="color"][data-group="main"]', (el) => { el.value = '#7d4a8c'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(100);
  check('dragging previews the new main colour', (await inline('--rose')) === '#7d4a8c');
  const savedBefore = await page.evaluate(() => S.settings.colors.main);
  check('the preview is not saved yet', savedBefore === '#3f7f7a', savedBefore);
  await page.$eval('input[type="color"][data-group="main"]', (el) => { el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(200);
  const savedAfter = await page.evaluate(() => S.settings.colors.main);
  check('letting go saves the colour', savedAfter === '#7d4a8c', savedAfter);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mino.state.v2')).settings.colors.main);
  check('the colour is kept on this device', stored === '#7d4a8c', stored);

  // Swatches.
  await page.click('.colour-swatch[data-group="small"][data-value="#a9c6e0"]');
  await page.waitForTimeout(150);
  check('a preset swatch sets the small boxes', (await inline('--sage')) === '#a9c6e0' && (await page.evaluate(() => S.settings.colors.small)) === '#a9c6e0');
  check('the chosen swatch is marked', (await page.locator('.colour-swatch[data-group="small"][data-value="#a9c6e0"]').getAttribute('aria-pressed')) === 'true');

  // Reset one group, then all.
  await page.click('.colour-row >> nth=2 >> [data-act="resetColour"]');
  await page.waitForTimeout(150);
  check('reset clears the main colour', (await inline('--rose')) === '' && !(await page.evaluate(() => S.settings.colors.main)));
  await page.click('[data-act="resetColours"]');
  await page.waitForTimeout(150);
  const allCleared = (await page.evaluate(() => Object.keys(S.settings.colors || {}).length)) === 0;
  const restored = await style('.btn.primary', 'backgroundColor');
  check('reset all returns to the built-in look', allCleared && (await inline('--card-fill')) === '' && restored && restored.r === 169, JSON.stringify(restored));

  await load(seedWith({ big: '#2c2320', small: '#e9d98c', main: '#3f7f7a' }), '#mood');
  const mb = await style('.mood-btn', 'backgroundColor');
  check('small boxes take the small colour, kept see-through', mb && Math.abs(mb.r - 233) < 1 && Math.abs(mb.g - 217) < 1 && Math.abs(mb.b - 140) < 1 && mb.a > 0.3 && mb.a < 0.5, JSON.stringify(mb));
  // Dark theme with custom colours: the main colour still applies, nothing errors.
  await load(seedWith({ big: '#f6f7ee', small: '#a6c29f', main: '#3e5c8a' }, 'dark'));
  const dk = await style('.btn.primary', 'backgroundColor');
  check('dark theme: main colour applies', dk && dk.r === 62 && dk.g === 92 && dk.b === 138, JSON.stringify(dk));
  const dkCard = await style('.card', 'color');
  check('dark theme: light big colour gives dark card text', dkCard && dkCard.r < 100, JSON.stringify(dkCard));
  await page.locator('#view').screenshot({ path: path.join(OUT, 'colours-dark.png') });

  // Home with custom colours, on a phone, with no sideways scroll.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pp = await phone.newPage();
  pp.on('pageerror', (e) => errors.push('phone: ' + e.message));
  await pp.goto(BASE + '#home');
  await pp.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seedWith({ big: '#e6f0fa', small: '#c9b8e6', main: '#d9735b' }));
  await pp.reload(); await pp.waitForTimeout(350);
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('phone: no sideways scroll with custom colours', overflow <= 1, overflow);
  await pp.screenshot({ path: path.join(OUT, 'colours-phone-home.png') });

  check('no page errors', errors.length === 0, errors.join(' | '));
  const passed = results.filter((c) => c.ok).length;
  for (const c of results) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  <- ' + c.extra}`);
  console.log(`checks passed: ${passed}/${results.length}`);
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
