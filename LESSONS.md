# Lessons

Written 2026-09-05, at the end of a long session spent chasing one symptom
("iOS playback stutters") through six wrong answers to one right one. Kept
because every entry cost real time and most of them are not specific to this
bug.

Ordered by how much they cost, not by topic.

---

## Method

### 1. Measure the quantity in question, not one adjacent to it

Asked "is the publisher at fault?", I ran a container-vs-local A/B on **video**
segment cadence: jitter 0.40 both sides, EXTINF sd 0.003 s both sides. I
reported the publisher exonerated.

The publisher **did** have a defect — `-re` was missing on the audio input, so
lavfi's `sine` was read unpaced — and the A/B could not possibly have found it,
because I gave the local arm the same arguments. **An A/B where both arms share
the bug returns "identical", which reads as "fine".**

Later, asked the same question again, I measured the actual quantity: when each
**track's** playlist gains segments at the origin. Audio and video were within
2 ms and stayed in exact lockstep (`v-a = 0.00 s` over 12 samples). *That*
exonerated the publisher, and it is the only version of the answer worth having.

### 2. A green suite can mean zero coverage, not correctness

`demo/verify.mjs` reported **261/261 green** while demo 06 was fatally broken on
an iPhone — a TDZ that threw on every tick and rendered nothing. Desktop Chrome
resolves `useNative` to `false` and never enters that branch, so an entire code
path had no coverage while appearing fully tested.

The platform that takes a path is often the platform you cannot run locally. Now
`demo/verify-native.mjs` forces the branch with `?player=native`; Chrome cannot
*play* native HLS, but executing the path is what catches a scope error.

### 3. Attribution before iteration

For several rounds, "still broken" was ambiguous between *the fix is wrong* and
*the fix never loaded*. The user asked for a deploy id in the logs. It paid for
itself within one round: I could prove from the deployed bytes that a run had
genuinely loaded the startup gate, so that fix loaded **and** did not work —
which is information, where before there was none.

`build.mjs` now substitutes `BUILD = '<sha>-<hhmmss>'` into the deployed copy of
`shell.mjs`. The time suffix matters: an uncommitted edit deploys under the
previous sha.

### 4. Fixing something real is not the same as fixing the binding constraint

Four consecutive fixes were each correct and each failed to change the symptom:

| fix | real? | fixed the stutter? |
|---|---|---|
| latency target inside one GOP | yes, arithmetically | no |
| page playing before segments existed | no — it already had 3 | no |
| drift-seek loop aborting fragment loads | yes, 16 seeks in 2 min | reduced them only |
| `capLevelOnFPSDrop` | enabled correctly | **inert** — see #9 |

Being right about a mechanism says nothing about whether it dominates. Ask "what
would I expect to see if this were the cause, and do I see it?" before shipping.

### 5. Instrument the quantity that discriminates, then stop guessing

Two hypotheses survived a long time: *the device cannot keep up* versus *the live
edge is running away*. They have opposite fixes and I had been picking between
them on vibes.

One number settled it in a single run — playhead advance per wall second beside
edge advance per wall second:

```
ADV=0.284  EDGE=1.025      -> the device
ADV=0.785  EDGE=0.8        -> healthy, after the fix
```

When two hypotheses have opposite fixes, build the measurement that separates
them before touching either.

### 6. When a guard reports success, verify the effect

Three separate bugs from the same mistake — a substring guard that was already
satisfied, so the patch silently did nothing while printing `ok`:

- `if (!s.includes('BUILD'))` — the file contained **RE**`BUILD`
- `if (!s.includes('LOG_KEEP'))` — satisfied by the code just inserted above it
- `if (!s.includes('#log = []'))` — satisfied by `this.#log = []` in that code

Guard on the exact declaration, or assert the effect afterwards. Printing "ok"
is not evidence.

### 7. Prove a guard fires

After adding `checkImports()` to the build, I broke an import on purpose to
confirm it printed the offender and exited 1 — and separately confirmed the exit
code, because `cmd | tail` reports `tail`'s status, not the command's. A guard
never seen to fail is a guard you do not know you have.

### 8. Long-running measurements: no pipes, no dangling promises

Two self-inflicted stalls in one afternoon:

- `node measure.mjs | tail -30` buffers stdout until exit, so a run that was
  working looked hung. Write to a file.
- A `fetch('/status')` left un-awaited kept the event loop alive forever. Worse,
  `/status` on this Worker calls `super.fetch()` into the container, so on a cold
  start it *never returns* — the probe blocked on the thing it was measuring.

### 9. Verify the deploy landed before asking anyone to test

