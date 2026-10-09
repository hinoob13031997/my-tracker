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

// Create → edit → delete through the real UI for tasks, processes, savings goals + transactions and body weight (v29.79).
// Runs in its own context with a fresh storage, so it cannot disturb the other scenarios. This is the safety net for
// moving a section off its legacy modules: if one of these breaks, the move broke data entry.
async function runCrudScenarios(browser, baseUrl, args, note, fail, jsErrors) {
  const ctx = await browser.newContext({ viewport: { width: args.width, height: args.height }, isMobile: args.width <= 720, hasTouch: args.width <= 720, serviceWorkers: 'block' });
  await ctx.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => jsErrors.push('[crud] ' + e.message));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  const check = (ok, label) => (ok ? note(`  scenario OK: ${label}`) : fail(`scenario: ${label}`));
  const step = async (label, fn) => { try { await fn(); } catch (e) { fail(`scenario: ${label} threw: ${String(e.message).split('\n')[0]}`); } };
  const noOverflow = async (label) => { if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) fail(`horizontal overflow: ${label}`); };
  const goto = async (section) => { await page.click(`.v29-nav [data-v29-nav="${section}"]`); await page.waitForTimeout(600); };
  const TITLE = 'CRUD задача & <тест>';
  const openTaskCard = () => page.evaluate((t) => { const el = [...document.querySelectorAll('#v2212Tasks *')].find((e) => e.children.length === 0 && e.textContent.trim().startsWith(t)); if (el) el.click(); return !!el; }, TITLE.slice(0, 10));
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('.v29-nav', { timeout: 15000 });
  await page.waitForTimeout(1500);

  await step('task create', async () => {
    const before = await page.evaluate(() => state.journal.length);
    await goto('deals');
    await page.locator('.v233-tabs button', { hasText: 'Задачи' }).first().click();
    await page.waitForTimeout(400);
    await page.click('#v2212Add');
    await page.waitForTimeout(300);
    await noOverflow('new-task modal');
    await page.fill('#v235Title', TITLE);
    await page.fill('#v235Due', '2026-12-31');
    await page.selectOption('#v235Pri', 'Высокий');
    await page.fill('#v235Note', 'заметка');
    await page.click('#v235Save');
    await page.waitForTimeout(500);
    const t = await page.evaluate(() => state.journal.at(-1));
    check((await page.evaluate(() => state.journal.length)) === before + 1 && t.task === TITLE && t.due === '2026-12-31' && t.priority === 'Высокий' && t.note === 'заметка', 'CRUD: task created with its fields');
    check(await page.evaluate((x) => document.getElementById('v2212Tasks').innerText.includes(x), TITLE), 'CRUD: task listed, HTML in the title shown as text');
  });
  await step('task card', async () => {
    check(await openTaskCard(), 'CRUD: task card opens');
    await page.waitForTimeout(400);
    await noOverflow('task card');
    await page.fill('#v2212Desc', 'описание задачи');
    await page.click('#v2212AddCheck');
    await page.fill('#v2212Checks input[data-t="0"]', 'пункт 1');
    await page.check('#v2212Checks input[data-c="0"]');
    await page.click('#v2212Save');
    await page.waitForTimeout(500);
    const d = await page.evaluate(() => { const t = state.journal.at(-1), det = JSON.parse(localStorage.getItem('stack_task_details_v227') || '{}')[t.__v227id]; return { id: !!t.__v227id, desc: det?.description, check: det?.checklist?.[0] }; });
    check(d.id && d.desc === 'описание задачи' && d.check?.text === 'пункт 1' && d.check?.done === true, 'CRUD: description and checklist saved under the task id');
  });
  await step('task delete', async () => {
    const before = await page.evaluate(() => ({ n: state.journal.length, id: state.journal.at(-1).__v227id }));
    await openTaskCard();
    await page.waitForTimeout(300);
    await page.click('#v2212Delete');
    await page.waitForTimeout(500);
    const after = await page.evaluate((id) => ({ n: state.journal.length, orphan: !!JSON.parse(localStorage.getItem('stack_task_details_v227') || '{}')[id] }), before.id);
    check(after.n === before.n - 1 && !after.orphan, 'CRUD: task deleted together with its description');
  });

  await step('process', async () => {
    const before = await page.evaluate(() => state.processes.length);
    await goto('deals');
    await page.locator('.v233-tabs button', { hasText: 'Процессы' }).first().click();
    await page.waitForTimeout(400);
    await page.evaluate(() => openProcessModal(null));
    await page.waitForTimeout(300);
    await noOverflow('process modal');
    await page.fill('#pmName', 'CRUD процесс');
    await page.fill('#pmGoal', '70');
    await page.click('#pmRepeatTypes [data-repeat="weekdays"]');
    await page.click('#saveProcessModal');
    await page.waitForTimeout(500);
    const p = await page.evaluate(() => { const x = state.processes.at(-1); return { n: state.processes.length, name: x.name, goal: x.goal, type: x.scheduleType, aligned: state.months.every((m) => m.length === state.processes.length) }; });
    check(p.n === before + 1 && p.name === 'CRUD процесс' && Math.abs(p.goal - 0.7) < 1e-9 && p.type === 'weekdays' && p.aligned, 'CRUD: process created, every month resized');
    await page.evaluate(() => openProcessModal(state.processes.length - 1));
    await page.fill('#pmName', 'CRUD процесс 2');
    await page.click('#saveProcessModal');
    await page.waitForTimeout(400);
    check(await page.evaluate(() => state.processes.at(-1).name === 'CRUD процесс 2'), 'CRUD: process renamed');
    await page.locator(`#v233Processes [data-process-delete="${before}"]`).click();
    await page.waitForTimeout(500);
    const gone = await page.evaluate(() => ({ n: state.processes.length, aligned: state.months.every((m) => m.length === state.processes.length) }));
    check(gone.n === before && gone.aligned, 'CRUD: process deleted, its marks removed from every month');
  });

  await step('finance', async () => {
    await goto('finance');
    await page.evaluate(() => openSavingsGoal(null));
    await page.waitForTimeout(300);
    await noOverflow('goal modal');
    await page.fill('#sgName', 'CRUD цель');
    await page.fill('#sgTarget', '10000');
    await page.fill('#sgStart', '1000');
    await page.fill('#sgMonthly', '500');
    await page.click('#sgSave');
    await page.waitForTimeout(500);
    const g = await page.evaluate(() => { const x = state.savings.goals.at(-1); return { name: x.name, target: x.target, start: x.start, id: x.id, sel: state.savings.selectedId }; });
    check(g.name === 'CRUD цель' && g.target === 10000 && g.start === 1000 && g.sel === g.id, 'CRUD: savings goal created and selected');
    await page.evaluate(() => openSavingsTx(1));
    await page.fill('#stAmount', '500');
    await page.fill('#stNote', 'взнос');
    await noOverflow('transaction modal');
    await page.click('#stSave');
    await page.waitForTimeout(400);
    await page.evaluate(() => openSavingsTx(-1));
    await page.fill('#stAmount', '200');
    await page.click('#stSave');
    await page.waitForTimeout(400);
    const bal = await page.evaluate(() => { const x = state.savings.goals.at(-1); return { n: x.tx.length, bal: STACK_DATA.balance(x), today: x.tx.every((t) => t.date === STACK_DATA.dateKey()) }; });
    check(bal.n === 2 && bal.bal === 1300 && bal.today, 'CRUD: +500 / −200 on a 1000 start gives 1300, dated today');
    await page.evaluate(() => stackEditTx(state.savings.goals.at(-1).tx[0].id));
    await page.waitForTimeout(300);
    await page.fill('#stAmount', '700');
    await page.click('#stSave');
    await page.waitForTimeout(400);
    check(await page.evaluate(() => STACK_DATA.balance(state.savings.goals.at(-1))) === 1500, 'CRUD: transaction edited, balance 1500');
    await page.locator('#screenSavings button', { hasText: /^Цели$/ }).first().click();
    await page.waitForTimeout(400);
    check(await page.evaluate(() => document.getElementById('screenSavings').innerText.includes('CRUD цель')), 'CRUD: goal visible on Finance → Цели');
    await noOverflow('finance after operations');
  });

  await step('body weight', async () => {
    await goto('fitness');
    await page.click('.v234-tabs [data-v234="progress"]');
    await page.waitForTimeout(500);
    await page.locator('[data-fxa-body-add]').first().click();
    await page.waitForTimeout(300);
    await noOverflow('body-weight modal');
    await page.fill('#fxaModal input[name="body"]', '57.3');
    await page.click('#fxaModal .fxa-save');
    await page.waitForTimeout(400);
    await page.locator('[data-fxa-body-edit]').first().click();
    await page.fill('#fxaModal input[name="body"]', '57.1');
    await page.click('#fxaModal .fxa-save');
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => JSON.parse(localStorage.getItem('stack_fitness_log_v2310') || '[]'));
    check(rows.length === 1 && Number(rows[0].body) === 57.1, 'CRUD: body weight added and edited');
  });

  await ctx.close();
}

