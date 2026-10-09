const BUILD = '29.85.0';
const CACHE = 'stack-v29-85-network-icons';
const SCRIPT_PATHS = [
  'backup.js',
  'stack-data.js',
  'stack-finance.js',
  'stack-fx.js',
  'v22.js',
  'v22.1.js',
  'v22.2.js',
  'v22.3-income.js',
  'v22.12-ui-rebuild.js',
  'v22.13-fx-history-safe.js',
  'v22.14-fx-overview.js',
  'v22.15-currency-dashboard.js',
  'v22.16-fx-stability.js',
  'v22.18-fx-actual.js',
  'v22.20-finance-stable.js',
  'stack-persistence.js',
  'stack-v23-shell.js',
  'stack-v23-deals.js',
  'stack-v23-fitness.js',
  'stack-v23-fitness-pack.js',
  'stack-v23-fitness-day-picker.js',
  'stack-v23-fitness-month-label.js',
  'stack-v23-fitness-info.js',
  'stack-v23-fitness-progress.js',
  'stack-v23-fitness-goals.js',
  'stack-v23-fitness-engine.js',
  'stack-v23-fitness-library.js',
  'stack-v23-fitness-intelligence.js',
  'stack-v24-fitness-analytics.js',
  'stack-v24-mobile-readability.js',
  'stack-v23-stability.js',
  'stack-v24-unified.js',
  'stack-v25-finance.js',
  'stack-v26-deals-intelligence.js',
  'stack-v27-bootstrap.js',
  'stack-v27-core.js',
  'stack-v27-1-fitness-tabs.js',
  'stack-nutrition.js',
  'stack-v29-owner-kit.js',
  'stack-v29-shell.js',
  'stack-v29-deals-polish.js',
  'stack-v29-analytics.js',
];
const FITNESS_VISUALS = [
  'lower-knee-v2321.webp',
  'posterior-chain-v2321.webp',
  'upper-push-v2321.webp',
  'upper-pull-v2321.webp',
  'core-accessory-v2321.webp',
  'tech-squat-v2315.webp',
  'tech-bench-v2315.webp',
  'tech-pulldown-v2315.webp',
  'tech-core-v2315.webp',
  'tech-rdl-v2315.webp',
  'tech-dbbench-v2315.webp',
  'tech-row-v2315.webp',
  'tech-dbpress-v2315.webp',
];
const ICONS = ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const STATIC = [
  './',
  './index.html',
  './manifest.webmanifest',
  ...ICONS.map(x => `./${x}`),
  ...SCRIPT_PATHS.map(x => `./${x}?build=${BUILD}`),
  ...FITNESS_VISUALS.map(x => `./assets/fitness/${x}?build=${BUILD}`),
];
const GATE_STYLE = `<style id="stackV29NetworkGate">@media(max-width:720px){html:not(.stack-v29-ready) body{overflow:hidden!important}html:not(.stack-v29-ready) body::before{content:'';position:fixed;inset:0;z-index:2147483646;background:radial-gradient(circle at 50% -15%,#101142 0,#030817 35%,#01050b 72%)}html:not(.stack-v29-ready) body::after{content:'STACK';position:fixed;left:0;right:0;top:42%;z-index:2147483647;text-align:center;color:#eef4ff;font:900 18px Arial,sans-serif;letter-spacing:.18em;text-shadow:0 0 18px #9133e477}}</style>`;
const V29_HEAD = `<script>window.__STACK_V29__=true;</script><script defer src="./stack-v29-owner-kit.js?build=${BUILD}"></script><script defer src="./stack-v29-shell.js?build=${BUILD}"></script><script defer src="./stack-v29-deals-polish.js?build=${BUILD}"></script><script defer src="./stack-v29-analytics.js?build=${BUILD}"></script>`;
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const path of STATIC) {
        try {
          await cache.add(new Request(path, { cache: 'reload' }));
        } catch (error) {
          console.warn('STACK precache skipped', path, error);
        }
      }
    })()
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const fresh = await caches.open(CACHE);
      if (await fresh.match('./index.html')) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter(key => key.startsWith('stack-v') && key !== CACHE).map(key => caches.delete(key))
        );
      }
      if (self.registration.navigationPreload)
        try {
          await self.registration.navigationPreload.enable();
        } catch (_error) {}
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      /* a window that is on screen keeps running (its form/draft is not thrown away); the page reloads itself the next time it is hidden (index.html, controllerchange) */ await Promise.all(
        clients
          .filter(client => client.visibilityState === 'hidden')
          .map(client => client.navigate(client.url).catch(() => null))
      );
    })()
  );
});
async function cacheShell(response) {
  if (!response || !response.ok) return;
  try {
    const cache = await caches.open(CACHE);
    await Promise.all([cache.put('./index.html', response.clone()), cache.put('./', response.clone())]);
  } catch (_error) {}
}
async function withV29Shell(response) {
  if (!response) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  try {
    let html = await response.text();
    if (!html.includes('stack-v29-shell.js')) html = html.replace(/<head>/i, `<head>${GATE_STYLE}${V29_HEAD}`);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  } catch (_error) {
    return response;
  }
}
const OFFLINE_HTML =
  '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STACK</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#01050b;color:#eef4ff;font:600 15px Arial,sans-serif;text-align:center;padding:24px"><div><div style="font:900 18px Arial;letter-spacing:.18em">STACK</div><p style="color:#8b9aae">Нет соединения с сервером. Данные в безопасности — они хранятся на устройстве.</p><button onclick="location.reload()" style="min-height:46px;padding:0 22px;border:1px solid #7134ad;border-radius:12px;background:#21103b;color:#fff;font-weight:800">Повторить</button></div></body></html>';
function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
/* v29.85: files are revalidated with the server (`no-cache`: a 304 costs a header, not the file — it used to be `no-store`, a full re-download of ~45 files on every start) and a slow
   or half-dead network no longer holds the app on the splash screen: after NETWORK_TIMEOUT the cached copy is served while the request keeps running and refreshes the cache. */
const NETWORK_TIMEOUT = 4000;
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
async function navigationResponse(event) {
  const network = (async () => {
    const preload = await event.preloadResponse;
    const response = preload || (await fetch(event.request, { cache: 'no-cache' }));
    if (response && response.ok) await cacheShell(response.clone());
    return response;
  })();
  event.waitUntil(network.catch(() => {}));
  try {
    const response = await withTimeout(network, NETWORK_TIMEOUT);
    if (response && response.ok) return await withV29Shell(response);
  } catch (_error) {}
  const cache = await caches.open(CACHE);
  const fallback =
    (await cache.match('./index.html')) || (await cache.match('./')) || (await caches.match('./index.html'));
  if (fallback) return await withV29Shell(fallback);
  try {
    const response = await network;
    if (response) return await withV29Shell(response);
  } catch (_error) {}
  return offlineResponse();
}
async function networkFirst(event) {
  const request = event.request;
  const network = fetch(request, { cache: 'no-cache' }).then(async response => {
    if (response && response.ok) {
      try {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      } catch (_error) {}
    }
    return response;
  });
  event.waitUntil(network.catch(() => {}));
  try {
    return await withTimeout(network, NETWORK_TIMEOUT);
  } catch (_error) {}
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  return network.catch(() => Response.error());
}
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request,
    navigation = request.mode === 'navigate' || request.destination === 'document';
  if (navigation) {
    event.respondWith(navigationResponse(event));
    return;
  }
  event.respondWith(networkFirst(event));
});
