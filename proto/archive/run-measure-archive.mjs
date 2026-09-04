#!/usr/bin/env node
// ARCHIVE REPLAY measurement — plays the show BACK FROM R2 (public dev URL,
// nothing served locally except the replay.html page itself) with the NATIVE
// T0 anchor (anchor=stamp&t0=<first-frame stamp>) — NO content calibration in
// the fire path. The burned rows are still decoded per presented frame, which
// yields the content anchor as a cross-check: T0content − T0native is the
// headline "how exact is the native stamp" number.
// Per-cue error = decoded burned wall-clock on the glass at the fire moment −
// fireAt — this INCLUDES any native-anchor error (errMs = anchorDelta +
// engine lateness), so the table is directly comparable to the previous
// content-anchored run (p50 59 / p95 71 ms).
// Usage: node run-measure-archive.mjs   (after record-local.mjs)
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync } from "child_process";

const ROOT = "/Users/s32863/personal/positron";
const HERE = `${ROOT}/proto/archive`;
const BASE = "http://127.0.0.1:8885";
const REMOTE = "https://rtc.positron.studio";
const SCRATCH = "/private/tmp/claude-501/-Users-s32863-personal-positron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad";
const UDD = `${SCRATCH}/archive-test-udd-measure`;
const LOGDIR = `${HERE}/logs`;
const RESULTS = `${ROOT}/results/archive-replay.jsonl`;