// Fitness program calendar, yearly workout goal, configurable start date (v29.80). Each case gets its own context
// with a pinned clock and (where it matters) a seeded storage.
async function runProgramScenarios(browser, baseUrl, args, note, fail, jsErrors) {
  const check = (ok, label) => (ok ? note(`  scenario OK: ${label}`) : fail(`scenario: ${label}`));
  const open = async (iso, { tz = 'Europe/Moscow', seed = {} } = {}) => {
    const c = await browser.newContext({ viewport: { width: args.width, height: args.height }, isMobile: true, hasTouch: true, serviceWorkers: 'block', timezoneId: tz });
    await c.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
    await c.clock.setFixedTime(new Date(iso));
    await c.addInitScript((s) => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } }, seed);
    const p = await c.newPage();
    p.setDefaultTimeout(8000);
    p.on('pageerror', (e) => jsErrors.push('[program] ' + e.message));
    p.on('dialog', (d) => d.accept().catch(() => {}));
    await p.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p.waitForSelector('.v29-nav', { timeout: 15000 });
    await p.waitForTimeout(1200);
    return { c, p };
  };
  const toFitness = async (p, tab) => { await p.click('.v29-nav [data-v29-nav="fitness"]'); await p.waitForTimeout(500); await p.click(`.v234-tabs [data-v234="${tab}"]`); await p.waitForTimeout(600); };
  const firstExercise = (p) => p.evaluate(() => document.querySelector('#v234Fitness [data-engine-today] .fx-engine-ex b')?.textContent || '');

  { // calendar maths in a timezone with DST: week numbers must follow the calendar, not the clock
    // a WINTER start date: from the following spring the local clock is 1 h off, which broke `floor((date − start) / 7 days)`
    const { c, p } = await open('2026-10-07T12:00:00', { tz: 'America/New_York', seed: { stack_fitness_goal_v2318: JSON.stringify({ start: 56, target: 70, programStart: '2026-12-07' }) } });
    const r = await p.evaluate(() => {
      const D = STACK_DATA, bad = [];
      for (let i = 0; i < 800; i++) {
        const d = new Date(2026, 11, 7 + i), pos = D.programPosition(d), n = Math.floor(i / 7);
        const week = n < 52 ? n + 1 : 9 + ((n - 52) % 44), year = n < 52 ? 1 : 2 + Math.floor((n - 52) / 44);
        if (pos.week !== week || pos.year !== year) bad.push(`${i}:${pos.year}/${pos.week}≠${year}/${week}`);
      }
      const before = D.programPosition(new Date(2026, 11, 6));
      return { bad: bad.slice(0, 3), n: bad.length, before: `${before.year}/${before.week}`, y2: D.programPosition(new Date(2027, 11, 6)) };
    });
    check(r.n === 0 && r.before === '1/1' && r.y2.year === 2 && r.y2.week === 9 && r.y2.phase.name === 'Рост объёма', `program calendar is exact across DST: with a winter start year 2 begins exactly 52 weeks later at week 9, no repeated «Адаптация» (${r.n} bad days ${r.bad.join(' ')})`);
    await c.close();
  }
  { // year 1 is unchanged: the new calendar equals the old clamped formula for the first 52 weeks
    const { c, p } = await open('2026-10-07T12:00:00');
    const r = await p.evaluate(() => {
      const start = new Date(2026, 7, 10); let bad = 0;
      for (let i = -20; i < 364; i++) {
        const d = new Date(2026, 7, 10 + i), old = Math.max(1, Math.min(52, Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000 / 7) + 1));
        if (STACK_DATA.programPosition(d).week !== old) bad++;
      }
      return bad;
    });
    check(r === 0, 'program year 1 is identical to the old week numbering (weeks 1–52)');
    await c.close();
  }
  { // yearly goal, settings sheet, start date change keeps every mark; strategy card follows the real phase
    const { c, p } = await open('2026-10-07T12:00:00', { seed: {
      'stack_fitness_workout_2026-09-01': '1', 'stack_fitness_workout_2026-09-03': '1', 'stack_fitness_workout_2026-10-05': '1',
      'stack_fitness_workout_2025-12-30': '1', 'stack_fitness_workout_2026-10-02': 'skip' } });
    await toFitness(p, 'progress');
    const card = () => p.evaluate(() => document.querySelector('#v234Fitness [data-year-card]')?.innerText.replace(/\s+/g, ' ') || '');
    check(/3 выполнено в 2026/.test(await card()), `yearly card counts only ✓ of the current year, ignores ✗ and other years (${await card()})`);
    await p.click('#v234Fitness [data-year-card] [data-goal-settings]');
    await p.waitForTimeout(400);
    const sheet = await p.evaluate(() => ({ start: document.querySelector('#fxPlanEditor input[name="programStart"]')?.value, goal: document.querySelector('#fxPlanEditor input[name="yearWorkouts"]')?.value, w: document.documentElement.scrollWidth <= document.documentElement.clientWidth }));
    check(sheet.start === '2026-08-10' && sheet.goal === '' && sheet.w, `settings sheet offers the start date (default 2026-08-10) and the yearly goal, no overflow (${JSON.stringify(sheet)})`);
    await p.fill('#fxPlanEditor input[name="yearWorkouts"]', '250');
    await p.click('#fxPlanEditor .fx-save');
    await p.waitForTimeout(600);
    const goalKey = await p.evaluate(() => JSON.parse(localStorage.getItem('stack_fitness_goal_v2318')));
    check(/3 из 250/.test(await card()) && goalKey.yearWorkouts === 250 && goalKey.start === 56 && goalKey.training === 'stack' && Array.isArray(goalKey.workouts), `yearly goal saved into the existing goal object, old fields kept (${await card()})`);
    // program page: the strategy card must say 4/week (phase «Рост объёма»), not the profile's 3
    await p.click('#v234Progress button[data-v234="program"]');
    await p.waitForTimeout(500);
    check(await p.evaluate(() => /4 тренировки\/нед\./.test(document.getElementById('v234Fitness').innerText)), 'strategy card shows the real phase frequency (4/week in weeks 9–36)');
    // move the start date: marks are untouched, the program is recomputed
    const marks = () => p.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => k.startsWith('stack_fitness_workout_')).sort().map((k) => [k, localStorage.getItem(k)])));
    const before = await marks();
    await p.click('#v234Fitness [data-v234="progress"]');
    await p.waitForTimeout(400);
    await p.click('#v234Fitness [data-year-card] [data-goal-settings]');
    await p.waitForTimeout(300);
    await p.fill('#fxPlanEditor input[name="programStart"]', '2026-09-14');
    await p.click('#fxPlanEditor .fx-save');
    await p.waitForTimeout(600);
    const moved = await p.evaluate(() => ({ week: STACK_FITNESS.summary(new Date()).week, start: JSON.parse(localStorage.getItem('stack_fitness_goal_v2318')).programStart }));
    check(moved.start === '2026-09-14' && moved.week === 4 && (await marks()) === before, `moving the start date recomputes the program (week ${moved.week}) and leaves every ✓/○ mark untouched`);
    await c.close();
  }
  { // second program year: label, week, and last year's manual exercise swaps must not come back
    const swaps = { stack_fitness_exercise_swaps_v2321: JSON.stringify({ '3|squat': 'rdl' }) };
    const y1 = await open('2026-10-06T12:00:00', { seed: swaps });   // Tuesday, year 1, block 3
    await toFitness(y1.p, 'today');
    const swapped = await firstExercise(y1.p);
    await y1.c.close();
    const plain = await open('2026-10-06T12:00:00');
    await toFitness(plain.p, 'today');
    const unswapped = await firstExercise(plain.p);
    await plain.c.close();
    check(swapped && unswapped && swapped !== unswapped, `a year-1 manual swap changes the exercise («${unswapped}» → «${swapped}»)`);
    const y2 = await open('2027-08-17T12:00:00', { seed: swaps }); // Tuesday, year 2, week 10 → block 3 again
    await toFitness(y2.p, 'today');
    const info = await y2.p.evaluate(() => ({ s: STACK_FITNESS.summary(new Date()), head: document.querySelector('#v234Fitness [data-engine-today]')?.innerText.replace(/\s+/g, ' ').slice(0, 160) || '' }));
    const second = await firstExercise(y2.p);
    check(info.s.year === 2 && info.s.week === 10 && info.s.planned && /ГОД 2/.test(info.head), `Aug 2027 is program year 2, week 10, labelled «ГОД 2» (${info.head.slice(0, 90)})`);
    check(second !== swapped, `year-1 swap for block 3 does not re-apply in year 2 («${second}»)`);
    await y2.c.close();
  }
}


