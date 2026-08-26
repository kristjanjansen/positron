# Many-to-many video — plan

**Date:** 2026-08-25 · **Status:** designed, phase-1 prototype in flight (`proto/m2m/`, sibling agent) ·
Companion to `plan.md` (one-to-many ground truth — this file does not restate it)

Provenance, same convention as `plan.md`:

- ✅ **measured** — measured in this repo (see `plan.md` / `PROGRESS.md` / `rig/`)
- 📄 **documented** — vendor docs / changelog / blog, dated, URL inline, not independently confirmed
- ⚠️ **inferred** — arithmetic on top of docs, single-sourced, or untested; treat as hypothesis

---

## §0. Requirements & scales

elektronstudio is a performing-arts platform. The one-to-many "stage" is solved and measured in
`plan.md` (LL-HLS 2.4–4 s tuned ✅, WHIP→WHEP 74 ms p50 ✅, cues DO relay 27 ms one-way ✅).
Many-to-many is the **participatory layer** on top:

- Audience members and performers each publish camera+mic (opt-in).
- Performers see the audience — the "seeing the room" requirement (predecessor: elektronstudio/v4).
- Audience may see each other in a grid.
- All of it runs *alongside* the stage stream, not instead of it.

### Scales

| tier | participants | publishers (typical) | shape |
|---|---|---|---|
| rehearsal / workshop | 2–10 | all | everyone sees everyone; conversational latency |
| intimate performance | 10–40 | 10–40 | performer sees all; audience sees a grid subset |
| big show | 40–200+ | subset (9–25 on a rotating "stage grid") | most watch; a subset publishes |

### Requirements distilled

1. **Conversational latency for the grid** — <500 ms mouth-to-ear. WebRTC territory; LL-HLS
   (✅ 2.4 s floor) is disqualified for the grid by an order of magnitude.
2. **Selective subscription** — nobody receives 200 tracks. The UI decides who is visible and the
   client subscribes to exactly those, at a quality matched to tile size (simulcast).
3. **One PeerConnection per client**, not one per tile — 12 tiles must not mean 12 ICE/DTLS handshakes.
4. **Coexistence** with the stage stream and the cues channel; cues should be able to *drive* the
   participation layer (e.g. a cue opens an "audience may publish" window).
5. **Graceful per-participant degradation** — one dropped participant costs their tiles only.
   Contrast: ✅ the one-to-many broadcast dies on encoder socket close (`plan.md` §10); the grid must
   not have an equivalent single socket.
6. **Firefox/Safari must work** — audiences bring whatever browser they have.
7. **Recording honesty** — know exactly what can and cannot be recorded before promising archives.

---

## §1. Candidate architectures

### The candidates, measured-where-known

| candidate | grid latency | client cost per 12-tile grid | scale ceiling | recording | verdict |
|---|---|---|---|---|---|
| **A. Cloudflare Realtime SFU** | ✅ **74 ms p50 / 83 ms p95** glass-to-glass — measured through this exact infrastructure (see below) | 1 PC, 1 renegotiating session | 📄 "no upper limit" on tracks/session; sessions-per-app undocumented | ❌ none in SFU; composite client needed (§5) | **core of the answer** |
| B. N× Stream live inputs (WHIP/WHEP) | ✅ 74 ms p50 (same number, same infra) | 12 separate PeerConnections | 📄 unlimited inputs; but no track model, no simulcast (📄 "coming soon" since 2022) | 📄 recording "coming soon" for WHIP — i.e. none | featured sources only, not a grid |
| C. MoQ relay | ✅ 17.9 ms p50 one-way (tiny object, draft-14) | n/a — no proven browser client at draft-16 | 📄 relay fan-out; live-edge only (no FETCH/GOAWAY) | ❌ | phase-3 experiment, not a plan |
| D. Pure P2P mesh | ~RTT (~15 ms ✅ ICE RTT measured) | 1 PC per peer; **uplink N−1 × 1 Mbps** | breaks at ~6–10 publishers (uplink math below) | ❌ | workshops ≤6 at best; saves nothing given the SFU free tier |
| E. RealtimeKit (managed layer on the SFU) | ⚠️ same SFU underneath | SDK-managed | 📄 managed | 📄 **yes** — $0.010/min composite, $0.0005/min raw RTP→R2 | fallback if building on the raw SFU stalls; recording via it is interesting |
| **F. Hybrid: SFU grid + LL-HLS/WHEP stage + cues DO signaling** | mixed (each part measured) | inherits A | inherits A | stage recorded by Stream ✅ works today; grid via composite (§5) | **recommended — validated below** |

