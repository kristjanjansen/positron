# plan-board-pappus: take the granulator out of `/keys/`, and say what is left

🔴 **SECOND PASS, 2026-09-16. THE TWO THINGS §2 KEPT ARE BOTH GONE, AND §9
GAINED AN ANSWER.** Instructed as *"get rid of both"*, quoting this file's own
exceptions back at it. `/keys/` no longer sends `fx.pappus {on:false,
onlyIfIdle:true}`, so the string `pappus` appears **0 times** in
`rig/board/listen.html`; the guarantee that message carried moved onto the BOARD,
which now drops an insert whose page has stopped talking. And ERR's 1965 archive
left the board entirely. §2, §3 and §9 below are marked where they are now
history. The board keeps its granulator: *"keep pi granulator for grains"*.

Asked for 2026-09-16: *"plan and remove pappus from the
http://127.0.0.1:8890/keys/ signal path. there is no ui to control it. arhvice
it. update diagram as well. captutre: should be more techical, JACK etc. can we
sampled (renamed to the collection name), hexter, yoshimi side by side in pi box
in diagram"*.

`/keys/` is `rig/board/listen.html`, served at `/keys/`, deployed as
`workers/view/public/keys/index.html`. The board's code is `rig/board/`.

---

## 1. What Pappus IS, read off the code rather than remembered

Pappus is a SuperCollider engine (`rig/board/norns/Engine_Pappus.sc`, 2,030 lines
of class library) run by `sclang` from `rig/board/norns/run-pappus.scd`. It is
**not an instrument and has not been one since it was taken out of
`JACK_SYNTHS`**: it granulates its INPUT, so as an instrument it faithfully
processed silence. It is an **insert**, raised and patched by
`pappusFx()` in `rig/board/jacksynth.mjs`, and driven over OSC by
`rig/board/pappus.mjs` (106 parameters, no note numbers).

What `pappusFx(true)` does to the JACK graph, exactly:

    instrument:out  ->  SuperCollider:in_1 / in_2      (the feed)
    SuperCollider:out_1 / out_2  ->  posbox:input_1    (the return)

and `pappusFx(false)` undoes both and re-connects the instrument straight to
`posbox:input_1`. `posbox` is the capture: `ffmpeg -f jack -i posbox -f s16le
-ar 48000 -ac 1 -`, whose stdout `board.mjs` cuts into 960-sample frames and sends
over the relay.

**On `/keys/` today it is drawn, reported, and cannot be touched.** The page has
had no control for it since the reverb replaced it; what is left is a box in the
diagram between `instruments` and `capture`, a `let insert` that follows what
the board says, two log lines that narrate it, and one message on connect.

⚠️ **And the log line fires on an ordinary visit.** `insert` starts `undefined`,
the board answers `fx: null`, so `m.fx !== insert` is true on the first
heartbeat and every visit logs *"the granulator is out of the sound"*. A page
with no control for a thing opens by talking about it.

---

## 2. What must NOT be removed, and why

✅ **STILL TRUE, AND RE-CONFIRMED ON INSTRUCTION 2026-09-16.**
🔴 **`rig/board/pappus.mjs`, `pappusFx()` and the `fx.pappus` handler in
`board.mjs` all stay on the board.** `/grains/` is a live, built demo whose entire
subject is the same granulator running in a tab and on the Raspberry Pi. It
sends `fx.pappus {on:true}` from its own handler, polls `params.state`, and
compares the two. Deleting the board half breaks a deployed page. The ask is
about `/keys/`'s signal path, and the board is not `/keys/`.

⚠️ **REVERSED 2026-09-16, AND THE REASONING IS KEPT BECAUSE THE FAULT IS REAL.**
This section said `/keys/` keeps sending `fx.pappus {on:false, onlyIfIdle:true}`
on connect, because that message is what MAKES the removal true rather than
merely undrawn: an insert left behind by a `/grains/` tab that was simply closed
goes on wrapping whatever `/keys/` plays and feeds its own delay. MEASURED
2026-09-12, a steady -6.1 dBFS subsonic drone while `board.alive` reported
`voices: 0`. It also kept one log line for the case where the board REFUSES,
because a diagram that says nothing in the one situation where it is wrong is a
confident lie.

🔴 **BOTH ARE GONE, AND THE GUARANTEE IS STRONGER FOR IT.** The instruction was
*"get rid of both"*. The argument above has a hole that it does not see: it makes
the guarantee depend on somebody opening `/keys/`, and nobody has to. A tab closed
at midnight left the board granulating itself until the next person happened to
load a page that sent one message.

