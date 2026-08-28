// proto/paths/paths.js — the CONTINUOUS-kind client. demo10's four-paths
// overlay, rebuilt on the timeline library, with a real interpolator.
//
// Two capture lanes, never one mutable array (FIX-1):
//   evidence[]  every pointer sample (coalesced, full rate)  — ground truth
//   stored[]    wall-clock-throttled at ~100 ms               — what the log keeps
// Both append-only. Decimation never touches the evidence buffer.

import { makeLogDeck } from '/timeline/logdeck.mjs';
import { createCursor } from '/timeline/transport.mjs';
// THE STRIP IS A COMPONENT NOW. Four things this file used to own outright —
// the tier->hatch table, the provenance->style derivation, the dashed-polyline
// stroker and the per-lane offscreen ink probe — are imported, not written; and
// the time axis below the stage (which this client never had: it had a
// featureless <input type=range>) is one createStrip() call.
import { createStrip, strokePoly, hatchFor, styleFor, laneInk } from '/timeline/strip.mjs';
import { makePointerAdapter, pxBudgetPlan, deviations } from './pointer-adapter.js';

const STORE_MS = 100;                 // the lineage's stored-lane throttle
const W = 1000, H = 620;
const KIND = 'pointer';

// plan-timeline §5b, the evidence firewall. The two policies this client moves
// between; there is no third state and no implicit one — the library refuses to
// answer a restoring query without one (EVIDENCE_POLICY_REQUIRED).
const RESTORED_1 = { restored: { maxTier: 1 } };
const ATTESTED = 'attested';

// The two tier-1 reconstructors this client registers. Same seam, same plan,
// different interpolator — which is the whole of §5b's "one mechanism".
const RECON = [
  { name: 'linear', lane: 'linear', method: 'linear', mode: 'linear', tier: 1 },
  { name: 'catmull', lane: 'smooth', method: 'catmull-rom', mode: 'catmull', tier: 1 },
];
// TRATTEGGIO BY TIER: hatching is not hand-assigned per lane any more — it is a
// function of the row's own declared tier, so a tier-2 lane would arrive hatched
// differently without one line of styling being written for it. The table used
// to live here; it is `hatchFor()` in the component, shared with every strip.
const BY_METHOD = {
  linear: { color: '#ff3d8b', width: 6.5, alpha: 0.20, label: 'linear interp' },
  'catmull-rom': { color: '#3fe0ff', width: 2.6, alpha: 0.60, label: 'Catmull-Rom' },
};

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
  recon: {},           // name -> the library's reconstructor handle (v0.5 §5b)
  rows: {},            // name -> the polyline the FIREWALL currently serves
  policy: RESTORED_1,  // the evidence policy every query resolves to
  curEvidence: null,   // library cursor over the un-logged ground-truth lane
  ask: null,           // the deck's answer to what this client asked for (C6)
  dev: {},
  pos: 0,
  dur: 0,
  live: { linear: null, smooth: null, evidence: null, fire: null },
  strip: null,         // the component. Built with the deck, disposed with it.
  capturing: false,
  synthetic: null,     // {t0Us, durationMs} when the path came from the parametric curve
  watchers: [],
  errors: [],
  perFrame: { renderAt: 0, flatten: 0 },
};

const SHOW = { evidence: true, stored: true, linear: true, smooth: true };

// stored/evidence are ATTESTED (tier 0, solid, never hatched); the two
// reconstruction entries are FILLED IN AT BUILD from the library's own
// provenance rollup — see specFor().
const LANES = {
  linear:   { ...BY_METHOD.linear, dash: null },
  smooth:   { ...BY_METHOD['catmull-rom'], dash: hatchFor(1) },
  stored:   { color: '#ffb020', width: 1.0, alpha: 0.35, dash: null,   label: 'stored (100 ms)' },
  evidence: { color: '#ffffff', width: 1.1, alpha: 0.95, dash: null,   label: 'evidence (full rate)' },
};

/** The lane's look, derived from the LIBRARY's provenance rather than a table
 *  keyed by a name this client chose: colour/width from `method`, hatch from
 *  `tier`. That derivation is `styleFor()` in the component now — this client
 *  supplies only the one thing that is its business, the per-METHOD palette. */
