# elektron-osc — DEPLOYED

> Public hostname is **`osc.positron.studio`** (custom domain, 2026-09-04). The
> Worker script name is still `elektron-osc` — renaming a script creates a NEW
> Worker and abandons its Durable Objects, so the name stays and the domain
> carries the identity. `*.workers.dev` is still enabled as a fallback.


```
https://osc.positron.studio
wss://osc.positron.studio/room/<name>/ws?token=<OSC_TOKEN>
GET  /room/<name>/stats?token=<OSC_TOKEN>   -> {sockets, relayed, dropped, bytes}
```

- Deployed 2026-08-28, version `d38c55e1-53e2-4bbf-ba33-238996c9a5e0`.
- DO class `OscRoom`, binding `ROOMS`, sqlite migration `v1`.
- Secret `OSC_TOKEN` set via `wrangler secret put` and appended to the repo
  `.env` (gitignored) so `proto/osc/server.mjs`'s `/env.json` can hand it to a
  page.

Deploy (from a shell with **no `.env` sourced** — wrangler honours the legacy
`CF_API_TOKEN` name, which is not Workers-scoped):

```
cd workers/osc && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN wrangler deploy
```

## Shape

Verbatim relay, hibernation WebSockets, fail-closed constant-time auth — the
`elektron-jam` skeleton. Three differences, each deliberate:

1. **64 KB frame roof** (jam's is 4 KB). An OSC bundle of 8 messages with string
   arguments is bigger than a 16-byte note, and a state assertion re-sending 200
   levels is bigger still.
2. **It counts.** `/stats` returns relayed/dropped/bytes. A relay that cannot
   say how many packets it forwarded cannot be used to attribute loss, and
   attributing loss is the whole job in a transport comparison.
3. **It never parses and never re-stamps.** A bundle's time tag is the sender's
   claim about when its contents happen; rewriting it would destroy the field
   the timeline derives `at` from, and splitting a bundle would break atomicity
   at the one layer that cannot detect it. One WebSocket message in, one out —
   which is why this transport gets bundle integrity for free.

## Measured (2026-08-28, n=300 bundles of 3–8 messages, node, one clock)

| shape | loss | integrity | p50 | p95 | p99 |
|---|---|---|---|---|---|
| burst (40 ms) | 0 % | 100 % | 37.5 | 45.1 | 58.6 |
| sparse (300 ms) | 0 % | 100 % | 37.9 | 79.1 | **446.7** |
| chord | 0 % | 100 % | 37.4 | 52.9 | 68.6 |

The sparse p99 is the TCP sparse-traffic tail already characterised in session
6f: with no packets in flight there is no fast retransmit, so a loss costs a
full RTO. It is a property of TCP under gaps, not of this worker.
