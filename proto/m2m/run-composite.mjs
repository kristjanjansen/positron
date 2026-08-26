#!/usr/bin/env node
// m2m PHASE 3B driver — RECORDING COMPOSITE (no OBS).
// N=8 grid via the DEPLOYED Worker (2 featured "1","2" + 4 live A..D + 2 wall
// W,X — all grid.html view=lite) + composite.html (own Chrome, viewport ==
// canvas 1280x720) + composite-viewer.html (own Chrome).
//
// ROUTE=A  composite page publishes canvas.captureStream via WHIP (in-page).
//          Viewer plays WHEP (WHIP ingest is not HLS-playable, plan.md §2.2).
// ROUTE=B  CDP Page.startScreencast -> ffmpeg (mjpeg pipe) -> RTMPS.
//          Viewer plays LL-HLS (RTMPS ingest is not WHEP-playable).
//
// After stream end the driver polls the Stream API for the recorded asset
// (custom UA — CF 1010-blocks default UAs) and logs the readiness delay.
//
// Usage (server first):
//   M2M_PORT=8895 M2M_RESULTS=…/results/m2m-p3b-<label>.jsonl python3 grid-server.py &
//   ROUTE=A LABEL=a DURATION=180 node run-composite.mjs
//   ROUTE=B LABEL=b DURATION=600 node run-composite.mjs
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync, spawn } from "child_process";

const ROUTE = (process.env.ROUTE || "A").toUpperCase();
const LABEL = process.env.LABEL || ROUTE.toLowerCase();
const DURATION_S = parseInt(process.env.DURATION || (ROUTE === "A" ? "180" : "600"), 10);
const POLL_S = parseInt(process.env.POLL_S || "300", 10);   // recording-poll budget after end
const NOPUB = process.env.NOPUB === "1";                    // smoke: no WHIP/ffmpeg at all
const BASE = "http://127.0.0.1:8895";
const ROOM = `p3b-${LABEL}`;
const HERE = "/Users/s32863/personal/elektron/proto/m2m";
const ROOT = "/Users/s32863/personal/elektron";
const LOGDIR = `${HERE}/logs`;
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-elektron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/m2m-p3b-udd";
const REMOTE_URL = "https://elektron-rtc.kristjan-jansen.workers.dev";
fs.mkdirSync(LOGDIR, { recursive: true });

function envVal(key) {
  const line = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find(l => l.startsWith(key + "="));
  return line ? line.slice(key.length + 1).trim() : "";
}
const TOKEN = envVal("ROOM_TOKEN");
const OP_TOKEN = envVal("OPERATOR_TOKEN");   // operator joins need it
const CF_API_TOKEN = envVal("CF_API_TOKEN");
const CF_ACCOUNT_ID = envVal("CF_ACCOUNT_ID");
if (!TOKEN || !CF_API_TOKEN || !CF_ACCOUNT_ID) { console.error("missing .env values"); process.exit(1); }

const LIVE = JSON.parse(fs.readFileSync(`${HERE}/artifacts/p3b-live-input.json`, "utf8")).result;
const LIVE_UID = LIVE.uid;
const WHIP_URL = LIVE.webRTC.url;
const WHEP_URL = LIVE.webRTCPlayback.url;
const RTMPS = LIVE.rtmps.url + LIVE.rtmps.streamKey;
const CUSTOMER = new URL(LIVE.webRTCPlayback.url).origin;
const HLS_URL = `${CUSTOMER}/${LIVE_UID}/manifest/video.m3u8?protocol=llhls`;

