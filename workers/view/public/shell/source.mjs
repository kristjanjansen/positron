// demo/shell/source.mjs — ONE description of a sound, built in two places.
//
// 🔴 WHY THIS EXISTS. `grains` draws two granulators side by side — one in the
// page, one on a Raspberry Pi — and they sound nothing alike. Every reason is
// structural (plans/plan-twins.md), and the biggest by a distance is that they are
// not chewing the same thing: the page granulates six sawtooth oscillators and
// the board granulates whatever instrument happens to be running. A page that
// puts two panes side by side is claiming they are comparable, and until the
// material is the same that claim is false.
//
// So: one spec, two builders, and a check at the INPUT rather than at the
// output — measuring at the output measures the granulator too, and an A/B
// where both arms share a defect returns "identical", which reads as fine.
//
// ─────────────────────────────────────────────────────────────────────────────
// 🔴 ADDITIVE, AND THAT IS THE WHOLE DESIGN DECISION.
//
// The obvious spec is "a sawtooth at 110 Hz". It does not survive contact with
// two engines. WebAudio's `OscillatorNode` with `type: 'sawtooth'` is
// band-limited by a wavetable the spec does not pin down; SuperCollider's
// `Saw.ar` is band-limited by a different method; a Csound `vco2` is a third.
// All three are sawtooths and none of them is the SAME sawtooth — they differ
// in harmonic rolloff, in how many partials survive near Nyquist, and in phase.
// "The same input" would then be a hope, and the check written against it would
// pass or fail on which engine happened to roll off sooner.
//
// A SINE is the one waveform every synthesis engine produces identically. So a
// shape here is a TABLE OF PARTIALS — sine amplitudes at integer multiples of a
// fundamental — and `saw` is a name for a particular table rather than a
// primitive. Both ends build the same sum of sines from the same numbers, the
// difference between them is measurable partial by partial, and `partials`
// becomes an honest brightness control instead of an implementation detail.
//
// ⚠️ It is also the only version where the input check can say anything. "Both
// ends read 0.16 rms" is satisfied by two completely different sounds; "every
// partial is within x dB of its twin, and there is nothing above partial N in
// either" is not.

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
 * The shapes, as amplitude tables. `n` is the partial number, 1-based.
 *
 * ⚠️ These are the IDEAL series, not an approximation of an oscillator. A saw
 * is 1/n over every partial and a square is 1/n over the odd ones — that is the
 * definition, and truncating it at `count` is exactly what band-limiting is.
 * Writing it down this way means the truncation is a number both ends share
 * rather than a property of somebody's wavetable.
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
 * The spec, expanded into every sine that has to be made: `[{hz, amp}]`.
 *
 * PURE, and that is what makes it testable with no audio at all. The board's
 * builder and the page's builder both consume this list, so a disagreement
 * between them is a disagreement about SYNTHESIS rather than about arithmetic,
 * which is a much smaller thing to chase.
 *
 * ⚠️ NOTHING ABOVE NYQUIST. A partial past half the sample rate does not fold
 * over politely — it aliases down to a frequency that is in neither engine's
 * table, and the input check would then be comparing two different mistakes.
 * The list simply stops, and `partialsOf` reports how many it dropped.
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
 * The page's builder: one `OscillatorNode` per partial into one gain.
 *
 * ⚠️ SINE ONLY. The whole argument above collapses if this reaches for
 * `type: 'sawtooth'` as a shortcut for twelve sines — that is the
 * implementation-defined wavetable this module exists to avoid, and it would
 * look identical on screen while being a different sound from the board's.
 */
export function buildSource(ctx, spec = {}, { destination } = {}) {
  const plan = partialsOf(spec, ctx.sampleRate);
  const out = ctx.createGain();
  out.gain.value = 1;
  const oscs = [];
  for (const p of plan.partials) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = p.hz;
    const g = ctx.createGain();
    g.gain.value = p.amp;
    o.connect(g).connect(out);
    o.start();
    oscs.push({ o, g, p });
  }
  if (destination) out.connect(destination);
  return {
    node: out,
    plan,
    /** Rebuild in place: frequencies and gains move, nothing is restarted. */
    set(next) {
      const re = partialsOf({ ...plan.spec, ...next }, ctx.sampleRate);
      // A changed partial COUNT changes how many oscillators there should be,
      // and this deliberately does not grow or shrink the bank — it silences
      // what is no longer in the table and leaves it in place, so a sweep of
      // `count` costs no allocation and no click.
      for (let i = 0; i < oscs.length; i++) {
        const p = re.partials[i];
        if (!p) { oscs[i].g.gain.setTargetAtTime(0, ctx.currentTime, 0.02); continue; }
        oscs[i].o.frequency.setTargetAtTime(p.hz, ctx.currentTime, 0.02);
        oscs[i].g.gain.setTargetAtTime(p.amp, ctx.currentTime, 0.02);
      }
      plan.spec = re.spec;
      plan.partials = re.partials;
      return re;
    },
    stop() { for (const { o } of oscs) { try { o.stop(); } catch { /* already */ } } },
  };
}

/**
 * The same spec as something the board can build, over the wire.
 *
 * It sends the SPEC and not the partial list, because both ends run
 * `partialsOf` — which is the point. A wire carrying the expanded list would
 * make the page the authority on arithmetic the board is perfectly able to do,
 * and the two would silently diverge the first time one of them was updated.
 */
export const sourceMessage = (spec = {}) => ({ type: 'source.set', spec: { ...DEFAULT, ...spec } });

/**
 * How far apart two measurements of the same spec are, partial by partial.
 *
 * `measured` is `[{hz, amp}]` read off a real signal at each expected
 * frequency. Returns the worst and median difference in dB, and — the part
 * that matters — WHICH partial was worst, because "the input differs by 4 dB"
 * and "the input differs by 4 dB at partial 11 of 12" are different findings.
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
