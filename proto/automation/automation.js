// proto/automation/automation.js — slider-video.vue, completed.
//
// The 2025 experiment (the demo repo's FINAL commit) was an automation lane
// bound to a media clip by `clipId`. It died at exactly one missing mapping:
// absolute epoch ms -> a foreign media element's normalized position -> pixels.
// The slider knew where it was on screen; the video knew where it was inside
// itself; there was no position domain in between and no way to convert. The
// repo's `onProgress(progress, currentTime)` channel — which had supplied half
// of it in gen-1 — had been deleted as "noise" two generations earlier.
//
// Both halves exist in the library now:
//   * makeLogDeck's toPos/toAtUs  — epoch µs <-> position ms
//   * transport.sync(pos)         — re-anchor the vector onto an EXTERNAL clock
//                                   master without seek semantics
// so the media element can be the clock master while it plays, the transport
// can be master while you scrub, and the automation lane is just another deck
// lane whose x-axis is the position domain both of them already speak.

import { makeLogDeck } from '/timeline/logdeck.mjs';
import * as CC from './cc-core.js';
import { $, nowUs, makeStrip, transportBar, deviation, makeWavBlob, logLine } from './ui.js';

const params = new URLSearchParams(location.search);
const MEDIA_URL = params.get('media');
const CH = 0;
const LEAD_IN = 500;          // position 0 sits 500 ms BEFORE the clip starts, so
                              // the mapping is a real offset and not an identity
const SYNC_TOL = 8;           // ignore corrections under this (don't churn lookahead)
const SEEK_THRESHOLD = 250;   // above this it is a JUMP: seek (re-assert), not sync

const COLORS = { [CC.keyOf(CC.ST_CC | CH, 74)]: '#79b8ff', [CC.keyOf(CC.ST_CC | CH, 7)]: '#7fd18a', [CC.keyOf(CC.ST_CC | CH, 71)]: '#e0b862' };

let media, mediaDurMs = 0, clipStartUs = 0, ac, voice, deck = null, tbar = null;
let series = new Map(), rawByKey = new Map();
let presentClip = null, lockUntil = 0, master = '—';
let replayCount = 0, assertCount = 0, seekCorrections = 0;
const drift = { raw: [], est: [], corrections: [], seeks: 0 };
const logEl = $('#log');

// ---------------------------------------------------------------------------
// THE THREE MAPPINGS. Named, in one place, because their absence is the whole
// reason the 2025 experiment is a corpse.
// ---------------------------------------------------------------------------
const posToMedia = (pos) => (pos - LEAD_IN) / 1000;              // position ms -> media seconds
const mediaToPos = (ct) => LEAD_IN + ct * 1000;                  // media seconds -> position ms
let posToPx = (pos) => pos;                                       // position ms -> lane pixels (set by the strip)
const epochToPos = (atUs) => (atUs - clipStartUs) / 1000 + LEAD_IN;
const posToEpoch = (pos) => Math.round((pos - LEAD_IN) * 1000 + clipStartUs);

// ---------------------------------------------------------------------------
// media element: prepare() = await canplay (own-prior-art §3 — the demo's video
// never synced because it hard-coded a 100 ms load race instead)
// ---------------------------------------------------------------------------
async function prepare() {
  const isVideo = !!MEDIA_URL && /\.(webm|mp4|mov)$/i.test(MEDIA_URL);
  media = document.createElement(isVideo ? 'video' : 'audio');
  media.src = MEDIA_URL || URL.createObjectURL(makeWavBlob({ seconds: 20 }));
  media.preload = 'auto'; media.controls = true; media.playsInline = true;
  media.style.width = isVideo ? '220px' : '100%';
  $('#mediaBox').appendChild(media);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('media canplay timeout')), 15000);
    media.addEventListener('canplay', () => { clearTimeout(t); res(); }, { once: true });
    media.addEventListener('error', () => { clearTimeout(t); rej(new Error('media load failed')); }, { once: true });
    media.load();
  });
  mediaDurMs = (Number.isFinite(media.duration) ? media.duration : 20) * 1000;
  $('#mPill').textContent = `${isVideo ? 'video' : 'audio'} · ${(mediaDurMs / 1000).toFixed(2)}s`;
  $('#mPill').className = 'pill on';
}

/** an edge-extrapolated read of the media clock. HTMLMediaElement.currentTime
 *  only advances at its own granularity, so a raw sample-by-sample comparison
 *  measures that granularity and calls it drift. Track the edges and
 *  extrapolate between them (proto/instrument's ct->epoch map, in miniature). */
