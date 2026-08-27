// proto/text/text.js — the TEXT PERFORMER client.
//
// Two lanes over one immutable log:
//   lane A  the live document, built by actuate() one op at a time
//   lane B  the folded projection, reduce(prefix <= t), computed independently
// They must be identical. That equality, sampled every frame, is the visible
// proof that the reducer is right — the "two-list state reconstruction" that
// research/…§2 says was invented twice in this lineage and never named.
//
// Plus the performance half, ported from demo/pages/keyboard2.vue: the 60ch
// measure, bold mono at a large size, generous leading, and the 0.75 px blur
// that gives screen type an ink-bleed. The AUDIO is rebuilt from scratch —
// keyboard2 fetched an untrimmed freesound MP3 and pushed it through a bare
// BufferSource with `start(0)` and NO GAIN NODE, so it had no velocity, no
// voice limiting, no envelope and no relationship to the transport clock. Here
// each op is a synthesised click scheduled on the AUDIO CLOCK via the library's
// caps.audio bridge (SEAM 4), with velocity derived from typing speed and a
// different timbre for insert / delete / select.

import { makeLogDeck } from './timeline/logdeck.mjs';
import {
  makeTextOpAdapter, deriveOp, selectOp, classify,
  UNHANDLED_INPUT_TYPES, COMPOSITION_INPUT_TYPES, toJsonl, fromJsonl,
  OP_INSERT, OP_DELETE, OP_SELECT,
} from './text-adapter.js';

const KIND = 'text-op';
const SETTLE_MS = 40;        // lane-compare exclusion window around an op
const SEL_COALESCE_MS = 40;  // selectionchange coalescing window
const $ = (id) => document.getElementById(id);

const nowUs = () => Math.round((performance.timeOrigin + performance.now()) * 1000);
const evUs = (ev) => Math.round((performance.timeOrigin + ev.timeStamp) * 1000);

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------

const S = {
  log: [],                 // immutable rows {at µs, kind, source, op, meta}
  deck: null, adapter: null,
  live: { text: '', selection: [0, 0], dir: 'none' },   // lane A (actuate-built)
  folded: { text: '', selection: [0, 0], dir: 'none' }, // lane B (reduce-built)
  rec: { on: false, pre: null, lastSel: null, lastPushUs: 0 },
  laneCheck: { compares: 0, mismatches: 0, skips: 0, playCompares: 0, playMismatches: 0, last: null },
  prov: { targetRanges: 0, targetRangesNonEmpty: 0, preSelAgree: 0, preSelDisagree: 0,
          caretAnchored: 0, diffAnchored: 0, ignoredFormat: 0, composition: 0, deleteNeededDerivation: 0, inputTypes: {} },
  ghost: true, sound: true,
  opPos: [],               // op positions (ms) for the settle window
  lastAssertWall: 0,
  catchUpReduces: 0,
  errors: [],
  audio: null, clicker: null,
};
window.textState = S;

const onErr = (m) => { S.errors.push(String(m).slice(0, 300)); };
window.addEventListener('error', (e) => onErr('error: ' + (e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => onErr('rejection: ' + (e.reason && e.reason.message)));
const _cerr = console.error.bind(console);
console.error = (...a) => { onErr('console.error: ' + a.map(String).join(' ')); _cerr(...a); };

// ---------------------------------------------------------------------------
// audio — one synthesised click per op. Velocity is DERIVED from the log
// (dt to the previous op), never stored: the timing is already in the log, so
// storing a resolved velocity beside it would be exactly the denormalisation
// the graveyard warns about ("never store a modifier you have already
// resolved").
// ---------------------------------------------------------------------------

function initAudio() {
  if (S.audio) return S.audio;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);
    S.audio = { ctx, out, voices: 0 };
    S.clicker = makeClicker(S.audio);
    ctx.resume && ctx.resume().catch(() => {});
  } catch (e) { S.audio = null; }
  return S.audio;
}

