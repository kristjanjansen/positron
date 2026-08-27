# elektron-jam — DEPLOYED

**URL:** `https://elektron-jam.kristjan-jansen.workers.dev`
**Deployed:** 2026-08-27 (version 3cd1242f). Built for proto/jam's latency
matrix; kept because it is tiny and generally useful: the minimal-relay
counterpart to elektron-cues.

One DO per room, verbatim relay: every WS message (text OR binary, ≤4 KB) is
sent to EVERY socket in the room, **sender included** (the loopback-through-
server ordering point, research/timeline-own-prior-art §1.5). No parse, no
storage, no backlog, no envelope — sender stamps live inside the payload and
are never touched (§2 "never re-stamp").

```
wss://elektron-jam.kristjan-jansen.workers.dev/room/<name>/ws?token=<JAM_TOKEN>
```

- Auth: `?token=` or `Authorization: Bearer`, must equal the JAM_TOKEN worker
  secret (value appended to repo `.env`). Fails closed.
- Literal `"ping"` → `"pong"` via hibernation autoresponse (no DO wake) — pure
  network RTT probe, same as cues.
- Hibernation API: idle rooms cost nothing.

## Measured (2026-08-27, from this machine — see proto/jam/results/)

| metric | value |
|---|---|
| one-way browser→DO→browser, 16-B binary frame | see proto/jam matrix (jam-bin) |
| one-way browser→DO→browser, ~130-B JSON | see proto/jam matrix (jam-json) |
| node probe, binary one-way | ~41 ms; autoresponse ping RTT 39 ms |
