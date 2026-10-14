# rig-board-synth

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/board/bench.mjs`

### bench-header

Above `import { createSynth, RATE } from './synth.mjs';`, lines 1 to 8 before the cut.

~~~js
// rig/board/bench.mjs — how much of this board one instrument costs.
//
// synth.mjs claims a Pi 4 runs 8 voices at 3-4x realtime, derived from 41x on
// an M1 and a guess at the ratio between the chips. A guess in a comment is a
// claim nobody can check, so: run this on the board and the measured number
// replaces it.
//
//   node bench.mjs
~~~

## `rig/board/jacksynth.mjs`

### js-header

Above `import { spawn, execFileSync, execSync } from 'node:child_process';`, lines 1 to 14 before the cut.

~~~js
// rig/board/jacksynth.mjs — instruments that are JACK clients.
//
// Yoshimi is a JACK client and cannot write to a pipe, so this module builds
// the chain the container proved out:
//
//   jackd -d dummy          a clock, no hardware
//     -> yoshimi            the instrument
//     -> ffmpeg -f jack     capture, raw s16 on stdout, straight into the board
//
// MIDI IN is the other half, and it uses something setup.sh already loads.
// snd-virmidi gives four virtual ports that are BOTH an ALSA sequencer client
// and a raw character device: writing three bytes to /dev/snd/midiC<n>D0 emits
// them on sequencer port <client>:0, which `aconnect` then routes to the synth.
// So the board plays a JACK synth by writing raw MIDI bytes to a file.
~~~

### js-jack-mjs

Above `import { sourcesOf as alsaSourcesOf } from './alsa.mjs';`, lines 18 to 22 before the cut.

~~~js
// 🔴 EVERY JACK CONNECTION THIS FILE MAKES OR BREAKS GOES THROUGH `jack.mjs`
// SINCE 2026-10-11. There were 21 `jack_connect`/`jack_disconnect` shell
// strings here, each run blind with its output thrown away. Each re-patch is
// now a small document (`links` that must be there, `own` inputs whose whole
// feed it decides), planned against the graph, applied, and READ BACK.
~~~

### osc

Above `function oscPad(buf) {`, lines 29 to 36 before the cut.

~~~js
/**
 * A minimal OSC encoder. sclang listens on 57120 and run-pappus.scd installs an
 * OSCdef at /pappus/cmd, so this is the whole control channel for an engine
 * with 106 parameters — no library needed.
 *
 * OSC is: address, then a typetag string beginning with a comma, then the
 * arguments — every part null-terminated and padded to a multiple of four.
 */
~~~

### blob

Above `const isBlob = (a) => a instanceof Uint8Array;`, lines 43 to 45 before the cut.

~~~js
// A Uint8Array (a Buffer is one) is a BLOB, `b`: an int32 length, the bytes,
// padded to four. Added 2026-10-12 for `/d_recv` (`scollide.mjs`); no caller
// before then passed bytes, so every message they build is unchanged.
~~~

### ntp

Above `export function ntpTimetag(atMs) {`, lines 65 to 70 before the cut.

~~~js
/**
 * An OSC timetag for a moment in epoch milliseconds: `[seconds, fraction]`,
 * both uint32. The same arithmetic as `demo/shell/scsynth.mjs` `ntpOf` in the
 * tab, done in milliseconds so the fraction is not built from a float that has
 * already lost its last digits. `null` is OSC's "immediately", `[0, 1]`.
 */
~~~

### bundle

Above `export function oscBundle(timetag, messages) {`, lines 77 to 82 before the cut.

~~~js
/**
 * An OSC bundle: `#bundle`, the timetag, then each element as an int32 size and
 * its bytes. `messages` is `[[address, ...args], ...]`. scsynth runs a bundle
 * at its timetag on its own clock, so everything in one bundle starts in the
 * same sample (the choke and the hit, `scollide.mjs`).
 */
~~~

### ports

Above `const CAP_CLIENT = 'posboard';`, lines 102 to 114 before the cut.

~~~js
/**
 * The ports of this board's audio path, named ONCE.
 *
 * They were typed in three places: `startJackSynth` wired `posboard:input_1` as a
 * literal, `pappusFx` declared its own copies, and `sourceFeed` a third pair. A
 * port name typed twice is a report and a re-patch that can describe different
 * graphs, which is exactly the failure `jackGraph()` below exists to catch, so
 * the report and the wiring now read the same five strings.
 *
 * `posboard` is the ffmpeg capture's JACK client name: the frames a page HEARS
 * are whatever is summed into `posboard:input_1`, so that port is the end of the
 * chain and the one thing every question here is really about.
 */
~~~

### wire

Above `export function wire(doc, { onLog, what = 'jack' } = {}) {`, lines 120 to 134 before the cut.

~~~js
/**
 * Patch the graph to a document and say how it went. Never throws, because
 * none of the 21 commands it replaced could either: a refused plan or a link
 * that did not land is LOGGED and returned, and the caller decides.
 *
 * ⚠️ ONE DIFFERENCE FROM THE SHELL STRINGS, AND IT IS ON PURPOSE. A command
 * list touched only the links it named. A document that OWNS an input also
 * cuts any other source feeding it, which is what `jack.rebuild` already did
 * and what every comment in this file says the capture needs: a stray source
 * summed into `posboard:input_1` is indistinguishable from the instrument. On
 * the graph this board actually runs (read 2026-10-11) nothing else feeds
 * those inputs, so the difference is zero commands.
 * ⚠️ AND A PLAN NAMING A PORT THAT IS NOT THERE APPLIES NOTHING, where the old
 * strings ran the half that could run. That half was a graph nobody wrote down.
 */
~~~

### bay-rides

Above `const planned = jackPlan(withBay(doc, g.rows), g.rows);`, lines 138 to 139 before the cut.

~~~js
// 🔴 THE BAY'S LINKS RIDE ON EVERY RE-PATCH (see `setBayRows`), so a document
// that owns an input keeps a bay link into it instead of cutting it.
~~~

### bay-rows

Above `let bayRows = [];`, lines 152 to 169 before the cut.

~~~js
/**
 * 🔴 THE BAY'S JACK LINKS, AND WHO WINS AGAINST THE BOARD'S OWN CHAIN.
 * Decided 2026-10-11 (plans/plan-nodes-revisited.md §5 item 6, not answered by
 * the owner): A BAY LINK IS PART OF WHAT THE BOARD BELIEVES. Until then
 * `fx.pappus` and `jack.rebuild` owned the capture and the granulator's inputs
 * and would cut anything they did not name, so the Circuit patched into the
 * granulator from a page would have lasted until the next press of the
 * granulator's switch. Now `board.mjs` keeps the rows of every bay link it
 * applied here, `wire()` adds them to every document it patches, and
 * `jackChain` counts them as wanted, so a rebuild puts them back rather than
 * taking them out.
 * ⚠️ A ROW WHOSE PORT IS NOT ON THE GRAPH IS SKIPPED, NOT REFUSED. The
 * granulator going away does not unmake the link; it comes back with the
 * granulator, because the re-patch that raises it carries the row.
 * ⚠️ IN MEMORY ONLY. A service restart forgets every bay link, which is the same
 * as every other piece of state this board holds (the insert, the source), and
 * a page that wants one back makes it again.
 */
~~~

### standing

Above `const standing = new Map();`, lines 173 to 182 before the cut.

~~~js
/**
 * 🔴 AN ENGINE THAT SOUNDS BESIDE THE INSTRUMENT, SINCE 2026-10-11 (option b of
 * plans/plan-sampler-pi-pico.md §2.2). The SuperCollider sampler sums into the
 * capture next to Yoshimi, and every document here that OWNS the capture
 * (`pappusFx`, `jack.rebuild`) would otherwise cut it as a stray. So an engine
 * names its standing links once, by name, and they ride on every re-patch
 * exactly as a bay link does: wanted by `jackChain`, kept by `wire()`.
 * ⚠️ NOT A BAY LINK. A page's `jack.unlink` and `setBayRows` cannot remove one;
 * only the engine that set it, by setting its name to `[]` when it stops.
 */
~~~

### card

Above `let CARD = null;`, lines 196 to 212 before the cut.

~~~js
/**
 * 🔴 jackd ON THE CARD, SINCE 2026-10-11. With the dummy driver jackd keeps
 * time off the Pi's timer and `alsa_in` resamples the Fast Track Pro's own
 * clock into it, adaptively, forever. MEASURED that day through the relay,
 * the same note burst each time: `arecord` read a floor of -80.5 dBFS and an
 * HF share of 0.04; `alsa_in` read -80.1 and 0.15 just after a restart, and
 * -18.8 and 0.14 some minutes later, which the owner called *"supernoisy"*.
 * Two clocks and a resampler between them. With jackd on the card there is
 * one clock and nothing to resample.
 *
 * `card` is the input configured `"jackd": ...` in BOARD_INPUTS
 * (`inputs.mjs`), set once at startup by board.mjs. CAPTURE ONLY (`-C`):
 * no `system:playback_*` exists, so neither Yoshimi nor scsynth can send
 * anything to the card's outputs, which carried nothing before either.
 * ⚠️ `-r` TWICE IS NOT A TYPO: before `-d` it is jackd's `--no-realtime`
 * (this service has `ulimit -r` 0), after it the driver's rate.
 */
~~~

### no-reservation

Above `export const JACKD_ENV = { JACK_NO_AUDIO_RESERVATION: '1' };`, lines 219 to 224 before the cut.

~~~js
/**
 * ⚠️ JACK_NO_AUDIO_RESERVATION, MEASURED 2026-10-11 ON THE FIRST TRY: jackd
 * asks the D-Bus session bus to reserve the card, a service has no session
 * bus, and it gave up with `Audio device hw:CARD=Pro,DEV=0 cannot be
 * acquired`, exit 255, and the board fell back to the dummy clock.
 */
~~~

### ensure-jackd

Above `export async function ensureJackd({ onLog } = {}) {`, lines 243 to 248 before the cut.

~~~js
/**
 * jackd, raised if JACK does not answer. Shared by the instrument chain and by
 * the hardware inputs on JACK (`inputs.mjs` `via: "jack"`), which need a server
 * before any instrument has been asked for.
 * Answers `card`: the input whose card is the clock, or null on the dummy one.
 */
~~~

### ask-jack

Above `if (sh('jack_lsp 2>/dev/null').trim()) {`, lines 250 to 253 before the cut.

~~~js
// Ask JACK, not the process table. `pgrep -x jackd` reports a server this
// process may not be able to REACH, in a different mount namespace or as a
// different user, and skipping the start on that basis leaves every client
// unable to connect. jack_lsp answers the question actually being asked.
~~~

### card-first

Above `for (const card of CARD ? [CARD, null] : [null]) {`, lines 261 to 263 before the cut.

~~~js
// ⚠️ THE CARD FIRST AND THE DUMMY CLOCK SECOND. A card that is unplugged or
// held by something else must not cost Yoshimi its server; the input then
// falls back to `alsa_in`, which says so in the log.
~~~

### jack-synths

Above `export const JACK_SYNTHS = {`, lines 302 to 323 before the cut.

~~~js
/**
 * The instruments this module knows how to raise.
 *
 * 🔴 ONE INSTRUMENT, SINCE 2026-09-16. FluidSynth and hexter stood here and are
 * at `archive/box-fluidsynth-hexter/`. The reason is the graph rather than the
 * code: there is ONE jackd, ONE capture and ONE room on this board, so whatever
 * is up is what every listener on every page hears, and a second instrument is
 * a way to take the sound away from somebody in another building. `/knobs/`
 * cannot work at all without yoshimi's filter, and it was found refusing to
 * start because somebody had pressed a button on another page.
 *
 * ⚠️ The INSERT — pappus — is deliberately not a key here.
 * Everything in this table is offered to clients as an instrument. They live
 * further down, by the code that raises it: `pappusFx()`.
 *
 * ⚠️ Pappus is NOT an instrument and is not in this table any more. It
 * granulates its INPUT, so as an instrument it faithfully processed silence,
 * and shipping it beside yoshimi made it look like a second sound source that
 * happened to be identical to the first. It is an EFFECT — see `pappusFx()`
 * below, which inserts it between whatever is playing and the capture, and can
 * be switched on and off under a running instrument.
 */
~~~

### empty

Above `// 🔴 AN 'archive' SOURCE STOOD HERE AND LEFT ON 2026-09-16. It played ERR's`, lines 325 to 329 before the cut.

~~~js
// 🔴 EMPTY OF YOSHIMI SINCE 2026-10-13, AND LEFT IN PLACE ON PURPOSE. Asked:
// *"discard yoshimi. with possiblity to do dual setup in future"*. Its entry
// and `YOSHIMI_ARGS` are verbatim in archive/yoshimi/jacksynth-entry.mjs, and
// archive/yoshimi/README.md says how to put them back. `startJackSynth` and
// this table stay, so a JACK synth is one entry again.
~~~

### archive-source

Above `};`, lines 331 to 335 before the cut.

~~~js
// 🔴 AN `archive` SOURCE STOOD HERE AND LEFT ON 2026-09-16. It played ERR's
// 1965 radio archive into the JACK graph: ffmpeg into `snd-aloop`, `alsa_in`
// out the other side as `err1965`, on `-stream_loop -1`, so it never ended.
// No page offered it, and every connection this repo opens to ERR appears in
// a public broadcaster's audience measurement. `archive/box-pappus/` has it.
~~~

### pappus-fx

Above `let pappusProc = null;`, lines 338 to 375 before the cut.

~~~js
/**
 * Pappus as an INSERT, not an instrument.
 *
 * Off:  instrument L+R -> posboard (the capture)
 * On:   instrument L+R -> SuperCollider:in_1/in_2 ... out_1/out_2 -> posboard
 *
 * The engine keeps running while it is bypassed, because it takes half a
 * minute to compile a 2,030-line class library and nobody wants that between
 * two presses of a button. Bypassing is a re-patch, which is instant.
 *
 * 🔴 BOTH CHANNELS, AND THE RIGHT ONE WAS BYPASSING THE INSERT ENTIRELY UNTIL
 * 2026-09-13. `startJackSynth` connects an instrument's LEFT AND RIGHT ports to
 * `posboard:input_1`, deliberately — many ports into one input sum in JACK, and
 * that mono-SUM is what makes a capture of a stereo instrument honest (see the
 * comment there: mono-left read a note as 1661 Hz where mono-sum read 2029 Hz).
 * This function then disconnected only the LEFT one and inserted only the LEFT
 * one, so with the granulator switched on a page heard
 *
 *     the granulator's left output  +  the instrument's right channel, DRY
 *
 * MEASURED on the board, `jack_lsp -c`: `posboard:input_1` had two sources,
 * `yoshimi:right` and `SuperCollider:out_1`. Two things follow. The insert
 * could never be heard on its own — every measurement of "what does this
 * granulator do" taken through this capture had the dry instrument summed into
 * it — and the granulator was being FED in mono-left, which is the exact defect
 * the capture comment was written about, one stage upstream.
 *
 * ⚠️ It also fits the open puzzle of 2026-09-12, recorded in `grains`: no
 * granulator parameter could be shown to change the returned audio, and "the
 * envelope NEVER dropped below a quarter of its own median at any setting". A
 * dry instrument summed under a grain cloud is exactly that shape. That is a
 * consistent explanation and not a proof, and it is written here as the first
 * thing to re-run rather than as a finding.
 *
 * The reverb insert that used to live below had this right all along: it
 * patched `port` AND `portR`, which is why the two inserts disagreed about what
 * a page could hear.
 */
~~~

### pappus-ready

Above `let pappusReady = false;`, lines 377 to 400 before the cut.

~~~js
/**
 * ⚠️ A JACK PORT IS NOT A READY ENGINE, AND THE GAP IS SEVEN SECONDS.
 *
 * `SuperCollider:out_1` appears as soon as scsynth boots; the 2,030-line engine
 * class is compiled and its 106 commands registered several seconds LATER, and
 * sclang answers an unknown command with nothing at all. So waiting on the port
 * returned ok while every command sent afterwards fell into a void — measured
 * from the board's own log: `pappus inserted` at 05:38:59.8, a minute of 1965
 * loaded at 05:39:03.5, and `PAPPUS READY` only at 05:39:06.0. The load, the
 * buffer lock and the gates were all sent 2.6 s before anything could receive
 * them, with no error anywhere, and the page said the material was loaded.
 *
 * The engine prints `PAPPUS READY` when it means it. That is the signal.
 *
 * ⚠️ AND IT PRINTS IT LAST, since 2026-09-13 — because "it means it" turned out
 * to need one more thing. The line used to go out at the TOP of the engine
 * callback, and `run-pappus.scd`'s own startup Routine then waited a second and
 * set `mrate 0.5`, `msrc 2`, `amp`, `ingain` and `run` on top of whatever the
 * client had sent in that second, since the client had been told it could start.
 * MEASURED: `grains` asked for 2.2 grains a second on a cold board and the
 * engine reported 0.5, which is that file's own default arriving late. It failed
 * only on the FIRST visit after a restart, which is the visit nobody is
 * watching. Anything moved into that Routine has to stay above the line.
 */
~~~

### no-autoconnect

Above `env: { ...process.env, XDG_RUNTIME_DIR: rt, QT_QPA_PLATFORM: 'offscreen', QTWEBE`..., lines 427 to 432 before the cut.

~~~js
// ⚠️ NO AUTOCONNECT, SINCE jackd CAN OWN A CARD (2026-10-11). scsynth
// patches itself to the PHYSICAL ports unless told otherwise, and with
// jackd on the Fast Track Pro the physical capture IS the Circuit, so the
// granulator would hear it with nobody having asked. Every link into
// `SuperCollider:in_*` is this file's or a bay link's to make. A pattern
// that names no port connects nothing.
~~~

### adopted

Above `pappusReady = true;`, lines 457 to 460 before the cut.

~~~js
// Somebody else's sclang, or one this process started before a restart:
// its stdout is not ours to read, and it has been up long enough to have
// finished compiling. Treat that as ready rather than waiting forever for
// a line that will never arrive on this pipe.
~~~

### insert

Above `const w = wire({ v: 1,`, lines 464 to 478 before the cut.

~~~js
// Insert it: the instrument stops feeding the capture directly and feeds
// Pappus instead, and Pappus feeds the capture. ⚠️ BOTH CHANNELS EACH WAY —
// see the header. A right channel left on the capture is a dry instrument
// under everything the insert does; a right channel not patched to `in_2` is
// a granulator fed in mono-left.
//
// ⚠️ AND THE GRANULATOR'S OWN RIGHT CHANNEL, for the same reason one stage
// down: Pappus pans (SPRAY, TILT and the delay taps all place things in the
// stereo field), so capturing only `out_1` drops whatever it put on the right.
// Many ports into one input sum in JACK, so this is the mono-SUM the capture
// comment in `startJackSynth` argues for, applied to the thing that is
// actually playing.
//
// With no instrument the inputs are not owned: the old commands then only
// connected the return, and cutting anything here would be new behaviour.
~~~

### source-feed

Above `export function sourceFeed(on, { instrumentPort, instrumentPortR, onLog } = {}) `..., lines 492 to 508 before the cut.

~~~js
/**
 * Take the instrument OUT of the granulator's input, or put it back.
 *
 * 🔴 THE SOURCE AND THE INSTRUMENT CANNOT BOTH BE IN THERE. `PosSource.sc`
 * writes to scsynth's own input bus, and scsynth fills that bus from JACK at the
 * top of every block — so with `<instrument> -> SuperCollider:in_1` still
 * patched, the granulator chews the SUM of the two. That is not "the same input
 * at both ends" (plan-twins §4a), it is a third material neither end can
 * describe, and it would read as the comparison being noisy rather than as the
 * wiring being wrong.
 *
 * ⚠️ AND THE INSTRUMENT IS NOT STOPPED, IT IS UNPLUGGED. `posboard` — the ffmpeg
 * capture whose frames are the audio a page hears — is raised as part of the
 * instrument's own chain, so `audio.stop` would take the sound of the result
 * away along with the material. Disconnecting one JACK link leaves the capture
 * where it is, and `pappusFx` still owns the other end of the insert.
 */
~~~

### pairs

Above `const pairs = [[instrumentPort, SCIN], ...(instrumentPortR ? [[instrumentPortR, `..., lines 511 to 519 before the cut.

~~~js
// `on` here means "the generated source is the material", so the INSTRUMENT
// is disconnected. Named for what is being asked for rather than for what is
// done to the wire, because every caller is asking the first question.
// ⚠️ BOTH CHANNELS. Unplugging only the left one leaves the right one in the
// granulator's buffer, which is not "the same input at both ends" — it is the
// page's material plus half an instrument, and it would read as the
// comparison being noisy rather than as the wiring being wrong.
// ⚠️ IT OWNS ONLY THE GRANULATOR'S INPUTS and never the capture, so the
// insert's return stays exactly where `pappusFx` put it.
~~~

### roll-moved

Above `/**`, lines 539 to 549 before the cut.

~~~js
/**
 * The granular roll and the drift moved to `pappus.mjs` — one implementation,
 * seeded, in named characters, and with four mode ranges corrected against the
 * engine. The version that lived here rolled `scanmode`, `spraymode` and
 * `swarmmode` 0..2 where the engine indexes `mode - 1` over four-element
 * arrays, so mode 4 was unreachable on all three; `contour` 1..8 of 17; and its
 * chord selector was always-true, so the major chord was dead code.
 *
 * `pappusOsc` below stays: it is the panic path, which has nothing to do with
 * rolling anything.
 */
~~~

### panic

Above `export function pappusPanic() {`, lines 551 to 558 before the cut.

~~~js
/**
 * Silence the insert as well as the instrument.
 *
 * A MIDI all-notes-off reaches the synth and nothing else — but Pappus holds a
 * ring buffer of captured audio, eight delay taps and a reverb tail, all of
 * which keep sounding after every note has stopped. `bufclear` and `delayclear`
 * are its own commands for exactly this.
 */
~~~

### rtime

Above `pappusOsc('rtime', 0.2);`, lines 562 to 563 before the cut.

~~~js
// The reverb has no clear, so collapse its time and let it fall silent, then
// restore it — dropping `amp` instead would mute the instrument as well.
~~~

### kill-pids

Above `for (const pid of pappusScsynthPids(sh('pgrep -ax scsynth 2>/dev/null'))) sh('ki`..., lines 572 to 576 before the cut.

~~~js
// ⚠️ NOT `pkill -x scsynth` ANY MORE, SINCE 2026-10-11. The board runs a
// second scsynth for the sampler (`scsampler.mjs`), and a name match would
// take somebody's piano away with the granulator. Every scsynth but the ones
// listening on `KEEP_SC_PORTS` (the sampler's, and since 2026-10-12 the page
// programs' `poscollide`), by pid.
~~~

### keep-ports

Above `export const KEEP_SC_PORTS = Object.freeze([SAMPLER_SC_PORT, COLLIDE_SC_PORT]);`, lines 585 to 592 before the cut.

~~~js
/**
 * 🔴 EVERY scsynth THE GRANULATOR DOES NOT OWN, AS A LIST. It was one port, the
 * sampler's, until 2026-10-12, when `scollide.mjs` added a third server on
 * 57131 that a granulator switch would otherwise have killed
 * (plans/plan-pi-supercollider-defs.md §1.4). The collide port is kept whether
 * or not that server is running, and whichever engine `scollide.mjs` chose: a
 * port nobody listens on matches no pid, so keeping it costs nothing.
 */
~~~

### scsynth-pids

Above `export function pappusScsynthPids(pgrepAx, keepPorts = KEEP_SC_PORTS) {`, lines 594 to 599 before the cut.

~~~js
/**
 * The scsynth pids `stopPappus` may kill, read off `pgrep -ax scsynth`: every
 * one except a server started with `-u <port>` for a port in `keepPorts`. Pure,
 * so the one line that decides whose sound stops is graded without a board.
 * A single number is still taken, as one port.
 */
~~~

### graph

Above `/** 'jack_lsp -c' and what can be read beside it, as an object. */`, lines 612 to 631 before the cut.

~~~js
// ── looking at the graph, and putting it back ────────────────────────────────
//
// 🔴 NOTHING ON THIS BOARD EVER REPORTED THE JACK AUDIO GRAPH, AND THAT IS
// WHERE ITS LEVEL FAULTS LIVE. `ports.get` answers with the ALSA SEQUENCER,
// which is MIDI, so the audio path was visible only over ssh. The board dials
// OUT to the relay and answers verbs from any network; `ssh <user>@<pi>` needs
// the studio LAN. So on 2026-09-17 the output peak fell from 0.0445 to 0.0010,
// about 40x, with the page, the MIDI level and the instrument each ruled out by
// measurement, and the one remaining suspect was the one thing nobody outside
// the building could look at.
//
// ⚠️ THE REPORT COMES FIRST AND IT CHANGES NOTHING. `jackGraph` and `jackChain`
// only read. `jackRebuild` is the only thing here that writes, and it writes
// the DIFF rather than re-running a sequence of commands: see its own comment
// for why that is what makes it safe to send at a board somebody else is
// listening to.
// ⚠️ IT HAS RUN ON THE BOARD SINCE 2026-10-11. Written 2026-09-18 from a
// laptop that could not reach it; the parser moved to `jack.mjs` that day and
// is graded against `jack_lsp` text captured off the Pi
// (`fixtures/jack-lsp-c-pi.txt`, `fixtures/jack-lsp-cpt-pi.txt`).
~~~

### lsp-pt

Above `const graph = listJack().rows;`, lines 639 to 640 before the cut.

~~~js
// `-p -t` as well since 2026-10-11, so every row says its direction and
// type; a bare `-c` row is the same row without them.
~~~

### server

Above `const server = graph.length ? 'up' : 'down';`, lines 642 to 645 before the cut.

~~~js
// An empty listing means NO SERVER rather than no ports, and that is this
// file's own established reading: `startJackSynth` decides whether to raise
// jackd on exactly this test, and its comment says why it asks JACK rather
// than the process table.
~~~

### procs

Above `const procs = {};`, lines 648 to 658 before the cut.

~~~js
/**
 * How many of each, so a graph that looks right can still be shown to be the
 * wrong one. Two yoshimis and the capture is patched to whichever registered
 * its port first; a scsynth that outlived a service restart keeps its ports
 * and answers nobody. `sweepOrphans()` in board.mjs exists for that and runs
 * only at startup, so a board that has been up for a week has never swept.
 *
 * ⚠️ `pgrep -cx`, NEVER `-f`. CLAUDE.md, and it cost twenty minutes twice:
 * `pgrep -f <pattern>` matches the asking command's own line and answers
 * about itself.
 */
~~~

### jackd-line

Above `const jackd = sh('pgrep -ax jackd 2>/dev/null').split('\n')[0]?.trim() || null;`, lines 664 to 671 before the cut.

~~~js
// ⚠️ `-a` ADDS THE COMMAND LINE; THE MATCH IS STILL `-x`, on the name. Worth
// having because the rate and the period the server was started with are in
// it, and everything downstream assumes them: the capture asks ffmpeg for
// `-ar 48000` whatever jackd is actually running at.
// ⚠️ DECLARED, NOT MEASURED. This is what jackd was ASKED for on its command
// line, which is not necessarily what it settled on, and a server somebody
// else started is in this string too. Anything wanting the truth has to ask
// the server.
~~~

### chain

Above `export function jackChain({ instrumentPort, instrumentPortR, insert = false, sou`..., lines 689 to 703 before the cut.

~~~js
/**
 * What the graph SHOULD be for the thing that is playing, and what it is.
 *
 * 🔴 THE WIRING WRITTEN AS A FACT, ONCE, RATHER THAN AS TWO SEQUENCES OF
 * COMMANDS. `startJackSynth` step 4 and `pappusFx` each build this chain by
 * running connects in an order; neither can answer "is it still like that?"
 * afterwards, and until now nothing could. The edge list below is the same
 * wiring stated as what must be true, so the report and the repair share one
 * description and a third copy cannot drift.
 *
 * The scope is deliberately narrow: the edges into the two SINKS this board's
 * audio path has, the capture and the granulator's inputs. `system:playback_*`,
 * a monitor, anything a person patched by hand elsewhere on the graph, are none
 * of this function's business and are neither reported as wrong nor touched.
 */
~~~

### unplugged

Above `if (!source) {`, lines 719 to 724 before the cut.

~~~js
// ⚠️ WITH GENERATED MATERIAL THE INSTRUMENT IS DELIBERATELY UNPLUGGED,
// so a rebuild must not put it back. scsynth fills its input bus from
// JACK at the top of every block, so an instrument still patched to
// `SuperCollider:in_1` is SUMMED with `PosSource`'s output and the
// granulator chews a third material neither end can describe. That is
// what `sourceFeed` exists to prevent.
~~~

### bay-wanted

Above `for (const r of bayOnGraph(rows)) if (!want.some(([f, t]) => f === r.from && t =`..., lines 733 to 734 before the cut.

~~~js
// The bay's links are wanted too, since 2026-10-11 (`setBayRows`), so a
// rebuild puts a page's link back rather than cutting it as a stray.
~~~

### sinks

Above `const sinks = [CAP, ...(present(SCIN) ? [SCIN, SCIN2] : [])];`, lines 737 to 741 before the cut.

~~~js
// Anything ELSE feeding those sinks. This is the half that re-running the
// connect commands can never find: a link that should not be there sums into
// the capture, and nothing downstream can tell it from the instrument. The
// granulator's inputs are swept whenever its ports exist at all, insert on or
// off, because `pappusFx(false)` disconnects them for the same reason.
~~~

### chain-doc

Above `const doc = { v: 1, links: want.map(([from, to]) => ({ from, to })), own: sinks `..., lines 743 to 744 before the cut.

~~~js
// ⚠️ THE CHAIN IS A `jack.mjs` DOCUMENT, so the report here and the repair
// in `jackRebuild` read one description through one diff.
~~~

### rebuild

Above `export function jackRebuild({ instrumentPort, instrumentPortR, insert = false, s`..., lines 762 to 790 before the cut.

~~~js
/**
 * Put the graph back, and nothing else.
 *
 * 🔴 IT IS A DIFF, NOT A TEARDOWN, AND THAT IS THE WHOLE SAFETY ARGUMENT. This
 * board has ONE jackd, ONE capture and ONE room, and the relay forwards
 * verbatim, so a recovery verb is heard by whoever is listening in another
 * building. A graph that is already right therefore runs ZERO commands and
 * nobody hears anything; the only thing this can ever cut is a link that should
 * not be there, and the only thing it can ever add is a link that should.
 *
 * ⚠️ IT KILLS NOTHING. No `pkill`, no restart of jackd, yoshimi or sclang, and
 * no service restart. Every step is one `jack_connect` or `jack_disconnect`,
 * which this file already relies on being instant: bypassing the insert under a
 * playing instrument is the same operation and is a re-patch rather than a
 * rebuild of anything. An instrument picker was removed from this board for
 * being a control that took the sound away from somebody else, and a verb that
 * killed a process to recover a patchbay would be that control wearing a
 * recovery label.
 *
 * ⚠️ DISCONNECT FIRST, THEN CONNECT, WHICH IS THE ORDER `pappusFx` ALREADY
 * USES. It costs a gap of a few milliseconds in the capture where a wrong
 * source is removed before the right one lands, and the alternative is a moment
 * with both live, which is the louder wrong and is the shape of the mono-sum
 * bug this file has already paid for once.
 *
 * ⚠️ `plan: true` RUNS NOTHING and returns the same steps. Every verb that
 * changes this rig has a twin that changes nothing (`patch.plan` against
 * `patch.apply`), because a wrong patch is SILENT and a plan is not.
 */
~~~

### graph-arg

Above `const before = jackChain({ ...at, graph });`, lines 794 to 796 before the cut.

~~~js
// ⚠️ `graph` IS FOR THE PLAN PATH AND FOR THE TESTS. The APPLIED path reads
// the graph back itself below, because the whole value of `after` is that it
// was measured after the commands ran rather than predicted before them.
~~~

### text

Above `const ran = jackApply(planned, { read: () => [] }).ran;`, lines 819 to 821 before the cut.

~~~js
// ⚠️ THE TEXT TRAVELS, NOT A BOOLEAN. `jack_connect` answers non-empty on
// failure AND on "already connected", and exits 1 for both (MEASURED on the
// board 2026-10-11), so no exit status here tells them apart.
~~~

### ok

Above `const after = jackChain(at);`, lines 825 to 827 before the cut.

~~~js
// 🔴 `ok` IS THE GRAPH READ BACK, NOT THE COMMANDS HAVING RUN. Printing "ok"
// is not evidence (CLAUDE.md); a `jack_connect` to a port that vanished
// between the read and the write answers on stderr and changes nothing.
~~~

### reverb-gone

Above `/**`, lines 834 to 843 before the cut.

~~~js
// 🔴 THE REVERB INSERT IS GONE, 2026-09-17, ON INSTRUCTION: *"Rm chorus reverb
// from keys ui and board"*. What stood here was `positron-space`, a Csound
// insert on the JACK graph that passed the dry signal and added a tail, driven
// from `/keys/` by `fx.space`. It and its orchestra are at
// `archive/keys-space/`.
//
// ⚠️ PAPPUS IS NOT AFFECTED and is deliberately still here. The two were
// opposite kinds of insert on one graph and only ever one at a time; what is
// left is the grain cloud that `/grains/` drives, along with `sweepInsert()`,
// which is what stops an insert outliving the page that asked for it.
~~~

### stray-midi

Above `export function strayMidiSources(listing, client, virmidiClient) {`, lines 845 to 849 before the cut.

~~~js
/**
 * Every source feeding sequencer client `client` that is not the board's
 * virmidi port. Empty is the healthy answer; with no virmidi at all, every
 * source is a stray, because then nothing the board sends can be among them.
 */
~~~

### step-1

Above `{`, lines 873 to 885 before the cut.

~~~js
// 1. a clock with no hardware
// Ask JACK, not the process table. `pgrep -x jackd` reports a server this
// process may not be able to REACH — a different mount namespace, a different
// user — and skipping the start on that basis leaves every client unable to
// connect. jack_lsp answers the question actually being asked.
// ⚠️ jackd is NOT in `procs`. It is a shared server that outlives any one
// instrument, and having it in the teardown list meant every instrument
// switch killed the server the next instrument was about to need — which
// presented as "registered no JACK port", three processes downstream.
//
// And ask JACK, not the process table: `pgrep -x jackd` reports a server this
// process may not be able to REACH, and skipping the start on that basis
// leaves every client unable to connect.
~~~

### step-3

Above `// 3. the instrument`, lines 891 to 896 before the cut.

~~~js
// ⚠️ STEP 2 WAS A FEEDER AND IT LEFT WITH hexter, 2026-09-16. A def could
// declare `feeder: '<another key>'`, which raised that instrument first and
// patched it into this one's inputs, for a source that PROCESSES rather than
// generates. Exactly one def ever declared one and its feeder was hexter, so
// the mechanism had no second user and no way to be exercised.
// `archive/box-fluidsynth-hexter/board-half.js` has it.
~~~

### spawn-all

Above `const spawned = def.spawnAll ? def.spawnAll(opts) : [def.spawn(opts)];`, lines 898 to 907 before the cut.

~~~js
// 3. the instrument
//
// `spawnAll` rather than `spawn` for a source that is more than one process.
// ⚠️ NOTHING IN THE TABLE USES IT TODAY. The source that did was the ERR
// archive, which needed ffmpeg decoding into a loopback card and `alsa_in`
// bridging that card into JACK, because ffmpeg has NO JACK MUXER (`ffmpeg
// -devices` lists jack as `D`, a demuxer, only). It is kept because the shape
// is right for anything played from a file or a network: whichever process
// registers the JACK port `portMatch` finds is the thing that gets patched,
// exactly like a synth's output.
~~~

### say

Above `const say = (raw) => {`, lines 912 to 923 before the cut.

~~~js
// ⚠️ FORWARD STDOUT TOO. sclang reports through `postln`, which is stdout —
// so "PAPPUS READY" and every engine error were being collected into a
// variable nobody read, and the board looked like it had started something
// that silently did nothing.
// ⚠️ STRIP THE PROMPT, DO NOT MATCH ON IT. Yoshimi's CLI writes `yoshimi> `
// continuously and PREFIXES its real output with it, so a filter that only
// dropped `@ Top` left thousands of bare prompts in the journal — and the
// lines worth having were hiding behind one:
//     yoshimi> Main Part 1 loaded 0001-DX Rhodes 1
//     yoshimi> Main Part 1 load FAILED No instrument at 6 in this bank
// which is Yoshimi saying exactly whether a patch change landed. Peel the
// prompts off, then drop what is left only if it is empty or a context line.
~~~

### exit

Above `pr.on('exit', (code, sig) => {`, lines 932 to 937 before the cut.

~~~js
// ⚠️ SAY WHEN ONE OF THEM DIES. A source is more than one process now, and
// the one that makes the sound is not the one that holds the JACK port. A
// bridge such as `alsa_in` keeps its port registered whether or not
// anything is being written to the card behind it, so a dead writer
// presents as a perfectly healthy graph carrying digital silence. That is
// this project's oldest failure shape and the only defence is to report it.
~~~

### warmup

Above `const ceiling = def.warmup ?? 6000;   // Yoshimi's 13 s is 'warmup' on its archi`..., lines 943 to 957 before the cut.

~~~js
// ⚠️ POLL FOR THE PORT; DO NOT SLEEP A GUESSED AMOUNT. This line used to be
// `await wait(def.warmup ?? 6000)` — and twenty lines above, about jackd,
// this same file already says why that is wrong: "2.5 s was enough on a warm
// board and not on a cold one, which is the worst kind of timing constant."
// The lesson was written down and not applied to the line below it.
//
// It cost nine and a half seconds on every switch to an instrument that was
// ready in one. MEASURED while there were three instruments: a warm switch
// took 9540 ms against a pipe path's 725 ms, and almost all of it was
// 6000 + 2500 + 600 of sleeping.
// The warmup is now a CEILING rather than a duration.
//
// `settle` is for an instrument that registers its port before it can play —
// yoshimi loads 911 instruments across 24 banks after it appears on the graph
// — and it is waited only after the port is actually there.
~~~

### capture

Above `await ensureCapture(name, { onFrame, onLog });`, lines 968 to 970 before the cut.

~~~js
// 3. capture: raw s16 on stdout, read straight into the frame pump.
// ⚠️ SHARED SINCE 2026-10-11 (`ensureCapture` below): the sampler sums into
// the same capture, so this instrument holds it rather than owning it.
~~~

### port-r

Above `let portR = null;`, lines 976 to 982 before the cut.

~~~js
// ⚠️ AND THE RIGHT CHANNEL, WHICH WAS GOING NOWHERE. `portMatch` finds ONE
// port, and for a stereo instrument that is the left one — so the capture was
// mono-LEFT rather than mono-SUM and everything panned right was silently
// absent. Measured on the same note through the same soundfont: the pipe path
// (which averages the two channels) read 2029 Hz, the JACK path 1661 Hz, an
// apparent 0.29-octave difference that was not the transport at all. Many
// ports into one input SUM in JACK, which is what mono-sum means.
~~~

### additive

Above `const wired = wire({ v: 1, links: [l(port, CAP), ...(portR ? [l(portR, CAP)] : [`..., lines 988 to 989 before the cut.

~~~js
// ⚠️ ADDITIVE, NOT OWNED: these two lines only ever added, and whatever else
// the capture had was left alone. `jack.rebuild` is what cuts a stray.
~~~

### step-5

Above `// 5. MIDI in, through virmidi`, lines 992 to 996 before the cut.

~~~js
// ⚠️ THE FEEDER'S OWN PATCH WAS HERE and left with step 2 above. It joined
// the feeding instrument to `SuperCollider:in_1`, which is a HARDWARE input:
// Pappus reads `In.ar` there, and a private bus would have had it granulating
// silence. `pappusFx()` further down does that join for the running
// instrument and is untouched.
~~~

### strays

Above `const strays = alsaClient ? strayMidiSources(sh('aconnect -l'), alsaClient, vm?.`..., lines 1011 to 1014 before the cut.

~~~js
// ⚠️ AND THE VIRMIDI PORT IS ITS ONLY SOURCE. Yoshimi on `Search` subscribed
// itself to the Circuit, which made the board's own raw read of it EBUSY
// (yoshimi.mjs `externalMidi`). The instance edit stops that; this cuts any
// stray that survives it, by name in the log, so it cannot come back silently.
~~~

### osc-cmd

Above `const midi = (bytes) => { if (midiFd !== null) { try { writeSync(midiFd, Buffer.`..., lines 1020 to 1026 before the cut.

~~~js
// ⚠️ STEP 7 WAS `def.osc` AND IT LEFT WITH hexter TOO. It sent DSSI OSC to a
// plugin host once the instrument was up, which is how hexter loaded its four
// factory DX7 cartridges and chose a program. Yoshimi is not a plugin and
// reads its own banks off the disk, so nothing is left to say afterwards.
// ⚠️ `def.oscCmd` BELOW IS A DIFFERENT CHANNEL and stays: that is the running
// parameter socket a SuperCollider engine is driven on, not a one-off setup
// message to a plugin host.
~~~

### jack-true

Above `ok: true, source: name, jack: true, port, portR, channels: portR ? 2 : 1, alsaCl`..., lines 1039 to 1041 before the cut.

~~~js
// ⚠️ `jack: true` IS LOAD-BEARING. The caller gates the granular insert on
// it, and so does the page. Leaving it to be inferred from which variable
// happened to be set is exactly the coupling this refactor removed.
~~~

### capture-holders

Above `const capture = { proc: null, users: new Set(), onFrame: null, onUnit: null };`, lines 1060 to 1071 before the cut.

~~~js
// ── the capture, held by whoever is sounding ────────────────────────────────
//
// 🔴 ONE ffmpeg ON `posboard`, HELD BY NAME, SINCE 2026-10-11. It was spawned
// inside `startJackSynth` and killed with the instrument, which was right while
// the board had one sound. With the sampler beside Yoshimi (option b,
// plans/plan-sampler-pi-pico.md §2.2) either may be the only thing playing, so
// the capture lives while ANY holder does and a second holder reuses it rather
// than starting a second `posboard` (JACK would name it `posboard-01`, and
// nothing is wired to that).
// ⚠️ THE FRAME PUMP IS THE NEWEST HOLDER'S `onFrame`. Every holder on this board
// passes the same `sendPcm`, so this is a formality, written down so it is not
// a surprise.
~~~

### capture-unit

Above `export function setCaptureUnit(fn) { capture.onUnit = typeof fn === 'function' ?`..., lines 1074 to 1079 before the cut.

~~~js
/**
 * Half a frame, as soon as it exists, for the main socket's direct path
 * (`rtc.mjs` `createMainDirect`), the same split `inputs.mjs` reads in. The
 * relay's `onFrame` still gets whole frames, at the moment it always did, built
 * from two halves. Set once by `board.mjs`; null sends nothing extra.
 */
~~~

## `rig/board/measure.mjs`

### measure-header

Above `export const RATE = 48000;`, lines 1 to 14 before the cut.

~~~js
// rig/board/measure.mjs — what tells two sounds apart, on captured frames.
//
// Extracted so the patch stepper and the granulator grade themselves the same
// way. A second copy of a MEASUREMENT is worse than a second copy of a feature:
// two rigs that disagree about what "different" means cannot be compared, and
// the disagreement is invisible because both print numbers.
//
// ── what tells two instruments apart ─────────────────────────────────────────
// Two axes, because one can coincide. The ENVELOPE (how much of the peak is
// still there at the end) separates a struck sound from a held one; the
// SPECTRAL CENTROID separates a dull one from a bright one. Both are measured
// from the ONSET rather than from frame zero: the first frames of every capture
// here are still silence, because the note had to cross the internet to get
// there, and indexing a fixed frame compares pre-note silence against a note.
~~~

### measure-windows

Above `const start = Math.max(0, (onset < 0 ? 0 : onset) * 960 + RATE * 0.05);`, lines 44 to 47 before the cut.

~~~js
// Four windows starting 50 ms after the onset — about 340 ms of the note's
// body. One window right at the peak moved by half an octave between two
// takes of the SAME patch, because an FM electric piano's brightness falls
// fast; averaging four is steady to a few hundredths.
~~~

### measure-distance

Above `export const distance = (a, b) => ({`, lines 64 to 69 before the cut.

~~~js
/**
 * How far apart two takes are, on both axes. `env` is the difference in how
 * much of the peak survives to the end; `oct` is the distance in octaves
 * between their brightness. Both have to move for a verdict of "a different
 * instrument", so a loudness wobble on its own cannot produce one.
 */
~~~

### measure-summarise

Above `export function summarise(takes) {`, lines 77 to 95 before the cut.

~~~js
/**
 * ⚠️ ONE TAKE OF A STOCHASTIC INSTRUMENT IS NOT A MEASUREMENT.
 *
 * Pappus fires grains against a per-voice probability and a euclidean gate, so
 * two captures of the IDENTICAL setting differ — and by how much is not a
 * constant. `pappus-live.mjs` read 14, 16 and 16 of 17 across three consecutive
 * runs with DIFFERENT checks failing each time, and its own same-seed noise
 * floor moved between 0.045 and 0.126 envelope across those runs. Every
 * threshold in it was therefore being compared against a number that was itself
 * a die roll.
 *
 * The fix is not a wider threshold — that only makes the test unable to fail.
 * It is to measure the spread instead of assuming it: repeat each condition,
 * take the MEDIAN as the condition's value, and take the spread WITHIN a
 * condition as the floor that any between-condition difference has to clear.
 *
 * Returns the median take plus `spread`, the median distance from that median —
 * how far this instrument moves when nothing changed at all.
 */
~~~

### measure-separated

Above `export function separated(a, b, margin = 2) {`, lines 113 to 120 before the cut.

~~~js
/**
 * Is B different from A by more than either of them moves on its own?
 *
 * The floor is the LARGER of the two spreads, times a margin — comparing
 * against one condition's spread alone would call a difference real whenever
 * the quieter of the two happened to be steady. An axis with no spread
 * measured cannot vote, because a floor of zero makes everything significant.
 */
~~~

## `rig/board/pappus-live.mjs`

### pl-header

Above `import { measure } from './measure.mjs';`, lines 1 to 180 before the cut.

~~~js
// rig/board/pappus-live.mjs — drive a board running Pappus and check that the die,
// the drift and a key press move the SOUND.
//
//   node board.mjs --room studio-1              (on the board; it is the service)
//   node pappus-live.mjs --room studio-1      (from anywhere; about 7.5 minutes)
//   node pappus-live.mjs --self-test          (the statistics alone — no relay, no board)
//   node pappus-live.mjs --only pitch         (one section: seeds | drift | pitch)
//
// ⚠️ DO NOT PIPE THIS INTO `tail`. `cmd | tail` reports TAIL's exit status, so a
// failed run reads as a passing one; and node buffers a piped stdout until exit,
// so a seven-minute run looks hung for seven minutes. Read it straight, or
// `node pappus-live.mjs > run.txt; echo $?`.
//
// ⚠️ ONE AT A TIME. This drives the board's single instrument and single
// granulator, so two runs at once interleave: one switches the source while the
// other is mid-capture, and the second reads silence or somebody else's sound.
// Seen for real — a run died with "no audio" while another had just restarted
// the instrument underneath it.
//
// The claim under test is not "OSC was sent". Nothing downstream of the socket
// answers: sclang takes a message for a command that does not exist, or a value
// out of range, and says nothing at all — so a roll that changed everything and
// a roll that changed nothing look identical from the sending end. That is the
// same shape as the patch stepper, and it is why this grades by ear.
//
// ⚠️ It includes the NEGATIVE CONTROLS, because a difference test that cannot
// fail is not a test:
//
//   * two applications of the SAME seed are what every seed verdict is measured
//     against — the floor is the instrument's own wobble, sampled, not a number
//     anybody typed;
//   * the drift must move the sound with NOTHING sent at all — and, separately,
//     it must STAY OFF when it has been told to, which is its own check now;
//   * the pitch sweep must prove there is a sound before measuring its pitch;
//   * `--self-test` runs the statistics against synthetic captures with no board
//     attached, and fails if the shuffle test can no longer say NO to two
//     samples of one distribution, or YES to two that are three wobbles apart.
//
// ── HOW THIS FILE GRADES, AND WHY IT IS NOT ONE TAKE ─────────────────────────
//
// ⚠️ THIS INSTRUMENT IS STOCHASTIC AND A SINGLE CAPTURE IS NOT A MEASUREMENT.
// Grains fire against a per-voice probability, a euclidean gate and a free-
// running `TRand` that nothing reseeds, so two captures of an IDENTICAL setting
// differ. Graded one capture a condition, this file read 14, 16 and 16 of 17
// across three consecutive runs with DIFFERENT checks failing each time, and its
// own noise floor moved between 0.045 and 0.126 envelope — so every threshold in
// it was being compared against a number that was itself a die roll.
//
// So: several captures a condition, and the verdict is a SHUFFLE TEST. The two
// conditions' captures are pooled and re-split every possible way, and the
// question asked is "how many of those splits land as far apart as the real one
// did?". That compares two DISTRIBUTIONS and it needs no threshold anybody
// typed. Printed beside it is the effect size — the median of every
// A-against-B difference — in the axis's own units, and the condition's own
// spread, which is how far two repeats of it sit apart when nothing changed.
//
// ⚠️ AND THE UNIT OF REPETITION IS WHATEVER GETS RE-ROLLED. For the seeds that
// is an APPLICATION of the seed, not a capture. Applying 424242 twice does not
// reproduce the same sound — the grain scheduler's noise is not seeded — so the
// floor for "two seeds differ" is how far apart two applications of ONE seed
// land, and estimating THAT from a single pair is the die roll all over again.
// Five applications of each seed give ten same-seed pairs, and the shuffle test
// takes its null from them. Repeating captures inside one application would
// have measured the wrong wobble and called it the floor.
//
// ── WHY FIVE, MEASURED RATHER THAN PICKED ────────────────────────────────────
//
// A shuffle test over two groups of n can only report p-values that are
// multiples of 1/C(2n,n), so the repeat count sets a FLOOR on what it is able to
// say at all. Two axes are looked at here (envelope and brightness), so a
// verdict at 5% needs 2.5% on one axis, and then:
//
//   repeats  arrangements  smallest p it can express   at 2 s.d.   at 3 s.d.
//      3           20               0.100              cannot decide
//      4           70               0.029              cannot decide
//      5          252               0.008                0.53        0.89
//      7        3,432               0.0006               0.79        0.99
//
// THREE CAPTURES CANNOT PRODUCE A VERDICT AT ALL: the smallest p-value twenty
// arrangements can express is 0.10, so a three-take run that says "different"
// is quoting a typed margin, not the data. FIVE is the smallest count that can
// decide, and it resolves an effect three times the instrument's own wobble
// nine times in ten. Those numbers are not from a textbook — `--self-test`
// re-measures them on every run with no board attached, at 600 trials, so the
// last column moves a point or two between runs.
//
// THE DRIFT PAIR GETS SEVEN, because it is the one claim here whose effect is
// about twice the wobble rather than three times it: 45 s of drift moved the
// sound 0.15 octaves while the granulator wobbles 0.15 on its own, and 90 s —
// half the 181 s scan cycle, which is as far as that parameter ever gets from
// where it started — is about twice that. At five repeats a 2 s.d. effect is a
// coin toss dressed as a check. The 90 s wait dominates that section, so the two
// extra captures cost 11 seconds.
//
// What five CANNOT do is resolve an effect the size of the wobble itself: that
// needs about 19 repeats a condition, which is 55 s per condition and 11 minutes
// of captures. Where a claim is that small it is REPORTED AND NOT ASSERTED, and
// says so in words — the per-step pitch rungs below are the case.
//
// ⚠️ WHAT THIS COSTS: about 7.5 minutes, against 4.5 at the three captures that
// could not decide anything. Seventy captures at ~3 s each is most of it, and
// the rest is two fixed waits (90 s for the drift, 25 s for the erase guard)
// that no repeat count touches. `--only <section>` is the lever when you are
// iterating on one claim; `--takes` is for experiments, NOT for making a red run
// green — lowering it does not weaken a verdict, it withdraws it.
//
// ── TWO STATE TRAPS THAT COST A WHOLE RUN, 2026-09-13 ────────────────────────
//
// Both are about a command doing something beyond its name, and both made
// checks fail for a reason that had nothing to do with what they were asking.
//
// 🔴 **A ROLL TURNS THE DRIFT BACK ON.** `params.random` ends with
// `startDrift()` in board.mjs, so `params.drift off` BEFORE a roll is undone by
// the roll. Ten rolls in the seed section re-armed it ten times, and the
// section's numbers say so: two applications of one seed 0.091 env apart, two
// DIFFERENT seeds 0.009 apart — the wobble ten times the effect, which is the
// signature of six parameters walking under a set of captures taken minutes
// apart. Every roll here goes through `roll()`, which puts it back off, and
// `nudges` is read off the BOX to prove it stayed off.
//
// 🔴 **`src 1` ERASES, AND `lock` IS WHAT HOLDS.** The engine writes
// `BufWr(cap·sosin + old·sosret)` where `sos = msos.max(mlock)` — so `src 1`
// with `lock` still 0 makes both terms zero and sweeps silence over the live
// window in real time. Freezing in the order `src` then `lock` therefore erases
// the head of whatever was just recorded, for as long as the second command
// takes to cross the relay. Lock first; `lock 1` alone already both holds the
// material and stops the input being mixed in. (A loader that `snapread`s the
// buffers immediately afterwards can use the other order and be right, because
// it has something to restore from. This has nothing.)
//
// And `src` is **1 OFF, 2 STEREO, 3 MONO L, 4 MONO R, with no 0** — a value
// outside that table is silence rather than an error. See `rig/board/norns/CHAIN.md`.
//
// ── WHY THE SEEDS AND THE DRIFT ABSTAIN, AND WHAT WOULD ANSWER THEM ──────────
//
// ⚠️ TWO THINGS IT IS NOT, BOTH CHECKED RATHER THAN ASSUMED, so neither gets
// re-litigated. It is NOT the granulator reading the present (LESSONS #61): the
// setup above holds the buffer with `mlock 1` before any section captures, and
// the SAME number removes the dry path — `Engine_Pappus.sc:870` crossfades
// `gsum * sin(sxf·π/2) + [capl,capr] * cos(sxf·π/2)` where
// `sxf = (msos.max(mlock)/0.6).clip(0,1)`, so at `mlock 1` the cosine term is
// zero and the instrument's own sound is not in the capture at all. And it is
// NOT the engine failing to answer the die: the pitch ladder moved 0.83 octaves
// at p 0.008 on the same board in the same run.
//
// WHAT IT IS, from that run's own numbers: everything measured THROUGH THE
// CHAIN sits at RMS 0.25–0.32 (about −11 dBFS) with a brightness wobble of
// 0.16–0.22 octaves, while the ladder — the one section that mutes the chain
// and takes the granulator straight out on `oin1` — sat at RMS 0.006–0.008
// (−43 dBFS) with rung wobbles of 0.01–0.15. The chain puts ~32 dB into the
// master `Compander` (`mcomp` 0.2) and `Limiter` (`limceil` 0.98855) and raises
// the wobble by up to twenty times. Two seeds differ by 0.10 octaves. That is
// under the noise THE CHAIN ITSELF ADDS, so the question is not answerable at
// this repeat count no matter how true it is — 19 repeats a condition would be
// needed, which is eleven minutes of captures.
//
// So both checks now say that, with the arithmetic, instead of going red. ⚠️
// The measurement that WOULD answer them is the ladder's configuration applied
// to the seeds: mute the chain, hold the buffer, open one gate, capture with no
// note. It is not done here because it narrows the claim — the die rolls the
// chain too, and CHAIN.md says the routing "changes the character more than any
// single knob" — so which question to ask is a decision, not a bug fix.
//
// ⚠️ The statistics live here rather than in `measure.mjs` only because this
// change was scoped to one file. They belong next to `measure()`, and
// `summarise`/`separated` there are what they replace — nothing else imports
// those two.
//
// 🔴 A LIVE RUN REFUSES BY DEFAULT SINCE 2026-10-13 (exit 2), BECAUSE THE BOARD
// HAS NO INSTRUMENT FOR THE INSERT TO WRAP. It raised Yoshimi, and Yoshimi left
// the board that day (archive/yoshimi/README.md). `fx.pappus` raises the
// granulator only around a JACK INSTRUMENT (board.mjs `inst.jack`, set by
// `JACK_SYNTHS`, which is empty now). The sampler and the Circuit are on JACK
// and neither is the instrument slot, so `fx.pappus {on: true}` answers
// `nothing is playing for an insert to wrap`, and the priming notes below go to
// `note.on` with no `node`, which only an instrument takes. Retargeting to the
// sampler needs the board to let the insert wrap the sampler's standing rows,
// which is board code and a push, not a swap here.
// `--instrument <source>` runs it as it was on a board that has one again.
// `--self-test` needs no board and still runs.
~~~

### pl-quick

Above `const QUICK = process.argv.includes('--quick');`, lines 184 to 195 before the cut.

~~~js
/**
 * ⚠️ A SEVEN-MINUTE TEST IS A TEST NOBODY ITERATES ON, and it showed: eight
 * consecutive end-to-end runs went into fixing one assertion at a time, most of
 * them waiting on parts that had not changed. `--quick` cuts the two long waits
 * and drops to two repeats a condition; `--only` runs one section.
 *
 * BOTH PRINT THAT THEY ARE PARTIAL, and a shortened run REFUSES the statistical
 * verdicts rather than guessing at them — two repeats cannot express a p-value
 * below 0.33, so every shuffle test comes back "cannot decide". That is the
 * honest answer and it is the point: a shortened run that looks like a full one
 * is a number that will be quoted as one.
 */
~~~

### pl-sections

Above `const SECTIONS = ['seeds', 'drift', 'pitch'];`, lines 198 to 204 before the cut.

~~~js
// 🔴 THERE WAS AN `err` SECTION AND IT LEFT ON 2026-09-16 WITH ERR'S ARCHIVE.
// It loaded a minute of 1965 into the grain buffers and asked three things:
// that it landed, that it sounded unlike the synth under the same roll, and
// that it was still there 25 s later rather than swept away by `src 1`. The
// last of those is the guard for LESSONS #46 and it is not lost: the `pitch`
// section below records a note into the buffers and locks them the same way.
// `archive/box-pappus/` has the removed board code.
~~~

### pl-apps

Trailing comment on line 221 before the cut.

~~~js
const APPS = QUICK ? 2 : 5;      // applications of a seed — the unit for the seed checks
~~~

### pl-stats

Above `const median = (xs) => {`, lines 224 to 226 before the cut.

~~~js
// ══ the statistics ══════════════════════════════════════════════════════════
// Pure. No clock, no socket, no board — which is what makes `--self-test` able
// to prove that the guards below fire.
~~~

### pl-axes

Above `const AXES = {`, lines 239 to 244 before the cut.

~~~js
/**
 * The two axes, and they are two because one can coincide: a loudness wobble
 * alone must not be able to produce a verdict of "a different sound". Looking at
 * two is also why the bar is 2.5% rather than 5% — you get to look twice, so
 * each look has to be twice as convincing.
 */
~~~

### pl-resolves

Above `const RESOLVES = 2;`, lines 252 to 265 before the cut.

~~~js
/**
 * ⚠️ HOW BIG AN EFFECT THIS MANY REPEATS CAN ACTUALLY FIND, so that "we did not
 * see it" and "we could not have seen it" stop being the same red line.
 *
 * From the power table in the header, re-measured by `--self-test`: five
 * repeats find an effect TWICE the instrument's own wobble about half the time
 * and three times it nine times in ten. So below two wobbles a run is more
 * likely to miss a real difference than to find one, and reporting that as
 * "they sound the same" is a claim the run has no standing to make. Above it,
 * a non-clearing result IS evidence of no effect.
 *
 * `spread` is the median distance between two repeats; for a normal spread that
 * is 0.954 standard deviations, which is what converts one to the other.
 */
~~~

### pl-cap

Above `const CAP = 100000;`, lines 285 to 289 before the cut.

~~~js
/**
 * Every way of splitting n things into a group of `na` and the rest. Exact while
 * that is countable; a FIXED-seed sample beyond it, so the answer is the same
 * every run.
 */
~~~

### pl-shuffle

Above `function shuffleTest(xa, xb) {`, lines 311 to 319 before the cut.

~~~js
/**
 * ⚠️ THE STATISTIC IS A RANK SUM, NOT A DIFFERENCE OF MEDIANS, and that is not
 * a detail. Measured while choosing it: with |median(A) − median(B)| as the
 * statistic, swapping the smallest value of A with the smallest of B leaves BOTH
 * medians untouched, so a large share of arrangements tie with the real one and
 * five repeats a side can never express a p below 0.025 — the test reads 0.000
 * power at every effect size, which looks exactly like a broken engine. A rank
 * sum has no such tie, and it is the standard robust choice.
 */
~~~

### pl-plus-one

Above `const p = exact ? ge / visited : (ge + 1) / (visited + 1);`, lines 331 to 332 before the cut.

~~~js
// Exact enumeration already contains the real split, so `ge` is never 0.
// A sample does not, hence the +1 — the conservative convention.
~~~

### pl-condition

Above `function condition(label, repeats, unit = 'captures') {`, lines 344 to 348 before the cut.

~~~js
/**
 * A CONDITION is several repeats of one setting: a middle and a spread, never a
 * single number. `unit` names what was repeated, because "over 5 captures" and
 * "over 5 rolls" are different claims and the output has to say which.
 */
~~~

### pl-spread

Above `c.spread[k] = xs.length > 1 ? median(pairwise(xs)) : null;`, lines 360 to 364 before the cut.

~~~js
// ⚠️ THE SPREAD IS HOW FAR APART TWO REPEATS SIT, NOT HOW FAR THEY SIT FROM
// THE MIDDLE ONE. The second is what this file used to print, and with three
// repeats it is degenerate: the middle repeat's distance from the middle is
// exactly ZERO, so the median of three distances is the SMALLER of the other
// two — a floor biased low, which makes everything look significant.
~~~

### pl-compare

Above `function compare(A, B) {`, lines 370 to 370 before the cut.

~~~js
/** Is B a different sound from A — by more than re-splitting their own repeats gets? */
~~~

### pl-self-test

Above `function selfTest() {`, lines 408 to 411 before the cut.

~~~js
// ══ the self-test: proof that these guards fire ═════════════════════════════
// ⚠️ A GREEN SUITE CAN MEAN ZERO COVERAGE, so this breaks the thing on purpose.
// It needs no relay, no board and no sound card, and it re-derives the repeat
// count in the header rather than trusting a comment.
~~~

### pl-power

Above `const power = (n, shift, trials, both = false) => {`, lines 424 to 430 before the cut.

~~~js
/**
 * ⚠️ THE EFFECT IS PUT ON ONE AXIS, BECAUSE THAT IS THE REAL CASE. Shifting
 * both and asking "did either clear?" is two chances at the same effect, and
 * it reads 75% where the honest single-axis answer is 53% — a power figure
 * flattered by exactly the multiplicity the 2.5% bar exists to pay for. A key
 * change moves brightness, not envelope; the drift moves what it moves.
 */
~~~

### pl-1

Above `const far = (n) => shuffleTest(Array.from({ length: n }, (_, i) => i), Array.fro`..., lines 442 to 443 before the cut.

~~~js
// 1. THE NUMBER THAT PICKED THE REPEAT COUNT, re-derived through the real code
//    path rather than quoted from a comment.
~~~

### pl-2

Above `const TRIALS = 600;`, lines 454 to 456 before the cut.

~~~js
// 2. IT CAN SAY NO. Two samples of ONE distribution must mostly not separate,
//    and the rate has to sit under the bar — a test that never says no is not
//    a test, and this is the arm that used to be a typed margin.
~~~

### pl-3

Above `const p2 = power(5, 2, TRIALS), p3 = power(5, 3, TRIALS), p7 = power(7, 2, TRIAL`..., lines 462 to 463 before the cut.

~~~js
// 3. IT CAN SAY YES, and how loudly IS the resolution this file has. These are
//    the numbers the repeat count was chosen from, re-measured every run.
~~~

### pl-5

Above `const three = condition('x', [1, 5, 6].map((v) => ({ peak: 0.1, ratio: v, centro`..., lines 477 to 478 before the cut.

~~~js
// 5. THE SPREAD IS NOT DEGENERATE. The old estimator measured distance from
//    the middle repeat, and the middle repeat's own distance is zero.
~~~

### pl-6

Above `t('a condition with no captures reports nothing rather than throwing', condition`..., lines 483 to 483 before the cut.

~~~js
// 6. NOTHING ARRIVED IS A SENTENCE, NOT A CRASH.
~~~

### pl-7

Above `const outcome = (cmp) => (!cmp.decidable ? 'undecidable' : cmp.any ? 'separated'`..., lines 489 to 491 before the cut.

~~~js
// 7. THE RESOLUTION GUARD, BOTH WAYS. It has to fire when the run could not
//    have found the effect, and it has to STAY OUT OF THE WAY when it could —
//    a guard that always fires turns every red line into a shrug.
~~~

### pl-other-way

Above `t('five wobbles apart is well inside what five repeats resolve', far2.oct.couldS`..., lines 515 to 518 before the cut.

~~~js
// ⚠️ AND THE OTHER DIRECTION, or a guard stuck ON reads exactly like a
// working one: with couldSee forced false the suite above still went 17/17,
// because an abstain and a separation are both "not a failure". This case is
// the one that catches it.
~~~

### pl-8

Above `const shown = evidence(compare(condition('a', fake(5)), condition('b', fake(5, {`..., lines 522 to 523 before the cut.

~~~js
// 8. AND EVERY CHECK SAYS WHAT IT MEASURED OVER HOW MANY REPEATS — which is a
//    claim about the OUTPUT, so it is checked on the output.
~~~

### pl-live

Above `const { format, parse, randomId, RELAY_BASE } = await import('../../demo/shell/w`..., lines 535 to 538 before the cut.

~~~js
// ══ the live run ════════════════════════════════════════════════════════════
// Imported here rather than at the top so `--self-test` touches nothing that
// knows about a relay: "no board attached" should be true of the module graph
// too, not just of the run.
~~~

### pl-cannot

Above `const cannot = (n, why) => { skipped++; console.log('  ----  ${n}  CANNOT DECIDE`..., lines 543 to 543 before the cut.

~~~js
/** ⚠️ A CHECK THAT CANNOT ANSWER MUST SAY SO, not guess. Counted apart from both. */
~~~

### pl-not-seen

Above `if (!cmp.any && !cmp.couldSee) {`, lines 552 to 556 before the cut.

~~~js
// ⚠️ "WE DID NOT SEE IT" IS NOT "IT IS NOT THERE", and a check that cannot
// tell the two apart reports a power limit as a defect. If the difference on
// every axis is smaller than twice that axis's own wobble, this repeat count
// would have missed a real effect of that size as often as it found one — so
// the run has no verdict to give, and says which numbers made it so.
~~~

### pl-once

Above `async function once({ play = true, hold = 2600, settle = 250 } = {}) {`, lines 603 to 610 before the cut.

~~~js
/**
 * One capture: play a note, collect what comes back, measure it.
 *
 * The granulator is not an instrument with an attack — it is a buffer being
 * read continuously — so the note is there to give the capture something with
 * a beginning. The measurement starts from the onset for the same reason the
 * patch test does: the first frames are still crossing the internet.
 */
~~~

### pl-no-frames

Above `if (!c) {`, lines 625 to 629 before the cut.

~~~js
// ⚠️ NO FRAMES IS A FINDING, NOT A CRASH. `condition` returns null when every
// capture was empty — the stream stopped, the instrument died, the socket
// dropped — and the next line then read `.peak` of null and took the whole
// run down with a message about a property. "Nothing arrived" is a sentence
// this file should be able to say.
~~~

### pl-roll

Above `async function roll(seed, { drift = false } = {}) {`, lines 638 to 652 before the cut.

~~~js
/**
 * ⚠️ A ROLL TURNS THE DRIFT BACK ON, AND THE BOARD IS RIGHT TO DO IT.
 *
 * `board.mjs`'s `params.random` ends with `pappus().startDrift()` — "movement is
 * on by default once there is something to move" — so **`params.drift off`
 * followed by a roll leaves the drift RUNNING**. Every roll in this file was
 * followed by captures taken on the belief that nothing was moving, and the
 * seed section re-armed it TEN TIMES. Measured consequence, 2026-09-13: two
 * applications of one seed landed 0.091 env / 0.18 oct apart while two
 * DIFFERENT seeds landed 0.009 / 0.04 apart — the wobble ten times the effect,
 * which is what continuous movement does to a set of captures taken minutes
 * apart. The order is what matters: off AFTER the roll, never before.
 *
 * `drift: true` is for the one section that wants it.
 */
~~~

### pl-nudges

Above `const nudges = async () => (await answer(send({ type: 'params.state' }), 'params`..., lines 658 to 658 before the cut.

~~~js
/** How many nudges the drift has made — the way to prove it is not moving. */
~~~

### pl-prime

Above `console.log('  priming the grain buffer (it starts empty, and an empty granulato`..., lines 694 to 697 before the cut.

~~~js
// ⚠️ PRIME THE BUFFER. Pappus granulates a 60-second recording of its input,
// and that recording starts EMPTY — so the first capture read `peak 0.0000,
// centroid 0 Hz` and the "same seed twice" control failed on silence against
// sound rather than on anything to do with the roll. Play into it first.
~~~

### pl-freeze

Above `await set('mlock', 1); await set('nlock', 1);`, lines 702 to 714 before the cut.

~~~js
// ⚠️ FREEZE EVERYTHING THAT IS NOT UNDER TEST, HERE, FOR EVERY SECTION.
//
// The buffer, because the granulator records its input continuously: between
// two repeats of one condition the material has MOVED ON, so a comparison was
// measuring the recording rather than the setting. It failed exactly that way
// — 0.12 octaves apart against a 0.06 floor. `lock` holds what is in there.
//
// The drift, because it moves the sound on its own: the repeats of one
// condition span about fifteen seconds and the gap between conditions about
// twenty, so with the drift running the between-condition difference is bigger
// for a reason that has nothing to do with the thing under test. Measured, it
// failed that way too — 0.20 octaves against a 0.09 floor. The drift has its
// own section, which switches it back on and off again.
~~~

### pl-interleave

Above `console.log('  rolling ${APPS} applications of each seed, alternating (${PER_APP`..., lines 723 to 726 before the cut.

~~~js
// ⚠️ INTERLEAVED, A B A B A B. Five rolls of A and then five of B would put
// every A capture before every B one, so anything that moves slowly over the
// half-minute is indistinguishable from the seed. Alternating spends the
// same time and removes it.
~~~

### pl-control

Above `const nudged1 = await nudges();`, lines 731 to 733 before the cut.

~~~js
// ⚠️ THE CONTROL FOR THE ROLL RE-ARMING THE DRIFT, which is the defect this
// whole section was measured through once. Counted on the BOX's side of the
// wire, so it is evidence about the engine rather than about what we sent.
~~~

### pl-same-params

Above `const sameParams = appsA.every((a) => JSON.stringify(a.roll.m) === JSON.stringif`..., lines 743 to 754 before the cut.

~~~js
// ⚠️ THE SAME SEED DOES NOT REPRODUCE THE SAME SOUND, AND ASSERTING THAT IT
// DID WAS WRONG. Chased properly — drift off, buffer frozen, so parameters
// and material are both held still — two applications of 424242 still landed
// 0.37 octaves apart against a 0.02 floor. The cause is in the engine and is
// not a defect: the grain scheduler draws from its own free-running noise
// (`TRand`, and a per-voice `prnd`/`frnd` pair) which nothing reseeds, and
// the grains read scattered positions in a sixty-second buffer. Two runs of
// one setting therefore hear different material by design.
//
// So the reproducibility claim goes where it is TRUE and checkable: the seed
// reproduces the PARAMETERS, asserted against the board's own report rather
// than by ear — and now across all five applications, not two.
~~~

### pl-floor

Above `note('the same seed lands ${fmtAxis('env', condA.spread.env)} env / ${fmtAxis('o`..., lines 765 to 768 before the cut.

~~~js
// ⚠️ THE FLOOR IS MEASURED, AND MEASURED MORE THAN ONCE. This spread is how
// far apart two applications of ONE seed land — ten pairs of it, not the
// single pair that used to be the whole floor and moved between 0.045 and
// 0.126 from run to run.
~~~

### pl-ninety

Above `console.log('  waiting ${QUICK ? 20 : 90} s with NOTHING sent ...');`, lines 783 to 790 before the cut.

~~~js
// ⚠️ NINETY SECONDS, BECAUSE FORTY-FIVE IS NOT ENOUGH TO HEAR. The drift's
// slowest parameter has a 181 s period (`scan`, the one that changes WHAT
// you are hearing), so 45 s is a quarter cycle — measured, it moved the
// sound 0.15 octaves while the granulator wobbles 0.15 on its own. Half a
// cycle is both the shortest wait that asks the question properly and the
// furthest that parameter ever gets from where it started; waiting longer
// brings it back, so this effect cannot be made bigger, only measured more.
// That is why this pair gets seven captures and everything else gets five.
~~~

### pl-bound

Above `if (moved.oct.d === null) cannot('...and it did not wander out of the character `..., lines 798 to 801 before the cut.

~~~js
// A BOUND, NOT A COMPARISON, and it is labelled one: "it did not run away"
// is a claim about SIZE, and no amount of repeating turns a size into a
// significance. What the repeats buy here is that the number being bounded
// is a middle rather than one capture.
~~~

### pl-pitch

Above `if (RUN.has('pitch')) {`, lines 809 to 834 before the cut.

~~~js
// ── does a key pitch the grains? ─────────────────────────────────────────
//
// ⚠️ THIS CANNOT BE ASKED OF RECORDED SPEECH THROUGH THE WHOLE CHAIN, and
// asking it that way read FAILED for a day against an engine that was
// working. Two reasons,
// both about measuring the quantity in question:
//
//   the CHAIN — 48 resonators tuned to a fixed chord, eight delay taps and a
//   reverb sit between the grains and the capture, and not one of them follows
//   a key. Through a resonator-heavy roll, pressing four octaves moved the
//   measured brightness by -0.05 octaves per octave. Through a roll that goes
//   straight out, the same four octaves moved it by 1.77.
//
//   the MATERIAL — a two-second spectral centroid of grains scattered over a
//   minute of SPEECH is dominated by which words the grains landed on. The
//   same sweep gave -1.92 octaves at -12 semitones (right) and +0.34 at -12
//   on the next capture (nonsense). Speech has no pitch to measure.
//
// So this records ONE HELD NOTE into the buffer, locks it, mutes everything
// that cannot follow a key, and sweeps. Measured that way the ladder is
// monotonic and unambiguous: 251 · 335 · 473 · 878 · 1578 Hz.
//
// It asserts DIRECTION AND ORDER rather than exact ratios. Pitching a harmonic
// series up moves a centroid by more than the pitch ratio as upper partials
// come into the band, so "+12 semitones is exactly +1.00 octaves" is a claim
// about the spectrum of the material, not about the engine.
~~~

### pl-roll-first

Above `await roll(SEED_B);`, lines 837 to 846 before the cut.

~~~js
// ⚠️ ROLL FIRST, and a KNOWN seed. This block inherits whatever the previous
// checks left behind — a tilt that buries the recording, a contour, a window
// — and it recorded 50x quieter in the suite than the same code did standing
// alone, for exactly that reason. Every parameter the sweep depends on is
// either rolled here or set below; nothing is inherited.
//
// ⚠️ AND THROUGH `roll()`, WHICH PUTS THE DRIFT BACK OFF. A bare
// `params.random` re-arms it, so the `params.drift off` that used to sit on
// the line ABOVE this one was undone by the line itself, and the whole
// sweep ran with six parameters walking under it.
~~~

### pl-geometry

Above `await set('mbuflen', 4);`, lines 849 to 859 before the cut.

~~~js
// ── THE GEOMETRY GOES IN BEFORE THE RECORDING, NOT AFTER IT ─────────────
//
// ⚠️ THIS BLOCK USED TO RECORD INTO ONE BUFFER AND READ OUT OF ANOTHER.
// `mbuflen` is not a read setting — `Engine_Pappus.sc:537` makes it the
// LIVE LENGTH of the ring, "only the first mbuflen seconds of it are live",
// so it governs where the write head goes as much as where the read head
// looks. Setting it to 4 s AFTER a six-second note had been recorded into
// whatever length the previous section left meant the window at 45–55%
// pointed into a region the note might never have reached. Set first, the
// six-second note wraps a four-second ring and fills it end to end, so
// every position in it is the note and the window cannot miss.
~~~

### pl-narrow

Above `await set('mscan', 0.5);`, lines 861 to 868 before the cut.

~~~js
// ⚠️ A NARROW WINDOW, BECAUSE THE SCATTER IS THE NOISE. With the window open
// across the whole four seconds, every grain reads a DIFFERENT slice of the
// recorded note, so a rung's own spread came out at 0.09, 0.14, 0.38 and 0.41
// octaves on four consecutive runs — swamping the 0.28-octave step being
// measured, and no number of repeats fixes a variance this large. Pinning the
// read head to a tenth of the buffer means every grain reads nearly the same
// material and the only thing left varying is the pitch, which is the
// quantity in question. Remove the noise; do not out-average it.
~~~

### pl-modes

Above `await set('mscanmode', 2);      // 2 POSITION — a static read head`, lines 871 to 877 before the cut.

~~~js
// ⚠️ AND PIN THE MODES, which the roll otherwise chooses. `scanmode` 3 and 4
// are DELAY SYNC and DELAY FREE — the read head moves on its own — so a run
// that happened to roll one read a rung spread of 0.83 octaves where a run
// that rolled POSITION read 0.06. That is not noise in the instrument, it is
// a different instrument, and leaving it to the die makes the whole check
// pass or fail on the roll. `contour` is pinned for the same reason: it is
// the grain envelope, and an envelope change is a spectrum change.
~~~

### pl-position

Trailing comment on line 878 before the cut.

~~~js
await set('mscanmode', 2);      // 2 POSITION — a static read head
~~~

### pl-tilt

Trailing comment on line 880 before the cut.

~~~js
await set('mtilt', 0); await set('ntilt', 0);   // baked in at RECORD time — neutral
~~~

### pl-record

Above `await set('mlock', 0); await set('nlock', 0);`, lines 883 to 891 before the cut.

~~~js
// ── RECORD THE NOTE ────────────────────────────────────────────────────
//
// ⚠️ SAY WHAT RECORDING IS, RATHER THAN INHERIT IT. `src` is **1 OFF,
// 2 STEREO, 3 MONO L, 4 MONO R, and there is no 0** (CHAIN.md; a value
// outside the table is silence, not an error). This block's own comment
// claims nothing is inherited, and these two were the only parameters it
// was inheriting, which is the pair that decides whether anything is
// recorded at all. ⚠️ THEY ARE NOW THE ONLY THING THAT HANDS THE BUFFERS
// BACK: a `source.clear` used to run above this and left with the archive.
~~~

### pl-lock-first

Above `await set('mlock', 1); await set('nlock', 1);`, lines 898 to 909 before the cut.

~~~js
// ⚠️ LOCK FIRST, THEN OFF, AND THE OTHER ORDER ERASES WHAT WAS JUST PLAYED.
// From the engine's own arithmetic (Engine_Pappus.sc:489-508, quoted in
// pappus.mjs): `sos = msos.max(mlock)`, `sosret = (sos*1.05).clip(0,1)`,
// `sosin = ((1-sos)*4).clip(0,1) * run * (ssel > 1.5)`. With `src` 1 and
// `lock` still 0, BOTH terms are zero and `BufWr` writes `0·new + 0·old` —
// silence, sweeping the live window in real time. This block sent `msrc 1`
// and then waited TWO RELAY ROUND TRIPS for `mlock 1` to land, erasing the
// head of the recording it was about to measure. `lock 1` on its own
// already does both jobs: `sosret` 1 holds the material and `sosin` 0 stops
// the input being mixed in. ⚠️ A loader that `snapread`s the buffers
// immediately afterwards may use the opposite order, because it has
// something to restore from. This has nothing.
~~~

### pl-mute

Above `await set('pamp', ...Array(48).fill(0));`, lines 913 to 915 before the cut.

~~~js
// ── MUTE EVERYTHING THAT CANNOT FOLLOW A KEY ───────────────────────────
// `oin1 1` with `pin1/sin1/kin1` at 0 is the routing matrix's documented
// dry path — granulator one straight to the output, no recompile (CHAIN.md).
~~~

### pl-sound-first

Above `await set('pitches', 0, 0, 0, 0, 0, 0, 0, 0);`, lines 928 to 940 before the cut.

~~~js
// Captures a rung, for the same reason everything above has them. With one
// each it read -12:272 · -7:443 · 0:684 · +7:553 · +12:892 — a rung going
// DOWN in the middle of a rise that is otherwise obvious, which failed the
// whole check on one unlucky capture.
// ── IS THERE A SOUND TO MEASURE THE PITCH OF? ──────────────────────────
//
// ⚠️ THE SWEEP USED TO ASSUME ITS OWN RECORDING WORKED, and on 2026-09-13
// it did not: five rungs, twenty-five captures, `peak 0.0000` on every one,
// reported as three failed claims about PITCH. Silence and a pitch that
// will not move look identical in a centroid, so the run said "a higher key
// does not pitch the grains up" about an engine nobody had shown was making
// a sound. One capture before the sweep separates them, and the sweep is a
// minute of captures that is pointless without it.
~~~

### pl-why-silent

Above `note('nothing came back from the recorded note — probing why, which costs ~6 s a`..., lines 946 to 959 before the cut.

~~~js
// ⚠️ AND WHEN IT IS SILENT, MEASURE WHY — here, in this run, rather than
// leaving the next session to guess between three causes with identical
// output. Two probes, in order, each one ruling out a family:
//
//   the WHOLE buffer instead of a tenth of it — if that sounds, the note
//   was recorded somewhere the narrow window was not looking, and the
//   fault is the read geometry;
//
//   the LIVE INPUT, recording again — if that sounds, the signal path out
//   of the granulator is fine and the buffer was simply empty, so the
//   fault is the recording;
//
//   neither — the fault is downstream of the buffer, in the mute block
//   above, and has nothing to do with the material at all.
~~~

### pl-abstain

Above `for (const n of ['every rung of the pitch ladder sounds',`, lines 976 to 978 before the cut.

~~~js
// ⚠️ ABSTAIN, DO NOT FAIL. Three checks about PITCH cannot be answered
// when there is no sound, and answering them anyway is how a silent
// granulator got reported as a granulator that will not follow a key.
~~~

### pl-up

Above `const up = ladder.slice(2);`, lines 999 to 1006 before the cut.

~~~js
// ⚠️ ONLY THE UPWARD RUNGS ARE ASSERTED, AND THE REASON IS THE MEASURE.
// Over three runs the rungs at or below zero all landed between 225 and
// 434 Hz in no reliable order — -12 read HIGHER than 0 in one of them —
// while +7 and +12 were clean and far above every time. That is not the
// engine being erratic downward: a grain clock at 12/s with a 0.2 s envelope
// puts a broadband floor under everything, and when the pitched partials
// move DOWN into it the centroid stops following them. Brightness can see a
// grain pitched up and cannot see one pitched down.
~~~

### pl-fifth

Above `note('a step of a fifth moves LESS than a rung wobbles on its own, so it is prin`..., lines 1010 to 1015 before the cut.

~~~js
// ⚠️ REPORTED AND NOT ASSERTED, WITH THE NUMBER THAT SAYS WHY. A rung's own
// spread is about 0.38 octaves and one seven-semitone step moves about 0.29
// — an effect SMALLER than the wobble, which needs about 19 captures a rung
// to resolve, or five minutes of this run for one line of output. So this
// instrument can see an octave of key and cannot see half of one, and
// saying that is better than asserting it and going amber every third run.
~~~

### pl-brightness

Above `note('${Math.log2(up[up.length - 1].centroid / up[0].centroid).toFixed(2)} octav`..., lines 1023 to 1028 before the cut.

~~~js
// Brightness is a PROXY for pitch and it over-reads: pitching a harmonic
// series up brings upper partials into the band, so the centroid climbs
// faster than the pitch ratio — measured 3.23 octaves of brightness for the
// two octaves of key the sweep once asked for. How much faster depends on
// the spectrum of whatever was recorded, which is not a property of the
// engine, so an upper bound would be asserting something nobody can predict.
~~~

### pl-hand-back

Above `for (const [cmd, v] of [['mlock', 0], ['nlock', 0], ['msrc', 2], ['nsrc', 2]]) {`, lines 1038 to 1039 before the cut.

~~~js
// Hand the buffers back to the input, which is what a `source.clear` verb
// used to do in one message before it left with the archive.
~~~

### pl-exit

Above `process.exit(fail || (skipped && !QUICK) ? 1 : 0);`, lines 1054 to 1055 before the cut.

~~~js
// A check that could not decide is a failure of the run, not of the engine —
// unless the run asked for it by being short.
~~~

## `rig/board/pappus.mjs`

### p-header

Above `import { createSocket } from 'node:dgram';`, lines 1 to 30 before the cut.

~~~js
// rig/board/pappus.mjs — the granulator's surface: what a roll of the dice means,
// and how a sound built on the board gets into it.
//
// Pappus has 106 commands and no patches. "Random" therefore cannot mean a
// program change, and a page of 106 sliders is not an instrument — so the two
// things this module owns are a DIE that lands somewhere playable and a slow
// DRIFT that keeps the sound alive with no control on screen at all.
//
// Every range below was read out of `Engine_Pappus.sc` on the board, with the
// line cited, because two of them were wrong before it was read — see ROLL BUGS
// at the bottom of this header.
//
// ── what the engine actually is ───────────────────────────────────────────
// Pappus is not a synth with presets. Each of its two granulators continuously
// records its AUDIO INPUT into a 60-second circular buffer and plays grains out
// of that buffer. So the sound is whatever went in, and everything here is
// about how it is read back rather than how it is made.
//
//   msrc / nsrc   1 OFF (hold what the buffer already has)   Engine_Pappus.sc:~440
//                 2 STEREO · 3 MONO L · 4 MONO R
//
// ⚠️ ROLL BUGS this module fixes, both found by reading the engine:
//
//   1. `scanmode` was rolled 0..2. The engine does `Select.ar(mscanmode - 1, …)`
//      over a FOUR-element array (line 570), so it is ONE-based: 0 indexes -1,
//      which is out of range, and modes 3 and 4 were unreachable. One roll in
//      three sent an invalid mode.
//   2. `contour` was rolled 1..8. The engine clips it to 0..16 (line 577) and
//      allocates 17 envelope shapes (line 204), so half the shapes could never
//      come up.
~~~

### partials

Above `import { partialsOf } from '../../demo/shell/source.mjs';`, lines 33 to 37 before the cut.

~~~js
// 🔴 ONE EXPANDER, TWO MACHINES. `partialsOf` turns a spec into the exact list
// of sines both ends have to make, and it is imported rather than reimplemented
// — the page calls the same function on the same spec. Reimplementing it here
// would be two authorities on one number, which is the mistake plan-twins is
// about, one level down. (push.sh ships every `../../` import beside the board.)
~~~

### source-args

Above `import { sourceArgs, SOURCE_VOICES, SOURCE_PARTIALS } from '../../demo/shell/sou`..., lines 39 to 44 before the cut.

~~~js
// 🔴 AND ONE EXPANDER FOR `PosSource` TOO, FOR THE SAME REASON, ONE LEVEL UP.
// `sourceArgs` used to be written out below. It moved to `demo/shell/` the day
// `/grains/` started loading the SAME compiled `PosSource.scsyndef` into wasm
// scsynth in the tab: the browser has to build the same amplitude table, the
// same semitone array and the same three scalars, and a second copy of that
// arithmetic is two authorities on one number.
~~~

### grain-port

Above `export const GRAIN_PORT = 57321;`, lines 51 to 59 before the cut.

~~~js
/**
 * Where sclang forwards the per-grain reports. ⚠️ DECIDED IN `run-pappus.scd`
 * AND MIRRORED HERE, and that is one number in two files — which this project
 * has a rule about. It is here rather than there because node is the end that
 * BINDS it; if it ever moves, both change or neither works, and the failure is
 * silent in the worst direction (the socket binds, nothing arrives, and the
 * page reads "this granulator fires no grains" about one firing hundreds a
 * second).
 */
~~~

### read-osc

Above `export function readOsc(b) {`, lines 66 to 71 before the cut.

~~~js
/**
 * The smallest OSC reader that can read what sclang sends: an address, a type
 * tag string, then ints and floats. It is here rather than in a library
 * because `jacksynth.mjs` only ever needed to WRITE OSC — this is the first
 * thing in the board that has to read any.
 */
~~~

### mulberry

Above `export function mulberry32(a) {`, lines 93 to 101 before the cut.

~~~js
/**
 * A seeded PRNG, because an unrepeatable die is a die you cannot use.
 *
 * The old `randomise()` called Math.random directly, so a roll that landed on
 * something good was gone the moment you pressed anything else. Every roll here
 * carries the seed that produced it; passing it back reproduces the roll
 * exactly. That is the single biggest improvement in this file and it is six
 * lines.
 */
~~~

### params

Above `export const PARAMS = [`, lines 111 to 119 before the cut.

~~~js
/**
 * The continuous parameters worth rolling, per granulator.
 *
 * `scale: 'log'` matters and is not decoration. RATE spans 0.5 to 24 grains a
 * second; rolled linearly, four rolls in five land above 5/s — dense — and the
 * sparse half of the range, where you can hear individual grains, is
 * effectively unreachable. The ear hears both of these logarithmically, so the
 * roll has to be logarithmic or the die only ever finds one kind of sound.
 */
~~~

### modes

Above `export const MODES = [`, lines 133 to 137 before the cut.

~~~js
/**
 * The integer modes, with the ranges the engine actually clips to. All of these
 * are ONE-based except `contour`, which is the trap that made the old roll send
 * an out-of-range value a third of the time.
 */
~~~

### scanmode

Trailing comment on line 140 before the cut.

~~~js
['scanmode',   1,  4],  // :570  1 STRETCH · 2 POSITION · 3 DELAY SYNC · 4 DELAY FREE
~~~

### swarmmode

Trailing comment on line 142 before the cut.

~~~js
['swarmmode',  1,  4],  // :596  1 DETUNE · 2 fifths · 3 octaves · 4 wide
~~~

### characters

Above `export const CHARACTERS = {`, lines 146 to 157 before the cut.

~~~js
/**
 * SIX CHARACTERS, and this is the actual answer to "improve the randomisation".
 *
 * A uniform roll across nine parameters lands in the middle of all nine almost
 * every time, which is one sound — a mid-density, mid-length wash — wearing
 * different numbers. What makes a die playable is that its faces are DIFFERENT
 * KINDS of thing, so the character is rolled first and the numbers are rolled
 * inside it.
 *
 * Each entry narrows the ranges above. Anything a character does not name keeps
 * the full range, so a character constrains rather than dictates.
 */
~~~

### log-fallback

Above `const log = scale === 'log' && a > 0 && b > 0;`, lines 180 to 181 before the cut.

~~~js
// A narrowed range may cross zero or start at zero, where a log
// interpolation is undefined — fall back to linear rather than emit NaN.
~~~

### roll-chain

Above `function rollChain(rnd, root) {`, lines 191 to 216 before the cut.

~~~js
/**
 * THE TWO GRANULATORS GET DIFFERENT CHARACTERS.
 *
 * Rolling both from one distribution is what made every roll sound like one
 * thing played twice — which is exactly the complaint the engine's own comment
 * makes about sharing a buffer: "two granulators sharing a capture buffer are
 * not two granulators, they are one buffer read twice." The same is true of the
 * parameters. Pairing an ordinary character against a contrasting one is the
 * whole reason there are two.
 */
/**
 * The rest of the chain: the window into the buffer, the euclidean gate, the
 * 48 resonators, and the eight delay taps.
 *
 * Carried over from the roll this supersedes — it covered all of this and the
 * granulator surface alone would have been a regression — with four range
 * corrections, each read out of the engine:
 *
 *   `pmodel`      1..2, was 0..2   (:1110, and it clips, so 0 and 1 were one mode)
 *   `pgraintype`  1..8, was 0..2   (:947/:954 — 1-3 are washes, 4+ pick one of
 *                                   the five shipped loop files, which were
 *                                   unreachable entirely)
 *   the chord     was DEAD CODE: `[0,3,7,10,14,17][x] !== undefined ? A : B`
 *                 is always true, because index 0 and index 1 of that array are
 *                 both defined. The major chord could never be chosen.
 */
~~~

### least

Above `const least = (pat, len) => {`, lines 222 to 228 before the cut.

~~~js
/**
 * A pattern that is guaranteed to fire inside the length that will be read.
 *
 * Draws the bit to force from the SAME stream, so the roll stays a pure
 * function of the seed — a repair that consumed a variable number of draws
 * would make a seed reproduce only sometimes, which is worse than the bug.
 */
~~~

### elen

Above `melen, nelen },`, lines 250 to 266 before the cut.

~~~js
// ⚠️ `elen` IS A STEP COUNT, NOT A FRACTION, and rolling it 0.2..1
// switched the granulators OFF in most rolls. The engine reads the
// pattern as `(estep + mephase*i).floor % melen.max(1)`
// (Engine_Pappus.sc:654) and advances it with
// `Stepper.ar(trig, 0, 0, (melen - 1).max(0), 1)` (:558) — so any
// value at or below 1 makes the modulo `% 1`, which is 0 for every
// voice at every step. The pattern is then read at index 0 forever,
// and if that bit is a 0 the granulator never fires a grain.
//
// Measured over 20,000 rolls of the old code: **30.5% of rolls
// gated BOTH granulators off and 49.6% gated exactly one** — so
// only about a fifth of rolls left the instrument running at all.
// Seed 372057 is one of the dead ones, which is why a buffer
// holding a minute of material measured 0.0798 before a roll and
// 0.0050 after.
// Nothing reported an error; the die simply produced silence most
// of the time, and that read as "granular is subtle".
~~~

### must-fire

Above `euclid: { epattern: least(bits(16, 0.5), melen), epattern2: least(bits(16, 0.4),`..., lines 268 to 273 before the cut.

~~~js
// ⚠️ AND THE PATTERN MUST FIRE. A voice reads `epattern[step]`, so a run of
// zeros inside the active length is silence with the gate wide open. At
// p=0.5 over sixteen steps an all-zero pattern is rare; inside a SHORT one
// it is not — with a length of 2 the odds of both steps being 0 are one in
// four. `least` guarantees a hit in the first `elen` steps, which is the
// difference between a rhythm and a rest.
~~~

### roll-voices

Above `function rollVoices(rnd, root) {`, lines 284 to 291 before the cut.

~~~js
/**
 * The eight grain voices, as a rolled chord.
 *
 * ⚠️ Rolled ONLY when nothing is loaded into the buffers. Once material is
 * loaded and the keyboard is driving `pitches`/`gates`, a roll that also wrote
 * them would silently take the instrument away from whoever is playing it —
 * and it would look like the keyboard had stopped working.
 */
~~~

### whole-chain

Above `const f = (lo, hi) => round3(lerp(lo, hi, rnd()));`, lines 310 to 319 before the cut.

~~~js
// The whole chain is rolled, not a sample of it. An earlier draft rolled it
// sparsely, on the theory that a roll changing everything teaches you
// nothing — but the SEED already solves that, and better: you can return to
// any roll exactly instead of hoping the next one keeps what you liked. For
// an engine with 106 knobs and no presets, a die that hands you a whole world
// is the point.
//
// Ranges stay musical rather than maximal — wet levels off the ceiling,
// feedback short of runaway — because a die that mostly produces mush is one
// nobody presses twice. They are carried over from the roll this supersedes.
~~~

### routing

Above `pin1: f(0, 1), pin2: f(0, 1), sin1: f(0, 1), sin2: f(0, 1),`, lines 332 to 334 before the cut.

~~~js
// ROUTING — how much of each granulator reaches each stage. This changes
// the character more than any single knob, because it decides whether
// either granulator skips a part of the chain at all.
~~~

### drift

Above `const PHI = 1.6180339887;`, lines 345 to 370 before the cut.

~~~js
/**
 * ── MOVEMENT, with no control on screen ──────────────────────────────────
 *
 * The brief was "subtle movement, no slider", so this is not a control the page
 * exposes — it is something the board does. It runs in the board process, which
 * means the sound keeps moving at three in the morning with nobody connected,
 * which is what §8.7 of plan-hardware means by the board being an OBJECT rather
 * than a SESSION.
 *
 * Three rules, each of which is the difference between drift and noise:
 *
 * 1. **Drift is relative to the roll, never absolute.** Each parameter moves in
 *    a band around whatever the last roll set it to, so movement never walks
 *    the sound out of its character. Re-rolling re-centres it.
 *
 * 2. **Two sines at incommensurate periods, never one.** A single sine is a
 *    cycle a listener learns in a minute. Two at a golden ratio never repeat,
 *    so nothing on the page ever comes back around.
 *
 * 3. **Integers never drift.** A mode is an edge, not a position — crossing one
 *    mid-note is a click, not a movement. Only the continuous parameters move.
 *
 * `scan` gets the widest excursion and the slowest period because it is the
 * only parameter that changes WHAT you are hearing rather than how: it walks
 * the read head through sixty seconds of recorded material. The rest are how.
 */
~~~

### drift-table

Above `['scan',     0.22,       181.3],`, lines 373 to 375 before the cut.

~~~js
// name      excursion   period, seconds   (fractional and mutually prime-ish:
//                                          CLAUDE.md — use fractional offsets
//                                          in every cadence)
~~~

### drift-target

Above `export function driftTarget(cmd) {`, lines 386 to 404 before the cut.

~~~js
/**
 * Which side and which parameter a raw engine command names — `mscan` ->
 * `['m','scan']` — or null when it is not one the drift moves.
 *
 * 🔴 THIS IS WHAT GIVES A PAGE THAT DOES NOT ROLL A CENTRE TO MOVE AROUND.
 * The drift circles whatever the last DICE ROLL set, and `grains` sets each
 * parameter directly instead of rolling: six named patches, no die. So the
 * board's timer turned over with nothing to circle, `nudges` stayed 0 and
 * `scan` came back null, for as long as anybody cared to wait — a readout
 * cell that could not change, which is the `missed: 1` fault in CLAUDE.md.
 * With this, the last thing anybody SET is the centre, whether a die chose it
 * or a person did.
 *
 * ⚠️ It is deliberately narrow. `mrate` is not here because an integer-ish
 * grain rate is not drifted, and `pitches` is not here because it is a
 * keyboard's, not a parameter's. A centre is only ever the six continuous
 * parameters in `DRIFT` — anything else in it would be carried around and
 * never read.
 */
~~~

### drift-values

Above `export function driftValues(base, tSec, side = 0) {`, lines 410 to 417 before the cut.

~~~js
/**
 * What every drifting parameter should be at time `tSec`, given the values the
 * roll set. Pure — which is what makes it testable with no board, no JACK and
 * no sound card.
 *
 * `side` shifts the phase so the two granulators never move together; without
 * it they breathe in unison and the pair sounds like one wide voice.
 */
~~~

### open

Above `export function openPappus({ port = SCLANG_PORT, host = '127.0.0.1', onLog } = {`..., lines 434 to 442 before the cut.

~~~js
/**
 * ── the live surface ─────────────────────────────────────────────────────
 *
 * One UDP socket to sclang, the applied state, and the drift timer. The socket
 * is this module's own rather than `jacksynth.mjs`'s, so the granulator's
 * parameter surface can be driven whether or not an instrument is up — the
 * engine keeps running while it is bypassed, and a drift that stopped when the
 * insert was switched off would be a drift you could hear stop.
 */
~~~

### grains

Above `const GRAIN_KEEP = 400;`, lines 446 to 459 before the cut.

~~~js
// ── the grains the engine reports ────────────────────────────────────────
//
// 🔴 THIS IS THE ONE THING NOTHING DOWNSTREAM CAN RECONSTRUCT. A page drawing
// this granulator beside one running in a browser could mark every grain on
// the browser's side and none on this one, because a grain inferred from an
// output envelope might be a note, a delay tap or a reverb swell. The engine
// reports each one as `GrainBuf` is triggered (see `report` in
// Engine_Pappus.sc), sclang batches them at 250 ms, and this is where they
// land.
//
// ⚠️ A RING, NOT A LIST. Nothing here knows when a reader will next ask, and
// at 24 grains a second across sixteen voices an unbounded array is a leak
// with a slow fuse. `seen` is the honest count and is NOT capped — it is what
// lets a reader tell "few grains" from "few kept".
~~~

### src-state

Above `let srcNode = -1, srcOn = false, srcAt = 0, srcVoices = -1, srcHz = -1;`, lines 463 to 470 before the cut.

~~~js
// 🔴 WHAT THE SERVER SAYS IT HOLDS — AND THE FIRST VERSION OF THIS WAS A LIE
// THAT READ AS EVIDENCE. It reported the node id sclang answered with, which
// `Synth.new` allocates on the CLIENT before the server has read the message:
// measured on the board, it answered `node 1002, engineOn true` about a def
// that had failed to load, and a page would have drawn "the board is chewing
// the same material" over silence. `/pos/confirm` asks scsynth for a CONTROL
// VALUE instead, so nothing arrives here unless the node is really there with
// the numbers really in it.
~~~

### rolled

Above `let rolled = null;`, lines 493 to 500 before the cut.

~~~js
/**
 * TWO THINGS, AND THEY USED TO BE ONE. `rolled` is the last dice roll, which
 * is what `params.state` reports and what a page draws a character from.
 * `centre` is what the drift circles, and it is also moved by a plain
 * `params.set` — so a page that never rolls still has something to move
 * around. Reporting a set-derived centre AS a roll would put a character and
 * a seed on screen that no die ever produced.
 */
~~~

### clocks

Above `let timer = null, t0 = Date.now(), centredAt = null, moved = 0;`, lines 503 to 510 before the cut.

~~~js
/**
 * Two clocks, for the same reason. `t0` is the drift's PHASE origin and only
 * a roll resets it; `centredAt` is when the centre last moved. A slider drag
 * sends a `params.set` every few milliseconds, and resetting the phase on
 * each one would pin the drift at t=0 — the nudge counter climbing while
 * nothing in the sound moves, which is the one failure this page's readout
 * exists to make impossible.
 */
~~~

### pos-raw

Above `const posRaw = (addr, args) => {`, lines 517 to 520 before the cut.

~~~js
// The generated material's three doors. ⚠️ SCALARS AND ARRAYS ARE DIFFERENT
// MESSAGES — `n_set` and `n_setn` — and sclang cannot tell which a value
// wants from its arity, so a one-element array would silently become a
// scalar and write only the first entry of a 24-entry table.
~~~

### pos-table

Above `const posTable = (amps) => posRaw(POS_TABLE, amps);`, lines 529 to 532 before the cut.

~~~js
// ⚠️ ITS OWN DOOR, NOT `setn`. The amplitudes are not a control any more —
// they are a WAVETABLE, and sclang has to fill the buffer that is not
// currently being read and then crossfade to it. That is three server
// operations in an order only sclang can hold.
~~~

### apply

Above `const apply = (roll, { voices = true } = {}) => {`, lines 538 to 543 before the cut.

~~~js
/**
 * `voices: false` leaves `pitches`/`gates` alone, which is what a roll must
 * do while a keyboard owns them — otherwise the roll silently takes the
 * instrument away from whoever is playing it, and it reads as the keyboard
 * having stopped working rather than as the die having done something.
 */
~~~

### set

Above `const set = (cmd, ...args) => {`, lines 564 to 573 before the cut.

~~~js
/**
 * One named engine command, sent — and taken as the new centre when it names
 * a parameter the drift moves. Returns what it re-centred, or null.
 *
 * ⚠️ NOT `send`. `tick()` sends the drifted values through `send`, so a
 * `send` that re-centred would feed the drift its own output back and
 * integrate: the sound would walk away from the character instead of
 * circling it. This is the one door a person's parameter comes through;
 * `send` stays the raw one.
 */
~~~

### take-grains

Above `takeGrains() {`, lines 593 to 598 before the cut.

~~~js
/**
 * Every grain reported since the last ask, and then the ring is emptied —
 * so two readers cannot both claim the same grains, and a reader that
 * stops asking does not accumulate a backlog it will later draw all at
 * once as a burst that never happened.
 */
~~~

### source

Above `source(spec, { rate = 48000 } = {}) {`, lines 607 to 615 before the cut.

~~~js
/**
 * The material, built on the board from the page's own description.
 *
 * ⚠️ THE SCALARS GO LAST. `nvoices` silences the voices above the chord and
 * `amps` carries the level, so setting the table before the count means one
 * block at most where a six-voice table is playing through four voices —
 * inaudible, but it is also the order that cannot produce a loud transient,
 * and a granulator's input is exactly where a transient becomes permanent.
 */
~~~

### confirm-after

Above `posConfirm();`, lines 624 to 627 before the cut.

~~~js
// ⚠️ AFTER THE VALUES, NEVER BEFORE. The reply carries the control values
// scsynth actually holds, so asking first would confirm the def's
// DEFAULTS and call them the spec — a check that passes on a board that
// never received anything.
~~~

### source-state

Above `sourceState: () => ({ on: srcOn, node: srcNode, voices: srcVoices, hz: srcHz,`, lines 635 to 639 before the cut.

~~~js
/**
 * What the ENGINE said, not what was asked for. `node` is `-1` when sclang
 * has no synth; `ms` is how long ago it last answered, so a stale claim
 * reads as stale rather than as current.
 */
~~~

### centre

Above `centre: () => centre,`, lines 648 to 648 before the cut.

~~~js
/** What the drift is circling — a roll's values, or whatever was set since. */
~~~

### start-drift

Above `startDrift: (hz = 8) => {`, lines 651 to 655 before the cut.

~~~js
/**
 * 8 Hz. Fast enough that a slow sine is smooth rather than stepped, slow
 * enough to be nothing: this is localhost UDP to sclang, not the relay, so
 * it never touches the 60 msg/s budget that the relay silently enforces.
 */
~~~

### drift-stats

Above `driftStats: () => {`, lines 665 to 670 before the cut.

~~~js
/**
 * A readout cell that moves: how many nudges have gone out, and where scan
 * is now. `sinceMs` is how long ago the CENTRE landed, not how long the
 * timer has run — a page uses it to tell "no tick yet" from "not moving",
 * and at 8 Hz those are 125 ms apart.
 */
~~~

### both-halves

Above `scan: centre ? driftValues(centre.m, t, 0).scan ?? null : null,`, lines 676 to 679 before the cut.

~~~js
// BOTH HALVES, because reporting only side m made any page drawing
// where the engine reads have one measured centre and one it had to
// fall back to asking for — an asymmetry with no cause. `side` shifts
// the phase, so the two are genuinely different numbers.
~~~

### notes

Above `notes: makeVoices(send),`, lines 685 to 696 before the cut.

~~~js
/**
 * NOTES INTO GRAINS — what makes a recording playable as an instrument.
 *
 * Each granulator has eight voices, and `pitches` is eight SEMITONE offsets
 * (Engine_Pappus.sc:293 — "the same 2**(n/12) convention as `pitches`"),
 * with `gates` opening each one. So a note is a voice slot, and eight-note
 * polyphony comes free.
 *
 * ⚠️ `pitches` is a setn of all eight at once, so voices are tracked here
 * and the whole array is resent on every note. There is no per-voice
 * message to send instead.
 */
~~~

### adopt

Above `adopt(g) {`, lines 733 to 752 before the cut.

~~~js
/**
 * 🔴 SOMEBODY WROTE `gates` DIRECTLY, SO THIS MIRROR HAS TO FOLLOW IT.
 *
 * `state()` is what `params.state` reports as `notes.gate`, and it was the
 * KEYBOARD's model rather than the engine's. `params.set {cmd:'gates'}`
 * goes straight out as OSC and never passed through here — so a page that
 * opened the gates itself (which `/grains/` now does, because it plays no
 * notes into the granulator) left the board reporting
 * `[0,0,0,0,0,0,0,0]` about a granulator firing grains.
 *
 * ⚠️ Two authorities on one number, and the wrong one was being published.
 * A readout that contradicts the thing it describes is worse than none —
 * measured 2026-09-14 as `0 of the board's 8 voices open` printed beside a
 * board reporting 2.2 grains a second.
 *
 * ⚠️ `held` IS DELIBERATELY NOT TOUCHED. Nobody pressed a key, so no note
 * is being held; claiming one would be the same mistake in the other
 * direction. Voices opened this way are open and unheld, which is exactly
 * what a granulator driven as an insert is.
 */
~~~

### err-gone

Above `(end of file)`, lines 764 to 782 before the cut.

~~~js
/**
 * 🔴 ERR'S 1965 ARCHIVE LEFT THIS FILE ON 2026-09-16, ALL OF IT.
 *
 * `errSearch`, `errItem`, `errExcerpt`, `errStatus` and `loadBuffers` pulled a
 * broadcast out of `arhiiv.err.ee`, cut a minute of it to a WAV with ffmpeg and
 * wrote that into the four grain buffers. No page in `demo/` ever called any of
 * them, and every connection this repo opens to ERR appears in a public
 * broadcaster's audience measurement. So a path to their archive from a board
 * nobody is watching was exposure with nothing on the other side of it.
 *
 * `archive/box-pappus/pappus-err.js` is the code, verbatim, including the
 * politeness this file had earned the hard way: a disk cache for a year that
 * ended sixty years ago, a floor between requests, and a backoff that stopped
 * asking when ERR said no. Read that before writing anything like it again.
 *
 * ⚠️ WHAT DID NOT GO: `PosSource` and everything around `source()` above. That
 * material is BUILT on this board from a spec `/grains/` sends, touches nobody
 * else's server, and is the whole point of that page.
 */
~~~

## `rig/board/synth.mjs`

### synth-header

Above `import { rhodesVoice, mixVoices } from '../../demo/shell/rhodes.mjs';`, lines 1 to 16 before the cut.

~~~js
// rig/board/synth.mjs — the board makes its own sound.
//
// The synth is `demo/shell/rhodes.mjs`, IMPORTED, not ported. That module was
// written as pure per-sample arithmetic for exactly this move: the same maths
// that runs in an AudioWorklet at /carry/ runs here in plain node, so the board
// and the browser cannot drift into two instruments that merely sound similar.
//
// Measured before it was written: 8 voices render at 41x realtime on an M1.
// A Cortex-A72 runs this kind of JS roughly 8-12x slower, which puts a Pi 4 at
// 3-4x realtime — about a third of one core, three cores spare. (The 8-12x is
// an ESTIMATE from the class of chip, not a measurement; `node bench.mjs` on
// the board settles it in ten seconds and that number replaces this sentence.)
//
// The consequence is the interesting part: with this file, a bare Pi is a
// complete instrument. No Circuit, no audio interface, no soundcard — notes
// arrive over the relay, sound leaves over the relay.
~~~

### synth-steal

Above `if (voices.length > maxVoices) voices.shift();`, lines 44 to 45 before the cut.

~~~js
// Oldest first, so a held pedal-chord loses its quietest rather than its
// newest — dropping what was just played is the audible failure.
~~~

### synth-clock

Above `startRealtime(onFrame, { tickMs = 10 } = {}) {`, lines 77 to 82 before the cut.

~~~js
/**
 * Realtime clock. A plain setInterval(20) DRIFTS — timers fire late, the
 * error accumulates, and the stream slowly runs short, which sounds like
 * dropouts and reads as network loss. So render against elapsed time and
 * catch up: the sample counter is the truth, the timer is only a nudge.
 */
~~~

### synth-guard

Above `if (guard >= 25) n = want;`, lines 89 to 91 before the cut.

~~~js
// guard: if the process was suspended (a lid closing, a long GC), do not
// try to emit ten seconds of backlog at once — that would trip the
// relay's 60 msg/s cap, which drops SILENTLY.
~~~

### synth-alsa

Above `export function alsaNotes(spawn, onNote, { port } = {}) {`, lines 99 to 108 before the cut.

~~~js
/**
 * Notes from ALSA, on the board. `aseqdump` creates its own sequencer port, so
 * the synth is patchable by the SAME patchbay as any hardware:
 *   aconnect circuit aseqdump
 *
 * ⚠️ `stdbuf -oL`. aseqdump writes text, and stdio BLOCK-buffers when its
 * output is a pipe rather than a terminal — 4 KiB of note events would arrive
 * in one burst seconds late. It would look like network latency and it would be
 * a libc default. Line buffering is not optional here.
 */
~~~

### synth-moog

Above `export function createMoogSynth({ maxVoices = 8, patch = 'bass' } = {}) {`, lines 128 to 136 before the cut.

~~~js
/**
 * A subtractive instrument, same clock, different voice.
 *
 * It is a separate factory rather than a parameter on createSynth because the
 * two voices are shaped differently and always will be: a Rhodes voice is a
 * pure function of time since onset, while this one carries filter state and
 * must be stepped in order. Pretending they are the same thing behind a flag
 * would be two components in a trenchcoat.
 */
~~~
