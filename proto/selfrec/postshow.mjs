#!/usr/bin/env node
// ============================================================================
// POST-SHOW RUNNER — "who does the repackage?" answered as automation. This is
// the engine.mjs seed: Session B calls this verbatim when a show's media-span
// ends. Given a show id it:
//   (a) lists the show's participants from R2 (chunk prefixes via the worker's
//       /list) UNIONed with the room cuelog's media-span events (a participant
//       whose chunks never landed still shows up as degraded-absent);
//   (b) for each participant missing a derived HLS rendition, runs the
//       repackager (h264 -> -c copy remux, else transcode -bf 0) — imported
//       from repackage.mjs, not shelled;
//   (c) derived HLS lands via the worker's POST /derived (inside repackage);
//       the cluster index (replay-grid anchor source + the no-ffmpeg replay
//       path) is built the same way when missing (indexer.mjs module);
//   (d) writes the SHOW MANIFEST selfrec/<show>/show.json via POST /show:
//       participants[] with {pid, T0, skewEst, dur, chunkCount, degraded,
//       hls, masters, manifest, index} — the single replay entrypoint.
//
// IDEMPOTENT: a re-run detects existing derived/hls/index.m3u8 + index.json
// in the /list snapshot and skips that work (show.json is always rewritten —
// it is cheap and derived purely from stored state). FORCE=1 redoes
// everything (same keys — overwrite, no R2 growth).
//
// Usage: SHOW=<show> [ROOM=<room>] [FORCE=1] node postshow.mjs
//   ROOM defaults to "selfrec"+SHOW (the run-sync convention:
//   show sync-X <-> room selfrecsync-X). Cuelog being unreachable is not
//   fatal — skewEst/marker fields go null and show.json says so.
// Emits REPORT json (last stdout line) + appends to results jsonl.
// ============================================================================
import fs from "fs";
import { repackageParticipant } from "./repackage.mjs";
import { indexParticipant } from "./indexer.mjs";

const ROOT = "/Users/s32863/personal/elektron";
const HERE = `${ROOT}/proto/selfrec`;
const BASE = "https://elektron-selfrec.kristjan-jansen.workers.dev";
const PUB = "https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev";
const RTC = "https://elektron-rtc.kristjan-jansen.workers.dev";
const SHOW = process.env.SHOW;
const ROOM = process.env.ROOM || (SHOW ? `selfrec${SHOW}` : null);
const FORCE = !!process.env.FORCE;
const RESULTS = process.env.RESULTS || `${ROOT}/results/selfrec-sync.jsonl`;

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "pshow|", ...a); }