const ROSTER = {
  "1": { tier: "featured", name: "Perf-Ada",  role: "operator",  view: "lite" },
  "2": { tier: "featured", name: "Perf-Bela", role: "performer", view: "lite" },
  "A": { tier: "live", name: "Live-A", role: "audience", view: "lite" },
  "B": { tier: "live", name: "Live-B", role: "audience", view: "lite" },
  "C": { tier: "live", name: "Live-C", role: "audience", view: "lite" },
  "D": { tier: "live", name: "Live-D", role: "audience", view: "lite" },
  "W": { tier: "wall", name: "Wall-W", role: "audience", view: "lite" },
  "X": { tier: "wall", name: "Wall-X", role: "audience", view: "lite" },
};
const GROUPS = [
  { name: "g0", ids: ["1", "2", "A", "B"] },
  { name: "g1", ids: ["C", "D", "W", "X"] },
];
const ARGS = [
  "--autoplay-policy=no-user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--mute-audio",
];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }
async function collect(obj) {
  await fetch(`${BASE}/collect`, { method: "POST", body: JSON.stringify(obj) }).catch(() => {});
}
function killByUddPrefix(prefix) {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${prefix}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map(l => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
    return pids.length;
  } catch (e) { return 0; }
}
async function cfStream(path) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}${path}`, {
    headers: { "Authorization": `Bearer ${CF_API_TOKEN}`, "User-Agent": "elektron-p3b-rig/1.0" }
  });
  return r.json();
}

function gridUrl(id) {
  const r = ROSTER[id];
  return `${BASE}/grid.html?id=${id}&name=${r.name}&room=${ROOM}&role=${r.role}` +
         `&view=${r.view}&hold=1&cb=${Date.now()}` +
         (r.role === "operator" && OP_TOKEN ? `&optoken=${encodeURIComponent(OP_TOKEN)}` : "") +
         `&remote=${encodeURIComponent(REMOTE_URL)}&token=${encodeURIComponent(TOKEN)}`;
}
function compositeUrl() {
  return `${BASE}/composite.html?id=K&room=${ROOM}` +
         `&remote=${encodeURIComponent(REMOTE_URL)}&token=${encodeURIComponent(TOKEN)}` +
         (ROUTE === "A" && !NOPUB ? `&whip=${encodeURIComponent(WHIP_URL)}` : "") +
         `&cb=${Date.now()}`;
}
function viewerUrl() {
  const mode = ROUTE === "A" ? "whep" : "hls";
  const url = ROUTE === "A" ? WHEP_URL : HLS_URL;
  return `${BASE}/composite-viewer.html?mode=${mode}&url=${encodeURIComponent(url)}&cb=${Date.now()}`;
}

const pages = new Map();
const ctxs = new Map();

async function launchGroup(name, ids, urlFn, viewport) {
  const udd = `${UDD_BASE}-${name}`;
  fs.rmSync(udd, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: "chromium", args: ARGS,
    viewport: viewport || { width: 1600, height: 1000 },
  });
  ctxs.set(name, ctx);
  for (let j = 0; j < ids.length; j++) {
    const id = ids[j];
    const page = j === 0 ? (ctx.pages()[0] || await ctx.newPage()) : await ctx.newPage();
    const logStream = fs.createWriteStream(`${LOGDIR}/p3b-${LABEL}-${id}.console.log`, { flags: "a" });
    page.on("console", m => logStream.write(`${ts()} [${m.type()}] ${m.text()}\n`));
    page.on("pageerror", e => logStream.write(`${ts()} [pageerror] ${e.message}\n`));
    await page.goto(urlFn(id), { waitUntil: "load" });
    pages.set(id, { page, group: name });
  }
  say(`instance ${name} up: ${ids.join(" ")}`);
}
async function state(id) {
  const e = pages.get(id);
  if (!e) return null;
  return e.page.evaluate(() => window.__state).catch(() => null);
}
async function shot(id, tag, clip) {
  const e = pages.get(id);
  if (!e) return;
  await e.page.screenshot({ path: `${LOGDIR}/p3b-${LABEL}-${id}-${tag}.png`, clip }).catch(() => {});
}
async function waitFor(fn, timeoutMs, what) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${what}`);
    await new Promise(r => setTimeout(r, 500));
  }
}

