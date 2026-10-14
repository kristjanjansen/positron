# plan-pi-supercollider-defs: the Pi plays SuperCollider programs compiled in a tab

Status (2026-10-14): done. rig/board/scollide.mjs compiles program text with sclang-lite on the board, steps 1 to 6 struck in BACKLOG.md, played by /remote/collide/ and /drums/remote/.

Written 2026-10-12 from reading, with one measurement taken on the laptop
(the compiled sizes in §1.3). The Pi was not on the LAN, so **nothing in this
plan has run on the board**. Asked (BACKLOG `## Open`, "SuperCollider drums on
the Pi"): *"backlog pi sc drums and plan them along collide for pi"*.

Tags: **MEASURED** (with the file that holds the number), **READ** (taken off
code or a document, not run), **INFERRED** (reasoned, not checked),
**COMPUTED** (arithmetic on numbers tagged elsewhere).

Two pages want this:

- `/concepts/synth/100/` Collide here and on the Pi. One collide program
  played in the tab and on the Pi. Today the Pi side is a second wasm scsynth
  in the same tab with the trip modelled around it (`createPiSide()` in
  `demo/concepts/synth/100/index.html`, READ).
- `/concepts/rhythm/000/` and `010/` Drum machine and Drum knobs. Four drum
  programs compiled in the tab (`demo/concepts/rhythm/voices.mjs`), each hit
  handed to scsynth 150 ms early as a timestamped bundle
  (`drum-machine.mjs` `AHEAD = 150, TICK = 25`, `sendAt` in
  `demo/shell/scsynth.mjs`, READ), the closed hat choking the open hat in the
  same bundle time.

## 0. The verdict

**Build it as a third scsynth on the board, `poscollide` on UDP 57131, that
takes program TEXT over five verbs, compiles it on the board with the very
same `demo/shell/sclang-lite.mjs` the tab uses, and plays timestamped hits and
notes the board turns into OSC bundles itself.** Four findings decide the shape:

1. **Text, not bytes.** `video.shader` already set the pattern on this board:
   the page sends the body, the board compiles it and answers with the
   compiler's verdict (READ, `rig/board/board.mjs` `case 'video.shader'`,
   `rig/board/video.mjs` `shader()`). Here it is better than that, because the
   compiler is one JavaScript file both ends import, so the board and the tab
   produce the same bytes from the same text, and a page can prove it by
   sending the md5 of its own bytes. Sending text means only graphs this subset
   can express ever reach scsynth: 12 UGens, at most 64 live audio wires, 2
   channels, `!` up to 16 (READ, `sclang-lite.mjs` `UGENS`, `WIRE_CEILING`,
   `MAX_CHANNELS`, `MAX_DUP`). No browser ever hands the board's native
   SynthDef parser a binary of its own making. And sclang itself was refused
   on the Pi for exactly this risk: *"sclang can shell out and a visitor's text
   would be running on the board"* (READ, `sclang-lite.mjs` header).
2. **A server of its own, not the sampler's on 57130.** The sampler runs our
   definitions and holds the piano for whoever is playing it; this server runs
   whatever a visitor typed. A separate process can be killed and restarted
   without touching the piano, gets a limiter on its own tail, and has its own
   `/notify` client. Its cost is one more scsynth and one more JACK client
   (§1.4).
3. **The board is the clock while it is in the room.** A page finds the
   board's clock with the min round trip ping exchange `proto/looper/peer.mjs`
   already implements, and sends every hit's `at` as a moment on the board's
   clock. The board then only has to turn milliseconds into an OSC timetag.
   Mac and Pi agreed to **2.7 ms** this way over the relay (MEASURED,
   `plans/plan-jam.md` decomposition table).
4. **The lead is what the relay's tail decides, and the direct path barely
   has one.** 250 ms ahead on the relay and 150 ms on the direct path keeps
   the worst measured lump on time with the tab's own timer lateness inside it
   (COMPUTED in §2.4). The sound comes back later than it plays: about
   **139 ms** on the relay and **44 to 46 ms** direct (COMPUTED in §3.1), so the
   pages show both sides and a crossfader, as synth/100 already does.

The kit needs one change before any of this is visible: `createBoard` makes
its own 48 kHz AudioContext and wires its playout straight to the speakers
(READ, `demo/shell/board.mjs` `startAudio`), so the Pi's sound cannot meet
the local sound in one crossfader. §3.2 is the fix.

## 1. The verbs, the server, and what keeps it safe

### 1.1 The verbs

Five verb families, each answered on the path it came in on (`replyVia`, READ,
`board.mjs` `handle()`), each refusing with a reason rather than dropping.

