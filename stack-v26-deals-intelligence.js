/* STACK v27.2 — loads stack-v27-bootstrap.js (core, nutrition, Fitness tabs). Compatibility filename kept.
   v29.89: the «PROCESS SCORE» card, the process history sheet and their styles are gone. They read `globalThis.state`, which does not
   exist (`state` is a `let` of the page script, not a property of window), so none of it was ever drawn; the process numbers come from
   STACK_DATA.processStats, shown by «Аналитика». */
(() => {
  'use strict';
  function loadBootstrap() {
    if (globalThis.STACK_BOOTSTRAP || document.getElementById('stackV27BootstrapScript')) return;
    const s = document.createElement('script');
    s.id = 'stackV27BootstrapScript';
    s.src = './stack-v27-bootstrap.js?build=27.2.0';
    s.async = false;
    document.body.appendChild(s);
  }
  function boot() {
    loadBootstrap();
    console.info('STACK v27.2 bootstrap loader ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
