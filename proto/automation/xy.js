// proto/automation/xy.js — the XY pad demo: pointer position -> two CCs -> a
// WebAudio voice. The bridge between the pointer work and MIDI CC: identical
// continuous machinery (throttled capture, per-series interpolation, a reducer
// keyed by series identity), a different actuator at the end of it.

import { makeLogDeck } from '/timeline/logdeck.mjs';
import * as CC from './cc-core.js';
import { $, nowUs, makeStrip, transportBar, deviation, logLine } from './ui.js';

const CH = 0;
const K = {
  cut: CC.keyOf(CC.ST_CC | CH, 74), res: CC.keyOf(CC.ST_CC | CH, 71),
  mod: CC.keyOf(CC.ST_CC | CH, 1), bend: CC.keyOf(CC.ST_PB | CH, 0),
  sus: CC.keyOf(CC.ST_CC | CH, 64),
};
const COLORS = { [K.cut]: '#79b8ff', [K.res]: '#7fd18a', [K.mod]: '#e0b862', [K.bend]: '#c58ae0', [K.sus]: '#e2726e' };

// ---------------------------------------------------------------------------
// actuator: synthetic voice by default, Web MIDI output when one is bound
// ---------------------------------------------------------------------------
const ac = new (window.AudioContext || window.webkitAudioContext)();
const voice = CC.makeCcVoice(ac);
voice.send([CC.ST_CC | CH, 7, 100]);      // audible drone
let midiOut = null;
let sendCount = 0, replayCount = 0, assertCount = 0;

function send(raw, meta = {}) {
  sendCount++;
  if (midiOut) { try { midiOut.send(raw); } catch { /* port vanished — see NOTES rebind */ } }
  voice.send(raw, meta);
}

// ---------------------------------------------------------------------------
// capture — the throttled log + the full-rate evidence lane
// ---------------------------------------------------------------------------
let recording = false;
const capture = CC.makeCcCapture({
  throttleMs: 100, ch: CH, keyframeMs: 500,
  onRow: (row) => { if (rowsLog.childElementCount < 400) logLine(rowsLog, `${(row.at / 1000).toFixed(0)} ${row.label} = ${row.d2} [${row.gate}]`); },
});
const rowsLog = $('#log');

/** live monitor is FULL RATE and local (0 ms self-latency, the jam rule); the
 *  throttle decides only what enters the LOG. */
function cc7(n, v7) { for (const r of CC.enc7(CH, n, v7)) send(r, { live: true }); if (recording) capture.cc7(n, v7, nowUs()); }
function cc14(n, v14) { for (const r of CC.enc14(CH, n, v14)) send(r, { live: true }); if (recording) capture.cc14(n, v14, nowUs()); }
function pb(v14) { for (const r of CC.encPB(CH, v14)) send(r, { live: true }); if (recording) capture.pb(v14, nowUs()); }

// ---------------------------------------------------------------------------
// the pad
// ---------------------------------------------------------------------------
const pad = $('#pad');
const padStrip = { x: 0.5, y: 0.5 };
function drawPad() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = pad.clientWidth, h = Math.round(Math.min(280, w / 1.9));
  if (pad.width !== Math.round(w * dpr)) { pad.width = Math.round(w * dpr); pad.height = Math.round(h * dpr); pad.style.height = h + 'px'; }
  const g = pad.getContext('2d');
  g.fillStyle = '#0a0c0e'; g.fillRect(0, 0, pad.width, pad.height);
  g.strokeStyle = '#1b2026'; g.lineWidth = dpr;
  for (let i = 1; i < 8; i++) {
    g.beginPath(); g.moveTo((i / 8) * pad.width, 0); g.lineTo((i / 8) * pad.width, pad.height); g.stroke();
    g.beginPath(); g.moveTo(0, (i / 8) * pad.height); g.lineTo(pad.width, (i / 8) * pad.height); g.stroke();
  }
  // live console position, read back from the VOICE (control-is-the-display)
  const x = (voice.state[74] / 127) * pad.width;
  const y = (1 - voice.state[71] / 127) * pad.height;
  g.strokeStyle = '#79b8ff55'; g.lineWidth = dpr;
  g.beginPath(); g.moveTo(x, 0); g.lineTo(x, pad.height); g.stroke();
  g.strokeStyle = '#7fd18a55';
  g.beginPath(); g.moveTo(0, y); g.lineTo(pad.width, y); g.stroke();
  g.fillStyle = recording ? '#e2726e' : '#d7dde3';
  g.beginPath(); g.arc(x, y, 6 * dpr, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7d8791'; g.font = `${11 * dpr}px ui-monospace,monospace`;
  g.fillText(`CC74 ${voice.state[74]}   CC71 ${voice.state[71]}`, 8 * dpr, 16 * dpr);
}

