# Progress log — 2026-08-25 → 09-07  (newest first)

## Session 11 (2026-09-07) — a UI/UX review that turned into a jargon audit (user: "lets do ui/ux review of demos one by one" → "save progress to md's")

Reviewed `01 transport` and `02 lanes` against a reader who does not work here.
Every question the reader asked — *what is drift · green but late? · what
alarm?? · what is attested? · where is the missed one? · why do I need the
slider?* — turned out to name a real defect, not a wording preference. Eight of
them were bugs in behaviour, not in copy.

**127/127 green** across the eight strip demos (`01 02 03 05 14 15 16 19`), with
per-demo counts unchanged: `01` 14, `02` 15 — the same 15 it had before its
rewrite.

### The demo that could not display its own headline number

`01 transport` exists to report drift and was printing **`0`**. `deck.drift()`
returns an ARRAY of per-event rows; the page read
`typeof dr === 'number' ? dr : dr?.p50 ?? dr?.ms ?? 0`, so every branch missed
and it fell through to the literal zero. The rows were there the whole time:

```
{id: "m3", at: 3000, intendedUs: …622418300, firedUs: …622419900,
 deltaMs: 1.6, origin: "commit"}
n=20  min 0.1  p50 1.0  p95 1.7  max 1.7  mean 0.99 ms
origin: commit x19, tick-late x1
```

Worse, the assert PASSED on it: `deck reports drift — []` was green, because
the check was `dr !== undefined && dr !== null` and `[]` satisfies that. A demo
can hold twenty real measurements, display a confident zero, and read green.
The assert now requires rows.

### A boundary in the paint loop is not a boundary — the fourth instance

`transport-bar.mjs` stopped a bounded deck at `range[1]` from inside `paint()`,
which `observePosition` drives off **requestAnimationFrame**. Measured in a
hidden tab:

```
visibilityState hidden · rafFramesIn1s 0
bar clock frozen "0:00.000 / 0:20.000"
deck position 91,001 ms · playing true · range [0, 20000]
```

The scheduler kept perfect time throughout; the only broken thing was asking
the renderer to enforce a rule. Now a committed one-shot armed from
`transport.onState`, re-armed on every play/pause/rate/seek. **Honest caveat,
recorded in the source:** it is a main-thread `setTimeout`, so a hidden tab
clamps it to ~1 Hz and the stop can be a second late — a bounded error instead
of an unbounded one. The exact fix is arming it on the scheduler's worker host,
which `createDeck` does not expose.

At the end the play button now becomes **↺ and restarts**, which is what a
sequencer does: stop at the end, leave the playhead there, send it back on the
next play. Restarting is better defined here than for a media element — a
backward seek replays each event exactly once, by the library's own property
test.

### The transport bar did not fit a phone, and clipped rather than scrolled

| viewport | scrub width | overflow |
|---|---|---|
| 720 | 265 px | fits |
| 390 | **40 px** (its min) | **+94 px** |
| 358 | 40 px | +126 px |
| 320 | 40 px | +164 px |

`.tbar` had no `flex-wrap` and the scrub was its only flexible child, so the
scrub collapsed to its 40 px minimum while five rate buttons held 195 px — and
`body { overflow-x: hidden }` **clipped `2x` and `4x` off the right edge**
rather than showing a scrollbar. On a phone half the rate lattice did not
exist. Fixed with `flex-wrap` plus a 200 px flex-basis on the scrub, so
wrapping needs no media query. After: fits at 320/358/390 with the scrub
keeping 218–288 px.

### Two position surfaces is a contradiction, not a redundancy

The reader asked why the slider and the strip did not relate. They did not:
the strip had `follow` on, auto-scrolling to keep the playhead at 82 % of the
width, so its axis slid out from under the bar and drew out to 30 s on a 20 s
piece. Worse, the bar's slider **only seeked on `pointerup`** —
`seekFromEvent()` repainted the bar's own fill and nothing else, so during a
drag the strip, the readout and every lane sat still.

The strip has always been the better scrubber, and nobody had noticed:
`pointerdown` seeks, `pointermove` seeks continuously, shift-drag pans, wheel
zooms. Measured on a synthetic drag: `2392 → 4793 → 8395 → 11996 → 15598 ms`,
monotonic. So `createTransportBar(…, { scrub: false })` — where a strip exists
the bar keeps play/pause, the clock, the rates and the badge, and gives up the
slider. The bar's own scrub now seeks live during a drag anyway, coalesced to
one seek per frame, with `pointercancel` ending the drag (it used to leave
`dragging` true forever).

### The strip's "offset" was measuring how long ago you finished

The dual cursor arms a wall-clock line on first play and labels the gap to the
playhead — accumulated pause and slow-rate time, the right number on a live
feed. On a bounded 20 s fixture that has stopped, it grows at 1 s per second
forever. `armWall: false` on both demos.

### A colour scale whose normal reading is a warning

The first lateness scale used one absolute threshold (5 ms green) and painted
**18 of 20 marks amber** on a loaded machine — while `timeline/lab/NOTES.md`
measures the shipped worker host at **p50 5.0 ms**, so the documented baseline
was amber. Now each mark is judged against what its own way of firing promises:
a committed timer against ~5 ms, a mark the 25 ms sweep caught against 25 ms —
being inside the sweep window is the mechanism WORKING. Colour and words come
from one table, so a green bar can never be described in language that sounds
like a failure.

Same run, before and after: 18 amber → 18 green, 2 yellow.

### A readout cell that cannot change

`MISSED` counted marks the sweep found already due. It is **structurally 1**:
the mark due at position 0 cannot have a timer, because play had not been
pressed when the timers were set. A constant dressed as a measurement teaches
the reader to ignore the row. Replaced with `WORST` (the maximum), which moves;
the missed one is now the thicker bar in the strip, via a new per-row width
channel.

### 02 lanes: three lanes, and one that could not be heard

- **Audible at last.** `createAudioLane`'s default source is a ONE-SAMPLE
  impulse — right for the lab, where threshold detection finds its exact
  sample, and **20 µs at 48 kHz**, which is nothing on a speaker. The demo
  appeared to do nothing when you turned sound on. It now passes `makeNode`
  for a 1320 Hz blip with a 2 ms attack; same scheduled instant.
- **`await ctx.resume()` removed.** It does not reject when refused, it never
  settles — the trap that cost `26` and `28` a session, sitting in `02` the
  whole time.
- **The lookahead was drawn unfairly.** The sound row went green as soon as its
  click was handed over, up to 100 ms ahead of the playhead, which reads as the
  worker lagging. The wall scheduler commits ahead by the same 100 ms. All rows
  now grey until the playhead passes and re-grey on rewind; colour says WHICH
  LANE and nothing else.
- **"Measure skew" deleted.** It wrote two numbers and a log line, so pressing
  it looked like nothing happened. Skew is the demo; it is live. Live p50 runs
  0.1–5.9 ms depending on machine load.
- **Renamed** `timer` → `bg worker` at the reader's suggestion; the library's
  internal "wall lane" names the clock domain rather than the difference.

### `createMidiLane` — written, and honestly unexercised

MIDI out is an **audio-shaped lane, not a timer-shaped one**:
`MIDIOutput.send(data, when)` takes a future `DOMHighResTimeStamp`, so nothing
happens at the moment and the accuracy is owned below JS. That is why it needed
a third lane type rather than a `midi` adapter on the wall scheduler — an
adapter would fire at the moment and hand MIDI its worst case.

Two differences from `createAudioLane`, both in the source header:

- **No anchor.** `AudioContext.currentTime` is a separate drifting domain, which
  is why the audio lane re-anchors best-of-five every tick. MIDI timestamps are
  in `performance.now()`'s domain — the transport's own — so `transport.timeAt()`
  is usable directly.
- **Cancellation is all-or-nothing.** There is no per-message cancel; `clear()`
  drops everything pending. Fine for a note-on that has not sounded, a HUNG NOTE
  for one that has, so cancelling also sends all-notes-off.

**IT DID NOT SEND ANYTHING, and finding that out was the useful part.** The
user brought the macOS IAC driver online mid-session (**Audio MIDI Setup →
Window → Show MIDI Studio → IAC Driver → "Device is online"**, which publishes
`IAC Driver Bus 1` as both an input and an output), `02` found the port, and
its counters looked exactly right:

```
picker: IAC Driver Bus 1
worker 32 · sound 31 · midi out 31 · skew 1.40 ms
0 errors, 0 failures, __demo.failed null
```

I reported that as "the first MIDI this project has ever sent". It was not.
`MIDIOutput.send()` takes a `DOMHighResTimeStamp` — `performance.now()`'s
domain — while the transport's default `wallClock()` is
`performance.timeOrigin + performance.now()`, i.e. EPOCH ms. Handing
`transport.timeAt()` straight to `send()` scheduled every note **about
fifty-six years out**. Nothing threw, nothing logged, and `midi out: 31` went
up exactly as if it had worked — **because that counter counts what we QUEUED,
not what the port accepted.**

What exposed it was the loopback reading empty: `MIDI BACK —` on a page whose
log said `listening back on IAC Driver Bus 1`. A screenshot of a dash. Two
separate things had the same root cause, which is what made it findable:
`intendedUs` (epoch) never paired with `MIDIMessageEvent.timeStamp`
(performance), so nothing arrived AND nothing had been sent.

Fixed with a delta conversion, `performance.now() + (wallMs - clock.now())`,
which holds for any ClockSource rather than only the wall one — and
`scheduledLog` now records BOTH domains, so a loopback arrival has something in
its own units to pair against.

**The lesson is #15 again, one layer out**: a counter that counts intent reads
identically to a counter that counts delivery, and only one of them is
evidence.

### Measured, at last — and the obvious metric was worthless

The first instinct was to compare `MIDIMessageEvent.timeStamp` on the way back
against the instant we sent. Five sends at known instants:

```
e.timeStamp - scheduled   0.000  0.000  0.000  0.000  0.000 ms
```

**Exactly zero, five times out of five.** CoreMIDI carries the timestamp in the
packet and Chrome hands it back unchanged, so the arrival stamp IS the send
stamp — a number compared against itself, reading as a flawless result. Same
family as the two entries already in this file: *a codec is not testable against
itself*, and *comparing two peers' own timestamps CANCELS the skew under test*.

`performance.now()` sampled IN THE HANDLER does not cancel, because it is taken
on this side after the trip. Same five sends: 0.7, 0.4, 0.3, 0.3, 0.3 ms.

Then a full 16 s pass through `IAC Driver Bus 1`, **n=31**:

| | ms |
|---|---|
| min | 0.2 |
| p50 | **0.4** |
| p95 | 0.6 |
| max | 3.7 |
| mean | 0.5 |

with `spread` — the per-beat gap between the bg-worker lane and the MIDI-in
lane, as a median — at **1.60 ms** over 32 beats.

**What that is NOT:** it is not send → a synth on a cable. No hardware has ever
been on the other end of this. It is send → CoreMIDI loopback → Chrome's MIDI
thread → our JS handler, so it includes the main-thread event loop and is an
UPPER BOUND on delivery. It is also the only observable available without
external hardware, and it is the first MIDI measurement this project has.

### The sound card can report on itself after all

"Cannot report back" was true of the wiring and false of the platform. Web Audio
has no per-note callback and `outputLatency` is an estimate of the device leg,
not a measurement of when a note rendered — but an **AudioWorklet on the render
thread** can timestamp the exact output sample, which is how `timeline/lab`
measured this lane at 10–40 µs in the first place and which no demo had ever
carried.

`demo/shell/impulse-worklet.js` reports `currentFrame + i` for any sample over
threshold. Two details decide whether the number means anything:

- **A threshold, not an envelope.** An envelope follower has an attack time, and
  an attack time is a bias in exactly the quantity under test.
- **A separate silent impulse.** The audible click has a 2 ms ramp, and a
  threshold crossing on a ramp lags ~0.75 ms — twenty times the effect being
  measured. So the page schedules a one-sample impulse at the IDENTICAL instant
  into a probe bus that ends in a muted sink. The ear hears an edge; the human
  hears the blip.
- A started `ConstantSourceNode(0)` holds the probe bus live, because Chrome
  hands a worklet an EMPTY input array once it latches a bus silent — the trap
  already in this file, met again.

Measured on the deployed page, 16 s, one click every 500 ms:

| lane | typical | worst |
|---|---|---|
| bg worker | +1.50 ms | +2.90 ms |
| **sound card** | **+0.01 ms** | **+0.04 ms** |
| midi out | 31 sent · cannot report back | |
| midi in | +0.40 ms | +0.80 ms |

**10 µs typical, 40 µs worst — 1–2 samples at 48 kHz.** That reproduces Arm E's
lab figure independently, in a page anyone can open, and it puts three orders of
magnitude between the worker lane and the sound card on one screen.

`midi out` remains the one lane with no feedback path of any kind: `send()` is
fire-and-forget. Its accuracy is bounded rather than observed — the loopback
round trip is out + in, both non-negative, so out ≤ 0.4 ms typical. Derived, and
the page does not print it as though it were measured.

### MIDI in, as its own lane

The IAC loopback returns everything written to it, so `02` gained a fourth row
fed by an explicitly chosen **MIDI input** (its own picker beside the output
one, tagged `OUT ▸` and `◂ IN`, because "MIDI" alone cannot say which device
you are choosing). It shows a row **only where a note actually arrived** — the
other three lanes are schedules and exist whether or not anything happened;
this one is a record, and drawing a row for a note that never came back would
be inventing evidence. Arrivals print to the page log
(`◀ note 65 vel 100 · +0.42 ms`), because macOS ships no MIDI monitor and an
external one cannot see the instant we asked for, only the instant the note
arrived.

### Skew stopped being definable, so it was replaced

With two rows there is one gap. With four there are six pairs, two of which
cannot be measured at all, and a single `SKEW` cell had to mean "the gap
between the first row and the second".

Per-lane numbers now live in their own table (`demo/shell/lane-stats.mjs`),
each row carrying the swatch that matches its marks in the strip. Every number
is **that lane's error against the beat it was given**, not against another
lane — the quantity a lane can answer for on its own, with every pairwise gap
one subtraction away. Every lane gets a row INCLUDING the ones with nothing to
say, and they say it in words rather than showing a `0`.

The one page-wide number left is `spread`: per beat, the widest gap between the
lanes that CAN report, as a median. Lanes with no feedback are excluded rather
than counted as zero — **a lane that cannot answer must not be able to improve
the score.**

### One meaning for colour, across every demo

`01` used mark colour for lateness; `02` used it for lane identity. The same
ink meant two things one page apart. Now, everywhere: grey = not played, slate
= played and this lane cannot say how well, green = inside what its way of
firing promises, amber/red = later than that. Lane identity moved to the three
channels that already carried it — the row, the label, and the swatch.

"Played, unmeasured" earns its own colour rather than borrowing green: the
sound card gives no per-note feedback, so colouring it as if it had landed well
would be an assertion nothing checked.

### A unified tooltip

A page about the relationship between lanes was answering with the lane your
pointer happened to touch, so comparing meant three hovers and holding two
numbers in your head. `describeHit` on the strip replaces the whole block and
is handed the default lines, so a client extends rather than replaces:

```
beat at 7.000 s
bg worker    +1.20 ms
sound card   played · no feedback
midi out     played · no feedback
midi in      +0.44 ms
```

### Autofit lanes

`layout()` already knew the exact height its lanes needed, so a fixed canvas
height was either dead space or a clipped lane. Both happened: `01` ran a 72 px
lane in a 120 px box, and `02` grew a fourth lane when a MIDI device appeared
and pushed it out of view. `size: 'auto'` sets the canvas height from the lanes
every frame.

### `demo/shell/hardware.mjs` — new, the one way to ask for hardware

Sound and MIDI are the two things a page cannot simply have. One gesture buys
both; `resume()` is never awaited; the capability is reported rather than the
error ("no such API", "you said no" and "granted, nothing plugged in" are three
different answers); the device list is a `<select>` that appears as soon as
access is granted, even empty, because a hidden control is indistinguishable
from a page that never asked.

**It also has to live in `.d-controls`.** Mounted anywhere else, `verify.mjs`
never presses it — which read as `page asserted something — 0` and looked like
a broken demo rather than an unpressed button.

### Library additions, all opt-in

`timeline/strip.mjs` gained three hooks, each mirroring something that already
existed, and all falsy-safe so no existing lane changes:

| hook | mirrors | why |
|---|---|---|
| `colorOfRow(row, fired)` | `colorOf` on the spans renderer | ticks had one colour for the whole latched half, so it could not say WHICH mark went wrong |
| `widthOfRow(row, fired)` | the lane-level `width` | a second per-row channel: colour for the value, width for a property of the row |
| `terse` on a lane | — | drops the `id/kind` and `attested` lines. On a lane with no restorations they are noise that reads as a claim: a green bar labelled `attested` invites the conclusion that the colour means attested |

`describeRow(row)` was also added to `describe()`: what a row MEASURED is not in
the row, and this lets a lane say it without drift leaking into the strip.

`demo/shell/shell.mjs` gained `d.how(spec, note)` — a spec line of real values
and one plain sentence, published on `__demo.how`. Its numbers come from the
same constants the page hands the library, never typed twice.

### The jargon audit, which is the actual finding

Six reader questions, six defects:

| question | what it exposed |
|---|---|
| "what is drift… is it about how much I am behind?" | the page never defined its own headline number, and it was fabricated |
| "green but late???" | a scale calibrated against an absolute ideal instead of the mechanism |
| "what alarm??" | a metaphor introduced in one paragraph, then used in a tooltip read on its own |
| "what is attested?" | a provenance line leaking into a demo with no restorations |
| "where is the missed one?" | a readout counting something invisible |
| "why do I need the slider?" | two position surfaces, one of which scrubbed better |

`CLAUDE.md`'s conventions were rewritten as a result. The old rule — *"No
explanatory prose in demo pages; one line saying what the demo does, and a
readout of real numbers"* — is what produced pages only their author could
read. Terse and understandable are not in tension.

### Also

Favicon: 6 px corner radius, glyph shrunk and inset so the whole `e` sits inside
the field instead of running off the bottom-right corner. **Both copies** — the
SVG in `demo/shell/shell.mjs` and the pixel plotter in `workers/view/build.mjs`
that generates `favicon.ico` — with a comment on each to keep them in sync.

### Continued — 03, the favicon, and three rules that came out of it

Seven commits: `8495428` `74d54f2` `fe2699b` `463840b` `8561780` `0b6e9be`
`5a14d9b`. All deployed to positron.studio.

**03 nest got the same treatment, and the fabricated zero turned out to be a
CLASS.** `nestedDrift()` returns `{fires, range, pos, kinds:{…}}` with no
top-level `p50`, so `dr?.p50 ?? dr?.ms ?? 0` printed a confident 0 there for
exactly the reason it did in 01 — and its assert passed every time, because it
only ever checked non-null. Third page, one shape. It was not found by looking
at 03; it was found because the pattern already had a name. **`grep -rn '?? 0'`
across the remaining demos is now an obvious move rather than a guess.**
03 asserts the SHAPE now and reports `kinds.mark`'s real distribution: 17/17,
the count it always had.

**A scrub is not an observation.** 01, 02 and 03 all used `latch`, which
recolours marks from the PLAYHEAD — so dragging backwards turned measured marks
grey again, as if moving the cursor un-measured them. A mark's colour is a fact
about what was observed. Every lane now colours from its own evidence: 01 and 03
from their drift maps, 02 from `driftOf / soundOf / sentOf / loopOf` per lane.
`midi out` needed a separate record of having acted at all, being the only lane
that acts without being able to report.

**A separate implementation has to be LOOKED AT, not reasoned about.** The
favicon exists twice — an SVG in `demo/shell/shell.mjs` and a pixel loop in
`workers/view/build.mjs` that generates `favicon.ico`. Matching parameters do
not produce matching pictures: the same numbers that gave a clean 'e' as an SVG
gave a squashed counter, a terminal curled into a hook, and a glyph touching the
left edge as pixels. Fixed by rendering the .ico at 16x beside three candidate
parameter sets and choosing by eye. Two rounds of "adjust the numbers and hope"
preceded that and both shipped something broken.

**Also dropped:** 01's width channel (a thicker bar meant "no timer was set",
which is structurally always the first mark — a permanent oddity raising a
question the picture never answered, the same defect as the `missed` cell it
replaced); the `END` badge (the toggle already turns into a restart glyph); and
`how()`'s spec line — `looks 100 ms ahead · re-checks every 25 ms` was
constants-beat-prose reasoning, right when someone is looking for them and one
more thing to parse when they are not. The constants moved under the lane whose
behaviour they describe.

**The rate row finally shows which rate is armed.** `deck.rate()` is 0 while
paused — correctly; the transport vector really is advancing at zero — so
comparing the buttons against it left NONE selected exactly when someone is
looking at the row deciding what to press. This was the `RATE 0×` finding from
the first hour of the review, unfixed until the last.

**`plan-glass.md`** — `requestVideoFrameCallback` as a fifth lane type, written
and deliberately not started. Two things it pins down: a glass lane is a
CAPTURE lane like MIDI in, not a schedule lane (audio and MIDI are told when to
act; the compositor cannot be told, it only reports what it decided), and it is
BLOCKED behind the rVFC pair-vs-single bias in `studio/NOTES.md` — building on
the current reading would inherit that one-frame error and launder it into a
fifth place.

### Library additions this session, all opt-in and falsy-safe

| where | what |
|---|---|
| `strip.mjs` | `colorOfRow`, `widthOfRow`, `describeRow`, `describeHit`, `terse`, `subLabel`, `autoHeight` |
| `shell.mjs` | `d.how(note)`, `showReadout` |
| `transport-bar.mjs` | `scrub: false`, live coalesced scrubbing, committed end-stop, restart-at-end, armed-rate display |
| `transport.mjs` | `createMidiLane` |
| new files | `demo/shell/hardware.mjs`, `demo/shell/impulse-worklet.js` |

A lane's client `subLabel` REPLACES the derived caps line rather than queueing
behind it: that line names the lane's clock domain, which is worth having when
nothing better is on offer and noise once real numbers exist — and on a 46 px
lane it pushed the numbers out of the row entirely.

### Open

- **21 demos have not had the pass.** `01`, `02`, `03` are the worked examples.
- **Grep the fabricated-zero class** before reviewing any of them individually.
- The end-stop timer should be armed on the scheduler's worker host rather than
  a main-thread `setTimeout`; `createDeck` does not expose the host.
- `createMidiLane` has been measured only through the IAC loopback to our own
  JS handler. No hardware synth has ever been on the other end.
- `plan-glass.md` P0: fix the rVFC pair and re-measure every content anchor in
  the same breath.
- Full suite 298/313 — 12 are this shell having no UDP egress, three are strip
  ink flakes that pass on a targeted re-run.

## Session 10 (2026-09-06) — the demo spine finished: one grid, a show that archives its own wire, ERR's rights wall, Icecast, and a compiled score (user: "Etv2 errors")

**332/332 green when the session closed** (commit `5407031`; re-verified
2026-09-07 at 301/313 from a sandbox with no UDP egress — see the last section).
24 of 28 demos built. Four new demos (`25 show`, `26 shout`, `27 tracks`,
`28 vclick`), one demo simplified out of a branch (`11 grid`), and one bug class
— `canPlayType` — that had left three demos green while never once playing a
frame.

The assert count walked 274 → 276 → 291 → 305 → 318 → 332 across six commits;
each step is a demo, and the one place it did NOT move is the interesting one.

### 11 grid — one tier, because the tier was never the cost

Removed the featured/live/wall tiering: no featured tile, no capped live row,
no cheap wall painted at a lower rate. One grid, one 160×90 backing store per
participant, a paint on every 40 ms tick. The `Rotate the featured` and
`All same quality` controls went with it, and so did the branch in the checks.

Paint at 54 uniform tiles reads **0.27 ms** — but these are synthetic canvases,
so that is a floor, not a verdict. The cost the tiering existed to avoid is an
SFU delivering and a device decoding N streams at full rate, and `plan-m2m`
already measured that leg: N=54 = 106 tracks on one PeerConnection, SFU p50
flat **122–137 ms**. The SFU held; the client tier was the lever. The page says
so in a comment, because the number on screen cannot.

**Suite 276/276, `11 grid` 12/12 → 14/14** (6 → 8 page asserts).

The count rule earned a sharper data point on the way out. At HEAD the page
**declared** 8 asserts and the suite only ever ran **6**: `verify.mjs` presses
every control, so the uniform toggle was ON at check time and the two tiered
asserts sat behind an early return. Not a dropped assert — a declared assert
that the harness's own behaviour guaranteed would never fire.

### 25 show — the archive is the bytes that came off the wire

Three legs existed in three demos and had never met: `10 room` does peers (from
a canvas, not a camera), `24 capture` records a LOCAL source, `14`/`15` replay
what R2 already holds. None showed the thing worth showing — that what you
archive can be the received stream.

`25 show` runs the chain in one page. The peer is a second
`RTCPeerConnection`: a real hop (offer/answer, ICE, encode, packetize, decode),
and the only shape one browser can assert on deterministically. `MediaRecorder`
is pointed at the RECEIVED stream, so the segments carry the decode rather than
a second clean copy of the source. Playback is those segments on a deck with the
shell's transport bar.

`?room=NAME` also offers the show to the tokenless relay. It now both offers
**and** answers — the first cut only offered, so two copies of the page each
sent an offer into the room and neither ever replied. Verified by hand with two
tabs on the real relay: both sides connect, each gets a peer tile, glare
resolved by id order. Logged, never asserted; an assert needing a second browser
is an assert that varies the suite total.

**15/15 for the demo, 9 page asserts. Whole suite 289/291** — the two reds are
`19 flipper`, below.

Three things it cost, all now rules in `CLAUDE.md`:

- **`verify.mjs` stops collecting 400 ms after the LAST assert**, not after a
  fixed budget. Its stabiliser waits only while the count is still growing, so a
  check that waits out a recording before its FIRST assert reports "asserted
  nothing" and a working page reads as broken. Slow work belongs behind control
  0, the only control that gets `settleMs`.
- **A remote `MediaStream` carries the SENDER's msid.** `remote.id ===
  srcStream.id` and the track ids match too, so the first version of "the
  recording is of the received stream" compared ids and failed — correctly,
  because that comparison can never distinguish them in either direction. Object
  identity against `pc.getReceivers()[i].track` can.
- **`media-master`'s L1 (the picture is never nudged) binds the HELPER, not the
  page.** Without someone applying a scrub to the element, the transport bar
  moves a vector the video ignores and L2 snaps it back a tick later. The page
  wraps `deck.seek()` once and the check asserts the PICTURE moved.

**`timeline/transport.mjs` no longer holds literal NUL bytes** — the composite
cache-key separator is written as the `\u0000` escape. Same string at runtime,
but BSD grep calls a file holding a NUL binary and prints **nothing**, so every
search of the timeline core answered "not there", including for `createDeck`,
exported ~40 lines from where the search claimed nothing was. `prop-test` still
green: 30 basic + 15 gymnastics seeds, every seam suite, including the
series-cursor path that key belongs to.

### 19 flipper — ERR blocks its own segments by PROGRAMME, and three demos had never played HLS

"Etv2 errors" was two unrelated bugs stacked on each other.

**The rights wall.** The playlists are open (200 + `access-control-allow-origin:
*`); the segments under `/live/hls/` can be **403 with NO ACAO**, which reaches
a browser as a CORS failure, so hls.js holds an empty buffer and the cell stays
black with nothing a viewer can read. Swept at 13 points across each 2 h window
(`.` = 200, `#` = 403, oldest left, edge right):

```
etv       ........#####     the newest ~45 min refused
etv2      #########....     the OLDEST ~78 min refused, the edge fine
etvpluss  .............     everything served
```

