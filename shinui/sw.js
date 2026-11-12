// שומר את קבצי האפליקציה במכשיר, כדי שתיפתח מהר וגם בלי חיבור. הנתונים עצמם לא עוברים כאן.
const V = 'ls-v8';
const FILES = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/api.js', 'js/admin.js', 'js/config.js', 'js/content.js', 'js/img.js',
  'img/aro-wide.png', 'img/aro-wide-neg.png', 'img/icon-192.png', 'fonts/assistant-4d5300d9.woff2', 'fonts/assistant-27157e4c.woff2', 'fonts/assistant-188705ea.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))); self.clients.claim(); });
// קודם מהרשת (כדי שעדכונים יגיעו מיד), ובלי רשת מהמכשיר
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
