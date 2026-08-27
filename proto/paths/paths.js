// proto/paths/paths.js — the CONTINUOUS-kind client. demo10's four-paths
// overlay, rebuilt on the timeline library, with a real interpolator.
//
// Two capture lanes, never one mutable array (FIX-1):
//   evidence[]  every pointer sample (coalesced, full rate)  — ground truth
//   stored[]    wall-clock-throttled at ~100 ms               — what the log keeps
// Both append-only. Decimation never touches the evidence buffer.

import { makeLogDeck } from '/timeline/logdeck.mjs';
import { createCursor } from '/timeline/transport.mjs';
import { makePointerAdapter, makeFlattener, deviations } from './pointer-adapter.js';

const STORE_MS = 100;                 // the lineage's stored-lane throttle
const W = 1000, H = 620;

const $ = (id) => document.getElementById(id);
const nowUs = () => Math.round((performance.timeOrigin + performance.now()) * 1000);
const stampUs = (ev) => Math.round((performance.timeOrigin + ev.timeStamp) * 1000); // §2: stamp at the
// SOURCE (the event's own clock), never at handler-invocation time.

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------

const S = {
  evidence: [],        // {at µs, kind, source, x, y, pressure}
  stored: [],          // ditto, wall-clock decimated — a separate array of NEW objects
  header: null,        // {t0Us, durationMs, source} — session properties, never derived (§2)
  lastStoredUs: -Infinity,
  deck: null,
  adapter: null,
  lane: [],            // position-domain payloads, index-aligned with stored[]
  evidencePos: [],     // evidence mapped into the position domain
  flatLinear: null,
  flatSmooth: null,
  curEvidence: null,   // library cursor over the un-logged ground-truth lane
  ask: null,           // the deck's answer to what this client asked for (C6)
  dev: {},
  pos: 0,
  dur: 0,
  live: { linear: null, smooth: null, evidence: null, fire: null },
  capturing: false,
  synthetic: null,     // {t0Us, durationMs} when the path came from the parametric curve
  watchers: [],
  errors: [],
  perFrame: { renderAt: 0, flatten: 0 },
};

const SHOW = { evidence: true, stored: true, linear: true, smooth: true };

const LANES = {
  linear:   { color: '#ff3d8b', width: 6.5, alpha: 0.20, dash: null,   label: 'linear interp' },
  smooth:   { color: '#3fe0ff', width: 2.6, alpha: 0.60, dash: [7, 4], label: 'Catmull-Rom' },
  stored:   { color: '#ffb020', width: 1.0, alpha: 0.35, dash: null,   label: 'stored (100 ms)' },
  evidence: { color: '#ffffff', width: 1.1, alpha: 0.95, dash: null,   label: 'evidence (full rate)' },
};

// ---------------------------------------------------------------------------
// capture — the two lanes
// ---------------------------------------------------------------------------

function pushSample(atUs, x, y, pressure) {
  // lane A: evidence. Append-only, never decimated, never consumed.
  S.evidence.push({ at: atUs, kind: 'pointer', source: 'pointer', x, y, pressure });
  // lane B: stored. FIX-2 — WALL-CLOCK decimation (not `frameCount % n`), and a
  // fresh object, so the two lanes can never alias.
  if (atUs - S.lastStoredUs >= STORE_MS * 1000) {
    S.stored.push({ at: atUs, kind: 'pointer', source: 'pointer', x, y, pressure });
    S.lastStoredUs = atUs;
  }
}

function canvasXY(ev, rect) {
  return {
    x: (ev.clientX - rect.left) * (W / rect.width),
    y: (ev.clientY - rect.top) * (H / rect.height),
  };
}

function beginCapture(ev) {
  S.capturing = true;
  resetCapture();
  S.header = { t0Us: stampUs(ev), durationMs: 0, source: 'pointer' };
  onMove(ev);
}

