// YOL: Kafesten Kemere — çevrimdışı çalışma için service worker.
// Derleme sonrası scripts/build-sw.mjs, oyunun TÜM dosyalarını (JS, font, ikon) PRECACHE listesine yazar
// ve her derlemede sürümü değiştirir. Böylece ilk açılıştan sonra oyun tamamen internetsiz çalışır.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `yol-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      // Tek bir dosya inmezse bile kurulum bozulmasın: dosyaları tek tek ekle.
      .then((c) => Promise.all(PRECACHE.map((url) => c.add(new Request(url, { cache: 'reload' })).catch(() => null))))
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
