const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const IMG = path.join(__dirname, 'test-photo.png');
const seed = (extra = {}) => Object.assign({
  v: 2, updated: 1700000000000, activities: [], moods: {}, journal: [],
  settings: { theme: 'light', savingsTarget: 1000, demo: false, name: 'QA', colors: {} },
}, extra);
function parse(c) {
  let m = c && c.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  m = c && c.match(/color\(srgb ([^)]+)\)/);
  if (m) { const parts = m[1].split('/'); const p = parts[0].trim().split(/\s+/).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: parts[1] ? Number(parts[1].trim()) : 1 }; }
  return null;
}

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
  const projects = [
    { id: 'p1', title: 'Cool app', area: 'Website', status: 'In Progress', repo: '', notes: 'Build the thing', problems: '', log: [{ id: 'l1', date: '2026-11-10', text: 'Old plain entry', photos: [] }] },
    { id: 'p2', title: 'Idea board', area: 'Linux', status: 'Idea', repo: '', notes: '', problems: '', log: [] },
  ];

  await load(seed({ projects }), '#techlab');

  // 1. Columns are frosted, cards are solid
  const cols = await page.$$eval('.tech-col', (cs) => cs.map((c) => ({ blur: getComputedStyle(c).backdropFilter, bg: getComputedStyle(c).backgroundColor })));
  check('the Tech Lab has five stage columns', cols.length === 5, cols.length);
  const colA = parse(cols[0] && cols[0].bg);
  check('stage columns are see-through', colA && colA.a < 1 && colA.a > 0, JSON.stringify(colA));
  check('stage columns are frosted', cols[0] && cols[0].blur !== 'none', cols[0] && cols[0].blur);
  const cardAlpha = await page.$$eval('.tech-card', (cs) => cs.map((c) => getComputedStyle(c).backgroundColor));
  const opaque = cardAlpha.map(parse).every((c) => c && c.a === 1);
  check('project cards are solid', cardAlpha.length === 2 && opaque, cardAlpha.join('|'));
  check('projects with no screenshot show the code icon', (await page.locator('.tech-cover-empty').count()) === 2);

  // 2. The popup shows the project and its log, with the old plain entry
  await page.click('[data-act="openProject"][data-id="p1"]');
  await page.waitForTimeout(300);
  const pop = await page.evaluate(() => { const d = document.querySelector('#proj-dlg'); return d ? { open: d.open, text: d.innerText } : null; });
  check('Open shows the project in a popup', pop && pop.open && pop.text.includes('Cool app') && pop.text.includes('Progress log'), pop && pop.text.slice(0, 160));
  check('older plain log entries still read', pop && pop.text.includes('Old plain entry'));

  // 3. New log entry with rich text
  await page.click('#proj-dlg [data-act="newLog"]');
  await page.waitForTimeout(300);
  check('+ New log entry opens the editor', (await page.evaluate(() => { const d = document.querySelector('#log-dlg'); return !!(d && d.open); })));
  await page.click('#log-dlg .rt');
  await page.keyboard.type('Hello');
  await page.keyboard.press('Control+A');
  await page.click('#log-dlg [data-cmd="bold"]');
  await page.waitForTimeout(150);
  const edHTML = await page.$eval('#log-dlg .rt', (n) => n.innerHTML);
  check('the editor takes bold text', edHTML.includes('<b>') || edHTML.includes('font-weight'), edHTML);

  // 4. Screenshot
  await page.setInputFiles('#log-dlg input[type="file"]', IMG);
  await page.waitForTimeout(1500);
  check('a screenshot appears in the editor', (await page.locator('#log-shots img[data-photo]').count()) === 1);

  // 5. Save
  await page.click('#log-dlg [data-act="logSave"]');
  await page.waitForTimeout(400);
  const s1 = await st();
  const p1 = s1.projects.find((p) => p.id === 'p1');
  check('saving stores the entry with rich text and screenshot', p1.log.length === 2 && p1.log[0].text === 'Hello' && (p1.log[0].html || '').includes('<b>') && p1.log[0].photos.length === 1, JSON.stringify(p1.log[0]).slice(0, 200));
  const popAfter = await page.evaluate(() => { const d = document.querySelector('#proj-dlg'); return d ? { open: d.open, text: d.innerText } : null; });
  check('the popup shows the new entry straight away', popAfter && popAfter.open && popAfter.text.includes('Hello'));
  await page.waitForTimeout(400);
  const shotSrc = await page.$eval('#proj-dlg .log-photos img[data-photo]', (n) => n.src).catch(() => '');
  check('the screenshot loads in the popup', shotSrc.startsWith('blob:'), shotSrc.slice(0, 40));

  // 6. The screenshot becomes the card cover on the board
  await page.click('#proj-dlg [data-act="closeProj"]');
  await page.waitForTimeout(300);
  check('the popup closes', (await page.evaluate(() => !document.querySelector('#proj-dlg').open)));
  const cover = await page.$eval('.tech-cover img[data-photo]', (n) => n.src).catch(() => '');
  check('the latest screenshot is the project cover', cover.startsWith('blob:'), cover.slice(0, 40));

  // 7. Edit, then cancel: nothing changes
  await page.click('[data-act="openProject"][data-id="p1"]');
  await page.waitForTimeout(250);
  await page.locator('#proj-dlg .log-entry').first().locator('[data-act="editLog"]').click();
  await page.waitForTimeout(250);
  check('Edit opens the entry in the editor', (await page.$eval('#log-dlg .rt', (n) => n.innerText)).includes('Hello'));
  await page.click('#log-dlg [data-act="logCancel"]');
  await page.waitForTimeout(250);
  const s2 = await st();
  check('Cancel keeps the entry as it was', s2.projects.find((p) => p.id === 'p1').log[0].text === 'Hello' && s2.projects.find((p) => p.id === 'p1').log[0].photos.length === 1);

  // 8. Delete the old plain entry
  await page.locator('#proj-dlg .log-entry', { hasText: 'Old plain entry' }).locator('[data-act="delLog"]').click();
  await page.waitForTimeout(250);
  await page.click('dialog button[type="submit"]');
  await page.waitForTimeout(400);
  const s3 = await st();
  check('deleting an entry removes it', s3.projects.find((p) => p.id === 'p1').log.length === 1);

  // 9. Move the stage from inside the popup
  await page.click('#proj-dlg [data-act="stageMove"][data-dir="1"]');
  await page.waitForTimeout(300);
  const s4 = await st();
  check('the stage moves from the popup', s4.projects.find((p) => p.id === 'p1').status === 'Testing', s4.projects.find((p) => p.id === 'p1').status);
  check('the popup shows the new stage', (await page.locator('#proj-dlg .tech-step.now', { hasText: 'Testing' }).count()) === 1);

  // 10. Delete a project from its popup
  await page.click('#proj-dlg [data-act="closeProj"]');
  await page.waitForTimeout(250);
  await page.click('[data-act="openProject"][data-id="p2"]');
  await page.waitForTimeout(250);
  await page.click('#proj-dlg [data-act="delProject"]');
  await page.waitForTimeout(250);
  await page.click('dialog button[type="submit"]');
  await page.waitForTimeout(400);
  const s5 = await st();
  check('deleting a project removes it', s5.projects.length === 1 && s5.projects[0].id === 'p1');
  check('deleting closes its popup', (await page.evaluate(() => !document.querySelector('#proj-dlg').open)));

  // 11. Phone width: the board scrolls inside its own box, the page does not
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await mp.goto(BASE + '#techlab');
  await mp.evaluate((x) => localStorage.setItem('mino.state.v2', JSON.stringify(x)), seed({ projects }));
  await mp.reload(); await mp.waitForTimeout(400);
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('the Tech Lab page does not scroll sideways at 390px', ov <= 1, `overflow ${ov}px`);
  await mp.screenshot({ path: __dirname + '/r13-techlab-mobile.png', fullPage: false, scale: 'device' }).catch(() => {});

  // Screenshots for review
  await load(seed({ projects: [
    { id: 'p1', title: 'Cool app', area: 'Website', status: 'In Progress', repo: 'https://example.com', notes: 'Build the thing', problems: 'The build fails on Linux.', log: [{ id: 'l2', date: '2026-11-14', html: '<p>Fixed the <b>build</b> bug.</p><ul><li>Pinned the version</li><li>Cleared the cache</li></ul>', text: 'Fixed the build bug.', photos: [] }, { id: 'l1', date: '2026-11-10', text: 'Started the layout', photos: [] }] },
    { id: 'p2', title: 'Idea board', area: 'Linux', status: 'Idea', repo: '', notes: '', problems: '', log: [] },
    { id: 'p3', title: 'Trading journal', area: 'Programming challenge', status: 'Testing', repo: '', notes: '', problems: '', log: [] },
  ] }), '#techlab');
  await page.screenshot({ path: __dirname + '/r13-techlab.png', fullPage: true, scale: 'device' }).catch(() => {});
  await page.click('[data-act="openProject"][data-id="p1"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: __dirname + '/r13-popup.png', fullPage: false, scale: 'device' }).catch(() => {});

  check('no page errors', errors.length === 0, errors.join(' | '));
  let fails = 0;
  for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.extra ? '  -- ' + r.extra : ''}`); }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