function onMove(ev) {
  if (!S.capturing) return;
  const rect = $('paths').getBoundingClientRect();
  const list = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
  for (const e of (list.length ? list : [ev])) {
    const { x, y } = canvasXY(e, rect);
    pushSample(stampUs(e), x, y, e.pressure ?? 0.5);
  }
  drawStatic();
}

function endCapture(ev) {
  if (!S.capturing) return;
  S.capturing = false;
  if (S.evidence.length) {
    const last = S.evidence[S.evidence.length - 1];
    // always keep the terminal sample in the stored lane: the last segment must
    // have a right endpoint or the reconstruction stops short of the evidence.
    if (S.stored[S.stored.length - 1] !== last && (!S.stored.length || S.stored[S.stored.length - 1].at < last.at)) {
      S.stored.push({ ...last });
    }
    S.header.durationMs = (last.at - S.header.t0Us) / 1000;
  }
  if (S.stored.length >= 2) build();
}

function resetCapture() {
  S.evidence = []; S.stored = []; S.lastStoredUs = -Infinity;
  S.flatLinear = S.flatSmooth = null; S.dev = {};
  S.live = { linear: null, smooth: null, evidence: null, fire: null };
  if (S.deck) { S.deck.dispose(); S.deck = null; }
}

// ---------------------------------------------------------------------------
// the synthetic path — a parametric curve, so ground truth is known
// ANALYTICALLY and the harness can measure seek accuracy in px.
// ---------------------------------------------------------------------------

const CURVE = { A: 380, B: 240, cx: 480, cy: 300, f1: 1, f2: 2, phase: 0.4 };

/** s ∈ [0,1] along the recording */
export function curveAt(s) {
  const c = CURVE;
  return {
    x: c.cx + c.A * Math.sin(2 * Math.PI * c.f1 * s + c.phase),
    y: c.cy + c.B * Math.sin(2 * Math.PI * c.f2 * s),
  };
}

