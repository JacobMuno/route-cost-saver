/* Trip Cost Calculator — Service Worker
 * Strategy:
 *  - App shell: cache-first (precached on install, falls back to network)
 *  - Same-origin built assets (/_build/, /assets/): stale-while-revalidate
 *  - OSM tiles (a/b/c.tile.openstreetmap.org): stale-while-revalidate, capped ~50MB
 *  - ORS, API Ninjas, and any /_serverFn/ calls: NEVER cached (network only)
 */

// Bump this on every deploy to invalidate old caches.
const CACHE_VERSION = "v1";
const SHELL_CACHE = `tripcost-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `tripcost-runtime-${CACHE_VERSION}`;
const TILE_CACHE = `tripcost-osm-tiles-${CACHE_VERSION}`;
const TILE_CACHE_MAX_BYTES = 50 * 1024 * 1024; // ~50 MB

const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Best-effort: don't fail install if any single asset 404s.
      Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch(() => {
            /* ignore */
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("tripcost-") &&
              ![SHELL_CACHE, RUNTIME_CACHE, TILE_CACHE].includes(k),
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isOsmTile(url) {
  return /(^|\.)tile\.openstreetmap\.org$/.test(url.hostname);
}

function isNoCacheApi(url) {
  // ORS + API Ninjas are called from server functions, but if anything
  // ever hits these directly from the client, never cache them.
  if (
    url.hostname === "api.openrouteservice.org" ||
    url.hostname === "api.api-ninjas.com"
  ) {
    return true;
  }
  // TanStack server function endpoints (also covers ORS proxied via server fns)
  if (url.pathname.startsWith("/_serverFn/")) return true;
  return false;
}

async function trimCache(cacheName, maxBytes) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  let total = 0;
  const sizes = [];
  for (const req of requests) {
    const res = await cache.match(req);
    const len = Number(res?.headers.get("content-length") ?? 0) || 8 * 1024; // assume 8KB if unknown
    sizes.push({ req, len });
    total += len;
  }
  if (total <= maxBytes) return;
  // Evict oldest (Cache Storage preserves insertion order) until under limit.
  for (const { req, len } of sizes) {
    if (total <= maxBytes) break;
    await cache.delete(req);
    total -= len;
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const networkPromise = fetch(event.request)
    .then((res) => {
      if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
        cache.put(event.request, res.clone());
        if (cacheName === TILE_CACHE) {
          // Fire-and-forget trim
          trimCache(TILE_CACHE, TILE_CACHE_MAX_BYTES);
        }
      }
      return res;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Never cache fresh API calls
  if (isNoCacheApi(url)) return;

  // OSM tiles → SWR with size cap
  if (isOsmTile(url)) {
    event.respondWith(staleWhileRevalidate(event, TILE_CACHE));
    return;
  }

  // Same-origin requests
  if (url.origin === self.location.origin) {
    // Navigation requests → network first, fall back to cached shell ("/")
    if (req.mode === "navigate") {
      event.respondWith(
        fetch(req).catch(async () => {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match("/")) || Response.error();
        }),
      );
      return;
    }
    // Built JS/CSS/images → SWR
    event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE));
    return;
  }

  // Other cross-origin (e.g. unpkg leaflet) → SWR runtime cache
  if (
    url.hostname === "unpkg.com" ||
    url.hostname === "cdn.jsdelivr.net" ||
    url.hostname.endsWith(".cloudflare.com")
  ) {
    event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE));
  }
});
