# Cloudflare Containers, the new `durable_object` runtime against the legacy class (2026-10-07)

Measured on this account, 2026-10-07 between 15:53Z and 16:06Z, with positron's
own test image (node:22-alpine plus ffmpeg, the `server.mjs` from
`rig/containers/container/`), from a laptop in Tallinn. Both runtimes were
driven from the same script in the same minutes, cycles interleaved legacy, new,
legacy, new, so neither gets a better hour than the other.

Labels: **MEASURED** is a number this run produced. **QUOTED** is a sentence or
figure copied from Cloudflare. **INFERRED** is this reader's judgement.

Test beds:

- legacy: `rig/containers/` unchanged, worker `positron-cnt-test`,
  `@cloudflare/containers` 0.0.28 (the version `workers/pub` uses), `class
  RepackTest extends Container`, `instance_type: "standard"` (wrangler warns it
  is the old name of `standard-1`), `max_instances: 1`.
- new: `rig/containers-next/`, worker `positron-cnt-next`, no package, `class
  NextTest extends DurableObject` driving `this.ctx.container`, `"scheduling_policy":
  "durable_object"`, `instance: "standard-1"`, `enableInternet: true`.
- Both deployed with wrangler 4.148.0 (installed in `rig/containers-next/`,
  nothing global), `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN`.

## Verdict

**The new runtime starts our image in about 0.83 s from `start()` to a listening
server (MEASURED, median of 15), which is close to the quoted 648 ms but not
under it. The legacy class, measured the same afternoon, is NOT the 3.72 s of
August: on a path that spawns nothing it answered in a median 0.83 s at the
edge, the same as the new runtime's 0.91 s.** So on this account today the
start itself is no longer what separates them. What does:

