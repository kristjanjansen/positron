# harness

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `demo/ancestry.mjs`

### ancestry

Above `import { launchChrome, connectCdp } from './chrome.mjs';`, lines 1 to 34 before the cut.

~~~js
// demo/ancestry.mjs — WALK FROM AN ELEMENT TO THE ROOT AND PRINT, FOR EVERY
// ANCESTOR, ONE PROPERTY'S VALUE, ITS RECT, AND WHICH KIND OF CONTEXT IT MAKES.
//
//   node demo/ancestry.mjs fau '.fau-src textarea' padding-left
//   node demo/ancestry.mjs nola '.panel-plate' padding-top --width 375
//
// 🔴 IT EXISTS BECAUSE *"edge to edge"* WAS ANSWERED BY ZEROING THREE INSETS
// AND ASKED AGAIN THE NEXT DAY BECAUSE THERE WERE FOUR. The fourth was
// `.panel-case`'s own `padding: 0 var(--panel-pad)`, on the case, which no page
// rule touched, and **a child cannot reach its way out of a parent's padding
// however many of its own rules say 0.** `positron-ui` already gives the cure
// in words: *"Walk from the element to the surface and print every ancestor's
// padding, border and rect. It is one loop and it ends the argument."* This is
// that loop, as a command, so it is run rather than remembered.
//
// ✅ **AND IT SAYS WHICH ANCESTOR ESTABLISHES WHAT**, because the three things
// a positioned or overflowing child cares about are decided by three different
// ancestors and nothing on screen says which: the nearest STACKING CONTEXT
// (what a `z-index` is relative to), the nearest CONTAINING BLOCK (what an
// `absolute` child is placed against), and the nearest BLOCK FORMATTING CONTEXT
// (where margin collapsing stops). Each is printed with the reason it counts.
// ⚠️ The containing-block answer is cross-checked against `el.offsetParent`,
// which the browser computes independently; disagreement is this file's own
// self-test failing and is printed as such.
//
// ⚠️ **TWO THINGS ON THE LISTS THAT SURPRISE PEOPLE.** `overflow: clip` does
// NOT make a block formatting context while `overflow: hidden` does, so `clip`
// is excluded from the BFC reasons on purpose. And `container-type` other than
// `normal` DOES make one, silently, which is why adding a container query turns
// margin collapsing off inside it.
//
// 🔴 **THE PORT IS READ BACK FROM THE PROFILE, NEVER GUESSED**, for the reason
// `verify.mjs` records: a fixed port and `/json/list` attach to whatever Chrome
// is already there. The draft this was adopted from did exactly that.
~~~

### offset-body

Above `const opIsFallback = !o.offsetParent || /^(body|html)\b/.test(o.offsetParent);`, lines 158 to 163 before the cut.

~~~js
/* ⚠️ `offsetParent` IS `body` WHEN NOTHING ABOVE IS POSITIONED. That is the
   spec's own fallback and not a positioned ancestor, so it AGREES with a
   `(none)` here. The first run of this file on `/nola/` flagged exactly that
   case as a disagreement, which is a self-test crying wolf on the commonest
   page shape there is. A real disagreement is a named ancestor on one side and
   a different named one on the other. */
~~~

### insetting

Above `const insetting = o.rows.slice(1).filter((r) => r.pad[3] > 0 || r.border[3] > 0)`..., lines 169 to 170 before the cut.

~~~js
// 🔴 THE LINE THAT ENDS THE "EDGE TO EDGE" ARGUMENT: how many boxes between the
// element and the root are insetting it, and by how much on the left.
~~~

## `demo/check-html.mjs`

### check-html

Above `import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';`, lines 2 to 25 before the cut.

~~~js
/**
 * Syntax-check the JavaScript inside a demo page, without a browser.
 *
 * 🔴 IT EXISTS BECAUSE A BACKTICK INSIDE A GLSL COMMENT CLOSES THE TEMPLATE
 * LITERAL AROUND IT. That happened seven times in one session on
 * `/videoradio/`, whose shaders are template literals with prose in them, and
 * every time the page died at parse: no log line, no assert, no picture, and an
 * error in devtools pointing at a line hundreds below the one that broke it.
 * `node --check` finds it in about forty milliseconds and says where.
 *
 * ⚠️ IT IS NOT A HARNESS AND IT OPENS NOTHING. No Chrome, no profile, no relay,
 * no stream off anybody else's server — which is what makes it the right check
 * to run after editing a page this repo has asked not to be re-verified. It
 * answers one question, "will this parse", and says nothing at all about
 * whether the page works.
 *
 *   node demo/check-html.mjs demo/archive/radio/index.html
 *   node demo/check-html.mjs demo/ *\/index.html     (every page)
 *
 * ⚠️ `--check` NEEDS A FILE WITH AN EXTENSION IT KNOWS, so each block is
 * written to a temporary `.mjs` beside the OS temp dir and removed afterwards.
 * Piping it in reports `[stdin]` as the filename and every line number is the
 * block's rather than the page's; the offset is added back here instead.
 */
~~~

### line-offset

Above `const before = src.slice(0, m.index + m[0].indexOf('>') + 1);`, lines 46 to 48 before the cut.

~~~js
// ⚠️ THE LINE THE BLOCK STARTS ON, so a reported line is a line in the
// PAGE. A number that is right about a temporary file and wrong about the
// file being edited is worse than no number.
~~~

### block-count

Above `console.log('${blocks} module block${blocks === 1 ? '' : 's'} in ${files.length}`..., lines 66 to 67 before the cut.

~~~js
// ⚠️ SAY THE BLOCK COUNT. A page whose script tag was renamed would check zero
// blocks and pass, which is the shape of green this repo minds most.
~~~

## `demo/chrome.mjs`

### chrome

Above `import { spawn } from 'node:child_process';`, lines 1 to 7 before the cut.

~~~js
// demo/chrome.mjs: one headless Chrome for a harness, and the CDP socket to it.
//
// Every path out kills Chrome and removes its profile: close() on the normal
// path, and an `exit` listener for the rest (an early process.exit, an uncaught
// throw or rejection, and SIGINT, SIGTERM or SIGHUP, which are turned into an
// exit here). why: lessons in CLAUDE.md "How a session is run", and
// .claude/skills/positron-verify "Close every Chrome you start".
~~~

### launch

Above `export async function launchChrome({ prefix, args = [], clearCache = false, trie`..., lines 29 to 41 before the cut.

~~~js
/**
 * Start headless Chrome on a per-run profile and wait for its CDP endpoint.
 * The port is 0 and read back from the profile's DevToolsActivePort, never guessed.
 *
 * @param {object} o
 * @param {string} o.prefix  profile name prefix, `<prefix>-<pid>` under harness-profile's ROOT
 * @param {string[]} [o.args]  flags after the common five
 * @param {boolean} [o.clearCache]  remove the profile's HTTP cache before the spawn
 * @param {number} [o.tries]  polls of DevToolsActivePort
 * @param {number} [o.every]  ms between polls
 * @returns {Promise<{proc, port: number, wsUrl: string, profile: string, swept: number, close: () => Promise<void>}>}
 *   throws `chrome did not come up` after killing it and removing the profile.
 */
~~~

### cdp

Above `export async function connectCdp(wsUrl, { timeout = 0 } = {}) {`, lines 87 to 93 before the cut.

~~~js
/**
 * A CDP socket on the browser endpoint. Events go to every `on()` listener.
 * `page()` makes a blank target and returns a sender bound to its session,
 * because the browser endpoint has no Page domain.
 * @param {string} wsUrl
 * @param {{timeout?: number}} [o]  reject a call after this many ms; 0 waits for ever
 */
~~~

## `demo/fake-arhiiv.mjs`

### fake-arhiiv

Above `import { createServer } from 'node:http';`, lines 1 to 23 before the cut.

~~~js
// demo/fake-arhiiv.mjs: an ERR archive that is nobody's archive.
//
//   node demo/fake-arhiiv.mjs                  # :8903
//   node demo/fake-arhiiv.mjs --port 9400
//
// Then open the page against it:
//   http://127.0.0.1:8890/history/newsreels/?base=http://127.0.0.1:8903
//
// WHY THIS EXISTS. /reel/ and /history/newsreels/ ask arhiiv.err.ee for a
// film's stream and then play it from vod.err.ee, and ERR has told us our
// headless browsers corrupt their audience figures (CLAUDE.md, "What costs real
// money and somebody else's server"). So a check that plays anything plays it
// from here: the same content API shape the pages read
// (`/api/v1/content/<video|audio>/<slug>` answering `data.media.src.hls`), and
// two small HLS streams made once with ffmpeg, a picture with no sound for
// every newsreel and a tone for every radio programme.
//
// IT GRADES OUR CODE AND NOTHING ELSE. Every slug gets the same twelve seconds,
// so it cannot say a film is missing, slow, or longer than the shot list says,
// and its URLs are absolute http rather than ERR's protocol relative ones, so
// the page's `//` pinning is never exercised here.
//
// NEEDS ffmpeg, once; the segments are cached in the system temp directory.
~~~

## `demo/fake-board-test.mjs`

### fake-board-test

Above `import { relayOverride } from './shell/wire.mjs';`, lines 1 to 13 before the cut.

~~~js
// demo/fake-board-test.mjs: the stand-in relay and board, graded with no browser.
//
//   node demo/fake-board-test.mjs
//
// Opens nothing off this machine: every socket is to a relay it starts on
// 127.0.0.1 with a port the OS picks.
//
// NEGATIVE CONTROLS, 9 of them, written so the bug they name fails them:
//   - `relayOverride` refuses a public host, an http URL, a path, and nothing
//   - a SILENT board's frames fail the same pulse test a working one passes
//   - a board whose MIDI port is gone counts nothing and says why
//   - B never sees A's `ping`, and a third socket is refused at maxSockets
//   - a `-full` room never opens and its stats say full
~~~

## `demo/fake-board.mjs`

### fake-board

Above `import { fileURLToPath } from 'node:url';`, lines 1 to 64 before the cut.

~~~js
// demo/fake-board.mjs: a Raspberry Pi board that is nobody's board.
//
//   node demo/fake-board.mjs                                  # its own relay on :8897
//   node demo/fake-board.mjs --relay ws://127.0.0.1:9101      # join one already running
//   node demo/fake-board.mjs --listening                      # as if somebody else held the Circuit's lease
//   node demo/fake-board.mjs --skew 250                       # its clock 250 ms ahead of this machine's
//   node demo/fake-board.mjs --hand                           # a hand turns the Circuit's macro knobs, one every 3 s
//
// Then open a board page against it:
//   http://127.0.0.1:8890/away/?relay=ws://127.0.0.1:8897&board=1
//
// 🔴 WHY THIS EXISTS. plans/plan-routing-migration.md §3.8: every page that
// plays the board talks to one Raspberry Pi in another building, with one JACK
// graph and maybe a listener, so `createBoard` refuses every send under a
// harness and the suite grades nothing the page sends. This answers in the
// board's place, in the board's rooms, with the board's verbs, on a relay on
// this machine (`demo/fake-relay.mjs`), so a page can be driven for real.
//
// WHAT IT IS, AND WHERE EACH HALF COMES FROM:
//   - the MAIN ROOM (`studio-1`): `board.hello` and `board.alive` built by the
//     board's own `rig/board/beat.mjs`, so the graph a page draws is the graph
//     `boardGraph` makes; `graph.ask` answered with a beat, as the board does;
//     `audio.status`, `audio.start`, `audio.stop`, `note.on`, `note.off`,
//     `note.panic`, `voice.select`, `voices.list`, `ctl.set`, `ctl.meter`,
//     `cc` and `board.ping`, each answered in the name the board answers in.
//   - the INPUT ROOM (`studio-1-circuit`): the board's own `createInputs` from
//     `rig/board/inputs.mjs`, run with a fake `arecord` and a fake raw MIDI
//     port. So the lease, `input.want`, `audio.status`, the `midi.send` gate
//     (`midiVerdict`, which REFUSES SysEx, the `never` class on that port) and
//     the status a page reads are the board's code rather than a copy of it.
//
// 🔴 NOT SILENCE AND NOT WHITE NOISE, THE SAME RULE AS THE OTHER THREE STAND-INS.
// Every frame is 220 Hz and 330 Hz a fifth apart, the 330 gated on for the
// first quarter second of every half second. A frame count passes on silence;
// a peak does not, and the PULSE means a check can tell which way time runs.
// `toneFrame` is pure and exported so a test grades the same samples a page hears.
//
// 🔴 A COUNT FROM THE FAR SIDE. Every `midi.send` the gate lets through is
// WRITTEN to the fake port and counted there, and the board's own status
// carries it back to a page as `midi.out` in `audio.started`. A page that
// reads that number is reading the board's side of the boundary, never its own
// queue (positron-verify, `createMidiLane`'s `scheduled()`).
//
// 🔴 THE COLLIDE VERBS, THROUGH THE BOARD'S OWN SERVICE (2026-10-12,
// plans/plan-pi-supercollider-defs.md step 2). `sc.load`, `sc.hit`, `sc.set`,
// `sc.stats`, `clock.ping` and the `collide` node's notes are answered by
// `createCollideService` from `rig/board/scollide.mjs`, the code the Pi runs,
// over a FAKE scsynth that decodes every bundle it is sent and counts, on its
// own side, how early each one arrived. `skewMs` moves this board's clock away
// from the machine's, so a page has a real offset to find.
// ⚠️ The fake scsynth makes no sound of the program: `audio.start {source:
// 'collide'}` starts the same tone as every other source, so a page's Pi scope
// has something to read, and nothing about it follows the program.
//
// ⚠️ WHAT IT IS NOT: H.264 (no GPU node is announced, so no page is offered a
// picture that cannot come), an instrument (the tone is fixed and a note
// changes nothing in it; it announces `synth`, since Yoshimi left the board on
// 2026-10-13), and the direct WebRTC path (`direct: false`, so a page never
// fetches ICE for a board that cannot answer). A stand-in grades OUR code; a
// page green here can still meet a board that is off.
//
// 🔴 LOOPBACK ONLY. It refuses to join any relay that is not on this machine,
// because a fake board in the real `studio-1` would announce a Raspberry Pi
// that does not exist onto the owner's patchbay.
~~~

### tone-at

Above `export function toneAt(i, rate = RATE, { silent = false } = {}) {`, lines 85 to 88 before the cut.

~~~js
/**
 * The stand-in's signal at absolute sample `i`, as a float. Pure.
 * `silent` is the sabotage: the same frames, every sample zero.
 */
~~~

### board-paced

Above `function paced(rate, tickMs, onSamples, unit = 1) {`, lines 126 to 131 before the cut.

~~~js
/**
 * A clock paced source: calls `onSamples(start, n)` with however many samples
 * are OWED since it started, every `tickMs`. Owed against the clock and not
 * per tick, because node's timers fire late and a stand-in that sends at the
 * timer's rate runs slow (positron-verify, `fake-station.mjs`).
 */
~~~

### fake-spawn

Above `function fakeSpawn(opts) {`, lines 142 to 145 before the cut.

~~~js
/**
 * A fake `arecord`: an object shaped like a child process whose stdout is S16LE
 * of the tone at the device's channel count, paced by the clock.
 */
~~~

### fake-fs

Above `function fakeFs(written, inbox) {`, lines 162 to 168 before the cut.

~~~js
/**
 * A fake ALSA raw MIDI port: every write is kept, so the count is the far side's.
 * And since 2026-10-13 it has an input too, the Circuit's MIDI out: `inbox`
 * holds byte chunks the instrument "sent", read back non-blocking exactly as
 * `inputs.mjs` reads `/dev/snd/midiC<n>D0`, EAGAIN when there is nothing.
 * One read open at a time, EBUSY on a second, as a raw MIDI input is.
 */
~~~

### fake-scsynth

Above `export function fakeScsynth({ now }) {`, lines 188 to 193 before the cut.

~~~js
/**
 * A scsynth that is nobody's: it takes `/d_recv` at once, decodes every bundle
 * it is sent, and counts on its OWN side of the wire how early each timetag
 * arrived. A node it was told to start ends 300 ms after its time, with an
 * `/n_end`, as a short drum hit would. `now` is the board's (skewed) clock.
 */
~~~

### start-board

Above `export function startBoard({ relay = null, port = 8897, room = 'studio-1', liste`..., lines 235 to 256 before the cut.

~~~js
/**
 * Start a board.
 * @param {object} [o]
 * @param {string} [o.relay]      a loopback ws:// relay. Left out, one is started.
 * @param {number} [o.port]       the relay's port when one is started here
 * @param {string} [o.room]       the board's main room, `studio-1` like the Pi
 * @param {boolean} [o.listening] hold the Circuit's lease as another listener would
 * @param {boolean} [o.silent]    SABOTAGE: every frame zero
 * @param {boolean} [o.portGone]  SABOTAGE: the raw MIDI port refuses every write,
 *                               as an unplugged Circuit does, so nothing is counted
 * @param {boolean} [o.quiet]
 * @param {number} [o.beatMs]
 * @param {number} [o.skewMs]    this board's clock is the machine's plus this,
 *                               for `clock.ping` and every `at` it is sent
 * @param {boolean} [o.hand]     a hand on the Circuit: every 3 s one macro knob
 *                               (M1 to M8 in turn) is swept to a new value, as
 *                               CC 80 to 87 on channel 1 with clock between, the
 *                               way the real one sends a turn. Only while a
 *                               lease is held, because only then is it read.
 * Returns `{ relay, room, ready, stats(), close() }`; `ready` resolves when
 * both rooms are joined and the hellos are out.
 */
~~~

### no-source

Above `if (!msg.source) return reply('audio.started', { ok: false, reason: 'say which i`..., lines 337 to 337 before the cut.

~~~js
// As the board since 2026-10-13: no source is refused in words, there is no default.
~~~

### idle-note

Above `if (!source) return reply('note.ack', { note: msg.note, dropped: true, reason: '`..., lines 348 to 348 before the cut.

~~~js
// As the board since 2026-10-13: a note to an idle board starts nothing.
~~~

## `demo/fake-err.mjs`

### fake-err

Above `import { createServer } from 'node:http';`, lines 1 to 75 before the cut.

~~~js
// demo/fake-err.mjs: an HLS live edge that is nobody's broadcaster.
//
//   node demo/fake-err.mjs                     # :8902, three channels
//   node demo/fake-err.mjs --port 9300
//   node demo/fake-err.mjs --radio             # and the radio channels over HLS, for /station/'s relay slot
//
// Then open either page against it:
//   http://127.0.0.1:8890/now/?base=http://127.0.0.1:8902
//   http://127.0.0.1:8890/flipper/?base=http://127.0.0.1:8902/wall
//
// 🔴 WHY THIS EXISTS, AND IT IS THE FIRST RULE IN CLAUDE.MD RATHER THAN A
// CONVENIENCE. `/now/` and `/flipper/` both point at ERR's live HLS, and ERR
// told us our listeners were corrupting their audience figures. The standing
// rule is that a connection to one of their mounts is opened only when a PERSON
// is going to watch it. `/now/`'s self-check alone asks for thirty two-byte
// range probes and pulls a ten minute back-seek off their servers; `/flipper/`
// sweeps eight points per channel every time a cell is opened. So the two pages
// with the most machinery in them were the two nobody could run, and the last
// full suite skipped both in writing.
//
// This is the same answer `demo/fake-station.mjs` gave `/archive/radio/` and
// `demo/fake-tapes.mjs` gave `/tapes/`. A real master playlist, a real sliding
// media playlist with a real PROGRAM-DATE-TIME and a real MEDIA-SEQUENCE, real
// MPEG-TS segments that really decode, real Range replies, and a real schedule
// endpoint, all from a port on this machine.
//
// 🔴 THE REFUSAL IS THE PART THAT MATTERS, NOT THE STREAM. ERR blocks live
// segments BY PROGRAMME, and a refusal is a 403 carrying NO
// `access-control-allow-origin`, which reaches a browser as a CORS failure
// rather than as a status code. Measured 2026-09-06 by sweeping each 2 h window
// at 13 points (`.` = served, `#` = refused, oldest on the left):
//
//     etv       ........#####     the newest ~45 min refused
//     etv2      #########....     the OLDEST ~78 min refused, the edge fine
//     etvpluss  .............     everything served
//
// All three shapes are reproduced, because finding that boundary is most of
// what these two pages ARE: `/now/` lands its back-seek on the newest instant
// that was served, and `/flipper/` starts its picture behind the wall and
// stops loading when it reaches it. A stand-in that served everything would
// leave both of those grading nothing.
//
// ⚠️ THE BOUNDARY SLIDES HERE AND JUMPS AT ERR. Theirs is a programme edge, so
// it sits still for half an hour and then moves by however long that programme
// was. This one is a fixed distance from the live edge, which is deterministic
// and therefore gradeable. It is the one behaviour in this file deliberately
// unlike the thing it stands in for, and the trade is the usual one: a harness
// cannot assert against a quantity that moves for reasons it cannot see.
//
// ⚠️ IT GRADES OUR CODE AND NOTHING ELSE. It cannot tell you that ERR's
// boundary has moved, that a channel has gone off air, that their playlists
// have changed shape, or that the schedule API has been rewritten. A page that
// is green here can still meet all four out there.
//
// ⚠️ NO BURNED CLOCK IN THE PICTURE, AND THE REASON IS THE TOOLCHAIN RATHER
// THAN THE DESIGN. `demo/shell/pattern.mjs`'s `ffmpegFilters()` would burn a
// readable wall clock into every frame, which would let `/now/`'s "a frame from
// the asked-for instant was actually shown" read the instant off the glass
// instead of trusting a timestamp. It needs `drawtext`, `drawtext` needs
// libfreetype, and the ffmpeg on this machine (Homebrew 9.0.1) is built without
// it: `ffmpeg -filters | grep drawtext` returns nothing at all. CLAUDE.md
// already records that `src/publish.sh` pins `ffmpeg@7` for exactly this
// reason. A pool generated with a filter chain that silently draws nothing
// would be worse than no clock, so there is no clock. `testsrc2` still moves
// and counts, so one frame is distinguishable from the next.
//
// ⚠️ IT NEEDS ffmpeg, ONCE. Two hours of picture is generated the first time
// and cached in the system temporary directory: a repository is the wrong place
// for a hundred megabytes of test card. MEASURED on this machine, cold: 55.4 s
// wall for 3600 segments, 97 MB of segment bytes, 105 MB on disk once the
// filesystem has rounded 3600 small files up to whole blocks. Quote the second
// number to anybody worrying about a disk, because it is the one `du` agrees
// with. With no ffmpeg it says so and returns null, because
// a harness that cannot run has to say why rather than serve something that
// reads as a broken page.
~~~

### err-seg-ms

Above `const SEG_MS = 1920;`, lines 85 to 95 before the cut.

~~~js
/**
 * 🔴 1.92 SECONDS A SEGMENT AND 3750 OF THEM, BECAUSE THAT IS WHAT WAS MEASURED.
 * This said two seconds and 3600 until 2026-10-05, under a heading claiming
 * the number was read off ERR. It was not: `research/err-live-feeds-2026-08.md`
 * and `plans/plan-live-timeline.md` both MEASURED `#EXTINF:1.92` on every one
 * of 3750 segments, 7200.00 s exactly, on TV and radio alike, and the radio
 * half of this file already used 1920 ms. A stand-in on a round number lets a
 * page get away with assuming one.
 * 1.92 s is 48 frames at ERR's 25 fps and 90 AAC frames at 48 kHz, so every
 * segment cuts on a keyframe and on an audio frame boundary.
 */