| verb | body | answer | what the board does |
| --- | --- | --- | --- |
| `audio.start { source: 'collide' }` | | `audio.started` | starts `poscollide` if it is not up; starts nothing else and stops nothing else, the sampler's rule (READ, `scsampler.mjs` `startPlan`) |
| `audio.stop { source: 'collide' }` | | `audio.stopped` | stops `poscollide` only |
| `sc.load` | `{ name, text, md5? }` | `sc.loaded { ok, name, def, bytes, ugens, controls, freesItself, gateUsed, compileMs, loadMs, same }` or `{ ok: false, reason, line, col }` | compiles with `sclang-lite.mjs`, re-reads the bytes with `readSynthDef` and checks every block (§1.5), `/d_recv` under `pg_<name>`, waits for scsynth's own `/done /d_recv` |
| `sc.hit` | `{ hits: [{ name, at, args?, choke? }] }` | none; counted in `sc.stats` | one OSC bundle per hit at `at`, with the choke's `/n_set gate 0` in the same bundle |
| `note.on`, `note.off`, `note.panic` | `{ node: 'collide', name, note, vel, at? }` | `note.ack` | `/s_new` with `freq`, `gate 1`, `amp` scaled by velocity; `gate 0` or `/n_free` on off, as `collide-voice.mjs` decides by the program's `gateUsed` and `freesItself` (READ) |
| `sc.set` | `{ name, param, value }` | `sc.set { ok, nodes }` | the value for every note to come, and `/n_set` to every live node of that def, as `collide-voice.mjs` `param()` does |
| `sc.stats` | | `sc.stats { defs, live, started, ended, late, droppedLate, refused, fails, cpu: { avg, peak }, xruns }` | |
| `clock.ping` | `{ t0 }` | `clock.pong { t0, t1 }` | `t1` is the board's `performance.timeOrigin + performance.now()`, in epoch ms |

Why these shapes:

- **Notes ride the existing `note.on` with `node: 'collide'`**, the way the
  sampler is addressed today (`isForSampler`, READ, `scsampler.mjs`). That
  buys the direct path's reorder guard for free: `ctl` is unordered and the
  board refuses a note older than the last one applied to the same key, and
  the page numbers exactly `midi.send`, `note.on` and `note.off` (READ,
  `demo/shell/board.mjs` `send()`, `rig/board/rtc.mjs`).
- **Hits need no ordering at all**, because every hit carries an absolute
  `at` and scsynth runs bundles in timetag order. A step's hits travel as ONE
  message, so 120 bpm with all four rows on is 8 messages a second, 12 at
  180 bpm (COMPUTED from `STEPS = 16`, `stepMsAt(b) = 60000 / (b * 4)`, READ),
  against a relay that takes 1000 msg/s (READ, `workers/relay/src/index.js` via
  positron-streaming).
- **The page never names a node id.** The board allocates ids on its own
  server from 100000 up, keeps `live` per def, and resolves `choke: 'hho'` to
  every live node of `pg_hho` at the hit's time. A choke that reaches a node
  which already freed itself is a `/fail` from scsynth (READ, `voices.mjs`
  `LIFE` comment) and is counted, not reported as an error.
- **`args` are checked against the def's own controls.** A name the program
  does not declare is refused rather than sent (scsynth would ignore it,
  READ, `collide-voice.mjs` header), values must be finite, at most 16 pairs,
  `freq` clamped 20 to 20000 and `amp` to 0 to 1 (INFERRED limits).

### 1.2 Names and replace semantics

- `name` must match `^[a-z][a-z0-9_]{0,23}$`, the pattern `params.set`
  already uses for an OSC command name (READ, `board.mjs`). The definition on
  the server is `pg_<name>`, so a page can never replace `posSampler1`,
  `posSampler2` or anything the board loads for itself.
- **Last load wins, per board.** A second `sc.load` of `kick` replaces it for
  the next hit, and a node already running finishes on the graph it started
  with (READ, `collide-voice.mjs`: "scsynth keeps the old graph for a node
  already running until that node ends"). Two tabs loading `kick` share one
  kick. That is the board's existing posture (one instrument, one capture,
  the presence badge says who else is driving, READ `board.mjs` header of
  `createBoard`), and `sc.loaded` is sent to the room as well as to the asker
  so the other tab hears its program was replaced.
- **At most 16 names.** A seventeenth is refused with the list, never evicted
  silently, because the evicted one might be somebody else's (INFERRED cap;
  the two pages need 5).

### 1.3 Sizes, MEASURED on the laptop today

Every program the two pages play, compiled in node 25 with
`demo/shell/sclang-lite.mjs` and re-read with `readSynthDef`:

| program | text | SynthDef | UGens | compile |
| --- | --- | --- | --- | --- |
| collide (synth/090, 100) | 864 B | 1108 B | 19 | 2.8 ms (first call) |
| kick | 623 B | 1010 B | 15 | 0.4 ms |
| snare | 544 B | 1003 B | 15 | 0.3 ms |
| open hat | 621 B | 1526 B | 30 | 0.8 ms |
| closed hat | 575 B | 1272 B | 28 | 0.3 ms |
| the four with knobs (010) | 573 to 651 B | 1032 to 1561 B | 16 to 31 | 0.2 to 0.4 ms |

Block classes seen: `Control`, `LagControl`, `EnvGen`, `BinaryOpUGen`, `Saw`,
`RLPF`, `SinOsc`, `WhiteNoise`, `HPF`, `Pulse`, `Out`. MEASURED with a
throwaway script in the session scratchpad, not kept.

So the text cap can be **4000 characters**, 4.6 times the largest program
(COMPUTED), and the bytes sit far under every ceiling: native scsynth takes
**65,488 bytes over UDP** (MEASURED, `research/synthdef-size-limit-2026-09.md`).
That the module compiles in node is itself MEASURED today. On the Pi the
compile is INFERRED at a few milliseconds to a few tens; step 4 measures it.

