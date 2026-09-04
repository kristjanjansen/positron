# elektron-rtc — DEPLOYED

> Public hostname is **`rtc.positron.studio`** (custom domain, 2026-09-04). The
> Worker script name is still `elektron-rtc` — renaming a script creates a NEW
> Worker and abandons its Durable Objects, so the name stays and the domain
> carries the identity. `*.workers.dev` is still enabled as a fallback.


**URL:** `https://rtc.positron.studio`
**Deployed:** 2026-08-26 07:17 (version b8842387). Status: **live and verified** (node WS clients,
2026-08-26 07:21). Protocol below is exactly as implemented — no changes were needed during
verification.
**Updated 2026-08-26 09:47 (version 53ab064b):** additive cue-log — cue frames are now also
persisted per room and readable via `GET /room/{name}/cuelog` (see table). No existing frame or
route changed; grid.html re-verified against the deployed worker after the redeploy (join +
SFU publish green).
**Updated 2026-08-26 20:46 (version 94211c97):** review fixes — operator role now requires
`opToken` (OPERATOR_TOKEN secret) on join, else demoted to audience; `publish` is enforced
against the stored perm window (error frame back when closed); rejoin with the same
participantId no longer emits a ghost `left` when the replaced socket closes; roster capped at
500 entries (dead-entry eviction, `room full` error otherwise); joiners now receive a cue
backlog (last ≤200 non-cancelled cues, `backlog:true`); new `cancel` frame (broadcast + cuelog
cancel record). Verified 14/14 node-WS checks + grid.html running against the deployed worker.

## Measured (deployed, from this machine)

| metric | value |
|---|---|
| join → roster snapshot | p50 33 ms, p95 64 ms (n=10) |
| publish → peer `published` broadcast, one-way | p50 38 ms, p95 49 ms (n=20) |
| literal ping→pong RTT (autoresponse, DO asleep) | p50 34 ms (matches cues 32–38 ms) |
| ungraceful socket kill → `left` at surviving peer | **38 / 45 / 54 ms** (n=3) — vs the 31–47 **s** SFU GC |
| `/cf/sessions/new` | 201 in 347 ms (239 ms proxy→SFU) |
| `/cf/…/tracks/new` (real offer → answer SDP) | 200 in 425 ms, `answer` 2540 B, 0 track errors |
| tile POST (12 KB JPEG) | 200 in 86 ms |
| tile GET fresh | cache hit, 28 ms, age 27 ms |
| tile GET at +7.5 s (past 6 s colo TTL) | DO-fallback hit (`X-Tile-Source: do`), age 7708 ms |
| tile rejects | >64 KB → 413, non-JPEG → 415, no token → 403 |

## Auth

Every WS upgrade, every `/cf/*` call, and tile **POSTs** require the room token:
`?token=<ROOM_TOKEN>` **or** header `Authorization: Bearer <ROOM_TOKEN>`.
The value is in the repo's `.env` as `ROOM_TOKEN` (gitignored — read it from there; never commit).
Tile **GETs** are open (they serve only ~10–25 KB JPEG stills).

## Endpoints

| method | path | auth | purpose |
|---|---|---|---|
| WS | `/room/{name}/ws` | token | RtcRoom signaling (one DO per room name) |
| GET | `/room/{name}/cuelog` | token | every cue frame the room has relayed, oldest first: `{count, cues:[{from, cue:{…, serverAt}, doRecvTs}]}` — the replay feed for recorded shows. Sender stamps inside `cue` (`at`, `sentAt`, …) are stored verbatim and are the only timing authority; `serverAt`/`doRecvTs` are DO-clock breadcrumbs (frozen during execution, ±70 ms — never use for fine timing). Capped at the last 1000 cues per room. |
| POST/PUT/GET | `/cf/{subpath}` | token | SFU proxy → `rtc.live.cloudflare.com/v1/apps/{appId}/{subpath}` (secret + UA added server-side) |
| POST | `/tile/{room}/{participantId}` | token | JPEG snapshot tile, body = raw JPEG bytes, **max 64 KB**, must start with JPEG magic (FFD8) |
| GET | `/tile/{room}/{participantId}` | open | latest tile; `Cache-Control: max-age=2`; headers `X-Tile-Source: cache\|do`, `X-Tile-Age-Ms` |

CORS: `*` on everything (OPTIONS preflight handled), so pages served from anywhere (localhost
included) can call all of it.

## SFU proxy usage

Exactly the shapes from `proto/m2m/server.py` / plan-m2m §1.A, minus the auth header (the worker
adds it):

```
POST /cf/sessions/new                              → 201 {sessionId, sessionDescription}
POST /cf/sessions/{sid}/tracks/new                 → publish/pull tracks
PUT  /cf/sessions/{sid}/renegotiate                → answer SDP after pulls
PUT  /cf/sessions/{sid}/tracks/close               → close pulled tracks
GET  /cf/sessions/{sid}                            → session state
```

Response passes through verbatim (status + JSON body); `X-Proxy-Ms` header = worker→SFU time.