let padDown = false;
function padPos(ev) {
  const r = pad.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)) };
}
function padMove(ev) {
  const p = padPos(ev); padStrip.x = p.x; padStrip.y = p.y;
  cc7(74, Math.round(p.x * 127));
  cc7(71, Math.round((1 - p.y) * 127));
  drawPad();
}
pad.addEventListener('pointerdown', (e) => { padDown = true; pad.setPointerCapture(e.pointerId); padMove(e); });
pad.addEventListener('pointermove', (e) => { if (padDown) padMove(e); });
pad.addEventListener('pointerup', () => { padDown = false; if (recording) capture.flush(nowUs()); });
addEventListener('resize', drawPad);

$('#fine').oninput = (e) => { $('#fineV').textContent = e.target.value; cc14(1, +e.target.value); };
$('#fine').onchange = () => recording && capture.flush(nowUs());
$('#bend').oninput = (e) => { $('#bendV').textContent = e.target.value; pb(+e.target.value); };
$('#bend').onchange = () => { pb(8192); $('#bend').value = 8192; $('#bendV').textContent = '8192'; recording && capture.flush(nowUs()); };
let sus = false;
$('#sus').onclick = () => { sus = !sus; cc7(64, sus ? 127 : 0); $('#sus').textContent = `sustain CC64: ${sus ? 'on' : 'off'}`; $('#sus').classList.toggle('on', sus); };

// ---------------------------------------------------------------------------
// record / build / replay
// ---------------------------------------------------------------------------
$('#rec').onclick = () => { capture.reset(); recording = true; rowsLog.textContent = ''; ui(); };
$('#stop').onclick = () => { recording = false; capture.flush(nowUs()); build(); ui(); };
$('#clear').onclick = () => { recording = false; capture.reset(); if (deck) { deck.dispose(); deck = null; } rowsLog.textContent = ''; ui(); };
$('#midiBtn').onclick = async () => {
  try {
    const acc = await navigator.requestMIDIAccess({ sysex: false });
    const outs = [...acc.outputs.values()];
    midiOut = outs[0] || null;
    $('#outPill').textContent = midiOut ? `MIDI out: ${midiOut.name}` : 'no MIDI outputs';
    // own-prior-art §3: output targets vanish — rebind, never assume
    acc.onstatechange = () => { const o = [...acc.outputs.values()]; midiOut = o.find((p) => p.id === (midiOut && midiOut.id)) || o[0] || null; $('#outPill').textContent = midiOut ? `MIDI out: ${midiOut.name}` : 'synthetic voice (port vanished)'; };
  } catch (e) { $('#outPill').textContent = 'Web MIDI denied — synthetic voice'; }
};

let deck = null, series = new Map(), rawByKey = new Map(), tbar = null;
const strip = makeStrip($('#strip'), { height: 150 });

/** the client-side series index that lets assertState refine the fold onto the
 *  interpolated line at the seek position (seam S2). */
function resolveAt(key, posMs) {
  const s = series.get(key);
  if (!s || s.pts.length < 2) return null;
  if (!CC.isInterpolableKey(key)) return null;   // switches are STEP series — the fold is already right
  return CC.valueAt(s, posMs);
}

// what assertState actually PUT ON THE WIRE at the last seek — the end-to-end
// truth, finer than the voice's own console (the voice ignores CC LSBs).
let assertRows = [];
const adapter = CC.makeCcAdapter({
  channels: [CH],
  resolveAt,
  send: (raw, info) => {
    if (info && info.reassert) {
      assertCount++;
      if (info.reset) assertRows = [];
      else assertRows.push({ at: 0, status: raw[0], d1: raw[1], d2: raw[2] });
    } else replayCount++;
    send(raw, info);
  },
  onAssert: (map, info) => logLine(rowsLog, `assert @${info.pos.toFixed(0)}ms — ${map.size} controllers (${info.reason})`, 're'),
});