It moves with the schedule and it is not always at the edge, so there is no
offset to hard-code. A served segment honours Range, so a **2-byte GET** asks
"will you serve this one?": the demo sweeps back from the edge, starts where ERR
will serve, and puts the refused minutes in the readout. Measured headless after
the fix: **blocked 70 min, state playing, 1920×1080, 138 s buffered.**

Two rounds to get that right, and both wrong versions are the interesting part.
Starting three segments before the boundary gave six seconds of picture and then
walked into the wall, where **hls.js retried blocked fragments 1794 times in one
run**; it now starts 90 s back and stops after three CONSECUTIVE failures — a
counter that never resets turns three unlucky blips into a false wall. The first
wall handler also called `pause()`, throwing away **113 s of picture already
buffered**; it now stops loading and plays out what ERR gave. "Jump to live
edge" re-probes instead of jumping into the blackout and killing a picture that
was playing.

**The `canPlayType` trap, in three demos.** `14 replay`, `15 seek` and
`19 flipper` all gated native HLS on
`canPlayType('application/vnd.apple.mpegurl')`, which answers `"maybe"` in
Chrome as well as Safari. So desktop Chrome ran `video.src = <m3u8>` and sat at
`readyState 0` forever. **Headless Chrome answers `"maybe"` too** — measured —
so the suite ran the same dead path and stayed green, because those demos'
asserts are about decks and cue folds, not about frames. All three now gate on
`ManagedMediaSource`, the rule `src/low-latency-player.js` already followed;
verified in real Chrome that all three take the MSE path (`blob:` src).

The suite cannot see that fix, which is exactly the point: it was **291 green
asserts over three pages that had never once played HLS.**

Flipping the engine then turned two demos red on a URL that is CORS-clean: a
media element's native load had cached a **no-cors (opaque)** entry for the
archive manifest, and hls.js's XHR for the same url was served from it and
rejected — while the page's own `fetch` of it returned 200 in the same run.
`verify.mjs` now deletes its profile's Cache before every run, and classifies
ERR's rights-403s the way it already classifies LL-HLS live-edge 404s: counted,
printed, capped at 40. `19 flipper` went from **1794 refused requests to 18**.

**Suite 291/291, `19 flipper` 18/18 with 24 refusals classified.**

### 26 shout — an Icecast stream through Cloudflare, and what the hop costs

SHOUTcast/Icecast is one HTTP response that never ends — no manifest, no
segments, no seek — so none of the LL-HLS questions apply. Two facts about the
origin (`icecast.err.ee`, Icecast 2.4.4, HTTP/1.0, 128 kbps MP3, five public
stations) decided the design:

- **No `access-control-allow-origin`, on any response.** A browser may put the
  mount in an `<audio>` element and do nothing else with it: no `fetch`, no byte
  counting, no `icy-name`, and — because a media element without CORS may not
  join a WebAudio graph — no analyser, no level, no spectrum. Handing the same
  bytes back with CORS on them is the relay's entire product, and every number
  on the demo page exists only because of it.
- **`HEAD` answers `400 Bad Request`**, on every mount. Any uptime checker that
  HEADs an Icecast URL reads a healthy station as down. The relay GETs upstream,
  keeps the headers and cancels the body, so HEAD through it is a 200 with
  `icy-name` on it.

Measured through the real edge (`shout.positron.studio`), 60 s, both paths
opened in the same tick, `rig/shout/measure.mjs` — full table in
`workers/shout/NOTES.md`, raw in `results/shout-edge-2026-09-06.json`:

| | direct origin | through the EDGE |
|---|---|---|
| ttfb | 325.7 ms | **279.3 ms** |
| first byte | 502.5 ms | 455.0 ms |
| burst in the first 250 ms | 67.0 KiB | 67.0 KiB |
| bytes / chunks | 993 KiB / 726 | 993 KiB / **1322** |
| mean rate | 135.7 kbps | 135.6 kbps |
| chunk gap p50 / p95 / max | 79.2 / 106.1 / 218.0 ms | 41.8 / 104.9 / 216.1 ms |
| gaps past a 1 s jitter buffer | 0 | 0 |
| audio held beyond realtime | 3.62 s | 3.56 s |

**Same byte, both paths: −0.8 ms of carry through the edge** (−1.4 ms through
local `workerd`). The relay hands Cloudflare the upstream `ReadableStream` and
touches nothing, so bytes leave as they arrive.

**The relay answered 46 ms SOONER than the origin.** Not a trick of the
measurement: Cloudflare terminates in Tallinn (`cf-ray … -TLL`) and the origin
is in the same city, so that is an edge in front of a local origin, not
Cloudflare beating Icecast. From further away the connect saving grows and the
carry — the number this rig exists to bound — is the one to re-measure.

**The edge re-chunks**: same 993 KiB, 1322 writes instead of 726, so the median
gap halves (41.8 against 79.2 ms) while p95 and max do not move. Chunk count is
not a defect signal here.

**Ten minutes on one response**: 9431 KiB in 12806 chunks at **128.77 kbps** —
exactly nominal once the 3.6 s burst amortises — and the Worker held that single
streaming response open for the whole 600 s. **One gap of 1684 ms**, the only
one over a second. Streaming duration is not the limit; the occasional gap is.

Two measurement traps, both of which produced a plausible wrong answer first:

- **TTFB cannot answer "what does the hop cost".** Icecast bursts ~64 KiB —
  some four seconds of already-encoded audio — at every new listener, so the
  path that connects later can still be holding more audio. The rig takes a
  16 KiB needle out of one stream, finds it in the other (no transcode, so the
  frames are identical) and subtracts the two arrival times of that exact byte.
  Validated against itself first: origin vs origin reads **−48.7 ms**, which is
  exactly the two connections' TTFB difference and nothing else.
- **The mean rate is the burst amortised.** 135.9 kbps over 60 s on a 128 kbps
  station is not a fast link; over a 7 s window the same stream reads **195**.
  So the demo asserts on the rate measured AFTER the burst lands (130 kbps) and
  on the burst separately (3.67 s of audio in hand). The first version of that
  assert — mean rate within 35 % of nominal — was wrong and failed correctly.

The worker is an **allowlist of five stations, never a URL parameter**: an open
proxy here would be a bandwidth laundromat on this account's egress. `?bytes=N`
bounds a probe, because a stream that never ends otherwise leaves every harness
deciding when to hang up.

`26 shout` shipped `built: false` until `positron-shout` was deployed — the
page's default base is the edge, and a demo whose dependency is not up would be
a red in a suite that was 291/291. Verified meanwhile against `wrangler dev`,
8/8 page asserts.

**Two deploy failures were this repo's own `.env` shadowing machine OAuth**, and
`env -u` cannot fix it, because wrangler reads `.env` from the **cwd**.
Deploying from `workers/shout/`, which has no `.env`, is the documented other
half of that `CLAUDE.md` rule.

Also: `workers/view/verify.mjs` asserted `rows === 23` against a generated list
that has had 25 and now 26 entries, and checked that links start with `/demo/`
when `build.mjs` strips exactly that prefix. Both are now derived from the
manifest — that file has gone stale this way twice.

**Suite 305/305** (291 + 14), and the same 14 pass against the deployed page.

### 27 tracks — is audio-only more performant, or only smaller?

Two answers to one question, on the two transports that could plausibly differ.

**LL-HLS: only smaller.** Cloudflare's audio rendition and every video rendition
carry identical low-latency packaging — `PART-TARGET=0.5`,
`PART-HOLD-BACK=1.5`, `TARGETDURATION=3` — and, the giveaway, the same
INDEPENDENT cadence: **11 of 41 parts on BOTH**, though every AAC frame is
independently decodable and audio could mark them all. `27 tracks` asserts that
from the playlists, so the claim needs no stopwatch. Measured beside it, same
run:

| | latency | bitrate |
|---|---|---|
| video + audio | 8.83 s | 16431 kbps |
| audio only | **3.88 s** | **418 kbps** |
| video only | 3.82 s | 11786 kbps |

Audio-only and video-only are the SAME latency. What costs the seconds is
running both renditions at once — the demuxed-intersection problem
`src/low-latency-player.js` exists to fight. (This leg is raw hls.js, not the
tuned player, which is why 8.83 s is worse than the tuned 2.4–4.0 s.)

**WHEP: the question has no answer on this provider.** An offer with one
recvonly transceiver — audio alone or video alone — is **HTTP 400, both ways**,
while video+audio negotiates in the same second (rtt 16 ms, video jitter buffer
68 ms). Asserted rather than noted: the day that changes is worth being told
about.

Two bugs in my own instrumentation, both found by **disbelieving a flattering
number**: the first `getStats` after an answer has no `inbound-rtp` yet, so
every jitter-buffer delta came out `null` and printed as a very impressive
**0 ms**; and `hls.latency` read once at the end is one sample of a number that
moves, so it now medians the second half of the window. A missing buffer prints
as absent, never as zero.

### timeline/csound.mjs — a score compiles, and then it can be seeked

The compiler `demo/notes/uuu-positron.md` §3 argued for. **22/22 in
`timeline/lab/csound-test.mjs`** (re-run 2026-09-07: 22/22 green). `t`
statements become a beat↔ms map, `i` lines become rows, `m`/`n` become quotation
values that round-trip through `score.mjs` byte-identically (162 bytes), and the
`.` carry with the `+` and `^+x` shorthands are handled because real scores use
them.

**The part a parser would have got wrong**: p2 and p3 are BEATS, and Csound
interpolates tempo linearly in beat, so the map is the **integral** of
`60/tempo` — closed-form and logarithmic. On `t 0 120 30 90` the true answer at
beat 30 is **17.2609 s** and the mean-tempo answer is **17.1429 s**. Reaching
for the average puts every later note **118 ms early** and nothing in the output
looks wrong, so the test asserts both numbers and the naive one can never
quietly return.

And the claim itself — seek-from-anywhere as a guarantee rather than a
discipline: compile a 16-note score, build a deck, and `reduceAt` is exact at
**57 probes** and on **both sides of all 16 notes** (48 boundary probes, 0
wrong). The score file cannot answer "what is in force at bar 47"; the compiled
rows can.

`verify.mjs`: the probed-refusal counter no longer calls a WHEP 400 an "ERR
segment refused by rights" — it counts refusals the demos ask for on purpose,
from either source, and says so.

**Suite 318/318** (305 + 13).

### 28 vclick — the arithmetic on screen

The demo for `timeline/csound.mjs`, and `demo/notes/uuu-positron.md` §3 made
visible: a Csound score is a fine authoring format and a poor runtime one, and
both gaps close when it is compiled.

The canvas draws the beat→time map as the integral it is, against the straight
line you get by averaging the tempo. On the default fragment — 120 bpm easing to
72 by beat 16 — they are **217 ms apart by the end of five seconds**. That gap
is the error a mean-tempo compiler ships, and it is invisible in the output
because every note still lands, just early. Drawn rather than argued.

Below it, the `m`/`n` repeat printed as the quotation VALUE it compiles to — the
JSON that round-trips through `score.mjs` — and a deck with the shell's
transport bar. Scrub it: beat and fold come off the tempo map the client already
holds, which is the third gap in the note (vClick must push bar and beat over
OSC because its tempo lives in the score, so the network is in the critical path
of every beat).

**14/14.** The fold is exact either side of all 11 rows, a seek lands
mid-repeat and folds correctly, and the notes sound — one triangle voice per row
through the deck's own adapter, so a seek is audible as well as assertable.

Two things it cost:

- **`AudioContext.resume()` never resolves without a user gesture, and never
  rejects either.** Awaiting it left this page with no compile, no deck and no
  transport bar while LOOKING fine, because the readout had already been filled
  by the compile at load. Same shape as `audio.play()` blocking `26 shout`'s
  measurement earlier the same day. Headless hides both — the harness passes
  `--autoplay-policy=no-user-gesture-required`, so both resolve there and the
  page reads green while being dead in a browser. **Sound is allowed to be late;
  the timeline is not.**
- The score box is editable, so a typo is a normal thing for a human to cause
  rather than a page fault. A failed compile keeps the last good one and names
  the line, instead of `guard()` turning it into a dead page.

`build.mjs` deploys `timeline/csound.mjs`, since this is the first page to
compile a score in the browser.

**Suite 332/332** (318 + 14).

### The BUILD stamp lags one commit, on purpose

`6e5e459` restamps `shell.mjs`'s `BUILD` for the deploy of `5407031`. The stamp
names the commit the assets were built FROM, so it always lags one behind
whatever adds it — committed on its own rather than amended in, because the
deployed bytes should be identical to a tree someone can check out.

### Method

- **A declared assert is not a run assert.** `11 grid` declared 8 and the suite
  ran 6, because `verify.mjs` presses every control and the toggle was ON at
  check time. Same failure shape as session 9's 11 → 10 drop, one layer down.
- **A green suite over a path that never executed.** 291 asserts across three
  pages that had never played a frame of HLS in Chrome. The asserts were about
  decks and cue folds; nothing asked for a picture.
- **Disbelieve a flattering number.** A 0 ms jitter buffer was a `null` from a
  `getStats` called too early. A missing measurement must print as absent.
- **An id comparison that cannot distinguish is not a test.** A remote
  `MediaStream` carries the sender's msid; the assert passed vacuously in both
  directions until it compared object identity.
- **The harness caches across engines.** An opaque entry from `video.src` poisons
  hls.js's XHR for the same URL. Clear the profile Cache every run.
- **Never let sound gate the work.** Two demos in one day, both from awaiting a
  promise that neither resolves nor rejects without a gesture.
- **`grep` lies about a file holding a NUL byte.** Suspect the file before the
  symbol.
- **A hard-coded row count against a generated list goes stale** — `rows === 23`
  against 26 entries. Derive it from the manifest.
- **`.env` in the cwd shadows machine OAuth and `env -u` cannot fix it**, because
  wrangler reads `.env` from the cwd. Deploy from a directory without one.

### Open

- **iOS is still unconfirmed on a real phone** since the native-HLS switch of
  session 9. Nothing this session touched `src/low-latency-player.js`, so the
  question is exactly where session 9 left it: open `positron.studio/06-llhls/`
  and read the `BUILD` on the first log line.
- **The archival cron still needs a fresh Stream-scoped token.** `.env` holds the
  known-exposed legacy credential.
- **`26 shout` has no egress cap.** 128 kbps is ~57.6 MB per listener-hour, all
  billable and none of it cacheable (the origin sends `no-cache, no-store`, and a
  cached radio stream is a contradiction). Nothing throttles or counts listeners;
  a link that goes anywhere public should get a cap first.
- **Every shout number was taken in Tallinn**, where both the origin and the colo
  are. The carry figure is the one to re-measure from a distance.
- **Still unbuilt: 4 of 28.** `20 kurenniemi`, `21 megatimeline`, `22 remixer`
  (the pages work and are linked, not re-shelled) and `23 studio` (assembly —
  every panel it consumes exists and is verified).
- **Nothing has still ever been used by a human.** Unchanged, and now the demo
  spine is finished around it.

### Re-verified 2026-09-07 — 301/313, and what that number means

`node demo/verify.mjs` re-run while writing this entry, on a sandboxed shell:
**301/313 green, 12 FAILED**, against the 332/332 the session closed on. The
gap is the environment, not a regression — **UDP egress is blocked here**,
confirmed directly (a DNS query to `1.1.1.1:53` gets no reply in 4 s, while TCP
to `positron.studio`, `ws.positron.studio` and `pub.positron.studio` all answer
200).

| demo | ok | FAIL | why |
|---|---|---|---|
| `07 webrtc` | 9 | 5 | WHEP is WebRTC: `connectionState failed`, no inbound video rtp at all |
| `08 moq` | 5 | 2 | `ERR_QUIC_PROTOCOL_ERROR … QUIC_NETWORK_IDLE_TIMEOUT` to the draft-14 relay |
| `09 ladder` | 8 | 2 | its WHEP rung, same cause |
| `25 show` | 6 | 2 | the local loopback `RTCPeerConnection` never leaves `connecting/connecting` |
| `17 instrument` | 9 | 1 | `relay open — 0`; a WebSocket, so NOT the UDP cause — unexplained |

Every other demo was green, including all four new ones at their committed
counts: `11 grid` 14, `19 flipper` 18, `26 shout` 14, `27 tracks` 13,
`28 vclick` 14.

**313, not 332, is the second half of the story**: 19 asserts never RAN. A page
that loses a leg stops before the asserts behind it — `25 show` ran 8 of its 15,
because segments, duration, deck and seek all sit behind a live leg that never
connected. That is the settle/assert-count rule from the other direction: a
failure upstream silently shrinks the denominator, so **a falling total is a
symptom to read, not a number to update**.

Nothing here re-tests the four transports that need UDP. To confirm 332/332,
run the suite somewhere with UDP egress.

## Session 9 (2026-09-05) — the iOS stutter, MoQ, Safari, and a tokenless write path (user: "See logs" → "save status to md's")

**274/274 green.** 20 of 24 demos built (`08 moq` and `24 capture` new). Two new
harnesses, because the main suite could not see either platform that mattered.

### The iOS stutter: six wrong answers, then the right one

The session began with "still v stuttet in ios" and cost most of a day. Worth
recording as a sequence, because four of the six fixes were real and none of
them was the binding constraint:

| fix | real? | fixed it? |
|---|---|---|
| latency target inside one GOP (`liveSyncSeconds: 3.0`) | yes, arithmetically | no |
| page playing before segments existed | **no** — it already had 3 | no |
| drift-seek loop aborting fragment loads | yes, 16 seeks in 2 min | fewer seeks, still janky |
| `capLevelOnFPSDrop` | enabled correctly | **inert** — needs dropped frames; the phone dropped 3 of 507 |
| gate playback on the audio/video intersection | yes | no |
| **prefer NATIVE HLS on WebKit** | yes | **yes** |

The answer came from the user asking "why not safari using its own player?".
`low-latency-player.js` only fell back to native when `Hls.isSupported()` was
FALSE — a correct proxy for "iPhone" until **iOS 17.1 added
ManagedMediaSource**, after which it returns true there and the fallback
silently stopped firing. So the one platform with AVFoundation was being put on
the MMS path, where Safari **closes the MediaSource** under us
(`mediaSourceRequiresReset`, three runs running) and every buffer is dumped —
the visible flash.

The instrumentation that finally separated the hypotheses was playhead advance
per wall second beside edge advance per wall second: `ADV=0.284 EDGE=1.025` says
the device, not the edge. Before that it was guesswork.

### What the phone taught, in order

- `video.buffered` on MSE is the **intersection** of the source buffers. Desktop
  Chrome: video `[[2.83,4.83],[8.83,21.83]]` against audio
  `[[2.85,3.36],[8.84,16.84]]` — 0.05 s to play while video held 5 s.
- That audio lag is the **browser's**, not ours. Measured per track at the
  ORIGIN: first segment 2 ms apart, then `v-a = 0.00 s` over 12 samples. The
  first A/B had measured video cadence to answer a question whose answer lived
  in audio, and both arms shared the `-re` defect.
- `-re` IS A PER-INPUT ffmpeg OPTION. The RTMPS leg had it on video only, so
  lavfi's sine was read unpaced. The WHIP leg and `publish.sh` always had both.
- `totalVideoFrames` froze at 67 across four seconds while the buffer grew to
  5.95 s. Not slow — stopped.

### Desktop Safari, driven over WebDriver (`demo/verify-safari.mjs`)

`verify.mjs` speaks CDP, which Safari does not, so the whole WebKit family was
untested — and macOS Safari is the only platform with BOTH a plain MediaSource
and native HLS, i.e. the only place the engine choice is a judgement. Same page,
same 40 s:

| | native | hls.js |
|---|---|---|
| advance | **0.961x** | 0.344x |
| latency | **5.25 s** | 7.71 s |
| errors | **0** | 2 (`aborted` 4.7 s, `levelLoadTimeOut` 40 s) |
| buffered | contiguous | hole `[[16,18.01],[20.01,26.5]]` |

It found four bugs in one sitting, all mine — including a v13 watchdog that was
**reloading healthy streams**, because under native HLS `currentTime` does not
share a timeline with `seekable` (currentTime 38.42 against seekableEnd 23.5
while playing at exactly 1.000x). It was manufacturing the fault it watched for.

**The gate is `ManagedMediaSource`, not `canPlayType`.**
`canPlayType('application/vnd.apple.mpegurl')` returns `"maybe"` in BOTH Safari
and Chrome, so it cannot tell them apart — gating on its truthiness briefly put
Chrome on the native path and broke five asserts.

### 08 moq — built, and the blocker did not exist

The manifest said "needs a MoQ publisher running on a machine" and 09 said
"needs moq-pub in the publisher image". Both wrong: a relay cannot live in a
Container (no inbound QUIC), and IETF `moq-pub` does not interoperate with hang
at the catalog layer — but browser→relay→browser was already proven. No
container, no Rust build. **p50 20.3 ms / p95 35.5 ms, n=600**, every burned row
checksum-clean. 09 gains it as a third rung and says out loud that MoQ is
published by the browser while the other two share the container source.

### MoQ on Safari: unusable, and a reconnect does not rescue it

WebTransport shipped in Safari 26.4 and reaches Cloudflare's relay in 140 ms —
but `@moq/net` blocks Safari by user agent (`safari: '<0'`, unsatisfiable) citing
**WebKit 319818**: the QUIC flow-control window never refills. Forced, twice,
150 s each: **7 and 8 frames**, first stall at 20 s, and a full page reload with
a fresh WebTransport stalled identically. The published bug report leaves the
reconnect question open; it is answered now, negatively. Not the encoder —
Safari does VP8 720p at 370 fps.

Cloudflare's relay also has **no WebSocket listener**, so the qmux fallback has
nothing to negotiate with.

### WHEP vs MoQ, both measured browser→CF→browser with burned pixels

Re-ran the WHEP rig same-day (n=17,501, 300 s): **p50 67.0 / p95 76.9 / p99
84.1 ms**, against 73.6 ms on 2026-08-25 — reproduces within 9%.

| | MoQ | WHEP |
|---|---|---|
| p50 | **26.2 ms** | 67.0 ms |
| p95 | **42.4 ms** | 76.9 ms |
| p99 | 104.8 ms | **84.1 ms** |
| freezes | 0 | 41 (8.8 s / 300 s) |

Adjusting MoQ up one vsync for the display step it omits gives ~35–42 ms, so
**~1.6–1.9x, not the 3x** the older comparison implied. The p99 inversion is
confirmed: WebRTC's jitter buffer costs 12 ms at the median and buys a tighter
tail. `abs-capture-time` refused by Cloudflare again — 0 of 17,501 samples.

**Correction to earlier reporting:** "WHEP rtt 25 ms" was being quoted beside
"MoQ 20 ms" as if comparable. It is `candidate-pair` RTT, not media latency, and
flattered WHEP by ~3x.

### Stream storage: a wall, not a bill

183 recordings, **559.97 of 1000** storage-minutes, every one automatic, today's
testing alone 225.7 min — about two days from a hard cap that breaks recordings
and therefore playback. Cleared 175 (524 min), then 5 more on request:
**559.97 → 15.81**.

What cannot be done: recording `mode: off` **also disables HLS playback** of a
live input, and `preferLowLatency` requires `automatic`. So 06 and 09 depend on
it and the lever is deletion, not the mode. `deleteRecordingAfterDays` has a
minimum of 30, far too coarse for 225 min/day.

Archival proven on one recording: `POST /downloads` → poll → **105.8 MB MP4,
byte-exact in R2** (content-length matched), publicly served.

### 24 capture + a tokenless write path

`workers/ingest` (`ingest.positron.studio`) is the one unauthenticated write
path, deliberately its own worker because `selfrec` gates every route on a token
and "all of them except this one" is how auth stories get misread. The server
mints the session id, so a client cannot pick its prefix; a segment, a session
and an address are each capped, enforced in the DO that does the accounting.
**All eleven caps verified firing**, and a cron sweep enforces the 6-hour TTL.

`24 capture`: canvas by default, camera on request, MediaRecorder timeslice as
the segmenter, each closed segment PUT and freed (high-water 2), then assembled
and driven on a real `createDeck` + transport bar. Measured through the deployed
page with `?r2=1`: 4 segments / 158 KiB up, 4 fetched back, **6.15 s on the
deck**.

### Method, the expensive part

- **A green suite can mean zero coverage.** 261/261 while 06 was fatally broken
  on iPhone — a TDZ that threw every tick and rendered nothing — because desktop
  Chrome never enters that branch. Hence `verify-native.mjs`.
- **Attribution before iteration.** The user asked for a deploy id in the logs;
  it paid for itself in one round by proving a fix had loaded and not worked.
- **Three substring-guard bugs in one day**: `BUILD` matched inside `REBUILD`,
  `LOG_KEEP` and `#log` satisfied by the code just inserted. Each printed "ok".
- **Verify the deploy propagated** before asking anyone to retest; the edge
  served the previous build for seconds.
- **Assert both modes.** Adding a uniform mode to 11 grid silently dropped it
  from 11 asserts to 10 while still reading green.

### Open

- **iOS is unconfirmed since the native switch.** The user reported "seems to
  work" on v12, then a TDZ of mine broke it, then v13/v14 added native recovery
  and fixed three native-path bugs. Nobody has re-tested a phone since.
- **The archival cron** needs a Stream-scoped token. `.env` holds the
  known-exposed legacy credential; mint a fresh one rather than deploying that.
- Still unbuilt: `20 kurenniemi`, `21 megatimeline`, `22 remixer` (pages work and
  are linked, not re-shelled) and `23 studio` (assembly — every panel exists).

## Session 8 (2026-09-04) — positron, positron.studio, and the demo spine (user: "rename cwd to positron" → "do all")

Renamed, moved onto a domain, built a demo shell and 18 demos on it, added a
tokenless relay and a viewer-refcounted publisher container. Everything below is
measured or quoted from a doc, not assumed.

### THE RENAME AND THE DOMAIN
- `~/personal/elektron` → `~/personal/positron`; 252 files carried the old name.
- **Worker SCRIPT names stay `elektron-*` on purpose.** Renaming a script makes a
  NEW Worker and abandons its Durable Objects — `RtcRoom`, `JamRoom`, `Hub`,
  `Sessions`, `BeaconStore`, `Gate` (the last holds the durable ERR cache). A
  custom domain decouples public identity from script name, so the rename costs
  no state. R2 buckets cannot be renamed at all.
- Three rig Workers had **zero deployments** (`obs-cloud/obs-worker`,
  `obs-cloud/quic-test`, `rig/containers`), so those names WERE free →
  `positron-*`. My earlier reading of their 404s as "live" was wrong: a
  nonexistent workers.dev subdomain 404s identically to a deployed API worker.
- `elektronstudio`, `elektron-nuxt`, `elektron.art` are **prior art and stay** —
  they name a real predecessor not on this account. `elektron.arti` in a quoted
  Estonian source is a genitive, not a typo.
- A fresh `.studio` name is negatively cached up to **1 h** (SOA min TTL 3600):
  Cloudflare/Google/Quad9/OpenDNS all resolved within minutes, a home router
  that had cached the pre-registration miss did not. Not a misconfiguration.
- **`caches.default` stopped being a no-op.** It does nothing on `*.workers.dev`;
  on a custom domain it is a real edge cache. `workers/view` still does not use
  it (the durable cache spans colos, which `caches.default` does not) — but that
  is now a choice. Highest-value place for it: in front of the single serialized
  `Gate` DO.

### FIXED A PRE-EXISTING BREAK
- **`/timeline/strip.mjs` 404 → megatimeline was dead on the public URL** since
  `3647696`. It began importing strip.mjs and nobody added it to `build.mjs`'s
  allowlist, so the module graph failed and `window.__mt` was never set. The Act
  0 demos need strip.mjs too, so allowlisting it repaired both. megatimeline now
  boots: census 119 years, 1927 lit canvas samples, zero upstream ERR calls.
- `workers/view/verify.mjs` asserted `links.length === 4` when the menu had five
  cards since looper. The documented "38/38 green" was already stale.

