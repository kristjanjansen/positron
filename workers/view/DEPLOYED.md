# positron.studio — DEPLOYED

> Worker **script name** is still `elektron-view`. That is deliberate: renaming a
> script creates a NEW Worker and abandons the `Gate` Durable Object holding the
> durable ERR cache. The public identity is the custom domain; the script name is
> an internal handle nobody types.

**URL:** `https://positron.studio`
**Deployed:** 2026-09-04 (version `956b3e28-069d-4c68-acec-cd1b87ff0006` — the
positron rename: 4 asset files); previously 2026-08-30
(`913f128a-…`), 2026-08-28 (`09366c36-…`).

Status: **live**, with **two known failures in `verify.mjs`, both predating the
rename** — the "38/38 green" claim above dated from `2dcc0cb` and no longer holds:

1. `index · lists all four pages` — the assert hardcodes `links.length === 4`,
   but the menu has had **five** cards since looper landed (2026-08-30). Stale
   assert, not a page fault.
2. `megatimeline · boot completed (__mt.ready)` — **`/timeline/strip.mjs` 404s.**
   `proto/megatimeline/index.html` began importing `/timeline/strip.mjs` in
   `3647696`, but that file was never added to the `build.mjs` allowlist, so it
   is absent from `public/`. The module graph fails, `window.__mt` is never set,
   and the page is **dead on the public URL — since 2026-08-30, not since the
   rename** (its assets were byte-identical across the rename deploy).
   Fix is one line: add `['timeline/strip.mjs', 'timeline/strip.mjs']` to the
   `FILES` allowlist in `workers/view/build.mjs`, rebuild, redeploy.

Verified by hand after the move: apex + `www` 200 serving
`POSITRON — viewing surfaces`, `/proto/looper/` 200, `positron-looper` channel
name live in the shipped `peer.mjs`, `/api/stats` 200. (`/api/search` 404s on the
old `*.workers.dev` hostname too — pre-existing, not a move regression.)

The repo's public surfaces on one phone-openable link, behind a menu. Free
tier, **custom domain `positron.studio` + `www`** (added 2026-09-04; zone on
Cloudflare Registrar), no secrets, ≈ $0. The `*.workers.dev` hostname is **still
enabled** (`workers_dev: true`), so every pre-move link still resolves.

| # | page | URL |
|---|---|---|
| — | menu | `https://positron.studio/` |
| 1 | megatimeline | `…/proto/megatimeline/` |
| 2 | remixer | `…/proto/remixer/` |
| 3 | kurenniemi | `…/proto/kurenniemi/` |
| 4 | flipper | `…/proto/flipper/` |
| 5 | **looper** | `…/proto/looper/` |

## The looper (added 2026-08-30)

The first page here that is an **instrument rather than a viewer**, and the
first with **no upstream of any kind**: no ERR, no proxy, no Durable Object, no
network at all once the page has loaded. That is also the answer to "why did it
need a node script to run" — it never did. `proto/looper/server.mjs` is a local
static file server that exists only because a browser will not load ES modules
from a `file://` path. There is no backend to deploy, only files to serve.

Added to the allowlist: `proto/looper/{index.html, looper.mjs, synth.mjs,
peer.mjs, onset-worklet.js}` plus three more library modules the viewers did not
need (`timeline/{nested,score,logdeck}.mjs`). **`onset-worklet.js` is fetched at
runtime by URL** (`addModule('./onset-worklet.js')`) rather than imported, so
nothing would have flagged its absence — the failure mode is an ear that
silently detects nothing.

**Verified against this URL**, one headless Chrome at 390 × 844 with touch
emulation: page loads, `AudioContext` running, 13 keys, worklet loaded, **0
failed requests, 0 exceptions**, and a real `Input.dispatchTouchEvent` on a key
produced a trace row *and* an onset detected in the output samples. Reported
output latency 37.3 ms.

