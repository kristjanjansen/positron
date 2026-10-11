# Loop UI: seeing where every loop is, what is in it, and what comes next

2026-10-11. Asked, verbatim: *"Research different looping UIs. There is a lot
of work done in those clips based work, like I think Logic has something, maybe
GarageBand. It seems that there is not that much visualization going on in
Ableton Live. Those clips are basically play and stop buttons and agreed. Also
look at the Loopy Pro, which does the circle things. My problem in general is
that it's very hard to follow really, and they are very you know, grid,
4-to-4 grid based also. It makes sense, it's easier to compose them and works
with drum machines, but yeah, I'm kind of lost in loops. I can't really
visually track what is going on, so maybe we should explore that space. For
now, just make a plan with links and research."*

Spec only. Nothing here is built. It sits beside `plans/plan-looper-accuracy.md`
(the edges of a take) and is about the picture, not the timing. No product was
run for this plan and no browser was opened: every product row is from a
manual, a release note, a review or a forum, and says which.

| tag | means |
| --- | --- |
| **READ** | read in this repository's code today, or in a manual, paper, release note or review linked beside it |
| **READ (summary)** | the linked page was found by search and its wording reached me through the search summary; the page itself did not load in full |
| **SEEN** | described from screenshots or videos by the linked source, not by a manual |
| **INFERRED** | follows from the above by reasoning, not tested |
| **PROPOSED** | a display nobody has built here |

## Verdict

**Every product answers "is it playing?" and almost none answers "where is it,
what is in it, and what is about to happen?"** The clip launchers (Ableton,
Logic, GarageBand, Bitwig, FL, Push, Launchpad, MPC) are state machines with a
progress ring or bar bolted on, and the progress is a fraction of a bar count.
The loopers that draw content (Loopy, SooperLooper, Mobius, Chewie) draw one
loop's waveform on a circle or a line and leave the rest to the ear. The only
study found that asked performers says plainly that they lose track of *"which
loop was making which sound"* ([Shepardson et al., NIME 2025](https://nime.org/proceedings/2025/nime2025_36.pdf)),
which is the owner's sentence in other words.

What this project has that those products do not, and what makes the problem
easier here than for them:

1. **The loops are MIDI, so every note is known in advance.** An audio looper
   can only draw a waveform; 020 knows the pitch, the velocity and the phase of
   every note the loop will play next lap. "What is about to play" is a lookup,
   not a prediction. (READ, `demo/concepts/sampler/020/index.html`, `L.events`)
2. **Length is fixed once a loop exists** (`plans/plan-looper-accuracy.md`
   section 2.5), so phase is exact and an overdub lands at the same angle every
   lap. (READ)
3. **There is no tempo and must not be one** (*"Raw. No quant no bpm"*). So the
   display may not draw bars or beats, and every product's progress indicator
   that counts bars is unusable as it stands. (READ)

So the recommendation is to draw **time as angle for each loop, with the notes
on it**, keep the existing strip as the linear reading of the same loop, and
add two cheap things the products skip: **light what is about to play before
it plays**, and **ghost the previous laps so what just changed stands out**.
Three concept pages, section 6.

## 0. What the owner is looking at today (READ)

