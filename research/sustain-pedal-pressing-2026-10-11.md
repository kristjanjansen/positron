# Pressing a sustain pedal: force, timing and gestures (2026-10-11)

Status (2026-10-14): done. Its section 5 became plans/plan-sustain-pedal.md and the pedal handling in demo/code/piano/index.html cites it; the sampler/015 debugger it read is archived at archive/concepts/sampler-015.md.

Asked: *"do some reading and analyzis of my sustan-pressing. its heavy to push.
doubles are hard."* (BACKLOG, 2026-10-11, the `sampler/015` line.)

The pages this is about:

- `demo/concepts/sampler/015/index.html`, the pedal debugger. Thresholds:
  `TAP_MS 250`, `DOUBLE_MS 400`, `HALF_MS 200`, `HALF_BAND 16`, `BOUNCE_MS 20`.
- `demo/concepts/sampler/020/index.html`, the looper. Its only control is CC 64.
- `demo/shell/pedal.mjs`, which holds `PEDAL_ON 64` and the desk's pedal facts.

How to read this file. **Sourced** means a document was read and says it.
**Search summary** means a search engine's summary said it and the page was not
read in full. **Inference** is reasoning, not a measurement. **Unsourced** means
nothing was found.

None of the owner's own presses were read for this file. They live only in the
open 015 tab (`__demo.pedal.text()`), and no browser was opened.

## 0. What the code actually asks of the foot

Read from the three files, not from memory.

**020 never asks for a double.** Its whole grammar is the press edge, the value
crossing from below 64 to 64 or above:

- press 1 starts recording;
- press 2 closes the loop at exactly the time between the two presses;
- press 3 throws the loop away and starts recording again;
- two presses under 20 ms apart make no loop.

So a press is all 020 needs. "Doubles are hard" can only be about 015's
`double` gesture, or about a wish for a second gesture in 020.

**015's double is strict.** Read from `pedalMessage()`:

- a `tap` is a press shorter than 250 ms, from press edge to release edge;
- a `double` is a tap whose press edge comes under 400 ms after the previous
  TAP's release edge;
- so both presses must be under 250 ms, and the foot may be up for under 400 ms.
- A first press of 250 ms or more is a `hold`, it never arms a double, and the
  second press cannot become one.

**The one measurement of this desk's pedal on file** (`pedal.mjs`, 2026-09-23,
in front of `/evo/`): two press and release gestures each arrived as `B1 40 00`
followed **0.40 s** later by `B1 40 7F`. Two things follow.

- The pedal was **inverted** that day. Pressing sent 0, releasing sent 127.
- If 0.40 s was the press, an ordinary unhurried press on this pedal lasted
  **400 ms**, which 015 calls a `hold`. That is n = 2 and nobody was trying to
  tap, so it proves nothing about the fastest press. It does say the default
  press is well past `TAP_MS`.

**Inversion changes what both pages measure.** With an inverted pedal, 020's
"press" is the foot coming UP, so recording starts and stops on the release.
015's "press length" is then the time the foot is OFF the pedal, its `tap` is a
short lift, and its `double` is two short lifts. 015 shows `polarity` in its
readout and logs a warning once. Every number below assumes the polarity reads
`normal`. If it reads `inverted`, fix that first (power the keyboard up with
the pedal up), because the other measurements mean something else until then.

## 1. Pedal hardware

### Switch against continuous

- **Sourced.** MIDI CC 64 is `Damper Pedal on/off`, 63 or less is off, 64 or
  more is on (midi.org, quoted in `pedal.mjs`).
