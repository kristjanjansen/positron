// demo/shell/cc-adapter.mjs: the `cc` kind, continuous MIDI control as a level-valued timeline kind:
// catch-up is reduce, never burst; seek restores the console; a periodic full-state keyframe guards
// stuck state. Wire form is jam-core's 16-byte frame. 6408 samples gated to 409 rows within 1.25%.
// why: lessons/kit-cc-adapter.md#header

// ---------------------------------------------------------------------------
// status bytes and the controller-number key space
// ---------------------------------------------------------------------------

export const ST_CC = 0xb0;         // control change
export const ST_PB = 0xe0;         // pitch bend (14-bit, no controller number)
export const FRAME_BYTES = 16;

export const isCC = (s) => (s & 0xf0) === ST_CC;
export const isPB = (s) => (s & 0xf0) === ST_PB;
export const chanOf = (s) => s & 0x0f;

/**
 * MIDI 1.0 fine/coarse pairing: CC n+32 is the LSB of n (0 to 31), folded onto one key so
 * `reduce` restores a coherent 14-bit value.
 * why: lessons/kit-cc-adapter.md#coarse
 */
export const COARSE = (n) => (n >= 32 && n < 64 ? n - 32 : n);
export const has14 = (n) => n < 32;

/** Controllers that are switches / mode messages, not levels. These are NEVER
 *  throttled at capture: a dropped sustain-pedal-down is the CC analogue of a
 *  stuck note, and throttling exists to thin SWEEPS, which switches are not. */
export const SWITCHES = new Set([64, 65, 66, 67, 68, 69, 120, 121, 122, 123, 124, 125, 126, 127]);

export const RESET_ALL_CONTROLLERS = 121;   // CC 121 — the continuous-side panic
export const ALL_SOUND_OFF = 120;           // CC 120 — proto/instrument already sends these two
export const ALL_NOTES_OFF = 123;           // CC 123

/** The reducer's key: one entry per CONTROLLER NUMBER per channel (fine/coarse
 *  folded), plus one for pitch bend. This string is also the "series identity"
 *  a continuous kind needs — see caps.series and NOTES.md seam S1. */
export function keyOf(status, d1) {
  if (isPB(status)) return `pb:${chanOf(status)}`;
  return `cc:${chanOf(status)}:${COARSE(d1)}`;
}

export const CC_NAMES = {
  1: 'mod wheel', 7: 'volume', 10: 'pan', 11: 'expression', 64: 'sustain',
  71: 'resonance', 74: 'cutoff', 91: 'reverb', 93: 'chorus',
};
export function labelOf(status, d1) {
  if (isPB(status)) return `pitch bend ch${chanOf(status) + 1}`;
  const n = COARSE(d1);
  return `CC${n}${CC_NAMES[n] ? ' ' + CC_NAMES[n] : ''}`;
}

// 14-bit encode/decode. A 14-bit CC is two messages, MSB then LSB; pitch bend is one, LSB in data1.
// why: lessons/kit-cc-adapter.md#enc14

export const dec14 = (msb, lsb) => ((msb & 0x7f) << 7) | (lsb & 0x7f);
export const msbOf = (v14) => (v14 >> 7) & 0x7f;
export const lsbOf = (v14) => v14 & 0x7f;
export const clamp14 = (v) => (v < 0 ? 0 : v > 16383 ? 16383 : v | 0);
export const clamp7 = (v) => (v < 0 ? 0 : v > 127 ? 127 : v | 0);

/** 14-bit CC -> the two raw messages, MSB first. */
export function enc14(ch, controller, value14) {
  if (!has14(controller)) throw new Error(`CC ${controller} has no LSB partner (14-bit is CC 0-31 only)`);
  const v = clamp14(value14);
  return [[ST_CC | (ch & 0x0f), controller, msbOf(v)], [ST_CC | (ch & 0x0f), controller + 32, lsbOf(v)]];
}
/** 7-bit CC -> one raw message. */
export function enc7(ch, controller, value7) {
  return [[ST_CC | (ch & 0x0f), controller & 0x7f, clamp7(value7)]];
}
/** pitch bend -> one raw message, data1 = LSB, data2 = MSB. Centre is 8192. */
export function encPB(ch, value14) {
  const v = clamp14(value14);
  return [[ST_PB | (ch & 0x0f), lsbOf(v), msbOf(v)]];
}
/** the inverse of encPB for a single raw message. */
export function decPB(raw) { return dec14(raw[2], raw[1]); }