- **`/concepts/sampler/020/`** ([https://positron.studio/concepts/sampler/020/](https://positron.studio/concepts/sampler/020/)):
  a sustain pedal looper in front of the piano and Rhodes sampler. One loop.
  Press 1 records, press 2 closes, press 3 starts a new take (no overdub yet,
  section 11 of the accuracy plan records the owner trying to overdub and
  losing a 15 s loop to it).
- **The display** is the kit transport bar glued to the kit strip
  (`createStripView` from `demo/shell/strip.mjs`). One lane, `loop`, renders
  notes as `ticks`, one vertical mark per note on, pitch NOT shown (the lane is
  one row; the pitch is only in the hover footer, `describeRow`). The strip is
  fitted to `[-4 %, 104 %]` of the loop so its start and end edges show, and the
  deck's playhead is set from the looper's own clock every frame (`tick()`), so
  a playhead sweeps left to right and jumps back at the seam.
- **What it shows**: where now is in this loop, and when notes fall.
  **What it hides**: which note is which (no pitch axis), what is about to
  play (the marks look the same before and after the playhead; `latch` exists
  on the ticks renderer but 020 does not pass it), what the previous lap was,
  and anything about a second loop (there is none yet).
- **The kit keyboard's own looper** (`demo/shell/keyboard.mjs` with
  `demo/shell/numloop.mjs`): ten independent slots on the number keys, each
  with a state, and an optional ratio snap of later laps to the first. Its
  display is a lamp per slot and two readout cells (tempo, ratio), not a
  picture of the loop. (READ)
- **`demo/shell/roll.mjs`**: a vertical piano roll glued above the keyboard,
  columns aligned to keys by importing `placeKey` from `keyboard.mjs`; rows of
  dots, no autoscroll yet, and its header already says that when autoscroll
  comes *"the rows will move inside a window whose height does not"*. (READ)
- **`timeline/strip.mjs` ticks renderer** already has three hooks this plan
  uses: `latch` (recolour marks behind the playhead, recomputed every frame so
  it un-fires on a wrap), `colorOfRow(row, fired)` and `widthOfRow(row, fired)`.
  `registerRenderer(name, fn)` is the sanctioned way to add a drawing, and the
  wrapper's header says *"Do not fork the strip."* (READ)
- **No circular drawing exists in the kit.** `grep '.arc('` finds it only in
  `brand-slides.mjs`, `xr-quit.mjs`, `xy-pad.mjs`, `timeline/strip.mjs` (dots)
  and `/draw/`. A loop clock would be a new kit piece. (READ)

## 1. What exists

### 1.1 Clip and session based

| product | where is the loop | how long | what is in it | what happens next | source | tag |
| --- | --- | --- | --- | --- | --- | --- |
| **Ableton Live, Session View** | a clip slot's launch button lights; the track's status field shows a *"pie-chart icon"* for a looping clip | *"The number to the right of the circle is the loop length in beats"* | nothing in the slot; content only in Clip View below. A mini waveform in Session is a long standing forum request | *"the number at the left represents how many times the loop has been played since its launch"*; a launched clip waits for launch quantisation | [Live 12 manual, Session View](https://www.ableton.com/en/manual/session-view/), [forum request](https://forum.ableton.com/viewtopic.php?f=3&t=226924) | READ |
| **Ableton Live, Looper device** | after recording *"the display shows the current position in the loop and the total loop length in bars and beats"* | bars and beats | nothing; *"the entire display area turns red"* while recording | the multi purpose button cycles record, play, overdub | [Live manual p311](https://www.manualslib.com/manual/449421/Ableton-Live.html?page=311), [forum on the button](https://forum.ableton.com/viewtopic.php?t=199510) | READ; no waveform INFERRED from the manual's silence |
| **Ableton Push 2** | playing clips *pulse in their assigned clip color*; recording clips pulse between clip colour and red | not on the pads | not on the pads | blink or pulse is chosen per pad by MIDI channel | [Push 2 MIDI and display interface](https://github.com/Ableton/push-interface/blob/main/doc/AbletonPush2MIDIDisplayInterface.asc) | READ (summary) |
| **Novation Launchpad** | in Live mode a pad *"will flash between the flash colour and the current colour ... with a 50% duty cycle ... in time with MIDI beat clock"*; pulsing *"rhythmically increases and decreases in brightness"* | no | no | a flashing pad is the queued state by convention | [Launchpad Pro programmer's reference](https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/downloads/Launchpad%20Pro%20Programmers%20Reference%20Guide%201.01.pdf) | READ (summary) |
| **Logic Pro, Live Loops** | *"a circular indicator in the middle of the cell shows the current playback position"*; *"Indicators in the cell and at the end of the cell's row show the cell's progress"* | cell loop length, in bars | audio cells show the waveform, MIDI cells a note preview; the waveform is drawn circular and *"changes to a linear shape when you turn off looping"* | queued cells *"flash to indicate that they are queued to start at the next quantize start point"* | [Apple, Use Live Loops](https://support.apple.com/en-us/102113), [Apple, start and stop cells](https://support.apple.com/guide/logicpro/start-and-stop-cells-lgcpb461e752/mac), [Sound On Sound](https://www.soundonsound.com/techniques/live-loops-logic) | READ for content and queue; circular waveform READ (summary) |
| **GarageBand iOS and Mac, Live Loops** | the same grid as Logic | bars | Touch Instrument recordings, Apple Loops, audio | taps *"wait until the beginning of the next bar"* | [GarageBand for iPhone, play cells](https://support.apple.com/guide/garageband-iphone/play-cells-in-the-grid-chsb722a0c39/ios), [overview](https://support.apple.com/guide/garageband-iphone/live-loops-overview-chsca7ff9ced/ios) | READ; same progress ring as Logic INFERRED (the docs did not describe it) |
| **Bitwig Studio 6.0 clip launcher** | *"the circle is painted over clockwise, indicating the playback position within the current clip"* | not in the circle | launcher clips show their waveform in the slot | *"a play count will show in the center of the clip, starting on the second play (2)"*, turning to *∞* from the 100th; a Next Action is *"ringed by a blue arc, showing the timer for the action"* | [Bitwig 6.0 release notes](https://downloads.bitwig.com/6.0/Release-Notes-6.0.html), [user guide](https://www.bitwig.com/userguide/latest/the_clip_launcher/) | READ |
| **FL Studio, Performance mode** | *"Clip play-progress is animated on active Clips as a horizontal bar"*, with *"Performance track progress"* as a separate option | bar | the clip's own drawing in the playlist | launch quantisation | [FL manual, Playlist in Performance Mode](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/playlist_performance.htm) | READ (summary) |
| **Novation Circuit / Circuit Tracks** | *"the white pad which moves through the pattern display indicates which step is currently being played"*, red in record | 16 or 32 steps on two rows of pads | lit steps | the next pattern in a chain | [Circuit Tracks user guide](https://fael-downloads-prod.focusrite.com/customer/prod/downloads/circuit_tracks_user_guide_v3_en.pdf) | READ (summary) |
| **Akai MPC 3 clip matrix** | not found | | | follow actions exist | [Sound On Sound, MPC Live III](https://www.soundonsound.com/news/akai-pro-reveal-mpc-live-iii) | not found |

**What the whole row has in common** (INFERRED from the table): position is a
fraction drawn as a ring or a bar, length is a bar count, state is colour plus
blink, and content is either absent from the launcher (Ableton) or a thumbnail
that does not move (Logic, Bitwig). Logic is the one that bends the content
into the circle, so the progress ring and the waveform share an angle. That is
the single nearest thing to what this plan proposes, and it is drawn at cell
size, without pitch, and bar based.

### 1.2 Circular and radial

| product | what it draws | source | tag |
| --- | --- | --- | --- |
| **Loopy HD and Loopy Pro** (A Tasty Pixel) | *"Loops usually appear as circles"*; the circles *"become circular waveforms once you've started recording"*; playing clips use their colour as background, stopped black, muted dimmed, recording orange red; count in and count out are *"a colour wiper animation"*; *"twisting tracks around to line up the beat"* is a phase edit by rotating the circle; loops are multiples or fractions of the clock | [Loopy Pro manual](https://loopypro.com/manual/), [No Treble review 2011](https://www.notreble.com/buzz/2011/12/12/loopy-a-look-at-the-looper-app-for-ios/), [Loopy HD App Store](https://apps.apple.com/us/app/loopy-hd-looper/id467923185) | READ |
| **Patterning** (Olympia Noise Co) | up to eight loops *"arranged in orbits"*, each with its own length (1 to 512 steps), step duration, direction and swing; *"circular icons ... displaying pattern density at a glance"* | [App Store](https://apps.apple.com/us/app/patterning-3-drum-machine/id1631913793), [Sound On Sound](https://www.soundonsound.com/reviews/olympia-noise-co-patterning), [FACT](https://www.factmag.com/2015/08/23/patterning-drum-machine-app-ipad/) | READ |
| **Rhythm Necklace** (Tarakajian and O'Reilly) | up to four necklaces, each cycle its own length, shapes you tap, flip and rotate, after Toussaint | [App Store](https://apps.apple.com/gb/app/rhythm-necklace-geometric-sequencer/id954669874), [Meara O'Reilly](https://mearaoreilly.com/Rhythm-Necklace) | READ |
| **Concentric Rhythm** | sequences as concentric shapes with rotation, reflection and folding | [Synthtopia](https://www.synthtopia.com/content/2017/04/26/ios-sequencer-concentric-rhythm-lets-you-explore-the-geometry-of-rhythm/) | READ |
| **Polyrhythm visualisers** | nested rings where every ring plays a different count in the same cycle; rotating n-gons that sound as a vertex passes a fixed point | [Polyrhythm Generator](https://www.imageonlinetools.com/polyrhythm-generator/), [CCRMA phasing sequencer](https://ccrma.stanford.edu/~nlabate/256A/hw3) | READ (summary) |
| **A 2011 survey of circular music makers** | Raymond Scott's Circle Machine, Loopseque, Overbug (overlapping wheels), Cyclotron (*"the wheel itself advancing through time"*) and more | [CDM, Circles and Euclidean rhythms](https://cdm.link/circles-and-euclidian-rhythms-off-the-grid-a-few-music-makers-that-go-round-and-round/) | READ |
| **Piano Phase** (Alexander Chen) | Reich's twelve note figure as two dots, red and blue, tracing lines around one circle, pitch as the shape, so the drift of one player against the other is visible | [CDM](https://cdm.link/see-phasing-visualization-steve-reichs-piano-phase/), [Wikipedia, Piano Phase](https://en.wikipedia.org/wiki/Piano_Phase) | READ (summary) |
| **Bloom** (Eno and Chilvers) | each tap is a circle that grows and fades; the note and circle repeat *"at regular intervals, growing gradually softer"*, so the loop is drawn as decaying rings in place, not on a timeline | [Wikipedia, Bloom](https://en.wikipedia.org/wiki/Bloom_(software)), [CDM hands on](https://cdm.link/hands-on-with-bloom-new-generative-iphone-app-by-eno-and-chilvers/) | READ |
| **Teenage Engineering OP-1 tape** | the tape moves under a fixed tape head: *"press STOP to center it under the tape head"*; takes are grey lines, orange on the active track; loop in and out marks | [OP-1 tape mode guide](https://teenage.engineering/guides/op-1/original/tape-mode) | READ |
| **OP-Z** | the companion app shows *"the numbers and graphs behind the music"*; the device itself has LEDs | [MusicTech review](https://musictech.com/reviews/hardware-instruments/teenage-engineering-op-z/) | READ (summary); no circular sequencer view found |
| **Ableton Note** | a 5 by 5 pad grid; Capture detects tempo and length; a clip preview shows its notes | [Note manual](https://www.ableton.com/en/note/manual/), [Sound On Sound](https://www.soundonsound.com/reviews/ableton-note) | READ; no progress ring documented |
| **Elastic Drums, Koala Sampler** | step grids, not circles, as far as the sources say | [Sound On Sound, Elastic Drums](https://www.soundonsound.com/reviews/mom-instruments-elastic-drums) | READ; the brief assumed a circle, none found |

**What the circular row shows that the clip row does not** (INFERRED): angle
is phase, so a loop's whole content is visible at once and the position of
now inside it is a hand, not a number. **What it hides**: every one of these is
step based or beat based except Loopy (audio, any length that is a multiple or
fraction of the clock) and Bloom (no loop length at all). None of them draws
pitch on the circle except Piano Phase.

### 1.3 Free, tempo-less and live looping

| product or performer | what is shown | source | tag |
| --- | --- | --- | --- |
| **Boss RC-1** | a circular 24 segment LED ring; red recording, red and green overdubbing, green playing; *"the speed at which the indicator rotates corresponds to the length of the loop"* | [RC-1 manual](https://manualmachine.com/boss/loopstationrc1/19063781-user-manual/) | READ (summary) |
| **Boss RC-505mkII, RC-5** | a circular track status indicator per track, settable to STATUS, LOOP POSITION or LEVEL; the RC-5 can show the position, the patch, or *REC, PLAY, DUB* as text | [RC-505 manual p22](https://www.manualslib.com/manual/1638740/Boss-Rc-505.html?page=22), [RC-5 guide](https://www.benrowlandsmusic.com/blogs/guides/boss-rc-5-setup-guide) | READ (summary) |
| **TC Ditto X4** | one LED per state, no position ring | [Barbosa et al. 2017](https://hal.science/hal-01528923) uses the Ditto as its example of *"low"* visual feedback | READ |
| **EHX 95000** | a 4 digit LED shows bar and beat; a dot beside the loop number means it holds audio; a quantised stop rounds to the bar | [95000 manual](https://www.ehx.com/wp-content/uploads/2021/01/95000-manual.pdf) | READ (summary) |
| **EHX 720** | for loops up to 10 s the LED counts seconds 0 to 9 | [720 manual](https://www.manualslib.com/manual/1088680/Electro-Harmonix-720.html) | READ (summary) |
| **Pigtronix Infinity** | red, green and orange LEDs for play, record, overdub | [MusicTech review](https://musictech.com/reviews/pigtronix-infinity-looper-review/) | READ (summary) |
| **Chase Bliss Blooper** | no screen; 16 layers, the first 7 kept separately and the rest merged; a Layers knob walks back through them; a loop is identified by counting blinks on the modifier LEDs | [Blooper manual](https://cb2k22.squarespace.com/s/Blooper_Manual_2023_Pedal_Chase-Bliss.pdf) | READ (summary); no waveform or trail display found, the brief's assumption was not confirmed |
| **SooperLooper** | a circle per loop that fills with the recorded waveform as you record, position as a ratio | [GitHub](https://github.com/essej/sooperlooper), [Linux Journal](https://www.linuxjournal.com/content/getting-loopy-performance-loopers-linux-musician) | READ (summary) |
| **Mobius** (Circular Labs) | a Loop Radar per track strip, a Loop Meter, and **Layer Bars**: the loop's layer history with the current layer on the right, moving left on undo | [Mobius reference](http://www.circularlabs.com/doc/v1/reference.htm), [Getting started](http://www.circularlabs.com/doc/v2/starting.htm) | READ (summary) |
| **Augustus Loop** (Expert Sleepers) | a tape delay as looper; a GUI element *"to visualise the audio that's recorded onto ... virtual tape"* | [Augustus Loop manual](https://www.expert-sleepers.co.uk/downloads/augustusloop_2_4_1_manual.pdf) | READ (summary) |
| **Freewheeling** | up to eight loops as colour coded blocks; Barbosa et al. use it as the example of *"high"* visual feedback, a full monitor | [Freewheeling](https://github.com/free-wheeling/freewheeling), [Barbosa et al. 2017](https://hal.science/hal-01528923) | READ |
| **Ableton Capture, Logic Capture, Loopy retrospective** | no display of the buffer; the loop appears after the fact | `plans/plan-looper-accuracy.md` section 1 | READ there |
| **Ed Sheeran, Chewie Monsta II** | Mobius on a laptop, its UI mirrored to two screens on the pedal: the left shows *"the waveform of the current loop"*, the right *"all four tracks and their current statuses"* (GUITAR, BOOM, RC20, VOX), plus four level meters | [Music Lowdown](https://musiclowdown.co.uk/chewie-2-ed-sheeran/), [Equipboard](https://equipboard.com/pros/ed-sheeran) | READ (summary) |
| **Marc Rebillet** | *"The full composition is with the looper ... Everything is recorded onto the RC-505"*; Ableton only as a patch bank | [loopingguitar.com](https://loopingguitar.com/en/artists/marc-rebillet/) | READ (summary) |
| **Andrew Bird** | by ear: *"Playing by ear creates a direct pathway from what you hear to what you play"* | [The Great Creators](https://www.thegreatcreators.com/episodes/bird) | READ (summary) |
| **Imogen Heap, Mi.Mu gloves** | the gloves carry LEDs and a haptic motor; loops are started by gesture | [Wikipedia, Mi.Mu Gloves](https://en.wikipedia.org/wiki/Mi.Mu_Gloves) | READ (summary) |

**What the live row says** (INFERRED): hardware gives a ring or a number and
expects the ear to do the rest. The professionals who loop at scale either use
a small number of tracks with fixed roles named on the screen (Sheeran's four,
by instrument) or keep it all in one box they know by touch (Rebillet's five
tracks). Nobody found here tracks layers by eye on a rich display; they track
them by **role** (a track is the bass, a track is the percussion), which is a
naming and colour answer, not a timing one. **How performers follow layers by
eye was not found in any source** (section 7).

## 2. What the literature says

- **Performers lose which loop is which, and said so.** The Living Looper
  team built a per loop visualisation *"In response to user comments in our
  previous study about the difficulty of keeping track of which loop was
  making which sound"*. Its design goal: an *"ambient, intuitive sense of loop
  content"* that is *"not ... so interesting to look at that it would interfere
  with listening"*. Each loop's glyph is scaled by loudness so *"very quiet
  sounds shrink to nothing"*, and *"Previous frames ... fade out gradually so
  that quick changes appear visible"*. The performer leaned on it while
  learning, then it *"faded into the background"*, and returned when she had to
  *"locate which loop had gone into a particular state"*.
  ([Shepardson, Stefánsdóttir and Magnusson, NIME 2025](https://nime.org/proceedings/2025/nime2025_36.pdf), section 2.2 and 4) (READ)
- **A design space for loopers, from 101 tools.** Barbosa, Wanderley and Huot
  rate *visual feedback intensity* (low, a Ditto LED, to high, Freewheeling's
  full screen) and *visual feedback role*: *limited* (only when a control is
  touched), *transparent* (*"allows users to quickly infer the current status
  of the system (e.g. the Boss RC-1)"*) or *ornamental*. Their guideline is
  *"transparent and intense visual feedback"*, and their own prototype draws
  the loop's waveform with *"a gray line indicating the playback position"*
  and turns red when overdubbing.
  ([NIME 2017, HAL](https://hal.science/hal-01528923), [Zenodo](https://zenodo.org/record/1176181)) (READ)
- **The circle is the standard notation for a repeating rhythm.** Toussaint's
  clock diagrams put the start at zero, run clockwise, mark onsets as filled
  dots, and join them into a polygon, so evenness and symmetry are visible.
  ([Toussaint, The Geometry of Musical Rhythm](http://cgm.cs.mcgill.ca/~godfried/publications/geometry-of-rhythm.pdf), [MTO review](https://mtosmt.org/issues/mto.13.19.2/mto.13.19.2.gotham.html)) (READ (summary))
- **Spirals for periodic data, and a warning.** One turn per period lines up
  repeating structure across turns ([Weber, Alexa and Müller, InfoVis 2001](https://www.semanticscholar.org/paper/Visualizing-time-series-on-spirals-Weber-Alexa/c518352c6711ca3df41371eee10b80e14fc8863d);
  [Carlis and Konstan, UIST 1998](https://files.grouplens.org/papers/p29-carlis.pdf)).
  The counter view: *"spirals do not have the advantage that is currently
  assumed"* and *"the rectangular version has a slight advantage"* for seeing
  intervals ([Kosara, eagereyes](https://eagereyes.org/blog/2011/spirals)).
  For loops the period is known exactly, so the spiral's usual weakness
  (guessing the period) does not apply, but stacked rows are at least as good
  for comparing laps. (READ, INFERRED)
- **Look-ahead is a named design quantity in rhythm games**: *"the distance
  between a cue and the action bar when the cue first appears"*, and osu!'s
  approach circles *"close in on hit circles to visually indicate the timing"*.
  ([CMU ETC rhythm game vocabulary](https://projects-old.etc.cmu.edu/jam-session/index.php/2019/09/07/jam-session-vocabulary-list/), [Wikipedia, osu!](https://en.wikipedia.org/wiki/Osu!)) (READ (summary))
- **What pops out, and what hides a change.** Motion, flicker and hue are
  preattentive; flicker was the least distracting motion cue
  ([Healey, Perception in Visualization](https://www.csc2.ncsu.edu/faculty/healey/PP/)).
  A change is found instantly when it makes a visual transient and can take
  many seconds when the transient is masked
  ([Rensink, Change Blindness](https://www2.psych.ubc.ca/~rensink/publications/download/NeuroBiol-RR.pdf)).
  **For this plan that means a display where every mark is always moving
  (a scrolling strip) masks the arrival of a new note, and a display where
  marks stay put (a circle with a moving hand) lets a new mark be the only
  thing that changed.** (READ, the last sentence INFERRED)
- **Onion skinning** shows *"faint, see-through copies of past and future
  frames"* beside the current one, which is the animator's answer to *"what
  just changed"* ([Wikipedia](https://en.wikipedia.org/wiki/Onion_skinning)). (READ)
- **Loops of irregular, incommensurable length are an old compositional
  method**: Eno's Music for Airports 2/1 loops one sung note each, at about
  20.1 s and 19.6 s for two of them, drifting together and apart
  ([Reverb Machine](https://reverbmachine.com/blog/deconstructing-brian-eno-music-for-airports/));
  Parviainen's reconstruction uses seven loops of 17.7 to 22.1 s, saying
  *"their exact values are not hugely important"*
  ([JavaScript Systems Music](https://teropa.info/blog/2016/07/28/javascript-systems-music.html),
  [How Generative Music Works](https://teropa.info/loop/)). Eno's graphic
  score drew each loop as a rectangle with varying space between them. Reich's
  phasing is the two player version. These are the owner's case (free length,
  no grid) with a published history. (READ)
- **Animated scores that follow parts**: Malinowski's Music Animation Machine
  draws parts as bars and *part motion* as balls, lighting each note as it
  sounds ([Wikipedia](https://en.wikipedia.org/wiki/Stephen_Malinowski), [MAM player](https://www.musanim.com/Player/)). (READ (summary))

**No NIME, ICMC or CHI paper was found that measures whether a circular or a
linear loop display helps a player follow loops.** The two looper papers above
are design papers with one performer or none. (section 7)

## 3. The owner's problem as requirements

From *"hard to follow"*, *"lost in loops"*, *"I can't really visually track
what is going on"*, plus loops of 1 to 15 s with no tempo, and overdubs
coming. Each is a question a glance must answer, in priority order.

| # | at a glance, the player can see | why | what today's 020 does |
| --- | --- | --- | --- |
| R1 | **where now is in each loop** | the hand needs to know how far it is to the seam | yes, the strip playhead |
| R2 | **what is about to play, and which keys** | to play along or against the loop, not after it | no |
| R3 | **how long each loop is, compared with the others** | irregular lengths drift; a 7.5 s loop and a 15 s loop look identical as rings unless size says so | the strip is refitted to each loop, so every loop looks the same width |
| R4 | **which layer is which** (take, overdub 1, overdub 2) | Living Looper's finding; overdub is coming | no layers yet |
| R5 | **what just changed** (the notes the last pass added or removed) | an overdub that lands where you did not expect is the moment you get lost | no |
| R6 | **where the seam is and what crosses it** | the accuracy plan's whole subject: first notes and end notes | the strip edges |
| R7 | **nothing that implies a grid** | *"Raw. No quant no bpm"* | met |
| R8 | **it reads at the desk without being studied** | the hands are on the keys; the look is a glance, and it must not pull attention off listening (Living Looper's own constraint) | the strip is small |

R3 has a consequence for every circular design: **if every loop is a circle of
the same size, a 1 s loop's hand spins 15 times faster than a 15 s loop's and
neither says how long it is.** The Boss RC-1 uses exactly that (rotation speed
is length) and it is the weakest way to encode length (INFERRED). The fix used
below is to make **circumference proportional to length**, so the hand's tip
moves at the same speed in every circle and one centimetre of rim is the same
time everywhere. (PROPOSED)

## 4. The design space

Ten ideas. Each: a sketch, what it answers from section 3, what it costs, and
how it fails for free, irregular loops and for overdubs.

### 4.1 Loop clock (time as angle, pitch as radius)

```
            seam (12 o'clock, first note)
                 |
          .  o   |   .           o  a note, at its phase, radius = pitch
       o         |       o       hand sweeps clockwise from the seam
                 |               notes behind the hand: dim
      .          +-----> hand    notes ahead of it: full
                         o       a note under the hand: flashes
       o                 .
          .   o     o   .
```

- **Answers** R1 (hand), R6 (seam at the top, marked with the accuracy plan's
  lookback reach as a short arc before it), R7, R8 (marks stay still, only the
  hand moves, so a new note is a transient). With radius as pitch, a chord is a
  radial line and a melody is a path, which is Toussaint's polygon with pitch
  added and Piano Phase's drawing for one player.
- **Costs** a new kit renderer (a canvas, one arc per note, the hand). The
  loop's events and clock already exist in 020 (`L.events`, `L.lapStart`,
  `L.len`). Small. (INFERRED)
- **Fails**: on R3 if circles are all one size (fixed by circumference
  proportional to length, 4.2); a 15 s loop with dense playing crowds the inner
  rings if pitch range is wide (map the loop's own pitch range, not 0 to 127);
  a note held across the seam has to be drawn as an arc that crosses 12
  o'clock (the accuracy plan's held notes wrap, section 2.6). Overdubs land at
  the same angle every lap because length is fixed, so they need colour (4.3),
  not position.

### 4.2 Orrery: one clock per loop, sized by length

```
   loop A 7.5 s          loop B 15.0 s               loop C 2.4 s
      ___                   _______                     _
    /  |  \               /    |    \                  (|)
   |   +-  |             |     +---  |                  -
    \_____/              |           |
                          \_________/
   rim speed is the same in all three, so B's hand looks slow because it is
```

- **Answers** R3 directly (area or circumference is length), R1 for every
  loop at once. Shows the Eno and Reich case: two loops whose seams are about
  to coincide can be flagged (both hands near 12 o'clock within, say, 100 ms).
- **Costs** 4.1 times N, plus layout. Only useful once there is more than one
  loop: 020 has one, the kit keyboard's `numloop` has ten.
- **Fails**: a 1 s loop is a small circle and a 15 s loop is fifteen times the
  circumference, so the small one is unreadable at phone width (at 375 px the
  big one is at most about 300 px across, the small one 20 px). Square root
  scaling (area proportional to length) keeps the small one readable but gives
  up equal rim speed. A choice to try, not to settle on paper. (INFERRED)

### 4.3 Layer rings (overdubs as concentric bands, colour by layer)

```
        outer band: overdub 2 (newest, brightest)
        middle band: overdub 1
        inner band: the take
   each band is a thin loop clock of its own, pitch within the band
```

- **Answers** R4 (each layer has its own band and colour), R5 when the newest
  band is the brightest and the one that just landed pulses once. This is
  Patterning's orbits and Mobius's Layer Bars bent round one circle.
- **Costs** small once 4.1 exists. Needs overdub in 020 first, which is the
  accuracy plan's recommendation 6 and not built.
- **Fails**: pitch resolution per band shrinks with every layer (three layers
  in a 300 px circle leave about 40 px of radius each). After four or five
  layers it is a texture, not a reading; Blooper merges everything after
  layer 7 for its own reasons and a display could do the same (merge into one
  dim band). (INFERRED)

### 4.4 Lap stack (onion skin on the strip)

```
   lap n-3  |   .    .  .        .     |     faint
   lap n-2  |   .    .  .        .  .  |
   lap n-1  |   |    |  |   |    |  |  |
   lap n    |   |    |  |   | ^  |  |  |     current, playhead ^
            seam                       seam
   a note added in lap n-1 appears as a column that starts there
```

- **Answers** R5 best of all the ideas: a new note is a column that starts
  part way down, a removed note (undo) a column that stops. R6 (both seams are
  the edges). R1 with the existing playhead.
- **Costs** the least: it is the existing `ticks` renderer, one lane per lap,
  `colorOfRow` for age, `latch` for played. The strip is the kit's and already
  on 020. Kosara's point that rows beat spirals for comparing periods supports
  it. (READ, INFERRED)
- **Fails**: it is linear, so it has the scrolling problem only if it scrolls;
  it must not (one lap per row, fixed axis, the playhead moves). Takes
  vertical room: four laps at 18 px is 72 px, which is what 020's lane already
  is. Pitch is still only on hover unless the lane gets a pitch axis (4.6).

### 4.5 Spiral of laps

```
   one turn per lap, outward; the current lap is the outer turn,
   the hand at its tip; earlier laps fade inward
```

- **Answers** R5 and R1 in one figure, the Weber and Carlis display with the
  period known exactly.
- **Costs** medium: a new renderer, and pitch has nowhere to go (radius is
  already time).
- **Fails**: after a dozen laps the inner turns are too small to read; turn
  spacing must be constant or comparison suffers (Kosara). It answers the same
  question as the lap stack with more ink. Listed to be refused unless the
  stack proves too tall. (INFERRED)

### 4.6 Fixed now with look-ahead (the rhythm game highway)

```
   past (dim)        NOW                 future (from the loop, exact)
   ..|..|....|.......|......|..|.|.......|....|..
                     ^ fixed
   the loop's events scroll toward NOW; at the seam the next lap simply
   continues to the right, so the seam is a mark, never a jump
```

- **Answers** R2 strongly (you see the next second or two coming), R6 (the
  seam is a vertical rule passing through), R7. No wrap jump ever, which the
  current strip has at every seam.
- **Costs** small in data (the future is `L.events` shifted by `k * L.len`),
  but the strip deliberately does not pin the view to the playhead, and
  `plans/plan-live-timeline.md` says why: *"an axis that slides with the
  playhead cannot show the playhead moving"*. Here that is the point rather
  than the defect, but it means a separate view, not a mode of the live one.
- **Fails**: everything moves all the time, so a new note arrives without a
  transient (Rensink): it answers "what is next" and is poor at "what
  changed". Length is not visible at all (R3). For two loops of different
  lengths it still works, which no circle can claim: one lane per loop, all on
  one wall clock axis.

### 4.7 Keys that light before they play

```
   roll (vertical, time falls toward the keys)
      :      o              o   next 1.5 s of the loop, as dots falling
      :   o       o
      v
   [ keyboard, keys that will sound in the next ~300 ms glow, then flash ]
```

- **Answers** R2 at the place the eyes already are, which is the keys. A
  Synthesia style falling roll is the fixed now idea (4.6) turned vertical and
  aligned to the keys.
- **Costs**: `roll.mjs` already aligns dots to keys with `placeKey` and
  already plans autoscroll inside a fixed window; `keyboard.mjs` already lights
  keys through `lightNote` for every route a note takes. A pre-light is a
  second, dimmer lamp state. Medium, all in existing kit pieces. (READ, INFERRED)
- **Fails**: shows nothing about the loop as a whole (R1, R3, R6 only by
  inference). A dense loop lights half the keyboard. A Rhodes and piano loop
  with the sustain pedal used as the looper's switch has no sustain, so held
  notes have to be drawn from the loop's own note offs. Layer colour (R4) can
  be the dot's colour.

### 4.8 Approach rings on the clock

- On 4.1, each note's mark gets a ring that shrinks onto it during the last
  ~400 ms before the hand arrives (osu!'s approach circle). Answers R2 on the
  circle without a second view. Cheap once 4.1 exists. Fails in dense passages
  (rings overlap); limit to the next three onsets. (PROPOSED)

### 4.9 Ambient glyph per layer (Living Looper's answer)

- One small shape per layer whose size follows that layer's loudness right
  now and whose trail fades, beside the clock or under the keyboard. Answers
  R4 (*which layer is making this sound*) and nothing else. Cheap: the sampler
  already knows which voice belongs to the loop. Fails at telling time; it is
  a companion, not a display. (READ for the idea, INFERRED for the cost)

### 4.10 What just changed, in words

- 020 already logs every decision in plain words (*"second press: the loop is
  7.473 s with 12 notes"*). A fixed height line under the display reading
  *"overdub 2 added 5 notes, 0.8 to 3.1 s, G3 to D5"* answers R5 for anyone who
  missed the flash. Nearly free. Fails only by being read late. The strip
  wrapper's own rule applies: fixed height, never `min-height`. (READ, PROPOSED)

### Summary

| idea | R1 now | R2 next | R3 length | R4 layer | R5 changed | R6 seam | cost | free loops | overdubs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4.1 loop clock | yes | partly | no | with colour | good (marks still) | yes | small, new | yes | colour only |
| 4.2 orrery | yes | partly | **yes** | per loop | good | yes | 4.1 times N | yes, small loops hard to read | per loop |
| 4.3 layer rings | yes | partly | no | **yes** | yes | yes | small after 4.1 | yes | **made for it**, crowds after ~4 |
| 4.4 lap stack | yes | no | no | by row age | **best** | yes | **least**, existing strip | yes | yes |
| 4.5 spiral | yes | no | no | no | yes | yes | medium | yes | inner turns unreadable |
| 4.6 fixed now | yes | **yes** | no | per lane | poor | yes, no jump | small, separate view | **best for several lengths** | lanes |
| 4.7 keys light ahead | no | **best** | no | dot colour | no | no | medium, existing kit | yes | yes |
| 4.8 approach rings | with 4.1 | **yes** | no | no | no | no | small after 4.1 | yes | yes |
| 4.9 ambient glyph | no | no | no | **yes** | partly | no | small | yes | yes |
| 4.10 words | no | no | yes in text | yes in text | yes in text | no | nearly free | yes | yes |

## 5. Why not a grid, and what the grid gave that should be kept

The grid's gift is that **every position has a name**, so "the third beat of
bar two" is findable. Free loops lose that. What can replace it without a
tempo (INFERRED):

- **The seam and the loop's own notes are the landmarks.** On a clock, the
  first note sits at 12 o'clock and every other note is a landmark of its own,
  which is how a pianist already hears a phrase.
- **Optional quarter ticks of the loop length** (not beats, just the four
  quarters of this loop's circle) give the eye a scale without claiming a
  meter. Off by default, because R7. (PROPOSED)

## 6. Recommendation: three concept pages

The concept pages copy an earlier page and add one thing (positron-concepts
skill). All three are **020 plus a display**, with the looper logic untouched,
so the lesson of each page is only the picture. The next free numbers after
040 are 050, 060 and 070. Each ships with `what: ''` and a card in
`demo/concepts/list.mjs` when the owner asks for words.

### 6.1 `/concepts/sampler/050/`, Clock: 020 plus a loop clock (4.1 and 4.8)

- One circle under the transport bar, above the existing strip, which stays as
  the linear reading of the same loop (two drawings, one `L.events`).
- Seam at 12 o'clock; the accuracy plan's lookback shown as a short arc
  before it; pitch as radius over the loop's own range; notes behind the hand
  dim, the note under the hand flashes, the next three onsets get approach
  rings. While recording, the circle grows clockwise from the first note and
  closes when the take closes, so the moment the loop is made is visible.
- **Why first**: it answers R1, R6, R7 and R8 together and part of R2, it is
  the owner's own pointer (*"Loopy Pro, which does the circle things"*), and
  with fixed marks and a moving hand a new note is the only transient, which is
  what a person who is lost needs to notice.
- **Reuses**: 020 whole (looper, bay, sampler, pickers, Copy log), the
  transport bar and strip (`demo/shell/strip.mjs`) unchanged, the deck as the
  clock it already is. **New**: one kit module, proposed
  `demo/shell/loop-clock.mjs`, a canvas renderer that takes `{ events, len,
  pos, layers? }` and owns no clock and no audio (the `numloop.mjs` rule), so it
  can serve 060, 070 and the kit keyboard's looper later. It is a shared piece,
  so it is written once before any page uses it (CLAUDE.md, *anything shared
  is done once*). (PROPOSED)

### 6.2 `/concepts/sampler/060/`, Laps: 020 plus the lap stack and layer colour (4.4, 4.10)

- The strip's single `loop` lane becomes four lanes, the last four laps,
  newest at the bottom with the playhead, older ones fading. A note's colour is
  its layer (take, overdub 1, overdub 2), via `colorOfRow`; `latch` dims what
  has played this lap. One fixed height line of words under it for the last
  change.
- **Why second**: it is the cheapest page that answers R5, which is the
  question that matters most once overdub exists, and it changes no kit code
  (only lane config on the existing strip). It also tests whether the owner
  prefers a linear reading to a circular one, which nobody can settle for him.
- **Depends on overdub.** Without it every lap is identical and the stack shows
  nothing new, so this page is worth building the day 020 gains overdub
  (accuracy plan recommendation 6), not before. Until then it can show takes:
  press 3 starts a new take and the stack shows the old one fading above.
- **Reuses**: `demo/shell/strip.mjs` lanes, `timeline/strip.mjs` ticks with
  `latch`, `colorOfRow`, `widthOfRow`. **New**: nothing in the kit. (PROPOSED)

### 6.3 `/concepts/sampler/070/`, Ahead: 020 plus keys that light before they play (4.7)

- The kit keyboard under the looper with `roll.mjs` glued on top as a falling
  window of the next ~1.5 s of the loop; keys due in the next ~300 ms pre-light
  at a low level and flash when they sound.
- **Why third**: R2 is the gap every product leaves open and the one MIDI
  makes free, and it puts the answer where the eyes already are. It is also the
  only one of the three that helps playing along rather than understanding.
- **Reuses**: `demo/shell/keyboard.mjs` (`lightNote`, the lamp), `roll.mjs`
  (`placeKey` alignment, rows), 020's looper. **New**: autoscroll in
  `roll.mjs` inside a fixed height window (already planned in its header), and
  a second lamp level on the keyboard. Both shared, both done once. (PROPOSED)

### Not now

- **4.2 orrery** waits for more than one loop. 020 has one; when the pedal
  looper or the kit keyboard's ten slots play several free loops at once, 050's
  module draws N circles and the size rule (circumference or area) gets tried
  then, at phone width.
- **4.6 fixed now highway** is the right answer for several loops of
  unrelated length on one screen and the wrong one for "what changed". Revisit
  with the orrery.
- **4.5 spiral** refused unless 060's stack proves too tall.
- **4.9 ambient glyph** is a cheap add to any of the three once layers exist.

## 7. What could not be settled

- **Whether a circle or a line is easier for THIS player to follow.** No
  paper found measures it for loopers; the two NIME papers are design papers.
  Only building 050 and 060 and putting them in front of the owner settles it.
- **How professional live loopers follow layers by eye.** No interview found
  says; the material found says they track by role and by ear (Sheeran's
  named tracks, Rebillet's one box, Bird by ear). This is a gap in the sources,
  not a finding that nobody looks.
- **Product details that did not load**: Apple's Live Loops pages are rendered
  by script and their text came through search summaries; GarageBand's progress
  ring is inferred from Logic; the MPC 3 clip matrix display, the OP-Z app
  views, Loopy Pro's exact ring geometry (tick marks, where the playhead is
  drawn) and Mobius's Loop Radar were not read in full. The Blooper has no
  waveform display as far as its manual summary goes, against the brief's
  assumption.
- **Size encoding for several loops**: circumference proportional to length
  (equal rim speed) against area proportional to length (small loops
  readable). Needs a phone in a hand.
- **How many layers a ring display holds** before it is texture: guessed at
  four from pixel arithmetic, not tried.
- **Whether pre-lighting keys (070) helps or distracts** a player who is
  improvising over the loop rather than doubling it. Healey's flicker result
  says a pulse is the least distracting motion; that is a lab result about
  glyphs, not about a keyboard.
- **Elastic Drums and Koala** were in the brief as circular; the sources
  found describe step grids. Not checked on a device.

## 8. Sources

Products and manuals: [Ableton Session View](https://www.ableton.com/en/manual/session-view/),
[Ableton Looper p311](https://www.manualslib.com/manual/449421/Ableton-Live.html?page=311),
[Ableton Note manual](https://www.ableton.com/en/note/manual/),
[Push 2 interface](https://github.com/Ableton/push-interface/blob/main/doc/AbletonPush2MIDIDisplayInterface.asc),
[Launchpad Pro programmer's reference](https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/downloads/Launchpad%20Pro%20Programmers%20Reference%20Guide%201.01.pdf),
[Apple, Use Live Loops](https://support.apple.com/en-us/102113),
[Apple, start and stop cells](https://support.apple.com/guide/logicpro/start-and-stop-cells-lgcpb461e752/mac),
[Sound On Sound, Live Loops](https://www.soundonsound.com/techniques/live-loops-logic),
[GarageBand iPhone, play cells](https://support.apple.com/guide/garageband-iphone/play-cells-in-the-grid-chsb722a0c39/ios),
[Bitwig 6.0 release notes](https://downloads.bitwig.com/6.0/Release-Notes-6.0.html),
[FL Studio Performance Mode](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/playlist_performance.htm),
[Circuit Tracks guide](https://fael-downloads-prod.focusrite.com/customer/prod/downloads/circuit_tracks_user_guide_v3_en.pdf),
[Loopy Pro manual](https://loopypro.com/manual/),
[No Treble on Loopy](https://www.notreble.com/buzz/2011/12/12/loopy-a-look-at-the-looper-app-for-ios/),
[Loopy HD App Store](https://apps.apple.com/us/app/loopy-hd-looper/id467923185),
[Patterning, Sound On Sound](https://www.soundonsound.com/reviews/olympia-noise-co-patterning),
[Rhythm Necklace](https://mearaoreilly.com/Rhythm-Necklace),
[Concentric Rhythm](https://www.synthtopia.com/content/2017/04/26/ios-sequencer-concentric-rhythm-lets-you-explore-the-geometry-of-rhythm/),
[CDM circular music makers](https://cdm.link/circles-and-euclidian-rhythms-off-the-grid-a-few-music-makers-that-go-round-and-round/),
[OP-1 tape mode](https://teenage.engineering/guides/op-1/original/tape-mode),
[Boss RC-1 manual](https://manualmachine.com/boss/loopstationrc1/19063781-user-manual/),
[Boss RC-505 manual p22](https://www.manualslib.com/manual/1638740/Boss-Rc-505.html?page=22),
[EHX 95000 manual](https://www.ehx.com/wp-content/uploads/2021/01/95000-manual.pdf),
[EHX 720 manual](https://www.manualslib.com/manual/1088680/Electro-Harmonix-720.html),
[Blooper manual](https://cb2k22.squarespace.com/s/Blooper_Manual_2023_Pedal_Chase-Bliss.pdf),
[SooperLooper](https://github.com/essej/sooperlooper),
[Mobius reference](http://www.circularlabs.com/doc/v1/reference.htm),
[Augustus Loop manual](https://www.expert-sleepers.co.uk/downloads/augustusloop_2_4_1_manual.pdf),
[Freewheeling](https://github.com/free-wheeling/freewheeling),
[Chewie II](https://musiclowdown.co.uk/chewie-2-ed-sheeran/),
[Marc Rebillet setup](https://loopingguitar.com/en/artists/marc-rebillet/),
[Bloom](https://en.wikipedia.org/wiki/Bloom_(software)),
[Piano Phase visualisation](https://cdm.link/see-phasing-visualization-steve-reichs-piano-phase/).

Research: [Shepardson et al., NIME 2025, Evolving the Living Looper](https://nime.org/proceedings/2025/nime2025_36.pdf),
[Barbosa, Wanderley and Huot, NIME 2017](https://hal.science/hal-01528923),
[Toussaint, The Geometry of Musical Rhythm](http://cgm.cs.mcgill.ca/~godfried/publications/geometry-of-rhythm.pdf),
[Weber, Alexa and Müller 2001](https://www.semanticscholar.org/paper/Visualizing-time-series-on-spirals-Weber-Alexa/c518352c6711ca3df41371eee10b80e14fc8863d),
[Carlis and Konstan 1998](https://files.grouplens.org/papers/p29-carlis.pdf),
[Kosara, Spirals for periodic data](https://eagereyes.org/blog/2011/spirals),
[Healey, Perception in Visualization](https://www.csc2.ncsu.edu/faculty/healey/PP/),
[Rensink, Change Blindness](https://www2.psych.ubc.ca/~rensink/publications/download/NeuroBiol-RR.pdf),
[CMU ETC rhythm game vocabulary](https://projects-old.etc.cmu.edu/jam-session/index.php/2019/09/07/jam-session-vocabulary-list/),
[Reverb Machine on Music for Airports](https://reverbmachine.com/blog/deconstructing-brian-eno-music-for-airports/),
[Parviainen, JavaScript Systems Music](https://teropa.info/blog/2016/07/28/javascript-systems-music.html),
[Onion skinning](https://en.wikipedia.org/wiki/Onion_skinning).

In this repository: `plans/plan-looper-accuracy.md`, `plans/plan-looper.md`,
`plans/plan-live-timeline.md` section 2 (the axis that slides),
`research/loops-prior-art-2026-08.md`, `demo/concepts/sampler/020/index.html`,
`demo/shell/strip.mjs`, `timeline/strip.mjs` (ticks renderer),
`demo/shell/roll.mjs`, `demo/shell/keyboard.mjs`, `demo/shell/numloop.mjs`.
