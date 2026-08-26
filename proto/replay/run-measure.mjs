#!/usr/bin/env node
// Replay MEASUREMENT driver — runs after run-record.mjs. Three phases:
//   A  straight-through replay: every cue's error = decoded burned wall-clock
//      on the glass at the fire moment − fireAt  (content-referenced, so the
//      content T0 anchor makes this pure engine error). Also harvests the
//      live-burn cross-check (cue row = when each cue fired LIVE) and the
//      anchor deltas (content vs publisher stamp vs Stream API metadata).
//   B  late join: page opened at startAt=65 s — the 4 past cues must catch up
//      (latest shown, none re-fired), the next cue must fire normally.
//   C  seeks on one page: forward to 150 s, then BACKWARD to 30 s — state must
//      rewind (later cues cleared to pending) and re-fire on the way back up.
// All assertions programmatic; report -> artifacts/replay-report.json.
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync } from "child_process";

const ROOT = "/Users/s32863/personal/elektron";
const HERE = `${ROOT}/proto/replay`;
const BASE = "http://127.0.0.1:8885";
const REMOTE = "https://elektron-rtc.kristjan-jansen.workers.dev";
const UDD = "/private/tmp/claude-501/-Users-s32863-personal-elektron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/replay-test-udd-measure";
const LOGDIR = `${HERE}/logs`;

