# Lessons

Written 2026-09-05, at the end of a long session spent chasing one symptom
("iOS playback stutters") through six wrong answers to one right one. Kept
because every entry cost real time and most of them are not specific to this
bug.

Ordered by how much they cost, not by topic.

---

## Session 11 — a reader who does not work here

Written 2026-09-07, from a UI/UX review of the demos. Every entry started as
somebody saying "I don't understand this" and turned out to be a defect.

### 14. "I don't understand this" is a bug report, not a copy edit

Six reader questions, six real faults: *what is drift* (the page never defined
its headline number — and was fabricating it); *green but late???* (a colour
scale calibrated against an absolute ideal rather than the mechanism); *what
alarm??* (a metaphor introduced in one paragraph and reused in a tooltip read
on its own); *what is attested?* (a provenance line leaking into a demo with no
restorations, inviting the conclusion that the colour meant attested); *where
is the missed one?* (a readout counting something invisible); *why do I need
the slider?* (two position surfaces, one of which scrubbed better). None was
fixed by rewording alone.

### 15. A page can display a fabricated number and read green

`01 transport` printed `0` for drift because `deck.drift()` returns an ARRAY and
the page read `dr?.p50 ?? dr?.ms ?? 0`. Every branch missed; the literal zero
won. The assert passed too — `dr !== undefined && dr !== null` is satisfied by
`[]`. Twenty real measurements were in memory the whole time (p50 1.0, max
1.7 ms). **An assert on "did we get an answer" must require the SHAPE of the
answer**, not merely a non-null.

### 16. A boundary in the render loop is not a boundary

Fourth instance of a rule this project already had. Stop-at-end lived in
`paint()`, driven by rAF; in a hidden tab a 20 s deck reached **91,001 ms** and
still reported `playing: true`, while the bar's clock sat frozen at 0:00.000.
The scheduler kept perfect time throughout — the only broken thing was asking
the renderer to enforce a rule. When you move one out, say what the replacement
CANNOT do: ours is a main-thread `setTimeout`, so a hidden tab clamps it to
~1 Hz. Bounded error beats unbounded, and the caveat belongs in the source.

### 17. A colour scale whose normal reading is a warning has no warning left

An absolute 5 ms threshold painted 18 of 20 marks amber — while our own lab
measures the shipped worker host at p50 5.0 ms, so the DOCUMENTED BASELINE was
amber. Calibrate against what the mechanism promises, not against an ideal.
Derive the colour and the words from ONE table, so a green bar can never be
described in language that sounds like a failure.

### 18. Every readout cell must be able to change

`MISSED` was structurally 1 — the mark due at position 0 can never have a timer,
because play had not been pressed when the timers were set. A constant dressed
as a measurement teaches a reader to ignore the whole row.

### 19. A control the harness cannot reach reads as a broken page

`verify.mjs` presses buttons in `.d-controls` and nothing else. A hardware
button mounted in the page body produced `page asserted something — 0`, which
looks exactly like a demo that does not work. Same shape as #2 and #13: the
suite was not wrong, it was not reaching the thing.

### 20. Match the assert threshold to what the harness actually exercises

Gating 01's asserts on five drift rows read as "asserted nothing", because
`verify.mjs` plays for 500 ms — which is one mark. Assert on the first row.

### 21. A default built for measurement is not a default built for a human

`createAudioLane` emits a ONE-SAMPLE impulse so threshold detection can find its
exact sample. At 48 kHz that is 20 µs, i.e. inaudible, so `02 lanes` appeared to
do nothing when you turned the sound on. The measurement default was right and
the demo needed `makeNode`. Ask who the default is for.

### 22. A counter that counts INTENT reads exactly like one that counts DELIVERY

`createMidiLane` scheduled every note about fifty-six years out — `send()` takes
a `performance.now()` timestamp and the transport's clock is epoch ms — and
nothing threw, nothing logged, and `midi out: 31` climbed exactly as if it had
worked. That counter was the length of our own scheduled-log. I reported "the
first MIDI this project has ever sent" on the strength of it. Before quoting a
count as evidence, ask which side of the boundary it is counted on.

What exposed it was a screenshot of a DASH: the loopback readout empty on a page
whose log said it was listening. Two symptoms, one root cause, which is what
made it findable at all.

