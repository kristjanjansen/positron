#!/usr/bin/env node
// ============================================================================
// SYNC-leg regression driver — the v1 grid-archive DoD in one run.
//
//   node run-sync.mjs
//
// Scenario: TWO synthetic participants (staggered ~7 s, 75 s each, burned
// wall clock + pid byte in pixels) record into one fresh elektron-rtc room
// with media-span markers; 3 cues fired mid-show; both recordings repackaged
// (p1 h264 -> -c copy remux, p2 vp8 -> transcode) + cluster-indexed; then
// replay-grid.html composes both tiles on ONE playhead and the regression
// measures against the burned ground truth:
//   R1 aligned play  — inter-tile skew at 3 playhead positions (target ≤100 ms p50)
//   R2 seeks         — 4 positions incl. absent territory (absence is content)
//   R3 drift         — linear vs per-chunk re-anchored mapping at the tail
//   R4 cue crossing  — the 3 live cues re-fire within the ~150 ms band
//
// House rules: port 8894, selfrec-udd process pattern only, plain node ESM,
// fetch not sendBeacon, deployed elektron-rtc used AS IS.
// ============================================================================
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync, spawn, spawnSync } from "child_process";

const ROOT = "/Users/s32863/personal/positron";
const HERE = `${ROOT}/proto/selfrec`;
const SCRATCH = "/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad";
const BASE = "https://selfrec.positron.studio";
const PUB = "https://archive.positron.studio";
const RTC = "https://rtc.positron.studio";
const RUNTS = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
const SHOW = process.env.SHOW || `sync-${RUNTS}`;
const ROOM = process.env.ROOM || `selfrecsync-${RUNTS}`;
const DUR_S = 75, STAGGER_MS = 7000, TIMESLICE = 2000;
const RESULTS = `${ROOT}/results/selfrec-sync.jsonl`;
const UDD = `${SCRATCH}/selfrec-udd-sync`;
const LOGDIR = `${HERE}/logs`, ART = `${HERE}/artifacts`;
fs.mkdirSync(LOGDIR, { recursive: true }); fs.mkdirSync(ART, { recursive: true });

