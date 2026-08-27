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

- **C7 (PLAY-A-SYNTH CASE — remote-synth.html + onset-worklet.js +
  harness/run-synth.mjs)**: key→ear round trip A(player)→B(synth host)→A,
  per leg, first measured figure for the pattern (playasynth.com publishes
  none). B: percussive instant-attack voice (square+click, velocity-scaled)
  → MediaStreamAudioDestination → WebRTC Opus back; canvas synth panel
  (house 48-bit burned-ms row + 16-bit per-note seq bits + flash) → video
  track back. A: sample-accurate AudioWorklet onset detect on the decoded
  remote track + rVFC pixel decode for key→eye. Chromes REAL AudioContext
  (no --mute-audio), sr 48000, base 5.3 ms, outputLatency 32 ms reported.
  - **Method traps found (both probe-verified):** (1) rolling-MIN ct→epoch
    mapping is poisoned by headless render-ahead bursts (~60 ms prebuffer at
    context start) — maps onsets 60 ms early; fixed with EDGE-MEDIAN mapping
    (sample offset only when currentTime steps, rolling median, ±3 ms).
    (2) worklet+voice are sample-exact (future-scheduled onset err 0.021 ms;
    immediate osc.start(currentTime) starts at exactly that frame). (3) an
    onset that maps <0 ms before its note must NOT be dropped as spurious or
    the order-zip shifts one note forever (the +40 ms burst artifact); local/B
    matchers allow −8 ms. (4) through the SFU, 25/s burst attacks get
    concealment-merged (~7 %) — order matching derails; adaptive
    nearest-to-rolling-median matching heals in one onset, and the SFU
    headline uses a sparse-only run (240 ms singles, n=315 clean).
  - **RESULTS (scale 1, n=340 matched/arm mixed, 315–317 sparse; ms p50/p95,
    truth clock, decoded-track level; +32 ms outputLatency to physical ears):**
    - local baseline (A key→own WebAudio onset): **0.0 p50 / 2.6 p95** — the
      reference feel; synth scheduling is free (leg2 ≈ 0.5 ms at B too).
    - **p2p A+V: total 77.7 / 80.3** = leg1 (DC midi) 0.56 + leg2 0.67 +
      leg3 (Opus return: encode+transport+NetEQ+decode) 76.6. Dead stable
      across all phases AND both hint configs. key→eye 50/73 — the panel
      video lands ~27 ms BEFORE its own sound.
    - **p2p audio-only: UNSTABLE** — 72 (burst) → 135 (sparse) → 210–310 in
      other runs/configs; NetEQ wanders without the video sync anchor. The
      lip-sync question INVERTED: video does not delay audio here, the video
      track *pins* the audio jitter buffer (3 of 3 full runs).
    - **SFU both ways (sparse, clean): total 116 / 210** = leg1 16.6 (matches
      matrix SFU-DC 16.2) + leg2 0.5 + leg3 102. key→eye 127/161, A/V skew
      ±15–50 ms. avg jitterBufferDelay 68–180 ms across runs (adaptation
      wanders); concealment 0.1–0.7 %.
    - **jitterBufferTarget=0 + playoutDelayHint=0: never helps, often hurts**
      (p2p-audio 72→211, sfu-sparse 116→235, sfu-av mixed also worse;
      p2p A+V unchanged). Readback confirms the properties set; NetEQ target
      floor stays 20 ms and forcing it destabilizes adaptation upward. The
      jitter buffer IS the product: it cannot be hinted away.
    - MoQ arm (c) skipped inside its 30-min box: hang/WebCodecs Opus spike
      exists (rig/moq/spike pub/play-audio, 32.6 ms g2g measured with own
      cushion buffer) but needs a fresh Docker-esbuild bundle + AudioData
      bridges both ends. Paper projection: 1 (DC) + 1 (synth) + ~33 (MoQ
      return) ≈ **35 ms key→ear** — the beat-Play-a-Synth candidate.
  - **Verdict vs playability bands** (research §1: ≤30 ≈ local acoustic
    action, piano actions being 30–100 ms; 30–60 playable; >100 sluggish):
    p2p 78 ms sits INSIDE the acoustic-instrument band (a heavy piano
    action); SFU 116 ms is at the sluggish edge. Real deployment adds
    hardware synth MIDI-in→audio-out 5–15 ms and replaces ~0 ms loopback
    legs with real network: same-city P2P ≈ 78 + 10 (synth hw) + 2×RTT/2
    (~10) ≈ **~95–100 ms key→ear** honest projection; the browser stack
    itself (Opus + NetEQ floor ~75 ms of it) dominates, not the wire.
  - results/jam-synth-*.jsonl (per-note, per-leg), jam-synth-summary.json
    (merged, perPhase, caveats), screenshots jam-synth-{p2p,sfu,sfu-sparse,
    a,b}*.png. Cleanup verified: no jam-udd/server processes, :8893/:8895 free.

