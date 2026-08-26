# elektron-rtc build notes

Working log for the phase-2 signaling worker (RtcRoom DO + SFU proxy + snapshot tiles).
Spec: plan-m2m.md §3; template: workers/cues (deployed, untouched).

## Checkpoints

- **2026-08-26 07:14** — Context read (plan-m2m.md, workers/cues/src/index.js, proto/m2m/server.py).
  Tooling verified: node v25.9.0 (global WebSocket — no ws dep needed), wrangler 4.75.0 (homebrew),
  auth OK via `CLOUDFLARE_API_TOKEN` = `CF_API_TOKEN` from .env (same path the cues deploy used;
  account cached in workers/cues/.wrangler/cache). Created workers/rtc/. Next: source.

- **2026-08-26 07:16** — Source written: `src/index.js` (RtcRoom DO + /cf/ proxy + /tile/ store),
  `wrangler.jsonc` (DO binding ROOMS→RtcRoom, migration v1 new_sqlite_classes, app id as var).
  ROOM_TOKEN generated (openssl rand -hex 16) and appended to .env (confirmed gitignored).

- **2026-08-26 07:18** — **DEPLOYED**: https://elektron-rtc.kristjan-jansen.workers.dev
  (version b8842387). DEPLOYED.md written immediately for the polling UI agent.
  **Auth gotcha found**: `CLOUDFLARE_API_TOKEN=$CF_API_TOKEN` fails (code 10000 — that token has
  no Workers-write scope; it's the Stream/API token), AND merely `source`-ing .env breaks wrangler
  because it honors the legacy `CF_API_TOKEN` env var name. The cues deploy path was the machine's
  **OAuth login** (~/Library/Preferences/.wrangler/config/default.toml, kristjan.jansen@gmail.com).
  Rule: run wrangler with a clean env (no .env sourced), OAuth does the rest.

- **2026-08-26 07:20** — Secrets set via OAuth: CF_REALTIME_APP_SECRET, ROOM_TOKEN (values from
  .env, extracted per-key with grep so CF_API_TOKEN never enters the environment). A TEST_PROBE
  secret used to isolate the auth failure was deleted. `wrangler secret list` shows exactly the
  two intended secrets. Next: smoke tests, then the measurement pass.

- **2026-08-26 07:20** — Smoke tests green: 403 without token on /cf/ and tile POST; 201 from
  /cf/sessions/new with token (0.38 s incl. TLS).

- **2026-08-26 07:21** — **Full verification + measurement pass green, first run** (node v25
  global WebSocket, no deps; script + raw JSONL in the session scratchpad, verify-rtc.mjs /
  verify-results.jsonl; room `verify-mt9l6a9l`):
  - join→roster p50 33.3 / p95 63.5 ms (n=10); WS connect p50 127 ms. Roster shape verified
    (self, participants[], perm).
  - publish→peer `published` one-way p50 38.3 / p95 49.1 ms (n=20) — cues-class, as predicted.
  - ping→pong autoresponse RTT p50 34.1 ms — identical to the cues 32–38 ms band (no DO wake).
  - perm + promote broadcasts verified end-to-end (operator → audience client).
  - **SIGKILLed publisher → `left` at survivor: 37.7 / 45.0 / 54.3 ms** (n=3). This is THE number
    replacing the 31–47 s SFU GC as death detection — ~1000× faster. Caveat: SIGKILL still sends
    a TCP FIN (crashed-process case); a true network vanish (no FIN) would wait on the CF edge's
    TCP/keepalive timeout instead — different, larger number, unmeasured here.
  - SFU proxy full handshake: sessions/new 201 (proxy→SFU 239 ms), tracks/new with a REAL saved
    browser offer (proto/m2m artifacts) → 200 + `answer` SDP (2540 B), zero track errors. The
    test session carries no media and the SFU GCs its tracks after 30 s — nothing persists.
  - Tiles: POST 12 KB → 200 (86 ms); GET fresh = colo-cache hit (**Cache API DOES work on
    workers.dev** — the fallback wasn't needed, but at +7.5 s, past the 6 s TTL, the DO-latest
    fallback served with age 7708 ms, exactly as designed). `Cache-Control: max-age=2` on every
    GET. 413 >64 KB, 415 non-JPEG, 403 unauthenticated POST.
  - DEPLOYED.md updated with the measured table; protocol unchanged by verification.

- **2026-08-26 09:47** — **Cue-log added (additive), redeployed** (version 53ab064b, clean-env
  OAuth path as above). Cue frames are persisted per room after broadcast (broadcast-first, the
  50 ms lesson): `{from, cue, doRecvTs}`, capped 1000/room; new route `GET /room/{name}/cuelog`
  (token) proxies to the DO. Sender stamps inside `cue` stored VERBATIM — DO clock is frozen
  during execution and marked untrusted for timing. Verified: node WS smoke (join → cue →
  broadcast → cuelog shows it; 403 without token) AND a headless grid.html participant reached
  phase=running with framesSent>0 against the redeployed worker (existing protocol intact).
  Consumer: proto/replay (synced VOD replay with cues — see proto/replay/README.md).

## Residue / open notes

- The verify room's DO instance (`verify-mt9l6a9l`) retains a few KB of roster/tile storage;
  harmless, free-plan SQLite DO. No other CF resources created beyond the worker + 2 secrets.
- Tile GET polling at show scale will hammer the DO only on colo-cache misses; production should
  move tiles to R2/KV (commented in source) — free-plan request budget is the real ceiling.
- Auth rule for future deploys: NEVER source .env into wrangler's environment (it honors legacy
  `CF_API_TOKEN`, which is not Workers-scoped) — clean env + machine OAuth login is the path.
