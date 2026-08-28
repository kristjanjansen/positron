#!/usr/bin/env node
// ===========================================================================
// ELEKTRON STUDIO — ENGINE (plan-studio.md §5 Session B)
//
//   git pull && node studio/engine.mjs      →  http://127.0.0.1:8899/
//
// ThreatLocker-proof by construction: plain node ESM, homebrew ffmpeg, headless
// chromium via the already-installed playwright. No bundle, no installer, no
// unsigned dylib — nothing for TL to kill.
//
// It is a SUPERVISOR. Children it owns and tracks in ONE registry:
//   · the source            (headless chromium page  OR  nothing, for lavfi)
//   · the RECORD leg        (ffmpeg → local segmented HLS, native T0)
//   · the STAGE leg         (ffmpeg → RTMPS, optional)
//   · the UPLOADER          (proto/archive/uploader.mjs, verbatim)
// Any fatal path kills ALL of them (the session-3 lesson: an orphaned uploader
// keeps writing a dead run's R2 prefix).
//
// It emits THE RUN'S TIMELINE as one JSONL, rows stamped in EPOCH MICROSECONDS
// (timeline/logdeck.mjs's capture-log convention), indexed at stop with the
// library's own buildJsonlIndex() and uploaded beside the show:
//     marker      go-pressed / t0 / leg-up / leg-down / cue-sent / stop / …
//     media-span  one per CLOSED segment (at = its exact wall start)
//     health      1 Hz: cpu, fps, upload lag, resident disk, leg states
//     cue         every cue this run fired, with the deck's drift record
//
// The CUE ENGINE IS THE LIBRARY. One createDeck() whose position domain is
// ABSOLUTE WALL MS (replay.html's law: a cue's `at` IS its position), one `cue`
// adapter whose actuate() sends the room frame. So the console's strip reads
// deck.drift() / deck.audit() / transport.driftStats() — the real channel —
// and never page state.
//
// Control: WS on ws://127.0.0.1:8899/control  {go, stop, status, cue, score}
// (minimal RFC-6455 server inline; there is no `ws` package on this machine and
// adding one is a bundler-shaped problem.)
//
// Per-run isolation is a RULE, not a nicety (the rerun-poison lesson): room,
// RECDIR and the R2 prefix all carry the run id, so a rerun can never replay a
// stale cuelog or clobber a previous run's segments.
//
// CLI:
//   node studio/engine.mjs                     serve the console
//   node studio/engine.mjs --reconcile         sweep R2 for this machine's runs
//   node studio/engine.mjs --autopilot         headless show (verify.mjs uses it)
//        [--duration=S] [--cues=a,b,c] [--source=page|lavfi] [--audio=silent|tone]
//        [--stage] [--no-archive]
// ===========================================================================
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import { spawn, execFile } from "node:child_process";
import { createDeck } from "../timeline/transport.mjs";
import { buildJsonlIndex, jsonlStore } from "../timeline/store.mjs";

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------
const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const HERE = `${ROOT}/studio`;
const PORT = parseInt(process.env.STUDIO_PORT || "8899", 10);
const REMOTE = "https://elektron-rtc.kristjan-jansen.workers.dev";
const BUCKET = process.env.BUCKET || "elektron-archive-test";       // EXISTING
const PUBBASE = process.env.PUBBASE || "https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev";
const WRANGLER_CWD = `${ROOT}/proto/archive`;   // a dir with NO .env (the trap)
const SCRATCH = process.env.STUDIO_SCRATCH ||
  "/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad";
const RUNS = `${HERE}/runs`;
const LOGS = `${HERE}/logs`;
for (const d of [RUNS, LOGS, SCRATCH]) fs.mkdirSync(d, { recursive: true });

// The manual-cue lead. Every cue — scored or typed — goes through the SAME deck
// lane, so a "now" cue is stamped LEAD_MS in the future and the scheduler owns
// it like any other. Uniform path, honest drift, imperceptible to an operator.
const LEAD_MS = parseInt(process.env.STUDIO_LEAD_MS || "150", 10);

function readEnv() {
  const out = {};
  try {
    for (const l of fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n")) {
      const i = l.indexOf("=");
      if (i > 0 && !l.startsWith("#")) out[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    }
  } catch {}
  return out;
}
const ENV = readEnv();
const ROOM_TOKEN = ENV.ROOM_TOKEN || "";
const OPERATOR_TOKEN = ENV.OPERATOR_TOKEN || "";

// An RTMPS stage target is BYO: put STAGE_RTMPS=rtmps://…/live/<key> in .env, or
// point STAGE_KEY at an existing live input. The engine creates NO CF resource.
const STAGE_RTMPS = process.env.STAGE_RTMPS || ENV.STAGE_RTMPS ||
  (ENV.STAGE_KEY ? `rtmps://live.cloudflare.com:443/live/${ENV.STAGE_KEY}` : "");

const ts = () => new Date().toISOString().slice(11, 23);
const say = (...a) => console.log(ts(), "eng|", ...a);
const nowUs = () => Date.now() * 1000;

// ---------------------------------------------------------------------------
// minimal RFC-6455 websocket server (text frames only; ping/pong/close handled)
// ---------------------------------------------------------------------------
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
function wsFrame(str, op = 0x1) {
  const p = Buffer.from(str, "utf8");
  let head;
  if (p.length < 126) { head = Buffer.alloc(2); head[1] = p.length; }
  else if (p.length < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(p.length, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(p.length), 2); }
  head[0] = 0x80 | op;
  return Buffer.concat([head, p]);
}
function wsAttach(server, onOpen) {
  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (!key || new URL(req.url, "http://x").pathname !== "/control") { socket.destroy(); return; }
    const accept = crypto.createHash("sha1").update(key + WS_GUID).digest("base64");
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n" +
                 "Connection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
    socket.setNoDelay(true);
    const conn = {
      socket, alive: true,
      send(o) { if (conn.alive) try { socket.write(wsFrame(typeof o === "string" ? o : JSON.stringify(o))); } catch {} },
      close() { conn.alive = false; try { socket.end(); } catch {} },
      onmessage: null, onclose: null,
    };
    let buf = Buffer.alloc(0);
    socket.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length < 2) return;
        const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
        let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        const maskLen = masked ? 4 : 0;
        if (buf.length < off + maskLen + len) return;
        const mask = masked ? buf.slice(off, off + 4) : null;
        const payload = Buffer.from(buf.slice(off + maskLen, off + maskLen + len));
        if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
        buf = buf.slice(off + maskLen + len);
        if (op === 0x8) { conn.alive = false; try { socket.end(); } catch {}; return; }
        if (op === 0x9) { try { socket.write(wsFrame(payload.toString("utf8"), 0xa)); } catch {}; continue; }
        if ((op === 0x1 || op === 0x0) && fin && conn.onmessage) {
          try { conn.onmessage(JSON.parse(payload.toString("utf8"))); } catch {}
        }
      }
    });
    const bye = () => { conn.alive = false; conn.onclose && conn.onclose(); };
    socket.on("close", bye); socket.on("error", bye);
    onOpen(conn);
  });
}