- **Sourced.** A switch pedal is a contact that opens or closes. A continuous
  (half damper) pedal is a sensor that reports position. The Roland DP-10 has a
  side switch between `Continuous` (the value changes gradually) and `Switch`
  (on or off only). Its polarity is listed as normally closed.
  [Roland DP-10 page](https://www.roland.com/global/products/dp-10/),
  [DP-10 manual](https://static.roland.com/assets/media/pdf/DP-10_eng01_W.pdf),
  [Roland support, DP-10 vs DP-8](https://support.roland.com/hc/en-us/articles/4404532049307-DP-10-DP-8-Differences-Between-DP-10-and-DP-8).
- **Search summary.** Half damper needs a stereo (TRS) jack. The M-Audio SP-2
  is mono, so it is a switch even though it looks like a piano pedal.
  [zZounds SP-2 reviews](https://www.zzounds.com/productreview--MDOSP2).
- **Sourced in this repo.** The MK-425C's pedal input is a footswitch, "fully
  MIDI assignable" (`plans/plan-fasttrack-mk425c.md` §4.5). Whether it can read
  a continuous pedal is not recorded. 015's `type` column answers it for the
  pedal actually plugged in.

### Box type against piano style

- **Search summary.** The Yamaha FC5 is a box type footswitch with "small
  travel". The FC4A is piano style, with travel close to an acoustic piano and
  a heavy spring. One retailer review puts the FC4A at "roughly 20% more
  down-force" than lighter pedals.
  [Sweetwater FC4A reviews](https://www.sweetwater.com/store/detail/FC4A--yamaha-fc4a-sustain-pedal-foot-switch/reviews),
  [Nord User Forum, FC5 against a piano pedal](https://www.norduserforum.com/viewtopic.php?t=17561),
  [Haydock FC5 review](https://www.haydockmusic.com/reviews/yamaha_fc5_sustain_pedal_review.html).
  The 20 per cent is a review's figure with no method. Treat it as a direction.
- **Sourced.** On an acoustic grand, the pedal "lifts the dampers at 1/3 of its
  travel". The first third is lost motion with little load.
  [Redekop, Grand Piano Dampers, Seattle PTG 2012](https://seattleptg.org/wp-content/uploads/2024/06/Grand-Piano-Dampers.pdf).
- **Sourced.** Yamaha's pedal patent describes the acoustic damper pedal's feel
  in three regions: before the damper load arrives, the load starting to reach
  the damper, and the damper clear of the string. The reaction force "suddenly
  starts varying stepwise" when the damper starts to lift. The patent gives no
  numbers. [US7943843B2](https://patents.google.com/patent/US7943843B2/en).
  A second Yamaha patent uses two springs so the pedal "became heavier at a
  certain point of depression". [US7956261B2](https://patents.google.com/patent/US7956261).

### Force and travel numbers

- **Unsourced.** No published actuation force in newtons was found for any
  sustain pedal, digital or acoustic. Two searches and three patents were tried.
  The nearest numbers are industrial momentary foot switches (one listed at
  3.2 kg action force, [ATO](https://www.ato.com/foot-switch)), which are not
  musical pedals and are quoted only for scale.
- **Sourced, for scale.** Young adults' maximum ankle plantar flexion was
  147.9 ± 71.3 N in one study, and 74.9 ± 38.1 N in elderly subjects
  ([PMC4932086](https://pmc.ncbi.nlm.nih.gov/articles/PMC4932086/)). A pedal
  needing even 20 to 30 N is a fair share of an older foot's maximum when it is
  pressed with the ankle alone and the heel on the floor. **Inference.**

### Why a cheap switch pedal feels heavy, or switches late

All **inference** from the sources above, none measured on this pedal:

- **A piano style shell copies the long travel and the spring of an acoustic
  pedal, but has one switch inside.** The acoustic pedal does something across
  its travel (the dampers lift a third of the way down). A switch pedal does
  one thing at one point. If that point is near the bottom, the foot carries the
  whole spring load over most of the travel before anything happens, which
  feels heavy and late at once.
- **The heel acts as the pivot.** With the heel on the floor, a long pedal
  needs a big ankle angle to reach a switch near the bottom. Toe tapping speed
  (section 2) falls as the angle grows.
- **Polarity.** Keyboards that sense polarity at power up read whatever the
  pedal is doing at that moment as "up" (`pedal.mjs`, the MK-425C manual).
  Forum level, not a manufacturer statement: Yamaha expects normally closed,
  most others normally open, so a pedal from one brand on another's keyboard
  can work backwards, and a polarity switch on the pedal fixes it
  ([yamaha-keyboard-guide.com](https://www.yamaha-keyboard-guide.com/the-sustain-pedal-works-in-reverse.html),
  [Alex's Piano Service](https://www.alexanderpeppe.com/why-your-sustain-pedal-works-backwards-and-best-pedals-to-buy/)).
- **Contact bounce.** Sourced: Ganssle measured 16 switches with an average
  bounce of 1.6 ms and a maximum of 6.2 ms, and one pushbutton bounced for
  157 ms when it opened ([Ganssle, A Guide to Debouncing](https://www.ganssle.com/debouncing.htm)).
  Whether the MK-425C debounces its pedal input before it sends MIDI is
  unknown. 015 marks a `bounce` gesture when a crossing comes under 20 ms after
  the one before.

## 2. Human timing

### Foot tapping

- **Sourced.** Foot tapping test, seated, heels on the floor, toes tapping "as
  quickly and vigorously as possible" for 10 s. Healthy controls (n = 56, mean
  age 69 ± 7): **23.5 ± 2.5 taps in 10 s**, so 2.35 Hz, about **425 ms per full
  down and up cycle**. [PMC6698509](https://pmc.ncbi.nlm.nih.gov/articles/PMC6698509/).
- **Search summary.** Healthy 19 year olds: 14 to 26 taps in 10 s, so 385 to
  714 ms per cycle.
  [ResearchGate, college students' norms](https://www.researchgate.net/publication/396037795_Establishing_Normative_Reference_Score_of_Foot_Tapping_Test_among_Healthy_College_going_Students_A_Cross-sectional_Study).
- **Search summary.** Maximum foot tapping lies roughly between 1 and 5 Hz;
  finger tapping's limit is about 5 to 7 Hz (150 to 200 ms between taps);
  whole body bouncing to a beat tops out near 4.1 Hz for non dancers.
  [JEB, street dancers](https://journals.biologists.com/jeb/article/221/16/jeb179457/394/Upper-rate-limits-for-one-to-one-auditory-motor).
- **Sourced.** At a comfortable 500 ms tapping period, young subjects' interval
  variation was 8.5 ± 3.0 per cent and elderly subjects' 16.8 ± 10.1 per cent
  ([PMC4932086](https://pmc.ncbi.nlm.nih.gov/articles/PMC4932086/)). At 500 ms
  that is about 40 to 85 ms of spread per interval. **Inference:** a loop
  closed by a foot will be off by tens of ms from the intended length, whatever
  the code does.

**What that means for 015's double, inference.** These are unloaded taps on a
floor, done as fast as possible. At the norm's 425 ms per cycle, a double inside
015's rules (press under 250, up under 400, press under 250) is reachable only
if the press itself stays under 250 ms. A pedal with a spring and a long travel
slows every part of the cycle, and the one measured casual press on this desk
was 400 ms. So 015's double sits at or past the edge of what a foot does on a
floor, before the pedal adds any weight.

### Re-pedalling at the piano

- **Sourced, without numbers.** Repp measured pedal releases and depressions
  against chord onsets on a Disklavier (10 pianists, 3 tempos). As tempo rose,
  releases and depressions came a little sooner and pedal changes were "a
  little more quickly" executed, but proportionally less than the tempo change.
  [Repp 1997, PubMed 9342960](https://pubmed.ncbi.nlm.nih.gov/9342960/),
  [Repp 1996, Psychology of Music](https://doi.org/10.1177/0305735696242011).
- **Unsourced.** The millisecond figures sit behind paywalls and were not read.
  No sourced number is given here for how fast a pianist lifts and re-presses.
  **Inference:** a legato pedal change is an up and down done as one motion,
  which is the same motor act as a double tap, and pianists do it on a heavy
  acoustic pedal. The difference is that it is timed to a beat, not raced.

### Double tap windows in products

- **Sourced, Boss RC-1** (one pedal looper). Stop: "Press the pedal twice
  within one second". Erase: hold "two seconds or longer while stopped".
  Undo or redo: hold two seconds during playback. Minimum loop "approximately
  0.25 seconds": a second press inside 0.25 s keeps recording until 0.25 s.
  The manual teaches the double as two beats: press on beat 4, then on beat 1.
  And "the phrase plays while you hold down the pedal", so the first press acts
  at once and the hold is read afterwards.
  [RC-1 Owner's Manual](https://static.roland.com/assets/media/pdf/RC-1_eng03_W.pdf).
- **Search summary, TC Electronic Ditto.** Tap to record, tap to play, double
  tap to stop, double tap and hold to stop and delete, hold 1.5 s or longer to
  undo or redo. No double tap window is stated.
  [Ditto manual on manualslib](https://www.manualslib.com/manual/2863307/Tc-Electronic-Ditto-Looper.html).
- **Sourced, Line 6 1 Switch Looper (Helix Stadium manual).** "Quickly
  double-press" to stop, no window given. Hold **1 second** to undo while
  playing, hold 1 second to delete while stopped.
  [Line 6 manual, Loopers](https://manuals.line6.com/en/helix-stadium/live/looper-block).
- **Sourced, desktop double click.** Windows defaults to 500 ms, adjustable
  from 200 to 900 ms ([Wikipedia, Double-click](https://en.wikipedia.org/wiki/Double-click),
  [SetDoubleClickTime](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setdoubleclicktime)).
  A finger is quicker than a foot, and the foot product above allows 1000 ms.

Note the measure differs. Boss's one second is press to press. 015's 400 ms is
release to press, plus two presses under 250 ms each, so its press to press is
at most 650 ms and also requires both presses to be short.

## 3. Gesture design for a one pedal looper

### What products do, sourced above

| action | Boss RC-1 | TC Ditto | Line 6 1 Switch |
| --- | --- | --- | --- |
| record | press | tap | press |
| close loop, play | press | tap | press |
| overdub | press | tap | press |
| stop | 2 presses within 1 s | double tap | quick double press |
| clear | hold 2 s while stopped | double tap and hold, or hold while stopped | hold 1 s while stopped |
| undo | hold 2 s while playing | hold 1.5 s | hold 1 s while playing |
| minimum loop | about 0.25 s | not stated | not stated |

### What the products teach, inference

- **The time critical actions are single presses.** Start and close loop are
  one press each, because the loop's edges are only as good as the press edge.
  Doubles and holds go on actions where timing does not matter (stop, clear,
  undo).
- **The first press acts at once.** No product waits to see whether a second
  press follows. Boss plays on the first press and stops on the second. The
  Loopy Pro wiki warns that a pedal doing its own double tap or hold detection
  "will result in a delay sending the initial press (on) message", and one
  footswitch's short press arrives about 120 ms late because it is sent on
  release ([Loopy Pro wiki, Footswitches](https://wiki.loopypro.com/Footswitches)).
- **A hold is cheap on a heavy pedal.** Once the pedal is down, keeping it down
  costs nothing extra. A double costs two full strokes against the spring.
  That is the gesture for a foot that finds doubles hard.
- **Press against release.** Line 6 and Fractal reportedly let a looper
  footswitch act on release, and one user argues release is easier: the foot
  is already down and only has to lift
  ([Neural DSP forum request](https://unity.neuraldsp.com/t/looper-x-record-on-release-of-footswitch-or-press/21669)).
  That is one user's view, not a measurement. Line 6 does document separate
  press and release behaviours on footswitches
  ([HX Stomp 3.0 manual](https://line6.com/data/6/0a020a418962611d636e7c51b/application/pdf/HX%20Stomp%203.0%20Owner's%20Manual%20-%20Rev%20D%20-%20English%20.pdf)).

### A constant switch lag cancels in 020, jitter does not

Inference from 020's code. Both ends of the loop are press edges on the same
pedal. If the switch closes a fixed 60 ms after the foot "means" it, both
edges are 60 ms late and the loop length is exact. A heavy pedal or a late
switch point therefore does not make 020's loops the wrong length on average.
What breaks a loop is **variation** in that lag from press to press. Which edge
is steadier, press or release, is a measurement (section 4), not a belief.

### A gap in 020 that a pedal can reach

Inference from the code, not seen on the desk. 020's only guard is "press 2
under 20 ms after press 1 makes no loop". There is no guard on a press arriving
just after a RELEASE. If the switch chatters as it opens (127, 0, 127, 0), the
chatter's 127 is a full press: press 1 at 0 ms, release at 300 ms, chatter at
304 ms gives a 304 ms loop nobody asked for. 015 would show it as a `bounce`
gesture on the press row. Ganssle's 6.2 ms worst ordinary case, and his 157 ms
outlier, are why a lockout belongs on every edge, not only on press 1 to 2.

## 4. What to measure on the owner's presses

### What 015 already records

Per message: port, bytes, `timeStamp`, gap since the last message on the same
controller. Per press: press length (press edge to release edge), the number
of messages during the press and their mean gap and spread, the release value.
Gestures: press, release, tap, hold, double, half, bounce. Per port: message
count, presses, min and max value, distinct values, repeats, type guess,
polarity guess. `Copy log` gives all of it as text. (BACKLOG has a pending
request to remove `Copy log`; the text stays reachable as `__demo.pedal.text()`.)

### Three things to tell apart, and their signatures

All inference. A switch pedal tells the page only when the contact changed.
Force and position never reach MIDI, so each cause has to be read from timing
patterns, plus one physical check.

| cause | press length | foot up gap | press to press | other sign |
| --- | --- | --- | --- | --- |
| heavy spring | long, near the cycle | normal | slow at max effort | max rate falls over 10 s (fatigue) |
| late switch point | SHORT (only the last bit of travel is "on") | long | normal | missed presses: fewer presses counted than made |
| slow release | long, with a high floor | short | slow | the shortest press you can make is still over about 200 ms |

### Four short tests, read off 015 as it is

1. **Polarity.** Clear, one press, read `polarity`. Must say `normal` before
   anything else counts.
2. **Fastest taps, 10 s.** Tap as fast as possible for 10 s. Count presses
   (compare with the 23.5 in 10 s norm for heels on the floor). From the log:
   median and minimum press length, median foot up gap, press to press period,
   and whether presses per second drop in the second five seconds.
3. **Counted presses.** Make exactly 20 deliberate presses, some light. If 015
   counts fewer, strokes are failing to reach the switch point.
4. **Steady beat.** Press along with a metronome at 500 ms for 20 presses.
   Compare the spread (standard deviation) of press to press intervals against
   release to release intervals. The smaller one is the edge 020 should loop on.

Plus one physical check with no browser: press the pedal slowly by hand with a
ruler beside it and note at how many mm of the total travel it clicks. That is
the only direct reading of the switch point.

### What 015 could add (proposals, not built)

- A per press table: down ms, up ms before the next press, press to press ms,
  release to release ms. Most of the above is then read off one table instead
  of computed from the log.
- Running summaries over the last N presses: median, minimum and 90th
  percentile of each column, and duty cycle (down time over cycle time).
- For each pair of presses within 1000 ms that did NOT make a `double`, which
  rule failed: first press too long, second press too long, or gap too long.
  That answers "why are doubles hard" in the pedal's own numbers.
- A chatter count: crossings under 50 ms after the one before, on both edges.
- For a continuous pedal: time from leaving rest to crossing 64, and from
  leaving the top to falling under 64. That is the switch point and the release
  speed, measured.

## 5. Measured on the owner's presses, 2026-10-11 afternoon (MEASURED)

The owner pressed the pedal in 015 and pasted its export into the session:
**74 CC 64 messages, 37 presses**, MK-425C USB MIDI Keyboard, channel 2,
values 0 and 127 only (a switch pedal), polarity `normal`, no repeated values,
no chatter inside one tick. Analysed offline in Node from the pasted times.

### The keyboard reads its pedal about 15 times a second

Every one of the 74 messages lies within **1.81 ms** of a **65.95 ms** grid
(phase lock 0.9974 across all 74). So the MK-425C looks at its pedal jack
about **15.2 times a second** and sends what it saw on that beat. 015 stamps
each message with the event's own `timeStamp` and does no rounding, so the
grid is the keyboard's, not the page's. This answers the open question above
in part: whatever debouncing the MK-425C does, it reports on a 66 ms scan.

Consequences, all in ticks of 65.95 ms:

| | ticks | count |
| --- | --- | --- |
| press held | 1 (66 ms) | 13 |
| | 2 (132 ms) | 16 |
| | 3 (198 ms) | 6 |
| | 4 or 5 | 2 |
| foot up before the next press, inside a burst | 1 (66 ms) | 3 |
| | 2 (132 ms) | 14 |
| | 3 or 5 | 2 |

- **A third of the presses were seen for one tick**, so they lasted under
  about 130 ms. A tap shorter than one tick can fall between two looks and be
  missed entirely. That is one honest reading of *"it's heavy to push"*: a
  light quick tap does not register at all.
- **The fastest possible double is 132 ms press to press**: down one tick, up
  one tick. The owner's usual double came out at **264 ms**, two ticks down
  and two up.
- **Bursts came out uneven.** Grouping presses whose gap is at most 6 ticks
  gives **18 bursts: 6 single, 6 double, 5 triple, 1 quadruple**. If each was
  meant as a double, a third landed as two presses.
- **Three re-presses one tick after a release**, at 43.72 s, 45.30 s and
  47.68 s, each right after a short press. That is the shape of a heavy pedal
  springing back (or a contact bouncing on release); at a 66 ms scan it cannot
  be told apart from a deliberate press.

### What it means for 020's looper

020 flips between *start recording* and *loop* on every press, so a triple
leaves it in the opposite state from a double, and a spring back makes a loop
of one or two ticks. The export shows exactly that: *"020 would loop 0.132 s"*
and *"0.199 s"*. Revised from the recommendation list below, with the scan in
mind:

1. **Lockout of one tick, about 70 ms, after a release** (not 50 ms as below:
   at this keyboard's scan, nothing under 66 ms is visible anyway, and a
   one tick re-press is the bounce signature measured here).
2. **A burst within about 400 ms is one gesture.** One press is record or
   stop; two or more is something else, a clear for instance. Only if a double
   is wanted at all (recommendation 2 below still says do not).
3. **No loop under about 0.5 s** (Boss's 0.25 s is the floor; 0.5 s also
   swallows a spring back plus one tick).
4. **Timing inside 020 is quantised by the keyboard to 66 ms.** A loop length
   taken press to press on this keyboard is right only to plus or minus one
   tick. A faster scanning keyboard or pedal interface is the only cure.

### Not measured yet

- **Whether the MK-425C's NOTES are on the same 66 ms grid**, or only the
  pedal. One 015 run with a few key presses would settle it.
- The four tests in section 4 were not run as such; this was a free run.

## Recommendation, in priority order

1. **Check polarity first.** If 015 says `inverted`, every press and double
   number is a lift, and 020 loops on the release. Power the keyboard up with
   the pedal up. Sourced: the MK-425C manual and the 2026-09-23 measurement.
2. **Keep 020 a single press looper. Do not add a double.** Start and close are
   already single presses, which is what every product does for the time
   critical actions. The owner's doubles problem does not touch 020 today.
3. **Add an edge lockout to 020.** Ignore any CC 64 crossing under about 50 ms
   after the previous crossing in either direction, not only press 2 under
   20 ms after press 1. Consider Boss's 0.25 s minimum loop in place of 20 ms.
   The 50 ms and 250 ms are proposals: Ganssle's 6.2 ms worst ordinary bounce
   leaves a wide margin, and the 250 ms is Boss's documented figure.
4. **If 020 needs stop or clear, use a hold, acting on the press at once.**
   Press does what it does now. A press held 1 s (Line 6) to 1.5 s (Ditto)
   then also stops and empties the loop, throwing away the recording the press
   just started. Never wait to see whether a second press is coming.
5. **Loosen 015's double to match products and the one measured press.**
   Proposed: a double is two presses whose press edges are under 1000 ms apart
   (Boss's window, measured press to press), with the first press under a hold
   threshold of about 1000 ms, and no tap length rule on either press. Split
   `TAP_MS` into a reporting threshold of about 400 ms (the one casual press on
   file was 400 ms) and a separate `HOLD_MS` of 1000 ms. These numbers should be
   replaced by the owner's own medians from test 2 once they exist.
6. **Offer 020 a release edge as an option, decided by test 4.** If the release
   to release spread is smaller than press to press, loop on release. Until
   measured, press stays the default, because that is what 020 was asked to do.
7. **Hardware last.** If test 3 shows missed presses or test 2 shows a press
   floor over about 200 ms, try a short travel box type footswitch (FC5 type)
   with a polarity switch, or a continuous pedal so the switch point becomes a
   number on screen. A pedal is cheaper than the hours spent tuning thresholds
   around one.

## What could not be settled

- **The owner's own presses.** One free run is now measured (section 5); the
  four tests in section 4 were not run as such.
- **Which pedal is on the desk**, its model, its travel, and whether it is a
  switch or continuous. 015's `type` column will say the last one.
- **Any actuation force in newtons** for any sustain pedal. Nothing published
  was found.
- **Whether the MK-425C debounces** its pedal input before sending MIDI. It
  reports on a 66 ms scan (section 5), which hides anything finer.
- **Re-pedalling speed at the piano in ms.** Repp measured it; the numbers are
  behind paywalls and were not read.
- **Whether release is really steadier than press for a foot.** One forum
  user's argument and nothing measured. Test 4 settles it for this foot and
  this pedal.
- **TC Ditto's and Line 6's double tap windows.** Neither manual states one.
