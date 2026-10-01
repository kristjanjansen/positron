# archive/items: the scheduled item and its push, removed 2026-10-01

`https://positron.studio/items/`, from 2026-09-14 to 2026-10-01, and the Worker
behind it at `https://items.positron.studio`. A page where you wrote an item
(a title and a body), named a moment, and a Durable Object alarm published it
at that moment with nothing polling, then told every installed phone through a
Firebase Cloud Messaging topic. It was the clean-room half of
`plans/plan-radio-messages.md`: one object owning the items, the schedule and
the send, against a per-minute cron on a VM polling MySQL and asking "is
anything due?" and almost always being told no.

Removed on instruction, 2026-10-01: *"discard items demo from ../positron, keep
the knowledge in .md's"*.

Nothing of the code is kept here, only what it learned. This file is the
knowledge, written out by topic from the comments of the five files that were
removed: `demo/items/index.html`, `demo/items/push-sw.js`,
`demo/items/manifest.webmanifest`, `workers/items/src/index.js` and
`workers/items/wrangler.jsonc` (the two square icons went with them). The code
itself is in the history: `git log --oneline -- demo/items workers/items`, 17
commits from `0eef691` (2026-09-14) on.

**Where it lives now.** The infrastructure moved to the eccm repository
(`kristjanjansen/eccm`, `src/items.mjs`, `src/push.mjs`, `public/sw.js`,
`public/push.mjs`, `public/items.mjs`), where it sends plain **Web Push with
VAPID** instead of going through Firebase. No FCM topic, no service-account
key, no Firebase SDK in the page.

⚠️ **THE WORKER `positron-items` WAS DELETED 2026-10-01**, by the owner with
`wrangler delete --name positron-items`, its Durable Object and the secret
`FIREBASE_SA` with it; `items.positron.studio` answers 530 since. Just before,
MEASURED with a read-only GET:
`GET https://items.positron.studio/punctuality?room=items` answered
`fires: 0`, `room: "items"`, `announcing: true`, `has_key: true`,
`has_topic: true`. So the real room is empty and the secret `FIREBASE_SA` is
on it. Nothing of either survives the deletion.

`proto/push/` (the FCM prototype the Worker grew out of: `send.mjs`,
`index.html`, `firebase-messaging-sw.js`) was not part of this removal and is
still in the tree.

---

## iOS, and installing

- 🔴 **iOS HIDES `Notification` AND `PushManager` ENTIRELY UNTIL THE PAGE IS ON
  THE HOME SCREEN**, and the failure is silent: in an ordinary Safari tab the
  APIs are simply not there. The test is a capability test, never a browser
  check: `'Notification' in window && 'PushManager' in window` is the same
  question on every platform. So the page said why it could not, not just that
  it could not: *"Install it first"* on the button in a tab, *"This browser has
  no notifications"* only when it was already standalone.
- 🔴 **THE NAME IN SETTINGS > NOTIFICATIONS IS `apple-mobile-web-app-title`**,
  falling back to the manifest's `short_name`. The same name labels the Home
  Screen icon. Both said "items", so somebody looking for "positron" in that
  list found nothing and concluded the app was not registered at all, REPORTED
  in exactly those words. A generic noun is a bad name for a row in a list of
  every app on a phone. It became `positron`.
  ⚠️ **iOS CACHES THE NAME AT INSTALL.** An icon already on the Home Screen
  keeps the old one until it is removed and added again.
- 🔴 **iOS LISTS A WEB APP IN SETTINGS > NOTIFICATIONS ONLY ONCE PERMISSION IS
  GRANTED.** WebKit's own wording: a web app appears there *"once permission is
  granted"*. So the report *"Positron is not in notification settings"* has four
  causes that look identical from outside (not installed, installed but launched
  from Safari, installed and never asked, asked and refused), and none of them is
  a scope or domain problem. The page printed on load which one it was:
  standalone or tab, `permission default/granted/denied`, and the worker's scope.
  When permission was `default` it added the one actionable sentence: *this
  device has never been asked, press Allow notifications*.