### 23. A loopback is a measurement instrument — but not with the stamp it hands you

MIDI out looked unmeasurable without hardware. macOS's IAC driver returns
everything written to it, so the page can watch its own output.

The trap is which clock you read. `MIDIMessageEvent.timeStamp` came back
**exactly equal to the send timestamp, 0.000 ms, five times out of five** —
CoreMIDI carries the stamp in the packet and Chrome passes it through, so
comparing them measures nothing and looks perfect. `performance.now()` sampled
in the handler is on our side of the trip and does not cancel: p50 0.4 / p95
0.6 / max 3.7 ms over 31 notes. State what the loopback does NOT cover — this
one includes the main-thread event loop and excludes every cable — and it is a
bound worth having rather than a claim.

MIDI out looked unmeasurable without hardware. macOS's IAC driver returns
everything written to it on the input of the same name, and
`MIDIMessageEvent.timeStamp` lands in `performance.now()`'s domain — the same
domain the lane records `intendedUs` in — so the page can measure its own
output with no device attached. State what the loopback does NOT cover
(send → CoreMIDI → receive, not send → a synth on a cable) and it is a floor
worth having rather than a claim.

### 24. One fabricated zero is a bug; three is a class

`dr?.p50 ?? dr?.ms ?? 0` printed a confident 0 in 01, and then in 03, because
both `deck.drift()` and `nestedDrift()` return something with no `p50` on it —
an array in one case, `{fires, range, pos, kinds:{…}}` in the other. Both
asserts passed every time, because both only checked non-null.

The third one was not found by looking at the page. It was found because the
pattern had a name by then. **When a defect has a shape, grep for the shape
before reviewing anything else** — `?? 0` is a fifteen-second search that would
have found all three on the first day.

### 25. A scrub is not an observation

Three demos coloured their marks with `latch`, which recolours from the
PLAYHEAD, so dragging backwards turned measured marks grey again — as if moving
the cursor un-measured them. Colour that encodes a measurement must come from
the measurement. Navigation is not evidence, and the picture should only change
when something new is learned.

### 26. A second implementation has to be LOOKED AT, not reasoned about

The favicon exists twice: an SVG, and a pixel loop that writes `favicon.ico`.
The parameters that gave a clean 'e' as an SVG gave a squashed counter, a
terminal curled into a hook, and a glyph touching the left edge as pixels — a
rasteriser and a nearest-neighbour plot are not the same function. Two rounds of
"adjust the numbers and hope" both shipped something broken. What worked was
rendering the .ico at 16x beside three candidate parameter sets and choosing by
eye, which took one attempt.

Same family as #1: I was measuring the quantity next to the one in question —
the SVG's geometry rather than the ICO's pixels.

### 27. A tolerant assert is how a page's whole subject goes missing

`03 nest` is a page about looping, and it was not looping. Three passes, zero
wraps, for the entire life of the demo. `createNest` arms each boundary on a
TickHost and, given none, falls back to discovering it inside `servo()` — and
SAYS SO, `nest.loop(id).boundary === 'polled'`. The page passed no host and
never called `servo()` either, so the boundary was neither committed nor polled.
It simply never happened.

Two things hid it. The picture drew a 3-pass loop as ONE span carrying
`repeat: 3`, so "looping" was implied rather than shown. And the assert read
`wraps > 0 || !reached` — tolerant of "the playhead has not got there yet",
which in every harness run it had not. **It passed vacuously on every run.** A
human pressing play found it in one go.

Two fixes, and the second generalises: expand the loop into one span per pass so
the picture cannot imply what it is not showing, and assert the MECHANISM
(`boundary() === 'lookahead'`) rather than its downstream effect. A mechanism
assert is deterministic; an effect assert has to wait, and **an assert that has
to wait is an assert that gets written tolerantly.**

### 28. Do not show one mechanism's lookahead and hide another's

`02` drew the sound row green as soon as a click was handed over — up to 100 ms
ahead of the playhead — which reads as the other lane lagging. The wall
scheduler commits ahead by the same 100 ms; only one lane's lookahead was
visible. Colour now says WHICH LANE and nothing else.

### 29. A true explanation that is not THE explanation is the hardest cover