// ---------------------------------------------------------------------------
// static file server — the whole repo root from ONE origin, so /timeline/*.mjs,
// /proto/replay/replay.html and /studio/console.html all resolve (replay.html
// imports "/timeline/transport.mjs" absolutely). Same hardening as
// proto/replay/replay-server.py: local Host only, no dotted path components —
// the root holds .env.
// ---------------------------------------------------------------------------
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml",
  ".m3u8": "application/vnd.apple.mpegurl", ".ts": "video/mp2t", ".jsonl": "application/x-ndjson" };

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/studio/console.html";
  if (p.split("/").some((s) => s.startsWith("."))) return deny(res, 403, "forbidden path");
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) return deny(res, 403, "forbidden path");
  fs.readFile(file, (err, body) => {
    if (err) return deny(res, 404, "not found");
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
                         "Cache-Control": "no-store" });
    res.end(body);
  });
}
function deny(res, code, why) { res.writeHead(code, { "Content-Type": "text/plain" }); res.end(why); }
function json(res, o, code = 200) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(o));
}

// ---------------------------------------------------------------------------
// CHILD REGISTRY — every spawned handle, and the one path that kills them all.
// ---------------------------------------------------------------------------
const children = new Map();     // name -> {proc|closer, kind}
function track(name, handle) { children.set(name, handle); return handle; }
function killAll(why) {
  for (const [name, h] of children) {
    try {
      if (h && typeof h.kill === "function") h.kill("SIGKILL");
      else if (h && typeof h.close === "function") h.close();
    } catch {}
    say(`killed child ${name} (${why})`);
  }
  children.clear();
  killByUddPrefix(`${SCRATCH}/studio-udd`);
}
function killByUddPrefix(prefix) {
  try {
    execFile("/bin/sh", ["-c",
      `ps -Ao pid,command | grep -F "${prefix}" | grep -v grep | awk '{print $1}' | xargs kill -9 2>/dev/null || true`],
      () => {});
  } catch {}
}

// ---------------------------------------------------------------------------
// RUN STATE
// ---------------------------------------------------------------------------
const S = {
  phase: "idle",                 // idle | arming | live | stopping | done | failed
  runId: null, room: null, prefix: null, recdir: null, rundir: null,
  T0: null, t0Exact: false, tGoPressed: null, tStop: null,
  source: null, audio: null, legs: {},
  health: null, uploader: { lastLagMs: null, segments: 0, done: false, exit: null, degraded: null },
  spans: [], cues: [], error: null,
  replayUrl: null, show: null, deckOffsetMs: null, scoreTitle: null,
};
let logStream = null, deck = null, roomWs = null, timers = [];
const consoles = new Set();

function broadcast(o) { for (const c of consoles) c.send(o); }
function emit(kind, payload, at) {
  const row = { at: at != null ? at : nowUs(), kind, source: "engine", v: 1, payload };
  if (logStream) logStream.write(JSON.stringify(row) + "\n");
  broadcast({ type: "row", row });
  return row;
}
function status() {
  return {
    type: "status", phase: S.phase, runId: S.runId, room: S.room, prefix: S.prefix,
    T0: S.T0, t0Exact: S.t0Exact, source: S.source, audio: S.audio, legs: S.legs,
    health: S.health, uploader: S.uploader, spans: S.spans.length, cues: S.cues,
    replayUrl: S.replayUrl, error: S.error, scoreTitle: S.scoreTitle,
    elapsedMs: S.T0 ? Date.now() - S.T0 : 0,
    lead: LEAD_MS, deckOffsetMs: S.deckOffsetMs,
    stageConfigured: !!STAGE_RTMPS,
    // THE DRIFT CHANNEL — this is what the console's strip renders. Not page
    // state: the scheduler's own record of every fire.
    deck: deck ? {
      position: deck.position(), playing: deck.playing(), host: deck.hostName,
      drift: deck.drift().slice(-200),
      driftStats: deck.sched.driftStats(),
      audit: deck.audit(),
      stats: deck.stats(),
    } : null,
  };
}
function pushStatus() { broadcast(status()); }