~~~

### err-pool

Above `const POOL_N = WINDOW_N;`, lines 99 to 105 before the cut.

~~~js
/**
 * 🔴 THE POOL IS AS LONG AS THE WINDOW, WHICH BUYS EXACTLY ONE SEAM.
 * Segment `sn` is served from pool file `sn % WINDOW_N`, so a playlist of
 * WINDOW_N consecutive sequence numbers contains exactly one wrap, wherever it
 * happens to fall. A shorter pool would be cheaper and would put a
 * discontinuity every few minutes across a window a page seeks around inside.
 */
~~~

### err-measured

Above `const MEASURED = {`, lines 116 to 127 before the cut.

~~~js
/**
 * 🔴 WHAT ERR WAS MEASURED DOING, 2026-09-06, one sweep of thirteen points
 * across each two hour window. `/flipper/` draws it in its own comment:
 *
 *     etv       ........#####     the newest ~45 min refused
 *     etv2      #########....     the OLDEST ~78 min refused, the edge fine
 *     etvpluss  .............     everything served
 *
 * The third row is as load-bearing as the other two: a stand-in where every
 * channel refused something would make "nothing is served anywhere" look
 * identical to "every fetch from this page is failing".
 */
~~~

### err-open-edge

Above `const OPEN_EDGE = {`, lines 134 to 160 before the cut.

~~~js
/**
 * 🔴 AND THE SAME THREE SHAPES WITH THE FIRST TWO SWAPPED, WHICH IS THE
 * DEFAULT, AND THE REASON IS A HOLE IN `/now/` RATHER THAN A PREFERENCE.
 *
 * Both pages open channel 0. `/flipper/` handles a refused live edge: it sweeps
 * back from the edge, finds the boundary, and starts the picture ninety seconds
 * behind it. `/now/` has no such path. Point it at a channel whose newest
 * 45 minutes are refused and hls.js 403s on every fragment at the live edge,
 * the wall handler stops loading, and the page shows black with one log line:
 * MEASURED here, six of its asserts red, all of them downstream of a clock that
 * never starts.
 *
 * ⚠️ WHICH CHANNEL WEARS WHICH SHAPE IS NOT A MEASUREMENT AND MOVES ANYWAY.
 * The block is per PROGRAMME and follows the schedule, so the sweep above is
 * one day at one instant. `/now/`'s own calibration is the evidence: it bands
 * its live gap green between 5 and 10 seconds and its `what` describes a
 * playing picture, neither of which could have been written against a channel
 * that refuses its own edge. So the default gives channel 0 an edge that plays
 * and puts the newest-end shape on channel 1, where a person clicking a cell
 * meets it.
 *
 * ⚠️ `/wall` IS THE MEASURED DAY AND THE HARNESS POINTS `/flipper/` AT IT.
 * `<base>/wall/live/etv.m3u8` is the arrangement above; it is the only way
 * `servedStart` runs its interesting branch, and it is how the question "what
 * does `/now/` do when its edge is refused" gets asked on purpose instead of
 * by accident.
 */
~~~

### err-make-pool

Above `function makePool(say) {`, lines 172 to 195 before the cut.

~~~js
/**
 * Two hours of segmented fMP4, generated once and kept.
 *
 * 🔴 fMP4, NOT MPEG-TS, BECAUSE ERR's TELEVISION IS fMP4. MEASURED twice
 * (`research/err-live-feeds-2026-08.md`, `plans/plan-live-timeline.md`):
 * CMAF `.m4s` segments behind one `#EXT-X-MAP` init segment. hls.js takes a
 * different path for each (it transmuxes TS and passes fMP4 through), so a TS
 * stand-in graded a path ERR's picture never takes. This was TS until
 * 2026-10-05.
 *
 * 🔴 EVERY SEGMENT IS EXACTLY 1.92 s, WHICH IS WHAT MAKES A SEQUENCE NUMBER
 * A CLOCK. `-g 48` at 25 fps puts a keyframe on every 1.92 s boundary and
 * `-sc_threshold 0` stops the encoder inserting its own, so `-hls_time 1.92`
 * cuts where it is told. The build refuses a pool whose playlist carries any
 * other `#EXTINF` value.
 * Without that, segment `sn` would not start at `sn * 2000` and the sliding
 * window's arithmetic would drift against wall time by a few milliseconds per
 * segment, which over a two hour window is minutes.
 *
 * 🔴 IT IS BUILT INTO A TEMPORARY DIRECTORY AND RENAMED INTO PLACE. A run that
 * is Ctrl-C'd halfway through leaves a partial pool, and a partial pool is a
 * stand-in that 403s a random stretch of the window for a reason nobody wrote
 * down. The rename is the commit.
 */
~~~

### err-no-ffmpeg

Above `console.error('this needs ffmpeg to make its picture, and ffmpeg did not run:');`, lines 219 to 222 before the cut.

~~~js
// ⚠️ IT SAYS WHY AND RETURNS FALSE RATHER THAN EXITING, the same as the
// other two stand-ins. A harness importing this has to be able to report
// "the stand-in could not be built" as the reason a page was not graded,
// which is a different sentence from a page that failed.
~~~

### err-short-pool

Above `const got = count(tmp);`, lines 228 to 231 before the cut.

~~~js
// 🔴 REFUSE A SHORT POOL RATHER THAN SERVING IT. ffmpeg exiting 0 having
// written fewer segments than asked would give a window with a hole in it
// that answers exactly like a rights refusal, which is the one thing this
// file exists to be able to tell apart.
~~~

### err-tone

Above `function makeTone() {`, lines 251 to 256 before the cut.

~~~js
/**
 * Thirty seconds of something with a shape to it, for the five radio cells.
 * The same two tones a fifth apart `fake-station.mjs` makes, and for the same
 * reason written there: a check that counts frames passes over silence and a
 * check that measures a level does not.
 */
~~~

### err-radio

Above `const RADIO_SEG_MS = 1920;`, lines 274 to 288 before the cut.

~~~js
/**
 * 🔴 AUDIO-ONLY HLS, THE SHAPE ERR'S RADIO HAS ON live.err.ee, FOR THE STATION'S
 * RELAY SLOT. `research/err-live-feeds-2026-08.md` measured it: a master per
 * channel that mints a session `?id=` and lists AAC rungs at 70, 130 and 260
 * kbit/s, a variant that answers 400 without that id, MPEG-TS segments of
 * exactly 1.92 s (90 AAC frames at 48 kHz) and a two hour window, 3750 of them.
 * All of that is reproduced so `workers/station`'s relay can be built and run
 * with zero requests to ERR.
 *
 * ⚠️ OFF UNLESS ASKED FOR (`--radio`, or `startErr({ radio: true })`). It is a
 * second pool, about half a minute to build once, and `/now/` and `/flipper/`
 * do not need it, so their harness runs do not pay for it.
 * ⚠️ IT GRADES OUR CODE AND NOTHING ELSE, the same as everything in this file.
 * Every rung is the same pool at 32 kbit/s mono; only the BANDWIDTH labels differ.
 */
~~~

### err-edge

Above `function edge(atMs = Date.now()) {`, lines 362 to 369 before the cut.

~~~js
/**
 * The newest COMPLETE segment, and the oldest one still in the window.
 *
 * Segment `sn` covers `[sn * 2000, sn * 2000 + 2000)` in wall milliseconds, so
 * the sequence number IS the clock and nothing has to be remembered between
 * requests. The edge is one segment behind the present because a segment that
 * is still being written is not offered by anybody.
 */
~~~

### err-serves

Above `function serves(arrangement, id, sn, now = Date.now()) {`, lines 375 to 382 before the cut.

~~~js
/**
 * Will this channel hand this segment over?
 *
 * Two ways to be refused and they are indistinguishable from outside, which is
 * `err-live.mjs`'s fact 2 and is reproduced on purpose: a segment that has
 * fallen off the back of the window answers exactly like a rights refusal. That
 * is why both pages only ever probe segments they just read out of a playlist.
 */
~~~

### err-cors

Above `const CORS = {`, lines 395 to 403 before the cut.

~~~js
/**
 * 🔴 `date` HAS TO BE EXPOSED OR `readPlaylist` READS NOTHING. It is not a
 * CORS-safelisted response header, so a cross-origin page cannot see it without
 * being told it may, and `readPlaylist` uses it as the server's own clock.
 * ⚠️ WHETHER ERR EXPOSES IT IS NOT KNOWN HERE and was not checked, because
 * checking means asking them. Nothing on either page asserts against
 * `serverDate`, so the difference cannot make a check pass here that would fail
 * there; if one is ever written, that is the first thing to confirm.
 */
~~~

### err-sessions

Above `const SESSIONS = new Set();`, lines 428 to 438 before the cut.

~~~js
/**
 * 🔴 A FRESH SESSION ON EVERY READ OF THE MASTER, AND A VARIANT THAT REFUSES TO
 * ANSWER WITHOUT ONE IT MINTED. MEASURED (`research/err-live-feeds-2026-08.md`):
 * the master mints `?id=<15 digits>`, a bare variant answers 400, and a stale
 * or foreign id answers `Failed to set session: not found`. Until 2026-10-05 the
 * television half of this file had no session at all, so a page that re-read
 * the master every second, opening a new session at ERR each time, looked
 * exactly like one that opened one.
 * ⚠️ SESSIONS HERE NEVER EXPIRE. How long ERR keeps one is NOT measured, so a
 * page's recovery from an expired session is not graded by this file.
 */
~~~

### err-media-playlist

Above `function mediaPlaylist(id, now = Date.now()) {`, lines 457 to 468 before the cut.

~~~js
/**
 * The sliding window, built fresh on every ask.
 *
 * ONE `#EXT-X-PROGRAM-DATE-TIME`, on the first segment, which is what ERR sends
 * and what makes an absolute wall-clock position domain possible at all: the
 * rest is `pdt + Σ EXTINF`. A PDT on every segment would let a page be sloppy
 * about that accumulation and still look correct here.
 *
 * The wrap seam carries `#EXT-X-DISCONTINUITY`, because the pool's timestamps
 * run backwards there. Without it a player reads a two hour jump backwards in
 * PTS as a broken stream rather than as a new stretch of material.
 */
~~~

### err-schedule

Above `function schedule(dayDate) {`, lines 489 to 503 before the cut.

~~~js
/**
 * A day of programmes on a half hour grid, in the shape
 * `www.err.ee/api/tvSchedule/getTimelineSchedule` answers: a flat array whose
 * entries carry `startTime` in epoch SECONDS.
 *
 * 🔴 CONTIGUOUS ACROSS MIDNIGHT, WHICH IS THE ONLY HARD PART. `/now/` asks for
 * two days when its window reaches back past midnight, flattens both, and
 * asserts that every programme starts exactly where the previous one ended. A
 * grid that stopped at 23:30 and started again at 00:30 would fail that, on a
 * page that is working.
 *
 * ⚠️ THE NAMES SAY WHAT THEY ARE. A reader looking at the schedule row of a
 * page pointed at this should be able to tell in one glance that they are not
 * looking at Estonian television.
 */
~~~

### err-start

Above `export function startErr({ port = 8902, quiet = false, radio = false } = {}) {`, lines 523 to 528 before the cut.

~~~js
/**
 * Start it. `port: 0` lets the OS choose, which is what a harness should do: a
 * fixed port is a shared mutable global, and this repo has paid for that twice.
 *
 * Returns the server, or `null` when there is no picture to serve.
 */
~~~

### err-notice

Above `if (!makePool(console.log)) return null;`, lines 532 to 536 before the cut.

~~~js
// ⚠️ THE BUILD NOTICE IGNORES `quiet`, AND THAT IS NOT AN OVERSIGHT. Making
// the pool blocks for about a minute the first time on a machine, and a
// harness that goes silent for a minute before Chrome even starts is
// indistinguishable from a harness that has hung. Everything after it is
// ordinary chatter and stays quiet.
~~~

### err-arrangement

Above `const pre = /^\/(wall)(\/.*)$/.exec(url.pathname);`, lines 550 to 553 before the cut.

~~~js
// ⚠️ THE ARRANGEMENT IS A LEADING PATH SEGMENT, SO NOTHING IN A PAGE HAS
// TO KNOW ABOUT IT. `?base=http://127.0.0.1:PORT/wall` reaches `errUrl` as
// an ordinary prefix, and every URL below it is relative, so the master
// playlist's variant and the variant's segments follow without a word.
~~~

### err-403

Above `res.writeHead(403, { 'content-type': 'text/plain' });`, lines 564 to 577 before the cut.

~~~js
/**
 * 🔴 403 AND NOT ONE CORS HEADER, WHICH IS THE WHOLE POINT OF THE
 * REFUSAL. In a browser this is not a status code at all: the fetch
 * rejects and hls.js reports a fragment load error with nothing in it
 * that names a 403. `probeSegment` catches exactly this and calls it
 * refused; a 403 that DID carry `access-control-allow-origin` would be
 * readable, `r.ok` would be false, and the page would take the other of
 * its two paths. Both mean refused and both are reproduced by not
 * writing the header.
 *
 * ⚠️ NO `access-control-allow-origin` MEANS OPTIONS TOO. Answering a
 * preflight for a segment that is then refused would let a page learn
 * something about the refusal that ERR does not tell it.
 */
~~~

### err-init

Above `const init = /^\/live\/([a-z0-9]+)\/init\.mp4$/.exec(path);`, lines 585 to 586 before the cut.

~~~js
// The one init segment every `.m4s` decodes against. ⚠️ Whether ERR ever
// refuses its init segment is NOT measured; here it is always served.
~~~

### err-not-have

Above `res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });`, lines 643 to 647 before the cut.

~~~js
// ⚠️ IT SAYS WHAT IT DOES NOT HAVE. A bare 404 from a stand-in reads as the
// channel being off air, which is a claim this file is not entitled to make
// about anybody's broadcaster. And this path is never a refusal: a refusal
// here is a 403 with no CORS, and answering a typo the same way would make
// a wrong URL indistinguishable from rights.
~~~

### err-mount

Above `function serveMount(req, res, tone, say) {`, lines 685 to 692 before the cut.

~~~js
/**
 * A radio mount, paced against the clock rather than against the timer.
 *
 * The short version of what `fake-station.mjs` writes at length: sending a
 * fixed chunk per `setInterval` tick sends at the rate node's timers actually
 * fire, which measured 2.3 % slow from inside a page. Bytes owed since the
 * connection opened is the quantity that cannot drift.
 */
~~~

## `demo/fake-relay.mjs`

### fake-relay

Above `import { createServer } from 'node:http';`, lines 1 to 39 before the cut.

~~~js
// demo/fake-relay.mjs: a relay room server that is nobody's relay.
//
//   node demo/fake-relay.mjs                  # :8897
//   node demo/fake-relay.mjs --port 9101
//
// It speaks what `workers/relay/src/index.js` speaks and nothing more:
//
//   ws://127.0.0.1:<port>/room/<name>/ws      join a room
//   GET  /room/<name>/stats                   the relay's own stats shape
//
// and a page reaches it through wire.mjs's `?relay=`:
//
//   http://127.0.0.1:8890/away/?relay=ws://127.0.0.1:8897
//
// 🔴 WHY THIS EXISTS. plans/plan-routing-migration.md §3.8: every opener that
// matters talks to the Raspberry Pi in another building through the production
// relay, so a harness either drove shared hardware or graded nothing. This and
// `demo/fake-board.mjs` together are a room and a board on this machine.
//
// ⚠️ WHAT IT COPIES, BECAUSE A PAGE CAN SEE IT:
//   - VERBATIM to every socket in the room, THE SENDER INCLUDED. `wire.mjs`
//     counts its own echo, and a relay that skipped the sender would read as a
//     relay dropping every message.
//   - the text frame `ping` is answered `pong` to that socket only and reaches
//     nobody else, which is what the runtime's autoresponse does there.
//   - the same message roof, the same two token buckets and the same strikes,
//     so a stand-in is not more generous than the relay. A dropped message is
//     dropped silently and counted only here, which is the relay's behaviour
//     and the reason `seq` exists.
//   - a full room refuses the upgrade with the relay's `503 room full (N)`,
//     and `/stats` says so, which is how `openWire` tells a full room from a
//     dead relay. ANY ROOM WHOSE NAME ENDS `-full` IS FULL HERE, so a page can
//     be pointed at a refusal by its own `?room=`.
// ⚠️ WHAT IT DOES NOT: hibernation, idle reclaim and the per-socket attachment.
// Nothing here lives long enough for them to matter, and they are said rather
// than pretended.
//
// 🔴 LOOPBACK ONLY. It listens on 127.0.0.1, because a room server reachable
// from the network is a tokenless relay somebody else can use.
~~~

### frames

Above `export function createFrameReader(onFrame) {`, lines 73 to 77 before the cut.

~~~js
/**
 * Reads frames off a byte stream. Fragmented messages are joined; control
 * frames come out on their own. `onFrame(opcode, payload)` gets whole messages.
 * Returns `{ push(chunk) }`.
 */
~~~

### relay-start

Above `export function startRelay({ port = 8897, quiet = false, maxSockets = LIMITS.max`..., lines 107 to 115 before the cut.

~~~js
/**
 * Start a room server. Returns the `http.Server`, already listening (wait for
 * `listening` before reading `address()`), with `stats()` for a test.
 * @param {object} [o]
 * @param {number} [o.port]         0 lets the OS choose, which a harness wants
 * @param {boolean} [o.quiet]
 * @param {number} [o.maxSockets]   per room, the relay's 128 unless a test asks
 * @param {(room: string) => boolean} [o.full] rooms that refuse every upgrade
 */
~~~

## `demo/fake-station.mjs`

### fake-station

Above `import { createServer } from 'node:http';`, lines 1 to 33 before the cut.

~~~js
// demo/fake-station.mjs — an Icecast mount that is nobody's radio station.
//
//   node demo/fake-station.mjs                 # :8899, every mount the page asks for
//   node demo/fake-station.mjs --port 9100
//
// Then open the page against it:
//   http://127.0.0.1:8890/archive/radio/?base=http://127.0.0.1:8899
//
// 🔴 WHY THIS EXISTS, AND IT IS THE FIRST RULE IN CLAUDE.MD RATHER THAN A
// CONVENIENCE. Every station `/archive/radio/` offers is an ERR mount, ERR told us our
// listeners were corrupting their audience figures, and the standing rule is
// that a connection to one of their mounts is opened only when a PERSON is
// going to listen to it. That left the page's decode and loop paths ungradeable:
// a change to them could be shipped, and could only be checked by becoming a
// listener at a public broadcaster.
//
// So this is a mount with the same shape and none of the ethics: real MP3
// frames, real ICY headers, a real `icy-metaint` text channel with a title in
// it, paced at its own bitrate so the page's arrival gaps and buffer numbers
// mean what they mean on a live stream. `?base=` is already in the page, so
// nothing has to be added there to use it.
//
// ⚠️ IT IS NOT A CLAIM ABOUT ERR. What it grades is OUR code: does the demuxer
// find frames, does the decoder configure, does a loop keep the seconds and play
// them round, backwards and there-and-back. It says nothing about whether a
// broadcaster's mount is up, and a page that works here can still meet a 403
// out there.
//
// ⚠️ IT NEEDS ffmpeg, ONCE. The audio is generated the first time and cached in
// the system temporary directory: a repository is the wrong place for a
// megabyte of test tone. With no ffmpeg it says so and exits, because a harness
// that cannot run has to say why rather than serve silence that reads as a
// broken page.
~~~

### tone

Above `function makeMp3() {`, lines 49 to 58 before the cut.

~~~js
/**
 * Thirty seconds of something with a shape to it: two tones a fifth apart, one
 * of them pulsing at 2 Hz.
 *
 * 🔴 NOT SILENCE AND NOT WHITE NOISE. A loop over silence passes every check
 * that counts frames and none that measure a level, which is the vacuous pass
 * this repo has already shipped twice. A tone has a peak a meter can read, and a
 * PULSE means a check can tell a loop playing backwards from one playing
 * forwards by looking at where the loud part landed.
 */
~~~

### no-ffmpeg

Above `console.error('this needs ffmpeg to make its audio, and ffmpeg did not run:');`, lines 73 to 76 before the cut.

~~~js
// ⚠️ IT SAYS WHY AND RETURNS FALSE RATHER THAN EXITING. A harness importing
// this has to be able to report "the stand-in could not be built" as the
// reason a page was not graded, which is a different sentence from a page
// that failed.
~~~

### burst

Above `const BURST = 65536;`, lines 89 to 100 before the cut.

~~~js
/**
 * 🔴 IT BURSTS AT CONNECT, BECAUSE ICECAST DOES, AND A PAGE THAT MEASURES ITS
 * OWN CUSHION CAN TELL. `burst-size` defaults to 65536 bytes on a real mount:
 * four seconds of 128 kbit/s audio arrive at once so a new listener has
 * something in hand before the paced bytes start. `/archive/radio/`'s own settled-rate
 * check already names it (*"the difference is Icecast's burst"*).
 *
 * MEASURED without it: the page's cushion sat at 199 ms against a 104 ms worst
 * gap, which is 95 ms of headroom and a red `the cushion outlasts the worst gap
 * in it` at a threshold of 100. That assert was reading a property of this file
 * rather than of the page, which is the whole failure mode a stand-in has.
 */
~~~

### station-start

Above `export function startStation({ port = 8899, quiet = false } = {}) {`, lines 115 to 122 before the cut.

~~~js
/**
 * Start it. `port: 0` lets the OS choose, which is what a harness should do:
 * a fixed port is a shared mutable global, and this repo has already paid for
 * that twice (a suite and a dev server on 8890, a harness attaching to the
 * previous run's Chrome).
 *
 * Returns the server, or `null` when there is no audio to serve.
 */
~~~

### health

Above `if (mount === 'health') {`, lines 144 to 151 before the cut.

~~~js
/**
 * 🔴 THE SAME SHAPE `shout` ANSWERS, because the page asks this BEFORE it
 * plays anything and disables its play button when nothing is up. A stand-in
 * that answered a different shape would take the page down the "neither
 * station is answering" path, where it makes one assert and none of the
 * thirty-four that matter. Every mount asked about is up here, which is the
 * one thing a stand-in can honestly say about itself.
 */
~~~

### boundary

Above `let at = Math.floor(Math.random() * AUDIO.length);`, lines 174 to 178 before the cut.

~~~js
// 🔴 IT STARTS ON A FRAME BOUNDARY, WHICH IS THE WHOLE POINT OF A STAND-IN
// THAT IS HONEST. A real mount joins a listener mid-frame and the splitter has
// to resynchronise; starting at byte 0 of the file would let a scanner that
// can only find frames at the head pass. `sinceMeta` carries across the loop
// for the same reason: the text channel does not restart when the audio does.
~~~

### paced

Above `const t0 = Date.now();`, lines 181 to 193 before the cut.

~~~js
/**
 * 🔴 PACED AGAINST THE CLOCK, NOT AGAINST THE TIMER, AND THE DIFFERENCE WAS
 * MEASURABLE FROM INSIDE THE PAGE. Sending a fixed chunk per `setInterval`
 * tick sends at the rate the timer actually fires, and node's timers run a
 * millisecond or two late: MEASURED through `/archive/radio/`'s own settled-rate
 * readout, **125 kbit/s against the 128 declared**, which is 2.3% slow. A
 * listener then loses about 23 ms of cushion every second, so the page's
 * 600 ms floor drained to 32 ms over half a minute and its `the cushion
 * outlasts the worst gap in it` check went red about a page that was
 * working perfectly. A real Icecast paces against its own audio clock; so
 * does this now, by sending however many bytes are OWED since the
 * connection opened.
 */