- 🔴 **A FOCUS MODE SWALLOWS THE BANNER AND NOTHING CAN TELL YOU SO.** It cost
  an evening: permission granted, address minted, device on the topic, FCM
  accepting every send, and no banner, because the phone was in **Sleep Focus**.
  It was in the status bar of every screenshot sent and nobody read it. There
  is no API for it, so the page named it as a cause, and named it where the
  good news was said (permission granted), because that is the moment somebody
  is about to conclude it is broken. Notification Centre still holds the
  notification.
  ⚠️ That log line first shipped with a ⚠️ emoji at its head, which made an
  ordinary fact look like a fault in the one place real faults are reported.
  The emoji came off (`positron-diagram` skill records it).
- ⚠️ **iOS MAY SHOW NO BANNER WHILE THE INSTALLED APP IS IN THE FOREGROUND.**
  MEASURED 2026-09-14 on *"can not see push notif on ios"*: two read-only probes
  proved the subscribe path end to end (`POST /subscribe` with a bogus token
  minted and reached a topic, FCM refusing the fake address, which is right;
  `iid.googleapis.com/iid/info/<token>` showed the iPhone as a live
  `webpush`/`BROWSER` registration on the topic). The remaining suspect was
  foreground suppression, so the page also logged arrivals itself, through
  `onMessage` in the foreground and through a `postMessage` from the service
  worker in the background, into one log.
- 🔴 **THERE IS AN INSTALL API AND SAFARI HAS NEITHER HALF OF IT.** Chrome and
  Edge fire `beforeinstallprompt`, which can be held and fired later from a
  press, and are trialling `navigator.install()`. Safari implements neither, so
  on iPhone and iPad every install is a person finding Share and then Add to
  Home Screen, and the page's only move is to say so in words. Asked directly:
  *"There is no api to trigger add to home screen?"*. The answer was no.
  ⚠️ **HELD, NOT USED ON THE SPOT.** The event arrives whenever the browser
  decides the page is installable, which is not a moment anybody pressed
  anything. `preventDefault()` keeps it for a press.
  🔴 **`prompt()` REFUSES A PRESS THAT WAS NOT A HAND, AND IT REJECTS RATHER
  THAN THROWS.** A `.click()` dispatched from script (which is how `verify.mjs`
  presses every control) gets `NotAllowedError: must be called with a user
  gesture` as an UNHANDLED REJECTION, so a `try` around it catches nothing.
  MEASURED twice, once with a `try` that did exactly nothing. The fix is a
  `.catch` on the returned promise, and a log line that keeps "this browser
  would not show it for this press" apart from "there is no install API here".
- ⚠️ **`.webmanifest`, NOT `.json`, AND THE REASON IS THE CONTENT TYPE.** Static
  hosting names the type from the extension, so `manifest.json` went out as
  `application/json` while the spec type is `application/manifest+json`.
  Browsers are lenient and iOS gives no diagnostic either way, which is why it
  was removed as a variable rather than argued about. The app's identity is the
  manifest's `id` (`"/items/"`), not its URL, so an installed icon survived the
  rename.
  🔴 **AND THE RENAME SHIPPED A 404 TO PRODUCTION**: `workers/view/build.mjs`
  copied an allowlist of extensions and `.webmanifest` was not on it, so the
  deploy went out with `<link rel="manifest">` pointing at nothing, the one file
  an iPhone reads to decide whether a page may be installed at all. The
  extension is on the list now, and the build's comment still cites this.
- **SQUARE ICONS, BECAUSE iOS MASKS THEM ITSELF.** A rounded source is rounded
  twice. The icons were the favicon's `e+` mark (same centre, same radii, same
  11 to 38 degree aperture) rendered square, at 180 and 512 px, with
  `apple-touch-icon` pointing at the 180.
- **The head that made it installable:** `<link rel="manifest">`,
  `apple-touch-icon`, `mobile-web-app-capable`, `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style:
  black-translucent`, `theme-color`. The manifest: `display: standalone`,
  `start_url` and `scope` both `./`, `id: "/items/"`, two icons with
  `purpose: any`.
- **Standalone is read two ways**, because iOS has its own:
  `navigator.standalone === true || matchMedia('(display-mode: standalone)').matches`.

## Permission and subscription

