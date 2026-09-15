// demo/items/push-sw.js — the half of /items/ that runs when the page does not.
//
// 🔴 IT CACHES NOTHING, ON PURPOSE, AND THERE IS NO `fetch` HANDLER BELOW.
// A service worker is usually a cache, and a cache here would be a disaster
// this project has already priced: every deployed page carries a BUILD stamp so
// that "still broken" and "the fix never loaded" can be told apart, and a
// worker serving a returning visitor the PREVIOUS build makes those two
// observations identical again. `demo/verify.mjs` already deletes its profile's
// HTTP cache before every run for a much smaller version of the same problem.
// So this file exists for exactly one reason — to be awake when a notification
// arrives — and a `fetch` listener added here later would be a bug, not a
// feature.
//
// ⚠️ ITS SCOPE IS THIS DIRECTORY AND NOTHING ELSE. A worker's scope is the path
// it is SERVED from, so this one controls `/items/` and cannot touch the rest of
// positron.studio. The page registers it by path (`./push-sw.js`, scope `./`)
// and hands the registration to `getToken()`, because the Firebase SDK's
// default is to look for `/firebase-messaging-sw.js` at the ORIGIN ROOT — which
// would 404 here, and fail with an error that never mentions a path. That trap
// cost `proto/push` a debugging session and its header says so too.
//
// ⚠️ AND THERE IS NO FIREBASE SDK IN HERE, which is the one place `proto/push`
// does it differently. Its worker pulls two compat bundles off a CDN with
// `importScripts` purely to get `onBackgroundMessage`. That wrapper only parses
// the payload the browser has already delivered — a plain `push` listener sees
// the same bytes — so the SDK in a worker buys nothing and costs a network
// dependency on the one code path that has to work when the network is the
// thing that just woke us. `importScripts` also cannot be called lazily: a
// service worker throws if it runs after the first evaluation, so the choice is
// load-it-always or not at all.

// Take over immediately rather than waiting for every tab to close. The usual
// argument against this — a half-updated page talking to a new worker — needs a
// worker that serves content, and this one does not serve anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  // 🔴 SHOW SOMETHING, ALWAYS. A push that wakes a worker which shows no
  // notification makes Chrome post its own "this site has been updated in the
  // background" — which reads as a bug in the page rather than as one here.
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { notification: { title: 'positron', body: event.data ? event.data.text() : '' } }; }

  // FCM puts `notification` and `data` at the top level for web, and the whole
  // item rides in `data.item` as a string — every value in an FCM `data` block
  // must be a string, which is why the worker that sends it stringifies there.
  const n = payload.notification || {};
  const title = n.title || 'positron';
  const body = n.body || '';

  const seen = { at: new Date().toISOString(), where: 'background', payload };
  event.waitUntil((async () => {
    // Hand it to any open copy of the page first, so one log holds both the
    // foreground and the background arrivals.
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const c of clients) c.postMessage(seen);
    await self.registration.showNotification(title, {
      body,
      // ⚠️ A TAG COLLAPSES. Two items published a second apart would replace
      // each other under one tag and the reader would see the second only, so
      // the tag is the item's own id — different items stack, a repeat of the
      // same item does not.
      tag: `positron-item-${payload.data?.item_id || 'x'}`,
      data: payload.data || {},
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Raise the copy of this page that is already open before opening a second.
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    const here = new URL('./', self.location.href).href;
    for (const c of clients) if (c.url.startsWith(here) && 'focus' in c) return c.focus();
    if (self.clients.openWindow) return self.clients.openWindow(here);
  })());
});
