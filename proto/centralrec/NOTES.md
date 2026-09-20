# proto/centralrec — PROTO B: central per-participant recording (studio pulls all N)

Stress-tests the plans/plan-studio.md "Grid archive" decision (which chose PER-PARTICIPANT
SELF-RECORDING) by building the alternative honestly: ONE studio session subscribes to
every participant's track through the deployed elektron-rtc Worker + Realtime SFU and
runs a MediaRecorder per remote track. Records what the SFU DELIVERS.

Sibling: proto/selfrec/ (PROTO A, port 8894) — not touched. My port: 8893.
Worker: deployed elektron-rtc EXACTLY as deployed (workers/rtc/DEPLOYED.md) — never modified.
Rooms: fresh per-run names `centralrec-<label>-<ts>` (rerun-poison rule).

## Build plan (2026-08-27)

- `server.mjs` — node ESM local driver server :8893: static, /collect JSONL,
  /chunk/<file>?seq= append-to-disk chunk receiver (MediaRecorder timeslice chunks,
  serialized per-file client-side; seq monotonicity checked), /end/<file> close marker.
- `pub.html` — publisher, adapted from proto/m2m grid.html publish path verbatim
  (canvas 640x360@30 burned ms+pid binary row, jittered connect-retry, WS join/publish
  on the deployed Worker, 1.2 Mbps maxBitrate, contentHint motion — the measured show rung).
  Optional `selfrec=1`: source-side MediaRecorder reference arm (B4), same codec/bitrate
  settings as the central recorder so the comparison isolates the SFU hop + double encode.
- `recorder.html` — the studio: WS join (audience), pull EVERY published track on ONE
  PeerConnection (serialized pull chain, midToPid-before-setRemoteDescription), per-track
  MediaRecorder (vp8, 1.2 Mbps, timeslice 2000 ms) → chunks to /chunk/. On `left`:
  stop recorder (close file), tracks/close the pull. On re-`published` (new sessionId):
  fresh pull + NEW file (gen++). getStats 2 s: per-track bytesReceived/fps/res + transport.
  Pull-only session first (no published track); dummy-publish fallback flag if the SFU
  refuses (P3B hardening list mentioned "pull-only recorder session" as untested).
- `run-central.mjs` — playwright driver: N pub pages (groups of 4/context, co-tenancy
  rule), victim publisher in OWN context for B3 SIGKILL, recorder in own context (so ps
  by udd substring separates recorder CPU from publisher CPU). Scenarios: smoke, b1
  (N=8 90s), b2 (N=4/N=12 60s), b3 (kill at T+30s, rejoin +10s).
- analysis: `analyze-central.py` — downlink from bytesReceived deltas, CPU curves,
  ffprobe on recorded files, offline burned-row decode via ffmpeg rawvideo pipe (gray
  640x360, row y=68, 64 blocks × 9 px starting x=32 — same geometry as the live decoder).

Results → results/centralrec-*.jsonl. Recordings → proto/centralrec/recordings/<run>/
(deleted after analysis except one proof set).

## Checkpoints

- [x] plan read: plan-m2m §1.A/§5, plan-studio Grid-archive row, DEPLOYED.md, grid.html
      patterns (cf() with Bearer token, WS sigConnect/join, publishWithRetry with jitter,
      pull chain, left→dead marking), grid-server.py (not reused — node server instead,
      static root must be proto/centralrec/), archive README (house measurement style).