- 🔴 **`requestPermission` MUST BE REACHED WITH NOTHING AWAITED IN FRONT OF
  IT.** A browser raises the dialog only from inside a short user-generated
  handler, so one `await` above it and the prompt never appears, silently, on
  the one path where silence is the bug. The page called
  `Notification.requestPermission()` on the first tick of the press and did
  everything else (registering the worker, reading the manifest) while the
  dialog was up.
- 🔴 **SUBSCRIBING MUST NOT BE A SIDE EFFECT OF AUTHORING.** The prompt used to
  be raised from the Publish handler, on the theory that a press is a press.
  True and still wrong: somebody who only ever READS is never asked, never
  subscribes, and every announcement sails past them. REPORTED as *"how to make
  it work for others?"*. And a permission dialog on Publish is a dialog nobody
  asked for, which browsers penalise. So it became its own control.
- 🔴 **TWO BUTTONS, NOT ONE THAT MORPHS.** Installing and allowing are two acts a
  person performs on two different days; one control that silently becomes the
  other is a control whose label you have to re-read. `Add to the Home Screen`
  and `Allow notifications` each said their own state and refused for their own
  reason (`Already on the Home Screen`, `This device will be told`,
  `Notifications are blocked`, `Install it first`).
- **The yellow (`pos-pri`) moved to the ONE step still outstanding**: install,
  then allow, then neither, and Publish took it back. MEASURED on a real
  iPhone, freshly installed: `permission default, worker not registered yet`,
  which was that press never having happened while it sat as the third plain
  button behind a yellow Publish.
- **Say what is missing before asking for anything**: no `serviceWorker`, no
  secure context (`https` or `localhost`), not installed. Each of these
  otherwise fails as "notifications are broken here" rather than naming itself.
- 🔴 **A BROWSER CANNOT FINISH ITS OWN SUBSCRIPTION, AND WITHOUT THE SERVER THE
  INSTALLED PAGE RECEIVES NOTHING WHILE LOOKING CORRECT.** A page can mint its
  own device token from public config and the VAPID public key. Joining that
  token to an FCM topic is an admin call that needs the service-account key,
  which must never reach a browser. So the page ends up with permission
  granted, worker registered, token minted, and silence. The Worker did the
  join (`POST /subscribe {token}`, which calls
  `iid.googleapis.com/iid/v1:batchAdd` with `access_token_auth: true`) because
  that is where the key already was.
  ⚠️ **A failed join must not take the rest down.** `write()` threw on a non-OK
  status, so a bare call would have skipped the `onMessage` wiring below it.
  It was caught and said in words.
- ⚠️ **THE TOKEN IS NOT PRINTED.** It was, in yellow: 160 characters nobody can
  read. The log said that one came back, its length, and that the store took it.
- **The probe that checks the key without a device.** On setup the page POSTed
  a made-up token to `/subscribe`. FCM refuses it with `results: [{ error }]`,
  which proves the route exists and the store still holds a usable sending key,
  the part that silently rots. The assert's label said only that, because
  whether a REAL device was added is a different fact, proved by the real join.
- **The Firebase SDK was loaded lazily, only after a yes**, by dynamic
  `import()` from `gstatic.com` (12.16.0), so the compose and publish half never
  depended on a CDN. The web config (project `positron-push`) is public and
  grants nothing; the sending key is the service account, a secret on the Worker.

## The service worker (`push-sw.js`)

- 🔴 **IT CACHES NOTHING, ON PURPOSE, AND HAS NO `fetch` HANDLER.** A service
  worker is usually a cache, and here a cache would be a priced disaster: every
  deployed page carries a BUILD stamp so that "still broken" and "the fix never
  loaded" can be told apart, and a worker serving a returning visitor the
  PREVIOUS build makes those identical again. `demo/verify.mjs` already deletes
  its profile's HTTP cache before every run for a smaller version of the same
  problem. The worker existed only to be awake when a notification arrived, and
  a `fetch` listener added later would be a bug, not a feature. This is also why
  positron.studio is deliberately NOT a progressive web app and `/items/` was
  the one installable page.
- 🔴 **ITS SCOPE IS THE PATH IT IS SERVED FROM.** Served from `/items/`, it
  controlled `/items/` and could not touch the rest of the site. It does not
  have to live at the domain root: a worker's scope is the path it is served
  from, and that is all Web Push requires. The page asserted
  `reg.scope === new URL('./', location.href).href` and that it was not the
  origin root, and printed the scope on load so nobody had to take it on trust.