- **C9 (HOST SELF-TEST — host-check.html + host-check.js + measure-core.js +
  harness/run-hostcheck.mjs, own server on :8898)**: the C7 rig packaged as a
  ONE-PAGE tool a synth owner runs ALONE with their real hardware. No partner,
  no second machine, no build. Answers "what will the player actually feel?"
  - **measure-core.js** = the measurement kernel extracted (edge-median ct→epoch
    map, adaptive onset↔note matcher with negative minLat, pdist, 16-B frame,
    percussive stand-in voice). remote-synth.js NOT modified (sibling MoQ run
    owns it + :8893); the rig can import measure-core.js when that run lands.
  - **THE DEFAULT THAT MAKES IT HONEST**: the host monitors the RETURN path
    (encoded→decoded), never the source. Direct monitoring is why hosts ship
    rigs that feel fine to them and unplayable to everyone else. Toggle exists
    only to A/B; label flips to "DIRECT monitoring — you are lying to yourself".
  - **Constraint checks are the other classic ruiner**: getUserMedia asks for
    `echoCancellation:false, autoGainControl:false, noiseSuppression:false,
    48 kHz, mono` and the page DISPLAYS `getSettings()` back as pass/fail, plus
    sampleRate / baseLatency / outputLatency / `settings.latency` (interface
    input buffer, in samples). Verified live: Chrome's fake device honours all
    three DSP flags but returns a **44.1 kHz** track against a 48 kHz context —
    the sample-rate check fired on the very first real run.
  - **Tests**: A hardware floor (MIDI out → onset on the return; key→sound
    p50/p95 + send jitter, no network) · B network echo to the deployed
    elektron-jam relay (echoes to sender — the partnerless RTT; C0's loopback
    property is what makes this test possible at all) · C full loop = TWO
    PeerConnections in one page, MIDI up an unordered DC, the real synth's
    audio back over Opus, THREE simultaneous onset taps (capture tap = leg 2,
    return tap = total) so legs decompose without arithmetic: leg1 wire /
    leg2 instrument+interface / leg3 return, with the jitter-buffer share read
    from `getStats` jitterBufferDelay÷EmittedCount · D simulated distance
    (DelayNode on the return, 0/10/30/60/100 ms) — playable, not a measurement,
    plus a "measure at this distance" that proves the delay is really there.
  - C carries the C7 finding forward as a host-facing checkbox: a **video sync
    anchor pins the audio jitter buffer** (audio-only p2p wandered 72→310 ms
    across runs; with video, dead stable 3/3). Default ON.
  - Report: per-leg bar + table, dropped counts per arm, 60 s stuck-note soak
    (on/off pairs, RMS 300 ms after each note-off, CC123 panic + silence check),
    a floor→latency projection anchored on the host's OWN measured non-buffer
    legs (rig slope 1:1, 10→36 / 40→66 ms), verdict band (≤45 instrument /
    45–70 playable / 70–100 audible / >100 sluggish) and a remedy that names
    the dominant leg — e.g. buffer at N samples → "try 128", or for a
    return-dominated rig the measured fact that jitterBufferTarget=0 makes it
    WORSE (77.7→211) and only a fixed-floor transport (MoQ 35.8 at floor 10)
    actually moves it. Computer keys play notes through whatever path is live.
  - **Headless verification, 18/18** (ONE Chrome, fake media device + granted
    permissions via CDP `Browser.grantPermissions` — `--use-fake-ui-for-media-
    devices` alone is NOT enough under headless=new, getUserMedia is denied and
    the constraint panel has nothing to report; that was the one real trap):
    A 20.6/22.6 (stand-in voice through a MediaStream, 0 dropped) · B relay RTT
    36.4/40.2 → one-way 18.2, 0 lost · C total 67.7/71.0 = leg1 0.5 + leg2 20.8
    + leg3 46.9 (buffer 30.0 = 64 %, codec+wire 16.9), 0 dropped, conceal 0.00 %
    · D deltas 29.7 ms @30 and 60.2 ms @60 (±5 ms gate) · soak 19 notes, 0 stuck,
    0 dropped, silent after panic · 0 page errors, 0 console errors.
    results/hostcheck-{report.json,report.png,verify.json}.
  - Headless is WEAKER than a real run in exactly four places, all documented
    on the page: no MIDI wire (stand-in is a function call, real USB-MIDI adds
    ~1–3 ms), no converter/interface buffer on the return (real ADC + driver
    adds 3–15 ms), the stand-in's note-on is sample-exact where a real synth's
    is 2–10 ms, and the loopback WebRTC has zero wire time so leg 3 is a pure
    codec+NetEQ floor. The floor is the point: 46.9 ms of return with NO network
    at all is what a real host is fighting.
  - Cleanup: chrome (hostcheck-udd) + server killed, :8898 free, :8893 never
    touched.

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
