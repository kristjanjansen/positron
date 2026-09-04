# Cloudflare Containers, hands-on — can the engine live in one? (2026-08-27)

Hands-on deploy + measurement (✅) with docs research (📄) around it. Test workload = the
selfrec repackage job (proto/selfrec/repackage.mjs) transplanted into a container: pull the
kept proof show from the R2 pub URL, concat, copy-remux p1 (h264) + transcode p2 (vp8,
`-bf 0` law), upload nothing back. Rig: `rig/containers/` (worker.mjs + container/Dockerfile
+ container/server.mjs). Everything deployed here was deleted the same hour — §Cleanup.

## Verdict

**It works, it is cheap, and it is slow.** ✅ The account is already on Workers Paid —
`wrangler deploy` of a container app succeeded with zero plan friction (Containers is
paid-only — "$5 USD per month Workers Paid plan", pricing page verbatim; GA 2026-04-13 📄;
the PROGRESS "free plan" note from the cues era is stale).
A 296 MB node+ffmpeg image deployed in one command; first-ever request served ~16 s after
deploy; wake after a hard stop **3.72 s** (only 0.42 s of that inside the container); warm
proxy latency 0.21–0.36 s from Tallinn, and the instance was scheduled in **fra10** unasked.
The catch is the CPU: `standard-1` = **0.5 shared EPYC vCPU**, so the vp8→x264 transcode ran
at **ratio 0.81–0.83 of realtime (61–62.5 s for 75 s media) — ~50× the M-series engine's
1226 ms**. Copy-remux stays trivial (282–386 ms, ~4× local). Second surprise, the good kind:
**outbound networking is wide open** — arbitrary-port TCP (RTMP 1935 to live.cloudflare.com
connected ✅) and raw UDP (DNS to 8.8.8.8, NTP) both work from inside; the docs' "80/443+DNS
only" applies to the *blocked-internet* mode. Inbound stays Worker-fetch-only (HTTP/WS, no
public IP). So: repackage/reconcile in a container = real option (copy path), vp8 transcode
= pay for standard-4 or accept ~realtime; dial-OUT media legs (RTMPS uplink, moq/WebRTC
publisher) are live options; anything that must *listen* on UDP/RTMP/SRT stays dead.

## Capability envelope

Instance types 📄 (developers.cloudflare.com/containers/platform-details/limits/, fetched
2026-08-27; "standard" is a deprecated alias of standard-1 — wrangler warns ✅):

| type | vCPU | mem | disk | notes |
|---|---|---|---|---|
| lite (ex-dev) | 1/16 | 256 MiB | 2 GB | the always-on cheapie |
| basic | 1/4 | 1 GiB | 4 GB | |
| standard-1 (ex-standard) | 1/2 | 4 GiB | 8 GB | ✅ what we ran |
| standard-2 | 1 | 6 GiB | 12 GB | |
| standard-3 | 2 | 8 GiB | 16 GB | |
| standard-4 | 4 | 12 GiB | 20 GB | max; custom shapes 1–4 vCPU, ≤12 GiB, ≥3 GiB/vCPU, ≤2 GB disk/GiB |

- **Account caps** 📄: 6 TiB mem / 1,500 vCPU / 30 TB disk concurrent; no instance-count
  cap. Registry 50 GB/account. Image size ≤ instance disk (20 GB max). amd64 only.
- **Runtime** ✅📄: Firecracker microVM (`"runtime": "firecracker"` in the app config ✅);
  1 visible EPYC core at 2.0 GHz for standard-1 with cgroup cap 0.5 vCPU (API config ✅);
  4.27 GB MemTotal, 7.2 G root fs ✅. No max runtime — instances run until stopped, but **no
  uptime guarantee** (host restarts kill them) 📄. No swap, OOM ⇒ restart, **no GPU** 📄.