~~~

## `demo/fake-tapes.mjs`

### fake-tapes

Above `import { createServer } from 'node:http';`, lines 1 to 44 before the cut.

~~~js
// demo/fake-tapes.mjs: an archive that is nobody's archive.
//
//   node demo/fake-tapes.mjs                   # :8901, every recording the page asks for
//   node demo/fake-tapes.mjs --port 9200
//
// Then open the page against it:
//   http://127.0.0.1:8890/tapes/?base=http://127.0.0.1:8901
//
// 🔴 WHY THIS EXISTS. `/tapes/` plays twenty-three Kurenniemi recordings off
// archive.org, and the standing instruction is *"stil: super careful with
// external sources, better avoid"*. The reasoning that got that reply was
// "it uses archive.org, not ERR, so it is safe to run": the rule is about whose
// server it is, not about which harm has been named yet. So every run of
// `node demo/verify.mjs tapes` was spending somebody else's bandwidth, and
// `node demo/verify.mjs` with no arguments did it by accident.
//
// This is the same answer `demo/fake-station.mjs` gave `/archive/radio/`. Real MP3
// frames, real `content-length`, real `accept-ranges` and real Range replies, at
// the exact lengths `corpus.json` records, served from a port on this machine.
//
// 🔴 THE LENGTHS ARE THE WHOLE POINT, NOT A DETAIL. `/tapes/` lays every
// recording END TO END as one long tape, each as wide as it really is, and its
// checks grade that geometry: the bars tile with nothing between them, a bar is
// as wide as its tape is long, the picture opens on an hour of it. A stand-in
// whose lengths were invented would leave every one of those asserts grading
// this file instead of the page. So each path is served at the `durationMs` the
// corpus already carries, measured once by `measure-durations.mjs`.
//
// MEASURED off the wire with ffprobe, against what the corpus says: the MP4 rows
// land EXACTLY (626335 asked, 626.335000 read), and the MP3 rows land inside one
// frame, which is 24 ms and is the smallest thing a stream of whole frames can
// be cut to (829832 asked, 829824 read; 73169 asked, 73176 read).
//
// ⚠️ IT GRADES OUR CODE AND NOTHING ELSE. It cannot tell you that a recording
// has been taken down, that archive.org has redirected a download to a storage
// node which then omits `access-control-allow-origin` (which is what `/tapes/`'s
// own retry-without-crossing path exists for), or that a file is slow enough to
// miss the page's deadline. A page that is green here can still meet all three
// out there.
//
// ⚠️ IT NEEDS ffmpeg, ONCE, for a few seconds of audio that is then cached in
// the system temporary directory. With no ffmpeg it says so and returns null,
// because a harness that cannot run has to say why rather than serve silence
// that reads as a broken page.
~~~

### rate

Above `const RATE = 48000;`, lines 57 to 71 before the cut.

~~~js
/**
 * 🔴 48 kHz AT 64 kbit/s, AND BOTH NUMBERS ARE LOAD-BEARING. An MPEG-1 Layer
 * III frame is 1152 samples and `144 * bitrate / rate` bytes, so this pair is
 * the one that comes out WHOLE: 24.000 ms and 192 bytes exactly, with no
 * padding bit alternating the frame size. That is what makes a recording of any
 * length addressable by the byte. The file below is one tile repeated, and
 * every wrap lands on a frame boundary because the tile is a whole number of
 * frames and so is the file.
 *
 * ⚠️ The real recordings are mostly 44.1 kHz, where 64 kbit/s gives 208.98
 * bytes and frames alternate 208/209. A stand-in that copied that would have to
 * carry a frame table to answer a Range request. The rate is the one thing here
 * that is deliberately not what archive.org holds, and it costs the page
 * nothing: it reads a duration and a waveform, never a sample rate.
 */
~~~

### tile

Above `function makeTile() {`, lines 79 to 96 before the cut.

~~~js
/**
 * Eight seconds of something with a shape to it: two tones a fifth apart, one
 * of them pulsing at 2 Hz.
 *
 * 🔴 NOT SILENCE. `fake-station.mjs` already wrote down why and it applies
 * unchanged: a check that counts frames passes over silence and a check that
 * measures a level does not, and this page reads a level. `/tapes/`'s loop check
 * fills a ring from the analyser tap and compares the kept lap against its
 * mirror, which needs audio that is not a constant.
 *
 * 🔴 NO Xing HEADER AND NO ID3, WHICH IS THE TRAP IN TILING AN MP3. libmp3lame
 * writes a Xing/LAME frame at the head declaring the frame COUNT of the file it
 * encoded. Tile that and the browser reports the tile's eight seconds for a
 * thirteen minute recording: a stand-in that lies about exactly the quantity it
 * exists to get right. `-write_xing 0` drops it, and the guard below refuses a
 * tile that is not a whole number of frames starting on a sync word, which is
 * what a header of any kind would leave behind.
 */
~~~

### mp4

Above `const mp4Path = (ms) => join(CACHE, 'clip-${ms}.mp4');`, lines 121 to 142 before the cut.

~~~js
/**
 * 🔴 EVERY .mp4 ROW IS A REAL MP4, BUILT ONE AT A TIME AND KEPT.
 *
 * Eight of the twenty-three rows are `video/mp4`, and `/tapes/` opens them in an
 * `<audio>` element on the strength of `canPlayType`. MP3 bytes under an
 * `.mp4` name would be a stand-in answering a different shape from the thing it
 * stands in for, which is the failure mode a stand-in has: whatever a browser
 * then did with it would be a fact about Chrome's container sniffing rather than
 * about this page. An MP4 cannot be tiled by the byte, so these are encoded.
 *
 * MEASURED: the longest of them (626 s) takes 3.2 s of ffmpeg, once, and lands
 * at 626.335000 exactly, because `-t` trims through the edit list. After that it
 * is a file on disk.
 *
 * ⚠️ IT IS ON DEMAND RATHER THAN AT STARTUP WHEN THE HARNESS IS DRIVING. Eleven
 * seconds of ffmpeg alongside a headless Chrome is this repo's "a second
 * browser of your own is a harness that reads broken" in a new costume, and the
 * harness never opens a video row: it walks the first two recordings and both
 * are MP3. A standalone run builds them in the background instead, where the
 * only thing waiting is a person about to press one. `--no-prewarm` turns that
 * off.
 */
~~~

### blocks

Above `execFileSync('ffmpeg', mp4Args(ms), { timeout: 120000 });`, lines 161 to 164 before the cut.

~~~js
// ⚠️ THIS ONE BLOCKS THE EVENT LOOP, WHICH IS WHY `--prewarm` EXISTS. A
// request that arrives before the file does stops this server answering
// anything else for about three seconds. It happens once per recording per
// machine, and the standalone run builds them before anybody presses one.
~~~

### by-path

Above `const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return`..., lines 173 to 182 before the cut.

~~~js
/**
 * What the page will ask for, read off the corpus rather than listed here.
 *
 * 🔴 KEYED ON THE PATH, BECAUSE THAT IS WHAT SURVIVES THE REWRITE. The page
 * turns `https://archive.org/download/<item>/<name>` into
 * `<base>/download/<item>/<name>`, so the host is gone by the time a request
 * arrives and the path is the whole of the identity. MEASURED over the whole
 * file: 129 rows carry a file, 126 distinct paths, and no two of them disagree
 * about a duration, so a path is enough.
 */
~~~

### spellings

Above `for (const k of new Set([path, safeDecode(path)])) if (!byPath.has(k)) byPath.se`..., lines 192 to 197 before the cut.

~~~js
// ⚠️ BOTH SPELLINGS, BECAUSE ONLY ONE OF THEM IS THIS FILE'S TO CHOOSE.
// These names carry spaces, brackets and Finnish vowels, so the path is
// percent-encoded, and the encoding that comes back on the wire is the
// browser's rather than the corpus's. Indexing the decoded form as well means a
// difference of one escape is a recording that plays rather than a 404 that
// reads as a file having been taken down.
~~~

### cors

Above `const CORS = {`, lines 203 to 206 before the cut.

~~~js
// archive.org answers a media file with `access-control-allow-origin: *` and
// honours Range, which is the pair `/tapes/` depends on: without the first,
// `crossOrigin = 'anonymous'` is refused and the page falls back to a tainted
// graph with no waveform; without the second a seek downloads the file again.
~~~

### tapes-start

Above `export function startTapes({ port = 8901, quiet = false } = {}) {`, lines 226 to 231 before the cut.

~~~js
/**
 * Start it. `port: 0` lets the OS choose, which is what a harness should do: a
 * fixed port is a shared mutable global, and this repo has paid for that twice.
 *
 * Returns the server, or `null` when there is no audio to serve.
 */
~~~

### whole-frames

Above `if (tile.length % FRAME_BYTES !== 0 || tile[0] !== 0xff || (tile[1] & 0xe0) !== `..., lines 235 to 239 before the cut.

~~~js
// 🔴 REFUSE A TILE THAT IS NOT WHOLE FRAMES, RATHER THAN SERVING IT. An ID3
// or Xing block at the head shifts every frame off the 192-byte grid, so the
// wrap in the middle of a long recording would land inside a frame and the
// decoder would hear a click every eight seconds. It would still play, and
// the page would still be green, which is why this is a throw and not a log.
~~~

### not-have

Above `res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });`, lines 256 to 258 before the cut.

~~~js
// ⚠️ IT SAYS WHAT IT DOES NOT HAVE. A bare 404 from a stand-in reads as
// the recording being gone, which is a claim this file is not entitled to
// make about anybody's archive.
~~~

### serve-mp3

Above `function serveMp3(req, res, row, tile, say) {`, lines 271 to 280 before the cut.

~~~js
/**
 * A recording of exactly `row.ms`, as one tile repeated.
 *
 * 🔴 THE FILE IS NEVER MATERIALISED, AND THAT IS NOT A MICRO-OPTIMISATION. The
 * twenty-three rows come to 2 h 15 min, which is 65 MB at this bitrate, and a
 * Map of buffers keyed by duration would hold all of it for the life of a run
 * that reads two of them. Byte `i` of the file is byte `i % tile.length` of the
 * tile, so a Range reply is a walk over the tile with no allocation but the
 * chunk being written.
 */
~~~

### prewarm

Above `function prewarm(say) {`, lines 352 to 355 before the cut.

~~~js
/**
 * Build the video rows now, one at a time, so the first press on one is not a
 * three second wait. Standalone only: see `makeMp4`.
 */
~~~

### exec-file

Above `execFile('ffmpeg', mp4Args(ms), () => one());`, lines 367 to 370 before the cut.

~~~js
// `execFile` rather than the sync form: this runs while the server is
// already answering, and a blocked event loop is a server that is down.
// One at a time, which is the same `gently` the corpus measurement was
// asked for: eight ffmpegs at once is a laptop nobody can type on.
~~~

## `demo/harness-profile.mjs`

### profiles

Above `import { rmSync, readdirSync } from 'node:fs';`, lines 1 to 26 before the cut.

~~~js
// demo/harness-profile.mjs — a harness cleans up after itself.
//
// 🔴 WHY THIS EXISTS, AND THE NUMBER IS THE ARGUMENT. Every harness here
// launches Chrome with a per-run `--user-data-dir`, for good reasons written
// down in `verify.mjs`: a shared profile is a shared HTTP cache (the opaque
// response bug), and Chrome writes its real CDP port INSIDE the profile, so two
// runs sharing one directory drive each other's browser.
//
// Nothing ever deleted them. MEASURED 2026-09-14: **229 leftover profiles,
// about 20 GB**, and the volume was down to **119 MB free** — at which point
// `find` itself failed with ENOSPC and the session could not run a shell
// command at all. A fresh Chrome profile is ~250 MB and this suite gets run
// dozens of times in a working day, so the leak is roughly a gigabyte an hour
// of ordinary use.
//
// ⚠️ IT IS NOT ENOUGH TO CLEAN UP ON THE WAY OUT. A harness that is Ctrl-C'd,
// `kill -9`'d, or dies on ENOSPC runs no handler at all — and those are exactly
// the runs that happen when something is already wrong. So there are two
// halves, and the second is what actually recovers a machine:
//
//   1. remove OUR directory when this process ends, however it ends
//   2. SWEEP directories belonging to processes that are no longer alive
//
// The sweep is the one that matters, and it is safe because the pid is in the
// name: a directory is only removed when its owner is gone. A run in progress
// in another terminal keeps its profile.
~~~

### alive

Above `function alive(pid) {`, lines 33 to 33 before the cut.

~~~js
/** Is this pid still running? `EPERM` means alive and not ours — leave it. */
~~~

### sweep

Above `export function sweepStale(prefix) {`, lines 38 to 42 before the cut.

~~~js
/**
 * Delete profile directories named `<prefix>-<pid>` whose pid is dead.
 * @returns {{removed: number}} so a caller can SAY it happened — a cleanup
 *   nobody is told about is one nobody can tell apart from a leak.
 */
~~~

### claim

Above `export function claimProfile(prefix) {`, lines 58 to 69 before the cut.

~~~js
/**
 * Claim a profile directory for this run and arrange for it to go away.
 *
 * ⚠️ `rmSync`, NOT the promise API. `process.on('exit')` runs synchronously and
 * an async unlink scheduled there never completes — the handler would look
 * correct and delete nothing, which is the shape of leak this file is about.
 *
 * ⚠️ AND `exit` COVERS AN UNCAUGHT THROW. Node emits it after printing the
 * stack, so a harness that dies mid-run still tidies up; only a signal needs
 * its own listener, and only because the default action is to terminate without
 * emitting `exit`.
 */
~~~

### to-string

Above `const out = { dir, clean, swept: removed };`, lines 83 to 104 before the cut.

~~~js
/**
 * 🔴 IT STRINGIFIES TO THE PATH, AND WITHOUT THIS IT STRINGIFIED TO
 * `[object Object]` AND CHROME MADE A DIRECTORY CALLED THAT. MEASURED four
 * times on 2026-09-21: three background agents and this session all wrote
 * `--user-data-dir=${claimProfile('probe')}` in a throwaway CDP script, and a
 * 156 MB Chrome profile appeared in the REPOSITORY ROOT under the literal
 * name `[object Object]`. Two agents reported it as a mystery and one deleted
 * it and it came back.
 * 🔴 THE FAILURE MODE IS THE BAD KIND: `[object Object]` IS A VALID RELATIVE
 * PATH, so nothing throws, nothing warns, Chrome starts perfectly and the
 * profile lands wherever the caller's cwd happens to be. A name that was
 * invalid would have failed in one second.
 * 🔴 AND `sweepStale()` CAN NEVER RECOVER IT, which is the half that makes it
 * worth fixing here rather than in each caller: the sweep finds directories
 * whose PID is dead by reading the pid out of the NAME, and that name has no
 * pid in it. So it is a leak this module is structurally blind to, in a
 * project that has already had a run out of disk at 229 leftover profiles and
 * about 20 GB.
 * ⚠️ THE DESTRUCTURING CALLERS ARE UNAFFECTED. `const { dir } = claimProfile()`
 * reads the same field it always did; this only gives the object an answer
 * for the question every caller was already asking it.
 */
~~~

## `demo/perf-wire.mjs`

### perf-wire

Above `import { appendFileSync, writeFileSync } from 'node:fs';`, lines 1 to 2 before the cut.

~~~js
// perf-wire.mjs — what the relay costs and how it scales. Writes to a file:
// `node x.mjs | tail` buffers until exit and looks hung.
~~~

### perf-out

Above `const OUT = process.env.PERF_OUT || join(tmpdir(), 'perf-wire-${process.pid}.txt`..., lines 7 to 11 before the cut.

~~~js
// ⚠️ THIS PATH USED TO BE A DEAD SESSION'S SCRATCHPAD — a hardcoded UUID under
// `/private/tmp/claude-501/…/399cfe11-…//tmp/`, double slash and all. It still
// "worked", because a write creates what it needs, so nothing ever said the
// results were landing somewhere nobody would look. Second one of these in the
// harnesses; `verify-native.mjs` had the other.
~~~

### rate-cap

Above `say('\n4. rate — the receiver counts the hole, which is what 'seq' is for');`, lines 99 to 99 before the cut.

~~~js
// ── 4. where the rate cap bites — measured with the demo's own instrument ───
~~~

### backlog

Above `say('\n5. backlog, local wrangler dev — write path and read path');`, lines 118 to 118 before the cut.

~~~js
// ── 5. the backlog (LOCAL wrangler dev — not an edge number) ────────────────
~~~

## `demo/read-log.mjs`

### read-log

Above `import { readFileSync, writeFileSync, existsSync, watchFile } from 'node:fs';`, lines 2 to 37 before the cut.

~~~js
// demo/read-log.mjs — what a page SAID, where a session can read it.
//
// 🔴 THE POINT OF IT, AND IT IS `read-tap.mjs` ONE STEP ALONG. Asked for
// 2026-09-21: *"build a way to get the logs and debug (like you did with
// tap)"*. Every demo page has a log and every log line is on somebody's screen,
// which is somewhere a session cannot look. An afternoon of this project was
// spent with the person at the desk taking a screenshot of a log so that I
// could read it back, one question at a time, which is exactly the round trip
// `/_tap` was built to stop for MIDI.
//
//   node demo/server.mjs               # must be running; every page posts to it
//   node demo/read-log.mjs             # the last run of every page
//   node demo/read-log.mjs wish        # only pages whose url matches
//   node demo/read-log.mjs --all       # every run, not just the last
//   node demo/read-log.mjs --bad       # only the lines a page marked bad
//   node demo/read-log.mjs --follow    # keep printing as they arrive
//   node demo/read-log.mjs --clear     # start a fresh capture
//
// 🔴 AND FOR A PAGE THAT IS NOT ON THIS MACHINE, THE WORKER ALREADY EXISTS.
// Open the page with `?logs=1` and read it back with
//
//   curl -s 'https://pub.positron.studio/logs?format=text'
//
// which is how a phone, a headset or `https://positron.studio/...` is read at
// all. `shell.mjs` sends to both, and the Worker half is behind that flag on
// purpose: a deployed page shipping every visitor's log by default would be a
// page opening something on load.
//
// 🔴 IT READS A FILE THE DEV SERVER WROTE, AND NOTHING DEPLOYED CAN WRITE IT.
// `shell.mjs` only posts when the page is on localhost, and there is no `/_log`
// route in `workers/view/src/index.js`. Two guards, in that order, so a
// visitor's browser never makes the request rather than making one that 404s.
//
// ⚠️ A PAGE WITH NOTHING LISTENING BEHAVES IDENTICALLY. The post is batched,
// `keepalive`, and its failure is swallowed. A debugging aid that changes what
// it is watching is worse than none.
~~~

### runs

Above `function runs(list) {`, lines 67 to 73 before the cut.

~~~js
/**
 * 🔴 A RUN IS A PAGE PLUS A BUILD PLUS A RESTART OF ITS CLOCK, and the clock is
 * what finds a reload: `performance.now()` starts again at zero, so a line
 * whose time is EARLIER than the one before it on the same page is a new run.
 * Without this, five reloads of `/wish/` read as one run with the times going
 * backwards, which is the most confusing possible shape for a log.
 */
~~~

## `demo/read-tap.mjs`

### read-tap

Above `import { readFileSync, writeFileSync, existsSync } from 'node:fs';`, lines 2 to 20 before the cut.

~~~js
// demo/read-tap.mjs — what the instruments on the desk actually sent.
//
// 🔴 THE POINT OF IT. `/dump/` reads MIDI in a browser and posts what it sees
// to the dev server's `/_tap`, which appends to `.tap/midi.jsonl`. This reads
// that file and says what each control IS, using the same `midi-decode.mjs`
// the page uses, so a reading here and a reading on screen cannot drift.
//
//   node demo/server.mjs            # must be running; /dump/ posts to it
//   node demo/read-tap.mjs          # summarise everything captured
//   node demo/read-tap.mjs --raw    # every message, in order
//   node demo/read-tap.mjs --clear  # start a fresh capture
//
// 🔴 WHY IT EXISTS. The first real measurements off this desk were taken by
// driving a second Chrome through an extension and reading its console back one
// question at a time. Every reading cost a round trip, and a press that landed
// between two of them was simply lost. Now the presses land in a file.
//
// ⚠️ IT IS A DEV SERVER FILE AND NOTHING DEPLOYED WRITES IT. See the comment on
// `/_tap` in `demo/server.mjs`.
~~~

### half-line

Above `try { rows.push(...(JSON.parse(line).rows || [])); } catch { /* still arriving *`..., lines 41 to 43 before the cut.

~~~js
// ⚠️ A HALF WRITTEN LINE IS NORMAL AND IS NOT AN ERROR. The page appends while
// this runs, so the last line can be incomplete. Skipping it loses one batch
// and reading it would throw away the whole capture.
~~~

### verdicts

Above `console.log('');`, lines 83 to 86 before the cut.

~~~js
// 🔴 THE VERDICTS GO UNDER THE TABLE, NOT IN A COLUMN. A verdict carries its
// reasoning and its counts, and this project already has a rule that anything
// truncating with an ellipsis is in the wrong place rather than in need of a
// wider box.
~~~

## `demo/server.mjs`

### server

Above `import { createServer } from 'node:http';`, lines 1 to 7 before the cut.

~~~js
// demo/server.mjs — static files for every demo. Port 8890.
//
//   node demo/server.mjs   ->  http://127.0.0.1:8890/demo/
//
// Serves the REPO ROOT so `/timeline/*.mjs` resolves from any page: the demos
// import the shipped library, never a copy. Exists only because a browser will
// not load ES modules from a file:// path.
~~~

### font-types

Above `'.woff2': 'font/woff2',`, lines 29 to 33 before the cut.

~~~js
// ⚠️ A FONT IS SERVED BY THIS TOO, and the deploy's static assets set the type
// from the extension by themselves — so a missing entry here shows up ONLY on
// the dev server and only as a browser being fussy, which is the shape of bug
// that gets blamed on the page. (`.glb` is absent on purpose: the controller
// models have always been served as octet-stream and browsers do not check.)
~~~

### media-types

Above `'.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',`, lines 35 to 44 before the cut.

~~~js
/**
 * 🔴 MEDIA, ADDED 2026-09-18. `/stage/`'s film was served from here as
 * `application/octet-stream`, which is the bug the comment above predicts: the
 * deploy sets the type from the extension by itself, so a missing entry is
 * invisible until somebody develops against this server, and then it looks
 * like a browser being fussy about a page.
 * ⚠️ IT IS NOT CREDITED WITH A FIX. The stall that led here was a HIDDEN TAB
 * deferring media, not the content type, and the honest claim for this line is
 * the narrow one: serving an mp4 as a byte stream is wrong on its own terms.
 */
~~~

### port

Above `const EXTRA = new Map((await import('./manifest.mjs')).extraPages().map(([src, d`..., lines 48 to 57 before the cut.