// The 16-byte frame, CC variant, byte-identical to jam-core's note frame; byte 0 discriminates.
// why: lessons/kit-cc-adapter.md#encodeframe

export function encodeFrame({ status, d1, d2, src = 0, seq = 0, tUs = 0 }) {
  const buf = new ArrayBuffer(FRAME_BYTES);
  const dv = new DataView(buf);
  dv.setUint8(0, status & 0xff); dv.setUint8(1, d1 & 0x7f); dv.setUint8(2, d2 & 0x7f);
  dv.setUint8(3, src & 0xff);
  dv.setUint32(4, seq >>> 0, true);
  dv.setFloat64(8, tUs, true);
  return buf;
}

export function decodeFrame(buf) {
  const dv = buf instanceof DataView ? buf : new DataView(buf.buffer ? buf.buffer : buf);
  const status = dv.getUint8(0), d1 = dv.getUint8(1), d2 = dv.getUint8(2);
  const f = {
    status, d1, d2, src: dv.getUint8(3), seq: dv.getUint32(4, true), tUs: dv.getFloat64(8, true),
    raw: [status, d1, d2],
  };
  // the derived VIEW — deterministic at the receiver, never sent (jam-core's
  // rule: display form is derived from raw, not transmitted beside it)
  if (isPB(status)) { f.form = 'pb'; f.value14 = dec14(d2, d1); f.controller = null; }
  else if (isCC(status)) {
    f.form = has14(COARSE(d1)) ? (d1 < 32 ? 'msb' : 'lsb') : 'single';
    f.controller = d1; f.coarse = COARSE(d1); f.value7 = d2;
  } else f.form = 'other';
  f.key = keyOf(status, d1);
  f.label = labelOf(status, d1);
  return f;
}

/** frame -> log row (the shape makeLogDeck lanes want: `at` in epoch µs). */
export function frameToRow(f) {
  return { at: f.tUs, status: f.status, d1: f.d1, d2: f.d2, src: f.src, seq: f.seq,
           raw: f.raw, key: f.key, form: f.form, label: f.label };
}
/** log row -> frame bytes, for re-broadcasting a recorded show. */
export function rowToFrame(r) { return encodeFrame({ ...r, tUs: r.at }); }

// The reducer state, one entry per controller. `msb` and `lsb` fold independently, so reduce(prefix)
// reproduces play(0->t) for a 14-bit sweep; caps say `msbZerosLsb: false`.
// why: lessons/kit-cc-adapter.md#foldrows

export function foldRows(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r || r.status === undefined) continue;
    const key = r.key || keyOf(r.status, r.d1);
    let e = map.get(key);
    if (!e) {
      e = { key, status: r.status, ch: chanOf(r.status), controller: isPB(r.status) ? null : COARSE(r.d1),
            bits: isPB(r.status) || has14(COARSE(r.d1)) ? 14 : 7, msb: 0, lsb: 0, value14: 0,
            seenMsb: false, seenLsb: false, label: r.label || labelOf(r.status, r.d1) };
      map.set(key, e);
    }
    if (isPB(r.status)) { e.msb = r.d2; e.lsb = r.d1; e.seenMsb = e.seenLsb = true; }
    else if (r.d1 < 32) { e.msb = r.d2; e.seenMsb = true; }          // coarse half
    else if (r.d1 < 64) { e.lsb = r.d2; e.seenLsb = true; }          // fine half
    else { e.msb = r.d2; e.lsb = 0; e.seenMsb = true; e.bits = 7; }  // plain 7-bit controller
    e.value14 = e.bits === 14 ? dec14(e.msb, e.lsb) : e.msb << 7;
    e.value7 = e.msb;
    e.atUs = r.at; e.atMs = r.atMs;
  }
  return map;
}