// ---------------------------------------------------------------------------
// ROOM (deployed elektron-rtc, AS DEPLOYED) — the engine holds the operator
// socket, so the console never needs the room token and every cue is stamped by
// ONE clock (plan-studio: operator-stamped fireAt, the DO never re-stamps).
// ---------------------------------------------------------------------------
function joinRoom(room) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${REMOTE.replace("https", "wss")}/room/${room}/ws?token=${ROOM_TOKEN}`);
    const to = setTimeout(() => reject(new Error("room join timeout")), 15000);
    ws.onerror = (e) => { clearTimeout(to); reject(new Error("room ws: " + (e.message || "error"))); };
    ws.onopen = () => ws.send(JSON.stringify({
      type: "join", participantId: "engine", name: "Studio Engine",
      role: "operator", opToken: OPERATOR_TOKEN }));
    ws.onmessage = (m) => {
      let f; try { f = JSON.parse(m.data); } catch { return; }
      if (f.type === "roster") { clearTimeout(to); roomWs = ws; resolve(f); }
    };
    ws.onclose = () => { if (roomWs === ws) { roomWs = null; legDown("room", "socket closed"); } };
  });
}
function sendFrame(f) { if (roomWs && roomWs.readyState === 1) roomWs.send(JSON.stringify(f)); }

// ---------------------------------------------------------------------------
// THE CUE DECK — the library IS the cue engine (see header).
// ---------------------------------------------------------------------------
function buildDeck(T0) {
  const adapter = {
    caps: { kind: "cue", domain: "wall", unit: "ms", seekable: true, reducible: true,
            catchUp: "burst" },
    actuate(p, rec) {
      const cue = { id: p.id, at: p.at, sentAt: Date.now(), data: p.data || { text: p.id } };
      sendFrame({ type: "cue", cue });
      const lateMs = cue.sentAt - p.at;
      S.cues.push({ id: p.id, at: p.at, sentAt: cue.sentAt, lateMs, label: p.label || null });
      emit("cue", { id: p.id, at: p.at, sentAt: cue.sentAt, lateMs,
                    label: p.label || null, data: cue.data,
                    drift: rec ? { intendedUs: rec.intendedUs, firedUs: rec.firedUs, deltaMs: rec.deltaMs } : null });
      say(`CUE ${p.id} at=${p.at} late=${lateMs}ms`);
      pushStatus();
    },
    reduce(payloads) { return new Set(payloads.map((p) => p.id)); },
    assertState() { /* live engine: nothing behind the playhead to re-fold */ },
  };
  const d = createDeck({
    items: [], adapters: { cue: adapter },
    range: [T0, T0 + 6 * 3600 * 1000],   // wall-ms domain, 6 h seekable window
    tickHost: "main",                     // node: no Worker; be explicit
  });
  d.seek(Date.now());
  d.play(1);
  // one measurement of the residual between the deck's position and wall time;
  // cues are scheduled in wall ms so this is reported, never silently absorbed.
  S.deckOffsetMs = Math.round((d.position() - Date.now()) * 10) / 10;
  return d;
}
function fireCue(id, data, atMs, label) {
  if (!deck) throw new Error("not live");
  const at = atMs != null ? atMs : Date.now() + LEAD_MS;
  deck.schedule({ at, kind: "cue", id, payload: { id, at, data, label } });
  return at;
}

// ---------------------------------------------------------------------------
// SOURCES + LEGS
// ---------------------------------------------------------------------------
function legUp(name, detail) {
  S.legs[name] = { up: true, since: Date.now(), detail: detail || null };
  emit("marker", { marker: "leg-up", leg: name, detail: detail || null });
  say(`LEG UP ${name} ${detail || ""}`); pushStatus();
}
function legDown(name, why) {
  if (!S.legs[name]) S.legs[name] = {};
  S.legs[name].up = false; S.legs[name].why = why;
  emit("marker", { marker: "leg-down", leg: name, why });
  say(`LEG DOWN ${name}: ${why}`); pushStatus();
}

const FF_VIDEO = ["-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
  "-profile:v", "main", "-g", "60", "-b:v", "2500k", "-maxrate", "3000k", "-bufsize", "6000k"];
const FF_AUDIO = ["-c:a", "aac", "-b:a", "96k", "-ar", "48000", "-ac", "2"];

function audioInput(kind) {
  if (kind === "tone") return ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000"];
  if (kind && kind.startsWith("device:")) return ["-f", "avfoundation", "-i", `:${kind.slice(7)}`];
  return ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"];   // SILENT: first-class
}

/** RECORD leg: local segmented HLS. Native T0 = the first frame WRITTEN to
 *  ffmpeg's stdin (never ffmpeg's own -progress report: +4.3 s late). */
function spawnRecordLeg(recdir, audio, fromPipe) {
  const log = fs.createWriteStream(`${LOGS}/ffmpeg-record.log`, { flags: "a" });
  const vin = fromPipe
    ? ["-use_wallclock_as_timestamps", "1", "-f", "image2pipe", "-c:v", "mjpeg", "-i", "pipe:0"]
    : ["-re", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30"];
  const p = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "info", ...vin, ...audioInput(audio),
    "-filter:v", "setpts=PTS-STARTPTS,fps=30,format=yuv420p",
    ...FF_VIDEO, ...FF_AUDIO, "-shortest",
    "-progress", "pipe:3", "-stats_period", "0.5",
    "-f", "hls", "-hls_time", "4", "-hls_list_size", "0",
    "-hls_segment_filename", `${recdir}/seg%05d.ts`, `${recdir}/index.m3u8`,
  ], { stdio: [fromPipe ? "pipe" : "ignore", "ignore", "pipe", "pipe"] });
  p.stderr.on("data", (d) => log.write(d));
  let pb = "";
  p.stdio[3].on("data", (d) => {
    pb += d.toString();
    const f = [...pb.matchAll(/fps=\s*([\d.]+)/g)].pop();
    if (f) S.health = { ...(S.health || {}), fps: parseFloat(f[1]) };
    if (pb.length > 32768) pb = pb.slice(-4096);
  });
  if (fromPipe) p.stdin.on("error", () => {});
  p.on("exit", (c, s) => {
    S.legs.record && (S.legs.record.exit = c);
    if (S.phase === "live") legDown("record", `ffmpeg exited ${c}/${s}`);
  });
  return p;
}

/** STAGE leg: RTMPS. LL-HLS-compliant encode (CBR, fixed GOP, bf=0). */
function spawnStageLeg(target, audio, fromPipe) {
  const log = fs.createWriteStream(`${LOGS}/ffmpeg-stage.log`, { flags: "a" });
  const vin = fromPipe
    ? ["-use_wallclock_as_timestamps", "1", "-f", "image2pipe", "-c:v", "mjpeg", "-i", "pipe:0"]
    : ["-re", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30"];
  const p = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "warning", ...vin, ...audioInput(audio),
    "-filter:v", "setpts=PTS-STARTPTS,fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency", "-profile:v", "main",
    "-b:v", "3000k", "-minrate", "3000k", "-maxrate", "3000k", "-bufsize", "3000k",
    "-g", "60", "-keyint_min", "60", "-bf", "0", "-sc_threshold", "0",
    ...FF_AUDIO, "-f", "flv", target,
  ], { stdio: [fromPipe ? "pipe" : "ignore", "ignore", "pipe"] });
  p.stderr.on("data", (d) => log.write(d));
  if (fromPipe) p.stdin.on("error", () => {});
  p.on("exit", (c, s) => { if (S.phase === "live") legDown("stage", `ffmpeg exited ${c}/${s}`); });
  return p;
}

/** PAGE source: headless chromium → CDP screencast → tee to every ffmpeg leg. */
async function startPageSource(pageUrl, sinks) {
  const { createRequire } = await import("node:module");
  const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
  const { chromium } = require("playwright");
  const udd = `${SCRATCH}/studio-udd-${S.runId}`;
  fs.rmSync(udd, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
           "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--mute-audio"],
    viewport: { width: 1280, height: 720 },
  });
  track("source-chromium", { close: () => ctx.close().catch(() => {}) });
  const page = ctx.pages()[0] || await ctx.newPage();
  const cl = fs.createWriteStream(`${LOGS}/source-console.log`, { flags: "a" });
  page.on("console", (m) => cl.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", (e) => cl.write(`${ts()} [pageerror] ${e.message}\n`));
  await page.goto(pageUrl, { waitUntil: "load" });
  // wait for the page to declare itself running (show.html contract)
  const tW = Date.now();
  for (;;) {
    const st = await page.evaluate(() => window.__state).catch(() => null);
    if (!st) break;                                     // any page without __state: go
    if (st.phase === "running" && st.drawFrames > 30) break;
    if (Date.now() - tW > 45000) throw new Error("source page never became ready");
    await new Promise((r) => setTimeout(r, 250));
  }
  const cdp = await ctx.newCDPSession(page);
  const st = { frames: 0, dropped: 0, t0: null, t0meta: null };
  cdp.on("Page.screencastFrame", (ev) => {
    try {
      const buf = Buffer.from(ev.data, "base64");
      for (const sink of sinks) {
        if (!sink || !sink.stdin || !sink.stdin.writable) continue;
        if (sink.stdin.writableLength < 8 * 1024 * 1024) sink.stdin.write(buf);
        else st.dropped++;
      }
      if (st.t0 == null) {
        st.t0 = Date.now();
        st.t0meta = ev.metadata && ev.metadata.timestamp ? Math.round(ev.metadata.timestamp * 1000) : null;
      }
      st.frames++;
    } catch {}
    cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast",
    { format: "jpeg", quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
  return { ctx, page, cdp, st };
}

// ---------------------------------------------------------------------------
// MEDIA-SPAN WATCHER — a segment appears in index.m3u8 only once ffmpeg has
// finished writing it (proto/archive's close signal), and the EXTINF prefix sum
// is its exact offset from T0.
// ---------------------------------------------------------------------------
function watchSegments(recdir) {
  const seen = new Set();
  let cum = 0;
  const iv = setInterval(() => {
    let pl; try { pl = fs.readFileSync(path.join(recdir, "index.m3u8"), "utf8"); } catch { return; }
    // cum must advance over EVERY segment in playlist order, not only the new
    // ones — otherwise a second pass mis-places every later span.
    cum = 0;
    let dur = 0;
    for (const raw of pl.split("\n")) {
      const l = raw.trim();
      const m = l.match(/^#EXTINF:([\d.]+)/);
      if (m) { dur = parseFloat(m[1]); continue; }
      if (!l.endsWith(".ts")) continue;
      const startMs = S.T0 + cum * 1000;
      cum += dur;
      if (seen.has(l)) continue;
      seen.add(l);
      const span = { seg: l, at: startMs, durMs: Math.round(dur * 1000),
                     key: `${S.prefix}/${l}`, url: `${PUBBASE}/${S.prefix}/${l}` };
      S.spans.push(span);
      emit("media-span", { ...span, mediaRef: span.url, offsetMs: Math.round(startMs - S.T0) },
           Math.round(startMs * 1000));
    }
  }, 500);
  timers.push(iv);
  return () => clearInterval(iv);
}

// ---------------------------------------------------------------------------
// HEALTH — 1 Hz. cpu of every tracked child, encoder fps, upload lag, resident
// disk, leg states. Written to the timeline AND pushed to the console (the
// per-leg status lights are literally these rows).
// ---------------------------------------------------------------------------
function startHealth(recdir) {
  const iv = setInterval(() => {
    const pids = [...children.values()].filter((h) => h && h.pid).map((h) => h.pid);
    const finish = (cpu) => {
      let bytes = 0, segs = 0;
      try { for (const f of fs.readdirSync(recdir)) {
        const s = fs.statSync(path.join(recdir, f)); bytes += s.size; if (f.endsWith(".ts")) segs++;
      } } catch {}
      const h = {
        t: Date.now(), cpuPct: cpu, fps: (S.health && S.health.fps) || null,
        uploadLagMs: S.uploader.lastLagMs, segmentsUploaded: S.uploader.segments,
        residentBytes: bytes, residentSegs: segs,
        loadAvg1: Math.round(os.loadavg()[0] * 100) / 100,
        legs: Object.fromEntries(Object.entries(S.legs).map(([k, v]) => [k, !!v.up])),
      };
      S.health = h;
      emit("health", h);
    };
    if (!pids.length) return finish(null);
    execFile("ps", ["-o", "%cpu=", "-p", pids.join(",")], (e, out) => {
      finish(e ? null : Math.round(out.trim().split("\n").reduce((s, x) => s + parseFloat(x || 0), 0) * 10) / 10);
    });
  }, 1000);
  timers.push(iv);
}

// ---------------------------------------------------------------------------
// GO
// ---------------------------------------------------------------------------
async function go(opts = {}) {
  if (S.phase !== "idle" && S.phase !== "done" && S.phase !== "failed")
    throw new Error("already " + S.phase);
  const runTs = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  Object.assign(S, {
    phase: "arming", error: null, spans: [], cues: [], legs: {}, health: null,
    replayUrl: null, show: null, T0: null, tStop: null, deckOffsetMs: null,
    uploader: { lastLagMs: null, segments: 0, done: false, exit: null, degraded: null },
    runId: `studio-${runTs}`, source: opts.source || "page", audio: opts.audio || "silent",
    scoreTitle: null,
  });
  S.room = `studio-${runTs}`;            // per-run room: no stale cuelog, ever
  S.prefix = `shows/${S.runId}`;         // per-run prefix: no clobber, ever
  S.recdir = `${SCRATCH}/studio-rec-${runTs}`;
  S.rundir = `${RUNS}/${S.runId}`;
  const archive = opts.archive !== false;
  const wantStage = !!opts.stage && !!STAGE_RTMPS;
  fs.rmSync(S.recdir, { recursive: true, force: true });
  fs.mkdirSync(S.recdir, { recursive: true });
  fs.mkdirSync(S.rundir, { recursive: true });
  logStream = fs.createWriteStream(`${S.rundir}/timeline.jsonl`, { flags: "a" });

  S.tGoPressed = Date.now();
  emit("marker", { marker: "go-pressed", runId: S.runId, room: S.room, prefix: S.prefix,
                   source: S.source, audio: S.audio, archive, stage: wantStage });
  say(`GO run=${S.runId} source=${S.source} audio=${S.audio} archive=${archive} stage=${wantStage}`);
  pushStatus();

  try {
    // --- room first: the cue path must exist before any frame is recorded ----
    await joinRoom(S.room);
    legUp("room", S.room);

    const fromPipe = S.source === "page";
    // --- legs ---------------------------------------------------------------
    const rec = archive ? track("ffmpeg-record", spawnRecordLeg(S.recdir, S.audio, fromPipe)) : null;
    const stage = wantStage ? track("ffmpeg-stage", spawnStageLeg(STAGE_RTMPS, S.audio, fromPipe)) : null;
    if (rec) legUp("record", S.recdir);
    if (stage) legUp("stage", STAGE_RTMPS.replace(/\/live\/.*/, "/live/…"));

    // --- source -------------------------------------------------------------
    let src = null;
    if (fromPipe) {
      const pageUrl = opts.pageUrl ||
        `http://127.0.0.1:${PORT}/proto/replay/show.html?room=${S.room}&id=stage` +
        `&remote=${encodeURIComponent(REMOTE)}&token=${encodeURIComponent(ROOM_TOKEN)}&cb=${Date.now()}`;
      src = await startPageSource(pageUrl, [rec, stage].filter(Boolean));
      S.pageHandle = src;
      const tW = Date.now();
      while (src.st.t0 == null || src.st.frames < 30) {
        if (Date.now() - tW > 20000) throw new Error("screencast frames not flowing");
        await new Promise((r) => setTimeout(r, 100));
      }
      S.T0 = src.st.t0; S.t0Exact = true;      // NATIVE: first frame → ffmpeg stdin
      legUp("source", "chromium screencast");
    } else {
      // lavfi: no input-side write to stamp. The spawn moment is the honest
      // best estimate and is FLAGGED inexact — never presented as native.
      S.T0 = Date.now(); S.t0Exact = false;
      await new Promise((r) => setTimeout(r, 1500));
      legUp("source", "lavfi testsrc2");
    }
    emit("marker", { marker: "t0", T0: S.T0, exact: S.t0Exact,
                     t0meta: src ? src.st.t0meta : null,
                     timeToLiveMs: S.T0 - S.tGoPressed }, S.T0 * 1000);

    // --- uploader (proto/archive/uploader.mjs, verbatim) --------------------
    if (archive) {
      const up = track("uploader", spawn("node", [`${ROOT}/proto/archive/uploader.mjs`], {
        env: { ...process.env, RECDIR: S.recdir, BUCKET, PREFIX: S.prefix, PUBBASE,
               OUTDIR: S.rundir, RESULTS: `${ROOT}/results/studio-upload.jsonl` },
        stdio: ["ignore", "pipe", "pipe"],
      }));
      const ul = fs.createWriteStream(`${LOGS}/uploader.log`, { flags: "a" });
      up.stdout.on("data", (d) => {
        ul.write(d);
        const s = d.toString();
        const m = [...s.matchAll(/lag=(\d+)ms/g)].pop();
        if (m) { S.uploader.lastLagMs = parseInt(m[1], 10); S.uploader.segments++; }
        if (/DONE segs=/.test(s)) S.uploader.done = true;
        if (/!!DEGRADED/.test(s)) S.uploader.degraded = true;
      });
      up.stderr.on("data", (d) => ul.write(d));
      up.on("exit", (c) => { S.uploader.exit = c; S.uploader.done = true;
        children.delete("uploader"); if (S.phase === "live") legDown("archive", `uploader exited ${c}`); });
      legUp("archive", `r2://${BUCKET}/${S.prefix}`);
      watchSegments(S.recdir);
    }

    deck = buildDeck(S.T0);
    startHealth(S.recdir);
    S.phase = "live";
    emit("marker", { marker: "go-live", T0: S.T0, deckHost: deck.hostName,
                     deckOffsetMs: S.deckOffsetMs });
    say(`LIVE T0=${S.T0} (exact=${S.t0Exact}) timeToLive=${S.T0 - S.tGoPressed}ms deckOffset=${S.deckOffsetMs}ms`);
    pushStatus();
    return status();
  } catch (e) {
    S.phase = "failed"; S.error = String(e.message || e);
    emit("marker", { marker: "fatal", why: S.error });
    say("GO FAILED:", S.error);
    killAll("go failed");
    pushStatus();
    throw e;
  }
}

