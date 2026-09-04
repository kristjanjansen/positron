#!/usr/bin/env node
// ============================================================================
// PROTO A driver — participant self-recording scenarios (plan: two-proto
// comparison; sibling PROTO B = proto/centralrec, untouched).
//
//   SCENARIO=smoke|a1|a2|a3|a4|a5 node run-selfrec.mjs
//
//   smoke  20 s end-to-end sanity
//   a1     90 s baseline live upload — per-chunk lag p50/p95, bitrate, hwm
//   a2     90 s with a 25 s CDP offline window at t=30 — IndexedDB buffering,
//          zero loss, drain time, max buffered bytes
//   a3     SIGKILL the (own!) Chrome at t=45 — loss ≤ 1 timeslice, exact ms of
//          media lost via burned-clock of the last uploaded frame vs kill time
//   a4     30 s clean stop + finalize — manifest references only verified
//          chunks; degraded => exit 2 (proto/archive pattern)
//   a5     playback integrity of the a1 show — download+md5-verify all chunks,
//          concat, decode ALL frames, first-frame burned clock vs stamped T0
//
// House rules honored: headless chromium only (canvas.captureStream — the OS
// camera is wedged; fake-device flags passed defensively, getUserMedia never
// called); wall clock burned into pixels; kills ONLY processes matching this
// proto's own UDD prefix (selfrec-udd); no build step, plain node ESM.
// ============================================================================
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import crypto from "crypto";
import { execSync, spawn } from "child_process";

const ROOT = "/Users/s32863/personal/positron";
const HERE = `${ROOT}/proto/selfrec`;
const SCRATCH = "/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad";
const BASE = "https://selfrec.positron.studio";
const PUB = "https://archive.positron.studio";
const SCENARIO = (process.env.SCENARIO || "smoke").toLowerCase();
const RUNTS = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
const PART = "p1";
const TIMESLICE = 2000;
const RESULTS = `${ROOT}/results/selfrec-${SCENARIO}.jsonl`;
const UDD = `${SCRATCH}/selfrec-udd-${SCENARIO}`;      // kill pattern = selfrec-udd
const LOGDIR = `${HERE}/logs`;
const ART = `${HERE}/artifacts`;
fs.mkdirSync(LOGDIR, { recursive: true });
fs.mkdirSync(ART, { recursive: true });
fs.mkdirSync(`${SCRATCH}`, { recursive: true });

const TOKEN = fs.readFileSync(`${HERE}/.env.selfrec`, "utf8").trim().split("=")[1];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "drv|", ...a); }
function jsonl(row) { fs.appendFileSync(RESULTS, JSON.stringify({ t: Date.now(), scenario: SCENARIO, ...row }) + "\n"); }
function pct(sorted, p) { return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null; }
function killByUddPrefix(prefix) {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${prefix}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map((l) => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
    return pids;
  } catch { return []; }
}
async function api(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts, headers: { Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) },
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}
function mergeReport(section, data) {
  const p = `${ART}/selfrec-report.json`;
  let rep = {};
  try { rep = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
  rep[section] = data;
  rep.updatedAt = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(rep, null, 2));
}

