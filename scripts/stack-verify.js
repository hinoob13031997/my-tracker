#!/usr/bin/env node
/* STACK headless verification checklist.
 *
 * Formalizes the ad-hoc Playwright smoke test that got rewritten from
 * scratch in several past sessions (see STACK_HANDOFF.md). Serves the repo
 * over a local static server, drives the real navigation paths (.v29-nav /
 * .v234-tabs — never the hidden legacy #mobileNav, see the v29.24/25
 * lesson in STACK_HANDOFF.md), and checks for the three failure classes
 * that have caused real incidents in this app: JS errors, horizontal
 * overflow on mobile, and DOM-mutation loops (MutationObserver ping-pong).
 *
 * Usage:
 *   node scripts/stack-verify.js [--width=390] [--height=844] [--port=8811]
 *
 * Requires Playwright + a Chromium build. In this project's usual sandbox
 * that means the global install at /opt/node22/lib/node_modules and the
 * browser at /opt/pw-browsers/chromium (see STACK_HANDOFF.md, "Известные
 * особенности среды сессии") — this script falls back to those paths
 * automatically if a local `playwright` module isn't found, so it does not
 * need NODE_PATH set by hand. In a different environment, `npm i -D
 * playwright` in the repo (or set PLAYWRIGHT_CHROMIUM_PATH) will also work.
 */
'use strict';
const path = require('path');
const http = require('http');
const fs = require('fs');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
    const fallback = '/opt/node22/lib/node_modules/playwright';
    try {
      return require(fallback);
    } catch (e2) {
      console.error('Could not load Playwright from either "playwright" or ' + fallback + '.');
      console.error('Install it locally (npm i -D playwright) or run with NODE_PATH pointing at a global install.');
      process.exit(1);
    }
  }
}

function findChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    '/opt/pw-browsers/chromium',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined; // let Playwright find its own default install
}

function parseArgs(argv) {
  const out = { width: 390, height: 844, port: 8811 };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--(\w+)=(.+)$/);
    if (m) out[m[1]] = /^\d+$/.test(m[2]) ? Number(m[2]) : m[2];
  }
  return out;
}

function serveRepo(root, port) {
  const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
    '.webp': 'image/webp', '.png': 'image/png',
  };
  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(root, reqPath);
    if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

const SECTIONS = ['today', 'deals', 'fitness', 'finance', 'analytics'];
const FITNESS_TABS = ['today', 'progress', 'nutrition'];

async function openNutrition(page) {
  await page.click('.v29-nav [data-v29-nav="fitness"]');
  await page.waitForTimeout(400);
  await page.click('.v234-tabs [data-v234="nutrition"]');
  await page.waitForTimeout(600);
}

async function reload(page, baseUrl) {
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1600);
  await page.waitForSelector('.v29-nav', { timeout: 15000 });
}

