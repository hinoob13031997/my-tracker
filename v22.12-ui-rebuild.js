/* STACK v22.31 — event-driven Tasks UI. Legacy Year renderer removed; data keys preserved. */
(() => {
  'use strict';
  const TK = 'stack_task_details_v227',
    MAIN = 'stack_neon_mix9_calendar_v1';
  let details = {},
    filter = 'all',
    activeIndex = null,
    refreshTimer = 0;
  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
    );
  function loadDetails() {
    try {
      details = JSON.parse(localStorage.getItem(TK) || '{}') || {};
    } catch (e) {
      details = {};
    }
  }
  function saveDetails() {
    try {
      localStorage.setItem(TK, JSON.stringify(details));
    } catch (e) {}
  }
  function persistedTasks() {
    try {
      let a = JSON.parse(localStorage.getItem(MAIN) || '{}')?.journal;
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function tasks() {
    try {
      if (typeof state !== 'undefined' && Array.isArray(state?.journal)) return state.journal;
    } catch (e) {}
    return persistedTasks();
  }
  function taskId(t, i) {
    if (!t.__v227id) t.__v227id = 't' + Date.now().toString(36) + i;
    return t.__v227id;
  }
  function isDone(t) {
    return globalThis.STACK_DATA.isTaskDone(t);
  }
  function priColor(p) {
    p = String(p || '').toLowerCase();
    return p.includes('выс') ? '#f12bb8' : p.includes('низ') ? '#68d43f' : '#0877f3';
  }
  function localDay(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function todayKey() {
    return localDay(new Date());
  }
  function addDays(n) {
    let d = new Date();
    d.setDate(d.getDate() + n);
    return localDay(d);
  }
  function style() {
    if (document.getElementById('v2212style')) return;
    let s = document.createElement('style');
    s.id = 'v2212style';
    s.textContent = `#screenTasks>.bottom,#screenTasks>.v227-taskhint,#v2210Tasks{display:none!important}.v2210year{display:none!important}.v2212-tasks{padding:10px 8px 95px}.v2212-head{display:flex;align-items:center;justify-content:space-between;margin:2px 0 10px}.v2212-title{font-size:20px;font-weight:900}.v2212-sub{font-size:8px;color:#77869b;margin-top:3px;letter-spacing:.5px}.v2212-add{width:42px;height:42px;border:1px solid #0877f3;border-radius:12px;background:#071321;color:#fff;font-size:25px;box-shadow:0 0 14px #0877f322}.v2212-filters{display:flex;gap:6px;overflow:auto;padding-bottom:4px;margin-bottom:12px}.v2212-filters button{white-space:nowrap;padding:9px 14px;border:1px solid #263b5b;border-radius:10px;background:#071321;color:#8795aa;font-size:10px}.v2212-filters button.on{color:#fff;border-color:#9133e4;background:#1b0b31;box-shadow:0 0 12px #9133e444}.v2212-group{margin:14px 0}.v2212-gh{display:flex;justify-content:space-between;align-items:center;margin:0 3px 7px;font-size:15px;font-weight:900}.v2212-count{font-size:9px;border:1px solid #29476d;border-radius:20px;padding:3px 8px;color:#a9b6c9;background:#091729}.v2212-list{border:1px solid #1d3655;border-radius:14px;overflow:hidden;background:#06101e}.v2212-row{display:grid;grid-template-columns:44px minmax(0,1fr) 18px;gap:2px 6px;padding:2px 10px 2px 2px;border-bottom:1px solid #152941;align-items:start}.v2212-body{min-width:0;padding:12px 0}.v2212-row:last-child{border-bottom:0}.v2212-check{position:relative;width:44px;height:44px;padding:0;border:0;background:transparent;color:#03101a;font-weight:900}.v2212-check::before{content:'';position:absolute;inset:10px;border:2px solid #91a2bb;border-radius:50%}.v2212-check.done::before{background:#68d43f;border-color:#68d43f}.v2212-check.done::after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;font-size:14px}.v2212-name{font-size:13px;font-weight:800;line-height:1.3}.v2212-row.done .v2212-name{text-decoration:line-through;color:#7d899b}.v2212-desc{margin-top:4px;font-size:9px;line-height:1.35;color:#7e8ca1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.v2212-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px;font-size:8px;color:#9d7ce8}.v2212-pri{padding:2px 6px;border:1px solid currentColor;border-radius:20px}.v2212-arrow{padding-top:9px;font-size:22px;color:#75859a}.v2212-group.late .v2212-gh>span:first-child{color:#f08a5d}#screenTasks .v2212-meta .v2212-late{color:#f08a5d}.v2212-row.done .v2212-late{display:none}.v2212-donehead{width:100%;min-height:44px;margin:0 0 7px;padding:0 3px;border:0;background:transparent;color:inherit;font:inherit;font-weight:900;text-align:left;cursor:pointer}.v2212-donehead .v2212-count{margin-left:auto}.v2212-donehead i{margin-left:8px;font-style:normal;color:#75859a;transition:transform .15s}.v2212-donehead[aria-expanded=true] i{transform:rotate(90deg)}.v2212-more{width:100%;min-height:44px;margin-top:6px;border:1px solid #263b5b;border-radius:12px;background:#071321;color:#a9b6c9;font-size:11px;font-weight:800}.v2212-empty{border:1px dashed #29415f;border-radius:14px;padding:24px;text-align:center;color:#7f8ba0;font-size:11px}.v2212-modal{position:fixed;inset:0;z-index:110000;background:#01050bf2;display:none;align-items:flex-end;justify-content:center}.v2212-modal.open{display:flex}.v2212-card{width:min(680px,100%);max-height:94vh;overflow:auto;border:1px solid #29476f;border-radius:20px 20px 0 0;background:linear-gradient(155deg,#071423,#030914);padding:15px 14px max(20px,env(safe-area-inset-bottom));box-shadow:0 0 35px #0877f322}.v2212-cardhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.v2212-cardhead b{font-size:15px}.v2212-close{width:36px;height:36px;border-radius:50%;border:1px solid #29415f;background:#071321;color:#fff;font-size:20px}.v2212-field{display:block;margin:10px 0}.v2212-field span{display:block;font-size:8px;color:#7f8da1;margin-bottom:5px}.v2212-field input,.v2212-field select,.v2212-field textarea{width:100%;border:1px solid #263d5f;border-radius:10px;background:#050e1a;color:#fff;padding:11px;font-size:12px}.v2212-field textarea{min-height:180px;line-height:1.45;resize:vertical}.v2212-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v2212-checkrow{display:grid;grid-template-columns:24px 1fr 34px;gap:7px;align-items:center;margin:7px 0}.v2212-checkrow input[type=text]{width:100%;border:1px solid #263d5f;border-radius:9px;background:#050e1a;color:#fff;padding:9px}.v2212-checkrow button{height:34px;border:1px solid #49304e;background:#160b19;color:#f06a83;border-radius:8px}.v2212-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:13px}.v2212-save{border:1px solid #0877f3;border-radius:11px;padding:13px;background:linear-gradient(90deg,#431675,#075fbe);color:#fff;font-weight:900}.v2212-delete{border:1px solid #5a2938;border-radius:11px;padding:13px;background:#170a10;color:#f06a83}@media(max-width:430px){.v2212-grid{grid-template-columns:1fr}.v2212-field textarea{min-height:220px}}`;
    document.head.appendChild(s);
  }
  function changed() {
    window.dispatchEvent(new CustomEvent('stack:data-changed', { detail: { source: 'tasks' } }));
  }
  function modal() {
    let m = document.getElementById('v2212Modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'v2212Modal';
    m.className = 'v2212-modal';
    m.innerHTML = `<div class="v2212-card"><div class="v2212-cardhead"><b>КАРТОЧКА ЗАДАЧИ</b><button class="v2212-close">×</button></div><label class="v2212-field"><span>НАЗВАНИЕ</span><input id="v2212Title" maxlength="300"></label><label class="v2212-field"><span>ПОДРОБНОЕ ОПИСАНИЕ</span><textarea id="v2212Desc" placeholder="Здесь можно писать сколько нужно: детали, идеи, ссылки, инструкции…"></textarea></label><div class="v2212-grid"><label class="v2212-field"><span>ДАТА</span><input id="v2212Date" type="date"></label><label class="v2212-field"><span>СРОК</span><input id="v2212Due" type="date"></label><label class="v2212-field"><span>ПРИОРИТЕТ</span><select id="v2212Pri"><option>Высокий</option><option selected>Средний</option><option>Низкий</option></select></label><label class="v2212-field"><span>СТАТУС</span><select id="v2212Status"><option>Не начато</option><option>В работе</option><option>Готово</option></select></label></div><label class="v2212-field"><span>ЗАМЕТКА</span><textarea id="v2212Note" maxlength="5000" style="min-height:100px"></textarea></label><div class="v2212-field"><span>ЧЕК-ЛИСТ</span><div id="v2212Checks"></div><button type="button" class="btn" id="v2212AddCheck">+ Подзадача</button></div><div class="v2212-actions"><button class="v2212-save" id="v2212Save">СОХРАНИТЬ</button><button class="v2212-delete" id="v2212Delete">Удалить</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('.v2212-close').onclick = () => m.classList.remove('open');
    m.onclick = e => {
      if (e.target === m) m.classList.remove('open');
    };
    return m;
  }
  function openTask(i, newTask = false) {
    let a = tasks(),
      t = a[i];
    if (!t) return;
    activeIndex = i;
    let d = details[taskId(t, i)] || {},
      m = modal(),
      checks = Array.isArray(d.checklist) ? d.checklist.map(x => ({ ...x })) : [];
    m.querySelector('#v2212Title').value = t.task || d.title || '';
    m.querySelector('#v2212Desc').value = d.description || '';
    m.querySelector('#v2212Date').value = t.date || d.date || '';
    m.querySelector('#v2212Due').value = t.due || d.due || '';
    m.querySelector('#v2212Pri').value = t.priority || d.priority || 'Средний';
    m.querySelector('#v2212Status').value = t.status || d.status || 'Не начато';
    m.querySelector('#v2212Note').value = t.note || d.note || '';
    function renderChecks() {
      let root = m.querySelector('#v2212Checks');
      root.innerHTML = checks
        .map(
          (x, j) =>
            `<div class="v2212-checkrow"><input type="checkbox" data-c="${j}" ${x.done ? 'checked' : ''}><input type="text" data-t="${j}" value="${esc(x.text || '')}"><button data-x="${j}">×</button></div>`
        )
        .join('');
      root.querySelectorAll('[data-c]').forEach(q => (q.onchange = () => (checks[+q.dataset.c].done = q.checked)));
      root.querySelectorAll('[data-t]').forEach(q => (q.oninput = () => (checks[+q.dataset.t].text = q.value)));
      root.querySelectorAll('[data-x]').forEach(
        q =>
          (q.onclick = () => {
            checks.splice(+q.dataset.x, 1);
            renderChecks();
          })
      );
    }
    renderChecks();
    m.querySelector('#v2212AddCheck').onclick = () => {
      checks.push({ text: '', done: false });
      renderChecks();
    };
    m.querySelector('#v2212Save').onclick = () => {
      let z = {
        title: m.querySelector('#v2212Title').value.trim(),
        description: m.querySelector('#v2212Desc').value.trim(),
        date: m.querySelector('#v2212Date').value,
        due: m.querySelector('#v2212Due').value,
        priority: m.querySelector('#v2212Pri').value,
        status: m.querySelector('#v2212Status').value,
        note: m.querySelector('#v2212Note').value.trim(),
        checklist: checks,
      };
      t.task = z.title;
      t.date = z.date;
      t.due = z.due;
      t.priority = z.priority;
      t.status = z.status;
      t.note = z.note;
      details[taskId(t, i)] = z;
      saveDetails();
      try {
        globalThis.save?.();
      } catch (e) {}
      changed();
      m.classList.remove('open');
      renderTasks();
    };
    m.querySelector('#v2212Delete').onclick = () => {
      if (!confirm('Удалить задачу?')) return;
      try {
        globalThis.STACK_RECOVERY?.snapshotNow('before-delete');
      } catch (e) {}
      let key = taskId(t, i);
      a.splice(i, 1);
      delete details[key];
      saveDetails();
      try {
        globalThis.save?.();
      } catch (e) {}
      changed();
      m.classList.remove('open');
      renderTasks();
    };
    m.classList.add('open');
    if (newTask) setTimeout(() => m.querySelector('#v2212Title').focus(), 50);
  }
  /* v29.88: the list is grouped by deadline — Просрочено / Сегодня / Завтра / На этой неделе / Позже / Без срока — and sorted by day, then
   priority. Done tasks sit in one folded «Готово» group (20 at a time), they used to be mixed into «На этой неделе» for ever: with
   months of history that was hundreds of rows, the open ones buried, and every tap redrew all of them. A tick now updates its row in place. */
  const GROUPS = [
    ['overdue', 'Просрочено'],
    ['today', 'Сегодня'],
    ['tomorrow', 'Завтра'],
    ['week', 'На этой неделе'],
    ['later', 'Позже'],
    ['nodate', 'Без срока'],
  ];
  const DONE_STEP = 20;
  let doneOpen = false,
    doneShown = DONE_STEP,
    quiet = false;
  const priRank = t => {
    const p = String(t.priority || '').toLowerCase();
    return p.includes('выс') ? 0 : p.includes('низ') ? 2 : 1;
  };
  const dayOf = t =>
    /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : /^\d{4}-\d{2}-\d{2}$/.test(t.date || '') ? t.date : '';
  const byDay = (x, y) => dayOf(x.t).localeCompare(dayOf(y.t)) || priRank(x.t) - priRank(y.t) || x.i - y.i;
  const byDayNewest = (x, y) => dayOf(y.t).localeCompare(dayOf(x.t)) || y.i - x.i;
  function rowHtml(x, today) {
    const t = x.t,
      d = details[taskId(t, x.i)] || {},
      done = isDone(t),
      p = t.priority || d.priority || 'Средний',
      desc = d.description || t.note || '',
      due = t.due || d.due || '',
      late = globalThis.STACK_DATA.daysLate(t, today),
      name = esc(t.task || d.title || 'Без названия');
    return `<div class="v2212-row ${done ? 'done' : ''}" data-i="${x.i}"><button type="button" class="v2212-check ${done ? 'done' : ''}" data-check="${x.i}" aria-pressed="${done}" aria-label="${done ? 'Снять отметку' : 'Отметить выполненной'}: ${name}"></button><div class="v2212-body"><div class="v2212-name">${name}</div>${desc ? `<div class="v2212-desc">${esc(desc)}</div>` : ''}<div class="v2212-meta"><span class="v2212-pri" style="color:${priColor(p)}">${esc(p)}</span>${due ? `<span>◷ ${esc(globalThis.STACK_DATA.formatDay(due, today) || due)}</span>` : ''}${late ? `<span class="v2212-late">просрочено · ${late} дн.</span>` : ''}${d.checklist?.length ? `<span>☑ ${d.checklist.filter(z => z.done).length}/${d.checklist.length}</span>` : ''}</div></div><span class="v2212-arrow">›</span></div>`;
  }
  function renderTasks() {
    let screen = document.getElementById('screenTasks');
    if (!screen || !globalThis.STACK_DATA?.taskBucket) return;
    [...screen.children].forEach(ch => {
      if (ch.id !== 'v2212Tasks') ch.style.setProperty('display', 'none', 'important');
    });
    let host = document.getElementById('v2212Tasks');
    if (!host) {
      host = document.createElement('div');
      host.id = 'v2212Tasks';
      host.className = 'v2212-tasks';
      screen.appendChild(host);
    }
    const D = globalThis.STACK_DATA,
      a = tasks(),
      today = todayKey(),
      open = {},
      done = [];
    GROUPS.forEach(g => (open[g[0]] = []));
    a.forEach((t, i) => {
      if (!t) return;
      const x = { t, i },
        b = D.taskBucket(t, today);
      if (
        filter === 'important' &&
        !String(t.priority || '')
          .toLowerCase()
          .includes('выс')
      )
        return;
      if (b === 'done') {
        if (filter !== 'today' || dayOf(t) === today) done.push(x);
      } else if (filter !== 'done' && (filter !== 'today' || b === 'overdue' || b === 'today')) open[b].push(x);
    });
    GROUPS.forEach(g => open[g[0]].sort(byDay));
    done.sort(byDayNewest);
    const showDone = filter === 'done' || doneOpen,
      doneRows = showDone ? done.slice(0, doneShown) : [];
    const list = rows => `<div class="v2212-list">${rows.map(x => rowHtml(x, today)).join('')}</div>`;
    const openHtml = GROUPS.filter(g => open[g[0]].length)
      .map(
        g =>
          `<section class="v2212-group ${g[0] === 'overdue' ? 'late' : ''}"><div class="v2212-gh"><span>${g[1]}</span><span class="v2212-count">${open[g[0]].length}</span></div>${list(open[g[0]])}</section>`
      )
      .join('');
    const doneHtml = done.length
      ? `<section class="v2212-group">${
          filter === 'done'
            ? `<div class="v2212-gh"><span>Готово</span><span class="v2212-count">${done.length}</span></div>`
            : `<button type="button" class="v2212-gh v2212-donehead" data-done-toggle aria-expanded="${doneOpen}"><span>Готово</span><span class="v2212-count">${done.length}</span><i>›</i></button>`
        }${showDone ? list(doneRows) : ''}${showDone && done.length > doneRows.length ? `<button type="button" class="v2212-more" data-done-more>Показать ещё ${Math.min(DONE_STEP, done.length - doneRows.length)}</button>` : ''}</section>`
      : '';
    const empty = !openHtml && !doneHtml ? '<div class="v2212-empty">Здесь пока нет задач</div>' : '';
    const allDone =
      !openHtml && doneHtml && filter !== 'done' ? '<div class="v2212-empty">Открытых задач нет</div>' : '';
    host.innerHTML = `<div class="v2212-head"><div><div class="v2212-title">Задачи</div><div class="v2212-sub">ПЛАНЫ · ДЕЛА · НАПОМИНАНИЯ</div></div><button class="v2212-add" id="v2212Add">+</button></div><div class="v2212-filters">${[
      ['all', 'Все'],
      ['today', 'Сегодня'],
      ['important', 'Важные'],
      ['done', 'Готово'],
    ]
      .map(x => `<button data-f="${x[0]}" class="${filter === x[0] ? 'on' : ''}">${x[1]}</button>`)
      .join('')}</div>${openHtml}${empty}${allDone}${doneHtml}`;
    host.querySelectorAll('[data-f]').forEach(
      b =>
        (b.onclick = () => {
          filter = b.dataset.f;
          doneShown = DONE_STEP;
          renderTasks();
        })
    );
    host.querySelector('[data-done-toggle]')?.addEventListener('click', () => {
      doneOpen = !doneOpen;
      doneShown = DONE_STEP;
      renderTasks();
    });
    host.querySelector('[data-done-more]')?.addEventListener('click', () => {
      doneShown += DONE_STEP;
      renderTasks();
    });
    host.querySelectorAll('.v2212-row').forEach(
      r =>
        (r.onclick = e => {
          if (e.target.closest('[data-check]')) return;
          openTask(+r.dataset.i);
        })
    );
    host.querySelectorAll('[data-check]').forEach(
      b =>
        (b.onclick = e => {
          e.stopPropagation();
          const t = tasks()[+b.dataset.check];
          if (!t) return;
          /* only this row changes (and not its group): the task moves to its place at the next redraw, like on «Сегодня» */
          const now = D.toggleTaskDone(t),
            row = b.closest('.v2212-row'),
            name = row.querySelector('.v2212-name')?.textContent || '';
          row.classList.toggle('done', now);
          b.classList.toggle('done', now);
          b.setAttribute('aria-pressed', String(now));
          b.setAttribute('aria-label', `${now ? 'Снять отметку' : 'Отметить выполненной'}: ${name}`);
          /* save() announces itself with stack:data-changed; this list must not redraw (and move the row away) for its own tick */
          quiet = true;
          try {
            globalThis.save?.();
          } catch (e) {}
          changed();
          quiet = false;
        })
    );
    host.querySelector('#v2212Add').onclick = () => {
      tasks().push({ date: today, task: '', due: '', priority: 'Средний', status: 'Не начато', note: '' });
      try {
        globalThis.save?.();
      } catch (e) {}
      changed();
      openTask(tasks().length - 1, true);
    };
  }
  function refresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      loadDetails();
      renderTasks();
    }, 40);
  }
  function installEvents() {
    window.addEventListener('stack:data-ready', refresh);
    window.addEventListener('stack:data-changed', e => {
      if (!quiet && e.detail?.source !== 'tasks') refresh();
    });
    window.addEventListener('storage', e => {
      if (e.key === MAIN || e.key === TK) refresh();
    });
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });
    document.getElementById('screenTasks')?.addEventListener('click', e => {
      if (e.target?.closest?.('#v2212Tasks,#v2212Modal')) return;
      refresh();
    });
  }
  function init() {
    loadDetails();
    style();
    renderTasks();
    installEvents();
    console.info('STACK v22.31 event-driven Tasks UI');
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 900), { once: true });
  else setTimeout(init, 900);
})();