- **Invocation** 📄✅: every container is wrapped in a Durable Object (`Container` class from
  @cloudflare/containers; `getContainer(env.X, "name")` ✅). Anything that can run a Worker
  can start one: fetch ✅, cron `scheduled()` → `.start()`, queues, workflows 📄. No
  autoscaling yet (`getRandom(N)` over fixed instances) 📄.
- **Lifecycle** ✅📄: `sleepAfter` (default 10 min) sleeps the instance after idle — **but
  our 90 s setting never fired across ~18 min of idle** ⚠️. Code-read of
  @cloudflare/containers 0.0.28: the DO constructor calls `renewActivityTimeout()`, so when
  the idle DO is evicted and its own sleep-deadline alarm re-constructs it, the deadline is
  pushed before the expiry check runs — a livelock. Don't trust sleepAfter for cost control;
  stop explicitly. Second trap ✅: `stop()` sends SIGTERM, and **node as PID 1 ignores
  SIGTERM** — our instance stayed alive through stop() AND through a rollout (15 min to
  SIGKILL). Handle SIGTERM in the entrypoint (or use an init shim), or use `destroy()`.
  Rollouts ✅📄: default steps [10 %, 100 %], single-step when max_instances < 2 (our case),
  grace period 0 s 📄. Worker code flips immediately (new routes live in ~20 s ✅); the
  container image swaps lazily — our running instance kept serving the old image until
  destroyed, and the new image came up on the next start ✅. Version skew is real, plan for
  it. **Every restart/wake = fresh ephemeral disk** 📄 — nothing survives in the container;
  durable state belongs in R2/DO.
- **Networking** ✅📄: inbound **only via Worker fetch** (HTTP + WebSocket; no public IP —
  `assign_ipv4: none`, mode private ✅; per-instance `bandwidth_limit_mbps: 500` ✅).
  Outbound internet on by default and **measured wide open** ✅: TCP connects on 443, 8080,
  and 1935 (portquiz.net + live.cloudflare.com RTMP, 16–75 ms); raw **UDP works** (DNS
  replies from 1.1.1.1 AND 8.8.8.8, NTP :123) — so outbound QUIC/WebRTC/RTP is possible.
  The docs' "only 80, 443, DNS" sentence describes the `enableInternet = false` mode 📄;
  outbound *handlers* intercept only 80/443 📄. R2 pub URL fetch from inside worked ✅.
  Also available: outbound handlers with host allowlists + credential injection 📄,
  Workers bindings (R2/KV/DO) callable from inside the container, R2 FUSE mount example 📄.
- **Registry/deploy** ✅: `wrangler deploy` docker-builds the Dockerfile (amd64), pushes to
  registry.cloudflare.com, creates the app — one command, ~1 min for our 296 MB image.
  External registries (Docker Hub public+private, ECR, GAR) supported, but external images
  are not pre-fetched to edge hosts 📄.

## Measured numbers (standard-1, fra10, 2 runs)

| metric | container (CF) | local engine (M-series Mac) | factor |
|---|---|---|---|
| copy-remux 75.1 s h264 | **282 / 386 ms** (ratio 0.0038–0.0051) | 80 ms (0.0011) | ~4× slower |
| vp8→x264 75.1 s (`-bf 0`) | **60.9 / 62.5 s** (ratio **0.81–0.83**) | 1226 ms (0.0163) | **~50× slower** |
| R2 pub URL → host, 38 chunks seq | 3.4–4.2 s, **14–26 Mbps** | 4.3–12.1 s, 6–18 Mbps | ≈ same |
| first-ever cold start (deploy → 200) | **~16 s** (503 "provisioning" until then; server uptime 10 s at first 200) | — | |
| wake after hard stop (destroy → 200) | **3.72 s** total, container-internal only 0.42 s → ~3.3 s Firecracker+image start | — | docs claim "often 1–3 s" 📄; ours ≈ claim |
| warm request (Worker→DO→container) | **0.21–0.36 s** from Tallinn | — | |
| deploy, worker-code-only change | **22.5 s** wall, new route live immediately | — | |
| deploy incl. image rebuild+push | **40.3 s** wall (one cached layer changed; first full deploy ~1 min) | — | |