async function runScenarios(page, baseUrl, note, fail) {
  const check = (ok, label) => (ok ? note(`  scenario OK: ${label}`) : fail(`scenario: ${label}`));

  // 1. Today status control cycles ✓ → ○ → — → empty (CLAUDE.md status logic).
  await page.click('.v29-nav [data-v29-nav="today"]');
  await page.waitForTimeout(400);
  const marks = [];
  for (let i = 0; i < 4; i++) {
    await page.click('.v29-row[data-v29-index="0"] .v29-status');
    await page.waitForTimeout(250);
    marks.push(await page.getAttribute('.v29-row[data-v29-index="0"] .v29-status', 'data-mark'));
  }
  check(marks.join('|') === '✓|○|—|', `Today status cycle (${marks.join('|') || 'empty'})`);

  // 2. Today «Тренировка» mark and the Fitness day status are one fact (v29.55).
  await page.evaluate(() => { state.processes[0].name = 'Тренировка'; save(); });
  await reload(page, baseUrl);
  await page.click('.v29-row[data-v29-index="0"] .v29-status');
  await page.waitForTimeout(300);
  const workoutKey = await page.evaluate(() => {
    const d = new Date(), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return localStorage.getItem('stack_fitness_workout_' + k);
  });
  check(workoutKey === '1', `Today ✓ «Тренировка» → Fitness status (${workoutKey})`);
  await page.click('.v29-row[data-v29-index="0"] .v29-open');
  await page.waitForTimeout(500);
  const fitnessOn = await page.evaluate(() => document.querySelector('#v234Fitness [data-engine-status].on,#v234Fitness [data-status].on')?.dataset.engineStatus ?? document.querySelector('#v234Fitness [data-status].on')?.dataset.status);
  // On rest days the plan has no workout and therefore no status buttons.
  const restDay = await page.evaluate(() => !!document.querySelector('#v234Fitness [data-engine-today]') && !document.querySelector('#v234Fitness [data-engine-status]'));
  if (restDay) console.log('  scenario SKIP: Fitness shows the Today mark (rest day in plan, no status buttons)');
  else check(fitnessOn === 'done', `Fitness shows the Today mark (${fitnessOn})`);

  // 3. Fitness goal settings sheet is actually visible and has profile fields (v29.55).
  await page.click('.v234-tabs [data-v234="today"]');
  await page.waitForTimeout(300);
  const settings = await page.$('[data-goal-settings]');
  if (settings) {
    await settings.click();
    await page.waitForTimeout(300);
    const sheet = await page.evaluate(() => {
      const s = document.getElementById('fxPlanEditor');
      return s ? { visible: getComputedStyle(s).display !== 'none' && s.getBoundingClientRect().height > 0, profile: !!s.querySelector('.fx-profile-fields') } : null;
    });
    check(sheet?.visible && sheet?.profile, `Fitness «Цель и источники» sheet visible with profile fields (${JSON.stringify(sheet)})`);
    await page.evaluate(() => document.getElementById('fxPlanEditor')?.remove());
  } else {
    fail('scenario: no [data-goal-settings] button on Fitness/Today');
  }

  // 3a. Exercise technique sheet image loads from assets/ (v29.65 moved it out of JS).
  const info = await page.$('#v234Fitness [data-info]');
  if (info) {
    await info.click();
    await page.waitForTimeout(800);
    const img = await page.evaluate(() => { const i = document.querySelector('.fx-tech-img'); return i ? { src: i.getAttribute('src'), w: i.naturalWidth } : null; });
    check(img && img.w > 0 && !/^data:/.test(img.src), `technique image loads from file (${img?.src} ${img?.w}px)`);
    await page.evaluate(() => document.getElementById('fxSheet')?.remove());
  }

  // 3b. Today task row: the right-hand control marks the task done and back (v29.64).
  await page.evaluate(() => {
    const d = new Date(), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    state.journal.push({ task: 'verify-task', date: '', due: k, status: 'Не начато' }); save();
  });
  await reload(page, baseUrl);
  await page.click('.v29-nav [data-v29-nav="today"]');
  await page.waitForTimeout(300);
  await page.click('.v29-row[data-v29-kind="task"] .v29-status');
  await page.waitForTimeout(300);
  const taskStatus = await page.evaluate(() => state.journal.find((t) => t.task === 'verify-task')?.status);
  const taskStillShown = await page.$('.v29-row[data-v29-kind="task"] .v29-status[data-mark="✓"]');
  check(taskStatus === 'Готово' && !!taskStillShown, `Today task status → «Готово», row stays (${taskStatus})`);

  // 3c. Дела → Процессы «Отметки за день»: yesterday's mark is editable (v29.64).
  await page.click('.v29-nav [data-v29-nav="deals"]');
  await page.waitForTimeout(300);
  await page.click('#v233shell [data-v233="processes"]');
  await page.waitForTimeout(400);
  await page.click('[data-mark-process="1"]');
  await page.waitForTimeout(300);
  const yesterdayMark = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return state.months?.[dateToMonthIndex(d)]?.[1]?.[d.getDate() - 1]; });
  check(yesterdayMark === '✓', `past-day mark in «Процессы» (${yesterdayMark})`);

  // 4. Nutrition: profile → STACK targets; «Поел» counts into plan/fact;
  //    a manual entry «вместо» a meal replaces it instead of double counting.
  await page.evaluate(() => localStorage.setItem('stack_fitness_profile_v2320', JSON.stringify({ height: 180, age: 29, sex: 'male' })));
  await reload(page, baseUrl);
  await openNutrition(page);
  const fact = () => page.evaluate(() => globalThis.STACK_NUTRITION_GOALS?.fact?.().kcal ?? null);
  const hasTargets = await page.evaluate(() => !!globalThis.STACK_NUTRITION_GOALS?.targets?.());
  check(hasTargets, 'Nutrition targets calculated from profile');
  const planned = await page.evaluate(() => globalThis.STACK_RATION?.meals?.()[0]?.kbju?.kcal ?? null);
  await page.click('[data-v2753-mark="0"]');
  await page.waitForTimeout(400);
  const afterEaten = await fact();
  check(planned > 0 && Math.abs(afterEaten - planned) <= 1, `«Поел» → plan/fact (${afterEaten} vs meal ${planned})`);
  await page.evaluate(() => {
    const k = 'stack_fitness_nutrition_v2310', a = JSON.parse(localStorage.getItem(k) || '[]'), d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    a.push({ date, name: 'verify-replace', kcal: 500, protein: 20, fat: 20, carbs: 50, replaces: `${globalThis.STACK_RATION.snapshot().variant}-0` });
    localStorage.setItem(k, JSON.stringify(a));
    window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'stack-verify' } }));
  });
  await page.waitForTimeout(400);
  const afterReplace = await fact();
  check(afterReplace === 500, `manual entry «вместо» replaces the eaten meal (${afterReplace}, expected 500)`);
  const ration = await page.evaluate(() => {
    const t = globalThis.STACK_NUTRITION_GOALS.targets(), m = globalThis.STACK_RATION.meals();
    const sum = m.reduce((s, x) => s + (x.kbju?.kcal || 0), 0);
    return { t: t.kcal, sum };
  });
  check(ration.sum >= ration.t * 0.95 && ration.sum <= ration.t * 1.05, `ration day kcal within ±5% of target (${ration.sum} / ${ration.t})`);

  // 5. Product swap keeps the day on target (v29.68).
  const swapBtn = await page.$('[data-v2753-swap="1-1"]');
  if (swapBtn) {
    await swapBtn.click();
    await page.waitForTimeout(300);
    await page.click('#v2753SwapModal [data-pick]');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const t = globalThis.STACK_NUTRITION_GOALS.targets(), m = globalThis.STACK_RATION.meals();
      return { t: t.kcal, sum: m.reduce((s, x) => s + (x.kcal ?? x.kbju?.kcal ?? 0), 0), swaps: localStorage.getItem('stack_nutrition_swaps_v2968') };
    });
    check(!!after.swaps && after.sum >= after.t * 0.95 && after.sum <= after.t * 1.05, `product swap re-solves the day (${after.sum} / ${after.t}, ${after.swaps})`);
  } else {
    fail('scenario: no swappable product in the ration');
  }

  // 6. Today shows one nutrition line with today's fact (v29.68).
  await page.click('.v29-nav [data-v29-nav="today"]');
  await page.waitForTimeout(300);
  const foodLine = await page.evaluate(() => document.querySelector('[data-v29-food] b')?.textContent || '');
  check(/^\d+ \/ \d+ ккал$/.test(foodLine), `Today nutrition line (${foodLine})`);

  // 7. Full backup round trip (v29.76): the export holds every stack_* key and the
  //    real import path restores them, including the task card id that links a
  //    task to its description/checklist.
  const seeded = await page.evaluate(() => {
    const d = STACK_DATA.dateKey();
    state.journal.push({ date: d, task: 'verify backup task', due: d, priority: 'Средний', status: 'Не начато', note: '', __v227id: 'tverifybackup' });
    save();
    localStorage.setItem('stack_task_details_v227', JSON.stringify({ tverifybackup: { description: 'verify description', checklist: [{ text: 'a', done: true }] } }));
    localStorage.setItem('stack_fitness_workout_2026-01-02', 'skip');
    localStorage.setItem('stack_fx_cbr_v1', JSON.stringify({ USD: 99 }));
    const full = STACK_DATA.exportFull(state);
    const snap = {};
    for (const k of Object.keys(full.storage)) snap[k] = full.storage[k];
    return { full, snap };
  });
  const keys = Object.keys(seeded.full.storage);
  check(seeded.full.format === 'stack-full-backup' && seeded.full.state.journal.some((t) => t.__v227id === 'tverifybackup'), 'export is a full backup with the main state');
  check(['stack_task_details_v227', 'stack_fitness_nutrition_v2310', 'stack_fitness_workout_2026-01-02'].every((k) => keys.includes(k)), `export carries Fitness/nutrition/task-detail keys (${keys.join(', ')})`);
  check(!keys.includes('stack_neon_mix9_calendar_v1') && !keys.includes('stack_fx_cbr_v1'), 'export leaves the main key out of storage and skips the FX cache');
  await page.evaluate(() => {
    for (const k of ['stack_task_details_v227', 'stack_fitness_nutrition_v2310', 'stack_fitness_workout_2026-01-02']) localStorage.removeItem(k);
    window.__stackVerifyPreImport = 1;
  });
  const onDialog = (dialog) => dialog.accept().catch(() => {});
  page.on('dialog', onDialog);
  await page.setInputFiles('#fileInput', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(seeded.full)) });
  await page.waitForFunction(() => !window.__stackVerifyPreImport, null, { timeout: 15000 });
  page.off('dialog', onDialog);
  await page.waitForSelector('.v29-nav', { timeout: 15000 });
  await page.waitForTimeout(800);
  const restored = await page.evaluate((snap) => ({
    same: Object.keys(snap).every((k) => localStorage.getItem(k) === snap[k]),
    taskId: state.journal.some((t) => t.task === 'verify backup task' && t.__v227id === 'tverifybackup'),
    details: JSON.parse(localStorage.getItem('stack_task_details_v227') || '{}').tverifybackup?.description,
  }), seeded.snap);
  check(restored.same && restored.taskId && restored.details === 'verify description', `import restores every key and keeps the task card id (${JSON.stringify(restored)})`);

  // 7b. Files written by older builds (the bare state object, no `format`) still import, without a reload.
  const legacyState = { ...seeded.full.state, goal: 0.7 };
  const legacyDialogs = [];
  const onLegacyDialog = (dialog) => { legacyDialogs.push(dialog.type()); dialog.accept().catch(() => {}); };
  page.on('dialog', onLegacyDialog);
  await page.setInputFiles('#fileInput', { name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacyState)) });
  await page.waitForTimeout(800);
  page.off('dialog', onLegacyDialog);
  const legacy = await page.evaluate(() => ({ goal: state.goal, taskId: state.journal.some((t) => t.__v227id === 'tverifybackup') }));
  check(legacy.goal === 0.7 && legacy.taskId && legacyDialogs.join() === 'alert', `legacy state-only file still imports (goal ${legacy.goal}, dialogs: ${legacyDialogs.join() || 'none'})`);

  // 8. Nothing the UI accepted is cut silently (v29.77): the journal used to be capped at 1000 on load —
  //    the newest tasks (appended last) vanished — and long notes were shortened on load/import.
  await page.evaluate(() => {
    for (let i = 0; i < 1100; i++) state.journal.push({ date: '2026-10-04', task: 'bulk ' + i, due: '', priority: 'Средний', status: 'Не начато', note: 'n'.repeat(700) });
    save();
  });
  await reload(page, baseUrl);
  const bulk = await page.evaluate(() => {
    const viaImport = validateImportedState(JSON.parse(JSON.stringify(state)));
    return {
      loaded: state.journal.length, last: state.journal[state.journal.length - 1].task, note: state.journal[state.journal.length - 1].note.length,
      imported: viaImport.journal.length, importedNote: viaImport.journal[viaImport.journal.length - 1].note.length,
      limits: [document.getElementById('sgName').maxLength, document.getElementById('stNote').maxLength],
    };
  });
  check(bulk.loaded >= 1100 && bulk.last === 'bulk 1099' && bulk.note === 700, `1100+ tasks survive a reload, newest included (${bulk.loaded}, last «${bulk.last}»)`);
  check(bulk.imported === bulk.loaded && bulk.importedNote === 700, `import keeps all tasks and the full 700-char note (${bulk.imported}, ${bulk.importedNote})`);
  check(bulk.limits.join() === '120,120', `goal name / transaction note inputs stop at the length that is kept on load (${bulk.limits.join()})`);
}

