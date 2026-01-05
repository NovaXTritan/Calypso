const CACHE_VERSION = 'cosmos-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const BASE = '/cosmos/'

// Core assets to cache immediately
const CORE_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'favicon.svg',
  BASE + 'manifest.json',
  BASE + 'og.png'
]

// Assets to cache on first use
const CACHE_FIRST_PATTERNS = [
  /\.(?:js|css)$/,  // JS and CSS bundles
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,  // Images
  /\.(?:woff2?|ttf|otf)$/  // Fonts
]

// Network-first patterns (always try network, fallback to cache)
const NETWORK_FIRST_PATTERNS = [
  /firestore\.googleapis\.com/,
  /firebase/,
  /api\//
]

// Install: cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('cosmos-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// Fetch: smart caching strategy
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests except for CDN assets
  if (url.origin !== location.origin && !url.hostname.includes('cdn')) {
    return
  }

  // Network-first for API calls
  if (NETWORK_FIRST_PATTERNS.some(p => p.test(url.href))) {
    e.respondWith(networkFirst(request))
    return
  }

  // SPA navigation: network with offline fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone()
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(BASE + 'index.html'))
    )
    return
  }

  // Cache-first for static assets
  if (CACHE_FIRST_PATTERNS.some(p => p.test(url.pathname))) {
    e.respondWith(cacheFirst(request))
    return
  }

  // Default: stale-while-revalidate
  e.respondWith(staleWhileRevalidate(request))
})

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => cached)

  return cached || fetchPromise
}

// Listen for skip waiting message
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
