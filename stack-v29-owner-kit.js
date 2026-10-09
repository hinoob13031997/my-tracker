/* STACK v29.44 — shared kernel for v29 section-owner modules (Analytics,
   Finance, ...). Each owner still renders its own markup/logic; only the
   repeated lifecycle wiring (inject style once, react to data/resize/focus
   events) is shared, so a new update follows one proven pattern instead of
   every owner reimplementing (and re-bugging) its own event plumbing. */
(() => {
  'use strict';
  const BUILD = '29.47.0';
  function installStyle(id, css) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }
  const DEFAULT_EVENTS = ['stack:data-changed', 'stack:data-ready', 'resize'];
  function onRenderTriggers(fn, { extra = [], events } = {}) {
    let queued = false;
    function run() {
      queued = false;
      fn();
    }
    function schedule() {
      if (queued) return;
      queued = true;
      queueMicrotask(run);
    }
    // `events` replaces the default set entirely (for owners that must NOT
    // re-render on resize/focus, e.g. panels with inputs the mobile keyboard
    // would resize); 'visibilitychange' fires only when the page becomes visible.
    (events || [...DEFAULT_EVENTS, ...extra, 'focus', 'visibilitychange']).forEach(name => {
      if (name === 'visibilitychange')
        document.addEventListener(name, () => {
          if (!document.hidden) schedule();
        });
      else window.addEventListener(name, schedule);
    });
    return schedule;
  }
  Object.defineProperty(globalThis, 'STACK_OWNER_KIT', {
    value: Object.freeze({ build: BUILD, installStyle, onRenderTriggers }),
    configurable: true,
  });
  console.info('STACK', BUILD);
})();
