#!/usr/bin/env node
// LOCAL-FIRST ARCHIVE record driver — the proven p3b show pipeline (headless
// Chrome show page with burned clock row + CUE ZONE, CDP screencast -> ffmpeg)
// but the output is LOCAL segmented HLS instead of RTMPS/Stream:
//     -f hls -hls_time 4 -hls_list_size 0  ->  RECDIR/seg%05d.ts + index.m3u8
// The uploader daemon (uploader.mjs, spawned here) ships every closed segment
// to R2 and deletes it locally — bounded disk while recording.
//
// T0 candidates stamped (archive-meta.json):
//   T0stamp   Date.now() at the FIRST screencast frame written to ffmpeg stdin
//             == the NATIVE anchor: with -use_wallclock_as_timestamps 1 +
//             setpts=PTS-STARTPTS the output timeline's t=0 IS that first
//             frame, and local HLS never trims the head (no RTMPS cold start).
//   T0meta    that frame's CDP capture timestamp.
//   tFfFirstProgress  wall clock when ffmpeg's -progress first reports a frame
//             actually encoded (lags T0stamp by encoder latency — comparison).
//   tSpawnFfmpeg      process-start stamp (comparison).
// Usage (replay-server on :8885 first):  node record-local.mjs
//   [ROOM=archive-test] [DURATION=190] [OFFSETS=15,36,...] [NOPUB=1 smoke]
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync, spawn } from "child_process";

const ROOT = "/Users/s32863/personal/elektron";
const HERE = `${ROOT}/proto/archive`;
const REPLAY = `${ROOT}/proto/replay`;
const BASE = "http://127.0.0.1:8885";
const REMOTE = "https://elektron-rtc.kristjan-jansen.workers.dev";
// Fresh room + recdir + R2 prefix PER RUN by default (timestamp suffix): the
// cuelog, local segments and R2 objects of one run can never poison a rerun
// (per-room cuelog is append-only; a reused prefix would clobber/mix segments).
// Explicit ROOM=/RECDIR= still override for deliberate reuse.
const RUNTS = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15); // e.g. 20260826T093015
const ROOM = process.env.ROOM || `archive-test-${RUNTS}`;
const NOPUB = process.env.NOPUB === "1";
const DURATION_S = parseInt(process.env.DURATION || "190", 10);
const OFFSETS = process.env.OFFSETS || "15,36,57,78,99,120,141,162";   // 8 cues, now/sched alternating
const SCRATCH = "/private/tmp/claude-501/-Users-s32863-personal-elektron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad";
const RECDIR = process.env.RECDIR || `${SCRATCH}/archive-rec-${RUNTS}`;
const UDD_BASE = `${SCRATCH}/archive-test-udd`;
const BUCKET = "elektron-archive-test";
const PREFIX = `shows/${ROOM}`;
const PUBBASE = "https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev";
const LOGDIR = `${HERE}/logs`;
fs.mkdirSync(LOGDIR, { recursive: true });
fs.mkdirSync(`${HERE}/artifacts`, { recursive: true });
fs.rmSync(RECDIR, { recursive: true, force: true });
fs.mkdirSync(RECDIR, { recursive: true });

function envVal(k) {
  const l = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find((x) => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
}
const TOKEN = envVal("ROOM_TOKEN");

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }
function killByUddPrefix(prefix) {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${prefix}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map((l) => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
    return pids.length;
  } catch { return 0; }
}