1. **The legacy class refuses for about 5 s after a destroy.** Every one of 13
   requests made 2 s after `destroy()` got `503 There is no Container instance
   available at this time` after waiting 4.5 to 5.4 s, and the retry then
   succeeded. Wait 6 s or more and the 503 never appears (6 of 6). The new
   runtime's `destroy()` returned in about 110 ms with `running: false`, and the
   very next start worked, 28 of 28. That is the same 503 `workers/pub` already
   retries four times 3 s apart (comment at `worker.mjs:720`, "MEASURED
   2026-09-30 right after a deploy"). **INFERRED:** with `max_instances: 1` the
   destroyed instance still holds the only slot while it is torn down; pub has
   `max_instances: 3`, so it may meet this less, but nothing here measured that.
2. **The first ffmpeg exec in a fresh container costs about 430 ms on the new
   runtime and about 900 ms on the legacy one** (MEASURED, below), which is why
   `/health` (which runs `ffmpeg -version`) shows a bigger gap than the cheap
   path. **INFERRED:** the new `standard-1` sees 8 CPUs where the legacy one sees
   1, so it is either less throttled or just reporting the host; the cgroup
   files `server.mjs` reads were absent on both, so this is not settled.
3. **Warm requests are about 30 ms SLOWER on the new runtime** (edge median
   104.5 ms against 72 ms, n 20 each). The new container landed in `waw02`
   (Warsaw), the legacy one in `txl01` (Berlin), unasked both times.

Snapshots work and are not a start-time win for this image (median ready 0.91 s
against 0.83 s from the image), which is what the docs predict: a snapshot holds
the filesystem, not memory or processes, and our image has no expensive
filesystem setup to skip.

## The numbers (MEASURED, 2026-10-07)

`edge` is `x-edge-ms`, stamped by the Worker around the whole Worker to DO to
container round trip, so it carries no laptop network. `client` is wall time
in node on the laptop. `ready` (new only) is `ctx.container.start()` to the
first HTTP answer from the container on :8080, polled every 10 ms from inside
the DO. `uptime` is `server.mjs`'s own `Date.now() - BOOT` when it answered.
"Cold" means: `destroy()` the container, wait the settle time, then one request
that starts it again on whatever host Cloudflare picks. The DO itself is warm
(it just handled `/kill`) except in the fresh DO row.

### Cold start

| runtime | what | n | median | p90 | min | max |
| --- | --- | --- | --- | --- | --- | --- |
| new | `ready`, start() to listening, /health run | 10 | **827** | 930 | 694 | 977 |
| new | `ready`, start() to listening, /ready run | 5 | 840 | 919 | 823 | 919 |
| new | edge, /health, 2 s after destroy | 10 | 1309 | 1457 | 1130 | 1533 |
| new | client, /health, 2 s after destroy | 10 | 1405 | 1598 | 1172 | 1672 |
| new | edge, /ready (no ffmpeg), 8 s after destroy | 5 | **906** | 985 | 892 | 985 |
| new | edge, /health, from snapshot | 10 | 1456 | 1721 | 1306 | 1912 |
| new | `ready`, from snapshot | 10 | 912 | 1085 | 805 | 1121 |
| new | edge, /health, a DO that never existed | 5 | 1821 | 2582 | 1253 | 2582 |
| new | `ready`, a DO that never existed | 5 | 831 | 998 | 615 | 998 |
| legacy | client to first 200, /health, 2 s after destroy (one 503 then a retry) | 10 | **6786** | 7269 | 5777 | 7572 |
| legacy | edge of the 503 attempt alone | 13 | about 4.7 s | | 4.5 s | 5.4 s |
| legacy | edge of the 200 attempt, /health | 10 | 1696 | 2329 | 871 | 2471 |
| legacy | edge, /health, 6 or 12 s after destroy (no 503) | 6 | 1678 | 2775 | 989 | 2775 |
| legacy | edge, /ready (no ffmpeg), 8 s after destroy | 5 | **829** | 2160 | 712 | 2160 |

All values in ms. p90 on n 5 or 6 is the second largest or the largest value;
read it as "the bad one".

- New runtime, `ctx.container.start()` itself returned in 0 ms every time
  (MEASURED, `x-start-ms`), as documented: "start() returns once it validates
  its options" (QUOTED).
- New runtime, the first proxied `/health` after ready took 425 to 461 ms
  (`x-proxy-ms`, 3 cycles) while `server.mjs` reported 39 to 62 ms of uptime at
  the moment it built the reply, before it spawns `ffmpeg -version`. On `/ready`
  the same proxy step took 4 to 6 ms. So about 420 ms of the /health cold
  number is the first exec of ffmpeg in a fresh container, not the runtime.
- Legacy, the same split: /health cold 1.68 s against /ready cold 0.83 s, so
  about 850 ms is the first ffmpeg exec there. Server uptime at reply was 193
  to 391 ms, which also includes the class's own port polling.
- Fresh DO: the five landed in `waw02` three times and `arn06` (Stockholm)
  twice. `ready` stays around 0.83 s, while edge grows by about 0.5 s, which is
  the DO being created. One trial start in `arn06` took 3.5 s to ready.
  **INFERRED:** that was a host without the image cached.
- First ever start after the first deploy (image just pushed): new runtime
  **9.3 s** to ready, 9.9 s edge; legacy **one 503 after 5.2 s, then 200 at
  0.9 s edge**, so about 6.5 s. August's figure for legacy was about 16 s.

### Warm request (n 20 each, interleaved, 200 ms apart)

| runtime | edge median | p90 | min | max | client median |
| --- | --- | --- | --- | --- | --- |
| legacy (`txl01`) | **72** | 75 | 66 | 80 | 114 |
| new (`waw02`) | **104.5** | 118 | 96 | 132 | 160 |

August's warm figure was 0.21 to 0.36 s client time; today's legacy is 0.11 s
client. Laptop to edge went through a VPN tunnel today (`utun4` was the default
route), which does not touch HTTPS correctness but does put client times on a
different path from August's; the edge column is unaffected by it.

### Snapshot

`snapshotContainer({ name })` on the running container took **5.6 s and 6.5 s**
(two snapshots), returned `{ id, size: 23832 }`. The size is 23.8 KB. INFERRED: the
snapshot holds the filesystem DIFFERENCE from the image, and this container
writes almost nothing. QUOTED from the API page: snapshots are "immutable with
30-day TTL that refreshes on restore", restore "without capturing memory or
running processes", and "A snapshot is tied to the image it was created from".
Restoring it was not faster than starting from the image (table above).

### Deploy wall time

| deploy | wall |
| --- | --- |
| new, first deploy, image build and push (one layer pushed, the rest already in the registry from August) | **88.8 s** (wrangler: upload 77.8 s, of which "Preparing node for Cloudflare Containers" is a new step) |
| new, worker code only | **16.2 s** |
| legacy, re-create app, image layers already present | **25.4 s** |

### Where the 648 ms sits against these

QUOTED, https://blog.cloudflare.com/faster-agent-sandboxes/: "Burst TTI
Benchmark", 100 concurrent sandboxes, median "4.049 seconds" before and "648
milliseconds" after, p95 "5.839 seconds" to "910 milliseconds", p99 "6.717
seconds" to "1129 milliseconds".

- Our closest quantity is `ready`: **827 ms median, 930 ms p90**. That is 180 ms
  over their median and inside their p95. Their image and what "interactive"
  means for them are not stated in a way that can be matched, and their run is
  100 at once while ours is one at a time. **INFERRED:** a node plus ffmpeg
  image of about 300 MB starting in 0.83 s is consistent with the claim; it is
  not a reproduction of it.
- Their "before" of 4.05 s is close to our August 3.72 s. Our legacy path
  today is not 3.7 s: it is **0.83 s on a cheap path and 1.7 s on /health once
  it is allowed to start**, and **6.8 s if you ask 2 s after a destroy**.
  **INFERRED, NOT SETTLED:** either the platform underneath the legacy class
  got faster since August, or August's 3.72 s already contained part of this
  same release wait (that run went "destroy then 200" and its notes do not say
  how long it waited). Nothing measured today separates those two.

## What the new API asked for that the old did not (porting cost for `workers/pub`)

Read off the docs on 2026-10-07 (QUOTED where marked) and what this test bed
actually needed (MEASURED that it worked).

What was used here, verbatim:

```jsonc
"containers": [{
  "class_name": "NextTest",
  "scheduling_policy": "durable_object",
  "images": { "node": { "dockerfile": "./container/Dockerfile" } }
}],
"migrations": [{ "tag": "v1", "new_sqlite_classes": ["NextTest"] }]
```

```js
this.ctx.container.start({ image: this.ctx.container.images.node, instance: "standard-1", enableInternet: true });
this.ctx.container.monitor().catch(...);
this.ctx.container.setInactivityTimeout(120_000);
await this.ctx.container.getTcpPort(8080).fetch("http://container/ready");   // polled until it answers
await this.ctx.container.destroy();
await this.ctx.container.snapshotContainer({ name: "cnt-next-ready" });
this.ctx.container.start({ containerSnapshot: snap, instance: "standard-1", enableInternet: true });
```

The docs show an `exports` block with `"storage": "sqlite"` in place of
`migrations`; `migrations` with `new_sqlite_classes` was accepted by wrangler
4.148 and worked. `compatibility_date` was `2026-09-29`, the date in the docs'
example; no minimum is documented.

What `workers/pub` would have to change, item by item:

1. **A new Container application, not an edit.** QUOTED, wrangler config docs:
   `scheduling_policy` "Cannot be changed after the application is created."
   So `positron-pub-pub` cannot be flipped in place. **INFERRED:** a new class
   name (and a DO migration) or a new worker, and a cutover of
   `pub.positron.studio`, with the device log ring in DO storage
   (`ctx.storage.get('log')`) left behind in the old class unless copied.
2. **Drop `@cloudflare/containers`.** `class Pub extends Container` becomes
   `extends DurableObject` from `cloudflare:workers`. Every `super.fetch(req)`
   (nine of them in `worker.mjs`) becomes `this.ctx.container.getTcpPort(8080).fetch(req)`,
   preceded by a start-if-not-running and a readiness wait that pub now gets
   for free. QUOTED: "start() initiates startup and returns before the
   Container is ready to accept requests. Add an application-specific readiness
   check". This test bed's version is 15 lines.
3. **`envVars` becomes `start({ env })`.** Same semantics (read at start), so
   the PUB_SOURCE/PUB_BURN pass-through moves from the constructor to the
   start call.
4. **The custom instance changes spelling.** pub's
   `{ "vcpu": 1, "memory_mib": 3072, "disk_mb": 2048 }` in wrangler becomes
   `instance: { vcpu: 1, memoryMib: 3072, diskMb: 2048 }` in code (QUOTED,
   camelCase). Upside, INFERRED: `/stage/` could ask for a bigger box only when
   it runs two encodes, which is the half-vCPU stall in `positron-streaming`.
   QUOTED: "The runtime does not accept `basic` or the legacy `dev` and
   `standard` aliases."
5. **`max_instances: 3` goes away.** QUOTED: "The `durable_object` policy does
   not support `max_instances`." pub uses three DO names (`STAGE`, `CAM`,
   `NAME`), so the cap was never doing much; but nothing on the platform side
   caps a runaway of names any more, so the entry worker's name allowlist is
   the cap.
