#!/usr/bin/env node
// ============================================================================
// PLAYBACK-leg verifier 1: replay-grid.html PROMOTED loading path.
//
//   node verify-replay.mjs        (SHOW/ROOM default to the kept proof show)
//
// The grid now boots from ?show=<id> (show.json written by postshow.mjs) +
// the room cuelog for the cue lane — zero run-sync orchestration. Verified
// headless against the burned-clock ground truth:
//   V1  boot: 2 spans from show.json, 3 cues from the cuelog lane
//   V2  R1-style inter-tile skew during play through the NEW path (≤100 ms)
//   V3  2 seeks via the SCRUBBER (real mouse clicks on #scrub), burned-clock
//       verified (±150 ms band vs the click-derived playhead T)
//   V4  R3 re-run with the SimpleBlock index: decoded seek error at the 73 s
//       tail for linear vs cluster-anchored vs BLOCK-anchored mapping — does
//       block-level anchoring beat linear+skew where cluster-level didn't?
//
// House rules: port 8894, selfrec-udd process pattern only, plain node ESM.
// ============================================================================
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync, spawn } from "child_process";

const ROOT = "/Users/s32863/personal/elektron";
const HERE = `${ROOT}/proto/selfrec`;
const SCRATCH = "/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad";
const SHOW = process.env.SHOW || "sync-20260827T093613";
const RESULTS = `${ROOT}/results/selfrec-playback.jsonl`;
const UDD = `${SCRATCH}/selfrec-udd-verify`;
const LOGDIR = `${HERE}/logs`, ART = `${HERE}/artifacts`;

