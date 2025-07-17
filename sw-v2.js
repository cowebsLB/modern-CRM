// Service Worker for Modern CRM - Auto-Update Version
const CACHE_NAME = 'modern-crm-v2.0.0'; // ✅ Increment this when updating
const OFFLINE_URL = '/index.html';

// Files to cache for offline functionality
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/storage.js',
    '/js/utils.js',
    '/js/ui.js',
    '/js/clients.js',
    '/js/projects.js',
    '/js/invoices.js',
    '/js/tasks.js',
    '/js/analytics.js',
    '/js/calendar.js',
    '/js/notifications.js',
    '/manifest.json',
    // External CDNs (cache for offline use)
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache resources and force immediate activation
self.addEventListener('install', (event) => {
    console.log('Service Worker v2.0.0: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: All files cached successfully');
                // 🔥 Force immediate activation - no waiting for old clients
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Cache installation failed:', error);
            })
    );
});

// Activate event - clean up old caches and claim all clients
self.addEventListener('activate', (event) => {
    console.log('Service Worker v2.0.0: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // 🔥 Delete all old caches that don't match current version
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Old caches cleaned up');
                // 🔥 Force control of all open tabs immediately
                return clients.claim();
            })
            .catch((error) => {
                console.error('Service Worker: Activation failed:', error);
            })
    );
});
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Claiming control');
                return self.clients.claim();
            })
    );
});

// Fetch event - Network-first strategy for updates, cache fallback for offline
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) {
        return;
    }

    // 🔥 Network-first strategy: Always try to get latest, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone response for caching
                const responseClone = response.clone();
                
                // Cache the new response for offline use
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                
                console.log('Service Worker: Serving fresh from network:', event.request.url);
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            console.log('Service Worker: Serving from cache (offline):', event.request.url);
                            return cachedResponse;
                        }
                        
                        // If it's a navigation request and we have no cache, show offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        
                        // For other requests, just fail
                        throw new Error('No network and no cache available');
                    });
            })
    );
});

                        // Clone the response for caching
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // Cache the fetched response for future use
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch((error) => {
                        console.log('Service Worker: Fetch failed, serving offline page:', error);
                        
                        // For navigation requests, serve the offline page
                        if (event.request.destination === 'document') {
                            return caches.match(OFFLINE_URL);
                        }
                        
                        // For other requests, you might want to serve a default offline resource
                        throw error;
                    });
            })
    );
});

// Background sync for offline data synchronization
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync-crm') {
        event.waitUntil(doBackgroundSync());
    }
});

// Push notifications (for future enhancements)
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New CRM notification',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open CRM',
                icon: '/icon-96x96.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icon-96x96.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Modern CRM', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification click received');
    
    event.notification.close();

    if (event.action === 'explore') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Background sync function
async function doBackgroundSync() {
    try {
        console.log('Service Worker: Performing background sync');
        
        // Here you would implement logic to sync offline data
        // with a server when connectivity is restored
        
        // Example: Check for pending data in IndexedDB and sync
        // This is a placeholder for future server integration
        
        // For now, just log that sync was attempted
        console.log('Service Worker: Background sync completed');
        
        // You could also send a message to the main thread
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC_COMPLETE',
                timestamp: Date.now()
            });
        });
        
    } catch (error) {
        console.error('Service Worker: Background sync failed:', error);
        throw error;
    }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received:', event.data);
    
    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'SYNC_DATA':
            // Trigger background sync
            self.registration.sync.register('background-sync-crm')
                .then(() => {
                    console.log('Service Worker: Background sync registered');
                })
                .catch((error) => {
                    console.error('Service Worker: Background sync registration failed:', error);
                });
            break;
            
        default:
            console.log('Service Worker: Unknown message type:', event.data.type);
    }
});

// Error handler
self.addEventListener('error', (event) => {
    console.error('Service Worker: Error occurred:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled promise rejection:', event.reason);
});

// Update check and cache management
self.addEventListener('updatefound', () => {
    console.log('Service Worker: Update found');
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('Service Worker: Periodic sync triggered:', event.tag);
    
    if (event.tag === 'crm-periodic-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

console.log('Service Worker: Loaded successfully');
