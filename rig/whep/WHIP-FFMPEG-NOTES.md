# ffmpeg WHIP → Cloudflare Stream interop (open question 3)

Question: does ffmpeg 9.0.1's WHIP muxer interoperate with Cloudflare Stream WHIP
ingest, given the suspected `profile-level-id` mismatch (muxer emits `42001f`/`64001f`,
CF docs specify `42e01f`)? Playback must be verified, not just SDP acceptance.

Reusing live input `whep-rig` uid 224558e8993d5a5efd234d9d3a320f87 (rig/whep/live_input.json).

## Step 0 — setup ✅ (2026-08-25 ~22:2x)

- `ffmpeg -h muxer=whip` (9.0.1): defaults h264+opus; options: handshake_timeout,
  pkt_size 1200, whip_flags dtls_active, authorization, cert/key. No profile knobs.
- ffmpeg 9.0.1 has NO whep demuxer → playback verification will be a minimal
  WHEP HTML page + Playwright 1.60.0 (cached chromium-1223, per NOTES.md Step 2).
- Plan: run 1 = experiment's baseline-profile command + `-re` pacing + `-loglevel debug`
  to a log file, safety `-t 240`; check HTTP status / SDP answer / ICE / bytes climbing;
  then WHEP playback grab while still publishing.

## Step 1 — run 1: baseline profile WORKS FIRST TRY ✅ (22:2x)

Command: `ffmpeg -re -f lavfi -i testsrc2=size=1280x720:rate=30 -re -f lavfi -i
sine=frequency=440 -c:v libx264 -profile:v baseline -level 3.1 -bf 0 -pix_fmt yuv420p
-g 60 -b:v 2000k -c:a libopus -ar 48000 -ac 2 -t 240 -f whip <WHIP_URL>`

- Muxer parsed `profile=66, level=31` from the SPS → offer fmtp:
  `level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f` (NOT 42e01f,
  exactly as plan §3.3 predicted — profile_iop=0x00).
- **Cloudflare ACCEPTED it.** POST → SDP answer returned (~1.4 s latency); the answer
  **echoes `profile-level-id=42001f` verbatim** — CF mirrors the offer's fmtp rather than
  insisting on 42e01f. The 42e01f concern is a docs value, not a negotiation gate.
- Full handshake timeline (muxer's own log): SDP 1502 ms → UDP connect → ICE STUN ok
  (single host candidate 141.101.90.0:1473, ice-lite answer) → DTLS done 2812 ms
  (ffmpeg passive/SSL_accept, CF active) → SRTP_AES128_CM_HMAC_SHA1_80 → muxer state=10.
- Media flowing: libx264 frame counter climbing in real time (876 frames ≈ 29 s in).
- Answer also carried a session Location: `<publish URL>/<session-id>` (DELETE target).
- Full debug log: logs/whip-ffmpeg-run1-baseline-debug.log.gz; verbatim SDPs in
  artifacts/whip-ffmpeg-offer-baseline.sdp / whip-ffmpeg-answer-baseline.sdp.
- Next: WHEP playback verification while still publishing (minimal player + Playwright).

## Step 2 — playback VERIFIED for run 1 ✅ (23:16)

- Minimal WHEP page (recvonly video+audio → <video>) + Playwright 1.60.0
  channel:'chromium' headless, served on :8896 (scratchpad only; server stopped after).
- WHEP POST → **HTTP 201**, answer applied, frames decoded: 99 → 174 two seconds
  later, 1280x720 @ 30 fps, bytesReceived climbing (1.27 MB → 1.88 MB).
- Screenshot shows the exact testsrc2 pattern with its burned counter at
  `00:01:39.800 / frame 2994` ≈ ffmpeg's elapsed runtime → this IS the ffmpeg stream,
  decoded end-to-end. Saved: artifacts/whip-ffmpeg-frame.png.
- Curious detail: Chrome's WHEP leg negotiates fmtp `profile-level-id=42e01f`, yet the
  incoming bitstream is ffmpeg's baseline 42001f — CF forwards without transcoding
  (frames arrive in <2 s of joining) and Chrome decodes regardless of fmtp mismatch.
- Run 1 stopped by SIGINT (only my pid, matched by whep-rig uid in cmdline). On
  teardown the muxer DOES send the WHIP `DELETE <publish>/<session-id>` but logs
  "Failed to read response / Failed to dispose resource, ret=-5" — cosmetic.

## Step 3 — run 2: DEFAULT profile (High, 64001f) also works ✅ (23:17)

- Same command minus `-profile:v/-level` → libx264 High: muxer parses
  `profile=100, level=31`, offers `profile-level-id=64001f`. CF answer echoes
  `64001f` verbatim; handshake to state=10 in 2.4 s. So CF's ingest matches
  leniently — 42e01f in the docs is not a gate; no h264_metadata bsf needed.
- Playback re-verified against run 2: HTTP 201, 122 → 185 frames decoded, 720p30,
  0 packets lost; screenshot counter `00:00:32.067 / frame 962` = fresh session.
  Stats: artifacts/whip-ffmpeg-whep-stats-run2.json.
- Clean `-t 45` exit: code 0, 11017 KiB video + 591 KiB audio sent, 0.97x realtime
  (encode+pace kept up). Same benign DELETE-response warning on normal exit.
- Log: logs/whip-ffmpeg-run2-high-verbose.log.gz.

## Verdict

✅ **ffmpeg 9.0.1's WHIP muxer interoperates with Cloudflare Stream WHIP ingest
out of the box — no workarounds.** Baseline (42001f) and High (64001f) both accepted
and both playback-verified via WHEP in Chrome. The plan §3.3 "possible WHIP blocker"
is CLOSED: the muxer indeed cannot emit 42e01f, and it does not matter — Cloudflare
echoes whatever profile-level-id the offer carries.

Working command (verified end-to-end):

```
ffmpeg -re -f lavfi -i testsrc2=size=1280x720:rate=30 \
       -re -f lavfi -i sine=frequency=440 \
       -c:v libx264 -profile:v baseline -level 3.1 -bf 0 -pix_fmt yuv420p -g 60 -b:v 2000k \
       -c:a libopus -ar 48000 -ac 2 \
       -f whip "https://customer-<code>.cloudflarestream.com/<secret>/webRTC/publish"
```

(`-profile:v baseline -level 3.1` optional — default High works too. `-re` needed:
lavfi is unpaced and the muxer does not throttle.)

m2m implication: a non-browser process CAN publish into the same WebRTC path as
browser participants — studio ffmpeg/relay → WHIP → CF → WHEP works today with
stock homebrew ffmpeg. Handshake cost ≈ 2.4–2.8 s (SDP POST ~1.1–1.4 s + ICE + DTLS).

Cleanup: live input whep-rig LEFT in place (as instructed); :8896 server stopped;
no stray ffmpeg (verified pgrep by uid). Machine changes: none.