const TOKEN = fs.readFileSync(`${HERE}/.env.selfrec`, "utf8").trim().split("=")[1];
const envLine = (k) => {
  const l = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find((x) => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
};
const ROOM_TOKEN = envLine("ROOM_TOKEN");

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "sync|", ...a); }
function jsonl(row) { fs.appendFileSync(RESULTS, JSON.stringify({ t: Date.now(), scenario: "sync", ...row }) + "\n"); }
const checks = [];
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); say(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail || ""}`); }
function mergeReport(section, data) {
  const p = `${ART}/selfrec-report.json`;
  let rep = {}; try { rep = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
  rep[section] = data; rep.updatedAt = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(rep, null, 2));
}
async function api(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, { ...opts, headers: { Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) } });
  return { status: r.status, json: await r.json().catch(() => null) };
}
function killByUddPrefix(prefix) {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${prefix}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map((l) => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
    return pids;
  } catch { return []; }
}

// ---- plumbing ---------------------------------------------------------------
const children = [];
let collector = null, ctx = null, opWs = null;
async function startCollector() {
  collector = spawn("node", [`${HERE}/collector.mjs`], { env: { ...process.env, RESULTS }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(collector);
  const log = fs.createWriteStream(`${LOGDIR}/collector-sync.txt`, { flags: "a" });
  collector.stdout.on("data", (d) => log.write(d));
  collector.stderr.on("data", (d) => log.write(d));
  for (let i = 0; i < 40; i++) {
    const h = await fetch("http://127.0.0.1:8894/healthz").catch(() => null);
    if (h && h.ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("collector never came up on :8894");
}
async function participantPage(pid, mime, pidbyte) {
  const page = await ctx.newPage();
  const conLog = fs.createWriteStream(`${LOGDIR}/page-sync-${pid}.console.txt`, { flags: "a" });
  page.on("console", (m) => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", (e) => conLog.write(`${ts()} [pageerror] ${e.message}\n`));
  await page.goto(`http://127.0.0.1:8894/participant.html?show=${SHOW}&participant=${pid}` +
    `&duration=${DUR_S}&timeslice=${TIMESLICE}&token=${encodeURIComponent(TOKEN)}` +
    `&room=${ROOM}&roomtoken=${encodeURIComponent(ROOM_TOKEN)}&pidbyte=${pidbyte}` +
    `&mime=${encodeURIComponent(mime)}&cb=${Date.now()}`, { waitUntil: "load" });
  return page;
}
const getM = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__metrics))).catch(() => null);
async function waitFor(page, pred, maxMs, what) {
  const t0 = Date.now();
  for (;;) {
    const m = await getM(page);
    if (m && pred(m)) return m;
    if (Date.now() - t0 > maxMs) throw new Error("timeout: " + what);
    await new Promise((r) => setTimeout(r, 500));
  }
}
function fireCuesAt(T0) {
  // 3 "now" cues at T0+20/40/60 s through the room — R4 ground truth is their
  // own `at` stamp (sender clock = this machine = the burned clock's machine).
  return new Promise((resolve, reject) => {
    const sent = [];
    const ws = new WebSocket(`${RTC.replace("https", "wss")}/room/${ROOM}/ws?token=${ROOM_TOKEN}`);
    opWs = ws;
    ws.onerror = (e) => reject(new Error("op ws: " + (e.message || "error")));
    ws.onopen = () => ws.send(JSON.stringify({ type: "join", participantId: "sync-op", name: "sync-op", role: "audience" }));
    ws.onmessage = async (m) => {
      let f; try { f = JSON.parse(m.data); } catch { return; }
      if (f.type !== "roster") return;
      const keep = setInterval(() => { try { ws.send("ping"); } catch {} }, 20000);
      for (const offS of [20, 40, 60]) {
        const wake = T0 + offS * 1000;
        const wait = wake - Date.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        const at = Date.now();
        const cue = { id: `RCUE-${offS}`, at, sentAt: at, data: { text: `RCUE-${offS}`, mode: "now" } };
        ws.send(JSON.stringify({ type: "cue", cue }));
        sent.push({ id: cue.id, at, offS });
        say(`cue ${cue.id} sent at=${at} (T0+${((at - T0) / 1000).toFixed(2)}s)`);
      }
      clearInterval(keep);
      setTimeout(() => { try { ws.close(); } catch {} }, 1500);
      resolve(sent);
    };
  });
}
function runTool(tool, pid, extraEnv = {}) {
  const r = spawnSync("node", [`${HERE}/${tool}`], {
    env: { ...process.env, SHOW, PID: pid, RESULTS, ...extraEnv }, encoding: "utf8", timeout: 300000,
  });
  const line = (r.stdout || "").split("\n").filter((l) => l.startsWith("REPORT ")).pop();
  if (r.status !== 0 || !line) throw new Error(`${tool} ${pid} failed: ${(r.stderr || r.stdout || "").slice(0, 400)}`);
  say((r.stdout || "").split("\n").filter((l) => l.includes("DONE")).join(" | "));
  return JSON.parse(line.slice(7));
}
async function teardown() {
  try { if (opWs) opWs.close(); } catch {}
  try { if (ctx) await ctx.close(); } catch {}
  ctx = null;
  killByUddPrefix("selfrec-udd");
  for (const c of children) { try { c.kill("SIGKILL"); } catch {} }
}

// ---- grid helpers -----------------------------------------------------------
const grid = (page) => page.evaluate(() => JSON.parse(JSON.stringify({
  phase: window.__grid.phase, error: window.__grid.error, playing: window.__grid.playing,
  mapping: window.__grid.mapping, cues: window.__grid.cues, fires: window.__grid.fires,
  spans: window.__grid.spans, rangeT: window.__grid.rangeT,
})));
const gDecode = (page) => page.evaluate(() => window.__decodeNow());
const gSeek = (page, T) => page.evaluate((t) => window.__seekWall(t), T);
const gMapInfo = (page, T) => page.evaluate((t) => window.__mapInfo(t), T);
const pct = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null;