⚠ **Rooms (`?room=NAME`) are same-browser only as deployed.** The default
transport is a `BroadcastChannel`, which does not cross devices. Cross-device
play needs a relay: the page accepts `?relay=wss://…`, and `elektron-jam` is
deployed and does exactly this job — but it is **token-gated**, and a token
pasted into a public page is a published token. So cross-device rooms are a
deliberate gap, not an oversight; closing it means either a tokenless
rate-limited relay or a per-room capability URL.

⚠ **Two things this deploy does not prove**: Safari (the verification is Blink
with a small viewport), and the **audio unlock** — headless Chrome runs with
`--autoplay-policy=no-user-gesture-required`, so the suspended-context path is
dead code in every harness we have. On a real iPhone it is the first thing that
can fail.

## Shape

**Static assets do nearly everything.** `wrangler.jsonc` binds
`assets.directory = ./public`; every page, every ES module, `census.json`,
`corpus.json`, both copies of `hls.min.js` and every committed cache entry are
served straight from Cloudflare's edge without the Worker running at all.
`src/index.js` executes only for `/api/*`, `/icy/*` and `/report`.

**`public/` is built, not committed, and never a directory glob.** `build.mjs`
copies an **explicit 12-file allowlist** out of the repo. This is a safety
property, not tidiness: the repo root holds `.env` with 13 live secrets, and an
assets directory is uploaded publicly and verbatim. A glob would have shipped
it. Run `node build.mjs` before every deploy.

**The asset layout mirrors the repo on purpose**, so every page's imports
resolve untouched, exactly as under its own dev server:

| page's import | resolves to | why it works |
|---|---|---|
| kurenniemi `../../timeline/transport.mjs` | `/timeline/transport.mjs` | served at `/proto/kurenniemi/`, `..` clamps at root |
| remixer `/timeline/transport.mjs` | `/timeline/transport.mjs` | absolute, same file |
| megatimeline `./viewport.mjs` | `/proto/megatimeline/viewport.mjs` | relative |
| megatimeline `/census.json` | `/census.json` | absolute → a **root copy** of the same file |

`timeline/transport.mjs` and `media-master.mjs` are **loaded, never copied into
a proto** — one canonical copy, the same aliasing the dev servers do.

## Routes (everything else is a static asset)

| method | path | purpose |
|---|---|---|
| POST | `/api/search` | the **one** proxied upstream: `arhiiv.err.ee/api/v1/search`. Cached, gated, validated. |
| GET | `/api/item/{audio\|video\|photo}/{slug}` | content record via `…/api/v1/content/{type}/{slug}`. Same cache and gate. |
| GET | `/api/stats` | what the gate has actually done. Linked from the menu footer. |
| GET | `/icy/{mount}.mp3` | **stub, not a proxy.** Always `{title:null}`. |
| POST | `/report` | autotest sink. `204`, nothing stored. |
| — | anything else | `404` from the Worker (`not_found_handling: "none"`, no SPA fallback). |

**No CORS headers are ever sent**, and a request carrying a foreign `Origin` is
refused `403`. Our own pages are same-origin so they never preflight and always
pass; nobody else's page can use or read this proxy.

## What is static, what is proxied, what goes direct

| traffic | path | why |
|---|---|---|
| all four pages, modules, `hls.min.js` | **static asset** | — |
| `census.json` (megatimeline), `corpus.json` (kurenniemi) | **static asset** | committed in the repo; the pages boot with real data and **zero** upstream calls |
| 9 archive search results + 1 content record | **static asset** under `/cache/` | megatimeline's committed JSONL caches, exploded one-file-per-query at build time |
| `POST /api/v1/search` | **proxied** | the only endpoint that *must* be. Its OPTIONS preflight answers 204 **without** `access-control-allow-origin`, so a browser can never call it directly (`research/err-archives-2026-08.md`) |
| content `GET`s from remixer | **direct from the browser** | already `ACAO: *`; a simple request needs no preflight and no proxy |
| HLS media (`vod.err.ee`, `live.err.ee`) | **direct** | CORS-clear |
| kurenniemi media | **direct from archive.org** | nothing re-hosted |
| thumbnails (`arhiiv-images.err.ee`) | **direct**, plain `<img>` | no ACAO upstream; fine in an `<img>`, taints canvas |