function makeClicker(A) {
  const { ctx, out } = A;
  return function click(family, vel, audioTime) {
    if (!S.sound || ctx.state !== 'running') return false;
    if (A.voices > 24) return false;              // voice limit keyboard2 lacked
    const t = Math.max(audioTime || 0, ctx.currentTime + 0.001);
    const g = ctx.createGain();
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    let type, freq, dur, peak;
    if (family === 'delete') {
      type = 'sawtooth'; freq = 190 + vel * 70; dur = 0.085; peak = 0.05 + 0.10 * vel;
      f.type = 'lowpass'; f.frequency.value = 780; f.Q.value = 0.8;
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(55, freq * 0.4), t + dur);
    } else if (family === 'select') {
      type = 'sine'; freq = 3100; dur = 0.014; peak = 0.035;
      f.type = 'bandpass'; f.frequency.value = 3100; f.Q.value = 2.2;
      o.frequency.setValueAtTime(freq, t);
    } else {
      type = 'triangle'; freq = 1150 + vel * 950; dur = 0.026; peak = 0.035 + 0.13 * vel;
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.3;
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.72, t + dur);
    }
    o.type = type;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(out);
    A.voices++;
    o.start(t); o.stop(t + dur + 0.01);
    o.onended = () => { A.voices--; try { o.disconnect(); f.disconnect(); g.disconnect(); } catch {} };
    return true;
  };
}

