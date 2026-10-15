# rig-board-io

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/board/alsa.mjs`

### alsa-header

Above `import { execFileSync } from 'node:child_process';`, lines 1 to 12 before the cut.

~~~js
// rig/board/alsa.mjs — the patchbay, as a value.
//
// plan-hardware §8.4: a wrong MIDI patch is SILENT. Nothing errors, no light
// changes, notes just do not arrive — and you are in another city. So every
// step here is arranged so that a patch is CHECKED before it is applied, and
// anything that cannot be checked is refused by name rather than attempted.
//
// Two backends, chosen by whether `aconnect` exists:
//   alsa  — the board
//   fake  — a fixture, so the whole naming/validation layer is testable on a
//           laptop with no hardware. It is NOT a simulation of MIDI; it stands
//           in for the port list only, and `apply` on it changes nothing.
~~~

### midi-kinds

Above `import { KINDS, ALIASES, canonKind } from '../../demo/shell/midi-kinds.mjs';`, lines 15 to 16 before the cut.

~~~js
// ⚠️ IMPORTED DIRECTLY, NOT THROUGH ANOTHER SHELL MODULE: `push.sh` ships only
// the `../../demo/shell` files a board module names itself.
~~~

### carry

Above `export const CARRY = KINDS;`, lines 19 to 24 before the cut.

~~~js
/**
 * 🔴 THE ONE KIND LIST SINCE 2026-10-03, shared with `bay.mjs` and the input
 * gate. This said `pitchbend` and `aftertouch` where the bay said `bend` and
 * `touch`; both old spellings are still ACCEPTED through `ALIASES`, so a patch
 * saved before the change still plans, and a step reports the new name.
 */
~~~

### parse-aconnect

Above `export function parseAconnect(text) {`, lines 35 to 43 before the cut.

~~~js
/**
 * Parse `aconnect -l`. Pure, so it is testable against a fixture — which is the
 * only reason the naming layer can be finished before the board arrives.
 *
 * The format is two indent levels and two prose lines:
 *   client 20: 'Circuit' [type=kernel,card=1]
 *       0 'Circuit MIDI 1  '
 *   \tConnecting To: 24:0
 */
~~~

### list-ports

Above `export function listPorts({ from, fixture = false } = {}) {`, lines 76 to 87 before the cut.

~~~js
/**
 * ⚠️ THE TWO ZEROES MUST NOT LOOK ALIKE. `aconnect -l` exits 1 with an empty
 * stdout when the sequencer is unreachable — no `/dev/snd/seq`, modules not
 * loaded, user not in `audio`. Measured in an arm64 Linux container,
 * 2026-09-10. Letting that surface as an empty client list would make "ALSA is
 * broken" indistinguishable from "nothing is plugged in", which is this
 * project's own rule about a partial result that is too tidy.
 *
 * So a failure is a REPORTED FACT rather than a throw: the board stays up and can
 * say what is wrong over the relay, which is the point of a service nobody can
 * walk over to.
 */
~~~

### addressable

Above `export function addressable(clients) {`, lines 114 to 119 before the cut.

~~~js
/**
 * Flatten to the addressable things, with the plumbing hidden. `System` and
 * `Midi Through` are always present and are never what anybody means by "the
 * circuit"; leaving them in the candidate set is how a fuzzy match picks the
 * wrong port and the patch goes silent.
 */
~~~

### resolve

Above `export function resolve(name, ports) {`, lines 138 to 145 before the cut.

~~~js
/**
 * THE NAMING LAYER IS THE PRODUCT (plan-hardware §8.4). ALSA says `20:0`;
 * nobody says that out loud. This maps what a person says onto a port.
 *
 * Ambiguity is REPORTED, never broken by picking the first — a patch that
 * silently chose the wrong one of two matching devices is the exact failure
 * this whole file is arranged to prevent.
 */
~~~

### alsa-plan

Above `export function plan(doc, ports) {`, lines 172 to 184 before the cut.

~~~js
/**
 * Turn a patch document into steps, WITHOUT touching the rig. This is the whole
 * point: the answer to "will this work" arrives before anything changes.
 *
 * ⚠️ `carry` is the part `aconnect` cannot do. An ALSA subscription is
 * unfiltered — it carries every message class the source emits, and there is no
 * per-class option on the connection. So a document asking for a SUBSET is
 * refused rather than approximated: applying a full connection where "note
 * only" was asked would leak clock and transport into a rig, which is most of
 * what makes dawless setups painful and exactly what the document was written
 * to control. Refusing is loud; over-connecting is silent.
 * (To verify on the board — see README.)
 */
~~~

### alsa-apply

Above `export function apply(planned, { dry = false } = {}) {`, lines 223 to 227 before the cut.

~~~js
/**
 * Apply a plan. Refuses outright unless the plan is clean — there is no
 * "apply the parts that worked", because a half-applied patch is a rig whose
 * state nobody wrote down.
 */
~~~

### sources-of

Above `export function sourcesOf(listing, match) {`, lines 251 to 263 before the cut.

~~~js
// `sourcesOf` moved here from yoshimi.mjs on 2026-10-13, when Yoshimi left the
// board (archive/yoshimi/README.md): it reads any client's sources off
// `aconnect -l`, and `jacksynth.mjs` `strayMidiSources` uses it for every JACK synth.
/**
 * Who feeds a sequencer client, out of `aconnect -l`, as `{ id, name }` per
 * source port. `match` is a RegExp on the client's name or `(id, name) => bool`. The board's check that Yoshimi hears the virmidi port and
 * nothing else: an instance edited by hand, or a Yoshimi that ignores the
 * setting, would show the Circuit here.
 *
 *   client 128: 'yoshimi' [type=user,pid=4321]
 *       0 'input           '
 *           Connected From: 16:0, 44:0[real:0]
 */
~~~

## `rig/board/ask.mjs`

### ask-header

Above `import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';`, lines 1 to 11 before the cut.

~~~js
// rig/board/ask.mjs — a client, so the board can be driven from a terminal.
//
// The point of §8.7 is that a browser is one client among several, not the
// interface. This is the proof: curl-shaped, no page, same room, same envelope.
//
//   node ask.mjs --room studio-1 ports.get
//   node ask.mjs --room studio-1 patch.plan  '{"v":1,"links":[{"from":"circuit","to":"microfreak"}]}'
//   node ask.mjs --room studio-1 patch.apply '{"v":1,"links":[{"from":"digitakt","to":"microfreak"}]}'
//   node ask.mjs --room studio-1 jack.list
//   node ask.mjs --room studio-1 jack.plan '{"v":1,"links":[{"from":"yoshimi:left","to":"posboard:input_1"}]}'
//   node ask.mjs --room studio-1 listen 5            watch everything for 5 s
~~~

### ask-doc

Above `const takesDoc = VERB.startsWith('patch.') || VERB === 'jack.plan' || VERB === '`..., lines 36 to 40 before the cut.

~~~js
// A patch verb takes a DOCUMENT and everything else takes FIELDS. Nesting
// both under `patch` meant `audio.start {"source":"yoshimi"}` arrived with
// no source at all and fell back to the built-in synth, reporting ok:true for
// an instrument nobody asked for, which is the worst kind of wrong.
// `jack.plan` and `jack.apply` take a document too (rig/board/jack.mjs).
~~~

### ask-envelope

Above `const { id, from, sent, seq: _s, re, ...body } = msg;`, lines 53 to 55 before the cut.

~~~js
// The envelope is stripped; `at`, if any, is the payload's own event time
// since 2026-10-04 and stays in the body. `parse()` has already turned an
// old board's envelope `at` into `sent`.
~~~

## `rig/board/beat.mjs`

### beat-header

Above `import { boardGraph } from '../../demo/shell/graph-registry.mjs';`, lines 1 to 23 before the cut.

~~~js
// rig/board/beat.mjs: what the board says about itself, `board.hello` when it
// joins and `board.alive` every five seconds, as two pure functions.
//
// They lived inline in `board.mjs` until 2026-10-04, where nothing could reach
// them: that file dials the relay the moment it is imported. They moved here
// when both messages started carrying `graph` (plans/plan-universal-routing.md
// §11 step 3), because a field that a page draws the desk from is a field a
// test has to be able to read, and `test.mjs` imports this file.
//
// ⚠️ THE FACTS ARE PASSED IN, NEVER LOOKED UP. Everything the board has to ask
// the machine for (`aconnect -l`, `which yoshimi`, whether `/dev/video11`
// exists) is asked in `board.mjs` and handed over, so this file runs the same
// on a laptop and on the Pi.
//
// 🔴 `graph-registry.mjs` IS IMPORTED HERE, AND `push.sh` SHIPS IT FROM HERE.
// Its grep reads every `rig/board/*.mjs` for an import that climbs two levels,
// so a direct import from any file in this directory is enough. An import that
// went through another `demo/shell/` file would not be followed, which is why
// that file itself imports nothing.
// ⚠️ THE GREP READS COMMENTS TOO. A comment here quoting the import pattern
// with a placeholder path was matched as an import and handed to `tar` as a
// file to ship, 2026-10-04, caught before any push. Never write that pattern
// in a comment in this directory.
~~~

### graph-of

Above `const present = (f, port) => (typeof f.midiPresent === 'function'`, lines 27 to 41 before the cut.

~~~js
/**
 * The board as a graph, from what the board knows.
 * @param {object} f
 * @param {string} f.room
 * @param {string} [f.site]         `BOARD_SITE`, `pi-1` when unset
 * @param {string} [f.net]          `BOARD_NET`, left out when unset
 * @param {object} f.instruments    the map `board.hello` sends: name -> available
 * @param {Map|Array} f.inputs      `parseInputs(...).inputs`, a Map, or its values
 * @param {Array} f.ports           `addressable()` rows, `state().ports`
 * @param {number} f.frameMs
 * @param {boolean} f.gpu           `videoAvailable()`, announced as the `shader` node
 * @param {boolean} [f.camera]     a camera key is set AND `findCamera()` found one (camera.mjs)
 * @param {function} [f.midiPresent] `(port) => boolean`, is that ALSA card there now
 * @param {boolean} [f.jack]         the board has a JACK graph, so its JACK ends are announced
 */
~~~

### inputs

Above `inputs: inputs.map((i) => ({ name: i.name, channels: i.channels,`, lines 50 to 57 before the cut.

~~~js
// Only what the graph reads. `device` is an ALSA name on the board and
// means nothing to a page, so it does not ride on every beat.
// 🔴 AN INPUT'S MIDI IS ANNOUNCED ONLY WHILE ITS DEVICE IS THERE. MEASURED
// 2026-10-04: the Circuit was unplugged, the board went on announcing its
// MIDI input from the config, `/patchbay/` offered the link and every note
// failed with ENOENT on `/proc/asound/Circuit`. `midiPresent` is asked on
// every beat (one lookup), so a replug shows up within five seconds; with
// no answer to ask, the ALSA list from the last hello decides.
~~~

### hello

Above `export function helloMsg(f) {`, lines 66 to 73 before the cut.

~~~js
/**
 * `f.graphFacts` is what `graphOf` takes, and the hello is where the board
 * gathers it: the same object rides on every beat after it.
 * ⚠️ `audioChannels` is NOT a count of MIDI channels, which is 16 and
 * multitimbral. The board captures `arecord -c 1`, so it says
 * ONE, and `demo/able`'s Mac says two: both counts are on the relay at once
 * and no page is left inferring which it is holding.
 */
~~~

### alive

Above `export function aliveMsg(f) {`, lines 84 to 91 before the cut.

~~~js
/**
 * ⚠️ ONE SHAPE, ONE PLACE. `board.mjs` sends this from the heartbeat and from
 * `sweepInsert()`, so two copies of this object is how a field ends up on one
 * of them. `insert` is `insertState()`, spread so the fields stay top level
 * where every page already reads them.
 * ⚠️ `graph` IS LEFT OUT UNTIL THE FIRST HELLO, because the facts it is built from
 * are gathered there. A beat before the socket opens is not sent anyway.
 */
~~~

## `rig/board/camera.mjs`

### camera-header

Above `import { spawn, spawnSync, execFileSync } from 'node:child_process';`, lines 1 to 35 before the cut.

~~~js
// rig/board/camera.mjs: the Pi's own camera, sent only to holders of a key.
//
// Asked 2026-10-13: *"add pi camera to https://positron.studio/concepts/remote/010/.
// url secret parameter to enable (key in cf secrets)"*. The picture of the
// Circuit, from a camera on the Raspberry Pi it is plugged into, shown on the
// Circuit page only when the page's URL carries the key.
//
// WHO CAN TURN THE CAMERA ON. Only somebody in the room `<room>-cam` on the
// relay, and the relay lets a socket in that room speak or hear nothing until
// its first message carries the key that matches the Cloudflare secret
// `PI_CAM_KEY` (workers/relay/src/index.js, `CAM_ROOM`). The board joins that
// room with the same key from its own environment (`BOARD_CAM_KEY` in
// /etc/default/positron-board) and starts the camera only on a `cam.watching`
// heard there. Nothing on the board's ordinary room can start it: there is no
// camera verb in board.mjs's `handle()`, on purpose, because that room is
// tokenless and anybody can speak in it.
//
// WHEN IT STOPS. Every viewer says `cam.watching` every ten seconds while its
// tab is visible, and `cam.bye` when it stops or leaves. The camera stops on the
// last `cam.bye`, or `CAM_IDLE_MS` after the last `cam.watching` from anybody,
// whichever comes first, and when the board loses the room. A socket count is
// not used, for the reason board.mjs gives at `watchVideoViewers`: the relay
// reported seven sockets in a room nobody was watching.
//
// WHAT IS SENT. The same frame the shader picture uses (demo/shell/board-video.mjs):
// a uint32 LE counter, a uint32 LE flag word with bit 0 on a keyframe, then one
// H.264 access unit in Annex B. So the page decodes it with `createBoardVideo`.
// Text in the room is plain JSON: `cam.started`, `cam.refused`, `cam.stopped`,
// `cam.tick` (the counter and the board's clock once a second, for a delay
// estimate) and `cam.pong`.
//
// ⚠️ THE HARDWARE ENCODER IS SHARED WITH THE SHADER PICTURE. On a Pi 4
// `rpicam-vid` encodes on /dev/video11, which is the device `video.mjs` holds for
// /remote/shader-on-pi/. Two users of it do not fail, they block (video.mjs
// says so at length), so each refuses while the other runs.
~~~

### direct-piece

Above `export const DIRECT_PIECE = 16 * 1024 - 8;`, lines 47 to 64 before the cut.

~~~js
// ── the direct path, since 2026-10-13 ───────────────────────────────────────
// Asked: *"can https://positron.studio/concepts/remote/010/?cam= go direct
// too?"*. The frames can leave on a page's direct WebRTC link to the Circuit's
// input (rtc.mjs, inputs.mjs), on a third data channel `cam` beside `pcm` and
// `ctl`, instead of through the relay. The keyed room stays the control: the
// key check, `cam.watching`, `cam.bye` and the start and stop all still happen
// there, and only the frames and the clock ticks move.
// 🔴 TWO GATES, BOTH REQUIRED. `attachDirect` takes the key (compared with this
// board's BOARD_CAM_KEY) AND the page's viewer name, which must be one this
// room heard `cam.watching` from, which the relay delivers only from a socket
// whose key it took. So a direct link alone opens nothing, and neither does a
// key alone.
// ⚠️ IN PIECES OF 16 KB, ORDERED AND RELIABLE. A keyframe is tens of KB and
// 16 KB is the message size every SCTP stack takes; in order and reliable,
// because a decoder fed a frame with a hole in it is broken until the next
// keyframe, and the relay was a TCP stream too. Piece header: uint32 counter,
// uint32 flags (bit 0 keyframe, bit 1 more pieces follow), then the bytes.
/** Bytes of picture per piece on the `cam` channel. */
~~~

### rpicam-list

Above `export function parseRpicamList(text) {`, lines 100 to 104 before the cut.

~~~js
/**
 * `rpicam-hello --list-cameras`, read. A line per camera:
 *   `0 : imx708 [4608x2592 10-bit RGGB] (/base/soc/i2c0mux/i2c@1/imx708@1a)`
 * and `No cameras available!` when there is none.
 */
~~~

### v4l2-devices

Above `export function parseV4l2Devices(text) {`, lines 114 to 117 before the cut.

~~~js
/**
 * `v4l2-ctl --list-devices`, read: a name line ending in a colon, then the
 * device nodes indented under it.
 */
~~~

### not-a-camera

Above `const NOT_A_CAMERA = /bcm2835-codec|bcm2835-isp|rpi-hevc|hevc-dec|pispbe|rp1-cfe`..., lines 129 to 133 before the cut.

~~~js
/**
 * The Pi's own codec, ISP and CSI receiver nodes are video devices too, and
 * none of them is a camera you can open with `-f v4l2`. A USB camera is the
 * block left when they are taken out.
 */
~~~

### find-camera

Above `export function findCamera({ source = process.env.BOARD_CAM_SOURCE || '', runner`..., lines 144 to 149 before the cut.

~~~js
/**
 * Which camera this board has, asked of the machine every time rather than
 * remembered: a CSI camera through libcamera first, then a USB one through
 * V4L2. `BOARD_CAM_SOURCE=test` is a stand-in picture made by ffmpeg, so the
 * whole path can run on a laptop with no camera and nobody's picture in it.
 */
~~~

### au-splitter

Above `export function createAccessUnitSplitter(onUnit) {`, lines 201 to 217 before the cut.

~~~js
/**
 * Cut Annex B into one access unit per frame, for an encoder that does NOT
 * repeat SPS and PPS on every frame.
 *
 * ⚠️ `video.mjs`'s splitter cuts at each SPS, which is right for
 * `h264_v4l2m2m` (MEASURED there: parameter sets before every frame) and wrong
 * here: `rpicam-vid --inline` and libx264 with `dump_extra` put them before a
 * keyframe only, so cutting at SPS would make each unit a whole second of
 * frames. A frame begins at an access unit delimiter, at a parameter set or SEI
 * not already inside a frame's header, or at the FIRST slice of a picture that
 * no header precedes.
 * ⚠️ FIRST SLICE, NOT ANY SLICE. MEASURED 2026-10-13 on libx264 with
 * `-tune zerolatency`: three slices per frame (sliced threads), so cutting at
 * every slice made 270 units of 90 frames. A slice whose `first_mb_in_slice` is
 * 0 starts a picture, and that field is the first Exp-Golomb code after the NAL
 * header byte, so it is 0 exactly when the top bit of the next byte is set.
 */
~~~

### camera-room

Above `export function createCameraRoom({ relay, room, key, log = () => {}, encoderBusy`..., lines 315 to 323 before the cut.

~~~js
/**
 * The board's side of the keyed room. Joins it, proves the key, and runs the
 * camera while a keyed viewer is watching.
 *
 * @param {string} relay       wss base, as board.mjs has it
 * @param {string} room        `<room>-cam`
 * @param {string} key         BOARD_CAM_KEY; empty means the feature is off and nothing is joined
 * @param {function} encoderBusy  true while the shader picture holds the hardware encoder
 */
~~~

## `rig/board/jack.mjs`

### jack-header

Above `import { execFileSync } from 'node:child_process';`, lines 1 to 44 before the cut.

~~~js
// rig/board/jack.mjs: the JACK audio graph, as a value.
//
// The ALSA half of this board's patchbay has been a document since session 17
// (`alsa.mjs`): `aconnect -l` parsed, a patch planned before anything changes,
// a half application refused. The JACK half was shell strings in
// `jacksynth.mjs`, 21 of them by 2026-10-11, and nothing could say what a
// re-patch was going to do before it did it. This file is that missing half,
// in the same shape (plans/plan-nodes.md §5.4, plans/plan-nodes-revisited.md §3
// item 3).
//
// 🔴 THE TWO ARMS DO NOT SHARE A VOCABULARY, AND THIS FILE DOES NOT PRETEND
// THEY DO. Written down rather than flattened:
//
//   ALSA (alsa.mjs)                      JACK (this file)
//   a port is `20:0`, found by name      a port is `client:port`, EXACT, no fuzzy match
//   one subscription carries every       one connection carries ONE channel of
//     message class, `carry` subsets       one type; there are no classes, so a
//     are refused because aconnect         `carry` field is refused by name
//     cannot filter
//   stereo does not exist                left and right are two links, and a
//                                          link per channel is the whole point
//   two sources into one port merge      two sources into one input SUM, which is
//     streams                              how this board's capture is mono-sum
//   a plan only adds                     a plan may OWN an input: every source
//                                          feeding it that the document does not
//                                          name is disconnected (`own`)
//   any port may go anywhere             direction and type are checked: an
//                                          output into an input, audio into audio
//
// ⚠️ A WRONG JACK PATCH IS SILENT, LIKE A WRONG MIDI ONE, AND IT IS WORSE:
// a missing right channel still sounds like a working instrument (MEASURED,
// 2026-09-13: mono-left read a note at 1661 Hz where mono-sum read 2029 Hz).
// So `apply` answers with the graph READ BACK, never with the commands having
// run. `jack_connect` exits 1 both when it fails and when the link already
// existed (MEASURED on the board 2026-10-11, both with the text on stderr), so
// an exit status cannot be the verdict.
//
// 🔴 A PORT IS NOT A READY ENGINE. `fx.pappus` once answered ok the moment
// `SuperCollider:out_1` appeared, about seven seconds before the engine had
// compiled, and every command sent in the gap vanished (session 18). This file
// checks the WIRE and nothing behind it: an applied link to a client that is
// still loading reads as connected and carries silence. Waiting for an engine
// is the caller's job and stays there (`pappusFx` waits for `PAPPUS READY`
// before it patches anything).
~~~

### parse-lsp

Above `export function parseJackLsp(text) {`, lines 50 to 66 before the cut.

~~~js
/**
 * `jack_lsp -c`, optionally with `-p` and `-t`, as rows. Pure, so it is graded
 * against text captured off the board (`fixtures/jack-lsp-c-pi.txt`,
 * `fixtures/jack-lsp-cpt-pi.txt`, both 2026-10-11).
 *
 * The format, read off the Pi rather than off a manual:
 *   yoshimi:left                         a port, at column 0
 *      posboard:input_1                  a connection, three spaces
 *   \tproperties: output,                `-p`, one tab
 *   \t32 bit float mono audio            `-t`, one tab
 *
 * ⚠️ A CONNECTION IS LISTED FROM BOTH ENDS, so a sink's list is everything
 * feeding it. ⚠️ jackd's own complaint (`Cannot lock down 107350048 byte memory
 * area`) goes to STDERR on this board, but a caller that merged the streams
 * would hand it in as a port, so a column-0 line with no colon is not a port
 * and is kept in `noise` rather than dropped or invented into a row.
 */
~~~

### names

Above `let NAMES = new Map(), REAL = new Map();`, lines 110 to 121 before the cut.

~~~js
/**
 * 🔴 PORT NAMES, WHEN jackd OWNS A CARD, SINCE 2026-10-11. With `jackd -d alsa`
 * on the Fast Track Pro the Circuit is `system:capture_1`, not the
 * `circuit:capture_1` that `alsa_in -j circuit` registered and that every bay
 * link, `graph-registry.mjs` `inputJack` and `jack-bay-live.mjs` name. JACK
 * cannot rename its driver's client, so the board renames at this ONE
 * boundary: every listing reads the real name as the input's name, and every
 * connect or disconnect turns it back. Everything above this file keeps
 * saying `circuit:capture_1` and never learns which bridge is under it.
 * ⚠️ An exact map, never a prefix: `system:capture_1` is not
 * `system:capture_10`. An empty map is the dummy driver and changes nothing.
 */
~~~

### list

Above `export function listJack({ from, text } = {}) {`, lines 138 to 143 before the cut.

~~~js
/**
 * The graph as it is now. `{ backend, rows, error }`.
 * ⚠️ AN EMPTY LIST MEANS NO SERVER, NOT NO PORTS: a running jackd always has
 * at least its driver's ports. That is `jacksynth.mjs`'s established reading
 * and it is kept, as `error`, so "jackd is down" never reads as a quiet graph.
 */
~~~

### last-line

Above `const last = String(r.err).trim().split('\n').map((x) => x.trim()).filter(Boolea`..., lines 149 to 150 before the cut.

~~~js
// The useful sentence is jack_lsp's LAST line; the five above it are
// libjack's shared memory bookkeeping (read off the board 2026-10-11).
~~~

### canonical

Above `export function canonical(doc) {`, lines 159 to 163 before the cut.

~~~js
/**
 * A document in canonical form: links deduplicated and sorted, `own` sorted,
 * nothing else kept. Two documents that mean the same thing print the same,
 * which is plans/plan-nodes.md §4.1 rule 3.
 */
~~~

### plan

Above `export function plan(doc, rows) {`, lines 184 to 206 before the cut.

~~~js
/**
 * Turn a document into steps WITHOUT touching the graph.
 *
 *   { v: 1,
 *     links: [ { from: 'yoshimi:left', to: 'posboard:input_1' }, ... ],
 *     own:   [ 'posboard:input_1' ] }        optional
 *
 * `links` must be there afterwards. `own` names inputs whose WHOLE feed this
 * document decides, so anything else feeding one of them is disconnected; an
 * input not owned is only ever added to. An owned input that is not on the
 * graph has nothing feeding it and is skipped, not refused.
 *
 * Refused, by name, and then NOTHING is planned: an unknown `v`, a port that is
 * not on the graph, a name with no colon, an input as a source or an output as
 * a destination, audio into MIDI, a port to itself, and any `carry`.
 * Direction and type are checked only when the listing carried them (`-p -t`);
 * `checked` says which were, so a plan made from bare `-c` text does not claim
 * a check it could not make.
 *
 * ⚠️ STEPS DISCONNECT FIRST, THEN CONNECT, which is the order `pappusFx` has
 * always used: a few milliseconds of gap rather than a moment with the wrong
 * source and the right one both summed into the capture.
 */
~~~

### no-fuzzy

Above `const client = n.includes(':') ? n.slice(0, n.indexOf(':')) : n;`, lines 225 to 227 before the cut.

~~~js
// ⚠️ NO FUZZY MATCH. `yoshimi` meaning `yoshimi:left` is exactly how a
// patch ends up with one channel of a stereo instrument and sounds fine.
// The candidates are offered so a person can pick, never picked for them.
~~~

### diff

Above `export function diff(doc, rows) {`, lines 266 to 270 before the cut.

~~~js
/**
 * What a document and a graph disagree about, with no steps: the same reading
 * `plan` makes, for a REPORT. `missing` is a named link that is not there,
 * `extra` a source feeding an owned input that the document did not name.
 */
~~~

### apply

Above `export function apply(planned, { dry = false, run = runStep, read = () => listJa`..., lines 291 to 303 before the cut.

~~~js
/**
 * Apply a plan, then READ THE GRAPH BACK and answer from that.
 *
 * Refuses outright unless the plan is clean: there is no "apply the parts that
 * worked", because a half applied patch is a graph whose state nobody wrote
 * down. `run` and `read` are injectable so the whole of this is gradeable on a
 * laptop (`test.mjs`); on the board they are `jack_connect`/`jack_disconnect`
 * and `jack_lsp -c -p -t`.
 *
 * `ok` is the READ BACK: every named link present and nothing unnamed feeding
 * an owned input. A step whose command printed something is kept with its text
 * in `said`, and is not by itself a failure.
 */
~~~

## `rig/board/midi-back.mjs`

### midi-back-header

Above `/** The macro knobs, CC 80 to 87. */`, lines 1 to 25 before the cut.

~~~js
// rig/board/midi-back.mjs: what the instrument says back, and the one part of
// it a page is told.
//
// 🔴 ASKED 2026-10-13: *"make all concept knobs \"invisible-handed\" start from
// remote 010"*. On /remote/circuit-on-pi/ the eight macro knobs M1 to M8 send
// CC 80 to 87 to the Circuit, and a hand turning the Circuit's own macro knob
// on the desk was not seen by the page, because nothing read the Circuit's
// MIDI out except a patch dump request (`inputs.mjs` `askBack`).
// 📏 MEASURED, NOT READ: the Circuit sends its macro knobs as plain absolute
// 7 bit CC 80 to 87 on channel 1 when they are turned by hand
// (research/measured-devices-2026-09-20.md, "Circuit macro 7 is CC 86", a full
// 0 to 127 sweep each, read through Web MIDI on the Mac). The Pi reading the
// same USB port through ALSA raw MIDI is not measured yet.
//
// 🔴 WHAT LEAVES IS AN ALLOWLIST AND IT IS SMALL: CC 80 to 87 on channels 1
// and 2, the macros of Synth 1 and Synth 2. Not the clock (48 a second,
// unattended), not notes, not SysEx, not the master filter on 16. A page that
// wants more asks for it by name here, never by widening a test.
// 🔴 AND IT IS RATE LIMITED PER CONTROLLER, LAST VALUE WINS. A hand sweeping a
// knob sends a CC per detent, 128 in a second or two; at most `GAP_MS` apart
// per controller reaches the room, and the value a hand stopped on always
// goes, late by at most one gap, never dropped.
//
// Pure apart from the timer it is handed, so `midi-back-test.mjs` grades it
// with no board, no ALSA and no relay.
~~~

### midi-parser

Above `export function createMidiParser() {`, lines 34 to 41 before the cut.

~~~js
/**
 * Channel voice messages out of a raw MIDI byte stream, as ALSA raw MIDI hands
 * it over in arbitrary chunks. Real time bytes (F8 to FF) may sit anywhere,
 * even inside another message, and are skipped without breaking it. SysEx is
 * skipped whole. Running status is honoured, because a stream is allowed to
 * use it even if USB MIDI from the Circuit has not been seen to.
 * Returns `[status, d1, d2?]` arrays.
 */
~~~

### midi-back-limiter

Above `export function createBackLimiter({ emit, gapMs = GAP_MS, now = () => Date.now()`..., lines 77 to 81 before the cut.

~~~js
/**
 * Per controller, at most one value every `gapMs`, and the last one always
 * goes. A value inside the gap waits for the gap's end; a newer one overtakes
 * it rather than queueing behind it. `emit({ ch, cc, v })`.
 */
~~~

## `rig/board/migrate-from-box.sh`

### migrate-header

Above `set -uo pipefail`, lines 2 to 26 before the cut.

~~~sh
# rig/board/migrate-from-box.sh — move a board from the `box` names to the
# `board` names, once. 2026-09-20.
#
#   ./migrate-from-box.sh <pi>
#
# 🔴 WHY THIS IS NOT `push.sh`. That script ships code to a path that exists and
# restarts a unit that is installed. This rename changes the NAME of all three:
# the install path (`/opt/positron-box` -> `/opt/positron-board`), the systemd
# unit (`positron-box.service` -> `positron-board.service`) and the config file
# (`/etc/default/positron-box` -> `/etc/default/positron-board`). Running
# `push.sh` before this would write into a directory nothing executes and then
# restart a unit that does not exist, and both halves would report success.
#
# ⚠️ IT KEEPS THE OLD INSTALL. `/opt/positron-box` and the old unit file are
# left on disk, disabled. Rolling back is `systemctl disable --now
# positron-board && systemctl enable --now positron-box`, and that is worth more
# than the 40 MB it costs.
#
# ⚠️ IT CARRIES THE OLD CONFIG FORWARD RATHER THAN DEFAULTING IT. `ROOM` and
# `PAPPUS_TINY` are read off the existing file: this board is the studio board
# and its room is `studio-1`, which is a fact about THIS machine and not a
# default any installer should have. `setup.sh` now refuses to guess it.
#
# ⚠️ IT IS IDEMPOTENT. Run it twice and the second run mints no new id, because
# an id that changes on every run is not an id.
~~~

### migrate-vis

Above `ssh "$USER_@$IP" 'cd /opt/positron-board/rig/vis 2>/dev/null && {`, lines 87 to 91 before the cut.

~~~sh
# 🔴 THE FIRST RUN OF THIS SCRIPT MISSED THIS AND `rig/audit.mjs` FOUND IT.
# `push.sh` compiles rig/vis on the board when its source is newer than the
# binary, and the binary lives beside its source — so moving the tree to a new
# path leaves no binary at the new one. The service came up fine and visuals
# would have reported unavailable, which is the quiet kind of broken.
~~~

### migrate-journal

Above `ssh "$USER_@$IP" "`, lines 102 to 105 before the cut.

~~~sh
# MEASURED 2026-09-20: /var/log/journal was empty, the journal lived on tmpfs,
# `journalctl --list-boots` showed one boot, and every line from the day the
# output level collapsed was gone. board.mjs says in a comment that the journal
# is the one record that survives a board nobody can reach. It did not.
~~~

## `rig/board/provision.sh`

### provision-header

Above `set -uo pipefail`, lines 2 to 10 before the cut.

~~~sh
# rig/board/provision.sh — find the board on the LAN and set it up, from here.
#
#   ./provision.sh              sweep the subnet for it
#   ./provision.sh <pi> go straight to it
#
# Why a sweep rather than `positron-board.local`: mDNS is multicast UDP and does
# not survive every sandbox — a `.local` lookup here returns "Unknown host"
# while plain IPs on the same subnet answer fine. Rather than depend on name
# resolution that may or may not exist, ask every address whether it is the board.
~~~

### provision-room

Above `[ -n "${ROOM:-}" ] || { echo "provision.sh needs a room: ROOM=<name> ./provision`..., lines 49 to 51 before the cut.

~~~sh
# ⚠️ THE ROOM COMES FROM THE CALLER AND HAS NO DEFAULT. It used to read
# `${ROOM:-studio-1}`, which pointed every board anybody provisioned at the
# studio board's own room. `setup.sh` refuses without one.
~~~

## `rig/board/push.sh`

### push-header

Above `set -uo pipefail`, lines 2 to 17 before the cut.

~~~sh
# rig/board/push.sh — put THIS checkout on the board and restart the service.
#
#   ./push.sh                 find the board, ship, restart, show the log
#   ./push.sh <pi>   skip the search
#   ./push.sh --no-restart    ship only (a running instrument keeps playing)
#
# `provision.sh` is the first-run path: it installs packages, kernel modules and
# the unit file. This is the loop you use fifty times after that, and it exists
# because doing it by hand got the destination wrong.
#
# ⚠️ THE SERVICE RUNS FROM /opt/positron-board, NOT FROM ~/positron.
# `provision.sh` unpacks into ~/positron and `setup.sh` copies that to /opt.
# A file edited in ~/positron changes nothing, and the copy already on the board
# there is stale — it has no pappus.mjs at all. So this writes to /opt directly
# and prints the md5 of what landed, because "it deployed" and "it says it
# deployed" have been different things here before.
~~~

### push-find

Above `if [ -z "$IP" ]; then`, lines 32 to 35 before the cut.

~~~sh
# ── find it ──────────────────────────────────────────────────────────────────
# Port 22, not mDNS and not ARP. `positron-board.local` does not resolve from this
# sandbox (mDNS is multicast UDP) and guessing Raspberry Pi MAC prefixes in the
# ARP cache missed the board entirely while it was sitting on the subnet.
~~~

### push-tar

Above `( cd "$SRC/../.." && COPYFILE_DISABLE=1 tar cf - --no-xattrs --exclude=node_modu`..., lines 52 to 61 before the cut.

~~~sh
# rig/board plus every module it imports from outside itself, at the paths the
# imports expect. tar over ssh rather than rsync, which a fresh Pi OS Lite does
# not have.
# ⚠️ rig/vis GOES TOO. The renderer is a C program that has to be COMPILED on
# the board, and it lived in /tmp there until 2026-09-11 — one reboot from
# taking every number in plan-visuals §3 with it.
# ⚠️ COPYFILE_DISABLE=1: macOS tar otherwise adds an AppleDouble `._name` beside
# every file with extended attributes, and 18 of them were sitting in /opt on
# the board on 2026-10-10 (harmless, but they make an md5 comparison of the two
# trees read as 18 differences).
~~~

### push-vis

Above `ssh "$USER_@$IP" 'cd /opt/positron-board/rig/vis 2>/dev/null && {`, lines 72 to 74 before the cut.

~~~sh
# Cheap and idempotent: gcc is fast on two small files, and a binary older than
# its source is the failure this avoids — it would run the PREVIOUS shader and
# report the new one's name.
~~~

### push-sc-ext

Above `SC_EXT="/home/$USER_/.local/share/SuperCollider/Extensions"`, lines 84 to 100 before the cut.

~~~sh
# ⚠️ THE ENGINE HAS A SECOND HOME, AND sclang ONLY READS THAT ONE.
#
# `Engine_Pappus.sc` and `CroneEngine.sc` are SuperCollider CLASSES, so sclang
# compiles them from its Extensions directory — /opt/positron-board is not on its
# class path at all. Shipping the engine to /opt and restarting therefore
# changes NOTHING, silently: the service comes up, the engine loads, every
# command works, and it is the previous version of the file.
#
# MEASURED 2026-09-13: an added command read `CroneEngine: no command 'report'`
# and `PAPPUS READY 106 commands` while the copy in /opt had the new one and
# matched its md5. Two copies, two different md5s, and the md5 this script was
# printing was the one nobody compiles. That is LESSONS #39 in a third costume —
# ~/positron against /opt was the first, /opt against Extensions is this one.
# ⚠️ NOT `$HOME`. This string is interpolated into an ssh command by the LOCAL
# shell, so `$HOME` would expand to the Mac's home directory and every path
# below would be built for the wrong machine — a copy that succeeds into
# somewhere nothing reads, which is the exact failure this block exists to fix.
~~~

### push-classes

Above `ssh "$USER_@$IP" "mkdir -p $SC_EXT/pappus/lib && \`, lines 103 to 107 before the cut.

~~~sh
# ⚠️ EVERY CLASS, NOT JUST THE ENGINE. `PosSource.sc` is a class too, so the
# paragraph above applies to it word for word — and it is newer, so it is the
# one most likely to be left behind. A missing class does not fail loudly:
# sclang's compile stops at the first unknown name, `PAPPUS READY` never prints,
# and `fx.pappus` reports "the engine came up but never reported READY".
~~~

### push-md5

Above `ssh "$USER_@$IP" "md5sum $DEST/rig/board/board.mjs $DEST/rig/board/jacksynth.mjs`..., lines 114 to 131 before the cut.

~~~sh
# Not "ok" — the md5 of the file that will actually execute. Printing a success
# line is not evidence that a copy happened (CLAUDE.md).
# ⚠️ THE ENGINE'S md5 IS THE ONE FROM THE EXTENSIONS PATH, not from $DEST — see
# the block above. Printing $DEST's copy is printing a file nothing reads.
# ⚠️ `jacksynth.mjs` IS IN THIS LIST SINCE 2026-09-18 AND WAS NOT BEFORE. It
# holds the JACK graph: the chain, the insert's patching, the `jack.graph`
# report and the `jack.rebuild` repair. A deploy that landed
# board.mjs and not this one would answer the new verbs with `ReferenceError` on
# a board nobody can ssh to. An md5 that covers one of two changed files is a
# confirmation that can be true while the deploy is broken.
# ⚠️ AND THE COLLIDE ENGINE'S FOUR, SINCE 2026-10-12 (plans/plan-pi-supercollider-defs.md):
# `scollide.mjs`, its limiter script, and the compiler and SynthDef reader it
# imports from demo/shell. The compiler is the one most likely to be stale on the
# board, because a page compiles with the laptop's copy and `same` in `sc.loaded`
# then compares two different files.
# ⚠️ AND WHAT THE BOARD ANNOUNCES, SINCE 2026-10-14: `beat.mjs` and the
# `graph-registry.mjs` it imports build the graph on every hello and beat, so a
# stale copy announces the old node names (`gpu`) with nothing failing.
~~~

## `rig/board/rtc.mjs`

### rtc-header

Above `export const MAX_PEERS = 4;`, lines 1 to 37 before the cut.

~~~js
// rig/board/rtc.mjs: a direct path from a browser to one input, or to the
// board's main socket (`createMainDirect`, at the end), beside the relay.
//
// Asked 2026-09-30: *"can we bring roundtrip more down"*, then *"webrtc for
// away"*. `plans/plan-away-webrtc.md` has the whole case. The short of it: the
// relay was ~72 of the 93 ms from a key press to its note arriving back, and
// the laptop and this board are 4.1 ms apart by ping.
//
// MEASURED 2026-09-30, P0, headless Chrome on the laptop to `node-datachannel`
// 0.33.4 on this Pi, signalled through a relay room: the channel opened in
// 158 ms, the selected pair was HOST to HOST over UDP (libdatachannel resolved
// Chrome's `*.local` candidate by itself), and 200 of 200 frames of 1,932 bytes
// came back at p50 3.7 ms, p90 5.2, p99 8.8 round trip.
//
// 🔴 THE RELAY STAYS, AND IT IS STILL WHERE THIS STARTS. Offer, answer and
// candidates travel in the input's own room (`<room>-<name>`), each carrying
// the page's `peer` id, so no new worker exists and two browsers cannot answer
// each other. A page that cannot get a channel open keeps the relay.
//
// 🔴 A DATA CHANNEL IS NOT A WAY ROUND THE MIDI GATE. Every `ctl` message goes
// through the SAME `handle()` as a relay message (`inputs.mjs`), so
// `midiVerdict` decides both paths from one place.
//
// Two channels a browser, opened by the page:
//   pcm  unordered, no retransmits   the frames. A late frame is useless, and
//                                    ordered reliable delivery stalled behind a
//                                    lost packet at a p95 of 417 ms under 2 %
//                                    loss (proto/jam/NOTES.md, measured August).
//   ctl  unordered, reliable         input.want, midi.send, midi.panic,
//                                    audio.status. A note off must arrive, and
//                                    must not queue behind a lost note on.
//
// ⚠️ UNORDERED MEANS A NOTE OFF CAN OVERTAKE ITS NOTE ON on a fast tap, which
// leaves a note stuck on an instrument in another building. So a page numbers
// every `midi.send` (`n`, rising) and `fresher()` refuses anything older than
// the last message applied to the same key. Pure, and tested with the reorder
// as its negative control.
~~~

### fresher

Above `export function fresher(last, bytes, n) {`, lines 55 to 60 before the cut.

~~~js
/**
 * Should a numbered message be applied, given the last number applied to its
 * key. Updates `last` when it says yes. A message with no number, or with no
 * key, is applied: an older page and a refusal-bound message both reach the
 * gate as they did before.
 */
~~~

### note-key

Above `export function noteKey(m) {`, lines 70 to 74 before the cut.

~~~js
/**
 * The key a `note.on` or `note.off` is ordered and held within: its node, its
 * channel and its note. The main socket's verbs, where an input's are raw MIDI
 * bytes (`midiKey`). Null for anything that is not a note with a number.
 */
~~~

### fresher-note

Above `export function fresherNote(last, m) {`, lines 80 to 84 before the cut.

~~~js
/**
 * `fresher` for the main socket's notes. A numbered note older than the last
 * one applied to its key is refused; an unnumbered one is applied, so a page
 * that does not number its notes is no worse off than on the relay.
 */
~~~

### create-rtc

Above `export function createRtc({`, lines 94 to 98 before the cut.

~~~js
/**
 * The live half. `PeerConnection` is node-datachannel's class, or a fake.
 * `signal(msg)` sends into the relay room; `handle(msg, reply)` is the input's
 * own handler; `frameMs` is what the capture delivers per unit.
 */
~~~

### channels

Above `channels = [], onChannelClosed = () => {},`, lines 103 to 107 before the cut.

~~~js
// Labels a page may open beside `pcm` and `ctl`. Since 2026-10-13: `cam`,
// the Pi camera's frames on /remote/circuit-on-pi/ (camera.mjs
// `attachDirect`). A channel listed here is only HELD: nothing is sent on it
// until its owner is asked over `ctl` and says yes. Anything not listed is
// closed, as before.
~~~

### wall

Above `wall = () => Date.now(),`, lines 109 to 112 before the cut.

~~~js
// The board's wall clock, for `rtc.pong`'s `at`: with the round trip it
// gives the page the offset between the two clocks, which a camera lag
// measured against the board's clock needs (it is otherwise worth what NTP
// on both machines is worth).
~~~

### main-direct

Above `export function createMainDirect({ PeerConnection = null, signal, handle, frame,`..., lines 257 to 272 before the cut.

~~~js
/**
 * The board's MAIN socket on the direct path, beside the inputs (`inputs.mjs`).
 *
 * 🔴 FOUND 2026-10-11: `/concepts/sampler/035/` offered the direct path in
 * `studio-1`, the room of the main socket, and waited three seconds for an
 * answer that could never come. Only the per input sockets (`<room>-<input>`,
 * what `/away/` joins) had `createRtc`, so the main socket dropped the offer on
 * the floor: no answer, no refusal, nothing in the journal. This is the same
 * path for the synth capture (Yoshimi and the sampler summed on JACK).
 *
 * `handle(msg, reply)` is the main socket's own handler, so a note over `ctl`
 * goes through exactly what a note over the relay does. It is async on the
 * board, so a throw here arrives as a rejection and is caught, never left
 * unhandled (an unhandled rejection takes the service down).
 * `frame` is the relay's frame in samples; the direct path sends half of it.
 */
~~~

### signalling

Above `signalling(msg) {`, lines 295 to 298 before the cut.

~~~js
/**
 * Signalling from the relay room. True when the message was the direct
 * path's, answered or refused out loud; false for everything else.
 */
~~~

### channel

Above `channel: (peer, label) => rtc?.peers.get(peer)?.ch?.[label] ?? null,`, lines 316 to 321 before the cut.

~~~js
/**
 * A listed extra channel a peer has opened (`channels` above), or null.
 * Since 2026-10-13, for the shader picture's `vid` channel on
 * /remote/shader-on-pi/ (board.mjs `video.direct`). `has` says whether the
 * peer exists at all, so a caller can wait for a channel still opening.
 */
~~~

## `rig/board/sampler.mjs`

### sampler-header

Above `import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync, rename`..., lines 1 to 39 before the cut.

~~~js
// rig/board/sampler.mjs: the piano the board's sampler plays, as files on the
// SD card and one .sfz that maps them. No engine is raised here; this is the
// half that is the same whichever SFZ player ends up running it.
//
// SINCE 2026-10-11 PROGRAM 0 IS THE SALAMANDER GRAND (`ensureSalamander`,
// below), and the FluidR3 piano this header describes is program 2. Both stay
// on the card and in R2.
//
// The recordings are the thirty /nola/ uses (demo/nola/PROVENANCE.json:
// FluidR3_GM's acoustic grand through midi-js-soundfonts, MIT), one every minor
// third from A0 (21) to C8 (108), served from R2 by the station worker. The
// browser pages (`demo/code/sampler.mjs`) play them by one rule and
// this file writes the same rule down as SFZ so the Pi and a browser agree:
//
//   - a key plays the NEAREST recording, a tie going to the lower one. Three
//     apart means every recording owns exactly itself and one key either side
//     (n-1, n, n+1) and no key is ever a tie, so the ranges tile 20..109 with
//     no gap and no overlap;
//   - level follows velocity as (v/127)^1.5, /nola/'s curve, written as
//     `amp_velcurve_N` points because SFZ's own default curve is a square;
//   - a released key fades rather than stops.
//
// ⚠️ THE GAIN AND THE RELEASE ARE NOT MEASURED ON THE PI YET. The files peak
// at 0.097 (measured on /nola/ 2026-09-22, all thirty decoded), the browser
// aims one hard note at 0.30, which is +9.8 dB, and the board's capture SUMS
// left and right (jacksynth.mjs), which for these files (stereo, 44.1 kHz,
// measured with ffprobe 2026-10-11) adds up to 6 dB back where the channels
// agree and less where they do not. So `volume` is +6 dB from arithmetic, and the first note through
// the relay is what settles it.
//
// ⚠️ FLAC, NOT THE MP3 AS FETCHED. An MP3 starts with the encoder's priming
// silence (about 25 ms at 44.1 kHz for LAME), and a player that does not read
// the LAME gapless header plays it, which is 25 ms added to every key press on
// an instrument whose whole subject is the time from key to sound. ffmpeg's
// decoder honours the header when there is one, so the conversion is where the
// priming can leave. MEASURED 2026-10-11 on 60: the mp3 and the FLAC decode to
// the same 3.128889 s and neither has a gap at -60 dB from the start, so
// whatever priming these files carry, ffmpeg already removed it, and FLAC keeps
// that result out of the player's hands.
~~~

### piano-sfz

Above `export function pianoSfz({ notes = PIANO_NOTES, ext = 'flac', dir = '', volume =`..., lines 70 to 73 before the cut.

~~~js
/**
 * The .sfz text. `ext` is the file extension the samples carry on the card,
 * `dir` is written as `default_path` so the file can sit anywhere.
 */
~~~

### ensure-piano

Above `export async function ensurePiano({ dir = SAMPLE_DIR, base = SAMPLE_BASE, onLog `..., lines 102 to 109 before the cut.

~~~js
/**
 * Put the piano on the card. IDEMPOTENT: a file already there is not fetched
 * again, and the .sfz is rewritten only when its text would change. Each file
 * is written to a temporary name and renamed into place, so a run cut off half
 * way leaves no half file that `presentSamples` would count.
 *
 * Fetches only what is missing, one at a time: 30 files, 732 KB in total.
 */
~~~

### rhodes

Above `export const RHODES_BASE = SAMPLE_BASE.replace(/piano\/$/, 'rhodes/');`, lines 134 to 144 before the cut.

~~~js
// ── the Rhodes, the second set (program 1) ──────────────────────────────────
//
// jRhodes3d by Jeff Learman (CC BY-NC-SA 4.0), as `/concepts/sampler/010/`
// plays it: our R2 copies, capped at 4 s, faded over 8 ms, AAC 96 kbps
// (demo/nola/PROVENANCE-rhodes.json). Fifteen notes at the author's uneven
// steps and five velocity layers, layer 1 the hardest, ten holes at the top of
// layers 1 and 3. 🔴 THESE TABLES ARE COPIES of
// `demo/code/sampler.mjs`, because that module imports
// `/shell/pedal.mjs` by an absolute URL node cannot resolve; `test.mjs` imports
// the browser module with that one import rewritten and grades every table
// here against it, so the two cannot drift silently.
~~~

### ensure-rhodes

Above `export async function ensureRhodes({ dir = RHODES_DIR, base = RHODES_BASE, onLog`..., lines 157 to 161 before the cut.

~~~js
/**
 * Put the Rhodes on the card, the way `ensurePiano` does the piano: only what
 * is missing is fetched, one at a time, each converted to FLAC under a
 * temporary name and renamed into place. 65 files, 3.2 MB as AAC.
 */
~~~

### salamander

Above `export const SALAMANDER_BASE = SAMPLE_BASE.replace(/piano\/$/, 'salamander/pi/')`..., lines 189 to 198 before the cut.

~~~js
// ── the Salamander grand, the piano since 2026-10-11 (program 0) ────────────
//
// plans/plan-piano-samples.md: Salamander Grand Piano V3 by Alexander Holm
// (CC BY 3.0), four of its sixteen velocity layers at the same thirty notes,
// capped at 8 s, and the 88 key-off release samples. The board's copy is made
// for it by demo/resources/fetch-salamander.mjs: MONO (the capture sums out_1
// and out_2 anyway), 48 kHz (the scsynth rate, so BufRateScale is 1), 16 bit
// FLAC, so nothing is converted here. 208 files, fetched once, one at a time.
// THE BANDS AND THE NAMES ARE COPIES of demo/code/sampler.mjs and
// test.mjs grades them against it.
~~~

### ensure-salamander

Above `export async function ensureSalamander({ dir = SALAMANDER_DIR, base = SALAMANDER`..., lines 216 to 220 before the cut.

~~~js
/**
 * Put the Salamander on the card: only what is missing is fetched, one at a
 * time, written under a temporary name and renamed into place, so a run cut
 * off half way leaves nothing `ensureSalamander` would count. Already FLAC.
 */
~~~

## `rig/board/scollide.mjs`

### scollide-header

Above `import { createHash } from 'node:crypto';`, lines 1 to 46 before the cut.

~~~js
// rig/board/scollide.mjs: programs a page typed, played on the board's scsynth.
//
// plans/plan-pi-supercollider-defs.md, steps 1 to 3 (asked 2026-10-12, "start").
// A page sends program TEXT, the board compiles it here with the very same
// `demo/shell/sclang-lite.mjs` the tab uses, and plays timestamped hits and
// notes that it turns into OSC bundles itself. No OSC from a browser, ever:
// every address and every argument list below is built by the board.
//
// THE VERBS (answered on the path they came in on, refusing with a reason):
//   audio.start { source: 'collide' }   raise the engine (own server, or attach to the sampler's)
//   audio.stop  { source: 'collide' }   stop it, and nothing else
//   sc.load  { name, text, sha? }       -> sc.loaded { ok, name, def, bytes, ugens, controls, ... same }
//   sc.hit   { hits: [{ name, at, args?, choke? }] }   no answer; counted in sc.stats
//   note.on / note.off / note.panic { node: 'collide', name, note, vel, at? }  -> note.ack
//   sc.set   { name, param, value }     -> sc.set { ok, nodes }
//   sc.stats                            -> sc.stats { defs, live, started, ended, late, droppedLate, ... }
//   clock.ping { t0 }                   -> clock.pong { t0, t1 }, t1 the board's epoch ms
//
// 🔴 WHICH scsynth IS A PARAMETER, AND THE DEFAULT IS THE PLAN'S OWN SERVER.
// Asked 2026-10-12: *"A third SuperCollider engine on the Pi, -- do we need 3?"*
// The engine choice is NOT settled. `ENGINE` below is the one line that decides
// it, so step 4 on the Pi can choose by measured CPU and RAM:
//   ENGINES.own     a scsynth of its own on UDP 57131, JACK client `poscollide`,
//                   started and stopped here, killable without the piano.
//   ENGINES.shared  the sampler's scsynth on 57130: page nodes in a group of
//                   their own (`PAGE_GROUP`), started only while the sampler is
//                   up, and replies read off the sampler's one socket (`-l 1`).
// IN BOTH, the page's programs are compiled to write to a PRIVATE bus pair
// (`PAGE_BUS`), and the board's own `posCollideOut` reads that pair, limits it
// and writes the result to the outputs. So the limiter is on the page group
// ONLY, whichever server holds it: the piano on a shared server writes to the
// outputs directly and never passes through it.
//
// 🔴 THE PUSH TRAP, AND WHY `synthdef.mjs` IS IMPORTED HERE DIRECTLY.
// `push.sh` and `setup.sh` copy only the `../../` modules that files in
// `rig/board` import DIRECTLY (both grep rig/board's own files for imports from two levels up).
// `sclang-lite.mjs` imports `./synthdef.mjs`, which nothing else in rig/board
// imported before this file, so a board module that imported only the compiler
// would install cleanly and die on its first import. `readSynthDef` is used
// below, AND the line is what puts the file on the board.
//
// 🔴 THE CORE IS PURE. `createCollideCore` decides everything about a load, a
// hit and a note with no server and no clock of its own, so `test.mjs` grades
// it, with sabotage controls, on a laptop. The server half (`startScCollide`)
// is the only part that needs the board, and it is NOT RUN anywhere yet: step 4
// of the plan runs it on the Pi.
~~~

### synthdef-import

Above `import { readSynthDef } from '../../demo/shell/synthdef.mjs';`, lines 54 to 54 before the cut.

~~~js
// 🔴 DIRECT, ON PURPOSE: see the push trap above. Do not fold into the compiler's import.
~~~

### engine

Above `export const ENGINE = ENGINES.own;`, lines 68 to 68 before the cut.

~~~js
/** 🔴 THE ONE-LINE SWITCH. `ENGINES.shared` puts page programs on the sampler's server. */
~~~

### page-bus

Above `export const PAGE_BUS = 64;`, lines 78 to 82 before the cut.

~~~js
/**
 * The private bus pair every page program writes to. Past the outputs and
 * inputs of either server (`-i 0 -o 2`, so private buses start at 2), and far
 * enough past them that a server given more channels later still has room.
 */
~~~

### fold

Above `export const FOLD = 0.5;`, lines 84 to 91 before the cut.

~~~js
/**
 * 🔴 THE FOLD. The capture SUMS out_1 and out_2 into one JACK input, while a
 * page's analyser and its speakers AVERAGE a stereo node to mono (Web Audio's
 * `speakers` downmix, (L+R)/2). Every program `sclang-lite.mjs` compiles has
 * two channels (a mono last line is written to both), so without this the Pi
 * read the same note 2x (6 dB) louder than the tab. MEASURED 2026-10-12 on
 * synth/100, one note, max RMS here -33.2 against the Pi -28.4 dBFS.
 */
~~~

### limit

Above `export const LIMIT_LEVEL = 0.49;`, lines 93 to 100 before the cut.

~~~js
/**
 * Per channel, AFTER the fold, so the capture tops out at twice this: 0.98, a
 * guard against the s16 capture clipping, not a loudness policy. It was
 * `LOUDEST / 2` (0.15), which squashed every drum: MEASURED 2026-10-12 on
 * rhythm/030 the kick read -5.9 dBFS RMS here and -19.3 on the Pi, 13 dB down,
 * with the Pi's 90th percentile 1 dB under its peak. A page is now exactly as
 * loud on the Pi as in the tab, which is what both pages compare.
 */
~~~

### first-node

Above `export const FIRST_NODE = 10_000_000;`, lines 102 to 106 before the cut.

~~~js
/**
 * Node ids for page programs start here. The sampler allocates from 2000 up on
 * the same counter forever, so on a shared server the two cannot meet before
 * the sampler has played ten million notes.
 */
~~~

### text-cap

Above `export const TEXT_CAP = 4000;`, lines 111 to 111 before the cut.

~~~js
/** 4.6 times the largest program the two pages play (864 B, MEASURED §1.3). */
~~~

### block-cap

Above `export const BLOCK_CAP = 64;`, lines 115 to 115 before the cut.

~~~js
/** Blocks in one definition. MEASURED largest today: 31. */
~~~

### structural

Above `export const STRUCTURAL = Object.freeze(['Control', 'LagControl', 'BinaryOpUGen'`..., lines 131 to 136 before the cut.

~~~js
/**
 * 🔴 EVERY CLASS `sclang-lite.mjs` CAN EMIT, WRITTEN OUT BY HAND. Not derived
 * from its `UGENS`: this check guards against a FUTURE change to the compiler,
 * so a class the compiler learns has to be added here on purpose, and
 * `test.mjs` goes red until it is.
 */
~~~

### allowed

Above `export const ALLOWED_CLASSES = Object.freeze(new Set([...STRUCTURAL,`, lines 138 to 142 before the cut.

~~~js
// ⚠️ THE SECOND ROW ARRIVED 2026-10-13, when the compiler learned them for the
// grain ring (now /archive/grain-ring/). Every one is a core scsynth plugin
// class (GrainBuf in GrainUGens, the rest in BufIO, Trig, InOut, Noise and
// Osc), so the board's real scsynth loads them. `.sin` and `.cos` need no row:
// they are UnaryOpUGen, already structural.
~~~

### shared-refused

Above `export const SHARED_REFUSED = Object.freeze(['BufWr']);`, lines 147 to 153 before the cut.

~~~js
/**
 * 🔴 BufWr WRITES INTO A BUFFER, AND ON THE SAMPLER'S SERVER THE BUFFERS ARE
 * THE PIANO. On `ENGINES.own` nothing allocates a buffer for a page (there is
 * no verb for it), so a BufWr there writes into nothing and is inert. On
 * `ENGINES.shared` the same program could overwrite the sampler's recordings
 * for everybody in the room, so that engine refuses the class by name.
 */
~~~

### check-def

Above `export function checkDef(bytes, { name, bus, allowed = ALLOWED_CLASSES, cap = BL`..., lines 165 to 170 before the cut.

~~~js
/**
 * Re-read the board's OWN bytes and check every block. Belt and braces: the
 * text came through the compiler, so this guards against a future change to
 * the compiler rather than against the page.
 * @returns {{ok: true, blocks: number, classes: string[]} | {ok: false, reason: string}}
 */
~~~

### encode-packet

Above `export const encodePacket = (p) => oscBundle(p.tt ?? [0, 1], p.msgs);`, lines 194 to 197 before the cut.

~~~js
/**
 * Turn a packet the core emits into bytes. `{ tt: null }` is "immediately";
 * every packet is a bundle, so a hit and its choke share one timetag.
 */
~~~

### core

Above `export function createCollideCore({ send, now = epochNow, bus = PAGE_BUS, group `..., lines 200 to 209 before the cut.

~~~js
/**
 * Everything about loads, hits and notes, with no server and no clock.
 * @param {object} o
 * @param {(packet: {tt: [number, number] | null, msgs: any[][]}) => void} o.send
 * @param {() => number} [o.now]   the board's epoch ms
 * @param {number} [o.bus]         where page programs write
 * @param {Set<string>} [o.allowed] block classes allowed (a test sabotages it)
 * @param {(n: string) => boolean} [o.nameOk] the name rule (a test sabotages it)
 * @param {boolean} [o.choke]     false drops the choke (a test sabotages it)
 */
~~~

### service

Above `export function createCollideService({ engine = ENGINE, start = startScCollide, `..., lines 487 to 492 before the cut.

~~~js
/**
 * The verbs over a server. `start({ engine, onLog, sampler })` answers a server
 * object or `{ ok: false, reason }`; `demo/fake-board.mjs` passes a fake one, so
 * the dispatch below runs on the laptop exactly as it will on the board.
 * A server is `{ ok, mode, port, bus, send(buf), recv(bytes), onReply(fn), cpu(), stop(), status() }`.
 */
~~~

### server-banner

Above `const HERE = new URL('.', import.meta.url).pathname;`, lines 626 to 626 before the cut.

~~~js
// ── the server, on the board (NOT RUN YET: step 4 of the plan) ─────────────
~~~

### start

Above `export async function startScCollide({ engine = ENGINE, onLog, onFrame, sampler `..., lines 655 to 658 before the cut.

~~~js
/**
 * Raise the engine the switch names, and put the page group and the limiter on
 * it. Answers a server for `createCollideService`, or `{ ok: false, reason }`.
 */
~~~

## `rig/board/scsampler.mjs`

### scs-header

Above `import { spawn, execFileSync } from 'node:child_process';`, lines 1 to 37 before the cut.

~~~js
// rig/board/scsampler.mjs: the board's sampler, `pi-1:sampler`, on SuperCollider.
//
// Asked 2026-10-11: *"do supercollider. rm fluidsynth"*, with option b) of
// plans/plan-sampler-pi-pico.md §2.2: the sampler and Yoshimi both on JACK,
// both summed into the one capture, so starting one never switches the other
// off for somebody in another building.
//
// 🔴 ITS OWN scsynth, AND NO sclang WHILE IT PLAYS. The granulator's server is
// raised by sclang only when `fx.pappus` asks, is killed by `stopPappus`, and
// uses `SuperCollider:in_*`/`out_*` as the insert. Sharing it would tie a piano
// to a granulator switch somebody else presses. So this is a second scsynth:
//   - JACK client `possampler` (`-H default:possampler`), so `pappusFx`'s test
//     for a running granulator (`jack_lsp` includes `SuperCollider`) can never
//     mistake it;
//   - UDP port 57130 (`SAMPLER_SC_PORT`), which `stopPappus` reads to leave it
//     alone;
//   - no inputs, two outputs, and SC_JACK_DEFAULT_* pointed at nothing, so it
//     connects nowhere by itself; `wire()` puts out_1 and out_2 into the capture.
// node drives it over OSC: voices, stealing, the pedal and program change are
// decided here, where they can be graded with no board (`createSamplerCore`).
// sclang runs only to WRITE the two SynthDefs (`norns/possampler-defs.scd`),
// once, when the files are missing or older than the script.
//
// 🔴 THE MIDI PATH IS THE RELAY AND NOTHING ELSE. A page's note arrives as
// `note.on {node: 'sampler'}` and becomes one `/s_new`. There is no ALSA client
// for this engine at all, so nothing on the board (the Circuit included) can be
// subscribed to it, by anybody or by itself.
//
// The rules a key is played by are the ones `demo/code/sampler.mjs`
// has: the nearest recording, a tie to the lower one, rate 2^(shift/12), the
// Rhodes layer from the author's crossfade table with his fallback over the
// holes, a key struck again damps the voice it replaces, the oldest voice taken
// past the cap, the damper a ramp (`demo/shell/pedal.mjs`, imported, not copied).
// The piano (program 0) is the Salamander grand since 2026-10-11
// (plans/plan-piano-samples.md): four velocity bands hard switched, level from
// ONE constant for the set and 6 dB inside a band, and a key-off sample when
// the damper lands. The FluidR3 piano is program 2, on /nola/'s (v/127)^1.5.
~~~

### piano-peak

Above `export const PIANO_PEAK = 0.097;`, lines 60 to 60 before the cut.

~~~js
/** The loudest FluidR3 piano file, measured on /nola/ 2026-09-22 by decoding all thirty. */
~~~

### salamander-peak

Above `export const SALAMANDER_PEAK = 0.9085;`, lines 62 to 67 before the cut.

~~~js
/**
 * The loudest Salamander v16 file, the browser's encode decoded back
 * (PROVENANCE-salamander.json `peak.web`). The SAME constant as the browser, so
 * a mono file here lands a little under a stereo one there, by what summing L
 * and R loses (0.6 to 1.7 dB, plan section 2.2), which a mono speaker loses too.
 */
~~~

### sets

Above `export const SETS = Object.freeze({`, lines 133 to 137 before the cut.

~~~js
/**
 * The sets, by program number. Buffer numbers are fixed per file and never
 * overlap: FluidR3 0 to 29, Rhodes 100 to 164, Salamander notes 300 to 419 and
 * its releases 500 to 587, all under scsynth's default of 1024 buffers.
 */
~~~

### start-plan

Above `export function startPlan(want, { running = null, sampler = false } = {}) {`, lines 164 to 171 before the cut.

~~~js
/**
 * 🔴 THE ONE-SOURCE RULE, WITH THE SAMPLER BESIDE IT. Pure, so it is graded.
 * Yoshimi (and the old pipe sources) are still one at a time: a second one
 * replaces the first, as `startAudio` has always done. The sampler is not in
 * that rule: starting it stops nothing, and starting anything else leaves it
 * running. `audio.stop` with no source stops the instrument and never the
 * sampler; `{source: 'sampler'}` stops the sampler and nothing else.
 */
~~~

### sampler-core

Above `export function createSamplerCore({ send, voices: cap = VOICES, buffers = new Ma`..., lines 184 to 188 before the cut.

~~~js
/**
 * Voices, the pedal and program change, with no server. `send(address, args)`
 * is the whole output; `loaded(program)` says whether a set's buffers are in.
 * Every decision about a note is here, so `test.mjs` drives it with a fake.
 */
~~~

### release

Above `const release = (note, sec) => {`, lines 194 to 199 before the cut.

~~~js
/**
 * The damper falls on a key: its voices ramp out, and a Salamander string
 * makes its key-off sound (only when a sounding voice was damped, never on a
 * key up under the pedal, which pedal.mjs does not pass here). A release
 * voice is not counted in `live`: it is under half a second and frees itself.
 */
~~~

### sampler-start

Above `export async function startScSampler({ onFrame, onLog, onState } = {}) {`, lines 287 to 290 before the cut.

~~~js
/**
 * Raise the sampler: jackd, the defs, scsynth, the piano's buffers, the capture,
 * out_1 and out_2 into the capture. Answers the engine, or `{ ok: false, reason }`.
 */
~~~

### load-set

Above `async function loadSet(set) {`, lines 347 to 352 before the cut.

~~~js
/**
 * Read one set's files into buffers, four at a time, and ask each its channel
 * count. Four, not all at once: scsynth reads files one after another on its
 * own thread, so 208 Salamander requests sent together would queue behind
 * each other and the later ones would outlive their 8 s answer timeout.
 */
~~~

### quit

Above `const quit = oscMessage('/quit');`, lines 410 to 418 before the cut.

~~~js
// 🔴 /quit HAS TO LEAVE BEFORE THE SOCKET CLOSES, AND scsynth HAS TO BE
// GIVEN TIME TO TAKE ITSELF OFF THE JACK GRAPH. MEASURED 2026-10-12 on the
// Pi with Yoshimi running: this stop cost 1 to 2 jackd xruns every time
// (`possampler was not finished`), and the process was gone about 600 ms
// after the stop, which is the SIGKILL below. The same server sent /quit
// by hand exited by itself in 183 ms with no xrun at all. `udp.close()`
// straight after an async `send` can drop the datagram, so the kill landed
// on a client still running in the graph. So: close in the send callback,
// and kill only a process still there after QUIT_GRACE_MS.
~~~

### osc

Above `osc: {`, lines 435 to 443 before the cut.

~~~js
/**
 * 🔴 THIS SERVER'S OSC, FOR `scollide.mjs` WHEN IT IS TOLD TO SHARE IT
 * (`ENGINES.shared`). scsynth runs with `-l 1`, one client, and this socket
 * is that client, so `/n_end` for a page's node arrives HERE and nowhere
 * else: a second socket's `/notify` would be refused. `send` takes encoded
 * bytes (a message or a bundle); `onReply(fn)` hears every decoded reply
 * and answers the function that stops it. Nothing calls either while the
 * collide engine has its own server, which is the default.
 */
~~~

## `rig/board/setup.sh`

### setup-header

Above `set -euo pipefail`, lines 2 to 14 before the cut.

~~~sh
# rig/board/setup.sh — run this ON the Pi, once, after the first ssh.
#
#   git clone <this repo> ~/positron && cd ~/positron/rig/board && sudo ./setup.sh
#
# What it does, and why each part is here rather than done by hand:
#   - a current node, because the board uses the BUILT-IN WebSocket client (node
#     22+) rather than an npm dependency. Debian Trixie ships node 20, where
#     `WebSocket` is undefined — a failure that reads as "the relay is down".
#   - alsa-utils, for `aconnect` and `arecord`, which ARE the board.
#   - snd-virmidi and snd-aloop, loaded at boot: virtual MIDI ports and a
#     loopback capture device, so the whole thing is testable with nothing
#     plugged in. They cost nothing when real hardware is attached.
#   - a systemd unit with Restart=always, because nobody is in that room.
~~~

### setup-room

Above `if [ -z "${ROOM:-}" ]; then`, lines 27 to 33 before the cut.

~~~sh
# 🔴 NO DEFAULT ROOM, AND THIS USED TO READ `${ROOM:-studio-1}`. That default
# pointed EVERY board anybody installed at OUR room. The relay has no
# authentication, no routing and no sender identity, so the room name is the
# only isolation this stack has: two boards in one room flap `boardFrom` twice
# a beat and interleave two `aseq` counters into a single playout ring. An
# installer whose default is somebody else's studio is a footgun with a friendly
# face, so this now REFUSES rather than guesses.
~~~

### setup-packages

Above `PKGS=$(awk -F'\t' '$0 !~ /^#/ && NF >= 3 && $3 == "apt" { printf "%s ", $1 }' "$`..., lines 41 to 53 before the cut.

~~~sh
# 🔴 READ FROM `packages.txt`, NOT TYPED HERE. This line used to install
# `alsa-utils curl git` and nothing else, so a board provisioned from this repo
# came up with no jackd, no yoshimi, no SuperCollider, no csound and no ffmpeg:
# **silent**, while `rig/audit.mjs` held the full list of twelve with reasons
# and was a thing you ran by hand afterwards against a board you already had.
# One list, read by the installer that needs it and by the audit that checks it.
#
# ⚠️ `awk` RATHER THAN node OR jq, because node is one of the things being
# installed three lines down and jq is not on a fresh Pi. The file is tab
# separated so that the `why` column can contain anything.
#
# ⚠️ `--no-install-recommends` ON EVERY ONE. csound's recommends pull tcl/tk
# onto a headless board, and the same argument covers the rest.
~~~

### setup-depth

Above `BOXDIR="$DEST/rig/board"`, lines 87 to 91 before the cut.

~~~sh
# ⚠️ PRESERVE THE DEPTH. board.mjs imports '../../demo/shell/wire.mjs', so it must
# sit two levels below $DEST or that resolves off the filesystem root —
# ERR_MODULE_NOT_FOUND file:///demo/shell/wire.mjs, which is what a flattened
# install produced. Checking the files exist at the SOURCE was not enough: what
# matters is whether the import resolves from where it will actually run.
~~~

### setup-imports

Above `MISSING=0`, lines 96 to 104 before the cut.

~~~sh
# Shared modules are IMPORTED from demo/shell rather than copied into rig/board —
# one envelope, one Rhodes, one Moog, both ends. They must come along at the
# exact paths board.mjs expects.
#
# Do not hand-maintain this list. It was wire.mjs alone until 2026-09-10, by
# which time synth.mjs also imported rhodes.mjs and moog.mjs — so the service
# would have installed cleanly and died on its first import, on a board in
# another room. Read the imports out of the source, and REFUSE the install when
# one has no file: the rule build.mjs already applies to the deployed site.
~~~

### setup-journal

Above `mkdir -p /etc/systemd/journald.conf.d`, lines 142 to 147 before the cut.

~~~sh
# 🔴 THE JOURNAL DID NOT SURVIVE A REBOOT AND IT TOOK REAL EVIDENCE WITH IT.
# MEASURED 2026-09-20: /var/log/journal was empty, the journal lived in
# /run/log/journal on tmpfs, `journalctl --list-boots` showed exactly one boot,
# and every line from the day the output level collapsed was gone. board.mjs
# says in a comment that the journal is the one record that survives a board
# nobody can reach; on this board it did not.
~~~

## `rig/board/video.mjs`

### video-header

Above `import { spawn, execFileSync } from 'node:child_process';`, lines 1 to 25 before the cut.

~~~js
// rig/board/video.mjs — the board draws a picture and sends it, as H.264.
//
// `rig/vis/v3dpipe` renders a generative shader headless on the VideoCore VI
// (EGL surfaceless over GBM — see rig/vis/README.md for why that is the only
// way in on a machine with no screen) and writes raw RGBA to stdout. ffmpeg's
// `h264_v4l2m2m` encoder — the board's HARDWARE encoder on /dev/video11 — turns
// that into an Annex-B byte stream, and this cuts the stream into one message
// per frame.
//
// MEASURED, 30 s, alongside the running instruments: 29.6 fps at 1280x720 for
// 18.6% user + 14.0% sys of 400%, 79 MB, zero audio dropouts, throttled=0x0.
//
// ⚠️ VIDEO GETS ITS OWN SOCKET, AND THAT IS FORCED BY A MEASUREMENT.
// The relay's per-socket budget is `MSG_PER_SEC` 60 (workers/relay/src/index.js)
// and the audio stream is already 50 a second — 48000/960. Thirty video frames
// on the same socket would be 80 against a cap of 60, and the token bucket drops
// the excess SILENTLY: no error, no close, no backpressure, counted only in the
// relay's own /stats. So a picture sharing the audio socket would quietly cost a
// quarter of both. A second socket has its own bucket and its own 512 KiB/s.
//
// ⚠️ AND IT KEEPS THE AUDIO FRAMING UNAMBIGUOUS. Every page in this project
// treats an incoming binary frame as PCM. Putting H.264 on the same socket would
// need a type byte in a header that is already deployed on both ends, or a magic
// number that a 32-bit sequence counter can eventually collide with. A separate
// room needs neither.
~~~

### encoder-pids

Above `export function encoderPids() {`, lines 29 to 40 before the cut.

~~~js
/**
 * The PIDs of every ffmpeg encoding video right now.
 *
 * ⚠️ MATCHED ON `rawvideo`, AND THAT IS DELIBERATE RATHER THAN LAZY. The board's
 * AUDIO capture is also an ffmpeg — `-f jack -i posboard` — so `pkill -x ffmpeg`
 * would take the instrument's sound with it. Only the video encoder reads raw
 * frames on stdin, so that is what tells them apart.
 *
 * ⚠️ And read with `ps` rather than `pgrep -f`: a `-f` pattern matches the
 * command line running the check and answers about ITSELF. LESSONS #39, twice
 * in one session.
 */
~~~

### sweep-encoders

Above `export function sweepStrayEncoders(onLog) {`, lines 51 to 61 before the cut.

~~~js
/**
 * Kill encoders nobody owns.
 *
 * ⚠️ AN ORPHANED ENCODER BRICKS THE FEATURE UNTIL A REBOOT, and it survives a
 * restart of this service: systemd replaces the node process and nothing reaps
 * what it spawned, so the device stays held and every later `video.start`
 * refuses forever. board.mjs already sweeps orphans at startup for exactly this
 * reason — but only at startup, and an encoder can be orphaned at any time.
 * The caller decides it is safe: it calls this only when IT is not streaming,
 * in which case an encoder on this board is by definition garbage.
 */
~~~

### annexb

Above `export function createAnnexBSplitter(onUnit) {`, lines 78 to 95 before the cut.

~~~js
/**
 * Cut an Annex-B byte stream into one access unit per frame.
 *
 * ⚠️ THIS ENCODER PUTS SPS AND PPS BEFORE EVERY SINGLE FRAME, which is more
 * than "inline headers" and exactly what a lossy fan-out wants — a viewer who
 * joins mid-stream has the parameter sets the moment the next IDR arrives.
 * MEASURED on this board's stack (ffmpeg 7.1.5, kernel 6.18.34) over 150 frames
 * at -g 30: 150 SPS, 150 PPS, 5 IDR, pattern `7,8,5, 7,8,1, 7,8,1, …`. libx264
 * on the same input emits 5 and 5. There is an open upstream report that
 * `h264_v4l2m2m` omits inline parameter sets and is therefore unusable for live
 * streaming; it does not reproduce here, and that was checked because it would
 * have killed this file outright.
 *
 * So a new frame begins at each SPS. That is a property of this encoder rather
 * than of H.264, so the splitter falls back to cutting at any slice NAL when no
 * SPS has been seen — otherwise a stack that does NOT emit them would buffer the
 * entire stream into one enormous message and look like a hang.
 */
~~~

### complete

Above `for (let i = 0; i + 1 < cuts.length; i++) {`, lines 117 to 118 before the cut.

~~~js
// Emit every COMPLETE unit — everything between one cut and the next. The
// tail after the last cut is incomplete by definition and stays buffered.
~~~

### start-video

Above `export function startVideo({ w = 1280, h = 720, fps = 30, bitrate = 2_000_000,`, lines 135 to 144 before the cut.

~~~js
/**
 * Start rendering and encoding. `onFrame(bytes, key)` gets one access unit per
 * frame; `stop()` kills both processes.
 *
 * The bitrate default is 2 Mbit/s, which is not a taste: MEASURED Pi →
 * Cloudflare → laptop, 2 and 4 Mbit/s arrive byte-identical with zero gaps,
 * 5 passes despite nominally exceeding the cap, and 8 loses 28% of frames
 * silently. Design to 4 and measure; ship 2, which is 48% of one socket's byte
 * budget and leaves room for the keyframes to be six times the mean.
 */
~~~

### exclusive

Above `const swept = sweepStrayEncoders(onLog);`, lines 150 to 163 before the cut.

~~~js
// ⚠️ THE HARDWARE ENCODER IS A SINGLE EXCLUSIVE DEVICE. A second ffmpeg on
// /dev/video11 does not fail — it BLOCKS, forever, looking exactly like an
// encoder that produces no bytes. Stacking them is what wedged the device
// badly enough to need a reboot on 2026-09-11. Refuse instead, and say what
// is holding it.
//
// ⚠️ `pgrep -x`, NEVER `-f`: a `-f` pattern matches the very command line
// running the check, so it always answers "held" — including about itself.
// That is LESSONS #39, and it cost twenty minutes twice in one session.
// The caller only reaches here when it is NOT already streaming, so anything
// holding the device is an orphan — from a killed run, or from a restart of
// this service that left its child behind. Clear it rather than refusing
// forever: refusing was correct about the danger and wrong about the remedy,
// and it left the feature permanently unavailable with an accurate message.
~~~

### forever

Above `const render = spawn(V3DPIPE, [String(w), String(h), '0', String(passes)],`, lines 172 to 180 before the cut.

~~~js
// 0 frames means FOREVER — see the comment in rig/vis/v3dpipe.c. It meant
// "render none and exit" until 2026-09-11, which left ffmpeg waiting on a
// pipe nothing would ever come down while every status said the picture was
// up.
// ⚠️ stdin IS A PIPE, not 'ignore': it is the renderer's control channel.
// stdout carries the pixels and stderr the timings, so a parameter has
// nowhere else to arrive — and the alternative, restarting with new argv,
// costs seconds and cycles the exclusive hardware encoder that wedged this
// board once already.
~~~

### gop

Above `'-g', String(gop),`, lines 188 to 190 before the cut.

~~~js
// ⚠️ A JOINER WAITS FOR AN IDR, and that is a GOP choice rather than a bug.
// At -g 30 and 30 fps that is up to one second of black for someone who has
// just opened the page. Shorter GOPs cost bitrate; this is the knob.
~~~

### renderer

Above `let renderer = null;`, lines 197 to 202 before the cut.

~~~js
// ⚠️ WHICH GPU DREW IT, CAPTURED FROM THE RENDERER'S OWN FIRST LINE. The page
// names the chip under its own picture; the streamed picture deserves the
// same, or one pane is attributed and the other is anonymous. And it must be
// READ rather than declared here: `v3dpipe` prints what EGL actually gave it,
// which is the difference between the real v3d driver and a software
// rasteriser that would quietly be twenty times slower.
~~~

### stderr

Above `render.stderr?.on('data', (d) => {`, lines 211 to 212 before the cut.

~~~js
// ⚠️ v3dpipe reports its own timing on STDERR, which is the only place the
// render rate is visible — its stdout is the pixels.
~~~

### verdict

Above `for (const line of t.split('\n')) {`, lines 218 to 223 before the cut.

~~~js
// 🔴 THE RENDERER'S VERDICT IS THE ONLY ONE WORTH REPORTING. Writing to a
// pipe succeeds whether or not the shader on the other end compiles, so
// `shader()` used to answer `ok: true` for a body the renderer then
// refused — a count of what was QUEUED reading identically to what
// LANDED, which is `createMidiLane.scheduled()` in a new costume. The
// caller waits for one of these lines instead.
~~~

### params

Above `const params = { seg: 8, fb: 0.78, scale: 4, warp: 0.08, hue: 1 };`, lines 241 to 243 before the cut.

~~~js
// What the picture is set to right now. Kept here rather than asked of the
// renderer, because it has no way to answer — a one-way channel means this
// end owns the truth, and a client reading it back is reading what was SENT.
~~~

### shader

Above `shader: async (body) => {`, lines 249 to 264 before the cut.

~~~js
/**
 * A whole new picture, down the same channel.
 *
 * ⚠️ BASE64, BECAUSE THE CHANNEL IS ONE COMMAND PER LINE. GLSL has
 * newlines; escaping them would be a small format nobody else implements,
 * and base64 is already in both standard libraries.
 *
 * ⚠️ AND THE BODY CARRIES NO `#version` LINE. The board compiles as
 * `310 es` and the browser as `300 es`, so the header belongs to each end
 * and only the body travels. A body arriving with its own header would
 * compile on exactly one of them.
 *
 * The renderer compiles it on its own thread and keeps the running picture
 * if it will not build — it prints SHADER-OK, SHADER-LIVE or
 * SHADER-REFUSED, which is what the caller hears back.
 */
~~~

### wait-compiler

Above `const verdict = new Promise((res) => {`, lines 270 to 272 before the cut.

~~~js
// ⚠️ WAIT FOR THE COMPILER, NOT FOR THE PIPE. A write to stdin succeeds
// whatever the GLSL says; the answer that matters comes back on stderr
// one frame later. A second is generous — the board took 35 ms.
~~~

### sigkill

Above `setTimeout(() => {`, lines 294 to 301 before the cut.

~~~js
// ⚠️ AND MAKE SURE, BECAUSE SIGTERM DID NOT. An ffmpeg holding
// /dev/video11 survived SIGTERM and kept the device for minutes, so every
// later `video.start` queued behind it and read from the outside as "the
// encoder produces no bytes". Six of them stacked up that way and the
// device ended up needing a REBOOT. The board had already recorded this
// exact lesson about an instrument: a graceful quit plus SIGTERM left the
// process alive for two minutes once, and SIGKILL after a grace period is
// the only guarantee. It was not applied here.
~~~

<a id="tap"></a>

## inputs.mjs `tap`

2026-10-15, for the Circuit's drums (`lessons/rig-board-circuit-drums.md`). The input's raw MIDI out can be opened once (a second open is EBUSY), so the macro listener's open is shared: `tap(fn)` hands every raw chunk (clock and all) to `fn(bytes, readAt)`, opens the input if it is not open, and keeps it open while any tap is held, lease or no lease. While tapped it is polled every 5 ms instead of 20, so a pad waits at most 5 ms in the kernel's buffer. The macros reach the room only while a page holds the lease, so the board reading for itself does not start sending `midi.cc`. Untapping closes the input when no lease holds it.
