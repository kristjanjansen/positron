// demo/shell/source-test.mjs — the shared source description, with no audio.
//
//   node demo/shell/source-test.mjs
//
// `partialsOf` is pure, which is the reason the design is what it is: the board
// and the page both expand the same spec with the same function, so a
// disagreement between the two ends is a disagreement about SYNTHESIS rather
// than about arithmetic. That is only true if the arithmetic is checked here.
//
// Three of these are NEGATIVE CONTROLS. A table that silently aliased, a level
// that was not the level, or a `count` that changed nothing would all look
// perfectly fine from the outside.
import { partialsOf, compareSource, SHAPES, DEFAULT } from './source.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};
const near = (a, b, eps) => Math.abs(a - b) <= eps;

console.log('\n== the shared source ==');

// 1. Same spec, same numbers. This is the whole contract between the two ends.
{
  const a = partialsOf({ hz: 110, count: 8 });
  const b = partialsOf({ hz: 110, count: 8 });
  ok('the same spec expands to the same partials, exactly',
     JSON.stringify(a.partials) === JSON.stringify(b.partials),
     `${a.partials.length} partials, first at ${a.partials[0].hz.toFixed(3)} Hz`);
}

// 2. The tables are the textbook series, which is what makes them shareable.
{
  const saw = partialsOf({ shape: 'saw', count: 6, chord: [0], level: 1, hz: 100 });
  const ratios = saw.partials.map((p) => p.amp / saw.partials[0].amp);
  const want = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6];
  ok('a saw is 1/n over every partial',
     ratios.every((r, i) => near(r, want[i], 1e-9)),
     ratios.map((r) => r.toFixed(3)).join(' '));

  const sq = partialsOf({ shape: 'square', count: 6, chord: [0], level: 1, hz: 100 });
  ok('a square is 1/n over the ODD partials only, and the even ones are absent',
     sq.partials.every((p) => p.partial % 2 === 1) && sq.partials.length === 3,
     sq.partials.map((p) => p.partial).join(','));
}

// 3. 🔴 NEGATIVE CONTROL: nothing above Nyquist, ever. A partial past half the
//    sample rate does not fold over politely — it aliases to a frequency in
//    neither engine's table, and the input check would then be comparing two
//    different mistakes rather than two renderings of one spec.
{
  const r = partialsOf({ hz: 4000, count: 16, chord: [0], shape: 'saw' }, 48000);
  const over = r.partials.filter((p) => p.hz >= 24000);
  ok('nothing is emitted at or above Nyquist, and the drop is COUNTED',
     over.length === 0 && r.dropped > 0,
     `${r.partials.length} kept, ${r.dropped} dropped above 24000 Hz`);
  // and the control on the control: at a sane fundamental nothing is dropped,
  // so the check above cannot be passing because the filter eats everything
  const sane = partialsOf({ hz: 110, count: 16, chord: [0] }, 48000);
  ok('...and at an ordinary fundamental nothing is dropped at all',
     sane.dropped === 0 && sane.partials.length === 16,
     `${sane.partials.length} partials, top at ${Math.round(sane.partials[15].hz)} Hz`);
}

// 4. `level` is a PEAK and means the same thing at every brightness. Without
//    this, turning `count` up would also turn the sound up, and every
//    comparison downstream would be measuring a gain change.
{
  const lo = partialsOf({ count: 2, level: 0.16, chord: [0] });
  const hi = partialsOf({ count: 24, level: 0.16, chord: [0] });
  const peak = (r) => r.partials.reduce((t, p) => t + p.amp, 0);
  ok('level is the peak of the sum, whatever the partial count',
     near(peak(lo), 0.16, 1e-9) && near(peak(hi), 0.16, 1e-9),
     `${peak(lo).toFixed(6)} at 2 partials, ${peak(hi).toFixed(6)} at 24`);
}

// 5. NEGATIVE CONTROL: `count` has to actually do something. A brightness knob
//    that changes the number of partials and nothing audible is the kind of
//    control this repo has shipped before (LESSONS #59).
{
  const dull = partialsOf({ count: 2, chord: [0] });
  const bright = partialsOf({ count: 20, chord: [0] });
  const top = (r) => r.partials[r.partials.length - 1].hz;
  ok('turning the count up puts real energy higher up the spectrum',
     bright.partials.length > dull.partials.length * 5 && top(bright) > top(dull) * 5,
     `top partial ${Math.round(top(dull))} Hz against ${Math.round(top(bright))} Hz`);
}

// 6. The spread is GRADED across the chord, not uniform — a uniform detune is a
//    tuning error, a graded one is width.
{
  const r = partialsOf({ spread: 20, chord: [0, 0, 0], hz: 100, count: 1 });
  const f = r.partials.map((p) => p.hz);
  ok('the detune widens up the chord rather than shifting all of it',
     near(f[0], 100, 1e-6) && f[1] > f[0] && f[2] > f[1],
     f.map((x) => x.toFixed(2)).join(' / '));
}

console.log('\n== comparing two renderings of one spec ==');

// 7. A perfect match reads as one, and names nothing as worst by much.
{
  const plan = partialsOf({ count: 6, chord: [0] });
  const perfect = plan.partials.map((p) => ({ hz: p.hz, amp: p.amp }));
  const c = compareSource(plan, perfect);
  ok('two identical renderings differ by 0 dB and nothing is missing',
     c.worstDb < 1e-6 && c.missing === 0, `worst ${c.worstDb.toFixed(9)} dB`);
}

// 8. 🔴 THE ONE THE INPUT CHECK WILL LEAN ON: a difference is found, and it is
//    ATTRIBUTED. "the input differs by 6 dB" and "it differs by 6 dB at partial
//    6 of 6" are different findings, and only the second one is actionable.
{
  const plan = partialsOf({ count: 6, chord: [0] });
  const bent = plan.partials.map((p) => ({ hz: p.hz, amp: p.partial === 6 ? p.amp / 2 : p.amp }));
  const c = compareSource(plan, bent);
  ok('one wrong partial is found, and the report says WHICH',
     c.worstDb > 5.9 && c.worstDb < 6.1 && /partial 6 /.test(c.worstAt || ''),
     `${c.worstDb.toFixed(2)} dB at ${c.worstAt}, median ${c.medianDb.toFixed(3)} dB`);
}

// 9. NEGATIVE CONTROL: a partial that is not there at all must not read as a
//    small error. A missing top partial is the exact failure two different
//    band-limiting schemes produce, and averaging it away is how it would be
//    missed.
{
  const plan = partialsOf({ count: 6, chord: [0] });
  const short = plan.partials.filter((p) => p.partial < 6).map((p) => ({ hz: p.hz, amp: p.amp }));
  const c = compareSource(plan, short);
  ok('a partial that is absent is reported as absent, not as a small error',
     c.missing === 1 && c.worstDb === Infinity,
     `${c.missing} missing, median of the rest ${c.medianDb.toFixed(6)} dB`);
}

// 10. The shapes are distinct from each other. Three names for one table would
//     be a picker that does nothing, which is this repo's recurring bug.
{
  const seen = new Set(Object.keys(SHAPES).map((k) =>
    JSON.stringify(partialsOf({ shape: k, count: 8, chord: [0], level: 1 }).partials.map((p) => p.amp.toFixed(6)))));
  ok('every named shape is a different table',
     seen.size === Object.keys(SHAPES).length,
     `${Object.keys(SHAPES).length} shapes, ${seen.size} distinct`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