Renaming the demos to bare slugs left `demo/shell/moq.mjs` importing
`/08-moq/moq-vendor.js`. The 404 killed the module, so `moq` and `ladder` never
reached `__demo.ready` and asserted **nothing** — for the whole life of the
rename.

**The harness said so perfectly.** Reproduced by re-breaking it, the entire
output for that demo is:

    [moq]
      FAIL  __demo.ready
    0/1 green  (1 FAILED)

One line. No relay error, no console noise, nothing about WebTransport. And it
was still read as "moq and ladder fail — relay/WebRTC in headless", which is a
thing that is **independently true** of those two pages and had been true for
weeks. The explanation was supplied from expectation and the output was never
actually read, because the symptom looked already accounted for.

So the lesson is not "add a check". The check existed, fired, and was as clear as
a check can be. The lesson is about reading:

- **A demo that never ran and a demo that failed its subject look nothing alike,
  and the giveaway is the COUNT.** `0/1` means the page did not run — one
  assert, the harness's own. `13/17` means it ran and its subject failed. Read
  the denominator before reading any failure text.
- **An expectation that explains the symptom is the most dangerous thing you can
  bring to a red test**, because a wrong cause gets caught when its predictions
  fail, and a right-but-irrelevant one predicts the symptom exactly and never
  does. When a failure matches something you already believe, that is the moment
  to open the output, not the moment to skip it.

The prevention, since reading discipline is not a mechanism: **`build.mjs`
refuses an import with no deployed file — but it read HTML ONLY**, so an import
inside a MODULE was never checked, which is where the dead one lived. It now
scans `.mjs` and `.js`, proved by restoring the bad path and watching the build
refuse it.

The same rename also left `verify-native.mjs` and `verify-safari.mjs` fetching
`/06-llhls/`, a 404 — **the iPhone code path**, the one harness `verify.mjs`
cannot reach (#2 again, third instance from one rename). When a rename moves
URLs, grep the OLD form everywhere, not just in pages: harnesses, modules and
comments all hold paths and none of them are type-checked.

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

### 11. An error string cannot tell "absent" from "blocked"

`@moq/net` emits the same "WebTransport not supported" whether the API is
missing or merely refused by its own user-agent policy. I read that string and
asserted iOS had no WebTransport. It shipped in Safari 26.4, on iOS too, and on
desktop it connects to Cloudflare in 140 ms. Report the capability, not the
error — and when a library says "unsupported", check whether it means "I will
not" rather than "I cannot".

### 12. A library's blanket exclusion usually has a reason. Read it before routing around it

The block was `safari: "<0"` — unsatisfiable, so permanent — and its source
comment cited WebKit 319818: the QUIC flow-control window never refills. I built
a bypass anyway on the assumption it was merely conservative, and reproduced the
bug exactly: 7 and 8 frames per 150 s across two runs, and a fresh page did not
clear it. The bypass is now opt-in, for measuring the bug.

### 13. Assert every branch, and diff the assert COUNT

Adding a mode to a demo made its check assert only the active branch, dropping
it from 11 asserts to 10 — the other branch silently stopped being tested while
the suite still read green. Same failure shape as #2, one layer down. Compare
per-demo counts against the last known total after any change.

---

## Platform facts worth keeping

### iOS / MSE

- **iOS 17.1 added `ManagedMediaSource`.** `Hls.isSupported()` is therefore
  **true** on iPhone, which silently disables any native-HLS fallback written as
  `if (!Hls.isSupported() && canPlayType(...))`. That check was a correct proxy
  for "iPhone" for years and then quietly stopped being one.
- **Prefer native HLS on ALL WebKit, gated on `ManagedMediaSource`.** The first
  fix here used "native available AND no plain MediaSource", i.e. iPhone only,
  on the theory that hls.js is worth keeping wherever it works. Desktop Safari
  says otherwise: native 0.961x advance / 5.25 s / 0 errors against hls.js
  0.344x / 7.71 s / 2 errors. And `canPlayType('application/vnd.apple.mpegurl')`
  returns `"maybe"` in BOTH Safari and Chrome, so it cannot tell them apart —
  gating on its truthiness put Chrome on a path it cannot play. MMS is
  WebKit-only, so it is a capability test rather than a brand check.
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
