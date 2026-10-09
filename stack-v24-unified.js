/* STACK v24.8 — Deals pulse (open / today / overdue) under the Deals tabs.
   v29.55: task counters only on the «Задачи» tab — «Процессы» has its own stats row.
   v29.53: this file used to also render a v24 Today page, a Finance pulse
   and a "More" hub. All three were dead UI under the v29 owners (Today was
   rendered only while body.v29-native-today hides .app; #v24FinancePulse
   was hidden by stack-v25-finance.js; renderMore() bailed out whenever
   stack-v29-analytics.js owns #screenAnalytics) and were removed. */
(() => {
  'use strict';
  const BUILD = 'v24.8.1-deals-pulse-tasks-tab';
  let lastDeals = '',
    queued = false;

  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function mainState() {
    try {
      if (typeof state !== 'undefined' && state && typeof state === 'object') return state;
    } catch (_e) {}
    return globalThis.STACK_DATA?.main?.() || {};
  }
  function doneTask(task) {
    const value = String(task?.status || '').toLowerCase();
    return value.includes('готов') || value.includes('выполн');
  }
  function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function installStyle() {
    if (document.getElementById('stackV24Style')) return;
    const style = document.createElement('style');
    style.id = 'stackV24Style';
    style.textContent = `@media(max-width:720px){#screenTasks:not(.v233-mode-tasks) .v24-deals-pulse{display:none}.v24-deals-pulse{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:-3px 0 10px}.v24-pulse{padding:9px 5px;border:1px solid #203957;border-radius:11px;background:#06101d;text-align:center}.v24-pulse b{display:block;font-size:16px}.v24-pulse span{font-size:7px;color:#7f8da2}.v24-pulse.alert b{color:#f06b85}}`;
    document.head.appendChild(style);
  }

  function taskData(data, today) {
    const tasks = Array.isArray(data.journal) ? data.journal : [],
      relevant = [],
      overdue = [];
    for (const task of tasks) {
      if (task.date === today || task.due === today) relevant.push(task);
      if (!doneTask(task) && task.due && task.due < today) overdue.push(task);
    }
    return {
      tasks,
      relevant,
      overdue,
      open: tasks.filter(x => !doneTask(x)),
      doneToday: relevant.filter(doneTask).length,
    };
  }

  function dealsHTML() {
    const data = mainState(),
      key = dateKey(),
      tasks = taskData(data, key),
      todayOpen = tasks.relevant.filter(x => !doneTask(x)).length;
    return `<div class="v24-deals-pulse" data-v24-deals><div class="v24-pulse"><b>${tasks.open.length}</b><span>ОТКРЫТО</span></div><div class="v24-pulse"><b>${todayOpen}</b><span>НА СЕГОДНЯ</span></div><div class="v24-pulse ${tasks.overdue.length ? 'alert' : ''}"><b>${tasks.overdue.length}</b><span>ПРОСРОЧЕНО</span></div></div>`;
  }

  function renderDeals() {
    if (innerWidth > 720) return;
    if (!document.getElementById('screenTasks')?.classList.contains('active')) return;
    const shell = document.getElementById('v233shell'),
      tabs = shell?.querySelector('.v233-tabs');
    if (!shell || !tabs) return;
    const html = dealsHTML(),
      sig = hash(html);
    if (sig === lastDeals && shell.querySelector('[data-v24-deals]')) return;
    lastDeals = sig;
    shell.querySelectorAll('[data-v24-deals],[data-v24-deal-actions]').forEach(x => x.remove());
    tabs.insertAdjacentHTML('afterend', html);
  }

  function schedule(delay = 40) {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      renderDeals();
    }, delay);
  }
  function hookCoreRender() {
    try {
      if (typeof renderAll === 'function' && !renderAll.__stackV24) {
        const original = renderAll;
        renderAll = function (...args) {
          const result = original.apply(this, args);
          schedule(25);
          return result;
        };
        renderAll.__stackV24 = true;
      }
    } catch (_e) {}
  }

  function boot() {
    installStyle();
    hookCoreRender();
    document.addEventListener('click', () => schedule(120));
    document.addEventListener('submit', () => schedule(80));
    window.addEventListener('stack:data-changed', () => schedule(50));
    window.addEventListener('stack:screen-change', () => schedule(20));
    window.addEventListener('storage', () => schedule(40));
    renderDeals();
    setTimeout(renderDeals, 180);
    setTimeout(renderDeals, 1200);
    globalThis.STACK_V24 = Object.freeze({ build: BUILD, render: renderDeals });
    console.info('STACK', BUILD);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
