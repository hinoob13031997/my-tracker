#!/usr/bin/env node
/* Renders icon.svg into the PNG icons the PWA needs (iOS ignores SVG for apple-touch-icon, installers want 192/512 PNG).
 *   node scripts/make-icons.js        (needs Playwright + Chromium, like stack-verify.js)
 * Writes: icon-192.png, icon-512.png (rounded, transparent corners), icon-maskable-512.png (full-bleed, art inside the safe zone),
 *         apple-touch-icon.png (180px, full-bleed square: iOS applies its own mask and fills transparency with black). */
'use strict';
const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
    try {
      return require('/opt/node22/lib/node_modules/playwright');
    } catch (e2) {
      console.error('Playwright not found (npm i -D playwright, or set NODE_PATH).');
      process.exit(1);
    }
  }
}

const root = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8');
const art = (svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/) || [])[1] || '';
const defs = (art.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
const rounded = art.replace(/<defs>[\s\S]*?<\/defs>/, '');
const square = rounded.replace(/ rx="\d+"/, '');
const inner = square.replace(/<rect[^>]*\/>/, '');
const BG = '#030914';

const wrap = (size, body) =>
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>` +
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${defs}${body}</svg>`;

const JOBS = [
  ['icon-192.png', 192, rounded],
  ['icon-512.png', 512, rounded],
  ['apple-touch-icon.png', 180, square],
  /* maskable: solid full-bleed background, art scaled to 68% so any mask (circle, squircle) keeps it whole */
  [
    'icon-maskable-512.png',
    512,
    `<rect width="512" height="512" fill="${BG}"/><g transform="translate(256 256) scale(.68) translate(-256 -256)">${inner}</g>`,
  ],
];

(async () => {
  const { chromium } = loadPlaywright();
  const exe = ['/opt/pw-browsers/chromium', process.env.PLAYWRIGHT_CHROMIUM_PATH].find(p => p && fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [file, size, body] of JOBS) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(wrap(size, body));
    await page.screenshot({
      path: path.join(root, file),
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });
    console.log('wrote', file, size + 'px');
  }
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
