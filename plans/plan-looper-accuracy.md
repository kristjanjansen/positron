# Looper accuracy: a coarse pedal, and a foot that is not in time with the hands

Status (2026-10-14): done. The rolling buffer, start lookback and seam fold (LOOKBACK_MS, SEAM_MS, BUFFER_MS) and the 3 s hold clear are in demo/code/piano/index.html, live at https://positron.studio/code/piano/.

2026-10-11. Asked, about the sustain pedal looper on `/concepts/sampler/020/`:
*"research how to improve the accuracy of Looper, because I'm especially with
this Low resolution sustain. I just can't time my keyboard key pressing and
sustain pressing in the same time and lose first notes and maybe not having a
right end note. So research, what can be done here? I would think let's keep
have a buffer, and if there is a note which is very closely cut off from
beginning, take it in, or just wait looper until the first note starts. But
that won't work with later re-recordings, overdubbings, and also maybe some
offbeat playing. So do some research what can be done there"*.

Spec only. Nothing here is built. It follows `plans/plan-sustain-pedal.md`
(the pedal measured) and `research/sustain-pedal-pressing-2026-10-11.md`
(sections 3 to 5).

| tag | means |
| --- | --- |
| **READ** | read in the code today, or in a manual, paper or forum linked beside it |
| **MEASURED** | a number from the owner's pasted 015 export, 2026-10-11 |
| **INFERRED** | follows from the above by arithmetic or reasoning, not tested |
| **PROPOSED** | a change nobody has built |

## Verdict

**Let the pedal say roughly when and the keys say exactly when.** The pedal on
this keyboard is reported on a 65.95 ms scan, so a loop measured press to press
is wrong by a triangular error of up to plus or minus 66 ms (SD about 27 ms)
before the foot adds anything of its own. The hands are not scanned that way
(INFERRED, to be tested) and a player closing a loop almost always plays the
phrase's first note again at the seam. So:

1. **Keep a short rolling buffer of notes at all times** and record a little
   before the start press and a little after the stop press.
2. **Decide the LENGTH from notes when the notes agree with the pedal**: the
   loop runs from the note onset nearest the start press to the onset of the
   SAME note or chord nearest the stop press. When no such pair is found, or it
   disagrees with the press to press length by more than the pedal can be
   wrong, fall back to press to press, which is what 020 does now.
3. **Fold everything recorded around the seam onto the circle and drop
   duplicates**, so a first note played just before the press is kept, an end
   note played just after it is kept, and a downbeat struck twice at the seam
   sounds once.
4. **Once a loop exists its length is fixed and nothing snaps again.**
   Overdubs and re-recordings only need phase, which the loop's own clock
   gives exactly, so off-beat playing is never moved.

This is free time, no tempo and no grid, which is what *"Raw. No quant no bpm"*
asked for. The only thing that moves is the loop's two edges, by at most about
a fifth of a second, and only onto notes the player actually played.

## 0. What 020 does today (READ, `demo/concepts/sampler/020/index.html`)

- **Recording is a gate.** Notes reach the recorder only while `L.state` is
  `recording`. Nothing before the first press is kept, so a first note played
  10 ms before the press is lost, and its note off (which arrives inside the
  take) is dropped because `L.open` never saw the note on. This is the owner's
  *"lose first notes"*.
- **The loop is exactly press 2 minus press 1.** A key still held at press 2
  gets a note off at `len`. A note played just after press 2 is not recorded
  at all; it only sounds live. A note played just BEFORE press 2 (the
  downbeat struck again a little before the foot) is recorded at `len - δ` and
  replays every lap a few ms before the real first note, a flam. Both are the
  owner's *"not having a right end note"*.
- **No overdub.** Press 3 throws the loop away and starts a new take. So
  *"later re-recordings"* today means a new first take with all the same
  problems, and overdub is a design question, not a fix.
- **Times are taken at the handler, not from the MIDI event.** `looperIn`
  stamps with `performance.now()` when the bay delivers. `createMidi` in
  `demo/shell/midi.mjs` already passes `e.timeStamp` as the fourth argument of
  `onDown`, `onUp` and `onControl`, and 020's callbacks drop it. The bay
  passes an event object through unchanged (`bay.send`), so an `at` field
  would survive. The repository has already written this rule down once:
  *"Never re-stamp at handler time"* (`research/timeline-own-prior-art-2026-08.md`).
  For the pedal against the keys from the same port the handler delay is
  similar for both, so this is a small error next to 66 ms, but every number
  in section 4 should come from `timeStamp`.