const mclock = (() => {
  let lastCt = -1, lastWall = 0;
  return () => {
    const ct = media.currentTime, w = performance.now();
    if (ct !== lastCt) { lastCt = ct; lastWall = w; }
    const r = media.paused ? 0 : media.playbackRate;
    return { ct, est: lastCt + ((w - lastWall) / 1000) * r, sinceEdgeMs: w - lastWall };
  };
})();

// ---------------------------------------------------------------------------
// capture — same gate as the XY pad
// ---------------------------------------------------------------------------
const capture = CC.makeCcCapture({ throttleMs: 100, ch: CH, keyframeMs: 500 });

// ---------------------------------------------------------------------------
// adapters
// ---------------------------------------------------------------------------
function send(raw, meta = {}) { voice.send(raw, meta); }

function resolveAt(key, posMs) {
  const s = series.get(key);
  if (!s || s.pts.length < 2 || !CC.isInterpolableKey(key)) return null;   // switches are STEP series
  return CC.valueAt(s, posMs);
}

const ccAdapter = CC.makeCcAdapter({
  channels: [CH], resolveAt,
  send: (raw, info) => { if (info && info.reassert) assertCount++; else replayCount++; send(raw, info); },
});

/** the media-span lane. Its actuator OWNS the element: start/stop, currentTime
 *  on seek, playbackRate on rate. `clockMaster` in caps is the honest label —
 *  this lane's actuator is also the transport's clock source while it plays. */
const mediaAdapter = {
  caps: {
    kind: 'media', domain: 'wall', unit: 'ms',
    catchUp: 'reduce', seekable: true, reducible: true, assertOnSeek: true,
    span: true, clockMaster: true, prepare: true,
    syncToleranceMs: SYNC_TOL, seekThresholdMs: SEEK_THRESHOLD,
    rates: [0.5, 1, 2],
  },
  // NOTE the signature: the library hands actuate() (payload, driftRecord, when)
  // — the drift record carries the item's `at`, NOT a `pos` field (that only
  // exists on the reduce/assert `info`). Read the playhead from the transport.
  actuate(p, rec) {
    if (p.edge === 'start') { presentClip = p; writeMedia(deck.position()); if (deck.playing()) media.play().catch(() => {}); }
    else { presentClip = null; media.pause(); }
    logLine(logEl, `media ${p.edge} clip=${p.clipId} @${(p.atMs ?? 0).toFixed(0)}ms`);
  },
  reduce(payloads) {
    const present = new Map();
    for (const p of payloads) { if (p.edge === 'start') present.set(p.clipId, p); else present.delete(p.clipId); }
    return present;
  },
  assertState(present, info) {
    presentClip = [...present.values()][0] || null;
    if (!presentClip) { media.pause(); return; }
    writeMedia(info.pos);
    if (deck && deck.playing()) media.play().catch(() => {});
  },
};

/** transport -> media. The only place currentTime is written, and it takes the
 *  master lock so the sync loop does not immediately correct back. */
function writeMedia(pos) {
  const ct = Math.max(0, Math.min(mediaDurMs / 1000 - 0.001, posToMedia(pos)));
  if (Math.abs(media.currentTime - ct) > 0.02) { media.currentTime = ct; seekCorrections++; }
  lockUntil = performance.now() + 220;   // let the element settle before it re-masters
  master = 'transport';
}