function synthesize({ durationMs = 6000, hz = 120, jitterMs = 2, seed = 7 } = {}) {
  resetCapture();
  let rnd = seed;
  const rand = () => ((rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const t0Us = nowUs();
  const stepUs = 1e6 / hz;
  const n = Math.floor((durationMs * 1000) / stepUs);
  for (let k = 0; k <= n; k++) {
    // jitter the ARRIVAL time (real pointer streams are not isochronous) —
    // ground truth stays exact because the curve is evaluated at the sample's
    // own timestamp, not at its index.
    const j = k === 0 || k === n ? 0 : (rand() - 0.5) * 2 * jitterMs * 1000;
    const atUs = Math.round(t0Us + k * stepUs + j);
    const s = (atUs - t0Us) / 1000 / durationMs;
    const p = curveAt(s);
    pushSample(atUs, p.x, p.y, 0.5);
  }
  const last = S.evidence[S.evidence.length - 1];
  if (S.stored[S.stored.length - 1].at < last.at) S.stored.push({ ...last });
  S.header = { t0Us, durationMs, source: 'synthetic:lissajous' };
  S.synthetic = { t0Us, durationMs };
  build();
  return { evidence: S.evidence.length, stored: S.stored.length };
}

/** analytic ground truth at a POSITION-domain time */
function analyticAt(posMs) {
  if (!S.synthetic || !S.deck) return null;
  const atUs = S.deck.toAtUs(posMs);
  const s = (atUs - S.synthetic.t0Us) / 1000 / S.synthetic.durationMs;
  return curveAt(Math.min(1, Math.max(0, s)));
}

// ---------------------------------------------------------------------------
// the deck — library as-is, imported, never modified
// ---------------------------------------------------------------------------

function build() {
  if (S.deck) { S.deck.dispose(); S.deck = null; }

  const adapter = makePointerAdapter({
    mode: 'catmull',
    onActuate: (payload) => { S.live.fire = payload; },
  });
  S.adapter = adapter;

  // No `expand` any more: logdeck injects its control fields AFTER the payload
  // spread since v0.4, so a raw row's epoch-µs `at` can no longer clobber the
  // position-domain `at` the library computed. The row goes in as it stands and
  // comes back as {x, y, pressure, at: posMs, atUs: the row's own stamp, i}.
  const deck = makeLogDeck({
    lanes: [{ kind: 'pointer', rows: S.stored, adapter }],
    leadInMs: 250, tailMs: 250,
    onPosition: (pos, dur) => frame(pos, dur),
  });
  S.deck = deck;

  // ASK, and be told (C6). Nothing here is a workaround: if the adapter could
  // not honour the ask, `S.ask.degraded` would say so, in words, on screen.
  S.ask = deck.request('pointer', { continuous: true, interpolate: 'catmull-rom', neighbourhood: 1, seek: true });

  // The lane, read from the library's own per-kind ordered lane — for DRAWING
  // (the stored polyline and its dots) and for segment indexing. Interpolation
  // no longer needs it: that is deck.sampleAt's job.
  S.lane = deck.eventsOf('pointer').map((e) => e.payload);

  S.evidencePos = S.evidence.map((e) => ({ at: deck.toPos(e.at), x: e.x, y: e.y, pressure: e.pressure }));
  // the evidence lane is ground truth and deliberately NOT in the log, so it
  // gets the library's exported cursor rather than a second implementation.
  S.curEvidence = createCursor(S.evidencePos);

  // Flattening asks the DECK for each subdivision point: one call, which
  // brackets, gathers the neighbourhood and interpolates. u = 1 of segment k
  // lands exactly on sample k+1, so segments still join exactly (FIX-4).
  const posOf = (k, u) => S.lane[k].at + (S.lane[k + 1].at - S.lane[k].at) * u;
  S.flatLinear = makeFlattener(S.lane, (k, u) => deck.sampleAt('pointer', posOf(k, u), { mode: 'linear' }));
  S.flatSmooth = makeFlattener(S.lane, (k, u) => deck.sampleAt('pointer', posOf(k, u), { mode: 'catmull' }));
  S.flatLinear.rebuildAll(); S.flatSmooth.rebuildAll();

  S.dev = deviations(S.evidencePos, S.lane, deck);
  S.dur = deck.durationMs;
  S.pos = 0;
  deck.seek(0);
  drawStatic();
  readout();
  return deck;
}

// ---------------------------------------------------------------------------
// drawing — the four-paths overlay
// ---------------------------------------------------------------------------

function strokePoly(ctx, pts, spec) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = spec.color; ctx.globalAlpha = spec.alpha; ctx.lineWidth = spec.width;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (spec.dash) ctx.setLineDash(spec.dash);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

/** Draw one lane into an arbitrary context — the single definition shared by
 *  the overlay and the harness's per-lane ink probe. */
function paintLane(ctx, name, override) {
  const spec = override || LANES[name];
  if (name === 'evidence') return strokePoly(ctx, S.evidencePos, spec);
  if (name === 'linear') return strokePoly(ctx, S.flatLinear ? S.flatLinear.flat() : [], spec);
  if (name === 'smooth') return strokePoly(ctx, S.flatSmooth ? S.flatSmooth.flat() : [], spec);
  if (name === 'stored') {
    strokePoly(ctx, S.lane, spec);
    ctx.save();
    ctx.fillStyle = spec.color; ctx.globalAlpha = 0.95;
    const r = spec.dotR || 2.6;
    for (const p of S.lane) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}

// draw order = fidelity order: the widest/faintest reconstruction goes DOWN
// first so higher-fidelity paths read ON TOP of it (demo10's legibility trick,
// stepped lineWidth/alpha).
const ORDER = ['linear', 'smooth', 'stored', 'evidence'];

function drawStatic() {
  const c = $('paths'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H);
  if (S.capturing) { strokePoly(ctx, S.evidence, LANES.evidence); return; }
  for (const name of ORDER) if (SHOW[name]) paintLane(ctx, name);
}

function drawCursors() {
  const c = $('cursors'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const dot = (p, color, r, ring) => {
    if (!p) return;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.globalAlpha = 0.9; ctx.fill();
    if (ring) { ctx.globalAlpha = 1; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  };
  if (S.live.fire) {
    ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = LANES.stored.color; ctx.lineWidth = 1.5;
    ctx.strokeRect(S.live.fire.x - 5, S.live.fire.y - 5, 10, 10); ctx.restore();
  }
  if (SHOW.linear) dot(S.live.linear, LANES.linear.color, 5);
  if (SHOW.smooth) dot(S.live.smooth, LANES.smooth.color, 4, true);
  if (SHOW.evidence) dot(S.live.evidence, LANES.evidence.color, 2.2);
}

/** The tratteggio inspection window: the same four lanes at 14×, centred on the
 *  playhead. Seamless in performance (the overlay above), distinguishable on
 *  inspection (here) — plan-timeline §5b's principle, made operable. */
const INSET = { z: 14, w: 632, h: 380 };
function drawInset() {
  const c = $('inset');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, INSET.w, INSET.h);
  ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, INSET.w, INSET.h);
  const c0 = S.live.evidence || S.live.smooth;
  if (!c0) return;
  const z = INSET.z;
  ctx.save();
  ctx.setTransform(z, 0, 0, z, INSET.w / 2 - c0.x * z, INSET.h / 2 - c0.y * z);
  for (const name of ORDER) {
    if (!SHOW[name]) continue;
    const spec = LANES[name];
    // widths and dashes stay constant in SCREEN px — the hatch must not zoom
    paintLane(ctx, name, {
      ...spec, width: spec.width / z,
      dash: spec.dash ? spec.dash.map((d) => d / z) : null,
      dotR: 2.6 / z,
    });
  }
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = '#3a4258'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(INSET.w / 2, 0); ctx.lineTo(INSET.w / 2, INSET.h);
  ctx.moveTo(0, INSET.h / 2); ctx.lineTo(INSET.w, INSET.h / 2); ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// the per-frame render. The RENDER CADENCE is the client's — deliberately: the
// library owns no render tick, it owns the position observable and an O(1)
// positional read. So this is `deck.sampleAt()` at whatever rate we paint, and
// the bracketing cursor, the neighbourhood and the interpolator call all live
// behind that one line.
// ---------------------------------------------------------------------------

function frame(pos, dur) {
  S.pos = pos; S.dur = dur;
  const t0 = performance.now();
  if (S.lane.length >= 2) {
    // ONE code path, live and replay: the same deck.sampleAt() that generated
    // the static overlay geometry produces the live cursor (the lineage law).
    S.live.linear = S.deck.sampleAt('pointer', pos, { mode: 'linear' });
    S.live.smooth = S.deck.sampleAt('pointer', pos, { mode: 'catmull' });
  }
  if (S.evidencePos.length >= 2) {
    const e = S.curEvidence.bracket(pos);
    if (e) S.live.evidence = { x: e.a.x + (e.b.x - e.a.x) * e.u, y: e.a.y + (e.b.y - e.a.y) * e.u };
  }
  S.perFrame.renderAt = performance.now() - t0;
  drawCursors();
  drawInset();
  const sc = $('scrub');
  if (sc && document.activeElement !== sc) sc.value = String(dur ? (pos / dur) * 1000 : 0);
  tick();
  for (let i = S.watchers.length - 1; i >= 0; i--) {
    if (S.watchers[i].test(pos)) { S.watchers[i].resolve(pos); S.watchers.splice(i, 1); }
  }
}

// ---------------------------------------------------------------------------
// readouts
// ---------------------------------------------------------------------------

const f2 = (n) => (n === null || n === undefined ? '–' : (+n).toFixed(2));

function tick() {
  const d = S.deck;
  if (!d) return;
  $('pos').textContent = `${(S.pos / 1000).toFixed(3)} s / ${(S.dur / 1000).toFixed(3)} s`;
  $('rate').textContent = `${d.playing() ? d.rate().toFixed(2) : d.targetRate().toFixed(2)}×${d.playing() ? '' : ' (paused)'}`;
  $('fires').textContent = `${S.adapter.fires}`;
  const p = S.live.smooth, e = S.live.evidence;
  $('livepos').textContent = p ? `${p.x.toFixed(1)}, ${p.y.toFixed(1)}` : '–';
  $('liveerr').textContent = (p && e) ? `${Math.hypot(p.x - e.x, p.y - e.y).toFixed(2)} px` : '–';
}

function readout() {
  const rows = [
    ['hold (zero-order)', 'stored', S.dev.hold],
    ['linear', 'linear', S.dev.linear],
    ['Catmull-Rom', 'smooth', S.dev.catmull],
  ];
  $('dev').innerHTML = rows.map(([label, lane, d]) => d
    ? `<tr><td><i style="background:${LANES[lane].color}"></i>${label}</td><td>${f2(d.mean)}</td><td>${f2(d.p95)}</td><td>${f2(d.max)}</td></tr>`
    : '').join('');
  const attested = S.lane.length;
  const drawn = (S.flatSmooth ? S.flatSmooth.flat().length : 0);
  $('counts').innerHTML =
    `<div><b>${S.evidence.length}</b> evidence samples (full rate)</div>` +
    `<div><b>${attested}</b> attested samples in the log (${STORE_MS} ms wall-clock throttle)</div>` +
    `<div><b>${drawn}</b> points drawn on the Catmull-Rom lane → ` +
    `<b>${drawn ? (100 * (drawn - attested) / drawn).toFixed(1) : '0'}%</b> of the rendered path is <i>invented</i></div>` +
    `<div class="dim">header: t0=${S.header ? S.header.t0Us : '–'} µs · duration=${S.header ? S.header.durationMs.toFixed(0) : '–'} ms · ${S.header ? S.header.source : '–'}</div>`;
  $('caps').textContent = JSON.stringify(S.deck ? S.deck.caps('pointer') : {}, null, 1) +
    (S.ask ? `\n\nrequest -> ${S.ask.degraded ? 'DEGRADED' : 'granted in full'}\n` +
      Object.entries(S.ask.per).map(([k, v]) =>
        ` ${k}: ${JSON.stringify(v.chose)}${v.degraded ? `  (wanted ${JSON.stringify(v.wanted)} — ${v.reason})` : ''}`).join('\n') : '');
}

// ---------------------------------------------------------------------------
// transport controls
// ---------------------------------------------------------------------------

function wire() {
  $('play').onclick = () => S.deck && S.deck.play();
  $('pause').onclick = () => S.deck && S.deck.pause();
  $('rewind').onclick = () => S.deck && S.deck.seek(0);
  for (const r of [0.25, 0.5, 1, 2, 4]) {
    const b = document.createElement('button');
    b.textContent = `${r}×`; b.className = 'rate';
    b.onclick = () => { if (!S.deck) return; S.deck.setRate(r); tick(); };
    $('rates').appendChild(b);
  }
  $('scrub').oninput = (e) => { if (S.deck) S.deck.seek((+e.target.value / 1000) * S.dur); };
  $('synth').onclick = () => synthesize();
  $('clear').onclick = () => { resetCapture(); drawStatic(); };
  for (const name of ORDER) {
    const cb = $('t-' + name);
    cb.onchange = () => { SHOW[name] = cb.checked; drawStatic(); drawCursors(); };
  }
  $('evonly').onclick = () => {
    const on = SHOW.linear || SHOW.smooth;
    SHOW.linear = SHOW.smooth = !on;
    for (const n of ['linear', 'smooth']) $('t-' + n).checked = SHOW[n];
    $('evonly').textContent = on ? 'show reconstructions' : 'evidence only';
    drawStatic(); drawCursors();
  };
  const c = $('cursors');
  c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); beginCapture(e); });
  c.addEventListener('pointermove', onMove);
  c.addEventListener('pointerup', endCapture);
  c.addEventListener('pointercancel', endCapture);
  window.addEventListener('error', (e) => S.errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => S.errors.push(String(e.reason)));
}

// ---------------------------------------------------------------------------
// harness API
// ---------------------------------------------------------------------------

function waitPos(test, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const w = { test, resolve };
    S.watchers.push(w);
    setTimeout(() => {
      const i = S.watchers.indexOf(w);
      if (i >= 0) { S.watchers.splice(i, 1); reject(new Error('waitPos timeout')); }
    }, timeoutMs);
  });
}

