const CACHE_NAME = 'classmate-shell-v1'
const APP_SHELL = '/ClassMate_AI/'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse ?? fetch(event.request)),
  )
})