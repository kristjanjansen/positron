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

### 30. A shared module nobody can see is a claim, not a unification

`demo/shell/pattern.mjs` was written to be the ONE test pattern, and it was
imported only by `moq.mjs` — so the only two pages that drew it both need a
relay that does not connect from here. Meanwhile four other demos each drew
their own picture with a hand-rolled clock. The work was real, the file was
good, and the thing it existed to achieve had not happened.

Nobody noticed because the module was *correct*: it had tests, it round-tripped,
its geometry was documented. What it did not have was a reader. The user found
it in one sentence — "can not see unified test screen rendering" — because they
went looking for the RESULT rather than the change.

**Ask where a shared thing is visible before calling it shared.** `grep -l` for
the importers takes ten seconds and answers it. If the answer is "one caller,
and that caller is offline", the extraction is staged, not done.

The same shape produced #29 one commit earlier: a module whose import 404'd
killed two pages for weeks. Both are the same question — *who actually reaches
this?* — asked too late.

### 31. When a fix draws a new complaint, do the arithmetic on what it cost

Three attempts at ~30 lines of camera drawing, each fixing the last one's
damage:

    drawImage(src, 0, 0, w, h)  distorts — iOS ignores a 640x360 request and
                                returns PORTRAIT, so a face is squashed
    cover                       aspect correct, but on 720x1280 into 1280x720
                                scales 1.78x and shows 32% OF THE FRAME
    contain                     aspect correct, whole frame, field either side

Cover was a real fix for a real bug and it produced "no video" — zoomed so far
into the middle of the picture that it read as a broken camera. I had verified
the thing I changed (a square stays square: ratio 1.000) and not the thing I had
not thought about (how much of the source survives). One line of arithmetic —
`h / (sh * scale)` — would have said 32% before it shipped.

The field colour was the same story twice: `hsl(hue 26% 12%)` was mud, and the
"fix", the site's black under a 7% hue wash, was mud again. **A warm hue at low
saturation and low lightness IS mud; there is no alpha that fixes it.** The
answer was to stop tinting the field and let the colour live where it is
saturated and large.

So: when a change lands and the next report is a NEW complaint about the same
element, do not reach for the next variant. Write down what the fix costs in the
units of the thing you are drawing, and check that number against the complaint.

### 32. A scale that grows with the thing cannot show it growing

`take` had to draw a take getting longer while it records. The obvious
implementation — extend the deck's range as the take extends — produces a bar
whose right edge is pinned to the end of the axis. It does not animate. Nothing
is broken, no assert fails, and the numbers under it are all correct.

Growth is only visible against something that is NOT growing. The axis now opens
to the full cap when recording starts and the take grows into it, which is also
the honest picture: the empty space is how much take is still allowed.

Second half of the same fix: `paint()` ran once per blob — every 500 ms — so
even with the runway the bar advanced in steps. **A thing that is supposed to
look continuous needs a frame rate, not an event.**

And measure it rather than watching it: lit pixels across the lane, sampled
every 700 ms, `60 → 94 → 129 → 152 → 190 → 229`, monotonic. Watching an
animation and believing it is smooth is how the 500 ms stepping survived the
first attempt.

---

## Session 13 — a live line, and four ways to be wrong about it

Written 2026-09-08, building `now` — one ERR channel on a line whose right-hand
end is the present. Every entry below cost a red assert whose cause was mine
rather than the source's.

### 33. `startLoad()` with no argument means the LIVE EDGE

hls.js's `startLoad(startPosition = -1)` reads "auto", and auto on a live stream
is the edge. It was added one line before a ten-minute back-seek, to recover
from the wall handler's `stopLoad()` — so the page dutifully returned to live
and then seeked backwards from there, and the picture snapped forward inside
900 ms. Three asserts read red naming ERR, hls.js and the media master in turn;
all three were innocent. **A recovery action has to land somewhere specific:**
`startLoad(seconds)` when the reader asked for a past instant, argument-free
only when the control being pressed literally means "the live edge". And it is
only needed at all when loading was actually stopped — track that, do not call
it hopefully.

