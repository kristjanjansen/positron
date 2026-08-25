# m2m — many-to-many SFU prototype (Cloudflare Realtime)

Proves N-way browser video through the Cloudflare Realtime SFU
(`rtc.live.cloudflare.com/v1/apps/{appId}`) and measures per-directed-pair
glass-to-glass latency with the house burned-pixel method (rig/whep lineage:
binary block row + XOR checksum, rVFC decode, one-clock loopback).

## Results (2026-08-25, all participants headless Chrome on one machine)

| run | pairs flowing | checksum-valid | pooled p50 | pooled p95 | per-chrome CPU |
|---|---|---|---|---|---|
| 2-way smoke 30 s | 2/2 | 100 % (n=1355) | **74.2 ms** | 82.9 ms | — |
| 3-way main 120 s | 6/6 | 100 % (n=14551) | **96.9 ms** | 125.0 ms | 20–26 % |
| 5-way stretch 120 s | 20/20 | 100 % (n=51075) | **91.6 ms** | 123.9 ms | 22–28 % |

Baseline: WHIP→WHEP one-to-one 73.6 ms p50 (plan §2.2). The SFU adds ~0 at
2-way and ~+20 ms at 3–5-way (receive jitter-buffer adaptation with many
streams + rAF contention between co-located browsers — not TURN, not codec:
ICE RTT stayed 17–23 ms, qualityLimitationReason `none` throughout).
Single-machine bottleneck at 5-way: canvas rAF drops to 23–26 fps on some
pages (compositor contention), NOT encoder CPU (`qualityLimitationDurations.cpu` = 0).

Data: `results/m2m-sfu.jsonl` (3-way canonical), `m2m-sfu-5way.jsonl`,
`m2m-smoke1.jsonl`. Verbatim SDPs in `artifacts/`. Per-run screenshots in `logs/`.

## Files

- `server.py` — port **8897**: static files, `/join`+`/roster`+`/reset`
  (registry), `/collect` (JSONL collector), `/cf/*` (authenticated proxy to the
  SFU HTTPS API; app secret from `../../.env`, never in the page).
- `room.html?id=X&n=N` — one page = one participant = ONE RTCPeerConnection
  (1 sendonly canvas track + N−1 pulled recvonly tracks). 640x360@30 canvas
  with 64-block row: 48-bit epoch-ms + 8-bit participant id + 8-bit XOR
  checksum. Each remote tile decodes via rVFC (re-arm first, busy guard,
  presentedFrames dedupe) and POSTs `{from,to,latencyMs,…}` samples.
- `run.mjs` — Playwright driver: one persistent headless context per
  participant (foreground pages — plan §4.2), unique user-data-dirs, per-tree
  CPU sampling via `ps`.
- `analyze.py` — per-directed-pair p50/p95/p99, visible-only + checksum-valid
  + 10 s per-pair warmup, getStats + CPU summaries.

## How to run

```bash
cd proto/m2m
python3 server.py &                         # port 8897; reads ../../.env
IDS=A,B DURATION=30 node run.mjs            # smoke
IDS=A,B,C DURATION=120 node run.mjs         # main
python3 analyze.py ../../results/m2m-sfu.jsonl
```

Requirements already on this machine: playwright 1.60.0 in the npx cache
(`~/.npm/_npx/705bc6b22212b352`), chromium-1223 in `~/Library/Caches/ms-playwright`.
No getUserMedia anywhere — canvas captureStream only (FaceTime camera is wedged
at OS level). Kill stale rig chromes ONLY by user-data-dir path (`m2m-udd-*`,
run.mjs does this itself).

## SFU API flow (verified live against realtime-api-2024-05-21.yaml)

1. `POST /sessions/new` → `{sessionId}` (bearer = app secret).
2. Push: `addTransceiver(track,{direction:'sendonly'})`, createOffer,
   setLocalDescription, wait ICE gathering →
   `POST /sessions/{sid}/tracks/new` `{sessionDescription:{type:'offer',sdp},
   tracks:[{location:'local', mid, trackName}]}` → apply answer, wait
   `connectionState==='connected'` **before pulling**.
3. Pull: `POST …/tracks/new` `{tracks:[{location:'remote', sessionId:<owner>,
   trackName}]}` → response has `requiresImmediateRenegotiation:true` +
   an SFU offer + `tracks[].mid`. Register mid→participant BEFORE
   setRemoteDescription (ontrack fires during it), createAnswer,
   `PUT …/renegotiate` `{sessionDescription:{type:'answer',sdp}}`.
4. Serialize pulls (one renegotiation in flight per PeerConnection).

Gotcha found: Cloudflare's edge **1010-blocks Python-urllib's default
User-Agent** — the proxy must send a custom UA (curl passes untouched).

## Production mapping (planned workers/cues signaling)

| prototype piece | production shape |
|---|---|
| `/join` + `/roster` poll (2 s) | workers/cues-style Durable Object room: join broadcast over WebSocket (push, not poll — the DO relay measured 27 ms one-way, plan §11); late joiners get the roster as backlog, exactly like the 500-cue backlog |
| `/cf/*` proxy | Worker route holding the app secret (the secret can mint sessions and pull ANY track in the app — never ship it to clients) |
| participantId | authenticated identity from the room token |
| leave/cleanup | DO `webSocketClose` → broadcast leave + `tracks/close` housekeeping |

The SFU data plane needs NO server in the media path — the DO is signaling only.