// ---------------------------------------------------------------------------
// deck
// ---------------------------------------------------------------------------
const CLIP_ID = 'clip-a';
function buildDeck() {
  const pos = deck ? deck.position() : 0;
  const wasPlaying = deck ? deck.playing() : false;
  const rate = deck ? deck.targetRate() : 1;
  if (deck) deck.dispose();
  deck = makeLogDeck({
    originUs: clipStartUs, leadInMs: LEAD_IN,
    range: [0, LEAD_IN + mediaDurMs],
    lanes: [
      {
        kind: 'media', rows: [{ at: clipStartUs, clipId: CLIP_ID, durMs: mediaDurMs, src: media.currentSrc }],
        adapter: mediaAdapter,
        // a media-span row is a START/END PAIR on the timeline (logdeck's
        // `expand`, the shape proto/selfrec/replay-grid.html schedules tiles with)
        expand: (row, i, toPos) => [
          { atUs: row.at, id: `${row.clipId}-in`, payload: { ...row, edge: 'start', atMs: toPos(row.at) } },
          { atUs: row.at + row.durMs * 1000, id: `${row.clipId}-out`, payload: { ...row, edge: 'end', atMs: toPos(row.at + row.durMs * 1000) } },
        ],
      },
      {
        kind: 'cc', rows: capture.rows, adapter: ccAdapter,
        expand: (row, i, toPos) => [{ atUs: row.at, payload: { ...row, atMs: toPos(row.at) } }],
      },
    ],
    onPosition: (p) => paint(p),
  });
  deck.transport.onState((st) => {
    if (deck.playing()) { media.playbackRate = Math.max(0.0625, Math.min(16, deck.rate())); media.play().catch(() => {}); }
    else media.pause();
    if (st.reason === 'seek') { drift.seeks++; }
  });
  reindex();
  tbar = transportBar($('#tbar'), deck, { onSeek: (p) => { writeMedia(p); paint(p); } });
  $('#m1').textContent = `(pos − ${LEAD_IN}) / 1000`;
  $('#m2').textContent = `${LEAD_IN} + ct × 1000`;
  $('#m4').textContent = `(atUs − ${clipStartUs}) / 1000 + ${LEAD_IN}`;
  if (wasPlaying) { deck.seek(pos); deck.play(rate); } else { deck.setRate(rate); deck.seek(pos); }
  return deck;
}

function reindex() {
  // rows may arrive out of time order (a second pencil stroke left of the
  // first); the series index and the fold both assume time order.
  series = CC.seriesFromRows([...capture.rows].sort((a, b) => a.at - b.at), epochToPos);
  rawByKey = new Map();
  for (const r of [...capture.rawLane].sort((a, b) => a.tUs - b.tUs)) {
    let a = rawByKey.get(r.key); if (!a) rawByKey.set(r.key, a = []);
    a.push({ t: epochToPos(r.tUs), v: r.v });
  }
}

// ---------------------------------------------------------------------------
// THE SYNC LOOP — media is clock master while it plays. This is the half of the
// missing mapping that transport.sync() supplies: re-anchor {p0,t0} onto the
// element's observed position with NO seek semantics (nothing re-fires, no
// re-assert), so a 6 ms media wobble does not re-trigger the automation lane.
// A JUMP (user hit the element's own scrubber) is different in kind: that is a
// seek, and the controller map has to be re-asserted.
// ---------------------------------------------------------------------------
function syncTick() {
  requestAnimationFrame(syncTick);
  if (!deck || !media) return;
  const m = mclock();
  if (deck.playing() && !media.paused && performance.now() > lockUntil) {
    const mpos = mediaToPos(m.est);
    const d = deck.position() - mpos;                 // + = transport ahead of media
    drift.raw.push(deck.position() - mediaToPos(m.ct));
    drift.est.push(d);
    if (drift.raw.length > 4000) { drift.raw.shift(); drift.est.shift(); }
    if (Math.abs(d) > SEEK_THRESHOLD) { deck.seek(mpos); drift.corrections.push(d); }
    else { const c = deck.sync(mpos, { toleranceMs: SYNC_TOL }); if (c) drift.corrections.push(c); }
    master = 'media';
  } else if (!deck.playing()) master = 'transport';
  $('#masterPill').textContent = 'master: ' + master;
}

// ---------------------------------------------------------------------------
// the lane: draw the curve, x = position
// ---------------------------------------------------------------------------
const lane = makeStrip($('#lane'), { height: 190 });
const ruler = $('#ruler');
let tool = 'pencil', ctl = 74, drawing = false, lastDraw = null;

$('#pencil').onclick = () => { tool = 'pencil'; $('#pencil').classList.add('on'); $('#write').classList.remove('on'); };
$('#write').onclick = () => { tool = 'write'; $('#write').classList.add('on'); $('#pencil').classList.remove('on'); };
$('#ctlSel').onchange = (e) => { ctl = +e.target.value; };
$('#clear').onclick = () => { capture.reset(); buildDeck(); paint(); };

