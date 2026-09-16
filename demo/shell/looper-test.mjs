// demo/shell/looper-test.mjs — the looper's arithmetic, with no audio at all.
//
//   node demo/shell/looper-test.mjs
//
// `ringOrder`, `planVoice` and `headOf` are pure, and every bug this looper has
// ever had lived in one of them: a ring copied from index 0 after it wrapped
// (an edit nobody made, in the middle of the loop), a voice that always began
// at the top (pressing ← jumped the sound to the far end of the picture), a
// pingpong head that was a ramp and sat at the right edge for the whole return
// half. None of those needs a browser to catch, and the page that carried them
// is one no harness may open.
//
// FOUR OF THESE ARE NEGATIVE CONTROLS: they are written so that the bug they
// describe would fail them, rather than so that today's code passes.

import { ringOrder, planVoice, headOf, LOOP_WAYS, LOOP_TURN, WAY_GLYPH, LOOP_SAYS,
  CHOP_DIV, CHOP_MIN_S } from './looper.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

console.log('\n== the looper ==');

// ── the ring ────────────────────────────────────────────────────────────────

// 1. Not yet full: the oldest sample is at the start, because nothing has been
//    overwritten.
ok('a ring that has not wrapped starts at nought',
  ringOrder({ filled: 300, len: 1000, w: 300 }) === 0,
  'filled 300 of 1000');

// 2. NEGATIVE CONTROL. Full: the write head is the oldest sample. Reading from
//    nought here is the defect that sounds like an edit in the middle.
ok('a full ring starts at the write head, not at nought',
  ringOrder({ filled: 1000, len: 1000, w: 640 }) === 640,
  'filled 1000 of 1000, head at 640');

// 3. And unwrapping really does put the samples back in the order they arrived.
{
  const len = 8;
  const ring = new Float32Array(len);
  // 12 samples into a ring of 8: 5..12 survive, and 5 sits at index 4.
  let w = 0;
  for (let i = 1; i <= 12; i++) { ring[w] = i; w = (w + 1) % len; }
  const start = ringOrder({ filled: len, len, w });
  const out = Array.from({ length: len }, (_, i) => ring[(start + i) % len]);
  ok('unwrapping a wrapped ring gives the seconds back in order',
    out.join(',') === '5,6,7,8,9,10,11,12', out.join(','));
}

// ── what a voice reads ──────────────────────────────────────────────────────

const UNIT = 4;            // four seconds kept

// 4. Round is the whole of it, once, from the top.
{
  const p = planVoice({ way: 'round', unit: UNIT });
  ok('round laps the kept seconds once, forwards',
    p.lapFrom === 0 && near(p.lapTo, UNIT) && p.begin === 0 && p.rate === 1
    && !p.back && !p.ping,
    `${p.lapFrom} to ${p.lapTo}, beginning at ${p.begin}`);
}

// 5. Back reads the mirror, and a fresh loop opens at the mirror's own start.
{
  const p = planVoice({ way: 'back', unit: UNIT });
  ok('a new backwards loop begins at the top of the mirror',
    p.back && p.begin === 0 && near(p.lapTo, UNIT),
    `beginning at ${p.begin} of ${p.lapTo}`);
}

// 6. NEGATIVE CONTROL, AND IT IS THE BUG THAT WAS SHIPPED. Turning round
//    mid-loop has to pick the sound up where it already is: a quarter of the way
//    across the picture is three quarters of the way into the mirror. A voice
//    that always started at 0 would jump to the far end of the wave.
{
  const p = planVoice({ way: 'back', unit: UNIT, fromFrac: 0.25 });
  ok('turning round mid-loop picks the sound up where it already was',
    near(p.begin, UNIT * 0.75), `began at ${p.begin} s of ${UNIT}`);
}

// 7. Pingpong reads twice the picture, and a press in the middle lands in the
//    FORWARD half rather than at the turn.
{
  const p = planVoice({ way: 'pingpong', unit: UNIT, fromFrac: 0.5 });
  ok('pingpong reads twice the kept seconds and begins in the forward half',
    p.ping && near(p.whole, UNIT * 2) && near(p.lapTo, UNIT * 2) && near(p.begin, UNIT * 0.5),
    `lap ${p.lapTo} s, beginning at ${p.begin}`);
}

// 8. Half is the same lap at half the speed, and the row's own rate multiplies
//    it rather than replacing it.
{
  const p = planVoice({ way: 'half', unit: UNIT, rate: 0.5 });
  ok('half halves the rate, and the rate row multiplies it',
    near(p.rate, 0.25) && near(p.lapTo, UNIT), `rate ${p.rate}`);
}

// 9. Chop is a sixteenth, taken WHERE YOU ALREADY ARE, and it never runs off
//    the end of the buffer.
{
  const p = planVoice({ way: 'chop', unit: UNIT, fromFrac: 0.99 });
  ok('chop takes a sixteenth of the lap and keeps it inside the buffer',
    near(p.lapTo - p.lapFrom, UNIT / CHOP_DIV) && p.lapTo <= UNIT + 1e-9
    && p.begin === p.lapFrom,
    `${p.lapFrom.toFixed(3)} to ${p.lapTo.toFixed(3)} of ${UNIT}`);
}