/** the raw messages that re-state one entry, in MIDI-legal order (MSB, LSB). */
export function assertBytes(e) {
  if (isPB(e.status)) return encPB(e.ch, dec14(e.msb, e.lsb));
  if (e.bits === 14) {
    const out = [];
    if (e.seenMsb) out.push([ST_CC | e.ch, e.controller, e.msb]);
    if (e.seenLsb) out.push([ST_CC | e.ch, e.controller + 32, e.lsb]);
    return out;
  }
  return [[ST_CC | e.ch, e.controller, e.msb]];
}

// Stuck-state guard: a periodic full-state keyframe plus a 4-byte digest, not RTP-MIDI's journal,
// since a controller's history is one number. Worst case 2 KB; cadence 500 ms.
// why: lessons/kit-cc-adapter.md#ccdigest

/** FNV-1a over the sorted (key, value14) pairs — 4 bytes that change whenever
 *  any controller does. */
export function ccDigest(map) {
  let h = 0x811c9dc5;
  const keys = [...map.keys()].sort();
  for (const k of keys) {
    const s = k + '=' + map.get(k).value14 + ';';
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  }
  return h >>> 0;
}

/** the full-state repair message: every live controller, as raw MIDI. */
export function keyframe(map, tUs) {
  const rows = [];
  for (const e of map.values()) for (const raw of assertBytes(e)) rows.push(raw);
  return { t: 'cc-keyframe', tUs, digest: ccDigest(map), n: map.size, raw: rows };
}

/** apply a keyframe at the receiver: returns rows the reducer can fold. */
export function applyKeyframe(kf) {
  return kf.raw.map((raw) => ({ at: kf.tUs, status: raw[0], d1: raw[1], d2: raw[2],
                                raw, key: keyOf(raw[0], raw[1]), label: labelOf(raw[0], raw[1]) }));
}

// Capture: wall-clock throttle (~10 Hz from 100 to 400 msg/s), never frame decimation. The last
// sample of a gesture is always logged, switches never throttled, a 14-bit pair gated as one.
// why: lessons/kit-cc-adapter.md#makecccapture

export function makeCcCapture({ throttleMs = 100, src = 0, ch = 0, onRow, onRaw, keyframeMs = 500 } = {}) {
  let seq = 0;
  const lastLogged = new Map();   // key -> tUs of last logged sample
  const pending = new Map();      // key -> the newest sample not yet logged
  const rawLane = [];             // FULL-RATE evidence lane {tUs, key, v}
  const rows = [];                // the THROTTLED log (what gets stored/sent)
  let live = new Map();           // the live controller map (for keyframes)
  let lastKeyframeUs = -Infinity;
  const keyframes = [];

  function emit(msgs, tUs, gate) {
    const out = [];
    for (const raw of msgs) {
      const f = decodeFrame(encodeFrame({ status: raw[0], d1: raw[1], d2: raw[2], src, seq, tUs }));
      seq++;
      const row = frameToRow(f);
      row.gate = gate;                       // 'throttle' | 'endpoint' | 'switch'
      rows.push(row); out.push(row);
      onRow && onRow(row, f);
    }
    live = foldRows(rows);
    if (tUs - lastKeyframeUs >= keyframeMs * 1000) {
      lastKeyframeUs = tUs;
      keyframes.push(keyframe(live, tUs));
    }
    return out;
  }

  /** the one gate every control funnels through. `msgs` is the raw message (or
   *  MSB/LSB pair) for ONE logical value change. */
  function offer(key, v14, msgs, tUs, { force = false, isSwitch = false } = {}) {
    rawLane.push({ tUs, key, v: v14 });
    onRaw && onRaw({ tUs, key, v: v14 });
    const last = lastLogged.get(key);
    const due = last === undefined || tUs - last >= throttleMs * 1000;
    if (force || isSwitch || due) {
      lastLogged.set(key, tUs);
      pending.delete(key);
      return emit(msgs, tUs, isSwitch ? 'switch' : force ? 'endpoint' : 'throttle');
    }
    pending.set(key, { msgs, tUs, v14 });
    return [];
  }

  return {
    rows, rawLane, keyframes,
    get live() { return live; },
    digest: () => ccDigest(live),
    cc7(controller, v7, tUs, opts) {
      const v = clamp7(v7);
      return offer(keyOf(ST_CC | ch, controller), v << 7, enc7(ch, controller, v), tUs,
                   { ...opts, isSwitch: SWITCHES.has(controller) });
    },
    cc14(controller, v14, tUs, opts) {
      const v = clamp14(v14);
      return offer(keyOf(ST_CC | ch, controller), v, enc14(ch, controller, v), tUs, opts);
    },
    pb(v14, tUs, opts) {
      const v = clamp14(v14);
      return offer(keyOf(ST_PB | ch, 0), v, encPB(ch, v), tUs, opts);
    },
    /** gesture end: log the newest held-back sample of every key, at its own
     *  original timestamp. This is rule 1 — the endpoint is never thinned. */
    flush(tUs) {
      const out = [];
      for (const [key, p] of [...pending]) {
        lastLogged.set(key, p.tUs); pending.delete(key);
        out.push(...emit(p.msgs, p.tUs, 'endpoint'));
      }
      if (out.length || tUs !== undefined) {
        lastKeyframeUs = -Infinity;
        emitKeyframe(tUs !== undefined ? tUs : (out.length ? out[out.length - 1].at : 0));
      }
      return out;
    },
    reset() { rows.length = 0; rawLane.length = 0; keyframes.length = 0; lastLogged.clear(); pending.clear(); live = new Map(); seq = 0; },
  };
  function emitKeyframe(tUs) { keyframes.push(keyframe(live, tUs)); lastKeyframeUs = tUs; }
}