/* v29.81 — data integrity: honest save(), no resurrected fields, restore points, tab sync, backup reminder. */
async function runDataScenarios(browser, baseUrl, args, note, fail, jsErrors) {
  const ctx = await browser.newContext({ viewport: { width: args.width, height: args.height }, isMobile: args.width <= 720, hasTouch: args.width <= 720, serviceWorkers: 'block', acceptDownloads: true });
  await ctx.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => jsErrors.push('[data] ' + e.message));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  const check = (ok, label) => (ok ? note(`  scenario OK: ${label}`) : fail(`scenario: ${label}`));
  const step = async (label, fn) => { try { await fn(); } catch (e) { fail(`scenario: ${label} threw: ${String(e.message).split('\n')[0]}`); } };
  const open = async (pg) => { await pg.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 }); await pg.waitForSelector('.v29-nav', { timeout: 15000 }); await pg.waitForTimeout(900); };
  await open(page);

  await step('save() reports a failed write', async () => {
    await page.evaluate(() => { window.__origSet = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === KEY) throw new DOMException('quota', 'QuotaExceededError'); return window.__origSet.call(this, k, v); }; });
    const bad = await page.evaluate(() => { const warn = console.warn; console.warn = () => {}; const r = save(); console.warn = warn; return { r, toast: document.getElementById('stackBackupToast')?.textContent }; });
    await page.evaluate(() => { Storage.prototype.setItem = window.__origSet; });
    const good = await page.evaluate(() => ({ r: save(), toast: document.getElementById('stackBackupToast')?.textContent }));
    check(bad.r === false && /Не сохранено/.test(bad.toast || ''), `a failed write returns false and the toast says so (${bad.r}, «${bad.toast}»)`);
    check(good.r === true && /Сохранено/.test(good.toast || ''), `a real write returns true and shows «✓ Сохранено» (${good.r})`);
  });

  await step('deleted fields stay deleted', async () => {
    const r = await page.evaluate(() => {
      state.savings.goals.push({ id: 'gdel', name: 'x', target: 1, start: 0, monthly: 0, deadline: '', currency: 'RUB', color: '#ffffff', icon: 'home', tx: [], note: 'keep-me' });
      save(); delete state.savings.goals[0].note; save();
      const g = JSON.parse(localStorage.getItem(KEY)).savings.goals[0];
      state.savings.goals.length = 0; save();
      return { has: 'note' in g };
    });
    check(r.has === false, 'a field deleted from the state is not resurrected by the next save');
  });

  await step('restore-point retention', async () => {
    const r = await page.evaluate(() => {
      const MIN = 60000, H = 3600000, D = 86400000, now = new Date(2026, 9, 10, 12, 0, 0).getTime();
      const items = [
        ['min1', now - MIN], ['min9', now - 9 * MIN], ['min20', now - 20 * MIN], ['h3', now - 3 * H], ['h5', now - 5 * H],
        ['d2', now - 2 * D], ['d2h', now - 2 * D - H], ['d40', now - 40 * D], ['d41', now - 41 * D], ['d300', now - 300 * D],
        ['pinNew', now - 3 * MIN], ['pinOld', now - 20 * D],
      ];
      const pin = new Set(['pinNew', 'pinOld']), byTs = new Map(items.map(([n, t]) => [t, n]));
      const drop = STACK_RECOVERY.expired(items.map(([n, t]) => ({ ts: t, pin: pin.has(n) })), now).map((t) => byTs.get(t)).sort();
      return drop;
    });
    const want = ['d2h', 'd300', 'd41', 'h5', 'min9', 'pinOld'].sort();
    check(JSON.stringify(r) === JSON.stringify(want), `retention keeps the newest per 15 min / day / month and pins «before-…» (dropped ${JSON.stringify(r)})`);
  });

  await step('restore point round trip', async () => {
    await page.evaluate(() => { state.processes[0].name = 'Тест процесс'; state.journal.push({ id: 'rp1', task: 'RESTORE_ME', status: 'Не начато', date: '2026-10-01', due: '2026-12-31' }); save(); });
    const made = await page.evaluate(() => STACK_RECOVERY.snapshotNow('before-delete'));
    const listed = await page.evaluate(async () => (await STACK_RECOVERY.list()).filter((x) => x.reason === 'before-delete').map((x) => ({ id: x.id, tasks: x.stats?.tasks, pin: x.pin })));
    check(made === true && listed.length === 1 && listed[0].pin === true && listed[0].tasks >= 1, `«before-delete» point is written, pinned and counted (${JSON.stringify(listed)})`);
    await page.evaluate(() => { state.journal.length = 0; save(); });
    check(await page.evaluate(() => state.journal.length === 0), 'the task is gone before restoring');
    const nav = page.waitForNavigation({ timeout: 15000 });
    await page.evaluate((id) => { STACK_RECOVERY.restore(id); }, listed[0].id);
    await nav;
    await page.waitForSelector('.v29-nav', { timeout: 15000 });
    await page.waitForTimeout(900);
    const back = await page.evaluate(() => ({ live: state.journal.some((t) => t.task === 'RESTORE_ME'), stored: JSON.parse(localStorage.getItem(KEY)).journal.some((t) => t.task === 'RESTORE_ME') }));
    check(back.live && back.stored, `restore brings the task back and it survives the reload (${JSON.stringify(back)})`);
    const pre = await page.evaluate(async () => (await STACK_RECOVERY.list()).filter((x) => x.reason === 'before-restore').length);
    check(pre >= 1, 'the state before a restore is itself kept as a restore point');
  });

  await step('IndexedDB is written once per burst of saves', async () => {
    await page.evaluate(() => { window.__puts = []; const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v, k) { window.__puts.push(k); return put.apply(this, arguments); }; });
    await page.evaluate(() => { for (let i = 0; i < 12; i++) { state.journal[0].note = 'burst ' + i; save(); } });
    await page.waitForTimeout(2200);
    const n = await page.evaluate(() => window.__puts.filter((k) => k === IDB_KEY).length);
    check(n === 1, `12 saves in a row → ${n} write of the IndexedDB copy`);
    await page.waitForTimeout(4500);
    const snaps = await page.evaluate(() => window.__puts.filter((k) => String(k).startsWith('snap:')).length);
    check(snaps <= 2, `12 saves in a row → ${snaps} restore point written (debounced)`);
  });

  await step('two windows do not overwrite each other', async () => {
    const b = await ctx.newPage();
    b.setDefaultTimeout(8000);
    b.on('pageerror', (e) => jsErrors.push('[data/b] ' + e.message));
    b.on('dialog', (d) => d.accept().catch(() => {}));
    await open(b);
    await page.evaluate(() => { state.journal.push({ id: 'tabA', task: 'FROM_TAB_A', status: 'Не начато', date: '2026-10-01', due: '2026-12-31' }); save(); });
    await b.waitForTimeout(600);
    const seen = await b.evaluate(() => state.journal.some((t) => t.task === 'FROM_TAB_A'));
    await b.evaluate(() => { state.journal.push({ id: 'tabB', task: 'FROM_TAB_B', status: 'Не начато', date: '2026-10-01', due: '2026-12-31' }); save(); });
    await page.waitForTimeout(600);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem(KEY)).journal.map((t) => t.task));
    const aSees = await page.evaluate(() => state.journal.some((t) => t.task === 'FROM_TAB_B'));
    check(seen && aSees && stored.includes('FROM_TAB_A') && stored.includes('FROM_TAB_B'), `window B adopts A's save, A adopts B's, nothing lost (${JSON.stringify({ seen, aSees })})`);
    await b.close();
  });

  await step('backup reminder', async () => {
    const fresh = await page.evaluate(() => STACK_DATA.backupStatus());
    check(fresh.due === false, 'no reminder right after the first launch with data');
    await page.evaluate(() => { localStorage.setItem('stack_backup_meta_v1', JSON.stringify({ since: new Date(Date.now() - 20 * 864e5).toISOString(), last: null })); STACK_V29_SHELL.refresh(); });
    await page.click('.v29-nav [data-v29-nav="today"]');
    await page.waitForTimeout(400);
    check(!!(await page.$('[data-v29-backup]')), 'Today shows the backup reminder after 14+ days without a file');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-v29-backup]')]);
    const file = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ banner: !!document.querySelector('[data-v29-backup]'), last: JSON.parse(localStorage.getItem('stack_backup_meta_v1')).last }));
    check(!after.banner && !!after.last, 'downloading the file records the date and removes the reminder');
    check(file.format === 'stack-full-backup' && !('stack_backup_meta_v1' in file.storage), 'the backup meta key is not part of the backup file');
  });

  await step('restore sheet in Analytics', async () => {
    await page.click('.v29-nav [data-v29-nav="analytics"]');
    await page.waitForTimeout(600);
    await page.click('[data-v29a-restore]');
    await page.waitForSelector('#v29aRestore .v29a-snap', { timeout: 8000 });
    const m = await page.evaluate(() => { const c = document.querySelector('#v29aRestore .v29a-sheet-card'); const r = c.getBoundingClientRect(); return { rows: document.querySelectorAll('#v29aRestore .v29a-snap').length, fits: r.left >= 0 && r.right <= innerWidth + 0.5, overflowX: c.scrollWidth > c.clientWidth }; });
    check(m.rows >= 1 && m.fits && !m.overflowX, `restore sheet lists ${m.rows} point(s) and fits the screen`);
    await page.click('#v29aRestore [data-v29a-close]');
    check(!(await page.$('#v29aRestore')), 'restore sheet closes');
  });

  await step('an immediate reload keeps the last save', async () => {
    const before = await page.evaluate(() => { for (let i = 0; i < 300; i++) state.journal.push({ date: '2026-10-04', task: 'reload ' + i, due: '', priority: 'Средний', status: 'Не начато', note: '' }); save(); return { len: state.journal.length, rev: Number(state._meta.revision) }; });
    await open(page);
    const after = await page.evaluate(() => ({ len: state.journal.length, rev: Number(state._meta.revision) }));
    check(after.len === before.len && after.rev >= before.rev, `a reload right after a save neither rolls back to the IndexedDB copy nor restarts the revision (${JSON.stringify({ before, after })})`);
  });

  await step('corrupt main key is recovered from a restore point', async () => {
    const c = await ctx.newPage();
    c.setDefaultTimeout(8000);
    c.on('pageerror', (e) => jsErrors.push('[data/c] ' + e.message));
    c.on('dialog', (d) => d.accept().catch(() => {}));
    await c.addInitScript(() => { if (!sessionStorage.getItem('__corrupted')) { sessionStorage.setItem('__corrupted', '1'); localStorage.setItem('stack_neon_mix9_calendar_v1', '{broken'); } });
    await c.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await c.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('stack_neon_mix9_calendar_v1')).journal.some((t) => t.task === 'RESTORE_ME'); } catch (e) { return false; } }, null, { timeout: 12000 }).catch(() => {});
    await c.waitForSelector('.v29-nav', { timeout: 15000 });
    await c.waitForTimeout(800);
    const r = await c.evaluate(() => ({ live: state.journal.some((t) => t.task === 'RESTORE_ME'), stored: (() => { try { return JSON.parse(localStorage.getItem('stack_neon_mix9_calendar_v1')).journal.some((t) => t.task === 'RESTORE_ME'); } catch (e) { return false; } })() }));
    check(r.live && r.stored, `a corrupt main key is rebuilt from the newest restore point and stays rebuilt (${JSON.stringify(r)})`);
    await c.close();
  });

  await step('an import cannot be rolled back by an older IndexedDB copy', async () => {
    const r = await page.evaluate(async () => {
      const before = Number(state._meta?.revision) || 0;
      const next = validateImportedState({ processes: state.processes, months: state.months, journal: [{ date: '2026-10-01', task: 'IMPORTED', due: '', priority: 'Средний', status: 'Не начато', note: '' }], savings: state.savings });
      next._meta = { ...(next._meta || {}), revision: Math.max(Number(state._meta?.revision) || 0, Number(next._meta?.revision) || 0) };
      state = next; normalize(); save(); idbFlush();
      await new Promise((res) => setTimeout(res, 300));
      return { before, after: Number(state._meta.revision), idb: Number((await idbLoadState())?._meta?.revision) || 0 };
    });
    check(r.after > r.before && r.idb === r.after, `revision keeps growing across an import and the IndexedDB copy matches (${JSON.stringify(r)})`);
  });

  await ctx.close();
}


