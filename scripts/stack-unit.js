#!/usr/bin/env node
/* STACK unit tests for the data layer — no browser, no dependencies, runs in a second.
 *   node scripts/stack-unit.js
 * The inline script of index.html (state, migrations, validation, marks, schedule) and stack-data.js are loaded into an
 * isolated Node VM against a permissive DOM stub, so the real functions are tested, not copies. UI behaviour stays in
 * scripts/stack-verify.js (Playwright). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

/* A DOM that accepts anything: property reads give another stub, calls give a stub, iteration is empty. */
function anything() {
  const store = Object.create(null);
  return new Proxy(function () {}, {
    get(_t, key) {
      if (key in store) return store[key];
      if (key === Symbol.toPrimitive) return () => '';
      if (key === Symbol.iterator) return function* () {};
      if (key === 'length') return 0;
      if (key === 'then') return undefined;
      return anything();
    },
    set(_t, key, value) { store[key] = value; return true; },
    apply() { return anything(); },
    construct() { return anything(); },
  });
}

function makeStorage(failWrites = () => false) {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { if (failWrites(String(k))) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
    _map: map,
  };
}

/* A fresh app instance: inline script of index.html + stack-data.js, over its own storage. */
function boot({ failWrites, seed } = {}) {
  const localStorage = makeStorage(failWrites);
  if (seed) for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  const events = [];
  const win = {
    localStorage, sessionStorage: makeStorage(), document: anything(), navigator: {}, innerWidth: 390, innerHeight: 844,
    console: { log() {}, info() {}, warn() {}, error() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    indexedDB: { open: () => ({}) },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener() {}, dispatchEvent(e) { events.push(e.type); }, removeEventListener() {},
    setTimeout, clearTimeout, setInterval() { return 0; }, clearInterval() {}, requestAnimationFrame() { return 0; },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, Blob: class {}, FileReader: class {}, structuredClone,
    getComputedStyle: () => anything(), alert() {}, confirm: () => true, location: { search: '', pathname: '/', hash: '', reload() {} },
  };
  win.window = win; win.self = win; win.globalThis = win;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  /* browsers expose every element id as a global (savCurrency.onchange = …): give each one a stub */
  for (const m of html.matchAll(/\bid="([A-Za-z_$][\w$]*)"/g)) if (!(m[1] in win)) win[m[1]] = anything();
  const ctx = vm.createContext(win);
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('const KEY='));
  assert(inline, 'inline app script not found in index.html');
  vm.runInContext(inline, ctx, { filename: 'index.html (inline)' });
  vm.runInContext(fs.readFileSync(path.join(root, 'stack-data.js'), 'utf8'), ctx, { filename: 'stack-data.js' });
  /* values born inside the VM belong to another realm (their Array.prototype differs): hand out plain copies so deepStrictEqual compares data */
  const plain = (v) => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);
  const get = (code) => plain(vm.runInContext(code, ctx));
  const D = {};
  for (const [k, v] of Object.entries(win.STACK_DATA || {})) D[k] = typeof v === 'function' ? (...a) => plain(v(...a)) : v; // STACK_DATA is frozen: a plain wrapper, not a Proxy
  return { ctx, get, localStorage, events, D };
}

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; failures.push(name); console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').join('\n       ')); }
}

const KEY = 'stack_neon_mix9_calendar_v1';
const day = (y, m, d) => new Date(y, m - 1, d, 12);

