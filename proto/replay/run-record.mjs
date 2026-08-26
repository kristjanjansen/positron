#!/usr/bin/env node
// Replay-test RECORD driver — records the show page to Stream via the proven
// p3b pipeline (CDP screencast -> ffmpeg wallclock-PTS fps=30 x264+AAC -> RTMPS,
// recording automatic), while operator.mjs fires 12 cues through the DEPLOYED
// elektron-rtc room. Captures THREE candidate T0 anchors:
//   T0stamp — Date.now() when the FIRST screencast frame is written to ffmpeg
//   T0meta  — that frame's CDP capture timestamp (ev.metadata.timestamp * 1000)
//   (the third — content-derived from burned pixels — is computed at replay)
// Usage (server on :8885 first):
//   node run-record.mjs                       # full 200 s recorded run
//   NOPUB=1 DURATION=30 OFFSETS=6,10,14 node run-record.mjs   # no-stream smoke
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync, spawn } from "child_process";

const ROOT = "/Users/s32863/personal/elektron";
const HERE = `${ROOT}/proto/replay`;
const BASE = "http://127.0.0.1:8885";
const REMOTE = "https://elektron-rtc.kristjan-jansen.workers.dev";
const ROOM = process.env.ROOM || "replay-test";
const NOPUB = process.env.NOPUB === "1";
const DURATION_S = parseInt(process.env.DURATION || "200", 10);
const POLL_S = parseInt(process.env.POLL_S || "300", 10);
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-elektron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/replay-test-udd";
const LOGDIR = `${HERE}/logs`;
fs.mkdirSync(LOGDIR, { recursive: true });
fs.mkdirSync(`${HERE}/artifacts`, { recursive: true });

