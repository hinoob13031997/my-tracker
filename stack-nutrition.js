/* STACK v29.63 — Nutrition, one owner module.
   Replaces eight files that each rendered, hid or reordered part of Fitness → Питание
   (stack-v27-3-nutrition, -3-1-overflow, -4-nutrition-goals, -5-quick-foods, -5-1-simplify,
   -5-2-minimal, -5-3-ration, -5-5-reorder). Only three blocks were ever visible; they are rendered
   here in the order CLAUDE.md requires: 1. Моя цель (goal card, stack-v23-fitness-goals.js)
   2. План / факт  3. Рацион  4. Добавить еду. One set of render triggers, no hide/reorder layer.
   v29.68: product swaps in the ration (stack_nutrition_swaps_v2968: '<variant>-<meal>-<pos>' → food),
   STACK_NUTRITION.dayFact(date) for Today and the STACK Score.
   Storage keys are unchanged: stack_fitness_nutrition_v2310, stack_nutrition_targets_v274,
   stack_nutrition_quick_foods_v275, stack_fitness_nutrition_plan_v2311,
   stack_fitness_nutrition_variant_v241 (+ stack_fitness_goal_v2318 / _profile_v2320 / _log_v2310 read-only). */
(() => {
  'use strict';
  const BUILD = '29.68.0';

  /* ---- 2. План / факт: targets (STACK calculation or manual), today's fact, plan card ---- */
  const Goals = (() => {
    const BUILD = '27.4.5-fat-25pct',
      NUTRITION_KEY = 'stack_fitness_nutrition_v2310',
      GOAL_KEY = 'stack_fitness_goal_v2318',
      PROFILE_KEY = 'stack_fitness_profile_v2320',
      BODY_KEY = 'stack_fitness_log_v2310',
      CUSTOM_KEY = 'stack_nutrition_targets_v274';
    const read = (k, f) => {
      try {
        const v = JSON.parse(localStorage.getItem(k) || 'null');
        return v ?? f;
      } catch (_) {
        return f;
      }
    };
    const today = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const n = v => Number(v) || 0,
      clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function goal() {
      const g = read(GOAL_KEY, {});
      return { start: n(g.start) || 56, target: n(g.target) || 70 };
    }
    function profile() {
      const p = read(PROFILE_KEY, {});
      return { height: n(p.height), age: n(p.age), sex: p.sex || '', days: n(p.days) === 4 ? 4 : 3 };
    }
    function weight(g) {
      const a = read(BODY_KEY, []);
      const xs = (Array.isArray(a) ? a : [])
        .filter(x => n(x.body) > 0)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      return xs.length ? n(xs[xs.length - 1].body) : g.start;
    }
    function calculated() {
      const g = goal(),
        t = globalThis.STACK_DATA?.nutritionTargets?.({ goal: g, profile: read(PROFILE_KEY, {}), weight: weight(g) });
      return t ? { ...t, source: 'Расчёт STACK' } : null;
    }
    function missing() {
      const p = profile(),
        m = [];
      if (!p.height) m.push('рост');
      if (!p.age) m.push('возраст');
      if (!['male', 'female'].includes(p.sex)) m.push('пол');
      return m;
    }
    function targets() {
      const c = read(CUSTOM_KEY, null);
      if (c && n(c.kcal) > 0)
        return { kcal: n(c.kcal), protein: n(c.protein), fat: n(c.fat), carbs: n(c.carbs), source: 'Твои цели' };
      return calculated();
    }
    function fact() {
      const a = read(NUTRITION_KEY, []),
        d = today(),
        m = (Array.isArray(a) ? a : [])
          .filter(x => x.date === d)
          .reduce(
            (s, x) => ({
              kcal: s.kcal + n(x.kcal),
              protein: s.protein + n(x.protein),
              fat: s.fat + n(x.fat),
              carbs: s.carbs + n(x.carbs),
            }),
            { kcal: 0, protein: 0, fat: 0, carbs: 0 }
          );
      let r = null;
      try {
        r = globalThis.STACK_RATION?.snapshot?.().fact || null;
      } catch (_) {}
      return r
        ? {
            kcal: m.kcal + n(r.kcal),
            protein: m.protein + n(r.protein),
            fat: m.fat + n(r.fat),
            carbs: m.carbs + n(r.carbs),
          }
        : m;
    }
    function metric(label, key, t, f, unit) {
      const plan = n(t[key]),
        got = n(f[key]),
        pct = plan ? Math.round((got / plan) * 100) : 0,
        left = Math.max(0, Math.round((plan - got) * 10) / 10),
        over = Math.max(0, Math.round((got - plan) * 10) / 10);
      return `<div class="v274-metric"><div><span>${label}</span><b>${Math.round(got * 10) / 10} / ${Math.round(plan * 10) / 10} ${unit}</b></div><strong>${pct}%</strong><i><em style="width:${clamp(pct, 0, 100)}%"></em></i><small>${over ? `перебор +${over} ${unit}` : `осталось ${left} ${unit}`}</small></div>`;
    }
    function insight(t, f) {
      const kp = t.kcal ? Math.round((f.kcal / t.kcal) * 100) : 0,
        pp = t.protein ? Math.round((f.protein / t.protein) * 100) : 0;
      if (kp > 110)
        return {
          tone: 'over',
          title: 'Калории выше плана',
          text: `Сегодня ${f.kcal} из ${t.kcal} ккал. Не компенсируй резким ограничением завтра — вернись к обычному плану.`,
        };
      if (kp >= 90 && kp <= 110 && pp >= 90)
        return {
          tone: 'good',
          title: 'День близко к плану',
          text: `Калории ${kp}% · белок ${pp}%. Сохраняй текущий режим.`,
        };
      if (kp >= 75 && pp < 75)
        return {
          tone: 'warn',
          title: 'Белка пока мало',
          text: `Калории уже ${kp}%, а белок ${pp}%. Следующий приём пищи разумно сместить в сторону белка.`,
        };
      return {
        tone: '',
        title: 'Осталось на сегодня',
        text: `${Math.max(0, t.kcal - f.kcal)} ккал · ${Math.max(0, Math.round((t.protein - f.protein) * 10) / 10)} г белка · ${Math.max(0, Math.round((t.fat - f.fat) * 10) / 10)} г жиров · ${Math.max(0, Math.round((t.carbs - f.carbs) * 10) / 10)} г углеводов.`,
      };
    }
    function edit() {
      const t = targets() || { kcal: 0, protein: 0, fat: 0, carbs: 0 };
      let m = document.getElementById('v274GoalsModal');
      if (!m) {
        m = document.createElement('div');
        m.id = 'v274GoalsModal';
        m.className = 'v274-modal';
        document.body.appendChild(m);
      }
      m.innerHTML = `<div class="v274-sheet"><button type="button" data-v274-close>×</button><span>ЦЕЛИ ПИТАНИЯ</span><h2>Дневной план</h2><p>Можно использовать расчёт STACK или задать свои значения.</p><form data-v274-form><label>Ккал<input name="kcal" type="number" min="1" required value="${Math.round(t.kcal)}"></label><div class="v274-formgrid"><label>Белки, г<input name="protein" type="number" min="0" step="1" value="${Math.round(t.protein)}"></label><label>Жиры, г<input name="fat" type="number" min="0" step="1" value="${Math.round(t.fat)}"></label><label>Углеводы, г<input name="carbs" type="number" min="0" step="1" value="${Math.round(t.carbs)}"></label></div><button class="v274-save">СОХРАНИТЬ ЦЕЛИ</button><button type="button" class="v274-auto" data-v274-auto>ВЕРНУТЬ РАСЧЁТ STACK</button></form></div>`;
      m.classList.add('open');
      m.querySelector('[data-v274-close]').onclick = () => m.classList.remove('open');
      m.querySelector('[data-v274-auto]').onclick = () => {
        localStorage.removeItem(CUSTOM_KEY);
        m.classList.remove('open');
        window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'nutrition-targets-auto' } }));
        render();
      };
      m.querySelector('[data-v274-form]').onsubmit = e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          v = { kcal: n(f.get('kcal')), protein: n(f.get('protein')), fat: n(f.get('fat')), carbs: n(f.get('carbs')) };
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(v));
        m.classList.remove('open');
        window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'nutrition-targets-v274' } }));
        render();
      };
    }
    function render() {
      if (innerWidth > 720 || !document.querySelector('[data-v234="nutrition"]')?.classList.contains('on')) return;
      const body = document.querySelector('#v234Fitness #v234Nutrition');
      if (!body) return;
      const t = targets();
      let className, html;
      if (!t) {
        className = 'v274-card v274-setup';
        html = `<span>ПЛАН ПИТАНИЯ</span><h2>Задай цель на день</h2><p>КБЖУ считается автоматически по весу, цели и профилю. Не хватает: <b>${missing().join(', ') || 'данных профиля'}</b> — заполни в настройках. Или введи КБЖУ вручную.</p><div class="v274-setup-actions"><button class="v274-setup-secondary" data-goal-settings>РОСТ / ВОЗРАСТ / ПОЛ</button><button data-v274-edit>ЗАДАТЬ ВРУЧНУЮ</button></div>`;
      } else {
        const f = fact(),
          x = insight(t, f);
        className = 'v274-card';
        html = `<div class="v274-title"><div><span>ПЛАН / ФАКТ · СЕГОДНЯ</span><h2>${Math.round(f.kcal)} <small>/ ${Math.round(t.kcal)} ккал</small></h2><p>${t.source}${t.source === 'Твои цели' && calculated() ? ` · расчёт STACK ${calculated().kcal} ккал` : ''}${t.warning ? ` · ${t.warning}` : ''}</p></div><button data-v274-edit>ИЗМЕНИТЬ</button></div><div class="v274-metrics">${metric('КАЛОРИИ', 'kcal', t, f, 'ккал')}${metric('БЕЛКИ', 'protein', t, f, 'г')}${metric('ЖИРЫ', 'fat', t, f, 'г')}${metric('УГЛЕВОДЫ', 'carbs', t, f, 'г')}</div><div class="v274-insight ${x.tone}"><b>${x.title}</b><span>${x.text}</span></div>`;
      }
      let p = document.getElementById('v274NutritionGoals'),
        created = false;
      if (!p) {
        p = document.createElement('section');
        p.id = 'v274NutritionGoals';
        body.prepend(p);
        created = true;
      }
      if (created || p.className !== className || p.innerHTML !== html) {
        p.className = className;
        p.innerHTML = html;
        p.querySelector('[data-v274-edit]').onclick = edit;
      }
    }
    function style() {
      if (document.getElementById('v274NutritionGoalsStyle')) return;
      const s = document.createElement('style');
      s.id = 'v274NutritionGoalsStyle';
      s.textContent = `@media(max-width:720px){.v274-card{width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin:0 0 10px;padding:14px;border:1px solid #275777;border-radius:17px;background:radial-gradient(circle at 100% 0,#0eb1db1c,transparent 45%),linear-gradient(155deg,#071522,#030914)}.v274-title{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.v274-title span,.v274-setup>span{font-size:8px;color:#8290a6;font-weight:900;letter-spacing:.09em}.v274-title h2,.v274-setup h2{margin:4px 0;font-size:22px}.v274-title h2 small{font-size:12px;color:#8796aa}.v274-title p,.v274-setup p{margin:0;color:#8190a5;font-size:8px;line-height:1.5}.v274-title button,.v274-setup button{min-height:38px;border:1px solid #0eb1db;border-radius:9px;background:#071724;color:#e8fbff;font-size:8px;font-weight:900;padding:0 10px}.v274-setup-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px;margin-top:11px}.v274-setup-actions button{width:100%;min-width:0;padding:0 6px}.v274-setup-secondary{border-color:#29455e!important;background:#071321!important;color:#9fb0c5!important}.v274-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:12px}.v274-metric{min-width:0;padding:10px;border:1px solid #183b55;border-radius:11px;background:#050e19}.v274-metric>div{display:flex;justify-content:space-between;gap:5px}.v274-metric span{display:block;color:#8190a5;font-size:7px;font-weight:900}.v274-metric b{display:block;margin-top:3px;font-size:10px}.v274-metric strong{display:block;margin-top:5px;font-size:16px}.v274-metric i{display:block;height:5px;margin:6px 0;border-radius:99px;background:#101e2e;overflow:hidden}.v274-metric em{display:block;height:100%;background:linear-gradient(90deg,#0877f3,#9133e4,#f12bb8)}.v274-metric small{color:#8290a6;font-size:7px}.v274-insight{margin-top:9px;padding:10px;border:1px solid #294b68;border-radius:11px;background:#06111d}.v274-insight b,.v274-insight span{display:block}.v274-insight b{font-size:10px}.v274-insight span{margin-top:4px;color:#9aabc0;font-size:8px;line-height:1.45}.v274-insight.good{border-color:#287550;background:#071d18}.v274-insight.warn{border-color:#725c2b;background:#201806}.v274-insight.over{border-color:#8b3d51;background:#250b13}.v274-modal{position:fixed;inset:0;z-index:160000;display:none;align-items:flex-end;background:#01050bee}.v274-modal.open{display:flex}.v274-sheet{position:relative;width:100%;max-width:100%;box-sizing:border-box;padding:16px 14px max(24px,env(safe-area-inset-bottom));border:1px solid #0eb1db;border-radius:20px 20px 0 0;background:#050d18}.v274-sheet>button:first-child{position:absolute;right:12px;top:12px;width:40px;height:40px;border:1px solid #29455e;border-radius:50%;background:#071321;color:#fff;font-size:20px}.v274-sheet>span{font-size:8px;color:#8290a6;font-weight:900}.v274-sheet h2{margin:5px 45px 4px 0}.v274-sheet p{color:#8290a6;font-size:9px}.v274-sheet label{display:grid;gap:4px;margin:8px 0;color:#8e9caf;font-size:9px}.v274-sheet input{width:100%;max-width:100%;min-width:0;box-sizing:border-box;min-height:44px;border:1px solid #29455e;border-radius:9px;background:#07111f;color:#fff;padding:0 10px;font-size:16px}.v274-formgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.v274-save,.v274-auto{width:100%;min-height:46px;margin-top:8px;border-radius:10px;font-weight:900}.v274-save{border:1px solid #0eb1db;background:linear-gradient(90deg,#083b65,#351567);color:#fff}.v274-auto{border:1px solid #29455e;background:#071321;color:#9fb0c5}}@media(max-width:380px){.v274-metrics{grid-template-columns:minmax(0,1fr)}.v274-formgrid{grid-template-columns:minmax(0,1fr)}}`;
      document.head.appendChild(s);
    }
    return { targets, fact, render, style, calculated };
  })();

  /* ---- 4. Добавить еду: manual entries, templates, today's history ---- */
  const Log = (() => {
    const targets = () => Goals.targets();
    const BUILD = '27.5.2.3-ration-dedupe',
      NUT = 'stack_fitness_nutrition_v2310',
      LIB = 'stack_nutrition_quick_foods_v275';
    const read = (k, f) => {
      try {
        const v = JSON.parse(localStorage.getItem(k) || 'null');
        return v ?? f;
      } catch (_) {
        return f;
      }
    };
    const write = (k, v) => {
      try {
        localStorage.setItem(k, JSON.stringify(v));
        return true;
      } catch (_) {
        return false;
      }
    };
    const esc = v =>
      String(v ?? '').replace(
        /[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
      );
    const num = v => Number(v) || 0;
    const today = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const active = () => document.querySelector('[data-v234="nutrition"]')?.classList.contains('on');
    function items() {
      const a = read(NUT, []);
      return Array.isArray(a) ? a : [];
    }
    function templates() {
      const a = read(LIB, []);
      return Array.isArray(a) ? a : [];
    }
    function removeTemplate(i) {
      const a = templates();
      if (i < 0 || i >= a.length) return;
      a.splice(i, 1);
      write(LIB, a);
    }
    function recent() {
      const seen = new Set(),
        out = [];
      for (const x of items().slice().reverse()) {
        const k = String(x.name || '')
          .trim()
          .toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(x);
        if (out.length >= 8) break;
      }
      return out;
    }
    function ration() {
      try {
        return globalThis.STACK_RATION || null;
      } catch (_) {
        return null;
      }
    }
    function eatenRation() {
      try {
        return ration()?.eaten?.() || [];
      } catch (_) {
        return [];
      }
    }
    function facts() {
      return [...items().filter(x => x.date === today()), ...eatenRation()].reduce(
        (s, x) => ({
          kcal: s.kcal + num(x.kcal),
          protein: s.protein + num(x.protein),
          fat: s.fat + num(x.fat),
          carbs: s.carbs + num(x.carbs),
          count: s.count + 1,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0, count: 0 }
      );
    }
    function emit(source) {
      window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source } }));
    }
    function saveEntry(v, index = null) {
      const a = items(),
        entry = {
          date: v.date || today(),
          name: String(v.name || '').trim(),
          kcal: num(v.kcal),
          protein: num(v.protein),
          fat: num(v.fat),
          carbs: num(v.carbs),
        };
      if (v.replaces) entry.replaces = String(v.replaces);
      if (!entry.name) return false;
      if (index === null) a.push(entry);
      else if (index >= 0 && index < a.length) {
        const next = { ...a[index], ...entry };
        if (!v.replaces) delete next.replaces;
        a[index] = next;
      }
      a.sort((p, q) => String(p.date).localeCompare(String(q.date)));
      if (!write(NUT, a)) return false;
      emit('nutrition-minimal-v27.5.2');
      return true;
    }
    function removeEntry(index) {
      const a = items();
      if (index < 0 || index >= a.length) return;
      a.splice(index, 1);
      if (write(NUT, a)) emit('nutrition-minimal-delete-v27.5.2');
    }
    function saveTemplate(v) {
      const x = {
        name: String(v.name || '').trim(),
        kcal: num(v.kcal),
        protein: num(v.protein),
        fat: num(v.fat),
        carbs: num(v.carbs),
      };
      if (!x.name) return;
      const a = templates(),
        i = a.findIndex(t => String(t.name || '').toLowerCase() === x.name.toLowerCase());
      if (i >= 0) a[i] = { ...a[i], ...x, updatedAt: Date.now() };
      else a.unshift({ ...x, id: 'qf-' + Date.now(), updatedAt: Date.now() });
      write(LIB, a.slice(0, 40));
    }
    function render() {
      if (innerWidth > 720 || !active()) return;
      const body = document.querySelector('#v234Fitness #v234Nutrition');
      if (!body) return;
      const f = facts(),
        html = `<button class="v2752-add" data-v2752-add>+ ДОБАВИТЬ ЕДУ</button><button class="v2752-history" data-v2752-history>История сегодня · ${f.count}</button>`;
      let s = document.getElementById('v2752NutritionMinimal'),
        created = false;
      if (!s) {
        s = document.createElement('section');
        s.id = 'v2752NutritionMinimal';
        s.className = 'v2752-card';
        body.append(s);
        created = true;
      }
      if (created || s.innerHTML !== html) {
        s.innerHTML = html;
        s.querySelector('[data-v2752-add]').onclick = () => openAdd();
        s.querySelector('[data-v2752-history]').onclick = openHistory;
      }
    }
    function sheet(id, html) {
      document.getElementById(id)?.remove();
      const m = document.createElement('div');
      m.id = id;
      m.className = 'v2752-modal';
      m.innerHTML = `<div class="v2752-sheet">${html}</div>`;
      document.body.appendChild(m);
      requestAnimationFrame(() => m.classList.add('open'));
      m.addEventListener('click', e => {
        if (e.target === m || e.target.closest('[data-v2752-close]')) m.remove();
      });
      return m;
    }
    function replacesField(v = {}) {
      const ms = ration()?.meals?.() || [];
      if (!ms.length) return '';
      return `<label>Вместо приёма из рациона<select name="replaces"><option value="">Нет — еда вне рациона</option>${v.replaces && !ms.some(m => m.key === v.replaces) ? `<option value="${esc(v.replaces)}" selected>Приём другого варианта рациона</option>` : ''}${ms.map(m => `<option value="${esc(m.key)}" ${v.replaces === m.key ? 'selected' : ''}>${esc(m.name)}${m.kbju ? ` · план ${Math.round(m.kbju.kcal)} ккал` : ''}${m.done && !m.replaced ? ' · отмечен «поел»' : ''}</option>`).join('')}</select></label>`;
    }
    function fields(v = {}) {
      return `${replacesField(v)}<label>Приём / продукт<input name="name" required value="${esc(v.name || '')}" placeholder="Например, завтрак"></label><div class="v2752-grid"><label>Ккал<input name="kcal" type="number" min="0" required value="${num(v.kcal) || ''}"></label><label>Белки, г<input name="protein" type="number" min="0" step="0.1" required value="${num(v.protein) || ''}"></label><label>Жиры, г<input name="fat" type="number" min="0" step="0.1" required value="${num(v.fat) || ''}"></label><label>Углеводы, г<input name="carbs" type="number" min="0" step="0.1" required value="${num(v.carbs) || ''}"></label></div>`;
    }
    function dataFromForm(form) {
      const f = new FormData(form);
      return {
        date: String(f.get('date') || today()),
        replaces: String(f.get('replaces') || ''),
        name: String(f.get('name') || ''),
        kcal: num(f.get('kcal')),
        protein: num(f.get('protein')),
        fat: num(f.get('fat')),
        carbs: num(f.get('carbs')),
      };
    }
    function openAdd(prefill = null) {
      const lib = templates().slice(0, 8),
        rec = recent(),
        m = sheet(
          'v2752AddModal',
          `<button class="v2752-x" data-v2752-close>×</button><div class="v2752-kicker">ДОБАВИТЬ ЕДУ</div><h2>Быстрая запись</h2>${lib.length ? `<div class="v2752-tpl-label">МОИ ШАБЛОНЫ</div><div class="v2752-templates">${lib.map((x, i) => `<span class="v2752-chip"><button type="button" data-v2752-template="${i}">${esc(x.name)}</button><button type="button" class="v2752-chip-del" data-v2752-tpl-del="${i}" aria-label="Удалить шаблон">×</button></span>`).join('')}</div>` : ''}${rec.length ? `<div class="v2752-tpl-label">НЕДАВНИЕ</div><div class="v2752-templates">${rec.map((x, i) => `<button type="button" data-v2752-recent="${i}">${esc(x.name)}</button>`).join('')}</div>` : ''}<form data-v2752-form><input name="date" type="hidden" value="${today()}">${fields(prefill || {})}<label class="v2752-check"><input name="template" type="checkbox"> Сохранить как шаблон</label><button class="v2752-primary">ДОБАВИТЬ</button></form>`
        );
      const form = m.querySelector('[data-v2752-form]');
      const fill = x => {
        for (const k of ['name', 'kcal', 'protein', 'fat', 'carbs'])
          if (form.elements[k]) form.elements[k].value = x[k] ?? '';
      };
      m.querySelectorAll('[data-v2752-template]').forEach(b => (b.onclick = () => fill(lib[+b.dataset.v2752Template])));
      m.querySelectorAll('[data-v2752-recent]').forEach(b => (b.onclick = () => fill(rec[+b.dataset.v2752Recent])));
      m.querySelectorAll('[data-v2752-tpl-del]').forEach(
        b =>
          (b.onclick = e => {
            e.stopPropagation();
            if (!confirm('Удалить этот шаблон?')) return;
            removeTemplate(+b.dataset.v2752TplDel);
            m.remove();
            setTimeout(() => openAdd(dataFromForm(form)), 0);
          })
      );
      form.onsubmit = e => {
        e.preventDefault();
        const v = dataFromForm(form);
        if (saveEntry(v)) {
          if (form.elements.template?.checked) saveTemplate(v);
          m.remove();
          setTimeout(render, 0);
        }
      };
    }
    function openEdit(index) {
      const a = items(),
        x = a[index];
      if (!x) return;
      const m = sheet(
        'v2752EditModal',
        `<button class="v2752-x" data-v2752-close>×</button><div class="v2752-kicker">ИЗМЕНИТЬ ЗАПИСЬ</div><h2>${esc(x.name || 'Питание')}</h2><form data-v2752-edit><input name="date" type="date" value="${esc(x.date || today())}">${fields(x)}<button class="v2752-primary">СОХРАНИТЬ</button></form>`
      );
      m.querySelector('[data-v2752-edit]').onsubmit = e => {
        e.preventDefault();
        if (saveEntry(dataFromForm(e.currentTarget), index)) {
          m.remove();
          setTimeout(openHistory, 0);
        }
      };
    }
    function openHistory() {
      const a = items()
        .map((x, i) => ({ ...x, _i: i }))
        .filter(x => x.date === today())
        .reverse();
      const rm = Object.fromEntries((ration()?.meals?.() || []).map(m => [m.key, m.name])),
        er = eatenRation();
      const m = sheet(
        'v2752HistoryModal',
        `<button class="v2752-x" data-v2752-close>×</button><div class="v2752-kicker">ИСТОРИЯ</div><h2>Сегодня</h2><div class="v2752-history-list">${er.map(x => `<article><div><b>${esc(x.meal)} · рацион ${x.variant}</b><small>${Math.round(num(x.kcal))} ккал · ${num(x.protein)}Б · ${num(x.fat)}Ж · ${num(x.carbs)}У · снять — «Поел» в рационе</small></div></article>`).join('')}${a.length ? a.map(x => `<article><div><b>${esc(x.name || 'Без названия')}${x.replaces ? ` · вместо: ${esc(rm[x.replaces] || 'приём рациона')}` : ''}</b><small>${Math.round(num(x.kcal))} ккал · ${num(x.protein)}Б · ${num(x.fat)}Ж · ${num(x.carbs)}У</small></div><div><button data-v2752-edit="${x._i}">✎</button><button data-v2752-del="${x._i}">×</button></div></article>`).join('') : er.length ? '' : '<p class="v2752-empty">Сегодня записей пока нет.</p>'}</div>`
      );
      m.querySelectorAll('[data-v2752-edit]').forEach(
        b =>
          (b.onclick = () => {
            m.remove();
            openEdit(+b.dataset.v2752Edit);
          })
      );
      m.querySelectorAll('[data-v2752-del]').forEach(
        b =>
          (b.onclick = () => {
            if (confirm('Удалить запись питания?')) {
              removeEntry(+b.dataset.v2752Del);
              m.remove();
              setTimeout(openHistory, 0);
            }
          })
      );
    }
    function style() {
      if (document.getElementById('v2752NutritionMinimalStyle')) return;
      const s = document.createElement('style');
      s.id = 'v2752NutritionMinimalStyle';
      s.textContent = `@media(max-width:720px){.v2752-card{width:100%;max-width:100%;box-sizing:border-box;padding:18px 16px;border:1px solid #21455e;border-radius:18px;background:linear-gradient(155deg,#071522,#030914)}.v2752-kicker{color:#8290a6;font-size:8px;font-weight:900;letter-spacing:.1em}.v2752-kcal{display:flex;align-items:baseline;gap:6px;margin-top:5px}.v2752-kcal b{font-size:36px;line-height:1}.v2752-kcal span{color:#8897aa;font-size:13px}.v2752-status{margin-top:9px;color:#9fb0c3;font-size:10px}.v2752-status.over{color:#e5899a}.v2752-bar{height:6px;margin:9px 0;border-radius:99px;background:#102034;overflow:hidden}.v2752-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0877f3,#9133e4,#f12bb8)}.v2752-macros{margin:8px 0 16px;color:#95a5b9;font-size:10px}.v2752-add{width:100%;min-height:50px;border:1px solid #0eb1db;border-radius:12px;background:linear-gradient(90deg,#083b65,#351567);color:#fff;font-size:11px;font-weight:900}.v2752-history{display:block;width:100%;min-height:40px;margin-top:4px;border:0;background:transparent;color:#7f8da2;font-size:9px}.v2752-modal{position:fixed;inset:0;z-index:180000;display:flex;align-items:flex-end;background:#01050bee;opacity:0;transition:opacity .15s}.v2752-modal.open{opacity:1}.v2752-sheet{position:relative;width:100%;max-height:88vh;overflow:auto;box-sizing:border-box;padding:18px 14px max(24px,env(safe-area-inset-bottom));border:1px solid #214b67;border-radius:20px 20px 0 0;background:#050d18}.v2752-sheet h2{margin:5px 44px 14px 0;font-size:21px}.v2752-x{position:absolute;right:12px;top:12px;width:40px;height:40px;border:1px solid #29455e;border-radius:50%;background:#071321;color:#fff;font-size:20px}.v2752-sheet label{display:grid;gap:4px;margin:9px 0;color:#8e9caf;font-size:9px}.v2752-sheet input,.v2752-sheet select{width:100%;max-width:100%;min-width:0;box-sizing:border-box;min-height:44px;border:1px solid #29455e;border-radius:10px;background:#07111f;color:#fff;padding:0 10px;font-size:16px}.v2752-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.v2752-primary{width:100%;min-height:48px;margin-top:8px;border:1px solid #0eb1db;border-radius:11px;background:linear-gradient(90deg,#083b65,#351567);color:#fff;font-weight:900}.v2752-check{display:flex!important;grid-template-columns:none!important;align-items:center;gap:8px!important}.v2752-check input{width:18px!important;height:18px!important;min-height:18px!important}.v2752-tpl-label{margin:0 0 6px;color:#7f8da2;font-size:8px;font-weight:900;letter-spacing:.08em}.v2752-templates{display:flex;gap:6px;overflow-x:auto;margin:0 -2px 12px;padding:2px}.v2752-templates button{flex:0 0 auto;min-height:34px;padding:0 10px;border:1px solid #29455e;border-radius:999px;background:#071321;color:#dce8f5;font-size:8px}.v2752-chip{display:flex;flex:0 0 auto;align-items:center;gap:0;border:1px solid #29455e;border-radius:999px;background:#071321;overflow:hidden}.v2752-chip button[data-v2752-template]{border:0;border-radius:0;background:transparent;min-height:34px;padding:0 8px 0 10px}.v2752-chip-del{flex:0 0 auto;width:28px;height:34px;border:0;border-left:1px solid #1c3350;background:transparent;color:#8391a6;font-size:12px}.v2752-history-list article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:11px 0;border-bottom:1px solid #152b40}.v2752-history-list b{display:block;font-size:11px}.v2752-history-list small{display:block;margin-top:3px;color:#8290a6;font-size:8px}.v2752-history-list article>div:last-child{display:flex;gap:5px}.v2752-history-list button{width:38px;height:38px;border:1px solid #29455e;border-radius:9px;background:#071321;color:#dce8f5}.v2752-history-list button[data-v2752-del]{color:#f06b85}.v2752-empty{padding:20px 0;color:#8290a6;text-align:center;font-size:10px}}@media(max-width:380px){.v2752-grid{grid-template-columns:minmax(0,1fr)}}`;
      document.head.appendChild(s);
    }
    return { render, style, openAdd, openHistory };
  })();

  /* ---- 3. Рацион: four variants, whole-day portion solver, «Поел» marks ---- */
  const Ration = (() => {
    const BUILD = '27.5.3.6-kcal-first',
      MARKS = 'stack_fitness_nutrition_plan_v2311',
      VARIANT = 'stack_fitness_nutrition_variant_v241',
      NUT = 'stack_fitness_nutrition_v2310';
    const VARIANTS = [
      {
        name: 'Вариант 1',
        meals: [
          ['Завтрак', 'Овсянка · яйца · фрукт'],
          ['Обед', 'Рис · курица · овощи'],
          ['Перекус', 'Творог · банан · орехи'],
          ['Ужин', 'Паста · говядина · овощи'],
        ],
      },
      {
        name: 'Вариант 2',
        meals: [
          ['Завтрак', 'Яйца · тосты · йогурт'],
          ['Обед', 'Гречка · индейка · овощи'],
          ['Перекус', 'Кефир · банан · арахисовая паста'],
          ['Ужин', 'Картофель · рыба · салат'],
        ],
      },
      {
        name: 'Вариант 3',
        meals: [
          ['Завтрак', 'Овсянка · йогурт · ягоды'],
          ['Обед', 'Рис · говядина · овощи'],
          ['Перекус', 'Творог · мёд · орехи'],
          ['Ужин', 'Гречка · курица · овощи'],
        ],
      },
      {
        name: 'Вариант 4',
        meals: [
          ['Завтрак', 'Омлет · сыр · хлеб · фрукт'],
          ['Обед', 'Паста · индейка · овощи'],
          ['Перекус', 'Йогурт · гранола · банан'],
          ['Ужин', 'Рис · лосось · овощи'],
        ],
      },
    ];
    const RATIOS = [0.24, 0.31, 0.16, 0.29],
      BASE_KCAL = 2000,
      EGG_G = 55;
    const FOOD_DB = {
      'овсянка': { kcal: 370, protein: 13, fat: 7, carbs: 62 },
      'яйца': { kcal: 155, protein: 13, fat: 11, carbs: 1.1 },
      'фрукт': { kcal: 52, protein: 0.3, fat: 0.2, carbs: 14 },
      'рис': { kcal: 344, protein: 6.7, fat: 0.7, carbs: 78.9 },
      'курица': { kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
      'овощи': { kcal: 35, protein: 2, fat: 0.3, carbs: 7 },
      'творог': { kcal: 121, protein: 18, fat: 5, carbs: 3 },
      'банан': { kcal: 89, protein: 1.1, fat: 0.3, carbs: 23 },
      'орехи': { kcal: 607, protein: 20, fat: 54, carbs: 20 },
      'паста': { kcal: 350, protein: 11, fat: 1.3, carbs: 71 },
      'говядина': { kcal: 250, protein: 26, fat: 15, carbs: 0 },
      'тосты': { kcal: 265, protein: 9, fat: 3, carbs: 49 },
      'йогурт': { kcal: 61, protein: 3.5, fat: 3.3, carbs: 4.7 },
      'гречка': { kcal: 313, protein: 12.6, fat: 3.3, carbs: 62 },
      'индейка': { kcal: 135, protein: 30, fat: 1, carbs: 0 },
      'кефир': { kcal: 41, protein: 3.4, fat: 1, carbs: 4.1 },
      'арахисовая паста': { kcal: 588, protein: 25, fat: 50, carbs: 20 },
      'картофель': { kcal: 77, protein: 2, fat: 0.4, carbs: 16.3 },
      'рыба': { kcal: 105, protein: 22, fat: 1.5, carbs: 0 },
      'салат': { kcal: 15, protein: 1.4, fat: 0.2, carbs: 2.9 },
      'ягоды': { kcal: 50, protein: 0.8, fat: 0.4, carbs: 12 },
      'мёд': { kcal: 304, protein: 0.3, fat: 0, carbs: 82 },
      'омлет': { kcal: 154, protein: 11, fat: 11, carbs: 2 },
      'сыр': { kcal: 350, protein: 25, fat: 27, carbs: 1.3 },
      'хлеб': { kcal: 265, protein: 9, fat: 3, carbs: 49 },
      'гранола': { kcal: 471, protein: 10, fat: 20, carbs: 64 },
      'лосось': { kcal: 208, protein: 20, fat: 13, carbs: 0 },
    };
    const FOOD_WEIGHT = {
      овсянка: 0.35,
      яйца: 0.4,
      фрукт: 0.1,
      рис: 0.35,
      курица: 0.45,
      овощи: 0.1,
      творог: 0.35,
      банан: 0.15,
      орехи: 0.15,
      паста: 0.35,
      говядина: 0.45,
      тосты: 0.3,
      йогурт: 0.25,
      гречка: 0.35,
      индейка: 0.45,
      кефир: 0.2,
      'арахисовая паста': 0.15,
      картофель: 0.35,
      рыба: 0.45,
      салат: 0.08,
      ягоды: 0.12,
      мёд: 0.1,
      омлет: 0.45,
      сыр: 0.2,
      хлеб: 0.25,
      гранола: 0.3,
      лосось: 0.45,
    };
    const FOOD_LIMITS = {
      'овсянка': [40, 150],
      'яйца': [55, 220],
      'фрукт': [80, 300],
      'рис': [40, 200],
      'курица': [70, 250],
      'овощи': [100, 350],
      'творог': [80, 300],
      'банан': [80, 250],
      'орехи': [5, 30],
      'паста': [40, 200],
      'говядина': [70, 220],
      'тосты': [25, 150],
      'йогурт': [100, 350],
      'гречка': [40, 200],
      'индейка': [70, 250],
      'кефир': [150, 500],
      'арахисовая паста': [10, 30],
      'картофель': [150, 600],
      'рыба': [70, 250],
      'салат': [60, 250],
      'ягоды': [60, 250],
      'мёд': [5, 35],
      'омлет': [100, 250],
      'сыр': [10, 40],
      'хлеб': [25, 150],
      'гранола': [20, 80],
      'лосось': [70, 220],
    };
    const MACROS = ['kcal', 'protein', 'fat', 'carbs'];
    function dayTargets() {
      const t = targets();
      if (t && +t.kcal > 0)
        return { kcal: +t.kcal, protein: +t.protein || 0, fat: +t.fat || 0, carbs: +t.carbs || 0, base: false };
      return {
        kcal: BASE_KCAL,
        protein: Math.round((BASE_KCAL * 0.2) / 4),
        fat: Math.round((BASE_KCAL * 0.3) / 9),
        carbs: Math.round((BASE_KCAL * 0.5) / 4),
        base: true,
      };
    }
    /* Bounded least squares by coordinate descent: day kcal/P/F/C (relative error), each meal's kcal
   share (soft), and a light pull toward the template proportions so dishes stay plausible. */
    const SWAPS = 'stack_nutrition_swaps_v2968';
    /* Interchangeable products (same role in a meal). A swap is stored per variant/meal/position and
   the whole day is re-solved, so grams keep matching the daily targets. */
    const FOOD_GROUPS = [
      ['курица', 'индейка', 'говядина', 'рыба', 'лосось'],
      ['рис', 'гречка', 'паста', 'картофель'],
      ['овсянка', 'гранола'],
      ['тосты', 'хлеб'],
      ['творог', 'йогурт', 'кефир'],
      ['фрукт', 'банан', 'ягоды'],
      ['орехи', 'арахисовая паста'],
      ['овощи', 'салат'],
      ['яйца', 'омлет'],
    ];
    const groupOf = name => FOOD_GROUPS.find(g => g.includes(String(name).toLowerCase())) || null;
    function swaps() {
      const x = read(SWAPS, {});
      return x && typeof x === 'object' && !Array.isArray(x) ? x : {};
    }
    function baseNames(v, i) {
      return String(VARIANTS[v].meals[i][1])
        .split('·')
        .map(x => x.trim())
        .filter(Boolean);
    }
    function mealNames(v, i) {
      const sw = swaps();
      return baseNames(v, i).map((n, k) => sw[`${v}-${i}-${k}`] || n);
    }
    function setSwap(v, i, k, name) {
      const sw = swaps(),
        key = `${v}-${i}-${k}`,
        base = baseNames(v, i)[k];
      if (!name || String(name).toLowerCase() === String(base).toLowerCase()) delete sw[key];
      else sw[key] = name;
      if (write(SWAPS, sw)) {
        planCache.clear();
        window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'ration-swap' } }));
      }
    }
    function solveDay(v, T) {
      const foods = [];
      VARIANTS[v].meals.forEach((m, i) => {
        const names = mealNames(v, i),
          known = names.filter(n => FOOD_DB[n.toLowerCase()]),
          tw = known.reduce((s, n) => s + (FOOD_WEIGHT[n.toLowerCase()] || 0.2), 0);
        names.forEach(n => {
          const k = n.toLowerCase(),
            db = FOOD_DB[k];
          if (!db) {
            foods.push({ meal: i, name: n, db: null });
            return;
          }
          const [lo, hi] = FOOD_LIMITS[k] || [20, 400],
            g0 = Math.min(
              hi,
              Math.max(lo, ((T.kcal * (RATIOS[i] || 0) * (FOOD_WEIGHT[k] || 0.2)) / tw / db.kcal) * 100)
            );
          foods.push({ meal: i, name: n, k, db, lo, hi, g0, g: g0 });
        });
      });
      const x = foods.filter(f => f.db),
        terms = [],
        day = (key, w) => {
          if (T[key] > 0) terms.push({ c: x.map(f => f.db[key] / 100), t: T[key], w: w / (T[key] * T[key]) });
        };
      day('kcal', 30);
      day('protein', 0.3);
      day('fat', 1);
      day('carbs', 1);
      RATIOS.forEach((r, i) => {
        const t = T.kcal * r;
        if (t > 0) terms.push({ c: x.map(f => (f.meal === i ? f.db.kcal / 100 : 0)), t, w: 0.25 / (t * t) });
      });
      x.forEach((f, j) => terms.push({ c: x.map((_, q) => (q === j ? 1 : 0)), t: f.g0, w: 0.01 / (f.g0 * f.g0) }));
      for (let it = 0; it < 300; it++)
        x.forEach((f, j) => {
          let num = 0,
            den = 0;
          for (const tm of terms) {
            const cj = tm.c[j];
            if (!cj) continue;
            let s = 0;
            for (let q = 0; q < x.length; q++) s += tm.c[q] * x[q].g;
            num += tm.w * cj * (s - tm.t);
            den += tm.w * cj * cj;
          }
          if (den) f.g = Math.min(f.hi, Math.max(f.lo, f.g - num / den));
        });
      return VARIANTS[v].meals.map((_m, i) =>
        foods
          .filter(f => f.meal === i)
          .map(f => {
            if (!f.db) return { name: f.name, grams: null };
            const egg = f.k === 'яйца',
              grams = egg ? Math.max(1, Math.round(f.g / EGG_G)) * EGG_G : Math.max(5, Math.round(f.g / 5) * 5),
              q = grams / 100;
            return {
              name: f.name,
              grams,
              pcs: egg ? grams / EGG_G : 0,
              kcal: Math.round(f.db.kcal * q),
              protein: Math.round(f.db.protein * q * 10) / 10,
              fat: Math.round(f.db.fat * q * 10) / 10,
              carbs: Math.round(f.db.carbs * q * 10) / 10,
            };
          })
      );
    }
    const planCache = new Map();
    function dayPlan(v) {
      const T = dayTargets(),
        key = v + '|' + MACROS.map(k => T[k]).join('|') + '|' + JSON.stringify(swaps());
      if (!planCache.has(key)) {
        if (planCache.size > 16) planCache.clear();
        planCache.set(key, solveDay(v, T));
      }
      return planCache.get(key);
    }
    function daySummary(v) {
      const T = dayTargets(),
        tot = VARIANTS[v].meals.reduce(
          (s, _m, i) => {
            const k = mealKbju(v, i) || {};
            MACROS.forEach(x => (s[x] += k[x] || 0));
            return s;
          },
          { kcal: 0, protein: 0, fat: 0, carbs: 0 }
        ),
        p = k => (T[k] ? Math.round((tot[k] / T[k]) * 100) : 0);
      return `<div class="v2753-day">За день: ${Math.round(tot.kcal)} ккал · Б ${Math.round(tot.protein)} · Ж ${Math.round(tot.fat)} · У ${Math.round(tot.carbs)}<small>от ${T.base ? 'базовой ' : ''}цели: ккал ${p('kcal')}% · Б ${p('protein')}% · Ж ${p('fat')}% · У ${p('carbs')}%</small></div>`;
    }
    function mealItems(v, i) {
      return dayPlan(v)[i] || null;
    }
    const esc = v =>
      String(v ?? '').replace(
        /[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
      );
    const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
    const FOOD_STATE = {
      'овсянка': 'сух.',
      'рис': 'сух.',
      'паста': 'сух.',
      'гречка': 'сух.',
      'картофель': 'сыр.',
      'курица': 'готов.',
      'говядина': 'готов.',
    };
    function productText(it, k) {
      const name = k ? it.name.toLowerCase() : cap(it.name);
      if (!it.grams) return esc(name);
      const st = FOOD_STATE[it.name.toLowerCase()];
      return esc(
        `${name} ${it.pcs ? `${it.pcs} шт.` : `${it.grams} ${it.name.toLowerCase() === 'кефир' ? 'мл' : 'г'}`}${st ? ' ' + st : ''}`
      );
    }
    const read = (k, f) => {
      try {
        const v = JSON.parse(localStorage.getItem(k) || 'null');
        return v ?? f;
      } catch (_) {
        return f;
      }
    };
    const write = (k, v) => {
      try {
        localStorage.setItem(k, JSON.stringify(v));
        return true;
      } catch (_) {
        return false;
      }
    };
    const dateKey = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const active = () => document.querySelector('[data-v234="nutrition"]')?.classList.contains('on');
    const variant = () => Math.max(0, Math.min(3, Number(localStorage.getItem(VARIANT)) || 0));
    const targets = () => {
      try {
        return globalThis.STACK_NUTRITION_GOALS?.targets?.() || null;
      } catch (_) {
        return null;
      }
    };
    function markKey(v, i) {
      return `${dateKey()}-${v}-${i}`;
    }
    function isDone(v, i) {
      return !!read(MARKS, {})[markKey(v, i)];
    }
    function openSwap(v, i, k) {
      const cur = mealNames(v, i)[k],
        base = baseNames(v, i)[k],
        g = groupOf(cur) || [];
      document.getElementById('v2753SwapModal')?.remove();
      const m = document.createElement('div');
      m.id = 'v2753SwapModal';
      m.className = 'v2752-modal open';
      m.innerHTML = `<div class="v2752-sheet"><button class="v2752-x" data-close>×</button><div class="v2752-kicker">${esc(VARIANTS[v].meals[i][0].toUpperCase())} · ЗАМЕНА</div><h2>Вместо: ${esc(cap(cur))}</h2><div class="v2753-swaps">${g
        .filter(n => n !== String(cur).toLowerCase())
        .map(n => `<button type="button" data-pick="${esc(n)}">${esc(cap(n))}</button>`)
        .join(
          ''
        )}</div>${String(cur).toLowerCase() !== String(base).toLowerCase() ? `<button type="button" class="v2753-swap-reset" data-pick="${esc(base)}">Вернуть: ${esc(cap(base))}</button>` : ''}<p class="v2753-note">Граммы всего дня пересчитаются под твою цель.</p></div>`;
      document.body.appendChild(m);
      m.addEventListener('click', e => {
        if (e.target === m || e.target.closest('[data-close]')) {
          m.remove();
          return;
        }
        const b = e.target.closest('[data-pick]');
        if (b) {
          setSwap(v, i, k, b.dataset.pick);
          m.remove();
          render();
        }
      });
    }
    function toggle(v, i) {
      const m = read(MARKS, {}),
        k = markKey(v, i);
      if (m[k]) delete m[k];
      else m[k] = 1;
      if (write(MARKS, m)) {
        window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'ration-v27.5.3' } }));
        render();
      }
    }
    function mealKbju(v, i) {
      const items = mealItems(v, i);
      return items && items.length
        ? items.reduce(
            (t, x) => ({
              kcal: t.kcal + (x.kcal || 0),
              protein: t.protein + (x.protein || 0),
              fat: t.fat + (x.fat || 0),
              carbs: t.carbs + (x.carbs || 0),
            }),
            { kcal: 0, protein: 0, fat: 0, carbs: 0 }
          )
        : null;
    }
    function replaced() {
      const a = read(NUT, []),
        d = dateKey();
      return new Set(
        (Array.isArray(a) ? a : []).filter(x => x && x.date === d && x.replaces).map(x => String(x.replaces))
      );
    }
    function eaten() {
      const r = replaced(),
        out = [];
      VARIANTS.forEach((pl, v) =>
        pl.meals.forEach((m, i) => {
          if (!isDone(v, i) || r.has(`${v}-${i}`)) return;
          const k = mealKbju(v, i);
          if (k)
            out.push({
              key: `${v}-${i}`,
              variant: v + 1,
              meal: m[0],
              kcal: Math.round(k.kcal),
              protein: Math.round(k.protein * 10) / 10,
              fat: Math.round(k.fat * 10) / 10,
              carbs: Math.round(k.carbs * 10) / 10,
            });
        })
      );
      return out;
    }
    function rationFact() {
      return eaten().reduce(
        (s, x) => ({
          kcal: s.kcal + x.kcal,
          protein: s.protein + x.protein,
          fat: s.fat + x.fat,
          carbs: s.carbs + x.carbs,
          count: s.count + 1,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0, count: 0 }
      );
    }
    function meals() {
      const v = variant(),
        r = replaced();
      return VARIANTS[v].meals.map((m, i) => ({
        key: `${v}-${i}`,
        name: m[0],
        done: isDone(v, i),
        replaced: r.has(`${v}-${i}`),
        kbju: mealKbju(v, i),
      }));
    }
    function render() {
      if (innerWidth > 720 || !active()) return;
      const body = document.querySelector('#v234Fitness #v234Nutrition'),
        anchor = document.getElementById('v274NutritionGoals');
      if (!body || !anchor) return;
      const v = variant(),
        plan = VARIANTS[v],
        repl = replaced(),
        done = plan.meals.filter((_x, i) => isDone(v, i) || repl.has(`${v}-${i}`)).length,
        html = `<div class="v2753-top"><div><div class="v2753-kicker">РАЦИОН · СЕГОДНЯ</div><h3>Предложенное питание</h3>${daySummary(v)}</div><span>${done}/${plan.meals.length}</span></div><div class="v2753-tabs">${VARIANTS.map((x, i) => `<button class="${i === v ? 'on' : ''}" data-v2753-variant="${i}">${i + 1}</button>`).join('')}</div><div class="v2753-list">${plan.meals
          .map((m, i) => {
            const rep = repl.has(`${v}-${i}`),
              ok = isDone(v, i) || rep,
              items = mealItems(v, i),
              sum = mealKbju(v, i);
            return `<article class="${ok ? 'done' : ''}"><div class="v2753-meal"><b>${m[0]}</b><p>${items ? items.map((x, k) => (groupOf(x.name) ? `<button type="button" class="v2753-food" data-v2753-swap="${i}-${k}">${productText(x, k)}</button>` : productText(x, k))).join(', ') : m[1]}</p>${sum ? `<small class="v2753-kbju">${Math.round(sum.kcal)} ккал · Б ${Math.round(sum.protein)} · Ж ${Math.round(sum.fat)} · У ${Math.round(sum.carbs)}</small>` : ''}</div>${rep ? `<button data-v2753-own>✎ СВОЁ</button>` : `<button data-v2753-mark="${i}">${ok ? '✓ ПОЕЛ' : '○ НЕ ЕЛ'}</button>`}</article>`;
          })
          .join(
            ''
          )}</div><div class="v2753-note">${targets() ? 'Граммы подобраны под твои калории, белки, жиры и углеводы на день.' : `Базовые порции на ${BASE_KCAL} ккал — задай цель на день, и граммы подстроятся.`} Вес круп и макарон — в сухом виде, мяса — в готовом. «Поел» сразу идёт в план/факт. Ел другое — «Добавить еду» → «Вместо приёма». Это шаблон рациона, а не медицинское назначение.</div>`;
      let s = document.getElementById('v2753Ration'),
        created = false;
      if (!s) {
        s = document.createElement('section');
        s.id = 'v2753Ration';
        s.className = 'v2753-card';
        anchor.after(s);
        created = true;
      }
      if (created || s.innerHTML !== html) {
        s.innerHTML = html;
        s.querySelectorAll('[data-v2753-variant]').forEach(
          b =>
            (b.onclick = () => {
              localStorage.setItem(VARIANT, String(+b.dataset.v2753Variant));
              render();
              globalThis.STACK_NUTRITION?.refresh?.();
            })
        );
        s.querySelectorAll('[data-v2753-mark]').forEach(b => (b.onclick = () => toggle(v, +b.dataset.v2753Mark)));
        s.querySelectorAll('[data-v2753-own]').forEach(
          b => (b.onclick = () => globalThis.STACK_NUTRITION_MINIMAL?.openHistory?.())
        );
        s.querySelectorAll('[data-v2753-swap]').forEach(
          b =>
            (b.onclick = () => {
              const [i, k] = b.dataset.v2753Swap.split('-').map(Number);
              openSwap(v, i, k);
            })
        );
      }
    }
    function style() {
      if (document.getElementById('v2753RationStyle')) return;
      const s = document.createElement('style');
      s.id = 'v2753RationStyle';
      s.textContent = `@media(max-width:720px){.v2753-card{width:100%;max-width:100%;box-sizing:border-box;margin-top:9px;padding:14px;border:1px solid #1f4058;border-radius:17px;background:#050d18}.v2753-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v2753-kicker{color:#8290a6;font-size:8px;font-weight:900;letter-spacing:.09em}.v2753-top h3{margin:4px 0 0;font-size:16px}.v2753-food{display:inline;padding:0;border:0;border-bottom:1px dashed #3d5a78;background:none;color:inherit;font:inherit;text-align:left}.v2753-swaps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:4px 0 10px}.v2753-swaps button,.v2753-swap-reset{min-height:46px;border:1px solid #29455e;border-radius:11px;background:#07111f;color:#eef4ff;font-size:12px;font-weight:800}.v2753-swap-reset{width:100%;border-color:#0e607d;color:#9ce9f3}.v2753-day{margin-top:5px;color:#b8c6d8;font-size:9px;line-height:1.45}.v2753-day small{display:block;color:#70849b;font-size:8px}.v2753-top>span{color:#8ea0b5;font-size:9px}.v2753-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:11px 0}.v2753-tabs button{min-height:38px;border:1px solid #29455e;border-radius:9px;background:#071321;color:#8796a9;font-size:10px;font-weight:900}.v2753-tabs button.on{border-color:#9133e4;background:#21123b;color:#fff}.v2753-list{display:grid;gap:5px}.v2753-list article{display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:8px;align-items:center;padding:10px;border:1px solid #173149;border-radius:11px;background:#07111d}.v2753-list article.done{border-color:#285a3d;background:#071a12}.v2753-meal{min-width:0}.v2753-meal b{display:block;font-size:10px}.v2753-meal p{margin:4px 0;color:#8b9aae;font-size:9px;line-height:1.55;overflow-wrap:anywhere}.v2753-meal small{color:#70849b;font-size:7px}.v2753-meal p{color:#dce6f4!important}.v2753-meal .v2753-kbju{display:block;color:#8ea0b5;font-size:8px}.v2753-list article>button{min-height:40px;border:1px solid #29455e;border-radius:9px;background:#06111e;color:#91a0b4;font-size:7px;font-weight:900}.v2753-list article.done>button{border-color:#68d43f;color:#8ee276}.v2753-note{margin-top:9px;color:#73869b;font-size:7px;line-height:1.45}}`;
      document.head.appendChild(s);
    }
    function dayFact(day) {
      const a = read(NUT, []),
        rows = (Array.isArray(a) ? a : []).filter(x => x && x.date === day),
        r = new Set(rows.filter(x => x.replaces).map(x => String(x.replaces))),
        m = read(MARKS, {}),
        t = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
      rows.forEach(x => MACROS.forEach(k => (t[k] += Number(x[k]) || 0)));
      VARIANTS.forEach((pl, v) =>
        pl.meals.forEach((_m, i) => {
          if (!m[`${day}-${v}-${i}`] || r.has(`${v}-${i}`)) return;
          const k = mealKbju(v, i);
          if (k) MACROS.forEach(q => (t[q] += k[q] || 0));
        })
      );
      return t;
    }
    return { render, style, variant, rationFact, eaten, meals, dayFact, marks: () => read(MARKS, {}) };
  })();

  const active = () => document.querySelector('[data-v234="nutrition"]')?.classList.contains('on');
  function order() {
    const body = document.querySelector('#v234Fitness #v234Nutrition');
    if (!body) return;
    const want = [
      body.querySelector('[data-goal-card]'),
      document.getElementById('v274NutritionGoals'),
      document.getElementById('v2753Ration'),
      document.getElementById('v2752NutritionMinimal'),
    ].filter(el => el && el.parentElement === body);
    let prev = null;
    for (const el of want) {
      const target = prev ? prev.nextElementSibling : body.firstElementChild;
      if (el !== target) prev ? prev.after(el) : body.prepend(el);
      prev = el;
    }
  }
  function render() {
    if (innerWidth > 720 || !active()) return;
    Goals.render();
    Ration.render();
    Log.render();
    order();
  }
  function style() {
    Goals.style();
    Log.style();
    Ration.style();
    globalThis.STACK_OWNER_KIT?.installStyle?.('stackNutritionStyle', CSS);
  }
  const CSS = `@media(max-width:720px){#v234Fitness #v234Nutrition>:not([data-goal-card]):not(#v274NutritionGoals):not(#v2753Ration):not(#v2752NutritionMinimal){display:none!important}#v234Fitness #v234Nutrition>#v2752NutritionMinimal{margin-top:9px;padding:0;border:0;background:none}.v274-metrics{gap:5px!important}.v274-metric{padding:8px!important}.v274-insight{margin-top:7px!important}}`;
  function boot() {
    if (!globalThis.STACK_OWNER_KIT) {
      const s = document.createElement('style');
      s.id = 'stackNutritionStyle';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    style();
    Object.defineProperty(globalThis, 'STACK_NUTRITION_GOALS', {
      value: Object.freeze({ build: BUILD, targets: Goals.targets, fact: Goals.fact, refresh: render }),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'STACK_RATION', {
      value: Object.freeze({
        build: BUILD,
        refresh: render,
        snapshot: () => ({ variant: Ration.variant(), fact: Ration.rationFact(), marks: Ration.marks() }),
        eaten: Ration.eaten,
        meals: Ration.meals,
      }),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'STACK_NUTRITION_MINIMAL', {
      value: Object.freeze({ build: BUILD, refresh: render, openAdd: Log.openAdd, openHistory: Log.openHistory }),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'STACK_NUTRITION', {
      value: Object.freeze({ build: BUILD, refresh: render, targets: Goals.targets, dayFact: Ration.dayFact }),
      configurable: true,
    });
    document.addEventListener('click', e => {
      if (e.target.closest('[data-v234="nutrition"]')) queueMicrotask(render);
    });
    const kit = globalThis.STACK_OWNER_KIT;
    if (kit) kit.onRenderTriggers(render, { events: ['stack:data-changed', 'visibilitychange'] });
    else {
      window.addEventListener('stack:data-changed', () => setTimeout(render, 0));
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) setTimeout(render, 0);
      });
    }
    setTimeout(render, 0);
    globalThis.STACK_V29_SHELL?.refreshToday?.();
    console.info('STACK nutrition', BUILD);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