// ---- screencast -> ffmpeg -> LOCAL HLS -------------------------------------
const children = [];   // every spawned child — the fatal path kills them ALL
let ffmpegProc = null, cdp = null, scFrames = 0, scDropped = 0;
let tSpawnFfmpeg = null, tFirstStamp = null, tFirstMeta = null, tFfFirstProgress = null, ffExit = null;
async function startScreencastFfmpeg(ctx, page) {
  const ffLog = fs.createWriteStream(`${LOGDIR}/record-ffmpeg.log`, { flags: "a" });
  tSpawnFfmpeg = Date.now();
  ffmpegProc = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "info",
    "-use_wallclock_as_timestamps", "1", "-f", "image2pipe", "-c:v", "mjpeg", "-i", "pipe:0",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-filter:v", "setpts=PTS-STARTPTS,fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
    "-profile:v", "main", "-g", "60", "-b:v", "2500k", "-maxrate", "3000k", "-bufsize", "6000k",
    "-c:a", "aac", "-b:a", "96k", "-ar", "48000",
    "-shortest",
    "-progress", "pipe:3", "-stats_period", "0.1",
    "-f", "hls", "-hls_time", "4", "-hls_list_size", "0",
    "-hls_segment_filename", `${RECDIR}/seg%05d.ts`, `${RECDIR}/index.m3u8`,
  ], { stdio: ["pipe", "ignore", "pipe", "pipe"] });
  ffmpegProc.stderr.on("data", (d) => ffLog.write(d));
  let progBuf = "";
  ffmpegProc.stdio[3].on("data", (d) => {
    progBuf += d.toString();
    if (tFfFirstProgress == null) {
      const m = progBuf.match(/frame=\s*(\d+)/);
      if (m && parseInt(m[1], 10) >= 1) {
        tFfFirstProgress = Date.now();
        say(`ffmpeg first encoded frame reported: tFfFirstProgress=${tFfFirstProgress} (+${tFfFirstProgress - (tFirstStamp || tSpawnFfmpeg)} ms after first write)`);
      }
    }
    if (progBuf.length > 65536) progBuf = progBuf.slice(-8192);
  });
  ffmpegProc.on("exit", (code, sig) => { ffExit = { code, sig, t: Date.now() }; say(`ffmpeg exited code=${code} sig=${sig}`); });
  ffmpegProc.stdin.on("error", () => {});
  cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", (ev) => {
    try {
      if (ffmpegProc && ffmpegProc.stdin.writable) {
        if (ffmpegProc.stdin.writableLength < 8 * 1024 * 1024) {
          if (tFirstStamp == null) {
            tFirstStamp = Date.now();
            tFirstMeta = ev.metadata && ev.metadata.timestamp ? Math.round(ev.metadata.timestamp * 1000) : null;
            say(`FIRST FRAME -> ffmpeg: T0stamp=${tFirstStamp} T0meta=${tFirstMeta} (delta ${tFirstMeta ? tFirstStamp - tFirstMeta : "?"} ms)`);
          }
          ffmpegProc.stdin.write(Buffer.from(ev.data, "base64"));
          scFrames++;
        } else scDropped++;
      }
    } catch {}
    cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg", quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1,
  });
  say("screencast started -> ffmpeg -> local HLS " + RECDIR);
}
async function stopScreencastFfmpeg() {
  try { if (cdp) await cdp.send("Page.stopScreencast").catch(() => {}); } catch {}
  if (ffmpegProc) {
    const p = ffmpegProc;
    const done = new Promise((res) => p.on("exit", res));
    try { p.stdin.end(); } catch {}
    const t = setTimeout(() => { try { p.kill("SIGINT"); } catch {} }, 8000);
    await done; clearTimeout(t); ffmpegProc = null;
  }
}