// Interpolation brackets per series; interpolate() refuses a mismatched pair.
// why: lessons/kit-cc-adapter.md#interpolation

/**
 * Switch series (sustain) are step series, held flat until the next knot, never ramped.
 * why: lessons/kit-cc-adapter.md#isinterpolablekey
 */
export function isInterpolableKey(key) {
  const m = /^cc:\d+:(\d+)$/.exec(key);
  if (!m) return true;                      // pb is continuous
  return !SWITCHES.has(+m[1]);
}

export function ccInterpolate(a, b, u) {
  if (!a) return null;
  if (!isInterpolableKey(a.key || keyOf(a.status, a.d1))) return { ...a, u: 0, interpolated: false, step: true };
  if (!b) return { ...a, u: 0, interpolated: true };
  const ka = a.key || keyOf(a.status, a.d1), kb = b.key || keyOf(b.status, b.d1);
  if (ka !== kb) return null;                       // different series: not interpolable
  const va = valueOfRow(a), vb = valueOfRow(b);
  const v = clamp14(Math.round(va + (vb - va) * Math.max(0, Math.min(1, u))));
  return { ...a, value14: v, u, interpolated: true };
}

export function valueOfRow(r) {
  if (isPB(r.status)) return dec14(r.d2, r.d1);
  if (r.d1 >= 32 && r.d1 < 64) return r.d2;         // a bare LSB row has no standalone value
  return r.d2 << 7;
}

/** Per-key knot series from a row list, for drawing and for value-at-playhead.
 *  A 14-bit pair collapses to ONE knot at the MSB's timestamp. */
export function seriesFromRows(rows, toMs) {
  const out = new Map();
  const acc = new Map();
  for (const r of rows) {
    const key = r.key || keyOf(r.status, r.d1);
    let st = acc.get(key);
    if (!st) acc.set(key, st = { msb: 0, lsb: 0, bits: isPB(r.status) || has14(COARSE(r.d1)) ? 14 : 7 });
    if (isPB(r.status)) { st.msb = r.d2; st.lsb = r.d1; }
    else if (r.d1 < 32) st.msb = r.d2;
    else if (r.d1 < 64) st.lsb = r.d2;
    else { st.msb = r.d2; st.lsb = 0; st.bits = 7; }
    const v = st.bits === 14 ? dec14(st.msb, st.lsb) : st.msb << 7;
    let s = out.get(key);
    // `step` rides on the series, so drawing, valueAt() and the deviation
    // metric cannot disagree about whether a pedal ramps.
    if (!s) out.set(key, s = { key, bits: st.bits, step: !isInterpolableKey(key), label: r.label || labelOf(r.status, r.d1), pts: [] });
    const t = toMs ? toMs(r.at) : r.at / 1000;
    const prev = s.pts[s.pts.length - 1];
    if (prev && Math.abs(prev.t - t) < 1e-9) prev.v = v;   // MSB+LSB share a timestamp
    else s.pts.push({ t, v });
  }
  return out;
}