- [x] ports 8893/8894 both free at start; proto/selfrec exists (sibling's, untouched).
- [x] SMOKE (N=2, 20 s) green end-to-end: pull-only recorder session WORKS on the
      deployed Worker (no published track needed — session created lazily at first
      pull, answer waits for ICE gathering on the first exchange; recorder recording
      all N in 2.6 s from launch). Recorded files: VP8 640x360, ~29 eff fps, burned-row
      decode 100 % (597/597, 586/586), pids correct, max inter-frame gap 73 ms.
      TWO BUGS FOUND+FIXED:
      (1) Chrome RE-FIRES ontrack for an already-associated mid during a LATER pull's
          setRemoteDescription — without a per-mid dedupe the recorder double-records
          a participant (smoke run 1: A got g1+g2 files of the same track, and the
          orphaned g1 MediaRecorder was unstoppable by pid — recs map is pid-keyed).
          Fix: handledMids Set, released on unpull (rejoin = new mid).
      (2) analyzer: MediaRecorder webm has a 1 ms timebase; ffmpeg's CFR guess
          duplicates rawvideo output to 1000 fps — decode with -fps_mode vfr.
      Bitrate datum: MediaRecorder cap 1.2 Mbps but synthetic content is content-
      limited — central files ~474/455 kbps, source-side ref ~415 kbps; SFU per-track
      downlink ~0.51-0.55 Mbps (matches the m2m "canvas is content-limited" caveat).
      CPU floor: rec Chrome 17 % of a core at N=2; Chrome RSS baseline ~770 MB.
- [x] B1 (N=8, 90 s): studio downlink 4.00 Mbps payload / 4.10 Mbps transport
      (~0.50/track — content-limited synthetic under the 1.2 Mbps cap, qlr=none on all
      8 publishers). Recorder Chrome CPU p50 29.8 % / max 38.6 % of a core, RSS ~907 MB;
      node server+driver <1 %. All 8 tiles 640x360@29-30 fps, 0 freezes. All 8 files:
      100 % burned-row decode, effFps ~28.6-28.9, max inter-frame gap 73-75 ms,
      ~440-471 kbps each. rec-launch → recording-all-8 in 5.2 s.
- [x] B2 (N=4/12, 60 s): downlink LINEAR — 2.08 / 4.10 / 6.15 Mbps transport at
      N=4/8/12 (0.51 Mbps/track flat). Rec CPU 24.1 / 29.8 / 45.4 % p50. FIRST QUALITY
      ARTIFACTS AT N=12: tile A froze 3.1 s (87 frames dropped, 1 packet lost) — a
      3.1 s hole IS in the archive file (maxGap 3103 ms); 3 more tiles had 0.2 s
      freezes. N=8 was pristine → the single-page decode+re-encode ceiling starts
      biting between 8 and 12 tracks on this machine.
- [x] B3 (kill K at T0+30 s, relaunch +10 s): SIGKILL → 'left' at recorder +95 ms
      (DEPLOYED band) → K-g1 stopped +96 ms, unpull done +408 ms. K-g1 is a CLEAN
      file: last decoded frame at kill+0.04 s, 100 % decode, no corrupt tail (2 s
      chunked appends + stop-on-left). Rejoin: relaunch → published-received 2.28 s
      (fresh page+session), pull 0.6 s, K-g2 first frame at kill+13.0 s → media gap
      12.97 s total ≈ 10.07 s deliberate + 2.9 s structural. SIBLING COUPLING: the
      unpull (kill+0.0 s) and repull (kill+12.7 s) renegotiations each put a
      ~130-172 ms frame gap into EVERY sibling's archive file (5/7 and 7/7 tiles) —
      the m2m unpull-burst lesson scaled to 1 track. Central recording glitches ALL
      files whenever ANY participant churns; self-recording structurally cannot.
      ANALYSIS TRAP found: Chrome RESETS inbound-rtp bytesReceived (recreates stat
      objects) on EVERY renegotiation — endpoint-delta downlink math halves; use
      transport-level counters or reset-aware positive-delta accumulation.
- [x] B4 (b1n8 A central vs A source-side ref, same MediaRecorder settings):
      decode 100 % BOTH arms (2612/2612 vs 2910/2910), row contrast saturated 255
      both. All 2612 central frames matched a source frame (same burned ms).
      Matched-frame gray PSNR central-vs-source: p50 54.7 dB, p95 56.2, min 37.0
      (one outlier) — the double encode is visually lossless ON THIS SYNTHETIC
      CONTENT. Bytes: central 5.03 MB vs source 5.19 MB (central −3 %; source arm
      recorded ~10 s longer wall time; per-second 444 vs 412 kbps ≈ +8 %).
      ⚠️ Camera-noise content would pay a real generation loss — untestable here
      (camera OS-wedged); flag for a real-camera rig.
- [x] OPTIONAL SIMULCAST ARM (b6f/b6q/b6h, N=8, 45 s, publishers sendEncodings f/h/q):
      * q layer (160x90 from a 360p source) NEVER STARTS — bytesSent 0 forever; and
        the SFU SILENTLY FALLS BACK TO f when preferredRid names a missing layer:
        the rid=q run delivered full 640x360 at full cost. Trap: asking for
        "cheapest" got "most expensive" with zero error surface.
      * rid=h works: 320x180@30 delivered on all 8 — studio downlink 2.07 Mbps
        (vs 4.76 pulling f from the same simulcasting pubs), rec CPU 16.8 % p50
        (vs 34.4 %). Half-res archive ≈ 2.3× cheaper; burned rows STILL 100 %
        decodable at 320x180.
      * cost shifts to publishers: simulcast uplink ~0.97 Mbps/pub (f+h) vs 0.50
        single-encoding — best-available-vs-cheap archive flexibility ≈ 2× uplink
        on every participant.
      * instrument fix: simulcast = one outbound-rtp PER RID; aggregate in stats or
        a starved layer's framesSent=0 read freezes driver readiness gates.
- [x] B5 accounting (fits over N=2/4/8/12 measured points):
      * studio downlink = 0.507 Mbps/participant + 0.06 (r² ~1, this content);
        transport-level measured 1.08 / 2.08 / 4.10 / 6.15 Mbps at N=2/4/8/12.
      * EXTRAPOLATED (flagged): N=25 → 12.7 Mbps, N=54 → 27.4 Mbps on this
        synthetic content; at the 1 Mbps camera-class assumption ×1.05-1.12 wire
        (m2m-measured overhead): N=25 ≈ 26-28 Mbps, N=54 ≈ 57-60 Mbps sustained.
        Per 2 h show the studio must ingest ≈ 3.7 GB (N=8) / 24-25 GB (N=25) /
        51-55 GB (N=54). SFU egress dollars are trivial ($1.2-2.7 past free tier);
        the binding constraints are (a) the studio's sustained downlink, (b) the
        one-page decode+re-encode ceiling: freezes appear between N=8 (pristine)
        and N=12 (3.1 s hole in one archive file), CPU fit 2.66 %/participant+12 %
        → ~78 % of a core at 25, ~155 % at 54 — but quality degrades BEFORE CPU
        saturates; N>12 needs sharded recorder pages.
      * tiered-grid violation quantified: the live studio view at N=54 (1 featured
        + 8 live + 45 wall-snapshot tiles) needs ~7 Mbps; central archive forces
        ~57-60 Mbps — 8.1-8.6× the tiered design's continuous pull, converting the
        wall tier's ~0.04 Mbps snapshot cost into 1+ Mbps continuous per head.
      * plus the B3 coupling: every join/leave renegotiation nicks ~130-170 ms out
        of EVERY sibling archive file.
- [x] Cleanup: all run recordings deleted except recordings/proof/ (15 MB):
      b1n8-A-g1.webm (central baseline), b1n8-A-src.webm (source ref),
      b3kill-K-g1/g2.webm (clean death + rejoin files), b6h-A-g1.webm (rid=h arm).
      No leftover chrome (udd pattern), no server, port 8893 free. Rooms were
      per-run (centralrec-<label>-<ts>) on the deployed worker — nothing to delete
      (roster DO entries GC on their own; no CF resources created). Results kept:
      results/centralrec-{smoke,b1n8,b2n4,b2n12,b3kill,b6f,b6q,b6h}.jsonl;
      analyses in artifacts/*-analysis.json + artifacts/b4-compare.json.

## Verdict for the PROTO A/B comparison (central side)

Central per-participant recording WORKS on the deployed stack with zero worker
changes — a pull-only SFU session records what the SFU delivers, files are clean,
100 % decodable, and participant death costs 95 ms to detect and closes a valid
file. But it carries four structural costs self-recording does not: (1) studio
downlink scales 0.5-1.1 Mbps × N forever (57-60 Mbps at 54 heads, 8× the tiered
grid's live budget); (2) a single recorder page quality-degrades between 8 and 12
tracks (sharding required); (3) any participant churn glitches ALL sibling
recordings ~150 ms; (4) the archive is a decode+re-encode of what the network
delivered — lossless-looking on synthetic content (54.7 dB) but it inherits every
SFU freeze verbatim (the N=12 3.1 s hole) and will pay generation loss on camera
content, where self-recording archives the pristine source.
