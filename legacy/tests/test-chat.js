const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const seed = { v: 2, updated: 1, habits: [{ id: 'water', title: 'Drink 1.5L water', group: 'core', order: 0, custom: false }], habitChecks: {}, tasks: [], milestones: [], goalNotes: {}, resources: [], activities: [], journal: [{ id: 'j1', date: '2026-11-13', type: 'daily', title: 'Old entry', body: 'SECRET-JOURNAL-LINE', tags: [], favorite: false, created: 1 }], moods: {}, savings: [], screen: {}, bucket: [], projects: [], library: [], wishlist: [], orders: [], workouts: [], courses: [], trades: [], sessions: [], chat: [], settings: { theme: 'system', savingsTarget: 1000, demo: false } };
// Mock Claude: streams in two steps, records each prompt. Mode "fail" streams partial text then rejects with rate_limited.
const mock = (mode) => `
  window.__prompts = [];
  window.claude = { use: async (name) => name !== 'sample' ? null : async (input, opts) => {
    const prompt = typeof input === 'string' ? input : input.map(m => m.content).join('\\n');
    window.__prompts.push(prompt);
    if ('${mode}' === 'fail') { opts.onText({ text: 'Partial reply', delta: 'Partial reply' }); const e = new Error('x'); e.code = 'rate_limited'; e.text = 'Partial reply'; throw e; }
    opts.onText({ text: 'Hello', delta: 'Hello' });
    await new Promise(r => setTimeout(r, 50));
    opts.onText({ text: 'Hello there', delta: ' there' });
    return { text: 'Hello there', truncated: false, modelTierApplied: 'default' };
  } };`;
(async () => {
  const browser = await chromium.launch();
  const results = [];
  const check = (n, ok, x = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  <- ' + x}`);
  const errors = [];
  for (const mode of ['ok', 'fail']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(mock(mode));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE);
    await page.evaluate((s) => localStorage.setItem('mino.state.v2', JSON.stringify(s)), seed);
    await page.reload(); await page.waitForSelector('#chat');
    await page.fill('form[data-submit="askMino"] input[name="msg"]', 'How do I start my day?');
    await page.click('form[data-submit="askMino"] button[type="submit"]');
    if (mode === 'ok') {
      await page.waitForSelector('.bubble.mino:has-text("Hello there")', { timeout: 5000 });
      const prompts = await page.evaluate(() => window.__prompts);
      check('streamed reply appears in the chat', true);
      check('journal text is withheld by default', !prompts[0].includes('SECRET-JOURNAL-LINE'), prompts[0].slice(0, 80));
      check('prompt carries the goals and checklist context', prompts[0].includes('Habits done today'));
      check('no leftover pending bubble', (await page.$('#mino-live')) === null);
      await page.click('[data-change="toggleChatJournal"]');
      await page.fill('form[data-submit="askMino"] input[name="msg"]', 'And now?');
      await page.click('form[data-submit="askMino"] button[type="submit"]');
      await page.waitForFunction(() => window.__prompts.length >= 2);
      await page.waitForTimeout(300);
      const p2 = await page.evaluate(() => window.__prompts[1]);
      check('journal text goes in only after the viewer turns it on', p2.includes('SECRET-JOURNAL-LINE'));
      const st = await page.evaluate(() => S.settings.chatJournal);
      check('the toggle is saved', st === true);
    } else {
      await page.waitForSelector('.chat-note:has-text("Too many messages")', { timeout: 5000 });
      const t = await page.textContent('#chat');
      check('partial text is kept when a reply fails', t.includes('Partial reply'), t.slice(0, 200));
      check('the rate-limit message is shown in plain words', t.includes('Too many messages'));
    }
    await ctx.close();
  }
  check('no page errors in chat tests', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.error('CRASH', e.message); process.exit(1); });
