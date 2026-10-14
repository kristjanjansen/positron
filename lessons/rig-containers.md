# rig-containers

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/containers-next/container/server.mjs`

### next-server-header

Above `import http from "http";`, lines 2 to 13 before the cut.

~~~js
// ============================================================================
// CF Containers test workload — the repackage job (proto/selfrec/repackage.mjs)
// transplanted into a container, MINUS the upload leg (writes nothing back to
// R2 — keep the bucket clean). Endpoints:
//   GET /health  -> boot time, uptime, cpu/mem/ffmpeg info (cold-start probe)
//   GET /run     -> pulls the kept proof show's two participants from the R2
//                   public URL, concats each, runs copy-remux on p1 (h264) and
//                   transcode (-bf 0 law) on p2 (vp8), reports wall times.
//   GET /sysinfo -> /proc details (what silicon did we land on)
// Local parity: same ffmpeg args as repackage.mjs; sequential chunk download
// (same as engine) so downloadMs is comparable.
// ============================================================================
~~~

### next-server-encode

Above `if (!enc || enc.exitCode !== null) {`, lines 156 to 158 before the cut.

~~~js
// Phase 1 of the WebSocket test (2026-10-07): a pub-shaped long encode,
// testsrc2 720p30 x264 paced with -re, to /dev/null, in the BACKGROUND so
// the server keeps answering while it runs.
~~~

### next-server-udp

Above `const dgram = await import("dgram");`, lines 172 to 176 before the cut.

~~~js
// Phase 2 diagnosis (2026-10-07): ffmpeg's WHIP leg dies with EAGAIN on
// this runtime. One STUN binding request to Cloudflare's STUN server,
// then a burst of N 1200 byte datagrams (STUN binding requests, so the
// far end can answer them) sent as fast as sendto allows, counting
// send errors and replies. Cloudflare-owned target only.
~~~

## `rig/containers-next/measure.mjs`

### next-measure

Above `import fs from "fs";`, lines 2 to 8 before the cut.

~~~js
// Cold start of the legacy Container class against the new durable_object
// runtime, same image, same server.mjs, standard-1, same client, same hour.
// Cycles are INTERLEAVED (legacy, new, legacy, new...) so both runtimes see
// the same network and the same time of day.
//   node measure.mjs [N_COLD=10] [N_WARM=20] [N_SNAP=10] [N_FRESH=5]
// Writes results-<iso>.json beside this file. Ends with both containers
// destroyed.
~~~

## `rig/containers-next/probe-cheap.mjs`

### probe-cheap

Above `import fs from "fs";`, lines 2 to 6 before the cut.

~~~js
// Cold start to the first answer on a path that spawns nothing (/ready, a 404
// from server.mjs), so neither runtime pays the first ffmpeg exec that /health
// does. Legacy waits 8 s after destroy (its instance slot is not released for
// about 6 s, measured in probe.mjs); new waits the same 8 s so the two are
// treated alike. Interleaved, 5 cycles each.
~~~

## `rig/containers-next/worker.mjs`

### next-worker-header

Above `import { DurableObject } from "cloudflare:workers";`, lines 1 to 12 before the cut.

~~~js
// Sibling of rig/containers/worker.mjs on the NEW Containers runtime:
// scheduling_policy "durable_object", driven through this.ctx.container
// (no @cloudflare/containers). Same image, same server.mjs, standard-1.
// The Worker adds x-edge-ms exactly as the legacy test bed does; the DO adds
// x-start-ms (ctx.container.start() call), x-ready-ms (start() to the first HTTP
// answer from the container on :8080) and x-polls (readiness attempts),
// x-proxy-ms (the forwarded request alone) and x-do-ms (DO fetch entry to
// response headers, so edge minus do is the Worker to DO hop).
//   /kill            destroy the container, wait until running is false
//   /snap            take a filesystem snapshot of the running container
//   /state           running + whether a snapshot is stored
//   anything else    ensure running (from image, or ?from=snap), then proxy
~~~

### next-worker-ws

Above `async wsBoot() {`, lines 39 to 43 before the cut.

~~~js
// ── Phase 1: pub's lifecycle on this runtime ────────────────────────────
// A hibernatable socket held on the DO, an alarm sweep every WS_SWEEP_MS
// that renews the container and records what it saw, a grace of two ticks
// after the last socket leaves, then the alarm stops and the inactivity
// timeout is left to stop the container. ?mon=1 also holds monitor().
~~~

## `rig/containers-next/ws-probe.mjs`

### ws-probe

Above `import fs from "fs";`, lines 2 to 7 before the cut.

~~~js
// Phase 1 of the pub port (2026-10-07): pub's WebSocket lifecycle on the new
// runtime. Two DOs at once, one holding monitor() and one not. Each: open a
// hibernatable socket, send text and binary (binary is forwarded into the
// container), hold SILENT for HOLD_MS so the DO can hibernate between alarm
// sweeps, ask again, close, then leave the DO alone past the inactivity
// timeout and ask only whether the container is still running.
~~~

## `rig/containers/container/server.mjs`

### legacy-server-header

Above `import http from "http";`, lines 2 to 13 before the cut.

~~~js
// ============================================================================
// CF Containers test workload — the repackage job (proto/selfrec/repackage.mjs)
// transplanted into a container, MINUS the upload leg (writes nothing back to
// R2 — keep the bucket clean). Endpoints:
//   GET /health  -> boot time, uptime, cpu/mem/ffmpeg info (cold-start probe)
//   GET /run     -> pulls the kept proof show's two participants from the R2
//                   public URL, concats each, runs copy-remux on p1 (h264) and
//                   transcode (-bf 0 law) on p2 (vp8), reports wall times.
//   GET /sysinfo -> /proc details (what silicon did we land on)
// Local parity: same ffmpeg args as repackage.mjs; sequential chunk download
// (same as engine) so downloadMs is comparable.
// ============================================================================
~~~

## `rig/containers/worker.mjs`

### legacy-worker-header

Above `import { Container, getContainer } from "@cloudflare/containers";`, lines 1 to 4 before the cut.

~~~js
// Worker shell for the CF Containers test — one container class, one named
// instance ("t1"). Every request path is proxied straight into the container's
// node server; the Worker adds edge-side timing headers so cold start can be
// split (edge total vs container-internal uptime).
~~~

### legacy-worker-stop

Above `if (new URL(request.url).pathname === "/stop") {`, lines 11 to 12 before the cut.

~~~js
// /stop: force-stop the container (measured stand-in for sleep, since
// sleepAfter never fired — constructor renewActivityTimeout races the alarm)
~~~

### legacy-worker-kill

Above `if (new URL(request.url).pathname === "/kill") {`, lines 17 to 18 before the cut.

~~~js
// /kill: hard destroy — needed because node-as-PID-1 ignores the SIGTERM
// that stop() and rollouts send (15 min to SIGKILL otherwise)
~~~