6. **`sleepAfter` becomes `setInactivityTimeout(ms)`**, max 6 h, and QUOTED
   "Resets on each Durable Object restart", so it must be set again after
   every wake. pub's real lifecycle is its own alarm sweep, which stays. The
   legacy sleepAfter livelock from August (constructor renews the timer) has no
   counterpart because there is no base-class constructor.
7. **The alarm is pub's alone.** The legacy base class also schedules alarms
   for its own sleep logic; pub's `alarm()` and `setAlarm` calls stop sharing
   the slot. INFERRED: simpler, but every path that relied on the base class
   noticing an exit needs `monitor()` instead. QUOTED: `monitor()` "Pending call
   prevents eviction for up to 15 minutes. Does not carry over after Durable
   Object restart."
8. **No rollouts.** QUOTED: "Container instances that use the `durable_object`
   policy do not participate in application-wide image rollouts." A new image
   reaches a running publisher only when pub destroys and restarts it. pub
   already lives with version skew (August: "the running instance kept serving
   the old image until destroyed"), so this mostly makes the existing behaviour
   explicit.
9. **The 503 retry loop can probably go.** INFERRED from 28 of 28 clean
   restarts on the new runtime against 13 of 13 503s on the legacy one at 2 s;
   pub's retry was written for a 503 right after a deploy, which is a case this
   run did not test on the new runtime.
10. **`stop()` and SIGTERM.** pub's node is PID 1 and ignores SIGTERM (August).
    The new API has `destroy()` and `signal(n)`; `destroy()` took about 110 ms
    here and the instance list read `inactive` afterwards.

Cost of porting, INFERRED: a day of work for a careful port of an 833 line
worker whose lifecycle code is already its own, plus the cutover. The deadline
is QUOTED: "We'll maintain the `Container` class and legacy `Sandbox` class
through December 31, 2026. Existing deployments keep running after that date,
but the classes won't get updates."

## Cost of this test

INFERRED from the run log, not read off billing: about 70 container starts in
total across both runtimes, each alive for seconds to about a minute, roughly
15 minutes of `standard-1` time all told. At the August rates (4 GiB, $0.0000025
per GiB-s; CPU on active use only) that is about 3,600 GiB-s, about $0.01 raw,
and inside the monthly included 25 GiB-h. Plus two image pushes and one 23.8 KB
snapshot, which expires in 30 days if not restored.

Both containers were destroyed at the end and `wrangler containers instances`
listed every instance of both apps as `inactive` at 16:06Z (the `containers
list` summary still read "1 live instance" for the new app at that moment;
it lags). Both workers are left deployed: a Worker with no requests and a
Container application with no running instance bill nothing, INFERRED from the
pricing being per request and per active instance-second.

## What could NOT be settled

- **Why legacy is 0.8 s today and was 3.7 s in August.** A platform change
  underneath the old class and a release wait already inside August's number
  are both possible, and this run has no way to tell them apart.
- **A truly cold host.** Every restart here may have landed on a host with the
  image already cached; there is no API to force a new host. The fresh-DO rows
  and the one 3.5 s `arn06` start are the closest thing, and n is 5.
- **Placement.** New landed in `waw02`, legacy in `txl01`, both unasked, and
  the 30 ms warm difference may be geography rather than runtime. Neither
  runtime offered a placement knob that was tried here.
- **CPU share of the new `standard-1`.** It reports 8 CPUs against legacy's 1,
  and its first ffmpeg exec was twice as fast. Whether it is really a 0.5 vCPU
  quota was not measured (no encode was run, by design: this was a start-time
  test).
- **Concurrency.** Cloudflare's 648 ms is 100 starts at once; this was one at a
  time. pub starts at most three.
- **The 503 on the legacy class with `max_instances` above 1**, which is pub's
  configuration. Not measured.
- **WebSocket through `getTcpPort`.** pub proxies `/watch` sockets; only plain
  HTTP was tried here.
- **Snapshot pricing and limits.** Not on the pages read.

## Files

- `rig/containers-next/worker.mjs`, `wrangler.jsonc`, `package.json`,
  `container/Dockerfile`, `container/server.mjs` (the last two copied from
  `rig/containers/container/` unchanged).
- `rig/containers-next/measure.mjs`: the main run, writes
  `results-2026-10-07T15-56-52-305Z.json` (every cycle, summary at the end)
  and printed `run.out` (summary) and `run.err` (per cycle log).
- `rig/containers-next/probe.mjs`: the DO-side split and the legacy
  release wait, writes `probe-2026-10-07T16-01-08-090Z.json`.
- `rig/containers-next/probe-cheap.mjs`: cold start on a path that spawns
  nothing, writes `cheap-2026-10-07T16-03-15-039Z.json`.
- `rig/containers-next/sysinfo.txt`, `deploy-*.log`.
- The main run used worker version `1865266b`; the probes used the next
  version, which adds only the `x-do-ms` and `x-proxy-ms` headers.

## WebSockets and pub's lifecycle on the new runtime (2026-10-07, 16:34Z to 17:06Z)

What `workers/pub` actually needs, read off `workers/pub/worker.mjs`: the DO
TERMINATES every WebSocket itself (`ctx.acceptWebSocket`, hibernation API,
tags `watch`, `cam`, `cam-refused`); no socket is proxied into the container.
Camera chunks arrive as binary WebSocket messages on the DO and are POSTed
into the container one by one. An alarm sweep every 30 s keeps the publish
alive while anybody holds `/watch`. So a WebSocket upgrade through
`getTcpPort().fetch()` was NOT tested: pub does not use one.

Test bed: `rig/containers-next/` gained `/ws` (hibernatable socket on the DO,
alarm sweep every 30 s that re-sets `setInactivityTimeout(60 s)`, two idle
ticks of grace, then the alarm stops), and `container/server.mjs` gained
`/enc/start` (a background `testsrc2` 720p30 x264 `-re` encode to null),
`/enc/status`, `/echo` and `/udp`. Run by `rig/containers-next/ws-probe.mjs`,
result in `ws-2026-10-07T16-41-49-682Z.json`. Two DOs at once, one holding
`monitor()` for the container's life (as pub's port does) and one not.

