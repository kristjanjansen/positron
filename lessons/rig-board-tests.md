# rig-board-tests

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/board/camera-test.mjs`

### camera-test-header

Above `import { spawnSync } from 'node:child_process';`, lines 1 to 18 before the cut.

~~~js
// rig/board/camera-test.mjs: camera.mjs on a laptop, no camera, no Pi, no relay.
//
//   node rig/board/camera-test.mjs
//
// What it grades: the two listings are read right (and a Pi's own codec nodes
// are never taken for a camera), the splitter cuts real encoder output into one
// unit per frame with the keyframes marked, and the room logic starts the
// camera only for a keyed viewer, only after the relay took the board's key,
// and stops it on the last bye and on silence.
// NEGATIVE CONTROLS, named so the bug they catch would fail them: a splitter
// that cut only at SPS (video.mjs's rule) makes one unit per GOP; a room that
// acted before `cam.key.ok` would start the camera for a message the relay
// never vouched for; a room that counted its own echo as a viewer would never
// stop.
// NOT GRADED HERE: that rpicam-vid on the real board makes this stream, that
// the board has a camera at all, and that the relay drops an unkeyed socket's
// messages (that one is graded against the deployed relay by the session's
// gate check, not here).
~~~

### camera-test-direct

Above `{`, lines 173 to 177 before the cut.

~~~js
// ── the direct path, 2026-10-13 ─────────────────────────────────────────
// NEGATIVE CONTROLS: a gate that checked only the key would attach a page the
// relay never let into the room; one that checked only the viewer would attach
// whoever learned a viewer's name; a board that kept sending through the relay
// to a viewer it serves direct would pay the relay for frames nobody reads.
~~~

## `rig/board/insert-test.mjs`

### it-header

Above `import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';`, lines 1 to 64 before the cut.

~~~js
// rig/board/insert-test.mjs: the granulator a closed tab leaves behind, and the
// board taking it out by itself.
//
// 🔴 WHY THIS FILE EXISTS AT ALL. An insert left in by a `/grains/` tab that
// was simply CLOSED goes on wrapping whatever the next page plays and feeds its
// own delay: MEASURED 2026-09-12, a steady -6.1 dBFS subsonic drone while
// `board.alive` reported `voices: 0`, true about notes and false about sound.
// Until 2026-09-16 the thing that cleared it was `/keys/` sending `fx.pappus
// {on:false, onlyIfIdle:true}` on load. That message is gone, with the last of
// the granulator on that page, so THE BOARD CLEANS UP AFTER ITSELF now. A
// guarantee that used to depend on somebody opening a second page was never a
// guarantee, because nobody had to open one.
//
// The guard lives on the board and the board is the only end that can be
// graded: `/keys/` was `rig/board/listen.html`, retired 2026-09-17 to
// `archive/keys/`. It was `built: false`, it published
// no `__demo` and `demo/verify.mjs` cannot see it. A guard nothing can grade is
// a guard that will rot, so this is the harness.
//
//   node rig/board/insert-test.mjs --room studio-1 --instrument <a JACK instrument>
//
// ⚠️ IT TOUCHES A SHARED INSTRUMENT and it says so: it switches the insert on
// and off a few times and puts it back the way it found it. It needs an
// instrument on the JACK graph, which `fx.pappus` refuses without — so it
// starts one if nothing is playing and reports what it did.
//
// ⚠️ TWO IDENTITIES, NOT TWO SOCKETS OF CONVENIENCE. The whole mechanism turns
// on `from` being per-connection: the board dates every client by when it last
// sent ANY message, and "the tab was closed" is visible to it only as "that
// `from` stopped talking". So the test opens TWO connections. One pretends to
// be `/grains/` (asks for the insert and keeps polling, exactly as that page
// does) and one pretends to be `/keys/` (which now sends nothing at all and only
// watches). One socket doing both would pass vacuously, because a client is
// never held off by its own claim.
//
// ── WHAT THIS PROVES, AND WHAT WOULD MAKE IT FAIL ───────────────────────────
//
//   1  the insert goes in when a page asks, and the board names the holder
//   2  the five-second heartbeat carries it, so a page learns without asking
//   3  NEGATIVE CONTROL: a live page KEEPS its insert past the board's window.
//      A board that swept on a plain timer fails here, and it is the only case
//      that can tell "cleans up after itself" from "drops it after 15 s".
//   4  and a second page merely ARRIVING changes nothing. `/keys/` used to send
//      a message here; it sends none, and the insert must survive that.
//   5  THE DROP: the `/grains/` connection CLOSES and the board takes the
//      insert out on its own, announced on `board.alive`, with nobody asking.
//   6  a new instrument does not come up granulated afterwards.
//   7  a plain `fx.pappus {on:false}` is still obeyed, which is what keeps it a
//      thing a person can type at a wedged board.
//
// 🔴 IT REFUSES BY DEFAULT SINCE 2026-10-13 (exit 2), BECAUSE THE BOARD HAS NO
// INSTRUMENT FOR THE INSERT TO WRAP. It raised Yoshimi, and Yoshimi left the
// board that day (archive/yoshimi/README.md). `fx.pappus` raises the granulator
// only around a JACK INSTRUMENT (board.mjs `inst.jack`, set by `JACK_SYNTHS`,
// which is empty now). The sampler and the Circuit are both on JACK, and
// neither is one: the sampler is `samp`, beside the instrument slot, and the
// Circuit is a hardware input in its own room. So `fx.pappus {on: true}` answers
// `nothing is playing for an insert to wrap` whatever else is playing, and
// every case below would stop at case 1 for a reason that is not the sweep.
// Retargeting to the sampler would not be a swap: it needs the board to let the
// insert wrap the sampler's standing rows, which is board code and a push.
//   node rig/board/insert-test.mjs --room studio-1 --instrument yoshimi
// runs it as it was, for a board that has a JACK instrument again (the README
// says how to bring Yoshimi back).
~~~

### held-ms

Above `const HELD_MS = 15000;`, lines 79 to 82 before the cut.

~~~js
// 📄 `INSERT_HELD_MS` in board.mjs. Read from there in words rather than shared as
// a constant, because this process cannot import the board's copy — so the test
// waits a margin past it and SAYS the number, which is how a disagreement shows
// up as a failure rather than as flake.
~~~

### ask

Above `const ask = async (m, type, ms = 90000) => {`, lines 113 to 120 before the cut.

~~~js
/**
 * Ask, and wait for the answer to THIS question.
 *
 * ⚠️ MATCHED ON `re`, NEVER ON TYPE ALONE. The relay broadcasts, so a reply
 * to somebody else's `fx.pappus` — or their QUESTION, which carries the same
 * type — arrives here too. `grains` learned this the expensive way and
 * reported "10 nudges in 1 s" about a board that had moved 2,800 times.
 */
~~~

### board-tab

Above `const boardTab = await client('as-board');`, lines 148 to 151 before the cut.

~~~js
// 🔴 CONNECTED AND SILENT FOR THE WHOLE RUN. This is what `/keys/` is now: a page
// that joins the room and asks the board for nothing about the granulator. If a
// check below needed it to speak, the thing being graded would not be the board
// cleaning up after itself.
~~~

### something

Above `let status = await grainsTab.ask({ type: 'audio.status' }, 'audio.started', 1000`..., lines 154 to 156 before the cut.

~~~js
// ── something for the insert to wrap ──────────────────────────────────────
// ⚠️ `fx.pappus` REFUSES WITH NOTHING ON THE JACK GRAPH, so a test that skipped
// this would measure a refusal for the wrong reason and call it arbitration.
~~~

### case-2

Above `{`, lines 175 to 180 before the cut.

~~~js
// ── 2. the heartbeat carries it, so a page learns without asking ──────────
// 🔴 THE WHOLE REPORTING HALF TURNS ON THIS, AND SO DOES CASE 5. A page that
// has to ASK finds out when it next polls; a page that is told finds out in
// five seconds, and the page that needs telling is the one that did NOT make
// the change. `/keys/` reads nothing about the insert any more, so this channel
// is now what `insert-test` itself watches.
~~~

### case-3

Above `{`, lines 188 to 198 before the cut.

~~~js
// ── 3. THE NEGATIVE CONTROL: a live page keeps its insert ─────────────────
//
// 🔴 WITHOUT THIS, CASE 5 PASSES ON A BOARD THAT SIMPLY DROPS THE INSERT AFTER
// FIFTEEN SECONDS WHATEVER IS HAPPENING. That board would be worse than the bug
// it replaced: `/grains/` would lose the granulator under itself every quarter
// minute while somebody was listening to it. So the claim being graded is not
// "it goes away", it is "it goes away WHEN AND ONLY WHEN nobody is holding it".
//
// ⚠️ IT POLLS THE WAY `/grains/` DOES AND NO FASTER: `params.state` on a 4 s
// interval, which is that page's own `setInterval`. A test that talked
// continuously would prove something no real page does.
~~~

### case-4

Above `ok('the board half sent nothing at all, so what held the insert was the grains h`..., lines 213 to 216 before the cut.

~~~js
// ── 4. and a second page ARRIVING changes nothing ───────────────────────
// `/keys/` used to send `fx.pappus {on:false, onlyIfIdle:true}` right here, on
// connect. It sends nothing now, and this is the assert that says so: if this
// half ever speaks again, the case above stops being about the board.
~~~

### case-5

Above `{`, lines 222 to 232 before the cut.

~~~js
// ── 5. THE DROP: a closed tab, and the board clearing up after it ─────────
//
// 🔴 THIS IS THE FAULT THE WHOLE FILE IS ABOUT. The socket CLOSES, which is
// what a tab being shut looks like from the relay. The relay says nothing about
// it, because `workers/relay/src/index.js` forwards frames verbatim, never
// parses one, and its `webSocketClose()` is an empty method. The board
// sees only that a `from` stopped talking.
//
// ⚠️ NOBODY ASKS FOR THIS. The watching half sends no message; it waits for an
// unprompted `board.alive`. A check that asked would be grading the reply to its
// own question rather than the board acting on its own.
~~~

### case-6

Above `{`, lines 249 to 259 before the cut.

~~~js
// ── 6. a new instrument does not come up granulated ──────────────────────
//
// `startAudio` re-patches a switched-on insert onto whatever comes up, which is
// right for the page holding it and is how a closed tab's granulator used to
// end up wrapping the next person's instrument. The board sweeps at the top of
// that call too, so the five seconds between the drop and the next heartbeat
// are not audible either.
//
// ⚠️ THIS ASSERTS THE PROPERTY, NOT THE RACE. Beating the heartbeat from
// outside the board is not something this can time reliably, so what is checked
// is the thing that matters: the instrument comes up with no insert on it.
~~~

### case-7

Above `{`, lines 267 to 272 before the cut.

~~~js
// ── 7. the negative control for the other direction ──────────────────────
//
// 🔴 WITHOUT THIS, EVERY CASE ABOVE PASSES ON A BOARD THAT STOPPED PUTTING THE
// INSERT IN AT ALL. A fresh connection claims it, and a plain switch-off is
// still obeyed, which is what keeps `fx.pappus {on:false}` a thing a person can
// type at a wedged board.
~~~

### exit-note

Above `console.log('  ⚠ the board will drop it again about ${HELD_MS / 1000} s after th`..., lines 288 to 290 before the cut.

~~~js
// ⚠️ AND THE BOARD WILL TAKE IT STRAIGHT BACK OUT when this process exits,
// because a closed socket is exactly what case 5 is about. Said here so the
// next reader does not report it as a bug.
~~~

## `rig/board/jack-bay-live.mjs`

### jack-bay-live-header

Above `import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';`, lines 1 to 42 before the cut.

~~~js
// rig/board/jack-bay-live.mjs: the bay half of the JACK arm, run against the
// real board, graded on the far side of the wire.
//
//   node rig/board/jack-bay-live.mjs                 the Circuit into the capture, and back out
//   node rig/board/jack-bay-live.mjs --pappus        REFUSED since 2026-10-13 (exit 2), see below
//   node rig/board/jack-bay-live.mjs --sabotage      never make the link; the level asserts must go red
//
// Written 2026-10-11 (plans/plan-nodes-revisited.md §3 item 3). What it asserts
// is never a drawn wire and never a command having run:
//   - the JACK graph READ BACK by the board after `jack.link` and `jack.unlink`;
//   - the SOUND arriving in the board's main room (`studio-1`, the capture's
//     stream) while the Circuit plays a note, against the same note with the
//     link absent, which is the negative control that proves the level check
//     can fail.
//
// 🔴 IT PLAYS THE CIRCUIT. Note on and note off on channel 1 through the input's
// own gate (`midi.send`, inputs.mjs `midiVerdict`), 400 ms each, and CC 123 at
// the end. No SysEx, no program change, nothing that writes the instrument.
// ⚠️ IT CHANGES THE ONE JACK GRAPH ON THE BOARD for about a minute. Whoever is
// listening to `studio-1` hears the Circuit in it while the link is up. It
// restores what it found: the link is unlinked, and a sampler it had to start
// is stopped again.
//
// 🔴 THE SAMPLER HOLDS THE CAPTURE, SINCE 2026-10-13. Until then this raised
// Yoshimi so that `posboard` existed, and Yoshimi left the board that day
// (archive/yoshimi/README.md). The sampler is the swap because it is the one
// engine left that raises the shared capture and stands in it (its standing
// rows, `possampler:out_1/2 -> posboard:input_1`, jacksynth.mjs
// `setStandingRows`), so every READ BACK below asks the same question it asked
// of Yoshimi's two ports: does a bay link sit beside the board's own rows and
// leave them alone. It plays no note on the sampler, so the main room's floor
// is the sampler idle and the Circuit is the only thing that can lift it.
// It stops the sampler at the end if it started it.
// ⚠️ WHAT THE SWAP COSTS. The board's own CHAIN is an instrument's (`inst`),
// and the sampler is not one, so with only the sampler up `jack.graph` reads
// `chain.intact: false` by construction and `jack.rebuild` refuses (`nothing is
// playing on the JACK graph`). The chain checks therefore read the diff
// (`missing` and `extra` empty, the capture present) rather than `intact`, and
// §5 item 6 (a re-patch keeps the link) is asserted as the refusal it is now:
// nothing moved, the link still on the graph. `--pappus` REFUSES (exit 2):
// `fx.pappus` raises the granulator only around a JACK instrument
// (`inst.jack`), and the board has none since Yoshimi left.
~~~

## `rig/board/live-test.mjs`

### live-test-header

Above `import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';`, lines 1 to 11 before the cut.

~~~js
// rig/board/live-test.mjs — drive a running board over the REAL relay and check
// that what comes back is sound.
//
// The distinction this file exists for: "frames are arriving" and "the
// instrument is working" are different claims, and three readings in 2026-09
// confused them — a live, unmuted, enabled audio track carrying digital silence
// looks exactly like a working one from every angle except the samples. So the
// check is RMS before a note against RMS after it.
//
//   node board.mjs --room board-test &
//   node live-test.mjs --room board-test
~~~

### live-test-ping

Above `send({ type: 'board.ping' });`, lines 57 to 64 before the cut.

~~~js
// ⚠️ THIS CHECK COULD NOT PASS BETWEEN 2026-09-16 AND 2026-09-18, AND IT
// WAS NOT THIS FILE'S FAULT. The board's pong carried an `at` field, `at`
// was then an envelope field, `format()` threw on the collision, and the handler
// answered `board.error` instead. So the reply never arrived and this read
// as a board that was not there. The board sends `pongAt` now.
// ⚠️ THE FIELD IS NOT READ HERE AND MUST NOT BE. The board's clock and this
// process's clock share no origin, so a round trip is only measurable in
// ONE clock: see `relay-compare.mjs`, which times it in its own.
~~~

## `rig/board/midi-back-test.mjs`

### midi-back-test-header

Above `import { EventEmitter } from 'node:events';`, lines 1 to 9 before the cut.

~~~js
// rig/board/midi-back-test.mjs: the Circuit's macro knobs, read back and told
// to the room, graded with no board, no ALSA and no relay.
//
//   node rig/board/midi-back-test.mjs
//
// Negative controls are marked NEGATIVE: each is written so the bug it names
// would fail it. What is NOT graded here: that the Pi's raw MIDI input really
// carries the Circuit's hand turns (measured on the Mac through Web MIDI only,
// research/measured-devices-2026-09-20.md), and the real relay.
~~~

### midi-back-test-direct

Above `{`, lines 134 to 136 before the cut.

~~~js
// ── on a direct link too, 2026-10-13 (remote/010 direct) ────────────────────
// A page on the direct path hears a hand turned macro on its own `ctl`, marked
// `path: 'direct'`, so it need not wait for the relay's copy and can drop it.
~~~

## `rig/board/pappus-test.mjs`

### pappus-test-header

Above `import { rollPappus, driftValues, driftTarget, mulberry32, PARAMS, MODES, DRIFT,`..., lines 1 to 8 before the cut.

~~~js
// rig/board/pappus-test.mjs — the roll and the drift, with no board, no JACK and
// no sound card. Both are pure functions, which is why they can be checked at
// all; the parts that talk to sclang are checked on the board by ear and by the
// frame rate, not here.
//
// Two of these are NEGATIVE CONTROLS — they run the OLD formulas and require
// the check to REJECT them. A check nobody has seen fail is a check you do not
// know you have.
~~~

### pappus-test-3b

Above `{`, lines 58 to 59 before the cut.

~~~js
// 3b. NEGATIVE CONTROL — the OLD roll, verbatim, must be rejected by the check
//     above. Without this the check could be vacuous.
~~~

### pappus-test-6

Above `{`, lines 100 to 100 before the cut.

~~~js
// 6. A character actually constrains — drone is slow, shatter is not.
~~~

### pappus-test-7

Above `{`, lines 114 to 115 before the cut.

~~~js
// 7. The rest of the chain is rolled too — dropping it to gain characters
//    would have been a regression, so it is asserted rather than assumed.
~~~

### pappus-test-8

Above `{`, lines 128 to 129 before the cut.

~~~js
// 8. NEGATIVE CONTROL — the chord selector the old roll used is always true, so
//    one of its two chords could never be chosen. Run it and show it.
~~~

### pappus-test-11

Above `{`, lines 167 to 168 before the cut.

~~~js
// 11. The voices are rolled — but they are a separate block, so a caller with a
//     keyboard attached can decline them without declining the rest.
~~~

### pappus-test-centre

Above `console.log('\n== the centre the drift circles ==');`, lines 244 to 249 before the cut.

~~~js
// ── the centre the drift circles ─────────────────────────────────────────────
//
// A page that sets its sound directly instead of rolling a die still needs the
// slow movement to have something to move AROUND. `driftTarget` is the pure
// half of that: which raw engine commands name a parameter the drift moves.
// The socket half is checked on the board, by the nudge count climbing.
~~~

### pappus-test-16

Above `{`, lines 282 to 284 before the cut.

~~~js
// 16. A centre of one parameter is a legal centre — a page sets `mscan` before
//     it has set anything else, and the drift must move that and say nothing
//     about the five it has never been told.
~~~

### pappus-test-archive

Above `console.log('\n${pass}/${pass + fail} green${fail ? '  (${fail} FAILED)' : ''}\n`..., lines 292 to 302 before the cut.

~~~js
// 🔴 A SECTION CALLED "GENTLE WITH THE ARCHIVE" STOOD HERE AND LEFT ON
// 2026-09-16, WITH THE THING IT WAS GENTLE WITH. It counted requests against a
// stubbed `fetch` and proved three real properties of the ERR path: the 1965
// search was read from disk rather than re-asked, an excerpt already cut was
// not cut again, and a refusal produced a backoff rather than another request.
// All three were bought after ERR blocked this board on 2026-09-11.
//
// The whole path went instead of the tests. `archive/box-pappus/pappus-err.js`
// has the code those checks were about, and the checks themselves are in
// `git show 141d7f3^:rig/board/pappus-test.mjs`. If anything here ever talks to
// somebody else's archive again, take them back out of there first.
~~~

## `rig/board/relay-compare.mjs`

### relay-compare-header

Above `import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';`, lines 1 to 23 before the cut.

~~~js
// rig/board/relay-compare.mjs — the same board, the same protocol, two relays.
//
//   node relay-compare.mjs --room r --relay ws://localhost:8895
//   node relay-compare.mjs --room r                       (ws.positron.studio)
//
// Two numbers, both measured in THIS process's clock so no cross-process clock
// comparison is involved — the board's `performance.now()` and ours share no
// origin and subtracting them would be meaningless.
//
//   ping    board.ping -> board.pong. The control plane: what steering costs.
//           ⚠️ THIS NUMBER WAS UNMEASURABLE FROM 2026-09-16 TO 2026-09-18 and
//           the failure looked like a dead room. The board's pong carried an
//           `at` field, `at` was then an envelope field, `format()` threw on the
//           collision, and the board answered `board.error`. So `await
//           reply('board.pong')` timed out and this file exited saying `no
//           board.pong`. The board sends `pongAt` now. The timestamp in it is
//           still ignored here, deliberately: the two clocks share no origin,
//           so `performance.now()` around the round trip is the only honest
//           measurement of it.
//   sound   note.on -> the first audio frame that is actually loud. This is
//           the one you FEEL, and it includes the synth, the framing and both
//           directions. Identical on both relays, so the difference between
//           the two runs is the relay and nothing else.
~~~

### relay-compare-quiet

Above `let quiet = 0, sawQuiet = false;`, lines 82 to 87 before the cut.

~~~js
// ⚠️ Wait for CONFIRMED quiet, and discard the round if it never came.
// The first version let the timeout fall through, so a note was sent
// while the previous one still rang and the very next frame counted as
// its onset — reporting 0.9 ms, which is less than one frame and less
// than the trip the note has to make. An impossible minimum is the
// signature of a measurement catching the tail of the thing before.
~~~

## `rig/board/test.mjs`

### t-header

Above `import { parseAconnect, addressable, resolve, plan, apply, listPorts, CARRY, sou`..., lines 1 to 7 before the cut.

~~~js
// rig/board/test.mjs — the patchbay's checks, against a fixture, no hardware.
//
// Everything the board does BEFORE it touches a rig — parse, name, validate — is
// pure, so it is checkable on a laptop. What is left needing the board is
// exactly: real ports, real sound, unattended boot. Those are named in the
// README rather than faked here, because a fake that passes is worse than a
// gap that is written down.
~~~

### t-ambiguity

Above `is('ambiguity is refused', resolve('virtual', ports).ok, false);`, lines 59 to 60 before the cut.

~~~js
// Two VirMIDI clients match "virtual" — the whole point is that this REPORTS
// rather than picks, because picking wrong is silent.
~~~

### t-carry

Above `is('carry is the bay vocabulary', CARRY.join(','), 'note,cc,bend,touch,program,c`..., lines 87 to 88 before the cut.

~~~js
// 2026-10-03: one kind list with bay.mjs. The old spellings must still be
// UNDERSTOOD (a saved patch), which a rename alone would have broken silently.
~~~

### t-fixture

Above `const fixed = listPorts({ fixture: true });`, lines 100 to 103 before the cut.

~~~js
// Explicitly the fixture. Reading the LIVE backend here crashed this suite on
// arm64 Linux, where `aconnect` exists but the sequencer does not — the tests
// must not need a working sound stack to check code that has nothing to do
// with one.
~~~

### t-jack-banner

Above `// ── the JACK audio graph ─────────────────────────────────────────────────────`, lines 120 to 121 before the cut.

~~~js
// The Yoshimi section (the bank map reader, yoshimi.mjs) left on 2026-10-13 and
// is in archive/yoshimi/test-half.mjs with the module it grades.
~~~

### t-jack

Above `console.log('jack: the connection list');`, lines 123 to 131 before the cut.

~~~js
// ── the JACK audio graph ─────────────────────────────────────────────────────
//
// 🔴 THE PART OF THE RECOVERY VERBS A LAPTOP CAN GRADE, AND THE REST IS NAMED
// AS UNVERIFIED IN THE README. `jack.graph` and `jack.rebuild` were written
// 2026-09-18 against a board that does not answer ssh from here, so nothing
// below has met a JACK server. What it does check is the half where the bugs
// would be silent: a parser that drops a line reports a healthy graph about a
// broken one, and a chain that calls a drifted graph intact is a recovery verb
// that does nothing and says it worked.
~~~

### t-ghost

Above `const ghostRows = parseJackLsp('ghost:out_1\n   posboard:input_1\n${jackText.rep`..., lines 169 to 173 before the cut.

~~~js
// `setBayRows` is what `jack.link` hands over. The same stray as above, made
// on purpose from a page, is wanted rather than cut, so `jack.rebuild` and
// `fx.pappus` keep it. Four asserts, two NEGATIVE CONTROLS.
// A real graph lists the stray as a port of its own as well, which is what the
// bay's "is it on the graph" test reads.
~~~

### t-made

Above `const made = jackChain({ ...yosh, insert: true, source: true, graph });`, lines 195 to 199 before the cut.

~~~js
// 🔴 THE ONE A REBUILD COULD SILENTLY UNDO. `/grains/` unplugs the instrument
// from the granulator on purpose, because scsynth sums its input bus with the
// generated material. A rebuild that put it back would restore a third sound
// neither end can describe, and every readout would go on saying the two were
// comparable.
~~~

### t-jack-mjs

Above `console.log('jack.mjs: the real board, parsed');`, lines 224 to 230 before the cut.

~~~js
// ── jack.mjs: the JACK arm of the patchbay ──────────────────────────────────
//
// Graded against text read off the Pi on 2026-10-11 (`jack_lsp -c` and
// `jack_lsp -c -p -t`), not against the hand-written fixture above, which is a
// graph that never existed. NEGATIVE CONTROLS are marked: each is written so
// the bug it names would fail it, because a plan that always answers ok and an
// apply that always says it worked would pass every positive check here.
~~~

### t-tone

Above `const tone = (amp, secs = 0.5) => {`, lines 373 to 375 before the cut.

~~~js
// The Fast Track Pro sent big endian under an S16_LE label (2026-09-30).
// Stereo tones at the levels measured that day: a quiet Circuit (peak 18,
// with a little noise), a loud one, and the open input beside it.
~~~

### t-period

Above `is('with a 10 ms period, never the 125 ms default', spawned[0].args.includes('--`..., lines 443 to 443 before the cut.

~~~js
// negative control: ALSA's own default here was 6000 frames, 125 ms of lump
~~~

### t-input-jack

Above `const jc = parseInputs(JSON.stringify({ circuit: { device: 'hw:CARD=Pro,DEV=0', `..., lines 461 to 464 before the cut.

~~~js
// ── an input on JACK, 2026-10-11 (inputs.mjs `via: "jack"`) ───────────────
// Fourteen asserts, five NEGATIVE CONTROLS. What is graded is the order of
// things and what each process is asked for; whether alsa_in really puts the
// Circuit on the graph at the right level is measured on the Pi, not here.
~~~

### t-jackd-card

Above `const one = parseInputs(JSON.stringify({ circuit: { device: 'hw:CARD=Pro,DEV=0',`..., lines 510 to 515 before the cut.

~~~js
// ── 2026-10-11, the owner: *"what is goin on with jack?"*. alsa_in bridged a
// card on its own clock into a jackd on the Pi's timer and resampled the
// difference; the floor went from -80 to -19 dBFS over minutes. With jackd
// ON the card there is one clock. Graded here: the config, the server's
// arguments, the port names and the input's bridge. Whether it is CLEAN is
// measured on the Pi over ten minutes, never here.
~~~

### t-yoshimi

Above `// Who feeds Yoshimi, off 'aconnect -l'. The second listing is the shape of`, lines 550 to 550 before the cut.

~~~js
// Yoshimi's instance edits and command line left on 2026-10-13: archive/yoshimi/test-half.mjs.
~~~

### t-seq

Above `const seqHead = "client 0: 'System' [type=kernel]\n    0 'Timer           '\n   `..., lines 552 to 553 before the cut.

~~~js
// Who feeds Yoshimi, off `aconnect -l`. The second listing is the shape of
// the 2026-10-11 defect: Search had subscribed it to the Circuit (44:0).
~~~

### t-synth-cc

Above `const synthRows = CIRCUIT_CC.filter((p) => p.ch === '1/2');`, lines 621 to 624 before the cut.

~~~js
// ── the synth control changes, widened 2026-09-30 for /shape/ ──────────────
// Graded against the table /shape/ sends from, row by row, so a gate that
// lost a controller the page can move goes red here rather than as a silent
// slider in another building.
~~~

### t-dump-request

Above `const REQ = (loc) => [0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x40, loc, 0xF7];`, lines 658 to 661 before the cut.

~~~js
// ── ONE SysEx, the Current Patch Dump Request, since 2026-10-11 ─────────────
// 📄 Programmer's Reference Guide 1.3 p13: F0 00 20 29 01 60 40 <00|01> F7,
// "9 bytes in total". Matched byte for byte, never by prefix. Every negative
// control below is a shape that differs from it in one place.
~~~

### t-inquiry

Above `const INQ = [0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7];`, lines 687 to 689 before the cut.

~~~js
// ── and the SECOND one, the universal Device Inquiry, since 2026-10-11 ─────
// Asked *"Add it and test"*, to learn whether this Circuit answers SysEx at
// all. Device id 7F (all call) only.
~~~

### t-nonblock

Above `is('the raw device is opened write only and non-blocking', flags[0], FS_C.O_WRON`..., lines 721 to 723 before the cut.

~~~js
// MEASURED on the board 2026-10-03: a blocking open waits forever while a
// sequencer subscription holds the Circuit. Asserted on the flags, not the
// name of a mode string, so a revert to 'w' goes red here.
~~~

### t-busy

Above `const lines = [];`, lines 734 to 735 before the cut.

~~~js
// ⚠️ NEGATIVE CONTROL: a busy device is a logged failure, never a throw
// out of the handler and never a hang.
~~~

### t-trigger

Above `{`, lines 851 to 856 before the cut.

~~~js
// ── a fake that behaves like snd-usb-audio, and a Circuit that answers fast ──
// MEASURED 2026-10-11 on the board: bytes reaching an input that is open but
// not yet triggered by a read are DROPPED in the kernel, and the Circuit's
// identity arrives before a poll 10 ms after the write. So this fake answers
// AT the write and drops the answer unless the input has been read since it
// was opened. Taking the pre-write read out of `askBack` turns these red.
~~~

### t-camera

Above `ctl.recv(JSON.stringify({ type: 'rtc.ping', id: 'pp', t: 5 }));`, lines 992 to 992 before the cut.

~~~js
// ── the Pi camera on the same link, 2026-10-13 (camera.mjs attachDirect) ──
~~~

### t-overtake

Above `ctl.recv(JSON.stringify({ type: 'cam.direct', id: 'c2', key: 'K', viewer: 'v1' }`..., lines 1014 to 1014 before the cut.

~~~js
// MEASURED 2026-10-13 on the Pi: the ask arrived before the channel did.
~~~

### t-main

Above `is('a main socket note is keyed by node, channel and note', noteKey({ type: 'not`..., lines 1066 to 1067 before the cut.

~~~js
// Found 2026-10-11: /concepts/sampler/035/ offered in studio-1 and the main
// socket had no handler, so it waited 3 s for nothing. These are that socket.
~~~

### t-beat

Above `console.log('\nbeat: the graph on the hello and on every beat');`, lines 1177 to 1181 before the cut.

~~~js
// ── what the board says about itself ────────────────────────────────────────
// `board.hello` and `board.alive` carry `graph` since 2026-10-04 (plans/
// plan-universal-routing.md §11 step 3). Built from the board's own facts: the
// aconnect fixture above, the BOARD_INPUTS in HANDOFF.md, and the instrument
// map the hello sends.
~~~

### t-unplugged

Above `const gone = graphOf({ ...graphFacts, midiPresent: () => false });`, lines 1209 to 1210 before the cut.

~~~js
// 2026-10-04: an unplugged Circuit was still offered as a MIDI input. The
// input's sound stays (the audio interface is there); its MIDI in goes.
~~~

### t-shader

Above `is('no video path means no shader node', graphOf({ ...graphFacts, gpu: false }).`..., lines 1216 to 1217 before the cut.

~~~js
// The GPU's node is `shader` since 2026-10-14 (the catalogue's name), so the
// check asks for the id the board announces and its positive control beside it.
~~~

### t-size

Above `const bytes = Buffer.byteLength(JSON.stringify(alive));`, lines 1241 to 1242 before the cut.

~~~js
// 🔴 THE RELAY CARRIES THIS EVERY FIVE SECONDS, so its size is a number to
// watch. MEASURED 2026-10-04 on this fixture: see the line printed below.
~~~

### t-jack-facts

Above `const jackFacts = { ...graphFacts, jack: true,`, lines 1246 to 1247 before the cut.

~~~js
// 2026-10-11: the JACK ends add the granulator, the capture and a `jack` list
// on Yoshimi and on the Circuit, and the beat carries all of it.
~~~

### t-sampler

Above `{`, lines 1256 to 1260 before the cut.

~~~js
// ── the sampler's piano (sampler.mjs): the sfz writer and the fetch ─────────
// The browser pages and the Pi must play one key from one recording, so the
// rule (nearest, tie goes lower) is graded by brute force against a key-by-key
// nearest search, which is a second implementation rather than the same
// arithmetic restated.
~~~

### t-scsampler

Above `{`, lines 1308 to 1311 before the cut.

~~~js
// ── the SuperCollider sampler (scsampler.mjs), option b ─────────────────────
//
// What decides whose sound stops, and every rule a key is played by, with a
// fake scsynth. 27 asserts below, 11 of them NEGATIVE CONTROLS.
~~~

### t-collide

Above `{`, lines 1491 to 1499 before the cut.

~~~js
// ── the collide engine (scollide.mjs), plans/plan-pi-supercollider-defs.md step 1 ──
// Pure: no scsynth, no board. Every refusal the plan names, the timetag against
// a fixture worked by hand, and the keep list.
// SABOTAGE, MEASURED 2026-10-12 on a scratch copy of the tree, one guard broken
// at a time, reds out of 549: any block class 1 (it was 0 until the PlayBuf
// row below existed, because the compiler cannot emit a foreign class), any
// name 6, the choke dropped 1, a keep list of one port 1, no ahead window 1, no
// late window 3, no Out bus check 1, no text cap 1, no 16 name cap 1, no node
// cap 3, no freesItself check 1, the timetag fraction off by 1000 2.
~~~