export async function postshow({ show, room, force = false, forcePids = [], results = RESULTS } = {}) {
  if (!show) throw new Error("show required");
  const TOKEN = fs.readFileSync(`${HERE}/.env.selfrec`, "utf8").trim().split("=")[1];
  const envLine = (k) => {
    const l = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find((x) => x.startsWith(k + "="));
    return l ? l.slice(k.length + 1).trim() : "";
  };
  const tAll = Date.now();
  const timing = {};

  // ---- (a) list the show ---------------------------------------------------
  let t = Date.now();
  const lr = await fetch(`${BASE}/list/${show}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!lr.ok) throw new Error(`/list/${show}: ${lr.status}`);
  const list = await lr.json();
  timing.listMs = Date.now() - t;
  const have = {};   // pid -> {chunks, hasManifest, hasHls, hlsFiles, hasIndex}
  for (const o of list.objects) {
    const m = o.key.match(new RegExp(`^selfrec/${show}/([\\w.-]+)/(.+)$`));
    if (!m) continue;
    const [, pid, rest] = m;
    const h = have[pid] || (have[pid] = { chunks: 0, bytes: 0, hasManifest: false, hasHls: false, hlsFiles: 0, hasIndex: false });
    if (/^chunk-\d+\.webm$/.test(rest)) { h.chunks++; h.bytes += o.size; }
    else if (rest === "manifest.json") h.hasManifest = true;
    else if (rest === "derived/hls/index.m3u8") { h.hasHls = true; h.hlsFiles++; }
    else if (rest.startsWith("derived/hls/")) h.hlsFiles++;
    else if (rest === "derived/index.json") h.hasIndex = true;
  }

  // ---- cuelog: media-span events (skew + marker truth; may be gone) --------
  t = Date.now();
  const spans = {};   // pid -> {at, skewEst, rttMin, mimeType, endAt, dur, chunkCount, degraded}
  let cuelogOk = false, cueCount = null;
  try {
    const roomToken = envLine("ROOM_TOKEN");
    const cr = await fetch(`${RTC}/room/${room}/cuelog?token=${encodeURIComponent(roomToken)}`);
    if (cr.ok) {
      const log = await cr.json();
      cueCount = log.count;
      const seen = new Set();
      for (const e of log.cues) {
        if (!e.cue || seen.has(e.cue.id)) continue;
        seen.add(e.cue.id);
        const d = e.cue.data;
        if (!d || d.kind !== "media-span") continue;
        const s = spans[d.source] || (spans[d.source] = {});
        if (d.phase === "start") Object.assign(s, { at: d.at, skewEst: d.skewEst, rttMin: d.rttMin, mimeType: d.mimeType });
        else if (d.phase === "end") Object.assign(s, { endAt: e.cue.at, dur: d.dur, chunkCount: d.chunkCount, degraded: d.degraded });
      }
      cuelogOk = true;
    }
  } catch {}
  timing.cuelogMs = Date.now() - t;
  const pids = [...new Set([...Object.keys(have), ...Object.keys(spans)])].sort();
  if (!pids.length) throw new Error(`show ${show}: no participants in R2 or cuelog`);
  say(`${show}: participants [${pids.join(", ")}] — R2 ${list.count} objects, cuelog ${cuelogOk ? cueCount + " entries" : "UNREACHABLE"}`);

  // ---- (b)+(c) per-participant derive work ---------------------------------
  const participants = [], work = [];
  for (const pid of pids) {
    const h = have[pid] || { chunks: 0, bytes: 0, hasManifest: false, hasHls: false, hlsFiles: 0, hasIndex: false };
    const s = spans[pid] || {};
    const row = { pid, actions: {} };
    let man = null;
    if (h.hasManifest) man = await (await fetch(`${PUB}/selfrec/${show}/${pid}/manifest.json`)).json();

    if (!h.chunks || !man) {
      // cuelog knows this participant but R2 has no playable masters —
      // record the absence, derive nothing.
      row.actions.hls = row.actions.index = "no-masters";
      participants.push({
        pid, T0: s.at ?? null, skewEst: s.skewEst ?? null, rttMin: s.rttMin ?? null,
        dur: s.dur ?? null, chunkCount: h.chunks, degraded: true, noMasters: true,
        mimeType: s.mimeType ?? null, masters: `selfrec/${show}/${pid}/`,
        manifest: null, hls: null, index: null, bytesTotal: h.bytes,
      });
      work.push(row);
      continue;
    }

    const pidForced = force || forcePids.includes(pid);
    if (pidForced || !h.hasHls) {
      t = Date.now();
      const rep = await repackageParticipant({ show, pid, results });
      row.actions.hls = pidForced && h.hasHls ? "forced" : "repackaged";
      row.repackage = { mode: rep.mode, ffmpegMs: rep.ffmpegMs, downloadMs: rep.downloadMs,
                        uploadMs: rep.uploadMs, totalMs: rep.totalMs, files: rep.files, outBytes: rep.outBytes };
      row.hlsMs = Date.now() - t;
    } else { row.actions.hls = "skipped"; row.hlsMs = 0; }

    if (pidForced || !h.hasIndex) {
      t = Date.now();
      const idx = await indexParticipant({ show, pid, results });
      row.actions.index = pidForced && h.hasIndex ? "forced" : "indexed";
      row.index = { clusters: idx.clusters, parseMs: idx.parseMs, msPerMB: idx.msPerMB, indexBytes: idx.indexBytes };
      row.indexMs = Date.now() - t;
    } else { row.actions.index = "skipped"; row.indexMs = 0; }

    participants.push({
      pid,
      // the A5 anchor: recorder.start() stamp; synthesized manifests (dead
      // tab, never finalized) have none — cuelog span start is the fallback
      T0: man.T0recStartDate ?? s.at ?? null,
      skewEst: s.skewEst ?? null, rttMin: s.rttMin ?? null,
      t0MatchesMarker: s.at != null && man.T0recStartDate != null ? s.at === man.T0recStartDate : null,
      dur: man.durationMs, chunkCount: man.chunkCount,
      degraded: !!man.degraded, mimeType: man.mimeType, timesliceMs: man.timesliceMs,
      ...(man.finalized === false ? { finalized: false } : {}),
      ...(man.synthesized ? { synthesized: true } : {}),
      ...(man.durationEstimated ? { durationEstimated: true } : {}),
      ...(man.lateSeqs && man.lateSeqs.length ? { lateSeqs: man.lateSeqs } : {}),
      masters: `selfrec/${show}/${pid}/`,
      manifest: `selfrec/${show}/${pid}/manifest.json`,
      hls: `selfrec/${show}/${pid}/derived/hls/index.m3u8`,
      index: `selfrec/${show}/${pid}/derived/index.json`,
      bytesTotal: man.bytesTotal,
    });
    work.push(row);
  }

  // ---- (d) show manifest ---------------------------------------------------
  t = Date.now();
  const showJson = {
    show, room: cuelogOk ? room : (room || null), cuelogOk,
    generatedAt: new Date().toISOString(), generator: "postshow.mjs",
    participants,
  };
  const sr = await fetch(`${BASE}/show/${show}`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(showJson),
  });
  if (!sr.ok) throw new Error("show.json upload failed " + sr.status);
  const back = await fetch(`${PUB}/selfrec/${show}/show.json`);
  if (!back.ok) throw new Error("show.json not readable on pub URL");
  timing.showJsonMs = Date.now() - t;
  timing.totalMs = Date.now() - tAll;

  const report = {
    kind: "postshow", show, room, force,
    participants: participants.map((p) => p.pid),
    work, timing,
    showJsonKey: `selfrec/${show}/show.json`,
    allSkipped: work.every((w) => w.actions.hls === "skipped" && w.actions.index === "skipped"),
  };
  fs.appendFileSync(results, JSON.stringify({ t: Date.now(), ...report }) + "\n");
  say(`DONE ${show}: ${participants.length} participants, total ${timing.totalMs} ms ` +
      `(${work.map((w) => `${w.pid}:${w.actions.hls}/${w.actions.index}`).join(" ")})`);
  return report;
}

// ============================================================================
// RECONCILE MODE — "the studio doesn't always run; chunks keep arriving late;
// how does it know what to resume?" Answer: R2 is the only truth; reconcile
// sweeps ALL of selfrec/ and computes desired-vs-actual per participant.
//
// DECISION TABLE (state -> action), masters = chunk-*.webm + manifest.json
// (derived/* and show.json are OUR writes and never reset the settle clock):
//   tombstone (deleted.marker) + only marker      -> noop (tombstoned)
//   tombstone + ANY other objects                 -> re-delete prefix
//                                                    (resurrection-blocked);
//                                                    NEVER derive
//   any pid's newest master younger than SETTLE   -> whole show deferred
//                                                    ("settling" — elastic
//                                                    buffers may still drain)
//   settled, chunks, NO manifest (dead tab)       -> synthesize manifest
//                                                    (degraded, finalized:
//                                                    false, dur estimated),
//                                                    then derive
//   settled, manifest missing listed chunks       -> extend manifest (late
//                                                    arrivals appended,
//                                                    lateSeqs, degraded),
//                                                    then RE-derive (stale)
//   settled, show.json row != listing             -> re-derive that pid +
//                                                    rewrite show.json
//                                                    (conservative: derived
//                                                    vintage is unknowable)
//   settled, derived or show.json missing         -> plain postshow derive
//   settled, everything matches                   -> noop
// Masters are truth; every derived artifact is reproducible from them.
// ============================================================================
export async function reconcile({ settleMinutes = 10, results = RESULTS } = {}) {
  const TOKEN = fs.readFileSync(`${HERE}/.env.selfrec`, "utf8").trim().split("=")[1];
  const tAll = Date.now();
  const actions = [];   // real work rows; skips/noops tracked separately
  const skips = [];
  const act = (show, pid, action, detail) => {
    actions.push({ show, pid, action, detail });
    say(`  ACT ${show}${pid ? "/" + pid : ""}: ${action} ${detail || ""}`);
  };
  const skip = (show, pid, why, detail) => {
    skips.push({ show, pid, why, detail });
    say(`  --- ${show}${pid ? "/" + pid : ""}: ${why} ${detail || ""}`);
  };

  // ---- one global listing --------------------------------------------------
  let t = Date.now();
  const lr = await fetch(`${BASE}/list`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!lr.ok) throw new Error("/list: " + lr.status);
  const list = await lr.json();
  const listMs = Date.now() - t;
  const shows = {};   // show -> {tombstone, hasShowJson, objects, pids: {pid: {chunks:[], hasManifest, manifestUploaded, hasHls, hasIndex, newestMasterT}}}
  for (const o of list.objects) {
    const seg = o.key.split("/");        // ["selfrec", show, ...]
    const show = seg[1];
    const sh = shows[show] || (shows[show] = { tombstone: false, hasShowJson: false, objects: 0, pids: {} });
    sh.objects++;
    if (seg.length === 3 && seg[2] === "deleted.marker") { sh.tombstone = true; continue; }
    if (seg.length === 3 && seg[2] === "show.json") { sh.hasShowJson = true; continue; }
    if (seg.length < 4) continue;
    const pid = seg[2], rest = seg.slice(3).join("/");
    const P = sh.pids[pid] || (sh.pids[pid] = { chunks: [], hasManifest: false, hasHls: false, hasIndex: false, newestMasterT: 0 });
    const up = Date.parse(o.uploaded);
    const m = rest.match(/^chunk-(\d+)\.webm$/);
    if (m) { P.chunks.push({ seq: parseInt(m[1], 10), key: o.key, bytes: o.size }); P.newestMasterT = Math.max(P.newestMasterT, up); }
    else if (rest === "manifest.json") { P.hasManifest = true; P.newestMasterT = Math.max(P.newestMasterT, up); }
    else if (rest === "derived/hls/index.m3u8") P.hasHls = true;
    else if (rest === "derived/index.json") P.hasIndex = true;
  }
  say(`reconcile: ${list.count} objects, ${Object.keys(shows).length} shows, settle gate ${settleMinutes} min`);

  // ---- per-show state machine ----------------------------------------------
  const now = Date.now();
  for (const [show, sh] of Object.entries(shows).sort()) {
    // tombstone respect — checked BEFORE anything else, never derive
    if (sh.tombstone) {
      const others = sh.objects - 1;
      if (others > 0) {
        const dr = await fetch(`${BASE}/delete/${show}`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` } });
        act(show, null, "resurrection-blocked", `${others} post-tombstone objects re-deleted (${dr.status})`);
      } else skip(show, null, "tombstoned");
      continue;
    }
    // quiescence gate — masters only; ANY settling pid defers the whole show
    // (publishing a show.json that omits a still-draining participant would
    // be wrong-but-plausible state; ten minutes later is free)
    const settling = Object.entries(sh.pids).filter(([, P]) =>
      P.newestMasterT && now - P.newestMasterT < settleMinutes * 60000);
    if (settling.length) {
      for (const [pid, P] of settling)
        skip(show, pid, "settling", `newest master ${Math.round((now - P.newestMasterT) / 1000)}s old < ${settleMinutes}min`);
      continue;
    }

    // manifest repair pass (rules 2+3) — masters are truth
    const repairs = [];
    for (const [pid, P] of Object.entries(sh.pids).sort()) {
      if (!P.chunks.length) { skip(show, pid, "no-masters", "derived-only prefix"); continue; }
      P.chunks.sort((a, b) => a.seq - b.seq);
      const listedBytes = P.chunks.reduce((s, c) => s + c.bytes, 0);
      P.listedBytes = listedBytes;
      let man = null;
      if (P.hasManifest) {
        const mr = await fetch(`${PUB}/selfrec/${show}/${pid}/manifest.json?cb=${Date.now()}`);
        if (mr.ok) man = await mr.json();
      }
      if (!man) {
        // ABANDONED: tab died before finalize. Synthesize from the listing so
        // the material enters show.json instead of being invisible.
        const mime = await sniffMime(P.chunks[0].key);
        const maxSeq = P.chunks[P.chunks.length - 1].seq;
        const seqs = new Set(P.chunks.map((c) => c.seq));
        const missing = [];
        for (let s = 0; s <= maxSeq; s++) if (!seqs.has(s)) missing.push(s);
        const synth = {
          show, participant: pid, mimeType: mime, timesliceMs: 2000,
          durationMs: P.chunks.length * 2000, durationEstimated: true,
          chunkCount: P.chunks.length, bytesTotal: listedBytes,
          degraded: true, finalized: false, synthesized: true, missing,
          synthesizedAt: Date.now(),
          chunks: P.chunks.map((c) => ({ seq: c.seq, key: c.key, bytes: c.bytes, closeT: null })),
        };
        await putManifest(show, pid, synth, TOKEN);
        act(show, pid, "synthesize-manifest", `${P.chunks.length} chunks, ${missing.length} seq gaps, mime=${mime}`);
        repairs.push(pid);
      } else {
        const manSeqs = new Set((man.chunks || []).map((c) => c.seq));
        const late = P.chunks.filter((c) => !manSeqs.has(c.seq));
        if (late.length) {
          // LATE ARRIVALS after finalize: append, flag, re-derive.
          man.chunks = [...man.chunks, ...late.map((c) => ({ seq: c.seq, key: c.key, bytes: c.bytes, closeT: null, late: true }))]
            .sort((a, b) => a.seq - b.seq);
          man.chunkCount = man.chunks.length;
          man.bytesTotal = man.chunks.reduce((s, c) => s + c.bytes, 0);
          man.degraded = true;
          man.lateSeqs = [...(man.lateSeqs || []), ...late.map((c) => c.seq)];
          man.extendedAt = Date.now();
          await putManifest(show, pid, man, TOKEN);
          act(show, pid, "extend-manifest", `+${late.length} late chunks (seq ${late.map((c) => c.seq).join(",")})`);
          repairs.push(pid);
        }
      }
    }

    // show.json currency + derive decision
    let showJson = null;
    if (sh.hasShowJson) {
      const sr = await fetch(`${PUB}/selfrec/${show}/show.json?cb=${Date.now()}`);
      if (sr.ok) showJson = await sr.json();
    }
    const forcePids = [...repairs];
    let needs = repairs.length > 0 || !showJson;
    for (const [pid, P] of Object.entries(sh.pids)) {
      if (!P.chunks.length) continue;
      if (!P.hasHls || !P.hasIndex) { needs = true; continue; }         // plain derive, no force
      const row = showJson && showJson.participants.find((p) => p.pid === pid);
      if (!row || row.chunkCount !== P.chunks.length || row.bytesTotal !== P.listedBytes) {
        // show.json disagrees with the listing and no repair explains it —
        // derived vintage is unknowable, so re-derive conservatively.
        needs = true;
        if (!forcePids.includes(pid)) { forcePids.push(pid); act(show, pid, "stale-derived", "show.json row != listing"); }
      }
    }
    if (!needs) { skip(show, null, "noop", "listing == manifests == derived == show.json"); continue; }
    const rep = await postshow({ show, room: `selfrec${show}`, forcePids, results });
    for (const w of rep.work) {
      if (w.actions.hls !== "skipped" || w.actions.index !== "skipped")
        act(show, w.pid, "derive", `hls=${w.actions.hls} index=${w.actions.index}` +
          (w.repackage ? ` (${w.repackage.mode}, ffmpeg ${w.repackage.ffmpegMs} ms)` : ""));
    }
    act(show, null, "refresh-show-json", `${rep.participants.length} participants`);
  }

  const report = {
    kind: "reconcile", settleMinutes,
    sweep: { objects: list.count, shows: Object.keys(shows).length, listMs, wallMs: Date.now() - tAll },
    actionCount: actions.length, actions, skips,
  };
  fs.appendFileSync(results, JSON.stringify({ t: Date.now(), ...report }) + "\n");
  say(`RECONCILE DONE: ${actions.length} actions, ${skips.length} skips/noops, ` +
      `${list.count} objects listed in ${listMs} ms, total ${report.sweep.wallMs} ms`);
  return report;
}
async function putManifest(show, pid, man, TOKEN) {
  const r = await fetch(`${BASE}/finalize/${show}/${pid}`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(man),
  });
  if (!r.ok) throw new Error(`finalize ${show}/${pid}: ${r.status}`);
}
async function sniffMime(chunk0Key) {
  // codec id lives in the Tracks element of the header (chunk 0, first 4 KB)
  const r = await fetch(`${PUB}/${chunk0Key}`, { headers: { Range: "bytes=0-4095" } });
  const head = Buffer.from(await r.arrayBuffer()).toString("latin1");
  if (head.includes("V_MPEG4/ISO/AVC")) return "video/webm;codecs=h264";
  if (head.includes("V_VP9")) return "video/webm;codecs=vp9";
  if (head.includes("V_AV1")) return "video/webm;codecs=av1";
  if (head.includes("V_VP8")) return "video/webm;codecs=vp8";
  return "video/webm";
}

// ---- CLI --------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith("postshow.mjs")) {
  const main = process.argv.includes("--reconcile")
    ? reconcile({ settleMinutes: process.env.SETTLE_MIN != null ? parseFloat(process.env.SETTLE_MIN) : 10, results: RESULTS })
    : postshow({ show: SHOW, room: ROOM, force: FORCE, results: RESULTS });
  main.then((r) => console.log("REPORT " + JSON.stringify(r)))
    .catch((e) => { console.error(ts(), "pshow FATAL:", e.message || e); process.exit(1); });
}
