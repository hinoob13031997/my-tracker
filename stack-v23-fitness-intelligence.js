/* STACK v24.6 — goal intelligence with unified nutrition plan and fact. */
(() => {
  'use strict';
  const BUILD = 'v24.6.2-no-dup-nutrition-card';
  const GOAL_KEY = 'stack_fitness_goal_v2318';
  const PROFILE_KEY = 'stack_fitness_profile_v2320';
  const BODY_KEY = 'stack_fitness_log_v2310';

  const css = `@media(max-width:720px){
.fxi-goal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:9px}.fxi-goal-grid span{min-width:0;padding:8px 4px;border:1px solid var(--ds-line);border-radius:var(--ds-r-sm);background:var(--ds-tile);color:var(--ds-text-3);font-size:7px;text-align:center}.fxi-goal-grid b{display:block;margin-bottom:3px;color:#edf6ff;font-size:10px;line-height:1.2}.fxi-card{margin:9px 0;padding:16px;border:1px solid var(--ds-line);border-radius:var(--ds-r-xl);background:var(--ds-card-bg);box-shadow:var(--ds-shadow)}.fxi-card h2{margin:5px 0;font-size:18px}.fxi-note{color:var(--ds-text-3);font-size:9px;line-height:1.5}.fxi-strategy{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}.fxi-strategy div{padding:9px 5px;border:1px solid var(--ds-line);border-radius:var(--ds-r-sm);background:var(--ds-tile);text-align:center}.fxi-strategy b{display:block;margin-bottom:3px;color:#fff;font-size:11px}.fxi-strategy small{color:var(--ds-text-3);font-size:7px}.fxi-planfact{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0}.fxi-box{padding:10px;border:1px solid var(--ds-line);border-radius:var(--ds-r-sm);background:var(--ds-tile)}.fxi-box span{display:block;color:var(--ds-text-3);font-size:7px;font-weight:700}.fxi-box b{display:block;margin:4px 0;color:#f1f7ff;font-size:16px}.fxi-box small{color:var(--ds-text-3);font-size:8px;line-height:1.35}.fxi-bar{height:6px;margin:8px 0 4px;border-radius:99px;background:var(--ds-tile-2);overflow:hidden}.fxi-bar i{display:block;height:100%;border-radius:inherit;background:var(--ds-grad);box-shadow:0 0 10px rgba(139,72,240,.5)}.fxi-recommend{margin-top:10px;padding:12px;border:1px solid rgba(148,131,255,.3);border-radius:var(--ds-r-md);background:var(--ds-accent-soft);color:#d6cdff;font-size:9px;line-height:1.5}.fxi-recommend.good{border-color:rgba(63,214,143,.3);background:rgba(63,214,143,.08);color:#9fe8c4}.fxi-recommend.wait{border-color:rgba(242,180,76,.3);background:rgba(242,180,76,.08);color:#f0cf8e}.fxi-warning{margin-top:10px;padding:10px 12px;border-left:2px solid var(--ds-warn);border-radius:0 var(--ds-r-sm) var(--ds-r-sm) 0;background:rgba(242,180,76,.08);color:#f0cf8e;font-size:8px;line-height:1.45}.fxi-non-gain:not(.fx-custom-nutrition) .fx-plan{display:none!important}
}`;

  function read(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      return v ?? fallback;
    } catch (e) {
      return fallback;
    }
  }
  function esc(v) {
    return String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  }
  function dayKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function goal() {
    const v = read(GOAL_KEY, {});
    return {
      start: Number(v.start) || 56,
      target: Number(v.target) || 70,
      training: v.training === 'trainer' ? 'trainer' : 'stack',
      nutrition: v.nutrition === 'trainer' ? 'trainer' : 'stack',
      meals: Array.isArray(v.meals) ? v.meals : [],
    };
  }
  function profile() {
    const v = read(PROFILE_KEY, {});
    return {
      height: Number(v.height) || 0,
      age: Number(v.age) || 0,
      sex: v.sex || '',
      days: Number(v.days) === 4 ? 4 : 3,
    };
  }
  function bodyEntries() {
    const a = read(BODY_KEY, []);
    return (Array.isArray(a) ? a : [])
      .filter(x => Number(x.body) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  function currentWeight(g) {
    const a = bodyEntries();
    return a.length ? Number(a[a.length - 1].body) : g.start;
  }
  function direction(g) {
    return g.target > g.start ? 'gain' : g.target < g.start ? 'loss' : 'maintain';
  }
  function rateRange(d) {
    return d === 'gain' ? [0.2, 0.4] : d === 'loss' ? [0.25, 0.75] : [0, 0.2];
  }
  function formatDate(d) {
    return d.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }).replace('.', '');
  }
  function goalEstimate(g, w) {
    const d = direction(g),
      left = Math.abs(g.target - w),
      r = rateRange(d),
      reached = d === 'gain' ? w >= g.target : d === 'loss' ? w <= g.target : left < 0.1;
    if (d === 'maintain' || reached)
      return { pace: '±0,2 кг/нед.', eta: d === 'maintain' ? 'Цель удерживается' : 'Цель достигнута' };
    const fast = Math.max(1, Math.ceil(left / r[1])),
      slow = Math.max(fast, Math.ceil(left / r[0])),
      a = new Date(),
      b = new Date();
    a.setDate(a.getDate() + fast * 7);
    b.setDate(b.getDate() + slow * 7);
    return {
      pace: `${String(r[0]).replace('.', ',')}–${String(r[1]).replace('.', ',')} кг/нед.`,
      eta: formatDate(a) + ' — ' + formatDate(b),
    };
  }
  function targets(g, p, w) {
    return globalThis.STACK_DATA.nutritionTargets({ goal: g, profile: p, weight: w });
  }
  function average(a) {
    return a.length ? a.reduce((s, x) => s + Number(x.body), 0) / a.length : null;
  }
  function trend() {
    const a = bodyEntries(),
      now = new Date(),
      cut1 = new Date(now),
      cut2 = new Date(now);
    cut1.setDate(cut1.getDate() - 7);
    cut2.setDate(cut2.getDate() - 14);
    const k1 = dayKey(cut1),
      k2 = dayKey(cut2),
      recent = a.filter(x => x.date >= k1),
      previous = a.filter(x => x.date >= k2 && x.date < k1);
    if (recent.length < 2 || previous.length < 2)
      return { ready: false, recent: recent.length, previous: previous.length };
    const change = average(recent) - average(previous);
    return { ready: true, change, recent: recent.length, previous: previous.length };
  }
  function workoutAdherence() {
    let done = 0,
      skip = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      let v = '';
      try {
        v = localStorage.getItem('stack_fitness_workout_' + dayKey(d)) || '';
      } catch (e) {}
      if (v === '1') done++;
      else if (v === 'skip') skip++;
    }
    return { done, skip, rate: done + skip ? Math.round((done / (done + skip)) * 100) : null };
  }
  function recommendation(g, t) {
    const d = direction(g),
      tr = trend(),
      wa = workoutAdherence();
    if (wa.rate !== null && wa.done + wa.skip >= 3 && wa.rate < 65)
      return {
        tone: 'wait',
        title: 'Сначала верни регулярность',
        text: `Выполнено ${wa.rate}% отмеченных тренировок за 14 дней. Пока не меняй питание: сначала стабилизируй тренировки.`,
      };
    if (!tr.ready)
      return {
        tone: 'wait',
        title: 'STACK собирает базу',
        text: `Нужны минимум две записи веса в каждой из двух соседних недель. Сейчас: ${tr.previous || 0} и ${tr.recent || 0}. До этого калории автоматически не меняются.`,
      };
    if (d === 'gain') {
      if (tr.change < 0.15)
        return {
          tone: '',
          title: 'Вес растёт медленнее ориентира',
          text:
            g.nutrition === 'trainer'
              ? 'Обсуди с диетологом небольшое повышение рациона. STACK не изменяет чужой план автоматически.'
              : 'Если такая динамика сохранится ещё неделю, добавь около 100–150 ккал в день.',
        };
      if (tr.change > 0.5)
        return {
          tone: '',
          title: 'Темп набора выше ориентира',
          text:
            g.nutrition === 'trainer'
              ? 'Покажи динамику диетологу перед изменением плана.'
              : 'Если темп подтвердится ещё неделю, уменьши рацион примерно на 100–150 ккал.',
        };
    }
    if (d === 'loss') {
      const loss = -tr.change;
      if (loss < 0.2)
        return {
          tone: '',
          title: 'Снижение медленнее ориентира',
          text:
            g.nutrition === 'trainer'
              ? 'Согласуй изменение с диетологом.'
              : 'Если режим соблюдается, можно уменьшить ориентир примерно на 100–150 ккал.',
        };
      if (loss > 0.8)
        return {
          tone: 'wait',
          title: 'Вес снижается слишком быстро',
          text:
            g.nutrition === 'trainer'
              ? 'Обсуди темп с диетологом.'
              : 'Не усиливай дефицит; рассмотри повышение рациона на 100–150 ккал.',
        };
    }
    if (d === 'maintain' && Math.abs(tr.change) > 0.3)
      return {
        tone: '',
        title: 'Вес вышел из диапазона поддержания',
        text: `Средняя масса изменилась на ${tr.change > 0 ? '+' : ''}${tr.change.toFixed(1).replace('.', ',')} кг. Скорректируй рацион небольшим шагом около 100 ккал.`,
      };
    return {
      tone: 'good',
      title: 'План работает',
      text: `Средняя недельная динамика ${tr.change > 0 ? '+' : ''}${tr.change.toFixed(1).replace('.', ',')} кг. Сохраняй текущий режим и оцени снова через неделю.`,
    };
  }
  function strategy(g, p) {
    const d = direction(g),
      days = globalThis.STACK_DATA?.programPosition?.(new Date())?.phase?.days || p.days || 3;
    /* the real program phase, not the profile guess: it used to say 3/week during the 4/week phases */ if (
      g.training === 'trainer'
    )
      return {
        title: 'Активен план тренера',
        focus: 'STACK сохраняет структуру тренера',
        volume: 'Без автозамены плана',
        control: 'Аналитика результатов',
        note: 'Цель и динамика отслеживаются, но STACK не меняет упражнения и объём тренерской программы.',
      };
    if (d === 'gain')
      return {
        title: 'Режим · набор массы',
        focus: 'Сила + мышечный объём',
        volume: `${days} тренировки/нед.`,
        control: 'Рост веса и рабочих весов',
        note: 'Основные движения сохраняются для измеримого прогресса; вспомогательные меняются четырёхнедельными циклами.',
      };
    if (d === 'loss')
      return {
        title: 'Режим · снижение веса',
        focus: 'Сохранение силы',
        volume: `${days} тренировки/нед.`,
        control: 'Вес вниз, сила стабильна',
        note: 'Не требуется постоянно менять упражнения: при дефиците приоритет — сохранить технику, рабочие веса и регулярность.',
      };
    return {
      title: 'Режим · поддержание',
      focus: 'Сила без перегруза',
      volume: `${days} тренировки/нед.`,
      control: 'Стабильный вес и форма',
      note: 'Объём умеренный; разгрузки и ротация продолжаются по четырёхнедельным циклам.',
    };
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }
  function enhanceGoal(card, g, p, w, t) {
    const est = goalEstimate(g, w),
      target = t ? `${t.kcal} ккал` : 'заполни профиль',
      html = `<div class="fxi-goal-grid" data-fxi-goal><span><b>${esc(est.pace)}</b>ориентир темпа</span><span><b>${esc(est.eta)}</b>срок цели</span><span><b>${esc(target)}</b>дневной ориентир</span></div>`,
      sig = hash(html);
    let old = card.querySelector('[data-fxi-goal]');
    if (!old) {
      card.insertAdjacentHTML('beforeend', html);
      old = card.querySelector('[data-fxi-goal]');
    } else if (old.dataset.sig !== sig) {
      old.outerHTML = html;
      old = card.querySelector('[data-fxi-goal]');
    }
    if (old) old.dataset.sig = sig;
  }
  function strategyCard(g, p) {
    const s = strategy(g, p);
    return `<section class="fxi-card" data-fxi-program><div class="fx-eye">ЦЕЛЬ → ПРОГРАММА</div><h2>${s.title}</h2><div class="fxi-strategy"><div><b>${s.focus}</b><small>ГЛАВНЫЙ АКЦЕНТ</small></div><div><b>${s.volume}</b><small>НЕДЕЛЬНЫЙ РЕЖИМ</small></div><div><b>${s.control}</b><small>КОНТРОЛЬ</small></div></div><div class="fxi-note">${s.note}</div></section>`;
  }
  function progressCard(g, t) {
    const tr = trend(),
      wa = workoutAdherence(),
      r = recommendation(g, t),
      trendText = tr.ready
        ? `${tr.change > 0 ? '+' : ''}${tr.change.toFixed(1).replace('.', ',')} кг`
        : 'недостаточно данных',
      target = t ? `${t.kcal} ккал · ${t.protein}Б/${t.fat}Ж/${t.carbs}У` : 'заполни рост, возраст и пол';
    return `<section class="fxi-card" data-fxi-progress><div class="fx-eye">АДАПТАЦИЯ · 14 ДНЕЙ</div><h2>Нужно ли менять план?</h2><div class="fxi-planfact"><div class="fxi-box"><span>СРЕДНЯЯ ДИНАМИКА</span><b style="font-size:13px">${trendText}</b><small>последние 7 дней к предыдущим 7</small></div><div class="fxi-box"><span>ТРЕНИРОВКИ</span><b>${wa.rate === null ? '—' : wa.rate + '%'}</b><small>${wa.done} выполнено · ${wa.skip} пропущено</small></div></div><div class="fxi-note">Расчётный ориентир: ${target}. Это стартовая оценка, а не медицинское назначение.</div><div class="fxi-recommend ${r.tone}"><b>${r.title}</b><br>${r.text}</div></section>`;
  }
  function upsert(body, anchor, selector, html) {
    const sig = hash(html);
    let old = body.querySelector(selector);
    if (!old) {
      anchor.insertAdjacentHTML('afterend', html);
      old = body.querySelector(selector);
    } else if (old.dataset.sig !== sig) {
      old.outerHTML = html;
      old = body.querySelector(selector);
    }
    if (old) old.dataset.sig = sig;
  }
  function draw() {
    const root = document.getElementById('v234Fitness'),
      tab = root?.querySelector('[data-v234].on')?.dataset.v234,
      body = root?.querySelector(
        tab === 'progress'
          ? '#v234Progress'
          : tab === 'today'
            ? '#v234Today'
            : tab === 'nutrition'
              ? '#v234Nutrition'
              : '.v234-body'
      ),
      card = body?.querySelector('[data-goal-card]');
    if (!root || !body || !tab || !card) return;
    const g = goal(),
      p = profile(),
      w = currentWeight(g),
      t = targets(g, p, w);
    root.classList.toggle('fxi-non-gain', g.nutrition === 'stack' && direction(g) !== 'gain');
    enhanceGoal(card, g, p, w, t);
    if (tab === 'program') upsert(body, card, '[data-fxi-program]', strategyCard(g, p));
    if (tab === 'progress') {
      const anchor = body.querySelector('[data-engine-progress]') || card;
      upsert(body, anchor, '[data-fxi-progress]', progressCard(g, t));
    }
  }
  const style = document.createElement('style');
  style.id = 'v2322IntelligenceStyle';
  style.textContent = css;
  document.head.appendChild(style);
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      draw();
    });
  }
  globalThis.STACK_FITNESS_SCREEN?.onRender(draw, 40);
  window.addEventListener('storage', schedule);
  window.addEventListener('stack:nutrition-changed', schedule);
  draw();
  console.info('STACK', BUILD);
})();
