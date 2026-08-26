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
   e.g. `elektron-rig`.
4. **The creation screen is shown ONCE and secrets are never retrievable again.** It returns:
   - the **relay ID**,
   - **two default tokens**: one with `publish+subscribe` operations, one `subscribe`-only.
   Copy all three **before leaving the page**.
5. Save them into `/Users/s32863/personal/elektron/.env` (already chmod 600, gitignored) as:
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
cd /Users/s32863/personal/elektron/rig/moq
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
docker run --rm -v /Users/s32863/personal/elektron/rig/moq:/moq -v moq-target14:/target \
  moq-dev bash /moq/test-draft14-inner.sh clock 40
docker run --rm -v /Users/s32863/personal/elektron/rig/moq:/moq -v moq-target14:/target \
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