- The transcode number is the headline: 0.5 shared vCPU makes vp8→x264 veryfast run at
  ~realtime. x264 would scale ~linearly to standard-4's 4 vCPU → est. ratio ~0.1–0.15 📄.
- R2→container throughput is NOT better than R2→Mac: the sequential 38-fetch pattern is
  latency-bound in both; no intra-CF fast lane on the public r2.dev path. (Bindings/FUSE
  from inside the container untested — could change this.)
- Both runs produced the same 21 HLS files, 3.35 MB out for the vp8 tile — output shape
  identical to the engine's.

## Observability

- ✅ `wrangler containers list / info / instances / images` — app config down to
  vcpu/memory/disk, per-instance **state + location + version**, registry contents. Good.
  The `instances` state tracked reality through the whole session (running → inactive on
  stop/rollout → running), and reading it does NOT reset the idle timer — the safe probe.
- ⚠️ `wrangler tail` (4.75) shows only the **Worker's** request events — container stdout
  never appeared in the tail even with `observability.enabled`. Container logs live in the
  dashboard (Containers → Logs, interleaved with Worker/DO logs since 2026-04-21; Workers
  Logs retention 7 d paid) 📄.
- 📄 Dashboard: status/health, CPU-mem-disk metrics per app, billable-usage widgets.
- 📄 `wrangler containers ssh` (default-on since 2026-05-12) and `exec()` (2026-06-18)
  exist on newer wrangler than the machine's 4.75 — not exercised.
- Crash visibility: OOM/exit → instance restart; state visible via `instances` CLI ✅;
  `onError`/`onStop` hooks in the DO class 📄.

## Pricing (📄 rates confirmed current; ✅ math)

Rates (pricing page fetched 2026-08-27): mem $0.0000025/GiB-s (25 GiB-h/mo incl), CPU
$0.000020/vCPU-s — **"active usage only"**, not allocation (375 vCPU-min incl), disk
$0.00000007/GB-s (200 GB-h incl), egress
NA/EU $0.025/GB (1 TB incl). Base = the $5/mo Workers Paid already being paid. DO wrapper
bills too (duration 128 MB while awake — included tier covers a whole month: 334.8 k GB-s
vs 400 k incl).

| scenario (standard-1 unless noted) | active time | beyond included | raw (no allotment) |
|---|---|---|---|
| (a) 54-part 2-h show, **copy-remux** (dl 379 s + ffmpeg 36 s + up 379 s each) | 11.9 h | **$0.20** | $1.45 |
| (b) same show, **vp8→x264** (ffmpeg ~5,900 s each, ratio 0.82) | 96 h (!) — needs ~8 parallel instances for 12 h wall | **$6.13** | $7.15 |
| (c) always-on **lite** (relay/bridge case), 31 d, mostly idle | 744 h | **$1.77** | $2.22 |
| (c′) always-on lite, CPU pegged | 744 h | $4.67 | $5.40 |
| (c″) always-on **basic**, mostly idle | 744 h | $7.39 | $8.12 |

