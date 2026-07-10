/* Drives the Life Organization app in Chromium against the Vite dev server:
 * screenshots every module (light + dark) and exercises the stub-AI flows.
 * Usage: npm run dev (in another shell), then: node scripts/verify.js [--shots-only]
 * Requires: npm i playwright-core; set CHROMIUM_PATH if Chromium is not at the default path. */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const OUT = path.join(__dirname, 'shots');
const NAV = [
  ['Life Dashboard', 'dashboard'],
  ['Brain Dump', 'dump'],
  ['Knowledge Vault', 'vault'],
  ['Goal Center', 'goals'],
  ['Roadmaps', 'roadmaps'],
  ['Strategist', 'strategist'],
  ['Finances', 'finance'],
  ['Socials', 'social'],
  ['Coach', 'coach'],
  ['Reflection', 'reflect'],
  ['Weekly Review', 'weekly'],
  ['Patterns', 'patterns'],
  ['Settings', 'settings'],
];

const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
};

/* Test fixture. The app itself ships empty: no sample goals, notes, or habits,
 * and no canned engine output. This harness supplies the lived-in data the
 * behavioural checks need. It deliberately contains NO engine output either
 * (no patterns, weekly review, or strategist advice) so the checks below have
 * to make the engine actually produce them. */
const DAY = 86400000;
const FIXTURE = {
  topTasks: [
    { id: 't1', text: 'Finish problem set 6, questions 3-5', area: 'School', done: false },
    { id: 't2', text: 'Comp the vocal takes before studio time', area: 'Music', done: false },
    { id: 't3', text: 'Pull day at 6:30 PM, protect it', area: 'Fitness', done: false },
  ],
  habits: [
    { id: 'h1', name: 'Gym: push / pull / legs', streak: 9, done: false, lastDone: null },
    { id: 'h2', name: '30 min instrument practice', streak: 4, done: false, lastDone: null },
    { id: 'h3', name: 'Read 20 pages', streak: 2, done: false, lastDone: null },
    { id: 'h4', name: 'Phone out of reach during study', streak: 6, done: false, lastDone: null },
  ],
  schedule: [
    { id: 's1', time: '9:00 AM', label: 'Lecture: Signals & Systems', tag: 'School' },
    { id: 's2', time: '11:30 AM', label: 'Study block: problem set 6', tag: 'School' },
    { id: 's3', time: '6:30 PM', label: 'Gym: pull day', tag: 'Fitness' },
  ],
  goals: [
    {
      id: 'g1', area: 'Music', title: 'Release a 5-track EP by December', progress: 38,
      vision: 'Music is a real second career.',
      year: ['EP released on all platforms'], quarter: ['Finish production on all 5 tracks'],
      month: ['Lock the arrangement'], week: ['Comp the vocal takes'], today: ['45 min on the bridge'],
    },
    {
      id: 'g2', area: 'School', title: 'Graduate with a 3.7+ GPA', progress: 64,
      vision: 'Leave school with deep signal-processing skills I actually use.',
      year: ['3.7+ cumulative GPA'], quarter: ['A- or better in Signals & Systems'],
      month: ['Problem sets 5-8 on time'], week: ['Finish problem set 6'], today: ['90 min: problem set 6'],
    },
  ],
  projects: [
    {
      id: 'p1', name: 'EP: Night Drive', stage: 'Production', pct: 38,
      phases: ['Writing', 'Production', 'Mixing', 'Master', 'Release'], current: 1, color: '#AFC4E0',
      fields: [{ k: 'Next milestone', v: 'All stems locked' }, { k: 'Risks', v: 'Scope creep' }],
    },
    {
      id: 'p2', name: 'Senior thesis', stage: 'Research', pct: 22,
      phases: ['Topic', 'Research', 'Lit review', 'Draft', 'Defend'], current: 1, color: '#B4D6BC',
      fields: [{ k: 'Next milestone', v: 'Lit review draft' }, { k: 'Risks', v: 'Competing deadlines' }],
    },
  ],
  vault: [
    { id: 'v1', title: 'EP concept: Night Drive', tag: 'Idea', date: 'Jun 02', snippet: 'Five tracks that map one late drive home.', createdAt: Date.now() - 36 * DAY },
    { id: 'v2', title: 'Mixing notes: low-end masterclass', tag: 'Notes', date: 'Jun 20', snippet: 'High-pass everything except kick and bass. Mono below 120Hz.', createdAt: Date.now() - 18 * DAY },
    { id: 'v3', title: 'Money rules', tag: 'Plan', date: 'Jul 01', snippet: 'Automatic transfer every paycheck. Gear only from gig income.', createdAt: Date.now() - 7 * DAY },
    { id: 'v4', title: 'Thesis direction: audio DSP', tag: 'Research', date: 'Jun 25', snippet: 'Real-time pitch correction artifacts as the thesis angle.', createdAt: Date.now() - 13 * DAY },
  ],
  settings: { onboarded: true },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => ok('no page errors', false, String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text());
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  /* ---- first-run onboarding: the Start Empty path ---- */
  const sawOnboarding = /Start Empty/.test(await page.locator('body').innerText());
  ok('onboarding shows on first run', sawOnboarding);
  await page.click('button:has-text("Start Empty")');
  await page.waitForTimeout(200);
  ok('tutorial step shows', /How it works/i.test(await page.locator('body').innerText()));
  await page.click('button:has-text("Finish")');
  await page.waitForTimeout(500);
  const emptyDash = await page.locator('main').innerText();
  ok(
    'Start Empty clears the sample data',
    !/problem set|Maya|record store/i.test(emptyDash) && /Add a task/.test(emptyDash),
  );

  /* The app ships with nothing invented, so the behavioural checks load a
   * fixture: lived-in user data, but no engine output anywhere. */
  await page.evaluate((fixture) => {
    localStorage.clear();
    localStorage.setItem('life-org-v2', JSON.stringify(fixture));
  }, FIXTURE);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  ok('fixture data loads for an onboarded install', /problem set/i.test(await page.locator('main').innerText()));

  /* ---- the shipped app invents nothing ---- */
  const shipped = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('life-org-v2'));
    return { patterns: s.patterns, weekly: s.weekly, morning: s.morning, eveningText: s.eveningText };
  });
  ok(
    'no canned engine output in stored state',
    (shipped.patterns ?? []).length === 0 &&
      Object.values(shipped.weekly ?? {}).every((v) => (v ?? []).length === 0) &&
      (shipped.morning ?? []).length === 0 &&
      !(shipped.eveningText ?? '').trim(),
  );

  const nav = (label) => page.click(`button.nav-item:has-text("${label}")`);
  const shot = async (name) => {
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(OUT, name + '.png') });
  };
  /* Dialogs are in-app now, not native OS popups. */
  const confirmDialog = async () => {
    await page.click('[data-dialog-confirm]');
    await page.waitForTimeout(350);
  };

  /* Offline contract: engine features refuse with a toast and invent nothing.
   * Waits out any lingering toast first so one refusal can't vouch for the
   * next check. */
  const engineRefuses = async (act) => {
    await page
      .waitForSelector('text=This needs the engine', { state: 'detached', timeout: 6000 })
      .catch(() => {});
    await act();
    const toast = await page
      .waitForSelector('text=This needs the engine', { timeout: 4000 })
      .catch(() => null);
    return !!toast;
  };

  /* ---- screenshots, light ---- */
  for (const [label, key] of NAV) {
    await nav(label);
    await shot(`${key}-light`);
  }
  /* ---- screenshots, dark ---- */
  await nav('Life Dashboard');
  await page.click('button.theme-toggle');
  for (const [label, key] of NAV) {
    await nav(label);
    await shot(`${key}-dark`);
  }
  await nav('Life Dashboard');
  await page.click('button.theme-toggle'); // back to light
  await page.waitForTimeout(300);

  if (process.argv.includes('--shots-only')) {
    await browser.close();
    process.exit(0);
  }

  /* ---- behavior: dashboard toggles + focus score ---- */
  const scoreBefore = await page.locator('text=Focus score').locator('..').innerText();
  await page.locator('.task-row').first().click();
  await page.waitForTimeout(200);
  const scoreAfter = await page.locator('text=Focus score').locator('..').innerText();
  ok('task toggle changes focus score', scoreBefore !== scoreAfter, `${scoreBefore.replace(/\s+/g, ' ')} -> ${scoreAfter.replace(/\s+/g, ' ')}`);
  await page.locator('.task-row').first().click(); // untoggle

  const habitsStat = () => page.locator('main').getByText(/^\d\/\d$/).first().innerText();
  const hb = await habitsStat();
  await page.locator('.quiet-row').first().click();
  await page.waitForTimeout(200);
  const ha = await habitsStat();
  ok('habit toggle updates habits counter', hb !== ha, `${hb} -> ${ha}`);

  /* ---- replan: offline, the engine refuses and the tasks stay put ---- */
  const taskBefore = await page.locator('.task-row').first().innerText();
  const replanRefused = await engineRefuses(() => page.click('button:has-text("Replan")'));
  const taskAfter = await page.locator('.task-row').first().innerText();
  ok('replan refuses without a key, tasks untouched', replanRefused && taskBefore === taskAfter);

  /* ---- brain dump capture (stub heuristic) ---- */
  await nav('Brain Dump');
  await page.fill('textarea', 'Email the landlord about the lease. Stop staying up past midnight. Problem set 7 due Friday 5pm.');
  await page.click('button:has-text("Capture")');
  await page.waitForTimeout(1800);
  const firstRow = await page.locator('main section > div:last-child > div').first().innerText();
  ok('brain dump captured + classified', /Just now/.test(firstRow), firstRow.replace(/\n/g, ' | '));
  const taVal = await page.inputValue('textarea');
  ok('brain dump textarea cleared on success', taVal === '');

  /* ---- dump entries delete only after the themed confirm ---- */
  const delBtns = page.locator('button[title="Delete this entry"]');
  const rowsBefore = await delBtns.count();
  await delBtns.last().click();
  await page.waitForTimeout(250);
  ok('dump delete asks first', await page.locator('.dialog-panel').isVisible());
  await confirmDialog();
  ok('dump entry deleted after confirm', (await delBtns.count()) === rowsBefore - 1);

  /* ---- goal cascade: offline recalc refuses, roadmap untouched ---- */
  await nav('Goal Center');
  const cascadeBefore = await page.locator('main').innerText();
  const cascadeRefused = await engineRefuses(() =>
    page.click('button:has-text("Recalculate roadmap")'),
  );
  ok(
    'cascade refuses without a key, roadmap untouched',
    cascadeRefused && (await page.locator('main').innerText()) === cascadeBefore,
  );

  /* ---- coach: the message is kept, the reply honestly refused ---- */
  await nav('Coach');
  const coachRefused = await engineRefuses(async () => {
    await page.fill('input.field', 'I am overwhelmed');
    await page.press('input.field', 'Enter');
  });
  const chatText = await page.locator('main').innerText();
  ok(
    'coach refuses without a key, message kept',
    coachRefused && /I am overwhelmed/.test(chatText) && !/Overwhelm is usually/.test(chatText),
  );

  /* ---- reflection: saves offline; only the read back needs the engine ---- */
  await nav('Reflection');
  const tas = page.locator('textarea');
  await tas.nth(0).fill('Finished the problem set early and it felt good.');
  await tas.nth(1).fill('Stayed up too late again.');
  await page.click('button:has-text("Close out the day")');
  await page.waitForTimeout(1400);
  const reflState = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('life-org-v2'));
    return {
      n: (s.reflections || []).length,
      output: s.reflections?.[0]?.output ?? null,
      journal: (s.vault || []).some((v) => v.tag === 'Journal'),
    };
  });
  ok(
    'reflection saves offline without an invented read',
    reflState.n >= 1 &&
      reflState.output === null &&
      reflState.journal &&
      !/Tonight/.test(await page.locator('main').innerText()),
  );

  /* ---- weekly: empty until compiled ---- */
  await nav('Weekly Review');
  ok('weekly review starts empty', /Nothing compiled yet|Nothing has been compiled/.test(await page.locator('main').innerText()));
  const weeklyRefused = await engineRefuses(() => page.click('button:has-text("Rebuild")'));
  ok(
    'weekly refuses without a key, stays empty',
    weeklyRefused && /Nothing compiled yet/.test(await page.locator('main').innerText()),
  );

  /* ---- vault search + connections ---- */
  await nav('Knowledge Vault');
  await page.fill('input.field', 'mixing');
  await page.waitForTimeout(300);
  const countLine = await page.locator('main').innerText();
  ok('vault live filter', /1 of \d+|2 of \d+/.test(countLine), (countLine.match(/\d+ of \d+ entries/) || [''])[0]);
  await page.fill('input.field', '');
  const connRefused = await engineRefuses(() => page.click('button:has-text("Surface connections")'));
  ok(
    'vault connections refuse without a key',
    connRefused && !/Threads you/i.test(await page.locator('main').innerText()),
  );

  /* ---- patterns: empty until the engine looks ---- */
  await nav('Patterns');
  const patBefore = await page.locator('main').innerText();
  ok('patterns start empty', /Nothing yet/.test(patBefore) && !/\b01\b/.test(patBefore));
  const patRefused = await engineRefuses(() => page.click('button:has-text("Look for patterns")'));
  ok(
    'patterns refuse without a key, stay empty',
    patRefused && /Nothing yet/.test(await page.locator('main').innerText()),
  );

  /* ---- strategist: starts empty, fills only from the engine ---- */
  await nav('Strategist');
  const stratBefore = await page.locator('main').innerText();
  ok(
    'strategist starts empty, no canned advice',
    /Nothing yet for today/.test(stratBefore) && !/01/.test(stratBefore),
  );
  const morningRefused = await engineRefuses(() => page.click('button:has-text("Read my day")'));
  const eveningRefused = await engineRefuses(() => page.click('button:has-text("Run the debrief")'));
  const strat = await page.locator('main').innerText();
  ok(
    'strategist refuses without a key, stays empty',
    morningRefused && eveningRefused && /Nothing yet for today/.test(strat) && !/01/.test(strat),
  );

  /* ---- personalization: add task / habit / schedule / goal / project ---- */
  await nav('Life Dashboard');
  await page.click('button:has-text("+ Add a task")');
  await page.fill('input[placeholder*="What needs doing"]', 'Water the plants');
  await page.press('input[placeholder*="What needs doing"]', 'Enter');
  await page.waitForTimeout(300);
  ok('task added by hand', /Water the plants/.test(await page.locator('main').innerText()));

  await page.click('button:has-text("+ Add a habit")');
  await page.fill('input[placeholder*="habit to track"]', 'Stretch 10 minutes');
  await page.press('input[placeholder*="habit to track"]', 'Enter');
  await page.waitForTimeout(300);
  ok('habit added by hand', /Stretch 10 minutes/.test(await page.locator('main').innerText()));

  await page.click('button:has-text("+ Add a block")');
  await page.waitForTimeout(300);
  ok('schedule block added', /New block/.test(await page.locator('main').innerText()));

  await nav('Goal Center');
  await page.click('button:has-text("+ Add a goal")');
  await page.waitForTimeout(300);
  ok('goal added', /New goal/.test(await page.locator('main').innerText()));
  await page.click('button:text-is("Remove")');
  await page.waitForTimeout(250);
  ok('themed confirm dialog opens', await page.locator('.dialog-panel').isVisible());
  await confirmDialog();
  ok('goal removed', !/New goal/.test(await page.locator('main').innerText()));

  await nav('Roadmaps');
  await page.click('button:has-text("+ Add a project")');
  await page.waitForTimeout(300);
  ok('project added', /New project/.test(await page.locator('main').innerText()));

  /* ---- finances: ledger + engine read ---- */
  await nav('Finances');
  await page.fill('input[placeholder="What was it"]', 'Paycheck');
  await page.fill('input[placeholder="Amount"]', '2500');
  await page.click('button:has-text("Add")');
  await page.waitForTimeout(300);
  ok('finance entry added', /Paycheck/.test(await page.locator('main').innerText()));
  const finRefused = await engineRefuses(() => page.click('button:has-text("Review finances")'));
  ok(
    'finance read refuses without a key',
    finRefused && /Run the review once entries exist/.test(await page.locator('main').innerText()),
  );

  /* ---- schedule blocks show the daily/today repeat control ---- */
  await nav('Life Dashboard');
  ok('schedule repeat control present', /DAILY/.test(await page.locator('main').innerText()));

  /* ---- daily history ledger recorded ---- */
  const hist = await page.evaluate(() => {
    const raw = localStorage.getItem('life-org-v2');
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed.history || [];
  });
  ok(
    'daily history ledger recording',
    hist.length >= 1 && Array.isArray(hist[hist.length - 1].habitsDone),
    `days: ${hist.length}, today habits done: ${hist.length ? hist[hist.length - 1].habitsDone.length : 0}`,
  );

  /* ---- settings persistence ---- */
  await nav('Settings');
  await page.fill('textarea', 'I run a small bakery and train for triathlons.');
  await page.press('textarea', 'Tab');
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await nav('Settings');

  const aboutVal = await page.inputValue('textarea');
  ok('about you persisted across reload', /bakery/.test(aboutVal));

  /* ---- weekly review day gate ---- */
  const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIdx = new Date().getDay();
  const otherIdx = (todayIdx + 3) % 7;
  await page.click(`button:has-text("${dayShort[otherIdx]}")`);
  await page.waitForTimeout(200);
  await nav('Weekly Review');
  ok('weekly review gated to chosen day', /compiles on/i.test(await page.locator('main').innerText()));
  await nav('Settings');
  await page.click(`button:has-text("${dayShort[todayIdx]}")`);
  await page.waitForTimeout(200);
  await nav('Weekly Review');
  ok('weekly review open on its day', /Rebuild/.test(await page.locator('main').innerText()));
  await nav('Settings');

  /* ---- engine options include OpenAI ---- */
  const settingsText = await page.locator('main').innerText();
  ok('openai engine option offered', /OpenAI API/.test(settingsText));

  /* ---- learned preferences: quiet offline, learns only from a live engine ---- */
  ok(
    'preference learning waits for the engine',
    /What the engine has learned/i.test(settingsText) &&
      /Nothing yet\. It picks things up quietly/.test(settingsText),
  );

  /* ---- backup + restore round trip ---- */
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Save a backup")'),
  ]);
  const bkPath = path.join(OUT, 'backup.json');
  await download.saveAs(bkPath);
  const bkOk = fs.existsSync(bkPath) && fs.statSync(bkPath).size > 500;
  ok('backup file downloads', bkOk, bkOk ? `${fs.statSync(bkPath).size} bytes` : 'missing');
  await page.setInputFiles('input[type="file"]', bkPath);
  await page.waitForTimeout(400);
  await confirmDialog();
  await page.waitForTimeout(400);
  ok('backup restores', /Backup restored/.test(await page.locator('main').innerText()));

  /* ---- live data file: stub the OS picker, confirm the mirror writes ---- */
  const fsaSupported = await page.evaluate(() => typeof window.showSaveFilePicker === 'function');
  if (fsaSupported) {
    await page.evaluate(() => {
      window.__fileWrites = [];
      window.showSaveFilePicker = async () => ({
        name: 'Life Organization Data.json',
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        getFile: async () =>
          new File([window.__fileWrites[window.__fileWrites.length - 1] || '{}'], 'd.json'),
        createWritable: async () => ({
          async write(d) {
            window.__fileWrites.push(d);
          },
          async close() {},
        }),
      });
    });
    await page.click('button:has-text("Keep a live data file")');
    await page.waitForTimeout(500);
    const liveText = await page.locator('main').innerText();
    const wrote = await page.evaluate(
      () => (window.__fileWrites || []).length > 0 && /goals/.test(window.__fileWrites[0]),
    );
    ok('live data file connects and mirrors state', /Live data file is on/.test(liveText) && wrote);
  } else {
    console.log('SKIP live data file (File System Access API unavailable in this browser)');
  }

  /* ---- persistence of dump across reload ---- */
  await nav('Brain Dump');
  const dumpAfterReload = await page.locator('main').innerText();
  ok('dump items persisted across reload', /midnight|landlord/i.test(dumpAfterReload));

  /* ---- coach summarization: seed a long chat, next reply condenses it ---- */
  await page.evaluate(() => {
    const parsed = JSON.parse(localStorage.getItem('life-org-v2'));
    const filler = [];
    for (let i = 0; i < 17; i++) {
      filler.push({ role: 'user', content: `Check-in number ${i + 1} about my day.` });
      filler.push({ role: 'assistant', content: `Reply ${i + 1}: keep the next step small.` });
    }
    parsed.chat = filler;
    parsed.chatSummarized = 0;
    parsed.chatSummary = '';
    localStorage.setItem('life-org-v2', JSON.stringify(parsed));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await nav('Coach');
  await page.fill('input.field', 'What should I focus on next?');
  await page.press('input.field', 'Enter');
  await page.waitForTimeout(4500);
  const summarized = await page.evaluate(() => {
    const parsed = JSON.parse(localStorage.getItem('life-org-v2'));
    return { n: parsed.chatSummarized, len: (parsed.chatSummary || '').length };
  });
  ok(
    'chat summarization waits for the engine',
    summarized.n === 0 && summarized.len === 0,
    `covers ${summarized.n} messages, summary ${summarized.len} chars`,
  );

  /* ---- pre-onboarding data never sees the wizard (upgrade safety) ---- */
  await page.evaluate(() => {
    const parsed = JSON.parse(localStorage.getItem('life-org-v2'));
    delete parsed.settings.onboarded; // simulate data from an older build
    localStorage.setItem('life-org-v2', JSON.stringify(parsed));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  ok(
    'existing data skips onboarding',
    !/Start Empty/.test(await page.locator('body').innerText()),
  );

  /* ---- fresh onboarding path: questions in, sample data out ---- */
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.click('button:has-text("Set up for me")');
  await page.fill('textarea', 'I manage a bakery and train for triathlons.');
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(150);
  await page.click('button:has-text("Next")'); // default areas
  await page.waitForTimeout(150);
  await page.fill('input[placeholder="The goal, in one line"]', 'Read 12 books this year');
  await page.fill('input[placeholder*="Train, read"]', 'Stretch, read 20 pages');
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(150);
  await page.click('button:has-text("Finish")');
  await page.waitForTimeout(500);
  const freshDash = await page.locator('main').innerText();
  ok(
    'fresh start removes sample data',
    !/problem set|Maya|record store/i.test(freshDash) && /Add a task/.test(freshDash),
  );
  await nav('Goal Center');
  ok('fresh start created the stated goal', /Read 12 books this year/.test(await page.locator('main').innerText()));
  await nav('Settings');
  ok('fresh start stored about you', /bakery/.test(await page.inputValue('textarea')));

  /* ---- no em dashes anywhere in UI text ---- */
  let empty = 0;
  for (const [label] of NAV) {
    await nav(label);
    await page.waitForTimeout(250);
    const txt = await page.locator('main').innerText();
    if (txt.includes('—')) ok(`no em dash on ${label}`, false, 'found U+2014');
    if (!txt.trim()) empty++;
  }
  ok('no module rendered empty', empty === 0);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} checks passed ====`);
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('DRIVER CRASH:', e);
  process.exit(2);
});
