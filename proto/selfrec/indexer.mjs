#!/usr/bin/env node
// ============================================================================
// SERVERLESS-shaped webm indexer — the no-ffmpeg CF path.
//
// The chunk sequence selfrec/<show>/<pid>/chunk-*.webm is ONE logical webm
// byte stream (only chunk 0 has the EBML/Segment header). This parses that
// stream with ZERO deps (pure JS, no ffmpeg, no wasm) and emits:
//
//   CLUSTER index (default):  [{tMs, chunkSeq, offsetInChunk, byteOffset}]
//      -> selfrec/<show>/<pid>/derived/index.json
//   BLOCK index (--blocks / BLOCKS=1): per-SimpleBlock rows [tMs, byteOffset,
//      keyflag] (columnar arrays, ~3 kB/min vs objects) — the hour-scale
//      re-anchoring question needs sub-cluster byte->time granularity.
//      -> selfrec/<show>/<pid>/derived/index-blocks.json
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
// SimpleBlocks DO carry sizes, so within a validated cluster the block pass
// is a proper element walk (no scanning) bounded by the next cluster offset.
// TimecodeScale is read from Segment Info (default 1_000_000 ns = 1 ms tick).
//
// The cores (indexWebmBuffer / indexWebmBlocks) take bytes + chunk boundaries
// — exactly what a Worker cron would have after R2 get()s — and are measured
// per-MB so the Worker CPU-limit question gets a real number.
//
// CLI:    SHOW=<show> PID=<pid> [BLOCKS=1] [LOCAL=<dir>] node indexer.mjs [--blocks]
// module: await indexParticipant({ show, pid, blocks?, results? })
// ============================================================================
import fs from "fs";

const ROOT = "/Users/s32863/personal/elektron";
const HERE = `${ROOT}/proto/selfrec`;
const BASE = "https://elektron-selfrec.kristjan-jansen.workers.dev";
const PUB = "https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev";

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
// Element ID length from the first byte (IDs keep their marker bit — we only
// need the byte length to step over them; matching uses the first byte since
// all cluster-level children of interest have 1-byte IDs).
function idLen(first) {
  if (first & 0x80) return 1;
  if (first & 0x40) return 2;
  if (first & 0x20) return 3;
  if (first & 0x10) return 4;
  return 0; // invalid
}

// ---- core 1: cluster index --------------------------------------------------
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
    clusters.push({ tMs: Math.round(tMs), chunkSeq: b.seq, offsetInChunk: i - b.start, byteOffset: i,
                    childrenAt: inner });                      // block pass entry point
    lastT = tMs;
    i = inner + tsz.length + tsz.value;                        // skip past validated Timecode (loop i++ lands after it)
  }
  return { timecodeScale, clusters, headerBytes, falsePositives };
}

