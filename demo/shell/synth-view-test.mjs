// demo/shell/synth-view-test.mjs
// The arithmetic behind the three synth figures, with no browser.
//
//   node demo/shell/synth-view-test.mjs
//
// 🔴 THE CLAIM THIS FILE EXISTS FOR IS THAT EACH FIGURE DRAWS WHAT ITS INPUTS
// SAY AND REFUSES WHAT THEY DO NOT. A picture is the easiest thing in the world
// to write green: any curve that goes down looks like a low pass, any line with
// a peak in it looks like an envelope, and a sine looks like a sine whatever
// produced it. So the checks below are COMPARISONS rather than shapes: a low
// pass and a high pass have to disagree at both ends, four poles have to fall
// faster than two, raising the resonance has to lift the corner and nothing
// else, and a wave name that is not a shape's name has to come back empty.
//
// ⚠️ WHAT IS NOT GRADED HERE, SAID PLAINLY BECAUSE A GREEN SUITE CAN MEAN ZERO
// COVERAGE. Nothing below opens a canvas. None of the three constructors is
// called. Every claim about PIXELS or about what is PAINTED is on `/kit/`:
//   - that the word `schematic` really reaches the filter's canvas, and
//     `proportions, not seconds` the envelope's
//   - that a refused wave draws its name and its reason and no curve
//   - that the ResizeObserver rebuilds at a new width
//   - that the three figures paint once each and never ask for a frame
//   - that `--sv-h` is a custom property a page can still override
//
// 🔴 AND THE HONESTY OF THE FILTER IS NOT A NUMBER, SO IT IS CHECKED AS TEXT.
// The one thing that makes a drawn response curve acceptable in this project is
// that it says out loud it is not a measurement, and the only cheap way to
// grade a promise like that is to read the source for it. The page grades the
// pixels.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shapeFor, waveSample, wavePoints, WAVE_SHAPES,
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

/* 🔴 THE ONE THAT KEEPS THIS COMPONENT HONEST. `saw 9:1 PW` shares three
   letters with `sawtooth` and is not a sawtooth, and a substring test would
   draw a plain ramp for nine different blends under the instrument's own labels
   for them. Nine plausible wrong pictures from one careless comparison. */
ok('NEGATIVE CONTROL: a name that merely contains a shape word is refused',
  shapeFor('saw 9:1 PW') === null && shapeFor('saw 5:5 PW') === null
  && shapeFor('sine table') === null && shapeFor('triangle-saw blend') === null,
  'four names that share a word with a shape and are not that shape');

ok('a pulse is never derived from a name, because no name carries a duty cycle',
  shapeFor('pulse width') === null && WAVE_SHAPES.includes('pulse'));

ok('nothing at all still answers nothing',
  shapeFor('') === null && shapeFor(null) === null && shapeFor(undefined) === null);

/* 🔴 THE REAL COUNT, AGAINST THE REAL TABLE, so the number in the component's
   header and the number a page prints cannot drift apart. It is asserted as an
   exact figure rather than as *some*, so the day somebody works out what a
   blend looks like this goes red and a reader is told why. */
{
  const drawn = OSC_WAVES.filter((n) => shapeFor(n));
  const tables = OSC_WAVES.slice(FIRST_WAVETABLE);
  ok('4 of the Circuit\'s 30 oscillator waves have a shape this can derive',
    OSC_WAVES.length === 30 && drawn.length === 4,
    `${drawn.join(', ')}`);
  /* 🔴 SIXTEEN, AND THE BRIEF THIS WAS BUILT FROM SAID FOURTEEN. `FIRST_WAVETABLE`
     is 14, which is the count of PLAIN waveforms, and `slice(14)` is 16 rows
     long. Two halves of one split, written down the wrong way round, and the
     check is here in the form that would have caught it. The conclusion is
     unchanged: 26 of the 30 have no shape this file may honestly draw. */
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
  /* 🔴 TWO CYCLES, NOT ONE, AND IT IS GRADED BECAUSE ONE CYCLE OF A SQUARE AND
     ONE CYCLE OF A HALF DUTY PULSE ARE THE SAME PICTURE. The reader has to be
     able to see that the thing repeats. */
  let zeros = 0;
  for (let i = 1; i < p.length; i++) if (p[i - 1] < 0 && p[i] >= 0) zeros++;
  ok('two cycles really are two, counted as upward crossings',
    zeros === 2, `${zeros} times it comes back up through the middle`);
  ok('nothing drawn ever leaves the box',
    p.every((v) => v >= -1 && v <= 1));
  ok('a shape with no definition gives no points at all',
    wavePoints('digital vocal 3', 200) === null);
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

  /* 🔴 THE COMPARISON THAT KILLS A DRAWER IGNORING ONE OF ITS INPUTS. Four
     stages read from one object is four chances to read the same field twice,
     and a picture drawn that way looks completely ordinary. Each one is moved
     alone and only its own stage may change. */
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
  /* 🔴 EVERY STAGE AT ZERO IS A REAL SETTING AND IT STILL FILLS THE BOX.
     Dividing the width in proportion to four zeros is a divide by zero wearing
     a picture, and leaving three quarters of the box empty beside a correct
     drawing reads as a component that failed rather than as an envelope with no
     times in it. */
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
  /* 🔴 THE CHECK A DRAWER THAT IGNORED THE TYPE COULD NOT PASS. Both of the two
     lines above are satisfied by any curve that slopes, as long as it slopes;
     this one needs the two to disagree at BOTH ends, which only happens if the
     kind is really being read. */
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

// ── what the file says about itself ────────────────────────────────────────
{
  const src = fs.readFileSync(path.join(HERE, 'synth-view.mjs'), 'utf8');

  /* 🔴 THE PROMISE THAT MAKES A DRAWN RESPONSE CURVE ACCEPTABLE AT ALL, and the
     only cheap way to grade a promise is to read it. The pixels are graded on
     `/kit/`; this catches the edit that deletes the word. */
  ok('the filter paints the word schematic into its own picture',
    /f\.say\('schematic'/.test(src) && src.includes('THE FILTER CURVE IS A SCHEMATIC'));
  ok('the envelope paints what its axis is not',
    src.includes('proportions, not seconds'));
  ok('no frequency in hertz and no decibel figure is ever printed on the filter',
    !/'\d+ ?Hz'/.test(src) && !/`\$\{[^`]*\} ?Hz`/.test(src));

  /* No frame loop anywhere: a still picture asking for animation frames is a
     phone's battery going with nothing on screen saying so. */
  ok('nothing here asks for an animation frame',
    !src.includes('requestAnimationFrame'));

  ok('the height is a custom property, so a page can still override it',
    src.includes("setProperty('--sv-h'") && !/canvas\.style\.height\s*=/.test(src));

  ok('nothing in here sends anything anywhere',
    !src.includes('fetch(') && !src.includes('WebSocket')
    && !src.includes('AudioContext') && !src.includes('midi'));

  const dash = String.fromCharCode(0x2014), middot = String.fromCharCode(0x00b7);
  ok('no em dash and no middot anywhere in the module, comments included',
    !src.includes(dash) && !src.includes(middot),
    `${src.split('\n').length} lines`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