**Nothing media-shaped is ever proxied or stored by this Worker.**

## The rate limiter — what it actually guarantees

A **single Durable Object instance**, `GATE.idFromName('err')`, sits in front of
every upstream call this deployment makes.

**This is a real global gate, not a per-isolate approximation.** Every isolate
in every colo routes through the same object, a DO runs single-threaded, and
`acquire()` does its entire read-reserve-write **synchronously** — no `await`
before the state is written — so two concurrent callers cannot take the same
slot. The caller is told how many ms to wait and does the waiting in the Worker,
so a queue costs DO time nothing and stays correctly spaced.

Guarantees, precisely:

* **≥ 1000 ms between upstream calls, globally.** Not per isolate, not per
  visitor, not per colo. Across the whole deployment.
* **≤ 400 upstream calls per UTC day, globally.** Hard ceiling across all
  visitors, counted in SQLite so an eviction does not reset it. Past it, every
  request gets `503` with `Retry-After` and no upstream call happens.
* **A queue deeper than 6 s is refused**, not silently held: `503` +
  `Retry-After`. Backpressure the visitor can see.
* **Descriptive `User-Agent`** on every upstream request, naming the project and
  a contact address.
* **Not an open proxy.** The upstream host and path are constants. The search
  body must parse as JSON and contain a `queryParams` object with a valid
  `type` and a `limit` in 1–500; the **validated object is re-serialised** so
  nothing else in the caller's body travels upstream. Item refs must match
  `(audio|video|photo)/[a-z0-9-]{1,120}`. Bodies over 4 kB are rejected.
  Nothing a caller sends can redirect this at another host, path or verb.

Honest limits:

* The daily cap and the spacing are **enforced, but generous by design**. This
  is a prototype menu, not a scraper; 400/day is a ceiling to make abuse
  bounded, not a budget anyone should reach.
* **`caches.default` is not used.** It *was* a no-op on `workers.dev`
  subdomains, so relying on it would have been a cache that silently did
  nothing. The durable cache below is used instead, and is real. **The
  2026-09-04 move to `positron.studio` reversed that premise** — a custom
  domain has a real edge cache, so the Cache API is now an available option
  rather than a dead end. Still unused, but now by choice: the durable cache
  spans isolates and colos, which `caches.default` does not.
* The **in-isolate memo** (60 entries) is genuinely per-isolate and lost on
  eviction. It is a nicety in front of the durable cache, never the guarantee.

### Caching, three layers deep

1. **Committed** — the repo's own cache entries, static assets, permanent,
   global, free. Zero upstream, zero DO.
2. **Durable** — the `Gate` DO's SQLite table: anything this deployment has
   fetched once, for **everyone**, for **2 days** (honouring the archive's own
   2-day cache headers rather than inventing a TTL). 150 rows, oldest evicted,
   bodies over 1 MB skipped. This is what stops N visitors becoming N calls.
3. **Memo** — per-isolate, 60 entries.

Every response says which layer answered: `x-positron-cache:
committed|durable|memo|miss` and `x-positron-upstream: 0|1`.

## Deployed-copy rewrites (the protos are NOT modified)

`build.mjs` rewrites two files **as it copies them**. `proto/` itself is
untouched; these live in the build so the deployed copy works from a phone.

1. **`proto/megatimeline/index.html`** — `const REMIXER =
   'http://localhost:8891'` → `'/proto/remixer'`, plus the help line quoting the
   same port. The "PLAY IN REMIXER ↗" hand-off opens `${REMIXER}/?play=…`, which
   on a phone was a link to nothing.
2. **`proto/flipper/index.html`** — inserts the viewport meta.
   **flipper has none.** `research/mobile-2026-08.md` §3 names exactly this bug
   — "the single biggest bug on three of the four public surfaces" — and fixed
   it in megatimeline, remixer, kurenniemi and replay. **flipper was not in that
   pass.** Without it a phone lays the page out at 980 px and shrinks it to
   ~40 %. Measured at a true 390 px layout it is already fluid (0 px overflow,
   tiles and HUD intact, live streams playing), so the deployed copy gets the
   same line the other three carry, verbatim. **The missing meta is a real gap
   in `proto/flipper/` and deserves its own commit there.**