/** linear value of one series at position t (ms), held flat outside the knots. */
export function valueAt(series, t) {
  const p = series.pts;
  if (!p.length) return null;
  if (t <= p[0].t) return p[0].v;
  if (t >= p[p.length - 1].t) return p[p.length - 1].v;
  let lo = 0, hi = p.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m].t <= t) lo = m; else hi = m; }
  if (series.step) return p[lo].v;              // switches hold, never ramp
  const a = p[lo], b = p[hi];
  const u = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  return a.v + (b.v - a.v) * u;
}

// ---------------------------------------------------------------------------
// THE ADAPTER — the library's {caps, actuate, reduce, assertState} contract.
// ---------------------------------------------------------------------------

/**
 * @param send    (raw:[status,d1,d2], meta) => void — Web MIDI output.send, or
 *                the synthetic voice's param setter. Raw bytes, always.
 * @param resetAllControllers  if true (default) assertState sends CC 121 before
 *                re-stating the map, so seek lands on a KNOWN console rather
 *                than "the fold, plus whatever the previous position left".
 */
/**
 * @param resolveAt  OPTIONAL (key, posMs) => value14 — the INTERPOLATED value of
 *   a series at the seek position. `reduce` is prefix-only by contract, so the
 *   fold can only ever return the last KNOT before t; a continuous kind's
 *   truthful state at t is the point on the LINE between the knots bracketing
 *   t, which needs the first item AFTER t as well. The library has no seam for
 *   that (NOTES.md S2), so the client hands the adapter its own series index and
 *   assertState refines the fold with it. Measured: ~30x closer to the curve.
 */
