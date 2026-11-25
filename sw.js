// =====================================================================
// 서비스 워커: 앱 파일을 휴대폰/PC에 저장(캐시)해 두어 오프라인에서도 열리게 함
//
// ★ 파일을 수정한 뒤 다시 배포할 때는 아래 CACHE_VERSION 숫자를 올려 주세요.
//   (v1 → v2) 그래야 사용자 기기에 저장된 옛 파일이 새 파일로 바뀝니다.
// =====================================================================

const CACHE_VERSION = 'v1';
const CACHE_NAME = `pwa-calculator-${CACHE_VERSION}`;

// 저장해 둘 파일 목록 (GitHub Pages 하위 폴더에서도 동작하도록 ./ 상대경로)
const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// 1) 설치: 파일들을 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// 2) 활성화: 이름이 다른(옛 버전) 캐시는 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('pwa-calculator-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// 3) 요청 가로채기: 캐시에 있으면 캐시에서, 없으면 인터넷에서 가져옴
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // 오프라인인데 페이지를 열려고 하면 저장해 둔 index.html 을 보여줌
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      });
    })
  );
});
