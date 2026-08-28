# elektron-view — DEPLOYED

**URL:** `https://elektron-view.kristjan-jansen.workers.dev`
**Deployed:** 2026-08-28 (version `09366c36-2c0c-4c3b-baaa-545707f24d54`).
Status: **live and verified** — **38/38** checks green from `verify.mjs`, one
headless Chrome at **390 × 844** with touch emulation and `pointer: coarse`
forced, driven against this URL (not a local server).

The repo's four public viewing surfaces on one phone-openable link, behind a
menu. Free tier, workers.dev, no custom domain, no secrets, ≈ $0.

| # | page | URL |
|---|---|---|
| — | menu | `https://elektron-view.kristjan-jansen.workers.dev/` |
| 1 | megatimeline | `…/proto/megatimeline/` |
| 2 | remixer | `…/proto/remixer/` |
| 3 | kurenniemi | `…/proto/kurenniemi/` |
| 4 | flipper | `…/proto/flipper/` |

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
* **`caches.default` is not used.** The Cache API is a no-op on `workers.dev`
  subdomains, so relying on it would have been a cache that silently did
  nothing. The durable cache below is used instead, and is real.
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

Every response says which layer answered: `x-elektron-cache:
committed|durable|memo|miss` and `x-elektron-upstream: 0|1`.

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
