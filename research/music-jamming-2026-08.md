# Networked music jamming — science, prior art, protocol options (2026-08-27)

Marks: ✅ measured (ours) · 📄 documented (external, cited) · ⚠️ inferred.
Companion to plan-timeline.md (C3 two-clock, C10 trace-vs-authoring, §5 MIDI
stance) and research/timeline-own-prior-art-2026-08.md. Context for the
proto/jam demos agent (port 8893) — its numbers get interpreted against this.

**TL;DR — "how much latency can music-making handle": one-way ~25 ms is the
ensemble threshold, and it is not a cliff but a ramp with named coping
strategies per band.** 📄 <11.5 ms musicians *accelerate*; 10–25 ms stable
tempo (the sweet spot — 8–25 ms optimal in the Stanford clapping studies);
25–50 ms progressive tempo deceleration, coped with by leader-follower;
>50–60 ms "heavily impaired, barely tolerable" for synchronous play — beyond
it you restructure the music (NINJAM's delay-by-a-whole-interval, self-delay,
loop exchange). Every threshold is ONE-WAY sound-arrival delay, tempo- and
timbre-dependent (drummers at 120 BPM: ~15 ms; at 60 BPM: ~40 ms). Our
measured infra already brackets the top two bands: MoQ native 17.9 ms /
DO cue relay 27 ms one-way sit in or at the ensemble band ✅; SFU media 74 ms
one-way g2g is a leader-follower band transport ✅.

## 1. The latency science

