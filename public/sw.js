// Service Worker for Imperfect Form Mini App
// Provides basic caching and offline support

const CACHE_NAME = "imperfect-form-v1";
const STATIC_CACHE_NAME = "imperfect-form-static-v1";
const DYNAMIC_CACHE_NAME = "imperfect-form-dynamic-v1";

// Assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/og.png",
  "/splash.png",
  "/logo.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  // Add other static assets as needed
];

// Assets to cache on first access
const CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:js|css|woff|woff2|ttf|eot)$/,
];

// Network-first patterns (API calls, dynamic content)
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /^https:\/\/api\.neynar\.com/,
  /^https:\/\/.*\.vercel\.app\/api\//,
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Install event");

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS.filter((url) => url !== "/"));
      }),
      self.skipWaiting(), // Activate immediately
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate event");

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith("imperfect-form-")
            ) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(), // Take control immediately
    ])
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === "chrome-extension:") {
    return;
  }

  // Handle different types of requests
  if (isNetworkFirst(request.url)) {
    // Network-first strategy for API calls
    event.respondWith(networkFirst(request));
  } else if (isCacheable(request.url)) {
    // Cache-first strategy for static assets
    event.respondWith(cacheFirst(request));
  } else {
    // Stale-while-revalidate for other requests
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Check if URL should use network-first strategy
function isNetworkFirst(url) {
  return NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url));
}

// Check if URL is cacheable
function isCacheable(url) {
  return CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

// Network-first strategy
async function networkFirst(request) {
  const cacheName = DYNAMIC_CACHE_NAME;

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page or error response
    return new Response(
      JSON.stringify({
        error: "Network unavailable",
        message: "Please check your internet connection and try again.",
        offline: true,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cacheName = STATIC_CACHE_NAME;

  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Fallback to network
    const networkResponse = await fetch(request);

    // Cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Cache and network failed:", request.url);

    // Return a fallback response
    return new Response("Resource unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cacheName = DYNAMIC_CACHE_NAME;
  const cache = await caches.open(cacheName);

  // Get cached version
  const cachedResponse = await cache.match(request);

  // Fetch fresh version in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log("[SW] Background fetch failed:", request.url);
      return null;
    });

  // Return cached version immediately, or wait for network
  return cachedResponse || fetchPromise;
}

// Handle background sync (for future use)
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "fitness-data-sync") {
    event.waitUntil(syncFitnessData());
  }
});

// Sync fitness data when back online
async function syncFitnessData() {
  try {
    // Get stored offline data
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    // Implementation would depend on your offline data storage strategy
    console.log("[SW] Syncing fitness data...");
  } catch (error) {
    console.error("[SW] Sync failed:", error);
  }
}

// Handle push notifications (for future use)
self.addEventListener("push", (event) => {
  console.log("[SW] Push received");

  if (event.data) {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title || "Imperfect Form", {
        body: data.body || "You have a new notification",
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: data.tag || "default",
        data: data.data || {},
        actions: [
          {
            action: "view",
            title: "View",
            icon: "/icon-192x192.png",
          },
          {
            action: "dismiss",
            title: "Dismiss",
          },
        ],
      })
    );
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "view" || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
  }
});

// Log service worker messages
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log("[SW] Service Worker loaded");
