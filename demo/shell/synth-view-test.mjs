// demo/shell/synth-view-test.mjs: the arithmetic behind the three synth figures, no browser.
// Checks are comparisons, not shapes. No canvas is opened and no constructor called: pixels are graded
// on /kit/. The filter's not-a-measurement promise is checked as source text.
// why: lessons/kit-synth-view.md#test-header

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shapeFor, waveSample, wavePoints, WAVE_SHAPES, traceOf, onsetIndex, captureTrace,
  envelopePath, HOLD_SHARE,
  filterShapeFor, filterCurve, DB_TOP, DB_FLOOR, Q_MIN, Q_MAX,
} from './synth-view.mjs';
import { OSC_WAVES, LFO_WAVES, FILTER_TYPES, FIRST_WAVETABLE } from './circuit-patch.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
function ok(what, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${what}${detail ? `  ${detail}` : ''}`); return; }
  fail++;
  console.log(`  FAIL ${what}${detail ? `  ${detail}` : ''}`);
}

// ── which waves have a shape, and which do not ─────────────────────────────
ok('the four textbook names map to the four shapes',
  shapeFor('sine') === 'sine' && shapeFor('triangle') === 'triangle'
  && shapeFor('sawtooth') === 'saw' && shapeFor('square') === 'square');

// `saw 9:1 PW` contains saw and is not a sawtooth; a substring test would draw nine wrong ramps.
// why: lessons/kit-synth-view.md#test-substring
ok('NEGATIVE CONTROL: a name that merely contains a shape word is refused',
  shapeFor('saw 9:1 PW') === null && shapeFor('saw 5:5 PW') === null
  && shapeFor('sine table') === null && shapeFor('triangle-saw blend') === null,
  'four names that share a word with a shape and are not that shape');

ok('a pulse is never derived from a name, because no name carries a duty cycle',
  shapeFor('pulse width') === null && WAVE_SHAPES.includes('pulse'));

ok('nothing at all still answers nothing',
  shapeFor('') === null && shapeFor(null) === null && shapeFor(undefined) === null);

// The exact drawable count against the real table, so the header and the page cannot drift apart.
// why: lessons/kit-synth-view.md#test-real-count
{
  const drawn = OSC_WAVES.filter((n) => shapeFor(n));
  const tables = OSC_WAVES.slice(FIRST_WAVETABLE);
  ok('4 of the Circuit\'s 30 oscillator waves have a shape this can derive',
    OSC_WAVES.length === 30 && drawn.length === 4,
    `${drawn.join(', ')}`);
  // FIRST_WAVETABLE is 14 plain waveforms, so slice(14) is 16 wavetables. 26 of 30 have no drawable shape.
  // why: lessons/kit-synth-view.md#test-sixteen
  ok('16 of the 30 are wavetables, which have no single shape by definition',
    tables.length === 16 && tables.every((n) => shapeFor(n) === null)
    && OSC_WAVES.length - drawn.length === 26,
    `14 plain waveforms and ${tables.length} wavetables, `
    + `${OSC_WAVES.length - drawn.length} refused in all`);
  const lfo = LFO_WAVES.filter((n) => shapeFor(n));
  ok('4 of the 38 LFO waves have one too, and the other 34 are sequences and scales',
    LFO_WAVES.length === 38 && lfo.length === 4, lfo.join(', '));
}

// ── the shapes themselves ──────────────────────────────────────────────────
ok('a sine leaves at nothing, reaches full a quarter of the way and comes back',
  Math.abs(waveSample('sine', 0)) < 1e-12
  && Math.abs(waveSample('sine', 0.25) - 1) < 1e-12
  && Math.abs(waveSample('sine', 0.75) + 1) < 1e-12);

ok('a triangle turns at the quarter and at the three quarter and is straight between',
  Math.abs(waveSample('triangle', 0)) < 1e-12
  && Math.abs(waveSample('triangle', 0.25) - 1) < 1e-12
  && Math.abs(waveSample('triangle', 0.5)) < 1e-12
  && Math.abs(waveSample('triangle', 0.75) + 1) < 1e-12);

ok('a sawtooth is one straight ramp with one jump in it',
  Math.abs(waveSample('saw', 0) + 1) < 1e-12
  && Math.abs(waveSample('saw', 0.5)) < 1e-12
  && Math.abs(waveSample('saw', 0.999999) - 1) < 1e-5
  && Math.abs(waveSample('saw', 0.25) - waveSample('saw', 0.75) + 1) < 1e-12);

ok('a square is two levels and nothing between them',
  waveSample('square', 0.1) === 1 && waveSample('square', 0.6) === -1);

ok('a pulse is a square only at half, and narrows with its duty',
  waveSample('pulse', 0.3, { duty: 0.5 }) === 1
  && waveSample('pulse', 0.3, { duty: 0.2 }) === -1);

ok('a shape this file cannot derive answers NaN rather than a number',
  Number.isNaN(waveSample('digital nasty 1', 0.5)));

{
  const p = wavePoints('sine', 200, { cycles: 2 });
  // Two cycles: one cycle of a square and of a half duty pulse are the same picture.
  // why: lessons/kit-synth-view.md#test-two-cycles
  let zeros = 0;
  for (let i = 1; i < p.length; i++) if (p[i - 1] < 0 && p[i] >= 0) zeros++;
  ok('two cycles really are two, counted as upward crossings',
    zeros === 2, `${zeros} times it comes back up through the middle`);
  ok('nothing drawn ever leaves the box',
    p.every((v) => v >= -1 && v <= 1));
  ok('a shape with no definition gives no points at all',
    wavePoints('digital vocal 3', 200) === null);
}

// ── two traces in one picture ──────────────────────────────────────────────
{
  /**
   * Samples outrank a derived shape: the refusal is about guessing, and a reading beats a textbook shape.
   * why: lessons/kit-synth-view.md#test-samples
   */
  const measured = traceOf({ name: 'digital nasty 1', points: [0, 0.5, -0.5, 0] });
  ok('a trace with real samples is drawn even where its NAME would be refused',
    measured.pts && measured.pts.length === 4 && shapeFor('digital nasty 1') === null,
    `${measured.pts.length} samples under a name that has no shape`);

  ok('a trace with no samples still derives its shape from its name',
    traceOf({ name: 'sawtooth' }).pts.length === 512
    && traceOf({ name: 'sawtooth' }).shape === 'saw');

  // NEGATIVE CONTROL: no samples and no derivable name is still a refusal.
  // why: lessons/kit-synth-view.md#test-no-samples
  ok('NEGATIVE CONTROL: no samples and no derivable name is still nothing to draw',
    traceOf({ name: 'digital nasty 1' }).pts === null
    && traceOf({ name: 'saw 5:5 PW', points: [] }).pts === null,
    'an empty sample list is not evidence either');

  /* Two traces are two inks, and the default second is the highlight rather
     than a second grey, because the whole point is telling them apart. */
  ok('the two traces carry different inks, and a caller may name either',
    traceOf({ name: 'sine' }).colour === '--dim'
    && traceOf({ name: 'sine' }, '--hi').colour === '--hi'
    && traceOf({ name: 'sine', colour: '#7fb2ff' }, '--hi').colour === '#7fb2ff',
    'first --dim, second --hi, and a literal wins over both');
}

// ── the envelope ───────────────────────────────────────────────────────────
{
  const e = envelopePath({ attack: 20, decay: 60, sustain: 90, release: 40, max: 127 });
  ok('an envelope is six points and they never go backwards',
    e.points.length === 6 && e.points.every((p, i) => i === 0 || p.x >= e.points[i - 1].x));
  ok('it fills the picture exactly, left edge to right edge',
    Math.abs(e.end - 1) < 1e-12, `ends at ${e.end}`);
  ok('the peak is full and it is at the end of the attack',
    e.points[2].y === 1 && e.points[2].x > e.points[1].x);
  ok('the sustain is a LEVEL, and it is the setting over the scale',
    Math.abs(e.sustain - 90 / 127) < 1e-12 && e.points[3].y === e.sustain
    && e.points[4].y === e.sustain, `${e.sustain.toFixed(4)}`);
  ok('it ends at nothing, which is what a release is',
    e.points[5].y === 0);
  ok('the sustain hold takes its share of the width and the timed stages share the rest',
    Math.abs(e.stages.hold - HOLD_SHARE) < 1e-12
    && Math.abs(e.stages.attack + e.stages.decay + e.stages.release + e.stages.delay
      - (1 - HOLD_SHARE)) < 1e-12);

  // Each stage is moved alone and only its own stage may change, catching a field read twice.
  // why: lessons/kit-synth-view.md#test-stages
  const base = { attack: 20, decay: 20, sustain: 64, release: 20, max: 127 };
  const longA = envelopePath({ ...base, attack: 100 });
  const longR = envelopePath({ ...base, release: 100 });
  ok('a longer attack widens the attack and a longer release widens the release',
    longA.stages.attack > envelopePath(base).stages.attack
    && longR.stages.release > envelopePath(base).stages.release,
    `attack ${envelopePath(base).stages.attack.toFixed(3)} to ${longA.stages.attack.toFixed(3)}`);
  ok('NEGATIVE CONTROL: moving the attack does not move the release, and the other way round',
    Math.abs(longA.stages.release - longR.stages.attack) < 1e-12
    && longA.stages.release < longR.stages.release);

  const flat = envelopePath({ attack: 0, decay: 0, sustain: 100, release: 0, max: 127 });
  // Every stage at zero is a real setting and must still fill the box (no divide by zero).
  // why: lessons/kit-synth-view.md#test-all-zero
  ok('an envelope with no lengths at all still fills the picture and says so',
    flat.silent === true && Math.abs(flat.end - 1) < 1e-12 && flat.stages.hold === 1,
    `hold ${flat.stages.hold}, ends at ${flat.end}`);

  const three = envelopePath({ delay: 40, attack: 10, decay: 30, sustain: 64, release: 30, max: 127 });
  ok('a delay stage pushes the whole shape right, which is what Env 3 has and Env 1 does not',
    three.points[1].x > 0 && three.stages.delay > 0,
    `the rise starts at ${three.points[1].x.toFixed(3)} of the width`);
}

// ── which filter a name names ──────────────────────────────────────────────
{
  const read = FILTER_TYPES.map((n) => [n, filterShapeFor(n)]);
  ok('all six of the Circuit\'s filter types are read out of their own names',
    FILTER_TYPES.length === 6 && read.every(([, s]) => s !== null),
    read.map(([n, s]) => `${n} is ${s.poles} pole ${s.kind}`).join(', '));
  ok('twelve decibels is two poles and twenty four is four, because six is one',
    filterShapeFor('low pass 12dB').poles === 2
    && filterShapeFor('low pass 24dB').poles === 4
    && filterShapeFor('high pass 24dB').kind === 'hp');
  ok('a band pass counts both sides, so 6/6 is two poles and 12/12 is four',
    filterShapeFor('band pass 6/6 dB').poles === 2
    && filterShapeFor('band pass 12/12 dB').poles === 4);
  /* A name this cannot read is refused rather than drawn as the default, which
     is the same rule the waveform follows and for the same reason. */
  ok('NEGATIVE CONTROL: a name that does not say which filter it is gets no curve',
    filterShapeFor('comb') === null && filterShapeFor('low pass') === null
    && filterShapeFor('') === null && filterShapeFor('notch 12dB') === null);
}

// ── the response, which is a schematic and still has to be the right one ───
{
  const at = (c, u) => c.y[Math.round(u * (c.y.length - 1))];
  const lp = filterCurve({ kind: 'lp', poles: 2, freq: 64, resonance: 0 });
  const hp = filterCurve({ kind: 'hp', poles: 2, freq: 64, resonance: 0 });
  const bp = filterCurve({ kind: 'bp', poles: 2, freq: 64, resonance: 0 });

  ok('every point of every curve is inside the box',
    [lp, hp, bp].every((c) => c.y.every((v) => v >= 0 && v <= 1)));

  ok('a low pass is high at the bottom and low at the top',
    at(lp, 0.05) > at(lp, 0.95) && at(lp, 0.05) > 0.5);
  ok('a high pass is the other way round',
    at(hp, 0.95) > at(hp, 0.05) && at(hp, 0.95) > 0.5);
  // The two kinds must disagree at both ends, which only happens if the type is read.
  // why: lessons/kit-synth-view.md#test-type-read
  ok('NEGATIVE CONTROL: the two disagree at both ends, so the type is really read',
    at(lp, 0.05) > at(hp, 0.05) && at(hp, 0.95) > at(lp, 0.95),
    `at the bottom ${at(lp, 0.05).toFixed(3)} against ${at(hp, 0.05).toFixed(3)}, `
    + `at the top ${at(lp, 0.95).toFixed(3)} against ${at(hp, 0.95).toFixed(3)}`);

  ok('a band pass is highest near its corner and falls away on both sides',
    Math.abs(bp.peakAt - bp.cornerAt) < 0.05
    && at(bp, 0.05) < at(bp, bp.cornerAt) && at(bp, 0.95) < at(bp, bp.cornerAt),
    `peak at ${bp.peakAt.toFixed(3)} against a corner at ${bp.cornerAt.toFixed(3)}`);

  const lo = filterCurve({ kind: 'lp', poles: 2, freq: 20, resonance: 0 });
  const hi = filterCurve({ kind: 'lp', poles: 2, freq: 110, resonance: 0 });
  ok('the corner moves when the cutoff parameter moves',
    lo.cornerAt < lp.cornerAt && lp.cornerAt < hi.cornerAt
    && at(lo, 0.5) < at(hi, 0.5),
    `corners at ${lo.cornerAt.toFixed(2)}, ${lp.cornerAt.toFixed(2)} and ${hi.cornerAt.toFixed(2)}`);

  const res = filterCurve({ kind: 'lp', poles: 2, freq: 64, resonance: 120 });
  ok('resonance lifts the corner above the passband',
    res.peakDb > lp.peakDb + 6 && Math.abs(res.peakAt - res.cornerAt) < 0.06,
    `peak ${res.peakDb.toFixed(1)} dB against ${lp.peakDb.toFixed(1)} with none`);
  ok('and it does not move the passband itself',
    Math.abs(at(res, 0.02) - at(lp, 0.02)) < 0.02,
    `${at(res, 0.02).toFixed(4)} against ${at(lp, 0.02).toFixed(4)}`);

  const p4 = filterCurve({ kind: 'lp', poles: 4, freq: 64, resonance: 0 });
  /* Four poles is twice the slope, so one octave past the corner the two have
     to be visibly apart. The picture is 10 octaves wide, so one octave is a
     tenth of it. */
  const oneOct = lp.cornerAt + 0.1;
  ok('four poles falls away faster than two, measured one octave past the corner',
    at(p4, oneOct) < at(lp, oneOct) - 0.02,
    `${at(p4, oneOct).toFixed(3)} against ${at(lp, oneOct).toFixed(3)}`);
  ok('NEGATIVE CONTROL: and the two are the same curve in the passband, so poles are a slope',
    Math.abs(at(p4, 0.02) - at(lp, 0.02)) < 0.05);

  ok('the scale is what the two constants say and zero decibels sits inside it',
    DB_TOP === 18 && DB_FLOOR === -48
    && lp.zeroY > 0 && lp.zeroY < 1, `0 dB is ${lp.zeroY.toFixed(3)} up the box`);
  ok('the resonance scale starts flat and ends somewhere worth looking at',
    Q_MIN < 1 && Q_MAX >= 10);
}

// Triggered scope: 1000 samples at 1000 Hz ending at 10 s, a hit at sample 700. Controls: a 3 ms
// clock error still finds sample 700, a window past the end is -1, and a one sample spike survives.
// why: lessons/kit-synth-view.md#test-scope
{
  const buf = new Float32Array(1000);
  for (let i = 700; i < 760; i++) buf[i] = i % 2 ? 0.8 : -0.8;
  const at = onsetIndex(buf, { rate: 1000, end: 10, onset: 9.7, windowS: 0.2 });
  ok('triggered: the onset is found where the clock says the hit is', at === 700, `index ${at}`);
  const slop = onsetIndex(buf, { rate: 1000, end: 10, onset: 9.697, windowS: 0.2 });
  ok('triggered: 3 ms of clock slop still lands on the same edge, so traces do not jitter', slop === 700, `index ${slop}`);
  const late = onsetIndex(buf, { rate: 1000, end: 10, onset: 9.9, windowS: 0.2 });
  ok('NEGATIVE CONTROL triggered: a window that would run past the buffer is refused, not padded', late === -1, `index ${late}`);
  const spike = new Float32Array(1000); spike[503] = -0.9;
  const tr = captureTrace(spike, 0, 1000, 100);
  ok('triggered: the capture keeps a one sample spike, sign and all', Math.min(...tr) === Math.fround(-0.9) && tr.length === 100,
    `min ${Math.min(...tr).toFixed(2)} over ${tr.length} points`);
  const same = captureTrace(buf, 700, 200, 50), again = captureTrace(buf, 700, 200, 50);
  ok('triggered: the same window gives the same trace, which is what holding still means',
    same.every((x, i) => x === again[i]) && same[0] !== 0, `${same.length} points, first ${same[0]}`);
}

// ── what the file says about itself ────────────────────────────────────────
{
  const src = fs.readFileSync(path.join(HERE, 'synth-view.mjs'), 'utf8');
  /**
   * synth-view.mjs with comments removed. Assert an absence over `code` only, a presence over either:
   * an absence over the whole file grades the prose.
   * why: lessons/kit-synth-view.md#test-code-only
   */
  const code = src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

  // The promise that makes a drawn response curve acceptable, read as text; /kit/ grades the pixels.
  // why: lessons/kit-synth-view.md#test-schematic
  ok('the filter paints the word schematic into its own picture',
    /f\.say\('schematic'/.test(src) && src.includes('THE FILTER CURVE IS A SCHEMATIC'));
  ok('the envelope paints what its axis is not',
    src.includes('proportions, not seconds'));
  ok('no frequency in hertz and no decibel figure is ever printed on the filter',
    !/'\d+ ?Hz'/.test(code) && !/`\$\{[^`]*\} ?Hz`/.test(code));

  /* No frame loop anywhere: a still picture asking for animation frames is a
     phone's battery going with nothing on screen saying so. */
  ok('nothing here asks for an animation frame',
    !code.includes('requestAnimationFrame'));

  ok('the height is a custom property, so a page can still override it',
    code.includes("setProperty('--sv-h'") && !/canvas\.style\.height\s*=/.test(code));

  ok('nothing in here sends anything anywhere',
    !code.includes('fetch(') && !code.includes('WebSocket')
    && !code.includes('AudioContext') && !code.includes('midi'));

  // `not drawn` is in the aria-label only: the empty picture already says it, and a reader with
  // no picture needs the words.
  // why: lessons/kit-synth-view.md#test-not-drawn
  ok('the refusal is announced and no longer painted',
    !/f\.say\('not drawn'/.test(code) && /not drawn: \$\{v\.reason/.test(code),
    'off the canvas, still in the aria-label');

  // One constant for the bottom gap: the refusal and the drawn name both sit on PAD and foot.
  // why: lessons/kit-synth-view.md#test-one-pad
  ok('the refusal sits on the same baseline the drawn name does, off the card\'s one padding',
    /f\.say\(v\.reason \|\| NO_SHAPE, PAD, foot,/.test(code)
    && /f\.say\(v\.name \|\| 'no wave', PAD, foot - 13,/.test(code),
    'foot and PAD, and no second number for the same gap');

  const dash = String.fromCharCode(0x2014), middot = String.fromCharCode(0x00b7);
  ok('no em dash and no middot anywhere in the module, comments included',
    !src.includes(dash) && !src.includes(middot),
    `${src.split('\n').length} lines`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
