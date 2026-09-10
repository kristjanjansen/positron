# positron — compact summary (start → 2026-09-09)

One paragraph: a measured live-streaming + performance platform on Cloudflare
(LL-HLS stage, WebRTC SFU grid, MoQ fast tier, DO cue relay, R2 archive),
built and numbers-proven in ~3 days by parallel agent sessions — now converging
on ONE substrate: a universal timeline ("save anything, play anything back"),
with an operator studio app as its first build and cultural-heritage archives
(ERR; Radio Tallinn 1965) as its horizon.

## Arc

- **08-25→26, sessions 1–5** — the measurement campaign. Everything below is
  ✅ measured, not believed (PROGRESS.md is the journal, plan.md the reference).
- **08-26 evening** — planning wave: plan-m2m → plan-studio → plan-timeline
  (+ 9-amendment self-critique) → prior-art research (technical + artistic).
- **08-27** — own prior-art mine (5 repos of previous experiments) +
  Radio Tallinn 1965 theses = the first named client.

- **09-04** — renamed `elektron` → **`positron`** and moved onto
  **`positron.studio`** (Cloudflare Registrar). Eight Workers got custom domains;
  `*.workers.dev` kept live alongside, so nothing broke. Worker *script* names
  stay `elektron-*` deliberately — renaming a script abandons its Durable
  Objects. Prior-art references to `elektronstudio`/`elektron.art` are left
  intact on purpose. See HANDOFF.md for the hostname table and the reasoning.

- **09-05, session 9** — the iOS stutter, through six wrong answers to one right
  one. Four of the six fixes were real and none was the binding constraint; the
  answer was that **iOS 17.1 added `ManagedMediaSource`**, so `Hls.isSupported()`
  became true on iPhone and a native-HLS fallback written
  `if (!Hls.isSupported() && …)` had silently stopped firing for years. Prefer
  native on ALL WebKit, gated on MMS (desktop Safari, same page, same 40 s:
  native 0.961x advance / 5.25 s / 0 errors against hls.js 0.344x / 7.71 s /
  2 errors). **Our own recovery layer was most of the problem** — a drift-seek
  every 2–3 s aborting the fragment loads it was trying to recover. Also built
  `08 moq` (p50 20.3 ms; the "needs a container" blocker did not exist) and
  `24 capture`, re-measured WHEP against MoQ properly (p50 67.0 vs 26.2 ms, but
  WHEP wins p99), and cleared Stream storage 559.97 → 15.81 of a 1000-minute cap
  it was two days from hitting. Two new harnesses, because `verify.mjs` had read
  261/261 while 06 was fatally broken on a phone.

- **09-06, session 10** — the demo spine finished: 24 of 28 built, **332/332**.
  `25 show` (recorded off the RECEIVED stream, so the archive is the bytes off
  the wire), `26 shout` (Icecast through a Worker — **−0.8 ms of carry**, 600 s
  on one response, and the relay's whole product is putting CORS on bytes that
  have none), `27 tracks` (**audio-only LL-HLS is smaller, not faster** — 3.88 s
  against video-only's 3.82 s, asserted from the playlists rather than a
  stopwatch; and Cloudflare WHEP refuses a single-track offer outright),
  `28 vclick` + `timeline/csound.mjs` (a Csound score compiled into rows you can
  seek into; the tempo map is the trapezoid of `60/tempo` — ⚠️ this said "the
  INTEGRAL … mean-tempo puts every later note 118 ms early" until 2026-09-09,
  when a real-Csound oracle showed the compiler AND that claim were both wrong:
  the 118 ms was the gap between two wrong answers and the true error was
  239 ms, see PROGRESS session 15). `11 grid`
  lost its tiering. And the session's real lesson, one layer down from session
  9's: **291 asserts were green across three pages that had never once played a
  frame of HLS in Chrome**, because `canPlayType('…mpegurl')` answers `"maybe"`
  there too — in headless Chrome as well, so the suite could not tell the paths
  apart. ⚠ A re-run on 09-07 read 301/313, from a shell with no UDP egress;
  332/332 needs re-confirming somewhere WebRTC and QUIC can leave the machine.