const run = async () => {
  say(`ARCHIVE RECORD room=${ROOM} nopub=${NOPUB} duration=${DURATION_S}s offsets=${OFFSETS} rec=${RECDIR}`);
  const hz = await fetch(`${BASE}/healthz`).catch(() => null);
  if (!hz || !hz.ok) { console.error("replay-server not on :8885 — start it first"); process.exit(1); }
  killByUddPrefix(UDD_BASE);

  // ---- show page up ---------------------------------------------------------
  const udd = `${UDD_BASE}-show`;
  fs.rmSync(udd, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
           "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--mute-audio"],
    viewport: { width: 1280, height: 720 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const conLog = fs.createWriteStream(`${LOGDIR}/record-show.console.log`, { flags: "a" });
  page.on("console", (m) => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", (e) => conLog.write(`${ts()} [pageerror] ${e.message}\n`));
  await page.goto(`${BASE}/proto/replay/show.html?room=${ROOM}&id=stage&remote=${encodeURIComponent(REMOTE)}` +
                  `&token=${encodeURIComponent(TOKEN)}&cb=${Date.now()}`, { waitUntil: "load" });
  const tShow = Date.now();
  for (;;) {
    const s = await page.evaluate(() => window.__state).catch(() => null);
    if (s && s.phase === "running" && s.wsState === "open" && s.drawFrames > 60) break;
    if (Date.now() - tShow > 60000) throw new Error("show page never became ready");
    await new Promise((r) => setTimeout(r, 500));
  }
  say(`show page RUNNING (+${Date.now() - tShow} ms)`);

  // ---- uploader daemon ------------------------------------------------------
  let upExit = null, uploader = null;
  if (!NOPUB) {
    uploader = spawn("node", [`${HERE}/uploader.mjs`], {
      env: { ...process.env, RECDIR, BUCKET, PREFIX, PUBBASE,
             OUTDIR: `${HERE}/artifacts`, RESULTS: `${ROOT}/results/archive-upload.jsonl` },
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.push(uploader);
    const upLog = fs.createWriteStream(`${LOGDIR}/record-uploader.log`, { flags: "a" });
    uploader.stdout.on("data", (d) => { upLog.write(d); process.stdout.write("  " + d.toString()); });
    uploader.stderr.on("data", (d) => upLog.write(d));
    uploader.on("exit", (c) => { upExit = c; say(`uploader exited ${c}`); });
  }

  // ---- publish + operator ---------------------------------------------------
  await startScreencastFfmpeg(ctx, page);
  const tWait = Date.now();
  while (tFirstStamp == null || scFrames < 30) {
    if (Date.now() - tWait > 20000) throw new Error("screencast frames not flowing");
    await new Promise((r) => setTimeout(r, 200));
  }
  const T0 = tFirstStamp;
  say(`T0 native (first frame -> ffmpeg) = ${T0}`);
  const operator = spawn("node", [`${REPLAY}/operator.mjs`], {
    env: { ...process.env, BASE_MS: String(T0), ROOM, OFFSETS, OUT: `${HERE}/artifacts/operator-log.json` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(operator);
  const opLog = fs.createWriteStream(`${LOGDIR}/record-operator.log`, { flags: "a" });
  operator.stdout.on("data", (d) => { opLog.write(d); process.stdout.write("  op| " + d.toString()); });
  operator.stderr.on("data", (d) => opLog.write(d));
  let opExit = null;
  operator.on("exit", (c) => { opExit = c; say(`operator exited ${c}`); });

  // ---- steady ---------------------------------------------------------------
  let midShot = false;
  while (Date.now() - T0 < DURATION_S * 1000) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await page.evaluate(() => window.__state).catch(() => null);
    say(`steady +${Math.round((Date.now() - T0) / 1000)}s drawFps=${s && s.drawFps} ` +
        `cues recv=${s && s.cuesReceived} fired=${s && s.cuesFired} ` +
        `cur=${s && s.currentCue && s.currentCue.id} sc=${scFrames}/drop${scDropped}`);
    if (opExit != null && opExit !== 0) throw new Error("operator failed");
    if (ffExit) throw new Error("ffmpeg died mid-recording: " + JSON.stringify(ffExit));
    if (!midShot && Date.now() - T0 > DURATION_S * 500) {
      midShot = true;
      await page.screenshot({ path: `${LOGDIR}/record-show-mid.png` });
    }
  }
  await page.screenshot({ path: `${LOGDIR}/record-show-final.png` });

  // live-fire ground truth from the page itself (before teardown)
  const finalState = await page.evaluate(() => window.__state);
  fs.writeFileSync(`${HERE}/artifacts/archive-live-fires.json`,
    JSON.stringify({ T0, room: ROOM, telemetry: finalState.telemetry }, null, 2));
  say(`live fires captured: ${finalState.telemetry.length} ` +
      `(lateMs: ${finalState.telemetry.map((t) => Math.round(t.lateMs)).join(",")})`);

  // ---- stop -----------------------------------------------------------------
  await stopScreencastFfmpeg();
  const tEnd = Date.now();
  say(`recording ended; frames=${scFrames} dropped=${scDropped}`);
  await ctx.close().catch(() => {});
  killByUddPrefix(UDD_BASE);

  // ---- wait for operator then cuelog ---------------------------------------
  const tOp = Date.now();
  while (opExit == null && Date.now() - tOp < 30000) await new Promise((r) => setTimeout(r, 500));
  const cuelog = await (await fetch(`${REMOTE}/room/${ROOM}/cuelog?token=${TOKEN}`)).json();
  fs.writeFileSync(`${HERE}/artifacts/archive-cuelog.json`, JSON.stringify(cuelog, null, 2));
  say(`cuelog fetched: ${cuelog.count} entries`);

  // ---- wait for the uploader to drain (poll, never park) --------------------
  if (uploader) {
    const tU = Date.now();
    while (upExit == null && Date.now() - tU < 300000) await new Promise((r) => setTimeout(r, 1000));
    if (upExit == null) { say("uploader still running after 300 s — killing"); uploader.kill("SIGKILL"); }
  }

  // ---- run meta -------------------------------------------------------------
  const meta = {
    room: ROOM, recdir: RECDIR, bucket: BUCKET, prefix: PREFIX,
    hlsUrl: `${PUBBASE}/${PREFIX}/index.m3u8`,
    T0native: T0,
    stamps: { tSpawnFfmpeg, T0stamp: T0, T0meta: tFirstMeta, tFfFirstProgress, tEnd },
    scFrames, scDropped, durationS: DURATION_S, offsets: OFFSETS,
    uploaderExit: upExit, ffExit,
  };
  fs.writeFileSync(`${HERE}/artifacts/archive-meta.json`, JSON.stringify(meta, null, 2));
  say(`ARCHIVE RECORD DONE — hls=${meta.hlsUrl} T0native=${T0}`);
  process.exit(upExit === 0 || NOPUB ? 0 : 3);
};

run().catch(async (e) => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  await stopScreencastFfmpeg().catch(() => {});
  // Kill EVERY spawned child (uploader, operator, …): an orphaned uploader
  // would keep writing this run's prefix long after the driver is gone.
  for (const c of children) { try { c.kill("SIGKILL"); } catch {} }
  killByUddPrefix(UDD_BASE);
  process.exit(1);
});