function build() {
  if (deck) deck.dispose();
  replayCount = 0; assertCount = 0;
  const rows = capture.rows;
  if (!rows.length) { deck = null; return null; }
  deck = makeLogDeck({
    lanes: [{
      kind: 'cc', rows, adapter,
      // NOTE the explicit atMs: makeLogDeck builds payload as {i, at, ...row}
      // and the row's own epoch-µs `at` SHADOWS the item's position-ms `at`
      // (seam S3). Carry the position under its own name rather than trust it.
      expand: (row, i, toPos) => [{ atUs: row.at, payload: { ...row, atMs: toPos(row.at) } }],
    }],
    leadInMs: 250, tailMs: 400,
    onPosition: (pos) => paint(pos),
  });
  series = CC.seriesFromRows(rows, deck.toPos);
  rawByKey = new Map();
  for (const r of capture.rawLane) {
    let a = rawByKey.get(r.key); if (!a) rawByKey.set(r.key, a = []);
    a.push({ t: deck.toPos(r.tUs), v: r.v });
  }
  strip.range = deck.range;
  tbar = transportBar($('#tbar'), deck, { onSeek: () => paint() });
  ui(); paint();
  return deck;
}

let wallAnchor = null, lastMapPaint = 0;
function paint(pos = deck ? deck.position() : 0) {
  if (!deck) return;
  if (deck.playing() && wallAnchor === null) wallAnchor = { p: pos, t: performance.now() };
  const wall = wallAnchor ? Math.min(deck.range[1], wallAnchor.p + (performance.now() - wallAnchor.t)) : null;
  strip.draw({ series, raw: rawByKey, playhead: pos, wall, colors: COLORS });
  tbar && tbar.paint(pos);
  drawPad();
  // the fold is O(prefix); a 60 Hz table is pointless — 10 Hz (own-prior-art:
  // the HUD is throttled, the transport is not)
  const nowT = performance.now();
  if (nowT - lastMapPaint < 100) return;
  lastMapPaint = nowT;
  const map = deck.reduceAt('cc', pos);
  if (map) {
    $('#map').innerHTML = '<thead><tr><td>controller</td><td class="v">fold</td><td class="d">interp</td><td class="d">bits</td></tr></thead>'
      + [...map.values()].sort((a, b) => (a.key > b.key ? 1 : -1)).map((e) => {
        const live = resolveAt(e.key, pos);
        return `<tr><td class="k">${e.label}</td><td class="v">${e.value14}</td><td class="d">${live === null ? 'step' : Math.round(live)}</td><td class="d">${e.bits}</td></tr>`;
      }).join('');
    $('#digPill').textContent = 'digest ' + CC.ccDigest(map).toString(16);
  }
}

function ui() {
  $('#rec').disabled = recording; $('#stop').disabled = !recording;
  $('#recPill').textContent = recording ? 'RECORDING' : 'idle';
  $('#recPill').className = 'pill ' + (recording ? 'rec' : '');
  $('#nPill').textContent = `${capture.rows.length} rows`;
  $('#rawPill').textContent = `${capture.rawLane.length} raw`;
  $('#kfPill').textContent = `${capture.keyframes.length} keyframes`;
  $('#thr').textContent = '100';
  if (series.size) {
    const dev = deviation(series, rawByKey);
    $('#dev').innerHTML = '<thead><tr><td>controller</td><td class="v">mean</td><td class="d">p95</td><td class="d">max</td></tr></thead>'
      + Object.entries(dev).map(([k, d]) =>
        `<tr><td class="k">${(series.get(k) || {}).label || k}</td><td class="v">${d.meanLsb}</td><td class="d">${d.p95Lsb}</td><td class="d">${d.maxLsb}</td></tr>`).join('');
  }
}
drawPad(); ui();

// ---------------------------------------------------------------------------
// AUTO — the headless harness's handle. Synthesises a deterministic gesture so
// the run needs no pointer and the "analytically correct" value at any position
// is a closed form the harness can evaluate independently.
// ---------------------------------------------------------------------------