~~~js
/**
 * ⚠️ IF THE PORT IS TAKEN, TAKE THE NEXT ONE.
 *
 * A dev server left running on 8890 made every `node demo/verify.mjs` die with
 * an unhandled EADDRINUSE — three times in one session, each time reading as a
 * broken harness rather than as a port that was busy. The harness does not care
 * which port it gets; it only cares that it has one. Callers that need to know
 * read `server.address().port`, and `serve()` logs when it had to move.
 */
/** Pages the deploy copies in from outside demo/, by their served path. */
~~~

### dev-routes

Above `if (rel === '_log' && req.method === 'POST') {`, lines 82 to 136 before the cut.

~~~js
// ── /err-img — the same route the deployed Worker serves ───────────────
//
// 🔴 LOCAL == DEPLOYED IS A RULE, NOT AN ASPIRATION, and this is where it
// bit. `/floor/` asks its OWN ORIGIN for archive thumbnails because the
// archive's image hosts send no `access-control-allow-origin` and a texture
// upload may not read a cross-origin image. That route lives in
// `workers/view/src/index.js` — so on the deploy the floor fills, and here
// every request 404'd, every tile marked its picture dead, and the page drew
// an empty rectangle while its checks all passed. A page that only works
// deployed is a page nobody can develop.
//
// ⚠️ THE VALIDATION IS THE SAME SHAPE ON PURPOSE. If this one were looser,
// a path that works here would be refused in production — which is the same
// class of bug as the 404, wearing the opposite costume.
/**
 * ── /_tap — what a plugged-in instrument sent, written where a session can
 * read it ──────────────────────────────────────────────────────────────
 *
 * 🔴 WHY THIS EXISTS. `/dump/` reads MIDI in a browser, and a browser is
 * somewhere a person is sitting rather than somewhere a session can look.
 * Getting four measurements off a real desk on 2026-09-20 meant driving a
 * second Chrome through an extension and reading its console back one
 * question at a time, which the person at the desk called ridiculous and
 * was right about: every reading cost a round trip, and a press that landed
 * between two of them was simply lost.
 *
 * ⚠️ IT IS THE DEV SERVER ONLY AND IT MUST STAY THAT WAY. There is no such
 * route in `workers/view/src/index.js`, deliberately, so a deployed
 * `/dump/` posts nowhere and a visitor's instrument is never written to
 * anybody's disk. That breaks this project's own LOCAL == DEPLOYED rule on
 * purpose, and the reason is that the rule exists so a page cannot work in
 * one place and fail in the other. **This is not a page feature.** It is a
 * wire between a desk and a session, and the page works identically with
 * nobody listening.
 *
 * ⚠️ APPEND, NEVER REPLACE. A capture is a recording of something that
 * happened once and cannot be repeated by asking again, which is exactly
 * the property that made the round trips expensive.
 */
/**
 * ── /_log — what a page SAID, written where a session can read it ────────
 *
 * 🔴 IT IS `/_tap` ONE STEP ALONG AND IT EXISTS FOR THE SAME REASON. Asked
 * for 2026-09-21: *"build a way to get the logs and debug (like you did with
 * tap)"*, after an afternoon in which every question about what a page was
 * doing was answered by the owner taking a screenshot and me reading it.
 * A log line is on somebody's screen; this puts it in a file.
 * ⚠️ DEV SERVER ONLY, EXACTLY LIKE `/_tap`. There is no such route in
 * `workers/view/src/index.js` and there must never be one, so a deployed
 * page posts nowhere and nobody's log is written to anybody's disk. The
 * page behaves identically with nothing listening, which is what keeps
 * LOCAL == DEPLOYED true where it matters.
 * ⚠️ AND IT IS PER PAGE, because two pages open at once is the normal state
 * of this project and one interleaved file would be unreadable.
 */
~~~

### concepts

Above `if (rel === 'concepts' || rel === 'concepts/') {`, lines 210 to 212 before the cut.

~~~js
// /concepts/ forwards to the front page, as workers/view/src/index.js does on
// the deploy (2026-10-13, the concepts index IS the front page). Only the
// index: an old /concepts/<group>/<number>/ page is a 404 on both ends.
~~~

### local-deployed

Above `if (EXTRA.has(rel)) rel = EXTRA.get(rel);`, lines 227 to 238 before the cut.

~~~js
// LOCAL == DEPLOYED. On the worker, demo/<x> is served at /<x>, so a page
// asking for /shell/shell.css or /llhls/ must resolve here too — try the
// repo root first, then inside demo/.
//
// Some pages are under neither root: the build copies them in from
// elsewhere (the box's listener from rig/, the component sandbox). They
// declare their own `src` in demo/manifest.mjs and BOTH ends read it, so
// this rewrite and the build's copy list cannot disagree.
//
// ⚠️ Mapped rather than served out of workers/view/public/, which is BUILD
// OUTPUT — serving that would test a copy and read green on a page the
// build had not refreshed.
~~~

### boot-line

Above `const s = await serve();`, lines 269 to 275 before the cut.

~~~js
/* 🔴 THE LINE A READER CLICKS HAS TO BE THE PORT IT GOT, NOT THE PORT IT
   ASKED FOR. MEASURED 2026-09-21: with 8890 already held, this printed
   `(port 8890 was busy, so this is on 8893)` on stderr and then
   `demo server http://127.0.0.1:8890/demo/` on stdout, so the two lines
   disagreed and the one that looks like the answer was the wrong one. The
   harnesses already read `server.address().port` back for exactly this
   reason, and the boot line was the one place still trusting the constant. */
~~~

## `demo/shot.mjs`

### shot

Above `import { writeFile, mkdir } from 'node:fs/promises';`, lines 1 to 46 before the cut.

~~~js
// demo/shot.mjs — LOOK AT A PAGE AT A WIDTH. One command, one picture per width.
//
//   node demo/shot.mjs kit                      # 375, 768 and 1280: an iPhone mini, an iPad, the desk
//   node demo/shot.mjs kit 375                  # just the phone
//   node demo/shot.mjs kit --hash instrument-panel
//   node demo/shot.mjs kit --base https://positron.studio
//   node demo/shot.mjs kit --clip 2400          # stop the capture 2400 px down
//   node demo/shot.mjs station --query base=http://127.0.0.1:8799   # a page's own query, e.g. a local worker
//
// 🔴 IT EXISTS BECAUSE THIS PROJECT CANNOT SEE ITS OWN PHONE LAYOUTS, AND THAT
// IS WRITTEN DOWN IN THREE PLACES AS A KNOWN HOLE RATHER THAN AS A THING
// ANYBODY FIXED. `positron-ui`: *"demo/verify.mjs runs at 756 px with no
// viewport override, so EVERY assert on a page passes without ever entering its
// media query"*. `shell.css`: `.pos-pick`'s entire phone arrangement sat dead
// for weeks with every line of it correct. `local-remote.mjs` decides its
// arrangement in JavaScript instead of in CSS, and says in its own header that
// it does so because no harness here can enter a media query.
//
// 🔴 **AND IT EXISTS BECAUSE THE OBVIOUS WAYS DO NOT WORK. MEASURED 2026-09-26.**
// Resizing the browser window through the extension reported `Successfully
// resized window to 400x860` and the page rendered at **1429 px** anyway, so
// the one thing that looked like it would answer this question answers it
// wrongly and says nothing. `--window-size` on a headless launch has the same
// weakness: it is the OS window, not the viewport the page lays out in, and it
// does not set `devicePixelRatio` or the mobile flag at all.
//
// ✅ **`Emulation.setDeviceMetricsOverride` IS THE ONE THAT IS REAL.** It sets
// the layout viewport the page actually uses, so `@media (max-width: 560px)`
// enters, `@container` resolves against a real box, `100vw` is the phone's, and
// `window.innerWidth` agrees with all of them until something overflows, and
// then it does not (see the overflow line below). `mobile: true` also makes the
// page honour `<meta name=viewport>` the way a phone does, which is the
// difference between a narrow desktop and a phone and is exactly where this
// project's layouts break.
//
// ⚠️ **A SHOT IS A LOOK, NOT A GRADE, AND IT DOES NOT ASK FOR A SELF-CHECK.**
// `?selfcheck=1` is the harness's business. A picture taken with the checks
// running is a picture of a page doing extra work, and this project's standing
// rule is that a self-check never runs for a visitor. What a shot shows is what
// a visitor sees.
//
// ⚠️ **AND IT OPENS NOTHING BY ITSELF.** It takes a slug and visits that page
// once per width, which is the same traffic a person opening the page three
// times would make. It is NOT pointed at anybody else's server: use it on
// `127.0.0.1` or on `positron.studio`, and read the rules in CLAUDE.md before
// pointing anything at an external source.
~~~

### widths

Above `const WIDTHS = [375, 768, 1280];`, lines 54 to 66 before the cut.

~~~js
/**
 * 🔴 THREE WIDTHS, AND THEY ARE MEASUREMENTS OF REAL SCREENS RATHER THAN ROUND
 * NUMBERS. **The phone is an iPhone mini: 375 by 812 CSS px at 3x.** Instructed
 * 2026-09-26: *"use iphone mini size for mob testing"*. It is the narrowest
 * current iPhone, so a layout that fits it fits every iPhone, and it is narrower
 * than the 390 this file shipped with, which is the 12 through 16 and which the
 * first six shots were taken at. 768 is an iPad portrait, where a two column
 * layout has to decide what it is. 1280 is the desk.
 * ⚠️ **AND 375 IS NOT THE NARROWEST THING THAT EXISTS.** 360 is, an ordinary
 * Android, and `shell.css` records a defect that showed at exactly that width.
 * This file takes any width as an argument so a report can be reproduced at the
 * width it was reported at rather than at the nearest one this list has.
 */
~~~

### flag-values

Above `const bare = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').s`..., lines 76 to 77 before the cut.

~~~js
// ⚠️ A NUMBER AFTER A FLAG IS THAT FLAG'S VALUE, NOT A WIDTH. The first run of
// this file took `--clip 2600` as a fourth width and shot the page at 2600 px.
~~~

### muted

Above `const browser = await launchChrome({ prefix: 'positron-shot', args: ['--disable-`..., lines 97 to 98 before the cut.

~~~js
// ⚠️ MUTED AND WITHOUT AN AUTOPLAY GESTURE, because a shot must not start a
// sound on somebody's desk and must not be a page that has begun playing.
~~~

### mobile

Above `const mobile = w <= 560;`, lines 110 to 122 before the cut.

~~~js
/**
 * 🔴 `mobile` IS DERIVED FROM THE WIDTH AND IS NOT A SEPARATE ARGUMENT,
 * because the question a narrow shot answers is *what does a phone see*, and
 * a phone is not a small desktop: it honours `<meta name=viewport>`, it has a
 * visual viewport that can differ from the layout one, and it reports touch.
 * A narrow window on a desk is a different rendering and has never been the
 * thing being asked about.
 * ⚠️ **AND `deviceScaleFactor` IS 3 ON THE PHONE, THE MINI'S OWN**, so a
 * hairline seam is captured at the density it is actually drawn at. A 1 px
 * line on a 1x shot of a 3x screen is the one thing a picture cannot show
 * honestly, and the line-width snapping rule is different at 3 (exact) from
 * 1.5 (rounds down), so the density is part of the measurement.
 */
~~~

### touch-points

Above `await S('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouch`..., lines 127 to 129 before the cut.

~~~js
// ⚠️ `maxTouchPoints` ONLY WHEN ENABLING. CDP refuses 0 with "Touch points must
// be between 1 and 16", so a desktop pass that sends it dies after the phone
// pass succeeded. MEASURED on the first run of this file.
~~~

### hash-again

Above `await S('Runtime.evaluate', {`, lines 142 to 144 before the cut.

~~~js
// ⚠️ THE HASH AGAIN AFTER THE WAIT. A tabbed page writes the opening part's
// id over the address on its first `go`, so a fragment naming a block is
// gone by the time anybody looks. `/kit/` does exactly this.
~~~

### clip-from-block

Above `const height = Math.min(CLIP || 6000, page.h - page.top);`, lines 165 to 169 before the cut.

~~~js
// with --hash the capture starts AT the block, not at the top of the page,
// and the 6000 px ceiling is counted FROM the block. It was a cap on the
// whole page's height, so a block more than 6000 px down came out as a
// NEGATIVE height (MEASURED 2026-10-05: /kit/'s SLIDES blocks at -348 to
// -8453 px). With no hash the top is 0 and nothing changes.
~~~

### nested-slug

Above `const file = join(OUT, '${slug.replace(/\//g, '-')}-${w}${HASH ? '-${HASH}' : ''`..., lines 176 to 177 before the cut.

~~~js
// ⚠️ A NESTED SLUG IS ONE FILE NAME, 2026-10-06: `kit/input` would write into
// a `kit/` directory under OUT that does not exist (plans/plan-kit-split.md 2.3).
~~~

### overflow

Above `console.log('  ${String(w).padStart(4)} px  ${page.overflow ? '⚠ ${page.overflow`..., lines 182 to 190 before the cut.

~~~js
/**
 * 🔴 SIDEWAYS OVERFLOW IS PRINTED WITH EVERY SHOT, BECAUSE IT IS THE ONE
 * PHONE DEFECT A PICTURE CANNOT SHOW. A document that is wider than the
 * screen looks perfectly normal in a capture clipped to the screen's width,
 * and the reader only finds out by dragging. This repository has measured
 * **141 px of page overflow** from `tabs.mjs` and **65 px** from a pad grid,
 * both at 390, and both times the page looked fine in every screenshot
 * anybody took of it.
 */
~~~

## `demo/verify-gl.mjs`

### verify-gl

Above `import { serve } from './server.mjs';`, lines 1 to 44 before the cut.

~~~js
// demo/verify-gl.mjs — THE HARNESS THAT CAN SEE A GPU.
//
//   node demo/verify-gl.mjs              every demo that declares `gl: true`
//   node demo/verify-gl.mjs mirror       just this one
//
// ⚠️ WHY THIS EXISTS AT ALL, AND WHY IT IS A SEPARATE FILE.
//
// `verify.mjs` launches Chrome with `--disable-gpu`, and under that flag
// `canvas.getContext('webgl2')` returns **null** — not slow, absent. Measured
// on this machine, with verify.mjs's own flags:
//
//     webgl2 = false,  error = "no webgl2"
//
// So every assert in a visual demo would be unreachable, and per CLAUDE.md a
// page whose first assert sits behind that reports "asserted nothing" — which
// reads as broken — or asserts its own fallback and reads as fine. That is this
// project's most expensive recurring failure: 261/261 while a demo was fatally
// broken on iPhone; 291 asserts across three pages that had never played a
// frame of HLS. Visuals would reproduce it exactly.
//
// ⚠️ AND THE OBVIOUS FIX IS WORSE THAN THE BUG. Adding
// `--enable-unsafe-swiftshader` turns the suite green against a CPU rasteriser.
// Measured, same shader, same page:
//
//     --disable-gpu                      no context at all
//     --enable-unsafe-swiftshader        SwiftShader   170.7 Mpix/s
//     GPU allowed                        ANGLE Metal  1392.1 Mpix/s
//     (and the real Raspberry Pi GPU, §3.4)              50.3 Mpix/s
//
// The CPU rasteriser on a laptop is **3.4x faster than the real Pi GPU** and
// **8.2x slower than the real laptop GPU**. A harness "fixed" that way prints
// plausible numbers about a machine that does not exist: it would pass a page
// that crawls on a phone and fail one that flies on a laptop. So this file
// REFUSES to grade a run on a software rasteriser, and that refusal is the
// first assert — the same rule as the BUILD stamp, for the same reason.
// Without it every number below is unattributable.
//
// ⚠️ A GOLDEN IMAGE CANNOT BE THE ANSWER EITHER. The same shader with identical
// fixed inputs summed 48,147,330 of red on ANGLE Metal and 68,001,881 on
// SwiftShader — a 41% difference — because `fract(sin(dot(p,k)) * 43758.5453)`,
// the standard GLSL hash, amplifies last-bit float differences into unrelated
// noise. So "the picture is right" is asserted STRUCTURALLY by the page (it
// drew, it moved, it is not a flat field), never by comparing pixels across
// machines.
~~~

### gl-bound-port

Above `const BASE = process.env.DEMO_BASE || 'http://127.0.0.1:${server.address().port}`..., lines 56 to 57 before the cut.

~~~js
// The port ACTUALLY bound, which may not be the one asked for — see
// serve()'s comment about a dev server already holding it.
~~~

### gl-targets

Above `const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));`, lines 61 to 64 before the cut.

~~~js
// ⚠️ THE TARGET LIST IS CHECKED AFTER THE RENDERER, NOT BEFORE IT. Exiting
// early on "no visual demos yet" meant this file could not answer the question
// it exists for — CAN this machine grade a picture — and it read `0 green` on a
// box with no GPU at all, which is the same thing it reads on a box with one.
~~~

### gl-tiers

Above `const DEEP = process.env.DEMO_DEEP === '1' || process.argv.includes('--deep');`, lines 66 to 70 before the cut.

~~~js
// 🔴 TWO TIERS, the same switch `verify.mjs` reads (demo/shell/selfcheck.mjs):
// `DEMO_DEEP=1` or `--deep` asks for `selfcheck=2` and waits the full
// `settleMs`; an ordinary run asks for `selfcheck=1` and waits `lightSettleMs`
// where a page declares one. `--deep` is a tier, not a slug, and the filter on
// the line above already keeps it out of `want`.
~~~

### gl-videoradio

Above `const standIn = new Map();`, lines 78 to 87 before the cut.

~~~js
// 🔴 `videoradio` ROTATES ERR MOUNTS, SO IT GETS THE STAND-IN `verify.mjs`
// GIVES `/archive/radio/`, STARTED HERE RATHER THAN REMEMBERED. Every connection this
// repository opens to an ERR mount is counted in a public broadcaster's
// listener statistics (CLAUDE.md), and until 2026-10-04 `node
// demo/verify-gl.mjs videoradio` opened four of them. `demo/fake-station.mjs`
// answers any mount name with real MP3 frames and ICY headers, and the page
// takes `?base=` exactly as `/archive/radio/` does. ⚠️ `DEMO_QUERY=base=...` still wins
// (it is first in the query, and `URLSearchParams.get` returns the first), and
// a stand-in on 127.0.0.1 cannot be reached from a `DEMO_BASE` deploy, so none
// is started then.
~~~

### gl-no-disable-gpu

Above `const browser = await launchChrome({`, lines 102 to 104 before the cut.

~~~js
// ⚠️ NO `--disable-gpu`, AND NO SWIFTSHADER FLAG. The point of this file is the
// real device. `--headless=new` does use the GPU where one is available, which
// is why the renderer is asserted rather than assumed.
~~~

### gl-renderer

Above `await S('Page.navigate', { url: '${BASE}/' });`, lines 124 to 126 before the cut.

~~~js
// ── THE FIRST ASSERT, BEFORE ANY PAGE ────────────────────────────────────────
// Which renderer this run got. Everything after it is a claim about that
// renderer and nothing else, so it is established once, loudly, up front.
~~~

### gl-refuse

Above `console.log('\n  ⚠ REFUSING TO GRADE ANYTHING ELSE.');`, lines 158 to 160 before the cut.

~~~js
// ⚠️ REFUSE, do not carry on. A run graded on SwiftShader is a run about a
// machine nobody has. Reporting it as a pass is the failure this file exists
// to prevent, and reporting it as "1 failure among 40 passes" buries it.
~~~

### gl-selfcheck

Above `const q = [process.env.DEMO_QUERY, DEEP ? 'selfcheck=2' : 'selfcheck=1',`, lines 181 to 189 before the cut.

~~~js
// 🔴 `selfcheck=1`, THE SAME FLAG `verify.mjs` APPENDS, AND THIS FILE DID NOT.
// A self-check never runs for a visitor, so a page reads that flag and keeps
// anything that opens a file, makes a sound, presses a control or moves the
// picture behind it. Every gl demo was left out of that: `videoradio` already
// carried the gate and said so in its own comment — *"verify-gl.mjs appends no
// query of its own, which is a harness to fix rather than a reason to work a
// visitor's controls"* — and the gate meant its checks ran nowhere at all.
// ⚠️ AFTER `DEMO_QUERY`, because `URLSearchParams.get` returns the first
// occurrence and an override has to win, which is how verify.mjs orders it.
~~~

### gl-page-renderer

Above `const said = await evalIn('window.__demo?.gl?.renderer ?? null');`, lines 196 to 199 before the cut.

~~~js
// The page must report its own renderer, always — a visitor on a software
// rasteriser is a real visitor and the page should say so rather than quietly
// being slow. And it must AGREE with what this harness found, or one of them
// is describing a different context.
~~~

### gl-controls

Above `const SEL = ''.pos-controls button'';`, lines 207 to 216 before the cut.

~~~js
// Press every control, in order — the same contract as verify.mjs, and for
// the same stated reason: a control the harness cannot press is a subject the
// suite cannot reach.
// 🔴 AND A PAGE WHOSE ONLY CONTROL IS ITS TRANSPORT BAR'S PLAY GETS THAT
// PRESSED, AS `verify.mjs`'s drill does. `/videoradio/` moved its play onto
// `createTransportBar` and its row went empty, so this loop pressed nothing,
// the page sat at *"Press play."*, and every one of its checks went unrun
// behind `the page asserted something  2`, which is the shell's two. MEASURED
// 2026-10-04: 7/7 green with no page check run. Only when the row is empty,
// so a page that has controls is pressed exactly as before.
~~~

### gl-no-controls

Above `for (let i = 0; i < 60; i++) {`, lines 229 to 233 before the cut.

~~~js
// ⚠️ AND A PAGE WITH NO CONTROLS MUST STILL BE WAITED FOR. `mirror` starts
// itself and runs its own checks, so there is nothing to press — pressing
// zero buttons and reading immediately would report "asserted nothing" about
// a page that was mid-check. Wait for `ready`, bounded, then read whatever is
// there and let the count speak.
~~~

### gl-never-ready

Above `if (!(await evalIn('!!window.__demo?.ready'))) {`, lines 238 to 241 before the cut.

~~~js
// ⚠️ A PAGE THAT NEVER SAID READY IS SAID SO, WITH ITS OWN LAST WORDS, because
// `the page asserted something  2` alone cannot tell a slow check from a hung
// one, and `verify.mjs` learned that on 2026-09-22. Printed, never asserted,
// so no page's total moves with it.
~~~

### gl-records

Above `for (const a of list) ok('page: ${a.label}', a.pass, a.detail ?? '');`, lines 249 to 249 before the cut.

~~~js
// The shell's assert records are {label, pass, detail} — not {name, ok}.
~~~

## `demo/verify-native.mjs`

### native

Above `import { serve } from './server.mjs';`, lines 1 to 30 before the cut.

~~~js
// demo/verify-native.mjs — exercise the NATIVE-HLS branch of the player.
//
//   node demo/verify-native.mjs       # exits 1 on any scope/init error
//   DEMO_BASE=https://positron.studio node demo/verify-native.mjs
//
// It starts its own server. It used to require `node demo/server.mjs &` on
// :8890 and then hardcode that number — which stopped being true the moment
// `serve()` learned to take the next free port, because then the URL points at
// whatever else is on 8890, or at nothing.
//
// WHY THIS EXISTS. demo/verify.mjs reported 261/261 green while 06 was
// completely broken on an iPhone: the native branch threw "Cannot access
// 'lastAdvT' before initialization" on every tick and the page showed nothing.
// The suite could not see it, because desktop Chrome resolves useNative to
// false and never enters that branch — so a whole code path had zero coverage
// while appearing fully tested.
//
// Chrome cannot PLAY native HLS (canPlayType returns ''), so ?player=native
// forces the branch and playback does not work. That is fine and deliberate:
// what is asserted here is "this path runs without throwing", not "video
// plays". A TDZ, a typo or a missing hoist all surface anyway.
//
// Run it after ANY change to src/low-latency-player.js. The iPhone takes a path
// the main suite cannot reach.
// Chrome cannot PLAY native HLS, so playback will not work — but the branch
// still executes, and executing it is what catches a TDZ or a typo. This is the
// gap that let "Cannot access 'lastAdvT' before initialization" reach a phone:
// verify only ever ran the hls.js path, because desktop Chrome never picks
// native. What is asserted here is "the code path runs without throwing", not
// "video plays".
~~~

