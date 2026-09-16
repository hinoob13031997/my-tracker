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
