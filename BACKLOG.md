## Open

- **`/flipper/` re-architected** (2026-10-05): *"can you architect flipper to use onlu videos and use new pachbay architeture. different transports to each videopnel"*. Plan first: `plans/plan-flipper-patchbay.md`. `demo/flipper/index.html`, `demo/shell/bay.mjs`.

- ~~**Archive the remixer demo** (2026-10-05, *"archvie remixer demo"*)~~ Done 2026-10-05: row off the manifest, `proto/remixer/` moved to `archive/remixer/` except `hls.min.js`, which eight pages load.

### Logged 2026-10-05 evening on *"log bunch of tasks then go"*, from the session's open ends

- **`/parts/` gains the cable chain, the brick and the 400 board**: Pico to the hub's USB-B (OTG adapter then printer cable, a plug and socket picture), the adjustable 3 to 12 V brick for the MB102 (9 V, 5.5x2.1, centre positive), and a 400 hole layout. `demo/parts/index.html`, `rig/pico/oled/breadboard.mjs` (new `400` mode).
- **Empty message lists reserve about 115 px of blank**: `/sync/` INSTANT and `/wire/` MESSAGES, the reserve is in the shared list (`demo/shell/messages.mjs` or shell.css).
- **DATES leftovers**: zoom does not stay on the playhead; the spread-out legend is cut at 375; the rightmost ruler label is cut at the plot edge; the gutter narrows at `0 of 0` and moves the plot. `demo/time/dates.mjs`, `timeline/strip.mjs`.
- **`/stage/` leftovers**: the diagram at 375 is a tangle of long return lines (`demo/shell/diagram.mjs` stacked layout); `Send in 10s` is unexplained.

- ~~**`/stage/` drop the local film, clock without ms** (2026-10-05, *"drop. rm ms"*): Start show no longer downloads the 253 MB film into the page (`filmCommand.play()` in `startShow`), mute acts on the live stream, deep film/mute asserts rewritten; the bar clock loses its milliseconds. `demo/stage/index.html`.~~ Done 2026-10-05: film, `?bg=` route and dead archive branches removed (864 lines out), mute on the live picture, clock elapsed only; 5 deep asserts rewritten and UNRUN.
- ~~**`/time/` DATES readable** (2026-10-05, *"fix time"*): `zoom left 7.0e13 ×`, `finest 0.004 ms`, ruler `-1.0 ka` against a year cell `1100`. `demo/time/dates.mjs`, maybe the deep-time ruler format in `timeline/strip.mjs`.~~ Done 2026-10-05: calendar ruler and cells (`calendar: true` on the strip, opt in), fit bug at 1280 fixed.

- ~~**`/kit/` ROUTER FIRMWARE screen size** (2026-10-05): *"ROUTER FIRMWARE - same screen size as othters"*. `demo/kit/index.html`, the router block's `oledScreen`.~~ Done 2026-10-05: same 2x scale as the other OLED blocks.

- ~~**UX review and fix, round 2** (2026-10-05, *"review and fix all"*): review `/partitur/` and `/stage/` like the tabbed pages, and fix the five left from round 1: REPLAY empty black box before play (`demo/sync/after.mjs`), LOOPS arrow-only button (`demo/time/loops.mjs`), shared `createHardware` "Enable soundcard / MIDI and play" label, KEYBOARD readout keys (`demo/wire/notes.mjs`, checks read them by key), primary buttons in sentence case beside uppercase siblings (`.pos-pri`, kit-wide).~~ Done 2026-10-05: partitur and stage reviewed and fixed, REPLAY box captioned, LOOPS direction a labelled choice, hardware button plain, KEYBOARD keys plain, strip ruler label moved to the gutter, empty glue hides itself. Button casing REFUSED: recorded owner decision 2026-09-30 *"cap: all secondary buttons"*, primary keeps its case.

- ~~**Three leftovers from the tabbed-page review** (2026-10-05, *"do all"*): `/time/` manifest `one` describes only the clock tab; the DATES aggregate lane note is jargon (`strip.mjs`, shared); `/partitur/` SCORE link picks do not share a label column. Plus the standing reds: `/wire/` KEYBOARD onset, `/capture/` RECEIVER WebRTC never connects, `/capture/` seek 1334 vs 1391.~~ Done 2026-10-05: all three fixed; the WebRTC reds were the Check Point tunnel being the only host candidate, worked around in `verify.mjs` with an audio-only permission grant for `wire` and `capture`; the seek red did not reproduce alone.

- ~~**Tabbed pages, critical UX review** (2026-10-05): *"do critical user experience review of new demost with many tabs. its hard to understand what they do. have a fixed height descriptions under tabs to explain. rm top desriptions. rething labelling. in bg"*. `/sync/` `/time/` `/wire/` `/capture/` (+ `/partitur/` once it is tabbed), `demo/shell/tab-page.mjs`.~~ Done 2026-10-05: fixed-height `about` box under the tab row, `what` removed, 9 of 15 tabs renamed.

- ~~**`/patchbay/` WHY text, shorten 2x** (2026-10-05): *"shorten 2x"* on the five WHY paragraphs. `demo/patchbay/index.html`.~~ Done 2026-10-05, five paragraphs to three, 176 words to 84.

- ~~**`/stage/` onto the patchbay**~~ (2026-10-05) refused by the owner after the plan: *"i do not about patchbay, perhaps just visual indication of picture happening"*. Replaced by the next line.
- ~~**`/stage/` shows the picture is happening** (2026-10-05): a visual indication that the live picture is arriving. `demo/stage/index.html`.~~ Done 2026-10-05: a tag on the picture driven by frames arriving (STARTING, RECEIVING, STALLED).
- ~~**`/partitur/` and `/wall/` into one tabbed page** (2026-10-05): *"unify partitur and wall to tabbed page. do it. rest you decide"*. Same shape as `/sync/` `/time/` `/wire/` `/capture/` (`tab-page.mjs`, 2026-10-04).~~ Done 2026-10-05: SCORE and WALL tabs, `/wall/` retired.

- ~~**`/kit/` OLED FONTS** (2026-10-05): *"to columns. longer uppercase saples"*. One 128x64 panel listing six fonts with a short `OK 1/2` each; wanted two columns and a longer uppercase sample per font. `demo/kit/index.html` `hwFontsDraw`.~~ Done 2026-10-05: two panels, three fonts each, name then the longest whole-word run of `SCENE 1/2 THRU PATCH 64 SENT OK` that fits.

### Found 2026-10-04 by the tab groundwork agent, not fixed

- **`/pack/` is 29/31**, with or without that agent's change (it swapped in
  HEAD's `transport-bar.mjs` to confirm): "every tab keeps its bare word until it
  has something to count" and the plain-wav zip check are red.
- **`/kit/`'s range-slider checks run for visitors.** No `SELFCHECK` around
  them, and they dispatch `ArrowRight`, which bubbles to `window` and moves every
  visible transport bar on the page by 2 per cent (why kit shots show bars at
  0:01.200). Breaks *"a self-check never runs for a visitor"*.

### Checks way lighter, two tiers, asked 2026-10-04

*"make checks way ligher (2 tiers?)"*, after `/keep/`'s fix made every harness
run of it hold a Cloudflare WHEP leg for 20 to 30 s and record two takes. Two
tiers: the default run grades what can be graded from this machine alone and
quickly; the deep tier, asked for by name, does the round trips, recordings and
anything that costs Stream minutes or another machine's attention.

### Kit in the first group on the index, asked 2026-10-04

*"move kit to first group in index page"*. `demo/manifest.mjs`, the `kit` row's
group.

### Do the demo restructure, decided 2026-10-04

*"names ok, looper retires, no redrect, capture is fine"*, answering
`plans/plan-demo-structure.md`'s four questions: `/sync/`, `/time/`, `/wire/`,
`/patchbay/`, `/capture/` as named; `/looper/` goes to the archive (the kit
module `looper.mjs` stays); old slugs simply 404, no redirect table; `/capture/`
is in scope, Stream cost per check run accepted. Work in the plan's §5 order:
shared pieces once, then one agent per page, the session owns `manifest.mjs`,
the archive moves and every commit.

### Time fields, a two-clock demo, and the message format, asked 2026-10-04

*"Can we cosolidate due at when? Can we do demo on synving thing and two clocks
ehatever. Wonder ou our message format ties into all this"*. Three things: (1)
`due` (timebase.mjs, when an event should happen), `at` (wire.mjs envelope, the
sender's Date.now() at send) and `when` (transport.mjs uncertainty bracket):
one vocabulary or a reason for three; (2) a demo of two clocks agreeing and
firing together; (3) how the wire envelope relates to the timing model.
Answered 2026-10-04: **rename**. `at` always means when the thing happens,
`due` folds into it, `when` stays the uncertainty around an `at`, and the
envelope's send stamp becomes `sent`. And instead of a two-clocks page:
*"Too many of thise demos, those old halfbroken but useful... peopose a new
structure of denis for this suff of times messages ayncs routes etc"*, so a
proposal for regrouping the time, message, sync and routing demos comes first.

### One demo page for timing light signals against heavy ones, asked 2026-10-04

*"Put to single demo"*, after plan-routing-time's step 2 was offered as
`/partitur/` plus `/wall/`. One page instead: a stage picture behind a link with
a measured lag (WebRTC 67 ms, LL-HLS 2 to 8 s with a jump, the Pi's audio 175
ms), a score sending cues and lights, and two walls side by side, one firing on
arrival and one following the picture through `demo/shell/timebase.mjs`.
Opens nothing on load and asks no server for anything.

### Universal routing: syncing light signals to rich ones, asked 2026-10-04

*"expand and work with universal router plan about those syncing stuff having
lightweight signals sync to the rich signals like cues and messages to a video
and audio stuff"*. Extend `plans/plan-universal-routing.md` (its §12 still lists
"time alignment across media in a recording" as open) with how a light link
(cue, state, value, midi) is timed against a heavy one (audio, video) on every
transport positron uses, live and recorded, and start on the smallest piece
that can be built and graded without a device.

### OLED: the right key column under the header, and a hold banner that never wraps, asked 2026-10-04

*"Try to fit right buttons under header. No wrapping on hold confirm, shoren
words"*. The header goes back to full width with the four label cells under it
(so they sit a little off level with the physical buttons, which is the trade
asked for), and the hold banner picks the first of a ladder of shorter wordings
that fits on one line instead of breaking onto two. `rig/pico/firmware/ui.c`,
`main.c`, the wasm build, `run-router.mjs` and `/kit/`'s parts.

### Hardware kit: button labels on the right, and a finer breakdown, asked 2026-10-04

*"Add oprion to hw kit to have button labels on right. Break down hw ui some
more on kit"*. The module's photo (oomipood, IMG35801442160.jpg) shows the four
buttons as a column on the RIGHT of the screen, ^ v # * top to bottom. So the
OLED UI kit (`rig/pico/firmware/ui.c`) gets a label placement option that puts
each key's label at the right edge level with its button, and `/kit/`'s
HARDWARE tab shows the UI's parts as separate specimens rather than one screen.
Then, mid-task: *"1px extra h padding around right buttons"*, so 3 px of air
either side of a label in the right column instead of 2.

### Synth options around the Crave, and wiring a Formanta drum machine, asked 2026-10-04

*"Other options aroond crave? I need ro wire formanta pds drum machine too"*.
Searches find a Formanta **UDS** (Soviet analogue drum synth, 7 channels, one
1/4 inch trigger input per channel, no MIDI as built, passive pads too weak to
trigger it, a line-level audio pulse does) and no "PDS"; the model on the desk
is to be confirmed by its label. Candidate: the Pico router grows a
note-to-trigger output (C1 to G1, the retrofit convention) on 7 GPIOs. The
threshold voltage is unmeasured. Audio back competes with the Circuit and a
Crave for the Fast Track Pro's two inputs.

### Plan: universal patchbay plus XR plus many people, after Dance Tonite, asked 2026-10-04

*"Still need plan to univesral router and xp and multiuse. See lcd soundsystem
and google cardboard interactive experiment"*. "xp" is read as XR. The reference
is read as LCD Soundsystem's *Dance Tonite* (2017, Jonathan Puckey and Moniker
with Google's Data Arts Team), a WebVR music video where room-scale headset
users record dance takes that loop together and Cardboard or phone viewers
watch the accumulated crowd. Output: one plan in `plans/` tying
`plan-universal-routing.md` to `plan-xr*.md` and many simultaneous or
asynchronous participants. Reported in full when it lands.

### Synths, effects, CV and modulation that run on the Pico chips, asked 2026-10-04

*"look at the synths and general effect and CV and modulation stuff which can be
built on that chip maybe in the eurorack context or those DX7 style stuff ...
what could we compile into it and somehow get the sound out of it or maybe some
kind of wave"*: a survey of open sound engines for RP2040/RP2350 (FM, wavetable,
Mutable ports, effects, modulation and CV generators), what we could compile into
our firmware, the ways sound gets out (PWM, I2S DAC, USB audio, Eurorack), and
whether the emulator could produce audible sound in the browser.

### Universal patchbay: the rest of the plan, asked 2026-10-04

*"Continue also work on the universal patch bay, whatever was there in a plan or
to do."* What was left: storage as a sink (record a link into R2 and play it
back), route-core's `curve`, `vel curve` and plain `note->cc` in JS and C with
vectors, the plan's open table updated with what was settled this week, and the
`/kit/#hardware` check bug.

### Pico wifi patchbay node, secure by default, asked 2026-10-04

*"Maybe it's just something that you can try and would be nice to have it always
secured. You can start the item one"*: plan-pico §1, the Pico 2 W joining
`studio-1` over **wss** (TLS) as the aim, plain ws only as a fallback, testable
before the board arrives.

### Research the plan's open issues, and modular-ready boards, asked 2026-10-04

*"regarding those open issues to do some research and in general would be cool to
have some kind of modular support maybe there are boards which are ready at the
right voltage for modular that can be programmed this way ... remember this play
my synth idea was to support modular synths"*: settle what research can settle
in plan-pico's open list, and survey Eurorack-ready programmable boards (RP2040 /
RP2350 first, at modular voltages) for playing a modular remotely
(`research/music-jamming-2026-08.md`, playasynth).

### `/kit/` opened at `#hardware` logs two red checks, found 2026-10-04

"two blocks in one part sit the project's one gap apart" and "typing then a
pause starts one compile" assume the page opened on its default tab; opened at
`#hardware` they measure blocks in a closed tab and log FAIL to a visitor. They
pass in `verify kit` (277/277). Make them say "not measured, its tab is closed"
rather than fail.
DONE 2026-10-04: the gap check takes one gap, the compile-note check grades
behaviour and says its geometry was not measured when its tab is closed.

### Plan everything the Pico could do for positron, asked 2026-10-04

*"Plan all of them"*: the Pico 2 W as a patchbay node over wifi, light output
(WS2812 and DMX) for the timeline's light lane, sound (PWM, I2S DAC, USB audio),
a clock box, BLE MIDI, physical controls and CV. One plan in `plans/`.
DONE 2026-10-04: `plans/plan-pico.md`.

### `/kit/`: HARDWARE becomes DEVICES, the Pico tab is HARDWARE, asked 2026-10-04

*"Rename hardware to devices in kit and pico to hardware"*. The existing tab
(instrument panel parts) is renamed, id and label; the coming Pico firmware tab
takes the name HARDWARE.

### The hardware UI kit as a new tab in `/kit/`, asked 2026-10-04

*"Can you make demo of hw kit in psoitron kit new tab?"*: the OLED UI kit
(`rig/pico/firmware/ui.c`) shown on `/kit/` in a tab of its own. Best form: the
real router firmware running in the browser in rp2040js (pure JS), its screen
drawn live and its four buttons pressable. Waits on the UI kit agent.
DONE 2026-10-04: the HARDWARE tab, 277/277.

### A small UI kit for the 128x64 OLED, asked 2026-10-04

*"Hard to undesramd ui. Block gfx? Do small ui kit for it"*, about the router
screen (seven lines of 8x8 text). A C kit in `rig/pico/firmware/`: an inverted
header, a small font, boxes and arrows for the link, activity meters, a held
banner, a footer naming what the four buttons do. The router screen rebuilt on
it, checked in the emulator, screenshots looked at.
DONE 2026-10-04: `ui.c`, six fonts, glcd5x7 default, 32 checks PASS.

### The C router firmware for the Pico, tested in the local emulator, asked 2026-10-04

*"Do it. What is k1 k2 etc"*: Pico SDK firmware with `rig/route-core/`
inside, the SSD1306 screen and four buttons (K1 previous scene, K2 next, K3
panic, K4 confirm a held message, held 1 s to deny), MIDI on UART for now
(DIN, and the one path the emulator has), built in Docker for both the plain
Pico (to emulate) and the Pico 2 W (to flash), and driven in `rig/pico/sim/`
with bytes in, bytes out and screenshots. USB MIDI host comes after.
DONE 2026-10-04: `rig/pico/firmware/`, all 14 emulator steps PASS.

### Drive the Pico emulation locally, asked 2026-10-04

*"can you not drive wokwi itself / run locally or smth"*: rp2040js (Wokwi's open
emulator core, plain JS in Node) running MicroPython plus `rig/pico/oled/main.py`,
with an SSD1306 model on its I2C and the four buttons pressed from a script, the
screen written out as a PNG. RP2040 only; the RP2350 is not emulated.
DONE 2026-10-04: `rig/pico/sim/`, end to end in about 2 s.

### Scenes: saved sets of links in `/patchbay/`, then a scene lane, asked 2026-10-04

*"go"* to (a) then (b): (a) `/patchbay/` saves the current links as a named
scene and recalls one (unlink what is not in it, link what is, the routing core
releasing held notes); (b) a scene lane in `/partitur/` whose events recall
scenes at points in the score.
DONE 2026-10-04: patchbay 30/30, partitur 27/27.

### More lanes as patchbay sources, asked 2026-10-04

*"Do"* to: `/patchbay/` able to open a lane's link itself (a `link.request`
to the page that owns the source port, answered by `link.state`), the siren
lane as a MIDI source that plays a real instrument through the board, the
stage cues as a source a `/wall/` shows, and scenes as a lane (held for a
decision, see the reply).
DONE 2026-10-04 except scenes: /patchbay/ opens a lane link by asking its page, the Ton lane plays any MIDI input, cues go to a wall's captions; measured across three tabs. Found on the way: the Circuit was unplugged and still offered, now announced only when present.

### A timeline lane as a patchbay source: `/partitur/`'s light lane on a real surface, asked 2026-10-04

After *"how universl patchbay and timeline relate"*, *"Yea"* to trying the
smallest step directly: a lane gets a `to` port and is linked through the
patchbay, starting with `/partitur/`'s light lane driving the Pi's GPU or a
phone's screen (Moholy's projection wall made real).
DONE 2026-10-04: `/wall/` plus a wall choice on `/partitur/`, measured across two tabs.


### `/rout/` and `/graph/` become one page, `/patchbay/`, asked 2026-10-04

*"i am cofused over rout and graph demo. unify? better name?"*, then on the
name *"Patchbay"*. One page: the live desk (today's `/graph/`), MIDI links that
really run through `route-core.mjs` on their way to the board, an inside-a-link
readout, `/rout/`'s test cases as the contract, and one picture of both layers.
`/rout/` and `/graph/` leave the index (`unlisted: true`) and keep their URLs.
DONE 2026-10-04: `/patchbay/`, 26/26, a real note through the core to the Circuit.

### The 4-button OLED on a Pico: a Wokwi project and a wiring diagram, asked 2026-10-04

*"yes but i also want a wiring diagram. are there services that can render it
and you can access?"*: a paste-ready Wokwi project (`diagram.json`, `main.py`)
for a Pico with the SSD1306 OLED and four buttons on GP4/GP5 and GP10 to GP13,
and a wiring diagram rendered with WireViz in Docker. Files under `rig/pico/`.
DONE 2026-10-04: `rig/pico/oled/`.

### Screens and panels for the Pi, available in Estonia, asked 2026-10-04

*"In bg research basic screens/panels for pi a ailable in est"*. A background
research agent; result to `research/`.
DONE 2026-10-04: `research/pi-screens-estonia-2026-10-04.md`.

### Universal routing step 4, links that really start things, asked 2026-10-04

*"Yes"* to: pressing a link on `/graph/` actually starts it, using the board's
existing verbs (`input.want` and its lease for a hardware input's sound,
`audio.start` for a synth, `video.start` for the GPU, `midi.send` for keys
into the Circuit), and Unlink stops it. Described links stay described until a
person opens one; a visit and the harness open nothing.
PARTLY DONE 2026-10-04: an instrument's sound to this browser (708 frames in 8 s,
measured against the real Pi, direct path 214 ms) and these keys to an instrument
open for real. Later the same day: a board synth's sound (424 frames in 9 s), the
GPU's video (209 decoded frames in 9 s) and these keys to a synth open too.
Recording to storage is the one kind left.

### Universal routing step 3, the registry, asked 2026-10-04

*"U iversal router demo?"* then *"Yes"* to: the Pi's `board.hello` and
`board.alive` announce its real nodes and ports, pages announce theirs, and
`/graph/` draws what actually exists instead of a preset desk
(`plans/plan-universal-routing.md` §11 step 3). Needs a push to the Pi. Step 4,
links that really start things, comes after.
DONE 2026-10-04: the Pi announces 5 nodes on every beat and answers `graph.ask` in
64 ms; `/graph/` defaults to the live desk.

### Moholy-Nagy's score as positron data, and a page that plays it, asked 2026-10-04

*"Do it. Better name"*, in reply to the ranked suggestions in
`research/moholy-nagy-partiturskizze-2026-10-04.md`: (1) the plate and
Hirschfeld-Mack's light scores into the timeline prior-art research, (2) the
plate transcribed as data from the public-domain 1925 scan, every row marked
seen or inferred, and then (3) a page that plays it, which wants a better name
than the agent's `exzentrik`. DONE 2026-10-04 as `/partitur/`, 21/21.

### Moholy-Nagy's Partiturskizze, researched against the timeline, asked 2026-10-04

Four photographs of L. Moholy-Nagy, *Partiturskizze zu einer mechanischen
Exzentrik. Synthese von Form, Bewegung, Ton, Licht (Farbe) und Geruch*, a
folding multi-lane score under museum glass, with *"In parallel reseach and
assess this bauhaus work and give context relevance to our timelime work"*. The
photos are in the session's uploads; the written result goes to `research/`.
DONE 2026-10-04: `research/moholy-nagy-partiturskizze-2026-10-04.md`.

### Universal routing step 2, and a new demo for it, asked 2026-10-04

*"What about route-anything work?"* then *"Do it. Pico hold. Nee demo, suggest
name"* and *"New"*: `plans/plan-universal-routing.md` §11 step 2, `bay.mjs`
learns the new media (`value`, `video`, `program`, `file`, `state`) and a
`session` field on a link, pure, with tests, no transport code. Then a NEW page
(not `/rout/`), slug `graph`, that draws the graph and makes and breaks
links across media. The Pico firmware is ON HOLD by instruction.
DONE 2026-10-04: bay.mjs 71 to 112, /graph/ 19/19, deployed.

### Route core: what the C port found, 2026-10-03

`rig/route-core/` passes all 17 vectors (65/65 in Docker). It found five things
the vectors do not yet decide. All five DONE 2026-10-03, vectors 18 to 22, JS
99/99 and C 82/82, each sabotaged red in a scratch copy:
- ~~Two notes at an unlink~~ DONE: `18-unlink-many` holds five on three
  channels; descending is now 1 red in JS, 2 in C.
- ~~A chunk that is only `F7`~~ DONE: `19-sysex-lone-f7`, the F7 closes the
  open stream as its last chunk; fixed in both.
- ~~Policy key verbatim~~ DONE: `21-policy-alias`, the JS reads keys through
  `canonKind` and throws on an unknown one, as `accepts` does.
- ~~`velocity` float ties~~ DONE: `20-velocity-ties` at 0.7 (45 to 32, 85 to
  60); the JS uses the C's thousandths and refuses a scale that rounds to 0.
- ~~`thin` backwards~~ DONE: `22-thin-backwards`, a backwards t is KEPT and
  restarts the budget, in both, so a restarted clock cannot silence a link.

### ~~`midiOpen()` on the board can hang, found 2026-10-03~~ DONE the same day: `O_WRONLY | O_NONBLOCK`, on the Pi, and MEASURED there: EBUSY in 0 ms while subscribed

MEASURED on the Pi: while any ALSA sequencer subscription into the Circuit
exists, opening `/dev/snd/midiC7D0` for write BLOCKS rather than failing, and
`rig/board/inputs.mjs` `midiOpen()` uses a plain `fs.openSync(..., 'w')`. Nothing
subscribes today, so it has not happened. Repair: open with `O_WRONLY |
O_NONBLOCK` so a busy device is an error the log names, and grade it in
`rig/board/test.mjs`. Needs a push to the Pi.

### `/rout/` says what is going on, with a diagram, asked 2026-10-03

*"Make the root page clear what is going on. Maybe also add a diagram.
Especially the lower level thing and why we're doing it. You can also add some
more descriptions."* Read as `/rout/` (the page built minutes before). The
lower level thing is that `route-core.mjs` is the reference for a core small
enough for a microcontroller (`plans/plan-route-core.md`), and the vectors are
the contract a C port must pass too. Files: `demo/rout/index.html`, maybe its
manifest `one` line. Loads `positron-diagram`. Done 2026-10-03, see the commit.

### A demo page that shows off the routing core, asked 2026-10-03

*"can we have a demo page to show off all this? propose a name"*, said while
steps 1 to 4 of HANDOFF's routing next steps were in flight: the one MIDI kind
vocabulary (`demo/shell/midi-kinds.mjs`), the route vectors
(`demo/shell/route-vectors/*.json`) and the JS core (`demo/shell/route-core.mjs`).
Slug `rout`, as named 2026-10-03 (*"rename to rout"*). Waits on the core landing; the page runs
the vectors visibly and lets a person build links between virtual and WebMIDI
ports through `bay.mjs` in front of `route-core.mjs`. Loads `positron-ui`,
`positron-compose`, `positron-verify` before building. Built and deployed 2026-10-03, see the commit.

### Done 2026-10-01: `/items/` archived, its knowledge kept as markdown

*"discard items demo from ../positron, keep the knowledge in .md's"*. Removed
`demo/items/` and `workers/items/`; the row is out of `demo/manifest.mjs`, so
the next build drops `/items/` from the deploy. Every lesson the comments
carried is in `archive/items/README.md`, by topic. The infrastructure lives on
in the eccm repository as plain Web Push with VAPID. The Worker
`positron-items` was deleted the same day (`wrangler delete`, by the owner),
and the view was deployed from the commit, so `/items/` answers 404
(BUILD d49ed54-125433-0d19).

### Done 2026-09-30: `/away/` on the instrument panel, with a patch selector

*"use instument panel for away and patch selector"*. Slug `away`; touches
`demo/away/index.html`. Look at how `/shape/` and `/circuit/` sit in the kit's
instrument panel (`.panel-case > .panel-plate`) before building. A patch
selector means program change, and the board's MIDI gate lets only note on,
note off and CC 123 through on `/away/`'s room, so it needs a decision about
the gate: program change is RAM only (it picks a patch, it writes nothing),
unlike a `Replace Patch` SysEx.
DONE on *"ok go"*: `createInstrumentPanel` with the waveform, the part row
(`enable midi` at its far end), the keys, and a plate reading `CIRCUIT`, the
ONLINE button, and a `createPicker` of `Patch 1` to `Patch 64` at the far end.
The gate passes a 2 byte program change 0 to 63 on channels 1 and 2 only;
channel 16 (sessions) and 64 and up stay refused, with 8 new tests, 208/208 on
the laptop and the Pi (md5 `09c477eb…`). `/away/` 25/25, five new page asserts.
The picker opens empty because nothing reports the Circuit's current patch.
NOT pressed against the real Circuit: a program change replaces the sound a
synth holds, so an unsaved edit on the desk would go. The owner's press.

### Done 2026-09-30: `/away/` plays white noise on the direct path

*"its white noise. it was not case pre-webrtc"*. Slug `away`; touches
`rig/board/rtc.mjs` and/or `demo/shell/board.mjs`. On the live page the
picture showed full-height solid blocks once `via` read `direct`, which
points at the frames being decoded wrong, not at the Circuit.
MEASURED 2026-09-30 ~18:50, and it is NOT WebRTC: a bare `arecord -D
hw:CARD=Pro,DEV=0 -f S16_LE` on the Pi, no board, no browser, returns samples
whose low byte is ONLY 0x00 or 0xFF (6 of 6 fresh starts). Byte-swapped they
read -65 to -80 dBFS with a peak of 18 to 65, i.e. a quiet Circuit; read as
little endian they are -17 to -32 dBFS of hiss. With the Circuit sounding, of
eight readings (offset 0 to 3, swapped or not) only big endian is smooth (lag-1
correlation 0.986), a one byte shift reads 0.26. So the Fast Track Pro is
sending S16_BE while ALSA says S16_LE. It was little endian earlier the same
day (the -82 dBFS silence and the 4,108 full-scale clips in session 59's
handoff are impossible otherwise), and it has not re-enumerated since 12:04.
Relay and direct carry the same `takeChannel` output, so both paths hiss.
DONE: `createByteOrder` in `rig/board/inputs.mjs` watches the high byte's
step size both ways over a quarter second and swaps when the swapped reading is
twice as steady, logging each change. On the Pi's own captures the two readings
were 81,009 against 661. Installed on the Pi (md5 `b3ac7c37…`), 201/201 there;
through `/away/`'s direct path the floor then read -80 dBFS peak 17 and a C4
peaked at -21.7 dBFS. A USB re-authorize (sysfs) did NOT restore little endian;
a physical power cycle of the Fast Track Pro is untried, and the fix follows it
back if it does.


### Done 2026-09-30: update the Pi's MIDI gate (VPN off)

ASKED, VERBATIM: *"read handoff. vpn off. do midi updates on pi and webrtc for away and other stuff"*. The handoff's waiting step: `rig/board/inputs.mjs` and `demo/shell/circuit-cc.mjs` onto `/opt/positron-board`, so `/shape/`'s CCs are let through.
- ✅ **DONE 15:32.** md5s on the Pi `5263c9d0…` and `0f5dc26c…`, the same as HEAD; service restarted, rejoined `studio-1` and `studio-1-circuit`; `node rig/board/test.mjs` on the Pi **154/154**.

### Done 2026-09-30: build the WebRTC path for `/away/` (plans/plan-away-webrtc.md), the go given

Same message: *"webrtc for away"*. Read as the go the plan waited on, and as yes to `node-datachannel` as `rig/board`'s first npm dependency. Order from the plan: P0 ICE between Chrome and `node-datachannel` on this network, P1 `rig/board/rtc.mjs`, P2 `/away/` direct with the relay as fallback and `via` / `round trip` cells, P3 10 ms frames, P4 the cushion. Each measured before the next.
- ✅ **DONE, P0 to P4**, results in the plan's §9. Direct, host to host: board round trip 72 to **4 ms**, `lag` 175 to **~48 ms**, 10 ms frames beat 20 (115 ms), cushion starts at 40. Board has it (193/193 there), page has it behind `createBoard({ direct: true })`. Not known: behaviour off this network.

### Open 2026-10-03: the Circuit HAS a factory reset; stop treating SysEx as untouchable

ASKED, VERBATIM: *"Don't be so protective about the circuit. It does have a factory reset. Look it up. And we also protected our or stored our custom resets. So be careful, but don't be so afraid of sysacks. It's just any other device with some precautions and etc."* LOOKED UP the same day: Novation's support article *"Using Components to reset a product to Factory Settings"* restores a Circuit's factory content through Components (Send to Circuit on the Circuit Factory Pack, plus a firmware reinstall). It does not bring back the owner's sessions, and those are backed up in `kristjanjansen/packs`. So the repeated line "no factory reset and therefore no undo" is FALSE as written: **49 places** say it (`grep -rn -i 'no factory reset'` over CLAUDE.md, .claude, demo, rig, plans, research, BACKLOG, LESSONS, HANDOFF). CLAUDE.md, the `positron-hardware` skill and `plans/plan-wish-dawless.md` corrected in the same pass; the rest per page as each is touched. The SysEx gate in `rig/board/inputs.mjs` stays as a precaution, not as a wall.

### Open 2026-10-03: routing as abstract as possible, small enough for a microcontroller, inputs as one of many

ASKED, VERBATIM: *"maybe not make that routing so be specific. So something which you can also use on smaller hardware. Microcontrollers with smaller cortex chips on them. I think we discussed it back in the day in the early, early days of prototype when we didn't have P idea yet. So think about it and plan it as a, as abstract as possible. And the wish thing, my voice control, is just one of the many of those. Possible input methods, but there are definitely should be more. Try to separate what is universal and what is particular in particular hardware setup with different instruments, input methods, etc."* Prior plans to build on, found after `plan-wish-dawless` was written and should have been read first: `plans/plan-patchbay.md` (2026-09-21, Node/Port/Link, control plane not signal path) and `plans/plan-hardware.md` (ESP32-S3, Teensy, Daisy, 2026-09-10). PLAN WRITTEN 2026-10-03: `plans/plan-route-core.md`, nothing built; next is its step 0, one class vocabulary.

### Open 2026-10-03: one routing model for audio, video, messages, renderers, scenes and storage

ASKED, VERBATIM: *"Maybe at the end, maybe a new, new plan, I don't know. Think about a more universal routing. When I can ask, okay, I want this, this video there, this WebGL renderer there, this scene there, in all those different routings, what we have done in Positron so far. Is there a way to abstract those audio, audio, video, and all different kind of messaging, routing, including storage? Is there a way to abstract it? Maybe not the whole thing, but the ones are more easier to adopt to this universal routing model."* PLAN WRITTEN 2026-10-03: `plans/plan-universal-routing.md`, from an inventory of every routing in the repository, nothing built.

### Open 2026-10-03: Wish without a laptop, the Pi as the hub (plan written, nothing built)

ASKED, VERBATIM: *"Giving the ideqa about wish and general mapp anything to anywhere how it would fit it into dawless setups. What is hun? Pi? What listens? A phone browser? Pi attached cheap mike? Camera interepting gestures? Random ideas"*, then *"Add plan etc"*. Plan: `plans/plan-wish-dawless.md`, all reasoning, nothing measured. Slug `wish` (https://positron.studio/wish/), files `rig/board/` (a new `routes.mjs`), `demo/wish/index.html`, `demo/wish-local.mjs`. Recommendation: the Pi owns the route table and forwards offline through the existing MIDI gate; the phone is hold to talk and the screen; the model only writes rows. Not started, waiting for a go on §9 step 1.

### Open 2026-09-30: `/away/`'s second dry-out about 5 s after the direct path opens

Found while measuring the direct path, not asked for. In five of seven runs the playout ran dry a second time 9.5 to 10.5 s into the page, about 5 s after the switch, which ratchets the cushion from ~35 to ~64 ms and puts `lag` at ~80 ms rather than ~48. Five seconds is the board's beat (`BEAT_MS`, `inputs.mjs`), so that is the first suspect; not measured. Files: `rig/board/inputs.mjs`, `demo/shell/board.mjs`.

### Open 2026-09-30: "other stuff" from the handoff's waiting list

Same message: *"and other stuff"*. What can move without an owner decision: measure the Circuit input for clipping now the LAN is reachable (it read 4,108 samples at full scale before the gain was turned down, and nobody measured after); `/reel/`'s red `pointing at a mark says what it is`; `/circuit/` 48/49 name spacing. Owner's calls, NOT touched: the capitals rule, `/fau/`'s library sliders, the clipping ranges on three patches, the Pi camera.
- ⚠️ **THE CIRCUIT INPUT STILL CLIPS, MEASURED THROUGH `/away/` 2026-09-30 ~15:45**: 8 to 29 samples at full scale per run of six to eight Synth 1 notes, rms about -33 dBFS. So the input 1 gain was not turned down enough, or not at all. Owner's hand on the Fast Track Pro; nothing in software can fix a clipped converter.
- ✅ `/reel/` and `/circuit/` fixed by an agent: reel 26/27 to **27/27** (the hover text put a lane-and-date header over the mark's own lines and pushed its length out, `describeHit` now returns only the mark's lines); circuit 33/34 to **34/34** (a doubled top inset, 41 against 21, the page's own `.circ` top padding stacked on the kit's plate rule). Stale comment in `shell.css` above `.panel-case > .panel-plate` (it says `/circuit/` takes no case inset) left for whoever next holds that file.

### Done 2026-09-30: the dynamic knobs on the kit's knob grid

ASKED, VERBATIM: *"use knob grid on those dynamic knobs and deploy"*. `param-knobs.mjs` lays its knobs (and the empty row's hidden knob) on `createControlGrid`, one row of up to four at `/knobs/`' gap, the old lattice destroyed on each rebuild. Found on the way: the lattice measures before it is attached, so it is re-measured after `set()`; and the arc's `.12s` stroke fade made a hued knob draw yellow for a beat on every compile, so a param knob's arc has no fade. ⚠️ Five or more knobs would wrap to a second row and change the row's height.

### Done 2026-09-30: code colours, the knob's variable in its hue, the rest toned down, keywords not blue

ASKED, VERBATIM, with a crop of `/fau/`'s Sweep: *"cutoff var should be blue"*, *"can you tone down other code a bit"*, *"import process effect they are all same blue"*. The variable a knob's control is bound to (`cutoff = hslider(...)`, `var rel = \rel.kr(...)`, an argument's own name) and every later use take the knob's hue; the other token colours lose chroma; keywords leave blue, which was `--code-kw` #7fb6e8 against the first knob hue 205.

### Done 2026-09-30: knobs on every patch where one makes sense

ASKED, VERBATIM: *"add knobs to all patches what mak sense"*. `/collide/` (Pad has `rel`; Growl, Wah none) and `/fau/` (Sweep has `cutoff`; the others none, and library instruments' built-in sliders are not typed in the box).

### Done 2026-09-30: the knobs under the code get invisible hands, a fixed-height row, and their code's colour

ASKED, VERBATIM: *"add invisible hands to these cutoff buttons. make the area h for thise buttons fixed so no junmp. colorcode buttons and code"*. On `/collide/` and `/fau/`'s param knob row (`demo/shell/param-knobs.mjs`): each knob gets the kit knob's invisible hand (the `⇄` on the ring's lower edge, as on `/knobs/`, and it must drive the same path a turn does: `/n_set` or `setParamValue`); the row keeps one height whether it holds 0 or N knobs, so switching presets or recompiling never moves the keys; and the knob and its snippet share one hue, which the wiring agent is already doing. Handed to that agent.

### Done 2026-09-30: `/collide/` loses its waveform

ASKED, VERBATIM: *"rm waveform from collide"*. The live scope (`grain-scope.mjs`, the panel's picture row, added in cb17146 while "settling"; an empty 72 px band until the first sound). Its two asserts go with it, and the panel shape goes back to `controls keys plate` with the code box first. Handed to the agent wiring `/collide/` now.

### Done 2026-09-30: `/und/`'s score drawn in its lanes' colours

ASKED, VERBATIM, with a screenshot of the score over the strip: *"can you mathc lane colors and code colors somehow"*. `code-lang.mjs`'s Csound table gained `lineKind`: an `i` line is `event`, `t` is `tempo`, `m`/`n` are `part`, and every coloured token but a comment carries `pos-ln-<kind>`. `/und/` paints them from its own `INK` and `DERIVED`: event lines between `INK.off` and `INK.on`, part and tempo lines the slate lifted 20% towards white. Found on the way: `.5` was drawn as a carry `.` and a `5`; fixed. `code-lang-test` 49/49, the two new negative controls each red on its sabotage. `verify und` 28/28.

### Done 2026-09-30: Loop on the on-screen keyboard of EVERY keyboard page when the Evolution is plugged in

ASKED, VERBATIM: *"enable loop button and fucntioanly on onscreen keyboar when evolution is connceted"*, then chose *"Every keyboard page"* when asked. Today only `/nola/` does it: `createKeyboard({ loop: true })`, `keys.offerLoop(false)` at load and `keys.offerLoop(evoHere(names))` in `onPorts` (`demo/nola/index.html` ~1025 and ~1640, `EVO_PORT` there). The other keyboard pages: `away`, `collide`, `evo`, `fau`, `instrument`, `knobs`, `shape` (and `looper`, which has no MIDI). The Evolution test moves into the kit once, then each page gets it; `collide` and `fau` last, after the live-knobs and code-box agents are out of them. Each page must show the looped notes really SOUND, not only that the button appears.

- ✅ **DONE on nola, away, evo, instrument, knobs, shape** (agent report). `midi.mjs` holds the one Evolution test (read from `instruments.mjs`), `offerLoopFor`, `createMidi({ loop: kb })` and `checkEvolutionLoop` (five asserts incl. a Circuit and a Fast Track Pro NOT bringing Loop); `keyboard.mjs` has `loop: 'evolution'`. Counts: instrument 17 to 22, shape 58 to 63, evo 64 to 70, nola 104 to 107, knobs 41 to 46, away 14 to 19; reds on nola (1) and knobs (2) are the pre-existing ones. Sabotage (every name is an Evolution) on away: 2 red. `/looper/` refused: it asks no MIDI permission by design. ⚠️ No real Evolution plugged in; no looped note heard at the Circuit or Yoshimi, only seen reaching the board's send path. `/nola/` sits near the harness's 24 s ceiling. ✅ `/collide/` and `/fau/` wired too, 2026-09-30, each with the full timed check.

### Done 2026-09-30: build the code box from `plans/plan-code-editor.md`

ASKED, VERBATIM: *"just go"*, to the plan's recommendation (a hand-rolled overlay, `demo/shell/code-box.mjs` and `code-lang.mjs`, one hue per knob parameter). Order: the tokenizer and its node test, then the kit piece, then `/und/` (free now), then `/collide/` and `/fau/` AFTER the live-knobs agent lands, because it is editing both. Not tried on an iPhone; the plan names three things only a real iPhone settles. ⏸ **PARKED ON INSTRUCTION, 2026-09-30:** *"iphone: deal later"*. The three: the caret over transparent text, the selection handles, and whether WebKit scrolls the wrapper to follow the caret. It ships without them.

### Done 2026-09-30: `/collide/` keeps Pad, Growl and Wah only

ASKED, VERBATIM: *"keep pad growl wah"*. Bell, Glass and Breath go from `demo/collide/presets.mjs`, with their per-patch asserts (three each), so the page count drops by nine. Handed to the live-knobs agent, which is in `demo/collide/` now.

### Done 2026-09-30 (37317ca): research a minimal code editor with syntax highlighting for the synth languages

ASKED, VERBATIM: *"in bg: invertigate minimal visual code editor with basic syntac hilite for our synths. they are rare languages so perhaps we need use some other templte"*. The languages: Faust (`/fau/`), the SuperCollider subset (`/collide/`), Csound score (`/und/`). Research only, a plan in `plans/`, reported in full when it lands. `/typist/` already pins a textarea over a drawn layer, which is prior art in this repo.

### Done 2026-09-30: knobs under the code on `/collide/` and `/fau/`, read from the code, turned live without a recompile

ASKED, VERBATIM: *"what about variables in code (propose names like C1 / VALUE1 etc) that are under the code and adjust parameters in real time like `var env = EnvGen.kr(Env.adsr(0.4, 0.3, 0.7, VALUE1), gate, doneAction: 2);` is it possible?"*, then *"ok. do test with single knob laer. can we do it on fau too?"*.
- **Proposed and accepted:** real syntax, not invented names, so the code still runs in the real language. SuperCollider: every function argument except `freq`, `amp`, `gate`, plus `\name.kr(default, lag, spec: [min, max, curve])` NamedControls (new to `sclang-lite.mjs`), each a SynthDef parameter changed with `/n_set` on every sounding node. Faust: every `hslider`/`vslider`/`nentry` except `freq`, `gain`, `gate`, read from the compiled DSP's parameter list with its own min, max and step, set on all voices through faustwasm.
- **One row of knobs under the code**, built from the compiled program after every compile, a value kept across a recompile when the name survives. One kit piece, two pages.
- **Start with a single knob** ("single knob laer" read as one row, tested first with one knob): `rel` on `/collide/`'s Pad, `cutoff` on one `/fau/` preset.
- ⚠️ **WAITS FOR the `/collide/` patches agent**, which is in `demo/collide/` and `sclang-lite.mjs` now.

- ✅ **DONE (agent report).** `demo/shell/param-knobs.mjs`, `createParamKnobs({ onChange })`, `set(params)` keeps a surviving value; specs are sclang's `ControlSpec` (`mapSpec` from `Spec.sc`); each knob carries `data-param` and draws in `--param-hue` when set. `/collide/`: `\name.kr(v, lag, spec:)` supported (a number lag is a `LagControl`, as `NamedControl.new` does), a turn is `/n_set` to every live node; Pad's `rel` measured 0.053 s at 0.05 and 1.044 s after eight Page Ups on a HELD note. `/fau/`: knobs read from the compile's own JSON, a turn is `setParamValue` on all voices; Sweep's `cutoff` took two held keys from 0.0767 to 0.0153 rms. Counts: collide 39 page asserts all green, fau 60 (the one red is the old diagram one), kit 260/260. Sabotages: 5 red each.
- ⚠️ **A decision for the owner:** on `/fau/` only sliders TYPED in the box get knobs; library ones (`pm.clarinet_ui_MIDI` 8, `pm.djembe_ui_MIDI` 3, Sweep's `dm.freeverb_demo` 4) do not. One filter in `readKnobs`. Also: a release already under way is not changed by a turn (EnvGen reads a segment's time at its start); a pointer drag on the knob was not driven (`setPointerCapture` throws for a synthetic pointer).

### Done 2026-09-30: `/collide/`, keep only Pad, add more patches, settle what can be settled

ASKED, VERBATIM: *"keep only pad. settle what you can. add more patches"*. Read as: Pluck and Hat go, Pad stays, new patches take their place. The unsettled list from the build: (1) replacing a definition in place under a running synth, never measured; (2) the 64 wire-buffer count, matched by measurement but the scsynth C++ not read; (3) MIDI never tried with a device (needs a device on this desk, not settleable here); (4) the readout splits 3 + 1 at 375 px, the kit's `/knobs/` and `/away/` problem, a `shell.css` change; (5) no live scope; (6) the diagram prints `/grains/` as a code slug rather than a URL.

- ✅ **DONE, from the agent's report.** Patches Pad (unchanged), Bell, Glass, Growl, Breath, Wah, each gated and heard ending, worst 4-note chord peak 0.67 (Breath first clipped at 2.96, Wah at 1.12, both fixed). (1) **Measured and read**: scsynth reference counts a GraphDef (`SC_GraphDef.cpp` 371 to 387, `SC_Graph.cpp` 87 to 91 and 626 at 19954900); a running sine kept 0.0707 rms and still answered `/n_set` after its def was replaced, so the page now compiles every program as `collide` and frees nothing itself. (2) **The compiler was wrong**: an audio output nothing reads is never given back (`alloc(0)`, 598 to 620); measured 63 unread + 1 loads, 64 + 1 `/fail`s; `wirePeak` fixed, four tests, three sabotages red. (4) **Fixed in the kit**: exactly four readout cells are 2 + 2 under 560 px (`shell.css`), which also cures `/knobs/` and `/away/`. (5) `grain-scope.mjs` is the panel's picture now; it is an EMPTY 72 px band before the first touch. (6) the diagram reads **positron.studio/grains**. (3) MIDI needs a device; and on `/collide/` a MIDI key alone cannot start the engine, a touch must come first. `sclang-lite-test` 63/63, `verify collide` 44/44, 38 page asserts.

### Done 2026-09-30: a new demo `collide`, SuperCollider typed and compiled in the tab, as `/fau/` does Faust

ASKED, VERBATIM: *"can you do simple supercollider script browser compile demo as in fau called collide? do we have moving pieces?"*
- **The moving pieces, checked 2026-09-30:** the engine is real wasm scsynth (SuperSonic, vendored, `demo/shell/scsynth.mjs`, used by `/grains/` and `/radio/`); the bytes are `demo/shell/synthdef.mjs`, whose `graph()` builds a version 2 SynthDef in JavaScript that scsynth plays. 🔴 **The LANGUAGE is missing**: sclang does not run in a browser (`research/supercollider-browser-2026-09.md` §1.3, PR #7440 open since 2026-04-01 and mid-design), and compiling on the Pi's sclang would run a visitor's code on the Pi, where sclang can shell out. Refused.
- **So the demo is a small sclang subset compiled in JavaScript**: a function literal with UGen calls (`SinOsc.ar(440, 0, 0.1)`), arithmetic, arguments and `var`s, down to `graph()`, loaded with `/d_recv` and played. Anything outside the subset is refused with a line and column, never guessed.
- Wait for the compile-on-idle kit module (entry below) and use it rather than a Compile button.

- ✅ **DONE, from the agent's report.** `demo/shell/sclang-lite.mjs` compiles a subset (function literal with args, `var`, `.ar`/`.kr` calls with positional and keyword args, `+ - * /` strictly left to right as sclang does, multichannel arrays, `Mix`, `EnvGen` with `Env.adsr/perc/new`) to `graph()` bytes, and refuses everything else with a line and column. UGen defaults from `SCClassLibrary/Common/Audio` at commit 1995490. `sclang-lite-test.mjs` 50/50, eight sabotages each red. Real scsynth: boot 674 ms, every `/d_recv` answered `/done`, presets 0.0178 / 0.0961 / 0.0426 rms, `mul:` 0.0708 against 0.0707 expected. `verify collide` 29/29, 23 page asserts. One definition name per compile, so a held note keeps its old graph.
- ⚠️ **Unsettled:** replacing a definition in place under a running synth, never measured; the 64 wire-buffer count matches the measured 64 loads / 65 refused but the C++ was not read; MIDI untested with a device; at 375 px the readout splits 3 + 1 (the kit's `/knobs/` problem).

### Done 2026-09-30: `/und/`'s part lane less yellow, in the colour the Csound score has on `/click/`

ASKED, VERBATIM: *"make pat lane less yellow, use same color as csound score in other demo (can not recall)"*. "pat" is the `part` lane (`demo/und/index.html`, `id: 'deck-span'`, `color: INK.on`, `#ffd400`). The other demo is `/click/`, where the Csound score's lane (`words`, `demo/click/index.html:650`) is `#6f7d94`, the slate `/und/` already calls `DERIVED` for its tempo lane. Only the part lane changes: `INK.on` also marks a note that sounded on the event lane and the current line in the document, and those stay yellow. Handed to the agent working on `/und/`.

### Done 2026-09-30: `/und/` sounds nicer, and the transport's play plays with sound

ASKED, VERBATIM: *"make und nicer-sounding. play button in strapsport should automatiically play with sound, rm 'play woth sound' button"*.
- **The sound today** is one triangle oscillator per note, 8 ms attack, gone by 280 ms, gain 0.2 (`demo/und/index.html:249`). No filter, no body, no room. What "nicer" means was not specified; the brief is a warmer voice (two slightly detuned oscillators through a lowpass that closes over the note, a longer release, a little room) with the same timing, because the page's claim is WHERE the notes land and a sound that smears the onset would hide it.
- **The button**: `{ id: 'sound', label: 'Play with sound', primary: true }` (`:102`) and `d.on('sound')` (`:453`), which creates and resumes the AudioContext and then `parent.play()`. The transport bar's own play must do that instead, inside the press, and the control goes. Removing a control moves the harness's presses, so assert counts are compared before and after.
- Handed to the agent already working on `/und/` for the compile note, so one agent owns the page.

### Done 2026-09-30: rename `sound`, and one compile-on-idle behaviour with a breathing "Compiling" note, for `/sound/` and `/fau/`, in the kit

ASKED, VERBATIM: *"rename sound demo to und. unify compilation in ui logic on this and fau ant othes. trigger on inactivity? Small breating "Compiling" note (not button) on right bottom i the plae complile button is in fau. a kit comopnent?"*
- ✅ **RENAMED TO `und`, CONFIRMED BY ASKING** (the last rename of this page, *"rname cvlick demo do ound"*, meant `sound`). `/sound/` 404s now, no redirect, the same as `/vclick/`, `/box/` and `/radio1965/`.
- **Only two pages compile what a visitor types**: `/und/`, formerly `/sound/` (Csound, `demo/und/index.html:438`, recompiles 400 ms after typing stops, logs `recompiled`) and `/fau/` (Faust, a Compile button with the kit's busy shimmer, `demo/fau/index.html:1277`). `weight`, `typist` and `wish` have textareas that are not compiled; `floor`, `mirror`, `videoradio`, `weight` compile their own fixed shaders.
- 🔴 **THIS REVERSES A DECISION ON `/fau/`**: 2026-09-28 *"replace it with compile (shimmer). no autocompile"*, and `/fau/` carries an assert that typing does not compile inside the old idle wait (`demo/fau/index.html:2112`). The new ask wins; the assert inverts.
- ⚠️ **What the old fau idle compile got right and must survive**: it waited for a held note to come up, because a compile under a held key takes the note away. The kit component has to take a "not now" predicate.
- Shape: a kit module in `demo/shell/` that owns the idle timer and a quiet status note (breathing `Compiling`, then nothing or the error) at the bottom right of the editor's foot, where `/fau/`'s button sits today. Not a button. Done once, then both pages wired to it.

- ✅ **DONE, from the agent's report.** `demo/shell/compile-idle.mjs`, `createCompileIdle({ input, compile, notNow, host, delay })`: 600 ms after the last keystroke (/und/ used 400, the old /fau/ timer 800; keystroke gaps inside a word run 150 to 300 ms), one compile at a time and the last text wins, `notNow` delays and never drops. The note is a `role="status"` span, `Compiling` while a compile runs or is held back, shown at least 800 ms, and `Did not compile` in `--bad` with the reason on hover until one succeeds. /fau/ lost its Compile button; the "typing compiles nothing" assert is INVERTED (nothing inside the wait, then exactly one). /kit/ has a COMPILE ON A PAUSE block. Counts: und 23 to 27, fau 55/56 to 57/58 (the red is the pre-existing diagram one), kit 249 to 255. Sabotage, `notNow` ignored: 1 new red on each of fau and kit.
- ⚠️ **Unsettled:** on a phone with the box scrolled the note covers the last visible line, as the button did. It reads `COMPILING` through the label style. /und/ typing while playing still pauses it.

### Done 2026-09-30 (9ccba93): `/reel/`, play with nothing picked starts the first mark

ASKED, VERBATIM: *"when i press play, reel demo short start from first (whaterver playing). no selection needed"*. The first film or radio mark at or after the playhead, which on a fresh visit is the 1965-01-07 newsreel the page opens on. Under `?selfcheck=1` it picks and opens nothing. `verify reel` 26/27, 0 ERR reaches.
⚠️ **STILL RED, AND NOT FROM THIS: `pointing at a mark says what it is, under the line rather than over it`** reads `newsreels  1965-01-07, Arhitektide liidu näitus, 1965-01-07`, so the footer's first cell is the lane name where the assert wants the title. It fails identically on the file before this change.

### Done 2026-09-30 (9ccba93): `/knobs/`, the description back to one sentence

ASKED, VERBATIM: *"...shorten in both index and in page"*. Now *"Play and turn the knobs of a synthesizer on a Raspberry Pi in another building."*, the same words in `manifest.mjs`.

### Done 2026-09-30: `/knobs/`, no yellow circle round the invisible hand's button

ASKED, VERBATIM: *"rm yellow circle aroind invisible hands button on knobs"*. MEASURED in Chrome: a mouse press leaves `.pos-knob-hand` matching `:focus-visible`, so the shell's `outline: 1px solid var(--hi)` drew a yellow circle round it (the ground's 50% radius shapes it) until focus moved. `demo/shell/shell.css` now gives that button `outline: none` on focus, with the ink stepping to `--fg` as the keyboard cue. The lit glyph is still yellow. ⚠️ `.sld-hand` on sliders was not looked at and may do the same.

### Open 2026-09-30: `/shape/` works with the Circuit on the Pi, and makes a sound to hear the change

ASKED, VERBATIM, ACROSS TWO MESSAGES: *"https://positron.studio/shape/ - make it work with pi circuit. test tone button?"*, then *"or keyboard?"*. Today `/shape/` edits a Circuit's synth over local Web MIDI (`demo/shell/circuit-cc.mjs`, 98 CC parameters) and needs the instrument on this USB port. The Circuit on the desk now hangs off the Pi (`studio-1`, input `circuit`, room `studio-1-circuit`), which `/away/` already reaches through `createBoard`: Listen via the `input.want` lease, notes through the board.
🔴 **THE BOARD REFUSES EVERY CC BUT 123 TODAY.** `rig/board/inputs.mjs:40` `midiVerdict` lets only note on, note off and CC 123 value 0 through, on channels 1, 2 and 10, because the Circuit has no factory reset. So `/shape/` over the Pi needs that gate widened to the CC numbers `circuit-cc.mjs` lists for the synth channels, and nothing that writes flash (no SysEx, no program change). A CC edits the current patch in RAM; that is the claim to check against `plans/plan-circuit-patches.md` before widening, and `rig/board/test.mjs` needs a sabotage for it. The board change then has to be copied to the Pi and the service restarted.
⚠️ **TEST TONE OR KEYBOARD, UNDECIDED.** A test tone is one button playing a held note so a knob turn is heard; the kit keyboard (as on `/away/`) lets you play. `/away/` already has both the Listen waveform and the keyboard, so the keyboard may be the cheaper one. Files: `demo/shape/index.html`, `rig/board/inputs.mjs`, `rig/board/test.mjs`.

### Open 2026-09-30: the streaming pages' toggle names its transport, WEBRTC OFF / WEBRTC ON

ASKED, VERBATIM: *"webrtc demo: button labels: WEBRTC OFF / WEBRTC ON. analogue titles form moq / llhls"*. So `/webrtc/` reads WEBRTC OFF, STARTING, WEBRTC ON, `/llhls/` LL-HLS OFF / LL-HLS ON and `/moq/` MOQ OFF / MOQ ON, replacing the shared `STREAM` words (`stream off`, `starting`, `on`) in `demo/shell/presence.mjs`. The /cam/ `CAMERA` words are the precedent. No assert reads the words.

### Open 2026-09-30: carried in from HANDOFF.md, items that lived only there

Collected 2026-09-30 on *"collect todos"*. Each one was listed in `HANDOFF.md` under a "waiting" or "open" heading and had no line in this file.

- **Rotate the TURN token.** `TURN_KEY_API_TOKEN` was visible as a secret name and is in a transcript. Suggested, not done.
- ~~**Test the TURN relay with the VPN on.**~~ ✅ DONE 2026-09-30, VPN on: `DEMO_BASE=https://positron.studio node demo/verify.mjs webrtc` **28/28, 22 page asserts**, `connected`, frames RENDERED 1280x720, ping 26 ms, footer `relay`, path `local relay, remote host, udp, relay over tcp`, 7 ICE urls of which 6 TURN. ⚠️ The first run the same minute read 8/8 with **2** page asserts, which is the cold container, not a pass. /cam/'s MoQ under the VPN is still unlooked at.
- **`video-panel.mjs` has no way to REPLACE its picture.** A page emptying `panel.stage` loses the caption slot and the full screen exit (the /stage/ questions bug, 2026-09-30).
- **`transport-bar.mjs` has no toggle that drives another deck.** /stage/'s play button is borrowed from the hidden archive bar.
- **/stage/ streams the 253 MB film into an unseen canvas on every show.**
- **`hidden` does nothing on a `createGlueRows({ grid: true })` surface**, a `shell.css` specificity problem found by the stage agent.
- **/stage/ at 375 px**: long link lines through containers and stacked labels.
- **`cam` container cold start, a steady-state LL-HLS median, and Safari's MP4 arm are unmeasured.**
- **`/circuit/` reads 48/49**: `the printed names sit the same distance from the top and both sides`, top 41 against 21. Pre-existing.
- ~~**`/away/`'s readout wraps three and one on a phone**~~ ✅ fixed 2026-09-30 in `shell.css`, four cells are 2 + 2 under 560 px.
- **The Circuit clips on Fast Track Pro input 1**: 4,108 of 467,520 samples at full scale. The owner was asked to turn the gain down a third; nothing has been measured since.

### Done 2026-09-30: plan the WebRTC path for /away/ (plans/plan-away-webrtc.md)

ASKED, VERBATIM: *"write webrtc path to plan"*. A plan in `plans/`, not code: a direct browser to Pi path for the Circuit's audio and notes, with the relay kept for signalling and as the fallback. Reported in full when written.

### Open 2026-09-30: bring the /away/ round trip down

ASKED, VERBATIM: *"can we bring roundtrip more down"*. Measured the same day: press to the note arriving back 151 to 180 ms, median about 170, relay legs about 18 ms each way from both ends, and `arecord` on the Pi at ALSA's default 6000 frame period (125 ms) in a 24000 frame buffer, so frames arrive in 117 ms lumps and the page needs a 160 ms cushion to ride them. First cut: a short `arecord` period in `rig/board/inputs.mjs`, then a smaller cushion on `/away/`, each measured before and after.

### Done 2026-09-30: `/away/` Listen and the online badge are one button

ASKED, VERBATIM: *"listen + online is same button"*. Merge the Listen control and the board's presence badge into a single control, reusing the kit's presence button (`.pos-presence-btn` in `shell.css`) rather than a new one. `demo/away/index.html`.

### Done 2026-09-30: `/away/` lag, broken into steps, and how to cut it (measured, in plans/plan-away-webrtc.md §2)

ASKED, VERBATIM: *"can you calculate lag in multiple steps. how to reduce?"*. Measure each leg (browser to relay, relay to Pi, MIDI to the Circuit and back through the Fast Track Pro, `arecord`'s own buffering, Pi to relay, relay to browser, the playout cushion) and name what shrinks each.

### Done 2026-09-30: `/away/` shows lag, and `playing` leaves the readout

ASKED, VERBATIM: *"show lag. rm playing from readout"*. `demo/away/index.html`: a `lag` cell, key press to sound leaving the speakers, measured by finding the note's onset in the frames that come back plus the playout cushion, blank when no onset is found. The readout goes `playing, level, clipped, buffer` to `level, clipped, buffer, lag`, still even.

### Done 2026-09-30: `/away/` plays the Circuit: Synth 1 / Synth 2 / Drums 1 / Drums 2, a keyboard, and MIDI in

ASKED, VERBATIM: *"add synth 1 / 2 / drums 1 / drums 2 readiobutton and jeyboard and allow me to drive it with midi"*. `demo/away/index.html` gets a choice of the four parts, the kit keyboard, and Web MIDI in (asked for on a press, never on load), all sent to the board in `studio-1-circuit`. `rig/board/inputs.mjs` writes them to the Circuit's own ALSA raw MIDI port, named in `BOARD_INPUTS`, and REFUSES everything but note on, note off and all notes off: the Circuit has no factory reset and a SysEx `Replace Patch` writes flash (CLAUDE.md).

### Done 2026-09-30: stage control room, a standard play button, cursor home when the show stops, and questions that never appear

DONE: questions rendered into a DETACHED caption slot, because the page emptied `panel.stage` with `textContent = ''` (four places, one at load); `setPicture()` keeps the slot. Play is the transport bar's toggle; the cursor goes to 0 and the button sits paused on stop. Kit gaps left open: `video-panel.mjs` has no way to replace its picture, `transport-bar.mjs` no toggle driving another deck.

ASKED, VERBATIM: *"controlroom stage: play recording should be stn play button, when show stops, timeliune cursor should go to beginning and playback button should be on pause state. i can not see questions sent nor in audiene nor in control room"*. Three things on https://positron.studio/stage/ (BUILD `4ba5522`):
1. `Play recording` becomes the kit's standard play button (the transport's play/pause, not a text button).
2. When the show stops, the recording timeline's cursor goes to the start and the play button sits in its paused state.
3. **A question sent from the audience appears nowhere**, neither in the audience panel nor in the control room. Find why (the send, the room, the Durable Object, the render) and fix it; an assert must SEND one and SEE it on both sides.
`demo/stage/index.html`, maybe `workers/` for the questions route. Given to the agent already editing /stage/.

### Done 2026-09-30: stage, the recording chain readout goes, its fixed wording moves into the diagram

DONE: readout removed, state in `__demo.chain`, live states in the log, fixed wording in the IndexedDB, R2 and playback diagram notes.

ASKED, VERBATIM: *"rm, put non-realtime versions to diagram"*, pasting the /stage/ readout `local 12 pieces, 1.79 MiB in IndexedDB / R2 uploads when the show stops / playback plays from R2 once it is there`. Remove the `stage-chain` glue rows (`demo/stage/index.html` ~1929 to 1950, every `chainSay` call). The fixed sentences (pieces kept in IndexedDB, uploaded to R2 when the show stops, played back from R2) become diagram boxes or notes. The live states (`uploading N%`, the refusals and failures) must still reach the log, and the R2 playback link must still be reachable if a visitor needs it to play. Also retires the `hidden` on a grid glue row problem for this surface. Asserts that read the chain move to `__demo`.

### Open 2026-09-30: NEXT STEP, the Pi camera beside the Circuit audio, OFF by default

ASKED, VERBATIM: *"note that next step would be using pi camera along with audio. off by default, toggled via env var (privacy)"*. Not started. The camera must be impossible to switch on from a page: an env var in `/etc/default/positron-board` enables it, and with it unset the board does not open the camera at all. The board already streams video to `<room>-video` (`rig/board/video.mjs`); check whether that path opens a camera today and gate it on the same variable. `/away/` would show the picture next to the waveform.

### Done 2026-09-30: `/away/` uses the kit's waveform display, not a canvas in a video panel

ASKED, VERBATIM: *"use stnd waverform display not video canvas on away"*. `demo/away/index.html` drops `createVideoPanel` and its hand-drawn canvas for `createWaveView` from `demo/shell/wave-view.mjs`, fed the last few seconds of the board's frames.

### Done 2026-09-30: the board plays Yoshimi AND the Circuit at once

ASKED, VERBATIM: *"can we support both yoshimi and circuit? current setup does not scale"*. Today `rig/board/board.mjs` has ONE audio slot (`audio` / `inst`), so `audio.start` of one source replaces the other, and both stream into the one room `studio-1`. A Yoshimi start from any page took `/away/`'s Circuit off the air on 2026-09-30. Design and cost in the reply; files `rig/board/board.mjs`, `demo/away/index.html`, maybe `demo/shell/board.mjs`.

### Done 2026-09-30: cam, Start/Stop camera becomes a status button, CAMERA ON | CAMERA OFF

DONE: `createPresenceButton` with a `CAMERA` word set in `presence.mjs`: camera off, starting, camera on.

ASKED, VERBATIM: *"stat / stop camera: convert to oline status button: CAMERA ON | CAMERA OFF"*. The same kit control /llhls/ uses for `stream off | starting | on`: `createPresenceButton` from `demo/shell/presence.mjs` (see `demo/llhls/index.html` ~line 66 and 111, and its `STREAM`/`STREAM_CAN` words), with a camera word set: `camera off`, a starting state while getUserMedia and the legs come up, `camera on`. It replaces the `Start camera` button; asserts that read `btn().textContent === 'Start camera'` move to the new state. `demo/cam/index.html`, maybe a word set in `presence.mjs`.

### Done 2026-09-30: cam, state text goes in the panel footer, not on the picture

DONE: a `state` cell last in each footer, assert `no state line is drawn on any picture`. `closed` was most likely a pub restart from a secret change (11:18 UTC), likely not proven; it now reads `lost the publisher`. The worker retries a container 503 four times.

ASKED, VERBATIM: *"do not draw on screen but on videopanel footer (llhls closed)"*, with a screenshot of https://positron.studio/cam/ (BUILD `e761c9d`) showing `LL-HLS closed` as a caption over the black LL-HLS picture and the footer reading only `LL-HLS`. Every state line on /cam/ (`LL-HLS closed`, `LL-HLS stopped`, `Another camera is on LL-HLS`, `WebRTC could not start`, the harness line, and the same on the other three panels) moves from `slots.caption` into a footer cell of that panel's `video-panel.mjs`. The picture carries only the picture. Check whether `video-panel.mjs` already has a footer status cell before adding one; if the kit gains one it is done once, for every page. Also find out WHY the owner's session read `closed`. `demo/cam/index.html`, maybe `demo/shell/video-panel.mjs`.

### Done 2026-09-30: cam, one diagram per feed, four in total

DONE: Camera, LL-HLS, WebRTC, MoQ, one `How it works` heading, cut check covers all four.

ASKED, VERBATIM: *"make separate diagrams on each feed (4 total) in cam in bg"*. Split `/cam/`'s one diagram into four, one per panel: Camera (local capture), LL-HLS (MediaRecorder, wss /cam, cam container, RTMPS, Stream, LL-HLS player), WebRTC (WHIP, Stream, WHEP, with the TURN relay), MoQ (WebCodecs, WebTransport, relay). Each diagram describes its own panel's path only. Load `positron-diagram` first. `demo/cam/index.html`. Given to the agent already editing that page, so two agents never write it at once.

### Done 2026-09-30 (12cbb2b, BUILD 12cbb2b-111833-371b): `/away/`, listen to the Circuit through the Pi in a waveform, knobs untouched

ASKED, VERBATIM: *"make other demo for this, 'away', do not touch knobs tdemo. allow me just to listen in circuit audio from pi in wave visualizer (use videoframe)"*. The board's capture source (Fast Track Pro input 1, `rig/board/board.mjs` since 17d48ec) streams on `studio-1`. New page `demo/away/index.html` with a `createVideoPanel` whose picture is a live waveform canvas fed from `createBoard`'s `onPcm`, one Listen control, and nothing sent to the board beyond `audio.status`. New row in `demo/manifest.mjs` with `room: 'fixed'`. `demo/knobs/` is NOT touched.

### Done 2026-09-30: cam's WebRTC leg gets its own input, and its MoQ panel carries the camera

DONE: `/cam/whip` on the `cam` instance with `CAM_WHIP_URL` (input `54791f4c5c73713859c5413eeb06a008`, run by the owner), no tie to /watch, pub `fe81df0e`. WebRTC 65 ms, MoQ 30 ms p50 painted from the camera (MoQ already carried it since `1510d21`). Cam cold start NOT measured cleanly.

ASKED, VERBATIM: *"do open issues"*, after the cam report listed them. Two things on `/cam/`:
- **WebRTC borrows the whip-rig input (`WHIP_URL`)**, which is refused with 409 while anybody holds `/watch` on the main instance, so /cam/'s WebRTC panel goes red whenever somebody watches /llhls/ (4 reds in the agent's final run, 2026-09-30). Fix: its own WebRTC input, `CAM_WHIP_URL`, from `src/provision-cam-whip.sh`, which the OWNER runs (auto mode refuses secret writes). No busy rule tied to /watch; one camera at a time. `workers/pub/worker.mjs`, `demo/cam/index.html`, maybe `demo/shell/live.mjs`.
- **MoQ carries the test pattern, not the camera.** `startMoq` takes `paint` now, so /cam/ passes its camera draw and the MoQ footer stops saying test pattern. `demo/cam/index.html`.
- Measure while there: cold start of the `cam` container instance.

### Done 2026-09-30: TURN relay on /webrtc/, /stage/, /keep/, and say which path was taken

DONE: fetched on the press on all three, a `path` cell beside the ping, `readIcePath(pc)` in `live.mjs`. Every leg went DIRECT on this desk, so the relay branch has never run; it needs a UDP-blocking network or a forced `iceTransportPolicy: 'relay'` run. /webrtc/'s footer is still 14 px over at 360 px. The original entry follows.

ASKED, VERBATIM: *"do in bg"*, after *"should they ask for relay servers? what it improves?"*. `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` are on positron-pub since 2026-09-30 and `GET https://pub.positron.studio/ice` answers 200 with `turns:...:443?transport=tcp` among 7 servers. Pass them to every RTCPeerConnection on those pages, fetched on the PRESS and never on load, and show `direct` or `relay` from the selected candidate pair beside the latency, because a relayed latency is not comparable to a direct one. MoQ gets no help from TURN. `demo/webrtc/index.html`, `demo/stage/index.html`, `demo/keep/index.html`, maybe `demo/shell/live.mjs`.

### Open 2026-09-30: fix /stage/, the MIM film not the test screen, WebRTC only, local storage to R2 to playback. PRIORITY

ASKED, VERBATIM: *"can you fix stage? do we need another container instace not
to conflict to tohte? i still see test screen i want mim stuff. can you have
just webrtc transport? i want so see local storaage -> r2 -> playback.
prioritize it!"*. `demo/stage/index.html`, `workers/pub/container/server.mjs`,
`workers/pub/wrangler.jsonc`.
- 🔴 **WHY IT SHOWS THE TEST SCREEN: THIS SESSION DID IT.** `/stage/`'s WebRTC
  show is a RECEIVER of the container's WHIP leg (`stage/index.html:2414`), and
  the container's picture is `SOURCE`. `3f9a230` made the film the default for
  exactly this page; `d8c95d3` set `PUB_SOURCE=testsrc2` today so the clock
  layout would ship on the test pattern, and the film had never been deployed
  before either. One container, one source, two pages that want different
  pictures.
- **No second container is needed.** The conflict is the SOURCE per Stream
  input, not the instance. The container already runs two legs to two inputs:
  RTMPS to the LL-HLS input and WHIP to the WebRTC input. Give each leg its own
  source: the WHIP leg plays the film (no burn, as asked 2026-09-25), the RTMPS
  leg keeps testsrc2 with the clocks. Then `/stage/` (WebRTC only) gets MIM,
  `/llhls/` keeps the test screen, and `/webrtc/` shows the film, so its `what`
  and `one` move with it. A second instance would still fight over the same
  two inputs without new inputs and secrets.
- **WebRTC only**: the `Start HLS` transport goes; `Start WebRTC` is the show.
- **local storage to R2 to playback, visible**: today the page records the
  RETURNED track, keeps no local storage, and uploads only with `?r2=1`, opt in
  because the upload route allows five sessions an hour per address. The owner
  wants to SEE the chain: recorded into the browser, uploaded to R2, played back
  from R2. Make it the page's own path on a press (never on load), each stage
  shown as it happens, and keep the harness off the cap.

### Done 2026-09-30: cam's LL-HLS leg, on its OWN container and input (the handover was dropped)

DONE, and the design changed on the owner's word: *"A new input needs a CAM_STREAM_KEY secret ... do it"*. Input `157863305ec9583187dfbb1c66c031ea` from `src/provision-cam.sh`, container instance `cam`, pub `91f28914`. No handover, so /llhls/ never sees the camera. MEASURED: first camera frame back 14.3 s after recording, LL-HLS glass to glass 5.4 s and 6.1 s (two short spot readings), /llhls/'s main input recorded one unbroken video across a camera session. The /llhls/ stall in the owner's screenshot was the OLD handover's take-back: Stream answered 404 on the new video's parts for about 70 s, and why is not settled. The original entry follows.


ASKED, VERBATIM: *"cam hls solution?"*. Build `plans/plan-cam-llhls.md` with ONE
change: no new live input and no new secret (auto mode refuses `wrangler
secret put`, and the plan's `cam` input needs a `CAM_STREAM_KEY`). The camera
borrows the LL-HLS input `STREAM_KEY` already publishes to, by the same rule
`/whip` follows since `e2792e5`: refused with 409 while anybody holds `/watch`,
and a `/watch` arriving while a camera holds it takes the input back and the
camera leg is told. `workers/pub/worker.mjs`, `workers/pub/container/server.mjs`,
`demo/cam/index.html`, `demo/shell/live.mjs`.
- The plan's traps all stand: tag sockets and count only `watch`, serialise the
  chunk POSTs, three independent stops, and the viewer sweep's `/stop` must not
  touch the camera leg.
- Stream mints a new video UID on every encoder reconnect, so the test pattern
  and a camera alternating on one input is exactly the case the tuned player's
  rebuild exists for. Say what it costs in seconds.

### Open 2026-09-30: cam must work on a network that drops UDP ("make it work!")

ASKED, VERBATIM: *"make it work!"*, with a screenshot of https://positron.studio/cam/
at a cafe: the camera shows, `WebRTC could not start`, MoQ black, and logs
pasted from `/cam/`, `/webrtc/` (`pc connecting` then `pc failed` 15 s later)
and `/moq/` (`All promises were rejected`).
- 🔴 **MEASURED 2026-09-30 ~11:05, THIS LAPTOP'S NETWORK DROPS OUTBOUND UDP.** The
  default route is `172.20.10.1` on en0, a phone hotspot. A STUN binding
  request over UDP to `stun.cloudflare.com:3478` and to
  `stun.l.google.com:19302` got NO answer in 4 s; `node demo/check-whep.mjs`
  read `201`, `connecting`, 0 frames, 0 bytes. The same pages were green from
  this machine an hour earlier on another network. So it is the network, and
  it is also exactly what a visitor on a hotel or cafe network meets.
  ⚠️ **CORRECTED THE SAME MORNING: IT WAS THE VPN, NOT THE HOTSPOT.** The owner
  said *"vpn off"* and the same STUN request to `stun.cloudflare.com:3478` was
  answered at once, same default route `172.20.10.1`. So this is the CLAUDE.md
  VPN rule arriving again, and the routing table did not show it: the default
  route stayed on en0 while five `utun` interfaces were up. **Check the VPN
  before blaming the network, as CLAUDE.md says.** What stays true: a visitor
  behind a UDP-blocking network meets exactly this, so the captions and the
  TURN route are still worth having.
- **WebRTC can be made to work**: TURN over TLS on 443 (Cloudflare Realtime
  TURN, `turns:turn.cloudflare.com:443?transport=tcp`) relays to Stream's UDP
  from the far side. Needs a TURN key, a worker route that mints short lived
  ICE servers so the key never reaches the page, and the page passing them to
  both the WHIP and the WHEP peer connection. First check whether Stream's own
  answer already offers ICE-TCP candidates, in which case no TURN is needed.
- **MoQ cannot, today**: WebTransport is QUIC over UDP and Cloudflare's relay
  has no WebSocket listener (`positron-streaming`). The honest fix is the
  panel SAYING the network blocks UDP, rather than a black picture.
- Every page with a WebRTC leg would gain from the same TURN route: `/webrtc/`,
  `/stage/`, `/keep/`.

### Open 2026-09-30: all secondary buttons in capitals

ASKED, VERBATIM: *"cap: all secondary buttons"*. Read as: every secondary
button label in upper case, as the primary ones are. Which component draws a
secondary button and whether it is one CSS rule in `demo/shell/` or labels per
page is to be measured, not assumed; check `positron-ui` for what "secondary"
means in the kit. If "cap" meant something else (a cap on count? a cap
height?), the words are here.

### Open 2026-09-30: cam, "Local camera" becomes "Camera"

ASKED, VERBATIM: *"Local camera -> Camera"*. The top left panel's footer label
in `demo/cam/index.html`, and the diagram and any assert that names it.

### Done 2026-09-30: the black box over testsrc2's corner counter becomes red and green

DONE 2026-09-30: red to 213, green to 240, in the container and the canvas port; the port is 0 of 921,600 pixels off ffmpeg's RGB frame at frames 0, 37, 300, 1234.

ASKED, VERBATIM: *"what is this black box? put red and green on it with right
widths"*, with a crop of the live stream's top left corner. It is the 240x48
cover over testsrc2's own frame counter (`d8c95d3`, from `ea21ee4`). Paint it
in the bar colours instead: red to testsrc2's first bar edge, `rescale(1, w, 6)`
= 213 at 1280, green from there to 240. `workers/pub/container/server.mjs` and
`demo/shell/testsrc2.mjs` together, so `/moq/` stays pixel identical.

### Done 2026-09-30: the hls.js options table, no wrapped names, default and recommended columns, sans serif comment

DONE 2026-09-30, 2f82693.

ASKED, VERBATIM: *"do not wrap optoins. have default and recommended cols with
values. use sans serif for comment (change col title)"*, with a screenshot of
the `HLS.JS OPTIONS` table on `/llhls/` (from `9430464`) where
`maxLiveSyncPlaybackRate` and `initialLiveManifestSize` break mid-word.
`demo/llhls/index.html`, the table inserted after the diagram.
- Four columns: option (never wraps), default, recommended, and the comment in
  sans serif under a new title (the old `VALUE, AND WHAT IT BUYS` goes, since
  the value has its own column now).
- ⚠️ At 375 a no-wrap option column plus two value columns will not fit beside
  prose. Decide the phone layout with `positron-compose` rather than letting the
  table scroll sideways, and LOOK at both widths.
- The wrapping comes from the kit's `overflow-wrap: anywhere` on table cells;
  override it on this column only, not in `table.mjs`.

### Done 2026-09-30: the "I am watching" connector and its note should be more technical

DONE 2026-09-30, 9430464.

ASKED, VERBATIM: *"you can be more techincal on this connector label and desc
below"*, with a screenshot of the `/llhls/` diagram, the `socket` to `Pub` arrow
and the note under the picture.
`demo/llhls/index.html:648`, the `{ from: 'ctl', to: 'pub' }` link: `label: 'I
am watching'` and its `note` (*"Nothing is sent up this socket. Being open is
the whole message..."*).
- **`/webrtc/` carries the same link** at `demo/webrtc/index.html:542`, same
  label, a different note. Both change together or the two pages disagree about
  one socket.
- What the arrow really is: a WebSocket to `wss://pub.positron.studio/watch`,
  held by the `Pub` Durable Object, which counts open sockets in the room; the
  first one starts the ffmpeg leg and the sweep stops it when the count is zero.
  Read `positron-streaming` and the worker for the exact route, the sweep
  interval and whether it is hibernatable before writing the words, rather than
  copying this line.
- ⚠️ A connector label is short by the diagram's rules; the technical detail
  that does not fit goes in the note. Load `positron-diagram` first.

### Done 2026-09-30: the player box's note should say how to patch hls.js to work right

DONE 2026-09-30, 9430464.

ASKED, VERBATIM: *"add longer desc how to patch hls.js to work right"*, with a
screenshot of the `/llhls/` diagram's `player` box (`hls.js or native`) and its
note (*"Waits for two segments before it asks for anything, because Cloudflare
answers the master playlist with a 200..."*).
`demo/llhls/index.html:626`, the `{ id: 'play' }` box's `note`.
- **The material already exists and is measured**: `positron-streaming`'s
  `## hls.js and the native path: what each default costs` (SKILL.md from
  line 469): the three knobs that default against a low latency live start,
  `maxLiveSyncPlaybackRate` switching on hls.js's own latency controller, the
  live edge picked once with no recovery, the source watchdog, and what the
  wrapper does that no hls.js option can (rate of advance, Safari's native
  path at 0.961x / 5.25 s against hls.js 0.344x / 7.71 s). Take the words from
  there and from what `/llhls/` actually sets, not from memory.
- ⚠️ **"Longer" collides with the diagram's own rules.** A box note is read on
  hover under the picture; load `positron-diagram` and check how long a note may
  run before deciding whether this is one longer note or a short note plus a
  prose block on the page. Keep the existing two-segments fact, it is true.
- The one sentence rule is about `what` and `one`, not about diagram notes.
- **FOLLOW-UP, VERBATIM, SAID WHILE THIS LINE WAS BEING WRITTEN:** *"and get
  ll what we need"*. Read as: the text should say everything it takes to get
  real low latency (LL) out of hls.js, the full list rather than a sample. If
  it meant something else, the words are here to re-read.

### Done 2026-09-30: test screen, local timecode to the right so it does not overlap absolute

DONE 2026-09-30, d8c95d3, pub deployed as fa6c999e; the live picture changes on the container's next cold start.

ASKED, VERBATIM: *"test screen: move local timecode to right not to overlap
with absolute"*, with a frame grab from the live stream: `ABSOLUTE
1790752256.967` and `LOCAL 07:10:57` side by side on one row, the absolute
number running under the local one, and testsrc2's own corner counter still
showing top left.
Three places draw this layout and all three move together, as they did
yesterday: `burn()` and the filter generator in `demo/shell/pattern.mjs`, and
`workers/pub/container/server.mjs`.
- 🔴 **THAT FRAME IS YESTERDAY'S OLD LAYOUT, SO THE CONTAINER WAS NEVER
  DEPLOYED.** `ea21ee4` (2026-09-29 18:32, *"absolute over local in one column,
  and the corner counter covered"*) changed `server.mjs` to stack the two and
  to drawbox over the corner counter. The grab shows neither, so the ffmpeg
  side is still running the old `server.mjs`. The view deploys since then do
  not ship `workers/pub/`. Check what the pub worker and its container image
  are actually on before changing anything, and say which one was measured.
  MEASURED 2026-09-30 10:2x: `wrangler deployments list` for `positron-pub`
  shows the newest deploy at **2026-09-25T05:24:53Z**, four days before
  `ea21ee4`. Confirmed: the stream runs the old `server.mjs`.
- ⚠️ **AND THE ASK IS NOT WHAT YESTERDAY BUILT.** Yesterday's ask was *"put
  absolute and local below each other"*; today's is local to the RIGHT with no
  overlap. Either the owner is reacting to the undeployed old frame and the
  stacked layout already answers it, or they want side by side now. Show the
  stacked frame (canvas pages carry it already, e.g. a pattern page on the
  local server) and ask which, before building a third layout.
- If side by side: the old bug was the column sized for a 13 character epoch
  ms while ffmpeg prints 16 characters (seconds, three decimals, unit), per
  `ea21ee4`. The right column has to be derived from the widest string either
  side prints, not a constant.
- Deploying the container is `positron-streaming` work and costs a restart of
  the live leg; load it first.

### Open 2026-09-30: a new demo `cam`, one webcam through four paths in a 2x2 grid

ASKED, VERBATIM: *"in bg make demo called cam. 2x2 videopanels, button: [Start
camera] grid: Local camera LLHLS / WEBRTC MOQ. figure out how to to llhls from
webcam to container and back. do that resaeach in parallel track, implement the
rest first. add latency labes on all videopanel footers."*
`demo/cam/index.html` (new), a `cam` row in `demo/manifest.mjs`, group
`streaming`.
- Four `video-panel.mjs` panels: top left the local camera, top right LL-HLS,
  bottom left WebRTC (WHIP up, WHEP back), bottom right MoQ (browser to
  Cloudflare's relay and back). Every footer carries a latency label.
- **One button, `Start camera`, and nothing opens before it**, which is the
  standing rule: a visit opens nothing.
- **The LL-HLS leg is RESEARCH FIRST, in a parallel track**: how a webcam gets
  to the container and out as LL-HLS. Cloudflare will not serve a WHIP input
  as HLS (WHIP and WHEP must be used together), so the obvious route is closed
  and the answer is not obvious. The panel ships as honest "not wired yet"
  until the plan lands.
- ⚠️ Every leg is ours (Cloudflare Stream, the relay, the pub worker) and each
  one bills Stream minutes from 2026-10-15; the camera must stop every leg when
  it stops.
- **FOLLOW-UP, VERBATIM:** *"add diagram to cam demo as well"*. A how it works
  diagram with `demo/shell/diagram.mjs`, one path per leg from the camera.
  Load `positron-diagram`. The LL-HLS path is drawn as it is (not wired) until
  the research lands.
- **LANDED 2026-09-30 without two things, found by the agent that built it:**
  1. **MoQ carries the test pattern, not the camera**, because `startMoq` in
     `demo/shell/moq.mjs` draws its own pattern and takes no source. Kit
     change: a `draw(ctx, w, h, i)` option used in place of `burn(...)`; then
     `/cam/` passes its camera draw and loses the `test pattern` footer and
     note. Wait for the `/moq/` agent to finish before touching `moq.mjs`.
  2. **The `/whip` 409 is written and not deployed** (`workers/pub/worker.mjs`):
     a camera publish is refused while anybody holds `/watch`, instead of
     fighting the container's WHIP leg for the one input. The `Pub` box note
     already describes it.
  - Also found: `diagram.mjs` at 375 draws a cross-container link label over
    another in the gap between stacked containers and `cuts` does not report
    it; and `moq.mjs` log lines carry middots (`catalog ok · av01`).
  - Graded: `verify.mjs cam` 15/15 (9 page) on the refused-camera path, since
    the harness has no fake device; a probe with Chrome's fake camera read
    21/21 twice, WebRTC glass to glass median 104 ms, MoQ p50 46 ms.

### Done 2026-09-30: webrtc and moq get stats like the llhls readout

DONE 2026-09-30, f0a1d18 (webrtc) and the moq commit.

ASKED, VERBATIM: *"add some stats to webrtc and moq demo"*, with a screenshot of
`/llhls/`'s readout row: `LATENCY ADVANCE BUFFER HOLES STALLS SWITCHES`.
`demo/webrtc/index.html` (readout at `:41`), `demo/moq/index.html` (`:37`).
- **What each has today, counted 2026-09-30:** `/llhls/` six cells (`latency s,
  advance, buffer s, holes, stalls, switches`). `/webrtc/` TWO (`round trip ms,
  state`). `/moq/` four declared (`latency ms, p95 ms, fps, frames`) and only
  three ever `d.set`: **`p95` is declared and never written**, so it is an
  empty cell today. Check that before adding more.
- ⚠️ **NOT THE SAME SIX.** HLS words (holes, switches, advance) mean nothing on
  a WebRTC or MoQ page. The stats worth having come from what each transport
  exposes: WHEP has `getStats()` (`inbound-rtp`: `framesDecoded`,
  `framesDropped`, `freezeCount`, `jitter`, `jitterBufferDelay`,
  `packetsLost`, `nackCount`, `candidate-pair` RTT, and the chosen codec); MoQ
  has what its player and the page already measure. Pick the ones that answer
  *is it smooth and how late is it* on that transport, and say where each came
  from.
- ⚠️ **`candidate-pair` RTT IS NOT MEDIA LATENCY** (`positron-streaming`): WHEP's
  `round trip` cell beside MoQ's glass-to-glass `latency` flatters WHEP about
  3x. If both pages show a latency, the labels must say which kind.
- Adding readout cells changes what the page asserts and says; load
  `positron-ui` and `positron-verify`, and the page's `what` moves with it.
- Overlaps the moq line below (the "llhls treatment" includes the video panel,
  whose value row carries size, fps and spec). Do the moq readout in the same
  pass as that ask, one agent per page, so the two do not fight over one file.

### Done 2026-09-30: webrtc and moq move to the streaming section, at the top of the index

DONE 2026-09-30, 4d7c062.

ASKED, VERBATIM: *"move webrtc and moq to streaming section to top of index
page"*. `demo/manifest.mjs`: `webrtc` (`:96`) and `moq` (`:100`) are both
`group: 'technologies'` today; `streaming` holds `llhls` alone and is already
the first section (`f8583ec`, 2026-09-29).
- The moq half was already asked yesterday (the entry below); this adds webrtc
  and settles it. One edit to two rows, done ONCE by the session before any page
  agent starts, because it is the shared file.
- Order inside the section: llhls, webrtc, moq is the story order (HLS, then
  WHEP, then MoQ, latency falling). Confirm against how `byGroup()` sorts, since
  the index is newest first.
- `built` stays as it is; this is `group` only.

### Done 2026-09-30: moq gets the llhls polish, and its canvas draws the ffmpeg picture 1:1

DONE 2026-09-30, the moq commit.

ASKED, VERBATIM: *"do same ui polish moq as to llhls etc. try to generate 1:1
same graphics + timecode bar as in container ffmpeg examples"*, then *"...and
add diagram too"*. `demo/moq/index.html`, `demo/shell/moq.mjs`,
`demo/shell/pattern.mjs`.
- **The polish half is the 2026-09-29 entry just below**, restated today with a
  diagram named explicitly: three state toggle, video panel, how it works
  diagram, one sentence desc, plus the stats ask above. One agent owns the page.
- **The picture half is new.** `/moq/` publishes from the BROWSER: `moq.mjs:124`
  says the pattern is `burn()` from `pattern.mjs`, which paints a flat `FIELD`
  (`#0d1017`) and the clock row. The ffmpeg legs paint `testsrc2` (colour bars,
  the moving gradient line, the checker, the dot arc) with `drawFilters` over
  it, which is what the 2026-09-30 frame grab shows. So *"1:1 same"* means a
  canvas rendering of `testsrc2` plus the ABSOLUTE and LOCAL timecode blocks in
  the same geometry the container uses.
- ⚠️ **`testsrc2` IS NOT A SPEC, IT IS A C FUNCTION.** Read `libavfilter/
  vsrc_testsrc.c` (`test2_fill_picture`) for the exact layout and motion rather
  than eyeballing a screenshot, and compare by rendering both at 1280x720 on the
  same frame number (ffmpeg is on this machine for a local render; nothing
  external is opened). Say how close it got, in pixels or as a diff image,
  rather than calling it 1:1.
- ⚠️ **THE TIMECODE LAYOUT IS IN FLUX.** The test screen ask above (local to the
  right, or stacked) decides where the two blocks go, and `burn()` and the
  ffmpeg filter generator share `pattern.mjs` so they cannot drift. Settle that
  ask FIRST, then the moq canvas takes whatever layout won.
- ⚠️ **THE FROZEN ROW MUST SURVIVE.** `burn()`'s clock bits are what
  `readBurned` decodes for glass to glass latency on `/moq/`; a busier picture
  under them (bars, a gradient line crossing them) must not enter the black bed.
  The p50 26 ms number depends on it being readable. Assert it still decodes.
- ⚠️ **AND THE CONTAINER'S DEFAULT SOURCE IS A FILM**, per `server.mjs:34`
  (`PUB_SOURCE` unset plays the MIMproject film, empty puts `testsrc2` back).
  The grab shows `testsrc2` because the deployed container predates the film
  as well: `positron-pub` was last deployed 2026-09-25 05:24Z and the film
  landed in `3f9a230` at 17:29 that day. **So deploying the container for the
  test screen ask would also swap the live picture to the film**, which is not
  what anybody asked for today. Decide the source before that deploy, and the
  moq canvas matches whichever it is.

### Done 2026-09-29: moq joins the streaming section and gets the same UI treatment

DONE 2026-09-30, 4d7c062 and the moq commit.

ASKED, VERBATIM: *"Move moq to streaming as well and do same ui treatment"*.
`demo/moq/index.html` and the `moq` row in `demo/manifest.mjs`.
- **The move**: `moq` went to `technologies` in the 2026-09-29 merge; it goes
  back to `streaming`, which then holds `llhls` and `moq` and is still the first
  section on the front page.
- **"The same UI treatment" is the four asks `/llhls/` and `/webrtc/` got**: the
  three state toggle in place of the primary button (`STREAM` and `STREAM_CAN`
  are already in `demo/shell/presence.mjs`, so this is a third caller, not a new
  component), the video panel with size, fps and a short spec, a how it works
  diagram, and a one sentence desc.
- ⚠️ **THE SPEC AND THE STOP CONDITION ARE BOTH DIFFERENT AND MUST BE READ,
  NOT COPIED.** This page is browser to browser over MoQ through Cloudflare's
  relay: there is no ffmpeg leg and no `wss://pub.positron.studio/watch`
  reference count behind it, so *how it stops* is not the container sweep the
  other two describe. `positron-streaming` has what is measured, including that
  a relay cannot live in a Container because there is no inbound QUIC.
- ⚠️ **AND SAFARI IS BLOCKED ON THIS PAGE FOR A MEASURED REASON**
  (WebKit 319818, the QUIC flow control window never refilling, about two
  minutes of streams). If the page says how it works, that belongs in it.
- `moq` carries `settleMs: 30000`.

### Open 2026-09-29: createPresenceButton's `state` is a getter returning a function, and it has bitten two pages, found not asked for

`demo/shell/presence.mjs`. `createPresence`'s api exposes `state: () => now`, a
FUNCTION, and `createPresenceButton` hands it through a getter, so
`btn.state === 'offline'` compares against a function object and is false for
ever.
🔴 **BOTH TIMES THE SYMPTOM WAS A GREEN RUN WITH SILENTLY MISSING COVERAGE, NOT
AN ERROR.** `/twelve/` wrote it down in its own words, *"a comparison against a
function is a comparison that cannot fail"*, and `/llhls/` and `/webrtc/` walked
into it anyway on 2026-09-29, in a control handler rather than in a check: the
first run after the edits read **16/16 green with `page asserted something` at
2 on both pages**, and only the COUNT said so.
- Fixed at both call sites (`stream.state()`), and each page's presence assert
  now requires `typeof state === 'string'` so it goes red on exactly that bug.
- ⚠️ **THE KIT'S SHAPE WAS NOT CHANGED, ON PURPOSE.** A rename on the api moves
  four other callers (`/circuit/`, `/evo/`, `/shape/`, `/twelve/`) and nobody
  asked. The two candidates are a rename, or a line in `positron-ui`.

### Open 2026-09-29: the `fps` cell on /llhls/ and /webrtc/ has never shown a number

`watchPresentedFps` counts frames through `requestVideoFrameCallback` and
reports `null`, never `0`, where the API is absent. Every screenshot is taken
without a press, so the picture is always empty, and nothing asserts on the
frame rate.
🔴 **SO IF IT NEVER FIRES IN THE HARNESS'S HEADLESS CHROME THE CELL SIMPLY
STAYS EMPTY AND NOTHING SAYS SO.** That is this project's worst shape and it is
the first thing to look at on the deploy. A press on either page with the
publisher awake answers it.

### Open 2026-09-29: a press during `starting` is untested by a machine

`stop()`, the generation guards at every await and the new `signal` abort on
`waitForWhip` and `waitForManifest` have never run in a check, because the
harness presses each control once. They were READ and they are simple, which is
reading rather than measuring. Driving a second press costs another container
wake, which is why it was not done.

### Open 2026-09-29: the container's burn overlay is dormant, so the test pattern fix is invisible in production

`workers/pub/wrangler.jsonc` sets only `PUB_W`, `PUB_H` and `PUB_FPS`.
`PUB_SOURCE` defaults to the mimproject film and `PUB_BURN` has been off since
the 2026-09-25 *"rm burn overlay"* change, so the `testsrc2` corner counter and
every `drawtext` clock are switched off on `pub.positron.studio`.
- The 2026-09-29 stacking change is therefore live only in the CANVAS twin,
  which is what nine demo pages draw and what a visitor sees.
- Turning the container side on is `PUB_SOURCE=""` and `PUB_BURN=1` in that
  `vars` block plus a `workers/pub` deploy. NOT done, because it changes what
  every streaming demo shows and nobody asked for that.

### Done 2026-09-29: webrtc gets the same treatment as llhls, and its desc goes to one sentence

✅ **DONE, same commit.** The desc went from six sentences to one, and each sentence it lost has a better home: the handshake and how it stops are the diagram, what the control does is its own label, what `round trip` means is the readout key's. The spec is NOT llhls's: libopus rather than aac, baseline 3.1, `-bf 0`, so the cell reads `H.264 + Opus`. **10 to 13 page asserts**, all eight existing ones untouched and still green.

ASKED, VERBATIM: *"same treatment ot https://positron.studio/webrtc/ . shorten
desc to 1 sentence"*. `demo/webrtc/index.html` and the `webrtc` row in
`demo/manifest.mjs`.
- **"The same treatment" is the four llhls asks of this sitting**, each entry
  below: the three state stream toggle in place of the primary button, the
  publisher idle badge gone, how it works including how it stops, and the video
  panel with resolution and fps and a short spec.
- ⚠️ **AND WHAT STOPS IT IS THE SAME MECHANISM, WHICH IS WHY THE PAGES CAN
  SHARE A COMPONENT.** Both legs live on one container behind
  `workers/pub/worker.mjs`: the viewer socket reference count, the 30 s sweep,
  `GRACE_TICKS` of 2. The DIFFERENCE worth saying is the leg: `/webrtc/` is the
  WHIP publish and WHEP playback, and Cloudflare holds a WHIP input against a
  stale publisher for about 45 s before accepting a new session, which has no
  equivalent on the RTMPS side.
- ⚠️ **THE SPEC DIFFERS TOO AND MUST NOT BE COPIED ACROSS.** The WHIP leg is
  libopus rather than aac, baseline/3.1, `-bf 0`, MEASURED in
  `rig/whep/WHIP-FFMPEG-NOTES.md`. Read it rather than repeating llhls's.
- **The desc**: one sentence, no colon, no semicolon, no dash, no "and" carrying
  a second fact. Both `what` and the `one` line in `manifest.mjs`, which are the
  same string on any page with a diagram.
- 🔴 **THIS PAGE'S OWN CHECKS WERE UNREACHABLE UNTIL 2026-09-25** and the fix
  took it 8 asserts to 16. Anything done here reads the count before and after,
  and a drop is a regression rather than a tidy.

### Done 2026-09-29: the burned-in test pattern, drop the top left counters and stack ABSOLUTE over LOCAL

✅ **DONE, `ea21ee4`, deployed in `09c2c26-155029-cbfd`.**
🔴 **THE TOP LEFT COUNTERS ARE NOT OURS.** No `drawtext` draws them: they are `testsrc2`'s own corner overlay and it has no option to turn it off, MEASURED by rendering raw `testsrc2` with no filters. Covered with a 240x48 `drawbox`, which clears the box at frame 500,000 too.
🔴 **AND THE TWO COLUMNS WERE WRONG BY CONSTRUCTION.** `COL2` reserved the width of a THIRTEEN character number, which is the canvas's epoch in ms; the ffmpeg side prints seconds with a unit, sixteen characters. Stacking removes the constant rather than correcting it.
⚠️ **THE LAYOUT LIVES IN THREE FILES** and all three moved: the canvas `burn()` and the filter generator in `demo/shell/pattern.mjs`, and the copy in `workers/pub/container/server.mjs`, which now derives its baselines the same way. At h=720 the numbers sit at y364 and y504 in all three. The block is 140 px taller, so the middle `drawCamera` lays a picture into loses that much.
⚠️ **CPU: no measurable change**, 12.375 s against 12.208 s over four runs each, inside a 12 per cent swing.

ASKED, VERBATIM: *"rm top left counters. put absolute and local below each
other"*, with a frame grab. The subject is the PICTURE the publisher burns in,
so the file is `workers/pub/container/server.mjs` and its `drawtext` filters,
not any demo page. It reaches `/llhls/`, `/webrtc/` and `/moq/` at once, because
each leg publishes the same pattern to its own input.
- **What is on screen in the grab**: a small timecode and frame counter block top
  left (`00:01:11.967` over `2159`), then `ABSOLUTE` with an epoch and `LOCAL`
  with a wall clock, drawn as two labelled boxes ON ONE LINE whose values OVERLAP
  in the middle. The overlap is visible in the grab and is a defect on its own,
  separate from the ask.
- ⚠️ **THE EPOCH IS THE MEASUREMENT AND MUST NOT BE TOUCHED.** The burned-in
  clock is what makes glass-to-glass latency measurable at all, and
  `positron-streaming` records that `drawtext` CANNOT print epoch milliseconds
  (`%{expr_int_format}` clamps at INT32_MAX and prints 2147483647), which is why
  it is seconds with the unit beside it. Moving a line must not become
  reformatting the number.
- ⚠️ **AND A MONOSPACE FACE WITH AN EXPLICIT `fontfile`**, both already
  required: `drawtext` with no `fontfile` resolves to nothing and fails
  SILENTLY, and in a proportional face the digits shift sideways as they change.
- ⚠️ **COST IT BEFORE ADDING ANYTHING.** A 56 block machine readable clock row
  cost a MEASURED +16 per cent encoder CPU on that half vCPU box and was removed
  on 2026-09-08 because nothing read it. This ask REMOVES a block and moves two,
  so it should go the other way, and the report says which way it went.
- ⚠️ **IT NEEDS A CONTAINER BUILD AND DEPLOY, NOT A `workers/view` DEPLOY**,
  and it cannot be seen until a publisher is awake, which costs Stream minutes.
  So this is verified once, deliberately, rather than iterated on.

### Done 2026-09-29: llhls uses the video panel, with resolution and fps and a short spec of what it streams

✅ **DONE, same commit.** Three cells with reserves in `ch` of the mono face plus `tabular-nums`: `size`, `fps`, `source` reading `H.264 + AAC`. MEASURED by writing every cell empty, measuring the row, then writing every cell at its widest: **215.7 px against 215.7**.
🔴 **AND IT UNCOVERED A CSS RULE THAT HAD NEVER BEEN ABLE TO RUN.** `.pos-vp-vals` has declared `overflow-x: auto` since it was written while `.pos-vp-foot` floors its left track at `min-content`. MEASURED at 375 before the fix: the fullscreen square sat 21.7 px outside the panel and `overflow: hidden` cut it off, so the one control in that footer was invisible on a phone. Fixed as a `:has()` condition; `/held/` at 375 is byte identical after.

ASKED, VERBATIM: *"use in llsl use videopanel with resolution / fps (fix w so it
did not ump horztally) and short spec what streams it"*. Same page, same sitting
as the three llhls asks below. `demo/shell/video-panel.mjs`,
https://positron.studio/kit/#video-panel, already on `/held/`, `/making/`,
`/mirror/`, `/pack/`, `/stage/`, `/weight/` and `/wish/`.
- **The parenthesis is the hard part and it is a real defect.** A footer reading
  live numbers re-lays out on every update, so `1280x720` becoming `1280x72` for
  one frame, or `59.9` becoming `60`, shifts everything after it sideways. The
  fix is a fixed width per cell, or tabular figures, and `table.mjs` and the
  readout already solve this for numbers that change.
- ⚠️ **AND IT IS THE MIDDOT RULE ONE LAYER DOWN.** CLAUDE.md: *"a row of facts
  is cells, not one string with glue in it"*, written about a panel footer
  reading `Apple GPU · locked 59.9 fps`. So resolution and fps are two CELLS,
  and the fix for the jump is a property of a cell rather than a string.
- **The short spec is what the encoder is doing**, which is READ off
  `workers/pub/container/server.mjs`: H.264, CBR, fixed GOP equal to the segment
  length, B-frames OFF because they break LL-HLS, and the picture size is
  tunable through `PUB_W`, `PUB_H` and `PUB_FPS`. One sentence of it goes on the
  page, not all of it.
- ⚠️ The page's own `what` may NOT carry this: a desc is one sentence and may
  not be stretched. This is a footer, a readout or a panel caption.

### Done 2026-09-29: llhls, remove the publisher idle badge

✅ **DONE, same commit, and it WAS the same change as the toggle.** Whether this page holds the publisher is what the toggle says in words. How MANY hold it is a fact the toggle cannot carry, so it moved to a log line on change rather than being deleted: as a fourth footer cell at 375 the row scrolled and cut `H.264 + AAC` in half.

ASKED, VERBATIM: *"rm publisher: idle badge"*. Same page, same sitting as the
two llhls asks below, so all three are worked together and the page is verified
once.
⚠️ **IT MAY BE THE SAME READING THE NEW TOGGLE IS ABOUT.** The toggle ask asks
for `stream off | starting | on` in place of the primary button, and a badge
reading `publisher: idle` is the same fact in a second place. If it is, this is
one change rather than two, and the report says so rather than deleting a badge
and leaving the page with no way to know the publisher is down.
⚠️ **AND IF THE BADGE CARRIES SOMETHING THE TOGGLE WILL NOT**, say what, and
say where that reading goes instead. A control that is removed and a fact that
is removed with it are two decisions, and only one of them was asked for.

### Done 2026-09-29: llhls says how it works, including how the stream stops

✅ **DONE, same commit.** A diagram at the foot, five boxes in two machines, everything read off `workers/pub/worker.mjs` and the container server. The caption carries the sentence a visitor learns something from: *"The viewers are counted because ffmpeg sending video makes no requests of its own, so a container that slept on request idleness would go to sleep under somebody who was watching."*

ASKED, VERBATIM: *"add how it works to llhsl incl how it stops"*. Same page,
https://positron.studio/llhls/, and it is the same sitting as the toggle ask
above, so the two are worked together.
- **The mechanism, READ off `workers/pub/worker.mjs` on 2026-09-29 and to be
  re-read before it is written down**: the page holds a socket to
  `wss://pub.positron.studio/watch`; the FIRST socket into the room starts the
  ffmpeg publish, and `#startPublish` is deliberately not awaited inside the
  WebSocket upgrade, because awaiting it delayed the 101 by the container's cold
  start.
- **How it stops, which is the half the ask names.** `webSocketClose` arms a
  30 s alarm (`SWEEP_MS`) once the room is empty. The sweep counts idle ticks
  and `GRACE_TICKS` is 2, so about 60 s of nobody watching, and a reload inside
  that minute does not thrash the container. Then it POSTs `/stop`, which
  SIGTERMs both ffmpeg legs, and deletes the alarm. The container's own
  `sleepAfter = '10m'` is a backstop and is NOT what normally stops it.
- ⚠️ **AND THE REASON IT IS REFERENCE COUNTED RATHER THAN `sleepAfter` ALONE
  IS WORTH SAYING ON THE PAGE**: ffmpeg publishing generates no incoming
  requests at all, so request idleness would kill a stream somebody is watching.
  That is the sentence a visitor learns something from.
- ⚠️ **WHERE IT GOES IS A `positron-ui` AND `positron-diagram` QUESTION, NOT A
  PARAGRAPH BOLTED ON THE `what`.** CLAUDE.md: a desc is ONE sentence and may
  not be stretched. So this is a diagram, a readout key, or a section of its
  own, and the page already has a diagram to extend.
- ⚠️ A leg dying under a live viewer is RESTARTED by the same sweep, and a dead
  WHIP leg needs about 45 s before Cloudflare accepts a new session. Both are
  things the page could say and neither is in the ask.

### Done 2026-09-29: llhls, the primary button becomes a three state stream toggle

✅ **DONE, `09c2c26`, deployed in `09c2c26-155029-cbfd`.** No new component: `createPresenceButton` already is this control, and what was missing was three words, so `STREAM` and `STREAM_CAN` landed beside `SAYS` and `WIRED` in `demo/shell/presence.mjs`. A press during `starting` STOPS and the badge title says so.

ASKED, VERBATIM: *"https://positron.studio/llhls/ rm primary button with status
togglebutton: stream off | starting | on. make a global component for this if
needed"*. One page, https://positron.studio/llhls/, file `demo/llhls/index.html`,
and possibly one new module in `demo/shell/`.
- **The three states are the ask's own words**: `stream off`, `starting`, `on`.
  `starting` is not a press, it is what the control reads while the container
  wakes, so the component has to be told its state rather than toggling itself.
- ⚠️ **THE MIDDLE STATE IS REAL AND LONG HERE.** `manifest.mjs` gives `llhls`
  `settleMs: 75000` with the comment *"a cold container + ffmpeg + Stream ingest
  is ~30 s; without this the harness asserts against a 204 and calls a working
  demo broken"*. So `starting` is the state a visitor sees for half a minute and
  it is the one worth getting right.
- ⚠️ **A PRESS DURING `starting` MUST DECIDE SOMETHING**, and the ask does not
  say what. Ignored, or stop. Whichever it is, the control says so rather than
  looking dead: `positron-ui` already carries this project's rule that a control
  that does nothing and says nothing reads as broken.
- **On the kit question, *"if needed"* is the instruction.** Look for what
  already exists before writing a module: `createPresenceButton` and
  `HEADER_STATES` were built for exactly this shape and `/muta/` returned them
  when its switch went, and `/stage/` has a transport with an OFF AIR to
  STARTING reading of its own that was worked on 2026-09-25. A third copy is
  what earns a kit component; a first one does not.
- ⚠️ **STARTING THIS STREAM COSTS MONEY AND A CONTAINER.** Every viewer holding
  `wss://pub.positron.studio/watch` starts an ffmpeg publish, and Stream bills
  delivered minutes on both protocols. So verify the CONTROL rather than the
  stream wherever the two can be separated, and do not leave a harness holding
  the socket.

### Open 2026-09-29: the index cards should carry the demo's own description

ASKED, VERBATIM: *"copy demo descs (or their first sentence) to index page
cards"*. `demo/manifest.mjs` and every `demo/<slug>/index.html`.
- **The two strings today.** `one` in `manifest.mjs` is what a card shows; `what`
  in a page's `mount()` is what the page shows under its `h1`, appended as
  `<p class="pos-what">` by `demo/shell/shell.mjs`. CLAUDE.md already says they
  are the same string on any page with a diagram and that they move together, so
  on some rows this is a no-op and on others it is a real copy.
- ⚠️ **MEASURE THE DISAGREEMENT FIRST.** The ask is only worth a sweep where the
  two differ; the count of rows where `one !== what` is the size of the job and
  is not known. A page with no `what` at all is a third case.
- ⚠️ **ONE SENTENCE, AND THE PARENTHESIS IS THE ESCAPE HATCH FOR THE REST.**
  CLAUDE.md: *"descs are single sentences (do not stretch them with : ; -- etc)"*.
  So *"or their first sentence"* is the instruction for any `what` that runs to
  two, and a first sentence that needs a colon to make sense is a rewrite rather
  than a copy.
- ⚠️ **THE CARD IS THE SHORTER SURFACE.** The 2026-09-29 handoff records the
  front page paying **72.5 px on three cards** for keeping knobs's `what` and
  `one` identical, and calls it reversible in one line. Copying every `what` on
  to every card makes that trade on 55 rows, so the report carries the front
  page's height before and after.
- The single source of truth question is worth asking in the report and NOT
  deciding unasked: a `one` derived from `what` at build time would make the two
  impossible to disagree, and that is a change to `manifest.mjs`'s shape rather
  than a copy.

### Done 2026-09-29: front page, merge streaming into technologies

✅ **DONE, `f8583ec`, deployed in `f8583ec-133019-f807`.** Six rows moved
(`webrtc`, `moq`, `room`, `now`, `flipper`, `remixer`), `technologies` reads 9
rows, 55 cards as before. The section keeps the word `technologies`.

ASKED, VERBATIM: *"Merge streaming and technologies."* The file is
`demo/manifest.mjs`, the `group:` field on seven `streaming` rows (`llhls`,
`webrtc`, `moq`, `room`, `now`, `flipper`, `remixer`) and three `technologies`
rows (`looper`, `strip`, `draw`), and the `GROUPS` map at about `:1164` that
decides section order and titles. `/kit/` builds its tabs from its OWN groups
list, not this one, so it does not move.
- ⚠️ Read with the line below: `llhls` does NOT merge, it goes to the new first
  section. So `technologies` gains six rows, not seven.
- `byGroup()` refuses a row whose group is not in `GROUPS` and drops a section
  with no rows, so the old `streaming` id has to leave the map or be reused,
  never left dangling.
- The section title is `technologies` today. Whether the merged section keeps
  that word is not in the ask and is left as is.

### Done 2026-09-29: front page, a new streaming section first, holding only llhls

✅ **DONE, `f8583ec`, the same commit and deploy.** The `GROUPS` entry sits above
`th`, `byGroup()` reads `streaming 1 llhls` first, and the row keeps its
`settleMs`.

ASKED, VERBATIM: *"Make a new streaming section to fronpage as first and put
only llms there"*. `llms` is read as `llhls`, the LL-HLS demo, since that is the
one streaming page and nothing here is about language models. Same file.
- The front page is ordered by `GROUPS` insertion order, so *first* is the first
  entry of that map, ahead of `th`.
- One row in a section is what `grains` had, and `byGroup` draws it.
- ⚠️ `llhls` has `settleMs: 75000` because a cold container is about 30 s; the
  row moves, the row's fields do not.

### Done 2026-09-29: muta, rename PLAITS to MUTA and give the nameplate its own section at the bottom

✅ **DONE, `2d6c8de`, deployed in `2d6c8de-135446-6bd8`.** `plate: { name: 'MUTA' }`
alone, so `createInstrumentPanel` builds one `.panel-plate` and `ROW_KINDS`
puts it last. The foot is the component's own behaviour and no page CSS
arranges it, which is what *"use instument panel global behaviour"* asks for.
`panel.shape()` went `viz controls plate` to `viz controls controls plate`.
🔴 **THE TWO CONTROLS LEFT THE FOOT AND THREE PAGE RULES DIED WITH THEM.**
`.plai-panel .pos-ipanel-name` in both media queries and
`.plai-panel .muta-tone { margin-inline-start: auto }` were all about a
two-ended plate row and were deleted rather than moved: `align: 'between'` on
the new row does what the auto margin did, with no threshold.
⚠️ **THE NAME LEANS LEFT AT THE DESK AND IS CENTRED ON A PHONE, AND ONLY THE
SECOND HALF WAS DECIDED HERE.** A lone line under the default `place: 'ends'`
parks at the start, which is `/shape/`; `/tom/` passes `place: 'end'` to park
it at the other edge. Nothing in the ask says which. The centring is
`shell.css`'s existing phone block.
⚠️ **AND THAT BLOCK'S `order: 1` STOPS APPLYING TO THIS PAGE**, because it
selects `.pos-ipanel-name` and this page no longer builds one. It goes on
applying on `/fau/` and `/knobs/`, so the open line below about the nameplate
not being literally last is now about those two and not about `/muta/`.

ASKED, VERBATIM: *"muta: rename plaits to muta and use instument panel global
behaviour whee nameplane is in separate section in bottom"*. One page,
https://positron.studio/muta/, file `demo/muta/index.html`.
- **The name.** `createInstrumentPanel({ plate: { name: 'PLAITS', ... } })` at
  about `:802`. The page is called `muta` in `manifest.mjs` and the plate says
  `PLAITS`, the firmware's name. The plate follows the page.
- **The section.** Today the plate row is TWO ENDS at every width: the name
  cluster (`.pos-ipanel-name`, holding the name and the `Test tone` button in
  `status`) at the start, and the model picker in `patch` at the far end. On a
  phone that row wraps and reads picker, then name and button, which is the
  open line below about the nameplate not being literally last. The kit already
  has the shape asked for: a plate with ONLY a name is a single `.panel-plate`
  row and the last row of the panel by `ROW_KINDS`, which is what `/shape/` and
  `/tom/` draw. So the picker and the button leave the plate and go into a
  controls row above it, and the plate is the name alone.
- ⚠️ **THE PICKER LOSES ITS CAPTION ONLY IN THE `patch` SLOT.** Out of that slot
  the `.pos-pick-l` comes back, and *"no label on patch selctor"* (2026-09-28)
  still stands. The assert at about `:2124` reads `panel.patchEnd` for the
  caption and has to move with the control.
- ⚠️ **WHERE `Test tone` GOES IS NOT IN THE ASK.** It leaves the plate with the
  picker. The assumption worked under is that it sits on the same controls row
  as the picker and the randomize button, at the far end, which is where the
  2026-09-29 ask *"Test tone right"* put it. Say so in the report so it can be
  moved.
- ⚠️ Page scoped. Nothing in `demo/shell/` changes for this, and if the same
  shape is wanted on `fau`, `knobs` and `shape` that is a kit decision and a
  separate line.

### Done 2026-09-29: muta, the patch selector and the randomize button are one row that never wraps, and the selector takes the rest of the width

✅ **DONE, `2d6c8de`, the same commit and deploy.**
✅ **THE FIRST HALF WAS ALREADY TRUE AND NO RULE WAS WRITTEN FOR IT.**
`picker.mjs:204` appends the die INSIDE `.pos-pick`, and `shell.css`'s phone
block keeps it on the segment's line on purpose, written after the die dropped
a whole row below the arrows on `/radio/` and `/mirror/`. MEASURED at 375, 560
and 1280: the die's top is 0.0 px off the segment's top at all three.
🔴 **THE STRETCH TOOK THREE DECLARATIONS, BECAUSE THE WIDTH LIVES ON THE
CELL.** `.pos-pick-cell` is `width: calc(var(--pick-w) + ...)`, 22ch at the
desk, so widening `.pos-pick` alone spends the difference on air between the
segment and the die. MEASURED at 1280: the cell is **421.5 px** against the
271 px an unstretched one gives, the picker holds the row's start and the
button its end.
🔴 **AND THE FIRST DRAFT OF THE ASSERT WAS WRONG ABOUT WHICH EDGE TO READ.**
It required the cell to end where the segment ends; `.pos-pick-seg` is back
arrow, cell, forward arrow, so the cell ends one 34 px arrow short. It grades
the cell's WIDTH now. The other red was the same shape: the row's border box
carries 20 px of `--rows-pad`, so a child sitting at the content edge is 20 px
inside the row, and the test is a symmetric inset rather than a coincident edge.
⚠️ **ON A PHONE THE ROW DOES WRAP, ON PURPOSE, AND THE ASK IS READ AS BEING
ABOUT THE SELECTOR AND THE DIE.** *"go togther and so not wrap"* names that
pair, and they never separate at any width. The `Test tone` button takes its own
full-width line at 560 and under, which is the ask of 2026-09-28
(*"test tone button takes full w on mobile"*) and would have to be revoked to
put all three on one line at 375. MEASURED at 375: the picker is 301.0 px on
line one and the button 301.0 px on line two, 0 px of document overflow.
⚠️ **AND THE STRETCH IS PAGE SCOPED.** The kit shape would be a `grow` option
on `createPicker`, which is on nine pages, and nothing has asked for it
elsewhere.

ASKED, VERBATIM: *"Patch selector and randomize button go togther and so not
wrap and parch takes rest of w"*. Same page, same file, and it is the row the
line above creates.
- The picker is `createPicker({ ..., random: () => setModel(...) })` at about
  `:485`, so the randomize control is drawn by `picker.mjs` itself. Whether it
  is inside `.pos-pick` or a sibling decides whether *"go together"* is already
  true and only the wrap and the width are owed. MEASURE at 375 before writing a
  rule.
- **Two rules and no third**: the row does not wrap (`flex-wrap: nowrap` on
  that row, or the kit's spelling of it if there is one), and the selector is
  `flex: 1 1 auto; min-width: 0` so it takes what the randomize button leaves.
  ⚠️ `min-width: 0` or the picker's own `--pick-w` of 22ch (`:696`) keeps the
  row from shrinking and the button falls off the edge instead of the picker
  giving way.
- ⚠️ At 375 the row is 301 px wide inside its inset. A 22ch picker plus a
  button is wider than that, which is exactly why it wraps today. The width the
  picker ends up with at 375 is a number the report carries.

### Done 2026-09-29: knobs, panic should stop the audio as well as the notes

✅ **DONE, `a8b3d5b`.** `panic()` posts `{ cmd: 'reset' }` to the playout, which
empties the ring and re-arms the prebuffer. **THE RESET GOES AFTER `note.panic`**:
emptying the ring buys exactly one cushion of silence, and that silence is only
worth having if the board is stopping during it, so the message that stops the
board leaves first. ⚠️ **AND THE COMMENT SAYS WHAT THE ORDER DOES NOT DO**: the
two statements are microseconds apart and `board.send` is one synchronous socket
write, so the order states an intent rather than fixing a race.
🔴 **THE LOG LINE IS FOUR CASES NOW, NOT ONE.** `note.panic` goes only when the
page is armed, so a page listening while somebody else drives the board drops its
own cushion and hears the sound come straight back. That branch reads **"stopped
here only"** at `warn` and says the sound will be back in a moment. **The word
`stopped` alone is reserved for the branch where the message actually left.**
**40 to 41 asserts, 34 to 35 page.** The new one requires that the page posted the
reset exactly when there was a node to post it to, and, when the far side can
speak, that the worklet's own `played` counter FELL, which is a number that only
ever grows except through a reset.
🔴 **WHAT COULD NOT BE MEASURED, IN THOSE WORDS: NO REAL AUDIO WAS FLOWING, SO
NOBODY MEASURED THAT A REAL SOUND STOPPED.** Without `?board=1` the page never
calls `startAudio()`, so a harness run has no context and no playout node at all.
The far side branch grades only on `?board=1` with a live board and **has never
run on this desk**. The guard branch is what is graded today.
⚠️ **`ctx.suspend()` WAS PRICED AND REFUSED, AND THE PRICE IS HIGHER THAN
EXPECTED.** The gesture rescue that would bring a suspended context back REMOVES
ITSELF the moment the context reaches `running` (`board.mjs:299`), so suspending
here would make the page log *"tap anywhere and it will start"* with nothing
listening for a tap. That is the exact defect `board.mjs:306` records fixing.
⚠️ **AND THE FOUR REDS ON THE BEFORE RUN WERE ALL PRE-EXISTING.** Two are the
standing board ones, and one of those is STRUCTURAL rather than the board being
off: *this page makes no sound of its own* asserts a context and a playout exist,
and `runChecks()` only reaches `startAudio()` behind `?board=1`, so it is red on
every plain run by construction. Two more about the wheel and the arrow key came
back green on the after run with nothing touched near them, and the agent claimed
no credit for it.

ASKED, VERBATIM: *"knobs: panic should stop audio"*. One page,
https://positron.studio/knobs/.

**NOT STARTED.**

**What panic does today**, `demo/knobs/index.html:1157`: it stops both invisible
hands, sends `note.panic` to the board when `MAY_PLAY && armed`, homes the two
rotaries to where they opened, calls `kb.panic()` and logs *"stopped: every note
released and both rotaries back where they opened"*. **Every one of those acts on
the SOURCE. Not one of them touches the sound already on its way here or already
in the page.**

🔴 **SO THE PAGE GOES ON MAKING NOISE AFTER A CONTROL THAT SAYS STOP**, and the
cushion is the measured size of it: `createBoard` runs a **160 ms** floor on this
page, raised from 100 on 2026-09-16 after *"some vobbly sound, cutoffs, not
nice"*. That is a sixth of a second of sound that is already in the ring when the
button is pressed, and it plays out whatever the board does next.

✅ **THE INSTRUMENT FOR IT EXISTS AND THE PAGE CAN REACH IT.**
`proto/jam/playout-worklet.js:108` takes `{ cmd: 'reset' }`, which drops the ring
(`rd = wr = buffered = 0`) and re-arms the prebuffer, and `board.playout()`
returns that node to any page holding a board. **So this is a page change and
`demo/shell/` need not be touched.**

🔴 **BUT `reset` ALONE IS NOT *STOP AUDIO* AND THE DIFFERENCE MATTERS.** It
empties what has arrived. It does not stop what is still coming: frames keep
landing, the prebuffer re-arms, and sound returns a cushion later **if the board
is still sounding**. What makes it quiet and keep quiet is `note.panic` reaching
the board, which panic already sends. **So the two halves are a pair**: the
message stops the source, the reset throws away the sixth of a second already
past it.
⚠️ **AND THERE IS A CASE WHERE ONLY ONE HALF FIRES.** `note.panic` goes only when
`MAY_PLAY && armed`. An unarmed page that is listening to somebody else driving
the board would drop its cushion and hear the sound come straight back. **That is
honest behaviour and the log line must not claim otherwise**, because the page
cannot silence an instrument it is not allowed to write to.
⚠️ **`ctx.suspend()` IS THE OTHER CANDIDATE AND IS THE BIGGER CLAIM.** It
silences everything until something resumes it, and `board.mjs:274` records that
`resume()` is fired **exactly once, inside `startAudio`**, so a suspended context
has no obvious way back on this page. Price it, do not drift into it.

**And the log line is part of the change.** *"stopped: every note released and
both rotaries back where they opened"* will be describing two of three things.

### Done 2026-09-29: nola, rm A WAY HOME

✅ **DONE, `b4c5446`.** The block, its table, its draw function and its three
pieces of state, three callers, one selector, a height measurement and the last
clause of the description. **`createTable` went with it**, because those four
rows were this page's only table and the import would have matched nothing.
🔴 **THE RESERVE WAS NOT HOLDING THE KEYBOARD STILL, WHICH IS WHAT ITS OWN
COMMENT CLAIMED.** MEASURED before the cut: the block sat at **y743.8 as the LAST
child of the body**, against the keyboard at **y239.5**. It was BELOW the keys.
Taking it out moves the keyboard **0.0 px at 1280**. The log, the diagram and the
footer come up 225.6 px and nothing a hand is on moved.
🔴 **AND THE 20.2 px THE KEYBOARD RISES AT 375 IS THE DESCRIPTION, NOT THE
BLOCK.** The body's own top went 196 to 175.8 at 375 and did not move at 1280,
and the paragraph measures 20.27 px a line, so the cut clause dropped one wrapped
line on the phone and none at the desk. Two causes, separated rather than added.
**107/107 with 101 page asserts to 104/104 with 98**, and the grep agrees, 99 to
96. Three asserts left, all three about the way home; the fourth graded *both
halves of the offer* on two takes and grades the surviving half on exactly one,
because zero is a take built and never handed over.
⚠️ **`routeTo` IS NOW PAGE-LESS AND KEEPS ITS WHOLE TEST.** `suggest-test.mjs`
calls it at nine places and reads **44 ok, 0 failed**, run to prove the claim
rather than assert it. Neither kit file was touched.
⚠️ **AND IT WAS DRAWING A HEADING AND A COLUMN HEADER OVER FOUR PERMANENTLY EMPTY
ROWS** on every visit, for anybody who never played two chords. That goes too.

ASKED, VERBATIM: *"rm A WAY HOME"*. One page, https://positron.studio/nola/.

**NOT STARTED.**

**It is a whole block, not a control.** `demo/nola/index.html:1492` builds
`homeWrap`, `:1493` the heading `A WAY HOME`, and `:1494` a `createTable` under
it with a `chord` and a `numeral` column and `minRows: 4`. `drawHome()` at
`:2246` fills it from `routeTo`, and the heading rewrites itself to `A WAY HOME
TO <chord>` when a route lands.

**What it touches, counted rather than remembered:** the construction, the
`drawHome` function and its `lastHome`, `homeRedraws` and `saidHome` state, its
callers, the `.nola-home` and `.nola-home-h` rules near `:4912`, a height
measurement at `:4243`, the `ONE` string at `:350` which says *"and a four chord
way home it works out from them"*, and **four asserts**: `:4428`, `:4524`,
`:4537` and `:4554`.

🔴 **THE DESCRIPTION LOSES A CLAUSE AND THAT IS THE SAME COMMIT.** `ONE` at
`:350` is the page's `what` and the manifest's `one`, and it names the way home
in its last clause. A description that promises a block the page no longer has
is worse than a missing one. **Cutting the clause takes the sentence back
towards the one sentence rule rather than away from it.**

⚠️ **`routeTo` STAYS IN THE KIT.** It lives at `demo/shell/suggest.mjs:908` and
is graded by `demo/shell/suggest-test.mjs` at `:427` and `:466`. After this,
**no page calls it** and its test still does. Removing a tested kit function on
one page's ask is a bigger claim than the ask makes, so it stays and this line
is the record that it is now page-less.
⚠️ **AND `plans/plan-better-chords-2026-09-25.md` IS NOT TOUCHED.** A plan
records what was decided when it was decided, the same rule that keeps `archive/`
spelled the old way.

### Done 2026-09-29: nola, rm the label from the chord input field to avoid a content jump

✅ **DONE, `dd7a8fe`. THE CAPTION WAS THE JUMP.** MEASURED at 1280 with a CDP
probe pressing the mode chooser both ways: `.nola-top` went **50.5 to 34** and
the keyboard under it moved **16.5 px** every press, which is `.pos-field-l`
measuring 9.5 px plus the field's own 7 px `row-gap`. **After: 0.0 px.** At 375
the wrap means the jump goes 66.5 to 50.0 and is not cured, which has an entry
of its own above. The accessible name moved onto the input and reads back as
`role=textbox name="chords"`, `grow: 'grow'` went with the caption because
there is no such rule anywhere, and the comment claiming the row does not
collapse was wrong for as long as it stood.

ASKED, VERBATIM: *"nola: rm label from chord input field tpo avoid content
jump"*. One page, https://positron.studio/nola/.

**NOT STARTED.**

**The field is `demo/nola/index.html:1085`**, `createField({ label: 'CHORDS',
value: 'Cmaj C9 F/C Fm6/C', placeholder: 'Cmaj C9 F/C Fm6/C', grow: 'grow' })`,
and it sits in `.nola-top` next to the mode chooser.

✅ **DROPPING THE LABEL NEEDS NO KIT CHANGE AND REACHES NO OTHER PAGE.**
`demo/shell/field.mjs:73` reads `if (label) wrap.append(el('span',
'pos-field-l', label))`, so a field with no label is already a supported shape.
The other five call sites (`crate`, `fau`, `items`, `kit`, `stage`) all pass one
and are untouched.

🔴 **THE JUMP HAS TO BE IDENTIFIED BEFORE IT CAN BE CALLED FIXED, AND THE PAGE
ALREADY CARRIES A COMMENT SAYING THERE IS NO JUMP.** `demo/nola/index.html:4866`
says *"THE MODE AND THE FIELD IT TURNS OFF ARE ONE ROW ... AND THE ROW DOES NOT
COLLAPSE WHEN THE FIELD GOES, because `.pos-choice` keeps its own height and the
field was the only thing that grew"*. The mechanism is real: `:2604` does
`chordField.el.remove()` on `Played` and `:2605` appends it back, and `.nola-top`
is `display: flex; align-items: flex-end; flex-wrap: wrap` at `:4873`. **So
either that comment is stale or the jump the ask names is a different one.**
Measure the row's height and the top of the block under it in BOTH modes at 1280
and at 375 before touching anything, and say which number moved.
⚠️ **THE LABEL IS WORTH ABOUT 17 px OF ROW HEIGHT**: `.pos-field` is a column
with `gap: 7px` and `.pos-field-l` is a 10 px uppercase line. If the row's height
is being set by the field in one mode and by the chooser in the other, that is
the jump, and removing the label is the cure rather than a cosmetic change.

🔴 **THE WRAPPER IS A `<label>` ELEMENT, SO THE ACCESSIBLE NAME GOES WITH THE
SPAN.** `field.mjs` builds `el('label', 'pos-field ...')` and the input is inside
it, so today the input is named by the word CHORDS and by nothing else. **The
placeholder is character for character the value**, `Cmaj C9 F/C Fm6/C`, so it
carries no name either. One `aria-label` on `chordField.input` keeps the name
with no visible line, and that is the form to use rather than shipping an unnamed
text box.

⚠️ **AND THE CALL PASSES `grow: 'grow'`, WHICH IS NOT A CLASS THIS PROJECT HAS.**
`field.mjs` documents `wide` or omitted, `shell.css` has `.pos-field.wide` and no
`.grow` rule at all, and every other call site passes `wide`. It is inert
because `:4874` sets `.nola-top .pos-field { flex: 1 1 220px }` directly, so
this is a dead argument rather than a defect. Found while reading the call, not
asked for. Drop it in the same edit or leave it, but do not pretend it does
something.

### Done 2026-09-29: muta, full content width at the desk, the knobs group centred, Test tone to the right

✅ **DONE, `0f617fb`, ALL THREE HALVES.** MEASURED at 1280: the panel went
**296..821 to 296..984**, which is the report's own left and right edge to the
digit. **The centring threshold is derived, not picked**: the group is 483 px in a
row that spends `--rows-pad` at each end, so the client is the window less 42, and
the first width at which the group stops fitting is **525**. The floor is the 561
this sheet already has. MEASURED at four widths, NOTHING CLIPS: the first grid
moves 317 to 398.5 at 1280 and does not move at 560, 480 or 375, where the row
still scrolls from its own inset with `scrollLeft` 0. Centred on the INK, 98.2 px
either side. Test tone took the cheap reading and is 201.5 px further right at
756, 8.0 px from the picker against a row gap of 8.0.
🔴 **FOUR ASSERTS WERE REWRITTEN AND THE SECOND CASUALTY WAS NOT PREDICTED.**
Besides the width claim, *"the row insets the rotaries' ink equally on all three
sides"* compared the first dial's left gap against its top and bottom, **36.7
against 37.0 before and 98.2 after**. It is a centring claim now with
`scrollWidth <= clientWidth` as its negative half, so a scrolling row can never
also read as a centred one. **ANYBODY APPLYING `full: true` TO `fau`, `knobs`,
`shape` OR `tom` SHOULD EXPECT THE SAME CASUALTY.**
49/49 before and after, 43 page asserts, closed a second way because the before
line was lost: `grep -c "d.assert("` reads 41 at HEAD and 41 in the tree. The
phone pays 3 px at exactly 560 and nothing at 480 or 375.

ASKED, VERBATIM: *"muta: full content w in deskop, center the knobs group. align
test tone to right."*. One page, https://positron.studio/muta/.

**NOT STARTED.**

🔴 **THIS ANSWERS THE DECISION THAT WAS WAITING, AND IT ANSWERS IT THE OTHER
WAY.** The entry below (*"muta, the Test tone button fills the phone (DONE) and
the knob grid has nothing to centre in (REFUSED, one decision waiting)"*) asked
whether the panel should CENTRE in the page with `margin-inline: auto`, 525 px in
a 688 px body. **The answer is no: the panel takes the whole content width
instead, and the knobs centre inside it.** That entry's waiting decision is
closed by this line and nothing is left hanging there.
⚠️ **AND IT TAKES THE SHAPE THAT WAS PRICED AND REJECTED YESTERDAY, ON PURPOSE.**
`full: true` was refused in writing with the words *"plainly awful"*, four knobs
floating in a 660 px band, which is `positron-compose`'s own phrase. **What makes
it different now is the second half of the ask**: the objection was to a wide
panel with its content stranded at the left, and centring the knobs group is
exactly the arrangement that objection assumed nobody would write. The refusal
was about an unfinished version of this. It is still worth a LOOK at 1280 with
`node demo/shot.mjs muta 1280` before it is called done, because the band is real.

**Three halves, and they are three different files' worth of decision.**

**One, full content width at the desk.** `full: true` on
`createInstrumentPanel` at `demo/muta/index.html:742` is the kit's existing
spelling and it passes straight through to `createGlueRows`. **MEASURED
yesterday: the panel is `fit-content` at 525 px inside a 688 px body, with all
163 px of the slack on the right.** `.plai-panel` also carries page CSS that may
be assuming the shrink-wrap, so read it before adding the flag.
⚠️ **AT THE DESK is in the ask and matters.** At 375 px there is no slack at all,
so `full` must not change the phone, and the phone is where the plate row and the
Test tone button both already have rules of their own at 560 and under.

**Two, the knobs group centres.** `.plai-knobs` holds TWO `createControlGrid`
surfaces (`cols: 2` at `:520` and `cols: 3` at `:537`), and *the knobs group* is
the wrapper rather than either grid, so both move together as one block.
🔴 **A PLAIN `justify-content: center` IS THE TRAP AND IT IS MEASURED.**
Yesterday's live test read **0.0 px of movement at 1280 and 560, then -1.5 at 480
and -54.0 at 375 with `scrollLeft` clamped at 0**, which is 91 px of the 2 by 2
group off the left edge and unreachable, because inline-start overflow inside
`overflow-x: auto` is clipped permanently. The 0.0 px readings were taken with the
panel still `fit-content`; the first half of this ask is what gives the row
something to centre in, so those two numbers change and the -54.0 does not.
**So the centring has to be confined to where there is room**, either by a
`min-width` query above the phone block or by `justify-content: safe center`.
⚠️ **`safe center` IS A CANDIDATE AND NOT A FACT YET.** Nothing in this
repository uses it, its whole point is that it falls back to `start` instead of
overflowing, and browser support has to be read rather than assumed. Check it,
and if it is not safe on every engine this project verifies, use the query.

**Three, Test tone aligns right.** The button is the plate row's `status`, so it
is INSIDE `.pos-ipanel-name` (`shell.css:1094`), the start cluster that holds the
nameplate. **The row is two ends: the name cluster at the start and the patch
picker at the end.**
🔴 **SO *RIGHT* IS AMBIGUOUS AND THE TWO READINGS ARE DIFFERENT COMPONENTS.**
Either the button pushes to the right of its own cluster or of the row, which is
a `margin-inline-start: auto` and stays page scoped, **or** it leaves the start
cluster for the far end, where the picker already is by construction and where
`instrument-panel.mjs:250` THROWS if a `.pos-pick` is handed in as `status`. The
second reading means a third slot on a kit component that reaches six pages. **Do
the first unless it looks wrong in a shot**, and say which was done.
⚠️ **AND IT COLLIDES WITH THE GENERAL ASK BELOW.** The phone rule landed
yesterday keeps the Test tone INSIDE the centred name cluster on purpose, because
a centred word with a button hanging off it is the nervous almost-the-same
`positron-compose` refuses, and the next entry moves that whole cluster to the
bottom of the row. **Whatever is written here must not reach the 560 block**, and
the two asks have to be looked at in one shot at 375 before either is called
done.

⚠️ **NOTHING HERE IS GRADED BY A HARNESS AT PHONE WIDTH** and `muta` reads
**49/49 with 43 page asserts** today. The desk half IS gradable: the panel's own
assert says *"the instrument starts where the rest of the page does and is as wide
as its widest row"*, and the second clause of that stops being true the moment
`full: true` lands, so that assert is rewritten in the same commit rather than
left to go red.

### Done 2026-09-29: the instrument panel's nameplate goes to the bottom of the plate row on a phone

✅ **DONE, `d52b714`, ONE DECLARATION INSIDE THE EXISTING 560 BLOCK**: `order: 1`
on `.pos-ipanel-plate > .pos-ipanel-name`. MEASURED at 375 on all six pages that
build a plate: `/muta/`, `/fau/` and `/knobs/` put the far end control at the
name's old top TO THE PIXEL (586.8, 777.7 and 457.2), and `/shape/` and `/tom/`
do not move by a hundredth, because a plate with no `status` and no `patch`
control has no `.pos-ipanel-name` for the selector to match. **The one child case
is a no-op by absence, measured rather than assumed.** Desktop computes `order: 0`
and is untouched.
⚠️ **NO HARNESS ON THIS SITE ENTERED THAT BLOCK AND NONE CAN.** The six pages pass
every assert whether this works or not. The shots and the table above are the only
evidence there is.
⚠️ **TWO THINGS CAME WITH IT AND BOTH HAVE ENTRIES ABOVE**: `/muta/`'s cluster
wraps so the name is not literally last, and `order` moves the paint and not the
tab stop.

ASKED, VERBATIM: *"general: intrument panel: nameplate is the lowest of the
bottom components in mobile"*. **SHARED WORK**: it reaches `fau`, `knobs`,
`muta`, `shape`, `tom` and `kit`, so it is done ONCE, by one agent, BEFORE any
page agent starts.

**NOT STARTED.**

**Where it is.** The plate is already the LAST row of the panel at every width:
`ROW_KINDS` in `demo/shell/instrument-panel.mjs` puts it last and `addRow`
inserts before it. **What the ask is about is the order INSIDE that row once it
wraps**, which is `shell.css:7421` onward, the `@media (max-width: 560px)` block
that landed yesterday.

**What a phone draws today.** The plate row is a `.pos-rows-r`, a justified row
with two ends: `.pos-ipanel-name` (the nameplate and its `status` control) at the
start, and the patch picker at the end. **MEASURED yesterday at 375: `/muta/`
draws the name with `Test tone` on line one and the picker on line two.** So the
nameplate is the TOP of that stack and the ask wants it the BOTTOM.

**The cheap form is one declaration**, `order: 1` on
`.pos-ipanel-plate > .pos-ipanel-name` inside the existing 560 block, which puts
the picker above the name and leaves every desktop width untouched. A plate with
no picker and no status has one child in that row, so ordering it does nothing
and those pages cannot regress.
⚠️ **READ THE ASK'S PLURAL BEFORE WRITING THE ONE LINE.** *"the lowest of the
bottom components"* may mean only the plate row's own members, which is the
`order` above, or it may mean the nameplate sits below everything at the foot of
the panel including the keyboard's own foot row on the pages that have one
(`nola`, `kit`). **The plate is already below the keyboard**, so if that is the
reading then part of this is already true and the answer says so rather than
inventing work.

🔴 **AND THE `status` CONTROL GOES WITH THE NAME, WHICH IS WHY THIS IS NOT
OBVIOUS.** `shell.css`'s comment for that block says in writing that the controls
on the row go with the name rather than staying put, so `/muta/`'s `Test tone`
centres as one block with `PLAITS`. **An `order` on the cluster moves the button
to the bottom too.** That is either right or exactly what the muta ask above is
fighting, so the two are decided together and photographed together at 375.
⚠️ **IF THE BUTTON HAS TO STAY UP WHILE THE NAME GOES DOWN, THE CLUSTER HAS TO
SPLIT**, which is a change to what `.pos-ipanel-name` IS on six pages and is a
much bigger thing than one `order` line. Price it, do not drift into it.

⚠️ **NO HARNESS ON THIS SITE CAN SEE ANY OF IT.** `demo/verify.mjs` runs at
756 px with no viewport override, so all six pages will pass every assert whether
this works or not, and `/kit/`'s narrow specimens are narrow BOXES at desktop
WIDTH, which a media query cannot read. The instrument is `node demo/shot.mjs
<slug> 375` on all six, which is what yesterday's centring was checked with. This
is the third phone-only change in two days with nothing grading it, and the
entry about that is already open below.

### Done 2026-09-29: shape, the sends-to chooser justifies right, its label goes, and the hand leaves the segment group

✅ **DONE, `ff56973`, ALL THREE HALVES, AND THE ROW IS `space-between` OVER TWO
CHILDREN RATHER THAN THREE.** Taking the hand out of the chooser would have made
`.shape-bar` a three child row, and `space-between` parks a middle child wherever
its neighbours leave it, so the chooser and the glyph are one group at the far
end. MEASURED: the bar is 688.0 px against 466.2 of control, so 221.8 px of slack
is real, and the glyph is flush with the panel below it against 161.48 px off
before. **THE CAPTION IS WHAT KEEPS THE SPLIT SAFE**: captioned, `.pos-choice` is
47.5 px tall at 375 and a centred neighbour lands 6.75 px high, which is the
2026-09-28 report exactly; with no caption it is 34.0 and the tops read 0.00 at
375, 756 and 1280. The seam reads +10.00 against the row's own rendered column
gap, the square holds at five widths on the global glyph rule, and the dead
`.pos-choice button.shape-hand` went with the join. **55/55, 49 page asserts,
unmoved**: two claims that the join exists left and two arrived. The `what` line
was deliberately NOT changed and the reasoning is in the page.

ASKED, VERBATIM: *"shape: sents to right align (justify), rm label, invisible
hand is a separat e button not a radio group"*. One page,
https://positron.studio/shape/.

**NOT STARTED.**

🔴 **THIS UNDOES YESTERDAY'S JOIN, WHICH WAS ITSELF A REPORTED FIX, AND THAT IS
THE THING TO GET RIGHT RATHER THAN TO ARGUE WITH.** `c61c2f2` made the glyph the
chooser's LAST SEGMENT after *"fix invisuble hand button"*, and this ask takes it
back out. **What the before state actually looked like is measured and is in the
file**, `demo/shape/index.html:1596` onward: the square stood **10.00 px clear of
`Session` wearing a full ring of its own at 375, 756 and 1280**, and at 375 it
also sat **6.75 px ABOVE the options**, because `.pos-choice` puts its label on
top at that width and a neighbour centres itself on the label and the segments
together. **So a bare revert reproduces a defect a person reported with a
screenshot.**
✅ **AND THE SECOND HALF OF THIS ASK IS WHAT REMOVES THAT.** With no label there
is no label for a neighbour to centre against: `shell.css:2725` makes
`.pos-choice` a one column grid on a phone and `:2726` is what puts the caption on
its own line. **Dropping the caption kills the 6.75 px, not by a new rule but by
taking away the thing that caused it.** MEASURE it at 375 and say the number,
because that is the half the person saw and no harness on this site runs there.

**Three halves, one row.** `.shape-bar` at `demo/shape/index.html:65` is
`display: flex; gap: 10px; align-items: center; flex-wrap: wrap` and holds THREE
children: the Circuit status button, the chooser, and the hand.

**One, *sents to right align (justify)*.** `sents to` is the label string itself,
`label: 'sends to'` at `:500`, so the ask names the chooser by its caption and
asks where the CONTROL goes. **The reading that fits the row is
`justify-content: space-between` on `.shape-bar`**: the status stays at the left
edge and the chooser with its glyph goes to the right edge, which is what
*justify* means on a flex row and what *right align* looks like when there are
exactly two ends. The sketch this row was built from is
*"[circuit connected] [Synth1|Synths] [⇄]"*, so nothing about the ORDER changes.
⚠️ **THE OTHER READING IS `justify-content: flex-end` ON THE WHOLE ROW**, which
would take the status button right as well. **Confirm before writing it if the
shot looks wrong**, and say which was done.
⚠️ **AND THE ROW WRAPS.** At 375 these three already wrap, so whatever is written
has to be looked at there too: a `space-between` row that wraps puts one child
per line and the justification does nothing, which would read as the ask having
been ignored.

**Two, the label goes.** `demo/shell/choice.mjs:94` is `if (label)
wrap.append(...)`, so a chooser with no caption is already a supported shape and
this reaches no other page. **It carries no aria wiring**: the span is visible
text and nothing points at it, so there is no accessible name to lose and none to
replace. What IS lost is the only words on the page saying what the three
segments do, so **read the page's `what` line in the same edit** by the standing
rule that a change in what a page does is a change to what it says.

**Three, the hand is a separate button and not one of the options.** This is the
right instinct written down twice already: the segments are `aria-pressed`
buttons standing in for a radio group, `choice.mjs` calls that a real gap left
alone on purpose across eleven call sites, and `BACKLOG.md`'s own open entry about
a `trailing` slot flagged *whether an action inside a row of options announces
correctly* as **reasoned and never measured, with no screen reader on it**. An
action that is not an option should not be in the group. ✅ **SO THAT OPEN ENTRY IS
ANSWERED BY THIS ASK AND WANTS NO `trailing` OPTION**, and it is marked so below.
✅ **THE SQUARE SURVIVES THE MOVE.** `button[data-glyph="1"]` at
`shell.css:4749` is global and has been since 2026-09-25, so the 34 px square and
the existing assert on it do not depend on the button being inside `.pos-choice`.
🔴 **AND ONE PAGE RULE DIES WITH THE JOIN.** `.pos-choice button.shape-hand {
flex: none; padding: 0 }` at `:82` exists ONLY because the button was a child of
`.pos-choice`, and a selector that matches nothing is this project's cheapest
recurring defect. **Delete it in the same commit** and keep the reason in the
comment above it rather than the rule.

🔴 **TWO ASSERTS GO OR CHANGE, AND THE COUNT WILL DROP.** `shape` reads
**55/55 with 49 page asserts** today, having gone 53 to 55 yesterday when the
join landed. The two that arrived are *the hand is joined to the chooser rather
than standing beside it* (`:1615`, reading the overlap against `.pos-seg`'s own
rendered `-1 px` pull) and *the joined row rounds only its outer corners*
(`:1635`). **Both are claims that the join exists**, so both are false by design
after this. Replace them rather than deleting them: what is worth grading is what
the person actually reported, which is that the glyph does not stand off on its
own axis. **A top-alignment assert between the hand and the last option survives
the split and is the honest heir**, because the 6.75 px was the invisible half.
✅ **THE ORDER AND ONE LINE ASSERT AT `:1589` STAYS TRUE** and gets stronger: it
reads left edges ascending on three rects, and with the glyph outside the chooser
its left edge is a layout fact again rather than one true by construction. Its
comment says exactly that, so the comment is rewritten too.
⚠️ **AND THE HARNESS ROW ASSERT AT `:1558` MUST STAY GREEN**: the hand has to
remain out of `.pos-controls button, .tbar-x`, which is the one thing yesterday's
move had to not break and which this one must not break either.

### Done 2026-09-29: pack, the sample player loses its transport and the waveform's border, and becomes a glued panel

✅ **DONE, `5bf144b`, AND THE BORDER HALF WAS `d52b714` BECAUSE THE RING WAS
PAINT.** CONFIRMED HERE WITH A NEGATIVE CONTROL rather than a computed style,
which was green the whole time the ring was on screen: the canvas's outermost
pixel ring reads **0 of 1560 as `--line` as shipped, and 1560 of 1560** with the
deleted `strokeRect` painted back from the page.
🔴 **THE GREYED PLAY BUTTON WAS DOING A SECOND JOB** and it has a visible home
now: a third row of the glued panel, mutually exclusive with the picture, reading
`this one cannot be played here` or `this file did not read` in `--bad`. MEASURED
on a 6 channel file and a bad header: 49.25 px with a 1.00 px seam, the picture's
row to `display: none`, and the words CLEAR rather than linger when a good file
opens.
⚠️ **THE BRIEF WAS WRONG ABOUT `createGrainScope` TAKING A `reason`.** It has no
`set()` at all; `reason` is `synth-view.mjs`'s, which `/muta/` uses and this page
does not import. The agent measured that rather than arguing with it.
⚠️ **AND `.pk-wave` IS THE ROW'S CLASS NOW, FORCED BY A MEASUREMENT**: `shell.css`
zeroes a glued scope's margin one level deep, and a wrapper would have put the
scope three levels down and restored the 22 px inset removed from this page on
2026-09-22. The picture row measures 102 px, identical to before.
31/31 before and after, 25 page asserts, and `grep -c` went 65 to 62. **Loop and
the dark branch both have entries of their own above.**

ASKED, VERBATIM: *"pack: sample player: rm transport below waveform [screenshot]
rm border around waveform. use glued panel"*. One page,
https://positron.studio/pack/, the SAMPLES tab. **WITH A SCREENSHOT**, showing
`slot 20` over a seam, a waveform inside a box with its own ring, another seam,
and the transport's rounded play button under it.

**NOT STARTED.**

**What is there today.** `demo/pack/index.html:845` is
`panel('samples').append(createGlue(sampleTable.el, waveHost, player))`, three
glued parts: the table, the picture, and a `createTransportBar` under it. The bar
is built at `:754` with `publish: false`, a `command` of play, pause and seek, and
a `loopSlot` holding the `Loop` toggle.

**One, the border, and THIS IS THE SECOND TIME IT HAS BEEN ASKED FOR.** The page's
own comment at `:38` records 2026-09-22, *"rm padding and its border around
waveform canvas"*, and says the padding came off. **The border did not.** The
reason it survived is that it is not on this page: `.pos-scope-c` at
`shell.css:3006` carries `border: var(--edge); border-radius: var(--r)` and there
is exactly one rule for that class in the whole stylesheet. The page removed what
it owned and the kit kept drawing the ring.
🔴 **SO THE FIX IS IN `shell.css` AND IT MUST BE SCOPED, WHICH THE KIT ALREADY
SAYS IN WRITING.** The block above it (*"A GLUED SCOPE DRAWS ONE BORDER, NOT
TWO"*, 2026-09-21, reported against this page and `/radio/` together) ends with
**⚠️ THE BORDER STAYS WHERE THERE IS NO GLUE**: a scope bare on a page has
nothing else drawing its edge, and `/grains/` puts one inside a card whose ground
is `--card` too, so a global removal dissolves the picture into its background.
**The form is a glued-scope selector**, and it has to be BOTH direct and one
level deep, `.pos-glue > .pos-scope-c` and `.pos-glue > * > .pos-scope-c`, for
the reason the same block records: `/radio/` glues the scope straight in and
`/pack/` wraps it, and a direct-child selector fixed one page and left the other
exactly as reported. **SHARED WORK, so it is done once and first**, and the
pages to look at after are `pack`, `radio`, `tapes` and `grains`.

**Two, the transport goes.** It is the third glued part. **The page stays
playable without it**: `:675` is `onPick: (r) => openSample(r.i, true)` and
`:1917` plays on the press, so a row press is what sounds a sample and always
was. **What goes with the bar is stop, seek and Loop.**
🔴 **`Loop` WAS ITSELF AN ASK AND IT DIES WITH THE BAR.** 2026-09-21: *"move
sample player below table, add loop"*, and the toggle lives in the bar's
`loopSlot` at `:756`. **Confirm whether Loop goes or moves.** A control asked for
by name leaving the page without a word is the shape this file exists to stop.
Nothing else on the page can loop a sample: `looping` is one boolean on the
running `AudioBufferSourceNode` and the page's own comment explains why
`looper.mjs` is the wrong module for it.
🔴 **AND THE PLAY BUTTON IS CARRYING A SECOND JOB NOBODY WOULD GUESS.**
`:1890` is `playBtn.disabled = !mono.ok`, which is **the page's only visible way
of saying that a file cannot be decoded**: a 24 bit or surround WAV opens, draws
nothing, and the greyed button is what says so. **Two asserts read exactly that**,
`:2429` and `:2453`, both comparing a rejected file against `Kick.wav`. With the
bar gone the signal has to be somewhere else, and the log already says why in
words (`:1914`), so the honest replacement may be a readout cell or the row
itself. **Decide it rather than letting two asserts quietly become untestable.**

**Three, *use glued panel*.** The tab is glued ALREADY, with `createGlue`, so the
ask is about which surface: **`createGlueRows`, the panel the instrument pages
build with** (`kit`, `knobs`, `muta`, `shape` call it), which adds rows one at a
time and owns their inset and alignment through `pad`, `align`, `full` and
`grid`. That is what *panel* means everywhere else on this site now, so it is the
reading I will take unless you say otherwise.
⚠️ **THE OTHER READING IS `createInstrumentPanel`**, which is `createGlueRows`
plus a picture row, control rows and a nameplate at the foot. **There is no
instrument here and no name to put on a plate**, so it would be a foot bar
carrying a word this tab does not have. Priced, and not what I will write.
⚠️ **AND EVERY GLUED PART PAINTS ITS OWN GROUND**, which this page has paid for
three times and says so at `:28`: `.pos-glue` is `gap: 1px` over a `--line`
ground, so a part with no background of its own lets that colour through its
whole area and the seam stops being a seam. Whatever the new surface is, the
picture's host keeps `background: var(--card)`.
🔴 **`.pk-player` AT `:55` DIES WITH THE TRANSPORT** and must go in the same
commit. `.pk-bar` at `:57` STAYS: that is the SESSIONS tab's own bar and this ask
is about the samples tab. A rule with nothing matching it reads as correct
forever, which this page's own comment at `:22` already records about `.pk-line`.

⚠️ **THE ASSERT COUNT WILL MOVE AND THE DIRECTION IS DOWN.** Besides the two
above, `:2967` measures the glued block as three real rects (*"the player"*, the
picture and the bar, each drawing its own ground against the glue's), `:3063` and
`:3080` press `loopBtn` and read its colour, and `:2929` calls `playSample(0)`.
Every one of those is a claim about a control that is leaving. **Rewrite them to
the new shape rather than deleting them**, and report the before and after count,
which is the reading rather than the colour.

### Done 2026-09-29: twelve, the nameplate's air above it matches its air to the right

✅ **DONE, `f63278f`. THE BOXES WERE ALREADY EQUAL, SO IT HAD TO BE DECIDED ON
INK.** Every number a stylesheet sets read 14 and 14 on both edges, so a rect only
check would have been green the morning it was reported. MEASURED with a canvas
probe at 1280: the ink sat **34.84 px** below the lane's inner top edge against
**16.47 px** inside its right one. After: **14.84 against 16.47, 1.63 apart**, and
the residual is leading over the cap against trailing letter spacing plus the last
glyph's side bearing. `text-box: trim-both` would make it WORSE, measured at 2.47,
because it only trims the top. **What owned the air was the kit putting
`var(--panel-pad)`, 20, over a plate in a lane that insets by 14**, which has its
own entry above. 38/38 to 39/39, and the new assert was proved by putting the
20 px back: one red, the ink half firing while the box half stayed green.

ASKED, VERBATIM: *"adjust nameplate to model name top padding is same as right
padding"*, **WITH A SCREENSHOT** of the master lane: `MODEL 12` flush right with
a wide band of air above it, the `F2 F3 F4` row under it, and the `JOG` knob and
its two shuttle buttons below that. One page, https://positron.studio/twelve/.

**NOT STARTED.**

**Where it is.** `demo/twelve/index.html:744` is `createNameplate({ lines:
['MODEL 12'], place: 'end' })`, and it is the master lane's FIRST child.
`.rack-lane` at `:128` is `align-items: center; gap: var(--ctl-gap); padding:
14px`, **so the right number in the ask is 14 px** and the plate reaches it by
`margin-left: auto`, which is written down at `:1371` after that assert read the
wrong yardstick once.

🔴 **THE FIRST JOB IS FINDING OUT WHICH BOX OWNS THE AIR ABOVE IT, AND IT IS NOT
GUESSABLE FROM THE SCREENSHOT.** The plate is the lane's first child, so the
lane's own `padding: 14px` is already the top inset, and the picture shows far
more than 14 px. **So the extra comes from somewhere else**: the plate's own box,
`.panel-plate-l`'s line box, or a margin the component carries.
`node demo/ancestry.mjs twelve '.panel-plate' padding-top` and
`node demo/which-rule-won.mjs twelve '.panel-plate' margin-top` answer it in two
commands, and both tools exist for exactly this. **Do not write a fourth override
before running them.**

🔴 **AND THE TWO NUMBERS THE ASK COMPARES ARE NOT THE SAME KIND OF NUMBER, WHICH
IS THIS PAGE'S OWN LESSON ONE ROW DOWN.** `.rack-lane .pos-knob` at `:151`
carries it in writing: *"THE ROW GAP IS MEASURED BETWEEN BOXES AND THE EYE
MEASURES BETWEEN INK"*, and that rule doubles a knob's top gap for precisely this
reason. **The right gap in the screenshot is ink to border. The top gap a
stylesheet sets is box to border**, and a plate's box may be taller than its
letters. So measure the INK both ways before deciding the two are unequal, and
say which pair of numbers the change was made against.

✅ **IT IS GRADABLE WITHOUT A NEW ASSERT, WHICH IS RARE FOR THIS KIND OF ASK.**
The assert at `:1389` already PRINTS both halves on every run: *"N px below the
lane's top, N px off the lane's own inset"*. Today it only requires `b.top >=
l.top`, which is the weak half. **After this it can require the two gaps to be
equal**, and it compares two rendered numbers with nothing typed in the page to
disagree with later. Rewrite the claim in the same commit.
⚠️ **AND `.panel-plate` IS SHARED FURNITURE.** The ink and all three placements
are in `shell.css` on purpose, so that `/twelve/`, `/circuit/` and `/evo/` read
as one shelf of instruments rather than three pages. **If the fix lands on
`.panel-plate` it reaches all of them and `/kit/`'s specimens**; if it lands on
`.rack-lane`'s first child it reaches this page. Price both and say which was
written, because the wrong one here is a silent change to two other replicas.

### Done 2026-09-29: twelve, a channel's PAN and REC fall to the bottom of their block

✅ **DONE, `f63278f`.** The auto margin moved off `.pos-crow` and onto
`.rack-row > .strip-one > :first-child`, by position rather than by naming the
knob, because a rule naming the knob is one a reorder turns into a dead selector.
MEASURED at 1280: **64.00 px of air moved from between REC and the fader block to
above the PAN knob**, and the gap under REC is now the strip's own 14 px and
nothing else. The phone block's matching zero moved with it, so no rule is left
naming a `.pos-crow` that no longer carries an auto margin. The two fader columns
land on one line before and after, so the FX fader was left alone.
⚠️ **THE 25.00 px IN THE OLD COMMENT IS A DIFFERENT QUANTITY AND COULD NOT BE
RE-MEASURED**: it is the panel FLOW's slack, and this page passes `flow: false`
and never calls `check()`. The strip's own slack is the 64.00 above.
⚠️ **AND THE NEW ARRANGEMENT IS ASSERTED BY NOTHING.** Nothing requires that the
slack sits above the first control. Three rects would do it and would take the
page to 40.

ASKED, VERBATIM: *"twelwe: align channel item (pan, rec) to the bottom"*. One
page, https://positron.studio/twelve/, and it is the same screenshot as the entry
above: `PAN` and `REC` sitting high in a channel strip beside a master lane whose
`JOG` sits much lower.

**NOT STARTED.**

**Where it is.** `makeStrip` at `demo/twelve/index.html:499` appends three things
to `.strip-one` in this order: the PAN knob, the REC pad, and `.pos-crow`, which
holds the three button column and the fader. `.strip-one` at `:207` is a centred
flex COLUMN with `gap: 14px`, and `:162` is
`.rack-row > .strip-one > .pos-crow { margin-top: auto }`.
**So the strip's spare room is all in one place today: between REC and the fader
block.** MEASURED and written at `:630`: this panel's slack is **25.00 px**, and
that one declaration is what turns it into air.

**The change is which child absorbs the slack**, not a new alignment: the auto
margin moves off `.pos-crow` and onto the strip's FIRST child, so the air goes
above the PAN knob and PAN and REC come down to sit on the fader block. One
declaration, and the 25.00 px is the number that should move.

🔴 **IT CONTRADICTS A COMMENT THAT ARGUES FROM THE HARDWARE, AND THAT COMMENT HAS
TO BE REWRITTEN RATHER THAN LEFT STANDING.** `:157` reads *"IT IS ALSO WHERE THE
PANEL PUTS IT. Knobs and REC at the top, the fader and its buttons in the lower
block, and the air between them is the gap the hardware has too"*. **The ask
overrides it**, and a comment defending the old arrangement while the page does
the new one is this project's most repeated defect in its cheapest form. Replace
it with what is true after: the ask, the date, and what moved.
⚠️ **AND IT IS NOT THE 2026-09-21 ASK ABOUT THE RIGHT PANEL.** *"align right
panel buttons to top"* is `.rack-lane { justify-content: flex-start }` at `:141`
and is about the MASTER LANE, not a channel. **Nothing here touches it**, and
they must not be confused when reading the file.

⚠️ **THE PHONE BLOCK ALREADY OVERRIDES THIS EXACT DECLARATION**, at `:332`:
`.rack-row > .strip-one > .pos-crow { margin-top: 0 }`, inside the block that
also turns the crow to `column-reverse`. Whatever is written has to be checked
against that block with `node demo/shot.mjs twelve 375`, or it lands as a rule
the phone silently ignores while the desk changes.
⚠️ **AND THE FX FADER IN THE LANE IS A SEPARATE `margin-top: auto`** at `:154`,
`.rack-lane .strip-master`. It is not a channel and the ask names PAN and REC, so
it stays where it is unless the shot says the two columns now disagree.

⚠️ **THERE IS AN ASSERT ABOUT WHERE THE BUTTONS LAND** (`:218` records that the
column aligns to the lane's bottom through `--fdr-foot` rather than to the
fader's, *"ASSERTED BELOW against the real rects rather than trusted"*). **That
claim is about the fader block's own internals and should survive**, because
nothing here moves anything inside `.pos-crow`. Check it rather than assume it:
the run before and the run after should read the same count.

### Done 2026-09-29: knobs, a longer description that explains the Pi, and the badge says ONLINE alone

✅ **DONE, `22f3805`.** The description keeps its hook sentence and gains two,
read off this page's own diagram rather than invented: `yoshimi` is a box inside
the Raspberry Pi container, `ctl.set` and `CC` are the arrows going out, `PCM` in
`20ms pieces` is the arrow coming back. The `what` and the manifest's `one` stay
identical apart from the first letter and the closing stop, checked by pulling
both out and comparing. **This overrides CLAUDE.md's one sentence rule on ONE
page, on the owner's instruction, and the page says so. CLAUDE.md is untouched.**
The badge takes `showName: false`, one line. MEASURED through all five states
inside the page's own cascade: **ONLINE, CHECKING, COMING ONLINE, OFFLINE,
UNKNOWN**, where each said `RASPBERRY PI` before it, reserve **172.19 to 86.09
px**, tooltip still `Raspberry Pi online`. The uppercase needed no rule and none
was added: `which-rule-won.mjs` names `.pos-pres-w` in `shell.css` as the only
winner, so it is the component's and not the plate row's.
🔴 **AND THE PLATE ROW STOPPED WRAPPING AT 375, WHICH NOBODY PREDICTED**: 85 px
with `enable midi` on one line and the cluster on a second, **66 px** now with all
of it on one line. The shorter badge collapsed it.
⚠️ **THE FRONT PAGE PAYS FOR THE TWO STRINGS STAYING IDENTICAL**: the knobs card
goes **157.4 to 229.9 px**, and grid items stretch to their row, so `twelve` and
`dump` go with it. **Three cards are 72.5 px taller.** That is the session's
decision and it is reversible in one line if the card should stay short.
⚠️ **THE `ONLINE` READING IS THE COMPONENT DRIVEN TO THAT STATE, NOT THE BOARD
SAYING SO.** The Pi answered online at 10:47 and offline from 10:53 on identical
code. The two standing reds were there before and are not this change.

ASKED, VERBATIM: *"Play a synthesizer in another building, and turn its knobs
while you do. - make longer explaingi Pi"* and *"Rasp Pi online -> \"ONLINE\""*.
One page, https://positron.studio/knobs/.

**NOT STARTED.**

**Half one, the description.** The quoted sentence is this page's `what` at
`demo/knobs/index.html:200` and, word for word, the `one` line at
`demo/manifest.mjs:808`. **They are deliberately the same string**, which is the
standing rule for any page with a diagram, and this page has one (`{ id: 'pi',
label: 'Raspberry Pi', kind: 'device' }` at `:2110`).
🔴 **THE ASK OVERRIDES A STANDING RULE AND THE OVERRIDE IS THE OWNER'S TO
MAKE.** `CLAUDE.md` says **ONE SENTENCE**, asked for 2026-09-19 as *"descs are
single sentences (do not stretch them with : ; -- etc)"*, and the rule's own text
records that it said three sentences before that and four before that, and that
`grains` shipped five and was called *"mambo jumbo"*. **This ask is the opposite
instruction for this page**, so it is followed, and the rule is not quietly
rewritten on the strength of one page.
⚠️ **WHAT THE EXTRA WORDS ARE FOR IS THE PI, WHICH IS THE ONE THING THE SENTENCE
HIDES.** *"another building"* is doing all the work today and never says what is
in that building: a Raspberry Pi running the synthesizer, reached over the relay,
with this page sending MIDI CC to it and PCM coming back. That is what to explain,
in plain words, and no history and no justification for a design decision by the
same rule's second half.
🔴 **AND ONE DECISION COMES WITH IT: DOES THE FRONT PAGE CARD GROW TOO?** The two
strings move together by the rule, so a longer `what` makes a longer card on the
index unless they are deliberately split. **I will keep them identical**, which
is the documented behaviour, **and it makes `knobs`'s card the longest on the
front page.** Say if the card should stay short and they should differ; that is
one line either way and it is the owner's call rather than a guess.

**Half two, the badge.** The plate's `status` is the board's own presence badge,
and it reads `Raspberry Pi online` because `presence.mjs:329` makes a `badge` with
an `of` name show `${of} ${word}` by default (`:391`). **There is already an
option for exactly this**: `showName: false`, which `/kit/`'s header specimen and
`instrument.mjs:199` both pass.
🔴 **BUT `createBoard` DOES NOT PASS IT THROUGH**, `board.mjs:142` builds its
presence with `of` and `busyWords` and nothing else, **so this is a KIT change
and shared work.** ✅ **AND IT IS THE SMALLEST KIND**: `/knobs/` is the only
caller of `createBoard` in the whole repository, measured, so the option reaches
one page today and is an option rather than a new behaviour.
⚠️ **THE RESERVE MOVES WITH THE WORDS AND THAT IS THE POINT OF DOING IT THIS WAY.**
The badge holds room for the widest phrase it can ever say so it cannot twitch
when the word changes (`:392`), and dropping the name shrinks that reserve from
`Raspberry Pi coming online` to `coming online`. **A page rule hiding the name
with CSS would keep the old reserve and leave a band of empty badge**, which is
the shape reported 2026-09-16 as *"same spacing between"*.
⚠️ **THE UPPERCASE IN THE ASK IS ALREADY TRUE OR ALREADY DECIDED.** The plate row
uppercases what it holds; read the rendered badge with a shot rather than adding
a `text-transform` to be sure, and if it is NOT uppercase there, say so rather
than adding one quietly.
⚠️ **AND THE NAME IS NOT LOST TO A SCREEN READER.** `title()` at `:421` keeps
`${of} ${word}` on the tooltip whatever the badge shows, so *Raspberry Pi* is
still on the hover and in the accessible name. Check that after, because the ask
is about what is printed and not about what is announced.

### Open 2026-09-29: a labelless field has no way to name itself, found not asked for

**FOUND BY THE `/nola/` AGENT AND REPORTED RATHER THAN WRITTEN**, because
`demo/shell/` was closed to it.

`demo/shell/field.mjs:73` is `if (label) wrap.append(...)`, so a field with no
caption is already a supported shape. **What it does not have is a way to say
what the box is.** `.pos-field` is a `<label>` element with the input inside it,
so the caption IS the accessible name, and a caller that drops it ships an
unnamed text box unless it remembers `setAttribute('aria-label', ...)` on its
own. `/nola/` now does exactly that at `demo/nola/index.html:1108`, measured back
with `Accessibility.getPartialAXTree` as `role=textbox name="chords"
from=attribute:aria-label`.

**The kit shape is one option, `ariaLabel`, used when `label` is absent.**
`/nola/` is the first caller to drop a caption and is the only one today, so
this is a second caller away from being worth writing. Written down so the next
one does not rediscover it as a bug.

### Open 2026-09-29: nola's chord row still moves 50 px on a phone, measured not cured

**MEASURED at 375 px while curing the desktop jump**, with a CDP probe pressing
the ROLL chooser both ways: `.nola-top` is **97.5 px** with the field in and
**47.5 px** with it out, so the keyboard still moves **50.0 px** on every press.
Before the caption went it was **66.5 px**, so today's change took exactly its
16.5 px and no more.

**The residual is not a caption and cannot be removed the same way.** At 375 the
row has wrapped: the chooser is a line of its own at 47.5 px and the field is a
whole second line, so the 50 px is the row's own `gap: 16px` plus the 34 px box.
**Taking it to zero means holding a line open for a control that is deliberately
out of the document**, which contradicts the page's own arrangement at
`demo/nola/index.html:2623` and the assert at `:4027` that grades the field
LEAVING. That is a bigger claim than the ask made, so it was measured into the
comment above `.nola-top` and left alone.
⚠️ **AND THE FIRST PRESS IS WHEN A VISITOR MEETS IT.** The page opens in
`Suggested`, where the field is out, so the box appears on the first press of
`Typed` and the page moves under the reader at that moment. Unchanged, and worth
knowing before anybody calls the phone version done.

### Open 2026-09-29: which-rule-won.mjs is blind to a logical shorthand beating a physical longhand, found not asked for

🔴 **FOUND BY THE `/twelve/` AGENT AND IT NEARLY SENT IT TO THE WRONG BOX.**
`node demo/which-rule-won.mjs twelve '.panel-plate' padding-top` answered
**"(nothing declares padding-top on it: INHERITED from ancestor 1 up)"** and
named `.rack-lane`'s `padding: 14px` as the winner, **while the element's own
`padding-block: var(--panel-pad) 0` was setting it to 20**. Chrome expands
`padding-block` into `padding-block-start` and `padding-block-end`, which are
LOGICAL names, and the tool matches on the physical name that was typed.

✅ **THE ONLY THING THAT SAVED THE READING IS THE TOOL'S OWN LAST LINE**:
`computed padding-top = 20px (the winner said 14px)`, the instrument saying it
is wrong. `node demo/ancestry.mjs` is what actually answered, in one line.
✅ **CONFIRMED BY ASKING FOR THE LOGICAL NAME**: `which-rule-won.mjs twelve
'.panel-plate' padding-block-start` finds it perfectly, names the shorthand and
prints the specificity. So the tool is right and its lookup is narrow.

**The fix is one line: try the logical sibling of any physical box axis property
before reporting an absence**, and say which name it found it under.
🔴 **AND IT MATTERS BEYOND THAT PAGE.** `padding-block`, `padding-inline` and
`margin-block` are all over `shell.css`, and this project PREFERS the logical
longhands precisely because they avoid shorthand fights, so the tool is blindest
exactly where the house style is strongest. `CLAUDE.md` advertises this tool as
the answer to *"which declaration won"*, so an absence it reports is trusted.

### Open 2026-09-29: the kit puts the case's default inset over a plate, whatever the case actually insets by, found not asked for

**FOUND BY THE `/twelve/` AGENT WHILE ANSWERING THE NAMEPLATE ASK, AND
DELIBERATELY NOT WRITTEN THERE**, because `demo/shell/` was closed to it.

`demo/shell/shell.css:6556` is `.panel-case > .panel-plate { padding-block:
var(--panel-pad) 0 }`. **That is right for a case that insets by `--panel-pad`,
which is 20, and wrong for one that does not.** `/twelve/`'s master lane insets
by **14** and declares it three lines up, so its plate was carrying a top inset
from a token that lane never uses, which is the whole of the air the ask was
about. The page now deletes it with `.rack-lane > .panel-plate { padding-block:
0 }` at a specificity tie.

**The kit shape is the plate reading the case's OWN inset**:
`.panel-case > .panel-plate { padding-block: var(--plate-pad, var(--panel-pad)) 0 }`,
with a case declaring `--plate-pad` beside its own padding so one declaration
carries both.
⚠️ **IT WOULD REACH `/tom/`, `/circuit/`, `/evo/` AND THE INSTRUMENT HEADER, AND
THE AGENT'S READING IS THAT IT CHANGES NOTHING ON ANY OF THEM**, because each of
those cases does inset by `--panel-pad` and would resolve the fallback to what it
gets today. **THAT IS REASONED AND NOT MEASURED.** Measure all four before it
lands, and the full note is in `demo/twelve/index.html` at the assert's comment
so the next reader finds it where they will look.

### Open 2026-09-29: shape now draws the same control two ways on one screen, found not asked for

**FOUND BY THE `/shape/` AGENT AFTER DOING EXACTLY WHAT WAS ASKED**, and it is
the argument the 2026-09-28 join was built on, arriving from the other side.

Each of the page's 40 slider lanes carries its own `⇄` square glued to the end
of its lane with **no gap and no ring**. The one at the top of the page now
stands **10 px clear with a full rounded border**, because the ask was *"invisible
hand is a separat e button not a radio group"* and that is what was written.

**So the page shows one control drawn two ways**, which is the reading that put
the glyph into the segment in the first place and is written up in the file as a
dated measurement rather than deleted. **Nobody has been asked whether the LANE
hands should also come apart, or whether the top one should keep its gap and lose
its ring.** Not acted on, not re-litigated in the comments. Look at the 1280 shot
of https://positron.studio/shape/ with both in frame before deciding.

### Open 2026-09-29: an assert written to catch the waveform's ring could never have seen it, found not asked for

🔴 **FOUND BY THE SHARED AGENT WHILE REMOVING THE RING ITSELF.**
`demo/radio/index.html:5736` reads `getComputedStyle(canvas).borderTopWidth ===
0` inside a glue. **It was written for the 2026-09-21 report about that exact
ring, it has been green ever since, and it was green the whole time the ring was
on screen**, because the ring was painted into the canvas's backing store and
`getComputedStyle` cannot see paint.

**This is the green page with no coverage, one layer down**: not an assert that
never ran, an assert that ran every time and asked the wrong instrument.
**The test that would have caught it is a canvas pixel sample at the corner,
which is four lines and free**, and is exactly what the shared agent used to
prove the fix: the outermost pixel read `31,41,55` before, which is `--line`,
and `17,21,29` after, which is `--card`.
⚠️ `/radio/` WAS NOT OPENED, RUN OR PROBED for any of this, by instruction. The
arrangement was measured synthetically on `/grains/` with the real `createGlue`
and `createGrainScope`. **So this line is about a file that was read, not about a
page that was run.**

### Open 2026-09-29: a glued scope gets a different inset depending on how deep it is glued, found not asked for

**FOUND BY THE SHARED AGENT.** `demo/shell/shell.css:3035` is
`.pos-glue > .pos-scope { background: var(--card); padding: 10px 12px }`, a
DIRECT CHILD selector.

**So a scope glued straight in carries a 10 by 12 inset and one glued a level
deeper carries none.** `/radio/` and `/tapes/` are the first case. `/pack/` is
the second and had its inset taken off on 2026-09-22 on *"rm padding and its
border around waveform canvas"*. **That is one ask answered on one page and not
on the other two**, and the neighbouring rule at `:3034` names both depths
precisely because the kit already learned that lesson once.
⚠️ **NOT ACTED ON AND IT IS NOT OBVIOUS WHICH WAY IT GOES.** Either the inset is
right and `/pack/` should have kept it, or it is wrong and two pages are drawing
a box inside a box. `/radio/` cannot be looked at, so this needs `/tapes/`
against its stand-in and a decision about what a glued picture's inset IS.

### Open 2026-09-29: on a phone muta reads picker, name, button, so the nameplate is not literally last

**FOUND BY THE SHARED AGENT IMMEDIATELY AFTER LANDING THE ASK IT ANSWERS**, and
reported rather than written, because the fix reaches six pages.

The ask was *"nameplate is the lowest of the bottom components in mobile"* and
`d52b714` does it with one `order: 1` on the name cluster. MEASURED at 375 on all
six pages: `/muta/`, `/fau/` and `/knobs/` put the picker or the far end control
where the name used to be, to the pixel, and `/shape/` and `/tom/` do not move at
all because a plate with no status and no patch control has no cluster to order.
🔴 **BUT `/muta/`'s CLUSTER IS 301 px WIDE AND WRAPS**, so the crop at 375 reads
**picker, `PLAITS`, `Test tone`**. The cluster went to the bottom as one block,
which is what `shell.css` demands in writing (*the controls on the row go with
the name*), and the NAME is therefore not the literally lowest thing.
**Making `PLAITS` the last line is one more `order` inside the cluster**, and it
would put the name under the button on this page and change what
`.pos-ipanel-name` stacks as on all six. **Refused in writing, waiting on the
owner.**

### Open 2026-09-29: the plate row's order moves the paint and not the tab stop

**FOUND BY THE SHARED AGENT WHILE WRITING THE `order` ABOVE**, and recorded in
`shell.css` rather than worked around.

`order` is a visual reordering only, so on the three pages whose plate row has
two children the keyboard still reaches the name cluster's control BEFORE the
patch picker while the picker is drawn above it. **One stop on a row of two**, at
phone widths only.
⚠️ `flex-wrap: wrap-reverse` has the identical mismatch and adds a cross axis
flip, so it is not the way out. The way out is DOM order, which would reorder the
row at every width and undo what the ask asked for. **Left as is, deliberately,
and written down so nobody reports it as new.**

### Open 2026-09-29: two agents shared one scratchpad file and one of them measured the other's page

🔴 **THE SHARED AGENT'S PROBE FILE WAS OVERWRITTEN MID-TASK BY A PEER**, in the
session scratchpad root, and its next four measurements came back as another
agent's JSON about nameplate ink and fader tops. **It caught this because the
SHAPE of the output was wrong, not because anything errored**, moved to a
subdirectory of its own and re-took every measurement.

**A probe that silently answers about another page is the worst shape a
measurement can have**, because every number it returns is real, consistent and
about the wrong thing. **The rule is one scratchpad directory per agent, named
in the brief**, which is what the three agents after it were given.
⚠️ **AND IT MEANS ONE THING CANNOT BE RULED OUT**: any measurement taken in that
root between the two runs may belong to a peer. The shared agent's numbers were
all re-taken after the move. Nobody else reported an anomaly.

### Open 2026-09-29: board.mjs cannot empty its own playout, and every page that wants to stop its sound has to reach past it, found not asked for

**FOUND BY THE `/knobs/` AGENT WHILE MAKING PANIC STOP THE AUDIO**, and reported
rather than written, because `demo/shell/` was closed to it.

**`board.mjs` has no way to drop the sound it is holding**, so the page posts
`{ cmd: 'reset' }` straight at `board.playout()`, a node the component owns.
**And it has no way to read the worklet's own counters either**: `port.onmessage`
takes `bufferedMs`, `underruns` and `trimEvents` and discards `appended`,
`played` and `dropped`, so the page had to hang a SECOND `addEventListener` on
that port to grade its own change. It does not touch `onmessage`, deliberately,
because that one is the component's.

**The kit shape is `board.dropSound()` plus those three counters on
`board.stats()`.** 🔴 **AND `/keys/` HAS THE SAME GAP**: it holds a 100 ms
cushion and it has a panic, so it needs the same two lines the day anybody asks.

### Open 2026-09-29: a panic can launder the cushion assert, and the ordering that stops it is a comment rather than a mechanism

🔴 **FOUND BY THE `/knobs/` AGENT WHILE GRADING ITS OWN CHANGE.**
`{ cmd: 'reset' }` zeroes the worklet's `underruns` and `trimEvents` as well as
its ring. `board.mjs` surfaces those as `starved` and `trimmed`, and
`demo/knobs/index.html`'s `the cushion never ran dry` reads `starved === 0`.
**So a panic driven BEFORE that assert takes it green by wiping the counter it
reads.**

It is avoided by running `panicCheck()` after `checkAll()` on both routes, and
the reason is written into the check's header so nobody moves it. ⚠️ **That is a
convention held by a comment.** The same shape reaches any page that resets a
counter a later assert reads, and this repository has paid for a check that
passed because something upstream had cleared its evidence.

### Open 2026-09-29: knobs carries seven em dashes and six middots that predate today

**MEASURED BY THE `/knobs/` AGENT AND DELIBERATELY NOT SWEPT**: `grep` reads
**7 lines with em dashes and 6 middots** in that page's log lines and assert
details, none of them written today. `git diff` of today's change contains
neither.

**Not swept because the ask was one behaviour**, and rewriting eight unrelated
log lines in the middle of a targeted run is how a change nobody can attribute
gets made. **The rule is per demo, when that demo is being worked on**, so this
is the note for the next `/knobs/` task.

### Open 2026-09-29: nothing on /pack/ can loop a sample any more, and Loop was asked for by name

🔴 **`Loop` WENT WITH THE TRANSPORT IN `5bf144b`, WHICH IS WHAT TODAY'S ASK
REQUIRED, AND IT IS A CONTROL SOMEBODY ASKED FOR BY NAME.** 2026-09-21: *"move
sample player below table, add loop"*. It lived in the bar's `loopSlot`, and
looping is one boolean on the running `AudioBufferSourceNode`, so with the bar
gone there is no control left to write it.

**No replacement was invented, deliberately.** Three asserts went with it, all
three about the toggle, and none of them had ever run on this machine.
**This line exists so the removal is not silent.** If Loop is wanted back it is
its own control in the glued panel, and it is one boolean and one button.

### Open 2026-09-29: four of /pack/'s asserts have never run on this machine

**FOUND BY THE `/pack/` AGENT WHILE REWRITING THEM.** Everything after
`demo/pack/index.html:2563` sits behind `PACK_HERE ? await realFetch(PACK) :
null`, and **`/pack/` fetches nothing without `?pack=<url>` since 2026-09-24**,
when the Circuit pack left this repository. So that whole branch is dark here.

**It is why today's count did not move**: `grep -c "d.assert("` went **65 to
62** while `verify.mjs pack` read **31/31 with 25 page asserts before and
after**. The three that left were already silent. **A green suite can mean zero
coverage and only the count says so**, and here even the count cannot, because
the difference is in a branch the count never reaches.
⚠️ **AND ONE REWRITTEN ASSERT IS REASONED FROM THE CODE AND NEVER RUN**: *an
empty slot opens*, whose body moved off `deck.range[1]` onto `lastPlayed`.
Driving the branch with a locally built zip of WAVs reaches 33 asserts and then
throws on `sessions[0].parts`, because a bag of WAVs is not a Circuit pack.
**The fixture that would light this up is a pack shaped file that is nobody
else's**, and building one is the open job.

### Open 2026-09-29: pack imports createReport and never calls it, found not asked for

`demo/pack/index.html:141` imports `createReport` and `grep -c "createReport("`
is **0**. Dead since the readout was removed on 2026-09-21. **Left alone on
purpose**: it is unrelated to the sample player and would put noise in a commit
about it. One line to delete.

### Open 2026-09-29: muta's foot has a 230 px hole at the desk, and the scope is the page's largest blank

**BOTH FOUND BY THE `/muta/` AGENT AFTER LANDING `0f617fb`, AND NEITHER IS A
FAULT.** They are the two things a second pair of eyes should look at on
https://positron.studio/muta/ at 1280.

- **`PLAITS` sits alone with about 230 px of nothing to its right** before
  `Test tone` and the picker. That is what *align test tone to right* asks for on
  a row that is now 688 px wide, and it reads as a foot bar rather than as a
  gap, but it is the part of the layout most likely to draw a second opinion.
- **The scope's empty field is now the largest blank area on the page** while
  nothing is sounding. It was already that shape at 525 px and is simply bigger.

### Open 2026-09-28: step-grid sizes itself against the scroller's own padding, so the last column hangs over the edge, found not asked for

**FOUND BY THE `/tom/` AGENT WHILE MEASURING SOMETHING ELSE, AND DELIBERATELY
NOT FIXED THERE**, because it is a kit line and that agent's file was the page.

`demo/shell/step-grid.mjs:500`, inside `size()`:

```js
const box = strip.clientWidth;   // and clientWidth INCLUDES padding
```

On `/tom/` that `strip` is a `.panel-strip.panel-strip-l`, and
`.panel-strip-l { padding-left: var(--panel-gap) }` is **16 px of padding INSIDE
the scroller**, deliberately: the comment above it records the 2026-09-23 ask
that made it padding rather than a margin. **So the grid is sized for 16 px more
room than it has.**

**MEASURED at 1280 before the gutter change: `clientWidth` 624, `scrollWidth`
638, 14 px past the right edge. At 375: 279 and 286, 7 px past.** The arithmetic
reproduces it exactly: `floor((624 - 15*2) / 16) = 37`, grid `16*37 + 15*2 =
622`, available `624 - 16 = 608`, overflow 14.

⚠️ **IT OSCILLATES WITH `cellSize`'s `floor`, WHICH IS WHY IT WAS NOT USED AS AN
ARGUMENT FOR THE GUTTER MAGNITUDE**: after that change 1280 went 14 to **2** and
375 went 7 to **11**. A number that moves both ways under an unrelated edit is
not evidence for the unrelated edit.

**The fix is subtracting the scroller's inline padding inside `size()`, one line**,
and it reaches `/kit/`'s three specimens and `/pack/` as well as `/tom/`.

### Open 2026-09-28: createChoice has no slot for a trailing control, found not asked for (ANSWERED 2026-09-29, and it is not wanted)

✅ **ANSWERED 2026-09-29 BY AN ASK THAT GOES THE OTHER WAY, SO NO `trailing`
OPTION IS WANTED.** Asked: *"shape: ... invisible hand is a separat e button not a
radio group"*. The glyph LEAVES the segmented row rather than getting a proper
slot inside it, which settles the one thing this entry called reasoned and never
measured: an action button in a row of options. **Nothing is owed on
`choice.mjs`**, and if a second page ever wants a glyph glued to a chooser this
entry is the record of what it would cost. The live entry is at the top of this
file.

**FOUND BY THE `/shape/` AGENT AND REPORTED RATHER THAN WRITTEN**, because
`demo/shell/` was closed to it.

`/shape/` now puts its invisible hand button into the chooser's segmented row by
inserting after `parts.buttons[parts.buttons.length - 1]`. **That works, it is
stable, and it uses `createChoice`'s DOCUMENTED return rather than naming
`.pos-choice-seg`**, which is how this project's dead selectors get born. But
the call site is not the honest home for it.

**A `trailing` option on `demo/shell/choice.mjs` is**, for *a segment that is an
action rather than an option*. It would carry the one page rule with it:

```css
.pos-choice button.shape-hand { flex: none; padding: 0; }
```

which exists only because `.pos-choice .step button` is (0,2,1) inside the phone
block and `button[data-glyph="1"]` is only (0,1,1), so without it a 34 px square
grows into whatever the words leave and takes 12 px of side padding inside a
34 px box. **The next page to do this would write that rule again.**

⚠️ **`.tbar-loopgrp` IS THE KIT'S EXISTING EXAMPLE** of a toggle glued to a
glyph action, so this would be the second, which is the count at which a thing
becomes a component here.
⚠️ **ONE THING IS REASONED AND NOT MEASURED**: whether an action button inside a
row of `aria-pressed` options announces correctly. `choice.mjs` uses
`aria-pressed` buttons rather than `role="radio"` on purpose and says changing
that is an eleven call site decision, so no radio group is being polluted and
the glyph keeps its own `aria-label`. **No screen reader has been on it.**

### Open 2026-09-28: the keyboard's pad row cannot hold its controls on one line at 375 px

FOUND while answering *"keyboard lower bittons (+- panic etc) go to the same
line"*. That ask got the repair it needed (the row is two ends in two boxes now,
so a wrapped line is left aligned instead of stranded at the right, see `.kpad`
in `demo/shell/shell.css`), and the LITERAL ask is arithmetically out of reach at
that width.

**MEASURED on https://positron.studio/nola/ at 375 px, before and after:** the
row is **323 px** wide and its eight children need **467.4 px plus seven 8 px
gaps, which is 523.4 px**. Of that, **272.9 px is the five controls** and
**218.5 px is three reserved readout cells** (`.kpad-chord` 72.8, `.kpad-tempo`
86.1, `.kpad-ratio` 59.6) which hold their widest possible reading whether or not
anything is written in them. **The controls alone would fit with about 50 px to
spare.** So the thing that does not fit is invisible, which is why the row looks
like it should.

**WHAT WOULD FIX IT:** the three readout cells take a line of their own above the
controls when the row is narrow, leaving `-`, `+`, `0`, `Loop`, `Sustain` and
`Panic` on one line. **NOT DONE because it needs the ROW'S OWN BOX to decide it,
not the window's**: `/kit/` demonstrates keyboards in a 320 px frame at desktop
width, and `/evo/` and `/instrument/` draw keyboards much narrower than the page.
A `@media` query is blind to all three. `@container` is the right form and
`.kbd` cannot carry it: `container-type: inline-size` applies inline size
containment, and `.kbd` is `width: fit-content`, so its contents would be taken
out of its own sizing and it would collapse. The wrapper that could carry one
would change what sizes a keyboard's box on every page that has one, which is a
measurement nobody has made.

### Open 2026-09-28: the instrument panel's phone layout is graded by nothing

The nameplate centres at 560 px and under (asked as *"in instrument layout, on
mobile the nameplate goes below all othe section on its own section and it
centered hzontally"*, done, at the foot of `demo/shell/shell.css`). **No harness
here can enter that block.** `demo/verify.mjs` runs at 756 px with no viewport
override, and `/kit/`'s narrow specimens are narrow BOXES at desktop WIDTH, which
a media query cannot see either. It was MEASURED with `node demo/shot.mjs <slug>
375` on all six pages that build a plate and it is asserted by nothing, so it can
go stale silently, which is this repository's most expensive kind of defect.
The cure is the same container query the entry above wants and has the same
`width: fit-content` problem, one surface out: `.pos-rows`.

### Done 2026-09-28: tom, less air to the left of the step grid's numbers

✅ **DONE, `c9a780b`. THE ASK NAMED THE RIGHT SYMPTOM AND POINTED AT THE WRONG
BOX**, which the ancestry walk settled before a number was typed: the whole of
the air was `.panel-case`'s 20 px of `--panel-pad`, and two of the three
ancestors the walk named are not in the object at all. One declaration on the
page's own `.tom-fixed`, `margin-inline-start: calc(var(--ctl-gap) -
var(--panel-pad))`, so the column LEAVES the card's inset rather than fighting
it and the escape is derived from the token it escapes.
**MEASURED from the object's own left edge, before and after:** the column box
**21 to 9**, `63`'s ink **24.96 to 12.96**, a lone `0`'s ink **30.98 to 18.98**,
against the transport bar's play button at **9** and the log's first ink at
**13**. Identical at 375 and 1280. The card is 686 wide and the nameplate is at
317 both times, and the strip's right edge is 963 both times.
**THE MAGNITUDE WAS SWEPT, NOT CHOSEN**: `-4` refused as indistinguishable from
zero in the crop, `-16` puts `63` inside the transport bar's own inset, `-20`
photographs as a column about to be clipped on the one page whose gutter has
been clipped before.
**39/39 with 28 page asserts to 40/40 with 29.** The one that arrived reads the
column against the BAR and never against a number. The ink assert is untouched
and was confirmed across the whole sweep rather than reasoned: a margin moves a
box and does not narrow one.
⚠️ **AND THE PAGE'S COMMENT ABOUT THE OLD SCAR WAS STALE, SO IT IS REWRITTEN.**
`.pos-pg-labs` now sits after `.panel-fixed-l`, which is the first of the two
cures that comment said were still owed.
⚠️ **THE PHONE PAGE IS 64 px TALLER**, 1745 to 1809: the strip gained 12, so
`--pg-cell` went 15 to 16 and 64 rows each grew 1 px.

ASKED, VERBATIM: *"reduce left padding on tom's left numbers"*. The page is
https://positron.studio/tom/ and the numbers are the step grid's label column.

**NOT STARTED, AND THE PADDING IS NOT WHERE THE ASK'S WORDS POINT.** MEASURED
by reading the stylesheet rather than the screen:

```css
.pos-pg-lab  { padding: 0 6px 0 0; }   /* shell.css:2572, the LEFT is already 0 */
.pos-pg-labs { border-inline: 0; padding-inline: 0; }  /* shell.css:6329 */
```

**So neither the number nor its column carries any left padding at all**, and
whatever air is there belongs to something further out: the panel's own inset
(`--panel-gap`), `.panel-fixed`, or the scroller. **`node demo/ancestry.mjs tom
'.pos-pg-lab' padding-left --width 375` names the ancestor before a single
number is typed**, which is what that tool exists for and is cheaper than a
fourth override.

🔴 **AND THIS EXACT COLUMN HAS A SCAR ON IT, SO NOTHING HERE IS TO BE GUESSED
AT.** `shell.css:6302` records that `.pos-pg-labs`' `border-right: 0;
padding-right: 0` sat three thousand lines above `.panel-fixed-l` and **had
never once applied**: both selectors are (0,1,0), the later one won, and 16 px
of `--panel-gap` plus a 1 px border ate the label column's whole 22 px content
box. **64 of 64 labels were clipped and it shipped for three days**, reported as
*"you lost 2-digin numbers from tom demo"*, under an UNCHANGED assert count.
⚠️ **SO THE REPAIR IS ORDER, NOT WEIGHT.** That comment says in as many words
why the fix is not `.panel-fixed.pos-pg-labs`: raising to (0,2,0) starts the
escalation `.panel-fixed-l` is deliberately (0,1,0) to avoid. A tie decided by
source order is the smallest thing that can win.
⚠️ **AND `--pg-lab` IS NOT THE NUMBER TO CHANGE**, which `demo/tom/index.html:79`
says outright: 22 px holds `63` with room.
⚠️ **READ THE INK, NOT THE BOX.** `/tom/`'s own check at `:1284` compares the
label's TEXT against what the column SHOWS of it, in the label's own font,
because three alignment asserts were green while a reader could see `5` where
`52` belongs. Any change to this column's width or inset is graded by that
assert or it is not graded at all.

### Done 2026-09-28: the invisible hand's button on a knob loses its border

✅ **DONE, `750c751`, AND IT IS `border: 0` RATHER THAN A DELETED
DECLARATION.** MEASURED with `which-rule-won.mjs` before anything was written:
the base `button, .pos-btn` rule sets `border: 1px solid var(--line2)` as a
SHORTHAND, so deleting the line would have left a ring **brighter** than the one
being removed. That is the whole reason this is not a one character edit.
MEASURED after on `/knobs/` at 1280: `border-top-width: 0px`, `border-top-style:
none`, `background-color: rgb(17, 21, 29)` which is `--card` kept,
`border-radius: 50%` kept, box still 22 by 22.
**The `:hover` was decided rather than left**: its border half went with the
border it named, or it would have been the seventh dead rule measured here. The
`--fg2` to `--fg` on the glyph is what is left, and this control IS a glyph, so
its ink is its whole appearance. `[data-on="1"]` is untouched and `.sld-hand`
was not touched at all.

ASKED, VERBATIM: *"rm border around inviisble hand button on knob dials"*.

**NOT STARTED, AND IT IS ONE DECLARATION**, `demo/shell/shell.css:5456` inside
`.pos-knob-hand`:

```css
background: var(--card); border: 1px solid var(--line); border-radius: 50%;
```

plus `.pos-knob-hand:hover { border-color: var(--line2); … }` on the next line.

🔴 **THE GROUND STAYS WHEN THE BORDER GOES, AND THE RULE'S OWN COMMENT SAYS
WHY**: *"it sits ON the drawing, so it needs a ground of its own or the ring
shows through the glyph"*. Deleting `background` with the border is the obvious
over-reach and would put the ring behind the symbol. **Delete the `border`, keep
the `background`, and decide what `:hover` says instead**, because that rule has
nothing left to change once the border is gone and a hover that changes nothing
is a hover that reads as a dead control. `color: var(--fg)` is already in it and
may be the whole answer.
⚠️ **AND THE RADIUS IS NOT THE BORDER.** `border-radius: 50%` shapes the
GROUND, so it stays.
⚠️ **NOTHING ELSE IN THIS RULE MOVES.** The position is read off the drawing
through `--knob-ring-f` and `--knob-dial-r` rather than typed, the button costs
no height because it is absolute, and `[data-on="1"]` lights the SYMBOL only,
which was instructed as *"just color it yellow when enabled (the symbol)"* and
is `.sld-hand`'s rule verbatim. A border removal must not become a second
channel for the on state.
**Where it shows**: every page drawing a knob with `hand`. `/knobs/`, `/muta/`
and `/shape/` are the ones to look at, `/kit/` holds the specimen.

### Done 2026-09-28: fix the invisible hand button on /shape/

✅ **DONE, `c61c2f2`. IT IS THE CHOOSER'S LAST SEGMENT NOW, IN TWO LINES OF
CODE AND NO CSS ABOUT JOINING.** The button is inserted after
`parts.buttons[last]`, which is `createChoice`'s documented return, so the page
never names `.pos-choice-seg`. `.pos-seg` already owns the join: `Session`
stops being `:last-child`, the kit zeroes its corners and rounds the hand's, and
a button has no radius rule of its own so it needs no unnotch line.
**MEASURED before at three widths: a 10.00 px gap, two full 4px rings, and at
375 the square sitting 6.75 px HIGH** against the options beside it, because
`.pos-choice` puts its label on top there. **That half was invisible at every
width the harness runs.** After: seam **-1.00 px** at all three, which is exactly
the rendered margin of `.pos-seg > * + *`, outer corners 4px, seam 0px, tops
equal at 165.50 and at 213.00. **The join gave 11 px back.**
**One page rule was needed and it is about the phone, not the seam.**
`.pos-choice .step button` is (0,2,1) in a max-width 560 block;
`button[data-glyph="1"]` is only (0,1,1), so the square would have grown into
whatever three words left it. `.pos-choice button.shape-hand` **TIES** at
(0,2,1) and wins on source order. A tie, not an escalation.
**53/53 with 47 to 55/55 with 49**, the before re-run today rather than taken
from the brief. Both new asserts were **broken on purpose in a live page** by
appending the hand back onto the bar.
**THE HAZARD DID NOT BITE**: after the move `.pos-controls button, .tbar-x`
matches **0 elements** on this page, so nothing starts a hand on the Circuit on
a suite run. And one existing assert was strengthened without moving the count:
it read `!e.closest('.pos-controls')` while the harness presses `.pos-controls
button, .tbar-x`, so a control wearing `.tbar-x` would have passed it while the
suite pressed it every run.
⚠️ **THE SKETCH DID NOT SETTLE THE READING AND THE FILE NOW SAYS SO.**
`[Synth1|Synths] [⇄]` says nothing about whether the two touch. **What settles
it is the page itself: 40 of its 52 lanes already draw this exact join**, so the
one at the top was the same control drawn a second way on one screen.
⚠️ **THE STANDING HOLE IS UNCHANGED AND WAS CHECKED RATHER THAN ASSUMED**: a
slider moved BY HAND still has no one-press way back.

ASKED, VERBATIM, with a screenshot: *"fix invisuble hand button"*. The picture
is https://positron.studio/shape/ : a `CIRCUIT NOT CONNECTED` status, a
`SENDS TO` label over a three segment row reading `Synth 1 | Synth 2 |
Session`, and **the square `⇄` button standing well clear of that row, with a
full rounded border of its own**.

**NOT STARTED, AND WHAT *FIX* MEANS IS NOT SETTLED.** Asked back in the session
it arrived in. Two readings, and they want different changes:
- **IT SHOULD BE JOINED TO THE ROW, AND THE PAGE'S OWN SKETCH SAYS SO.**
  `demo/shape/index.html:18` and `:514` both draw it as
  `[Synth1|Synths] [⇄] <- square button`, and `:1290` writes the order out as
  `[Circuit …] [sends to …] [⇄]`. The screenshot shows a gap instead. The kit
  already has the join: `.pos-seg`, which is what `slider.mjs`'s hand button
  uses against its lane (`shell.css:2037`), with the note that a segment giving
  up its inner corners is the whole of that rule.
- **OR IT IS THE BUTTON'S APPEARANCE**, since the ask arrived one line before
  *"rm border around inviisble hand button on knob dials"* and may be the same
  complaint on the other component.

**Where it lives.** `demo/shape/index.html:584` builds it as a plain
`el('button', 'pos-btn', …)` with `centreSymbol`, `:602` appends it as
`bar.append(parts.el, hand)`, and it toggles between `move everything` and
`put back` through `HAND_SAYS` from `demo/shell/hand.mjs`.
⚠️ **AND `/shape/` HAS A STANDING HOLE THIS TOUCHES**, already open: **there is
no one-press way back for a slider moved BY HAND**, because the `move
everything` glyph offers the way back only while something is running. Whatever
happens to this button, do not make that worse.
⚠️ **THE HARNESS PRESSES `.pos-controls button` BY POSITION** and `:236` records
that this page already thinks about it: the hand button is kept out of that row
on purpose, because *a suite run must not be a hand on somebody's instrument*.
Moving this button INTO a row the harness sweeps would start a hand on every
run.

### Open 2026-09-28: muta, the Test tone button fills the phone (DONE) and the knob grid has nothing to centre in (REFUSED, the decision ANSWERED 2026-09-29)

🔴 **THE DECISION THAT WAS WAITING HERE IS ANSWERED, 2026-09-29, AND THE ANSWER
IS NO.** Asked: *"muta: full content w in deskop, center the knobs group. align
test tone to right."*. **The panel does NOT centre in the page with
`margin-inline: auto`. It takes the whole content width and the knobs centre
inside it**, which is the `full: true` shape priced and rejected below, asked for
with the centring that the rejection assumed nobody would write. The live entry
is at the top of this file. **Nothing is waiting on the owner here any more.**

✅ **HALF TWO IS DONE, `040f266`, AND IT NEEDED TWO DECLARATIONS RATHER THAN
ONE, BECAUSE A FLEX ITEM CANNOT WIDEN ITS PARENT.** `.pos-ipanel-name` is a
shrink-to-fit cluster holding the nameplate and this button, so the button rule
alone gives you the CLUSTER's width and not the ROW's. MEASURED at 375 with each
half applied on its own: as shipped 165.4 and 108.5, **button rule alone 165.4
and 165.4**, cluster rule alone 301.0 and 108.5, **both 301.0 and 301.0**.
**IT DOES NOT FIGHT THE CENTRED NAMEPLATE THAT LANDED AN HOUR EARLIER.**
MEASURED at three phone widths: `PLAITS` centres on **187.5, 240.0 and 278.5**,
which is the row centre to the pixel at each one, while the button and the
picker both take the whole row. The picker was ALREADY on its own line at 480
and 560 before this, so nothing new wraps anywhere in the block's range. At 1280
the two screenshots are identical and the button is 108.5 px as before. **The
phone pays 19 px of panel height, 504 to 523.**
**IT IS PAGE SCOPED ON PURPOSE AND THE COMMENT NAMES THE KIT SHAPE.** The plate
row already wraps into two lines below 560 on all six panel pages, so the only
thing missing was this page's control filling a line it already had. A kit
option on the `status` slot would reach `fau`, `knobs`, `shape`, `tom` and
`kit`, and nobody has asked for it on any of them.
🔴 **AND THE PARENTHESIS IN THE ASK IS A QUESTION WHOSE ANSWER IS NO.**
`createControlGrid` takes `items`, `cols`, `gap`, `host` and `cls`. **There is
no `buttons` prop**, on it or on `createInstrumentPanel`. Read off the module.

🔴 **HALF ONE IS REFUSED IN WRITING, AND THE REFUSAL IS MEASURED THREE WAYS.**
`.plai-knobs` is the WIDEST ROW of a `width: fit-content` surface, so the panel
is as wide as this row is: **client equals scroll at 483 at both 1280 and 560,
zero slack.** Both grids are `flex: 0 0 auto` and each `.pos-cg` is the sum of
its own tracks and gaps, so there is no slack inside either of them either. And
a live `justify-content: center` was applied and MEASURED rather than argued
about: **it moved the first grid 0.0 px at 1280 and at 560, then put it at -1.5
at 480 and -54.0 at 375 with `scrollLeft` clamped at 0**, which is 91 px of the
2 by 2 group off the left edge and unreachable for good. **A no-op where there
is room and a permanent clip where there is not.** Inline-start overflow inside
`overflow-x: auto` is clipped permanently and this row is a scroller BY DESIGN,
made one after `HARMONICS` and `MORPH` were photographed cut to `HAR` and `M`.
The numbers are written into the page beside `.plai-knobs` so nobody
re-attempts it.

🔴 **ONE DECISION IS WAITING ON THE OWNER AND MUST NOT GO QUIET.** **The one box
with slack is the PANEL inside the PAGE: 525 px in a 688 px body at 1280, all
163 px of it on the right.** At 375 there is none. That is one declaration,
`.plai-panel { margin-inline: auto }`, plus a rewrite of one assert, about ten
minutes.
- **Against it**: it takes the instrument off the left edge that the `h1`, the
  `what` paragraph, the report and the log all share at x296, which is the only
  vertical line the page has; `/muta/`'s own assert, written THE SAME DAY, reads
  *"the instrument starts where the rest of the page does and is as wide as its
  widest row"* and its comment says *"the claim that survives is the LEFT edge"*,
  so centring takes that red on purpose; the ask says *knob grid*, not
  *instrument*; and five other pages build the same `fit-content` panel.
- **For it**: it is the only reading of the ask that can move anything, and at
  the desk the instrument ends at 821 while the report under it runs to 984,
  which is visibly what a person would call not centred.
- **It was not guessed at**, because reverting a documented decision made hours
  earlier on a guess is the `/tom/` *"no top padding on titles"* shape, where
  the reading that destroys work was taken four times in a row.
⚠️ **`full: true` ON THE PANEL WAS PRICED AND REJECTED**: it would give the knob
row 165 px of real slack to centre in, and that is the shape `positron-compose`
quotes as **"plainly awful"**, four knobs floating in a 660 px band. It answers
the letter of the ask by rebuilding a defect already reported.
⚠️ **49/49 WITH 43 PAGE ASSERTS, UNCHANGED, WHICH IS THE HONEST READING**:
nothing appeared or disappeared and the change sits inside a `max-width: 560`
block the harness cannot enter at 756 px. **This layout is graded by nothing**
and the only instrument is `node demo/shot.mjs muta 375`.

ASKED, VERBATIM: *"muta: center the knob grid. test tone button takes full w on
mobile (buttons prop?)"*. Two asks in one line, one page,
https://positron.studio/muta/.

**NOT STARTED.**

**Half one, the knob grid centres.** `demo/muta/index.html:520` and `:537` build
TWO grids through `createControlGrid`, `cols: 2` (the four big knobs) and
`cols: 3` (the three attenuverters and three more). **So *the knob grid* is two
objects and they have different column counts**, which is exactly the case where
centering one and not the other looks like a mistake rather than a decision.
Confirm which is meant, or centre both and say so.
⚠️ **AND `muta` IS `fit-content` SINCE 2026-09-28**, 34.0 to 559.0 px where its
case ran 34.0 to 722.0, on the compose rule that an instrument is as wide as the
instrument. **Centring inside a box that is already shrink-wrapped to its
content does nothing**, so this ask is either about the grid inside the panel or
about the panel inside the page, and those are two different lines in two
different files. LOOK at it at both widths before writing either.
⚠️ **`control-grid` ALSO CARRIES A KNOWN NAMING DEFECT**, already open below:
`--cg-pitch` and `grid.pitch()` both report 84 while the lattice steps 94,
because `size()` calls `pitchFor(w, h, 0)` with the gap zeroed and sets `gap`
separately. Anybody reading pitch numbers while centring this grid will read
that 84 and be wrong by 10.

**Half two, the Test tone button full width on a phone.** `demo/muta/
index.html:628` builds it as a plain `<button class="muta-tone">` with
`aria-pressed`, and it sits in the instrument panel's `status` slot, which is
the position after the name at the START end of the plate row. Its comment
records that the slot used to hold the on and off switch and that the button is
deliberately NOT a kit component.

**THE PARENTHESIS IS A QUESTION AND THE ANSWER IS NO.** `createControlGrid`
takes `items`, `cols`, `gap`, `host` and `cls`, and **there is no `buttons`
prop**, on it or on the instrument panel. The nearest existing spellings of
*take the width you are given* are `full: true` on `createInstrumentPanel` and
`createGlueRows`, `.pos-rows-full` at `shell.css:1029` and `.kbd-full` at
`:3723`. So the shape that matches this repository is a `full` option or a kit
class, NOT a page rule, and the decision is whether it belongs to the button,
to the plate row's slot, or to the panel at phone width.
⚠️ **IT IS IN A JUSTIFIED ROW WITH TWO ENDS**, which already goes linear below
`--row-min`, so *full width on mobile* may be a property of that row's linear
mode rather than of this one button. If it is, it reaches all six instrument
pages and is shared work, done once and first. **If it is written on
`.muta-tone` it reaches one page and nothing else, which is cheaper and
narrower.** Price both before choosing; this is the same fork as the nameplate
ask above.

### Done 2026-09-28: the screen keyboard is a third higher, on the phone and at the desk

✅ **DONE, `750c751`, AS TWO TOKENS AT `:root` AND NOT FOUR TYPED HEIGHTS.**
`--k-white: calc(74px * 4 / 3)` and `--k-black: calc(46px * 4 / 3)`, read by the
two `.k` rules and by the one media query.
**MEASURED on `/nola/` before and after: 74.00 to 98.66 and 46.00 to 61.33 at
375; 92.50 to 123.33 and 57.50 to 76.66 at 1280.**
The 1.25 did not move and is still the only thing that media query says. The
media query did not move and the breakpoint is still 561. **The 74 and the 46
now each appear ONCE in the file**; before this they each appeared twice, once
as a `var()` fallback and once inside the media query's `calc`.
⚠️ **THE TOKENS ARE AT `:root` AND NOT ON `.keys`, DELIBERATELY**: `.k` is also
a label class under `.pos-xr-offer`, and a token declared on `.keys` would leave
that one with no height at all rather than with its fallback, because an
unresolved `var()` takes the whole declaration with it.
⚠️ **`/evo/` DID NOT MOVE, AS EXPECTED AND AS LOOKED AT**, because
`.evo-keys .k { height: auto }` overrides the component outright. 64/58,
identical.

ASKED, VERBATIM: *"make screen keyboard 1/3 higher on both mobile and
desktop"*.

**NOT STARTED.** It is two tokens and one media query, and the arithmetic is
worth writing down before anybody types a number.

**Where it lives, all three lines in `demo/shell/shell.css`.**

```css
.k        { height: var(--k-h, 74px); }        /* :1714, the white key */
.k.sharp  { height: var(--k-hs, 46px); }       /* :1744, the black key */
@media (min-width: 561px) {                     /* :3754 */
  .keys { --k-h: calc(74px * 1.25); --k-hs: calc(46px * 1.25); }
}
```

**SO THE DESK IS ALREADY 1.25x AND THE PHONE IS THE BASE**, which means *a
third higher on both* is 74 to **98.67** and 46 to **61.33** on the phone, and
92.5 to **123.33** and 57.5 to **76.67** at the desk, if the 1.25 stays a
separate factor. Two ways to write it and they are not the same:
- **multiply the base and leave the 1.25 alone**, which keeps one statement of
  *the desk is a quarter taller than the phone* and moves both ends together.
  This is the one to write unless told otherwise.
- type four new numbers, which is four numbers to keep in step and is the
  defect `positron-compose` names: a typed number that describes a
  RELATIONSHIP is a bug waiting.

⚠️ **THE MEDIA QUERY’S POSITION IS LOAD-BEARING AND MUST NOT MOVE.** Its own
comment says why: **a media query adds no specificity**, so a plain `.k` rule
written after it wins at every width, and `.pos-pick`'s whole phone layout sat
above a plain rule that beat it and had never run in its life. The block sets
the two PROPERTIES `.k` reads and sits after every rule that reads them.
⚠️ **AND THE BREAKPOINT IS 561, THE OTHER SIDE OF THE 560 THIS STYLESHEET USES
SEVEN TIMES.** A third breakpoint is a third answer to a settled question.
⚠️ **ONE PAGE OVERRIDES THE KEY HEIGHT OUTRIGHT**: `.evo-keys .k { height:
auto }` at `shell.css:6401`, and its comment says that is *the only* thing
making that keyboard work. `/evo/` will not move with this and should be
LOOKED at afterwards rather than assumed unaffected.

**What a taller key changes that is not the key.** The keys are in a scroller,
the roll above them shares the keyboard's grid template character for
character, and the pad row and footer sit under it. `node demo/shot.mjs <slug>
375 1280` on a page that draws all three is the reading. Every page with a
keyboard is in scope: `nola`, `knobs`, `fau`, `evo`, `looper`, `instrument`,
`kit`.

### Done 2026-09-28: the Loop button goes when the Evolution keyboard is not connected

✅ **DONE, `750c751`.** `keyboard.mjs` gained `api.offerLoop(present)` and
`api.loopOffered()`; `/nola/` calls `offerLoop(false)` at once and decides from
`onPorts` on every change; `midi.mjs`'s `onPorts` gained a SECOND argument
rather than a changed one, because *something is plugged in* and *that keyboard
is plugged in* are different facts and a count cannot answer the second.
🔴 **AND ONE FACT IN THE BRIEF WAS WRONG: `/tom/` DOES NOT PASS `loop: true`
AND HAS NO KEYBOARD AT ALL.** That `loop: true` is inside a comment about a
transport bar removed earlier. **Two pages pass it, `/kit/` and `/nola/`.**
**The page owns the device test, the component owns the row.** Nothing in
`keyboard.mjs` asks for a MIDI port or knows what an Evolution is: putting the
test there would make seven pages request Web MIDI in order to draw a keyboard.
The test is `/evo/`'s own `/mk-?4\d\dc|evolution/i` character for character,
because CoreMIDI calls the port `MK-425C USB MIDI Keyboard` and **the maker's
name is in nobody's port list**.
**A SOUNDING LOOP IS STOPPED AND KEPT, NEVER CLEARED.** Both obvious answers
are wrong: leaving it running strands a phrase with nothing that can reach it,
and clearing throws away something somebody played.
**IT STARTS WITHDRAWN ON `/nola/` AND THAT IS A DECISION**: the answer is not
known until `requestMIDIAccess` resolves, and a button on screen for half a
second and then gone is a control disappearing under somebody's hand. `/kit/`
keeps it offered always, because that page has no MIDI and never will.
**No assert left. Three arrived**, grading the absence, the withdrawal and
return of a running loop with its take kept, and the 161.7 px of reserve
leaving with the cells. The `/nola/` one **drives `offerLoop(true)`, the same
call the page makes**, rather than simulating it.
⚠️ **AND THE TWO HAZARDS WERE CHECKED RATHER THAN ASSUMED.** `.pos-controls`
holds zero buttons on `/nola/` and the pad is inside `.kbd`, so no harness press
moved. No page names the control in a selector: `/kit/` finds it by its WORDS
and `/nola/` reads the first button with more than one character, which now
prints `"Sustain"` instead of `"Loop"` and still passes.

ASKED, VERBATIM: *"rm loop button when evolution keyboad is not connected"*.

**NOT STARTED, AND WHICH PAGE IT IS HAS TO BE CONFIRMED BEFORE ANYTHING IS
WRITTEN.** The Evolution MK-425C is `/evo/`'s subject, and `/evo/` has **no
loop button at all**: `grep -n loop demo/evo/index.html` prints nothing.
**Three pages pass `loop: true`**: `demo/kit/index.html`, `demo/nola/index.html`
(`:981`) and `demo/tom/index.html`. The screenshot in the ask above this one is
`/nola/`, which is the likeliest subject, and `/kit/` is the specimen page where
the control exists to be looked at rather than used.

**Where it lives.** `demo/shell/keyboard.mjs:400` takes `loop: wantLoop` and
`:1027` builds `loopBtn` behind it; `:935` says the gate on `wantLoop` is *what
keeps this off the pages that do not want it*. So the component already has the
mechanism and what is missing is the page telling it the truth at the right
moment.

**WHAT MAKES THIS THE HARD ONE, AND IT IS NOT THE BUTTON.**
- **Connection is not a fact at load, it is a fact that changes.** The Web MIDI
  path is `requestMIDIAccess` plus `onstatechange`; a keyboard plugged in after
  the page opened has to bring the button BACK, and one unplugged mid-loop has
  to take it away while a loop is running. `wantLoop` is read once at build
  time today.
- ⚠️ **AND A CONTROL THAT APPEARS AND DISAPPEARS MOVES EVERY OTHER CONTROL'S
  HARNESS PRESS.** `demo/verify.mjs:830` presses `.pos-controls button, .tbar-x`
  by position. The `N | D` removal turned out NOT to have this problem because
  the pad lives inside the keyboard's own box, so the same may be true here and
  is to be CHECKED rather than assumed either way. What DID break that day was
  two pages naming the control in a SELECTOR, and only one of those two ways of
  naming fails loudly.
- ⚠️ **NOTHING IS CONNECTED TO THIS DESK DURING A CHECK RUN.** `/knobs/` already
  carries two standing reds of exactly this shape. So the harness sees the
  DISCONNECTED case by default, which means the button is absent in every run
  and any assert that presses it goes with it. Decide what the check grades
  before writing the gate: an absence is a measurement too, and this project has
  a rule about a green page with no coverage.
- ⚠️ **AND IT INTERACTS WITH THE ASK ABOVE ABOUT THE PAD ROW WRAPPING**, because
  removing a control changes the width that row needs. Do the wrap fix in a way
  that survives three controls becoming two.

### Done 2026-09-28: the keyboard's lower buttons wrap onto two lines, and they belong on one

✅ **DONE, `750c751`, AND THE MEASUREMENT IS THE INTERESTING PART.** At 375 on
`/nola/` the row is **323 px** and its eight children need **523.4 px**, of
which **272.9 px is five controls and 218.5 px is three reserved readout cells**
holding their widest possible reading while empty. **So the thing that did not
fit was invisible.**
**The row is two ends in two boxes now**, `.kpad-grp-start` and `.kpad-grp-end`
under `justify-content: space-between`, and the auto margin is gone. A flex line
hands its free space to the auto margins ON THAT LINE, so the wrapped line
right-aligned itself exactly the way the full one did.
🔴 **THE PREVIOUS REPAIR IS KEPT AND MOVED ONE ELEMENT OUT, NOT UNDONE.** Its
principle was *the builder marks the group and the CSS does not infer it*, and a
group in a box of its own states that harder. Adding or REMOVING a control is
still no CSS at all, which the Loop gate needed and the classes could not have
done. `.kpad-tight` is deleted rather than left matching nothing. **`.kpad-right`
STAYS because `/dump/` uses it** on a lone `Clear`; measured there at 984.0
against 984.0, unmoved, and `/dump/` is 25/25.
**MEASURED after, in the ordinary state: one line, left edge 26.0, `Panic`'s
right edge 349.0 against the row's own 349.0**, 304.4 px in 323.
⚠️ **WHAT MADE IT FIT IS THE TEMPO AND RATIO CELLS LEAVING WITH `Loop`**, which
is the Loop gate's mechanism. They are readouts ABOUT the loop and can say
nothing while there is no control to start one.
🔴 **AND IT IS NOT FINISHED: WITH THE EVOLUTION PLUGGED IN THE ROW STILL WRAPS
BY 200.4 px.** Carried as its own Open entry at the head of this file.

ASKED, VERBATIM, with a screenshot: *"keyboard lower bittons (+- panic etc) go
to the same line"*. The picture shows the octave pair and its `0` on one line
and `Loop`, `Sustain`, `Panic` pushed to the right end of a SECOND line under
them.

**NOT STARTED.** It is the pad row, `.kpad`, and not the footer: the footer is
`.kbd-foot` and carries the page's own row.

**Where it lives.** `demo/shell/keyboard.mjs:1040` marks the right hand group
(`rightSide = [loop, sustain, panic]`, first one `kpad-right`, rest
`kpad-tight`); `demo/shell/shell.css:3758` is `.kpad` and `:4167` is
`.kpad-right`.

**WHY IT DOES THIS, READ FROM THE STYLESHEET AND NOT YET MEASURED.**

```css
.kpad { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kpad-right { margin-left: auto; }
```

`flex-wrap: wrap` and a `margin-left: auto` are the two halves. The row wraps
when it runs out of width, and the auto margin then takes the free space on the
SECOND line instead of the first, so the group does not just drop, it drops and
right-aligns. That is this project's already-named phone defect, *a justified
row wrapping into a left line and a right line*, arriving in a component
rather than in a page.

⚠️ **AND THE AUTO MARGIN HAS A HISTORY THAT ANY FIX HAS TO KEEP.** The comment
at `shell.css:4154` records the previous repair: `.kpad .pos-toggle {
margin-left: auto }` spread the controls across the row the moment a second
toggle existed, because **a flex line hands its free space to every auto margin
on it equally**. The rule that replaced it is *the builder marks the group, the
CSS does not infer it*, and *adding a fourth control changes no CSS*. A fix that
goes back to per-control selectors undoes that.

**What is NOT yet known and has to be looked at before anything is written.**
- **At what width it wraps, and whether the picture is a phone or the desk.**
  `node demo/shot.mjs <slug> 375 1280` LOOKS at both, which is the step this
  project keeps paying for skipping.
- **Whether one line is possible at 375 at all**, or whether the answer is that
  the row goes linear as a whole (the `--row-min` behaviour `createGlueRows`
  already has) rather than half-wrapping. If the controls cannot fit, *same
  line* and *readable* are two asks and the second one wins; say so in writing
  rather than shrinking type to win an argument with arithmetic.

**IT IS THE SHARED COMPONENT, SO IT IS DONE ONCE AND FIRST.** Every page with a
keyboard draws this row: `nola`, `knobs`, `fau`, `evo`, `looper`, `instrument`
and `kit`. The assert COUNT on each is the reading afterwards, not the colour.

### Done 2026-09-28: the instrument layout's nameplate on a phone, its own section, centered

✅ **DONE, `750c751`, READ AS AN INSTRUCTION AND NOT AS A BUG REPORT**, on the
grounds that it is parallel in construction to *"keyboard lower bittons go to
the same line"*, which is plainly one. The owner was told that was the reading
being built.
*Below all other sections* was already true at every width. **What is new is the
centring**, in one `@media (max-width: 560px)` block at the FOOT of `shell.css`.
**MEASURED at 375 before:** `/muta/` drew `PLAITS` and its `Test tone` hard left
at x37 with the picker on a second line, and `/tom/` was ALREADY
`justify-content: center` **and it made no difference**, with `TOM` at x313.5,
hard right.
🔴 **THE LOAD BEARING LINE IS THE PLATE GIVING UP `flex: 1 1 auto`.**
`.pos-rows-r > .panel-plate` makes a plate span its row so `place: 'ends'` has
something to spread across, and **a spanning box is exactly what makes
`justify-content: center` a no-op**. Two lines come with it: `column-gap`,
because a shrunk `ends` plate has no width for `space-between` to spend, and
`margin-left: 0`, because `place: 'end'` absorbs the free space with an auto
margin that OUTRANKS the container's justification and would park `/tom/` back
on the right.
**MEASURED at 375 after, row centre 187.5: `tom` 187.55, `fau` 187.55, `shape`
187.50, `muta` 187.50, `knobs` 187.50 on both its clusters.** At 1280 nothing
moved.
**The status control centres WITH the name it belongs to**, because it lives
inside `.pos-ipanel-name`, so `/muta/`'s `Test tone` reads as one block with
`PLAITS` rather than as a button hanging off a centred word.
🔴 **NO HARNESS HERE CAN SEE THIS BLOCK.** Carried as its own Open entry at the
head of this file. `/kit/`'s four plate specimens have zero width on a visit, so
this is measured on five live panels and not on the gallery.

ASKED, VERBATIM: *"in instrument layout, on mobile the nameplate goes below all
othe section on its own section and it centered hzontally"*.

**NOT STARTED, AND THE READING IS NOT SETTLED YET.** The sentence can be a
report (*this is what it does now and it is wrong*) or an ask (*this is what it
should do*), and the two want opposite changes. Asked back in the session it
arrived in; whichever answer comes, it is written here first.

**Where it lives.** `demo/shell/instrument-panel.mjs` builds the plate as the
LAST row already (`ROW_KINDS = ['viz', 'controls', 'keys', 'plate']`, and
`addRow` inserts controls BEFORE the keys and the plate however late it is
called), so *below all other sections* is the desk behaviour too. The row is
built by `createNameplate` in `demo/shell/panel-layout.mjs` and laid out by
`createGlueRows` in `demo/shell/glue.mjs`; `.pos-rows-r` and the row tokens are
in `demo/shell/shell.css`.

**What is already known and makes it non-obvious.**
- **A justified row has exactly two ends, and it goes LINEAR below
  `--row-min`**, decided by the CONTAINER's width and not the window's. So on a
  phone the plate's name end and patch end stop being two ends and stack. That
  is the existing rule, from session 51, and it is the likeliest source of
  whatever the phone is drawing now.
- **Centering is not the kit's habit.** Every other row in the panel is a start
  row or a justified one. A centered plate is a new alignment in that component
  and reaches all six pages at once.
- **SIX PAGES DRAW IT**: `fau`, `knobs`, `muta`, `shape`, `tom`, and `kit`
  (which holds the specimens). A change in the component is one change in six
  places, so it is the shared-work agent's job and goes BEFORE any page agent.
- The phone is an **iPhone mini, 375 by 812 at 3x**: `node demo/shot.mjs <slug>
  375 1280` LOOKS at it, `node demo/ancestry.mjs` walks who insets it.
- `positron-compose` AND `positron-ui` both load before this one is written,
  by the trigger table in `CLAUDE.md`: it is a layout task and a kit task.

### Done 2026-09-28: fau, "rm bell and hall from fau they do not diffentiate. btin somehintg instresting"

✅ **TWO OUT, TWO IN, AND THE PICKER IS SIX ROWS THAT ARE SIX INSTRUMENTS.**

**`Pluck`**, in `Bell`'s place. Twelve milliseconds of noise into a delay line
that feeds itself, `+ ~ lap`.
- **It is the ONLY patch on the page that uses `~`, the operator that lets a
  signal read its own output.** Everything else runs forwards: the Organ adds
  oscillators up, the Rhodes bends one with another, and the two `pm.` names hide
  whatever they do. This one has **no oscillator in it at all** and its pitch is
  the LENGTH of the loop.
- It is the counterweight to `Djembe` and `Clarinet`, which is this page's own
  *"the compression is a dictionary rather than magic"* argument shown from the
  inside: the same kind of thing those two name in one word, written out in four
  lines a visitor can edit.
- **AND IT IS MEASURABLE IN THE READOUT, WHICH IS THE THIRD THING.** Its `per
  voice` is **16.47 kB, a buffer**, where the drum's 0.57 kB is a handful of
  numbers and the organ's 262.26 kB is a sine table. Three mechanisms, one cell.
- ⚠️ The damper is ONE TERM (`keep = 0.9 + 0.099 * gate`) rather than a second
  envelope, because a string with constant feedback rings on past the key and
  then nothing the sustain pedal does can be told apart from the instrument
  ignoring it. MEASURED offline at 440 Hz: RMS **0.0009** in the first tenth of a
  second after the key lifts against **0.075** in the first tenth it was held.

**`Sweep`**, in `Hall`'s place. A sawtooth through a resonant low pass whose
corner is driven by an envelope of its own, with the room on the effect line.
- **It is the THIRD WAY OF MAKING A SOUND and the page did not have one.** Organ
  and Rhodes both BUILD a sound up; this one starts with everything, because a
  sawtooth has every harmonic of the note in it, and takes most of it away again.
  First `fi.` on the page, and the one envelope that moves something other than a
  level.
- Its `per voice` is **108 bytes, the smallest figure this page has ever
  printed**, next to the Organ's 262.26 kB from a source of about the same
  length.
- ✅ **AND IT KEEPS `Hall`'S LESSON ON A VOICE THAT IS NOBODY ELSE'S**, which was
  the half of `Hall` worth having: five listings end with a bare wire and this
  one ends with a real room.

⚠️ **AND ONE MORE WAS REFUSED, WHICH IS THE ASK BEING APPLIED TO THE ANSWER.** An
additive row using `sum(i, 32, os.osc(freq*(i+1))/(i+1))` would teach that the
language writes a loop as an expression and would move the `machine code` cell by
a digit. It is the Organ with more partials, which is `Bell`'s shape wearing a
new mechanism, so it did not go in.

**COMPILE TIME, MEASURED AGAINST THE VENDORED libfaust 2.89.2 THE WAY THE PAGE
COMPILES** (a voice, an effect and a mixer, `-ftz 2`), four consecutive compiles
each with a fresh name so nothing comes off the factory cache. The rig was
checked rather than assumed: compiled under the page's own pinned name it answers
the Organ at **7,266 B**, which is `PINNED.bytes` to the byte.

| preset | compile, 4 runs (ms) | machine code | per voice |
| --- | --- | --- | --- |
| Organ | 63 / 26 / 24 / 23 | 7,253 B | 262,264 B |
| Rhodes | 30 / 29 / 28 / 29 | 7,755 B | 262,284 B |
| **Pluck** | **26 / 26 / 26 / 25** | **8,635 B** | **16,472 B** |
| **Sweep** | **111 / 109 / 114 / 106** | **21,318 B** | **108 B** |
| Djembe | 82 / 82 / 82 / 81 | 17,206 B | 572 B |
| Clarinet | 251 / 243 / 241 / 242 | 15,311 B | 278,740 B |

The two that left, for comparison: **Bell 23 to 25 ms**, **Hall 96 to 98 ms**.
**NEITHER NEW ROW IS SLOWER THAN `Clarinet`.** `Pluck` at 26 ms is the second
cheapest in the picker; `Sweep` is about 15 ms dearer than the `Hall` it
replaces, which buys the filter, the new voice and the room.
⚠️ **THOSE ARE NODE FIGURES AND THE BROWSER IS SLOWER, STATED RATHER THAN
SMOOTHED.** The harness has the Organ at 34 and 40 ms in Chrome against node's 23
to 26, so this desk runs about 1.4x to 1.6x the node number, consistent with the
`Clarinet` figure the file already carried. The Clarinet comment was corrected
with it: it said *"nearly three times the next one"*, which was true against
`Hall` and is **about twice** against `Sweep`, re-measured side by side so only
the ratio is quoted.

✅ **NOTHING NEW CROSSES THE WIRE, AND IT IS ASSERTED RATHER THAN ARGUED.** `no`,
`de`, `fi` and `dm` are all inside the 2.41 MB `.data` blob the page already
fetches. The checks read the browser's own resource record: **20 resources, every
one of them this origin**, and **4 files, 6,379,006 B of 6,379,006 B** for the
compiler, both unchanged.

**MEASURED: 49 page asserts before, 50 after**, every one accounted for. Minus
the `Hall` assert, which compared `Hall` against the ORGAN and only worked
because `Hall` WAS the Organ. Plus a room assert rewritten as a CONTROLLED PAIR:
it compiles the `Sweep` listing twice, once as it stands and once with its last
line replaced by a bare wire, both under seven character names so the byte counts
are comparable, reading **21.33 kB with the room against 9.45 kB without, and
0.11 kB a voice either way**. One string differs from the other by its last line,
so the difference cannot be anything else. Plus a `Pluck` assert bracketed on
BOTH sides so it cannot pass on "bigger than the drum", which most of this page
satisfies.
⚠️ The first run was 55/56 with the known marginal pedal assert red at
`0.798` against its picked 0.8 floor, with another headless Chrome alongside. Run
again: **56/56**. That floor is still marginal and this change did not touch it.

🔴 **AND ONE REPAIR NOBODY ASKED FOR, BECAUSE THE REORDER WOULD HAVE BROKEN IT
SILENTLY.** The new order is Organ, Rhodes, Pluck, Sweep, Djembe, Clarinet: the
four you can read and edit first, then the two that hide everything behind a
name. **TWO CHECKS STILL READ `PRESETS[2]` FOR THE DRUM**, and under the new
order index 2 is the string, so both would have compiled the wrong preset and
reported the right one. `byId` is declared beside `PRESETS` now with a header
saying what an index cost. `PRESETS[0]` survives on purpose, because that is a
claim about which row the box OPENS with.

⚠️ **NOT SETTLED: NOTHING HAS BEEN HEARD.** Levels are offline renders and the
page's own analyser. MEASURED at velocity 100, one voice at 440 Hz: `Pluck` peaks
at 0.378 with the ring at 0.075 RMS decaying to silence in about a second,
`Sweep` peaks at 0.220 against the Organ's 0.218. **Eight voices at once has not
been metered on any patch**, and `Sweep`'s filter runs at Q 6, which is the one
place a chord could be hotter than the single note suggests.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"rm bell and hall from fau they do not
diffentiate. btin somehintg instresting"*. Slug `fau`, file
`demo/fau/index.html`, `PRESETS` at line 434. With an agent.
⚠️ Known and non-obvious, and the complaint is EXACT rather than a matter of
taste:
- `Bell` at 511 is the Rhodes with ONE NUMBER CHANGED, `3.51` instead of a whole
  multiple, and its own comment says so. `Hall` at 576 is the Organ unchanged
  plus `effect = dm.freeverb_demo`, and its own comment says that. So two of the
  six rows are edits of other rows, and a picker of six that is really four
  teaches a visitor less than it appears to.
- ✅ WHAT A REPLACEMENT HAS TO CLEAR, and these are the page's own published
  standards: nothing new may cross the wire, because the 2.41 MB of Faust
  library is already downloaded and `physmodels.lib` is inside it; and compile
  time is a measured cost this page prints. `clarinet` is 273 to 344 ms compiled
  the way this page compiles, which is polyphonic with a voice, an effect and a
  mixer, and is the slowest row by nearly three times. An STK piano at 1,690 ms
  was REFUSED. `pm.brass_ui_MIDI` at 155 ms was considered and not chosen.
- ⚠️ AND THE PAGE COMPILES ON LOAD SINCE EARLIER TODAY, so `PRESETS[0]`'s cost
  is now a visitor's cost on every visit.
- `PRESETS[0].code` is the text box's initial value and `patch.options(...)`
  builds the picker from the array, so the array is the single source. There is
  a line-count constant READ OFF the presets rather than typed, which moves if
  the longest row changes.
- ⚠️ **FOUR GOOD ROWS BEAT SIX WITH TWO EDITS IN IT**, and the agent was told
  that shipping four is a real answer rather than a failure.

### Done 2026-09-28: keyboard component, "rm N | D setting from keyboard component"

✅ **DONE, AND THE NAMING THAT SURVIVES IS THE NOTE NAME.** Asked, verbatim:
*"finally: rm N | D setting from keyboard component"*, and then, when told it
was being held while two page agents were mid-run: *"N D can be last"*, so the
ordering was the owner's as well. `demo/shell/keyboard.mjs`, `shell.css`,
`/kit/` and `/nola/`.
- **WHAT LEFT:** the two segments and their factory, `DEGREES`, `tonic`,
  `naming`, `paintNaming`, the `names:` option, and five entries off the API,
  `nameButtons`, `setNaming`, `naming`, `setTonic` and `tonic`. `noteName` is
  one expression now. Two `shell.css` rules went with it, deleted rather than
  left to match nothing.
- 🔴 **THE DEGREE PATH WENT WITH THE BUTTON RATHER THAN BEING PINNED, AND THE
  REASON IS MEASURED: NOT ONE CALLER EVER SET A TONIC.** GREPPED across the
  repository before deciding: nothing outside `keyboard.mjs` called `setNaming`,
  `nameButtons`, `naming()`, `setTonic` or `tonic()`, and `setTonic`'s own
  comment named `/nola/` as the page that would use it. So the degree naming was
  reachable only from the control being deleted, and keeping it would have left
  a branch that can never be taken, which is `/muta/`'s `plaitsOn` flag one
  component along.
- ✅ **THE ASSERT COUNTS DID NOT MOVE, ON ANY OF THE SEVEN PAGES.** MEASURED
  before and after, page asserts: `looper` 8, `instrument` 10, `evo` 58, `nola`
  100, `fau` 50, `knobs` 34, `kit` 235. Whole set **544 asserts both times**,
  542/544 before and 541/544 on the first run after, and the difference is the
  one red below. `knobs`'s two standing reds are its own and are unchanged.
- ⚠️ **AND THE HARNESS PRESS ORDER WAS NEVER AT RISK, WHICH THIS ENTRY GOT
  WRONG WHEN IT WAS WRITTEN.** It said in red that removing a control moves
  every other control's harness press on all seven pages. It does not:
  `demo/verify.mjs` presses `.pos-controls button, .tbar-x`, and the whole pad
  lives inside the keyboard's own box. CHECKED at `verify.mjs:830` rather than
  assumed. The rule is real and this control was not its subject.
- 🔴 **ONE PAGE WENT RED AND IT IS THE INTERESTING HALF: `/nola/` NAMED THE
  CONTROL IN A SELECTOR, AND MOVING THE SELECTOR ONE CONTROL ALONG WAS THE
  WRONG REPAIR.** That page reads its own nameplate's letter against the first
  control on the pad row, as `inkLeft(...querySelector('.kpad-names button'))`.
  A gone control answers `null` and `inkLeft(null)` THROWS, which would have
  taken that assert and every one after it out of the page in silence. Pointed
  at `.kpad-oct button` instead it read **x53.08 against the plate's x54.00** and
  went red at a tolerance of 0.6, because `.step button.ico` is `padding: 0` and
  a fixed square, so the octave button CENTRES a glyph and its ink lands
  wherever that glyph's advance puts it. The naming pair had passed for five days
  because it was `width: auto` over `.kpad button`'s `0 var(--kpad-pad)`, so its
  letter sat at exactly the inset the claim is about. **An alignment that holds
  by one glyph's width is luck.**
  ✅ **THE REPAIR READS THE INSET OFF A BUTTON WITH A WORD IN IT** (its ink minus
  its own border box) and applies it to the pad ROW's left edge, which is ink
  against ink in the quantity the claim is about and survives any reordering of
  the row. MEASURED after: **x54.00 against x54.00**, the row starting at x44.00
  plus the 10.00 px `Loop` sits inside its own box.
  ⚠️ **`/kit/` NAMED IT TOO AND WOULD NOT HAVE THROWN, WHICH IS WORSE.** Its
  chord-cell assert spreads `querySelectorAll('.kpad-names, .kpad-at')` into a
  list of left edges, so losing one quietly narrowed what the assert watches
  instead of failing. Repointed at `.kpad-oct`.
- ✅ **AND TWO OLDER LINES ARE CLOSED BY DELETING THEIR SUBJECT**: the 2026-09-25
  *"Nt | Dg to N | D in keyboard"* line, and ask 3 of the three-ask `/knobs/`
  section. Both say so in place.
- ⚠️ **THE ARGUMENT FOR THE PAIR IS KEPT IN WORDS, AT THE PAD, BECAUSE IT WAS
  OVERRULED RATHER THAN ANSWERED**, together with all five spellings of its
  label and the 118.48 px against 65.50 px measurement that bought the shortest
  one.

### Done 2026-09-28: muta, "on by default, no online button, put a test tone on that spot"

✅ **ALL THREE DONE, AND THE STANDING RULE HOLDS.** The plate's `status` slot
holds the `Test tone` button, the presence control is gone, and the instrument is
ready the moment the page is.
- 🔴 **THE SPLIT IS NOT `/fau/`'S SPLIT, AND THE REASON IS EXACT.** `/fau/`'s
  compile is arithmetic over a file it ships, so its whole load half is pure
  computation. Muta's firmware has to end up inside an `AudioWorkletGlobalScope`,
  and a worklet module cannot be added without an `AudioContext`. So the line
  falls elsewhere: a VISIT fetches the wasm and builds the main thread instance,
  and a GESTURE makes the context, adds the worklet, posts the bytes and shakes
  hands. `boot()` is `warmUp()` and `open()` now, and `arm()` keeps the two
  deadlock guards verbatim, because the check block calls `arm()` from inside
  `open()` and that is precisely the hang the old comment documents.
- **A touch anywhere on `panel.el` arms it**, pointerdown or keydown, capture
  phase, the listener removing itself once it has armed. Lifted from `/fau/`.
- **WHAT THE ONLINE BUTTON WAS GATING, AND WHERE EACH HALF WENT.** The boot,
  split as above. `ensureMidi()`, which did NOT move to the load path, because
  `requestMIDIAccess` is a permission prompt and belongs to a gesture; it is the
  first line of `arm()` now, MEASURED as `the visit asked 0 times and everything
  since asked 1`. The `plaitsOn` flag, REMOVED rather than pinned true, because
  nothing can switch this instrument off any more and `light()`,
  `togglePlaits()`, `idleIfEmpty()` and two `if (!plaitsOn) return` guards were
  branches that could never be taken. And the harness's one gesture, which now
  dispatches a real `PointerEvent('pointerdown')` at `panel.el` rather than
  clicking a switch, so the path under test is still a person's path.
- **THE PRESENCE STATE WENT NOWHERE. IT IS GONE.** No badge, no lamp, no state.
  What the lamp claimed, *this instrument is running*, has stopped being a
  question whose answer differs from *the page is open*, and the two facts it
  conflated are both in the log instead: one line for the fetch and the build,
  one for the first quantum.
- ⚠️ **`Test tone` WAS BORN `disabled` AND IS LIVE FROM THE FIRST FRAME NOW.** A
  press made before the firmware lands queues behind the visit's own fetch rather
  than being refused, because a dead button in the one slot a visitor looks at
  would be the page answering *on by default* with a control that is not.
- **MEASURED ON A RUN THAT WAS ALONE (`pgrep` showed 0 other headless Chromes):
  48/48 green with 42 page asserts before, 49/49 green with 43 after.** Two
  added, one removed, six changed one for one. The added pair each carry the half
  that can actually fail: *the firmware is asked for by the visit and no sound
  device is*, where a page that opened a device on load satisfies the first
  clause and fails the second, and *the sound device is opened by a touch on the
  panel, and the touch fetches nothing*, where the fetch count is what proves the
  split was worth making, since a touch that triggered the download would look
  identical from outside.
- **A VISIT, STEP BY STEP:** no context, no worklet, no MIDI, no sound; one fetch
  of `/muta/vendor/plai.wasm`, **200,710 bytes, same origin, a file this
  repository ships**; the log reads `196.0 KB of WebAssembly off this site in 4
  ms, built and waiting for a finger`; then nothing until a finger lands. First
  touch: MIDI asked once, context at 48000, worklet loaded, bytes across the
  port, handshake, knobs pushed, costs measured, **169 ms from the touch to the
  first rendered quantum with 0 further fetches**. Still silent. `Test tone` or a
  MIDI key is the only thing that makes a sound.
- Four log lines changed because they named a control that is not there, and
  `pluck()`'s failure line no longer says `turn the instrument on first`.
- ✅ The `what` and the manifest `one` were CHECKED AGAINST EACH OTHER rather
  than assumed, and neither mentions a switch or the tone button, so neither
  drifted and neither needed editing.

🔴 **ONE REAL LOSS OF COVERAGE, NAMED RATHER THAN BURIED.** *"an oscillator that
is switched off makes no sound, whichever way it is asked"* is deleted. It was
the answer to *"when plaits is off and warps in on from plaits, how it can play
at all?"*, and it pressed the switch off and then asked the oscillator to sound
BOTH ways in, the tone button and a real `keyDown`. Its subject is gone, and it
was deleted rather than rewritten against `plaitsOn === true`, which would be a
check that cannot fail. **What is no longer graded: that the two doors into the
voice allocator can be shut.** If this page ever grows a way to stop the
instrument, that assert comes back with it.
⚠️ **AND ONE QUESTION FOR THE OWNER: 196 KB NOW CROSSES ON EVERY VISIT**, paid by
a visitor who never plays. It is same origin and this repository's own file, and
`/fau/` spends 6.16 MB the same way by explicit ask, so the precedent was treated
as covering it. **One line moves it back behind the first touch.**
⚠️ The nameplate no longer lines up with anything on its row, because a 34 px
button is in it and the row is taller. Nothing reported it and nothing asserts
it. And nothing grades the leg between the worklet node and the destination,
which was already true and is worth repeating because the removed assert was the
last one that pressed anything near it.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"muta: on by default, no online button, put
a test tone on that spot"*. Slug `muta`, file `demo/muta/index.html`. Not
started.
⚠️ Known and non-obvious: the presence control is a `createPresenceButton` the
page builds itself and passes to the panel as `plate: { status }`, since
`createInstrumentPanel` takes a BUILT control where `createInstrument` took an
`online` object. `Test tone` is `panel.addRow(toneBtn, { align: 'start' })`, a
row of its own between the rotaries and the foot, added late because the
component guarantees insertion above the keys and the plate.
🔴 **"ON BY DEFAULT" RUNS STRAIGHT INTO THE STANDING RULE AND HAS TO BE READ
CAREFULLY.** A visit opens nothing and a sound happens on a press, so this
cannot mean the page makes a noise or opens an AudioContext by itself. `/fau/`
answered the same shape earlier today by splitting compile from attach: it is
READY on load and the first gesture arms the audio. That is the reading to
build.

### Done 2026-09-28: global, "all nameplates are uppercase"

✅ **DONE BY THE SESSION, NOT AN AGENT, because it is shared and two page agents
were about to open those files.** `caps` already defaulted to true in
`instrument-panel.mjs`, so this was the removal of two opt-outs: `/knobs/` and
`/shape/` both passed `caps: false` and both carried an argument for it.
⚠️ **THE ARGUMENT WAS REAL AND IS KEPT IN WORDS RATHER THAN DELETED.** The
2026-09-21 rule, *"replica names always in uppercase"*, had been read narrowly as
being about a shelf of REPLICAS reading as one shelf, and neither page is a
replica of anything. The second ask overrules that reading: one treatment for
every plate is the plainer rule, and a rule with two defensible exceptions in it
is a rule somebody has to remember.
⚠️ The option STAYS in `panel-layout.mjs`, because a page that has to print a
typed string will need it, with a note to delete it if nothing passes it next
time somebody reads that file.
- Both plate asserts read the RENDERED word rather than the typed one, so both
  moved with it. MEASURED: **`shape` 53/53 green**, **`knobs` 37/39 with the same
  two pre-existing reds** it had before, the relay and the audio graph.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"all nameplates are uppercase"*. Every page
with a plate, and the component that draws it.
⚠️ Known and non-obvious: the plate takes `caps`, and pages disagree today.
`muta` passes `PLAITS` already capitalised as a STRING, `knobs` and `shape`
both pass `caps: false` deliberately, and `shape`'s lower case `shape` is
asserted by name. So this is a component default plus the removal of every
page's opt-out plus the asserts that read the rendered word.
⚠️ SHARED, so the session does it once before any page agent starts.

### Done 2026-09-28: knobs, "use rotaty sliders grid"

✅ **DONE.** `createKnobBank` is out and `createControlGrid({ cols: 2, gap:
KNOB_GAP, items: [cutoff, reso] })` is in. The panel row is otherwise untouched,
still first, still `align: 'start'`, and the two rotaries, their controllers,
their homes, the hand, the send gate and the board path are byte-identical.
- **MEASURED at 1280 and at 375: two columns, an 84 px track, a 10 px gap, 94.0
  px centre to centre, at BOTH widths**, because the component fixes its track
  count and track size at the measured pitch and never uses `1fr`. The same
  triple `/muta/`'s lattice reads, which is the point of using the component.
- The gap is passed as an OPTION and never as a custom property, which is the
  trap `/muta/` paid for: `createControlGrid`'s gap is an inline style no custom
  property can reach. `KNOB_GAP` is a const because the new assert reads it too.
- **THE VISIBLE CHANGE IS THAT THE COLUMN TRACK OPENED FROM A DIAL'S WIDTH TO A
  CELL'S HEIGHT.** `pitchFor` is `max(width, height)`, a knob cell is 50.6 wide
  and 84 tall, so the dials went from 58.6 px apart (`--knob-w` 50.6 plus
  `--ctl-gap` 8, which is what a `.pos-knob-row` gives) to 94.0.
- ✅ **AND `RESONA…` IS GONE, MEASURED RATHER THAN HOPED FOR.** `.pos-knob-lab`
  is `max-width: 100%` with an ellipsis and that 100% used to be the 50.6 px
  dial; a cell is 84 px now, so `RESONANCE` renders in full at both widths. That
  was a standing defect recorded in `positron-compose`, it was not the ask, and
  the ask fixed it.
- **MEASURED: 37/39 green with 2 FAILED before, 38/40 green with 2 FAILED
  after.** The one added exists because a flex row and a lattice look alike in a
  screenshot and differ only by a measurement, so a page that quietly fell back
  to a row would stay green on every other claim here: *the two rotaries stand
  one lattice pitch apart, wider than the row it replaced*, reading 94.0 against
  the 58.6 a dial at a row gap would have given. Every number in it is read back,
  the pitch off the component, the gap off `KNOB_GAP`, the dial off its own rect,
  `--ctl-gap` off the root, so a label growing and widening the cell moves both
  sides of the comparison at once.
- ⚠️ **ONE CAVEAT PRINTED RATHER THAN HIDDEN:** the grid's BOX is on the inset at
  55.0, and the first dial's INK starts at 71.7, 16.7 px further in, because a
  cell is the square pitch and a dial is `--knob-w` centred in it. The same 17 px
  `/muta/` wrote down. It was NOT corrected with a margin, because a per-element
  correction is the thing `positron-compose` exists to refuse, and the number is
  in the assert's detail line where a reader of a run sees it.
- The two remaining reds are the standing pair: the relay (nothing answers in
  `studio-1`) and the audio graph (a check run never starts it).
- ⚠️ NEITHER RUN WAS A RUN ALONE, because the `/muta/` agent held a headless
  Chrome throughout, and the known flaky pair went red on the first run and green
  on the second with no code between them. Not chased, on the standing rule.

### control-grid: the pitch is 84 and the lattice steps 94, found 2026-09-28, not asked for

FOUND while putting `/knobs/` on the lattice. `demo/shell/control-grid.mjs`
calls its track the PITCH, and the distance between two centres is `pitch +
gap`: `size()` calls `pitchFor(w, h, 0)` with the gap deliberately zeroed and
then sets `gap` separately, so `--cg-pitch` and `grid.pitch()` both report **84**
while the lattice actually steps **94**.
⚠️ The component's own comment says *"the gap is inside the pitch"*, which is
the one sentence in that file that is not true of the code. The lattice is still
square, because both axes get the same gap, so this is a NAMING AND COMMENT
defect rather than a layout one. It cost one pass to work out.
⚠️ **AND IT IS THE THIRD FILE TO WRITE DOWN THAT THE GAP IS AN INLINE STYLE NO
CUSTOM PROPERTY CAN REACH** (`/muta/`'s stylesheet, `/knobs/`'s, and this).
By this project's own rule that is a thing the component should say in its own
header. If either is corrected, `/muta/`'s comment and `/knobs/`'s new assert
both move with it.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"knobs: use rotaty sliders grid"*. Slug
`knobs`, file `demo/knobs/index.html`. Not started.
⚠️ Known and non-obvious: the page's rotaries are passed to the instrument
panel as `rows: [[[knobs], { align: 'start' }]]`, so they are a row of controls
rather than a lattice. `createControlGrid` is the kit's lattice and `/muta/` and
`/shape/` both wear it. ⚠️ `--ctl-w` and the control grid's own `gap: 10` are
written as an INLINE style no custom property can reach, which is recorded in
`/muta/`'s stylesheet after a comment claimed otherwise for weeks.

### Done 2026-09-28: grains, "hide grains from index. note in handoff: bring it back when we have time"

✅ **DONE, both halves.** `built: false` on the `grains` row in `demo/manifest.mjs`, with a comment there saying it is a hide and not a delete, and the note at the top of `HANDOFF.md` under session 53. MEASURED after, counted and not remembered: **57 demos, 54 built**, one fewer than the morning's 55. `demo/grains/` is untouched and https://positron.studio/grains/ still answers. ⚠️ The note records what the flag really costs: a no-argument `node demo/verify.mjs` walks the BUILT demos, so this page is out of the full run until it returns.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"hide grains from index. note in handoff:
bring it back when we have time"*. Slug `grains`, files `demo/manifest.mjs`
line 735 and `HANDOFF.md`. Not started.
⚠️ Known and non-obvious:
- `built: false` is the flag that hides a row from the index, and the row is
  `{ name: 'grains', group: 'instruments', act: 4, created: '2026-09-12',
  built: true, settleMs: 60000, room: 'fixed', ... }`.
- ⚠️ HIDDEN IS NOT REMOVED. The directory, the page and its URL stay, so
  `https://positron.studio/grains/` still opens. The request is about the
  index only.
- ⚠️ `built: false` ALSO TAKES IT OUT OF `node demo/verify.mjs` with no
  argument, so it stops being covered by a full run. Say so in the handoff note
  beside "bring it back".
- The handoff note is the second half of the request and is not optional: it
  says WHY it is hidden and that it comes back.
- ⚠️ The page's `one` line is *"one granulator, running in this page and on a
  Raspberry Pi at once, with a blend between them"*, and this page's own
  description was once called *"mambo jumbo"*, which is the story in CLAUDE.md
  about descriptions. Nothing to do now, worth knowing when it comes back.

### Done 2026-09-28: knobs, rm "midi is listening"

✅ **DONE, AND THE ANSWER IS THAT THE BUTTON LEAVES RATHER THAN CHANGES ITS
WORDS.** `enable midi` is at the right end of the foot on a visit. After the
press, or on a browser that had already granted, THE BUTTON IS REMOVED FROM THE
FOOT and never reads anything else. The port count moves to the log, where it
already was: `N MIDI inputs to listen to`, or `no MIDI keyboard is plugged in
yet, so nothing will arrive`.
- **WHY REMOVAL RATHER THAN A SUBSTITUTE SENTENCE.** `openMidi` is idempotent, so
  after the first press there is nothing left to press: a disabled control here
  is a SPENT control, not a picture of hardware the way `/circuit/`'s master
  volume is, and `positron-ui` records that a disabled control in this kit means
  bound to nothing. `midi is listening` was a control label narrating a state,
  which is the one thing a button must not do, and a substitute sentence is the
  same shape wearing different words.
- ⚠️ The granted-on-load path is consistent: the button is never seen at all on
  such a browser, and the existing log line says why.
- **MEASURED, AND IT COSTS A JUMP: the foot was 66.0 px tall with the button and
  is 43.0 px without it**, so opening MIDI lifts the report and the picture under
  it by 23 px, once. The room was DELIBERATELY NOT RESERVED, on this project's
  own feedback-panel reading that a reserve exists only for the moments a jump is
  possible and stops at the terminal state, and a permanently reserved band under
  a control that has gone is the empty band that rule refuses. On the only branch
  anybody sees it, the browser's MIDI dialog is up while it happens. ⚠️ **ONE
  LINE TO REVERSE IF THE JUMP IS NOT WANTED**, and the trade is a permanent empty
  band.

### Done 2026-09-28: knobs, "appluy instruiment panel"

✅ **DONE**, with `joined: true` dropped in the same edit as the third item.
`createInstrumentPanel({ rows, keys, plate })` replaces `createInstrument` over
`createPanelLayout`: no bordered case, no scrolling strip, no nameplate in a
corner, and the presence badge is passed as `status:` instead of being
hand-`prepend`ed into `.panel-head-on`, so nothing reaches into a component to
place it any more.
- 🔴 **`instrument-panel.mjs`'S HEADER SAID THIS PAGE WOULD BREAK, AND IT IS NO
  LONGER TRUE.** It reads *"/knobs/ scrolls its whole strip as one"* and
  *"/knobs/ measured 992 px inside a 686 px case and keeps panel-layout"*. That
  was a fact about `.panel-flow` being `width: max-content`, which is the same
  fact that made `full: true` reach nothing here. A glued surface is
  `width: fit-content; max-width: 100%`, so it stops at the room there is.
  **MEASURED at 1280 px, before and after: keyboard box 990.0 px to 646.0 px,
  widest white key 62.0 px to 49.0 px, which is `--k-min`, the component's own
  grid-track floor and not a squash, with 777.0 px of keys scrolling in 646.0 px
  of box.** 777 is exactly the number this page's 2026-09-25 banded measurement
  recorded.
- ✅ **THIS CLOSES THE 2026-09-25 HANDOFF LINE** *"`full: true` reaches nothing
  on `/knobs/`, and it was hidden by a dead assert"*. The option reaches
  something now.
- ✅ **AND IT DOES NOT UNDO THE 2026-09-25 NAMEPLATE INSTRUCTION**, which is said
  in the file: *"knobs: rm right panel. use regular nameplate"* removed a
  vertical rail and asked for the kit's plate, and both are still true. On this
  component the plate IS the foot, reading `knobs` and the badge at one end and
  the MIDI button at the other, which is the original *"add footer with rasperry
  pi online padge. on right add enable midi button"* intact.
- ✅ **AND THE SEAM THIS PAGE ASKED FOR IN 2026-09-25 AND HAD TO REFUSE NOW COMES
  FREE.** *"on each button group have horizontal panel separator edge to edge"*
  was refused because a case has no vertical rhythm between bands, MEASURED at
  0.0 px three times over. A glued surface is seams by construction.
- ⚠️ THE KEYBOARD HAD TO BE BUILT BEFORE THE PANEL: `createKeyboard` appends into
  a host unconditionally and hands back no detached form, so it is built into a
  throwaway div and `kb.el` is what the panel is given, which is what `/kit/`'s
  specimens do and their comment says why.
- **MEASURED: 36/38 green with 2 FAILED before, 37/39 green with 2 FAILED
  after**, page asserts 34 to 35, the before taken by restoring
  `git show HEAD:demo/knobs/index.html` and running it on today's `shell.mjs`.
  🔴 **THE TWO REDS ARE THE SAME TWO ON BOTH RUNS, IDENTICAL WORDING AND CAUSE,
  AND NEITHER IS THIS CHANGE**: `the relay delivered the control messages this
  page sent · 0 of 0 came back`, because nothing answered in `studio-1` and the
  Raspberry Pi is not on the relay, and `this page makes no sound of its own`,
  because a check run never starts the audio graph. Not re-run to chase a green.
- Six asserts rewritten and one added. The new one grades BOTH halves of the
  other ask: *opening MIDI takes its button off the foot, and the word it leaves
  with is still a press*. One correctness note carried into the code: all three
  arguments of `d.assert` are evaluated before it runs, so a `null` reached
  inside a failure message throws out of the whole check block and silently takes
  every assert after it.

⚠️ **LEFT, ALL PRE-EXISTING:** `RESONA…` still truncates on the
cutoff/resonance row, which is the standing compose item that a label which
truncates is in the wrong place and a knob label has nowhere else to be. The keys
row still reads as cut off at the right edge with no fade or peek, true of every
scroller on the site and strictly better than before, because what scrolls is now
the keys rather than the whole instrument hanging out of a case. `knob.mjs`'s
unguarded `setPointerCapture` still means no check here drives the real pointer
path. The `?board=1` path is ungraded on this desk.

⚠️ **ASKED, VERBATIM 2026-09-28, right after the panel line above:** *"rm "midi
is listening""*. Slug `knobs`, file `demo/knobs/index.html`, lines 668 and 673.
Not started, and WHICH PAGE was not said, so it is filed here because `knobs`
is the page that carries that exact string and was the subject of the line
before it. ⚠️ Confirm at fan-out.
⚠️ Known and non-obvious:
- It is the `enable midi` button's own text, set in two places: line 673 right
  after `createMidi` returns, and line 668 in `onPorts`, where it is one of a
  pair with `midi is on, nothing plugged in`. The button is also `disabled` at
  that moment.
- The comment at 636 says the text is doing a job: *"AND IT IS ASKED ONCE.
  `openMidi` is idempotent, so a second press is not a second prompt. The
  button says so by going to `midi is listening` and staying there."* So
  removing the words means deciding what a pressed, disabled button says
  instead, or that it disappears.
- The log lines beside it (`N MIDI inputs to listen to`, `no MIDI keyboard is
  plugged in yet`) are separate and were not asked about.



⚠️ **ASKED, VERBATIM 2026-09-28:** *"knobs: appluy instruiment panel"*. Slug
`knobs`, file `demo/knobs/index.html` (2,186 lines). Not started.
⚠️ Known and non-obvious:
- The page wears `createInstrument` from `/shell/instrument.mjs` today (line
  33), same starting point as `shape` and unlike `tom`, which is on
  `createPanelLayout`.
- The panel asked for is `demo/shell/instrument-panel.mjs`
  (`createInstrumentPanel`). FIFTH page wanting it now, with `tom`, `shape`,
  `muta` and the global glue line, so the kit is settled once by one agent
  before any page agent starts.
- The page carries a keyboard, a knob bank, a board and a diagram, and a
  diagram is `positron-diagram`'s rule as well as the panel's.

### Done 2026-09-28: dump, "all buttons secondary"

✅ **DONE.** One flag: `primary: true` dropped from `{ id: 'listen', label: 'Listen' }` at `demo/dump/index.html:137`, which was the only primary on the page. MEASURED before and after: **25/25 green, 19 page asserts, identical**, down to the same `518.39 px` on the three table-geometry asserts. `Ask for versions` and the `Clear` button under the traffic table were already ordinary. ⚠️ The one hazard was checked rather than assumed: `demo/verify.mjs:555` clicks `.pos-controls button.pos-pri` as a fallback to arm a page whose text fields refuse focus, and `/dump/` has no input and no textarea, so that path never runs here. Control order is byte for byte unchanged, so `listen` is still control 0 and still the one given `settleMs`. Nothing in the page's words named the accent, so no sentence went stale.

⚠️ **NOTICED AND LEFT ALONE, OUTSIDE THIS JOB:** the `Clear` button under the traffic table sits hard against the table's right edge and reads tight at both widths. It is in `.kpad-right`, a different container, and predates this edit.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"dump: all buttons secondary"*. Slug
`dump`, file `demo/dump/index.html`. Not started.
⚠️ Known and non-obvious:
- ✅ MEASURED by reading the page today: there is exactly ONE primary button on
  it, `{ id: 'listen', label: 'Listen', primary: true }` at line 137. So the
  edit is dropping that one flag, and `Ask for versions` and the `Clear` button
  under the traffic table are already ordinary.
- `primary` is `shell.mjs` line 142, which puts `pos-pri` on the button, and
  `pos-pri` is `shell.css` 650. Nothing else on this page uses it.
- ⚠️ NOT A KIT CHANGE. `pos-pri` stays as it is for every other page; this is
  one page asking for no primary.
- 🔴 CONTROL ORDER MUST NOT MOVE. Line 130 records that control 0 is the one
  the harness gives `settleMs` to and that putting anything in front of
  `listen` moves every other control's press, which has already cost this
  project an intermittent failure. Removing a FLAG is safe; removing or
  reordering a control is not.

### Done 2026-09-28: tom, "apply instrument panel"

✅ **DONE.** The transport bar, the grid and the nameplate are ONE glued surface
built by `createInstrumentPanel`, where they were three blocks a page gap apart.
Gluing them is a claim that they are one object and it is true here: the bar
drives the grid, the grid is the bar's own position surface (`scrub: false`), and
the plate is what the two of them are called. `shape()` reads the rendered
children back as `controls, controls, plate`.
- ⚠️ **THE GRID KEEPS `createPanelLayout` AND KEEPS ITS CASE**, which is the part
  worth knowing. `instrument-panel.mjs` says in its header that it is for an
  instrument with NO column and NO scroller, and tom has both: 64 label rows
  beside 16 steps that have to scroll rather than drag the document. So the panel
  layout goes INSIDE a row. `cased: true` supplies `--panel-pad: 20px`, so the
  label column and the steps keep their inset from the component rather than from
  a number typed on the page.
- ✅ **THE BORDER AND THE RADIUS COME OFF BY THEMSELVES.** `.panel-case` reads
  `--edge` and `--r`, `.pos-glue.pos-glue > *` sets both to 0 on the row, and a
  custom property inherits. NO `.pos-glue > .panel` patch was written, which
  `positron-compose` states as a prohibition rather than a preference. MEASURED:
  the case draws **0px at radius 0px** while the surface around it draws **1px at
  radius 4px**.
- **THREE PAGE STYLESHEET RULES ARE GONE**, and they are gone because the plate
  moved rather than because anybody swept them: `.tom { position: relative }` and
  the two `.tom > .panel-plate` absolute-position rules existed only because the
  plate sat in the flow at 31 px tall and pushed the first pad down to 62, asked
  as *"move grid upwards"*. A plate at the foot takes nothing off the top. Two
  dead symbols removed with them: `const plate = panel.plate`, declared and never
  read, and `createNameplate`, imported and never called.
- **MEASURED: 37/37 before, 39/39 green after, 0 requests, 0 failed, 0 console
  errors.** The +2 are the two asserts added, nothing was removed and no gate
  changed. The new pair: *the transport, the grid and the nameplate are one glued
  object, in that order*, read off `shape()` and not off the call, and *the
  grid's case gives up its own edge inside the panel, and the panel keeps one*,
  whose negative half is the point, because a border that has gone everywhere is
  not one border, it is none.
- The page still fetches nothing by default. `PACK` untouched, counters
  untouched, and the run asserts it.
- A stale claim beside the edit was corrected: the comment read *"Sixty four
  steps is about 1,150 px and a phone is 390"* in the present tense about a grid
  that has been sixteen steps since 2026-09-21 and a phone that has been 375
  since 2026-09-26.

🔴 **A STANDING HOLE BEHIND THAT "39/39 GREEN", TRUE BEFORE THIS CHANGE AND
UNCHANGED BY IT: 13 OF TOM'S ASSERTS HAVE NOT RUN SINCE THE PACK LEFT THE
REPOSITORY.** Every reading check is behind `?pack=<url>` resolving, and the page
logs *"the pack here is not published, so the reading checks did not run"*. The
count is what says so, which is exactly why this project reads the count.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"tom: apply instrument panel"*. Slug `tom`,
file `demo/tom/index.html` (1,983 lines). Not started.
⚠️ Known and non-obvious:
- The page wears `createPanelLayout` and `createNameplate` from
  `/shell/panel-layout.mjs` today (line 120) and imports neither
  `instrument.mjs` nor `instrument-panel.mjs`. So this is the OTHER starting
  point from `shape`, which is on `createInstrument`, and the two requests are
  not the same edit.
- The panel asked for is `demo/shell/instrument-panel.mjs`
  (`createInstrumentPanel`), glued rows over `demo/shell/glue.mjs`.
- ⚠️ SHARES THE KIT WITH `shape`, `muta` and the global glue line, so the kit
  side is settled once by one agent before any page agent starts.
- This page fetches NOTHING by default since the pack left the repository, and
  takes an explicit `?pack=<url>`. Last measured green at 59/59, 0 requests, 0
  failed. That is the number this change is read against.

### Done 2026-09-28: pack, "make support of any wavs in zip and change desc accrodingly"

✅ **DONE, with one third handed on.** A zip of plain WAVs opens as a sample set:
`fill([], [], wavs)`, the footer carries the file name, the log reads `N of M
samples read`, and `tabs.enable` switches PATCHES and SESSIONS off and moves the
open tab to SAMPLES by itself. Two more branches changed with it: a zip holding
loose `.syx` AND WAVs now shows both, where it was passing an empty third list
to a `fill` that has always taken three, and the final refusal reads `holds no
Circuit pack, no patches and no samples` because it can now be wrong about a
third thing. The WAV loop `openPack` had inline is one function, `readWavs`,
used by both, so there is no second copy.
- **THE DESC IS THE SAME SENTENCE IN BOTH PLACES AGAIN:** *"open a Circuit pack
  or any zip of WAVs and look inside its patches, sessions and samples"*, in
  `demo/pack/index.html:205` and `demo/manifest.mjs`. What it trades away is `a
  loose sample set`, which named the bulk SysEx transfers, and those still open.
- **MAC RESOURCE FORKS ARE DROPPED BY NAME, ON BOTH SPELLINGS**: an entry under
  `__MACOSX/`, or a basename starting `._`. Not by size, because a fork is a few
  hundred bytes and so is a short drum hit. Both tests, because a fork that has
  been extracted and re-zipped keeps the `._` and loses the directory.
- ✅ **MEASURED ON THE REAL CORPUS RATHER THAN REASONED ABOUT**, six zips in
  `tmp/packs/` run through the real `unzip.mjs` and `circuit-sample.mjs` in
  node: **989 named `.wav` entries, 88 forks dropped, 901 rows**. `one-shots.zip`
  is the exact shape: 40 real WAVs each with a 239 to 308 byte
  `__MACOSX/one-shots/._<name>.wav` beside it, so without the filter it shows 80
  rows, half of them alarms about the archiver's own packaging.
- **MEASURED: 30/30 green with 24 page asserts after, 0 requests, 0 failed.**
  Four new asserts, all of which run on the deploy because they need no pack and
  no corpus, two of them negative controls. **PROVED BY BREAKING IT:** with the
  fork filter disabled the same run reads **26/30, 4 red**, and those 4 are the
  only asserts on the no-pack path that `readWavs` can reach. ⚠️ The BEFORE
  figure, 26/26 and 20, is DERIVED and not measured, because the harness was not
  run before the edit. Said plainly rather than quoted as a reading.
- ⚠️ **AND THE 59/59 IN THIS FILE AND IN CLAUDE.md IS `pack` AND `tom`
  TOGETHER**, not either page alone. Caught independently by two agents today.

✅ **AND THE LAST THIRD LANDED THE SAME DAY: `demo/shell/circuit-sample.mjs`
READS ALL 901 NOW, AGAINST 749.** 24 bit PCM (three bytes little endian, sign
extended from the top byte, assembled by hand because there is no `getInt24` and
a shifted signed byte puts the sign in the wrong bit) and a documented stereo
mixdown. **901 read, 901 measure, 901 draw, 901 play, 0 refused**, where it was
749 with 152 refused, the 152 being 100 at 24 bit and 52 at 16 bit stereo.
- 🔴 **AND NON-REFUSAL IS NOT CORRECTNESS, SO THE ARITHMETIC IS GRADED AGAINST
  ffmpeg**, a decoder nobody here wrote. One file of each of the five shapes,
  decoded to floats and compared sample for sample: **worst single sample
  difference 0, worst per channel peak difference 0, 0 frame counts disagreed.**
  Exactly equal, not approximately. That arm pipes bytes to ffmpeg's stdin so the
  test still writes nothing to disk, and skips with a named line where ffmpeg is
  absent.
- **THE MIXDOWN IS THE MEAN, exported as `MIX` so a reading can be attributed to
  it.** The sum invents clipping the file does not have, two correlated channels
  at 0.8 reading 1.6. The left channel alone reports silence for a hard panned
  sample that is not silent. The mean cannot leave -1 to 1, so `clipped` keeps
  meaning *this file touches the rail* rather than *our arithmetic did*.
- ⚠️ **A PEAK AFTER A MIXDOWN IS A DIFFERENT NUMBER FROM A PEAK PER CHANNEL, so
  `content()` REPORTS BOTH** and the comparison is a cell rather than an
  argument. MEASURED over the 150 real stereo files: **0.46642 at worst, 0.99996
  at the median, exactly 1 at best**, 39 landing on 1, 15 below 0.9, 26 dual
  mono. The widest file in the corpus reads at less than half the level of its
  own loudest channel, which is a real fact about a wide sample and is
  indistinguishable from a quiet one unless both numbers are on screen.
- **THE ONE CASE WHERE THE MEAN LIES IS NAMED:** two channels in exact anti phase
  average to digital silence, so `content().cancelled` is set when the mix is
  silent and a channel is not, because *this file is empty* and *this mixdown
  cancelled* are two findings and a bare zero is the wrong one. **Zero anti phase
  files in the 901**, so it is a guard against a shape rather than a report of
  one, and the module says so.
- **STILL REFUSED, BY NAME, EACH WITH ITS COUNT IN THE SENTENCE AND NONE OF THEM
  THROWING:** 32 bit float, turned away at the FORMAT gate rather than the depth
  gate because float is a different number line rather than a wider integer and
  is allowed to run past 1.0; 8 bit, which is unsigned with a 128 bias where every
  other depth is signed, so getting it wrong halves the level and adds a DC
  offset, which is exactly the plausible audio this module exists not to invent;
  32 bit integer; `WAVE_FORMAT_EXTENSIBLE` (0xFFFE, how most DAWs would have
  written these very files, and measurably not how these were: all 100 declare
  plain tag 1); and more than two channels. Zero float files among the 965 real
  WAVs on this disk, so nothing here could grade it.

🔴 **THREE THINGS FOUND ON THE WAY, AND THE FIRST IS A LIVE CRASH REACHABLE FROM
A STRANGER'S ZIP.** `frames` came from the DECLARED block align while the reader
stepped by the DERIVED one, so a file declaring a block align smaller than its own
frame claimed more frames than it had bytes, and `toMono`, `content` and
`summarise` all died inside a `DataView`. MEASURED before the repair: 8 frames
claimed over 8 bytes, 16 bytes asked for. The module's whole stance is that a
refusal is a value a caller can show and nothing throws, and this was the
exception nobody had met because until today only 48 kHz 16 bit mono could reach
it. Clamped now, with `framesClamped` saying so. 0 of the 901 need it.
🔴 **AND WIDENING `DEPTHS` WOULD SILENTLY HAVE WIDENED THE SLOT WALKER'S SYNC
CHECK.** `slotsIn()` tested `DEPTHS.includes(bits)` as one of its three sync
conditions, so teaching the decoder 24 bit would have made the walker twice as
likely to find a sample table in noise, on a completely different corpus: 16 bit
on all 1,536 Circuit slots measured. One list doing two jobs. Split into
`SLOT_DEPTHS`, still `[16]`, and every negative control still refuses.
🔴 **AND THE CHUNK WALKER FINALLY HAS A REAL CORPUS, WHICH THE MODULE'S HEADER
SAID FOR A WEEK IT COULD NOT HAVE.** All 64 samples in a Circuit pack are `fmt `
then `data`, so only synthetic fixtures could grade it. These 901 files carry **18
distinct chunk layouts**, and **265 put their audio somewhere other than offset
44, the deepest at byte 736**. Only 84 are plain `fmt `+`data`. **247 carry a
`bext` broadcast chunk 602 bytes long that a 44 byte assumption would have played
as audio, and 11 put `bext` BEFORE `fmt `**, which a reader expecting the format
chunk first would read as having no format chunk at all. All 11 parse, and it is
asserted.

**MEASURED: the module test 52/52 before and 84/84 after, sabotages 5 to 10,
negative controls 6 to 9.** ⚠️ The brief's "57 asserts, seven sabotages" does not
reproduce, and the reason is worth knowing: it is 52 on this machine because
`tmp/personal/New Pack.circuitpack` left this repository on 2026-09-24 and the
test early exits on it.
⚠️ **AND THAT EXIT STRANDS 58 OF THE TEST'S 142 ASSERTS ON ANY CHECKOUT THAT
FOLLOWS CLAUDE.md**, including the whole `tmp/packs` sysex stream corpus block,
which grades files that ARE on this disk and is skipped only because a different
file is not. The new corpus section was put ABOVE the exit. The repair is to wrap
lines 1130 to 1731 in an existence test rather than exiting, and it was reported
rather than done.

🔴 **AND IT LEFT `/pack/` RED BY ONE, WHICH THE SESSION FIXED.** The assert
written that morning had as its entire subject a fixture built to be undecodable
that had become decodable. `Room.wav` is an ordinary row now and the assert is the
positive one. ⚠️ **THE REFUSAL BRANCH IS STILL LIVE CODE, so it got a subject that
cannot be decoded away next time the module widens**: a `Surround.wav` at six
channels, refused by name. Adding a row moved three other counts, which were
updated with it. **MEASURED after: `/pack/` 31/31 green, `circuit-sample-test`
84/84 green, `/tom/` 39/39 green.**

⚠️ **ONE ADMISSION WORTH READING IN THE DIFF: a rounded reading is not a fact, and
it was nearly shipped.** The first survey printed the mixdown ratio median as
`1.0000` through `toFixed(4)`, that went into a code comment, and the assert built
on it went red, because it is **0.99996**. Both carry five places now and the
comment records the mistake. It is the same shape this project has paid for at
larger scale.

🔴 **THE DEFECT THE REAL CORPUS FOUND, WHICH NOBODY ASKED ABOUT AND WHICH
`fill()` THREW ON: 152 OF THE 901 ARE STEREO OR 24 BIT.** `readWave` reads their
headers perfectly so `summarise` answers `ok: true`, but `toMono` decodes only 16
bit mono, so `peak`, `sound`, `lead` and `trail` all came back `null` and the row
builder called `r.peak.toFixed(2)` on `null`. It could not arise before today:
every WAV in a `.circuitpack` is 48 kHz 16 bit mono, 64 of 64. The measured
shapes across the 901: 534 at 44.1/16/mono, 215 at 48/16/mono, 98 at
44.1/24/stereo, 52 at 44.1/16/stereo, 2 at 44.1/24/mono.
✅ Repaired in the page so it is honest rather than broken: the header cells stay
and the measured cells go EMPTY rather than zero, and **the play button follows
the audio rather than the header**. It read `!r.ok`, which was the same thing
while every reachable file was 16 bit mono, so on `one-shots.zip` every row would
have offered a live Play that logs a refusal and makes no sound, which is the
control that lies. It is `!mono.ok` now.
⚠️ **THE REST IS `demo/shell/circuit-sample.mjs` AND IS WITH AN AGENT.**
`DEPTHS` is `[16]` and `toMono` refuses anything not mono, so 152 of 901 open
with no peak, no sound share, no waveform and no playback. "Support any wavs" is
two thirds done until that module gains 24 bit and a documented mixdown, and its
own header says why the limits are there: nothing but 16 bit mono has ever been
graded against a real file, so it wants a fixture and a sabotage rather than a
widened constant.

⚠️ **THREE SMALLER THINGS LEFT, NONE ASKED FOR:** a loose `.wav` dropped on its
own is still refused, because `accept:` does not list it and adding it moves the
hint string an assert measures. `Roland_Classics.zip` shows its bulk transfer and
ignores its 48 loose WAVs, since the `.syx` branch wins and returns first, which
keeps the existing `48 filled and 16 empty` assert true. And NOTHING HERE RAN
AGAINST A REAL `.circuitpack`, because there is none on this machine since
2026-09-24, so the `openPack` path is graded by reasoning and by the node run
over the real zips rather than by the harness.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"pack: make support of any wavs in zip and
change desc accrodingly"*. Slug `pack`, files `demo/pack/index.html` and
`demo/manifest.mjs` line 574. Not started.
⚠️ Known and non-obvious:
- ✅ MEASURED by reading the page today: a zip of plain WAVs is REFUSED right
  now. `openZip` at 1135 filters for `.circuitpack`, `.circuittrackspack` and
  `.syx`, and a zip with none of those falls through to
  `drop.say(`${name} holds no Circuit pack and no patches`, 'bad')`. WAVs are
  only ever read on the path INSIDE a pack, at line 1339.
- The reading side already exists and does not need writing: `circuit-sample.mjs`
  (`readWave`, `summariseWave`, `summariseAll`) is what line 1364 calls, so
  this is a filter and a branch in `openZip`, not a decoder.
- ⚠️ The `__MACOSX/._<name>` resource-fork trap is already documented on the
  `.syx` branch and applies the same way to WAVs: a Mac-made zip carries a few
  hundred byte twin beside every real file that is a `.wav` by its name and
  nothing at all by its content.
- `accept:` at line 250 already takes `.zip`, so the drop control needs no
  change.
- 🔴 THE DESC IS TWO STRINGS AND THEY ARE THE SAME SENTENCE: `what:` at
  `demo/pack/index.html:205` and `one:` at `demo/manifest.mjs:574`, both
  reading *"open a Circuit pack or a loose sample set and look inside its
  patches, sessions and samples"* today. One sentence, no colon, no semicolon,
  no dash, no second clause bolted on, and they change in the same commit as
  the behaviour.

### Done 2026-09-28: shape, "apply instument panel with secitons. rm put back button"

✅ **DONE, AND THE STOP SURVIVED.** The page wore `createInstrument` over
`createPanelLayout` and passed `side: null` and `flow: false`, two options whose
only job was to switch the case's own parts off. What is left after switching
both off IS `createInstrumentPanel` with no picture row and no keys row, so it
builds `createInstrumentPanel({ full: true, plate: { name: 'shape', caps: false
} })` and the nine sections the Circuit reference publishes are nine glued rows,
one per heading. MEASURED: `panel.shape()` reads nine `controls` rows and a
`plate`, 52 lanes, at every width. They were nine blocks 40 px apart before.
- A part switch is a HIDE now, not a rebuild: a part's rows are built once and
  kept, and `.pos-rows-r[hidden]` is `display: none`, which takes no gap, so the
  seams are right with a part's rows off screen. Graded at 4 of 13 sections drawn
  for Session.

🔴 **THE STOP FOR THE RUNNING HANDS IS THE SECOND PRESS OF THE `move everything`
GLYPH.** While anything is moving by itself the control redraws as `↺`, announces
itself as `put everything back`, and its press calls `putBack()`, which stops
every hand on every part and sends every parameter this page has moved home. When
nothing is moving it is `⇄ move everything` again.
- **WHY THERE:** the page's written defence is about the HANDS, not the values,
  and the control that starts them is the one that should stop them. One idea,
  one control, on one axis.
- ✅ `putBack()` IS NOT DEAD CODE WITH A COMMENT ON IT. Its only caller is
  `hand.onclick` in its `back` state, and the check reaches it by pressing the
  REAL button, so its assert is stronger than it was: **54 control changes across
  all three parts, against 3 before.**
- The state is read off `handsRunning`, counted in `handSaid`, the one place both
  edges of a hand arrive, so a hand that stops on its own at the ten minute
  ceiling or because the tab went to the background turns the control back by
  itself.
- ⚠️ **IT FLIPS ON `running` ALONE AND DELIBERATELY NOT ON `changed()`.** A
  control that became `put everything back` because somebody nudged one slider is
  a control that changed its mind under a reader's hand, and the next press would
  undo the nudge they had just made.
- `setSymbol` rather than `textContent`, so the ink stays centred, which is
  `symbol.mjs`'s own rule. `↺` U+21BA has no emoji presentation, the same test
  `⇄` U+21C4 passed when the button was built.

- **MEASURED: 50/50 green with 44 page asserts before, 53/53 green with 47
  after.** One left, four arrived, five reworded in place. The one that left was a
  measurement about a case the page no longer has.
- 🔴 **SABOTAGED TO PROVE THEY BITE, TWICE.** `caps: true` turns the plate assert
  red reading `SHAPE`, which re-runs a sabotage the page's own notes had flagged
  as not re-run since the plate moved. `syncHand` made a no-op turns **four red at
  once**, and those four ARE the argument for the arrangement: the control never
  offers the way back, the second press scatters again instead of stopping (**40
  still moving**), nothing goes home (**54 left moved**), and the transition never
  happens.
- 🔴 **AND ONE OF THOSE FOUR CAME BACK GREEN IN ITS FIRST FORM.** `and it goes
  back to offering a move` originally read only the state AFTER the second press,
  and a control stuck on `move everything` forever satisfies that perfectly. It
  was strengthened to read both states and the sabotage was re-run. Recorded in
  the page.
- **THE CONTROL ROW, MEASURED OFF REAL RECTS AT THE FOUR WIDTHS, confirming line
  46's prediction:** 390 px goes from three lines to **two**, 560 px from two to
  **ONE** at 464.2 of content in a 528 px column, 756 and 1280 stay one line. No
  sideways overflow at any of the four, `scrollWidth - clientWidth` is 0 every
  time.
- ⚠️ **THE PLATE MOVED FROM THE CASE'S TOP RIGHT TO THE FOOT, WHICH REVERSES**
  *"use nameplate on top right"* from 2026-09-25. `addRow` inserts above the
  keyboard and the foot however late it is called, precisely so a panel cannot be
  assembled in another order, so applying the component means accepting its order.
  The alternative was a page-local plate outside the component, which is the
  hand-rolled defect the component exists to end. Written up in the page as a
  reversal rather than slipped in.

🔴 **THE REAL LOSS, NAMED: a parameter moved BY HAND and never scattered has no
one-press way back from this page any more.** The glyph offers the way back only
while something is running. The undo is the instrument's own, which the page has
always said in the log: a control change moves the live voice and never writes
flash, so reloading the session on the Circuit brings the patch back. Judged a
smaller cost than a control that flips meaning when you nudge a slider, and it is
reversible on a word.
⚠️ **AND NOBODY HAS PLAYED THE CIRCUIT FROM THIS PAGE SINCE THE CHANGE.** `emit`,
`toBytes` and the channel map are untouched and the byte asserts are unchanged,
but *"shape still works"* is a fact from 2026-09-21 rather than from today. The
390 px arrangement is measured but not asserted, because `demo/verify.mjs` runs
at 756 px only.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"shape: apply instument panel with
secitons. rm put back button"*. Slug `shape`, file `demo/shape/index.html`.
Two requests. Not started.
⚠️ Known and non-obvious:
- The page wears `createInstrument` from `/shell/instrument.mjs` today
  (imported line 142, built line 631). The panel asked for is
  `demo/shell/instrument-panel.mjs` (`createInstrumentPanel`), and "with
  sections" is its glued rows. Line 577 already records that other pages wear
  `createInstrument` over `createPanelLayout`.
- 🔴 `put back` HAS A WRITTEN DEFENCE IN THE PAGE AND IT IS SPECIFIC, so this
  removal is a reversal rather than a tidy-up. Line 39: *"`put back` is the
  only way out of forty sliders moving by themselves, and the page's own note
  on `move everything` says a button that starts forty hands with no button
  that stops them is a page somebody has to reload."* It is `putBack()` at 938,
  the button at 506, and it calls `stopEveryHand('put back')`, which is the
  only stop for every running hand across every part.
- ✅ The page also records the answer that survives the removal, at 911: a
  control change moves the live voice and never writes flash, so reloading the
  session on the instrument brings the patch back. If `put back` goes, THE
  RUNNING HANDS STILL NEED A STOP, or `move everything` starts forty of them
  with no way to end them.
- Line 46 measured the row at four widths: dropping the fourth control
  (100.6 px) takes 560 px from two lines to one.
- Line 1191 and the note at 240 say there are asserts on `put back` and that
  it is deliberately outside `.pos-controls` so the suite never writes to an
  instrument. Removing it moves the assert count.

### Done 2026-09-28: wish, "rm on button on wish, just keep x button"

✅ **DONE.** The `on` check is gone from every connection row, which now carries
one control, the `×` square, in the same reserved 72 px column, so the picture
beside it did not move. `createCheck` was this page's only use of
`/shell/check.mjs` and the import went with it.
- **A ROW THAT EXISTS IS CONNECTED.** `show()` gained `connectAll()`, which
  connects every row graded `ok` and stamps `data-connected="1"` when the desk
  really made the link. `×` was already disconnecting before removing, so it is
  now one gesture that takes the link down, sends the 32 quietening messages and
  clears the row.
- ⚠️ TWO THINGS HAD TO MOVE WITH IT. `show()` now takes the previous answer's
  links down at its head, because a destroyed row that kept its link would be an
  instrument routed by a sentence no longer on screen with nothing left on the
  page to stop it, and a check calling `show()` twice was exactly how a live
  link would have leaked into a run. `connectAll` is ONE promise chain rather
  than one per row, so a second answer cannot start connecting while the first
  is still opening the desk.
- ✅ **NOTHING CONNECTS BY ITSELF.** `show()` is reachable only out of a press
  on `Interpret`, on a prepared row, or on a release of `Hold to talk`. A page
  load calls `clearAnswer()`, which lays one empty row and never calls `show()`.
  Under `?selfcheck=1` the desk branch returns stand-in ports and
  `requestMIDIAccess` is never reached at all.
- **MEASURED: 76/76 green and 70 page asserts BEFORE, 77/77 green and 71
  AFTER.** The one added is the hole the switch used to cover by snapping back
  to off: a row the desk could not make is graded `ok`, holds 0 links, carries
  no `data-connected`, and the log names the port. Every other line is a rewrite
  in place, so nothing went silent. The connect assert drives a REAL GESTURE,
  `rowEls()[0].click()` through `useExample`, `Interpret`, `askBox`, `think` and
  `post`, rather than calling `connect()` or `show()`.
- The `what` and the manifest `one` are the same sentence again: *"say which
  instrument should play which, and a language model makes the connection on the
  desk"*. The old one promised *"a connection you can switch on"*, a control a
  visitor would now look for and never find. The manifest comment that described
  the switch was rewritten by the session in the same commit.

⚠️ **LEFT OPEN, AND IT IS A DECISION RATHER THAN A DEFECT: an allowed row that
connected and an allowed row whose instrument is not plugged in look the same.**
The log says `nothing on this desk answered to <name>, so that connection was
not made` and the row carries no `data-connected`, which is what the new assert
reads, but a reader looking at the row sees one picture either way. The switch
used to carry that by snapping back to off. No visual state was invented,
because dimming a whole row is a bigger claim than the ask. A rule keyed on
`.wish-conn:not([data-connected])[data-verdict="allowed"]` is one line whenever
it is wanted.

⚠️ **AND A KIT GAP, NOT FIXED:** `shell.css`'s glyph square is scoped to
`.pos-controls`, so this page carries its own copy of `button[data-glyph="1"]
{ width: 34px; height: 34px }` and taking it away lays the button out at 45.8
px. That was already true and already in the page's comment. It matters more now
that this is the row's only control. `positron-ui` records `pos-sm` as the small
button variant this remove button was waiting for, which is the same gap from
the other side.

⚠️ **ASKED, VERBATIM 2026-09-28, WITH A SCREENSHOT** of a connection row's
right hand column showing an `on` checkbox above an `×` button: *"rm on button
on wish, just keep x button"*. Slug `wish`, file `demo/wish/index.html`
(4,800+ lines), in `fitActions()` at line 2176. Not started.
⚠️ Known and non-obvious:
- The `on` check is not decoration. Its `onChange` calls `connect(c)` and
  `disconnect(c)`, so it is the page's only path to MAKING a connection on the
  desk. Removing the control means deciding what connects instead, or that
  nothing does and the page only lists and removes.
- `createCheck` from `/shell/check.mjs` is the only thing the page imports it
  for, so the import goes too if nothing else uses it.
- FOUR asserts drive it by reference: lines 4714, 4719, 4721, 4756, 4761 and
  4781 all read `c.live`, and `4781` asserts a row that CANNOT connect has no
  `live` at all. Those asserts move or go, so the assert count is the reading
  afterwards.
- The comment above `fitActions` records why neither control is in
  `.pos-controls`: `demo/verify.mjs` presses `.pos-controls button, .tbar-x`
  in document order, so a remove button there would empty the page mid-run and
  a switch there would put a suite's hand on somebody's instrument. Keep the
  `×` where it is.

### Done 2026-09-28: muta, "arhive/rmwarps and rm all routing code around it. apply instument panel. no label on patch selctor. move visualization to top of instrument"

✅ **ALL FOUR DONE.** Warps is out of `demo/muta/index.html` and out of
`demo/muta/muta-worklet.js`, where the whole `WarpMod` class, its `W` table and
its `registerProcessor` line came to 208 lines. 640 insertions and 1,468
deletions across the two files.
- **THE ROUTING, WHICH IS WHAT THE ASK NAMED.** It was `node -> warpNode ->
  wetGain -> destination` with a dry bypass `node -> splitter(ch 0) -> dryGain ->
  destination` and a 20 ms crossfade between them driven by the effect's switch.
  Both gains, the crossfade and `wetFade` are gone. ⚠️ **THE SPLITTER STAYS AND
  IS NOW THE WHOLE GRAPH**, and that is not routing around an effect: Plaits
  renders `out` on channel 0 and `aux` on channel 1, which are TWO SOCKETS rather
  than a stereo pair, so connecting the node straight to a destination would put
  two different sounds in two ears. Channel 0 is the jack a rack would patch.
- ⚠️ **LEFT ON DISK AND FETCHED BY NOTHING:** `demo/muta/vendor/warp.wasm`,
  `vendor/LICENSE-warps`, `vendor/PROVENANCE-warp.json` and
  `build/warp_shim.cc`. `build/build.sh` compiles that shim into that artefact
  and there is no emscripten here, so removing them is a build script change
  somebody able to run it has to verify. No `archive/` copy was made, because the
  history is the archive.
- **THE COST WAS FACED RATHER THAN SIDESTEPPED.** `bands` was called *"THE CELL
  THIS PAGE EXISTS TO PRINT"* and it is Warps' filter bank, so it went. `peak`
  changed MEANING in the same edit: it read the effect's meter because that was
  the end of the chain, and it reads the oscillator's now because that is the end
  of the chain.
- **The panel, the unlabelled selector and the picture on top are ONE call**,
  `createInstrumentPanel({ viz, rows, plate: { name, status, patch }, cls })`. A
  `viz` row is `pad: false` and nothing is ever inserted above it, so "top of
  instrument" is the component's construction rather than a rule this page keeps.
  MEASURED: the picture spans 35.0 to 558.0 px inside a row of 35.0 to 558.0 px.
- ⚠️ THE PICKER IS STILL BUILT WITH `label: 'model'` ON PURPOSE, so the assert
  has something to catch: with no label in the source there would be nothing to
  strip and nothing to grade. `.plai-pick`, the wrapper div it used to sit in,
  had to go, because the component tests the control it is handed for `.pos-pick`
  and a picker inside a div is not a picker to that rule.
- ⚠️ **THE PANEL IS ITS OWN SIZE NOW, NOT THE PAGE'S, AND IT IS THE ONE VISIBLE
  CHANGE TO LOOK AT.** `.pos-rows` is `width: fit-content` and `full` was not
  passed, so it measures 34.0 to 559.0 px where the case ran 34.0 to 722.0. That
  is `positron-compose` section 3, an instrument is as wide as the instrument,
  written down after four knobs on a pedal floated in a 660 px band and the
  verdict was *"plainly awful"*. **One word, `full: true`, reverses it**, and the
  assert changes back with it.
- `Test tone` lost its home in `.panel-head`'s grid and is a row of its own,
  added late because the component guarantees insertion above the keys and the
  plate. **The two `@media` blocks that re-placed it at 700 and 560 px are gone
  with the grid they were arguing with.**

- **MEASURED: 55 total with 49 page asserts and 1 FAIL before, 48 total with 42
  page asserts and 48/48 green after.** 🔴 **NINE ASSERTS WENT AND HAVE NO
  REPLACEMENT**, named rather than buried, because a lost assert is the thing
  that goes quiet: the two-module digest check, the firmware block length, the
  carried frames, the vocoder's octave, the octave shift's ownership, that the
  effect really combines two signals and not one twice, that the whole chain fits
  a render quantum, that the chain is silent unmoved and sounds when played, and
  that each instrument draws its OWN signal. Two arrived, six were rewritten.
  🔴 **THE TWO LARGEST HOLES, PLAINLY: nothing now grades that the two pictures
  are two signals**, which mattered because two pictures fed from one buffer
  would satisfy "both are drawn" and prove nothing, **and nothing grades the leg
  between the node and the destination.** No replacement was invented.
- ✅ **THE `.pos-readout` RED FROM THE KIT CHANGE IS REPAIRED**, and the agent had
  the same diagnosis at baseline before the message arrived. The selector is
  `.pos-report`, the assert is KEPT rather than deleted, and the claim changed
  with it: the left edges still agree to the pixel and that half is asserted, the
  right edges cannot agree any more because the panel is fit-content.

🔴 **TWO DEFECTS WERE INTRODUCED, FOUND AND FIXED BEFORE HANDOVER, AND BOTH ARE
WORTH READING.** A DEADLOCK THAT READ AS SILENCE: `ensureAudio` guards on
`ctx.state === 'running'` and otherwise awaits `booting`, which cannot settle
inside the check block that `boot()` runs as its last act. `idleIfEmpty` used to
need BOTH instruments off, so with the effect on it never suspended and the guard
was never tested; with one instrument it suspends every time. MEASURED:
**fourteen asserts red at exactly 0.0000, and the assert doing the switching
PASSED**, because what it asserts is that nothing is sounding. A check that
breaks the page and then measures silence. And THE KNOB BLOCK SQUEEZED INSTEAD OF
SCROLLING AT 375: the two grids are flex items, a flex item shrinks by default,
and there is no `.panel-flow` scroller above them any more, so HARMONICS and
MORPH were drawn as `HAR` and `M`. The page did not drag sideways, so nothing
said so.
⚠️ AND A RULE WAS REMOVED RATHER THAN SHIPPED: a `flex: 0 0 auto` on
`.muta-tone` could not be shown doing anything, because at 375 the panel is 343
px and the button about 108. Two dead rules from the old file went too:
`.muta-panel { --ctl-gap: 16px }` and its 560 px override carried a long comment
claiming to set the rotary pitch, and they do not, because `createControlGrid({
gap: 10 })` writes an inline style no custom property can reach.
⚠️ ONE TRAP AVOIDED: the divider read `var(--panel-gap)`, declared by `.panel`,
and there is no `.panel` above this any more. An unresolved `var()` makes its
declaration invalid, so the line would have silently lost its air at both ends.

⚠️ **NOT SETTLED:** the 375 px reading is a screenshot and not an assert, because
`verify.mjs` runs at 756 px with no viewport override. Whether the panel should
be fit-content or `full: true` is a judgement from the compose rules rather than
an instruction. The readout at 375 lays out three cells and then `SOUNDING` alone
on a line, which is the shell computing columns from a count rather than from the
available width, already recorded and not touched.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"muta: arhive/rmwarps and rm all routing
code around it.  apply instument panel. no label on patch selctor. move
visualization to top of instrument"*. Slug `muta`, files `demo/muta/index.html`
(3,454 lines), `demo/muta/muta-worklet.js`, `demo/muta/build/warp_shim.cc`,
`demo/muta/vendor/warp.wasm`. Four requests in one line and all of them are
this page. Not started.
⚠️ Known and non-obvious:
- Warps is not a panel that lifts out cleanly. `WARP_URL`, `warpNode`,
  `warpReady`, `warpBytes`, `warpImports`, `warpEntered`, `warpBench`,
  `warpCostMs`, `warpMeters`, `warpLast`, `onWarpReady`, `sendWarp`,
  `warpAlgoGrid`, `warpGrid`, `warpScope`, `warpInst` and the `.warp-panel`
  and `.warp-pick` CSS are all in the page, and the ROUTING is the thing the
  request names: the comment at line 793 reads *"THE SIGNAL. PLAITS makes the
  sound and WARPS changes it, so PLAITS is above"*, so Plaits' output has to
  stop going through Warps and go straight out.
- `bands` is called out at line 382 as *"THE CELL THIS PAGE EXISTS TO PRINT"*
  and it is Warps' filter bank, so the readout and the page's `what` both
  change with this, in the same commit.
- The panel to apply is `demo/shell/instrument-panel.mjs`
  (`createInstrumentPanel`), whose header comment already names `/muta/` and
  `/fau/` as the two pages that had to pass a plate as a glue part OUTSIDE the
  case.
- Removing controls moves every harness press on this page, so the assert
  count is what to read afterwards, not the colour.

### Done 2026-09-28: fau, "compile on loading so i can play"

✅ **DONE, AND BOTH RULES HOLD.** The page's one `build()` was split in two.
`build()` boots libfaust, compiles and stops, leaving the module in a new `ready`
slot, touching no AudioContext at all. `attach()` is the ONLY thing in the file
that touches a context, and every caller of it is a gesture. So a visit compiles
and opens nothing.
- 🔴 **WHY THIS IS NOT THE `/reel/` DEFECT.** The 6.16 MB of compiler comes off
  `/fau/vendor/`, four files this repository ships, on this origin. Nothing is
  asked of anybody else's server. `/reel/` was reaching arhiiv.err.ee, where
  every connection lands in a public broadcaster's audience figures. No
  AudioContext, no worklet node and no MIDI request happens until somebody
  touches the instrument, and the page was NOT given a suspended context at load,
  because every other sound page here opens one on a gesture and one page
  departing from that quietly is how a rule stops being a rule.
- **MEASURED, on loopback on this desk:** first contentful paint **64 ms**,
  `Faust 2.89.2 in this tab, ready in 54 ms` (three runs: 54, 48, 25),
  `organ compiled in 65 ms into 7.27 kB of machine code, 262.26 kB a voice, 8
  voices`, log-stamped at 0.16 s. **The whole instrument is compiled and waiting
  about 170 ms after the page opens.** The readout carries `compile 41 ms`,
  `source 0.77 kB`, `machine code 7.27 kB`, `per voice 262.26 kB` before anybody
  has pressed anything, where it used to be four empty cells until you found the
  Compile button.
- **THE FREEZE, MEASURED RATHER THAN GUESSED: 239 frames in the first 4 s, worst
  gaps 48.4, 40.6, 28.2, 17.7, 17.6 ms.** So the worst single stall is about 48
  ms, three dropped frames, once, and it lands AFTER first paint, so the page is
  on screen and readable through it. ⚠️ `PerformanceObserver` `longtask` recorded
  ZERO entries across a 65 ms synchronous wasm compile even though the type is in
  `supportedEntryTypes`, so it is blind in headless Chrome here and the frame gap
  recorder is what answers "did it freeze".
- **REQUESTS, read off the browser's own record over a 9 s visit with no press
  rather than off a counter the page keeps: 28 requests, ONE origin, ZERO
  external, 6,379,006 bytes decoded**, which is exactly this page's `PAGE_BYTES`
  constant. The page asserts it now, with the count as the negative half, because
  a page that had loaded nothing would pass "no foreign host" vacuously.
- **MEASURED: 51/51 with 45 page asserts before, 55/55 with 49 after**, and every
  one of the four is accounted for: two removed because they claimed a visit
  fetches no compiler, four added including two negative controls. Three existing
  asserts changed their sentence because what they claimed stopped being true.
  ⚠️ The arming assert reads `arming` BEFORE anything in its block calls `arm()`,
  so a check that armed the audio itself would not pass with both listeners
  deleted.
- ⚠️ **A RED WAS SEEN AND WAS NOT THIS CHANGE.** The first run was 54/55 with
  `every voice the pedal is holding is still sounding` red at `0.25131 held,
  0.19413 pedalled` against a 0.8 floor, and the harness warned another headless
  Chrome was running alongside, which was a peer agent's. Re-run ALONE: 55/55,
  and that assert measured `0.21188 held, 0.25178 pedalled`, the ratio on the
  other side of 1.
- **ONE REFINEMENT BEYOND THE LITERAL ASK, because the measurement demanded it:**
  the first touch ANYWHERE on the instrument panel arms the audio, not only the
  first key. Clicking into the code, stepping the patch selector, moving the
  octave or pressing Compile all pay the arming cost, so by the time a finger
  reaches a key the note is immediate.
- **THE ONE COST THAT COULD NOT BE REMOVED: 136 ms from the first pointer press
  to the module being on the audio thread**, which is `new AudioContext()` plus
  `audioWorklet.addModule()`, paid exactly once. A key press itself is 0.2 ms and
  compiles nothing.
- The `what` and the manifest `one` are the same sentence again: *"a synthesiser
  you type in, compiled to machine code in this tab as the page opens"*. Five
  other visitor-facing strings moved with the behaviour, including a dead control
  message that still named a switch deleted on 2026-09-24, two diagram notes, and
  a self-check refusal line that promised a visitor it was sparing them six
  megabytes the page now downloads anyway.

⚠️ **THREE THINGS FOUND ON THE WAY, NONE ASKED FOR:** the pedal assert compares
an RMS ratio against a picked 0.8 floor on a beating eight note cluster and
measured 0.77 and 1.19 today with no code between the runs, so it wants a measure
that is not the RMS of a cluster. The four cell readout wraps 3 + 1 at 375 px,
which is the kit-level "a count is not a width", and it is newly visible because
those cells used to be empty on a visit. And `longtask` being blind in headless
is worth knowing before anybody else reaches for it.

⚠️ **NOT SETTLED:** every number is loopback on this desk, where the log reports
`6.38 MB of that crossed the wire, so whatever served it did not compress it`.
Cloudflare brotlis that file, so a real visit should move far fewer bytes, and
the page prints the answer in its own log on any origin. A phone has not been
measured, and the Organ compiling in 65 ms here will be several times slower
there.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"compile on loading so i can play"*.
Slug `fau`, file `demo/fau/index.html` (and whatever of `demo/fau/vendor/`
the libfaust load path touches). The page compiles on a press today, so a
visitor who wants to play has to know to compile first. Not started.
⚠️ Known and non-obvious: a visit must open nothing and a self-check never
runs for a visitor, so "on loading" has to stay inside this page's own assets.
`plans/plan-fau.md` is the 1,419 line plan it was built to, and `manifest.mjs`
line 668 already records that the browser build of libfaust has three backends
and C++ is not one of them.

### crate: a dead branch round `.pos-readout`, found 2026-09-28, not asked for

FOUND by the kit agent while making the joined report the default, READ off
`shell.mjs` rather than measured on the page, and NOT fixed because nobody asked
for it. `demo/crate/index.html:141` does
`const readout = d.el.querySelector('.pos-readout')` and then, under
`if (readout)`, adds `.vain-nums`, moves the readout into `.vain-block` and
hides it until an upload produces numbers. `d.el` is `.pos-body`, and the
readout has never been a descendant of it, because `mount()` adds it to
`document.body` through the column stack. So the query has always answered null,
`.vain-nums` has never been applied, and the numbers have always been on screen
before there were any.
⚠️ It matters more now than it did: the readout's home is inside the glued
report, so reviving the branch carries a second decision. Lifting the readout
out leaves the report holding only a log, which is a legal shape that draws one
border with no seam, but it is a decision rather than a side effect.
⚠️ NOT MEASURED. Nobody opened that page. One run of `node demo/verify.mjs
crate` would settle whether the numbers really are on screen from the start.

### Done 2026-09-28: global, "move all reading sections atop of the logs and glue them"

✅ **DONE.** `joined` is the DEFAULT for every page now, in both `mount()` and
`createReport()`, and the surface is built by `createGlue` from
`demo/shell/glue.mjs` rather than by a hand-rolled element. Four files:
`demo/shell/glue.mjs`, `demo/shell/shell.mjs`, `demo/shell/shell.css`
(comments only, no declaration moved) and `demo/kit/index.html`.
- ⚠️ THE IMPORT CYCLE WAS THE WHOLE REASON IT HAD NOT BEEN DONE. `glue.mjs`
  imported `el` from `shell.mjs`, so `shell.mjs` calling back into `glue.mjs`
  would have been a cycle in the frame every page mounts. It now carries a three
  line local `div(cls)`, which is what `stack.mjs` already did for the same
  reason.
- `joined: false` survives as an opt-out and NO page passes it. Only `/kit/`
  passes it, on a specimen, because showing both arrangements is what that page
  is for. The comment says out loud that if the count is still zero next time
  somebody reads it, the split arm should be deleted rather than left.
- MEASURED against a pristine copy of the four files, so the only difference
  between the two runs is this change: `click` 24/24 and 12 page asserts
  UNCHANGED, `typist` 25/25 and 19 UNCHANGED, `muta` 55 and 49 UNCHANGED,
  `kit` 246/234 to 247/235, which is the one new assert and it is green. Not one
  assert went silent.
- `createGlue` unwraps a glue of one block, so a report with `showLog: false` is
  the readout ITSELF wearing `.pos-report`, one element fewer. That is what
  keeps `/videoradio/` right: its full screen path hides `.pos-readout` with
  `display: none !important`, and a wrapper round a single block would have left
  a box of its own two edges on screen, which is `/typist/`'s "old UI creeping
  in" band arriving by a new road.
- ⚠️ FOUR PAGES OF 54 WERE RUN, chosen to cover every shape the component can
  produce. The other 50 were not opened, and a page carrying its own CSS or its
  own assert about where the readout sits is something only that page's run
  finds. One did: `/muta/` went red on a 1.0 px delta and its own agent has the
  one line repair.
- ⚠️ `.pos-report { margin: var(--pos-gap) 0 0 }` IS A DEAD RULE ON EVERY REAL
  PAGE and was left alone. MEASURED: `node demo/which-rule-won.mjs click
  '.pos-report' margin-top` prints `WON margin-top: 0 | .pos-stack >
  :not(:first-child)`, and the 40 px above a report comes from `.pos-body`'s
  stack margin instead. It is live in exactly one place, `/kit/`'s specimen box,
  where the report is placed by hand. Removing it takes that specimen's gap with
  it and needs the specimen moved into a stack, which nobody asked for.
- ✅ `/making/` had its now redundant `joined: true` removed by the session, with
  the measured argument that used to justify it kept as history rather than as a
  reason. **38/38 green, 0 failed.**
- ⚠️ THREE CLAIMS IN THE BRIEF WERE WRONG AND THE AGENT CHECKED THEM: TWO pages
  passed `joined: true`, not three, and ONE passes `showLog: false`, not two
  (the rest were kit specimens and a line of sample code in a string), and
  `createReport` did NOT hand-roll its border, radius and seam, it always wore
  `.pos-glue` and hand-rolled only the element. Worth adding: 11 pages pass
  `showReadout: false`, so 29 of 54 built pages get the one box with no seam
  rather than the seamed pair.

⚠️ **ASKED, VERBATIM 2026-09-28:** *"global: move all reading sections atop of
the logs and glue them (you have patterns). use you new glueing code for this,
see the kit"*. Every page with a readout and a log: the reading sections go
ABOVE the log and the two become one surface.
⚠️ The kit code named is `demo/shell/glue.mjs` (`createGlueRows`, `.pos-glue`
in `shell.css`), which `demo/shell/instrument-panel.mjs` already builds on.
⚠️ Shared work first, by one agent, before any page agent starts: this is a
kit and `shell.css` change, and the per-page moves come after it.
Not started, and the page list is not counted yet.

### Done 2026-09-27: derive, "why serif? no serifs on image" (Ludensemble)

Asked with a crop of the Ludensemble poster card, whose type is a wide geometric sans in capitals and which the detector read as serif, 15 shapes, 100 per cent serif-like. Goes into derive.html in its new home once the move-out lands, since demo/eccm/ is already gone from this checkout; the cause is measured first. ✅ MEASURED: at 300 px the poster's letters are 7 to 9 px tall with 2 px stems, and 15 of 15 read as serif because a capital's bar is the whole glyph width and one pixel of antialiasing is half a stroke. A serif is now read only on letters 14 px tall or more with a stem of 3 px or more, else the verdict is "type too small to read for serifs"; Sound Plasma (46 px, stem 5) and Improtest (38 to 46 px, stem 7) keep their serif, the Huddersfield photograph loses a false one its arrows had made. Live at https://eccm.positron.studio/derive, fourth card.

### Done 2026-09-27: derive, "missing a small pinkish hue here" (Varssavi photograph)

Asked with a crop of the sohvi-viik-15 card: the photograph has a faint warm pink cast and the ground came out a neutral #ededed because mean chroma 0.017 fell under the 0.02 grey threshold. Same home and timing as the line above. ✅ MEASURED: the picture's mean colour has a cast of hue 347 at chroma 0.016, which the hue bins cannot see because they count only pixels over 0.04. A grey picture with a cast of 0.006 or more keeps it in the ground at chroma 0.008 to 0.015: #f3e7ed there, ink 14.5:1, muted ink 6.2:1; Open Space, Scrapyard and Surm stay #ededed. Live at https://eccm.positron.studio/derive, second card.

### Done 2026-09-27: a dark picture that is not about black gets its mid tone as the ground

⚠️ **ASKED, VERBATIM, WITH A CROP** of the Huddersfield photograph, players in
black on a mauve wall, which read as a pure dark grey: *"that lighter tone can
be bg? maybe bitl ligtened nicely no to wash out. i do not now what the rule
could be but image in general is not about black"*. ✅ The rule: a dark picture
with no pure hue to make a dark ground of, and a mid tone (luminance 0.25 to
0.85) holding 5 per cent or more of it, is not about black; the scheme goes
light and the mid tone, taken half way to white with its chroma kept to 0.03,
is the ground. Only that fallback changed; a dark picture with a pure hue keeps
its dark ground. ⚠️ A first cut read the mode off the picture's edges instead,
which moved three light grounds that were right and left Huddersfield at a pale
tint, and was reverted before it was committed.

### Done 2026-09-27: "take next set of images"

Asked mid-task, verbatim. MEASURED: eccm.ee's calendar page three carries four
Schönberg dates and no picture, so the next set is the six most recent past
events, newest first, off the past events list's last two pages. The earlier
sets stay reachable by `?set=1` and `?set=2` so the Huddersfield rule
above keeps its example. ✅ MEASURED on the six: three dark grounds (plum 353, indigo 281, a pure dark grey for the Ludensemble poster, which is about black), three light (two greys, one pale pink), one serif verdict.

### Done 2026-09-27: move eccm out of positron, verbatim

*"so how to move on frome here? i'd propose movign eccm outside if positron
repo to krisjanjansen/eccm and ~/personal/eccm but share wrangler et setup and
publish current eccm demo as it is to eccm.positron.studio. when done, scrap
all eccm stuff from positron. can you  do it?"* Worked after the two lines
above land, from the session 0 plan.
✅ Done the same day by a background agent: https://eccm.positron.studio/ answers
200 on every page, font and picture, https://github.com/kristjanjansen/eccm holds
the history (private, `main`, at `~/personal/eccm`), and the positron side is
committed as `5da6325` and deployed as BUILD `5da6325-081318-4c5e`, with
`/eccm/*` answering 301 to the new host. `HANDOFF.md` has the whole list. The
derive page is `public/derive.html` there now, so the two derive lines above are
worked in that repository and deployed with
`env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler deploy --env staging`.

### Done 2026-09-27: the derive page's examples become the next set of events off eccm.ee, and the handoff

✅ **DONE.** Page two of the calendar holds ten events and four of them, the
Schönberg series dates, carry no picture, so the six that do are the
examples: Sound Plasma 10, Koosloome õpituba, TUMA in Huddersfield, Up to
Three, Open Space #5, U: vana-aasta. Read: three light schemes and three
dark, three accents, two read as serif-typed (the Sound Plasma cover, and a
photograph of the ensemble whose 13 line-sitting shapes the detector took for
type, which is the verdict's own limit showing). The opening is three
sentences. `HANDOFF.md`, `LESSONS.md` 123 and 124, `PROGRESS.md` written.

⚠️ **ASKED, VERBATIM:** *"good job. replace examples for next set of events in
eccm calendar and write handoff"*. One fetch of eccm.ee's events page two
(the front page said 26 upcoming over three pages), its events' pictures
fetched once each into `demo/eccm/` under their own names, and the derive
page's list of pictures, kickers and titles replaced with them in sentence
case; the front page list keeps its ten. Then `HANDOFF.md`, `LESSONS.md` and
`PROGRESS.md` for the second half of session 52.
⚠️ **AND:** *"rm border above eccm footer"*. Done, in `eccm.css`, every page.

### Done 2026-09-27: the derived samples' grounds run edge to edge on a phone

⚠️ **ASKED, VERBATIM, WITH A CROP:** *"Bg colors edge to edge hzomtally on
mobile"*. ✅ Under 40rem the sample escapes the frame's gutter by
`calc(-1 * var(--eccm-gutter))` and pads by the same token; MEASURED at 375:
the sample is 375 px wide and the page does not scroll sideways.

### Done 2026-09-27: the mailing block and the foot line leave the derived samples, archived as markdown

⚠️ **ASKED, VERBATIM:** *"Rm sellel nadalal eccmis and footer from detected
examples. Archice that code to md”s"*. ✅ Both out of every sample on
`demo/eccm/derive.html`; the readings beside each picture gained a `serif`
row so nothing the foot line said is lost; the eight stylesheet rules, the
two markup lines and the one script line are in
`archive/eccm-derive-mailing/mailing-and-verdict-2026-09-27.md` as they were.

### Done 2026-09-27: the derive page, third pass, seven asks with three phone crops

✅ **LIVE AT https://positron.studio/eccm/derive.** Read today: Gestures on
#ebf0ea from its sage edge; Schönberg on #f9f9ea from its lightest big
colour with a teal accent; Improtest and the 08-31 graphic on white;
Feldman and U: on a light grey; Scrapyard and germination on their own dark
blues; the 09-04 photograph on a pure dark grey because none of its four
hues is both strong and clean. Every filled button is ink on white or white
on dark at 17.4:1. The page is 13,900 px tall from 23,800.

⚠️ **ASKED, VERBATIM:** *"Pick sorce serif rm others"*; *"Prefer ligher tones but
with bit color like leftmost on light bgs"*; *"Iimpeo: shoild be black on
white. See the logo no grays realky"*; *"Readability issues. Discourage
brownish muddiah tones pick purer daker grayer in fhis case. Shorten texts on
de amples pages get huge"*. So: Source Serif 4 is the serif and the two
Garamonds leave with their files and build lines; a light ground is the
picture's lightest big colour taken most of the way to white, a breath of
colour at most; a grey picture whose own ground is white gets the page's
white, not a grey; a dark ground takes the picture's hue only when that hue
is pure and strong, and a muddy or weak one gives a pure dark grey with no
accent; the sample text is a third of what it was.
⚠️ **AND, A MINUTE LATER:** *"Readability issues on a purchase button"*, of the
accent-filled one on the brown scheme. A filled button is the ground's
inverse, ink on white or white on the dark ground, never the accent; the
accent stays on underlines and the focus ring.
⚠️ **AND TWO MORE:** *"Fall back to nonmudsy detected colors first"* (a dark
scheme walks the picture's hues strongest first and takes the first that is
strong and clean, grey only when none is); *"When darker bg in light Mode
(gestures) and sans, do not use it on body. Legibility rules as indark bgs"*
(the body takes the serif only on a ground near white; on the Gestures sage
it stays in the sans).

### Done 2026-09-27: four phone fixes on eccm, with crops

⚠️ **ASKED, VERBATIM, WITH TWO PHONE CROPS:** *"Improve credits table on
mobile. More rules to skill?"*, *"Make square thimbs in cronpage biit smaller
on mob"*, *"Date field too much padding. File gield more padding and improve
tupogra there"*. So: the credits and facts lists stack label over value on
a phone instead of a label column that eats half the width; a rule in
`eccm-ui` §4 says a label and value pair stacks below 40rem; the compact
row's square thumbnail 6.5rem to 5.5rem; the native date fields lose the
appearance iOS gives them, which centres the value in a tall box; the drop
field gets more room and its two lines set as a lead and a hint.

### Done 2026-09-27: the derive page, second pass, nine asks dictated at once, the serif detector honest about one poster

✅ **DONE, WITH ONE HONEST LIMIT.** The detector erases rules through words,
keeps only shapes that sit in a line of others their size, and scores stroke
contrast and feet. MEASURED on the nine pictures: no photograph reads as
type any more (the first pass called three of them serif from their grain);
the Improtest wordmark reads serif on its own (9 shapes, 100 per cent); the
Gestures poster reads no type, because its letters lie on the dark red disc
under three rules and a luminance threshold cannot lift them off it, so it
is marked serif by hand and the page says so. Schemes: six light, three dark
(Scrapyard, the 09-04 photo, germination), four accents, grey pictures on a
light grey, hued ones without a flat edge on a pastel. The buttons are the
kit's in the system face in both modes and read the scheme's tokens. The page
is 23,800 px tall with nine whole sample pages and a full capture of it
stalls Chrome; clip it.

⚠️ **ASKED, VERBATIM, DICTATED:** *"work on the detection some more. Can you
detect the serif versus sans serif? Uh, for example, gesturid gestures could use
serif. also uh, to a longer body text and other texts uh, in the serif
examples. Um, rich text, mailings, etc. Regarding the get the ticket or add to
the calendar, make them uh, as a standard buttons, what we already have in
edit. Those shouldn't uh, change the typeface, whatever the context is. They
are kind of system buttons, but they, but they should have kind of um, regular
and inversed uh, modes and get those accent colors uh, right. Also, if the uh,
image is, if the colors for me, uh, images are dark, like those dark blues and
uh, etc., inverse the whole thing. So. white on uh, dark blue or uh, dark gray
mm. and other elements should uh, record mm, should mm, act accordingly like
uh, like was uh, get the ticket buttons mm. I'm not sure when you introduce
uh, serifs Uh, do not use serif on the body text while in white on dark. But
uh, but the rest uh, of uh, event uh, information can be serif. Mm. Also, do
not afraid to have a, a gray or pastel uh, backgrounds. Those black and white
images you detected, they should give a light gray uh, to the background. So
go."* As nine rules for `demo/eccm/derive.html` and the buttons in `eccm.css`:
1. Serif or sans is detected from the picture: dark or light text-like
   components at up to 600 px, stroke contrast and feet at the baseline per
   component, a share and a verdict printed, honest about being a heuristic.
2. A serif-typed graphic (Gestures) gets serif titles and facts.
3. The samples carry a longer body, credits, a rich text block and a mailing
   block, so the serif is judged in use.
4. Buy and calendar are the kit's buttons, in the system face whatever the
   context, never the serif.
5. Buttons have a regular and an inversed mode; the inversed one takes the
   accent when there is one, with a text colour that passes on it.
6. A dark picture inverts the whole sample: light text on a dark ground of
   the picture's hue or a dark grey, and the buttons follow.
7. In white on dark the body text is never serif; the title and facts may be.
8. A picture with a hue and no flat edge gives a pastel ground of its hue.
9. A grey picture gives a light grey ground.

### Done 2026-09-26: a working example of design from the picture, and a serif specimen for serif-typed graphics

✅ **LIVE AT https://positron.studio/eccm/derive.** Nine pictures read at
view time: one ground (the Gestures poster, #c7cbc6 after 20 per cent of
white, ink 10.8:1 and muted ink 4.6:1), six accents toned into the window,
three grey. The plan would refuse Gestures' toned accent as a colour the
poster lacks; the page tones every seed and prints the numbers, the line is
the owner's. Three serifs over the sage ground for the serif section, two
Garamonds vendored for it. Not detected and said so: whether a graphic's type
is a serif.

⚠️ **ASKED, VERBATIM:** *"Build some wxamplee on detection. Also specimen on
serif fints complimeting serif based event groaphics from detection"*. So:
`demo/eccm/derive.html`, the plan's §5 steps 1 to 3 as one page: every event
picture read on a 64 px canvas at view time, the flat-edge test, the chroma
test, the seed and the tone rule, every contrast pair computed, the ground
and the accent or the reason for neither, and a sample head rendered in the
derived scheme beside each picture. And a serif section: for a graphic whose
type is a serif (Gestures), the same head with the title in three serifs
(Source Serif 4, EB Garamond, Cormorant Garamond) over the derived ground.
Whether a graphic's type is a serif is not something these pixels can say;
the page says so and shows where an editor's checkbox would go.

### Done 2026-09-26: better type alternatives for eccm, suggested and shown, and E chosen

⚠️ **THREE MORE IN THE SAME MINUTES:** *"fau compile: its on top of textarea.
secondary. small button variant. you took 17+ min and failed"* (the agent had
put it on a band under the text box, primary; it sits over the box's corner
now, small and secondary, one row gap in); *"rm old eccm version, latest is
fine"* (v1 and v2 removed, Plex stays for the specimen page); *"add biiit more
padding on input fields and buttons"* (fields 3rem tall with 12 by 16 inside,
buttons 3rem with 24 each side). All done.

⚠️ **AND, WITH A CROP OF TWO ROWS:** *"feels like these need biiit more vert
space in between"*: the small line to the title 8 to 12 px, the title to the
summary 12 to 16 px. Done.

✅ **CHOSEN:** *"Use font e"*, Schibsted Grotesk, on the live pages since; the
specimen page stays with all seven and its other files.
⚠️ **ASKED, VERBATIM:** *"suggest better type alternatives."* after the face was
named as the one decision left. A shortlist with reasons in the reply, and a
specimen page `demo/eccm/type.html` setting the same list row, facts and
paragraph in each candidate, vendored under `demo/eccm/vendor/` with their
OFL files and listed by name in `build.mjs`, so the choice is made by looking.
No change to the live pages until one is chosen.

### Done 2026-09-26: a plan for an event page whose design comes from the event's picture, `plans/plan-eccm-design-from-image.md`, reported in full

✅ **LANDED AND RELAYED.** 369 lines. Verdict: detection is about fifty lines in
the edit form at upload and is not the effort; the guardrails are, and they
are arithmetic. MEASURED on the ten event pictures: two give a ground (both
Gestures files, a sage #bbc0ba on all four edges), one gives an accent (the
Scrapyard stage photo, a blue at 7.06 on white), five give something that
fails a contrast check, four give nothing. Median cut merges the Gestures red
disc with its type; the ground comes from the flat edge and the seed from the
highest chroma mass instead. The accent window is Y 0.131 to 0.183, so a seed
is never used as it comes. Two tokens may vary on the event page only, a
ground under the head and the interaction accent; the list page changes
nothing. Route (a), the browser at upload storing three columns, for the CMS;
route (c), a view-time read behind a flag, for the demo. First step: fifteen
lines and a look at a sage band under the nav. Not built.

⚠️ **ASKED, VERBATIM:** *"one idea is to actually change event body design
based on the event image. rest of eccm stays minimal, out of the way.
gesutres has very good graphics design for example as preview image. build
design-from-image detection is quite an effort i assume. plan in bg"*. A
background agent writes `plans/plan-eccm-design-from-image.md`: what can be
read off a picture (palette, tone, light or dark, saturation), where it runs
(the browser at upload in the edit form, a Worker at publish, the browser at
view), which `--eccm-*` tokens may vary per event and which never do, the
contrast guardrails and the fallback to the plain page, the cost of each
route, and a first experiment on the demo's event page with the Gestures
graphic. Reported in full when it lands.

### Done 2026-09-26: `/eccm/` feels rough and 90s beside arvopart.ee, and antialiasing, all but the face

⚠️ **ASKED, VERBATIM:** *"do you have font antialias in positron and in eccm?"*,
*"in yr demos"*, then *"eccm feels still v rough and 90ies compared to arvo part
keskus (same info)"*. MEASURED: `shell.css` sets no smoothing, `eccm.css` sets
`auto`, the platform default. Done in one pass: grayscale antialiasing on the
eccm body; headings at weight 400 with the list title a size up, so hierarchy
is size and space; the event page head as two columns on a desk (title, facts
as label over value, a ticket button and the edit button at the start, the
picture beside them at its own size), one column under 60rem of main; the
next three events at the foot. NOT done, a decision for the owner: the face.
Helvetica is the instruction and is also most of the 90s; arvopart.ee serves
Maison Neue and Minion Pro. The design plan's Plex Sans is in `v1.html` to
compare.

### Done 2026-09-26: compare arvopart.ee's page for Morton Feldman 100 with eccm.ee's, and three things to take

✅ **COMPARED AND REPORTED.** arvopart.ee: Maison Neue and Minion Pro served,
16 px on 24, a 48 px red serif title, a 524 px text column beside a 572 px
picture, facts as muted label over value, an outlined ticket button, four
related events, one column on a phone with no overflow. eccm.ee: Helvetica
drawn, 14.4 on 18.7 with the description at 12 px, a 26 px title, the picture
in a bordered card, an INFORMATION bar, 3,320 px wide at every width.
⚠️ **TO TAKE, IN ORDER, NOT DONE:** a two column head on a desk (facts and
prose at the measure, the picture beside them at its own size, one column on
a phone); a ticket button after the facts or the prose; facts as label over
value; the next three events at the foot; bold names in prose, sparingly.
**Not to take:** two webfonts and a serif, the green duotone and circle crops,
labels near 2.5:1, red for titles and dates.

⚠️ **ASKED, VERBATIM:** *"cmpare
https://www.arvopart.ee/arvo-pardi-keskus/sundmused/sundmus/morton-feldman-100-ansambel-u/
https://eccm.ee/index.php/et/109-morton-feldman-100-for-philip-guston/2026-10-10-18-00"*.
The same concert on two sites. One fetch of each page, shots at 1280 and 375,
the face, sizes, measure and leading read through CDP, and a comparison
reported in the reply, with what the eccm demo should take from the better
one. Also asked in the same minute: *"do make changes to eccm now. perhaps
keep old htmls aroind for now for comparions?"*, answered with `v1.html` and
`v2.html` beside the live page.

### Done 2026-09-26: `/eccm/` looks bad, the pictures are to be plain, and the air, the title size and the grounds get a critical look

⚠️ **ASKED, VERBATIM, ON THE FIRST CUT OF THE REBUILD:** *"eccm page looks bad.
i asked just to use event imaes, not overlay anything. have a critical look on
whitespace, title type size, unneccessary backgrounds"*. So: the day and
month over each picture go, and the scrim under them; the tinted row ground
goes, rows are separated by space alone (the first rung of the ladder,
positron-compose §4); the list title drops from `--eccm-t-xl` to `--eccm-t-l`
on a desk and `--eccm-t-m` bold on a phone, so one line per row is bold; the
date line loses its bold; the gap between rows becomes two steps above the
gaps inside a row. `demo/eccm/eccm.css`, `demo/eccm/index.html`, and the
scrim assert becomes its opposite, that a row paints no ground and nothing
is painted over its picture.
⚠️ **AND A MINUTE LATER, WITH A CROP:** *"this really clearly shows that image
shouyld be bigger to avoid awkard a-bit-longer text. gestat 101,
just-a-bit-different sizes are nervous"*. The picture goes to its own 300 px
width, 300 by 200 at 3:2, clearly taller than a row's text; the rule goes into
`positron-compose` §3. Two of the ten pictures are not 3:2 and are stretched
to the box, said in the assert rather than hidden.
⚠️ **THEN FOUR MORE, IN A ROW, VERBATIM:** *"it sould be light, airy, good type
stuff"*; *"this thin underline under bold title is pathetic design"*; *"look up
priniples on whitespace any design with type"*; *"and add to eccm skill"*. So:
title links lose the underline (hover may keep one); the whole page gets
lighter, one bold line at most per row, more air between rows and around the
list; a research agent surveys the primary sources on whitespace in
typographic design (Bringhurst, Tschichold, Müller-Brockmann, Ruder, Hochuli,
Vignelli, Lupton, Butterick, Rutter's vertical rhythm, Refactoring UI) and
writes `.claude/skills/eccm-ui/SKILL.md`, the skill the design plan's §G
outlined and nobody wrote, with those principles and today's asks as rules;
`CLAUDE.md` gets its trigger row. The page is re-set to the skill once it
lands, in one pass rather than a change per message.
⚠️ **AND:** *"use black on top menu borders to mach with logo"*. The menu band's
two rules read `--eccm-ink`, the ink the logo is drawn in, instead of
`--eccm-rule`. Done at once, one declaration.
⚠️ **AND:** *"et en lang position / stylying neds work"*. Cause: the SVG carried the
JPEG's empty margins (29 px above the E, 25 below the tagline, 35 left of the
E in a 381 box), so `align-items: flex-start` put the switch 24 px above the
ink. The SVG is cropped to its ink (viewBox 35 27 310 147), the switch sits on
the tagline's baseline at the far end of the head band, at the menu's size,
the current language as plain text and the other as a link with the page's
own underline. The logo page resets the overlay's viewBox to the full frame
so it still lies on the JPEG.
⚠️ **AND:** *"et en underlines do not match menu ones"*. The switch takes the
menu's own rule: a line in ink under the current language only, none under
the other, the accent on hover. One selector list shared with the menu.
⚠️ **AND, WITH A CROP OF THE FORM'S FILE FIELD:** *"do proper file styling with
drop affodance"*. A dashed drop field beside the current picture, wording that
says drag here or choose, the native input laid invisibly over the whole
field so a drop or a click anywhere lands on it without script, solid ink on
hover, the focus ring from the keyboard. What script would add and this page
does not have: a highlight while a file is being dragged over it.

### Done 2026-09-26: the eccm event page, an edit button and an edit form, HTML only, in the eccm system

✅ **DONE, LOCALLY.** `demo/eccm/event.html`: the title and a Muuda button as
a two ended row, six facts in a `dl` at the measure (when, where, organiser,
tickets, three calendar links as text, phone and site), the 900 px poster
eccm.ee serves on that page at the measure with its shape reserved, the
prose at 66 ch in sentence case with two subheadings and a credits list, and
no script. `demo/eccm/edit.html`: a native form at the measure with a visible
label above each field, `datetime-local` for start and end, a select for the
category, a 24 row textarea holding the prose with blank lines between
paragraphs and `##` for a subheading, the current picture beside a file
field, Salvesta and Loobu; it says it saves nothing and submits to the event
page by GET. Seven components in `eccm.css` carry both (crumb, event head,
facts, figure, flow, button, form). The list's first row links here. Looked
at, both pages, at 375 and 1280: no overflow.

⚠️ **ASKED, VERBATIM:** *"implement single page
https://eccm.ee/index.php/et/134-gestuurid-situatsioonid-ilma-partituurita-kuulamine-marianna-liik-artjom-astrov-maryn-liis-rueuetelmaa/2026-09-30-19-00
plus button to edit and edit form. html only using eccm ds"*. The content
comes from the copy of that page the design scan saved on 2026-09-26
(`04-event.html`, 62,496 bytes), so nothing is fetched from eccm.ee except
the page's full-size picture if it has one. Two pages beside `index.html`:
`event.html`, the design plan's §D event page (title, a `dl` of facts, the
picture at measure width, the prose at 66 ch, add-to-calendar as text) with an
edit button, and `edit.html`, a native form prefilled with the same event,
labelled fields, `datetime-local` for the dates, a textarea for the prose,
no script and no saving, which the page says. The button, the form fields
and the fact list become `eccm.css` components. The first row of the list
links to the local page.

### Done 2026-09-26: the instrument panel's patch selector is unlabelled and at the right, and `/fau/`'s Compile moves into the textarea's corner

✅ **DONE BY A BACKGROUND AGENT, GREEN LOCALLY.** `createInstrumentPanel` now
puts the patch picker at the far end of the plate row with no caption by
construction: a `.pos-pick-l` on the patch control is removed from the DOM,
a picker handed in as `status` throws naming the right slot, and
`instrument-panel-test.mjs` grades it (21 ok to 26 ok). The rule is in the
module header and in `positron-ui`. `/fau/` builds its picker with no label
and Compile is out of the foot: it is `button.pos-sm.pos-pri` appended into
the source field, absolutely placed on `--rows-pad` and `--rows-gap`, on a
band the FIELD carries below the scroller (the first draft padded the
textarea and the band scrolled away with the text on a phone). `pos-sm` is a
new kit variant reading one new token, `--ctl-sm: 26px`, which was typed in
four places before; `/kit/`'s BUTTON GROUP shows it at the top of the block.
MEASURED: fau 50/50 with 44 page asserts to 51/51 with 45, kit 245/245 to
246/246, no assert moved by press order; at 375 the button sits 20 px in
from the well's right and 16 px up from its bottom, 16 px below the text box,
its right edge on the picker's x to 0 px. Seen and left: the twenty-row text
box scrolls on a phone, and `Panic` still wraps alone (its own line below).
`/wish/`'s remove button can now take `pos-sm`. ⚠️ **IT TOOK 17 MINUTES AND
THE OWNER SAID SO**: the brief asked for two pages of shots, an ancestry walk
and rect pairs for a button move. One targeted run and one shot next time.

⚠️ **ASKED, VERBATIM, MID-TASK, FOR A BACKGROUND AGENT:** *"in bg make rule
for instumet panel that patch selector have no label and is in right. do it in
fau. rm compile from footer, put it absolutely to bottom right corner of
textarea, small button variant"*. Three parts:
- **A rule, in the component and in `positron-ui`.** `createInstrumentPanel`
  (`demo/shell/instrument-panel.mjs`) puts the patch picker at the FAR END of
  the plate row with NO label, by default, so no page has to remember. Today
  `/fau/` has the name and the picker at the start (handoff, session 51).
- **Applied on `/fau/`** (`demo/fau/index.html`).
- **Compile leaves the foot.** It sits absolutely in the bottom right corner
  of the Faust source textarea as a SMALL button variant. Whether the kit has
  a small variant is not known: the open line below about `/wish/`'s remove
  button suggests it does not, so it is one shared class in `shell.css`,
  shown in `/kit/`, before the page uses it. The textarea keeps its last line
  clear of the button, and a foot left empty paints nothing.
- Verify: `check-html`, then `node demo/verify.mjs fau kit` only, against
  today's 50/50 with 44 page asserts and 245/245; a control moving changes
  the harness press order, so every moved assert is accounted for.

### Done 2026-09-26: `/eccm/` in the face eccm.ee really draws, with their thumbnails, nearer their layout, and a logo test page

✅ **DONE AND GREEN LOCALLY, DEPLOYED WITH THE NEXT DEPLOY.** `/eccm/` reads
17/17 with 11 page asserts, up from 8. The face is `Helvetica, Arial,
sans-serif` and the page loads no font at all (MEASURED through
`CSS.getPlatformFontsForNode`: Helvetica and Helvetica-Bold on every element,
the reading the design plan took on eccm.ee itself). The ten rows carry
eccm.ee's own 300 px thumbnails under their own file names, drawn at a
largest scale of 0.993, in the original's shape: a tinted row, the picture
with the day over it at the start on a 0.55 scrim (4.7:1 for white over a
white picture), the title and the bold date line beside it. The mark is
`logo.svg`, redrawn from the served JPEG row by row so it overlays it to the
pixel, and `logo.html` shows the two side by side, on top of each other, at
2x and at both page sizes, with the tagline in five faces and a measured
squeeze under each: DIN Condensed needs 5 per cent, Helvetica Neue Condensed
26, Arial Narrow 25, Avenir Next Condensed 21, so the SVG asks for DIN first.
At 375: 200 px of mark and menu (24.6 per cent of 812), no sideways overflow,
all 11 green. Two things found on the way: a compound title with no break at
a slash ran the phone 29 px wide and the title got the prose's
`overflow-wrap` floor, and `demo/shot.mjs` measured overflow against
`innerWidth`, which mobile Chrome widens to the content, so it printed none;
it reads `clientWidth` now. Left out on purpose: the login form, the
calendar, the `Üksikasjad` button (the title is the link), the category
colours, and the month headings (the original has none). IBM Plex Sans is gone
from `demo/eccm/vendor/` and from `build.mjs`. Not sent: the email for the
vector.

⚠️ **ASKED, VERBATIM:** *"use same font as eccm (thay they actyually serve,
not roboto not prenent). use image thumbnails from their event posts, resize
using css. try be more like original layout, to the logo test page (current,
reinterpet in svg)"*. Four asks, all on `demo/eccm/`:
- **The face.** eccm.ee declares `"Roboto", sans-serif` and serves no text
  font, so what a visitor sees is the machine's own sans-serif: Helvetica on a
  Mac, Arial on Windows (MEASURED, `plans/plan-eccm-design.md` §B). So the
  page drops IBM Plex Sans and its two vendored files and declares that stack.
  The Plex assert turns into its opposite: no web font is loaded.
- **The thumbnails.** Each of the ten rows gets the picture eccm.ee shows for
  that event, fetched ONCE from eccm.ee into `demo/eccm/img/` and served from
  positron's own origin, sized in CSS, never upscaled. The own-origin assert
  stays true.
- **The layout.** Nearer the original front page (the picture with the date
  over it at the row's start, title, venue and description beside it), keeping
  the type rules the design plan argued for: nothing under 14 px, a measure,
  one left edge.
- **The logo test page.** A second page in the same directory showing the
  served JPEG beside an SVG redraw of the mark measured off the raster, marked
  interim in its own `<desc>`, because the email for the vector has not gone.

### Open 2026-09-26: the presence badge needs its own treatment, and stays out of generic examples

⚠️ **ASKED:** *"rm online components from glued examples"*, then *"they need
extra care"*. Done in the kit the same minute: five badges out of the glued rows
block, the two justified rows given a `MUTE` button as their second end, the two
settings lists a third label-and-control pair. What "extra care" means for the
badge in a glued row is not decided and is not to be guessed at; the badge
reserves its widest word in `ch`, hugs a bar's left edge by the bar's rule, and
composites a translucent dot, and each of those is a fact a row would have to
respect on purpose.


### Done 2026-09-26: a minimal eccm demo under `demo/eccm/`, for starters

✅ `https://positron.studio/eccm/`: one static page, `eccm.css` with `@layer` and the §D tokens, IBM Plex Sans as two variable files (latin 40 KB, latin-ext 26 KB, OFL beside them) listed by name in `build.mjs`, the ten events off the scanned front page in sentence case, the seven menu items and ET/EN as text, a text wordmark that scales, an events grid whose rows are subgrids, and eight asserts of its own (own origin only, no sideways drag, both subsets loaded, nothing under 14 px, every title on one x, 45 to 75 ch, header under a quarter of a phone, every link underlined). The two phone shots of eccm.ee that arrived meanwhile (*"Its not good looking"*, *"Logo does not scale"*) are what §B measured and what this page answers. Not built: an event page, EN, the logo redraw, `events.json` (the rows are static HTML, one source rather than two).

⚠️ **ASKED, VERBATIM:** *"Can we do minimal eccm demo in positron demo for
starters"*. Per `plans/plan-eccm-design.md` §E: `demo/eccm/index.html` with its
own `eccm.css` and nothing from `demo/shell/`, the tokens and the event list
from §D, a dozen real events from the scan in `events.json` (no request to
eccm.ee from the page), IBM Plex Sans 400 and 600 self-hosted with `latin` plus
`latin-ext`, a manifest row `built: true, unlisted: true`, and its own
`window.__demo` so `verify.mjs` grades it. `.woff2` is not in `build.mjs`'s
allowlist and has to be added by name. Handed over as
`https://positron.studio/eccm/`.

### Done 2026-09-26: patch names are always sentence cased

✅ Landed: `createInstrumentPanel` marks its patch line `panel-plate-patch`, `shell.css` sets that line's transform to none after the plate's uppercase rule at the same weight, the kit's specimens now type `Rhodes Mk I`, `Wurlitzer 200A`, `Spring reverb` and `Sixteen`, and one kit assert reads it off `shown()`: `NOLA over Rhodes Mk I, the patch line's transform none`. Kit 245/245. The rule is in `positron-ui` as *A patch name is shown as it was written*.

⚠️ **ASKED, VERBATIM:** *"parches are awalys sentence cased"* (patches are always
sentence cased). A rule for the kit, not a page fix: wherever a patch name is
printed (the picker, the nameplate's second line, a plate's patch end, a log
line), it is `Organ`, never `ORGAN` and never `organ`. To be found by measuring
which components upper-case their text (`createNameplate` is the suspect) and
written into `positron-ui` beside the readout rules.

### Done 2026-09-26: `/fau/`, the OFF switch goes and a COMPILE button takes its place, no autocompile

✅ Landed: the presence switch, the idle timer and the switch-off path are gone; the foot is `FAU` with the patch picker beside it at the start and a primary `Compile` at the far end, wearing the kit's `data-busy` sweep while the compiler arrives; a preset pick recompiles only when something is already on the thread. `what` and the manifest line say *when you press Compile*. 50/50 with 44 page asserts (47 before: eight about the switch and the autocompile out, five in: typing compiles nothing, the press, the sweep, and typing into a live instrument compiles nothing at 500 ms and at 1.4 s). `.pos-ipanel-name` wraps, so the picker drops under the name on a phone; kit 244/244.

⚠️ **ASKED, VERBATIM, TWO MESSAGES:** *"rm fau off button"*, then *"replace it
with compile (shimmer). no autocompile"*. The plate's status control (the
presence switch built with `createPresenceButton`, landed today) is removed;
in its place a `Compile` button in the kit's shimmer treatment (the sweep the
stylesheet already has, to be found by name in `shell.css` before anything is
written), and the page stops compiling on its own after typing stops. Touches
`demo/fau/index.html`, its `what`, the manifest `one` line if the way it is
worked changes (it does: a press compiles), and the asserts that named the
autocompile (`an autocompile waits while a note is being held` and friends).
`positron-ui`, `positron-compose` and `positron-verify` all apply.
⚠️ **THEN, THREE MORE MESSAGES:** *"compile (shimmer) -> "Compile" button, align
to right, fau stays in left"*, *"(nameplate)"*, *"tell when ready to see at
url"*. So the foot is the nameplate `FAU` at the left end and `Compile` at the
right end, in the shimmer treatment, and the reply that says it is done carries
`https://positron.studio/fau/`.

### Done 2026-09-26: a third eccm plan, the actual project setup

✅ `plans/plan-eccm-setup.md`: its own private repository from the first commit (positron is public since 2026-09-24), `eccm.positron.studio` and `eccm-media.positron.studio` as one-line custom domains on this zone, staging on this account and production on ECCM's as two wrangler environments, a repository tree, local dev, deploy, a seven-step handover, half a day before the CMS plan's session 1. Reported in full.

⚠️ **ASKED, VERBATIM:** *"make third plan on actual project setup. inside our
outside repo? i do not have domain for it. eccm.positron.studio somehow?"*.
Lands in `plans/plan-eccm-setup.md`: repository (in positron or its own),
hostname (`eccm.positron.studio` on this zone as staging, `eccm.ee` on ECCM's
account later), the Cloudflare pieces to create and on whose account, the
wrangler environments, local development, and the handover. Reported in full.

### Done 2026-09-26: eccm site design analysis, in the background, as a plan

✅ `plans/plan-eccm-design.md`, 614 lines, 5 requests to eccm.ee of 12 allowed, reported in full. Verdict: stock Cassiopeia plus a 1,231 byte `user.css`, Roboto declared and never served, 14.4 px body on a 142 character line, a 381 by 199 JPEG logo from a 2023 PSD and no vector anywhere; one family in two weights at 18 px on 66 ch, about 30 `--eccm-*` tokens, a demo under `demo/eccm/` importing nothing from `shell/`, and a 25 rule skill outline. Next step is one email to ECCM for the vector and the tagline face.

⚠️ **ASKED, VERBATIM (dictated):** *"In bg do eccm site design analysis. We
need not to take it all and we actually should improve it, especially
typography, anti-aliasing and similar stuff. Also look at the logo situation. Is
it available on vector? Maybe convert into a vector. And what else is there?
Have a kind of a separate small design system. When we do the demo, we share the
zero with Positron, Positron just can host the demo of it. So what is the
minimal kind of nice typography, dark on white approach and also details, and
compare and contrast it with our Positron composer or composing skill. Maybe we
can get more things right here. Think about the ECCM visual or UI skill to
deliver good typography based, white space based UI for a website and write it
into a plan."* Read-only against eccm.ee, a handful of fetches with a browser
user agent and no crawl. Lands in `plans/plan-eccm-design.md` and is reported
here in full when it arrives.

### Done 2026-09-26: convert `/fau/` to the new rules, in the background, per the audit plan

✅ Landed: the field reads `--edge`, `--r` and `--field-pad` (kit, crate, items, nola, stage unchanged in page-own asserts), the plate row takes a status and a patch control as its two ends (`instrument-panel-test.mjs` 15 to 21 ok, kit 243 to 244), and `/fau/` is `createInstrumentPanel` with no page rules at all (53/53, page asserts 43 to 47). Looked at on 375 and 1280. Left open: an edgeless well has no focus ring inside a glue; the keyboard's own pad row still splits `Panic` onto a second line on a phone (shared defect A).

⚠️ **ASKED, VERBATIM:** *"do fau in bg"*, after `plans/plan-instrument-audit.md`
was reported in full. The plan is the brief: shared change 1 (the field reads
`--edge`, `--r` and a published `--field-pad`; six pages and `feedback.mjs` in
the blast radius, assert counts before and after on each), shared change 2 (the
instrument panel's plate row takes a control at each end, one kit specimen and
one assert), then the page. The agent does not commit; the session does.

### Done 2026-09-26: eccm plan follow-ups, images per `../trip`, and a caching, SEO and sitemap story

✅ `plans/plan-eccm-cms.md` §8 *Images, the trip model in full* (one hashed original in R2, `/cdn-cgi/image` renditions on a fixed ladder, the markup contract that scored 100, five traps trip paid for) and a new §13 *Caching, SEO and the sitemap* (three cache layers and what each saves, the two rules WHERE-clause scheduling now needs, `og:` and JSON-LD `Event`, RSS and iCal, one unchunked sitemap from D1).

⚠️ **ASKED, VERBATIM:** *"see ../trip on image handling and resizing and caching.
add caching / seo / sitemap story."* Read `../trip`'s image pipeline (what it
resizes with, where it caches, how it serves) before answering, and add three
things the plan has none of: what is cached where and for how long, what a page
carries for a search engine and a share card, and how a sitemap is produced from
D1.

### Done 2026-09-26: eccm plan follow-ups, the editing surface

✅ Four subsections in `plans/plan-eccm-cms.md` §8: drafts (a `draft` table behind a debounced PUT with `rev`, `localStorage` as the crash buffer only, the Access expiry trap), paste (an 80 line `text/html` walker into the markdown subset, the Word and Google Docs traps, pasted images upload), dates (native `datetime-local` enhanced by flatpickr, or a quarter-hour select), stream items (the `demo/items/` composer and `workers/items` alarms as a second publish path).

⚠️ **ASKED, VERBATIM:** *"jooomla: draft saving? localstorae or bg PUT? rich
text paste / parsing? decent datepicker (native is super rough)? note that they
also compose items for streaming (see items demo)"*. Four answers, each a section
in `plans/plan-eccm-cms.md`: where an unsaved draft lives, what a paste from Word
or a browser becomes, which date picker and why the native one is not it, and
the fact that `demo/items/` is already a composer of dated items on the same
stack, so the editor is not built from nothing.

### Done 2026-09-26: the rada7 newsletter's shape, from the parser in `../toimps`, as hints for eccm

✅ Landed in `plans/plan-eccm-cms.md` §5 as *The rada7 shape*, MEASURED on four letters and toimps' three grammars, eight hints in order of worth, reported in full.

⚠️ **ASKED, VERBATIM:** *"see ../toimps on rada7 newsletter parser. id assume eccm
could deliver similar newsletter, any hints how rada7/ivo composes it?. go"*.
Read-only: what the parser expects tells what the newsletter is made of. Lands as
a section in `plans/plan-eccm-cms.md`.


### Done 2026-09-26: the instrument audit, `plans/plan-instrument-audit.md`, reported in full

✅ The pick is `/fau/`; two shared changes come first (the field reads the three tokens; the plate row takes a control at each end); every defect the five phone shots show is in a shared component. Proposed only, nothing changed.

⚠️ **ASKED, VERBATIM, MID-TASK, HANDED TO A BACKGROUND AGENT:** *"now audit all
instruments in bg to the new rules we make. pick one. do not do anything just
assess and propose."* Read-only. Lands in `plans/plan-instrument-audit.md` and is
reported here in full.


### Open 2026-09-26: the presence badge's own inset, the justified-to-linear rule, full-width glue

⚠️ **TWO MORE IN THE SAME STREAM, VERBATIM.** With a crop of the settings list:
*"board offline does not comply with the label / control grid. make it a general
rule and component (subgrid?) if you have not done so"*. And: *"Notes off ->
rename to Panic"*. The first is `positron-compose` section 2 exactly, things
line up because they share a coordinate system, and the research names subgrid
as the primitive this project reached past; three `[label, control]` rows in
one surface must share one label column and one control column. The second is
one word in `keyboard.mjs` and every page follows.

🔴 **ASKED, WITH A CROP OF THE STATION STRIP:** *"do same side-effect treatment for
online status thing. its almost always in the left. make composition rules on
when to justify layout in mobile when to make it linear (avail space?). make
different examples on it. add more full w glue examples too"*.

In the crop the `ONLINE` badge sits about 24 px after the speed segment on a row
whose gap is 8, so the badge carries roughly 16 px of its own. The row-child
assert did not flag it, which means the inset is INSIDE the badge rather than on
its box. Three deliverables: the badge reads `--inset` like every other surface;
a row wraps as a cluster and a justified row goes linear below the width its
content needs, decided by the container's width and never the viewport's; and
`createGlueRows({ full: true })` for a surface that takes the width it is given,
which is also where `between` is real.


### Done 2026-09-26: an alternative CMS for eccm.ee on the Cloudflare stack, `plans/plan-eccm-cms.md`

✅ **LANDED, 816 lines, reported in full in the session.** Verdict: an events system with a few pages attached, not a CMS; free plan yes for the site, no for the newsletter; three sessions to parity, five with mail; the first thing to ask ECCM for is the database dump and the images folder.

⚠️ **ASKED, VERBATIM, MID-TASK, AND HANDED TO A BACKGROUND AGENT:** *"in bg do a
scan of https://eccm.ee/index.php/et/ and make a plan to build an alternative cms
for them. its joomla atm. how it will look at in cf stack? they seem to have news
and events and pages and perhaps something else. what its just basic posting and
scheduled posting. see their api, there are likely bloat schema perhaps not always
filled / used. can we use cf db for it. also can we get away with free plan?
multilanguage? joomla vs icagenda. newsletter? see also ../trip for some of these
ideas (composer, mail rig)"*.

The plan lands in `plans/plan-eccm-cms.md` and is reported here in full when it
does, not as a filename. ⚠️ The scan is bounded: a handful of pages and the
JSON API once, no crawling loop, because it is somebody else's server.


### Open 2026-09-26: quieten Safari's text scaling, selection and loupe on the phone

⚠️ **ASKED, VERBATIM, AND PARKED ON INSTRUCTION:** *"try to minimize safari scaling
and selecting and loupe effects. put this to backlog. see
~/projects/enefit-design-systems Chart component css for inspiration, write that
ref down and currently we move on"*.

🔴 **THE MEASUREMENT THAT PROMPTED IT.** The owner's iPhone mini wrapped the kit's
prose to three lines and its code block a word short, while both the Chrome
emulation at 375 and the **real iPhone 13 mini simulator, iOS 17.5, SF Mono**
wrapped identically to each other and not to the phone. Boxes were the same
width on all three. So the difference is Safari's own text size (the `AA` menu),
roughly 115 to 125 per cent, scaling text and not layout. That is a real
condition, it is the WCAG text-resize case, and layouts here have to tolerate
it; `positron-ui` already records the loupe and the selection handles on
`/keys/`, `/mirror/` and `/blocks/`, answered with `-webkit-touch-callout: none`
and `user-select` on controls and canvases.

✅ **THE REFERENCE TO READ FIRST**, the design system's Chart component itself,
not its examples (the first draft of this line pointed at four `app/examples/*.tsx`
files, which is where a component is used and not where it is written):
    /Users/s32863/projects/enefit-design-system/components/Chart/ChartTooltip.css
    /Users/s32863/projects/enefit-design-system/components/Chart/Chart.css
    /Users/s32863/projects/enefit-design-system/components/Chart/ChartCursor.css
    /Users/s32863/projects/enefit-design-system/components/Chart/ChartGrid.css
    /Users/s32863/projects/enefit-design-system/components/Chart/ChartDot.css

⚠️ What to look at in it: `-webkit-text-size-adjust`, `user-select`,
`-webkit-touch-callout`, `touch-action`, and whatever it does about `font-size`
under a system text-size change. Nothing here is decided until that is read.


### Open 2026-09-26: the keyboard's inset inside a glue, and more glued rows examples

🔴 **ASKED, WITH THREE CROPS:** *"keyboard padding is not consistent from the
rest. fix systematically"*, then *"rm its padding/margin (component without
border but with padding is essentially component with margin and we do not do
it, it's ui side-effect. tell me exact rule in skill what you change for it and
what is the big step to get rid of this negative side-effect on other
components"*, then *"rm loop button from glued rows, add way more examples of
glued rows"*.

MEASURED before touching it: `div.kbd 600 x 146.5, padding 9px` inside a row
that already pads 20, so the keys sat at 29 while `NOLA` and every knob sat at
20. The glue rule stripped border, radius and margin and left the padding.


### Open 2026-09-26: what the composition research says to change in `shell.css`, in order

🔴 **FROM `research/cascade-cures-2026-09-26.md`, `glued-containers`, `layout-systems`
AND THE CORRECTION TAXONOMY, ALL WRITTEN 2026-09-26.** None of these is done. Each is
one decision and most are one line. In the order the evidence ranks them:

1. **`@layer reset, base, layout, components, page, responsive;` at the top of
   `shell.css`.** One line. It cures the shorthand-beats-longhand incident and the
   media-query-that-never-ran incident structurally, and with `[hidden] {
   display: none }` left UNLAYERED it cures the six-component `[hidden]` patch with
   no `!important`. **Prerequisite: the 4 `!important` in the file go first**,
   because importance inverts layer order. Measured: 841 selectors, 766 rules, max
   specificity (0,5,1), zero ids, 0 `@layer` today.
2. ✅ **DONE 2026-09-26, `b14de8a`: `.pos-glue { overflow: clip }`.** `/kit/` 238/238,
   `/transport/` and `/lanes/` unmoved. Left in the list so the order reads whole.
   The original line: `.pos-glue { overflow: clip }`, not `hidden`. `hidden` is a scrollable
   value: it makes every glued surface a scroll container, so `position: sticky`
   inside one sticks to the wrong thing and an edge control's focus ring is
   clipped, which is a WCAG 2.4.7 failure. Polaris ships `clip` on its Card.
   Better still where rows carry focus chrome (every knob row): no clip, and the
   first and last children take the radius back with `border-radius: inherit` on
   the four longhands. ⚠️ `clip` does NOT reset a flex child's automatic minimum
   size; only the scrollable values do. Spec-derived, verify in the targets.
3. **A spacing scale.** 48 tokens at `:root` and no scale among them: `--pos-gap`
   40, `--panel-pad` 20, `--rows-pad` 20, `--panel-gap` 16, `--rows-gap` 16,
   `--ctl-gap` 8, `--kbd-pad` 9 are seven names for five numbers with no stated
   relationship. Not one of eleven surveyed systems ships a raw ratio for spacing;
   all use 2, 4, 8, 12, 16, 24, 32, 48, 64 and land on a multiple of 4 or 8.
   Refactoring UI's floor: no two adjacent steps closer than 25 per cent.
4. **`.kbd-foot` goes linear below a width.** `justify-content: space-between;
   gap: 8px` with no phone behaviour wraps into a left line and a right line on
   `/nola/` and on the kit at 390 px. A Switcher (`flex-basis: calc((var(--threshold)
   - 100%) * 999)`) is one row or one column with no media query and no state
   where one item has wrapped and looks picked out. It reaches ten pages.
5. **Seven custom properties are read and set nowhere in `demo/`:** `--k-dot`,
   `--k-max`, `--k-pad`, `--pad`, `--roll-row-h`, `--sld-seam`, `--wrap`. Each
   `var()` of them is either a fallback doing all the work or a dead read. And
   twelve are declared and never read: `--mi-magenta --mi-teal --mi-orange
   --mi-blue --mi-maroon --mi-teal-lit --mi-maroon-lit --pad-bar --ctl-step
   --pg-now --tbl-grow --span-n`. The other 25 unknowns ARE set, by JavaScript or
   a page sheet, so `no-unknown-custom-properties` cannot go in as an error
   until they carry `@property` registrations.
6. **Stylelint with the measured config**, 95 problems today, 54 of them the
   deliberate base-then-hover pattern at warning level. It catches the
   within-block shorthand bug and nothing across rules; that needs the CDP
   `which-rule-won` script, which exists in the session scratchpad and is worth
   adopting into `demo/` beside `shot.mjs`, read first.
7. **Subgrid for the control row.** `--ctl-head`, `--ctl-foot` and `--ctl-step`
   are the published contract; a grid over the row with three tracks and
   `grid-template-rows: subgrid` on each control aligns every lane, button and
   dial with no published numbers and no caller opting in. Widely available since
   March 2026.

⚠️ **AND THE THING THE FOURTH STRAND CORRECTED, SO IT IS NOT REPEATED:**
container queries fix a component asking about the window when it wanted its own
box. They do NOT fix a media query losing to a later plain rule; `@container`
adds no specificity and is resolved by source order exactly like `@media`. That
is `@layer`'s job, item 1.


### Open 2026-09-26: five phone defects, SEEN for the first time, across six instrument pages

🔴 **THE FIRST PHONE SHOTS THIS PROJECT HAS EVER TAKEN OF ITSELF, 2026-09-26,
WITH `node demo/shot.mjs <slug> 390`.** Instructed: *"always look how things
look in mobile. figure out how to see it."* Six pages at 390 px, none dragging
the page sideways, and five kinds of defect visible in them. The pictures are in
`tmp/shots/` and are regenerated by the command; nothing here is from memory.

🔴 **A. A JUSTIFIED ROW WRAPS INTO A LEFT LINE AND A RIGHT LINE.** `/nola/`'s
keyboard footer: `N D − + 0` on one line, `Loop Sustain Notes off` right-aligned
on the line under it. The kit's sketch panel does the identical thing, because
it is the same `keyboard.mjs` footer. Said in the owner's words: *"if you have a
justified layout in desktop, you need to go to left alignment in mobile and have
gaps between elements, not just squished elements."* **`justify-content:
space-between` has no phone behaviour**: when the row wraps, each line is
justified on its own, which is the shape that reads as broken. The repair is a
layout that goes LINEAR below a width, left-aligned with a gap, and that is a
composition rule rather than a per-page fix, because `keyboard.mjs` is on ten
pages.

🔴 **B. AN EMPTY SURFACE PAINTS A BOX THE SIZE OF A PHONE SCREEN.** `/evo/`,
`/twelve/` and `/circuit/` each show a bordered box of roughly 200 px with
nothing in it under the instrument. On a desk it sits beside things; at 390 it
is a full-width void. **NOT DIAGNOSED**: it is either the readout with cells and
no values or the diagram's host, and the difference decides the fix. `…an empty
box is a line` is the standing rule and this is that rule at phone scale.

🔴 **C. A CONTROL LABEL TRUNCATES.** `RESONA…` on `/knobs/`, and `FEEDBA…`
on the kit before it was renamed today. An ellipsis is this project's own signal
that a thing is in the wrong place, and a knob label has nowhere else to be, so
the answer is a shorter word or a knob that knows its label's width.

🔴 **D. AN ODD READOUT WRAPS 3+1.** `/knobs/` at 390: `CC OUT`, `SOUND OUT`,
`ROUND TRIP` on one line and `BUFFER` alone on the next. The shell's cap rule
computes rows from the CELL COUNT (`ceil(n / 6)`), so four cells are one row
however narrow the screen, and the flex wrap then breaks that row wherever it
runs out. **A count is not a width.** The balanced-rows rule needs the available
width as an input, or a container query on the readout.

🔴 **E. NOTHING SAYS THERE IS MORE TO THE RIGHT.** `/twelve/` shows 3 of 8
strips, `/circuit/` cuts at knob 5 with the CIRCUIT plate off-screen, `/evo/`
cuts its keyboard at D♯3, `/knobs/` at G3. Every one scrolls correctly inside
itself and every one looks cut off, because a scroller with no visible edge, no
fade and no partial next item is indistinguishable from a clipped box. The Reel
pattern (Every Layout) answers this with an intentional overhang; the research
in flight covers it.

⚠️ **AND THE THING THAT MADE ALL FIVE VISIBLE IS A TOOL, NOT A RULE.** They were
there for weeks. `positron-ui` recorded in three places that no harness here
could enter a media query, as a fact about the harness rather than as a thing to
fix. `demo/shot.mjs` is 200 lines and it took an afternoon of being told.


### Open 2026-09-26: `/kit/` reads 237/237 in the harness and shows ten FAILs in a real browser

🔴 **SEEN 2026-09-26 WHILE LOOKING AT THE NEW PANEL BLOCKS, AND IT IS NOT
THEIRS.** `node demo/verify.mjs kit` is **237/237 green**. The same page opened
by hand in Chrome at `http://127.0.0.1:8890/kit/`, read off `__demo.asserts`,
reports **202 asserts with 10 failing**, and **not one of the ten is a new
one**:

    a pad with nothing above it still reserves the slot
    a waveform on both sides is two different pictures
    two blocks in one part sit the project's one gap apart
    a loop armed long before the first note comes back at once
    a loop keeps its place over several turns rather than walking away
    the onsets handed to the tempo are the four notes played
    a second take is snapped onto an integer ratio of the first
    the second loop wraps on the aligned lap, counted
    clearing empties both cells, a stated tempo reads set rather than heard
    Loop, Sustain and Notes off sit in that order, tight against each other

⚠️ **TWO THINGS ARE DIFFERENT AND ONLY ONE OF THEM IS MEASURED.** The harness
appends `?selfcheck=1` and this reading did not, which is why the totals differ
at all; and the reading was taken while the page was still running, at 202 of
237. **So this is an observation and not yet a finding.** What makes it worth
writing down is that six of the ten are the looper, the take and the tempo,
which are the asserts session 50 added and which are the only timing-dependent
ones on the page.

⚠️ **THE THING TO DO IS ONE COMMAND, NOT A HUNT:** open
`http://127.0.0.1:8890/kit/?selfcheck=1`, wait for `ready`, and read
`__demo.asserts` again. If it is still red there, a page that is green headless
and red in a browser is the worst shape this project knows, because the harness
is the thing everybody trusts.


### Done 2026-09-28: a glued rows component, and an instrument panel built on it, no longer `/kit/` only

✅ **APPLIED TO FIVE PAGES ON 2026-09-28**, which is what *"do not apply to any
page yet"* was waiting for: `/fau/`, `/knobs/`, `/muta/`, `/shape/` and `/tom/`
all wear `createInstrumentPanel` now, and `createReport` in `shell.mjs` is built
on `createGlue`, so every page on the site gets a glued surface whether or not it
is an instrument. ⚠️ AND THE COMPONENT CHANGED UNDER THE TRAFFIC: its header
named `/knobs/` as a page it would break, which was a fact about `.panel-flow`'s
`max-content` and not about the instrument, and it is corrected. `/tom/` keeps
`createPanelLayout` INSIDE a row, which is the shape the file did not anticipate,
because 64 label rows beside 16 scrolling steps need a fixed column. One kit rule
was owed and is in: `.pos-rows-r > :only-child` takes the row whether or not the
row has an inset, asked for independently by `/shape/` and `/tom/` on one day.

### The original ask, kept

🔴 **ASKED, VERBATIM, WITH A SKETCH:** *"do a instrument panel coponent properly
in kit. its our glued style"*, then the sketch, then *"where name is nameplate.
add several examples to kit. base on generic \"glued containers/rows\" component
that you also need to add to kit. do not apply to any page yet. make separate tab
panels for it in kit"*.

The sketch, as it was drawn:

    -----------
     viz? orsmth
    -----------
     ()()...
    -----------
     ()()()...
    -----------
     ...etc...
    -----------
     ||keys?||||
    -----------
      name patch
    -----------

**TWO components, not one.** A generic glued containers/rows component first,
then the instrument panel as a caller of it.

**FILES:** a new `demo/shell/<glued rows>.mjs`, a new instrument panel module,
`demo/shell/shell.css` for both, and `demo/kit/index.html` for the sections. **NO
page changes at all**, which is explicit in the ask.

⚠️ **AND IT GETS ITS OWN TAB PART IN `/kit/`**, rather than landing in `layout`
or `hardware`.

🔴 **WHAT IS ALREADY THERE, SO THIS IS NOT A FOURTH COPY.** `createGlue` in
`demo/shell/glue.mjs` is the LOOK and is 20 lines: it filters, it wraps, it
returns the child unwrapped when there is one. `.pos-glue` in `shell.css` is
`gap: 1px` over a `--line` ground with the children giving up border and radius.
`panel-layout.mjs` already has `band()`, `unband()` and `seam()`, and its seam
notes say a seam inside the scroller is IMPOSSIBLE rather than merely hard,
measured at 992 px against a 686 px case. **The new thing is the ROWS, not the
glue.**

⚠️ **THE TRAP THIS SHAPE WALKS INTO IS WRITTEN DOWN THREE TIMES ALREADY:** every
glued part paints its own ground or the seam colour comes through its whole area,
and a replaced element in a glue (`canvas`, `textarea`, `img`, `video`) is
inline by default and leaves a strip that renders as a second line. A `viz` row
is a canvas and a `keys` row is a component with its own box.

⚠️ **`/kit/` HAS UNDER A SECOND AND A HALF OF BOOT BUDGET LEFT** and reads
227/227 today. A draft block took it to 0/1 with 207 asserts once, because the
whole page reads red when `d.ready()` misses the wait.

### Open 2026-09-26: `C+` reads as C major instead of being refused

🔴 **FOUND 2026-09-26 WHILE ADDING `2`, AND IT IS WORSE THAN A MISSING ROW:
A VISITOR GETS A WRONG CHORD RATHER THAN A REFUSAL.** MEASURED:
`parseChords('C+')` returns **C major with no bad token**.

✅ **THE CAUSE IS THE GRAMMAR, NOT THE TABLE.** `parseChords` splits a typed
line on everything outside `[A-Za-z0-9#/♯♭]`, **so `+`, `^` and `°` ARE the
separator** and are eaten before `QUALITIES` is consulted. ⚠️ **So adding rows
for them would be unreachable**, which is the `M` row mistake again, and a test
now walks the table against the splitter’s own character class so the next
unreachable row goes red.
⚠️ MEASURED in the corpora: `^` 62, `^9` 60, `+` 48. **Small, and `aug` already
exists**, so this is about not lying rather than about coverage.

✅ **`+` DONE 2026-09-30, UNCOMMITTED AT THE TIME OF WRITING: READ AS AUGMENTED, NOT REFUSED.** It is the ordinary spelling, the corpora write it, and `classOf` and `SPELL_ALIAS` already fold it onto `aug`. The splitter keeps `+` as a chord character (exported as `CHORD_GAP`), a `+` standing alone is still a gap so `C + G` is two chords, and `C+7` is refused in words. `C+` is `Caug`, notes 60 64 68. ⚠️ **`^` IS STILL EATEN**, so `C^` still reads as C major with nothing refused. `chords-test.mjs` 7i asserts that on purpose so it cannot change quietly.

### Open 2026-09-26: `CLASS_OF` files 14 of 26 qualities as major, `dim7` included

🔴 **MEASURED 2026-09-26: 14 of the 26 qualities `parseChord` can return fall
back to `maj` in `suggest.mjs` today**, namely `6 9 11 13 add9 dim7 maj6 maj9
maj11 maj13 min6 min9 min11 min13`. **`dim7` is classed major**, and so is every
bare extension. `2` makes 15.
⚠️ **IT IS PRE-EXISTING AND WAS FOUND RATHER THAN CAUSED**, and it is why the
**37 missing qualities, 5,373 occurrences, `7b9` at the top with 2,003**, were
DELIBERATELY NOT ADDED: every one returns a new quality string and `CLASS_OF`
would silently class them all `maj`. **Dominants are 40.6 per cent of jazz**, so
`C7b9` would become typeable and functionally misfiled in one step.
✅ **It is one line per row once the classes are right**, and that is the next
thing, not a reason the rows are wrong.

✅ **CLASSES DONE 2026-09-30, UNCOMMITTED AT THE TIME OF WRITING.** `CLASS_OF` has a row for all 26 qualities and `suggest-test.mjs` walks every quality `parseChord` or `name.mjs` can return against the build's own `classOf` in `chord-corpus.mjs`. MEASURED against the old code: **9 qualities** reached the table in the wrong class (`min6 min9 min11 min13` as major, `9 11 13` as major, `dim7` as major, `2` as major); the six `maj` extensions and `add9` were right by accident. Two named disagreements with `classOf`: `2` is `sus` (its regex says dominant) and `add9` is `maj` (it says nothing). **The 37 missing qualities are still not added**; that is now one row here plus one row in `chords.mjs` each.

### Open 2026-09-26: `2` can be typed and will never be suggested

⚠️ **MEASURED: `2` is written 0 times in 159,644 corpus chords**, so a table’s
`spell` map has nothing to offer it. The SOUND is still reachable under the name
`sus2`, written 264 times. **This is a fact to know rather than a defect**, and it
is written down so nobody reports it later as one.

⚠️ Since 2026-09-30 a played or typed `C2` at least reaches the table as `sus`, the class of the same three notes, rather than as a major chord.

### Done 2026-09-26: `C2` is a chord, and the parser was measured rather than patched

✅ **DONE. `C2/E` PARSES AS `C2/E`, NOTES 52 60 62 67, WHICH IS E3 C4 D4 G4.**
The E is underneath and the chord above it is C D G. MEASURED: `chords-test` 60
ok to **67 ok**, `name-test` 30 and `suggest-test` 44 both unmoved, `/nola/`
**106/106** and unchanged, exactly as it should be with no control added.

✅ **`2` IS `[0, 2, 7]`, NO THIRD, AND THE ASKED SYMBOL IS THE ARGUMENT.**
`C2/E` puts the third in the bass, **which is only a thing to do if the third is
not already in the stack.** With `[0, 2, 4, 7]` the slash would say nothing and
`C2` and `C2/E` would hold the same pitch classes.
⚠️ **AND IT IS THE SAME THREE NOTES AS `sus2`, SAID PLAINLY IN THE FILE RATHER
THAN HIDDEN.** Two real names for one sound: `sus2` claims a suspension, which is
a claim about what happens next, and `2` claims a colour. The name is not folded,
so somebody who typed `C2` reads `C2`.

🔴 **AND THE MEASUREMENT FOUND THREE KINDS OF REFUSAL, NOT THE TWO THE BRIEF
ASKED FOR.** `demo/resources/chord-refused.mjs`, **159,644 written chords** across
1,186 iRb and 890 Billboard charts, 0 requests:

    notation  8,956 (51.1%)  386 forms   a corpus file format, nobody types it
    missing   5,373 (30.7%)   37 forms   a quality the table genuinely lacks
    spelling  3,196 (18.2%)    8 forms   another way of writing one it has

**Separating the third is what stopped the list inflating.**

**COVERAGE, quality level:** jazz **80.63% to 86.60%**, pop 92.56 to 92.74, both
89.02 to 90.92. Six rows added for 3,026 measured occurrences: `2`, plus
`hdim7`, `h7`, `h` to `min7b5`, `o7` to `dim7` and `o` to `dim`. **The spelling
bucket drops from 3,196 to 170.**

🔴 **AND POP SLASH CHORDS ARE 0 OF 10,189 FOR A REASON THAT IS SPELLING AND
NOT MUSIC**: Billboard writes its bass as a DEGREE, `C:maj/3`, not as a note.

🔴 **ASKED, VERBATIM, WITH TWO SCREENSHOTS:** *"chord or no chord"*. One is
`/nola/` refusing the typed line `Cmaj7 C2/E` with **"C2/E is not a chord,
because 2 is not a chord quality"**. The other is an Open Studio lesson,
*Getting From I to IV*, with **`C2/E` captioned over the keys while it is being
played.**

✅ **IT IS A CHORD AND THE PAGE IS WRONG.** A `2` chord is the root with its
SECOND and fifth, usually with no third, and the slash puts the third in the bass
underneath it. It is ordinary vocabulary in exactly the teaching this project
keeps taking its examples from.

⚠️ **AND THE TABLE ALREADY HOLDS ITS NEIGHBOURS**, which is what makes the
absence an oversight rather than a decision. `demo/shell/chords.mjs:45`
`QUALITIES` carries `sus2` at `[0, 2, 7]`, `add9` at `[0, 4, 7, 14]`, `5` at
`[0, 7]`, and bare `6`, `9`, `11` and `13`. **There is no `2`.**

🔴 **DO NOT ADD ONE ROW AND CALL IT DONE. MEASURE WHAT ELSE IS REJECTED,
BECAUSE THE EVIDENCE IS ALREADY ON THIS DISK.** Both corpora are cached in
gitignored `tmp/chord-corpora/` and `fetch-chord-corpora.mjs --check` reports
**0 requests**, so every chord symbol in 1,186 jazz charts and the Billboard set
can be run through `parseChord` with no network. **A list of what real music
writes and this parser refuses is a measurement, and guessing at a second row
is not.**

⚠️ **THE CHORD NAME CELL RESERVES ITS WIDTH FROM `RECOGNISED`**, computed in
`keyboard.mjs` as the longest quality the recogniser can return. **A new quality
can widen that cell on ten pages**, and the cell exists precisely so it cannot
change width under a player’s hands.
⚠️ **AND `suggest.mjs`’s ALPHABET IS `(degree, class)`**, so a quality the
table has never seen still has to map to a class the suggester knows, or a chord
becomes typeable and unsuggestable at the same time.

### Done 2026-09-26: the take adaptation is wired, and the deploy holds the new table

✅ **BOTH DONE. MEASURED: `/nola/` 103/103 to 106/106**, exactly +3 page asserts
and nothing else moved. The artefact was rebuilt in `d27cbe1` and
`workers/view/public/resources/chord-tables.json` now reads **18,237 bytes**.

✅ **`heard` IS CALLED IN `settleNow`, NOT IN `addLearned`, AND THE DIFFERENCE IS
A NUMBER ON THE PAGE RATHER THAN AN ARGUMENT.** It sits straight after
`chordKey(...)` and ABOVE every early return under it, so a chord the learning
rules refuse to write into the roll is still a chord somebody played. MEASURED:
the harness’s scripted take puts **7 chord events into the take while the roll
holds 2 rows**. Fed from `addLearned` it reads 2.

✅ **THE NEGATIVE CONTROL IS DRIVEN, NOT DECLARED**, which is the whole point.
The block already plays this page’s own proposal twice, so the counts are
snapshotted either side and the deltas asserted. Read on the green run: **7
chords played into the take and 3 of the page’s own refused**, the third being
the earlier fade check. **So `refused` has a real source and cannot be 0 for want
of anything ever being offered.**

✅ **FOUR SABOTAGES, EACH RUN AND REVERTED.** No provenance test reads
`10 chord(s) played and 0 refused` against the true 7. The take built and never
passed reads `0 time(s)`, **and every other assert on the page stayed green,**
which is exactly the hole that one exists for. Fed from `addLearned`, 2 red.
Passing it to `suggest` but not `routeTo` reads `1 time(s)`, so it cannot be
satisfied by half a wiring.

⚠️ **AND TWO THINGS ARE LEFT THAT ONLY PLAYING CAN SETTLE.** A very short take
leans hard: on a 7 event take of two distinct chords one way home came out
`Fmaj7 IV, Fmaj7 IV, Fmaj7 IV, Cmaj7 I`. It is not stuck, and the 12 draw check
found **7 distinct ways home against 5 before the wiring**, but a take of two
chords repeated is not the 30 to 80 chord chart the +6.32 was measured on.
⚠️ **AND THE HUNTING CHORDS COUNT AS PLAYED.** Reaching for a suggested
`Gmaj7` makes `Gmaj` then `G5`, which the roll refuses by its root guard but
which are not in `proposed` and so reach the take as played. That follows the
rule exactly and they are chords the hands really made. **If it should be the
roll’s rule instead, it is one line at the same site.**

🔴 **TWO THINGS ARE OWED AFTER `b0a0b06` AND THE KEEP WORK, AND NEITHER IS A
DEFECT. THEY ARE UNFINISHED WIRING.**

**1. `mkTake()` IS BUILT, GRADED AND CALLED BY NOTHING.** The within take
adaptation measures **+6.32 points of top 1** and it is idle until `/nola/` feeds
it. The API is in the commit message and in the plan’s section 14.
🔴 **AND `addLearned` IS THE WRONG SITE, WHICH WOULD WASTE MOST OF THE GAIN.**
`learned[]` is the DISTINCT chords somebody kept returning to, capped at
`LEARN_SLOTS = 6`. The take wants **the stream of chord events, repeats
included**, once per event.
⚠️ **AND THE PROVENANCE RULE IS ALREADY ON THAT PAGE**, from a report reading
*"you recorded a suggestion. why>"*. `take.heard(chord, proposed.has(key) ?
'suggested' : 'played')` makes it COUNTABLE, and `take.refused` is what the
assert reads. **There is no default source**, so a call that forgets to say is
refused rather than counted.

**2. `workers/view/public/resources/chord-tables.json` IS THE OLD 12,746 BYTE
TABLE.** `public/` is a committed deploy artefact and `cd workers/view && node
build.mjs` does `rm -rf public/`. ⚠️ **So that build belongs to a moment when
nothing is in flight**, which is why no agent ran it.

### Done 2026-09-25: a voicing with the root in the left hand and the rest rootless

✅ **DONE 2026-09-25 AS `Split`. MEASURED: chords-test 49 ok to 60 ok, `/nola/`
102/102 to 103/103**, so the fourth control button cost no assert anywhere and
the one new page assert is the whole of the change. Open it at
**http://127.0.0.1:8890/nola/** and press `Split` in the VOICING row.

**THE FOUR CHORDS FROM THE SCREENSHOT, ACTUAL NOTE NUMBERS**, window 48 to 72,
written out by hand in the test rather than computed from the rule they grade:

    Cmaj7   48, 52, 55, 59    C3 / E3 G3 B3
    Dm7     50, 53, 57, 60    D3 / F3 A3 C4
    Em7     52, 55, 59, 62    E3 / G3 B3 D4
    Fmaj7   53, 57, 60, 64    F3 / A3 C4 E4

The bass walks C3 D3 E3 F3, one note a chord, and the right hand travels **14
semitones over three changes, worst single move 2**. That is the tutorial’s two
staves.

✅ **THE NAME IS `Split` AND THE JARGON IS KEPT OUT OF SIGHT.** `rootless` and
`shell` are the vocabulary this control already drew a complaint about, so the
musician’s name is written once in `chords.mjs` for a reader who knows it and
nowhere a visitor looks. The hover reads *"the root on its own for your left hand
and the rest of the chord above it for your right"*.

✅ **A TRIAD LOSES ITS ROOT LIKE EVERYTHING ELSE** and gets a two note right
hand, `Cmaj` as C3 / E3 G3. Dropping the fifth instead would put the root back
above a bass that already has it, which is the one thing the mode exists to take
away. **Nothing is ever lost**, and that is an invariant over ten chords: a split
voicing holds exactly the pitch classes of the spelling.
🔴 **AND A SLASH CHORD KEEPS ITS ROOT, DECIDED BY A RED TEST RATHER THAN BY
TASTE.** `Fm6/C` is C3 D3 F3 G#3 C4. The premise of the mode is that the note
underneath already HAS the root; `Fm6/C` names a different note underneath, so
the premise fails and dropping the F would delete a note the symbol names. **The
first version dropped it and the pitch class assert went red**, which is how the
decision got made.

✅ **FOUR SABOTAGES, EACH RUN AND REVERTED**: leaving the root in the hand 4 red,
dropping it from a slash chord as well 2, placing the hand by span instead of
leading it 1, dropping the fifth instead of the root 5.

🔴 **ONE MEASUREMENT DECIDED A LINE OF CODE.** The distance is taken over the
BODY and not the whole voicing, because the bass is supposed to walk. MEASURED
over five lines and thirty chords: the hand travels **114 semitones compared body
to body against 132 compared whole to whole**, choosing differently on **10 of the
30**. ⚠️ **And on the four chords in the screenshot the two agree note for
note, so the supplied evidence would have settled nothing.**

⚠️ **THE PAGE GIVES `split` THE WHOLE DRAWN KEYBOARD (48 to 72) RATHER THAN
THE LETTER ROW (48 to 62).** MEASURED: into the letter row three of the four fit
and `Fmaj7` needs 64, **two semitones above the top letter key**. The letter row
is one hand and this voicing is two, so the mode declines a promise it never
made. **The bass is never let out of the window**, because the roll has no column
for a note the keyboard does not draw.

⚠️ **STILL OPEN: NOBODY HAS PLAYED IT.** Every number here is note numbers and
pixels, and whether this is the sound in the screenshot is a listening question.
⚠️ And a caller handing this mode an ALREADY INVERTED chord would have its
lowest note taken for a root. Every caller here passes `parseChord` output, so it
is documented and not enforced.

🔴 **ASKED, VERBATIM, WITH TWO SCREENSHOTS:** *"what voicing? wanna this"*.
One crop is `/nola/`’s roll on `Cmaj7 Dm7 Em7 Fmaj7`. The other is a piano
tutorial of **the same four chords**, notated on two staves: **a single bass note
per chord in the left hand (C, D, E, F) and three notes in the right that barely
move between chords.**

✅ **WHAT IT IS, NAMED: A ROOTLESS VOICING OVER A BASS ROOT.** The left hand
takes the root alone, the right hand drops the root and plays the notes that
carry the harmony, and the upper structure is placed to move as little as
possible from the chord before it. **That is why the tutorial’s treble barely
moves while the bass walks up C D E F.**

🔴 **AND `/nola/` CANNOT DO IT TODAY, WHICH THE PLAN ALREADY SAID IN
WRITING.** `plans/plan-better-chords-2026-09-25.md` section 12.2: the page voices
with `voiceChord(... near, bass: false)`, *"which is close position, no bass and
no inner voice motion, into a sampled piano"*, and **"nothing in this document
changes one thing a listener hears about the SOUND of a chord"**. It called this
*"probably the larger half of the complaint"*. **This is that half.**

⚠️ **`bass` ALREADY EXISTS IN `voiceChord` AND IT IS NOT THIS.**
`demo/shell/chords.mjs:319` takes `bass = false`, and `:322` reads
`src[0]`, **the lowest note of a SLASH chord’s named bass**. `:277` records
that the bass is never inverted in any mode. So the machinery for putting a note
underneath exists and is about `Fm6/C`, not about splitting a chord across two
hands. **Do not overload it silently.**

⚠️ **IT IS A FOURTH ENTRY IN A SHARED CONSTANT.** `VOICINGS = ['root',
'close', 'lead']` at `:282`, and `/nola/:1228` draws them as
`[['Exact', 'root'], ['Tight', 'close'], ['Smooth', 'lead']]`.
🔴 **SO THE NAME MUST BE A PLAIN WORD AND THIS PAGE HAS ALREADY PAID FOR
GETTING THAT WRONG.** The labels read `SPELLED`, `CLOSE` and `LEADING` for ten
minutes and the report was *"i do not know what spelled close leading means"*.
**`rootless` and `shell` are exactly that vocabulary again.**

⚠️ **AND ADDING A CONTROL OPTION MOVES EVERY OTHER CONTROL’S HARNESS PRESS**,
which is `positron-verify`’s standing rule. `chords.mjs` is imported by
`keyboard.mjs`, `roll.mjs`, `name.mjs`, `suggest.mjs` and `/nola/`.
⚠️ **THE ROLL HAS TO SURVIVE IT**: a bass note an octave or two below the
body widens the range `roll.mjs` draws, and this page already records a roll
drawn beside the instrument having *"neither its width nor its range"*.

### Done 2026-09-26: the keyboard looper detects a tempo and every later loop aligns to the first

✅ **DONE. Arithmetic `93acf28`, wiring `eb50054`. MEASURED: `numloop-test` 15
ok to 36 ok, `/kit/` 223/223 (211 page asserts) to 227/227 (215).** Open it at
**http://127.0.0.1:8890/kit/#keyboard**.

A second take of 300 ms against a first loop of 500 ms comes back at **250 ms**,
so it wraps exactly twice inside the first for ever instead of walking away.

✅ **TWO CELLS, EACH WITH ITS ABSENCE.** `150 bpm heard` off the playing,
`150 bpm set` when a page stated it, **empty** when there is none, never 0 and
never 120. The ratio reads `first`, then `x1/2 x1 x2 x1/4 x4`, and **`as played`
when the snap was refused. A refusal is a word, not a blank.**

🔴 **THE BRIEF’S PAGE LIST WAS WRONG AND IT IS SEVEN, NOT NINE.** `radio`
uses `looper.mjs` and `dump` only names `keyboard.mjs` in two comments. Measured
by COUNTING ELEMENTS in a browser rather than by grepping.

🔴 **AND ONE SABOTAGE CAME BACK FULLY GREEN, SO THAT CHECK WAS DECORATION.**
With notes struck and released in the same millisecond, feeding all eight
movements still answers four onsets, because `numloop.mjs` collapses anything
inside 50 ms into one chord and a down and its own up were 0 ms apart. Holding
each note 70 ms is what makes the wrong list answer eight.

🔴 **AND `/kit/` IS NOW CLOSE TO A CLIFF WHERE THE WHOLE PAGE READS RED.**
`verify.mjs` waits `1400 ms + 40 polls of 150 ms` for `d.ready()`. A first draft
of this block spent 2.7 s and took `/kit/` to **0/1 with 207 asserts** and
*"console: nothing, so it is hanging rather than throwing"*. The shipped block
spends 1.33 s and the page is ready at 7.2 to 7.4 s against a budget of roughly
7.8 to 8.6 s. **Under a second and a half is left in that file.**
⚠️ **AND THE ONE WORD NO CHECK IN THIS REPOSITORY DRAWS IS `heard` ITSELF.** A
tempo `numloop.mjs` will speak about needs three gaps of at least 375 ms, which
does not fit in that budget, so detection off real playing is graded by its INPUT
plus `numloop-test`’s 36 with no browser.

🔴 **ASKED, VERBATIM:** *"in keyboadd looper: do basic bmp detection / quant
and when first loop set, all next ones align on it, either times shorter, same or
longer"*.

**The subject is `demo/shell/numloop.mjs`, NOT `looper.mjs`**, and that is worth
establishing first because the two are easy to confuse. MEASURED: `keyboard.mjs`
imports `createNumLoop` from `./numloop.mjs` at `:125`, and `looper.mjs`’s real
importers are `transport-bar.mjs`, `/loops/`, `/looper/`, `/radio/` and
`/tapes/`. **The keyboard’s loops are the numeric ones.** `keyboard.mjs:122`
states the division: *"`numloop.mjs` owns WHICH slot is doing what; the keyboard
owns what"*.

✅ **THE TEMPO ARITHMETIC IS ALREADY IN THE KIT AND IS NOT BEING INVENTED.**
`demo/shell/step-grid.mjs:184` exports `stepMsFor(bpm, perBeat = 4)` and `:729`
carries a `bpm()` getter and a `setBpm()`. **Reuse it**, or the project has two
tempos that will disagree.

✅ **"EITHER TIMES SHORTER, SAME OR LONGER" IS AN INTEGER RATIO AND THAT IS THE
WHOLE ALIGNMENT RULE.** The first loop set becomes the unit, and every later one
is snapped to a power or a small integer multiple of it, so two loops can never
drift apart. **The set of allowed ratios is a decision to make out loud**, not a
default, because 1/4, 1/2, 1, 2, 4 and 1/3, 1, 3 are different instruments.

🔴 **AND A DETECTED TEMPO IS AN INFERENCE, WHICH THIS PROJECT HAS PAID FOR
REPEATEDLY.** *Basic* BPM detection off a take that is not metric returns a
number, and a number shown without its confidence is read as a fact. **Say
whether it was detected or assumed**, the same way `/knobs/` reports whether a
key was guessed. ⚠️ And decide what happens when the first loop is one note or
silence: there is no tempo in it, and the honest answer is not 120.

🔴 **THE ASSERT TRAP IS ALREADY WRITTEN DOWN ON THE PAGE NEXT DOOR.**
`/loops/` shipped *"quietly not looping"*: the page passed no `tickHost` and
never called `servo()`, so a wrap *"was neither committed nor polled: it simply
never happened"*, and **"the assert that should have caught it was tolerant of
'not reached yet' and passed vacuously every run"**. ⚠️ **So every assert here
asks what HAS HAPPENED, counted, never what is happening.** A second loop that
aligned is a loop that WRAPPED at the expected moment, counted.

✅ **`numloop-test.mjs` GRADES THIS WITH NO BROWSER AND IS THE CHEAP
INSTRUMENT.** ⚠️ **AND IT CARRIES ITS OWN WARNING**: writing the expected state
out by hand is doing the machine’s arithmetic a second time, so a test that
recomputes the implementation proves nothing.

⚠️ **IT IS SHARED: the keyboard reaches TEN pages.** The arithmetic is
`numloop.mjs`’s and the control and the readout are `keyboard.mjs`’s, which is
that file’s own stated division and is also how this can be worked while another
agent holds `keyboard.mjs`.

### Closed 2026-09-28 by deleting its subject: the keyboard’s note naming pair reads N and D, not Nt and Dg

🔴 **THE PAIR IS GONE FROM THE COMPONENT SINCE 2026-09-28** on *"finally: rm
N | D setting from keyboard component"*, so this line has nothing left to
rename. It was DONE first, as `N | D`, and lived that way for five days. Kept
rather than struck out, because the section under it is the width and hover
reasoning a one letter control needed, and the page that paid for that lesson
still exists. See the `Done 2026-09-28` entry at the top of this file.

⚠️ **ASKED, VERBATIM:** *"Nt | Dg to N | D in keyboard"*. The naming pair in
the keyboard’s own footer.

🔴 **IT IS `demo/shell/keyboard.mjs`, SO IT REACHES TEN PAGES AT ONCE** and
is done by whoever holds that module, never per page.

⚠️ **THE WIDTH RULE APPLIES HERE TOO.** It is a two state pair in a segmented
control, and this round has already established that a control must not change
size between its states. `Nt` and `Dg` are both two characters and `N` and `D`
are both one, **so the pair stays balanced with itself**, but the group gets
narrower and the row beside it must not reshuffle.
⚠️ **AND A ONE LETTER CONTROL NEEDS ITS HOVER.** `N` and `D` alone are not
self explanatory, so the `title` and the accessible name have to say note names
and degrees in full. **A private vocabulary on a control a visitor has to be told
about is exactly what `positron-ui` bans**, and `/nola/` already paid for it once
with *"i do not know what spelled close leading means"*.

### Open 2026-09-25: the keyboard footer rule is edge to edge, and it belongs to the kit

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT, AND IT IS A CRITICISM OF HOW THIS
IS BEING WORKED RATHER THAN OF ONE BORDER:** *"the border on top of footer goes
edge to edge. in the life of me i don ot understand why you do not see it and
build a soliutiojn that stays (glued panels) not invent custom css with
measurements each time"*. And immediately after: *"add space on left of nona to
be same as top and bottob paddings"*.

🔴 **AND IT LANDS ON WORK THIS ROUND SHIPPED, WHICH IS THE POINT.** While
`seam()` was being built in the kit as an edge to edge rule owned by a component,
`demo/nola/index.html:4397` hand rolled this:

    .nola-foot { --foot-air: 10px; ... border-top: 1px solid var(--line); }

That footer is appended to `keys.el`, INSIDE `.kbd`, and `.kbd` is
`padding: var(--kbd-pad)` with `--kbd-pad: 9px` (`shell.css:3576`). **So the rule
stops 9 px short of the box’s border on both sides.** A per page border with a
per page number, reasoned about at length in that page’s comments instead of
being put where it belongs.

✅ **THE FIX IS THAT `keyboard.mjs` OWNS ITS FOOTER AND THAT FOOTER’S RULE
BLEEDS THROUGH `--kbd-pad` TO THE BOX’S BORDER**, the same way `seam()` escapes
`--panel-pad` to reach a case’s edges. Same idea, different box, **derived from
the token rather than copied as a number so the two cannot drift**. One
implementation reaching the **ten** pages that import that module, so no page
writes this border again.
⚠️ **AND THE CONTENT KEEPS A SYMMETRIC INSET**, which is the second ask: the
`NOLA` plate sits at **0 px** from the row’s left while the row has 10 px above
and below. Left, top and bottom read the same.

⚠️ **THE PRECEDENT FOR WHY IT IS THE COMPONENT IS ALREADY PAID FOR TWICE.**
`/tom/`’s nameplate, where a page local repair meant *"every page after it
inherited the defect and not the fix"*, re-reported on `/plai/`. The `/shape/`
agent refused a page local `padding-block` the same hour for the same reason.

### Open 2026-09-25: `/knobs/` has a flaky pair of asserts, and the constant is 6.4x stale

🔴 **TWO ASSERTS ON `/knobs/` ARE A COIN TOSS, PROVED ACROSS THREE RUNS:**
`a wheel and an arrow key each take the dial back in one frame` and `and it picks
the movement up again after the yield`. **Red in one run, green in the next, red
in the third**, with no code change between them.

🔴 **AND THE ARITHMETIC SAYS IT CANNOT BE RELIABLE, WHICH IS WHY THIS IS A
DEFECT AND NOT A RERUN.** Both conditions hinge on whether the cutoff moved **one
step of 127** during an `await wait(900)`. The sweep is `lapMs: 14000` on a
beta(3,4) ease in with a 130 ms hold at each end and 12% timing jitter, **and the
knob starts AT an end**. 900 ms is **6.4% of one reach**, most of it the hold and
the slow part of the curve, so the expected travel is a fraction of one step.

🔴 **THE CONSTANT WAS CHOSEN WHEN THE LAP WAS 2,200 ms. IT HAS SINCE GONE
2,200 to 7,000 to 14,000, A FACTOR OF 6.4, AND THIS ONE WAS LEFT UNDERIVED.**
⚠️ **AND THE SIBLING WAIT FIVE LINES BELOW IT IN THE SAME FUNCTION ALREADY
CARRIES A COMMENT SAYING THIS EXACT THING HAPPENED TO IT AND WAS FIXED BY
DERIVING IT FROM `lapMs`.** The fix was applied to one of a pair.

⚠️ **THE ONE LINE VERSION DOES NOT WORK AND WAS CHECKED**: a tenth of a lap is
still only about two steps. Reliability needs roughly a THIRD of a lap, about
**4.9 s added** to a page that already leans on the harness’s patience, **or a
different quantity to assert**. That is a design call, which is why it is written
here rather than patched.

### Done 2026-09-28: `full: true` reaches nothing on `/knobs/`, and it was hidden by a dead assert

✅ **CLOSED BY THE INSTRUMENT PANEL, MEASURED RATHER THAN DECLARED.** The option
had no effect because `.kbd.kbd-full` is `width: 100%` of a `max-content` host,
and `.pos-rows` is `width: fit-content` with `max-width: 100%`, so a glued
surface stops at the room there is. **MEASURED at 1280 px before and after: the
keyboard box 990.0 px to 646.0 px, the widest white key 62.0 px to 49.0 px, which
is `--k-min`, the component's own grid track floor and not a squash, with 777.0
px of keys scrolling in 646.0 px of box.** 777 is exactly the figure this page's
own 2026-09-25 banded measurement recorded. The assert now prints the surface
width and the scroll figures beside the box, rather than asserting the box
against a quantity the box itself sets, which is what made it dead.

### Closed 2026-09-25 line, kept for its measurement

⚠️ **FOUND 2026-09-25 while repairing an assert that could never fail.**
`.kbd.kbd-full` is `width: 100%` of a `max-content` host, **so the option has no
effect on this page at all.** It was invisible because the assert that should
have caught it compared the keyboard’s box against the very flow that box sizes.

✅ **THE REPAIR WAS MEASURED AND NOT APPLIED, DELIBERATELY.** Banded, the box
reads **582.0 px, the case’s own content width**, with the keys scrolling inside
it, 777 px in 564 px. **The repair is the band**, so this waits on the band
rhythm work rather than gaining a page local workaround.

### Open 2026-09-25: a synth on/off says ON and OFF, not FAU ON and FAU OFF

🔴 **REFINED IN THE SAME STREAM, VERBATIM:** *"just [() ON] and [() OFF]
(same w)"*. Two things, and the second answers the open question below.

✅ **THE DOT STAYS.** The control is the dot plus the word, so this is
`showName: false` and NOT stripping the badge to a bare word. The leading dot is
fixed to the text by the reserve, and `presence.mjs:345` records that moving it
right failed once and was asked back.

🔴 **AND `(same w)` IS A REQUIREMENT RATHER THAN A CHECK: BOTH STATES ARE
THE SAME WIDTH.** `OFF` is one character wider than `ON`, so the reserve after
the name is dropped is computed on the WIDER of the two, not on whichever one is
showing. **The button may not change size when it is pressed.**
✅ **THE PRECEDENT IS ALREADY HERE**: the transport bar reserves both words of a
two state button so that *"the control cannot change size under the finger that
pressed it"*. This is that rule on a different control.
⚠️ **THE ASSERT IS EQUALITY, NOT A TOLERANCE.** Read the width in `online` and
again in `offline` and require them EQUAL. A tolerance would hide exactly the
defect being asked about, and it must be driven through a real toggle so it
cannot pass vacuously.

⚠️ **ASKED, VERBATIM:** *"on synth on offs do not add synt name to fau on /
fau off: just ON OFF"*.

✅ **TRACED RATHER THAN GUESSED.** `buildHeader` in `demo/shell/instrument.mjs`
at `:169` reads `of = name`, so **the header’s status control defaults to the
instrument’s own name**, and `presence.mjs:329` paints the name and the state as
one string when a badge has an `of`. That is what makes it read `FAU ON`.

✅ **THE OPTION ALREADY EXISTS AND NOTHING IS INVENTED**: `showName: false`.
🔴 **AND `of` STAYS, WHICH IS THE PART THAT IS EASY TO GET WRONG.** The aria
label at `:178` is `switch ${of} on and off`, and a screen reader has to know
WHAT is being switched. *"switch on and off"* names nothing. **So this changes
what is PAINTED, not what the control knows about itself.**

✅ **AND THE ARGUMENT IS ALREADY IN THAT FILE FROM THE OTHER SIDE.** The header
carries the nameplate on the same row, and `instrument.mjs` records refusing a
plate beside a header because *"a plate beside it is the name twice on one row"*.
A status button naming the instrument again is that a third time.

**WHO IT REACHES**, MEASURED, pressable headers only: `/fau/:1194` (`FAU`),
`/muta/:783` (`PLAITS`) and `:918` (`WARPS`), plus `/kit/`’s three specimens.
`/knobs/` has `online: false` and is unaffected. **Three real pages, one kit
change.**

⚠️ **THE THING TO CHECK IS THE RESERVE, NOT THE WORD.** `presence.mjs`
reserves the widest phrase the badge can say, and the dot is fixed to the text
BECAUSE of that reserve. `:345` records that going the other way failed once and
was asked back. **Dropping the name changes the widest phrase**, and a reserve
computed on a phrase that no longer exists leaves the dot floating with a gap,
which reads as a stray mark rather than part of a label.

### Open 2026-09-25: the chord name moves about one character left in the keyboard

⚠️ **ASKED, VERBATIM:** *"move chordname ca 1ch left in keyboar"*. A nudge,
not a re-layout: *ca 1ch* is about one character width.

**The subject** is `.kpad-chord` in `demo/shell/keyboard.mjs`, built at about
`:913` as `make('span', 'kpad-chord', '')` with
`chordEl.style.minWidth = `${CHORD_CH}ch``, sitting in the keyboard’s own footer
to the right of the displacement readout.

🔴 **IT IS SHARED, SO IT IS DONE ONCE.** `demo/shell/keyboard.mjs` is
imported by **ten** pages (`able`, `fau`, `dump`, `evo`, `instrument`, `knobs`,
`kit`, `looper`, `nola`, `radio`) plus `chords.mjs` and `roll.mjs`.

🔴 **AND THE ONE THING NOT TO BREAK IS THE REASON THE CELL EXISTS.** It
RESERVES the widest name it can ever hold, computed from `name.mjs`’s own
tables rather than typed, so that a name going from `C` to `G#min7b5/D#` does
not move everything beside it. The original ask was *"avoind text moving in x
axis"*. **A nudge that makes the cell size to its content would answer this ask
by reinstating the one it was built to fix.** Read the cell’s left edge with a
one character name and again with a long one, and check both.
⚠️ **EXPRESS IT IN `ch`.** `ch` on a mono face is exactly characters, which is
what makes that arithmetic a measurement rather than an estimate.

### Done 2026-09-25: `/nola/`'s instrument choice becomes the standard patch selector

✅ **DONE 2026-09-25. MEASURED: 95/95 green before, 98/98 green after**, so the
three new asserts are the whole of the change in the count and no existing one
went silent. Open it at **http://127.0.0.1:8890/nola/**.

**The licence survived, which was the one part that could have broken something
outside the page.** The credit is written back onto the value cell after every
draw through the single function that calls `show()`, so `picker.mjs` overwriting
its own title no longer loses it. ⚠️ **AND THE ASSERT NOW HAS A NEGATIVE
CONTROL IT DID NOT HAVE BEFORE**: it reads the title with the Rhodes chosen, then
reads it again after switching to the piano and requires it to have CHANGED. A
credit written once at build would have been wiped by the redraw, and the old
shaped check would have stayed green on whatever was left.
⚠️ **ONE THING GENUINELY CHANGED FOR A READER**: a choice gave every option
its own button and so a hover that existed whatever was selected, and a selector
shows one name at a time, so the credit now FOLLOWS the selection. It is
reachable while the Rhodes is chosen and not while the piano is. The log line on
the first Rhodes press is the second channel and is untouched, and
`LICENSE-jrhodes3d` and `PROVENANCE-rhodes.json` still ship.
⚠️ **AND THE TEN INDEX DRIVEN PRESSES ARE GONE**, eight of them replaced by a
helper that presses the control until it reads the instrument NAMED. The tenth,
the one whose meaning genuinely inverted, became an explicit press of `‹` WITH
an assert on it, so the back arrow is no longer a button nothing in this
repository has ever pressed.
⚠️ **OPEN, AND SMALL**: the plate reads `NOLA` in upper case, which is the
kit default. `/shape/` and `/knobs/` both take `caps: false` because their asks
named a lower case word. Nothing was said about this one, so it took the rule.

🔴 **ASKED, VERBATIM:** *"in nolda demo convert instrument radiobutton to std
patch selector and add top border to that footer. add nola nameplace to the left
of footer"*. `nolda` is `nola`, `nameplace` is nameplate. Three changes to one
row: the control, a border above it, and a plate at its other end.

**Where it is today.** `createChoice` at `demo/nola/index.html:1070`, `label:
'INSTRUMENT'`, `options: [['Piano', 'piano'], ['Rhodes', 'rhodes']]`, mounted at
`:1205-1207` into `.nola-foot`, which is appended to `keys.el` and so lives
INSIDE the keyboard's own box. The standard patch selector is
`createPicker({ what: 'patch', prev, next })` from `demo/shell/picker.mjs:171`,
as `demo/kit/index.html:1478` and `demo/fau/index.html:1195` already call it.

🔴 **THE PAGE'S OWN CHECKS DRIVE THIS CONTROL BY INDEX, AND THE TWO COMPONENTS
INDEX DIFFERENTLY, SO A BLIND SWAP STAYS GREEN AND DRIVES THE WRONG THING.**
`createChoice` gives one button PER OPTION, so `instPick.buttons[0]` is Piano and
`buttons[1]` is Rhodes. `createPicker` returns `buttons = [back, fwd]`
(`picker.mjs:213`), so `buttons[0]` becomes *previous* and `buttons[1]` becomes
*next*. MEASURED 2026-09-25: **ten call sites** in this page click one of the
two, at `:3023`, `:3079`, `:3110`, `:3309`, `:3331`, `:3357`, `:3365` and
`:3375`, plus a title read at `:3092` and a box read at `:2546`.
⚠️ **AND THE FAILURE IS SILENT IN THE ONE DIRECTION THAT MATTERS.**
`buttons[1].click()` meaning *Rhodes* happens to still land on Rhodes, because
*next* from Piano is Rhodes. `buttons[0].click()` meaning *back to Piano* becomes
*previous*, which from Piano either wraps or does nothing. **Every one of those
ten is rewritten to name the instrument, not an index.**

🔴 **AND THE LICENCE HOVER HAS NO HOME ON A PICKER, WHICH IS THE ONLY PART OF
THIS ASK THAT CAN BREAK SOMETHING OUTSIDE THE PAGE.** The Rhodes is used under
CC BY-NC-SA 4.0, attribution has to travel with the work, and since 2026-09-23
the attribution IS this control's hover: `title: (id) => ...` at `:1075`,
asserted at `:3092-3094` against `/Learman/` and `/CC BY-NC-SA 4\.0/`. A picker's
arrows carry `the patch before this one` and `the patch after this one`, and its
value cell **overwrites its own title on every draw**: `cell.title = label_` at
`picker.mjs:103` and again at `:160`. So anything written there is gone the next
time the name is drawn. **Decide where the attribution lands before converting
the control.** It is not a paragraph under the keys, which was already removed on
instruction.

⚠️ **THE COMMENT ABOVE THE CONTROL ARGUES AGAINST THIS ASK IN WRITING.**
`:1056-1058`: *"Two mutually exclusive named options is `createChoice` and
nothing else: `picker.mjs` is a stepper for a list too long to show"*. An
instruction supersedes a rule and `LAYOUT.md` already says so. What it must not
do is stay there contradicting the page.

⚠️ **THE TWO CSS HALVES FIGHT EACH OTHER TODAY.** `.nola-foot` at `:4133` is
`display: flex; align-items: flex-end; margin-top: 10px`, and `:4134` is
`.nola-foot > * { margin-left: auto }`, which parks its one child hard right. A
plate on the LEFT and the picker on the right is `space-between` with that
blanket `margin-left: auto` removed, or both children end up right.

✅ **THE PLATE IS A KIT COMPONENT AND THIS PAGE HAS NONE TODAY**, measured: zero
occurrences of `nameplate` or `pos-plate` in `demo/nola/index.html`.
`createNameplate` is `demo/shell/panel-layout.mjs:355` and `plateSpec(maker,
name, place)` is `demo/shell/instrument.mjs:102`.
⚠️ **AND `plateSpec` DOWNGRADES A ONE LINE PLATE, WHICH IS THE OPPOSITE OF THE
INTUITIVE ANSWER.** `plateSpec('', 'nola')` returns place `end`, not `ends`,
because `ends` is `space-between` and parks a lone child on the LEFT, which is
exactly the placement this ask wants. Read the block at `instrument.mjs:82-99`
before choosing a placement.

⚠️ **THE FOOTER IS INSIDE `keys.el`, NOT UNDER IT, AND THAT WAS DELIBERATE ON
2026-09-25.** The keyboard's box is `width: fit-content`, so a sibling below it
would be a different width or force the box to stretch, and stretching it is the
one thing that box refuses. **A top border is therefore the first line drawn
across the inside of the keyboard's box**, so it is checked against that box's
own border rather than eyeballed.
⚠️ `positron-ui` loads before a line of this is written. If a picker variant or
the plate change lands in `demo/shell/`, it is SHARED, done once, `/kit/` re-run.


### Open 2026-09-25: `/shape/` loses its left rail and the plate moves to the top right

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT:** *"rm left panel / section. use
nameplate on top right. shape demo"*. The crop shows the rack's `VOICE` section,
four sliders, and a narrow column down the left holding `shape` turned ninety
degrees.

🔴 **THIS REVERSES AN ASK FROM THE SAME DAY AND THE OLD ONE IS QUOTED IN THE
FILE.** `demo/shape/index.html:576`: *"into isntrument box. nameplate is
\"shape\" vertical glued section"*. The vertical plate IS that instruction. So
this is a reversal, not a repair, and the reasoning around it comes out with it
rather than being left to contradict the page.

🔴 **AND IT DOES NOT STRAND THE KIT PLACEMENT, WHICH WAS WORTH CHECKING BEFORE
ASSUMING IT DID.** `place: 'side'` was created for this page and
`instrument.mjs:97` says so: *"`/shape/` is exactly that, `shape` with no maker.
Sending it to `end` would put the one page that asked for a vertical plate back
on a horizontal one"*. MEASURED 2026-09-25: `side` has exactly **two** callers,
`demo/shape/index.html:608` and `demo/knobs/index.html:730`. ⚠️ **`/knobs/` keeps
it, so `side` and `KEEPS_ONE_LINE` stay.** Deleting either would break the other
page.

⚠️ **THREE CHECKS READ THE THING BEING REMOVED.** `demo/shape/index.html:1373-1377`
measures the plate's height against the case's inner height and asserts
`place === 'side'`. `demo/shell/instrument-test.mjs:80-87` grades
`plateSpec('', 'shape', 'side')` with no browser at all. **The page assert moves
to the new placement; the kit test stays**, because it is about the function and
`/knobs/` still calls it that way. Rewriting the kit test to match this page
would delete `/knobs/`'s only no-browser coverage of that path.

⚠️ **`panel: { side: null, flow: false, plateSide: 'left' }` AT `:609` IS THE
LEFT RAIL**, and `panel-layout.mjs:187` only sets `plateSide` when the place is
`side`. *"rm left panel / section"* is that rail. **Check what else is in it
before the column goes.**
⚠️ **TOP RIGHT IS A HEADER AND THIS PAGE HAS NO HEADER**, stated at `:584`:
*"This page has no header, this plate is not on that row"*. So this either builds
that header row or puts the plate in the rack's first row. `instrument.mjs:108`
is the header and its right cell is the plate's home, at `end` and never `ends`.


### Part done 2026-09-25: an edge to edge horizontal separator on every button group

✅ **THE KIT HALF IS DONE, COMMIT `8ea1b59`. MEASURED: `/kit/` 217/217 before
(205 page asserts) and 221/221 after (209), so the four new asserts are the whole
of the change.** `verify.mjs muta shape` 104/104 green, `instrument-test` 17 ok.

    panel.seam()     a rule, edge to edge of the case
    panel.band(el)   a block stacked across the case, under what is there
    inst.seam() / inst.band(el)   forwarded by createInstrument

⚠️ **`band()` IS NOT `add()`.** `add()` puts a block in the scroller,
`band()` puts it in the case, and that distinction is the whole constraint.

🔴 **AND THE CONSTRAINT IS STRUCTURAL RATHER THAN STYLISTIC, MEASURED ON
`/knobs/` RATHER THAN ARGUED: A SEAM IS EDGE TO EDGE ONLY AS A CHILD OF THE
CASE.** Inside the scroller it is not hard, it is impossible. A rule put in that
page's `.panel-flow` laid out at **992 px against a 686 px case**, because the
flow is `width: max-content` around a keyboard wider than the panel. A negative
margin made it wider still and reached nothing: **`scrollLeft` clamps at 0**, so
inline-start overflow inside `overflow-x: auto` is clipped for good. **A page
whose sections live in the flow has to lift them into bands to get this.**

✅ **THE SEAM CROSSES A SIDE PLATE RAIL AND THE NAME IS PAINTED OVER IT.**
MEASURED: a side plate is `justify-content: flex-end` under `writing-mode:
vertical-rl`, so the ink sits at the TOP of the rail. `/shape/` **41 px of ink in
a rail of 1722**, `/knobs/` **41 in 199**. The rule passes behind the word and
reappears either side of it. ⚠️ The ground is on the LINE and not on the
plate, deliberately: a background on the plate would mask the whole rail and
erase the seam across it, which is the opposite of edge to edge.

🔴 **AND THE GRID CASE NEEDED EXPLICIT ROWS, WHICH `shell.css` PREDICTED IN
ITS OWN COMMENT**: *"which looks identical until a case grows a third child"*. A
case grows third and fourth children the moment it carries bands. MEASURED before
the fix, a four child case laid out `1721.5px 70.5px 0px 0px 1px 70.5px`, **six
tracks for four bands**, two of them empty ones the plate had blocked.

✅ **THE ASSERTS WERE SABOTAGED TO PROVE THEY BITE.** Remove the negative
margin: **2 of 4 red**, reading `20.0 px off the left inner edge and -20.0 off the
right`, which is the case’s own padding at both ends. Remove the row count:
**1 of 4 red**, with the seam and the band piled into row 1 at y17126.3. The
fourth is a negative control, a case with no side plate carrying no count.

⚠️ **STILL OPEN: WHICH PAGES GET SEAMS.** `/knobs/` and `/shape/` are being
decided by their own agents this round, and each has to judge whether lifting its
sections into bands costs anything it already guarantees. **`createButtonGroup`’s
four pages (`kit`, `mirror`, `twelve`, `weight`) were deliberately NOT swept**,
on the rule that a component name is not evidence that a page wants a rule drawn
through it.
⚠️ **AND NOTHING GRADES THE SEAM ON A PHONE.** `demo/verify.mjs` runs at 756
px with no viewport override and `--panel-pad` does not change there, so the
margin holding at phone width is READ and not measured.

⚠️ **ASKED, VERBATIM:** *"on each button group have horizontal panel separator
edge to edge"*.

🔴 **THE SUBJECT IS AMBIGUOUS AND THE TWO READINGS ARE DIFFERENT WORK, SO IT IS
WRITTEN DOWN RATHER THAN GUESSED AT SILENTLY.** It arrived directly after the
`/shape/` screenshot, and **`/shape/` has no button group**: it has nine SLIDER
sections, read at `:1491` as `VOICE OSC 1 OSC 2 MIXER FILTER ENVELOPE 1
DISTORTION CHORUS MACRO KNOBS`, drawn as `.sld-group`. The kit's
`createButtonGroup` is `demo/shell/button-group.mjs:75` and has **four** page
callers plus `pad.mjs`: `kit`, `mirror`, `twelve`, `weight`.
✅ **THE `/knobs/` SKETCH THAT ARRIVED NEXT SETTLES IT AS A SECTION SEPARATOR**,
because it draws the rules between the rotaries, the keyboard and the footer and
none of those three is a button group. **Built as a panel section separator,
applied where a section boundary exists, and NOT swept across four pages on the
strength of a component name.**

⚠️ **EDGE TO EDGE IS THE WHOLE DIFFICULTY AND IS WHY THIS IS NOT A
`border-top`.** `.panel-case` is `padding: 0 var(--panel-pad)`, so a rule drawn
on the group itself stops short of the case on both sides. A separator that
reaches the case's own edges has to escape that padding.
⚠️ **AND `panel-layout.mjs:362` ALREADY RECORDS A HORIZONTAL RULE SHIPPING TWICE
BY ACCIDENT**, *"this project has already shipped twice as a horizontal rule
nobody wrote"*. Read that before drawing a third.
🔴 **IT IS SHARED WORK.** If it lands in `panel-layout.mjs`, `button-group.mjs`
or `shell.css` it is done ONCE, by one agent, before any page agent starts, and
`/kit/` is re-run.


### Done 2026-09-25: `/knobs/` always enables MIDI, and the rail is gone

✅ **DONE 2026-09-25. MEASURED: 31 green of 35 before (29 page asserts), 34 of
38 after (32).** The plate assert became three and the MIDI visit assert gained a
machine independent partner. Open it at **http://127.0.0.1:8890/knobs/**.

✅ **"ALWAYS ENABLE MIDI" IS THE ALREADY GRANTED READING AND IT RAISES NO
PROMPT.** `navigator.permissions.query({ name: 'midi' })` on load, and on
`granted` the page opens MIDI itself so the footer button arrives reading `midi
is listening` and disabled. On `prompt`, `denied`, `unavailable` or no answer,
the visit is exactly what it was.
🔴 **AND THE VACUOUS PASS WAS DESIGNED AROUND RATHER THAN WALKED INTO.**
The old `midiAskedOnLoad` counter is read on the module’s last line and a
permission answer arrives a tick later, **so on a granted browser it would have
stayed 0 while the page really had opened MIDI on the visit.** There are two
counters now and the checks await the permission answer before pressing.
⚠️ **THE BRANCH THE HARNESS GRADES IS `prompt`, AND THE ASSERT PRINTS IT.**
The other half is a named predicate run against all five answers with no
permission, no prompt and no device, so the naive reading (always true) fails the
`prompt` line and a page that never opens fails the `granted` line.

✅ **THE `shown()` DEFECT IS FIXED** and the assert it lived in is gone anyway,
replaced by `/shape/`’s two assert pattern reading `plate.lines[0]`, the ink.
MEASURED: 20.0 px of a 20.0 px inset on both edges.

✅ **TWO MORE REDS FIXED THAT WERE NOT IN THE BRIEF, AND BOTH WERE BAD CHECKS**:
`each rotary drives its own controller` pressed `ArrowUp` on a dial already at
**127, its ceiling**, so the key clamped and sent nothing and it read one
controller of two, looking exactly like a dial wired to nothing. The arrow points
away from the end now and the ceiling is read off `aria-valuemax`. Green at
`CC 71, 74`. And `the keyboard is twenty-five keys and its box spans the case`
**could never fail**: it compared the keyboard’s box against `.panel-flow`, which
is `width: max-content` and is therefore sized BY that box, printing `992.0 px
wide inside a flow 992.0 px wide` against a case of 686.0.

🔴 **AND THE HANDOFF’S ATTRIBUTION OF THE REMAINING REDS TO THE RASPBERRY PI
WAS WRONG, CHECKED 2026-09-25.** Both board shaped reds are **structurally
unreachable under a default harness run whether the Pi answers or not**:
`this page makes no sound of its own` needs `board.ctx()`, and `startAudio()` is
only reached from a key press or `startNote()`, which `MAY_PLAY` deliberately
blocks. `the relay delivered the control messages this page sent` needs
`w.sent > 0` and the same guard held all 42 messages back. **Both need
`?board=1`.** ⚠️ The Pi WAS answering minutes later, with the footer reading
ONLINE and the log reading `yoshimi is playing on the board`, and was not during
the verify run. Both are true and it comes and goes.

⚠️ **THE SEAM IS REFUSED HERE TOO, WITH `/shape/`’S COLLAPSE REPRODUCED
INDEPENDENTLY**: strip bottom to seam **0.0 px**, seam to keyboard **0.0**,
keyboard to the case’s inner bottom **0.0**. ✅ What measured well and is worth
keeping: the seam reached **x297.0 to x983.0**, the case’s own inner edges to the
pixel. 🔴 **AND ONLY ONE OF THE SKETCH’S THREE RULES WAS EVER THIS PAGE’S TO
DRAW**: `.panel-case` has a 1 px border and `createGlue` already puts 1 px of
`--line` between the case and the footer, measured at case bottom 344.8 against
footer top 345.8. **Three seams would have doubled two edges.**

⚠️ **`place: 'side'` NOW HAS ZERO PAGE CALLERS.** Nothing was deleted.

🔴 **CORRECTED 2026-09-25, AND IT REVERSES THE PLATE HALF OF THIS ENTRY.
ASKED, VERBATIM, WITH A SCREENSHOT:** *"knobs: rm right panel. use regular
nameplate. i do not usrstand what you are doing"*.

⚠️ **THE READING ABOVE WAS WRONG AND IT WAS THIS SESSION’S OWN.**
*"knobs nameplate vertically"* was read as *keep the plate vertical*, and the
part B written under it argued for keeping `side` and the rail. **What was
wanted is the rail GONE and a regular horizontal plate top right**, which is
what `/shape/` was given in `54a1d02`. The screenshot shows the rail as an empty
column down the right edge of the case carrying nothing but the turned word,
with the seams stopping short of it.

✅ **SO IT IS `/shape/`’S CALL, COPIED RATHER THAN INVENTED**: `place: 'end'`
with `panel: { side: null, flow: false }`, and BOTH `side: 'left'` and
`plateSide: 'right'` out, because `plateSide` is read only when the placement is
`side`.

🔴 **AND THIS STRANDS A KIT PLACEMENT, WHICH IS A THING TO DECIDE AND NOT
TO TIDY AWAY.** `place: 'side'` had exactly two callers, `/shape/` and
`/knobs/`, and after this it has **none**. `demo/shell/instrument-test.mjs`
still grades `plateSpec('', 'shape', 'side')` with no browser and stays green,
because it is about the function. ⚠️ **Nothing was deleted**, and the
question of whether a placement no page uses should stay in the kit is left open
here rather than answered by whoever happened to be editing.

⚠️ **AND THE REPORTING WAS PART OF THE COMPLAINT.** *"i do not usrstand what
you are doing"* arrived after two long reports about band rhythm and case
children. **The plumbing is not the report.** What shipped, what it looks like
and where to open it is.

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT AND A SKETCH:** *"knobs. always enable
midi, knobs nameplate vertically"*, drawn as

    -----------
    ()()  KNOBS
    -----------
    |||||||||||
    -----------
    footer

The crop shows the case's right rail carrying `knobs` turned ninety degrees, the
keyboard, and an `enable midi` button alone in the footer.

**A. 🔴 "ALWAYS ENABLE MIDI" RUNS STRAIGHT INTO AN ASSERT AND A STANDING RULE,
AND THE NAIVE READING SHIPS A PERMISSION PROMPT TO EVERY VISITOR.**
`demo/knobs/index.html:1482` asserts `midiAskedOnLoad === 0`, and `:1470` records
why: *"`requestMIDIAccess` raises a permission prompt"*. `CLAUDE.md`'s rule is
that a visit opens nothing and asks nothing. **Calling `requestMIDIAccess` on
load would put a browser permission dialog in front of somebody who came to
read.**
✅ **THE READING THAT SATISFIES THE ASK WITHOUT BREAKING THE RULE IS THE ALREADY
GRANTED ONE.** `navigator.permissions.query({ name: 'midi' })` answers `granted`
on a browser that has already said yes, and opening on that answer asks a first
time visitor nothing while removing the press on the desk where this page is
actually used. **That is what will be built unless corrected.**
⚠️ **AND THE ASSERT MUST NOT BECOME ONE THAT PASSES VACUOUSLY**, which is this
project's most repeated harness defect. *"zero asks on a visit"* conditioned on
*"unless already granted"* is exactly the shape that passes on a machine where
the condition never holds. **Grade both branches, or grade the branch the harness
is actually in and say which.**
⚠️ `midiAsked` at `:54-57` wraps `requestMIDIAccess` before any page code runs,
and `:1506` asserts `midiAsked === 1` after a press. An auto-open changes both
counts.

**B. ⚠️ THE PLATE IS ALREADY VERTICAL, SO THE INSTRUCTION IS ABOUT WHAT THE NEW
SEPARATORS DO TO IT.** `demo/knobs/index.html:730` is `place: 'side'` with
`panel: { side: 'left', plateSide: 'right' }` and `caps: false`, and `:1447`
asserts `inst.plate.el.dataset.place === 'side'`. The sketch's three rules run
edge to edge across a case whose right edge is that rail. **So the question the
sketch answers is whether a separator crosses the plate rail or stops at it**,
and the answer the sketch gives is that it crosses: the rules span the full
width. Keep the plate vertical, keep `side`, and check the plate still reads
after a rule is drawn through its track.
⚠️ **THE FOOTER IS A HEADER AT THE BOTTOM**, `header: { at: 'foot', plate:
false, online: false, patch: midiBtn }` at `:732`, so the `enable midi` button is
in the header's PATCH slot. If the press goes away, that slot needs an answer
rather than a hole.

### Open 2026-09-25: `/wish/`'s diagram should gently grey what is not plugged in

🔴 **ASKED, VERBATIM, ACROSS THREE MESSAGES:** *"make diagram parts grayed out
when no hardware conneted. ping hw"*, then *"gently"*, then *"wish demo"*.

So the subject is `demo/wish/index.html`, the treatment is SUBTLE rather than a
hard off state, and the page is expected to find out rather than assume.

✅ **THE DIAGRAM ALREADY HAS THE RIGHT THREE BOXES AND THE PORT LIST ALREADY
NAMES THEM.** `PORTS` at `demo/wish/index.html:536` carries a `box` on every
entry, and there are exactly three: **`keys` (MK-425C USB MIDI Keyboard),
`circuit` (Circuit) and `model12` (Model 12, four ports across two pairs)**. So
*is this box connected* is already answerable as *did any of its declared ports
resolve to a real one*, with nothing new to model.

🔴 **AND HERE IS THE HARD PART, WHICH IS NOT THE COLOUR. THIS PAGE MAY NOT ASK
THE BROWSER FOR MIDI ON A VISIT, AND IT ASSERTS THAT TODAY.** `midiAsked` wraps
`navigator.requestMIDIAccess` before any of the page's own code runs and the
assert reads **`the visit asked 0 time(s)`**. `requestMIDIAccess` is the only
thing that can enumerate ports, so **on first paint the page genuinely does not
know what is plugged in, and it is not allowed to find out.**

🔴 **SO GREY MUST NOT MEAN TWO THINGS, AND THIS PROJECT HAS ALREADY PAID FOR
THAT EXACT MISTAKE.** `positron-verify`: *"a blank cell collapses we did not look
and we looked and it was fine"*. **`not asked yet` and `asked, and it is not
there` are two states**, and one dimming for both would tell a reader their
Circuit is unplugged when nothing has looked. Three states, named:
- **not asked yet**, which is every visit until somebody presses
- **asked, and the port answered**
- **asked, and it did not**
⚠️ Only the third earns the grey. What the first should look like is a design
question worth one sentence from the owner, and the honest default is *the
picture as it is today, with a word saying nothing has been asked*.

⚠️ **"GENTLY" HAS AN EXISTING TOKEN AND A MEASURED PRECEDENT, SO NOTHING IS
INVENTED.** `--ctl-off` is the switched-off ink this stylesheet already uses, and
`/evo/` is the page it was measured on. ⚠️ **BUT `/evo/` STOPPED BEING THAT
SUBJECT ON 2026-09-25** (*"make all buttons interactive"*, 0 of 24 controls off),
so the citation beside that rule is already being corrected. **Check the
contrast that is actually left** rather than copying a number: `/evo/`'s own
readability assert moved from a CEILING at 3.0 to a FLOOR at 3.0 and now reads
**5.91:1**, which is the opposite requirement. A greyed diagram box still has to
be readable.
⚠️ **AND IT IS A DIAGRAM, SO `positron-diagram` IS LOADED BEFORE A LINE IS
DRAWN.** `diagram.mjs` owns what a box, a label, a sub and a note are, and a
greyed state is a new thing for it to carry. **If it lands in `diagram.mjs` it is
SHARED** and reaches the sixteen pages that draw one, nine of which touch
hardware. Done once, `/kit/` re-run.

🔴 **"PING HW" HAS NO COMMAND LINE ANSWER ON THIS MACHINE, MEASURED
2026-09-25.** There is no CLI that can enumerate this desk's USB MIDI ports:
`rig/m1/midilisten.c` is C, and this laptop SIGKILLs locally compiled binaries,
which is a standing rule and not a thing to work around. **The only thing that
can see a Web MIDI port is a browser, behind a press.** So the ping is a press on
the page, and the diagram updates from what it gets back.
🔴 **THE OTHER HARDWARE WAS PINGED AND IT IS NOT ANSWERING. MEASURED
2026-09-25:** `node rig/board/ask.mjs --room studio-1 audio.status` answers
**`no reply in 5 s`**. That is the Raspberry Pi rather than this desk's USB MIDI,
so it is not `/wish/`'s subject, and it matters here for two reasons. It
independently explains three of `/knobs/`'s four red asserts, which need the
board. And **the `/knobs/` screenshot sent the same hour reads `RASPBERRY PI
ONLINE`**. The two observations are minutes apart and a board can come and go, so
this is NOT yet a finding that the badge lies. ⚠️ **It is a thing to check
deliberately while building a greyed diagram**, because a picture that greys on
presence is only as honest as the presence it reads, and this is the one page
whose whole subject is what is plugged in.

✅ **`access.onstatechange` IS THE HALF THAT MAKES IT LIVE**, and `/wish/` already
listens to it for the re-adopt. A box that greys when an instrument is unplugged
WHILE somebody watches is the version of this worth having.
⚠️ **AND THE KNOWN WEAKNESS IS NAMED IN THAT PAGE ALREADY**: the binding matches
a DECLARED LABEL against a port name, and CoreMIDI really does rename a held port
to `Circuit 2`. **So an instrument that comes back under another name will grey
even though it is plugged in.** That is a false negative in the one direction
that matters, and whatever ships says so in the log rather than silently lying in
the picture.


### Open 2026-09-25: a closed page leaves the show running, and it is billed

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT OF THE CONTROL ROOM ON AIR:** *"i see
mix of old hls. you need to stop streaming immediately when pae closes"*, then
*"some sort of \"keep alive\" signals?"*.

**What the screenshot shows**: `ON AIR`, colour bars from the container, the
burned in clock reading `18:45:06` and absolute `1790361905.741`, a show clock at
`0:08.461` and the HLS button reading `STOP HLS`. The complaint is that what
arrives is a MIX of an older run's output, which is what a publisher nobody
stopped looks like from the outside.

🔴 **THIS IS THE MOST EXPENSIVE ITEM IN THIS FILE AND IT IS NOT A UI BUG.** A
publisher left running is a container left running and a Cloudflare input left
open, billed by the minute, with nobody watching. `CLAUDE.md` already carries the
rule about what costs real money and somebody else's server; this is our own
money and our own server, and the same rule applies harder because nothing stops
it by itself.

⚠️ **AND THE PAGE CANNOT DO IT WITH AN UNLOAD HANDLER, WHICH IS THE OBVIOUS
ANSWER AND THE WRONG ONE.** `beforeunload` and `unload` are not delivered
reliably on a closed tab, a killed browser, a crashed machine or a phone going to
sleep, and `navigator.sendBeacon` is best effort. **A stop that depends on the
page being alive to send it cannot cover the case where the page is gone**, which
is precisely the reported case.
✅ **SO THE ASK'S OWN SECOND MESSAGE IS THE RIGHT SHAPE: A KEEP ALIVE.** The
publisher stops itself when nobody has said *I am still here* for N seconds.
That is a liveness lease rather than a farewell message, it survives a crash, and
it is the same reasoning `workers/items` already uses for an alarm that fires
with no request. **Decide N out loud**, because N is how long a forgotten show
runs.
⚠️ **THE CONTAINER ALREADY HAS A COLD START THAT BLOCKS `GET /status`**, so
whatever is built must not mistake a waking container for a dead one.
⚠️ **AND "A MIX OF OLD HLS" IS A SECOND CLAIM WORTH SEPARATING**: a stale
playlist being served is not the same fault as a publisher left running, and one
can be true without the other. **Check which before fixing either.**

### Open 2026-09-25: `/stage/`'s transport buttons are hand rolled, so they lost the shimmer

**ASKED, VERBATIM:** *"when i start start hls / webrtc, there is no shimmer. you
lost std buttons"*.

✅ **THE SHIMMER IS THE SHELL'S BUSY SWEEP AND IT IS REAL**: `shell.mjs` marks a
running control `data-busy="1"` and draws the sweep across it. `positron-verify`
records it as load bearing for a different reason too, that the press loop
**awaits `data-busy` before walking on**, and the case that found it was a page
whose checks were lost because a handler was still running.
🔴 **SO A HAND ROLLED BUTTON COSTS TWICE: THE VISITOR LOSES THE FEEDBACK AND
THE HARNESS LOSES THE WAIT.** A start that takes 4 to 22 seconds to come on air
with no shimmer is a page that looks broken for twenty seconds.
⚠️ **IT IS THE SAME THREE CONTROLS AS THE UPPERCASE AND THE CLIPPED BUTTON
ASKS**, so all three are one pass on `demo/stage/index.html`, and the answer to
all three is the same: **stop building these by hand.**

### Open 2026-09-25: `/wish/`'s remove button should be a small kit variant

**ASKED, VERBATIM, WITH A CROP:** *"just [x] button, use small variant (create in
kit if not exists)"*. The crop shows the `on` checkbox and a large square `×`
under it in the row's action column.

✅ **THE PARENTHESIS IS THE INSTRUCTION AND IT IS THE RIGHT ONE.** A small square
glyph button does not exist in the kit today, and `/wish/` has already been
measured needing one: its two controls are **37.3 px and 34.0 px across against a
72 px column**, which is why they stack. A smaller variant may let them sit side
by side.
⚠️ **AND IT IS A KIT CHANGE, SO IT IS DONE ONCE**, with `/kit/` re-run and a
specimen on that page. `shell.css` gained `button[data-glyph="1"]` at 34 by 34 on
2026-09-25 and the small variant belongs beside it, not in a page.


### Open 2026-09-25: `PLAY RECORDING` is clipped to `PL RECOR`

**ASKED, VERBATIM, WITH A CROP:** *"fix button, use regular button"*. The crop
shows the control room bar's right hand control wrapping to two lines and being
cut off on both, reading `PL` over `RECOR` inside a box too small for either.

⚠️ **IT IS THE SAME BUTTON AS THE UPPERCASE ASK**, `playRecBtn`, so the two are
done in one pass or the second undoes the first.
⚠️ **AND "REGULAR BUTTON" IS THE INSTRUCTION, WHICH MEANS THE PAGE SHOULD STOP
BUILDING ITS OWN.** `transport-bar.mjs` takes `right: [playRecBtn]` and this
page hands it a hand-made element. A kit button in a kit slot is what stops a
page inventing a width.
⚠️ **THE ASSERT TO WRITE IS THE INK AGAINST THE BOX**, which is the measurement
`/tom/` used on the same day to catch 64 clipped numbers in a zero width column:
read the label's ink through `measureText` against its content box, and
`scrollWidth > clientWidth`. A button that fits reads 0 clipped.


### Open 2026-09-25: the control room timeline does not move

**ASKED, VERBATIM:** *"timeline does not move on controlroom"*.

🔴 **READ THIS TOGETHER WITH THE CLOCK REPORT ABOVE, BECAUSE THE TWO ARE
PROBABLY ONE BUG AND THEY POINT OPPOSITE WAYS.** One says a counter keeps
running after stop, the other says the strip never moves at all. A page where
the clock advances and the strip does not is a page where the two have come
apart, and `/stage/` has exactly the machinery for that: `roomStrip.setFollow(true)`
is called next to `showDeck.play()` and `phase = 'live'`.

✅ **MEASURED 2026-09-25 AND IT NARROWS THE SEARCH**: `stopShow()` at
`demo/stage/index.html:2433` DOES call `showDeck.pause()` on its next line. So
the deck is being stopped and something downstream of it is not, which makes a
display reading its own timer rather than the deck the first place to look, not
the stop path.
⚠️ **AND THE STRIP HAS A MEASURED HISTORY OF BEING FITTED WHILE HIDDEN.** Same
page, same day: the control room strip read **90,947 ms wide when it should have
read 30,000**, because `fit` ran while the tab panel was still its hidden width.
The repair was a refit two frames later. A strip that does not move is the same
family of defect and the same tab is involved.
⚠️ **THE HARNESS CANNOT SEE EITHER OF THESE TODAY.** It never opens that tab
unless a check selects it, and the page's own strip assert had to start doing
that explicitly. Any new assert here selects the control room, waits two frames,
and reads the strip twice.


### Open 2026-09-25: two more on `/stage/`, one of them a live defect

**ASKED, VERBATIM, WITH A CROP OF THE TWO TRANSPORT BUTTONS:** *"rm uppercase,
regular buttons. when i stop ils, timer couner still run"*.

**A. THE BUTTONS ARE SHOUTING, AND IT IS THE PAGE'S OWN DOING.** MEASURED
2026-09-25: `demo/stage/index.html:1519` and `:1522` read `label: 'START HLS'`
and `label: 'START WEBRTC'`, typed in capitals. ✅ **SO IT IS A PAGE FIX AND NOT
A KIT FIX**, which was worth establishing first: a peer already deployed a
site-wide *"no uppercase on buttons"* rule in the `shell.css` that `e5ae793`
recovered, and a page that shouts through it would have meant the rule was
losing. It is not losing. The strings are shouting.
⚠️ **THE LABEL IS ALSO THE STOP LABEL.** Each button relabels to `STOP ...`
when the show is running, so both halves move together or the page reads
`Start HLS` and then `STOP HLS`.

**B. 🔴 A LIVE DEFECT: STOPPING THE SHOW DOES NOT STOP THE CLOCK.** *"when i
stop ils, timer couner still run"*. `ils` is `HLS`.
⚠️ **THIS IS THE EXACT MIRROR OF A BUG FIXED ON THE OTHER SIDE THE SAME DAY.**
The clock used to START on the press rather than on air, MEASURED reading
`0:02.191, then 0:06.291, then 0:19.089 while both badges said OFF AIR`. The
repair moved `showDeck.play()` next to `phase = 'live'`. **Nobody moved the
other end.**
✅ **THERE IS ALREADY AN ASSERT FOR THE OPENING HALF AND NONE FOR THE CLOSING
HALF**: `the show's clock does not start until it is on air` samples
`showDeck.playing()` on every tick of the wait. **The closing assert is its
mirror and must not be able to pass vacuously**: press stop, then read that the
position does not move across two samples.


### Open 2026-09-25: the control room's time footer, ASKED THREE TIMES

🔴 **ASKED, VERBATIM, WITH A CROP, AND THE WORDS ARE A COMPLAINT ABOUT THIS
FILE:** *"rm this footer from controlroom. asked 3x"*.

The block under the control room's video panel showing **`0:00.000` over
`22:11.850`**, a current position over a total. The crop shows it directly below
the `OFF AIR` badge row that carries the two glyph buttons.

🔴 **THREE ASKS AND NO CHANGE IS THIS FILE FAILING AT ITS ONE JOB.** The
2026-09-19 rule exists for exactly this: *"do you have it in yr backlog or you
keep losing them"*. A request that is worked from memory is a request that
looks, when dropped, exactly like one nobody made. It is written here now and
leaves this file by being FINISHED or by being refused in writing.

⚠️ **IT IS A READOUT OF A TRANSPORT, SO CHECK WHAT READS IT BEFORE DELETING.**
`/stage/` carries asserts about the show clock, including `the show's clock does
not start until it is on air`, and `demo/verify.mjs`'s shell drill seeks the
published transport. **Deleting the display must not delete the quantity**,
which is `positron-ui`'s rule about removing a block: rehome what it said. The
clock stays, its picture goes.


### Open 2026-09-25: three asks on `/knobs/` and the shared keyboard, reported against a broken page

🔴 **`/knobs/` WAS LEFT BROKEN AND IT WAS REPORTED WITH A SCREENSHOT:**
*"you broke knobs"*. The agent that edited it on 2026-09-25 **never ran a single
verify** before the session limit killed it. MEASURED after, run alone:
**31/35, four failed.**

**1. THE LAYOUT, ASKED WITH A DRAWING:**

```
------------------
()()     nameplate
------------------
|||keyboard|||||||
------------------
footer
------------------
```

So the rotaries and the nameplate share the TOP row, the keyboard gets a row of
its OWN at full width under them, and the footer is under that. What is on the
page today is a three column case, rotaries then keyboard then a vertical plate,
and **the keyboard is cut off at B3** because it is sharing a row with the
rotaries.

**2. ASKED, VERBATIM:** *"enable -> Enable"*. The footer button reads `enable
midi` and should read `Enable midi`. ⚠️ A peer deployed a *"no uppercase on
buttons, site wide"* rule, so this is sentence case and NOT a return to caps.

**3. ASKED, VERBATIM:** *"Nt|Dg -> N|D"*. ✅ **DONE, AND THEN THE WHOLE
CONTROL WAS REMOVED ON 2026-09-28**, on *"finally: rm N | D setting from keyboard
component"*, so there is no label left to spell. The 118.48 px against 65.50 px
below is the measurement that is still being quoted, and the row now gets that
65.50 px back. 🔴 **THIS IS
`demo/shell/keyboard.mjs` AND IT REACHES TEN PAGES**: `fau`, `dump`, `evo`,
`instrument`, `knobs`, `kit`, `looper`, `nola`, `radio`, plus `chords.mjs` and
`roll.mjs`. **It is the FIFTH spelling of that label** and the file records the
other four: `c | 1`, `C D E | 1 2 3`, `Notes | Degrees`, `Nt | Dg`. The comment
argues in writing for each, so **the comment moves with the code** rather than
being left to contradict it. ⚠️ The `title` on each button carries the meaning
and is not what is being shortened.
⚠️ **`/kit/` IS RE-RUN**, because this is shared. MEASURED by the agent that
made it `Nt | Dg`: the segmented row was **118.48 px as words and 65.50 px
shortened**, so a third spelling moves that measurement again.

**4. ASKED, VERBATIM, WITH A CROP OF THE CUTOFF DIAL:** *"rm border aroind
inivible-hand-butotn"*. The `⇄` button that starts an invisible hand sits
inside the rotary's dial and wears a ring. ⚠️ **CHECK WHETHER THAT RING IS THE
COMPONENT'S OR THE PAGE'S** before removing it, because `knob.mjs` reaches
`/kit/`, `/tom/` and every other rotary. A border removed in the kit is a border
removed everywhere.

**5. ASKED, VERBATIM, AND IT REVERSES ASK 2 BEFORE ASK 2 WAS BUILT:** *"rm
enable midi, just listen midi"*, then *"(just make all keyboards instances
support midi)"*.

🔴 **SO ASK 2 IS DEAD. DO NOT BUILD `Enable midi`.** The button goes
entirely and the page listens, which is exactly what `/muta/` was asked for on
the same day (*"its should be listening"*) and did.
🔴 **AND THE SECOND SENTENCE MOVES IT INTO THE KIT.** `demo/shell/keyboard.mjs`
would open MIDI for EVERY instance, which reaches **ten pages**. That is a
shared change, done once, by one agent, before any page agent starts, with
`/kit/` re-run.

🔴 **THE ONE RULE THIS MUST NOT BREAK, AND IT IS ASSERTED ON TODAY: A VISIT
ASKS THE BROWSER FOR NOTHING.** `/knobs/` reads `the visit asked 0 time(s)` and
`/muta/` reads `the keyboard is opened by a press and never by a visit, and it
is asked for once`. Taking the button away removes the gesture that was carrying
`requestMIDIAccess`, so the component needs another one. ⚠️ **`/muta/` already
solved this and is the precedent to copy**: `ensureMidi()` is idempotent and is
called from the top of the control that turns the instrument on, BEFORE
`await ensureAudio()`, because a permission prompt has to be reachable from the
gesture. On `/knobs/` the equivalent gesture is the first key press, which that
page's own comment already calls *"the only way in now"*.
⚠️ **AND A PERMISSION PROMPT ON TEN PAGES IS A PRODUCT DECISION, NOT A REFACTOR.**
A keyboard that asks for MIDI the first time anybody touches it will prompt on
`/fau/`, `/dump/`, `/evo/`, `/radio/` and five more. Whether every one of those
should ask is worth one sentence from the owner before it is built.


### Open 2026-09-25: better sounding chords, and the session died before the research started

🔴 **ASKED, VERBATIM, WITH THREE SCREENSHOTS OF `/nola/`'s SUGGESTION LANES:**
*"better soudning chords. labme soundin susggestion, recording my played
suggestions. they sound unimaginative and dry and not moving anywhere. do
resraerch, perhaps you let me just play some, you record and hand it over to llm
and chord dbs and figure out my playing pattern and creativity inputs to move on
with in my vibe"*

🔴 **NOTHING WAS DONE. A RESEARCH AGENT WAS DISPATCHED AND KILLED BY THE
SESSION LIMIT BEFORE ITS FIRST TOOL CALL**, at 20:31, its transcript twelve
lines long and ending `You've hit your session limit, resets 9:30pm`. The brief
it was given is reconstructed here so the work does not have to be specified
twice.

**The three progressions that were uploaded as the complaint**: `Dmaj / Emin7 /
Fdim7 / Ddim`, `Dmin7 / Gmin / C7`, `D#maj7 / Amin7b5 / D7`. ⚠️ **The second is a
plain ii V i and the third a plain minor ii V**, which is the complaint stated
in its own evidence: correct, common, and going nowhere.

🔴 **THREE COMPLAINTS IN ONE SENTENCE AND THEY HAVE THREE DIFFERENT FIXES.
SEPARATE THEM BEFORE BUILDING ANYTHING**, because two of them are not chord
choice at all and no amount of better prediction reaches them.
- **unimaginative** is the CHOICE. `demo/shell/suggest.mjs`'s slot A is the
  modal continuation by construction, MEASURED at **16.2 per cent global max**
  on held-out jazz, which is a cliche rate rather than a bug.
- **dry** is the SOUND. What `/nola/` plays is `voiceChord(... near, bass:
  false)` into a sampled piano: close position, no bass, no inner voice motion,
  no rhythm. **The table has no voicing in it at all.**
- **not moving anywhere** is the SHAPE. A trigram is two chords of memory and no
  destination. `research/chord-suggester-benchmark-2026-09-23.md` §10.9 already
  says it: *"NOTHING HERE MEASURES RHYTHM, PHRASE LENGTH OR CADENCE POSITION ...
  the table has no idea which chord it is looking at."*

✅ **THE PRIOR RESEARCH IS EXTENSIVE AND MUST BE READ BEFORE A LINE IS WRITTEN,
BECAUSE IT ALREADY REFUSED FOUR OF THE OBVIOUS ANSWERS.**
`research/chord-suggester-benchmark-2026-09-23.md` (672 lines) and
`research/chord-learning-2026-09-23.md` (1,174 lines). Its §8 refuses a single
ranked list scored on accuracy, refuses slot B ranked by PMI with no pool
(**9.5 points of attestation for 1.8 bits of surprisal, visibly wrong
suggestions**), refuses a hand written tritone substitution rule on top of the
table until somebody plays it, and refuses shipping the corpora.

🔴 **AND §10.1 ALREADY NAMES THIS EXACT EXPERIMENT, WHICH IS WHY THE ASK IS
THE RIGHT ONE:** *"WHETHER SLOT B IS DELIGHTFUL OR ANNOYING ... Neither number
is a feeling. To settle it: put both slots behind `?learn=1` on `/nola/`, play
twenty progressions, and record which suggestion was taken. One session, one log
line."* **Nobody has played any of it.** Every number in that document is a fact
about written chord symbols.

✅ **BOTH CORPORA ARE ALREADY ON THIS DISK AND NOTHING NEEDS FETCHING.** MEASURED
2026-09-25 with `node demo/resources/fetch-chord-corpora.mjs --check`, which
contacts nobody: `tmp/chord-corpora/irb.zip` **530,984 bytes** and
`billboard-salami-chords.tar.gz` **219,100 bytes**, both gitignored, plus the
unpacked `tmp/chord-corpora/x`. **So every re-count, every sweep and every new
table is runnable today with zero requests to anybody.** ⚠️ The standing rule
still holds for anything NEW: *"super careful with external sources, better
avoid"*, and it is about whose server it is.

⚠️ **ONE CHEAP THING IS ALREADY IDENTIFIED AND IS NOT THE WHOLE ANSWER.** The
shipped table is `keep: 3`, so **slot B chooses from at most two candidates**,
while the benchmark that chose the design swept `pool 4`. `suggest.mjs` says so
itself: *"THE POOL THE BENCHMARK SWEPT WAS FOUR WHILE THE SHIPPED TABLE KEEPS
THREE ROWS A CONTEXT, so the pool here can never exceed three."* `MIN_CTX = 8,
MIN_ROW = 3, KEEP = 3` at `demo/resources/build-chord-tables.mjs:99`, and the
whole table is **12,746 bytes** today.

⚠️ **THE LLM HALF HAS A MEASURED PRECEDENT ON THIS DESK AND IT IS NOT
ENCOURAGING ABOUT PUTTING ONE IN THE LOOP.** `positron-verify` records Workers
AI `llama-3.3-70b` returning a schema-valid patch with the WRONG argument name
on every run, a tighter schema making it **1.6 s to 10.2 s** and worse, and well
formed patches **aimed at the wrong instrument**. The rules that came out of it
apply directly here: **validate meaning in ordinary code, never in the schema**,
and **a model proposes and a person presses**.

⚠️ **AND A PREFERENCE TEST THE PLAYER CAN SEE THROUGH IS NOT A MEASUREMENT.**
Whatever is built, the arm that produced a suggestion must be hidden from the
person judging it, and there has to be a control arm that can lose. This
repository has already shipped a green page with zero coverage more than once.

**Files this will touch**: `demo/shell/suggest.mjs` (SHARED, and
`suggest-test.mjs` beside it carries 6 negative controls),
`demo/resources/build-chord-tables.mjs`, `demo/resources/chord-tables.json`,
`demo/nola/index.html`, and a new document in `plans/`.
⚠️ **`demo/shell/` IS SHARED, SO ANY CHANGE THERE IS DONE ONCE, BY ONE AGENT,
WITH `/kit/` RE-RUN.**


🔴 **REPORTED AGAIN 2026-09-30, WITH A SCREENSHOT OF `/nola/`:** *"still not a good sounding suggestion"*. The lanes read `Fmaj`, `Cmaj7`, and the hollow suggestion `C#dim7`. ⚠️ **READ WITH `CLASS_OF` BELOW**: `dim7` is one of the 14 qualities `suggest.mjs` files as major, so the suggester may be scoring a diminished seventh as a major chord. C to C#dim7 is a real passing move towards Dm in the corpus, and on its own after Cmaj7 it sounds wrong, which is the complaint. Not yet worked: the research this entry asks for has still not started.

✅ **WORKED 2026-09-30, UNCOMMITTED AT THE TIME OF WRITING. THE CLASS ERROR WAS NOT THE CAUSE OF `C#dim7`.** `Fmaj` and `Cmaj7` are both classed correctly, and name.mjs never returns `dim7` for a played chord. MEASURED instead, in F major the context is `0maj|7maj` and the jazz table holds `0maj 34%`, `9min 19%`, `8dim 15%`:
- **The table's unigram was the first defect.** `uni` is one character on a 1/89 linear scale, so **46 counted jazz symbols and 57 pop ones were stored as exactly 0**, `8dim` among them at a real 70 of 52,924. Slot B ranks by `log2(p / u)` with a `1e-6` floor, so `C#dim7` scored about **17 bits** against `Dm7`'s 2.1 and was shown **75 per cent** of the time (2,000 seeded draws). `build-chord-tables.mjs` now writes a second column, `ulog`, one character at a fifth of a bit a step (worst error 7.1 per cent, no counted symbol zero), and the build refuses to write if the old column would pass the same check. `uni` is unchanged byte for byte, as are `bi`, `tri`, `spell`, `temp` and `mix`. 18,237 to **18,435 bytes**.
- **The passing chord was the second, and the unigram repair alone does not fix it.** With the true count `C#dim7` still scores 6.8 bits and still wins, because diminished chords are 2.3 per cent of jazz and 0.35 of pop, so PMI prefers them wherever one reaches the pool: over the 623 jazz trigram contexts a dim sat in the pool of 29 and slot B took it in 22 (21 with the true unigram). `8dim` goes on to `9min` 54 per cent of the time in jazz and 86 in pop, so it is the middle of a move. **Slot B no longer offers a `dim` symbol.** Slot A still draws it (130 of 500 after `Fmaj Cmaj7`) and it stays in the table, the walk and the way home.
- After: `Fmaj Cmaj7` shows `Dmin7` 58 per cent and `Fmaj7` 42, and `C#dim7` 0 of 2,000. `C G Am`, `Dm7 G7`, `Am F C`, `Cmaj7 Am7`, `C F` are essentially unchanged in jazz; pop moved a few points on `Am F C` (A#maj 61 to 71) from the unigram alone.

⚠️ **WHAT THIS BEARS ON FOR THE RESEARCH, AND IT IS A WARNING RATHER THAN A RESULT.** PMI is "specific to this context", and the chords most specific to a context are the rare functional ones: passing diminished chords, and next in line half diminished chords (`Bmin7b5` is still 56 per cent after `Am F C` and 29 after `C F` in jazz). A slot ranked by specificity will keep finding the MIDDLE of a device, so a listening test must log which slot and which class every offered chord came from, or a bad sounding session cannot be attributed. The other half of the complaint, `dry`, is voicing and is untouched by any of this. A passing chord offered together with its resolution (`C#dim7` then `Dm7`, as a pair) is the obvious next experiment and is not built.

### Open 2026-09-25: `.panel-head-mid` overflows its own grid track at every width

🔴 **FOUND BY MEASURING, NOT REPORTED BY ANYBODY**, while `/muta/` tried
to put a `Test tone` button in a header. `demo/shell/shell.css`'s
`.panel-head-mid` carries `min-width: 0` with `justify-self: end`, so it is laid
out from its right edge and **spills left across the plate cell**.
MEASURED on `/muta/`: the model picker is **315.5 px of content in a 266.8 px
track at 1280 px**, and a button placed in that cell was overlapped by **34.7 px
at 1280 and 114.2 px at 561**.

✅ **IT IS INVISIBLE TODAY AND THAT IS WHY NOBODY HAS SEEN IT.** The three
pages that build a header all pass `plate: false`, so the cell it spills into is
empty. **The cost is that a third control cannot go in that row**, which is a
real constraint the next person to try will spend an hour on.
⚠️ `/muta/` did NOT work around it by changing the kit. It put its
button in column 1 with `justify-self: end` and two page media queries below
700 px and 560 px, and asserted the rects. That page is fine; the component is
not.


### Open 2026-09-25: a stream of per-demo requests, COLLECTED WHILE IT IS STILL ARRIVING

🔴 **THE STREAM IS NOT FINISHED.** Said in the same message: *"i will
give moer requests nor per demo"* and *"...more coming..."*. Nothing below is
being worked yet, by the 2026-09-19 rule: *"lets work demo by demo. i will give
steam of request, you collect theb to backlog in detail and when done, do a
parallelized effort to fix it all"*. **Write now, fan out when the stream ends.**

🔴 **AND THE KEYBOARD IS SHARED, SO IT IS DONE ONCE AND FIRST.**
`demo/shell/keyboard.mjs` is imported by **ten** pages: `able`, `fau`, `dump`,
`evo`, `instrument`, `knobs`, `kit`, `looper`, `nola`, `radio`, plus
`demo/shell/chords.mjs` and `demo/shell/roll.mjs`. One agent does the component
BEFORE any page agent starts, or four agents write four versions of it in one
checkout.

#### `typist`: add the loop modes

⚠️ **ASKED, VERBATIM:** *"add loop modes to typist"*

`demo/manifest.mjs:709`, `group: 'th'`, one line *"type, and it types itself
back. Drag to any moment and the words and the cursor come back"*.

✅ **IT ALREADY HAS A TRANSPORT AND A DECK**, `createTransportBar(barHost,
deck, { scrub: false })` at `demo/typist/index.html:540`, so the modes have
something to run on. Same ask as `/loops/`, one page along, **so decide the two
together**: three directions or five, and whatever is chosen is chosen once.
⚠️ The kit's `LOOP_TURN = [0, 1, 4]` deliberately cycles only the three
DIRECTIONS, because `half` is a rate and `chop` is a length with no control.

🔴 **AND THIS PAGE IS WHERE "BACKWARDS" ACTUALLY MEANS SOMETHING NEW,
WHICH IS WHY IT IS WORTH ASKING WHAT IT MEANS BEFORE BUILDING IT.** The subject
is an edit history, not audio. Playing it `round` is retyping. Playing it `back`
is UNTYPING, and there-and-back is typing and untyping. **A backspace played
backwards is a character appearing**, which is a real behaviour to define rather
than a rate to flip. Nothing here follows from the audio meaning of the word.
⚠️ **THE PAGE'S OWN CHECKS ALREADY KNOW THE HARD CASES.** Driving it
with real key events found two bugs the first time: a fold at position 0
emptying the box the first letter had just gone into, and a strip that fits
itself once and so drew six of seventy-one edits. The harness sends characters,
a BACKSPACE, *"which never says what it removed"*, and an ARROW KEY, *"which
moves the caret with no input event at all"*. **Those three are exactly the
cases a reverse mode has to get right.**
⚠️ **`readout: null` at `:209` IS DELIBERATE AND ANNOUNCED**: the
document IS the readout here, and a row of cells repeating the letters and the
cursor position would be the same facts twice. **A loop mode does not earn a
readout cell on this page.** Both `verify.mjs` and `verify-quest.mjs` read
`readoutOptOut`, so do not add one casually.
⚠️ **IF ANY OF IT LANDS IN `demo/shell/looper.mjs` OR
`transport-bar.mjs` IT IS SHARED**, done once, `/kit/` re-run.

#### The four `timeline` demos: glue the transport to the timeline

⚠️ **ASKED, VERBATIM:** *"timeline demos: glue transport and
timelines"*

✅ **THE GROUP IS EXACTLY FOUR AND NONE OF THEM GLUES TODAY**, MEASURED
2026-09-25: `transport`, `lanes`, `loops`, `score`, and `grep -c createGlue`
answers **0** in all four.
✅ **NINE OTHER PAGES ALREADY DO IT**: `held`, `kit`, `pack`, `reel`,
`radio`, `stage`, `replay`, `tapes`, `wish`. So this is four pages joining a
convention the rest of the site already has, and `demo/shell/glue.mjs:44`
exports `createGlue(...blocks)` for it. **Nothing is being invented and no kit
change should be needed.** If one is, report it and stop, because another agent
owns `demo/shell/`.

🔴 **READ THE ONE THING THIS PROJECT HAS ALREADY PAID FOR ABOUT GLUE,
BEFORE WRITING A LINE.** From `/stage/`, 2026-09-25: **`createTransportBar(parent, ...)`
APPENDS TO THAT PARENT**, so deleting a `createGlue` line removed nothing and a
doubled bar survived TWO reports because of it. *"The first argument is a mount
point, not a hint."* A glue that repoints a container is not a glue that merges
its contents, which is the same page's other lesson (`LESSONS.md` #116). **After
gluing, count the bars and the strips on each page rather than looking at it.**

#### `loops`: add the loop modes

⚠️ **ASKED, VERBATIM:** *"add loop modes to loops"*

`demo/manifest.mjs:77`, `group: 'timeline'`, one line *"one recording placed
three times: a slice, the same slice faster, and a loop"*.

✅ **THE MODES ALREADY EXIST IN THE KIT AND ARE NOT BEING INVENTED.**
`demo/shell/looper.mjs:54` is `LOOP_WAYS = [['round'], ['back'], ['half'],
['chop'], ['pingpong']]`, with `WAY_GLYPH` and `WAY_SAYS` beside it.
🔴 **BUT ONLY THREE OF THE FIVE ARE ON THE BUTTON, AND THE REASON IS
WRITTEN DOWN.** `LOOP_TURN = [0, 1, 4]` at `:66`, and the comment above it:
*"THE THREE THE BUTTON CYCLES, IN THE ORDER IT CYCLES THEM. Directions, and only
directions: `half` is what a rate row beside it is for and `chop` is a length
with no control today. Both are still reachable and both are still driven by the
checks, which is a loose end written down rather than left to be found."*
⚠️ **SO "ALL THE MODES" IS A DECISION, NOT A DEFAULT.** Three
directions, or five including a rate and a length that the existing button
deliberately excludes. **Settle it before building the control**, and if it is
five here and three elsewhere, say why in the file.
⚠️ **AND `WAY_GLYPH` IS AMBIGUOUS ACROSS FIVE**: `round`, `half` and
`chop` all carry `→`. A five-way control cannot use the glyph alone to say
which state it is in, and `:75-80` records that the glyph IS the state rather
than the next press. **Three faces for three states works; five states need
something else.**

🔴 **THIS PAGE HAS ALREADY SHIPPED "QUIETLY NOT LOOPING", AND THE
RECORD OF IT IS THE THING TO READ FIRST.** `demo/loops/index.html:88-98`: the
page passed no `tickHost` and never called `servo()`, so a wrap *"was neither
committed nor polled: it simply never happened. Three passes, zero wraps, and a
page whose whole subject is looping quietly not looping."* And: **"The assert
that should have caught it was tolerant of 'not reached yet' and passed
vacuously every run."**
⚠️ **SO EVERY MODE ADDED HERE NEEDS AN ASSERT THAT CANNOT PASS
VACUOUSLY.** A check that tolerates *not reached yet* is the exact shape that
failed on this page once. Ask what has HAPPENED, counted, rather than what is
happening.

⚠️ **THE PAGE IS A NEST, NOT A LOOPER.** It draws with `createNest` and
quotations, and `:138-149` records that a 3-pass loop is ONE span carrying
`repeat: 3` until it is split, *"so the strip drew one long bar and the looping,
the entire subject of this page"*, was invisible. **Backwards and there-and-back
have to be visible in that drawing or the modes are a control with no readout.**
⚠️ **`demo/shell/looper-test.mjs` AND `numloop-test.mjs` GRADE THIS
ARITHMETIC WITH NO BROWSER** and are the cheap instrument here. `numloop-test.mjs`
also carries the warning about writing the expected state out by hand and doing
the machine's arithmetic a second time.
⚠️ **IF ANY OF IT LANDS IN `demo/shell/looper.mjs` IT IS SHARED**, and
that module reaches the transport bar, `/tapes/` and every page with a looper.
Done once, by one agent, with `/kit/` re-run.

#### Merge the `capture` group into `streaming`

⚠️ **ASKED, VERBATIM:** *"merge capture and streaming into streaming"*

MEASURED 2026-09-25, so the size of it is known rather than guessed:
- **`capture` holds 6**: `take`, `keep`, `record`, `replay`, `capture`, `show`.
- **`streaming` holds 7**: `llhls`, `webrtc`, `moq`, `room`, `now`, `flipper`,
  `remixer`.
- **The merged group is 13**, which would make it the second largest after
  `instruments` at 13. There are 11 groups today and there would be 10.

⚠️ **THERE IS A DEMO CALLED `capture` INSIDE THE GROUP CALLED
`capture`.** The row survives the merge and only its `group` changes, but
anything matching on the string has to tell the page from the group. **That is
the substring rule again**, one stream after the `click` and `sound` renames.

⚠️ **THE GROUP TABLE CARRIES ITS OWN LABELS AND ITS OWN ORDER.**
`demo/manifest.mjs:1186` is `['capture', 'capture']` and `:1226` is
`['streaming', 'streaming']`, and they sit far apart in that table: `capture` is
7th in the list and `streaming` 47 lines later. **The merged group inherits
`streaming`'s position unless told otherwise**, which moves six demos a long way
up or down the index. Worth one look at the result before it is called done.
⚠️ **AND THE TABLE HOLDS PROSE BETWEEN THE ROWS.** The entries are
separated by long comments recording why each group is what it is, including
`timeline`'s 2026-09-24 instruction *"timeline: leave ones who have timeline
component. the rest ..."* and `stage` moving to `th` on *"move stage to th"*.
**Deleting the `capture` row must not delete the reasoning around it**; where a
comment explains a group that no longer exists, it moves into `streaming`'s or
into `LESSONS.md`, rather than vanishing.

⚠️ **THIS IS A `demo/manifest.mjs` EDIT AND THAT FILE HAS ONE OWNER PER
ROUND.** It collides with the archive work (`bay` and `able` rows leaving) and
with all four renames. **Sequence it with them, not against them.**
⚠️ **COUNT THE DEMOS AND THE GROUPS AFTER, NEVER REMEMBER THEM.**

#### The lane jumps sideways when play starts, and it is `/transport/`, not `mars`

⚠️ **ASKED, VERBATIM, WITH TWO SCREENSHOTS:** *"mars: lane is jumping
position when start playing"*

🔴 **THERE IS NO `mars` DEMO AND THE SUBJECT WAS IDENTIFIED FROM THE
PICTURES RATHER THAN THE NAME.** `demo/mars/` does not exist and `mars` is in no
manifest row. The readout in both crops reads `0.38 20s, 20 marks, speeds
0.25/0.5/1/2/`, and **`demo/transport/index.html:162` logs exactly that string**:
`` d.log(`${DURATION / 1000}s, 20 marks, speeds ${adapter.caps.rates.join('/')}x`) ``.
The lane in the picture is labelled `marks`. **So the page is `/transport/` and
`mars` is a typo for `marks`, the lane.** Confirm in passing, do not re-derive.

🔴 **AND THE MECHANISM BELOW IS WRONG, MEASURED 2026-09-25 AFTER IT WAS
WRITTEN.** This entry said *"The gutter grows, the plot beside it is pushed"*.
MEASURED at 1280 px one press apart: the gutter is **132 px before and 132
after** and the canvas does not move at all. What moves is the lane's NAME AND
SWATCH, **29 px upward**, because `timeline/strip.mjs`'s `nameOnly` branch
centres a lane with no lines under its name on its own swatch (asked for
2026-09-16), and a lane that GAINS lines while somebody is watching gets both
arrangements one after the other. **The fix asked for below is still the right
one. The reason given for it was not.** Widest ordinary line asks 124.33 px
against a declared gutter of 132, so only a lateness over 100 ms could ever
widen it.

✅ **THE TRIGGER IS ONE LINE AND IT IS WHAT THE SCREENSHOTS SHOW.**
`demo/transport/index.html:95`:

    L.subLabel = [`typical +${typical.toFixed(2)} ms`, `worst +${worst.toFixed(2)} ms`];

Before play the gutter holds ONE line, `marks`. The moment marks land it holds
THREE. The gutter grows, the plot beside it is pushed, and the whole lane
appears to jump. The first crop has the playhead hard against the left edge of
the plot; the second has the plot starting further right with the same playhead.

⚠️ **RESERVE THE SPACE, DO NOT SHRINK THE TEXT.** The sub-labels are
real measurements and are worth showing. What must not happen is the box
changing size when they arrive, so the two sub-label rows are reserved from the
first frame, empty, exactly as the transport bar reserves both words of a
two-state button so *"the control cannot change size under the finger that
pressed it"*.

🔴 **AND THIS IS THE FOURTH ASK IN ONE STREAM WITH THE SAME DEFECT
UNDERNEATH IT, WHICH IS WORTH DECIDING ONCE.**
- **here**: a lane gutter grows from one line to three when values arrive.
- **`keyboard`**: *"add chord name to the footer ... avoind text moving in x
  axis"*, a name that is `C` or `F#m7b5`.
- **`dump`**: *"show empthy tables ... with fixed heigh"*, a table that is a
  caption until rows arrive.
- **`wish`**, already fixed on that page and recorded at `:96-98`: a box that
  was *"7 lines for one connection and 16 for the next"* and therefore *"would
  move the log and the end of the page on every press"*.
✅ **SO ASK WHETHER THE ANSWER BELONGS IN `demo/shell/strip.mjs` RATHER
THAN IN THIS PAGE.** A lane that reserves its sub-label rows would fix this one
and any other page whose lanes gain labels later. **If it is the strip's, it is
shared work done once**, and `/kit/` grades it.

#### `resources` renames to `niemi`, and it is a FOURTH rename of a different kind

🔴 **AND IT WAS ASKED A SECOND TIME ON 2026-09-25, AS *"rename resources
demo to niemi"*, WHILE THIS ENTRY WAS ALREADY SITTING IN THIS FILE UNWORKED.**
A repeat is this file failing at its one job, the same way the control room
footer reached three asks. It leaves this file by being FINISHED or by being
refused in writing, and nothing below changes: it still runs LAST, alone, after
the corpus edit, because `demo/resources/corpus.json` is edited by the `tapes`
work and `demo/manifest.mjs` by the archive work.

⚠️ **ASKED, VERBATIM:** *"resources: rename to niemi"*

⚠️ **THIS ONE IS NOT THE LETTER-DROP SCHEME AND MUST NOT BE
"CORRECTED" INTO IT.** `grains` to `rains`, `click` to `lick` and `sound` to
`ound` each drop a first letter. `resources` to `niemi` is a different thing
entirely and it reads as deliberate: **the row's group is `kurenniemi`**, so
`niemi` is the tail of the name this whole act is about.

🔴 **AND IT IS NOT LIKE THE OTHER THREE IN A SECOND WAY: IT IS A DEMO
ROW *AND* A WORKING DIRECTORY OF BUILD SCRIPTS.** `demo/manifest.mjs:282`,
`group: 'kurenniemi'`, `built: true`, so `/resources/` is a page. And
`demo/resources/` holds **28 entries**, among them `build-corpus.mjs`,
`corpus.json`, `durations.json`, `measure-durations.mjs`,
`build-mimproject-images.mjs`, `fetch-jrhodes3d.mjs` and `chord-tables.json`.
**A slug rename and a tooling directory move at the same time.**

⚠️ **PRICED 2026-09-25: 55 live files hold the path `demo/resources`**,
plus **1** under `archive/` which stays by the standing rule.
✅ **RE-COUNTED LATER THE SAME DAY AND THE 55 STANDS, WHICH IS WORTH SAYING
BECAUSE A NAIVE GREP NOW ANSWERS 89.** The extra 34 are `workers/view/public/`,
which is the tracked BUILD OUTPUT and regenerates from `cd workers/view && node
build.mjs`, plus `workers/tapes/test.mjs`. **They are not hand edits and must
not be rewritten by hand**: the rename edits the sources and then rebuilds, and
a sweep that rewrote the output directly would be undone by the next build while
looking correct in the diff.
🔴 **TWO OF THEM ARE IN `CLAUDE.md`'S OWN "Run and check" BLOCK**, lines
214 and 215: `node demo/resources/measure-durations.mjs` and `node
demo/resources/build-mimproject-images.mjs --check`. **A command in that block
that no longer runs is the worst kind of stale line in this repository**, so
they move in the same commit.
✅ **AND AN INSTRUCTION SUPERSEDES A PRICING, WHICH `LAYOUT.md` ALREADY
SAYS**: the `plans/` move was priced at 421 references and rejected, then done
on instruction, *"the same way `radio1965`, `box` and `rig/box/` superseded
their own rules"*. This is that again. ⚠️ The same entry carries the
lesson to work to: *"a rename moves URLs that live in modules, harnesses and
comments, none of which are type-checked"*, and on the `plans/` move the repair
was to rewrite **the 129 files holding a real path** and leave bare prose
citations as citations.

🔴 **ORDERING CONFLICT WITH THE `tapes` WORK, AND IT IS REAL.**
`demo/resources/corpus.json` is where the `Saharan uni I` row is deleted, and
`demo/fake-tapes.mjs` reads its paths out of that same file. **The corpus edit
and this directory move must not run at once.** Do the corpus edit first, then
the rename, or the two collide on one file.

⚠️ **SO THE RENAME BATCH IS FOUR, NOT THREE**, it runs LAST with
nothing else in flight, and `positron-history` loads before it and gains a line
after it.

#### `tapes`: a proxy for unreadable sound, inertia in two more places, and one row out

⚠️ **ASKED, VERBATIM:** *"this recordin wil noot allow read its sound:
make proxy. tapes demo. use varispeed/inertia on rate change and also
varispeed/inertia on switching looping modes / rm 6/24 Saharan uni I 1967 line"*

1. 🔴 **A PROXY SO A RECORDING'S SOUND CAN BE READ, AND IT RUNS STRAIGHT
   INTO THE STANDING EXTERNAL-SOURCE RULE.** Reading a recording's samples needs
   CORS headers the archive may not send, and a proxy is the ordinary answer.
   **But a proxy does not remove the fetch, it MOVES it from the browser to our
   worker**, and the rule is explicit that it is about whose server it is:
   *"stil: super careful with external sources, better avoid"*, said in reply to
   *"it uses archive.org, not ERR, so it is safe to run"*, and **that reasoning
   was named as the mistake.**
   ⚠️ **SO THE PROXY HAS TO CACHE**, or it is the same load with an
   extra hop. Say what the cache is and how long it holds.
   ⚠️ **AND THE HARNESS MUST NOT GO NEAR IT.** `demo/fake-tapes.mjs`
   exists so `node demo/verify.mjs tapes` reads **38/38 with the only hosts
   contacted being the dev server and the stand-in**. Nothing about a proxy may
   change that, and `DEMO_HOSTS=1 node demo/verify.mjs tapes` is the instrument
   that proves it.
   🔴 **WHICH RECORDING PROMPTED THIS IS NOT KNOWN.** *"this recordin"*
   points at something the owner had on screen. **Ask, or make the proxy general
   and say that is what was built.** A proxy for one file and a proxy for the
   corpus are different amounts of work.

2. ⚠️ **VARISPEED WITH INERTIA ON RATE CHANGES AND ON LOOP MODE
   SWITCHES.** ✅ **THE MECHANISM ALREADY EXISTS ON THIS PAGE AND IS NOT
   BEING INVENTED**: `demo/tapes/index.html:1396` is *"VARISPEED WITH INERTIA ON
   ‹ AND ›: THE TAPE WINDS DOWN AND COMES BACK UP"*, and `:1405`
   warns that the difference between inertia and *"a stall wearing its
   clothes"* is the whole point. `:565` records that pitch follows speed,
   which is what varispeed means. **Extend what is there to two more triggers
   rather than writing a second one.**
   ⚠️ **THE LOOP MODES ARE THE KIT'S**, `createLooper` from
   `demo/shell/looper.mjs` at `:48`, and `demo/shell/looper-test.mjs` grades the
   looper's arithmetic with no browser. If the inertia belongs in the looper it
   is SHARED and done once; if it belongs in this page's rate handling it is
   local. **Establish which before writing it.**

3. 🔴 **REMOVE THE `Saharan uni I 1967` ROW, AND IT MOVES MORE NUMBERS
   THAN IT LOOKS.** It is in `demo/resources/corpus.json`, `"title": "Saharan uni
   I"`, id `ia:videoplayback-13_202304/Erkki Kurenniemi - Saharan uni I (64
   kbps).mp3`. **`Saharan uni II` is a separate row and is NOT being removed**,
   so an anchored edit is needed here too, for the same reason as the renames.
   ⚠️ **THE CORPUS IS 24 ROWS AND EVERY MEASURED FIGURE DERIVED FROM IT
   MOVES.** ✅ **DONE 2026-09-25: IT IS 23 ROWS, 2 h 15 m AND 65 MB.** MEASURED after
   the removal: 8,096 s against 8,541 s. The line here said 2 h 22 m and 68 MB
   for 24 rows, which was true when written. `/tapes/` lays every recording end to end as ONE LONG TAPE and **its
   checks grade that geometry**, so the total length, the bar positions and any
   prose quoting either are all downstream of this one deletion.
   ✅ **THE STAND-IN FOLLOWS AUTOMATICALLY AND THAT IS BY DESIGN.**
   `demo/fake-tapes.mjs` *"reads its paths off `corpus.json` rather than a list,
   so it cannot drift from the page"*. One less row there is one less row
   everywhere.
   ⚠️ **AND THE STAND-IN HAS KNOWN HOLES**: a stand-in serving every
   recording at HALF its corpus length still reads 38/38, and one serving
   SILENCE reads 38/38 too. Both are already in this file. **So a green run after
   this change is weaker evidence than it looks**, and the assert count is what
   to read.

#### THREE RENAMES, ONE SCHEME, AND A SUBSTRING TRAP THAT WOULD WRECK THE REPOSITORY

⚠️ **ASKED, VERBATIM, ACROSS TWO MESSAGES:** *"grains -> rename to
rains"*, then *"click: rename to lick, move to the last item in index groupd"*
and *"sound: rename to ound"*.

✅ **IT IS A SCHEME AND NOT THREE TYPOS: EVERY ONE DROPS ITS FIRST LETTER.**
`grains` to `rains`, `click` to `lick`, `sound` to `ound`. The `grains` one was
put to the owner as a possible typo and CONFIRMED on 2026-09-25, and the two
that followed establish the pattern beyond doubt. **No further confirmation is
needed for the other two.**

🔴 **AND THIS IS THE MOST DANGEROUS TASK IN THE WHOLE STREAM, FOR A
REASON THAT IS ALREADY WRITTEN DOWN IN THIS REPOSITORY: NEVER GUARD A PATCH ON
`s.includes(<substring>)`.** The standing rule records three bugs in one day
from it, `BUILD` matching inside `REBUILD` among them. **These three slugs are
all substrings of ordinary words this repository is full of.** MEASURED
2026-09-25:

| slug | files with ANY occurrence | files with a SLUG-SHAPED reference |
| --- | --- | --- |
| `click` | 173 | 44 |
| `sound` | 264 | 24 |
| `grains` | 82 | 60 |

🔴 **THE GAP BETWEEN THOSE TWO COLUMNS IS THE BUG WAITING TO HAPPEN.**
MEASURED the same day: **`Csound` appears 69 times** and contains `sound`, so a
naive rewrite turns it into `Cound` and silently breaks every reference to the
audio language this project compiles scores with. **`onclick` and `.click(`
appear 156 times** and both contain `click`, so the same rewrite would turn
`element.click()` into `element.lick()` and take `demo/verify.mjs`'s entire
press loop with it. `soundbank`, `sounds` and the ordinary English verb *click*
are all in the same trap.
✅ **SO THE RENAME IS SCOPED TO THE SLUG AND NOTHING ELSE**: the directory
`demo/<slug>/`, the URL `/<slug>/`, and `name: '<slug>'` in `demo/manifest.mjs`.
**Never the bare word.** Every replacement is anchored, and the counts above are
the check: a rewrite that touches 173 files for `click` is wrong by 129 files.

⚠️ **RUN IT ALONE, WITH NOTHING ELSE IN FLIGHT.** Seven agents held
files in this checkout when these arrived. A repository-wide path rewrite while
another agent has a file open is the `git add -A` hazard at full width, and this
project has already had one agent's work swept into an unrelated commit twice in
one session. **This is the LAST task of the batch.**

⚠️ **`archive/` IS NOT REWRITTEN**, by the standing rule: an archive
records what was there, which is why `box` and `radio1965` are still spelled the
old way inside it. It holds **13** files naming `click`, **29** naming `sound`
and **8** naming `grains`. All stay.

⚠️ **`positron-history` LOADS BEFORE ANY OF IT**, and gains a line
after, because a slug that stops resolving is this project's most repeated
defect in its cheapest form.

##### `click` also moves in the index

⚠️ **ASKED:** *"move to the last item in index groupd"*.
`demo/manifest.mjs:81` is `{ name: 'click', group: 'vain', act: 0, created:
'2026-09-14', built: true }`, sitting directly after `sound` at `:78`, which is
in the same `vain` group.
✅ **THIS IS ONE LINE MOVING IN AN ARRAY AND NOTHING ELSE**, by CLAUDE.md's
own rule: a demo's identity is its slug and its ORDER is its position in
`DEMOS`. There is no number in the directory, the URL or the page, and there
used to be, in five places at once.
⚠️ **BUT CHECK WHICH ORDER IS MEANT.** The front page is ordered
NEWEST FIRST and `byNewest()` copies `DEMOS`; `DEMOS` itself is the STORY order.
Last in the group as the index draws it and last in the array are not
necessarily the same position. **Establish which one puts it where the owner
means before moving the line.**

#### `grains`: a RENAME, the instrument panel, and `createLocalRemote`

⚠️ **ASKED, VERBATIM:** *"grains -> rename to rains / wrap to isntument
panel. use createLocalRemote"*

✅ **CONFIRMED 2026-09-25, ASKED AND ANSWERED: `rains` IS CORRECT.** It
was put to the owner precisely because `rains` differs from `grains` by ONE
CHARACTER and the stream carried many typos (*"isntument"*, *"conrtol"*,
*"arhcive"*, *"reseonance"*), so acting on a misreading would have been
expensive to undo. It is not a typo. **Proceed.**
**`demo/shell/roll.mjs:77-79` is the precedent and it is exact**: *"A report
with no verb is ambiguous, and the reading that DESTROYS work is the one to
check before acting on it. Asking would have cost one line."*
⚠️ **MEASURED 2026-09-25: `grains` is named in 82 live files**, plus 8
under `archive/`. A rename is the slug, the directory, the URL, the manifest row
and every one of those references.
⚠️ **AND `archive/` IS NOT REWRITTEN**, by the standing rule: an
archive records what was there, which is why `box` and `radio1965` are still
spelled the old way inside it. Those 8 files stay as they are.
⚠️ **`positron-history` LOADS BEFORE THE MOVE** and a line goes into it
after, because a slug that stops resolving is this project's most repeated
defect in its cheapest form.
⚠️ **`LAYOUT.md` ALREADY PRICES TWO RENAMES THAT WERE REJECTED.** Read
what it says about cost before adding a third.

⚠️ **WRAP IT IN THE INSTRUMENT PANEL**, which is now the THIRD page
asking for this in one stream, with `/shape/` and `/knobs/`. **One piece of
component work, done once, before any of the three page agents start.**

✅ **`createLocalRemote` EXISTS AND IS BARELY USED**, which is the point of
the ask. `demo/shell/local-remote.mjs:117` exports it and **`demo/kit/index.html`
is the only page that calls it today**. `/grains/`'s one line is *"one
granulator, running in this page and on a Raspberry Pi at once, with a blend
between them"*, which is exactly what that component is for, so this is a
hand-rolled control being replaced by the kit's own. **Read what the page does
today before swapping**, because the blend is the demo.
🔴 **AND IT IS A BOARD PAGE**: `room: 'fixed'`, `studio-1`, `settleMs:
60000`, SuperCollider on the Raspberry Pi. **`positron-hardware` loads first**,
and the same rule as `/shape/` applies to anything that reaches the board.

#### `knobs`: the instrument panel, real rotaries, a 25 key keyboard and a footer

⚠️ **ASKED, VERBATIM:** *"knobs: / wrap into instument panel. left to
rotaries cutoff reseonance, right is 'knobs' namepate. make keyboard 25 full w.
/ add footer with rasperry pi online padge. on right add enable midi button +
add midi support"*

🔴 **LOAD `positron-hardware` BEFORE ANY OF IT.** `demo/knobs/index.html:35-37`:
*"`studio-1` is the ADDRESS OF THE RASPBERRY PI, not a rendezvous this page"*
invented, and `room: 'fixed'` in the manifest exists so no harness renames it.
**This page plays a real Yoshimi on a board in another building.** `settleMs:
20000`.

1. ⚠️ **WRAP IT IN THE INSTRUMENT PANEL**, which is the same shared
   work as `/shape/`'s ask. `demo/shell/instrument.mjs` over
   `demo/shell/panel-layout.mjs`, seven pages already wear it, `/kit/` grades
   it. **Do `/shape/` and `/knobs/` as ONE piece of component work**, not twice.
2. ✅ **THE PAGE CALLED `knobs` HAS NO KNOBS IN IT.** `:354-367` builds
   `cutoff` and `resonance` with `createSlider` and pairs them with
   `createSliderGroup([cutoff, reso], { pair: true })`. The ask is for
   ROTARIES on the left with the nameplate on the right, which is the panel
   header's own `place: 'end'` shape.
   ✅ **AND THE INVISIBLE HAND SURVIVES THE SWAP, CHECKED 2026-09-25 RATHER
   THAN ASSUMED.** `demo/shell/knob.mjs:58-61` imports `createHandDrive` from
   `hand-drive.mjs` and says in as many words that it is *"shared with
   `slider.mjs`"*. Both sliders here carry `hand: true` and `onHand:
   handSaid(...)`, and that is the page's subject, so losing it would have been
   the whole demo. **It does not get lost.**
   ⚠️ `knob.mjs:67` warns that `set(v, { from: 'hand' })` has meant A
   PERSON since the knob was written while `handMoves()` counts the invisible
   one. Two senses of one word in the module being adopted. Read it before
   wiring `onHand`.
3. ⚠️ **25 KEYS, FULL WIDTH.** `createKeyboard` at `:694`, shared with
   nine other pages, so a width change is checked against them rather than
   tuned here.
4. ⚠️ **A FOOTER WITH A RASPBERRY PI ONLINE BADGE.** `presence.mjs`
   already supplies the badge and this page already knows the board's address.
5. 🔴 **AN `enable midi` BUTTON, AND IT POINTS THE OPPOSITE WAY TO THE
   `muta` ASK IN THE SAME STREAM.** `/muta/` is being asked to DELETE its MIDI
   on button because *"its should be listening"*, with permission set up when an
   instrument is turned on. `/knobs/` is being asked to ADD one. **Both are
   reasonable and they are not the same page**: `muta` is a local instrument in
   the browser, `knobs` reaches a board in another building, so an explicit
   enable is a different promise there. **But they are one decision about how
   this project asks for MIDI, and deciding them apart is how two pages end up
   disagreeing.** Settle the pair together and write down why they differ.

#### `able`: move the demo to the archive, out of the index

⚠️ **ASKED, VERBATIM:** *"arhcive able demo and rm from index"*

Same shape as the `bay` ask above and the same two halves: a real move into
`archive/` AND out of the index, not `built: false` alone.
`demo/manifest.mjs:674-676`, `settleMs: 12000`, `room: 'fixed'`, one line
reading *"play Ableton Live on a studio Mac from here, with no virtual audio
cable"*.

🔴 **AND THIS ONE HAS A RIG BEHIND IT, WHICH `bay` DID NOT.** Four files
under `rig/` name it: `rig/m1/pace-agent.mjs`, `rig/m1/live-agent.mjs`,
`rig/m1/README.md` and `rig/board/board.mjs`. `room: 'fixed'` means `m1-1` is
**the address of the studio Mac's agent**, not a name this page chose.
**Archiving the page does not archive the agent**, and nothing in the ask says
to touch `rig/`. Load `positron-hardware` before deciding what, if anything,
moves there.
⚠️ **THREE LIVE PAGES AND TWO KIT MODULES ALSO NAME IT**:
`demo/kit/index.html`, `demo/knobs/index.html`, `demo/grains/index.html`,
`demo/shell/board.mjs` and `demo/shell/presence.mjs`. **Separate a page LINKING
to `/able/` from a module that merely shares its vocabulary** before moving
anything, which is the same separation the `bay` entry asks for.
⚠️ `positron-history` loads before the move, and the demo count in
CLAUDE.md is recounted after it and never remembered.

#### `dump`: empty tables at a fixed height instead of two placeholder sentences

⚠️ **ASKED, VERBATIM:** *"dump: nothing asked yet / press Listen, then
play something / show empthy tables / miditables immidately with fixed heigh. no
texdt in them until dumps arrive"*

The two quoted strings are the `empty` captions on this page's two tables:
`demo/dump/index.html:117` `empty: 'nothing asked yet'` on the `ports` table at
`:109`, and `:140` `empty: 'press Listen, then play something'` on the `traffic`
table at `:122`. Both are `createTable` from `demo/shell/table.mjs`.

⚠️ **WHAT IS BEING ASKED FOR IS THE TABLE ITSELF AS THE EMPTY STATE.**
Draw the table immediately, at a fixed height, with no text in it until dumps
arrive, rather than a sentence standing where the table will be.

🔴 **THE FIXED HEIGHT IS THE LOAD-BEARING HALF AND THIS PROJECT HAS
PAID FOR IT BEFORE.** `demo/wish/index.html:96-98` records a box that was *"7
lines for one connection and 16 for the next"* and therefore *"would move the
log and the end of the page on every press"*. A table that grows as rows land
does the same thing to everything under it. **So the height is chosen and
asserted, not left to the content.**
⚠️ **AND IT BUMPS INTO A RULE THAT POINTS THE OTHER WAY**, which is
worth naming rather than discovering halfway: `demo/shell/roll.mjs:111` records
*"an empty box is a line"*, the argument for a caption in an empty container.
**These are not in conflict here**: the ask is for a table with its own header
and ruled rows visible, which is structure a reader can see, not a blank
rectangle. Say that in the comment so nobody reverts it to a caption later.

⚠️ **IT IS A CHANGE TO `table.mjs` IF THE OPTION DOES NOT EXIST**, and
that module is shared across many pages. Check whether `createTable` can already
render its frame with zero rows before adding an option, and if it cannot, that
is kit work done once by one agent, with `/kit/` re-run after it.
⚠️ **A READOUT CELL IS NOT AN ASSERT**, so if the fixed height matters
it gets an assert that reads the rendered height before and after rows arrive.
`/dump/` is one of the pages where the harness drives real MIDI, so check what
its checks already do before adding to them.

#### `tom`: the gutter lost the second digit of every number

⚠️ **ASKED, VERBATIM, WITH A SCREENSHOT:** *"you lost 2-digin numbers
from tom demo"*

The crop shows the grid's left gutter reading `5 5 5 5 5 5 5 5 6 6 6 6` down
twelve rows. **Those are two-digit numbers with the second digit gone**, eight
in the fifties and four in the sixties, which is a run of consecutive values
rendered one character wide.

🔴 **AND THE SAME SCREENSHOT SHOWS `0.24 ready, 14/14 checks`.** The page
is FULLY GREEN while a person can see the defect in the same picture. That is
this project's own worst shape arriving in the cheapest possible form, and it
means **no assert on that page reads the gutter's text**. Whatever fixes the
digits adds the assert that would have caught it, or the next one goes the same
way.
⚠️ **SUSPECT THE WIDTH BEFORE THE FORMATTER.** A clip is a box too
narrow; a truncation is a `slice`. They look identical in a screenshot and have
different fixes, so measure the rendered rect against the text before changing
either. `demo/shell/knob-test.mjs` already records that writing a `minWidth`
from inside a component is *"a rule nothing can override"*, so a width forced
somewhere upstream is a live candidate.
⚠️ **AND `tom` CARRIES MIDDOTS**, at least at `:1619`, which the
standing rule removes when this page is worked on.

#### The play button is MOJIBAKE, and the page it is on takes a pack upload

⚠️ **ASKED, VERBATIM, WITH A SCREENSHOT:** *"what happened to play
button? autoplay when i upload saple pack"*

The crop shows a transport bar: a glyph button reading **`â—¶`**
and a two-line clock, `0:00.0` over `0:02.0`. **That is a multi-byte character
being decoded one byte at a time**, the classic UTF-8 read as Latin-1, so the
play glyph has become three characters.

🔴 **IF IT IS THE SHARED BAR, IT IS NOT A `tom` BUG, IT IS EVERY PAGE
WITH A TRANSPORT BAR.** The glyph comes from `demo/shell/transport-bar.mjs`,
which is the ONE transport control in this project and says so in its first
line. **Establish the blast radius before fixing anything.**
✅ **ANSWERED 2026-09-25: THE SCREENSHOT IS FROM `https://positron.studio`,
NOT FROM LOCALHOST.** So this is a DEPLOY fault and local is clean, which is the
worst shape for it: **every page with a transport bar is affected for every
visitor while every harness run on this machine stays green.** The deployed
response headers are the first thing to read.
⚠️ **WHAT WAS CHECKED TODAY AND WHAT WAS NOT.** CHECKED: `demo/server.mjs`
sends `charset=utf-8` for `.html`, `.mjs`, `.js`, `.css` and `.json`, and
`demo/tom/index.html` and `demo/pack/index.html` both carry
`<meta charset="utf-8">`. A grep for the mojibake byte sequences across `demo/`
found **nothing**, so it is not sitting in the source. NOT CHECKED: **whether
the DEPLOYED site serves a charset**, which is the obvious remaining suspect and
would make this local-clean and live-broken. `workers/view/src/index.js` sets
`charset=utf-8` on its JSON and plain-text answers and the static pages do not
go through those paths. **Reproduce it and say WHICH origin it was seen on
before touching a line**, because local and deployed have different answers here.
⚠️ **WHICH PAGE IS NOT SETTLED EITHER.** Five pages take a file:
`crate`, `kit`, `pack`, `shape` and `tom`.

✅ **ANSWERED 2026-09-25: IT IS A REQUEST.** Play as soon as a pack is
uploaded. It was put to the owner because it read equally as a report that the
page ALREADY autoplays and should not.
⚠️ **AND IT IS INSIDE THE STANDING RULE RATHER THAN AN EXCEPTION TO
IT.** *"A visit, a step and a scrub must open nothing"* is about a VISIT. An
upload is a gesture a person made, so playing what they just handed the page is
a consequence of that gesture. **A visit must still open nothing**, and that is
the line to hold while building this.

#### `evo`: make all buttons interactive

⚠️ **ASKED, VERBATIM:** *"evo: / make all buttons interactive"*

⚠️ **"ALL" IS THE WORD TO PIN DOWN FIRST.** It reads as: buttons on
that page are drawn but do nothing, or are disabled, and should work. **Find out
which ones and why they are inert before building anything**, because a button
that is disabled for a reason is different from one that was never wired, and
this session has already found one page where every transport button was wired
to a dead option name.
🔴 **AND A BUTTON THAT GAINS A HANDLER IS A BUTTON THE HARNESS NOW
PRESSES.** `demo/verify.mjs` clicks every button in `.pos-controls` on every
run, so making inert buttons live changes what the suite DOES to this page.
`/evo/` imports the instrument box and names `bay`, so check what those presses
would reach before enabling them. **The `/shape/` rule applies wherever it
fits: nothing that writes to somebody's instrument belongs in that row.**

#### `shape`: three controls on one line, and the third one is the DANGEROUS one

⚠️ **ASKED, VERBATIM:** *"shape: but butotns in one line"*, with a
sketch: *"[circuit connected] [Synth1|Synths] [⇄] <- square button, makes
all buttons \"invisible hand\" staeting from random positions"*

🔴 **THE `⇄` BUTTON IS THE EXACT CONTROL THIS PAGE REFUSES TO PUT IN
`.pos-controls`, IN WRITING, AND THE REASON IS SOMEBODY'S REAL INSTRUMENT.**
`demo/shape/index.html:9-13`: *"EVERYTHING THAT CAN REACH THE INSTRUMENT, AND
NOTHING ELSE. The part chooser and the two buttons live here rather than in
`.pos-controls`, because `demo/verify.mjs` clicks every button in that row on
every run: a `move everything` in there would be the suite putting a random
patch on somebody's synth dozens of times a day."* And `:180-184`: *"NOTHING
THAT SENDS IS IN THAT ROW ... a hand button or a `put back` in there would be
the suite writing to an instrument on this desk. `slider.mjs` refuses a hand
inside that row on its own, and there is an assert on it below."*
✅ **SO THE BUTTON IS FINE AND ITS PLACE IS NOT.** It goes in the page's own
row beside the others, never in `.pos-controls`, `slider.mjs`'s refusal stays,
and the assert on that refusal stays. **This is the Novation Circuit on this
desk, which has no factory reset.**

⚠️ **AND THE STATUS CONTROL PULLS THE OTHER WAY, WHICH IS WHY THE ROW
IS SHAPED AS IT IS.** `:176-179` records that `.pos-controls` is what
`demo/verify.mjs` presses and control 0 is what gets `settleMs`, so *"a status
control outside that row is a control no harness drives, and every check behind
it would go silent while the suite stayed green"*. `controls: []` at `:186`.
**`[circuit connected]` joining a page-owned row is therefore a coverage
question, not a layout one**: say what drives it after the move, or say what
went silent.

✅ **THE WIDTH IS ALREADY MEASURED AND THE ANSWER IS THREE.** `:14-20`
records four controls at **784 px in a 688 px column**, which always wrapped,
and that loose they broke 3 and 1 with `put back` alone on a line. Three were
then **RE-MEASURED off real rects at 390, 560, 756 and 1280 px**. The sketch is
three, so one line is achievable, and **a square glyph button is narrower than
what it replaces**. Re-measure at those four widths rather than trusting this.
⚠️ **AND `⇄` IS A GLYPH, SO IT IS NOT A NAME.** It needs an `aria`
label or the control is announced as a symbol, which is the rule
`transport-bar.mjs` already carries for its own glyph buttons.

⚠️ **"STARTING FROM RANDOM POSITIONS" IS A SECOND BEHAVIOUR, NOT A
RESTATEMENT.** The hand moves things; this also SETS them somewhere random
first. `/shell/hand.mjs` supplies `MOVES` and `minSteps`, and `HAND_STEPS =
minSteps(MOVES[0][1])` at `:158` exists so that a lane too coarse to show a hand
is not drawn. `HAND_CEILING = 600` control changes a second at `:322`, and
`:301-305` records that **forty hands are not one hand forty times**. A jump to a
random position on every control at once is the worst case that pacing exists
for, so measure what leaves rather than assuming the coalescer holds.

#### `shape`: drop the MIDI log's empty caption

⚠️ **ASKED, VERBATIM:** *"rm move a slider and what it sends is listed
here"*

`demo/shape/index.html:470`:
`const traffic = createMidiLog({ empty: 'move a slider and what it sends is listed here' });`
⚠️ **CHECK WHAT `createMidiLog` DOES WITH NO `empty`** before deleting
the option. An empty box with no caption at all may be the thing this project
calls *"an empty box is a line"*, which `roll.mjs:111` names. If the component
needs a placeholder, this is a shorter one rather than none.

#### `shape`: wrap it in the instrument box, with a vertical nameplate

⚠️ **ASKED, VERBATIM:** *"shape: / wrap into isntrument box. nameplate
is \"shape\" vertical glued section"*

`demo/shape/index.html`, 1,450 lines, `settleMs: 4000`, one line reading *"edit
a Novation Circuit's sound while it is playing, with sliders that can move
themselves"*. **It does not use the instrument box today.**

✅ **THE BOX EXISTS AND SEVEN PAGES ALREADY WEAR IT**: `demo/shell/instrument.mjs`
over `demo/shell/panel-layout.mjs`, used by `circuit`, `fau`, `evo`, `kit`,
`muta`, `tom` and `twelve`. So this is `/shape/` joining a convention rather
than anything being invented, and `demo/kit/index.html` is where the convention
is graded.

🔴 **"VERTICAL" MAY NOT EXIST YET, AND THAT IS THE PART TO ESTABLISH
FIRST.** `instrument.mjs:9-13` records the placements in use, and they are all
horizontal: `/tom/` is `createNameplate({ lines: ['POSITRON', 'TOM'], place:
'ends' })`, `/twelve/` is `place: 'end'`, `/circuit/` does its own placing.
`plateSpec(maker, name, place = 'ends')` at `:93` is the whole vocabulary.
**If a vertical plate glued down the side of the case is a new mode, it is a
change to SHARED kit that reaches all seven pages plus `/kit/`**, so it is done
once by one agent before any page agent starts, and `/kit/` is re-run.

🔴 **AND DO NOT READ THIS AS UNDOING *"rm nameplates"*.**
`instrument.mjs:144-146` records `plate: false`, added 2026-09-22 on that ask,
and the reason it gives is specific: **the status control already prints the
instrument's name in front of its state, so a plate BESIDE IT is the name
twice.** A plate glued vertically down the side of the case is a different
object in a different place and does not put the name next to the status. **Both
decisions can stand**, and whoever builds this says so in the comment rather
than leaving the two looking contradictory.

⚠️ **THE NAME IS `shape`, LOWER CASE, AS ASKED.** Every existing plate
is upper case (`POSITRON TOM`, `MODEL 12`, `PLAITS`, `WARPS`). Follow the ask
and note the departure, rather than quietly title-casing it.

⚠️ **THIS IS UI AND TOUCHES NOTHING THE PAGE SENDS.** `/shape/` edits a
real Novation Circuit's sound over SysEx, and the standing Circuit rules in
CLAUDE.md are about what gets WRITTEN to that instrument. Wrapping the page in a
box changes none of it, and nobody wandering into this task has a reason to send
anything to the Circuit.

#### `wish`: enable the connections, and a remove button in the column that was reserved for it

⚠️ **ASKED, VERBATIM:** *"wish: when connections (diagram rows) are
there, enable them. add small remove button on each to the right of the row"*

✅ **THE COLUMN ALREADY EXISTS AND WAS RESERVED FOR EXACTLY THIS, WHICH
MAKES THE SECOND HALF CHEAP.** `demo/wish/index.html:205-207` reads *"THE RIGHT
OF EVERY ROW IS FOR ACTIONS AND IT IS EMPTY TODAY"*, asked for on 2026-09-22 as
*"reserve right side of diagram+allowed to action buttons etc. align diagram to
left?"*, and `:229` is `grid-column: 2; grid-row: 1 / 3`. **This is the first
thing to land in it**, so nothing about the layout is being invented.
🔴 **AND THE WIDTH IS A MEASUREMENT, NOT A TASTE.** `:220-227` records
that `diagram.mjs` draws a row of boxes while its host is at least 560 px wide
and STACKS them below that, so the action column's 72 px comes off the picture.
**A button that does not fit inside it collapses the diagram into a stack**, and
the file already says the page reports which number broke it. Measure the button
against 72 px rather than styling it and looking.

✅ **SETTLED THE SAME DAY, ASKED AS:** *"arhive bay demo and rm from
index. use the connecting code in wish"*. **It is the first reading below.** The
rows become LIVE connections, and the code that makes them live is `bay`'s,
moved into service here rather than rewritten. The second reading is recorded
only so nobody re-opens the question.

🔴 **"ENABLE THEM" IS THE HALF WITH THE WORK IN IT AND IT HAD TWO
READINGS.** `/wish/`'s one line is *"say which instrument should play which, and
a language model proposes the connection"*, so today a row is a PROPOSAL.
- **The reading that fits the page:** when the rows are there, make them LIVE,
  so a proposed link actually routes one instrument into another. That is
  `demo/shell/bay.mjs`'s subject, and it is a feature rather than a style
  change.
- **The other reading:** the rows are drawn inert or disabled-looking today and
  should simply become interactive when connections exist.
✅ **THE FIRST ONE IS THE ANSWER.** No confirmation is outstanding.

🔴 **AND THE VALIDATOR IS NOT OPTIONAL.**
`bay.mjs` splits refusals into two lists on purpose and this repository has the
story in writing: one merged `accepts` list meant **every real link on the desk
was refused**. A class a destination does not handle is DROPPED at the boundary
and reported; a class on `never` REFUSES the link. **A model proposes and a
person presses**, which is already this project's rule for anything turning
words into actions, and it is why the rows show the connection as text first.
⚠️ **A remove button is a control per row**, so `/wish/`'s per-page
assert count moves and the harness will now press however many rows exist.
`demo/verify.mjs` presses `.pos-controls button, .tbar-x`, so whether these
buttons are inside that selector is a decision, not an accident: pressing every
remove button in order would empty the page mid-check.

#### `bay`: move the demo to the archive

⚠️ **ASKED, VERBATIM:** *"move bay demo to archive"*

`demo/bay/index.html`, `demo/manifest.mjs:520-522`, `group: 'instruments'`,
`built: true`, one line reading *"route one instrument to another, with the
connections it refuses explained in words"*.

🔴 **THE DEMO AND THE KIT MODULE ARE TWO DIFFERENT THINGS AND ONLY ONE
OF THEM WAS ASKED ABOUT.** `demo/shell/bay.mjs` is a KIT MODULE with its own
`demo/shell/bay-test.mjs` beside it, and this repository's own verify notes cite
it as a worked example of a validator that must assert the REASON as well as the
refusal. **Archiving the page does not archive the module**, and nothing in the
ask says to touch it.

⚠️ **NINE LIVE FILES NAME `bay` AND THEY ARE NOT ALL THE SAME KIND OF
REFERENCE.** `demo/shape/index.html`, `demo/evo/index.html`, `demo/wish/index.html`,
`demo/kit/index.html`, `demo/shell/presence.mjs`, `demo/shell/instruments.mjs`,
`demo/shell/instruments-test.mjs`, `demo/shell/bay.mjs` and
`workers/wish/src/wish.mjs`. **Separate the page references from the module
references before moving anything**, because a page importing `bay.mjs` is
untouched by this and a page LINKING to `/bay/` is not.
⚠️ `workers/view/public/` copies are BUILD OUTPUT and regenerate from
`cd workers/view && node build.mjs`. They are not files to edit.

✅ **SETTLED THE SAME DAY, ASKED AS:** *"arhive bay demo and rm from
index. use the connecting code in wish"*. **Both halves: a real move into
`archive/` AND out of the index.** The cheap reading, `built: false` alone, is
not what was asked for.
🔴 **AND THE MODULE IS NOT RETIRED, IT IS REHOMED.** *"use the connecting
code in wish"* is the other half of the same sentence, so `bay.mjs`'s connecting
code goes into service on `/wish/` in the same effort. **The page is archived;
what it demonstrated is not.** See the `/wish/` entry above, which this settles.
⚠️ **`positron-history` LOADS BEFORE THE MOVE**, since that skill
exists for exactly the links, slugs and paths a retirement leaves behind, and a
move into `archive/` makes every link to `/bay/` a dangling slug.
⚠️ **AND `archive/` IS DELIBERATELY NOT REWRITTEN.** CLAUDE.md records
that the 129-file path sweep left it alone on purpose, because an archive
records what was there, which is why `box` and `radio1965` are still spelled the
old way inside it.

⚠️ **COUNT THE DEMOS AFTER, NEVER REMEMBER THEM.** The row count in
CLAUDE.md moves with this and has been wrong twice in one day before.

#### `muta`: four, and THREE OF THEM REVERSE AN EARLIER EXPLICIT ASK

🔴 **ASKED, VERBATIM:** *"muta / fix sound routing. / rm midi on button.
its should be listening. set up midi listening / permission when i turn either
on at start. / no automatic drone. make a Test tone button in the right of
plaits. when midi notes arrive, they turn off test tone and vice versa / when
plaits is off and warps in on from plaits - how it can play at all?"*

🔴 **THE REVERSALS ARE THE THING TO WRITE DOWN, BECAUSE THE PAGE ARGUES
FOR THE OLD BEHAVIOUR IN ITS OWN COMMENTS AND THE NEXT READER WILL BELIEVE
THEM.** Each one is the owner's to make. What costs money is a comment left
standing that says the opposite, so **every comment named below moves in the
same commit as the code.**

1. ⚠️ **FIX SOUND ROUTING.** Said with no detail, and item 4 below may
   BE the detail rather than a separate question. **Confirm that reading before
   working it**, because "fix routing" with a wrong guess attached is a change
   nobody can find later.
   What the graph does today, `demo/muta/index.html:1261-1266`:
   `node.connect(warpNode)`, `warpNode.connect(wetGain)`,
   `wetGain.connect(ctx.destination)`, and separately `node.connect(drySplit)`,
   `drySplit.connect(dryGain, 0)`, `dryGain.connect(ctx.destination)`. So PLAITS
   reaches the output by two roads at once, through WARPS and around it.
2. 🔴 **REMOVE THE MIDI ON BUTTON, IT SHOULD JUST BE LISTENING, AND SET
   UP LISTENING AND PERMISSION WHEN EITHER INSTRUMENT IS TURNED ON. THIS
   REVERSES TWO EARLIER ASKS AND THE PAGE QUOTES BOTH.** `:921-922` records
   *"add webmidi support (online button midi off)"* and then *"add a button
   (online status one) to turn midi on and off. when on, listem webmidi"*, and
   `:1950` records *"plaits on should not turn midi on and should..."*, which is
   the exact behaviour now being asked for.
   ⚠️ **AND `:929` IS A DELIBERATE DECISION, NOT AN OVERSIGHT**:
   *"NOTHING IS OPENED UNTIL IT IS PRESSED. `requestMIDIAccess` is a..."*.
   Moving the request onto instrument power-up means a browser permission prompt
   fires from that press.
   ✅ **THAT IS STILL INSIDE THIS PROJECT'S RULE, WHICH WAS CHECKED RATHER
   THAN ASSUMED.** The standing rule is that a VISIT opens nothing; turning an
   instrument on is a press a person made, so the prompt is a consequence of a
   gesture and not of a page load. **A visit must still open nothing**, which is
   the line to hold while doing this.
   🔴 **AND IT TAKES AN ASSERT WITH IT.** `:2605` reads
   `midiBtn.el.tagName === 'BUTTON' && midiWas === false && !!midi`, so deleting
   the button deletes evidence. Find what that assert was standing in for and
   replace it rather than let the count drop, which is the `/fau/` compile
   button lesson of 2026-09-24.
3. 🔴 **NO AUTOMATIC DRONE, AND A `Test tone` BUTTON TO THE RIGHT OF
   PLAITS INSTEAD. THIS ALSO REVERSES AN ASK THE PAGE ARGUES FOR AT LENGTH.**
   `:383-396` records *"rm all top buttons, automatically go for drone"* from
   2026-09-22 and then defends it: *"THE PAGE PLAYS ITSELF NOW"*, *"the first
   thing a visitor does produces a continuous sound they can then take a knob
   to, which is what every knob on this panel is FOR"*.
   ⚠️ **MIDI NOTES AND THE TEST TONE ARE MUTUALLY EXCLUSIVE, BOTH
   WAYS**: *"when midi notes arrive, they turn off test tone and vice versa"*.
   🔴 **AND THIS PAGE HAS NO CONTROL ROW AT ALL**, `controls: []` at
   `:402`, which the file says at `:394` costs the harness nothing precisely
   because there is nothing to press. **Adding the first control back changes
   that**: `settleMs` only ever lands on control 0, and `:378-381` records that
   this page has already paid for exactly that once, when control 0 changed and
   the wait that covered a wasm fetch and two handshakes had to move. `muta`
   carries `settleMs: 8000`.
   ⚠️ **AND `/muta/` IS THE PAGE THIS REPOSITORY LOST ASSERTS ON
   SILENTLY**, twice, to the harness's patience while its DSP checks held notes.
   Diff the per-page assert count before against after and account for every row
   that moves.
4. 🔴 **THE QUESTION, AND IT LOOKS LIKE A REAL DEFECT RATHER THAN A
   MISREADING:** *"when plaits is off and warps in on from plaits - how it can
   play at all?"* `CARRIERS` at `:308` is
   `['from PLAITS', 'sine', 'triangle', 'saw']`, and `:1137` reads *"the second
   input comes from PLAITS, so the whole sound is the chain"*. **So with PLAITS
   offline and WARPS carrying `from PLAITS`, WARPS has no input and should be
   silent.** If it makes a sound anyway, either the offline state does not stop
   the node or the carrier selection is not doing what the label says.
   ⚠️ **ANSWER IT BY MEASURING, NOT BY READING THE GRAPH**, because
   both explanations are consistent with the source. This is very likely the
   whole of item 1.

#### `nola`: five, and the first one DEPENDS on the keyboard work above

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT:** *"nola / rm chord from top
left (as it moves to keyb compoentn) / rm gap in piano roll vert lines /
recoridng in diagram is unclear. samples? / only show chords textfield when
typed is selected / add piano / rhodes into a isntrument footer to the right
glued under keyboaed"*

The screenshot shows `/nola/`'s roll: dot rows, faint vertical rules, and the
chord names `C#aug`, `Gmaj`, `Fmaj` stacked at the RIGHT of each row, with the
vertical rules visibly broken by a horizontal gap between rows.

1. ⚠️ **REMOVE THE CHORD FROM THE TOP LEFT.** The reason is in the ask
   and it is an ORDERING CONSTRAINT, not a detail: *"as it moves to keyb
   compoentn"*. **So the keyboard footer has to gain the chord name before
   `/nola/` gives it up**, or the page loses a readout and gains nothing. One
   agent, keyboard first, `/nola/` second.
2. 🔴 **REMOVE THE GAP IN THE PIANO ROLL'S VERTICAL LINES, AND THIS IS
   THE FIFTH REQUEST ABOUT THOSE LINES.** `demo/shell/roll.mjs:68-83` records
   the other four verbatim: *"add faint vertical lines ... (not sure how good
   idea)"*, then *"make vertical lines on pianoroll continuous"* which was done
   by closing the row gap, then *"no continous vertical bars on pianoroll!"*
   which **was read as `remove them` and meant `they are still not
   continuous`**, so they were deleted, then *"you lost vertical lines on piano
   roll"*.
   ⚠️ **READ THAT COMMENT BEFORE TOUCHING THIS.** The file's own lesson
   is that the reading which DESTROYS work is the one to check first, and this
   ask is the same complaint a fifth time: the gap that was closed once is open
   again. **The verb here is unambiguous, `rm gap`, so the lines stay and the
   gap goes.**
   🔴 **AND `roll.mjs` IS SHARED**: `demo/kit/index.html` and
   `demo/nola/index.html` use it, and `demo/shell/keyboard.mjs` and
   `demo/shell/numloop.mjs` build on it. `/kit/` grades the kit, so it moves and
   has to be re-run. Done once, by one agent, before the page agents start.
3. ⚠️ **THE `recording` NODE IN THE DIAGRAM IS UNCLEAR**, with a
   proposed replacement in the ask as a question: *"samples?"*. This is a
   `positron-diagram` task and that skill loads before the box is edited.
   ⚠️ **AND THE WORD MATTERS ON THIS PAGE MORE THAN MOST**, because
   `/nola/` already carries a collision it warns about twice in its own header:
   `demo/shell/rhodes.mjs` is a SYNTHESISED Rhodes and the files beside the page
   are a RECORDED one. A box reading `recording` sits exactly on that seam, so
   whatever replaces it has to be right about which of the two it names.
4. ⚠️ **ONLY SHOW THE CHORDS TEXT FIELD WHEN `typed` IS SELECTED.** A
   field that does nothing in the other mode is furniture that reads as broken.
   ⚠️ **AND IT IS A CONTROL DISAPPEARING, WHICH THE HARNESS FEELS.**
   `demo/verify.mjs` presses `.pos-controls button, .tbar-x` in order and types
   into the fields it finds, so hiding one moves every later control's press and
   may take asserts with it. Diff `/nola/`'s per-page assert count before
   against after and account for every one that moved.
5. ⚠️ **PIANO AND RHODES INTO AN INSTRUMENT FOOTER, TO THE RIGHT,
   GLUED UNDER THE KEYBOARD.** Both instruments already exist on the page: the
   piano is the recorded pack and the Rhodes is Jeff Learman's jRhodes3d, five
   velocity layers, with `demo/nola/PROVENANCE-rhodes.json` and
   `LICENSE-jrhodes3d` beside it.
   ⚠️ **THE ATTRIBUTION IS ON THE FACE OF THE PAGE ON PURPOSE** and the
   header says so, so a footer that re-homes the instrument switch must not
   quietly re-home the credit with it.
   ⚠️ **`glued under keyboard` IS A LAYOUT CONTRACT AND THE KEYBOARD
   ALREADY HAS ONE**: `roll.mjs:259` records that the roll *"goes inside the
   keyboard's own box, and that is what makes it line"* up. A second footer
   hanging off the same box is the same constraint again, so it is a
   `positron-ui` task and the component may be where it belongs rather than the
   page.

#### `keyboard` component, shared: the naming toggle loses its words

⚠️ **ASKED, VERBATIM:** *"keyboard component: Notes | Degreens -> Nt |
Dg."*

`demo/shell/keyboard.mjs:706-708` holds `mkName('Notes', 'letter', ...)` and
`mkName('Degrees', 'degree', ...)`.
🔴 **THIS IS THE FOURTH SPELLING OF ONE LABEL AND THE FILE RECORDS THE
OTHER THREE**, at `:700-705`: *"c | 1 - someting more descriptive?"*, then
`C D E | 1 2 3`, then *"Notes | Degrees"* on 2026-09-23. The comment there
argues IN WRITING for the words over the glyphs, *"a word a reader can look up
beats a demonstration they have to decode"*, so **that comment is now wrong and
moves in the same commit**, rather than being left to contradict the code.
⚠️ The `title` on each button is the sentence a reader looks up and it
is not what is being shortened, so it stays and carries the meaning the label
just gave up.

#### `keyboard` component, shared: a chord name in the footer

⚠️ **ASKED, VERBATIM:** *"add chord name to the footer, right from the
transpose message. avoind text moving in x axis"*

The footer is the keyboard's own, the one the sustain moved into on 2026-09-23
(*"integrate sustain to footer, create toggle button, big and small"*,
`:780-781`). The chord name goes to the RIGHT of the transpose message.
🔴 **AND THE SECOND SENTENCE IS THE HARD HALF.** A chord name changes
width as it changes (`C` against `Cmaj7` against `F#m7b5`), and a label to the
left of it would be shoved about by every chord played. Nothing may move in x.
That is a fixed slot or tabular figures, not a join.
⚠️ **AND IT IS CELLS, NOT ONE STRING WITH GLUE IN IT.** The standing
rule about middots applies before the code is written: a transpose message and a
chord name are two facts and therefore two cells.
⚠️ `demo/shell/chords.mjs` and `demo/shell/chords-test.mjs` already
exist and already name chords. **Find out what they answer before writing a
namer**, because a hand-rolled second one is this project's named defect.

#### `fau`: all sizes in kB

⚠️ **ASKED, VERBATIM:** *"faust all sizes in kb"*

`demo/fau/index.html` prints sizes in at least three units today: raw bytes
(`COMPILER_BYTES = 3598106 + 2407445 + 156922` at `:211`, `PAGE_BYTES` at
`:213`, `PINNED = { name: 'fau_pin', bytes: 7266 }` at `:235`), and one cell
already carries `'per voice': 'KB'` at `:392`. **Every size a reader sees goes
to kB**, which is a sweep of that page's readout keys and its prose, not one
cell.
⚠️ **THE PROSE CARRIES NUMBERS TOO** and goes stale silently: `:132`,
`:181`, `:193`, `:268` and `:272` all quote byte counts in comments and in
`what`. A changed unit that leaves those behind is the drift rule arriving in a
sentence.
⚠️ **DECIDE kB ONCE AND WRITE IT DOWN**: 1000 or 1024, and one decimal
or none. Two conventions on one page is worse than bytes.

#### `fau`: more patches

⚠️ **ASKED, VERBATIM:** *"add more patches if you have"*

⚠️ **"IF YOU HAVE" IS A REAL CONDITION AND NOT A POLITENESS.** Look for
Faust sources already in this repository or already measured, and prefer those
to invented ones. This page's own comments name real ones, the STK waveguide
piano at `:272` among them.
⚠️ **AND A PATCH IS A CONTROL.** Adding one moves every other control's
harness press, so the thing to look at is `/fau/`'s per-page assert count before
against after, and `/fau/` has already lost coverage to a control change once:
its compile button took three asserts' meaning with it on 2026-09-24.

#### A BLANK LINE AFTER EVERY COMMENT, AND THE FORMAT IS NOW EXACT

⚠️ **ASKED, VERBATIM:** *"add nl after comments"*, then clarified with a
worked example rather than a description:

    from                      to

    // comment                // comment
    some-code-here
                              some-code-here

✅ **SO THE FORMAT IS SETTLED**: a comment is followed by a blank line before
the code it introduces.
⚠️ **THE SCOPE IS THE ONLY OPEN HALF, AND THE THREE READINGS COST
WILDLY DIFFERENT AMOUNTS.** The example is JavaScript-shaped (`// comment`), not
Faust, although the ask arrived inside the `fau` block:
  1. **New and edited code only**, a convention from here on. Cheap, and it is
     what a style note normally means.
  2. **Every source file in this repository.** Enormous, and it touches every
     file an agent is holding, which is the `git add -A` hazard at full width.
  3. **The Faust listing shown on `/fau/`**, which is where the ask arrived.
✅ **ANSWERED 2026-09-25: READING 3. THE FAUST LISTING ON `/fau/` ONLY.**
Not a repository-wide sweep and not a convention for new code. **It is a
`/fau/` task and it belongs to that page's agent.**


### Open 2026-09-25: four reports on `/stage/` from looking at the working tree

🔴 **ASKED, VERBATIM, ALL FOUR IN ONE MESSAGE:** *"no hls video on
conrtol room. is it tab swithcing? zoom out transport a lot its frntic. it
should not start unti on aor. still that asked ghost lane"*

Reported against the UNCOMMITTED working tree, minutes after the `onClick` fix
took the page from 31/47 to 46/48. **So a suite reading 46/48 did not see any of
these**, which is the assert-count lesson from the other side: the count went up
and four things a person can see are still wrong.

1. ⚠️ **NO HLS PICTURE IN THE CONTROL ROOM**, and the reporter's own
   guess is in the ask: *"is it tab swithcing?"*. `demo/stage/index.html:390-412`
   builds the audience `<video>` into `byId.get('audience')`, and the control
   room is a different panel. `demo/shell/tabs.mjs` builds panels off-page. So
   the picture may be landing in the audience tab only, or landing in a panel
   that is not attached when the frame arrives. **The guess is worth testing
   first and is not worth trusting**, because `/stage/` has already had one
   bug that looked like tab switching and was a container being repointed.
2. ⚠️ **THE TRANSPORT IS ZOOMED IN FAR TOO FAR AND READS AS FRANTIC.**
   `ARCHIVE_WINDOW_MS = 30 * 1000` at `:956`, and the control room's timeline
   opens on the same window from zero (`:1733`, `:2898`). Asked for *"a lot"* of
   zoom out. ⚠️ **AND THE PAGE ASSERTS THE CURRENT NUMBER**: `:2915`
   checks the room's span against `ARCHIVE_WINDOW_MS` within 5 per cent, so this
   is a change to a constant AND to the assert that grades it, in one commit.
   ⚠️ The archive window was itself asked for on 2026-09-18 as *"zoom
   arhvie to 15s and allow to zoom out 4x more"* and tuned to *"zoom around this
   level"*, so **check whether this ask is about the control room only** before
   moving the archive's.
3. ⚠️ **IT SHOULD NOT START UNTIL ON AIR.** Read as: the timeline, the
   write head and the film should not be running while the badge still says
   `OFF AIR`. `armWall(0)` fires when recording starts (`:1240`), and the film
   was made to start with the show on 2026-09-25 when its own play button was
   removed, which `HANDOFF.md` already flags as a reversal to revisit. Whatever
   moves before `phase === 'live'` is the subject.
4. 🔴 **THE `asked` GHOST IS STILL THERE**, in the reporter's words
   *"still that asked ghost lane"*, AFTER the fix measured clean in three tabs.
   The earlier repair made the SENDER drop `asked` unless its phase is `live`
   and the RECEIVER take a question only from a live state, and it was verified
   across tabs in a private room. **So either there is a third path that paints
   a question, or the ghost is in the LANE rather than in the question**, and
   `:795-796` already records a lane assert that *"quietly stopped"* once
   before. A cross-tab measurement passing while the thing is still on screen
   means the measurement was not of the reported symptom.

⚠️ **NOTHING HERE IS COMMITTED.** The `onClick` fix, the question fix
and these four sit in one dirty working tree.


### Open 2026-09-25: a stale question appears on `/stage/` while the page is OFF AIR

🔴 **REPORTED WITH A SCREENSHOT AND NEVER WRITTEN DOWN UNTIL NOW**, which
is the defect this file exists to prevent. It lived in `HANDOFF.md` only, so it
was one session away from being lost. The exact words of the report are not
recorded; what is recorded is the picture: `KAS SA OLED TEINUD ÖKOPATTU?` on
screen on a page whose badge reads `OFF AIR`.

⚠️ **WHAT IS KNOWN.** `demo/stage/index.html:67` reads
`const ROOM = Q.get('room') || 'stage-demo'`, a FIXED default, so every manual
probe and every headful open of the page lands in the room a visitor lands in,
and a question asked in one of those probes outlives it.

🔴 **AND THE FIRST EXPLANATION WRITTEN DOWN WAS WRONG, CHECKED
2026-09-25.** `HANDOFF.md` said *"`demo/verify.mjs` gives every other page its
own room per run and this page's default is shared with the public"*, pointing
the next reader at the harness. **The harness is innocent**: `demo/verify.mjs:648`
is `const own = t.room === 'fixed' ? '' : 'room=<name>-test-<hash>'` and `stage`
is not `room: 'fixed'` in `demo/manifest.mjs`, so every suite run has had
`stage-test-<hash>` of its own and has never touched `stage-demo`. The probes did
it. Corrected in `HANDOFF.md` the same day.

⚠️ **THE SHAPE OF THE FIX IS NOT THE ROOM NAME.** A question belongs to
a show and an off-air page has no show, so a visitor arriving at a dead page
should not be shown somebody else's question from hours ago whatever the room is
called. Where the question is persisted and served from is the thing to find.

### Open 2026-09-25: the active tab on `/stage/` has a vertical rule down each side

⚠️ **ASKED WITH A CROP** of `CONTROLROOM` showing a border on the left
and the right of the active tab. The exact words are not recorded and the ask was
never written here until now. Nobody has looked at it.

⚠️ **IT MAY NOT BE THIS PAGE'S TO FIX.** If the rule comes from
`demo/shell/tabs.mjs` or `demo/shell/shell.css` it is shared, it moves every
tabbed page, and it is decided ONCE by the session rather than by whoever is
working `/stage/`. Diagnose, name the file and the rule, say which pages move,
and stop there.
### Open 2026-09-25: FIVE UI ASKS ON `/stage/`, COLLECTED AS A STREAM

🔴 **ASKED, VERBATIM, ONE MESSAGE, AFTER** *"can we please in the name of god fix
the stage ui 1 asked 1000000 times"*. Collected here first and worked second,
which is the rule asked for 2026-09-19. Every item says which file it touches.

**1. A STALE QUESTION ON LOAD.** *"So when I load it, I get some kind of stale
uh, question. Where is it coming from? Who entered it? Was it me or somebody who
tested the page? It's called Oled sa tontu inimene, are you a ghost or a human?
So please clear that uh, uh, back, um, history in the, in the messages."*

🔴 **THERE IS NO HISTORY TO CLEAR, AND THAT IS THE FINDING.** Measured
2026-09-25 by reading the code rather than inferring from the symptom:
- `workers/relay/src/index.js` is stateless fan-out. `webSocketMessage` sends
  **VERBATIM, to everyone, sender included**, and `#accept` sends a joiner
  NOTHING. There is no `storage.put`, no retained last message and no backlog.
- `demo/stage/index.html` has **no `localStorage`, no `sessionStorage` and no
  `indexedDB`**, so nothing is restored on load.
- `fetchBack` is called once, at line 2140, INSIDE the stop and upload path. No
  archive is replayed on load.
- The string `tont` does not exist anywhere in `demo`, `workers` or `src`.

✅ **SO IT WAS TYPED BY A PERSON, LIVE, INTO A CONTROL ROOM ON THE SHARED ROOM,
AND IT ARRIVED WHILE THE PAGE WAS OPEN.** Not the owner and not the harness: the
harness sends `ASK_TITLE`, which is `Kas sa oled teinud ökopattu?`.
🔴 **THE DEFECT IS THE ROOM, AT `demo/stage/index.html:67`**:
`const ROOM = Q.get('room') || 'stage-demo'`. A FIXED default means every
visitor, every probe and every harness run share one room with the public, so a
stranger's question lands on the owner's screen. `demo/verify.mjs` gives every
other page its own room per run. **This is the same shape as the `FCM_TOPIC`
bug in `CLAUDE.md`: one shared resource with everything around it partitioned.**
⚠️ **AND A SECOND, SMALLER ONE.** `ASK_TITLE` at line 2281 is the PREFILLED
`value` of the control room's question field at line 2284, so an Estonian
question about eco-sins is on screen on load even with the room fixed. That is
not the text reported, and both are wrong on a page that reads `OFF AIR`.
**Files: `demo/stage/index.html`, and `demo/verify.mjs` if the run needs a room.**

**2. THE VIDEO PANEL GETS ONE FOOTER AND LOSES THE TIMER.** *"In the control
room, the first two modules, the video panel and the transport plus timeline,
remove the count time counter from the video panel, from a footer, and remove a
footer as well. So video panel only should have single footer, which looks and
behaves like uh, audience one."*
**Files: `demo/shell/video-panel.mjs` (SHARED, 6 pages use it), then
`demo/stage/index.html`.** The audience panel's footer is the reference, so the
control room's is the one that changes.

**3. THE QUESTIONS GO ON THE PICTURE, WHERE SUBTITLES LIVE.** *"Overlay the
questions who are appearing on top of video, sort of a place where usually
videos have subtitles and uh, make them more contrasty. So remove them from
video panel footer and move them actually on top of a video in the lower part."*
**Files: `demo/shell/video-panel.mjs` or `demo/shell/shell.css` for the overlay,
then `demo/stage/index.html`.** Line 1915 records that the question currently
comes off BOTH footers and `show()` puts it in a panel's centre, so this is a
move rather than a new element.

**4. `PLAY RECORDING` IS NOT A STANDARD BUTTON.** *"when I look at the transport
uh, play recording is has this huge font size and it's kind of off to the right
so please make it as a standard button and for the buttons please use our
regular button styling with no uppercase"*
**Files: `demo/stage/index.html:1371` uses class `tbar-x`, plus
`demo/shell/transport-bar.mjs` and `demo/shell/shell.css` (SHARED, 30 pages use
the bar).** ⚠️ **SCOPE IS OPEN AND IS BEING ASKED**: uppercase is the house
style in over 25 rules in `shell.css`, so "no uppercase" is either this page's
transport or every button on the site, and those are very different jobs.

**5. THE TWO CARRIED OVER FROM SESSION 49, REPORTED AND NOT DONE.**
- ⚠️ **THE SIDE BORDERS ON THE ACTIVE TAB**, asked about with a crop of
  `CONTROLROOM` showing a vertical rule each side. `.pos-tabs-t` carries
  `border: 0` and the selected rule is an inset bottom shadow only, so the rule
  each side comes from somewhere else and is not yet located.
  **File: `demo/shell/shell.css`.**
- 🔴 **REFUSED 2026-09-25: THE FILM STARTS WITH THE SHOW AND STAYS THAT WAY.**
  Carried as *"the film starts with the show, which was a reversal forced by
  removing its play button rather than something asked for"*, and it needed a
  decision: a film control comes back, or the film stops starting with the show.
  Put to the owner with three options, and **THE OWNER CHOSE to leave it exactly
  as it is, starting with the show, with no film control.** So the reversal is
  the decision now rather than an accident nobody signed off, and this line
  leaves the file by being refused in writing rather than by going quiet, which
  is CLAUDE.md's rule about anything in here.
  **File: `demo/stage/index.html`, unchanged.**


### Done 2026-09-25: `/llhls/` was dark, and the key rotation is what did it

🔴 **ASKED, VERBATIM:** *"lets focus on get llmhls demo properly working. what
should be streaming there for testing?"*

✅ **THE ANSWER TO THE QUESTION IS: NOTHING EXTERNAL, AND NOTHING YOU HAVE TO
START.** `/llhls/` is its own source. Pressing its one control opens a socket to
`wss://pub.positron.studio/watch`, and **that socket IS the reference count**:
holding it wakes the `positron-pub` container, which runs ffmpeg on
`testsrc2` plus a chord with the epoch burned in by `drawtext`, and publishes
over RTMPS to the live input in `demo/shell/live.mjs`. Closing the tab is how
the publisher learns nobody is watching. So there is no OBS to set up, no file
to push, and no other server involved. `rig/push-llhls.sh` exists for pushing
something else in, and is not needed for a test.

🔴 **AND IT WAS BROKEN, BY YESTERDAY'S KEY ROTATION, IN THE ONE PLACE THE
HANDOFF SAID TO LOOK AND THEN LOOKED PAST.** The handoff reads *"the input UID
did not change, so nothing in the repository needed editing"*, which is TRUE and
is the whole trap: the key is not in the repository, it is a Worker secret
(`STREAM_KEY` on `positron-pub`), and rotating the key in Cloudflare without
re-putting that secret leaves the publisher authenticating with a dead value.
MEASURED 2026-09-25, holding the socket for 100 s:
- **The RTMPS leg died every time**, `ffmpeg exit 224`, with
  `error:0A00007F:SSL routines::bad write retry` and `Error writing trailer:
  Broken pipe` out of the flv muxer. It came up (`publishing=true pid=30`), was
  refused, and the 30 s sweep restarted it into the same wall.
- **The input never went live**: `lifecycle` read `status: disconnected`,
  `videoUID: null`, and the manifest answered **204** for the whole run, which
  is Cloudflare saying it has nothing.
- 🔴 **THE WHIP LEG PUBLISHED THE WHOLE TIME, 0 RESTARTS**, on the same
  container, the same ffmpeg, the same network and the same test pattern. **That
  is what makes this a credential fault rather than an encoder fault**: the two
  legs differ in exactly one thing, and it is which secret they carry. `WHIP_URL`
  was not rotated.
- **It worked six hours before the rotation.** `pub.positron.studio/logs` still
  holds a real session from **2026-09-24T13:25Z**: segments loading off video
  UID `d94be5df`, latency about 6 s, `ADV=0.99`, three level switches. The key
  was rotated at **19:08:11Z**. Worked, rotated, dark.

✅ **FIXED 2026-09-25** by putting the current key into the secret, fetched and
piped in one command so it was never printed, never written to a file and never
returned to an agent: `wrangler secret put STREAM_KEY --name positron-pub`.

⚠️ **THE LESSON, AND IT IS NOT ABOUT STREAMING.** A rotation is not done when the
provider accepts it. It is done when **every consumer of that credential has the
new value**, and the consumers are exactly the places a repository cannot see,
which is why they are the places nobody checks. The sentence *"nothing in the
repository needed editing"* was written as reassurance and read as completion.
⚠️ **AND THE SYMPTOM POINTED AWAY FROM THE CAUSE.** A broken pipe out of an FLV
muxer reads as a network fault or a sick encoder, and there is a container in
the path to blame. The thing that settled it in one run was having a SECOND leg
on the same container with a different credential, which is a comparison that
existed for an unrelated reason.

### Open 2026-09-25: `/stage/` lost its loopback, and the gate that replaces it is owed

🔴 **ASKED:** *"go both real leg. we build gate later. taavet (that my friend)
wants demo"*, then *"jusr rm loopback and add note about it somewhere"*. This is
the note.

**WHAT WENT.** `loopback(stream)` built two `RTCPeerConnection`s in the same tab,
wired them to each other, and handed the audience panel the track that came back
out of the second one. It was the DEFAULT, and the real Cloudflare leg was
behind `?live=1`.
✅ **WHY IT WAS RIGHT AND WHY IT HAD TO GO.** It kept the shape of the thing
being tested, a real encode, a real offer and answer, a real `ontrack`, so the
recorder could still take the returned track rather than the canvas. What it
could not do is be the thing somebody was sent a link to see. **A person opening
the page got two peer connections talking to themselves and no Cloudflare at
all**, which is the right default for a harness and the wrong one for a demo.

🔴 **WHAT IT COSTS NOW, AND IT IS OWED RATHER THAN DECIDED AWAY.** `/stage/` is
`built: true`, so it is in every full suite, and every pass now holds a real
Cloudflare live input open. **Stream bills by the minute DELIVERED and buffering
counts.** This was accepted knowingly in the words *"we build gate later"*, so
the debt is recorded here rather than argued about.
⚠️ **AND TWO DEAD BRANCHES WENT WITH IT.** `LIVE` is `const LIVE = true` now, so
`if (!LIVE)` was a guard that could never fire, in two places. A dead guard reads
as finished work and is this project's most expensive defect, so they were
deleted rather than left looking like a fallback.

⚠️ **WHAT THE GATE HAS TO BE, WHEN IT IS BUILT.** Not a return to loopback as the
default: the lesson above is that the default is what a visitor meets. It is a
limit on WHO and HOW LONG. The harness is the easy half, because `SELFCHECK` is a
flag a person never has. The visitor half is the real question and it is not
answered here.

### Open 2026-09-25: the control room UI is DONE and 14 asserts are one timing cascade

✅ **SHIPPED.** One bar in the control room: `START HLS` and `START WEBRTC` on
the left, the timers and `PLAY RECORDING` on the right, no play glyph, one
timeline, one diagram. Each transport button is its own stop and says so. The
publisher wake now says `starting` on the badge, because it is about twenty
seconds of nothing and silence reads as broken.

🔴 **AND IT IS 33/47, WITH ALL FOURTEEN FAILURES DOWNSTREAM OF ONE.** The page's
own check polls for `phase === 'live'` after pressing, and the start does not
land inside the window, so every assert about a running show, its recorder, its
archive and its strip follows it red. **The show DOES start**: the stop assert a
few lines later reads *"the page is live and the button reads STOP WEBRTC"*,
which is the same run contradicting the assert above it.
✅ **AND IT IS PROVEN WORKING IN A REAL BROWSER**, which is the thing that
matters: probed headful against the local page, `pc connecting` at 27.6 s,
`pc connected` at 27.9 s, `picture 1280x720`, recorder started. Headless is the
same, connecting at 38.4 s and live at 40.2 s.

🔴 **THE CONSTRAINT IS STRUCTURAL AND IS NOT A NUMBER TO TUNE.** This page HOLDS
its asserts and flushes them only when `checks()` returns, so every second spent
waiting inside it delays all 37. Widening the poll to 28 s, 45 s and 80 s were
all tried: at 28 s and beyond the flush moves past the harness's patience and
the page reports **2 asserts instead of 37** while the suite reads a confident
**12/12 green**. So the wait cannot be long enough for a cold container AND
short enough to report.
⚠️ `settleMs` was raised from 25000 to 75000, which is what `/webrtc/` uses,
and it is not sufficient on its own: `demo/verify.mjs` caps the first-assert
budget at `FIRST_ASSERT_CEIL = 30000` regardless.

✅ **THE FIX IS TO GRADE THE HLS LEG INSTEAD, AND IT IS THE RIGHT ONE ANYWAY.**
LL-HLS comes up in a couple of seconds where WebRTC needs a container wake, it
is what a harness can carry, and it exercises the SAME recorder, archive and
strip. The check block should press `START HLS` rather than `START WEBRTC`.
That is a restructure of the check, not a patch, and it is the next thing.

### Open 2026-09-25: WHEP MEDIA DOES NOT FLOW FROM THIS MACHINE, AND IT IS NOT THE CODE

🔴 **MEASURED WITH NO POSITRON PAGE INVOLVED, IN A REAL HEADFUL CHROME, AGAINST
THE LIVE INPUT.** A bare `RTCPeerConnection`, two recvonly transceivers, the
WHEP POST, nothing else:

    status         201        Cloudflare accepted the offer and answered
    connection     failed
    ice            disconnected
    states         connecting -> failed
    framesDecoded  0
    bytesReceived  0

**The signalling works and the media path does not.** This is a fact about the
network this machine is on, not about `/stage/`, not about the harness, and not
about headless Chrome, all three of which were blamed in turn today.

⚠️ **SO EVERY WebRTC FAILURE ON `/stage/` IS DOWNSTREAM OF THIS**, and no amount
of page work will move them from here. The same is true of `/webrtc/`, whose own
checks have therefore never run on this desk.
✅ **AND LL-HLS IS UNAFFECTED**, which is measured: `llhls` reads 12/12 against
the deploy. The HLS transport is the one that works from anywhere, which is an
argument for it beyond latency.
🔴 **WHAT IS NOT KNOWN IS WHETHER IT WORKS FOR A VISITOR ELSEWHERE**, and
nothing here can answer that. **Do not report `/stage/` as working or as broken
on the strength of a run from this laptop.** The cheap test is somebody on
another network opening it, or a phone on mobile data.
⚠️ **AND THE DAY'S REAL LESSON IS ABOUT THE CONTROL, NOT THE NETWORK.**
`/webrtc/` was used for hours as proof that WHEP worked, on the strength of an
8/8 that contained **two** page asserts, both of them the shell's. A green page
with no coverage is the worst possible control, and the assert count said so the
whole time.

### Done 2026-09-25: `/webrtc/` GRADES ITSELF NOW, AND THE CAUSE WAS NOT THE CONNECTION

✅ **FIXED. `page asserted something` went from 2 to 10 and the page reads
16/16**, headless, with a publisher awake: `peer connection connected`,
`a track arrived audio:live video:live`, `a VIDEO track arrived`,
`video is advancing`, `frames are actually RENDERED 1280x720`,
`element is playing`.
🔴 **AND THE DIAGNOSIS UNDER THE HEADING BELOW WAS WRONG.** Two defects, both
in `demo/webrtc/index.html`, neither of them about WebRTC:
1. **`d.run('check')` WAS DEAD CODE.** It sat after a `for` loop whose success
   branch `return`ed and whose failure branch `return`ed. Every route out of
   that handler skipped the checks, so the page could not have graded itself
   however well the transport worked. `return` became `break`.
2. **A PAGE THAT COULD NOT REACH ITS SUBJECT LOGGED IT AND VANISHED.** The
   `whip leg never came up` branch was a bare `d.log`, and a log is not graded,
   so the suite saw a page that simply stopped having opinions. It asserts now,
   with the wait in words, and an aborted teardown is still not graded red.
⚠️ **SO THE SENTENCE `WHEP DOES NOT CONNECT IN THIS HEADLESS CHROME, FOR ANY
PAGE` IS WITHDRAWN.** It does connect, headless, from this desk, today.
⚠️ **AND THE THIRD OWED ITEM BELOW IS ANSWERED**: whether WHEP connects from a
real browser here was the unmeasured thing, and it is measured now at 389
frames and 3,554,870 bytes with no VPN involved.
⚠️ **THE ORIGINAL ENTRY IS KEPT BELOW UNCHANGED**, because the wrong first
answer is the reason the rule is worth anything, and this repository says so.

### Open 2026-09-25: `/webrtc/` has been GREEN WITH ZERO COVERAGE, and WHEP does not connect here at all

🔴 **`node demo/verify.mjs webrtc` READS 8/8 GREEN AND THE PAGE'S OWN CHECKS
HAVE NEVER RUN.** MEASURED 2026-09-25: `page asserted something · 2`, and those
two are the SHELL's feedback-button asserts. Every claim that page makes about
WebRTC sits behind `await d.run('check')`, which is the last line of a `for`
loop that `return`s on success, so it is reached only after a connection that
never happens. **Six of its eight greens are the shell's, and the page
contributes none.**

🔴 **BECAUSE WHEP DOES NOT CONNECT IN THIS HEADLESS CHROME, FOR ANY PAGE.**
Probed directly on `/stage/` with the page's own log: the WHIP leg confirmed
publishing in 0.1 s, `pc connecting` at 2.2 s, and the connection then sits in
`connecting` until it times out, `pc failed` at about 17 s. Four attempts with
the connection state judged explicitly, rather than on whether `whepPlay` threw:
all four reached `connecting` and none reached `connected`.
⚠️ **SO NINE OF `/stage/`'s TWELVE FAILURES ARE THE ENVIRONMENT, NOT THE PAGE**,
and every hour spent "fixing" the page against them was spent against a wall.

🔴 **AND THE COMPARISON THAT SENT ME THERE WAS THE FAULT.** `/webrtc/` was used
all afternoon as the control, on the reasoning that it reads 8/8 against the
SAME input in the SAME browser, so WHEP must work and `/stage/` must be doing
something different. **A green page with no coverage is the worst possible
control**, and this project already knows the shape: a green suite can mean zero
coverage, and only the assert COUNT says so. The count was there to read the
whole time.

**WHAT IS ACTUALLY OWED:**
1. **`/webrtc/` has to report that it could not connect** rather than passing.
   A page that cannot reach its subject says so, the way `caps.mjs` un-links a
   row WITH THE REASON IN WORDS.
2. **`/stage/`'s show-dependent asserts need a leg the harness can carry.**
   LL-HLS works headless (`llhls` is 12/12), so the checks should drive the HLS
   transport and grade the same recorder, archive and strip behaviour through
   it. That is a restructure of the check block, not a patch.
3. **Whether WHEP connects from a REAL browser here is unmeasured.** Nothing in
   this session opened one. It may well be fine for a visitor, and that is the
   first thing to establish before anybody treats `/stage/` as broken.

### Open 2026-09-25: `/stage/` is DEPLOYED AT 37/49 and its WebRTC start fails cold

🔴 **THE LIVE PAGE IS NOT GREEN AND I REPORTED THAT IT WAS.** MEASURED cold on
2026-09-25 against the deployed commit: **37/49**, the show never reaches
`live`, and twelve asserts downstream of a running show are red.

🔴 **THE 49/49 I SHIPPED IT ON WAS A MEASUREMENT OF A WARM CONTAINER.** The
pure-receiver change was verified minutes after runs that had already woken
`positron-pub`, so its WHIP leg was publishing before the page ever asked.
**A green run against a warm dependency is a measurement of the warmth**, which
is this repository's own A/B rule arriving through STATE rather than through
code, and nothing in the output said which it was.

**WHAT IS ACTUALLY WRONG, as far as it was narrowed:**
1. **A receiver has no wait.** Holding the socket only ASKS the container to
   wake; its WHIP leg takes seconds to reach Cloudflare and a WHEP subscribe
   against an idle input answers 409. Adding a short retry did NOT fix it.
2. **`dropTransport()` closed the publisher hold**, dropping the container's
   viewer count to zero and stopping its legs, immediately before asking it to
   wake again. Keeping the hold across a switch did NOT fix it either.
⚠️ **BOTH WERE TRIED AND REVERTED**, because neither moved 37/49. So the cause
is a third thing and is not yet known.

⚠️ **AND THE CONSOLIDATION IS STILL NOT DONE** (one bar, starts left, timers and
PLAY RECORDING right, no play glyph, one timeline, one diagram, no
`Nothing recorded yet` card). Five attempts, five distinct causes:
`paintPlayRec` in a temporal dead zone; `toggleTransport` lost to an earlier
revert; **`right` takes DOM ELEMENTS and `extras` takes descriptors**
(`transport-bar.mjs:594` does `right[0].dataset.end = '1'`); `settleMs` landing
only on the FIRST PRESSED control; and a latch held across the container wake.
🔴 **THE ONE WORTH KEEPING IS HOW THE FAILURES HID.** `checks()` HOLDS its
asserts and flushes them at the end, and it is async and called WITHOUT `await`
(`const warm = () => { if (++warmed >= 6) checks(); ... }`). **So any throw
anywhere inside it loses all 37 silently, as an unhandled rejection the harness
does not classify as a console error**, and the suite reports a confident
**12/12 green**. That is the worst shape this project names, and it is built
into the page.
✅ **THE COUNT IS THE ONLY THING THAT CAUGHT IT**, every time.

### Open 2026-09-25: `/stage/`'s control room has two ways to start and it confuses

🔴 **ASKED, VERBATIM:** *"double play and start in stage control room is
confusing. make just start primary button (or Start HLS | Start WebRTC?) and rm
play button under video. measure"*

Two controls that both look like "begin": the page's own start, and a `play`
button under the video. Proposed shape is ONE primary control, and the
parenthesis in the ask is the real question: a single `Start`, or a choice of
`Start HLS` / `Start WebRTC`. ⚠️ **THE CHOICE READING IS THE ONE THAT FITS
WHERE THIS IS GOING**, because the transport decision was settled the same day
as ONE per show (*"no 2 transports in same time"*), and a control that names the
transport is that decision made visible instead of hidden in a query parameter.

🔴 **AND "measure" IS THE HALF THAT MAKES THIS NOT A COSMETIC CHANGE.**
`CLAUDE.md`'s rule: adding or removing a control moves every other control's
harness press, so the thing to look at is the per-page assert count before
against after. `/stage/` carries `settleMs: 25000` in `demo/manifest.mjs`, so it
is one of the slower pages to verify and the run should be `node demo/verify.mjs
stage` alone rather than any suite.
⚠️ **AND A DELETED CONTROL CAN TAKE AN ASSERT'S MEANING WITH IT.** The `/fau/`
compile button did exactly that on 2026-09-24: three asserts were reading
`d.button('compile').disabled` as evidence of power state, and deleting the
conjunct was coverage lost at a count that did not move. Check what the `play`
button's presses were standing in for before removing it.
⚠️ **AND THE PROSE MOVES IN THE SAME COMMIT.** `what` on the page and `one` in
`demo/manifest.mjs` both describe *"two presses, one for the picture and one for
the show"*, which is exactly the thing being removed.

### Open 2026-09-25: the native reload rate limit does not exist, and two files say it does

🔴 **FOUND while answering the config question, not looked for.**
`src/low-latency-player.js:564` reads `if (since < cfg.nativeReloadCooldownMs)
return;` and **`nativeReloadCooldownMs` is defined NOWHERE**. Not in `DEFAULTS`
(lines 103 to 235, 23 keys, it is not among them), not in any caller. MEASURED by
grep across the repository: the identifier appears **twice**, and both are that
same line, in `src/low-latency-player.js` and its byte-identical deployed copy
under `workers/view/public/`. **`since < undefined` is `false`**, so the guard
never returns and every native reload goes straight through.

🔴 **THE POINT IS NOT THE MISSING LINE, IT IS THAT TWO PLACES CLAIM THE GUARD
WORKS.** The function's own comment says it is *"rate limited, because a reload
storm is worse than a stall"*, and `positron-streaming` says **"Native HLS gives
one lever and it is a reload, so rate limit it"**. The same skill records that
**rebuild storms were the direct cause of the v4 tab crash**. So a defence that
was designed, commented, and written down in a skill is inert in the shipped
file, and every reader of either sentence believes it is there. ⚠️ **AN
UNDEFINED CONSTANT IS THE QUIETEST POSSIBLE FAILURE IN JAVASCRIPT**: no throw, no
warning, and a comparison that silently decides the safe branch is the one never
taken.

⚠️ **WHAT IS NOT KNOWN, AND WHY THIS IS NOT A ONE-LINE FIX YET.**
1. **The number has to be chosen rather than guessed.** The hls.js path next door
   uses `rebuildCooldown: 4000` with a 3,000 ms trigger gap. A native reload is
   heavier: it tears the element down and refetches. `sourceStallTimeout` is
   12000 and `stallTimeout` is 6000, so anything at or under 6 s risks reloading
   inside a stall the watchdog is still measuring.
2. 🔴 **NOTHING IN THIS REPOSITORY CAN TEST IT.** The native path is WebKit only,
   `verify.mjs` drives headless Chrome and never takes that branch, and
   `verify-native.mjs` needs a real iPhone. This is the exact class the file's
   own comment records: *"local verify could not catch it because desktop Safari
   never takes that branch"*, arriving one layer along.
3. **What bounds it today is accident, not design.** The source watchdog resets
   `nativeEdgeMoved` before calling, which re-arms a 12 s timer, and the other
   two triggers are element events. So the storm is unlikely rather than
   prevented, which is a different claim from the one being made.

**The fix is one key in `DEFAULTS` beside `rebuildCooldown`, plus a number with a
reason on it, plus a run of `verify-native.mjs` on a phone before anybody says it
is rate limited again.** NOT done in this session: `src/` is deployed and the
verification path needs a device that is not here.

### Done 2026-09-25: a new user gets the hls.js config, and ours is stock and wrapped

🔴 **ASKED, VERBATIM:** *"want tom make sure when new user works with llhls it
will get the hls.js optimizations / "right config" we have done. do our llhls
demo work on "right config" or patched hls.js?"*

Two questions in one, and the second decides the first.
1. **Is `hls.min.js` in this repository stock or patched?** `demo/llhls/index.html`
   loads `/proto/remixer/hls.min.js`, a VENDORED copy rather than a CDN URL, and
   a vendored minified bundle is exactly the shape that can carry an edit nobody
   records. `proto/flipper/hls.min.js` is a second copy. Settle it by comparing
   both against the official dist of the same version, not by reading them.
2. **Whatever the answer, the config has to travel.** `src/low-latency-player.js`
   (v14) is where the measured knobs live and `positron-streaming` already
   carries the reasons. `positron-start` does NOT point at either, so somebody
   standing up a site of their own gets hls.js defaults, which the skill says in
   measured terms are wrong in three directions at once: `maxLiveSyncPlaybackRate`
   1 and `maxLatency` Infinity park the player at whatever latency the startup
   hiccup gave it (7.6 s one run, 15.4 s the next, same stream same config), and
   `startFragPrefetch` false, `initialLiveManifestSize` 1 and
   `startOnSegmentBoundary` false all push against a low-latency live start.

✅ **BOTH HALVES ANSWERED 2026-09-25, AND THE ANSWER TO THE SECOND QUESTION IS
STOCK.** MEASURED: `proto/remixer/hls.min.js` and `proto/flipper/hls.min.js` are
byte identical to each other AND to the official hls.js 1.7.1 dist from npm,
**618,156 bytes, sha256 `6cfad701a61fb8a99add5e84449e64661169b0652bf44ceb2a28465c8817b5f1`**.
**Nothing is patched.** What makes LL-HLS work here is `src/low-latency-player.js`,
a WRAPPER, which is why it transfers at all: somebody can upgrade hls.js from npm
for ever with no patch to re-apply.
⚠️ **AND IT WAS NOT ATTRIBUTED.** hls.js is **Apache-2.0**, vendored twice, on a
repository that went public yesterday, and it was absent from `NOTICE.md`. A row
was added. Noticed only because the question forced an audit of the bundle.

🔴 **ASKED AS A FOLLOW-UP, VERBATIM:** *"can we not use it without wrapper just
"right config""*. **Partly, and the split is measured.** The `new Hls({...})`
literal is lines 401 to 461 of 1,070, holding **17 key lines**, which is **1.6
per cent of the file** and 3.1 per cent of its 546 code lines. The other 98 per
cent is what happens after something goes wrong, and **none of it has an hls.js
option behind it**: the native-WebKit path (~189 lines), the advance-ratio cap,
the drift-seek governor, the starved watchdog that must not seek over an
audio-only shortfall, destroy-and-rebuild on a fatal `manifestParsingError`, the
PDT wall-latency fallback, and twenty more, each with its line range and its
failure written down in `positron-streaming`.
✅ **THREE OF THE SIXTEEN PASTE-ABLE KEYS ARE NO-OPS** against 1.7.1 defaults
(`lowLatencyMode`, `levelLoadingMaxRetry`, `levelLoadingRetryDelay`), which
nothing had said before. **Thirteen move something.**
🔴 **AND THE `xxxLoading*` KEYS ARE DEPRECATED SHIMS IN 1.7.1 THAT LOG A
WARNING**, rewritten internally into `manifestLoadPolicy` / `playlistLoadPolicy`
/ `fragLoadPolicy`. They work today and they are **the first thing that breaks on
an hls.js upgrade**, which is a live maintenance fact about a file nobody has
moved off them.
⚠️ **`maxLatency` IS NOT A CONFIG KEY**, it is a getter off
`liveMaxLatencyDurationCount` (default Infinity). ⚠️ And `liveSyncDuration`
must not be paired with `liveSyncDurationCount`: hls.js throws
`Illegal hls.js config: don't mix up`.

**WRITTEN INTO:** `.claude/skills/positron-streaming/SKILL.md` (+266, the
reference copy with every measurement), and `.claude/skills/positron-start/SKILL.md`
(+64 in Step 4b, plain register, the paste-able object plus what it does and does
not buy and when to take the whole file instead).

### Done 2026-09-25: the rotate-keys claim was stale in three files, on a public repo

🔴 **ASKED, VERBATIM:** *"rm stale rotate keys stuff"*

`HANDOFF.md` records `positron-demo`'s RTMPS key as ROTATED at
2026-09-24T19:08:11Z with the input UID unchanged, and says the `rotate_keys`
endpoint has existed since 2026-07-31. Four lines in three files still said
otherwise, on a repository anybody can now read.

✅ **DONE 2026-09-25, ALL FOUR.** `research/SECRETS-ROTATION.md`: the heading
`RTMPS key still owed`, the `exposed and NOT yet rotated` paragraph, and the
`There is no rotate-key API for a Cloudflare live input` claim under it.
`BACKLOG.md` twice and `LAYOUT.md` once, both of which had copied the
delete-and-recreate ripple out of that third sentence.
🔴 **AND THE WRONG SENTENCE IS THE PART WORTH KEEPING, SO IT WAS CORRECTED
RATHER THAN DELETED.** `POST /stream/live_inputs/<uid>/rotate_keys` has existed
since 2026-07-31 and rotates IN PLACE, leaving the input UID alone, so nothing
in the repository needed editing. The file had said rotating meant DELETE AND
RECREATE with a new UID rippling through `demo/shell/live.mjs`, `workers/pub`'s
container and every demo that plays it. **That made a one-command fix read as a
scoped refactor, so a live exposed credential sat unrotated for two weeks.** The
cost of this class of staleness is usually a wasted lookup; here it was an open
credential, which is why the correction says so in the file rather than quietly
swapping the tense.
⚠️ **NOT RE-MEASURED TODAY.** The rotation is taken from `HANDOFF.md`'s
timestamp rather than from the API, deliberately: the way to confirm a live
input's key from here is to fetch the key, which is the exact call
(`GetStreamServiceSettings`, in clear) that caused the original exposure.

### Open 2026-09-24: more embedded knowledge into skills, and the .md files tidied

🔴 **ASKED:** *"add more of this embedded knowledge to skills. clean up .md
files"*, after *"the key is to use cf services in coherent composing way as
positron does"*.

✅ **THE COMPOSITION ITSELF IS DONE** and is in `positron-start` as eleven
numbered rules, measured rather than asserted: one Worker per capability, a
Durable Object that is both the room and the database, R2 as the archive tier
against Stream as the live tier, the browser doing the work the platform should
not, nothing opening on a visit, one list read by every renderer, a build that
enumerates, a deploy interlocked with verification, a handle on every page, a
build stamp in every device log, and an alarm rather than a poll.

⚠️ **WHAT IS STILL OPEN IS THE SWEEP, AND IT NEEDS SCOPING RATHER THAN
GUESSING.** Two halves:
1. **More embedded knowledge out of the pages and into the skills.** The
   candidates are the long red comment blocks in `demo/*/index.html` and
   `demo/shell/*.mjs` that are true of every task rather than of one page. The
   rule for moving one is already written in `CLAUDE.md`: move it VERBATIM, and
   leave its trigger behind in the table, because a rule nobody knows to load is
   a rule that is gone.
2. ✅ **The root `.md` files. DONE 2026-09-24.** The repository is public now and
   a stranger saw twelve of them at the top level. `README.md`, `AGENTS.md`,
   `LICENSE`, `NOTICE.md` and `CLAUDE.md` are the front door, and `HANDOFF.md`,
   `BACKLOG.md`, `LESSONS.md`, `PROGRESS.md`, `LAYOUT.md` and `SUMMARY.md` stay
   at the root with them, because they are named in `CLAUDE.md`'s own table and
   carry **291 references** between them. Two files moved with `git mv`:
   `research/measured-devices-2026-09-20.md`, a dated measurement that belongs
   with the research, **27** references rewritten in **17** files, and
   `research/SECRETS-ROTATION.md`, **7** in **6**. `LAYOUT.md` now records both
   moves and the reasoning.
   🔴 **AND THE MOVE WAS NOT THE FIX FOR THE KEY.** The repository is public and
   the file is already in git history, so it is still readable at its old path
   by anyone who clones. ✅ **THE KEY ITSELF IS ROTATED, 2026-09-24T19:08:11Z**,
   through `POST /stream/live_inputs/<uid>/rotate_keys`, which rotates in place
   and did NOT change the input UID, so `demo/shell/live.mjs`, `workers/pub` and
   every demo that plays it needed no edit. The delete-and-recreate ripple this
   line used to describe came from a wrong sentence in
   `research/SECRETS-ROTATION.md`, corrected 2026-09-25.
⚠️ **NOTHING HERE IS A DELETION.** `LAYOUT.md` decides where a file goes and
this is a `LAYOUT.md` question; the plans move of 2026-09-20 is the precedent,
and it cost 129 files holding a path by name.

### Open 2026-09-24: the repo goes public, and a README somebody can paste

🔴 **ASKED, VERBATIM, ACROSS FIVE MESSAGES:** *"make repo public. add to
readme a prompt how one can replicate similar setup with cf
https://developers.cloudflare.com/agent-setup/prompt.md etc. they should be able
to just paste repo url. a (meta?) skill next to it?"*, *"example: i want build
something like that stage demo"*, *"add gates: cf account? wranger? node? detect
envitonment. osx mostly. cf auth / tokens? paid nonpaid?"*, *"nondeveloper might
use it"*, *"explain why havin domain is prefeered"*, *"do it now"*

1. **A `README.md`, which this repo has never had.** `ls README*` finds nothing
   at the root. It is the file a stranger opens first and the only one written
   for somebody who does not work here.
2. **A prompt in it that a person can paste**, with nothing but this repo's URL,
   into Claude Code or another agent, and get a positron-shaped site of their
   own on Cloudflare. It hands off to Cloudflare's own
   `https://developers.cloudflare.com/agent-setup/prompt.md`, which is a system
   prompt that tells an agent to install the Cloudflare plugin and MCP servers
   ITSELF rather than asking the reader to run anything.
3. **A skill beside it**, so the instructions travel with the checkout:
   `.claude/skills/` is picked up by Claude Code in any clone.
4. **Gates, checked before anything is created**: an operating system (macOS
   mostly), node, wrangler, a Cloudflare account, whether that account is
   authenticated, and **whether it is a paid plan**, because some of what this
   repo uses is not on the free one.
5. **Written for a non-developer.** That is the constraint that decides the
   whole shape: every gate says what to do when the answer is no, and nothing
   assumes a terminal habit.
6. **Why a custom domain is preferred**, explained rather than asserted.

🔴 **AND THE AUDIT FOUND ONE THING THAT MUST NOT BE PUBLISHED, SO THE REPO IS
NOT FLIPPED IN THE SAME BREATH AS THE REST.** `New Pack.circuitpack` is
**reachable in history at `419ec5c`, 3,506,555 bytes**, verified with
`git cat-file -s`. CLAUDE.md says what it is in red: a complete backup of the
Novation Circuit on this desk, **29 sessions of somebody's real work**, their
ONLY copy since `tmp/` stopped being tracked, and the owner's words about it are
*"user sessions are mine. very important"*. A public repository hands that file
to anyone who clones it, and a clone cannot be recalled.
⚠️ **AND THE SAME BLOB IS CURRENTLY A BACKUP**, which is the bind. CLAUDE.md
names `git show 419ec5c:'New Pack.circuitpack'` as the recovery path, so a
history rewrite that drops it destroys the second copy at the same moment it
protects it. **The order is: copy the blob out to disk, verify 3,506,555 bytes,
THEN rewrite.**
🔴 **AND A SECOND ONE THE AUDIT FOUND THAT NOBODY WAS LOOKING FOR: TWO CHROME
USER PROFILES ARE IN HISTORY.** **857 files** under
`rig/moq/spike/logs/moq-4k-probe-udd/` and `.../moq-safari-pub-udd/`, added by
three commits (`469d237`, `880ceb8`, `d3f0cd0`), including `Default/Cookies`,
`Default/Login Data`, `Default/History`, `Default/Web Data`, `Default/Trust
Tokens` and `Local State`. **None of them is at HEAD** (`*-udd/` is gitignored
now), so this is history only, and history is what a clone gets. They are also
most of the repository's **191 MB**.
⚠️ Smaller findings, none of them a stop: `rig/moq/mtx/moq-key.pem` is a
committed PRIVATE KEY (a self-signed local cert for `moq-mtx-local`, so the
exposure is nil, but a scanner will flag it and it should not be in a public
tree); `research/SECRETS-ROTATION.md` publishes a map of past exposures, one of which it
said was still unrotated (`positron-demo`'s RTMPS key, ROTATED since, on
2026-09-24) and one in another repo it calls *"still public"*; there is **no LICENSE file**, so publishing
leaves everything all rights reserved by default; and the commits carry a WORK
email address on a personal repository.

✅ **EVERYTHING EXCEPT THE FLIP IS DONE 2026-09-24.**
- **`README.md`**, 142 lines, the first one this repo has had. It carries the
  paste block, the gate table in plain words, what is free and what is not with
  the numbers, why a domain is preferred in four reasons, and a map of the
  directories.
- **`.claude/skills/positron-start/SKILL.md`**, 240 lines, six gates and a
  worked decomposition of `/stage/` into the parts that are free and the one
  part that is not. Claude Code registered it on write, which is the proof it is
  discoverable in a clone.
- 🔴 **IT WORKS FOR CODEX TOO BECAUSE THE PASTE BLOCK NAMES THE PATH.** Asked
  as *"should work in claude and codex"*. Claude Code discovers
  `.claude/skills/` by itself; every other agent is told to read
  `positron/.claude/skills/positron-start/SKILL.md`. **One file, two doors**, so
  the two cannot drift apart, and the skill carries a line forbidding anything
  in it that depends on one agent's features.
- **The plan facts were re-read rather than remembered**, off Cloudflare's own
  pricing pages on 2026-09-24: Durable Objects ARE on the free plan (SQLite
  backend only), R2 free tier is 10 GB with free egress, **Stream has no free
  tier** ($5/1,000 minutes stored prepaid, $1/1,000 delivered) and
  **Containers are Workers Paid only**. So the honest answer to *"do I have to
  pay"* is no for most of the site and yes for live video.

### Done 2026-09-24: the title counts itself, and `instruments` changes hands

🔴 **ASKED, VERBATIM, TWO MESSAGES:** *"convert title to // positron: x media
art experiments // where x is num of demos in frontpage. html <title> stays
positron. deploy"*, then *"rename hardware to instruments, move knobs able
grains there. looper instrument  jam moves to ithers (timeline or messfgs or )"*

1. **The front page's `h1` carries the count.** `indexTitle()` in
   `demo/manifest.mjs`, counted off `byGroup()` rather than `DEMOS.length`,
   because the question is how many rows the PAGE shows: 58 against 59 in the
   array, `feedback` being `unlisted`. Baked by `workers/view/build.mjs` into a
   `<!--TITLE-->` marker in `menu.html` and set at load by `demo/index.html`,
   which is the same one-renderer-two-callers arrangement the rows already use.
2. **The tab stays `positron`.** Both index pages carried
   `<title>positron: media art experiments</title>`, so this is a change and not
   a no-op, and it is what the instruction says in words.
3. **`hardware` becomes `instruments`** and takes `knobs`, `able` and `grains`.
   ⚠️ That reverses the last line of the comment that created `hardware` on
   2026-09-21, which named those three as arguable and said they *"stay where
   they are rather than being swept in on an inference"*. This is not an
   inference, so the comment records the instruction instead.
4. **`looper`, `instrument` and `jam` leave**, which empties the old
   `instruments` group and frees the name for 3.

✅ **ALL FOUR DONE AND DEPLOYED 2026-09-24**, BUILD `e0158ba-130642-c980`,
version `069d9872-2d9c-422e-ac55-4f4cad16feff`. Read back off the live page
rather than off the build: `<title>positron</title>`, the `h1` reads
`positron: 58 media art experiments`, **58 cards**, **11 sections**
(`TH` `err` `instruments` `u:` `kurenniemi` `capture` `timeline` `streaming`
`messages` `technologies` `kit`).

✅ **MEASURED AT THREE WIDTHS BEFORE DEPLOYING**, because a longer name sits in
a flex row beside the Feedback button: 390 px wraps the name to TWO lines (h1
270 px, the button at x=296) and 756 and 1280 keep it on one. **Page overflow
0 px at all three**, which is the number that would have said this was a fault.

✅ **WHERE THE THREE WENT, AND ONE OF THEM IS ARGUABLE.** `jam` and `instrument`
to `messages`, `looper` to `technologies`. ⚠️ `instrument` breaks the wording
this file shipped an hour earlier, *"a relay carrying messages with no media in
it at all"*: the far machine's audio comes back over the same connection. It is
in `messages` because its readout is two LATENCIES and the audio is what makes a
late message audible, and `manifest.mjs` names it as the arguable row rather
than hiding it.

✅ **AND `stage` JOINED `TH` 2026-09-24** on *"move stage to th"*, out of
`capture`: it puts a church scene from a 2011 MIMproject performance in front of
an audience, so it sits beside `making`, that project's archive. 🔴 **THE GROUP
ID WENT `xr` -> `th` WITH IT**, because three of its six rows now have nothing to
do with a headset and the key was about to teach the next reader something
false. ⚠️ The `xr: true` FLAG on a row is a different thing and did not move:
`caps.mjs` reads it to offer a headset page, and `mirror`, `weight` and `floor`
still carry it, `floor` from another section entirely. Built at
`e0158ba-132955-eba3`, NOT deployed.

✅ **`workers/view/verify.mjs`'s TITLE ASSERT WAS ALREADY RED AND NOW IS NOT.**
It expected `POSITRON` while the tab read `positron: media art experiments`.
⚠️ **THAT FILE HAS OTHER STALE ASSERTS AND THEY WERE LEFT ALONE**: it counts
`li.pos-row` against `DEMOS.length + NOTES.length`, and the front page has drawn
`.pos-card` for weeks. It needs a real look rather than a line.

### Done 2026-09-24: the front page regrouped, and three demos retired

🔴 **ASKED, VERBATIM, IN ONE MESSAGE:** *"arvhice memento blocks and num demo.
move headset group first in index. rename to "TH". second group err, move floor
to err and the one what had err audio and video side by side. move making to TH.
rename vain to u:, move clic and vclick there. rname cvlick demo do ound. move
typist to th. timeline: leave ones who have timeline component. the rest merge
with technologies and split onto streamig (who steam smth) and messages (relyng
messages etc but not streaming) and rest is techologeis. show dev link asap"*

Every line below is one line of that, and almost all of it lands in ONE file,
`demo/manifest.mjs`: the `DEMOS` rows' `group`, and the `GROUPS` map that
decides both the order of the sections and what they are called. Two index
renderers read it (`demo/index.html` and `workers/view/build.mjs`), so there is
nothing to change in either.

1. **Archive `memento`, `blocks` and `num`.** `archive/demos/README.md` has the
   procedure: `git mv demo/<slug>/index.html archive/demos/<slug>-index.html`,
   drop the row from `demo/manifest.mjs`, write the section saying what it was.
   Each of the three is a single `index.html` with no other file beside it.
   ⚠️ All three are quoted by live code as the page that proved something:
   `/blocks/` by `xr-quit.mjs`, `xr-panel.mjs`, `xr-hands.mjs`, `seed.mjs`,
   `weight` and `tom`; `/num/` by `keyboard.mjs`, `numloop.mjs` and `nola`;
   `/memento/` by `cc-adapter.mjs` and `timeline/media-master.mjs`. Those are
   HISTORY and stay, but a live `href` to any of the three would now 404 the way
   `/kit/`'s card did after the `held` rename.
2. **Headset group first, renamed `TH`.** `GROUPS` order, `['xr', 'headset']`.
3. **A second group, `err`**, holding `floor` and `reel`.
   🔴 **THE FIRST ANSWER WAS `flipper` AND IT WAS WRONG.** `flipper` is the
   only page in the repository that holds ERR television and ERR radio at once,
   so a grep for `icecast.err.ee` beside a `<video>` finds exactly it and nothing
   else, and that is what I reported. Corrected in one line: *"it was not
   flipper"*, then *"what is demo where we had err video + radio (synced on not)
   and timeline?"*. It is `reel`, and the page says so at the top of its own
   stylesheet: *"ONE COLUMN PER MEDIUM: the newsreel on the left, the radio on
   the right"*, two lanes on one line, a day usually bringing a newsreel AND a
   radio programme. ⚠️ The lesson is that the search was for the SOURCE
   (a live ERR mount) when the ask was about the LAYOUT (two media side by side),
   and `reel` plays the archive rather than the live mounts, so it could not
   match. `flipper` stays where it is, `now` was not named either.
   🔴 **AND THIS REVERSES A 2026-09-16 INSTRUCTION THAT IS WRITTEN INTO
   `manifest.mjs` IN RED**: *"hide the ERR archive from frontpage"* and *"no err
   refs"*, said the evening ERR reported our connections corrupting their
   listener statistics. The pages never moved; the SECTION NAME did. Putting the
   name back is the thing that was deliberately removed, so the comment block
   above `GROUPS` has to record the reversal rather than be deleted.
4. **`making` to `TH`**, which empties the `mim` group.
5. **`vain` renamed `u:`**, with `click` and `vclick` moved into it.
6. **`vclick` renamed.** Slug rename, so directory + URL + every reference, the
   `radio1965` -> `radio` shape. The target name was not legible in the message.
7. **`typist` to `TH`.**
8. **`timeline` keeps the rows that have a timeline component; the rest merge
   into `technologies`, which then splits three ways**: `streaming` (streams
   something), `messages` (relays messages but does not stream), `technologies`
   (the rest).
   ⚠️ MEASURED before assuming: ALL NINE rows now in `timeline` call
   `createStripView` from `demo/shell/strip.mjs`, and after `click`, `vclick`
   and `typist` leave, the six that remain (`transport`, `lanes`, `loops`,
   `score`, `strip`, `draw`) all still do. So on the component test nothing
   merges, and the split of `transports` is the only part that moves.
9. **Dev link first.**

✅ **ALL NINE DONE 2026-09-24.** The front page is **12 sections over 58 listed
rows** (59 in `DEMOS`, `feedback` is `unlisted`), in the asked order:
`TH` `err` `hardware` `u:` `kurenniemi` `instruments` `capture` `timeline`
`streaming` `messages` `technologies` `kit`.

✅ **THE TWO AMBIGUOUS ASKS WERE ASKED ABOUT RATHER THAN GUESSED.** *"do ound"*
is `sound`, and the timeline split is the four pages whose SUBJECT is the
timeline. The measurement is why the second one had to be asked: the component
test separated nothing, because all nine rows mounted a strip.

✅ **`vclick` -> `sound`**, directory and URL and identity strings, plus
`manifest.mjs`, `shell/stack.mjs`, `shell.css`, `timeline/strip.mjs`,
`timeline/csound.mjs`, `timeline/lab/csound-test.mjs`, `workers/view/build.mjs`,
five plans, one research note and `positron-verify`. **`tarmoj/vclick` did NOT
move**: it is U:'s own repository, named in four files, and renaming it would
have pointed all four at nothing. MEASURED after: `node demo/verify.mjs sound`
is **23/23 with 11 page asserts**.

✅ **THREE PAGES ARCHIVED** to `archive/demos/<slug>-index.html` with a section
each in that README, and two claims they were carrying were repaired rather than
left to rot: `demo/weight/index.html` said `/blocks/` already graded the quit
badge the same way on load (it was weight's second opinion and is now its only
one), and `demo/tom/index.html` named `/blocks/` as the other `readout: null`
page, where twenty pages do that. `demo/verify-quest.mjs`'s usage example named
the slug too.

✅ **`CLAUDE.md` RECOUNTED** rather than remembered: **59 rows, 57 shelled**, and
`positron-history` had drifted to `54 of 56` and carries the rename now.

⚠️ **WHAT WAS NOT DONE, AND IT IS NOT FORGOTTEN:** nothing is deployed. The
build ran (`stamp e0158ba-120343-75bb`) so `workers/view/public/` matches, and
`positron.studio` still serves the old front page until somebody deploys.

### Open 2026-09-24: `/fau/`'s second round, and four wrong answers before the right one

🔴 **ASKED, VERBATIM, ACROSS SIX MESSAGES:** *"double border, rm"* with a crop,
*"add padding under nameplate"*, *"you ui skills are pathetic"*, *"its just
nonrounded bonbordered texateea between 2 glues"*, *"fau on off is missing
border"*, *"still double bottom border on fau textarea"*, *"add more left padding
to textarea in fau"*, *"can you have comments in fau file what lines do?"*

✅ **ALL DONE 2026-09-24. The record of the wrong answers is the useful half.**

🔴 **THE DOUBLE BORDER WAS NOT A BORDER AND IT TOOK THREE GUESSES.** Every
element in that subtree measured `0/0/0/0` or a control's own legitimate box, so
reading the CSS found nothing and I twice fixed something that was not broken:
first I removed the presence button's border, which is a real affordance and
came straight back as *"fau on off is missing border"*.
✅ **THE RECTS SAID IT IN ONE LINE ONCE I ASKED THE RIGHT PAIR.** The field
wrapper's bottom was **557.5** and the textarea's was **556.0**. A textarea is
`inline-block` and sits on a TEXT BASELINE, so its block parent reserves
descender space under it. That 1.5 px strip belongs to the wrapper, the wrapper
is transparent, and **a glue paints `--line` behind its children as the seam**,
so the page drew 1.5 px of seam colour, then the real 1 px seam. `display: block`
on the textarea. MEASURED after: both bottoms **563.0**.
⚠️ **AND THIS IS WHY IT SHOWED UP HERE AND NOWHERE ELSE.** Anywhere but a glue
the ground behind a child is the page's own background and invisible. Inside a
glue the ground is deliberately a line colour, so **every stray pixel of layout
becomes a visible line**.

✅ **THE NAMEPLATE, AND IT IS THE THIRD TIME THIS COMPONENT HAS BEEN REPORTED FOR
IT.** `shell.css` gives the plate `padding-block: var(--panel-pad) 0`, zero at
the bottom, which is correct while something FOLLOWS it because `.panel-strip`
brings its own. Emptying the strip exposed the zero: MEASURED `gap under plate
0.0px`. `/tom/` fixed the TOP half of this privately once, every later page
inherited the defect and not the fix, and it was re-reported on `/plai/` as
*"you failed afain on nameplate padding"*.
🔴 **SO BOTH FIXES WENT IN THE COMPONENT, NOT THE PAGE**, and the page-local
`:empty` rule written an hour earlier was deleted. `:has(> .panel-strip:empty)`
makes it provably narrow: MEASURED, the three pages that build an instrument add
**62** (`/kit/`), **5** (`/fau/`) and **4** (`/muta/`) blocks, so exactly one case
in the repository is empty and exactly one page changes. `/muta/` re-run to prove
it: **51/51 with 45 page asserts, unchanged**.

✅ **LEFT PADDING 16 px, TOP 14**, on `.pos-field.fau-src textarea`, which is a
`(0,2,1)` TIE with `shell.css`'s `.pos-field.tall textarea` and not an
escalation. The first attempt at `(0,1,1)` lost to that rule's `padding: 7px 9px`
shorthand and the computed value read 7 px while the source read as correct.

✅ **THE PATCHES CARRY COMMENTS NOW**, one per line that does something a reader
cannot guess: what `<:` splits, what `_` is, that `en.adsr`'s third number is a
level and not a time, that FM is the carrier being BENT rather than added to, and
that `3.51` is the whole bell.
⚠️ **AND THE BOX WAS RESIZED TO WHAT IT NOW HOLDS.** At `rows: 12` the longest
preset was cut through the middle of `process`, which is the one line a reader
most needs. MEASURED: the four presets are **14, 16, 6 and 13** lines with their
comments, so `rows: 16` is the longest of them rather than a number that looked
about right.

MEASURED throughout: `/fau/` **45/45 with 39 page asserts**, unchanged across
every state of this.

### Open 2026-09-24: `/fau/`'s panel, four asks and one of them is a repeat

🔴 **ASKED, VERBATIM:** *"fau: as i told you: input edge to edge of container w,
add paddign on top, add line in top. glued instrument feel like waveforms on
muta"*.

⚠️ **AND *"AS I TOLD YOU"* IS THE PART TO READ FIRST.** Edge to edge was already
asked on 2026-09-23, quoted in the page's own comment as *"create instument
panel, fau on top right, below the textarea (edge to edge), below it footer with
on/off"*. It was built and it is not edge to edge, so this is the second time of
asking and the first answer was wrong.

✅ **ALL FOUR DONE 2026-09-24, AND THEY WERE ONE CHANGE RATHER THAN FOUR.**
The last clause is the answer to the other three: `/muta/` passes its wave shape
as **`parts: [scope.el]`** and this page was calling **`inst.add(source.el)`**.
`instrument.mjs` already spells out the difference in its own words: `add()` puts
something INSIDE the case, where it scrolls with the panel and sits within the
case's inset, and a part is its own surface with the glue's seam either side of
it, *"the same edge the bar has, at the same width"*. So moving one line gave
edge to edge and the top line at once, and only the top padding was a rule.

🔴 **WHY `edge to edge` HAD TO BE ASKED TWICE: THERE WERE FOUR BOXES INSETTING
IT AND THE PAGE'S COMMENT COUNTED THREE.** The 2026-09-23 answer zeroed
`.panel-strip`'s padding on both axes and named the strip's gap, the strip's pad
and the field's label. The fourth is **`.panel-case` itself**, `padding: 0
var(--panel-pad)` with `--panel-pad: 20px`, on the case. **A child cannot reach
its way out of its parent's padding however many of its own rules say 0**, so the
text was 20 px short at both ends while every rule about it read as correct.
⚠️ AND THE REPAIR IS NOT A FIFTH OVERRIDE. It is a different slot: as a glue part
the text is a sibling of the case rather than a child, so there is no padding
left to fight.

✅ **MEASURED, NOT EYEBALLED.** Case, text and footer bar all span **107 to 793**
inside a glue of 106 to 794, which is the glue's own 1 px border. The field
carries `padding-top: 10px` and the glue's 1 px seam is the line above it.

🔴 **AND THE MOVE EXPOSED AN EMPTY BOX, WHICH IS WHY THIS IS FIVE THINGS AND NOT
FOUR.** With the text gone the case was a **71 px band holding one word**, with
an empty **40 px strip** inside it whose whole height was `padding-block:
var(--panel-pad)`. `.fau-panel .panel-strip:empty` collapses it and the case is
**31 px** now. The plate was measured rather than hoped for: it sits in the
case's top inset at 748.5 px and `FAU` is still top right, where the 2026-09-23
ask put it.
⚠️ **PAGE SCOPED ON PURPOSE.** Any case with a plate and no controls has this, so
it looks like a `shell.css` fix, and making it one would change every instrument
page from inside a task about one.
⚠️ **AND EVERY RULE ABOUT THE FIELD WAS RE-KEYED OFF ITS OWN CLASS**, `.fau-src`,
because they all named `.fau-panel` as an ancestor it no longer has. That is the
dead selector this stylesheet has now measured five times.

🔴 **AND IT SHIPPED WRONG ONCE, REPORTED AS *"its a mess"* WITH A CROP.** The top
padding was put on the PART, which also carried `background: var(--card)`, so the
page drew **case, seam, a second band of the same dark, then the well**: two
bands of one colour with a line between them, which is furniture rather than air
above the text. **Air inside a box belongs to the box.** The padding is the
textarea's own now and the part carries no background, so the input is one
unbroken surface from the seam down.
🔴 **AND THE CORRECTED RULE LOST ITS FIRST FIGHT, MEASURED RATHER THAN
REVIEWED.** `.fau-src textarea` is `(0,1,1)` against `shell.css`'s
`.pos-field.tall textarea` at `(0,2,1)` setting `padding: 7px 9px` as a
SHORTHAND. Weight decides before order does, so the computed value read **7 px**
while the source read as correct. The border on the same element DID win, because
the rule it beats is `(0,1,1)` and a tie goes to the later sheet.
✅ **`.pos-field.fau-src textarea` IS A TIE AND NOT AN ESCALATION**, which is the
smallest thing that can win. MEASURED after: `padding-top: 14px`.

MEASURED: **45/45 with 39 page asserts, identical across all three states of this
change**, so nothing went silent.

### Open 2026-09-24: the remote looper, and the distributed instrument behind it

🔴 **ASKED, VERBATIM:** *"in bg, plan the "remote looper" feature. I am in
desktop browser, midi keyb connected but i want mobile browser on same webpage
have 3x3 grid buttons to toggle the looper"*, and a message later *"think wider
of distributed instument (parts) like this"*.

**The shape.** The desktop browser holds the MIDI keyboard and the sound. The
phone, on the SAME page, shows a 3x3 grid that toggles the looper's slots. So
one instrument, two devices, and the phone is a control surface carrying no
audio.

**What already exists and is not to be rebuilt.**
- `demo/shell/numloop.mjs` is the state machine, 15 checks in `numloop-test.mjs`,
  no browser needed.
- `createKeyboard` in `demo/shell/keyboard.mjs` holds the ten takes and puts
  `Loop` left of `Sustain`. Playback calls `press(k, 'loop')`, so a looped note
  reaches a page's `onDown` exactly as a finger does.
- `/num/` is the bench with the telephone keypad, MIDI in and program change
  mapping. Ten slots exist; a 3x3 grid is nine of them, and which nine is a
  decision the plan has to make rather than assume.
- `workers/items` already gives every room its own Durable Object by
  `idFromName(room)`.

**What is open in it.** Whether the phone drives the desktop's `numloop` over a
relay or runs its own copy, what happens when the two disagree, what a press
costs in latency against a lap of 250 ms minimum, and whether the page is one
URL that decides its role or two.

⚠️ **AND THE SECOND ASK IS THE LARGER ONE.** *"think wider of distributed
instrument (parts)"* is not this one feature, it is the pattern: an instrument
split across devices, each part carrying what that device is good at. The plan
covers the pattern and this feature is its first instance.

✅ **PLANNED 2026-09-24, `plans/plan-remote-looper.md`, 1,055 lines. THE PLAN IS
DONE AND THE FEATURE IS NOT, SO THIS STAYS OPEN.** The recommendation, so the
decision is in this file and not only in that one: **one URL with
`?role=controls`**, following `/moq/`'s existing `?role=` rather than inventing a
spelling; **the phone sends a PRESS and never a state** and holds no copy of the
machine; the desktop **broadcasts all ten states on every change and every 2 s**;
the grid is **3x3 of slots 1 to 9 with slot 10 in a fourth row**, which is
`/num/`'s existing `createPadGrid` call with two disabled blanks; and the new
code is **one kit module, `demo/shell/part.mjs`**, which owns the seam and knows
nothing about loops.
🔴 **THE RULE THE WIDER ASK PRODUCED: NEVER SPLIT THE CLOCK.** The part that
makes the sound owns time and everything else sends gestures and receives
pictures. A seam is cheap in proportion to how much lateness it can absorb, and
a clock can absorb none because lateness IS the product.
⚠️ **AND THE NUMBER NOBODY HAS: no measurement in this repository describes a
phone's leg to the relay.** Every figure quoted is a laptop on this desk, and the
two recorded relay runs disagree six-fold on the hop. Section 3 of the plan is
inference until a phone posts its own round trip to the device log.

### Open, carried in from HANDOFF.md on 2026-09-24

🔴 **THESE SIX LIVED IN `HANDOFF.md` UNDER `Still open` AND NOT IN THIS FILE,
WHICH IS THE WRONG FILE BY THIS PROJECT'S OWN RULE.** `## Open` here held
nothing unfinished at all: every bullet above the 2026-09-18 audit divider is
struck. So a background agent reading the backlog to find out what was wanted
would have found an empty list and a wall of finished work, and the four live
asks were invisible to it. Moved rather than copied, and `HANDOFF.md` points
here now.

- ✅ **DONE 2026-09-24. `/fau/`: *"rm compile button next to fau on"*.** It was
  the only entry left in `.pos-controls` after the presets moved to the panel
  footer on 2026-09-23, so the page now declares no `controls` key at all and
  `shell.mjs` hides the empty row, which it has to: that row carries 14 px under
  it and a band of dead space reads as something that failed to render. `lanes`
  and `draw` were already in that shape.
  ✅ **THE PRESS IT REPLACED WAS NOT MISSING TO BEGIN WITH.** The page compiles
  `AUTO_IDLE_MS` after typing stops, which is what `ONE` and the index line both
  already said in the words a visitor reads, and the switch compiles what is in
  the box the moment it goes on. Neither string needed a word changed, which is
  the tell that the button was a fifth road to the same place.
  🔴 **WHAT IT COST WAS THREE ASSERTS READING `d.button('compile').disabled` AS
  EVIDENCE OF POWER STATE, AND DELETING A CONJUNCT IS COVERAGE LOST AT A COUNT
  THAT DOES NOT MOVE.** The claim those clauses carried, that nothing can start a
  compile on a page nobody switched on, is asserted on the autocompile now: the
  check arms one with the instrument off and measures `autos`, `runs` and
  `node`. It is the better instrument, because a `disabled` attribute is a
  statement about one control and this is a statement about the only road left.
  ⚠️ **AND IT IS TWO ASSERTS RATHER THAN ONE BECAUSE OF LESSONS #113**: the full
  idle wait plus a margin is longer than three quiet polls, so it is split at
  500 ms and each half says something true on its own.
  ✅ **A REAL GUARD MOVED WITH IT.** The deleted handler's own comment recorded
  that the guard belongs INSIDE the queued task and not on the button, because a
  press already on the queue when the switch goes off underneath it is exactly
  the order a check runs in. The autocompile had that hole: `fireAuto` tested
  `powered` before queueing and the queued task never tested it again. It does
  now, before `autos++` so a refused task does not move the counter every
  autocompile assert is written against.
  ⚠️ **TWO COMMENTS WENT STALE THE MOMENT THE ROW EMPTIED** and were rewritten
  rather than deleted: one explaining why `autos` is separate from `runs`, one
  explaining why the whole block is a single `serial`. Both named a harness
  COMPILE press that no longer happens, and both arrangements are still right
  for a reason that outlived it.
  MEASURED: baseline **43/43 with 37 page asserts**, after **45/45 with 39**,
  which is exactly the two added and nothing gone silent, stable across two runs,
  and the page's last assert still runs so nothing was truncated.

- ⚠️ **`/fau/`: *"secondary. should shimmer"*, and it names no subject.** There is
  no shimmer anywhere in `demo/fau/index.html`, MEASURED by grep on 2026-09-24,
  so there is nothing to change and nothing to point at. It needs one word from
  the person who asked: WHAT should shimmer. Blocked on that and not on work.

- ⚠️ **"move instrument to patch seletor below instrument on right, no
  randomizer"**, asked with no page named, and asking got no answer. Candidates
  are the pages that have both an instrument and a patch selector. Blocked.

- 🔴 **THE MK-425C IS DESCRIBED AS A SEMITONE FLAT IN 11 FILES, AND THE CLAIM IS
  NOT WRONG SO MUCH AS UNQUALIFIED.** MEASURED by grep 2026-09-24, excluding
  `archive/` and build output: `demo/evo/index.html`, `demo/bay/index.html` (2
  places), `demo/nola/index.html` (3), `demo/wish/index.html` (2),
  `demo/shell/bay.mjs`, `demo/shell/bay-test.mjs`, plus `PROGRESS.md`,
  `HANDOFF.md`, `research/measured-devices-2026-09-20.md`, `plans/plan-nola.md` and
  `plans/plan-patchbay.md`.
  ✅ **AND ONLY TWO OF THE 11 ARE TEXT A VISITOR READS**, which is the number
  that matters and which the handoff's "seven files" did not separate:
  `demo/wish/index.html:1354`, the `CHANNELS` entry reading *"Sends on channel 2,
  one semitone flat."*, and `demo/nola/index.html:3923`, a diagram box note
  reading *"The one on this desk also arrives a semitone flat, which is what the
  TRANSPOSE control is for."* The other nine are comments and documents.
  🔴 **THE FACT IS THAT THIS UNIT MEASURED 47 TO 71, NOT THAT THE MODEL IS
  FLAT.** `research/evo-mk425c-face-2026-09-21.md` looked for a starting note in
  all three manual PDFs and it is not there; the MIDI Implementation Chart leaves
  `True Voice` as asterisks, which is the chart declining to answer. **47 to 71
  is consistent with a factory 48 to 72 plus a stored transpose of minus one**,
  and the instrument has a transpose function with exactly that resolution.
  ✅ **AND IT IS TESTABLE FOR FREE, WHICH IS WHY THIS IS NOT A WORDING TASK
  YET.** The manual's non-volatile memory list names controller and channel
  assignments, drawbar mode, DATA LSB and MSB, global channel and last used
  preset. **Octave and transpose are absent from it.** So switch the keyboard off
  and on and play the bottom key. **48 means somebody left a live transpose set
  and the instrument is ordinary. 47 means transpose survives a power cycle and
  the manual's list is incomplete.** Either answer decides how those 11 files get
  worded, and neither costs anything.
  ⚠️ **A FACTORY RESET IS NOT THE FREE TEST.** It is hold `+/-` while switching
  on and it *"will erase all setups stored to memory"*.
  ⚠️ **AND NOBODY IS TO "FIX" THE DRAWING.** `createKeyboard` picks black or
  white from the OFFSET off the base note, so `/evo/`'s `base: 47` draws the
  right C-to-C shaped 25 key picture and only the printed NAMES carry the minus
  one. Changing the key pattern would draw an instrument that does not exist.

- ⚠️ **`/circuit/` reads 33/34 on a printed-names inset.** Pre-existing, and
  proved to be so rather than assumed.

- ⚠️ **`/nola/` timeline order has no assert.**

- 🔴 **NOT SETTLED: WHETHER THE LOOP REALLY KEEPS TIME, AND ONLY A PERSON CAN
  SETTLE IT.** The `/kit/` drift check is COARSE, measured rather than suspected:
  the same sabotage run twice gave **8 ms** of growth over five turns and then
  **1.5 ms**, and 1.5 passes. Separating drift from jitter properly needs about
  twenty turns, which is five seconds, and `verify.mjs` stops growing about two
  seconds after the last new assert. The instrument exists and is committed at
  `demo/resources/read-loop-take.mjs`:

  ```sh
  # open https://positron.studio/nola/?rec=1 , play, loop something, let it turn,
  # press SAVE TAKE, then
  node demo/resources/read-loop-take.mjs ~/Downloads/nola-take-*.json
  ```

  It reads `plays`, which is what SOUNDED with `how` saying finger or lap, and
  not `events`, which is the wire and can say nothing about a loop.

### Done 2026-09-23: the numpad looper, and the `Loop` that ended up on the KEYBOARD instead

🔴 **THE STATE MACHINE SHIPPED AND THE `/nola/` MODE DID NOT, AND BOTH WERE
INSTRUCTED.** Asked as *"Add second mode 'Looped' (move typed to third)"* with
`/evo/`'s numpad driving it, then *"forget about looped button for now"* and
*"lets get num right"*, and finally *"wait make it a keyboard funcion, a button in
bottom rihjt (left from sustain) called 'Loop'"*, closed with *"do not wire nola,
its gloabl keyboard fn. nola gets just chords as if i played htem"*.

✅ **`demo/shell/numloop.mjs` IS THE MACHINE, GRADED WITH NO BROWSER**, 15 checks
in `numloop-test.mjs`. `/num/` is the bench, 19/19, with the telephone keypad, MIDI
in and program change mapping so `/evo/`'s own number keys drive it.
⚠️ **ONE RULE CHANGED WHILE IT WAS BEING BUILT**, asked as *"when doubleclick on
empty slot, it stops others possible loops playing and starts rec"*, so the table
above is wrong in its last row: a double press on an EMPTY slot silences every
other looping slot and records, and only a slot with something in it is cleared.
It stops them rather than clearing them, because *start over* is about what you
can hear.
✅ **`/num/` EARNED ITS KEEP ON THE FIRST RUN** by catching that `onTouch` fired
BEFORE the press was booked, so a page painting its lamp from `pending()` read
false and the key never lit. The arithmetic was right and the handover was not,
which is not a thing grading the state machine would ever have shown.

✅ **AND THE LOOP IS A KEYBOARD FUNCTION, NOT A `/nola/` MODE.** `createKeyboard`
takes `loop: true` and puts a `Loop` toggle left of `Sustain`; the tape attaches at
the `press`/`release` funnel, whose own comment had already named that spot as
where a recorder would go. Playback calls `press(k, 'loop')`, so a looped note
reaches every page's `onDown`/`onUp` exactly as a finger does and `/nola/` hears
chords without knowing a loop exists.
⚠️ **`createToggle` IS TWO STATE AND THIS IS A THREE PRESS CYCLE.** Press two turns
the button off, which is what closes the take, and then quietly puts it back on
with `set(true, true)`. The first version called `set(true)` twice, which fires no
`onChange`, so four movements taped and ZERO notes ever came back.
🔴 **A LAP HAS A FLOOR OF 250 ms AND `/kit/` IS WHAT FOUND IT.** That check presses
four keys with no waiting between them, so the take was a few milliseconds long
and the loop turned **118 times in 260 ms**, which is a stuck note with extra
steps. A person cannot play a take that short but CAN arm the button and press it
again straight away, which is the same take. The floor is on the lap and never on
the events, so two quick notes still play where they fell.
⚠️ **THE `/nola/` PICKER KEPT ITS TWO OPTIONS**, so `modePick.buttons[1]` still
means `Typed` and no check moved by an index.

MEASURED: kit 205/205, nola 89/89, knobs and pack 79/79, num 19/19, numloop 15 ok.
Transport `LOOP` is `Loop` on the bar and in both pages that assert on it.

- ✅ **BOTH PAGES ASSERT THE REFUSAL BOUNDARY NOW, AND THE SABOTAGE IS THE
  PROOF.** 2026-09-18. `/flipper/` 8 page asserts to 11, `/now/` 20 to 23. With
  `fake-err.mjs`'s `serves()` forced to `return true`: **4 red, 2 on each page**,
  RE-RUN INDEPENDENTLY rather than taken on report, and the failure text is
  legible at a glance (`............` where a working run draws `#######.....`).
  The negative controls stay GREEN under the same sabotage, which is what they
  are for. The evidence comes from a survey of all three channels, because the
  one channel a page opens wears one of three shapes and a finder that always
  answered "nothing is blocked" would read exactly like a quiet day.
  ⚠️ **AN EXPIRED SEGMENT LOOKS LIKE A REFUSED ONE AND NEARLY BOUGHT A FLAKE.**
  The first run read `#.......#####`, two boundaries where there is one: the
  oldest probed point fell off the back of the window between the playlist read
  and the ask. `err-live.mjs` fact 2 says to probe only segments from the
  playlist just read, and that is necessary and NOT sufficient, because a
  thirteen point sweep takes seconds and the window slides while it runs.
  Membership has to be evaluated at PROBE time. Points no longer in the freshest
  playlist are dropped and the count is printed.

- ✅ **`/now/` PLAYS THROUGH A REFUSED LIVE EDGE.** `findServedEdge` came out of
  `/flipper/` into `demo/shell/err-live.mjs` and both pages call it, so the
  original is not the only caller. MEASURED against `fake-err.mjs`'s `/wall`:
  **7 page asserts red and a black picture before, 0 red of 23 after**, reading
  `53.1 min behind, and ERR refuses the newest 52.9 min`. LIVE now means the
  newest frame ERR will hand over rather than the newest it lists. Two asserts
  carry two bands, each naming which case it is in, because the page has two
  honest answers.
  ⚠️ **THE HARNESS STILL POINTS `/now/` AT THE DEFAULT ARRANGEMENT**, and this
  time that is a choice rather than a setting standing in for a fix: `/flipper/`
  at `/wall` grades a picture playing through a wall, `/now/` on the default
  grades one at a live edge, so both modes run every time and each page's finder
  is graded against all three shapes by its own survey. One line flips it.

- ✅ **`/flipper/` GOES RED AGAINST A BROADCASTER THAT IS NOT THERE.** MEASURED
  with `?base=` at a closed port: **4 page asserts red of 11**, where all 8 used
  to pass. `the selected channel is open or loading` was satisfied by `!!c.hls`,
  true the instant `new Hls()` returns. It is `the selected channel received
  picture, not just an object` now: `etv 238 fragments, 6542 KB, 165 frames
  decoded` when it works, `0 fragments, 0 KB, 0 frames decoded` when it does not.
  ⚠️ **THE FRAME COUNT IS CUMULATIVE AND THAT IS THE WHOLE TRICK.** `readyState`
  is an instant and the check runs one line after a seek, which empties the
  buffer, so a WORKING page read `readyState=1`. `totalVideoFrames` counts what
  the element has ever decoded and a seek does not reset it.

- ✅ **DONE 2026-09-18. THE CARET BUG, AND IT WAS NEVER THE FILE.** Reported as
  *"there is not caret in arvhice playback"* and diagnosed wrongly TWICE as
  MediaRecorder carrying no cues.
  🔴 **`mediaMaster` DOES NOT RUN ITSELF AND `/stage/` NEVER TICKED IT.** Its own
  docstring says to call it from the rAF loop you already run and `/crate/`
  carries the same warning; the page built the object and drove it zero times,
  so the archive's deck was never once driven by its element. MEASURED: the
  element went to 1.00s of a 3.45s recording, `ended` false, `seekable`
  0.00..3.45, while the deck sat at 3.45s. **`master ticks 0, backstop 0,
  driving false`** is the line that said it, and printing three counters settled
  in one run what guessing had not in three.
  ⚠️ **AND THE SEEK CHECK PASSED THROUGHOUT**, because it asks the ELEMENT where
  it went. Every assert about that archive was on the one side of the join that
  worked.
  ⚠️ **A SECOND, REAL GAP IN SHARED CODE FOUND ON THE WAY**: `mediaMaster`
  listened only for `timeupdate`, and a paused element fires none and produces
  no rvfc frames either. Seek a paused master and every sensor goes quiet at
  once. It listens for `seeked` too now. **`/stage/` is 38/38.**

- ✅ **DONE 2026-09-18. THE AUDIENCE'S WAITING CARD IS GONE.** It said in two
  sentences what the presence badge says in one word. The check that guarded it
  CHANGED rather than going: it read `.pos-card`, and the claim was never about
  a card, it is that the audience is shown no `<video>` before there is anything
  in one.

- ✅ **DONE 2026-09-18. `/stage/` GOT A BACKGROUND, AND IT IS NOT ERR.** Asked as
  *"turn on the err feed in the bg"* and settled a message later with *"i just
  need some video there. look for suitable PD sources? can be historic stuff or
  whatever"*, which dissolved the whole problem: the ask was a picture, not a
  broadcaster. **The Dickson Experimental Sound Film, 1894 or 1895**, the
  earliest known film with live-recorded sound, which is on subject as well as
  free: the first attempt to publish picture and sound together, behind a page
  that publishes picture and sound together.
  🔴 **CHOSEN ON TWO INDEPENDENT PUBLIC DOMAIN GROUNDS RATHER THAN ONE:**
  published 1894, so copyright has expired everywhere, AND the Internet Archive
  item carries an explicit dedication (`licenseurl`
  `creativecommons.org/licenses/publicdomain/`).
  ⚠️ **THE ON-THEME CANDIDATE WAS REJECTED AND THAT IS THE POINT.**
  `corpus.json` holds Kurenniemi's own `Computer Music (1966)`, perfect for this
  and marked `licenceConfidence: LOW`, `holder: uploaded by a member of the
  public`. A public domain mark self-asserted by an anonymous uploader on a 1966
  Finnish film is not a clearance. That field exists so the convenient answer
  does not win for being convenient.
  ⚠️ **FETCHED ONCE AND SERVED FROM OUR OWN ORIGIN.** `demo/resources/`, so
  `/resources/dickson-1894.mp4`, same origin, no CORS, no visitor request
  leaving this site. A public domain film on archive.org is still archive.org's
  server. Provenance in `dickson-1894.json` beside it.
  ⚠️ **11.4 MB to 2.33 MB, a 4.7x saving, SOUND KEPT.** It was stripped first on
  the reasoning that the page mutes the background, which was wrong: the
  live-recorded sound is the entire reason the film matters, and keeping it cost
  0.54 MiB. A file is an artefact, not only an input to one page.
  🔴 **AND THE BUILD SILENTLY DECLINED TO COPY IT.** `.mp4` was not on the
  allowlist, so it shipped the provenance JSON, dropped the film, and reported
  `copied 182 files`. The page would have carried a `<video>` pointing at a 404.
  Third time that allowlist has failed that way, after `.webmanifest` and the
  `dust` excerpts. `.mp4` and `.m4v` added.
  ⚠️ **THE ERR ROUTE IS UNTOUCHED**: still opt-in on `?bg=<slug>`, still
  unreachable by a harness, and the rights question it raises is still the
  user's rather than answered by default.

- ✅ **DONE 2026-09-18. `How it works` LIVES IN THE CONTROL ROOM AND THE
  ARCHIVE.** Two instances from one spec, `atEnd: false` because `atEnd`
  appends to `document.body` and ignores the host. The audience panel gets none.
  🔴 **AND THE CUTS CHECK WOULD HAVE PASSED BY NEVER LOOKING.**
  `getComputedTextLength()` answers 0 under a hidden ancestor, so a diagram in
  an unselected tab reports NO CUTS however badly it is cut. The check asserts
  `dg.measured` and selects each tab first. **MEASURED: both panels measured,
  nothing cut.**

- ✅ **DONE 2026-09-18. START AND STOP ARE A TRANSPORT BAR.** `live: true` so the
  clock is a LIVE chip, `scrub: false`, `loop: false`, and `showDeck` really
  runs, so the playhead is how long the show has been on air. **The check
  PRESSES the bar rather than calling `startShow()`**, because a bar wired to
  the wrong command would have left every assert below it green, measuring a
  show only the check knew how to start.
  🔴 **IT EXPOSED TWO REAL DEFECTS IN SHARED CODE.** `__demo.transport` was
  whichever bar was BUILT LAST, so a page with two bars published the wrong one:
  `publish: false` now lets a page say. And `verify.mjs` clicked
  `document.querySelector(".tbar-toggle")` while asserting about
  `__demo.transport`, which are the same element only on a one-bar page: it
  presses the graded bar's own toggle now, and `el` was added to the api for it.
  **MEASURED: `/stage/` 37/38, and 521/522 across the 21 demos that carry a
  bar**, the one red being the rewind defect above.

- ✅ **DONE 2026-09-18, FOUR SMALL ASKS ON `/stage/` IN ONE PASS.** **35/36**,
  the one red being the rewind defect above.
  - **The archive opens on a 15s window**, MEASURED at 15.0s on screen, and
    **zoom out is bounded at 4x it**. That bound did not exist to be raised:
    `capPps` floored at 1e-30 px/s, so a reader could wheel until a recording
    was a thousandth of a pixel. `maxSpan` is a new strip option, OFF by
    default so none of the other twelve strip pages move, and `/stage/` is its
    first caller. Proved by asking for a thousandfold zoom out and asserting
    where it stopped, with `S.zoom.by` naming `max-span` so a bound that fired
    is distinguishable from a wheel that did nothing.
    ⚠️ **THE BOUND TAKES THE RECORDING WHEN THE RECORDING IS LONGER**, because a
    bound that hides the thing a reader came to look at is a bug rather than a
    bound. And the expression lives in ONE place: it was written twice for one
    run, once in the option and once in the assert grading it, and they
    disagreed immediately.
  - **`diagram cuts: [object Object]` is gone.** A cut is `{ id, where, full,
    shown, width }` and the page joined the objects. `/kit/` had the formatting
    all along, so a page had invented its own way of printing a structure
    another page already printed properly. It is an ASSERT now, not a whispered
    log line, which is how six survived a deploy unread.
  - **And the six cuts were real, at PHONE width only.** Three subs were over
    the box's ~14 characters: `1280x720, 25fps`, `700k, 2s pieces` and `WHIP in,
    WHEP out`. One of the three had been added the same morning.
  - **Every button is secondary.** `Send` no longer carries `pos-pri`.
  - **The question defaults to "Kas Manfred MIM on olemas", Jah and Ei**, third
    option left empty as before.

- ✅ **DONE 2026-09-18. `/now/` AND `/flipper/` CONTACT NOBODY.**
  `demo/fake-err.mjs`, the third stand-in after `fake-station.mjs` and
  `fake-tapes.mjs`, and the last pair of pages still pointed at a broadcaster.
  **MEASURED, and re-run independently rather than taken on report: 52/52 with
  the only hosts contacted being the dev server and the stand-in.** Cold build
  **55.4 s and 105 MB**, cached in the system temporary directory; the media
  playlist is 126 KB over 3600 segments and 120.0 min.
  `demo/shell/err-live.mjs` gained `errUrl()` and a `?base=`, `/now/`'s schedule
  fetch routes through it (it is on `www.err.ee`, and was the one live URL left),
  and `/flipper/` now imports `CHANNELS` rather than holding a fourth copy.
  ⚠️ **IT REPRODUCES THE REFUSALS**: 403 with no `access-control-allow-origin`,
  on rights-blocked segments AND on ones off the back of the window, in the three
  shapes measured on 2026-09-06, verified by a 13-point sweep.
  ⚠️ **NO BURNED CLOCK IN THE PICTURE.** `ffmpegFilters()` needs `drawtext`,
  which needs libfreetype, and the ffmpeg on PATH reports zero of them.
  `src/publish.sh` pins `ffmpeg@7` for this and says so. Skipped rather than
  half-done.
  ⚠️ **AND IT LEFT THREE HOLES BEHIND IT, ALL IN `## Open` ABOVE**, which is the
  point of building the thing: a page nobody could run was a page nobody could
  find holes in.

- ✅ **AND ONE WAS FIXED ON THE SPOT: `/flipper/`'s CHECKS DID NOT RUN ON A
  WALLED CHANNEL.** The `live` handler jumped to the newest served frame and
  `return`ed past the `await d.run('check')` that is the only thing on the page
  that runs them. **2 asserts against 8, and the suite read GREEN having graded
  nothing.** It was invisible because which branch fires depends on what ERR
  happens to be blocking that day. The jump is a function now and the checks sit
  outside it, so none of its three exits can take them.

- ✅ **DONE, AND THE NUMBER IT WAS DECIDED AGAINST WAS NOT IN THE TABLE.** *"What
  we do with r2 save? Show can be 3hr"*, asked 2026-09-18. **THE PICTURE IS
  700 kbit/s AND THE SOUND IS 96, SO A THREE HOUR SHOW IS 1.07 GB**, set on
  `/stage/`'s recorder as `videoBitsPerSecond` and asserted.
  🔴 **WHAT WAS THERE BEFORE WAS THE BROWSER'S DEFAULT, AND IT MEASURES
  2,500 kbit/s.** The page passed no rate at all, so this was never a choice
  between the rows of the table: MEASURED by deleting the rate again and reading
  `videoBitsPerSecond` back off the recorder, three hours of the default is
  **3.38 GB**, worse than the 2 Mbit/s row somebody would have picked as the
  extravagant end, and **134x** the 24 MiB an `ingest` session may hold.
  ⚠️ **AND THE FIRST ANSWER TO THIS WAS 1.167 Mbit/s, WHICH IS A REAL
  MEASUREMENT OF THE WRONG THING.** That is the rate of
  `proto/selfrec/artifacts/a1-concat.webm` (13,134,293 bytes over 90s), and
  selfrec's own note says that file was recorded at a **request** of 1200 kbit/s.
  A rate somebody asked for is not a default. It was believed for an hour
  because it came off a real file with a real number beside it, and what
  corrected it was breaking the assert on purpose.
  **What decided the value, given that the file size is free:**
  - **Money is not an axis.** 1.08 GB in R2 is about 1.6 cents a month and 5,400
    writes about 2.4 cents a show. Every row from 691 MiB to 3.38 GB costs
    nothing worth arguing over, and reaching for cost first is how this sat
    undecided.
  - 🔴 **THE SCARCE THING IS THE UPLOAD, AND IT IS ROUND-TRIP BOUND RATHER THAN
    BANDWIDTH BOUND.** MEASURED in selfrec A2: 13 buffered pieces drained in
    6,816 ms, 524 ms each, against a p50 verify of 483 ms. So an interrupted
    show catches up at about **1.9 pieces a second whatever the bitrate is**,
    and the headroom is set by how many pieces it makes. **At a 2s piece a three
    hour show is 5,400 against 0.5/s of production: 3.8x. At 5s it is 2,160 and
    9.5x.** So the long-show timeslice is **5s**, and it is not 5s on `/stage/`,
    whose shows are seconds long and would produce no piece at all before being
    stopped.
  - ⚠️ **Seeking does not pay for the longer piece**: `proto/selfrec/indexer.mjs
    --blocks` indexes per SimpleBlock, not per cluster.
  - ⚠️ **Audio is not where a saving is and is not cut.** 96k over three hours is
    130 MB of the 1.07 GB, and it is the only track carrying the question and
    the answers. `/stage/` records one video track today, so `AUDIO_BPS` is
    declared and deliberately NOT passed: a rate for a track that is not there
    is a setting that reads as correct and does nothing, which this page has
    already paid for twice.
  ⚠️ **WHAT IS STILL OPEN IS THE PLAYBACK PATH, NOT THE NUMBER.** `fetchBack`
  builds ONE Blob and a gigabyte cannot go in memory; `indexer.mjs` plus Range
  and MSE is the answer and is written. `/stage/` uses the `ingest` open tier,
  which is 4.2 minutes at this rate, so the worker swap to `selfrec` is
  untouched by this entry.
  ⚠️ **THE PROTO'S OWN DEFAULTS WERE LEFT ALONE ON PURPOSE.**
  `proto/selfrec/participant.html` still defaults to `kbps=1200` and
  `timeslice=2000`, because those are the values its recorded baselines were
  measured at and changing them silently would invalidate its NOTES.

- ✅ **DONE. follow TRACKS THE NEWEST FACT ON THE STRIP, WHICH DURING A SHOW IS
  THE WRITE HEAD.** *"What to do with follow"*, asked 2026-09-18. The open half
  was never the control, it was the TARGET: during playback it follows the
  playhead, and a live show has no playhead at all.
  🔴 **`followTarget` ON `createStripView`, PLUS `setFollowTarget(fn)` AT
  RUNTIME.** Null means the playhead, which is what every page before `/stage/`
  did. `/stage/` calls `armWall(0)` when the recorder starts, which makes
  `wallPos()` the write head and draws it as the wall cursor, and passes
  `() => wallPos()`. The handover at the end of the show is `setFollowTarget(null)`
  plus the new `disarmWall()`, and it does NOT re-engage follow: somebody who
  dragged the strip during the show stays where they dragged it.
  🔴 **AND THE STRIP WOULD HAVE FROZEN, WHICH IS THE HALF THAT NEARLY SHIPPED
  INERT.** Its loop repainted on `S.dirty || p !== S.pos || (wallAnchor &&
  deck.playing())`. On this page nothing is playing while a show records, so
  every term was false, the strip never redrew, and `followTick` never ran: a
  live show's timeline would have stood still while its own rows arrived, with
  every line of the new code correct. **An armed wall is a real-time cursor, so
  it now repaints on `S.wallAnchor` alone** and the way out is `disarmWall()`.
  ⚠️ **THE WINDOW IS A CEILING, NOT A WIDTH.** `LIVE_WINDOW_MS` is ten minutes,
  and the view opens on `min(showLength, window)`: at 1280 px a three hour show
  is 8.3 s per pixel, where a two minute question is 14 px and an answer is
  sub-pixel, and ten minutes puts that question at about 240 px. A short show
  fits whole and the window changes nothing, which is every show `/stage/` has
  recorded.
  🔴 **AND THE FIRST TWO ASSERTS WERE BLIND AND PASSED THE SABOTAGE 32/32.**
  They checked `followsPlayhead === false`, a finite `followPos`, and a window
  that MOVED. With `followPos` made to ignore the target and return the
  playhead: `followsPlayhead` reports the SETTING rather than the behaviour so
  it stayed true; the harness had seeked the playhead to 90s so `followPos` was
  large and finite; and a window chasing a playhead 90s away moved **17,119 px**,
  which passes "it moved" with room to spare. They compare `followPos` against
  the WRITE HEAD now, and require the write head to be ON SCREEN at the end.
  **MEASURED: `/stage/` 32/32, up from 28. Three deliberate sabotages take it to
  30/32, 31/32 and 31/32**, and the failure text names the real symptom each
  time (`sits -16446 px into a 576 px window`; `moved 0 px`; `reports 2500
  kbit/s`). **404/404 across the other eighteen strip demos**, keep and take
  included, which are the other pages that arm a wall.
  ⚠️ `now` AND `flipper` WERE NOT RUN. They sweep ERR segments, and nothing
  about this change is worth a public broadcaster's listener figures.

- ✅ **DONE. `/tapes/` HAS A STAND-IN, AND `node demo/verify.mjs tapes` COSTS
  archive.org NOTHING.** Asked because that harness pulled twenty-four real
  recordings on every run, including the runs where somebody typed no arguments
  at all, against the 2026-09-16 instruction *"stil: super careful with external
  sources, better avoid"*. `demo/fake-tapes.mjs` is the same answer
  `fake-station.mjs` gave `/radio/`: real MP3 frames, real `content-length`,
  `accept-ranges: bytes`, working Range replies and archive.org's CORS headers,
  at the exact lengths `corpus.json` measured. `/tapes/` takes a `?base=` the way
  `/radio/` does and `verify.mjs` starts the server and points the page at it.
  **MEASURED: 38/38 green, 26 page asserts, and the only hosts the run touched
  were the dev server and the stand-in.** The instrument is new too:
  `DEMO_HOSTS=1 node demo/verify.mjs <slug>` prints the hosts each demo
  contacted, off `Network.requestWillBeSent`, so "no bytes left this machine" is
  checkable rather than claimed.
  ⚠️ **AND IT EXPOSED TWO VACUOUS PASSES IN THE PAGE'S OWN CHECKS, WHICH ARE NOT
  FIXED.** A stand-in serving every recording at HALF its corpus length reads
  38/38, because every geometry assert takes its lengths from the corpus and
  none of them ever compares that against the file the element loaded. And a
  stand-in serving SILENCE also reads 38/38: `the page makes no sound until
  somebody presses play` printed `ran 265 ms of tape at 0.000 and the speakers
  got 0.0000`, which cannot tell a shut gate from nothing to gate, and
  `backwards is the same samples mirrored` reported `4 of 4` zeros matching
  zeros. Both need a real measurement to sit behind, and the tolerance for the
  first one cannot be chosen here: the corpus durations came from ffprobe on a
  header, so what a browser reports for the same file is unmeasured and may not
  be measured without asking archive.org for the files.

- ✅ **THE PAGE IS A STACK OF BLOCKS AND THE STACK OWNS THE AIR BETWEEN THEM.**
  Asked twice on 2026-09-16, the second time as a diagnosis rather than a
  request: *"same vert space beween as we establised in knob (make a rule and
  uptada others in bg: make it easy to change later)"*, then *"you can not
  follow spacing tule. make reusable layout component?"*. `demo/shell/stack.mjs`
  plus `.pos-stack` in `shell.css`; the number is `--pos-gap` on `:root` and
  nothing else states it. MEASURED on 38 pages before and after: every gap
  between two blocks is now exactly 40 px, where before there were 0, 10, 12,
  14, 16, 18, 40 and 53.5. `/keys/` was the photograph (0.0 px between the
  transport bar and the keyboard) and `/knobs/` was the reference and did not
  move, gap for gap.

- ✅ **AN IDLE LOOP PAIR WEARS THE SAME EDGE AS THE BUTTONS BESIDE IT.** Asked
  2026-09-16 with a photograph: *"global: loop buton borders as rest of
  button"*, the fourth report about this pair. MEASURED on `/draw/` before the
  repair: the pair read `rgb(106, 114, 128)` (`--dim2`, text grey) while every
  rate button and every ordinary button read `rgb(43, 53, 70)` (`--line2`). The
  repair was to DELETE the declaration rather than restate a colour: both halves
  are `<button>` and the base rule already gives them the edge. `/draw/` now
  asserts it, and the assert goes red when the old declaration is put back.

- ✅ **`/keys/` OPENS ON `AddSynth Morph`.** Asked as *"addsynth morph as default
  patch"*. Bank 115, program 32, addressed by bank and program rather than by a
  position in a flattened list of 911. It is SENT as well as pointed at, and the
  page says in its log which patch it opened on, or says so when that bank and
  program are not in the board's library.

- ✅ **FLUIDSYNTH AND HEXTER ARE OFF THE BOARD AND OUT OF THE PAGE**, to
  `archive/box-fluidsynth-hexter/`. Asked as *"lets remove fluidynth and hexter
  code and move to arvhice (in browser and in board). update board."* There is
  ONE jackd, ONE capture and ONE room on that board, so an instrument picker was
  a control that took the sound away from somebody in another building: `/knobs/`
  was found refusing to start because somebody had pressed `sampled`. Board
  restarted 22:44:41 and yoshimi confirmed up, `jack: true`, `yoshimi:left`,
  50 frames/s. MEASURED that the deploy landed: `md5` of `board.mjs` and
  `jacksynth.mjs` identical board against local, and the board's own copy of
  that file answers `JACK_SYNTHS: yoshimi`.
  ⚠️ It found a real defect on the way past: `/grains/` asked the board for
  `fluidsynth` while waiting for a reply naming `yoshimi`, so `wantSource` was
  never cleared and the mark it gates stayed armed for a whole visit.

- ✅ **THE `box` DEMO IS `keys`.** Asked as *"rename box demo to keys"*. 119
  references in 30 files, swept on the URL form rather than the word, so
  `rig/board/` is untouched: the BOARD is still the box. The source file did not
  move and `LAYOUT.md` rule 2 is why. The deployed `/box/` is gone and no
  redirect was written, same as `radio1965`.

- ✅ **`demo/shell/board.mjs`: ONE MODULE FOR THE RASPBERRY PI.** Asked as
  *"share code with knobs"*. `/keys/` stopped hand-rolling its WebSocket, its
  12-byte frame header, its int16 conversion, its `pcm-playout` worklet, its
  cushion and its counters; it GAINED three things it never had, because the
  module is the better of the two halves rather than the average — a full room
  told apart from a dead relay, a frame checked against the shape the board
  publishes, and the board identified by the messages only it sends.

- ✅ **ONE DIAGRAM, TWO VARIATIONS.** Asked as *"current box diagram is so much
  nicer. unify the diagrams to look best and have knobs and keys variations of
  this"*. Both draw the same ring now: out along the top, down the board, back
  along the bottom. `/knobs/` gained the split relay that makes it read one way
  round, `/keys/` gained the JACK and ffmpeg split. Both report `cuts: 0`.

- ✅ **`/keys/` HAS A TRANSPORT BAR WITH NO PLAY BUTTON.** Asked as *"bring
  transport bar to keys but no play button, just online badge. plush
  readout+logs"*. `transport-bar.mjs` takes `toggle: false`, in the same family
  as `scrub: false` and `loop: false`, and `demo/verify.mjs` reads
  `api.toggles` before pressing a button that may not be there.

- ✅ **IDA AND RADIO 1965 ARE BACK, LAST IN THE LIST, ON THE TEE.** Asked as
  *"bring ida's back to radio (if single listener)"*, *"bring ida to videoradio
  too"* and *"bring back radio65 stream as last. we are single user connected?"*.
  The condition was checked off the code, not remembered. NEITHER OPERATOR HAS
  BEEN RE-ASKED: what changed is the size of the claim, not their permission.
  Both are LAST because being at the front is what did the damage.

- ✅ **THE `/videoradio/` HEADSET HALF AND ITS SEA ARE ARCHIVED**, to
  `archive/videoradio-xr/` with the plan and a README of what the three device
  runs bought. Stage B was never written and now never will be here.

- ✅ **A RATE LATTICE OF ONE DRAWS NOTHING.** `buildRates()` tested
  `lattice.length`, so a cue lane declaring `caps: { rates: [1] }` produced a
  single armed radio button with nothing to choose it against: *"what this
  disconnected 1 does here?"*. Checked before changing it that `jam` and `kit`
  are the only other single-rate declarations and neither asserts on the row.


- ✅ **`/seek/` IS RETIRED.** *"rm seek demo"*. `git mv` to
  `archive/demos/seek-index.html`, its row out of `DEMOS`, and 5 real slug
  references swept of 30 slug-shaped candidates: the manifest row, the manifest
  prose that paired it with `replay`, a `verify.mjs` comment citing its 700 ms
  sweep, and a plan pointer. The other 25 are `st.reason === 'seek'` in the
  transport and history in old plans, which an archive is allowed to keep.
  ⚠️ IT ORPHANED NO COVERAGE, checked rather than assumed: its comment claimed
  *"exactly one page has to prove it works"* about the shared loop check, and
  `replay`, `radio` and `tapes` all press `pressLoop()` and assert on the wrap.
  MEASURED after: 46 rows, 43 built, `seek` absent, scratch build passes with no
  missing import, and the archived page still parses.

- ✅ **`/replay/`, ALL SIX.** 18/18 before, 22/22 after; page asserts 6 to 10.
  The lone yellow `1` was a rate radio group with ONE option, from a cue lane
  declaring `caps: { rates: [1] }`. The loop bug was real: the bar wraps by
  seeking, the deck is a `mediaMaster` FOLLOWER of the video, so every wrap was
  undone by the master's next tick while the clock climbed. It passes
  `command: { play, pause, seek }` now, the way `/tapes/` already did. Load and
  Play are gone, the transport's play does it. `what` is the manifest's `one`
  line. A diagram, `cuts` asserted at 0. Sabotage: deleting the one line that
  writes `video.currentTime` takes it red at `1.99 s against a ceiling of 1.25`.
  ⚠️ THE LOOPER WAS REFUSED IN WRITING AND CORRECTLY: it owns a direction by
  holding the sound, and `/replay/` loops a `<video>` with no `AudioContext` on
  the page. It got the kit's BUTTON without the kit's mechanism, disabled with
  the reason on its face. The lift is in this file.

- ✅ **ISOLATED DEPLOYS, PLANNED AND ANSWERED NO.** `plans/plan-isolated-deploys.md`.
  46% of deployed bytes are shared and 45 of 46 pages import `shell.mjs`, so
  per-slug subdomains cost 44 Workers and about 179 MB a deploy to buy TIMING
  isolation over code that stays shared BY SOURCE. `wrangler versions upload
  --preview-alias` instead, which is wired as `workers/view/preview.mjs` and
  MEASURED at 11 s with production untouched.

⚠️ These stay. A struck line is how a repeat request is recognised as a
repeat, and several of these were asked for more than once.

- ✅ **DONE. `/replay/`, ALL SIX, ASKED 2026-09-16 WITH A SCREENSHOT.**
  MEASURED: **18/18 before, 22/22 after**, `node demo/verify.mjs replay`.
  1. *"transport loops but video does not, time keeps increasing"* was real and
     is fixed. The bar wraps a loop by SEEKING, and with no `command` a seek
     goes to the deck; the deck on that page is a FOLLOWER of the picture, so
     `mediaMaster` undid every wrap within a quarter of a second while the show
     ran on. The page now passes `command`, so play, pause and seek all drive
     the `<video>` and the deck follows, which is what `/tapes/` already did.
     GRADED: the check sets a loop through the real button, plays two laps and
     watches `video.currentTime`. Green it reads *the picture ran 0.81 s from
     the loop start and reached 95.81 s, against a ceiling of 96.25 s*; with the
     one line that seeks the element deleted it reads **1.99 s against a ceiling
     of 1.25 s** and goes red.
  2. *"what this disconnected 1 does here?"* was the rate radio group with ONE
     option in it, from the cue lane declaring `caps.rates: [1]`. The lane no
     longer declares a lattice, because a playhead that follows a picture has no
     speed to arm. The bar's half of it is open above.
  3. *"rm load and play, transport play should do it"*. Gone. ▸ attaches the
     manifest, starts the picture and starts the playhead; `play()` is fired and
     never awaited. The page now declares no controls at all.
  4. *"does not have global loop button with mode, just a single loop"*. The
     kit's `→` is on the bar in the kit's group, disabled with the reason on it.
     The refusal and what would lift it are open above.
  5. *"desc: single sentence only"*. The `what` is the index's own `one` line.
  6. *"add 'how it works' section"*. A `createDiagram` picture, last on the page,
     seven boxes in two machines, asserting its own `cuts` at 0.
  ⚠️ The manifest row grew `settleMs: 6000`: with no controls the page's checks
  hang off a press the harness makes BEFORE its control loop, and that number is
  what sizes the wait for a page's first assert.

- ✅ **DONE. THE L
- ✅ **SESSION 31 CLEARED THESE, ALL DEPLOYED AT `b2bddd2-092128-ad26`.**
  The full account, with what each one cost, is in `HANDOFF.md`.

- ✅ **`/videoradio/` VR IS TO BE ARCHIVED. ASKED 2026-09-16:** *"arvhice
  videoradio vr, it did not worked out"*. The headset half comes out of the live
  page and goes to `archive/`: the `Run in VR` control and its row, `makeXR`,
  `xrPreview`, the `createXRPanels` import, the session's own sea and the two
  asserts that go through `preview()`. The WINDOW sea stays, because the same
  message asks for it to be changed rather than removed.

- ✅ **MOVE `/videoradio/` TO THE `vain` GROUP. ASKED 2026-09-16:** *"move
  videoradio to vain group"*. Front-page grouping, in `demo/shell/manifest.mjs`.

- ✅ **REMOVE THE LEAVE-FULL-SCREEN BUTTON ON `/videoradio/`. ASKED 2026-09-16:**
  *"rm \"back from fullcreen\" button in videoraio"*. The `⤡` in the bottom
  left of the pane (`outBtn`).

- ✅ **THE LOOP PAIR IS TWO DIFFERENT BORDERS AND THE ARROW IS NOT SQUARE. ASKED
  2026-09-16 WITH A SCREENSHOT:** *"loop buttons should have same border color.
  arrow button square size"*. In the picture `LOOP` carries a dim border and the
  → glued to it carries a bright one, so one control reads as two, and the arrow
  half is wider than it is tall. `demo/shell/looper.mjs` owns both.

- ✅ **`dub` AS THE DEFAULT PRESET. ASKED 2026-09-16:** *"dub as default preset"*.

- ✅ **THE PLAY BUTTON CHANGES SIZE WHEN IT BECOMES PAUSE. ASKED 2026-09-16 WITH A
  SCREENSHOT:** *"play button is always square"*. `▶` and `❚❚` are different
  widths, so a button sized by its content resizes on every press.

- ✅ **`/videoradio/` SHOULD USE THE STANDARD TRANSPORT BAR. ASKED 2026-09-16 WITH
  A SCREENSHOT:** *"use standard transport bar here (LIVE badge as in radio).
  fullscreen button replaces loop"*. Today it has a hand-rolled `.vr-bar` of two
  buttons, which is the fourth-copy-of-a-component failure CLAUDE.md names.
  `createTransportBar` with `live: true` draws the LIVE chip `/radio/` uses, and
  the ⛶ goes in the slot the LOOP button occupies there.

- ✅ **`/tapes/` STILL LOADS AND PLAYS ON PAGE LOAD. REPORTED 2026-09-16 AGAINST
  THE DEPLOY**, <https://positron.studio/tapes/>: *"tapes still does some
  loading and playback on page load"*, and *"omg you still do not get it"*,
  which is the second half of the report and says this has been asked before.
  ⚠️ THE LAST SESSION FIXED A DIFFERENT THING AND CLAIMED THIS ONE. What it
  removed was twenty-four `preload = 'metadata'` requests to archive.org, and
  the handoff then wrote *"the page opens NO media elements at load"*. A visitor
  is still getting sound and still getting a fetch, so whatever is doing it was
  never the thing that was measured.

- ✅ **CHROME DROPS OUT OF FULL SCREEN WHEN THE RADIO SOURCE CHANGES. NAMED
  2026-09-16:** *"chrome drops out of fullscreen when radio source changes. just
  take it as a fact and try to work to avoid it. or do tests around to replicate
  and find solution."* This is almost certainly the same fault as the standing
  *"`/videoradio/` drops out of full screen after 22 to 25 seconds"* item, which
  has been open since session 28 and unexplained: the tour changes station on
  roughly that period, so the clock everyone was looking for was the station
  rotation rather than a timer.
  ⚠️ **THE TERMS OF THE WORK WERE SET WITH IT AND THEY ARE NOT OPTIONAL:** *"be
  very gentle make sure proxy tee work and no assersions on live items. this is
  very gentle r&d"*. So: no assert loops against live mounts, and whatever is
  built has to confirm the tee is still holding one upstream.

- ✅ **`/keys/`: A DIAGRAM, A LAG READOUT, AND DROP THE COLLECTION LINE. ASKED
  2026-09-16:** *"add diagram to box demo. i want lag readout. rm
  Will_Godfrey_Collection · 657 of 878"*, then *"add 'patch' label to patch
  selector"*.

- ✅ **`/crate/`: CLICKING A FILE PLAYS IT. ASKED 2026-09-16:** *"no table rework.
  just make clickin files playable"*. Narrows the older three-part ask to one
  part and explicitly refuses the rest: leave the table alone.

- ✅ **`/tapes/`: THE NO-WAVEFORM LINE IS UNREADABLE AND THE EMPTY BOX LOOKS
  BROKEN. ASKED 2026-09-16:** *"what does it mean. many kureniemis do not
  play"*, against `Computer Music: its host will not share this file with a
  page, so it plays with no waveform`, printed in the log's FAULT colour with a
  blank bordered box above it.

- ✅ **`/replay/` DOES NOT SAY WHERE THE CUES COME FROM. ASKED 2026-09-16:**
  *"https://positron.studio/replay/ does not say where from the cues come"*.
  The page draws eight operator cues on the strip and nothing on it says who
  made them or when.

ENGTHS ARE MEASURED AND THEY ARE IN THE CORPUS.** Asked as
  *"also do measure file lengths gently and write to corpus and use them"*.
  `demo/resources/measure-durations.mjs` asked all 26 time-based files with
  ffprobe, ONE AT A TIME, two seconds apart, at `-probesize 65536` so it reads a
  header rather than half a recording: **26 of 26 answered**, including a 990 MB
  AVI (52 min) and a 225 MB MPEG program stream (4 min). They live in
  `demo/resources/durations.json`, `build-corpus.mjs` merges them, and
  `corpus.json` now carries `durationMs` on those 26 rows and a `durations`
  block saying who measured them and when.
  ⚠️ MERGED THROUGH THE GENERATOR WITH `--offline`, which asks no source
  anything: MEASURED byte for byte identical to the committed file apart from
  its timestamp, then 26 rows changed and every change was the new field alone.
  ⚠️ AND `/tapes/` USES THEM: the run is drawn at its real length in the first
  frame and the page opens no media elements at load. It was twenty-four
  `preload = 'metadata'` requests to archive.org on every visit, correcting the
  picture over the following seconds. 24 of 24 measured, 1.2 to 13.8 minutes.

- ✅ **DONE. THE LOOPING UI IS GLOBAL AND `/tapes/` HAS IT.** Asked as *"make it
  use same looping ui as radio (make it global)"*. `demo/shell/looper.mjs` owns
  the ring, the kept buffer, the mirror, the voice, the head fraction and the
  button that cycles → ← ⇆; `/radio/` lost 222 lines to it and `/tapes/` gained
  the whole instrument. MEASURED: radio **48/48** against the stand-in and tapes
  **37/37**, with the tape's own check proving backwards is the same samples
  mirrored (4 of 4) and a sabotage of `reversedCopy` taking it red.
  ⚠️ `/tapes/` keeps the FIRST LAP off the tape and plays every lap after it off
  the ring, because a media element has no negative playback rate.

- ✅ **DONE. THE DRAWN TAPE HEIGHT IS GRADED, IN PIXELS.** The 2026-09-15 ask
  *"add 2x height to timeline (same tape h)"* was implemented and graded by
  nothing. The check scans the canvas for the tallest run of ink inside the lane
  rather than re-deriving `height - barPad * 2`, which would have been comparing
  an answer with itself: **22 px of tape over 122 columns in a 64 px lane**, and
  `barPad: 8` takes it to 48 px and red.

- ✅ **DONE. `/tapes/` SAYS IT IS LOADING, AND THE PICTURE MOVES ITSELF.** Asked
  as *"Loading on entry, selfmiving zoom"*. The name line says `finding the
  recordings` until there is something to name, the strip pulses until it has
  bars, and once the run is known the window opens on the WHOLE two and a half
  hours and closes onto an hour over 1.2 s, then slides along with the tape and
  stops at both ends of the run. MEASURED: **38 frames from 142 minutes wide
  down to 60, 16 of them in between**; a playhead at 118.5 min brings the window
  from -1.2 to 81.2 min. Both stop the instant a hand touches the strip, and
  both go red under sabotage.

- ✅ **DONE, AND IT UNBLOCKED A PAGE NOBODY WAS ALLOWED TO RUN.**
  `demo/fake-station.mjs` is an Icecast mount that is nobody's radio station:
  real MP3 frames, real ICY headers, a real text channel, a `/health` route in
  the relay's shape, paced at 128 kbit/s. `verify.mjs` starts it itself whenever
  `radio` is in the run. **48/48 green with zero bytes from ERR**, which is how
  the looper refactor was graded at all.

- ✅ **DONE. Space between the walk buttons and the scrub knob.** *"add space
  between"*, with a picture of them almost touching. `.tbar-head` is 10 px wide
  and centred on its position, so at 0 it hangs 5 px past the track's left edge
  and at the end 5 px past the right. The row's `gap: 8px` is measured to the
  TRACK, which is invisible, so what was actually between the button and the
  knob was **3 px**. The track now carries `margin: 0 5px`, the knob's own
  radius, so the ink you can see gets the 8 px every other member gets.
  ⚠️ Not a bigger row gap: that gap is shared by every member and was tuned to
  8 to stop the bar wrapping to two rows, so raising it to fix one edge would
  push the rate group onto a second line on the pages that only just fit.
- ✅ **DONE. `buffer` and `lost` are on screen, and they are a PAIR.**
  The readout went four cells to six rather than swapping one out: five is not
  available (`mount()` throws on an odd count) and `moving` was not the weakest
  cell, it just looked like it beside two counters nobody could see.
  `lost` is `underruns + dropped`, what went missing after the stream settled.
  ⚠️ `skipped` is deliberately NOT in it: that is the opening burst trim,
  windowed to four seconds, and it reads 53 on a perfectly healthy start. A
  number that alarms every time is a number nobody reads twice.
  🔴 And `buffer` is the cell that earns its place, because `lost` reads 0 on a
  healthy stream while `buffer` moves the whole time and falls FIRST. A new
  assert grades the distance the old one could not see: `no gap past a 1 s
  buffer` passes at 345 ms and at 990 ms alike. MEASURED on this desktop,
  **515 ms of sound in hand at the tightest against a 112 ms worst gap, 403 ms
  spare**, and 515 is under the 600 ms floor here too, so the iPhone was not
  special and the per-station `floorMs` item below is the right next move.
  It doubles as the plumbing check: `tightest` is written only where the two
  cells are written, so a finite value proves they were fed rather than left at
  one em dash.
- ✅ **FIXED, AND IT NEEDED A MASTER GAIN RATHER THAN ONE MORE WIRE.** `sink`
  was fed by the station's path and the loop's gain while the engine left the
  page by a route of its own, so with the fader hard over to the granulator the
  meter read **0.0000 over a signal that was playing perfectly** and every check
  standing on it passed by measuring nothing. `speakers` is now the one way out
  and the analyser hangs off it alone.
  ⚠️ Graded three ways at once, because each kills a different vacuous pass: the
  meter reads the grains, the station's gain is at zero so the grains are what
  it read, and the same window with the output muted reads under an eighth.
- ✅ **IDA STAYS ON THE RELAY. DECIDED, do not re-litigate.** The agent that
  wired it recommended fetching direct, since IDA has TLS and CORS and needs no
  proxy. Overruled for ONE PIPELINE: `srcOf(id)` is one path for every station
  and nothing branches on which, so a station fetched another way would be a
  second path only one station takes.
  ⚠️ And the hop is not a cost. MEASURED, time to first byte, three runs each:
  relayed 0.185 / 0.325 / 0.256 s against direct 0.397 / 0.447 / 0.444 s. The
  relay is FASTER every time, because Cloudflare's edge is nearer than their
  server. What it does cost is egress: 320 kbit/s is 144 MB per listener-hour.
  Written up in `workers/shout/NOTES.md`.
- ✅ **DONE. Varispeed with inertia on the walk buttons.** Playing: the rate eases
  to a 0.0625 floor over 260 ms, the reel changes at the bottom, and it climbs
  back over 420 ms. Measured from outside: floor at 255 to 265 ms, full speed at
  689 to 693 ms against 680 declared. `preservesPitch = false`, so the pitch
  follows and the speed buttons are varispeed too.
  ⚠️ PAUSED, THERE IS NO ARC AT ALL. Nothing standing still has momentum, and a
  ramp over silence is a control that visibly does nothing while costing two
  thirds of a second. Asserted either side.
  ⚠️ AND INERTIA IS TOLD APART FROM A STALL BY MEASUREMENT: the climb's rate
  curve has a known mean, so the tape it SHOULD have moved is known and compared
  with what `currentTime` actually moved. 0 ms of 289 on a cold reel, 290 to 294
  of 289 when the tape was there.
- ✅ **DONE, and the time was not where the comments assumed.** `await
  audio.play()` was the flake: it settles when the DECODER has started, not when
  playing is allowed, measured 1.1 s warm and **5.9 s cold**, and awaited twice.
  That is CLAUDE.md's "never let sound gate the work" inside this repo's own
  file. Also: the loop check was seeking 20% into a 200 MB archive.org file, so
  a range request stalled `readyState` for up to 12 s; its marks are at the head
  now, where the page has already buffered. Ready time median **3626 to 2472 ms**,
  worst **9189 to 5529**, ten runs each. No check was weakened.
- ✅ **CLEARED, and the diagnosis held.** MEASURED now: all EIGHT stations up,
  `radio` 200 included, plus both IDA channels. It was between Cloudflare's
  edge and ERR for three mounts, exactly as the two-mounts-still-200 control
  said, and it needed nothing from us.
  `/radio/` re-run against the REAL relay is **43/43 green**, naming Radio
  1965 itself rather than falling back, with the tempo lock reading
  `23.00000 whole laps, 0.000 thousandths out`. The presets had only ever been
  verified against a stand-in; they are now verified for real.
  ⚠️ And IDA plays on the DEPLOYED page: 816 frames in, 816 decoded, 0 errors,
  framing `adts`, codec `mp4a.40.2`.
- ✅ **FIXED, AND IT WAS FAR WORSE THAN 32 AND 30.** The shell's two asserts at t+0 disarmed `verify.mjs`'s first-assert wait on EVERY shelled page, so the page reported **2 of 43** and the suite said `13/13 green`. The shell publishes `shellAsserts` now and the harness asks the question it means. 43/43. LESSONS #95.
- ✅ **DONE, and without the clock**, which was cut on instruction (*"jsut back to back tapes"*). The 24 tapes run end to end from nought, each as wide as it really is, one lane declared the way `/loops/` declares its lanes. The `LANES` table, `buildLanes()` and the `packRows` packer are all gone.
- ✅ **DONE. The loop's three marks on the wave.**
- ✅ **DONE. The speed row is gone and replaced.** Not repurposed this time: the
  `0.0625 … 1` lattice came off the transport adapter and a four-cell `loop` row
  took its place, greyed until a loop runs. Each cell is a different MECHANISM,
  not a different number of one: `round` the kept seconds as they arrived,
  `back` the same samples mirrored, `half` the same lap an octave down and
  bit-exact at 768000 samples, `chop` a sixteenth of the lap with the grains
  retuned to it. Three of the four are things a live stream cannot do at all.
  ⚠️ `drift` was REFUSED: a wandering tape cannot be told from a broken clock by
  ear, and it would unpick the tempo lock.
- ✅ **FIXED. The push path was broken in BOTH directions by one missing value.**
  `FCM_TOPIC` was not in `workers/items/wrangler.jsonc` at all, so `announce()`
  threw on every publish AND `POST /subscribe` had no topic to join a device to.
  Nothing had ever been subscribed to a correctly named topic, which is why
  choosing one was safe. It is a `var` rather than a secret: a topic name is a
  public channel name every subscriber must know, and `FIREBASE_SA` beside it is
  the thing that must stay secret.
  MEASURED after: `has_topic: true`, and a probe published into the real room
  came back with **`announced_at=1789484181710`**, the first stamp that room has
  ever carried. Probes cleared; the room hands over empty.
  ⚠️ The name is `positron-items`. Changing it means every device re-subscribes.
- ✅ **Lane label. DONE.** The swatch is now as tall as the text beside it (9 px
  for a name alone, 14 where there is a sub-label under it), the name sits
  higher when it is alone, and it carries the lane's own colour mixed 42% into
  the ink. The name used to be `T.ink` on every lane, so on a strip of six the
  names were six identical greys beside six coloured ticks and joining them up
  was the reader's job.
- ✅ The 14 corpus corrections survive a rebuild. The values live in
  `proto/deck/ingest.mjs` (twelve) and `demo/resources/build-corpus.mjs` (two),
  both generators reproduce them, and three guards refuse rather than drop them.
  Every `proto/aikajana` reference is gone from the two generated files and from
  `proto/deck/verify.mjs`, which had been navigating to a 404.
- ✅ 🔴 And the rebuild found a second, larger defect: the `kurenniemi` ->
  `resources` rename matched BARE WORDS inside `build-corpus.mjs` and corrupted
  twelve string literals, including three record filters and two live host
  paths. A full rebuild returned **285 rows instead of 334**, with Zenodo
  keeping 0 of 28 and archive.org 0 of 15. Repaired; 334 again.
- ✅ `/resources/` reads `when.how` and `when.note`. The date cell says who the
  date comes from and how wide the bracket is, in two short lines; the row says
  what the record is and why its date is not narrower.
- ✅ `/tapes/`: playhead off the map, loaded tape ringed and the rest dimmed, press
  a mark to load, rate control fixed, load blip gated, loop freezes the wave
  instead of rescaling it, labels legible with real padding.
- ✅ `weight`: the sentence across four walls, size from word length, sentence case,
  textarea of three lines, live rebuild on every keystroke, readout removed.
- ✅ Live loop with a blinking button and no scrollbar; frozen waveform playhead;
  both joined on `/radio/` and `/tapes/`.
- ✅ `/radio/`: it now KEEPS the audio and plays it back, measured at the
  destination. Boxes fade in together on first sound. Scope window widened to
  the granulator's buffer, which had been silently dropping the oldest quarter.
- ✅ Diagrams: 1 px border on every kind, less saturated edges, centred ties,
  no hue on a name whose box paints none, no articles in labels, notes name the
  technology, service worker inside the phone, two phones for the fan-out.
- ✅ Tables: `/wire/` and `/items/` on `table.mjs`, no header fill, more padding,
  and the component added to `/kit/` with its negative control.
- ✅ `/kit/`: mounts the shell, 8 asserts, graded by the suite for the first time.
- ✅ `mirror`: hold-to-quit badge, and the LOOK control swapped to `createPicker`.
- ✅ Readouts removed from `items`, `weight`, `wire`.
- ✅ `shout` carries Radio 1965's recordings at `/rec/<name>.mp3`.
- ✅ `NOTES` emptied, both essays moved to `research/`, `/notes/` no longer built.
- ✅ `LESSONS.md` renumbering, and the rule about it.



## Moved out of Open by the audit of 2026-09-18

Struck because the work exists, with the evidence that showed it.

- ✅ **THE LIVE BADGE IS OFF THE ARCHIVE PANEL, 2026-09-18.** MEASURED across
  the three panels: audience `live`, control room `live`, archive empty.
  ⚠️ **NOT RE-WORDED TO `archive`, WHICH WAS THE TEMPTING FIX.** A presence
  badge answers whether the thing feeding the picture is ANSWERING. Nothing
  feeds this one: it is a recording of a show that finished, so there is no
  liveness to report and a re-worded badge would be the same lie in a better
  costume. `left: false` is the panel's own way of saying a slot has nothing to
  put in it, and the footer keeps its other two.

- ✅ **STAGE AND THEATRE OUT OF THE ERR ARCHIVES, 2026-09-18.**
  `research/err-stage-theatre-2026-09-18.md`, 498 lines. **161 requests, all to
  the catalogue, NO MEDIA OF ANY KIND**: no manifest, segment, mp3, mp4 or
  thumbnail, and `vod.err.ee` / `heli.err.ee` / `arhiiv-images.err.ee` were never
  contacted. Spaced 1.8 s, every response cached, and the API refused nothing.
  **10,185 rows harvested complete** in the archive's own `Lavastuslik`
  category (5,609 video, 4,576 audio), dated **1928-07-15 to 2026-09-14** over
  84 distinct years, plus 30,243 or more photos, which is a floor because the
  count saturates.
  ⚠️ **IT IS A DOCUMENT AND NOT A `stage.json`, AND THE REASON IS THE FINDING.**
  The rows were harvested and then measured: only **15.7%** say anything about a
  stage, and `content=etendus` finds MORE theatre in `Kultuur` (2,377) than in
  `Lavastuslik` (1,079), because one holds the productions and the other holds
  the writing about them. There is no honest membership rule, so a corpus file
  would have shipped a set already proved wrong. The recipe that regenerates the
  rows in 22 requests is in the document.
  🔴 **AND THE `keywords` PARAMETER IS INERT, WHICH IS A BROKEN COLLECTOR
  CAUGHT BY ITS OWN TIDINESS.** Ten different theatre terms returned exactly
  30,000 / 10,000 / 10,000 / 10,000. Identical numbers from ten different words
  is not a finding, and a year-bounded control proved it. `category` and
  `content` do work.
  ⚠️ **THE METADATA SHAPE HAS MOVED** since `research/err-archives-2026-08.md`:
  `metadata.technical[]` is now `metadata.data[]` with three groups, and
  `makers` is empty on every audio item.

- ✅ **THE ARCHIVE TIMELINE IS THREE TIMES HIGHER, AND IT IS NOT A RULE,
  2026-09-18.** Four messages settled it: *"Make archive timeline 3x higher"*,
  *"Make it a rule"*, *"Ita ok to have empty space in timelime, def min
  height"*, then *"No rule just min height"*. MEASURED at **50 px** before and
  **150 px** after, which is 3x to the pixel, and the floor is `STRIP_MIN_H` in
  `demo/shell/strip.mjs` rather than a number typed on a page.
  ⚠️ **A FLOOR, NEVER A HEIGHT.** Lanes needing more than 150 still get more, so
  a page cannot clip its own content by asking for it, and the empty space under
  the last lane was explicitly accepted rather than packed out.
  ⚠️ **AND IT IS OPT-IN, WHICH THE MEASUREMENT DECIDED BEFORE THE RETRACTION
  DID.** Every `auto` strip in the project was measured first: kit 44, stage 50,
  draw 68, lanes 72, instrument 100, click 104, loops 116. A blanket floor would
  have reshaped all seven, and `/kit/`'s 44 px specimen is 44 px on purpose.
  🔴 **IT ALSO BROKE A CHECK, AND THE CHECK WAS RIGHT TO COMPLAIN.** `/stage/`'s
  "no black rule between the lanes" assert sampled to the bottom of the canvas,
  found the new empty ground under the last lane and reported a drop of 21.
  `timeline/strip.mjs` now keeps `lanesH` (how far down anything was drawn)
  apart from `contentH` (how tall the canvas is); they were one number until a
  floor existed. The check bounds itself to `lanesH` and reads a drop of 0 over
  63 rows, with its three lanes still present so the subject has not gone
  missing.

- ✅ **LOOP AND RATE ARE OFF THE ARCHIVE TRANSPORT, 2026-09-18.** MEASURED: no
  loop button in the bar, 0 rate buttons. It is play and nothing else.
  ⚠️ **THE TWO CAME OFF IN DIFFERENT PLACES AND THAT IS NOT AN INCONSISTENCY.**
  `loop: false` is the bar's own option, beside `scrub: false` and `time:
  false`. The RATES are not the bar's to refuse: they are the intersection of
  every `caps.rates` its deck's kinds declare, and the bar already draws them
  only when that intersection holds more than one value. So the honest way to
  have none is for the DECK to stop claiming four, which is what its adapter now
  says. A `rates: false` option would have put one fact in two places and let
  them disagree.

- ✅ **THE LOG IS OFF `/stage/`'S AUDIENCE TAB, 2026-09-18.** MEASURED: on the
  audience tab the log reads `hidden: true, display: none`; on the archive tab
  it reads `display: grid`. The other two tabs keep it, because they are worked
  by the person running the show, who is who a log is for.
  🔴 **AND `hidden` ALONE DID NOTHING, WHICH IS THE PART WORTH KEEPING.**
  `.pos-log` sets `display: grid`, and ANY author rule beats the browser's own
  `[hidden]`, so setting the property would have left a log on screen and a flag
  that reads as set. `.pos-glue[hidden]` already existed three hundred lines up
  in the same stylesheet for exactly this reason. `.pos-log[hidden]` now does
  too, at (0,2,0) so it cannot lose to `.pos-log`.
  ⚠️ **THE FIRST `go()` IS QUIET, SO `onPick` DOES NOT FIRE ON LOAD.** The page
  opens on the audience tab, so leaving the initial state to the callback would
  have shown the log to exactly the reader it is being taken from until they
  touched a tab. It is applied once by hand.

- ✅ **GLUE IS OUT OF THE DOCS AND THE FOUR REAL ONES ARE GLUED, 2026-09-18.**
  Asked as *"i see no poiint in glue, it looks off and pointless in docs. just
  glue the 4 we have properly"*, and the four were CONFIRMED rather than guessed
  before any of it was written.
  The `/kit/` section is gone, along with its two grey specimen boxes reading
  `a block` and `and another` and the `.kit-glue-demo` rule that styled them. It
  demonstrated the mechanism and none of the reason for it, which is what made
  it read as furniture. `node demo/verify.mjs kit` is **45/45 before and after**,
  so removing it moved no button the harness presses by position.
  The four, each LOOKED AT rather than assumed, because the complaint was
  visual: `/stage/` archive (bar + strip, already done), `/radio/` (bar + scope),
  `/replay/` (bar + strip), `/tapes/` (scope + bar). 52/52, 60/60 and 45/45
  green across them.
  ⚠️ **`/tapes/` IS THE SCOPE AND THE BAR, NOT THE STRIP AND THE BAR.** Its
  strip runs edge to edge past the page margins while the scope and bar are
  inset, so a box round the strip and the bar would have to reconcile two widths
  and put its seam across a block the tape's own picture already crosses.
  ⚠️ **AND `createGlue` PUTS NOTHING ANYWHERE.** It re-parents its blocks into a
  box and hands the box back, so a page that only calls it loses both blocks off
  the page. Every one of these captures its anchor BEFORE the call, because a
  node read after it can already be detached and `insertBefore` throws on that.

- ✅ **THE FIVE BLACK KEYS ARE WHERE A PIANO PUTS THEM, AND THIS LINE OUTLIVED
  THE WORK BY A DAY.** The move landed in `8bdd489` on 2026-09-17 and was never
  struck off. VERIFIED BY MEASUREMENT 2026-09-18 rather than by reading the
  diff: `SHARP_OFF` keys off the PITCH CLASS as §4.1 asked, `--k-off` is
  consumed by `shell.css`, and `/kit/` reports the narrowest white strip at
  **27.0 px, 0.551 of a white key**, against 0.401 when the keys were centred
  and 0.439 in GarageBand. That is the predicted 27.00 to the digit.
  ⚠️ **THE STACKING ASSERT WAS RE-DERIVED TOO, AND BETTER THAN ASKED.** The
  worry was that it sampled symmetrically about the join and so could not see
  the change. What shipped does not measure a centre at all: it measures the
  STRIP a finger lands on between two black keys, which is the quantity the
  offsets exist to change. Its own comment records the old centred-on-join
  assert going red at 7.33 px, so it is a check proved against both states
  rather than against one.

- ✅ **`/stage/` IS BUILT AND THIS LINE OUTLIVED IT BY A DAY.** Every clause of
  the dictated spec is met and MEASURED: three tabs, three panels each showing
  the same generated test picture, `node demo/verify.mjs stage` at **21/21**
  including `three panels, one for each tab` and `the fullscreen button is
  square, 34.0 by 34.0 px`. The sentence that ENDED MID-WAY, *"Make a generic
  component with"*, was answered without being guessed at: it is
  `demo/shell/video-panel.mjs`, with l/c/r slots, `left` defaulting to presence,
  `right` to a square fullscreen button, an empty centre, and `FULL_MODES =
  ['hover', 'footer', 'bare']` covering the two modes the message did describe.
  ⚠️ And `tabs.mjs` finally has its first real use, which the entry correctly
  predicted was the test that component had never had.

- ✅ **THE GMAIL HTML HALF WAS ALREADY FIXED, AND THE REAL FINDING IS THAT
  NOTHING GRADED IT. SETTLED 2026-09-18 BY CAPTURING THE MESSAGE.** The raw of
  both real messages was pulled from the sender's own mailbox and they are now
  fixtures, byte for byte, at 542 and 539 bytes (Gmail's own size estimate for
  each). Run against the SHIPPED `firstText`, the 19:54:32 message returns
  exactly `hello!`. So the room entry was written by the build BEFORE the repair:
  the two messages are two minutes apart, the deploy went out between them, and
  the 19:56 message came out clean and labelled while the 19:54 one did not.
  ✅ **AND THAT IS NO LONGER AN INFERENCE.** `wrangler deployments list` on
  2026-09-18 reports the previous deployment created at **19:55:59.807Z**, which
  falls between the two messages (19:54:32 and 19:56:17). The reasoning from the
  fixtures and the deploy record agree, and they were arrived at independently.
  ⚠️ **THE LESSON WAS THE ONE THE ENTRY PREDICTED, IN A PLACE NOBODY LOOKED.**
  `firstText` lived inside `index.js` beside a `fetch` and a WebSocket, so
  nothing could import it and it had ZERO asserts, while `spam.mjs` next door had
  51. It is `workers/mail/src/body.mjs` now, graded by 8 body fixtures and a
  sweep asserting that no message hands back any part of its own envelope. The
  suite is **75/75**, up from 51.
  ⚠️ AND THREE REAL DEFECTS CAME OUT OF WRITING THE FIXTURES, none of which the
  room had shown: a nested `multipart/mixed` (an attachment) handed the whole
  inner structure back as the person's words, a message with no closing
  delimiter lost its only part to `slice(1, -1)`, and a message whose line
  endings had been normalised to LF matched no `\r\n\r\n` and returned its own
  headers as the body.

- ✅ **A SUBJECT FROM OUTSIDE ENGLISH IS DECODED AND DEPLOYED, 2026-09-18.**
  RFC 2047 in `workers/mail/src/body.mjs`: both encodings, adjacent words joined
  with no space added between them, and charsets that are not UTF-8. Graded on
  the exact string from the entry above this one, `=?utf-8?B?a8O1aWdlIGjDpHN0aQ==?=`,
  which now reads `kõige hästi`.
  ⚠️ **THE BODY WAS BROKEN THE SAME WAY AND THE ENTRY DID NOT SAY SO.** A subject
  is MIME-encoded because the alphabet forced it, and the same message's BODY
  arrives `quoted-printable` or `base64` for the same reason, so decoding only
  the subject would have left `K=C3=B5ige h=C3=A4sti` under a heading that now
  reads correctly. Both halves are decoded and both are fixtures.
  ⚠️ **AND A DECODED HEADER IS FLATTENED TO ONE LINE.** A subject is the first
  line of a note whose other lines are the body, so an encoded word carrying a
  newline could forge a line of our own output. That is the only place in this
  worker where a stranger's text reaches a structured format, and there is an
  assert that plants exactly that and requires it not to work.
  ✅ **DEPLOYED 2026-09-18** as version `50a78731` at 100%. This entry carried a
  red line saying it was in the repo and not on the edge, which was true for
  about an hour and then was not.

- ✅ **THE VERDICT SAYS WHICH SIGNAL DECIDED IT, DEPLOYED 2026-09-18.**
  `auth.via` already held the answer and went only to `console.log`, where nobody
  was looking. It is a chip now: `[ok · via Authentication-Results]` against
  `[ok · via ARC]`, so the four characters that could not tell the two apart have
  become a label that says which. Graded with the negative control that gives it
  meaning: a fixture with a real stamp and one with only a forwarded ARC set must
  come out DIFFERENT, and a message with no stamp at all must name no source
  rather than invent one.
  ⚠️ **IT IS EMITTED ON THE ORDINARY CASE TOO, BREAKING THIS FILE'S OWN RULE
  ABOUT CHIPS ONLY WHERE THEY BEAR ON THE VERDICT, AND THAT IS DELIBERATE.** A
  chip that appears only in the interesting case cannot be told apart from a
  build that does not have the chip yet, which is the identical argument that put
  `[ok]` on ordinary mail to begin with.
  ⚠️ **WHAT IS STILL NOT KNOWN IS WHAT DECIDED THE 19:56 MESSAGE.** That cannot
  be recovered from here: the room holds only the label, and the sender's copy
  carries no `Authentication-Results` because the receiving side adds it. The
  worker's own log for that delivery would answer it and observability is on.
  The next message answers it by itself.

- ✅ **INCOMING EMAIL AT `positron@positron.studio` IS BUILT, DEPLOYED AND
  RECEIVING. THE MOST STALE LINE IN THE FILE.** It said *"nothing is built and
  no DNS or zone setting has been touched"*. `workers/mail/` is a complete Email
  Worker routing mail into the feedback room over the relay, graded **75/75** on
  20 spam fixtures and 8 body fixtures, live as version `50a78731`. The proof it
  receives is elsewhere in this same file: the two real messages that arrived at
  19:54:32 and 19:56:17 on 2026-09-17, which three other entries reason about.
  ⚠️ **AND THE QUESTION THE ENTRY CALLED LOAD-BEARING WAS ANSWERED**, in
  `wrangler.jsonc`'s own header, quoting the ask: *"I just need an email address
  people can contact. That's it. And uh, the agent should be reading it"*. What
  it is for is the feedback room, and that is why there is no second store.

- ✅ **THE TWO VERBS ARE WRITTEN AND NEITHER HAS MET A JACK SERVER
  (2026-09-18).** `jack.graph` reports `jack_lsp -c` as structure, a `pgrep -cx`
  count of the five processes that make the sound, jackd's own command line,
  what the box BELIEVES is running, and the chain it should have against the one
  it has (`want`, `missing`, `extra`, `intact`). `jack.rebuild` patches the
  DIFFERENCE and nothing else. Both answer in their own names, because
  `audio.status` answering `audio.started` cost nine seconds and a false
  conclusion that no board was in the room.
  ⚠️ **THE SHARING DECISION, WRITTEN DOWN IN `rig/board/README.md`:** the board
  cannot see a listener (the relay forwards verbatim, `webSocketClose()` is
  empty, a page holding PCM says nothing), so the rebuild is a diff that runs
  zero commands on a healthy graph, kills no process, says out loud who else is
  in the room when it does cut a link, and refuses on `onlyIfIdle: true`. A
  SERVICE restart is deliberately still not a verb: `audio.stop` then
  `audio.start` already does that, at about thirteen seconds of silence for
  everybody.
  ⚠️ **UNVERIFIED.** No ssh from here, so nothing has been run against real
  `jack_lsp` output. `node rig/board/test.mjs` is 92/92 with 25 new checks on the
  parse and the chain against `fixtures/jack-lsp-c.txt`, and two deliberate
  sabotages take it to 88/92 and 90/92. What is still open: that this board's
  real `jack_lsp -c` parses as the fixture does, and that a real `jack_connect`
  repairs a real drift. Deploy with `rig/board/push.sh` and confirm with the md5s
  it prints, which now cover `jacksynth.mjs` as well as `board.mjs`.