### 1.4 Which scsynth

| | the sampler's, UDP 57130 | its own, UDP 57131, JACK client `poscollide` |
| --- | --- | --- |
| process | none new | one more scsynth: RAM and idle DSP cost UNMEASURED on the Pi (INFERRED tens of MB, a few per cent of one core) |
| into the capture | already wired, `possampler:out_1/2` (READ, `graph-registry.mjs` `JACK_ENDS.sampler`) | a new `JACK_ENDS.collide` row and `wire()` into the capture, the sampler's code path (READ, `scsampler.mjs` `startScSampler`) |
| replies | `scsynth -l 1` and one `/notify` socket owned by `scsampler.mjs` (READ, `scsynthArgs`), so `/n_end` for page nodes would arrive on the sampler's socket and need routing | its own socket and its own `/notify` |
| lifecycle | stopping the sampler stops the drums; starting drums means starting the sampler, which loads the piano's 208 files first (READ, `startScSampler` waits on `ensureSet(0)`) | starts in about the time scsynth takes to say `server ready` (INFERRED from the sampler's 6 s ceiling, READ), no samples |
| a runaway def | shares the DSP thread with the piano | can be `kill -9`'d and restarted without touching the piano |
| a limiter | would sit on the piano too | a board-written tail def on this server only (§1.5) |
| CPU | one DSP thread | a second DSP thread; both feed one jackd, so an xrun is everyone's either way (READ, `jacksynth.mjs` `countXruns`) |

**Recommendation: its own.** The difference that decides it is trust, not
CPU: one server runs programs this repository wrote, the other runs programs a
visitor wrote.

🔴 **ONE TRAP THE SECOND SERVER WALKS INTO.** `stopPappus` kills every scsynth
except the one on `SAMPLER_SC_PORT` (READ, `jacksynth.mjs`
`pappusScsynthPids(pgrepAx, keepPort = SAMPLER_SC_PORT)`). A third server on
57131 would be killed every time somebody switched the granulator off. That
function takes a list of ports to keep in the same session the server is added,
with a `test.mjs` negative control beside the two that exist (READ,
`test.mjs:1415-1416`).

### 1.5 Safety: the gate, and what stops a runaway

The board's existing gate is an allowlist matched by whole shape, never by
prefix: the Circuit SysEx gate lets out exactly two read messages, by length
and byte, because a prefix test is the gate that lets `Replace Patch` through
(READ, `rig/board/inputs.mjs` `midiVerdict`, `dumpRequestSynth`). The same
posture here:

1. **No OSC from a browser, ever.** Every address and every argument list is
   built by the board. A page sends verbs; there is no raw door like
   `params.set`'s (READ, `board.mjs`, whose blast radius argument is one
   granulator's parameters).
2. **Only compiled text.** `sc.load` takes text, and the board compiles it.
   A compile error answers with the compiler's own line and column.
3. **Belt and braces on the bytes.** After compiling, the board re-reads its
   own bytes with `readSynthDef`, which refuses anything not consumed to the
   exact byte (READ, `synthdef.mjs`), and checks every block's class against
   the set `sclang-lite` can emit, every `Out` against a constant bus 0, and
   the block count against 64 (MEASURED largest today: 31). This guards
   against a future change to the compiler, not against the page.
4. **Node caps.** At most 48 live page nodes on `poscollide`; past it the
   oldest is released (`gate 0`, then `/n_free` after 50 ms), as the sampler
   steals at 32 (READ, `scsampler.mjs` `VOICES`). 48 covers the drums at their
   worst: at 180 bpm with every pad on, kick about 5 live, snare up to 7, the
   hats choking each other, about 30 nodes and 600 UGens (COMPUTED from
   `LIFE` and `PARAMS` in `voices.mjs`, READ).
5. **Length caps.** A hit node is freed by the board 4 s after its `at` if
   scsynth has not said `/n_end` (the longest drum is the open hat at
   `length` 1.5 s, READ). A note node is freed 30 s after `note.on` with no
   `note.off`. A hit on a def that does not free itself (`freesItself: false`)
   is refused at `sc.hit`, because nothing would ever end it.
6. **The `at` window.** On the board's clock, an `at` more than 2 s ahead is
   refused, an `at` up to 20 ms behind plays at once and counts `late`, and
   older is dropped and counts `droppedLate` (INFERRED thresholds; step 6
   measures whether 20 is right).
7. **Loudness.** The subset has no `In`, `ReplaceOut` or `Limiter`, so a
   page cannot limit itself. The board loads one def of its own,
   `posCollideOut`, at the tail of `poscollide`: `ReplaceOut` of a `Limiter`
   on buses 0 and 1, at a level matched to the sampler's `LOUDEST = 0.30`
   (READ). It is written by sclang once, as `norns/possampler-defs.scd` is,
   because that path already works on the board (READ, `ensureDefs`).
8. **CPU.** `/status` every 2 s on `poscollide` (the sampler's `cpu()` already
   reads `avg` and `peak`, READ). Above 70 per cent average the board refuses
   new hits and says so in `sc.stats`; no `/status.reply` for 3 s means the
   DSP thread is stuck, and the board kills and restarts the server (INFERRED
   thresholds).
