// ---------------------------------------------------------------------------
// Офлайн-кеш сайта OLAN.
//
// • Файлы сборки (/assets — с хешем в имени) и шрифты берутся из кеша,
//   в сеть за ними не ходим: они никогда не меняются.
// • Картинки отдаются сразу из кеша, а свежая версия проверяется в фоне.
// • Страница — сначала из сети. Если сети нет или она молчит дольше
//   10 секунд, показываем сохранённую копию: сайт открывается без связи.
// • API, админ-панель, кабинеты и файлы чата не кешируются никогда.
// При смене VERSION старые кеши удаляются.
// ---------------------------------------------------------------------------
const VERSION = 'olan-v46';
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const BYPASS = /^\/(api|admin|operator|menedjer|chat-files)(\/|$)/;
const LIMIT = 160;

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - LIMIT; i += 1) await cache.delete(keys[i]);
}

function store(cache, request, response) {
  if (response.ok && response.type === 'basic') cache.put(request, response.clone()).then(() => trim(cache)).catch(() => {});
  return response;
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  return store(cache, request, await fetch(request));
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request, { ignoreVary: true });
  const fresh = fetch(request).then((response) => store(cache, request, response));
  if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
  return fresh;
}

function page(event, request) {
  const network = fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(PAGES).then((cache) => cache.put('/', copy)).catch(() => {});
    }
    return response;
  });
  event.waitUntil(network.catch(() => {}));
  return (async () => {
    const saved = await (await caches.open(PAGES)).match('/', { ignoreVary: true });
    if (!saved) return network;
    const slow = new Promise((resolve) => { setTimeout(() => resolve(saved), 10000); });
    return Promise.race([network.catch(() => saved), slow]);
  })();
}

// Страница после загрузки присылает список уже скачанных файлов: кладём их
// в кеш из памяти браузера, не трогая сеть. Так сайт работает без связи уже
// после первого визита, а не со второго.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'warm' || !Array.isArray(data.urls)) return;
  event.waitUntil((async () => {
    const statics = await caches.open(STATIC);
    for (const href of data.urls.slice(0, 80)) {
      try {
        const url = new URL(href, self.location.origin);
        if (url.origin !== self.location.origin || BYPASS.test(url.pathname)) continue;
        if (url.pathname === '/') {
          const response = await fetch(url.href, { cache: 'force-cache' });
          if (response.ok) await (await caches.open(PAGES)).put('/', response);
          continue;
        }
        if (await statics.match(url.href, { ignoreVary: true })) continue;
        const response = await fetch(url.href, { cache: 'force-cache' });
        if (response.ok) await statics.put(url.href, response);
      } catch { /* файл пропускаем — он докачается при следующем визите */ }
    }
    await trim(statics);
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || BYPASS.test(url.pathname)) return;
  if (request.mode === 'navigate') { event.respondWith(page(event, request)); return; }
  if (/^\/(assets|fonts)\//.test(url.pathname)) { event.respondWith(cacheFirst(request)); return; }
  if (/\.(webp|png|jpe?g|gif|svg|ico|woff2?)$/i.test(url.pathname)) event.respondWith(staleWhileRevalidate(event, request));
});