function laneXY(ev) {
  const r = $('#lane').getBoundingClientRect();
  const px = Math.max(0, Math.min(r.width, ev.clientX - r.left));
  const py = Math.max(0, Math.min(r.height, ev.clientY - r.top));
  return { pos: lane.tOf(px), v7: Math.round((1 - py / r.height) * 127) };
}
function drawAt(ev) {
  const { pos, v7 } = laneXY(ev);
  // PENCIL: x is the position. WRITE: the playhead is the position, the pointer
  // only supplies the value — the live automation-write pass.
  const p = tool === 'write' ? deck.position() : pos;
  if (lastDraw !== null && tool === 'pencil' && p <= lastDraw) return;  // monotonic pencil
  lastDraw = p;
  const rows = capture.cc7(ctl, v7, posToEpoch(p));
  for (const row of rows) deck.schedule({ at: epochToPos(row.at), kind: 'cc', id: `cc-live-${row.seq}`, payload: { ...row, atMs: epochToPos(row.at) } });
  reindex(); paint();
}
$('#lane').addEventListener('pointerdown', (e) => { drawing = true; lastDraw = null; $('#lane').setPointerCapture(e.pointerId); drawAt(e); });
$('#lane').addEventListener('pointermove', (e) => { if (drawing) drawAt(e); });
$('#lane').addEventListener('pointerup', () => {
  drawing = false;
  const rows = capture.flush(posToEpoch(deck.position()));
  for (const row of rows) deck.schedule({ at: epochToPos(row.at), kind: 'cc', id: `cc-live-${row.seq}`, payload: { ...row, atMs: epochToPos(row.at) } });
  reindex();
  // SEAM S4: the library's overdub law fires an event scheduled BEHIND the
  // playhead immediately — right for a note (you hear what you just played),
  // wrong for a level (a curve authored in the past must not move the current
  // value). Re-assert at the playhead to undo it.
  deck.assertAt(deck.position(), 'cc');
  paint();
});

function drawRuler(pos) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = ruler.clientWidth;
  if (ruler.width !== Math.round(w * dpr)) { ruler.width = Math.round(w * dpr); ruler.height = Math.round(26 * dpr); ruler.style.height = '26px'; }
  const g = ruler.getContext('2d');
  g.fillStyle = '#0a0c0e'; g.fillRect(0, 0, ruler.width, ruler.height);
  const [lo, hi] = deck ? deck.range : [0, 1000];
  const x = (t) => ((t - lo) / (hi - lo)) * ruler.width;
  // the media SPAN — the clip as a bar in the position domain
  g.fillStyle = '#1e2f3a'; g.fillRect(x(LEAD_IN), 4 * dpr, x(LEAD_IN + mediaDurMs) - x(LEAD_IN), 8 * dpr);
  g.fillStyle = '#7d8791'; g.font = `${10 * dpr}px ui-monospace,monospace`;
  const step = hi - lo > 12000 ? 2000 : 1000;
  for (let t = 0; t <= hi; t += step) { g.fillRect(x(t), 14 * dpr, dpr, 6 * dpr); g.fillText((t / 1000).toFixed(0) + 's', x(t) + 3 * dpr, 25 * dpr); }
  if (pos !== undefined) { g.fillStyle = '#e2726e'; g.fillRect(x(pos) - dpr, 0, 2 * dpr, ruler.height); }
  // the media element's OWN position, drawn separately — if these two ever
  // separate on screen, that is the drift number made visible
  if (media) { g.fillStyle = '#e0b862'; g.fillRect(x(mediaToPos(media.currentTime)) - dpr, 16 * dpr, 2 * dpr, 10 * dpr); }
}

let lastSlow = 0;
function paint(pos = deck ? deck.position() : 0) {
  if (!deck) return;
  lane.range = deck.range;
  posToPx = (p) => lane.xOf(p) / (window.devicePixelRatio || 1);
  lane.draw({ series, raw: rawByKey, playhead: pos, wall: media ? mediaToPos(media.currentTime) : null, colors: COLORS });
  drawRuler(pos);
  tbar && tbar.paint(pos);
  const key = CC.keyOf(CC.ST_CC | CH, ctl);
  const v = resolveAt(key, pos);
  $('#valPill').textContent = `CC${ctl} = ${v === null ? '—' : Math.round(v / 128)}`;
  const t = performance.now();
  if (t - lastSlow < 100) return;
  lastSlow = t;
  $('#m3').textContent = `(pos − ${deck.range[0]}) × ${(($('#lane').clientWidth || 1) / (deck.range[1] - deck.range[0])).toFixed(4)} px/ms`;
  const map = deck.reduceAt('cc', pos);
  if (map) {
    $('#map').innerHTML = [...map.values()].map((e) => `<tr><td class="k">${e.label}</td><td class="v">${e.value14}</td></tr>`).join('') || '<tr><td class="dim">— draw a curve —</td></tr>';
    $('#digPill').textContent = 'digest ' + CC.ccDigest(map).toString(16);
  }
  const st = driftStats();
  $('#drift').innerHTML = `
    <tr><td class="k">samples</td><td class="v">${st.n}</td></tr>
    <tr><td class="k">|drift| max</td><td class="v">${st.maxEst} ms</td></tr>
    <tr><td class="k">|drift| p95</td><td class="v">${st.p95Est} ms</td></tr>
    <tr><td class="k">raw max</td><td class="v">${st.maxRaw} ms</td></tr>
    <tr><td class="k">corrections</td><td class="v">${drift.corrections.length}</td></tr>
    <tr><td class="k">seeks</td><td class="v">${drift.seeks}</td></tr>`;
}