// ---------------------------------------------------------------------------
// SCORE — scores/*.json, the proven choreography format. fireAt = ms from T0.
// Everything lands on the same deck lane as a typed cue.
// ---------------------------------------------------------------------------
function loadScore(score) {
  if (!deck) throw new Error("not live");
  let n = 0;
  for (const a of score.setup || []) {
    if (a.action === "promote" || a.action === "demote")
      sendFrame({ type: a.action, participantId: a.participantId, tier: a.tier });
  }
  for (const ev of score.events || []) {
    const at = S.T0 + (ev.fireAt || 0);
    if (at < Date.now() - 1000) continue;                 // already past: skip
    for (const [i, a] of (ev.actions || []).entries()) {
      if (a.action === "cue") {
        fireCue(`${ev.id}${(ev.actions.length > 1 ? "#" + i : "")}`, a.cue, at, ev.label);
        n++;
      } else if (a.action === "promote" || a.action === "demote") {
        const t = setTimeout(() => sendFrame({ type: a.action, participantId: a.participantId, tier: a.tier }),
                             Math.max(0, at - Date.now()));
        timers.push(t);
        n++;
      }
    }
  }
  S.scoreTitle = score.title || "score";
  emit("marker", { marker: "score-loaded", title: S.scoreTitle, events: n });
  pushStatus();
  return { loaded: n, title: S.scoreTitle };
}

