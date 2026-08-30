# elektron — compact summary (start → 2026-08-27)

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

## The stack, with its numbers

| Layer | Verdict |
|---|---|
| Stage (RTMPS→LL-HLS) | 2.4–2.5 s tuned; v6 player fixes the park (recovery 2.4–4.3× v5); CF edge holds parts ~1 s/segment → ~2 s player floor |
| Grid (Realtime SFU) | 74–96 ms glass-to-glass; no ceiling through N=54 media / 1003 sessions @40/s; deployed `elektron-rtc` Worker: RtcRoom DO, kill→`left` 38–126 ms |
| Fast tier (MoQ) | 26–33 ms browser↔browser; full device scorecard ✅ (Chromium/Safari/iPhone-4G ~31 ms/4K30 47 ms/audio skew −4 ms); draft-16 relay: auth + namespace push work |
| Cues | DO relay 27 ms; cue→video sync p50 65–98 ms; VOD replay p50 59 ms with seeks green |
| Archive | LOCAL segmented + native T₀ (−15 ms from truth) → R2; O(1) disk, ~25× cheaper than Stream; grid archive = per-participant self-recording + event log |
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

1. **Rotate secrets**: CF API token pasted in chat (session 1); draft-16 relay
   tokens (transited chat/logs); token + RTMPS key in public `studio` repo;
   token in `maria_old` git history (was also client-side).
2. Build MERGED V0 (plan-studio §5): timeline lib → engine.mjs → console
   (~3 sessions; replay-page refactor is the regression gate).
3. ThreatLocker approval for OBS (else Option C relay path stands); camera
   still wedged (sudo killall or reboot); eyeball src/demo.html.
4. Two-clock house-sound policy = first human rehearsal decision.

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

**Open**: 4 secret rotations (SECRETS-ROTATION.md), elektron.studio purchase, iPhone capture
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
https://elektron-view.kristjan-jansen.workers.dev behind a globally-gated,
politeness-first ERR proxy, and work on a phone.

**Honest positioning**: an adversarial survey refuted two of our three
uniqueness claims (seek-by-reduce is thirty-year-old DAW *MIDI chase* and
lighting-console *tracking*; caps-driven adapters shipped in 2005) and
complicated the third — provenance-on-a-timeline exists in Premiere but
collapses at export, so the real claim is that **the firewall dies at the door
and ours has to survive it.** No ecosystem tool can currently read a temporal
region at all.

