// ZEROCOUNT 서비스 워커: 한 번 연 뒤에는 인터넷이 끊겨도 앱이 열리게 한다.
// - 페이지(HTML): 항상 새 버전을 먼저 받고, 안 되면 저장해 둔 것을 연다.
// - app.js · app.css · 라이브러리 · 아이콘: 주소에 버전이 붙어 있으므로 저장해 둔 것을 먼저 쓴다.
// 기록(재고 데이터)은 브라우저 저장소에 있으며 이 파일과는 상관없다.
const CACHE = 'zerocount-v1';
const CORE = [
  './',
  './manifest.webmanifest',
  './icon-192.png',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 글꼴 등 외부 요청은 브라우저에 맡긴다

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); }
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
