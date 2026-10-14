# timeline-lab

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/lab/audio-field.mjs`

### af-header

Above `import { spawn, execFileSync } from 'node:child_process';`, lines 1 to 76 before the cut.

~~~js
// timeline/lab/audio-field.mjs: what the three signals in plan-audio-shader
// actually produce at runtime, measured on the real page.
//
//   node timeline/lab/audio-field.mjs                      # local server, 60 s
//   node timeline/lab/audio-field.mjs --seconds 90
//   BASE=https://positron.studio node timeline/lab/audio-field.mjs
//   node timeline/lab/audio-field.mjs --json out.json      # keep the raw numbers
//
// It SKIPS CLEANLY when Chrome is absent, when the relay has no station up, or
// when the granulator never boots. Skipping prints why and exits 0. A check nobody
// can run is a check nobody runs (`csound-oracle.mjs`, same rule).
//
// ── WHY THIS EXISTS, AND WHY IT IS NOT A SHADER ────────────────────────────
//
// `plans/plan-audio-shader.md` §8 makes a measurement the first commit, and §2.3
// says why:
//
//   "The parameter row is on the NEAR side of the wire and the grain row is on
//    the FAR side, and a good-looking field will hide the difference. If the
//    shader shows `size` moving, that proves `setInterval` ran, not that
//    scsynth heard anything."
//
// That is `createMidiLane`'s `scheduled()` in a new medium: it counted what the
// page QUEUED and read identically to delivery while every note was being
// scheduled fifty-six years out. So every number below is labelled by WHICH
// SIDE OF THE WIRE it was counted on, and §4 exists only to make the two
// disagree on purpose.
//
// ── THE FOUR TAPS, AND WHERE EACH SITS ─────────────────────────────────────
//
//   1. `/pgrain`          FAR.  A second listener on the engine's own `in`
//                         event. The page's `onReply` consumes `/pgrain` from
//                         the reply ring, but SuperSonic's emitter holds a SET
//                         of listeners and calls all of them, so ours sees the
//                         raw message the page saw: `[addr, nodeID, replyID,
//                         pos, dur, voice, half]`.
//   2. `eng.send`         NEAR. Wrapped, so every `/n_set` and `/n_setn` the
//                         page writes is timestamped as it leaves. This is
//                         exactly what the plan's row 2 would draw.
//   3. `scope.feed`       NEAR of the audio boundary. `meterTick` calls it with
//                         the SAME `Float32Array` it just read off the page's
//                         analyser, as its last act, so wrapping it gives the
//                         frame clock and the exact samples with no second
//                         timer and no second analysis.
//   4. `/s_get` replies   FAR. Our own listener timestamps them on arrival.
//                         ⚠️ NOT `eng.sendAndWait`, whose `waitFor` polls the
//                         reply array every 10 ms. That quantum is larger than
//                         the thing being measured, and it would have been
//                         reported as the answer.
//
// ⚠️ WE DO NOT EDIT THE PAGE. The analyser capture is installed with
// `Page.addScriptToEvaluateOnNewDocument`, which patches
// `AudioContext.prototype.createAnalyser` before any page script runs; the rest
// is monkey-patching after load. So this measures `/archive/radio/` as deployed,
// which is the only version worth measuring.
//
// ── TWO THINGS THE ENGINE SOURCE GIVES US FOR FREE ─────────────────────────
//
// READ `rig/board/norns/Engine_Pappus.sc:849`:
//     SendReply.ar(vtrig * report, '/pgrain', [pos, dur, i, half]);
// and `:682`:
//     dur = Lag.kr(msize, lagt).clip(0.002, 8).min(winspansec);
//
// 🔴 So `/pgrain`'s `dur` is `msize` AFTER the 20 ms one-pole and after two
// clips. It is not a copy of what the page sent; it is what the audio used.
// That makes the grain row a far-side echo of one parameter, already on the
// wire, with no new plumbing. It is the sharpest near/far instrument this page
// has. §4 uses it alongside `/s_get`, because the two see different
// things: `/s_get` reads the control BEFORE the lag at millisecond resolution,
// `dur` reads it AFTER the lag at the grain rate.
//
// ⚠️ AND `/s_get` CANNOT SEE THE LAG AT ALL. It answers with the control value
// scsynth holds, which is the input to `Lag.kr(…, 0.02)` and not its output. A
// latency measured through it is a floor: the audio is a further ~60 ms behind
// (three time constants), INFERRED, and §4 prints it as such rather than
// folding it into a measured number.
~~~

### af-lanes

Above `async function readLanes() {`, lines 105 to 114 before the cut.

~~~js
// ══ 0 · the lanes, read from the page rather than typed here ═══════════════
//
// 🔴 A SHARED MEASUREMENT IN TWO FILES IS A MEASUREMENT THAT WILL DISAGREE
// (CLAUDE.md, `--sld-col`). The spec table that decides what a modulation MEANS
// lives inside `startModulator`'s closure in `demo/archive/radio/index.html` and is
// not exported, so it is extracted from the source by brace matching rather
// than copied. If the block moves or stops being a plain literal this says so
// and the report falls back to engine units. It never quietly substitutes a
// table of its own, because a lane table that has drifted would make every
// "fraction of its lane" number below wrong in a way nothing could see.
~~~

### af-preflight

Above `if (!existsSync(CHROME)) skip('no Chrome at ${CHROME}');`, lines 153 to 153 before the cut.

~~~js
// ══ 0b · preflight ═════════════════════════════════════════════════════════
~~~

### af-peers

Above `const peers = (() => {`, lines 165 to 167 before the cut.

~~~js
// 🔴 COUNT THE OTHER BROWSERS BEFORE BLAMING THE NUMBERS. Same rule
// `verify.mjs` prints: a second Chrome of your own competes for bandwidth and
// for relay sockets, and the result reads as a finding about the page.
~~~

### af-server

Above `let server = null;`, lines 176 to 176 before the cut.

~~~js
// ══ 0c · a server, unless we are told to use the deploy ════════════════════
~~~

### af-chrome

Above `let PROFILE; let SWEPT = 0;`, lines 187 to 190 before the cut.

~~~js
// ══ 0d · Chrome, on a port and a profile the OS chose ══════════════════════
//
// A fixed port is a shared mutable global and so is a shared profile (CLAUDE.md
// twice over), so both are per-run and the port is read back from the profile.
~~~

### af-autoplay

Above `'--autoplay-policy=no-user-gesture-required', '--mute-audio',`, lines 202 to 204 before the cut.

~~~js
// NEVER LET SOUND GATE THE WORK: `AudioContext.resume()` and `play()` both
// wait on a gesture in a real browser and NEITHER REJECTS, so a headless run
// without this hangs rather than failing (CLAUDE.md).
~~~

### af-capture

Above `await S('Page.addScriptToEvaluateOnNewDocument', {`, lines 257 to 263 before the cut.

~~~js
// ══ 1 · the analyser capture, before any page script runs ══════════════════
//
// The page never hands its analyser to anything a probe can reach, and the six
// followers are computed from it. Patching the constructor is the only way in
// that does not edit the page. And which analyser is WHICH is then settled by
// MEASUREMENT rather than by creation order (§2 below), because an order is a
// fact about today's source and the file is being edited by somebody else.
~~~

### af-bar

Above `let pressed = null;`, lines 283 to 287 before the cut.

~~~js
// The page starts listening from the transport bar's own click and from nowhere
// else. `startListening` is wired into the bar in the capture phase. ⚠️ AND
// THE BAR IS NOT THERE AT LOAD: this page builds its controls only once the
// station probe has answered, so a fixed wait is a race that reports "no
// control" about a page that is still coming up. Poll for it.
~~~

### af-toggle

Above `pressed = await ev('(() => {`, lines 291 to 297 before the cut.

~~~js
// ⚠️ `.tbar-toggle` FIRST, AND THE NAME IS NOT THE ONE `verify.mjs` USES.
// That harness presses `.pos-controls button, .tbar-x`; `tbar-x` is the class
// for an EXTRA button a page adds to the bar (READ
// demo/shell/transport-bar.mjs:136), and the play/pause control is
// `tbar-toggle` (READ :115). This page declares no controls at all, so on
// 2026-09-15 `.tbar-x` matched nothing and the run reported "no transport
// control" about a page that was up and fine.
~~~

### af-wait

Above `let engUp = false;`, lines 308 to 313 before the cut.

~~~js
// ── wait for the engine, and for the page to finish grading itself ─────────
//
// ⚠️ `finish()` PRESSES ITS OWN BUTTONS. The page's self-check holds the
// modulator, clicks `›` and `‹`, and reads a dozen controls back. So a
// measurement started before it lands is measuring a page that is exercising
// itself. Wait for the assert burst to stop growing.
~~~

### af-shell

Above `const shellN = await ev('window.__demo?.shellAsserts ?? 0').catch(() => 0);`, lines 325 to 332 before the cut.

~~~js
// 🔴 PAST THE SHELL'S OWN ASSERTS, NOT PAST THE FIRST ONE. `mount()` lands two
// asserts at t+0 on EVERY shelled page and publishes the count as
// `__demo.shellAsserts` (READ demo/shell/shell.mjs:272). A wait for "some
// asserts, then quiet" is satisfied by those two in the first second. So the
// first version of this file started measuring forty seconds before the page's
// own `finish()` ran, and `finish()` CALLS `modulator.hold(true)` and clicks the
// patch buttons. The whole parameter row would have been measured on a page that
// was deliberately holding still, and it would have read as a finding.
~~~

### af-logs

Above `const station = await ev('(() => {`, lines 352 to 354 before the cut.

~~~js
// ⚠️ `__demo.logs` HOLDS OBJECTS, NOT STRINGS. They are `{ t, msg, kind }`, so a regex run
// straight over the array matches nothing and returns null, which reads as "the
// page never said" rather than as "we looked in the wrong shape".
~~~

### af-frames

Above `const PRE_FRAMES = await ev('new Promise((ok) => {`, lines 362 to 367 before the cut.

~~~js
// ── 1b · the frame rate BEFORE anything of ours is in the frame ────────────
//
// plan §6.3: "Nobody has measured the headroom", and §8 makes it step 0b. The
// tap below runs INSIDE `meterTick`, so a rate measured after it is installed
// is a rate this script is part of. Measure it first, with a loop that does
// nothing but write a timestamp.
~~~

### af-taps

Above `const TAPS = String.raw'(() => {`, lines 375 to 375 before the cut.

~~~js
// ══ 2 · the taps ═══════════════════════════════════════════════════════════
~~~

### af-phase-a

Above `const patchName = await ev('(() => {`, lines 652 to 652 before the cut.

~~~js
// ══ 3 · phase A, a free run on whatever patch the page came up on ═══════════
~~~

### af-moving

Above `const readoutMoving = await ev('window.__demo?.readout?.moving ?? null').catch((`..., lines 668 to 671 before the cut.

~~~js
// 🔴 THE NEAR SIDE'S OWN CLAIM, READ OFF THE PAGE. `moving` is a count of
// ROUTINGS the modulator holds (READ demo/archive/radio/index.html, `d.set('moving',
// modulator.moving().length)`), which is a fact about what the page intends.
// §2 puts it beside a count of what actually crossed the wire.
~~~

### af-phase-c

Above `const NEARFAR = String.raw'(async () => {`, lines 680 to 683 before the cut.

~~~js
// ══ 4 · phase C, near against far ═════════════════════════════════════════
//
// Four separate questions, and the instrument is checked before any of them is
// believed (CLAUDE.md: a partial result that is too tidy is a broken collector).
~~~

### af-probes

Above `const PROBES = LANES`, lines 829 to 832 before the cut.

~~~js
// The probe list is built HERE, from the page's own lane table, so the value
// written to each control is inside the range that control declares. A probe
// outside a lane would be clipped by the engine and read back as "not held"
// about a control that is perfectly fine.
~~~

### af-phase-b

Above `const PATCH_SECS = 6;`, lines 846 to 853 before the cut.

~~~js
// ══ 5 · phase B, the patch sweep ══════════════════════════
//
// "Which of the 22 numbers actually MOVE" cannot be answered on one patch: the
// patch is the thing that decides. So press the page's own next button twelve
// times and watch the wire. ⚠️ PRESS THE BUTTON, NEVER CALL `applyPatch`. The
// page's own self-check carries that rule and the reason with it (`/floor/`
// spent five rounds on a handler called directly, which steps straight over the
// wiring the check is about).
~~~

### af-one-picker

Above `const nFwd = await ev('${FWD}.length');`, lines 858 to 861 before the cut.

~~~js
// ⚠️ EXACTLY ONE OF THEM, OR PRESS NONE. There is one `createPicker` on this
// page today and the station row is a `createChoice`, but a second picker
// would make `[0]` a different control and the sweep would be a measurement
// of the wrong row with nothing on screen saying so.
~~~

### af-report

Above `const pct = (h, p) => {`, lines 909 to 909 before the cut.

~~~js
// ══ 6 · report ═════════════════════════════════════════════════════════════
~~~

### af-min

Above `const mn = (xs) => xs.reduce((a, b) => (b < a ? b : a), Infinity);`, lines 927 to 929 before the cut.

~~~js
// ⚠️ NOT `Math.min(...xs)`. A spread of sixty thousand grains is a RangeError,
// and it would arrive as "the collector failed" rather than as "the array was
// long". Reduce instead.
~~~

### af-shutdown

Above `async function done(code) {`, lines 1270 to 1274 before the cut.

~~~js
// ── shutdown ───────────────────────────────────────────────────────────────
//
// ⚠️ `kill()` ASKS; IT DOES NOT STOP. CLAUDE.md: a still-shutting-down Chrome
// recreates the profile directory the handler has just deleted, which is a
// cleanup that runs, reports nothing and does nothing. SIGKILL and await exit.
~~~

## `timeline/lab/bench-store.mjs`

### bs-header

Above `import http from 'node:http';`, lines 1 to 10 before the cut.

~~~js
// RETIRED 2026-10-13: `instrument.positron.studio` (workers/instrument) was deleted from Cloudflare on 2026-10-13 (workers/*/RETIRED.md), so what this calls there no longer answers.
// timeline/lab/bench-store.mjs — the store bench: rows x backend x (open, cold
// seek, warm advance, memory). Also owns the synthetic-log fixtures, so
// prop-store.mjs and the bench measure THE SAME BYTES.
//
//   node timeline/lab/bench-store.mjs [--rows 1000000] [--no-do] [--no-http]
//
// Fixtures live outside the repo (STORE_FIXTURES or $TMPDIR/positron-store-fx)
// and are CACHED: a 1M-row log is ~58 MB and takes ~20 s to make once.
// MACHINE RULE: this file's HTTP server binds 8892 (mine), nothing else.
~~~

### bs-gen

Above `export function genRows(n, seed = 7) {`, lines 43 to 44 before the cut.

~~~js
/** Deterministic ascending trace. Same generator for every n, so a 10k log is a
 *  PREFIX of a 1M log in shape (not in values — the gaps differ by seed). */
~~~

## `timeline/lab/cdp-ev.mjs`

### cdp-ev

Above `export class CDP {`, lines 1 to 2 before the cut.

~~~js
// proto/paths/harness/cdp.mjs — minimal CDP client (timeline/lab lineage) with
// EVENT dispatch added, so console errors and exceptions can be counted.
~~~

## `timeline/lab/cdp.mjs`

### cdp

Above `export class CDP {`, lines 1 to 2 before the cut.

~~~js
// timeline/lab/cdp.mjs — minimal CDP client over node's built-in WebSocket
// (jam-harness lineage), plus a browser-endpoint variant for Target control.
~~~

## `timeline/lab/click-worklet.js`

### cw-header

Above `class ClickDetect extends AudioWorkletProcessor {`, lines 1 to 5 before the cut.

~~~js
// timeline/lab/click-worklet.js — timestamps threshold crossings on its own
// render thread with sample resolution. The lane under test feeds one-sample
// impulses into this node; detection time = (currentFrame + i) / sampleRate,
// i.e. the exact context time the sample was RENDERED at — independent of the
// main thread. 20 ms refractory (clicks are 100 ms apart).
~~~

## `timeline/lab/csound-oracle.mjs`

### co-header

Above `import { execFileSync, spawnSync } from 'node:child_process';`, lines 1 to 47 before the cut.

~~~js
// timeline/lab/csound-oracle.mjs — our compiler against the REFERENCE one.
//
//   node timeline/lab/csound-oracle.mjs          # skips cleanly if csound is absent
//   CSOUND=/opt/homebrew/bin/csound node timeline/lab/csound-oracle.mjs
//   CSOUND=timeline/lab/csound-ssh.mjs node timeline/lab/csound-oracle.mjs
//
// WHY THIS EXISTS. `csound-test.mjs` checks the compiler against numbers a human
// derived from the same formula the compiler implements. That catches a typo and
// cannot catch a MISREADING — and on 2026-09-09 it was hiding two real defects
// for the whole life of the file:
//
//   · the tempo ramp. We interpolated TEMPO linearly in beat, making time the
//     logarithmic integral. Csound interpolates SECONDS PER BEAT linearly in
//     beat, making time a trapezoid. On `t 0 120 30 90` that is 17.500 s against
//     our 17.261 — 239 ms — and on `t 0 60 20 180` it is 2.35 s by beat 20.
//   · `^+x`. We resolved it against the previous note of the SAME INSTRUMENT.
//     Csound resolves it against the IMMEDIATELY PRECEDING STATEMENT, whatever
//     instrument that was. `+` and `.` really are per-instrument, so the three
//     shorthands do NOT share a reference note — exactly the sort of thing that
//     has to be measured rather than reasoned about (LESSONS #26).
//
// and on 2026-09-10 three more, all of them about SECTIONS (`s`), which reset
// the clock AND the tempo AND most of the carry. Those are the cases below
// from `sections reset the tempo` down.
//
// HOW, AND WHAT EACH HALF CAN SEE. Csound converts p2/p3 from beats to seconds
// during score sorting, so an instrument that `prints` its own p2 reports the
// reference answer — but that answer is SECTION-LOCAL, and it stays 0.000 for
// the first note of every section however far into the piece that section is.
// A multi-section score therefore needs both:
//
//   · p2 and p3, which are EXACT and grade the tempo map, the carry, `b` and
//     everything else that happens inside one section; and
//   · `times`, the absolute performance clock, which is the only thing that can
//     see the section OFFSET — and which is quantised to one k-period, because
//     csound starts a section on a k-boundary. `ksmps = 1` makes that 1/48000 s
//     (20.8 µs), and the run prints the worst error it actually saw, so
//     "exact" and "within tolerance" do not read the same.
//
// `-n` means no audio, so this is a compiler comparison and never a render.
//
// TRAP, and it cost a round: csound writes ANSI escapes, so a `^EVT` match drops
// most lines — a partial result that looks like a finding rather than like a
// broken filter (LESSONS #45). The escape is written `\\u001b` below and not as
// the raw byte it used to be: a raw control character in source does not
// survive being read out of the file and pasted into a probe, which is how the
// same trap caught the same filter a second time.
~~~

### co-left-off

Above `['a p-field left off the end does not cross a section',`, lines 113 to 116 before the cut.

~~~js
// ...while a p-field merely LEFT OFF does not cross at all. Two carries, two
// rules, and the only way to know that is to ask. It has to be p3 that is
// left off: p4 is zeroed by the OTHER rule, so a p4 probe here reads green
// whichever way this one is wired and would prove nothing.
~~~

### co-open

Above `const KNOWN_OPEN = [`, lines 127 to 128 before the cut.

~~~js
// Known, OPEN divergences — reported rather than omitted, because a suite that
// quietly drops a failing case is how a defect becomes permanent.
~~~

### co-n

Above `['n is a span here and a source rewind there (KNOWN OPEN)',`, lines 130 to 135 before the cut.

~~~js
// Ours: `n name` replays the span from the mark to HERE, in place. Csound's:
// `n` REWINDS THE SOURCE and re-reads from the mark, and it only fires when
// the `n` sits at a section boundary — so this score replays nothing there
// (and trips an internal error inside csound's own backtrace printer).
// Matching it would mean giving up the quotation, which is the reason this
// compiler exists, so the difference is stated instead of split.
~~~

### co-two-t

Above `['two t statements in one section (KNOWN OPEN)',`, lines 143 to 146 before the cut.

~~~js
// Two `t` in one section: csound sorts by the last one and then emits the
// first as a runtime `t`, which re-warps at play time — the two answers it
// gives are not consistent with each other. Ours takes the last, which is
// what the sorted score says.
~~~

### co-path

Above `function csoundPath() {`, lines 154 to 158 before the cut.

~~~js
// Every candidate has to ANSWER, `CSOUND` included. A csound that is named but
// cannot run — a stale path, or `csound-ssh.mjs` pointed at a machine that is
// asleep — would otherwise return zero events for every case, and a whole suite
// of "EVENT COUNT DIFFERS" reads like a compiler that has fallen over rather
// than like a reference nobody could reach.
~~~

### co-stderr

Above `function run(bin2, args) {`, lines 184 to 187 before the cut.

~~~js
// csound writes `prints` output to STDERR, not stdout — which cost a run,
// because execFileSync returns only stdout unless the process throws, so every
// case read back as "csound produced 0 events" and looked like a finding.
// spawnSync hands over both streams whatever the exit code.
~~~

### co-reference

Above `function reference(score) {`, lines 193 to 198 before the cut.

~~~js
/**
 * Csound's own answer for a score, in performance order:
 *   at, dur  — SECTION-LOCAL seconds, exact
 *   p4       — the fourth p-field, which is where the carry rules show
 *   abs      — the absolute clock, quantised to one k-period
 */
~~~

## `timeline/lab/csound-real.mjs`

### cr-header

Above `import { spawnSync } from 'node:child_process';`, lines 2 to 26 before the cut.

~~~js
// timeline/lab/csound-real.mjs — our compiler against the reference, on
// SOMEBODY ELSE'S REAL SCORES.
//
//   node timeline/lab/csound-real.mjs <score.sco> [<score.sco> …]
//   SCSORT_HOST=mbp SCSORT_BIN=/opt/homebrew/bin/scsort node … 
//
// WHY THIS AND NOT `csound-oracle.mjs`. The oracle grades SEMANTICS against
// cases we wrote: each one is a question about the format, and the score exists
// to ask it. This grades a file a composer wrote for a performance, where
// nobody chose what it would exercise. Those catch different things — 42/42
// green here meant nothing while both of the only two real scores in existence
// THREW at line 12.
//
// 🔴 THE REFERENCE IS `scsort`, NOT `csound`, AND IT IS A BETTER ONE. It is the
// score preprocessor on its own: it reads a score and prints it sorted and
// tempo-warped, with NO orchestra, no audio and no `prints` to filter ANSI
// escapes out of. With a `w` (warp) statement in force it writes p2 and p3 each
// as a PAIR — beats first, then seconds — so one run grades the beat arithmetic
// and the tempo map separately, which the orchestra trick cannot do.
//
// ⚠️ AND IT READS STDIN ONLY. MEASURED 2026-09-14: `scsort file.sco` with stdin
// closed prints `f0 800000000000.0 / e` — an EMPTY SCORE, not an error. So
// calling it the obvious way reports that the composer's score has no notes in
// it. That is why this file does not reuse `csound-ssh.mjs`, which ships its
// arguments as files.
~~~

### cr-reference

Above `const HOST = process.env.CSOUND_HOST || process.env.PI_HOST || '';`, lines 32 to 42 before the cut.

~~~js
// 🔴 THE REFERENCE IS PLAIN `csound`, NOT `scsort`, AND THE DIFFERENCE MATTERS.
// `scsort` is the obvious tool and it is a Homebrew-only artefact: Debian's
// csound package ships `cs`, `csbeats`, `csdebugger` and `csound` and NOTHING
// else, so a check built on it cannot run on the Raspberry Pi — the machine that
// is actually always on. MEASURED 2026-09-14: `csound -n -t 0 <orc> <sco>`
// writes the same sorted score to `score.srt` in the working directory, and the
// two outputs are identical on both machines.
//
// ⚠️ `-n` is no audio, so this is a compiler comparison and never a render.
// The Pi is named by the environment and never written here: CSOUND_HOST or
// PI_HOST=<user>@<pi>. With neither set and no local csound, the check skips.
~~~

### cr-orc

Above `const ORC_B64 = Buffer.from(`, lines 46 to 49 before the cut.

~~~js
// An orchestra is required even though nothing is rendered. Sorting happens
// before performance, so an `i` naming an instrument this file does not declare
// still sorts — which is what lets a real score full of `i "countdown"` be
// graded without reimplementing the composer's orchestra.
~~~

### cr-b64

Above `const b64 = Buffer.from(text, 'utf8').toString('base64');`, lines 55 to 59 before the cut.

~~~js
// ⚠️ THE SCORE TRAVELS INSIDE THE SCRIPT, base64, NOT ON STDIN. A remote shell
// reads its own script from stdin, so a `cat > a.sco` inside it consumes the
// script rather than the score — and csound then sorts an empty file and
// prints a score with no notes in it. This exact collision produced the first
// run of this harness: two real scores, '0 events' each, no error anywhere.
~~~

### cr-probe

Above `function referenceWorks() {`, lines 80 to 84 before the cut.

~~~js
// 🔴 A PROBE THAT ACCEPTS EMPTY OUTPUT IS NOT A PROBE. The first version of this
// file treated any non-null answer as "the reference is available", so a wrong
// binary path — `/usr/bin/scsort`, which does not exist on the Pi — reported
// "0 events" for both of the composer's scores and read as a compiler that
// emits nothing. Require a row that could only come from a working reference.
~~~

### cr-hex

Above `function hex(s) {`, lines 90 to 95 before the cut.

~~~js
/**
 * Read scsort's sorted score.
 *
 * ⚠️ Numbers come back as C99 HEX FLOATS (`0x1.8p+1`), which `Number()` does
 * not parse and `parseFloat` reads as 0 — silently, and 0 is a plausible beat.
 */
~~~

### cr-ties

Above `const name = (r) => String(r.p1).replace(/"/g, '');`, lines 131 to 134 before the cut.

~~~js
// ⚠️ TWO STATEMENTS AT THE SAME BEAT ARE NOT IN A DEFINED ORDER, and neither
// side is claiming one — csound sorts by time and so do we, and a tie keeps
// whatever order the file had. Comparing them needs a tiebreak BOTH sides can
// apply, or every tie pairs the wrong rows and reports itself as a defect.
~~~

### cr-pfields

Above `let worstBeat = 0, worstMs = 0, wrongInstr = 0, wrongP = 0, lenDiff = 0;`, lines 179 to 187 before the cut.

~~~js
// 🔴 THE P-FIELDS HAVE TO BE COMPARED TOO, AND THIS IS NOT A NICETY.
// `test.sco` puts its score expressions in p4 and p5 — `[8/3]` as a beat
// count, `[16/3]` as a note value — and NOWHERE in p2 or p3. A check that
// grades only onset and duration is therefore blind in exactly the place the
// composer actually used the feature: measured, with bracket evaluation
// switched off this file still read 2/2 green.
// ⚠️ Compare the OVERLAPPING prefix only. csound writes a trailing 0 after
// some string p-fields and not others, and padding it back is inventing a
// rule; a length difference is reported and does not fail.
~~~

### cr-unquoted

Above `if (String(r.p1).replace(/"/g, '') !== String(m.p1).replace(/"/g, '')) wrongInst`..., lines 191 to 193 before the cut.

~~~js
// 🔴 A named instrument is `"countdown"` on one side and countdown on the
// other; compare unquoted, or every string row reads as a mismatch and the
// real ones get lost in them.
~~~

## `timeline/lab/csound-ssh.mjs`

### cs-header

Above `import { spawnSync } from 'node:child_process';`, lines 2 to 20 before the cut.

~~~js
// timeline/lab/csound-ssh.mjs — run csound on ANOTHER MACHINE, as if it were here.
//
//   CSOUND=timeline/lab/csound-ssh.mjs node timeline/lab/csound-oracle.mjs
//
// WHY. The oracle is the only check that can catch a MISREADING of the score
// format, and it is worthless on a machine with no csound. This machine has
// none; a Mac on the LAN does. So this stands in for the binary: it takes the
// same argv, ships any argument that names a LOCAL FILE over ssh, runs the real
// csound there, and prints its stdout and stderr back.
//
//   CSOUND_SSH_HOST   ssh destination           (default: mbp)
//   CSOUND_SSH_BIN    csound path ON THAT HOST  (default: /opt/homebrew/bin/csound)
//
// The remote path must be ABSOLUTE: a non-interactive ssh shell gets a minimal
// PATH with no /opt/homebrew/bin in it, so a bare `csound` is "command not
// found" — which reads as "csound is broken" rather than "the PATH is short".
//
// Files travel base64 INSIDE the one ssh command rather than by scp, so a probe
// costs one round trip and leaves nothing behind on either machine.
~~~

## `timeline/lab/csound-test.mjs`

### ct-header

Above `import { compileCsound, csoundPart, tempoMap, parseCsoundScore, repeatsAsQuotati`..., lines 1 to 10 before the cut.

~~~js
// timeline/lab/csound-test.mjs — the compiler, and the claim it exists to make.
//
//   node timeline/lab/csound-test.mjs
//
// The claim (demo/notes/uuu-positron.md §3) is not "we can parse Csound". It is
// that a vClick score compiled into rows gains the two things the format does
// not have: a repeat that is a REFERENCE, and a fold at any position — so
// "start at bar 47" is a computation rather than a rehearsal discipline.
// The last two tests are that claim; the ones before it are the arithmetic it
// stands on, and the ramp is the one that would fail silently.
~~~

### ct-3

Above `{`, lines 41 to 49 before the cut.

~~~js
// ── 3. THE RAMP. Seconds-per-beat is linear in beat ⇒ time is a TRAPEZOID. ──
// MEASURED against csound 6.18, not derived. `t 0 120 30 90` puts beat 30 at
// 17.500 s. Three models disagree and only one is Csound's:
//     trapezoid on 60/tempo   17.500 s   <- Csound
//     linear-in-tempo (log)   17.261 s   <- what this file shipped until 09-09
//     mean tempo              17.143 s
// The old comment warned that the mean-tempo shortcut lands notes "118 ms
// early". That 118 ms was the gap between two WRONG answers; the real error was
// 239 ms, and on `t 0 60 20 180` it was 2.35 s by beat 20.
~~~

### ct-steep

Above `const t2 = tempoMap([[0, 60], [20, 180]]);`, lines 62 to 63 before the cut.

~~~js
// A steeper ramp, chosen because the three models predict 13.333 / 10.986 /
// 10.000 — so one run separates them.
~~~

### ct-4

Above `{`, lines 84 to 91 before the cut.

~~~js
// ── 4. carry and the p2 shorthands ─────────────────────────────
// Every number here is csound 6.18's answer for this exact score, and the point
// is that the three shorthands do NOT share a reference note:
//     +    the previous note OF THIS INSTRUMENT, its end
//     .    the same p-field of the previous note OF THIS INSTRUMENT
//     ^+x  the IMMEDIATELY PRECEDING STATEMENT's start, any instrument
// Selected by p5 rather than by index, because the rows are sorted by time and
// an index assert silently follows whichever note moved.
~~~

### ct-5

Above `{`, lines 110 to 115 before the cut.

~~~js
// ── 5. SECTIONS. `s` is a new clock, not just a new zero. ──────────────────
// Every number below is csound 6.18's own answer for that exact score, read
// off `timeline/lab/csound-oracle.mjs`. The defect these replace was two
// seconds wide and shipped green for months, because one global tempo map
// across a score that resets its tempo is wrong in a way no self-consistent
// test can see.
~~~

### ct-later

Above `const back = compileCsound('i 1 0 1\ni 1 4 1\ns\nt 0 240\ni 1 0 1\ni 1 4 1');`, lines 132 to 132 before the cut.

~~~js
// A LATER tempo does not reach back either — section 1 stays at 60.
~~~

### ct-length

Above `const len = compileCsound('t 0 120\ni 1 0 8\ni 1 1 0.25\ns\ni 1 0 1');`, lines 147 to 148 before the cut.

~~~js
// A section is as long as its longest note ENDS, in warped seconds — 4 s at
// 120 bpm for eight beats, not 8, and not the 0.5 s where its last note starts.
~~~

### ct-f

Above `const held = compileCsound('b 5\ni 1 0 1\nf 0 10\ns\ni 1 0 1');`, lines 152 to 152 before the cut.

~~~js
// and an `f` holds it open past that — `b` shifting the f as well as the note
~~~

### ct-tail

Above `const tail = compileCsound('i 1 0 1 777 888\ni 1 2 1\ns\ni 1 4 1');`, lines 169 to 169 before the cut.

~~~js
// a p-field simply left off the end is carried too — but only within a section
~~~

### ct-5b

Above `{`, lines 176 to 177 before the cut.

~~~js
// ── 5b. THE SECTION CLOCK, and the one axis a document has ────────────────
// Three sections, two ramps, a base and an f. Csound's answer at every onset.
~~~

### ct-mechanism

Above `const cp = csoundPart(SCORE);`, lines 188 to 192 before the cut.

~~~js
// THE MECHANISM, not a downstream effect: a score document carries ONE beat
// axis and one tempo map, and csound's sections each start again at beat 0.
// `csoundPart` lays them end to end and spells each boundary as two points at
// the same beat. If that is wrong, `partItems` puts the rows somewhere else —
// so assert THAT, rather than re-reading the numbers above.
~~~

### ct-8

Above `{`, lines 240 to 244 before the cut.

~~~js
// ── 8. THE FOLD. Seek-from-anywhere, on a compiled score. ──────────────────
// This is the one the note argues for: the score itself carries no state, so
// "what is in force at bar 47" is unanswerable from the file. Compiled into
// rows, it is deck.reduceAt(kind, pos) — and it is exact at every probe, not
// only where a cue happens to sit.
~~~

## `timeline/lab/firewall.mjs`

### fw-header

Above `import { createDeck, createVirtualRuntime } from '../transport.mjs';`, lines 2 to 25 before the cut.

~~~js
// timeline/lab/firewall.mjs — THE FIRE-SIDE FIREWALL: the proof, and the price.
//
//   node timeline/lab/firewall.mjs [--json] [--baseline <path/to/pre-v0.7/transport.mjs>]
//
// plan-timeline §8.8 left the evidence firewall READ-SIDE ONLY: "nothing stops
// a derived lane from FIRING under 'attested', so an evidence-only performance
// is the adapter's job". This file is the gate's evidence, in the shape the
// read side already set:
//
//   the read side proved  — under 'attested' the error is bit-identical to a
//                           plain hold, and dropping 1,674 derived rows leaves
//                           the master trace and the audit bit-identical.
//   the fire side proves  — the ACTUATION TRACE of an 'attested' deck holding
//                           twelve derived lanes is BIT-IDENTICAL to the trace
//                           of a deck that never had them, and to the trace of
//                           the same deck after the lanes were physically
//                           dropped. Three decks, one string.
//
// Everything runs on the virtual runtime (deterministic, zero wall-clock flake)
// except §D's cost measurement, which is wall-clock by necessity and uses a
// FRACTIONAL cadence — a past session in this repo presented a single locked
// phase sample as a distribution (cues at exactly 15.000 s = exactly 150 poll
// periods) and "improved" cue sync 59 -> 16 ms by measuring the same instant
// over and over. Nothing here samples on a tick multiple.
~~~

### fw-fixture

Above `function buildPiece({ clock, newHost, evidence, iters = DIS_ITERS, loopMs = 2000`..., lines 66 to 72 before the cut.

~~~js
// ===========================================================================
// THE FIXTURE — proto/loops' disintegration, with the adapter's hand-written
// gate REMOVED. loops.mjs closes the hole by hand inside actuate()
// (`if (ev.maxTier < tier) return`), which is exactly the thing that was the
// adapter's job; this fixture reuses its constants (PARTIALS, tierOf, METHOD)
// and does NOT close it, so what is measured below is the LIBRARY's gate.
// ===========================================================================
~~~

### fw-a

Above `log('\nA. THE HOLE (negative control: the shipped read-side-only firewall)');`, lines 147 to 149 before the cut.

~~~js
// ===========================================================================
// A. THE HOLE — the negative control, on the pre-v0.7 code.
// ===========================================================================
~~~

### fw-b

Above `log("\nB. BIT-IDENTICAL ACTUATION — three decks, one string");`, lines 189 to 191 before the cut.

~~~js
// ===========================================================================
// B. BIT-IDENTICAL ACTUATION — the fire side's answer to the read side's proof.
// ===========================================================================
~~~

### fw-c

Above `log('\nC. DISINTEGRATION INVARIANCE — inventedFraction 0 -> 90.6 %, the performa`..., lines 232 to 234 before the cut.

~~~js
// ===========================================================================
// C. DISINTEGRATION INVARIANCE — twelve repetitions, one performance.
// ===========================================================================
~~~

### fw-d

Above `log('\nD. THE PRICE — what the gate costs the hot path');`, lines 281 to 284 before the cut.

~~~js
// ===========================================================================
// D. THE PRICE — the wall lane's scan is latency-critical (25 ms tick /
// 100 ms horizon). Three arms, all on a FRACTIONAL cadence.
// ===========================================================================
~~~

### fw-baseline

Above `if (BASELINE) {`, lines 368 to 381 before the cut.

~~~js
// The gate against the PRE-v0.7 code, if a baseline was supplied.
//
// METHOD, and it is the point of this arm: a DIFFERENCE OF TWO p50s over this
// workload gave +11.4 %, +0.8 %, +9.8 %, +10.7 % and +5.5 % on the SAME two
// builds — five "measurements" of one number, spanning an order of magnitude.
// That is the repo's own locked-phase trap wearing a different hat, so this
// arm does two things instead:
//   1. PAIRED DIFFERENCES — A and B run back to back inside one rep (order
//      alternating) and the DIFFERENCE is the sample, so a thermal ramp or a
//      GC pause lands on both halves of the pair;
//   2. A SAME-MODULE NEGATIVE CONTROL — the baseline benchmarked against a
//      byte-identical copy of itself, loaded as a second module instance.
//      Whatever that control reports is this benchmark's floor, and no effect
//      smaller than it may be claimed.
~~~

### fw-e

Above `log('\nE. THE POLICY MOVES WHILE IT PLAYS');`, lines 429 to 431 before the cut.

~~~js
// ===========================================================================
// E. THE POLICY MOVES WHILE IT PLAYS — G4.
// ===========================================================================
~~~

### fw-f

Above `log('\nF. deck.assertState(kind, state, info)');`, lines 498 to 501 before the cut.

~~~js
// ===========================================================================
// F. deck.assertState — G5. The cost of verifying, and the drift channel it
// deliberately does not touch.
// ===========================================================================
~~~

### fw-g

Above `log('\nG. THE LOOP WRAP × THE GATE');`, lines 565 to 572 before the cut.

~~~js
// ===========================================================================
// G. THE LOOP WRAP — how the gate meets caps.loopState 'carry'/'rearm' and
// adapter.loopWrap(). nested.mjs's wrap does three things in order: tell the
// adapters that asked (loopWrap), re-seek the child, re-assert the CARRY lanes
// at `out`. Only the last two are actuation, so only those are gated — and a
// gated CARRY lane is the interesting cell, because it is the one place a lane
// asks to have state pushed into it at every boundary.
// ===========================================================================
~~~

### fw-carry

Above `child.sched.registerAdapter('lv~d', {`, lines 587 to 588 before the cut.

~~~js
// the derived lane declares CARRY too — it has the reduce+assertState pair,
// so nested will try to assert it at `out` on every wrap
~~~

### fw-h

Above `log('\nH. THE OFFLINE RENDER');`, lines 620 to 627 before the cut.

~~~js
// ===========================================================================
// H. THE OFFLINE RENDER — does the gate come along for free?
// `offlineDeck()` is `createDeck()` on a render runtime, so it uses the same
// createScheduler and SHOULD inherit the gate. "Should" is a hypothesis; this
// makes it a result. The claim under test is §B's, one domain over: a rendered
// 'attested' deck must be byte-identical to a render of the same deck with no
// restoration in it.
// ===========================================================================
~~~

## `timeline/lab/midi-recv.mjs`

### mr-header

Above `import midi from 'midi';`, lines 1 to 6 before the cut.

~~~js
// timeline/lab/midi-recv.mjs — virtual MIDI destination (the ~/personal/midi
// pattern) timestamping arrivals on the truth clock. Writes JSONL rows
// {note, vel, tUs} to the file given as argv[2]. Calibrates its own epoch-µs
// clock against the lab server's /time-local (min-RTT), so page-send stamps
// and arrival stamps share one base.
//   node midi-recv.mjs /path/out.jsonl
~~~

## `timeline/lab/mobile-verify.mjs`

### mv-header

Above `import { spawn, execSync } from 'node:child_process';`, lines 2 to 25 before the cut.

~~~js
// RETIRED 2026-10-13: `rtc.positron.studio` (workers/rtc) was deleted from Cloudflare on 2026-10-13 (workers/*/RETIRED.md), so what this calls there no longer answers.
// timeline/lab/mobile-verify.mjs — the VIEWING surfaces, driven by a FINGER.
//
//   node timeline/lab/mobile-verify.mjs [surface…] [--shots]
//
// Every page in this repo was built and verified on a 1400x900 headless desktop
// with a mouse. This harness is the other half: CDP device emulation
// (Emulation.setDeviceMetricsOverride + setTouchEmulationEnabled) and REAL
// touch streams (Input.dispatchTouchEvent) — never a resized window, because a
// resized window still has a mouse, `hover:hover`, `pointer:fine`, dpr 1 and no
// visual viewport, and it is exactly those four that break a phone.
//
// Devices: iPhone-class 390x844 @3x and small-Android 360x800 @2x, both
// orientations. ONE Chrome, one tab, per-surface server on that surface's own
// assigned port, killed on the way out.
//
// Asserts, per surface:
//   M1  no horizontal PAGE overflow (scrollWidth <= clientWidth) in all 4 modes
//   M2  every primary control is >= 44 px on its short axis
//   M3  a real two-finger PINCH changes pxPerSecond about the MIDPOINT
//       (the time under the midpoint must not move)
//   M4  a one-finger DRAG pans the strip and does NOT scroll the page
//   M5  a TAP seeks to the tapped time (px error, not ms error)
//   M6  zero console errors / page exceptions
~~~

### mv-devices

Above `const DEVICES = [`, lines 45 to 48 before the cut.

~~~js
// ---------------------------------------------------------------------------
// devices. `mobile:true` is what flips `pointer:coarse` / `hover:none` and the
// visual-viewport model — a width override alone does none of that.
// ---------------------------------------------------------------------------
~~~

### mv-paths

Above `paths:       { port: 8887, server: 'proto/paths/server.mjs', path: '/paths.html'`..., lines 63 to 64 before the cut.

~~~js
// the real client, gestures only — proves the component behaves the same when
// it is mounted by somebody else's page
~~~

### mv-static

Above `const STATIC_SRC = '`, lines 95 to 98 before the cut.

~~~js
// ---------------------------------------------------------------------------
// a static server with no deps, for the surfaces that have no server of their
// own. Serves the repo root so `/timeline/*` resolves the shared library.
// ---------------------------------------------------------------------------
~~~

### mv-touch

Above `const tp = (x, y, id) => ({ x: Math.round(x), y: Math.round(y), id, radiusX: 12,`..., lines 117 to 121 before the cut.

~~~js
// ---------------------------------------------------------------------------
// touch primitives — REAL streams, not synthetic JS events. A synthesized
// TouchEvent would bypass touch-action, hit-testing and pointer capture, which
// are precisely the three things under test.
// ---------------------------------------------------------------------------
~~~

### mv-touch-end

Above `await touchEnd(cdp);`, lines 170 to 175 before the cut.

~~~js
// BOTH fingers lift in one event. CDP's contract is explicit — "TouchEnd and
// TouchCancel must not contain any touch points" — and a touchEnd carrying a
// point is silently dropped, which leaves that pointer id LIVE in the page's
// pointer map. The next one-finger drag then arrives as pointers.size === 2
// and is interpreted as a pinch with a stale anchor: the pan appears to do
// nothing at all. This was a harness bug that read exactly like a product bug.
~~~

### mv-reset

Above `async function resetTouch(cdp, x, y) {`, lines 180 to 184 before the cut.

~~~js
/** Chrome keeps ONE touch state machine per target, and it survives
 *  Page.navigate. After a gesture battery on page A, the first touchStart
 *  dispatched on page C is swallowed — the events are delivered, the page's
 *  listeners never run, and every assert reads "touch does nothing". Cycling
 *  touch emulation resets that machine; the throwaway contact proves it took. */
~~~

### mv-shot

Above `const png = await cdp.screenshot();`, lines 326 to 327 before the cut.

~~~js
// the screenshot is the LANDING state — what a viewer sees on arrival — so it
// is taken before the gesture battery drags the view somewhere arbitrary.
~~~

### mv-on-screen

Above `await cdp.eval('${H}.canvas.scrollIntoView({ block: 'center' })');`, lines 347 to 349 before the cut.

~~~js
// the canvas must be ON SCREEN before a finger can reach it — CDP dispatches
// at viewport coordinates, so an off-screen target silently swallows every
// gesture and every assert reads "nothing happened".
~~~

### mv-ready

Above `let ok = false;`, lines 438 to 441 before the cut.

~~~js
// WAIT FOR ready, do not guess with a sleep: the census fetch finishes with
// fitX(), which overwrites panX/zx wholesale. A gesture dispatched before that
// is real, lands correctly, and is then erased — which reads as "touch does
// nothing" and is the single most misleading failure this harness can produce.
~~~

### mv-hit

Above `const hitEl = await cdp.eval('(() => { const e = document.elementFromPoint(${cx}`..., lines 453 to 457 before the cut.

~~~js
// WHAT IS UNDER THE FINGER — asserted, not assumed. Every "touch does
// nothing" failure in this harness turned out to be either a stale pointer or
// a target that was not where the arithmetic said it was, and both are
// invisible unless you ask the page directly. Asking also costs a round trip,
// which is the settle the freshly-resized stage needed anyway.
~~~

### mv-tab

Above `let tab = null, sess = null;`, lines 533 to 539 before the cut.

~~~js
// ONE TAB PER SURFACE. Chrome's input router lives on the render widget and
// it does not reliably follow a same-tab navigation: after a gesture
// battery on surface A, Input.dispatchTouchEvent on surface B is accepted
// and acknowledged and delivered NOWHERE — the page's own pointerdown
// listener counts zero, and every gesture assert reads as a product bug.
// about:blank between them is not enough; a fresh target is. Still one
// Chrome, and the tab is closed on the way out.
~~~

## `timeline/lab/prop-media-sensor.mjs`

### pms-header

Above `import { createDeck, createVirtualRuntime } from '../transport.mjs';`, lines 2 to 37 before the cut.

~~~js
// timeline/lab/prop-media-sensor.mjs — L4b's SENSOR, and the two ways it can
// lie about a picture that is not moving.
//
//   node timeline/lab/prop-media-sensor.mjs [--verbose]
//
// `timeline/lab/prop-nested.mjs` suite 9 already asserts that a frame sample is
// carried, goes stale, and is rejected across a discontinuity — all of it with
// an element that is PLAYING. This file is the paused half, and it exists
// because that half shipped broken:
//
//   MEASURED on `demo/memento/` (2026-09-13). After a seek with the element
//   PAUSED, the playhead crept forward ~180 ms over the next 250 ms while
//   `currentTime` sat still at the position it had been sent to, then snapped
//   back when the frame sample went stale. It failed the shared `keyboard seek
//   lands` check at `2437 ~ 2225`, and the page worked around it with
//   `useRvfc: false`. The cause: L4b carries a frame sample onto the wall clock
//   as `mediaTime + (wall − expectedDisplayTime) × rate`, and `rate` was read
//   off `playbackRate` alone — WHICH IS 1 ON A PAUSED ELEMENT.
//
// Four checks, and S2/S4 are as important as S1/S3: they are what stops the
// creep being "fixed" by turning the sensor off, which is the repair that makes
// every test here pass and L4b pointless.
//
//   S1  a PAUSED element is not extrapolated          (the reported defect)
//   S2  a PLAYING element still is                    (positive control)
//   S3  while the picture is frozen, a sample older than the last move of
//       `currentTime` is old news and is dropped      (the second guard, which
//                                                      was written down in the
//                                                      file and never wired)
//   S4  …and that test is NOT applied while the picture is moving (positive
//       control: `currentTime` moves every tick during playback and is noticed
//       a tick late, so an unconditional version of S3 switches the sensor off
//       for good — and a fake whose currentTime never changes cannot see it)
//
// Plain node ESM, no deps, no network. Real wall time is the subject here, so
// the sleeps are real and short; the deck runs on the virtual clock as usual.
~~~

### pms-s1

Above `{`, lines 87 to 91 before the cut.

~~~js
// ===========================================================================
// S1 — THE DEFECT. A paused element after a seek: the picture is frozen on one
//      frame, `currentTime` sits on it, and the playhead must sit on it too for
//      as long as nobody presses anything. Before the fix this read ~+150 ms.
// ===========================================================================
~~~

### pms-s2

Above `{`, lines 113 to 117 before the cut.

~~~js
// ===========================================================================
// S2 — POSITIVE CONTROL. The carry is the whole point of L4b (measured: it took
//      365 corrections down to 18 at a 5 ms band). A PLAYING element's frame
//      sample must still be carried onto now at `playbackRate`.
// ===========================================================================
~~~

### pms-s3

Above `{`, lines 135 to 140 before the cut.

~~~js
// ===========================================================================
// S3 — THE SECOND GUARD. Paused, and `currentTime` was moved AFTER the last
//      presented frame (a small scrub — SMALLER than jumpMs, so the existing
//      rejection cannot see it). The frame on the glass is the old one; the
//      only thing that knows where the element was sent is `currentTime`.
// ===========================================================================
~~~

### pms-s4

Above `{`, lines 167 to 176 before the cut.

~~~js
// ===========================================================================
// S4 — POSITIVE CONTROL FOR S3, AND THE TRAP. `currentTime` moves on nearly
//      every tick during playback, and this file notices it a tick LATE (at
//      `wall`, inside tick()). So an UNCONDITIONAL "the frame must be newer
//      than the last currentTime change" test rejects every sample during
//      ordinary playback and switches L4b off for good.
//
//      ⚠️ A fake element whose currentTime never changes passes that broken
//      version. This check moves it, which is the only reason it can fail.
// ===========================================================================
~~~

## `timeline/lab/prop-nested.mjs`

### pn-header

Above `import { createDeck, createVirtualRuntime, createCursor } from '../transport.mjs`..., lines 2 to 18 before the cut.

~~~js
// timeline/lab/prop-nested.mjs — property arms for v0.5:
//
//   suite 6  FRAGMENT QUOTATION   nested.mjs rule 7 (`nest.add({… in, out})`)
//   suite 7  deck.setRange()      transport.mjs v0.5, incl. the CURSOR arm
//
// A SEPARATE FILE from prop-test.mjs on purpose: prop-test.mjs is owned by a
// sibling agent this cycle, so these arms live beside it rather than inside it.
// Same virtual runtime, same determinism, same exit code.
//
//   node timeline/lab/prop-nested.mjs [--verbose]
//   node timeline/lab/prop-nested.mjs --seeds 100    (accepted; these arms are
//                                                     exhaustive, not sampled)
//
// The motivating sentence, from plan-timeline §−1 / C10: *a new work is a score
// that QUOTES archive timelines*. Nobody quotes a whole broadcast. Before this
// suite a nested span could only play the child's WHOLE range, which is the one
// thing a quotation never is.
~~~

### pn-notes

Above `const NOTES = [`, lines 64 to 66 before the cut.

~~~js
// A child worth quoting: five overlapping notes across 4 s, so every fragment
// boundary lands INSIDE at least one held note — the case where "seek to `in`
// and assert" is not the same as "start from silence".
~~~

### pn-6a

Above `{`, lines 114 to 117 before the cut.

~~~js
// ===========================================================================
// suite 6a — the fragment IS the span: length, entry edge, exit edge, exact
//            seek anywhere inside.
// ===========================================================================
~~~

### pn-7a

Above `check('frag-span', 0, Math.abs(sp.parentDur - (OUT - IN) / RATE) < 1e-9,`, lines 128 to 128 before the cut.

~~~js
// 7a — the span occupies (out - in) / rate of PARENT time
~~~

### pn-7g

Above `check('frag-span', 0, String(child.range) === String([0, CHILD_END]),`, lines 136 to 136 before the cut.

~~~js
// 7g — TRIM DOES NOT MUTATE THE CHILD
~~~

### pn-7b

Above `parent.seek(AT - 1);`, lines 142 to 143 before the cut.

~~~js
// 7b — ENTRY asserts at `in`, and `in` is inside a held note, so the reducer
//      must state that edge (not silence).
~~~

### pn-park

Above `check('frag-entry', 0, String(heldNow(sink)) === String(heldAt(IN)),`, lines 147 to 151 before the cut.

~~~js
// NOTE (rule 7b/7c, consequence): absence parks at the FRAGMENT edge, so a
// quotation whose `in` cuts a held event is parked HOLDING it — that is what
// "this quotation opens on a ringing chord" means, and it is the same state
// the quotation will open with. Silence-while-absent is only free when the
// fragment boundary is a silent one.
~~~

### pn-7d

Above `let worst = 0;`, lines 163 to 163 before the cut.

~~~js
// 7d — a parent seek ANYWHERE inside maps to in + (parentPos - at)*rate, exact
~~~

### pn-7c

Above `parent.seek(AT + (OUT - IN) + 500);`, lines 179 to 182 before the cut.

~~~js
// 7c — `out` behaves as the child's END: absent past it, asserted AT out.
//      OUT=2800 sits inside notes 67 and 72, so a WRONG implementation that
//      parked at the deck's end (4000, silence) would still show "nothing
//      held" — this asserts the position, and that the child does not run on.
~~~

### pn-6b

Above `{`, lines 210 to 212 before the cut.

~~~js
// ===========================================================================
// suite 6b — clamping degrades OUT LOUD; in >= out is rejected at add()
// ===========================================================================
~~~

### pn-7f

Above `check('frag-reject', 0, /strictly before/.test(throws(() => nest.add({ id: 'x1',`..., lines 237 to 237 before the cut.

~~~js
// 7f — in >= out rejected AT add()
~~~

### pn-6c

Above `{`, lines 254 to 258 before the cut.

~~~js
// ===========================================================================
// suite 6c — THE POINT OF THE WHOLE THING: the SAME deck quoted TWICE at two
//            different fragments in one arrangement. Timelines referencing
//            timelines: one stored session, two quotations, both correct.
// ===========================================================================
~~~

### pn-both

Above `for (const [id, Q] of [['A', A], ['B', B]]) {`, lines 293 to 295 before the cut.

~~~js
// BOTH PLAY CORRECTLY — the regression a naive "absence parks the child"
// implementation fails: entering B makes A absent, and A's exit would drag
// the shared child back to A's `out` and pause it.
~~~

### pn-between

Above `parent.seek(6000);`, lines 315 to 315 before the cut.

~~~js
// between the two quotations the child IS absent — parked at A's `out`
~~~

### pn-7

Above `{`, lines 337 to 340 before the cut.

~~~js
// ===========================================================================
// suite 7 — deck.setRange(): additive, and it must not disturb the CURSOR,
//           which is now the only positional reader in the library.
// ===========================================================================
~~~

### pn-auto

Above `deck.setRange([0, 9000]);`, lines 366 to 366 before the cut.

~~~js
// items scheduled at runtime + setRange('auto') — the remixer's actual case
~~~

### pn-8

Above `function fakeMedia(t0 = 0) {`, lines 434 to 438 before the cut.

~~~js
// ===========================================================================
// suite 8 — mediaMaster(): the media-element clock-master law, with the
//           NEGATIVE CONTROL that makes the replay-grid bug a measured fact
//           rather than a claim. Same virtual runtime; the element is faked.
// ===========================================================================
~~~

### pn-negative

Above `const firedA = [], foldedA = {};`, lines 466 to 468 before the cut.

~~~js
// --- NEGATIVE CONTROL: the block replay-grid used to run. A discontinuity
//     answered with sync() leaves every skipped cue `pending`, and a
//     catchUp:'burst' lane fires ALL of them on the next tick.
~~~

### pn-release

Above `const firedD = [], foldedD = {};`, lines 537 to 537 before the cut.

~~~js
// --- L3 'release': N tiles — give the role up instead of holding
~~~

### pn-9

Above `function fakeVideo(t0 = 0) {`, lines 555 to 566 before the cut.

~~~js
// ===========================================================================
// suite 9 — L4b: requestVideoFrameCallback.mediaTime as the servo's SENSOR.
//
// The measured reason this law is shaped the way it is (timeline/lab/
// run-sensor.mjs, real headless playback): read as a BARE NUMBER, `mediaTime`
// sits 0.22-0.90 frame AHEAD of `currentTime` — that is display latency, not
// error, and swapping sensors tick-by-tick on it made the servo strictly WORSE
// (corrections 9 -> 380 at a 20 ms band). Carried onto `now` through
// `expectedDisplayTime` — which is what the spec ships the pair for — the same
// playback corrects 365 -> 18 times at a 5 ms band. So the law is: CARRY IT,
// and fall back to currentTime whenever the frame sample cannot be trusted.
// ===========================================================================
~~~

### pn-present

Above `o.presentFrame = (mediaTime, edtOffset = 0) => {`, lines 571 to 573 before the cut.

~~~js
/** deliver one presented frame: mediaTime seconds, shown at `edtOffset` ms
 *  from now in the performance.now() timebase (rVFC's expectedDisplayTime is
 *  in the FUTURE when the callback runs — that is the whole point). */
~~~

### pn-n1

Above `{`, lines 586 to 586 before the cut.

~~~js
// --- N1: NO rVFC (Firefox < 132, every <audio>) — nothing changes at all
~~~

### pn-n4

Above `{`, lines 644 to 645 before the cut.

~~~js
// --- N4: a frame sample from BEFORE a discontinuity must never be carried
//     across it — otherwise the sensor could change which branch L2 takes.
~~~

### pn-10

Above `const MARKS_DEF = [`, lines 681 to 690 before the cut.

~~~js
// ===========================================================================
// suite 10 — A QUOTATION IS A VALUE, and a SCORE ROUND-TRIPS. The C10 property:
//            an arrangement, serialised to JSON, reloaded in a FRESH RUNTIME
//            that has only the bytes and a resolver, plays IDENTICALLY.
//
// "Identically" is not a vibe: the trace below records, at every step of a
// fixed script, the parent position, both children's positions, both children's
// held-note sets, and the full ordered list of every event either child fired.
// Two traces are compared as strings.
// ===========================================================================
~~~

### pn-script

Above `const SCRIPT = [`, lines 697 to 699 before the cut.

~~~js
/** the fixed script both runtimes run — seeks in and out of every span, plays
 *  across boundaries, and ends by scrubbing backwards (the case that found the
 *  park bug in rule 7c). */
~~~

### pn-11

Above `{`, lines 824 to 829 before the cut.

~~~js
// ===========================================================================
// suite 11 — MARKS: content addressing, and the case that is the whole reason
//            for it — A MARK THAT MOVED. The source is re-cut (600 ms of
//            restored leader spliced in front); the score still lands on the
//            music. The numbers it would otherwise have stored do not.
// ===========================================================================
~~~

### pn-12

Above `{`, lines 892 to 897 before the cut.

~~~js
// ===========================================================================
// suite 12 — RULE 9: caps.absentState / silence(). A quotation parked at its
//            edge asserts whatever `in`/`out` cut, so a MIDI actuator holds an
//            edge note for the whole time the span is absent. An adapter may
//            declare how to be silent; the nest never learns what a note is.
// ===========================================================================
~~~

### pn-13

Above `{`, lines 980 to 983 before the cut.

~~~js
// ===========================================================================
// suite 13 — PROVENANCE THAT SURVIVES THE DOOR: three carriers, validated
//            against published field names.
// ===========================================================================
~~~

### pn-13b

Above `{`, lines 1089 to 1089 before the cut.

~~~js
// --- suite 13b: a DECK subject — "these seconds were reconstructed" ---------
~~~

### pn-14

Above `// a child with THREE kinds, because the whole of §8.3 is that they behave`, lines 1117 to 1129 before the cut.

~~~js
// ===========================================================================
// suite 14 — LOOPS (plan-timeline §8; nested.mjs rule 10).
//
// A loop is a QUOTATION WITH REPETITION, so every arm below is the fragment
// suite's arm with `repeat` added and nothing else changed. That is the claim
// being tested: §8.2 says the mechanism already exists and a loop is the same
// affine map with MODULO instead of CLAMP. If any of these needed new
// machinery, the claim was wrong.
//
// The archaeology (research/loops-prior-art-2026-08.md) supplies three of the
// arms directly: the wrap is opt-in (14i), the stop must be exact or `repeat:n`
// lies (14e), and a blur must collapse rather than burst (14f).
// ===========================================================================
~~~

### pn-lnotes

Above `const LNOTES = [{ n: 60, on: 100, off: 400 }, { n: 62, on: 800, off: 1200 }, { n`..., lines 1131 to 1136 before the cut.

~~~js
// a child with THREE kinds, because the whole of §8.3 is that they behave
// differently at the wrap:
//   `note`  EDGE-valued  — re-arms per iteration (caps.valued:'edge')
//   `cc`    LEVEL-valued — carries across the wrap (caps.valued:'level')
//   `ping`  fire-and-forget, NO reducer — tracker's case: nothing to leak, so
//           the wrap does not touch it and it rings across the boundary
~~~

### pn-14a

Above `{`, lines 1183 to 1183 before the cut.

~~~js
// --- 14a — `repeat` IS A FIELD OF THE VALUE ---------------------------------
~~~

### pn-roundtrip

Above `const j = JSON.stringify(q);`, lines 1193 to 1193 before the cut.

~~~js
// THE ROUND TRIP, byte-identical — the same guarantee every other field has
~~~

### pn-repeat-1

Above `check('repeat-value', 0, quotationEquals(quotation({ ref: 'a', repeat: 1 }), quo`..., lines 1203 to 1203 before the cut.

~~~js
// `repeat: 1` and no repeat are THE SAME VALUE — a loop of one is not a loop
~~~

### pn-14b

Above `{`, lines 1223 to 1223 before the cut.

~~~js
// --- 14b — THE MAP: modulo instead of clamp, exact ---------------------------
~~~

### pn-lead

Above `const LEAD = 1e-6;`, lines 1232 to 1236 before the cut.

~~~js
// THE ANALYTIC EXPECTATION. Not "what the code did" — what §8.2's formula says.
// The one deliberate exception is the WRAP LEAD: landing exactly on a
// boundary parks the child a hair (1e-6 ms) BEFORE `in`, so the event sitting
// exactly on `in` is still pending and fires instead of being folded. Every
// other position is exact to the float.
~~~

### pn-one-def

Above `for (const k of [0, 1, 2, 7, 50]) {`, lines 1269 to 1269 before the cut.

~~~js
// loopPhase is the one definition — the nest may not have its own
~~~

### pn-14c

Above `{`, lines 1294 to 1294 before the cut.

~~~js
// --- 14c/14d — THE WRAP: re-seek, edges re-arm, levels carry ----------------
~~~

### pn-stuck

Above `const held = [], ccAt = [];`, lines 1305 to 1306 before the cut.

~~~js
// note 64 is on at child 1500 and off at 3800 — i.e. it is STILL HELD at
// `out`. That is the stuck-note generator: without a re-arm it accumulates.
~~~

### pn-no-stuck

Above `check('loop-stuck', 0, maxHeld <= 2 && everStuckFrom === null,`, lines 1325 to 1326 before the cut.

~~~js
// NO STUCK NOTES, EVER, ACROSS 50+ WRAPS. The child holds at most the notes
// the reducer says are held at that position — never an accumulation.
~~~

### pn-14e

Above `{`, lines 1372 to 1372 before the cut.

~~~js
// --- 14e — THE EXACT STOP (the archaeology's ~1.6 s tail) -------------------
~~~

### pn-hold

Above `const h = loopRig({ ref: 'tape-hold' });`, lines 1394 to 1394 before the cut.

~~~js
// the default (no absentState) HOLDS the edge — rule 9 is unchanged by loops
~~~

### pn-14f

Above `{`, lines 1403 to 1403 before the cut.

~~~js
// --- 14f — the blur collapses, it does not burst ----------------------------
~~~

### pn-blur

Above `const r = loopRig({ ref: 'tape-blur' });`, lines 1405 to 1408 before the cut.

~~~js
// wrap-artefact catalogue: "tab-blur burst is unbounded under an infinite
// loop". It cannot happen here, because the iteration index is a pure
// function of the parent's position and nothing counts wraps to know where
// it is. A 30 s stall under a 2 s loop is ONE re-seek.
~~~

### pn-14g

Above `{`, lines 1425 to 1425 before the cut.

~~~js
// --- 14g — THE RENDERER refuses an unbounded loop ---------------------------
~~~

### pn-render

Above `const hashes = [];`, lines 1451 to 1452 before the cut.

~~~js
// A BOUNDED loop must still RENDER, and render REPRODUCIBLY — a loop may not
// cost determinism. Two renders of the same looped arrangement, byte-identical.
~~~

### pn-fresh

Trailing comment on line 1455 before the cut.

~~~js
const rt = createRenderRuntime(0);      // a FRESH runtime per pass — a render
~~~

### pn-14h

Above `{`, lines 1478 to 1478 before the cut.

~~~js
// --- 14h — THE STORE: a loop is a BOUNDED WINDOW QUERY ----------------------
~~~

### pn-window

Above `const rows = [];`, lines 1480 to 1484 before the cut.

~~~js
// §8.7 feared an infinite loop would pin pages forever. It cannot: a loop
// re-seeks a FIXED fragment, so the window it asks for is the same window
// every pass. What has to be measured is that the loop resolves to a bounded
// WINDOW QUERY and never a full scan — the resident set is then constant
// whatever `repeat` says.
~~~

### pn-14i

Above `{`, lines 1518 to 1518 before the cut.

~~~js
// --- 14i — the wrap is OPT-IN (the archaeology's headline) ------------------
~~~

### pn-optin

Above `const r = loopRig({ ref: 'tape-optin', wrapHeard: true });`, lines 1520 to 1523 before the cut.

~~~js
// tracker schedules `(((beat - startBeat) % len) + len) % len` and has NO
// wrap handler: nothing is reset, re-armed, silenced or faded at pos 0, and
// notes ring across the boundary ON PURPOSE. A lane with no held state must
// not be given a boundary it never asked for.
~~~

### pn-ping

Above `check('loop-optin', 0, r.sink.pings === 6,`, lines 1533 to 1534 before the cut.

~~~js
// `ping` has no reduce/assertState at all — transport's assertAt skips it, so
// the re-seek never touches it and it behaves exactly as tracker's does.
~~~

### pn-14j

Above `{`, lines 1554 to 1554 before the cut.

~~~js
// --- 14j — a loop SURVIVES THE DOOR (score round trip, live) ----------------
~~~

### pn-14k

Above `{`, lines 1602 to 1607 before the cut.

~~~js
// --- 14k — TWO BUGS THE OFFLINE RENDERER FOUND (2026-08-30) -----------------
// Both were invisible to every arm above, and both were invisible for the same
// reason: a virtual clock fires a committed one-shot at EXACTLY its due instant,
// so `deltaMs === 0` and every "is this the top of the pass?" test that compares
// floats for equality passes. Rendering a nest is what put a second, differently
// timed observer on the same code.
~~~

### pn-entry

Above `const AT = 3000, IN = 800, OUT = 2700;      // IN === a note-on in LNOTES`, lines 1609 to 1614 before the cut.

~~~js
// (1) THE ENTRY DOWNBEAT. `assertSpan` took the hair-before-`in` lead only
// when `phaseOf(pos).off === 0` — true on a virtual clock, false in wall-clock
// playback where the enter event fires a few ms late. Result: pass 1, and only
// pass 1, folded its downbeat. Measured as 8 onsets rendered vs 7 played.
// The test therefore has to introduce LATENESS deliberately, which on a
// virtual clock means entering at a position that is not exactly `at`.
~~~

### pn-jog

Above `if (jog) {`, lines 1623 to 1628 before the cut.

~~~js
// MANUFACTURE THE LATENESS. A virtual runtime fires a committed one-shot at
// EXACTLY its due instant, so `parent.position() === at` and the old
// `off === 0` test passed — which is the entire reason this bug survived
// 389 green checks. Stopping the scheduler across `at` and restarting it
// makes the enter arrive through `scan()` as 'tick-late', deltaMs > 0,
// exactly as a real 25 ms tick delivers it in playback.
~~~

### pn-not-entered

Above `const vr = sharedVR(9_000_000);`, lines 1648 to 1654 before the cut.

~~~js
// (2) A SPAN THE PLAYHEAD HAS NOT ENTERED MUST NOT BE STARTED. Found by
// rendering a NEST INSIDE A NEST: an outer wrap seeks the middle deck to
// `in − 1e-6`, which is inside an inner span's window by the eps tolerance but
// BEFORE its enter event — so `adapter.transport` started a child that was
// still parked at `c0`, an event sitting exactly on `c0` fired 'tick-late',
// and then fired AGAIN when the enter actuated and re-seeked a hair earlier.
// Two fires of one event: exactly-once, broken, two levels down.
~~~

## `timeline/lab/prop-render.mjs`

### pr-header

Above `import { createDeck, createTransport, createScheduler, createVirtualRuntime,`, lines 1 to 49 before the cut.

~~~js
// timeline/lab/prop-render.mjs — THE DETERMINISM PROPERTY of the offline
// render mode (timeline/render.mjs, v0.6).
//
//   node timeline/lab/prop-render.mjs                 # 30 seeds
//   node timeline/lab/prop-render.mjs --seeds 100     # 100 seeds
//   node timeline/lab/prop-render.mjs --verbose
//
// Runs in plain node; no browser, no wall-clock flake, no real-time waiting
// (that IS one of the asserts). The audio half is proved here against a STUB
// OfflineAudioContext — enough to prove the SEAM, since the seam is the shim's
// `currentTime`; the real `OfflineAudioContext` buffer hash is measured in the
// browser by timeline/lab/run-render.mjs.
//
// THE PROPERTIES:
//   D1  two renders of the same deck produce a BYTE-IDENTICAL trace
//   D2  the render trace equals real-time playback modulo timing jitter
//       (same events, same order, same count) — against BOTH a real wall
//       clock and an irregularly-advanced virtual one
//   D3  every event in the window fires EXACTLY ONCE, in (at, seq) order
//   D4  frame positions are exact — computed from the integer index, never
//       accumulated
//   D5  the render does not wait: faster-than-real-time by orders of magnitude
//   D6  a deck on a WALL clock is REFUSED, not silently rendered
//   D7  what cannot be deterministic is REPORTED — declared and suspected —
//       and the heuristic's blind spot is itself asserted, so nobody mistakes
//       a clean scan for a proof
//   D8  seedRandom makes an Math.random-using adapter reproducible, and its
//       absence is visible in the result
//   A1  the audio lane's OfflineAudioContext seam works ONLY through the
//       virtual-clock shim — with a NEGATIVE CONTROL on the bare context
//
// v0.7 — THE NEST (plan-timeline §8.8's last seam, "renderDeck cannot see a
// nest"). Same bar as the flat renderer, one level up:
//   N1  two renders of the same NEST are byte-identical — trace AND wrap set
//   N2  the fragment/loop position map is exact at every frame, and a bounded
//       loop renders byte-identically twice
//   N3  the nested render EQUALS wall-clock playback of the same nest: same
//       events, same per-deck order, same count, same final state
//   N4  the wrap discipline is the SAME one playback uses (a committed one-shot
//       on a TickHost) — with the POLLED arm as the negative control, which
//       renders a DIFFERENT EVENT SET, reproducibly
//   N5  the committed boundary alone carries the loop (`servo:false`)
//   N6  an unbounded loop routes through renderBound() -> LOOP_UNBOUNDED
//   N7  a degraded child rate is REPORTED, never overridden
//   N8  caps.loopState 'rearm'/'carry' and adapter.loopWrap() are identical
//       offline and in playback
//   N9  a child on a wall clock is refused BY NAME
//   N10 deep nesting: exactly-once holds through two levels
//   N11 a FLAT render's trace bytes are unchanged by all of the above
~~~

### pr-trace

Above `const SPAN = 12000;`, lines 77 to 81 before the cut.

~~~js
// ---------------------------------------------------------------------------
// A trace with BOTH kinds of lane — a discrete cue lane whose reducer is
// non-commutative (so ordering bugs surface as a value, not just a count) and
// a continuous lane read per frame. Same shape the property tests use.
// ---------------------------------------------------------------------------
~~~

### pr-d1

Above `const FPSES = [24, 30, 60];`, lines 127 to 129 before the cut.

~~~js
// ===========================================================================
// D1/D3/D4 — determinism, exactly-once, exact frame grid, per seed
// ===========================================================================
~~~

### pr-deliverable

Above `check('render-det', seed, r1.traceText === r2.traceText,`, lines 147 to 147 before the cut.

~~~js
// D1 — THE DELIVERABLE.
~~~

### pr-d3

Above `const fires = r1.trace.filter((r) => !String(r.id).startsWith('#'));`, lines 157 to 157 before the cut.

~~~js
// D3 — every event in the window, exactly once, in order.
~~~

### pr-d4

Above `const nExp = Math.round(SPAN * fps / 1000) + 1;`, lines 169 to 169 before the cut.

~~~js
// D4 — the frame grid is exact and computed from the index, not accumulated.
~~~

### pr-d2

Above `{`, lines 179 to 183 before the cut.

~~~js
// ===========================================================================
// D2 — the render trace equals real-time playback, modulo timing jitter.
// Two controls: an irregularly-advanced virtual clock (jitter, no waiting) and
// a GENUINE wall clock with the main tick host (short, so CI stays fast).
// ===========================================================================
~~~

### pr-wall

Above `const SHORT = 1500;`, lines 214 to 216 before the cut.

~~~js
// (c) a GENUINE wall clock, main tick host, over a SHORT window — the proof
//     that the render matches what really happens, not just another virtual
//     run of the same code.
~~~

### pr-d5

Above `{`, lines 242 to 245 before the cut.

~~~js
// ===========================================================================
// D5 — the render does not wait. This is the whole point of the mode: a
// 90-minute archival remix must not take 90 minutes to export.
// ===========================================================================
~~~

### pr-plus-one

Above `for (let i = 0; i < 6000; i++) items.push({ at: ((i + 1) * LONG) / 6001, kind: '`..., lines 249 to 251 before the cut.

~~~js
// note the `i + 1`: an event at EXACTLY `from` is passed by the opening seek,
// not fired (see the render-boundary check) — this arm is about speed, so it
// keeps clear of that boundary.
~~~

### pr-left-edge

Above `{`, lines 266 to 272 before the cut.

~~~js
// ===========================================================================
// THE WINDOW'S LEFT EDGE, stated as a check rather than discovered later. A
// render opens with a real `seek(from)`, and the seek contract says an event at
// or behind the playhead is PASSED (its effect belongs in the folded state, not
// in a fire). So the render window is HALF-OPEN on the left, `(from, to]`,
// exactly as a seek is — and the state at `from` is `reduce(<= from)`.
// ===========================================================================
~~~

### pr-d6

Above `{`, lines 290 to 293 before the cut.

~~~js
// ===========================================================================
// D6 — a WALL-CLOCK deck is refused. Rendering it would reintroduce exactly
// the failure the mode exists to remove.
// ===========================================================================
~~~

### pr-d7

Above `{`, lines 314 to 317 before the cut.

~~~js
// ===========================================================================
// D7 — what cannot be made deterministic is REPORTED, and the report's own
// blind spot is asserted so nobody reads a clean scan as a proof.
// ===========================================================================
~~~

### pr-blind

Above `const hidden = (() => { const draw = Math.random; return () => draw(); })();`, lines 353 to 356 before the cut.

~~~js
// THE BLIND SPOT, asserted. A source-text scan cannot see through a closure,
// so a clean report is NOT a proof of determinism — and this check exists so
// that claim is a measured fact in the suite rather than a sentence in a
// comment nobody re-reads.
~~~

### pr-d8

Above `{`, lines 370 to 372 before the cut.

~~~js
// ===========================================================================
// D8 — seedRandom: the one nondeterminism the mode can FIX rather than report.
// ===========================================================================
~~~

### pr-a1

Above `function stubOffline(sampleRate = 48000) {`, lines 396 to 400 before the cut.

~~~js
// ===========================================================================
// A1 — the audio seam. The lane is the SHIPPED createAudioLane, unmodified,
// taking its context by argument. Proved against a stub OfflineAudioContext,
// WITH the negative control that shows the shim is load-bearing.
// ===========================================================================
~~~

### pr-stub

Above `startRendering: async () => { const d = new Float32Array(8);`, lines 409 to 411 before the cut.

~~~js
// enough of a buffer for hashAudioBuffer(): the stub proves the SEAM (node
// times), never the PCM — the PCM is measured in a real browser by
// timeline/lab/run-render.mjs.
~~~

### pr-nest

Above `// The rig, in both worlds. One factory, two clocks: 'offline' builds every deck`, lines 471 to 474 before the cut.

~~~js
// ===========================================================================
// N — THE NEST. plan-timeline §8.8's last open seam. Everything below renders
// a COMPOSITION (fragment quotation, loops, nested nests), not a flat deck.
// ===========================================================================
~~~

### pr-rig

Above `const N_IN = 0, N_OUT = 1690, N_AT = 500;      // 1690 ms: NOT a frame multiple`, lines 476 to 479 before the cut.

~~~js
// The rig, in both worlds. One factory, two clocks: `offline` builds every deck
// on ONE render runtime (the composition's requirement), `wall` builds the same
// arrangement on the real clock with mainTickHost() everywhere — including for
// the nest's boundary, so the two arms differ ONLY in what a clock is.
~~~

### pr-n2

Above `const L = N_OUT - N_IN;`, lines 542 to 542 before the cut.

~~~js
// N2 — the position map is the arithmetic §8.2 states, at EVERY frame.
~~~

### pr-downbeat

Above `check('nest-once', 0, ids.filter((x) => x === 'DOWN').length === 4 && r.nest.loo`..., lines 572 to 573 before the cut.

~~~js
// §8.8's downbeat detail, offline: the wrap seeks a HAIR before `in`, so the
// event sitting exactly on `in` is pending and commits — 4 downbeats, not 3.
~~~

### pr-lateness

Above `const lates = r.trace.filter((x) => !String(x.id).startsWith('#')).map((x) => x.`..., lines 587 to 589 before the cut.

~~~js
// OFFLINE LATENESS IS ZERO. §8.8 measured wrap-adjacent firing lateness at
// p50 0.10 / p95 0.70 ms in playback; the render has no wall clock to be late
// against, so every fire lands on its intended microsecond exactly.
~~~

### pr-n3

Above `{`, lines 595 to 595 before the cut.

~~~js
// --- N3: THE RENDER EQUALS WALL-CLOCK PLAYBACK OF THE SAME NEST -------------
~~~

### pr-window

Above `const WIN = { from: 0, to: 200 + PASSES * SHORT_OUT };`, lines 613 to 616 before the cut.

~~~js
// The window opens BEFORE the span, so the enter event FIRES rather than being
// folded by the opening seek (the flat suite's half-open left edge, one level
// up). That is deliberate: the entry is the interesting path — it is where the
// first pass's downbeat is won or lost — so both arms must play through it.
~~~

### pr-jitter

Above `const vr = createRenderRuntime(5_000_000);`, lines 651 to 654 before the cut.

~~~js
// …and against an IRREGULARLY-advanced virtual clock, which is the jitter
// control the flat suite uses: same events, no waiting. (createVirtualRuntime
// cannot host three tick hosts — that limitation is asserted at the end of
// this file — so the jitter arm rides a render runtime it advances by hand.)
~~~

### pr-n4

Above `{`, lines 675 to 675 before the cut.

~~~js
// --- N4: THE WRAP DISCIPLINE, and its negative control ----------------------
~~~

### pr-host

Above `const c = nRigOffline({ repeat: 4, host: true });`, lines 677 to 679 before the cut.

~~~js
// The discipline: the boundary is a COMMITTED ONE-SHOT on a TickHost, exactly
// as in playback (§8.8) — the render runtime supplies a deterministic one, so
// the offline path runs the SAME code, not an offline imitation of it.
~~~

### pr-leak

Above `check('nest-wrap', 0, rp.nest.events > rc.nest.events && p.sink.fired.includes('`..., lines 688 to 692 before the cut.

~~~js
// THE NEGATIVE CONTROL, and it inverts §8.8's playback finding. Polling in
// PLAYBACK lost a downbeat (2100/2400 onsets) because the head of the pass was
// folded. Polling OFFLINE loses nothing — `wrapSpan` seeks to the top of the
// pass, so the downbeat still fires — it LEAKS instead: the child free-runs
// past `out` for up to one frame, and material outside the quotation sounds.
~~~

### pr-reproducible

Above `const p2 = nRigOffline({ repeat: 4, host: false });`, lines 697 to 698 before the cut.

~~~js
// both are still DETERMINISTIC — being wrong reproducibly is the trap this
// report exists to catch.
~~~

### pr-2x2

Above `const c = nRigOffline({ repeat: 4, host: false });`, lines 716 to 718 before the cut.

~~~js
// THE FOURTH CELL. The 2x2 is the whole discipline in one table:
//   host+servo -> 3 wraps, correct        host, no servo -> 3 wraps, IDENTICAL
//   no host+servo -> 3 wraps, LEAKS       no host, no servo -> 0 wraps, NO LOOP
~~~

### pr-carry

Above `const atWrap = [];`, lines 776 to 777 before the cut.

~~~js
// the CC is set at child 1200 (inside the pass) and must still be set at the
// top of the NEXT pass — that is what 'carry' means.
~~~

### pr-n10

Above `{`, lines 809 to 809 before the cut.

~~~js
// --- N10: two levels deep — exactly-once still holds -------------------------
~~~

### pr-n13

Above `{`, lines 914 to 914 before the cut.

~~~js
// --- N13: nested audio — a loop repeats its AUDIO, at exact offsets ---------
~~~

### pr-exact

Above `check('nest-audio', 0, a.started[0] === 0.1 && a.started.every((x) => Number.isF`..., lines 939 to 942 before the cut.

~~~js
// EXPANSION IS EXACT, and that is a difference from the replay path worth
// stating: the wrap's hair-before-`in` lead (1e-6 ms) is a property of
// RE-SEEKING, so an expanded loop does not carry it. The event lanes still
// do — the trace shows the lead, the samples do not.
~~~

### pr-stub-limit

Above `const rtL = createRenderRuntime(0);`, lines 947 to 951 before the cut.

~~~js
// DOCUMENTED LIMIT, asserted so nobody trusts the node arm too far: a STUB
// context cannot see the bug that made this function exist. `cancelCommitted`
// calls node.stop()/disconnect(), and the stub has already recorded the start
// time by then — so the 'lane' mode scores 7/7 here and 1/7 in a real
// OfflineAudioContext (measured, timeline/lab/run-render.mjs).
~~~

### pr-speed

Above `const rt = createRenderRuntime(0);`, lines 969 to 972 before the cut.

~~~js
// The flat arm renders 10 minutes in ~10 ms. A COMPOSITION has N+1 schedulers,
// a servo call per frame and a committed boundary per wrap — so the question
// "does folding a nest reintroduce real time?" has to be answered with a
// number, not an assurance.
~~~

## `timeline/lab/prop-store.mjs`

### ps-header

Above `import { performance } from 'node:perf_hooks';`, lines 1 to 18 before the cut.

~~~js
// timeline/lab/prop-store.mjs — the STORE property test. Standalone:
//
//     node timeline/lab/prop-store.mjs                 # full (builds a 1M-row fixture once)
//     node timeline/lab/prop-store.mjs --quick         # 100k instead of 1M, no bench
//     node timeline/lab/prop-store.mjs --no-do         # skip the network arm
//     node --expose-gc timeline/lab/prop-store.mjs     # exact heap numbers
//
// Five arms, matching the five claims store.mjs makes:
//   store-memory  the memory backend is BEHAVIOURALLY IDENTICAL to today's array
//                 (same rows, same order, same brackets, same cursor trajectory)
//   store-jsonl   1M rows: cmp/call ~constant, resident memory bounded,
//                 seek-anywhere correct, and a COLD seek reports its miss policy
//   store-do      the deployed elektron-instrument KEPT session, read-only:
//                 same event count, same order
//   store-append  3 appends MID-PLAYBACK land in order; the cursor stays valid
//   bench         rows x backend x (open, cold seek, warm advance, memory)
//
// Exits nonzero on violation. MACHINE RULE: port 8892 only (bench-store.mjs).
~~~

### ps-memory

Above `async function armMemory() {`, lines 47 to 54 before the cut.

~~~js
// ---------------------------------------------------------------------------
// ARM 1 — store-memory: byte-compatible with today's array.
//
// "Today's array" here is literal: createCursor(rows) straight off a plain JS
// array, which is exactly what transport.mjs's cursorFor(kind) builds over
// byKind's lane. If the store's memory backend diverges from that in ANY probe,
// every measured number in Checkpoint 7 stops meaning what it says.
// ---------------------------------------------------------------------------
~~~

### ps-jsonl

Above `async function armJsonl() {`, lines 126 to 132 before the cut.

~~~js
// ---------------------------------------------------------------------------
// ARM 2 — store-jsonl: 1M rows over Range-fetched pages.
//
// The fixture's rows carry seq === their row index, so `bracket.a.seq === b.i`
// is a total ground truth for the page arithmetic without ever holding 1M rows
// in memory — which is the entire point of the exercise.
// ---------------------------------------------------------------------------
~~~

### ps-repair

Above `await cold.ensure(farPos, farPos + 1000);`, lines 168 to 168 before the cut.

~~~js
// now REPAIR: ensure the window and re-read — same position, real rows
~~~

### ps-do

Above `async function armDo() {`, lines 235 to 237 before the cut.

~~~js
// ---------------------------------------------------------------------------
// ARM 3 — store-do: the deployed elektron-instrument KEPT session. READ-ONLY.
// ---------------------------------------------------------------------------
~~~

### ps-append

Above `async function armAppend() {`, lines 274 to 280 before the cut.

~~~js
// ---------------------------------------------------------------------------
// ARM 4 — store-append: the log grows UNDER the playhead.
//
// Real transport, virtual clock, rate 1. The reader is JSONL-backed (the hard
// case: an immutable indexed prefix plus a live tail). Three appends land at
// three different moments; the cursor is never reset and never re-seeks.
// ---------------------------------------------------------------------------
~~~

### ps-live

Above `if (injected < 3 && step > 0 && step % 150 === 0) {`, lines 310 to 310 before the cut.

~~~js
// THE LIVE APPENDS: 60 ms ahead of the playhead, one every 150 steps
~~~

### ps-out-of-order

Above `const back = reader.appendBatch([{ at: reader.at(reader.count - 3).at - 1, kind:`..., lines 342 to 343 before the cut.

~~~js
// an OUT-OF-ORDER append is the one case that CAN move an index; it is taken,
// kept sorted, and REPORTED (never silent) — the DO's per-source rule in miniature
~~~

## `timeline/lab/prop-test.mjs`

### pt-header

Above `import {`, lines 1 to 16 before the cut.

~~~js
// timeline/lab/prop-test.mjs — the C2 property test (plan-timeline §5 C2):
//     reduce(events <= t)  ===  state after play(0 -> t)
// on randomized synthetic traces (the simulate_typing rule: synthetic and real
// traces share one shape; no humans in CI). Runs in plain node on the virtual
// runtime (deterministic — zero wall-clock flake). Exits nonzero on violation.
//
//   node timeline/lab/prop-test.mjs [--seeds 30] [--verbose]
//
// Two suites:
//   basic      — play straight through 0 -> t, t random (may bisect the trace).
//   gymnastics — random seek/pause/resume/rate ops mid-run; on seek the state
//                is reconstructed via reduce(<= target) (the documented seek
//                semantics); final state must STILL equal reduce(<= tEnd).
// State machine is non-commutative (add/mul/set) so ordering bugs, double
// fires and drops all surface as value mismatches. Fire counts are audited
// separately (exactly-once per pass).
~~~

### pt-3

Above `// --- seam 3: shipped default host must be the lab VERDICT (worker), with main`, lines 165 to 168 before the cut.

~~~js
// ---------------------------------------------------------------------------
// suite 3: the SIX API SEAMS (v0.2), each asserted deterministically on the
// virtual runtime. Every one of these was a real client's bug report.
// ---------------------------------------------------------------------------
~~~

### pt-seam3

Above `{`, lines 170 to 172 before the cut.

~~~js
// --- seam 3: shipped default host must be the lab VERDICT (worker), with main
//     an explicit opt-in. In node there is no global Worker, so the default
//     falls back to main — assert BOTH branches of the rule.
~~~

### pt-seam4

Above `{`, lines 240 to 243 before the cut.

~~~js
// --- seam 4: wall -> audio bridge. A fake AudioContext (deterministic) proves
//     the conversion: the instant handed to actuate() in AudioContext seconds
//     must equal ctx.currentTime + (-deltaMs + leadMs)/1000, i.e. an EARLY fire
//     leaves exactly its earliness as scheduling headroom.
~~~

### pt-seam5

Above `function freezeHost(inner, fromT, toT, nowFn) {`, lines 278 to 281 before the cut.

~~~js
// --- seam 5: the reduce POLICY must see the whole prefix, not one scan's
//     missed events. Reproduced deterministically: a freeze host swallows ticks
//     for a window (the SIGSTOP shape) so a batch of events is missed mid-run;
//     the reducer is NON-COMMUTATIVE, so a batch-only reducer cannot be right.
~~~

### pt-no-set

Above `const op2 = () => (rand() < 0.5 ? { f: 'add', v: 1 + Math.floor(rand() * 9) } : `..., lines 297 to 298 before the cut.

~~~js
// add/mul only — NO `set`. A `set` inside the missed window would let a
// batch-only fold resynchronize by luck and hide the very bug under test.
~~~

### pt-subset

Above `check('seam5', seed, c.missedN > 0 && c.missedN < c.prefixN,`, lines 338 to 338 before the cut.

~~~js
// the one-scan batch is a strict, much smaller subset — the OLD input
~~~

### pt-4

Above `function sharedVR(startMs = 1_000_000) {`, lines 362 to 371 before the cut.

~~~js
// ---------------------------------------------------------------------------
// suite 4: NESTING — a span that is itself a deck (timeline/nested.mjs).
// Nested seek (reduce-on-seek must run INSIDE the child), rate composition
// (incl. honest degradation against the child's caps.rates lattice), nested
// pause, absence outside the span, and cycle/depth rejection.
//
// Two decks need two tick metronomes on ONE clock: the virtual host holds a
// single tickCb, so it is fanned out here (setTimer passes straight through, so
// commit ordering is still exact).
// ---------------------------------------------------------------------------
~~~

### pt-4d

Above `{`, lines 616 to 617 before the cut.

~~~js
// --- 4d: the MASTER direction — the parent slaves to the CHILD'S POSITION,
//     never to whatever masters the child (rule 4, the important half).
~~~

### pt-degraded

Above `parent.setRate(1.5);`, lines 645 to 648 before the cut.

~~~js
// A DEGRADED CHILD CANNOT MASTER: at parent 1.5x the composed rate 0.75x is
// off the child's lattice, so the child runs at a rate the parent did not ask
// for. Mastering must SUSPEND (else that rate is silently imposed on the whole
// arrangement) and the direction flip back to follow.
~~~

### pt-5

Above `import { createCursor } from '../transport.mjs';`, lines 667 to 679 before the cut.

~~~js
// ---------------------------------------------------------------------------
// suite 5: CONTINUOUS KINDS (v0.4). A kind whose state is defined BETWEEN
// samples. Every arm here is one of the six seams proto/paths filed:
//   5a sampleAt() against an ANALYTIC curve (and the proof that a two-sample
//      ctx really does force a C1 interpolator down to linear)
//   5b the CURSOR is not O(n) — comparisons counted under forward play,
//      backward seek and random access
//   5c info.next / info.nexts: an interpolated reduce is expressible, and it
//      agrees with sampleAt to the last bit
//   5d caps are READ, and refusals are reported {wanted, chose, degraded, reason}
//   5e caps.followsTransport: play/pause/rate delivered, seek and sync NOT
//   5f logdeck: a row's epoch-µs `at` must not clobber the injected position `at`
// ---------------------------------------------------------------------------
~~~

### pt-catmull

Above `function catmull(p0, p1, p2, p3, u) {`, lines 693 to 694 before the cut.

~~~js
/** time-knotted (non-uniform) Catmull-Rom as a cubic Hermite — the same form
 *  proto/paths uses; p0/p3 null -> reflected phantom endpoints. */
~~~

### pt-tier

Above `method: 'catmull-rom', catchUp: 'reduce', assertOnSeek: true,`, lines 717 to 718 before the cut.

~~~js
// tier-1 restoration, and I say so —
// which is what arms the firewall (E3)
~~~

### pt-two-sample

Above `if (!ctx || (ctx.prev === undefined && ctx.next === undefined))`, lines 730 to 731 before the cut.

~~~js
// A SPLINE IS NOT A FUNCTION OF TWO SAMPLES: with no neighbourhood at all
// this is the honest best, and it says so.
~~~

### pt-policy

Above `evidence: opts.evidence === undefined ? { restored: { maxTier: 1 } } : opts.evid`..., lines 769 to 771 before the cut.

~~~js
// E3: the deck-level policy every omitting query below resolves to. It is
// here BECAUSE `p` declares caps.tier 1 — without it every sampleAt in
// suite 5 would throw EVIDENCE_POLICY_REQUIRED, which is the point.
~~~

### pt-sweep

Above `const sweep = (dk, n, frames) => {`, lines 838 to 840 before the cut.

~~~js
// forward play: 60 Hz over the whole trace — the render loop's access pattern.
// THE WITNESS that it is not O(n): the same sweep over a 4x longer trace must
// cost the same PER FRAME. A rescan would cost 4x more.
~~~

### pt-5e

Above `{`, lines 958 to 958 before the cut.

~~~js
// --- 5e: caps.followsTransport — play/pause/rate, never seek, never sync ----
~~~

### pt-5f

Above `{`, lines 980 to 980 before the cut.

~~~js
// --- 5f: logdeck — the row's epoch-µs `at` must not clobber the injected one -
~~~

### pt-6

Above `// --- 6a: attested never interpolates; restored(<=1) does -------------------`, lines 1000 to 1011 before the cut.

~~~js
// ---------------------------------------------------------------------------
// suite 6: THE EVIDENCE FIREWALL (v0.5, plan-timeline §5b). Interpolation is
// not a rendering detail — it is tier 1 of a restoration spectrum, and a system
// that serves restored material without saying so is lying by omission.
//   6a  attested NEVER returns an interpolated value; restored(tier<=1) does
//   6b  the FORCED-CHOICE rule fires when the policy is omitted, and only where
//       the answer could actually differ
//   6c  a reconstructor APPENDS a derived lane; provenance round-trips
//   6d  a tier-2 lane is EXCLUDED at maxTier 1, not down-mixed
//   6e  REVERSIBILITY: dropping a derived lane leaves the master bit-identical
//   6f  tiers 2/3 are unimplemented BY DESIGN — the same seam, not the same code
// ---------------------------------------------------------------------------
~~~

### pt-6d

Above `const rc2 = deck.registerReconstructor('dream', {`, lines 1126 to 1126 before the cut.

~~~js
// 6d — a TIER-2 lane, and the cap that excludes it
~~~

### pt-derive

Above `derive: (pos, ctx) => ({ x: ctx.a.x, y: ctx.a.y, at: pos, method: 'inpaint-stub'`..., lines 1130 to 1130 before the cut.

~~~js
// tier >= 2 MUST bring its own derive() — the library implements tier 1 only
~~~

### pt-mixed

Above `const mixed = deck.window(['p', 'p~catmull', 'p~dream'], -Infinity, Infinity, { `..., lines 1143 to 1143 before the cut.

~~~js
// a mixed window under maxTier 1 keeps tier-1 and drops tier-2 — one query
~~~

### pt-6f

Above `let refused = null;`, lines 1149 to 1149 before the cut.

~~~js
// 6f — tiers 2/3 are the same SEAM, not the same code, and the library says so
~~~

### pt-6e

Above `const dropped = rc.drop().dropped + rc2.drop().dropped;`, lines 1167 to 1167 before the cut.

~~~js
// 6e — REVERSIBILITY. Deleting a restoration is dropping its lane.
~~~

### pt-7

Above `import { normalizeWhen, normalizeCertainty, WHEN_KINDS } from '../transport.mjs'`..., lines 1188 to 1199 before the cut.

~~~js
// ---------------------------------------------------------------------------
// suite 7: UNCERTAINTY AS POSITION (v0.6, plan-timeline §7.4 / §−1's "a smear,
// not a fake instant"). `at` stays a scalar; a frozen sibling `when` carries the
// bracket, and the scalar is resolved ONCE at ingest by a named versioned rule.
//   7a  a `when` row fires at `earliest`, exactly once, and NEVER moves the sort
//   7b  possible/necessary give different, correct answers — and `necessary` is
//       UNANSWERABLE-AND-SAYS-SO when the inner bracket is absent
//   7c  the two axes stay independent: all four cells of evidence × certainty
//   7d  positionAccounting() sums correctly, BY RULE
//   7e  caps.series fixes a multi-controller lane that degraded SILENTLY
//   7f  two-phase seek FAILS OPEN under a deliberately slow adapter
// ---------------------------------------------------------------------------
~~~

### pt-w

Above `const W = (o) => ({ verbatim: null, edtf: null, innerFrom: null, innerTo: null, `..., lines 1203 to 1203 before the cut.

~~~js
/** the nine fields, with the optional five defaulted — tests name only what matters */
~~~

### pt-7a

Above `{`, lines 1208 to 1208 before the cut.

~~~js
// --- 7a: THE FIRING RULE — at = when.earliest, and nothing else moves --------
~~~

### pt-anchored

Above `const anc = deck.degradations('arc').reports.filter((r) => r.chose === 'anchored`..., lines 1229 to 1229 before the cut.

~~~js
// the anchoring is REPORTED — degradations() gains its fourth literal
~~~

### pt-sort

Above `const vr2 = sharedVR();`, lines 1235 to 1236 before the cut.

~~~js
// THE SORT DOES NOT MOVE: a twin deck given the same anchors as plain scalars
// fires the same ids in the same order at the same positions.
~~~

### pt-crisp

Above `const crispOnly = deck.window('arch', A, B, { certainty: 'possible' }).filter((r`..., lines 1358 to 1358 before the cut.

~~~js
// the CRISP FAST PATH: a lane with no bracket answers identically under both
~~~

### pt-7c

Above `{`, lines 1369 to 1369 before the cut.

~~~js
// --- 7c: THE TWO AXES ARE INDEPENDENT — all four combinations ---------------
~~~

### pt-neither

Above `check('axes', 2, cell['attested|possible'].filter((x) => x.startsWith('res')).le`..., lines 1398 to 1398 before the cut.

~~~js
// NEITHER RESTRICTION IMPLIES THE OTHER, stated as an equality on the sets
~~~

### pt-headline

Above `check('pos-acct', 1, pa.byRule['err-audio-month-null@1'].n === 1 && pa.byRule['e`..., lines 1430 to 1430 before the cut.

~~~js
// THE HEADLINE NUMBER: "N % of this lane is positioned by a padding artefact"
~~~

### pt-7e

Above `{`, lines 1455 to 1455 before the cut.

~~~js
// --- 7e: caps.series — a multi-controller lane that used to lie silently -----
~~~

### pt-cc

Above `const cc = [`, lines 1458 to 1459 before the cut.

~~~js
// ONE kind, TWO controllers, interleaved. The straddling pair over the merged
// lane at t=750 is (cc74@500, cc1@1000) — two DIFFERENT controllers.
~~~

### pt-old

Above `const merged = deck.sampleAt('cc', 750);`, lines 1472 to 1472 before the cut.

~~~js
// (1) THE OLD BEHAVIOUR, now on the record instead of silent
~~~

### pt-7f

Above `{`, lines 1500 to 1500 before the cut.

~~~js
// --- 7f: two-phase seek — non-blocking, fail-open, re-armed -----------------
~~~

### pt-fast

Above `const vr2 = sharedVR();`, lines 1564 to 1564 before the cut.

~~~js
// THE FAST PATH: a deck with NO slow-sync adapter takes the v0.5 path exactly
~~~

### pt-late

Above `deck.sched.registerAdapter('late', { caps: { absentState: 'silence', catchUp: 'd`..., lines 1582 to 1582 before the cut.

~~~js
// registered LATE — invisible in deck.adapters, which is the reported bug
~~~

### pt-8

Above `// --- 8a: THE PROPERTY — an attested performance is the performance of a deck`, lines 1600 to 1618 before the cut.

~~~js
// ---------------------------------------------------------------------------
// suite 8: THE FIRE-SIDE FIREWALL and deck.assertState (v0.7, plan-timeline
// §8.8's two named seams). Suite 6 proves the READ side: under 'attested' a
// query cannot be TOLD something invented. This proves the other half: under
// 'attested' something invented cannot HAPPEN.
//   8a  THE PROPERTY, over random traces: the set of actuations of an
//       'attested' deck holding derived lanes is IDENTICAL to that of a deck
//       that never had them — and so is the drift channel, which is what makes
//       the identity possible (a refusal writes no drift row).
//   8b  the refusal is VISIBLE: status 'gated', degradations(), gateAccounting(),
//       the onGate() channel, and request({actuate}) as a pre-flight.
//   8c  actuation's SECOND door: the seek fold's assertState() is refused too,
//       so reduceAt() and the seek path can no longer disagree about one lane.
//   8d  a policy change mid-play is a STATE change: tighten -> silence(),
//       loosen -> re-assert; a lane that cannot go quiet says so.
//   8e  deck.assertState(kind, state, info): assert-then-fold-forward equals
//       reduce(<= t) (the MIDI-chase property), the snapshot moves, no drift row
//       is written, and a VERIFIED disagreement is reported as 'asserted-over'.
// ---------------------------------------------------------------------------
~~~

### pt-8a

Above `for (let seed = 1; seed <= Math.ceil(NSEEDS / 2); seed++) {`, lines 1620 to 1621 before the cut.

~~~js
// --- 8a: THE PROPERTY — an attested performance is the performance of a deck
// with no restoration in it, over random traces ----------------------------
~~~

### pt-8c

Above `t.length = 0;`, lines 1719 to 1720 before the cut.

~~~js
// 8c — THE SECOND DOOR. A seek must not push a state folded from the refused
// lane into its actuator while reduceAt() answers null for the same lane.
~~~

### pt-8e

Above `for (let seed = 1; seed <= Math.ceil(NSEEDS / 3); seed++) {`, lines 1789 to 1789 before the cut.

~~~js
// --- 8e: deck.assertState — the MIDI-chase property ------------------------
~~~

### pt-forward

Above `reduce: (payloads, pos, info) => {`, lines 1801 to 1801 before the cut.

~~~js
// FORWARD fold from info.from — the mode assertState exists to serve
~~~

### pt-entry

Above `const rep = deck.assertState('ctr', truth1, { pos: t1, reason: 'external-sync', `..., lines 1813 to 1813 before the cut.

~~~js
// THE ENTRY POINT: push authoritative state in at t1 without replaying it
~~~

## `timeline/lab/run-freeze.mjs`

### rf-header

Above `import { createRequire } from 'module';`, lines 2 to 20 before the cut.

~~~js
// ============================================================================
// CHROME 133 ENERGY-SAVER FREEZE — the risk flagged in
// research/browser-av-editors-2026-08.md §3, tested at 5-MINUTE SCALE.
//
//   node timeline/lab/run-freeze.mjs [--freeze 300] [--keepalive]
//
// Chrome freezes a hidden, silent, CPU-intensive tab after >5 min on Energy
// Saver; the exemption list does NOT include a worker tick. This runner puts
// the page into the SAME Page-Lifecycle FROZEN state via CDP
// (Page.setWebLifecycleState) — the worst case, held for real minutes — and
// measures what comes back:
//   · did the DEDICATED WORKER's own timer keep running while the page was
//     frozen? (a probe worker logs into its own memory and dumps afterwards)
//   · does catchUp:'reduce' land on the correct non-commutative state, and how
//     long after resume?
//   · what do 'burst' and 'drop' do over the same gap?
//
// House rules: port 8894, one Chrome, tl-freeze-udd pattern, plain node ESM.
// ============================================================================
~~~

### rf-natural

Above `const NATURAL = args.includes('--natural');`, lines 38 to 42 before the cut.

~~~js
// --natural: do NOT SIGSTOP. Ask CHROME to freeze the tab on its own, the way
// Energy Saver does, and see whether a held Web Lock actually exempts it.
// The tab is hidden the way timeline/lab/run-lab.mjs's arm BG hid it — a
// BROWSER-level Target.createTarget + Target.activateTarget, which Playwright's
// newPage() cannot do (each newPage is its own window and stays 'visible').
~~~

### rf-freeze

Above `let frozenMs = 0;`, lines 100 to 110 before the cut.

~~~js
// Hide the tab (a freeze only happens to a hidden page), then FREEZE it.
// TWO mechanisms, because one of them turned out not to bite:
//  (a) Page.setWebLifecycleState 'frozen' — the same state Chrome puts a
//      page into. In headless it accepted the call and CHANGED NOTHING:
//      the main thread kept beating and the probe worker kept ticking
//      (measured, run 1 at 20 s: 0 gaps). Reported, not relied on.
//  (b) SIGSTOP on the RENDERER PROCESS — unambiguous, and the right model:
//      a dedicated worker lives in its page's renderer, so stopping that
//      process stops the main thread AND the worker tick together, which
//      is exactly what a freeze does and exactly the case our hidden-tab
//      measurement never covered.
~~~

### rf-own-path

Above `const bcdp = new CDP();`, lines 113 to 117 before the cut.

~~~js
// Chrome's OWN freezing path. Preconditions per
// https://developer.chrome.com/blog/freezing-on-energy-saver :
// hidden > 5 min, silent, CPU-intensive, Energy Saver on (forced here by
// FreezingOnEnergySaverTesting). Exempt if ... a HELD WEB LOCK — which is
// exactly what --keepalive holds, so the two arms are the experiment.
~~~

## `timeline/lab/run-lab.mjs`

### rl-header

Above `import { spawn, execSync } from 'node:child_process';`, lines 1 to 10 before the cut.

~~~js
// timeline/lab/run-lab.mjs — measurement orchestrator for the transport core.
//   node timeline/lab/run-lab.mjs [--only A,B,D,E,BG]
// Arms:
//   A  firing precision, mechanisms (main|worker|raf|fanout) x mixed densities
//   B  seek/pause/rate/cancel correctness asserts per mechanism
//   D  SIGSTOP 3 s freeze -> catch-up per policy (burst/drop/reduce) + fanout
//   E  audio lane sample accuracy (AudioWorklet truth) incl. 500 ms main busy
//   BG background-tab throttling probe (second tab activated via CDP)
// Machine rules: port 8896, CDP 9321, chrome pattern tlab-udd; kills only own.
// Raw rows -> timeline/lab/results/*.jsonl (gitignored); summary -> artifacts/.
~~~

### rl-flags

Above `chrome = run(CHROME, [`, lines 94 to 96 before the cut.

~~~js
// NOTE: deliberately NOT passing --disable-background-timer-throttling etc —
// the BG arm wants honest throttling; foreground arms are unaffected.
// No --mute-audio: jam lesson — headless audio output must stay real.
~~~

## `timeline/lab/run-midi.mjs`

### rm-header

Above `import { spawn, execSync } from 'node:child_process';`, lines 1 to 5 before the cut.

~~~js
// timeline/lab/run-midi.mjs — arm F: Web MIDI timestamped send -> node virtual
// port, arrival stamped on the truth clock. Two modes: 'queue' (browser MIDI
// stack does the timing from one batch of timestamped sends) vs 'fire'
// (setTimeout-per-event immediate sends — the JS-timer baseline).
// Run AFTER run-lab.mjs (reuses port 8896 + CDP 9321, tlab patterns).
~~~

## `timeline/lab/run-render.mjs`

### rr-header

Above `import { createRequire } from 'module';`, lines 2 to 10 before the cut.

~~~js
// ============================================================================
// The BROWSER half of the offline-render determinism proof: renderDeckAudio()
// through a REAL OfflineAudioContext, twice, comparing the event-trace bytes
// AND the rendered PCM hash.
//
//   node timeline/lab/run-render.mjs
//
// House rules: port 8894, one Chrome, tl-render-udd pattern, plain node ESM.
// ============================================================================
~~~

### rr-lane

Above `console.log('  mode:'lane' NEGATIVE CONTROL — impulses ${JSON.stringify(n.laneMo`..., lines 97 to 101 before the cut.

~~~js
// THE NEGATIVE CONTROL, and the reason renderDeckAudio EXPANDS a loop instead
// of replaying it: bind the child lane to the CHILD's transport and every
// wrap's `child.seek()` fires createAudioLane's cancelCommitted(), which
// stop()s and disconnect()s nodes that have not sounded yet — because
// offline, NOTHING has sounded until startRendering().
~~~

## `timeline/lab/run-sensor.mjs`

### rs-header

Above `import { createRequire } from 'module';`, lines 2 to 13 before the cut.

~~~js
// ============================================================================
// L4b MEASUREMENT — requestVideoFrameCallback.mediaTime vs HTMLMediaElement
// .currentTime, as the media servo's sensor.
//
//   node timeline/lab/run-sensor.mjs [--fps 30,60] [--secs 18]
//
// One real headless-Chrome playback per fps; FOUR mediaMaster instances over
// the same <video> ({rvfc, currentTime} x {tol 20 ms, 40 ms}). Reports the
// disagreement distribution (p50/p95/max of |mediaTime - currentTime|) and the
// servo correction counts per arm. House rules: port 8894, one Chrome,
// tl-sensor-udd pattern, plain node ESM.
// ============================================================================
~~~

## `timeline/lab/server.mjs`

### sr-header

Above `import http from 'node:http';`, lines 1 to 3 before the cut.

~~~js
// timeline/lab/server.mjs — static files + the truth clock, port 8896.
// /time-local: hrtime-anchored epoch-µs (the jam-harness method: pages
// min-RTT-calibrate against THIS over loopback; error well under 1 ms).
~~~

## `timeline/lab/strip-verify.mjs`

### sv-header

Above `import { spawn } from 'node:child_process';`, lines 1 to 30 before the cut.

~~~js
// timeline/lab/strip-verify.mjs — ONE headless Chrome, one pass, hard asserts,
// screenshots. The proof standard in this repo for a RENDERING claim is a
// NUMBER, not a picture (proto/paths' ink probe: "294 px under 'all', 0 px under
// 'attested'"), so every visual claim below is closed by strip.inkOf().
//
//   node timeline/lab/strip-verify.mjs        (serves the repo root on :8897)
//
// A — AMBIGUATION, the three answers of `necessary`, and when.kind edges
//   A1  the strip's whenState() agrees ROW FOR ROW with the transport's own
//       certAccepts(), asked as deck.window(..., {certainty:'necessary'})
//   A2  the four states paint FOUR DIFFERENT pictures — and in particular the
//       shipped bug is closed: 'outer' (a wholly unknown position) no longer
//       renders with the same ink as 'crisp' (an attested duration)
//   A3  the state tally MOVES WITH ZOOM on the real corpus: sound-but-incomplete
//       at one zoom, undecidable at another. The epistemics are a property of
//       the question, and on a zoomable axis the wheel asks it
//   A4  ignorance vs vagueness on IDENTICAL brackets differ in ink
//   A5  the empty core is drawn as a STATEMENT: 22/22 Kurenniemi rows have no
//       inner bracket and the lane still paints a distinguishable mark
// B — THE AORISTIC AGGREGATE
//   B1  one fully visible span sums to exactly 1; points count; open spans
//       contribute 0 and are REPORTED rather than filtered
//   B2  Ratcliffe's 1/(b−a) and aoristAAR's period_correction are the SAME
//       operation once the bin is a pixel column — measured, not assumed
//   B3  the old megatimeline formula vs this one, on the same rows
// C — DEEP TIME
//   C1  13.8 Gyr fits, in 14 major ticks, labelled in Ga — where the old ladder
//       asked the axis loop for 138,000,000 ticks
//   C2  the zoom ceiling is derived from the float and REPORTED when it bites
//   C3  the ms position domain's measured ceiling (node-side arithmetic)
~~~

### sv-b3

Above `const years = [1, 2, 5, 20, 60];`, lines 134 to 134 before the cut.

~~~js
// B3 — the shipped megatimeline formula against this one
~~~

### sv-a1

Above `const a1 = await evalJs('(() => {`, lines 195 to 195 before the cut.

~~~js
// A1 — the strip's classifier vs the transport's predicate, row for row
~~~

### sv-a3

Above `const a3 = await evalJs('(() => {`, lines 227 to 227 before the cut.

~~~js
// A3 — the tally moves with zoom
~~~

### sv-ink

Above `const ink = await evalJs('(() => {`, lines 252 to 252 before the cut.

~~~js
// A2 + A4 + A5 — ink
~~~

### sv-a5b

Above `const narrow = await evalJs('(() => {`, lines 278 to 278 before the cut.

~~~js
// A5b — the affordance is data, not decoration; and it is ignorance-only
~~~

### sv-d

Above `console.log('\nD — the cost of drawing what we do not know');`, lines 329 to 329 before the cut.

~~~js
// ─── D — what the honesty COSTS ─────────────────────────────────────────────
~~~