## WebSocket frame protocol (as implemented)

All frames JSON. A literal `"ping"` string (not JSON) gets a literal `"pong"` back without waking
the DO — use that for keepalive/RTT. A JSON `{type:'ping', t0}` gets `{type:'pong', t0, t1}` with
the DO wall clock (wakes the DO; use sparingly).

### client → server

```
{type:'join', participantId?, name?, role, opToken?}
    role ∈ performer|audience|operator (default audience).
    role 'operator' must be EARNED: opToken must equal the OPERATOR_TOKEN worker
    secret (in the repo .env), else the join is DEMOTED to audience — check
    roster.self.role to learn your effective role.
    participantId optional ([\w.-]{1,64}); server assigns an 8-char id if omitted.
    Rejoin with the same participantId replaces the old roster entry AND detaches
    the old socket (server closes it 4001; its close emits NO 'left').
    Roster is capped at 500 entries: past the cap, the oldest entries with no
    live socket are evicted; if all are live the join gets {type:'error',
    of:'join', error:'room full'}.
{type:'publish', sessionId, trackNames:[...]}
    After your SFU tracks/new succeeds. trackName convention: <participantId>/<mic|cam|screen>.
    ENFORCED against the perm window: per-participant grant, then per-role grant,
    else OPEN. When closed for you: {type:'error', of:'publish', error} back,
    nothing broadcast.
{type:'unpublish', trackNames?}          omitted trackNames = unpublish everything
{type:'perm', grant:{role?|participantId?, publish:bool}}     operator only
{type:'promote', participantId, tier}    tier ∈ wall|live|featured    operator only
{type:'demote',  participantId, tier}    same shape                   operator only
{type:'cue', cue:{...}}                  trivial passthrough broadcast
{type:'cancel', id}                      unschedule a cue: broadcast + a cancel
                                         record ({kind:'cancel', id}) appended to
                                         the cuelog so replay skips it
```

### server → client

```
{type:'roster', self:{id, role}, participants:[...], perm:{publish:{...}}}
    Sent ONLY to the joiner, immediately after their join frame. Each participant:
    {id, name, role, tier, sessionId, trackNames:[], joinedAt}
    tier tells you what to do per participant: 'wall' → poll /tile/ snapshots;
    'live'/'featured' → pull their tracks over the SFU.
{type:'joined', participant:{...}}                     broadcast to everyone else
{type:'published', participantId, sessionId, trackNames}   broadcast to ALL (sender included)
{type:'unpublished', participantId, trackNames|null}       broadcast to ALL
{type:'left', participantId}
    Broadcast the instant the socket closes/errors. THIS IS THE DEATH DETECTOR:
    dead publishers emit NO track-level events (tiles freeze silently; the SFU
    410s their session only at +31–47 s). On 'left': drop their tiles and
    tracks/close any pulls from their sessionId.
{type:'perm', grant:{...}, by}                         publish-window open/close
{type:'promote'|'demote', participantId, tier, by}     re-evaluate pull vs poll
{type:'cue', cue:{..., serverAt}, from, backlog?}
    backlog:true = a catch-up replay of a stored cue, sent to a NEW JOINER right
    after their roster snapshot (last ≤200 non-cancelled cues, oldest first) so a
    reconnecting stage catches up. Dedupe by cue.id if you already fired it.
{type:'cancel', id, from}                              drop the pending cue
{type:'error', of:'join'|'publish', error}             rejected frame (sender only)
{type:'pong', t0, t1}                                  reply to JSON ping only
```

### Semantics / rules for clients

- **Reconnect = rebuild, never patch**: new WS → `join` (same participantId) → new SFU session →
  `publish` with the new sessionId. Peers treat a re-`published` as unpublish+publish (fresh pull).
- Roster survives DO restarts (storage-backed); broadcasts are sent BEFORE persistence, so deltas
  are not delayed by storage (~50 ms saved, measured on cues).
- Do NOT relay continuous telemetry (audio levels etc.) through the room — edge events only
  (plan-m2m §3 rate discipline).
- Everyone joins at tier `wall`. Wall-tier participants should POST a JPEG tile every ~2 s and
  everyone polls `GET /tile/{room}/{id}` every ~2 s for each wall tile they display.
- Snapshot tiles: colo cache TTL 6 s + latest-copy fallback in the DO; `X-Tile-Source` header
  tells you which store served. Prototype-grade; production = R2/KV.

## Env var names (worker-side)

- `CF_REALTIME_APP_ID` — plain var in wrangler.jsonc
- `CF_REALTIME_APP_SECRET` — Worker secret (never in code or client)
- `ROOM_TOKEN` — Worker secret; same value appended to repo `.env`
- `OPERATOR_TOKEN` — Worker secret; same value in repo `.env`. Join frames
  claiming role operator must carry it as `opToken` or they are demoted to
  audience (fail closed if the secret is unset). Operator clients read it from
  `.env` (score.mjs, operator.mjs) or take it as the `optoken` page param
  (grid/show/composite.html, wired through by the run drivers).