Primary sources: Chafe/Gurevich et al. clapping-duo studies
(https://ccrma.stanford.edu/~cc/shtml/ensDelay.shtml, journal version
https://journals.sagepub.com/doi/10.1068/p6465) and the Rottondi–Chafe–
Allocchio–Sarti survey, IEEE Access 2016, DOI 10.1109/ACCESS.2016.2628440
(read in full; all "Rottondi" cites below are that paper).

- 📄 **The clapping experiments** (pairs in isolated rooms, one-way delays
  1–77 ms): deceleration grows ~linearly with delay; **delays <11.5 ms produce
  a modest tempo ACCELERATION** (anticipation instinct); synchronization
  optimal at **8–25 ms**. Deterioration significant by 55–66 ms.
- 📄 **The survey's consolidated bands** (Rottondi §III-D): positive tempo
  slopes below 10–15 ms; **10/15–20/25 ms: stable tempo, latency "either not
  perceived at all or slightly noticed"**; 20/25–50/60 ms: pronounced
  deceleration, quality ratings consistently diminish, imprecision+asymmetry
  metrics start rising past 25–30 ms; **above 60 ms: "heavily impaired…
  generally judged as barely tolerable"**; regularity lost within a single
  part above 60–80 ms; 50–100 ms shows the *highest* tempo variability;
  >100 ms players go "auto-pilot" (ignore the counterpart entirely — the
  interaction is dead, which paradoxically re-stabilizes tempo).
- 📄 **The acoustic equivalence**: delay tolerance 20–30 ms ≈ **8–9 m of stage
  separation at 343 m/s** — "traditionally considered the maximum physical
  separation ensuring maintenance of a common tempo without a conductor"
  (Rottondi §I). 1 ms ≈ 34.3 cm. Musicians already live with this: organ and
  piano actions add **30–100 ms** key-to-onset depending on dynamics, and
  players compensate unconsciously. A conductor (= common external cue)
  removes the recursive drag; 30–50 ms asynchrony is "largely tolerated and
  even consciously emphasized" as style.
- 📄 **Tempo dependence** (Rottondi §III-D-4): thresholds shrink as BPM rises —
  drummers/bassists tolerate ~**40 ms at 60 BPM but only ~15 ms at 120 BPM**.
  Faster/denser music = tighter budget.
- 📄 **Timbre/genre dependence** (Rottondi §III-D-2): high spectrum entropy/
  flatness (percussive, noisy) → more deceleration above 35 ms; slow attack
  (pads, strings) decelerates more but *synchronizes* better — attack
  sharpness determines how audible the misalignment is. Strings showed more
  deceleration+asynchrony than clarinets on the same piece. Percussive =
  worst case for perception, pads = most forgiving; the clapping studies are
  deliberately the hard case.
- 📄 **Jitter vs absolute latency**: for audio, a late packet is a LOST packet
  ("if a packet reaches its destination after its scheduled playback time,
  its audio data is no longer valid" — Rottondi §II), so jitter converts to
  either dropouts or a bigger playout buffer, i.e. more fixed latency. The OSC
  timestamp literature states the trade explicitly: timetags + a playout
  queue "reduce jitter by trading it for latency", which is "musically
  significant" (Schmeder/CNMAT,
  https://www.cnmat.berkeley.edu/sites/default/files/attachments/2008_implementation_and_application_of_open_sound_control.pdf).
  ⚠️ For rhythm, un-buffered jitter hurts more than equal fixed delay:
  musicians strategize around a constant offset (all coping strategies above
  assume one), but random ±10–15 ms onset scatter destroys the beat with no
  strategy available — BLE-MIDI's measured 14 ms jitter (below) is why it
  feels worse than its mean latency suggests. Rule: **fixed small delay >
  variable smaller delay; buffer to a constant.**
- 📄 **Asymmetric paths**: effects are dominated by the LARGER of the two
  one-way delays (Rottondi §III-D-1) — budget the worst direction, not the
  average.
- 📄 **Self-delay as a tool** (delayed-feedback approach): artificially
  delaying your OWN monitor up to the full RTT re-synchronizes the pair;
  one-sided self-delay raised acceptance to 65 ms ("would have been perfect
  with practice") and up to 190 ms in Carot's tests, though >30 ms self-delay
  feels "unnatural"; both-sided tops out ~80 ms and many reject it.
  Master-slave (leader ignores the follower) tolerates **100–200 ms**.
- 📄 Musicians are MORE latency-sensitive than non-musicians; training doesn't
  raise the threshold, though practice at a given delay reduces deceleration.

**The definitive answer**: <25 ms one-way = real ensemble playing; 25–50 ms =
playable with role asymmetry (leader-follower) and repertoire choices (slower,
softer attacks); 50–150 ms = synchronous illusion only via self-delay tricks;
beyond that you change the musical contract (interval/loop models), which
works at ANY latency. 📄

## 2. Prior art systems — what each chose

| System | Transport | Topology | Latency class | Musical contract |
|---|---|---|---|---|
| **Jamulus** 📄 | UDP, OPUS small frames | server mix (each client gets a personal mix) | 30–70 ms overall typical (author's 3-year case study) | same-room illusion; server must be near ALL players; dropouts every 2–10 s accepted as weather |
| **JackTrip** 📄 | UDP, uncompressed PCM | P2P or hub server | lowest possible (codec = 0 ms; Internet2 heritage) | same-room illusion for regional/academic nets; SoundWIRE lineage (Chafe's group) |
| **SonoBus** 📄 | UDP via AOO (audio-over-OSC), OPUS or PCM | P2P mesh, server only for discovery | LAN excellent, WAN = path-dependent | same-room illusion; per-peer jitter buffer control |
| **JammerNetz** 📄 | UDP port 7777, uncompressed 48 kHz | server mixdown | ~50 ms total on fibre+ASIO | same-room illusion, "no codecs" stance |
| **Soundjack** 📄 | UDP native helper + browser UI | P2P (optionally server) | user-tuned, regional | same-room illusion with exposed knobs (Carot) |
| **NINJAM** 📄 | TCP! (latency irrelevant by design), OGG Vorbis | server relays per-interval streams | **one full musical interval** (e.g. 16 beats) | "you play along with everyone's PREVIOUS interval" — tempo-locked, form-locked, never note-locked |
| **jammr** 📄 | NINJAM protocol | server | interval | NINJAM contract, hosted |
| **Endlesss** 📄 (†2024-05-31) | cloud loop sync | loop exchange ("rifffs", 8-track retro looper) | asynchronous (seconds+) | co-composition, not co-performance; died with its servers — archive-portability lesson |
| **JackTrip-WebRTC** 📄 | **RTCDataChannel `{ordered:false, maxRetransmits:0}`**, raw PCM via AudioWorklet (verified in source: client/public/js/room/client.js:483) | P2P | **40 ms LAN best case** — beats the standard WebRTC media path (AES paper, Politecnico di Torino) | browser same-room attempt; proves the unreliable-DataChannel pattern ships |
| **multiplayerpiano.com / Chrome Shared Piano** ⚠️ | WebSocket relays | server | 100s of ms, uncontrolled | social toy: no sync contract at all, and it still works socially — the floor of viability is lower than the science implies |
| **Ableton Link** 📄 | UDP multicast 224.76.78.75:20808, LAN only | leaderless peer clock | sync ≪ audible; **no audio/notes cross the network** | shared tempo+phase, LOCAL sound each end — the "shared clock, local sound" contract |

Reading of the table: **below ~50 ms every system sells the same-room
illusion and differs only in how it spends the budget** (codec 0–8 ms vs
bandwidth; mix-at-server = one jitter buffer + shorter path-sum vs P2P = fewer
hops but N−1 uplinks, dead at consumer uplink ~N≈10 📄 Rottondi §V-B).
**NINJAM is the one design that WORKS at planetary latency** because it moved
the sync point from the note to the FORM — the >50 ms strategy with 20 years
of daily use. Ableton Link is the orthogonal trick nobody in the jam-app list
uses over WAN: synchronize clocks, not sound. Sources: jamulus.io case-study
PDF (Fischer), cockos.com/ninjam + server-guide, JackTrip ICMC 2009 paper
(ccrma.stanford.edu/groups/soundwire/publications/papers/2009-caceres_chafe-ICMC-jacktrip.pdf),
github.com/sonosaurus/sonobus, github.com/christofmuc/JammerNetz,
ableton.github.io/link, musictech.com + cdm.link on the Endlesss shutdown.

## 3. MIDI over network — state of the art

- 📄 **RTP-MIDI / AppleMIDI (RFC 6295)** is the gold standard and its core
  insight is the **recovery journal**: run over plain UDP with NO
  retransmission; every packet carries a compact digest of *undelivered
  state* (which notes are down, last CC values, sustain state) so ANY single
  received packet heals all prior loss — **a lost note-off can never wedge a
  note**. Receiver acks let the sender trim the journal; Apple's driver
  always sends journals + idle "guard packets". This is the correct mental
  model for note events on lossy transports: **notes are not game state you
  can drop — a lost off/on PAIR member is a stuck note or a ghost** — but
  they compress to journal form beautifully. (rfc-editor.org/rfc/rfc6295,
  developer.apple.com MIDI Network Driver Protocol, en.wikipedia.org/wiki/RTP-MIDI)
- 📄 **BLE-MIDI reality**: 10–20 ms typical one-hop (Adafruit), 3–6 ms best
  case with tuned connection intervals (WIDI/CME), iOS floor ~11.25 ms — and
  measured **jitter up to ~14 ms** (Gearspace measurement thread; Nordic's
  own blog is about fighting exactly this). BLE-MIDI is a *cable
  replacement*, not a timing reference; treat any BLE hop in a jam chain as
  +10–20 ms ± 14 ms before the network even starts.
- 📄 **WebRTC DataChannel unordered/unreliable**: `{ordered:false,
  maxRetransmits:0}` is the standard low-latency config (MDN, web.dev), games
  use it routinely, and JackTrip-WebRTC ships it FOR AUDIO (source-verified
  above). Per-message overhead is real: DTLS ~30–50 B + SCTP chunk + UDP 8 B
  (webrtcforthecurious.com/docs/07-data-communication) — irrelevant at note
  rates (even 100 msg/s × ~90 B ≈ 9 KB/s).
- 📄 **OSC practice**: binary messages over UDP; NTP-format timetags;
  schedule-at-timetag + priority queue is the canonical "trade jitter for
  latency" discipline (CNMAT best-practices). OSC is what our Max/sensor
  adapters already speak; it has no loss-repair story (journaling is
  RTP-MIDI's alone).
- 📄 **MIDI 2.0 / UMP verdict — plan-timeline §5 stance CONFIRMED.** JR
  timestamps are 16-bit values in 1/31,250 s (32 µs) units that wrap ~every
  2 s, defined to work "without system-wide synchronization, master clock, or
  explicit clock synchronization between Sender and Receiver" (UMP spec
  M2-104-UM; midi.org). They smooth jitter on a LINK; they are not absolute
  time and carry no cross-device epoch — exactly "jitter offsets, not
  absolute time". Nothing in UMP addresses network loss, ordering, or session
  clock. **UMP = device vocabulary; the network layer and the log keep
  absolute ms; store raw/UMP words in the midi payload** (32-bit velocity +
  per-note data survive inside). Adapter + interchange, never the protocol —
  no revision needed.
- ⚠️ **Binary framing for note events — the honest arithmetic.** A MIDI 1.0
  note-on is 3 B. A fixed binary jam frame `{u16 seq, u64 at-ms (or u32
  delta), u8 source, u8 len, 3–4 B midi}` ≈ **16 B**; the same event as a
  JSON envelope ≈ 80–120 B → 5–8× wire size, but the per-message TRANSPORT
  floor (WS: TLS+TCP/IP ≈ 80–90 B; DataChannel: DTLS+SCTP+UDP ≈ 60–90 B)
  dominates single notes either way, and parse cost (µs-scale JSON.parse vs
  ~100 ns DataView) is noise against a 27 ms network. Binary wins for real
  reasons: deterministic parse under GC pressure, byte-exact rawData
  passthrough (the maria adapter contract: rawData for hardware +
  description for humans), and density once CC/pitch-bend streams batch
  (100 Hz × N controllers is where 8× matters). **Recommendation: binary
  fixed frame for the hot path, JSON for the control plane; sibling should
  measure parse+GC, not just wire.**

## 4. Transport fundamentals — when does WS-over-TCP actually fail

- 📄 **The HOL math.** WebSocket inherits TCP head-of-line blocking: one lost
  segment stalls ALL later messages until repair (websocket.org/reference/
  websocket-vs-tcp). Repair time is the trap for SPARSE traffic like notes:
  fast retransmit needs follow-on packets to trigger dup-ACKs; a note event
  with nothing behind it waits for **TLP at ~2×SRTT+delACK (tens of ms, Linux
  default) or worst-case RTO, floored at 200 ms** (RFC 8985 RACK-TLP;
  draft-dukkipati-tcpm-tcp-loss-probe; access.redhat.com/solutions/7041487).
  So on a 30 ms-RTT edge path with loss rate p, ~p of notes arrive
  ~60–200+ ms late AND drag everything queued behind them. At the <0.1 % loss
  typical of good residential paths that is one spike per ~1000 notes —
  tolerable for a demo, real for a show; at 1–5 % (bad Wi-Fi, congested
  uplink) it is audibly broken (ithare.com's classic figure: 5 % loss on one
  TCP connection ⇒ a 1.5 s lag spike every ~5 min).
- ⚠️ **Relay software is NOT the budget; the path and the protocol are.**
  µWebSockets holds ~5 ms p95 echo under load where ws creeps to 15–20 ms
  and socket.io collapses to seconds at p99 (anycable.io/compare/
  nodejs-websocket; dev.to benchmark) — i.e. software chooses between
  "adds ~1–5 ms" and "pathological", and any non-pathological relay
  disappears inside an edge RTT. Our ✅ 27 ms one-way through a Durable
  Object (broadcast-before-persist) already proves the DO class is fine.
  DO-specifics that DO matter: 📄 output gate 2–10 ms per confirmed message;
  hibernation wake +50–100 ms on first message; **placement pinning — the DO
  lives at the first-joiner's PoP forever** (developers.cloudflare.com/
  durable-objects/reference/data-location), so a cross-continent second
  player pays the full triangle both ways. Regional jam: fine. Planetary:
  the DO is the wrong ordering point (or needs locationHint).
- 📄 **Cloudflare Realtime SFU DataChannels exist as a product** — named
  pub/sub data tracks over WebRTC through the anycast SFU
  (developers.cloudflare.com/realtime/sfu/datachannels), and **as of
  2026-08-13 support `ordered:false` / `maxRetransmits` /
  `maxPacketLifeTime`** (changelog post 2026-08-13-datachannels-reliability-
  ordering — two weeks old), plus `waitForAck` subscriber gating. This is the
  UDP-family note path on our OWN stack: publisher DataChannel → SFU →
  subscribers, no encode/decode, anycast entry both ends (no pinning).
  ⚠️ Expected latency: below the 74 ms media figure (that includes
  capture/encode/decode/render); floor ≈ ICE path + SFU forward. Nobody has
  published numbers — **this is exactly what proto/jam should measure**, in
  reliable vs `maxRetransmits:0` arms under injected loss.
- 📄 **QUIC datagrams / WebTransport in Workers: not available.** workerd
  WebTransport is an open feature request (github.com/cloudflare/workerd
  issue 6451); Workers cannot terminate QUIC datagrams today. The CF path to
  QUIC semantics is **MoQ**: the relay network runs in 330+ cities, speaks
  draft-16 (blog.cloudflare.com/moq, /moq-relays), and moq-transport supports
  both subgroup-stream and **datagram** delivery modes (github.com/cloudflare/
  moq-rs) — streams already give per-object independence (no cross-note HOL);
  ⚠️ whether the CF relay forwards datagram-mode objects is unverified by us.
  Our ✅ numbers: native pub→relay→sub one-way p50 **17.9 ms** (d14), d16
  establish 136 ms with identical latency, browser WebCodecs media 26–33 ms
  g2g, audio 32.6 ms g2g with A/V skew −4 ms free. MoQ note events would ride
  a data track the same way — no WebCodecs needed, so ⚠️ expect ~native-class
  (≈18–25 ms) one-way from a browser via WebTransport.
- ✅ **Our numbers, restated as jam budget entries** (all one-way): cue
  DO-relay 27 ms · MoQ native 17.9 ms · MoQ browser media g2g 26.2–33 ms ·
  MoQ audio g2g 32.6 ms · SFU media g2g 73.6 ms (2-way jam pairs 74–97 ms at
  N=3–5) · DO join→roster 33 ms, publish→broadcast 38 ms. Reminder when
  comparing to §1: the science counts source-to-EAR; browser paths add output
  latency (AudioContext outputLatency ~10–40 ms class ⚠️; iPhone aLat ✅
  ~66 ms) on top of transport — the demos agent must report
  glass/speaker-to-ear honestly.

## 5. Co-creation + timeline integration

**How prior systems record a jam:** NINJAM servers archive **per-participant,
per-interval OGG files + clipsort.log** (an edit list; REAPER imports it as
one track per participant — lanes!) 📄 (cockos.com/ninjam/server-guide,
wiki.cockos.com Importing Ninjam Sessions). Endlesss kept loops as cloud
objects and died with them 📄 — export-or-perish. Jamulus/JackTrip record
nothing structurally (DAW-side capture only). The NINJAM shape IS our shape:
append-only per-source media chunks + a timing sidecar.

**Mapping onto plan-timeline — verdict: the substrate already carries it.**
- Jam events = `{at, kind:"midi", source:<participant>, v, payload:{rawBytes,
  description}}` — the `midi` kind is already declared (plan §5 interop
  stance), payload shape is maria's adapter (own-prior-art §3), per-
  participant lanes are `source` + `window()` queries (tracks are queries,
  not containers).
- Overdub-during-playback is already the transport's one path (own-prior-art
  §1.11: schedule() during play fires immediately, joins the log sorted).
- NINJAM's interval trick is our **per-kind quantization law generalized**
  (own-prior-art §1.3: the quantum is a property of the event type; latency
  is free while latency < quantum — NINJAM sets quantum = one interval). The
  delayed remote lane is an ACTUATOR policy ("renderer may deviate from the
  log; the log stays faithful" — own-prior-art §3), never a log rewrite.
- Loop/async jamming = spans + R2 refs, already law.

**What the plan genuinely lacks (small, and now on record):**
1. ⚠️ **A stated LOCAL-ECHO exception to loopback-ordering.** maria's
  loopback-through-server (§1.5, own-prior-art) makes the relay echo the
  single ordering point — correct for the LOG, fatal for the MONITOR: no
  musician accepts RTT on their own instrument (§1 self-delay data: >30 ms
  self-delay "unnatural"). Jam rule: **actuate locally at 0 ms, log by
  sender stamp, let the relay order the log only.** One sentence in the plan;
  the demos must implement it or they will measure the wrong thing.
2. ⚠️ **Per-source `seq`** on jam events — loss detection + dedupe key
  (`dedupe(keyFn, windowMs)` exists) + a future journal/repair hook
  (RTP-MIDI's lesson). Cheap now, impossible to retrofit into recorded shows.
3. ⚠️ **Merge-view alignment caveat**: C5's skew estimator is ✅ ±50 ms
  real-world — good enough for archives, WIDER than the ensemble band. Two
  participants' merged lanes may disagree by more than the rhythm they
  played. For jam recordings the tempo-map kind (C10) + beat-domain
  alignment (or a per-pair offset from the relay echo) is the honest merge;
  flag it in the reducer, don't silently trust `at`.
  Otherwise: **nothing structural** — no new store, no new transport verbs.

## 6. Synthesis for the demos agent

**(a) Latency budget table (one-way, source-to-ear):**

| Band | Feel | Strategy | Sources |
|---|---|---|---|
| <11.5 ms | accelerates (!) | nothing needed | 📄 Chafe ensDelay |
| 11.5–25 ms | stable, "not perceived" | **tight ensemble — the target** | 📄 Chafe p6465; Rottondi §III-D |
| 25–50 ms | deceleration, coping | leader-follower / conductor cue / slower+softer repertoire; self-delay tricks | 📄 Rottondi §II-B, §III-D-5 |
| 50–100 ms | "barely tolerable" sync | restructure: master-slave (to 100–200 ms) or interval model | 📄 Rottondi §III-D |
| >100 ms–∞ | no synchronous illusion | NINJAM interval / loop exchange / async | 📄 cockos.com/ninjam |

Budget arithmetic ⚠️: transport is only the middle third — add capture
(~1–10 ms), synth/decode, and output (~10–40 ms browser; measure) each end.
A 27 ms transport can still be a 70 ms ear-to-ear system.

**(b) Transport ranking for OUR stack (note events, sub-30 ms goal):**
1. **CF Realtime SFU DataChannel, `ordered:false` arms** — anycast (no DO
   pinning), product-native pub/sub, brand-new delivery controls; expected
   sub-74 ms, plausibly ~30–40 ms ⚠️ — measure first.
2. **DO WebSocket relay** — ✅ 27 ms one-way KNOWN, trivial to build on
   (cues precedent), correct ordering point for the log anyway; risks: TCP
   HOL under loss (sparse-traffic TLP/RTO spikes), PoP pinning for distant
   pairs. The measuring stick the others must beat.
3. **MoQ data track** — ✅ 17.9 ms native / d16 relay proven; per-object
   streams dodge HOL; browser via WebTransport works today (our pages);
   costs: session/discipline overhead (announce races, 50-req budget),
   no product-grade auth story yet for jam rooms.
4. WebSocket via µWS on a container/VM — only if a non-CF region point is
   needed; software choice is minor vs path 📄⚠️.
   Not viable: QUIC datagrams in Workers (doesn't exist) 📄; raw UDP to
   browsers (never) 📄.

**(c) The three demo-worthy strategies:**
1. **Direct low-latency (co-located/regional)**: local echo 0 ms; notes over
   arms 1–3 above; remote notes scheduled on a small FIXED playout offset
   (trade jitter for latency, OSC discipline) sized ~p95 jitter; loss arms:
   reliable vs maxRetransmits:0 vs 0+journal-lite (last CC + hanging-note
   repair). Success = one-way ≤25 ms delivered, offset ≤10 ms of p95 jitter.
2. **NINJAM-interval (distant)**: shared tempo + interval N beats; remote
   lanes actuated exactly one interval late; the timeline records TRUE `at`
   — the delay lives in the actuator policy. Works at any RTT; demo target:
   Tallinn↔US feel.
3. **Loop/async (planetary)**: Endlesss contract on our log — loops as spans
   in R2, rifff-style layering = overdub scheduling; no clock shared except
   the tempo-map kind. Bonus 4th if cheap: **Link-style "shared clock, local
   sound"** — sync phase over the relay, exchange only notes, quantize remote
   notes to the next grid slot (quantum hides the latency, own-prior-art
   §1.3's measured law).

**(d) Wire format recommendation**: binary fixed frame, little-endian:
`u8 kind | u8 source | u16 seq | u32 at-delta-ms (epoch base in session
header) | u8 len | midi rawBytes (3–4 B)` ≈ 12–13 B/event, batchable
back-to-back in one message for chords/CC bursts; full epoch-µs stamp minted
at capture (own-prior-art §1.8), session header carries t0 + skewEst. JSON
stays for join/roster/control. Rationale in §3 ⚠️ — wire floor is transport
headers, the win is parse determinism + rawData fidelity + CC batching.

**Prior-art steal list (jam edition)**: recovery journal (RTP-MIDI) for
unreliable arms; interval-delay actuator (NINJAM); per-interval per-source
archive files + edit-list sidecar (NINJAM clipsort → our R2 layout already
matches); fixed playout offset with timetags (OSC/CNMAT); shared-clock-local-
sound (Ableton Link); unordered+maxRetransmits:0 shipped precedent
(JackTrip-WebRTC source); self-delay as a rehearsal accessibility knob
(Carot). Anti-patterns: cloud-only loop store (Endlesss †); NINJAM-over-TCP's
irrelevance trick does NOT license TCP for the sub-30 ms band; BLE hops
inside the timing path.

## Addendum: Play-a-Synth (user-recalled "play my synth" site; verified 2026-08-27)

📄 **playasynth.com** — the remembered platform, real and alive: play hardware
synths remotely from any browser or via free VST/AU plugins. MIDI in through
Web MIDI (full implementations — NRPN, CC, program changes), audio back over
WebRTC/Opus "optimized for musical content" with adaptive buffering; owners
run a host application (audio interface + MIDI + wired internet); connections
are "WebRTC and other peer-to-peer techniques". Marketplace: free tier + paid
sessions, platform takes 40 % (SEPA only). MIDI.org Innovation Award entry,
submitted by Jonna Laaksonen. Catalog right now: six units, ALL in Finland —
DeepMind 12, Reface DX, SE-02, Pulse 2, OB-6, Minilogue — all online.

- **No published latency numbers anywhere** — the load-bearing gap. The
  playability loop is command→sound ROUND trip (player's key → remote synth →
  audio back), so their budget is our jam budget doubled; our measured pieces
  (DC notes ~1 ms floor, MoQ audio 32.6 ms one-way) suggest a measured
  implementation could beat/inform it.
- **The pattern for our stack**: a remote instrument = an actuator adapter at
  a distance — midi kind in, an audio span back; the session is a timeline
  recording by construction (the jam log + the returned audio as a span).
- **Heritage resonance**: rare synths as remotely playable objects is the
  Kurenniemi DIMI dream in commercial miniature (all six current units are in
  Finland, fittingly). A museum instrument as a networked actuator — playable
  from a Radio Tallinn programme, its performances landing on the timeline —
  is this pattern pointed at the archive.