- **Guards in place since today**: `SPRING_MS` 70, `MIN_LOOP_MS` 500,
  `CLEAR_HOLD_MS` 1000. This plan changes none of them.

### The repository already solved half of this once (READ, `demo/shell/keyboard.mjs`)

The kit keyboard's own looper (on `/nola/` and `/kit/`, `Loop` button) does
two of the things the owner proposes:

- **Start on the first note**: `startClock` sets the take's zero at the first
  note after arming, not at the press (asked 2026-09-23: *"arm should as long
  as it takes when i start to play"*). The trailing silence is kept.
- **Reach back**: a 4 s pre-roll of movements (`PRE_ROLL = 4000`) and
  `phraseStart`, which reaches back to *"when nothing was sounding"* if the
  last movement was within `REACH_BACK = 1200` ms of the press. Claimed once,
  so two takes cannot both grab the same phrase.
- **Later loops fit the first**: `numloop.mjs` `snapRatio` snaps a later lap
  to 1/4, 1/2, 1, 2 or 4 times the first, refusing beyond a stretch of
  `MAX_STRETCH = 1.30`.
- Its end is still the press (`t.pressedAt - t.at`), so it has the end note
  problem too.

020 shares none of this code (its own comment says so), but the ideas are
proven on this desk, and `phraseStart` is the right fallback for a held chord
(section 2.1).

## 1. How other loopers and DAWs handle it

| product | what it does at the edges | source | tag |
| --- | --- | --- | --- |
| Ableton Live, Capture MIDI | always listening; on capture, detects tempo (80 to 160 BPM) and *"set[s] appropriate loop boundaries"*; *"any notes that you played before the detected phrase will appear prior to the clip start marker"*; one note alone makes the loop *"the note start and end"* | [Live 12 manual, Recording New Clips](https://www.ableton.com/en/manual/recording-new-clips/) | READ |
| Ableton Live, Looper device | free or quantised; if the Set is not playing it *"can analyze incoming audio and set Live's tempo to match it"*, or a preset length makes the tempo fit | [Live manual, Looper](https://www.manualslib.com/manual/449421/Ableton-Live.html?page=311) | READ |
| Logic Pro, Capture as Recording | with the transport running, *"all events you played (after the last playhead change)"* become a region | [Logic 9 help, Retrospective Recording](https://help.apple.com/logicpro/mac/9.1.6/help/English.lproj/en/logicpro/usermanual/chapter_14_section_23.html), [macProVideo](https://www.macprovideo.com/article/logic-pro/logic-pro-capture-last-take-as-recording-for-midi-and-audio) | READ |
| Akai MPC, Retrospective Record | MIDI kept in the background, SHIFT + REC writes it to the track; buffer length not found | [MPC 2.8 User Guide](https://cdn.inmusicbrands.com/akai/MM28M20/MPCSoftware-UserGuide-v2.8.pdf) | READ (search summary) |
| Bitwig Studio | no retrospective MIDI capture as of 4.1, long on the wishlist; current version not checked | [KVR forum](https://www.kvraudio.com/forum/viewtopic.php?t=573216), [Bitwish](https://bitwish.top/t/midi-capture/40) | READ (forum) |
| Loopy Pro, threshold recording | waits until incoming AUDIO crosses a level, so a loop can begin *"from the first played note"*; Count In Quantization `None` starts and stops immediately | [Loopy Pro manual](https://loopypro.com/manual/) | READ |
| Loopy Pro, retrospective recording | captures the preceding audio, length set by the master clock cycle | [Loopy Pro manual](https://loopypro.com/manual/) | READ |
| Loopy Pro, phase preservation | a later recording begun mid cycle is rotated so it *"start[s] with the correct relationship to the other loops"*, on by default | [forum, developer reply](https://forum.loopypro.com/discussion/62880/retrospective-recording), [Loopy Pro Questions p34](https://forum.loopypro.com/discussion/48438/loopy-pro-questions/p34) | READ (forum) |
| Boss RC-300, RC-505mkII, Auto Rec | arm, then recording starts when the input level crosses SENS (0 to 100); audio inputs only, not MIDI; no pre-buffer documented | [RC-300 manual p33](https://www.manualslib.com/manual/961325/Boss-Rc-300.html?page=33), [RC-505mkII manual](https://static.roland.com/assets/media/pdf/RC-505mk2_eng02_W.pdf), [Roland support](https://support.roland.com/hc/en-us/articles/17036600597531-RC-505mkII-How-to-start-Auto-Record-via-USB-or-your-DAW) | READ |
| EHX 95000 | quantise mode: a stop in beats 1 to 2 of a bar truncates to the previous bar, in beats 3 to 4 finishes the bar; all 7 tracks take track 1's length; shortest loop 1.5 s | [95000 manual](https://www.ehx.com/wp-content/uploads/2021/01/95000-manual.pdf), [manualslib p24](https://www.manualslib.com/manual/1375940/Electro-Harmonix-95000.html?page=24) | READ |
| Squarp Hapax | punch in: *"will wait for the first incoming note to automatically start recording"* | [Hapax manual, live mode](https://squarp.net/hapax/manual/modelive/) | READ |
| Squarp Hapax, early notes | notes played slightly early land at the END of the pattern; users move them by pushing microtiming past 100 per cent so they wrap to beat 1 | [Squarp forum](https://squarp.community/t/live-recording-notes-early/9902) | READ (forum) |
| Boss RC-1, TC Ditto, Line 6 | single press records and closes; Boss minimum loop about 0.25 s | `research/sustain-pedal-pressing-2026-10-11.md` section 3 | READ there |

**What the products teach (INFERRED):**

- **Two families.** Hardware audio loopers take the press as the truth and
  either trust the player or quantise to a tempo (EHX's half bar rule is end
  snapping with a grid). Software that can see notes keeps everything and
  chooses boundaries afterwards (Ableton Capture, Logic, MPC). 020 can see
  notes, so it belongs in the second family without needing the tempo the
  second family usually uses.
- **Threshold start is common and is always an AUDIO level.** On MIDI the
  equivalent is the first note on, which Hapax does. None of these documents
  a pre-buffer for the threshold, so the threshold itself is the start and
  nothing before it is lost only because nothing was playing.
- **Nobody documented snapping the end of a FREE loop to a note.** Ableton's
  Capture comes closest but uses a detected tempo. The note to note length in
  section 2.3 is this plan's proposal, not a copy of a product.
- **Phase, not length, is what later passes need**, and Loopy Pro's phase
  preservation and the EHX's one length for all tracks both say so.
- **Notes early at the seam end up at the end of the loop** (Hapax), which is
  020's flam, met by real users of a real product.
- Not found: an Elektron "start on first note", Pigtronix or Ditto behaviour
  at the record edges. Neither is claimed here.

## 2. The design space, each with its failure cases

Notation: `P0`, `P1` the start and stop press times (MIDI `timeStamp`);
`N0`, `N1` note onsets chosen near them; `len` the loop length.

### 2.1 An always on lookback, and a start that snaps back

Keep the last 2 s of note events at all times (a few dozen small objects). At
`P0`, if a note onset (or a chord cluster, section 3) lies in
`[P0 - W_pre, P0]`, the take starts at that onset and its notes are copied in.

- Fixes: the first note played a little before the foot. (INFERRED)
- **Fails if the length is still press to press from the new start.** Moving
  the start back by δ without moving the end makes the loop δ too long. So a
  start snap must either move both edges (rotate) or come with an end snap
  (2.3). This is the single most important rule in this plan. (INFERRED)
- **Fails on a pickup.** A sixteenth before the downbeat at 120 BPM is 125 ms
  early and falls inside a 200 ms window. Choose the onset nearest the
  player's measured offset (section 4), not the earliest in the window.
- **Fails on a chord held across the press** whose onset is older than
  `W_pre`. `phraseStart` from the kit (reach back to when nothing was
  sounding, up to 1.2 s) is the fallback for that case only.
- **Fails during continuous playing** (no gap before the phrase): any note in
  the window could be a tail of the previous phrase. Mitigated by the
  consistency check in 2.3.

### 2.2 Start on the first note after arming (threshold start)

The press arms; the take's zero is the first note on after it (Hapax, the
kit's `startClock`, Boss and Loopy on audio).

- Fixes: everything the player needs to get ready. (READ, kit looper)
- **Fails when the first note came BEFORE the press**, which is the owner's
  exact case. Needs 2.1 alongside it.
- **Fails on a loop that begins with a rest.** The rest is cut, the loop
  starts on the off-beat note, and if the end is still the press the loop is
  short by the rest. With a note to note end (2.3) the rest simply moves to
  the end of the circle and the loop sounds right. (INFERRED)
- **Inaudible once looping.** Rotating a loop's start does not change what it
  sounds like from the second lap on; only the length does. So the start
  matters for not losing notes and for when the first replay begins, and
  nothing else. (INFERRED)

### 2.3 The length from notes: first note to the same note again

When the player closes a loop they usually play the phrase's first note or
chord again as the seam goes by. Find `N0`, the onset cluster nearest
`P0 - μ` within the window, and `N1`, an onset cluster near `P1 - μ` that
shares at least one pitch with `N0`. Then `len = N1 - N0`.

- **Accept it only when it agrees with the pedal**:
  `|(N1 - N0) - (P1 - P0)| <= TOL`. `TOL` is what the pedal can honestly be
  wrong by (section 3, about 120 ms). Outside that, the notes picked are not
  the seam, and the loop is press to press, rotated so `N0` (if found) is at
  zero. (PROPOSED)
- **Fixes**: both the lost first note and the doubled or lost end note, and
  takes the 66 ms scan out of the length. (INFERRED)
- **Fails when the phrase is not repeated at the seam**: the player stops,
  or a varied ending, or a loop whose first note is a different chord the
  second time. Falls back to press to press, no worse than today.
- **Fails when the same pitch recurs near the seam inside the phrase** (a
  repeated note figure). `TOL` and choosing the cluster nearest `P1 - μ`
  limit it to cases where the repeat is within about a tenth of a second of
  the true seam, and then the error is that small. (INFERRED)
- **Off-beat start**: works, because it matches the first NOTE, wherever it
  sits in the bar. It never needs to know where *one* is.
- **The decision is late by `W_post`.** Whether a repeat onset follows the
  stop press is only known `W_post` after it. See 2.6 for how the first lap
  starts without waiting.

The brief's tempo free variant, *first note after the start press to first
note after the stop press*, is 2.3 with `W_pre = 0`. It fails on exactly the
owner's case (notes before the press), so the window has to reach both ways.

### 2.4 End snapping to the first note's phase, or to the nearest note

- **Snap the end to the nearest note on** (any pitch): fails whenever the last
  note of the phrase falls within the window, which is common, and makes the
  loop as wrong as the phrase's rhythm. Rejected. (INFERRED)
- **Snap so the first note's onset repeats in phase** is 2.3 by another name
  when the first note is repeated, and undefined when it is not. 2.3 is the
  form that says what it needs.
- **Snap to a period of the first notes** (detect a pulse, round the length to
  whole beats): that is `numloop.mjs`'s `detectBpm` and `snapRatio`, a tempo
  in all but name, and against *"No quant no bpm"*. Not proposed for the
  first take. Offered only as an option for later takes (2.5).

### 2.5 Overdubs and later re-recordings

020 has no overdub today (press 3 starts a new take). If one is added:

- **Length is fixed after the first take, so nothing snaps.** A pass only needs
  phase, and the loop's own clock (`lapStart`, `len`) gives every note its
  phase to the millisecond. This is the EHX and Loopy rule. (READ, INFERRED)
- **Lookback and grace become free**: while the loop plays, every live note is
  already buffered with its phase. The arm press keeps notes from
  `P_arm - W_pre`, the end press keeps notes until `P_end + W_post`, and all
  of them fold onto the circle at their own phase (2.7). The foot can be as
  late as it likes inside those windows and nothing moves. (PROPOSED)
- **Retrospective overdub** costs nothing more: a press can mean *keep the lap
  I just played* (Loopy's retrospective recording, Ableton's Capture), so the
  player plays first and decides after. (PROPOSED, optional)
- **Off-beat playing in an overdub is safe** because nothing is snapped; a note
  is where it was played relative to the loop.
- **A new take (press 3 today) is a new first take**: 2.1 to 2.3 apply again.
  Optional, off by default: snap its length to a ratio of the previous loop
  with `snapRatio` (refuses beyond 1.30 stretch), which is the one place a
  pulse is allowed in, and only if asked.
- **Failure**: an overdub that should start a NEW phrase on the seam but is
  played a little early lands at the end of the loop and plays just before
  the downbeat every lap, as on the Hapax. That is faithful to what was
  played; the fold (2.7) only wraps notes that fall outside the pass window.

### 2.6 Notes held across the boundary, and the first lap

- **Note on before the end, note off after** (today cut at `len`): keep the
  real off and wrap it, so the note sounds across the seam at its played
  length, capped just before the same pitch's next onset so it never covers
  its own retrigger. (PROPOSED)
- **Note on before the start, off inside the take** (today dropped): if the on
  was pulled in by 2.1, both are kept; if not, the off is dropped as now.
- **The first lap starts at `P1` provisionally**, anchored at `P1 - μ` (the
  player's measured press offset), so phase zero is in the past by `μ` and the
  downbeat just played live is not fired again. If a repeat onset `N1` arrives
  within `W_post`, re-anchor `lapStart = N1`; the shift is at most tens of ms
  and lands before the loop's next event unless the phrase starts with a fast
  run. (PROPOSED)
- **Live dedupe**: the loop does not fire a note on if the same pitch was
  played live within `DEDUPE_MS`. This covers the seam of the first lap and an
  overdub doubling the loop's own note. (PROPOSED)

### 2.7 The fold, which makes the seam forgiving

After the length is decided, take every event recorded in
`[P0 - W_pre, P1 + W_post]`, compute its phase `(t - N0) mod len`, and drop a
note on whose pitch already has an onset within `DEDUPE_MS` on the circle,
keeping the earlier in recording order. Notes before the start that are not the
phrase's first note, and notes after the end, land at their phase instead of
being lost. (PROPOSED)

- **Fails** when a note within `W_post` after the stop press was not meant to be
  in the loop (the player already moving on to something else). At 100 ms that
  is a small window; a test in section 4 counts how often it happens.

### 2.8 The pedal's 66 ms scan, corrected statistically

- A press reported at `t` happened somewhere in `(t - 65.95, t]`, uniformly if
  the foot does not know the scan. The best single estimate is `t - 33 ms`.
  (INFERRED from the MEASURED grid)
- **For length it cancels**: both presses carry the same mean bias. What
  remains is the difference of two uniform errors: triangular, plus or minus
  66 ms, **SD 65.95 / sqrt(6) = 26.9 ms**, and 95 per cent of lengths within
  **51 ms**. (INFERRED, arithmetic)
- **Against a perceptual threshold that is too much.** Friberg and Sundberg
  (1995) put the just noticeable displacement in an isochronous sequence at
  about 6 ms below 240 ms IOI and about 2.5 per cent of the IOI from 240 to
  1000 ms, so about 12 ms at a 500 ms beat
  ([as cited in Frontiers 2017](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.01709/full)).
  A 27 ms SD hiccup once a lap is audible on most takes. (READ, INFERRED)
- **For aligning the press with notes it does not cancel**: the press is on
  average 33 ms late from the scan alone, plus whatever the foot adds. That
  offset `μ` centres the windows, and is measured, not assumed (section 4).
- **Are the notes on the same grid?** Unknown. INFERRED unlikely: a velocity
  keybed times two contacts per key and needs fine scanning to do it, so its
  notes should not be quantised to 66 ms. If they ARE, note to note lengths
  carry the same error and 2.3 buys nothing for length (it still fixes the
  lost and doubled notes). Test in section 4, step 1.

## 3. Numbers, and why

| name | proposed | from |
| --- | --- | --- |
| `BUFFER_MS` | 2000 | longer than `W_pre` plus the kit's 1200 ms reach back; a few dozen events (PROPOSED) |
| `W_pre`, notes before a press | **200 ms** to start, tune to `p95(press minus onset) + 30` | scan 0 to 66 ms late, plus the owner's own foot lag (unknown, he reports losing first notes so it is positive), plus foot jitter; capped below the player's short inter onset intervals so a pickup is not grabbed (INFERRED) |
| `W_post`, notes after a press | **100 ms** to start, tune to `-p05(press minus onset) + 30` | the scan only ever makes a press LATE, so the early side is the foot alone; in synchronisation the foot leads the hand by about 20 ms (Billon et al. 1996, cited below) and foot taps show a larger negative asynchrony than finger taps (Aschersleben and Prinz 1995) (READ, INFERRED) |
| `μ`, mean press offset | **+33 ms** until measured | the scan's half tick; the foot's own lag is added once measured (INFERRED) |
| `CLUSTER_MS`, onsets that are one chord | **40 ms** | pianists' melody lead is about 30 ms (Palmer 1996), so a chord's notes spread over tens of ms (READ via secondary, INFERRED) |
| `TOL`, notes may differ from pedal length by | **120 ms** | about 3 SD of press to press error: scan SD 27 ms and a guessed foot jitter SD of 20 ms per press give `sqrt(27^2 + 2 x 20^2)` = 39 ms; replace the 20 with the measured value (INFERRED) |
| `DEDUPE_MS`, same pitch twice is one note | **80 ms** | above a chord's spread and one scan tick, under the fastest deliberate repeat most players make on one key; tune from the export (INFERRED) |

Why not wider: a 400 ms lookback would grab the last note of the previous
phrase at most tempos, and the fold would then play it before the downbeat
every lap. Why not narrower: anything under one scan tick (66 ms) misses notes
the pedal could not have seen in time.

**Literature, with what was actually read.** Repp's tapping review (2005) and
its update (Repp and Su 2013) establish the negative mean asynchrony, taps
about 20 to 100 ms ahead of an auditory beat, and that its SD is the stable
measure of accuracy ([Repp and Su 2013](https://link.springer.com/article/10.3758/s13423-012-0371-2),
[Repp 2005 PDF](http://users.df.uba.ar/anita/f1_labo/clase1/repp%20psycho%20bull%20rev%202006%20synchro%20tapping%20review.pdf)).
The foot against the finger: *"foot tapping, as opposed to finger tapping, to
an auditory pacing signal exhibits a larger negative asynchrony"*
(Aschersleben and Prinz 1995, quoted in
[Frontiers / PMC6046193](https://pmc.ncbi.nlm.nih.gov/articles/PMC6046193/)),
and in simultaneous hand and foot tapping the foot led the hand by about 20 ms
(Billon et al. 1996, as summarised in a search result, not read in the
original). Repp also measured where pianists put the sustain pedal relative to
chord onsets ([Repp 1996](https://doi.org/10.1177/0305735696242011),
[Repp 1997](https://link.springer.com/article/10.1007/BF00419764)); the papers
were paywalled and their numbers not read. The relevant habit is ordinary
piano teaching rather than a measurement: legato pedalling presses the pedal
just AFTER the keys, so a pianist's foot may be trained to come late, which is
the direction the owner reports. (INFERRED)

## 4. What to compute from 020's Copy export

Assumed contents (the button is being added today): every CC 64 message and
every note on and off, each with its MIDI `timeStamp`, the port, and which
action 020 took. If the export uses `performance.now()` at the handler, change
that first (section 0).

1. **Are the notes on the pedal's grid?** Take the pedal messages' phase
   reference `t_ref`. For every note on, `φ = ((t - t_ref) mod 65.95) / 65.95`.
   Compute the resultant `R = |mean(exp(2πiφ))|`, scanning the period from
   65.5 to 66.5 ms in 0.01 ms steps and keeping the best. The pedal scored
   **0.9974**. With 30 or more notes, `R` under 0.3 means the notes are not on
   that grid (Rayleigh, p about `exp(-n R^2)`). Needs about 30 notes and two
   pedal presses in the same run.
2. **Press offset**: for every press, the signed time to the nearest onset
   cluster within 400 ms either side, `d = P - N`. Report median (`μ`), p05,
   p95 and SD, separately for start presses and stop presses. `W_pre` and
   `W_post` come from p95 and p05; foot jitter SD is SD(d) with the scan's
   19 ms (66 / sqrt(12)) removed in quadrature.
3. **Chord spread**: within clusters, the span from first to last onset.
   `CLUSTER_MS` is its p95 plus a little.
4. **Inter onset intervals**: p10 of the gaps between clusters. `W_pre` must
   stay under it or pickups will be grabbed.
5. **Length agreement**: for takes where a repeat of `N0` exists near `P1`,
   `(N1 - N0) - (P1 - P0)`. Its SD is the real press to press error on this
   desk; `TOL` is 3 of those.
6. **Replay the export through both rule sets**, the way 015 reports *"020
   would loop"* today: for each take, today's length, notes lost before the
   start, notes lost after the end, notes doubled at the seam; and the same
   under sections 2.1 to 2.7. That count is the result the owner will feel.
7. **Same pitch repeats**: shortest gap between two deliberate onsets of one
   key, to set `DEDUPE_MS` under it.

A run that answers all seven, about five minutes: twenty single presses with a
few notes between them (step 1); then ten takes of one short phrase, each
started on its first chord and closed by playing that chord again with the
press; then three takes that start on an off-beat; then three where the
playing stops at the end instead of repeating.

## 5. Recommendation, in priority order

1. **Stamp with `timeStamp`** in 020 (notes and pedal), and make the export
   carry it. Cheap, and every number after depends on it. (PROPOSED)
2. **Run the session in section 4 and compute steps 1 and 2.** Step 1 decides
   whether note to note length is worth building at all. (PROPOSED)
3. **Rolling buffer, start lookback (2.1) and the fold with dedupe (2.7), with
   the length still press to press.** This alone fixes *"lose first notes"*
   and the doubled or missing end note, changes no loop length, and cannot
   make a take worse than today. (PROPOSED)
4. **Note to note length with the `TOL` check (2.3)**, if step 1 shows the
   notes are not on the 66 ms grid. This is the only change that makes the
   length better than the pedal can measure it. (PROPOSED)
5. **Held notes wrap across the seam, the first lap anchored at `P1 - μ`,
   live dedupe (2.6).** (PROPOSED)
6. **Overdub, phase only, with the same windows and no snapping (2.5)**, if
   overdub is wanted; it is not in 020 today. Retrospective *keep the last
   lap* is the cheap extra. (PROPOSED)
7. **Hardware last**, as `plans/plan-sustain-pedal.md` already says: a pedal
   on a faster scan removes the 27 ms SD at the source. Once 4 is built it
   matters much less, because the pedal is then only a pointer.

Every new rule is logged in 020's own words when it acts (*"the take reaches
back 84 ms to the first C"*, *"loop closed on the repeated chord, 2.413 s, the
pedal said 2.462 s"*), because a loop that quietly differs from the presses is
the thing a player reports as a bug. (PROPOSED)

## 6. What could not be settled

- **Whether the MK-425C's notes are on the 66 ms grid.** Inferred unlikely,
  not measured. Step 1 settles it.
- **The owner's press offset and its spread.** No run of 020 with notes and
  pedal together exists yet. Every window above is a starting value.
- **How often the owner repeats the first chord at the seam.** 2.3 depends on
  it; if rarely, 3 and 5 still help and 4 mostly falls back.
- **Whether a re-anchor of up to `W_post` in the first lap is audible.**
  Needs a pair of ears, not arithmetic.
- **Foot against hand asynchrony in numbers for this kind of task.** The
  literature measures tapping to a metronome, not a pianist marking a loop
  with a foot; Billon et al. was read only in summary and Repp's pedal papers
  not at all.
- **Product behaviour not found in documents**: Elektron, Pigtronix, Ditto and
  Line 6 at the record edges; MPC's retrospective buffer length; whether
  Bitwig has added MIDI capture since 4.1.

## 9. The owner's first Copy log, 2026-10-11 17:12 (MEASURED)

One session, about 200 s on the MK-425C: 55 pedal messages, several hundred notes,
15 takes or attempts. Device timestamps (`sent`) used throughout.

### The keys are NOT on the pedal's grid
- Pedal, 55 messages: best period **65.93 ms**, phase lock **0.82** (the
  same scan as the first run; lower than 0.997 only because 200 s of a tiny
  period error drifts the phase).
- Notes, 57 note-ons: phase lock **0.21** at the best period in 65.5 to 66.5,
  which is no lock. Chord notes arrive **0.2 to 5 ms** apart (37455.4 and
  37455.7; 42677.8 and 42678.0). **So the keys are timed to about a
  millisecond and only the pedal is coarse. Section 2.3, length from notes,
  is worth building.**

### Where the notes fell against the presses
| take | start press | the chord he meant to start on | close press | the chord he meant to end on |
| --- | --- | --- | --- | --- |
| 39038.8 | | 20 ms AFTER, kept | 43261.2 | 337 ms before, or 353 after |
| 64423.9 | | **98 ms BEFORE, lost** (64325.7, 4 notes) | 71942.2 | 143 ms before |
| 77481.2 | | **88 ms BEFORE, lost** (77393.3, 5 notes) | 80514.9 | 470 ms before |
| 86056.4 | | **17 to 43 ms BEFORE, lost** (86013.8, 4 notes) | 97073.5 | 146 ms before |
| 184811.4 | | **23 to 43 ms BEFORE, lost** (184768.3, 4 notes) | 189427.1 | 117 to 137 ms before |
| 114150.2, 136361.5, 189889.3 | | pressed in a gap, nothing lost | | |

- **Four of the seven real takes lost their opening chord.** It came 17 to
  98 ms before the reported press: 0 to 66 ms of scan plus the foot. A
  lookback of 150 ms would have caught all four (W_pre 200 ms as proposed).
- **Closing presses came 117 to 146 ms after the chord he was closing on**
  (64423 take: the end chord at 7375 ms of a 7518 ms loop). So today the
  closing chord is recorded at the very end of the loop and the opening
  chord is missing: the downbeat replays about 140 ms early and once.
- Chord to chord, the 64423 take is 71798.8 - 64325.7 = **7473.1 ms**
  against the pedal's 7518.3: the note-based length differs by 45 ms, inside
  the proposed TOL of 120 ms.

### Two looper rules hurt this player
1. **The 1 s hold clear destroyed four takes.** The pedal went down at
   171160.9, 176369.1 and 178875.3 to START a take and stayed down while he
   played (2.37, 2.18 and 1.65 s), the way a sustain pedal is held; each time
   the looper cleared at 1 s. Same at 6892.6 (held 30 s). And at 80713.4 a
   re-press held 1.45 s cleared the loop he had just closed. **Proposed:
   never clear while recording; while looping, clear only on a hold with no
   note played during it.**
2. **A press while looping throws the loop away and starts a take, and an
   empty take then replaces it.** 48600.4 to 49787.9 (1.19 s) and 107289.2
   to 109597.2 (2.31 s) made loops of **0 notes**. **Proposed: a take with no
   notes keeps the loop that was playing.**

### What worked
- The spring-back rule caught one real spring back (80713.4, 66.6 ms after a
  release).
- Replay timing: 347 replays, lateness median **2.4 ms**, max **8.7 ms**.

### Revised build order
1. Fix the two rules above (they cost more takes than timing did).
2. Use the device timestamps in the looper itself.
3. Rolling buffer and start lookback of 150 to 200 ms (catches all four lost
   openings here).
4. Length from notes within TOL 120 ms (keys are millisecond accurate).

## 10. The owner's second Copy log, 2026-10-11 18:16, with section 9 steps 1 to 4 live (MEASURED)

About 250 s, 9 takes or attempts.

- **The lookback caught every opening chord.** 7 takes started from notes
  played **22.9, 43.9, 63.4, 64.4, 74.5, 78.8 and 80.3 ms** before the
  reported press (median 64 ms, max 80), taking in 2 to 4 notes each. None
  lost. 150 ms has room; 100 ms would also have caught all seven.
- **The seam rule acted once** (61 at the end repeated the opening, dropped).
- **Replays:** 400, lateness median 2.0 ms, max 7.4 ms.
- **The hold clear still destroyed loops, six times.** The owner holds the
  pedal 1.45 to 1.65 s on a closing press while the last chord rings, with no
  new note: 41387.8 (1.65 s), 92793.3 (1.52 s), 149217.7 (1.45 s), 161024.8
  (1.52 s) each closed a loop and the hold then cleared it 1 s later. 29053.6
  (held 1.58 s, no notes) cleared the playing loop. 132072.1 was held 3.69 s
  and the first note came 1.73 s in, after the 1 s clear had already fired.
  **"No note during the hold" is not enough: a ringing chord is not a note.**
- **One take started long before the playing**: 86992.6, first note 2981 ms
  later, so the loop carries 3 s of silence at its start. That is design 2.2
  (start on the first note after arming), not built.

### Proposed
1. **Hold clear at 3 s, not 1 s**, still only with no note during it. Every
   hold in both logs that was not meant as a clear was 1.45 to 1.65 s, or had
   a note before 3 s. Or remove the hold clear and keep the keyboard's notes
   off / panic button as the only clear.
2. **A take that starts more than about 1 s before its first note starts at
   that note instead** (design 2.2, with the lookback kept for the near case).

## 11. The third Copy log, 2026-10-11 18:27, hold clear at 3 s, MIDI on channel 2 (MEASURED)

- **Lookback, five takes:** opening notes 138.7, 67.4, 16.5, 15.6 and 12.7 ms
  before the press, all taken in. The 138.7 ms one is near the 150 ms edge.
- **The 3 s hold clear did only what was meant.** Four clears, each a hold of
  **3.77, 3.70, 3.90 and 4.69 s** with no note, each right after a loop the
  owner went on to replace. One hold with notes in it was kept (137207.9,
  5 notes). No loop was lost to a hold.
- **Overdub was tried and is missing.** At 132552.5 the owner pressed over a
  15.04 s loop, played nothing, closed: the empty take kept the loop (the rule
  worked). At 140938.2 he pressed again and played: the take replaced the 15 s
  loop with a 1.85 s one whose first note is 805.7 ms in. Read as an overdub
  attempt that a "press while looping is a new take" looper cannot honour.
- **One take started 805.7 ms before its first note** (design 2.2 again).
