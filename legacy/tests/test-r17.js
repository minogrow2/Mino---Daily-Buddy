const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const PHOTO = path.join(__dirname, 'test-photo.png');
const seed = (extra = {}) => Object.assign({
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme: 'light', savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
}, extra);
(async () => {
  const browser = await chromium.launch();
  const results = []; const errors = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 220) });
  const readState = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mino.state.v2') || 'null'));
  const load = async (p, hash, data) => {
    await p.goto(BASE + hash);
    await p.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), data);
    await p.reload(); await p.waitForTimeout(450);
  };
  const confirmYes = async (p) => { await p.locator('dialog[open] form.dlg button[type="submit"]').last().click(); await p.waitForTimeout(350); };

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await load(page, '#goal-ai', seed());

  check('the Notes box is a rich-text editor', (await page.locator('.goal-composer .rt[contenteditable="true"][data-input="goalNote"]').count()) === 1);
  check('the old plain textarea is gone', (await page.locator('textarea[aria-label="Goal notes"]').count()) === 0);

  const allGoals = ['trading', 'ai', 'glow', 'tech', 'money', 'reading', 'cs'];
  const everyGoal = [];
  for (const g of allGoals) {
    await page.evaluate((h) => { location.hash = h; }, `#goal-${g}`);
    await page.waitForTimeout(250);
    everyGoal.push((await page.locator(`#goal-notes-${g} .goal-composer .rt`).count()) === 1);
  }
  check('all seven goals have their own Notes box', everyGoal.every(Boolean), everyGoal.join(','));
  await page.evaluate(() => { location.hash = '#goal-ai'; }); await page.waitForTimeout(250);

  await page.evaluate(() => { const r = document.querySelector('.goal-composer .rt'); r.innerHTML = '<b>Bold idea</b> for the week'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  let st = await readState(page);
  check('typing autosaves the draft', st.goalDrafts && st.goalDrafts.ai && st.goalDrafts.ai.html.includes('Bold idea'), st.goalDrafts && JSON.stringify(st.goalDrafts.ai).slice(0, 120));

  await page.setInputFiles('.goal-composer input[type="file"]', PHOTO);
  await page.waitForSelector('.goal-composer .photo img', { timeout: 8000 });
  st = await readState(page);
  check('a photo can be added to a note', st.goalDrafts.ai.photos.length === 1, JSON.stringify(st.goalDrafts.ai.photos));
  check('the photo step keeps the typed text', (await page.textContent('.goal-composer .rt')).includes('Bold idea'));

  await page.click('.goal-composer [data-act="saveGoalNote"]'); await page.waitForTimeout(350);
  st = await readState(page);
  check('saving puts the note in the scrapbook', Array.isArray(st.goalNotes.ai) && st.goalNotes.ai.length === 1, JSON.stringify(st.goalNotes.ai && st.goalNotes.ai.length));
  check('the draft is cleared after saving', !st.goalDrafts || !st.goalDrafts.ai);
  check('the editor is empty after saving', (await page.textContent('.goal-composer .rt')).trim() === '');
  check('the saved note shows as a scrapbook page with its photo', (await page.locator('.scrapbook .scrap').count()) === 1 && (await page.locator('.scrapbook .scrap .scrap-photo img').count()) === 1);
  const tone = await page.$eval('.scrapbook .scrap', (a) => ['tone-pink', 'tone-butter', 'tone-sage'].find((t) => a.classList.contains(t)) || '');
  check('the page is tinted pink, yellow or green', !!tone, tone);
  check('the saved page shows the text', (await page.textContent('.scrapbook .scrap-note')).includes('Bold idea'));

  await page.click('.scrapbook .scrap-open'); await page.waitForTimeout(250);
  check('Open shows the full note in a popup', (await page.locator('#gnote-dlg[open] .rt-view b').count()) === 1 && (await page.locator('#gnote-dlg[open] .photo img').count()) === 1);

  await page.click('#gnote-dlg [data-act="pinGoalNote"]'); await page.waitForTimeout(300);
  check('pinning moves the page to the top', (await page.locator('.scrapbook .scrap.is-pinned').count()) === 1 && (await page.textContent('body')).includes('Pinned'));

  await page.click('#gnote-dlg [data-act="editGoalNote"]'); await page.waitForTimeout(350);
  check('Edit loads the note into the composer', (await page.textContent('#goal-notes-ai .goal-composer .actions')).includes('Update note') && (await page.textContent('.goal-composer .rt')).includes('Bold idea'));
  await page.evaluate(() => { const r = document.querySelector('.goal-composer .rt'); r.innerHTML = '<p>Edited thought</p>'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('.goal-composer [data-act="saveGoalNote"]'); await page.waitForTimeout(350);
  st = await readState(page);
  check('updating changes the same note, not a new one', st.goalNotes.ai.length === 1 && st.goalNotes.ai[0].html.includes('Edited thought'), JSON.stringify(st.goalNotes.ai.map((n) => n.html)));
  check('updating keeps its photo', st.goalNotes.ai[0].photos.length === 1);

  await page.click('.scrapbook .scrap-open'); await page.waitForTimeout(250);
  await page.click('#gnote-dlg [data-act="delGoalNote"]'); await page.waitForTimeout(250);
  await confirmYes(page);
  st = await readState(page);
  check('deleting a saved note removes its page', (st.goalNotes.ai || []).length === 0 && (await page.locator('.scrapbook .scrap').count()) === 0);

  await page.locator('.goal-composer .rt').click();
  await page.evaluate(() => { const r = document.querySelector('.goal-composer .rt'); r.innerHTML = 'A thought to drop'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('.goal-composer [data-act="discardGoalNote"]'); await page.waitForTimeout(250);
  await confirmYes(page);
  st = await readState(page);
  check('Clear throws the draft away', !st.goalDrafts || !st.goalDrafts.ai);

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await load(mp, '#goal-ai', seed({ goalNotes: { ai: [{ id: 'n1', html: '<p>A long phone note with several words to wrap</p>', photos: [], created: 1700000000000, updated: 1700000000000, pinned: false }] } }));
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('the goal page has no horizontal scroll at 390px', ov <= 1, `overflow ${ov}px`);

  const mig = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const mp2 = await mig.newPage();
  mp2.on('pageerror', (e) => errors.push('migrate: ' + e.message));
  await load(mp2, '#goal-trading', seed({ goalNotes: { trading: 'Old line one\nOld line two' } }));
  const mst = await readState(mp2);
  check('an old plain note becomes its first saved page', (await mp2.locator('.scrapbook .scrap').count()) === 1 && (await mp2.textContent('.scrapbook .scrap-note')).includes('Old line one'));
  check('the migrated note keeps both lines', (await mp2.textContent('.scrapbook .scrap-note')).includes('Old line two'));

  check('no page errors', errors.length === 0, errors.join(' | '));
  let fails = 0;
  for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`); }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
