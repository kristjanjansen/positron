# proto/looper — a looper is a quotation you author while it plays

The first client that puts **capture, projection, quotation and actuation on the
same clock at the same time.** proto/loops played a tape that already existed;
this one makes the tape while the tape is playing. Port 8891.

```
node proto/looper/server.mjs     # http://127.0.0.1:8891/proto/looper/ — play it
node proto/looper/measure.mjs    # virtual clock, 29 asserts, what must be EXACT
node proto/looper/verify.mjs     # headless Chrome, real audio, 16 asserts + a shot
```

`looper.mjs` and `synth.mjs` are DOM-free and are the only implementation: the
page, the headless measurement and the browser verification import the same
functions, so the page cannot display a number the headless run did not earn.

---

## THE RESULT THAT MATTERS: a looper needed no new library feature

A looper's defining gesture is *press the pedal, play, press it again — and the
length of what you played becomes the loop.* Before building it, that looked
like the thing §8 says is missing: `nest.add()` fixes `{in, out, repeat}` at
call time and there is no `nest.retrigger()` (proto/loops/NOTES.md, "what loops
still cannot express").

It is not missing, because **the quotation is authored after the trace exists.**

| | |
|---|---|
| **TRACE** | every input event, source-stamped, absolute wall time, append-only, never looped. Pass 1 of a Boss RC is exactly this: you are not in a loop yet, you are being recorded. |
| **SCORE** | the second press does not modify the recording. It declares `{ref, in: 0, out: L, repeat: 'infinite'}`, where `L` is the length you just played. |

So the length is known *before* the quotation is constructed, and nothing has to
be retro-edited. **C10's trace-vs-authoring boundary is not a constraint the
looper works around — it is the looper's user interface.** This is the
strongest evidence so far that §8.1's placement of `repeat` in the score rather
than the log was right: the one instrument that looks like a counter-example
turns out to be the argument.

**Overdubs are tape machines.** Rule 7g forbids two overlapping quotations of
one deck, so layer 2 is its own deck — N overdubs are N machines in lock-step,
the same constraint that made phasing need two decks and Reich two tape
machines. Measured: 100 of 100 iterations carried all 8 + 4 notes, cross-layer
phase error max 2.4e-4 ms, because both spans are re-derived from one parent
vector and there is nothing to drift.

---

## THE HEADLINE NUMBER: `caps.audio` does nothing without a lead

This is the finding worth taking to the rest of the project. `caps.audio =
{ctx}` hands `actuate()` the intended instant in AudioContext seconds so a voice
can be `start()`ed on the sample grid. On a real clock, **it almost never
fires**, and the reason is arithmetic: `audioTime = ctxTime + (earlyMs +
leadMs)/1000`, and the wall lane lands *late* (p50 6.3 ms), so `earlyMs` is
negative, `audioTime` is in the past, and every note falls back to
`ctx.currentTime` — inheriting the wall lane's jitter wholesale.

Measured at the OUTPUT, by an onset detector on the audio render thread, against
the instant each note was *meant* to sound (`intendedAudioT`, not the instant it
settled for — that comparison is circular and scores zero by construction):

| arm | bridged | heard − intended p50 | p95 | **sd** | **spread** |
|---|---|---|---|---|---|
| **A** `leadMs: 0` | **1–2 / 36** | 7.0–9.8 ms | 15.8–18.6 ms | **3.6–4.4 ms** | **13.4–16.9 ms** |
| **B** `leadMs: 30` | **27 / 27** | 33.45 ms | 34.01 ms | **0.38–0.39 ms** | **1.10 ms** |

*(Ranges are two runs of `verify.mjs`, not a distribution over many. Arm A moves
run to run because it is inheriting the wall lane's jitter, which is the point;
arm B is stable to the second decimal because it is on the sample grid.)*

**A declared lead converts ~10× of jitter into a constant offset.** That trade
is free for a loop and only for a loop: a constant shift of *every* note in a
circle is inaudible — it moves the whole loop's phase and nothing else — while
the 16.9 ms spread of arm A is exactly the thing an ear hears as sloppiness.
`leadMs` is in the signature already; nothing in the library says it is
load-bearing. It is.

**The looper now defaults to `DEFAULT_LEAD_MS = 30`.** It shipped on arm A for
half a day — the measurement was done, written up, and then not acted on, which
is the more embarrassing half of the story. Arm A in `verify.mjs` is now a
deliberate downgrade (`caps.audio.leadMs = 0`, set explicitly) so the comparison
survives the default change.

**And it is most of what makes a stalled main thread inaudible.** With the lead
armed, a 500 ms main-thread stall caught **0 of 14 notes in one run and 1 of 14
in the next** (that one 511.9 ms late; everything after it back to p95 16.5 ms).
The voices for the next horizon are already on the audio graph when JavaScript
stops, so only a note whose *decision* falls inside the stall is lost — which is
a ~30 ms window out of every 500, not the whole stall. Two runs is not a
distribution and this is written as a mechanism with two observations, not as a
rate. In arm A the same stall is carried straight into the sound, because
actuation *is* JavaScript.

---

## The other measured results

### M1 — "never re-stamp at handler time", as a distribution
The lineage law that three repos died without, finally with a number.
`e.timeStamp` (the UA's own receive instant) vs `performance.now()` at handler
entry, n=12 real key events: **min 0.10 · p50 0.30 · p95 1.00 · max 1.00 ms.**
The handler is never earlier — the two are one clock domain and the source stamp
is the earlier by construction. The point is the **spread, 0.90 ms**: the gap is
variable, so it is not a constant anyone could subtract afterwards. Re-stamping
at handler time folds that spread into the recording as jitter, permanently.
(Headless Chrome with injected keys is the *quiet* case. A loaded page with a
real MIDI device will be worse, and the shape of the argument does not change.)

### M2 — the loop on a wall clock
36 onsets over 6 wraps, every pass keeping every note, boundary `lookahead`:

| | p50 | p95 | max |
|---|---|---|---|
| firing lateness, wrap-adjacent | 9.30 | 11.20 | 11.20 ms |
| firing lateness, all others | 6.30 | 15.10 | 15.90 ms |
| IOI error **within** a pass | −0.70 | 8.90 | 14.40 ms |
| IOI error **across** the wrap | 2.50 | 9.30 | 9.30 ms |

**The loop point is again the more precise instant** (−3.90 ms at p95), for
proto/loops' reason: the wrap's re-seek calls `scan()` immediately and commits
the downbeat instead of waiting for the next 25 ms tick. proto/loops found this
on a tape it did not record; this is the same inversion on a tape played by hand.

⚠ **A correction to my own first pass at this.** I initially reported "phase
error, deck vs projection" as a separate number. On a wall clock it is not one:
`deck.position()` read inside `actuate()` has already advanced by however late
the fire was, so that quantity *is* the lateness, re-measured. It was removed
rather than reported twice. The interval numbers above are what "does it stay in
time" actually asks.

### M4 — the two clocks a looper reconciles
`baseLatency 5.33 ms + outputLatency 32.00 ms = 37.33 ms` at 48 kHz, read from
the UA rather than tuned by ear. This is the offset an overdub must be
compensated by: you hear layer 1 late by this much, play against what you hear,
and your note lands late by the same amount. **Not yet applied** — the honest
state is that the number is available and the compensation is unbuilt (see
"still open").

### §8.3 at a real instrument — and the mechanism is not what the flag suggests
One boundary, two correct behaviours, chosen by the adapter and not by the loop:
`note` is `rearm`, `cc` is `carry`, and the nest splits them from the caps.

The negative control had to be rebuilt twice before it meant anything, and that
is the result:

- disabling `loopWrap()` changes **nothing** (0 stuck voices either way);
- removing the lane's `reduce()`/`assertState()` strands **3 voices forever**.

**"No stuck notes" comes from the reducer, not from the wrap callback.**
nested.mjs says so in prose — step 2 is the wrap's own `child.seek(in)`, whose
reduce+assertState re-states every edge lane, while `loopWrap()` is step 1, an
opt-in chance to flush *before* the fold — and this measures it. A lane with no
reducer rings across the boundary exactly as tracker's does, on purpose.

A layer earlier, pairing each note with its duration removes the failure mode
altogether: a voice scheduled *with* its own release cannot be stranded by a row
that never arrives. Which is why the projection pairs on/off into a note rather
than keeping two independent edges.

### The note that straddles the splice
§8.8 settled the joint as a hard cut with no parameter, so the projection
truncates and **says so**: `trimmed: true`, `durMs` clamped to `out`, `lostMs`
recorded. One of six notes in the verify figure is cut, and the page draws the
cut as a red mark at the splice. The alternative — letting the off arrive in a
pass that has already re-armed — is the stuck note every looper has shipped once.

### A frozen tab
Modelled honestly (ticks *and* committed one-shots dropped, which is what
transport.mjs measured by SIGSTOP): 30 s frozen, **0 onsets fired, 1205 ticks and
1 one-shot dropped**, the iteration advanced by **15** with nothing to count
with, **0 burst on return**, and the phase error afterwards is one epoch ulp.
Position is arithmetic; there was no accumulated state to be wrong.

### The session — and plan-looper.md's P0 gate, passed locally
`looper.toSession()` / `loadSession()`. A session is a **score plus the material
its refs name**, and that split is score.mjs's rule showing through rather than a
format decision: `loadScore` refuses to run without a resolver, in those words,
because *a quotation names its source by identity, never by object*.

- **Byte-identical round-trip, twice** (once is not enough — the loops work
  found a null quotation id that became the string `"null"` and broke identity
  only on the *second* pass): 3,396 B for 2 layers / 12 notes.
- **1,698 B per layer.** This is the number under plan-looper.md §1's claim that
  a committed loop is a value small enough for delivery latency to be irrelevant.
- **A session carries no TRACE.** The C10 cut again, and it is the right one for
  a wire format: the trace is the performer's own record, the quotation is the
  part that has to be shared to be heard.
- **THE GATE: two independent players, one score, no messages between them.**
  A second looper built from the JSON — which has never seen the performance —
  ran against the same clock and produced an **identical (iteration, layer,
  note, phase) sequence, 480 onsets over 41 wraps.** No shared playhead, no
  ongoing sync. Which is the remote looper's whole argument, proven locally
  before any network is involved.

---

### Overdub latency compensation — BUILT, and the trap is in the reasoning
`monitorDelayMs = leadMs + (baseLatency + outputLatency)`, subtracted from every
captured note stamp. Measured against a *simulated performer* who plays in
unison with what they HEAR (the instant is read out of the system, not assumed):
**67.40 ms behind → 0.0000 ms.** Uncompensated, the error equals the modelled
delay to two decimals, which is the signature of a closed loop rather than a
tuning problem.

**The trap: the origin must NOT move with the notes.** A uniform shift of every
timestamp is a no-op — phases are differences, the constant cancels, and the
overdub stays exactly as late as it was. It works only because the notes move
and the origin stays at the pedal: a compensated layer then *sounds at the
instant its key went down* (the −delay in the recording cancels the +delay in
playback), so the next layer is played against a truthful reference.

Consequence handled: pulling notes back can drag one before the origin. Inside
the compensation window that is a pickup landing on the downbeat, so it **wraps
to the end of the loop** (a loop is a circle); outside it, a pre-origin row still
predates the session and is still refused.

**Not compensated, and it cannot be from inside a page**: the delay between the
physical key going down and the UA stamping the event. It is real and it is
folded into the performer's own timing. Saying so is the honest version.

---

## REMOTE — two peers, one loop (`peer.mjs`, plan-looper.md P1)

```
node proto/looper/remote-measure.mjs   # simulated channel, 12 asserts
node proto/looper/remote-verify.mjs    # two real tabs, real audio, 12 asserts
# play it: open ?room=NAME in two windows
```

### The claim, and it survived
**A committed loop is a value, so the network is used once per layer and never
per note.** Measured across link speeds spanning three orders of magnitude:

| link | delivered | joins on | phases |
|---|---|---|---|
| 1.1 ms | 1.1 ms | pass 2 | 6 |
| 402.6 ms | 402.6 ms | pass 2 | 6 |
| 2500.4 ms | 2500.4 ms | pass 3 | 6 |
| 4700.8 ms | 4700.8 ms | pass 4 | 6 |

**Identical phase sets to the last decimal at every speed.** A 4.7-second link
and a 1-millisecond link play the same loop; the cost of a slow link is paid in
*passes*, not in timing. And at 25 % packet loss the loop is unharmed, because
the loop plane is **one message**: if it lands the loop is perfect forever, and
if it does not the layer simply never starts. There is no partial loop.

### The mistake worth recording: a late layer is GATED, never SEEKED
The first implementation started a received layer at "the next downbeat" by
seeking the parent there. That **moves the clock into the future and
desynchronises the peer by exactly the amount it moved** — measured as a flam of
one loop minus the link delay. The position domain is shared wall time, so there
is exactly one correct place to start: **now**. The loop is epoch-anchored and
infinite; it is already at the right phase and nothing needs catching up.

Waiting for the downbeat is legitimate, but it is a gate on the **output**. And
the gate has to be **armed as a one-shot, not polled** — polling lifted it up to
one client-loop late and the downbeat was already gone (first audible note at
phase 251.3 ms instead of 3.7). That is proto/loops' wrap defect reappearing at
a different boundary in a different file: *a boundary is a committed instant or
it is wrong.*

### Clock agreement is the hard problem, and the negative control proves it
Skew is estimated **peer to peer, min-RTT-of-N**, never against a relay. It
recovers an injected offset exactly at every skew (0 → 5000.3 ms) and every link
speed (1.3 → 311.2 ms) — worst error 9.8e-5 ms. **min-RTT is scale-free**: a
311 ms link estimates as well as a 1.3 ms one, which is why the relay's latency
never had to be small.

**Negative control**: run the same session with the correction off and the two
loops flam by **137.4 ms against an injected 137.4 ms** — 6.9 % of the circle, a
constant, audible flam that no amount of link speed would fix.
*(That control was itself broken first: comparing each peer's `intendedUs`
directly cancels the very skew under test, and scored a perfect 0.0 ms until the
conversion into one true domain existed. The most flattering possible bug.)*

### Two real tabs
1,608 B delivered in 0.25 ms; bob rebuilt the same 5-note, 2005.6 ms loop **from
bytes alone**, having never seen alice's performance. Both tabs then played
identical phase sets, exchanging nothing but skew pings.

**Ear to ear** — both onset detectors anchored into shared time, mutually-paired
onsets: **p50 −5.77 · p95 −1.52 ms · sd 10.17 ms**, 31 paired, 0 unpaired.

⚠ **max 28.39 ms and the tail is NOT explained.** Part of it is the servo's dead
band — which is a finding in itself: **a per-peer position error that is
invisible solo becomes a cross-peer flam**, because two peers park independently
inside their own bands and the errors do not cancel. Tightening it 5 → 1 ms
moved p50 from −8.24 to −5.77, so part of the tail is the dead band and part of
it is something else. That is the first thing to chase.

**What two tabs CANNOT show**: they share a system clock, so the estimator has
nothing to find and reports ~0. That the correction works is the simulated
arm's job, where the skew is injected. Stated in the file so the number is not
over-read.

---

## MOBILE — `node proto/looper/mobile-verify.mjs`, 15 asserts

Device metrics + touch emulation + **real `Input.dispatchTouchEvent` streams**,
never a resized window — a resized window is a small desktop, which is a
different thing from a phone. Two devices: iPhone-class 390×844@3× and
small-Android 360×800@2×. Rules taken wholesale from
`research/mobile-2026-08.md` rather than rediscovered.

- **There was no viewport meta.** The repo's own findings call that "the single
  biggest bug on three of the four public surfaces"; the looper was a fourth.
- **`pointer: coarse`, not a viewport width** — a 1024 px tablet is a touch
  device and a 500 px desktop window is not.
- **Touch is polyphonic and the old handler was not.** A single window-level
  `pointerup` releasing every held key is correct for a mouse (there is one of
  them) and wrong for fingers: lifting one thumb silenced the chord the other
  was holding. Each pointer now owns exactly the key it pressed, with
  `setPointerCapture` so the release lands even though a real finger rolls
  5–10 px after the player believes they let go. **Asserted**: three fingers →
  3 voices; lift one → the other two still held. `pointercancel` is handled with
  `pointerup`, because a cancel the page ignores is a stuck note.
- **One octave, not nine white keys squeezed into a phone.** Dropping the ninth
  white takes each key from 38 px to 43 px on a 390 px device — still under the
  44 px guideline, and the alternative is a piano nobody can hit.
- **The keys say what they SOUND on touch** (C, D, E…), because the letters name
  keys on a keyboard that is not there. Octave buttons for the same reason: `z`
  and `x` are equally absent.
- **The pedal gets a thumb-sized target of its own** (366×56 px, full width,
  first in the transport). There is no space bar on a phone, and the gesture the
  instrument is named for cannot be the one that is hard to hit.
- **The loop display is sized to CONTENT** — header + one lane per layer, floor
  96 px — where the desktop constant was 300. On a phone 200 px of empty lane is
  not free; it pushes the keybed off the screen.
- `touch-action: none` on the keybed **and only there**, so a drag across the
  keys plays instead of scrolling while the page around it keeps its scroll.
  `touch-action: manipulation` on buttons kills the 300 ms double-tap wait.
- **A loop recorded entirely by touch**: two REC taps and five finger presses,
  5 notes over 2067 ms, length set by playing, and it loops and sounds (20
  onsets detected in the output samples).

### Two bugs the mobile pass found, one of them mine twice over
- **`#oct+` is not a valid CSS selector.** `querySelector` threw, which aborted
  module evaluation partway, which left `const cv` uninitialised, which made
  every animation frame throw *"Cannot access 'cv' before initialization"* —
  several hundred times, pointing at a line that was completely innocent. One
  invalid character, three symptoms, none of them near the cause.
- **A hoisting trap of the same family**: `relabelKeys()` was called from the
  keyboard-build block above the `const PITCH` it reads. The function hoists;
  the const does not. Same outcome — a module that throws leaves `window.__L`
  undefined, which reads as "audio failed to start".
- And a harness bug: **CDP's `touchEnd` takes the points being RELEASED**, not
  the ones remaining. Sending the survivors ends them instead, which is how the
  polyphony assert first "failed" against a page that was already correct.

### ⚠ What this does not test
1. **Safari is not emulated at all** — this is Blink with a small viewport.
2. **The audio unlock is dead code here.** Headless Chrome runs with
   `--autoplay-policy=no-user-gesture-required`, so the suspended-context branch
   never executes. `research/mobile-2026-08.md` §9.2 already called this the
   single largest untested surface in the mobile work, and the looper has not
   changed that. The unlock is written from documented behaviour and has never
   run under a real refusal.
3. **Real finger physics** — contact drift, palm rejection, variable pressure.
   The synthetic points are clean 12 px circles.

---

## Seams found in code I do not own

1. **`nest.add()` on an already-playing parent silently never enters.** It ends
   with `sp.deck.pause()` and schedules the `enter` item at `at` on the parent —
   but a looper always adds a layer while the parent is running *past* `at`, so
   that item is in the past and never fires. The child sits at rate 0 while the
   nest cheerfully counts wraps around it. No error, no degradation, nothing in
   `driftStats()`. Cost about an hour.
   **Workaround**: `parent.seek(parent.position()); nest.servo()` — a seek is a
   STATE operation, so it re-folds presence from the position instead of from an
   edge that has been spent. This is nested.mjs's own `assertSpan()` lesson
   ("absence is a POSITION, not an edge event") applied one level up, to entry.
   **Wanted**: `nest.add()` should do this itself when `parent.playing() &&
   parent.position() > at`, or report a degradation saying it did not.
2. **`caps.audio` needs `leadMs` to do anything** — see the headline above.
   Either the default should be non-zero, or the library should report
   `bridged: n/total` so a client discovers this from a number instead of from
   an onset detector. Today an adapter can declare `caps.audio`, take the
   fallback on 35 fires out of 36, and look identical to one that works.
3. **`loopPhase(x, L)` answers `{off: 0}` for `x < 0`** rather than wrapping.
   That is defensible (a negative argument means "before the loop started"), but
   a caller projecting a trace will silently stack every pre-origin row on the
   downbeat as a chord. `projectToPhase` refuses and counts them instead. Worth
   a line in the docstring.

## Two of my own bugs that looked exactly like library bugs

Written down because both are cheap to repeat.

- **A virtual clock runs backwards without complaint.** `vr.advanceTo(target)`
  ends with `t = target` unconditionally. Sorting note-ons and note-offs by time
  and advancing to each meant a note held across the pedal press advanced past
  the commit point and then jumped back. The artefact was **one event firing
  48.7 ms late as `tick-late`, in the first pass only**, and it isolated
  perfectly to "only when a note straddles the splice" — a completely convincing
  false lead.
- **`advanceTo` is not a tab blur.** It runs every intervening tick and timer, so
  jumping the clock forward models a tab that ran perfectly and merely reported
  late. The first blur test "proved" a burst of 120 onsets that was really 15
  passes played normally in fast-forward. A real freeze has to suppress ticks
  *and* timers; `rig()` now does.

## Still open

- **Overdub latency compensation.** `outputLatency` is read and displayed and
  *not* subtracted from capture stamps. Until it is, every overdub lands ~37 ms
  behind the layer it was played against — which is what a real looper pedal
  compensates and what a musician would notice in one pass. The fix is one
  subtraction; the reason it is not in yet is that it should be measured against
  a human playing, not asserted against a machine that plays perfectly.
- **Web MIDI is wired but unexercised** — the device path exists in
  `index.html` and no hardware has been through it (the macOS IAC toggle is
  still on the user's list). M1's numbers are the *keyboard* path.
- `nest.retrigger()` — still nothing re-bases `at` to now, so "restart the loop
  from here" needs a remove-and-re-add the nest does not offer.
- The strip is not wired in; the page draws its own loop lane, deliberately, to
  avoid colliding with concurrent work on `strip.mjs`.
- `nest.retrigger()` is still absent in a second sense: a session loads at its
  ORIGINAL origin, so "load this loop and start it here" works
  (`originOverride`) but "re-base the running loop to now" still does not.