// ---------------------------------------------------------------------------
// STOP  →  drain  →  index  →  upload  →  RECONCILE  →  replay link
// ---------------------------------------------------------------------------
async function stop() {
  if (S.phase !== "live") throw new Error("not live (" + S.phase + ")");
  S.phase = "stopping"; S.tStop = Date.now();
  emit("marker", { marker: "stop", durationMs: S.tStop - S.T0 });
  say("STOP"); pushStatus();
  const tStopPressed = Date.now();

  for (const t of timers) { clearInterval(t); clearTimeout(t); } timers = [];
  if (deck) { try { deck.pause(); } catch {} }

  // 1. stop the source, then close the encoders' stdin so hls writes ENDLIST
  try { if (S.pageHandle) await S.pageHandle.cdp.send("Page.stopScreencast").catch(() => {}); } catch {}
  for (const name of ["ffmpeg-record", "ffmpeg-stage"]) {
    const p = children.get(name);
    if (!p || !p.pid) continue;
    const done = new Promise((r) => p.on("exit", r));
    try { if (p.stdin) p.stdin.end(); else p.kill("SIGINT"); } catch {}
    const t = setTimeout(() => { try { p.kill("SIGINT"); } catch {} }, 8000);
    await done; clearTimeout(t); children.delete(name);
  }
  if (S.legs.record) legDown("record", "stopped");
  if (S.legs.stage) legDown("stage", "stopped");
  try { if (S.pageHandle) await S.pageHandle.ctx.close().catch(() => {}); } catch {}
  children.delete("source-chromium"); S.pageHandle = null;
  if (S.legs.source) legDown("source", "stopped");

  // 2. cuelog from the room (the DO is the cue truth), then leave
  let cuelog = { count: 0, cues: [] };
  try {
    cuelog = await (await fetch(`${REMOTE}/room/${S.room}/cuelog?token=${ROOM_TOKEN}`)).json();
    fs.writeFileSync(`${S.rundir}/cuelog.json`, JSON.stringify(cuelog, null, 2));
  } catch (e) { say("cuelog fetch failed:", e.message); }
  try { roomWs && roomWs.close(); } catch {}
  roomWs = null; legDown("room", "stopped");

  // 3. let the uploader drain (poll, never park)
  const tU = Date.now();
  while (!S.uploader.done && Date.now() - tU < 300000) {
    await new Promise((r) => setTimeout(r, 500));
    pushStatus();
  }
  const up = children.get("uploader");
  if (up && !S.uploader.done) { try { up.kill("SIGKILL"); } catch {} say("uploader killed after 300 s"); }
  children.delete("uploader");
  let upReport = null;
  try { upReport = JSON.parse(fs.readFileSync(`${S.rundir}/uploader-report.json`, "utf8")); } catch {}
  legDown("archive", "drained");

  // 4. close the timeline log, index it with the LIBRARY, read it back
  emit("marker", { marker: "run-end", tStop: S.tStop, segments: S.spans.length,
                   cues: S.cues.length, uploaderExit: S.uploader.exit });
  await new Promise((r) => logStream.end(r));
  logStream = null;
  const tlPath = `${S.rundir}/timeline.jsonl`;
  const idx = await buildJsonlIndex(tlPath);
  let readback = null;
  try {
    const rd = await jsonlStore({ path: tlPath }).open();
    readback = { rows: rd.count, pages: idx.index.pageCount, indexBytes: idx.indexBytes };
    rd.close();
  } catch (e) { readback = { error: String(e.message || e) }; }

  // 5. manifest + upload beside the show
  const drift = deck ? deck.drift() : [];
  const deltas = drift.map((d) => Math.abs(d.deltaMs)).filter(Number.isFinite).sort((a, b) => a - b);
  const pc = (p) => (deltas.length ? deltas[Math.min(deltas.length - 1, Math.floor(p * deltas.length))] : null);
  const hlsUrl = `${PUBBASE}/${S.prefix}/index.m3u8`;
  const replayUrl = `http://127.0.0.1:${PORT}/proto/replay/replay.html?` + new URLSearchParams({
    src: hlsUrl, room: S.room, token: ROOM_TOKEN, remote: REMOTE,
    anchor: "stamp", t0: String(S.T0),
  });
  const show = {
    v: 1, runId: S.runId, room: S.room, bucket: BUCKET, prefix: S.prefix, pubBase: PUBBASE,
    hlsUrl, timelineUrl: `${PUBBASE}/${S.prefix}/timeline.jsonl`,
    T0native: S.T0, t0Exact: S.t0Exact, tGoPressed: S.tGoPressed, tStop: S.tStop,
    timeToLiveMs: S.T0 - S.tGoPressed, durationMs: S.tStop - S.T0,
    source: S.source, audio: S.audio, score: S.scoreTitle,
    segments: S.spans.length, cues: S.cues.length,
    cueDriftMs: { n: deltas.length, p50: pc(0.5), p95: pc(0.95), max: deltas[deltas.length - 1] ?? null },
    cueList: S.cues, timeline: readback, uploader: upReport && {
      segments: upReport.segments, allVerified: upReport.allVerified, degraded: upReport.degraded,
      lagMs: upReport.lagMs, diskHighWater: upReport.diskHighWater, totalBytes: upReport.totalBytes,
    },
    cuelogCount: cuelog.count, replay: { anchor: "stamp", t0: S.T0, url: replayUrl },
  };
  fs.writeFileSync(`${S.rundir}/show.json`, JSON.stringify(show, null, 2));
  for (const [f, ct] of [["timeline.jsonl", "application/x-ndjson"],
                         ["timeline.idx.json", "application/json"],
                         ["cuelog.json", "application/json"],
                         ["show.json", "application/json"]]) {
    const local = `${S.rundir}/${f}`;
    if (fs.existsSync(local)) await wranglerPut(`${S.prefix}/${f}`, local, ct);
  }

  // 6. RECONCILE — R2 is the memory. Nothing local is trusted: re-read the
  //    playlist from R2 and HEAD every object it references plus our sidecars.
  const rec = await reconcileShow(S.prefix, { hlsUrl });
  show.reconcile = rec;
  fs.writeFileSync(`${S.rundir}/show.json`, JSON.stringify(show, null, 2));
  await wranglerPut(`${S.prefix}/show.json`, `${S.rundir}/show.json`, "application/json");
  fs.appendFileSync(`${RUNS}/index.jsonl`, JSON.stringify({
    t: Date.now(), runId: S.runId, prefix: S.prefix, hlsUrl, T0: S.T0,
    durationMs: show.durationMs, ok: rec.ok, replayUrl }) + "\n");

  S.show = show;
  S.replayUrl = replayUrl;
  S.phase = "done";
  show.stopToReplayMs = Date.now() - tStopPressed;
  fs.writeFileSync(`${S.rundir}/show.json`, JSON.stringify(show, null, 2));
  say(`DONE ${S.runId} — segments=${S.spans.length} cues=${S.cues.length} ` +
      `reconcile=${rec.ok ? "OK" : "DEGRADED"} stopToReplay=${show.stopToReplayMs}ms`);
  say(`REPLAY: ${replayUrl}`);
  deck && deck.dispose(); deck = null;
  killAll("stop");
  pushStatus();
  return show;
}

