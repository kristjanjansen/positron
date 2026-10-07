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
import { DurableObject } from "cloudflare:workers";

const PORT = 8080;
const WS_SWEEP_MS = 30_000;
const WS_TIMEOUT_MS = 60_000;
const INSTANCE = "standard-1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (o, h = {}) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json", ...h } });

export class NextTest extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.booting = null;
    this.last = null;
    // Phase 1 WebSocket test: count wakes (a hibernated or evicted object runs
    // this again) and re-set the inactivity timeout, which the docs say a
    // restarted object starts without.
    ctx.blockConcurrencyWhile(async () => {
      const w = ((await ctx.storage.get("wakes")) || 0) + 1;
      await ctx.storage.put("wakes", w);
      if (ctx.container?.running) {
        try { await ctx.container.setInactivityTimeout(WS_TIMEOUT_MS); } catch (e) { this.lastError = "ctor timeout: " + e; }
      }
    });
  }

  // ── Phase 1: pub's lifecycle on this runtime ────────────────────────────
  // A hibernatable socket held on the DO, an alarm sweep every WS_SWEEP_MS
  // that renews the container and records what it saw, a grace of two ticks
  // after the last socket leaves, then the alarm stops and the inactivity
  // timeout is left to stop the container. ?mon=1 also holds monitor().
  async wsBoot() {
    const c = this.ctx.container;
    if (c.running) return;
    c.start({ image: c.images.node, instance: "standard-1", enableInternet: true });
    if ((await this.ctx.storage.get("mon")) === 1) c.monitor().then(() => this.note("monitor resolved")).catch((e) => this.note("monitor rejected " + e));
    await c.setInactivityTimeout(WS_TIMEOUT_MS);
    const port = c.getTcpPort(PORT);
    const t0 = Date.now();
    for (;;) {
      try { const r = await port.fetch("http://container/enc/status"); await r.arrayBuffer(); break; } catch (_) {}
      if (Date.now() - t0 > 30_000) throw new Error("not ready");
      await sleep(20);
    }
    await (await port.fetch("http://container/enc/start")).arrayBuffer();
    await this.note("booted, ready in " + (Date.now() - t0) + " ms after start()");
  }

  async note(msg, extra) {
    const ticks = (await this.ctx.storage.get("ticks")) || [];
    ticks.push({ at: new Date().toISOString(), msg, ...(extra || {}) });
    await this.ctx.storage.put("ticks", ticks.slice(-200));
  }

  async encStatus() {
    try { return await (await this.ctx.container.getTcpPort(PORT).fetch("http://container/enc/status")).json(); }
    catch (e) { return { err: String(e.message || e) }; }
  }

  async alarm() {
    const c = this.ctx.container;
    const n = this.ctx.getWebSockets("watch").length;
    const wakes = await this.ctx.storage.get("wakes");
    if (n > 0) {
      await this.ctx.storage.put("idle", 0);
      const s = c.running ? await this.encStatus() : null;
      try { if (c.running) await c.setInactivityTimeout(WS_TIMEOUT_MS); } catch (e) { this.lastError = String(e); }
      await this.note("sweep", { viewers: n, running: c.running, wakes, s });
      await this.ctx.storage.setAlarm(Date.now() + WS_SWEEP_MS);
      return;
    }
    const idle = ((await this.ctx.storage.get("idle")) || 0) + 1;
    await this.ctx.storage.put("idle", idle);
    await this.note("idle sweep", { idle, running: c.running, wakes });
    if (idle < 2) { await this.ctx.storage.setAlarm(Date.now() + WS_SWEEP_MS); return; }
    if (c.running) { try { await (await c.getTcpPort(PORT).fetch("http://container/enc/stop")).arrayBuffer(); } catch (_) {} }
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.put("idle", 0);
    await this.note("alarm stopped, encode stopped; the inactivity timeout has the container now");
  }

  async webSocketMessage(ws, msg) {
    const c = this.ctx.container;
    if (typeof msg === "string") {
      ws.send(JSON.stringify({ t: "echo", msg, running: c.running, s: c.running ? await this.encStatus() : null }));
      return;
    }
    // binary: forward it into the container the way pub forwards a camera chunk
    const t0 = Date.now();
    try {
      const r = await c.getTcpPort(PORT).fetch("http://container/echo", { method: "POST", body: msg });
      ws.send(JSON.stringify({ t: "bin", sent: msg.byteLength ?? msg.size, ...(await r.json()), ms: Date.now() - t0 }));
    } catch (e) { ws.send(JSON.stringify({ t: "bin", err: String(e.message || e) })); }
  }

  async webSocketClose(ws) {
    if (this.ctx.getWebSockets("watch").length === 0) {
      await this.note("last socket closed");
      if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + WS_SWEEP_MS);
    }
  }

  async boot(fromSnap) {
    const c = this.ctx.container;
    const opts = { instance: INSTANCE, enableInternet: true };
    if (fromSnap) {
      const snap = await this.ctx.storage.get("snap");
      if (!snap) throw new Error("no snapshot stored, call /snap first");
      opts.containerSnapshot = snap;
    } else {
      opts.image = c.images.node;
    }
    const t0 = Date.now();
    c.start(opts);
    const startMs = Date.now() - t0;
    // the DO's 15 min eviction guard; also surfaces a failed start
    c.monitor().catch((e) => { this.lastError = String(e && e.message || e); });
    // cost guard: do not let an idle container outlive the DO for long
    try { c.setInactivityTimeout(120_000); } catch (e) { this.lastError = "setInactivityTimeout: " + e; }
    const port = c.getTcpPort(PORT);
    let polls = 0;
    for (;;) {
      polls++;
      try {
        // any HTTP answer means the server is listening; /ready is a cheap 404,
        // so the poll does not spawn ffmpeg the way /health does. This matches
        // the legacy class, which waits on the port and then forwards once.
        const r = await port.fetch("http://container/ready");
        await r.arrayBuffer(); break;
      } catch (_) { /* not listening yet */ }
      if (Date.now() - t0 > 60_000) throw new Error(`not ready after 60 s, ${polls} polls, lastError ${this.lastError}`);
      await sleep(10);
    }
    this.last = { fromSnap, startMs, readyMs: Date.now() - t0, polls };
    return this.last;
  }

  async fetch(request) {
    const tIn = Date.now();
    const url = new URL(request.url);
    const c = this.ctx.container;
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") return json({ err: "expected websocket" });
      await this.ctx.storage.put("mon", url.searchParams.get("mon") === "1" ? 1 : 0);
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1], ["watch"]);
      if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + WS_SWEEP_MS);
      await this.ctx.storage.put("idle", 0);
      // fire and forget, like pub: the 101 does not wait on the container
      this.wsBoot().catch((e) => this.note("boot failed " + e));
      pair[1].send(JSON.stringify({ t: "hello", viewers: this.ctx.getWebSockets("watch").length }));
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (url.pathname === "/ws/ticks") {
      return json({ running: c.running, wakes: await this.ctx.storage.get("wakes"), alarm: await this.ctx.storage.getAlarm(), sockets: this.ctx.getWebSockets("watch").length, ticks: (await this.ctx.storage.get("ticks")) || [], lastError: this.lastError || null });
    }
    if (url.pathname === "/ws/peek") {
      // read-only for the stop check: does NOT start anything
      return json({ running: c.running, wakes: await this.ctx.storage.get("wakes") });
    }
    if (url.pathname === "/kill") {
      const t0 = Date.now();
      if (c.running) { try { await c.destroy(); } catch (e) { /* destroy may reject with the exit */ } }
      while (c.running && Date.now() - t0 < 30_000) await sleep(20);
      this.booting = null;
      return json({ destroyed: true, running: c.running, ms: Date.now() - t0 });
    }
    if (url.pathname === "/state") {
      return json({ running: c.running, snap: !!(await this.ctx.storage.get("snap")), images: Object.keys(c.images || {}), lastError: this.lastError || null });
    }
    if (url.pathname === "/snap") {
      if (!c.running) return json({ err: "not running" });
      const t0 = Date.now();
      const snap = await c.snapshotContainer({ name: "cnt-next-ready" });
      await this.ctx.storage.put("snap", snap);
      return json({ ok: true, ms: Date.now() - t0, id: snap.id, size: snap.size });
    }
    let cold = false;
    if (!c.running) {
      cold = true;
      if (!this.booting) this.booting = this.boot(url.searchParams.get("from") === "snap").finally(() => { this.booting = null; });
    }
    let info = null;
    if (this.booting) {
      try { info = await this.booting; } catch (e) { return json({ err: String(e.message || e) }, { "x-cold": "1" }); }
    }
    const tProxy = Date.now();
    const r = await c.getTcpPort(PORT).fetch(new Request("http://container" + url.pathname + url.search, request));
    const out = new Response(r.body, r);
    out.headers.set("x-proxy-ms", String(Date.now() - tProxy));
    out.headers.set("x-do-ms", String(Date.now() - tIn));
    out.headers.set("x-cold", cold ? "1" : "0");
    if (info) {
      out.headers.set("x-start-ms", String(info.startMs));
      out.headers.set("x-ready-ms", String(info.readyMs));
      out.headers.set("x-polls", String(info.polls));
    }
    return out;
  }
}

export default {
  async fetch(request, env) {
    const t0 = Date.now();
    const name = new URL(request.url).searchParams.get("do") || "t1";
    const stub = env.NEXT_TEST.get(env.NEXT_TEST.idFromName(name));
    const resp = await stub.fetch(request);
    const out = new Response(resp.body, resp);
    out.headers.set("x-edge-ms", String(Date.now() - t0));
    return out;
  },
};