// ---- CPU sampling ----------------------------------------------------------
let ffmpegProc = null;
function cpuSample() {
  const row = { kind: "cpu", t: Date.now() };
  try {
    const out = execSync("ps -Ao pid,pcpu,rss,command").toString().split("\n");
    for (const g of ["gcomp", "gview", "g0", "g1"]) {
      let cpu = 0, rss = 0;
      for (const l of out) {
        if (l.includes(`${UDD_BASE}-${g}`)) {
          const m = l.trim().split(/\s+/);
          cpu += parseFloat(m[1]) || 0; rss += (parseInt(m[2], 10) || 0);
        }
      }
      row[g] = Math.round(cpu * 10) / 10; row[g + "RssMb"] = Math.round(rss / 1024);
    }
    if (ffmpegProc && ffmpegProc.pid) {
      const l = execSync(`ps -o pcpu=,rss= -p ${ffmpegProc.pid} 2>/dev/null || true`).toString().trim();
      if (l) {
        const m = l.split(/\s+/);
        row.ffmpeg = parseFloat(m[0]) || 0; row.ffmpegRssMb = Math.round((parseInt(m[1], 10) || 0) / 1024);
      }
    }
  } catch (e) { row.err = String(e.message).slice(0, 100); }
  return row;
}

// ---- route B: CDP screencast -> ffmpeg -> RTMPS ----------------------------
let cdp = null, scFrames = 0, scDropped = 0;
async function startScreencastFfmpeg(compPage) {
  const ffLog = fs.createWriteStream(`${LOGDIR}/p3b-${LABEL}-ffmpeg.log`, { flags: "a" });
  ffmpegProc = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "info",
    "-use_wallclock_as_timestamps", "1", "-f", "image2pipe", "-c:v", "mjpeg", "-i", "pipe:0",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-filter:v", "setpts=PTS-STARTPTS,fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
    "-profile:v", "main", "-g", "60", "-b:v", "2500k", "-maxrate", "3000k", "-bufsize", "6000k",
    "-c:a", "aac", "-b:a", "96k", "-ar", "48000",
    "-shortest", "-f", "flv", RTMPS,
  ], { stdio: ["pipe", "ignore", "pipe"] });
  ffmpegProc.stderr.on("data", d => ffLog.write(d));
  ffmpegProc.on("exit", (code, sig) => say(`ffmpeg exited code=${code} sig=${sig}`));
  ffmpegProc.stdin.on("error", () => {});
  cdp = await ctxs.get("gcomp").newCDPSession(compPage);
  cdp.on("Page.screencastFrame", ev => {
    try {
      if (ffmpegProc && ffmpegProc.stdin.writable) {
        if (ffmpegProc.stdin.writableLength < 8 * 1024 * 1024) {
          ffmpegProc.stdin.write(Buffer.from(ev.data, "base64"));
          scFrames++;
        } else scDropped++;
      }
    } catch (e) { /* ignore */ }
    cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg", quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1
  });
  say("screencast started -> ffmpeg -> RTMPS");
}
async function stopScreencastFfmpeg() {
  try { if (cdp) await cdp.send("Page.stopScreencast").catch(() => {}); } catch (e) {}
  if (ffmpegProc) {
    const p = ffmpegProc;
    const done = new Promise(res => p.on("exit", res));
    try { p.stdin.end(); } catch (e) {}
    const t = setTimeout(() => { try { p.kill("SIGINT"); } catch (e) {} }, 8000);
    await done;
    clearTimeout(t);
    ffmpegProc = null;
  }
}

// ---- recording poll ---------------------------------------------------------
async function pollVideos(sinceMs, tag) {
  const j = await cfStream(`/stream/live_inputs/${LIVE_UID}/videos`).catch(e => ({ err: String(e) }));
  const vids = (j && j.result) || [];
  const rows = vids.map(v => ({
    uid: v.uid, state: v.status && v.status.state, duration: v.duration,
    created: v.created, readyToStream: v.readyToStream,
    pctComplete: v.status && v.status.pctComplete,
    hls: v.playback && v.playback.hls,
  }));
  await collect({ kind: "recording-poll", tag, t: Date.now(), sinceMs, videos: rows,
                  errors: j && j.errors });
  return rows;
}