function envVal(k) {
  const l = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find((x) => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
}
const TOKEN = envVal("ROOM_TOKEN");
const meta = JSON.parse(fs.readFileSync(`${HERE}/artifacts/archive-meta.json`, "utf8"));
const cuelog = JSON.parse(fs.readFileSync(`${HERE}/artifacts/archive-cuelog.json`, "utf8"));
const liveFires = JSON.parse(fs.readFileSync(`${HERE}/artifacts/archive-live-fires.json`, "utf8"));
// cuelog may carry cancel records ({kind:'cancel', id}) — cancelled cues must
// not be part of the plan, and cancel rows themselves have no .cue
const cancelled = new Set(cuelog.cues.filter((e) => e.kind === "cancel").map((e) => e.id));
const CUES = cuelog.cues.filter((e) => e.cue && !cancelled.has(e.cue.id))
  .map((e) => ({ id: e.cue.id, at: e.cue.at, sentAt: e.cue.sentAt,
                 mode: e.cue.data && e.cue.data.mode }));
const HLS = meta.hlsUrl;
const ROOM = process.env.ROOM || meta.room;   // meta carries the per-run room
const T0N = meta.T0native;

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }
function pct(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]; }
function jsonl(row) { fs.appendFileSync(RESULTS, JSON.stringify({ t: Date.now(), ...row }) + "\n"); }
const checks = [];
function assertCheck(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  say(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail || ""}`);
}

const run = async () => {
  say(`ARCHIVE MEASURE hls=${HLS} cues=${CUES.length} T0native=${T0N} (anchor=stamp — NO calibration)`);
  const hz = await fetch(`${BASE}/healthz`).catch(() => null);
  if (!hz || !hz.ok) throw new Error("replay-server not on :8885");

  // R2 playlist sanity: reachable, ENDLIST, segment count
  const pl = await (await fetch(HLS)).text();
  const segCount = pl.split("\n").filter((l) => l.trim().endsWith(".ts")).length;
  assertCheck("r2-playlist-reachable-ended", pl.includes("#EXT-X-ENDLIST") && segCount > 0,
    `${segCount} segments, ${pl.length} B, ENDLIST=${pl.includes("#EXT-X-ENDLIST")}`);

  fs.rmSync(UDD, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(UDD, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio",
           "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
    viewport: { width: 1300, height: 620 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const conLog = fs.createWriteStream(`${LOGDIR}/measure-console.log`, { flags: "a" });
  page.on("console", (m) => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", (e) => conLog.write(`${ts()} [pageerror] ${e.message}\n`));

  const qp = new URLSearchParams({
    src: HLS, room: ROOM, token: TOKEN, remote: REMOTE,
    anchor: "stamp", t0: String(T0N), startAt: "0", cb: String(Date.now()),
  });
  await page.goto(`${BASE}/proto/replay/replay.html?${qp}`, { waitUntil: "load" });
  const tBoot = Date.now();
  let s = null;
  for (;;) {
    s = await page.evaluate(() => window.__state).catch(() => null);
    if (s && s.phase === "running") break;
    if (s && s.phase === "failed") throw new Error("replay page failed: " + s.error);
    if (Date.now() - tBoot > 60000) throw new Error("replay page never running");
    await new Promise((r) => setTimeout(r, 500));
  }
  say("replay RUNNING from R2 (native stamp anchor)");

  const lastCueVodT = (CUES[CUES.length - 1].at - T0N) / 1000;
  let shotDone = false;
  for (;;) {
    s = await page.evaluate(() => window.__state);
    const ct = await page.evaluate(() => document.getElementById("vid").currentTime);
    if (s.fires.length + s.missed.length >= CUES.length && ct > lastCueVodT + 4 && s.t0.content != null) break;
    if (s.ended || ct >= meta.durationS - 1) break;
    if (!shotDone && ct > 60) { shotDone = true; await page.screenshot({ path: `${LOGDIR}/measure-mid.png` }); }
    say(`A +${ct.toFixed(0)}s fires=${s.fires.length} caughtup=${s.missed.length} ` +
        `cur=${s.currentCue && s.currentCue.id} rvfc=${s.rvfc.validClock}/${s.rvfc.samples} ` +
        `content=${s.t0.content ? Math.round(s.t0.content) : "…"}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  await page.screenshot({ path: `${LOGDIR}/measure-final.png` });
  say(`done: fires=${s.fires.length} caughtup=${s.missed.length} rvfcValid=${s.rvfc.validClock}/${s.rvfc.samples}`);

  // ---- headline: native stamp vs content truth ------------------------------
  const T0content = s.t0.content;
  const anchorDeltaMs = T0content != null ? Math.round((T0content - T0N) * 10) / 10 : null;
  say(`ANCHORS  native(stamp)=${T0N}  content=${T0content && Math.round(T0content)}  ` +
      `DELTA content−native = ${anchorDeltaMs} ms (spread ${s.t0.spreadMs} ms over 15 frames)`);
  assertCheck("content-anchor-derived", T0content != null, `spread=${s.t0.spreadMs}ms`);

  // ---- per-cue table --------------------------------------------------------
  const liveById = new Map(liveFires.telemetry.map((t) => [t.id, t]));
  const rows = [];
  for (const c of CUES) {
    const f = s.fires.find((x) => x.id === c.id && x.kind === "fired");
    const lt = liveById.get(c.id);
    rows.push({
      id: c.id, mode: c.mode, at: c.at, vodT: Math.round(c.at - T0N) / 1000,
      fired: !!f,
      errMs: f && f.decOk ? Math.round(f.decClockMs - c.at) : null,   // THE number
      engineLateMs: f ? Math.round(f.lateMs) : null,
      liveLateMs: lt ? Math.round(lt.lateMs) : null,
      replayVsLiveMs: f && f.decOk && lt ? Math.round(f.decClockMs - lt.firedAt) : null,
    });
  }
  const errs = rows.filter((r) => r.errMs != null).map((r) => r.errMs).sort((a, b) => a - b);
  const absErrs = errs.map(Math.abs).sort((a, b) => a - b);
  const summary = {
    n: errs.length, p50: pct(errs, 0.5), p95: pct(errs, 0.95),
    absP50: pct(absErrs, 0.5), absP95: pct(absErrs, 0.95),
    min: errs[0], max: errs[errs.length - 1],
  };
  say("per-cue err (decodedBurnedClock@fire − fireAt, ms, NATIVE anchor): " +
      rows.map((r) => `${r.id}:${r.errMs}`).join(" "));
  say(`summary n=${summary.n} p50=${summary.p50} p95=${summary.p95} (previous content-anchored run: 59/71)`);
  assertCheck("all-cues-fired", rows.every((r) => r.fired),
    rows.filter((r) => !r.fired).map((r) => r.id).join(",") || "all " + rows.length);
  assertCheck("all-fire-frames-decoded", rows.every((r) => !r.fired || r.errMs != null), "decOk on every fire");
  assertCheck("abs-p95-under-150ms", summary.absP95 <= 150, `absP95=${summary.absP95}ms`);
  assertCheck("native-anchor-within-1-frame-of-content", anchorDeltaMs != null && Math.abs(anchorDeltaMs) <= 34,
    `content−native=${anchorDeltaMs}ms`);
  assertCheck("burn-decode-rate", s.rvfc.samples > 0 && s.rvfc.validClock / s.rvfc.samples > 0.95,
    `${s.rvfc.validClock}/${s.rvfc.samples}`);

  // ---- report ---------------------------------------------------------------
  const report = {
    hls: HLS, room: ROOM, bucket: meta.bucket, prefix: meta.prefix,
    anchors: {
      native: T0N, content: T0content, contentSpreadMs: s.t0.spreadMs,
      contentMinusNativeMs: anchorDeltaMs,
      tSpawnFfmpeg: meta.stamps.tSpawnFfmpeg, T0meta: meta.stamps.T0meta,
      tFfFirstProgress: meta.stamps.tFfFirstProgress,
    },
    perCue: rows, summary, checks,
    rvfc: { samples: s.rvfc.samples, validClock: s.rvfc.validClock, validCue: s.rvfc.validCue },
    previousContentAnchoredRun: { p50: 59, p95: 71 },
  };
  fs.writeFileSync(`${HERE}/artifacts/archive-report.json`, JSON.stringify(report, null, 2));
  jsonl({ kind: "summary", hls: HLS, anchorDeltaMs, ...summary,
          checksPass: checks.filter((c) => c.ok).length, checksTotal: checks.length });
  for (const r of rows) jsonl({ kind: "cue", ...r });
  say(`report written; checks: ${checks.filter((c) => c.ok).length}/${checks.length} pass`);

  await ctx.close().catch(() => {});
  try { execSync(`ps -Ao pid,command | grep -F "${UDD}" | grep -v grep | awk '{print $1}' | xargs kill -9 2>/dev/null || true`); } catch {}
  process.exit(checks.every((c) => c.ok) ? 0 : 2);
};

run().catch(async (e) => {
  console.error(ts(), "MEASURE FATAL:", e.message || e);
  process.exit(1);
});
