#!/usr/bin/env node
/* STACK lint — real-bug rules only (undefined names, const reassignment, duplicate keys, unreachable code, NaN compares, bad typeof …),
 * no style opinions. The app is classic scripts sharing one global scope, so the set of known globals is collected from the code itself:
 * top-level declarations of the inline script in index.html, every element id (the legacy code uses them as bare names), window.X / globalThis.X
 * assignments and defineProperty(globalThis,'X'). A name used in one file but defined nowhere is exactly the bug class this catches.
 *   node scripts/stack-lint.js          (needs eslint; NODE_PATH or a local install, like stack-verify.js needs Playwright) */
'use strict';
const fs = require('fs');
const path = require('path');

function load(name) {
  try {
    return require(name);
  } catch (e) {
    for (const base of ['/opt/node22/lib/node_modules', '/opt/node-tools/node_modules']) {
      try {
        return require(path.join(base, name));
      } catch (e2) {
        /* next */
      }
    }
    console.error(`Cannot load "${name}". Install it (npm i -D ${name}) or set NODE_PATH.`);
    process.exit(1);
  }
}
const { ESLint } = load('eslint');
const espree = load('espree');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(m => m[1])
  .filter(s => s.trim().length > 200);
const jsFiles = fs
  .readdirSync(root)
  .filter(f => f.endsWith('.js'))
  .concat(
    fs
      .readdirSync(path.join(root, 'scripts'))
      .map(f => 'scripts/' + f)
      .filter(f => f.endsWith('.js'))
  );

const BROWSER =
  `window document navigator localStorage sessionStorage location history console setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame
queueMicrotask structuredClone fetch caches indexedDB IDBKeyRange IDBObjectStore self globalThis URL URLSearchParams Blob File FileReader FormData CustomEvent Event KeyboardEvent MouseEvent
PointerEvent MutationObserver ResizeObserver IntersectionObserver matchMedia getComputedStyle Intl Response Request Headers performance alert confirm prompt innerWidth innerHeight screen
devicePixelRatio scrollTo scrollBy getSelection addEventListener removeEventListener dispatchEvent postMessage open close stop focus blur top parent frames DOMException Notification crypto atob btoa DOMParser XMLSerializer Image HTMLElement Node Element SVGElement Storage IDBDatabase CSS TextEncoder TextDecoder AbortController Audio Promise Symbol Map Set WeakSet WeakMap Proxy Reflect`.split(
    /\s+/
  );
const SW = 'clients registration skipWaiting addEventListener importScripts ExtendableEvent FetchEvent'.split(' ');
const NODE = 'require module process __dirname __filename Buffer exports'.split(' ');

/* names declared at the top level of the inline script(s) */
function topLevelNames(code) {
  const names = new Set();
  let ast;
  try {
    ast = espree.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch (e) {
    console.error('index.html inline script does not parse:', e.message);
    process.exit(1);
  }
  const fromPattern = p => {
    if (!p) return;
    if (p.type === 'Identifier') names.add(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach(x => fromPattern(x.value || x.argument));
    else if (p.type === 'ArrayPattern') p.elements.forEach(fromPattern);
    else if (p.type === 'AssignmentPattern') fromPattern(p.left);
    else if (p.type === 'RestElement') fromPattern(p.argument);
  };
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') names.add(n.id.name);
    else if (n.type === 'VariableDeclaration') n.declarations.forEach(d => fromPattern(d.id));
  }
  return names;
}

const known = new Set();
inlineScripts.forEach(s => topLevelNames(s).forEach(n => known.add(n)));
for (const m of html.matchAll(/\bid="([A-Za-z_$][\w$]*)"/g)) known.add(m[1]);
for (const f of jsFiles) {
  const text = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of text.matchAll(/(?:window|globalThis|self)\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) known.add(m[1]);
  for (const m of text.matchAll(/defineProperty\(\s*(?:globalThis|window)\s*,\s*['"]([A-Za-z_$][\w$]*)['"]/g))
    known.add(m[1]);
}
const toGlobals = list => Object.fromEntries(list.map(n => [n, 'writable']));

const RULES = {
  'no-undef': 'error',
  'no-const-assign': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-dupe-else-if': 'error',
  'no-duplicate-case': 'error',
  'no-unreachable': 'error',
  'no-self-assign': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'no-unsafe-negation': 'error',
  'no-sparse-arrays': 'error',
  'no-empty-character-class': 'error',
  'no-invalid-regexp': 'error',
  'no-unsafe-finally': 'error',
  'no-cond-assign': ['error', 'except-parens'],
  'no-compare-neg-zero': 'error',
  'no-loss-of-precision': 'error',
  'no-unused-labels': 'error',
  'no-inner-declarations': 'off',
  'no-redeclare': ['error', { builtinGlobals: false }],
};
const base = {
  languageOptions: { ecmaVersion: 'latest', sourceType: 'script' },
  rules: RULES,
  linterOptions: { reportUnusedDisableDirectives: false },
};
const config = [
  {
    ...base,
    files: ['**/*.js'],
    languageOptions: { ...base.languageOptions, globals: { ...toGlobals(BROWSER), ...toGlobals([...known]) } },
  },
  { files: ['sw.js'], languageOptions: { sourceType: 'script', globals: toGlobals(SW) } },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: toGlobals(NODE) },
    rules: { 'no-undef': 'error' },
  },
];

(async () => {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });
  const results = [];
  for (const f of jsFiles) results.push(...(await eslint.lintFiles([f])));
  for (let i = 0; i < inlineScripts.length; i++)
    results.push(
      ...(await eslint.lintText(inlineScripts[i], {
        filePath: path.join(root, i === 0 ? 'index.html.inline-0.js' : `index.html.inline-${i}.js`),
      }))
    );
  const formatter = await eslint.loadFormatter('stylish');
  const problems = results.reduce((n, r) => n + r.errorCount + r.warningCount, 0);
  const text = formatter.format(results.filter(r => r.errorCount + r.warningCount > 0));
  if (problems) {
    console.log(text);
    console.log(`${problems} problem(s) in ${results.filter(r => r.errorCount + r.warningCount).length} file(s)`);
    process.exit(1);
  }
  console.log(
    `lint OK: ${jsFiles.length} files + ${inlineScripts.length} inline script(s), ${known.size} shared globals, ${Object.keys(RULES).length} rules`
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