/** velocity 0..1 from typing speed: derived from the immutable log by index. */
function velocityAt(i) {
  if (!(i > 0) || !S.log[i] || !S.log[i - 1]) return 0.45;
  const dt = (S.log[i].at - S.log[i - 1].at) / 1000;
  return Math.max(0, Math.min(1, 1 - Math.min(1, dt / 320)));
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function renderDoc(el, st, caret = true) {
  const n = st.text.length;
  const a = Math.max(0, Math.min(n, st.selection[0]));
  const b = Math.max(a, Math.min(n, st.selection[1]));
  el.innerHTML = esc(st.text.slice(0, a)) +
    (a === b ? (caret ? '<b class="caret"></b>' : '') : `<mark>${esc(st.text.slice(a, b))}</mark>`) +
    esc(st.text.slice(b)) + '​';
}

function paintLive() {
  const el = $('liveEl');
  if (el.value !== S.live.text) el.value = S.live.text;
  // A readonly textarea still shows the caret and the selection — keyboard2's
  // readonly-not-disabled trick, kept, because it is what makes ghost typing
  // read as typing rather than as text appearing.
  try { el.setSelectionRange(S.live.selection[0], S.live.selection[1], S.live.dir || 'none'); } catch {}
  renderDoc($('perfEl'), S.live);
}

function paintFold() { renderDoc($('foldEl'), S.folded); }

// ---------------------------------------------------------------------------
// CAPTURE — beforeinput/input, element-scoped. No keydown listener exists in
// this file; grep for it. That is the point.
// ---------------------------------------------------------------------------

// Fold ONE op onto a state. This is the ACTUATE-side implementation and it is
// deliberately a SECOND, INDEPENDENT implementation of the same semantics as
// text-adapter.js's foldOps(). Lane A runs this one op at a time; lane B runs
// foldOps() over the whole prefix. Their agreement on screen is therefore a
// real cross-check, not a tautology.
function applyOne(st, op) {
  const n = st.text.length;
  const a = Math.max(0, Math.min(n, op.range[0]));
  const b = Math.max(a, Math.min(n, op.range[1]));
  if (op.type === OP_SELECT) return { text: st.text, selection: [a, b], dir: op.dir || 'none' };
  if (op.type === OP_INSERT) {
    const t = op.text || '';
    return { text: st.text.slice(0, a) + t + st.text.slice(b), selection: [a + t.length, a + t.length], dir: 'none' };
  }
  return { text: st.text.slice(0, a) + st.text.slice(b), selection: [a, a], dir: 'none' };
}

function onBeforeInput(ev) {
  if (!S.rec.on) return;
  const el = $('liveEl');
  let ranges = 0;
  try { ranges = ev.getTargetRanges ? ev.getTargetRanges().length : 0; } catch { ranges = 0; }
  S.prov.targetRanges++;
  if (ranges > 0) S.prov.targetRangesNonEmpty++;
  S.rec.pre = {
    value: el.value, s: el.selectionStart, e: el.selectionEnd,
    inputType: ev.inputType, ranges, atUs: evUs(ev),
  };
  if (UNHANDLED_INPUT_TYPES.has(ev.inputType)) S.prov.ignoredFormat++;
  if (COMPOSITION_INPUT_TYPES.has(ev.inputType)) S.prov.composition++;
}

function onInput(ev) {
  if (!S.rec.on) return;
  const el = $('liveEl');
  const pre = S.rec.pre || { value: S.live.text, s: el.selectionStart, e: el.selectionEnd, inputType: ev.inputType || '', ranges: -1, atUs: evUs(ev) };
  S.rec.pre = null;
  const it = pre.inputType || ev.inputType || '';
  S.prov.inputTypes[it] = (S.prov.inputTypes[it] || 0) + 1;
  const op = deriveOp(pre.value, el.value, el.selectionStart, it);
  if (!op) return;                       // attribute-only edit: nothing to record
  if (op.anchor === 'caret') S.prov.caretAnchored++; else S.prov.diffAnchored++;
  // Cross-check the pre-edit selection against the derived range. For an INSERT
  // the two should agree (the browser inserts at the selection). For a DELETE
  // they almost never do — the pre-edit selection is collapsed and the deleted
  // range has to be *derived*, which is precisely the guess every ancestor got
  // wrong. Count both, separately; the diff always wins.
  const fam = classify(it);
  if (fam === 'insert') {
    if (op.range[0] === pre.s && op.range[1] === pre.e) S.prov.preSelAgree++; else S.prov.preSelDisagree++;
  } else if (fam === 'delete') {
    if (op.range[0] !== pre.s || op.range[1] !== pre.e) S.prov.deleteNeededDerivation++;
  }
  const row = { at: pre.atUs, kind: KIND, source: 'live', op,
                meta: { targetRanges: pre.ranges, preSel: [pre.s, pre.e] } };
  if (S.log.length && row.at <= S.log[S.log.length - 1].at) row.at = S.log[S.log.length - 1].at + 1;
  S.log.push(row);
  S.live = applyOne(S.live, op);
  S.rec.lastSel = S.live.selection.slice();
  if (S.clicker) S.clicker(classify(it) === 'delete' ? 'delete' : 'insert', velocityAt(S.log.length - 1), 0);
  refreshCounts();
  renderDoc($('perfEl'), S.live);
}

function onSelectionChange() {
  if (!S.rec.on) return;
  const el = $('liveEl');
  if (document.activeElement !== el) return;
  const s = el.selectionStart, e = el.selectionEnd, dir = el.selectionDirection || 'none';
  const last = S.live.selection;
  if (last && last[0] === s && last[1] === e) return;      // implied by the last op — not an op
  const at = nowUs();
  const prev = S.log[S.log.length - 1];
  if (prev && prev.op.type === OP_SELECT && at - prev.at < SEL_COALESCE_MS * 1000) {
    prev.op.range = [Math.min(s, e), Math.max(s, e)];       // coalesce the drag
    prev.op.dir = dir;
  } else {
    const row = { at: Math.max(at, prev ? prev.at + 1 : at), kind: KIND, source: 'live', op: selectOp(s, e, dir) };
    S.log.push(row);
    if (S.clicker) S.clicker('select', 0.3, 0);
  }
  S.live = { text: S.live.text, selection: [Math.min(s, e), Math.max(s, e)], dir };
  refreshCounts();
}

// ---------------------------------------------------------------------------
// DECK — rebuild from the immutable log
// ---------------------------------------------------------------------------

function buildDeck() {
  if (S.deck) { try { S.deck.dispose(); } catch {} S.deck = null; }
  S.laneCheck = { compares: 0, mismatches: 0, lags: 0, divergences: 0, skips: 0, playCompares: 0, playMismatches: 0, last: null };
  S.catchUpReduces = 0;
  const A = initAudio();
  const adapter = makeTextOpAdapter({
    audio: A ? { ctx: A.ctx, leadMs: 0 } : null,
    apply(payload, rec, when) {
      S.live = applyOne(S.live, payload.op);
      if (S.clicker) {
        const fam = payload.op.type === OP_DELETE ? 'delete' : payload.op.type === OP_SELECT ? 'select' : 'insert';
        S.clicker(fam, velocityAt(payload.i), when ? when.audioTime : 0);
      }
      if (S.ghost) paintLive(); else renderDoc($('perfEl'), S.live);
    },
    assert(state, info) {
      S.live = { text: state.text, selection: state.selection.slice(), dir: state.dir };
      S.folded = { text: state.text, selection: state.selection.slice(), dir: state.dir };
      S.lastAssertWall = performance.now();
      if (info && info.reason === 'catch-up') S.catchUpReduces++;
      paintLive(); paintFold();
    },
  });
  S.adapter = adapter;

  const deck = makeLogDeck({
    lanes: [{
      kind: KIND, rows: S.log, adapter,
      // explicit expand: makeLogDeck's default payload spread would let the
      // row's µs `at` clobber the position-domain `at` it just computed.
      expand: (row, i) => [{
        atUs: row.at, id: `op-${i}`,
        payload: { atUs: row.at, source: row.source, op: row.op, meta: row.meta },
      }],
    }],
    leadInMs: 250, tailMs: 400,
    onPosition: null,
  });
  S.deck = deck;
  S.opPos = deck.items.map((it) => it.at).sort((a, b) => a - b);
  deck.seek(0);
  $('caps').textContent = Object.entries(deck.caps(KIND))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length + ' types' : v && typeof v === 'object' ? 'ctx' : v}`).join('\n');
  drawStrip();
  refreshCounts();
  return { items: deck.items.length, durationMs: +deck.durationMs.toFixed(1) };
}

// ---------------------------------------------------------------------------
// the lane comparison — sampled every frame
// ---------------------------------------------------------------------------

function nearOp(pos, win) {
  for (const p of S.opPos) { if (p > pos + win) break; if (Math.abs(p - pos) <= win) return true; }
  return false;
}

const eqState = (a, b) => a && b && a.text === b.text &&
  a.selection[0] === b.selection[0] && a.selection[1] === b.selection[1];

function laneTick(pos) {
  if (!S.deck) return;
  const st = S.deck.reduceAt(KIND, pos);
  if (!st) return;
  S.folded = { text: st.text, selection: st.selection.slice(), dir: st.dir };
  paintFold();
  // The exclusion window is a WALL-CLOCK quantity (scheduler dispatch jitter +
  // main-thread jank), so it has to be converted into the position domain by
  // multiplying by the rate. Writing it as a position-domain constant was a bug
  // in the check itself: at 3x it was three times too narrow.
  const win = SETTLE_MS * Math.max(1, S.deck.rate() || S.deck.targetRate());
  if (nearOp(pos, win) || performance.now() - S.lastAssertWall < 60) { S.laneCheck.skips++; return; }
  const same = eqState(st, S.live);
  S.laneCheck.compares++;
  if (!same) {
    S.laneCheck.mismatches++;
    // Classify: is lane A merely one dispatch away from lane B (a fire that has
    // not landed yet, or landed early), or do the two folds genuinely disagree?
    // Only the second is a reducer bug. This is the assertable number.
    const lag = eqState(S.deck.reduceAt(KIND, pos - win), S.live) ||
                eqState(S.deck.reduceAt(KIND, pos + win), S.live);
    if (lag) S.laneCheck.lags++;
    else { S.laneCheck.divergences++; S.laneCheck.last = { pos: +pos.toFixed(1), a: S.live.text, b: st.text }; }
  }
  if (S.deck.rate() > 0) { S.laneCheck.playCompares++; if (!same) S.laneCheck.playMismatches++; }
}

// ---------------------------------------------------------------------------
// strip
// ---------------------------------------------------------------------------

function drawStrip(pos = 0) {
  const c = $('strip'), g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0b0d12'; g.fillRect(0, 0, W, H);
  if (!S.deck) return;
  const [lo, hi] = S.deck.range;
  const x = (p) => ((p - lo) / Math.max(1, hi - lo)) * (W - 8) + 4;
  const COL = { insert: '#3fe0ff', delete: '#ff3d8b', select: '#ffb020' };
  g.strokeStyle = '#1a1e2a'; g.beginPath(); g.moveTo(0, H - 12); g.lineTo(W, H - 12); g.stroke();
  for (const it of S.deck.items) {
    const t = it.payload.op.type;
    const h = t === OP_SELECT ? 22 : t === OP_DELETE ? 46 : 34 + Math.min(28, (it.payload.op.text || '').length * 6);
    g.fillStyle = COL[t] || '#888';
    g.globalAlpha = it.at <= pos ? 1 : 0.35;
    g.fillRect(x(it.at) - 1.5, H - 12 - h, 3, h);
  }
  g.globalAlpha = 1;
  g.fillStyle = '#fff'; g.fillRect(x(pos) - 1, 0, 2, H);
  g.fillStyle = '#8b93a8'; g.font = '18px ui-monospace, monospace';
  g.fillText(`${(pos / 1000).toFixed(2)}s / ${(S.deck.durationMs / 1000).toFixed(2)}s`, 8, 26);
}

// ---------------------------------------------------------------------------
// panels
// ---------------------------------------------------------------------------

function refreshCounts() {
  const c = { insert: [0, 0], delete: [0, 0], select: [0, 0] };
  for (const r of S.log) {
    const t = r.op.type;
    if (!c[t]) continue;
    c[t][0]++;
    if (t === OP_INSERT) c[t][1] += (r.op.text || '').length;
    if (t === OP_DELETE) c[t][1] += r.op.range[1] - r.op.range[0];
  }
  $('opcounts').innerHTML = Object.entries(c).map(([k, v]) =>
    `<tr><td><i style="background:var(--${k})"></i>${k}</td><td>${v[0]}</td><td>${v[1] || ''}</td></tr>`).join('');
  $('nops').textContent = S.log.length;
  const p = S.prov;
  $('prov').innerHTML = [
    ['beforeinput seen', p.targetRanges],
    ['getTargetRanges() non-empty', p.targetRangesNonEmpty],
    ['range anchored on caret', p.caretAnchored],
    ['range from raw diff', p.diffAnchored],
    ['insert: pre-selection agreed', p.preSelAgree],
    ['insert: pre-selection wrong', p.preSelDisagree],
    ['delete: range HAD to be derived', p.deleteNeededDerivation],
    ['composition ops', p.composition],
    ['format ops ignored', p.ignoredFormat],
  ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') +
    Object.entries(p.inputTypes).map(([k, v]) => `<tr><td class="dim">· ${k}</td><td class="dim">${v}</td></tr>`).join('');
}

function refreshHud(pos) {
  $('pos').textContent = S.deck ? `${(pos / 1000).toFixed(2)}s` : '–';
  $('rate').textContent = S.deck ? `${S.deck.playing() ? S.deck.rate().toFixed(2) : S.deck.targetRate().toFixed(2)}×${S.deck.playing() ? '' : ' ⏸'}` : '–';
  const L = S.laneCheck;
  $('cmp').textContent = L.compares;
  $('mis').textContent = L.divergences + (L.lags ? ` (+${L.lags} dispatch lag)` : '');
  $('skp').textContent = L.skips;
  const ok = L.divergences === 0 && L.compares > 0;
  const eq = $('eq');
  eq.className = 'verdict ' + (ok || L.compares === 0 ? 'ok' : 'bad');
  eq.textContent = L.compares === 0 ? 'no samples yet'
    : ok ? `IDENTICAL — ${L.compares} samples, 0 divergences` : `DIVERGED at ${L.last && L.last.pos} ms`;
  $('selnow').textContent = `[${S.folded.selection[0]}, ${S.folded.selection[1]}]${S.folded.dir !== 'none' ? ' ' + S.folded.dir : ''}`;
  $('perftag').textContent = S.rec.on ? 'recording' : S.deck && S.deck.playing() ? `replay ${S.deck.rate()}×${S.ghost ? ' · ghost' : ''}` : 'idle';
}

// ---------------------------------------------------------------------------
// controls — buttons and a pointer-driven range. No key bindings.
// ---------------------------------------------------------------------------

function setRec(on) {
  S.rec.on = on;
  const el = $('liveEl');
  $('rec').dataset.on = on ? '1' : '0';
  if (on) {
    initAudio();
    if (S.deck) S.deck.pause();
    el.readOnly = false;
    el.focus();
    S.rec.lastSel = [el.selectionStart, el.selectionEnd];
  } else {
    el.readOnly = true;
    if (S.log.length) { buildDeck(); S.deck.seek(S.deck.range[1]); }
  }
}

function bind() {
  const el = $('liveEl');
  el.readOnly = true;
  el.addEventListener('beforeinput', onBeforeInput);
  el.addEventListener('input', onInput);
  document.addEventListener('selectionchange', onSelectionChange);
  // Escape disarms. It fires no beforeinput, so it can never enter the log —
  // the out-of-band property here is STRUCTURAL, not a hand-written filter.
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.rec.on) setRec(false); });

  $('rec').onclick = () => setRec(!S.rec.on);
  $('clear').onclick = () => {
    S.log = []; S.live = { text: '', selection: [0, 0], dir: 'none' }; S.folded = { ...S.live };
    S.prov = { targetRanges: 0, targetRangesNonEmpty: 0, preSelAgree: 0, preSelDisagree: 0,
               caretAnchored: 0, diffAnchored: 0, ignoredFormat: 0, composition: 0, deleteNeededDerivation: 0, inputTypes: {} };
    if (S.deck) { try { S.deck.dispose(); } catch {} S.deck = null; }
    S.opPos = []; paintLive(); paintFold(); refreshCounts(); drawStrip();
  };
  $('synth').onclick = () => { api.synthesize(); };
  $('rewind').onclick = () => S.deck && S.deck.seek(0);
  $('play').onclick = () => {
    initAudio(); if (S.audio) S.audio.ctx.resume().catch(() => {});
    if (S.ghost) $('liveEl').focus();     // ghost typing: the real caret, blinking
    S.deck && S.deck.play();
  };
  $('pause').onclick = () => S.deck && S.deck.pause();
  $('scrub').oninput = (e) => {
    if (!S.deck) return;
    S.deck.seek((+e.target.value / 1000) * S.deck.durationMs + S.deck.range[0]);
  };
  const rates = [0.25, 0.5, 1, 2, 4];
  $('rates').innerHTML = rates.map((r) => `<button class="rate" data-r="${r}">${r}×</button>`).join('');
  $('rates').querySelectorAll('button').forEach((b) => {
    b.onclick = () => { if (!S.deck) return; S.deck.setRate(+b.dataset.r); if (!S.deck.playing()) S.deck.play(); };
  });
  $('ghost').onclick = () => { S.ghost = !S.ghost; $('ghost').dataset.on = S.ghost ? '1' : '0'; };
  $('sound').onclick = () => { S.sound = !S.sound; $('sound').dataset.on = S.sound ? '1' : '0'; if (S.sound) initAudio(); };
  $('perform').onclick = () => document.body.classList.toggle('perform');
  $('export').onclick = () => {
    const blob = new Blob([api.exportJsonl()], { type: 'application/x-ndjson' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `text-performance-${Date.now()}.jsonl`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('import').onclick = () => $('file').click();
  $('file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    api.importJsonl(await f.text());
  };
  $('probe').onclick = () => {
    api.ceArm();
    setTimeout(() => { $('probeout').textContent = JSON.stringify(api.ceRead(), null, 1); }, 1600);
    $('probeout').textContent = 'contenteditable focused — type a character…';
  };
}

// ---------------------------------------------------------------------------
// the frame loop
// ---------------------------------------------------------------------------

function frame() {
  const pos = S.deck ? S.deck.position() : 0;
  if (S.deck) {
    laneTick(pos);
    drawStrip(pos);
    const sc = $('scrub');
    if (document.activeElement !== sc) {
      sc.value = Math.round(((pos - S.deck.range[0]) / Math.max(1, S.deck.durationMs)) * 1000);
    }
  }
  refreshHud(pos);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// harness API
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const api = {
  S,
  arm() { setRec(true); return true; },
  disarm() { setRec(false); return { ops: S.log.length }; },
  focusLive() { const el = $('liveEl'); el.readOnly = false; el.focus(); return document.activeElement === el; },
  build: buildDeck,

  state() {
    const d = S.deck;
    return {
      ops: S.log.length,
      deckItems: d ? d.items.length : 0,
      schedTotal: d ? d.stats().total : 0,
      durationMs: d ? +d.durationMs.toFixed(2) : 0,
      range: d ? d.range : null,
      live: { text: S.live.text, selection: S.live.selection },
      folded: { text: S.folded.text, selection: S.folded.selection },
      dom: api.dom(),
      lane: S.laneCheck,
      prov: S.prov,
      caps: d ? d.caps(KIND) : null,
      adapter: S.adapter ? { fires: S.adapter.fires, reduceCalls: S.adapter.reduceCalls, assertCalls: S.adapter.assertCalls } : null,
      catchUpReduces: S.catchUpReduces,
      audio: S.audio ? S.audio.ctx.state : 'none',
      errors: S.errors,
    };
  },

  dom() {
    const el = $('liveEl');
    return { value: el.value, selStart: el.selectionStart, selEnd: el.selectionEnd, dir: el.selectionDirection };
  },

  /** the three widest silences in the performance — the honest places to probe
   *  C2, because a pause anywhere inside one yields the same document. */
  quietProbes(n = 3) {
    const ps = S.opPos, gaps = [];
    for (let i = 1; i < ps.length; i++) gaps.push({ mid: (ps[i - 1] + ps[i]) / 2, w: ps[i] - ps[i - 1] });
    gaps.sort((a, b) => b.w - a.w);
    return gaps.slice(0, n).map((g) => ({ pos: +g.mid.toFixed(2), gapMs: +g.w.toFixed(1) })).sort((a, b) => a.pos - b.pos);
  },

  /** stage the system clipboard for a REAL paste (CDP dispatches copy/paste as
   *  editing commands; nothing here forges a ClipboardEvent). */
  stageClip(str) {
    const c = $('clipsrc');
    c.value = str; c.focus(); c.setSelectionRange(0, str.length);
    return document.activeElement === c;
  },
  setCaret(s, e = s) {
    const el = $('liveEl');
    el.focus(); el.setSelectionRange(s, e);
    return api.dom();
  },

  /** reduce(prefix <= pos) without touching the transport. */
  reduceAt(pos) { const st = S.deck.reduceAt(KIND, pos); return { text: st.text, selection: st.selection, dir: st.dir, ops: st.ops }; },

  /** seek + read everything back: the reducer, the two lanes, and the DOM. */
  seekProbe(pos) {
    const q = S.deck.seek(pos);
    const st = S.deck.reduceAt(KIND, q);
    paintLive(); paintFold();
    return {
      pos: q, reduced: { text: st.text, selection: st.selection },
      live: { text: S.live.text, selection: S.live.selection },
      dom: api.dom(),
    };
  },

  /** C2 on real text: play 0 -> t with ONLY actuate() running, then compare the
   *  actuate-built document against reduce(prefix <= t). */
  async replayTo(t, rate = 4) {
    S.deck.pause();
    S.deck.seek(S.deck.range[0]);
    await sleep(60);
    const before = { fires: S.adapter.fires, asserts: S.adapter.assertCalls };
    S.deck.play(rate);
    const t0 = performance.now();
    while (S.deck.position() < t && performance.now() - t0 < 60000) await sleep(4);
    S.deck.pause();
    const stoppedAt = S.deck.position();
    await sleep(30);
    const at = api.reduceAt(t);
    const atStop = api.reduceAt(stoppedAt);
    return {
      t, stoppedAt: +stoppedAt.toFixed(2), rate,
      played: { text: S.live.text, selection: S.live.selection },
      reducedAtT: at, reducedAtStop: atStop,
      dom: api.dom(),
      fires: S.adapter.fires - before.fires,
      assertsDuringPlay: S.adapter.assertCalls - before.asserts,
    };
  },

  async pauseHolds(ms = 400) {
    S.deck.play(1); await sleep(150);
    S.deck.pause();
    const a = S.deck.position(); const ta = S.live.text;
    await sleep(ms);
    const b = S.deck.position();
    return { before: a, after: b, driftMs: +(b - a).toFixed(4), rate: S.deck.rate(), textStable: ta === S.live.text };
  },

  async traverse(from, to, rate) {
    S.deck.pause(); S.deck.seek(from); await sleep(40);
    S.deck.play(rate);
    const t0 = performance.now();
    while (S.deck.position() < to && performance.now() - t0 < 60000) await sleep(4);
    const wallMs = performance.now() - t0;
    S.deck.pause();
    return { wallMs: +wallMs.toFixed(1), observedRate: +((S.deck.position() - from) / wallMs).toFixed(3) };
  },

  /** the honest platform answer: getTargetRanges() on textarea vs
   *  contenteditable, measured with REAL input (the harness types between
   *  ceArm() and ceRead()) rather than a synthetic event. */
  ceArm() {
    const ce = $('ceb');
    ce.style.display = 'block';
    ce.textContent = 'abc';
    S.ce = [];
    S.ceH = (e) => {
      let n = -1, r = null;
      try { const rs = e.getTargetRanges(); n = rs.length; r = rs[0] || null; } catch {}
      S.ce.push({ inputType: e.inputType, targetRanges: n,
        start: r ? r.startOffset : null, end: r ? r.endOffset : null,
        sameNode: r ? r.startContainer === r.endContainer : null });
    };
    ce.addEventListener('beforeinput', S.ceH);
    ce.focus();
    const sel = window.getSelection();
    const rg = document.createRange();
    rg.setStart(ce.firstChild, 3); rg.collapse(true);
    sel.removeAllRanges(); sel.addRange(rg);
    return document.activeElement === ce;
  },
  ceRead() {
    const ce = $('ceb');
    ce.removeEventListener('beforeinput', S.ceH);
    ce.style.display = 'none';
    return {
      textarea: { seen: S.prov.targetRanges, nonEmpty: S.prov.targetRangesNonEmpty },
      contenteditable: S.ce || [], ceText: ce.textContent,
    };
  },

  exportJsonl() {
    return toJsonl(S.log, {
      capture: 'beforeinput+input+selectionchange', document: 'plain-text',
      t0Us: S.log.length ? S.log[0].at : 0, ops: S.log.length,
    });
  },
  importJsonl(str) {
    const { header, rows } = fromJsonl(str);
    S.log = rows;
    S.live = { text: '', selection: [0, 0], dir: 'none' };
    const r = buildDeck();
    return { header, ...r };
  },

  /** a canned take, for the button (the harness drives real CDP input instead) */
  synthesize() {
    const t0 = nowUs();
    let t = t0, i = 0;
    const rows = [];
    const push = (op, dt) => { t += dt * 1000; rows.push({ at: t, kind: KIND, source: 'synth', op }); };
    const type = (s, base = 95) => { for (const ch of s) push({ type: OP_INSERT, range: [i, i], text: ch, inputType: 'insertText' }, base + Math.random() * 70), i++; };
    type('the recorder records the act of');
    push({ type: OP_SELECT, range: [i, i], dir: 'none' }, 400);
    for (let k = 0; k < 3; k++) { push({ type: OP_DELETE, range: [i - 1, i], inputType: 'deleteContentBackward' }, 120); i--; }
    type(' recording');
    push({ type: OP_INSERT, range: [i, i], text: '\n', inputType: 'insertLineBreak' }, 320); i++;
    type('unless it is out of band');
    push({ type: OP_SELECT, range: [4, 12], dir: 'forward' }, 500);
    S.log = rows;
    S.live = { text: '', selection: [0, 0], dir: 'none' };
    return buildDeck();
  },
};
window.text = api;

// ---------------------------------------------------------------------------

bind();
paintLive(); paintFold(); refreshCounts(); drawStrip();
requestAnimationFrame(frame);
window.textReady = true;
