/* STACK v29.3.2 — drop closed INTEGRATED audit scaffolding (all 4 routed sections own their screen).
   v29.4.0 — Today opens Дела on the matching tab (process → Процессы, task → Задачи);
   one workout fact: the Today «Тренировка» process mark and the Fitness day status
   (stack_fitness_workout_<date>) are kept in sync instead of being two separate marks.
   v29.5.0 — the right-hand control on a task row marks it done (status «Готово») and back; done
   tasks stay visible for the day. cycleMark(index,date) is the one process-mark writer (Today and
   Дела → Процессы «Отметки за день»), so the workout sync applies to past days too.
   v29.82 — «Сегодня»: overdue tasks (max 5 + «Ещё N»), a ticked task keeps its «В работе» status, workout recognised by word (not by substring),
   one render per change, redraw on resume/midnight, 44px tap zones.
   v29.6.0 — one secondary line «Питание · факт / цель ккал» under the list; tap → Fitness → Питание. */
(() => {
  'use strict';
  const BUILD = '29.92.0';
  const MOBILE = () => innerWidth <= 720;
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const read = (k, f = {}) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? f;
    } catch (_) {
      return f;
    }
  };
  const dateKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const liveState = () => {
    try {
      if (typeof state !== 'undefined' && state) return state;
    } catch (_) {}
    return null;
  };
  const stateNow = () => liveState() || globalThis.STACK_DATA?.main?.() || read('stack_neon_mix9_calendar_v1', {});
  let current = 'today';
  function scheduledProcesses(d = new Date()) {
    const s = stateNow(),
      ps = Array.isArray(s?.processes) ? s.processes : [],
      mi = typeof dateToMonthIndex === 'function' ? dateToMonthIndex(d) : -1,
      day = d.getDate() - 1,
      out = [];
    ps.forEach((p, i) => {
      try {
        if (typeof isScheduledOnDate === 'function' && !isScheduledOnDate(i, d)) return;
      } catch (_) {}
      const mark = mi >= 0 ? s?.months?.[mi]?.[i]?.[day] || '' : '';
      out.push({ kind: 'process', index: i, name: p?.name || `Процесс ${i + 1}`, mark, color: p?.color || '#9133e4' });
    });
    return out;
  }
  function taskDone(t) {
    const D = globalThis.STACK_DATA;
    return D?.isTaskDone ? D.isTaskDone(t) : /готов|выполн|done|complete/.test(String(t?.status || '').toLowerCase());
  }
  /* v29.82: overdue tasks (a past `due`, not done) are shown too — «Сегодня» used to hide exactly what was already late. At most OVERDUE_SHOWN, newest
   deadline first, the rest behind one «Ещё N» row; a task ticked off here stays on screen until you leave «Сегодня». */
  const OVERDUE_SHOWN = 5;
  let justDone = new WeakSet();
  const isDateKey = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
  const daysBetween = (a, b) => {
    const t = k => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
    return Math.round((t(b) - t(a)) / 864e5);
  };
  function dueTasks(d = new Date()) {
    const s = stateNow(),
      today = dateKey(d),
      a = Array.isArray(s?.journal) ? s.journal : [],
      todays = [],
      late = [];
    const row = (t, index) => ({
      kind: 'task',
      index,
      name: t.task || 'Без названия',
      mark: taskDone(t) ? '✓' : '',
      color: '#0877f3',
      late: isDateKey(t.due) && t.due < today && !taskDone(t) ? daysBetween(t.due, today) : 0,
    });
    a.forEach((t, index) => {
      if (!t || String(t.status || '').toLowerCase() === 'архив') return;
      if (t.date === today || t.due === today) todays.push(row(t, index));
      else if (isDateKey(t.due) && t.due < today && (!taskDone(t) || justDone.has(t))) late.push({ t, index });
    });
    late.sort((x, y) => y.t.due.localeCompare(x.t.due));
    return {
      today: todays,
      overdue: late
        .slice(0, OVERDUE_SHOWN)
        .map(({ t, index }) => ({ ...row(t, index), late: daysBetween(t.due, today) })),
      overdueMore: Math.max(0, late.length - OVERDUE_SHOWN),
    };
  }
  function todayModel() {
    const d = new Date(),
      processes = scheduledProcesses(d),
      due = dueTasks(d),
      tasks = due.today,
      active = processes.filter(x => x.mark !== '—'),
      done = active.filter(x => x.mark === '✓').length,
      skipped = processes.filter(x => x.mark === '—').length,
      total = active.length,
      /* «осталось» = not marked yet; a ○ is a day already missed, not a thing left to do (v29.90) */
      left = active.filter(x => x.mark === '' || x.mark === '◐').length,
      missed = active.filter(x => x.mark === '○').length,
      pct = total ? Math.round((done / total) * 100) : 0;
    return {
      d,
      processes,
      tasks,
      active,
      done,
      skipped,
      left,
      missed,
      total,
      pct,
      overdueMore: due.overdueMore,
      rows: [...due.overdue, ...tasks, ...processes],
    };
  }
  /* processes only (a task «Продлить паспорт» is not a workout); the word rule lives in stack-data.js */
  function isWorkout(a) {
    return a?.kind !== 'task' && !!globalThis.STACK_DATA?.isWorkoutName?.(a?.name);
  }
  const FOOD_NAME = /(^|[^а-яё])(питан|еда($|[^а-яё])|завтрак|обед|ужин)/;
  /* v29.92: line icons instead of the □ / ↻ / 🍽 text glyphs (an emoji and two font-dependent symbols); the workout keeps its neon glyph */
  const svg = (d, size = 20) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    task: svg('<rect x="5" y="4" width="14" height="16" rx="3"/><path d="M9 9h6M9 12.5h6M9 16h3.5"/>'),
    process: svg(
      '<path d="M16.5 3.5l3 3-3 3"/><path d="M4.5 11.5V10a3.5 3.5 0 013.5-3.5h11.5"/><path d="M7.5 20.5l-3-3 3-3"/><path d="M19.5 12.5V14a3.5 3.5 0 01-3.5 3.5H4.5"/>'
    ),
    food: svg(
      '<path d="M7 3v7.5M4.5 3v5a2.5 2.5 0 005 0V3M7 10.5V21"/><path d="M17.5 21V3c-2.2.6-3.7 3-3.7 6.2V14h3.7"/>'
    ),
    backup: svg('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>'),
    chevron: svg('<path d="M9.5 6l6 6-6 6"/>', 18),
  };
  function actionIcon(a) {
    const n = String(a?.name || '').toLowerCase();
    if (isWorkout(a)) return '<span class="v29-workout-glyph" aria-hidden="true"></span>';
    if (a?.kind === 'task') return ICON.task;
    if (FOOD_NAME.test(n)) return ICON.food;
    return ICON.process;
  }
  const MOVE_ICON = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4M9.5 15h5M12.5 12.5l2.5 2.5-2.5 2.5"/></svg>`;
  /* the mark is drawn, not typed: ✓ a tick on the filled dot, ○ an open ring (missed), — a dash (not required), ◐ a half dot (legacy) */
  function markIcon(mark) {
    const d =
      mark === '✓'
        ? '<path d="M6.5 12.5l3.6 3.6 7.4-8"/>'
        : mark === '○'
          ? '<circle cx="12" cy="12" r="4.6"/>'
          : mark === '—'
            ? '<path d="M7.5 12h9"/>'
            : mark === '◐'
              ? '<path d="M12 7.2a4.8 4.8 0 010 9.6z" fill="currentColor"/><circle cx="12" cy="12" r="4.8"/>'
              : '';
    return d
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
      : '';
  }
  function markLabel(mark) {
    return mark === '✓'
      ? 'Выполнено'
      : mark === '○'
        ? 'Пропущено'
        : mark === '—'
          ? 'Не требовалось'
          : mark === '◐'
            ? 'Частично (старая отметка)'
            : 'Не отмечено';
  }
  /* the day's ring: one number, drawn with the brand gradient (the gradient lives in the nav's <defs>, which is on every screen) */
  function ring(pct, label) {
    const r = 30,
      len = 2 * Math.PI * r,
      on = Math.max(0, Math.min(100, pct)) / 100;
    return `<div class="v29-ring"><svg viewBox="0 0 76 76" aria-hidden="true"><circle class="t" cx="38" cy="38" r="${r}"/>${on > 0 ? `<circle class="f" cx="38" cy="38" r="${r}" stroke-dasharray="${(len * on).toFixed(1)} ${len.toFixed(1)}"/>` : ''}</svg><b>${esc(label)}</b></div>`;
  }
  /* v29.92: the design system's tokens (--ds-*) come from index.html :root; this sheet only lays out the screens the shell owns */
  const CSS = `@media(max-width:720px){
html.stack-v29-ready.stack-minimal-gate body::before,html.stack-v29-ready.stack-minimal-gate body::after{display:none!important}
body.v29-native-today>.app{display:none!important}
#mobileNav{display:none!important}
body{background:var(--ds-glow) no-repeat,var(--ds-bg)}
#stackV29Root{position:relative;z-index:1000;min-height:100dvh;color:var(--ds-text);font-family:var(--ds-font)}
#stackV29Root.v29-legacy{pointer-events:none;min-height:0}
#stackV29Root.v29-legacy .v29-main{display:none}
#stackV29Root.v29-legacy .v29-nav{pointer-events:auto}
.v29-main{min-height:100dvh;padding:max(16px,env(safe-area-inset-top)) 16px calc(108px + env(safe-area-inset-bottom));background:var(--ds-glow) no-repeat,var(--ds-bg)}
.v29-head{padding:8px 4px 0}
.v29-kicker{font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--ds-text-3)}
.v29-title{margin:6px 0 0;font-size:34px;line-height:1.05;font-weight:800;letter-spacing:-.03em}
.v29-progress{display:grid;grid-template-columns:76px minmax(0,1fr);gap:16px;align-items:center;margin-top:20px;padding:16px 18px 16px 16px;border:1px solid var(--ds-line);border-radius:var(--ds-r-xl);background:radial-gradient(120% 150% at 0 0,rgba(139,72,240,.17),transparent 58%),var(--ds-card-bg);box-shadow:var(--ds-shadow)}
.v29-ring{position:relative;width:76px;height:76px}
.v29-ring svg{display:block;width:76px;height:76px;transform:rotate(-90deg)}
.v29-ring circle{fill:none;stroke-width:7}
.v29-ring .t{stroke:rgba(150,170,215,.12)}
.v29-ring .f{stroke:url(#v29Grad);stroke-linecap:round;filter:drop-shadow(0 0 5px rgba(139,72,240,.5))}
.v29-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:20px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.v29-progress strong,.v29-progress small{display:block}
.v29-progress strong{font-size:16px;font-weight:700;line-height:1.3;letter-spacing:-.01em}
.v29-progress small{margin-top:5px;color:var(--ds-text-2);font-size:13px;line-height:1.4}
.v29-section-label{margin:26px 4px 10px;font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--ds-text-3)}
.v29-list{overflow:hidden;border:1px solid var(--ds-line);border-radius:var(--ds-r-xl);background:var(--ds-card-bg);box-shadow:var(--ds-shadow)}
.v29-row{position:relative;min-height:64px;display:grid;grid-template-columns:38px minmax(0,1fr) 44px;gap:12px;align-items:center;padding:8px 8px 8px 14px}
.v29-row+.v29-row::before,.v29-more::before{content:'';position:absolute;left:64px;right:0;top:0;height:1px;background:var(--ds-sep)}
.v29-action-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:color-mix(in srgb,var(--a) 15%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 24%,transparent);color:color-mix(in srgb,var(--a) 80%,#fff);font-style:normal}
.v29-action-icon svg{display:block}
.v29-action-icon.workout{background:radial-gradient(circle at 50% 40%,#22163c 0,#0c0f1c 75%);box-shadow:inset 0 0 0 1px rgba(155,92,255,.38),0 0 14px rgba(145,51,228,.22)}
.v29-workout-glyph{position:relative;width:18px;height:4px;border-radius:999px;background:linear-gradient(90deg,#0ed2e7,#9b5cff 52%,#f12bb8);box-shadow:0 0 8px #9b5cff,0 0 13px #0877f355}
.v29-workout-glyph::before,.v29-workout-glyph::after{content:'';position:absolute;top:50%;width:4px;height:15px;border-radius:999px;transform:translateY(-50%);background:linear-gradient(180deg,#0ed2e7,#b15cff 55%,#f12bb8);box-shadow:0 0 7px #9b5cff}
.v29-workout-glyph::before{left:-2px}
.v29-workout-glyph::after{right:-2px}
.v29-open{min-width:0;min-height:44px;padding:0;border:0;background:transparent;color:var(--ds-text);text-align:left;font-size:15px;font-weight:600;line-height:1.3;letter-spacing:-.01em;overflow-wrap:anywhere}
.v29-late{display:block;margin-top:3px;color:#f59a6b;font-size:12px;font-weight:600;letter-spacing:0}
.v29-status{position:relative;width:44px;height:44px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;-webkit-tap-highlight-color:transparent}
.v29-status::before{content:'';position:absolute;left:8px;top:8px;width:28px;height:28px;box-sizing:border-box;border-radius:50%;border:2px solid color-mix(in srgb,var(--a) 72%,#2b3447);transition:background-color .2s,border-color .2s,box-shadow .2s}
.v29-status svg{position:relative;display:block}
.v29-status[data-mark="✓"]::before{border-color:transparent;background:var(--a);box-shadow:0 0 14px color-mix(in srgb,var(--a) 50%,transparent)}
.v29-status[data-mark="○"]{color:var(--ds-bad)}
.v29-status[data-mark="○"]::before{border-color:color-mix(in srgb,var(--ds-bad) 55%,transparent);background:color-mix(in srgb,var(--ds-bad) 12%,transparent)}
.v29-status[data-mark="—"]{color:var(--ds-warn)}
.v29-status[data-mark="—"]::before{border-color:color-mix(in srgb,var(--ds-warn) 45%,transparent);background:color-mix(in srgb,var(--ds-warn) 11%,transparent)}
.v29-status[data-mark="◐"]{color:#b49cff}
.v29-status[data-mark="◐"]::before{border-color:#6c55b8;background:rgba(145,51,228,.12)}
.v29-row-done .v29-open{color:var(--ds-text-2)}
.v29-card-line{position:relative;width:100%;display:grid;grid-template-columns:38px minmax(0,1fr) 20px;align-items:center;gap:12px;margin-top:12px;padding:12px 12px 12px 14px;border:1px solid var(--ds-line);border-radius:var(--ds-r-lg);background:var(--ds-card-bg);box-shadow:var(--ds-shadow);color:var(--ds-text);text-align:left}
.v29-card-line>i{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:var(--ds-tile);color:var(--ds-text-2);font-style:normal}
.v29-card-line>span{min-width:0}
.v29-card-line small{display:block;color:var(--ds-text-2);font-size:13px;line-height:1.35}
.v29-card-line small.k{margin-bottom:2px;color:var(--ds-text-3);font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase}
.v29-card-line b{display:block;font-size:16px;font-weight:700;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.v29-card-line>em{display:grid;place-items:center;color:var(--ds-text-3);font-style:normal}
.v29-card-line[data-v29-backup]>i{background:rgba(242,180,76,.12);color:var(--ds-warn)}
.v29-more{position:relative;width:100%;min-height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px 0 64px;border:0;background:transparent;color:#f59a6b;font-size:14px;font-weight:600;text-align:left}
.v29-more i{display:grid;place-items:center;color:var(--ds-text-3);font-style:normal}
.v29-empty{padding:30px 18px;text-align:center;color:var(--ds-text-3);font-size:14px}
.v29-nav{position:fixed;z-index:2147483000;left:12px;right:12px;bottom:max(10px,env(safe-area-inset-bottom));height:64px;display:grid;grid-template-columns:repeat(5,1fr);padding:0 6px}
/* no filter on .v29-nav: it would become the backdrop root and the glass would blur nothing */
.v29-dock-glass{position:absolute;inset:0;-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);pointer-events:none}
.v29-dock-bg{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;filter:drop-shadow(0 10px 24px rgba(0,0,0,.55))}
.v29-dock-bg path{fill:rgba(12,15,24,.8);stroke:rgba(160,180,225,.14);stroke-width:1}
.v29-bead{position:absolute;z-index:2;left:0;top:-27px;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--ds-grad);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.12),0 10px 26px -6px rgba(139,72,240,.7);touch-action:none;cursor:grab;will-change:transform}
.v29-bead.drag{cursor:grabbing;transform-origin:center}
.v29-bead svg{display:block;stroke-width:2}
.v29-nav button{position:relative;z-index:1;min-width:0;height:64px;display:grid;place-items:center;align-content:center;gap:4px;border:0;background:transparent;color:var(--ds-text-3);font-size:10.5px;font-weight:600;letter-spacing:.01em;-webkit-tap-highlight-color:transparent;transition:color .2s}
.v29-nav button i{display:grid;place-items:center;width:22px;height:22px;font-style:normal}
.v29-nav button i svg{display:block}
.v29-nav button.active{align-content:end;padding-bottom:11px;color:var(--ds-text);font-weight:700}
.v29-nav button.active i{display:none}
#screenTasks.v233-mode-tasks #v2212Tasks .v2212-add{width:44px!important;height:44px!important;min-width:44px!important;padding:0!important;font-size:0!important;border-radius:14px!important;display:grid!important;place-items:center!important}
#screenTasks.v233-mode-tasks #v2212Tasks .v2212-add::after{content:'+';font-size:25px;font-weight:400;line-height:1;color:#fff}
body:not(.v29-native-today){padding-bottom:84px!important}
body:not(.v29-native-today)>.app{padding-left:max(14px,env(safe-area-inset-left))!important;padding-right:max(14px,env(safe-area-inset-right))!important}
.v29-row.v29-row-late{grid-template-columns:38px minmax(0,1fr) 44px 44px}
.v29-move{width:44px;height:44px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:rgba(245,154,107,.12);color:#f59a6b}
.v29-move svg{display:block}
.v29-sheet-bg{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:flex-end;justify-content:center;background:var(--ds-overlay);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.v29-sheet{box-sizing:border-box;width:100%;max-width:430px;padding:10px 16px max(20px,env(safe-area-inset-bottom));border:1px solid var(--ds-line-2);border-bottom:0;border-radius:26px 26px 0 0;background:var(--ds-sheet-bg);color:var(--ds-text);font-family:var(--ds-font);box-shadow:0 -20px 60px -20px rgba(0,0,0,.8)}
.v29-sheet::before{content:'';display:block;width:38px;height:5px;margin:0 auto 14px;border-radius:99px;background:rgba(160,180,225,.25)}
.v29-sheet>b{display:block;font-size:12px;font-weight:600;letter-spacing:.07em;color:var(--ds-text-3)}
.v29-sheet-name{margin:6px 0 12px;font-size:17px;font-weight:700;line-height:1.3;letter-spacing:-.01em;overflow-wrap:anywhere}
.v29-sheet button,.v29-sheet-date{box-sizing:border-box;width:100%;min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding:0 16px;border:1px solid var(--ds-line);border-radius:var(--ds-r-md);background:var(--ds-tile);color:var(--ds-text);font-size:15px;font-weight:600;text-align:left}
.v29-sheet button small{color:var(--ds-text-2);font-size:13px;font-weight:500}
.v29-sheet-date input{min-width:0;border:0;background:transparent;color:var(--ds-text);color-scheme:dark;font:inherit;font-size:16px;text-align:right}
.v29-sheet .v29-sheet-cancel{justify-content:center;border-color:transparent;background:transparent;color:var(--ds-text-2)}
}`;
  function installStyle() {
    if (document.getElementById('stackV29Style')) return;
    const s = document.createElement('style');
    s.id = 'stackV29Style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function root() {
    let r = document.getElementById('stackV29Root');
    if (r) return r;
    r = document.createElement('div');
    r.id = 'stackV29Root';
    document.body.appendChild(r);
    return r;
  }
  const NAV = [
    [
      'today',
      `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 9-9 9-9-9z"/><circle cx="12" cy="12" r="1.2"/></svg>`,
      'Сегодня',
      'screenToday',
    ],
    [
      'deals',
      `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.5 12.2l2.6 2.6 4.6-5.4"/></svg>`,
      'Дела',
      'screenTasks',
    ],
    [
      'fitness',
      `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3L5.5 13H11l-1 8L18.5 11H13z"/></svg>`,
      'Fitness',
      'screenTracker',
    ],
    [
      'finance',
      `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M10 7.5v9M10 7.5h3.2a2.4 2.4 0 010 4.8H10M8 14.2h5.4"/></svg>`,
      'Финансы',
      'screenSavings',
    ],
    [
      'analytics',
      `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 20v-6M12 20V6M18 20v-9"/></svg>`,
      'Аналитика',
      'screenAnalytics',
    ],
  ];
  function navHtml() {
    return `<nav class="v29-nav"><div class="v29-dock-glass" aria-hidden="true"></div><svg class="v29-dock-bg" aria-hidden="true"><defs><linearGradient id="v29Grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b6ff2"/><stop offset=".54" stop-color="#8b48f0"/><stop offset="1" stop-color="#e03aa0"/></linearGradient></defs><path d=""/></svg><span class="v29-bead" aria-hidden="true"></span>${NAV.map(([id, icon, label]) => `<button data-v29-nav="${id}" class="${current === id ? 'active' : ''}" ${current === id ? 'aria-current="page"' : ''}><i>${icon}</i><span>${label}</span></button>`).join('')}</nav>`;
  }
  function release() {
    document.documentElement.classList.add('stack-v29-ready', 'stack-minimal-ready');
    document.documentElement.classList.remove('stack-minimal-loading');
  }
  function progressText(x) {
    if (x.total)
      return {
        head: `${x.pct}%`,
        strong: `${x.done} из ${x.total} обязательных выполнено`,
        small: `${x.left} осталось${x.missed ? ` · ${x.missed} пропущено` : ''}${x.skipped ? ` · ${x.skipped} не требовалось` : ''}`,
      };
    if (x.skipped)
      return { head: '—', strong: 'Сегодня обязательных нет', small: `${x.skipped} отмечено как «не требовалось»` };
    return { head: '—', strong: 'Сегодня обязательных процессов нет', small: 'Нечего считать как выполненное' };
  }
  function nutritionLine() {
    try {
      const n = globalThis.STACK_NUTRITION;
      if (!n?.dayFact) return '';
      const t = n.targets?.(),
        f = n.dayFact(dateKey());
      if (!t && !f.kcal) return '';
      const pct = t?.kcal ? Math.round((f.kcal / t.kcal) * 100) : null;
      return `<button type="button" class="v29-card-line" data-v29-food><i>${ICON.food}</i><span><small class="k">Питание</small><b>${Math.round(f.kcal)}${t?.kcal ? ` / ${Math.round(t.kcal)}` : ''} ккал</b><small>${pct === null ? 'цель не задана' : pct >= 90 && pct <= 110 ? 'в плане' : pct > 110 ? 'выше цели' : `осталось ${Math.max(0, Math.round(t.kcal - f.kcal))} ккал`}</small></span><em>${ICON.chevron}</em></button>`;
    } catch (_) {
      return '';
    }
  }
  /* the only copy that survives a lost phone is the downloaded file: after 14 days without one, say so — one quiet line, one tap */
  function backupLine() {
    try {
      const st = globalThis.STACK_DATA?.backupStatus?.();
      if (!st?.due) return '';
      return `<button type="button" class="v29-card-line" data-v29-backup><i>${ICON.backup}</i><span><small class="k">Копия</small><b>${st.everBackedUp ? `Не скачивали ${st.days} дн.` : 'Файл копии ещё не скачивали'}</b><small>Скачать файл со всеми данными</small></span><em>${ICON.chevron}</em></button>`;
    } catch (_) {
      return '';
    }
  }
  /* One render per change: save() announces itself 2–3 times (core, persistence, shell), a status tap used to redraw the screen as many times */
  let todayQueued = false,
    midnightTimer = 0;
  function scheduleToday() {
    if (todayQueued) return;
    todayQueued = true;
    setTimeout(() => {
      if (!todayQueued) return;
      todayQueued = false;
      if (current === 'today') renderToday();
    }, 0);
  }
  function armMidnight() {
    clearTimeout(midnightTimer);
    const n = new Date(),
      next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 2);
    midnightTimer = setTimeout(() => {
      if (current === 'today' && MOBILE()) renderToday();
      armMidnight();
    }, next - n);
  }
  function renderToday() {
    if (!MOBILE()) return;
    todayQueued = false;
    current = 'today';
    document.body.classList.add('v29-native-today');
    const x = todayModel(),
      p = progressText(x),
      date = x.d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
      r = root();
    r.className = '';
    r.innerHTML = `<main class="v29-main"><header class="v29-head"><div class="v29-kicker">${esc(date)}</div><h1 class="v29-title">Сегодня</h1></header><section class="v29-progress">${ring(x.total ? x.pct : 0, p.head)}<div><strong>${esc(p.strong)}</strong><small>${esc(p.small)}</small></div></section><div class="v29-section-label">Что делать сейчас</div><section class="v29-list">${x.rows.length ? x.rows.map(a => `<div class="v29-row${a.late && !a.mark ? ' v29-row-late' : ''}${a.mark === '✓' ? ' v29-row-done' : ''}" data-v29-kind="${a.kind}" data-v29-index="${a.index ?? ''}" data-v29-route="${isWorkout(a) ? 'fitness' : 'deals'}" data-v29-tab="${a.kind === 'task' ? 'tasks' : 'processes'}" style="--a:${a.color}"><i class="v29-action-icon ${isWorkout(a) ? 'workout' : ''}">${actionIcon(a)}</i><button class="v29-open" type="button">${esc(a.name)}${a.late ? `<small class="v29-late">просрочено · ${a.late} дн.</small>` : ''}</button>${a.late && !a.mark ? `<button class="v29-move" type="button" data-v29-move aria-label="Перенести: ${esc(a.name)}">${MOVE_ICON}</button>` : ''}${a.kind === 'process' ? `<button class="v29-status" type="button" data-mark="${a.mark}" aria-label="${esc(markLabel(a.mark))}">${markIcon(a.mark)}</button>` : `<button class="v29-status" type="button" data-mark="${a.mark}" aria-label="${a.mark ? 'Выполнено — снять отметку' : 'Отметить выполненной'}">${markIcon(a.mark)}</button>`}</div>`).join('') : `<div class="v29-empty">На сегодня ничего не запланировано</div>`}${x.overdueMore ? `<button type="button" class="v29-more" data-v29-more>Ещё ${x.overdueMore} просроченных<i>${ICON.chevron}</i></button>` : ''}</section>${nutritionLine()}${backupLine()}</main>${navHtml()}`;
    wire();
    release();
  }
  function selectDealsTab(tab) {
    const b = tab && document.querySelector(`#v233shell [data-v233="${tab}"]`);
    if (b && !b.classList.contains('on')) b.click();
  }
  function openLegacy(id, screenId, tab) {
    current = id;
    document.body.classList.remove('v29-native-today');
    const r = root();
    r.className = 'v29-legacy';
    r.innerHTML = navHtml();
    document.querySelectorAll('.mobile-screen').forEach(el => el.classList.toggle('active', el.id === screenId));
    try {
      sessionStorage.setItem('stack_v23_screen', screenId);
    } catch (_) {}
    if (id === 'deals') selectDealsTab(tab);
    wire();
    release();
  }
  function syncHistory(id, mode) {
    try {
      const payload = { stackV29: id };
      if (mode === 'replace') history.replaceState(payload, '', location.href);
      else if (mode === 'push' && history.state?.stackV29 !== id) history.pushState(payload, '', location.href);
    } catch (_) {}
  }
  function open(id, mode = 'push', tab) {
    closeMove();
    if (id !== 'today') justDone = new WeakSet();
    const item = NAV.find(x => x[0] === id) || NAV[0];
    syncHistory(item[0], mode);
    if (item[0] === 'today') renderToday();
    else openLegacy(item[0], item[3], tab);
  }
  const WORKOUT_KEY = d => 'stack_fitness_workout_' + dateKey(d);
  function syncWorkout(d, value) {
    const s = liveState(),
      mi = typeof dateToMonthIndex === 'function' ? dateToMonthIndex(d) : -1;
    if (!s || mi < 0 || !Array.isArray(s.processes)) return;
    const mark = value === 'done' ? '✓' : value === 'skip' ? '○' : '',
      day = d.getDate() - 1;
    let changed = false;
    s.processes.forEach((p, i) => {
      if (!isWorkout(p)) return;
      try {
        if (typeof isScheduledOnDate === 'function' && !isScheduledOnDate(i, d)) return;
      } catch (_) {}
      const row = s.months?.[mi]?.[i];
      if (!row) return;
      const cur = row[day] || '';
      if (cur === mark || (!mark && cur === '—')) return;
      row[day] = mark;
      changed = true;
    });
    if (!changed) return;
    try {
      if (typeof save === 'function') save();
    } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'fitness-workout-sync' } }));
    } catch (_) {}
  }
  function cycleMark(index, d = new Date()) {
    const mi = typeof dateToMonthIndex === 'function' ? dateToMonthIndex(d) : -1,
      s = liveState(),
      row = mi >= 0 ? s?.months?.[mi]?.[index] : null;
    if (!row) return null;
    const day = d.getDate() - 1,
      cur = row[day] || '',
      next = cycle(cur);
    row[day] = next;
    if (isWorkout(s.processes?.[index]))
      try {
        localStorage.setItem(WORKOUT_KEY(d), next === '✓' ? '1' : next === '○' ? 'skip' : '0');
      } catch (_) {}
    try {
      if (typeof save === 'function') save();
    } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'v29-shell' } }));
    } catch (_) {}
    return next;
  }
  function cycleProcess(index) {
    if (cycleMark(index) === null) {
      open('deals', 'push', 'processes');
      return;
    }
    renderToday();
  }
  /* a task changed on this screen: save, tell the other modules, redraw once */
  function commitTask() {
    try {
      if (typeof save === 'function') save();
    } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'v29-shell-task' } }));
    } catch (_) {}
    try {
      if (typeof renderAll === 'function') renderAll();
    } catch (_) {}
    renderToday();
  }
  function toggleTask(index) {
    const t = liveState()?.journal?.[index];
    if (!t || !globalThis.STACK_DATA?.toggleTaskDone) return;
    if (globalThis.STACK_DATA.toggleTaskDone(t)) justDone.add(t);
    commitTask();
  }
  /* v29.87: a late task can be moved to another day without leaving «Сегодня» — only its `due` (and a planned day of today) changes */
  function closeMove() {
    document.getElementById('v29MoveSheet')?.remove();
    document.removeEventListener('keydown', moveKeys);
  }
  function moveKeys(e) {
    if (e.key === 'Escape') closeMove();
  }
  function openMove(index) {
    const D = globalThis.STACK_DATA,
      t = liveState()?.journal?.[index];
    if (!t || !D?.rescheduleTask) return;
    closeMove();
    const today = dateKey(),
      tomorrow = D.shiftKey(today, 1),
      short = k => {
        const d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
        return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
      },
      el = document.createElement('div');
    el.id = 'v29MoveSheet';
    el.className = 'v29-sheet-bg';
    el.innerHTML = `<div class="v29-sheet" role="dialog" aria-modal="true" aria-label="Перенести задачу"><b>ПЕРЕНЕСТИ НА</b><div class="v29-sheet-name">${esc(t.task || 'Без названия')}</div><button type="button" data-v29-to="${today}">Сегодня<small>${esc(short(today))}</small></button><button type="button" data-v29-to="${tomorrow}">Завтра<small>${esc(short(tomorrow))}</small></button><label class="v29-sheet-date"><span>Другая дата</span><input type="date" min="${today}" aria-label="Другая дата"></label><button type="button" class="v29-sheet-cancel">Отмена</button></div>`;
    const apply = key => {
      closeMove();
      if (!liveState()?.journal?.includes(t) || !D.rescheduleTask(t, key, dateKey())) return;
      commitTask();
    };
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('.v29-sheet-cancel')) closeMove();
      const to = e.target.closest('[data-v29-to]');
      if (to) apply(to.dataset.v29To);
    });
    el.querySelector('input[type=date]').addEventListener('change', e => {
      if (e.target.value) apply(e.target.value);
    });
    document.addEventListener('keydown', moveKeys);
    document.body.appendChild(el);
    el.querySelector('[data-v29-to]')?.focus();
  }
  let dockX = null,
    dockRaf = 0;
  function dockPath(W, H, cx) {
    const r = 18,
      half = 46,
      d = 22,
      a = Math.max(r, cx - half),
      b = Math.min(W - r, cx + half),
      l = (cx - a) / 2,
      m = (b - cx) / 2;
    return `M${r},0H${a}C${a + l},0 ${cx - l},${d} ${cx},${d}C${cx + m},${d} ${b - m},0 ${b},0H${W - r}Q${W},0 ${W},${r}V${H - r}Q${W},${H} ${W - r},${H}H${r}Q0,${H} 0,${H - r}V${r}Q0,0 ${r},0Z`;
  }
  function dock(animate = true) {
    cancelAnimationFrame(dockRaf);
    const nav = document.querySelector('.v29-nav'),
      bead = nav?.querySelector('.v29-bead'),
      path = nav?.querySelector('.v29-dock-bg path'),
      glass = nav?.querySelector('.v29-dock-glass');
    if (!nav || !bead || !path) return;
    const nr = nav.getBoundingClientRect(),
      W = nr.width,
      H = nr.height,
      centers = [...nav.querySelectorAll('[data-v29-nav]')].map(b => {
        const q = b.getBoundingClientRect();
        return q.left - nr.left + q.width / 2;
      }),
      i = Math.max(
        0,
        NAV.findIndex(x => x[0] === current)
      ),
      to = centers[i];
    const paint = x => {
      dockX = x;
      const d = dockPath(W, H, x);
      path.setAttribute('d', d);
      /* the frosted glass follows the same notched outline, so the blur never shows above the bar */
      if (glass) glass.style.clipPath = `path('${d}')`;
      bead.style.transform = `translateX(${x - 26}px)`;
    };
    bead.innerHTML = NAV[i][1];
    const from = dockX == null ? to : dockX,
      ms = animate && dockX != null && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 380 : 0;
    const glide = (x0, x1, t) => {
      const t0 = performance.now(),
        step = now => {
          const k = t ? Math.min(1, (now - t0) / t) : 1,
            e = 1 - Math.pow(1 - k, 3);
          paint(x0 + (x1 - x0) * e);
          if (k < 1) dockRaf = requestAnimationFrame(step);
        };
      step(t0);
    };
    glide(from, to, ms);
    let drag = false;
    const lo = centers[0],
      hi = centers[centers.length - 1],
      pos = e => Math.min(hi, Math.max(lo, e.clientX - nr.left)),
      near = x => centers.reduce((k, c, j) => (Math.abs(c - x) < Math.abs(centers[k] - x) ? j : k), 0);
    bead.onpointerdown = e => {
      drag = true;
      cancelAnimationFrame(dockRaf);
      bead.setPointerCapture(e.pointerId);
      bead.classList.add('drag');
      paint(pos(e));
    };
    bead.onpointermove = e => {
      if (drag) paint(pos(e));
    };
    const end = e => {
      if (!drag) return;
      drag = false;
      bead.classList.remove('drag');
      const j = near(pos(e));
      if (NAV[j][0] !== current) open(NAV[j][0], 'push');
      else glide(dockX, to, 220);
    };
    bead.onpointerup = end;
    bead.onpointercancel = end;
  }
  function wire() {
    const r = root();
    r.querySelector('[data-v29-more]')?.addEventListener('click', () => open('deals', 'push', 'tasks'));
    r.querySelector('[data-v29-backup]')?.addEventListener('click', () =>
      document.getElementById('exportBtn')?.click()
    );
    r.querySelectorAll('[data-v29-nav]').forEach(b => (b.onclick = () => open(b.dataset.v29Nav, 'push')));
    r.querySelector('[data-v29-food]')?.addEventListener('click', () => {
      open('fitness', 'push');
      document.querySelector('.v234-tabs [data-v234="nutrition"]')?.click();
    });
    r.querySelectorAll('.v29-row').forEach(row => {
      row
        .querySelector('.v29-open')
        ?.addEventListener('click', () => open(row.dataset.v29Route || 'deals', 'push', row.dataset.v29Tab));
      row.querySelector('[data-v29-move]')?.addEventListener('click', () => openMove(+row.dataset.v29Index));
      row.querySelector('.v29-status')?.addEventListener('click', () => {
        if (row.dataset.v29Kind === 'process') cycleProcess(+row.dataset.v29Index);
        else toggleTask(+row.dataset.v29Index);
      });
    });
    dock();
  }
  function boot() {
    Object.defineProperty(globalThis, 'STACK_V29_SHELL', {
      value: Object.freeze({
        build: BUILD,
        open,
        refresh: () => open(current, 'none'),
        refreshToday: () => {
          if (current === 'today' && MOBILE()) renderToday();
        },
        syncWorkout,
        cycleMark,
        markIcon,
        ring,
      }),
      configurable: true,
    });
    if (!MOBILE()) {
      release();
      return;
    }
    installStyle();
    window.addEventListener('resize', () => dock(false));
    document.title = 'STACK — Персональная система управления';
    document.querySelector('meta[name="stack-build"]')?.setAttribute('content', 'v29.3.1');
    let start = 'today';
    try {
      const fromHistory = history.state?.stackV29;
      if (NAV.some(x => x[0] === fromHistory)) start = fromHistory;
      else {
        const legacy = sessionStorage.getItem('stack_v23_screen');
        const found = NAV.find(x => x[3] === legacy);
        if (found) start = found[0];
      }
    } catch (_) {}
    open(start, 'replace');
    window.addEventListener('popstate', e => {
      const id = e.state?.stackV29;
      if (id && NAV.some(x => x[0] === id)) open(id, 'none');
    });
    window.addEventListener('stack:backup-done', () => {
      if (current === 'today') renderToday();
    });
    window.addEventListener('stack:data-changed', () => {
      if (current === 'today') scheduleToday();
    });
    window.addEventListener('resize', () => {
      if (!MOBILE()) {
        document.body.classList.remove('v29-native-today');
        release();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && current === 'today' && MOBILE()) renderToday();
    });
    window.addEventListener('pageshow', e => {
      if (e.persisted && current === 'today' && MOBILE()) renderToday();
    });
    armMidnight();
    console.info('STACK v29 shell', BUILD);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