### A. Cloudflare Realtime SFU — the load-bearing facts

- **The repo has already measured this SFU without knowing it.** 📄 Stream's WHIP/WHEP was migrated
  to be "powered by Cloudflare Realtime (Calls)" starting 2025-03-13
  (https://developers.cloudflare.com/stream/changelog/). The ✅ 74 ms p50 / 83 ms p95 glass-to-glass
  WHIP→WHEP measurement in `plan.md` §2.2 therefore traversed this exact media plane.
  ⚠️ Inference: SFU session↔session latency ≈ the same 74 ms class (same PoPs, same forwarding
  plane; the HTTPS session API differs but is not on the media path).
- **API model** 📄 (https://developers.cloudflare.com/realtime/https-api/): base
  `https://rtc.live.cloudflare.com/v1/apps/{appId}`, Bearer = app secret (✅ both already in `.env`
  as `CF_REALTIME_APP_ID` / `CF_REALTIME_APP_SECRET`; app "flabbergaster" pre-exists). Ten endpoints:
  `sessions/new`, `tracks/new`, `tracks/update`, `tracks/close`, `renegotiate`,
  `datachannels/{establish,new,update,close}`, `GET sessions/{id}`. A *session* is a PeerConnection;
  a *track* is published once under a `trackName` and pulled from any other session anywhere by
  `{location:"remote", sessionId, trackName}`; responses carry `sessionDescription` +
  `requiresImmediateRenegotiation` (📄 examples: https://github.com/cloudflare/realtime-examples,
  https://github.com/cloudflare/orange).
- **No rooms.** 📄 The SFU has sessions and tracks only — room membership, rosters, and who-pulls-whom
  are explicitly your problem. This is exactly the hole the cues DO fills (§3).
- **Simulcast** 📄 (https://developers.cloudflare.com/realtime/sfu/simulcast/): publisher sets
  `sendEncodings` rids (f/h/q); subscriber passes `simulcast.preferredRid` on pull and can change it
  via `tracks/update` (SFU auto-issues FIR on switch); per-track automatic bandwidth
  estimation/layer switching. This is what makes 200-scale selective subscription affordable (§4).
- **Data channels** 📄: pub/sub datachannels through the SFU, incl. one-publisher/many-subscriber;
  at most one subscriber may hold `canReply` per publisher channel.
- **Limits** 📄 (https://developers.cloudflare.com/realtime/limits/): 50 API calls/s per session;
  ≤64 tracks per API call; "no upper limit to the number of tracks a session can contain"; tracks
  GC'd after **30 s of inactivity**; PC must reach `connected` within 5 s. Sessions-per-app,
  per-track bitrate caps, and app-level API rate limits: **undocumented** ⚠️.
- **Architecture** 📄 (https://blog.cloudflare.com/cloudflare-calls-anycast-webrtc/): anycast, every
  one of 310+ PoPs is the SFU, per-track cascading fan-out trees, NACKs answered at the edge;
  PeerConnection setup "100–250 ms globally"; 95 % of users within 50 ms of a PoP.
- **TURN** 📄 (https://developers.cloudflare.com/realtime/turn/): `turn.cloudflare.com` UDP 3478/53,
  TCP 3478/80, TLS 5349/443 — **free when used with the SFU**, shares the 1 TB free egress tier, no
  double-billing on TURN→SFU traffic.
- **Status**: SFU docs current (updated 2026-04) 📄; pricing GA since May 2024 📄. Not a beta
  surface like Stream-WebRTC or MoQ.
- **Reference app** 📄: Orange Meets / "Meet" (https://github.com/cloudflare/orange) — Remix +
  Workers + **Durable Object for room state** + the SFU; defaults 1.2 Mbps / 24 fps / 1080p;
  optional E2EE via MLS in a Rust/WASM worker with a designated-committer algorithm
  (https://blog.cloudflare.com/orange-me2eets-we-made-an-end-to-end-encrypted-video-calling-app-and-it-was/).
  Their DO-for-rooms + SFU-for-media split is the same shape as §2/§3 below — independent
  validation of the hybrid. Tested participant ceiling: undocumented ⚠️.

### B. Per-participant Stream live inputs — honestly costed

📄 Unlimited live inputs and viewers (https://developers.cloudflare.com/stream/faq,
https://developers.cloudflare.com/api/resources/stream/subresources/live_inputs/), and ✅ 74 ms
measured. But as a *grid*:

- One WHEP player per tile ⇒ N full PeerConnections per client (ICE+DTLS each) ⚠️ heavy at 12+.
- 📄 No simulcast ("coming soon" since 2022-09), no recording for WHIP ingest, no analytics, and
  WHIP⇄HLS cross-protocol is blocked (https://developers.cloudflare.com/stream/webrtc-beta/) — so
  audience tracks can never fall back to the HLS path either.
- 📄 Beta billing unstated; at GA it bills like Stream: $1/1000 delivered minutes. Grid math:
  40 viewers × 12 tiles × 120 min = 57,600 min ≈ **$58/show**; 225 × 10 × 120 = **$270/show** at
  200-scale — 10–30× the SFU egress cost (§4), for less capability.
- ✅ The publish URL is the credential (`plan.md` §2.2) — distributing per-audience-member publish
  URLs is a credential-management job with no session semantics.

**Verdict**: keep for what it already does (stage ingest, 1–3 *featured* remote performers via the
measured WHIP path). Wrong tool for the participatory grid.

### C. MoQ — right latency, no client

✅ 17.9 ms one-way relay proven (draft-14, `plan.md` §2.3) — the best transport number in the repo.
Disqualifiers today: ⚠️ browser client at CF's draft-16 is unproven — two ecosystems share the name
(IETF MoQT draft-16 vs moq-lite/`hang`; moq.dev claims moq-lite is "forwards compatible with
moq-transport draft-14+ CDNs" while this repo's earlier research concluded the opposite — direct
conflict, 30-min test to resolve, https://moq.dev/); a conferencing client means hand-rolling
WebTransport + WebCodecs + jitter buffers per track; 📄 WebTransport in Safari only since 26.4
(baseline 2026-03) — recent-Safari-only audiences; no TURN equivalent (UDP-blocked networks just
fail) ⚠️; draft-16 tokens are dashboard-only, shown once (✅ `plan.md` §10). Phase-3 experiment (§6).

### D. Pure P2P mesh — the arithmetic

Uplink per publisher = (N−1) × 1 Mbps: N=6 → 5 Mbps (viable ⚠️), N=10 → 9 Mbps (marginal on
residential uplink), N=40 → 39 Mbps (dead). Downlink same. No simulcast in a mesh — the weakest
peer drags every sender's single encode down. No TURN-free NAT story (still need TURN ⇒ still
paying egress somewhere). Given the SFU's 1 TB/month free tier makes a 10-person workshop ≈ $0
(§4), mesh saves nothing and adds N² failure modes. Rejected.

---

## §2. Recommended architecture (F: hybrid)

Three planes, each on the component this repo has already measured for that job:

```
                        STAGE (one-to-many, plan.md, unchanged)
  OBS/relay/encoder ──RTMPS──> Stream live input ──LL-HLS──> audience players (2.4–4 s ✅)
       (or WHIP ✅ 74 ms)                └─WHEP──> low-latency viewers / performers' confidence view

                        GRID (many-to-many, this plan)
  each participant browser
    getUserMedia → RTCPeerConnection (ONE per client)
        │  POST sessions/new · tracks/new (publish: local, mid, trackName, simulcast f/h/q)
        │  POST tracks/new  (pull: remote, sessionId, trackName, preferredRid)   ← selective
        ▼
  Cloudflare Realtime SFU  (rtc.live.cloudflare.com/v1/apps/{appId}, anycast, per-track fan-out trees)
        ▲
        │ Bearer CF_REALTIME_APP_SECRET — server-side only
  Worker: SFU API proxy  (thin; authorizes per room+role, forwards to rtc.live)

                        CONTROL (signaling + cues, workers/cues, extended)
  all participants ──wss──> cues Worker → Durable Object per room (27 ms one-way ✅)
      cues (existing)  +  roster / track registry / publish-permission frames (§3)
```

**Latency budget per plane** — grid ⚠️ ≈74 ms glass-to-glass (✅ measured through the same SFU
plane via WHIP→WHEP); join-to-first-frame ⚠️ <1 s (📄 100–250 ms PC setup + 1 API round-trip +
✅ ~30 ms roster push); control ✅ 27 ms one-way / 32–38 ms RTT. Stage unchanged ✅ 2.4–4 s (LL-HLS)
or 74 ms (WHEP).

**The two-clock consequence** ⚠️ (design, not vendor): the grid runs at ~0.1 s while the LL-HLS
stage runs at ~2.4–4 s. Audience members on the HLS stage stream will *hear the room react* ~2–3 s
before they see why. Options, in preference order: (a) publishers/reactive participants get the
stage over WHEP (74 ms — both clocks now agree within ~100 ms); (b) delay grid *display* (not
audio) toward the stage clock for HLS viewers; (c) accept it as theatre. Decide in phase 2 with
real humans; the cue engine (`hls.playingDate` alignment ✅) already gives the measurement hooks.

### Component list — exists vs to build

| component | state |
|---|---|
| Realtime SFU app (`CF_REALTIME_APP_ID/SECRET`) | ✅ exists in `.env` ("flabbergaster") |
| Stage pipeline: ingest, LL-HLS player v5, WHEP, relay/OBS | ✅ built + chaos-tested (`plan.md`) |
| Cues DO relay (`workers/cues`), hibernation + ping autoresponse | ✅ deployed, 27 ms one-way |
| Cue engine w/ PDT alignment (`src/timed-messages.js`) | ✅ built, 65–98 ms fire error |
| SFU echo/grid client (RTCPeerConnection + tracks API) | 🔨 phase 1, in `proto/m2m/` now |
| Worker SFU API proxy (secret custody, room/role authz) | 🔨 to build (phase 2) |
| Track registry protocol in the DO (§3) | 🔨 to build (phase 2) |
| Grid UI: tile layout, selective pull, preferredRid by tile size, audio policy | 🔨 to build (phase 2) |
| Publish-permission flow (cue-driven "audience may publish" window) | 🔨 to build (phase 2/3) |
| Recording composite (OBS Browser Source → Stream, §5) | 🔨 phase 3 |
| Reference code to mine: cloudflare/orange (DO room mgmt, renegotiation, partytracks lib) | 📄 available |

---

## §3. Signaling over the cues DO

**Key simplification**: with this SFU, signaling never touches SDP. Offer/answer flows
browser↔SFU over HTTPS (via the proxy Worker). Peers only need to learn **which (sessionId,
trackName) pairs exist and whose they are**. Signaling = a presence + track directory — a small
delta on the deployed CueRoom pattern (`workers/cues/src/index.js`).

**Deployment shape**: a second DO class (`RtcRoom`) in the same worker, route
`/room/<name>/rtc`, wrangler migration v2 `new_sqlite_classes`. The deployed, measured CueRoom
stays byte-identical. Same proven mechanics: WebSocket hibernation, `setWebSocketAutoResponse`
ping/pong (✅ 32–38 ms RTT, no wake), broadcast-before-persist (✅ the 50 ms lesson), roster
snapshot on join (the cue-backlog pattern), `ws.serializeAttachment` for identity across
hibernation.

### Frames (delta on the cue protocol)

```
client -> server
  {type:'join',      participant:{name, role}}           role ∈ performer|audience|operator
  {type:'publish',   sessionId, tracks:[{trackName, kind, label, simulcast?}]}
  {type:'unpublish', trackNames:[...]}
  {type:'perm',      grant:{role|participantId, publish:bool}}   operator only
server -> client
  {type:'roster',    self:{id}, participants:[{id, name, role, sessionId?, tracks:[...]}]}  on join
  {type:'joined'|'published'|'unpublished', ...}          deltas, broadcast
  {type:'left',      id}                                  fired by webSocketClose
  {type:'perm',      ...}                                 publish-window open/close (cue-drivable)
```

- **trackName convention**: `<participantId>/<mic|cam|screen>` — collision-free, self-describing,
  and the pull call needs nothing else beyond the publisher's sessionId.
- **Leave detection inverts the socket-close lesson**: in the one-to-many world a closed socket
  kills the broadcast (✅ `plan.md` §10, the hard-won finding); here `webSocketClose` on the DO is
  the *feature* — instant `left` broadcast, subscribers `tracks/close` the dead pulls. Backstop:
  📄 SFU GCs inactive tracks after 30 s regardless.
- **Reconnect** = new SFU session ⇒ new sessionId ⇒ re-`publish`; subscribers treat it as
  unpublish+publish. No state to repair — the roster is rebuilt from the announcement, the media
  from a fresh pull. (Rebuild-never-patch, ✅ design rule from `plan.md` §10, applied to signaling.)
- **Rate discipline** ⚠️: a DO broadcast fans out ×N; at 200 sockets, continuous audio-level
  telemetry (2 Hz × 200) would be 80 k msg/s — do NOT relay levels. Relay only edge events
  (`speaking`/`quiet`, publish/unpublish, perm changes); each client computes its own local audio
  levels for its own tiles from the media it already receives.
- **Latency budget**: announcement propagation ✅ 27 ms one-way — negligible against 📄 100–250 ms
  PC setup and ⚠️ ~50–150 ms per tracks/new API round-trip. The DO is not the bottleneck; nothing
  in signaling needs optimizing before phase-2 measurements say so.
- **Auth** ⚠️ to design: Worker mints a short-lived room token (HMAC) binding participantId+role;
  DO validates on join; the SFU proxy authorizes publish/pull per role (audience publish only
  inside an open perm window). App secret never reaches a browser.

---

## §4. Cost model

📄 SFU pricing (https://developers.cloudflare.com/realtime/pricing/): **$0.05/GB egress** (CF→client
only; ingress free), **1 TB/month free**, TURN free alongside (shared tier, no double-billing).
Conversions: 1 Mbps ≈ 0.45 GB/h. Assumptions: 1 Mbps per published cam track (f layer), simulcast
quarter layer ≈ 0.25 Mbps for small tiles, Opus ≈ 32 kbps; 2 h event. All ⚠️ arithmetic on 📄 prices.

| scenario | subscription shape | egress | GB / 2 h event | $ if free tier already spent |
|---|---|---|---|---|
| workshop, 10, all-see-all, full quality | 10 × 9 × 1 Mbps + audio | ~93 Mbps | **~84 GB** | $4.20 |
| intimate, 40 publish, 12-tile view, simulcast (2 tiles @f + 10 @q) + 8 open mics | 40 × ~4.8 Mbps | ~190 Mbps | **~171 GB** | $8.60 |
| — same, naive full-quality 12 tiles (no simulcast) | 40 × 12 × 1 Mbps | 480 Mbps | 432 GB | $21.60 |
| big show, 225 sessions view 9-tile grid @q + 1 featured @f | 225 × 3.25 Mbps | ~731 Mbps | **~658 GB** | $32.90 |
| — same, no simulcast (worst case) | 225 × 9 × 1 Mbps | ~2.0 Gbps | ~1.8 TB | $91 |

Readings:

- **The free tier absorbs a monthly program**: ~12 workshops, or ~5 intimate shows, or 1 big show
  + change, per month, at $0. Simulcast is the difference between $33 and $91 at 200-scale — it is
  a cost feature, not just a UX feature.
- Stage stream bills separately on Stream 📄 ($1/1000 delivered min): 225 viewers × 120 min = $27
  per big show; storage $5/1000 min recorded.
- Cross-checks: RealtimeKit ⚠️ (📄 $0.002/min/video participant,
  https://developers.cloudflare.com/realtime/realtimekit/pricing/): $2.40 / $9.60 / $54 per event —
  same order of magnitude, no free tier, but recording exists ($1.20 per 2 h composite).
  N× Stream live inputs at GA pricing: **$58 / $270** at the two larger scales (§1.B) — the
  expensive way to get less.
- ⚠️ Unknowns that could move this: undocumented per-app caps (§1.A); whether the SFU meters
  retransmissions/FEC as egress; TURN share when many participants are UDP-blocked (still free
  tier, but counts).

---

## §5. Risks & open questions

Ranked.

1. **No recording in the SFU** 📄 — the grid is ephemeral unless composed. Honest options:
   (a) **composite participant**: a headless/OBS browser joins as a silent subscriber, renders the
   grid page, streams RTMPS to a Stream live input → recorded + becomes the archival "audience
   camera". Reuses the repo's OBS/relay Option C infra (✅ built) and the studio-OBS pattern —
   lowest-risk, phase 3. (b) RealtimeKit's recording/raw-RTP-to-R2 📄 — but that means its SDK
   layer, not the raw SFU. (c) per-participant WHIP to Stream inputs records **nothing** today 📄.
2. **Undocumented scale ceilings** ⚠️→✅ **first probe done (session 4 scale ladder, N=8→20):
   NO ceiling found through 20 participants.** Zero non-2xx across ~101 sessions/new + ~270
   tracks/new/renegotiates (no 429s ever); API latencies stable (sessions/new p50 240–500 ms,
   renegotiate ~170 ms); a probe held 19 recvonly tracks on ONE PeerConnection decoding
   continuously; pooled latency FLAT with N (p95 ≈ 158 ms at every rung). Local bottleneck is
   RAM (~800 MB/Chrome), not CPU. Two caveats for phase 2: one 20-way join storm hit a uniform
   ~3.4 s stall on ALL sessions/new (still 201s — ⚠️ DNS/edge queueing), and one publisher's
   ICE/DTLS never connected during one storm (1 of 3) → **the publish leg needs a
   connect-timeout retry** (✅ since IMPLEMENTED in room.html — phase 1c — and it absorbed every
   flake through N=54; flakes grow with storm size: 9/46 legs at N=48). Phase 1c extended the
   no-ceiling result to **N=54 / 106 tracks on one PC / ~1500 API calls, one transient 500**.
   200-scale remains unprobed → phase 3 soak stands.
3. **The two-clock problem** ⚠️ (§2) — grid at 0.1 s vs stage at 2.4–4 s is a *dramaturgical*
   hazard no vendor doc mentions. Mitigations exist (WHEP for publishers; display delay); needs a
   rehearsal-scale human test, not a rig.
4. **Renegotiation churn** ⚠️→✅ **measured and retired (phase 1d)**: a rotating grid at N=10 ran
   348 pull/unpull API calls with 0 errors at 0.6 calls/s/session (budget 📄 50/s), renegotiated
   pull p50 386 ms, **tile-switch TTFF p50 523 / p95 646 ms**, untouched tiles unaffected, zero
   degradation over the run. Grid-page discipline (pull on visible, close on hidden) still applies
   at 200-viewer scale, but the mechanism is proven cheap. NEW measured fact for the room design:
   **dead publishers emit NO track-level signal** (tile freezes silently; session 410s only at
   +31–47 s) — the RtcRoom `left` broadcast + a stats-stall watchdog are the death detectors.
5. **Browser matrix** ⚠️ — Safari/Firefox WebRTC is fine for plain pub/sub 📄, but rid-based
   simulcast publish behavior and layer-switch smoothness differ per browser; Orange Meets is the
   existence proof it's workable 📄, unmeasured here. Phase-2 matrix test (the repo's Playwright
   discipline applies; ✅ hidden-tab trap rules from `plan.md` §4.2 carry over verbatim —
   background tabs will throttle grid rendering and fake "dead" tiles).
6. **Timing measurement** — ✅ abs-capture-time is refused by this infrastructure at negotiation
   (`plan.md` §2.2), so grid latency claims must again be burned-pixel measured; the WHEP rig
   (`rig/whep/`) is the template. Expect ~74 ms; verify, don't assume.
7. **Secret custody** — the app secret is a full-control credential 📄; it must live only in the
   proxy Worker. ⚠️ And the account API token still needs rotation (`plan.md` §6) — same hygiene
   moment, do both.
8. **Vendor surface stability** 📄 — SFU pricing GA since 2024-05, docs maintained 2026-04; but
   Stream-WebRTC is still "beta" since 2022 and MoQ is beta-with-changing-API. The recommended
   stack deliberately puts the participatory layer on the GA surface only.

---

## §6. Prototype roadmap

**Phase 1 — SFU echo/grid proof** — ✅ **DONE (2026-08-25 session 4), exceeded the brief**:
- **3-way full mesh: 6/6 directed pairs, 100 % checksum-valid (n=14,551), pooled glass-to-glass
  p50 96.9 / p95 125.0 / p99 164.1 ms.** Stretch 5-way: 20/20 pairs, 100 % valid (n=51,075),
  pooled p50 91.6 ms — 5-way is NOT worse than 3-way. Mesh established in 4.1 s (3-way) / 8.0 s (5-way).
- 2-way through the SFU: **p50 74.2 ms — statistically identical to the WHIP→WHEP 73.6 ms baseline**
  (as §2 predicted: same media plane). The +20 ms at 3–5-way is ⚠️ receive jitter-buffer adaptation +
  co-located-browser rAF contention, not TURN (ICE RTT 17–23 ms) and not codec.
- CPU 20–28 % of one core per browser, `qualityLimitationReason: none` throughout; the single-machine
  bottleneck is the canvas rAF draw loop (encoder fps sagged 23–26 at 5-way) → ⚠️ ~8–10 participants
  per laptop for synthetic load; real shows use one browser per human.
- API traps for phase 2: CF's edge 1010-blocks urllib's default User-Agent (proxy must set a custom
  UA); mid→participant mapping must be registered BEFORE `setRemoteDescription` (ontrack fires during
  it). One 3.1 s sender-side freeze observed once, seen identically by all receivers.
- Artifacts: `proto/m2m/{room.html,server.py,run.mjs,analyze.py,README.md,NOTES.md}`, data
  `results/m2m-sfu*.jsonl`, SDPs + tile screenshots in proto/m2m/. Zero new CF resources created.

**Phase 1b — scale ladder** — ✅ **DONE (session 4): N=8→12→16→20, no durable gate fired.**
Publishers = N−2 lightweight (320x180@15, publish-only) + 2 full probes pulling all N−1 tracks each.
Valid rate ≥99.58 % every rung; pooled p50 109–116 ms / p95 pinned ~158 ms — **latency flat with N**;
publisher fps 15 across the board, `qualityLimitationReason: none` everywhere; join storm → full mesh
8–18 s. Freezes: 7 events, all ≤0.6 s, all sender/SFU-side (seen identically by both probes).
Instrument fix: `sendBeacon`'s ~64 KB quota silently dropped probe batches at N=20 — switched to
`fetch()` (the N=16 rung was just under the cliff; another instrument-first save).
New tools: `proto/m2m/{run-scale.mjs,analyze-scale.py}`; data `results/m2m-scale-*.jsonl`.
See §5 risk 2 for the API/storm findings and the publish-retry requirement.

**Phase 1c — heavy media** — ✅ **DONE (2026-08-26 session 5): audio+video to N=54, still no SFU ceiling.**
- **Audio works, first try, everywhere**: per-participant FFT-verified tones on every directed pair up
  to 106/106 at N=54; concealment ≤0.39 % pooled (gate was 5 %). Pulling A+V in one `tracks/new`
  keeps renegotiation count unchanged.
- **Show-quality (640x360@30, 1.2 Mbps) is FASTER than lightweight: p50 66 / p95 96 ms** — 30 fps
  halves frame-interval quantization; zero freezes (the freeze-prone class is 15 fps lightweight).
  720p featured tiles alongside small ones degrade nothing.
- **Co-tenancy (5 pages/Chrome) is clean** (+5 ms p50, fps unthrottled) and cuts RAM 58 % — that's
  what unlocked **N=54: 106 tracks on ONE PeerConnection**, SFU-path p50 flat 122–137 ms from
  N=8→54, ~1500 API calls, one transient 500 ever.
- **Publish/connect retry now IMPLEMENTED in room.html** (failure-only path): join-storm ICE flakes
  grow with N (0/24 → 9/46 legs at N=48) and the retry absorbed every one — without it a 30-way
  storm is ~1-in-2 fatal. Production requirements surfaced: an end-to-end video-sanity heartbeat
  (one sender emitted corrupt frames for 110 s while its own getStats read healthy), and viewer
  fan-in saturates the page's rAF/encode (4–7 fps near ~100 tracks) long before decode fails.
- Tools: `proto/m2m/{run-heavy.mjs,analyze-heavy.py}`, data `results/m2m-heavy-*.jsonl`,
  NOTES.md §HEAVY MEDIA.

**Phase 1d — churn + endurance** — ✅ **DONE (2026-08-26 session 5): stable, and the failure
lifecycle is now measured end to end.**
- **30-min soak, N=8: STABLE.** p50 slope −0.04 ms/min (zero drift), no RSS leak (publishers
  SHRANK), 8/8 tracks alive at every poll, zero spontaneous renegotiations. 20 brief stalls
  (max 3.2 s) in 30 min, none in the final 5.
- **Rotating grid (risk 4 retired):** 27 rotations × 2 probes = 348 API calls, 0 errors — 0.6
  calls/s/session vs the 📄 50/s budget. **Tile-switch time-to-first-frame p50 523 / p95 646 ms**;
  untouched tiles unaffected; no degradation over 5 min.
- **Dead publishers are INVISIBLE at the track level** — zero mute/ended events in 12 kills; the
  tile just freezes; `GET sessions/{sid}` flips to 410 only at **+31–47 s**. Death detection MUST
  come from signaling (the RtcRoom `left` broadcast + stats-stall watchdog) — validates §3's design.
- **Publisher kill → fully restored in ~3.9 s** (relaunch + publish + 2 s roster poll + repull);
  with DO push replacing the poll, expect ~2 s. Rejoin storms of 4: restored in 4–16 s.
- **Connect-retry proven load-bearing**: 7 organic ICE flakes under load, all recovered on attempt
  2, never exhausted; inert on the happy path. Implemented in room-churn.html (8 s timeout,
  3 attempts, backoff).
- Instrument lesson #5: fetch `keepalive` has its own ~64 KB pending quota (sendBeacon's lesson,
  second verse) — bulk telemetry must ride plain fetch.
- Tools: `proto/m2m/{room-churn.html,run-churn.mjs,analyze-churn.py}`; data
  `results/m2m-churn-*.jsonl`; NOTES.md §CHURN.

**Phase 2 — the room, at workshop scale (2–10), then synthetic 40**:
- Build the `RtcRoom` DO frames (§3) + proxy Worker with role tokens; wire the grid UI with
  selective pull + `preferredRid` by tile size; publish-permission window driven by a cue.
- Chaos, ported from `plan.md` discipline: kill a participant's network mid-publish (blast radius
  = their tiles only? `left` timing vs 30 s GC), rejoin storms, hidden-tab behavior, Firefox +
  Safari matrix, DO hibernation under 40 sockets.
- Synthetic load: headless publishers (Playwright tabs or ffmpeg→WHIP feeding featured tiles) to
  40 sessions; measure join-storm API behavior, egress vs the §4 model (fills ⚠️ risk 2), simulcast
  layer-switch latency on `tracks/update`.
- The two-clock rehearsal: real humans, stage on LL-HLS vs WHEP arms, decide §2's option a/b/c.

**Phase 3 — show scale + recording + the experiment**:
- 200-session synthetic soak (cost telemetry vs §4; find the undocumented ceiling before a show does).
- Recording composite: OBS Browser Source (✅ overlay pattern exists) renders the grid as a silent
  participant → RTMPS → Stream live input (recorded); archive = stage + grid, both on Stream.
- Rotating-grid choreography (operator/cue-driven `perm` + featured-tile selection) at big-show shape.
- MoQ spike, strictly time-boxed: resolve the moq-lite-vs-draft-16 compatibility conflict (§1.C,
  30 min), and only if it *works in a browser today*, prototype one audience-cam-over-MoQ tile.
  Otherwise re-shelve until the ecosystem converges.

---

## Sources (web, this document)

- https://developers.cloudflare.com/realtime/ · /realtime/sfu/ · /realtime/https-api/ ·
  /realtime/limits/ · /realtime/pricing/ · /realtime/turn/ · /realtime/sfu/simulcast/ ·
  /realtime/realtimekit/pricing/
- https://blog.cloudflare.com/cloudflare-calls-anycast-webrtc/ ·
  https://blog.cloudflare.com/orange-me2eets-we-made-an-end-to-end-encrypted-video-calling-app-and-it-was/
- https://github.com/cloudflare/orange · https://github.com/cloudflare/realtime-examples
- https://developers.cloudflare.com/stream/webrtc-beta/ ·
  https://developers.cloudflare.com/stream/changelog/ (2025-03-13 WHIP/WHEP→Realtime migration) ·
  https://developers.cloudflare.com/stream/faq
- https://moq.dev/ · https://datatracker.ietf.org/doc/html/draft-ietf-moq-transport-16