- 🔴 **THE FIREBASE SDK LOOKS FOR ITS WORKER AT THE ORIGIN ROOT**
  (`/firebase-messaging-sw.js`) unless it is handed a registration. On a page
  not at the root that 404s and `getToken` fails with an error that never
  mentions a path. It cost `proto/push` a debugging session. Fix: register by
  path (`./push-sw.js`, scope `./`) and pass `serviceWorkerRegistration: reg` to
  `getToken`.
- ⚠️ **NO FIREBASE SDK INSIDE THE WORKER.** `proto/push` pulled two compat
  bundles with `importScripts` purely for `onBackgroundMessage`, which only
  parses a payload the browser already delivered. A plain `push` listener sees
  the same bytes. The SDK there buys nothing and costs a network dependency on
  the one code path that has to work when the network is what just woke it.
  `importScripts` also cannot be called lazily (it throws after the first
  evaluation), so the choice is load-always or not at all.
- **`skipWaiting()` on install and `clients.claim()` on activate.** The usual
  argument against (a half-updated page talking to a new worker) needs a worker
  that serves content, and this one served nothing.
- 🔴 **SHOW SOMETHING, ALWAYS.** A push that wakes a worker which shows no
  notification makes Chrome post its own "this site has been updated in the
  background". If the payload did not parse as JSON, its text became the body
  under the title `positron`.
- ⚠️ **A TAG COLLAPSES.** Two items published a second apart under one tag
  replace each other and the reader sees only the second. The tag was the
  item's own id (`positron-item-<id>`): different items stack, a repeat of the
  same item does not.
- **Every arrival was also posted to open copies of the page** (`clients.matchAll
  ({ includeUncontrolled: true, type: 'window' })`), so one log held foreground
  and background arrivals both.