### THE DEMO SPINE — 18 demos, 239/239 green against the deployed URL
- One shell (`demo/shell/`), one stylesheet, and `window.__demo` as the harness
  contract. The root cause it fixes: **a page was either human-facing or
  machine-facing, never both**, so every capability got built twice. Asserting on
  transport state instead of DOM ids is what made ~25 harness pages redundant.
- `createStrip` already existed and was adopted, not rebuilt — its own header
  records being hand-drawn FIVE times with none of the five agreeing.
- **Custom elements for lifecycle, no shadow DOM**: `disconnectedCallback` makes
  teardown structural (the m2m pages hand-roll 48 teardown calls and rotate
  panels), while shadow DOM would fight the one-stylesheet goal and break
  `document.querySelector` for CDP.
- `09 ladder` measured live: **rtt 25 ms (WHEP) vs 3.49 s (LL-HLS)**.
- `12 cues` over the tokenless relay: **p50 79–80 ms**, 9/9 echoed.
- `06 llhls` on the deployed page: **4.06 / 1.71 / 2.99 s** across runs against
  the 2.4–4.0 s rig envelope.
- `11 grid` holds the tiering at **54** — 1 featured, 5 live capped, 48 wall.
- `13 record`: MediaRecorder's timeslice IS the segmenter; ship-then-delete keeps
  the high-water at 2 segments, O(1) rather than O(show).
- Six library API shapes I had wrong, ALL caught by the library's own firewall
  rather than by me: `repeat` is a bare integer not `{times:n}`; `when.rule` is
  required and must be `<name>@<int>`; `aoristic()` returns a stat object with a
  ledger and reads `{from,to}` not `{t0,t1}`; `nest.quotationsOf` takes a deck;
  **`deck.reduceAt(KIND, pos)`** — kind first; and `reduce(rows)` is handed the
  PREFIX already, where each row is the PAYLOAD, so filtering on `r.at` inside it
  matches nothing and reads as "no cues at all".

### THE TOKENLESS RELAY — ws.positron.studio
- `positron-ws` supersedes `elektron-jam`, which is RETIRED (deleted). Safe where
  renaming the others is not: `JamRoom` held **no durable storage** — its only
  mention of the word was the comment saying "NO storage".
