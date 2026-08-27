#!/usr/bin/env node
// ============================================================================
// ENGINE-side repackager — answers "what does the repackaging? CF cron has no
// ffmpeg": THIS runs on the engine machine (node + homebrew ffmpeg), not in a
// Worker. Pull a participant's chunk sequence from R2 (public dev URL — egress
// free), concat to the one logical webm byte stream it already is, ffmpeg to
// fMP4 HLS (4 s segments), upload the derived rendition back through the
// selfrec worker:
//     selfrec/<show>/<pid>/derived/hls/{index.m3u8, init.mp4, seg_*.m4s}
//
// Two paths, decided by the recording's mimeType (manifest):
//   h264-in-webm  ->  REMUX-ONLY (-c copy)      — container swap, no pixels
//   vp8           ->  TRANSCODE  (libx264)      — full decode+encode cost
// Both are measured (wall time per phase vs recording duration) — that ratio
// IS the deliverable.
//
// TRAP (from A5): MediaRecorder webm carries a 1 kHz timebase and NO fps; on
// any ENCODE path ffmpeg's default CFR sync would duplicate frames to ~1000
// fps. `-fps_mode vfr` on the output keeps the real timestamps. (-c copy
// passes timestamps through untouched — no fps_mode needed there.)
//
// Usage: SHOW=<show> PID=<pid> [MODE=auto|copy|transcode] [KEEP_LOCAL=1]
//        node repackage.mjs
// Emits a JSON report on stdout (last line) + appends to results jsonl.
// ============================================================================
import fs from "fs";
import { spawnSync } from "child_process";

const ROOT = "/Users/s32863/personal/elektron";
const HERE = `${ROOT}/proto/selfrec`;
const SCRATCH = "/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad";
const BASE = "https://elektron-selfrec.kristjan-jansen.workers.dev";
const PUB = "https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev";
const SHOW = process.env.SHOW, PID = process.env.PID;
const MODE = process.env.MODE || "auto";
const RESULTS = process.env.RESULTS || `${ROOT}/results/selfrec-sync.jsonl`;
if (!SHOW || !PID) { console.error("SHOW and PID required"); process.exit(1); }
const TOKEN = fs.readFileSync(`${HERE}/.env.selfrec`, "utf8").trim().split("=")[1];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "rpk|", ...a); }
function jsonl(row) { fs.appendFileSync(RESULTS, JSON.stringify({ t: Date.now(), kind: "repackage", show: SHOW, pid: PID, ...row }) + "\n"); }

const work = `${SCRATCH}/rpk-${SHOW}-${PID}`;
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(`${work}/hls`, { recursive: true });