async function run() {
  const { chromium } = loadPlaywright();
  const args = parseArgs(process.argv);
  const root = path.resolve(__dirname, '..');
  const server = await serveRepo(root, args.port);
  const baseUrl = `http://localhost:${args.port}`;

  const failures = [];
  const note = (msg) => console.log(msg);
  const fail = (msg) => { failures.push(msg); console.log('FAIL: ' + msg); };

  const launchOpts = { args: ['--no-sandbox'] };
  const chromiumPath = findChromium();
  if (chromiumPath) launchOpts.executablePath = chromiumPath;
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: args.width, height: args.height },
    isMobile: args.width <= 720,
    hasTouch: args.width <= 720,
    serviceWorkers: 'block', // SW forces a navigate() reload; block it for a deterministic single-load test
  });
  // Block everything except our own local server (exchange rates, fonts,
  // etc. are unreachable in a sandboxed CI/dev run and otherwise stall
  // page.goto's network-idle wait indefinitely).
  await context.route('**/*', (route) => {
    const url = route.request().url();
    return url.startsWith(baseUrl) ? route.continue() : route.abort();
  });
  // STACK_VERIFY_DATE=YYYY-MM-DD pins the app's clock so day-dependent
  // scenarios (workout vs rest day) can be checked on any real weekday.
  if (process.env.STACK_VERIFY_DATE) await context.clock.setFixedTime(new Date(`${process.env.STACK_VERIFY_DATE}T12:00:00`));
  const page = await context.newPage();
  const jsErrors = [];
  // Every external request (exchange-rate API, web fonts, favicon...) is
  // deliberately aborted above so page.goto doesn't hang waiting on
  // unreachable hosts in a sandboxed run. Chromium logs each abort as a
  // generic "Failed to load resource: net::ERR_FAILED" console error —
  // that's this script's own doing, not an app bug, so it's filtered out
  // rather than reported as a failure.
  const isKnownNoise = (text) => /net::ERR_FAILED/.test(text);
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !isKnownNoise(m.text())) jsErrors.push('[console.error] ' + m.text()); });

  try {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1800);
    await page.waitForSelector('.v29-nav', { timeout: 15000 });
    note('Loaded shell OK.');

    async function checkOverflow(label) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (overflow) fail(`horizontal overflow on ${label}`);
      else note(`  overflow OK (${label})`);
    }

    for (const section of SECTIONS) {
      await page.click(`.v29-nav [data-v29-nav="${section}"]`);
      await page.waitForTimeout(500);
      await checkOverflow(section);
    }

    // Fitness tab round trip, including the Program drill-down from Progress.
    await page.click('.v29-nav [data-v29-nav="fitness"]');
    await page.waitForTimeout(500);
    for (const tab of FITNESS_TABS) {
      await page.click(`.v234-tabs [data-v234="${tab}"]`);
      await page.waitForTimeout(400);
      await checkOverflow(`fitness/${tab}`);
    }
    // The Program drill-down button only lives inside the Progress panel,
    // so switch back there first (the tab loop above ends on Nutrition).
    await page.click('.v234-tabs [data-v234="progress"]');
    await page.waitForTimeout(300);
    const programBtn = await page.$('#v234Progress button[data-v234="program"]');
    if (programBtn) {
      await programBtn.click();
      await page.waitForTimeout(300);
      await checkOverflow('fitness/program');
      const backBtn = await page.$('[data-v234="progress"]');
      if (backBtn) await backBtn.click();
    } else {
      note('  (no Program drill-down button found — skipping that check)');
    }

    // DOM-churn check: settle on Fitness Today, then verify mutations stop.
    await page.click('.v234-tabs [data-v234="today"]');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__stackVerifyMut = 0;
      new MutationObserver((m) => { window.__stackVerifyMut += m.length; })
        .observe(document.getElementById('v234Fitness') || document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    });
    await page.waitForTimeout(2500);
    const idleMutations = await page.evaluate(() => window.__stackVerifyMut);
    if (idleMutations > 0) fail(`${idleMutations} DOM mutations while idle on Fitness/Today (possible MutationObserver loop)`);
    else note(`  0 idle DOM mutations on Fitness/Today (2.5s) — no observer loop`);

    // ---- Behaviour scenarios (bugs that shipped once and slipped past the
    // navigation-only checks above). Each runs on this throwaway context's
    // own localStorage, so seeding data here never touches real user data.
    await runScenarios(page, baseUrl, note, fail);

    // Desktop (v29.69): a wide top-level page shows the same app in a phone-width
    // frame (index.html?frame=1) and does not run the app itself.
    const desk = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    await desk.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
    const dp = await desk.newPage();
    dp.on('pageerror', (e) => jsErrors.push('[desktop] ' + e.message));
    await dp.goto(`${baseUrl}/index.html`, { waitUntil: 'commit', timeout: 20000 });
    await dp.waitForTimeout(2500);
    const frame = dp.frames().find((f) => /[?&]frame=1/.test(f.url()));
    const parentRunsApp = await dp.evaluate(() => typeof state !== 'undefined');
    const frameOk = frame ? await frame.evaluate(() => innerWidth <= 720 && !!document.querySelector('.v29-nav')) : false;
    if (frameOk && !parentRunsApp) note('  desktop OK: app in phone-width frame, parent page runs no app code');
    else fail(`desktop frame (frame=${!!frame}, frameOk=${frameOk}, parentRunsApp=${parentRunsApp})`);
    await desk.close();

    // Local day, not the UTC day (v29.76): at 01:30 in Moscow the UTC date is still yesterday,
    // which put «+ Операция» on the previous day (and, on the 1st, in the previous month).
    const tz = await browser.newContext({ viewport: { width: args.width, height: args.height }, isMobile: true, hasTouch: true, serviceWorkers: 'block', timezoneId: 'Europe/Moscow' });
    await tz.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
    await tz.clock.setFixedTime(new Date('2026-10-01T22:30:00Z'));
    const tp = await tz.newPage();
    tp.on('pageerror', (e) => jsErrors.push('[timezone] ' + e.message));
    await tp.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await tp.waitForSelector('.v29-nav', { timeout: 15000 });
    const txDate = await tp.evaluate(() => {
      state.savings.goals.push({ id: 'gverify', name: 'verify', target: 1000, start: 0, monthly: 0, deadline: '', currency: 'RUB', color: '#0877f3', icon: 'home', tx: [] });
      state.savings.selectedId = 'gverify';
      state.savings.currency = 'RUB';
      openSavingsTx(1);
      return stDate.value;
    });
    if (txDate === '2026-10-02') note('  scenario OK: «+ Операция» defaults to the local day at 01:30 MSK (2026-10-02)');
    else fail(`scenario: «+ Операция» default date at 01:30 MSK is ${txDate}, expected 2026-10-02`);
    await tz.close();

    if (jsErrors.length) {
      for (const e of jsErrors) fail('JS error: ' + e);
    } else {
      note('0 JS errors.');
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('');
  if (failures.length) {
    console.log(`RESULT: FAIL (${failures.length} issue(s))`);
    process.exit(1);
  } else {
    console.log('RESULT: PASS');
    process.exit(0);
  }
}

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
