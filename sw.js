const CACHE_NAME = 'gold-loan-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/reports.html', // Added reports page
    '/styles.css',
    '/app.js',
    '/app_repports.js',
    '/db.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});