- **09-07, session 11** — a UI/UX review of the demos, one at a time, which
  turned into a jargon audit. Every reader question — *what is drift · green but
  late? · what alarm?? · why do I need the slider?* — named a real defect rather
  than a wording preference. `01 transport` was **printing a fabricated `0` for
  the one number it exists to report**, and its assert passed on the empty array
  that caused it. Also: the demos lost their number prefixes and are addressed
  by SLUG; `04 score` became a normalized JSON score container; `05` became the
  Csound demo beside it. CLAUDE.md's writing conventions were rewritten — the
  old "no explanatory prose" rule is what produced pages only their author could
  read.

- **09-07/08, session 12** — **one generated test picture**, `demo/shell/
  pattern.mjs`, drawn by six demos and generated as an ffmpeg filter by both
  publishers. It already existed and was imported by a single caller that cannot
  connect, while four demos each drew their own — **a shared module nobody can
  see is a claim, not a unification** (LESSONS #30). New `take`: a local video
  timeline, no network, where a take is drawn as it records and the burned
  number is POSITION ON THE LINE, so a scrub checks itself. The same look found
  **three dead paths the slug rename left**, one of which had `moq` and `ladder`
  asserting NOTHING for weeks behind a plausible-but-wrong explanation (#29),
  and one pointing the IPHONE harness at a 404. `ladder` was removed on 09-08.
  **351/351 on 09-08** — every demo, no failures, the first clean full run since
  session 10. Earlier in the session it read 332/344; the 12 were the shell's
  missing UDP egress and they cleared with it.

- **09-08, session 13** — ⚠️ **not written up while it happened**; this line is
  reconstructed from the git log and `LESSONS.md` §33–38, which are its only
  record. It built `reel` (1965 newsreels and radio on one line, from ERR's own
  shot list), `now` (one live ERR channel on a line whose right-hand end is the
  present) and `keep` (a picture out to a server and back onto the line, R2, one
  file per take), landed plan-names P1 (one write path tiered by credential),
  and removed `tracks` and `grid`. Its six lessons are worth reading before
  touching any live page: `startLoad()` with no argument means the LIVE EDGE; a
  control that is not finished at press time collides with the next one; prefer
  the event carrying the magnitude over a counter sampled at a guessed moment;
  **nothing in the suite looks at ink**; continuity must be symmetric or a
  back-seek eats the record; and **a browser cannot read a response's `Date`
  header**.

- **09-09, session 14** — **one message shape, written down**, and the history
  the relay refuses to keep. `plan-ws.md` was built: `demo/shell/wire.mjs` (the
  envelope — `type`/`from`/`at`/`seq` — plus the reconnect every positron page
  lacked), `workers/backlog` on `backlog.positron.studio` where **a recorder
  joins the room as an ordinary socket**, so the relay still parses nothing, and
  `wire` at `positron.studio/wire/`, a demo ABOUT the socket. Decisions:
  **room, not channel** (a channel in the payload forces either a parsing relay
  or full fan-out — and elektron's own `useChat()` opened a socket per chat, so
  v3 paid both); **`type`, not `t`** (`t` means time everywhere else here, and
  the sweep of the other six files is NOT done); **`from` is a socket, not a
  person**. And `seq` survived on a corrected argument — TCP already orders one
  sender's messages, so what a counter sees is the relay dropping under its own
  caps, silently. Measured: **the DO hop costs 1–2 ms**, a full 16-socket room
  costs the sender 8 ms with zero loss, and at both 120 and 300 msg/s exactly
  **298 messages arrive in three seconds** — the token bucket (`MSG_BURST` 120 +
  3 s × 60/s) read back off the wire, with the sender told nothing. **374/389**,
  every failure attributed: 11 to this shell's missing UDP, 4 to ERR refusing
  `now` the live edge (403 no-ACAO at the edge, 206 with ACAO 3,700 segments
  back), 1 unexplained 409 in `keep`.

## The stack, with its numbers

| Layer | Verdict |
|---|---|
| Stage (RTMPS→LL-HLS) | 2.4–2.5 s tuned; v6 player fixes the park (recovery 2.4–4.3× v5); CF edge holds parts ~1 s/segment → ~2 s player floor |
| Grid (Realtime SFU) | 74–96 ms glass-to-glass; no ceiling through N=54 media / 1003 sessions @40/s; deployed `elektron-rtc` Worker: RtcRoom DO, kill→`left` 38–126 ms |
| Fast tier (MoQ) | 26–33 ms browser↔browser; full device scorecard ✅ (Chromium/Safari/iPhone-4G ~31 ms/4K30 47 ms/audio skew −4 ms); draft-16 relay: auth + namespace push work |
| Cues | DO relay 27 ms; cue→video sync p50 65–98 ms; VOD replay p50 59 ms with seeks green |
| Archive | LOCAL segmented + native T₀ (−15 ms from truth ⚠ **see session 7: that number carries ~one frame of bias and the anchor is a ~95 ms-wide distribution, not a constant**) → R2; O(1) disk, ~25× cheaper than Stream; grid archive = per-participant self-recording + event log |
| Show control | JSON score conducts the grid: 88/88 asserts, drift p50 0 ms; composite recording without OBS (CDP→ffmpeg→RTMPS, 0 dropped frames) |

Platform truths that cost real work: encoder socket close mints a NEW video UID
(gapless relay/splicer built to hide it); stock hls.js parks nondeterministically
(v6 exists because of it); Stream API `created` is −6.2 s from truth (anchor on
content T₀, never metadata); WHIP ingest records NOTHING; DOs freeze Date.now();
polling lies about edge lag (+2.3 s); ThreatLocker kills unapproved binaries
(→ web console + node CLI architecture); background tabs lie to instruments.

## The plans

- **plan.md** — streaming stack reference (transports, players, traps, mysteries
  solved).
- **plan-m2m.md** — hybrid: SFU grid + stage stream + RtcRoom DO; MoQ as
  auto-upgrade tier; phases 1–3 COMPLETE, phase-4 backlog.
- **plan-studio.md** — ThreatLocker-proof operator app: deployed web console +
  `node engine.mjs`; ~three buttons; MERGED V0 = timeline lib is the engine's
  event backbone (Sessions A/B/C; DoD: one command + one URL runs a show with a
  replay link, measurement suite stays green).
- **plan-timeline.md** — THE substrate. Six-function transport + the missing
  four (seek/pause/rate/window); Event + Span on one append-only log; reducers
  (`reduce(events≤t)`, property-tested vs play); adapters {capture, actuate,
  reducer, interpolate, caps}; laws: stamp at source, absolute ms, one render
  path, R2 by reference, tombstones+compaction (C6), per-kind versioning (C7),
  trace-vs-authoring boundary (C10), reconstruction tiers with a forced
  evidence policy + tratteggio legibility (§5b).

## Research shelf

- **External prior art**: not invented as a whole; steal list adopted — MCAP
  container shape, Rerun multi-timeline indexing, W3C Timing Object transport
  vector. Artistic canon deep (Zenph, Marclay, Morrison, Hsieh…), shared
  infrastructure EMPTY — that gap is the project.
- **Own prior art** (research/timeline-own-prior-art-2026-08.md): lineage is
  5+ generations since elektron 2020 (map: visualia/plans/lineage.md). Steal
  list: pre-roll ring buffer, command-sourcing + undoable commands (cheap
  backward seek), per-kind quantization, ACT/DISPLAY split, drift channel,
  gate() recognizer, loopback ordering, wall-clock-in-frame test pattern.
  Failure-hardened laws: lookahead scheduling mandatory (3 repos died without
  it), never re-stamp at handler time, ids minted at capture, {t0, duration}
  as session header, text needs semantic ops.
- **Origin & clients**: the idea comes from cultural-heritage work (PhD circle;
  Kurenniemi case study; ERR horizon). **Radio Tallinn 1965** (same circle) is
  the first named client — slots = score of spans, live = playhead-at-now,
  thesis 30 = the tratteggio overlay as programming, thesis 17 = tier-0
  attested-only evidence policy (even mastering is a declared derived lane).

## Open items

*(kept current — the live list is HANDOFF.md "Next, in order")*

1. **Rotate secrets**: CF API token pasted in chat (session 1); draft-16 relay
   tokens (transited chat/logs); token + RTMPS key in public `studio` repo;
   token in `maria_old` git history (was also client-side). **Still open.**
2. ~~Build MERGED V0~~ — **done**; studio v0 *and* v1 ship (session 7, all five
   panels, verify 24/24).
3. ThreatLocker approval for OBS (else Option C relay path stands); camera
   still wedged (sudo killall or reboot); eyeball src/demo.html.
4. Two-clock house-sound policy = first human rehearsal decision. **Nothing has
   still ever been used by a human** — and as of session 7 there is a playable
   instrument as well as a studio, so this is the binding constraint on the
   whole project rather than one open question inside it.
5. Re-measure every content anchor after the `replay.html` one-frame fix — see
   the warning at the end of this file.

## Session 6 (2026-08-27) — archive instruments, participant pipeline, networked music

**Participant archive** — self-recording beat central by measurement (upload lag 483 ms, 25 s
offline = zero loss, tab-kill 790 ms, anchor +20 ms; central = 8.6× the grid budget at N=54 and
cuts 130–172 ms gaps into every sibling's file on any join/leave). Sync leg proven: inter-tile
skew p50 4–29 ms, cue crossing in band, postshow runner + `--reconcile` (engine can start
anytime; R2 is the memory), h264 copy-remux 80 ms local / 282 ms cloud ($0.20/show), masters+MSE
frame-exact for vp8 but MSE refuses h264-in-WebM.

**ERR archives opened** — live feeds carry PDT + 2 h DVR + CORS clear; arhiiv API is open and
year-searchable to 1908 (census: 448k items in 119 requests). Three instruments built: channel
flipper (10–12 ms flips), archive remixer (1965 chords, 0–43 ms start spread), and the
megatimeline (p95 9.7 ms flying 1908→2026, series query-lanes, honest precision smears).
plan-megatimeline.md on the EKA/sitemap-vis basis.

**Timeline transport core** — `timeline/transport.mjs` + lab: vector+lookahead holds; worker tick
is the default host (8.5 ms hidden vs main's 981 ms); audio lane sample-accurate (10 µs) and holds
through main-thread stalls; the per-event fan-out graveyard fails 5/7 transport asserts and is now
a fixture; C2 property gate green and runnable.

**Networked music** — see [[networked-music-findings]]: DC 1 ms floor, SFU-DC 16 ms, MoQ audio
return 36 ms vs WebRTC's 78 (jitter buffer = 98.6%), hybrid arm best. Remote-instrument platform
deployed end-to-end (registry worker, host/player pages, session-as-timeline-log, owner self-test).

**Infrastructure** — CF Containers measured (QUIC egress works; cloud repackage $0.20/show; vp8
50× slower); OBS in Docker and in a CF Container both proven, obs-moq publishes on d14 and d16
(149 ms — fastest chain measured); dual MoQ+RTMP from one OBS.

**Open**: 4 secret rotations (SECRETS-ROTATION.md), positron.studio purchase, iPhone capture
probe, Web MIDI precision (needs IAC toggle), hardware jam/instrument run.

## Session 6 continued (2026-08-28/30) — the library became a platform

**Studio v0 runs**: one command, one URL, GO LIVE → cues → stop → a working
replay link, all measured. **DoD-A discharged** (replay.html on the library,
both suites green, cue sync 59 → 16 ms) — which also revealed the old 59 ms was
a single locked phase sample rather than a distribution.

**The library closed every gap it had**: the evidence firewall + provenance
(§5b as code; attested provably never interpolates; dropping 1,674 derived rows
leaves the master bit-identical), quotation-as-a-value (a score round-trips into
a process that has never seen the decks; marks survive a re-cut where numbers
don't), uncertainty-as-position (`at = when.earliest`; the Kurenniemi corpus is
22/22 smeared with 41 % of its spine from one guess), a store (1M rows in
3.8 MB), the strip component (after five hand-rollings), continuous kinds,
nested decks, and **loops** (wraps are the most precise instant in the loop;
phasing needs two decks exactly as Reich needed two tape machines;
disintegration climbs 0 → 90.6 % invented while the attested count never moves).

**Reach**: the four archive viewers are live at
https://positron.studio behind a globally-gated,
politeness-first ERR proxy, and work on a phone.

**Honest positioning**: an adversarial survey refuted two of our three
uniqueness claims (seek-by-reduce is thirty-year-old DAW *MIDI chase* and
lighting-console *tracking*; caps-driven adapters shipped in 2005) and
complicated the third — provenance-on-a-timeline exists in Premiere but
collapses at export, so the real claim is that **the firewall dies at the door
and ours has to survive it.** No ecosystem tool can currently read a temporal
region at all.


## Session 7 (2026-08-30) — an instrument, and the four open library items closed

**The looper** (`proto/looper`) — a MIDI looper with a polyphonic synth, on the
library, playable by a human, alone or with a peer in another browser. It is the
first client to put capture, projection, quotation and actuation on one clock at
once, and the design result is that **a looper needs no new library feature**:
the quotation is authored AFTER the trace exists, so the length is known before
the quotation is built. C10's trace/authoring split turns out to be the looper's
user interface rather than a constraint it works around — the strongest evidence
yet that §8.1 put `repeat` in the right layer. Overdub layers are separate decks
by rule 7g (N overdubs = N tape machines, the constraint that also made phasing
need two).

Numbers: **`caps.audio` is inert without a lead** (1/36 notes reach the sample
grid at `leadMs: 0`, 27/27 at 30; sd 4.38 → 0.38 ms, bought with a constant
offset a loop cannot hear — now the default). Stamp-at-source vs stamp-at-handler
is p50 0.30 ms with a **0.90 ms spread**, so the gap is not a constant anyone
could subtract later — the lineage's law, finally with a distribution.
Overdub compensation **67.40 → 0.00 ms**; the trap is that a *uniform* shift is a
no-op, so the notes move and the origin must not. "No stuck notes" comes from
the **reducer**, not the wrap callback.

**The remote looper** (`peer.mjs`, `plan-looper.md` P0+P1 done) — the claim was
that a committed loop is a VALUE, so the network is used once per layer and
never per note. It held: identical loops across links from 1.1 ms to 4700.8 ms,
the cost of a slow link paid in PASSES rather than timing, and 25 % packet loss
changing nothing because the loop plane is one message. **Clock agreement, not
latency, is the hard problem** — skew is estimated peer to peer (min-RTT is
scale-free, so a 311 ms link estimates as well as a 1.3 ms one), and the
negative control is decisive: with the correction off, the flam is *exactly* the
injected skew. Two real tabs: 1,608 B in 0.25 ms, ear-to-ear p50 −5.77 / p95
−1.52 ms. A late layer is **gated, never seeked**.

**The four HANDOFF items, all closed** —
*Item 2*: the fire-side firewall had TWO doors; beside `fire()`, a seek's
`assertState()` pushed a derived lane's whole prefix into its actuator under
`attested`. `caps.evidenceGated` refuted — *asking the adapter's permission on
one side of a firewall and not the other is not a firewall*. An attested deck's
actuation trace and drift channel are now bit-identical to a deck that never
held the restorations.
*Item 3+5a*: ambiguation was shipping as a lie (`outer` and `crisp` identical in
ink; now 51.6 % separated); the undecidable state is a property of the row AND
the window; the aggregate brief had one factor too many; deep time's real killer
was 138,000,000 ticks per frame and a `Date` that throws.
*Item 5b*: `renderDeck` folds a nest by RUNNING the shipped nest — byte-identical
twice, four hashes equal across two Chrome processes. The polled artefact
INVERTED (offline it leaks rather than losing) and **determinism is not
correctness**: the polled render is byte-identical to itself and still wrong.
*Item 4*: the studio's −45 ms anchor **was never a constant** — a ~95 ms-wide
frame-quantised distribution whose two known samples were one frame apart.
Causes: a stale first screencast frame stamped as fresh, plus encoder frame
swallow. p95 39 → 19–26 ms, and the obvious remedy made it twice as bad. Plus
SOUND and ROOM panels, the roster adapter that had never been written, grid
archive 8/8, verify 14/15 → 24/24.

⚠ **The correction that reaches backwards**: `replay.html`'s content anchor
carries ~one frame of bias of its own, so **every content-anchor number in this
document carries it**, including the archive's −15 ms. Fix and caveat are in
`studio/NOTES.md`; re-measure them in one breath before quoting any as exact.