console.log('marks');
{
  const { get } = boot();
  test('cycle is ✓ → ○ → — → empty; the legacy ◐ moves on to ○', () => {
    assert.deepStrictEqual(['', '✓', '○', '—'].map((v) => get(`cycle(${JSON.stringify(v)})`)), ['✓', '○', '—', '']);
    assert.strictEqual(get("cycle('◐')"), '○');
  });
  test('validMark accepts the four marks and the legacy ◐, nothing else', () => {
    for (const v of ['', '✓', '○', '—', '◐']) assert.strictEqual(get(`validMark(${JSON.stringify(v)})`), true, v);
    for (const v of ['x', '✔', 'null', '1']) assert.strictEqual(get(`validMark(${JSON.stringify(v)})`), false, v);
    assert.strictEqual(get('validMark(null)'), false);
    assert.strictEqual(get('validMark(undefined)'), false);
  });
  test('completion is ✓/(✓+○); — and empty do not count; all-— has no percent', () => {
    assert.strictEqual(get("activeCompletion(['✓','○','—',''])").rate, 0.5);
    assert.strictEqual(get("activeCompletion(['✓','✓','○'])").done, 2);
    assert.strictEqual(get("activeCompletion(['—','—',''])").rate, null);
    assert.strictEqual(get("activeCompletion([])").rate, null);
  });
  test('legacy ◐ counts half so old history keeps its percentage', () => {
    assert.strictEqual(get("activeCompletion(['✓','◐'])").rate, 0.75);
  });
}

