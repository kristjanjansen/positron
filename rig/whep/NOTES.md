# WHEP rig notes (open item 6)

POWER RISK: battery 2% at start — notes appended after every step.

## Step 1 — live input created ✅ (2026-08-25)

- `POST /accounts/{acct}/stream/live_inputs` with `{"meta":{"name":"whep-rig"},"recording":{"mode":"off"}}` → success.
- **uid: `224558e8993d5a5efd234d9d3a320f87`** (name `whep-rig`) — full API response in `rig/whep/live_input.json`.
- WHIP publish URL: `https://customer-mwuu1cmlyif6eluy.cloudflarestream.com/2b5d72…k224558e8…/webRTC/publish` (path = credential, per plan §2.2).
- WHEP play URL: `https://customer-mwuu1cmlyif6eluy.cloudflarestream.com/224558e8993d5a5efd234d9d3a320f87/webRTC/play`.
- **preferLowLatency and WebRTC:** the field does not appear anywhere in the create response when unset, and `webRTC`/`webRTCPlayback` URLs are issued regardless. ⚠️ inferred: `preferLowLatency` is an HLS-packaging switch (plan §2.1) and is irrelevant to the WHIP→WHEP path — WebRTC never touches the HLS packager (no cross-protocol, plan §2.2). Accepted defaults; did not set it.

## Plan of record

- publish.html: 1280x720 canvas @30fps, burned ms timestamp as 56-block binary row (48-bit ms + 8-bit XOR checksum) + human digits + frame counter; captureStream(30) → RTCPeerConnection → WHIP. Negotiate abs-capture-time via setHeaderExtensionsToNegotiate, fall back to SDP munge; record answer SDP verbatim.
- play.html: WHEP recvonly → video → rVFC (§4.1: re-arm first, busy guard, expectedDisplayTime). Decode block row from pixels; latency = (timeOrigin+expectedDisplayTime) − burnedTs. Also record rVFC metadata.captureTime/receiveTime (captureTime present on remote streams ⇔ abs-capture-time survived), getStats every 2 s.
- server.py on :8897 (exclusive), Cache-Control: no-store, POST /collect → results/whep.jsonl.
- Playwright, --headless=new + anti-throttling flags + autoplay flag; visibilityState recorded per sample (§4.2 trap).
- Both tabs on this machine → clock error exactly zero (one performance.timeOrigin epoch domain per page, both against the same system clock).

## Step 2 — resumed after power restore ✅ (2026-08-25 22:01)

- AC power restored (battery 4%, charging). Prior agent stopped here.
- Port 8897 free. Live input `whep-rig` confirmed on disk (live_input.json intact).
- Playwright: npx cache has 1.62.1 (wants chromium-1234, NOT installed) and 1.60.0
  (wants chromium-1223, IS installed at ~/Library/Caches/ms-playwright). Using
  **playwright 1.60.0** via NODE_PATH=/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules
  → zero downloads needed. No machine changes.
- Next: write server.py, publish.html, play.html, run.mjs per plan of record.

## Step 3 — rig built ✅ (22:0x)

- `server.py` (:8897, no-store, POST /collect → results/whep.jsonl, POST /save/<name> →
  rig/whep/artifacts/ for verbatim SDPs), `publish.html`, `play.html`, `run.mjs`
  (TWO separate chromium instances so both pages are foreground — §4.2 trap),
  `analyze.py` (visible-only + checksum-valid + 10 s warmup skip).
- channel:'chromium' → NEW headless on full Chrome-for-Testing (headless shell may
  lack H.264; CF wants 42e01f).
- Next: start server, 30 s smoke run.

## Step 4 — smoke run 1 ✅/🐛 (22:05)

- WHIP publish + WHEP play both worked FIRST TRY: 201s, pc connected, 30 fps,
  893 rVFC samples/30 s, 100% checksum-valid decode (headline: pipeline works).
