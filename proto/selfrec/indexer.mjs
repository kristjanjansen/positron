#!/usr/bin/env node
// ============================================================================
// SERVERLESS-shaped webm cluster indexer — the no-ffmpeg CF path.
//
// The chunk sequence selfrec/<show>/<pid>/chunk-*.webm is ONE logical webm
// byte stream (only chunk 0 has the EBML/Segment header). This parses that
// stream with ZERO deps (pure JS, no ffmpeg, no wasm) and emits a cluster
// index:   [{tMs, chunkSeq, offsetInChunk, byteOffset}]
// -> selfrec/<show>/<pid>/derived/index.json
//
// Replay without ffmpeg then works via HTTP Range requests + MSE: send the
// init segment (bytes [0, firstClusterOffset) of chunk 0 = EBML header +
// Segment Info + Tracks), then any cluster-aligned byte range near target t
// (clusters in MediaRecorder webm start on keyframes often enough; if not,
// step back one cluster). The index maps t -> (chunkSeq, offset) directly.
//
// Parser strategy (honest about it): MediaRecorder streams clusters with
// UNKNOWN EBML size (0x01FFFFFFFFFFFFFF), so clusters cannot be walked by
// size — we SCAN for the 4-byte Cluster ID 0x1F43B675 and validate each hit:
// the next element inside must be Timecode (0xE7, 1-8 byte uint) and the
// timecode must be plausibly monotonic. False positives (the pattern inside
// compressed payload) fail validation and are counted, not indexed.
// TimecodeScale is read from Segment Info (default 1_000_000 ns = 1 ms tick).
//
// The core (indexWebmBuffer) takes bytes + chunk boundaries — exactly what a
// Worker cron would have after R2 get()s — and is measured per-MB so the
// Worker CPU-limit question (free 10 ms vs paid 30 s) gets a real number.
//
// Usage: SHOW=<show> PID=<pid> [LOCAL=<dir with chunk-*.webm>] node indexer.mjs
// ============================================================================
import fs from "fs";

const ROOT = "/Users/s32863/personal/elektron";
const HERE = `${ROOT}/proto/selfrec`;
const BASE = "https://elektron-selfrec.kristjan-jansen.workers.dev";
const PUB = "https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev";
const SHOW = process.env.SHOW, PID = process.env.PID;
const RESULTS = process.env.RESULTS || `${ROOT}/results/selfrec-sync.jsonl`;

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "idx|", ...a); }

// ---- EBML primitives (pure) -------------------------------------------------
// Read an EBML vint at buf[off]: returns {value, length, unknown} — `unknown`
// = all-ones size (streaming/unknown length).
function readVint(buf, off) {
  const first = buf[off];
  if (first === undefined || first === 0) return null;
  let length = 1;
  for (let mask = 0x80; !(first & mask); mask >>= 1) length++;
  if (length > 8 || off + length > buf.length) return null;
  let value = first & (0xff >> length);
  let allOnes = value === (0xff >> length);
  for (let i = 1; i < length; i++) {
    value = value * 256 + buf[off + i];
    if (buf[off + i] !== 0xff) allOnes = false;
  }
  return { value, length, unknown: allOnes };
}
function readUint(buf, off, len) {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + buf[off + i];
  return v;
}

// ---- the serverless-shaped core --------------------------------------------
// buf: Uint8Array of the LOGICAL stream (chunks concatenated)
// bounds: [{seq, start}] ascending — chunk seq for a global offset
// Returns {timecodeScale, clusters, headerBytes, falsePositives}
export function indexWebmBuffer(buf, bounds) {
  // TimecodeScale (0x2AD7B1) lives in Segment Info within the first chunk;
  // scan the first 4 KB (header region) for it.
  let timecodeScale = 1000000;
  for (let i = 0; i < Math.min(buf.length, 4096) - 3; i++) {
    if (buf[i] === 0x2a && buf[i + 1] === 0xd7 && buf[i + 2] === 0xb1) {
      const sz = readVint(buf, i + 3);
      if (sz && !sz.unknown && sz.value >= 1 && sz.value <= 8) {
        timecodeScale = readUint(buf, i + 3 + sz.length, sz.value);
        break;
      }
    }
  }
  const chunkFor = (g) => {
    let lo = 0, hi = bounds.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (bounds[mid].start <= g) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return bounds[ans];
  };
  const clusters = [];
  let falsePositives = 0, headerBytes = null, lastT = -1;
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] !== 0x1f || buf[i + 1] !== 0x43 || buf[i + 2] !== 0xb6 || buf[i + 3] !== 0x75) continue;
    // candidate cluster at global offset i — validate structure
    const sz = readVint(buf, i + 4);
    if (!sz) { falsePositives++; continue; }
    const inner = i + 4 + sz.length;
    if (buf[inner] !== 0xe7) { falsePositives++; continue; }   // Timecode must be first child
    const tsz = readVint(buf, inner + 1);
    if (!tsz || tsz.unknown || tsz.value < 1 || tsz.value > 8) { falsePositives++; continue; }
    const raw = readUint(buf, inner + 1 + tsz.length, tsz.value);
    const tMs = raw * timecodeScale / 1e6;
    if (tMs < lastT - 1000 || tMs > lastT + 600000) { falsePositives++; continue; } // monotonic-ish
    const b = chunkFor(i);
    if (headerBytes == null) headerBytes = i;                  // init segment = [0, firstCluster)
    clusters.push({ tMs: Math.round(tMs), chunkSeq: b.seq, offsetInChunk: i - b.start, byteOffset: i });
    lastT = tMs;
    i = inner + tsz.length + tsz.value;                        // skip past validated Timecode (loop i++ lands after it)
  }
  return { timecodeScale, clusters, headerBytes, falsePositives };
}