`favicon.ico` is **generated** by `build.mjs` (a 32×32 PNG in an ICO container,
182 bytes), not committed. Browsers request `/favicon.ico` for every page
regardless of the HTML; without it each proto logged a 404 and "zero console
errors" was not true.

## Verification (2026-08-28, `verify.mjs`, one headless Chrome)

390 × 844, `deviceScaleFactor: 3`, `mobile: true`, touch emulation with 5 touch
points, and `pointer: coarse` / `hover: none` forced — each page asks
`pointer: coarse`, not a width, so without that a headless Chrome gets the
**desktop** branch at phone width.

**38/38 pass. Zero horizontal overflow on all five pages. Zero page console
errors on all five pages.**

| page | measured |
|---|---|
| menu | 4 links, 127 px tap targets, 390/390 |
| megatimeline | `__mt.ready`, census **119 years**, totals audio **133 718** / video **79 422** / photo **234 478**, canvas **63 distinct colours, 1927 lit samples** (bars really drawn), touch help branch shown, no `localhost` in the DOM, **0** upstream calls on load; dive into 1965 → tier `years`, **765 items**, **9/9 searches from cache** |
| remixer | shared `/timeline/` lib loaded, hls.js loaded, `dialYear(1965)` search **round-tripped through the proxy 200 `cache=durable upstream=0`**, 6 layers, 0 page errors |
| kurenniemi | corpus **22 items**, **5 lanes / 22 item blocks** rendered, deck constructed (`../../timeline` resolved) |
| flipper | tiles rendered, 3 `<video>`, live streams reached `readyState>0`, 390/390 after the viewport fix |

**Upstream ERR archive-API calls for the whole final run: 0** — the committed
cache and the durable DO cache absorbed everything. The entire
deploy-and-verify effort cost **8** upstream calls in total, all gated ≥ 1 s
apart, none refused (`/api/stats`: `upstreamTotal: 8, refusedBusy: 0,
refusedCap: 0`).

## Known limitations

* **flipper's live streams are only mostly CORS-clear.** The manifests carry
  `ACAO: *`, but `live.err.ee` answers some segment requests **403/404 without
  an `access-control-allow-origin` header**, which a browser can only report as
  a CORS error; hls.js logs it and one tile can stall. Seen 4× in the
  verification run, on 1 of 3 tiles. This is a property of ERR's live CDN from
  any origin that is not ERR's own. The only fix would be proxying live video
  through this Worker — exactly the media-shaped proxying this deployment
  refuses — so it is **reported, not hidden**: `verify.mjs` counts and names
  these separately from page errors rather than swallowing them.
* **The ICY now-playing line in flipper is empty.** `/icy/*` is a stub. Reading
  ICY metadata means opening the live MP3 and pulling audio bytes until a
  metadata block arrives — running someone else's radio through this Worker to
  scrape a song title. Not worth it. The stub returns a well-formed
  `{title:null}` so the page's `catch {}` stays quiet and the console stays
  clean; channel list, streams and flipping all work without it.
* **Autoplay.** iOS holds audio until the first tap. Every page is built for
  this (remixer primes its media elements on the first gesture), but the first
  tap is still required — the menu says so.
* **remixer's content GETs are not gated by us.** They go direct from the
  browser (they are CORS-clear and need no proxy), rate-limited by the page's
  own client-side `gated()` helper. They are the visitor's own requests, one
  per item, browser-cached.
* **`/report` stores nothing.** Unlike `workers/moq-safari`, this deployment has
  no beacon store; it is a viewer, not a collector.

## Redeploy

```sh
cd workers/view && node build.mjs \
  && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN wrangler deploy
node verify.mjs        # 38/38, writes verify-report.json + shots/
```

The `env -u` is the house auth trap (`workers/osc/DEPLOYED.md`): a
`CF_API_TOKEN` in the environment overrides the OAuth login and deploys to the
wrong place. `workers/view/` has no `.env` of its own, which is the other half
of the fix.
