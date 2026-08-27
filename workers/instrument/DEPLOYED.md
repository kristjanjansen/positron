# elektron-instrument — DEPLOYED

**URL:** `https://elektron-instrument.kristjan-jansen.workers.dev`
**Deployed:** 2026-08-27 (version `6473040f-b035-433e-a928-126815e8de6d`).
Status: **live and verified** — **54/54** end-to-end checks green from
`proto/instrument/harness/run-instrument.mjs` (one headless Chrome, three tabs,
real WebRTC, real audio+video return, real R2, a real 15 s network outage).

The control plane for the remote-instrument platform (`proto/instrument/`): a
public catalog of physical instruments plus 1:1 WebRTC signaling between exactly
one owner and one player, **plus the durable session log**. **No media ever
touches this worker in transit** — MIDI goes up a DataChannel and audio/video
come back on the same PeerConnection, peer to peer. The session log is a
separate thing: an explicit, consented POST from the two pages *after* the fact,
never a tap on the wire. It does not touch `elektron-rtc`, `elektron-jam`, or
`elektron-selfrec` (it reuses selfrec's chunk-upload *shape*, not its code, and
writes to a different prefix of the same bucket).

## Shape

**ONE Durable Object instance** (`idFromName('hub')`) holds every instrument and
every socket. v0 scale is a handful of instruments and one DO makes
registry/online/busy trivially consistent — no cross-DO fanout, no
eventual-consistency window. Hibernation API throughout, so an idle hub costs
nothing; the socket **attachments** are the state, not in-memory maps, so a wake
loses nothing.

**`online` and `busy` are derived from live sockets, never stored flags.** That
is the `left` pattern from `workers/rtc/DEPLOYED.md`: the socket close IS the
death detector (38–54 ms measured there, versus the 31–47 **second** SFU garbage
collect). An owner who closes the lid drops out of the catalog immediately and
the player is told on the same frame — which is what makes the host page's
all-notes-off reliable.

## Routes

| method | path | auth | purpose |
|---|---|---|---|
| GET | `/time` | **none** | `{now: epochMs}` skew estimator. Copied from `workers/selfrec` including the in-isolate rate guard (240 hits / 10 s → 429). Client protocol: sample N times, keep the **min-RTT** sample, `offset = serverNow + rtt/2 − clientRecv`. |
| GET | `/instruments` | **none** | public catalog: `{instruments:[{id,name,model,location,caps,registeredAt,lastSeen,online,busy,player,sessionSince}]}`, online first then by name. |
| POST | `/instruments/register` | token | `{id,name,model,location,caps[]}` → `{ok,instrument}`. Idempotent; re-register updates metadata and keeps `registeredAt`. |
| POST | `/instruments/heartbeat` | token | `{id}` → `{ok,lastSeen,online}`. Freshness for an owner who is registered but not socketed; the WS is the real liveness signal. |
| POST | `/instruments/unlist` | token | `{id}` → removes it from the catalog, ends any session, closes the host socket (4002). An owner must be able to leave, not just go quiet. |
| WS | `/ws?instrument=<id>&role=host&token=<T>&name=` | token | the owner's signaling socket. A second host socket for the same instrument **replaces** the first (closed 4001, emits no ghost events) — the rtc rejoin rule. |
| WS | `/ws?instrument=<id>&role=player&name=&pid=` | **none in v0** | the player's signaling socket. |

A literal `"ping"` on either socket gets `"pong"` by hibernation autoresponse —
pure network RTT, no DO wake (same as cues/jam).

## Session storage (`Sessions` DO — SQLite rows + R2 by reference)

A **second DO class**, one instance (`idFromName('log')`), **pinned to the EU
jurisdiction**. Verified pinned, not merely requested: `/sessions` returns
`euPinned:true` because `SESSIONS.jurisdiction('eu').idFromName('log')` and the
unpinned `SESSIONS.idFromName('log')` are different object ids
(`2d70bf43…` vs `ce73643a…`).

**Migration implication:** `Sessions` is a new class + new binding + migration
tag `v2`; the signaling `Hub` was deliberately **not** moved, so the instrument
registry did not move and no existing data was disturbed. If the Hub is ever
EU-pinned too, `jurisdiction('eu')` changes its id — the registry starts empty
and every owner must re-register. That was judged not worth doing here: the
registry holds instrument metadata the owner publishes on purpose; the session
log holds someone's playing and someone's room audio, which is the part that
needs a jurisdiction.