- **`notificationclick` raised the copy already open** (a client whose URL starts
  with the worker's directory) before opening a second.

## Firebase Cloud Messaging

- **FCM HTTP v1 with no SDK on the server.** `firebase-admin` is a Node library
  and a Worker is not Node. What replaced it is `fetch` plus WebCrypto: sign an
  RS256 JWT with the service account's key (`scope
  https://www.googleapis.com/auth/firebase.messaging`, `aud
  https://oauth2.googleapis.com/token`), exchange it for a bearer, POST to
  `fcm.googleapis.com/v1/projects/<id>/messages:send`. Proved first in
  `proto/push/send.mjs`, which is why it moved into the Worker unchanged. The
  bearer was cached per isolate until a minute before expiry.
- ⚠️ **THE PEM'S NEWLINES.** A secret read from an env var keeps its literal
  `\n` escapes, and `importKey` then fails with an opaque `DataError` that never
  mentions newlines. `private_key.replace(/\\n/g, '\n')` is the line that trap
  lands on.
- ⚠️ **EVERY VALUE IN AN FCM `data` BLOCK MUST BE A STRING**: FCM refuses nested
  objects. The whole item rode along as `data.item = JSON.stringify(item)`
  beside `item_id` and `item_type`, so a client COULD render without a fetch
  (the radio app deliberately re-fetches). For web, FCM puts `notification` and
  `data` at the top level of the push payload.
- ⚠️ **`results: [{}]` IS SUCCESS** from the Instance ID `batchAdd`: an empty
  object per token when it worked, an `error` key when it did not. Reading
  "empty" as "nothing happened" reports a working subscription as broken.
- 🔴 **A TOPIC SEND TO NOBODY LOOKS LIKE SUCCESS.** FCM accepts a topic with
  zero subscribers and returns a message name. Without the server-side join,
  every send "worked".
- 🔴 **THE TOPIC WAS NEVER CONFIGURED, AND IT BROKE THE PUSH PATH IN BOTH
  DIRECTIONS.** `announce()` threw `no FCM_TOPIC configured` on every publish, so
  `announced_at` stayed null on every row, and `POST /subscribe` read the same
  unset value, so no device could join a named topic. MEASURED 2026-09-15 at
  `GET /punctuality?room=items`: `room: "items"`, `announcing: true`,
  `has_key: true`, **`has_topic: false`**. The room rule and the key were both
  fine and both suspected first. Fixed as a `var`, `FCM_TOPIC: "positron-items"`:
  a topic name is a public channel name every subscriber must know, not a
  credential. After the fix a probe into the real room came back with
  `announced_at=1789484181710`, the first stamp that room ever carried.
  ⚠️ Changing the name means every device re-subscribes.
- 🔴 **ONE TOPIC, SO ONE ROOM MAY USE IT.** Rooms were separate Durable Objects
  (`idFromName(room)`) and `verify.mjs` gave every run its own room, but every
  room published to the single `FCM_TOPIC`. So the suite sent two real
  notifications to every real subscriber on every run, all day, REPORTED from
  the other end as *"why do I get notifications from positron? Is it your testing
  rig or what?"*. The harness, page and worker were each correct; nobody owned
  the sentence "a side room shares one loudspeaker with the real one". **A fact
  true of every part and of no part's author.** CLAUDE.md keeps this as the rule
  *ONE SHARED RESOURCE WITH EVERYTHING AROUND IT PARTITIONED*.
  ⚠️ **AN ALLOWLIST OF ONE (`ANNOUNCING_ROOM = 'items'`), NOT A PREFIX TEST.**
  Refusing rooms that look like `v-...` lets the next non-real room through by
  default, and the default has to be silence: a room has to be NAMED to reach
  a phone.

## The Durable Object and its alarm

- 🔴 **ONE OBJECT OWNS THE SCHEDULE AND THE SEND.** That was the architectural
  claim. An alarm fires AT the time, from the object that holds the state
  deciding it, with no VM and no poll, and costs nothing between publishes.
- 🔴 **NOTHING SCHEDULES AN ALARM IN THE CONSTRUCTOR.** On a cold wake the
  constructor runs BEFORE the handler, so a `setAlarm()` there overwrites the
  alarm about to fire; Cloudflare documents the resulting livelock where the
  handler never runs. Arm where a due time changes: on write, and at the end of
  a fire.
- ⚠️ **`getAlarm()` RETURNS NULL INSIDE A RUNNING HANDLER**, meaning "running",
  not "unscheduled". Reading it as the latter silently drops a schedule. So
  `rearm()` never consulted it and set unconditionally, which is safe because an
  object has one alarm and setting replaces. No due item meant `deleteAlarm()`.
- ⚠️ **NEVER SCHEDULE IN THE PAST.** An alarm at a time already gone fires
  immediately and re-enters: a busy loop wearing a schedule.
  `setAlarm(Math.max(due, Date.now() + 1))`.
- 🔴 **THE ALARM HANDLER CATCHES ITS OWN FAILURES.** Cloudflare retries a
  throwing alarm about six times over roughly two minutes and then NEVER re-runs
  it until something calls `setAlarm()` again. Two minutes is nothing against an
  upstream outage, and the failure is silent: the schedule just stops. Every
  failure was caught (per item for the announce, and around the whole body) and
  the alarm was re-armed before returning either way.
- **Visibility first, announcement second.** `status = 'new'` was written before
  the send, because what is published must not depend on the announcement
  succeeding. A one-minute-late alarm delays the announcement, never the truth.
- ⚠️ **`announced_at` IS STAMPED ONLY WHEN SOMETHING WENT OUT.** A side room
  reaches its moment and goes live exactly as the real one does; it just does
  not reach a phone. Stamping anyway would make the column mean "the announce
  step ran", a quieter and worse lie than null. MEASURED against the deployed
  worker: a fresh side room published an item that went `status: new` with
  `announced_at: null`.
- **Shelving is silent.** `new` to `shelved` at `shelf_at` sent nothing:
  announcing a shelving would tell every reader about a card leaving the top of
  the list, once per item, for ever.
- 🔴 **THE OBJECT HAS TO BE TOLD ITS OWN ROOM AND REMEMBER IT.** The alarm fires
  with no request, and `idFromName(room)` tells an object nothing about its own
  name, so the one place deciding whether an item may reach a phone had no
  access to the answer. The name was written to storage once, on the first
  request that named it, and read back in `blockConcurrencyWhile` on a cold
  wake. Written ONCE so a later request with a different `room` cannot talk the
  object into announcing.
  ⚠️ **AND THAT CREATES A STATE NOTHING COULD SEE.** An object first reached
  without `?room=` stores `default` and refuses to announce for ever, while
  every row reads `announced_at: null` and looks like a failed send. Opposite
  diagnoses, indistinguishable from outside, until `/punctuality` reported
  `room` and `announcing` (and `has_key`, `has_topic`: whether each thing
  `announce` needs is present, never the values).
- 🔴 **THE INPUT GATE DOES NOT COVER A NON-STORAGE AWAIT.** `announce()` is a
  `fetch`, so a read can and does land between `status = 'new'` and
  `announced_at`. This is the documented trap, and it caused two real faults
  on the page (next section).
- 🔴 **PUNCTUALITY WAS MEASURED, NOT QUOTED.** Cloudflare documents millisecond
  granularity AND *"up to a minute of delay during failover"*, so every fire
  recorded `actual - scheduled` in a `fires` table, and `GET /punctuality`
  returned the distribution (`min`, `p50`, `p95`, `max`, all values), not a
  mean, because the claim is about the TAIL. The design had to be correct with a
  minute-late alarm, not merely tolerant of one. The page asserted per run that
  both wakes were at least 0 ms and under 5000 ms late. ⚠️ No long-run
  distribution survives: the real room was cleared, and on 2026-10-01 it read
  `fires: 0`.
- **SQLite-backed** (`new_sqlite_classes: ["Items"]`), one object per room, the
  same shape `workers/store` proved.

### The item, and the store's API

Designed rather than inherited, then checked against what an existing client
consumes. Columns: `id`, `type`, `title`, `summary`, `url`, `tags` (JSON),
`payload` (JSON), `status`, `publish_at`, `shelf_at`, `created_at`,
`announced_at`, all times in ms.

- `type` one of `text`, `audio`, `video`, `audiostream`, `videostream`,
  `article`, `webcontent`. The page sent only `text`: a stepper through the
  other six was a control nobody moved.
- `status` one of `unpublished`, `new`, `shelved`, `archived`. Nothing on the
  page could set `archived`, so seeing one meant the room was changed elsewhere.
- 🔴 **`payload` IS THERE AND IS LOAD-BEARING.** The radio app's editor's own
  comment: *"fields with no dedicated DB column are sent inside payload"*, and
  the app reads `payload.author`, `payload.startsAt` and `payload.article_id`.
- **Two fields of their schema deliberately left out**: `comments_enabled`, which
  their own Qt client references zero times, and `updated_at`, likewise.
- **`publish_now`** is the editor's own word, kept because a hook fired when a
  stream starts has no future time to name.
- **What it deliberately did not do**: media, versioning, roles, localisation,
  preview. A CMS does those; saying so is the difference between a proposal and
  a pitch.
- Routes, each taking `?room=`: `POST /items`, `GET /items[?status=]` (newest
  first, with `next_due`), `POST /items/<id>/shelve`, `GET /punctuality`,
  `POST /subscribe {token, topic?}`, `POST /clear`. Every reply
  `cache-control: no-store` and `access-control-allow-origin: *`.

## The page, and the races it measured

- 🔴 **THE ROOM IS SHARED, SO THE PAGE HAS TO KEEP ASKING.** The list used to
  refresh only when the page itself published, and its comment called that a
  virtue (*"it watches its own schedule instead of polling on a timer"*). Right
  for one device, wrong for this one: an item written anywhere else was
  invisible until reload. REPORTED as *"msg in composer in other machine"*, and
  in another report as *"not in iOS Safari, just in browser"*.
  ⚠️ **NOT A WEBKIT QUIRK AND NOT A CACHE.** The accurate rule is *not on the
  device that did not publish it*, and any two devices reproduce it. The iOS
  framing would have sent the next reader hunting for something not there.
  Fixed with a 3 s steady read, made cheap by repainting only when a row
  signature changes, plus `visibilitychange` and `pageshow`, because **iOS
  Safari freezes timers in a backgrounded page and restores from the
  back/forward cache**, so the list on screen when a phone is picked up can be
  minutes old with no timer having run.
  The check for it: a row has to appear in the set filled ONLY by the timer's
  reads, never by a read inside a publish flow, because watching only its own
  publish is exactly the blind spot that let the bug ship.
- 🔴 **WAIT FOR A PREDICATE, NOT A STATUS.** The store writes the status, THEN
  sends, THEN stamps. Three checks failed on their first run because they saw
  `new` with nothing announced yet and did arithmetic on a missing stamp,
  printing `-1789410281.79 s`.
- 🔴 **THE RACE THAT MADE A CHECK RED ON THE LIVE PAGE WHILE THE SUITE STAYED
  GREEN.** PHOTOGRAPHED 2026-09-16: `FAIL and that second wake goes out to
  nobody, still stamped 11:35:01`. The baseline row was captured the instant it
  went `new`, so in the ANNOUNCING room it could be read with the stamp still
  null, and comparing it with the row after shelving reported a second
  notification that never happened. The store was fine. The fix was to take the
  baseline once the first wake had finished (status moved on, or stamp present).
  ⚠️ **WHY THE SUITE COULD NOT SEE IT**: announcing was an allowlist of one, so
  in a harness room both values are null and `null === null` passes however the
  race falls. Only a real run on `/items/` could fail it.
- 🔴 **STOP THE CLOCK WHERE THE CLAIM ENDS.** "Goes live unprompted" was reported
  with a number read after waiting for the notification, up to nine seconds.
  MEASURED in a side room where no notification can arrive: `live 9568 ms after
  the press`, of which publishing was a few hundred. The same number off the real
  room was taken for a slow store. And in a side room the page stopped waiting
  for a stamp that by rule never comes.
- 🔴 **A FAILURE MESSAGE HAS TO BRANCH ON THE SAME FACT AS THE VERDICT.** The
  side-room wording (`room items is not the announcing room`) printed in the
  announcing room too, so the one line a reader got on a real failure was false
  about the room that is.
- 🔴 **THE DESTRUCTIVE CONTROL WAITS FOR THE QUIET ONES.** `Clear all` pressed
  while an item was being watched deleted it under the watcher, which then
  reported, correctly and uselessly, that the item never went live. A page
  breaking its own measurement reads exactly like the store losing an item.
  Watchers were tracked in a SET, not a chain, so a publish was never delayed by
  another one running (a ten-second moment would quietly become ten seconds
  from whenever the previous watcher finished).
- **The punctuality record is written at the END of a wake**, so the page polled
  `/punctuality` until the expected number of fires was there, and read the
  lateness from the store, never from its own clock, which would be measuring
  the network.
- **Every `fetch` had a ceiling** (`AbortSignal.timeout(9000)`), so a page that
  cannot reach the store says so rather than hangs.

## The harness (`demo/verify.mjs`)

- 🔴 **`settleMs` GOES TO CONTROL 0 AND NOTHING ELSE**, and the harness stops
  collecting 400 ms after the assert count last grew. So whatever sits first is
  the only control that may take its time, and a ten-second publish watched from
  a control pressed second loses every assert behind the wait. The order that
  was asked for cost a REDESIGN, not a swap: `Publish now` became control 0 and
  gave its own item a `shelf_at` four seconds out. That second, silent wake IS
  the claim (a clock in the store wakes at a moment named earlier, unattended)
  in about five seconds, inside `settleMs: 11000`. `Publish in 10 seconds`
  asserted only what is true at once: the item is `unpublished`, the moment has
  not come, and the store's alarm is armed at or before it.
- ⚠️ **AN ASSERT IS MADE ON THE SPOT AND SETUP IS NOT AWAITED** for any control
  further down the row. `Allow notifications` claimed only that the page can put
  the question to this browser or say why not; the rest was logged as it landed.
- ⚠️ **CONTROLS STAY INSIDE `.pos-controls`**, the only place `verify.mjs` looks;
  a control outside it is a subject the suite silently stops testing. So the
  composer moved up above the row instead of the buttons moving down, and the
  two once-per-device buttons stayed declared in `controls` with only their DOM
  nodes moved to a second row under the head.
- **The poll interval follows the harness**: 400 ms, because with three buttons
  the harness pressed the next one 650 ms later, and a watcher asleep longer than
  that was still asleep when the room was emptied under it.
- **Room names are `<demo>-test-<hash>`**, not `v-<demo>-<hash>`. Asked *"What is
  v- prefix?"*: a room name is read by somebody looking at a store wondering what
  the rows are, and `items-test-4f2a` answers that. It also cannot be mistaken
  for the real room by a rule that has to tell them apart.
- **The diagram's return value is graded.** `createDiagram` returns `cuts` (a
  label that did not fit, a note over budget, a link it could not route). Until
  2026-09-20 this page discarded it, and `/station/` had lost three real arrows
  for two sessions exactly that way.

