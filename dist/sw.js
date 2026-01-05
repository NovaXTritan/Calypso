const CACHE = 'cosmos-v1'
const BASE = '/cosmos/'
const CORE = [BASE, BASE+'index.html', BASE+'favicon.svg', BASE+'manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
})
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (url.origin === location.origin) {
    // SPA fallback for client-side routes
    if (e.request.mode === 'navigate') {
      e.respondWith(fetch(e.request).catch(() => caches.match(BASE+'index.html')))
      return
    }
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
})
