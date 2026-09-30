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
  check(fitnessOn === 'done', `Fitness shows the Today mark (${fitnessOn})`);

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