9. **Liveness.** A page that loaded or played and has said nothing for 15 s
   has its held notes released, the `INSERT_HELD_MS` rule (READ, `board.mjs`,
   15000 ms checked against `/grains/`'s 4 s poll).
10. **Harness runs.** `createBoard` already refuses every send under
    `?selfcheck=1` unless `?board=1` (READ, `demo/shell/board.mjs`
    `inSelfcheck`). Nothing new is needed and nothing should bypass it.

The relay stays tokenless, so anybody who knows `studio-1` can load a program.
What they get is sound from a 12-UGen subset, capped in count, length and
level, on a server the board can restart. That is the same size of exposure
as `note.on` and `patch.apply` today (READ, `board.mjs` comment on
`params.set`).

## 2. Timing: a hit at shared time S becomes a bundle on the Pi

### 2.1 The clocks in the chain

| clock | what it is | source |
| --- | --- | --- |
| the tab's `performance.now()` | where `drum-machine.mjs` computes each step's `at` | READ |
| the tab's epoch | `performance.timeOrigin + performance.now()`, `epochNow()` | READ, `proto/looper/peer.mjs` |
| the board's epoch | the same expression in node; node has `performance.timeOrigin` | READ, `rig/peer.mjs` runs `peer.mjs` in node |
| scsynth's OSC time on the Pi | NTP seconds from the system clock, advanced against JACK's frame count | INFERRED from SuperCollider's design; never measured on this board |
| WebAudio in the tab | SuperSonic maps a timetag to the speakers through `getOutputTimestamp` | READ, `scsynth.mjs` `sendAt` comment |

Two machines' system clocks here have differed by **~10.4 ms** and this Mac's
once by **+159 ms** (MEASURED, `plans/plan-routing-time.md` §3.1 last row), so
the Pi's timetag cannot be the tab's epoch sent as is.

### 2.2 How S becomes a timetag

1. **The page finds the board's clock.** It sends `clock.ping { t0 }` in
   bursts of 5 every 2 s, the cadence `peer.mjs` uses (READ, `pingBurst = 5`,
   `pingEveryMs = 2000`), and keeps the sample with the smallest round trip:
   `offset = t1 - (t0 + t2) / 2`, NTP's estimator with the minimum kept and
   never an average (READ, `peer.mjs` `onPong`). It imports that estimator
   rather than copying it.
2. **The board is the reference.** `peer.mjs` makes the lowest id the
   reference (READ). With the board in the room the board's clock IS the
   shared clock, which keeps `at` meaning what `plan-routing-time.md` §4.1
   decided it means (a moment in shared ms), and lets two tabs agree with
   each other through it.
3. **The page sends `at = timeOrigin + perfAt + offset`**, where `perfAt` is
   the step's time on its own clock.
4. **The board turns `at` into a timetag** with no clock of its own to
   reconcile: seconds `at / 1000 + 2208988800`, fraction to 32 bits, the same
   arithmetic `scsynth.mjs` `ntpOf` does in the tab (READ). It needs an OSC
   bundle encoder in node next to `oscMessage` in `jacksynth.mjs` (READ: only
   messages exist there today).

What is left unknown is step 4's assumption that scsynth's OSC time and node's
epoch on the same Pi agree. They read the same system clock, so INFERRED within
a JACK period, and step 4 of §4 measures it.

### 2.3 How good the offset is

| path | round trip | offset agreement | source |
| --- | --- | --- | --- |
| relay, Mac to Pi, node | 64 to 69 ms | 2.7 ms | MEASURED, `plans/plan-jam.md` |
| relay, browser to Pi, `/jam/` | 48 to 51 ms | Pi corrected by -9.85 ms | MEASURED, same table |
| relay, two peers on one Pi | 42 to 44 ms | 0.13 ms error against a true zero | MEASURED, same table |
| relay, clock/020 | | an injected 230 to 270 ms skew found to within 2.4 ms | MEASURED, BACKLOG clock/020 row |
| direct, browser to Pi | p50 3.7, p90 5.2, p99 8.8 ms; 3.3 ms on sampler/030 | never measured for a clock | MEASURED, `plans/plan-away-webrtc.md` §9 P0; HANDOFF session 75 |

`plan-jam.md` found the ~3 ms is almost all oscillator, not path, so the
direct path is not expected to beat the relay for the clock by much
(INFERRED). Either way the offset error is well under one JACK period.

### 2.4 How far ahead the page sends, per path

A hit leaves the tab when the scheduler next looks: every `TICK` 25 ms for
everything due before `now + AHEAD` (READ, `drum-machine.mjs`). The worst
earliness it is handed over with is `AHEAD - TICK - timer lateness`, and the
tab's timer has been measured up to **43 ms** late when busy (MEASURED,
`/concepts/clock/010/`, BACKLOG "Time and sync" row). It then has to cross
the path and land in scsynth at least one JACK period before its time.

