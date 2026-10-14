# timeline-misc

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/keepalive.mjs`

### keepalive

Above `export async function keepAwake({`, lines 1 to 42 before the cut.

~~~js
// timeline/keepalive.mjs — the two cheap, PUBLISHED exemptions that keep a
// hidden tab's clock alive. v0.6. Browser only, plain ESM, no deps.
//
// ===========================================================================
// WHY THIS FILE EXISTS. Our hidden-tab result (worker tick 8.5 ms p95 hidden
// vs main-thread 981 ms, rAF 9175 ms) defends against THROTTLING. Chrome 133
// added a second, different mechanism — FREEZING on Energy Saver — and a
// worker tick is not on its exemption list:
//
//   >5 min hidden + silent + CPU-intensive  ->  the page is FROZEN
//   exempt: mic/camera/screen-capture, a live RTCPeerConnection,
//           WebUSB / WebBluetooth / WebHID, or a HELD WEB LOCK
//   — https://developer.chrome.com/blog/freezing-on-energy-saver
//
// MEASURED HERE (timeline/lab/run-freeze.mjs, SIGSTOP on the renderer, which
// is what a freeze is): a dedicated worker is frozen WITH its page — its own
// `setInterval` log shows the same multi-minute gap the main thread does. The
// worker tick host buys nothing against freezing. So the mitigation has to be
// one of Chrome's own exemptions, and two of them are nearly free:
//
//   (1) A HELD WEB LOCK — explicitly on the exemption list, one line, no
//       audio device, no permission prompt, works with the tab muted.
//   (2) AN AUDIBLE PAGE — an audible page is exempt from freezing AND from
//       the 1 Hz background timer clamp, and Firefox additionally does not
//       throttle a tab containing an AudioContext at all.
//       ⚠️ HONEST CAVEAT: "audible" is Chrome's own determination and a
//       gain of literally 0 is NOT audible. This helper therefore emits a
//       real, tiny (default 8e-4) low-frequency tone rather than silence,
//       and reports the gain it used. If you cannot accept any output, use
//       the lock alone.
//
// AND THE THIRD OPTION, which is the one we actually rely on: ACCEPT THE
// FREEZE. `catchUp: 'reduce'` folds the whole missed prefix and re-asserts on
// the first task after resume — measured at 0.1 ms to correct state after a
// 20 s freeze and (see NOTES) at 5-minute scale. A frozen tab that wakes up
// CORRECT is a much cheaper guarantee than a tab that never freezes.
//
//   import { keepAwake } from './keepalive.mjs';
//   const ka = await keepAwake({ lock: true, audio: true });
//   ka.status();   // {lock, audio, reasons}
//   ka.release();
// ===========================================================================
~~~

## `timeline/logdeck.mjs`

### logdeck

Above `import { createDeck } from './transport.mjs';`, lines 1 to 19 before the cut.

~~~js
// timeline/logdeck.mjs — the *flat capture log* front end for transport.mjs.
//
// Every client of this library so far stores its performance as one flat log of
// rows stamped in EPOCH MICROSECONDS, and every one of them has had to write
// the same eight lines to get from there to the library's {at ms} item domain:
// find the origin, subtract it, divide by 1000, add a lead-in so position 0
// sits strictly before the first event. proto/jam wrote it first
// (proto/jam/jam-timeline.js `makeDeck`, the 39-line seam); the instrument
// client needed it again — but with TWO note lanes and a media lane on ONE
// timeline, which `makeDeck`'s single-`kind` signature cannot express.
//
// So the seam moves up here and grows a `lanes` array. `makeDeck({log, adapter,
// kind})` is exactly `makeLogDeck({lanes: [{kind, rows: log, adapter}]})`.
//
// A lane may emit more than one item per row (`expand`) — a media-span row is a
// start/end PAIR on the timeline, which is how proto/selfrec/replay-grid.html
// schedules its tiles.
//
// Plain ESM, no deps, browser+node. Nothing here knows what a note is.
~~~

### make-log-deck

Above `export function makeLogDeck({`, lines 23 to 29 before the cut.

~~~js
/**
 * @param lanes   [{kind, rows:[{at µs,…}], adapter, expand?(row,i)->[{atUs|atMs,id?,payload?}]}]
 * @param originUs  explicit position-domain origin (default: earliest row)
 * @param leadInMs  position 0 sits this far BEFORE the origin, so seek(0)
 *                  replays the whole session instead of starting mid-note
 * everything else is handed straight to createDeck().
 */
~~~

### control-fields

Above `const { at: rowAt, ...rest } = p.payload || {};`, lines 51 to 60 before the cut.

~~~js
// CONTROL FIELDS ARE INJECTED **AFTER** THE SPREAD. This used to read
// `{ i, at, ...p.payload }`, and p.payload defaults to the raw capture
// ROW — whose own `at` is in EPOCH µs. The spread therefore silently
// overwrote the position-domain `at` the library had just computed, in
// the field the library itself injected: §2's law ("untrusted payloads
// must not spread over control fields") broken inside the library that
// records it. Reported by the first continuous client
// (proto/paths/NOTES.md S6), which had to carry an `expand()` whose
// payload avoided the key `at` entirely. Both control fields now win,
// and the row's own stamp stays reachable as `atUs`.
~~~

### reduced-keys

Above `reducedKeys(kind, posMs) {`, lines 74 to 76 before the cut.

~~~js
/** the keys the reducer says should be asserted at posMs — C2's left-hand
 *  side, for any reducer returning a Map or a Set (held notes, present
 *  tiles, fired cue ids). */
~~~