**So the board cleans up after itself.** `sweepInsert()` in `board.mjs` runs on the
five-second heartbeat and again at the top of `startAudio()`: if the insert is in
and the client that asked for it has not been heard from inside
`INSERT_HELD_MS`, it comes out, and a `board.alive` carrying `insertState()` goes
out at once rather than on the next beat.

🔴 **A REAL SIGNAL WAS LOOKED FOR FIRST AND THERE IS NONE.** Read rather than
assumed. `workers/relay/src/index.js` forwards every frame verbatim and never
parses one, so its Durable Object does not know any client's `from`; its
`webSocketClose()` is an empty method; `openWire` in `demo/shell/wire.mjs` sends
no farewell. `/room/<name>/stats` reports per-socket idle times in an anonymous
sorted array, so it cannot say WHICH socket left.

🔴 **AND THE NUMBER IS CHECKED, NOT CHOSEN.** `/grains/` has one
`setInterval(…, 4000)` whose first line is `hello()`, sending `params.state`
unconditionally whenever the socket is open. 15 s is 3.75 of those polls, so one
or two lost to the relay's caps cost nothing, and a closed tab is zero.

So the shape is: **the page stops discussing the granulator entirely, and the
board takes responsibility for its own sound.**

---

## 3. The signal path once Pappus is out

Verified against `rig/board/jacksynth.mjs` and `rig/board/board.mjs`:

| step | what runs | where it is in the code |
|---|---|---|
| clock | `jackd -d dummy` | `JACK_SYNTHS` needs, `startJackSynth` |
| instrument | one of `fluidsynth` (JACK client, `FluidR3_GM.sf2`), `hexter` (under `jack-dssi-host`), `yoshimi` | `JACK_SYNTHS` |
| notes in | `snd-virmidi` character device, `aconnect`ed to the synth's ALSA sequencer port | `findVirmidi()`, step 5 |
| optional insert | `positron-space`, a **Csound** reverb and chorus (`csd/space.csd`) | `spaceFx()` |
| capture | `ffmpeg -f jack -i posbox -f s16le -ar 48000 -ac 1 -` | step 3, `jack_connect <port> posbox:input_1` |
| out | 960-sample frames over the relay WebSocket | `board.mjs` |

Two things this makes exact, and both go in the diagram:

- **JACK is the thing to name.** Every instrument on this page is a JACK client
  and the capture is a JACK client; the insert can only reach what is on that
  graph, which is why FluidSynth was moved onto it.
- **Many ports into one input SUM in JACK.** A stereo instrument is wired left
  and right into the same `posbox:input_1`, which is what mono-sum means here.

⚠️ **The reverb is in this path and is NOT being drawn.** It is a fifth box in a
container that is about to hold four, and nobody asked for it. Named here so the
next person does not have to re-derive that `positron-space` exists.

⚠️ **AND THE `archive` SOURCE THAT USED TO SIT IN THIS TABLE IS GONE,
2026-09-16.** It played ERR's 1965 radio archive into the JACK graph on
`-stream_loop -1`, so it never ended: ffmpeg into `snd-aloop`, `alsa_in` out the
other side as `err1965`. No page offered it, `/keys/`'s description stopped
claiming it weeks ago, and every connection this repo opens to ERR appears in a
public broadcaster's audience measurement. `archive/box-pappus/box-err.js` has
it, with `source.search`, `source.load` and `source.clear`.

---

## 4. What the sample collection is called

`rig/board/fluid.mjs`:

    export const DEFAULT_SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2';

and `drawInstruments()` in the page prefers the FluidR3 file over anything else
the board lists. So the `sampled` button plays **FluidR3 GM**: the 128 General
MIDI programs and a drum bank, 141 MB, loaded whole because FluidSynth has no
mmap and no disk streaming.

⚠️ **The BUTTON stays `sampled`.** The ask names the diagram, the button already
carries a comment explaining why it is one choice rather than one per file, and
a control labelled `FluidR3 GM` would ask a visitor to know what a soundfont is
before they can press it. The diagram is where the real name belongs, which is
where it was asked for.

---

## 5. The diagram, box by box

`Raspberry Pi` gains `set: true` and holds four children instead of three.

| label | sub | why |
|---|---|---|
| `FluidR3 GM` | `FluidSynth` | the collection, named |
| `hexter` | `DSSI, DX7` | four DX7 factory cartridges, 128 voices |
| `yoshimi` | `ZynAddSubFX` | it is a fork of one, with 911 patches here |
| `capture` | `ffmpeg, JACK` | the technical ask |