### retired

Above `if (!process.argv.includes('--anyway')) {`, lines 34 to 41 before the cut.

~~~js
// 🔴 RETIRED 2026-10-13, AND IT WOULD NOW PASS ABOUT NOTHING. This harness
// drives /llhls/, whose live input (positron-demo) and publisher (pub's /watch)
// were deleted that day. /llhls/ now answers a press with "this leg was retired
// 2026-10-13" and builds no player, so the native branch of
// src/low-latency-player.js never runs and a run here would read PASS with zero
// coverage. It refuses instead. The player's one live caller left is
// /video/llhls/ (LL-HLS loopback, a camera on its own input), which this
// file does not drive; re-pointing it there is open in BACKLOG.md.
~~~

## `demo/verify-quest.mjs`

### quest

Above `import { spawn, spawnSync } from 'node:child_process';`, lines 1 to 99 before the cut.

~~~js
// demo/verify-quest.mjs — drives the META QUEST BROWSER on a real headset,
// over adb + CDP, the way demo/verify.mjs drives desktop Chrome.
//
//   node demo/verify-quest.mjs                # every built demo tagged `WebXR`
//                                             # in demo/manifest.mjs — the tag
//                                             # IS the list; there is no second one
//   node demo/verify-quest.mjs weight         # just this one, by slug
//   node demo/verify-quest.mjs --all          # every built demo, on the headset
//   node demo/verify-quest.mjs --self-test    # the negative control; NO DEVICE NEEDED
//   DEMO_BASE=https://positron.studio node demo/verify-quest.mjs
//
// It skips cleanly — exit 0, with instructions — when there is no `adb` and
// when no device is attached. A check nobody can run is a check nobody runs.
//
// ⚠️ WHY THIS EXISTS. `verify.mjs` runs desktop Chrome. Measured on this Mac
// 2026-09-11, Chrome 152 headless, on a secure `http://127.0.0.1:<port>` origin:
//
//     navigator.xr                       present, a NATIVE XRSystem
//     isSessionSupported('inline')       true
//     isSessionSupported('immersive-vr') FALSE
//     isSessionSupported('immersive-ar') FALSE
//     (and on a fresh about:blank target, isSecureContext is false and
//      navigator.xr is absent entirely — so WHERE you ask changes the answer)
//
// So a headset demo's immersive branch is unreachable there, and per CLAUDE.md a
// page whose first assert sits behind that reports "asserted nothing" — which
// reads as broken — or asserts its own fallback and reads as fine. That is this
// project's most expensive recurring failure: 261/261 green while a demo was
// fatally broken on iPhone; 291 asserts across three pages that had never played
// a frame of HLS. XR would reproduce it exactly.
//
// ⚠️ AND THE CHEAP FIX IS THE SAME TRAP IN A NEW ACCENT. Meta ships the
// Immersive Web Emulator (a Chrome extension, and the runtime behind their MCP
// tooling) and says its coverage is "on par with the WebXR support in the Meta
// Quest Browser". That is a marketing claim, not a measurement — it is "desktop
// Chrome covers the iPhone path" with a different logo. The emulator supplies a
// FAKE XR device: no compositor, no real reprojection, no real frame budget, no
// real hand tracking. A suite graded on it is green about a machine nobody
// wears. So the first thing this file does is refuse to grade anything until it
// has established, four independent ways, that it is talking to real hardware
// — exactly the shape of verify-gl.mjs's SwiftShader refusal, for the same
// reason: without it every number below is unattributable.
//
// HOW IT SEPARATES A HEADSET FROM THE EMULATOR — four channels, two of them
// outside the browser entirely. ⚠️ THE TWO IN-PAGE ONES EACH CATCH EXACTLY WHAT
// THE OTHER CANNOT, which is why neither is used alone:
//
//   1. DEVICE IDENTITY, read over adb with `getprop`. A Chrome extension on a
//      laptop cannot put an Oculus/Meta hardware identity on the far end of an
//      adb connection. This is the far side of the boundary, and it is the one
//      that cannot be faked from page script. (CLAUDE.md: "a count is only
//      evidence on the far side of the boundary".)
//   2. THE XR OBJECT IS NATIVE, not a polyfill. Every method on `navigator.xr`'s
//      prototype must stringify as `[native code]`, `navigator` must not own the
//      property, and it must be an accessor on `Navigator.prototype`. IWER
//      installs a JavaScript XRSystem; JavaScript methods stringify to their
//      source. → catches a FAKE DEVICE. Passed by any real browser, headset or
//      not, so it cannot say "headset" on its own.
//   3. `isSessionSupported('immersive-vr')` IS TRUE. → catches a REAL BROWSER
//      WITH NO HEADSET (desktop Chrome answers false, measured above). Defeated
//      by a fake device, which answers true to everything — which is the whole
//      reason 2 exists. Neither gate is sufficient; together they are.
//   4. THE COMPOSITOR, via `adb logcat -s VrApi`, which prints `FPS=` and
//      `Stale=` once a second from OUTSIDE the page while a session presents.
//      An emulator has no compositor to print them.
//
// ⚠️ 2 AND 3 WERE ONE CHECK IN THE FIRST DRAFT, AND THAT WAS THE BUG THIS FILE
// IS ABOUT. "Is it a headset" was being answered by "is the XR object real",
// which is a question next to it and not it — CLAUDE.md's first rule. The
// negative control below is what caught it, on a machine with no headset in the
// building, which is the only reason it is not still in here.
//
// What it deliberately does NOT claim: **which Quest this is.** §1.7 of
// research/quest-xr-2026-09.md measured that a Quest 3S reports the user-agent
// device token `Quest 3`, same as a Quest 3 and same as the Xbox Edition. The
// model is PRINTED, from `getprop`, and never asserted on — and no line here
// says "Quest 3" on the strength of a user agent.
//
// Five adaptations somebody else already paid for (research §3.3):
//   · Do not create a tab. Quest Browser keeps launched intents around
//     aggressively; belowjs's harness refuses to add tabs. This attaches to an
//     EXISTING page target and navigates it.
//   · `Page.bringToFront` before anything XR — WebXR needs the page visible.
//   · `Runtime.evaluate` with `userGesture: true` for every control press;
//     `immersive-vr` needs a transient user activation.
//   · `Page.captureScreenshot` cannot see the immersive view, only the 2D panel.
//     Nothing here looks at ink, so that costs us nothing.
//   · The devtools socket name is NOT stable — three are in the wild. Discover
//     it from /proc/net/unix; never hard-code it.
//
// NOT DONE ON PURPOSE: Meta's Scriptable Testing Services can hold the device
// awake for an unattended run
// (`adb shell content call --uri content://com.oculus.rc --method SET_PROPERTY
// --extra … disable_autosleep`). Leaving that on drains the battery and risks
// burn-in — Meta says so. If you want it, set it by hand and restore it by
// hand; a harness that can crash is the wrong owner for that flag.
//
// Raw CDP over node's global WebSocket, no deps — house harness style, same as
// verify.mjs.
~~~

### quest-port

Above `const HTTP_PORT = 8894;`, lines 108 to 110 before the cut.

~~~js
// ⚠️ NOT verify.mjs's 8890 and not verify-gl.mjs's 8892: all three may be
// running. serve() takes the next free port anyway and says so, and the port
// ACTUALLY bound is read back below — a fixed port is a shared mutable global.
~~~

### quest-tiers

Above `const DEEP = process.env.DEMO_DEEP === '1' || argv.includes('--deep');`, lines 118 to 122 before the cut.

~~~js
// 🔴 TWO TIERS, the same switch `verify.mjs` reads (demo/shell/selfcheck.mjs):
// `DEMO_DEEP=1` or `--deep` asks for `selfcheck=2` and waits the full
// `settleMs`; an ordinary run asks for `selfcheck=1` and waits `lightSettleMs`
// where a page declares one. `--deep` is a tier, not a slug: `want` above
// already drops every `--` argument.
~~~

### native-probe

Above `const NATIVE_PROBE = (prop) => '(() => {`, lines 126 to 133 before the cut.

~~~js
// ── the probe, defined ONCE ─────────────────────────────────────────────────
// Parameterised over the property name so the self-test below can run the very
// same source against a property whose nativeness is already known. A guard
// tested by a paraphrase of itself is not tested.
//
// It reads descriptors rather than values: touching an accessor on a prototype
// with the prototype as receiver throws "Illegal invocation" in Chromium, and a
// probe that throws reports "absent" about something that is present.
~~~

### native-verdict

Above `function nativeVerdict(p) {`, lines 164 to 174 before the cut.

~~~js
/**
 * Is this object supplied by the BROWSER, or installed by script?
 *
 * Every clause is a thing a JavaScript polyfill cannot have and a compiled-in
 * Web IDL attribute always has. `jsSourced` is the load-bearing one: IWER's
 * XRSystem is a JavaScript class, and a JavaScript method stringifies to its
 * own source.
 *
 * Returns { real, why } — `why` is printed either way, so a pass says what
 * convinced it rather than just saying yes.
 */
~~~

### headset-verdict

Above `function headsetVerdict(native, vrSupported) {`, lines 206 to 213 before the cut.

~~~js
/**
 * Is a HEADSET on the other end of this browser?
 *
 * Two gates, and `gate` names which one refused — because "the XR object is
 * fake" and "the XR object is real and there is no headset behind it" are
 * different findings with different fixes, and a single boolean collapses them
 * into one message that is wrong half the time.
 */
~~~

### self-test

Above `if (SELF_TEST) {`, lines 234 to 259 before the cut.

~~~js
// ─────────────────────────────────────────────────────────────────────────────
// THE NEGATIVE CONTROL
//
// ⚠️ PROVE A GUARD FIRES. The refusal above is the whole value of this file, and
// a refusal nobody has seen refuse is a hope. `--self-test` breaks it on purpose
// in a real browser, against the same NATIVE_PROBE source and the same
// nativeVerdict/headsetVerdict the real run uses — not a paraphrase of them.
//
//   A1  desktop Chrome's own navigator.xr   -> nativeVerdict must ACCEPT
//   A2  ...and the same browser             -> headsetVerdict must REFUSE, at
//                                              the `device` gate
//   B   an IWER-shaped JavaScript xr that
//       CLAIMS immersive-vr                 -> headsetVerdict must REFUSE, at
//                                              the `native` gate
//
// A1 is the positive control, and it is on the property actually in question
// rather than a stand-in: a guard that refuses everything would pass A2 and B
// and be worthless. A2 and B are the two halves that each catch what the other
// misses — B's fake answers `immersive-vr: true`, so gate 3 alone would wave it
// through; A2's browser is entirely genuine, so gate 2 alone would too.
//
// VERIFIED: run today, no headset in the building. The FIRST version of this
// self-test FAILED its own case A, and it was right to — the guard was asking
// "is the XR object real" where the question was "is there a headset". That is
// how these three cases came to exist in this shape.
// ─────────────────────────────────────────────────────────────────────────────
~~~

### case-a

Above `const aNative = nativeVerdict(await ev(NATIVE_PROBE('xr')));`, lines 286 to 286 before the cut.

~~~js
// ── A · a genuine browser with no headset behind it ───────────────────────
~~~

### case-b

Above `await ev('(() => {`, lines 294 to 297 before the cut.

~~~js
// ── B · an IWER-shaped injection that says all the right things ───────────
// A JavaScript XRSystem defined straight onto the navigator instance,
// answering isSessionSupported('immersive-vr') with TRUE. That last part is
// the whole point: it is a liar, and gate 3 believes it.
~~~

### real-run

Above `/** adb, with the exit status handed back rather than thrown. */`, lines 317 to 319 before the cut.

~~~js
// ─────────────────────────────────────────────────────────────────────────────
// THE REAL RUN
// ─────────────────────────────────────────────────────────────────────────────
~~~

### assert-1

Above `const props = new Map();`, lines 420 to 428 before the cut.

~~~js
// ── ASSERT 1, BEFORE ANY PAGE: is this real hardware? ───────────────────────
// Read off the DEVICE, not out of the browser. A Chrome extension on a laptop
// cannot put an Oculus hardware identity on the far end of an adb connection,
// which is the whole reason this check is here and not in page script.
//
// One `getprop` with no argument returns the entire table, so there is no
// guessing which property name this build happens to carry — a guessed name
// that is absent reads as "not a Quest", which is a broken instrument reported
// as a finding.
~~~

### model

Above `console.log('  model    ${prop('ro.product.model') || '(unset)'}   device ${prop`..., lines 449 to 453 before the cut.

~~~js
// ⚠️ PRINTED, NEVER ASSERTED ON. §1.7: a Quest 3S reports the user-agent device
// token `Quest 3`, same as a Quest 3 and same as the Xbox Edition — so nothing
// here may say which one this is on the strength of a string. `getprop` MAY be
// more specific than the user agent; that is UNCONFIRMED and it is reported raw
// either way rather than interpreted.
~~~

### quest-refuse

Above `console.log('\n  ⚠ REFUSING TO GRADE ANYTHING ELSE.');`, lines 460 to 462 before the cut.

~~~js
// ⚠️ REFUSE, do not carry on — verify-gl.mjs's rule. A run graded on
// something that is not the headset is a run about a machine nobody wears,
// and burying that as "1 failure among 40 passes" is how it gets missed.
~~~

### reverse

Above `let BASE = process.env.DEMO_BASE || null;`, lines 475 to 479 before the cut.

~~~js
// ── the local server, reversed onto the device ──────────────────────────────
// `adb reverse` binds the listener on the DEVICE's loopback, so the page's
// origin really is http://localhost:<port> — which Meta blesses explicitly:
// "Browser allows WebXR on localhost servers without a secure connection or SSL
// certificate". A LAN IP is NOT a secure context and will not run WebXR.
~~~

### sockets

Above `function findSockets() {`, lines 504 to 516 before the cut.

~~~js
// ── ASSERT 2: reach the Quest Browser's devtools socket ─────────────────────
// ⚠️ THE SOCKET NAME IS NOT STABLE. Three are in the wild:
//   com.oculus.browser_devtools_remote   Quest Browser's own
//   chrome_devtools_remote               the Android default
//   weblayer_devtools_remote_<pid>       when the system WebLayer took the URL
// IsaacTeleop forces `-p com.oculus.browser` specifically because WebLayer
// "does not fully plumb controller input sources through". So: discover the
// name, prefer the Browser's, and SAY which one was used.
//
// The grep is done here rather than on the device: BusyBox's `grep -o` is not
// the same tool everywhere, and shell quoting through `adb shell` is one more
// thing that can silently return nothing (LESSONS: a partial result that is too
// tidy is a broken collector, not a finding).
~~~

### start-browser

Above `console.log('  no devtools socket yet — starting com.oculus.browser');`, lines 531 to 532 before the cut.

~~~js
// The Browser is not running, or not running debuggable. Start it ON the page
// we want — this is also how you open a URL without wearing the headset.
~~~

### local-port

Above `let localPort = null;`, lines 554 to 556 before the cut.

~~~js
// ⚠️ AND LET THE OS CHOOSE THE LOCAL PORT. A fixed one is a shared mutable
// global: verify-gl.mjs attached to a Chrome left over from the previous run and
// reported that run's flags. `adb forward tcp:0` prints the port it took.
~~~

### build

Above `const uaLine = version['User-Agent'] || '';`, lines 577 to 580 before the cut.

~~~js
// The Browser BUILD, from the browser itself. §1.7: the token is still
// `OculusBrowser/`, there is no `MetaQuestBrowser/`, and since the re-base the
// OculusBrowser major has equalled the Chrome major — OBSERVED, never
// announced, so both are printed and neither is derived from the other.
~~~

### targets

Above `async function pageTargets() {`, lines 592 to 595 before the cut.

~~~js
// ── attach to an EXISTING page; never create one ────────────────────────────
// Quest Browser keeps launched intents around aggressively, and belowjs's
// harness refuses to add tabs for that reason. verify.mjs's
// `Target.createTarget` is exactly the wrong move here.
~~~

### quest-gesture

Above `async function ev(expr, { gesture = false } = {}) {`, lines 622 to 626 before the cut.

~~~js
// `userGesture` matters for every control press: immersive-vr needs a transient
// user activation. Our shell uses plain addEventListener('click'), so this
// should be enough on its own — ESTIMATED; IsaacTeleop needed a synthetic
// Input.dispatchMouseEvent as well, but only because React's onClick ignores
// the synthesised activation on Quest's touch-first routing.
~~~

### assert-3

Above `await S('Page.navigate', { url: '${BASE}/' });`, lines 635 to 637 before the cut.

~~~js
// ── ASSERTS 3 AND 4: a real XR object, and a real device behind it ──────────
// This runs on a page from BASE, so the origin is the one the demos will use —
// asking on about:blank would answer about a different security context.
~~~

### two-asserts

Above `ok('navigator.xr is the BROWSER\'S, not an emulator polyfill', xr.real, xr.why);`, lines 655 to 656 before the cut.

~~~js
// Two asserts, never one. They fail for different reasons and the reasons have
// different fixes — see headsetVerdict.
~~~

### vrapi

Above `const vrapi = [];                       // { t, fps, stale }`, lines 679 to 683 before the cut.

~~~js
// ── the compositor channel, from OUTSIDE the page ───────────────────────────
// `adb logcat -s VrApi` prints FPS= and Stale= once a second, from the
// compositor. That is the far side of the boundary: the page's own opinion of
// its frame rate and this number disagreeing is exactly the kind of thing this
// project exists to notice — and an emulator has no compositor to print them.
~~~

### edge-404

Above `if (/seg_\d+_part|_part_all\.mp4|\.m4s(\?|$)/.test(e.url || '') && /\b404\b/.tes`..., lines 715 to 719 before the cut.

~~~js
// A 404 on an LL-HLS PART is normal at the live edge; ERR refuses segments
// by programme rights with a 403 that reaches the page as CORS. Both are
// recorded separately and CAPPED, never ignored — silence here would hide a
// real outage as "normal churn". Same table as verify.mjs so a number means
// the same thing in both.
~~~

### which-demos

Above `const isXr = (d) => (d.tags || []).includes('WebXR');`, lines 732 to 741 before the cut.

~~~js
// ── which demos ─────────────────────────────────────────────────────────────
// ⚠️ CHECKED AFTER THE HEADSET, NOT BEFORE IT — verify-gl.mjs's rule. Exiting
// early on "no XR demos yet" would mean this file could not answer the question
// it exists for, and it would read `0 green` on a desk with no headset on it,
// which is what it reads on a desk with one.
// ⚠️ SELECTED BY THE MANIFEST'S OWN `tags`, NOT BY A SECOND LIST. manifest.mjs
// already says `tags — the tech it actually uses; demo/shell/caps.mjs reads
// REQUIREMENTS off these, so there is no second needs: list to forget`. A
// `quest: true` flag alongside it would be exactly that second list, and this
// repo has already paid for keeping one identity in five places.
~~~

### quest-selfcheck

Above `const q = [process.env.DEMO_QUERY, DEEP ? 'selfcheck=2' : 'selfcheck=1'].filter(`..., lines 764 to 767 before the cut.

~~~js
// `selfcheck=1` for the same reason verify.mjs appends it: a page keeps
// anything that opens a file, makes a sound, presses a control or moves the
// picture behind that flag, so a harness that does not set it grades a page
// with its checks switched off. ⚠️ DEMO_QUERY goes first, so an override wins.
~~~

### quest-readout

Above `ok(meta.readoutOptOut ? 'declares that it has no readout, on purpose' : 'declare`..., lines 786 to 793 before the cut.

~~~js
// ⚠️ THE SAME OPT-OUT `demo/verify.mjs` HAS, AND THIS FILE DID NOT GROW IT.
// A page may declare that it has nothing to put in a readout, and it says so
// with `readout: null` rather than by omitting the field, so "this page's
// subject is visible rather than numeric" cannot be confused with somebody
// forgetting. `verify.mjs` has read that flag since `/typist/` shipped; this
// harness went on asserting a readout, so `/floor/` dropping its four cells
// on 2026-09-19 would have taken this file red on a page where nothing is
// wrong. Two harnesses grading one rule two ways is the defect, not the page.
~~~

### quest-controls

Above `const SEL = '.pos-controls button, .tbar-x';`, lines 798 to 802 before the cut.

~~~js
// Every control, in order, WITH A USER GESTURE — a multi-step demo does not
// put its asserts behind the first button, and an XR demo cannot enter a
// session without an activation. `.tbar-x` too: a page may put a control
// inside the transport bar, and a control the harness cannot press is a
// subject the suite cannot reach.
~~~

### quest-first-assert

Above `const FIRST_ASSERT_CEIL = 30000;`, lines 811 to 814 before the cut.

~~~js
// ⚠️ ZERO NEVER GROWS. Wait while the count is still 0 (a demo whose FIRST
// assert sits behind work would otherwise report "asserted nothing", which
// reads as broken rather than slow), then fall back to "stop when it stops
// growing". Capped separately from settleMs, which sizes control 0.
~~~

### page-xr

Above `const pageXr = await ev('window.__demo && window.__demo.xr ? __demo.xr : null');`, lines 827 to 836 before the cut.

~~~js
// ── the compositor, for a page that says it presented ────────────────────
// ⚠️ A LANE WITH NOTHING TO SAY MUST SAY SO IN WORDS. A page that does not
// publish `__demo.xr` gets a sentence, not a zero: a blank cell collapses "we
// did not look" and "we looked and it was fine", and a zero here would look
// like a dropped-frame finding.
//
// FORWARD CONTRACT for an XR demo: publish
//   __demo.xr = { presenting: <bool>, mode: 'immersive-vr', frames: <n> }
// and this reads it. `frames` is the PAGE's count; `vrapi` below is the
// compositor's. They are meant to be compared, not averaged.
~~~

### quest-free-port

Above `function freePort() {`, lines 905 to 906 before the cut.

~~~js
/** A port the OS picked, released immediately. Only used where `tcp:0` was not
 *  honoured — there is a race here, and it is still better than a constant. */
~~~

### unconfirmed

Above `(end of file)`, lines 918 to 958 before the cut.

