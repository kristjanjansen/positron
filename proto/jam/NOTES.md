# proto/jam — music-jamming latency matrix + duet demos (2026-08-27)

Question: how do co-created MIDI notes travel FASTEST between browsers?
Arms: DC-P2P (ordered / unordered+maxRetransmits:0), CF Realtime SFU DataChannels,
DO relays (cues JSON / elektron-jam JSON / elektron-jam binary), legacy
wss://data.elektron.art echo, MoQ d14 via @moq/net, local ws relay (+netem loss).
One-way, synced clocks, n≥500/config at musical rates. Sibling agent owns
research/music-jamming-2026-08.md — not touched here.

## Checkpoint log

- **C0 (setup probes)**:
  - CF Realtime SFU **HAS DataChannels**: `POST /cf/sessions/{sid}/datachannels/new`
    via deployed elektron-rtc proxy → 200 `{dataChannels:[{location:"local",
    dataChannelName:"jam","id":2}]}`. `id` = negotiated SCTP stream id →
    `pc.createDataChannel(name, {negotiated:true, id})`. Subscribe shape:
    `{location:"remote", sessionId:<pubSid>, dataChannelName}`. Arm (b) is ON.
  - Legacy `wss://data.elektron.art`: ALIVE. Echoes to ALL including sender
    (§1.5 loopback ordering point confirmed live). Probe: a→relay→b string in
    ~52 ms wall. **Binary frames dropped** (4-byte send: neither client
    received) → legacy arm is JSON/text only.
  - `GET https://elektron-selfrec….workers.dev/time` → 200 {now} (the skew
    endpoint, tokenless).
  - Machine: node v25.9 (built-in WebSocket client — CDP without deps), Docker
    28.5, Chrome present, wrangler 4.75.
  - @moq/net 0.3.3 (rig/moq/spike/node_modules): `Producer.writeFrame` =
    single-frame group per note; `appendDatagram` exists BUT dist docs state
    "Datagrams are never delivered over IETF moq-transport" — CF d14 is IETF,
    so datagram mode is expected NO-OP over CF (will verify cheaply).

- **C1 (infra built)**: elektron-jam DEPLOYED
  (https://elektron-jam.kristjan-jansen.workers.dev, version 3cd1242f, JAM_TOKEN
  secret set + appended to repo .env). Node probe: text+binary relayed to all
  incl sender, one-way ~41 ms, autoresponse ping RTT 39 ms (matches cues band).
  server.mjs (:8893 static+µs-clock+mailboxes+result sink), relay-local.mjs
  (:8895, ws pkg), bench.html/bench.js (all arms), run-bench.mjs (chrome pair +
  mini-CDP + docker netem + stats), moq bundle built via Docker esbuild
  (513 KB, spike node_modules mounted). Coordinator note: CF SFU DC unreliable
  modes shipped 2026-08-13 — sfu-dc arm runs rel AND unrel configs.
  CDP note: emulateNetworkConditions.packetLoss is WebRTC-only per CDP docs —
  applied to DC arms as the loss lever; ALSO applied to a TCP arm + MoQ arm to
  prove non-effect; real TCP loss arm = Docker netem (egress leg) on the local
  ws relay. SFU PC establishment: trying tracks/new with sessionDescription
  only (no tracks[]) — fallback fake audio track if refused.

- **C2 (smoke results + the loss lever)**: all arms green at scale 0.1 except:
  - SFU establishment: `tracks/new` REFUSES a track-less body (400
    decoding_error) but **`sessions/new` ACCEPTS a datachannel-only offer** and
    returns the answer SDP — no media track needed for a data-only SFU session.
    datachannels/new accepted `ordered:false, maxRetransmits:0` on jam-unrel
    without error but did NOT echo the fields back (SFU-hop semantics opaque).
  - Smoke p50s (57 notes): dc-direct 0.8–1.1 ms · sfu-dc 15 ms(!) · do-jam
    ~37 ms · do-cues 36 ms · legacy 54 ms · moq 22 ms · moq datagram 0/51
    (CONFIRMED: @moq/net datagrams never delivered over IETF d14, per its docs).
  - **CDP packetLoss is a NO-OP in Chrome 151 headless** — 50% applied BEFORE
    the PC existed: 57/57 delivered, latency unchanged. No passwordless sudo →
    no dummynet. REAL UDP loss lever built instead: coturn:alpine in Docker,
    `--cap-add NET_ADMIN` + `tc netem loss 2%` on eth0, both peers
    `iceTransportPolicy:'relay'` through it (hairpin between allocations inside
    the container; only 3478/udp published).
  - dc-turn smoke (n=57): 0% loss → ~1.6 ms (TURN software ≈ +0.5 ms).
    **2% UDP loss: ordered-reliable p95 417 ms (SCTP RTO-scale HOL stall,
    0 lost) vs unordered+maxRetransmits:0 p95 5.3 ms (5% notes lost, on-time)**.
    The jamming tradeoff, quantified.
