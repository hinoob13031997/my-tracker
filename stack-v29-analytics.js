/* STACK v29.17 — Analytics becomes the v29-shell owner of #screenAnalytics.
   Primary: STACK Score, domain scores, one verdict, trend. Old KPI rings/
   charts/trend chart and backup/export/import stay available but secondary
   (behind a toggle), reusing stack-v27-core.js's snapshot/insight/weekly
   and the existing weekly-review / 90-day-focus modal (data-v27-week /
   data-v27-onboard) instead of duplicating that logic.
   v29.17.1 — style/trigger wiring now goes through stack-v29-owner-kit.js
   when present, with the original inline logic kept as a fallback. */
(() => {
  'use strict';
  const BUILD = '29.17.2';
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const MOBILE = () => innerWidth <= 720;
  let expanded = false,
    last = '';
  function screen() {
    return document.getElementById('screenAnalytics');
  }
  function core() {
    return globalThis.STACK_CORE;
  }
  function claim() {
    const s = screen();
    if (s && !s.dataset.stackAnalyticsOwner) s.dataset.stackAnalyticsOwner = 'v29';
  }
  function trendBadge(t) {
    if (!Number.isFinite(t)) return '';
    if (t === 0) return '<span class="v29a-trend flat">→ 0</span>';
    return `<span class="v29a-trend ${t > 0 ? 'up' : 'down'}">${t > 0 ? '↑ +' + t : '↓ ' + t}</span>`;
  }
  /* the same ring as the day's progress on «Сегодня» (drawn by the shell); a bare number when the shell is not there */
  function scoreRing(score) {
    const ring = globalThis.STACK_V29_SHELL?.ring;
    return ring && Number.isFinite(score) ? ring(score, String(score)) : `<b>${esc(score)}</b><small>/ 100</small>`;
  }
  function domainCard(label, route, score) {
    const v = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
    return `<button type="button" class="v29a-domain" data-v29a-route="${route}"><span>${label}</span><b>${Number.isFinite(score) ? score : '—'}</b><i style="--v:${v}%"></i></button>`;
  }
  /* last file backup: «Скачать копию» is the only thing that survives a lost phone, so the age is shown (and warned about) here and on «Сегодня» */
  function backupLine() {
    const st = globalThis.STACK_DATA?.backupStatus?.();
    if (!st || st.days === null) return '';
    const when = st.days === 0 ? 'сегодня' : `${st.days} дн. назад`;
    return `<p class="v29a-backup${st.due ? ' warn' : ''}">${st.everBackedUp ? `Файл копии: ${when}` : 'Файл копии ещё не скачивали'}${st.due ? (st.everBackedUp ? ' — пора обновить' : ' — пора скачать') : ''}</p>`;
  }
  /* restore points (stack-persistence.js): newest state per 15 min / day / month, plus the state right before an import / delete */
  const REASONS = {
    auto: 'Авто',
    boot: 'При запуске',
    'before-import': 'Перед импортом',
    'before-restore': 'Перед восстановлением',
    'before-delete': 'Перед удалением',
    legacy: 'Старая копия',
  };
  const fmtWhen = ts =>
    new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  function closeRestore() {
    document.getElementById('v29aRestore')?.remove();
  }
  async function openRestore() {
    closeRestore();
    const sheet = document.createElement('div');
    sheet.id = 'v29aRestore';
    sheet.className = 'v29a-sheet';
    sheet.innerHTML =
      '<div class="v29a-sheet-card" role="dialog" aria-modal="true" aria-label="Точки восстановления"><header><b>Точки восстановления</b><button type="button" data-v29a-close aria-label="Закрыть">×</button></header><p>Процессы, задачи, финансы, Fitness и питание на выбранный момент. Текущее состояние перед возвратом тоже сохранится.</p><div class="v29a-snaps" data-v29a-snaps><small>Загружаю…</small></div></div>';
    document.body.appendChild(sheet);
    let items = [];
    try {
      items = await globalThis.STACK_RECOVERY.list();
    } catch (_) {}
    const box = sheet.querySelector('[data-v29a-snaps]');
    if (!box || !sheet.isConnected) return;
    const row = x =>
      `<button type="button" class="v29a-snap" data-v29a-snap="${esc(x.id)}"><span>${esc(fmtWhen(x.ts))}</span><small>${esc(REASONS[x.reason] || x.reason)}${x.stats ? ` · ${x.stats.processes} проц. · ${x.stats.marks} отметок · ${x.stats.tasks} задач` : ''}</small><i>Вернуть</i></button>`;
    const shown = [
      ...items.filter(x => x.reason !== 'legacy'),
      ...items.filter(x => x.reason === 'legacy').slice(0, 6),
    ];
    box.innerHTML = shown.length
      ? shown.map(row).join('')
      : '<small>Точек пока нет — они появятся после первых изменений.</small>';
  }
  async function doRestore(id, btn) {
    const when = btn.querySelector('span')?.textContent || '';
    if (!confirm(`Вернуть данные на ${when}? Текущее состояние будет сохранено как точка восстановления.`)) return;
    try {
      await globalThis.STACK_RECOVERY.restore(id);
    } catch (err) {
      alert('Не удалось восстановить: ' + (err?.message || 'ошибка'));
    }
  }
  function page() {
    const c = core();
    if (!c?.snapshot)
      return '<div class="v29a-page"><header><div class="v29a-kicker">STACK · АНАЛИТИКА</div><h1>Аналитика</h1><p>Что означают твои данные и куда движется система</p></header><section class="v29a-hero wait"><div class="v29a-verdict"><b>STACK ещё загружается</b><p>Обнови экран через пару секунд.</p></div></section></div>';
    const s = c.snapshot(),
      i = c.insight?.(s) || { tone: 'wait', title: 'STACK собирает базу', text: '' },
      w = c.weekly?.(s) || { summary: '' },
      d = s.domains || {},
      f = s.focus || {};
    const domains = [
      domainCard('ПРОЦЕССЫ', 'deals', d.processes?.score),
      domainCard('ЗАДАЧИ', 'deals', d.tasks?.score),
      domainCard('FITNESS', 'fitness', d.fitness?.score),
      domainCard('ФИНАНСЫ', 'finance', d.finance?.score),
    ];
    const focusBlock = f.goal
      ? `<div class="v29a-focus"><span>ФОКУС 90 ДНЕЙ · ${esc(String(f.area || '').toUpperCase())}</span><b>${esc(f.goal)}</b></div>`
      : '<button type="button" class="v29a-onboard" data-v27-onboard>Настроить фокус на 90 дней</button>';
    return (
      `<div class="v29a-page"><header><div class="v29a-kicker">STACK · АНАЛИТИКА</div><h1>Аналитика</h1><p>Что означают твои данные и куда движется система</p></header>` +
      `<section class="v29a-hero ${esc(i.tone || '')}"><div class="v29a-score">${scoreRing(s.score)}<div class="v29a-score-label"><span>STACK SCORE</span><strong>из 100</strong></div>${trendBadge(s.trend)}</div><div class="v29a-verdict"><b>${esc(i.title || '')}</b><p>${esc(i.text || '')}</p></div></section>` +
      `<div class="v29a-domains">${domains.join('')}</div>` +
      `<button type="button" class="v29a-week" data-v27-week><span>НЕДЕЛЬНЫЙ ОБЗОР</span><b>${esc(w.title || i.title || '')}</b><small>${esc(w.summary || '')}</small></button>` +
      focusBlock +
      `<button type="button" class="v29a-toggle" data-v29a-toggle>${expanded ? 'Скрыть графики и историю' : 'Показать графики и историю'}</button>` +
      `<div class="v29a-tools"><span>ДАННЫЕ</span><div><button type="button" data-v29a-tool="export">Скачать копию</button><button type="button" data-v29a-tool="import">Импорт</button><button type="button" data-v29a-restore>Точки восстановления</button></div>${backupLine()}</div>` +
      `</div>`
    );
  }
  function applyExpanded() {
    const s = screen();
    if (s) s.classList.toggle('v29a-expanded', expanded);
  }
  function render() {
    if (!MOBILE()) return;
    const s = screen();
    if (!s) return;
    claim();
    s.classList.add('v29a-ready');
    applyExpanded();
    const html = page(),
      sig = expanded + '|' + html;
    if (sig === last) return;
    last = sig;
    let root = document.getElementById('v29Analytics');
    if (!root) {
      root = document.createElement('div');
      root.id = 'v29Analytics';
      s.prepend(root);
    }
    root.innerHTML = html;
  }
  function route(name) {
    document.querySelector(`[data-v29-nav="${name}"]`)?.click();
  }
  function tool(name) {
    const id =
      name === 'backup' ? 'stackBackupBtn' : name === 'export' ? 'exportBtn' : name === 'import' ? 'importBtn' : '';
    document.getElementById(id)?.click();
  }
  function schedule(delay = 0) {
    if (delay) {
      setTimeout(render, delay);
      return;
    }
    render();
  }
  const css = `@media(max-width:720px){
#screenAnalytics.v29a-ready>#v24More,#screenAnalytics.v29a-ready>#v282AnalyticsSummary{display:none!important}
#screenAnalytics.v29a-ready:not(.v29a-expanded)>#kpis,#screenAnalytics.v29a-ready:not(.v29a-expanded)>.mobile-kpi-hint,#screenAnalytics.v29a-ready:not(.v29a-expanded)>.analytics,#screenAnalytics.v29a-ready:not(.v29a-expanded)>.trend-panel{display:none!important}
#v29Analytics,#v29Analytics *{box-sizing:border-box;min-width:0}
.v29a-page{display:grid;gap:12px;padding:2px 2px 10px}
.v29a-page header{padding:6px 2px 4px}
.v29a-kicker{font-size:12px;letter-spacing:.07em;color:var(--ds-text-3);font-weight:600;text-transform:uppercase}
.v29a-page h1{margin:6px 0 0;font-size:34px;line-height:1.05;font-weight:800;letter-spacing:-.03em;color:var(--ds-text)}
.v29a-page header p{margin:6px 0 0;color:var(--ds-text-2);font-size:14px;line-height:1.4}
.v29a-hero{position:relative;padding:16px 16px 18px;border:1px solid var(--ds-line);border-radius:var(--ds-r-xl);background:radial-gradient(120% 150% at 0 0,rgba(139,72,240,.17),transparent 58%),var(--ds-card-bg);box-shadow:var(--ds-shadow)}
.v29a-hero.bad{background:radial-gradient(120% 150% at 0 0,rgba(255,99,130,.13),transparent 58%),var(--ds-card-bg)}
.v29a-hero.good{background:radial-gradient(120% 150% at 0 0,rgba(63,214,143,.13),transparent 58%),var(--ds-card-bg)}
.v29a-score{display:flex;align-items:center;gap:14px}
.v29a-score>b{font-size:44px;line-height:1;font-weight:800;letter-spacing:-.04em;color:var(--ds-text);font-variant-numeric:tabular-nums}
.v29a-score .v29-ring b{font-size:22px}
.v29a-score small{color:var(--ds-text-3);font-size:10px}
.v29a-score-label{display:grid;gap:2px}
.v29a-score-label span{color:var(--ds-text-3);font-size:11px;font-weight:600;letter-spacing:.07em}
.v29a-score-label strong{font-size:15px;font-weight:600;color:var(--ds-text-2)}
.v29a-trend{margin-left:auto;align-self:flex-start;font-size:13px;font-weight:700;padding:5px 10px;border-radius:999px;border:0;background:var(--ds-tile-2);color:var(--ds-text-2);font-variant-numeric:tabular-nums}
.v29a-trend.up{color:var(--ds-ok);background:rgba(63,214,143,.12)}
.v29a-trend.down{color:var(--ds-bad);background:rgba(255,99,130,.12)}
.v29a-trend.flat{color:var(--ds-text-3)}
.v29a-verdict{margin-top:14px}
.v29a-verdict b{display:block;font-size:17px;font-weight:700;letter-spacing:-.01em}
.v29a-verdict p{margin:6px 0 0;color:var(--ds-text-2);font-size:10px;line-height:1.5}
.v29a-domains{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.v29a-domain{min-height:84px;padding:12px 14px;border:1px solid var(--ds-line);border-radius:var(--ds-r-lg);background:var(--ds-card-bg);box-shadow:var(--ds-shadow);color:var(--ds-text);text-align:left}
.v29a-domain span{display:block;color:var(--ds-text-3);font-size:8px;font-weight:600;letter-spacing:.07em}
.v29a-domain b{display:block;margin-top:6px;font-size:26px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.v29a-domain i{display:block;height:4px;margin-top:10px;border-radius:99px;background:linear-gradient(90deg,#3b6ff2,#8b48f0 60%,#e03aa0) 0 0/var(--v,0%) 100% no-repeat,var(--ds-tile-2)}
.v29a-week,.v29a-onboard{width:100%;min-height:48px;border:1px solid var(--ds-line);border-radius:var(--ds-r-lg);background:var(--ds-card-bg);box-shadow:var(--ds-shadow);color:var(--ds-text);padding:14px 16px;text-align:left}
.v29a-week span{display:block;font-size:8px;font-weight:600;letter-spacing:.07em;color:var(--ds-text-3)}
.v29a-week b{display:block;margin-top:5px;font-size:15px;font-weight:700}
.v29a-week small{display:block;margin-top:5px;color:var(--ds-text-2);font-size:8px;line-height:1.45}
.v29a-onboard{text-align:center;font-size:15px;font-weight:600;color:#d6cdff;background:var(--ds-accent-soft);border-color:rgba(148,131,255,.3)}
.v29a-focus{padding:14px 16px;border:1px solid var(--ds-line);border-left:3px solid #8b48f0;border-radius:var(--ds-r-md);background:var(--ds-card-bg);box-shadow:var(--ds-shadow)}
.v29a-focus span{display:block;font-size:11px;font-weight:600;letter-spacing:.07em;color:var(--ds-text-3)}
.v29a-focus b{display:block;margin-top:5px;font-size:15px;font-weight:600}
.v29a-toggle{width:100%;min-height:48px;border:1px solid var(--ds-line);border-radius:var(--ds-r-md);background:var(--ds-tile);color:var(--ds-text);font-size:10px;font-weight:600}
.v29a-tools{margin-top:8px}
.v29a-tools>span{display:block;margin:0 2px 8px;font-size:8px;font-weight:600;color:var(--ds-text-3);letter-spacing:.07em}
.v29a-tools>div{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.v29a-tools button{min-height:52px;border:1px solid var(--ds-line);border-radius:var(--ds-r-md);background:var(--ds-tile);color:var(--ds-text);font-size:10px;font-weight:500;line-height:1.2}
.v29a-backup{margin:8px 2px 0;color:var(--ds-text-3);font-size:12px}
.v29a-backup.warn{color:var(--ds-warn)}
.v29a-sheet{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:var(--ds-overlay);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.v29a-sheet-card{width:100%;max-height:82dvh;overflow:auto;padding:14px 16px calc(16px + env(safe-area-inset-bottom));border:1px solid var(--ds-line-2);border-bottom:0;border-radius:26px 26px 0 0;background:var(--ds-sheet-bg);color:var(--ds-text);box-shadow:0 -20px 60px -20px rgba(0,0,0,.8)}
.v29a-sheet-card header{display:flex;align-items:center;justify-content:space-between}
.v29a-sheet-card header b{font-size:17px;font-weight:700}
.v29a-sheet-card header button{width:44px;height:44px;border:0;background:none;color:#c9d4e2;font-size:24px}
.v29a-sheet-card p{margin:2px 0 10px;color:var(--ds-text-3);font-size:11px;line-height:1.5}
.v29a-snaps{display:grid;gap:6px}
.v29a-snaps>small{color:var(--ds-text-3);font-size:11px}
.v29a-snap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:center;min-height:56px;padding:9px 14px;border:1px solid var(--ds-line);border-radius:var(--ds-r-md);background:var(--ds-tile);color:var(--ds-text);text-align:left}
.v29a-snap span{font-size:13px;font-weight:700}
.v29a-snap small{grid-column:1;color:var(--ds-text-3);font-size:10px}
.v29a-snap i{grid-row:1/span 2;grid-column:2;font-style:normal;color:#b5a8ff;font-size:13px;font-weight:600}
}`;
  function install() {
    const kit = globalThis.STACK_OWNER_KIT;
    if (kit) {
      kit.installStyle('stackV29AnalyticsStyle', css);
      return;
    }
    if (document.getElementById('stackV29AnalyticsStyle')) return;
    const s = document.createElement('style');
    s.id = 'stackV29AnalyticsStyle';
    s.textContent = css;
    document.head.appendChild(s);
  }
  function onClick(e) {
    const t = e.target.closest?.('[data-v29a-toggle]');
    if (t) {
      expanded = !expanded;
      last = '';
      render();
      if (expanded && typeof renderAll === 'function') renderAll();
      return;
    }
    const r = e.target.closest?.('[data-v29a-route]');
    if (r) {
      route(r.dataset.v29aRoute);
      return;
    }
    const b = e.target.closest?.('[data-v29a-tool]');
    if (b) {
      tool(b.dataset.v29aTool);
      return;
    }
    if (e.target.closest?.('[data-v29a-restore]')) {
      openRestore();
      return;
    }
    if (e.target.id === 'v29aRestore' || e.target.closest?.('[data-v29a-close]')) {
      closeRestore();
      return;
    }
    const sn = e.target.closest?.('[data-v29a-snap]');
    if (sn) {
      doRestore(sn.dataset.v29aSnap, sn);
      return;
    }
  }
  function boot() {
    install();
    claim();
    render();
    document.addEventListener('click', onClick);
    const kit = globalThis.STACK_OWNER_KIT;
    if (kit) kit.onRenderTriggers(() => schedule(), { extra: ['stack:backup-done'] });
    else {
      window.addEventListener('stack:data-changed', () => schedule());
      window.addEventListener('stack:data-ready', () => schedule());
      window.addEventListener('resize', () => schedule());
      window.addEventListener('focus', () => schedule());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) schedule();
      });
    }
    setTimeout(() => schedule(), 700);
    setTimeout(() => schedule(), 1900);
    setTimeout(() => schedule(), 3500);
    globalThis.STACK_ANALYTICS_V29 = Object.freeze({ build: BUILD, render });
    console.info('STACK', BUILD);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
