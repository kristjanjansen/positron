#!/usr/bin/env node
// ===========================================================================
// STUDIO — ANCHOR PROBE.  The discriminating instrument for NOTES §anchor.
//
// The question: `content anchor − native T₀` measures −45 ms in this engine and
// −15 ms in proto/archive's rig. Both are the SAME quantity by construction, so
// one of them is wrong, or they are not the same quantity after all.
//
// replay.html computes the content anchor in a browser, off hls.js, off rVFC:
//     T0content = median_{first 15 presented frames}( burnedClock_j − mediaTime_j·1000 )
// That is three suspects in one number (capture, encode, playback). This script
// reproduces the SAME median rule OFFLINE — no browser, no hls.js, no rVFC —
// straight off the local segments, and additionally decodes the burned clock
// out of the INPUT JPEGs the engine actually fed to ffmpeg. That splits the
// number into three independently measurable legs:
//
//   pixelAge   = tArr[0] − clockIn[0]      capture leg: how old the pixels of
//                                          the first frame already are when
//                                          node stamps native T₀
//   swallow    = clockOut[0] − clockIn[0]  encode leg: how much source time is
//                                          consumed before media t=0 exists
//   anchorOff  = median(clockOut_j − ptsRel_j) − T0native     the offline anchor
//
// Identity, if nothing else is going on:   anchorOff ≈ swallow − pixelAge
// and the browser's number should equal anchorOff (any residual is hls.js's
// media-time mapping, which is then measured rather than assumed).
//
// Usage:
//   node studio/anchor-probe.mjs --rec=<recdir>            [--t0=<epochMs>] [--n=15] [--secs=4]
//   node studio/anchor-probe.mjs --run=<studio-runId>      (finds recdir via show.json)
//   node studio/anchor-probe.mjs --rec=A --rec=B ...       (compares runs)
// ===========================================================================
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// burned-row geometry — the contract with proto/replay/show.html, copied
// verbatim from proto/replay/replay.html so the two decoders cannot drift.
const NBLOCKS = 64;
const ROW_CLOCK = { x: 32, yc: 624, bw: 12, lo: 4, hi: 9 };
const ROWW = NBLOCKS * ROW_CLOCK.bw;                     // 768 px

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const args = (k) => argv.filter((x) => x.startsWith(`--${k}=`)).map((x) => x.split("=").slice(1).join("="));
const ANCHOR_N = parseInt(arg("n", "15"), 10);           // replay.html's default
const SECS = parseFloat(arg("secs", "4"));
const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/** Decode ONE 768×1 rgb24 row with replay.html's exact algorithm. */
function decodeRow(buf) {
  const levels = [];
  for (let i = 0; i < NBLOCKS; i++) {
    let s = 0, n = 0;
    for (let dx = ROW_CLOCK.lo; dx < ROW_CLOCK.hi; dx++) { s += buf[(i * ROW_CLOCK.bw + dx) * 3 + 1]; n++; }
    levels.push(s / n);
  }
  const mn = Math.min(...levels), mx = Math.max(...levels);
  if (mx - mn < 60) return { ok: false, why: "low-contrast" };
  const thr = (mn + mx) / 2;
  const bits = levels.map((l) => (l > thr ? 1 : 0));
  let ms = 0; for (let i = 0; i < 48; i++) ms = ms * 2 + bits[i];
  let last = 0; for (let i = 48; i < 56; i++) last = last * 2 + bits[i];
  let ck = 0; for (let i = 56; i < 64; i++) ck = ck * 2 + bits[i];
  const bytes = []; let v = ms;
  for (let i = 5; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
  bytes.push(last);
  let expect = 0; for (const b of bytes) expect ^= b;
  if (expect !== ck) return { ok: false, why: "checksum" };
  return { ok: true, ms, last };
}

/** ffmpeg → one 768×1 rgb24 row per frame on stdout; pts_time per frame on
 *  stderr via showinfo, in the SAME pass, so the two can never mis-align. */
function rowsAndPts(inputArgs) {
  const vf = `format=rgb24,crop=${ROWW}:1:${ROW_CLOCK.x}:${ROW_CLOCK.yc},showinfo`;
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "info", ...inputArgs,
    "-vf", vf, "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], { maxBuffer: 512 * 1024 * 1024 });
  if (r.error) throw r.error;
  const pts = [...r.stderr.toString("utf8").matchAll(/pts_time:([\d.\-]+)/g)].map((m) => parseFloat(m[1]));
  const n = Math.floor(r.stdout.length / (ROWW * 3));
  const rows = [];
  for (let j = 0; j < n; j++) rows.push(decodeRow(r.stdout.subarray(j * ROWW * 3, (j + 1) * ROWW * 3)));
  return { rows, pts };
}

function analyse(recdir, t0Override, url) {
  const R = { recdir, ok: false, url: url || null };
  if (t0Override) { R.t0 = t0Override; R.anchorMode = "given"; }
  const probePath = `${recdir}/probe/probe.json`;
  // ---- INPUT leg: the JPEGs the engine actually wrote to ffmpeg's stdin ----
  if (fs.existsSync(probePath)) {
    const P = JSON.parse(fs.readFileSync(probePath, "utf8"));
    R.t0 = P.t0; R.t0meta = P.t0meta; R.t0arrive = P.t0arrive; R.legsLate = P.legsLate;
    R.runId = P.runId; R.anchorMode = P.anchorMode || "legacy";
    R.tStartScreencast = P.tStartScreencast;
    const { rows } = rowsAndPts(["-f", "image2", "-start_number", "0", "-i", `${recdir}/probe/in%03d.jpg`]);
    R.all = P.frames.map((f, k) => ({ ...f, clock: rows[k] && rows[k].ok ? rows[k].ms : null }));
    // Frames the engine DISCARDED (the stale first re-capture) are probed but
    // are not part of the stream: media t=0 can only be a WRITTEN frame.
    R.skipped = R.all.filter((f) => f.written === false);
    R.in = R.all.filter((f) => f.written !== false);
    R.inDecoded = R.in.filter((f) => f.clock != null).length;
    const good = R.in.filter((f) => f.clock != null);
    if (good.length) {
      R.pixelAge = { p50: med(good.map((f) => f.tIn - f.clock)),
                     first: good[0].tIn - good[0].clock,
                     n: good.length };
      // node-side cost between handler entry and the T₀ stamp (base64 + write)
      R.stampCost = R.in[0] ? R.in[0].tArr - R.in[0].tIn : null;
      R.t0MinusTIn0 = R.in[0] ? R.t0 - R.in[0].tIn : null;
      R.metaLag = med(good.filter((f) => f.tMeta).map((f) => f.tIn - f.tMeta));
      const iv = []; for (let i = 1; i < R.in.length; i++) iv.push(R.in[i].tIn - R.in[i - 1].tIn);
      R.inArrivalMs = { p50: med(iv), min: Math.min(...iv), max: Math.max(...iv) };
      const cv = []; for (let i = 1; i < good.length; i++) cv.push(good[i].clock - good[i - 1].clock);
      R.inBurnGapMs = { p50: med(cv), min: Math.min(...cv), max: Math.max(...cv) };
      R.clockIn0 = good[0].clock;
      // COUNTERFACTUALS, computed off the same probe: what content−native WOULD
      // be under two cheaper anchor rules, if media t=0 were frame 1 instead of
      // frame 0 (frame 0 is a stale re-capture of the surface already on screen
      // when Page.startScreencast was called).
      R.cf = {
        now0: R.in[0].clock != null ? -(R.in[0].tIn - R.in[0].clock) : null,   // = today
        now1: R.in[1] && R.in[1].clock != null ? -(R.in[1].tIn - R.in[1].clock) : null,
        meta0: R.in[0].tMeta ? -(R.in[0].tMeta - R.in[0].clock) : null,
        meta1: R.in[1] && R.in[1].tMeta ? -(R.in[1].tMeta - R.in[1].clock) : null,
        // steady state: the same rule applied to every probed frame (p50)
        nowSteady: -med(good.slice(1).map((f) => f.tIn - f.clock)),
        metaSteady: -med(good.slice(1).filter((f) => f.tMeta).map((f) => f.tMeta - f.clock)),
      };
    }
  }
  // ---- OUTPUT leg: the segments ffmpeg produced --------------------------
  // A run that uploaded keeps only 1–2 segments locally (the uploader deletes
  // what R2 has verified — disk is O(1) in show length), so the honest source
  // for such a run is the PUBLISHED playlist: the exact bytes the browser got.
  const pl = R.url || `${recdir}/index.m3u8`;
  if (!R.url && !fs.existsSync(pl)) { R.error = "no index.m3u8 in " + recdir; return R; }
  const { rows, pts } = rowsAndPts(["-i", pl, "-t", String(SECS)]);
  const outs = rows.map((r, j) => ({ j, pts: pts[j], clock: r.ok ? r.ms : null, why: r.why }));
  R.outDecoded = outs.filter((o) => o.clock != null).length;
  R.outFrames = outs.length;
  const first = outs.find((o) => o.clock != null);
  if (!first) { R.error = "no decodable burned row in the output"; return R; }
  const pts0 = outs[0].pts;
  // replay.html's rule, verbatim: the first ANCHOR_N frames whose row decodes,
  // estimate = burnedClock − mediaTime·1000, anchor = the MEDIAN.
  const est = [];
  for (const o of outs) {
    if (o.clock == null) continue;
    est.push({ j: o.j, mediaTime: o.pts - pts0, e: o.clock - (o.pts - pts0) * 1000 });
    if (est.length >= ANCHOR_N) break;
  }
  R.anchorOffline = med(est.map((x) => x.e));
  R.anchorSpread = Math.round(Math.max(...est.map((x) => x.e)) - Math.min(...est.map((x) => x.e)));
  R.estimates = est.map((x) => Math.round(x.e - R.anchorOffline));   // shape, not scale
  R.clockOut0 = first.clock;
  if (R.t0 != null) R.contentMinusNative = r1(R.anchorOffline - R.t0);
  if (R.clockIn0 != null) {
    R.swallowMs = R.clockOut0 - R.clockIn0;             // encode leg
    R.inFramesBeforeMedia0 = R.in.filter((f) => f.clock != null && f.clock < R.clockOut0).length;
  }
  // duplicate structure: how many consecutive output frames carry ONE source
  // frame (the fps=30 filter duplicating a slower screencast)
  const runs = []; let cur = 1;
  for (let j = 1; j < outs.length; j++) {
    if (outs[j].clock != null && outs[j].clock === outs[j - 1].clock) cur++;
    else { runs.push(cur); cur = 1; }
  }
  runs.push(cur);
  const hist = {}; for (const r of runs) hist[r] = (hist[r] || 0) + 1;
  R.dupRuns = hist; R.dupMean = r1(runs.reduce((a, b) => a + b, 0) / runs.length);
  R.ok = true;
  return R;
}

function report(R) {
  const L = [];
  L.push(`\n=== ${R.runId || path.basename(R.recdir)}  anchor=${R.anchorMode || "?"}  ` +
         `${R.legsLate ? "[--legs-late: ffmpeg spawned WITH the screencast]" : "[legs early: ffmpeg warm]"}`);
  if (R.error) { L.push(`  ERROR ${R.error}`); return L.join("\n"); }
  if (R.skipped && R.skipped.length)
    L.push(`  first frame DISCARDED as a stale re-capture (age ${R.skipped[0].tIn - R.skipped[0].clock} ms)`);
  L.push(`  input JPEGs decoded        ${R.inDecoded}/${R.in ? R.in.length : 0}` +
         (R.inArrivalMs ? `   inter-arrival p50 ${R.inArrivalMs.p50} ms (${r1(1000 / R.inArrivalMs.p50)} fps), burn gap p50 ${R.inBurnGapMs.p50} ms` : ""));
  if (R.pixelAge)
    L.push(`  PIXEL AGE  tIn − burnedClock   p50 ${R.pixelAge.p50} ms  (first frame ${R.pixelAge.first} ms, n=${R.pixelAge.n})` +
           `   [CDP meta lag ${R.metaLag} ms]`);
  L.push(`  node stamp cost tArr−tIn    ${R.stampCost} ms      T₀ − tIn[0] = ${R.t0MinusTIn0} ms`);
  L.push(`  output frames decoded       ${R.outDecoded}/${R.outFrames}   dup-run mean ${R.dupMean} (${JSON.stringify(R.dupRuns)})`);
  L.push(`  SWALLOW  clockOut[0] − clockIn[0] = ${R.swallowMs} ms   (${R.inFramesBeforeMedia0} input frames precede media t=0)`);
  L.push(`  anchor (offline, median of ${ANCHOR_N})  ${R.anchorOffline}   spread ${R.anchorSpread} ms`);
  L.push(`  >>> content − native (offline) = ${R.contentMinusNative} ms`);
  if (R.swallowMs != null && R.pixelAge)
    L.push(`      identity check: swallow − pixelAge(first) = ${R.swallowMs - R.pixelAge.first} ms`);
  L.push(`      per-frame estimate shape (ms about the median): ${R.estimates.join(" ")}`);
  if (R.cf)
    L.push(`  COUNTERFACTUAL content−native   frame0/Date.now ${R.cf.now0}  frame0/CDPmeta ${R.cf.meta0}` +
           `  |  frame1/Date.now ${R.cf.now1}  frame1/CDPmeta ${R.cf.meta1}` +
           `  |  steady now ${R.cf.nowSteady} meta ${R.cf.metaSteady}`);
  return L.join("\n");
}

const recs = args("rec").map((r) => ({ rec: r, t0: arg("t0", null) && parseFloat(arg("t0")) }));
for (const runId of args("run")) {
  const sj = `${ROOT}/studio/runs/${runId}/show.json`;
  if (!fs.existsSync(sj)) { console.error("no show.json for " + runId); continue; }
  const s = JSON.parse(fs.readFileSync(sj, "utf8"));
  // A run recorded without --probe still has a recdir and a T0native in its
  // manifest: enough for the OUTPUT leg, which is what the browser measures.
  const localOk = s.recdir && fs.existsSync(`${s.recdir}/index.m3u8`) &&
    fs.readdirSync(s.recdir).filter((f) => f.endsWith(".ts")).length > 2;
  recs.push({ rec: s.recdir, t0: s.T0native, url: localOk ? null : s.hlsUrl });
}
for (const u of args("url")) recs.push({ rec: u, t0: arg("t0", null) && parseFloat(arg("t0")), url: u });
if (!recs.length) { console.error("usage: node studio/anchor-probe.mjs --rec=<recdir>|--url=<m3u8> [--t0=<epochMs>] [--run=<runId>]"); process.exit(1); }
const out = recs.map((x) => analyse(x.rec, x.t0, x.url));
for (const R of out) console.log(report(R));
const dest = `${ROOT}/results/studio-anchor.jsonl`;
for (const R of out)
  fs.appendFileSync(dest, JSON.stringify({
    t: Date.now(), kind: "studio-anchor-probe", runId: R.runId, recdir: R.recdir,
    legsLate: !!R.legsLate, t0: R.t0, pixelAgeP50: R.pixelAge && R.pixelAge.p50,
    pixelAgeFirst: R.pixelAge && R.pixelAge.first, metaLagMs: R.metaLag,
    inArrivalP50: R.inArrivalMs && R.inArrivalMs.p50, swallowMs: R.swallowMs,
    inFramesBeforeMedia0: R.inFramesBeforeMedia0, dupMean: R.dupMean,
    anchorOffline: R.anchorOffline, anchorSpread: R.anchorSpread,
    contentMinusNativeOffline: R.contentMinusNative, cf: R.cf,
  }) + "\n");
console.log(`\n→ ${dest}`);