| term | relay | direct | source |
| --- | --- | --- | --- |
| tab to Pi, typical | ~36 ms (two ~18 ms legs) | ~2 ms (half of 3.7) | MEASURED, `plan-away-webrtc.md` §2 and §9 |
| tail | worst single gap 83.6 ms, p99 43.5 (measured Pi to tab, the reverse direction) | p99 round trip 8.8, so ~4.4 one way | MEASURED, `demo/shell/board.mjs` cushion comment; `plan-away-webrtc.md` §9 |
| the board reading JSON and building a bundle | unmeasured | unmeasured | |
| JACK period on the Fast Track Pro | 512 frames at 48 kHz = 10.67 ms | same | READ, HANDOFF session 74 (`-p 512 -n 3`); COMPUTED |
| JACK period with no card (dummy) | 1024 frames = 21.33 ms | same | READ, `jacksynth.mjs` `jackdArgs` |
| **needed, typical worst** | 36 + 83.6 + 10.7 = **130 ms** | 4.4 + 10.7 = **15 ms** | COMPUTED |
| handed over at least, with AHEAD 150 | 150 - 25 - 43 = **82 ms**: short of 130 | **82 ms**: 67 ms spare | COMPUTED |
| handed over at least, with AHEAD 250 | **182 ms**: 52 ms spare | | COMPUTED |

**So: AHEAD 250 on the relay, 150 on the direct path.** The local voices keep
their 150 on a page that only plays locally. On a page that plays both, the
local hits are scheduled at the same S as the Pi's, so a page uses one AHEAD,
the path's. What a longer AHEAD costs is how soon an edit is heard: a pad
pressed now is in the first step not yet handed over, which at 120 bpm (125 ms
a step) is 2 steps away on the relay and 1 to 2 direct (COMPUTED). The drum
page's tempo anchor already handles a change landing from the first step not
handed over (READ, `drum-machine.mjs` `anchor`).

The relay's tail was measured on PCM going the other way and in a different
month, so 250 is a starting value. The number to read is the board's own
`late` count, which should stay at 0 over 1000 hits on each path (§4 step 6).

### 2.5 A key press is not scheduled

synth/100's keys are as it happens: the press goes out immediately with no
`at`, the mode `plan-routing-time.md` §4.2 names for a person pressing a
button. Its Pi lag is then the up leg plus the return, and its spread is the
path's jitter. One option worth a measurement and not a default: send the key
with `at = now + lead`, which trades a constant extra lag for a spread near
zero. The page already has the cells that would show the trade (READ,
`synth/100` `Pi lag`, `Pi spread`).

## 3. The sound back

### 3.1 What returns, and when

The Pi's sound is the capture: one `ffmpeg -f jack` on `posboard`, mono at
48 kHz (`-ac 1`), held by whoever is sounding, cut into 20 ms frames for the
relay and 10 ms halves for the direct path (READ, `jacksynth.mjs`
`ensureCapture`). Everything on the board is summed into it: Yoshimi, the
sampler, and now `poscollide` (READ, HANDOFF session 74, option b). So the
Pi scope on a page shows anyone's notes, not only this page's.

| | relay | direct | source |
| --- | --- | --- | --- |
| frame | 20 ms | 10 ms | READ, `ensureCapture`; `plan-away-webrtc.md` §9 P3 |
| cushion | 100 ms floor, adaptive to 250 | 40 ms (`directCushionMs`), held ~35 at 10 ms frames | READ, `createBoard` defaults; MEASURED `plan-away-webrtc.md` §9 P3, P4 |
| key press to speakers | ~175 ms | ~48 ms | MEASURED, `plan-away-webrtc.md` §9 table (Yoshimi) |
| board round trip | ~72 ms | 4 ms | MEASURED, same table |
| **sound to the tab's speakers after it plays on the Pi** | ~175 - 36 = **~139 ms**, moving up to +150 as the cushion ratchets | ~48 - 2 to 4 = **~44 to 46 ms** (half or all of the 4 ms round trip taken off) | COMPUTED |
| ffmpeg's own JACK buffer | inside every number above, never separated | same | `research/pi-drum-machines-2026-09-21.md` §9 item 4 |

So a hit at S plays on the Pi at S and is heard in the tab at about S + 139
on the relay, which is more than one sixteenth at 120 bpm (125 ms, COMPUTED).
Both sides playing at once on the relay is a pattern and its echo one step
late. Direct, it is a 46 ms flam.

synth/100's model says about 210 ms for press to Pi sound on the relay (READ,
its `DOWN_MS` sum), against ~175 measured for Yoshimi. The model's
1024-frame JACK period is the dummy driver's; the board runs 512 on the card
now, which is 10.7 ms less (COMPUTED).

### 3.2 The AudioContext mismatch, and the fix

READ in `demo/shell/board.mjs` `startAudio()`:

- it makes `new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' })`,
  its own, because nothing in the chain resamples and a context at 44.1 kHz
  plays the board's frames at the wrong pitch with a ring that fills faster
  than it drains;
- it connects the playout to that context's destination, hard-wired.

synth/100 makes its own `new AudioContext({ latencyHint: 'interactive' })` on
the first key (READ), at whatever rate the device gives, and its local
scsynth, scopes, meters and crossfader all live in it. Two contexts cannot
share a node, so the Pi's playout cannot reach the page's crossfader or its
lag meter.

**Fix, one kit change, made once by one agent (`demo/shell/board.mjs` is
shared):** `createBoard({ audioContext, toDestination })`.

