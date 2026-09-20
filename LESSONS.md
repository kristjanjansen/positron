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

`verify.mjs` presses buttons in `.pos-controls` and nothing else. A hardware
button mounted in the page body produced `page asserted something — 0`, which
looks exactly like a demo that does not work. Same shape as #2 and #13: the
suite was not wrong, it was not reaching the thing.

### 20. Match the assert threshold to what the harness actually exercises

Gating 01's asserts on five drift rows read as "asserted nothing", because
`verify.mjs` plays for 500 ms — which is one mark. Assert on the first row.

Second instance, session 21: `typist`'s live check wanted **12 edits where the
harness types 10**, so it silently never ran at all. Eight now, and it reads
`10 moments compared, 0 apart`. **A threshold above what the harness can reach
is a check that does not exist**, and it costs nothing to read green.

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

Third instance, session 22, and the most literal one available:
`d.assert('eight cues in the score', deck.eventsOf ? true : true, …)` — both
arms of the conditional are `true`. It is now a real fold query with the first
cue's time read from `CUES[0]` instead of typed. Like #24's `?? 0`, the defect
has a SHAPE and the shape is greppable: `? true : true`.

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
`verify.mjs` presses `.pos-controls button`, so a removed control is a subject the
suite silently stops testing (#19, from the other side). They are `hidden` and
still in the DOM, `?checks=1` shows them, and the assert count is unchanged.

The same shape decided where the compose box went. "Move send below the box"
reads as *move the button* — which would take it out of `.pos-controls` entirely,
and reorder every press besides, since the harness walks them in document
order. Moving the BOX above the bar puts the same pixels on screen at no cost.
**When a layout request would move an element out of the harness's reach, move
the other element.**

⚠️ **The same harness fact from a third side (session 22): the order controls
are DECLARED in decides which branch gets graded.** `verify.mjs` presses them in
document order, so whichever is last is the state the page is in when the checks
run. `typist` declared its two the other way round and read **9 of 10, green**,
with the one assert grading the half a visitor actually uses simply absent.

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

⚠️ **Session 22, the same A/B in a layout.** `diagram`'s byte-identity check
compared the same spec with and without `children: []` — and stayed GREEN with
the container arithmetic forced permanently ON, because both arms run it. The
assert that works says something the bug cannot satisfy: a box with nothing in
it leaves no trace at all, no empty list and no key. 272 of 272 layouts
identical, 8 specs x 2 rulers x 17 widths, one ruler deliberately uneven so that
an equality holding only for a fixed advance cannot pass.

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

⚠️ **The same rule applies to an ARGUMENT, not only to a fix** (session 21).
`plan-gesture` §3 decided that a gesture is ONE two-dimensional series rather
than two one-dimensional ones, and rested that on an **8.6x** number produced
while answering a different question — where to PLACE samples. Measured head on:
per-axis-ness costs **~2x** and time-blind placement costs **~14x**, so the
argument had charged one mechanism for a cost the other dominated, and at 500 ms
the order even crosses (#71). The DECISION survived, on a row of §3's own table
the measurement never touched — one sample, one instant, which is atomicity
rather than error magnitude — and the plan was corrected in place rather than
making the code agree with it. **A right decision resting on a wrong argument is
still a defect, because the next decision leans on the argument.**

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

⚠️ **Four silent drops in one session (22), and not one of them turned anything
red.** `typist` went **22 asserts to 7** because a control that disposes the
deck ran before the check rather than after it; `patch` went **26 to 9** on an
import it had not updated yet, and **20 to 15** on a file it could no longer
read; and `scene` went **32 to 24** when restructuring its
constants deleted two helpers — that last one caught ONLY by the count, because
the room swallows a throw from `draw()` into a log line and `verify-gl` still
said GREEN. **A green suite with a smaller denominator is the normal
presentation of this bug**, so diffing the count is not tidiness; it is the only
instrument that sees it.

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

⚠️ **NUMBERING DEFECT, AND IT IS NOT TO BE REPAIRED IN PASSING: entries 39–48
EXIST TWICE.** `### 39`–`### 48` above are sessions 14–15; `## 39`–`## 48` below
are sessions 17–18. Every citation of those numbers is therefore ambiguous, and
CLAUDE.md, HANDOFF.md and PROGRESS.md all cite them — so renumbering is a
deliberate sweep with a grep of those three files behind it, never a side effect
of a writing task. Until somebody does that sweep, cite these ten by TITLE.

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

## 45. An envelope field eats a payload field of the same name, silently (session 18)

`wire.mjs`'s `format()` builds `{ id, type: '', ...msg, from, at, seq }` — the
envelope is written AFTER the message is spread, so any payload field called
`from`, `at` or `seq` is replaced without a word. `source.load` carried the
excerpt's start offset as `at`, so every send overwrote it with `Date.now()` and
the box asked ffmpeg to seek to **second 1,789,103,743,118** of a forty-five
minute broadcast.

The reason it survived is the reason it is worth an entry: **ffmpeg answered
with sixty seconds of real audio anyway**, from wherever it decided that was. So
the feature made sound, the suite stayed green, and the only control the feature
had did nothing. This is the second time the same spread ate a field in the same
file — `voices.listed`'s `source` was the first, and its fix was a comment.

`format()` now THROWS on the collision. There is no correct silent behaviour for
a programming error whose alternative is a timestamp in a seek argument, and it
fires on the first send rather than in the field.

## 46. "Off" that erases: `src 1` wiped the buffer it was documented to hold

Pappus's own comment calls `msrc 1` *"OFF (hold what the buffer already has)"*,
and the record gain does go to zero. But the write head does not stop, and the
RETAIN gain is zero too unless `lock` is set:

    sosret = (sos * 1.05).clip(0, 1)            sos = msos.max(mlock) = 0
    sosin  = ((1 - sos) * 4).clip(0,1) * run * (ssel > 1.5) = 0
    BufWr.ar((cap * sosin) + (old * sosret), …) = 0 * new + 0 * old

So "stop recording" wrote **silence** over the live window at real time — one to
twelve seconds, depending on the roll. A loaded minute of 1965 was gone before
anyone could listen to it twice.

⚠️ **And every reading of the feature was wrong in the same direction.** A take
started a second after the load still caught material on its way out, so it
"made a sound" and "sounded unlike the synth" — both true, both about something
being erased. **A single take cannot tell "loaded" from "loaded and already
being erased".** Only a second take, later, can. The live test now listens again
25 s on, which is the assertion that would have caught it on day one.

## 47. A die that rolls a step count as a fraction turns the instrument off

The euclidean gate reads `epattern[(estep + mephase*i).floor % melen.max(1)]`
and advances it with `Stepper.ar(trig, 0, 0, (melen - 1).max(0), 1)` — so
`melen` is a NUMBER OF STEPS. The roll drew it `f(0.2, 1)`. Any value at or
below 1 makes the modulo `% 1`, which is 0 for every voice at every step: the
pattern is read at index 0 forever, and if that bit is a 0 the granulator never
fires a grain.

Measured over 20,000 rolls of the shipped code: **30.5% of rolls gated BOTH
granulators off and 49.6% gated exactly one.** About a fifth of presses left the
instrument running. Nothing reported an error — the die simply produced silence
most of the time, and that read as "granular is subtle". Now 0.0%.

This is the fourth range bug in one file (`scanmode`, `contour`, `pmodel`,
`pgraintype` were the others), and the pattern behind all four is the same: **a
number whose UNITS were guessed from its name.** The engine is on the board and
`grep` answers in a second.

## 48. A proxy measurement cannot answer in the direction it has a floor in

"Does a key pitch the grains?" read FAILED for a day against an engine that was
working, for two reasons that are both about the instrument and not the subject:

- **the chain** — 48 resonators tuned to a fixed chord, eight delay taps and a
  reverb sit between the grains and the capture, and not one follows a key.
  Through a resonator-heavy roll, four octaves of key moved the measured
  brightness by **−0.05 octaves**. Through a roll that goes straight out, the
  same four octaves moved it **1.77**.
- **the material** — a two-second spectral centroid of grains scattered over a
  minute of SPEECH is dominated by which words they landed on. The same sweep
  gave −1.92 octaves at −12 semitones (right) and +0.34 at −12 on the next take.

On steady material with the chain muted the ladder is unambiguous: **225 · 271 ·
350 · 1102 · 2100 Hz**. But brightness still cannot answer DOWNWARD — a grain
clock at 12/s with a 0.2 s envelope puts a broadband floor under everything, and
partials moving down into that floor stop moving the centroid. So the test
asserts the upward rungs and **says the rest in words**, rather than going amber
on a working engine every third run.

## 49. A green reply can precede the thing it reports by seven seconds

`fx.pappus` waited for `SuperCollider:out_1` to appear in `jack_lsp` and then
answered `ok`. That port is scsynth booting; the 2,030-line engine class is
compiled and its 106 commands registered **several seconds later**, and sclang
answers an unknown command with nothing at all. From the board's own log:
`pappus inserted` at 05:38:59.8, a minute of 1965 loaded at 05:39:03.5,
`PAPPUS READY` at 05:39:06.0. The load, the buffer lock and the gates all went
into a void, with no error anywhere, and the page said the material was loaded.

**Wait for the thing that means what you are claiming.** The engine prints
`PAPPUS READY` when it means it. Guard on the exact line, not a substring.

## 50. We got blocked by ERR, and the heavy request had no `fetch` in it

After a day of testing, `arhiiv.err.ee` answered **nothing at all** from the
board — connection refused, `curl` code `000` — while Cloudflare answered 200
from the same machine in 14 ms and the same host answered 200 from a laptop on a
different address. That is a block, and it was earned.

Three causes, and the biggest one did not look like traffic:

1. **`errExcerpt` runs ffmpeg against their HLS playlist**, so one "load" is a
   stream of segment fetches. There is no `fetch` on that line, so it read as
   local work. Four button presses pulled four minutes of their bandwidth for
   the same four minutes of audio.
2. **The search was repeated for a year that ended sixty years ago** — 543
   immutable rows, re-asked on every press and every test run.
3. **A refusal was answered with another request.** No backoff at all, so the
   moment they started saying no, we asked faster.

⚠️ And **the refusal reached nobody**: the fetch threw, the box replied
`board.error`, and no client was listening for that type — so the page spun and
the harness sat out its full 30 s timeout reporting *"no box in this room"*
about a box that was answering fine. A blocked dependency and a dead service
looked identical.

It is a public broadcaster's archive, not a service we pay for. One request at a
time, a 2 s floor between any two, disk caches with no TTL for a closed year,
and 30 s → 15 min of backoff that honours `Retry-After`. The tests count
REQUESTS on a stubbed `fetch`, because "it seemed faster" is not evidence about
traffic.

## 51. Asking the wrong instrument where the board is

`positron-board.local` does not resolve from this sandbox (mDNS is multicast UDP),
a ping sweep answered nothing useful, and grepping `arp -an` for Raspberry Pi
MAC prefixes missed a board that was sitting on the subnet the whole time. One
line found it in a minute: `nc -z <ip> 22` across the /24, then `ssh` and ask
its hostname.

⚠️ And it answers over the RELAY from any network at all, so **"I cannot ssh to
it" is never the same as "it is down"** — a thing said out loud today before
checking. Ask the relay first; it needs no LAN.

Second trap in the same hour: **the service runs from `/opt/positron-board/`, not
`~/positron/`**. `provision.sh` unpacks into the home directory and `setup.sh`
copies that to `/opt`, which is what the unit file executes — so the copy in
`~/positron` is stale, has no `pappus.mjs` at all, and reading it says nothing
about what is running. `push.sh` now writes to `/opt` and prints the md5 of what
landed, because "it deployed" and "it says it deployed" have been different
things here before.

⚠️ **A third location, session 21: `push.sh` had been shipping the engine to a
path sclang never reads.** `Engine_Pappus.sc` and `CroneEngine.sc` are
SuperCollider CLASSES, compiled out of sclang's Extensions directory, and
`/opt/positron-board` is not on its class path at all. MEASURED: the new command
answered `CroneEngine: no command 'report'` while the copy in `/opt` had it and
matched the md5 `push.sh` had printed — two copies, two md5s, and the one being
verified was the one nobody compiles. **An md5 is evidence only about the copy
the RUNTIME reads**, and one machine holds several places code can live — a
service unit's directory, a language's class path, a home directory — each read
by something different. ⚠️ And `$HOME` inside an ssh string expands on the
LOCAL machine, so the first version of that fix built every path for the Mac.

## 52. The stream was bit-clean and the sound was still broken

`rack` went out, and the report came back: *noisy and distorted*. Everything
measurable about the stream said it was fine, and each check was real:

- the tap's own capture at the source — peak -12.4 dBFS, **zero** sample-to-
  sample jumps over 0.25, biggest jump 0.1396;
- what arrived over the relay, decoded and measured the same way — **same**
  pitch to a tenth of a Hz, same peak, **zero** jumps, 0 frames dropped;
- the suite — 14/14 green.

All of that was true and none of it could find the bug, because **the defect was
downstream of every quantity being measured**. The samples were perfect; the
thing consuming them was throwing them away. `pcm-playout` trims its cushion
back to the floor whenever occupancy exceeds `floor + slack`, and the numbers
did not fit each other: **floor 60 ms, slack 15 ms, frames arriving in 20 ms
lumps.** One frame landing early is enough to cross 75 ms, so ordinary jitter
trimmed ~15 ms of audio mid-note, over and over. That is a click, it repeats,
and it is invisible to every measurement above because it happens after them.

What actually found it was **giving the cushion a number**. `breaks` in the
readout — starves plus trims — went from an assertion nobody had written to
`0 ran dry, 1 trimmed` in a 2.2 s window. The fix follows from the arithmetic:
slack must exceed one frame, and the frame size is **observed rather than
configured**, because every caller feeds a different one and none of them knows
to declare it.

Three things to carry:

- **"The bytes are correct" and "the sound is correct" are different claims.**
  Between them sits a buffer, and a buffer can ruin perfect input.
- **Every stage that can discard data needs a counter on it.** This one had the
  counters all along, inside the worklet, posted every 250 ms — and no page had
  ever read them, so they might as well not have existed. A statistic nobody
  displays is not instrumentation.
- **A user's report beat six green measurements.** "Noisy and distorted" was the
  only correct statement in the room for about an hour.

⚠️ `/keys/` and `grains` ask for the same 60 ms floor and were doing the same
thing, unreported, for as long as they have existed.

## 53. A channel count cannot be inferred, so it has to be announced — and checked

960 int16s is a valid 20 ms **mono** frame and an equally valid 10 ms **stereo**
one. Nothing in the payload separates them, and guessing wrong plays an octave
down — which sounds like a broken instrument rather than a broken header, so it
sends you looking in the wrong place. The Mac sends stereo and the Raspberry Pi
sends mono (`arecord -c 1`), so **both are on the relay at once** and no page may
assume.

Each sender now declares `audioChannels` **and** `frameMs`, and the receiver
checks one against the other: `samples / channels / rate` must come out at
`frameMs`. A mono stream mislabelled stereo lands at half of it. That turns a
wrong header from something you hear into something you read.

⚠️ The field is `audioChannels`, **not** `channels` — `board.mjs` already had
`channels` and it means MIDI channels (16, multitimbral). Two quantities under
one name in one protocol is a bug waiting for somebody in a hurry.

**Proved by breaking it**, which is the only reason the next part is known: an
agent announcing 1 while sending 2 was run in the real room against the real
page. The check fired and the suite went 14/14 → 13/14 — and the failure message
read *"had to correct it to 1"* about a correction **to 2**. The page was
correcting itself and then the next status reply repeated the same wrong claim
and undid it, forever. **A measurement outranks a repeated claim.** Saying the
same wrong thing twice is not new information; the sender *changing* its claim
is, and that is what re-opens the question.

## 54. A component whose CSS was never written

`choice.mjs` shipped emitting `.pos-choice` and `.pos-choice-l`, and **nothing
in `shell.css` matched either**. So `/kit` drew three loose default buttons
under a heading-sized label — a control that reads as unfinished because half of
it was never written. It had a careful header comment explaining that the
options must be segmented "the same way `stepper.mjs` does it"; the comment was
right and the code that would have done it did not exist.

Two things: **a class only the script knows about is not a component**, and the
segment now carries `step` — the stepper's own class — rather than a second
implementation of the same 1 px border overlap. The fix for "these look like
three unrelated buttons" already existed in the file next door.

## 55. The ssh-deafness rule does not transfer to a process tap

The parked m1 rig is written down as **"a capture started over ssh is deaf"**,
measured, true, and the reason its agent had to live in a login session. It does
**not** apply to `audiotap`. MEASURED 2026-09-12: started over plain ssh with
`nohup`, it reported `permission to record system audio: allowed` and delivered
**-5.3 dBFS** through the relay.

The old rule was about `ffmpeg -f avfoundation`, whose TCC subject is the
terminal that launched it. `audiotap` calls
`responsibility_spawnattrs_setdisclaim` and re-execs, so it is its **own** TCC
subject (`studio.positron.audiotap`) and its grant does not depend on who
started it. Same sentence, different mechanism, opposite conclusion — which is
how a working path gets called broken.

It also survives launchd, proved by `kill -9`: back 12 s later with a new pid
and the grant intact, nobody at the keyboard. 🔴 But it is a **LaunchAgent, not
a LaunchDaemon** — TCC grants belong to a logged-in GUI session, and a daemon
would get a refusal that presents as correctly-clocked **silence**, which every
layer above reports as success.

## 56. Orphaned harness browsers filled a relay room and took a live demo down

`studio-1` sat at **16/16 sockets** and refused the board for hours. From the
board it looked like a network fault — it dialled every 30 s and logged
`closed 1006`, which is what a browser reports for a `503`, so the log said
nothing about the real reason. **`/keys/` was down for everyone**, and the first
guess was the Raspberry Pi.

The room was full of **my own leftover Chrome instances**: four orphaned profile
groups from earlier harness runs — `demo-grains-fit`, `positron-grid`,
`nodes-udd`, `nodes-udd2` — 118 processes between them, each holding a socket.
Killing them took the room from 16 to 1 and the board rejoined on its next
retry, unaided.

This is LESSONS #39 with worse consequences. That one says a second browser of
your own makes the HARNESS read broken; this one says it takes **the live site**
down with it, for as long as the processes survive — and they survive a lot,
because nothing reaps them. Three of the full suite's three failures were this,
and all three demos went green when re-run alone.

⚠️ **A redeploy does NOT clear a full room.** Hibernated WebSockets are RESTORED
across a restart — that is what hibernation is for — so the obvious lever does
nothing, and the object itself is the only thing that can close a socket.
Measured: deployed twice, sockets stayed at 16 both times.

The relay now reclaims. Two things were needed and neither is obvious:

- **Liveness cannot be "did it send recently".** A page that is only LISTENING
  to audio sends nothing for minutes and is perfectly alive.
  `getWebSocketAutoResponseTimestamp` is the signal that survives hibernation —
  `wire.mjs` clients send `ping` and the RUNTIME answers without waking the
  object — and an in-memory message time covers the agents, which never ping but
  send constantly.
- **The fallback clock has to be DURABLE.** The first attempt dated a socket
  with no signal from the object's WAKE, which makes it permanently
  un-evictable: every restart resets its apparent age. Measured — all sixteen
  reported the same idle time, exactly the time since wake, forever. One
  `serializeAttachment({at})` at accept (once per connection, never per message)
  fixes it, and a socket with no attachment at all predates the code, so it is
  old by definition.

Eviction runs **only when the room is full**. An idle socket in a room with
space costs nothing, and closing it would be a policy nobody asked for.

⚠️ **Session 22 closed the other half of this, and the general rule is about
guards rather than about browsers.** CLAUDE.md had carried *run the failing
demos ALONE before believing the suite* since session 18 — and **a rule to
remember is the weakest guard there is**, because it fires only if whoever reads
the red output happens to recall it. `verify.mjs` counts other headless Chromes
now and says so, at the start and again at the end when something failed (a
browser that appeared halfway through is the one most likely to have caused the
failure and would not be in the opening count). ⚠️ Its first version reported
**19 other browsers for two**: one browser is about ten processes and the
helpers inherit the whole command line. **A warning that overstates by 10x is
worse than no warning**, because the next reader learns to ignore it — counted
by the process with no `--type=` now, deduped by port, proved by standing a
decoy up and taking it down (**2 → 1**).

And the cause was in the same file the whole time: `CDP_PORT = 9333` and one
shared profile directory, in a harness whose HTTP port had already been fixed
for exactly this. So two harnesses started at once did not collide loudly — the
second found 9333 answering, attached to the FIRST's browser, and drove someone
else's tabs while reporting its own slugs. Reproduced from the old constants:
`Error: cdp timeout: Runtime.evaluate`, which is the error that had taken a full
suite out twice that day. **A rule applied to one instance of a shape in a file
is not applied**, and the profile had to move in the same change rather than as
tidiness, since Chrome writes the port it actually got into `DevToolsActivePort`
INSIDE the profile.

## 57. A class only the script knows about is not a component

Twice in one day, from the same shape. `choice.mjs` shipped emitting
`.pos-choice` and `.pos-choice-l` with **nothing in `shell.css` matching
either**, so `/kit` drew three loose default buttons under a heading-sized
label. Then `grains` appended four sliders to `el('div', 'knobs')` — **a class
with no CSS anywhere** — so they fell into block layout, touching, with every
lane starting at a different x because a wider label pushes its own lane right.
`SPRAY` is two characters longer than `RATE`, so two lanes were indented and two
were not, on a control whose entire job is comparing four values at a glance.

Both had careful header comments describing the layout they were supposed to
have. `choice.mjs`'s even said the options must be segmented "the same way
`stepper.mjs` does it". The comment was right and the code that would have done
it did not exist.

Three things:

- **A component is the markup AND the stylesheet.** Shipping one without the
  other produces a control that reads as unfinished, and it reads that way to
  the person you are building for, not to you.
- **This failure mode is specific to controls nobody else uses.** A shared class
  is styled because three pages would break. A private one is styled by nobody.
  Which is the argument for the kit, now a rule in CLAUDE.md: build from
  `demo/shell/`, and when the thing you need is not there, **ask** rather than
  quietly writing a fourth copy.
- **A stack is not N controls in a div.** Four rows line up only if they share
  one set of COLUMNS, which nothing but a grid on the container can give them.
  Per-element spacing cannot fix an alignment problem.

MEASURED after, at 390x844: label lefts all 16, lane lefts all 61, lane widths
all 250 (was 96 — the lane had never been given the width that was there), value
lefts all 323, vertical gaps 10/10/10. The knob is positioned as a PERCENTAGE of
its own lane, so a fluid lane needed no script and no resize listener; it was
already correct and had simply never been given room.

## 58. A zoomed screenshot is not a broken layout

A phone photo of `/rack/` came back at about 3x: one button filling the screen,
keys running off both edges, text cut off — which reads as a layout that does
not fit. MEASURED at 390x844: `document.scrollWidth` **390** against a **390 px**
window and **nothing wider than the viewport**. There was no overflow. Safari
had double-tap zoomed to a block.

`touch-action: manipulation` was already on the controls and on the keys, so
every tap that MATTERS was covered — and a double-tap anywhere else, on the
paragraph or the readout or the empty space beside a key, still zooms the whole
document. On a page whose entire interaction is rapid tapping, **the places you
miss are exactly where a stray second tap lands.** It is on the document root
now.

⚠️ Pinch is deliberately left alone. Killing it takes a `gesturestart`
preventDefault and removes the only way a reader can enlarge text they cannot
read. A deliberate zoom is somebody asking; an accidental one is the page
misfiring, and only the second is a bug.

The general form: **before fixing a layout from a photograph, measure the
layout.** The photograph shows what the browser DID, not what the page is.

## 59. A randomiser over nine ranges makes one sound, every time

`grains` handed you a whole number and nine sliders and called that a choice.
Every roll landed in the middle of nine ranges — because that is what a uniform
draw over nine dimensions does — so every sound was the same mid-density wash
wearing different digits, and the number printed on screen meant nothing to
anybody. The verdict from the person it was built for was **"mambo jumbo"**, and
that was accurate.

The engine had already learned half of this: `pappus.mjs` rolls a CHARACTER
first and the numbers inside it, with a comment explaining exactly why. The page
did not carry the lesson across. The fix goes one further — **six finished
patches**, each one the whole sound (which instrument, which chord it holds,
every setting for both halves), and **the randomiser picks between patches,
never between slider positions.** A random position is how the mid-range wash
comes back.

- **Curation beats a distribution when the axes are not independent.** Nine
  sliders do not describe nine choices; they describe one surface, most of which
  sounds the same.
- **A reproducible number is only worth showing if somebody wants it.** The
  seed, the "same number again" control and the assert that the seed round-trips
  were all correct, all tested, and all answering a question nobody asked.
- ⚠️ **And when the page stopped rolling, a readout started lying.**
  `params.state` answers with the last dice ROLL; the page now sets each
  parameter directly, so the roll's names had stopped being in the sound while
  the panel still drew them.

## 60. Two files, one instrument, named after the files

`/keys/` drew a button per soundfont on the board, labelled with the filename:
`FluidR3_GM` · `sf_GMbank` · `hexter` · `yoshimi`. **Two of those four are the
same instrument** — General MIDI, twice — and a visitor has to know what a
soundfont is before they can work that out. The page was showing its storage
layout and calling it a menu.

One `sampled` button now, picking the fullest set. The rule underneath:
**enumerate what a listener could tell apart, not what the filesystem
contains.** Two files that make the same sound are one choice; if they genuinely
differed, the difference — not the filename — would be the label.

⚠️ Still jargon in that row and unfixed on purpose: `hexter` and `yoshimi` are
program names, meaningless to anyone who does not run the board. Renaming them
is a naming decision, not a bug fix.

## 61. A granulator reading the present sounds like the present (session 20)

"Moving the sliders does nothing for sound" was true, reported repeatedly, and
had nothing wrong with the engine behind it.

Pappus reads its grains from a ring buffer whose read head FOLLOWS the write
head (`mscanmode 1`). With an instrument still playing in, the grains are
re-reading material as it arrives, so the output is a copy of the input — at any
grain rate, any grain size, any scan position. MEASURED on real scsynth 3.14.1
and then again on the board over the relay:

    input live      mrate 0.5 / 6 / 24   rms 0.0575 / 0.0579 / 0.0580
    input REMOVED   mrate 0.5            rms 0.0642  flutter 0.377  gaps/s 0.0
    input REMOVED   mrate 24             rms 0.0410  flutter 0.692  gaps/s 4.6

**No sweep of the parameters could have found this, because the parameters were
never the variable.** Only removing the input could. The page has a `Hold`
control now — `lock` to keep the material and `src 1` to stop the input being
mixed into it — and it is the primary one, because it is the difference between
an instrument and a very expensive copy.

⚠️ **Two of my own negative controls were wrong, and a wrong control is worse
than none** — it produces a confident null. `mswarm 0` is not "no grains": it
controls grain DUPLICATES and their detune (`swiva`/`swivb` are −7/−12/+7/+12),
so it measured inert for a reason that said nothing about the subject. And
moving `mscan` did not discriminate either, because of the follow above. Before
believing a control proves absence, check that it can produce presence.

## 62. A value outside an enum is not an error, it is silence

`msrc` selects the granulator's source: **1 OFF, 2 STEREO, 3 MONO L, 4 MONO R**.
There is no 0. A 0 fails every gate in the graph — `ssel > 1.5`, `> 2.5`,
`> 3.5` are all false — so nothing is ever captured, the granulator plays an
empty buffer, and it does so correctly and silently. Every probe run against the
board on 2026-09-12 used `msrc 0` and therefore measured nothing about pappus at
all; a whole day of "the parameter does nothing" readings were about an empty
buffer.

🔴 **And the board had the same shape in its own startup.** `run-pappus.scd` sent
`msrc 1` — OFF — so **granulator ONE never recorded the instrument**, for the
life of that file, while `grains` drew nine numbers for it and a slider moved
them. `1` does not even pause the write; it erases (#46).

The general form: when a parameter is an ENUM, a value outside it does not throw
and does not warn. It selects nothing, and selecting nothing is a valid,
inaudible state. Read the table before sending the number.

## 63. A cap with no error is indistinguishable from a bug in your own code

wasm scsynth refuses a `/d_recv` over **64 KiB** and says NOTHING — no `/fail`,
no reply of any kind. The first thing the server says is
`/fail "/s_new" "SynthDef not found"` some seconds later, which points at the
wrong thing entirely: it reads as "my synthdef name is wrong" or "my buffers did
not allocate", and both were investigated first.

Bisected with a ladder of generated SynthDefs: 52,730 B loads, 68,892 B does
not, and 65,536 is inside the bracket. Identical under both transports, so it is
scsynth's own OSC path.

⚠️ **And the library returns a SUCCESS OBJECT for it.** `loadSynthDef('pappus')`
answered `{"name":"pappus","size":118597}` with no `synthdef/loaded` reply
behind it. Third instance of #22's shape in this project: a value that reports
INTENT while reading exactly like one that reports DELIVERY. Watch the server's
own reply, never the wrapper's return.

The bracket is what turned this from "impossible" into arithmetic — LITE was
11.8% over, and four compile-time cuts made it fit.

⚠️ **CORRECTED, session 22: that ceiling is SuperSonic's, not wasm scsynth's,
and it binds the MESSAGE.** Against the official wasm backend, LITE (74,733) and
FULL (121,425) both load and both play, and the largest definition it takes is
**860,000 bytes** — so the first sentence of this entry names a platform for a
limit that belongs to one port. Native scsynth refuses at **65,488** over UDP
(`EMSGSIZE` at the sender, from `SC_ComPort.cpp`'s `kTextBufSize` on the UDP
port alone), nothing was found at 1,000,000 over TCP or via `/d_load`, and
**anything sclang sends becomes `/d_load` above 16,383 bytes** — so the board,
which uses `.add`, has never been bound by any of it. That it binds the message
rather than the definition is proved rather than argued: adding a 12-byte
completion message moved the definition edge 65,520 → 65,504, exactly the 16
bytes it costs on the wire. The bracket in this entry is still true of the
engine this repo ships. See #76.

## 64. SuperCollider does not strip an unconnected UGen

Making a stage silent and making it CHEAP are different edits. Setting a gain to
zero, or leaving a value unread, changes the sound and does not change one byte
of the compiled def — every UGen constructed inside the SynthDef function is in
the graph whether or not anything reads it. Removing bytes means skipping the
CONSTRUCTION, behind a compile-time `if`.

⚠️ **And the size does not track the UGen count.** Measured, cutting from
LITE: the shimmer is ONE `PitchShift` and cost 236 bytes; four delay taps are
~28 UGens and cost 2,894. Measure each cut, never estimate it — the four cuts
came to 10,000 bytes and no two of them were predictable from their size on
screen.

## 65. Three ways a CSS rule can be present and inert (session 20)

`/keys/`'s phone layout was written three times before it did anything, and each
failure looked like the rule was absent:

- **It was in the wrong container.** The reverb row is appended to
  `.pos-controls`, not to `.pick`, so a selector for one silently missed it.
- **An inline style beat it.** The page set `display` and `align-items` with
  `element.style`, which beats every stylesheet including a media query.
- **It lost a specificity TIE.** `.pick .fx` in a media block has the same
  weight as `.pick .fx` outside one, so SOURCE ORDER decided and the desktop
  rule won. Media blocks go last.
- 🔴 **And the sharpest: the rule set `flex-direction`, `align-items` and `gap`
  but not `display`, and the computed display was `block`.** All three were
  inert. **A flex property on a non-flex box is not an error, it is silence** —
  the groups touched at a measured 0 px while the stylesheet said 22.
- 🔴 **It was INHERITED past** (session 21, on every demo at once). `.pos-log`
  is a `<pre>`, so `white-space: pre` inherited into `.pos-m` and made its
  `overflow-wrap: anywhere` inert — while the comment above that rule claimed
  the opposite. The repair is `pre-wrap`, not `normal`, because the log aligns
  itself with spaces. Verified the same way: 4 lines and no sideways scroll,
  against 1 line and **1608 px of overflow** when sabotaged.

The tell in every case was the same and it is cheap: read the COMPUTED style,
not the rule. `getComputedStyle` said `flex column center` while the file said
`stretch`, which is what a specificity tie looks like from outside.


## 66. A deadline on a step that asks a human a question (session 21)

`scene`'s entry path ships a log line before and after every await with a
deadline behind it, so that a hang becomes a named failure rather than a black
screen. On a Quest 3 it produced `requestSession immersive-vr never returned`
**twice**, headset black, restart required — and nothing had hung. The page asks
for plane detection and hand tracking, the runtime therefore raises a
**room-data permission prompt**, and the owner was reading it. **Six seconds is
a deadline for a machine.**

🔴 What happened next is the part worth keeping. The deadline fired, the page
declared failure and tore its own entry path down, **and then the session
started** — a headset standing in an immersive session that no code owned,
drawing nothing, with no render loop, no exit-on-any-button and no bail-out
timer, because all three are registered after the step that had just "failed".
*The instrument built to turn a hang into a named failure caused one.*

Two rules, and the second is the portable one:

- **A step that can put a dialog in front of a person is on human time.** The
  prompting step gets 90 s and says *"is there a permission prompt waiting for
  you?"* instead of "never returned"; everything after the session keeps the
  short deadline, because `makeXRCompatible` is not going to ask anybody
  anything. A timeout is a statement about who you are waiting for, so it has to
  be set per step rather than per file.
- 🔴 **`Promise.race` does not cancel the loser.** The request was still in
  flight, so "give up" produced a resource nobody owned rather than nothing at
  all. **A timeout on an operation that ACQUIRES something must keep hold of the
  promise and dispose of what arrives late.** The late session is now caught and
  ENDED, so the worst case is "it did not start" instead of a restart.

scene 28/28.

## 67. Three ways code can be present, correct, and inert (session 21)

#65's shape, one layer down from the stylesheet. Each of these read as working,
and none of them could affect anything:

- **It ran at the wrong moment.** The strip's gutter sizer was correct and ran
  in `resize()`. But `setLanes` does not resize, and a page sets `L.subLabel` by
  reaching into the lane object long after both have run — `typist` does it
  every time its numbers change — so the width was decided while the strip had
  no lanes, or no numbers in them, and never revisited. MEASURED in that state:
  **a lane handed a 458 px number still got a 92 px gutter.** It runs in
  `layout()` now, cached on the TEXT, because nothing tells us when a client
  mutates a label. The tell is a question, not a search: **ask when a function
  runs against when its input arrives.**
- **It was computed and never read.** `media-master` derived `ctChangedAt` and
  used it nowhere, while the file's own comment had claimed the guard for months
  — "preferred only when the callback arrived AFTER the last observed change of
  `currentTime`". Read now, it catches what the existing rejection cannot: a
  scrub SMALLER than `jumpMs`, which parks the vector on the pre-scrub picture
  up to 250 ms out with no creep to notice it by. The tell is #30's: **grep for
  the READER, not the declaration.**
- **It sat below a throw.** `scene`'s head-locked panel read a parameter of
  `drawRoom` and one of the per-eye loop's own `const`s from outside both, so it
  threw `ReferenceError: proj is not defined` **385 times in one 49-second
  session** and the panel has never once been drawn in a headset. The
  `xrFrames === 1` block that ships the first frame's `getError()` sits after
  it, so that session's device log carries **no `first headset frame` line at
  all** — the previous day's by-phase instrumentation, deleted by a
  ReferenceError three lines above it. **An uncaught error in a render loop does
  not stop the loop; it removes everything below it** while 3,840 frames go by.
  So **an instrument that reports nothing is a claim about the instrument
  first.**

⚠️ **And the reason the first one was found at all is the more valuable rule.
NEITHER SHIPPED PAGE EXERCISED IT** — `typist` declares `gutter: 132` and `draw`
takes the 92 px default with short labels, so a sizer that did nothing read
identical on both, at every width, for as long as it existed. Finding it needed
a **positive control built on purpose**: one real lane fed a growing number at
390 px, which walks the gutter 92 → 111 → 150 (cap) as the text goes 0 → 90 →
187 px. **A capability no caller exercises is covered by none of them, however
many callers there are**, and the only way to learn that is to write the caller
that does.

## 68. A clamp that overrides what the caller declared, and does not say so (session 21)

`typist` passes `gutter: 132` because it knows what its lanes carry. Below
`narrowAt` the strip did `Math.min(132, 46)` and gave it 46. Photographed on an
iPhone: three lanes reading `ty…`, `52…`, `64…` — a lane whose name and BOTH of
its measured numbers were each a single ellipsis. The page asked, was ignored,
and had no way to find out.

The reasoning in the comment was that a 92 px label column eats a quarter of a
360 px plot. That prices the plot and forgets to price the words, and it is the
worst available trade: the gutter still took its slice and gave nothing back for
it. CLAUDE.md already says that anything truncating with an ellipsis is in the
WRONG PLACE — here it was in the right place at a made-up width.

**A default may be overridden by a caller. A caller's explicit value may not be
overridden by a default.** When the value genuinely cannot be honoured there are
three honest moves — honour it, refuse it, or report it — and a silent
substitution is none of them, because it removes the only evidence that the
caller and the library disagree. `narrowAt`/`gutterNarrow` are gone; the width
is MEASURED, bounded below by `gutterBase` so pages do not each get a different
left edge, and above by `gutterMaxFrac` (0.42) of the canvas. typist and draw at
360/390/430/520/900: nothing cut, every line drawn.

## 69. An edit script that asserts as it goes, and writes at the end (session 21)

A patch script checked each of its edits against the buffer as it applied them
and wrote the file once at the end. A later assertion failed, the script exited
— **and every edit that had already matched went with it.** The call to
`drawHeld` had landed in a pass that completed; the function itself was in the
pass that did not, so the page shipped a call to a function that does not exist.

🔴 **The symptom named something else entirely.** `drawInner` threw `drawHeld is
not defined` every frame, `draw`'s catch set the room not-ok, and `applyLook`
refuses while the room is not ok — so **a missing function reported itself as
"no fade started"**, in two unrelated asserts. What found it in one look was the
page's own log line, which said exactly what it was.

Two things:

- **A tool that mutates a file is all-or-nothing, or it says what it did.**
  Anything else leaves the tree in a state nobody chose and nobody is told
  about, and that state is indistinguishable from an edit that simply did not
  match.
- **The distance between a throw and its red assert is unbounded**, so a failure
  message is a starting point and never a diagnosis. Read the log line before
  reading the assert. Two of the three mistakes in that same commit were the
  same species — `onLog` was not in scope, so the handler for a failed compile
  would itself have thrown, and `hands` and `HOLD_HAND` were never declared.

scene + mirror 49/49 after.

## 70. Sabotage catches DECORATION, not only regressions (session 21)

#7 says prove a guard fires. This is the same move aimed at the **test you just
wrote for the fix you just made**, and it is a quieter failure, because
everything is green either way.

`diagram.mjs` gained two new checks and **both passed on the old, broken code**:

| the test | why it was decoration |
|---|---|
| the gutter is sized by what its names need | it used widths where the old flat-30% rule never bit either way |
| a name clears a diagonal line | it measured clearance at the label's MIDPOINT, which is exactly where the broken rule was already correct |

Both were rewritten until they went red on the old code, and both carry a
comment saying why. Three more of the same shape in one day, each caught only
by breaking something on purpose:

- The room's overlap fix: with it disabled the 2,000-room sweep went red **while
  the single-room check PASSED** — 1,301 of 2,000 rooms had an overlap, so one
  room in three was already clean and a check of the room on screen misses this
  two times in three.
- `pappus-live`: forcing its resolution guard stuck ON read **17/17**, because
  an abstain and a separation are both "not a failure", so a guard stuck on
  looks exactly like a working one. A deterministic case (five wobbles apart
  MUST be resolvable) is what separates them.
- `media-master`: the new `ctChangedAt` check passes against a fake whose
  `currentTime` never changes, so the sabotage would not have gone red — the
  check had to be given an element that moves. (#61: before believing a control
  proves absence, check that it can produce presence.)

**A test written after the fix passes on the fix by construction.** The only
thing that separates a check from decoration is watching it go red on the broken
code — and the sabotage has to be able to show the defect: at the point where
the old rule was already correct, on inputs where it never bit, or against a
fake that cannot exhibit the thing, broken is as green as fixed. `typist`'s
glyph check is the shape to copy, because its two sabotages are opposite
failures: never test for room reads **52 of 52** legible, never draw a glyph
reads **0 of 52**, and the shipped assert (1 of 52 at 20 px/s, 6 of 6 at 400)
cannot pass under either.

## 71. A ratio met on the first run is a threshold wearing a ratio's clothes (session 21)

`plan-gesture` P3 pre-registered `> 2x` before measuring anything, and the first
run returned **2.1x**. Pre-registration is what is supposed to stop a threshold
being tuned until it passes, and here it did not help, because the quantity is
not a constant — the same comparison across the knob's OWN range spans
**9.0x → 1.9x → 0.5x**, and at the top the order crosses:

| sample every | one 2-D record | as two 1-D records |
|---|---|---|
| 100 ms (the default) | 0.146 px | 1.9–2.4x worse |
| 300 ms (top of the knob) | 4.32 px | 1.9x worse |
| 500 ms (past the knob) | 24.63 px | **0.5x — two records WIN** |

So `> 2x` was a property of ONE gesture at ONE knob position, and shipping it
would have meant a check that holds at the default and is false at settings the
page itself offers. What ships asserts the ORDER at every rate the knob offers,
plus "the gap reaches 2x somewhere in that range" — both ends of the ladder,
never its middle. Broken on purpose: gating both axes together gives 1.0x and 30
of 30 shared instants, and it goes red.

**Before asserting on a ratio, measure it across the range of every control that
feeds it.** A ratio is a relationship only where it does not change sign;
everywhere else it is a number that happened on the day you wrote it, and a
number pre-registered is still a number.

## 72. A flag whose fall-through gives the same answer is a flag nobody tests (session 21)

`PAPPUS_LITE=1` reported FULL while `getenv` plainly returned `"1"`:

    e == "1"                                ->  true
    #["1","lite","true","yes"].includes(e)  ->  FALSE
    .indexOf(e)                             ->  nil

`Array.includes` compares by IDENTITY in sclang, and two Strings with the same
characters are different objects. The check read correctly, tested true under
`==`, and **was always false — in both directions, since the day it was
written.**

🔴 The reason it survived that long is the general rule. The fall-through reads
the device tree, and a Raspberry Pi answers LITE anyway, so on the machine
anybody would have tried it on, **the broken flag and a working flag produce the
same rung**. A flag is only tested by setting it to each of its values and
reading back which branch the program thinks it is in, on a machine where the
default DISAGREES with the flag. Here that took a weighing run asking for LITE
on purpose and getting FULL — 121,425 B against 74,733. Fixed with
`indexOfEqual` and proved both ways: `=1` reports LITE, `=full` reports FULL.

⚠️ And the portable half: **in any language where strings are objects, a
membership test may be an identity test.** `==` and `includes` disagreeing about
the same two values is silent, and it reads as a perfectly ordinary guard.

## 73. A list of open work is stale within hours unless striking off is part of finishing (session 21)

The queue at the top of `HANDOFF.md` was written at 15:18 and **three of its
items were false by 18:45**: it said `pappus-live` had never met the engine (it
had — 17/18 with one abstain), that TINY was unweighed with `report` in (803 B
of headroom), and that `grains` had not adopted the diagram (it had). All three
were finished within four hours of the block being typed, by the session that
typed it.

Nothing was wrong when it was written, and nothing was wrong with the work. What
was missing is that **striking an item off is part of finishing it, not a sweep
at the end** — a sweep happens when a session closes and the list is read when
the next one opens, so every finished item spends that gap lying to the only
person who reads it. The three were recorded as having been stale rather than
quietly edited away, which is the only reason they can be quoted here.

⚠️ The same failure at a larger scale, in this file: **`LESSONS.md` went from
session 20 to session 21 untouched** while one day produced eight entries' worth
of material. `PROGRESS.md` records what HAPPENED; this file records the RULE.
Only the second transfers to a different file on a different day, so a session
that writes the story and not the rule has kept the half that cannot be reused.

## 74. The evidence was on the wire, and in the dump nobody read (session 22)

`grains` made no sound for hours. The board streamed 50 frames a second
throughout, answered every question, reported the right material and the right
parameters, and produced nothing — because `Engine_Pappus.sc:804` gates every
grain on `trig * (gates[i] > 0.001)` and one `note.panic` from anybody had shut
all eight. Nothing ever reopens them: this page's notes go to the INSTRUMENT,
and the box only routes them to the granulator when an archive is set. One probe
changing one thing separated it:

| | rms | grains/s |
|---|---:|---:|
| the page's exact configuration | **0.000000** | **0.0** |
| + `gates [1,0,0,0,0,0,0,0]` | 0.016037 | 1.5 |

🔴 **And the board had been saying so the whole time.** `params.state` returns
`notes.gate`; it read `[0,0,0,0,0,0,0,0]` through every failing run, including
in the dump handed over to diagnose it. #52 says a statistic nobody displays is
not instrumentation — this is the harder version, because it WAS displayed, to a
reader looking for exactly this, and **a field that is reported and not read
costs the same as one that was never sent.** When a dump arrives, read every
field in it against what the page assumes before forming a hypothesis: the one
that is wrong looks as ordinary as the rest.

⚠️ **The other half is that a shared instrument is an OBJECT, not a function.**
It keeps whatever the last person left it with, so "this page never sets it"
means "it is whatever somebody else wanted". Twice in one session: the note
gates, and the nine stages downstream of the granulator — a resonator bank, two
delay controls, four colour controls and two reverb controls — any of which is
heard in the board's pane, cannot be heard in the browser's, and is reported by
the page as a difference the granulators made. Both are #46 and #62 in a new
costume, and an earlier sweep for exactly this state enumerated `msrc`, `mlock`,
`mscanmode`, `msos` and the nine bypasses **from memory** and missed the one
control that decides whether the instrument exists at all. Enumerate from the
graph, not from recollection.

## 75. An assert on ink must exclude the furniture (session 22)

`strip has ink` was green for the life of the page and its only lane **had never
drawn anything.** `follow` defaults on and the playhead sits at position 0 =
1970, which is 93% of the way through a year-100 → 2100 range, so the window
scrolled forward before the first frame and both spans went off the left edge.
MEASURED: **7 lit columns in the whole lane band, and all seven were grid
lines.** The assert sampled the axis, which the page draws unconditionally, so
the only way to make it red was to stop drawing the grid.

**An ink check samples the region only its subject can draw in, and reports a
COUNT rather than a yes.** "7 lit columns, and every one of them is a grid line"
is a sentence somebody can look at and disbelieve; "has ink" is not. Same family
as #36 and #40 — a page has a
class of defect its own checks structurally cannot see — with the twist that
here a check existed, ran every time, and was pointed at the furniture.

⚠️ And the fixture was doing the same thing to the readout beneath it. Three
cells were properties of the epoch rather than of anything: `pps` 9.08e-9
printed `0.000`, `ceiling` was `Math.round(Infinity)` and printed blank, `ulp`
5e-324 printed `0.000 ms`. The fourth printed a DATE — `formatTime(lod.major,
lod.major)` with no third argument, so a 500-year DURATION over 1e12 took the
absolute branch and the cell read `2469-12-31`. **A fixture chosen to exercise
the extremes of a range makes every derived cell a fact about the fixture.**

## 76. A conclusion can survive its reason, and the reason is what gets inherited (session 22)

Three in one day, each a decision that stood while the sentence defending it was
false:

- **The even-readout rule.** It said the row is `repeat(auto-fit, minmax(96px,
  1fr))`, so a phone gets two columns and an odd count holes the last row.
  MEASURED at thirteen widths: 96 px plus a 1 px gap gives **three** columns from
  about 353 px up, so a **4-cell** readout — the commonest shape in the repo —
  holed from 353 to 426 px, which is iPhone SE 375, iPhone 12–15 **390** and
  Pixel 412, and a 6-cell one holed four slots wide at 560. The rule was being
  enforced all day, by an agent doing a UI sweep, while the exact failure it
  names happened on every phone anyone owns.
- **The 64 KiB ceiling.** TINY is the right rung and its stated reason was wrong:
  "wasm scsynth refuses a `/d_recv` over 64 KiB" is true of **SuperSonic**
  (65,520, which is what this repo deploys) and false of wasm scsynth — the
  official backend takes **860,000 bytes**, where LITE at 74,733 and FULL at
  121,425 both load and both play. A limit belonging to one port, written down as
  a property of the platform, would have outlived the port it was about.
- **The controller meshes.** Rejected on an itemised cost — a container parser,
  an accessor decoder, a node walk, **a PNG decode** and a third renderer. The
  PNG decode is `createImageBitmap` on a Blob and one `texImage2D`: it is not
  work. The reader came to **181 lines**, the meshes shipped, and **an argument
  with a free item in it is wrong even when its conclusion is defensible.**

**A rule defended by a false reason is one nobody can correct**, because the next
person who measures the reason concludes the rule is wrong too, and cannot tell
the two apart from outside. Two things follow. Correct it **where the claim
lives** — in the rule, in the constant's comment — not in a commit message
nobody re-reads. And name the trigger that would re-price it, because a
rejection is only as durable as the cheapest item on its list.

#48 is the same shape from the other end: there the premise had MOVED (a Linux
build became a signed macOS download), here the premise was never true.

## 77. A reader sees ink, and a box is not ink (session 22)

Two of these in one session, and neither was a spacing bug:

- 🔴 **An empty container paints its own edges.** The "horizontal rule nobody
  wrote" above `typist`'s controls was a `.pos-readout` div with **0 children and
  a height of 2.0 px** — a full-width band made entirely of `shell.css`'s 1 px
  border on each side. `readout: null` empties the row without removing it.
  Repaired in the SHELL (`!showReadout || !keys.length`), not on the page,
  because remembering to hide your own empty box is not something a page should
  have to do: `.pos-controls[hidden]`, two rules below, already exists for the
  same failure leaving a 14 px band.
- **A padding equal to the layout and unequal to the reader.** The XR tablet's
  `PAD` is one number used all four ways — 48 design px, on a canvas whose aspect
  matches the object's, so it was equal in MILLIMETRES too — and it was reported
  from the headset as unequal, correctly. A row's box is as tall as the tallest
  KIND of control, which is a button plus its focus ring; a slider's lane sits
  centred in that box, so the gap from the canvas edge to the first thing you can
  SEE is `48 + (ROW_CONTENT − laneH)/2` vertically against 48 across. The ring is
  invisible until something has the pointer on it, which is most of the time.

⚠️ **The fix is to pad to the INK, not to shrink the ring** — the ring needs its
room or it is clipped by the canvas edge, which reads as a drawing fault. It
comes OUT of the outer pad rather than being added to it.

The rule: spacing is measured to what is visible. A box with nothing in it is a
line; a box taller than its content is air nobody asked for; and both are
invisible to anyone who reads the constants instead of the screen, because in
the constants they are perfectly symmetrical.

## 78. A test can pass because the FIXTURE is benign (session 22)

The GLB reader rounded every chunk length up to the next multiple of four — a
SECOND padding on top of the one the spec already requires — so it would have
walked past the binary chunk of any file whose JSON chunk was not aligned. It
never did: **both vendored files happen to be aligned** (a 10,768-byte JSON
chunk), so every check passed straight over it — including the **six negative
controls built by corrupting the real file**, because a fixture corrupted from
an aligned file is still aligned. Sabotage (#70) cannot reach a defect the
fixtures cannot express.

What found it was reading `GLTFLoader.js` v0.186.0 against the file line by
line. The same pass recovered MAT2/MAT3, missing from the type tables, and
refused the sparse-accessor path and `normalized` **by name** rather than
ignoring them — checked against the bytes, 0 of 23 accessors are either.

**When you implement somebody else's format, your fixtures are a sample of that
format's accidents, not of its rules.** #43 by a different route: there the
reference implementation graded us by running, here by being read. The cheap
defensive half is the part that generalises — **refuse by name what your
fixtures never contain**, so the first file that is not like yours says what is
wrong with it instead of parsing into garbage.

## 79. A default that every caller overrides is a default reporting its own defect (session 22)

*"I do not understand what that 209.31 s and dark yellow area is"* — a
wall-clock cursor, armed on first play, photographed on `draw` as an amber band
across half the strip. What it measures is how far the piece has fallen behind
real time since it first played: the number to watch on a live feed, and noise
on a fixture, where once the playhead stops it just counts how long ago you
finished.

🔴 **The evidence that the default was wrong was already in the repo, in
thirteen places.** Of the thirteen pages that use a strip, **TEN passed
`armWall: false`** and the other three call `armWall(anchor)` with an anchor of
their own. Not one wanted the auto-arm, and the seven that never mentioned it
were getting a second cursor they had not asked for. **Ten authors turning a
thing off one at a time is a default announcing its own defect** — and nobody
had read the ten together, which is a `grep` and #30's move: look for the
READER, not the declaration.

⚠️ The ten `armWall: false` are REMOVED rather than left standing. A redundant
option is a question for the next reader — *why does this page turn off
something that is already off?* — and the reasoning, which had been written down
in one page's comment, moves to the default itself, where it is read by whoever
is deciding rather than by whoever is copying a page.

## 80. Installing a toolchain on a machine you do not own is an outward-facing act (session 22)

This machine is Defender-managed and **SIGKILLs locally compiled binaries**. It
is written down twice in this repo's own research:
`research/uuu-integration-2026-09.md` says to get csound onto a different
machine for exactly this reason, and `research/scsynth-wasm-official-2026-09.md`
records it as why that entire measurement was taken with a PREBUILT `.wasm` and
no compiler. A background agent went at it anyway, and the result was not a
failed build — it was security prompts on the owner's screen, in the middle of
something else.

**A background agent's footprint is on somebody's real computer.** A build, an
install, a downloaded binary and a permission dialog are not local, not silent
and not reversible, and the dialog lands in front of a person who did not ask
for it and cannot tell which of several running agents raised it. So the order
is: a prebuilt artefact; or a machine that already has the tool
(`timeline/lab/csound-ssh.mjs`); or a check that **skips cleanly** where the
reference is absent (#43). If none of those work, say so and stop — asking costs
a sentence, and a security event on somebody's laptop costs their attention at a
moment they were not thinking about this at all.

#10 with the stakes raised: the constraint was in this repo, in two files, in
plain words, and was re-learned anyway.

## 81. "The same X at both ends" is a claim about one definition (session 22)

`grains` said *"the same granulator in this page and on a Raspberry Pi"* and it
was false. The page ran a Web Audio worklet — a reimplementation that sounds
similar, which is a different sentence — and **no amount of A/B can promote
"similar" to "same"**, because every comparison an imitation is built to pass is
a comparison it passes.

It is literally true now. The left pane is real scsynth running the board's own
compiled graph: **64,733 B of SynthDef taken in 22 ms, 1,571 building blocks**
(1,467 Pappus + 104 `PosSource`) at 48 kHz, with node order asserted from the
server's own `/g_queryTree.reply` rather than assumed. 🔴 And the caveat ships
beside the claim instead of quietly: **the material is still a SECOND
definition**, because `Engine_Pappus.sc:518` granulates a bus and nothing in a
browser fills one.

⚠️ **Both ends are graded against what was ASKED, never against each other** —
2.2 grains a second in the page and 2.2 on the board, against 2.2 on the slider,
with a deafness control at each end (tab 0.005569 → 0.000000, board 0.1086 →
0.0000). Two implementations compared only with one another cannot say which of
them is wrong; when they disagree it names no culprit, and when they agree it is
not clear what has been learned.

## 82. Two numbers that cannot disagree are one number (session 22)

A red `webrtc` was explained as *"Cloudflare is not sending a keyframe"*, on the
strength of `keyframes 0` in the page's own failure detail. That cell is
`s.keyFramesDecoded` — keyframes **this machine decoded**, a subset of
`framesDecoded`, which was also 0. It could not have read anything else. It is
one observation wearing the far end's name, and it moved the diagnosis onto
somebody else's server.

The page already ships the counters that DO separate the cases, and says why in
a comment directly above the line they are read in: `received`, `decoded`,
presented, because *"videoWidth is 0 alone cannot tell apart 'no video RTP
arrived at all' from 'packets arrived and the decoder produced nothing' from
'frames decoded but never presented' … three different bugs"*. The diagnosis
reached past all three for the one that cannot discriminate. (The real cause was
another browser of mine — 14/14 when run alone, #56.)

**Before quoting a second number as corroboration, ask whether it could have
come out differently from the first.** A subset counter, a derived rate and a
ratio with a zero denominator all agree with their parent by construction, and
two numbers that agree by construction read exactly like two witnesses.

## 83. The room measured and the room used must come from one function (session 22)

`gutterWidthFor` reserved `11 + text + 10`, and `drawGutter` clipped every line
against `gutterPx − 18 − 8` — the NAME's inset, applied to the numbers as well.
So a sub-line was measured against 19 px of chrome and cut against 26, and **any
sub-line long enough to SET the gutter width was always one character too long
for it**: `usual 12 ms` sized the gutter and rendered `usual 12 …`. A component
that widens itself to fit its own text and then truncates that text is the worst
version of this, because it paid for the room and then did not use it.

⚠️ **And then it was still cut, by a sub-pixel.** The requirement is a measured
text width with a fraction on it, and `Math.round` took 111.4 to 111 — leaving
the line that set the width a fraction short. The clipper does not do
sub-pixels; it drops a character and adds an ellipsis. `Math.ceil`. **A
requirement is rounded UP, or it is not a requirement.**

Wherever one piece of code decides how much room a thing needs and another
decides how much it gets, they are one function or they drift — silently, and
into a symptom (an ellipsis) that reads as a text problem rather than as two
constants disagreeing.

⚠️ Neither defect could appear on any page that ships: `typist` declares its own
gutter width and `draw`'s labels are short. **Third time in one day that this
component's real behaviour only showed under a control built on purpose**, which
is #67's closing rule — a capability no caller exercises is covered by none of
them, however many callers there are.

## 84. `requestAnimationFrame` is a paint callback, never a trigger (session 23)

FOUR INSTANCES IN ONE DAY, three of them mine and one of them in a measurement
I was using to check the others.

Two jobs get conflated. **When does this happen** is a schedule. **What does the
screen show this frame** is a paint. rAF answers the second: the browser calls
you just before it composites, and it makes no promise to call you at all.

✅ MEASURED: in a background tab a one-second rAF loop **did not finish in
forty-five seconds**.

Where it bit:

- `/click/`'s play loop fired beats inside `frame()`, so a beat's TIME was
  whenever rAF happened to call. `late` read **2487.2 ms** — every millisecond
  of it the browser's throttling, none of it the page's arithmetic. On
  `createDeck`'s worker tick host, same tab, same conditions: **2.1 ms**.
- The lamp fade redrew itself every frame.
- Then the lamp fade only ARMED a CSS transition one frame later, to get a
  committed starting style — so in a hidden tab every lamp lit and none faded,
  and two sat at full size at once. The trigger had moved, not gone.
- And twice more in my own instruments: a rAF-driven ramp measurement never
  ticked at all, and the `setTimeout(16)` version was clamped to ~1 s so every
  step jumped straight to target. **Both would have reported a perfect ramp for
  code that was broken.**

**The rule: rAF may decide how something LOOKS this frame. It must never decide
whether or when something HAPPENS.**

⚠️ AND THE RENDERER IS NEVER THE QUESTION. Asked whether SVG would fix it: no.
SMIL is the same class of thing as a CSS transition — declarative, on the
browser's own timeline. DOM, SVG and canvas would all have had this bug,
because the bug was in the trigger. What removes it is asking for the whole
animation at once (`el.animate()`), or putting the clock somewhere that is not
the compositor (a worker, an AudioContext).

## 85. A passing check is not a message (session 23)

Every `d.assert` wrote a prose line into the page's log, so a page opened with
nine sentences nobody reads — `ok their real score compiles — 25 rows` — and a
real event afterwards had to be found among them. Reported as **"slop log"**,
and the word is right.

**A check that passed did not HAPPEN, it held.** The log is for things that
occurred, at the moment they occurred.

⚠️ THE ASYMMETRY IS THE WHOLE RULE. A FAILURE is a message and keeps its line.
The tally goes out once, from `ready()` — `ready · 10/10 checks`.

⚠️ And it was safe to change because nothing parses those lines: the harness
reads `__demo.asserts`. Check that before touching any output that looks
decorative; the reason this repo has the rule about assert COUNTS is that they
are read by a machine.

## 86. A warning about a misleading readout is not a fix (session 23)

`PAPPUS READY … lite=true` prints on a board running TINY, because the engine
does `if(tiny) { lite = true }` — so `lite` is true on three rungs of four and
NAMES none of them. It is the last line, the one that says READY, the one a
person greps for. `Engine_Pappus: TINY graph` prints seven seconds earlier and
scrolls away.

🔴 **AND BOTH `TINY.md` AND `CHAIN.md` ALREADY SAID SO**, in as many words —
*"not `PAPPUS READY`, which prints `lite=true` on TINY as well and cannot tell
the two rungs apart"* — while `writedefs.scd` already printed it correctly.

A session record, a handoff queue and a commit message all stated the wrong rung
anyway, and it was carried as "the top board-side open item" for a day.

**If a readout can be misread, fix the readout.** A comment warning about it
protects only the people who read the comment, which is not the set of people
who read the readout.

## 87. A fade that lives in the render loop cannot stop when the loop does (session 23)

`/floor/`'s projector would not stop. Two separate bugs, and the second is the
general one.

**First: `setGain` carried a 1.2 s ramp and the page called it every frame.** So
sixty times a second it cancelled the ramp in progress and started a fresh one,
moving about an eightieth of the way each time. ✅ COMPUTED: 99% after **six
seconds**, and the same crawl coming down. Reported as *"seems to lag and never
stops"*, which is exactly what it does.

**The shape of a fade belongs to the CALLER**, which knows whether it is coming
up slowly or going away quickly. A node-level ramp plus a per-frame caller is
two things that each think they own the timing.

**Second, and worse: the easing ran inside `step()`, which runs inside rAF.**
Hide the tab and rAF stops — the gain freezes wherever it got to while the
projector's own scheduler carries on putting clatters on the audio clock. There
was no `visibilitychange` and no `pagehide`.

🔴 **STOPPING MUST NOT DEPEND ON THE THING THAT DRAWS.** Three levels, because
any one alone leaves something running: set the gain, stop the scheduler,
suspend the context.

⚠️ **AND LEAVING IS NOT ONE EVENT.** A tab can be hidden, backgrounded,
navigated away from, or put in the back/forward cache. `unload` does not fire at
all on mobile Safari. Wire `visibilitychange` AND `pagehide`, and make the
ordinary stop path go through the same function.

## 88. An analyser on a suspended AudioContext reads its last buffer forever (session 23)

Checking that the projector had gone silent: RMS **0.0119 before, 0.0119
after** — identical, which looks exactly like a machine that never stopped.

It had stopped. A suspended context does not advance, so `getFloatTimeDomainData`
returns the last buffer it filled, indefinitely. **The instrument could not tell
silence from frozen**, and it failed in the same direction as the bug it was
pointed at — the most expensive direction there is.

Measured again with the context left RUNNING and the output muted downstream:
`0.011136 → 0 → 0`.

⚠️ The general form: a meter reading a thing you have just switched off is
reading a corpse. Measure the quantity through a path that is still alive, or
measure something else.

## 89. A threshold set from the data measures the data, not the signal (session 23)

`/floor/`'s projector is checked for running at the film's frame rate. The first
detector found onsets by crossing `peak * 0.4` and reported **8 clatters at
26.6 ms** in the harness against **5 at ~41.7 ms** by hand.

Neither number was the rate. The clatter's amplitude is deliberately random and
there is a noise bed under it, so a threshold taken from the loudest sample in
THIS render counts bed peaks on a quiet one. **A detector whose answer depends
on how loud the render happened to be is measuring the render.**

Autocorrelation of the envelope needs no threshold at all: subtract the mean,
correlate against itself, and the lag with the strongest agreement IS the
period. **42.0 ms against 41.7 expected**, stable across runs.

🔴 Proved by sabotage: at 18 fps it reads 58.0 ms and goes red.

⚠️ Note what the first detector had in common with an earlier failure in the
same session — a peak-counting instrument whose window was 46 ms looking for
events 41.7 ms apart, which can never see a gap. Both are the same mistake:
**an instrument whose resolution or calibration is derived from the subject
cannot be used to measure the subject.**

## 90. An outage is a claim, and it needs the same evidence as any other (session 27)

Twice in one session I attributed my own regression to something outside this
machine. A regex with `[^}]*` swallowed three CSS rules above the one it was
meant to delete, a canvas went to zero height, a click found nothing, and I said
ERR was down. It was serving 294 of 298 tiles at 60 fps at that moment. Then a
second `mark()` added to the same object literal in `grain-scope.mjs` silently
overwrote the existing one, radio's grain ticks stopped, and I said the
station was down.

**The pull is that an external cause explains the symptom without implicating the
last edit, and it is available instantly at no cost.** Both times one command
separated the two stories and both times I reached for the story first. The rule
is not "suspect yourself" — it is that "the thing outside is broken" is a
measurement, so make it, and CLAUDE.md already says the same thing about ERR's
403s and about a second Chrome holding relay sockets.

## 91. An assert derived the way the code is derived cannot fail (session 27)

`roomToEye` had its rotation sign inverted and its assert passed, because the
assert rebuilt the matrix from the same reasoning. What caught it was rendering
through the real path and finding zero pixels at 70 degrees.

This is `timeline/csound.mjs` in a new costume — 22/22 green for months with two
real defects, because the test compared against a number derived from the same
formula the compiler implements. There it was a format and the fix was a real
Csound. Here it is geometry and the fix is a rendered pixel. **Write the assert
from the CLAIM** (facing a word puts it straight ahead) **rather than from the
derivation** (the matrix equals this product).

## 92. Nothing that changes while you watch it may change its own size (session 27)

The LOOP button said LOOP, then END, then LOOP. Three characters against four,
and every press shoved the rate picker and the clock sideways. Same defect as
`grain-scope`'s caption reflowing between three and four lines sixty times a
second, reported then as "a horrible jump of content each time it updates".

The two looked unrelated — one a live sentence, one a button label — and they are
one rule: **a control's footprint is part of the layout, and state must be
carried by something with no width.** Here that is `data-loop`, which paints, and
the aria label, which a screen reader reads and a layout never sees.

## 93. Two numbering schemes met and nobody noticed for a session (session 28)

Session 27 appended three lessons as `## #57`, `## #58`, `## #59` to a file whose
last entry was `## 89.`, and 57 through 59 had been taken since session 20. So
the file carried two `#59`s with unrelated subjects, while four places in the
repo cite `LESSONS #59` meaning the original one about a randomiser over nine
ranges. A reader following that citation lands on a lesson about button widths.

**A number in prose is a foreign key with no constraint on it.** Nothing type
checks a heading, no harness reads this file, and the duplicate looked right
because each of the two schemes is internally consistent. It was found by
reading the headings in order, which is the only thing that finds it.
The repair is renumbering the NEW ones, never the old: the citations point at
the old, and moving a target because a duplicate arrived breaks the references
that were correct all along.

## 94. Twenty-one green checks over a picture that had stopped moving (session 28)

A readout was taken off `weight` and one `d.set` was left behind. `d.set` THROWS on
a key `mount()` never declared, the call was inside `requestAnimationFrame`, and
so the render loop died on its first frame. The page then reported **21/21
green**, because every check on it grades a still image: the font loaded, the
words are words, their boxes contain their ink, a ray lands where the picture
is. A frozen first frame satisfies all of that.

What a person saw was a page where clicking a word did nothing, and one line at
the bottom of the log. Reported as *"no text editing on click. how y missed
it?"*, which is the right question: nothing missed it, because nothing was
looking.

**A check that reads state can pass on a page that has stopped producing it.**
The assert added is `frames` counted ACROSS A WAIT rather than a total, because
`frames > 0` is true of a page that drew once and stopped, and that is the case.
PROVED by putting the original defect back: `1 frames in 400 ms`, red.

⚠️ The general form is worth more than the instance. **Anything that removes a
surface must remove every write to it**, and the ones that bite are inside a
loop, where the throw is invisible and takes the loop with it. `d.set` throwing
is right; a page with no test for "is it still running" is what made the throw
cost an hour.

## 95. Two asserts at t+0 blinded the whole suite (session 28)

The shell gained two asserts of its own, fired at page load on every shelled
page. `demo/verify.mjs` waits for a page to produce its FIRST assert before it
starts timing out, and the test for "has it produced one yet" was
`asserts.length === 0`. Those two made it false immediately, on every page, so
the wait never engaged again and each demo got 12 tries at 400 ms to produce
everything it had.

MEASURED: `/radio/` makes 43 asserts. The suite collected **2** and reported
**13/13 green**. Twenty-eight demos declare `settleMs`, so all of them were
exposed.

**The proxy was fine until somebody else changed what it was a proxy for.**
`count === 0` meant "the page has not started" only while nothing but the page
could assert. Nothing in the shell's change was wrong, nothing in the harness
was wrong, and the two together were silently catastrophic. The shell publishes
`shellAsserts` now, so the harness can ask the question it actually means: has
the PAGE asserted anything yet.

⚠️ And two wrong fixes were tried first, both plausible. Arming the wait on
`d.ready()` fails because a page may call it before driving its own checks:
`/radio/` does, from inside the granulator's boot. Requiring "ready AND the
count is stable" fails the same way, and would have shipped looking correct.
What was needed was not a better heuristic for done, it was the one number that
makes the question answerable.

## 96. A page nobody may run is a page nobody can change (session 30)

`/radio/` has thirty-seven checks of its own and a standing rule that it must
not be run: every station it offers is an ERR mount, and ERR reported that our
listeners were corrupting their audience figures. Both halves are right, and
together they mean the page's decode path and its looper could be edited and
could not be graded. That is not a careful state, it is an unmaintainable one:
the next change to it either ships unverified or is paid for by a broadcaster.

`demo/fake-station.mjs` is ninety lines and ends the dilemma. It serves real
MP3 frames with real ICY headers, a real `icy-metaint` text channel and a
`/health` route in the relay's own shape, paced at its own bitrate so arrival
gaps and buffer depth mean what they mean on a live mount. The page already
took `?base=`, so nothing in it had to change. **MEASURED: 48/48 green, against
zero bytes from anybody's radio**, including the whole LOOP row, the mirror on
samples, and the grain clock locking to a kept lap at 23.00000 whole laps.

⚠️ AND THE HARNESS DOES IT RATHER THAN THE PERSON REMEMBERING TO. `verify.mjs`
starts the stand-in itself whenever `radio` is in the run and appends the base
for that demo alone, because a rule that lives only in a document is a rule that
gets broken on the day somebody is in a hurry. `DEMO_QUERY` still overrides, for
somebody who has been ASKED to check the real relay.

⚠️ It grades OUR code and says nothing about ERR. A stand-in that answered
everything perfectly would hide a mount that 403s, which is why the health route
answers in the relay's shape rather than in a shape that always passes.

🔴 **AND A STAND-IN'S OWN DEFECTS ARRIVE AS FINDINGS ABOUT THE PAGE, WHICH IS
THE TRAP IT CARRIES.** Two in one evening, both caught because the page prints
real numbers. Sending a fixed chunk per `setInterval` tick sends at the rate the
TIMER fires, and node's timers run a millisecond or two late: the page read
**125 kbit/s against the 128 declared**, a listener lost 23 ms of cushion a
second, and `the cushion outlasts the worst gap in it` went red about a page
that was working. Paced against the clock instead (bytes OWED since the
connection opened, plus Icecast's 64 KB burst) it reads 128 vs 128 and holds
**589 ms of cushion against a 55 ms worst gap**, which is the same shape the
real relay measured at 515 ms.

⚠️ The second was in the PAGE and was real: `tightest` folded in every reading
from the moment audio started arriving, so the smallest number it ever saw was
the queue part way through being BUILT. On the open internet the first lump
hides it; on a local link it does not. It is measured after the player's own
four second `startedAt` window now, which is the same boundary `mp3-stream.mjs`
uses to call a dropped block `skipped` rather than `dropped`.

## 97. A measurement that every visitor repeats is a measurement nobody made (session 30)

`/tapes/` draws each recording as wide as it is long, and nothing in the corpus
carried a length. So the page opened twenty-four media elements at
`preload = 'metadata'` on every visit, drew the run at a guess, and corrected
itself over the following seconds. Every visitor paid archive.org for the same
twenty-four answers, and the first thing anybody saw was a picture of the wrong
length.

A duration is a fact about a file. It is measured ONCE, by a program, and
written down: `demo/resources/measure-durations.mjs` asks each of the
twenty-six with ffprobe, one at a time, two seconds apart, with
`-probesize 65536` so it reads a header rather than half a recording, and
`build-corpus.mjs` merges the answers into `corpus.json` as `durationMs`. All
26 answered, including a 990 MB AVI and a 225 MB MPEG program stream. The page
now draws the true run in its first frame and asks nobody for anything.

⚠️ THE FALLBACK STAYS AND RUNS FOR NOBODY. A corpus rebuilt without the
durations step would otherwise silently draw a run of guesses.

⚠️ AND `--offline` MADE IT SAFE TO DO. `build-corpus.mjs --offline` rebuilds
from its cache and asks no source anything: MEASURED byte for byte identical to
the committed file apart from the timestamp, so the durations could be merged
through the generator without a full harvest that might have dropped a row.

## 98. A check that works the instrument takes the page away from its visitor (session 31)

`/tapes/` opened a twelve megabyte recording from archive.org, played it, and
looped it four ways inside three seconds of every visit, because its self-checks
had never been gated. Reported three times. The first two repairs were both real
and both about something else: one shut the sound gate, so nothing reached the
speakers; the other removed twenty-four duration probes, so the widths came off
the corpus. A page can be inaudible, ask nobody for a duration, and still spend a
visitor's bandwidth and run its transport in front of them.

The rule is now absolute and in CLAUDE.md: a self-check never runs for a visitor,
gated on `?selfcheck=1`, default off, no page is an exception. Both excuses that
were used here are recorded with what they cost. *"Nobody is holding this one"*
was `/videoradio/`'s, and it was true of everything the check does except the
one thing that mattered: the check presses full screen, so somebody who pressed
play and then ⛶ had their own full screen taken away about twenty seconds later.
That was reported twice as a mystery timer and was open for two sessions,
because 22 s is also the tour's dwell and 71 s the station clock, so the real
cause hid behind two innocent ones.

⚠️ **A VISIT ASSERTS A STRICT SUBSET, and the suite must walk the visitor's path
FIRST.** The obvious shape is `select(0, { load: SELFCHECK })`, and it is wrong
in the way that let this live: the suite would then take a different path from
the visitor, so the one claim worth checking would be true only on runs nothing
was watching. Every run now walks the cold path and records what it found, then
the suite opens a file on purpose.

⚠️ **AND THE TEST IS MUTATION, NOT COST.** `/tapes/`'s zoom check called
`openFinish()` one frame into the opening animation, so the self-moving zoom
somebody had asked for was being destroyed by the thing grading it. Ask of every
check: if a person were watching this page, would they see it happen?

## 99. Three faults in one symptom, and each had a measurement available in seconds (session 31)

`/crate/` was asked to play a file when a row is pressed. It was reported broken
twice after being called fixed, and all three causes were mine:

1. **CSS pasted INSIDE a rule.** The new `.pick` and `.on` rules landed between
   `.pos-tbl-row {` and its declarations. Nested rules are ignored, so every
   visual change was inert and the row's own layout was broken at the same time.
   One look at the file showed the brace.
2. **`key` is not `name`.** The sidecar carries both. `key` is
   `vain-dev/<stamp>/audio.wav` and answers **200**; `name` is the uploader's
   original filename and answers **404**. The URL was built from `name`. Two
   `curl`s against our own store settled it.
3. **The failure was silent**, so it presented as a transport bug: the element
   never reached `canplay`, the deck kept its one millisecond range, and the
   playhead sat at the end while the log said `playing …`.

Each was cheap to measure and expensive to reason about, and reasoning is what
produced two wrong reports. The repo already says it: measure the quantity in
question. The corollary this session adds is that **a page must not report an
action it did not manage to take** — the log line went out before anything had
loaded, which is what made two different bugs look like one.

## 100. A convention only works if it is legible, and the tie was not (session 31)

Boxes inside one machine were tied with a headless line, on the sound argument
that a head claims an order the drawing does not know. It was reported as a
missing arrowhead on `/station/`, and again on `/replay/`: a headed line, then a
headless one, then a headed one down a single column reads as a head that fell
off, not as "this pair is unordered".

The default reversed. There are three answers now and a container picks one: an
ARROW (they feed each other), `set: true` for a BRACKET (parts of one machine
that do not), and `join: false` for NOTHING, which is right where the container's
own box already carries the whole relationship. `/keys/`'s `Browser` holds a
keyboard and a playout; a line between them adds no fact and gives the eye
something to follow that leads nowhere.

⚠️ Two mechanical traps came with it, both costing runs. A flag added to a node
must be **carried to the render node**: `box()` builds a fresh object rather than
spreading the spec, so `set` was invisible to the painter and read as an option
that did nothing. And `back: true` is an **author flag that nothing infers**: a
return link without it is laid out as a forward step, which drew a line straight
through `playout` and put its head on the far left of the Browser.

---

## 101. Undeployed work and unstarted work look identical from outside (session 37)

The session opened with a request for something session 36 had already built.
`/making/`'s readout had become table columns in the tree and the edge still
served the old page, so from Kristjan's browser there was nothing to
distinguish finished-but-undeployed from never-started. He re-asked, and the
correct answer was a deploy.

`HANDOFF.md` made it worse rather than catching it: its **What is live** table
listed the page with the new columns. That was true of the working tree and
false of the edge, and a handoff is read by somebody who then acts on it.

⚠️ **A row in a "what is live" table is a claim about the EDGE.** One `curl` and
one `grep` settles it. This project already has the rule for build stamps,
*confirm the stamp changed before asking anyone to retest*, and this is the
same rule one level up: confirm the CONTENT changed before writing down that it
is live.

## 102. An inline style beats every selector, so a component that writes one deletes a rule (session 37)

`shell.css` has carried `.pos-vp[data-full] .pos-vp-stage { aspect-ratio: auto }`
since full screen was built. `createVideoPanel` later gained an `aspect` option
for `/stage/`'s 4:3 film, implemented as `stage.style.aspectRatio = aspect`, and
an inline style beats every selector in every stylesheet. So a panel that had
been given a shape could never give it up: `/making/`'s 1:1 picture box stayed
square on a 16:9 screen, the picture sat high, and `.pos-fsx` is
`position: absolute` INSIDE that stage, so it rode up there with it.

**Reported as two separate things** (*"center fullscreen images"* and *"put back
from fullscreen to sceen corner"*) because that is how it looks. One cause.

✅ The fix is a custom property: `stage.style.setProperty('--vp-aspect', aspect)`
and `aspect-ratio: var(--vp-aspect, 16 / 9)` in the stylesheet, which keeps the
value per instance and keeps it reachable by a rule.

🔴 **This is the fourth dead CSS rule this project has measured**, after
`.pos-pick`'s entire phone layout, `.pos-log { margin-top }`, and a branch
comparing against a string a function never returns. The general form: **a rule
that is present and inert reads exactly like one that works.** Point a browser
at it and read the computed value.

## 103. `[attr]` matches an empty attribute, so clear it by deleting (session 37)

`video-panel.mjs` did `root.dataset.full = full ? fullMode : ''`, and every
full screen rule in `shell.css` is written `.pos-vp[data-full] …`. An attribute
selector matches on PRESENCE, so `data-full=""` still matched: a panel that had
been full **once** kept `border: 0`, `background: #000` and a stage with no
aspect ratio for the rest of the page's life.

⚠️ **It survived because entering is what gets tested.** Every check anybody
writes about full screen is about going in. The state that was wrong is the one
AFTER coming back, and it is wrong in a way that reads as a design choice rather
than as a fault. It was found by an assert that checked the panel took its own
shape back, written for a different reason.

## 104. A domain outlives the people who had it (session 37)

A Wayback survey of mimproject.org pulled 67 pictures, and four of them were
advertising for a Thai online casino: everything captured under
`/wp-content/uploads/2025/01/`, after the domain had lapsed and been picked up
for gambling SEO.

Nothing in a CDX row says who owned the host that day. The survey asked what the
DOMAIN had held, which is the only question an index of URLs can answer, and the
2009-2023 captures and the 2025 ones are two different organisations wearing one
name. **`a 2025 revival` was written into four files** before anybody opened a
picture: the corpus note, the build script, the backlog and a memory.

⚠️ **A site coming back and a site being taken are the same shape in an index of
URLs.** Open the pictures. The build now throws on any row whose upload path is
2025 or later, and carries `removed` so a later survey cannot quietly restore
them.

## 105. Three different refusal codes in a row is the instrument, not the content (session 37)

Two 2021 works were addressed on IPFS. Probing `cloudflare-ipfs.com` gave `000`
(that gateway is retired), and one `curl -I` each at `ipfs.io`,
`trustless-gateway.link` and `w3s.link` gave **429, 406 and 301**. That was
written up and reported as *addressed, not retrieved*, with the open question
being whether anybody still pinned them.

Every one of those three was rate limiting or a redirect. With a real
user-agent, a **ranged GET rather than HEAD**, which is what those gateways
throttle hardest, and six seconds between calls, five gateways answer 206 with
a ZIP header, and both 77.9 MB files came down in under four seconds.

⚠️ This is *a partial result that is too tidy is a broken collector* wearing new
clothes. Three hosts refusing in three different ways is not three data points
about the content; it is one data point about how you are asking. **Check the
instrument before reporting an absence**, and an absence reported as fact is the
expensive kind, because nobody re-runs it.

## 106. An arrow key that also selects is a network request per row (session 37)

`table.mjs` gained keyboard navigation. The tempting shape, an arrow that moves
the selection the way a file browser does, would have been a defect on the exact
page that asked for it: `/making/`'s `onPick` fetches a picture off the bucket,
so holding the down arrow through 63 rows would pull 63 files nobody asked to
see. That is this project's load-on-a-visit defect, already paid for three
times, arriving through the keyboard.

✅ **Arrows move focus, Enter opens.** Moving focus is free; opening is a
decision, and a decision needs its own key. Asserted both ways: the focus moved
AND nothing was opened.

⚠️ The same change fixed a quieter thing. Every row had been `tabIndex = 0`, so
tabbing past a 63-row table took sixty-three presses. A roving tabindex makes a
list ONE stop. It is invisible in a screenshot and in every other check, and it
is free to read off the DOM.
