#!/usr/bin/env node
// Segmented-upload daemon for the local-first archive — watches a local HLS
// recording dir; every segment that the PLAYLIST lists (ffmpeg's hls muxer
// appends a segment to index.m3u8 only after the .ts is fully written — that
// IS the close signal) is uploaded to R2, VERIFIED (HEAD on the public dev
// URL: content-length == local size AND etag == local md5 — R2 single-part
// etag is the plain md5, proven in the smoke test), then DELETED locally.
// The playlist is re-uploaded on every change; the ENDLIST playlist last.
//
// Upload tool: `wrangler r2 object put` per object (~1.9 s/call incl. CLI
// startup, measured). No rclone/aws-cli on this machine; wrangler-per-object
// keeps up with 4 s segments (segment+playlist ≈ 3.8 s/cycle). Production
// would use rclone/S3 multipart with R2 access keys instead.
// AUTH: wrangler must run with a CLEAN env (no CF_*/CLOUDFLARE_* vars) and a
// cwd WITHOUT a .env file — wrangler auto-loads .env from its cwd and the
// legacy CF_API_TOKEN it finds there shadows the machine OAuth (workers/rtc/
// NOTES.md trap, re-confirmed: whoami from repo root = unscoped API token,
// whoami from proto/archive = OAuth kristjan.jansen@gmail.com).
//
// Env: RECDIR BUCKET PREFIX PUBBASE OUTDIR RESULTS [POLL_MS=500]
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";

const RECDIR = process.env.RECDIR;
const BUCKET = process.env.BUCKET || "elektron-archive-test";
const PREFIX = process.env.PREFIX || "shows/archive-test";
const PUBBASE = process.env.PUBBASE;               // https://pub-….r2.dev
const OUTDIR = process.env.OUTDIR;                 // report json dir
const RESULTS = process.env.RESULTS;               // jsonl append
const POLL_MS = parseInt(process.env.POLL_MS || "500", 10);
const WRANGLER_CWD = "/Users/s32863/personal/elektron/proto/archive"; // no .env here
if (!RECDIR || !PUBBASE || !OUTDIR || !RESULTS) { console.error("uploader: missing env"); process.exit(1); }

const cleanEnv = { ...process.env };
for (const k of ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN", "CF_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) delete cleanEnv[k];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "up|", ...a); }
function jsonl(row) { fs.appendFileSync(RESULTS, JSON.stringify({ t: Date.now(), ...row }) + "\n"); }
function md5(file) { return crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex"); }

function wrangler(args) {
  return new Promise((resolve) => {
    execFile("wrangler", args, { cwd: WRANGLER_CWD, env: cleanEnv, timeout: 60000 },
      (err, stdout, stderr) => resolve({ ok: !err, stdout, stderr: String(stderr || "") }));
  });
}
async function putObject(key, file, ct) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    const r = await wrangler(["r2", "object", "put", `${BUCKET}/${key}`, "--file", file, "--remote", "--content-type", ct]);
    if (r.ok) return { ok: true, ms: Date.now() - t0, attempt };
    say(`PUT FAIL ${key} attempt ${attempt}: ${r.stderr.slice(0, 200)}`);
    await new Promise((r2) => setTimeout(r2, 1000 * attempt));
  }
  return { ok: false };
}
async function headVerify(key, size, wantMd5) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(`${PUBBASE}/${key}`, { method: "HEAD" });
      if (r.ok) {
        const len = parseInt(r.headers.get("content-length") || "-1", 10);
        const etag = (r.headers.get("etag") || "").replace(/"/g, "");
        return { ok: len === size && etag === wantMd5, len, etag };
      }
    } catch {}
    await new Promise((r2) => setTimeout(r2, 500));
  }
  return { ok: false };
}

// ---- disk high-water sampler ------------------------------------------------
const disk = { hwmBytes: 0, hwmSegs: 0, samples: 0 };
function sampleDisk() {
  let bytes = 0, segs = 0;
  try {
    for (const f of fs.readdirSync(RECDIR)) {
      const st = fs.statSync(path.join(RECDIR, f));
      bytes += st.size;
      if (f.endsWith(".ts")) segs++;
    }
  } catch {}
  disk.samples++;
  if (bytes > disk.hwmBytes) { disk.hwmBytes = bytes; disk.hwmSegs = segs; }
  return { bytes, segs };
}
setInterval(sampleDisk, 1000);

// ---- main loop --------------------------------------------------------------
// Retry discipline: a segment that fails put/verify is RETRIED on later passes
// with exponential backoff (never silently dropped). After MAX_SEG_ATTEMPTS it
// is EXHAUSTED: logged loudly and EXCLUDED from the uploaded playlist rather
// than shipping a 404 reference; the report is then marked degraded:true.
const MAX_SEG_ATTEMPTS = parseInt(process.env.MAX_SEG_ATTEMPTS || "10", 10);
const RETRY_BASE_MS = parseInt(process.env.RETRY_BASE_MS || "2000", 10);
const RETRY_MAX_MS = parseInt(process.env.RETRY_MAX_MS || "60000", 10);
const uploaded = new Map();   // seg name -> row {verified, exhausted, attempts, nextTryAt, ...}
let playlistUploads = 0, playlistLastHash = null, totalBytes = 0;
const tStart = Date.now();

