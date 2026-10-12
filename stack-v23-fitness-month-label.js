/* STACK v23.13 — clear month context for the Fitness week selector. */
(() => {
  'use strict';
  function apply() {
    const nav = document.querySelector('#v234Fitness .fx-daynav');
    if (!nav || nav.previousElementSibling?.classList.contains('fx-day-month')) return;
    const active = nav.querySelector('[data-day].on');
    if (!active) return;
    const [y, m, d] = active.dataset.day.split('-').map(Number),
      date = new Date(y, m - 1, d),
      label = document.createElement('div');
    label.className = 'fx-day-month';
    label.textContent = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    nav.before(label);
  }
  const s = document.createElement('style');
  s.textContent =
    '@media(max-width:720px){.fx-day-month{padding:10px 11px 0;font-size:10px;font-weight:600;letter-spacing:.07em;color:var(--ds-text-3);text-shadow:none;text-transform:uppercase}}';
  document.head.appendChild(s);
  globalThis.STACK_FITNESS_SCREEN?.onRender(apply, 60);
  apply();
  console.info('STACK v23.13 fitness month label');
})();
