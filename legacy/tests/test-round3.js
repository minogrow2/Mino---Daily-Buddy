const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const seed = { v: 2, updated: 1700000000000, moods: { [today]: { mood: 'thinking', note: '', html: '<p>Calm morning</p>' } }, settings: { theme: 'system', savingsTarget: 1000, demo: false, name: 'QA' } };
(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 200) });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#home');
  await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await page.reload();
  await page.waitForSelector('#home-clock');
  await page.waitForTimeout(300);

  // 1. Scroll hint gone
  check('"Scroll for your day" is removed', (await page.$('.hero-hint')) === null && !(await page.evaluate(() => document.body.innerText)).includes('Scroll for your day'));

  // 2. Time chip: smaller, transparent glass, Fredoka, softer pink
  const chip = await page.evaluate(() => {
    const c = document.querySelector('.hero-chip'); const t = document.querySelector('.hero-time'); const k = document.querySelector('.home-hero .kicker');
    return { width: Math.round(c.getBoundingClientRect().width), bg: getComputedStyle(c).backgroundColor, font: getComputedStyle(t).fontFamily, timeColor: getComputedStyle(t).color, kickerColor: getComputedStyle(k).color, roseTime: getComputedStyle(t).fontSize };
  });
  check('chip is smaller than before (about 300px wide)', chip.width <= 310, chip.width + 'px');
  check('chip uses the same transparent glass as the cards', chip.bg.includes('0.46'), chip.bg);
  check('time uses Fredoka', /Fredoka/.test(chip.font), chip.font);
  check('pink time is lighter than the deep rose and not fully opaque', chip.timeColor !== 'rgb(169, 83, 95)' && !/rgb\(\d+, \d+, \d+\)$/.test(chip.timeColor) || chip.timeColor.includes('0.') || chip.timeColor.includes('/'), chip.timeColor);

  // 3. Goal circles: smaller, cute, with dividers
  const goals = await page.evaluate(() => {
    const c = document.querySelector('#goal-week .wk-circle');
    return { w: Math.round(c.getBoundingClientRect().width), dividers: document.querySelectorAll('#goal-week .wk-goal + .wk-goal').length, divStyle: getComputedStyle(document.querySelector('#goal-week .wk-goal + .wk-goal')).borderTopStyle, hearts: document.querySelectorAll('#goal-week .wk-day.on').length };
  });
  check('goal circles are smaller (26px)', goals.w <= 28, goals.w + 'px');
  check('a divider sits between each goal (six dividers)', goals.dividers === 6 && goals.divStyle === 'dashed', `${goals.dividers} ${goals.divStyle}`);
  await page.click(`#goal-week [data-goal="ai"][data-date="${today}"]`);
  await page.waitForTimeout(100);
  const heart = await page.textContent(`#goal-week [data-goal="ai"][data-date="${today}"] .wk-circle`);
  check('a logged day shows the heart', heart.trim() === '♥', heart);

  // 4. Mood page: buttons stay inside their card, cards do not overlap
  await page.goto(BASE + '#mood');
  await page.waitForSelector('.mood-btn');
  await page.waitForTimeout(200);
  const mood = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#view .mood-btn')];
    const outside = btns.filter((b) => { const card = b.closest('section.card'); return b.getBoundingClientRect().right > card.getBoundingClientRect().right + 1; }).length;
    const cards = [...document.querySelectorAll('#view .grid.two > section.card')];
    const overlap = cards.length >= 2 && cards[0].getBoundingClientRect().right > cards[1].getBoundingClientRect().left + 1;
    return { buttons: btns.length, outside, overlap, docWide: document.documentElement.scrollWidth - innerWidth, cols: getComputedStyle(document.querySelector('#view .moods')).gridTemplateColumns };
  });
  check('mood choices stay inside the mood card (no overflow)', mood.outside === 0 && mood.buttons === 9, JSON.stringify(mood));
  check('mood card and the 30-day card do not overlap', !mood.overlap, JSON.stringify(mood));
  check('no horizontal scroll on the mood page (desktop)', mood.docWide <= 0, mood.docWide);
  await page.locator('#view .grid.two').first().screenshot({ path: path.join(OUT, 'round3-mood-desktop.png') });
  await page.goto(BASE + '#home');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'round3-desktop-top.png') });
  await page.locator('#goal-week').screenshot({ path: path.join(OUT, 'round3-goals.png') });

  // Phone
  const pc = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pp = await pc.newPage();
  pp.on('pageerror', (e) => errors.push('phone: ' + e.message));
  await pp.goto(BASE + '#home');
  await pp.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await pp.reload(); await pp.waitForSelector('#home-clock'); await pp.waitForTimeout(300);
  check('phone: Home does not scroll sideways', (await pp.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await pp.screenshot({ path: path.join(OUT, 'round3-phone-top.png') });
  await pp.goto(BASE + '#mood'); await pp.waitForSelector('.mood-btn'); await pp.waitForTimeout(200);
  const pm = await pp.evaluate(() => ({ outside: [...document.querySelectorAll('#view .mood-btn')].filter((b) => { const c = b.closest('section.card'); return b.getBoundingClientRect().right > c.getBoundingClientRect().right + 1; }).length, wide: document.documentElement.scrollWidth - innerWidth }));
  check('phone: mood choices stay inside the card and nothing scrolls sideways', pm.outside === 0 && pm.wide <= 0, JSON.stringify(pm));
  await pp.locator('#view .moods').screenshot({ path: path.join(OUT, 'round3-mood-phone.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));

  const passed = results.filter((c) => c.ok).length;
  for (const c of results) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  <- ' + c.extra}`);
  console.log(`checks passed: ${passed}/${results.length}`);
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