// ---- burned-row decoder (contract: NB=64 BW=12 RX=32 y=600 h=48, pid 'P') ---
const W = 1280, H = 720, FRAME = W * H;
function decodeRow(gray) {                     // gray: Buffer of one 1280x720 frame
  const y = 600 + 24;                          // row center
  const bits = [];
  for (let i = 0; i < 64; i++) {
    const cx = 32 + i * 12 + 6;
    let s = 0, n = 0;
    for (let dy = -8; dy <= 8; dy += 8) for (let dx = -2; dx <= 2; dx += 2) {
      s += gray[(y + dy) * W + cx + dx]; n++;
    }
    bits.push(s / n > 110 ? 1 : 0);
  }
  const bytes = [];
  for (let b = 0; b < 8; b++) {
    let v = 0;
    for (let i = 0; i < 8; i++) v = (v << 1) | bits[b * 8 + i];
    bytes.push(v);
  }
  let ck = 0; for (let i = 0; i < 7; i++) ck ^= bytes[i];
  if (ck !== bytes[7] || bytes[6] !== "P".charCodeAt(0)) return null;
  let ms = 0; for (let i = 0; i < 6; i++) ms = ms * 256 + bytes[i];
  return ms;
}
// Decode a webm by streaming ALL frames as gray rawvideo; return first/last
// decodable clocks + frame counts (also = "it plays" evidence).
function decodeWebm(file) {
  return new Promise((resolve, reject) => {
    // -fps_mode passthrough: MediaRecorder webm carries a 1 kHz timebase and no
    // fps; without it ffmpeg CFR-duplicates to ~1000 fps (measured: 90090
    // "frames" for a 90 s / ~2700-frame recording).
    const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file,
      "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"]);
    let buf = Buffer.alloc(0), frames = 0, decoded = 0;
    let firstClock = null, firstFrameIdx = null, lastClock = null, lastFrameIdx = null;
    ff.stdout.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= FRAME) {
        const frame = buf.subarray(0, FRAME);
        const ms = decodeRow(frame);
        if (ms != null) {
          decoded++;
          if (firstClock == null) { firstClock = ms; firstFrameIdx = frames; }
          lastClock = ms; lastFrameIdx = frames;
        }
        frames++;
        buf = buf.subarray(FRAME);
      }
    });
    let err = "";
    ff.stderr.on("data", (d) => { err += d.toString(); });
    ff.on("exit", () => resolve({ frames, decoded, firstClock, firstFrameIdx, lastClock, lastFrameIdx, ffErr: err.slice(0, 400) }));
    ff.on("error", reject);
  });
}
async function downloadConcat(show, dir, outFile) {
  const list = (await api(`/list/${show}/${PART}`)).json;
  const chunks = list.objects.filter((o) => o.key.includes("/chunk-")).sort((a, b) => a.key.localeCompare(b.key));
  fs.mkdirSync(dir, { recursive: true });
  const out = fs.createWriteStream(outFile);
  let bytes = 0, md5ok = 0;
  for (const c of chunks) {
    const r = await fetch(`${PUB}/${c.key}`);
    if (!r.ok) throw new Error(`download ${c.key}: ${r.status}`);
    const b = Buffer.from(await r.arrayBuffer());
    const md5 = crypto.createHash("md5").update(b).digest("hex");
    if (`"${md5}"` === c.etag && b.length === c.size) md5ok++;
    out.write(b);
    bytes += b.length;
  }
  await new Promise((r) => out.end(r));
  return { chunkCount: chunks.length, bytes, md5ok, chunks };
}

// ---- scenario plumbing ------------------------------------------------------
const children = [];
let collector = null, ctx = null;