### 34. A control that is not finished at press time collides with the next one

The harness presses controls in order and sleeps 650 ms between them. `Back ten
minutes` spent 700 ms on a pause test before doing its own work, so `Live` was
pressed, ran, and completed *before the back-seek had happened*. Both mechanisms
were correct and both read red, intermittently, which is the worst way to be
wrong. **Whatever a control asserts, it must have done by the time it returns**
— and a test that belongs to a different mechanism (here, a paused element is
not a clock) belongs to the control that mechanism lives in.

### 35. A counter read on a timer is a coin toss; an event carries its magnitude

`master.stats().jumps` read 900 ms after a seek passed under the harness and
failed under a probe pressing the same buttons 900 ms apart — the same check,
the same page, two answers. The master reports each jump as it happens with its
size, so the back-seek is now identified by *being a jump of −600.2 s*, which is
true whenever it is read. **Prefer the event that carries the quantity over a
counter sampled at a moment you have to guess right.**

### 36. Nothing in the suite looks at ink

Three lane gutters rendered `() => (prob…` — the literal source of the
functions I passed, because `subLabel` is a VALUE and the strip does
`String(...)` to it. 29 asserts passed over it on every run, including the ones
about those very lanes, because an assert reads state and a gutter is paint.
A screenshot found it in one look. **A page has a class of defect its own checks
structurally cannot see; look at it once before shipping it.** The ellipsis is
the second half of the same lesson: `13 asked · …` means the text is wrong for
the space, not that the space is wrong.

### 37. Continuity is symmetric, or a back-seek eats the record

The watched-stretch lane extended its last span when `p - last.to < 2000` —
trivially true after a ten-minute back-seek, where `last.to` sits ten minutes in
the *future*, so the page reported 9.6 minutes watched after a 26-second run.
The test is `Math.abs(p - last.to) < 2000`. A one-sided comparison against a
moving quantity is only a continuity test in the direction you were thinking
about when you wrote it.

### 38. A browser cannot read a response's `Date` header

The plan for this page said measuring the visitor's clock against ERR's was
free, "off the `date:` header on a fetch the page already makes". It is not
available at all: `Date` is not on the CORS-safelisted response header list and
ERR sends no `Access-Control-Expose-Headers`, so `headers.get('date')` is null
in JS on a response that plainly carries one — `curl` shows it, the page cannot.
Every other route to that number (the stream's own start date against
`Date.now()`) adds packaging and network delay to the skew and cannot separate
them, so it would print mostly latency under a label saying "clock". The
readout cell and its assert were removed rather than faked. **A measurement
being present in the protocol does not mean it is present in the browser.**

---

## Session 14 — a demo about the wire, and four ways a page lies quietly

Written 2026-09-09, building `wire` and the backlog beside the relay. Two of
these are silent platform behaviour; two are about what a page says when nobody
reads it.

### 39. A counter that cannot be wrong is not a check

`seq` went into the envelope to tell "never arrived" from "arrived out of
order". That reason was **wrong**: a WebSocket rides TCP, so one sender's
messages cannot arrive out of order and nothing goes missing without the
connection dying. A reordering assert would have passed forever — the same
vacuous shape as #27, arrived at from the opposite direction, by reasoning
about a mechanism instead of waiting on an effect.

It survived on a different argument, and the perf run turned that argument into
a number. The relay drops under its own caps and **tells the sender nothing** —
no error, no close, no backpressure. At 120 and 300 msg/s, three runs each
delivered exactly **298 messages in three seconds**: `MSG_BURST` 120 plus 3 s at
`MSG_PER_SEC` 60, the token bucket read straight off the wire. Those 599 losses
have a number only because the receiver could see the counter skip.

So: before keeping a field, name the failure it makes visible, then check that
failure can actually happen. And a first assert on it — `'seq' in bytes` —
was itself unfalsifiable and had to be replaced by one that could fail (the
counter did NOT advance across a binary frame).