console.log('load / migrate / import');
{
  const { get } = boot();
  const task = (i, note = '') => ({ date: '2026-10-04', task: 'task ' + i, due: '', priority: 'Средний', status: 'Не начато', note });
  test('a fresh state has 5 processes and the first month', () => {
    assert.strictEqual(get('state.processes.length'), 5);
    assert.strictEqual(get('state.months[0].length'), 5);
    assert.strictEqual(get('MONTHS[0][0]'), 'Август 2026');
  });
  test('migrate keeps 1100+ tasks (the newest are not cut) and long notes', () => {
    const x = JSON.parse(get('JSON.stringify(fresh())'));
    x.journal = Array.from({ length: 1500 }, (_, i) => task(i, 'n'.repeat(700)));
    const out = get(`migrateStoredState(${JSON.stringify(x)})`);
    assert.strictEqual(out.journal.length, 1500);
    assert.strictEqual(out.journal[1499].task, 'task 1499');
    assert.strictEqual(out.journal[1499].note.length, 700);
  });
  test('migrate keeps _meta (revision) and the legacy ◐ mark, drops junk marks', () => {
    const x = JSON.parse(get('JSON.stringify(fresh())'));
    x._meta = { revision: 41, updatedAt: '2026-10-01T00:00:00.000Z' };
    x.months[0][0][0] = '◐'; x.months[0][0][1] = '✓'; x.months[0][0][2] = 'junk';
    const out = get(`migrateStoredState(${JSON.stringify(x)})`);
    assert.strictEqual(out._meta.revision, 41);
    assert.deepStrictEqual(out.months[0][0].slice(0, 3), ['◐', '✓', '']);
  });
  test('migrate never truncates a longer calendar and extends MONTHS to hold it', () => {
    const x = JSON.parse(get('JSON.stringify(fresh())'));
    const have = get('MONTHS.length');
    while (x.months.length < have + 4) x.months.push(x.months[0].map((r) => r.map(() => '')));
    x.months[have + 3] = x.months[0].map((r) => r.map(() => ''));
    const out = get(`migrateStoredState(${JSON.stringify(x)})`);
    assert.ok(out.months.length >= have + 4);
  });
  test('validateImportedState rejects non-states and keeps task status memory (prevStatus)', () => {
    assert.throws(() => get('validateImportedState({})'));
    assert.throws(() => get('validateImportedState(null)'));
    const x = JSON.parse(get('JSON.stringify(fresh())'));
    x.journal = [{ task: 'a', status: 'Готово', prevStatus: 'В работе', date: '2026-10-01', due: '' }, { task: 'b', status: 'Готово', prevStatus: 'Готово', date: '', due: '' }];
    const out = get(`validateImportedState(${JSON.stringify(x)})`);
    assert.strictEqual(out.journal[0].prevStatus, 'В работе');
    assert.ok(!('prevStatus' in out.journal[1]), 'only a real earlier status is kept');
  });
  test('validateImportedState bounds: 120-char names, colour fallback, status whitelist', () => {
    const x = JSON.parse(get('JSON.stringify(fresh())'));
    x.processes[0].name = 'я'.repeat(300); x.processes[0].color = 'red'; x.journal = [{ task: 't', status: 'weird', priority: 'x', date: '', due: '' }];
    const out = get(`validateImportedState(${JSON.stringify(x)})`);
    assert.strictEqual(out.processes[0].name.length, 120);
    assert.ok(/^#[0-9a-f]{6}$/i.test(out.processes[0].color));
    assert.strictEqual(out.journal[0].status, 'Не начато');
    assert.strictEqual(out.journal[0].priority, 'Средний');
  });
}

console.log('save');
{
  test('save() returns true and bumps the revision on every write', () => {
    const { get, localStorage } = boot();
    const r1 = get('save()'), a = get('state._meta.revision'), r2 = get('save()'), b = get('state._meta.revision');
    assert.strictEqual(r1, true); assert.strictEqual(r2, true); assert.strictEqual(b, a + 1);
    assert.ok(JSON.parse(localStorage.getItem(KEY))._meta.revision === b);
  });
  test('save() returns false when the main key cannot be written', () => {
    const { get } = boot({ failWrites: (k) => k === KEY });
    assert.strictEqual(get('save()'), false);
  });
  test('the revision survives a reload of the stored state', () => {
    const first = boot();
    first.get('save()'); first.get('save()');
    const rev = first.get('state._meta.revision');
    const second = boot({ seed: { [KEY]: first.localStorage.getItem(KEY) } });
    assert.strictEqual(second.get('state._meta.revision'), rev);
  });
  test('a corrupt stored state does not crash loading', () => {
    const { get } = boot({ seed: { [KEY]: '{broken' } });
    assert.strictEqual(get('state.processes.length'), 5);
  });
}

console.log('calendar & schedule');
{
  const { get } = boot();
  test('dateToMonthIndex: index 0 is August 2026, MONTHS only grows at the end', () => {
    assert.strictEqual(get('dateToMonthIndex(new Date(2026, 7, 15))'), 0);
    assert.strictEqual(get('dateToMonthIndex(new Date(2026, 9, 2))'), 2);
    assert.strictEqual(get('dateToMonthIndex(new Date(2020, 0, 1))'), -1);
    const before = get('MONTHS.map(m=>m[0]).join()');
    get('extendMonthsTo(MONTHS.length+30)');
    assert.ok(get('MONTHS.map(m=>m[0]).join()').startsWith(before));
    assert.strictEqual(get('MONTHS[17][0]'), 'Январь 2028');
    assert.strictEqual(get('MONTHS[18][3]'), 29, 'February 2028 has 29 days');
  });
  test('isScheduledOnDate: daily / weekdays / weekly / monthly / last day', () => {
    const set = (p) => get(`Object.assign(state.processes[0],${JSON.stringify(p)})`);
    const on = (d) => get(`isScheduledOnDate(0,new Date(${d.getFullYear()},${d.getMonth()},${d.getDate()},12))`);
    set({ scheduleType: 'daily' });
    assert.strictEqual(on(day(2026, 10, 3)), true);
    set({ scheduleType: 'weekdays', schedule: [1, 1, 1, 1, 1, 0, 0] });
    assert.strictEqual(on(day(2026, 10, 2)), true, 'Friday');
    assert.strictEqual(on(day(2026, 10, 3)), false, 'Saturday');
    set({ scheduleType: 'monthly', lastDay: false, monthDay: 31 });
    assert.strictEqual(on(day(2026, 11, 30)), true, 'day 31 falls back to the last day of a 30-day month');
    assert.strictEqual(on(day(2026, 11, 29)), false);
    set({ scheduleType: 'monthly', lastDay: true });
    assert.strictEqual(on(day(2028, 2, 29)), true);
    assert.strictEqual(on(day(2028, 2, 28)), false);
  });
}

console.log('stack-data.js');
{
  const { D, localStorage, events } = boot();
  const prog = (y, m, d) => D.programPosition(day(y, m, d));
  test('isWorkoutName matches by word, not by substring', () => {
    for (const n of ['Тренировка', 'тренировки в зале', 'Зал', 'Тренажёрный зал', 'Спортзал', 'Спорт', 'Йога / спорт']) assert.strictEqual(D.isWorkoutName(n), true, n);
    for (const n of ['Паспорт', 'Залог', 'Сказал', 'Читать', '', null, undefined]) assert.strictEqual(D.isWorkoutName(n), false, String(n));
  });
  test('nutritionTargets: normal case, guard rails, implausible input', () => {
    const t = (goal, profile) => D.nutritionTargets({ goal, profile });
    const normal = t({ start: 90, target: 80 }, { height: 180, age: 30, sex: 'male', days: 3 });
    assert.ok(normal.kcal > 1500 && !normal.warning);
    assert.ok(normal.fat * 9 >= normal.kcal * 0.25 - 9, 'fat is at least 25% of calories');
    const under = t({ start: 48, target: 44 }, { height: 170, age: 25, sex: 'female', days: 3 });
    assert.ok(under.warning && under.kcal >= 1700, 'no deficit below BMI 18.5');
    assert.ok(t({ start: 55, target: 50 }, { height: 165, age: 15, sex: 'male', days: 4 }).warning, 'minors: maintenance only');
    assert.strictEqual(t({ start: 20, target: 15 }, { height: 110, age: 5, sex: 'male' }), null);
    assert.strictEqual(t({ start: 80 }, { height: 180, age: 30 }), null, 'no sex → no targets');
  });
  test('programPosition: year 1 = weeks 1–52, year 2 starts at week 9 without a second «Адаптация»', () => {
    assert.strictEqual(prog(2026, 8, 10).week, 1);
    assert.strictEqual(prog(2026, 8, 10).phase.name, 'Адаптация');
    assert.deepStrictEqual([prog(2027, 8, 8).year, prog(2027, 8, 8).week], [1, 52], 'the last day of year 1');
    const y2 = prog(2027, 8, 9);
    assert.deepStrictEqual([y2.year, y2.week, y2.phase.name], [2, 9, 'Рост объёма'], 'the next day starts year 2 at week 9');
    assert.deepStrictEqual([prog(2027, 8, 16).year, prog(2027, 8, 16).week], [2, 10]);
    assert.strictEqual(prog(2026, 1, 1).week, 1, 'dates before the start count as week 1');
  });
  test('programStart comes from the goal object and recomputes the position', () => {
    localStorage.setItem('stack_fitness_goal_v2318', JSON.stringify({ programStart: '2026-09-07' }));
    assert.strictEqual(prog(2026, 9, 14).week, 2);
    localStorage.setItem('stack_fitness_goal_v2318', JSON.stringify({ programStart: 'garbage' }));
    assert.strictEqual(prog(2026, 8, 17).week, 2, 'a bad start date falls back to the default');
  });
  test('hasData: a fresh or wiped state is empty, any user content is not', () => {
    assert.strictEqual(D.hasData({ processes: [{ name: '' }], months: [[[Array(31).fill('—')]]], journal: [], savings: { goals: [] } }), false);
    assert.strictEqual(D.hasData({ processes: [{ name: 'Бег' }], months: [], journal: [] }), true);
    assert.strictEqual(D.hasData({ processes: [{ name: '' }], months: [[['✓']]], journal: [] }), true);
    assert.strictEqual(D.hasData({ processes: [], months: [], journal: [{ task: 'x' }] }), true);
    assert.strictEqual(D.hasData(null), false);
  });
  test('backup reminder: nothing before 14 days, due after, reset by a download; never for empty data', () => {
    const d = boot();
    const hasData = () => d.localStorage.setItem(KEY, JSON.stringify({ processes: [{ name: 'Бег' }], months: [], journal: [{ task: 'x' }] }));
    hasData();
    const now = Date.now();
    d.localStorage.setItem('stack_backup_meta_v1', JSON.stringify({ since: new Date(now - 13 * 864e5).toISOString(), last: null }));
    assert.strictEqual(d.D.backupStatus(now).due, false);
    d.localStorage.setItem('stack_backup_meta_v1', JSON.stringify({ since: new Date(now - 15 * 864e5).toISOString(), last: null }));
    const due = d.D.backupStatus(now);
    assert.deepStrictEqual([due.due, due.days, due.everBackedUp], [true, 15, false]);
    d.D.touchBackupMeta(true);
    assert.strictEqual(d.D.backupStatus().due, false);
    assert.ok(d.events.includes('stack:backup-done'));
    d.localStorage.setItem(KEY, JSON.stringify({ processes: [{ name: '' }], months: [], journal: [] }));
    d.localStorage.setItem('stack_backup_meta_v1', JSON.stringify({ since: new Date(now - 90 * 864e5).toISOString(), last: null }));
    assert.strictEqual(d.D.backupStatus(now).due, false, 'no reminder for an empty state');
  });
  test('full backup: only well-formed stack_* keys travel; the main key, FX cache and backup meta stay out', () => {
    const d = boot();
    d.localStorage.setItem('stack_fitness_goal_v2318', '{"a":1}');
    d.localStorage.setItem('stack_fitness_workout_2026-10-02', '1');
    d.localStorage.setItem('stack_fx_cbr_v1', '{"rates":{}}');
    d.localStorage.setItem('stack_backup_meta_v1', '{}');
    d.localStorage.setItem('other_app_key', 'x');
    d.localStorage.setItem('Stack_Bad-Key!', 'x');
    const full = d.D.exportFull({ processes: [], months: [] });
    assert.strictEqual(full.format, 'stack-full-backup');
    assert.deepStrictEqual(Object.keys(full.storage).sort(), ['stack_fitness_goal_v2318', 'stack_fitness_workout_2026-10-02']);
    assert.strictEqual(d.D.isFullBackup(full), true);
    assert.strictEqual(d.D.isFullBackup({ processes: [], months: [] }), false, 'a bare legacy state is not a full backup');
  });
  test('importStorage rejects bad keys, non-JSON values and oversized workout marks', () => {
    const d = boot();
    const res = d.D.importStorage({
      stack_fitness_goal_v2318: '{"ok":true}', 'stack_fitness_workout_2026-10-02': '1', 'bad key': '{}', stack_json_broken: '{nope',
      'stack_fitness_workout_2026-10-03': 'x'.repeat(40), stack_neon_mix9_calendar_v1: '{}', stack_fx_cbr_v1: '{}', stack_not_a_string: 5,
    });
    assert.strictEqual(res.written, 2);
    assert.strictEqual(d.localStorage.getItem('stack_fitness_goal_v2318'), '{"ok":true}');
    assert.strictEqual(d.localStorage.getItem(KEY), null, 'the main key is written only by the caller after validation');
    assert.deepStrictEqual(res.skipped.sort(), ['bad key', 'stack_fitness_workout_2026-10-03', 'stack_fx_cbr_v1', 'stack_json_broken', 'stack_neon_mix9_calendar_v1', 'stack_not_a_string']);
    assert.strictEqual(d.D.importStorage(null).written, 0);
    assert.strictEqual(d.D.importStorage([1]).written, 0);
  });
  test('workout status is one fact per day', () => {
    const d = boot();
    const date = day(2026, 10, 2);
    assert.strictEqual(d.D.workoutStatus(date), '');
    d.D.setWorkoutStatus(date, 'done');
    assert.strictEqual(d.D.workoutStatus(date), 'done');
    d.D.setWorkoutStatus(date, 'skip');
    assert.strictEqual(d.D.workoutStatus(date), 'skip');
    d.localStorage.setItem('stack_fitness_workout_2026-01-02', '1');
    assert.strictEqual(d.D.yearWorkouts(2026), 1, 'only ✓ days of the year count (the skipped Oct 2 does not)');
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { console.log('RESULT: FAIL\n' + failures.map((f) => '  - ' + f).join('\n')); process.exit(1); }
console.log('RESULT: PASS');
process.exit(0); // timers left by the app (debounced IndexedDB writes) must not keep the process alive
