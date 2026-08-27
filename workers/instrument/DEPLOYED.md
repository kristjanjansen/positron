# elektron-instrument — DEPLOYED

**URL:** `https://elektron-instrument.kristjan-jansen.workers.dev`
**Deployed:** 2026-08-27 (version 71c48f45). Status: **live and verified** —
24/24 end-to-end checks green from `proto/instrument/harness/run-instrument.mjs`
(one headless Chrome, three tabs, real WebRTC, real audio return).

The control plane for the remote-instrument platform (`proto/instrument/`): a
public catalog of physical instruments plus 1:1 WebRTC signaling between exactly
one owner and one player. **No media ever touches this worker** — MIDI goes up a
DataChannel and audio/video come back on the same PeerConnection, peer to peer.
It does not touch `elektron-rtc`, `elektron-jam`, or `elektron-selfrec`.

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

## Auth

`INSTRUMENT_TOKEN` (worker secret; value appended to the repo `.env`, gitignored).
Constant-time compare, **fails closed**. Required for registration, heartbeat,
unlist, and the **host** WS.

**Players need no token in v0: the catalog is public and playing is public.**
That is a deliberate, stated v0 limit, not an oversight — there is no account
system, no rate limit on session requests, and no way for an owner to allowlist
a player beyond pressing Accept. An owner exposing real hardware to the open
internet should treat the Accept button as the entire access-control system.

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
{type:'session', state:'accepted', since, player?, name?, instrument?}
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
