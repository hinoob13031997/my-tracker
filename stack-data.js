/* STACK Data Core v2 — unified read model, compatibility-first, no destructive migrations.
   v29.66: single implementations of logic that used to be copied between modules —
   workout day status (stack_fitness_workout_<date>: '1' | 'skip' | '0') and the STACK КБЖУ formula.
   v29.76: full backup/restore of every stack_* key (exportFull / importStorage). */
(() => {
  'use strict';
  const KEYS = Object.freeze({
    main: 'stack_neon_mix9_calendar_v1',
    income: 'stack_income_tracker_v1',
    fx: 'stack_fx_cbr_v1',
    fxHistory: 'stack_fx_history_v1',
    taskDetails: 'stack_task_details_v227',
    fitnessGoal: 'stack_fitness_goal_v2318',
    fitnessProfile: 'stack_fitness_profile_v2320',
    fitnessBody: 'stack_fitness_log_v2310',
    fitnessNutrition: 'stack_fitness_nutrition_v2310',
    focus: 'stack_v27_focus_v1',
    backupMeta: 'stack_backup_meta_v1',
  });
  function read(key, fallback = {}) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      return v ?? fallback;
    } catch (e) {
      return fallback;
    }
  }
  function main() {
    const v = read(KEYS.main, {});
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  }
  function income() {
    return read(KEYS.income, {});
  }
  function savings() {
    return main()?.savings || {};
  }
  function goals() {
    const a = savings()?.goals;
    return Array.isArray(a) ? a : [];
  }
  function currency(v) {
    let c = String(v || 'RUB').toUpperCase();
    if (c === '₽') c = 'RUB';
    if (c === '$') c = 'USD';
    if (c === '€') c = 'EUR';
    return ['RUB', 'USD', 'EUR'].includes(c) ? c : 'RUB';
  }
  function goalCurrency(g) {
    return currency(g?.currency);
  }
  function transactions(g) {
    return Array.isArray(g?.tx) ? g.tx : Array.isArray(g?.transactions) ? g.transactions : [];
  }
  function fxCache() {
    return read(KEYS.fx, {});
  }
  function rate(c) {
    c = currency(c);
    if (c === 'RUB') return 1;
    const f = fxCache();
    return Number(globalThis.FX?.[c]) || Number(f?.[c]) || Number(f?.rates?.[c]) || 0;
  }
  function balance(g) {
    return (Number(g?.start ?? g?.current) || 0) + transactions(g).reduce((s, t) => s + (Number(t?.amount) || 0), 0);
  }
  function monthTransactions(g, k) {
    return transactions(g).filter(t => String(t?.date || '').slice(0, 7) === k);
  }
  function savedNative(c, k) {
    c = currency(c);
    let n = 0;
    for (const g of goals()) {
      if (goalCurrency(g) !== c) continue;
      for (const t of monthTransactions(g, k)) n += Number(t?.amount) || 0;
    }
    return n;
  }
  function savedRubEquivalent(k) {
    let n = 0;
    for (const g of goals()) {
      const r = rate(goalCurrency(g));
      if (!r) continue;
      for (const t of monthTransactions(g, k)) n += (Number(t?.amount) || 0) * r;
    }
    return n;
  }
  function fitness() {
    return {
      goal: read(KEYS.fitnessGoal, {}),
      profile: read(KEYS.fitnessProfile, {}),
      body: read(KEYS.fitnessBody, []),
      nutrition: read(KEYS.fitnessNutrition, []),
    };
  }
  function dateKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function workoutStatus(d = new Date()) {
    try {
      const v = localStorage.getItem('stack_fitness_workout_' + dateKey(d));
      return v === '1' ? 'done' : v === 'skip' ? 'skip' : '';
    } catch (e) {
      return '';
    }
  }
  /* Every workout status write goes here: it also mirrors the mark onto the «Тренировка» process (v29.55). */
  function setWorkoutStatus(d, v) {
    try {
      localStorage.setItem('stack_fitness_workout_' + dateKey(d), v === 'done' ? '1' : v === 'skip' ? 'skip' : '0');
    } catch (e) {}
    try {
      globalThis.STACK_V29_SHELL?.syncWorkout?.(d, v);
    } catch (e) {}
  }
  /* Fitness program calendar (v29.80). The program is not stored — it is a pure function of the date and the start date, so a
   date never maps to two workouts and moving the start date cannot duplicate anything: statuses and logged sets are saved per
   calendar date, not per week. Year 1 runs weeks 1–52 (Адаптация → … → Закрепление). Every following year starts at week 9
   («Рост объёма», no repeated adaptation) and lasts 44 weeks. The start date lives in the existing goal object
   (stack_fitness_goal_v2318 → programStart, 'YYYY-MM-DD'); no new key. */
  const PROGRAM_START_DEFAULT = '2026-08-10';
  const PROGRAM_PHASES = Object.freeze([
    Object.freeze({
      name: 'Адаптация',
      from: 1,
      to: 8,
      days: 3,
      focus: 'Техника и устойчивый ритм',
      next: 'Рост объёма',
    }),
    Object.freeze({
      name: 'Рост объёма',
      from: 9,
      to: 20,
      days: 4,
      focus: 'Больше качественной работы',
      next: 'Сила + масса',
    }),
    Object.freeze({
      name: 'Сила + масса',
      from: 21,
      to: 36,
      days: 4,
      focus: 'Тяжёлые и объёмные дни',
      next: 'Закрепление',
    }),
    Object.freeze({
      name: 'Закрепление',
      from: 37,
      to: 52,
      days: 3,
      focus: 'Стабильный результат и слабые места',
      next: 'Новый цикл',
    }),
  ]);
  const DAY_MS = 86400000;
  function dayNumber(d) {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
  }
  function parseKey(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }
  function programStart() {
    return parseKey(read(KEYS.fitnessGoal, {})?.programStart) || parseKey(PROGRAM_START_DEFAULT);
  }
  /* week 1..52 of the program template, program year 1.., 4-week block; dates before the start count as week 1 */
  function programPosition(d = new Date()) {
    const n = Math.max(0, Math.floor((dayNumber(d) - dayNumber(programStart())) / 7));
    let year, week;
    if (n < 52) {
      year = 1;
      week = n + 1;
    } else {
      const m = n - 52;
      year = 2 + Math.floor(m / 44);
      week = 9 + (m % 44);
    }
    const phase = PROGRAM_PHASES.find(p => week >= p.from && week <= p.to) || PROGRAM_PHASES[3];
    return { week, year, phase, block: Math.floor((week - 1) / 4) + 1, weeksSinceStart: n };
  }
  /* done workouts (status '1') on dates fromKey..toKey inclusive */
  function workoutsDone(from, to) {
    let n = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('stack_fitness_workout_')) continue;
        const day = k.slice(22);
        if (day >= from && day <= to && localStorage.getItem(k) === '1') n++;
      }
    } catch (e) {}
    return n;
  }
  function yearWorkouts(year = new Date().getFullYear()) {
    return workoutsDone(`${year}-01-01`, `${year}-12-31`);
  }
  function yearGoal() {
    const n = Math.floor(Number(read(KEYS.fitnessGoal, {})?.yearWorkouts));
    return n > 0 ? Math.min(n, 366) : 0;
  }
  /* The «Тренировка» process is recognised by a WORD of its name: «тренир…», «спорт…» or exactly «зал». A bare substring test also took
   «Паспорт», «Залог», «сказал» for a workout (v29.82). One implementation: Today, the workout sync and the icons all call this. */
  const WORKOUT_NAME = /(^|[^а-яёa-z0-9])(тренир|спорт|зал($|[^а-яёa-z0-9]))/;
  function isWorkoutName(name) {
    return WORKOUT_NAME.test(String(name || '').toLowerCase());
  }
  /* STACK daily targets: Mifflin–St Jeor × activity ± goal delta; protein by body weight; fat ≥ 25% kcal (v29.61); carbs = rest. */
  function nutritionTargets({ goal = {}, profile = {}, weight } = {}) {
    const n = v => Number(v) || 0,
      w = n(weight) || n(goal.start),
      target = n(goal.target),
      h = n(profile.height),
      age = n(profile.age),
      sex = profile.sex;
    if (!h || !age || !['male', 'female'].includes(sex) || !w) return null;
    /* v29.82 guard rails: no numbers for implausible input (typos), no deficit for minors or for an underweight / below-18.5-BMI goal — maintenance instead, with a note */
    if (h < 120 || h > 230 || age < 14 || age > 100 || w < 30 || w > 300) return null;
    const bmi = x => x / (h / 100) ** 2;
    let dir = target > w ? 'gain' : target && target < w ? 'loss' : 'maintain',
      warning = '';
    if (age < 18) {
      dir = 'maintain';
      warning = 'До 18 лет цель по весу не применяется — расчёт на поддержание';
    } else if (dir === 'loss' && (bmi(w) < 18.5 || bmi(target) < 18.5)) {
      dir = 'maintain';
      warning =
        bmi(w) < 18.5
          ? 'ИМТ ниже 18,5 — дефицит калорий не применяется'
          : 'Целевой вес даёт ИМТ ниже 18,5 — дефицит калорий не применяется';
    }
    const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'male' ? 5 : -161),
      activity = n(profile.days) === 4 ? 1.55 : 1.45,
      delta = dir === 'gain' ? 250 : dir === 'loss' ? -400 : 0,
      floor = sex === 'male' ? 1500 : 1300,
      kcal = Math.round(Math.max(floor, bmr * activity + delta) / 50) * 50,
      protein = Math.round(w * (dir === 'loss' ? 2 : 1.8)),
      fat = Math.round(Math.max(w * 0.9, (kcal * 0.25) / 9)),
      carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return warning ? { kcal, protein, fat, carbs, warning } : { kcal, protein, fat, carbs };
  }
  function tasks() {
    const m = main();
    return { journal: Array.isArray(m?.journal) ? m.journal : [], details: read(KEYS.taskDetails, {}) };
  }
  function snapshot() {
    return {
      schema: 2,
      main: main(),
      income: income(),
      savings: savings(),
      fx: fxCache(),
      fxHistory: read(KEYS.fxHistory, {}),
      fitness: fitness(),
      tasks: tasks(),
      focus: read(KEYS.focus, {}),
    };
  }
  function exportBundle() {
    return {
      schema: 2,
      build: String(globalThis.STACK_CORE?.build || '27.0.0'),
      createdAt: new Date().toISOString(),
      ...snapshot(),
    };
  }
  /* Full backup (v29.76). The «Резервная копия»/«Экспорт» file used to hold only the main state, so Fitness, nutrition,
   workout marks, income, task descriptions and checklists did not survive a device change. Now every `stack_*`
   localStorage key travels in `storage` (raw strings, byte-for-byte); the main state stays top-level `state`.
   Files from older builds (the bare state object) are still accepted by the importer in index.html. */
  const BACKUP_FORMAT = 'stack-full-backup',
    STORAGE_KEY_RE = /^stack_[a-z0-9_-]+$/,
    WORKOUT_PREFIX = 'stack_fitness_workout_',
    NOT_BACKED_UP = new Set([KEYS.main, KEYS.fx, KEYS.backupMeta]);
  function storageSnapshot() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!STORAGE_KEY_RE.test(k) || NOT_BACKED_UP.has(k)) continue;
        const v = localStorage.getItem(k);
        if (typeof v === 'string') out[k] = v;
      }
    } catch (e) {}
    return out;
  }
  function exportFull(live) {
    const state = live && typeof live === 'object' && !Array.isArray(live) ? live : main();
    return {
      format: BACKUP_FORMAT,
      version: 1,
      createdAt: new Date().toISOString(),
      state,
      storage: storageSnapshot(),
    };
  }
  function isFullBackup(x) {
    return (
      !!x &&
      typeof x === 'object' &&
      x.format === BACKUP_FORMAT &&
      !!x.state &&
      typeof x.state === 'object' &&
      !!x.storage &&
      typeof x.storage === 'object' &&
      !Array.isArray(x.storage)
    );
  }
  /* Writes only well-formed `stack_*` keys: JSON values everywhere, short marks for workout days. The main state is never
   written here (the caller validates and saves it); the FX cache is not restored (it is re-fetched). */
  function importStorage(storage) {
    const res = { written: 0, skipped: [] };
    if (!storage || typeof storage !== 'object' || Array.isArray(storage)) return res;
    for (const [k, v] of Object.entries(storage)) {
      let ok = STORAGE_KEY_RE.test(k) && !NOT_BACKED_UP.has(k) && typeof v === 'string' && v.length <= 5e6;
      if (ok) {
        if (k.startsWith(WORKOUT_PREFIX)) ok = v.length <= 16;
        else
          try {
            JSON.parse(v);
          } catch (e) {
            ok = false;
          }
      }
      if (ok)
        try {
          localStorage.setItem(k, v);
          res.written++;
          continue;
        } catch (e) {}
      res.skipped.push(k);
    }
    return res;
  }
  /* Does the state hold anything the user made? A fresh/wiped state must never be saved as a restore point, nor trigger a backup reminder (v29.81).
   Auto-filled «—» marks do not count. */
  function hasData(s = main()) {
    if (!s || typeof s !== 'object') return false;
    if ((s.journal || []).length || (s.savings?.goals || []).length) return true;
    if ((s.processes || []).some(p => String(p?.name || '').trim())) return true;
    return (s.months || []).some(
      m => Array.isArray(m) && m.some(r => Array.isArray(r) && r.some(v => v === '✓' || v === '○' || v === '◐'))
    );
  }
  /* When the last file backup was made (v29.81). Kept outside the backup itself, so restoring an old file never rewinds it.
   `since` is the first time the app saw real data: the reminder counts from there when no backup was ever downloaded. */
  const BACKUP_REMIND_DAYS = 14;
  function backupMeta() {
    const m = read(KEYS.backupMeta, {}),
      t = v => {
        const n = Date.parse(v);
        return Number.isFinite(n) ? n : 0;
      };
    return { last: t(m?.last), since: t(m?.since) };
  }
  function touchBackupMeta(done = false) {
    try {
      const cur = read(KEYS.backupMeta, {}),
        now = new Date().toISOString();
      if (!done && cur?.since) return;
      localStorage.setItem(
        KEYS.backupMeta,
        JSON.stringify({ since: cur?.since || now, last: done ? now : cur?.last || null })
      );
      if (done) window.dispatchEvent(new CustomEvent('stack:backup-done'));
    } catch (e) {}
  }
  function backupStatus(now = Date.now()) {
    const m = backupMeta(),
      base = m.last || m.since;
    const days = base ? Math.max(0, Math.floor((now - base) / DAY_MS)) : null;
    return { everBackedUp: !!m.last, days, due: days !== null && days >= BACKUP_REMIND_DAYS && hasData() };
  }
  function storageOnly() {
    return storageSnapshot();
  }
  const api = Object.freeze({
    version: 2,
    schema: 2,
    keys: KEYS,
    read,
    main,
    income,
    savings,
    goals,
    currency,
    goalCurrency,
    transactions,
    fxCache,
    rate,
    balance,
    monthTransactions,
    savedNative,
    savedRubEquivalent,
    fitness,
    tasks,
    snapshot,
    exportBundle,
    exportFull,
    isFullBackup,
    importStorage,
    storageOnly,
    hasData,
    isWorkoutName,
    backupMeta,
    touchBackupMeta,
    backupStatus,
    dateKey,
    workoutStatus,
    setWorkoutStatus,
    programStart,
    programPosition,
    programPhases: PROGRAM_PHASES,
    workoutsDone,
    yearWorkouts,
    yearGoal,
    nutritionTargets,
  });
  Object.defineProperty(globalThis, 'STACK_DATA', { value: api, writable: false, configurable: true });
  window.dispatchEvent(new CustomEvent('stack:data-ready', { detail: { version: 2, schema: 2 } }));
  console.info('STACK Data Core v2 ready');
})();