window.paths = {
  S, LANES, curveAt, analyticAt,
  synthesize,
  state() {
    return {
      evidence: S.evidence.length, stored: S.stored.length, laneItems: S.lane.length,
      deckItems: S.deck ? S.deck.laneCount('pointer') : 0,
      schedTotal: S.deck ? S.deck.stats().total : 0,
      durationMs: S.dur, pos: S.pos, rate: S.deck ? S.deck.rate() : null,
      playing: S.deck ? S.deck.playing() : false,
      fires: S.adapter ? S.adapter.fires : 0,
      reduceCalls: S.adapter ? S.adapter.reduceCalls : 0,
      interpCalls: S.adapter ? S.adapter.interpCalls : 0,
      caps: S.deck ? S.deck.caps('pointer') : null,
      ask: S.ask,
      degradations: S.deck ? S.deck.degradations('pointer') : null,
      cursor: S.deck ? S.deck.cursorStats('pointer') : null,
      dev: S.dev,
      flatSmooth: S.flatSmooth ? S.flatSmooth.flat().length : 0,
      flatLinear: S.flatLinear ? S.flatLinear.flat().length : 0,
      header: S.header,
      errors: S.errors.slice(),
      renderAtMs: S.perFrame.renderAt,
    };
  },
  /** seek to pos, then compare the library's reduce() with analytic truth */
  seekProbe(pos) {
    S.deck.seek(pos);
    const reduced = S.deck.reduceAt('pointer', pos);
    const truth = analyticAt(pos);
    const hold = S.deck.sampleAt('pointer', pos, { mode: 'hold' });
    const lin = S.deck.sampleAt('pointer', pos, { mode: 'linear' });
    const err = (p) => (p && truth ? +Math.hypot(p.x - truth.x, p.y - truth.y).toFixed(3) : null);
    return {
      pos, truth, reduced, method: reduced && reduced.method,
      errReducedPx: err(reduced), errHoldPx: err(hold), errLinearPx: err(lin),
      cursor: S.live.smooth, errCursorPx: err(S.live.smooth),
    };
  },
  async traverse(fromPos, toPos, rate) {
    S.deck.seek(fromPos);
    S.deck.setRate(rate);
    const t0 = performance.now();
    S.deck.play();
    const endPos = await waitPos((p) => p >= toPos);
    const wallMs = performance.now() - t0;
    S.deck.pause();
    return {
      wallMs: +wallMs.toFixed(2), rate, spanMs: toPos - fromPos, endPos: +endPos.toFixed(2),
      observedRate: +((endPos - fromPos) / wallMs).toFixed(4),
    };
  },
  async pauseHolds(waitMs = 400) {
    S.deck.seek(0); S.deck.setRate(1); S.deck.play();
    await waitPos((p) => p > 300);
    S.deck.pause();
    const a = S.deck.position();
    await new Promise((r) => setTimeout(r, waitMs));
    const b = S.deck.position();
    return { before: a, after: b, driftMs: +(b - a).toFixed(4), rate: S.deck.rate() };
  },
  /** per-lane ink: render each lane ALONE offscreen and count painted pixels —
   *  proof that all four lanes actually put marks on the canvas. */
  laneInk() {
    const out = {};
    for (const name of ORDER) {
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const ctx = off.getContext('2d');
      paintLane(ctx, name);
      const d = ctx.getImageData(0, 0, W, H).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
      out[name] = n;
    }
    return out;
  },
  setMode(m) { S.adapter.mode = m; },
  show(name, on) { SHOW[name] = on; $('t-' + name).checked = on; drawStatic(); drawCursors(); },
};

wire();
drawStatic();