- (a) is essentially free: only memory-seconds exceed the included tier. Cost scales with
  *wall time held*, so parallel chunk download (vs the engine's sequential loop) directly
  cuts the bill.
- (b) on standard-4 (est. 6× faster ffmpeg): ~$4.9 beyond included AND 21 h single-instance
  wall — bigger instance is both faster and slightly cheaper (CPU bills usage, not size;
  memory bills time × size and time shrinks more than size grows). 📄 est.
- This experiment: ~25 min of standard-1 + 2 transcodes ≈ 6,000 GiB-s mem + ~80 vCPU-s —
  **$0.00 beyond the $5 base** (deep inside included allotments).

## The "something else later" map

- **Engine repackage/reconcile (postshow.mjs), cron-triggered — FEASIBLE, best fit.** Cron
  Worker → `getContainer().start()`, no operator machine, no runtime cap, R2 reachable
  (pub URL ✅, bindings/FUSE 📄). Copy path: 2-h participant ≈ 36 s ffmpeg; a 54-part show
  ≈ $0.20. The vp8 path is the decision point: ~realtime on standard-1 → standard-4 or
  accept hours. ffmpeg 8.1.2 in alpine ran the exact repackage args incl. `-bf 0` ✅.
- **Gapless-relay / splicer leg — FEASIBLE WITH A CAVEAT THAT MATTERS.** Outbound RTMP(S)
  to CF Live confirmed reachable from inside (**live.cloudflare.com:1935 connect 16 ms** ✅;
  443 too). Sources must reach it as WS/HTTP pushed through the Worker (encoder → Worker
  fetch → container WS ✅ supported); the FIFO+TS-concat splicer is compute-trivial
  (lite/basic, $2–8/mo). BUT: no uptime guarantee — a host restart drops the never-closing
  uplink socket, which by the socket-close law ends the broadcast, and sleepAfter/stop
  semantics are buggy enough (⚠️ above) that lifecycle needs owning explicitly. The
  slate/self-heal design the splicer already has is mandatory. Grade: viable cloud twin,
  not a strict upgrade.
- **mediamtx as ingest server — NOT FEASIBLE.** Its reason to exist is protocol ingest
  (RTMP/RTSP/SRT/WebRTC), all inbound on raw TCP/UDP — containers accept only
  Worker-proxied HTTP/WS in. As an HLS packager it's redundant with the repackage path.
- **moq-rs — relay NO, dial-out tools YES.** Inbound QUIC is impossible (no public IP, no
  raw listeners), so a moq *relay* leg is dead. But outbound UDP works ✅, so moq-rs
  *clients* — a publisher pushing to CF's MoQ relay, clock tools, probes — should run
  (amd64 rust builds; untested ⚠️ QUIC specifically, UDP reachability proven). Also worth
  noting: containers as amd64 build sandboxes duplicate what local Docker already gives us
  for the ThreatLocker problem.
- **Headless-chrome publishers — PLAUSIBLE, CPU-BOUND.** Image fits (chrome ~1–1.5 GB «
  8–20 GB disk 📄); no GPU → SwiftShader + software encode, so budget a standard-3/4 per
  publisher. A selfrec-shaped publisher (MediaRecorder → HTTPS chunk POST) is pure TCP-out
  and would work today; WebRTC/WHIP publishing is no longer blocked on transport — outbound
  UDP for ICE works ✅ (media quality on 2–4 shared vCPU software-encode untested ⚠️).
  Cold start 3.7 s + chrome boot is fine for scheduled shows. Cheaper first: CF Browser
  Rendering, or keep publishers on real machines.
- **Indexer / reconcile sweeps — WRONG TOOL.** Already proven to fit paid Workers cron
  ~300× over (selfrec NOTES); a container adds cold start and a DO wrapper for nothing.

## Cleanup (verified)

- Deleted: container app `positron-cnt-test-repacktest` (a0340f9f), Worker
  `positron-cnt-test`, both registry image tags (`:047ffc6d`, `:09de6025`), local docker
  image + smoke container. Verified: `wrangler containers list` → `[]`, `images list` →
  empty, workers.dev URL → 404. R2 untouched (job wrote nothing back). Session cost:
  ~25 min standard-1 + 2 transcodes ≈ deep inside included allotments → $0 beyond the $5
  base already being paid.
- Kept: `rig/containers/` (Dockerfile, server.mjs with /run + /net probes, worker.mjs with
  /stop + /kill, wrangler.jsonc, run2.json, tail.log) — redeployable in one command.