// ---- node wrapper: fetch, measure, upload -----------------------------------
const run = async () => {
  if (!SHOW || !PID) { console.error("SHOW and PID required"); process.exit(1); }
  const TOKEN = fs.readFileSync(`${HERE}/.env.selfrec`, "utf8").trim().split("=")[1];
  const man = await (await fetch(`${PUB}/selfrec/${SHOW}/${PID}/manifest.json`)).json();
  const parts = [], bounds = [];
  let g = 0;
  const tFetch = Date.now();
  for (const c of man.chunks) {
    let b;
    if (process.env.LOCAL) b = fs.readFileSync(`${process.env.LOCAL}/chunk-${String(c.seq).padStart(5, "0")}.webm`);
    else b = Buffer.from(await (await fetch(`${PUB}/${c.key}`)).arrayBuffer());
    bounds.push({ seq: c.seq, start: g });
    parts.push(b); g += b.length;
  }
  const buf = Buffer.concat(parts);
  const fetchMs = Date.now() - tFetch;

  const tParse = Date.now();
  const idx = indexWebmBuffer(buf, bounds);
  const parseMs = Date.now() - tParse;
  const mb = buf.length / 1048576;
  const msPerMB = +(parseMs / mb).toFixed(2);

  const index = {
    show: SHOW, pid: PID, mimeType: man.mimeType,
    timecodeScale: idx.timecodeScale,
    headerBytes: idx.headerBytes,               // init segment = chunk0[0, headerBytes)
    clusterCount: idx.clusters.length,
    firstTMs: idx.clusters[0] && idx.clusters[0].tMs,
    lastTMs: idx.clusters.length ? idx.clusters[idx.clusters.length - 1].tMs : null,
    falsePositives: idx.falsePositives,
    stats: { bytes: buf.length, chunks: man.chunks.length, fetchMs, parseMs, msPerMB },
    clusters: idx.clusters,
  };
  const body = JSON.stringify(index);
  const r = await fetch(`${BASE}/derived/${SHOW}/${PID}/index.json`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body,
  });
  if (!r.ok) throw new Error("index upload failed " + r.status);

  const report = {
    kind: "indexer", show: SHOW, pid: PID,
    bytes: buf.length, mb: +mb.toFixed(2), clusters: idx.clusters.length,
    falsePositives: idx.falsePositives, headerBytes: idx.headerBytes,
    spanMs: index.lastTMs - index.firstTMs, manifestDurMs: man.durationMs,
    parseMs, msPerMB, fetchMs, indexBytes: body.length,
    // the Worker-cron verdict inputs: CPU ms for THIS recording, and per-MB
    workerCronFit: { freeTier10ms: parseMs <= 10, paidTier30s: parseMs <= 30000 },
  };
  fs.appendFileSync(RESULTS, JSON.stringify({ t: Date.now(), ...report }) + "\n");
  say(`DONE ${idx.clusters.length} clusters from ${mb.toFixed(1)} MB in ${parseMs} ms ` +
      `(${msPerMB} ms/MB), span ${report.spanMs} ms vs manifest ${man.durationMs} ms, ` +
      `falsePos=${idx.falsePositives}`);
  console.log("REPORT " + JSON.stringify(report));
};
if (process.argv[1] && process.argv[1].endsWith("indexer.mjs")) {
  run().catch((e) => { console.error(ts(), "idx FATAL:", e.message || e); process.exit(1); });
}