- **abs-capture-time headline signal:** both offers carried the extmap
  (negotiation='api' — Chrome 133 exposes setHeaderExtensionsToNegotiate, no munge
  needed); **both Cloudflare answers OMIT it**; metadata.captureTime absent in all
  893 samples. SDPs verbatim in rig/whep/artifacts/*.sdp.
- 🐛 rig bug: batch flush double-stringified the sample batch → server parsed one
  JSON *string*, obj["srv_ts"] on a str threw → all per-frame samples dropped
  (stats rows fine). Fixed (raw beacon body); server hardened for non-dict lines.
  Old file → results/whep-smoke1.jsonl.
- play-stats teaser: jitterBufferDelay/emitted ≈ 8.7 ms/frame, rtt 12–34 ms,
  framesDecoded 899 ≈ framesReceived, 1 dropped.
- Next: smoke run 2 with fixed pipeline, then full run.

## Step 5 — smoke run 2 ✅ full pipeline working (22:07)

- 885 samples, 100% checksum-valid, all visible. **Glass-to-glass p50 58.0 ms /
  p95 66.1 ms** (warmup-trimmed n=585). receiveTime→display p50 28.5 ms.
  jitterBufferDelay ≈ 11.9 ms/frame. ICE RTT p50 18 ms both legs. 0 packets lost.
- **abs-capture-time: definitively NOT negotiated.** pub offer carries
  `extmap:13 abs-capture-time` (+ abs-send-time, playout-delay, video-timing…);
  CF answer accepts ONLY mid, rtp-stream-id, repaired-rtp-stream-id,
  transport-wide-cc — on BOTH legs. So Chrome never even sends the extension:
  it is refused at the SDP layer, not stripped in transit. captureTime 0/585.
- Codec answers list VP8 first (96) on both legs; CF also answers H264/VP9/AV1/H265.
- Next: pmset check, then 300 s main run (archive smoke2 first).

## Step 6 — MAIN RUN ✅ 300 s (22:08–22:13) → results/whep.jsonl

- 8962 samples, ALL visible, 8079 after 30 s warmup, **100% checksum-valid**.
- **Glass-to-glass (burned px → expectedDisplayTime): p50 73.6 / p95 83.1 /
  p99 83.8 / min 55.7 / max 173.7 ms** (n=8079). Per-minute p50 stable:
  66.5 / 66.0 / 75.0 / 74.8 / 74.2 — no monotonic growth (busy guard works);
  ~8 ms step after min 2 = jitter-buffer adaptation (windowed jbd/frame
  22.3→17.5→23.1→14.4→11.8 ms).
- **abs-capture-time: 0 / 8079 samples with metadata.captureTime.** Combined with
  the SDP evidence (offer has extmap:13, CF answer omits it on BOTH legs, both
  runs), the extension is REFUSED at negotiation — Chrome never sends it.
- receiveTime→display p50 41.0 / p95 54.5 ms. jitterBufferDelay run-avg
  17.9 ms/frame. ICE RTT p50 15 ms both legs. packetsLost 32, nack 15, pli 2,
  freezes 2 (0.75 s total), 1280x720@29-30 sustained, qualityLimitation none.
- encoder/decoderImplementation absent from getStats in this headless build —
  codec ⚠️ inferred VP8 (listed first in both CF answers; Chrome default).
- Smoke runs archived: results/whep-smoke1.jsonl (bugged batches, stats only),
  whep-smoke2.jsonl (30 s, p50 58.0 ms — lower than main run's 73.6: short run
  ended before the jitter buffer's upward adaptation).
- Clock note: system clock ~+159 ms vs absolute — IRRELEVANT here, both tabs on
  one machine, latency formula uses per-page timeOrigin, error exactly zero.
- Server :8897 stopped after run; live input whep-rig LEFT in place (uid
  224558e8993d5a5efd234d9d3a320f87) for main session to keep or delete.
- Machine changes: none (no installs; playwright/chromium reused from caches).
