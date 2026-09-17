const CACHE_NAME = 'classmate-shell-v4'
const APP_SHELL = '/ClassMate_AI/'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      const responseCopy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL, responseCopy))
      return response
    }).catch(() => caches.match(APP_SHELL)))
    return
  }
  event.respondWith(caches.match(event.request).then((cachedResponse) => cachedResponse ?? fetch(event.request)))
})