const envLine = (k) => {
  const l = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find((x) => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
};
const ROOM_TOKEN = envLine("ROOM_TOKEN");

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "vrfy|", ...a); }
const checks = [];
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); say(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail || ""}`); }
function mergeReport(section, data) {
  const p = `${ART}/playback-report.json`;
  let rep = {}; try { rep = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
  rep[section] = data; rep.updatedAt = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(rep, null, 2));
}
function killByUddPrefix(prefix) {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${prefix}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map((l) => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
    return pids;
  } catch { return []; }
}

const children = [];
let ctx = null;
async function startCollector() {
  const c = spawn("node", [`${HERE}/collector.mjs`], { env: { ...process.env, RESULTS }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(c);
  const log = fs.createWriteStream(`${LOGDIR}/collector-playback.txt`, { flags: "a" });
  c.stdout.on("data", (d) => log.write(d));
  c.stderr.on("data", (d) => log.write(d));
  for (let i = 0; i < 40; i++) {
    const h = await fetch("http://127.0.0.1:8894/healthz").catch(() => null);
    if (h && h.ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("collector never came up on :8894");
}
async function teardown() {
  try { if (ctx) await ctx.close(); } catch {}
  ctx = null;
  killByUddPrefix("selfrec-udd");
  for (const c of children) { try { c.kill("SIGKILL"); } catch {} }
}
const grid = (page) => page.evaluate(() => JSON.parse(JSON.stringify({
  phase: window.__grid.phase, error: window.__grid.error, playing: window.__grid.playing,
  mapping: window.__grid.mapping, mode: window.__grid.mode, cueLane: window.__grid.cueLane,
  cues: window.__grid.cues, fires: window.__grid.fires, playheadT: window.__grid.playheadT,
  spans: window.__grid.spans, rangeT: window.__grid.rangeT,
})));
const gDecode = (page) => page.evaluate(() => window.__decodeNow());
const gSeek = (page, T) => page.evaluate((t) => window.__seekWall(t), T);
const pct = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null;

const run = async () => {
  say(`SHOW=${SHOW} — replay-grid via show.json (promoted path)`);
  await startCollector();
  fs.rmSync(UDD, { recursive: true, force: true });
  ctx = await chromium.launchPersistentContext(UDD, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
           "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--mute-audio"],
    viewport: { width: 1400, height: 800 },
  });
  const rp = await ctx.newPage();
  const conLog = fs.createWriteStream(`${LOGDIR}/page-playback-grid.console.txt`, { flags: "a" });
  rp.on("console", (m) => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  rp.on("pageerror", (e) => conLog.write(`${ts()} [pageerror] ${e.message}\n`));
  await rp.goto(`http://127.0.0.1:8894/replay-grid.html?show=${SHOW}&token=${encodeURIComponent(ROOM_TOKEN)}&cb=${Date.now()}`,
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
  // ---- V1: boot from show.json + cuelog cue lane ---------------------------
  const g0 = await grid(rp);
  const T0 = g0.spans.p1.at;
  check("V1-boot-from-show-json",
    g0.mode === "show" && Object.keys(g0.spans).length === 2 && g0.cues.length === 3 && g0.cueLane === "cuelog",
    `mode=${g0.mode} spans=${Object.keys(g0.spans).join(",")} cues=${g0.cues.map((c) => c.id).join(",")} cueLane=${g0.cueLane}`);
  const blocksLoaded = await rp.evaluate((t) => window.__mapInfo(t), T0 + 30000);
  check("V1-block-anchors-loaded", blocksLoaded.p1.blocks != null && blocksLoaded.p2.blocks != null,
    `blocks mapping p1=${blocksLoaded.p1.blocks != null} p2=${blocksLoaded.p2.blocks != null}`);

  // ---- V2: R1-style inter-tile skew through the NEW loading path -----------
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
  }
  await rp.screenshot({ path: `${LOGDIR}/playback-v2-play.png` });
  await rp.evaluate(() => window.__pause());
  const r1 = r1Samples.map((d) => {
    const a = d.tiles.p1, b = d.tiles.p2;
    return { atS: +((d.T - T0) / 1000).toFixed(2), clockA: a.clock, clockB: b.clock,
             interTileSkewMs: a.clock != null && b.clock != null ? Math.abs(a.clock - b.clock) : null,
             tileErrA: a.clock != null ? Math.round(a.clock - d.T) : null,
             tileErrB: b.clock != null ? Math.round(b.clock - d.T) : null };
  });
  const skews = r1.map((r) => r.interTileSkewMs).filter((x) => x != null).sort((a, b) => a - b);
  const V2 = { samples: r1, p50: pct(skews, 0.5), max: skews[skews.length - 1] ?? null, targetMs: 100 };
  check("V2-inter-tile-skew-new-path", skews.length === 3 && V2.p50 <= 100,
    `p50=${V2.p50} max=${V2.max} (${skews.join(",")})`);

  // ---- V3: seeks via the SCRUBBER (real clicks) ----------------------------
  const box = await rp.locator("#scrub").boundingBox();
  const V3rows = [];
  for (const offS of [30, 70]) {
    const intendedT = T0 + offS * 1000;
    const frac = (intendedT - g0.rangeT[0]) / (g0.rangeT[1] - g0.rangeT[0]);
    await rp.mouse.click(box.x + frac * box.width, box.y + box.height / 2);
    await new Promise((r) => setTimeout(r, 1300));
    const g = await grid(rp);
    const d = await gDecode(rp);
    await rp.screenshot({ path: `${LOGDIR}/playback-v3-scrub-${offS}s.png` });
    const row = {
      intendedT, offS, clickedT: Math.round(g.playheadT),
      pixelQuantMs: Math.round(g.playheadT - intendedT),     // scrubber px resolution
      tiles: {},
    };
    for (const pid of ["p1", "p2"]) {
      const t = d.tiles[pid];
      row.tiles[pid] = { absent: t.absent, clock: t.clock,
                         errMs: t.clock != null ? Math.round(t.clock - g.playheadT) : null };
    }
    V3rows.push(row);
  }
  const V3 = { rows: V3rows, bandMs: 150 };
  check("V3-scrubber-seeks", V3rows.every((r) =>
    ["p1", "p2"].every((pid) => !r.tiles[pid].absent && r.tiles[pid].errMs != null && Math.abs(r.tiles[pid].errMs) <= 150)),
    V3rows.map((r) => `${r.offS}s(quant${r.pixelQuantMs >= 0 ? "+" : ""}${r.pixelQuantMs}ms): p1 ${r.tiles.p1.errMs}ms / p2 ${r.tiles.p2.errMs}ms`).join(" | "));

  // ---- V4: R3 re-run with the SimpleBlock index ----------------------------
  const Ttail = T0 + 73000;
  const mapTail = await rp.evaluate((t) => window.__mapInfo(t), Ttail);
  const mapHead = await rp.evaluate((t) => window.__mapInfo(t), T0 + 10000);
  const decoded = {};
  for (const mapping of ["linear", "anchored", "blocks"]) {
    await rp.evaluate((m) => window.__setMapping(m), mapping);
    await gSeek(rp, Ttail);
    await new Promise((r) => setTimeout(r, 1300));
    const d = await gDecode(rp);
    decoded[mapping] = {
      p1: d.tiles.p1.clock != null ? Math.round(d.tiles.p1.clock - Ttail) : null,
      p2: d.tiles.p2.clock != null ? Math.round(d.tiles.p2.clock - Ttail) : null,
    };
  }
  await rp.evaluate(() => window.__setMapping("linear"));
  const V4 = {
    tailAtS: 73,
    divergenceVsLinearAtTail: {
      p1: { cluster: mapTail.p1.divergenceMs, blocks: mapTail.p1.divergenceBlocksMs },
      p2: { cluster: mapTail.p2.divergenceMs, blocks: mapTail.p2.divergenceBlocksMs },
    },
    divergenceVsLinearAtHead: {
      p1: { cluster: mapHead.p1.divergenceMs, blocks: mapHead.p1.divergenceBlocksMs },
      p2: { cluster: mapHead.p2.divergenceMs, blocks: mapHead.p2.divergenceBlocksMs },
    },
    decodedErrAtTail: decoded,
    note: "decodedErr = burned clock - playhead T at the 73 s tail; block anchoring wins iff |blocks| < |linear|",
  };
  const better = ["p1", "p2"].map((p) =>
    Math.abs(decoded.blocks[p]) < Math.abs(decoded.linear[p]) ? `${p}:blocks` : `${p}:linear`);
  check("V4-block-anchor-measured",
    decoded.blocks.p1 != null && decoded.blocks.p2 != null,
    `tail err linear p1=${decoded.linear.p1}/p2=${decoded.linear.p2}, cluster-anchored p1=${decoded.anchored.p1}/p2=${decoded.anchored.p2}, ` +
    `BLOCKS p1=${decoded.blocks.p1}/p2=${decoded.blocks.p2} — winner ${better.join(" ")}`);

  // ---- V5: an EXTERNAL master jump must FOLD, never BURST -----------------
  // The regression the mediaMaster adoption exists to prevent. This page's cue
  // kind is `catchUp: "burst"` (a cue is a note, never silently dropped), and
  // the old hand-rolled master block here called deck.sync() UNCONDITIONALLY.
  // Sync across a discontinuity leaves every skipped cue `pending`, so the
  // lookahead fires all of them at once — the exact bug the SEEK path had
  // already been fixed for. timeline/media-master.mjs L2 routes |err| > jumpMs
  // to deck.seek() instead, which reconciles statuses and re-folds.
  await gSeek(rp, T0 + 2000);
  await new Promise((r) => setTimeout(r, 1200));
  await rp.evaluate(() => window.__play());
  await new Promise((r) => setTimeout(r, 1800));
  const mi0 = await rp.evaluate(() => window.__masterInfo());
  const gPre = await grid(rp);
  const lastCue = gPre.cues[gPre.cues.length - 1];
  let jump = null;
  for (const pad of [5000, 3000, 1500, 600]) {
    jump = await rp.evaluate((t) => window.__jumpMaster(t), lastCue.at + pad);
    if (jump.ok) break;
  }
  const posPre = gPre.playheadT;
  const firesPre = gPre.fires.length;
  await new Promise((r) => setTimeout(r, 2600));
  await rp.evaluate(() => window.__pause());
  const mi1 = await rp.evaluate(() => window.__masterInfo());
  const gPost = await grid(rp);
  const skipped = gPre.cues.filter((c) => c.at > posPre && c.at <= (jump.ok ? jump.targetT : -Infinity));
  const newFires = gPost.fires.slice(firesPre);
  const jumpEvents = mi1.events.filter((e) => e.reason === "jump");
  const V5 = {
    masterPid: mi0.pid, jump, posPre: Math.round(posPre), posPost: Math.round(gPost.playheadT),
    skippedCueIds: skipped.map((c) => c.id),
    firesPre, firesPost: gPost.fires.length, newFireIds: newFires.map((f) => f.id),
    jumpEvents: jumpEvents.map((e) => ({ jumpMs: e.jumpMs, mediaTime: +e.mediaTime.toFixed(2) })),
    firedIdsAfter: mi1.firedIds,
    mediaMasterStats: mi1.stats && { syncs: mi1.stats.syncs, jumps: mi1.stats.jumps,
                                     stalls: mi1.stats.stalls, corrections: mi1.stats.corrections,
                                     laws: mi1.stats.laws },
  };
  mergeReport("grid_master_jump", V5);
  check("V5-master-jump-folds-not-bursts",
    jump.ok && skipped.length >= 1 && newFires.length === 0 &&
    jumpEvents.length >= 1 && skipped.every((c) => mi1.firedIds.includes(c.id)) &&
    Math.abs(gPost.playheadT - jump.targetT) < 4000,
    `master ${V5.masterPid} jumped ${jumpEvents.map((e) => e.jumpMs + "ms").join(",")} over cues [${V5.skippedCueIds}] — ` +
    `BURST fires ${newFires.length} (must be 0), folded fired set [${mi1.firedIds}], playhead ${V5.posPre}->${V5.posPost} (target ${jump.targetT})`);

  const report = { show: SHOW, T0, V2, V3, V4, V5, checks };
  mergeReport("grid_promoted", report);
  fs.appendFileSync(RESULTS, JSON.stringify({ t: Date.now(), kind: "verify-replay", checksPass: checks.filter((c) => c.ok).length, checksTotal: checks.length }) + "\n");
  say(`DONE — checks ${checks.filter((c) => c.ok).length}/${checks.length} pass`);
  await teardown();
  process.exit(checks.every((c) => c.ok) ? 0 : 2);
};
run().catch(async (e) => {
  console.error(ts(), "VRFY FATAL:", e && e.stack || e);
  await teardown();
  process.exit(1);
});