export function makeCcAdapter({ send, resetAllControllers = true, channels = [0], resolveAt = null, onAssert, onActuate } = {}) {
  // which channel supplied the successor sample: the library's own info.nexts
  // (C4, the sanctioned path) or the client's series index (the workaround).
  const stats = { viaLibrary: 0, viaClientIndex: 0 };
  return {
    successorStats: stats,
    caps: {
      kind: 'cc', domain: 'wall', unit: 'ms',
      // --- what makes this kind CONTINUOUS ---
      continuous: true,
      interpolate: true,
      interpolators: ['linear'], method: 'linear',
      series: (p) => p.key || keyOf(p.status, p.d1),   // series identity within the kind
      // `info.nexts` is 1 + neighbourhood successors of the kind; with S interleaved series you need ~S.
      // 8 covers the demos and is a guess.
      // why: lessons/kit-cc-adapter.md#neighbourhood
      neighbourhood: 8,
      resolution: 14,
      range: [0, 16383],
      // --- transport behaviour ---
      catchUp: 'reduce',        // level-valued: the last value per controller is the truth
      seekable: true, reducible: true, assertOnSeek: true,
      interpolatedAssert: !!resolveAt,   // refine the fold onto the line (seam S2)
      rates: [0.25, 0.5, 1, 2, 4],
      // --- capture-side contract (own-prior-art §3: throttle is part of it) ---
      captureThrottleMs: 100,
      captureNeverThrottle: [...SWITCHES],
      captureEndpointRule: 'always-log-last-sample-of-gesture',
      // --- interop honesty ---
      msbZerosLsb: false,
      repair: 'keyframe',       // not 'journal' — see ccDigest note
      keyframeMs: 500,
      panic: [ALL_SOUND_OFF, ALL_NOTES_OFF, RESET_ALL_CONTROLLERS],
    },

    /** actuate = send the CC. Raw bytes, verbatim, exactly as captured. */
    actuate(p, info) {
      send(p.raw || [p.status, p.d1, p.d2], { ...info, key: p.key, label: p.label });
      onActuate && onActuate(p, info);
    },

    /**
     * reduce(prefix <= t) is the last value per controller number: seek restores the console.
     * why: lessons/kit-cc-adapter.md#reduce
     */
    reduce(payloads) { return foldRows(payloads); },

    /** idempotent: reset to a known console, then re-state every controller the
     *  prefix touched. Called on every seek by the library. */
    assertState(map, info) {
      if (resetAllControllers) {
        for (const ch of channels) send([ST_CC | ch, RESET_ALL_CONTROLLERS, 0], { ...info, reassert: true, reset: true });
      }
      const pos = info && info.pos;
      for (const e of map.values()) {
        let entry = e;
        if (pos !== undefined && isInterpolableKey(e.key)) {
          // PREFERRED: the library's own successor channel (info.nexts), which
          // is what C4 added for continuous kinds. Filter it to THIS series —
          // the library groups by kind, not by controller.
          let v = null;
          const succ = (info.nexts || (info.next ? [info.next] : []))
            .map((ev) => ev && ev.payload).filter(Boolean)
            .find((p) => (p.key || keyOf(p.status, p.d1)) === e.key);
          const sAt = succ && (succ.atMs !== undefined ? succ.atMs : succ.at);
          if (succ && e.atMs !== undefined && sAt > e.atMs) {
            const vb = valueOfRow(succ);
            v = e.value14 + (vb - e.value14) * Math.max(0, Math.min(1, (pos - e.atMs) / (sAt - e.atMs)));
            stats.viaLibrary++;
          } else if (resolveAt) { v = resolveAt(e.key, pos); if (v !== null) stats.viaClientIndex++; }
          if (v !== null && v !== undefined && Number.isFinite(v)) {
            const v14 = clamp14(Math.round(e.bits === 14 ? v : Math.round(v / 128) * 128));
            entry = { ...e, msb: msbOf(v14), lsb: e.bits === 14 ? lsbOf(v14) : 0 };
          }
        }
        for (const raw of assertBytes(entry)) send(raw, { ...info, reassert: true, key: e.key });
      }
      onAssert && onAssert(map, info);
    },

    interpolate: ccInterpolate,
  };
}

// The synthetic voice: a CC-controlled WebAudio instrument, so demos need no hardware.
// why: lessons/kit-cc-adapter.md#cc-defaults

export const CC_DEFAULTS = { 1: 0, 7: 100, 11: 127, 64: 0, 71: 20, 74: 64, pb: 8192 };

export function makeCcVoice(ctx, { destination = ctx.destination, drone = true, gainScale = 0.22 } = {}) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 1200; filter.Q.value = 1;
  const vol = ctx.createGain(); vol.gain.value = 0.0;
  const expr = ctx.createGain(); expr.gain.value = 1;
  filter.connect(expr).connect(vol).connect(destination);

  let osc = null, lfo = null, lfoGain = null;
  if (drone) {
    osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 110;
    lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 5;
    lfoGain = ctx.createGain(); lfoGain.gain.value = 0;
    lfo.connect(lfoGain).connect(osc.detune);
    osc.connect(filter);
    try { osc.start(); lfo.start(); } catch {}
  }

  // the observable console — what the harness asserts against
  const state = { ...CC_DEFAULTS };
  const ramp = 0.012;

  function apply() {
    const t = ctx.currentTime;
    // CC74 cutoff: 14-bit -> 80 Hz..8 kHz, exponential (musical, and it makes a
    // linear knob sweep visibly linear in log-frequency)
    const cut = 80 * Math.pow(100, state[74] / 127);
    filter.frequency.setTargetAtTime(cut, t, ramp);
    filter.Q.setTargetAtTime(0.7 + (state[71] / 127) * 18, t, ramp);
    vol.gain.setTargetAtTime((state[7] / 127) * gainScale, t, ramp);
    expr.gain.setTargetAtTime(state[11] / 127, t, ramp);
    if (lfoGain) lfoGain.gain.setTargetAtTime((state[1] / 127) * 60, t, ramp);
    if (osc) osc.detune.setTargetAtTime(((state.pb - 8192) / 8192) * 200, t, ramp);
  }

  return {
    node: filter, filter, state,
    /** the `send` half of the adapter: raw MIDI bytes in, audio params out. */
    send(raw) {
      const [status, d1, d2] = raw;
      if (isPB(status)) { state.pb = dec14(d2, d1); }
      else if (isCC(status)) {
        if (d1 === RESET_ALL_CONTROLLERS) { Object.assign(state, CC_DEFAULTS); }
        else if (d1 >= 32 && d1 < 64) { /* LSB: finer than this voice hears; kept in the log */ }
        else state[d1] = d2;
      }
      apply();
    },
    setGain(g) { vol.gain.value = g; },
    dispose() { try { osc && osc.stop(); lfo && lfo.stop(); } catch {} },
  };
}