~~~js
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS UNCONFIRMED IN THIS FILE, because no headset was attached when it was
// written (2026-09-11). Everything below is reasoned or read out of
// research/quest-xr-2026-09.md, and NONE of it has been run against hardware:
//
//   · that a real Quest Browser's `navigator.xr` reads native by the test in
//     nativeVerdict(). It was verified against desktop Chrome 152's OWN native
//     XRSystem — the same class, on a secure origin — which is as close as this
//     gets without hardware. Quest Browser is Chromium and builds Web IDL
//     attributes the same way, but that is an argument, not a measurement. If a
//     genuine headset is REFUSED at the `native` gate, this line is why.
//   · that the Immersive Web Emulator's injection is caught. The self-test
//     catches an IWER-SHAPED stub written here; the real extension was never
//     installed and run against it. If IWER ever shadows `toString`, the
//     `native` gate is defeated and the adb `getprop` gate is what is left —
//     which is the reason that one is first and is read off the device.
//   · that `isSessionSupported('immersive-vr')` is true on a Quest whose wearer
//     has taken it off. §1.8 says a doff does not end or hide a session, so it
//     probably is — but nothing here depends on it, and the refusal message says
//     what to check rather than asserting a cause.
//   · `adb reverse tcp:0` printing the allocated device port. Documented for
//     `adb forward`; assumed for `reverse`, with a fallback either way.
//   · the exact `getprop` keys on Horizon OS. Nothing depends on one key — the
//     whole table is read and the test is "any ro.oculus/ro.vros property, or
//     an Oculus/Meta manufacturer, or com.oculus.browser installed".
//   · whether `getprop ro.product.model` distinguishes a 3 from a 3S. The user
//     agent does not (§1.7, measured). The model is printed raw and never
//     interpreted, so this cannot become a wrong claim.
//   · `adb logcat -s VrApi` line format. `FPS=` and `Stale=` are what §3.3
//     records; the parser takes them anywhere in the line and reports "no way
//     to check" rather than 0 when it finds none.
//   · that `userGesture: true` alone grants activation for `requestSession`.
//     Enough for belowjs; IsaacTeleop needed a synthetic mouse event too, but
//     for a React-specific reason our shell does not have.
//
// One layout note that is NOT a harness problem but will look like one: Quest
// Browser's default window is 1280 x 670 CSS pixels and `<meta viewport>` is
// ignored, so a demo's paragraph, readout, controls and log will not be on
// screen together for a human. Nothing here reads the DOM for numbers — every
// assert is on `window.__demo` — so the suite is unaffected either way.
// ─────────────────────────────────────────────────────────────────────────────
~~~

## `demo/verify-safari.mjs`

### safari

Above `import { spawn } from 'node:child_process';`, lines 1 to 17 before the cut.

~~~js
// demo/verify-safari.mjs — drive DESKTOP SAFARI over WebDriver.
//
//   node demo/verify-safari.mjs               # both engines (starts its own server)
//   node demo/verify-safari.mjs native        # just one
//   DEMO_BASE=https://positron.studio node demo/verify-safari.mjs
//
// WHY THIS EXISTS. demo/verify.mjs speaks CDP, which Safari does not, so the
// whole WebKit family was untested — and macOS Safari is the ONE platform with
// both a plain MediaSource AND native HLS, which means it is the only place the
// choice between the two engines is a real judgement rather than forced. It also
// shares an engine family with the iPhone, so it catches WebKit-specific
// breakage without a phone in hand.
//
// Requires "Develop > Allow Remote Automation" in Safari, once. safaridriver
// answers /status with {ready:true} when it is on.
//
// No dependencies: WebDriver is plain HTTP+JSON.
~~~

### safari-retired

Above `if (!process.argv.includes('--anyway')) {`, lines 22 to 29 before the cut.

~~~js
// 🔴 RETIRED 2026-10-13, AND IT WOULD NOW PASS ABOUT NOTHING. This harness
// drives /llhls/, whose live input (positron-demo) and publisher (pub's /watch)
// were deleted that day. /llhls/ now answers a press with "this leg was retired
// 2026-10-13" and builds no player, so the native branch of
// src/low-latency-player.js never runs and a run here would read PASS with zero
// coverage. It refuses instead. The player's one live caller left is
// /video/llhls/ (LL-HLS loopback, a camera on its own input), which this
// file does not drive; re-pointing it there is open in BACKLOG.md.
~~~

### free-port

Above `const freePort = () => new Promise((resolve, reject) => {`, lines 35 to 37 before the cut.

~~~js
/** A port the OS picked, released immediately — lifted from verify-quest.mjs,
 *  where its comment is also the honest one: there is a race between the close
 *  and safaridriver's bind, and it is still better than a constant. */
~~~

### one-safari

Above `const PORT = await freePort();`, lines 44 to 53 before the cut.

~~~js
// ⚠️ THE PORT WAS 4577 AND THE SERVER WAS ASSUMED TO BE ON 8890. Both are the
// shared-mutable-global rule this repo already applies three files over: a
// second run of this harness died on the bind, and the base URL pointed at
// whatever happened to be on 8890 once `serve()` learned to move.
//
// 🔴 BUT THE PORT WAS NEVER THE REAL LIMIT HERE, AND FIXING IT DOES NOT MAKE
// THIS CONCURRENT. `safaridriver` drives the one Safari on this machine, and
// Remote Automation is a single global switch, so two of these at once is still
// two harnesses fighting over one browser — it will just now fail somewhere
// honest instead of on a port collision that looked like a code fault.
~~~

### null-buffer

Above `const buf = num('buffer');`, lines 195 to 198 before the cut.

~~~js
// Under native HLS, currentTime does not share a timeline with buffered
// (Safari: currentTime 58.44 against buffered [[20,30]] while playing at
// 0.961x), so bufferReport deliberately reports null — "cannot tell", not
// "empty". Demanding a number there would fail a healthy player.
~~~

## `demo/verify.mjs`

### verify

Above `import { execFileSync } from 'node:child_process';`, lines 1 to 8 before the cut.

~~~js
// demo/verify.mjs — drives every BUILT demo through the __demo contract.
//
//   node demo/verify.mjs            # all built demos
//   node demo/verify.mjs transport loops   # just these, by slug
//
// This file is what replaces the ~25 harness pages: it asserts on
// window.__demo, never on DOM ids, so it does not care how any page is built.
// Raw CDP over node's global WebSocket, no deps — house harness style.
~~~

### gl

Above `const all = DEMOS.filter((d) => d.built && (!want.length || want.includes(d.name`..., lines 25 to 30 before the cut.

~~~js
// ⚠️ A `gl: true` DEMO IS NOT THIS HARNESS'S SUBJECT, AND FAILING IT HERE WOULD
// BE A LIE. This file launches Chrome with `--disable-gpu` (see the flags
// below), where `getContext('webgl2')` returns null — so a visual demo reports
// `__demo.ready` false and the suite goes red for a page that is perfectly
// fine. Hand them to demo/verify-gl.mjs and SAY SO, rather than counting a
// subject this harness cannot reach as a failure.
~~~

### peers

Above `const peerBrowsers = (excludePort) => {`, lines 40 to 56 before the cut.

~~~js
// 🔴 COUNT THE OTHER BROWSERS BEFORE BLAMING THE CODE. Three runs in one
// session read broken because of processes of MY OWN: a full suite went
// 429/429, then 420/429 with nine failures, then 429/429 again with no code in
// between, and all nine were in the demos that need something off this machine.
// Today the same thing took the suite out entirely — a `cdp timeout` on
// `replay`, which is 16/16 when run alone. CLAUDE.md has carried this as a rule
// to remember since session 18, and a rule to remember is the weakest kind of
// guard: it only fires if the person reading the red output happens to recall
// it. This makes the harness SAY IT, at the moment the output is being read.
//
// ⚠️ `-f` IS REQUIRED HERE AND IT IS THE TRAP. The flags we are looking for are
// on the command line, so an exact-name match cannot see them — but a `-f`
// pattern also matches the process doing the asking, which is LESSONS #39's
// shape (`pgrep -f h264_v4l2m2m` answering "still held" about itself). So our
// OWN pid is excluded explicitly, and after launch our own debugging port is
// too. Informational, NEVER fatal: a harness that refuses to run because
// something else is open is worse than the problem it is guarding against.
~~~

### one-browser

Above `.filter((l) => !/--type=/.test(l))`, lines 62 to 68 before the cut.

~~~js
// ⚠️ ONE BROWSER IS ABOUT TEN PROCESSES. Chrome's renderer, GPU and
// utility helpers inherit the whole command line, `--user-data-dir` and
// `--remote-debugging-port` included, so a naive count of matching
// processes reported **19 other headless Chromes** for two — and a
// warning that overstates by 10x is worse than no warning, because the
// next reader learns to ignore it. The browser process is the one with no
// `--type=`; every helper has one.
~~~

### stand-ins

Above `const PEER_IN_PAGE = new Set(['capture', 'wire']);`, lines 90 to 128 before the cut.

~~~js
/**
 * 🔴 FOUR PAGES ARE GRADED AGAINST STAND-INS, NEVER AGAINST THE REAL THING, AND
 * THE HARNESS DOES IT RATHER THAN THE PERSON REMEMBERING TO.
 *
 * Every station `/archive/radio/` offers is an ERR mount, and ERR told us our listeners
 * were corrupting their audience figures: the standing rule is that a connection
 * to one is opened only when a PERSON is going to listen. That made the page's
 * own thirty-four checks unrunnable, so `node demo/verify.mjs archive/radio` either
 * never happened or happened at somebody else's expense. `demo/fake-station.mjs`
 * serves real MP3 frames with real ICY headers at the page's own `?base=`, so
 * the decode path, the loop and the whole self-check run against a mount that is
 * nobody's radio station.
 *
 * 🔴 AND `/tapes/` IS THE SAME PROBLEM WITHOUT THE BROADCASTER, WHICH IS WHY IT
 * WENT UNNOTICED FOR LONGER. It plays twenty-four recordings off archive.org,
 * and the argument that this was safe, *"it uses archive.org, not ERR"*, got
 * the reply *"stil: super careful with external sources, better avoid"*. The
 * rule is about whose server it is, not about which harm has been named yet. A
 * plain `node demo/verify.mjs` with no arguments pulled real recordings down,
 * which is the way it happens by accident. `demo/fake-tapes.mjs` serves the same
 * paths at the lengths `corpus.json` measured.
 *
 * 🔴 AND `/now/` AND `/flipper/` ARE THE SAME BROADCASTER AS `/archive/radio/`, WHICH
 * IS WHY THE LAST FULL SUITE SKIPPED BOTH IN WRITING. They sweep ERR's live HLS
 * two bytes at a time to find where the rights refusals start, which is thirty
 * probes on one page and eight per channel on the other, plus a ten minute
 * back-seek that pulls another stretch of the window down. `demo/fake-err.mjs`
 * serves the same playlists on the same sliding window, with the three refusal
 * shapes ERR was measured to have, so both pages can be run as often as
 * anybody likes.
 *
 * ⚠️ IT IS AUTOMATIC BECAUSE THE ALTERNATIVE IS A RULE SOMEBODY HAS TO
 * REMEMBER, and a rule that is only in a document is a rule that gets broken on
 * the day somebody is in a hurry. `DEMO_QUERY=base=…` still wins, because
 * `URLSearchParams.get` returns the first occurrence and `DEMO_QUERY` is put
 * first: that is the escape hatch for somebody who has been ASKED to check the
 * real relay or the real archive.
 */
/** Pages that hold both ends of a WebRTC leg in this one browser. See the grant before `Page.navigate`. */
~~~

### archive-radio

Above `if (all.some((t) => t.name === 'archive/radio')) {`, lines 133 to 134 before the cut.

~~~js
// The archived radio demo is `archive/radio` since 2026-10-13 (*"Resolve clashes"*):
// its folder is demo/archive/radio/ and /radio/ is the radio concepts' group.
~~~

### err-pages

Above `const ERR_PAGES = [];`, lines 159 to 163 before the cut.

~~~js
// ⚠️ NO PAGE ON THIS BROADCASTER SINCE 2026-10-12, when `/flipper/` (which
// `/now/` had merged into on 2026-10-05) was archived. The list and the
// stand-in wiring stay so the next ERR page needs one slug here and nothing
// else; `errAt` is kept beside it because the refusal classifier below
// recognises the stand-in by its own address.
~~~

### wall

Above `standIn.set('flipper', '${errAt}/wall');`, lines 174 to 180 before the cut.

~~~js
/**
 * 🔴 `/wall` IS THE ARRANGEMENT ERR WAS MEASURED WEARING ON 2026-09-06, AND
 * IT IS THE ONE WHERE CHANNEL 0 REFUSES ITS NEWEST MINUTES. That is the only
 * way the page's start behind the boundary runs at all; the old `/now/` was
 * pointed at the default arrangement because it had no such path, and the
 * merged page has it from `err-live.mjs`'s `findServedEdge`.
 */
~~~

### board-pages

Above `const BOARD_PAGES = ['away'];`, lines 187 to 210 before the cut.

~~~js
/**
 * 🔴 THE BOARD PAGES MEET A BOARD THAT IS NOBODY'S, AND THE RELAY GOES WITH IT.
 * plans/plan-routing-migration.md §3.8, step 4. `/away/` (and `/knobs/` until
 * 2026-10-13) are `room: 'fixed'`, so until this they joined the PRODUCTION relay's `studio-1`
 * rooms on every run, beside the Raspberry Pi and whoever was listening to it.
 * Now `demo/fake-board.mjs` starts its own `demo/fake-relay.mjs` on 127.0.0.1
 * and these pages get `?relay=` (wire.mjs `relayOverride`), so a run opens no
 * socket off this machine for them.
 * ⚠️ `listening: true` HOLDS THE CIRCUIT'S LEASE AS ANOTHER LISTENER WOULD. A
 * page under `?selfcheck=1` may not take one (`createBoard` refuses every send),
 * so without it the frames never come and the page's level checks never run.
 * A listener elsewhere is a state the real board is in every time somebody is
 * playing, so it is not a generosity the real thing lacks.
 * ⚠️ `board=1` IS NOT ADDED. The page's own guard asserts (a harness cannot
 * drive the board) stay graded; `DEMO_QUERY=board=1` drives the stand-in for
 * real. `DEMO_QUERY=relay=...` still comes first, but `relayOverride` takes a
 * loopback address only, so it can move a page that leaves its relay to
 * wire.mjs onto another stand-in and never back onto the production relay.
 * (`/away/` hands `createBoard` its own `q.get('relay')` unchecked, so that
 * page alone would follow any address it is given.)
 * ⚠️ ONE LINE PER PAGE TO ADD ONE. `patchbay` and `shape` also open
 * `createBoard` and are left out on purpose until their own agents move them.
 */
// `knobs` left 2026-10-13, archived with Yoshimi (archive/yoshimi/README.md).
~~~

### bound-port

Above `const BASE = process.env.DEMO_BASE || 'http://127.0.0.1:${server.address().port}`..., lines 222 to 223 before the cut.

~~~js
// The port ACTUALLY bound, which may not be the one asked for — see
// serve()'s comment about a dev server already holding it.
~~~

### tiers

Above `const DEEP = process.env.DEMO_DEEP === '1' || process.argv.includes('--deep');`, lines 225 to 230 before the cut.

~~~js
// (`server` is null only when DEMO_BASE is set, and then it is not read.)
// 🔴 TWO TIERS (demo/shell/selfcheck.mjs). The ordinary run is selfcheck=1 and
// waits only a page's `lightSettleMs`; the deep run, `DEMO_DEEP=1` or
// `--deep`, is selfcheck=2 and waits the full `settleMs` the long-running
// checks need. A page that declares no `lightSettleMs` has not been split yet
// and gets its full wait either way.
~~~

### probed

Above `let probed = [];`, lines 263 to 270 before the cut.

~~~js
// Upstream refusals a demo asks for ON PURPOSE — today that is ERR's
// rights-blocked segments, which `flipper` sweeps for. Counted and capped,
// never ignored: the label has to name what they are, or the next reader
// believes a refusal was a radio station.
//
// The WHEP single-track branch below is kept but has no caller since `tracks`
// was removed on 2026-09-08. Cloudflare still refuses such an offer, so the
// allowance stays correct for whatever asks next.
~~~

### hosts

Above `const SHOW_HOSTS = process.env.DEMO_HOSTS === '1';`, lines 273 to 287 before the cut.

~~~js
/**
 * 🔴 WHOSE SERVERS A DEMO ACTUALLY TOUCHED, COUNTED. `DEMO_HOSTS=1`.
 *
 * The standing rule here is about whose server a run spends, and until this
 * existed there was no way to check it: a page pointed at a stand-in and a page
 * pointed at the real thing produce identical output. This is the instrument,
 * and it is `Network.requestWillBeSent`, which fires for every request the
 * renderer makes rather than for the ones a page remembered to log.
 *
 *   DEMO_HOSTS=1 node demo/verify.mjs tapes
 *
 * ⚠️ OFF BY DEFAULT AND PRINTED PER DEMO. Most demos here legitimately talk to
 * the relay, to Cloudflare or to ERR, so a line on every run would be noise
 * around the one run where it is the answer.
 */
~~~

### err-refusal

Above `const errRefusal = (s) => /live\.err\.ee/.test(s)`, lines 291 to 310 before the cut.

~~~js
/**
 * 🔴 A RIGHTS REFUSAL IS RECOGNISED BY WHERE IT CAME FROM, AND THERE ARE TWO
 * PLACES NOW. Both classifiers below used to test the URL for `live.err.ee`,
 * which was the whole address of the only thing that sent one. `fake-err.mjs`
 * sends the same 403 with the same missing `access-control-allow-origin` from
 * `127.0.0.1`, so the day the harness stopped pointing these pages at ERR,
 * every deliberate refusal became an unexplained console error and two pages
 * that were working read red.
 *
 * ⚠️ IT IS THE STAND-IN'S OWN ADDRESS PLUS THE SEGMENT PATH, NOT A LOOPBACK
 * TEST. Anything looser would swallow a real failure from the dev server, and
 * the whole value of this bucket is that it is narrow enough to be trusted.
 *
 * ⚠️ AND IT IS GIVEN THE WHOLE LOG LINE, NOT ONLY `entry.url`. Chrome files a
 * CORS violation with an EMPTY url and the address inside the message text, so
 * a version of this that only read the url classified the `loadingFailed`
 * events correctly and left the console entries for the same segments sitting
 * in `errors`. MEASURED: 22 refusals recognised and `no console errors` still
 * red, which reads as one bug and was two.
 */
~~~

### part-404

Above `if (/seg_\d+_part|_part_all\.mp4|\.m4s(\?|$)/.test(e.url || '') && /\b404\b/.tes`..., lines 333 to 338 before the cut.

~~~js
// A 404 on an LL-HLS PART is normal at the live edge — players request
// parts as they are born and hls.js retries; src/low-latency-player.js
// says so where it sets fragLoadingMaxRetry. Same treatment as
// ERR_ABORTED above: recorded separately, NOT ignored. The assert below
// still fails past a ceiling, because silence here would hide a real
// outage as "normal churn".
~~~

### whep-409

Above `probed.push(e.url);`, lines 342 to 352 before the cut.

~~~js
// 🔴 A 409 ON A WHEP PLAY URL MEANS NOTHING IS PUBLISHING TO THAT INPUT,
// which is a fact about the rig being off rather than about the page.
// `demo/shell/live.mjs` records the same 409 for the same reason: an
// input has to be fed by WHIP before it can be played by WHEP.
// MEASURED 2026-09-15 against Cloudflare directly, outside any browser:
// a bare POST to that play URL answered 409 while `keep` read 13/14 run
// after run on an otherwise clear machine.
// ⚠️ RECORDED AND CAPPED, NEVER IGNORED, which is the whole difference.
// Silence here would turn "the studio rig is not running" into a green
// run, and the next person to look would have no way to tell that from a
// page that had stopped asking at all.
~~~

### whep-400

Above `probed.push(e.url);`, lines 355 to 358 before the cut.

~~~js
// Cloudflare WHEP refuses a single-track offer with a 400, both ways.
// `tracks` used to assert on that refusal; it is gone, so nothing sends
// one today. Kept because the fact has not changed and the next page to
// probe it should not read as broken. Capped like the others.
~~~

### shout-502

Above `probed.push(e.url);`, lines 361 to 372 before the cut.

~~~js
// 🔴 A 502 FROM `shout` IS THE RELAY SAYING AN ORIGIN IS DOWN, and the
// page whose job is six radio stations handles it by falling back and
// saying so. MEASURED repeatedly today: four of eight mounts 502 while
// the other four answered 200 through the identical worker, and this
// laptop reached every one of them directly at `icecast.err.ee`. So the
// failure is upstream of us, it is not constant, and a demo that cycles
// stations meets it as a matter of course.
// ⚠️ CAPPED, NEVER IGNORED, AND THAT MATTERS MORE HERE THAN ELSEWHERE.
// Past the ceiling this stops being one flapping mount and becomes OUR
// relay being down, which is the opposite diagnosis and the one a reader
// of this suite most needs told apart. `shout.positron.studio/health`
// answers per station and is the thing to look at.
~~~

### vain

Above `probed.push(e.url);`, lines 376 to 386 before the cut.

~~~js
// 🔴 `vain` ASKS ITS OWN ARCHIVE TO REFUSE, THREE TIMES, ON PURPOSE: a
// file over the cap (413), a JPEG named `.mp3` (415), and the sidecar
// before it exists (404). All three are asserted ON the page and none
// writes a byte, which is the point of asking.
// ⚠️ NO PAGE-SIDE CHANGE CAN REMOVE THESE. Chrome logs a resource error
// for any 4xx and does it identically for `fetch` and `XMLHttpRequest`,
// MEASURED both ways rather than reasoned about. A check that cannot be
// made without a console error is exactly what this allowance is for.
// Capped like the others, never ignored: past the ceiling these stop
// being three deliberate refusals and become an archive that is refusing
// everything.
~~~

### ice

Above `probed.push(e.url);`, lines 389 to 397 before the cut.

~~~js
// 🔴 `/ice` ANSWERS 503 WHEN THE WORKER HOLDS NO TURN KEY, AND 404 FROM A
// WORKER DEPLOYED BEFORE THE ROUTE EXISTED. Both mean "no relay for a
// network that blocks UDP", and `/cam/` asks once per Start press and
// carries on without one, saying so in its log. Written 2026-09-30 with
// the route, before any key existed.
// ⚠️ SCOPED TO THOSE TWO STATUSES. A 429 or a 502 there is a relay that
// was meant to work and did not, and must still go red.
// Capped like the others, never ignored: past the ceiling this is a page
// asking in a loop rather than once per press.
~~~

### archive-5xx

Above `probed.push(e.url);`, lines 400 to 409 before the cut.

~~~js
// 🔴 archive.org 5xx ON A METADATA PROBE IS THEIR SERVER, NOT THIS PAGE.
// `/tapes/` asks all 24 recordings how long they are so a bar can be as
// wide as its tape, four at a time, straight at whichever node
// archive.org hands out. MEASURED across ten runs: two of them drew a 500
// from `dn720304.ca.archive.org` on one probe, and the other eight drew
// none, with no code between them.
// ⚠️ CAPPED LIKE THE OTHERS AND NEVER IGNORED. Past the ceiling this stops
// being one flaky node and becomes an archive that is down, which is
// something a reader of this suite needs to be told rather than have
// folded into "expected churn".
~~~

### blob-416

Above `probed.push(e.url);`, lines 413 to 433 before the cut.