function envVal(k) {
  const l = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find(x => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
}
const TOKEN = envVal("ROOM_TOKEN");
const CF_API_TOKEN = envVal("CF_API_TOKEN");
const CF_ACCOUNT_ID = envVal("CF_ACCOUNT_ID");
const LIVE = JSON.parse(fs.readFileSync(`${HERE}/artifacts/replay-live-input.json`, "utf8")).result;
const LIVE_UID = LIVE.uid;
const RTMPS = LIVE.rtmps.url + LIVE.rtmps.streamKey;

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }
function killByUddPrefix(prefix) {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${prefix}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map(l => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
    return pids.length;
  } catch { return 0; }
}
async function cfStream(path) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}${path}`, {
    headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "User-Agent": "elektron-replay-rig/1.0" },
  });
  return r.json();
}

// ---- screencast -> ffmpeg -> RTMPS (p3b route B, verbatim settings) ---------
let ffmpegProc = null, cdp = null, scFrames = 0, scDropped = 0;
let tFirstStamp = null, tFirstMeta = null;
async function startScreencastFfmpeg(ctx, page) {
  const ffLog = fs.createWriteStream(`${LOGDIR}/record-ffmpeg.log`, { flags: "a" });
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
  cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", ev => {
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
  say("screencast started -> ffmpeg -> RTMPS");
}
async function stopScreencastFfmpeg() {
  try { if (cdp) await cdp.send("Page.stopScreencast").catch(() => {}); } catch {}
  if (ffmpegProc) {
    const p = ffmpegProc;
    const done = new Promise(res => p.on("exit", res));
    try { p.stdin.end(); } catch {}
    const t = setTimeout(() => { try { p.kill("SIGINT"); } catch {} }, 8000);
    await done; clearTimeout(t); ffmpegProc = null;
  }
}

const run = async () => {
  say(`RECORD run room=${ROOM} nopub=${NOPUB} duration=${DURATION_S}s liveInput=${LIVE_UID}`);
  const hz = await fetch(`${BASE}/healthz`).catch(() => null);
  if (!hz || !hz.ok) { console.error("replay-server not on :8885 — start it first"); process.exit(1); }
  killByUddPrefix(UDD_BASE);
  const tRunStart = Date.now();

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
  page.on("console", m => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", e => conLog.write(`${ts()} [pageerror] ${e.message}\n`));
  await page.goto(`${BASE}/proto/replay/show.html?room=${ROOM}&id=stage&remote=${encodeURIComponent(REMOTE)}` +
                  `&token=${encodeURIComponent(TOKEN)}&cb=${Date.now()}`, { waitUntil: "load" });
  const tShow = Date.now();
  for (;;) {
    const s = await page.evaluate(() => window.__state).catch(() => null);
    if (s && s.phase === "running" && s.wsState === "open" && s.drawFrames > 60) break;
    if (Date.now() - tShow > 60000) throw new Error("show page never became ready");
    await new Promise(r => setTimeout(r, 500));
  }
  say(`show page RUNNING (+${Date.now() - tShow} ms)`);
  await page.screenshot({ path: `${LOGDIR}/record-show-ready.png` });

  // ---- publish + operator ---------------------------------------------------
  let T0 = null;
  if (!NOPUB) {
    await startScreencastFfmpeg(ctx, page);
    const tWait = Date.now();
    while (tFirstStamp == null || scFrames < 30) {
      if (Date.now() - tWait > 20000) throw new Error("screencast frames not flowing");
      await new Promise(r => setTimeout(r, 200));
    }
    T0 = tFirstStamp;
  } else {
    T0 = Date.now();
  }
  say(`T0 (publish start) = ${T0}`);
  const operator = spawn("node", [`${HERE}/operator.mjs`], {
    env: { ...process.env, BASE_MS: String(T0), ROOM, OUT: `${HERE}/artifacts/operator-log.json` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const opLog = fs.createWriteStream(`${LOGDIR}/record-operator.log`, { flags: "a" });
  operator.stdout.on("data", d => { opLog.write(d); process.stdout.write("  op| " + d.toString()); });
  operator.stderr.on("data", d => opLog.write(d));
  let opExit = null;
  operator.on("exit", c => { opExit = c; say(`operator exited ${c}`); });

  // ---- steady ---------------------------------------------------------------
  let midShot = false;
  while (Date.now() - T0 < DURATION_S * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const s = await page.evaluate(() => window.__state).catch(() => null);
    say(`steady +${Math.round((Date.now() - T0) / 1000)}s drawFps=${s && s.drawFps} ` +
        `cues recv=${s && s.cuesReceived} fired=${s && s.cuesFired} ` +
        `cur=${s && s.currentCue && s.currentCue.id} sc=${scFrames}/drop${scDropped}`);
    if (opExit != null && opExit !== 0) throw new Error("operator failed");
    if (!midShot && Date.now() - T0 > DURATION_S * 500) {
      midShot = true;
      await page.screenshot({ path: `${LOGDIR}/record-show-mid.png` });
    }
  }
  await page.screenshot({ path: `${LOGDIR}/record-show-final.png` });

  // live-fire ground truth from the page itself (before teardown)
  const finalState = await page.evaluate(() => window.__state);
  fs.writeFileSync(`${HERE}/artifacts/replay-live-fires.json`,
    JSON.stringify({ T0, room: ROOM, telemetry: finalState.telemetry }, null, 2));
  say(`live fires captured: ${finalState.telemetry.length} ` +
      `(lateMs: ${finalState.telemetry.map(t => Math.round(t.lateMs)).join(",")})`);

  // ---- stop stream ----------------------------------------------------------
  let tEnd = null;
  if (!NOPUB) { await stopScreencastFfmpeg(); tEnd = Date.now(); say(`stream ended; frames=${scFrames} dropped=${scDropped}`); }
  await ctx.close().catch(() => {});
  killByUddPrefix(UDD_BASE);

  // ---- wait for operator then fetch cuelog ---------------------------------
  const tOp = Date.now();
  while (opExit == null && Date.now() - tOp < 30000) await new Promise(r => setTimeout(r, 500));
  const cuelog = await (await fetch(`${REMOTE}/room/${ROOM}/cuelog?token=${TOKEN}`)).json();
  fs.writeFileSync(`${HERE}/artifacts/replay-cuelog.json`, JSON.stringify(cuelog, null, 2));
  say(`cuelog fetched: ${cuelog.count} entries`);

  // ---- poll for the VOD asset ----------------------------------------------
  let vod = null;
  if (!NOPUB) {
    say(`polling for VOD (budget ${POLL_S}s)`);
    const tPoll = Date.now();
    while (Date.now() - tPoll < POLL_S * 1000) {
      const j = await cfStream(`/stream/live_inputs/${LIVE_UID}/videos`).catch(() => null);
      const vids = ((j && j.result) || []).filter(v => new Date(v.created).getTime() >= tRunStart - 60000);
      const ready = vids.find(v => v.status && v.status.state === "ready");
      say(`+${Math.round((Date.now() - tEnd) / 1000)}s videos: ` +
          vids.map(v => `${v.uid.slice(0, 8)}:${v.status && v.status.state}:${v.duration}s`).join(" ") || "none");
      if (ready) { vod = ready; break; }
      await new Promise(r => setTimeout(r, 10000));
    }
    if (!vod) throw new Error("no ready VOD within budget");
    fs.writeFileSync(`${HERE}/artifacts/replay-vod.json`, JSON.stringify(vod, null, 2));
    say(`VOD READY uid=${vod.uid} duration=${vod.duration}s created=${vod.created} hls=${vod.playback && vod.playback.hls}`);
  }

  // ---- run meta -------------------------------------------------------------
  const meta = {
    room: ROOM, liveUid: LIVE_UID, tRunStart, T0stamp: T0, T0meta: tFirstMeta, tEnd,
    scFrames, scDropped, durationS: DURATION_S,
    vodUid: vod && vod.uid, vodDurationS: vod && vod.duration, vodCreated: vod && vod.created,
    vodHls: vod && vod.playback && vod.playback.hls,
  };
  fs.writeFileSync(`${HERE}/artifacts/replay-run-meta.json`, JSON.stringify(meta, null, 2));
  say("RECORD RUN DONE — meta written");
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  await stopScreencastFfmpeg().catch(() => {});
  killByUddPrefix(UDD_BASE);
  process.exit(1);
});