🔴 **THE SUBS HAVE TWELVE CHARACTERS, AND THAT IS THE LANES' DOING.** A
container insets its boxes by `CHILD_PAD + maxLanes * SIB_LANE` **from both
sides**, and `maxLanes` is a figure for the WHOLE picture rather than for one
machine. Two lanes take 96 px off every box in the diagram, which dropped the
sub budget from 154 px to 74. MEASURED: the first draft wrote
`FluidSynth, 141MB`, `DSSI, 128 voices`, `ZynAddSubFX fork` and `ffmpeg -f
jack`, and `dg.cuts` reported **all four** truncated. The quantities moved into
the notes, which is where there is room for them.

- `set: true` because the three instruments are **alternatives**, not a chain:
  exactly one is up at a time. Brackets say "parts of one machine", which is
  true; arrowheads between them would say `FluidR3 GM` feeds `hexter`, which is
  false.
- Three declared links, one per instrument, into `capture`. A declared link
  REPLACES the connector in the gap it crosses, so `yoshimi -> capture` takes
  the bracket in the gap they share and the other two run as lanes inside the
  container. `dg.ties` reads 2, which is the two bracketed gaps.
- The note arrow from Cloudflare lands on the **`Raspberry Pi` container**
  rather than on one instrument, because a note goes to whichever one is
  running. `createDiagram` resolves a link naming a machine to the machine.
- ⚠️ **"side by side" is as siblings, not left to right.** `diagram.mjs` stacks
  a container's children in one column; there is no horizontal option and adding
  one is a layout change across every page that draws a picture. Reported rather
  than silently approximated.

---

## 6. What gets archived

`archive/box-pappus/`, matching `archive/demos/` and `archive/videoradio-xr/`:

- `README.md`: what it was in this page, what it cost, what is NOT archived.
- `page-half.js`: the removed page code verbatim, in the order it stood.

Nothing under `rig/board/` moves. The archive records what `/keys/` used to draw
and say, not what the board can do.

---

## 7. Order of work

1. This file.
2. `archive/box-pappus/` with the removed code verbatim and its README.
3. `rig/board/listen.html`: the diagram, the insert reporting, the stale comments.
4. `demo/manifest.mjs`: the `one` line, which says "1965 radio, and a granulator
   over both" and is false on both counts.
5. Mirror `listen.html` into `workers/view/public/keys/index.html` and
   `manifest.mjs` into `workers/view/public/manifest.mjs`, by hand, byte for
   byte. No build, no deploy.
6. `node demo/check-html.mjs rig/board/listen.html`, and read `dg.cuts` out of a
   headless Chrome pointed at a DEAD relay (`?relay=ws://127.0.0.1:9`) so no
   room is joined and no board is touched.

### The second pass, 2026-09-16

1. `rig/board/listen.html`: the message, the flag, the log line, every mention.
   `grep -c pappus` must answer 0.
2. `rig/board/board.mjs`: `sweepInsert()`, on the heartbeat and at the top of
   `startAudio()`, so the guarantee lives where the sound does.
3. `rig/board/insert-test.mjs`: rewritten for the new rule, with the negative
   control that separates "cleans up after itself" from "drops it on a timer".
   **Not run.** It touches a shared instrument in another building.
4. The ERR archive out of `pappus.mjs`, `board.mjs` and `jacksynth.mjs`, into
   `archive/box-pappus/pappus-err.js` and `box-err.js`. `pappus-test.mjs` and
   `pappus-live.mjs` lose the sections that drove it.
5. Mirror `listen.html` into `workers/view/public/keys/index.html` by hand.
   No build, no deploy. ⚠️ `demo/manifest.mjs` was NOT touched this pass: its
   `one` line was already corrected in the first one, and another agent was
   editing that file.
6. `node demo/check-html.mjs` on both copies, `node --check` on every module,
   and `dg.cuts` at two widths against the dead relay again.

---

## 8. What a person has to do on the board

**For the first pass: nothing.** `/keys/` is served from this repo and from
`workers/view/public/`; the board ran `board.mjs` unchanged, and the removal was a
change to what a browser draws and asks for.