const run = async () => {
  const tAll = Date.now();
  // ---- 1. manifest + chunk download (public URL, egress free) --------------
  const man = await (await fetch(`${PUB}/selfrec/${SHOW}/${PID}/manifest.json`)).json();
  const recDurMs = man.durationMs;
  const isH264 = /h264|avc/i.test(man.mimeType || "");
  const mode = MODE === "auto" ? (isH264 ? "copy" : "transcode") : MODE;
  say(`${SHOW}/${PID}: ${man.chunkCount} chunks, ${recDurMs} ms, mime=${man.mimeType} -> mode=${mode}`);
  const concat = `${work}/concat.webm`;
  const t0 = Date.now();
  const out = fs.createWriteStream(concat);
  let inBytes = 0;
  for (const c of man.chunks) {
    const r = await fetch(`${PUB}/${c.key}`);
    if (!r.ok) throw new Error(`download ${c.key}: ${r.status}`);
    const b = Buffer.from(await r.arrayBuffer());
    if (b.length !== c.bytes) throw new Error(`size mismatch ${c.key}`);
    out.write(b); inBytes += b.length;
  }
  await new Promise((r) => out.end(r));
  const downloadMs = Date.now() - t0;

  // ---- 2. ffmpeg -> fMP4 HLS ----------------------------------------------
  const hlsArgs = ["-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod",
    "-hls_segment_type", "fmp4", "-hls_flags", "independent_segments",
    "-hls_fmp4_init_filename", "init.mp4",
    "-hls_segment_filename", `${work}/hls/seg_%05d.m4s`, `${work}/hls/index.m3u8`];
  const args = mode === "copy"
    ? ["-y", "-hide_banner", "-loglevel", "error", "-i", concat, "-c", "copy", ...hlsArgs]
    : ["-y", "-hide_banner", "-loglevel", "error", "-i", concat,
       // -fps_mode vfr = the 1 kHz-timebase trap fix; force_key_frames gives
       // clean 4 s segment boundaries (vp8 source has whatever GOP Chrome chose).
       // -bf 0: B-frames shift the fMP4 timeline by the reorder delay (measured
       // +66 ms first-pts + ~60 ms un-applied edit list in hls.js = a constant
       // ~-125 ms replay bias on every seek). Zero B-frames = pts==dts==source.
       "-fps_mode", "vfr", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-bf", "0",
       "-force_key_frames", "expr:gte(t,n_forced*4)", "-pix_fmt", "yuv420p", ...hlsArgs];
  const t1 = Date.now();
  const ff = spawnSync("ffmpeg", args, { encoding: "utf8" });
  const ffmpegMs = Date.now() - t1;
  if (ff.status !== 0) throw new Error(`ffmpeg (${mode}) failed: ${(ff.stderr || "").slice(0, 500)}`);

  // ---- 3. verify output + upload derived ----------------------------------
  const files = fs.readdirSync(`${work}/hls`).sort();
  const outBytes = files.reduce((s, f) => s + fs.statSync(`${work}/hls/${f}`).size, 0);
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v",
    "-show_entries", "stream=codec_name:format=duration", "-of", "json",
    `${work}/hls/index.m3u8`], { encoding: "utf8" });
  let outCodec = null, outDurS = null;
  try {
    const pj = JSON.parse(probe.stdout);
    outCodec = pj.streams && pj.streams[0] && pj.streams[0].codec_name;
    outDurS = pj.format && parseFloat(pj.format.duration);
  } catch {}
  const ctFor = (f) => f.endsWith(".m3u8") ? "application/vnd.apple.mpegurl"
    : f.endsWith(".mp4") ? "video/mp4" : "video/iso.segment";
  const t2 = Date.now();
  for (const f of files) {
    const body = fs.readFileSync(`${work}/hls/${f}`);
    for (let a = 1; a <= 3; a++) {
      const r = await fetch(`${BASE}/derived/${SHOW}/${PID}/hls/${f}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": ctFor(f) },
        body,
      });
      if (r.ok) { const j = await r.json(); if (j.size === body.length) break; }
      if (a === 3) throw new Error(`upload ${f} failed`);
      await new Promise((res) => setTimeout(res, 500 * a));
    }
  }
  const uploadMs = Date.now() - t2;
  // spot-verify the playlist is publicly readable
  const plCheck = await fetch(`${PUB}/selfrec/${SHOW}/${PID}/derived/hls/index.m3u8`);
  if (!plCheck.ok) throw new Error("derived playlist not readable on pub URL");

  const report = {
    mode, mimeIn: man.mimeType, codecOut: outCodec,
    recDurMs, chunkCount: man.chunkCount,
    inBytes, outBytes, files: files.length,
    outDurS,
    downloadMs, ffmpegMs, uploadMs, totalMs: Date.now() - tAll,
    ffmpegRatio: +(ffmpegMs / recDurMs).toFixed(4),     // THE number: wall/media
    totalRatio: +((Date.now() - tAll) / recDurMs).toFixed(4),
    derivedPrefix: `selfrec/${SHOW}/${PID}/derived/hls/`,
  };
  jsonl(report);
  say(`DONE mode=${mode}: ffmpeg ${ffmpegMs} ms for ${recDurMs} ms media ` +
      `(ratio ${report.ffmpegRatio}), total ${report.totalMs} ms, ${files.length} files ${(outBytes / 1048576).toFixed(1)} MB`);
  if (!process.env.KEEP_LOCAL) fs.rmSync(work, { recursive: true, force: true });
  console.log("REPORT " + JSON.stringify(report));
};
run().catch((e) => { console.error(ts(), "rpk FATAL:", e.message || e); process.exit(1); });