- `audioContext`: use the page's context if its `sampleRate` is 48000;
  otherwise say so in the log, as `startAudio` already does for its own, and
  refuse rather than resample.
- `toDestination: false`: build the playout and its meter but do not connect
  it to the speakers; the page connects `board.playout()` where its links say.
  Default `true`, so `/knobs/`, `/away/`, sampler/030 and synth/060, 070 are
  untouched.
- Pages that use it make their context with `sampleRate: 48000` on the first
  gesture. SuperSonic runs at the context's rate (READ, `bootScsynth` logs
  `ctx.sampleRate`), and the programs here are rate independent (INFERRED: no
  sample counts in them).

The alternative, two contexts, keeps the Pi's scope on the board's analyser
and turns the crossfader into two gains in two contexts summed by the
operating system. It works, it has no meter on the mix, it gives two
`getOutputTimestamp` clocks for the two lag cells, and it doubles the
suspended-context failures `board.mjs` already spends a page of comments on
(READ). Not recommended.

⚠️ Whether every browser honours `sampleRate: 48000` is not known here.
`board.mjs` says when it does not (READ), and an iPhone is the device to try.

### 3.3 synth/100 with the real Pi

The layout does not change (READ, the page's header and its BACKLOG row): the
two waves side by side at half width, here on the left, the Pi on the right,
stacked on a phone; the crossfader under them with `here` and `Pi` inside the
lane; the four cells on top, `local lag`, `local spread`, `Pi lag`,
`Pi spread`; knobs above the code; keys; patchbay.

What changes is `createPiSide()`, which already names the five calls the page
uses (READ):

| call | simulated today | real |
| --- | --- | --- |
| `wake(ctx)` | a second wasm scsynth plus a 34 ms delay and a fold to mono | `createBoard({ room: 'studio-1', direct, audioContext: ctx, toDestination: false })`, `startAudio()`, `audio.start { source: 'collide' }`, then `sc.load { name: 'collide', text: PROGRAM, md5 }`, waiting for `sc.loaded` |
| `noteOn` / `noteOff` | the local voice 34 ms later | `note.on` / `note.off { node: 'collide', name: 'collide', note, vel }` |
| `param` | the local voice 34 ms later | `sc.set { name: 'collide', param, value }` |
| `out()` | a `DelayNode` | `board.playout()` in the page's context |

The Pi node's label loses `simulated`, the right panel's footer reads the path
(`relay` or `direct`), and the page takes `?path=direct` as sampler/030 does
(READ, BACKLOG sampler/030 rows). A path choice on the page is the owner's
call; sampler/030 has one. `sc.loaded`'s `same: false` (the board's bytes
differ from the tab's) is a log line in red, because it means the two sides
are not playing one program.

### 3.4 The drum page with a Pi side

A new number, because a new idea is a new page (positron-concepts skill):
**rhythm/020 Drums on the Pi**, 000 plus a Pi side (050 is taken by the camera
page in BACKLOG). The number and title are for the owner.

- **Above the grid**: synth/100's pair of wave panels (here, Pi) and its
  crossfader, unchanged. With both sides up on the relay the mix is a pattern
  and its echo (§3.1), and the crossfader is how a listener picks one.
- **The bay**: one Pi node, `pi-1:drums`, with `midi-in` and `audio-out`.
  The capture is one summed stream, so the Pi cannot honestly offer four
  audio outs. Link `web:sequencer:midi-out -> pi-1:drums:midi-in` with no
  filter; the node's `deliver`, page side as synth/100's Pi ports are, maps
  General MIDI's drum notes to the four names with `NOTE` from `voices.mjs`
  (READ) and gathers one step's hits into one `sc.hit`.
  `pi-1:drums:audio-out -> web:scope-pi:audio-in` and
  `-> web:xfade:audio-in-2`.
- **The choke on the Pi**: a closed hat hit carries `choke: 'hho'`. The board
  closes every live `pg_hho` node in the same bundle, which is what the page
  does locally with `/n_set gate 0` (READ, `drum-machine.mjs` `hit()`).
- **Knobs (if built on 010's voices)**: each hit carries its knob's value in
  `args`, as the local hit does, so a turn reaches the Pi on the next hit with
  no separate verb (READ, `drum-machine.mjs`: "A knob's value goes in the
  hit's own bundle").
- **Four cells on top** (positron-concepts: a readout goes on top):
  `Pi late` (the board's `late + droppedLate`, from `sc.stats` every 2 s),
  `Pi lag` (S to the first onset in the returning sound, on the page's own
  `getOutputTimestamp`, the way sampler/030 times a key, READ), `round trip`
  (`board.stats().rttMs`), `path`.
- **What should be true, as an assert**: this page handed over N hits, the
  board started N (`started` in `sc.stats`). `/grains/` asserts the same of its
  twins (READ, `research/pi-drum-machines-2026-09-21.md` §8.3), and it is the
  check that catches the Pi silently a bar out.

**An align mode, later, not first.** On the relay the page could schedule its
LOCAL hits at `S + d`, where `d` is the measured S to heard on the Pi, so the
two land together; that is `plan-routing-time.md`'s follow mode with the local
side following the heavy link. `d` moves when the cushion ratchets, so it needs
that plan's timebase (median of 9, a step after 3 off), and it is not needed
to answer whether the Pi plays on time.

## 4. Steps, smallest first, each one session

Every step says where it can run. "No Pi" steps use the laptop and
`demo/fake-board.mjs`, the stand-in every board page reaches with no code of
its own (READ, `createBoard` doc). There is no native scsynth on the laptop,
and this is a managed machine where locally built binaries are killed, so
installing one is asked first, not assumed (memory `managed-machine-ask-first`).

### The md5 check on the board code

Before any step that measures on the Pi: `rig/board/push.sh` copies `rig/board`
and every module it imports from `../../`, then prints the md5 of each file
under **`/opt/positron-board/`**, which is what `positron-board.service`
executes, beside the laptop's (READ, `push.sh`). `~/positron` on the board is
a stale copy and proves nothing (READ, positron-hardware skill). HANDOFF
session 75: *"The Pi ran code four hours old and sampler/035 never went
direct."*

Two things this plan adds to that check:

- **The list.** `push.sh` prints nine files today (board.mjs, jacksynth.mjs,
  pappus.mjs, scsampler.mjs, sampler.mjs, possampler-defs.scd, run-pappus.scd,
  Engine_Pappus.sc, PosSource.sc, READ). The new board module, the
  `posCollideOut` script, `demo/shell/sclang-lite.mjs` and
  `demo/shell/synthdef.mjs` go on it in the same session they are written.
  The script's own rule: an md5 that covers one of two changed files is a
  confirmation that can be true while the deploy is broken (READ).
- **The transitive import.** `push.sh` and `setup.sh` copy only what
  `rig/board/*.mjs` imports directly from `../../` (READ, both grep
  `from '../../'` in `rig/board` only). `sclang-lite.mjs` imports
  `./synthdef.mjs`, which nothing in `rig/board` imports today, so a board
  module that imported only the compiler would install cleanly and die on its
  first import. The board module imports both directly, and that line carries
  a comment saying why.

And then ask the running process, not the file: `node rig/board/ask.mjs
--room studio-1 sc.stats` answering at all is the proof the service restarted
on the new code (READ, positron-hardware: ask the relay first, it needs no LAN).

### The steps

| # | what | where | how it is measured |
| --- | --- | --- | --- |
| 1 | **The board core, pure.** A new `rig/board/scollide.mjs` with `createCollideCore({ send, now })`: the name rule, the text cap, compile, re-read and block check, the 16-name cap, node ids, `live` per def, choke resolution, the `at` window, the life timers, the node cap. An OSC bundle encoder beside `oscMessage` in `jacksynth.mjs`. `pappusScsynthPids` takes a list of ports. | no Pi, no browser: `node rig/board/test.mjs` | every program in §1.3 compiles on the board side to the same md5 as in the tab; refusals for a name that is not a name, text over 4000, a program with a compile error (line and column come back), a 17th name, a hit on a def that does not free itself, an `at` 3 s ahead, an `at` 100 ms behind; the bundle's timetag for a known `at` against a hand-computed fixture. Sabotage, as `test.mjs` does for the SysEx gate: accept any block class, accept any name, drop the choke, keep only one port in `pappusScsynthPids`; each must turn reds, and the count of reds is reported |
| 2 | **The page side, against the stand-in.** A kit module (one agent, shared) that holds `clock.ping` and the min round trip offset (imported from `peer.mjs`), `load`, `hits`, `note`, `set`, `stats` over a `createBoard`. `demo/fake-board.mjs` learns the verbs with the core from step 1 and an injected clock skew. | no Pi: stand-in, local server | the offset found against an injected 230 to 270 ms skew, as clock/020 was graded (2.4 ms there, MEASURED); hits handed over equal hits the stand-in scheduled; at AHEAD 250, `late` 0; sabotage: AHEAD 10 makes `late` count, a flipped offset sign puts every `at` 500 ms out |
| 3 | **One context.** `createBoard({ audioContext, toDestination: false })`. synth/100 makes its context at 48 kHz and routes the stand-in's tone through its Pi scope and crossfader, its Pi side still simulated otherwise. | no Pi: stand-in | `ctx.sampleRate` 48000; the Pi scope reads non-zero samples from the stand-in's tone; the crossfader at `here` silences it at the mix meter. The other `createBoard` pages (`/knobs/`, `/away/`, sampler/030, synth/060, 070): `check-html` on each and one targeted verify run of `knobs` and `away` against the stand-in, assert counts unchanged |
| 4 | **The board, from node.** Push, md5 check. `poscollide` up, `posCollideOut` written, the capture wired. From `ask.mjs`: `sc.load` the five programs; 100 kicks at `at = now + 300`; then 100 with no timetag. | **Pi on the LAN** | compile and load ms on the Pi; scsynth's `late` lines (INFERRED: native scsynth prints `late <seconds>` for a late bundle; `scsampler.mjs` already forwards every scsynth line to the log, READ); on the board, the time each kick's onset reaches node in the capture minus its `at`, timetagged against untimed, which separates the scheduling error from ffmpeg's JACK buffer, the term no number here has ever separated; CPU of `poscollide` idle and with 30 nodes (`/status` and `ps`); jackd xruns before and after; a piano note through the sampler while the kicks run (the sampler unaffected); `stopPappus` leaves both servers alone |
| 5 | **synth/100 real.** `createPiSide()` on the board, relay and `?path=direct`. | **Pi on the LAN** for direct; the relay works from anywhere the Pi is up | `Pi lag` and `Pi spread` per path, beside the model's ~210 ms; `same: true` from `sc.loaded`; the `at = now + lead` option for keys, if the owner wants it, as one more pair of numbers |
| 6 | **rhythm/020 Drums on the Pi.** §3.4. | **Pi on the LAN** for direct | `Pi late` stays 0 over 1000 hits at AHEAD 250 on the relay and 150 direct, and a run at AHEAD 100 on the relay to see the first late ones; hits handed over equal hits started; `Pi lag` per path; CPU at 180 bpm with every pad on; the choke heard on the Pi (the open hat's onset energy cut within 20 ms of the closed hat, on the returned sound) |
| 7 | **Later, if asked.** The align mode (§3.4). The PCM header's Pi stamp as a shared-clock time, `plan-routing-time.md`'s Pi fix, which would let a page read the Pi's own sounded-at error off the returned frames. The board on the shared clock for two tabs on one beat. | Pi | each as that plan says |

Steps 1 to 3 need no Pi and can be done today. Steps 4 to 6 need the Pi on the
LAN for the direct path; the relay half of 5 and 6 needs only the Pi up.

## 5. What could not be settled from reading, and what would settle it

1. **Whether scsynth's OSC time and node's epoch agree on the Pi.** INFERRED
   from both reading the system clock. Step 4: timetagged against untimed
   kicks, onset times on the board.
2. **ffmpeg's own JACK capture buffer.** In every return number and never
   separated (`research/pi-drum-machines-2026-09-21.md` §9 item 4). Step 4
   separates it as the untimed kicks' onset delay minus one period.
3. **The relay's tail in the tab to Pi direction.** The 83.6 ms worst is the
   other direction, from 2026-09-16. Step 6's `late` count at AHEAD 100 and
   250 is the measurement that matters.
4. **CPU headroom.** The Pi's model is a Pi 4 from three traces, never read
   off `/proc/device-tree/model` (READ, research §9 item 1). A second scsynth
   beside Yoshimi, the sampler, the capture and possibly the GPU picture has
   never been measured. Step 4 and step 6.
5. **The idle cost of a third scsynth and fourth JACK client**, and whether
   JACK xruns rise with it. Step 4.
6. **Whether a browser gives a 48 kHz context everywhere.** Step 3 on the
   desk, then an iPhone.
7. **The clock offset over the direct path.** Never measured for a clock;
   the round trip is (3.3 to 3.7 ms). Step 2's estimator on step 5's page.
8. **Whether the board's compile is byte identical to the tab's on the Pi.**
   Same file, same engine family (node 24 on the Pi, READ HANDOFF; Chrome's V8
   in the tab), so INFERRED yes. Step 1 grades it on the laptop and `same` in
   `sc.loaded` grades it on the Pi every time.
9. **Whether the direct path exists from another building.** Unknown since
   `plan-away-webrtc.md` §7 (READ). Everything here falls back to the relay
   with its longer lead, and the page says which path it is on.
10. **The summed capture.** The Pi scope and `Pi lag` can be fooled by
    somebody else's note on the same board. The lag measure only times a note
    that starts from silence (READ, synth/100 `timeNote`), which helps and
    does not solve it. Nothing to settle; the page should say it.
11. **Loudness in the sum.** The drums' `amp` (kick 0.8, READ) against the
    sampler's `LOUDEST = 0.30` (READ). The tail limiter's level is a
    measurement in step 4, by ear and by the capture's peak.
12. **Per hit against per pattern.** Research §8.3 left open whether the board
    should get the pattern and run its own clock. With timetags the network
    jitter is absorbed by the lead and scsynth plays sample accurately, so per
    hit is expected to be enough (INFERRED). If step 6 shows late hits at any
    sensible lead, the pattern and tempo go to the board instead and the two
    sides are compared on a bar line.

## Sources in this repository

`rig/board/board.mjs`, `rig/board/scsampler.mjs`, `rig/board/jacksynth.mjs`,
`rig/board/inputs.mjs`, `rig/board/video.mjs`, `rig/board/rtc.mjs`,
`rig/board/push.sh`, `rig/board/setup.sh`, `rig/board/test.mjs`,
`rig/peer.mjs`, `demo/shell/board.mjs`, `demo/shell/scsynth.mjs`,
`demo/shell/sclang-lite.mjs`, `demo/shell/synthdef.mjs`,
`demo/shell/graph-registry.mjs`, `demo/fake-board.mjs`,
`demo/concepts/synth/100/index.html`, `demo/concepts/synth/collide-voice.mjs`,
`demo/concepts/rhythm/voices.mjs`, `demo/concepts/rhythm/drum-machine.mjs`,
`demo/concepts/clock/020/index.html`, `proto/looper/peer.mjs`,
`plans/plan-routing-time.md`, `plans/plan-away-webrtc.md`, `plans/plan-jam.md`,
`research/pi-drum-machines-2026-09-21.md`,
`research/synthdef-size-limit-2026-09.md`, `HANDOFF.md` sessions 74 and 75,
`BACKLOG.md`.