### 40. `map(fn)` passes the INDEX, and a defaulted second parameter will take it

`rows.map(short)` where `short = (s, n = 96) => …` renders row *i* truncated to
*i* characters: a staircase of ellipses down the pane. **Eleven asserts passed
throughout**, because they compare the rows and the rows were right — only the
paint was wrong. One screenshot found it; nothing in the suite could.

Second instance of #36 in two sessions, so the rule is worth stating as
mechanism rather than as advice: **a page has a class of defect its own checks
structurally cannot see, and the cost of looking is one screenshot.** The
specific trap generalises past this bug — never pass a function with optional
parameters straight to `map`, `forEach` or `filter`.

### 41. Hide a control the harness needs; do not remove it

Asked to drop the debugging buttons, the obvious move is to delete them. But
`verify.mjs` presses `.d-controls button`, so a removed control is a subject the
suite silently stops testing (#19, from the other side). They are `hidden` and
still in the DOM, `?checks=1` shows them, and the assert count is unchanged.

The same shape decided where the compose box went. "Move send below the box"
reads as *move the button* — which would take it out of `.d-controls` entirely,
and reorder every press besides, since the harness walks them in document
order. Moving the BOX above the bar puts the same pixels on screen at no cost.
**When a layout request would move an element out of the harness's reach, move
the other element.**

### 42. A control's blast radius must not exceed its label

`Clear the history — every room` was honest about being blunt. Shortened to
`Clear history`, the same wiring became a two-word button that silently emptied
every room the worker knew of. The fix was not to restore the long label but to
**cut the behaviour to the name**: it clears this room, and the all-rooms sweep
stays in the worker where it is asked for by URL rather than by a button
somebody might press expecting less.

Related, on the wording of the assert: the sweep can only reach rooms recorded
since the index existed, because **a Durable Object namespace cannot be
enumerated**. So the assert says "every room it knows of", not "every room" —
the true claim rather than the flattering one.

---

## Session 15 — the oracle, and what a self-referential test cannot see

Written 2026-09-09, after running `timeline/csound.mjs` against real Csound for
the first time. It had been green at 22/22 for months and was wrong in two
places.

### 43. A test that recomputes the formula is not a test of the formula

`csound-test.mjs`'s ramp check compared `t.secondsAt(30)` against `closed`, a
number the test computed **from the same expression the compiler implements**.
It passes whenever the two agree, which is whenever nobody has made a typo. It
cannot see a misreading of the format, and there was one:

- We interpolated **tempo** linearly in beat, making time the logarithmic
  integral `Δt = (60/k)·ln(m1/m0)`. Csound interpolates **seconds per beat**
  linearly in beat, making time a plain trapezoid. On `t 0 120 30 90` that is
  17.500 s against our 17.261 — **239 ms** — and on `t 0 60 20 180` it is
  **2.35 s** by beat 20.
- `^+x` resolved against the previous note of the same instrument. Csound
  resolves it against the **immediately preceding statement**, any instrument.
  `+` and `.` really *are* per-instrument, so the three shorthands do not share
  a reference note — an asymmetry nobody would guess and a reading of the manual
  would not settle.

**The sharpest part is the documentation.** The file warned in a comment that a
mean-tempo shortcut "puts every later note 118 ms early". That 118 ms was
`17.2609 − 17.1429` — the distance between **two wrong answers**. A confident,
specific, load-bearing number, quoted in `SUMMARY.md`, `plan-score.md`,
`plan-uuu-local.md` and `demo/notes/`, measuring nothing.

So: **when you implement somebody else's format, the reference implementation is
the only thing that can grade you.** `brew install csound` and
`timeline/lab/csound-oracle.mjs` — which skips cleanly where csound is absent,
because a check nobody can run is a check nobody runs.

Same family as #26 (a second implementation has to be LOOKED AT, not reasoned
about) and #29 (an explanation supplied from expectation). The new part is that
here the *test* was the thing supplying the expectation.