const run = async () => {
  say(`P3B run ROUTE=${ROUTE} label=${LABEL} room=${ROOM} steady=${DURATION_S}s nopub=${NOPUB}`);
  say(`live input ${LIVE_UID}`);
  killByUddPrefix(UDD_BASE);
  const hz = await fetch(`${BASE}/healthz`).catch(() => null);
  if (!hz || !hz.ok) { console.error("grid-server not on :8895 — start it first"); process.exit(1); }
  await collect({ kind: "run-start", label: LABEL, route: ROUTE, room: ROOM, t: Date.now(),
                  liveUid: LIVE_UID, duration: DURATION_S });

  // ---- 1. grid up (held -> storm) ------------------------------------------
  for (const g of GROUPS) await launchGroup(g.name, g.ids, gridUrl);
  const tStorm = Date.now();
  await Promise.all([...pages.values()].map(e => e.page.evaluate(() => { window.__go = true; }).catch(() => {})));
  say(`RELEASED ${pages.size} grid participants`);

  const reloads = {};
  async function reviveFailed() {
    for (const id of Object.keys(ROSTER)) {
      const s = await state(id);
      if (!s || s.phase !== "failed") continue;
      reloads[id] = (reloads[id] || 0) + 1;
      if (reloads[id] > 2) throw new Error(`participant ${id} failed after reloads: ${s.error}`);
      say(`participant ${id} publish-exhausted — reloading (${reloads[id]}/2)`);
      await pages.get(id).page.goto(gridUrl(id).replace("hold=1", "hold=0") + `&rl=${reloads[id]}`,
        { waitUntil: "load" }).catch(() => {});
    }
  }
  await waitFor(async () => {
    await reviveFailed();
    for (const id of Object.keys(ROSTER)) {
      const s = await state(id);
      if (!s || s.phase !== "running" || !(s.framesSent > 0)) return false;
    }
    return true;
  }, 150000, "all 8 running");
  say(`all 8 RUNNING (+${Date.now() - tStorm} ms) — casting`);

  // ---- 2. cast --------------------------------------------------------------
  for (const [id, r] of Object.entries(ROSTER)) {
    if (r.tier === "wall") continue;
    await pages.get("1").page.evaluate(([pid, tier]) => window.__promote(pid, tier), [id, r.tier]);
    await new Promise(r2 => setTimeout(r2, 150));
  }
  const lastRecast = {};
  await waitFor(async () => {
    await reviveFailed();
    for (const [id, r] of Object.entries(ROSTER)) {
      const s = await state(id);
      if (!s) return false;
      if (s.phase === "running" && s.tier !== r.tier && Date.now() - (lastRecast[id] || 0) > 5000) {
        lastRecast[id] = Date.now();
        await pages.get("1").page.evaluate(([pid, tier]) => window.__promote(pid, tier), [id, r.tier]);
        return false;
      }
      if (s.tier !== r.tier) return false;
    }
    return true;
  }, 60000, "cast applied");
  say("cast applied (2 featured + 4 live + 2 wall)");

  // ---- 3. composite ---------------------------------------------------------
  await launchGroup("gcomp", ["K"], () => compositeUrl(), { width: 1280, height: 720 });
  const compPage = pages.get("K").page;
  const tComp = Date.now();
  await waitFor(async () => {
    const s = await state("K");
    if (!s || s.phase !== "running") return false;
    const tiles = Object.values(s.tiles || {});
    if (tiles.filter(t => t.valid > 0).length < 6) return false;        // 2 feat + 4 live decoding
    const wallOk = Object.values(s.wall || {}).filter(w => w.freshMs != null).length;
    return wallOk >= 2;
  }, 90000, "composite full grid");
  say(`COMPOSITE READY in ${Date.now() - tComp} ms (6 video tiles + 2 wall snaps)`);
  await collect({ kind: "composite-ready", t: Date.now(), ms: Date.now() - tComp });
  await shot("K", "ready", { x: 0, y: 0, width: 1280, height: 720 });

  // ---- 4. start the capture route -------------------------------------------
  let tPub = null;
  if (!NOPUB) {
    if (ROUTE === "A") {
      const res = await compPage.evaluate(() => window.__startWhip());
      say("startWhip:", res);
      await waitFor(async () => {
        const s = await state("K");
        if (s && s.whip && s.whip.phase === "failed") throw new Error("whip failed: " + s.whip.error);
        return s && s.whip && s.whip.phase === "publishing";
      }, 30000, "whip publishing");
      tPub = Date.now();
      const sK = await state("K");
      say(`WHIP publishing (connect ${sK.whip.connectMs} ms)`);
      await collect({ kind: "publish-start", route: ROUTE, t: tPub, connectMs: sK.whip.connectMs });
    } else {
      await startScreencastFfmpeg(compPage);
      await waitFor(async () => scFrames > 30, 20000, "screencast frames flowing");
      tPub = Date.now();
      await collect({ kind: "publish-start", route: ROUTE, t: tPub, scFrames });
    }

    // ---- 5. viewer ----------------------------------------------------------
    await launchGroup("gview", ["V"], () => viewerUrl(), { width: 1100, height: 800 });
    const tView = Date.now();
    await waitFor(async () => {
      const s = await state("V");
      if (!s) return false;
      if (s.phase === "failed") throw new Error("viewer failed: " + s.error);
      return s.valid && s.valid.K > 0;
    }, ROUTE === "A" ? 60000 : 120000, "viewer decoding composite clock");
    const sV = await state("V");
    say(`VIEWER first valid K decode +${Date.now() - tView} ms after viewer launch ` +
        `(+${Date.now() - tPub} ms after publish start); latK=${sV.last.K} ms`);
    await collect({ kind: "viewer-first-decode", t: Date.now(), sincePubMs: Date.now() - tPub,
                    sinceViewMs: Date.now() - tView, last: sV.last });
    await shot("V", "first");
  }

  // ---- 6. steady -------------------------------------------------------------
  say(`STEADY ${DURATION_S}s`);
  const tSteady = Date.now();
  await collect({ kind: "stage", stage: "steady", t: tSteady });
  let lastVideosPoll = 0, midShotDone = false;
  while (Date.now() - tSteady < DURATION_S * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const sK = await state("K");
    const sV = NOPUB ? null : await state("V");
    const cpu = cpuSample();
    await collect(cpu);
    const kTiles = sK ? Object.entries(sK.tiles || {}).map(([p, t]) =>
      p + (t.lastLatencyMs != null ? "@" + t.lastLatencyMs : ":-")).join(" ") : "?";
    say(`steady +${Math.round((Date.now() - tSteady) / 1000)}s ` +
        `comp[${kTiles}] drawFps=${sK && sK.drawFps} whip=${sK && sK.whip.phase}${sK && sK.whip.fps ? "@" + sK.whip.fps : ""} ` +
        (sV ? `viewer[1@${sV.last["1"]} 2@${sV.last["2"]} K@${sV.last.K}] ${sV.w}x${sV.h} ` : "") +
        (ROUTE === "B" ? `sc=${scFrames}/drop${scDropped} ` : "") +
        `cpu comp=${cpu.gcomp} view=${cpu.gview} ffmpeg=${cpu.ffmpeg || "-"}`);
    // park watch (hls): no valid decode for 15 s -> reload viewer (poll, never park)
    if (!NOPUB && ROUTE === "B" && sV && sV.lastValidT && Date.now() - sV.lastValidT > 15000) {
      say("viewer PARKED (no valid decode 15 s) — reloading");
      await collect({ kind: "viewer-reload", t: Date.now() });
      await pages.get("V").page.goto(viewerUrl(), { waitUntil: "load" }).catch(() => {});
    }
    if (!NOPUB && Date.now() - lastVideosPoll > 30000) {
      lastVideosPoll = Date.now();
      const rows = await pollVideos(Date.now() - tPub, "during");
      if (rows.length) say("videos-during:", JSON.stringify(rows.map(r => r.state + ":" + (r.uid || "").slice(0, 8))));
    }
    if (!midShotDone && Date.now() - tSteady > DURATION_S * 500) {
      midShotDone = true;
      await shot("K", "steady", { x: 0, y: 0, width: 1280, height: 720 });
      if (!NOPUB) await shot("V", "steady");
    }
  }
  await shot("K", "final", { x: 0, y: 0, width: 1280, height: 720 });
  if (!NOPUB) await shot("V", "final");
  await collect({ kind: "stage-end", stage: "steady", t: Date.now() });

  // ---- 7. stop the stream ----------------------------------------------------
  let tEnd = null;
  if (!NOPUB) {
    if (ROUTE === "A") {
      const res = await compPage.evaluate(() => window.__stopWhip());
      say("stopWhip:", res);
    } else {
      await stopScreencastFfmpeg();
      say(`screencast total frames=${scFrames} dropped=${scDropped}`);
    }
    tEnd = Date.now();
    await collect({ kind: "publish-end", route: ROUTE, t: tEnd, scFrames, scDropped });

    // ---- 8. poll for the recorded asset -------------------------------------
    say(`polling for recorded asset (budget ${POLL_S}s)`);
    const tPoll = Date.now();
    let readyVid = null, sawAny = false;
    while (Date.now() - tPoll < POLL_S * 1000) {
      const rows = await pollVideos(Date.now() - tEnd, "after");
      if (rows.length) {
        sawAny = true;
        say(`+${Math.round((Date.now() - tEnd) / 1000)}s videos:`,
            JSON.stringify(rows.map(r => `${(r.uid || "").slice(0, 8)}:${r.state}:${r.duration}s:${r.pctComplete || ""}`)));
        readyVid = rows.find(r => r.state === "ready");
        if (readyVid) break;
      } else {
        say(`+${Math.round((Date.now() - tEnd) / 1000)}s videos: NONE`);
      }
      await new Promise(r => setTimeout(r, 10000));
    }
    if (readyVid) {
      const readyDelayMs = Date.now() - tEnd;
      say(`RECORDING READY: uid=${readyVid.uid} duration=${readyVid.duration}s ` +
          `readiness ${Math.round(readyDelayMs / 1000)}s after stream end`);
      await collect({ kind: "recording-ready", t: Date.now(), uid: readyVid.uid,
                      duration: readyVid.duration, readyDelayMs, hls: readyVid.hls });
    } else {
      say(`NO ready recording within ${POLL_S}s (sawAny=${sawAny}) — route ${ROUTE} verdict data`);
      await collect({ kind: "recording-absent", t: Date.now(), route: ROUTE, sawAny,
                      polledS: Math.round((Date.now() - tPoll) / 1000) });
    }
  }

  // ---- 9. teardown -----------------------------------------------------------
  const finalCpu = cpuSample();
  await collect(Object.assign({ kind: "final-cpu" }, finalCpu));
  await new Promise(r => setTimeout(r, 1500));
  for (const ctx of ctxs.values()) await ctx.close().catch(() => {});
  const leftover = killByUddPrefix(UDD_BASE);
  say(`run done (killed ${leftover} leftover pids)`);
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  await collect({ kind: "driver-fatal", t: Date.now(), error: String(e.message || e) });
  await stopScreencastFfmpeg().catch(() => {});
  for (const ctx of ctxs.values()) await ctx.close().catch(() => {});
  killByUddPrefix(UDD_BASE);
  process.exit(1);
});
