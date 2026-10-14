// demo/shell/source.mjs: one description of a sound, built on the board and checked at
// the input. A shape is a table of sine partials, the one thing every engine makes
// identically, so two ends compare partial by partial.
// why: lessons/kit-source.md#header

/** What a source is. Everything here is exact in any engine. */
export const DEFAULT = {
  shape: 'saw',      // a NAME for a partial table — see `partials()`
  count: 12,         // how many partials survive. This is the brightness knob.
  hz: 110,           // the fundamental
  chord: [0, 7, 12, 16],   // semitone offsets, one voice each
  level: 0.16,       // peak of the summed result, before the granulator
  spread: 0,         // cents of detune across the chord, widest at the top
};

/**
 * The shapes, as ideal amplitude tables (`n` is 1-based); truncating at `count` is the
 * band-limiting, shared by both ends.
 * why: lessons/kit-source.md#shapes
 */
export const SHAPES = {
  sine:   (n) => (n === 1 ? 1 : 0),
  saw:    (n) => 1 / n,
  square: (n) => (n % 2 ? 1 / n : 0),
  // A third that is neither, so `shape` is not secretly a two-way switch: odd
  // partials falling off fast, which is a hollow clarinet-ish tone and gives a
  // granulator something with a different spectrum to chew.
  hollow: (n) => (n % 2 ? 1 / (n * n) : 0),
};

/**
 * The spec expanded into every sine to make: `[{hz, amp}]`. Pure, so testable without
 * audio. Nothing above Nyquist: the list stops and reports how many it dropped.
 * why: lessons/kit-source.md#partials-of
 */
export function partialsOf(spec = {}, rate = 48000) {
  const s = { ...DEFAULT, ...spec };
  const amp = SHAPES[s.shape] || SHAPES.saw;
  const nyq = rate / 2;
  const out = [];
  let dropped = 0;
  s.chord.forEach((semi, v) => {
    // the spread widens up the chord, so the top voice is the detuned one — a
    // uniform detune is a tuning error, a graded one is width
    const cents = s.spread * (s.chord.length > 1 ? v / (s.chord.length - 1) : 0);
    const f0 = s.hz * Math.pow(2, semi / 12) * Math.pow(2, cents / 1200);
    for (let n = 1; n <= s.count; n++) {
      const a = amp(n);
      if (a === 0) continue;
      const f = f0 * n;
      if (f >= nyq) { dropped++; continue; }
      out.push({ hz: f, amp: a, voice: v, partial: n });
    }
  });
  // Normalise to the requested LEVEL as a peak, which is the quantity a
  // granulator's input gain cares about — every partial in phase at t=0, so
  // this is the true worst case rather than an rms guess.
  const sum = out.reduce((t, p) => t + p.amp, 0) || 1;
  const k = s.level / sum;
  for (const p of out) p.amp *= k;
  return { spec: s, partials: out, dropped, rate };
}


/**
 * The spec as a board message. It sends the spec, not partials: both ends run `partialsOf`.
 * why: lessons/kit-source.md#source-message
 */
export const sourceMessage = (spec = {}) => ({ type: 'source.set', spec: { ...DEFAULT, ...spec } });

/**
 * How far apart two measurements of the same spec are, partial by partial: worst and
 * median dB, and which partial was worst. `measured` is `[{hz, amp}]`.
 * why: lessons/kit-source.md#compare-source
 */
export function compareSource(plan, measured) {
  const rows = [];
  for (const p of plan.partials) {
    const m = measured.find((x) => Math.abs(x.hz - p.hz) < Math.max(1, p.hz * 0.01));
    if (!m) { rows.push({ ...p, missing: true, db: Infinity }); continue; }
    const db = 20 * Math.log10(Math.max(1e-9, m.amp) / Math.max(1e-9, p.amp));
    rows.push({ ...p, measuredAmp: m.amp, db: Math.abs(db) });
  }
  const finite = rows.filter((r) => Number.isFinite(r.db)).map((r) => r.db).sort((a, b) => a - b);
  const worst = rows.reduce((w, r) => (r.db > (w?.db ?? -1) ? r : w), null);
  return {
    rows,
    missing: rows.filter((r) => r.missing).length,
    medianDb: finite.length ? finite[finite.length >> 1] : Infinity,
    worstDb: worst?.db ?? Infinity,
    worstAt: worst ? `partial ${worst.partial} of voice ${worst.voice} at ${Math.round(worst.hz)} Hz` : null,
  };
}