// ---- core 2: SimpleBlock index ---------------------------------------------
// Walks each validated cluster's children (Timecode, SimpleBlock, BlockGroup,
// Void...) bounded by the next cluster's byte offset. Emits columnar rows
// [tMs, byteOffset, keyflag]; keyflag: 1 = SimpleBlock keyframe bit set,
// 0 = not a keyframe, -1 = undetectable (Block-in-BlockGroup without walking
// ReferenceBlock — flagged, not guessed).
// Returns {blocks, bailed} — `bailed` counts clusters abandoned mid-walk on a
// malformed element (their remaining blocks are simply absent, stated).
export function indexWebmBlocks(buf, clusterIdx) {
  const { timecodeScale, clusters } = clusterIdx;
  const blocks = [];
  let bailed = 0;
  for (let ci = 0; ci < clusters.length; ci++) {
    const cl = clusters[ci];
    const end = ci + 1 < clusters.length ? clusters[ci + 1].byteOffset : buf.length;
    let p = cl.childrenAt;
    let ok = true;
    while (p < end - 1) {
      const il = idLen(buf[p]);
      if (!il) { ok = false; break; }
      const id1 = buf[p];
      const sz = readVint(buf, p + il);
      if (!sz || sz.unknown || p + il + sz.length + sz.value > buf.length) { ok = false; break; }
      const q = p + il + sz.length;
      if (id1 === 0xa3) {                                     // SimpleBlock
        const tr = readVint(buf, q);
        if (!tr) { ok = false; break; }
        const rel = (buf[q + tr.length] << 8 | buf[q + tr.length + 1]) << 16 >> 16; // int16
        const flags = buf[q + tr.length + 2];
        const tMs = (cl.tMs * 1e6 / timecodeScale + rel) * timecodeScale / 1e6;
        blocks.push([Math.round(tMs), p, (flags & 0x80) ? 1 : 0]);
      } else if (id1 === 0xa0) {                              // BlockGroup: find Block 0xA1 + ReferenceBlock 0xFB
        let bp = q, bT = null, hasRef = false;
        while (bp < q + sz.value - 1) {
          const bil = idLen(buf[bp]);
          if (!bil) break;
          const bsz = readVint(buf, bp + bil);
          if (!bsz || bsz.unknown) break;
          if (buf[bp] === 0xa1 && bT == null) {
            const tr = readVint(buf, bp + bil + bsz.length);
            if (tr) {
              const rel = (buf[bp + bil + bsz.length + tr.length] << 8 |
                           buf[bp + bil + bsz.length + tr.length + 1]) << 16 >> 16;
              bT = (cl.tMs * 1e6 / timecodeScale + rel) * timecodeScale / 1e6;
            }
          }
          if (buf[bp] === 0xfb) hasRef = true;
          bp += bil + bsz.length + bsz.value;
        }
        if (bT != null) blocks.push([Math.round(bT), p, hasRef ? 0 : -1]);
      }
      // 0xE7 Timecode / 0xEC Void / 0xAB PrevSize etc: just step over
      p = q + sz.value;
    }
    if (!ok && p < end - 4) bailed++;   // malformed before the cluster's real end
  }
  return { blocks, bailed };
}

