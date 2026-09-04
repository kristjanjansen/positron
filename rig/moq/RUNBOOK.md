# MoQ on Cloudflare — Runbook (draft, in progress)

Status: COMPLETE (session 2, 2026-08-25 evening). Headline: **draft-14 public relay works with
NO auth — end-to-end publish/subscribe verified, one-way pub→relay→sub p50 17.9 ms** (§3.6/§3.7).
draft-16 binaries built and auth-rejection verified; blocked only on the human dashboard step (§3).
Provenance marks: ✅ verified here / 📄 documented / ⚠️ inferred.

## 0. Local machine facts (✅ verified 2026-08-25)

- ffmpeg 9.0.1 (brew, `ffmpeg`), ffmpeg@7 keg-only at `/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg`
- mediamtx v1.20.1 at `/opt/homebrew/bin/mediamtx` (ships a MoQ listener — ✅ speaks MoQT
  drafts 16–19, see §5.5; enabled by default on :8892/:8893 with the repo-root `auto.crt`/`auto.key`)
- node, python3 present; no go toolchain.
- ✅ **CORRECTION (2026-08-25, session 2): rust IS on this machine.** Earlier "no rust/cargo" was
  wrong — `cargo`/`rustc` are simply not on the default PATH. Homebrew's `rustup` 1.29.0 was
  installed **2026-05-28** (predates this project — pre-existing, NOT a change by us) with a
  stable toolchain: **rustc/cargo 1.96.0** (2026-05-25). Proxies live at
  `/opt/homebrew/opt/rustup/bin/{cargo,rustc}`; toolchain at `~/.rustup`, crate cache `~/.cargo`.
  **No rustup.rs installer was run and no machine change was made for the MoQ work** — builds use
  `PATH="/opt/homebrew/opt/rustup/bin:$PATH" cargo …`. (If ever removing rust entirely:
  `brew uninstall rustup && rm -rf ~/.rustup ~/.cargo`.)
- Established (from plan.md, prior sessions):
  - ✅ `draft-16.cloudflare.mediaoverquic.com` → 162.159.207.2; draft-14 → .5; draft-18 NXDOMAIN.
  - 📄 FETCH and GOAWAY unimplemented → live-edge fan-out only.
  - 📄 Auth = bearer token in URL path; tokens shown once at creation.
  - ✅ API `/moq/relays` returns 403 for our token (unpublished permission group) → dashboard-only provisioning.

## 1. The blog post

📄 **"An API for MoQ: provision your own isolated relays"** — https://blog.cloudflare.com/moq-relays/
Published **2026-07-31** (datePublished 2026-07-31T13:00Z). Authors: Jacob Curtis, Manish Pandit, Mike English
(per search snippet; page metadata omits authors).

Summary (✅ read in full 2026-08-25):
- Adds **isolation + access control** on top of last year's open MoQ relay network: a provisioning API
  creates an *isolated relay* (a namespace/auth scope, **not** dedicated infrastructure) live across
  Cloudflare's network within seconds.
- **Tokens** are minted per relay with `operations`: `["publish"]`, `["subscribe"]`, or both; optional
  `label` and `expires_at`; individually revocable. For now a token applies to the *whole relay*
  (finer schemes tracked in IETF `draft-englishm-moq-cdn-provisioning`). Token rides in the **URL path**.
- Supports MoQ Transport **draft-14 and draft-16** with auth; endpoint
  `https://draft-16.cloudflare.mediaoverquic.com/<token>` (matches our DNS findings).
- Draft-16 niceties called out: `PUBLISH` (push tracks before any subscriber) and
  `SUBSCRIBE_NAMESPACE` (subscribe to all tracks under a namespace, incl. future ones).
- **Free at any scale during beta; API will change** — check developer docs for breaking changes.
- Canonical publish/subscribe example uses **cloudflare/moq-rs** (`moq-pub` / `moq-sub`) + ffmpeg/ffplay:

```bash
# Publish (from the blog post, verbatim shape):
ffmpeg -stream_loop -1 -re -i input.mp4 \
  -f mp4 -movflags empty_moov+frag_every_frame+separate_moof+omit_tfhd_offset - \
  | moq-pub -- --name my-namespace "https://draft-16.cloudflare.mediaoverquic.com/<publish_token>"

# Subscribe:
moq-sub --name my-namespace "https://draft-16.cloudflare.mediaoverquic.com/<subscribe_token>" \
  | ffplay -hide_banner -an -
```

Links the post contains: developers.cloudflare.com/moq, developers.cloudflare.com/api/resources/moq,
github.com/cloudflare/moq-rs, draft-ietf-moq-transport-16, draft-englishm-moq-cdn-provisioning,
blog.cloudflare.com/moq/ (2025 original), dash.cloudflare.com, moq@cloudflare.com, CF Discord.

## 2. Resources visited

| Resource | Takeaway (all 📄 unless marked) |
|---|---|
| https://blog.cloudflare.com/moq-relays/ | The announcement (2026-07-31). See §1. |
| https://developers.cloudflare.com/moq/ | draft-14 + draft-16 live, **draft-18 in development**; token in URL path (logs warning → short-lived per-client tokens recommended); dashboard path Media > Realtime > MoQ Relay; canonical clients = moq-rs `moq-pub`/`moq-sub`; has a Feature Matrix subpage; full index at /moq/llms.txt |
| https://github.com/cloudflare/moq-rs | **Main branch implements draft-16** (branches: draft-14 maintenance, draft-18-dev). Binaries: `moq-pub`, `moq-sub`, `moq-clock-ietf`, `moq-relay-ietf`. Explicitly: **FETCH and GOAWAY not supported**. Fork of kixelated/moq-rs by Luke Curley, now CF-maintained, IETF-aligned (vs kixelated's moq-lite divergence). Build = standard cargo; `./dev/relay|pub` scripts; `--tls-disable-verify` for local. This is *the* client for us. |

| https://developers.cloudflare.com/moq/index.md | ✅ fetched raw. Relay creation returns **relay ID + two default tokens** (one pub+sub, one sub-only), secrets shown once, never stored. Docs' command shape: `moq-pub --name my-namespace "<url>"` (no `--` separator — the blog's `moq-pub -- --name` is a cargo-run artifact). draft-14 endpoint listed *without* token (draft-14 has no auth; draft-16 *requires* it). draft-18: test via `github.com/englishm/moq-interop-runner`, global deploy pending. Future in-band auth: IETF C4M + Privacy Pass for MoQ drafts. |
| https://developers.cloudflare.com/moq/feature-matrix/index.md | ✅ fetched raw, dated 2026-07-31. **Draft-16 supported**: SUBSCRIBE(+OK/ERROR), UNSUBSCRIBE, PUBLISH(+OK), SUBSCRIBE_NAMESPACE(+OK/ERROR), UNSUBSCRIBE_NAMESPACE, TRACK_STATUS(+OK), SETUP. Partial: MAX_REQUEST_ID, REQUESTS_BLOCKED (logged only). **Unsupported: GOAWAY, SUBSCRIBE_UPDATE, PUBLISH_ERROR, FETCH/FETCH_OK/FETCH_ERROR/FETCH_CANCEL, TRACK_STATUS_ERROR** — confirms live-edge-only. Draft-14 similar minus namespace-subscribe messages. |
| https://blog.cloudflare.com/moq/ | Original launch post 2025-08-22: relay on 330+ cities, Durable Objects for namespace registration/subscriber routing, launched at draft-07 SUBSCRIBE-only. Ecosystem links: moq.dev/publish (kixelated demo — moq-lite world, NOT draft-16), imquic (Lorenzo Miniero), Meta Moxygen, moq-js, Norsk, Vindral. Historical context only. |

(table grows below as more resources are visited)

## 3. Dashboard provisioning (human steps)

📄 Compiled from developers.cloudflare.com/moq + the blog post (§1/§2); the dashboard flow itself
could not be exercised here (no dashboard access from this session; API returns 403 — §0).
This is the ONLY way to create a relay until Cloudflare publishes the MoQ API permission group.

1. Log in at **https://dash.cloudflare.com** and select account
   **`dc1ee8d72a1fb7da857c46479a8503b8`** (the account this project's Stream/Realtime resources
   live in — the relay must be in the same account only for tidiness; MoQ is its own surface).
2. In the left sidebar go to **Media → Realtime → MoQ Relay** (docs name this exact path; the
   Realtime section is the one that already holds the "flabbergaster" Calls app).
3. Click **Create relay** (beta — free at any scale during beta). Give it a recognisable name,
   e.g. `positron-rig`.
4. **The creation screen is shown ONCE and secrets are never retrievable again.** It returns:
   - the **relay ID**,
   - **two default tokens**: one with `publish+subscribe` operations, one `subscribe`-only.
   Copy all three **before leaving the page**.
5. Save them into `/Users/s32863/personal/positron/.env` (already chmod 600, gitignored) as:
   ```
   MOQ_RELAY_ID=…
   MOQ_TOKEN_PUBSUB=…   # publish+subscribe default token
   MOQ_TOKEN_SUB=…      # subscribe-only default token
   ```
   ⚠️ Do NOT paste them into chat (the Stream API token from this project still needs rotation
   for exactly that mistake).
6. Tokens ride in the **URL path**: `https://draft-16.cloudflare.mediaoverquic.com/<token>`.
   📄 Docs warn URLs land in access logs → for anything shared, mint additional **short-lived
   tokens** (dashboard: relay → tokens → create; fields: `operations` = publish/subscribe,
   optional `label`, optional `expires_at`; individually revocable). A token currently scopes to
   the whole relay — there is no per-namespace auth yet.
7. Nothing else to configure: the relay is "live across Cloudflare's network within seconds" of
   creation; there are no regions, tiers, or capacity knobs during beta.

## 3.5 Building moq-rs on THIS machine — blocked natively, works in Docker

- ✅ `cargo build --release -p moq-pub -p moq-sub -p moq-clock-ietf` (main branch, cargo 1.96.0)
  fails: every freshly linked build-script binary dies with **SIGKILL** (`lock_api`,
  `parking_lot_core` build scripts, exit 101 after ~2–20 s).
- ✅ Root cause isolated with a 1-line C program: `cc t.c -o t && ./t` → **exit 137 (SIGKILL)**.
  **ThreatLocker** (running: system extension `com.threatlocker.app.agent`, PID 559) kills ANY
  unapproved freshly compiled native binary — same mechanism that killed OBS (plan.md §15).
  **Compiling rust (or C, or go) natively on this machine is a hard blocker. No bypass attempted**
  (per standing rule). Approved-path binaries (brew ffmpeg/mediamtx, rustup toolchain) run fine —
  the *compiler* runs; its *output* is killed.
- ✅ Pivot: **Docker 28.5.2 is installed, daemon up (linux/aarch64)** — build and run the MoQ
  clients inside a Linux container; QUIC/UDP egress via Docker NAT. This is the documented,
  repeatable recipe for this rig (§4).

## 3.6 KEY EXPERIMENT — draft-14 public endpoint, NO AUTH: ✅ WORKS

✅ 2026-08-25 ~19:07 UTC. `moq-clock-ietf` (draft-14 branch `c8e176b`, built in Docker) publish +
subscribe against **`https://draft-14.cloudflare.mediaoverquic.com`** — **no token, no account,
nothing**. Both sides: `connected with CID: …` (QUIC + MoQT session established), 44/44 ticks
delivered pub→relay→sub. The docs listing the draft-14 endpoint without a token are correct:
**draft-14 is a genuinely open, unauthenticated public relay** (the pre-2026 open network, still up).