/* v29.82 — «Сегодня»: overdue tasks, status memory, workout recognition, one render per tap, resume refresh, tap targets, nutrition guards. */
async function runTodayScenarios(browser, baseUrl, args, note, fail, jsErrors) {
  const ctx = await browser.newContext({ viewport: { width: args.width, height: args.height }, isMobile: args.width <= 720, hasTouch: args.width <= 720, serviceWorkers: 'block' });
  await ctx.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => jsErrors.push('[today] ' + e.message));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  const check = (ok, label) => (ok ? note(`  scenario OK: ${label}`) : fail(`scenario: ${label}`));
  const step = async (label, fn) => { try { await fn(); } catch (e) { fail(`scenario: ${label} threw: ${String(e.message).split('\n')[0]}`); } };
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('.v29-nav', { timeout: 15000 });
  await page.waitForTimeout(900);
  const refresh = async () => { await page.evaluate(() => STACK_V29_SHELL.refresh()); await page.waitForTimeout(250); };
  const addTask = (task, status, daysAgo, id) => page.evaluate(([t, st, n, i]) => { const k = STACK_DATA.dateKey(new Date(Date.now() - n * 864e5)); state.journal.push({ id: i, task: t, status: st, date: k, due: k }); save(); }, [task, status, daysAgo, id]);

  await step('overdue tasks', async () => {
    await addTask('OVERDUE_ONE', 'В работе', 3, 'od1');
    await refresh();
    const row = await page.evaluate(() => { const r = [...document.querySelectorAll('.v29-row[data-v29-kind="task"]')].find((e) => e.textContent.includes('OVERDUE_ONE')); return r ? { late: r.querySelector('.v29-late')?.textContent || '' } : null; });
    check(!!row && /просрочено · 3 дн\./.test(row.late), `an overdue task is on «Сегодня» with its delay (${JSON.stringify(row)})`);
  });

  await step('overdue cap', async () => {
    for (let i = 0; i < 7; i++) await addTask('OVERDUE_BULK_' + i, 'Не начато', 10 + i, 'odb' + i);
    await refresh();
    const m = await page.evaluate(() => ({ late: document.querySelectorAll('.v29-row[data-v29-kind="task"] .v29-late').length, more: document.querySelector('[data-v29-more]')?.textContent || '' }));
    check(m.late === 5 && /Ещё 3 просроченных/.test(m.more), `at most 5 overdue rows, the rest behind one row (${JSON.stringify(m)})`);
    await page.click('[data-v29-more]');
    await page.waitForTimeout(500);
    check(await page.evaluate(() => !!document.querySelector('#screenTasks.active') || document.querySelector('.v29-nav [aria-current="page"]')?.dataset.v29Nav === 'deals'), '«Ещё N» opens Дела');
    await page.click('.v29-nav [data-v29-nav="today"]');
    await page.waitForTimeout(300);
  });

  await step('«В работе» survives a tick and an untick', async () => {
    const sel = '.v29-row[data-v29-kind="task"]:has-text("OVERDUE_ONE") .v29-status';
    await page.click(sel);
    await page.waitForTimeout(300);
    const a = await page.evaluate(() => ({ row: !!document.querySelector('.v29-row[data-v29-kind="task"]'), t: state.journal.find((t) => t.id === 'od1') }));
    const stillThere = await page.evaluate(() => [...document.querySelectorAll('.v29-row[data-v29-kind="task"]')].some((e) => e.textContent.includes('OVERDUE_ONE')));
    check(a.t.status === 'Готово' && stillThere, `a ticked overdue task stays visible until you leave the screen (${a.t.status}, visible=${stillThere})`);
    await page.click(sel);
    await page.waitForTimeout(300);
    const b = await page.evaluate(() => state.journal.find((t) => t.id === 'od1'));
    check(b.status === 'В работе' && !('prevStatus' in b), `unticking restores «В работе», not «Не начато» (${b.status})`);
  });

  await step('workout recognition by word', async () => {
    const r = await page.evaluate(() => Object.fromEntries(['Тренировка', 'Зал', 'Тренажёрный зал', 'Спортзал', 'Спорт', 'Паспорт', 'Залог', 'Сказал', 'Читать'].map((n) => [n, STACK_DATA.isWorkoutName(n)])));
    const ok = r['Тренировка'] && r['Зал'] && r['Тренажёрный зал'] && r['Спортзал'] && r['Спорт'] && !r['Паспорт'] && !r['Залог'] && !r['Сказал'] && !r['Читать'];
    check(ok, `workout names match by word, not by substring (${Object.entries(r).filter(([, v]) => v).map(([k]) => k).join(', ')})`);
    await addTask('Продлить паспорт', 'Не начато', 0, 'pass1');
    await page.evaluate(() => { state.processes[1].name = 'Залог'; save(); });
    await refresh();
    const m = await page.evaluate(() => { const row = [...document.querySelectorAll('.v29-row')].find((e) => e.textContent.includes('Продлить паспорт')); const pr = [...document.querySelectorAll('.v29-row[data-v29-kind="process"]')].find((e) => e.textContent.includes('Залог')); return { taskRoute: row?.dataset.v29Route, taskGlyph: !!row?.querySelector('.v29-workout-glyph'), procRoute: pr?.dataset.v29Route }; });
    check(m.taskRoute === 'deals' && !m.taskGlyph && m.procRoute === 'deals', `«Продлить паспорт» / «Залог» are not routed to Fitness (${JSON.stringify(m)})`);
    await page.evaluate(() => { state.processes[1].name = ''; save(); });
  });

  await step('one render per status tap', async () => {
    await refresh();
    const n = await page.evaluate(async () => {
      let c = 0; const mo = new MutationObserver(() => { c++; }); mo.observe(document.getElementById('stackV29Root'), { childList: true, subtree: true });
      document.querySelector('.v29-row[data-v29-kind="process"] .v29-status').click();
      await new Promise((r) => setTimeout(r, 500)); mo.disconnect(); return c;
    });
    check(n === 1, `a status tap redraws «Сегодня» once (${n} render batch${n === 1 ? '' : 'es'})`);
  });

  await step('refresh on resume', async () => {
    await page.evaluate(() => { state.processes[2].name = 'RESUME_NAME'; });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(250);
    check(await page.evaluate(() => document.querySelector('#stackV29Root').textContent.includes('RESUME_NAME')), '«Сегодня» redraws when the app comes back to the foreground');
    await page.evaluate(() => { state.processes[2].name = ''; save(); });
  });

  await step('tap targets', async () => {
    await refresh();
    const t = await page.evaluate(() => { const r = document.querySelector('.v29-status').getBoundingClientRect(), o = document.querySelector('.v29-open').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), oh: Math.round(o.height) }; });
    check(t.w >= 44 && t.h >= 44 && t.oh >= 44, `status button and row title are at least 44px (${JSON.stringify(t)})`);
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), 'no horizontal overflow with overdue rows');
  });

  await step('mark rules have one implementation', async () => {
    const r = await page.evaluate(() => ({
      chain: ['', '✓', '○', '—'].map((v) => cycle(v)).join('|'),
      legacy: cycle('◐'),
      valid: validMark('◐') && validMark('✓') && validMark('○') && validMark('—') && validMark('') && !validMark('x'),
      rate: activeCompletion(['✓', '○', '—', '']).rate,
      half: activeCompletion(['✓', '◐']).rate,
      none: activeCompletion(['—', '—', '']).rate,
      arrow: !/=>/.test(cycle.toString().slice(0, 12)),
    }));
    check(r.chain === '✓|○|—|' && r.legacy === '○', `the documented cycle ✓ → ○ → — → empty is the only one (${r.chain}, ◐→${r.legacy})`);
    check(r.valid && r.rate === 0.5 && r.none === null && r.half === 0.75, `✓/(✓+○) with — and empty ignored, all-«—» day has no percent; legacy ◐ still counts half (${r.rate}, ${r.none}, ${r.half})`);
    const kept = await page.evaluate(() => { const mi = dateToMonthIndex(new Date()), d = new Date().getDate() - 1; state.months[mi][0][d] = '◐'; save(); STACK_V29_SHELL.refresh(); return { mi, d }; });
    await page.waitForTimeout(250);
    const shown = await page.evaluate(() => document.querySelector('.v29-row[data-v29-kind="process"][data-v29-index="0"] .v29-status')?.dataset.mark);
    await page.click('.v29-row[data-v29-kind="process"][data-v29-index="0"] .v29-status');
    await page.waitForTimeout(250);
    const after = await page.evaluate((k) => state.months[k.mi][0][k.d], kept);
    check(shown === '◐' && after === '○', `an old ◐ mark is kept, shown, and moves on to ○ on tap (${shown} → ${after})`);
  });

  await step('legacy leftovers stay removed', async () => {
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '..', 'stack-v29-shell.js'), 'utf8');
    check(!/MutationObserver/.test(src), 'the v29 shell watches no DOM mutations (no text-matching hide-by-observer on document.body)');
    const m = await page.evaluate(() => ({ legacyToday: !!document.getElementById('screenToday') || !!document.getElementById('todayList') || typeof renderTodayScreen !== 'undefined', legacyNav: !!document.getElementById('mobileNav') }));
    check(!m.legacyToday && !m.legacyNav, `no legacy «Сегодня» screen / renderer and no legacy bottom nav (${JSON.stringify(m)})`);
    await page.click('.v29-nav [data-v29-nav="deals"]');
    await page.waitForTimeout(500);
    const labels = await page.evaluate(() => [...document.querySelectorAll('#screenTasks button')].map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()).filter((t) => t === 'все процессы' || t === 'все задачи' || /(новая|добавить|создать)\s+задач/.test(t)));
    check(labels.length === 0, `Дела has no duplicate «Все задачи / Все процессы / Новая задача» buttons (${labels.join(', ') || 'none'})`);
    await page.click('.v29-nav [data-v29-nav="today"]');
    await page.waitForTimeout(300);
  });

  await step('nutrition guard rails', async () => {
    const r = await page.evaluate(() => {
      const t = (goal, profile) => STACK_DATA.nutritionTargets({ goal, profile });
      return {
        normal: t({ start: 90, target: 80 }, { height: 180, age: 30, sex: 'male', days: 3 }),
        under: t({ start: 48, target: 44 }, { height: 170, age: 25, sex: 'female', days: 3 }),
        belowBmi: t({ start: 70, target: 50 }, { height: 175, age: 30, sex: 'male', days: 3 }),
        teen: t({ start: 55, target: 50 }, { height: 165, age: 15, sex: 'male', days: 4 }),
        child: t({ start: 20, target: 15 }, { height: 110, age: 5, sex: 'male', days: 3 }),
      };
    });
    check(r.normal && !r.normal.warning && r.normal.kcal > 1500, `an ordinary loss goal is calculated as before (${r.normal?.kcal} ккал)`);
    check(r.under?.warning && r.under.kcal >= 1700, `no deficit for BMI < 18.5 (${JSON.stringify(r.under)})`);
    check(r.belowBmi?.warning && r.belowBmi.kcal >= 2000, `no deficit for a goal weight with BMI < 18.5 (${r.belowBmi?.kcal})`);
    check(r.teen?.warning && r.child === null, `minors get maintenance only, implausible input gets nothing (${r.teen?.warning ? 'note' : 'no note'}, child=${r.child})`);
  });

  await ctx.close();
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

    // v29.84: the old wide layout must not appear on touch devices either — a tablet and a phone turned to landscape get the same
    // phone-width frame; a phone in portrait runs the app directly; rotating a running phone moves it into the frame.
    for (const [label, w, h] of [['phone landscape 844×390', 844, 390], ['tablet 820×1180', 820, 1180]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      await c.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
      const p = await c.newPage();
      p.on('pageerror', (e) => jsErrors.push(`[${label}] ` + e.message));
      await p.goto(`${baseUrl}/index.html`, { waitUntil: 'commit', timeout: 20000 });
      await p.waitForTimeout(2500);
      const f = p.frames().find((x) => /[?&]frame=1/.test(x.url()));
      const parentApp = await p.evaluate(() => typeof state !== 'undefined');
      const ok = f ? await f.evaluate(() => innerWidth <= 720 && !!document.querySelector('.v29-nav') && !document.querySelector('.today-screen.active')) : false;
      if (ok && !parentApp) note(`  scenario OK: ${label} shows the phone-width app, not the old wide layout`); else fail(`scenario: ${label} (frame=${!!f}, frameOk=${ok}, parentRunsApp=${parentApp})`);
      await c.close();
    }
    {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      await c.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
      const p = await c.newPage();
      p.on('pageerror', (e) => jsErrors.push('[rotation] ' + e.message));
      await p.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await p.waitForSelector('.v29-nav', { timeout: 15000 });
      const direct = p.frames().length === 1;
      await p.setViewportSize({ width: 844, height: 390 });
      await p.waitForTimeout(3500);
      const f = p.frames().find((x) => /[?&]frame=1/.test(x.url()));
      const ok = f ? await f.evaluate(() => innerWidth <= 720 && !!document.querySelector('.v29-nav')) : false;
      if (direct && ok) note('  scenario OK: a phone in portrait runs the app directly; turning it to landscape moves it into the phone-width frame'); else fail(`scenario: rotation (direct=${direct}, framed=${ok})`);
      await c.close();
    }

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

    // Calendar window (v29.78): it used to end in Jul 2027 — from 1 Aug 2027 no mark could be saved, silently.
    // Opens the app on later dates with a stored 12-month state and checks the window grows by appending only.
    const MD = [['Август', 2026, 7, 31], ['Сентябрь', 2026, 8, 30], ['Октябрь', 2026, 9, 31], ['Ноябрь', 2026, 10, 30], ['Декабрь', 2026, 11, 31], ['Январь', 2027, 0, 31], ['Февраль', 2027, 1, 28], ['Март', 2027, 2, 31], ['Апрель', 2027, 3, 30], ['Май', 2027, 4, 31], ['Июнь', 2027, 5, 30], ['Июль', 2027, 6, 31], ['Август', 2027, 7, 31], ['Сентябрь', 2027, 8, 30], ['Октябрь', 2027, 9, 31], ['Ноябрь', 2027, 10, 30]];
    const seedState = (n) => {
      const procs = ['Тренировка', 'Чтение'].map((name) => ({ name, goal: 0.8, color: '#0877f3', schedule: [1, 1, 1, 1, 1, 1, 1], scheduleType: 'daily', monthDay: 1, lastDay: false }));
      const marks = ['✓', '○', '—', ''];
      return { goal: 0.8, currentMonth: 11, processes: procs, months: MD.slice(0, n).map((m, mi) => procs.map((_, pi) => Array.from({ length: m[3] }, (_, d) => marks[(mi + pi + d) % 4]))), journal: [], savings: { currency: 'RUB', selectedId: null, goals: [] } };
    };
    const old12 = JSON.stringify(seedState(12).months);
    const openAt = async (iso, months) => {
      const c = await browser.newContext({ viewport: { width: args.width, height: args.height }, isMobile: true, hasTouch: true, serviceWorkers: 'block', timezoneId: 'Europe/Moscow' });
      await c.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
      await c.clock.setFixedTime(new Date(iso));
      await c.addInitScript((s) => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); localStorage.setItem('stack_neon_mix9_calendar_v1', JSON.stringify(s)); } }, seedState(months));
      const p = await c.newPage();
      p.on('pageerror', (e) => jsErrors.push('[calendar] ' + e.message));
      await p.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await p.waitForSelector('.v29-nav', { timeout: 15000 });
      await p.waitForTimeout(1200);
      return { c, p };
    };
    {
      const { c, p } = await openAt('2027-08-15T12:00:00', 12);
      const a = await p.evaluate(() => ({ len: MONTHS.length, idx: dateToMonthIndex(new Date()), stateLen: state.months.length, first12: JSON.stringify(state.months.slice(0, 12)) }));
      const okAug = a.len >= 16 && a.idx === 12 && a.stateLen === a.len && a.first12 === old12;
      if (okAug) note(`  scenario OK: Aug 2027 — window extended to ${a.len} months, the 12 old months byte-identical`); else fail(`scenario: Aug 2027 calendar (${JSON.stringify({ len: a.len, idx: a.idx, stateLen: a.stateLen, old12Same: a.first12 === old12 })})`);
      await p.click('.v29-nav [data-v29-nav="today"]');
      await p.waitForTimeout(300);
      await p.click('.v29-row[data-v29-index="0"] .v29-status');
      await p.waitForTimeout(300);
      const m = await p.evaluate(() => ({ live: state.months[12][0][14], stored: JSON.parse(localStorage.getItem('stack_neon_mix9_calendar_v1')).months[12][0][14] }));
      if (m.live === '✓' && m.stored === '✓') note('  scenario OK: Today status is recorded and saved in Aug 2027'); else fail(`scenario: no mark recorded in Aug 2027 (${JSON.stringify(m)})`);
      const ch = await p.evaluate(() => {
        const ix = chartMonths(); renderChart(); openProcessDetail(0);
        const lab = (sel) => [...document.querySelectorAll(sel + ' text.axis')].filter((t) => /[А-Яа-я]{3}/.test(t.textContent)).length;
        const r = { first: ix[0], last: ix[11], year: lab('#chart'), proc: lab('#detailChart') };
        document.getElementById('processDetailModal').classList.remove('active');
        return r;
      });
      if (ch.first === 1 && ch.last === 12 && ch.year === 12 && ch.proc === 12) note('  scenario OK: year charts show the 12 months ending Aug 2027'); else fail(`scenario: year charts at Aug 2027 (${JSON.stringify(ch)})`);
      for (const section of SECTIONS) {
        await p.click(`.v29-nav [data-v29-nav="${section}"]`);
        await p.waitForTimeout(350);
        if (await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) fail(`horizontal overflow on ${section} in Aug 2027`);
      }
      await c.close();
    }
    {
      const { c, p } = await openAt('2028-02-29T12:00:00', 12);
      const l = await p.evaluate(() => { const k = dateToMonthIndex(new Date()); return { name: MONTHS[k][0], days: MONTHS[k][3], marks: state.months[k][0].length }; });
      if (l.name === 'Февраль 2028' && l.days === 29 && l.marks === 29) note('  scenario OK: Feb 2028 has 29 days'); else fail(`scenario: leap day (${JSON.stringify(l)})`);
      await c.close();
    }
    {
      const { c, p } = await openAt('2026-10-04T12:00:00', 16);
      const r = await p.evaluate(() => ({ len: state.months.length, months: MONTHS.length }));
      if (r.len === 16 && r.months === 16) note('  scenario OK: a stored 16-month state is never truncated, even on an earlier date'); else fail(`scenario: 16-month state truncated (${JSON.stringify(r)})`);
      await c.close();
    }
    {
      const { c, p } = await openAt('2026-10-04T12:00:00', 12);
      const r = await p.evaluate(() => ({ len: MONTHS.length, state: state.months.length }));
      if (r.len === 12 && r.state === 12) note('  scenario OK: today the window is still exactly 12 months (nothing appended)'); else fail(`scenario: window changed without need (${JSON.stringify(r)})`);
      await c.close();
    }

    await runCrudScenarios(browser, baseUrl, args, note, fail, jsErrors);
    await runProgramScenarios(browser, baseUrl, args, note, fail, jsErrors);
    await runDataScenarios(browser, baseUrl, args, note, fail, jsErrors);
    await runTodayScenarios(browser, baseUrl, args, note, fail, jsErrors);

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