function specFor(kind) {
  const p = S.deck.provenanceOf(kind) || { tier: 0, method: null };
  const base = BY_METHOD[p.method] || BY_METHOD.linear;
  return styleFor(S.deck, kind, { ...base, label: `${base.label} · tier ${p.tier}` });
}

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
  S.recon = {}; S.rows = {}; S.dev = {};
  S.live = { linear: null, smooth: null, evidence: null, fire: null };
  if (S.strip) { S.strip.dispose(); S.strip = null; }
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
  if (S.strip) { S.strip.dispose(); S.strip = null; }   // never let a strip outlive its deck
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
    lanes: [{ kind: KIND, rows: S.stored, adapter }],
    leadInMs: 250, tailMs: 250,
    onPosition: (pos, dur) => frame(pos, dur),
    // §5b, THE FORCED CHOICE. The library will not answer a restoring query
    // without a policy; this is where this client makes its one explicit
    // declaration, and every omitting call below resolves to it.
    evidence: S.policy,
  });
  S.deck = deck;

  // ASK, and be told (C6). Nothing here is a workaround: if the adapter could
  // not honour the ask, `S.ask.degraded` would say so, in words, on screen.
  S.ask = deck.request(KIND, { continuous: true, interpolate: 'catmull-rom', neighbourhood: 1, seek: true,
                               evidence: RESTORED_1 });

  // The lane, read from the library's own per-kind ordered lane — for DRAWING
  // (the stored polyline and its dots) and for segment indexing. Interpolation
  // no longer needs it: that is deck.sampleAt's job.
  S.lane = deck.eventsOf(KIND).map((e) => e.payload);

  S.evidencePos = S.evidence.map((e) => ({ at: deck.toPos(e.at), x: e.x, y: e.y, pressure: e.pressure }));
  // the evidence lane is ground truth and deliberately NOT in the log, so it
  // gets the library's exported cursor rather than a second implementation.
  S.curEvidence = createCursor(S.evidencePos);

  // §5b's reconstructor-as-adapter, twice. Each READS the attested lane and
  // APPENDS its own derived lane carrying {source, method, confidence, tier,
  // refs}; the master trace is never touched, and dropping a lane deletes that
  // restoration entirely. This client supplies only the two things that are its
  // business — WHERE to invent (a pixel budget) and WHICH interpolator — and the
  // library does the appending, the stamping and the accounting.
  for (const r of RECON) {
    S.recon[r.lane] = deck.registerReconstructor(r.name, {
      from: KIND, tier: r.tier, method: r.method,
      plan: pxBudgetPlan,
      derive: (pos) => deck.sampleAt(KIND, pos, { mode: r.mode, evidence: RESTORED_1 }),
    });
    S.recon[r.lane].run();
    LANES[r.lane] = specFor(S.recon[r.lane].into);
  }
  rebuildRows();
  buildStrip();

  S.dev = deviations(S.evidencePos, S.lane, deck);
  S.dur = deck.durationMs;
  S.pos = 0;
  deck.seek(0);
  drawStatic();
  readout();
  return deck;
}