// ---------------------------------------------------------------------------
// wrangler put — the auth trap: clean env AND a cwd with no .env.
// ---------------------------------------------------------------------------
function wranglerPut(key, file, ct) {
  const env = { ...process.env };
  for (const k of ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN", "CF_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) delete env[k];
  return new Promise((res) => {
    execFile("wrangler", ["r2", "object", "put", `${BUCKET}/${key}`, "--file", file,
                          "--remote", "--content-type", ct],
      { cwd: WRANGLER_CWD, env, timeout: 60000 },
      (err, so, se) => { if (err) say(`PUT FAIL ${key}: ${String(se).slice(0, 160)}`); res(!err); });
  });
}

// ---------------------------------------------------------------------------
// RECONCILE — the postshow.mjs rule, one level simpler: R2 is the only truth.
// No local state is consulted. Wrangler has no `object list`, so the playlist
// in R2 is the index and every reference is HEAD-verified.
// ---------------------------------------------------------------------------
async function reconcileShow(prefix, { hlsUrl } = {}) {
  const url = hlsUrl || `${PUBBASE}/${prefix}/index.m3u8`;
  const out = { prefix, checks: [], ok: false, t: Date.now() };
  const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); return ok; };
  let pl = null;
  try { const r = await fetch(`${url}?cb=${Date.now()}`); if (r.ok) pl = await r.text(); } catch {}
  if (!check("playlist-in-r2", !!pl, url)) return out;
  const segs = pl.split("\n").map((l) => l.trim()).filter((l) => l.endsWith(".ts"));
  check("playlist-ended", pl.includes("#EXT-X-ENDLIST"), `${segs.length} segments`);
  let bytes = 0, missing = [];
  for (const s of segs) {
    try {
      const h = await fetch(`${PUBBASE}/${prefix}/${s}`, { method: "HEAD" });
      if (!h.ok) missing.push(s); else bytes += parseInt(h.headers.get("content-length") || "0", 10);
    } catch { missing.push(s); }
  }
  check("every-segment-present", missing.length === 0,
        `${segs.length - missing.length}/${segs.length}, ${(bytes / 1048576).toFixed(1)} MB` +
        (missing.length ? ` MISSING ${missing.join(",")}` : ""));
  for (const f of ["timeline.jsonl", "timeline.idx.json", "show.json"]) {
    let ok = false;
    try { ok = (await fetch(`${PUBBASE}/${prefix}/${f}`, { method: "HEAD" })).ok; } catch {}
    check(`sidecar-${f}`, ok);
  }
  out.segments = segs.length; out.bytes = bytes; out.missing = missing;
  out.ok = out.checks.every((c) => c.ok);
  return out;
}