### 44. Build the case that separates all the candidates, not one that fails

The first ramp showed a disagreement but not what the right rule was: 17.500
measured, 17.261 ours, 17.143 mean-tempo. Three numbers, and "not ours" is not
an answer. `t 0 60 20 180` was chosen because the three models predict **13.333
/ 10.986 / 10.000** — far apart, and only one can be right. Csound answered
13.333333333, which named the mechanism rather than merely refuting one.

Then a four-point map confirmed it at seven onsets, because a rule fitted to two
points is how the *next* wrong formula ships. Same rule as the ADV/EDGE pair in
#5: build the measurement that discriminates, then stop guessing.

### 45. A filter that drops most of the evidence looks like a finding

`csound … | grep '^EVT'` returned 4 of 5 events, and the missing one was the
note at beat 0 — which reads as a meaningful pattern about how Csound handles
time zero. It was an anchor. **Csound writes ANSI escapes**, so most lines begin
`\x1b[m`, and `^EVT` matched only the ones that happened to follow a newline
cleanly.

The same shape twice more in one session: `execFileSync` returns only stdout, so
capturing csound's `prints` — which go to **stderr** — read back as "csound
produced 0 events" across every case at once. And the sweep for the other Mac
came back empty because mDNS is silent in this sandbox, not because the machine
was absent.

The tell in all three: **a partial result that is too tidy.** Exactly 4 of 5,
exactly 0 of everything, exactly nothing found. Before believing a pattern in
missing data, check the thing that did the collecting.

### 46. A flag that reports intent is not a transport running

Ableton Live's `is_playing` returned `true` after `start_playing` while
`current_song_time` stayed at 0 across every probe — because the audio engine
was off, and Live's transport is clocked by the audio engine. No error, no
warning, and a rig built on `is_playing` would have recorded a session of
nothing while looking correct.