## The page's interface decisions

- **Composer above the control row, log below it.** The buttons that publish sit
  under the thing they publish, and the result appears under the press so its
  state changes without scrolling.
- ⚠️ **GRID, NOT A COLUMN FLEX, FOR THE STACKED FIELDS.** `.pos-field.wide`
  carries `flex: 1 1 240px`, and in a COLUMN flex container a basis is a height,
  so two 34 px inputs became two 240 px boxes. A grid child is not a flex item.
- 🔴 **THE LOG BOX HAS ONE HEIGHT, EMPTY OR FULL.** Asked 2026-09-16 with a
  screenshot: *"have fixed height on this box / table and rm empty message"*. A
  box that grows as rows arrive moves the button you are about to press again.
  Written as the sum of what goes in (`8 * (17px + 6px + 1px)`: eight one-line
  rows of 11 px at 1.55, 3 px padding each side, a 1 px rule) so it can be
  re-derived, with `height` not `max-height`, because the component's default
  `max-height` still grows from nothing. And no empty message: the empty box
  already says it.
  🔴 **THAT RULE FIRST NAMED `.pos-msgs` AND STYLED NOTHING**: the page had moved
  to `createTable` (`.pos-tbl`, `.pos-tbl-body`) in between, so it read as done
  while matching nothing. Found 2026-09-18 by audit: a component swap moves every
  selector that named the old one, and a selector matching nothing is silent.
