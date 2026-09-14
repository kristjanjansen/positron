// proto/push/firebase-messaging-sw.js — the half that runs when the page does not.
//
// A service worker is what makes a push arrive when the tab is closed or in the
// background: the browser keeps the connection, wakes this worker, and hands it
// the message. The page's own `onMessage` only ever sees FOREGROUND pushes, so
// testing without this file would prove exactly the case that does not matter.
//
// ⚠️ IT MUST BE SERVED FROM THE SAME PATH AS THE PAGE. A service worker's scope
// is its own directory, so this one controls `/proto/push/` and nothing else —
// which is correct here and is also why `index.html` registers it BY PATH and
// hands the registration to `getToken()`. The SDK's default is to look for
// `/firebase-messaging-sw.js` at the ORIGIN ROOT, which would 404 here and fail
// with an error that does not mention paths at all.
//
// ⚠️ `importScripts` + the COMPAT builds, not ESM. A classic service worker
// cannot `import`, and registering a module worker is a second thing to get
// wrong while debugging a first. This mirrors the arrangement already proven in
// the radio1965 client.

importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

// Public configuration. This identifies the project to Google and grants
// nothing — it is not the service account key, which never comes near a browser.
firebase.initializeApp({
  apiKey: 'AIzaSyBrhsydZ5mVttOmSJuXFbaJYnS9EuxGVYI',
  authDomain: 'positron-push.firebaseapp.com',
  projectId: 'positron-push',
  storageBucket: 'positron-push.firebasestorage.app',
  messagingSenderId: '826711684766',
  appId: '1:826711684766:web:f6410b53d4aca4ceab2d8f',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // 🔴 REPORT THE WHOLE PAYLOAD, NOT JUST THE BANNER. The question this page
  // exists to answer is "what exactly arrived", and a notification shows only
  // `title` and `body`. The DATA half is where an item would travel, and it is
  // the half that is invisible unless something prints it.
  const seen = { at: new Date().toISOString(), where: 'background', payload };
  console.log('[sw] background message', seen);

  // Hand it to any open copy of the page so the log survives in one place.
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clients) => { for (const c of clients) c.postMessage(seen); });

  self.registration.showNotification(payload.notification?.title || 'positron-push', {
    body: payload.notification?.body || '',
    tag: 'positron-push',
  });
});