Third instance of one shape in this project: `createMidiLane`'s counter climbed
while every note was scheduled fifty-six years out (#22); `wire`'s `seq`
survived only once it was pointed at a loss that could actually happen (#39).
**Ask what the indicator is downstream of.** `is_playing` is downstream of a
request; `current_song_time` is downstream of the clock. Only the second one can
report that the clock stopped.

With the engine on, the same reading is worth having: 0.063% worst rate error
across four tempos — but every error was NEGATIVE at about 0.05%, and that could
be Live's audio crystal against the system clock or a bias in how the reply was
sampled. Two candidates, one number, not separated: so it is quoted as an upper
bound on the PAIR rather than as Live's clock error (#1).

### 47. A log's LINE COUNT says whether a program started

OBS wrote five lines and stopped, the last being `Permission for screen capture
denied`. Nothing said "blocked"; there was no error, no exit, and the process was
alive the whole time. A healthy start writes about 123 lines. **The count was the
whole diagnosis** — and once the macOS permissions were granted the same binary
went straight to 123 and loaded its plugins.

Third instance of one rule: read the SIZE of the output before reading its
content. #29 was the denominator (`0/1` means the page never ran, `13/17` means
it ran and failed); #45 was a filter that returned exactly 4 of 5 events. Here
it is a log that is too short. **A program blocked on a modal dialog looks
exactly like a program that is running**, from every angle except how much it
has said.

Also worth keeping: **an unclean kill is not a way past a modal.** OBS refused
`quit` while its first-run wizard was up (`User cancelled -128`), and force-
killing would have added a crash-recovery dialog on the next launch — a second
modal stacked on the first. Some walls are the user's to click, and the right
move is to say exactly which button.

### 48. The build you could not avoid may have become a download

`rig/obs-docker/NOTES.md` records, correctly, that obs-moq releases "ship
macOS-arm64/Windows only → Linux build from source" — and session 6 duly spent
~7 minutes of emulated Docker plus a pinned rustup to produce a 48 MB `.so`.
That was the right call for a Linux container.

On a macOS-arm64 laptop the same plugin is a **6 MB signed download**, and it
loads with the identical cosmetic locale warning the Linux build produced. The
note was never wrong; the machine changed underneath it. **When a note explains
why something was hard, check whether its premise still holds before repeating
the work** — the premise here was the target platform, and it was stated right
there in the sentence.

The negative half matters too: the `.so` kept in `rig/obs-cloud/obs/plugin/` is
`ELF 64-bit x86-64`. It is the right artifact for the container and useless on
the Mac, and `file` answers that in a second.

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

## 39. `pkill -f <pattern>` matches its own command line (session 17)

`ssh host 'pkill -9 -f "fluidsynth|yoshimi|jack-dssi-host"'` kills **its own
shell**, because `-f` matches the full command line and the pattern text is in
the command being run. Several deploys silently did nothing and their output
vanished before this was spotted; the failure looks like ssh dropping the
connection. **Use `pkill -x`**, which matches the process name exactly.

## 40. `custom.toml` needs Imager's hook, and says nothing without it (session 17)

Raspberry Pi OS reads `custom.toml` from a firstrun script that **Raspberry Pi
Imager injects**, together with a `systemd.run=` entry in `cmdline.txt`. Write
the image with `dd` and there is no hook, so the file is never read: the card
boots as `raspberrypi` with no user and no sshd, the file is still sitting there
afterwards, and nothing in any log mentions it. `userconf.txt` and an empty
`ssh` file are handled by services **inside the image** and work on a plain
write. An hour went into placing a file nothing was ever going to look at.

## 41. Two audio sources in one socket is what "garbled" sounds like (session 17)

`startAudio` returned `{already:true}` when anything was running, so choosing a
second instrument left the first one ALSO streaming — interleaved samples from
two instruments at 100 msg/s against the relay's 60 msg/s cap. Measured **60
frames/s arriving and 5,495 dropped at the relay**. It sounds exactly like
corruption and it is two instruments talking over each other. The same bug then
arrived through a second door: raising a JACK chain takes ~13 s, and a `note.on`
during that window saw "nothing running" and started a second instrument.
**Frame rate is now a readout cell**, because 50/s is one clean source and
anything above it is this.

## 42. Sandboxing fights JACK, three processes upstream of the symptom (session 17)

`PrivateTmp=true` gave a service its own /tmp, so its jackd socket was invisible
to its own children after a restart. Turning it off made `ProtectSystem=strict`
bite instead — /tmp is not exempt once PrivateTmp is gone, so jackd could not
create the socket at all. `ProtectHome=read-only` then blocked jackd's and
SuperCollider's config writes. **Every one presented as "scsynth could not
initialize audio"**, which is three processes from the cause. Related: ask
`jack_lsp`, never `pgrep -x jackd` — the process table reports a server this
process may not be able to REACH, and skipping the start on that basis leaves
every client unable to connect. And jackd must not be in a teardown list: it is
a shared server, and killing it on an instrument switch kills the one the next
instrument needs.

## 43. A focus ring wearing the armed colour reads as armed (session 17)

`shell.css` has `:focus-visible { outline: 2px solid var(--hi) }`, and the box
page used the same `--hi` for its armed toggle. A focused-but-OFF switch was
indistinguishable from an armed one — the page said the effect was on while its
own log said bypassed. Focus is grey there now. **One colour, one meaning**, the
rule this project already applies to marks in a strip.

## 44. The M1/M2 Pro SD reader is a documented fault, and IOKit shows the split

It reads once and then reports `Link Width: Off` until a reboot. Underneath,
`ioreg -c AppleSDXCSlot` said **`Card Present = Yes`** while the PCIe link was
down: the mechanical detect switch fires, the pins do not make contact, the
driver attaches and publishes no media. `system_profiler` also returns **stale**
card details from a previous insertion, which is worth knowing before believing
it twice. Hours went into treating a hardware fault as a software one — the tell
was that it worked once and then never again, which is a contact, not a bug.
