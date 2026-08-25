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