// ---- node wrapper: fetch, measure, upload -----------------------------------
export async function indexParticipant({ show, pid, blocks = false,
    results = `${ROOT}/results/selfrec-sync.jsonl`, local = null } = {}) {
  if (!show || !pid) throw new Error("show and pid required");
  const TOKEN = fs.readFileSync(`${HERE}/.env.selfrec`, "utf8").trim().split("=")[1];
  const man = await (await fetch(`${PUB}/selfrec/${show}/${pid}/manifest.json`)).json();
  const parts = [], bounds = [];
  let g = 0;
  const tFetch = Date.now();
  for (const c of man.chunks) {
    let b;
    if (local) b = fs.readFileSync(`${local}/chunk-${String(c.seq).padStart(5, "0")}.webm`);
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

  let report, body, dest;
  if (blocks) {
    // ---- BLOCK mode: emit index-blocks.json --------------------------------
    const tB = Date.now();
    const blk = indexWebmBlocks(buf, idx);
    const blockParseMs = Date.now() - tB;
    const keyframes = blk.blocks.filter((b) => b[2] === 1).length;
    const undetectable = blk.blocks.filter((b) => b[2] === -1).length;
    const spanMs = blk.blocks.length ? blk.blocks[blk.blocks.length - 1][0] - blk.blocks[0][0] : 0;
    const index = {
      show, pid, mimeType: man.mimeType,
      timecodeScale: idx.timecodeScale, headerBytes: idx.headerBytes,
      cols: ["tMs", "byteOffset", "keyflag"],   // keyflag 1=key 0=delta -1=undetectable
      blockCount: blk.blocks.length, keyframes, undetectable, bailedClusters: blk.bailed,
      firstTMs: blk.blocks[0] && blk.blocks[0][0],
      lastTMs: blk.blocks.length ? blk.blocks[blk.blocks.length - 1][0] : null,
      stats: { bytes: buf.length, chunks: man.chunks.length, fetchMs,
               clusterParseMs: parseMs, blockParseMs, msPerMB },
      blocks: blk.blocks,
    };
    body = JSON.stringify(index);
    dest = `index-blocks.json`;
    report = {
      kind: "indexer-blocks", show, pid,
      bytes: buf.length, mb: +mb.toFixed(2),
      clusters: idx.clusters.length, blocks: blk.blocks.length,
      keyframes, undetectable, bailedClusters: blk.bailed,
      medianBlockGapMs: medianGap(blk.blocks),
      spanMs, manifestDurMs: man.durationMs,
      clusterParseMs: parseMs, blockParseMs, totalParseMs: parseMs + blockParseMs,
      msPerMB: +((parseMs + blockParseMs) / mb).toFixed(2),
      fetchMs, indexBytes: body.length,
      indexBytesPerMediaHour: Math.round(body.length / Math.max(1, spanMs) * 3600e3),
      workerCronFit: { freeTier10ms: parseMs + blockParseMs <= 10, paidTier30s: parseMs + blockParseMs <= 30000 },
    };
  } else {
    // ---- CLUSTER mode (unchanged wire format: index.json) ------------------
    const clusters = idx.clusters.map(({ childrenAt, ...c }) => c);  // childrenAt is internal
    const index = {
      show, pid, mimeType: man.mimeType,
      timecodeScale: idx.timecodeScale,
      headerBytes: idx.headerBytes,               // init segment = chunk0[0, headerBytes)
      clusterCount: clusters.length,
      firstTMs: clusters[0] && clusters[0].tMs,
      lastTMs: clusters.length ? clusters[clusters.length - 1].tMs : null,
      falsePositives: idx.falsePositives,
      stats: { bytes: buf.length, chunks: man.chunks.length, fetchMs, parseMs, msPerMB },
      clusters,
    };
    body = JSON.stringify(index);
    dest = `index.json`;
    report = {
      kind: "indexer", show, pid,
      bytes: buf.length, mb: +mb.toFixed(2), clusters: clusters.length,
      falsePositives: idx.falsePositives, headerBytes: idx.headerBytes,
      spanMs: index.lastTMs - index.firstTMs, manifestDurMs: man.durationMs,
      parseMs, msPerMB, fetchMs, indexBytes: body.length,
      // the Worker-cron verdict inputs: CPU ms for THIS recording, and per-MB
      workerCronFit: { freeTier10ms: parseMs <= 10, paidTier30s: parseMs <= 30000 },
    };
  }
  const r = await fetch(`${BASE}/derived/${show}/${pid}/${dest}`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body,
  });
  if (!r.ok) throw new Error(`${dest} upload failed ` + r.status);

  fs.appendFileSync(results, JSON.stringify({ t: Date.now(), ...report }) + "\n");
  if (blocks) {
    say(`DONE blocks: ${report.blocks} blocks (${report.keyframes} key) from ${mb.toFixed(1)} MB in ` +
        `${report.totalParseMs} ms (${report.msPerMB} ms/MB), index ${report.indexBytes} B ` +
        `(${report.indexBytesPerMediaHour} B/media-hour), bailed=${report.bailedClusters}`);
  } else {
    say(`DONE ${report.clusters} clusters from ${mb.toFixed(1)} MB in ${parseMs} ms ` +
        `(${msPerMB} ms/MB), span ${report.spanMs} ms vs manifest ${man.durationMs} ms, ` +
        `falsePos=${report.falsePositives}`);
  }
  return report;
}
function medianGap(rows) {
  if (rows.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < rows.length; i++) gaps.push(rows[i][0] - rows[i - 1][0]);
  gaps.sort((a, b) => a - b);
  return gaps[gaps.length >> 1];
}

// ---- CLI (run-sync.mjs spawns this) ----------------------------------------
if (process.argv[1] && process.argv[1].endsWith("indexer.mjs")) {
  indexParticipant({
    show: process.env.SHOW, pid: process.env.PID,
    blocks: !!process.env.BLOCKS || process.argv.includes("--blocks"),
    results: process.env.RESULTS || `${ROOT}/results/selfrec-sync.jsonl`,
    local: process.env.LOCAL || null,
  }).then((report) => console.log("REPORT " + JSON.stringify(report)))
    .catch((e) => { console.error(ts(), "idx FATAL:", e.message || e); process.exit(1); });
}
