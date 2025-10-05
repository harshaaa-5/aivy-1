// Learnova Modern - Service Worker
// PWA functionality with offline support and caching

const CACHE_NAME = 'learnova-modern-v2.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/client-modern.js',
  '/style.css',
  '/manifest.json',
  // CDN resources
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js',
  'https://cdn.socket.io/4.7.4/socket.io.min.js',
  'https://unpkg.com/three@0.157.0/build/three.min.js',
  'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/user/profile',
  '/api/subjects',
  '/api/analytics/performance'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('SW: Install event');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('SW: Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('SW: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activate event');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other requests
  event.respondWith(handleDynamicRequest(request));
});

// Handle API requests with cache-first strategy for specific endpoints
async function handleAPIRequest(request) {
  const url = new URL(request.url);

  // Cache-first strategy for specific API endpoints
  if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    try {
      const cache = await caches.open(API_CACHE);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        // Return cached response and update in background
        fetchAndCache(request, API_CACHE);
        return cachedResponse;
      }

      // No cache, fetch from network
      const response = await fetch(request);

      if (response.ok) {
        const responseClone = response.clone();
        cache.put(request, responseClone);
      }

      return response;
    } catch (error) {
      console.error('SW: API request failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Network request failed',
          offline: true 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Network-first for other API requests
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.error('SW: Network request failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Network request failed',
        offline: true 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Not in cache, fetch from network
    const response = await fetch(request);

    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    console.error('SW: Static request failed:', error);

    // Return offline fallback for critical assets
    if (request.url.includes('.html') || request.url.endsWith('/')) {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/index.html');
    }

    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.error('SW: Navigation request failed:', error);

    // Return cached index.html for offline navigation
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/index.html');

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('App not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle dynamic requests with network-first strategy
async function handleDynamicRequest(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      const responseClone = response.clone();

      // Limit cache size
      limitCacheSize(DYNAMIC_CACHE, 50);
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    console.error('SW: Dynamic request failed:', error);

    // Try to serve from cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Resource not available offline', { status: 503 });
  }
}

// Background fetch and cache
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.error('SW: Background fetch failed:', error);
  }
}

// Limit cache size to prevent storage overflow
async function limitCacheSize(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxItems) {
      // Delete oldest entries
      const keysToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  } catch (error) {
    console.error('SW: Cache size limiting failed:', error);
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('SW: Background sync event:', event.tag);

  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    console.log('SW: Syncing offline data');

    // Get offline data from IndexedDB or localStorage
    const clients = await self.clients.matchAll();

    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_DATA',
        data: { message: 'Connection restored, syncing data...' }
      });
    });

    console.log('SW: Offline data sync completed');
  } catch (error) {
    console.error('SW: Offline data sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('SW: Push notification received');

  const options = {
    body: 'You have new learning recommendations!',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'learnova-notification',
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.body || options.body;
      options.data = { ...options.data, ...payload.data };
    } catch (error) {
      console.error('SW: Failed to parse push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Learnova', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('SW: Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  console.log('SW: Message received:', event.data);

  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      clearAllCaches();
      break;

    case 'UPDATE_CACHE':
      updateCache(data);
      break;

    default:
      console.log('SW: Unknown message type:', type);
  }
});

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('SW: All caches cleared');
  } catch (error) {
    console.error('SW: Failed to clear caches:', error);
  }
}

// Update specific cache
async function updateCache(data) {
  try {
    if (data.urls && Array.isArray(data.urls)) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(data.urls);
      console.log('SW: Cache updated with new URLs');
    }
  } catch (error) {
    console.error('SW: Failed to update cache:', error);
  }
}

// Periodic cleanup
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(performCacheCleanup());
  }
});

// Perform cache cleanup
async function performCacheCleanup() {
  try {
    console.log('SW: Performing cache cleanup');

    // Clean up dynamic cache
    await limitCacheSize(DYNAMIC_CACHE, 30);

    // Clean up API cache
    await limitCacheSize(API_CACHE, 20);

    console.log('SW: Cache cleanup completed');
  } catch (error) {
    console.error('SW: Cache cleanup failed:', error);
  }
}

console.log('SW: Service Worker loaded successfully');