Immediately after `wrangler deploy`, the edge still served the previous build for
several seconds. Checking the stamp right away showed the old value and briefly
looked like a caching bug. Assets propagate; wait and confirm.

### 10. Read the code's own comments before overriding them

- `src/publish.sh` pinned `ffmpeg@7` with the comment *"needs libfreetype for
  the clock overlay"*. I used the default `ffmpeg`, which has no `drawtext`, and
  lost a measurement run.
- `container/server.mjs` said *"the key must never be echoed"* directly above
  code that only **truncated** a tail. The intent was recorded; the
  implementation never existed. ffmpeg then printed the stream key into a log
  served publicly by `/status`.

Both comments were correct and both were telling me something I ignored.

---

## Platform facts worth keeping

### iOS / MSE

- **iOS 17.1 added `ManagedMediaSource`.** `Hls.isSupported()` is therefore
  **true** on iPhone, which silently disables any native-HLS fallback written as
  `if (!Hls.isSupported() && canPlayType(...))`. That check was a correct proxy
  for "iPhone" for years and then quietly stopped being one. Decide on the real
  question: native HLS available **and** no plain `MediaSource` is iPhone.
- **Safari can close a ManagedMediaSource under you** — `mediaSourceRequiresReset`,
  "MediaSource closed while media attached". Every buffer is dumped; that is the
  visible flash. MMS also *gates loading* via `startstreaming`/`endstreaming`.
- **`video.buffered` on a MediaSource is the INTERSECTION of the source
  buffers.** With demuxed audio+video it reads 0.05 s while video holds 5 s.
  Diagnosing a "starved" player without splitting the tracks is guesswork.
- **Native HLS has no recovery hooks.** No `liveSyncDuration`, no level capping,
  no `hls.latency`. The only lever is a reload, so the watchdogs have to be
  rebuilt by hand — and a bare `<video src>` cannot survive a stream identity
  change at all.

### LL-HLS

- **A latency target inside one keyframe interval is unreachable.** Cloudflare
  advertises `PART-HOLD-BACK=1.5` with `PART-TARGET=0.5`, but only **one part per
  segment** carries `INDEPENDENT=YES` (10 of 38 measured). Parts append at 0.5 s;
  decoding restarts only every 2.0 s.
- **The spec deliberately does not define how a client picks its live position or
  latency target.** Every player invents a policy, which is the structural reason
  this tier is fiddly.
- **A 404 on a part at the live edge is normal** — players request parts as they
  are born. Separate it from real failures with a ceiling; do not silence it.
- **Cloudflare mints a new video UID on every encoder reconnect** (four observed
  in one day). Cached media URLs 404 afterwards.

### ffmpeg

- **`-re` is a per-input option.** `-re -i a -i b` paces only `a`. The RTMPS leg
  had it on video only for who knows how long; the WHIP leg and `publish.sh`
  always had both.

### MoQ

- **A relay cannot live in a Container** — no public IP, no raw listeners, so
  inbound QUIC is impossible. Dial-out clients only.
- **IETF `moq-pub` does not interoperate with hang**: catalog track name
  (`.catalog` vs `catalog.json`), schema (WARP vs hang RootSchema) and container
  declaration all differ. Both directions die at that one layer.
- **Browser-to-browser through Cloudflare's draft-14 relay works today** —
  measured p50 20.3 ms, and it needs no container and no Rust build. Demo 08 was
  blocked for weeks on a requirement that did not exist.

---

## Our own recovery layer was most of the problem

Worth stating plainly, because the instinct was to blame the dependency. Of
everything that broke in this session, **one** item was genuinely hls.js (its
audio stream controller starting behind the main one). The rest:

- the drift-seek storm — **ours**. `seekThreshold: 2.0` fired every 2–3 s, and
  each `currentTime` write **aborts the in-flight fragment loads**, so the buffer
  never grew, so latency climbed back over the threshold. A self-sustaining loop
  in our own code, presented as a stream problem.
- the 5.5 s buffer hole that outlived the lag — **ours**, made by the starved
  watchdog seeking forward over an audio-only shortfall. Seeking cannot make an
  audio segment arrive.
- `capLevelOnFPSDrop` inert — hls.js keys it on *dropped* frames; the device
  dropped 3 of 507 while advancing at 0.16×. Frames were not discarded; time
  crawled. Sane design, wrong signal for this failure.
- the TDZ that rendered nothing — **ours**, and invisible to the suite.

A seek is not free. A watchdog that fires on the wrong signal is worse than no
watchdog. Rate-limit every recovery action, require it to have somewhere to land,
and make it yield rather than retry forever.
