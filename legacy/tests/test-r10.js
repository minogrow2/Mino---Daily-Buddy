const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const seed = (extra = {}) => Object.assign({
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme: 'light', savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
}, extra);
function parse(c) {
  const m = c && c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

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
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(S)));
  const goHash = async (hash) => { await page.goto(BASE + hash); await page.waitForTimeout(350); };

  // ---------- 1. Mood choices: Unproductive replaces Loved ----------
  await load(seed(), '#mood');
  const today = await page.evaluate(() => todayYMD());
  const labels = await page.$$eval('.mood-btn', (bs) => bs.map((b) => b.textContent.trim()));
  check('mood choices offer Unproductive', labels.some((l) => l.includes('Unproductive')), labels.join('|'));
  check('mood choices no longer offer Loved', !labels.some((l) => /Loved/i.test(l)), labels.join('|'));
  await page.click('.moods .mood-btn[data-mood="unproductive"]');
  await page.waitForTimeout(300);
  const savedUnp = await page.evaluate((d) => S.moods[d] && S.moods[d].mood, today);
  check('picking Unproductive saves it', savedUnp === 'unproductive', savedUnp);

  // ---------- 2. Old Loved days read as Happy ----------
  await load(seed({ moods: { '2026-11-10': { mood: 'loved', photos: [] } } }), '#mood');
  const migrated = await page.evaluate(() => S.moods['2026-11-10'] && S.moods['2026-11-10'].mood);
  check('old Loved days read as Happy', migrated === 'happy', migrated);

  // ---------- 3. Selected mood stands out ----------
  await load(seed({ moods: { [today]: { mood: 'happy', photos: [] } } }), '#mood');
  const pressed = await page.evaluate(() => {
    const b = document.querySelector('.moods .mood-btn[aria-pressed="true"]');
    const idle = document.querySelector('.moods .mood-btn[aria-pressed="false"]');
    if (!b || !idle) return null;
    const cs = getComputedStyle(b), is = getComputedStyle(idle), after = getComputedStyle(b, '::after');
    return { weight: Number(cs.fontWeight), idleWeight: Number(is.fontWeight), bg: cs.backgroundColor, idleBg: is.backgroundColor, dashed: cs.borderTopStyle, badge: after.content, count: document.querySelectorAll('.moods .mood-btn[aria-pressed="true"]').length };
  });
  check('exactly one mood is marked selected', pressed && pressed.count === 1, JSON.stringify(pressed));
  check('selected mood has bolder text', pressed && pressed.weight >= 600 && pressed.weight > pressed.idleWeight, JSON.stringify(pressed));
  check('selected mood has a dashed outline', pressed && pressed.dashed === 'dashed', pressed && pressed.dashed);
  check('selected mood has no check badge', pressed && !pressed.badge.includes('✓'), pressed && pressed.badge);
  check('selected mood fill differs from the others', pressed && pressed.bg !== pressed.idleBg, pressed && `${pressed.bg} vs ${pressed.idleBg}`);
  await page.screenshot({ path: OUT + '/r10-mood.png', fullPage: false, scale: 'device' }).catch(() => {});

  // ---------- 4. Home: Me Time ticks on the mood card ----------
  await load(seed(), '#home');
  const meLabels = await page.$$eval('#mood-card .me-chip', (bs) => bs.map((b) => b.textContent.trim()));
  const wanted = ['Sudoku', 'Gaming', 'Reading', 'Movie', 'Go out', 'Walk'];
  check('home mood card has the six Me Time ticks', wanted.every((w) => meLabels.some((l) => l.includes(w))), meLabels.join('|'));
  await page.click('#mood-card .me-chip[data-key="sudoku"]');
  await page.waitForTimeout(300);
  let s1 = await st();
  const sud = s1.activities.filter((a) => a.meKey === 'sudoku');
  check('ticking Sudoku on Home records one Me Time activity for today', sud.length === 1 && sud[0].date === today, JSON.stringify(sud));
  check('ticked Sudoku shows as on', (await page.locator('#mood-card .me-chip[data-key="sudoku"].on').count()) === 1);
  await page.click('#mood-card .me-chip[data-key="sudoku"]');
  await page.waitForTimeout(300);
  const s1b = await st();
  check('ticking Sudoku again unticks it', s1b.activities.filter((a) => a.meKey === 'sudoku').length === 0);
  await page.click('#mood-card .me-chip[data-key="sudoku"]');
  await page.waitForTimeout(300);

  // ---------- 5. Me Time connects to the Me Time page and the calendar ----------
  await goHash('#metime');
  const metimeText = await page.evaluate(() => document.body.innerText);
  check('Me Time page lists the Sudoku tick', metimeText.includes('Sudoku'), metimeText.slice(0, 120));
  await goHash('#calendar');
  check('calendar day page shows today’s Sudoku tick as on', (await page.locator('.day-page .me-chip[data-key="sudoku"].on').count()) === 1);

  // ---------- 6. Home heatmap opens that day on the calendar ----------
  await goHash('#home');
  const past = await page.evaluate(() => {
    const t = todayYMD();
    const ds = [...document.querySelectorAll('button.cell[data-act="heatPick"]')].map((b) => b.dataset.date).filter((d) => d < t);
    return ds[ds.length - 1] || null;
  });
  check('home heatmap days are buttons with a past day to open', !!past, past);
  await page.click(`button.cell[data-date="${past}"]`);
  await page.waitForTimeout(400);
  check('clicking a past heatmap day opens the calendar', (await page.evaluate(() => location.hash)) === '#calendar');
  check('the calendar opens on the clicked day', (await page.evaluate(() => CAL.selected)) === past);
  check('the day page is showing for that day', (await page.locator('.day-page').count()) === 1);

  // ---------- 7. Edit a past day: habit, mood and Me Time ----------
  const hid = await page.evaluate(() => coreHabits()[0].id);
  await page.click(`.day-page .check[data-id="${hid}"][data-date="${past}"]`);
  await page.waitForTimeout(300);
  let s2 = await st();
  check('ticking a habit on a past day saves it to that day', !!(s2.habitChecks[past] && s2.habitChecks[past][hid]));
  check('the same habit is not ticked for today', !(s2.habitChecks[today] && s2.habitChecks[today][hid]));
  await page.click(`.day-page .mood-btn[data-date="${past}"][data-mood="happy"]`);
  await page.waitForTimeout(300);
  let s3 = await st();
  check('setting a mood on a past day saves it to that day', s3.moods[past] && s3.moods[past].mood === 'happy', JSON.stringify(s3.moods[past]));
  await page.click(`.day-page .me-chip[data-date="${past}"][data-key="reading"]`);
  await page.waitForTimeout(300);
  let s4 = await st();
  check('ticking Reading on a past day records it for that day', s4.activities.some((a) => a.date === past && a.meKey === 'reading'));

  // ---------- 8. Edit an existing activity from the day page ----------
  await load(seed({ activities: [{ id: 'act1', date: '2026-11-10', category: 'outdoors', title: 'Old walk', minutes: 30, offline: true, note: '', demo: false, checklist: false, goalId: null, meKey: '' }] }), '#calendar');
  await page.evaluate(() => { CAL.selected = '2026-11-10'; CAL.month = '2026-11'; CAL.year = 2026; render(); });
  await page.waitForTimeout(300);
  await page.click('.day-page [data-act="editActivity"][data-id="act1"]');
  await page.waitForTimeout(250);
  await page.fill('dialog input[name="title"]', 'Evening walk');
  await page.click('dialog button[type="submit"]');
  await page.waitForTimeout(300);
  const s5 = await st();
  check('editing an activity from the day page saves the change', s5.activities.find((a) => a.id === 'act1').title === 'Evening walk');

  // ---------- 9. Journal is a scrapbook by default ----------
  const jseed = seed({ journal: [{ id: 'j1', date: '2026-11-10', type: 'daily', title: 'Good day', body: 'Went for a long walk', tags: ['life'], favorite: false, created: 1700000000000 }] });
  await load(jseed, '#journal');
  check('journal shows scrapbook pages by default', (await page.locator('.journal-book .scrap').count()) === 1);
  check('journal scrapbook page shows the title', ((await page.locator('.journal-book .scrap-title').first().textContent()) || '').includes('Good day'));
  await page.click('.journal-book .scrap-pin');
  await page.waitForTimeout(300);
  const s6 = await st();
  check('pinning a journal page marks it as a favourite', s6.journal[0].favorite === true);
  const toggle = await page.$('[data-act="toggleScrap"]');
  if (toggle) {
    await toggle.click(); await page.waitForTimeout(300);
    check('the list view is still one click away', (await page.locator('.journal-book').count()) === 0 && (await page.locator('.grid .card').count()) >= 1);
    await toggle.click().catch(() => {}); await page.waitForTimeout(200);
  } else {
    check('the list view toggle exists', false, 'no toggleScrap control');
  }
  await load(jseed, '#journal');
  await page.screenshot({ path: OUT + '/r10-journal.png', fullPage: false, scale: 'device' }).catch(() => {});

  // ---------- 10. Calendar day page is a scrapbook ----------
  await load(seed(), '#calendar');
  await page.evaluate(() => { CAL.selected = '2026-11-10'; CAL.month = '2026-11'; CAL.year = 2026; render(); });
  await page.waitForTimeout(300);
  const notes = await page.locator('.day-page .day-note').count();
  check('day page is laid out as scrapbook notes', notes === 8, notes);
  check('day page keeps the titled section names', (await page.locator('.day-page .day-note-title').allTextContents()).join('|').includes('Mood'));
  await page.screenshot({ path: OUT + '/r10-day.png', fullPage: true, scale: 'device' }).catch(() => {});

  // ---------- 11. Phone width: no horizontal scroll ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  const mload = async (s, hash) => { await mp.goto(BASE + hash); await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), s); await mp.reload(); await mp.waitForTimeout(400); };
  const sample = seed({ journal: jseed.journal, activities: [{ id: 'act1', date: '2026-11-10', category: 'outdoors', title: 'A very long activity title that should wrap neatly on a phone screen', minutes: 30, offline: true, note: '', demo: false, checklist: false, goalId: null, meKey: '' }] });
  for (const h of ['#home', '#mood', '#journal', '#metime', '#calendar']) {
    await mload(sample, h);
    if (h === '#calendar') { await mp.evaluate(() => { CAL.selected = '2026-11-10'; CAL.month = '2026-11'; CAL.year = 2026; render(); }); await mp.waitForTimeout(300); }
    const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no horizontal scroll at 390px on ${h}`, ov <= 1, `overflow ${ov}px`);
  }
  await mload(sample, '#calendar');
  await mp.evaluate(() => { CAL.selected = '2026-11-10'; CAL.month = '2026-11'; CAL.year = 2026; render(); }); await mp.waitForTimeout(300);
  await mp.screenshot({ path: OUT + '/r10-day-mobile.png', fullPage: true, scale: 'device' }).catch(() => {});

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
