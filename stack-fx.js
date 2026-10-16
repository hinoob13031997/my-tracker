/* STACK FX Engine v2 — shared read/calculation layer with pending/fallback history states; v29.93: also the historical-rate worker. */
(() => {
  'use strict';
  const D = () => globalThis.STACK_DATA,
    HKEY = 'stack_fx_history_v1';
  function history() {
    try {
      const h = JSON.parse(localStorage.getItem(HKEY) || '{}');
      return h && typeof h === 'object' ? h : {};
    } catch (e) {
      return {};
    }
  }
  function currency(v) {
    return D()?.currency?.(v) || 'RUB';
  }
  function currentRate(c) {
    c = currency(c);
    return c === 'RUB' ? 1 : Number(D()?.rate?.(c)) || 0;
  }
  function txKey(g, t) {
    return t?.id || [g?.id, t?.date, t?.amount, t?.note || ''].join('|');
  }
  function startKey(g) {
    return ['start', g?.id, g?.startDate || '', currency(g?.currency)].join('|');
  }
  function historicalEntry(g, t) {
    return history()[txKey(g, t)] || null;
  }
  function transactionRate(g, t) {
    const c = currency(g?.currency);
    if (c === 'RUB') return { rate: 1, source: 'RUB', rateDate: t?.date || '' };
    const actual = Number(t?.actualRate) || 0;
    if (actual > 0)
      return { rate: actual, source: 'actual', rateDate: t?.date || '', rubAmount: Number(t?.rubAmount) || 0 };
    const h = historicalEntry(g, t),
      r = Number(h?.rate) || 0;
    if (r > 0)
      return {
        rate: r,
        source: h?.source || 'history',
        rateDate: h?.rateDate || t?.date || '',
        rubAmount: Number(h?.rubAmount) || 0,
      };
    return { rate: currentRate(c), source: t?.date ? 'pending' : 'current-fallback', rateDate: '', rubAmount: 0 };
  }
  function activeGoals(c) {
    c = currency(c);
    return (D()?.goals?.() || []).filter(g => currency(g?.currency) === c && g?.status !== 'archived');
  }
  function portfolio(c) {
    c = currency(c);
    const nowRate = currentRate(c),
      h = history();
    let native = 0,
      costRub = 0,
      known = 0,
      missing = 0,
      pending = 0,
      fallback = 0,
      actual = 0;
    for (const g of activeGoals(c)) {
      let start = Number(g?.start ?? g?.current) || 0,
        n = start;
      if (start) {
        const sh = h[startKey(g)],
          sr = Number(sh?.rate) || 0,
          src = sh?.source;
        if (sr > 0 && (src === 'CBR' || src === 'actual')) {
          costRub += start * sr;
          known++;
          if (src === 'actual') actual++;
        } else {
          costRub += start * (sr || nowRate);
          missing++;
          if (g?.startDate && !sh) pending++;
          else fallback++;
        }
      }
      for (const t of D()?.transactions?.(g) || []) {
        const a = Number(t?.amount) || 0;
        n += a;
        const x = transactionRate(g, t);
        if (x.rate > 0 && (x.source === 'CBR' || x.source === 'actual')) {
          costRub += a * x.rate;
          known++;
          if (x.source === 'actual') actual++;
        } else {
          costRub += a * (x.rate || nowRate);
          missing++;
          if (x.source === 'pending') pending++;
          else fallback++;
        }
      }
      native += n;
    }
    const nowRub = native * nowRate;
    return {
      currency: c,
      native,
      currentRate: nowRate,
      costRub,
      nowRub,
      diffRub: nowRub - costRub,
      known,
      missing,
      pending,
      fallback,
      actual,
    };
  }
  /* v29.93: the historical-rate worker (was v22.16-fx-stability.js, started by a 1.5 s timer). For every foreign-currency goal it
     fetches the CBR rate on the date of the start amount and of each operation that has no CBR/actual rate yet, mirrors a typed-in
     actual rate (t.actualRate, «Списано в рублях») and, when the archive has nothing, keeps the current rate as a fallback. It writes
     only the entries it changed, on top of what is stored — never the whole key from a copy taken before the network calls. */
  function updateHistory(entries) {
    const keys = Object.keys(entries || {});
    if (!keys.length) return false;
    const h = history();
    keys.forEach(k => (h[k] = entries[k]));
    try {
      localStorage.setItem(HKEY, JSON.stringify(h));
      return true;
    } catch (e) {
      return false;
    }
  }
  async function fetchHistorical(date, c) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const base = new Date(date + 'T12:00:00');
    for (let off = 0; off <= 10; off++) {
      const d = new Date(base);
      d.setDate(d.getDate() + off);
      const y = d.getFullYear(),
        m = String(d.getMonth() + 1).padStart(2, '0'),
        day = String(d.getDate()).padStart(2, '0');
      try {
        const r = await fetch(`https://www.cbr-xml-daily.ru/archive/${y}/${m}/${day}/daily_json.js`, {
          cache: 'force-cache',
        });
        if (!r.ok) continue;
        const v = (await r.json())?.Valute?.[c];
        if (v) return { rate: Number(v.Value) / Number(v.Nominal || 1), source: 'CBR', rateDate: `${y}-${m}-${day}` };
      } catch (e) {}
    }
    return null;
  }
  function fallbackEntry(date, c, kind) {
    const r = currentRate(c);
    return r
      ? {
          rate: r,
          source: 'current-fallback',
          rateDate: D()?.dateKey?.() || new Date().toISOString().slice(0, 10),
          date: date || '',
          currency: c,
          kind: kind || 'tx',
        }
      : null;
  }
  const known = e => (e?.source === 'CBR' || e?.source === 'actual') && Number(e.rate) > 0;
  let busy = false,
    lastSignature = '',
    repairTimer = 0;
  async function repairHistory() {
    if (busy) return;
    busy = true;
    const h = history(),
      changes = {};
    let cbr = 0,
      fallback = 0,
      actual = 0;
    const put = (k, v) => {
      changes[k] = v;
      h[k] = v;
    };
    try {
      for (const g of D()?.goals?.() || []) {
        const c = currency(g?.currency);
        if (c === 'RUB') continue;
        const start = Number(g?.start ?? g?.current) || 0;
        if (start && g?.startDate) {
          const sk = startKey(g),
            old = h[sk];
          if (!known(old)) {
            const got = await fetchHistorical(g.startDate, c);
            if (got) {
              put(sk, { ...got, date: g.startDate, currency: c, kind: 'start' });
              cbr++;
            } else if (!old) {
              const fb = fallbackEntry(g.startDate, c, 'start');
              if (fb) {
                put(sk, fb);
                fallback++;
              }
            }
          }
        }
        for (const t of D()?.transactions?.(g) || []) {
          if (!t?.date) continue;
          const k = txKey(g, t),
            old = h[k];
          if (Number(t.actualRate) > 0) {
            if (old?.source !== 'actual' || Number(old.rate) !== Number(t.actualRate)) {
              put(k, {
                rate: Number(t.actualRate),
                source: 'actual',
                rateDate: t.date,
                date: t.date,
                currency: c,
                rubAmount: Number(t.rubAmount) || 0,
              });
              actual++;
            }
            continue;
          }
          if (known(old)) continue;
          const got = await fetchHistorical(t.date, c);
          if (got) {
            put(k, { ...got, date: t.date, currency: c });
            cbr++;
          } else if (!old) {
            const fb = fallbackEntry(t.date, c, 'tx');
            if (fb) {
              put(k, fb);
              fallback++;
            }
          }
        }
      }
      const changed = updateHistory(changes);
      if (changed)
        window.dispatchEvent(new CustomEvent('stack:fx-history-changed', { detail: { source: 'fx-repair' } }));
      window.dispatchEvent(new CustomEvent('stack:fx-repair-complete', { detail: { changed, cbr, fallback, actual } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('stack:fx-repair-complete', { detail: { changed: false, error: true } }));
    } finally {
      busy = false;
    }
  }
  function repairSignature() {
    return (
      (D()?.goals?.() || [])
        .map(g =>
          [
            g?.id,
            g?.currency,
            g?.start,
            g?.startDate,
            (D()?.transactions?.(g) || []).map(t => [t?.id, t?.date, t?.amount, t?.actualRate, t?.rubAmount]).join(':'),
          ].join('|')
        )
        .join(';') +
      '|' +
      JSON.stringify(D()?.fxCache?.() || {})
    );
  }
  function scheduleRepair(force = false) {
    clearTimeout(repairTimer);
    repairTimer = setTimeout(
      () => {
        const sig = repairSignature();
        if (force || sig !== lastSignature) {
          lastSignature = sig;
          repairHistory();
        }
      },
      force ? 0 : 80
    );
  }
  window.addEventListener('stack:data-changed', () => scheduleRepair(false));
  window.addEventListener('storage', e => {
    const k = D()?.keys || {};
    if ([k.main, k.fx, HKEY].includes(e.key)) scheduleRepair(false);
  });
  window.addEventListener('focus', () => scheduleRepair(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleRepair(true);
  });
  /* network work stays off the startup path: the first pass runs once the page has loaded */
  if (document.readyState === 'complete') scheduleRepair(true);
  else window.addEventListener('load', () => scheduleRepair(true), { once: true });
  const api = Object.freeze({
    version: 2,
    history,
    currency,
    currentRate,
    txKey,
    startKey,
    historicalEntry,
    transactionRate,
    activeGoals,
    portfolio,
    updateHistory,
  });
  Object.defineProperty(globalThis, 'STACK_FX', { value: api, writable: false, configurable: true });
  window.dispatchEvent(new CustomEvent('stack:fx-ready', { detail: { version: 2 } }));
  console.info('STACK FX Engine v2 ready');
})();