### MEASURED

| | with monitor() | without monitor() |
| --- | --- | --- |
| socket open (client) | 931 ms | 870 ms |
| container ready after start() | 562 ms | 546 ms |
| socket held silent | 270 s | 270 s |
| sweeps while held | 9, every one saw the same `bootAt` and the encode running | 9, same |
| DO constructor runs (wakes) over the whole run | **1** | **13** (one per alarm, so it hibernated between sweeps) |
| encode alive at the end of the hold | yes, 270 s | yes, 270 s |
| binary 512 KiB over the socket, forwarded into the container by POST, checksum | match, 85 ms | match, 90 ms |
| container running 102 s after the last alarm (alarm deleted, 60 s timeout) | **still running** | **stopped** |

- **The container is not killed while a socket is held, with or without the
  DO hibernating in between**, as long as an alarm wakes the object inside the
  inactivity timeout. The alarm and `ctx.container` coexist; the alarm slot is
  the DO's own.
- **A pending `monitor()` keeps the DO in memory, and while it does the
  inactivity timeout never starts.** That matches the docs (a pending
  `monitor()` "prevents eviction for up to 15 minutes"). Consequence for pub:
  with `monitor()` held, the timeout is not what stops an idle container; pub's
  own sweep has to call `destroy()`. The port does exactly that.