~~~js
// 🔴 A RECORDING HAS TO BE ASKED ITS LENGTH, AND ASKING LOGS A 416.
// `resolveDuration` in `demo/shell/media.mjs` sets `currentTime = 1e6` to
// make a `MediaRecorder` blob admit a duration, because a file written by
// the recorder reports `Infinity` until something seeks it. Chrome serves
// the blob itself and answers that seek with a range request past the end,
// which it logs as a failed request on a `blob:` URL.
// ⚠️ NO PAGE-SIDE CHANGE REMOVES IT, WHICH IS WHAT THIS ALLOWANCE IS
// FOR, the same argument as `vain`'s three deliberate refusals above. The
// seek is the measurement, not a mistake, and the 416 is the browser
// answering the only question that produces a duration.
// ⚠️ AND IT IS NEW ONLY BECAUSE THE RECORDING NOW REALLY HAPPENS.
// MEASURED 2026-09-25: `/stage/`'s two start buttons were dead, passing
// `onPress` to a bar that binds `onClick`, so no show ran, nothing was
// recorded and nothing was ever asked its length. Fixing the button made
// this appear. A console error that shows up when a page starts working
// is evidence the page started working.
// ⚠️ SCOPED TO `blob:`, DELIBERATELY. A 416 on an http URL is a real
// range bug in the ingest path and must still go red, so this may not be
// widened to the error name alone.
// Capped like the others, never ignored: past the ceiling this stops being
// one duration probe per recording and becomes a page seeking in a loop.
~~~

### rights

Above `probed.push(e.url);`, lines 437 to 441 before the cut.

~~~js
// A rights refusal is a 403 with no ACAO, so the browser reports CORS.
// `flipper` probes for this deliberately and says in its readout how much
// was refused, and `now` walks its playhead into it on purpose; the
// requests are expected from both. Capped, not ignored: past the ceiling
// this is an outage, not rights.
~~~

### aborted

Above `const url = reqUrl.get(m.params.requestId) || '';`, lines 446 to 450 before the cut.

~~~js
// ERR_ABORTED is what a media element's in-flight segment requests do
// when the page unloads — it means WE navigated, not that the page
// failed. Every page that plays media produces these on teardown, so
// counting them made a working demo look broken. Recorded separately
// rather than ignored.
~~~

### blob-416-net

Above `else if (/^blob:/.test(url) && m.params.errorText === 'net::ERR_REQUEST_RANGE_NO`..., lines 454 to 458 before the cut.

~~~js
// The duration seek's 416 on a recording blob, the same request the
// Log.entryAdded branch above allows. Chrome reports it on BOTH channels,
// and until 2026-09-30 only the log side was allowed, so /stage/ went red
// on "no failed requests" for the very request that branch explains.
// Same scope: `blob:` only, capped through `probed`.
~~~

### gesture

Above `async function gesture() {`, lines 470 to 485 before the cut.

~~~js
/**
 * Drag across every `[data-gesture]` element on the page, with real pointer
 * events. Returns how many surfaces were drawn on.
 *
 * THE PATH IS A LISSAJOUS, not a straight line, and the reason is measurement:
 * a straight drag is reconstructed exactly by every interpolator, so a page
 * comparing hold against linear against a spline would grade all three as
 * perfect and its whole subject would vanish into a tie. A curve separates
 * them.
 *
 * ⚠️ TIMESTAMPS ARE SUPPLIED. `Input.dispatchMouseEvent` takes one, and
 * without it every sample would be stamped when the round trip happened —
 * so the gesture's input rate would be a measurement of this harness's
 * latency rather than of anything on the page. `ev.timeStamp` in the page is
 * what a capture gate reads, so it has to be the honest one.
 */
~~~

### scroll

Above `const b = await ev('(() => {`, lines 491 to 497 before the cut.

~~~js
// ⚠️ SCROLL IT INTO VIEW FIRST, AND RE-READ THE RECTANGLE AFTER. Headless
// Chrome's default viewport is 800x600 and these pages are taller than
// that, so a canvas half way down the page has a bounding rectangle whose
// lower half is BELOW THE VIEWPORT — and an input event dispatched at a
// y past the viewport lands on nothing at all, silently. The first run of
// this helper read `page asserted something — 0` for exactly that, while
// the identical drag in a 900px window produced 200 moves and 5 asserts.
~~~

### typing

Above `async function typing() {`, lines 533 to 555 before the cut.

~~~js
/**
 * Type into every `[data-typing]` element, with real key events.
 *
 * The twin of `gesture()` above, and it exists for the same reason: a page
 * whose subject is TYPING was a subject this harness could not reach, because
 * a click produces no `input` event and a drag produces no text. `typist`
 * found two real bugs the first time it was driven this way — a fold at
 * position 0 emptying the box the first letter had just gone into, and a strip
 * that fits itself once and so drew six of seventy-one edits — neither of
 * which any button press could have surfaced.
 *
 * The sequence is not a word, it is the three things five previous text
 * adapters got wrong: characters, a BACKSPACE (which never says what it
 * removed), and an ARROW KEY (which moves the caret with no input event at
 * all). A page that only ever sees appended characters is a page whose whole
 * argument goes untested.
 *
 * ⚠️ UNLIKE THE DRAG, THE TIMING HERE IS REAL. `Input.insertText` takes no
 * timestamp, so the recorded intervals are this harness's round trips. That is
 * acceptable because no claim on this page is about input RATE — but it would
 * not be on a page that measured one, and the difference is worth knowing
 * before reusing this.
 */
~~~

### arm-first

Above `if (!ok) {`, lines 569 to 578 before the cut.

~~~js
// ⚠️ A PAGE MAY HAVE TO BE ARMED BEFORE IT CAN BE TYPED INTO, and the
// PRIMARY control is this shell's convention for the main path. `typist`
// starts on a shipped recording with the box read-only, and the control
// loop above leaves it there because the last button pressed put it back.
// So: if every field refuses focus, press the primary once and ask again.
//
// 🔴 AND THE COUNT REPORTED IS THE NUMBER ACTUALLY TYPED INTO, not the
// number found. The first version returned the number of elements and
// printed "typed into 1 field" about a read-only box it had skipped — a
// harness reporting work it did not do, which is worse than reporting none.
~~~

### separator

Above `const ok = (label, cond, detail) => {`, lines 615 to 619 before the cut.

~~~js
// ⚠️ `·` RATHER THAN AN EM DASH, AND THIS IS THE SOURCE OF EVERY ONE IN A SUITE
// RUN. A sweep of 418 strings across 62 files could not reach it, because the
// dash is not in any page: it is added here, to every line, as it is printed.
// The rule is about anything a reader looks at, and a suite run is read more
// often than most pages.
~~~

### own-room

Above `const own = t.room === 'fixed' ? '' : 'room=${t.name.replace(/\//g, '-')}-test-$`..., lines 629 to 673 before the cut.

~~~js
// DEMO_QUERY appends to every page, so a BRANCH can be verified rather than
// only the default. Added when moq's publisher started PROBING for a codec:
// the probe picks AV1, every recorded MoQ number was taken on VP8, and a
// fallback the harness cannot select is a fallback nobody has run.
//   DEMO_QUERY='codec=vp8' node demo/verify.mjs moq
// 🔴 A FIXED ROOM NAME IS A SHARED MUTABLE GLOBAL, and this repo learned that
// about PORTS and never applied it to rooms. `serve()` takes the next free
// port and `verify-gl` reads back the CDP port it got, precisely because a
// fixed one meant a harness attached to the previous run's Chrome and
// reported that run's flags. Every demo here defaults to a NAMED room —
// `cues-demo`, `jam-demo`, `scene-demo`, `room-demo` — so two runs of the
// suite, or a run and a visitor, land in the same one and see each other's
// traffic. That is the same bug in the WebSocket layer.
//
// So a harness run gets a room of its own, per demo, per run. It costs one
// query parameter and it removes a whole class of "I was competing with
// myself", which this project has paid for twice: nine orphaned Chromes
// filled `studio-1` and took a live demo down (LESSONS #56), and a full run
// went 429 -> 420 -> 429 with no code between.
//
// ⚠️ TWO ROOMS ARE NOT LIKE THAT AND MUST NOT BE OVERRIDDEN. `room: 'fixed'`
// in the manifest means the name is not a rendezvous this page invented, it
// is the ADDRESS OF A MACHINE — `studio-1` is where the Raspberry Pi is and
// `m1-1` is where the studio Mac's agent is — or a room whose SUBJECT is the
// history it shares (`wire` reads its own backlog back). Renaming those does
// not isolate a run, it points it at nothing.
//
// ⚠️ AND A DEVICE IS STILL EXCLUSIVE. A private room does not give a second
// client its own Raspberry Pi: there is one JACK graph and one instrument, so
// board-bound demos still have to take turns. Rooms were never that problem;
// conflating the two is what made them look like one.
/**
 * A private room per run, so two runs cannot see each other's rows and
 * neither can see the real page's.
 *
 * ⚠️ `<demo>-test-<hash>`, NOT `v-<demo>-<hash>`. The `v` stood for verify and
 * was obvious to nobody — asked, in those words: *"What is v- prefix?"*. A
 * room name is read by somebody looking at a store wondering what all these
 * rows are, and `items-test-4f2a` answers that where `v-items-4f2a` needs a
 * footnote. It also cannot be mistaken for the real room by a rule that has to
 * tell them apart: `workers/items` only announced from the room named
 * `items` (archived 2026-10-01, `archive/items/README.md`), because one FCM
 * topic means one room may use it — a harness room that reached real phones
 * is exactly how this came up.
 */
~~~

### selfcheck

Above `const q = [process.env.DEMO_QUERY, own, DEEP ? 'selfcheck=2' : 'selfcheck=1',`, lines 675 to 685 before the cut.

~~~js
// 🔴 THE HARNESS SAYS SO, SO A PAGE CAN KEEP ITS DESTRUCTIVE CHECKS OUT OF A
// VISIT. `radio` proves a station button works by pressing another station
// and pressing back, and proves the transport stops by stopping it — on the
// decoded path both are a decoder teardown and rebuild, so both are a hole in
// the sound. They ran for every listener, three times, in the first seconds of
// a visit, and were REPORTED as such twice. A page that can only check itself
// by breaking itself needs to know whether anybody is collecting the answer.
//
// ⚠️ EVERY DEMO GETS IT AND ALMOST NONE READ IT, which is the point — the flag
// is a fact about the run, not a per-demo setting to keep in step. A page that
// needs it opts in by reading it.
~~~

### audio-grant

Above `await send('Browser.resetPermissions').catch(() => {});`, lines 690 to 702 before the cut.

~~~js
// 🔴 A PAGE WITH BOTH ENDS OF A WebRTC LEG IN ONE BROWSER NEEDS EVERY HOST
// INTERFACE, AND CHROME ONLY OFFERS ONE UNTIL A MICROPHONE IS ALLOWED.
// MEASURED 2026-10-05: with no capture permission Chrome gathers a single
// host candidate, on the interface that routes to 8.8.8.8. On this desk that
// is `utun4` (Check Point Endpoint Security VPN, 10.100.6.22), and UDP sent
// to that address never comes back to the same machine, so `/capture/`'s
// RECEIVER and `/wire/`'s far-end sound sat in `checking` for good. Granting
// audioCapture alone makes Chrome enumerate 127.0.0.1, en0 and the bridges,
// and the same two connections reach `connected` in about 100 ms.
// ⚠️ SCOPED TO THESE SLUGS AND AUDIO ONLY, ON PURPOSE. Video stays
// ungranted so no camera page publishes, and `/wish/` asks for the real
// microphone, which a run must never open. Reset first so a grant never
// outlives the page it was for.
~~~

### boot-wait

Above `let ready = false;`, lines 710 to 720 before the cut.

~~~js
// ready, with a bounded wait — never a bare sleep
// 🔴 THE WAIT IS 7.4 s UNLESS THE PAGE DECLARES `bootMs`, AND ONE PAGE DOES.
// MEASURED 2026-09-26: /kit/ reaches `ready` at 7.3 s locally and 7.7 s on
// the edge with 231 asserts landed, because it builds and grades every
// specimen before it says ready, by design (a closed tab is laid out only
// inside its measuring window, so nothing there can be deferred). Locally it
// cleared this loop by 0.1 s; against the deploy it read 0/1 twice for a page
// that is 243/243. `bootMs` is declared per page in the manifest with the
// measurement beside it, the same shape as `settleMs`, and is not a knob for
// a page that is merely slow. `positron-verify`: a page that misses this wait
// is graded not at all, which is the worst face a harness has.
~~~

### no-demo

Above `console.log('        __demo: ${await ev('typeof window.__demo')}'`, lines 729 to 733 before the cut.

~~~js
/* 🔴 SAY WHETHER THE OBJECT IS THERE AT ALL, BECAUSE THE TWO CAUSES LOOK
   IDENTICAL FROM HERE. `__demo` missing means the module never finished;
   `__demo` present with `ready` falsy means the shell mounted and the page
   did not get to the end. Both printed `failed: null` and `console:
   nothing`, and 2026-09-22 was spent bisecting the difference by hand. */
~~~

### console

Above `for (const e of errors.slice(0, 5)) console.log('        console: ${String(e).sp`..., lines 738 to 749 before the cut.

~~~js
/**
 * 🔴 AND WHAT THE CONSOLE SAID, BECAUSE THIS IS EXACTLY WHEN IT MATTERS.
 * The `no console errors` check runs much later and this `continue` skips
 * it, so a page that dies before `ready` reported ONE line — `failed: null`
 * — and threw its actual reason away. MEASURED 2026-09-17: two separate
 * dangling references on `/stage/`, each an ordinary ReferenceError sitting
 * in the console, each taking a round of manual bisecting to find, because
 * the harness knew and did not say.
 * ⚠️ A page that never becomes ready is the one case where the console is
 * the whole story: there are no asserts to read, no readout to inspect, and
 * `failed` is only set by a page that got far enough to set it.
 */
~~~

### readout

Above `ok(meta.readoutOptOut ? 'declares that it has no readout, on purpose' : 'declare`..., lines 757 to 762 before the cut.

~~~js
// ⚠️ A PAGE MAY DECLARE THAT IT HAS NOTHING TO PUT IN A READOUT, but it has
// to SAY SO — `readout: null` rather than an omitted field, so "this page's
// subject is visible rather than numeric" cannot be confused with "somebody
// forgot". `typist` is the case: the document IS the readout, and a row of
// cells repeating the letters and the cursor position was the same facts
// twice. An absent field is still a failure.
~~~

### drill-twin

Above `if (meta.hasT) {`, lines 767 to 775 before the cut.

~~~js
/**
 * 🔴 THIS DRILL HAS A TWIN IN `demo/shell/bar-drill.mjs`, AND THE TWO MUST
 * STAY IN STEP. A tabbed page carries several bars and this block reaches
 * only the published one, so the page runs the same drill as page asserts
 * against the rest (2026-10-04, `plans/plan-demo-structure.md` §5 step 1).
 * Its `DRILL` constants are the sleeps and thresholds below, and
 * `node demo/shell/bar-drill-test.mjs` reads THIS FILE and fails when a
 * number here has moved without that one. Change both, then run the test.
 */
~~~

### no-toggle

Above `if (!t0.toggles) console.log('        this bar has no play button, so the play/p`..., lines 781 to 794 before the cut.

~~~js
/**
 * 🔴 A BAR MAY HAVE NO PLAY BUTTON, AND THIS DRILL IS THE WHOLE REASON THAT
 * OPTION HAD TO ANNOUNCE ITSELF. `transport-bar.mjs` takes `toggle: false`
 * for a page whose sound has no position to start or resume — `/keys/`
 * holds a note while a key is down and has nothing to play. Clicking a
 * `.tbar-toggle` that was never appended throws on `null`, and asserting
 * that the position advanced would fail on a page where nothing is wrong.
 *
 * ⚠️ `!== false` RATHER THAN A TRUTH TEST, so a bar built before the option
 * existed — where the getter is `undefined` — still gets the drill. A new
 * property must not silently switch checks off on every page that predates
 * it, which is the shape of loss this suite has already had once: 27
 * asserts became 17, every one of them green.
 */
~~~

### toggle

Above `const TOGGLE = '__demo.transport.el.querySelector(".tbar-toggle")';`, lines 797 to 807 before the cut.

~~~js
/**
 * 🔴 THE TOGGLE OF THE BAR THIS DRILL IS GRADING, NOT THE FIRST ONE IN THE
 * DOCUMENT. This read `document.querySelector(".tbar-toggle")` while every
 * assert around it reads `__demo.transport`, which is the same element only
 * while a page has exactly ONE bar. `/stage/` grew a second on 2026-09-18,
 * and the two disagree by construction: the DOM query takes whichever comes
 * first in document order, and `__demo.transport` is whichever was BUILT
 * last, so on a tabbed page they are routinely different bars. The drill
 * would have pressed one control and asserted about another, which fails
 * while nothing is wrong and passes for the wrong reason just as easily.
 */
~~~

### open-tab

Above `const opened = await ev('(() => {`, lines 826 to 836 before the cut.

~~~js
/**
 * 🔴 A BAR IN A CLOSED TAB OF A TAB PAGE HEARS NO KEY, SO OPEN ITS TAB
 * THE WAY A PERSON WOULD, AND PUT THE PAGE BACK AFTER. 2026-10-04:
 * `tab-page.mjs` marks its panels `data-own-keys` and `transport-bar.mjs`
 * ignores keys for a bar inside one that is hidden, because on `/time/`
 * five bars would otherwise all seek at once. A page that opens on a
 * different tab from the one holding its published bar would read red
 * here for a reason that is not the bar's. Only `data-own-keys` panels:
 * `/kit/`'s bar sits in a plain closed tab, still hears the key, and is
 * not touched. Panels and tab buttons are index-aligned in `tabs.mjs`.
 */
~~~

### sample

Above `const sample = () => ev('(async () => {`, lines 859 to 869 before the cut.

~~~js
// SAMPLE AFTER A FRAME, and more than once. `resize()` in strip.mjs assigns
// canvas.width, which CLEARS the canvas, and only then schedules a redraw —
// so there is a real window in which a working strip is blank, and a
// ResizeObserver can open it at any time (a readout value getting wider, a
// log line wrapping). Sampling one instant caught that window about one run
// in ten and reported `0 lit samples`, which reads as a dead page.
//
// This is a retry, not a tolerance: a strip that never draws still fails,
// because every try lands after a fresh frame. The count is in the detail
// so a strip that needs several tries is visible rather than silently
// passing.
~~~

### controls

Above `const SEL = '.pos-controls button, .tbar-x';`, lines 884 to 904 before the cut.

~~~js
// exercise every control the demo declared, in order — a multi-step demo
// (arm, then measure) does not put its asserts behind the first button.
//
// `.tbar-x` too: a page may put a control INSIDE the transport bar when it is
// a transport verb rather than a side action (`take` puts Record there). A
// control the harness cannot press is a subject the suite cannot reach, which
// is how three pages stayed green while never playing a frame.
// ── a page whose input is a DRAG ────────────────────────────────────────
//
// 🔴 `element.click()` FIRES NO POINTER EVENTS, so a page that is drawn on
// rather than pressed was a subject this harness could not reach at all.
// `draw` carried a `Draw one for me` button purely so that something here
// had something to press — a page answering its own question, and the line
// it graded was not the line the page is about.
//
// Any element marked `data-gesture` gets a real drag instead: CDP mouse
// events, which Chrome turns into genuine pointerdown/move/up with
// `getCoalescedEvents` and all. The TIMESTAMPS are supplied explicitly and
// are 16 ms apart, so the page sees a gesture at a plausible input rate
// regardless of how fast the round trips happen to go — a drag paced by the
// CDP transport would be a measurement of the CDP transport.
~~~

### settle

Above `await sleep(i === 0 && settleOf(t) ? settleOf(t) : 650);`, lines 909 to 914 before the cut.

~~~js
// A demo whose first control brings up LIVE infrastructure needs that to
// finish before the later controls mean anything. settleMs is declared per
// demo in the manifest rather than guessed here. Note it lands on control 0
// ONLY — and that it now does a second job further down, sizing the wait for
// a page's first assert. A demo whose slow control is not the first gets
// nothing from it here and is carried entirely by that second use.
~~~

### input-after

Above `const drawn = await gesture();`, lines 919 to 924 before the cut.

~~~js
// 🔴 INPUT COMES AFTER THE CONTROLS, BOTH KINDS. A page that has to be ARMED
// before it will record has to be armed before it is drawn on — `draw` grew
// a record button and immediately reported `page asserted something — 0`,
// because the drag was still running first and the page dutifully recorded
// nothing. The drag used to go first for the opposite reason (draw's only
// control CLEARED the canvas), and that reason is gone.
~~~

### busy

Above `const busyCount = () =>`, lines 930 to 945 before the cut.

~~~js
// 🔴 A PAGE WHOSE CONTROL IS STILL RUNNING HAS NOT FINISHED, AND THE HARNESS
// USED TO WALK OFF ANYWAY. The press loop sleeps a fixed 650 ms after each
// button and does not await the handler, so a control that takes longer was
// still working while the stabiliser below decided the page had nothing more
// to say. The case that found it was the retired `seek` page, kept at
// archive/demos/seek-index.html, whose sweep was five jumps at 700 ms
// apiece. It did not show
// up before because every such page carried a "Run the checks" BUTTON, which
// gave the checks a slot of their own; taking those buttons off the pages
// (they are harness machinery showing through, `shout` argues it) took the
// slot with them and eleven pages quietly lost their asserts.
//
// `shell.mjs` already marks a running control `data-busy="1"` — it is what
// draws the sweep across the button — so the answer was on the page the whole
// time. ⚠️ CAPPED: a handler that never settles must cost one demo a wait,
// not the run.
~~~

### first-assert

Above `const FIRST_ASSERT_CEIL = 30000;`, lines 952 to 972 before the cut.

~~~js
// Some checks are async (`replay` fetches the manifest before asserting), so
// a fixed sleep either flakes or wastes time. Wait for the assert count to
// stop growing instead.
//
// BUT ZERO NEVER GROWS. The loop below used to exit the moment the count
// stopped changing, and a count of 0 stops changing immediately — so a demo
// whose FIRST assert sits behind a wait reported "asserted nothing", which
// reads as a broken page rather than a slow one. CLAUDE.md records the trap;
// the loop did not honour it. `take` made it concrete: recording runs to a
// 10 s cap and every assert is behind it.
//
// So there are two phases. While the count is still zero, wait — then fall
// back to the cheap "stop when it stops growing" once anything has landed.
//
// CAPPED, and not at `settleMs`. That number sizes a COLD CONTAINER (`tracks`
// declares 125 s), which is a control-0 concern and has already been waited
// out above. Reusing it here makes a page that will never assert — because
// its live leg is down — burn the whole budget a SECOND time, turning one
// demo into four minutes of a run. What this phase covers is a first assert
// sitting behind work the PAGE does (`take` records to a 10 s cap), which is
// a much smaller quantity, so it gets its own ceiling.
~~~

### is-ready

Above `const isReady = () => ev('!!(window.__demo && window.__demo.ready)');`, lines 976 to 997 before the cut.

~~~js
/**
 * 🔴 THE WAIT IS ARMED BY `d.ready()`, NOT BY THE COUNT BEING ZERO, AND THAT
 * DISTINCTION BLINDED THE SUITE.
 *
 * This loop used to run `while (n === 0)`, on the reasoning that once
 * anything has landed the cheap growth loop below can take over. That held
 * only while nothing asserted early. The moment the SHELL gained two asserts
 * of its own, every page in the suite had a non-zero count at t+0, this phase
 * fell through on its first test, and a page was left with 12 tries at 400 ms
 * to produce everything it had.
 *
 * MEASURED the day it landed: `/archive/radio/` makes 34 asserts and the suite
 * collected **2**, then reported **13/13 green**. That is this project's worst
 * failure shape, a green suite with no coverage, and it hit 28 demos at once
 * because 28 declare `settleMs`.
 *
 * ⚠️ `ready` IS THE RIGHT SIGNAL BECAUSE IT IS THE PAGE'S OWN CLAIM TO BE
 * FINISHED. A count cannot distinguish "two asserts because the page has
 * barely started" from "two asserts because that is all there are"; `ready`
 * can, since a page calls it when its checks are done. The count is still the
 * fallback for a page that never calls it, so nothing hangs.
 */