// ---------------------------------------------------------------------------
// THE TIME STRIP — timeline/strip.mjs, four lanes, all four of them QUERIES.
//
// This client never had a time axis. It had an <input type=range> with 1001
// steps, which is the fourth incompatible answer to the same question in this
// repo. What arrives with the component is what none of the five hand-rolled
// strips had: a real {originTime, pxPerSecond, scrollX} window, tick LOD (zoom
// far enough in and the 100 ms attestation grid separates into individual
// ticks with millisecond labels), a wall-clock line beside the playhead, and
// drag-to-seek that is the display.
//
// The evidence-only toggle needs no wiring here at all: three of the four lanes
// name deck kinds, so under `attested` the DECK refuses to serve the two
// derived ones and they paint nothing. That is the same firewall the x/y
// overlay obeys, in a second projection, with no second implementation.
// ---------------------------------------------------------------------------
function buildStrip() {
  const c = $('strip');
  if (!c) return;
  if (S.strip) S.strip.dispose();
  const cont = (name, kind) => ({
    id: name, kind, label: LANES[name].label, height: 46, as: 'continuous',
    value: (p) => p.x, min: 0, max: W, dots: false,
    color: LANES[name].color, width: LANES[name].width * 0.5, alpha: LANES[name].alpha + 0.25,
  });
  S.strip = createStrip(c, S.deck, {
    gutter: 116, hud: $('striphud'), evidence: S.policy,
    // the strip must not re-declare the deck's policy — this client owns that
    // choice and setPolicy() below is where it is made
    deckPolicy: false,
    lanes: [
      cont('linear', S.recon.linear && S.recon.linear.into),
      cont('smooth', S.recon.smooth && S.recon.smooth.into),
      { id: 'stored', kind: KIND, label: LANES.stored.label, height: 26, as: 'ticks',
        color: LANES.stored.color, alpha: 0.8, width: 1.2 },
      // THE ONE LANE THAT IS NOT A QUERY, and the component makes it say so: the
      // evidence buffer is deliberately NOT in the log (that is this client's
      // whole point), so it cannot be asked for. It takes the declared `render`
      // escape hatch and reuses the component's own stroker.
      { id: 'evidence', label: LANES.evidence.label, height: 46, render: (ctx, L, C) => {
          const y = (v) => L.y + L.height - 3 - (v / W) * (L.height - 6);
          const pts = [];
          for (const p of S.evidencePos) { if (p.at < C.t0 || p.at > C.t1) continue; pts.push({ x: C.x(p.at), y: y(p.x) }); }
          strokePoly(ctx, pts, { ...LANES.evidence, width: 1 });
        } },
    ],
    onHover: (h) => { const el = $('striphover'); if (el) el.textContent = h && h.text ? h.text.replace(/\n/g, ' · ') : ''; },
    onFollowChange: (on, disengaged) => { const b = $('follow'); if (b) b.textContent = `follow: ${on ? (disengaged ? 'disengaged' : 'on') : 'off'}`; },
  });
}

/** THE EVIDENCE-ONLY TOGGLE IS A LIBRARY QUERY. Every reconstruction polyline is
 *  `window([evidence lane, derived lane])` under the current policy — so under
 *  `attested` the library returns the attested rows alone and the lane is not
 *  drawn at all. There is no client-side filtering left to get wrong: the
 *  firewall decides what this client is even able to see. */
function rebuildRows() {
  for (const r of RECON) {
    const h = S.recon[r.lane];
    if (!h) { S.rows[r.lane] = []; continue; }
    const rows = S.deck.window([KIND, h.into], -Infinity, Infinity, { evidence: S.policy });
    // a "reconstruction" the firewall served with no restored row in it is not a
    // reconstruction — it is the attested polyline, which the stored lane draws.
    S.rows[r.lane] = rows.some((x) => x.provenance) ? rows.map((x) => x.payload) : [];
  }
}

function setPolicy(p) {
  S.policy = p;
  S.deck && S.deck.setEvidence(p);     // the LIVE reads obey it too, not just the strokes
  S.strip && S.strip.setEvidence(p);   // and the strip asks the deck the same question
  rebuildRows();
  drawStatic(); drawCursors(); readout();
}

// ---------------------------------------------------------------------------
// drawing — the four-paths overlay
// ---------------------------------------------------------------------------

/** Draw one lane into an arbitrary context — the single definition shared by
 *  the overlay and the harness's per-lane ink probe. */