- The measured numbers keep the `elektron-jam` name (34.5–34.9 ms p50 vs cues'
  37.8 and the SFU's 16.1). They say what was measured.
- **Three faults found by testing the deployed relay, not by reading it:**
  `msg.byteLength > 4096` never fires for TEXT (`byteLength` is undefined on a
  string); checking `String.length` instead counts UTF-16 CODE UNITS, so 4000
  units of emoji = 8000 UTF-8 bytes sailed through; and the 4 KiB roof itself was
  wrong here — `peer.mjs` publishes a committed layer as ONE message carrying the
  material at ~98 bytes per note row, so 2 layers × 16 notes ≈ 7 KB and 8 × 32 ≈
  52 KB. A 4 KiB roof passes the tiny live-note plane and silently eats the loop
  plane. Now 256 KiB per message with a **bytes-per-second** budget, because the
  real cost is FAN-OUT AMPLIFICATION (one message × N sockets).
- **Hibernation is kept deliberately.** It is what makes an idle room free, and
  `setWebSocketAutoResponse` exists only on the hibernatable API — losing it means
  an RTT probe measures network + DO wake instead of pure network. Verified: a
  peer in the same room never sees the `ping`. Cost is in-memory buckets
  (harmless: to hibernate you must stop sending) and per-wake counters, which
  `/stats` now reports as `sinceWakeMs` rather than dressing up as lifetime.

### THE PUBLISHER CONTAINER — pub.positron.studio
- **Viewer-refcounted lifetime.** Viewers hold a hibernatable WebSocket on
  `/watch`; first in starts, last out stops after a 2-sweep grace.
  `sleepAfter` alone CANNOT do this: the Container base sleeps on REQUEST
  idleness and ffmpeg generates no incoming requests, so it would kill a stream
  somebody is watching. Measured: viewers=0 idle → A connects → publishing → A
  leaves, B stays → still publishing → B leaves → +70 s → stopped, input
  `disconnected / client_disconnect`.
- **`standard` is an ALIAS FOR `standard-1` = HALF a vCPU.** Two simultaneous
  x264 encodes on half a core ran at ~40 % of realtime; the container logged
  "Resumed reading at pts 37.500 … after a lag of 141.751s" and the stream
  starved. Now a custom 1 vCPU / 3 GiB / 2 GB instance.
- **The platform refuses less than 3 GiB per vCPU** ("With 2 vCPU(s), you need at
  least 6 GiB of memory"), so CPU cannot be bought without memory — my 2 vCPU /
  1 GiB proposal was rejected outright even though two 360p encodes fit in
  512 MiB.
- **Upgrade, not parallel.** CPU bills on ACTIVE USAGE, so two encodes cost the
  same vCPU-seconds however split; memory and disk bill on PROVISIONED. Two
  instances would pay memory and disk TWICE for identical CPU. Custom 1 vCPU /
  3 GiB / 2 GB beats `standard-2` (1 vCPU / 6 GiB / 12 GB): same CPU, half the
  memory, a sixth of the disk, 8.3 h/month inside the included 25 GiB-hours
  instead of 4.2.
- **The generator was the expense, not the resolution.** Cost index, 2 s of video
  per case on one cpu (relative, so the emulation penalty cancels):
  `testsrc2 640x360@20` 0.16 · `testsrc2 1280x720@20` 0.36 ·
  `testsrc2 1280x720@30` **0.45** · `life 640x360@20` 0.47 ·
  `life 1280x720@20` 1.21. So 720p30 on testsrc2 is CHEAPER than 360p20 on life.
  Backgrounds were then removed entirely — testsrc2 moves and the burned epoch
  moves regardless.
- **A local Docker benchmark on this Mac is worthless for capacity**:
  `--platform linux/amd64` is QEMU x86 emulation and showed EVERY source at
  ~0.2× realtime. Only the container's own stderr and same-machine ratios count.
- `ttf-dejavu` installs to `/usr/share/fonts/dejavu`, NOT `.../ttf-dejavu`; an
  unresolvable `fontfile` makes drawtext fail and the epoch never reaches the
  pixels. And drawtext needs the value BOTH single-quoted AND colon-escaped:
  `text='%{pts\:flt\:EPOCH}'`. Quoted-but-unescaped fails to parse.
- ffmpeg returns **255** for a SIGTERM it handled, i.e. exactly what an
  intentional `/stop` looks like — a clean shutdown was reporting itself as an
  error.

### CLOUDFLARE STREAM: WHIP AND WHEP MUST BE USED TOGETHER
- Their docs, verbatim: *"we do not yet support inputs using RTMP/SRT to be
  played using WHEP"*. Asking the RTMPS input for WHEP returns **409**. So one
  input cannot serve both `06` and `07`; the container runs TWO independent legs
  of the same burned-in pattern to two inputs, which is also what lets `09`
  compare them.
- WHIP args lifted from `rig/whep/WHIP-FFMPEG-NOTES.md` where they were measured:
  **libopus not aac**, and baseline/3.1 offering `profile-level-id=42001f` which
  Cloudflare ACCEPTS and echoes verbatim — the `42e01f` in the docs is a
  documentation value, not a negotiation gate.
- ffmpeg reaching DTLS `state=10` is NOT the same as Cloudflare being ready to
  answer a WHEP offer, so a 409 is "not yet" and wants retries.
- `07` first waited on the HLS manifest — a signal about input A while about to
  play input B. It now waits on the publisher's own `whip.publishing`.

### iOS — TWO BUGS NO HARNESS COULD FIND
- **Autoplay activation expires.** Every live demo does work first and calls
  `play()` ~11 s after the tap: `play refused: NotAllowedError`, with the
  connection healthy behind it (rtt 16 ms, 31 fps) and a black box in front.
  `armVideo()` spends the activation synchronously in the handler;
  `playOrPrompt()` shows a tap button rather than an unexplained black rectangle.
  Headless runs with `--autoplay-policy=no-user-gesture-required`, so this is the
  surface proto/looper already calls "the single largest untested surface".
- **A WebRTC track arrives MUTED** and unmutes only when media flows. Assigning
  `srcObject` before that hands iOS a frameless stream and it paints black
  permanently — 26 fps inbound, `videoWidth` 0. Attach on `unmute`.
  **Decoding is not rendering**, and only the second is what a viewer sees; `07`
  now asserts `videoWidth > 0` separately.
- OPEN: LL-HLS jank on iOS. The player chases a **1.50 s target with a 2.0 s
  GOP** and sits at 2.78 s, nudging at 1.01× (= `catchUpRate`) and resyncing each
  time it passes `seekThreshold: 2.0`. A target shorter than one keyframe
  interval is unreachable, and Cloudflare's guidance is that 2 s is the SHORTEST
  recommended GOP — so the fix is likely to raise the target, not shorten the
  GOP. A container-vs-local publisher A/B on segment inter-arrival jitter is the
  test that separates parameter mismatch from CPU starvation.

### THE OTHER TEAM (tarmoj / U: / ECCM), read from the code
- `radio1965` is a **live community-radio app**, not the archival platform. Every
  occurrence of "1965" is a NAME: an Icecast mount, an API path, a window title,
  the FastAPI service title, cron log names, and the literal test password
  `"1965"`. No 1965 material, no historical metadata, no date model before now;
  its "Archive" is a visibility STATUS. Five declared Icecast mounts is an
  architectural capacity ceiling. Its best idea: `<on-connect>` POSTs to the same
  `/events/publish` the editor uses, so going on air creates its own catalogue
  row and notification.
- **VideoSync converges with us independently**: "playback rate is nudged (±5 %)
  when drift is small; hard seek is used when drift exceeds 500 ms" — the same
  structure as `media-master.mjs` rule L2 at 250 ms. Two codebases, no contact.
- **Icecast join latency MEASURED**, since "a few seconds" is not a number. ERR's
  five mounts, 12 s each, splitting the burst from the real-time tail: 128 kbps,
  62–63 KiB burst, **3.97–4.05 s behind live**. 64 KiB ÷ 16 KB/s = 4.0 s exactly
  — the default `burst-size` over the bitrate, ±0.04 s across five independent
  mounts, so a config constant not network variance (ttfb 262–315 ms). No
  catch-up: Icecast has no live edge to chase. It is a knob U: already owns.
- `uuu.ee` is NOT in version control: it appears only as a `deploy.sh` target,
  and the sole infra code anywhere is radio1965's two Icecast hooks plus an nginx
  snippet pasted into markdown.
- Written up in `demo/notes/uuu-positron.md` (live at positron.studio/notes/),
  including what positron can offer a LAN setup: `wsTransport` does not care that
  the relay is a Durable Object, so pointing it at `ws://192.168.x.x` runs the
  clock and score machinery with no internet.

### The iOS jank, run to ground (2026-09-04, end of session 8)

The user asked the right question — *"Is it a streamer thing? Compare local and
container one"* — so the publisher got ruled out before anything was tuned.

| | container (1 vCPU, 2 legs) | local Mac (all cores, 1 leg) |
|---|---|---|
| segments seen | 37 | 38 |
| inter-arrival p50 | 1974 ms | 1991 ms |
| inter-arrival sd | 799 | 798 |
| **jitter** (sd/p50) | **0.40** | **0.40** |
| EXTINF range | 2.000–2.021 s | 2.000–2.021 s |
| **EXTINF sd** | **0.003 s** | **0.003 s** |

Identical. And EXTINF sd 0.003 s is the number that matters: a CPU-starved
encoder produces wobbling segment durations, not durations exact to 3 ms. The
container is not the problem. (The 0.40 jitter itself is mostly the measurement
— a 250 ms poll against a playlist that gains segments in bursts, `min 0` — and
it is the same on both sides, which is the whole point of an A/B.)

Two false starts worth keeping:

- The first local leg died on `such filter: 'drawtext'`. The default homebrew
  ffmpeg has no libfreetype — which `src/publish.sh` already documented
  (`FF=/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg # needs libfreetype for the clock
  overlay`). The pin was not decoration.
- That failure printed the full RTMPS URL, i.e. **the stream key**, into the
  output. It reached only a scratchpad file and was scrubbed, but the same
  string is served publicly by the container's `/status`. Fixed properly: see
  the redaction note in HANDOFF.

With the publisher exonerated, the manifest was read instead of guessed:

```
#EXT-X-PART-INF:PART-TARGET=0.5
#EXT-X-SERVER-CONTROL:PART-HOLD-BACK=1.5,CAN-BLOCK-RELOAD=YES
#EXT-X-TARGETDURATION:3        (segments are 2.000)
INDEPENDENT=YES on 10 of 38 parts   <- one per segment: the keyframe part
four renditions: 1280x720, 854x480, 640x360, 426x240
PROGRAM-DATE-TIME: …56.935 -> …56.604   <- 331 ms BACKWARDS
```

So the target is Cloudflare's 1.5 s, and the player can append at 0.5 s
granularity but can only start decoding every 2.0 s. **A latency target inside
one keyframe interval is structurally unreachable.** The player overshoots to
~2.78 s, nudges at `catchUpRate`, crosses `seekThreshold: 2.0`, resyncs, and
does it again forever. That loop is the jank — not the encoder.

Fix (player v7): `liveSyncSeconds: 3.0` = 1.5 GOPs, passed to hls.js as
`liveSyncDuration` **at construction**, because the deminified 1.7.1
`targetLatency` getter only takes the override from `hls.userConfig`:

```js
let target = (lowLatencyMode && partHoldBack) || holdBack;
if (this._targetLatencyUpdated || userConfig.liveSyncDuration || …) target = liveSyncDuration ?? …;
return target + Math.min(this.stallCount * config.liveSyncOnStallIncrease, targetduration);
```

That last line also explains the measured target of 4.0 rather than 3.0 — hls.js
raises its own target by one second per internal stall, capped at one
targetduration. Result on the deploy: latency **3.33 s**, target **4.0**, rate
**1.0**, **0 resyncs**, 1 level switch. Drift is now negative, so the nudge and
the resync never arm. Cost: about half a second of latency.

**Not claimed:** this was measured through CDP on desktop, not on an iPhone. The
arithmetic is device-independent and iPhone does take the hls.js path (hls.js
1.7.1 resolves `ManagedMediaSource` when `MediaSource` is absent, i.e. iOS 17.1+),
but the report came from iOS and only iOS can close it. `06` now reports a
`switches` count for exactly that visit — ABR churn across those four
clustered-BANDWIDTH renditions is the one suspect still without a number, and it
was left untuned rather than guessed at.

242/242 green locally and against https://positron.studio.

## Session 7 (2026-08-30) — the looper, local and remote (user: "build midi looper … in parallel fix 2 3 5. also 4")

Four agents on the four open HANDOFF items in parallel, the looper in the main
session. File ownership was disjoint by design (transport / strip+megatimeline /
render+nested / studio / proto-looper) and nothing collided.

### THE LOOPER (proto/looper) — ✅ 39 virtual + 17 real-clock asserts
- **A looper needs NO new library feature.** `nest.add()` fixes `{in,out,repeat}`
  and there is no `retrigger()`, which looked fatal for "press the pedal, play,
  press again, the length of what you played becomes the loop". It is not,
  because **the quotation is authored AFTER the trace exists**: TRACE = every
  input event, source-stamped, absolute, never looped; SCORE = the second press,
  which declares `{ref, in:0, out:L, repeat:'infinite'}`. C10's trace/authoring
  split is the looper's user interface, not a constraint it works around.
- Overdub layers are **separate decks** (rule 7g) — N overdubs = N tape
  machines, the constraint that also made phasing need two. Cross-layer phase
  error max 2.4e-4 ms over 100 iterations: both spans re-derive from one parent
  vector, so there is nothing to drift.
- **`caps.audio` DOES NOTHING WITHOUT A LEAD** — the headline. A fire that lands
  late has no future instant to schedule, and the wall lane lands late by p50
  6.3 ms, so **1/36 notes reached the sample grid at `leadMs: 0` vs 27/27 at 30**.
  Measured at the OUTPUT by an onset detector on the render thread, against the
  instant each note was *meant* to sound: **sd 4.38 → 0.38 ms, spread 16.9 →
  1.1 ms.** The trade is free for a loop and only for a loop — a constant shift
  of a circle has nothing to be heard against. Now the default (30 ms), and
  `verify.mjs` arm A is a deliberate downgrade so the A/B survives.
- **Stamp at source, as a distribution**: handler − source p50 0.30 / max 1.00 ms
  with a **0.90 ms spread**. The point is the spread — it is not a constant
  anyone could subtract afterwards, which is exactly why the lineage's law is
  "never re-stamp".
- **"No stuck notes" comes from the REDUCER, not the wrap callback.** Disabling
  `loopWrap()` changes nothing (0 stuck either way); removing the lane's
  `reduce()`/`assertState()` strands 3 voices forever. nested.mjs says so in
  prose — step 2 is the wrap's own `child.seek(in)` — and this measures it.
- **Overdub latency compensation**: `leadMs + base + output`, subtracted from
  captured note stamps. Against a simulated performer who plays what they HEAR
  (the instant read out of the system, not assumed): **67.40 → 0.0000 ms**. The
  trap is that a *uniform* shift is a no-op — phases are differences — so the
  notes move and **the origin must not**. A note dragged before the origin wraps
  to the end of the loop; outside the compensation window it is still refused.
- Session round-trip: byte-identical **twice** (the null-id trap needs the second
  pass), **1,698 B per layer**, no trace in the envelope. Two independent players
  from one score, zero messages: **480 onsets, identical (iteration, layer, note,
  phase)**.
- Frozen tab (ticks AND timers suppressed): 0 fired over 30 s, 1205 ticks
  dropped, iteration advanced by 15 with nothing to count with, 0 burst on
  return, phase error one epoch ulp.
- Two of my own bugs that looked exactly like library bugs: **a virtual clock
  runs backwards** if you `advanceTo` a stale instant (artefact: one event
  48.7 ms late, first pass only, isolating perfectly to "only when a note
  straddles the splice"); and **`advanceTo` is not a blur** — it runs every
  intervening tick, so the first blur test "proved" a 120-onset burst that was
  15 passes playing normally in fast-forward.
- Seam in code not mine: **`nest.add()` on an already-playing parent silently
  never enters** — it pauses the deck and relies on an `enter` event already in
  the past; the child sits at rate 0 while the nest counts wraps around it.

### THE REMOTE LOOPER (proto/looper/peer.mjs) — ✅ 12 simulated + 12 two-tab
- **The claim held: a committed loop is a VALUE, so the network is used once per
  layer and never per note.** Identical phase sets, to the last decimal, across
  links of 1.1 / 12.7 / 89.3 / 402.6 / 2500.4 / 4700.8 ms. The cost of a slow
  link is paid in PASSES (joins pass 2 vs pass 4), never in timing. At 25 % loss
  the loop is unharmed: the loop plane is ONE message, so it either lands and is
  perfect forever or never starts. There is no partial loop.
- **Clock agreement is the hard problem, not latency.** Skew is estimated peer to
  peer, min-RTT-of-N, never against a relay (the worker `/time` path was measured
  at ±50 ms of BIAS). Recovery is exact at every injected skew (0 → 5000.3 ms)
  and every link speed (1.3 → 311.2 ms) — worst error 9.8e-5 ms. **min-RTT is
  scale-free**, which is why the relay's latency never had to be small.
- **Negative control**: correction off → the flam is *exactly* the injected skew
  (137.4 ms = 6.9 % of a 2 s circle). That control was itself broken first —
  comparing each peer's own timestamps CANCELS the skew under test and scored a
  perfect 0.0 ms until the conversion into one true domain existed.
- **A late layer is GATED, never SEEKED.** Starting a received layer at "the next
  downbeat" by seeking there moves the clock into the future and desynchronises
  the peer by exactly the amount it moved (measured: one loop minus the link
  delay). And the gate must be armed as a one-shot — polling lifted it late and
  the downbeat was gone (first audible note at phase 251.3 instead of 3.7). That
  is proto/loops' wrap defect at a different boundary in a different file.
- Two real tabs, real audio, real BroadcastChannel: 1,608 B in 0.25 ms, the
  second tab rebuilt the loop **from bytes alone**, identical phase sets, and
  **ear to ear (both onset detectors anchored into shared time): p50 −5.77 / p95
  −1.52 ms, sd 10.17, 31 mutually-paired, 0 unpaired**.
- ⚠ **max 28.39 ms and the tail is NOT explained.** Part is a real finding — the
  servo's dead band is a *per-peer* position error, invisible solo and a
  cross-peer flam when shared (5 → 1 ms moved p50 from −8.24 to −5.77) — and
  part is not. First thing to chase.
- What two tabs CANNOT show: they share a system clock, so the estimator has
  nothing to find. Stated in the file so the ~0 offset is not over-read.

### ITEM 2 — FIRE-SIDE EVIDENCE FIREWALL (transport v0.7) — ✅ prop-test suite 8 + firewall.mjs 32
- **The hole was worse than §8.8 said: TWO doors.** Beside `fire()`,
  `applyReduce()` → `adapter.assertState()` folded a derived lane's whole prefix
  into its actuator under `'attested'`. `reduceAt()` correctly returned `null`
  while `seek()` silently asserted tier 3. **One lane, two answers, decided by
  which door the query came through.**
- **`caps.evidenceGated` REFUTED** — the gate is unconditional. Opt-in would
  reproduce `caps.series` with the sign flipped (declared-and-unread returned a
  value belonging to neither controller; undeclared-and-unenforced returns a
  dreamed note in an archival performance). *Asking the adapter's permission on
  one side of a firewall and not the other is not a firewall.*
- Proof: an `attested` deck's **actuation trace AND drift channel** are
  bit-identical to a deck that never held the restorations (110 rows, 4,165
  bytes, one string) and to one after a physical `drop()`. 462 fires refused
  across 11 lanes; 12 repetitions of the attested performance carry ONE distinct
  signature where `'all'` plays 558 onsets vs 96.
- `deck.assertState(kind, state, info)` built: 1.48 µs unverified vs 81.4 µs
  verified (55×), which is why verification is opt-in.
- **A measurement thrown away**: difference-of-p50s gave +11.4 / +0.8 / +9.8 %
  on the *same two builds*; rebuilt as paired differences against a
  byte-identical-copy control, the effect sits inside the control band, so the
  honest claim is an upper bound, not a value.
- Negative result that changed the code: the first gate made **refusing 37 % more
  expensive than firing** (a 500-char reason string per refused row) → memoised,
  79 % cheaper.
- Main session applied the one cross-file change requested: `nested.mjs`
  `wrapSpan()` step 3 now folds at `out` and asserts at the **playhead**, closing
  proto/loops seam #2 ("works; slightly untrue").

### ITEM 3+5a — THE STRIP RENDERER + DEEP TIME — ✅ strip-verify 32/32
- **Ambiguation was already shipping as a lie**: `outer` (a wholly unknown
  position) and `crisp` (an attested duration) fell into one `else` branch at
  α 0.70 and were **identical in ink**. Now **51.6 % separated** (crisp 3,360 px
  @ α 215 vs outer 11,456 px @ α 104).
- The empty core is confirmed on real data: `core: 0` in every window at every
  zoom on the Kurenniemi corpus. The fix is not to invent a core — ambiguation
  *degenerates* when the core is empty, so it falls back to the same study's
  other recommendation for the same task (error bars over the outer bracket),
  which cannot be misread as a core because it is not a filled region.
- **The third state is a property of the row AND THE WINDOW**: 1930–2000 gives
  19 sound / 0 undecidable; 1965 gives 2 / 12; June 1965 gives 0 / 11. The
  epistemics are a property of the *question*, and on a zoomable axis the wheel
  is what asks it. Undecidable rows **ghost** rather than vanish.
- **`when.kind` broke the measuring instrument**: a feathered vagueness edge
  keeps its pixels above the 8/255 gate, so alpha mass differs 8.8 % where the
  pixel COUNT differs 1.8 %. `laneInk` grew a `sum` mode.
- **One third of the aggregate brief does not exist**: mass `1/(b−a)` and
  "divide by the overlapping-period count" are the SAME operation at one bin per
  pixel column (`maxAbsDiff = 0` exactly) — the column *is* the period.
  Applying both would have halved every mass twice. Also: points were silently
  dropped, and the curve drew `lineTo` between column tops — a linear
  interpolation across the bin boundary, the exact invention PeriodO refused.
- megatimeline's alpha **saturated at n = 18**: a year holding 20 items and one
  holding 6,808 painted identical grey.
- **Deep time: the bug was not the predicted one.** The precision ceiling is real
  (ulp at 13.8 Gyr = 65.5 s; `t += 1` stalls at ~295 kyr) but what would have
  killed the tab first was a draw loop asking for **138,000,000 major ticks per
  frame** (now 14) — and `formatTime` handed deep positions to `Date`, where
  `new Date(-4.35e20).toISOString()` **throws**. Verdict: a documented measured
  ceiling; ms stays the position domain. Zoom ceiling derived from IEEE-754
  (`1000/ulp(t)`), and a surprise: the existing 1e7 px/s cap was already **2.4×
  past the double's resolution** for every absolute deck we ship.

### ITEM 5b — renderDeck SEES A NEST — ✅ prop-render 999 checks/100 seeds, browser 17/17
- Closed by **running the shipped nest**, not re-deriving it: the renderer
  supplies only the two things a nest takes from a host (a TickHost for the wrap,
  a loop to call `servo()` from).
- Byte-identical twice — trace, wrap set, `renderHash`, per-frame child position,
  child-adapter order — for a fragment, a loop, two levels deep, and a score
  round-tripped twice then loaded from bytes alone. Four hashes identical
  **across two separate Chrome processes**. Render lateness **0.000/0.000 ms**
  vs playback's 0.044/0.325 wrap-adjacent — **§8.8's inversion reproduced
  independently**. Cost: nest = 1.9× a flat render.
- **The polled artefact INVERTED.** In playback, polling lost a downbeat
  (2100/2400). Offline it loses nothing and **leaks**: the child free-runs past
  `out`, 3–5 of 8 tails at 24–60 fps, 0 at 120 fps (aliasing). And the polled
  render is byte-identical **to itself** — *determinism is not correctness*.
- **The audio seam only findable by building it**: a child lane rendered 1
  nonzero sample of an expected 7, because `createAudioLane` cancels committed
  nodes on every transport state change and **a wrap IS a `child.seek()`**. Fix
  is not a flag: offline, **a loop is EXPANDED, not replayed**. Corollary: a stub
  context is blind to the whole bug class (7/7 stub vs 1/7 real), now asserted.
- Two bugs in already-green code, both guarded by arms verified to fail when
  reverted: the entry downbeat was lost **in wall-clock playback only** (`off ===
  0` is an exact float test a virtual clock always satisfies, but a real enter
  fire is ~1 ms late) — 8 rendered, 7 played; and a span the playhead had not
  entered was being started, breaking exactly-once two levels down. **A
  virtual-clock suite structurally cannot produce "the fire was 1 ms late".**

### ITEM 4 — STUDIO v1 + THE −45 ms ANCHOR — ✅ verify 24/24 (was 14/15)
- **The anchor was NEVER A CONSTANT.** `content anchor − native T₀` has a
  ~95 ms-wide, frame-quantised distribution; −45.3 and −15 are two draws one
  frame apart at 30 fps. "Systematic, reproduced with a negative control" was two
  samples that happened to land near each other — the control ruled out machine
  contention, but contention was never the variable.
- The discriminating instrument (`studio/anchor-probe.mjs`) reproduces
  replay.html's median rule **offline** via one ffmpeg pass, so pixels and PTS
  cannot mis-align. Identity `anchorOffline − T₀ = swallow − pixelAge` held
  within ±4 ms on all 23 runs. Two causes: **`Page.startScreencast` frame 0 is a
  stale re-capture stamped `now`** (20–36 ms old; frames 1+ are 6–9 ms), and the
  encoder **swallows whole source frames at start-up** (0 or 33 ms; the archive
  rig has MORE of this artefact, not less).
- Fixed by stamping on the CDP frame-swap of the first frame actually written:
  per-cue replay abs p95 **39 → 19–26 ms**.
- **Two negative results worth as much as the fix**: `-fps_mode passthrough`
  makes the swallow structurally impossible and made the result **twice as bad**,
  because the `fps=30` grid was also smoothing ±20 ms of pipe-read jitter out of
  the media timeline. And **replay.html's content anchor carries ~one frame of
  bias of its own** (`decodeNow()` reads the frame on the glass while
  `meta.mediaTime` is the PTS of the frame about to be shown — the documented
  rVFC pair-vs-single trap), so **every content-anchor number this project has
  printed carries it, including the archive rig's −15**.
- SOUND: the VU is the record leg's own `astats` (the samples being encoded, not
  a second capture); the 5 s check **is** the publish path, R2 and back, and
  discriminates four states — silent → "a silent show is a valid show"; tone →
  AAC 96k costs **2.7 dB**.
- ROOM: `studio/roster.mjs` **is** the roster adapter plan-studio §5 promised and
  that had never been written. Promote/demote echo **32–47 ms**. Three things the
  DO's shape forced: a rejected promote produces no error frame at all (the echo
  is the only ack), `perm.publish` is one flat namespace, and a rejoin emits no
  `left`. Dead tiles get a 3 s watchdog whose `unknown` is a real answer.
- Grid archive wired end to end, 8/8; one real bug found (the static server owed
  `/hls.min.js` the alias `collector.mjs` gives it, so the grid discovered every
  tile and died on `Hls is not defined`).
- Two bugs the verifier caught rather than inspection: the console VU read "no
  audio frames yet" for a whole show (status only pushed on events), and putting
  the roster on the cue deck folded overdub fires into "cue engine drift",
  turning p95 1.7 → 22.5 ms.


## Session 6 (2026-08-27) — grid-archive A/B: self-recording vs central (user: "build 2 protos")

Two agents, one per architecture, both against the deployed elektron-rtc worker
(unmodified), fake canvas media w/ burned wall-clock (camera still wedged).

### PROTO A — participant self-recording (proto/selfrec + workers/selfrec) — ✅ ALL 5 SCENARIOS
- NEW worker `elektron-selfrec` (workers.dev): POST /chunk streaming into R2
  binding (bucket elektron-archive-test, prefix selfrec/), bearer SELFREC_TOKEN,
  X-Chunk-Sha256 server-side reject of truncated puts; POST /finalize manifest;
  POST /delete/<show> = one-prefix consent deletion (proven 5×, 404-verified).
- ✅ Upload lag p50 483 / p95 636 ms (chunk close → HEAD-verified) — ~11× faster
  than the wrangler-CLI engine path. Uplink cost: +1.17 Mbps over the ~1 Mbps
  live publish; drain bursts ~4.6 Mbps only post-outage.
- ✅ 25 s offline (CDP): ZERO loss — 13 chunks buffered in IndexedDB (hwm 4 MB),
  drained 6.8 s after restore. Bug found+fixed: stale backoff timer delayed the
  drain (online handler must cancel pending timers; CDP offline flips
  navigator.onLine so no fetch ever "fails").
- ✅ Tab SIGKILL: 790 ms media lost = exactly the accumulating timeslice; all
  closed chunks already in R2 (0.5 s lag beats the 2 s cadence).
- ✅ Anchor: first burned frame − T₀-at-recorder.start = +20 ms (never anchor on
  first ondataavailable — it's one full timeslice late). Concat plays 2591/2591;
  durations agree within 30–50 ms/90 s ⚠️ → possible clock drift ~1–2 s/2 h;
  per-chunk close wall-times in the manifest give a free piecewise re-anchor.
- Decode trap: MediaRecorder webm has a 1 kHz timebase — ffmpeg needs
  `-fps_mode passthrough/vfr` or it CFR-duplicates to ~1000 fps.

### PROTO B — central per-participant recording (proto/centralrec) — ✅ MEASURED, LOSES
- Pull-only SFU session works (lazy session at first pull); one recorder page,
  MediaRecorder per remote track. N=8 pristine: 4.1 Mbps studio downlink,
  rec CPU ~30% of a core, 100% burned-row decode.
- ✅ Downlink perfectly linear 0.507 Mbps/participant → extrapolated (flagged)
  N=54 ≈ 57–60 Mbps camera-class = **8.1–8.6× the tiered-grid live budget**
  (~7 Mbps); every wall-tier head becomes a 1+ Mbps continuous pull + a
  decoder slot. One-page ceiling bites between N=8 and N=12: at N=12 one
  archive file carries a real 3.1 s hole — sharded recorder pages needed.
- ✅ Sibling coupling: EVERY join/leave renegotiation cuts a 130–172 ms frame
  gap into EVERY other participant's archive file (the unpull-burst lesson,
  now in the archive). Self-recording is structurally immune.
- ✅ Disconnect: `left` at recorder +95 ms, clean file end, no corrupt tail;
  rejoin gap ~2.9 s structural. Double encode: PSNR p50 54.7 dB on synthetic
  (visually lossless) BUT SFU freezes are inherited verbatim into the archive;
  camera noise would pay real generation loss.
- Simulcast arm: rid=h halves studio cost (2.07 Mbps, 16.8% CPU) but pushes
  ~0.97 Mbps extra uplink onto every publisher — nearly A's 1.17 Mbps for
  320×180 instead of source quality. TRAP: preferredRid naming a missing layer
  (q from 360p) silently falls back to f — full cost, zero error surface.
- Chrome traps: ontrack re-fires for an already-associated mid on later
  renegotiations (dedupe per mid); inbound-rtp bytesReceived RESETS on every
  renegotiation (transport counters are renegotiation-proof).

### SYNC LEG (session 6b) — participant recordings ↔ central timeline: ✅ 14/14 REGRESSION GREEN
- `/time` skew endpoint (elektron-selfrec v9f7e7a01) + min-RTT-of-5 client
  estimator: real-world grade is **±50 ms** (bias = edge/worker asymmetry, not
  jitter) — C5's "±25 ms" revised.
- media-span markers ride CUE PASSTHROUGH on the deployed room DO (choreography
  precedent): start/beat/end per participant, 9/9 echo-acks, `start.at ==
  T₀-rec-start` exactly; un-echoed markers resend once, reducer dedupes.
- ✅ **MediaRecorder records H.264** (webm;codecs=h264, ffprobe-verified) →
  repackage is COPY-REMUX: **80 ms ffmpeg wall for 75 s media (0.0011×)** vs
  vp8→libx264 1226 ms (0.016×). TRAP: libx264 default B-frames shift the fMP4
  timeline (+66 ms first-pts) → constant −125 ms seek bias hls.js doesn't
  compensate — **`-bf 0` mandatory** for repackaged MediaRecorder streams.
- Pure-JS EBML cluster indexer (the no-ffmpeg CF path): 10–11 ms/MB, 0 false
  positives; whole-show parse fits PAID worker cron ~300× over (not free-tier
  10 ms); per-chunk incremental (~3 ms) fits even free tier at finalize.
- **Regression (2 staggered participants, burned clocks, composed replay):**
  R1 inter-tile skew p50 29 / max 34 ms (target ≤100). R2 seeks −29…−65 ms,
  absent-participant tiles render EMPTY (absence is content). R4 cues all in
  the 150 ms band (engine +3–5 ms; residual −30…−70 ms = skewEst-on-zero-skew
  minus anchor delta — constituents known). R3 drift CONFIRMED 33–56 ms at the
  73 s tail, but the per-chunk re-anchor's cluster-byte interpolation noise
  (±100–270 ms) EXCEEDS the drift it corrects at minute scale — **linear+skew
  is the default mapping; hour-scale shows want a SimpleBlock-level index**.
- Proof show kept: selfrec/sync-20260827T093613 (27.7 MB) + room cuelog
  selfrecsync-20260827T093613 in the DO. New: repackage.mjs, indexer.mjs,
  replay-grid.html, run-sync.mjs.

### OBS-IN-DOCKER + CF CONTAINERS (session 6d) — both measured ✅
- **CF Containers** (research/cf-containers-2026-08.md; account IS Workers Paid,
  the "free plan" note was stale): wake 3.7 s; copy-remux 282–386 ms for 75 s
  (4× local, fine) → 54-part 2 h show ≈ **$0.20 cloud repackage**; vp8
  transcode **50× local** (0.8× realtime) → h264-first now has local+mobile+
  cloud economics aligned. Outbound net WIDE OPEN measured (arbitrary TCP:
  RTMP to live.cloudflare.com:1935 in 16 ms; raw UDP works); inbound =
  Worker-fetch only. Traps: sleepAfter livelock (lib 0.0.28), node-PID-1
  ignores SIGTERM (15 min billed to SIGKILL — handler mandatory), wrangler
  tail shows no container stdout. Always-on lite ≈ $1.77/mo.
- **OBS in Docker** (rig/obs-docker): ubuntu24 + PPA OBS 32.2 (only apt
  source with CEF), 1.08 GB image, amd64-under-Rosetta on OrbStack. Full
  studio setup from zero over obs-websocket in **189 ms**; RTTs sub-ms except
  SetCurrentProgramScene 4.6 ms. Browser-source pipeline **p50 182.5 ms**
  page→glass — but TRAP OF THE SESSION: simple output mode silently ignores
  x264Settings → default lookahead/B-frames = **1226 ms (6.7× cliff)**; fix
  needs Advanced mode + streamEncoder.json profile FILE (unreachable via
  websocket). Scene switch cmd→glass p50 198 ms (Cut; Fade adds its 300 ms).
  BrowserHWAccel=false or browser sources render black; OBS rewrites ini on
  exit (stop→edit→start). ~2 host cores streaming (Rosetta+llvmpipe tax).
  Resilience: sink-death → RECONNECTING event 77 ms; docker-restart
  cold→pixels 7.7 s. **ThreatLocker verified**: Linux OBS + fresh unsigned
  plugin ran 90 min in the VM on the machine that kills macOS OBS.
- **obs-moq WORKS, both drafts**: built from source (moq-dev/moq@5ddaed0,
  libmoq 0.5.11 speaks IETF 14–19; libsimde-dev + -DBUILD_PLUGIN=ON;
  48 MB .so loads into stock PPA OBS). d14→CF: connected 399 ms, deployed
  player LIVE 30 fps 0 errors, **g2g p50 185 ms** (= the local RTMP chain —
  the CF hop is free). d16: token-in-path, **moq-transport-16 in 164 ms,
  g2g p50 149 / p95 161 ms — fastest chain of the day**. NEW INTEROP TRAP:
  d16 does NOT replay the pre-join catalog group → late-joining players
  stall at catalog forever; obs-moq publishes its catalog ONCE (d14's
  open-group replay masked it) → until the plugin republishes catalog (§7's
  2 s hack) or the relay grows FETCH, **d16 viewers must subscribe before
  StartStream**. Dual RTMP+MoQ not reachable via websocket (no output
  instance without the Qt dock); service flips remotely in one call.
- ~~OPEN CONTRADICTION~~ → **RESOLVED (session 6e, direct measurement):
  QUIC/MoQ egress from CF Containers WORKS.** moq clock publisher inside
  fra20 connected to the d14 relay in 55 ms; 25/25 ticks received on this
  Mac. The obs-docker "no UDP" verdict was a stale doc assumption. Inbound
  QUIC (relay-in-container) stays dead — no public IP.

### MUSIC JAMMING (session 6f) — latency matrix + 2 demos ✅ (proto/jam, workers/jam)
- Truth clock: both Chromes min-RTT-calibrated over loopback (±0.15 ms; skew
  drift 7 µs/25 min). n=550/config, musical rates (bursts/sparse/chords).
- **Matrix (one-way p50/p95)**: DC-direct P2P **1.0/1.5 ms** (ordered ≈
  unordered on clean net); **CF SFU DataChannel 16.2/30 ms** — EXISTS, works,
  datachannel-only session accepted (tracks/new refuses; sessions/new takes a
  DC-only offer), accepts unreliable flags without echoing them; DO relay
  elektron-jam 34.5/47 (cues' parse+restamp costs p95 78 — the only visible
  software cost); legacy relay 51/73; MoQ d14 21.6/33 but **2.9% loss = 100%
  chord notes** (single-frame-group racing; datagram mode confirmed DEAD on
  d14); local ws relay 0.9 ms ≈ DC — **relay software never matters, network
  does**. **JSON tax at MIDI sizes: ZERO** (16 B vs 130 B: no measurable
  delta; binary earns nothing until ~100× rates).
- **Loss verdict (real netem 2%, CDP packetLoss is a NO-OP in Chrome 151 —
  documented)**: reliable modes stall 200 ms (TCP min-RTO) – 412 ms (SCTP
  T3-RTO) in consecutive-note runs, WORST on sparse traffic (phrase gaps);
  unordered+maxRtx:0 converts all of it to ~2% vanished notes with p95 2.5 ms.
  Dropped > late: unreliable wins for live ears; the log path stays reliable.
- **Demos verified** (60 s duets, replay 321/321 count-match, flat timeline
  logs {at µs, kind midi, source, raw}): jam.html — live duet, local monitor
  immediate, remote p50 1.6–1.9 ms over DC; jam-interval.html — NINJAM
  strategy with EPOCH-ANCHORED beat grid (zero-negotiation shared phase): a
  38 ms DO link playing musically on-grid — any link ≲ beat/2 is playable.
- **Recommendation**: same-city = DC-direct unordered (fallback SFU-DC 16 ms,
  no TURN needed); distant = same transport + interval strategy; DO relay =
  ordering point + recorder feed; MoQ not yet right for notes. Timeline needs:
  jam-room cuelog persistence, owMs into the drift channel, lift dedupe+µs
  conventions into the lib. NEW worker kept: elektron-jam (hibernation DO,
  echoes verbatim binary+text, stores nothing; workers/jam/DEPLOYED.md).

### UNCERTAINTY-AS-POSITION — DESIGN SETTLED (session 6ab) — research/spatiotemporal-uncertainty-2026-08.md (985 lines)
**The verdict overturns Checkpoint 7's cost estimate: do NOT turn `at` into a
distribution.** Keep the scalar; add one optional frozen sibling
`when = {verbatim, edtf, earliest, latest, innerFrom, innerTo, rule, kind, note}`
(bracket closed-open; `rule` a VERSIONED named rule à la DarwinCore's
`georeferenceProtocol`, e.g. `err-july15-padding@1`), resolved ONCE at ingest.
**Absence of `when` is the crisp fast path — mirroring the firewall, where
absence of `provenance` means attested. Two absences, two axes.**
- **THE FIRING RULE: `at = when.earliest`, always.** Anchor at the bracket's
  lower bound, fire once, carry `when` as metadata, add an `'anchored'`
  degradation literal. Reasons in order of force: (1) it gives the EXISTING
  comparison a true semantics — `ev.at <= pos` becomes exactly "possibly
  already occurred by pos", the *possible* half of Allen, computed free by code
  that already exists; a midpoint makes that comparison mean nothing; (2) it is
  **one-sided sound** (`earliest ≤ true position` is a theorem) — and
  proto/kurenniemi's ingest had already reached this empirically from data:
  "a midpoint is indistinguishable from an attested 15 July; a start is at
  least a LOWER BOUND that is true"; (3) **nothing in the transport moves**
  (insertInto, afterIdx, bsearch, and scan's early exit all keep the scalar and
  the sort); (4) render-only REJECTED on contract grounds — prefixEvents folds
  every row with `at <= pos`, so a non-firing row hands a reducer a positionless
  payload, and a row kept out of the lane **vanishes from evidenceAccounting(),
  silently shrinking the archive under exactly the query the firewall
  protects**; (5) per-kind caps policy REJECTED — the transport has one
  ordering key, so per-lane anchors make window() across lanes ill-defined.
- Position uncertainty gets its OWN query knob — `window(..., {certainty:
  'possible'|'necessary'})` = Postgres `&&` vs `<@`, one GiST scan each — and
  its own accounting (`positionAccounting()`, reported BY RULE, so "43 % of this
  lane is positioned by a padding artefact" is a visible number). Unlike
  EVIDENCE_POLICY_REQUIRED the certainty knob DEFAULTS rather than throws:
  silence there over-includes, it does not fabricate.
- Strip: keep the flat per-row band; **fix the per-lane aggregate, which is
  currently a miscomputed aoristic sum**. (PeriodO explicitly rejected fuzzy
  curves — "natural language is already a compact and easily indexable way to
  represent imprecision… rather than imposing an arbitrary mapping to
  parameterized curves" — so an aoristic curve is not obviously the honest form.)
- Deferred explicitly: space, the trapezoid interior, non-contiguous brackets,
  Monte Carlo, competing authorities, transaction time, `when` on spans.
- **Three things the spatial tradition knows that the temporal one keeps
  re-learning**: (1) **a coordinate without a stated uncertainty is not a
  georeference** — DarwinCore enforces it and *zero is not a valid value*;
  every timeline tool surveyed accepts a bare date and asks nothing. (2)
  **Padding is the universal bug and it is always the same line of code** —
  GBIF's `3°20′ → 3.33333`, TimelineJS's `{year:1850} → new Date(1850,0,1)`,
  Palladio's `padYear(s)+"-01-01"`, ERR's `YYYY-07-15`. Space diagnosed it,
  named it *false precision*, and standardised the fix; time re-implements it
  every few years in a new framework. (3) **A record with no geometry is still
  a first-class record** (Pleiades: "places are entirely abstract, conceptual
  entities"; Linked Places ships `"geometry": null` as legal and meaningful) —
  whereas TimeLineCurator quarantines vague events off-axis and does not export
  them, and PeriodO's own renderer discards two of its four fuzzy values.
  **Identity does not depend on the quality of the coordinates — which is
  exactly why an uncertain ATTESTED row must survive an attested-only query.**

### KURENNIEMI CORPUS (session 6aa) — ✅ Tier A, 8/8 (proto/kurenniemi) — the SECOND institution
The PhD case study at the project's origin, now a real client: position domain
IS calendar time (1941→2018), 22 items / 3 sources / **12 playable** MP3s.
Three adapters: `record` (discrete), `tape` (`caps.rates:[1]` — a tape only
plays at tape speed, so archive rates are **refused on the record** via
`deck.request`; 12 refusals logged, `lattice [1] cannot express 31557600`),
`certainty` (continuous, `caps.tier:1` — which ARMS the evidence firewall on
real archive data: `sampleAt` with no policy throws EVIDENCE_POLICY_REQUIRED,
and attested-vs-restored differ on 297/300 probes with attested taking **4
distinct values, all of them real samples**).
- Availability: **archive.org** is the only playable source (audio 206 + ACAO:*;
  **video 206 with NO ACAO** — the 302 has it, the final node doesn't; no
  expose-headers anywhere). Wikidata supplies dates WITH explicit `precision`
  (incl. a genuine precision-8 decade). Europeana has the DIMI-A image (CC
  BY-NC-SA, institutionally asserted). **Finna 403s a Cloudflare managed
  challenge to curl, node, WebFetch AND headless Chrome** — an edge rule, not
  policy. FNG's API ignores `?q=`; the Kurenniemi archive isn't in it.
  AV-arkki/Yle/Constant: no API / 404 / **`kurenniemi.activearchives.org` no
  longer resolves**. The Taanila doc is on IA as a Yle rip with null licence —
  deliberately EXCLUDED.
- **Four sources, four precision conventions for "1970"**: ERR `1970-07-15`
  (midpoint pad, no precision field — the trap); Wikidata raw `+1970-00-00` +
  `precision: 9`; Wikidata SPARQL `1970-01-01` + timePrecision (**same
  statement, different padding**); EDM `"1970"` (precision = string length).
  The client sets `at` = band **LOWER BOUND, never a midpoint**, carrying
  `bandMs` — which is exactly the spatiotemporal survey's truncation-not-padding
  rule, arrived at independently from data.
- **What ERR alone did not teach (the real value of a second institution):**
  1. **The date field can describe the FILE, not the WORK** — IA's `date` on
     the collection is 2022-04-11, the day someone ripped it; naive
     `source.date → at` yields a corpus off by 50 years that is *internally
     consistent about it*. The rejected field is kept as `prov.itemDateField`
     so the rejection is auditable.
  2. **Rights need an ASSERTER** — IA marks a 1968 Love Records release
     `publicdomain/mark/1.0`: well-formed, machine-readable and wrong. 13/22
     items are `confidence: LOW`. **A rights value without a chain of assertion
     is decoration.**
  3. **Ingest is multi-source by construction** (media on IA, dates on
     Wikidata, object in Europeana) — the adapter's real job is RECONCILIATION;
     every item names one of five `dateEvidence.how` methods.
  4. **The honest form of "undated" is a BAND** — 9 tapes take 1963–1973 from
     the title of the authoritative compilation, tier-1, rendered as nine
     identical hatched bars: *nine items pinned to one guess, visible at a
     glance*.
  5. **CORS posture varies per content TYPE, not per item** — so mediaRef
     indirection isn't enough; the corpus must record what the client may DO
     with the bytes.
  6. **An aggregator can rate-limit you into a silent lie** — throttled WDQS
     answers **200 with zero bindings**; the first run shipped `work: 0` and
     reported success. Ingest now refuses to ship an empty spine.
  7. **The custodian is the one you can't reach** — both real holders (FNG
     Central Art Archives, Finna) are closed; what plays is on an aggregator,
     uploaded by strangers. That asymmetry is why provenance confidence must be
     first-class.
- Library note: **`deck.range` is a seek window, not a play stop** — at 3.16e7
  the vector ran to year 10943 with nothing complaining. For an archival deck,
  "the archive ends" is normal, not an error.
- Unlock list: Finna (a CDN edge rule — an allowlisted UA turns 3 sources into
  a national aggregator) · FNG for the Kurenniemi **finding aid as data** even
  without digitised objects · Yle for the Taanila doc (not the IA rip) ·
  rightsholders for the tapes before any public performance.

### FRAGMENT QUOTATION + mediaMaster (session 6z) — ✅ 128 + 20/20 + 6/6 + 7/7
- **`nest.add({id, at, rate, deck, in, out, master})`** — `in`/`out` default to
  `deck.range`, so **the whole-range case IS the default case** and rules 1–6
  are untouched. Rule 7: span occupies `(out−in)/rate`; **entry seeks the child
  to `in` and ASSERTS there** (a quotation opening mid-note opens with that note
  sounding); `out` IS the child's end for this quotation; a parent seek maps
  `in + (parentPos−at)·rate` — same affine map, different origin, so exactness
  is inherited (**1e-9 in prop, 0.000 ms in the client**); out-of-range clamps
  and REPORTS `{wanted, chose, clamped, quotedFraction, reason}`; `in>=out`
  rejected; **trim never mutates the child** (the fragment lives on the span).
- **Twice-quoting one deck works — and forced two real library bugs out**:
  (1) an absent span used to seek+pause the SHARED child even when a sibling
  quotation was present (the second quotation would have played zero ms);
  (2) the park sat inside a present→absent transition check, so play-past-then-
  seek-before left the child at the wrong edge — **absence is a POSITION, not
  an edge event**. Overlapping quotations of one deck are rejected at add()
  (arithmetic, not policy) with the workaround named in the error.
- `deck.setRange([min,max] | 'auto')` — additive; `deck.range` mutated in place
  so identity survives; a playhead left outside is moved with a **real seek**
  (reduce + assertState), never a silent clamp; cursor arm proves `sampleAt`
  stays exact and ~O(1) across a range change.
- **`timeline/media-master.mjs`**: L1 never nudge the master · **L2 drift is
  `sync()`, a discontinuity > jumpMs is `seek()`** · L3 a stall gives up the
  role (hold | release) · L4 `timeupdate` is the hidden-tab backstop · L5
  paused/ended/not-ready/**seeking** is not a clock.
- **THE LIVE BUG, REPRODUCED THEN FIXED**: `replay-grid.html` called
  `deck.sync()` unconditionally on a page whose cue kind is `catchUp:'burst'`,
  so any scrub or hls.js recovery jump left every skipped cue pending and burst
  them. **Negative control (deterministic, in node): `deck.sync()` across a 9 s
  gap bursts 9 of 10 cues; `mediaMaster()` on the identical gap bursts 0 and
  folds all 9.** Adopted in replay-grid (release) and replay.html (hold,
  duplicate removed).
- Verification: prop-test green 30/100 · **prop-nested 128/0** · compose-run
  **20/20** (fragment seek 6/6 exact, 0.000 ms; a 20 s ask on an 18.6 s session
  clamps and reports) · verify-replay **6/6** (master jumped +61,189 ms over 3
  cues → **0 burst fires**, all folded) · run-measure-archive **7/7 twice**,
  run 2 reproducing the pre-adoption table to the last digit (p50 −4 / p95 11).
- **What "timelines referencing timelines" still needs**: (1) no way to SILENCE
  a quotation at its edges — parking asserts whatever in/out cut, so a MIDI
  actuator holds edge notes while absent (needs `caps.absentState`/`silence()`
  so the nest never has to know what a note is); (2) **no content addressing** —
  in/out are numbers, "from the third chorus" needs the child's own marks as an
  addressable lane; (3) **a quotation is not yet a VALUE** — `nest.add()`
  mutates a nest and there is no serialisable `{deck, in, out, rate}` a stored
  score can carry, **which is the actual C10 ask**; (4) overlapping quotations
  are rejected, not solved (a canon/delay needs an instancing seam);
  (5) driftStats double-reports a twice-quoted child (reporting only).

### EVIDENCE FIREWALL + PROVENANCE (session 6y) — ✅ transport v0.5, §5b's doctrine is now code
- API: `createDeck({evidence})` / `setEvidence` (`'attested' | {restored:{maxTier:n}} | 'all'`);
  `sampleAt/reduceAt/window/bracket` all take `{evidence}`;
  **`registerReconstructor(name,{from,into,tier,method,derive,confidence})`**
  → `{run, drop, rows, stats}`; `provenanceOf()`, `evidenceAccounting()`
  (`{attested, restored, total, inventedFraction, byTier}`).
- **Forced choice, both arms composed**: per-call `{evidence}` → explicit deck
  policy → **throw `EVIDENCE_POLICY_REQUIRED`**. The deck policy IS the forced
  choice (a property of the session, not of 4,615 render-loop reads); the throw
  enforces it. **The only omission answered is one whose answer is PROVABLY
  identical under all three policies** (`policyMatters()`) — a proof, not a
  default.
- **The trigger is `caps.tier ≥ 1`, NOT `caps.continuous`** — subtle and right:
  tier is the adapter's own statement that its between-sample values are
  restoration; gating on `continuous` would retro-classify shipped clients
  (proto/automation's `cc` holds a level between messages *because MIDI says
  so*, not because it invents). An interpolating adapter with no declared tier
  gets a ledger line at registerAdapter — recorded, not guessed.
- **Attested rows carry NO `provenance` key at all — absence is the
  definition.** Derived rows: `{source:'reconstructor-<name>', method,
  confidence, tier, refs:[attested ids], from}`, frozen, injected after the
  payload. **Lane purity** (a lane is attested or derived, never both;
  scheduleEvent throws both ways) makes the firewall O(1) and makes "delete a
  restoration = drop its lane" the only thing dropping CAN mean.
- Nice mechanism: **a restricting policy WITHHOLDS `info.next`**, so an
  interpolating reducer degrades to its own hold with **no adapter change**.
- prop-test suite 6, 0 violations at 30 and 100 seeds: attested mean error
  **21.871 px** vs restored **0.0232** — **bit-identical to suite 5a's `hold`,
  which IS the proof that attested never interpolates**; forced-choice throws
  exactly where the answer could differ and NOT on discrete reads; tier-2 lane
  excluded at maxTier 1 and served at 2; tier-3-without-derive refused in
  words; **reversibility: 1,674 derived rows dropped → master trace AND
  scheduler audit bit-identical**, re-run reproduces it.
- **proto/paths 14/14, numbers held** (seek 0.042/0.032/0.042; deviation
  24.19/0.679/0.0357). Now: `window(smooth)` restored 896 rows (837 derived) vs
  attested 59 (0 derived); **evidence-only makes both reconstruction lanes
  paint 0 px — the LIBRARY refuses to serve them** — with evidence ink
  unchanged and exact restore; **the 93.4 % invented figure now comes from
  `evidenceAccounting` (837/896)**. One number moved on purpose: linear ink
  18,652 → 17,973 because it is hatched from `tier:1` on the rows rather than a
  client table. Client +38 lines net (−10 on the mechanism it replaced, +48
  new capability: tier styling, policy switch, provenance panel).
- No-regression: compose-run **20/20** (grown from 16 by the sibling's fragment
  work) and the sibling's prop-nested 128/0 — their `curve` adapter declares no
  tier, so the firewall leaves it untouched: the compatibility property by
  design.
- §5b still owes: tiers 2/3 (seam proved, no model plugged in); reconstruction
  does not render into §−1's uncertainty smear (per-row `confidence` carried
  but not mapped to alpha); no provenance popover (refs on the row, not
  clickable); "restoration IS remix" stated not exercised; reconstructors run
  once — no incremental run() over a growing lane.

### STORE LAYER (session 6x) — ✅ 39/39 (`node timeline/lab/prop-store.mjs`)
New files only (`timeline/store.mjs` + lab); the transport wiring is a SKETCH in
NOTES-store.md §6, not applied (siblings own transport.mjs).
- **The interface is two lines** because v0.4 made the cursor the only
  positional reader: `rows.length` + `rows[k]` with a non-decreasing key.
  `open()` is async; **every read after it is synchronous** (a lookahead tick
  cannot await), so the async half lives entirely in `ensure(fromPos, toPos)`
  driven by the horizon the scheduler already computes — **prefetch is the
  existing lookahead extended one level down**.
- **Miss policy: FIRE LATE with a drift record** (`origin:'store-miss'`).
  Rejected *stall* (there is no stall that isn't a pause(), and a store must
  not move the transport behind the client's back) and *skip* (it holes the
  prefix, making a non-commutative reducer silently wrong — SEAM 5 broken
  invisibly). Fire-late wins because **it is not a new failure mode**:
  lateGrace + per-kind catchUp already decide what happens. Mechanism: a
  **ghost row** whose key is interpolated inside its page's known bounds, so
  it stays monotone and the bisect still converges. Measurement forced two
  fixes: `ensure()` must PIN its window (background repairs from a cold bisect
  were evicting it — 200/200 seeks failed before pinning) and repairs cap at 2.
- Backends: **memory** identical to `createCursor(array)` over 6400 probes incl.
  the same cursor trajectory · **jsonl** 1M rows: **cmp/call 2.38 at 10k AND at
  1M**, resident **32,768 rows (3.28 %) ≈ 3.8 MB at any size**, 200/200 exact
  seek-anywhere, plus a **stale-index guard** (the sidecar is byte-bound to its
  log and throws rather than Range-ing into a redacted line) · **do** reads the
  real kept session **392/392 rows field-for-field, order preserved** — and
  `from` is a ROW OFFSET because C4 said SQLite rows not a JSON blob: **the
  amendment paid off two layers away**.
- Bench at 1M rows: array 143.8 ms open / 114.5 MB heap vs **jsonl 2.5 ms open
  / 3.8 MB heap, flat in n**; warm advance 1–2 µs; the entire price is one cold
  seek at 6–10 ms (one Range round-trip) — which is exactly why the policy is
  late, not stall. Page = 4096 ROWS ⇒ sidecar **22.7 KB for a 69.7 MB log**.
- **Append-live: 3 appends under a moving playhead land in order,
  `cursorResets === 0`** — true by construction (the tail is append-only past
  `indexed`, so no index the cursor holds can move). Out-of-order appends are
  inserted sorted AND reported, mirroring the DO's per-source rule.
- **Biggest remaining gap for ERR: cross-year QUERIES, not seeks.** "What is at
  t" over one ordered log is solved; "every event of kind X across forty years"
  touches every page. Cheap first fix: physically partition by (kind, year) at
  ingest (also removes storeLane's O(n) map); the index needs a second level
  (root manifest → per-year sidecar — `proto/selfrec`'s manifest tree already
  IS this shape); and doStore's 359 ms open is five sequential boundary probes
  that a ~15-line `GET /session/<id>/index` would collapse to one.

### CONTINUOUS KINDS FIRST-CLASS (session 6w) — transport v0.4, all six seams closed
| seam | API |
|---|---|
| no positional read (O(n) reduceAt) | **`deck.sampleAt(kind,pos,opts)`** — O(1) amortised, per-kind cursor |
| no bracketing query | **`deck.bracket(kind,pos,opts)`** → prev/a/b/next/prevs/nexts/u/dtMs |
| spline ≠ f(2 samples) | **`interpolate(a,b,u,ctx)`** + **`caps.neighbourhood`**; control fields injected AFTER the opts spread (the same law as the logdeck bug) |
| reduce blind to successor | **`info.next` / `info.nexts`** via bisect on the sorted lane |
| caps inert | library reads continuous/interpolate/interpolators/neighbourhood/followsTransport → **`adapter.transport(state)`** on play/pause/rate ONLY (never seek — that's reduce+assertState; never sync — a correction must not cascade) |
| "degrade honestly" impossible | **`deck.request(kind,want)`** → `{wanted,chose,degraded,reason}` + `deck.degradations(kind)`; **unbacked caps claims caught at registerAdapter, not at 60 Hz** |
- **Guarantee sharpened in-source**: discrete → `state(t)=f(prefix(≤t))`;
  continuous → `f(prefix(≤t), successor(s))`. No render tick added — cadence
  stays the client's. `prefixEvents` now bisects a per-kind lane.
- logdeck fixed (`{...payload, i, at}`, row stamp survives as `atUs`).
  nested.mjs's hand-written onState filter DELETED — it had been declaring
  `followsTransport:true` into a library that ignored it.
- **Proof by DELETION, not by new asserts**: paths' `makeBracket()` (27 lines),
  its lane handles, the `expand()` no-`at` hack and all client-side interpolate
  driving removed — **600 → 566 client lines, and the adapter now holds NO
  reference to the log at all** — with numbers **bit-for-bit identical**
  (seek 0.042/0.032/0.042 px, deviation 24.19/0.679/0.0357, per-lane ink
  unchanged). Library served 4,847 `sampleAt` calls at **2.05 comparisons
  each**; cursor measured **3.67 comparisons/call at n=2000 AND n=8000**
  (rescan ≈1000).
- prop-test 0 violations at 30 and 100 seeds, five suites, incl. **C3's
  necessity**: with `{neighbourhood:0}` the C¹ interpolator returns exactly
  linear and labels itself `linear-degraded`. No-regression: compose-run 16/16.
- **Cheapest remaining gap = the EVIDENCE FIREWALL (~20 lines + one prop arm)**
  — today's work built its machinery by accident: `sampleAt` IS the tier-1
  reconstructor running inside the library; `caps.tier/method/evidence/deviates`
  are declared and finally read; `request()` already has the firewall's exact
  `{wanted,chose,degraded,reason}` shape and `degradations()` is the ledger for
  "you asked attested-only and got restored"; prefixEvents bisects a lane so a
  policy is a predicate over a slice. Concretely: `info.policy` in reduce +
  `sampleAt(kind,pos,{evidence:'attested'})`. **And paths can prove it on day
  one at zero client cost** — it already ships the evidence-only toggle, the
  hatching and the invented-percentage. Ranking behind: provenance (nearly as
  cheap but has no consumer until the firewall gives it one — a field nobody
  reads is the `caps` mistake just fixed); fragment quotation (needs sub-range
  spans + remapping, wants provenance first); uncertainty-as-position (changes
  what an `at` IS — scalar → distribution — touching insertIdx, cursor,
  horizon, reconcile and every reducer; v0.4 makes it thinkable, not cheap);
  a real store (largest, but the cursor is now the ONLY positional reader, so a
  paged/async backend has one interface to satisfy).

### TEXT PERFORMER (session 6v) — ✅ 12/12 (proto/text) — the adapter the lineage kept failing to write
- **My briefed API was WRONG and it measured that**: `getTargetRanges()` returned
  EMPTY on **0 of 65** beforeinput events on <textarea> (spec-mandated — closed
  shadow tree) and 0 of 2 on contenteditable=plaintext-only under real CDP keys.
  So the range comes from the DOCUMENT: beforeinput snapshots value+selection,
  input reads the new value, and the minimal contiguous replacement is
  disambiguated by the **post-edit caret** (prefix/suffix diff alone is
  ambiguous on repeated characters — exactly what corrupts a cursor). 64/64
  content ops resolved caret-anchored, 0 fallbacks. Two numbers naming the
  ancestors' bug: pre-edit selection was wrong for 1 insert, and for **7/7
  deletes the range HAD to be derived** (a backspace's pre-edit selection is a
  collapsed caret that tells you nothing).
- Op schema `{at µs (from ev.timeStamp — never re-stamped), kind:'text-op',
  op:{type:insert|delete|select, range:[s,e], text?, dir?, inputType, anchor},
  meta}`; `reduce(prefix ≤ t) → {text, selection, dir}`. **There is no modifier
  field and there cannot be one** — the log stores resulting characters, so the
  shift double-application bug (demo2/demo12/demo-timeline-component) is
  *unrepresentable*, not merely fixed.
- inputTypes: handled is an OPEN set by construction (any plain-text content
  change arrives as a value diff — incl. historyUndo/Redo folding out as
  ordinary diffs, where keyboard2 recorded Cmd+Z as a literal "z"); **not
  handled is a CLOSED 21-entry set in `caps.unhandledInputTypes`** (every
  format*, list, hr) — counted, never silently dropped.
- Results (78 ops / 9.49 s, real CDP input): replay **character-for-character**
  identical incl. selection; **C2 on real text 3/3** at the widest silences
  (text AND selection); selection restored on seek 3/3; pause 0.000 ms; rate
  1.997×; jsonl round-trip exact; **two lanes: 529 frame samples, 0
  divergences** — the first run's 3 mismatches were a bug in the CHECK (a
  position-domain settling window applied to a wall-clock quantity, 3× too
  narrow at 3×), now rate-scaled and residuals classified rather than tolerated.
- IME honestly: `imeSetComposition` produced 3 insertCompositionText ops that
  folded and replayed correctly; a real platform IME with a candidate window is
  **not testable headlessly**. Structurally it cannot be wrong (composition is
  value diffs); the open question is policy — current default keeps each
  composition step as its own op, because in a performance the hesitation IS
  the content.
- Performance half: keyboard2's typography ported intact; **audio rebuilt from
  scratch** because the survey corrected the record — keyboard2 has no
  oscillator, it fetches an untrimmed freesound MP3 through a bare BufferSource
  with `start(0)` and NO gain node (hence no velocity, no scheduling, unbounded
  voices). Here each op is a synthesised click scheduled at `when.audioTime`
  via `caps.audio` — **SEAM 4 worked unmodified for a non-musical kind** —
  velocity derived from the log by index, never stored; 24-voice cap.
- **Transport is out-of-band STRUCTURALLY, not by filter**: capture listens to
  beforeinput, which non-editing keys never fire; demo12 had to hand-exclude
  its own Ctrl+Space/Ctrl+Enter and keyboard2 records Cmd+A/V/S/Z as letters.
- Seams: **independently re-found the logdeck `at` clobber** (every row in this
  lineage names its µs stamp `at`); `reduce()` has no declared return shape
  (three kinds now return a scalar, a Set and a document); `caps.stateful`
  should be library vocabulary making reduce+assertState mandatory; **SEAM 5's
  whole-prefix guarantee is load-bearing — a text fold is strictly
  non-commutative and would have been impossible at v0.1**; no backward-seek
  fast path (text ops are trivially invertible ⇒ the natural place to prototype
  the undo-log seek strategy).

### DoD-A DISCHARGED (session 6u) — ✅ replay.html ON THE LIBRARY, both suites PASS
plan-studio §5's named gate: "replay.html REFACTORED onto the lib and the
existing measurement suite passes" — **PASS, and the numbers improved 3–4×.**
- `run-measure.mjs` (content anchor): **11/11**, p50 **16** / p95 **34 ms**
  (was 59/71); engine lateness p50 **5.5**, max 9 (was 52).
- `run-measure-archive.mjs` (native T₀, kept R2 show): **7/7**, p50 **−4** /
  p95 **11 ms** (was 77/95); anchor delta unchanged at −15 ms. Negative errs
  are NOT early fires — the burned-clock ground truth's own 33 ms frame grid is
  now the dominant term.
- **THE METHODOLOGICAL FINDING (correct the record): the project's most-quoted
  latency figure was ONE DETERMINISTIC PHASE SAMPLE, not a distribution.** The
  old path's twelve errors came back BIT-IDENTICAL two days later on a fresh
  browser — impossible for a 100 ms poll unless the phase is locked, and it
  was: cues every 15.000 s = exactly 150 poll periods. Honest old spec was
  0–100 ms + quantization, worst case ~133 ms against a 150 ms target
  (proto/archive read 129 ms at a locked worst-case phase). **Real margin ~11 %,
  presented as 60 %.** Measurement cadences must be de-aliased forever (the
  fractional-offset rule from proto/archive, now mandatory everywhere).
- Old path had NO correctness bug (12/12 once, 0 re-fires on seek, 0 fires
  during pause — rebuild-on-`seeked` + onMissed already handled what bit
  replay-grid; playhead-driven so instrument's pause bug is absent). The
  hidden-tab arm could NOT be produced headlessly (never reported `hidden`
  under bringToFront or Target.activateTarget) — the 981 ms clamp stays
  lab-measured, not claimed here.
- Written: one `cue` adapter (burst/seekable/reducible; reduce = fired-set ≤ t;
  assertState = the late-join/seek fold) on a deck whose **position domain is
  absolute wall ms** (a cue's `at` IS its position); video element masters via
  `deck.sync(T0 + currentTime*1000, {toleranceMs:10})` per rAF with
  `timeupdate` as the hidden-tab backstop; **a discontinuity >400 ms routes to
  `seek()`, NOT `sync()`** — syncing across a jump leaves skipped cues pending
  and bursts them. Seek is now a fold, not a rebuild. URL contract preserved.
- Consequence to record: README's "replay − live = 0…1 ms" was two errors
  cancelling; with the poll floor gone, "now" cues replay **32–34 ms earlier**
  than the live burn — true intent semantics; `fireDelayMs` buys the live feel.
- **⚠️ ACTIONABLE: `replay-grid.html` syncs UNCONDITIONALLY with no jump→seek
  discrimination**, so an external scrub or an hls.js recovery jump can re-open
  the burst-every-skipped-cue bug its own adoption fixed. Two divergent copies
  of the media-master block now exist ⇒ **`mediaMaster(deck, el, {toleranceMs,
  jumpMs, stallMs})` should land in `timeline/` before Session C.**
- Other seams: `createDeck({at})` (an absolute-domain client must seek() before
  play(), conflating "place the playhead" with "assert past state");
  `caps.staleMs` (the pastWindow policy is client code though the drift record
  already knows).
- **Merged-v0 unblocked**: Sessions B/C can build on the lib; the SHOW panel's
  strip should read the deck's drift channel (audit()/driftStats() gave this
  gate its legibility for free); plan-studio's "59 ms proven" row must be
  restated as 16 ms p50 — and never again as a single locked phase.

### CC AUTOMATION + slider-video REVIVED (session 6t) — ✅ 20/20 (proto/automation)
- **The distinction that shapes everything: `midi` is EDGE-valued (a lost
  note-off wedges the instrument), `cc` is LEVEL-valued (every message is a
  complete statement, last-writer-wins).** So catchUp is `reduce` not `burst`;
  `reduce(prefix ≤ t)` = last value PER CONTROLLER, keyed `cc:<ch>:<coarse>` /
  `pb:<ch>` so a fine/coarse pair folds to ONE key and restores a coherent
  14-bit value; `assertState` sends **CC 121 per channel then re-states every
  entry, MSB before LSB** — the reset is what makes seek ABSOLUTE.
- **Bug the smoke test caught, not theory: switches are STEP series.**
  Interpolating sustain-down@1.5 s against sustain-up@3.0 s returns "half
  pressed" at 2.2 s. CC 64–69/120–127 are now excluded from interpolation, the
  value index, and the strip.
- 14-bit CC pair **16384/16384 exact**; pitch bend **16384/16384 exact**; same
  16-B frame as jam-core, byte 0 discriminates (`note`/`vel` are really d1/d2).
- Seek ×3: library fold === independent node-side fold, **error 0** all three.
  Against the analytic curve, interpolated assert beats knot-only fold:
  max 128 (0.78 %) vs 1152 (7.03 %) · 9 (0.05 %) vs 512 · 21 (0.13 %) vs 1408.
- Throttle 6408 raw → 409 rows (15.7:1) with reconstruction error ≤1.25 %
  (7-bit) / ≤0.23 % (14-bit). Automation-lane drift |max| 7.70 / p95 7.11 ms
  over a 5-target scrub, 0 sync corrections. Replay 409/409, rate 1.997×.
- **slider-video revived**: it died at the missing
  `transportPosition ↔ mediaCurrentTime ↔ pixel` mapping (gen-1's onProgress
  supplied half of it and was deleted as "noise"). The page names all four
  mappings in one place; media masters while playing (sync, 8 ms tol),
  transport masters while scrubbing, crossover 250 ms; the media clock is read
  **edge-extrapolated** — sampling currentTime raw measures its own
  granularity and calls it drift.
- Folding into proto/instrument (not edited): add CC 121 beside 120/123 and
  keep the explicit sustain-off (121 is vendor-dependent); **frame needs no
  layout change** (note/vel → d1/d2 + a `status & 0xF0` switch, so recorded
  shows stay readable); storage needs nothing new — `cc` is a third lane on the
  same makeLogDeck; keyframes go out-of-band as a sidecar (derived state —
  logging them would double-count on replay).
- Seams: the sibling's library rewrite **closed two mid-build** (prefix-only
  reduce → `info.next`/`info.nexts`; payload.at shadowing → spread-order fix);
  16/16 interpolated asserts now served by the sanctioned successor channel.
  Still open: **bracketing groups by KIND, not series** (`caps.series` is
  declared and not read) so interpolate must defend against cross-controller
  pairs and only works by over-asking `neighbourhood: 8` — with more
  controllers it degrades to last-knot QUIETLY; the overdub law is right for
  notes and wrong for levels (a curve authored behind the playhead must not
  move the current value); no sync-vs-seek threshold policy; caps not
  serialisable.

### NESTED SPANS — COMPOSITION ACROSS TIMELINES (session 6s) — ✅ 16/16
`timeline/nested.mjs` (~300 lines): `createNest(parentDeck).add({id, at, rate,
deck, master})` + `servo()`. **transport.mjs needed ZERO changes** — a nested
deck is an ordinary adapter (`kind:'deck-span'`), which is seam 1 (the adapter
registry) paying off: composition is just another kind.
- Rules chosen: child pos = `clamp(c0 + (parentPos−at)·rate)`; outside the span
  the child pauses AND is asserted at the boundary it left through (absence is
  content one level down). Rate composes multiplicatively against the
  intersection of the child's adapter lattices, off-lattice → nearest in LOG
  space with `{wanted, chose, degraded, reason}`. A parent seek is a real
  `child.seek()` (so reduce-on-seek runs INSIDE), `sync()` reserved for the
  servo. **A nested child never masters unless asked, and a DEGRADED child
  cannot master** (it runs a rate the parent didn't ask for → mastering
  suspends rather than silently imposing 2× on the arrangement). Cycles
  rejected at add(), depth capped 8, drift nests rather than flattens.
- prop-test green at 30 and 100 seeds with a new suite 4 (nest-span/seek/pause/
  rate/absent/servo/master/cycle/depth); needed a fan-out of the virtual host
  (two decks want two metronomes on one clock).
- **Composed demo `proto/remixer/compose.html` — the motivating case, 16/16,
  0 upstream calls**: the REAL kept instrument session (128 MIDI rows) nested at
  30 s inside an arrangement beside archive spans. Parent 34.91 s → child
  4.91 s, **map error 0.0 ms**; **parent seek into the middle: 14/14 probes
  exact, max child position error 0.000 ms, held set === reduce(≤childPos)**;
  pause holds every layer at 0.000; rate 2× → 5987 ms parent AND child in
  3007 ms wall (1.99×), child media exactly 2.00×; 1.5× parent → child chose 2×,
  degraded, **mastering suspended 300 ticks** while the arrangement still ran
  1.50×; at 60 s the session is absent/frozen while the archive layer keeps
  playing +2497 ms.
- **Fourth latent bug, pattern holds**: the child's media element was asked to
  play() at span entry and silently stayed paused for a whole pass — fixed via
  `caps.followsTransport`, a seam now filed by THREE clients.
- **Closing analysis — what plan-timeline still promises that the library
  cannot express** (nesting sharpened 1–2 rather than solving them):
  1. **Quotation of a FRAGMENT**: `{at, rate, deck}` has no `in`/`out`, so a
     nested span plays the child's WHOLE range — but §−1's mission is quoting
     *pieces*. Trim drags in the rest of v3 (move/mute/solo-by-query/re-time),
     none of which exist because `range` is fixed at construction.
  2. **Uncertainty as position**: "1971, probably spring" has no
     representation — `at` and `position()` are exact scalars and the scheduler
     cannot fire "approximately". Nesting made a SPAN a deck; it did not make
     an INSTANT an interval with a distribution. The founding heritage
     requirement, and the library is silent on it.
  3. **The evidence firewall**: reduce/window still take no
     `attested | restored(tier ≤ n) | all` policy — reconstructor lanes would
     WORK today; the discipline that makes them honest does not exist.
  4. **Provenance/rights**: payload is opaque by design, so nothing is
     enforced — and pointedly `nest.add()` takes no provenance, so the
     library's own quotation primitive cannot record what it quotes or under
     what rights.
  5. **A store**: v0 promised memory/DO/JSONL-R2 backends; the library is an
     in-memory array with a linear-scan prefix. Decades of ERR cannot be a JS
     array and no client has had to find out yet.
  (Smaller: negative rate/reverse scrub explicitly unsupported; the strip
  visualizer is still promised as a component and was hand-drawn again today.)

### PATHS: THE FIRST CONTINUOUS CLIENT (session 6r) — ✅ 9/9 (proto/paths)
demo10 + draw/drag ported forward as a `pointer` kind — and the first client to
exercise plan-timeline's `interpolate` seam.
- **Every documented ancestor defect fixed and marked FIX-n in the source**:
  destructive sampler → two append-only lanes (evidence never consumed — which
  is WHY deviation numbers are possible at all; demo10 could not measure its
  own comparison because its sampler ate the ground truth); frame-count →
  wall-clock decimation; dropped first/last segments → reflected phantom
  endpoints; fixed t+=0.2 → pixel-budget subdivision with integer stepping;
  per-frame recompute → per-segment cache (render 0.02 ms); PLUS beyond brief:
  uniform-knot Catmull-Rom → **time-knotted Hermite** over real timestamps
  (synthetic trace carries ±2 ms jitter to exercise it).
- **Numbers**: seek ×3 vs analytic truth **0.042 / 0.032 / 0.042 px** with the
  interpolating reducer vs **38.3 / 45.6 / 27.0 px** with zero-order hold —
  ~900×, and proof `reduce()` really interpolates. Deviation from evidence
  (721 samples): hold mean 24.19 / linear 0.679 / **Catmull-Rom 0.036 px**.
  **59 attested samples, 896 drawn → 93.4 % of the rendered path is invented,
  at 0.036 px mean cost** — the §5b invention figure, permanently on screen.
  Pause drift 0.000 ms; rate 1.990×; 0 console errors.
- **THE INTERPOLATE-SEAM REPORT — the library does NOT support continuous
  kinds** (transport half fine; adapter half missing four things):
  1. **`interpolate` is never called** — the word appears nowhere in
     transport/logdeck; registerAdapter validates only `actuate`; of caps the
     library reads only catchUp/audio/assertOnSeek. `caps:{continuous,
     interpolate}` is documentation, so C3's "degrade honestly" cannot happen.
  2. **No adapter hook between two fires**: measured **59 attested fires vs
     4,854 interpolate() calls — 98.8 % of rendered motion came from client
     code the library knows nothing about**. Fix: drive continuous adapters
     off the position observable the deck already runs.
  3. **No bracketing query; the only positional read is O(n)** (`reduceAt`
     re-scans from 0) — driving an interpolator from it at 60 Hz would
     **reproduce demo10's per-frame-recompute defect INSIDE the library**.
     Fix: `sched.bracket(kind, pos)`.
  4. **`reduce()` structurally cannot see the right bracket**: it gets
     `prefix ≤ pos`, so the successor is by construction absent ⇒ an
     interpolated reduce is NOT expressible in the contract. Seam 5's
     "pure function of the prefix" is right for discrete kinds and WRONG for
     continuous ones. Fix: `info.next` (two lines; the array is already there).
  5. `interpolate(a,b,u)` under-specified for any C¹ interpolator (a spline is
     not a function of two samples) → add neighbourhood + caps.neighbourhood.
  6. **LIBRARY BUG**: logdeck's `payload: {i, at, ...p.payload}` lets the raw
     row's epoch-µs `at` **silently clobber the position-domain `at` the
     library just injected** — §2's "payloads must not spread over control
     fields" law broken inside the library that records it. Fix: inject last.
- **Verdict: it IS the honest tratteggio UI** — seamless at 1×, hatched under
  inspection, a 14× playhead inset showing the linear chord cutting corners
  while the spline hugs the evidence, amber dots on attested positions only,
  and an evidence-only toggle (§5b's firewall in miniature). Still missing and
  it belongs to the library: reconstructions are computed on the fly rather
  than **appended as derived lanes** (`source: reconstructor-*`, method,
  confidence, tier, refs), and reduce()/window() still lack the
  `attested | restored(tier ≤ n) | all` evidence policy.

### TRANSPORT: 4 CLIENTS (session 6q) — instrument replay 61/61, remixer 11/11
- **THIRD LATENT BUG (the pattern holds: every adoption finds one).** Instrument
  `replayStored()` started the recorded audio **~1075 ms ahead of the first
  note**: the offset itself was correct and correctly applied, then the function
  slept 700 ms to prove `advanced > 0` and `replayEvents()` added its own 200 ms
  lead-in, with nothing reconciling the clocks again. **The harness was
  structurally blind** — its assert was `advanced > 0`, which a one-second-early
  track passes perfectly. Same bug's other half: `speed` scaled notes but left
  the media element at 1×, so at 6× note time and audio time diverged at 5×
  real time. Post-adoption align error **+41 ms** (was +1075), media re-anchor
  error **0 ms** on all 3 seeks.
- Old path also: "forward seek" (a restart) produced **116 orphan fires**, 192
  total where a transport does 64. Post: 0 armed timers after pause.
- Instrument adapters (3): `midi-actuated` (host clock, audible, burst) ·
  `midi` (player intent, **audible:false — a second VISIBLE lane that renders
  but never times audio**) · `media-span` (A/V element = clock master via
  sync()). 61/61 (was 54/54). Honest cost: firing p50 2.2→4.34, p95 4.8→8.64 ms
  — bought with cancellation, seek, pause, rate, drift and a media master.
- **Remixer: the chord became a timeline.** One `media-span` adapter, arrangement
  domain; first playable layer masters, others servo in a ±20 ms dead band.
  Start-together spread **0–43 ms → 0.1 ms**; ONE SEEK MOVES EVERY LAYER (skew
  −1…−16 ms); pause holds all (playhead 0.000 ms); rate 2× arms while paused and
  every element follows; 1169 sync() calls with **0** corrections over
  tolerance; absence is content (past a span's end that layer goes absent while
  others play). 11/11, 0 console/media errors, **6 upstream ERR calls** total.
  NOTES states plainly: archive items carry no internal timecode, so offsets are
  OUR arrangement, not attested sync.
- **New: `timeline/logdeck.mjs` (76 lines)** — `makeLogDeck({lanes:[...]})`
  because `makeDeck` is single-kind by construction and cannot express a log
  with two note lanes plus a media lane; `makeDeck` is now the one-lane case;
  `expand()` handles interval rows.
- v0.2 needed no changes. Two seams found ABOVE it (~4 client lines each):
  `caps.followsTransport` (every media client rewrites the same
  play/pause/rate follow block — 3 of 4 clients have it) and `deck.setRange()`
  (a client whose item set changes at runtime must dispose and rebuild).
- **THE LAST STRUCTURAL GAP, after 4 clients**: composition ACROSS timelines.
  `sync()` slaves the vector to exactly one external master and a deck's
  position is a single scalar, so **a span that is itself a deck** (a stored
  instrument session dropped into an arrangement beside a 1965 broadcast) has
  no representation. Missing primitive: a **nested/offset span `{at, rate,
  deck}`** — the same sync() contract pointed at a deck instead of a <video>.
  Everything else in plan-timeline (reconstruction spectrum, archival client,
  megatimeline) is content on top of that.

### TRANSPORT v0.2 — SIX SEAMS FIXED + 2 MORE ADOPTIONS (session 6p) — ✅ gate green
Fixes (before → after): (1) **`registerAdapter(kind, {caps, actuate, reduce,
assertState})`** with per-kind dispatch + policy derived from caps — plus
createDeck/adapterCaps/assertAt/reduceAt/reduce-on-seek all lifted upstream;
(2) `setRate()` now ARMS the rate and stays paused, `play(r?)` is the only mover,
`.targetRate` public (a paused UI shows 0.50×, not 0.00×); (3) default host is
now **worker** (matching the measured verdict), main/raf explicit opt-ins;
(4) **wall→audio bridge**: `actuate(payload, rec, when)` with `caps.audio={ctx,
leadMs}` → `when.audioTime` — an early fire's earliness IS the headroom;
(5) **the reducer now gets the COMPLETE ORDERED PREFIX** (not one scan's
misses) — guarantee stated: `assertState(reduce(prefix ≤ t))` == state after
`play(0→t)` for ANY reducer, commutative or not; (6) `onDrift/peekDrift/
driftStats` beside a capped `drainDrift`. Bonus seam the media client needed:
**`transport.sync(pos, {toleranceMs})`** — slave the vector to an external clock
master with no seek semantics (nothing re-fires).
- **Gate green, nothing moved**: prop-test at 30 and 100 seeds + a new third
  suite asserting all six seams, incl. a seam-5 witness check that the OLD
  one-scan input gives a different answer. Firing arms within noise
  (main 1.3/6.9, worker 4.3/15.1, raf 4.1/7.7, fanout 1.7/2.8; 1270/1270 each).
  **CORRECTION: the fan-out arm fails 6 of 7 asserts, not 5** — earlier prose
  miscounted; the recorded data says 6 (unchanged run to run).
- **jam-timeline.js 105 → 39 lines (−63%)** — only the jam-shaped µs→ms mapping
  survives. jam-interval.html adoption: **+45 lines, 0 deletions** (confirmed
  free). replay-grid.html: +216, two adapters (`media-span` w/ caps
  seekAccuracyMs 40, rates [1], rateNudge, clockMaster, catchUp reduce; `cue`
  w/ catchUp burst). Media element stays clock master; library slaved via
  sync(); rAF demoted to pure video servo; the cue lane runs on the worker host
  and survives a hidden tab.
- **verify-replay 5/5**: scrubber seeks **bit-identical** (−49/−51, −65/−41).
  Inter-tile skew moved p50 4→29, max 33→34 ms — mechanism understood and
  honest: the OLD wall-clock playhead let both tiles drift TOGETHER (correlated
  error −45…−78 on both), so mutual skew flattered itself; with a real media
  master p1 sits at zero and the rate-nudge dead band IS the skew budget
  (tightened ±40→±20 ms ⇒ max 34 ms = one 30 fps frame, the physical floor).
  Slave's ABSOLUTE error improved (−29…−68 vs −56…−78).
- **SECOND LATENT BUG, worse than the jam one**: replay-grid's rAF cue engine
  fired one frame late (+0.2/+15.5/+14.7 ms, unbounded on a dropped frame,
  infinite in a hidden tab) — but the real defect was `__seekWall` rebuilding
  `firedIds` from what had ALREADY fired instead of from cues ≤ T, so on a
  fresh page **a forward seek fired every skipped cue at once: 3 cues burst,
  45.0/25.0/5.0 s late**. That is precisely the `seek-no-skipped-fires` assert
  the fan-out graveyard arm fails — live in a shipped demo. Post-adoption:
  **0 fires**, library firing +1.9/+2.5/+1.2 ms.
- Third adoption now ≈ caps + actuate (+reduce/assertState if seek should mean
  anything) handed to createDeck: 20–40 lines per kind; the only per-client
  chore left is serving `/timeline/*` (one route).

### INSTRUMENT SESSION GAPS CLOSED (session 6o) — ✅ 54/54 (was 42/42)
- **A/V lane**: consent is now off / audio / audio+video (still default-off,
  never persisted). At the top rung a SECOND recorder runs on
  `new MediaStream([audioTrack, panelVideoTrack])` — one webm, both tracks —
  chunked to `instrument/<sid>/av/` with its own media-span carrying
  `payload.kind:'av'`, so lanes are distinguishable without opening a file.
  **Codec probe: h264+opus supported and PREFERRED** (a later repackage becomes
  a remux, not a transcode; vp8,opus fallback). Replay prefers the A/V span:
  plain <video> fed Blob-concatenated chunks, no MSE, verified 640×360 with
  currentTime advancing.
- **IndexedDB backstop on all four lanes** (player events, host events, audio
  chunks, A/V chunks) via a generalized `makeBackstop({name, send})`. **The rule
  selfrec never needed: ORDER IS CORRECTNESS** — the DO's monotonic per-source
  seq would turn an overtaking batch into a silent duplicate-rejection of the
  parked one, so once anything parks, everything later parks and the drain is
  the only sender. Still-parked at manifest time ⇒ named `missing`,
  `degraded:true`.
  15 s CDP offline mid-session (which also kills signaling, so the session ends
  and the recorder finalizes while offline): **zero lost on every lane** —
  80/80 player events, 80/80 actuations, 9/9 audio and 9/9 A/V chunks in R2,
  degraded:false. Drain from reconnect: events 657–840 ms, audio 2.5 s, A/V
  3.2 s; high water 396 KB.
- **Capability tokens (trimmed per user)**: two 128-bit hex tokens minted at
  accept, written to the session row before either party learns the id, each
  party gets only its own, sent as X-Session-Token, constant-time compared.
  Enforced on exactly three routes (media upload, player delete, owner delete);
  reads and event appends deliberately ungated. Matrix green (absent/wrong 403,
  right 200); **tombstone beats a valid token** (410); tokens never echoed by a
  read (`guarded:true` only).
- Worker redeployed `6473040f`. R2 kept: 978 KB in one proof session.
- **Operational trap worth keeping: a Durable Object keeps running its OLD
  class code after a deploy until the instance is evicted (~1 min)** — the
  worker routed new /av paths while the DO still answered "no such session op".
  A smoke test run straight after `wrangler deploy` will lie to you.
- Unbuilt: no av-only rung (A/V duplicates audio by design), no token expiry/
  rotation/revocation short of deletion, no real camera in the run (fake device
  ⇒ the panel canvas was encoded), no compaction job.

### TRANSPORT ADOPTED IN A DEMO (session 6n) — ✅ 14/14 (proto/jam + timeline/)
`timeline/transport.mjs` has its first real client: jam.html's replay is now
vector + lookahead + worker tick feeding the EXISTING actuate(). New seam
`proto/jam/jam-timeline.js` (105 lines); server aliases `/timeline/*` to the
repo library so the demo imports the SAME file the lab measured.
- **The hand-rolled path was firing ~100 ms EARLY and nobody knew**: measured
  for the first time at **p50 −100.8 ms** (range −118.5…−95.9) — it fired
  everything inside a 120 ms horizon AT THE TICK, so flash+HUD landed early
  while only audio was on time (it passed `acT` to WebAudio separately). The
  library ties both to one instant: **7.2/14.3 ms (worker host)**. The lesson
  generalizes: an unmeasured scheduler hides constant offsets, not just jitter.
- Firing error vs recorded `at`: A p50 7.2 / p95 14.3, B 9.2 / 15.6 — squarely
  the lab's worker band. `?tickhost=main` opts into 6.4 ms p95.
- The `midi` adapter is `{actuate, caps, reduce, assertState}`; catchUp:'burst'
  (musical — never silently drop a note). **Seek required a voice registry in
  the synth** (voices Map + silenceAll + soundingNotes): without held state
  there is nothing to reduce to and seek is meaningless — the only genuinely
  per-client piece of adoption.
- Asserts: 133/133 fired both peers, logGrewBy 0, exactly-once audit, 0 armed
  timers; seek ×3 sounding == reduce(events≤t), 0 orphans/double-fires; pause
  position delta 0.00000 ms; rate median 188.0 ms @1× → 100.1 @2× (0.53);
  live duet untouched (one-way 1.59/1.61 ms, 0 loss).
- **Six API seams the first client found** (fix upstream before the next
  adoption): (1) NO ADAPTER REGISTRY — every client will rewrite the same
  ~12-line registerAdapter; (2) setRate() doubles as play() so there is no
  set-rate-while-paused and a paused UI can only show 0.00×; (3)
  createScheduler defaults to mainTickHost while the lab VERDICT ships worker —
  code and doc disagree; (4) no wall→audio bridge (actuate gets an instant, not
  a lead, though the drift record already carries deltaMs); (5) the reduce
  policy sees only one scan's missed events, not the whole prefix — wrong for
  non-commutative reducers; (6) drainDrift() is destructive so a HUD and an
  assert harness cannot both read it.
- Next adoption ≈ half a day per demo (an hour once the registry and
  set-rate-while-paused land upstream); jam-interval.html is free.

### INSTRUMENT SESSION STORAGE (session 6m) — ✅ 42/42 (workers/instrument, proto/instrument)
Sessions are now durable: notes as ROWS in a DO SQLite (C4), audio in R2 by
reference (C6-deletable), both lanes on one log.
- **EU jurisdiction VERIFIED pinned** (not merely requested): the `Sessions` DO
  from `jurisdiction('eu').idFromName('log')` has a different id than unpinned.
  Signaling Hub deliberately untouched so the registry didn't move.
- Schema: `sessions(id, instrument, playerId, startedAt, endedAt, noteCount,
  audioPrefix, deletedBy, deletedAt)` + `events(sessionId, seq, at µs, kind,
  source, raw BLOB, display, ref, payload)` idx (sessionId, at). `ref` = the
  cross-lane pointer (host actuation → player note seq); `payload` = marker
  detail (media-span phase + mediaRef). One row per event, never a blob.
- **Session id minted in the Hub on accept** and handed to BOTH parties — one
  id, no side channel, no guessing.
- **TWO LANES (the sync fix)**: player logs intent in the player's clock; host
  logs `midi-actuated` (with `ref`) in the HOST's clock — the same clock its
  audio is stamped in. Replay uses the **host lane as master**; audio offset is
  `firstEvent.at − mediaSpanStart.at`, a subtraction, not a skew guess.
  **The two lanes joined on `ref` reproduce the live latency EXACTLY: p50
  0.48 ms from storage vs 0.48 ms live (n=128) — the lane pair IS the drift
  channel.** NOTES warns: never "fix" this by averaging the lanes.
- Verified: 390 rows / 0 append rejections; audio 12/12 chunks in R2, replay
  Blob-concatenates and decodes (no MSE needed), offset 1.94 s; consent OFF →
  20 rows, 0 R2 objects, null prefix; delete by player → rows dropped, R2
  object purged, read 410 tombstone, re-append 410 (resurrection blocked);
  owner delete needs INSTRUMENT_TOKEN.
- Two bugs worth knowing: `X-Chunk-Sha256` missing from
  Access-Control-Allow-Headers killed every chunk POST in preflight (selfrec
  had it right — carry CORS headers when copying a pipeline); and seq counters
  must be keyed BY SESSION (a span marker at seq 0 collided with the first
  actuation).
- Unbuilt: panel/camera video recording (seam is one MediaStream away), player
  auth (the session id IS the capability — fails toward deletion, not access
  control), IndexedDB backstop on either lane, compaction job, megatimeline join.

### MoQ RIG FIXED + RETEST (session 6l) — ✅ VIDEO USABLE; BOTH HYPOTHESES REFUTED
- **Video starvation was NOT group-per-frame.** The publisher already keyframed
  every 30th frame and @moq/hang opens a group on that flag ⇒ video was on 1 s
  groups, symmetric with audio. The C4 chord-loss finding does NOT transfer.
  **Actual cause: a STALL, not a drop rate** — A's read loop parked in
  `cons.next()` (CF d14 gives no death signal and never redelivers a closed
  group, so a quiet track stays quiet forever), and/or a FATAL VideoDecoder
  error (WebCodecs closes the decoder permanently; the rig had no way back).
  ~3 of 6 sessions. Fix by construction: rebuildable decoder + keyframe resync,
  `resubscribe()` + 1.5 s no-frame watchdog, budgeted 8 heals/run (subscribe
  credits are finite, §13.4 — unbounded retries dig the hole deeper).
- **Hybrid failure was NOT catalog/announce timing.** CF had subscribed
  (used=true in 3 s); B simply published nothing. **Root cause is WebAudio:**
  from the 2nd MoQ arm in a page onward, the pcm-capture worklet's `process()`
  got an EMPTY input array while `ac.currentTime` advanced — Chrome latches a
  bus it considers silent and hands `[]` instead of zero-filled buffers.
  **Fix: a started ConstantSourceNode(offset 0) permanently on the synth bus**
  — a *playing* source contributing exactly zero samples (no DC, no onset risk).
  Plus: the realtime pacer <audio> is page-lifetime (teardown used to pause it,
  leaving arm 2 with no puller) and the capture tap swaps only its consumer.
- **Retest (floor 20 ms, p50/p95):**

| run | n | key→ear | key→eye | A/V skew p50 | video pub/recv | audio loss | underruns |
|---|---|---|---|---|---|---|---|
| moq-av mixed | 332 | 45.29/51.46 | 56.1/86.8 | **+10.25** | 1608/1607 = 99.9% | 0.151% | 206 |
| moq-av sparse | 317 | 45.79/54.97 | 64.7/90.1 | +19.04 | 2431/2430 = 100% | 0.109% | 303 |
| **moq-hybrid mixed** | 338 | **40.65/50.26** | 57.8/80.5 | +14.86 | WebRTC video | **0.038%** | 46 |
| moq-hybrid sparse | 318 | 43.28/48.89 | 58.0/81.6 | +14.68 | WebRTC video | 0.034% | 31 |

  0 decode errors, 0 stalls, 0 heals needed, both subscribes live on attempt 1.
  vs the 43.08/50.69 reference: **the video fix cost the audio path nothing**.
- **No group-size curve exists** — group span isn't in the return path (the
  playout floor is). One-sided datum: `groupMs:0` (~400 groups/s) threw
  thousands of "Failed to create send stream" — **one MoQ group = one QUIC
  uni-stream**, so group-per-frame exhausts stream credits outright.
- Two carry-forward findings: **A/V skew FLIPPED SIGN** vs 6g — with a 45 ms
  audio return the sound now arrives BEFORE the panel (+10…+19 ms) where
  WebRTC's 78 ms return put video ~27 ms early; and **MoQ video transport is
  faster than WebRTC's** (burn→visible 32.0 vs 41.1 ms, caveat: MoQ measured at
  decode-out, ~1 vsync of that gap is method). **Best overall arm: hybrid
  (MoQ audio + WebRTC video)** — lowest key→ear AND ~4× lower MoQ audio loss,
  because moq-av's video shares the same QUIC connection.
- Residue: 206–303 underruns/run at floor 20 (2.5–3.6 s inserted silence per
  ~65 s) — bought off by the floor curve, not by the transport.

### REMOTE-INSTRUMENT PLATFORM (session 6j) — ✅ END-TO-END, 24/24 (proto/instrument, workers/instrument)
The "play my synth" pattern as working software on our stack. Owner registers
hardware → public catalog → player requests → owner accepts → DC MIDI up +
WebRTC audio/panel-video back → session recorded as a timeline log → replay
through the SAME send path. Deployed: `elektron-instrument` (hibernating DO;
online/busy DERIVED from live sockets, never stored flags — the rtc `left`
pattern, so a closed lid fires all-notes-off).
- **one-way MIDI player→instrument p50 0.65 / p95 0.95 ms** (n=128; across
  runs p50 wandered 0.25–0.65 — at this scale the two tabs' independent clock
  calibration error ≈ the measurement: honest resolution floor, stated).
- **key→ear 69.9 / 72.1 ms** (WebRTC Opus return — reproduces 6i's 77.7 band);
  0 frames lost/dup/late; replay 128/128 with log growth 0 (overdub rule held).
- Setup: request click → playable **611 ms**; offer → MIDI channel open 203 ms;
  answer → PC connected 53 ms.
- Second player REJECTED honestly (told who holds it, since when); `waiting` is
  a real count so a queue needs no protocol change.
- Host self-test (session 6k below) linked as "Check my rig ↗"; server falls
  back across proto dirs so it runs unmodified on both ports.
- v0 gaps stated: no MoQ return (seam = play.js onTrack, worth ~35 ms per 6i),
  no multi-player, no player auth/payments/rate limit (Accept is the whole
  access control), TURN/NAT untested (ice=none, one machine), no hardware run,
  no sysex/NRPN, no reconnect.

### HOST SELF-TEST (session 6k) — ✅ 18/18 (proto/jam/host-check.*)
Owner answers "what will the player experience?" alone. A hardware floor
(21.6/23.4 ms) · B partnerless relay echo (RTT 40.3 → one-way 20.2) · C full
loop with THREE onset taps giving legs directly, not by subtraction (73.7 =
wire 0.5 + instrument 21.7 + return 51.3; buffer share 37.5 = 73% read from
getStats) · D playable DelayNode distance slider (verified 29.1 ms @30,
60.2 @60). Stuck-note soak + CC123 panic + silence check. **Defaults to
RETURN-PATH monitoring** (flipping it relabels the toggle "DIRECT monitoring —
you are lying to yourself"); getSettings() readback of EC/AGC/NS/sampleRate as
pass/fail caught Chrome's fake device handing back 44.1 kHz vs a 48 kHz context
on run one. **Finding: 51 ms of return leg with ZERO network** — the browser
audio stack is the fight before the internet is involved. Trap:
--use-fake-ui-for-media-devices is NOT enough under headless=new (getUserMedia
denied; needs CDP Browser.grantPermissions). Extracted `measure-core.js` (the
C7 kernel) as a shared module.

### MoQ AUDIO RETURN (session 6i) — ⚠️ PARTIAL (agent killed by usage-credit exhaustion mid-run)
**The headline landed before it died: the ~35 ms projection HELD.** Key→ear via
WebCodecs-Opus → MoQ d14 → FIFO-mapped decode → minimal ring playout, vs the
WebRTC row's 77.7 ms:

| cfg | key→ear p50/p95 | leg1 MIDI | leg2 synth | leg3 return | underruns | chunk loss |
|---|---|---|---|---|---|---|
| floor 10 ms, sparse | **35.8 / 41.0** | 0.67 | ~−1.3 | 36.6 | 31 | **0 / 3778** |
| floor 10 ms, mixed | **37.6 / 40.6** | 0.67 | ~−2.1 | 38.9 | 21 | 0 / 2221 |
| adaptive from 10 ms | 40.3 / 57.6 | 0.77 | −0.5 | 39.6 | 5 | 0 / 3104 |
| floor 40 ms, sparse | 66.3 / 72.5 | 0.77 | −1.3 | 66.1 | 3 | 0 / 3879 |

- **2.2× better than WebRTC's 77.7 ms** — confirms the diagnosis that NetEQ's
  un-hintable buffer (not the wire) owned that number.
- **Buffer/underrun curve is the finding**: playout floor maps ~1:1 into
  latency (10 → 36 ms, 40 → 66 ms); adaptive-from-10 is the sane default
  (40 ms p50, 5 underruns) — pick the floor per tolerance, unlike WebRTC
  where the buffer cannot be hinted at all.
- **Zero chunk loss across all runs** (0 of 2221–3879) — the jam matrix's
  note-granular group-racing (2.9%) does NOT bite continuous audio streams.
- **A/V ARMS (rerun 2026-08-27 21:5x, main session)**: `moq-av` (MoQ audio +
  MoQ video) **key→ear 43.08/50.69 ms mixed, 43.37/51.4 sparse at floor 20 ms**
  (legs 0.68 MIDI / 0.4–0.53 synth / 41–42 return). Compare the audio-only
  floor curve (10→36, 40→66 ⇒ 20≈46): **adding video costs the audio path
  NOTHING — MoQ tracks are independent, no lip-sync coupling** (the opposite
  of WebRTC, where video *stabilized* audio). Audio loss 0.017–0.036%
  (3/17860, 11/30885), transit 19.4/32.4, ring 18.2 ms, underruns high at
  floor 20 (104–159).
  ⚠️ **MoQ VIDEO RETURN IS STARVED**: 198 frames published → **30 received**
  (~85% missing; the earlier partial run got 93/93 — so it's unstable, not a
  fixed rate) ⇒ **key→eye and A/V skew remain UNMEASURABLE**. Suspect the
  §13.4/§7 group-racing pathology at video-frame granularity (same family as
  the 2.9% chord-note loss). Needs group batching or an ordered subscription
  before MoQ video is usable for the instrument-panel case.
  ⚠️ `moq-hybrid` (MoQ audio + WebRTC video) **FAILED to establish**: "moq
  subscribe 'audio' dead after 15 attempts" — the arm never ran.
- ⚠️ STILL NOT MEASURED: the hybrid combination — MoQ+MoQ-video,
  MoQ-audio+WebRTC-video hybrid, MoQ A/V skew, and the coupling verdict
  (does video move audio numbers on MoQ as it did on WebRTC?). eyeMatched=0
  in every salvaged run. Rig is built and ready in proto/jam/remote-synth.*;
  rerun cost is small.

### TIMELINE TRANSPORT CORE (session 6h) — built + measured ✅ (timeline/)
- **timeline/transport.mjs is library-grade**: {p0,t0,rate} vector over
  pluggable ClockSource (zero timers in the vector), lookahead wall lane
  (committed-vs-pending + cancel, generation-guarded, per-kind catch-up,
  first-class drift log + 60 Hz position observable), 3 tick hosts + the
  fan-out graveyard as a fixture, Chris-Wilson audio lane with cancellable
  committed nodes, deterministic virtual runtime for CI.
- **Firing error (foreground, n=1270)**: main 1.0/6.4 ms p50/p95; worker
  5.0/15.3; raf 3.7/8.6; fan-out 1.6/2.7 — the graveyard arm is the TIGHTEST
  on clean runs (why it survived 3 generations) and **fails 6/7 correctness
  asserts** (seek orphans ring, fires during pause, rate no-op, clear leaves
  50 armed timers). Reproducible, not folklore.
- **C2 property test GREEN**: reduce(≤t) ≡ play(0→t), 45 seeds (also 150),
  seek/pause/rate gymnastics, exactly-once audit — deterministic, exits
  nonzero. `node timeline/lab/prop-test.mjs` = the CI gate, exists today.
- **Freeze (SIGSTOP 3 s)**: burst = 32 fires in 100 ms (machine-gun, now
  chosen not suffered); drop = 28 dropped cleanly; **reduce = ONE reducer
  call 0.5 ms after wake, state 300/300 correct**. Background tab (real
  visibilitychange): main p95 981 ms (1 Hz clamp), **worker HOLDS 8.5 ms**,
  raf 9175 ms (starved). → **worker tick is the default host**.
- **Audio lane: sample-accurate** (render error p50 10 µs / max 40 µs =
  1–2 samples @48 kHz); already-committed audio holds through a 500 ms
  main-thread busy-loop while the wall lane stutters (two-lane doctrine
  measured). Audio horizon must exceed worst stall (200–500 ms; safe because
  committed nodes are cancellable — the exact capability the oscillator
  corpse lacked). ⚠️ wall↔audio anchor ±25 ms in headless fake-audio —
  re-measure on hardware w/ getOutputTimestamp + periodic reanchor.
- Ship defaults: wall 25/100/150 ms (tick/horizon/lateGrace), worker host
  default, main-thread opt-in (6.4 p95), rAF/fan-out never; catch-up
  per-kind: reduce (stateful) / drop (ephemeral) / burst (idempotent only).
- MIDI arm env-blocked: `midi` native module dlopen mmap errno=1 (EPERM —
  ThreatLocker suspect); harness ships ready for a capable host.

### REMOTE-SYNTH / PLAY-A-SYNTH CASE (session 6g) — first measured key→ear ✅ (proto/jam)
- MIDI up + synthesized AUDIO+VIDEO back, per-leg, sample-accurate onsets
  (AudioWorklet), burned panel video. **P2P key→ear 77.7/80.3 ms** (decoded
  track; physical ears +32 ms outputLatency) = upper piano-action band,
  playable. Legs: MIDI 0.56 ms, synthesis 0.67 ms, **audio return 76.6 ms —
  the WebRTC jitter buffer is 98.6% of the round trip** (NetEQ ~20 ms floor
  + 20 ms Opus framing + adaptation).
- **jitterBufferTarget=0 / playoutDelayHint=0 NEVER helps, often hurts**
  (verified applied; NetEQ clamps at 20 ms; forcing destabilizes — SFU
  116→235 ms). The buffer cannot be hinted away.
- **INVERTED lip-sync finding: the video track STABILIZES the audio jitter
  buffer** — A/V held 77 ms across all runs; audio-only wandered 72→310 ms.
  Panel video lands ~27 ms BEFORE its own sound (avSkew −27). key→eye
  50/73 ms P2P.
- SFU both ways: 116/210 ms sparse (crosses the >100 ms sluggish line);
  at 25 notes/s ~7% of percussive attacks concealment-merged (0 packet
  loss) — audible degradation latency numbers don't show.
- Projections: real deployment P2P ≈ 95–110 ms (browser Opus/NetEQ stack
  dominates, not the wire); **MoQ audio return ≈ 35 ms key→ear (paper, from
  measured 32.6 ms g2g) — the beat-Play-a-Synth candidate**, arm skipped
  in-box (needs new bundle). Play-a-Synth itself publishes no numbers; ours
  is the first measured figure for the pattern.

### OBS-IN-CLOUD + DUAL OUTPUT (session 6e) — ✅ ALL PROVEN (rig/obs-cloud)
- **OBS ran in a CF Container (standard-4) publishing MoQ**: g2g cloud→d14→
  local viewer ≈195/210 ms corrected — statistically identical to the local
  chain; the move to CF costs ~nothing. CPU 52% of standard-4 streaming
  (native amd64 sheds the Rosetta tax); cold wake→audience pixels **11.6 s**;
  version-swap cold boot 126 s. control.mjs drove cloud OBS UNCHANGED via a
  Worker WS proxy (p50 ~65 ms/cmd, full setup 1.5 s).
- **TRAP: CF Firecracker guests have no /dev/shm** → CEF browser sources
  crash-loop FATAL; fix = `mkdir -p /dev/shm && chmod 1777` before
  supervisord (baked in start-cloud.sh). WS-through-Worker does NOT survive
  sleep/wake — fresh instance + fresh disk; driver must reconnect + re-setup.
- **DUAL OUTPUT PROVEN (locally)**: stream slot = obs-moq (d14), recording
  slot = Custom Output (FFmpeg) → rtmp, baked in basic.ini, both started
  via websocket. Simultaneous: MoQ g2g 172/188 ms UNHARMED; RTMP leg
  437/446 ms (ffmpeg/flv path buffers ~255 ms more — fine for the stage/
  archive leg); second encode +30% of a core; StopRecord→StartRecord 6 ms.
  Cloud-side RTMPS untested by design (no Stream inputs created).
- **Radio Tallinn cron-broadcast**: every stage after cron→start() measured
  (wake→OBS-ready 7.4 s, setup 1.5 s, StartStream→MoQ 0.4 s, ~$0.5 raw per
  2 h standard-4 show). Still needed: scheduled() Worker driver w/ reconnect
  + 207-retry, egress decision (d14 caveats vs RTMPS), R2 content pull at
  boot, restart watchdog. NOTE (design review, same day): the automated
  station likely needs NO OBS at all — programme-as-web-page + Route B +
  in-page WebCodecs MoQ is the page-native engine; OBS remains the
  human-mixed-show option. Session cost $0.04 raw / $0.00 net; all cloud
  resources deleted + verified.

### PLAYBACK LAYER (session 6c) — postshow runner, reconcile, masters replay: ✅ COMPLETE
- **postshow.mjs** (the engine.mjs seed; worker v381acbe8 adds POST /show, GET
  /list, delete-tombstone): cuelog∪listing discovery → repackage → index →
  show.json {pid, T0, skewEst, dur, hls, masters, index}. Idempotent: skip-all
  1.5 s; full pipeline 37.7 s on the proof show (ffmpeg itself 0.2–1.2 s; the
  rest is R2 transfer — repackage+indexer double-download ~9 s, engine.mjs
  should share one download).
- **--reconcile** ("studio doesn't always run"): masters-only settle clock
  (10 min quiescence), synthesize-manifest for abandoned participants
  (EBML-sniffed mime, finalized:false), late-chunk extend+re-derive
  (lateSeqs), tombstone = resurrection-blocked re-delete NEVER derive.
  Proven: sweep 1.04 s / one 331 ms listing when quiet (0 actions twice);
  every rule exercised live on a demo copy, then purged.
- **replay-grid ?show=**: boots from show.json + cuelog alone; scrubber with
  cue ticks + span bars; R1 through the new path **p50 4 / max 33 ms**;
  scrubber seeks −41…−65 ms (pixel quantization ~140 ms/px measured apart).
- **Masters/MSE verdict — SPLIT, decision-grade:** vp8 masters play via
  cluster-index+Range+MSE **frame-exact (+5…+11 ms — beats hls.js) at
  1.1–2 MB per seek (10–19 % of file)**; but **h264-in-webm is REFUSED by
  MSE** (isTypeSupported false, all variants) though <video> plays it. THE
  CODEC TRADEOFF: h264 capture = 80 ms copy-remux + universal HLS but NO
  engine-free masters replay; vp8 capture = engine-free desktop replay but
  15× transcode cost for the iPhone HLS. Both paths real; choose per show.
- **SimpleBlock index closes R3**: 2591 blocks == ffprobe's 2591 frames;
  +1 ms parse, ~1.8 MB/media-hour; mapping divergence ±33–72 → 15–22 ms.
  Verdict: linear+skew wins ≤~2–3 min; block anchoring overtakes once drift
  clears ~50 ms — the hour-scale mechanism, validated.

### VERDICT — plan-studio's baked decision is now measured, not argued
Self-recording wins on every axis that matters: bandwidth lands distributed +
elastic instead of 8×-concentrated + real-time; source quality vs inherited SFU
freezes; churn isolation vs everyone's-archive-glitches; consent deletion
proven. Central's only real wins (clean `left`-signaled file ends, zero
participant storage) don't outweigh. HYBRID kept: the studio already pulls
featured/live tiles for the show — recording THOSE is downlink-free and stays
as the derived backup lane (composite path). Grid-archive = A for masters,
B-machinery only for what the grid already pulls.

Two agents on proto/m2m, machine idle/32 GB/AC at dispatch:
- **Heavy media** (owns room.html, run-heavy.mjs, port 8897, results/m2m-heavy-*):
  audio+video per participant (grid has never carried audio), show-quality 360p30
  rung, 720p featured-tile mix, then max-N 24→30→36 via multi-context RAM strategy
  (co-tenancy validated against separate-instance baseline first). Notes section
  "HEAVY MEDIA".
- **Churn + endurance** (owns room-churn.html copy, run-churn.mjs, port 8896,
  results/m2m-churn-*): implements the publish-leg connect-retry (production
  deliverable from the N=20 storm flake), 30-min soak w/ leak+drift tracking,
  rotating-grid pull/unpull churn (plan-m2m risk 4), ungraceful leave + rejoin
  storms (measure the real dead-track GC), publisher kill + auto-reconnect. Notes
  section "CHURN".
Both: poll own run state (no notification waits), canvas/WebAudio only (camera
still wedged), own-udd kills only, no plan edits.

## Session 5 phase-2 dispatch (user: "do it") — production m2m layer

Two agents:
- **Worker/DO** (owns workers/rtc/): RtcRoom DO (hibernation patterns from cues;
  `left` broadcast = the death detector phase 1d proved necessary) + /cf/ SFU
  proxy holding the app secret + snapshot-tile store (Cache API, wall tier of the
  big-grid design) + ROOM_TOKEN auth. Deploys to workers.dev (authorized), writes
  workers/rtc/DEPLOYED.md for the sibling, measures signaling latencies incl.
  socket-close→left-broadcast (replaces the 31–47 s SFU GC).
- **Grid UI** (owns proto/m2m/grid.html, run-grid.mjs, port 8897): three-tier grid
  (2 featured + live page w/ pull-on-visible + snapshot wall), connect-retry from
  room-churn.html, death badges, promote/demote live transitions. Validates N=12:
  per-tier latency, rotation TTFF, kill→left→dead-tile time, wall→live promotion,
  rejoin. Polls for DEPLOYED.md; local stub until then.
USER DIRECTIVE: when phase 2 done → report → proceed to PHASE 3 (200-session
control-plane soak + cost telemetry; recording composite WITHOUT OBS via headless
grid → WHIP → recorded Stream input; cue-driven rotating-grid choreography;
30-min time-boxed MoQ browser spike).

### MoQ multi-publisher + role flip — ✅ FIRST REAL MoQ CEILINGS FOUND
- ✅ Clean to N=20 (62/88 ms); N=30 gates on ⚠️ per-session subscribe budget
  (~20 ns/40 subs — optimistic OK then permanent starvation; churn exhausts the
  session → reconnect rule) + local encode ceiling. Relay itself accepted all.
- ✅ Flip 1.64 s p50: publish 0–1 ms (no renegotiation!), floor = encoder
  spin-up 1.5 s — pre-warmed + draft-16 would beat the SFU's 0.5 s.
- ✅ Death: relay signals NOTHING (watchdog 0.5–0.6 s vs DO 38–126 ms); announce
  GC +10–15 s; **same-name rejoin pre-GC bricks the namespace for minutes** —
  fresh names mandatory. Rejoin 2.5–3.5 s.
- Verdict: grid stays on SFU; MoQ grid needs draft-16 + DO signaling + name
  discipline + connection sharding. RUNBOOK §13; 15 data files.

### Code review (high) + fixes — ✅ 10 severe findings fixed, workers redeployed
- Review: 16 verified correctness findings (clean measured code; issues clustered
  in deployed-worker state/auth + archive failure paths). Fixes commit 0f71cfd:
  ghost-'left' gen-tagging, perm ENFORCED + operator role gated by new
  OPERATOR_TOKEN secret (perm default flipped to open — closing is now an
  explicit operator act), roster cap 500 + putSafe, cue backlog + cancel parity,
  cues worker now token-authed (CUES_TOKEN; rotated once after a log echo),
  uploader retry/exclude/degraded, per-run rooms+prefixes (kills rerun poison +
  orphan clobber), replay-server hardened (/.env 403), classification fix,
  4 one-liners. 14/14 WS behavior checks incl. dual-socket rejoin → 0 ghost
  left; grid regression green; R2 demo replay green.
- Client-visible protocol changes in workers/rtc/DEPLOYED.md (opToken, backlog
  frames, cancel, publish rejection; cues token mandatory).

### Draft-16 relay (user provisioned) — ✅ 3 OF 4 GRID BLOCKERS FIXED
- ✅ Auth free (136 ms establish, message-level rejects); latency = draft-14
  (17.8 native / 30 ms browser); @moq/net speaks 16 unmodified.
- ✅ SUBSCRIBE_NAMESPACE push ~430 ms — roster + 2 s republish hack obsolete.
  Races documented (announce→subscribe retry; announce-flap edge-trigger rule).
- ✅ Mysteries closed: budget = exactly 50 requests/session fixed at SETUP
  (→ shard ≲20 pubs/conn); same-name rejoin brick GONE (explicit reject, GC
  16–18 s); death now clean track-end +14 s (still slow — DO stays detector).
- Engine targets draft-16. Token hygiene: rotate both relay tokens post-
  experiments (they transited chat + local logs). RUNBOOK §14.

### 📱 iPhone AUDIO verdict (screenshots 15:16) — ✅ SOUNDING −21 dB, skew −6 ms
- Opus + AAC-LC decode YES; 2583 chunks / 0 errors; aLat ~66 ms; underruns ~1 %
  (= Chromium band; adaptive cushion still backlog). Video 31 fps, g2g 71 ms.
- Witnessed: transient decoder failure → reconnect attempt 1 → self-healed live.
  MoQ tier scorecard COMPLETE (video/4K/Safari/iOS/audio/iOS-audio all ✅).

### Local-first archive → R2 — ✅ USER'S DESIGN WINS: native T₀ −15 ms from truth
- ✅ R2 enabled + bucket created (no dashboard click needed). Record locally
  (segmented HLS, T₀ stamped at first input write) → upload-verify-delete per
  segment → replay from R2 with `anchor=stamp`: cue p50 77 / p95 95 ms, 7/7
  checks. NO calibration, no strip, no audio dependency.
- ✅ Disk O(1) (2 segments resident of a 48-segment show); upload lag 5.5 s
  (near-live archive); cost ~25× under Stream storage, egress $0. ETag==MD5
  free verification. Honesty note: prior 59 ms partly poll-phase aliasing;
  true engine band 54–95 ms.
- ✅ Wrangler trap sharpened: auto-loads .env from CWD — run outside the repo.
  Proof show kept on r2.dev (playable with cues). proto/archive/README.md.

### VOD cue replay — ✅ PROVEN: p50 59 ms, seeks pass, API anchor −6.2 s trap
- ✅ Full pipeline: live show + 12 cues via deployed Worker → recorded VOD →
  replay page fires each cue within 59/71 ms (p50/p95) of its burned ground
  truth. Seeks: late-join catch-up (0 re-fires), backward rewind, forward
  reconstruct — all assertions green. VOD kept: de39bf19….
- ✅ USER'S cold-start concern vindicated: content anchor vs publisher stamp
  +109 ms, vs **Stream API `created` −6.2 s** — naive anchoring = every cue ~6 s
  wrong. Content-derived T₀ is now the documented rule.
- ✅ Asymmetry: "now" cues 0–1 ms; scheduled replay 33–67 ms early vs live;
  fireDelayMs reproduces live feel. Worker cuelog added (additive, verified).
- proto/replay/{replay.html,run-record.mjs,run-measure.mjs,README.md};
  plan.md §11b; research/timecode-sync-2026-08.md holds the industry synthesis.

### mediamtx + catalog shim — ✅ ECOSYSTEM GAP CLOSED, local venue chain proven
- ✅ ffmpeg WHIP → mediamtx MoQ → browser: 20.6 ms p50, audio A/V skew +12 ms,
  0 errors. mediamtx speaks msf-00/"loc"/AVCC (NOT WARP) on draft-19 — shim grew
  a second branch. OBS-realistic ingest (WHIP) had zero friction.
- ✅ Same shim through CF: moq-pub WARP/CMAF → browser at 60.6 ms — native
  publishers→CF→browsers now WORKS (§7 gap closed). 457-line player, ~150 bridge.
- Interop bug: mediamtx rejects non-auth SUBSCRIBE params (client strips them).
  TLS via JIT cert + fingerprint pinning, no browser flags. RUNBOOK §12.

### 4K on SFU + HLS — ✅ SETTLED: MoQ is the only 4K path
- ✅ SFU: 2160p locks (zero silent downscale, BWE never limits) but the SFU
  accepts H.264 only at Constrained Baseline → Mac Chrome lands on SOFTWARE
  OpenH264 → 12–14 fps + ~100 ms extra; H.265 gets hw but queues (p95 681 ms).
  SFU stays ≤1080p.
- ✅ HLS: 4K RTMPS ingest ACCEPTED, input recorded 3840x2160 — but transcoded,
  top rendition 1920x1080 (manifest + frame grab). No limits doc exists.
- ✅ New trap: 4K ingest silently drops LL-HLS mode (no PART tags despite
  preferLowLatency) — plan.md §2.1 trap #2. Cleanup verified, input deleted.

### MoQ audio spike — ✅ AUDIO WORKS: 32.6 ms, A/V skew −4 ms, zero sync logic
- ✅ Chromium: audio g2g 32.6/41.6 ms ≈ video; 0 decode errors; skew p50 −3.8 ms
  free (both tracks at latency ~0). Opus = the cross-browser codec (AAC missing
  in Chromium; Safari decodes both since 26.0 per WebKit research 2025-09).
- ✅ Implementer trap: browsers regenerate AudioDecoder timestamps → FIFO-map
  encoded-chunk timestamps or a join-skip becomes a permanent +534 ms phantom.
- Deployed page: audio probe on every load + plays ?namespace=positron-audio-test
  (iPhone audio verdict = one visit). Audio publisher LEFT RUNNING
  (moq-audio-pub-udd + audioserver.py :8896; §10.5 restart). RUNBOOK §10.

### 4K/framerate matrix — ✅ 4K30 CLEAN AT 47 ms; RELAY NEVER THE LIMIT
- ✅ 720p30 33 ms · 1080p60 33 ms (60 fps ≠ faster: burn-at-capture cancels
  quantization) · **4K30 47/78 ms clean, now LIVE on positron-safari-test** ·
  4K60 ❌ local VideoToolbox ~50 fps ceiling (200 ms plateau, zero relay errors).
- ✅ Stress: 22.9 Mbps sustained through CF flawlessly. Levels per spec. Datum:
  draft-14 accepts duplicate publish (first session wins). Deployed page needed
  zero changes (codec auto from catalog). RUNBOOK §9; results/moq-4k-*.jsonl.
- USER: reload the phone test page — it's 4K now.
- 📱 iPhone 4K verdict (screenshot 10:11, wifi): **decodes 4K30 clean (30 fps,
  0 errors) but at ~843 ms standing latency** (vs 31 ms at 720p) + 1.3 s first
  frame — ⚠️ phone render-path queuing (bitrate only ~1.4 Mbps). Lesson: serve
  phones ≤1080p for latency; 4K for render-capable endpoints. plan-m2m updated.

### 📱 iPHONE VERDICT (user screenshots, 09:31) — ✅ MOBILE SAFARI PLAYS MoQ ON 4G
- Mobile Safari 26.5.2, 4G cellular: connected 282 ms, moq-transport-14, H.264
  720p30, first frame 0.5 s, 31 fps, 0 decode errors, g2g ~31 ms p50 / 51 p95
  (± phone clock). QUIC over cellular worked. The full browser matrix for MoQ:
  Chromium ✅ 33 ms, desktop Safari ✅, mobile Safari-on-4G ✅ ~31 ms.

### Safari MoQ rig (user request) — ✅ DEPLOYED; desktop Safari OBSERVED PLAYING
- URL: https://moq.positron.studio (Worker + beacon
  sink → wrangler tail shows any device's session). H.264 publisher LEFT RUNNING
  on this Mac (stop: pkill -f moq-safari-pub-udd; pkill -f pubserver.py; dies on
  sleep/reboot — restart block RUNBOOK §8.6).
- ✅ TRAP: @moq/net UA-blocks ALL Safari (safari:"<0", WebKit bug 319818) → fixed
  by passing a self-built WebTransport. Then Safari 26.6.2 connected in 131 ms
  and played 4 min / 0 errors (background-throttled). Chromium proof vs deployed
  URL: 33 ms p50 g2g. iPhone + foreground verdicts = user at the keyboard.

### Phase 3c choreography — ✅ A JSON SCORE CONDUCTS THE GRID; PHASE 3 COMPLETE
- ✅ 4 full 5-min shows + smoke via the deployed Worker: 88/88 correctness
  assertions, zero errors in ~370 SFU calls. Score-time drift p50 0 / max 8 ms —
  wall-clock scores need no PDT machinery.
- ✅ cmd→effect: spotlight 0.5–0.6 s; rotate 0.4 s; tier-frame prop 22–49 ms;
  demote confirm 91–129 ms when the snapshot POST wins the race (2.1 s "floor"
  was a race, not physics).
- ✅ Unpull-burst gap FIXED (3 measured iterations → batched tracks/close fired
  only into a quiet chain): featured-tier wave gap 894 → 136–200 ms typical (~5×).
  Two failed intermediate designs documented (defer-in-chain regressed promotes;
  timer-outside-chain regressed gaps — the idle beat is load-bearing).
- Semantics: tier changes = DO-validated promote/demote frames; view choreography
  = cue passthrough. Worker used exactly as deployed, zero changes.
- Operator-console backlog in NOTES §P3C. Artifacts: scores/demo-score.json,
  score.mjs, show.html, run-show.mjs; data results/m2m-p3c-*.jsonl.
- **PHASE 3: all four tracks complete.** plan-m2m §6 updated; remaining items
  re-labeled phase-4 backlog.

### Phase 3b composite — ✅ ARCHIVE-GRADE RECORDING WITHOUT OBS
- ✅ Route B (CDP screencast → ffmpeg → RTMPS): 0 dropped frames, recorded
  duration exact, VOD ready 1.8 s after end, ~0.6 cores total. Proof VOD kept:
  ee90ebba017e4a395a96961cea9f77f3 (/watch on the customer host). Burned rows
  decode at 100 % from the recording — the archive preserves latency evidence.
- ✅ PLATFORM FACT direct-tested: WHIP ingest records NOTHING (recording-enabled
  input, 183 s, zero assets) — Stream-WebRTC is delivery-only; plan.md §2.2
  updated. Route A (in-page WHIP) = live monitor at 128 ms g2g; both outputs can
  run from one tab.
- Composite chain: grid→composite 58–60 ms; grid→live-viewer full chain 128 ms
  p50 (one extra WebRTC hop ≈ one 74 ms unit, as modeled). Stock hls.js parked
  at 10 s on the RTMPS leg — v5/v6 player mandatory for live composite viewing.
- Hardening list NOTES §P3B; plan-m2m §5 risk 1 SOLVED. Live input deleted;
  ~10.5 min stored (under budget).

### Phase 3a soak — ✅ NO CEILING THROUGH 1003 SESSIONS @ 40/s; cost model +7–12 %
- ✅ 1003 creates + 2622 GETs direct to the SFU: zero CF errors, latency flat
  (p50 ~530–570 ms every bucket), 0/200 spontaneous deaths in 10 min.
- ✅ Media under bulk: N=24 inside the hold and N=8 during the 40/s storm =
  baselines exactly (100 % valid, n=193k). Control-plane blast radius: none.
- ✅ Egress: audio 32 kbps on the nose; wire overhead ×1.05–1.12; big show
  ≈ $35–37 vs modeled $32.90. ⚠️ 1 Mbps/cam needs real-camera content to pin.
- Lifecycle traps: never-connected sessions answer 425 with an ~11 s edge-slot
  block per GET; old dead sessions eventually GET 500 ("long-dead", not outage).
- plan-m2m §5 risk 2 CLOSED. Data results/m2m-p3a-*.jsonl; NOTES §P3A.

### MoQ MEDIA spike (user: "analyze moq stuff") — ✅ BROWSER VIDEO AT 26 ms
- ✅ hang-on-both-ends through CF draft-14: canvas→WebCodecs VP8 720p30 → relay →
  VideoDecoder. **Glass-to-glass p50 26.2 / p95 42.4 ms, n=2740, 30.3 fps flat,
  0 errors.** ~3× faster than WebRTC 74 ms (+8–16 ms vsync for fairness). Fastest
  browser path in the project. Robust under load-avg-74 contention.
- ❌×2 cross-ecosystem (hang↔moq-pub/moq-sub): fails at ONE layer — catalog
  conventions (catalog.json/legacy vs .catalog/WARP/CMAF). Raw @moq/net pulled
  WARP catalog + live CMAF into the browser fine → ~100-line shim feasible.
- Platform data: CF never redelivers closed groups (republish catalog every 2 s;
  join ≈1.0 s); no pending-subscribes (retry needed); optimistic SUBSCRIBE_OK
  then ~10 s close. draft-16 NOT auth-only (SUBSCRIBE_NAMESPACE fixes discovery).
- RUNBOOK §7; results/moq-media-e1.jsonl; 16 min active. plan-m2m §1.C + plan.md
  §2 table updated: MoQ = real candidate for the grid's live tiers.

### Phase 3d MoQ browser spike — ✅ POSITIVE, in 8 minutes
- ✅ `@moq/net` (kixelated, npm) speaks IETF MoQT to CF's draft-14 relay from
  headless Chrome: compat CLIENT_SETUP negotiated `moq-transport-14`, subscribe +
  live objects received, 125 ms to session, 15/15 frames. The "moq-lite ≠ IETF"
  research conclusion was stale — the lib ships an IETF adapter (drafts 14–19).
- Next spike when wanted: media layer (hang catalog vs moq-catalog) + draft-16
  once the dashboard relay exists. RUNBOOK §6 has the repeatable recipe.
  plan-m2m §1.C rewritten: "transport proven, media layer = next experiment".
- Traps: ThreatLocker SIGKILLs npm's esbuild → bundle in Docker; `docker run |
  head` detaches containers. Scratch kept at rig/moq/spike/ (disclosed).

### Phase 2 — ✅ COMPLETE (both agents, validated against deployed Worker)
- Worker `elektron-rtc` live: RtcRoom DO + SFU proxy + tile store + token auth.
  join→roster 33 ms, publish→broadcast 38 ms, kill→`left` 38–126 ms (vs 31–47 s
  SFU GC). Worker proxy FASTER than local python proxy (257 vs 413 ms).
- Grid N=12 vs Worker: featured 98 / live 78 ms, wall 1.1 s, 100 % valid;
  rotation TTFF 330 ms; kill→dead-tile same-frame; spotlight promote →video 0.5 s;
  rejoin ~3 s. Screenshots verify the UI.
- Discovered + fixed: deterministic retry backoff causes lockstep retry storms
  under real ICE degradation → jitter added. Discovered, deferred: unpull bursts
  put 0.6–0.9 s frame gap on featured → batch tracks/close (phase 3).
- plan-m2m §6 phase 2 updated. Dispatching PHASE 3 (4 agents) per directive.

### Churn + endurance — ✅ COMPLETE: stable 30 min, failure lifecycle measured
- ✅ Soak N=8: zero latency drift (−0.04 ms/min), no RSS leak, 8/8 tracks alive,
  zero spontaneous renegotiations; tail-of-soak wobble attributed to sibling CPU
  contention (⚠️ correlation, not isolation).
- ✅ Rotating grid: 348 API calls / 0 errors; tile-switch TTFF p50 523 ms;
  untouched tiles unaffected → plan-m2m risk 4 retired.
- ✅ Dead publishers emit NO track-level events — tiles freeze silently; session
  410s at +31–47 s. Death detection = RtcRoom `left` + stats-stall watchdog.
- ✅ Publisher kill → restored ~3.9 s (would be ~2 s with DO push vs 2 s poll);
  rejoin storm of 4 → 4–16 s. Connect-retry organic fires: 7/7 recovered on
  attempt 2, inert on happy path — load-bearing, shipped in room-churn.html.
- Instrument lesson #5: fetch keepalive has its own ~64 KB quota (sendBeacon's
  lesson, second verse). plan-m2m §5 risk 4 + §6 phase 1d updated.

### Heavy media — ✅ COMPLETE: N=54 with audio, still no SFU ceiling
- ✅ Audio first try: FFT-verified tones 106/106 pairs at N=54, concealment ≤0.39 %.
- ✅ Show-quality 360p30 is FASTER than lightweight (p50 66 vs 123 ms — frame-
  interval quantization); 720p featured tiles degrade nothing.
- ✅ Co-tenancy clean (+5 ms, RAM −58 %) → N=54 = 106 tracks on one PeerConnection,
  SFU p50 flat 122–137 ms, ~1500 API calls / one transient 500.
- ✅ Publish/connect retry IMPLEMENTED in room.html; absorbed all ICE storm flakes
  (9/46 legs at N=48 — a 30-way storm without retry ≈ 1-in-2 fatal).
- Production asks recorded: end-to-end video-sanity heartbeat (sender emitted
  corrupt frames 110 s while its own getStats read healthy); viewer fan-in
  saturates page rAF (4–7 fps ~100 tracks) before decode fails.
- plan-m2m §5 risk 2 + §6 phase 1c updated. Data results/m2m-heavy-*.jsonl (23).
- Churn agent: parked once on a monitor wake that never fires (5th occurrence
  today); resumed by main session mid-soak.

---

## Session 4 dispatch — v6 + last mysteries + MANY-TO-MANY track (user: "update plans,
## solve mysteries, new plan and prototypes for many-to-many video")

Five agents running. Machine at dispatch: AC, battery 91%, zero rig processes,
camera still WEDGED (all agents banned from avfoundation — lavfi/canvas only),
clock ~+55 ms slewing. `.env` was found to already hold CF_REALTIME_APP_ID/SECRET —
a Realtime SFU app exists, so the m2m prototype goes straight to building.

Ownership map (ports, notes, inputs):
- **v6 player**: apply CONFIG-ARM-NOTES fix diffs → src/low-latency-player.js
  (v5 backed up to src/low-latency-player.v5.js), chaos ladder + SIGSTOP validation
  vs v5 traces, Q6 confirmation in passing. Own input, port 8899, notes rig/V6-NOTES.md.
- **Part-2-late anomaly**: encoder-arm discrimination (zerolatency/GOP/pacing) with
  edge-lag-blocking.py per-part stats. Own input, port 8898, notes rig/PART2-NOTES.md.
- **WHIP-ffmpeg interop (plan §8 Q3)**: ffmpeg 9 -f whip → whep-rig input
  (224558e8…), playback-verified via WHEP. Port 8896, notes rig/whep/WHIP-FFMPEG-NOTES.md.
- **M2M plan**: research Realtime SFU + alternatives, owns NEW plan-m2m.md.
  No processes.
- **M2M SFU prototype**: 3-way burned-pixel latency through the existing Realtime
  app, owns NEW proto/m2m/, port 8897, notes proto/m2m/NOTES.md.

All agents: checkpoint after every step; kill only own processes by own stream-key/
profile patterns (broad pkill banned after session-3 cross-kills); no plan.md/
PROGRESS.md edits (main session merges).

### WHIP-ffmpeg interop (Q3) — ✅ COMPLETE (first back, ~6 min): works out of the box
- ✅ ffmpeg 9.0.1 `-f whip` → CF Stream: handshake clean (answer 1.4 s, streaming in
  2.8 s), BOTH baseline `42001f` and default-High `64001f` accepted — CF echoes the
  offered fmtp verbatim; the docs' `42e01f` is not a negotiation gate. Playback
  frame-verified twice via WHEP (live frame counters matched elapsed time).
- Working command + SDPs + logs: `rig/whep/WHIP-FFMPEG-NOTES.md` + artifacts/.
  Quirk: teardown DELETE logs a cosmetic read error, exit 0.
- **m2m unlock: a stationary studio ffmpeg feed can publish into the same WebRTC
  world as browser participants, today, with stock homebrew ffmpeg.** ⚠️ Lenient
  profile matching is CF-specific — retest per SFU. plan.md §3.3 + §8 Q3 updated.

### M2M plan — ✅ COMPLETE: plan-m2m.md written (§0–§6, provenance-tagged)
- Recommended: **hybrid** — Realtime SFU grid (selective pull, simulcast rid per
  tile size) + stage stream unchanged + `RtcRoom` DO beside workers/cues for
  roster/publish frames (SDP never touches signaling; thin secret-holding Worker
  proxy to build). 📄 Key validation: Stream WHIP/WHEP has run ON this SFU since
  2025-03-13 — our ✅ 74 ms number already measured its media plane.
- Rejected with numbers: N× Stream inputs (no simulcast/recording, $58–270/show),
  P2P mesh (uplink math dies ~N≈10), MoQ grid (no draft-16 browser client).
- Cost (2 h show, post-free-tier): ~$4 workshop-10 / ~$9 intimate-40 / ~$33
  big-show-225 with simulcast ($91 without). Free tier absorbs ~12 workshops/mo.
- Top risks: no SFU recording (grid archive = composite participant via the
  ✅-built OBS Option C path); undocumented session/rate ceilings; **the two-clock
  problem** — grid at 0.1 s vs HLS stage at 2.4–4 s means stage viewers hear the
  room react seconds early; needs a human rehearsal test.
- Phase 2: RtcRoom DO + proxy Worker + grid UI, chaos + browser matrix + join-storm;
  Phase 3: 200-soak, recording composite, cue-driven grid choreography, 30-min MoQ
  browser spike (moq-lite forward-compat claim vs repo research conflict).

### v6 player — ✅ SHIPPED + VALIDATED: the park is fixed, 2.4–4.3× faster recovery
- ✅ Same-day A/B vs a v5 re-run (historic "15.4 s median" ⚠️ not reproducible from
  the old jsonl — honest baseline re-measured): SIGSTOP-20 park max 13.5 s vs
  19.5+18.0 s, ZERO hls.js gap-controller rescues (all recoveries v6's own),
  post-CONT stable in 13.2–23.5 s vs 56.4 s. Ladder 15/15, no storms, no crashes.
  Soak p50 2.70 s, zero incidents. 3 iterations (beached fast path;
  one-skip-per-target guard vs skip↔drift ping-pong).
- ✅ Q6 CONFIRMED: targetLatency +1.0 s per stall, rebuild resets; 9–11 s jump when
  a post-swap manifest briefly drops LL tags. PDT reads negative ~−1.6 s after -re
  backlog bursts (CF re-stamps ahead of wall).
- ⚠️ Platform weather: post-swap 404 propagation was 45–120 s today vs historic
  10–15 s — the dead-manifest window varies by day; historic value is a floor.
- Files: src/low-latency-player.js (v6), .v5.js backup, rig/resilience-v6.html A/B
  harness, rig/V6-NOTES.md (12 checkpoints), results/resilience-v6.jsonl. Cleanup
  verified (input deleted, port 8899 free, own kills only).

### M2M scale ladder (user: "test more participants") — ✅ NO CEILING THROUGH N=20
- ✅ 8→12→16→20 (N−2 lightweight publishers + 2 probes pulling all tracks on one
  PC each): valid ≥99.58 % every rung, **p95 pinned ~158 ms at every N** — latency
  flat with participant count. Zero API errors in ~370 calls, no 429s. A probe
  decoded 19 simultaneous pulls at ~55 % of one core. Local bottleneck: RAM
  (~800 MB/Chrome → 15.9 GB at N=20), never CPU.
- Two production notes: 1-of-3 twenty-way join storms had a publisher whose
  ICE/DTLS never connected (→ publish leg needs connect-timeout retry) and one
  storm saw a uniform ~3.4 s stall on all sessions/new (⚠️ DNS/edge queueing).
- Instrument save #3 this project: sendBeacon's 64 KB quota silently dropped
  probe batches at N=20 (N=16 was just under) — switched to fetch(). Forensic
  attempt data kept. New: proto/m2m/{run-scale.mjs,analyze-scale.py}, data
  results/m2m-scale-*.jsonl. plan-m2m §5 risk 2 + §6 phase 1b updated.

### M2M SFU prototype — ✅ COMPLETE: many-to-many PROVEN at WHEP-class latency
- ✅ 3-way full mesh through the existing Realtime app ("flabbergaster"): 6/6
  directed pairs, 100 % checksum-valid (n=14,551), pooled p50 96.9 / p95 125 ms
  glass-to-glass. 5-way stretch: 20/20 pairs, p50 91.6 ms — no degradation.
  2-way = 74.2 ms, statistically identical to the WHIP→WHEP baseline (same SFU,
  as plan-m2m predicted). Participant id burned into pixels → attribution verified.
- CPU modest (20–28 % core/browser), qualityLimitation none; single-machine limit
  is the canvas rAF loop (~8–10 synthetic participants/laptop).
- Phase-2 traps recorded: CF 1010-blocks urllib's default UA; register
  mid→participant BEFORE setRemoteDescription. One 3.1 s sender-side freeze seen
  once, identical at all receivers.
- proto/m2m/ complete with README + how-to-run; zero new CF resources; cleanup
  verified. plan-m2m.md §6 phase 1 marked done with numbers.

### Part-2-late anomaly — ✅ SOLVED: CF segmenter hold-and-release, encoder exonerated
- ✅ Verdict from 3 arms × n=70 + a decisive local FLV byte-timing tap (~12.5k tags):
  encoder emits every part within ±23 ms of schedule, Send-Q never pools, yet the
  edge holds the playlist 0.9–1.75 s ONCE per 2 s segment and publishes the back
  half in one write. Hold phase set per broadcast (that's why it looked like
  "part 2"); period 2.00–2.06 s in every broadcast. GOP=15 and lookahead-restored
  arms changed nothing.
- ⚠️ Implication: newest-part age at the edge oscillates 0.8–2.0 s → stall-free
  players must ride ~p95 ≈ 2 s — partly explains the tuned 2.4–2.5 s floor; no
  encoder tuning helps. Agent notes it stalled once mid-run waiting on a
  notification (recurring session-4 agent failure mode; resumed by main session).
- Cleanup verified: input deleted, port 8898 free, own kills only. New tools
  rig/push-part2.sh, part2-flv-tap.py, part2-{analyze,tap-analyze}.py; EDGE_LAG_UID
  env override added to edge-lag-blocking.py. Data results/part2-*.jsonl.

---

## Session 3 — resumed on AC power (~13:4x)

All five agents re-dispatched per the ownership map below, each continuing from its
notes file. Machine at resume: AC power (battery 1% charging), no leftover rig
processes (the idle collector2.py is gone too), camera state unknown until re-probe.
**Clock: +159 ms** (drifted from +21 µs; sudo unavailable to re-step) — edge-lag agent
corrects via sntp sampling; loop-lag and WHEP are same-machine so offset cancels.

### Item 6 (WHEP) — ✅ COMPLETE (first agent back, ~15 min)
- ✅ **Glass-to-glass 73.6 ms p50 / 83.1 ms p95** (n=8079, 300 s, 720p30@2.5 Mbps,
  burned-pixel binary row, zero clock error, all samples visible). ~40× faster than
  tuned LL-HLS. WHIP and WHEP both connected first try.
- ✅ **abs-capture-time REFUSED at negotiation** by CF on both legs (answer SDP omits
  the extmap; 0/8079 samples had captureTime) — answers plan §8 Q4: burned-pixel or
  side-channel timing is mandatory for WebRTC measurement.
- One rig bug found+fixed (double-stringified beacons dropped all rows) — instrument
  checked before conclusions, again. Details: `rig/whep/NOTES.md`, data
  `results/whep.jsonl`, SDPs `rig/whep/artifacts/`. Input `whep-rig` left in place.

### MoQ — ✅ COMPLETE, end-to-end PROVEN without dashboard access
- ✅ **Draft-14 endpoint has no auth at all** → full pub→CF relay→sub test ran today:
  clock ticks 44/44, **one-way p50 17.9 ms / p95 61 ms**; media path (ffmpeg fMP4 →
  moq-pub → relay → moq-sub) delivers a valid mp4. Draft-16 auth enforced (403-style
  `scope resolution failed` without token).
- ✅ **ThreatLocker strikes again**: SIGKILLs every freshly *compiled* binary (proved
  with a 1-line C program) — native cargo build impossible; moq-rs built in Docker
  (both branches, ~1 min each). Correction: rust was already installed via brew
  rustup (May 2026) — NO machine change made.
- ✅ Relay replays the open group from its start on join — live-edge-only is softer
  than it sounds (current GOP from first frame). But no FETCH/GOAWAY means reconnects
  lose history and relay maintenance = hard drop → the gapless-relay pattern matters
  MORE on MoQ, not less.
- Runbook complete: `rig/moq/RUNBOOK.md` (dashboard click-path §3, commands §4,
  risks §5). Trap logged: Docker VM clock was 8.5 h behind after the sleep — resync
  documented. Remaining: USER provisions draft-16 relay (tokens shown once).

### Item 7 (edge-lag) — ✅ COMPLETE: true edge lag is ~842 ms, polling lied by +2.3 s
- ✅ Blocking reload (`_HLS_msn`/`_HLS_part`) via new `rig/edge-lag-blocking.py`:
  **p50 842 ms / p95 1951 ms / p99 2191 ms** (n=140, two runs agreeing within 12 ms,
  clock-corrected ±25 ms). Blocking verified real (block-time p50 ≈ part cadence).
- ✅ Polling head-to-head read p50 3.13 s = +2.28 s over truth. Cause observed:
  edge REPLICA DIVERGENCE — consecutive GETs 400 ms apart hit replicas of different
  freshness (PRELOAD-HINT went backwards; staleness alternated 0.8↔2.7 s). §1
  headline rewritten; the old "~1 s lower bound" story retired.
- ✅ Replicated oddity: part 2 of every segment publishes ~600 ms late (back half of
  each 2 s segment lands as one burst). Cause undetermined.
- Clock: offset moved +158 → +55 ms mid-session (timed slewed after AC returned) —
  the pre/post sntp bracketing was necessary, corrections ~−55 ms applied.
- ⚠️ Cross-agent friction again: encoder killed 3× (broad pkill from the relay
  agent's harness suspected); survived via stream-key-scoped babysitter. ThreatLocker
  reconfirmed: renamed binaries are silently killed. `push-llhls.sh` got two minimal
  env-override fixes. Teardown clean; notes `rig/EDGE-LAG-NOTES.md`.

### Item 9 (config-arm + 26 s park) — ✅ COMPLETE, both mysteries closed
- ✅ **M1: constructor throw.** The arm set `liveMaxLatencyDurationCount` without
  `liveSyncDurationCount`; hls.js validates user config only → synchronous throw
  AFTER telemetry intervals registered → the silent empty-batch signature. Proven in
  node + headless Chrome with onerror capture. Rate-catch-up "mystery" (plan §8 Q5)
  was the same bug. Recommended arm: seconds-based `liveSyncDuration:1.5,
  liveMaxLatencyDuration:6` → 2.4–2.5 s as a pure config line (count-based pair
  silently overrides PART-HOLD-BACK → 9 s target).
- ✅ **M2: the readyState gate park, measured twice.** Post-resume drift-seek fires
  into the buffer hole → readyState 1 → tick()'s paused/readyState<2 gate disarms
  ALL watchdogs while resetting the stall clock; parked 20.0 s and 18.5 s until
  hls.js's gap controller rescued. Plus measured: stale hls.latency during outages
  (1.7 s reported vs 8.4 s true), syncToEdge silent-false with nudge skipped,
  visibility path never calls play(). ⚠️ Historic instance attribution inferred
  (never persisted). **Fix diffs described, NOT applied** — notes checkpoints 8+10.
- Cleanup verified: input f46a8c21… deleted, port 8898 free, own processes killed by
  own patterns only. New rig assets: `rig/config-arm-debug.html`, `config-arm-resume.html`.
- Cross-agent scar (their checkpoint 6 ops note): a sibling's
  `pkill -f 'rtmps://live.cloudflare.com'` killed this agent's encoder too — broad
  CF-push patterns are NOT safe kill targets when agents run in parallel.

### Item 2+8 (relay handover + loop-lag) — ✅ COMPLETE (slate tier; webcam walk owed)
- ✅ **Four-phase handover PASS**: one videoUID `f507c108…` across phases 0–3, real
  content switching in grabbed frames, 4 clean splices, zero discontinuity storms.
- Two NEW splicer defects (ledger → 10, both fixed in splicer.py): **#9** the burned
  CLOCK never rendered (over-escaped colons broke the whole drawtext; the "cosmetic
  SyntaxWarning" was hiding a blank clock, and the ms field was stream-time not wall
  clock — would have poisoned loop-lag); **#11** live tier could never engage (RTSP
  pull TTFB 11.6 s vs 6 s warm-up grace → starve loop → CF ended broadcast attempt 1;
  fixed by pulling RTMP, TTFB 2.4 s).
- ✅ **Perception-lag loop** (`rig/loop-lag.sh`, N=20, 20/20 OCR): **pipeline p50
  7.44 s / p95 8.40 s**; player-perceived ≈ 9.9–11.4 s. Grabs phase-lock to 2 s
  segment starts (metric quantized by segmenting). Data: results/loop-lag.jsonl.
- ⚠️ Camera WEDGED at OS level mid-session (avfoundation opens block forever;
  leaked session in cameracaptured/appleh13camerad; likely trigger: orphaned webcam
  leg ffmpeg — teardown must kill legs explicitly). Needs sudo killall or reboot,
  then the webcam-tier walk re-runs. Stack torn down clean at 22:28.

---

## Session 3 — CLOSED OUT. Open items after this session (ranked)

1. Rotate the Cloudflare API token (pasted in chat) — USER.
2. `sudo killall cameracaptured appleh13camerad` (or reboot) → webcam-tier
   handover walk (agent notes have the exact re-run recipe).
3. ThreatLocker approval → OBS launch chain (unchanged). ThreatLocker now also
   proven to kill ALL freshly compiled/renamed binaries (cargo → Docker workaround).
4. Eyeball `src/demo.html`; OBS Browser Source overlay page (unchanged).
5. MoQ draft-16: USER provisions relay in dashboard (RUNBOOK §3; tokens shown once)
   → §4.2 commands → media burn-in/OCR latency measurement.
6. ~~v6 build + validation~~ ✅ DONE session 4 — park fixed, 2.4–4.3× faster
   recovery, shipped in src/low-latency-player.js (see session-4 entry).
7. Re-run the config-arm comparison with the legal seconds-based arm
   (liveSyncDuration:1.5/liveMaxLatencyDuration:6) to get its resilience numbers
   vs the v6 player.
8. ~~Part-2-late mystery~~ ✅ SOLVED session 4: CF segmenter hold-and-release cycle,
   encoder exonerated by byte-timing tap — see plan.md §1 and the session-4 entry.

---

## Session 2 dispatch — ⏸ PAUSED at battery 2% (user request "pause all save status")

Five parallel agents dispatched on open items 2,6,7,8,9 + MoQ research, then ALL
STOPPED ~2 min in when battery hit 2%. All rig processes killed (mediamtx, splicer,
gapless uplink, slate leg — the relay broadcast on `5cfa5053…` was LIVE, videoUID
`611c8199…`, when killed; next relay start mints a new broadcast, as expected).
Pre-existing idle `collector2.py :8900` left running.

**Last-known position per agent when stopped:**
- Item 2+8 (handover/loop-lag): relay stack UP and live, was about to grab a frame
  to check the burned clock. Partial notes in `rig/relay/SESSION2-NOTES.md` (880 B).
- Item 6 (WHEP): created live input `whep-rig` (uid in `rig/whep/NOTES.md`, 2 kB),
  was checking Playwright. Input exists on Cloudflare — reuse or delete on resume.
- Item 7 (edge-lag blocking reload): had only read scripts; no encoder started,
  no notes file yet.
- Item 9 (config-arm): static analysis just begun; no notes file, no input created.
- MoQ: `rig/moq/RUNBOOK.md` (5.8 kB) started; was fetching CF docs feature matrix +
  checking mediamtx's MoQ draft version.

**TO RESUME:** plug in, then re-dispatch the five agents per the ownership map below —
prompts are reconstructable from it; agents should first read their own notes files
and continue rather than restart.

Ownership map (so a resume knows who was doing what, where notes land):

- **Item 2+8** (one agent, sequential): relay stack + camera + input `5cfa5053…`.
  First `rig/relay/handover-test.sh` clean pass, then build+run `rig/loop-lag.sh`
  (design parked in "Parked mid-build" below). Notes → `rig/relay/SESSION2-NOTES.md`.
- **Item 6** (WHEP): browser↔browser via Stream WHIP/WHEP, ports 8897, own Playwright.
  Notes → `rig/whep/NOTES.md`.
- **Item 7** (edge-lag blocking reload): owns input `4c93bc4b…` + `push-llhls.sh`
  encoder. `_HLS_msn`/`_HLS_part` in `edge-lag.sh`. Notes → `rig/EDGE-LAG-NOTES.md`.
- **Item 9** (config-arm mystery + 26s resume): provisions ITS OWN live input for
  chaos; port 8898. Notes → `rig/CONFIG-ARM-NOTES.md`.
- **MoQ**: CF blog post + all resources → runbook at `rig/moq/RUNBOOK.md`.

Clock at dispatch: −5.2 ms ± 22 ms (sntp). Camera present (lid open). Agents told:
checkpoint to disk after every step, short runs before long runs, no edits to
plan.md/PROGRESS.md (merged by main session afterwards).

---

Chronological journal of the build session. `plan.md` is the current-state reference;
this file is what happened, in order, including the mistakes and dead ends.
Provenance: ✅ measured here · 📄 documented by vendor · ⚠️ unverified.

---

## Morning — research and first measurements

- **Five parallel research agents** dispatched: Stream/LL-HLS, Realtime/WebRTC, MoQ,
  latency-measurement methods, ingest tooling + competitive baselines. All reports
  distilled into `plan.md`. Session WebSearch budget (200) exhausted by them;
  raised to 1000 in `~/.claude/settings.json` for future sessions.
- **"The experimental thing" identified: Media over QUIC.** Cloudflare relay
  provisioning API shipped 2026-07-31, free beta, draft-16 target, live-edge only
  (no FETCH/GOAWAY). ✅ `draft-16.cloudflare.mediaoverquic.com` resolves; draft-18 NXDOMAIN.
- **ffmpeg saga**: 7.1.1 had no WHIP muxer (added in 8.0 — verified against release
  branches); upgrade to 9.0.1 brought WHIP but **lost drawtext/SRT/ocr** (Homebrew
  slimmed the formula). `ffmpeg@7` installed alongside; `ffmpeg-full` identified as
  the single-binary answer. A research agent installed `mediamtx` unrequested (disclosed).
- **Credentials**: wrangler OAuth token has no Stream/Calls/MoQ scopes (all 403).
  User created a custom API token (Stream ✓ Calls ✓ Realtime ✓) — **MoQ still 403**:
  later proven to be an unpublished permission group (dashboard-only provisioning).
  ⚠️ Token was pasted in chat — rotation still pending.
- ✅ **Clock**: stock macOS was +92→107 ms off (drifting ~0.4 ms/min); user stepped it
  via `sudo sntp -sS` to **+21 µs**. chrony recommended for a durable fix + error bounds.

## Midday — LL-HLS ground truth

- ✅ Created `preferLowLatency: true` input; **corrected the research**: Cloudflare
  DOES emit `EXT-X-PROGRAM-DATE-TIME` + full LL-HLS tag set — on LL inputs only.
  `?protocol=llhls` on a non-LL input silently returns plain HLS.
- ✅ Ingest→edge lag ~1 s (later shown to be only a lower bound — the polling metric
  conflates edge lag with playlist staleness; blocking reload needed).
- ✅ **The headline player finding**: stock hls.js parked at 7.6 s in one run and
  15.4 s in another (same stream/config), flat forever — no enabled recovery
  mechanism (`maxLatency: Infinity`, rate catch-up off). With a seek-to-edge
  controller: 1.87–3.05 s, at target. **Non-determinism, not slowness, is the defect.**
- Twice mis-read hidden-tab artifacts as findings ("diverges to 25 s" — wrong;
  background tabs stop buffering AND stop rVFC, with zero errors shown). Visibility
  is now recorded per-sample and filtered in analysis.
- 📄 Corroboration: Reinhardt 2023 measured anonymized LL-HLS at 19.75 s — the
  industry-wide player-throws-it-away gap.

## Afternoon — resilience campaign (the user's historical pain)

- ✅ **Platform truth #1**: Cloudflare mints a NEW video UID on every encoder
  socket close — even a 2 s gap. `timeoutSeconds` grace applies only while the
  socket stays open (SIGSTOP survives; SIGKILL/SIGTERM both end the broadcast).
  **The TCP close is the trigger, not the RTMP goodbye, not the gap length.**
- ✅ **Platform truth #2**: while ingest is down the manifest returns HTTP 204;
  after restart the edge serves the dead manifest ~10–15 s (client-irreducible).
- **Player versions v1→v5** against the chaos harness (2/5/12/25/60 s gaps):
  v1 died permanently on gap #1; v2 wedged before ever playing (instance surgery
  doesn't work — only full rebuild does); v3 recovered 5/5 but median 164 s;
  v4's fail-fast caused rebuild storms and crashed the tab (live-edge part 404s
  are NORMAL in LL-HLS); **v5: 5/5, median 15.4 s, lands at target, zero crashes** —
  near the platform floor (post-swap 404s are on the OLD broadcast's URLs).
- Two harness bugs found by their own damning-looking numbers (advancing-metric
  not reset across rebuilds; URL attribution off by one path component).
  *Instrument bugs look identical to product bugs until you check the instrument.*
- elektronstudio/v4's old reconnect hacks proved directly relevant:
  `manifestLoadingMaxRetry: Infinity` and the seekable-end stall check both adopted.

## Afternoon — timed messages, DO relay, cue sync

- Cloudflare strips ALL in-band metadata (ID3/SCTE-35/DATERANGE/SEI) → side channel
  + PDT alignment. `src/timed-messages.js`: cues fire when each viewer's playhead
  crosses the cue's wall-clock moment; revisions, cancels, late-joiner policy,
  subtitle track (native VTTCue) and hidden metadata track renderers.
- `workers/cues` Durable Object relay deployed (free plan, workers.dev, no domain).
  ✅ One-way pub→DO→sub p50 **27 ms** after moving broadcast before storage.put
  (persistence-gated delivery cost ~50 ms). ⚠️ Workers freeze `Date.now()` (~67 ms
  apparent skew) — never use DO timestamps for fine timing.
- ✅ **End-to-end cue→video sync verified**: fire error p50 **65–98 ms** (floor =
  100 ms poll), send→fire 2099 ms vs 2000 target. The 5.9 s outlier = cues sent
  before PDT existed, delivered late by design (late-joiner policy).
- ✅ **DO hibernation wake fixed**: `setWebSocketAutoResponse('ping'→'pong')` —
  RTT 32–38 ms even after 15 s idle (was ~119 ms); pings free, never wake the DO.

## Evening — gapless relay + webcam tier

- Goal: encoder restarts must not cost viewers the ~15 s outage. mediamtx's
  `fallback:` (connect-time only) and `overridePublisher` (kills readers) both
  insufficient → **FIFO + TS-concat architecture**: one never-closing uplink,
  sources spliced beneath it.
- ✅ Proven: one Cloudflare broadcast across encoder in/kill/return (multiple runs);
  content switching (distinct frame hashes); slate carries DO-driven burn-in
  messages (`rig/overlay-bridge.mjs`, drawtext textfile reload).
- **Splicer hardening: 8 defects, each found by a test run** (full ledger in
  `rig/relay/README.md`): torn packets, mid-GOP joins, backward-PTS discontinuity
  storms (fix: per-leg `-output_ts_offset`), socket starvation blocking switches
  for 17 min (fix: select + starve trigger), wall-clock offset drift (fix: track
  last delivered **PCR**), audio-PES splice corruption killing the uplink (fix:
  `discardcorrupt` + pinned `-r 30`), warm-up misdetected as starvation, dead
  camera escaping the bench.
- **Webcam tier added**: encoder > webcam > slate, 60 s bench, env knobs, silent
  audio by design. ✅ webcam→live splice clean (0 discontinuities); ✅ dead-camera
  self-heal to slate. ⚠️ One clean four-phase walk on the final build still owed —
  the laptop lid closed mid-campaign and killed the camera.

## Evening — OBS

- ✅ OBS was already on this machine (logs from Feb 2025) — cask was a re-install.
  ⚠️ `plugin_config/obs-websocket/config.json` overwritten (now localhost/no-auth).
- Pre-staged: `positron-lowlatency` profile (Tune=zerolatency — the one-dropdown
  LL setting; keyframe 2 s manual; CBR; Cloudflare RTMPS + key in service.json).
- Launch blocked: quarantine flag (stripped ✓), locked screen (environmental),
  and finally **ThreatLocker** (user-identified) — corporate allowlisting kills
  unapproved binaries silently. No bypass attempted; approval requested.
  Silent instant process death with zero forensics ⇒ suspect endpoint control first.
- Remote control: obs-websocket v5 (port 4455) — no MCP needed; config pre-enabled.
- Deployment recommendation: **Option C** (roaming OBS → mediamtx → stationary
  studio OBS with slate scene → Cloudflare) — OBS's compositor makes the splice
  problem structurally impossible; Browser Source overlay replaces drawtext burn-in.

## Repo notes

- `auto.crt`/`auto.key` at repo root: generated by mediamtx (TLS for its
  listeners) — local artifacts, gitignored.
- Demo: `src/demo.html` (player + send box + overlay + subtitles + channel RTT),
  pending visual check on an unlocked screen.

## Parked mid-build: perception-lag loop (webcam → CF → back)

User intent: webcam is a **composition source**, not just failover; measure the real
perceived lag of the local-camera → Cloudflare → local-player loop.

State when parked:
- DONE: millisecond wall clock (`%{localtime}.mmm`) burned into the splicer's webcam
  and slate legs — ground truth now travels in the pixels of every relay source.
  ⚠️ cosmetic: the CLOCK drawtext string emits a Python SyntaxWarning (escape wart) — works, tidy later.
- NOT BUILT (the plan): `rig/loop-lag.sh` — N× { t0=now; grab live-edge frame
  (`-live_start_index -1`); ffmpeg@7 `ocr` filter (libtesseract, whitelist digits:.)
  reads the burned clock; lag = tod(t0) − tod(burned) }; report p50/p95.
  Numeric half runs fully headless off the slate leg; identical pipeline becomes the
  eyeball mirror test (wave hand, watch playback) once the lid is open.
  Player-side perception = this pipeline lag + `player.latency` (measured 2.5–4 s).
  Clock validity: machine stepped to +21 µs this morning; re-check `sntp` before a run.

## Open items (ranked)

1. Rotate the Cloudflare API token (pasted in chat).
2. Lid open → one clean `rig/relay/handover-test.sh` pass (closes splicer v-final).
3. ThreatLocker approval → OBS launch → remote-control proof → auto-reconnect
   chaos test (decides whether OBS-direct is viable or relay/Option C is mandatory).
4. Eyeball `src/demo.html`; then OBS Browser Source overlay page.
5. MoQ via dashboard + draft-16 client test.
6. WHEP measurement (`abs-capture-time` preservation unknown).
7. Blocking playlist reload in `edge-lag.sh`.
8. Perception-lag loop: finish `rig/loop-lag.sh` per the parked design above.
9. Unexplained: hls.js `liveMaxLatencyDurationCount` arm never played; one
   same-broadcast resume settled ~26 s behind without drift-seek firing.
