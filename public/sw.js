// 빈 서비스 워커 - 브라우저 오류 방지용
self.addEventListener('install', (event) => {
  // 아무것도 하지 않음
});

self.addEventListener('fetch', (event) => {
  // 기본 네트워크 요청 처리
  event.respondWith(fetch(event.request));
});
