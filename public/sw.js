/*
 * RinLit service worker
 * ---------------------
 * Hand-written and served from the site root so it can control the whole
 * origin. Registered by src/components/PwaHead.astro.
 *
 * Caching policy (deliberately conservative — this site is mostly SSR):
 *   • Same-origin static assets          → stale-while-revalidate.
 *     (/ _astro/ build output, /icons/, /favicon*, /images/)
 *   • Page navigations                   → network only, offline fallback.
 *   • Everything else (API, auth, Supabase) → straight to network.
 *
 * Page HTML is deliberately NOT cached: every page renders the signed-in
 * user's account state in the header, so a cached document could leak that
 * state on a shared device. Offline navigations get the static offline shell
 * instead. Only non-personalised, static assets are ever stored.
 */

const VERSION = 'v2';
const SHELL_CACHE = `rinlit-shell-${VERSION}`;
const STATIC_CACHE = `rinlit-static-${VERSION}`;
const OFFLINE_URL = '/offline.html';

// Upper bound on cached static entries so the cache cannot grow without limit.
const MAX_STATIC_ENTRIES = 200;

// Bump this list when the offline shell changes.
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
];

// Requests that must never be intercepted.
const BYPASS_ORIGINS = [
  'supabase.co',
  'supabase.in',
  'googleapis.com',
  'gstatic.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individual puts so one missing asset cannot fail the whole install.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (keep.has(name)) return undefined;
          if (!name.startsWith('rinlit-')) return undefined;
          return caches.delete(name);
        }),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.disable();
      }
      await self.clients.claim();
    })(),
  );
});

// Let the page trigger an immediate activation after an update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isBypassed(url) {
  if (BYPASS_ORIGINS.some((origin) => url.hostname === origin || url.hostname.endsWith(`.${origin}`))) {
    return true;
  }
  // Supabase storage / realtime traffic.
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return true;
  return false;
}

/**
 * Same-origin static assets only. Everything here is non-personalised and is
 * revalidated in the background, so a deploy self-heals on the next visit.
 */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/images/')
  );
}

/** Keep the static cache bounded; entries are re-fetched on demand. */
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_STATIC_ENTRIES) return;
  // Cache.keys() is insertion-ordered, so the oldest entries come first.
  const excess = keys.length - MAX_STATIC_ENTRIES;
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(keys[i]);
  }
}

/** Serve from cache immediately, refresh in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
        await trimCache(cache);
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await network) || Response.error();
}

/**
 * Navigations go straight to the network. On failure the static offline shell
 * is served — page HTML is never cached, see the note at the top of this file.
 */
async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response('离线', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isBypassed(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Only same-origin sub-resources are cached.
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});