### Schema (rows, never a JSON blob — plan-timeline C4)

```sql
sessions(id TEXT PRIMARY KEY, instrument, playerId, startedAt, endedAt,
         noteCount, audioPrefix, avPrefix, playerToken, ownerToken,
         deletedBy, deletedAt)
events(sessionId TEXT, seq INTEGER, at INTEGER /* epoch µs */, kind TEXT,
       source TEXT, raw BLOB, display TEXT, ref INTEGER, payload TEXT)
CREATE INDEX events_by_time ON events(sessionId, at)
```

`ref` and `payload` are the two columns beyond the base shape, both nullable,
both still **one row per event**:

- **`ref`** — the `seq` this row points at in *another source's lane*. A host
  `midi-actuated` row refs the player's note `seq`, so `hostAt − playerAt` per
  note is a SQL join away. **The two lanes are the drift channel and are never
  reconciled into one.** Verified: pairing the stored lanes on `ref` reproduces
  the live one-way MIDI figure exactly (**p50 0.48 ms stored vs 0.48 ms live**,
  n=128).
- **`payload`** — small JSON detail for *marker* rows only (`media-span`
  phase + `mediaRef`). Never used for `midi` rows. This is not the C4 anti-
  pattern: C4 forbids one blob per *session*, not a detail field per row.

### Lanes

| source | kind | written by | clock |
|---|---|---|---|
| `player` | `midi` | play.js | the **player's** clock — their intent |
| `player` | `audio-span` | play.js | player clock; what they *received* |
| `instrument` | `midi-actuated` | host.js | the **host's** clock — what the hardware actually did |
| `instrument` | `media-span` | host.js | host clock; `phase:'start'|'end'` + `kind:'audio'|'av'` + `mediaRef` |
| `worker` | `session` | play.js | session lifecycle |

### Two media lanes: `audio` and `av`

The owner's consent has three rungs — **off · audio · audio+video** — and the
top rung runs **two** `MediaRecorder`s off the very tracks already on the wire:

| lane | recorder input | R2 prefix | `media-span` `kind` |
|---|---|---|---|
| `audio` | `[audioTrack]` | `instrument/<id>/audio/` | `audio` |
| `av` | `new MediaStream([audioTrack, panelVideoTrack])` — **one** webm with both | `instrument/<id>/av/` | `av` |

The `av` lane is the panel the player was actually watching (camera composited
in as background when one is selected), muxed with the instrument's sound in a
single file, so nothing has to be re-synced later. Measured codec on this
machine: **`video/webm;codecs=h264,opus`** — the probe reports
h264/avc1/vp8/vp9+opus all supported, and h264 is preferred because it makes any
later repackage a pure remux rather than a transcode. `vp8,opus` is the
fallback. 800 kb/s video + 64 kb/s audio, 2 s timeslice.

Each lane writes its **own** `media-span` start/end pair carrying
`payload.kind`, so a consumer tells an audio-only span from an A/V span without
opening a file. `play.js` **prefers the A/V span** on replay — a plain
`<video>` element fed the Blob-concatenated chunks (no MSE; only chunk 0 carries
the webm header, exactly as in the audio lane) — and falls back to audio-only.

Host actuation rows and the host's audio recording share one clock on one
machine, so **replay from storage uses the host lane as master** and needs no
cross-machine skew correction; the player's lane is rendered as intent.

### Routes

| method | path | auth | purpose |
|---|---|---|---|
| POST | `/session/<id>/events` | none | batched append `{instrument,playerId,events:[{at,kind,source,seq,raw,display,ref,payload}]}` → `{appended,rejected,total,noteCount}`. **Monotonic `seq` per (session, source)**: an event whose `seq` ≤ the stored max for its source is rejected *individually*, which makes a retried batch idempotent instead of fatal. Missing `seq` is auto-assigned `max+1`. Batch ≤ 2000. |
| POST | `/session/<id>/end` | none | `{endedAt?}` → stamps `endedAt`, recounts `noteCount`. |
| GET | `/session/<id>?from=&limit=` | none | `{session, lanes, from, limit, count, total, events[]}` ordered by `(at, seq)`. `from` is a row offset; `limit` ≤ 20000, default 5000. |
| GET | `/sessions?instrument=` | none | `{count, sessions[], jurisdiction, euPinned, euId, unpinnedId}`, newest first, tombstones included. |
| POST | `/session/<id>/delete` | **capability** | `{by:'player'|'owner'}` → tombstone. `player` needs `playerToken`; `owner` needs `ownerToken` **or** `INSTRUMENT_TOKEN`. |
| POST | `/session/<id>/{audio,av}/<seq>` | **capability** | raw webm chunk → `instrument/<id>/<lane>/chunk-<5d>.webm`. Needs `ownerToken` or `INSTRUMENT_TOKEN`. `X-Chunk-Sha256` is verified **server-side by R2 during the put** — a truncated body fails the put. ≤ 16 MB. |
| POST | `/session/<id>/{audio,av}/manifest` | **capability** | → `instrument/<id>/<lane>/manifest.json`; sets `audioPrefix` / `avPrefix`. |
| GET | `/session/<id>/{audio,av}` | none | what actually landed: `{prefix,lane,count,bytes,objects[]}` — this is the client's verify step. |
| GET | `/session/<id>/{audio,av}/<seq>` | none | one chunk, streamed. Replay fetches these in order and Blob-concats them. |