- A forward before the server listens THROWS `The container is not listening
  in the TCP address 10.0.0.1:8080`, it does not answer 503. The first start
  after an image push took about 10 s to listen (12.9 s in pub, below).
- The client saw close code 1006 on one socket 8 s after it sent its own close
  1000. INFERRED: the handler never answers a close and the object was
  hibernated; pub's handler is the same on both runtimes, so this is not new.

### The port's live test, behind `?rt=next` (pub worker, viewers untouched)

- `positron-pub` now exports `Pub` (legacy, unchanged behaviour) and `PubNext`
  (new runtime) from one class body; `?rt=next` routes any request to
  `PubNext`, `PUB_RT` in `wrangler.jsonc` is the default and is still
  `legacy`. Two container entries in one worker were accepted by wrangler
  4.148.0. The first deploy returned `Internal Server Error 500` while creating
  the new application ("The Worker version was deployed, but Wrangler could not
  finish applying its Durable Object-managed Container application settings");
  re-running the same deploy succeeded.
- **The WHIP leg died on the new runtime and not on the legacy one.** MEASURED
  over 150 s with the legacy publisher idle: `exit 245`, "Error muxing a packet
  / Task finished with error code: -11 (Resource temporarily unavailable)", 2
  to 15 s after each start, every retry, while the RTMPS leg in the same
  container held. The legacy class held the same input minutes apart. A
  STUN burst from the test bed container to `stun.cloudflare.com` showed UDP
  works (2000 datagrams sent, no errors at the node level, `wmem_default`
  212992, `wmem_max` 4194304, kernel `6.18.54-cloudflare-microvm`, interface
  `cfeth0`). -11 is EAGAIN on a non-blocking UDP send. **Fix:** the whip
  muxer's `-ts_buffer_size 4194304`, passed only by `PubNext` through
  `PUB_WHIP_SNDBUF`. After it: **the WHIP leg held 132 s with 0 restarts, and
  /stage/'s film WHIP leg held 61 s with 0 restarts.** n is 1 each. INFERRED:
  the socket send buffer was filling on bursts (keyframes) faster than the
  microVM's egress drained it; not settled.
- `/status` on `PubNext` does not start a container (the legacy class did),
  and the container is destroyed one sweep after the grace ends. MEASURED:
  `running: false` and `exit: exited` about two minutes after the last viewer
  left, three times.

### Viewer cold start, `/watch` opened to `/status` reporting both legs publishing

| runtime | run | container answers | RTMPS publishing | WHIP publishing | container `bootMs` |
| --- | --- | --- | --- | --- | --- |
| new | first start after the image push | 13.2 s | 13.5 s | 13.5 s | 12.9 s |
| legacy | idle publisher, container restarted by the deploy's rollout | 1.2 s | 1.2 s | 1.6 s | n/a |
| new, after cutover 2026-10-08 | container stopped, run 1 | n/a | 0.95 s | 1.25 s | 0.67 s |
| new, after cutover 2026-10-08 | container stopped for 90 s, run 2 | n/a | 0.85 s | 1.18 s | 0.63 s |

Only one run each, at the owner's request. The new-runtime row is the image
pull and is not representative; a warm-host new-runtime start (0.83 s to
listening, above) was not measured end to end through pub.

### Not done

- ✅ **Cut over 2026-10-08** (`PUB_RT` `next`, version `dba1f624`). The two 2026-10-08 rows above are through `pub.positron.studio` with `/watch` opened by a node WebSocket and `/status` polled every 200 ms; the 13.5 s row was the image pull. The log ring carried over (422 lines on the first read). What follows was true before it.
- **The cutover was not made.** Flipping `PUB_RT` to `next` and redeploying
  was refused by this session's permission check, so `pub.positron.studio`
  still answers from `Pub`. `PubNext` is deployed and reachable with `?rt=next`.
- The device log ring is still only in `Pub`'s storage. `PubNext` copies it
  object to object on its first `/logs` read (`#adoptLegacyLog`), untested
  live, deliberately, so the copy happens after the cutover and not before.
- No browser page ran against `PubNext`; WHEP frames off the new WHIP leg were
  not seen by a player.