function driftStats() {
  const abs = (a) => a.map(Math.abs).sort((x, y) => x - y);
  const e = abs(drift.est), r = abs(drift.raw);
  const q = (a, f) => (a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * f))].toFixed(2) : 0);
  return { n: e.length, maxEst: q(e, 0.999), p95Est: q(e, 0.95), maxRaw: q(r, 0.999), p95Raw: q(r, 0.95),
           corrections: drift.corrections.length, maxCorrection: +(Math.max(0, ...drift.corrections.map(Math.abs))).toFixed(2), seeks: drift.seeks };
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------
const booted = (async () => {
  await prepare();
  ac = new (window.AudioContext || window.webkitAudioContext)();
  voice = CC.makeCcVoice(ac, { drone: false, gainScale: 1.0 });
  ac.createMediaElementSource(media).connect(voice.node);
  voice.send([CC.ST_CC | CH, 7, 127]);
  clipStartUs = Math.round(nowUs());
  buildDeck();
  syncTick();
  paint();
  return true;
})();
booted.catch((e) => { $('#mPill').textContent = 'media error: ' + e.message; $('#mPill').className = 'pill rec'; });

addEventListener('resize', () => paint());

// ---------------------------------------------------------------------------
// AUTO — headless handle
// ---------------------------------------------------------------------------
const CURVE = (pos) => Math.round(63.5 + 63 * Math.sin((2 * Math.PI * (pos - LEAD_IN)) / 3000));

window.AUTO = {
  async ready() { await booted; if (ac.state !== 'running') await ac.resume().catch(() => {}); return { mediaDurMs, clipStartUs, leadIn: LEAD_IN }; },
  mappings: () => ({ leadInMs: LEAD_IN, clipStartUs, mediaDurMs, posToMedia: posToMedia(1500), mediaToPos: mediaToPos(1), epochToPos: epochToPos(clipStartUs) }),

  /** draw a deterministic curve across the whole clip, through the SAME capture
   *  gate the pointer uses. */
  synthCurve({ stepMs = 5 } = {}) {
    capture.reset();
    for (let pos = LEAD_IN; pos <= LEAD_IN + mediaDurMs; pos += stepMs) capture.cc7(74, CURVE(pos), posToEpoch(pos));
    capture.flush(posToEpoch(LEAD_IN + mediaDurMs));
    buildDeck();
    return { rows: capture.rows.length, raw: capture.rawLane.length, range: deck.range };
  },
  expected: (pos) => CURVE(pos),

  play: (r) => deck.play(r), pause: () => deck.pause(),
  seek: (p) => { const q = deck.seek(p); writeMedia(q); return q; },
  setRate: (r) => { deck.setRate(r); if (media) media.playbackRate = r; },
  position: () => deck.position(), playing: () => deck.playing(),
  mediaTime: () => ({ ct: media.currentTime, pos: mediaToPos(media.currentTime), paused: media.paused, rate: media.playbackRate }),
  range: () => deck.range,
  counts: () => ({ replay: replayCount, assert: assertCount, rows: capture.rows.length, raw: capture.rawLane.length, mediaSeeks: seekCorrections }),
  drift: () => driftStats(),
  resetDrift() { drift.raw.length = 0; drift.est.length = 0; drift.corrections.length = 0; drift.seeks = 0; },
  valueAt: (p) => { const v = resolveAt(CC.keyOf(CC.ST_CC | CH, 74), p); return v === null ? null : v / 128; },
  reduceAt: (p) => { const m = deck.reduceAt('cc', p); return m ? [...m.values()].map((e) => ({ key: e.key, value14: e.value14, value7: e.value7 })) : null; },
  voiceState: () => ({ ...voice.state }),
  mediaPresent: () => (deck.reduceAt('media', deck.position()) || new Map()).size,
  caps: () => deck.caps(),
  deviation: () => deviation(series, rawByKey),
  stats: () => deck.stats(),
};