🔴 **FOR THE SECOND PASS: A PUSH, AND THE BOARD-SIDE CHANGE IS NOT TRUE UNTIL
IT HAPPENS.** `board.mjs`, `pappus.mjs`, `jacksynth.mjs`, `insert-test.mjs`,
`pappus-test.mjs` and `pappus-live.mjs` all changed. Until they are on the
board, the insert is still only cleared by a message that no page sends any
more, which is **worse than before this work**: `/keys/` has stopped policing it
and the board has not started. Sequenced, not simultaneous, and that is the one
thing to know before shipping the page without the board.

    cd rig/board && ./push.sh                 # finds the board, writes /opt, restarts
    ssh positron@<ip> md5sum /opt/positron-board/rig/board/board.mjs
    md5 -q rig/board/board.mjs                  # the two must match

⚠️ **THE SERVICE RUNS FROM `/opt/positron-board/`, NOT FROM `~/positron`.**
`provision.sh` unpacks into `~/positron` and `setup.sh` copies that to `/opt`;
the copy in `~/positron` is stale and has no `pappus.mjs` at all, so reading it
tells you nothing about what is running. `push.sh` writes to `/opt` directly and
prints the md5 of what landed, because "it deployed" and "it says it deployed"
have been different things here before.

⚠️ **AND A RESTART STOPS WHATEVER IS PLAYING.** `./push.sh --no-restart` ships
without that, and the new sweep then starts on the next restart rather than at
once.

---

## 9. Left open, on purpose

⚠️ **THE TWO EXCEPTIONS THIS SECTION USED TO NAME WERE BOTH DECIDED ON
2026-09-16 AND ARE DONE.** *"get rid of both"* took the message and the log
line; *"keep pi granulator for grains"* keeps the board's engine. What is left
open is below.

- 🔴 **`/keys/` has a diagram and a six-sentence `what`, and that `what` carries
  four em dashes.** CLAUDE.md says a page with a diagram carries a ONE line
  `what`, that it is the index's own `one` line verbatim, and that there are no
  em dashes anywhere a reader looks. This page breaks all of that today and it
  predates this work. Rewriting the paragraph would delete the only explanation
  of `buffer`, `lag` and `lost`, and fixing the punctuation without fixing the
  length is half a job. Named here rather than done quietly, because the two
  have to be done together.
- **The Browser and Cloudflare boxes got emptier.** Every container in the row
  is drawn to one height, so a fourth child on the Pi adds about 40 px of blank
  ground inside the other two. Visible on a phone, where the picture is one
  column. That is `diagram.mjs`'s deliberate equal-height rule and changing it
  reaches every page that draws a picture.
- **The reverb has no box**, see §3.
- **`/kit/` is not machine-graded and `/keys/` is `built: false`**, so the only
  thing that reports a bad label or an unroutable link on this page is its own
  log line off `dg.cuts`.


---

## 10. What was measured, and how

`/keys/` is `built: false`, so `demo/verify.mjs` never opens it and nothing turns
red. The diagram was read directly out of a headless Chrome pointed at the dev
server with **a dead relay**, `?relay=ws://127.0.0.1:9`, so no room was joined,
no board was asked anything and nothing outside this machine was touched.
`window.__dg()` is what the page already publishes.

| | `cuts` | `ties` | `mode` |
|---|---|---|---|
| before | 0 | 0 | row |
| first draft, long subs | **4** (every sub in the Pi truncated) | 2 | row |
| shipped | 0 | 2 | row |
| shipped, 390 px | 0 | 2 | column |

`node demo/check-html.mjs rig/board/listen.html workers/view/public/keys/index.html`
parses both copies. The two files are byte-identical, checked with `md5`.

### The second pass, 2026-09-16

Same method, same dead relay, same two widths, read with `window.__dg()` out of
a headless Chrome pointed at the dev server at `?relay=ws://127.0.0.1:9`. The
BEFORE column is the page as it stood at `141d7f3`, served from a temporary copy
so both readings came from one browser in one run.

| | `cuts` | `ties` | `mode` |
|---|---|---|---|
| before, 1280 px | 0 | 2 | row |
| before, 390 px | 0 | 2 | column |
| after, 1280 px | 0 | 2 | row |
| after, 390 px | 0 | 2 | column |

Nothing in this pass touched `createDiagram`, so 0 was expected. It was read
rather than assumed, because a comment removal that takes a neighbour's setup
line with it is exactly how the first pass broke the instrument row.

`grep -c pappus rig/board/listen.html` answers **0**, and the deployed copy
matches byte for byte. `node rig/board/pappus-test.mjs` is **23/23** with no
network at all, and `node rig/board/pappus-live.mjs --self-test` is **18/18**
with no relay and no board.

🔴 **`rig/board/insert-test.mjs` WAS REWRITTEN AND NOT RUN.** It touches a shared
instrument in another building and nobody had said the board was free.
