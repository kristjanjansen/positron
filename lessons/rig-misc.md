# rig-misc

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/audit.mjs`

### audit-header

Above `import { execFile } from 'node:child_process';`, lines 1 to 27 before the cut.

~~~js
// rig/audit.mjs — what these machines need, why, and whether they still have it.
//
//   node rig/audit.mjs              every machine
//   node rig/audit.mjs box          just the Pi
//   node rig/audit.mjs pro --fix    print the commands that would close the gap
//
// 🔴 WHY THIS EXISTS. `setup.sh` installs `alsa-utils curl git` and node. That
// is all it has ever installed. Every instrument on the board — JACK, Yoshimi,
// SuperCollider, its sc3-plugins, ffmpeg — was put
// there BY HAND at some point and written down nowhere, so a fresh Pi would
// come up with the service running and every instrument reporting
// "unavailable", which reads as a code fault.
//
// The drift is not historical. Csound went on this board by hand at 06:00 on
// 2026-09-12, by me, an hour before this file was written, for the reverb
// insert. That is the whole argument: a machine that is set up by typing is a
// machine nobody can rebuild.
//
// ⚠️ A LIST IS NOT A CHECK. A document saying what should be installed rots the
// first time somebody installs something else, and nothing says so. This is
// runnable: it asks each machine what it actually has and prints the
// difference, so the record cannot quietly stop being true.
//
// ⚠️ AND IT DOES NOT PIN VERSIONS. `seen` is what was there on a day it worked,
// reported as drift rather than enforced as a requirement — pinning Debian
// point releases would make this fail on every routine upgrade and teach
// everyone to ignore it. A version that moved is worth a line, not a refusal.
~~~

### audit-packages

Trailing comment on line 34 before the cut.

~~~js
export /**
 * The package list, parsed from the one file that holds it.
 *
 * ⚠️ TAB SEPARATED, and the `why` column may contain anything including commas
 * and colons, which is why it is not CSV and not `:`-delimited.
 * ⚠️ `nodesource` ROWS ARE KEPT. This audit checks what is INSTALLED, and node
 * is installed whatever route it came by; only `setup.sh` cares about the
 * difference, because only it has to do the installing.
 */
~~~

### audit-apt

Above `apt: readPackages(),`, lines 60 to 71 before the cut.

~~~js
// ⚠️ Ask port 22, not mDNS — `positron-board.local` does not resolve from
// this sandbox. CLAUDE.md has the sweep.
// 🔴 READ FROM `rig/board/packages.txt`, NOT LISTED HERE. This was a
// hand-kept array of twelve packages with versions and reasons, and
// `setup.sh` installed four — so the list that knew what a board needs and
// the script that builds one had never agreed, and a board provisioned from
// this repo came up silent. **One file, two readers**: the installer parses
// it with `awk` on a fresh Pi where node does not exist yet, and this parses
// it to check a board that already exists.
// ⚠️ IT THROWS ON AN EMPTY PARSE rather than reporting a clean audit. A
// regex that stopped matching would otherwise mean "no packages to check",
// which reads exactly like "nothing is missing".
~~~

### audit-m1

Above `mac: true,`, lines 88 to 91 before the cut.

~~~js
// ⚠️ `m1`, NOT `pro`. BOTH Macs here are "Pro" — MEASURED: the studio one is
// an Apple M1 Pro (MacBookPro18,3) and the machine this repo is edited on is
// an Apple M2 Pro. "the Pro" named neither of them unambiguously and was
// used for both.
~~~

### audit-manual

Above `manual: [`, lines 93 to 95 before the cut.

~~~js
// ⚠️ NOT RESTORABLE FROM THIS REPO, and that is the point of listing them.
// Four of these are Preferences clicks with no API at all, which is why
// that rig is parked rather than automated.
~~~

### audit-dpkg

Above `const q = await sh(m.ssh, 'dpkg-query -W -f='\${Package} \${Version} \${Status}\`..., lines 122 to 127 before the cut.

~~~js
// ⚠️ `|| true`, AND IT IS NOT COSMETIC. `dpkg-query` exits non-zero when ANY
// name it is given is unknown, and the unknown ones are exactly the case this
// tool exists to find — so without this, one missing package made the query
// fail, the map come back empty, and EVERY package report MISSING. Caught by
// breaking it on purpose: adding one bogus name turned sixteen ok rows red.
// A checker whose false-alarm mode is that broad is one people stop reading.
~~~

### audit-unchecked

Above `for (const [what, why] of m.manual) rows.push(['by hand', what, why, null]);`, lines 159 to 163 before the cut.

~~~js
// ⚠️ EVERY `manual` ITEM IS REPORTED AS UNCHECKABLE RATHER THAN AS PRESENT.
// A Preferences setting cannot be read over ssh, and a row that guessed would
// be worse than a row that says it did not look — that is the difference
// between "we checked and it is fine" and "we did not check", which this
// project has a rule about.
~~~

## `rig/chaos.sh`

### chaos-header

Above `set -e`, lines 2 to 12 before the cut.

~~~sh
# Interrupt the RTMPS ingest at increasing gap lengths and record when it happens,
# so player recovery can be measured against a known timeline.
#
#   ./chaos.sh [gap durations...]      default: 2 5 12 25 60
#
# Why the gap lengths matter: the live input was created with
# recording.timeoutSeconds = 10.
#   gap <  10s  -> Cloudflare resumes the SAME broadcast (same video UID)
#   gap >= 10s  -> Cloudflare ends it and mints a NEW video UID behind the same
#                  live-input URL. That is a different recovery problem, and the
#                  one most likely to break a player.
~~~

## `rig/do-lag.mjs`

### do-lag

Above `import { readFileSync } from 'fs';`, lines 2 to 13 before the cut.

~~~js
// RETIRED 2026-10-13: `cues.positron.studio` (workers/cues) was deleted from Cloudflare on 2026-10-13 (workers/*/RETIRED.md), so what this calls there no longer answers.
/**
 * Measure Durable Object cue-relay latency. Two WebSocket clients in one
 * process (one clock — no sync error):
 *
 *   RTT        client -> DO -> same client        (ping/pong)
 *   one-way    publisher -> DO -> other client    (cue broadcast)
 *   DO clock   offset of the DO's Date.now() vs local (valid: local is
 *              NTP-synced to ~1 ms)
 *
 *   node rig/do-lag.mjs [wss://...] [n]
 */
~~~

## `rig/edge-lag-blocking.py`

### edge-lag-hint

Above `if s['hint_next']:`, lines 113 to 114 before the cut.

~~~python
# PRELOAD-HINT is the authoritative "next unpublished part" — use it when present
# (segment part-count varies: TARGETDURATION=3 but real segments are 4x0.5s parts).
~~~

## `rig/edge-lag.sh`

### edge-lag-track

Above `CHILD=$(echo "$MASTER" | grep -m1 '^stream_.*\.m3u8')`, lines 11 to 11 before the cut.

~~~sh
# track ids change every broadcast — never hardcode the prefix
~~~

## `rig/kill-test.sh`

### kill-test-header

Above `set -e`, lines 2 to 9 before the cut.

~~~sh
# Does HOW the encoder dies decide whether Cloudflare keeps the broadcast?
#
#   SIGSTOP/CONT -> nothing closes; data stops, then resumes  (network glitch)
#   SIGKILL      -> no RTMP goodbye, kernel still sends TCP FIN
#   SIGTERM      -> ffmpeg sends RTMP deleteStream             (clean goodbye)
#
# recording.timeoutSeconds=10 on this input; gap is 5 s in every case, so any
# difference in outcome is attributable to the disconnect style alone.
~~~

### kill-test-1

Above `b=$(vid)`, lines 34 to 34 before the cut.

~~~sh
# ── case 1: SIGSTOP/CONT — the pure network glitch ──────────────────────────
~~~

### kill-test-2

Above `b=$(vid)`, lines 43 to 43 before the cut.

~~~sh
# ── case 2: SIGKILL — dead process, no RTMP goodbye ─────────────────────────
~~~

### kill-test-3

Above `b=$(vid)`, lines 52 to 52 before the cut.

~~~sh
# ── case 3: SIGTERM — clean goodbye (chaos.sh baseline) ─────────────────────
~~~

## `rig/loop-lag.sh`

### loop-lag-header

Above `set -u`, lines 2 to 18 before the cut.

~~~sh
# Perception-lag loop (open item 8): how stale is the newest frame Cloudflare
# will hand a client right now?
#
#   N x { t0 = now
#         grab one live-edge frame  (-live_start_index -1)
#         OCR the millisecond wall clock the splicer burned into the pixels
#         lag = time-of-day(t0) - time-of-day(burned) }
#
# Reports p50/p95. Runs fully headless off the webcam/slate leg of the gapless
# relay (splicer.py burns %{localtime:%T.%3N} into every source-leg frame).
#
# Clock validity: burner and reader are THE SAME MACHINE, so absolute clock
# error cancels exactly — do not correct for it, just note it in the report.
# Player-side perceived lag = THIS pipeline lag + player.latency (2.5-4.0 s
# measured for the tuned hls.js arm).
#
# Usage:  loop-lag.sh [N] [sleep_s]      (defaults: 20 iterations, 2 s apart)
~~~

## `rig/overlay-bridge.mjs`

### overlay-bridge

Above `import { writeFileSync, readFileSync } from 'node:fs';`, lines 2 to 16 before the cut.

~~~js
// RETIRED 2026-10-13: `cues.positron.studio` (workers/cues) was deleted from Cloudflare on 2026-10-13 (workers/*/RETIRED.md), so what this calls there no longer answers.
/**
 * DO cue room -> text file -> ffmpeg drawtext burn-in.
 *
 * Subscribes to the cue relay and keeps /tmp/overlay.txt holding the latest
 * message. Any ffmpeg with
 *   drawtext=textfile=/tmp/overlay.txt:reload=30:...
 * burns it into the outgoing video: visible to every viewer on every player,
 * synced with the picture by construction (it travels *in* the picture).
 *
 * Cue convention: {at, until?, data:{burn:"text"}} — only cues with data.burn
 * are burned; `until` clears the overlay when it passes.
 *
 *   node rig/overlay-bridge.mjs [room] [file]
 */
~~~

## `rig/peer.mjs`

### peer-header

Above `import { createPeer, wsTransport } from '../proto/looper/peer.mjs';`, lines 2 to 38 before the cut.

~~~js
// rig/peer.mjs — a machine on the shared clock, with no browser.
//
//   node rig/peer.mjs --room jam-demo
//   node rig/peer.mjs --room jam-demo --id pi --seconds 60
//   node rig/peer.mjs --self-test          # no network, no room, proves the math
//
// ⚠️ `rig/m1/skew.mjs` GOT HERE FIRST, on 2026-09-10, with the same insight
// that peer.mjs runs in node — and it is what produced HANDOFF item 0's ~3 ms
// real-link figure. Keep both, and know which is which: THAT one is a
// measurement run, two machines for 180 s, and its numbers are cited. THIS one
// is the demo-facing peer — it joins and stays, names itself after the machine
// so a roster reads `<the board's hostname> 3.1 ms away`, and carries a `--self-test` with
// an injected skew so the estimator can be graded with no network at all.
// ⚠️ If they start to disagree about anything, the measurement tool wins.
//
// WHY THIS EXISTS. `jam` says "open this page a second time — in another tab,
// or on a phone". Two tabs on one machine share a clock by construction, so the
// thing the page exists to measure cannot be wrong there: the skew estimator
// has nothing to estimate. 🔴 Every number this project has for peer-to-peer
// skew is therefore LOOPBACK, and `HANDOFF.md` has carried "min-RTT skew over a
// real link" as unmeasured since it was written. `plans/plan-jam.md` P1.
//
// 🔴 AND IT NEEDED NO NEW PROTOCOL. `proto/looper/peer.mjs` is DOM-free by
// design — a transport is two functions — and `wsTransport` uses only the
// standard `WebSocket`, which node has had globally since 22. VERIFIED before
// this file was written rather than after: `node -e "typeof WebSocket"` answers
// `function`. So the Raspberry Pi and the studio Mac can be real peers, and the
// demo stops being "open this page twice" and becomes a browser in one building
// and a board in another, on one pulse.
//
// ⚠️ WHAT THIS CANNOT TELL YOU, said here because the number is the point.
// The offset printed below is the estimator's OWN answer. It is not a
// measurement of how right the estimator is — a clock cannot grade itself, and
// reading agreement off the thing being graded is the circularity `plans/plan-jam.md`
// §4 P3 exists to avoid. What this DOES give honestly is the round trip, which
// is measured entirely at this machine on one clock, and the estimator's
// convergence, which is a fact about the estimator.
~~~

### peer-id

Above `const { hostname } = await import('node:os');`, lines 54 to 58 before the cut.

~~~js
// ⚠️ A DEFAULT ID THAT IS THE MACHINE'S NAME, not a random string. `jam` gives
// browsers random ids because a browser is anonymous; a board is not, and a
// roster reading `<the board's hostname> 3.1 ms away` is the thing somebody wants to see.
// It still falls back to a random suffix, because two Pis would otherwise elect
// each other reference by a coin toss nobody can see.
~~~

### peer-self-test

Above `if (has('self-test')) {`, lines 62 to 72 before the cut.

~~~js
// ---------------------------------------------------------------------------
// --self-test: the estimator, against a link whose skew we CHOSE
// ---------------------------------------------------------------------------
//
// 🔴 A CHECK THAT CANNOT FAIL IS NOT A CHECK. This drives two peers through an
// in-process transport pair with an INJECTED delay and an INJECTED clock
// offset, so the right answer is known in advance and the estimator either
// finds it or does not. `pairTransports` is already in peer.mjs for exactly
// this; the negative control it makes possible is the one recorded in
// plan-uuu-local §4 — with the correction off, the flam is EXACTLY the
// injected skew.
~~~

### peer-virtual-clock

Above `let t = 0;`, lines 78 to 81 before the cut.

~~~js
// ⚠️ A VIRTUAL CLOCK, NOT `setTimeout`. `pairTransports` takes a `schedule`
// so the link's delay can be exact instead of approximately right, and
// `pingEveryMs: 0` turns off the peer's own real-timer ping — otherwise the
// test would be measuring the event loop as much as the estimator.
~~~

### peer-reference

Above `const err = Math.abs(off - -SKEW);`, lines 103 to 104 before the cut.

~~~js
// 'a' is the lower id and is therefore the reference, so B — whose clock runs
// SKEW ahead — must correct by about -SKEW to agree with it.
~~~

### peer-jitter-arm

Above `let t2 = 0;`, lines 113 to 119 before the cut.

~~~js
// 🔴 A SECOND ARM, BECAUSE THE FIRST ONE IS TOO EASY TO FAIL. With zero
// jitter and zero loss every sample is perfect, so an estimator that simply
// AVERAGED would score exactly as well — the arm above discriminates against
// "no correction at all" and against nothing else. min-RTT-of-N's actual
// claim is that it keeps only the FASTEST sample, and that claim only has
// teeth on a link where the samples disagree. 30 ms of jitter on a 40 ms link
// biases a mean; it must not move the minimum.
~~~

### peer-roster-log

Above `if (now !== roster) {`, lines 165 to 166 before the cut.

~~~js
// ⚠️ A STATE CHANGE GOES IN THE LOG WHEN IT CHANGES, not on a timer — the
// same rule `jam` learned when it was rewriting a paragraph twice a second.
~~~

### peer-offset

Above `console.log('${new Date().toISOString()}  peers ${ps.length}'`, lines 177 to 178 before the cut.

~~~js
// ⚠️ `offset` is the estimator's own answer and is printed as such. The round
// trip is measured at this machine on one clock and is the honest number.
~~~

## `rig/push-part2.sh`

### push-part2

Above `set -e`, lines 2 to 9 before the cut.

~~~sh
# part2-mystery encoder: same encode teed to (a) Cloudflare RTMPS and (b) a local
# FLV-parsing tap that timestamps when each frame's bytes leave the muxer.
# Derived from push-llhls.sh; knobs via env:
#   GOP   (default 60)      keyframe interval in frames @30fps
#   TUNE  (default zerolatency; "none" drops -tune → default lookahead/mbtree/frame-threads)
#   TAP   (default 127.0.0.1:8898; "none" disables the tap leg)
#   AUDIO (default on; "off" → no audio stream)
#   KEYFILE (default $SCRATCH/p2_key.txt)
~~~

## `rig/relay/babysitter.sh`

### babysitter

Above `FF7=/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg`, lines 2 to 5 before the cut.

~~~sh
# Keeps path `rig` ALWAYS publishing: whenever the real encoder is absent,
# publish a slate into the same path. The real encoder overrides us at will
# (overridePublisher). Readers attached to `rig` — i.e. the Cloudflare
# forwarder — should never see the path die.
~~~

## `rig/relay/gapless.sh`

### gapless-header

Above `cd "$(dirname "$0")"`, lines 2 to 13 before the cut.

~~~sh
# Gapless Cloudflare relay: ONE long-lived uplink ffmpeg whose socket never
# closes, fed by a FIFO of concatenated MPEG-TS from whichever source exists.
#
#   encoder --rtmp--> mediamtx --\
#                                 feeder loop --TS--> FIFO --> uplink ffmpeg --RTMPS--> Cloudflare
#   slate (lavfi) ---------------/
#
# The uplink re-encodes with setpts=N/FR/TB so timestamp jumps at splice
# points vanish; source switches become instant cuts. Cost: one extra encode.
#
# NO set -e: this is a supervisor. A failing kill/curl must never take the
# feeder down (it did: an orphaned slate then feeds the FIFO forever).
~~~

### gapless-uplink

Above `$FF7 -hide_banner -loglevel warning \`, lines 20 to 23 before the cut.

~~~sh
# --- uplink: never exits, never closes the CF socket -----------------------
# discardcorrupt: a splice can truncate the old leg's audio PES mid-frame —
# drop that one packet instead of letting it cascade into an encoder death.
# -r 30 pins output fps so timestamp debris can never re-infer a bogus rate.
~~~

## `rig/relay/splicer.py`

### splicer-clock

Above `CLOCK = (`, lines 42 to 47 before the cut.

~~~python
# Millisecond wall clock burned into every source leg: the ground truth for
# perception-lag measurement travels in the pixels themselves.
# %T.%3N = HH:MM:SS.mmm from ONE clock (localtime). The previous
# %{localtime:%H:%M:%S}.%{eif:mod(t*1000,1000)} form was doubly broken:
# over-escaped colons made localtime see 3 args -> drawtext rendered NOTHING,
# and the eif ms field was stream-time, not wall-clock (±1 s bimodal error).
~~~

### splicer-rtmp

Above `return subprocess.Popen(`, lines 76 to 79 before the cut.

~~~python
# RTMP pull, not RTSP: ffmpeg's RTSP demuxer holds A+V output until it has
# RTCP sender reports for BOTH streams (~11.6 s measured against mediamtx),
# which outlives the 6 s warm-up grace — the live tier starve-looped and
# never engaged. RTMP carries per-message timestamps: first byte in 2.4 s.
~~~

### splicer-bench

Above `if tier == "webcam" and (gated or now - start < 3.0):`, lines 184 to 185 before the cut.

~~~python
# a webcam that dies fast OR never delivered a keyframe is
# benched — otherwise a dead camera is retried forever
~~~

### splicer-starve

Above `if tier == "webcam" and (gated or now - start < 3.0 + STARVE_TIMEOUT):`, lines 213 to 217 before the cut.

~~~python
# a fresh, still-gated source gets a 6 s warm-up before starvation
# applies (RTSP connect + first keyframe legitimately take ~3 s)
# connection open but no data: dead publisher behind a live socket.
# Absence of data is a switch trigger (measured: a starved RTSP
# session blocked the old blocking-read loop for 17 minutes).
~~~

### splicer-pcr

Above `state = {"pcr": 0.0}`, lines 233 to 237 before the cut.

~~~python
# One continuously ascending MEDIA timeline across every splice: each new
# leg starts just past the last PCR actually delivered. Wall-clock offsets
# are wrong under starvation (measured: a 17-minute starved source pushed
# the next leg ~1000 s ahead of the uplink -> discontinuity storm), and
# backward jumps are equally fatal. PCR is the ground truth.
~~~

## `rig/route-core/test.sh`

### route-core-test

Above `set -euo pipefail`, lines 2 to 13 before the cut.

~~~sh
# rig/route-core/test.sh: build the C routing core and run it against every
# vector `demo/shell/route-vectors/index.json` lists, inside Docker.
#
#   rig/route-core/test.sh             gcc, -Wall -Wextra -Werror, then the vectors
#   rig/route-core/test.sh --arm       also a Cortex-M4 build, and its .text/.bss
#   SRC=/some/copy rig/route-core/test.sh   grade a scratch copy (how it was sabotaged)
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. This laptop kills any binary compiled or
# downloaded under the home directory (exit 137), so the compiler, the binary
# and the run all live in the container, and the binary is written to the
# container's /tmp, never into this checkout. Only `node` runs here, to turn the
# JSON into lines, and it pipes them straight into the container's stdin.
~~~

### route-core-toolchain

Above `docker run --rm -v "$SRC":/src:ro debian:bookworm-slim sh -c "`, lines 38 to 39 before the cut.

~~~sh
# ⚠️ The stock Debian toolchain, installed into a throwaway container each
# run. Nothing is kept, so this costs a package download every time.
~~~

## `rig/route-core/vectors-to-lines.mjs`

### vectors-to-lines

Above `import { readFileSync } from 'node:fs';`, lines 1 to 34 before the cut.

~~~js
// rig/route-core/vectors-to-lines.mjs: the route vectors as numbered lines a C
// runner can read with `fgets` and `strtol`, so the core never meets JSON.
//
//   node rig/route-core/vectors-to-lines.mjs > lines.txt
//
// This is L2's job from `plans/plan-route-core.md` §7, done the dumb way: a
// port name becomes its index, a link id becomes a number, an op name becomes
// its opcode, a kind becomes its bit. 🔴 IT RESOLVES NAMES AND NOTHING ELSE. It
// never checks a range, a direction or a cycle, because then the C would be
// graded on what this file already refused. An op it does not know is written
// as opcode 255, a value that is not an integer as `?`, a port nobody declared
// as 255, and the C is left to refuse each of them.
//
// ⚠️ THE NUMBERS MUST MEAN WHAT `route_core.h` SAYS. The op and kind lists below
// are checked against `route-core.mjs` and `midi-kinds.mjs` on every run, and a
// drift exits 1 before a line is written.
//
// ⚠️ A POLICY KEY IS READ THROUGH `canonKind`, so `{ pitchbend: 'deny' }`
// means bend. This file did it first; the JS read the key verbatim until
// 2026-10-03 and does the same now. Vector 21 uses one.
//
// The format, one record a line, fields split by spaces:
//   V file name...                       a vector starts
//   P index name dir accepts v0..v7      a port; verbs 0 allow 1 confirm 2 deny 3 unset
//   R port verb len b0 b1 ...            a rule on that port; `xx` is any byte
//   L id from to nops (code a0..a4)*     a link to make; `-` absent, `?` not an integer,
//                                        `v` notecc's on 'vel', and a curve's points as
//                                        one token `in,out,in,out,...` in its a0
//   I port t hex...                      an input
//   U id t | C port t | D port           unlink, confirm, deny
//   X id code                            an expected refusal, code as in route_status
//   O port t hex...                      an expected output
//   H port n                             expected held at the end
//   E                                    the vector ends
~~~

### vectors-velocity

Above `if (op === 'velocity' && field === 'scale') return typeof v === 'number' ? int32`..., lines 68 to 71 before the cut.

~~~js
// ⚠️ velocity's scale is a fraction. The C takes it in THOUSANDTHS, so 0.5 is
// 500, a scale under 1/2000 rounds to 0 and is refused (the JS refuses it too
// since 2026-10-03, vector 20), and a fourth decimal is lost. Why thousandths:
// `route_core.c`, the op.
~~~

### vectors-curve

Above `if (field === 'points') {`, lines 73 to 76 before the cut.

~~~js
// ⚠️ A CURVE'S TABLE IS ONE TOKEN, its pairs flattened with commas, so the
// fixed five slots of an L line still hold it. Anything that is not a list of
// integer pairs is `?`. How many points, their range and their order are the
// C's to refuse, not this file's: 17 points go across as 34 numbers.
~~~

## `rig/scene/say.mjs`

### say-header

Above `import { readFileSync } from 'node:fs';`, lines 1 to 17 before the cut.

~~~js
// rig/scene/say.mjs — tell whoever is wearing the headset what is going on.
//
//   node rig/scene/say.mjs working on the ray, then the panel
//   node rig/scene/say.mjs --shader /path/sky.glsl   # tier 2, session survives
//   node rig/scene/say.mjs --module 3                # tier 3, session survives
//   node rig/scene/say.mjs --reload e146cc5          # tier 4, THEY choose when
//
// 🔴 THE 2D PAGE IS INVISIBLE INSIDE AN IMMERSIVE SESSION, so a `d.log` line or
// a readout cell reaches nobody who is actually wearing the thing. This is the
// only channel that does: the page draws what arrives here on a panel in the
// room. It exists so that watching somebody's code get written does not require
// taking the headset off.
//
// ⚠️ AND IT IS ONE MESSAGE, NOT A STREAM. The relay's MEASURED ceiling is 60
// msg/s and it drops silently past that, so a build log piped through here
// would be indistinguishable from a broken socket. Say the state, not the
// output.
~~~

### say-close

Above `setTimeout(() => { ws.close(); process.exit(0); }, 400);`, lines 46 to 48 before the cut.

~~~js
// ⚠️ A CLOSE CAN OUTRUN THE FRAME. Closing straight after send has dropped
// the message before now — the relay is a hop away and the socket does not
// wait for it. A short beat, then go.
~~~

## `rig/shout/measure.mjs`

### shout-measure

Above `const args = process.argv.slice(2);`, lines 1 to 18 before the cut.

~~~js
// rig/shout/measure.mjs — what a SHOUTcast/Icecast listen actually costs,
// direct against the origin and through the Cloudflare relay, at the same time.
//
//   node rig/shout/measure.mjs 60 https://icecast.err.ee/raadiotallinn.mp3 https://shout.positron.studio/raadiotallinn.mp3
//   node rig/shout/measure.mjs 60 --out results/shout-2026-09-06.json <url> <url>
//
// THE ONE MEASUREMENT WORTH THE TROUBLE is the last one: how much later the
// SAME AUDIO BYTE arrives through Cloudflare. TTFB says nothing about it (a
// burst-on-connect can make the slower path look faster), and playing both and
// listening says nothing you can write down. Icecast hands every listener the
// same MP3 frames, and the relay does not transcode, so the two byte streams
// are identical apart from where each connection happened to start. Take a
// needle out of one, find it in the other, and the difference between the two
// arrival timestamps of that exact byte IS the added latency — no clock sync,
// no correlation window, no assumptions about the encoder.
//
// Everything else here is the context that number needs to be honest in:
// a burst that hides a stall, a mean bitrate that hides a gap.
~~~

### shout-ahead

Above `aheadOfRealtimeS: r2(rec.bytes / (NOMINAL_BPS) - secs),`, lines 116 to 118 before the cut.

~~~js
// Icecast sends FASTER than realtime on connect to prime the listener's
// buffer. This is how much audio you are holding beyond what has actually
// elapsed — the reason a stream can read 152 kbps at a nominal 128.
~~~

### shout-skew

Above `pair.startSkewBytes = found - at;`, lines 143 to 146 before the cut.

~~~js
// How far apart the two connections started in the stream. Icecast bursts
// a few seconds of already-encoded audio on connect, and two listeners
// rarely get the same amount, so this is NOT latency — it is where each
// one was handed the microphone. Reported so nobody reads it as latency.
~~~

## `rig/whep/run.mjs`

### whep-run

Above `import { createRequire } from "module";`, lines 2 to 6 before the cut.

~~~js
// RETIRED 2026-10-13: the input this drives, whep-rig, was DELETED from Stream that day (rig/whep/NOTES.md).
// WHEP rig driver — two SEPARATE chromium instances (publisher, player) so both
// pages are foreground: background tabs stop buffering AND rVFC with zero errors
// (plan §4.2). Uses playwright 1.60.0 from the npx cache (chromium-1223 already
// installed — no downloads).
~~~