- **`table.mjs`, the same component as `/wire/`**, so a row is styled in one
  place. Columns: a 4-letter state (`wait`, `live`, `away`, `gone`, because the
  column was 34 px and there is no fifth letter), the text, and `sent`.
- 🔴 **COLOUR SAYS HOW THE ITEM LANDED AND NOTHING ELSE**: grey for a moment not
  yet come, green for live, grey-blue for gone by, amber for `archived`. Whether
  the phones were told is the word `sent` in its own column: one channel per
  fact.
- ⚠️ **NO BUSY SWEEP ON THE SCHEDULED PUBLISH.** The shell's shimmer means "this
  is working", and waiting for a moment you named is not work in progress. Both
  `animation: none` and `background-image: none`, or the highlight freezes
  mid-face.
- **`what` was instructions, one line, the same sentence as the index card**
  (*"Write an item. At the moment you named, it publishes itself and tells the
  phones."*), because the page has a diagram and a paragraph beside a picture is
  the weaker of two explanations of one thing.
- **No readout.** Its four clock cells (`next`, `wakes`, `late`, `worst`) each
  repeated an assert, and a cell that repeats an assert is a second place for a
  fact to go stale.
- **Tabs went on for one commit and came off.** A `Contribute` tab: three names
  over one list and one form is furniture. `tabs.mjs` later found its first real
  use on `/making/` and `/stage/`, whose comments still cite this.
- **The diagram's caption is the architecture and its reason**: *"Two refusals
  shape this: nothing runs between publishes, and nothing here holds a list of
  who is subscribed."* Two drafts were wrong first (one picked mechanisms out of
  the middle, one traced the path the arrows already show). Every box a thing
  that exists, every note naming the technology. **Two phones**, an iPhone (Web
  Push via APNs, only from the Home Screen) and an Android (Web Push delivered by
  FCM, no install needed, a closed Chrome tab still receives), because with one
  phone the picture reads as "the store sends to that phone", the design it
  deliberately was not. Both arrows labelled `push`, not `same push`: a label is
  what travels.
- **The `sent` stamp, not a tick**: a word needs no legend, and empty is the
  quiet, common case.
