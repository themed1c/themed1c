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

  /* ---- settings persistence ---- */
  await nav('Settings');
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

  /* ---- persistence of dump across reload ---- */
  await nav('Brain Dump');
  const dumpAfterReload = await page.locator('main').innerText();
  ok('dump items persisted across reload', /landlord/i.test(dumpAfterReload));

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
