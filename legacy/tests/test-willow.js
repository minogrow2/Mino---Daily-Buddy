const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = __dirname;
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const seed = { v: 2, updated: 1700000000000, moods: { [today]: { mood: 'confident', note: '', html: '<p>Feeling sharp</p>' } }, settings: { theme: 'system', savingsTarget: 1000, demo: false, name: 'QA' } };

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const check = (name, ok, extra = '') => results.push({ name, ok: !!ok, extra: String(extra).slice(0, 220) });
  const pageErrors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(BASE + '#home');
  await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await page.reload();
  await page.waitForSelector('#home-clock');
  await page.waitForTimeout(300);

  // 1. Name
  const txt = await page.evaluate(() => document.body.innerText);
  check('no visible "Mino" text on Home', !/\bMino\b/.test(txt), (txt.match(/.{0,20}\bMino\b.{0,20}/) || [''])[0]);
  check('page title is Willow Life Journal', (await page.title()) === 'Willow Life Journal', await page.title());

  // 2. Hero
  const hero = await page.evaluate(() => {
    const h = document.querySelector('#welcome'); const r = h.getBoundingClientRect();
    return { height: Math.round(r.height), vh: innerHeight, first: h.parentElement.firstElementChild === h, greet: document.querySelector('#welcome-title').textContent, clock: document.querySelector('#home-clock').textContent };
  });
  check('hero is the first thing and fills about two-thirds of the screen', hero.first && hero.height >= hero.vh * 0.6, JSON.stringify(hero));
  check('hero shows the greeting with the name and the Manila clock', /Good|Still up/.test(hero.greet) && hero.greet.includes('QA') && /[AP]M/.test(hero.clock), `${hero.greet} / ${hero.clock}`);
  const heroNoCard = await page.evaluate(() => getComputedStyle(document.querySelector('#welcome')).backgroundColor);
  check('hero itself has no glass card behind it (scene shows)', heroNoCard === 'rgba(0, 0, 0, 0)' || heroNoCard === 'transparent', heroNoCard);

  // 3. Order and focus removed
  const pos = await page.evaluate(() => { const y = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY; return { hero: y('#welcome'), mood: y('#mood-card'), checklist: y('#checklist'), priorities: y('#priorities') }; });
  check('mood comes right after the hero and before checklist and priorities', pos.hero < pos.mood && pos.mood < Math.min(pos.checklist, pos.priorities), JSON.stringify(pos));
  check('daily focus field is gone', (await page.$$('input[name="focus"]')).length === 0 && !txt.includes('overall focus'));

  // 3b. Mood icons, confident -> thinking
  const moodInfo = await page.evaluate(() => ({
    svgs: document.querySelectorAll('#mood-card .mood-btn svg.mi').length,
    labels: [...document.querySelectorAll('#mood-card .mood-btn')].map((b) => b.textContent.trim()),
    emoji: /[\u{1F300}-\u{1FAFF}]/u.test(document.querySelector('#mood-card').innerText),
  }));
  check('mood buttons use line icons, not emoji', moodInfo.svgs === 9 && !moodInfo.emoji, `svgs ${moodInfo.svgs}`);
  check('"Thinking a lot" replaces "Confident"', moodInfo.labels.includes('Thinking a lot') && !moodInfo.labels.some((l) => /Confident/.test(l)), moodInfo.labels.join(' | '));
  const migrated = await page.evaluate((d) => S.moods[d].mood, today);
  check('saved confident mood migrates to thinking', migrated === 'thinking', migrated);

  // 3c. Mood editor still works (rich text autosave, toolbar)
  await page.click('#mood-card .rt');
  await page.keyboard.press('End');
  await page.keyboard.type(' and more');
  await page.waitForTimeout(150);
  const moodHtml = await page.evaluate((d) => S.moods[d].html, today);
  check('mood explanation still autosaves rich text', /and more/.test(moodHtml), moodHtml);
  await page.click('#mood-card .rt-btn[data-cmd="bold"]');
  await page.waitForTimeout(100);
  check('mood toolbar works without errors', pageErrors.length === 0, pageErrors.join(' | '));

  // 4. Weekly goal checklist
  const wk = await page.evaluate(() => ({ days: document.querySelectorAll('#goal-week .wk-day').length, goals: document.querySelectorAll('#goal-week .wk-goal').length, names: [...document.querySelectorAll('#goal-week .wk-name')].map((a) => a.textContent.trim()) }));
  check('weekly checklist: seven goals, seven day circles each', wk.days === 49 && wk.goals === 7, JSON.stringify({ days: wk.days, goals: wk.goals }));
  check('goal names are listed (Finance Trading first)', wk.names[0] === 'Finance Trading' && wk.names.length === 7, wk.names.join(', '));
  const futureDisabled = await page.evaluate((t) => [...document.querySelectorAll('#goal-week .wk-day')].filter((b) => b.dataset.date > t).every((b) => b.disabled), today);
  check('future days are disabled', futureDisabled);
  const logged = (d) => page.evaluate(([g, day]) => S.activities.filter((a) => a.goalId === g && a.date === day && a.checklist).length, ['trading', d]);
  const sel = `#goal-week [data-act="toggleGoalDay"][data-goal="trading"][data-date="${today}"]`;
  const b0 = await logged(today);
  await page.click(sel);
  await page.waitForTimeout(100);
  const b1 = await logged(today);
  check('tapping today’s circle logs an activity for that goal', b0 === 0 && b1 === 1, `${b0} -> ${b1}`);
  check('the circle shows as on', (await page.$(`#goal-week [data-goal="trading"][data-date="${today}"].on`)) !== null);
  await page.click(sel);
  await page.waitForTimeout(100);
  check('tapping again removes the checklist entry', (await logged(today)) === 0);

  // 5. Month preview and planner
  const month = await page.evaluate(() => ({ cells: document.querySelectorAll('#month-preview .mcell:not(.blank)').length, todays: document.querySelectorAll('#month-preview .mcell.today').length, title: document.querySelector('#month-preview h2').textContent }));
  check('month preview shows the real dates with today marked', month.cells >= 28 && month.todays === 1, JSON.stringify(month));
  await page.click(`#month-preview .mcell[data-date="${today}"]`);
  await page.waitForSelector('dialog.plan-dialog[open]');
  check('tapping a day opens the planner', true);
  await page.fill('dialog.plan-dialog [name="title"]', 'QA event');
  await page.selectOption('dialog.plan-dialog select[name="kind"]', 'event');
  await page.fill('dialog.plan-dialog input[name="time"]', '10:30');
  await page.click('dialog.plan-dialog button[type="submit"]');
  await page.waitForTimeout(150);
  const ev = await page.evaluate((d) => S.events.filter((e) => e.date === d), today);
  check('planner adds an event with a time', ev.length === 1 && ev[0].title === 'QA event' && ev[0].time === '10:30', JSON.stringify(ev));
  check('planner lists the new event', (await page.textContent('dialog.plan-dialog')).includes('QA event'));
  await page.fill('dialog.plan-dialog [name="title"]', 'QA task');
  await page.selectOption('dialog.plan-dialog select[name="kind"]', 'task');
  await page.click('dialog.plan-dialog button[type="submit"]');
  await page.waitForTimeout(150);
  const tk = await page.evaluate((d) => S.tasks.filter((x) => x.date === d && x.title === 'QA task').length, today);
  check('planner adds a task for that day', tk === 1, tk);
  const dots = await page.$$eval(`#month-preview .mcell[data-date="${today}"] .mdot`, (n) => n.length);
  check('the day shows dots for what is planned', dots >= 2, dots);
  await page.click('dialog.plan-dialog [data-act="closePlanner"]');
  await page.waitForTimeout(100);
  check('planner closes', (await page.$('dialog.plan-dialog')) === null);
  await page.click('#month-preview [data-act="homeMonth"][data-dir="1"]');
  const nextTitle = await page.textContent('#month-preview h2');
  check('month navigation moves forward and offers Today', nextTitle !== month.title && (await page.$('#month-preview [data-act="homeToday"]')) !== null, nextTitle);
  await page.click('#month-preview [data-act="homeToday"]');
  check('Today returns to the current month', (await page.textContent('#month-preview h2')) === month.title);

  // 6. Rich quick journal
  const qj = await page.evaluate(() => { const ed = document.querySelector('#quick-journal .rt'); return { editable: !!ed && ed.isContentEditable, bar: document.querySelectorAll('#quick-journal .rt-btn').length, noMoodKey: !!ed && !ed.hasAttribute('data-rt') }; });
  check('quick journal has the rich-text toolbar (with a Checkbox) and is not tied to mood', qj.editable && qj.bar === 7 && qj.noMoodKey, JSON.stringify(qj));
  await page.click('#quick-journal .rt');
  await page.keyboard.type('Walked by the pond today');
  await page.click('#quick-journal .rt-btn[data-cmd="italic"]');
  await page.click('#quick-journal button[type="submit"]');
  await page.waitForTimeout(150);
  const lastJ = await page.evaluate(() => S.journal[S.journal.length - 1]);
  check('quick journal saves plain body and rich html', lastJ && lastJ.body.includes('Walked by the pond today') && typeof lastJ.html === 'string' && lastJ.html.includes('Walked by the pond today'), lastJ ? JSON.stringify({ body: lastJ.body, html: lastJ.html }) : 'none');
  check('quick journal clears after save', (await page.textContent('#quick-journal .rt')).trim() === '');
  await page.goto(BASE + '#journal');
  await page.waitForSelector('.rt-view, .scrap-note', { timeout: 5000 }).catch(() => {});
  const rv = await page.$$eval('.rt-view, .scrap-note', (n) => n.map((x) => x.textContent).join(' | '));
  check('journal shows the rich entry', rv.includes('Walked by the pond today'), rv);

  check('no page errors on the desktop flow', pageErrors.length === 0, pageErrors.join(' | '));
  await page.goto(BASE + '#home');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'willow-desktop-top.png') });
  await page.locator('#goal-week').screenshot({ path: path.join(OUT, 'willow-desktop-goals.png') });
  await page.locator('#month-preview').screenshot({ path: path.join(OUT, 'willow-desktop-month.png') });

  // Phone: no horizontal scroll, hero and sections readable
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const pp = await phone.newPage();
  pp.on('pageerror', (e) => pageErrors.push('phone: ' + e.message));
  await pp.goto(BASE + '#home');
  await pp.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
  await pp.reload();
  await pp.waitForSelector('#home-clock');
  await pp.waitForTimeout(300);
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('phone: no horizontal scroll on Home', overflow <= 0, `overflow ${overflow}px`);
  await pp.screenshot({ path: path.join(OUT, 'willow-phone-top.png') });
  await pp.locator('#goal-week').screenshot({ path: path.join(OUT, 'willow-phone-goals.png') });
  await pp.locator('#month-preview').screenshot({ path: path.join(OUT, 'willow-phone-month.png') });

  const passed = results.filter((c) => c.ok).length;
  for (const c of results) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  <- ' + c.extra}`);
  console.log(`checks passed: ${passed}/${results.length}`);
  console.log('pageErrors:', pageErrors.length, pageErrors.slice(0, 5));
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