const CURVES = {
  74: (ms) => Math.round(63.5 + 63 * Math.sin((2 * Math.PI * ms) / 2500)),                 // XY x
  71: (ms) => Math.round(63.5 + 63 * Math.sin((2 * Math.PI * ms) / 1700 + 1)),             // XY y
  1: (ms) => Math.round(8191.5 + 8191 * Math.sin((2 * Math.PI * ms) / 3300)),              // 14-bit sweep
  pb: (ms) => Math.round(8191.5 + 8191 * Math.sin((2 * Math.PI * ms) / 4100 + 0.6)),       // pitch bend
};

window.AUTO = {
  CURVES: { note: 'evaluated in ms since gesture start' },
  async ready() { if (ac.state !== 'running') await ac.resume().catch(() => {}); return true; },

  /** feed the SAME capture gate a full-rate synthetic gesture. */
  synth({ durMs = 8000, stepMs = 5, t0Us = null } = {}) {
    capture.reset();
    const base = t0Us === null ? Math.round(nowUs()) : t0Us;
    for (let ms = 0; ms <= durMs; ms += stepMs) {
      const t = base + ms * 1000;
      capture.cc7(74, CURVES[74](ms), t);
      capture.cc7(71, CURVES[71](ms), t);
      capture.cc14(1, CURVES[1](ms), t);
      capture.pb(CURVES.pb(ms), t);
      if (ms === 1500 || ms === 4500) capture.cc7(64, 127, t);
      if (ms === 3000 || ms === 6000) capture.cc7(64, 0, t);
    }
    capture.flush(base + durMs * 1000);
    return { base, durMs, rows: capture.rows.length, raw: capture.rawLane.length, keyframes: capture.keyframes.length };
  },

  build() { const d = build(); return d ? { items: d.items.length, range: d.range, durationMs: d.durationMs, leadInMs: d.leadInMs, originUs: d.originUs } : null; },
  rows: () => capture.rows.map((r) => ({ at: r.at, status: r.status, d1: r.d1, d2: r.d2, gate: r.gate, key: r.key })),
  toPos: (atUs) => deck.toPos(atUs),
  play: (r) => deck.play(r), pause: () => deck.pause(),
  seek: (p) => deck.seek(p), setRate: (r) => deck.setRate(r),
  position: () => deck.position(), playing: () => deck.playing(), rate: () => deck.rate(),
  range: () => deck.range,
  counts: () => ({ replay: replayCount, assert: assertCount, send: sendCount, rows: capture.rows.length, raw: capture.rawLane.length, keyframes: capture.keyframes.length }),
  stats: () => deck.stats(),
  caps: () => deck.caps('cc'),
  /** the VOICE's console — the end-to-end truth after a seek. */
  voiceState: () => ({ ...voice.state }),
  reduceAt: (p) => { const m = deck.reduceAt('cc', p); return m ? [...m.values()].map((e) => ({ key: e.key, label: e.label, bits: e.bits, value14: e.value14, value7: e.value7 })) : null; },
  resolveAt: (key, p) => resolveAt(key, p),
  /** the controller map assertState last WROTE TO THE WIRE, folded back. */
  assertedMap: () => [...CC.foldRows(assertRows).values()].map((e) => ({ key: e.key, bits: e.bits, value14: e.value14 })),
  digestAt: (p) => CC.ccDigest(deck.reduceAt('cc', p)),
  deviation: () => deviation(series, rawByKey),
  /** round-trip a value through frame bytes and back, in the BROWSER (node does
   *  the exhaustive pass; this proves the same code path the page ships). */
  rt14(controller, v14) {
    const raws = CC.enc14(CH, controller, v14);
    const rows = raws.map((r) => CC.frameToRow(CC.decodeFrame(CC.encodeFrame({ status: r[0], d1: r[1], d2: r[2], tUs: 0 }))));
    const m = CC.foldRows(rows);
    return m.get(CC.keyOf(CC.ST_CC | CH, controller)).value14;
  },
  rtPB(v14) {
    const raw = CC.encPB(CH, v14)[0];
    const f = CC.decodeFrame(CC.encodeFrame({ status: raw[0], d1: raw[1], d2: raw[2], tUs: 0 }));
    return f.value14;
  },
};