~~~

### one-loop

Above `const shellN = await ev('(window.__demo && window.__demo.shellAsserts) || 0');`, lines 1000 to 1012 before the cut.

~~~js
// ⚠️ ONE LOOP, NOT TWO. The old pair was a "wait while nothing has landed"
// phase followed by a "stop when it stops growing" phase, and the handover
// between them was the defect: the first fell through the instant ANY assert
// existed, so two asserts from the shell at t+0 handed every page straight to
// a loop that allows 4.8 s in total. A page is done when it says it is ready
// AND its count has stopped moving. Both conditions, or a page that calls
// `ready()` before driving its own checks (`/archive/radio/` does, from inside
// the granulator's boot) is cut off at the moment it starts working.
// ⚠️ "THE PAGE HAS NOT ASSERTED YET" IS NOT "THE COUNT IS ZERO". The shell
// makes two of its own at t+0 on every shelled page, so a zero test answered
// false immediately and this phase stopped running at all. `shellAsserts` is
// the shell saying how many of the rows are its, which is the only thing that
// separates a page that has barely started from one that is finished.
~~~

### growth

Above `const GROWTH_PATIENCE = 5, GROWTH_TRIES = 60;`, lines 1018 to 1078 before the cut.

~~~js
/**
 * Then the cheap one: stop when it has stopped growing AND the page says it
 * is ready.
 *
 * 🔴 `isReady` WAS DECLARED HERE AND NEVER CALLED, FOR AS LONG AS IT HAD
 * EXISTED, WHICH MADE THE PARAGRAPH ABOVE A DESCRIPTION OF CODE NOBODY
 * WROTE. It says in capitals that a page is done when it says it is ready
 * AND its count has stopped moving, `Both conditions`, and only one of them
 * was ever tested. A dead guard reads as finished work, which is this
 * project's most expensive kind of defect.
 *
 * 🔴 AND THE HALF THAT ACTUALLY COST SOMETHING IS THE PATIENCE, NOT THE
 * READY. A check block that waited longer than ONE 400 ms poll without
 * asserting was cut off, and everything after it was lost in silence.
 * MEASURED 2026-09-22 on `/muta/`, which grew a sustain check holding a note
 * for 700 ms and its release for 900 ms: the count stood still across one
 * poll, this loop exited, and **two asserts stopped running**, one of them a
 * voice stealing check that had been there for a day. The suite read
 * **40/40 green** before and after, because an assert that never runs cannot
 * fail. Raising `settleMs` from 8 s to 14 s changed nothing, which is what
 * said the settle window was not the cause.
 *
 * ⚠️ AND `ready` ALONE WOULD NOT HAVE SAVED IT, WHICH IS WHY BOTH ARE HERE.
 * `/muta/` calls `ifSelfcheck(...)` WITHOUT awaiting it and then `d.ready()`
 * on the next line, so `ready` is true a few milliseconds in and stays true
 * through every check the page makes. The paragraph above already knew
 * `/archive/radio/` does the same from inside the granulator's boot. A page's own
 * claim to be finished is worth reading and is not worth trusting alone.
 *
 * ⚠️ AND `__demo.ready` IS A REAL BOOLEAN, WHICH WAS CHECKED AFTER GETTING IT
 * WRONG. It was read here as *the method a page calls*, on the strength of
 * `ready:` appearing twice in `shell.mjs`, and `shell.mjs` was changed to
 * publish a separate flag. **The two `ready` keys are on two different
 * objects**: `api`, which is what `window.__demo` is, carries the boolean,
 * and the page-facing object returned by `mount()` carries the method that
 * sets it. The change was reverted. A key name appearing twice in a file is
 * not two declarations of one thing.
 *
 * ⚠️ IT COSTS TWO EXTRA POLLS ON A PAGE THAT REALLY HAS FINISHED, which is
 * 800 ms a page and about 48 s across a full suite. That is the price of not
 * silently dropping the tail of a check block, and this project's own rules
 * already rank a green run with no coverage as the worse of the two.
 */
// Three quiet polls, not one: a page may legitimately take a second between
// asserts, and 12 tries only ever allowed 4.8 s in total.
// ⚠️ FIVE AND NOT ONE, WHICH IS 2.0 s OF SILENCE TOLERATED AND COSTS 1.6 s A
// PAGE. A DSP page that holds a note, lets it go and measures the difference
// is quiet for over a second BY DESIGN, and that is the check rather than a
// delay in it. `/muta/` lost four asserts to a patience of one and two more
// to a patience of three, every time silently and every time still green.
// ⚠️ AND `ready` CANNOT REPLACE IT, WHICH WAS TRIED. Moving that page's
// `d.ready()` to the end of its checks made it fail the 7.4 s boot wait above
// and be graded not at all, because the same flag answers two questions: *is
// this page up* and *has it finished*. Splitting them is a change to the
// shell contract and to four harnesses, and is in BACKLOG.md.
// ⚠️ 60 TRIES IS A 24 s CEILING AND COSTS A FAST PAGE NOTHING, because the
// loop leaves the moment a page is quiet and ready. 30 was reached by
// `/muta/`, whose DSP checks hold notes, release them and wait for envelopes
// for about twelve seconds in total, and reaching the ceiling drops whatever
// has not asserted yet without a word. That is the same silent truncation as
// a patience of one, arriving from the other end of the same loop.
~~~

### probe-ceiling

Above `const PROBE_CEILING = 90;`, lines 1097 to 1105 before the cut.

~~~js
// ONE DEMO ASKS ERR FOR SEGMENTS ON PURPOSE, and an unexplained ceiling is
// how the next reader mistakes a real outage for expected churn. `flipper`
// is the old `/flipper/` and `/now/` in one page since 2026-10-05, so it
// pays both pages' asking: up to 8 points at each open of a channel (three
// opens in a run, ETV, another, ETV again), 13 for the deep sweep, the deep
// survey of the other two, all capped at 40 per open in-page, plus hls.js's
// own retries on whatever comes back refused. MEASURED against the stand-in
// the day it merged: 45 ordinary, 72 deep. It was 60 while the two were
// separate pages, which each stayed under it.
~~~

### edge

Above `const edgeOk = edgeMisses.length <= EDGE_CEILING;`, lines 1107 to 1110 before the cut.

~~~js
// ⚠️ AND THE LINE HAS TO SAY WHICH KIND, or a reader sees a number with no
// meaning. `keep` and `take` ask WHEP for an input the rig feeds; when the
// rig is off that is a 409 every time, and an unexplained ceiling is how the
// next reader mistakes a real outage for expected churn.
~~~

### peers-again

Above `if (fail) {`, lines 1130 to 1134 before the cut.

~~~js
// ⚠️ ASKED AGAIN AT THE END, not only at the start — a browser that appeared
// halfway through is the one most likely to have caused the failure being read,
// and it would not have been in the opening count. Printed only when something
// FAILED, because on a green run it is noise about a problem that did not
// happen.
~~~

## `demo/which-rule-won.mjs`

### which-rule-won

Above `import { launchChrome, connectCdp } from './chrome.mjs';`, lines 1 to 52 before the cut.

~~~js
// demo/which-rule-won.mjs — FOR ONE ELEMENT AND ONE PROPERTY, EVERY DECLARATION
// THAT WAS MADE FOR IT, WHERE EACH CAME FROM, AND WHICH ONE WON.
//
//   node demo/which-rule-won.mjs kit '.pos-rows-r' padding-left
//   node demo/which-rule-won.mjs nola '.panel-plate' padding-top --width 375
//   node demo/which-rule-won.mjs fau '.fau-src textarea' padding-top --base https://positron.studio
//
// 🔴 IT EXISTS BECAUSE THIRTY CASCADE INCIDENTS IN THIS REPOSITORY WERE FOUND BY
// `getComputedStyle` AND ALMOST NEVER BY READING THE FILE, AND `getComputedStyle`
// ONLY SAYS WHAT WON, NEVER WHO. A component's `padding: 7px 9px` SHORTHAND at
// (0,2,1) beat a page's `padding-top` longhand at (0,1,1) on `/fau/` while the
// source read as correct, and the page sheet loading later did not help, because
// weight decides before order does. Nothing on the page said so. This prints
// `<- via shorthand padding: 7px 9px` beside the winner, which is that incident
// made visible in one line.
//
// ✅ **`CSS.getMatchedStylesForNode` IS THE ONLY COMPLETE SOURCE, AND IT IS
// CDP-ONLY.** `getComputedStyle` returns resolved values with no provenance and
// reads `0.3125rem` back as `5px`. `getMatchedCSSRules` was removed from Chrome in
// 64 and never existed in Firefox. No npm package wraps this. So this file drives
// Chrome the same way `verify.mjs` and `shot.mjs` do, raw CDP over node's global
// WebSocket, no dependencies.
//
// 🔴 **THE ARRAY CDP HANDS BACK IS ALREADY IN CASCADE ORDER, EXCEPT THAT IT
// IGNORES `!important`.** MEASURED on a crafted page with layers, an id rule, an
// important rule and an inline style: `.imp !important` sat at index 5 below
// `#only` at index 9 while the computed value was the important one. So taking
// the last match is wrong whenever importance is in play, and it looks right on
// every page that has none. This file re-ranks: origin band, then layer order,
// then specificity, then source order, with importance inverting both the
// origin bands and the layer order, which is what the spec says it does.
//
// ⚠️ **BLINK ALSO EMITS EXPANDED LONGHAND ECHOES WITH NO `range`, WHICH MUST BE
// SKIPPED**, or every shorthand is counted twice. DevTools' own frontend does
// `if (style.range && !property.range) continue`, and so does this.
//
// ⚠️ **INHERITANCE STOPS AT THE NEAREST DECLARING ANCESTOR.** An earlier draft
// ranked across depths and reported a grandparent's `color` over the parent's,
// because `inheritedFrom = 0` is falsy. The symptom was a plausible wrong answer
// rather than an error, which is the worst kind.
//
// 🔴 **THE PORT IS READ BACK FROM THE PROFILE, NEVER GUESSED.** The draft this
// was adopted from launched on a fixed port and asked `/json/list`, which attaches
// to whatever Chrome is already on that port. `verify.mjs` pays for that lesson
// at length: a guessed port can be somebody else's browser. `--remote-debugging-
// port=0` and `DevToolsActivePort` is the house pattern and this follows it.
//
// ⚠️ **WHAT IT STILL CANNOT SEE**, stated rather than papered over: `@scope`
// proximity (CDP does not rank it), whether a `@container` block is active (CDP's
// `CSSContainerQuery` carries no `active` boolean while `CSSSupports` does),
// shadow tree-scope distance, and a value winning because a transition is
// running (that is `CSS.getAnimatedStylesForNode`, experimental).
~~~

### css-enable

Above `await S('CSS.enable');`, lines 99 to 100 before the cut.

~~~js
// ⚠️ `CSS.enable` BEFORE NAVIGATING, or `styleSheetAdded` is missed for every
// sheet the page loads and the source column reads `(no stylesheet header)`.
~~~

### resolved

Above `console.log('\ncomputed ${PROPERTY} = ${got && got.value}${winner ? '   (the win`..., lines 219 to 220 before the cut.

~~~js
// ⚠️ THE COMPUTED VALUE IS RESOLVED, SO `0.3125rem` READS BACK AS `5px` AND
// `navy` AS `rgb(0, 0, 128)`. A mismatch here is a prompt to look, not a verdict.
~~~

## `demo/wish-local.mjs`

### wish-local

Above `import http from 'node:http';`, lines 1 to 35 before the cut.

~~~js
// demo/wish-local.mjs — the wish worker, running here, against the real models.
//
//   node demo/wish-local.mjs            # :8799
//
// 🔴 WHY THIS EXISTS RATHER THAN `wrangler dev`. MEASURED 2026-09-21 on this
// machine: `wrangler dev` with an `ai` binding must open a REMOTE session, and
// backgrounded without a terminal it dies with `write EPIPE` every time. A page
// that can only be demonstrated by a person holding a terminal open in the
// foreground is a page nobody runs twice.
//
// 🔴 IT IS NOT A STAND-IN. `demo/fake-station.mjs` and `demo/fake-err.mjs` are
// nobody's radio and nobody's broadcaster; this calls the real Workers AI and
// spends the real account. It exists so the page has somewhere local to talk
// to, and it shares `workers/wish/src/wish.mjs` with the deployable Worker so
// the prompt and the schema cannot drift into two answers.
//
// ⚠️ THE CREDENTIAL IS THE ONE WRANGLER ALREADY HAS. It reads the OAuth token
// out of wrangler's own config, which is how `npx wrangler deploy` authenticates
// on this machine. It is never logged and never leaves this process except as an
// Authorization header to Cloudflare.
// ⚠️ AND THE REPOSITORY'S `.env` TOKEN IS THE WRONG ONE: measured, it answers
// **401** on Workers AI, because a Cloudflare API token is permission scoped and
// that one is not scoped for AI. The OAuth session carries `ai (write)`.
//
// 🔴 **AND THAT TOKEN LASTS ONE HOUR, WHICH THIS FILE USED TO NOT KNOW.**
// MEASURED 2026-09-21: `const TOK = token()` sat at module load, so the process
// read the credential once when it started and never again. The config said the
// token had expired at 01:30:11Z while the clock read 05:39:13Z, four hours
// later, and every `POST /wish` answered `{"error":"Authentication error"}`,
// which is Cloudflare's own words for a credential that has run out. Everything
// else about the server was fine: it was listening, it was routing, and a
// request with too few ports still came back with the right complaint. **A
// process that is correct for its first hour and wrong for every hour after it
// is the worst shape there is**, because the thing that changed is the clock,
// and the report a reader gets sends them to look at the process.
~~~

### reload

Above `const MODULE = new URL('../workers/wish/src/wish.mjs', import.meta.url);`, lines 46 to 79 before the cut.

~~~js
// ── which build is answering ────────────────────────────────────────────────
//
// 🔴 **THIS PROCESS USED TO IMPORT `wish.mjs` ONCE AND SERVE THAT COPY
// FOREVER, AND IT COST TWO SEPARATE DIAGNOSES IN ONE DAY.** A static
// `import { handle }` is read when the process starts, so every edit to the
// prompt, the schema, the payload shaping or the relabeller was invisible until
// somebody remembered to restart, and **"still broken" and "the fix never
// loaded" are the same observation**. That is the failure `CLAUDE.md` names as
// the worst shape there is: the thing that changed is not in the code anybody
// is looking at.
//
// ✅ **SO IT IS STAMPED AND IT RELOADS.** The boot line says which build is
// answering, every request checks the file's modification time and size, and a
// changed module is re-imported before it is used, with a line saying so. The
// stamp is `<mtime>-<size>` rather than a git sha, because the thing being
// attributed is a file on this disk that is usually uncommitted while it is
// being worked on.
// ⚠️ A RE-IMPORT WITH A NEW QUERY LEAVES THE OLD MODULE IN THE REGISTRY. Node
// has no way to evict one, so a session of forty edits holds forty small
// modules. That is the price of the thing above and it is worth it on a
// development agent.
//
// 🔴 **AND THE RELOAD REACHES `wish.mjs` AND NOT WHAT `wish.mjs` IMPORTS,
// WHICH COST A THIRD DIAGNOSIS ON 2026-09-21.** That file gained an import of
// `demo/shell/bay.mjs` that day, so the vocabulary now arrives from outside its
// own directory. Node caches a module by URL: a new `?v=` makes a fresh
// `wish.mjs` and its static import of `bay.mjs` resolves to the copy already in
// the registry, however old. Editing `bay.mjs` and asking again answered
// **`Cannot read properties of undefined (reading 'length')`**, which names
// neither file and reads as a bug in the request.
// ✅ **SO BOTH FILES ARE STAMPED AND THE SECOND ONE IS REPORTED RATHER THAN
// RELOADED**, because there is no way to evict it: the line says the vocabulary
// on disk is newer than the one answering, and says to restart. A wrong answer
// that explains itself is worth more than a clever reload that is subtly stale.
~~~

### session

Above `function session() {`, lines 129 to 133 before the cut.

~~~js
/**
 * What wrangler's config says right now: the token, when it runs out, and the
 * plain sentence to show somebody if there is nothing usable in there.
 * ⚠️ `why` IS THE HALF THAT GETS PRINTED. `tok` never is.
 */
~~~

### refresh

Above `async function refresh() {`, lines 148 to 166 before the cut.

~~~js
/**
 * Have wrangler mint a new access token. It refreshes its own when it finds one
 * expired and rewrites the config file, so the cheapest command that makes it
 * happen is asking it who it is. MEASURED: the file's md5 changes and
 * `expiration_time` moves an hour forward.
 *
 * ⚠️ **NOTHING HERE TOUCHES THE REFRESH TOKEN.** Doing the OAuth exchange
 * ourselves could rotate it out from under wrangler and break `npx wrangler
 * deploy` for every other thing on this machine.
 *
 * 🔴 **THE WORKING DIRECTORY MUST NOT BE THIS REPOSITORY, AND `env -u` IS NOT
 * ENOUGH.** MEASURED 2026-09-21: `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN
 * npx wrangler whoami` in the repository root answers *"You are logged in with
 * an User API Token"*, because wrangler reads `.env` out of the working
 * directory itself and this repository's `.env` carries `CF_API_TOKEN`. That is
 * the token measured at 401 on Workers AI, so a refresh run there refreshes
 * nothing and exits 0. The same command from an empty directory answers *"You
 * are logged in with an OAuth Token"* in 1.6 s.
 */
~~~

### swallowed

Above `await exec(cmd, args, { cwd: NO_DOTENV, env, timeout: 90_000, maxBuffer: 1 << 20`..., lines 178 to 180 before the cut.

~~~js
// ⚠️ THE OUTPUT IS SWALLOWED ON PURPOSE. It carries the account id and
// the scope list, and the rule on this file is that nothing about the
// credential is printed.
~~~

### token

Above `async function token() {`, lines 199 to 203 before the cut.

~~~js
/**
 * The token for THIS request, rather than for the request that happened to
 * arrive first. An expired one is refreshed before it is used, and if that
 * cannot be done the error says what expired, when, and what re-mints it.
 */
~~~

### run

Above `async function run(model, payload) {`, lines 241 to 251 before the cut.

~~~js
/**
 * The one thing that differs from the Worker: how a model is reached.
 *
 * 🔴 **CLOUDFLARE IS THE ONLY THING THAT CAN SAY A CREDENTIAL IS DEAD**, so a
 * refusal buys exactly one refresh and one retry. The expiry in the config is a
 * good guess and it is only a guess: a token can be revoked, and a config can
 * carry no `expiration_time` at all, and in both of those the clock check above
 * sees nothing wrong.
 * ⚠️ AND THE RECOVERY IS BOUNDED. One retry per call, and `refresh()` runs one
 * subprocess however many requests are waiting on it.
 */
~~~

### pass-on

Above `throw new Error(body?.errors?.[0]?.message || 'HTTP ${r.status}');`, lines 279 to 281 before the cut.

~~~js
// ⚠️ EVERY OTHER MESSAGE IS PASSED ON RATHER THAN REPLACED. Cloudflare's own
// text said `Failed to decode base64 audio data` while this was being built,
// and an agent that answered `the model failed` would have hidden it.
~~~

### origin

Above `http.createServer((req, res) => {`, lines 288 to 291 before the cut.

~~~js
/* ⚠️ THE ORIGIN RULE IS THE DEPLOYED WORKER'S, READ OUT OF THE ONE MODULE
   RATHER THAN TYPED AGAIN HERE. It allows every localhost port, so nothing
   about working on this machine changes, and it means a page that works here
   cannot be refused out there for a reason this file never knew about. */
~~~

### vocab-drift

Above `const drift = vocabDrift();`, lines 305 to 309 before the cut.

~~~js
/* 🔴 AN IMPORTED MODULE THAT WENT STALE SAYS SO ONCE. `wish.mjs` reloads
   and `bay.mjs` underneath it cannot, so the only honest thing is to
   name the file and the remedy in the log this session is already
   reading. Measured on the day the import was added: without this the
   symptom was a TypeError naming neither file. */
~~~

### stamp

Above `await wish();`, lines 333 to 335 before the cut.

~~~js
/* 🔴 THE BUILD STAMP, PRINTED BEFORE ANYTHING IS ASKED OF IT. Without it a
   report about this agent cannot be attributed to a version of the module it
   runs, which is the rule every device log in this project already follows. */
~~~

### no-refuse

Above `const s = session();`, lines 339 to 342 before the cut.

~~~js
// ⚠️ THIS REPORTS AND DOES NOT REFUSE TO START, WHICH IS THE OTHER HALF OF
// READING THE CREDENTIAL PER REQUEST. Somebody can run `npx wrangler login`
// while this is up and the next call picks it up, so a missing session is a
// line to read rather than a process that will not boot.
~~~

### expired

Above `else if (s.exp && s.exp <= Date.now()) console.log('  credential   the wrangler `..., lines 346 to 348 before the cut.

~~~js
// ⚠️ AN EXPIRED SESSION SAYS SO. Printing `good to <a time this morning>` is
// how a boot line reports the exact fault it is there to catch as if it were
// health.
~~~

## `demo/connect-e2e.mjs`

### connect-e2e

Written 2026-10-15 from a scratch script that found three /connect/ defects in one run
(device 1291ae in pub's log): a failed or refused request wiped the standing patch, a
`patch` transform on an audio link refused the whole answer, and the grain ring booted into
a suspended context. It drives the real page against the real model through
`demo/wish-local.mjs`, so it costs money (kimi-k2.6, about $1.06 per 1000 asks, under a cent
a run) and is never in a suite: no harness may import or start it.

- **Unbuffered.** Every line is a `writeSync(1, ...)`, so a run piped to a file or `tail`
  shows each step as it happens rather than all of them at exit.
- **A step has 90 s.** A step that times out stops its run (it may still be pressing keys)
  and the rest read `skipped`.
- **INFRA is not FAIL.** A step whose page log says the worker, the network or a timeout was
  the cause (`nothing answered`, `Failed to fetch`, a 5xx, the model not answering) is INFRA.
  A refusal of the model's answer (`could not be made`) is a FAIL: the model or the page.
- **Chrome is closed on every path**: `launchChrome` kills it on exit and on a signal, and the
  script's own `finally` closes it.


<a id="fake-kbd"></a>

## `demo/fake-board.mjs` the keyboard

2026-10-15, for `/devices/keys/`. The stand-in announces the MK-425C (an ALSA row `MK-425C USB MIDI Keyboard` in its graph facts) and runs the board's own `createKeyboardService` into the stand-in Circuit through `inputs.mjs`'s gate. Its device is a stream a page plays with `fake.kbd.play { bytes }`, a verb only the stand-in answers, replying `fake.kbd.played { reading, written, state }` with the messages the gate let through for that play. The real board has no such verb, so nothing can inject notes into the Circuit. It also answers `screen.patch` with `ok: false`, *a stand-in board has no screen*, so a page asking does not wait out its timeout.