// 10. A slice has a floor, or it stops being a rhythm and becomes a pitch. A
//     sixteenth of a 0.6 s window is 37 ms, which repeats at 27 Hz: a buzz.
{
  const p = planVoice({ way: 'chop', unit: 0.6 });
  ok('a slice of a short loop is floored, so it is still a rhythm',
    near(p.lapTo - p.lapFrom, CHOP_MIN_S), `${((p.lapTo - p.lapFrom) * 1000).toFixed(0)} ms`);
}

// ── where the sound has got to ──────────────────────────────────────────────

const head = (o) => headOf({ unit: UNIT, lapFrom: 0, lapTo: UNIT, off: 0, rate: 1,
  back: false, ping: false, ...o });

// 11. Forwards: it crosses the picture once a lap.
ok('a forward head crosses the picture once a lap',
  near(head({ elapsed: 0 }), 0) && near(head({ elapsed: UNIT / 2 }), 0.5)
  && near(head({ elapsed: UNIT * 0.999 }), 0.999),
  `${head({ elapsed: UNIT / 2 })} at half a lap`);

// 12. Backwards: the head runs the other way over a wave drawn forwards.
ok('a backwards head runs the other way',
  near(head({ back: true, elapsed: 0 }), 1)
  && near(head({ back: true, elapsed: UNIT / 4 }), 0.75),
  `${head({ back: true, elapsed: UNIT / 4 })} a quarter of a lap in`);

// 13. NEGATIVE CONTROL, AND IT IS THE REPORTED BUG. Pingpong is a TRIANGLE. The
//     voice reads 2 x unit, so a head divided by `unit` and clamped sat at the
//     right edge for the whole return half, which is the half a reader is
//     listening for.
{
  const p = (e) => headOf({ unit: UNIT, lapFrom: 0, lapTo: UNIT * 2, off: 0, rate: 1,
    back: false, ping: true, elapsed: e });
  const rising = near(p(UNIT * 0.5), 0.5) && near(p(UNIT * 0.999), 0.999);
  const falling = near(p(UNIT * 1.5), 0.5) && near(p(UNIT * 1.75), 0.25);
  ok('a pingpong head is a triangle, not a ramp that sticks at the end',
    rising && falling && near(p(UNIT), 1),
    `${p(UNIT * 0.5).toFixed(2)} up, ${p(UNIT).toFixed(2)} at the turn, `
    + `${p(UNIT * 1.5).toFixed(2)} coming back`);
}

// 14. Half speed: the head takes two laps' worth of wall clock to cross once.
ok('at half speed the head crosses in twice the time',
  near(head({ rate: 0.5, elapsed: UNIT }), 0.5),
  `${head({ rate: 0.5, elapsed: UNIT })} after one lap of wall clock`);

// 15. NEGATIVE CONTROL. A chopped voice stays inside its slice, and the head
//     stays inside the part of the picture that slice is.
{
  const p = planVoice({ way: 'chop', unit: UNIT, fromFrac: 0.5 });
  const f0 = headOf({ unit: UNIT, lapFrom: p.lapFrom, lapTo: p.lapTo, off: p.begin,
    rate: p.rate, back: false, ping: false, elapsed: 0 });
  const f1 = headOf({ unit: UNIT, lapFrom: p.lapFrom, lapTo: p.lapTo, off: p.begin,
    rate: p.rate, back: false, ping: false, elapsed: (p.lapTo - p.lapFrom) * 0.9 });
  ok('a chopped head sweeps the slice and nothing else',
    near(f0, 0.5) && f1 > f0 && f1 < 0.5 + 1 / CHOP_DIV + 1e-9,
    `${f0.toFixed(3)} to ${f1.toFixed(3)} of the picture`);
}

// ── the vocabulary ──────────────────────────────────────────────────────────

// 16. The order of the table is load-bearing: `/radio/`'s checks drive a way by
//     number, so `pingpong` fifth is a fact and not a preference.
ok('the ways are in the order the checks drive them by',
  LOOP_WAYS.map(([n]) => n).join(',') === 'round,back,half,chop,pingpong',
  LOOP_WAYS.map(([n]) => n).join(','));

// 17. The button cycles directions only, and every one of them has a face and
//     a sentence. A way with no words is a button nobody can read.
ok('every way the button can reach has a glyph and a sentence',
  LOOP_TURN.every((i) => WAY_GLYPH[LOOP_WAYS[i][1]] && LOOP_SAYS[LOOP_WAYS[i][1]])
  && LOOP_TURN.map((i) => WAY_GLYPH[LOOP_WAYS[i][1]]).join('') === '→←⇆',
  LOOP_TURN.map((i) => `${LOOP_WAYS[i][1]} ${WAY_GLYPH[LOOP_WAYS[i][1]]}`).join(' · '));

// 18. Nothing a visitor reads carries an em dash. CLAUDE.md, and the two
//     formatters that were stamping them are exactly why this is checked in code
//     rather than swept by hand.
{
  const strings = [...Object.values(LOOP_SAYS), ...Object.values(WAY_GLYPH)];
  ok('no em dash in anything the button says', strings.every((s) => !s.includes('—')),
    `${strings.length} strings`);
}

console.log(`\n${pass} ok · ${fail} failed`);
process.exit(fail ? 1 : 0);
