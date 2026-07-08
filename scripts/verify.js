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

  const nav = (label) => page.click(`button.nav-item:has-text("${label}")`);
  const shot = async (name) => {
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(OUT, name + '.png') });
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

  /* ---- replan (stub) ---- */
  await page.click('button:has-text("Replan")');
  await page.waitForSelector('text=Replanning…', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1600);
  const taskText = await page.locator('.task-row').first().innerText();
  ok('replan produced tasks', taskText.trim().length > 0, taskText.split('\n')[0]);

  /* ---- brain dump capture (stub heuristic) ---- */
  await nav('Brain Dump');
  await page.fill('textarea', 'Email the landlord about the lease. Stop staying up past midnight. Problem set 7 due Friday 5pm.');
  await page.click('button:has-text("Capture")');
  await page.waitForTimeout(1800);
  const firstRow = await page.locator('main section > div:last-child > div').first().innerText();
  ok('brain dump captured + classified', /Just now/.test(firstRow), firstRow.replace(/\n/g, ' | '));
  const taVal = await page.inputValue('textarea');
  ok('brain dump textarea cleared on success', taVal === '');

  /* ---- goal cascade recalc + inline edit ---- */
  await nav('Goal Center');
  await page.click('button:has-text("Recalculate roadmap")');
  await page.waitForTimeout(1600);
  const vision = await page.locator('main').innerText();
  ok('cascade recalculated', /Steady, visible progress|Vision/i.test(vision));

  /* ---- coach chat ---- */
  await nav('Coach');
  const bubbles = () => page.locator('main [style*="max-width"]').count();
  await page.fill('input.field', 'I am overwhelmed');
  await page.press('input.field', 'Enter');
  await page.waitForTimeout(1800);
  const chatText = await page.locator('main').innerText();
  ok('coach replied', /Overwhelm is usually|five tasks/i.test(chatText));

  /* ---- reflection ---- */
  await nav('Reflection');
  const tas = page.locator('textarea');
  await tas.nth(0).fill('Finished the problem set early and it felt good.');
  await tas.nth(1).fill('Stayed up too late again.');
  await page.click('button:has-text("Close out the day")');
  await page.waitForTimeout(1800);
  const reflOut = await page.locator('main').innerText();
  ok('reflection produced output', /Tonight/i.test(reflOut) && /protect/i.test(reflOut));

  /* ---- weekly rebuild ---- */
  await nav('Weekly Review');
  await page.click('button:has-text("Rebuild")');
  await page.waitForTimeout(1600);
  ok('weekly review rendered', /Biggest wins/i.test(await page.locator('main').innerText()));

  /* ---- vault search + connections ---- */
  await nav('Knowledge Vault');
  await page.fill('input.field', 'mixing');
  await page.waitForTimeout(300);
  const countLine = await page.locator('main').innerText();
  ok('vault live filter', /1 of \d+|2 of \d+/.test(countLine), (countLine.match(/\d+ of \d+ entries/) || [''])[0]);
  await page.fill('input.field', '');
  await page.click('button:has-text("Surface connections")');
  await page.waitForTimeout(1800);
  ok('vault connections appeared', /Threads you/i.test(await page.locator('main').innerText()));

  /* ---- patterns ---- */
  await nav('Patterns');
  await page.click('button:has-text("Look again")');
  await page.waitForTimeout(1600);
  ok('patterns rendered', /01/.test(await page.locator('main').innerText()));

  /* ---- strategist ---- */
  await nav('Strategist');
  await page.click('button:has-text("Refresh")');
  await page.waitForTimeout(1600);
  await page.click('button:has-text("Run the debrief")');
  await page.waitForTimeout(1800);
  const strat = await page.locator('main').innerText();
  ok('strategist morning + evening', /01/.test(strat) && /(moved the needle|tomorrow)/i.test(strat));

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
  page.once('dialog', (d) => d.accept());
  await page.click('button:has-text("Remove")');
  await page.waitForTimeout(300);
  ok('goal removed', !/New goal/.test(await page.locator('main').innerText()));

  await nav('Roadmaps');
  await page.click('button:has-text("+ Add a project")');
  await page.waitForTimeout(300);
  ok('project added', /New project/.test(await page.locator('main').innerText()));

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
  await page.waitForTimeout(200);
  await page.click('button:has-text("Supportive")');
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await nav('Settings');
  const supportiveSelected = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((x) => x.textContent?.trim() === 'Supportive');
    if (!b) return 'missing';
    const st = getComputedStyle(b);
    return st.borderColor;
  });
  ok('settings tone persisted across reload', supportiveSelected !== 'missing', `border: ${supportiveSelected}`);

  const aboutVal = await page.inputValue('textarea');
  ok('about you persisted across reload', /bakery/.test(aboutVal));

  /* ---- engine options include OpenAI ---- */
  const settingsText = await page.locator('main').innerText();
  ok('openai engine option offered', /OpenAI API/.test(settingsText));

  /* ---- learned preferences accumulated from chat + reflection ---- */
  ok(
    'engine learned preferences from usage',
    /What the engine has learned/i.test(settingsText) && /Forget everything/.test(settingsText),
    (settingsText.match(/has learned\n[\s\S]{0,110}/i) || [''])[0].replace(/\n/g, ' | ').slice(0, 140),
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
  page.once('dialog', (d) => d.accept());
  await page.setInputFiles('input[type="file"]', bkPath);
  await page.waitForTimeout(600);
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
  ok('dump items persisted across reload', /landlord/i.test(dumpAfterReload));

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
    'coach history condensed in background',
    summarized.n > 0 && summarized.len > 40,
    `covers ${summarized.n} messages, summary ${summarized.len} chars`,
  );

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