### Tombstones (plan-timeline C6)

`POST /session/<id>/delete` marks the row `{deletedBy, deletedAt}`, **physically
drops every event row**, and — if `audioPrefix` is set — sweeps the whole
`instrument/<id>/` R2 prefix and writes a `deleted.marker` there. Afterwards:

- a read is **410 + the tombstone**, never data;
- an **append is 410** — a late flush from a tab that never heard about the
  delete cannot resurrect the session (verified);
- an audio chunk POST is 410 — a draining recorder cannot re-fill the prefix.

**Who may delete what:** player-delete needs that session's `playerToken`,
owner-delete needs its `ownerToken` **or** `INSTRUMENT_TOKEN`. All four
outcomes (absent → 403, wrong → 403, right → 200, and INSTRUMENT_TOKEN still
200) are verified in the harness — as is the rule that **a tombstone outranks a
perfectly valid token**: a media upload to a deleted session is 410 even with
the correct `ownerToken`.

### Session ids and capability tokens

Minted **in the Hub, on `accept`**: one `sid`, sent to *both* parties on the
`{type:'session',state:'accepted'}` frame, plus **two 128-bit hex tokens** —
`playerToken` and `ownerToken` — written to the session row before either party
is told the session exists, and then handed out **one each**, on that party's
own copy of the frame. The player never sees the owner's token and vice versa.
Reads never echo them back; `/session/<id>` reports only `guarded: true`.

Clients send theirs as `X-Session-Token: <hex>` (or `?st=`); the worker
forwards it and the DO does a constant-time compare against the stored row.

**What this defends against, and what it does not.** These are **capabilities,
not identities** — there are still no accounts, no logins, nobody's name on
anything. What changed is that holding the session id is no longer the whole
capability: a share link, a screenshot, a log line or a URL in someone's history
now lets you *read* a session but not delete it and not upload media into it,
and the two parties' powers are separated from each other. What it does **not**
defend against: anyone who obtains the token string itself gets the full power
of that party (there is no binding to a device, a session cookie or an IP);
there is no expiry, no rotation and no revocation short of deleting the session;
a token leaked into a screenshot is as good as the original; `INSTRUMENT_TOKEN`
remains a master key over every session on the instrument; reads stay open by
design; and a session row created by a bare `events` POST that never went
through `accept` has no tokens at all (`guarded:false`) and keeps the old
id-is-the-capability rule. This closes the "anyone with the id can do anything"
hole. It is not an authentication system and does not pretend to be one.

### Durability: the IndexedDB backstop (both lanes)

Event batches and media chunks that fail to POST are parked in **IndexedDB** and
drained **oldest-first** on reconnect — `proto/selfrec`'s proven buffer, lifted
into `instrument-core.js` as `makeBackstop({name, send})` and used four times
(player events, host events, host audio chunks, host A/V chunks).

One rule selfrec did not need: **order is part of correctness here.** The DO
enforces a monotonic `seq` per `(session, source)`, so a batch that overtook a
parked one would be rejected as a duplicate and the parked one lost. Therefore
*once anything is parked, everything later is parked too, and the drain is the
only sender.* A chunk that is still parked when the manifest is written is named
there in `missing` with `degraded:true` — never dropped quietly.

Verified against a real 15 s outage (CDP `Network.emulateNetworkConditions`,
`offline:true`, both tabs) mid-session:

| lane | parked | drained | high water | drain time from reconnect |
|---|---|---|---|---|
| player events | 9 | 9 | 9 items / 6,925 B | **840 ms** |
| host events | 7 | 7 | 7 items / 7,708 B | **657 ms** |
| host audio chunks | 8 | 8 | 8 items / 123,859 B | **2,545 ms** |
| host A/V chunks | 8 | 8 | 8 items / 396,137 B | **3,208 ms** |

**80 player events logged → 80 stored. 80 actuations → 80 stored. 9 audio
chunks → 9 in R2, 9 A/V chunks → 9 in R2, `degraded:false` on both.** Zero lost
either way.

### CORS

`Access-Control-Allow-Headers` must list **`X-Chunk-Sha256`** (and now
**`X-Session-Token`**) or the chunk POST dies in preflight and the browser
reports only a bare `Failed to fetch`. Cost one harness run to find.

## Auth

`INSTRUMENT_TOKEN` (worker secret; value appended to the repo `.env`, gitignored).
Constant-time compare, **fails closed**. Required for registration, heartbeat,
unlist, and the **host** WS.

**Players need no token to play: the catalog is public and playing is public.**
That is a deliberate, stated limit, not an oversight — there is no account
system, no rate limit on session requests, and no way for an owner to allowlist
a player beyond pressing Accept. An owner exposing real hardware to the open
internet should treat the Accept button as the entire access-control system for
the *instrument*. The per-session capability tokens above govern only what
happens to the *recording* afterwards.

## WS frames (all JSON; the worker never parses SDP)

### client → server

```
{type:'request', name}                 player asks for the instrument
{type:'accept',  player:<pid>}         host grants it
{type:'reject',  player:<pid>, reason} host declines
{type:'end'}                           either side ends the session
{type:'signal',  kind:'offer'|'answer'|'ice', payload}
                                       relayed VERBATIM to the other peer
{type:'hb'}                            liveness + a serverNow sample
```

### server → client

```
{type:'hello', role, pid, instrument, online, busy, serverNow}   on connect
{type:'request', player:{pid,name}}                              → host
{type:'requested'}                                               → player, ack
{type:'session', state:'accepted', since, sid, token, player?, name?, instrument?}
      `token` is THIS party's capability: playerToken to the player, ownerToken
      to the host, on their own copy of the frame. Never both to one party.
{type:'session', state:'ended', reason, player?}
      reason ∈ 'host ended' | 'player ended' | 'player disconnected' |
               'host disconnected' | 'instrument unlisted'
      THE SAFETY EVENT: the host page fires all-notes-off on this frame.
{type:'rejected', reason, heldBy?, heldSince?, waiting?}
      reason 'busy' carries who holds it and since when — an honest no.
{type:'instrument', online:bool}       the owner appeared / vanished
{type:'signal', from:'host'|'player', pid, kind, payload}
{type:'hb', serverNow, online, busy}
{type:'error', of?, error}
```

## One player at a time

Enforced in the DO. A second player's `request` while a session is active gets
`{type:'rejected', reason:'busy', heldBy, heldSince, waiting}` — **v0 rejects, it
does not queue.** The `waiting` count is real (sockets connected to this
instrument with no active session), so a queue can be added later without a
protocol change, but nothing today promises anyone a turn.

## Measured (2026-08-27, verification run, `results/instr-verify.json`)

Both peers on one machine, clocks calibrated against the rig server's
`/time-local` (same-host truth, min-RTT 0.3–0.5 ms), so these are transport
numbers, not clock error. 64 notes = 128 MIDI frames (on + off).

| metric | value |
|---|---|
| one-way MIDI, player → instrument (DataChannel, unordered, maxRetransmits:0) | **p50 0.50 ms**, p95 1.1, p99 1.4, max 1.5 (n=128) |
| key → ear round trip (key → synth → Opus → onset worklet) | **p50 70.5 ms**, p95 73.9, p99 81.5, min 43.3 (n=64) |
| session setup: player offer → MIDI DataChannel open | **230 ms** |
| session setup: request click → playable | **634 ms** |
| host: answer → PeerConnection connected | **60 ms** |
| MIDI frames lost / duplicated / arriving late | 0 / 0 / 0 |

The one-way MIDI number reproduces the DC-direct floor from PROGRESS 6f (1.0 ms)
and the round trip reproduces the WebRTC audio-return figure from 6i (77.7 ms,
of which 98.6 % is the receiver's jitter buffer). Over a real internet path add
the RTT: the MIDI leg becomes ~RTT/2 and the return leg adds the same again on
top of the jitter buffer.
