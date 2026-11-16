const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
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
  const load = async (s, hash = '#home') => {
    await page.goto(BASE + hash);
    await page.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), s);
    await page.reload(); await page.waitForTimeout(400);
  };
  const goHash = async (h) => { await page.goto(BASE + h); await page.waitForTimeout(350); };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(S)));

  await load(seed(), '#home');
  const hid = await page.evaluate(() => coreHabits()[0].id);

  // ---------- 1. Mood order and the dashed selection ----------
  await load(seed({ moods: { '2026-11-15': { mood: 'unproductive', photos: [] } } }), '#mood');
  const labels = await page.$$eval('.moods .mood-btn', (bs) => bs.map((b) => b.textContent.trim()));
  const at = (w) => labels.findIndex((l) => l.includes(w));
  check('Unproductive sits between Stressed and Tired', at('Stressed') >= 0 && at('Stressed') < at('Unproductive') && at('Unproductive') < at('Tired'), labels.join('|'));
  const sel = await page.evaluate(() => {
    const b = document.querySelector('.moods .mood-btn[aria-pressed="true"]');
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { style: cs.borderTopStyle, after: getComputedStyle(b, '::after').content, label: b.textContent.trim() };
  });
  check('the selected mood has a dashed outline', sel && sel.style === 'dashed', JSON.stringify(sel));
  check('the selected mood has no check badge', sel && !String(sel.after).includes('✓'), sel && sel.after);
  check('the selected mood is Unproductive', sel && sel.label.includes('Unproductive'), sel && sel.label);
  await page.screenshot({ path: OUT + '/r11-mood.png', scale: 'device' }).catch(() => {});

  // ---------- 2. Calendar page is frosted, not yellow ----------
  await load(seed({ activities: [{ id: 'act1', date: '2026-11-10', category: 'outdoors', title: 'Evening walk', minutes: 30, offline: true, note: '', demo: false, checklist: false, goalId: null, meKey: '' }] }), '#calendar');
  await page.evaluate(() => { CAL.selected = '2026-11-10'; CAL.month = '2026-11'; CAL.year = 2026; render(); });
  await page.waitForTimeout(300);
  const cal = await page.evaluate(() => {
    const p = document.querySelector('.day-page');
    const card = p && p.closest('.card');
    const note = document.querySelector('.day-note');
    return {
      butter: card ? card.classList.contains('butter') : null,
      cardBlur: card ? getComputedStyle(card).backdropFilter : null,
      noteBlur: note ? getComputedStyle(note).backdropFilter : null,
    };
  });
  check('calendar day card is not yellow', cal.butter === false, JSON.stringify(cal));
  check('calendar day card is frosted', cal.cardBlur && cal.cardBlur !== 'none', cal.cardBlur);
  check('calendar day notes are frosted', cal.noteBlur && cal.noteBlur !== 'none', cal.noteBlur);
  await page.screenshot({ path: OUT + '/r11-calendar.png', fullPage: true, scale: 'device' }).catch(() => {});

  // ---------- 3. History sits between Calendar and Analytics ----------
  const nav = await page.$$eval('.side-link', (ls) => ls.map((a) => a.textContent.trim()));
  const ni = (w) => nav.findIndex((l) => l.includes(w));
  check('History sits between Calendar and Analytics', ni('Calendar') >= 0 && ni('History') === ni('Calendar') + 1 && ni('Analytics') === ni('History') + 1, nav.join('|'));

  // ---------- 4. History pages: one per logged day ----------
  await load(seed({
    habitChecks: { '2026-11-10': { [hid]: true } },
    journal: [{ id: 'j1', date: '2026-11-10', type: 'daily', title: 'Good day', body: 'Went for a long walk', tags: [], favorite: false, created: 1700000000000 }],
    activities: [{ id: 'act1', date: '2026-11-10', category: 'outdoors', title: 'Evening walk', minutes: 30, offline: true, note: '', demo: false, checklist: false, goalId: null, meKey: '' }],
    moods: { '2026-11-10': { mood: 'happy', note: 'Calm and clear', photos: [] }, '2026-11-12': { mood: 'sad', note: 'Rough one', photos: [] } },
    screen: { '2026-11-13': { total: 120, social: 40 } },
  }), '#history');
  const cards = await page.$$eval('.scrap.hist', (as) => as.map((a) => a.querySelector('.scrap-open').dataset.date));
  check('one history page per logged day', cards.length === 3, cards.join('|'));
  check('days run newest first', cards[0] === '2026-11-13' && cards[2] === '2026-11-10', cards.join('|'));
  const swatch = await page.$eval('.scrap.hist .scrap-open[data-date="2026-11-10"] .hist-swatch', (n) => n.className);
  check('the card carries that day’s heatmap colour', swatch.includes('hist-swatch l2'), swatch);
  const snip = await page.$eval('.scrap.hist .scrap-open[data-date="2026-11-10"] .scrap-note', (n) => n.textContent);
  check('the card shows what was written', snip.includes('Went for a long walk'), snip);
  const frost = await page.$eval('.scrap.hist .scrap-open', (n) => getComputedStyle(n).backdropFilter);
  check('history pages are frosted', frost !== 'none', frost);
  check('days without a photo show no empty box', (await page.locator('.scrap.hist .hist-blank').count()) === 0);
  await page.screenshot({ path: OUT + '/r11-history.png', fullPage: true, scale: 'device' }).catch(() => {});

  // ---------- 5. Pins: shared with the mood scrapbook ----------
  await page.click('.scrap.hist .scrap-pin[data-date="2026-11-12"]');
  await page.waitForTimeout(300);
  const s1 = await st();
  check('pinning a history page saves the pin', s1.pins['2026-11-12'] === true);
  const first = await page.$eval('.scrap.hist .scrap-open', (n) => n.dataset.date);
  check('a pinned history page moves to the top', first === '2026-11-12', first);
  check('the Pinned heading shows on History', (await page.locator('.scrap-sub', { hasText: 'Pinned' }).count()) === 1);
  await goHash('#mood');
  const moodPinned = await page.evaluate(() => { const a = document.querySelector('.scrap-open[data-date="2026-11-12"]'); return a ? a.closest('.scrap').classList.contains('is-pinned') : null; });
  check('the same pin shows on the mood scrapbook', moodPinned === true, moodPinned);

  // ---------- 6. Open: what got done, concisely ----------
  await goHash('#history');
  await page.click('.scrap.hist .scrap-open[data-date="2026-11-10"]');
  await page.waitForTimeout(300);
  const dlg = await page.evaluate(() => { const d = document.querySelector('#hist-dlg'); return d ? { open: d.open, text: d.innerText } : null; });
  check('Open lists the day’s activity and journal', dlg && dlg.open && dlg.text.includes('Evening walk') && dlg.text.includes('Good day'), dlg && dlg.text.slice(0, 200));
  check('Open lists habits done and what was written', dlg && dlg.text.includes('Habits') && dlg.text.includes('Calm and clear'), dlg && dlg.text.slice(0, 200));
  await page.click('#hist-dlg [data-act="closeHist"]');
  await page.waitForTimeout(200);
  const closed = await page.evaluate(() => { const d = document.querySelector('#hist-dlg'); return !(d && d.open); });
  check('Close shuts the review', closed);
  await page.click('.scrap.hist .scrap-open[data-date="2026-11-10"]');
  await page.waitForTimeout(250);
  await page.click('#hist-dlg [data-act="histCal"]');
  await page.waitForTimeout(400);
  check('Open in calendar goes to that day', (await page.evaluate(() => location.hash)) === '#calendar' && (await page.evaluate(() => CAL.selected)) === '2026-11-10');
  check('the calendar day page opens for that day', (await page.locator('.day-page').count()) === 1);

  // ---------- 7. Old pins move to the shared store ----------
  await load(seed({ moods: { '2026-11-09': { mood: 'happy', note: '', pinned: true, photos: [] } } }), '#history');
  const mig = await page.evaluate(() => ({ pin: S.pins['2026-11-09'] === true, leftover: S.moods['2026-11-09'].pinned }));
  check('old pins move to the shared pin store', mig.pin && mig.leftover === undefined, JSON.stringify(mig));

  // ---------- 8. Empty state ----------
  await load(seed(), '#history');
  check('History says so when nothing is logged', (await page.locator('.empty', { hasText: 'Nothing logged yet' }).count()) === 1);

  // ---------- 9. Phone width ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  const sample = seed({
    journal: [{ id: 'j1', date: '2026-11-10', type: 'daily', title: 'Good day', body: 'Went for a long walk and kept walking until the light changed colour', tags: ['life'], favorite: false, created: 1700000000000 }],
    activities: [{ id: 'act1', date: '2026-11-10', category: 'outdoors', title: 'A very long activity title that should wrap neatly on a phone', minutes: 30, offline: true, note: '', demo: false, checklist: false, goalId: null, meKey: '' }],
    moods: { '2026-11-10': { mood: 'happy', note: 'Calm', photos: [] } },
  });
  for (const h of ['#history', '#calendar']) {
    await mp.goto(BASE + h);
    await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), sample);
    await mp.reload(); await mp.waitForTimeout(400);
    if (h === '#calendar') { await mp.evaluate(() => { CAL.selected = '2026-11-10'; CAL.month = '2026-11'; CAL.year = 2026; render(); }); await mp.waitForTimeout(300); }
    const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no horizontal scroll at 390px on ${h}`, ov <= 1, `overflow ${ov}px`);
  }
  await mp.goto(BASE + '#history');
  await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), sample);
  await mp.reload(); await mp.waitForTimeout(400);
  await mp.screenshot({ path: OUT + '/r11-history-mobile.png', fullPage: true, scale: 'device' }).catch(() => {});

  check('no page errors', errors.length === 0, errors.join(' | '));

  let fails = 0;
  for (const r of results) {
    if (!r.ok) fails++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`);
  }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