- **C3 (demos built)**: jam-core.js (synth + 16-B frame + dedupe(key,window) +
  epoch-anchored beat grid + 25 ms/120 ms lookahead scheduler + ONE actuate
  path for live-local/live-remote/replay + flat event log {at,kind:'midi',
  source,raw,display}) — jam.html (live, remote-on-arrival + rolling-p50 HUD),
  jam-interval.html (remote quantized to next beat; epoch-anchored grid means
  both peers share beat phase with no negotiation — the wall clock IS the
  conductor). Transport selector dc/do/moq, dc falls back to do on failure.
  run-demo.mjs verifies headlessly: 60 s auto-duet both directions, event logs
  → results/jam-<page>-<role>.jsonl, replay through the same actuate path with
  count check, screenshots. plan-timeline mapping: the jam log is a timeline
  recording (source=peer, overdub = replay-fired events marked, never re-enter
  the log — §1.11 ported); interval mode logs remote notes at their QUANTIZED
  musical time (renderer-deviates-log-stays-faithful inverted deliberately:
  here the quantize IS the musical truth, the wire stamp keeps the raw time).

- **C4 (FULL MATRIX DONE, n=550/config, results/matrix.json + report.mjs)**:
  headline p50s one-way (ms): DC-direct 1.0 · local-ws 0.9 · DC-via-TURN 1.6 ·
  SFU-DC 16.1–16.2 · MoQ d14 21.6 · elektron-jam DO 34.5–34.9 · cues DO 37.8 ·
  legacy 51.0. Clock: page-relative skew drifted 7 µs over the 25-min run
  (−99→−92 µs); all numbers good to ±0.15 ms. Deployed /time min-RTT method:
  relative agreement +50 µs at start but −9 ms at recal when RTT inflated to
  45 ms — the ±(minRTT/2) grade confirmed, fine for cues, useless for
  single-digit.
  - JSON tax at MIDI sizes: ZERO. jam-json vs jam-bin p50 delta −0.4 ms (noise,
    json "won"); local-ws json vs bin delta 0.00 ms. At 16 B vs 130 B the wire
    and parse costs vanish under scheduler+network noise.
  - Loss (real 2% UDP via TURN+netem): DC-reliable = 0 loss but stalls in
    CONSECUTIVE-PAIR runs (HOL): p99 412 ms, 3.3% of notes >50 ms, sparse-phase
    p95 108 ms (no fast-rtx without packets in flight → full T3-RTO ~400 ms).
    DC-unrel = 1.6% notes lost, p95 2.5 ms, ZERO tail. WS+TCP (docker netem
    2%): 0 loss, stalls in consecutive runs, max 211 ms, p99 130 ms (Linux
    min-RTO 200 ms visible). CDP packetLoss: confirmed no-op at n=550 on DC,
    WS, and MoQ (Chrome 151).
  - MoQ: p50 21.6 BUT 2.9% loss — ALL of it chord notes (one of each
    back-to-back triple of single-frame groups; e.g. seqs 478,481,487…).
    Concurrent groups race under newest-first delivery. Chord-safe MoQ needs
    frames batched into one group or ordered subscription. Datagram mode: 0/51
    delivered over IETF d14 (lib docs confirmed empirically).
  - SFU-DC: sessions/new+offer works datachannel-only; unrel config accepted
    but fields not echoed; sfu-rel vs sfu-unrel indistinguishable clean
    (16.1/16.2). One dropped note on sfu-unrel (0.18%) — possibly real
    unreliable semantics on the CF hop.
- **C5 (demos verified headlessly, 60 s duets, both directions)**:
  - jam.html over DC-direct: a sent 167 / b sent 154, 0 loss both ways, live
    remote p50 1.6/1.9 ms, log 321 events each, replay fired 321/321 = count
    match. results/jam-jam-{a,b}.{png,jsonl}.
  - jam-interval.html over DO relay: same counts, 0 loss, one-way p50 37/38 ms,
    quantize wait ~250 ms to next 600 ms beat (100 BPM) — a 38 ms WAN link
    playing musically on-grid. replay 321/321. results/jam-jam-interval-*.
  - plan-timeline mapping: the session log IS a flat timeline recording
    ({at µs, kind:'midi', source, raw, display, owMs}); replay re-feeds the
    same actuate path; replay-fired events never re-enter the log (§1.11
    overdub); interval mode records remote notes at their QUANTIZED time.
- **C6 (cleanup)**: jam-udd Chromes, server, relay killed; :8893/:8895 free;
  jam-* containers removed. elektron-jam worker KEPT (see workers/jam/
  DEPLOYED.md). Kept resources: results/*.json(l)+png, moq/www bundle.

## Layout (planned)

- server.mjs — :8893 static + /time-local (µs, shared clock) + mailbox signaling + /log sink
- harness/bench.html|bench.js — all transport arms, ?peer=a|b, mailbox-coordinated
- harness/run-bench.mjs — 2 headless Chromes (jam-udd-a/b), CDP loss + screenshots, stats
- workers/jam (repo) → deployed `elektron-jam` — verbatim relay DO (text+binary), JAM_TOKEN
- jam.html / jam-interval.html — demos; results/ — jsonl + screenshots + matrix

## Clock method

Same host = truth: both pages min-RTT-calibrate to server.mjs /time-local over
loopback (offset err ≪1 ms), all one-way numbers on that base. Also computed per
page: perfEpoch-vs-Date drift and deployed /time min-RTT offset (the proven
±grade) — agreement reported.
