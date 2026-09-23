const CACHE_NAME = 'classmate-shell-v5'
const APP_SHELL = '/ClassMate_AI/'
const RUNTIME_CACHE = 'classmate-runtime-v5'

const ASSET_EXT = /\.(js|mjs|css|svg|png|woff2?|json)$/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(APP_SHELL)).catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
        .map((cacheName) => caches.delete(cacheName)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  // Navegación: red primero, respaldo a la shell cacheada (offline).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL, copy))
          return response
        })
        .catch(() => caches.match(APP_SHELL)),
    )
    return
  }

  // Assets estáticos del mismo origen (js/css/imágenes con hash de Vite):
  // cache-first con relleno en runtime → el segundo uso ya funciona offline.
  if (url.origin === self.location.origin && ASSET_EXT.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
      }),
    )
    return
  }

  // Todo lo demás (Firestore, Auth, etc.): solo red.
})