✅ **Latency, one-clock method** (pub and sub both inside the same Docker VM → zero clock error;
each process's stdout timestamped by `perl Time::HiRes` at line-print):
- **steady state: p50 17.9 ms, p95 61 ms** one-way pub→CF edge→sub (n=41, 40 s run)
- min 12.6 ms — barely above a bare RTT/2 to the edge; the relay adds almost nothing
- ⚠️ caveat: tick granularity is 1 s and the publisher prints just after write — the method
  measures write→deliver of a tiny object, not media pipeline latency
- ✅ **join catch-up finding**: the first 4 ticks (published before the subscriber joined) arrived
  in a burst at join with 1.1–3.1 s apparent "latency" — the relay replays the OPEN subgroup from
  its beginning on join (moq-clock uses one subgroup per minute). So "live-edge only" means no
  FETCH of *closed* groups; the current open group IS delivered from its start. For media this is
  what makes mid-GOP join workable.
- Method quirk hit: `kill %pipeline` kills perl (last pipe member), moq-clock then panics a tokio
  worker on Broken pipe but the process lives → `wait` hangs. Kill the moq binaries by name, or
  timestamp inside the consumer.

## 3.7 Media end-to-end over the public draft-14 relay: ✅ WORKS

✅ 2026-08-25 19:12 UTC, 30 s run: ffmpeg (lavfi testsrc2 640x360@30 h264 zerolatency + aac,
fMP4 with the blog's `-movflags empty_moov+frag_every_frame+separate_moof+omit_tfhd_offset`)
→ `moq-pub` → `draft-14.cloudflare.mediaoverquic.com` (no token) → `moq-sub` → file → ffprobe:
**valid `mov,mp4` container, h264 640x360 + aac, duration 34.9 s** (30 s window + open-group
catch-up replay — same join behaviour as §3.6). ~5.2 MB received ≈ encode bitrate; zero stderr
errors on either side. moq-pub maps each GOP (1 s, `-g 30`) to a MoQ group; 43-44 objects/subgroup
(30 video frags + audio frags).

Traps hit (both now handled in `test-draft14-inner.sh`):
- ⚠️ draft-14 `moq-sub` writes **tracing logs to STDOUT**, interleaving ANSI text into the mp4
  byte stream → `Invalid data found when processing input`. Fix: `RUST_LOG=off` (the
  `tracing_subscriber::fmt()` default writer is stdout on this branch).
- In `a | b &`, `$!` is b's PID — killing it leaves the moq binary running and a panicked-worker
  process that never exits; `pkill` the binaries by name.

## 4. Publish / subscribe commands

All commands run in Docker (native builds are killed by ThreatLocker — §3.5). One-time setup
(✅ done, repeatable):

```bash
cd /Users/s32863/personal/positron/rig/moq
docker build -t moq-dev -f Dockerfile.moq-dev .            # rust:1-bookworm + ffmpeg
# draft-14 worktree: git -C moq-rs fetch origin draft-ietf-moq-transport-14:refs/remotes/origin/draft-ietf-moq-transport-14
#                    git -C moq-rs worktree add ../moq-rs-draft14 origin/draft-ietf-moq-transport-14
docker run --rm -v "$PWD":/moq -v moq-target14:/target -e CARGO_TARGET_DIR=/target \
  -w /moq/moq-rs-draft14 moq-dev cargo build --release -p moq-pub -p moq-sub -p moq-clock-ietf   # ✅ 52 s
docker run --rm -v "$PWD":/moq -v moq-target16:/target -e CARGO_TARGET_DIR=/target \
  -w /moq/moq-rs         moq-dev cargo build --release -p moq-pub -p moq-sub -p moq-clock-ietf   # ✅ 57 s
```

⚠️ After the Mac sleeps, the Docker VM clock lags by hours (seen: 8.5 h — broke apt with
"Release file not valid yet" and would break TLS/measurement). Fix without restarting Docker:
`docker run --rm --privileged busybox date -u -s "$(date -u '+%Y-%m-%d %H:%M:%S')"`.

### 4.1 draft-14 (public, NO token) — ✅ verified working

```bash
# canned tests (clock latency / media e2e):
docker run --rm -v /Users/s32863/personal/positron/rig/moq:/moq -v moq-target14:/target \
  moq-dev bash /moq/test-draft14-inner.sh clock 40
docker run --rm -v /Users/s32863/personal/positron/rig/moq:/moq -v moq-target14:/target \
  moq-dev bash /moq/test-draft14-inner.sh media 30

# raw shapes (inside the container; binaries at /target/release):
ffmpeg -re -f lavfi -i "testsrc2=size=640x360:rate=30" -f lavfi -i "sine=frequency=440" \
  -c:v libx264 -preset veryfast -tune zerolatency -bf 0 -g 30 -pix_fmt yuv420p -c:a aac -b:a 64k \
  -f mp4 -movflags empty_moov+frag_every_frame+separate_moof+omit_tfhd_offset - \
  | moq-pub --name <namespace> "https://draft-14.cloudflare.mediaoverquic.com"
RUST_LOG=off moq-sub --name <namespace> "https://draft-14.cloudflare.mediaoverquic.com" \
  | ffplay -hide_banner -an -           # or > dump.mp4 && ffprobe dump.mp4
moq-clock-ietf --publish --namespace <ns> "https://draft-14.cloudflare.mediaoverquic.com"   # pub
moq-clock-ietf --namespace <ns> "https://draft-14.cloudflare.mediaoverquic.com"             # sub
```

### 4.2 draft-16 (requires relay + token from §3) — built ✅, blocked on dashboard step 📄

Same shapes, main-branch binaries (volume `moq-target16`), token in the URL path:

```bash
… | moq-pub --name <namespace> "https://draft-16.cloudflare.mediaoverquic.com/<publish_token>"
moq-sub --name <namespace> "https://draft-16.cloudflare.mediaoverquic.com/<subscribe_token>" | ffplay -an -
moq-clock-ietf --publish --namespace <ns> "https://draft-16.cloudflare.mediaoverquic.com/<pub_token>"
```

✅ Auth IS enforced on draft-16 (probed 2026-08-25): with **no token** the session is cleanly
rejected — `webtransport session closed: code=3 reason="scope resolution failed"`; with a
**garbage token** the connection dies mid-setup with `decode error: fill buffer` (no clean MoQT
error). Expect the former error shape whenever a token is missing/expired/revoked.

## 5. Open risks / unknowns

1. ⚠️ **The draft-14 relay is open to the world and auth-free — treat it as a test bench, not a
   transport.** Anyone who knows/guesses a namespace can subscribe to (or squat/publish over) it;
   there is also no stated SLA and it predates the provisioning product — Cloudflare could turn it
   off or bolt auth onto it at any time. Production = draft-16 isolated relay + tokens (§3).
2. 📄 **Token-in-URL** (draft-16): the bearer token rides the URL path and lands in access logs on
   any middlebox/proxy that sees the URL. Docs themselves recommend short-lived per-client tokens.
   Mint per-session tokens with `expires_at`; never bake the default pub+sub token into a client.
3. 📄 **No FETCH, no GOAWAY** (both drafts, confirmed by the feature matrix): live-edge only — no
   rewind, no catch-up from cache, and no graceful relay drain signal. ✅ BUT measured (§3.6): the
   *currently open* group IS replayed from its start on join, so join-at-GOP-boundary works; a
   viewer can never fetch a *closed* group though. For the resilience story this means: on any
   client reconnect you lose everything before the current group — the gapless-relay trick (hold
   the session open) matters MORE on MoQ than on LL-HLS, and there is no equivalent of the stale-
   manifest window to paper over restarts. GOAWAY absence ⇒ relay maintenance = hard session drop.
4. 📄 **draft-18 timeline**: `draft-18.cloudflare.mediaoverquic.com` is NXDOMAIN today; docs say
   "in development", testable only via `englishm/moq-interop-runner`. moq-rs has a `draft-18-dev`
   branch and an IETF-side `me/draft-18`. Expect a breaking migration (16 → 18) during beta; the
   API "will change" warning is explicit.
5. ✅ **mediamtx 1.20.1 speaks MoQT drafts 16–19** (binary strings: subprotocol list
   `moqt-16…moqt-19`; embedded web client pins `moqt-19`; in-house implementation at
   `internal/protocols/moq/`, incl. an `authorization_token` parameter and a `moqt://` pull
   source with `moqTransport: quic|webtransport`). Draft-16 overlap with Cloudflare means
   mediamtx↔CF interop is *plausible* (mediamtx as local origin pulling/pushing CF) — ⚠️ untested;
   likely friction: CF wants the token as the URL *path* while mediamtx maps URL path → stream
   path, and mediamtx's supported message subset vs CF's (no FETCH is fine; PUBLISH vs
   ANNOUNCE-style flows may not line up). Worth one experiment after a relay exists.
6. ✅ **This machine cannot compile anything natively (ThreatLocker)** — all MoQ tooling must run
   in Docker (recipe in §4). Consequences: QUIC goes through Docker Desktop NAT (adds ~nothing:
   12.6 ms min one-way measured), and browser-side MoQ tests would need WebTransport in a real
   browser, which is unaffected. Also ⚠️ the Docker VM clock drifts hours behind after laptop
   sleep — resync before any measurement (§4).
7. ⚠️ **Latency numbers here are for a 100-byte object, not video**: p50 17.9 ms pub→relay→sub.
   Real media latency adds encode + GOP structure + player buffering; the 1 s-GOP media run
   delivered continuously (subgroup-per-GOP streamed object-by-object, ~43 objects/s observed),
   so sub-100 ms transport for media is credible but **unmeasured** — burn-in + OCR through the
   MoQ path is the next experiment once a draft-16 relay exists.

## 6. Browser spike — CAN a browser talk to CF's IETF-MoQT relay? ✅ YES (draft-14, measured)

✅ 2026-08-26 ~05:01 UTC, time-boxed spike (~25 min active). **Answer: YES — kixelated's
`@moq/net` (npm, v0.3.3, the "moq-lite" JS client) negotiated genuine IETF moq-transport-14
with `draft-14.cloudflare.mediaoverquic.com` from headless Chrome and received live track data.**
The earlier repo-research conclusion "moq-lite ≠ IETF MoQT" is **stale**: the packages moved to
the `@moq` npm scope and now ship a full IETF adapter (`@moq/net/ietf/`) covering **DRAFT_14
(0xff00000e) through DRAFT_19 (0xff000013)** alongside moq-lite.

### 6.1 Inventory (what browser clients exist for IETF MoQT)
- **`@moq/net` + `@moq/hang` (kixelated/moq-dev)** — moq-lite AND IETF drafts 14–19. README
  claims "moq-lite works with any moq-transport CDN (ex. Cloudflare)"; code even special-cases
  `mediaoverquic.com` in a `NO_DISCOVERY_HOSTS` list (CF lacks SUBSCRIBE_NAMESPACE on 14). ← tested.
- facebookexperimental/moq-encoder-player — IETF but **pinned to draft-18 ALPN `moqt-18`**; CF has
  no draft-18 endpoint (NXDOMAIN) → unusable against CF today.
- englishm/moq-interop-runner — lists 13 implementations; the ONLY browser-capable one is
  kixelated's ("moq (moq-dev, JS)"); runner itself is CLI/Docker-oriented.
- mediamtx embedded web client — pins `moqt-19` (§5.5) → can't talk CF's 14/16.

### 6.2 How the compat actually works (from `@moq/net` source, verified on the wire)
- WebTransport connect offers subprotocols `lite-05…lite`, `moqt-19…moqt-15`. CF draft-14
  negotiates **none** → client falls back to a "compat" bidi stream whose first varint,
  `StreamId.ClientCompat = 0x20`, **is byte-identical to draft-14's CLIENT_SETUP message type**;
  the CLIENT_SETUP offers versions `[lite-02, lite-01, DRAFT_14 (0xff00000e)]` and the server
  picks. CF picked draft-14 → full `Ietf.Connection`. (draft-15/16 use the same SETUP path with
  ALPN pinning; 17+ use uni-stream SETUP type 0x2F00.)
- So: **moq-lite's hello is deliberately forward-compatible with IETF draft-14+ — the conflict
  is resolved in favor of "compatible", by construction, not accident.**

### 6.3 The test (repeatable)
Scratch at `rig/moq/spike/` (npm: `@moq/net @moq/hang esbuild zod`; page `www/index.html` +
bundle `www/test.js` from `src/test.js`; `server.py` = static server + POST /log collector on
:8892; results in `spike/browser.log`). ⚠️ esbuild's native binary is SIGKILLed by ThreatLocker
(§3.5) — bundle inside Docker: `docker run --rm -v "$PWD":/s -w /s node:20-alpine sh -c
"npx --yes esbuild src/test.js --bundle --format=esm --outfile=www/test.js"`.
Publisher: detached container `docker run -d --rm --name moq-spike-pub -v moq-target14:/target
moq-dev timeout 240 /target/release/moq-clock-ietf --publish --namespace moq-spike-x9
"https://draft-14.cloudflare.mediaoverquic.com"`. Browser: headless Chrome
(`--headless=new --user-data-dir=<scratch>/moq-spike-udd`) at `http://127.0.0.1:8892/?ns=moq-spike-x9`.
Client code: `Connection.connect(url, {websocket:{enabled:false}})` → `conn.consume(Path.from(ns))`
→ `.subscribe("now")` → `nextGroup()`/`readString()`. (moq-clock defaults: namespace `clock`,
track `now`; we used `--namespace moq-spike-x9`.)

### 6.4 Result (browser.log, 2026-08-26 05:01:35 UTC)
- `CONNECTED ms=125 class=Connection version=moq-transport-14` — WebTransport + MoQT SETUP in
  **125 ms** from page load, negotiated version string `moq-transport-14`.
- SUBSCRIBE accepted; `GROUP seq=1` delivered base frame `"2026-08-26 05:01:"` + catch-up burst
  of ticks 22–34 in one flush at join (same open-subgroup replay as §3.6), then **live tick "35"
  one second later**. 15/15 frames read, zero errors, page total < 2 s.
- ⚠️ No new latency number: publisher (Docker VM clock, resynced at 1 s granularity) vs browser
  (host clock) differ by up to ±1 s — cross-clock deltas are meaningless here. §3.6's one-clock
  p50 17.9 ms remains the transport latency reference; this spike proves *function*, not speed.
- Traps hit: macOS has no `timeout(1)` (use background+poll+pkill); a `docker run | head -N`
  pipeline detaches the container when head exits — it keeps publishing and a second publisher
  on the same namespace then dies (exit 1). Kill by container name.

### 6.5 Verdict for plan-m2m §1.C
**"A browser CAN speak IETF MoQT to Cloudflare today: kixelated's `@moq/net` (moq-lite JS)
negotiates draft-14 via its compat SETUP (CLIENT_SETUP 0x20 offering 0xff00000e) and receives
live objects over WebTransport — 125 ms to session, subscribe + data verified. moq-lite vs IETF
is NOT a blocker at the transport layer."** Caveats: (a) draft-14 only until we have a draft-16
relay+token — the client also carries ALPN `moqt-16`, so draft-16 should work but is UNTESTED
(blocked on §3 dashboard step); (b) transport ≠ media: `@moq/hang`'s player expects moq-lite's
hang catalog, while draft-14 `moq-pub` publishes moq-catalog/fMP4 — media-format interop in the
browser is the next spike (likely needs our own catalog/track handling on top of `@moq/net`);
(c) no SUBSCRIBE_NAMESPACE on CF → `announced()` hangs; consume by exact path only.

## 7. Media-layer spike — can VIDEO reach a browser through CF MoQ today?

⏱ START 2026-08-26 08:06 EEST (05:06 UTC). Time-box ~60 min active. (section owned by the media-layer spike agent; in progress)

### 7.0 Setup discovered before any experiment
- **`@moq/hang` 0.4.2 is NOT a batteries-included player/publisher** — it exports only
  `Catalog` (zod schema of the hang catalog), `Container` (Legacy varint / CMAF / LOC
  frame formats + a latency-aware `Consumer`), and re-exports of net/signals. The
  WebCodecs capture/render pipeline (the old `<hang-publish>`/`<hang-watch>` elements)
  is not in this npm package. So "hang on both ends" = hand-rolled WebCodecs on both
  sides USING hang's catalog schema + container classes (which IS the hang wire format —
  what matters for interop).
- Hang media-layer conventions (from package source, ✅ read):
  - catalog track name **`catalog.json`** (or DEFLATE `catalog.json.z`); JSON per
    `Catalog.RootSchema`: `{video:{renditions:{<trackName>:{codec, container:{kind:
    "legacy"|"cmaf"|"loc"}, codedWidth…}}}}`.
  - legacy container frame = **microsecond-timestamp varint + raw codec bitstream**;
    new MoQ group per keyframe (`Container.Legacy.Producer`).
  - `Container.Consumer(trackSubscriber, {format, latency})` reorders groups, skips slow
    ones to meet a latency target.

### 7.1 Experiment 1 — hang→CF→hang: ✅ VIDEO WORKS, glass-to-glass p50 26 ms

✅ 2026-08-26 ~05:15 UTC. **Browser→CF-MoQ-relay→browser VIDEO works today**: canvas
(burned-ms binary row, `rig/whep/publish.html` geometry byte-identical) → WebCodecs
**VP8 1280x720@30** (`latencyMode:"realtime"`, 2 Mbps, 1 s GOP) → hang legacy container →
`@moq/net` publish → `draft-14.cloudflare.mediaoverquic.com` (no auth) → second headless
Chrome: subscribe `catalog.json` → parse hang RootSchema → subscribe rendition track →
`Container.Consumer` (latency 0) → VideoDecoder → canvas → row decode. Both Chromes on
the host → one clock, deltas exact.

**Latency, n=2740 decoded frames over 90 s** (`results/moq-media-e1.jsonl`; delta =
decoded-frame-drawn-to-canvas wall time − burned wall time):

| metric | ms |
|---|---|
| p50 | **26.2** |
| p90 | 36.9 |
| p95 | **42.4** |
| p99 | 104.8 |
| min / max (steady) | 16.4 / 477 |

- Sustained ✅ **30.3 fps at 1280x720 for the full 90 s** (STATS every 10 s: 303 frames/10 s
  flat), **0 checksum failures, 0 decode errors, 0 encoder drops**. Only the single first
  frame was join catch-up (1459 ms, open-group replay).
- vs WebRTC (plan.md §2.2: 74 ms p50 / 83 p95 glass-to-glass): **~3x lower p50**. ⚠️ method
  caveat: this rig measures burn→decoded-frame-on-canvas (no display); WHEP's number included
  display (`expectedDisplayTime`). Add ~one vsync (8–16 ms) for a fair comparison → ~35–42 ms
  effective — still comfortably under 74 ms. Coheres with §3.6: transport 17.9 + encode/
  decode/jitter ≈ 26.
- Join-to-first-frame ≈ 1.0 s, dominated by the 2 s catalog republish cadence (below).
- ✅ Ran under heavy host contention (load avg 24→74 on 12 cores mid-run — sibling agents +
  a local k8s stack): percentiles stayed flat. Number is robust, if anything pessimistic.

**Traps that cost the first two runs (each ✅ verified, fixes in `spike/src/`):**
1. **CF draft-14 is live-edge only per GROUP, and a hang-style write-once catalog is a
   closed group** → a late subscriber gets NOTHING on `catalog.json` (15 s timeout; §3.6's
   replay applies to the *open* group only). Fix: republish the catalog every 2 s.
2. **Subscribe-before-announce is rejected, not held**: `SUBSCRIBE error code=4 "not found:
   Track not found"` immediately. `@moq/net` `consume()` is blind (no announce wait on CF —
   no SUBSCRIBE_NAMESPACE on 14) → player needs a retry loop (1 s cadence works).
3. Publisher-side retention: hang's default `trackInfo()` declares a large `latencyMax`
   (FETCH window) → a late join triggers a multi-group replay blast; capped at
   `trackInfo({latencyMax: 2000})`.
4. Headless Chrome session-restore resurrects old spike tabs on a reused `--user-data-dir`
   (two publishers on one namespace) → fresh udd per run.
5. `@moq/net` `group.readFrame()` returns `{payload, timestamp}`, not a Uint8Array.

### 7.2 Experiment 2 — IETF `moq-pub` → hang player: ❌ dies at the catalog layer, exactly

✅ Docker draft-14 `moq-pub` (ffmpeg testsrc2 640x360@30 h264+aac fMP4, §4 shape) publishing
`moq-media-e2-t4x8`. Hang player pointed at it:
- **Failure point: catalog fetch, before any media logic.** Player subscribes
  **`catalog.json`** → CF accepts (SUBSCRIBE_OK) → upstream `moq-pub` has no such track →
  the subscription closes cleanly ~1 s later with **zero groups** (nextGroup → undefined; no
  error code). Retried 20×, identical. Nothing else is ever requested — death before
  track-subscribe, decode, everything.
- What `moq-pub` actually announces (✅ read off the wire by raw `@moq/net` subscribes —
  **the bytes themselves reach the browser fine**):
  - track **`.catalog`** = WARP moq-catalog v1 JSON (`streamingFormat:1`, packaging "cmaf",
    tracks `1.m4s` avc1.64001E + `2.m4s` mp4a.40.2, `initTrack:"0.mp4"`) — 630 bytes,
    delivered in 130 ms;
  - track **`1.m4s`** = one group per GOP, one moof+mdat CMAF fragment per frame (~30
    frames/group, 4.5–13 KB each) — streamed live to the browser without a hitch.
- So the gap is **purely conventions**: catalog track NAME (`catalog.json` vs `.catalog`),
  catalog SCHEMA (hang RootSchema vs WARP), and container declaration (hang expects
  `container.kind` + for CMAF a base64 `init` in the catalog; WARP points at an init TRACK).
  A ~100-line browser shim (read `.catalog`, fetch `0.mp4` init → avcC → VideoDecoder
  description, feed `N.m4s` fragments through hang's `Container.Cmaf`/a demuxer) looks
  entirely feasible — media bytes and transport already interop.

### 7.3 Experiment 3 — hang publisher → IETF `moq-sub`: ❌ mirror image, same layer

✅ While E1's publisher ran: Docker draft-14 `moq-sub --catalog` on the hang namespace.
Wire trace (RUST_LOG=debug): CLIENT_SETUP DRAFT_14 ok → `SUBSCRIBE track=.catalog
filter_type=LargestObject` → **`SUBSCRIBE_OK content_exists=false`** (CF accepts a
subscribe for a track the publisher never offered) → 10 s of silence → relay sends
**`PUBLISH_DONE status_code=0 stream_count=0`** → `moq-sub` exits "media error: closed,
code=0". Default (no --catalog) mode subscribes `0.mp4` → identical. Same single failure
layer, opposite direction: `moq-sub` wants `.catalog`/WARP-CMAF; hang offers
`catalog.json`/legacy. (Also a CF relay datum: an unserved SUBSCRIBE is optimistically
OK'd, then closed with PUBLISH_DONE(0) after ~10 s.)

### 7.4 Verdict (for plan-m2m §1.C) + caveats

**"Browser MoQ VIDEO works TODAY via the hang media layer on both ends through Cloudflare's
draft-14 relay: 1280x720@30 sustained 90 s, glass-to-glass p50 26 ms / p95 42 ms (n=2740) —
~3x lower than WebRTC's 74 ms. The remaining gap is not transport and not media bytes; it is
catalog conventions between ecosystems (hang `catalog.json`/RootSchema/legacy-container vs
IETF-tools `.catalog`/WARP/CMAF-tracks), which kills both interop directions at the
catalog-fetch step and looks shimmable in ~100 lines."**

- ⚠️ draft-16 would change (📄 from §1/§2, untested — no relay token yet): auth required
  (token in URL path); + `SUBSCRIBE_NAMESPACE` → hang's `announced()` discovery works, and
  the subscribe-before-announce race (§7.1 trap 2) gets a clean fix; + `PUBLISH` (push
  tracks) could cut join latency. `@moq/net` already carries ALPN `moqt-16`. NOT "auth
  only" — the namespace-subscribe gain is real for a grid.
- ⚠️ Browser matrix (noted, untested): everything here is Chromium. Safari: WebTransport
  only since 26.4 (plan-m2m §1.C) and WebCodecs codec coverage differs (VP8 decode iffy;
  H.264 the safer cross-browser codec — our pipeline is codec-agnostic, `?codec=` param
  exists). Firefox WebTransport yes, WebCodecs partial. A real product wants H.264 + a
  capability probe.
- ⚠️ This was one machine, one edge, loopback-adjacent network; cross-network numbers TBD.
- ✅ CPU contention during runs: load avg 15–74 on 12 cores (sibling agents + local k8s);
  results unaffected.

### 7.5 Artifacts / additions (all under `rig/moq/spike/` unless noted)
- `src/pub.js`, `src/play.js` (+ bundles `www/pub.js`, `www/play.js`, pages `www/pub.html`,
  `www/play.html`) — the hang-layer publisher/player; player has `?track=&raw` probe mode
  and `?codec=`/`?dur=` params. `server.py` gained an optional port argv (ran on :8891).
- Logs: `e1-firstrun.log` (late-join catalog failure), `e1-secondrun.log` (subscribe-race
  failure), `e2-firstrun.log` (hang-vs-WARP catalog miss), `browser.log` (E2 raw probes),
  `browser-transport-spike.log` (backup of §6's log), `pub-chrome-stderr.log`,
  `play-chrome-stderr.log`.
- Data: `results/moq-media-e1.jsonl` (repo root results/, 2740 rows: t, burned, delta).
- Cleanup ✅: all `moq-media-*` Chrome instances, the `moq-media-e2pub` container and
  spike server killed; Docker volumes untouched; nothing outside §7 + spike/ modified.

⏱ END 2026-08-26 08:23 EEST (05:23 UTC) — ~16 min active.

## 8. Safari test rig — one URL that self-reports the Safari/iPhone MoQ verdict

⏱ 2026-08-26 ~06:20–06:35 UTC. Status: ✅ deployed and Chromium-proven; ✅ desktop Safari
26.6.2 OBSERVED playing live H.264 through it (details below); iPhone awaits the user.

### 8.1 The URL

**https://moq.positron.studio** — open it in Safari (desktop or
iPhone), tap **TAP TO START**. Query overrides: `?relay=`, `?namespace=` (alias `?ns=`),
`?codec=`, `?auto=1` (skip the tap gate), `?log=<url>` (extra POST log collector for rig runs).

The page displays, in large text: WebTransport present? (if not: "Safari/iOS 26.4+ required" +
the UA), `VideoDecoder.isConfigSupported("avc1.42001f")`, CONNECTED + negotiated version,
catalog found, first-frame time, then live fps / frames decoded / decode errors /
glass-to-glass p50+p95 from the burned-ms row ("±device clock offset — approximate on
phones"), and every exception verbatim. Every state change is ALSO beaconed (`POST /beacon`
with UA + stats every 5 s) to the Worker → **`wrangler tail elektron-moq-safari`** (run from
`workers/moq-safari/`, clean env — §NOTES rule) shows any device's session live. That is how
a phone in someone's hand is observed from this machine.

### 8.2 Architecture

- **Publisher (this Mac, long-lived)**: headless Chrome → `rig/moq/spike/www/pub-safari.html`
  (bundle of `spike/src/pub-safari.js`) — canvas 1280x720@30 ("POSITRON MOQ TEST", UTC clock,
  burned-ms binary row, motion blocks) → WebCodecs **H.264 `avc1.42001f` annexb** (baseline —
  the Safari-safe codec; annexb keeps SPS/PPS in-band so the decoder needs NO description)
  → hang legacy container → `@moq/net` → `https://draft-14.cloudflare.mediaoverquic.com`,
  namespace **`positron-safari-test`**. Catalog republished every 2 s (§7.1 trap 1);
  self-heals by page-reload on connection loss. Page served by `spike/pubserver.py` on :8890
  (also collects the publisher's own POST /log into `spike/logs/moq-safari-pub.log`).
- **Player (deployed)**: Worker **`elektron-moq-safari`** (`workers/moq-safari/`) — static
  assets `public/index.html` + `public/play.js` (=`spike/src/safari-play.js` bundled in Docker
  esbuild, §6.3 recipe) + `src/index.js` logging POST /beacon. Zero other CF resources.
- Player retries subscribe-before-announce (§7.1 trap 2), auto-reconnects forever, exposes
  `window.__report` for CDP probes.

### 8.3 ✅ THE SAFARI TRAP FOUND: @moq/net UA-blocks ALL Safari

`@moq/net` v0.3.3 `connection/browser.js` hard-codes `safari: "<0"` (Bowser UA sniff) citing
WebKit bug 319818 ("flow-control window never refills, permanently stalls sessions") → on
every Safari, `connect()` throws `no transport available; WebTransport not supported and
WebSocket is disabled` **without ever trying Safari's real WebTransport** (present since
26.4; detected `true` on Safari 26.6.2). Fix in `safari-play.js`: catch exactly that error
and retry with a self-built `new WebTransport(relay, {protocols:[...same ALPN list...]})`
passed as `connect(url, {transport})` — the library accepts a pre-built session and proceeds
to the draft-14 compat SETUP. ✅ Observed working (8.5). The WebKit-stall risk is exactly what
this rig measures on real devices; the reconnect loop + on-screen counters surface it if it bites.

### 8.4 What Chromium proved against the DEPLOYED URL (✅ measured, 2026-08-26 06:21 UTC)

Headless Chrome 151 at `…workers.dev/?auto=1`, CDP-probed `window.__report`, 65 s run:
connect **102 ms** (moq-transport-14) → catalog avc1.42001f → **first frame 304 ms** after
start → **1935 frames, 30–31 fps flat, 0 decode errors, 0 reconnects**, glass-to-glass
**p50 32–34 ms / steady p95 47–57 ms** vs §7.1's 26 ms VP8 baseline (H.264 encode is
slightly heavier; sane). Whole path validated except Safari itself.

### 8.5 Desktop Safari 26.6.2, this Mac (✅ observed via beacons, NOT guessed)

`open -a Safari '…?auto=1'` (screen possibly locked — nothing visually confirmed; ALL of
this is from /beacon in `wrangler tail`):
- boot: `webtransport:true, h264:true` → **feature-detect passes on Safari 26.6.2**.
- First attempt (pre-8.3 fix): the UA-block error, verbatim, every 2 s. ← how the trap was found.
- After the fix: `safari-fallback` → **connected 131 ms, moq-transport-14 → catalog →
  first frame 410 ms → stage live, 1188+ frames decoded, 0 decode errors, 0 reconnects over
  2+ min**. No WebKit-319818 stall in that window.
- ⚠️ Background-tab throttling: beacon cadence fell 5 s → ~55 s and frames arrived in bursts
  (fps counter spiked to ~500 after each throttle nap; inter-beacon average ~7 fps) — Safari
  throttles timers/streams in non-frontmost tabs. Foreground behaviour (the actual user
  scenario) could not be observed with the screen locked — **needs the user at the keyboard**.

### 8.6 Publisher operations (the ONE deliberately-left-running process)

```bash
# STATUS: tail -f rig/moq/spike/logs/moq-safari-pub.log   (STATS every 60 s)
# STOP:
pkill -f moq-safari-pub-udd            # the headless-Chrome publisher
pkill -f pubserver.py                  # its page/log server on :8890
# START (both detached, survive shell exit):
cd /Users/s32863/personal/positron/rig/moq/spike
nohup python3 pubserver.py 8890 > logs/moq-safari-pub-server.out 2>&1 & disown
nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --user-data-dir="$PWD/logs/moq-safari-pub-udd" --no-first-run \
  --autoplay-policy=no-user-gesture-required --window-size=1300,760 \
  "http://127.0.0.1:8890/pub-safari.html" > logs/moq-safari-pub-chrome.log 2>&1 & disown
# Rebuild after editing src/: docker esbuild recipe of §6.3, entry src/pub-safari.js or
# src/safari-play.js; player bundle then goes to workers/moq-safari/public/play.js and
# `wrangler deploy` from workers/moq-safari/ (clean env — workers/rtc/NOTES.md rule).
```

⚠️ The publisher dies with laptop sleep/reboot (it's a headless Chrome on this Mac) — restart
with the block above; the player page just says "is the publisher up?" until then.

### 8.7 What awaits the user

Open the URL on the iPhone (Safari), tap start. Expected on iOS ≥26.4: the four green lines,
live video, and a latency readout. On iOS <26.4: the explicit red "Safari/iOS 26.4+ required"
line. Either way `wrangler tail elektron-moq-safari` on this Mac shows the phone's beacons —
UA, stage, fps, errors — the verdict writes itself from one screen on each side.

### 8.8 Persistent verdicts — no live tail needed (✅ deployed + verified 2026-08-26 06:40 UTC)

**https://moq.positron.studio/results** (`?json=1` for raw) —
beacons now ALSO persist into a SQLite Durable Object (BeaconStore, last 200 sessions), so the
page works as an **async device-verdict collector**: forward the test URL to anyone (Android
owners etc.), read their row here later. One row per page load (per-load `sid` added to both
beacon paths), newest first: time, parsed browser ("Chrome 142 / Android 15", "Mobile Safari
26.5.2 / iOS 26.5"…, hover for full UA), furthest stage reached (never regresses on
reconnect), WT/H264 feature flags, connect/first-frame ms, fps last/max, g2g p50, frames,
errors (count + last 3 distinct, hover time cell for sid/last-seen). No auth (beacons carry no
secrets); `X-Robots-Tag: noindex`. Storage started at this deploy — earlier sessions (§8.4/8.5)
predate it; rows keyed `nosid-…` are old cached pages (pre-sid bundle, UA+IP-hash fallback —
distinct devices behind one NAT with identical UAs can merge there). UA caveats: iPads
masquerade as desktop macOS Safari; Chrome/Android UA reduction can freeze "Android 10" and
minor versions; every iOS browser (CriOS/FxiOS…) is WebKit underneath, so its verdict is
Safari's. Verified end-to-end: headless Chrome 151 run → row `a86f74a1` showed live / WT:✓
H264:✓ / connect 159 ms / first frame 401 ms / 30 fps / g2g p50 44 ms / 0 errors.

## 9. Resolution/framerate matrix — how far does the pipeline go? (✅ measured 2026-08-26 ~06:42–07:02 UTC)

Question: from this Mac, through CF's draft-14 relay, how far can resolution/framerate go — 4K? 60 fps? — and
what does it do to latency? Method: parameterized clones of the §8 pipeline (`src/pub-4k.js` / `src/play-4k.js`,
bundles in `www/`, served by `matrixserver.py :8894`), one namespace per config (`positron-4k-test-<cfg>`),
90–100 s each, H.264 annexb hw-encode (VideoToolbox via WebCodecs `hardwareAcceleration:"prefer-hardware"` —
probed per config, all TRUE incl. 4K60 High 5.2), measured by a local headless-Chromium player running the same
code path as the deployed page (per-frame burned-row g2g → `results/moq-4k-<cfg>.jsonl`).

### 9.1 The table (g2g steady-state = after first 5 s; wire bytes = realtime-VBR on the synthetic canvas)

| config | codec | enc fps (target) | dec fps | g2g p50/p95 ms | enc | wire bytes/s | CPU pub/play | verdict |
|---|---|---|---|---|---|---|---|---|
| 720p30 | avc1.42001f | **30.0** (30) | 30.1 | **33.2 / 54.8** | hw | ~105 KB | 13% / 26% | ✅ clean (sanity vs §8.4's 32–34 ✓) |
| 1080p60 | avc1.64002a (High 4.2) | **60.0** (60) | 60.4 | **33.2 / 51.1** | hw | ~170 KB | 14% / 56% | ✅ clean |
| 2160p30 (4K) | avc1.640033 (High 5.1) | **30.0** (30) | 30.2 | **47.3 / 78.2** | hw | ~171 KB | 8% / 57% | ✅ clean → **WINNER** |
| 2160p60 (4K) | avc1.640034 (High 5.2) | **50.0** (60) ❌ | 49.7 | **201.2 / 314.3** | hw | ~300 KB | 15% / 91% | ❌ encoder saturates |
| 2160p30 noise stress | avc1.640033 + `?noise=1&cbr=1` | **14.0** (30) ❌ | 14.0 | 240 / 396 | hw | **2.86 MB (22.9 Mbps), peak 4.97 MB** | 15% / 45% | relay ✅, encoder ❌ |

- All runs: **0 decode errors, 0 row-checksum failures, 0 reconnects** (one exception, §9.3), decoder queue ≤2
  except 4K60 (≤7). First frame 359–851 ms. n(frames): 3006 / 6041 / 3024 / 4976 / 1258.
- ⚠️ Host contention (sibling agents): load1 spiked to ~22 at 720p30 start and **~43 at 4K60 start**, decaying
  through each run; 4K60's encFps stayed pinned at exactly ~50 while load fell 43→12 → the ceiling is the
  encoder, not CPU contention. CPU numbers are one-core %.

### 9.2 Gates hit (each characterized, not guessed)

1. **H.264 level** works exactly as advertised: level 3.1 (`42001f`) refuses ≥720p30 (`isConfigSupported:false`
   for 1080p — seen live in the §9.4 dup probe where High 3.1@1080p FAIL-looped); High 4.2/5.1/5.2 all probe
   hw-supported and configure. The deployed player takes the codec string from the catalog → **no player change
   needed for any config** (verified: page assets untouched all session).
2. **4K60 = encoder saturation, not relay choke.** Draw loop holds 60.0 exactly; VideoToolbox emits ~50 fps
   (83% of target, flat); encode queue rides the backpressure cap (3–4) → **standing latency: g2g p50 jumps
   47→201 ms, p95 314 ms**. "Choking" looks like: bounded-but-full queues, ~10 capture drops/s forever, latency
   plateau ~200 ms — NOT errors, NOT disconnects, NOT relay loss (0 decode errors, relay delivered every frame).
3. **Bitrate honesty**: realtime VT does NOT pad — `bitrateMode:"constant"` changed nothing on synthetic content
   (~1.4 Mbps at "12 Mbps" 4K30). Forcing incompressible content (`?noise=1`, rotating random strips over the
   bottom quarter) → encoder emits **22.9 Mbps sustained / 39.7 Mbps burst through the relay flawlessly** but
   collapses to 14 fps with ~240 ms g2g (internal realtime frame-dropping; queue stays ≤1). So on this Mac the
   wall is ALWAYS the hw encoder; **CF relay bandwidth was never the limit** (free-beta caveat: runs kept ≤120 s).
4. **60 fps ≠ lower latency** (phase-1 hypothesis NOT reproduced here): 1080p60 p50 identical to 720p30
   (33.2 vs 33.2), p95 only −3.7 ms. This rig burns the timestamp at capture-time (no camera-interval
   quantization), so the frame-interval halving mostly cancels; encode+network+decode floor dominates.
5. **4K costs ~14 ms**: p50 33→47 ms, entirely encode+decode time of the 8.3 MP frame (same network path).

### 9.3 Operational findings
- **Video-track subscribe race** (§7.1 trap-2 family, new location): one run's player subscribed `video` right
  after catalog, got SUBSCRIBE_OK but zero groups for 15 s → its own timeout+reconnect fixed it (17.5 s to first
  frame). The deployed player has the same reconnect loop → self-heals; just don't panic at one slow join.
- **Duplicate publish is ACCEPTED by CF draft-14**: second `conn.publish()` of an already-live namespace gets
  PUBLISHED, first session is NOT closed (unlike moq-rs §6.4). Subscriber routing under two live publishers is
  UNTESTED → the §9.5 swap still did stop-old-first.

### 9.4 What runs NOW (since 2026-08-26 07:00 UTC)
**`positron-safari-test` carries 4K30** — `pub-4k.html?ns=positron-safari-test&codec=avc1.640033&w=3840&h=2160&fps=30&bitrate=12000000&statsms=60000`,
headless Chrome udd `logs/moq-4k-pub-udd`, page still served by `pubserver.py :8890` (kept alive — it serves the
new publisher page and collects its `/log` into `logs/moq-safari-pub.log`, same file, lines now prefixed `PUB4K`).
The old 720p30 publisher Chrome (`moq-safari-pub-udd`) was stopped only AFTER the deployed workers.dev page was
CDP-verified live on 4K30: pre-switch on the test namespace, and post-switch on the default URL — 30 fps, 0 decode
errors, g2g p50 47 / p95 66–80 ms, first frame 437 ms, catalog codec auto-picked. Verify anytime:
`tail -f rig/moq/spike/logs/moq-safari-pub.log` (STATS every 60 s).

### 9.5 Restart commands (publisher dies with sleep/reboot — §8.6 caveat applies)
```bash
cd /Users/s32863/personal/positron/rig/moq/spike
# page/log server (if not already up):
nohup python3 pubserver.py 8890 > logs/moq-safari-pub-server.out 2>&1 & disown
# the 4K30 publisher:
nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --user-data-dir="$PWD/logs/moq-4k-pub-udd" --no-first-run \
  --autoplay-policy=no-user-gesture-required --window-size=1300,760 \
  --disable-background-timer-throttling --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  "http://127.0.0.1:8890/pub-4k.html?ns=positron-safari-test&codec=avc1.640033&w=3840&h=2160&fps=30&bitrate=12000000&statsms=60000" \
  > logs/moq-4k-pub-chrome.log 2>&1 & disown
# STOP: pkill -f moq-4k-pub-udd    (fall back to 720p30: §8.6 START block, unchanged)
# Re-run the matrix: python3 matrixserver.py 8894 &  then pub-4k.html/play-4k.html with
# ?ns=positron-4k-test-<cfg>&codec=&w=&h=&fps=&bitrate=[&cbr=1&noise=1]; player JSONL lands in
# results/moq-4k-<name>.jsonl via &name=. Rebuild after src edits: §6.3 docker esbuild, entries
# src/pub-4k.js / src/play-4k.js.
```

## 10. Audio spike — does AUDIO work over browser MoQ, and does SAFARI decode it?

⏱ 2026-08-26 ~07:00–07:20 UTC (audio-spike agent). Status: ✅ built + measured in Chromium;
✅ deployed page extended with an audio probe + audio playback; Safari verdict = research says
YES (26.0+), device probe live and awaiting a phone visit. Own namespace **`positron-audio-test`**
(the sibling-owned `positron-safari-test` and its publisher untouched).

### 10.0 Research — WebCodecs audio in Safari/WebKit (📄 sources, checked 2026-08-26)

- **AudioDecoder + AudioEncoder shipped in Safari 26.0, macOS AND iOS, on 2025-09-15** (WebKit
  blog "WebKit Features in Safari 26.0": "expands support for WebCodecs API by adding
  AudioEncoder and AudioDecoder" — https://webkit.org/blog/17333/webkit-features-in-safari-26-0/;
  MDN BCD `api.AudioDecoder`/`api.AudioEncoder`: Safari 26 / Safari iOS 26, 2025-09-15;
  caniuse.com/webcodecs: 16.4–18.7 "partial" = video-only, 26.0+ full). Back-deployed to macOS
  Sequoia + Sonoma. Safari version numbering jumped 18.7 → 26; anything ≥26 has it.
- **Codec coverage (from WebKit source, `AudioDecoderCocoa.cpp`/`AudioEncoderCocoa.cpp`, main)**:
  decode `opus` (max 2 ch; OpusHead `description` optional, parsed for pre-skip), `mp4a.40.x`
  AAC family (pass the BARE AudioSpecificConfig as description — WebKit wraps it in an
  ES_Descriptor itself), plus mp3/flac/vorbis/pcm. Encode: Opus + AAC only.
- ⚠️ Open WebKit bugs that matter: **#302253** (2025-11-10, open) — Safari's AAC *AudioEncoder*
  emits an esds-wrapped decoder description instead of the bare ASC → cross-browser interop
  hazard if Safari ever *publishes* AAC (decode is unaffected). **#284075** — on older macOS
  (Ventura) AudioDecoder fails for opus/mp3 without a description (matters only for
  back-deployed Safari on old macOS; our catalog always carries the OpusHead → immune).
- Chrome baseline: AudioDecoder/Encoder since Chrome 94 (2021). Opus everywhere; AAC decode
  only in proprietary builds (Google Chrome/Edge yes, open-source Chromium/ungoogled no) —
  **Opus is the safe cross-browser audio codec**, mirror-image of H.264 for video.

### 10.1 Build — audio through the same hang/CF-draft-14 pipeline (all ✅ verified)

Publisher `spike/src/pub-audio.js` (page `www/pub-audio.html`, server `spike/audioserver.py`
:8896 → logs/moq-audio.log|.jsonl): **NO getUserMedia** — AudioData objects are synthesized in
JS (48 kHz stereo f32-planar, 960-frame/20 ms chunks, generated *behind* real time on a 10 ms
timer like a capture device) → **AudioEncoder Opus 48k stereo 96 kbps** (AAC-LC fallback coded
but unused — Chromium supports opus) → hang legacy container track `audio` (new group per 1 s)
alongside the §8-style H.264 720p30 `video` track, namespace `positron-audio-test`. Catalog =
hang RootSchema with BOTH sections; audio rendition carries the encoder's OpusHead as base64
`description`. Signal design: 4-note background sequence (330/392/440/494 Hz, 250 ms each, amp
0.08) + **6 ms 2 kHz tick at amp 0.9 whenever wall-clock ms crosses a 500 ms boundary**; audio
timestamps are wall-anchored µs advanced by exact sample count, so a tick's media timestamp IS
its publisher wall time — the player detects the tick (|s|>0.35), rounds its media time to the
nearest 500 ms and gets the true wall time exactly (one-clock trick, audio edition).

Player `spike/src/play-audio.js` (`www/play-audio.html?dur=90[&cushion=ms]`): decodes both
tracks; video → canvas → burned-row g2g (the §7/§8 reference); audio → AudioDecoder → WebAudio
jitter buffer (schedule at mediaStart + rolling-min-live-edge-delta + 60 ms cushion; late chunk
⇒ underrun++). Measures per tick: `aLat` (decode-output wall − tick wall = audio g2g analog),
`playLat` (tick wall → WebAudio graph output), `skew` (aLat − rolling-median video g2g),
underruns/gap ms. JSONL per tick → `results/moq-audio-chromium.jsonl` (+ a second run
`results/moq-audio-chromium-cushion120.jsonl`, and the phantom-offset run1 kept at
`spike/logs/moq-audio-run1-badts.jsonl`). Headless Chrome plays WebAudio fine
(`--autoplay-policy=no-user-gesture-required`; ctx state `running`, outputLatency 32 ms).

### 10.2 ⚠️ THE TRAP THAT COST RUN 1: AudioDecoder output timestamps are fiction

Run 1 showed audio 534 ms behind video — **constant**, p95 within 10 ms of p50. Cause:
**Chromium's AudioDecoder regenerates output timestamps** (sample-count accumulation from the
first chunk, ± Opus pre-skip −6.5 ms measured): any content skip at join (Consumer skipping to
the latency target across the catch-up burst) becomes a **permanent phantom offset** on
`AudioData.timestamp` — the media looked 500 ms older than it was, while actual delivery was
fine. Fix (in both players): Opus 20 ms is 1-chunk-in/1-chunk-out, so carry the ENCODED chunk
timestamps through a FIFO and ignore `AudioData.timestamp` entirely. After the fix the same
pipeline measured 32 ms. **Any MoQ audio player that trusts decoder output timestamps for sync
will sooner or later be seconds off without knowing it.**

### 10.3 Chromium numbers (✅ measured, headless Chrome 151, 90 s runs, load avg ~2–5/12)

| metric | audio | video (same run) |
|---|---|---|
| g2g p50 (decode-out) | **32.6 ms** | 36.1 ms |
| g2g p95 | 41.6 ms | — |
| A/V skew p50 / p95 / max | **−3.8 / +5.3 / 75 ms** (audio slightly AHEAD) | — |
| playout latency p50 (incl. 60 ms jitter cushion) | 78.4 ms | — |
| decode errors | 0 (4546 chunks) | 0 (2730 frames) |
| ticks measured | 175 (2/s × 87 s warm) | — |

- **Audio g2g ≈ video g2g** (32 vs 26–36 ms across §7/§8 runs) — Opus encode+decode is not the
  bottleneck; transport dominates both. A/V skew is single-digit ms without ANY explicit sync
  logic — both tracks just ride their own MoQ tracks at latency 0.
- Underruns at 60 ms cushion: 42 late chunks/90 s (0.9%) = ~20 single misses (10–20 ms past
  the cushion) + 2 host-load burst stalls (~1.5 s total gap). A parallel cushion=120 run
  absorbed singles but not bursts (79 total — it overlapped a host load spike that hit two
  independent players simultaneously ⇒ publisher/host-side, not cushion-fixable). Production
  answer: adaptive cushion ~100–150 ms, still ≪ LL-HLS.
- Deployed-page end-to-end (workers.dev player + CF relay + this Mac's publisher): aLat_p50
  32 ms, skew −4 ms, 0 decode errors — identical to local (row `672ad0df` in /results).

### 10.4 Deployed Safari rig additions (✅ deployed + verified 2026-08-26 07:12 UTC)

`workers/moq-safari/` version aa7454cc:
- **AudioDecoder capability probe at boot** (index.html): `isConfigSupported` for `opus` AND
  `mp4a.40.2` (48k stereo), shown on-page ("Audio decode — Opus: YES · AAC-LC: YES") and
  beaconed (`audioDec/opus/aac`) on EVERY page load regardless of stream content — any device
  that merely opens the URL answers the Safari-audio question into /results.
- **Audio playback when the tuned catalog carries an audio section** (play.js): AudioDecoder →
  WebAudio jitter buffer (§10.1 design incl. the §10.2 FIFO fix), tick-based aLat + A/V skew.
  AudioContext is created synchronously INSIDE the tap-gesture handler (iOS transient-activation
  rule) before the module import. On-page AUDIO line + beacon fields `audioCodec, audioState,
  aDecoded, aLat_p50, avSkew_p50, aUnderruns, aDecErrors`; /results grew an `audio` column +
  Op:/AAC: flags in features. NOTE: on phones aLat carries the device-clock offset (like g2g),
  but **avSkew subtracts the video delta so the clock offset cancels — skew is exact on any
  device**.
- Default namespace unchanged (`positron-safari-test` — video-only, sibling-owned); audio is
  reachable on any device via **`?namespace=positron-audio-test`**.

**What the user does on the iPhone**: open
`https://moq.positron.studio/?namespace=positron-audio-test`
in Safari, tap TAP TO START, listen for ~30 s (expect the 4-note loop + 2 ticks/s alongside
the video). Then check `/results` from anywhere: the phone's row shows Op:/AAC: probe verdicts
(these alone settle "does iOS decode WebCodecs audio"), audioCodec/audioState (a `susp` marker
= AudioContext never left suspended = gesture/autoplay issue), aLat, avSkew (trustworthy on
phone), underruns, errors. ⚠️ A stale §8.5 desktop-Safari tab may still beacon on the OLD
bundle (rows without audio fields) — only post-07:12Z page loads carry the probe. 📄 Research
expectation: iOS ≥ 26 → Opus YES + AAC YES; iOS < 26 → "AudioDecoder: NOT AVAILABLE" line
(video still plays if ≥26.4… note Safari 26.0–26.3 would pass the audio probe while failing
WebTransport). Real iPhone rows from 07:09–07:11Z (sibling's 4K run: "Mobile Safari 26.5.2",
WT ✓ H264 ✓ live) predate the audio deploy by 3 min — a revisit will fill the probe columns.

### 10.5 Publisher operations (the ONE process this spike leaves running)

```bash
# STATUS: tail -f rig/moq/spike/logs/moq-audio.log        (PUB STATS every 60 s)
# STOP the audio publisher + its server:
pkill -f moq-audio-pub-udd
pkill -f audioserver.py
# START again (both detached):
cd /Users/s32863/personal/positron/rig/moq/spike
nohup python3 audioserver.py 8896 > logs/moq-audio-server.out 2>&1 & disown
nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --user-data-dir="$PWD/logs/moq-audio-pub-udd" --no-first-run \
  --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling \
  --disable-renderer-backgrounding --disable-backgrounding-occluded-windows \
  --window-size=1300,760 "http://127.0.0.1:8896/pub-audio.html" \
  > logs/moq-audio-pub-chrome.log 2>&1 & disown
# Rebuild after src edits: §6.3 docker esbuild, entries src/pub-audio.js src/play-audio.js
# src/safari-play.js (→ workers/moq-safari/public/play.js, wrangler deploy clean-env §8.6).
```
Dies with laptop sleep/reboot like the §8 publisher; restart with the block above.

### 10.6 Verdict (for plan-m2m §1.C)

**"MoQ AUDIO works in the browser today, at video-equal latency: Opus 48 kHz stereo through
the hang container over CF's draft-14 relay measures g2g p50 32.6 ms / p95 41.6 ms in Chromium
(video 36 ms in the same run), A/V skew p50 −3.8 ms / |max| 75 ms with NO explicit sync logic,
0 decode errors in 90 s, 0.9 % late chunks at a 60 ms jitter cushion. Safari decode: research
says YES since Safari/iOS 26.0 (2025-09-15 — AudioDecoder Opus ≤2ch + AAC-LC, WebKit source
confirms), and the deployed test page now probes + plays + beacons audio on any device —
iPhone row in /results pending a user visit with ?namespace=positron-audio-test. Watch out:
(a) decoder output timestamps are regenerated — sync on container timestamps, never on
AudioData.timestamp (§10.2); (b) Opus is the cross-browser audio codec (Chromium lacks AAC,
Safari has both); (c) Safari's AAC *encoder* description is broken (WebKit #302253) — publish
Opus."**

Cleanup ✅: player + deploy-verify Chromes killed (`moq-audio-play-udd`, `moq-audio-deployver-udd`);
publisher + audioserver.py LEFT RUNNING (10.5); siblings' processes/namespaces untouched;
results in `results/moq-audio-chromium*.jsonl`.

### 10.7 Silence detection — "decoded fine" ≠ "audible" (✅ deployed 2026-08-26 12:02 UTC, version 2831f81c)

Addendum deploy of `workers/moq-safari/` (additive; bundle from `src/safari-play.js`, §6.3
docker esbuild recipe, unminified like prior deploys): the player now measures the ACTUAL
audio output level, not just decode success. All WebAudio buffer sources feed a master
GainNode → destination with an **AnalyserNode** tapping the master bus; a 250 ms sampler keeps
a **rolling 3 s output-power window** → `audioLevelDb` (20·log10 RMS). Decoded-PCM power is
windowed separately (`pcmDb`) so a silent verdict says WHERE sound died. State machine (1/s):
**sounding** (level > −50 dB floor) / **silent** (chunks still decoding but 3 s window empty —
on-page "AUDIO DECODED BUT SILENT ⚠️" + one-shot `audio-silent` beacon, distinguishing
"decoded PCM has signal — output path broken" from "decoder output itself is silent") /
**suspended** (AudioContext not running → "TAP TO ENABLE SOUND", NOT counted as silence; any
tap resumes — gate tap now also calls resume()) / **no-track** (catalog has no audio section —
new explicit on-page line + beacon). New big on-page verdict line `st-averdict`
("AUDIO: SOUNDING — level −25 dB"). New beacon/row fields `audioLevelDb, silentSeconds, pcmDb`
(+ `audioState` now a verdict, not the raw ctx state); /results audio cell shows
`opus SOUNDING −25dB …` / `no-track` / `SILENT⚠ Ns`. Verified headless (rows in /results,
udd `moq-sndchk`, killed after): `?namespace=positron-audio-test` → row `7fe1f0dc` opus
**sounding −25 dB** (pcm −21 dB, aLat 40 ms, skew −2 ms, 0 dec errors); default video-only 4K
namespace → row `4adfed8f` **no-track** (live, 0 errors). Publishers untouched.

## 11. OBS support (web research 2026-08-26 — all 📄 unless marked)

- **Native OBS MoQ: nonexistent.** Nothing in 31/32.x (latest 32.2.2, 2026-08-14) and zero
  MoQ/MoQT/WebTransport issues or PRs in obsproject/obs-studio (GitHub search ✅ 2026-08-26).
  Only official-channel trace: ideas.obsproject.com post #3261 (2026-07-15) requesting MoQ
  output — **declined same day** by maintainer Joel Bethke ("We do not accept AI-generated
  submissions"). WHIP (OBS 30, 2023) remains OBS's newest transport; no PR to watch.
- **The real path is the moq-dev plugin** (kixelated ecosystem, moq-lite lineage): `cpp/obs` in
  github.com/moq-dev/moq (old moq-dev/obs repo archived 2026-08-05). Loads into **stock OBS** —
  publish = Settings→Stream service "MoQ", subscribe = "MoQ Source"; H.264/HEVC/AV1 + AAC/Opus;
  via `libmoq` (Rust/C static lib, background tokio thread). Releases weekly: obs-moq v0.5.10
  2026-08-25, prebuilt **macOS arm64 + Windows x64 only, unsigned** (Linux = build from source;
  self-described "under development, but works pretty gud"). Advanced settings include protocol
  **version pinning** ("offer all of them" default) — CF-IETF-relay interop therefore plausible
  via the same compat SETUP §6.2 verified for @moq/net, but ⚠️ untested, and ⚠️ ThreatLocker
  (§3.5, killed OBS itself before) may kill an unsigned downloaded plugin dylib. Docs:
  doc.moq.dev/bin/obs. History: started as an OBS *fork* ("MoQBS", moq.dev blog 2025-12-19, by
  bpmedley/emilsas/pangaea) — fork no longer required.
- **ffmpeg upstream: in progress.** code.ffmpeg.org/FFmpeg/FFmpeg/pulls/23263 "Media over QUIC
  (MoQ) support" (Ole Andre Birkedal, opened 2026-05-28, un-drafted 2026-08-20, open, awaiting
  maintainer approval): `-f moq` fMP4 muxer **linking libmoq** — moq-lite lineage, not an
  independent IETF stack. FATE green; not in ffmpeg 8 (which got WHIP).
- **Bridge landscape / what this changes here:** mediamtx gained native MoQ **upstream** in
  v1.19.0 (2026-06-02, from WINK Streaming's winkmichael/mediamtx-moq); v1.20.x (Aug 2026) adds
  native-QUIC pub/read + drafts 16–19 — so our installed 1.20.1 (§0, §5.5) already makes
  OBS→RTMP/SRT/WHIP→mediamtx→MoQ a one-box bridge with **no ffmpeg|moq-pub hop** for
  local/self-hosted serving. For publishing to *Cloudflare's* IETF relay, ffmpeg|moq-pub
  (cloudflare/moq-rs — active, pushed 2026-08-25) remains canonical; moq-dev also ships
  `moq-rtmp`/`moq-srt` ingest bridges + moq-gst v0.3.6 for its own relays.
- **Verdict: (c) native = nonexistent, no timeline signal; plugin ecosystem healthy.** Our
  documented paths are not obsoleted; two cheap experiments if wanted: obs-moq plugin →
  CF draft-14 (interop + ThreatLocker), and dropping the ffmpeg|moq-pub hop for local mediamtx.

## 12. mediamtx + the catalog shim — LOCAL-VENUE chain: encoder → mediamtx MoQ → browser

⏱ START 2026-08-26 07:41 UTC (mediamtx-shim agent; owns this section only). Conditions:
AC power 100%, load avg 3.6/12. Resources: port 8888 (page/log server), udd prefix
`moq-mtx`, own mediamtx instance (config `rig/moq/mtx/mtx.yml`, high ports 188xx),
own ffmpeg (WHIP into it). Sibling processes (8889/8890/8896, moq-4k/audio udds) untouched.

### 12.0 Pre-experiment source reading (✅ read v1.20.1 sources from GitHub + binary strings)

mediamtx 1.20.1's MoQ server is NOT WARP/CMAF. What it actually speaks, from
`internal/servers/moq/` + `internal/protocols/moq/` (v1.20.1 tag):
- **Drafts**: moqt-16…moqt-19 (WT subprotocol negotiation); draft-17+ SETUP over uni
  streams type 0x2F00; its own embedded web reader pins moqt-19.
- **Path, not namespace**: the stream path rides the WebTransport CONNECT URL
  (`https://host:8892/<path>`); the MoQT namespace tuple in SUBSCRIBE is **ignored**
  (its own reader hardcodes namespace `"stream"`). Native QUIC uses a PATH setup option.
- **Catalog**: track name **`.catalog`** (same NAME as WARP) but the SCHEMA is
  **draft-ietf-moq-msf-00**: `{version:1, tracks:[{name:"0"|"1"…, packaging:"loc",
  isLive, codec, width…, samplerate, channels, initData?}]}` — track names are numeric
  indices, packaging is **"loc"**, NOT cmaf; H.264 is announced as `avc3.640028`
  (hardcoded string, in-band params), Opus as `opus` + samplerate/channels (no initData);
  AAC/FLAC carry base64 initData. Catalog delivered once as group 0 on the subscription.
- **Media wire format**: one frame = one MoQ **group** on its own uni stream (subgroup
  header type 0x11 = subgroup+props, groupID increments per frame), single object whose
  properties carry a **Timestamp** (PTS), payload = **raw AVCC** (4-byte-length-prefixed
  NALUs) for H.264/H.265, raw packet for Opus/VP8/VP9/AV1. No fMP4, no init segment.
- **SUBSCRIBE shape** (draft-19): {requestID, namespace, trackName, params} — priority/
  filter/forward moved into params in 18+, which matches @moq/net's v15+ encoder; each
  request on its own bidi stream (matches mediamtx's one-message-per-stream reader).
  SUBSCRIBE_OK: {trackAlias, params, trackProperties(empty)}.
- **TLS**: moqServerCert/moqServerKey (auto.crt = ECDSA but 10-YEAR validity → fails
  Chrome's serverCertificateHashes ≤14-day rule; fix = own 10-day ECDSA cert). Server
  serves `https://…/<path>/fingerprint` (SHA-256 hex of the DER cert) for pinning;
  @moq/net `connect()` accepts `{webtransport:{serverCertificateHashes:[{value:<hex>}]}}`
  directly — no custom transport needed, no Chrome cert flags needed.
- **Shim implication**: the §7 prediction was half right — a catalog shim is needed, but
  for mediamtx it is msf-00/"loc"/AVCC (simpler than CMAF: no mp4 demux, just
  AVCC→AnnexB), while IETF moq-pub/CF remains WARP/CMAF (`streamingFormat:1`,
  `1.m4s` moof/mdat + `0.mp4` init). One player, two catalog branches ⇒ covers both.

## 13. Multi-publisher + role flip — CF relay fan-IN, viewer→publisher, publisher death

⏱ START 2026-08-26 07:40 UTC (multi-publisher agent; this agent owns §13 only, port 8887,
udd prefix `moq-mgrid`, namespaces `positron-mgrid-*`). Comparator: the SFU grid
(plan-m2m §6 — N=54 clean / p95 ~158 ms flat; promote cmd→video ~0.5 s; death 38–126 ms
via DO `left`; rejoin ~3–3.9 s).

### 13.0 Design + setup notes (timestamped)

- 07:40Z Rig: `spike/src/mgrid-{pub,probe,flip}.js` (+ www pages, Docker esbuild §6.3),
  `spike/mgridserver.py` on **:8887** = static + POST /log + POST /jsonl/<name>
  (→ `results/moq-mgrid-*.jsonl`) + **/roster** + **/cmd**. Publishers: 320x180@15 canvas
  (id + burned row = 32-bit low wall-ms + 8-bit XOR in 40×8 px blocks), H.264 baseline
  `avc1.42001f` annexb 300 kbps, GOP 1 s, catalog republish 2 s, `latencyMax:2000`,
  one namespace `positron-mgrid-p{N}` per participant, sw encode (no VT preference —
  keeps hw sessions free at tiny res). Probes: 2 pages, each ONE MoQ connection,
  subscribe-all-in-roster (1 s poll), per-pub VideoDecoder + row decode, per-frame
  `{k:"f",pub,t,d}` + race/close/silent events (silence watchdog: >500 ms without a
  frame at 15 fps, 100 ms scan).
- **DISCOVERY LIMITATION (stated up front): draft-14 has no SUBSCRIBE_NAMESPACE**, so
  publisher discovery here = a local roster registry on :8887 that publishers POST into
  and viewers poll at 1 s. Production discovery would ride the RtcRoom DO (§plan-m2m).
  Everything measured includes this shim's 0–1 s poll where noted.
- 07:47Z TRAP: `--headless=new` refuses multiple URLs ("Multiple targets are not
  supported in headless mode") → co-tenancy = K=5 publisher *pipelines in one page*
  (each with its OWN Connection/QUIC session, so relay fan-in still sees one session
  per publisher), not 5 tabs.
- HONESTY NOTE: all publishers share ONE uplink + one machine — this measures relay
  fan-in + protocol behavior, not network diversity.
- 07:49Z Smoke (N=2 co-tenant + 1 probe): both publish, probe FIRST_FRAME ≈120 ms after
  FIRST_ENCODED; publish→first-encode ≈1.9 s (encoder init + page settle).

### 12.1 Build log (timestamped, all ✅ verified on this machine)

- 07:42Z mediamtx 1.20.1 started with own config `rig/moq/mtx/mtx.yml`: ONLY webrtc
  (WHIP :18889, ICE UDP :18189) + MoQ (:18892 TCP-H2 + UDP-H3, :18893 UDP native QUIC);
  rtsp/rtmp/hls/srt/api all off; path `moqmtx`; logs `rig/moq/mtx/logs/mediamtx.log`.
- 07:42Z ffmpeg WHIP smoke test (WHIP-FFMPEG-NOTES command, testsrc2+sine) →
  "is publishing to path 'moqmtx'" FIRST TRY. WHIP ingest friction: none.
- 07:47Z real publisher: `rig/moq/mtx/gen-frames.py` (python live source; stands in for
  OBS compositing) — rawvideo rgb24 720p30 on stdout with the rig's 56-block burned-ms
  row (§7 geometry) + f32le tick-audio (§10 signal design: 4-note loop + 2 kHz tick at
  every 500 ms wall boundary) via FIFO thread → `run-pub.sh` → ffmpeg libx264 baseline
  3.1, -bf 0, -g 60, 2 Mbps, -tune zerolatency + libopus 48k → WHIP.
  - TRAP: `-use_wallclock_as_timestamps 1` caused ~1 s dup/drop churn at start; mediamtx
    closed the session "deadline exceeded while waiting tracks" (webrtcTrackGatherTimeout
    2 s). Fix: drop the option (audio FIFO opened in a thread avoids the ffmpeg
    sequential-input-open deadlock) + webrtcTrackGatherTimeout: 10s.
- 07:50Z player TRAP 1: pinning my own 10-day cert failed — mediamtx's HTTP/3 listener
  IGNORES moqServerCert and always serves a JIT in-memory ECDSA P-256 cert (14-day,
  rotated; `internal/protocols/httpp3/server.go` — deliberate, for the WebTransport
  serverCertificateHashes ≤14-day rule). Fix: playserver.py proxies mediamtx's live
  `GET /moqmtx/fingerprint` (plain-HTTP page origin → no cert friction anywhere; NO
  Chrome flags needed at all — `connect(url, {webtransport:{serverCertificateHashes:
  [{value:<hex>}]}})` is supported by @moq/net directly).
- 07:50Z player TRAP 2 (the real interop bug): session died at SUBSCRIBE with mediamtx
  log "closed: unsupported parameter type: 16". @moq/net (per draft-19) moves
  subscriber_priority/group_order/forward/filter into SUBSCRIBE *parameters*; mediamtx's
  parameter parser accepts ONLY AuthorizationToken and CLOSES THE SESSION on any other
  type (0x10 = FORWARD) — a spec violation (unknown params must be skipped; its own
  SETUP parser does skip by even/odd). Fix: post-bundle patch (`mtx/build-shim.sh`)
  strips the four v15+ SUBSCRIBE params (zero params sent; mediamtx doesn't use their
  semantics anyway). draft-14 encodes them as fixed fields → CF path unaffected.
- 07:53Z **END-TO-END DECODE**: connect 6 ms, `version=moq-transport-19` negotiated
  (WT subprotocol; mediamtx prefers 19), catalog `{version:1,tracks:[{name:"0",
  packaging:"loc",isLive:true,codec:"opus",samplerate:48000,channels:1},{name:"1",
  packaging:"loc",isLive:true,codec:"avc3.640028"}]}` — exactly the msf-00 shape §12.0
  predicted (NB channels:1 despite stereo ingest — mediamtx's WHIP→catalog quirk; mono
  decode works). 20 s trial: video 543/543 frames decoded, 0 decode errors, 0 checksum
  fails, 0 skipped groups; audio 1000 chunks, 0 errors, 40/40 ticks. g2g p50 18.9 ms.
  Join→first-frame ~1.9 s = keyframe wait (subscriber joins mid-GOP; -g 60 = 2 s GOP).

### 13.1 ⚠️ FINDING FIRST (accidental, then confirmed): stale-announce namespace pinning

07:51–07:54Z. Rung-1 attempt reused namespaces `p1/p2` from the smoke test whose
publishers had been SIGKILLed ~10 s earlier. Result, seen identically by both probes:
- New publishers on the reused names connected + published fine (encoder 15 fps, no error
  — **the duplicate publish is silently accepted**, §9.3 confirmed).
- Subscribers got: catalog OK + **one burst of frames with burned-age ≈6.4–6.8 s = the
  DEAD session's open-group relay cache**, then silence ≤0.6 s later, then every
  catalog re-subscribe timing out (SUBSCRIBE optimistically OK'd, zero groups — §7.3
  family) for **>3 min 20 s and counting** while the fresh publisher stood unreachable.
- Interpretation: **CF draft-14 pins a namespace to the FIRST announce; an unclean kill
  leaves the name routed to the corpse for minutes.** Fresh sessions on the same name
  never receive relay subscriptions. (Exact expiry horizon measured in §13.4.)
- Consequences for the rig: every rung uses NEVER-REUSED id prefixes (a*, b*, c*…);
  for production: a rejoining publisher MUST take a fresh namespace (session-suffixed),
  exactly like the SFU world re-creates a session — same-name rejoin is a trap.

### 12.2 MEASURED — local-venue chain, 90 s (✅ 07:54–07:56Z, AC 100%, load avg ~21/12 at start — sibling agents; §7 showed numbers robust under far worse)

Chain: python live source (burned row + tick audio) → ffmpeg WHIP (H.264 baseline 3.1
-bf 0 -g 60 2 Mbps zerolatency + Opus 48k) → mediamtx 1.20.1 (:18889 WHIP in, :18892 MoQ
WT out, draft-19) → headless Chrome 151 shim player. Data: `results/moq-mtx-local.jsonl`
(2653 video rows kind:"v" {t,burned,delta} + 180 audio-tick rows kind:"a" {t,aLat,skew}).

| metric | value |
|---|---|
| video g2g p50 / p90 / p95 / p99 | **20.6 / 52.1 / 57.9 / 67.0 ms** |
| video g2g min / max | 4.0 / 89.5 ms |
| frames decoded / wire | 2653 / 2653 (30 fps flat, every STATS ~300/10 s) |
| decode errors / checksum fails / skipped groups | **0 / 0 / 0** |
| audio ticks measured | 180 (2/s × 90 s) |
| audio aLat p50 / p95 | **32.5 / 61.0 ms** (decode-out vs 500 ms-boundary tick) |
| A/V skew p50 / p95 / |max| | **+11.8 / +40.2 / 49.9 ms** (audio behind video) |
| audio chunks decoded / errors | 4500 / 0 |
| join → first frame | ~1.9 s (mid-GOP join + -g 60 ⇒ 2 s keyframe wait; -g 30 would halve it) |

- g2g here includes python-draw→pipe→libx264→RTP/WHIP→mediamtx remux→MoQ→WT→decode→canvas.
  p50 20.6 ms is BELOW the CF-relay hang-path numbers (26–36 ms, §7/§8) — everything is
  loopback; the p90+ tail (~52 ms) is x264/WHIP-side batching, not MoQ (video p50 varies
  <2 ms between 20 s and 90 s runs; audio p50 32.5 ms ≈ §10's 32.6 ms over CF, funny).
- A/V skew +12 ms with zero sync logic (both tracks decoded on arrival) — the €10-word
  verdict "opus rides ~1 frame behind video through ffmpeg+mediamtx" — well under lip-sync
  thresholds (±45 ms ITU). No underruns modeled here (no playout buffer — decode-time metric).

### 12.3 BONUS — the SAME shim player against Cloudflare (IETF moq-pub → CF draft-14 → browser)

⏱ 07:55–08:00Z. Publisher: HOST python live source (same burned row, host clock — so
one-clock g2g stays valid) | HOST ffmpeg (h264 baseline -g 30 zerolatency + aac, fMP4
`empty_moov+frag_every_frame+separate_moof+omit_tfhd_offset`) | Docker `moq-pub`
(draft-14, §4 recipe) → `https://draft-14.cloudflare.mediaoverquic.com`, namespace
`positron-shim-test` (`rig/moq/mtx/run-cfpub.sh`; Docker clock resynced first, §4 trap).
Player: the IDENTICAL bundle, `?url=…cloudflare…&ns=positron-shim-test&fp=0`.

- WARP catalog observed off CF (verbatim, first bytes ever decoded cross-ecosystem):
  `{"version":1,"streamingFormat":1,"streamingFormatVersion":"0.2","supportsDeltaUpdates":
  true,"commonTrackFields":{"namespace":"/positron-shim-test","packaging":"cmaf",
  "renderGroup":1},"tracks":[{"name":"1.m4s","initTrack":"0.mp4","selectionParams":
  {"codec":"avc1.42C01F","width":1280,"height":720}},{"name":"2.m4s","initTrack":"0.mp4",
  "selectionParams":{"codec":"mp4a.40.2",…}}]}`
- Shim traps found (both fixed in the same player): WARP puts `packaging` under
  `commonTrackFields` (not per-track) and `codec` under `selectionParams` — first attempt
  fell into the loc branch and fed moof/mdat to an annexb decoder (0 frames, AAC decode
  errors); after the two catalog-mapping fixes it decoded immediately.
- **Init-segment worry from §5.3 did NOT bite**: `0.mp4` (ftyp+moov, 1260 B) arrived
  ~40 ms after subscribe on a LATE join — moq-pub keeps the init group open, and CF's
  open-group replay serves it. avcC (37 B) extracted → `avc1.42C01F` + description
  (AVCC mode); fragments decoded with keyframe = first-fragment-of-group.
- 20 s trial: connect 92 ms (moq-transport-14), catalog 130 ms, first frame 739 ms from
  page load; 609 frames, 0 decode errors, 0 checksum fails. g2g p50 60.8 / p95 125.8 ms
  under load avg 32/12 (three encoders + sibling agents live).

### 12.4 MEASURED — CF bonus, 90 s (✅ 07:57:48–07:59:20Z, AC 100%, load avg ~29/12)

Same shim bundle, `results/moq-mtx-cf.jsonl` (2718 rows kind:"v"):

| metric | mediamtx local (12.2) | ffmpeg→moq-pub→CF→shim |
|---|---|---|
| g2g p50 | 20.6 ms | **60.6 ms** |
| g2g p90 / p95 | 52.1 / 57.9 ms | 73.7 / **79.6 ms** |
| g2g p99 / max | 67.0 / 89.5 ms | 124.3 / 748 ms |
| frames / errors / checksum fails | 2653 / 0 / 0 | 2718 (30 fps flat) / **0 / 0** |

CF-path p50 60.6 vs §7.1's hang→CF 26 ms: the extra ~35 ms is the publisher side
(ffmpeg fMP4 muxing + moq-pub parse + Docker NAT vs in-browser WebCodecs), not the relay;
tail includes host load 29–32/12. Audio (AAC) deliberately not decoded in the CMAF branch.
**This closes §7's cross-ecosystem gap: an ffmpeg/OBS-shaped publisher → CF IETF relay →
plain browser now plays, through a catalog shim only — media bytes needed no translation.**

### 12.5 Verdict (for plan-m2m §1.C) + what the shim actually is

**"The local-venue MoQ chain works end-to-end TODAY: ffmpeg WHIP (the OBS-realistic
ingest, worked first try) → mediamtx 1.20.1 as MoQ server → browser. @moq/net negotiates
moq-transport-19 via WT subprotocol in 6 ms on localhost; mediamtx publishes a
draft-ietf-moq-msf-00 catalog (`.catalog`, packaging 'loc', avc3 AVCC frames one-per-group,
raw Opus packets) — NOT WARP/CMAF as §7 guessed. 90 s measured: video g2g p50 20.6 /
p95 57.9 ms, 2653/2653 frames, 0 errors; audio aLat p50 32.5 ms, A/V skew +12 ms with no
sync logic. The SAME player pointed at Cloudflare draft-14 with an IETF moq-pub publisher
decodes WARP/CMAF too (p50 60.6 / p95 79.6 ms, 0 errors) — §7's catalog-conventions gap is
closed in both dialects by ONE browser-side shim."**

- Shim size/design: `spike/src/play-mtx.js`, 457 lines TOTAL of which the actual bridge is
  ~150 (catalog interpretation ~25, loc branch: AVCC→AnnexB + per-frame groups + reorder
  ~60, cmaf branch: init-track fetch + avcC scan + mdat walk + group-boundary keyframes
  ~65); the rest is the §7 measurement rig (burned-row, tick audio, logging). Plus a
  9-line post-bundle patch (`mtx/build-shim.sh`) stripping v15+ SUBSCRIBE params.
- Interop bugs to remember (all mediamtx 1.20.1): (1) closes session on ANY SUBSCRIBE
  param except AuthorizationToken ("unsupported parameter type: 16" = FORWARD) — needs
  the param-strip patch; one-line fix upstream (skip unknown by even/odd parity, as its
  own SETUP parser already does). (2) HTTP/3 cert is ALWAYS a JIT in-memory 14-day ECDSA
  cert — moqServerCert ignored on H3; clients MUST use the `/…/fingerprint` endpoint +
  serverCertificateHashes (mediamtx's own page does; our playserver proxies it; zero
  Chrome flags needed). (3) stereo Opus ingested via WHIP is cataloged `channels:1`
  (decodes as mono — cosmetic/quality quirk, not a blocker).
- Zero-custom-code venue path ALSO verified at the session level: headless Chrome with
  `--ignore-certificate-errors` on mediamtx's own embedded page
  `https://127.0.0.1:18892/moqmtx/` subscribed `.catalog` + both tracks (mediamtx log;
  frame-level decode not instrumented there — our shim covers that question).

### 12.6 OBS implications + untested

- **Cleanest OBS→mediamtx ingest = WHIP** (Settings→Stream→WHIP, url
  `http://<host>:18889/<path>/whip`): proven here end-to-end via ffmpeg's WHIP muxer
  (same H.264+Opus RTP shape OBS emits; B-frames already forbidden by WebRTC so OBS
  needs no special encoder tuning beyond keyint). RTMP/SRT into mediamtx would also work
  (untested here) but WHIP had literally zero friction. RTSP fallback was NOT needed.
- Join→first-frame is keyframe-bound (~2 s at -g 60, ~1 s at -g 30) — set OBS keyframe
  interval to 1 s for venue joins.
- UNTESTED: the actual OBS binary (ThreatLocker kills it on this Mac — §11); >1
  concurrent viewer / LAN (everything here is loopback); Safari against mediamtx
  (WebKit's WebTransport + serverCertificateHashes support unknown — §8 rig would
  answer it); mediamtx native-QUIC listener :18893 (browsers can't use it); draft-16
  CF relay with tokens (shim's SUBSCRIBE-param strip applies to v15+ — would need the
  AuthorizationToken param added for CF-16).

### 12.7 Artifacts + ops + cleanup

- `rig/moq/mtx/`: mtx.yml, gen-frames.py (live source), run-pub.sh (WHIP publisher),
  run-cfpub.sh (CF publisher), build-shim.sh (bundle+patch), playserver.py (:8888,
  /fingerprint proxy + /log), moq-cert/key.pem (only the H2 side uses it), logs/.
- `rig/moq/spike/src/play-mtx.js` (+ `www/play-mtx.html`, bundle `www/play-mtx.js`).
- Results: `results/moq-mtx-local.jsonl` (2653 v + 180 a rows), `results/moq-mtx-cf.jsonl`
  (2718 v rows).
- Restart the whole local chain:
  `cd rig/moq/mtx && /opt/homebrew/bin/mediamtx mtx.yml & ./run-pub.sh & python3
  playserver.py 8888 &` then open `http://127.0.0.1:8888/play-mtx.html`.
- Cleanup ✅ (08:0xZ): all `moq-mtx-*` Chromes, moq-mtx-cfpub container, both ffmpeg
  pipelines + gen-frames.py, my mediamtx (mtx.yml), playserver.py:8888 stopped. Siblings
  (8889/8890/8896, moq-4k/moq-audio udds, their namespaces) untouched. Docker volumes
  untouched. Nothing outside §12 + rig/moq/mtx/ + the three spike files modified.

⏱ END 2026-08-26 ~08:02 UTC — ~21 min active.

### 13.2 Fan-in ladder (✅ measured 07:49–08:12Z; 90 s+ per rung, warmup 5 s dropped, 2 probes
subscribing ALL; namespaces fresh per rung after the §13.1 lesson)

| N | valid % | pooled g2g p50/p95 ms | worst-pub p50/p95 | spread p50 | races | decode err | mgrid CPU / machine |
|---|---|---|---|---|---|---|---|
| 2 (smoke) | 100.00 | 29.7 / 52.0 | 31.0 / 53.7 | 28.5–31.0 | 0 | 0 | – / load1 2 |
| 5 | 100.00 | 44.7 / 65.9 | 47.1 / 70.4 | 26.2–47.1 | 0 | 0 | ~55 % one core / 14 % machine (load1 31 sibling) |
| 10 | 100.00 | 36.7 / 56.2 | 43.1 / 63.0 | 29.6–43.1 | 0 | 0 | ~87 % / 32 % (load1 27) |
| 20 | 100.00 | 62.2 / 87.9 | 70.3 / 95.8 | 54.7–70.3 | 0 | 0 | ~165 % / 33 % (load1 55!) |
| 30 | 100.00* | **754 / 792** | 757.6 / 797.9 | 749.6–757.6 | **504** | 0 | ~157 % / 21 % (load1 6) |
| 30 rerun | 100.00* | **752 / 790** | 755.9 / 794.7 | 748.3–755.9 | **680** | 0 | ~150 % (gpu 96 + rend 47) / 19 % |

*valid % counts only DELIVERED streams — at N=30 only 24 (run 1) / 20 (run 2) of 30
publishers ever reached a given probe. Delivered frames stayed 100 % checksum-valid at
every rung; 0 decode errors anywhere; encoders 15.0 fps ≤N=20.

**Two DISTINCT gates fired at N=30, both confirmed by rerun:**

1. **Per-viewer-session subscription cap ≈ 20 namespaces (~40 subscriptions).** Run 1:
   both probes starved the same 6 pubs (catalog-phase timeouts, 84 retries/pub, never
   recovered); a FRESH single connection started later reached a DIFFERENT set — exactly
   20 live, 10 starved, including pubs dead-to-probes (d26) and vice versa (d11–14,d23).
   Run 2: both probes served exactly g1–g20, starved g21–g30 at the VIDEO phase (catalog
   OK). So: **relay fan-IN is fine — all 30 publisher sessions were accepted and every
   namespace was servable to SOME session; what breaks is fan-OUT per downstream session.**
   Failure mode is silent starvation (SUBSCRIBE_OK then zero groups forever — §7.3's
   optimistic OK at scale); retries never rescue an over-cap session. Production
   mitigation (untested): shard a grid viewer across ≥2 WebTransport connections
   (≤15 namespaces each), or draft-16 (unknown if the cap differs).
2. **Publisher-side aggregate encode ceiling of THIS RIG between 20 and 30 encoders**:
   at N=30 every encoder pinned at ~11.8/15 fps, encode queue at cap (4), ~30 % capture
   drops → a FLAT ~750 ms standing g2g on all delivered streams (§9.2's saturation
   signature, aggregate edition). NOT machine CPU (19–21 % total, load1 6–8; sibling 4K
   ffmpeg untouched); Chrome-role split says GPU-process (canvas→VideoFrame readback)
   ≈2× renderer cost. So the honest scope: **one Mac cannot SOURCE 30 clean synthetic
   streams; relay fan-in beyond 30 sessions is untestable from a single rig** —
   sw-vs-hw-encoder split not isolated (open).

Ceiling call: **fan-in "none through N=20" (clean, 100 % valid, p95 88 ms);
N=30 fails for viewer-cap + local-encode reasons, NOT relay fan-in refusal** — CF
accepted 32 concurrent sessions (30 pub + 2 probe) + 2 sibling publishers without any
connection-level error at any rung. All publishers share one uplink+machine: this
measured relay/protocol behavior, not network diversity. Sibling load (4K + audio pubs,
ffmpeg 4K; load1 swung 2→55) ran throughout — latency tables held flat regardless.
Data: results/moq-mgrid-{smoke,r5,r5a,r10,r20,r30,r30b,d26check}.jsonl (r5 = the
contaminated §13.1 run, kept as the stale-pinning evidence).

### 13.3 Viewer→publisher flip ("spotlight from the crowd"), 5×, at N=10 steady (✅ 08:13–08:16Z)

Setup: fresh viewer page (own Chrome) subscribing ALL 10 base publishers, polling
/cmd at 100 ms; on command it publishes its canvas **on its already-open MoQ
connection**, self-registers in the roster; probes discover via 1 s roster poll +
catalog retry. All clocks = one host.

| flip | cmd→publish+catalog | cmd→catalog@probe | cmd→first-encoded | cmd→FIRST DECODED (both probes) |
|---|---|---|---|---|
| f1 | 0 ms | 1599 | 1460 | **1644** |
| f2 | 0 ms | 614 | 1635 | **1665** |
| f3 | 1 ms | 802 | 1456 | **1487** |
| f4 | 1 ms | 562 | 1514 | **1547** |
| f5 | 0 ms | 1600 | 1551 | **1686** |

**Flip p50 = 1.64 s (range 1.49–1.69 s), 5/5 success**, steady g2g normal (33–51 ms)
immediately after the warmup burst; command-poll overhead 23–95 ms included.

**Breakdown — the surprise: draft-14 discovery is NOT the dominant term.**
- publish-on-existing-connection is FREE (0–1 ms; no renegotiation, no new handshake —
  MoQ's structural win over WebRTC here);
- discovery (roster-poll 0–0.7 s + closed-catalog republish wait ≤2 s) = 0.56–1.60 s,
  fully OVERLAPPED by
- **WebCodecs VideoEncoder spin-up to first output ≈ 1.46–1.64 s** (same ~1.4–1.5 s
  constant as §7.1's first-frame catch-up) — the actual floor.

What draft-16 SUBSCRIBE_NAMESPACE would save: the discovery term (up to ~1.6 s of the
spread, i.e. the catalog-republish + roster-poll chain collapses to an announce push) —
but p50 barely moves unless the encoder is PRE-WARMED. A production flip should
configure+run the encoder at page load (or on "camera on") and discard output until
promoted; then draft-14's floor = republish cadence (0–2 s) and draft-16's ≈ RTT —
that's where the two drafts truly diverge. vs SFU spotlight cmd→video ~0.5 s
(plan-m2m §6 phase-2): MoQ-14 as-built is ~3× slower, but with encoder pre-warm +
draft-16 the structural floor is LOWER than the SFU's (no pull/renegotiate step at all).
Data: results/moq-mgrid-flips.jsonl.

### 13.4 Publisher death + rejoin (✅ 08:17–08:34Z; 3 SIGKILLs of a solo-Chrome victim at
N=10 steady, richer instrumentation each round; all clocks one host)

**What viewers observe when a publisher dies abruptly (identical in all 3 kills, both probes):**
| signal | when (after SIGKILL) |
|---|---|
| last decoded frame | −34…+37 ms (delivery just stops) |
| our silence watchdog (>500 ms no-frame, 100 ms scan) | **+539…+600 ms** (floor ≈3 frame intervals ≈200 ms @15 fps) |
| relay close / PUBLISH_DONE on the SERVED subscription | **NEVER** (observed 25–39 s windows; only a silent group-end marker ~+14 s) |
| re-subscribe behavior | clean-close/zero-groups until **announce GC at ~+10–15 s**, then hard `SUBSCRIBE code=4 "not found"` |

**Death detection verdict: CF draft-14 gives NO usable downstream death signal.** Detection
must be client-side silence heuristics (~200–600 ms at 15 fps) or app-level signaling — the
SFU/DO `left` broadcast (38–126 ms) has NO MoQ-14 equivalent; production would ride the same
RtcRoom DO for both worlds anyway.

**Rejoin — the trap field-guide (each arm measured):**
- **Same-name relaunch BEFORE corpse GC (+1.1 s): BRICKS THE NAMESPACE RELAY-WIDE.**
  The v2 publisher connects+publishes 15 fps happily forever, but NO session — old,
  lightly-used, or brand-new (k1check2, born post-GC) — ever receives a byte:
  subscribes are OK'd and starve (still dead at +3 m 45 s; §13.1's accidental >3 m 20 s
  reproduced under control). Recovery procedure PROVEN: drop the duplicate session,
  wait ≥GC (~15–20 s), publish again → a fresh viewer session acquired v3 in 2.5 s.
- **Same-name relaunch AFTER GC (+103 s): works — but only for viewer sessions that are
  not subscribe-exhausted** (fresh probes acquired h10-v2 normally).
- **Fresh-name relaunch (production path): clean.** Publisher restored to encoding in
  2.3 s after Chrome relaunch (0.8 s to PUBLISHED, +1.5 s encoder warmup); healthy
  viewer acquires it in the normal join time (seen→first p50 1.3–2.8 s across the
  ladder; brand-new viewer session end-to-end sample: 2.48 s). Total ≈2.5–3.5 s —
  same class as the SFU's measured 3.9 s relaunch cycle.

**The unifying discovery — per-session subscription EXHAUSTION (major):** viewer sessions
that churn subscribe retries permanently lose the ability to acquire ANY new track, while
their existing subscriptions keep flowing. Proven by: probes cycling a dead namespace at
~1/s starved on brand-new never-used names (k1) minutes later, while a fresh connection
acquired the same publisher in 2.3–2.5 s; three watcher sessions starved on k1-v3 that a
4th, brand-new session got instantly. Best-fit model: **a fixed per-session subscription
budget (~40–60; MAX_SUBSCRIBE_ID family) that is never replenished — closed AND failed
subscribes leak credits permanently.** This also reframes §13.2 gate 1: the "≈20-namespace
cap" = 2 tracks/pub ≈ the same budget. Client rule derived: **count your subscribes; when
nearing ~40, or when any track starves >5 s post-OK, RECONNECT the whole session (~150 ms
+ resubscribe) instead of retrying forever — retries only dig the hole deeper.**
Wire-level MAX_SUBSCRIBE_ID not captured (would need a raw-QUIC trace) — model marked
best-fit, behavior itself is 3×-reproduced fact. Data: results/moq-mgrid-{death-run,death,
k1check,k1check2,k1check3,h10check}.jsonl.

### 13.5 Verdict vs the SFU grid + artifacts + cleanup

| axis | SFU/WebRTC grid (plan-m2m §6) | CF MoQ draft-14 (this section) |
|---|---|---|
| capacity | N=54 pubs clean, p95 ~158 ms flat | N=20 clean (100 % valid, pooled p50 62 / p95 88 ms — LOWER latency); N=30 fails: per-session subscribe budget + this rig's encode ceiling; relay accepted 32 sessions without complaint |
| flip (crowd→spotlight) | cmd→video ~0.5 s | 1.49–1.69 s (p50 1.64 s), floor = encoder warm-up ~1.5 s, publish itself 0–1 ms on the live connection; with encoder pre-warm + draft-16 announce, structurally CAN beat the SFU |
| death detection | 38–126 ms (DO `left`) | no protocol signal at all; silence heuristic 0.2–0.6 s; announce GC +10–15 s |
| rejoin | ~3.9 s | fresh-name ~2.5–3.5 s; same-name pre-GC = namespace bricked minutes (relay-wide) |
| discovery | roster push (DO) | none in draft-14 (SUBSCRIBE_NAMESPACE is draft-16) — local registry shim here; production rides the same DO |

**One-sentence verdict: CF's draft-14 MoQ relay swallows 30+ concurrent publishers from one
machine with better latency than the SFU at N≤20, but the per-session subscription budget
(~40–60, never replenished), the total absence of a death signal, and the
brick-on-fast-same-name-rejoin behavior mean a production m2m grid on MoQ TODAY needs:
DO-based roster + death signaling, session-suffixed namespaces, subscribe-count-triggered
session reconnects, and viewers sharded ≲15 publishers per connection — none of which the
SFU path needs; grid-scale m2m stays on the SFU until draft-16 (+announce, +auth) retests.**

Artifacts: spike/{mgridserver.py, mgrid-rung.sh, mgrid-flipdrive.sh, mgrid-deathdrive.sh
(superseded by inline driving), mgrid-analyze.py}, spike/src/mgrid-{pub,probe,flip}.js
(+ www bundles/pages, Docker esbuild §6.3). Results: results/moq-mgrid-*.jsonl (14 files).
Logs: spike/logs/moq-mgrid*.log, headless udds spike/logs/moq-mgrid-*-udd (disposable).

Cleanup (08:35Z): ALL moq-mgrid Chromes killed (pubs, probes, victims, checkers, flip);
mgridserver.py :8887 stopped; roster gone with it. Siblings verified untouched and running
after cleanup: 4K publisher (moq-4k-pub-udd) + pubserver :8890, audio publisher
(moq-audio-pub-udd) + audioserver :8896, the §12 agent's mediamtx/ffmpeg stack, ports
8888/8889 agents. Namespaces positron-mgrid-* left to relay GC (all publishers dead;
free-beta relay, no persistent resources). No plan-file edits; §13 only.

⏱ END 2026-08-26 08:36 UTC — ~56 min active.

## 14. Draft-16 relay — AUTHENTICATED, provisioned (draft-16 agent; owns this section only)

⏱ START 2026-08-26 12:25 UTC. Relay provisioned by the user (§3 dashboard step DONE);
credentials in `.env` (MOQ_RELAY_ID + PUBSUB/SUB tokens — never printed, referred to by
role). Endpoint `https://draft-16.cloudflare.mediaoverquic.com/<token>`. Binaries: main
branch (draft-16) in volume `moq-target16` (§4). Docker VM clock resynced first (§4 trap).

### 14.1 Auth semantics (✅ measured 12:26Z; `test-d16-auth.sh`, results/moq-d16-auth.jsonl)

| token | connect | what happens |
|---|---|---|
| none | QUIC+WT ok | session closed **code=3 "scope resolution failed"** ~200 ms (clean, matches §4.2) |
| garbage | QUIC+WT ok | mid-SETUP stream end → client "decode error: fill buffer" (~110 ms; no clean MoQT error) |
| SUB, subscribe | ✅ full session | SETUP fine; subscribe itself works (14.2) |
| SUB, **publish** | ✅ full session | **rejected at MESSAGE level, not SETUP**: CLIENT_SETUP→SERVER_SETUP ok (ALPN/WT-protocol `moqt-16`, CONNECT 200), then `PUBLISH_NAMESPACE` → **`REQUEST_ERROR error_code=32 retry_interval=0`** ~280 ms later; session stays up |
| PUBSUB, publish | ✅ | PUBLISH_NAMESPACE accepted, ticks flow |

- **Session-establish latency** (5 runs, in-container, tracing timestamps): connecting→WT
  CONNECT 200 = 97–137 ms; →SERVER_SETUP (full MoQT session) = **112–162 ms, median ~136 ms**.
  Same class as draft-14's 125 ms browser number — **auth adds nothing measurable**.
- Draft-16 renames on the wire (observed): ANNOUNCE → **`PUBLISH_NAMESPACE`**; errors ride
  a generic **`REQUEST_ERROR`** with numeric codes (32 = unauthorized publish here; 16 seen
  on subscribe-to-nonexistent — explicit, ~1.5 s, NOT draft-14's optimistic-OK starvation).

### 14.2 Native pub/sub e2e (✅ 12:28Z; `test-d16-inner.sh`, results/moq-d16-clock.jsonl)

- **Clock** (pub=PUBSUB, sub=SUB token, one-clock §3.6 method, 40 s): 44/44 ticks,
  **steady p50 17.8 ms / p95 32.8 ms** (min 12.7, max 42.8, n=40) — identical to draft-14's
  17.9 ms p50, tighter tail (32.8 vs 61). Open-group catch-up replay on join: same as §3.6.
- **Media** (ffmpeg fMP4 → moq-pub → relay → moq-sub, 30 s): valid mov,mp4 5.02 MB,
  h264 640x360 + aac, duration 34.96 s (30 s + open-group catch-up), zero errors.
  moq-pub main-branch publishes a WARP catalog incl. audio samplerate/channelConfig.

### 14.3 Browser on draft-16 (✅ 12:34Z; §7 hang pipeline UNCHANGED except a token-redaction
log line; results/moq-d16-browser-e1.jsonl)

- **@moq/net negotiates draft-16 out of the box**: token-in-URL-path via `?relay=`, WT
  subprotocol pins `moqt-16` → SETUP path → `version=moq-transport-16`. Publisher
  connect **98 ms**, player **136 ms** (vs 125 ms draft-14 browser baseline — auth free).
- **No shim changes needed**: @moq/net's draft-16 SUBSCRIBE encoding (v15+ params as
  params) is accepted by CF — the §12 param-strip patch is a mediamtx-only need; CF-16
  needs NO per-message auth param when the token rides the URL path (native + browser both).
- hang pub (VP8 720p30) + player pair, 60 s: catalog on FIRST attempt, 1819/1820 frames
  decoded, 0 decode errors, 0 checksum fails; **g2g p50 30.0 / p90 42.2 / p95 48.2 ms**
  (max 1120 ms = the single join catch-up frame) — same class as draft-14's 26–34 ms
  (§7.1/§8.4). Auth + draft-16 cost nothing measurable in the media path.
- ⚠️ `@moq/net`'s `NO_DISCOVERY_HOSTS=["mediaoverquic.com"]` suffix-matches ALL CF MoQ
  hosts incl. draft-16 → `announced()` is disabled by default; pass
  `connect(url, {discovery: true})` to enable SUBSCRIBE_NAMESPACE on draft-16 (14.4).

### 14.4 THE HEADLINE — SUBSCRIBE_NAMESPACE (✅ 12:39–12:48Z; rig `spike/src/d16-announce.js`
+ `spike/d16server.py` :8886 (server-side one-clock timestamps); results/moq-d16-announce.jsonl)

**It works: subscribe a namespace PREFIX before any publisher exists → when a hang publisher
appears under it, the announce is PUSHED to the waiting session — no roster, no catalog
republish, no polling.** Watcher: `conn.announced(Path.from(prefix))` (prefix `d16annN`,
publisher ns `d16annN/p1` — tuple-prefix matching works). Both directions verified: replay
of EXISTING announces on a new SUBSCRIBE_NAMESPACE (~670 ms incl. round-trip) and push of
NEW announces to an existing one.

| run | publish→announce@sub | announce→catalog | announce→first video bytes |
|---|---|---|---|
| ann3 | 229 ms | (one-shot watch died on the race below) | — |
| ann4 | 789 ms | (same) | — |
| ann5 | 1191 ms | 145 ms (attempt 0) | 283 ms |
| ann6 | 428 ms | 716 ms (attempt 1) | 882 ms |
| ann7 | 176 ms | 679 ms (attempt 1) | 768 ms |

- **Announce push latency: 0.18–1.2 s (median ~430 ms, n=5)** — vs §13.3's draft-14
  discovery term 0.56–1.6 s of ROSTER POLL + CATALOG REPUBLISH app machinery. The 2 s
  catalog-republish hack is obsolete for discovery (catalog arrived on the announce-triggered
  subscribe every time); total publish→video-at-subscriber ≈ 1.0–1.5 s, encoder warmup incl.
- ⚠️ **Race: SUBSCRIBE within ~1 ms of the announce push fails** — `SUBSCRIBE error code=0
  "internal error"` + CF error UUID (3/5 runs; not seen when the push itself took >1 s).
  A 500 ms retry always succeeded on attempt 1. Announce ≠ subscribable-yet; keep a retry.
- ⚠️ **Interop gap — announce flap**: CF pushes a NEW announce as `PUBLISH_NAMESPACE` on a
  bidi stream it FINs right after receiving the OK; @moq/net models stream-lifetime =
  advertisement-lifetime → `active:true` then `active:false` 2–70 ms later (+ its consume-
  handle cache evicted). Replayed announces (SUBSCRIBE_NAMESPACE entries) do NOT flap. Treat
  `active:true` as edge-triggered and subscribe regardless; don't gate playback on "still
  active". (Also means: no announce-withdrawal signal is observable via @moq/net — the
  PUBLISH_NAMESPACE stream a withdrawal would ride is already gone.)
- ⚠️ Rig bug that cost 2 runs (self-inflicted, worth remembering): `Promise.race([ann.next(),
  timeout])` — the orphaned `next()` eats the announce event. Use a single blocking reader.
- **TRACK_STATUS** (native, `moq-clock-ietf --track-status`): sent before SUBSCRIBE for a
  LIVE track → CF answers `REQUEST_ERROR code=16 retry_interval=0 reason="track not found"`
  45 ms later, while the simultaneous SUBSCRIBE for the same track gets SUBSCRIBE_OK + data.
  So TRACK_STATUS is answered but NOT usable as a liveness probe today. (Also pins the code
  names: 16 = track not found; the code-32 of 14.1 = unauthorized.)
- **PUBLISH (push-before-subscriber)**: not exercisable — moq-rs's transport lib has
  `publish()` (sends PUBLISH) but no CLI drives it (moq-clock/moq-pub use PUBLISH_NAMESPACE);
  @moq/net only *decodes* PUBLISH and answers incoming ones with NOT_SUPPORTED. Untested.

**Publisher death on draft-16** (SIGKILL the hang publisher Chrome at a live subscriber):
the served video subscription ends CLEANLY (`nextGroup()` → end-of-track) **+14.05 s** after
the kill — an actual protocol signal where draft-14 gave silent starvation for 25–39 s
(§13.4). Still far too slow for UX: client-side silence heuristics (0.2–0.6 s) remain the
death detector; no announce withdrawal observable (flap caveat above).

### 14.5 §13 re-checks on draft-16 (✅ 12:51–12:55Z; results/moq-d16-{budget,rejoin}.jsonl)

1. **Subscribe budget: REPRODUCES, and the number is now exact — 50 requests/session.**
   One session churning subscribes to nonexistent namespaces: requests 1–50 each get a FAST
   explicit `SUBSCRIBE error code=16 "not found: Track not found"` (+ CF error UUID) — the
   optimistic-OK starvation of §7.3 is GONE. Requests 51+ never go out: CF grants a fixed
   request budget at SETUP and NEVER sends MAX_REQUEST_ID updates (matrix: "logged only"),
   so the spec-compliant client blocks locally; the session then cannot acquire even a LIVE
   broadcast (10/10 timeouts). This unifies §13.2's "≈20-namespace cap" and §13.4's "~40–60
   budget" into one fact: **50 requests, fixed, never replenished — failed AND closed
   requests consume budget forever.** Client rule unchanged: count requests, reconnect near
   ~45 (reconnect costs ~112–162 ms on d16). Grid viewer sharding stays: ≈2 tracks/pub ⇒
   ~20 publishers per connection, exactly §13.2's observed ceiling.
2. **Publisher death: a real (slow) protocol signal now exists.** Existing subscriptions end
   cleanly (`nextGroup()`→end / native "done") ~+14 s after SIGKILL — vs draft-14's silent
   25–39 s nothing. Fast detection still = client silence heuristics; no usable announce
   withdrawal via @moq/net (14.4 flap).
3. **Same-name rejoin: THE BRICK IS GONE.** Pre-GC same-name relaunch is EXPLICITLY REJECTED
   (`PUBLISH_NAMESPACE` → `REQUEST_ERROR code=32 retry_interval=0`, immediate) instead of
   draft-14's silent-accept-and-brick; rejected at +4/+10/+16 s post-kill, accepted by
   ~+18 s (GC horizon ≈16–18 s), after which a fresh subscriber gets live ticks instantly.
   A publisher can now retry-loop on the SAME name safely (or still session-suffix to skip
   the ~18 s wait). Draft-14's minutes-long relay-wide bricking did not reproduce.

### 14.6 Verdict for plan-m2m §1.C — what draft-16 changes

**(a) Delivery tier: production-viable NOW on auth grounds.** Isolated relay + tokens work
end-to-end (pub+sub scoping enforced at message level, sub-only enforced for publish,
no-token/garbage cleanly rejected); auth costs zero latency (session ~136 ms vs 125 ms d14;
native p50 17.8 ms vs 17.9; browser g2g p50 30 ms vs 26–34). Live-edge-only (no FETCH/
GOAWAY) and token-in-URL caveats (§5) unchanged. Mint short-lived per-client tokens.

**(b) MoQ-grid blockers list, rewritten by this session:**
- ~~out-of-band discovery + 2 s catalog republish~~ → SUBSCRIBE_NAMESPACE push, 0.2–1.2 s
  (median ~0.4 s), in-protocol. Keep a subscribe retry (~500 ms) for the announce race.
- ~~same-name rejoin bricks relay-wide~~ → explicit rejection until ~18 s GC, then clean.
- ~~silent optimistic-OK starvation~~ → explicit code=16 errors.
- STILL BLOCKING for grid scale: the fixed 50-request/session budget (never replenished) ⇒
  viewers shard ≲20 publishers/connection or reconnect-rotate; death signal still ~14 s ⇒
  DO-based death signaling stays; encoder pre-warm still owns the flip floor (§13.3).
**(c) Studio engine should target draft-16** — @moq/net does it TODAY with zero shim changes
(ALPN moqt-16 negotiated, token in URL path; only `discovery: true` needed for announce);
draft-14 remains the free open test bench. Watch draft-18 for the breaking migration.

Artifacts: `test-d16-auth.sh`, `test-d16-inner.sh`, `results-d16/` (rig/moq/); spike:
`d16server.py`, `src/d16-announce.js`, `src/d16-budget.js` (+ www pages/bundles), token-
redaction one-liners in src/pub.js+play.js (behavior otherwise untouched). Results:
results/moq-d16-{auth,clock,browser-e1,announce,budget,rejoin}.jsonl. Cleanup 12:56Z: all
moq-d16-* Chromes + d16server :8886 killed; containers were one-shot --rm; siblings
(:8890/:8896 publishers, moq-4k/moq-audio udds) untouched; namespaces left to relay GC.
NB tokens: never printed here; the SUB token transits local chrome-log URLs
(`spike/logs/moq-d16-*-chrome.log`) — local files, chmod'd repo, acceptable; rotate via
dashboard if ever shared.

⏱ END 2026-08-26 ~12:58 UTC — ~33 min active.
