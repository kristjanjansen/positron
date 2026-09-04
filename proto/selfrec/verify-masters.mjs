#!/usr/bin/env node
// ============================================================================
// PLAYBACK-leg verifier 2: the NO-FFMPEG path (replay-masters.html).
//
//   node verify-masters.mjs       (SHOW defaults to the kept proof show)
//
// Plays the UNTOUCHED WebM masters via cluster index + HTTP Range + MSE in
// desktop Chrome (headless chromium IS desktop chrome). Per participant:
//   - boot: manifest + index.json, MediaSource.isTypeSupported verdict for
//     the recorded mime (h264-in-webm is the known risk) — a documented
//     failure with the exact error is a valid result;
//   - 3 seeks (media t = 10/40/70 s): burned-clock decode accuracy vs
//     T0 + t (the linear wall mapping), bytes fetched per seek vs full file.
// ============================================================================
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync, spawn } from "child_process";

const ROOT = "/Users/s32863/personal/positron";
const HERE = `${ROOT}/proto/selfrec`;
const SCRATCH = "/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad";
const SHOW = process.env.SHOW || "sync-20260827T093613";
const RESULTS = `${ROOT}/results/selfrec-playback.jsonl`;
const UDD = `${SCRATCH}/selfrec-udd-masters`;
const LOGDIR = `${HERE}/logs`, ART = `${HERE}/artifacts`;

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "mstr|", ...a); }
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

const run = async () => {
  say(`SHOW=${SHOW} — masters replay via cluster index + Range + MSE`);
  await startCollector();
  fs.rmSync(UDD, { recursive: true, force: true });
  ctx = await chromium.launchPersistentContext(UDD, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
    viewport: { width: 1400, height: 800 },
  });
  const out = { show: SHOW, participants: {} };
  for (const pid of ["p1", "p2"]) {
    const page = await ctx.newPage();
    const conLog = fs.createWriteStream(`${LOGDIR}/page-playback-masters-${pid}.console.txt`, { flags: "a" });
    page.on("console", (m) => conLog.write(`${ts()} [${m.type()}] ${m.text()}\n`));
    page.on("pageerror", (e) => conLog.write(`${ts()} [pageerror] ${e.message}\n`));
    await page.goto(`http://127.0.0.1:8894/replay-masters.html?show=${SHOW}&pid=${pid}&window=8000&cb=${Date.now()}`,
      { waitUntil: "load" });
    let M;
    {
      const t0 = Date.now();
      for (;;) {
        M = await page.evaluate(() => JSON.parse(JSON.stringify(window.__m)));
        if (M.phase !== "init") break;
        if (Date.now() - t0 > 30000) throw new Error(pid + " masters page never left init");
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    const row = { phase: M.phase, error: M.error, info: M.info, seeks: [] };
    out.participants[pid] = row;
    check(`M-${pid}-boot`, M.phase === "ready",
      M.phase === "ready"
        ? `mime "${M.info.mimeType}" -> MSE "${M.info.mimeChosen}", ${M.info.clusters} clusters, init ${M.info.initBytes} B`
        : `${M.phase}: ${M.error}`);
    if (M.phase !== "ready") { await page.close(); continue; }
    const T0 = M.info.T0, full = M.info.totalBytes;
    for (const tSeek of [10000, 40000, 70000]) {
      const r = await page.evaluate((t) => window.__seekMasters(t), tSeek);
      const errMs = r.ok && r.clock != null ? Math.round(r.clock - (T0 + tSeek)) : null;
      const seek = { tMs: tSeek, ok: r.ok, errMs, clock: r.clock, pidByte: r.pidByte,
                     videoTimeMs: r.videoTimeMs, bytesFetched: r.bytesFetched, requests: r.requests,
                     pctOfFull: +(100 * r.bytesFetched / full).toFixed(1),
                     backSteps: r.backSteps, wallMs: r.wallMs,
                     startClusterTMs: r.startClusterTMs, buffered: r.buffered,
                     error: r.error || null, decodeWhy: r.decodeWhy || null };
      row.seeks.push(seek);
      say(`  ${pid} seek ${tSeek} ms: ok=${r.ok} err=${errMs} ms, ${r.bytesFetched} B ` +
          `(${seek.pctOfFull}% of full ${Math.round(full / 1024)} KB) in ${r.requests} range reqs, ${r.wallMs} ms` +
          (r.error ? ` ERROR: ${r.error}` : ""));
      await page.screenshot({ path: `${LOGDIR}/playback-masters-${pid}-${tSeek}.png` });
    }
    const okSeeks = row.seeks.filter((s) => s.ok && s.errMs != null);
    check(`M-${pid}-seeks`, okSeeks.length === 3,
      okSeeks.length === 3
        ? row.seeks.map((s) => `${s.tMs / 1000}s: ${s.errMs} ms, ${(s.bytesFetched / 1024).toFixed(0)} KB (${s.pctOfFull}%)`).join(" | ")
        : "failed rows: " + JSON.stringify(row.seeks.filter((s) => !s.ok || s.errMs == null).map((s) => ({ t: s.tMs, error: s.error, decodeWhy: s.decodeWhy }))));
    if (okSeeks.length === 3) {
      check(`M-${pid}-band150`, okSeeks.every((s) => Math.abs(s.errMs) <= 150),
        `errs ${okSeeks.map((s) => s.errMs).join("/")} ms (informational band ±150)`);
    }
    await page.close();
  }
  mergeReport("masters_mse", { ...out, checks });
  fs.appendFileSync(RESULTS, JSON.stringify({ t: Date.now(), kind: "verify-masters", checksPass: checks.filter((c) => c.ok).length, checksTotal: checks.length }) + "\n");
  say(`DONE — checks ${checks.filter((c) => c.ok).length}/${checks.length} pass`);
  await teardown();
  process.exit(0);   // measurement run: honest failures are results, not rig errors
};
run().catch(async (e) => {
  console.error(ts(), "MSTR FATAL:", e && e.stack || e);
  await teardown();
  process.exit(1);
});