function paintLane(ctx, name, override) {
  const spec = override || LANES[name];
  if (name === 'evidence') return strokePoly(ctx, S.evidencePos, spec);
  if (name === 'linear' || name === 'smooth') return strokePoly(ctx, S.rows[name] || [], spec);
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
  // no scrubber to write back into: the strip reads deck.position() itself, in
  // its own rAF, and drawing IS the control
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
  // THE INVENTED FRACTION IS THE LIBRARY'S, NOT THIS CLIENT'S. It used to be
  // (drawn - attested)/drawn over a private flattener array; it is now the
  // evidence firewall's own accounting over the two lanes actually drawn, which
  // means it counts what the policy would let you SEE and cannot drift from it.
  const acct = S.deck ? S.deck.evidenceAccounting([KIND, S.recon.smooth ? S.recon.smooth.into : '']) : null;
  const conf = S.deck && S.recon.smooth ? S.deck.provenanceOf(S.recon.smooth.into) : null;
  $('counts').innerHTML =
    `<div><b>${S.evidence.length}</b> evidence samples (full rate)</div>` +
    `<div><b>${acct ? acct.attested : 0}</b> attested samples in the log (${STORE_MS} ms wall-clock throttle)</div>` +
    `<div><b>${acct ? acct.total : 0}</b> points drawn on the Catmull-Rom lane → ` +
    `<b>${acct ? (100 * acct.inventedFraction).toFixed(1) : '0'}%</b> of the rendered path is <i>invented</i>` +
    `${acct && acct.restored ? ` (${acct.restored} derived rows, tier ${Object.keys(acct.byTier).join('/')}` +
      `${conf && conf.confidence ? `, mean confidence ${conf.confidence.mean.toFixed(3)}` : ''})` : ''}</div>` +
    `<div class="dim">evidence policy: <b>${S.deck && S.deck.evidence() ? S.deck.evidence().label : '–'}</b>` +
    `${S.policy === ATTESTED ? ' — every derived lane is EXCLUDED by the library, not hidden by this page' : ''}</div>` +
    `<div class="dim">header: t0=${S.header ? S.header.t0Us : '–'} µs · duration=${S.header ? S.header.durationMs.toFixed(0) : '–'} ms · ${S.header ? S.header.source : '–'}</div>`;
  $('caps').textContent = JSON.stringify(S.deck ? S.deck.caps(KIND) : {}, null, 1) +
    (S.ask ? `\n\nrequest -> ${S.ask.degraded ? 'DEGRADED' : 'granted in full'}\n` +
      Object.entries(S.ask.per).map(([k, v]) =>
        ` ${k}: ${JSON.stringify(v.chose)}${v.degraded ? `  (wanted ${JSON.stringify(v.wanted)} — ${v.reason})` : ''}`).join('\n') : '') +
    (S.deck ? `\n\nprovenance\n` + S.deck.provenanceOf().map((p) =>
      ` ${p.kind}: ${p.attested} attested / ${p.restored} restored` +
      `${p.restored ? ` · tier ${p.tier} · ${p.method} · ${p.source}` : ''}`).join('\n') : '');
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
  $('follow').onclick = () => S.strip && S.strip.setFollow(!S.strip.follow().on);
  $('zin').onclick = () => S.strip && S.strip.zoomIn(2);
  $('zout').onclick = () => S.strip && S.strip.zoomOut(2);
  $('zfit').onclick = () => S.strip && S.strip.fit();
  $('synth').onclick = () => synthesize();
  $('clear').onclick = () => { resetCapture(); drawStatic(); };
  for (const name of ORDER) {
    const cb = $('t-' + name);
    cb.onchange = () => { SHOW[name] = cb.checked; drawStatic(); drawCursors(); };
  }
  // §5b's evidence firewall, one button. It no longer hides two lanes this page
  // drew anyway — it changes the DECK's evidence policy, and the library stops
  // serving restored rows to anything: the strokes, the live cursor and the
  // inset all fall back to what the log actually attests.
  $('evonly').onclick = () => {
    const on = S.policy !== ATTESTED;
    setPolicy(on ? ATTESTED : RESTORED_1);
    $('evonly').textContent = on ? 'show reconstructions' : 'evidence only';
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
      deckItems: S.deck ? S.deck.laneCount(KIND) : 0,
      // stats().attested, not stats().total: the deck now also holds the derived
      // lanes, and "my capture is intact" is a claim about the ATTESTED rows.
      schedTotal: S.deck ? S.deck.stats().attested : 0,
      schedDerived: S.deck ? S.deck.stats().derived : 0,
      durationMs: S.dur, pos: S.pos, rate: S.deck ? S.deck.rate() : null,
      playing: S.deck ? S.deck.playing() : false,
      fires: S.adapter ? S.adapter.fires : 0,
      reduceCalls: S.adapter ? S.adapter.reduceCalls : 0,
      interpCalls: S.adapter ? S.adapter.interpCalls : 0,
      caps: S.deck ? S.deck.caps(KIND) : null,
      ask: S.ask,
      degradations: S.deck ? S.deck.degradations(KIND) : null,
      cursor: S.deck ? S.deck.cursorStats(KIND) : null,
      dev: S.dev,
      flatSmooth: (S.rows.smooth || []).length,
      flatLinear: (S.rows.linear || []).length,
      // v0.5 the evidence firewall, as the harness sees it
      policy: S.deck && S.deck.evidence() ? S.deck.evidence().label : null,
      accounting: S.deck && S.recon.smooth ? S.deck.evidenceAccounting([KIND, S.recon.smooth.into]) : null,
      provenance: S.deck ? S.deck.provenanceOf() : null,
      header: S.header,
      errors: S.errors.slice(),
      renderAtMs: S.perFrame.renderAt,
    };
  },
  /** seek to pos, then compare the library's reduce() with analytic truth */
  seekProbe(pos) {
    S.deck.seek(pos);
    // the policy is DECLARED here (not inherited): this probe measures the
    // restored path's accuracy, so it asks for restoration explicitly and its
    // numbers are independent of whatever the evidence toggle is showing.
    const reduced = S.deck.reduceAt(KIND, pos, { evidence: RESTORED_1 });
    const truth = analyticAt(pos);
    const hold = S.deck.sampleAt(KIND, pos, { mode: 'hold', evidence: RESTORED_1 });
    const lin = S.deck.sampleAt(KIND, pos, { mode: 'linear', evidence: RESTORED_1 });
    const attested = S.deck.sampleAt(KIND, pos, { evidence: ATTESTED });
    const err = (p) => (p && truth ? +Math.hypot(p.x - truth.x, p.y - truth.y).toFixed(3) : null);
    return {
      pos, truth, reduced, method: reduced && reduced.method,
      // the firewall's answer at the same position: the last ATTESTED sample,
      // plus the report saying so
      errAttestedPx: err(attested), attestedReport: attested && attested.evidence,
      attestedReduced: S.deck.reduceAt(KIND, pos, { evidence: ATTESTED }),
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
    for (const name of ORDER) out[name] = laneInk((ctx) => paintLane(ctx, name), W, H);
    return out;
  },
  /** the same probe on the TIME STRIP, from the component's own API — so the
   *  evidence firewall is now proved twice, in two projections, by one
   *  definition of "did this lane put ink on a canvas". */
  stripInk() { return S.strip ? S.strip.ink() : null; },
  strip() { return S.strip ? { view: S.strip.view(), lod: S.strip.tickLOD(), readout: S.strip.readout() } : null; },
  setMode(m) { S.adapter.mode = m; },
  show(name, on) { SHOW[name] = on; $('t-' + name).checked = on; drawStatic(); drawCursors(); },
  /** the evidence firewall, as the harness drives it: 'attested' collapses every
   *  derived lane at the LIBRARY, not here. */
  setPolicy(p) { setPolicy(p === 'attested' ? ATTESTED : RESTORED_1); return S.deck.evidence(); },
  /** what the firewall serves for one lane under one policy, without drawing */
  probeWindow(laneName, p) {
    const h = S.recon[laneName];
    if (!h) return null;
    const rows = S.deck.window([KIND, h.into], -Infinity, Infinity,
      { evidence: p === 'attested' ? ATTESTED : RESTORED_1 });
    return { n: rows.length, derived: rows.filter((r) => r.provenance).length,
             prov: (rows.find((r) => r.provenance) || {}).provenance || null };
  },
  /** §5b reversibility, on demand: drop every restoration and compare */
  dropRestorations() {
    const before = JSON.stringify(S.deck.eventsOf(KIND));
    const dropped = RECON.reduce((n, r) => n + S.recon[r.lane].drop().dropped, 0);
    const identical = JSON.stringify(S.deck.eventsOf(KIND)) === before;
    const stats = S.deck.stats();
    for (const r of RECON) S.recon[r.lane].run();      // put them straight back
    rebuildRows();
    return { dropped, masterIdentical: identical, attestedAfterDrop: stats.attested, derivedAfterDrop: stats.derived };
  },
};

wire();
drawStatic();