// ============================================================================
const run = async () => {
  say(`SHOW=${SHOW} ROOM=${ROOM} results=${RESULTS}`);
  await startCollector();
  fs.rmSync(UDD, { recursive: true, force: true });
  ctx = await chromium.launchPersistentContext(UDD, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
           "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--mute-audio",
           "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    viewport: { width: 1400, height: 800 },
  });

  // ---- record: p1 (h264) then p2 (vp8) staggered ---------------------------
  const p1 = await participantPage("p1", "video/webm;codecs=h264", "1");
  const m1s = await waitFor(p1, (m) => m.T0recStartDate, 30000, "p1 rec-start");
  const T0 = m1s.T0recStartDate;
  say(`p1 T0=${T0} mime=${m1s.mimeType} skewEst=${m1s.skewEst} rttMin=${m1s.rttMin}`);
  const cuesPromise = fireCuesAt(T0);
  // aim p2's recorder.start at ~T0+7 s (measured page boot nav->rec-start ≈ 1.4 s)
  while (Date.now() < T0 + STAGGER_MS - 1500) await new Promise((r) => setTimeout(r, 100));
  const p2 = await participantPage("p2", "video/webm;codecs=vp8", "2");
  const m2s = await waitFor(p2, (m) => m.T0recStartDate, 30000, "p2 rec-start");
  const T0b = m2s.T0recStartDate;
  say(`p2 T0=${T0b} (stagger ${T0b - T0} ms) mime=${m2s.mimeType} skewEst=${m2s.skewEst}`);

  const cuesSent = await cuesPromise;
  const m1 = await waitFor(p1, (m) => m.done, (DUR_S + 120) * 1000, "p1 done");
  const m2 = await waitFor(p2, (m) => m.done, (DUR_S + 120) * 1000, "p2 done");
  check("rec-both-finalized-clean", m1.finalized && !m1.degraded && m2.finalized && !m2.degraded,
        `p1 ${m1.chunkCount} chunks, p2 ${m2.chunkCount} chunks`);
  check("rec-mimes", /h264|avc/i.test(m1.mimeType) && /vp8/i.test(m2.mimeType), `${m1.mimeType} / ${m2.mimeType}`);
  const skew = {
    p1: { skewEst: m1.skewEst, rttMin: m1.rttMin, samples: m1.skewSamples },
    p2: { skewEst: m2.skewEst, rttMin: m2.rttMin, samples: m2.skewSamples },
    note: "same-machine truth is 0 ms — skewEst IS the method error (server+net asymmetry)",
  };
  check("skew-est-sane", Math.abs(m1.skewEst) <= 60 && Math.abs(m2.skewEst) <= 60,
        `p1 ${m1.skewEst} ms (rttMin ${m1.rttMin}), p2 ${m2.skewEst} ms (rttMin ${m2.rttMin})`);
  await p1.close(); await p2.close();

  // ---- marker round-trip ---------------------------------------------------
  const cl = await (await fetch(`${RTC}/room/${ROOM}/cuelog?token=${ROOM_TOKEN}`)).json();
  fs.writeFileSync(`${ART}/sync-cuelog.json`, JSON.stringify(cl, null, 2));
  const spanEv = { p1: { start: 0, beat: 0, end: 0 }, p2: { start: 0, beat: 0, end: 0 } };
  let startAtP1 = null, startAtP2 = null, endP1 = null;
  const seenIds = new Set();
  for (const e of cl.cues) {
    if (!e.cue || seenIds.has(e.cue.id)) continue;
    seenIds.add(e.cue.id);
    const d = e.cue.data;
    if (!d || d.kind !== "media-span") continue;
    spanEv[d.source][d.phase]++;
    if (d.phase === "start" && d.source === "p1") startAtP1 = d.at;
    if (d.phase === "start" && d.source === "p2") startAtP2 = d.at;
    if (d.phase === "end" && d.source === "p1") endP1 = d;
  }
  check("markers-round-trip",
    spanEv.p1.start === 1 && spanEv.p1.end === 1 && spanEv.p1.beat >= 6 &&
    spanEv.p2.start === 1 && spanEv.p2.end === 1 && spanEv.p2.beat >= 6,
    JSON.stringify(spanEv));
  check("marker-start-at-is-T0", startAtP1 === T0 && startAtP2 === T0b,
    `p1 ${startAtP1}==${T0}, p2 ${startAtP2}==${T0b}`);
  check("marker-end-payload", endP1 && endP1.chunkCount === m1.chunkCount && endP1.degraded === false,
    endP1 ? `dur=${endP1.dur} chunks=${endP1.chunkCount}` : "missing");
  const markerProof = { room: ROOM, cuelogCount: cl.count, spanEvents: spanEv,
    acks: { p1: `${m1.spanAcksSeen}/${m1.spanEventsSent}`, p2: `${m2.spanAcksSeen}/${m2.spanEventsSent}` } };

  // ---- repackage + index ---------------------------------------------------
  const rpk1 = runTool("repackage.mjs", "p1");   // h264 -> copy
  const rpk2 = runTool("repackage.mjs", "p2");   // vp8  -> transcode
  check("repackage-modes", rpk1.mode === "copy" && rpk2.mode === "transcode",
        `p1=${rpk1.mode} (${rpk1.ffmpegMs} ms), p2=${rpk2.mode} (${rpk2.ffmpegMs} ms)`);
  const idx1 = runTool("indexer.mjs", "p1");
  const idx2 = runTool("indexer.mjs", "p2");
  check("indexer-plausible",
    idx1.clusters > 10 && idx2.clusters > 10 && idx1.falsePositives === 0 && idx2.falsePositives === 0 &&
    Math.abs(idx1.spanMs - m1.rows[m1.rows.length - 1].closeT + T0) < 8000,
    `p1 ${idx1.clusters} clusters ${idx1.msPerMB} ms/MB, p2 ${idx2.clusters} clusters ${idx2.msPerMB} ms/MB`);

  // ---- replay grid ---------------------------------------------------------
  const rp = await ctx.newPage();
  const conLog = fs.createWriteStream(`${LOGDIR}/page-sync-replay.console.txt`, { flags: "a" });
  rp.on("console", (m) => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  rp.on("pageerror", (e) => conLog.write(`${ts()} [pageerror] ${e.message}\n`));
  await rp.goto(`http://127.0.0.1:8894/replay-grid.html?room=${ROOM}&token=${encodeURIComponent(ROOM_TOKEN)}&cb=${Date.now()}`,
    { waitUntil: "load" });
  {
    const t0 = Date.now();
    for (;;) {
      const g = await grid(rp);
      if (g.phase === "running") break;
      if (g.phase === "failed") throw new Error("replay grid failed: " + g.error);
      if (Date.now() - t0 > 45000) throw new Error("replay grid never running");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const g0 = await grid(rp);
  check("grid-two-spans-three-cues", Object.keys(g0.spans).length === 2 && g0.cues.length === 3,
        `spans=${Object.keys(g0.spans).join(",")} cues=${g0.cues.map((c) => c.id).join(",")}`);

  // ---- R1 + R4: aligned play from T0+8 s to T0+70 s ------------------------
  const r1Samples = [];
  const samplePts = [15000, 35000, 65000].map((o) => T0 + o);
  await gSeek(rp, T0 + 8000);
  await new Promise((r) => setTimeout(r, 1200));
  await rp.evaluate(() => window.__play());
  for (const P of samplePts) {
    for (;;) {
      const d = await gDecode(rp);
      if (d.T >= P) { r1Samples.push(d); break; }
      await new Promise((r) => setTimeout(r, Math.min(500, Math.max(50, P - d.T - 100))));
    }
    await rp.screenshot({ path: `${LOGDIR}/sync-r1-${Math.round((r1Samples[r1Samples.length - 1].T - T0) / 1000)}s.png` });
  }
  // let the last cue (T0+60 s) fire, then stop
  for (;;) {
    const d = await gDecode(rp);
    if (d.T > T0 + 70000) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await rp.evaluate(() => window.__pause());
  const r1 = r1Samples.map((d) => {
    const a = d.tiles.p1, b = d.tiles.p2;
    return { atS: +((d.T - T0) / 1000).toFixed(2), clockA: a.clock, clockB: b.clock,
             interTileSkewMs: a.clock != null && b.clock != null ? Math.abs(a.clock - b.clock) : null,
             tileErrA: a.clock != null ? Math.round(a.clock - d.T) : null,
             tileErrB: b.clock != null ? Math.round(b.clock - d.T) : null };
  });
  const skews = r1.map((r) => r.interTileSkewMs).filter((x) => x != null).sort((a, b) => a - b);
  const R1 = { samples: r1, p50: pct(skews, 0.5), max: skews[skews.length - 1] ?? null, targetMs: 100 };
  check("R1-inter-tile-skew", skews.length === 3 && R1.p50 <= 100, `p50=${R1.p50} max=${R1.max} (${skews.join(",")})`);

  // ---- R4: cue crossings from the play pass --------------------------------
  const gAfter = await grid(rp);
  const R4rows = cuesSent.map((c) => {
    const f = gAfter.fires.find((x) => x.id === c.id);
    const dA = f && f.decoded.p1, dB = f && f.decoded.p2;
    const errA = dA && dA.clock != null ? Math.round(dA.clock - c.at) : null;
    const errB = dB && dB.clock != null ? Math.round(dB.clock - c.at) : null;
    return { id: c.id, at: c.at, fired: !!f, engineLateMs: f ? f.lateMs : null, errA, errB };
  });
  const R4 = { rows: R4rows, bandMs: 150 };
  check("R4-cues-fire-in-band",
    R4rows.every((r) => r.fired && r.errA != null && Math.abs(r.errA) <= 150 && Math.abs(r.errB) <= 150),
    R4rows.map((r) => `${r.id}:A${r.errA}/B${r.errB}`).join(" "));

  // ---- R2: seeks (incl. absence) -------------------------------------------
  const seeks = [
    { name: "p2-absent", T: T0 + 3000, expectAbsent: { p1: false, p2: true } },
    { name: "mid-30s", T: T0 + 30000, expectAbsent: { p1: false, p2: false } },
    { name: "late-70s", T: T0 + 70000, expectAbsent: { p1: false, p2: false } },
    { name: "p1-absent", T: T0 + 79000, expectAbsent: { p1: true, p2: false } },
  ];
  const R2rows = [];
  for (const s of seeks) {
    await gSeek(rp, s.T);
    await new Promise((r) => setTimeout(r, 1200));       // let the hard seek land
    const d = await gDecode(rp);
    await rp.screenshot({ path: `${LOGDIR}/sync-r2-${s.name}.png` });
    const row = { ...s, tiles: {} };
    for (const pid of ["p1", "p2"]) {
      const t = d.tiles[pid];
      row.tiles[pid] = { absent: t.absent, clock: t.clock,
                         errMs: t.clock != null ? Math.round(t.clock - s.T) : null };
    }
    R2rows.push(row);
  }
  const R2 = { rows: R2rows, bandMs: 150 };
  check("R2-seek-absence-and-accuracy", R2rows.every((r) =>
    ["p1", "p2"].every((pid) => {
      const t = r.tiles[pid];
      return r.expectAbsent[pid] ? t.absent : (!t.absent && t.errMs != null && Math.abs(t.errMs) <= 150);
    })),
    R2rows.map((r) => `${r.name}: p1 ${r.tiles.p1.absent ? "absent" : r.tiles.p1.errMs + "ms"} / p2 ${r.tiles.p2.absent ? "absent" : r.tiles.p2.errMs + "ms"}`).join(" | "));

  // ---- R3: drift — linear vs re-anchored at the tail -----------------------
  const Ttail = T0 + 73000;
  const mapTail = await gMapInfo(rp, Ttail);
  const mapHead = await gMapInfo(rp, T0 + 10000);
  await rp.evaluate(() => window.__setMapping("anchored"));
  await gSeek(rp, Ttail); await new Promise((r) => setTimeout(r, 1200));
  const dAnch = await gDecode(rp);
  await rp.evaluate(() => window.__setMapping("linear"));
  await gSeek(rp, Ttail); await new Promise((r) => setTimeout(r, 1200));
  const dLin = await gDecode(rp);
  await rp.evaluate(() => window.__setMapping("linear"));   // back to the default
  const R3 = {
    defaultMapping: "linear",
    note: "anchored = per-chunk re-anchor from manifest closeT + cluster-index byte interpolation; divergence>drift at this timescale",
    tailAtS: 73,
    divergenceMsAtTail: { p1: mapTail.p1.divergenceMs, p2: mapTail.p2.divergenceMs },
    divergenceMsAtHead: { p1: mapHead.p1.divergenceMs, p2: mapHead.p2.divergenceMs },
    decodedErrAnchored: { p1: dAnch.tiles.p1.clock != null ? Math.round(dAnch.tiles.p1.clock - Ttail) : null,
                          p2: dAnch.tiles.p2.clock != null ? Math.round(dAnch.tiles.p2.clock - Ttail) : null },
    decodedErrLinear: { p1: dLin.tiles.p1.clock != null ? Math.round(dLin.tiles.p1.clock - Ttail) : null,
                        p2: dLin.tiles.p2.clock != null ? Math.round(dLin.tiles.p2.clock - Ttail) : null },
  };
  check("R3-measured", R3.decodedErrAnchored.p1 != null && R3.decodedErrLinear.p1 != null,
    `divergence tail p1=${R3.divergenceMsAtTail.p1} p2=${R3.divergenceMsAtTail.p2} ms; ` +
    `decoded err anchored p1=${R3.decodedErrAnchored.p1} vs linear p1=${R3.decodedErrLinear.p1} ms`);
  await rp.screenshot({ path: `${LOGDIR}/sync-r3-tail.png` });

  // ---- budget + report -----------------------------------------------------
  const list = (await api(`/list/${SHOW}`)).json;
  const r2Bytes = list.objects.reduce((s, o) => s + o.size, 0);
  check("budget-under-100MB", r2Bytes < 100 * 1048576, `${(r2Bytes / 1048576).toFixed(1)} MB, ${list.count} objects`);
  const report = {
    show: SHOW, room: ROOM, T0p1: T0, T0p2: T0b, staggerMs: T0b - T0, durS: DUR_S,
    skew, markerProof,
    codecProbe: m1.codecProbe,
    repackage: { p1_copy: rpk1, p2_transcode: rpk2,
      copyVsTranscodeFfmpegRatio: +(rpk2.ffmpegMs / Math.max(1, rpk1.ffmpegMs)).toFixed(1) },
    indexer: { p1: idx1, p2: idx2 },
    regression: { R1, R2, R3, R4 },
    cuesSent, checks,
    r2: { objects: list.count, bytes: r2Bytes },
  };
  fs.writeFileSync(`${ART}/sync-report.json`, JSON.stringify(report, null, 2));
  mergeReport("sync_leg", { show: SHOW, room: ROOM, staggerMs: T0b - T0, skew: { p1: skew.p1.skewEst, p2: skew.p2.skewEst, rttMin: [skew.p1.rttMin, skew.p2.rttMin] },
    markerProof, repackage: report.repackage, indexerMsPerMB: [idx1.msPerMB, idx2.msPerMB],
    R1: { p50: R1.p50, max: R1.max }, R2: R2.rows.map((r) => ({ name: r.name, p1: r.tiles.p1, p2: r.tiles.p2 })),
    R3, R4: R4.rows, checksPass: `${checks.filter((c) => c.ok).length}/${checks.length}`,
    r2Bytes });
  jsonl({ kind: "sync-summary", checksPass: checks.filter((c) => c.ok).length, checksTotal: checks.length, r2Bytes });
  say(`REPORT written — checks ${checks.filter((c) => c.ok).length}/${checks.length} pass, R2 ${(r2Bytes / 1048576).toFixed(1)} MB`);
  await teardown();
  process.exit(checks.every((c) => c.ok) ? 0 : 2);
};
run().catch(async (e) => {
  console.error(ts(), "SYNC FATAL:", e && e.stack || e);
  await teardown();
  process.exit(1);
});