async function startCollector() {
  collector = spawn("node", [`${HERE}/collector.mjs`], {
    env: { ...process.env, RESULTS },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(collector);
  const log = fs.createWriteStream(`${LOGDIR}/collector-${SCENARIO}.txt`, { flags: "a" });
  collector.stdout.on("data", (d) => log.write(d));
  collector.stderr.on("data", (d) => log.write(d));
  for (let i = 0; i < 40; i++) {
    const h = await fetch("http://127.0.0.1:8894/healthz").catch(() => null);
    if (h && h.ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("collector never came up on :8894");
}

async function launchPage(show, durationS) {
  fs.rmSync(UDD, { recursive: true, force: true });
  ctx = await chromium.launchPersistentContext(UDD, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
           "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
           "--mute-audio",
           // defensive only — getUserMedia is never called (camera is OS-wedged)
           "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    viewport: { width: 1280, height: 720 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const conLog = fs.createWriteStream(`${LOGDIR}/page-${SCENARIO}.console.txt`, { flags: "a" });
  page.on("console", (m) => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", (e) => conLog.write(`${ts()} [pageerror] ${e.message}\n`));
  await page.goto(`http://127.0.0.1:8894/participant.html?show=${show}&participant=${PART}` +
    `&duration=${durationS}&timeslice=${TIMESLICE}&token=${encodeURIComponent(TOKEN)}&cb=${Date.now()}`,
    { waitUntil: "load" });
  return page;
}
const getM = (page) => page.evaluate(() => {
  const m = window.__metrics;
  return JSON.parse(JSON.stringify({ ...m, rows: m.rows }));
}).catch(() => null);

async function waitDone(page, maxMs) {
  const t0 = Date.now();
  for (;;) {
    const m = await getM(page);
    if (m && m.done) return m;
    if (Date.now() - t0 > maxMs) throw new Error("page never reached done");
    await new Promise((r) => setTimeout(r, 1000));
  }
}
function chunkStats(m) {
  const v = m.rows.filter((r) => r.verified && r.lagMs != null);
  const lags = v.map((r) => r.lagMs).sort((a, b) => a - b);
  return {
    chunks: m.rows.length, verified: v.length,
    bytesTotal: m.bytesTotal,
    lagMs: { p50: pct(lags, 0.5), p95: pct(lags, 0.95), min: lags[0] ?? null, max: lags[lags.length - 1] ?? null },
    effectiveMbps: m.rows.length > 1
      ? +(m.bytesTotal * 8 / ((m.rows[m.rows.length - 1].closeT - m.T0recStartDate) / 1000) / 1e6).toFixed(3)
      : null,
    memHwmMB: +(m.memHwmBytes / 1048576).toFixed(1),
    queueHwmKB: Math.round(m.queueHwmBytes / 1024),
    idbHwmKB: Math.round(m.idbHwmBytes / 1024),
    storageUsageHwmKB: Math.round(m.storageUsageHwm / 1024),
    attemptsTotal: m.rows.reduce((s, r) => s + r.attempts, 0),
  };
}
async function teardown() {
  try { if (ctx) await ctx.close(); } catch {}
  ctx = null;
  killByUddPrefix("selfrec-udd");
  for (const c of children) { try { c.kill("SIGKILL"); } catch {} }
}

// ---- scenarios --------------------------------------------------------------
async function scenarioBasic(durationS, section) {
  const show = `${SCENARIO}-${RUNTS}`;
  say(`${SCENARIO}: show=${show} duration=${durationS}s`);
  await startCollector();
  const page = await launchPage(show, durationS);
  const m = await waitDone(page, (durationS + 180) * 1000);
  const stats = chunkStats(m);
  const list = (await api(`/list/${show}/${PART}`)).json;
  const r2chunks = list.objects.filter((o) => o.key.includes("/chunk-")).length;
  const out = {
    show, durationS, ...stats,
    r2chunks, allInR2: r2chunks === stats.chunks,
    degraded: m.degraded, finalized: m.finalized,
    T0recStartDate: m.T0recStartDate, T0recStartPerf: m.T0recStartPerf,
    T0firstDataDate: m.T0firstDataDate, T0firstDataPerf: m.T0firstDataPerf,
    mimeType: m.mimeType,
  };
  jsonl({ kind: "scenario-summary", ...out });
  mergeReport(section, out);
  say(`${SCENARIO} DONE:`, JSON.stringify(out.lagMs), `chunks=${out.chunks}/${out.r2chunks} inR2`,
      `bitrate=${out.effectiveMbps}Mbps degraded=${out.degraded}`);
  if (SCENARIO === "a1") fs.writeFileSync(`${ART}/a1-show.json`, JSON.stringify({ show, T0recStartDate: m.T0recStartDate, T0recStartPerf: m.T0recStartPerf, T0firstDataDate: m.T0firstDataDate, T0firstDataPerf: m.T0firstDataPerf, durationS }));
  await teardown();
  return out;
}

async function scenarioA2() {
  const show = `a2-${RUNTS}`;
  const durationS = 90, offAt = 30, offFor = 25;
  say(`a2: show=${show} — offline window [${offAt}s, ${offAt + offFor}s]`);
  await startCollector();
  const page = await launchPage(show, durationS);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  // wait for recording to actually start
  let m;
  for (;;) { m = await getM(page); if (m && m.T0recStartDate) break; await new Promise((r) => setTimeout(r, 300)); }
  const T0 = m.T0recStartDate;
  const until = (t) => new Promise((r) => { const iv = setInterval(() => { if (Date.now() >= T0 + t * 1000) { clearInterval(iv); r(); } }, 100); });
  await until(offAt);
  const tOffline = Date.now();
  await cdp.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  say(`a2: OFFLINE at t=${((tOffline - T0) / 1000).toFixed(1)}s`);
  jsonl({ kind: "net-cut", tOffline, relS: (tOffline - T0) / 1000 });
  await until(offAt + offFor);
  const tRestore = Date.now();
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  say(`a2: RESTORED at t=${((tRestore - T0) / 1000).toFixed(1)}s`);
  jsonl({ kind: "net-restore", tRestore, relS: (tRestore - T0) / 1000 });
  m = await waitDone(page, (durationS + 240) * 1000);
  const stats = chunkStats(m);
  const buffered = m.rows.filter((r) => r.buffered).length;
  const drained = m.rows.filter((r) => r.via === "idb-drain" && r.verified).length;
  const list = (await api(`/list/${show}/${PART}`)).json;
  const r2chunks = list.objects.filter((o) => o.key.includes("/chunk-")).length;
  const out = {
    show, durationS, offlineWindowS: offFor, ...stats,
    chunksBuffered: buffered, chunksDrainedFromIdb: drained,
    maxBufferedBytes: m.idbHwmBytes, maxBufferedChunks: m.idbHwmChunks,
    onlineAt: m.onlineAt, drainedAt: m.drainedAt,
    drainMsFromRestore: m.drainedAt ? m.drainedAt - tRestore : null,
    drainMsFromOnlineEvent: m.drainedAt && m.onlineAt ? m.drainedAt - m.onlineAt : null,
    r2chunks, zeroLoss: r2chunks === stats.chunks && stats.verified === stats.chunks,
    degraded: m.degraded, finalized: m.finalized,
  };
  jsonl({ kind: "scenario-summary", ...out });
  mergeReport("a2_offline_window", out);
  say(`a2 DONE: buffered=${buffered} chunks (${Math.round(out.maxBufferedBytes / 1024)} KB hwm), ` +
      `drain=${out.drainMsFromRestore}ms after restore, zeroLoss=${out.zeroLoss}`);
  await teardown();
  return out;
}

async function scenarioA3() {
  const show = `a3-${RUNTS}`;
  const durationS = 120, killAtS = 45;
  say(`a3: show=${show} — SIGKILL own chrome at t=${killAtS}s`);
  await startCollector();
  const page = await launchPage(show, durationS);
  let m;
  for (;;) { m = await getM(page); if (m && m.T0recStartDate) break; await new Promise((r) => setTimeout(r, 300)); }
  const T0 = m.T0recStartDate;
  // poll rows until kill time (beacons in results carry the same ground truth)
  let lastM = m;
  while (Date.now() < T0 + killAtS * 1000) {
    await new Promise((r) => setTimeout(r, 500));
    const mm = await getM(page);
    if (mm) lastM = mm;
  }
  const killT = Date.now();
  const pids = killByUddPrefix("selfrec-udd");     // ONLY this proto's chrome
  say(`a3: SIGKILL at t=${((killT - T0) / 1000).toFixed(1)}s — pids [${pids.join(",")}] (udd-pattern match only)`);
  jsonl({ kind: "kill", killT, relS: (killT - T0) / 1000, pids: pids.length });
  try { await ctx.close(); } catch {}
  ctx = null;
  await new Promise((r) => setTimeout(r, 4000));    // let any half-open TCP die
  // ground truth from R2
  const list = (await api(`/list/${show}/${PART}`)).json;
  const chunks = list.objects.filter((o) => o.key.includes("/chunk-")).sort((a, b) => a.key.localeCompare(b.key));
  const closedBeforeKill = lastM.rows.length;       // chunk-closed events seen by driver poll
  const verifiedBeforeKill = lastM.rows.filter((r) => r.verified).length;
  const expectedClosed = Math.floor((killT - T0) / TIMESLICE);
  // concat uploaded prefix + decode last frame's burned clock
  const dir = `${SCRATCH}/a3-dl-${RUNTS}`;
  const concat = `${dir}/a3-concat.webm`;
  const dl = await downloadConcat(show, dir, concat);
  const dec = await decodeWebm(concat);
  const mediaLostMs = dec.lastClock ? killT - dec.lastClock : null;
  const out = {
    show, killAtS: +((killT - T0) / 1000).toFixed(2), killT, T0recStartDate: T0,
    chunksClosedBeforeKill: closedBeforeKill, expectedClosedByWallclock: expectedClosed,
    verifiedBeforeKill, r2chunks: chunks.length,
    chunksLost: closedBeforeKill - chunks.length,
    dlBytes: dl.bytes, md5okChunks: dl.md5ok,
    decodedFrames: `${dec.decoded}/${dec.frames}`,
    lastUploadedFrameClock: dec.lastClock,
    mediaLostMs,
    lossWithinOneTimeslice: mediaLostMs != null && mediaLostMs <= TIMESLICE + 1500, // + capture/encode pipeline slack
  };
  jsonl({ kind: "scenario-summary", ...out });
  mergeReport("a3_tab_kill", out);
  say(`a3 DONE: closed=${closedBeforeKill} inR2=${chunks.length} lost=${out.chunksLost} chunk(s); ` +
      `media lost=${mediaLostMs}ms (burned clock ${dec.lastClock} vs kill ${killT})`);
  await teardown();
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

async function scenarioA4() {
  const out = await scenarioBasic(30, "a4_stop_publish_tie");
  // manifest integrity: every chunk in the manifest must be HEAD-verifiable
  const show = out.show;
  const man = await (await fetch(`${PUB}/selfrec/${show}/${PART}/manifest.json`)).json();
  let headOk = 0;
  for (const c of man.chunks) {
    const h = await fetch(`${PUB}/${c.key}`, { method: "HEAD" });
    if (h.ok && parseInt(h.headers.get("content-length"), 10) === c.bytes) headOk++;
  }
  const verdict = {
    ...out,
    manifestChunks: man.chunks.length, manifestHeadOk: headOk,
    manifestDegraded: man.degraded, manifestMissing: man.missing,
    manifestOnlyVerified: headOk === man.chunks.length,
  };
  jsonl({ kind: "a4-manifest-verify", show, manifestChunks: man.chunks.length, headOk, degraded: man.degraded });
  mergeReport("a4_stop_publish_tie", verdict);
  say(`a4 manifest: ${headOk}/${man.chunks.length} HEAD-verified, degraded=${man.degraded}`);
  if (man.degraded) { say("a4: DEGRADED — exit 2 (proto/archive pattern)"); process.exit(2); }
  return verdict;
}

async function scenarioA5() {
  const a1 = JSON.parse(fs.readFileSync(`${ART}/a1-show.json`, "utf8"));
  const show = a1.show;
  say(`a5: playback integrity of ${show}`);
  const dir = `${SCRATCH}/a5-dl`;
  const concat = `${ART}/a1-concat.webm`;
  const dl = await downloadConcat(show, dir, concat);
  const man = await (await fetch(`${PUB}/selfrec/${show}/${PART}/manifest.json`)).json();
  const dec = await decodeWebm(concat);
  let ffprobeDur = null;
  try {
    ffprobeDur = parseFloat(execSync(
      `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${concat}"`).toString().trim());
  } catch {}
  if (!Number.isFinite(ffprobeDur)) ffprobeDur = null;
  // streaming webm has no duration element — last video packet pts is the
  // container-level duration ffprobe can actually attest to
  let ffprobeLastPtsS = null;
  try {
    ffprobeLastPtsS = parseFloat(execSync(
      `ffprobe -v error -select_streams v -show_entries packet=pts_time -of csv=p=0 "${concat}" | tail -1`).toString().trim());
  } catch {}
  const contentSpanMs = dec.lastClock && dec.firstClock ? dec.lastClock - dec.firstClock : null;
  const decodedDurS = +(dec.frames / 30).toFixed(2);
  const out = {
    show, chunksDownloaded: dl.chunkCount, bytes: dl.bytes,
    md5okChunks: `${dl.md5ok}/${dl.chunkCount}`,
    plays: dec.frames > 0,
    decodedFrames: `${dec.decoded}/${dec.frames}`,
    decodeRate: +(dec.decoded / dec.frames).toFixed(4),
    ffprobeDurationS: ffprobeDur, ffprobeLastPtsS, framesDurationS: decodedDurS,
    manifestDurationMs: man.durationMs,
    contentSpanMs,
    durationMatch: contentSpanMs != null && Math.abs(contentSpanMs - man.durationMs) < 2 * TIMESLICE,
    firstFrameClock: dec.firstClock, firstFrameIdx: dec.firstFrameIdx,
    T0recStartDate: a1.T0recStartDate, T0recStartPerf: a1.T0recStartPerf,
    T0firstDataDate: a1.T0firstDataDate,
    anchorDeltaMs_vsRecStart: dec.firstClock != null ? dec.firstClock - a1.T0recStartDate : null,
    anchorDeltaMs_vsRecStartPerf: dec.firstClock != null ? +(dec.firstClock - a1.T0recStartPerf).toFixed(1) : null,
    anchorDeltaMs_vsFirstData: dec.firstClock != null ? dec.firstClock - a1.T0firstDataDate : null,
    lastFrameClock: dec.lastClock,
  };
  jsonl({ kind: "scenario-summary", ...out });
  mergeReport("a5_playback_integrity", out);
  say(`a5 DONE: ${out.decodedFrames} frames decoded, span=${contentSpanMs}ms vs manifest ${man.durationMs}ms, ` +
      `anchor delta (first burned frame − T0recStart) = ${out.anchorDeltaMs_vsRecStart} ms`);
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

// ---- main -------------------------------------------------------------------
const run = async () => {
  say(`SCENARIO=${SCENARIO} results=${RESULTS}`);
  if (SCENARIO === "smoke") await scenarioBasic(20, "smoke");
  else if (SCENARIO === "a1") await scenarioBasic(90, "a1_baseline");
  else if (SCENARIO === "a2") await scenarioA2();
  else if (SCENARIO === "a3") await scenarioA3();
  else if (SCENARIO === "a4") await scenarioA4();
  else if (SCENARIO === "a5") await scenarioA5();
  else throw new Error("unknown scenario " + SCENARIO);
  await teardown();
  process.exit(0);
};
run().catch(async (e) => {
  console.error(ts(), "DRIVER FATAL:", e && e.message || e);
  await teardown();
  process.exit(1);
});
