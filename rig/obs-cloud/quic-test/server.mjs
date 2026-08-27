#!/usr/bin/env node
// Part-1 probe: does a REAL MoQ/QUIC session work from inside a CF Container?
// Wraps moq-clock-ietf (amd64, draft-14) in an HTTP server the Worker proxies.
//   GET /health            boot info
//   GET /quic?dur=20       self-contained pub+sub through the d14 public relay:
//                          spawn publisher (fresh ns), wait 3 s, spawn internal
//                          subscriber; return handshake evidence + matched ticks
//   GET /pubstart?dur=60   background publisher (for a LOCAL Mac subscriber to
//                          verify objects escape CF); returns ns immediately
//   GET /pubstatus         stderr/stdout tails of the background publisher
//   GET /net               UDP control probe (DNS to 1.1.1.1/8.8.8.8)
import http from "http";
import os from "os";
import dgram from "dgram";
import { spawn } from "child_process";

const RELAY = process.env.MOQ_RELAY || "https://draft-14.cloudflare.mediaoverquic.com";
const BOOT = Date.now();
const PORT = process.env.PORT || 8080;
const BIN = "/usr/local/bin/moq-clock-ietf";

// CF trap: PID-1 node never dies from stop()/rollout SIGTERM unless handled.
process.on("SIGTERM", () => { console.log("SIGTERM -> exit"); process.exit(0); });
process.on("SIGINT", () => process.exit(0));

function collect(proc, tag, store) {
  store[tag] = { out: [], err: [], exit: null };
  proc.stdout.on("data", (d) => {
    for (const l of d.toString().split("\n")) if (l.trim()) store[tag].out.push({ t: Date.now(), l: l.trim() });
  });
  proc.stderr.on("data", (d) => {
    for (const l of d.toString().split("\n")) if (l.trim()) store[tag].err.push({ t: Date.now(), l: l.trim() });
  });
  proc.on("exit", (c, sig) => (store[tag].exit = { c, sig, t: Date.now() }));
}

let bg = null; // background publisher state

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj, null, 1)); };
  try {
    if (url.pathname === "/health") {
      send(200, { ok: true, bootAt: BOOT, uptimeMs: Date.now() - BOOT, relay: RELAY,
        cpus: os.cpus().length, cpuModel: (os.cpus()[0] || {}).model || "?",
        memTotalMB: Math.round(os.totalmem() / 1048576), node: process.version,
        env: { LOC: process.env.CLOUDFLARE_LOCATION, REGION: process.env.CLOUDFLARE_REGION,
               DEPLOY: (process.env.CLOUDFLARE_DEPLOYMENT_ID || "").slice(0, 8) } });
    } else if (url.pathname === "/quic") {
      const dur = Math.min(60, Number(url.searchParams.get("dur") || 20));
      const ns = "obscloud-" + Date.now();
      const store = {};
      const t0 = Date.now();
      const pub = spawn(BIN, ["--publish", "--namespace", ns, RELAY], { env: { ...process.env, RUST_LOG: "info" } });
      collect(pub, "pub", store);
      await new Promise((r) => setTimeout(r, 3000));
      const tSub = Date.now();
      const sub = spawn(BIN, ["--namespace", ns, RELAY], { env: { ...process.env, RUST_LOG: "info" } });
      collect(sub, "sub", store);
      await new Promise((r) => setTimeout(r, (dur - 3) * 1000));
      pub.kill("SIGKILL"); sub.kill("SIGKILL");
      // match pub-printed ticks to sub-received ticks (same VM clock).
      // Tick lines are exactly "YYYY-MM-DD HH:MM:SS"; tracing INFO lines (also
      // stdout — the RUNBOOK stdout trap) are filtered out by shape.
      const isTick = (l) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(l);
      const conn = (s) => s.out.concat(s.err).filter((e) => /connect|SETUP|session|error|failed/i.test(e.l) && !isTick(e.l)).slice(0, 10);
      const pubTicks = new Map(store.pub.out.filter((e) => isTick(e.l)).map((e) => [e.l, e.t]));
      const lat = store.sub.out.filter((e) => isTick(e.l) && pubTicks.has(e.l)).map((e) => e.t - pubTicks.get(e.l));
      lat.sort((a, b) => a - b);
      send(200, {
        ns, relay: RELAY, durS: dur, tStartPub: t0, tStartSub: tSub,
        pubTicks: pubTicks.size, subTicks: store.sub.out.filter((e) => isTick(e.l)).length,
        matchedTicks: lat.length,
        latMs: lat.length ? { p50: lat[Math.floor(lat.length * 0.5)], p95: lat[Math.floor(lat.length * 0.95)], min: lat[0], max: lat[lat.length - 1] } : null,
        pubConnLog: conn(store.pub), subConnLog: conn(store.sub),
        pubExit: store.pub.exit, subExit: store.sub.exit,
      });
    } else if (url.pathname === "/pubstart") {
      const dur = Math.min(300, Number(url.searchParams.get("dur") || 60));
      if (bg?.proc && bg.proc.exitCode === null) bg.proc.kill("SIGKILL");
      const ns = "obscloud-" + Date.now();
      const store = {};
      const proc = spawn(BIN, ["--publish", "--namespace", ns, RELAY], { env: { ...process.env, RUST_LOG: "info" } });
      collect(proc, "pub", store);
      const killer = setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} }, dur * 1000);
      killer.unref?.();
      bg = { ns, proc, store, startedAt: Date.now(), durS: dur };
      send(200, { ns, relay: RELAY, durS: dur, startedAt: bg.startedAt });
    } else if (url.pathname === "/pubstatus") {
      if (!bg) return send(404, { err: "no background publisher" });
      send(200, { ns: bg.ns, startedAt: bg.startedAt, running: bg.proc.exitCode === null,
        outLines: bg.store.pub.out.length, lastOut: bg.store.pub.out.slice(-3),
        err: bg.store.pub.err.slice(0, 12), exit: bg.store.pub.exit });
    } else if (url.pathname === "/net") {
      const udp = (host, port, payload) => new Promise((r) => {
        const t0 = Date.now();
        const s = dgram.createSocket("udp4");
        const to = setTimeout(() => { s.close(); r("timeout"); }, 4000);
        s.on("message", () => { clearTimeout(to); s.close(); r(`reply ${Date.now() - t0}ms`); });
        s.on("error", (e) => { clearTimeout(to); r(`error ${e.code}`); });
        s.send(payload, port, host);
      });
      const dnsQ = Buffer.from("abcd01000001000000000000076578616d706c6503636f6d0000010001", "hex");
      send(200, { udp53_cloudflare: await udp("1.1.1.1", 53, dnsQ), udp53_google: await udp("8.8.8.8", 53, dnsQ) });
    } else send(404, { err: "not found" });
  } catch (e) {
    console.error("ERROR:", e.message || e);
    send(500, { err: String(e.message || e) });
  }
});
server.listen(PORT, () => console.log(`obscloud quic probe on :${PORT}, boot ${new Date(BOOT).toISOString()}, relay ${RELAY}`));