// Drop exhausted segments (and their #EXTINF lines) from the playlist text.
function playlistWithout(pl, excluded) {
  const out = [];
  for (const line of pl.split("\n")) {
    if (excluded.has(line.trim())) {
      while (out.length && out[out.length - 1].startsWith("#EXTINF")) out.pop();
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

async function loop() {
  const plPath = path.join(RECDIR, "index.m3u8");
  for (;;) {
    let pl = null;
    try { pl = fs.readFileSync(plPath, "utf8"); } catch {}
    if (pl) {
      const segs = pl.split("\n").filter((l) => l.trim().endsWith(".ts")).map((l) => l.trim());
      const ended = pl.includes("#EXT-X-ENDLIST");
      for (const seg of segs) {
        const prev = uploaded.get(seg);
        if (prev && (prev.verified || prev.exhausted)) continue;
        if (prev && Date.now() < prev.nextTryAt) continue;       // backoff pending
        const file = path.join(RECDIR, seg);
        let st;
        try { st = fs.statSync(file); } catch {
          if (!prev) continue;                                   // not seen yet, already gone?
          prev.exhausted = true; prev.error = "local file gone before verify";
          say(`!!GIVE-UP ${seg} — local file gone before verify; EXCLUDED from playlist`);
          jsonl({ kind: "segment-exhausted", seg, error: prev.error });
          continue;
        }
        const closedAt = Math.round(st.mtimeMs);
        const sum = md5(file);
        const key = `${PREFIX}/${seg}`;
        const attempts = (prev ? prev.attempts : 0) + 1;
        const put = await putObject(key, file, "video/mp2t");
        const tUp = Date.now();
        const ver = put.ok ? await headVerify(key, st.size, sum) : { ok: false };
        const row = {
          kind: "segment", seg, key, bytes: st.size, closedAt,
          uploadedAt: put.ok ? tUp : null, verifiedAt: ver.ok ? Date.now() : null,
          putMs: put.ms, attempt: put.attempt, attempts, verified: ver.ok,
          exhausted: false, nextTryAt: 0,
          lagMs: ver.ok ? Date.now() - closedAt : null,
        };
        if (ver.ok) { fs.unlinkSync(file); totalBytes += st.size; }
        else if (attempts >= MAX_SEG_ATTEMPTS) {
          row.exhausted = true;
          say(`!!GIVE-UP ${seg} after ${attempts} attempts — EXCLUDED from playlist, report degraded`);
          jsonl({ kind: "segment-exhausted", seg, attempts });
        } else {
          row.nextTryAt = Date.now() + Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (attempts - 1));
          say(`VERIFY FAIL ${seg} — kept locally, retry ${attempts}/${MAX_SEG_ATTEMPTS} in ${row.nextTryAt - Date.now()}ms`,
              JSON.stringify(ver));
        }
        uploaded.set(seg, row);
        jsonl(row);
        const d = sampleDisk();
        say(`${seg} ${(st.size / 1024).toFixed(0)} KB put=${put.ms}ms lag=${row.lagMs}ms resident=${d.segs}seg/${(d.bytes / 1048576).toFixed(1)}MB${ver.ok ? "" : " !!VERIFY-FAIL"}`);
      }
      // Playlist AFTER its segments, and only once every segment it references
      // is settled (verified, or exhausted-and-excluded): the uploaded playlist
      // never references an object that is not verified-present in R2.
      const settled = (s) => { const r = uploaded.get(s); return r && (r.verified || r.exhausted); };
      const allSettled = segs.length > 0 && segs.every(settled);
      const excluded = new Set(segs.filter((s) => uploaded.get(s) && uploaded.get(s).exhausted));
      const plOut = excluded.size ? playlistWithout(pl, excluded) : pl;
      const hash = crypto.createHash("md5").update(plOut).digest("hex");
      if (hash !== playlistLastHash && allSettled) {
        let upPath = plPath;
        if (excluded.size) {
          upPath = path.join(OUTDIR, "index-upload.m3u8");
          fs.writeFileSync(upPath, plOut);
        }
        const put = await putObject(`${PREFIX}/index.m3u8`, upPath, "application/vnd.apple.mpegurl");
        if (put.ok) { playlistLastHash = hash; playlistUploads++; }
      }
      if (ended && allSettled && hash === playlistLastHash) {
        totalBytes += Buffer.byteLength(plOut);
        const rows = [...uploaded.values()];
        const lags = rows.filter((r) => r.lagMs != null).map((r) => r.lagMs).sort((a, b) => a - b);
        const pct = (p) => lags[Math.min(lags.length - 1, Math.floor(p * lags.length))];
        const allVerified = rows.every((r) => r.verified);
        const report = {
          bucket: BUCKET, prefix: PREFIX, pubBase: PUBBASE,
          segments: rows.length, playlistUploads, totalBytes,
          allVerified,
          degraded: !allVerified,
          excludedSegments: [...excluded],
          lagMs: { p50: pct(0.5), p95: pct(0.95), min: lags[0], max: lags[lags.length - 1] },
          diskHighWater: { bytes: disk.hwmBytes, segments: disk.hwmSegs, samples: disk.samples },
          boundedDiskRatio: disk.hwmBytes / totalBytes,
          wallMs: Date.now() - tStart,
          perSegment: rows,
        };
        fs.writeFileSync(path.join(OUTDIR, "uploader-report.json"), JSON.stringify(report, null, 2));
        jsonl({ kind: "uploader-summary", ...report, perSegment: undefined });
        say(`DONE segs=${rows.length} total=${(totalBytes / 1048576).toFixed(1)}MB hwm=${(disk.hwmBytes / 1048576).toFixed(1)}MB (${disk.hwmSegs} segs) lag p50=${report.lagMs.p50}ms p95=${report.lagMs.p95}ms${report.degraded ? " !!DEGRADED (" + excluded.size + " segment(s) excluded)" : ""}`);
        process.exit(allVerified ? 0 : 2);
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
say(`watching ${RECDIR} -> r2://${BUCKET}/${PREFIX} (verify via ${PUBBASE})`);
loop().catch((e) => { console.error(ts(), "up| FATAL", e); process.exit(1); });
