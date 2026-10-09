#!/usr/bin/env node
/* One command for the release ritual CLAUDE.md asks for after every change of live JS:
 *   node scripts/bump-version.js 29.86 short-name
 * sets, in one go, everything that has to move together:
 *   sw.js                 BUILD = '29.86.0',  CACHE = 'stack-v29-86-short-name'
 *   stack-persistence.js  VERSION = 'v29.86'  (the label shown in the app)
 *   stack-v29-shell.js    BUILD = '29.86.0'
 *   index.html            ?build=29.86.0 on the v29 script tags (the baked-in copy of sw.js V29_HEAD)
 * `node scripts/stack-verify.js` fails when these drift apart, so a forgotten spot cannot reach main. */
'use strict';
const fs = require('fs');
const path = require('path');

const [version, name] = process.argv.slice(2);
if (!/^\d+\.\d+$/.test(version || '') || !/^[a-z0-9-]+$/.test(name || '')) {
  console.error('usage: node scripts/bump-version.js <major.minor, e.g. 29.86> <short-name, lowercase-and-dashes>');
  process.exit(1);
}
const root = path.resolve(__dirname, '..');
const build = `${version}.0`;
const cache = `stack-v${version.replace('.', '-')}-${name}`;

function edit(file, pairs) {
  const full = path.join(root, file);
  let text = fs.readFileSync(full, 'utf8');
  for (const [re, to, label] of pairs) {
    if (!re.test(text)) { console.error(`${file}: «${label}» not found`); process.exit(1); }
    text = text.replace(re, to);
  }
  fs.writeFileSync(full, text);
  console.log('updated', file);
}

edit('sw.js', [
  [/const BUILD='[\d.]+';/, `const BUILD='${build}';`, 'BUILD'],
  [/const CACHE='[^']+';/, `const CACHE='${cache}';`, 'CACHE'],
]);
edit('stack-persistence.js', [[/const VERSION='v[\d.]+';/, `const VERSION='v${version}';`, 'VERSION']]);
edit('stack-v29-shell.js', [[/^const BUILD='[\d.]+';/m, `const BUILD='${build}';`, 'BUILD']]);
edit('index.html', [[/(stack-v29-[a-z-]+\.js\?build=)[\d.]+/g, `$1${build}`, 'v29 ?build=']]);
console.log(`now ${build} / ${cache}`);