/** --reconcile: sweep every run this machine recorded and re-verify it in R2.
 *  The engine can be started at any time; R2 is the memory, runs/index.jsonl is
 *  only a hint about where to look. */
async function reconcileAll() {
  const rows = [];
  try {
    for (const l of fs.readFileSync(`${RUNS}/index.jsonl`, "utf8").split("\n").filter(Boolean))
      rows.push(JSON.parse(l));
  } catch {}
  for (const d of fs.existsSync(RUNS) ? fs.readdirSync(RUNS) : []) {
    if (!d.startsWith("studio-")) continue;
    if (rows.some((r) => r.runId === d)) continue;
    rows.push({ runId: d, prefix: `shows/${d}` });
  }
  say(`reconcile: ${rows.length} known run(s)`);
  const results = [];
  for (const r of rows) {
    const rec = await reconcileShow(r.prefix);
    results.push({ runId: r.runId, ...rec });
    say(`  ${rec.ok ? "OK       " : "DEGRADED "} ${r.runId}  ` +
        rec.checks.filter((c) => !c.ok).map((c) => c.name).join(",") || "");
  }
  fs.writeFileSync(`${RUNS}/reconcile.json`, JSON.stringify({ t: Date.now(), results }, null, 2));
  return results;
}

// ---------------------------------------------------------------------------
// HTTP + control
// ---------------------------------------------------------------------------
function listScores() {
  const dirs = [`${HERE}/scores`, `${ROOT}/proto/m2m/scores`];
  const out = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith(".json")) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
        out.push({ file: f, dir: d.replace(ROOT, ""), title: j.title || f,
                   events: (j.events || []).length, durationMs: j.durationMs || null });
      } catch {}
    }
  }
  return out;
}
function readScore(dir, file) {
  const p = path.join(ROOT, dir, path.basename(file));
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function listRuns() {
  const out = [];
  try {
    for (const l of fs.readFileSync(`${RUNS}/index.jsonl`, "utf8").split("\n").filter(Boolean))
      out.push(JSON.parse(l));
  } catch {}
  return out.reverse().slice(0, 40);
}

const server = http.createServer((req, res) => {
  const host = (req.headers.host || "").split(":")[0];
  if (host !== "localhost" && host !== "127.0.0.1") return deny(res, 403, "forbidden host");
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/healthz") return json(res, { ok: true, phase: S.phase });
  if (url.pathname === "/api/status") return json(res, status());
  if (url.pathname === "/api/scores") return json(res, listScores());
  if (url.pathname === "/api/runs") return json(res, listRuns());
  if (url.pathname === "/api/score") {
    try { return json(res, readScore(url.searchParams.get("dir"), url.searchParams.get("file"))); }
    catch (e) { return json(res, { error: String(e.message) }, 400); }
  }
  return serveStatic(req, res, url);
});

wsAttach(server, (conn) => {
  consoles.add(conn);
  conn.send(status());
  conn.onclose = () => consoles.delete(conn);
  conn.onmessage = async (m) => {
    try {
      if (m.op === "status") conn.send(status());
      else if (m.op === "go") conn.send({ type: "ack", op: "go", result: await go(m) });
      else if (m.op === "stop") conn.send({ type: "ack", op: "stop", result: await stop() });
      else if (m.op === "cue") {
        const at = fireCue(m.id || `CUE-${Date.now() % 100000}`, m.data || { text: m.text || "" },
                           m.at || null, m.label);
        conn.send({ type: "ack", op: "cue", result: { id: m.id, at } });
      } else if (m.op === "score") {
        const sc = m.score || readScore(m.dir, m.file);
        conn.send({ type: "ack", op: "score", result: loadScore(sc) });
      } else if (m.op === "reconcile") {
        conn.send({ type: "ack", op: "reconcile", result: await reconcileAll() });
      }
    } catch (e) {
      conn.send({ type: "error", op: m.op, error: String(e.message || e) });
    }
  };
});

// ---------------------------------------------------------------------------
// fatal paths — a supervisor that leaks children is not a supervisor
// ---------------------------------------------------------------------------
let shuttingDown = false;
function bail(why, code = 1) {
  if (shuttingDown) return; shuttingDown = true;
  say("SHUTDOWN:", why);
  try { if (logStream) { logStream.write(JSON.stringify({ at: nowUs(), kind: "marker", source: "engine", v: 1, payload: { marker: "fatal", why } }) + "\n"); logStream.end(); } } catch {}
  try { roomWs && roomWs.close(); } catch {}
  killAll(why);
  setTimeout(() => process.exit(code), 300);
}
process.on("SIGINT", () => bail("SIGINT", 0));
process.on("SIGTERM", () => bail("SIGTERM", 0));
process.on("uncaughtException", (e) => { console.error(e); bail("uncaughtException: " + e.message); });
process.on("unhandledRejection", (e) => { console.error(e); bail("unhandledRejection: " + (e && e.message)); });

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const flag = (k) => argv.includes(`--${k}`);

if (flag("reconcile")) {
  reconcileAll().then((r) => process.exit(r.every((x) => x.ok) ? 0 : 2));
} else {
  server.listen(PORT, "127.0.0.1", async () => {
    say(`STUDIO ENGINE on http://127.0.0.1:${PORT}/   (control ws://127.0.0.1:${PORT}/control)`);
    say(`bucket=${BUCKET} pub=${PUBBASE} stage=${STAGE_RTMPS ? "configured" : "not configured"}`);
    if (flag("autopilot")) {
      const dur = parseInt(arg("duration", "90"), 10);
      const cues = (arg("cues", "") || "").split(",").filter(Boolean);
      try {
        await go({ source: arg("source", "page"), audio: arg("audio", "silent"),
                   stage: flag("stage"), archive: !flag("no-archive") });
        // fractional offsets, always: integer seconds phase-lock any poll grid
        // and alias the error distribution (the 6u lesson).
        const offs = (arg("offsets", "12.3,27.7,43.1,58.9,74.3") || "").split(",").map(Number);
        offs.forEach((o, i) => {
          const id = cues[i] || `CUE-${String(i + 1).padStart(2, "0")}`;
          fireCue(id, { text: id, mode: "scored" }, S.T0 + Math.round(o * 1000));
        });
        say(`autopilot: ${offs.length} cues armed at +${offs.join("s +")}s`);
        const scoreFile = arg("score", "");
        if (scoreFile) loadScore(JSON.parse(fs.readFileSync(scoreFile, "utf8")));
        await new Promise((r) => setTimeout(r, dur * 1000));
        const show = await stop();
        fs.writeFileSync(`${HERE}/last-show.json`, JSON.stringify(show, null, 2));
        say("autopilot done");
        process.exit(show.reconcile.ok ? 0 : 2);
      } catch (e) { say("autopilot FAILED:", e.message || e); bail("autopilot", 1); }
    }
  });
}