function envVal(k) {
  const l = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find(x => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
}
const TOKEN = envVal("ROOM_TOKEN");
const meta = JSON.parse(fs.readFileSync(`${HERE}/artifacts/replay-run-meta.json`, "utf8"));
const cuelog = JSON.parse(fs.readFileSync(`${HERE}/artifacts/replay-cuelog.json`, "utf8"));
const liveFires = JSON.parse(fs.readFileSync(`${HERE}/artifacts/replay-live-fires.json`, "utf8"));
const CUES = cuelog.cues.map(e => ({ id: e.cue.id, at: e.cue.at, sentAt: e.cue.sentAt,
                                     mode: e.cue.data && e.cue.data.mode }));
const HLS = meta.vodHls;
const ROOM = meta.room;

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }
function pct(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]; }
const checks = [];
function assertCheck(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  say(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail || ""}`);
}

// ---- 0. manifest PDT check --------------------------------------------------
async function pdtCheck() {
  const main = await (await fetch(HLS, { headers: { "User-Agent": "elektron-replay-rig/1.0" } })).text();
  const rendPath = main.split("\n").find(l => l && !l.startsWith("#"));
  const rendUrl = new URL(rendPath, HLS).href;
  const rend = await (await fetch(rendUrl, { headers: { "User-Agent": "elektron-replay-rig/1.0" } })).text();
  const hasPdt = main.includes("PROGRAM-DATE-TIME") || rend.includes("PROGRAM-DATE-TIME");
  assertCheck("vod-manifest-has-no-PDT", !hasPdt, `main ${main.length} B, rendition ${rend.length} B`);
  return !hasPdt;
}

// ---- page helpers -----------------------------------------------------------
let ctx = null;
async function openReplay(page, params) {
  const qp = new URLSearchParams({
    src: HLS, room: ROOM, token: TOKEN, remote: REMOTE,
    t0: String(meta.T0stamp), cb: String(Date.now()), ...params,
  });
  await page.goto(`${BASE}/proto/replay/replay.html?${qp}`, { waitUntil: "load" });
  const t0 = Date.now();
  for (;;) {
    const s = await page.evaluate(() => window.__state).catch(() => null);
    if (s && s.phase === "running") return s;
    if (s && s.phase === "failed") throw new Error("replay page failed: " + s.error);
    if (Date.now() - t0 > 45000) throw new Error("replay page never running");
    await new Promise(r => setTimeout(r, 500));
  }
}
const st = (page) => page.evaluate(() => window.__state);
async function waitUntil(page, fn, timeoutMs, what) {
  const t0 = Date.now();
  for (;;) {
    const s = await st(page);
    const v = fn(s);
    if (v) return { s, v };
    if (Date.now() - t0 > timeoutMs) throw new Error("timeout: " + what);
    await new Promise(r => setTimeout(r, 500));
  }
}

const run = async () => {
  say(`MEASURE vod=${meta.vodUid} (${meta.vodDurationS}s) cues=${CUES.length} hls=${HLS}`);
  const hz = await fetch(`${BASE}/healthz`).catch(() => null);
  if (!hz || !hz.ok) throw new Error("replay-server not on :8885");
  await pdtCheck();

  fs.rmSync(UDD, { recursive: true, force: true });
  ctx = await chromium.launchPersistentContext(UDD, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio",
           "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
    viewport: { width: 1300, height: 620 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const conLog = fs.createWriteStream(`${LOGDIR}/measure-console.log`, { flags: "a" });
  page.on("console", m => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", e => conLog.write(`${ts()} [pageerror] ${e.message}\n`));

  // ============================ PHASE A =====================================
  say("PHASE A — straight-through replay");
  let sA = await openReplay(page, { startAt: "0" });
  const T0content = sA.t0.content;
  say(`anchors: content=${Math.round(T0content)} stamp=${meta.T0stamp} meta=${meta.T0meta} ` +
      `api(created)=${Date.parse(meta.vodCreated)} spread=${sA.t0.spreadMs}ms`);
  const lastCueVodT = (CUES[CUES.length - 1].at - T0content) / 1000;
  let shotDone = false;
  for (;;) {
    sA = await st(page);
    const ct = await page.evaluate(() => document.getElementById("vid").currentTime);
    if (sA.fires.length + sA.missed.length >= CUES.length && ct > lastCueVodT + 4) break;
    if (sA.ended || ct >= meta.vodDurationS - 0.5) break;
    if (!shotDone && ct > 60) { shotDone = true; await page.screenshot({ path: `${LOGDIR}/measure-a-mid.png` }); }
    say(`A +${ct.toFixed(0)}s fires=${sA.fires.length} caughtup=${sA.missed.length} ` +
        `cur=${sA.currentCue && sA.currentCue.id} rvfc=${sA.rvfc.validClock}/${sA.rvfc.samples}`);
    await new Promise(r => setTimeout(r, 5000));
  }
  await page.screenshot({ path: `${LOGDIR}/measure-a-final.png` });
  say(`A done: fires=${sA.fires.length} caughtup=${sA.missed.length} rvfcValid=${sA.rvfc.validClock}/${sA.rvfc.samples}`);

  // per-cue error table (content-referenced)
  const liveByAt = new Map(liveFires.telemetry.map(t => [t.id, t]));
  const rows = [];
  for (const c of CUES) {
    const f = sA.fires.find(x => x.id === c.id && x.kind === "fired");
    const lb = Object.values(sA.liveBurns).length && sA.fires.find(x => x.id === c.id)
      ? sA.liveBurns[String(liveFires.telemetry.findIndex(t => t.id === c.id) + 1)] : null;
    const lt = liveByAt.get(c.id);
    rows.push({
      id: c.id, mode: c.mode, at: c.at, vodT: Math.round((c.at - T0content)) / 1000,
      fired: !!f,
      errMs: f && f.decOk ? Math.round(f.decClockMs - c.at) : null,   // THE number
      engineLateMs: f ? Math.round(f.lateMs) : null,
      liveLateMs: lt ? Math.round(lt.lateMs) : null,
      liveFiredAtBurn: lb ? lb.cueFiredAt : null,
      liveFiredAtTelemetry: lt ? Math.round(lt.firedAt) : null,
      replayVsLiveMs: f && f.decOk && lt ? Math.round(f.decClockMs - lt.firedAt) : null,
    });
  }
  const errs = rows.filter(r => r.errMs != null).map(r => r.errMs).sort((a, b) => a - b);
  const absErrs = errs.map(Math.abs).sort((a, b) => a - b);
  const summary = {
    n: errs.length, p50: pct(errs, 0.5), p95: pct(errs, 0.95),
    absP50: pct(absErrs, 0.5), absP95: pct(absErrs, 0.95),
    min: errs[0], max: errs[errs.length - 1],
  };
  say("per-cue errors (decodedBurnedClock@fire − fireAt, ms): " + rows.map(r => `${r.id}:${r.errMs}`).join(" "));
  say(`summary n=${summary.n} p50=${summary.p50} p95=${summary.p95} abs p50/p95=${summary.absP50}/${summary.absP95}`);
  assertCheck("A-all-12-fired", rows.every(r => r.fired), rows.filter(r => !r.fired).map(r => r.id).join(",") || "all");
  assertCheck("A-abs-p95-under-150ms", summary.absP95 <= 150, `absP95=${summary.absP95}ms`);
  // live-burn decode integrity: burned firedAt in pixels == show-page telemetry
  const burnMatches = Object.entries(sA.liveBurns).map(([seq, b]) => {
    const t = liveFires.telemetry[Number(seq) - 1];
    return t ? Math.abs(b.cueFiredAt - Math.round(t.firedAt)) : null;
  }).filter(x => x != null);
  assertCheck("A-live-burn-decodes-match-telemetry",
    burnMatches.length >= 10 && burnMatches.every(d => d <= 1),
    `${burnMatches.length} matched, max delta ${Math.max(...burnMatches)} ms`);

  // ============================ PHASE B: late join ==========================
  say("PHASE B — late join at startAt=65 s");
  const before = CUES.filter(c => (c.at - T0content) / 1000 < 64);
  const nextCue = CUES.find(c => (c.at - T0content) / 1000 > 66);
  let sB = await openReplay(page, { startAt: "65" });
  await new Promise(r => setTimeout(r, 2500));               // one engine tick + render
  sB = await st(page);
  await page.screenshot({ path: `${LOGDIR}/measure-b-latejoin.png` });
  const lastBefore = before[before.length - 1];
  assertCheck("B-latest-cue-shown-immediately",
    sB.currentCue && sB.currentCue.id === lastBefore.id && sB.currentCue.kind === "caught-up",
    `currentCue=${sB.currentCue && sB.currentCue.id}/${sB.currentCue && sB.currentCue.kind} want ${lastBefore.id}/caught-up`);
  assertCheck("B-earlier-cues-caught-up-not-refired",
    before.every(c => sB.cueStates[c.id] === "caught-up") &&
    sB.fires.filter(f => f.kind === "fired").length === 0,
    `states=${before.map(c => sB.cueStates[c.id]).join(",")} realFires=${sB.fires.filter(f => f.kind === "fired").length}`);
  const { s: sB2 } = await waitUntil(page,
    s => s.fires.find(f => f.id === nextCue.id && f.kind === "fired"),
    30000, `late-join fire of ${nextCue.id}`);
  const fB = sB2.fires.find(f => f.id === nextCue.id);
  assertCheck("B-next-cue-fires-normally",
    fB.decOk && Math.abs(fB.decClockMs - nextCue.at) <= 250,
    `${nextCue.id} err=${fB.decOk ? Math.round(fB.decClockMs - nextCue.at) : "?"}ms late=${fB.lateMs}ms`);

  // ============================ PHASE C: seeks ==============================
  say("PHASE C — forward seek to 150 s, then backward to 30 s");
  await page.evaluate(() => window.__seekTo(150));
  await new Promise(r => setTimeout(r, 2500));
  let sC = await st(page);
  const upTo150 = CUES.filter(c => (c.at - T0content) / 1000 < 149);
  const last150 = upTo150[upTo150.length - 1];
  assertCheck("C-forward-seek-catchup",
    sC.currentCue && sC.currentCue.id === last150.id && sC.currentCue.kind === "caught-up" &&
    upTo150.every(c => sC.cueStates[c.id] === "caught-up"),
    `currentCue=${sC.currentCue && sC.currentCue.id} want ${last150.id}; states ok=${upTo150.every(c => sC.cueStates[c.id] === "caught-up")}`);
  const after150 = CUES.find(c => (c.at - T0content) / 1000 > 151);
  const tSeekBase = Date.now();
  const { s: sC2 } = await waitUntil(page,
    s => s.fires.find(f => f.id === after150.id && f.kind === "fired" && f.t > tSeekBase),
    40000, `post-forward-seek fire of ${after150.id}`);
  const fC = sC2.fires.filter(f => f.id === after150.id).pop();
  assertCheck("C-cue-fires-after-forward-seek",
    fC.decOk && Math.abs(fC.decClockMs - after150.at) <= 250,
    `${after150.id} err=${fC.decOk ? Math.round(fC.decClockMs - after150.at) : "?"}ms`);

  const tBack = Date.now();
  await page.evaluate(() => window.__seekTo(30));
  await new Promise(r => setTimeout(r, 2500));
  sC = await st(page);
  await page.screenshot({ path: `${LOGDIR}/measure-c-back.png` });
  const upTo30 = CUES.filter(c => (c.at - T0content) / 1000 < 29);
  const last30 = upTo30[upTo30.length - 1];
  const laterIds = CUES.filter(c => (c.at - T0content) / 1000 > 31).map(c => c.id);
  assertCheck("C-backward-seek-state-rewinds",
    sC.currentCue && sC.currentCue.id === last30.id &&
    upTo30.every(c => sC.cueStates[c.id] === "caught-up") &&
    laterIds.every(id => !(id in sC.cueStates)),
    `currentCue=${sC.currentCue && sC.currentCue.id} want ${last30.id}; later cleared=${laterIds.every(id => !(id in sC.cueStates))}`);
  const reFire = CUES.find(c => (c.at - T0content) / 1000 > 31);
  const { s: sC3 } = await waitUntil(page,
    s => s.fires.find(f => f.id === reFire.id && f.kind === "fired" && f.t > tBack),
    40000, `re-fire of ${reFire.id} after backward seek`);
  const fR = sC3.fires.filter(f => f.id === reFire.id && f.t > tBack).pop();
  assertCheck("C-cue-refires-after-backward-seek",
    fR.decOk && Math.abs(fR.decClockMs - reFire.at) <= 250,
    `${reFire.id} err=${fR.decOk ? Math.round(fR.decClockMs - reFire.at) : "?"}ms`);
  await page.screenshot({ path: `${LOGDIR}/measure-c-refire.png` });

  // ============================ report ======================================
  const report = {
    vodUid: meta.vodUid, vodDurationS: meta.vodDurationS, room: ROOM, hls: HLS,
    anchors: {
      content: Math.round(T0content), contentSpreadMs: sA.t0.spreadMs,
      stamp: meta.T0stamp, meta: meta.T0meta, apiCreated: Date.parse(meta.vodCreated),
      contentMinusStampMs: Math.round(T0content - meta.T0stamp),
      contentMinusMetaMs: meta.T0meta ? Math.round(T0content - meta.T0meta) : null,
      contentMinusApiMs: Math.round(T0content - Date.parse(meta.vodCreated)),
    },
    perCue: rows, summary, checks,
    liveVsReplay: {
      perCueMs: rows.map(r => ({ id: r.id, mode: r.mode, replayVsLiveMs: r.replayVsLiveMs })),
      note: "negative = replay fired EARLIER than the live burn (live pays transit+poll on 'now' cues; replay honors operator intent at fireAt). fireDelayMs param reproduces the live experience instead.",
    },
    rvfc: { samples: sA.rvfc.samples, validClock: sA.rvfc.validClock, validCue: sA.rvfc.validCue },
  };
  fs.writeFileSync(`${HERE}/artifacts/replay-report.json`, JSON.stringify(report, null, 2));
  say(`report written; checks: ${checks.filter(c => c.ok).length}/${checks.length} pass`);

  await ctx.close().catch(() => {});
  try { execSync(`ps -Ao pid,command | grep -F "${UDD}" | grep -v grep | awk '{print $1}' | xargs kill -9 2>/dev/null || true`); } catch {}
  process.exit(checks.every(c => c.ok) ? 0 : 2);
};

run().catch(async e => {
  console.error(ts(), "MEASURE FATAL:", e.message || e);
  if (ctx) await ctx.close().catch(() => {});
  process.exit(1);
});
