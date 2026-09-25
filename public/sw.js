// YOL: Kafesten Kemere — çevrimdışı çalışma için service worker.
// Derleme sonrası scripts/build-sw.mjs, oyunun TÜM dosyalarını (JS, font, ikon) PRECACHE listesine yazar
// ve her derlemede sürümü değiştirir. Böylece ilk açılıştan sonra oyun tamamen internetsiz çalışır.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `yol-${VERSION}`;

async function addWithRetry(cache, url, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return await cache.put(url, res);
    } catch (err) {
      if (i >= tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
}

// Sayfa "çevrimdışı hazır mı?" diye sorar: sürüm ve önbellekte eksik dosya sayısı döner.
self.addEventListener('message', (e) => {
  if (e.data !== 'durum' || !e.source) return;
  caches
    .open(CACHE)
    .then((c) => c.keys())
    .then((keys) => {
      const have = new Set(keys.map((k) => new URL(k.url).pathname));
      const eksik = PRECACHE.filter((u) => !have.has(decodeURI(u)) && !have.has(u)).length;
      e.source.postMessage({ tip: 'durum', surum: VERSION, eksik, toplam: PRECACHE.length });
    });
});

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      // Yeni sürüm ancak TÜM dosyaları indiğinde devreye girer. Bir dosya inmezse kurulum başarısız olur,
      // eski (tam önbellekli) sürüm çalışmaya devam eder ve tarayıcı bir sonraki açılışta yeniden dener.
      // Böylece yarım bir güncelleme çevrimdışı oyunu asla bozmaz.
      .then((c) => Promise.all(PRECACHE.map((url) => addWithRetry(c, url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Sayfa açılışı: önce ağ (yeni sürüm gelsin), internet yoksa önbellekteki oyun.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/', { ignoreSearch: true }).then((r) => r || caches.match('/index.html'))),
    );
    return;
  }

  // Diğer dosyalar: önce önbellek, yoksa ağ (ve önbelleğe ekle).
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