// The send gate for a live hand: endpoint never gated, gate per controller, switches never gated.
// One message per controller per 20 ms board frame; all due controllers in one message; a full
// statement every `restateMs` is the only repair a level plane needs.
// why: lessons/kit-cc-adapter.md#send-gate-ms

/** One message per controller per audio frame. The board's frame is 20 ms. */
export const SEND_GATE_MS = 20;
/** How often the whole console is restated, even with nothing moving. */
export const RESTATE_MS = 500;

/**
 * @param gateMs     one message per controller per this many ms
 * @param restateMs  full-console restatement cadence
 * @returns an object whose `put` records a move and whose `tick` returns the
 *          message to send, or null. Pure: it holds no socket and no clock, so
 *          `demo/shell/cc-send-test.mjs` grades it with neither.
 */
export function makeCcSend({ gateMs = SEND_GATE_MS, restateMs = RESTATE_MS } = {}) {
  const live = new Map();          // controller -> the value last SENT
  const pending = new Map();       // controller -> {v, end, isSwitch} not yet sent
  const lastSent = new Map();      // controller -> when this controller last went
  let lastRestate = null;
  const stats = { offered: 0, sent: 0, messages: 0, thinned: 0, restated: 0 };

  return {
    stats,
    get live() { return new Map(live); },

    /**
     * A hand moved. `end` marks the last value of a gesture, which is what
     * `createSlider`'s `onChange` is and what `onInput` is not.
     */
    put(controller, value, { end = false } = {}) {
      stats.offered++;
      const c = controller | 0;
      /**
       * A value is thinned when another overtakes it, not when a tick finds it early, so
       * `offered` = `sent` + `thinned` + waiting, a conservation the test checks.
       * why: lessons/kit-cc-adapter.md#thinned
       */
      if (pending.has(c)) stats.thinned++;
      pending.set(c, { v: clamp7(value), end, isSwitch: SWITCHES.has(c) });
    },

    /**
     * Called on a frame or a timer. Returns `{ set: [[controller, value], …] }`
     * for everything due now, or null when there is nothing to say.
     */
    tick(tMs) {
      const set = [];
      for (const [c, p] of [...pending]) {
        const last = lastSent.get(c);
        const due = last === undefined || tMs - last >= gateMs;
        // rules 1 and 3: neither waits for the gate
        if (!due && !p.end && !p.isSwitch) continue;   // held, not thinned: see `put`
        pending.delete(c);
        lastSent.set(c, tMs);
        live.set(c, p.v);
        set.push([c, p.v]);
      }
      if (set.length) {
        stats.sent += set.length;
        stats.messages++;
        lastRestate = tMs;
        return { set };
      }
      // rule 4: the console, restated, so a lost LAST value repairs itself
      if (live.size && (lastRestate === null || tMs - lastRestate >= restateMs)) {
        lastRestate = tMs;
        stats.messages++;
        stats.restated++;
        return { set: [...live].map(([c, v]) => [c, v]), restate: true };
      }
      return null;
    },

    /** Forget everything, for a page that has just reconnected. */
    reset() {
      live.clear(); pending.clear(); lastSent.clear(); lastRestate = null;
      for (const k of Object.keys(stats)) stats[k] = 0;
    },
  };
}
